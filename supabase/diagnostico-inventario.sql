-- Diagnóstico somente de leitura do projeto compartilhado com o Mercado.
-- Executar no SQL Editor com acesso administrativo para verificar as estruturas.
-- Não cria tabelas, não altera políticas e não acessa linhas de usuários/produtos.

SELECT c.relname AS tabela,
       c.relrowsecurity AS rls_ativada,
       c.relforcerowsecurity AS rls_forcada
FROM pg_catalog.pg_class c
JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public'
  AND c.relkind IN ('r', 'p')
  AND c.relname IN ('user_memberships', 'products', 'product_units',
                    'product_barcodes', 'warehouses', 'inventories', 'inventory_items')
ORDER BY c.relname;

SELECT table_name, column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name IN ('products', 'product_units', 'product_barcodes', 'inventories', 'inventory_items')
ORDER BY table_name, ordinal_position;

SELECT tablename, policyname, roles, cmd, qual, with_check
FROM pg_catalog.pg_policies
WHERE schemaname = 'public'
  AND tablename IN ('products', 'product_units', 'product_barcodes', 'inventories', 'inventory_items')
ORDER BY tablename, policyname;

SELECT routine_name, security_type
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name IN ('is_company_member', 'has_company_permission')
ORDER BY routine_name;

SELECT table_name, grantee, privilege_type
FROM information_schema.table_privileges
WHERE table_schema = 'public'
  AND table_name IN ('inventories', 'inventory_items')
  AND grantee IN ('anon', 'authenticated')
ORDER BY table_name, grantee, privilege_type;

SELECT pg_size_pretty(pg_database_size(current_database())) AS tamanho_total_banco;
-- Complementar com o painel de uso: este valor isolado não mede todas as cotas.

SELECT (SELECT count(*) FROM public.products) AS produtos,
       (SELECT count(DISTINCT company_id) FROM public.products) AS empresas_com_produtos,
       (SELECT count(*) FROM public.inventories) AS inventarios,
       (SELECT count(*) FROM public.user_memberships) AS vinculos_usuarios;
