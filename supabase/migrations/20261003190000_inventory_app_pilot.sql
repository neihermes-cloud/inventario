-- Estruturas do app de levantamento: não alteram tabelas ou saldos do ERP.
BEGIN;
CREATE TABLE public.inventory_app_sessions (
 id uuid PRIMARY KEY, company_id uuid NOT NULL, created_by uuid NOT NULL,
 name text NOT NULL CHECK (length(name) BETWEEN 1 AND 120),
 mode text NOT NULL CHECK (mode IN ('solo','team')),
 state text NOT NULL DEFAULT 'DRAFT' CHECK (state IN ('DRAFT','OPEN','CLOSED')),
 sources jsonb NOT NULL CHECK (jsonb_typeof(sources)='array'),
 expected_items integer NOT NULL CHECK (expected_items BETWEEN 1 AND 100000),
 created_at timestamptz NOT NULL DEFAULT now(), closed_at timestamptz
);
CREATE TABLE public.inventory_app_items (
 id uuid PRIMARY KEY, session_id uuid NOT NULL REFERENCES public.inventory_app_sessions(id),
 source_id uuid NOT NULL, source_row integer NOT NULL CHECK (source_row>0), data jsonb NOT NULL,
 UNIQUE(session_id,source_id,source_row), UNIQUE(session_id,id)
);
CREATE TABLE public.inventory_app_counts (
 id uuid PRIMARY KEY, sequence bigint GENERATED ALWAYS AS IDENTITY UNIQUE, session_id uuid NOT NULL, item_id uuid NOT NULL,
 actor_id uuid NOT NULL, quantity numeric(16,3) NOT NULL CHECK (quantity>=0 AND quantity<=1000000000 AND quantity<>'NaN'::numeric),
 parent_id uuid REFERENCES public.inventory_app_counts(id), note text NOT NULL DEFAULT '' CHECK (length(note)<=2000),
 created_at timestamptz NOT NULL DEFAULT now(),
 FOREIGN KEY(session_id,item_id) REFERENCES public.inventory_app_items(session_id,id)
);
CREATE TABLE public.inventory_app_approvals (
 item_id uuid PRIMARY KEY, session_id uuid NOT NULL, event_id uuid NOT NULL REFERENCES public.inventory_app_counts(id),
 approved_by uuid NOT NULL, approved_at timestamptz NOT NULL DEFAULT now(),
 FOREIGN KEY(session_id,item_id) REFERENCES public.inventory_app_items(session_id,id)
);
CREATE INDEX inventory_app_items_session_idx ON public.inventory_app_items(session_id);
CREATE INDEX inventory_app_counts_item_idx ON public.inventory_app_counts(session_id,item_id);
CREATE INDEX inventory_app_counts_parent_idx ON public.inventory_app_counts(parent_id);
CREATE INDEX inventory_app_approvals_session_idx ON public.inventory_app_approvals(session_id);

ALTER TABLE public.inventory_app_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_app_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_app_counts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_app_approvals ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.inventory_app_sessions,public.inventory_app_items,public.inventory_app_counts,public.inventory_app_approvals FROM anon,authenticated;
GRANT SELECT ON public.inventory_app_sessions,public.inventory_app_items,public.inventory_app_counts,public.inventory_app_approvals TO authenticated;
GRANT ALL ON public.inventory_app_sessions,public.inventory_app_items,public.inventory_app_counts,public.inventory_app_approvals TO service_role;

CREATE FUNCTION public.inventory_app_can_view(_session uuid) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
 SELECT EXISTS (SELECT 1 FROM public.inventory_app_sessions s WHERE s.id=_session
  AND auth.uid() IS NOT NULL AND public.has_company_permission(s.company_id,'inventory.view')
  AND (s.mode='team' OR s.created_by=auth.uid()));
$$;
CREATE POLICY inventory_app_sessions_view ON public.inventory_app_sessions FOR SELECT TO authenticated
 USING(public.has_company_permission(company_id,'inventory.view') AND (mode='team' OR created_by=auth.uid()));
CREATE POLICY inventory_app_items_view ON public.inventory_app_items FOR SELECT TO authenticated USING(public.inventory_app_can_view(session_id));
CREATE POLICY inventory_app_counts_view ON public.inventory_app_counts FOR SELECT TO authenticated USING(public.inventory_app_can_view(session_id));
CREATE POLICY inventory_app_approvals_view ON public.inventory_app_approvals FOR SELECT TO authenticated USING(public.inventory_app_can_view(session_id));

CREATE FUNCTION public.inventory_app_create(_id uuid,_company uuid,_name text,_mode text,_sources jsonb,_expected integer)
 RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE existing public.inventory_app_sessions;
BEGIN
 IF auth.uid() IS NULL OR NOT public.has_company_permission(_company,'inventory.create') OR NOT public.has_company_permission(_company,'inventory.view') THEN RAISE EXCEPTION 'Sem permissão para criar inventário.' USING ERRCODE='42501'; END IF;
 IF jsonb_typeof(_sources)<>'array' OR jsonb_array_length(_sources) NOT BETWEEN 1 AND 30 OR pg_column_size(_sources)>1048576 THEN RAISE EXCEPTION 'Fontes inválidas.'; END IF;
 INSERT INTO public.inventory_app_sessions(id,company_id,created_by,name,mode,sources,expected_items)
 VALUES(_id,_company,auth.uid(),_name,_mode,_sources,_expected) ON CONFLICT(id) DO NOTHING;
 SELECT * INTO existing FROM public.inventory_app_sessions WHERE id=_id;
 IF existing.created_by<>auth.uid() OR existing.company_id<>_company OR existing.name<>_name OR existing.mode<>_mode OR existing.sources<>_sources OR existing.expected_items<>_expected THEN RAISE EXCEPTION 'Inventário já existe com outros dados.'; END IF;
 RETURN _id;
END $$;

CREATE FUNCTION public.inventory_app_import(_session uuid,_items jsonb) RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE s public.inventory_app_sessions; item jsonb; n integer;
BEGIN
 SELECT * INTO s FROM public.inventory_app_sessions WHERE id=_session FOR UPDATE;
 IF NOT FOUND OR auth.uid() IS NULL OR s.created_by<>auth.uid() OR NOT public.has_company_permission(s.company_id,'inventory.create') THEN RAISE EXCEPTION 'Sem permissão para importar.' USING ERRCODE='42501'; END IF;
 IF s.state<>'DRAFT' THEN RAISE EXCEPTION 'A importação já foi encerrada.'; END IF;
 IF jsonb_typeof(_items)<>'array' OR jsonb_array_length(_items) NOT BETWEEN 1 AND 500 THEN RAISE EXCEPTION 'Lote inválido.'; END IF;
 FOR item IN SELECT value FROM jsonb_array_elements(_items) LOOP
  IF NOT EXISTS (SELECT 1 FROM jsonb_array_elements(s.sources) src WHERE src->>'id'=item->>'sourceId')
    OR coalesce(length(item->>'description'),0)=0 OR pg_column_size(item)>16384 THEN RAISE EXCEPTION 'Item ou fonte inválidos.'; END IF;
  INSERT INTO public.inventory_app_items(id,session_id,source_id,source_row,data)
  VALUES((item->>'id')::uuid,_session,(item->>'sourceId')::uuid,(item->>'row')::integer,item) ON CONFLICT(id) DO NOTHING;
  IF NOT EXISTS (SELECT 1 FROM public.inventory_app_items i WHERE i.id=(item->>'id')::uuid AND i.session_id=_session AND i.data=item) THEN RAISE EXCEPTION 'Identificador de item já utilizado.'; END IF;
 END LOOP;
 SELECT count(*) INTO n FROM public.inventory_app_items WHERE session_id=_session;
 IF n>s.expected_items THEN RAISE EXCEPTION 'Quantidade importada excede a quantidade esperada.'; END IF;
 RETURN n;
END $$;

CREATE FUNCTION public.inventory_app_start(_session uuid) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE s public.inventory_app_sessions;
BEGIN
 SELECT * INTO s FROM public.inventory_app_sessions WHERE id=_session FOR UPDATE;
 IF NOT FOUND OR auth.uid() IS NULL OR s.created_by<>auth.uid() OR NOT public.has_company_permission(s.company_id,'inventory.create') THEN RAISE EXCEPTION 'Sem permissão para abrir.' USING ERRCODE='42501'; END IF;
 IF s.state='OPEN' THEN RETURN; END IF;
 IF s.state<>'DRAFT' OR (SELECT count(*) FROM public.inventory_app_items WHERE session_id=_session)<>s.expected_items THEN RAISE EXCEPTION 'Importação incompleta.'; END IF;
 UPDATE public.inventory_app_sessions SET state='OPEN' WHERE id=_session;
END $$;

CREATE FUNCTION public.inventory_app_send(_id uuid,_session uuid,_item uuid,_quantity numeric,_parent uuid DEFAULT NULL,_note text DEFAULT '')
 RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE s public.inventory_app_sessions; previous public.inventory_app_counts;
BEGIN
 SELECT * INTO s FROM public.inventory_app_sessions WHERE id=_session FOR UPDATE;
 IF NOT FOUND OR auth.uid() IS NULL OR NOT public.inventory_app_can_view(_session) OR NOT public.has_company_permission(s.company_id,'inventory.count') THEN RAISE EXCEPTION 'Sem permissão para contar.' USING ERRCODE='42501'; END IF;
 SELECT * INTO previous FROM public.inventory_app_counts WHERE id=_id;
 IF FOUND THEN
  IF previous.session_id<>_session OR previous.item_id<>_item OR previous.actor_id<>auth.uid() OR previous.quantity IS DISTINCT FROM _quantity OR previous.parent_id IS DISTINCT FROM _parent OR previous.note IS DISTINCT FROM _note THEN RAISE EXCEPTION 'Reenvio com dados diferentes.'; END IF;
  RETURN _id;
 END IF;
 IF s.state<>'OPEN' THEN RAISE EXCEPTION 'Inventário não está aberto. A contagem permanece no aparelho.'; END IF;
 IF NOT EXISTS (SELECT 1 FROM public.inventory_app_items WHERE id=_item AND session_id=_session) THEN RAISE EXCEPTION 'Item não pertence ao inventário.'; END IF;
 IF EXISTS (SELECT 1 FROM public.inventory_app_approvals WHERE item_id=_item) THEN RAISE EXCEPTION 'Item já aprovado. A contagem permanece no aparelho para revisão.'; END IF;
 IF _quantity IS NULL OR _quantity<0 OR _quantity>1000000000 OR _quantity='NaN'::numeric OR _quantity<>round(_quantity,3) THEN RAISE EXCEPTION 'Quantidade inválida.'; END IF;
 IF _parent IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.inventory_app_counts WHERE id=_parent AND item_id=_item AND session_id=_session AND actor_id=auth.uid()) THEN RAISE EXCEPTION 'Só é possível corrigir uma contagem própria do mesmo item.'; END IF;
 INSERT INTO public.inventory_app_counts(id,session_id,item_id,actor_id,quantity,parent_id,note) VALUES(_id,_session,_item,auth.uid(),_quantity,_parent,_note);
 RETURN _id;
END $$;

CREATE FUNCTION public.inventory_app_approve(_session uuid,_decisions jsonb) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE s public.inventory_app_sessions; d jsonb; actual_heads uuid[];
BEGIN
 SELECT * INTO s FROM public.inventory_app_sessions WHERE id=_session FOR UPDATE;
 IF NOT FOUND OR auth.uid() IS NULL OR NOT public.inventory_app_can_view(_session) OR NOT public.has_company_permission(s.company_id,'inventory.finish') THEN RAISE EXCEPTION 'Somente o responsável autorizado pode aprovar.' USING ERRCODE='42501'; END IF;
 IF s.state<>'OPEN' OR jsonb_typeof(_decisions)<>'array' OR jsonb_array_length(_decisions) NOT BETWEEN 1 AND 300 THEN RAISE EXCEPTION 'Aprovação inválida.'; END IF;
 FOR d IN SELECT value FROM jsonb_array_elements(_decisions) LOOP
  SELECT array_agg(e.id) INTO actual_heads FROM public.inventory_app_counts e WHERE e.item_id=(d->>'item')::uuid AND e.session_id=_session AND NOT EXISTS(SELECT 1 FROM public.inventory_app_counts child WHERE child.parent_id=e.id);
  IF jsonb_typeof(d->'expectedHeads') IS DISTINCT FROM 'array' OR jsonb_array_length(d->'expectedHeads') IS DISTINCT FROM coalesce(array_length(actual_heads,1),0)
     OR EXISTS(SELECT 1 FROM unnest(actual_heads) h WHERE NOT (d->'expectedHeads' @> to_jsonb(ARRAY[h]))) THEN RAISE EXCEPTION 'As contagens mudaram. Sincronize e revise novamente antes de aprovar.'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.inventory_app_counts e WHERE e.id=(d->>'event')::uuid AND e.item_id=(d->>'item')::uuid AND e.session_id=_session AND NOT EXISTS(SELECT 1 FROM public.inventory_app_counts child WHERE child.parent_id=e.id)) THEN RAISE EXCEPTION 'Contagem não é uma opção atual do item. Sincronize novamente.'; END IF;
  INSERT INTO public.inventory_app_approvals(item_id,session_id,event_id,approved_by) VALUES((d->>'item')::uuid,_session,(d->>'event')::uuid,auth.uid()) ON CONFLICT(item_id) DO NOTHING;
  IF NOT EXISTS (SELECT 1 FROM public.inventory_app_approvals WHERE item_id=(d->>'item')::uuid AND event_id=(d->>'event')::uuid AND session_id=_session) THEN RAISE EXCEPTION 'Item já possui outra aprovação.'; END IF;
 END LOOP;
END $$;

CREATE FUNCTION public.inventory_app_close(_session uuid,_team_confirmed boolean DEFAULT false) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE s public.inventory_app_sessions;
BEGIN
 SELECT * INTO s FROM public.inventory_app_sessions WHERE id=_session FOR UPDATE;
 IF NOT FOUND OR auth.uid() IS NULL OR NOT public.inventory_app_can_view(_session) OR NOT public.has_company_permission(s.company_id,'inventory.finish') THEN RAISE EXCEPTION 'Sem permissão para encerrar.' USING ERRCODE='42501'; END IF;
 IF s.state='CLOSED' THEN RETURN; END IF;
 IF s.state<>'OPEN' OR (SELECT count(*) FROM public.inventory_app_approvals WHERE session_id=_session)<>s.expected_items THEN RAISE EXCEPTION 'Existem itens pendentes de aprovação.'; END IF;
 IF s.mode='team' AND _team_confirmed IS NOT TRUE THEN RAISE EXCEPTION 'Confirme que todos os aparelhos da equipe foram sincronizados.'; END IF;
 UPDATE public.inventory_app_sessions SET state='CLOSED',closed_at=now() WHERE id=_session;
END $$;

REVOKE ALL ON FUNCTION public.inventory_app_can_view(uuid),public.inventory_app_create(uuid,uuid,text,text,jsonb,integer),public.inventory_app_import(uuid,jsonb),public.inventory_app_start(uuid),public.inventory_app_send(uuid,uuid,uuid,numeric,uuid,text),public.inventory_app_approve(uuid,jsonb),public.inventory_app_close(uuid,boolean) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.inventory_app_can_view(uuid),public.inventory_app_create(uuid,uuid,text,text,jsonb,integer),public.inventory_app_import(uuid,jsonb),public.inventory_app_start(uuid),public.inventory_app_send(uuid,uuid,uuid,numeric,uuid,text),public.inventory_app_approve(uuid,jsonb),public.inventory_app_close(uuid,boolean) TO authenticated;
COMMIT;
