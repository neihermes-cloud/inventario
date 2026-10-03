# Proposta de app de inventário

## Objetivo e decisão recomendada

Criar um app com prioridade para celular, acessível também pelo computador, que importe cadastros e saldos de planilhas Excel, conduza a contagem física e devolva uma cópia da planilha original com os resultados. Deve atender uma pessoa trabalhando sozinha e várias pessoas contando simultaneamente.

A recomendação inicial é uma aplicação web instalável (PWA), com interface adaptada ao celular e ao computador. No celular, o foco é contar. No computador, o foco é importar, distribuir trabalho, revisar diferenças e exportar. A coleta deve funcionar sem internet depois de baixar o inventário para o aparelho. Importação, consolidação entre aparelhos e exportação final dependem de conexão com o servidor.

Esta proposta orientou o primeiro piloto. Os três arquivos reais de estoques positivos, negativos e zerados foram analisados em 3 de outubro de 2026. Contêm 36.530 linhas de cadastro e correspondem ao mesmo estoque e à mesma data, conforme informado pelo usuário. O app já importa os modelos `.xlsx`, conta localmente e exporta uma cópia preservada com os resultados. Os achados e a lista de ocorrências estão em ANALISE-DAS-PLANILHAS.md.

## Fluxo de trabalho

1. Importar um ou mais arquivos Excel e selecionar as abas com produtos.
2. Confirmar as colunas de código, descrição, unidade, saldo e, se existirem, localização e código de barras. Gravar um perfil para reutilizar esse mapeamento nas próximas importações.
3. Mostrar uma prévia e inconsistências: códigos vazios ou repetidos, linhas sem descrição, saldos inválidos e unidades indefinidas. Preservar códigos como texto, incluindo zeros à esquerda.
4. Criar um inventário com nome, locais, responsáveis e uma referência de saldo na data de abertura. Nunca alterar esse saldo de referência durante a contagem.
5. Trabalhar sozinho ou distribuir áreas/listas para os integrantes. Baixar as tarefas antes de entrar numa área sem conexão.
6. Contar, salvar e avançar. Retomar do ponto em que parou. A revisão permite voltar e corrigir com histórico.
7. Sincronizar todos os aparelhos, resolver conflitos e conferir divergências e pendências.
8. Aprovar e encerrar o inventário. Gerar uma cópia do Excel de origem com os resultados aprovados.

## Interface do celular

A tela principal de contagem exibe um produto por vez: descrição, código, unidade e localização. A quantidade inicia vazia; zero precisa ser informado explicitamente. Um botão grande «Salvar e próximo» reduz os toques por item.

Elementos importantes:

- Buscar por código ou descrição; leitura de código de barras pela câmera quando houver etiquetas, com busca manual sempre disponível.
- Teclado numérico e aceitação de vírgula decimal conforme a precisão do produto. Os arquivos reais têm UN e KG, com saldos de até três casas decimais. Há 136 saldos fracionados em UN, então a sigla sozinha não define uma restrição a números inteiros; confirmar a convenção do sistema e configurar por produto.
- «Não encontrado» registra uma contagem explícita de zero; «Pular» mantém o item pendente.
- Observação opcional; produto fora do cadastro entra numa lista de ocorrências para aprovação.
- Progresso visível e distinção entre «Salvo neste aparelho», «Aguardando envio» e «Sincronizado».
- Saldo esperado oculto por padrão, para reduzir influência sobre a contagem. O gestor consulta as diferenças na revisão.
- Histórico e possibilidade de corrigir uma contagem anterior.

O modo de lista permite localizar itens fora da sequência e consultar seu estado. Na primeira versão, não se deve acrescentar campos obrigatórios sem necessidade para o levantamento.

## Trabalho individual e em equipe

Uma conta responsável pode executar todas as tarefas. Em equipe, há ao menos dois papéis: contador e gestor. O gestor distribui os locais ou listas e aprova revisões; o contador coleta nas tarefas recebidas.

Para evitar contagem duplicada, as tarefas devem ser distribuídas por local e conjunto de itens antes do trabalho sem internet. O app usa a combinação inventário + produto + local + rodada como contexto de contagem, sem assumir que cada linha repetida representa o mesmo item.

Contagens de locais diferentes podem ser somadas quando representam parcelas do mesmo estoque. Duas contagens concorrentes do mesmo produto no mesmo local são candidatas à revisão: não se somam e não se sobrescrevem automaticamente. Uma recontagem é uma rodada separada, com decisão explícita sobre o resultado aprovado.

Cada registro recebe um identificador único, responsável, aparelho, horário informado pelo aparelho e horário de recebimento pelo servidor. Reenviar um registro não pode duplicá-lo. Revisões deixam histórico; a hora do aparelho não decide qual resultado prevalece.

## Regras de qualidade

- Em branco significa «Não contado»; zero significa «Contado, sem estoque».
- Códigos repetidos são avaliados considerando local, lote e demais identificadores presentes no arquivo.
- Os arquivos recebidos têm 52 códigos de barras repetidos em 106 linhas e um produto sem código de barras. A exportação com código do produto também contém 11 códigos repetidos em 22 registros. Cada cadastro deve receber um identificador próprio do app, vinculado à origem. Código do produto e código de barras são campos de busca; sua unicidade não pode ser presumida e linhas não devem ser unificadas automaticamente.
- Item em vários locais só é consolidado conforme uma regra definida para aquela planilha.
- Caixas e unidades não são misturadas; conversão exige um fator confirmado no cadastro.
- Diferença = quantidade aprovada − saldo de referência. Diferença percentual, se necessária, deixa explícito o caso de saldo de referência igual a zero.
- O saldo «-» de DIVERSOS, em Estoque negativos!E3942, é não numérico e não vira zero. Preservar o texto de origem, registrar a ocorrência e deixar a diferença indisponível enquanto o saldo não for esclarecido.
- Contagens negativas são rejeitadas; decimais dependem da unidade de medida.
- Produtos não cadastrados geram ocorrências, sem criação silenciosa de linhas no modelo original.
- O encerramento exige tratamento de pendências, conflitos e confirmação de envio dos aparelhos participantes.
- Se houver entradas e saídas durante o levantamento, definir um horário de corte e registrar os movimentos separadamente. A opção mais simples para o piloto é pausar movimentos na área contada.

## Como preservar o Excel

Guardar o arquivo original de forma imutável. Cada item importado mantém o vínculo com arquivo, aba, linha/célula e perfil de importação. Ordenar produtos na tela não altera esse vínculo.

A exportação parte de uma cópia do arquivo recebido, alterando apenas as células ou regiões mapeadas. Não deve reconstruir uma planilha simplificada a partir de uma tabela de produtos.

Oferecer dois formatos de saída:

1. **Modelo original preenchido:** preencher uma coluna já destinada ao levantamento, preservando a estrutura. Se essa coluna não existir, escolher e revisar o destino antes de usar este formato. Substituição da coluna de estoque requer opção explícita e preservação do saldo anterior no histórico.
2. **Modelo original com levantamento:** acrescentar Quantidade contada, Diferença, Situação, Responsável, Data/hora e Observação. Usar uma aba «Inventário» quando novas colunas interferirem no modelo ou na impressão.

O saldo da planilha de origem permanece como referência. Itens não contados não viram zero. Em exportação parcial, a situação identifica claramente as pendências; somente a exportação aprovada é tratada como resultado final.

Fórmulas, cores, mesclagens, larguras, filtros, abas ocultas, tabelas e áreas de impressão entram na validação de preservação. As fórmulas afetadas devem ser verificadas, incluindo atualização dos resultados quando o arquivo for aberto no Excel.

Começar pelo formato .xlsx. Arquivos .xls, .xlsm, protegidos ou com recursos especiais exigem avaliação específica. «Idêntico» significa preservar estrutura e aparência exceto pelas alterações autorizadas; arquivos com resultados novos não serão idênticos byte a byte. O primeiro teste técnico deve comparar a exportação com os arquivos reais no Excel.

Nos três arquivos analisados, as informações estão em B:E e não há coluna de levantamento. Recomenda-se acrescentar F:K com Quantidade contada, Diferença, Situação, Responsável, Data/hora e Observação. Preservar o cabeçalho na linha 8 dos negativos e na linha 1 dos positivos/zerados, bem como as linhas vazias e a posição original de cada registro. Se novas exportações incluírem o código interno, detectar novamente o perfil e as colunas em vez de impor esse mapeamento antigo. Nenhuma planilha foi alterada durante a análise.

## Estrutura técnica proposta

- **Aplicativo PWA:** uma interface adaptável aos dois tipos de tela; cache da aplicação e banco local IndexedDB para tarefas, rascunhos e fila de registros.
- **Servidor/API:** autenticação, permissões, inventários, distribuição de tarefas, validações, consolidação, aprovação e exportação.
- **Banco de dados central:** usuários, produtos, locais, inventários, itens de referência, atribuições, rodadas, contagens e decisões de revisão. A primeira opção recomendada é PostgreSQL no Supabase Free, respeitando a preferência por serviços sem custo.
- **Armazenamento de arquivos:** originais, perfis de mapeamento e versões exportadas, com cópias de segurança.
- **Processamento Excel:** edição localizada do arquivo original; para .xlsx, avaliar Open XML em um serviço .NET. Selecionar a implementação pela preservação demonstrada nos arquivos de teste.

A coleta salva primeiro no aparelho e só exibe sucesso depois de confirmar a gravação local. A fila envia registros quando a aplicação está aberta e conectada, com botão «Sincronizar agora». Não depender exclusivamente de sincronização em segundo plano.

Solicitar armazenamento persistente onde houver suporte; indicar se o inventário está pronto para uso sem internet. Como dados locais podem ser apagados pelo usuário ou aparelho, sincronização frequente e cópia de recuperação das contagens ainda não enviadas devem fazer parte do produto. Não permitir que uma atualização do app descarte uma fila pendente.

Acesso com login, comunicação protegida, permissões verificadas no servidor e histórico de alterações. O Excel não funciona como banco compartilhado durante a coleta; é a entrada e a saída do processo.

## Banco de dados sem custo

Preferência informada: usar serviços gratuitos. O usuário autorizou compartilhar o projeto do Mercado, `mercatoerp-prod` (`oiusrshkrbgkxmbmtvgm`), na organização 4 Mares, reunindo PostgreSQL, autenticação, armazenamento de arquivos e atualização em tempo real. A conexão local foi configurada e conferida no painel. O projeto já possui catálogo e inventários com políticas de acesso. A capacidade necessária ainda depende do volume de produtos, histórico, arquivos e uso simultâneo; o inventário compartilha as cotas com o ERP. Ver INTEGRACAO-SUPABASE-MERCADO.md para os resultados da inspeção e as adaptações previstas.

Limites verificados em 3 de outubro de 2026: 500 MB de banco por projeto, 1 GB de armazenamento de arquivos, 50.000 usuários ativos mensais, 5 GB de tráfego de saída não cacheado e até dois projetos ativos gratuitos. Há outras cotas, inclusive de mensagens e conexões em tempo real; acompanhar o uso no painel. Fonte: https://supabase.com/pricing

Projetos gratuitos com pouca atividade ao longo de sete dias podem ser pausados, o que exige retomar o projeto antes de um inventário eventual. Backups automáticos não estão incluídos no Free; planejar cópias próprias do banco e dos arquivos, com verificação de recuperação. Fontes: https://supabase.com/docs/guides/platform/free-project-pausing e https://supabase.com/pricing

Usar Supabase Auth para login; banco para cadastros, tarefas, contagens e revisões; Storage privado para os Excel; políticas de acesso por usuário e atribuição. A fila de contagem sem internet continua sendo responsabilidade do app no armazenamento local do celular. Atualização em tempo real não substitui a sincronização nem a resolução dos conflitos.

Alternativas: Neon oferece PostgreSQL com plano gratuito; Firebase/Firestore oferece cota gratuita e recursos de persistência offline. Para os relacionamentos entre produtos, inventários, locais, responsáveis e rodadas, a preferência do projeto é PostgreSQL com os serviços integrados do Supabase. Fontes: https://neon.com/blog/neon-free-plan-1-gb-per-project e https://firebase.google.com/docs/firestore/pricing

O plano gratuito do banco não cobre automaticamente a hospedagem da interface ou um serviço separado de processamento Excel. Essas partes também devem ser selecionadas conforme a exigência de custo zero, dentro de cotas verificadas antes da implantação. Não aderir a plano pago para contornar um limite sem autorização do usuário.

## Primeira entrega concluída e próximos incrementos

1. **Concluído:** importação rastreável, tela de um produto por vez, busca, salvar e avançar, retomada, zero/pendente, trabalho individual e equipe.
2. **Concluído:** uso sem internet, sincronização manual, prevenção de duplicidade, revisão de conflitos, histórico, aprovação e exportação parcial/final preservada.
3. **Próximo piloto:** distribuição por setor, revisão dos 225 vínculos ambíguos, fotos de ocorrências e validação com contas reais de contador e gestor. A leitura por câmera já está disponível como recurso opcional, com busca manual como fallback.

## Critérios para validar o piloto

- A exportação abre no Excel sem avisos de reparo e mantém os elementos do modelo original, exceto os campos autorizados.
- Código «000123» não perde zeros; descrições repetidas não juntam produtos distintos.
- Zero e pendente continuam diferentes na tela e no arquivo final.
- Uma contagem salva permanece após fechar e reabrir o app, inclusive sem conexão, nas plataformas-alvo testadas.
- Reenviar a fila não duplica resultados; duas pessoas no mesmo contexto geram revisão, enquanto locais distintos seguem a regra de consolidação.
- Encerramento não declara como completo um inventário com tarefas ou envios conhecidos pendentes.
- Uso por toque funciona nos celulares da equipe, incluindo quantidade decimal quando aplicável.

## Próximas informações necessárias

Já foram confirmados o uso individual e simultâneo, a exigência de serviços gratuitos, os três modelos .xlsx e o mesmo estoque/data de origem. O sistema exporta código do produto ou código de barras, separadamente. Os três arquivos .xls com código do produto foram recebidos e comparados: 36.530 registros extraídos, 36.305 vínculos confirmados (um sem código de barras na origem) e 225 associações ambíguas preservadas para revisão. O cruzamento usou descrição, unidade, saldo e grupo de origem, exigindo correspondência única nos dois sentidos. A exportação demonstrou que o código do produto também tem repetições; o cadastro deve usar identificador próprio do app. Ver RESULTADO-CRUZAMENTO-CODIGOS.md e o Excel consolidado. Todos os registros novos indicam local de estoque 1, mas não informam setor, corredor ou prateleira. Ainda falta validar as associações ambíguas e códigos repetidos, definir setores para distribuir a contagem, aparelhos da equipe, regra dos saldos fracionados em UN e possibilidade de parar entradas/saídas durante o inventário.

## Referências técnicas

- PWA em celular e computador: https://web.dev/learn/pwa/getting-started
- Instalação: https://web.dev/learn/pwa/installation
- Dados locais e persistência: https://web.dev/learn/pwa/offline-data
- Edição de células em arquivos existentes: https://learn.microsoft.com/en-us/office/open-xml/spreadsheet/how-to-insert-text-into-a-cell-in-a-spreadsheet
