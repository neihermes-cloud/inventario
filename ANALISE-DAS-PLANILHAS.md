# Análise das planilhas e adaptação do app de inventário

Análise realizada em 3 de outubro de 2026. Foram examinados os três arquivos da pasta Planilhas. O usuário confirmou que correspondem ao mesmo estoque e à mesma data e que o sistema de origem permite exportar um código interno único de cada produto.

## Resultado principal

As planilhas podem servir de entrada e modelo de saída do app. O ponto que precisa ser resolvido antes de identificar produtos de forma definitiva é o código interno: o campo Código barras possui repetições e uma ausência. Não deve ser uma chave única de produto.

A estrutura é simples e não contém fórmulas, macros, tabelas estruturadas, gráficos, imagens, vínculos externos, mesclagens, validações ou proteção de aba. Há estilos de fonte/alinhamento e larguras de coluna que devem ser preservados. A leitura estrutural e as prévias foram verificadas; ainda não foi gerado nem validado um arquivo de retorno no Excel.

## Quantidade de registros

| Arquivo | Aba | Cabeçalho | Linhas com produtos | Registros UN | Registros KG |
|---|---|---:|---:|---:|---:|
| Estoque negativos.xlsx | Estoque negativos | 8 | 5.740 | 5.591 | 149 |
| Estoque positivos.xlsx | Estoque positivos | 1 | 17.429 | 17.194 | 235 |
| Estoque zerados.xlsx | Estoque zerados | 1 | 13.361 | 13.334 | 27 |

**Total: 36.530 linhas de cadastro.** São 36.119 registros UN e 411 KG. As contagens acima excluem cabeçalhos e linhas vazias. Não significam 36.530 produtos distintos. Há 36.475 códigos não vazios distintos, mas códigos repetidos não provam que os produtos sejam iguais.

Os arquivos somam 1.520.375 bytes, cerca de 1,52 MB. O tamanho do Excel não equivale à ocupação futura do banco PostgreSQL.

## Mapeamento de importação

| Coluna atual | Conteúdo | Tratamento no app |
|---|---|---|
| A | Sem dados de produto | Preservar no arquivo de saída |
| B | Código barras / Código Barras | Converter o valor integral em texto para busca; pode repetir e pode faltar |
| C | Descrição do Produto | Guardar o texto original; remover espaços extras somente na busca/exibição normalizada |
| D | UNIDADE | Importar UN e KG; definir precisão de contagem por produto |
| E | Estoq.Atual | Saldo de referência com decimais; preservar valores negativos e zero |

Não há colunas de código interno, setor/local, lote, validade ou quantidade levantada. Setores e tarefas podem ser definidos no app. O código interno será incorporado por um novo perfil de importação quando estiver disponível, sem presumir que a coluna B continuará na mesma posição.

A importação deve localizar os cabeçalhos por conteúdo e ignorar linhas vazias, sem assumir cabeçalho na linha 1, posição fixa em arquivos futuros ou produto em toda linha par/ímpar. O arquivo de negativos tem sete linhas iniciais sem valores. Os três arquivos têm espaços vazios entre muitos produtos.

## Ocorrências que precisam de tratamento

### Códigos repetidos: 52 códigos em 106 linhas

Há 40 códigos presentes em mais de um arquivo. Dentro de cada arquivo, há 4 códigos repetidos nos negativos, 7 nos positivos e 3 nos zerados. Esses grupos se sobrepõem: dois códigos aparecem três vezes na base total. Não somar nem excluir linhas automaticamente.

Exemplo importante: o código 473 identifica PÃO COM BOLINHO COMPLETO UN, em UN, e QUEIJO MATURADO DA NONA POSSAMAI FRAC., em KG, nas linhas 8716 e 8784 da aba Estoque negativos. Portanto, nem o mesmo código nem o mesmo código combinado à descrição devem substituir um identificador interno confiável.

### Produto sem código

Em Estoque zerados.xlsx, aba Estoque zerados, B10899 está vazio. A linha contém ESPUMANTE FREIXENET ICE ROSE 750ML, unidade UN, saldo zero. Manter o item com identificador provisório associado ao arquivo/aba/linha e permitir busca por descrição. Vincular ao código interno quando disponível, sem inventar um código de barras.

### Saldo não numérico

Em Estoque negativos.xlsx, aba Estoque negativos, E3942 contém o texto «-», para DIVERSOS, código 1, unidade KG. Não converter para zero. Guardar o valor original e representar o saldo numérico como não informado. O levantamento pode prosseguir, mas a diferença fica indisponível até esclarecer o saldo. Não concluir que todos os registros desse arquivo possuem saldo negativo numérico.

### Quantidades fracionadas

Há 467 saldos não inteiros: 331 em KG e 136 em UN. Os 136 registros UN se dividem em 75 nos negativos e 61 nos positivos. Os saldos numéricos fornecidos têm até três casas decimais. O banco deve usar um tipo decimal, sem arredondamento silencioso. Não bloquear frações apenas porque a unidade é UN; confirmar por produto se representam fracionamento legítimo ou ajustes do sistema. A precisão da contagem pode seguir uma configuração específica.

### Códigos numéricos e descrições

Todos os 36.529 códigos preenchidos estão armazenados como números, com formato General. Os comprimentos variam de 1 a 15 dígitos, incluindo códigos curtos internos. Não exigir 13 dígitos nem completar com zeros automaticamente. Usar o valor armazenado, não o texto arredondado/notação científica da tela. Zeros à esquerda que não constem do arquivo não podem ser recuperados com certeza sem consultar a origem.

Foram encontradas 357 descrições normalizadas associadas a códigos diferentes. A normalização aqui considera apenas espaços e maiúsculas/minúsculas. Isso não demonstra duplicidade de produto. A descrição é útil para busca, mas não deve identificar sozinha um produto nem definir unificação de cadastros.

## Desenho ajustado do aplicativo

1. Importar os três arquivos numa mesma sessão de inventário, guardando a categoria e a linha de origem de cada registro. Positivo/negativo/zerado é classificação do saldo de referência, não um local físico e não o estado da contagem.
2. Criar um identificador interno do app para cada registro de origem. Quando as novas exportações trouxerem o código interno do sistema, vincular produtos usando esse campo, preservando as referências aos arquivos recebidos.
3. Registrar códigos de barras como campos de busca não únicos. Uma leitura que encontre mais de um produto pede escolha explícita, mostrando descrição e unidade. Não lançar a mesma quantidade em todos os resultados.
4. Com este volume, a tela de um produto por vez permanece adequada, mas deve permitir chegar ao produto pela leitura da etiqueta ou busca. Percorrer 36 mil linhas em ordem alfabética não deve ser o único fluxo. Preparar busca local e listas por setor para uso sem conexão.
5. Definir setores e distribuir tarefas dentro do app, pois os arquivos não possuem localização. A responsabilidade deve ser por tarefa/setor, com revisão de contagens concorrentes no mesmo contexto.
6. Manter saldo negativo somente como referência. A quantidade física levantada é zero ou positiva. Saldo inicial zero não marca o produto como contado.
7. Na revisão, comparar quantidade aprovada com o saldo de referência válido, mostrar pendências e tratar ocorrências de cadastro. Não misturar soma de kg com soma de unidades.

## Saída Excel recomendada para os arquivos recebidos

Como não há uma coluna de levantamento, a saída recomendada é uma cópia de cada arquivo original com novos campos a partir da coluna F:

| Nova coluna | Campo |
|---|---|
| F | Quantidade contada |
| G | Diferença |
| H | Situação |
| I | Responsável pela contagem aprovada |
| J | Data/hora da contagem aprovada |
| K | Observação |

Os cabeçalhos novos entram na linha 8 dos negativos e na linha 1 dos demais. Os valores entram na linha original do produto. Preservar as abas, a ordem, os espaços vazios, as colunas B:E e os estilos existentes. Não reclassificar automaticamente os arquivos conforme a quantidade contada: um item do arquivo de negativos pode ter estoque físico positivo e ainda pertence a seu arquivo de origem.

Quantidade contada fica vazia enquanto o item estiver pendente; zero é uma contagem explícita. Diferença é quantidade aprovada menos saldo de referência e fica vazia quando falta contagem ou saldo numérico. O campo Situação diferencia Pendente, Contado, Recontagem e Saldo de referência não informado.

Também é possível devolver um arquivo com as mesmas quatro colunas de dados preenchendo Estoq.Atual com a quantidade física aprovada, mas essa opção substitui a referência. Ela deve ser escolhida explicitamente e aplicada somente aos registros aprovados, mantendo o original e o histórico. A opção de preservar estrutura e acrescentar o levantamento é a preferência técnica para este caso.

## Banco de dados e custo

Mantém-se Supabase Free como primeira opção para o piloto. Usar produtos e identificadores internos separados das linhas de importação, além de inventários, arquivos, registros de referência, tarefas, contagens e decisões de revisão. O código de barras não recebe uma restrição de unicidade global.

O volume de 36.530 registros permite planejar um piloto compacto, mas a ocupação no PostgreSQL precisa ser medida depois de importar, incluindo índices e histórico. Evitar guardar cópias repetidas de toda a descrição em cada evento de contagem. Os Excel ficam no armazenamento de arquivos, e não como conteúdo binário em cada linha do cadastro.

Os limites, pausa por pouca atividade e necessidade de cópias próprias do plano gratuito permanecem como documentado na proposta geral. Nenhum banco remoto foi criado nem preenchido nesta análise.

## Próximo insumo

O usuário esclareceu que o sistema permite exportar código de barras ou código do produto, mas não os dois juntos. Gerar uma segunda versão dos três grupos usando código do produto e mantendo descrição, unidade e estoque atual. Guardar em Planilhas/CodigoProduto, preservando os arquivos de código de barras já recebidos. As duas versões devem corresponder à mesma referência de estoque e usar os mesmos filtros. Se houver mudanças desde a primeira extração, gerar novamente ambos os conjuntos em sequência para reduzir diferenças.

O cruzamento irá comparar descrição normalizada, unidade e saldo dentro de cada grupo de origem. A normalização considera apenas espaços e maiúsculas/minúsculas, preservando o texto original. O saldo serve também como conferência de consistência entre as exportações. Uma correspondência automática exige vínculo único nos dois sentidos; descrições parecidas, ordem das linhas e saldos iguais não bastam, isoladamente, para decidir o vínculo.

Gerar uma planilha consolidada com código do produto, código de barras, descrição, unidade, estoque de referência e rastreabilidade para os dois arquivos/abas/linhas de origem. Registros com correspondência ambígua ou ausente seguem para revisão, sem exclusão nem associação presumida. Um produto sem código de barras pode continuar assim na consolidação, desde que seu código interno e vínculo tenham sido confirmados. Depois de inspecionar os novos arquivos, será possível informar quantos registros podem ser vinculados automaticamente.

## Lista completa dos códigos repetidos

| Código registrado | Arquivo e linha | Descrição e unidade | Saldo original |
|---|---|---|---|
| 0 | Estoque negativos.xlsx, linha 10512 | TAXA ENTREGA (UN) | -360.9 |
| 0 | Estoque positivos.xlsx, linha 12249 | DISPENSER BAUDUCCO (UN) | 1 |
| 473 | Estoque negativos.xlsx, linha 8716 | PÃO COM BOLINHO COMPLETO UN (UN) | -15 |
| 473 | Estoque negativos.xlsx, linha 8784 | QUEIJO MATURADO DA NONA POSSAMAI FRAC. (KG) | -0.47 |
| 78938496 | Estoque negativos.xlsx, linha 3110 | CIGARRO WINSTON BLUE (UN) | -4.9 |
| 78938496 | Estoque positivos.xlsx, linha 34743 | WINSTON BLUE (UN) | 64.14 |
| 11210009530 | Estoque negativos.xlsx, linha 8356 | PIMENTA TABASCO SUAVE 60ML (UN) | -4 |
| 11210009530 | Estoque positivos.xlsx, linha 26091 | PIMENTA SUAVE GREEN TABASCO 60ML (UN) | 3 |
| 11210115606 | Estoque negativos.xlsx, linha 8354 | PIMENTA TABASCO ORIGINAL 60ML (UN) | -3 |
| 11210115606 | Estoque zerados.xlsx, linha 19843 | PIMENTA ORIGINAL RED TABASCO 60ML (UN) | 0 |
| 27084120134 | Estoque negativos.xlsx, linha 5400 | HW CARRINHOS BASICOS (UN) | -83 |
| 27084120134 | Estoque positivos.xlsx, linha 7043 | CARRINHO HOTWHEELS (UN) | 14 |
| 27084929539 | Estoque negativos.xlsx, linha 1110 | BARBIE FASHION (UN) | -66 |
| 27084929539 | Estoque positivos.xlsx, linha 3455 | BARBIE (UN) | 1 |
| 39800015464 | Estoque positivos.xlsx, linha 25981 | PILHA ENERGIZER MAX AA ALCALINA (UN) | 2 |
| 39800015464 | Estoque zerados.xlsx, linha 19781 | PILHA ALCALINA ENERGIZER MAX AA C/2 (UN) | 0 |
| 41333001005 | Estoque negativos.xlsx, linha 8314 | PILHA  AA2 DURACEL (UN) | -7 |
| 41333001005 | Estoque positivos.xlsx, linha 25941 | PILHA AA DURACELL 2UN (UN) | 25 |
| 41333001074 | Estoque negativos.xlsx, linha 8320 | PILHA AA DURACELL AAA2 (UN) | -6 |
| 41333001074 | Estoque positivos.xlsx, linha 25943 | PILHA AAA DURACELL 2UN (UN) | 25 |
| 47400179240 | Estoque negativos.xlsx, linha 5112 | GILLETTE MACH 3 CARTUCHO 2UN (UN) | -7 |
| 47400179240 | Estoque positivos.xlsx, linha 16505 | GILLETTE MACH3 (UN) | 15 |
| 54300091510 | Estoque negativos.xlsx, linha 6690 | MARSHMALLOR ROCKY MOUNTAIN MONI 150G (UN) | -2 |
| 54300091510 | Estoque positivos.xlsx, linha 21053 | MARSHMALLOWS MINI ROCKY 150G (UN) | 2 |
| 70177169619 | Estoque negativos.xlsx, linha 2574 | CHA TWININGS LARANJA MANGA CANELA 18G (UN) | -8 |
| 70177169619 | Estoque zerados.xlsx, linha 6107 | CHA TWININGS LARANJA MANGA E CANELA 18G (UN) | 0 |
| 70177169633 | Estoque negativos.xlsx, linha 2526 | CHA MANGO E MORANGO TWININGS 20G (UN) | -8 |
| 70177169633 | Estoque positivos.xlsx, linha 7987 | CHA TWININGS MORANGO MANGA 15G (UN) | 14 |
| 70177169640 | Estoque negativos.xlsx, linha 2514 | CHA LIMON FRAMBUESA TWININGS 20G (UN) | -25 |
| 70177169640 | Estoque positivos.xlsx, linha 7985 | CHA TWININGS LIMAAO E FRAMBOESA 15G (UN) | 12 |
| 70177169657 | Estoque negativos.xlsx, linha 2566 | CHA TWININGS CAM CAN MAC 15G (UN) | -6 |
| 70177169657 | Estoque negativos.xlsx, linha 2568 | CHA TWININGS CANELA E MAÇA 15G (UN) | -1 |
| 70177197131 | Estoque zerados.xlsx, linha 5951 | CHA ENGLISH TWININGS 20G (UN) | 0 |
| 70177197131 | Estoque zerados.xlsx, linha 6099 | CHA TWININGS ENGLISH BREAKFEST 20G (UN) | 0 |
| 70177197155 | Estoque positivos.xlsx, linha 7983 | CHA TWININGS FRUTAS VERMELHAS 20G (UN) | 1 |
| 70177197155 | Estoque zerados.xlsx, linha 6111 | CHA TWININGS PRETO FRUTAS VERMELHAS 20G (UN) | 0 |
| 70177197315 | Estoque negativos.xlsx, linha 2482 | CHA CAMOMILA TWININGS 20G (UN) | -32 |
| 70177197315 | Estoque positivos.xlsx, linha 7979 | CHA TWININGS CAMOMILA MEL BAUNILHA 15G (UN) | 24 |
| 70177197346 | Estoque negativos.xlsx, linha 2046 | CAH TWININGS LIMAO COM GENGIBRE 15G (UN) | -1 |
| 70177197346 | Estoque negativos.xlsx, linha 2576 | CHA TWININGS LIMAAO GENGIBRE 15G (UN) | -2 |
| 70177197360 | Estoque negativos.xlsx, linha 2570 | CHA TWININGS FRUTOS SILVESTRES 20G (UN) | -4 |
| 70177197360 | Estoque zerados.xlsx, linha 6103 | CHA TWININGS FRUTOS SILVESTRE 20G (UN) | 0 |
| 70330129627 | Estoque positivos.xlsx, linha 6799 | CANETA BIC AZUL (UN) | 50 |
| 70330129627 | Estoque positivos.xlsx, linha 6801 | CANETA BIC AZUL 50 UN (UN) | 355 |
| 70330631328 | Estoque positivos.xlsx, linha 18333 | ISQUEIRO BIC MINI 1UN (UN) | 57 |
| 70330631328 | Estoque positivos.xlsx, linha 18337 | ISQUEIRO BIC MINI CARTELA (UN) | 31 |
| 70330703629 | Estoque negativos.xlsx, linha 1446 | BIC SENSITIVE 1UN APARELHO (UN) | -2 |
| 70330703629 | Estoque positivos.xlsx, linha 23321 | NIC PRESTOBARBA SENSITIVE  1UN (UN) | 113 |
| 70330717534 | Estoque negativos.xlsx, linha 3240 | COMFORT3 BIC 1UN (UN) | -4 |
| 70330717534 | Estoque positivos.xlsx, linha 16479 | GIILETE BIC COMFORT3 (UN) | 9 |
| 70330717565 | Estoque positivos.xlsx, linha 27181 | PRESTOBARBA BIC COMFORT 3 1UN (UN) | 27 |
| 70330717565 | Estoque positivos.xlsx, linha 27183 | PRESTOBARBA BIC SENSITIVE COMFORT 3 (UN) | 5 |
| 70330727984 | Estoque positivos.xlsx, linha 2049 | AP PRESTOBARBA BIC CONFOIRT 3 BLACK (UN) | 29 |
| 70330727984 | Estoque positivos.xlsx, linha 9673 | COMFORT 3 BLACK NIGHT BIC (UN) | 6 |
| 70330731806 | Estoque negativos.xlsx, linha 720 | APARELHO BIC SOLEIL ROSA (UN) | -1 |
| 70330731806 | Estoque positivos.xlsx, linha 2075 | APARELHO BARBEAR BIC SOLEIL (UN) | 2 |
| 70330909229 | Estoque negativos.xlsx, linha 5620 | ISQUEIRO BIC GRANDE (UN) | -29 |
| 70330909229 | Estoque positivos.xlsx, linha 18327 | ISQUEIRO BIC (UN) | 424 |
| 70330913431 | Estoque negativos.xlsx, linha 6960 | MINI ISQUEIRO BIC (UN) | -4 |
| 70330913431 | Estoque positivos.xlsx, linha 18331 | ISQUEIRO BIC MINI (UN) | 154 |
| 70847022015 | Estoque negativos.xlsx, linha 7182 | MONSTER ENERGY LATA 473ML (UN) | -118 |
| 70847022015 | Estoque positivos.xlsx, linha 12903 | ENERGETICO MONSTER 473ML (UN) | 401 |
| 70847022305 | Estoque negativos.xlsx, linha 7180 | MONSTER ABSOLUTELY ZERO 473ML (UN) | -28 |
| 70847022305 | Estoque positivos.xlsx, linha 12905 | ENERGETICO MONSTER ABSOLUT ZERO 473ML (UN) | 106 |
| 70847022305 | Estoque positivos.xlsx, linha 12907 | ENERGETICO MONSTER ABSOLUTELY ZERO 473ML (UN) | 236 |
| 70847033301 | Estoque negativos.xlsx, linha 4152 | ENERGETICO MONSTER MANGO LOCO 473M (UN) | -4 |
| 70847033301 | Estoque negativos.xlsx, linha 7184 | MONSTER MANGO LOCO LATA 473ML (UN) | -14 |
| 70847033301 | Estoque positivos.xlsx, linha 12865 | ENERGETICO  MONSTER MANGO LOCO 473ML (UN) | 75 |
| 70847033929 | Estoque negativos.xlsx, linha 7186 | MONSTER ULTRA VIOLET 473ML (UN) | -6 |
| 70847033929 | Estoque positivos.xlsx, linha 12929 | ENERGETICO MONSTER ULTRAVIOLETA 473ML (UN) | 6 |
| 76840002603 | Estoque negativos.xlsx, linha 10100 | SORVETE BEN E JERRY'S DOCE DELEITE 458ML (UN) | -2 |
| 76840002603 | Estoque positivos.xlsx, linha 31637 | SORVETE BEN E JERRYS DOCE DE LEITE  414G (UN) | 6 |
| 76840002689 | Estoque negativos.xlsx, linha 1434 | BEN E JERRYS NETFLIX E CHILLD 458 ML (UN) | -3 |
| 76840002689 | Estoque positivos.xlsx, linha 31639 | SORVETE BEN E JERRYS NETFLIX (UN) | 6 |
| 76840473717 | Estoque negativos.xlsx, linha 1436 | BEN E JERRYS TRIPLE CARAMEL CHUNK  458 ML (UN) | -13 |
| 76840473717 | Estoque positivos.xlsx, linha 31633 | SORVETE BEN E JERRYS 414G CARAMEL CHUNK (UN) | 8 |
| 82184000328 | Estoque positivos.xlsx, linha 34699 | WHISKY JACK DANIELS 1LITRO (UN) | 1 |
| 82184000328 | Estoque positivos.xlsx, linha 34705 | WHISKY JACK DANIELS TENNESSEE HONEY 1L (UN) | 2 |
| 82184004364 | Estoque positivos.xlsx, linha 34703 | WHISKY JACK DANIELS TENNESSE  APPLE 1 LIT. (UN) | 6 |
| 82184004364 | Estoque zerados.xlsx, linha 26611 | WHISKY JACK DANIELS TENESSE APPLE 1LITRO (UN) | 0 |
| 82184090442 | Estoque negativos.xlsx, linha 5628 | JACK DANIELA´S WHISKEY TENNESSEE 1L (UN) | -3 |
| 82184090442 | Estoque positivos.xlsx, linha 34679 | WHISKY  JACK DANIELS TENESSE 1  LITRO (UN) | 2 |
| 95188794506 | Estoque negativos.xlsx, linha 10470 | TAMPICO FRUTAS CITRICAS 450ML (UN) | -43 |
| 95188794506 | Estoque positivos.xlsx, linha 32753 | TAMPICO FRUTAS CITRICAS  450ML (UN) | 120 |
| 95188798573 | Estoque negativos.xlsx, linha 10356 | SUCO TAMPICO FRUTAS CITRICAS 2L (UN) | -1 |
| 95188798573 | Estoque positivos.xlsx, linha 32751 | TAMPICO FRUTAS CITRICAS  2 LITROS (UN) | 5 |
| 619205792476 | Estoque zerados.xlsx, linha 2295 | BALA LIQUIDA SLIME LOKA SORTIDA DOCE MIX 24X8GR (UN) | 0 |
| 619205792476 | Estoque zerados.xlsx, linha 2447 | BALA SLIME LOKA 8G (UN) | 0 |
| 735201035192 | Estoque positivos.xlsx, linha 11677 | DESINFETANTE 5 LITROS ROXO LAVANDA LIMPE BEM (UN) | 11 |
| 735201035192 | Estoque positivos.xlsx, linha 11679 | DESINFETANTE 5 LITROS ROXO LAVANDA LIMPE BEM (UN) | 5 |
| 735201035208 | Estoque negativos.xlsx, linha 3820 | DESINFETANTE 5 LITROS SOFT BLUE LIMPE BEM 5LT (UN) | -1 |
| 735201035208 | Estoque positivos.xlsx, linha 11675 | DESINFETANTE 5 LITRO AZUL SOFT BLUE LIMPE BEM (UN) | 6 |
| 751320319890 | Estoque negativos.xlsx, linha 6574 | MANTEGA GHEE MADHU 180G (UN) | -4 |
| 751320319890 | Estoque positivos.xlsx, linha 20837 | MANTEIGA GHEEMADHU 180G (UN) | 2 |
| 751320650276 | Estoque negativos.xlsx, linha 8336 | PIMENTA DEDO DE MOCA BD 190G (UN) | -1 |
| 751320650276 | Estoque positivos.xlsx, linha 26063 | PIMENTA DEDO MOCA BANDEJA (UN) | 7 |
| 798190100258 | Estoque negativos.xlsx, linha 3816 | DESINCHA NOITE (UN) | -6 |
| 798190100258 | Estoque positivos.xlsx, linha 11667 | DESINCHA NOITE 7 SACHES (UN) | 6 |
| 798190100265 | Estoque negativos.xlsx, linha 3814 | DESINCHA LEVE SUA VIDA LEVE (UN) | -13 |
| 798190100265 | Estoque positivos.xlsx, linha 11663 | DESINCHA DIA 7 SACHES (UN) | 12 |
| 7891991001359 | Estoque positivos.xlsx, linha 31473 | SODA LIMONADA 2L (UN) | 8 |
| 7891991001359 | Estoque zerados.xlsx, linha 21481 | REFRIGERANTE ANTARTICA SODA LIMONADA 2 L (UN) | 0 |
| 7896040706292 | Estoque positivos.xlsx, linha 7103 | CASA E PERFUME SENSUALIDAD 1L (UN) | 1 |
| 7896040706292 | Estoque zerados.xlsx, linha 5215 | CASA E PERFUME SENSUALIDAD GRATIS (UN) | 0 |
| 7898126320842 | Estoque zerados.xlsx, linha 19213 | PASTA DE AMENDOIM INTEGRAL (UN) | 0 |
| 7898126320842 | Estoque zerados.xlsx, linha 19215 | PASTA DE AMENDOIM INTEGRAL 450G (UN) | 0 |

## Método e integridade dos arquivos

Leitura integral dos valores, tipos, estilos e recursos das três abas; contagem de linhas não vazias após o cabeçalho; comparação de códigos e descrições; conferência de saldos e unidades. Inspeção e renderização de áreas representativas de cada aba em uma segunda ferramenta, sem exportar ou salvar as planilhas. As prévias não substituem validação de um arquivo de retorno no Excel.

As assinaturas SHA-256 dos três arquivos foram conferidas. Nenhum arquivo de origem foi alterado:

| Arquivo | SHA-256 |
|---|---|
| Estoque negativos.xlsx | 326b15a24430c18b96887addc985f6561098ab732f054579f2fb4540edc847f4 |
| Estoque positivos.xlsx | 4b40fc4937e4fdc461d84fd54388b0a8448c7019009ddb9c3183eb57820d1cfa |
| Estoque zerados.xlsx | c2c9217102a8029c9d81114f1e81fdde7dfd8d469d49b8b42be727e87daf8d52 |
