# Resultado do cruzamento dos códigos

Comparação realizada em 3 de outubro de 2026. Os três arquivos com código de barras em .xlsx foram comparados aos três arquivos Estoque codigo [grupo].xls, fornecidos como exportações com código do produto.

## Resultado

| Grupo | Registros código barras | Registros código produto | Vínculos confirmados | Associações a revisar |
|---|---:|---:|---:|---:|
| positivos | 17.429 | 17.429 | 17.406 | 23 |
| negativos | 5.740 | 5.740 | 5.728 | 12 |
| zerados | 13.361 | 13.361 | 13.171 | 190 |
| Total | 36.530 | 36.530 | 36.305 | 225 |

Foram extraídos todos os 36.530 registros de código do produto. Foram confirmados 36.305 vínculos, dos quais um possui código de barras vazio no arquivo de origem. Assim, 36.304 registros possuem os dois códigos preenchidos por correspondência confirmada. Nenhum registro foi descartado nem somado a outro.

Os 225 registros restantes estão distribuídos em 110 grupos com descrição, unidade e saldo iguais: 106 grupos de dois, três grupos de três e um grupo de quatro. Todos possuem candidatos, mas os dados disponíveis não distinguem com certeza qual código do produto corresponde a cada código de barras. Os campos definitivos de código de barras ficam vazios nesses casos, e os candidatos são preservados para revisão.

## Conteúdo do Excel

- Resumo: comparação de quantidades por grupo e contagens das ocorrências.
- Cadastro: todos os códigos de produto, código de barras quando confirmado, descrição, unidade, saldo, grupo, situação, ocorrências, local de estoque exportado e referências aos arquivos/linhas.
- Revisão: 248 registros com ao menos uma ocorrência. Inclui as 225 associações ambíguas, os 22 registros com código do produto repetido e o registro sem código de barras. Campos amarelos permitem registrar os códigos validados e comentários, sem alterar automaticamente o Cadastro.

Arquivo: outputs/01a101cd-2262-7701-8ad4-73e3f2fc329b/Cadastro-unificado-produtos.xlsx.

## Identificação dos produtos

A nova exportação contém 36.519 códigos do produto distintos. Há 11 códigos repetidos em 22 registros, inclusive com descrições diferentes. Portanto, também não é seguro impor unicidade ao código do produto sem revisar essas ocorrências. O app deve manter seu próprio identificador de registro e a rastreabilidade da origem.

| Código produto repetido | Arquivo e linha | Descrição | Unidade | Saldo |
|---|---|---|---|---:|
| 54300091510 | Estoque codigo positivos.xls, linha 21060 | MARSHMALLOWS MINI ROCKY 150G | UN | 2.0 |
| 54300091510 | Estoque codigo negativos.xls, linha 6690 | MARSHMALLOR ROCKY MOUNTAIN MONI 150G | UN | -2.0 |
| 70177169657 | Estoque codigo negativos.xls, linha 2566 | CHA TWININGS CAM CAN MAC 15G | UN | -6.0 |
| 70177169657 | Estoque codigo negativos.xls, linha 2568 | CHA TWININGS CANELA E MAÇA 15G | UN | -1.0 |
| 70177197155 | Estoque codigo positivos.xls, linha 7990 | CHA TWININGS FRUTAS VERMELHAS 20G | UN | 1.0 |
| 70177197155 | Estoque codigo zerados.xls, linha 6118 | CHA TWININGS PRETO FRUTAS VERMELHAS 20G | UN | 0.0 |
| 70330703629 | Estoque codigo positivos.xls, linha 23328 | NIC PRESTOBARBA SENSITIVE  1UN | UN | 113.0 |
| 70330703629 | Estoque codigo negativos.xls, linha 1446 | BIC SENSITIVE 1UN APARELHO | UN | -2.0 |
| 70330727984 | Estoque codigo positivos.xls, linha 2056 | AP PRESTOBARBA BIC CONFOIRT 3 BLACK | UN | 29.0 |
| 70330727984 | Estoque codigo positivos.xls, linha 9680 | COMFORT 3 BLACK NIGHT BIC | UN | 6.0 |
| 70330909229 | Estoque codigo positivos.xls, linha 18334 | ISQUEIRO BIC | UN | 424.0 |
| 70330909229 | Estoque codigo negativos.xls, linha 5620 | ISQUEIRO BIC GRANDE | UN | -29.0 |
| 70330913431 | Estoque codigo positivos.xls, linha 18338 | ISQUEIRO BIC MINI | UN | 154.0 |
| 70330913431 | Estoque codigo negativos.xls, linha 6960 | MINI ISQUEIRO BIC | UN | -4.0 |
| 70847022305 | Estoque codigo positivos.xls, linha 12912 | ENERGETICO MONSTER ABSOLUT ZERO 473ML | UN | 106.0 |
| 70847022305 | Estoque codigo positivos.xls, linha 12914 | ENERGETICO MONSTER ABSOLUTELY ZERO 473ML | UN | 236.0 |
| 70847033301 | Estoque codigo positivos.xls, linha 12872 | ENERGETICO  MONSTER MANGO LOCO 473ML | UN | 75.0 |
| 70847033301 | Estoque codigo negativos.xls, linha 4152 | ENERGETICO MONSTER MANGO LOCO 473M | UN | -4.0 |
| 82184000328 | Estoque codigo positivos.xls, linha 34706 | WHISKY JACK DANIELS 1LITRO | UN | 1.0 |
| 82184000328 | Estoque codigo positivos.xls, linha 34712 | WHISKY JACK DANIELS TENNESSEE HONEY 1L | UN | 2.0 |
| 82184004364 | Estoque codigo positivos.xls, linha 34710 | WHISKY JACK DANIELS TENNESSE  APPLE 1 LIT. | UN | 6.0 |
| 82184004364 | Estoque codigo zerados.xls, linha 26618 | WHISKY JACK DANIELS TENESSE APPLE 1LITRO | UN | 0.0 |

Os arquivos com código do produto também trazem Local Estoq., Estoq.Mi e Estoq.Máx., ausentes nos .xlsx recebidos anteriormente. Todos os registros extraídos têm local 1. Isso identifica o local exportado, mas não fornece setor, corredor ou prateleira para distribuir o levantamento.

## Como o cruzamento foi feito

Normalização de espaços e maiúsculas/minúsculas em descrição e unidade, preservando os textos originais. Descrições que são números inteiros foram comparadas por seu valor integral, sem tratar 7898292884070 e 7898292884070.0 como produtos diferentes. Comparação do saldo por seu valor numérico completo; «-» continua texto e não vira zero.

O vínculo automático exigiu uma combinação única de grupo de origem, descrição, unidade e saldo em cada um dos dois conjuntos. Não se utilizou igualdade casual entre código do produto e código de barras, semelhança de descrição, proximidade de linhas ou posição na lista como critério de associação. Os códigos foram extraídos integralmente e gravados como texto para evitar notação científica no Excel de saída.

Os .xls usam registros binários antigos. A leitura dos números e textos foi conferida integralmente contra uma segunda biblioteca no arquivo de negativos. Nos três arquivos, a quantidade extraída foi conciliada com Nº de Produtos do próprio relatório e os registros binários foram lidos até o fim, sem omitir linhas por limite do leitor.

Referência do formato: https://www.openoffice.org/sc/excelfileformat.pdf, seções LABEL e NUMBER para BIFF2. A extensão .xls foi mantida nos arquivos de origem.

## Integridade das fontes

Os seis arquivos originais foram usados somente para leitura. As assinaturas abaixo permitem conferir a versão comparada.

| Arquivo | SHA-256 |
|---|---|
| Planilhas\Estoque positivos.xlsx | 4b40fc4937e4fdc461d84fd54388b0a8448c7019009ddb9c3183eb57820d1cfa |
| Planilhas\CodigoProduto\Estoque codigo positivos.xls | 4ea9f65a158156d39faed91d6362e7c31c289e101fdded20a4eaa40a77fbfeb8 |
| Planilhas\Estoque negativos.xlsx | 326b15a24430c18b96887addc985f6561098ab732f054579f2fb4540edc847f4 |
| Planilhas\CodigoProduto\Estoque codigo negativos.xls | 49a82648364ffe0b76517dbe6b7e0f18c83f66c20a8a09667da8adb41c10d4fa |
| Planilhas\Estoque zerados.xlsx | c2c9217102a8029c9d81114f1e81fdde7dfd8d469d49b8b42be727e87daf8d52 |
| Planilhas\CodigoProduto\Estoque codigo zerados.xls | 497d10697c54ac5b87fd42de95a0619b537b4e3347b737b5d6c9091cfd940ace |
