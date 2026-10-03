# Inventário 4 Mares

PWA mobile-first para importar os arquivos `.xlsx` de estoque, contar produtos no celular ou no computador e devolver o mesmo Excel com as colunas do levantamento.

## Rodar localmente

1. Copie `.env.example` para `.env.local` e informe a URL e a chave pública do projeto Supabase do Mercado.
2. Instale as dependências com `npm install`.
3. Inicie com `npm run dev` e abra a URL mostrada pelo Vite.

O banco compartilhado usa as tabelas com prefixo `inventory_app_`, RLS e funções RPC transacionais. O inventário não altera o saldo do ERP ao ser encerrado; ele aprova o levantamento e prepara o Excel de saída.

## Fluxo disponível

- Importação de um ou mais `.xlsx`, mantendo arquivo, aba, linha, código de produto, código de barras, unidade e saldo original.
- Contagem individual ou em equipe, com gravação local, zero explícito, decimais, busca, histórico e conflitos.
- Sincronização manual por fila com Supabase, aprovação protegida contra estado desatualizado e encerramento com confirmação da equipe.
- Exportação parcial ou final preservando o pacote original e acrescentando quantidade, diferença, situação, responsável, data/hora e observação.
- Cópia JSON das contagens para recuperação manual.

Arquivos `.xls` antigos devem ser convertidos para `.xlsx` ou usados por meio do cadastro consolidado já preparado em `outputs/`. A leitura por câmera funciona quando o navegador oferece `BarcodeDetector` e permite câmera; a busca manual permanece disponível. Distribuição por setor e hospedagem pública ficam para a próxima etapa. O GitHub Pages não está disponível enquanto este repositório permanecer privado no plano atual.

## Verificação

`npm test` executa 19 testes de contagem, banco local/RLS e planilhas reais. `npm run build` gera a versão de produção.
