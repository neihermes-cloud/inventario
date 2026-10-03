# Integração do inventário com o Supabase do Mercado

Decisão autorizada pelo usuário em 03/10/2026: compartilhar o projeto Supabase do Mercado.

## Conexão preparada

- Projeto confirmado no painel: `mercatoerp-prod`, organização `4 Mares`.
- Identificador: `oiusrshkrbgkxmbmtvgm`.
- URL: `https://oiusrshkrbgkxmbmtvgm.supabase.co`.
- Repositório de referência do ERP: `neihermes-cloud/mercatoerp`.
- Código de referência lido em `C:/4 Mares/Aplicativo`, ramo `codex/auth-recovery-feedback`.
- `.env.local` do inventário recebeu somente a URL, o identificador e a chave pública existente de `mercatoerp-prod`, conferidos no painel autenticado. Nenhuma chave administrativa foi copiada.
- `.env.example` contém o modelo de configuração; `.gitignore` exclui a configuração local, planilhas e arquivos de trabalho.
- `supabase/config.toml` identifica o projeto compartilhado. Nenhum novo projeto Supabase foi criado.

Verificação em 03/10/2026: `/auth/v1/health` respondeu HTTP 200. As consultas anônimas de zero linhas a `inventories` e `inventory_items`, selecionando `id`, responderam HTTP 401, código PostgreSQL `42501`, coerente com a exigência de autenticação. A migração `supabase/migrations/20261003190000_inventory_app_pilot.sql` foi aplicada pelo SQL Editor autenticado. Ela criou `inventory_app_sessions`, `inventory_app_items`, `inventory_app_counts` e `inventory_app_approvals` com RLS ativo, funções RPC para criar/importar/iniciar/enviar/aprovar/encerrar, e tabelas novas vazias. Os metadados das fontes ficam no JSON da sessão; os bytes originais permanecem no aparelho de quem importou. A sessão administrativa permitiu confirmar as quatro tabelas e suas políticas sem alterar os dados do ERP.

A configuração local do ERP em `C:/4 Mares/Aplicativo/.env` aponta para `gglajhslfjnehuhwvcbg`, um projeto diferente. Esse endereço foi inicialmente conferido, mas foi descartado como destino do inventário depois do login no painel. A configuração do ERP foi apenas lida; a conexão deste app foi corrigida para `mercatoerp-prod`.

## Estrutura aproveitável e limitações

O painel confirmou `products`, `product_units`, `product_barcodes`, `warehouses`, `inventories` e `inventory_items`, todas com RLS ativada. A empresa é identificada por `company_id`; as políticas de inventário usam `has_company_permission` com permissões como `inventory.view`, `inventory.create`, `inventory.count` e `inventory.finish`. As políticas do catálogo usam `is_company_member`. O vínculo dos usuários está em `user_memberships`, com `id`, `user_id`, `company_id`, `role` e `created_at`.

Totais conferidos: 11.180 produtos, uma empresa com produtos, um inventário e 30 vínculos de usuários. Vínculos não significam necessariamente 30 usuários distintos. O painel da organização informou banco 145/500 MB, arquivos 0/1 GB e 11 usuários ativos mensais. A consulta SQL `pg_database_size` informou 123 MB; são medições diferentes, portanto usar o painel de uso para acompanhar a cota do plano. A contagem de produtos do ERP difere dos 36.530 registros das planilhas: a associação do cadastro consolidado ao catálogo do ERP ainda não foi executada e deve preservar as ambiguidades.

O modelo atual de `inventory_items` guarda primeira contagem, recontagem, quantidade final, responsável e horário. O serviço atual atualiza esses campos diretamente; não demonstra um histórico independente por envio nem resolução de conflitos entre aparelhos. Essas capacidades devem ser acrescentadas antes de habilitar a contagem simultânea e a sincronização offline.

O fechamento atual do ERP (`finishInventory`) gera movimentações de ajuste de estoque para as divergências. O app de levantamento terá um encerramento próprio que aprova resultados e exporta Excel. Executar ajustes nos saldos do Mercado será uma operação específica, fora do encerramento padrão deste app.

## Integração proposta para a primeira versão

1. Usar o login existente do projeto, com sessão independente no app e associação à empresa confirmada. Não copiar sessões ou credenciais de outros aplicativos.
2. Reutilizar os identificadores UUID do catálogo quando a correspondência for confirmada. Os 11 códigos de produto repetidos e 225 associações ambíguas da comparação impedem vincular registros somente por código ou descrição.
3. Preservar cada linha de Excel com identificador próprio, arquivo, aba, linha, códigos de origem, unidade e saldo de referência. O saldo importado é a referência do levantamento, mesmo quando difere do saldo atual do ERP. `-` não vira zero; em branco continua diferente de contagem zero.
4. Acrescentar estruturas complementares, com prefixo `inventory_app_`, para fontes Excel/linhas, participantes e distribuição por setor, eventos de contagem e resultados aprovados. Os nomes e relacionamentos definitivos serão definidos depois da conferência do banco. Linhas ainda sem produto do ERP podem permanecer em preparação, sem inventar vínculos ou recriar o catálogo existente.
5. Registrar cada envio com identificador único gerado no aparelho e unicidade no servidor para evitar duplicação em reenvios. A regra de unicidade deve garantir isolamento entre empresas/inventários. Contagens concorrentes no mesmo item/local exigem revisão; parcelas de locais diferentes só são somadas conforme regra do inventário. Recontagens são rodadas separadas.
6. Aplicar permissões por empresa, inventário e participante às estruturas novas. Validar que o usuário contador não consiga alterar aprovação, participantes ou saldos de referência por chamadas diretas à API. Guardar o responsável a partir da sessão autenticada, não de um campo livre enviado pelo aparelho.
7. Exportar cópias dos arquivos originais, usando os identificadores e posições de origem para acrescentar resultados às linhas corretas. Nunca exportar por busca de código potencialmente repetido nem sobrescrever os originais.

Os aplicativos compartilham recursos, limites e serviço de autenticação do projeto. Verificar espaço disponível antes de armazenar originais Excel no Supabase Storage e dimensionar o histórico de contagem. A quantidade de linhas, sozinha, não garante que todo o histórico caiba no plano gratuito.

## Situação atual

A conexão local com o projeto correto está pronta e a integração funcional do primeiro piloto está implementada: importação rastreável, armazenamento local offline, fila manual, sincronização concorrente, aprovação e exportação preservada. O catálogo do ERP não é alterado; os itens da planilha permanecem como uma fotografia do levantamento até que as 225 associações ambíguas sejam revisadas. A URL definitiva de hospedagem, a câmera de código de barras, setores e uma distribuição visual de tarefas ficam para a próxima etapa. O repositório privado do app é `https://github.com/neihermes-cloud/inventario`.

O arquivo `supabase/diagnostico-inventario.sql` contém somente consultas para repetir a verificação inicial. A migração funcional está versionada em `supabase/migrations/20261003190000_inventory_app_pilot.sql`; nenhum registro das tabelas do ERP foi atualizado por ela.
