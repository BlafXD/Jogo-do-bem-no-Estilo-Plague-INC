# CIENCIA.md — cada número climático e sua fonte

> **Regra 9 da `FORMA-DE-TRABALHO.md`: nenhum dado científico inventado.**
> Todo número que aparece no jogo — em `src/data/balance.json`, num efeito de habilidade
> ou no texto de um evento — precisa de uma linha aqui, com fonte verificável.
>
> Não é burocracia: é o que separa um jogo de conscientização de um jogo que espalha
> desinformação com cara de educação. E é o que sustenta a defesa do projeto na
> apresentação, se alguém perguntar de onde saiu um valor.

## Como registrar

| Campo | Regra |
|---|---|
| **Valor** | O número exato usado no jogo, com unidade |
| **Onde aparece** | Arquivo e chave (ex.: `balance.json → tcre`) |
| **Fonte** | Publicação, ano e link. IPCC AR6 e Global Carbon Budget são as referências primárias |
| **Observação** | Simplificação assumida, arredondamento, ou por que o valor do jogo difere do real |

---

## Fontes primárias

Todas consultadas em **2026-08-18**. As chaves entre colchetes são usadas no resto do arquivo.

| Chave | Publicação | Link |
|---|---|---|
| **[AR6]** | IPCC, _AR6 WG1 — Climate Change 2021: The Physical Science Basis_, Resumo para Formuladores de Políticas, item D.1.1 | <https://www.ipcc.ch/report/ar6/wg1/> |
| **[IGCC25]** | Forster et al., _Indicators of Global Climate Change 2025_, Earth System Science Data 18, 3889–3922 (2026) | <https://essd.copernicus.org/articles/18/3889/2026/> |
| **[GCB25]** | Friedlingstein et al., _Global Carbon Budget 2025_, Earth System Science Data 18, 3211 (2026) | <https://essd.copernicus.org/articles/18/3211/2026/> |
| **[OWID-CO2]** | Our World in Data, `owid-co2-data.csv` — republicação do Global Carbon Budget por país | <https://github.com/owid/co2-data> |
| **[OWID-ENE]** | Our World in Data, `owid-energy-data.csv` — Ember e Energy Institute, eletricidade por país | <https://github.com/owid/energy-data> |
| **[M49]** | ONU, padrão de códigos geográficos M49 (via ISO 3166) — recorte das sub-regiões | <https://unstats.un.org/unsd/methodology/m49/> |
| **[UNEP25]** | UNEP, _Emissions Gap Report 2025_ — usado só para conferir o modelo, não alimenta nenhum valor | <https://www.unep.org/resources/emissions-gap-report-2025> |
| **[PARIS]** | ONU, _Acordo de Paris_ (2015), Artigo 2.1(a) — "bem abaixo de 2 °C" e "esforços para limitar a 1,5 °C" | <https://unfccc.int/process-and-meetings/the-paris-agreement> |

---

## Constantes de balanceamento

| Valor | Onde aparece | Fonte | Observação |
|---|---|---|---|
| **1,37 °C** acima de 1850–1900 | `balance.json → startTemperature` | **[IGCC25]** | Aquecimento **de origem humana** no ano de 2025. O ano isolado observado oscila com El Niño; o número de origem humana é o que representa a linha de base de uma partida. Era 1,3 antes desta tarefa, sem fonte |
| **40,753 GtCO₂/ano** | `balance.json → startEmissions` | **[OWID-CO2]**, ano de 2023 | **É a soma das 8 regiões, por construção** — não editar sem refazer a soma. Fica 0,66 Gt abaixo do total mundial, e a diferença é aviação e navegação internacionais, explicada nos limites |
| **0,00045 °C por GtCO₂** | `balance.json → tcre` | **[AR6]** | TCRE — resposta transiente ao carbono acumulado. O AR6 dá 0,45 °C por 1000 GtCO₂, com faixa provável de 0,27 a 0,63. **O jogo usa a estimativa central e descarta a incerteza**: sortear dentro da faixa faria a partida ser ganha ou perdida pela constante, não pela decisão do jogador |
| **0,0093 por ano (0,93%)** | `balance.json → baselineGrowthPerYear` | **[AR6]**, cenário SSP3-7.0 | Crescimento das emissões enquanto o jogador não age. É exatamente a taxa que **dobra** as emissões até 2100 — que é como o AR6 descreve o SSP3-7.0, o mundo sem política climática nova. Entrou em `P6-02`; sem ela, não fazer nada não perdia o jogo |
| 2025 → 2100 | `balance.json → startYear` e `endYear` | não se aplica | Recorte da partida — decisão de jogo |
| 3,0 °C | `balance.json → loseTemperature` | não se aplica | Limiar de derrota — decisão de jogo, não dado científico. **Ver o achado no fim deste arquivo** |
| **1,5 °C** e **2,0 °C** | `balance.json → goldTemperature` e `silverTemperature` | **[PARIS]**, Artigo 2.1(a) | Entraram no `P6-08`. Não são chute: são os dois números que o Acordo de Paris fixa — 1,5 como o esforço e 2,0 como o teto. **O jogo herda a meta política, não uma escala inventada**, e é isso que dá conteúdo à medalha. Que as duas sejam inalcançáveis com o balanceamento de hoje é problema de balanceamento, não da fonte — está em `docs/BALANCEAMENTO.md` |
| 2,5 °C | `balance.json → bronzeTemperature` | não se aplica | Limiar de Bronze — decisão de jogo. Fica entre o teto de Paris e o limiar de derrota, e é a única medalha alcançável hoje |
| **0,5 GtCO₂/ano** | `balance.json → netZeroEmissions` | não se aplica, mas ver observação | Entrou no `P6-08`: é o "≈ 0" do `docs/GDD.md §2.7` virado número. **Precisa ser um número, e não zero exato**, porque o corte da árvore é multiplicativo — a curva se aproxima de zero sem nunca encostar. 0,5 Gt é **1,2% da emissão de 2025**. Não é dado observado, mas conversa com a literatura: nos cenários de zero líquido do **[AR6]** sobram alguns GtCO₂/ano de emissão residual, compensados por remoção — e o jogo **não simula remoção**, então o limiar faz o papel dela |
| 12, 10, 1,5, 2, 1,8 | demais chaves de `balance.json` | não se aplica | Ritmo, economia de PAC e antagonista — balanceamento puro, ajustável via `docs/BALANCEAMENTO.md` |

> **Fórmula da temperatura** (`docs/GDD.md §4`): `temperature = startTemperature + tcre × cumulativeCO2`.
> É a relação quase linear entre carbono acumulado e aquecimento estabelecida em **[AR6]**. Ela
> vale para CO₂, não para o conjunto dos gases de efeito estufa — é por isso que a unidade de
> `emissions` é GtCO₂ e não GtCO₂e.

---

## Dados por região

**Ano de referência: 2023** — o último com quebra por país em **[OWID-CO2]**. A partida começa em
2025 e o `startTemperature` é de 2025; essa mistura de anos é assumida e está registrada nos
limites.

| id | Região | `population` (milhões) | `emissions` (GtCO₂/ano) | `cleanShare` | Maiores emissores da região |
|---|---|---:|---:|---:|---|
| `na` | América do Norte | 382,9 | 5,682 | 0,460 | Estados Unidos 5,03 · Canadá 0,65 |
| `la` | América Latina | 654,4 | 3,342 | 0,646 | Brasil 1,79 · México 0,46 · Argentina 0,31 |
| `eu` | Europa | 743,6 | 5,249 | 0,603 | Rússia 2,22 · Alemanha 0,59 · Reino Unido 0,31 |
| `af` | África | 1479,0 | 2,707 | 0,250 | Rep. Dem. do Congo 0,43 · África do Sul 0,40 · Egito 0,27 |
| `me` | Oriente Médio | 475,4 | 3,377 | 0,148 | Irã 0,84 · Arábia Saudita 0,74 · Turquia 0,40 |
| `ea` | Ásia Oriental | 2350,1 | 16,367 | 0,334 | China 11,61 · Indonésia 1,29 · Japão 0,99 |
| `sa` | Ásia Meridional | 1952,5 | 3,469 | 0,232 | Índia 3,04 · Paquistão 0,21 · Bangladesh 0,13 |
| `oc` | Oceania | 45,3 | 0,560 | 0,419 | Austrália 0,45 · Nova Zelândia 0,05 |
| | **Soma** | **8083,2** | **40,753** | — | 197 países |

- **`population`** — coluna `population` de **[OWID-CO2]** (origem: ONU, World Population
  Prospects), somada por região.
- **`emissions`** — coluna `co2_including_luc` de **[OWID-CO2]**: queima de combustível fóssil
  **mais** mudança de uso da terra. Vem em Mt no arquivo e foi dividida por 1000.
- **`cleanShare`** — `low_carbon_electricity ÷ electricity_generation` de **[OWID-ENE]**, somados
  por região **antes** de dividir. É a fatia da eletricidade que vem de fonte de baixo carbono,
  renovável ou nuclear.
- **`support` 50, `resilience` 50 e `economy` 100** — valores de jogo, não dados. Sem fonte porque
  não são medida de nada.

### Como as 8 macrorregiões foram montadas

Não existe fonte publicada exatamente com estas 8 regiões. Elas foram agregadas país a país a
partir das sub-regiões da ONU **[M49]**. As quatro exceções estão registradas porque mudam
número:

| Recorte da ONU | Vai para | Por quê |
|---|---|---|
| Northern America | `na` | direto |
| Latin America and the Caribbean | `la` | direto |
| as 4 sub-regiões da Europa | `eu` | direto. **Inclui a Rússia**, que a ONU classifica como Europa Oriental e que sozinha responde por 2,22 das 5,25 Gt da região |
| Sub-Saharan Africa e Northern Africa | `af` | direto. **O Egito fica na África**, não no Oriente Médio, seguindo o M49 |
| Western Asia | `me` | direto. Inclui a Turquia |
| Eastern Asia | `ea` | direto |
| Southern Asia | `sa` | direto, **menos o Irã** |
| as 4 sub-regiões da Oceania | `oc` | direto |
| **South-eastern Asia** | `ea` | **exceção** — o jogo não tem região de Sudeste Asiático. Traz a Indonésia (1,29 Gt) para a Ásia Oriental |
| **Central Asia** | `me` | **exceção** — o jogo não tem Ásia Central. Cazaquistão e Turcomenistão têm perfil de exportador fóssil, próximo do resto da região |
| **Irã** | `me` | **exceção** — o M49 põe o Irã na Ásia Meridional. Deixar ali colocaria o maior emissor do Oriente Médio junto da Índia |
| **Taiwan** | `ea` | **exceção** — não existe no M49 por recorte político da ONU, mas emite 0,26 Gt e precisa entrar em algum lugar |

### Como refazer esta tabela

Os três arquivos de origem são públicos e as colunas estão nomeadas acima. O procedimento é:
baixar `owid-co2-data.csv` e `owid-energy-data.csv`, filtrar `year == 2023`, descartar as linhas
agregadas (as que têm `iso_code` vazio ou começando por `OWID`, como `World` e `Asia`), aplicar o
mapa de sub-regiões acima e somar. **Qualquer pessoa com os mesmos arquivos chega nos mesmos
números** — é isso que torna a tabela defensável na apresentação.

---

## Conferências que o modelo passou

Três checagens independentes, feitas para achar erro de agregação antes de ele virar mecânica:

1. **A soma bate com o mundo.** A fatia limpa de eletricidade calculada somando os 197 países dá
   **39,4%**, idêntico ao total mundial publicado em **[OWID-ENE]**. Se a agregação estivesse
   perdendo país pelo caminho, esse número cairia.
2. **O fóssil fecha exato.** A soma nacional de CO₂ fóssil (36,667 Gt) mais aviação e navegação
   internacionais (1,125 Gt) dá 37,792 Gt — exatamente a linha `World` de **[OWID-CO2]**.
3. **A fórmula reproduz a projeção oficial.** Com emissão constante em 40,753 Gt/ano, a fórmula do
   `§4` dá **2,75 °C em 2100**. O **[UNEP25]** projeta **2,8 °C** para o cenário de políticas
   atuais. Um modelo de uma linha chegar a 0,05 °C da projeção publicada é a evidência mais forte
   de que `tcre` e as emissões estão certos.
   - Pelo mesmo caminho, a partida cruza **1,5 °C em 2033**, coerente com o orçamento de carbono
     de 500 GtCO₂ a partir de 2020 do **[AR6]**.
4. **A linha de base bate com o cenário que ela cita.** Com `baselineGrowthPerYear` em 0,93%, a
   simulação dos 900 ticks termina em **3,35 °C**, com as emissões em **2,00×** as de hoje. O
   **[AR6]** dá **3,6 °C** de melhor estimativa para o SSP3-7.0, que é o cenário com essa mesma
   trajetória de emissões. **Os 0,25 °C de diferença apontam para o lado que o limite 4 previa** —
   o jogo não simula metano nem os demais gases. Um modelo que erra na direção certa, pelo motivo
   já documentado, é um modelo que se entende.

---

## Limites assumidos — ler antes de citar qualquer número daqui

1. **Aviação e navegação internacionais ficam de fora.** São 1,117 GtCO₂ em 2023 que o Global
   Carbon Budget não atribui a país nenhum, por não acontecerem dentro de fronteira. Distribuir
   entre as regiões seria inventar critério, então o jogo não as simula. É por isso que as 8
   regiões somam 40,753 e o mundo real de 2023 emitiu 41,416 Gt — **2,4% a menos**.
2. **A soma nacional de uso da terra não fecha com a estimativa global.** Somando país a país dá
   4,087 Gt; a estimativa global do **[GCB25]** é 3,625 Gt. Os modelos nacional e global são
   diferentes, e essa diferença de 0,46 Gt é conhecida na literatura. O jogo usa a soma nacional,
   que é a única com quebra por região.
3. **19 países não têm série de uso da terra** e entram só com o fóssil — 0,309 Gt no total, dos
   quais 0,261 é Taiwan. A perda é menor que 1% do total global.
4. **O jogo só simula CO₂.** Metano, óxido nitroso e os demais gases não existem na simulação,
   porque a fórmula do TCRE é definida para CO₂. O `startTemperature` de 1,37 °C, por outro lado,
   já embute o efeito de todos os gases. **Consequência: o aquecimento futuro do jogo é
   subestimado** — o mundo real ainda ganha décimos de grau vindos de gases que o jogo ignora.
5. **`cleanShare` é eletricidade, não energia.** Eletricidade é uma fatia da energia que uma
   região consome: transporte, indústria pesada e aquecimento ficam de fora. A troca foi
   deliberada. A série de energia primária limpa por país existe para **4 dos 56 países
   africanos**, e somá-la daria 0,028 para a África contra os 0,095 que a própria fonte publica
   para o continente — um dado errado por mais de 3x justamente nas regiões que o jogo quer
   mostrar. O `docs/GDD.md §3` foi atualizado junto com esta decisão.
6. **Mistura de anos.** As regiões são de 2023, o aquecimento é de 2025 e a partida começa em
   2025. Não havia fonte com quebra por país para 2025 na data da consulta.
7. **Nada aqui projeta o futuro.** A trajetória de emissões dentro da partida é uma escolha de
   cenário, não previsão: o jogo roda o SSP3-7.0 como linha de base e deixa o jogador desviar
   dela. Não é o que vai acontecer, é o que aconteceria sem ação nova.
8. **A taxa de crescimento é uma só, global.** Na realidade as regiões divergem — a Europa cai
   enquanto a África e a Ásia Meridional sobem. Aplicar uma taxa única às 8 é simplificação
   assumida: as trajetórias regionais do SSP3-7.0 existem, mas cada uma exigiria fonte própria e
   o ganho não paga o custo antes do primeiro playtest.

---

## Como a linha de base foi resolvida (era o achado aberto do `P3-01`)

**O problema:** com os números com fonte e emissão constante, a partida terminava em 2,75 °C —
abaixo dos 3,0 °C de `loseTemperature`. O jogador podia deixar o tempo correr até 2100 sem
comprar nada e sobreviver. Não era erro do modelo, era o modelo acertando: o mundo de políticas
atuais chega a ~2,8 °C **[UNEP25]**, e a catástrofe depende de as emissões **crescerem**.

**A decisão, tomada em `P6-02`:** as emissões crescem **0,93% ao ano** enquanto o jogador não
age, o que dobra a emissão global até 2100. Essa é a descrição do **SSP3-7.0** no **[AR6]** — o
cenário de "rivalidade regional", sem política climática nova. A constante mora em
`balance.json → baselineGrowthPerYear` e o registro do ajuste está em `docs/BALANCEAMENTO.md`.

**O que isso produz:** 3,35 °C em 2100, e o jogador que não faz nada cruza os 3 °C em **2089**.

**Duas coisas que essa decisão deliberadamente não faz:**

- **Não usa a Inércia como motor da linha de base.** A Inércia (`docs/GDD.md §2.6`, tarefa
  `P7-03`) age **por cima** desse crescimento, acelerando-o — não no lugar dele. Se o antagonista
  fosse a única fonte de crescimento, o `climate.ts` dependeria de um módulo que ainda não existe
  e o aceite do `P6-02` seria impossível de verificar.
- **Não mexe no `loseTemperature`.** Baixar o limiar de derrota até a conta fechar seria ajustar
  a ficção ao número. O limiar de 3 °C é o que dá sentido ao jogo; a taxa é o que dá ritmo, e é
  ela que o playtest deve mexer.

---

## Fatos das habilidades

Cada nó da árvore carrega um `fact` de uma frase (`docs/GDD.md §2.4`), e é ele que faz o jogo
ensinar alguma coisa em vez de só entreter. Preenchido em `P6-05`, com os 20 nós de
`src/data/skills.json`, e **dobrado no `REF-07` (2026-10-06), quando a árvore foi aos 40 nós** do
`§2.4` — os 20 novos estão na segunda tabela, com as fontes consultadas naquela data.

**Estas fontes são setoriais, não primárias.** A tabela do topo deste arquivo é a que sustenta o
*modelo* — IPCC, Global Carbon Budget, OWID. As de baixo sustentam as *frases* que o jogador lê,
e vêm de agências setoriais (IEA, IRENA, FAO, UNESCO) e de artigos revisados por pares. Um número
errado aqui não quebra a simulação, mas quebra a honestidade do jogo, que é pior.

| Chave | Publicação | Link |
|---|---|---|
| **[IRENA24]** | IRENA, _Renewable Power Generation Costs in 2023_ (2024) | <https://www.irena.org/Publications/2024/Sep/Renewable-Power-Generation-Costs-in-2023> |
| **[IRENA25]** | IRENA, _Renewable Power Generation Costs in 2024_ (2025) | <https://www.irena.org/-/media/Files/IRENA/Agency/Publication/2025/Jul/IRENA_TEC_RPGC_in_2024_Summary_2025.pdf> |
| **[BNEF25]** | BloombergNEF, levantamento anual de preço de bateria de íon-lítio (2025) | <https://about.bnef.com/insights/clean-transport/lithium-ion-battery-pack-prices-fall-to-108-per-kilowatt-hour-despite-rising-metal-prices-bloombergnef/> |
| **[IEA-GRID]** | IEA, _Electricity Grids and Secure Energy Transitions_ (2023) | <https://www.iea.org/reports/electricity-grids-and-secure-energy-transitions> |
| **[IEA-EV25]** | IEA, _Global EV Outlook 2025_ | <https://www.iea.org/reports/global-ev-outlook-2025> |
| **[IEA-CARS]** | IEA, _Cars and Vans_ — página setorial | <https://www.iea.org/energy-system/transport/cars-and-vans> |
| **[IEA-BLD]** | IEA, emissões de CO₂ dos prédios, incluindo as embutidas na construção, 2022 | <https://www.iea.org/data-and-statistics/charts/global-co2-emissions-from-buildings-including-embodied-emissions-from-new-construction-2022> |
| **[IEA-STEEL]** | IEA, _Iron & Steel_ — página setorial | <https://www.iea.org/energy-system/industry/steel> |
| **[IEA-CEM]** | IEA, _Cement_ — página setorial | <https://www.iea.org/energy-system/industry/cement> |
| **[IEA-EFF]** | IEA, sobre a meta de dobrar a eficiência energética até 2030 (COP28) | <https://www.iea.org/news/much-faster-progress-on-energy-efficiency-is-needed-to-meet-global-2030-goal> |
| **[FRA25]** | FAO, _Global Forest Resources Assessment 2025_ — principais achados | <https://openknowledge.fao.org/server/api/core/bitstreams/2dee6e93-1988-4659-aa89-30dd20b43b15/content/FRA-2025/key-findings.html> |
| **[DONATO11]** | Donato et al., _Mangroves among the most carbon-rich forests in the tropics_, Nature Geoscience 4, 293–297 (2011) | <https://www.nature.com/articles/ngeo1123> |
| **[SRCCL]** | IPCC, _Climate Change and Land_ — relatório especial (2019) | <https://www.ipcc.ch/srccl/> |
| **[IRP24]** | UNEP / International Resource Panel, _Global Resources Outlook 2024_ | <https://www.unep.org/resources/Global-Resource-Outlook-2024> |
| **[UNESCO21]** | UNESCO, sobre currículos nacionais e mudança do clima | <https://www.unesco.org/en/articles/only-half-national-curricula-world-have-reference-climate-change-unesco-warns> |
| **[NOAA-MP]** | NOAA, _Montreal Protocol emerges as a powerful climate treaty_ | <https://www.noaa.gov/news-release/montreal-protocol-emerges-as-powerful-climate-treaty> |
| **[WMO-EW]** | WMO, _Early Warning Systems_ — cita a Global Commission on Adaptation | <https://wmo.int/topics/early-warning-system> |
| **[REIMANN21]** | Reimann et al., _Estimating population and urban areas at risk of coastal hazards_, ESSD 13, 5747–5773 (2021) | <https://essd.copernicus.org/articles/13/5747/2021/> |
| **[BRAND21]** | Brand et al., Global Environmental Change (2021), via Universidade de Oxford | <https://www.ox.ac.uk/news/2021-02-02-get-your-bike-study-shows-walking-cycling-and-e-biking-make-significant-impact> |

A chave **[GCB25]** não se repete nessa tabela: ela é uma das fontes primárias do topo deste
arquivo, e é de lá que sai o fato do `ocean-protection`.

**Consultadas em 2026-08-18.** A tabela abaixo é gerada a partir do próprio `skills.json` — se um
`fact` mudar lá e não aqui, os dois deixam de bater e é para regerar, não para editar à mão.

| Nó | Fato como o jogador lê | Fonte | Observação |
|---|---|---|---|
| `solar` | O custo da eletricidade solar caiu 90% entre 2010 e 2023, de US$ 0,460 para US$ 0,044 por kWh. | **[IRENA24]** | LCOE médio ponderado de solar fotovoltaica em escala de serviço público. Em 2023 ficou 56% abaixo da alternativa fóssil — em 2010 era 414% acima |
| `wind` | A eólica em terra ficou 70% mais barata entre 2010 e 2024, de US$ 0,089 para US$ 0,034 por kWh. | **[IRENA25]** | LCOE médio ponderado de eólica em terra. O fator de capacidade subiu de 27% para 34% no período |
| `storage` | O pacote de baterias de íon-lítio caiu de mais de US$ 1.200 por kWh em 2010 para US$ 108 em 2025. | **[BNEF25]** | Preço médio de pacote, em dólares nominais. Em termos reais a queda é de cerca de 93% |
| `smart-grid` | Até 2040 o mundo precisa somar ou trocar 80 milhões de quilômetros de linhas — o tamanho da rede elétrica que existe hoje. | **[IEA-GRID]** | O relatório pede também dobrar o investimento anual em rede, para mais de US$ 600 bilhões até 2030 |
| `transit` | Carros e vans sozinhos respondem por cerca de 10% das emissões mundiais de CO₂ ligadas à energia e por mais de um quarto do petróleo consumido. | **[IEA-CARS]** | Dado de 2023. Carros e vans são um recorte do transporte, que responde por cerca de um quarto das emissões de CO₂ ligadas à energia |
| `ev-fleet` | Em 2024 foram vendidos mais de 17 milhões de carros elétricos no mundo — mais de um a cada cinco carros novos. | **[IEA-EV25]** | Vendas de 2024. A China sozinha vendeu mais de 11 milhões |
| `active-travel` | Trocar uma viagem de carro por dia pela bicicleta corta cerca de meia tonelada de CO₂ por ano, por pessoa. | **[BRAND21]** | Painel longitudinal em sete cidades europeias. Quem já pedalava emitia 84% menos CO₂ no deslocamento diário |
| `efficient-buildings` | Só a operação dos prédios responde por 26% das emissões mundiais de CO₂ ligadas à energia. | **[IEA-BLD]** | Só a operação: 8% diretas e 18% indiretas, em 2022. Com as emissões embutidas na construção o setor chega a cerca de um terço |
| `reforestation` | O mundo ainda perde 4,1 milhões de hectares de floresta por ano — eram 10,7 milhões na década de 1990. | **[FRA25]** | Perda **líquida** — desmatamento menos recuperação. O desmatamento bruto segue perto de 10,9 milhões de hectares por ano |
| `mangroves` | O solo de um manguezal guarda em média cinco vezes mais carbono por hectare que o de florestas temperadas, boreais ou tropicais. | **[DONATO11]** | Medição em 25 manguezais do Indo-Pacífico. A vantagem está sobretudo no solo, não na biomassa acima do chão |
| `regen-agriculture` | Os sistemas alimentares respondem por algo entre 21% e 37% das emissões humanas de gases de efeito estufa. | **[SRCCL]** | Faixa do relatório especial do IPCC sobre terra. Estimativas posteriores convergem para cerca de um terço |
| `ocean-protection` | O oceano absorveu 29% de todo o CO₂ emitido por atividade humana na última década. | **[GCB25]** | Média da década de 2015–2024. O sumidouro terrestre absorveu outros 21% no mesmo período |
| `industrial-efficiency` | Na COP28 os governos se comprometeram a dobrar o ritmo de ganho de eficiência energética até 2030, para mais de 4% ao ano; em 2024 o mundo entregou cerca de 1%. | **[IEA-EFF]** | A meta da COP28 é dobrar o ritmo em relação aos cerca de 2% ao ano obtidos entre 2010 e 2020 |
| `circular-economy` | Extrair e processar materiais responde por mais de 60% das emissões que aquecem o planeta. | **[IRP24]** | Inclui biomassa (um terço do total) mais fósseis, metais e minerais não metálicos (35%) |
| `green-steel` | A siderurgia emite 2,6 GtCO₂ por ano, cerca de 7% das emissões do sistema energético mundial. | **[IEA-STEEL]** | Emissões diretas. Contando escopo 2 e 3 as estimativas publicadas chegam a 9% |
| `low-carbon-cement` | O cimento emitiu 2,4 GtCO₂ em 2023 — 6,5% de todo o CO₂ vindo de queima de combustível e de processos industriais. | **[IEA-CEM]** | Dado de 2023. Boa parte é emissão de processo — sai da calcinação do calcário, não da queima de combustível |
| `climate-education` | Só 53% dos currículos escolares nacionais do mundo mencionam mudança do clima em algum ponto. | **[UNESCO21]** | Levantamento em 100 países. Menos de 40% dos professores ouvidos se diziam seguros para ensinar a gravidade do tema |
| `treaties` | O Protocolo de Montreal evitou entre 0,5 °C e 1 °C de aquecimento até meados deste século — é o tratado ambiental mais bem-sucedido já assinado. | **[NOAA-MP]** | Comparado a um cenário sem controle das substâncias que destroem a camada de ozônio. A Emenda de Kigali, sobre HFCs, deve evitar até 0,4 °C a mais até 2100 |
| `early-warning` | Vinte e quatro horas de aviso antes de um desastre reduzem o dano em 30%. | **[WMO-EW]** | Número da Global Commission on Adaptation. A mortalidade por desastre é pelo menos seis vezes menor onde o sistema de alerta funciona |
| `coastal-defence` | Entre 750 milhões e 1,1 bilhão de pessoas vivem a menos de 10 metros acima do nível do mar. | **[REIMANN21]** | Faixa para 2015. A largura vem de qual base de elevação e de população se usa — o artigo compara várias |

### A exceção: o alvo regional do `mangroves` (2026-10-06)

**Um nó passou a escolher regiões, e por isso a escolha precisa de fonte.** O `mangroves` dava 10
pontos de resiliência ao mundo inteiro; desde 2026-10-06 ele dá **14 às cinco regiões tropicais** —
`la`, `af`, `ea`, `sa` e `oc` — e nada às outras três. É o primeiro efeito com alvo regional do
jogo, e realiza a promessa do `docs/GDD.md §2.3` de que regiões diferentes pedem estratégias
diferentes.

| Valor | Onde aparece | Fonte | Observação |
|---|---|---|---|
| as 5 regiões tropicais | `skills.json → mangroves → effects` | **[GMA-MAP]** | **Cinco países concentram 48% dos manguezais do mundo** — Indonésia (19%), Brasil (9%), Nigéria (7%), México (6%) e Austrália —, e a Índia é o terceiro maior em área. No recorte do jogo, esses seis caem em `ea`, `la`, `af` e `oc`, mais `sa` pela Índia |

**A simplificação está assumida, e é esta:** `na` e `me` **têm** manguezal — a Flórida e as costas do
mar Vermelho e do Golfo —, mas em área pequena perto das cinco regiões acima; a Europa não tem
nenhum. O jogo deixa as três de fora do alvo. É a mesma licença que o evento `landslide` já toma, e
está anotada aqui pelo mesmo motivo: **um alvo regional é uma afirmação sobre o mundo**, e
afirmação sobre o mundo tem fonte neste arquivo ou não entra.

**O corte de emissão do mesmo nó continua global**, e isso não é descuido: o carbono que o
manguezal guarda sai da atmosfera do planeta inteiro, não da atmosfera da região dele. O
`tests/skills.test.ts` trava as duas metades.

---

**O que estes fatos deliberadamente não fazem:** nenhum deles alimenta número da simulação. O
efeito mecânico de um nó (quanto ele corta de emissão, quanto custa em PAC) é **balanceamento**, e
mora em `docs/BALANCEAMENTO.md`. Misturar as duas coisas seria dar aparência de ciência a uma
escolha de jogo — o corte de 0,5% ao ano da solar não sai de lugar nenhum do IRENA, é número de
desenho. O fato é verdade sobre o mundo; o efeito é verdade sobre o jogo.

### Os 20 nós do `REF-07` (segundo losango de cada ramo)

**Consultadas em 2026-10-06.** Os quatro nós profundos de cada ramo, que o `docs/GDD.md §2.4`
sempre previu e o corte do modo solo adiava. Mesma regra da tabela de cima: fonte setorial para a
frase, nada de número de simulação.

| Chave | Publicação | Link |
|---|---|---|
| **[GWEC25]** | GWEC, _Global Offshore Wind Report 2025_ | <https://gwec.net/news/offshore-wind-installed-capacity-reaches-83-gw-as-new-report-finds-2024-a-record-year-for-construction-and-auctions> |
| **[IEA-HYDRO]** | IEA, comentário _Hydropower is still "the forgotten giant of electricity"_ (2025) | <https://www.iea.org/commentaries/hydropower-is-still-the-forgotten-giant-of-electricity-and-that-needs-to-change> |
| **[IEA-H2-25]** | IEA, _Global Hydrogen Review 2025_ | <https://www.iea.org/reports/global-hydrogen-review-2025/demand> |
| **[IEA-GER25]** | IEA, _Global Energy Review 2025_ — capítulo do carvão | <https://www.iea.org/reports/global-energy-review-2025/coal> |
| **[IEA-RAIL]** | IEA, _The Future of Rail_ (2019), com a União Internacional das Ferrovias | <https://www.iea.org/news/railways-could-provide-much-greater-benefits-for-energy-and-the-environment-according-to-iea-report> |
| **[IMO-GHG4]** | IMO, _Fourth IMO Greenhouse Gas Study 2020_ — resumo executivo | <https://wwwcdn.imo.org/localresources/en/OurWork/Environment/Documents/Fourth%20IMO%20GHG%20Study%202020%20Executive-Summary.pdf> |
| **[IATA-SAF]** | IATA, nota à imprensa sobre a produção de combustível sustentável de aviação (dez. 2024) | <https://www.iata.org/en/pressroom/2024-releases/2024-12-10-03/> |
| **[UNEP-CITY]** | UNEP, _Cities and climate change_ — página temática | <https://www.unep.org/explore-topics/resource-efficiency/what-we-do/cities/cities-and-climate-change> |
| **[UNEP-PEAT]** | UNEP, _Peatlands store twice as much carbon as all the world's forests_ | <https://www.unep.org/news-and-stories/story/peatlands-store-twice-much-carbon-all-worlds-forests> |
| **[ZOMER16]** | Zomer et al., _Global Tree Cover and Biomass Carbon on Agricultural Land_, Scientific Reports 6, 29987 (2016) | <https://www.ncbi.nlm.nih.gov/pmc/articles/PMC4951720/> |
| **[FWI24]** | UNEP e WRAP, _Food Waste Index Report 2024_ | <https://www.unep.org/resources/publication/food-waste-index-report-2024> |
| **[PP24]** | UNEP-WCMC e IUCN, _Protected Planet Report 2024_, via nota do UNEP | <https://www.unep.org/news-and-stories/press-release/world-must-act-faster-protect-30-planet-2030> |
| **[IEA-CH4-25]** | IEA, _Global Methane Tracker 2025_ | <https://www.iea.org/reports/global-methane-tracker-2025> |
| **[IEA-NH3]** | IEA, _Ammonia Technology Roadmap_ (2021) — resumo executivo | <https://www.iea.org/reports/ammonia-technology-roadmap/executive-summary> |
| **[GCCSI24]** | Global CCS Institute, _Global Status of CCS 2024_ | <https://globalccsinstitute.com/wp-content/uploads/2024/10/2024-GSR_20241015.pdf> |
| **[WB-CP25]** | Banco Mundial, _State and Trends of Carbon Pricing 2025_ | <https://www.worldbank.org/en/news/press-release/2025/06/10/global-carbon-pricing-mobilizes-over-100-billion-for-public-budgets> |
| **[IEA-SUB]** | IEA, _Fossil fuel subsidies_ — página temática | <https://www.iea.org/topics/fossil-fuel-subsidies> |
| **[NCQG24]** | OCDE, sobre a Nova Meta Coletiva Quantificada de financiamento climático acordada na COP29 | <https://www.oecd.org/en/topics/sub-issues/the-new-collective-quantified-goal-on-climate-finance0.html> |
| **[IRENA-JOBS]** | IRENA e OIT, série _Renewable Energy and Jobs_ — número da edição de 2025, publicada em jan. 2026 | <https://www.irena.org/benefits/Job-Creation> |
| **[GMA-MAP]** | Global Mangrove Alliance / FAO, distribuição dos manguezais por país | <https://www.mangrovealliance.org/news/30-years-of-global-forest-data> |

A chave **[NOAA-MP]** não se repete: ela já está na tabela de cima, e é de lá que sai o número do
`refrigerants` — **o mesmo 0,4 °C que a observação do `treaties` já registrava**. Uma varredura
encontrou "até 0,5 °C" numa mensagem do Secretário-Geral da ONU, e o número foi **descartado em
favor do que este arquivo já tinha**: duas linhas do mesmo documento dizendo números diferentes
sobre a Emenda de Kigali seria o tipo de incoerência que ninguém revisa duas vezes.

| Nó | Fato como o jogador lê | Fonte | Observação |
|---|---|---|---|
| `offshore-wind` | A eólica no mar chegou a 83 GW instalados no mundo no fim de 2024, com 8 GW somados só naquele ano. | **[GWEC25]** | Capacidade acumulada. As adições de 2024 ficaram 26% abaixo das de 2023; a China lidera há sete anos seguidos |
| `hydro` | A hidrelétrica ainda é a maior fonte isolada de eletricidade renovável do mundo: cerca de 14% de toda a geração, à frente da eólica e da solar. | **[IEA-HYDRO]** | Cerca de 4.500 TWh. Eólica fica perto de 8% e solar perto de 7% — **somadas elas já passam a hidrelétrica**, e é por isso que a frase diz "fonte isolada" |
| `green-hydrogen` | O mundo produziu quase 100 milhões de toneladas de hidrogênio em 2024, e menos de 1% delas veio de processos de baixa emissão. | **[IEA-H2-25]** | A produção de baixa emissão cresceu 10% em 2024 e deve passar de 1 Mt em 2025 — o problema é a escala, não a direção |
| `coal-phaseout` | O carvão gerou 35% da eletricidade do mundo em 2024 — a menor fatia desde 1974, e ainda assim a maior de todas as fontes. | **[IEA-GER25]** | 1974 é o ano de fundação da IEA, que é até onde a série vai. Em valor absoluto a geração a carvão **subiu** cerca de 1%, a um recorde de 10.700 TWh: a fatia cai porque o bolo cresce |
| `rail-freight` | O trem leva 7% da carga e 8% dos passageiros do mundo gastando 2% de toda a energia do transporte. | **[IEA-RAIL]** | O relatório é de 2019 e continua sendo o levantamento de referência do setor. O contraste entre os 7–8% e os 2% é a eficiência do modal, não uma projeção |
| `clean-shipping` | A navegação internacional respondeu por 2,9% das emissões humanas de gases de efeito estufa, e a Organização Marítima Internacional se comprometeu a zerá-las por volta de 2050. | **[IMO-GHG4]** | 2,89% em 2018, contra 2,76% em 2012. A frase evita datar o compromisso de propósito: a estratégia da IMO foi revista mais de uma vez desde 2023 |
| `aviation-fuel` | Em 2024, o combustível sustentável de aviação foi 0,3% de todo o querosene de avião queimado no mundo. | **[IATA-SAF]** | 1 milhão de toneladas, o dobro de 2023 — e ainda assim abaixo da própria previsão da IATA, de 1,5 Mt |
| `compact-cities` | As cidades ocupam cerca de 2% da terra do planeta e respondem por 70% das emissões de CO₂. | **[UNEP-CITY]** | Os 70% são a estimativa que o IPCC AR6 (2022) e o UN-Habitat repetem. Transporte e prédios são as duas maiores parcelas — que é exatamente o ramo deste nó |
| `peatlands` | As turfeiras cobrem cerca de 3% da terra do planeta e guardam o dobro do carbono de todas as florestas do mundo somadas. | **[UNEP-PEAT]** | Perto de um terço do carbono de solo do mundo. Só 17% delas estão dentro de área protegida |
| `agroforestry` | Em 43% das terras agrícolas do mundo já existe ao menos 10% de cobertura de árvores, e são elas que guardam mais de três quartos do carbono dessas terras. | **[ZOMER16]** | Dado de 2010, com sensoriamento remoto global. O IPCC põe a agrofloresta entre os três maiores caminhos de mitigação do uso da terra |
| `food-waste` | Perder e desperdiçar comida gera de 8% a 10% das emissões humanas de gases de efeito estufa — quase cinco vezes o que a aviação inteira emite. | **[FWI24]** | 1,05 bilhão de toneladas desperdiçadas em 2022, 19% do que chega ao consumidor. As casas respondem por 60% disso |
| `protected-areas` | O mundo protege 17,6% da terra e 8,4% do mar; a meta acordada por quase todos os países é chegar a 30% dos dois até 2030. | **[PP24]** | A meta 30x30 é do Marco Global de Biodiversidade de Kunming-Montreal. Chegar lá exige quase dobrar a área protegida em terra e mais que triplicar no mar |
| `methane-leaks` | A produção de combustível fóssil solta quase 120 milhões de toneladas de metano por ano, e 70% disso daria para evitar com tecnologia que já existe. | **[IEA-CH4-25]** | Boa parte do conserto **se paga**: o gás capturado é vendável. Em 2024 isso teria posto 100 bilhões de m³ no mercado, o equivalente a tudo o que a Noruega exporta |
| `refrigerants` | Trocar os gases de geladeiras e de ar-condicionado, como manda a Emenda de Kigali, deve evitar até 0,4 °C de aquecimento a mais até 2100. | **[NOAA-MP]** | Mesmo número da observação do `treaties`, de propósito — ver a nota acima da tabela. É aquecimento **evitado em relação a seguir com HFCs**, não resfriamento |
| `green-ammonia` | Cada tonelada de amônia para fertilizante emite 2,4 toneladas de CO₂ — quase o dobro do aço e quatro vezes o cimento. | **[IEA-NH3]** | Emissão direta por tonelada produzida. A amônia é o produto que mais emite de todo o setor químico (450 MtCO₂/ano), e 99% dela ainda vem de carvão ou de gás |
| `carbon-capture` | Todas as usinas de captura de carbono em operação no mundo retiram 51 milhões de toneladas de CO₂ por ano — pouco mais de um milésimo do que o mundo emite. | **[GCCSI24]** | 51 Mt contra os 40,753 Gt do `startEmissions`: 0,125%. O que está em construção dobraria a conta, e a fila inteira de projetos chega a 416 Mt/ano |
| `carbon-price` | Os instrumentos de preço de carbono já cobrem 28% das emissões mundiais e arrecadaram mais de 100 bilhões de dólares em 2024. | **[WB-CP25]** | Eram 12% de cobertura uma década antes. São 80 instrumentos em operação, e mais da metade da arrecadação é carimbada para meio ambiente e infraestrutura |
| `subsidy-reform` | Em 2023 os governos gastaram 620 bilhões de dólares para baratear combustível fóssil ao consumidor, e em 2022 esse gasto passou de 1,2 trilhão. | **[IEA-SUB]** | Subsídio ao **consumo**, não à produção. O pico de 2022 veio da disparada de preço após a invasão da Ucrânia; eletricidade, petróleo e gás pesam cerca de um terço cada |
| `climate-finance` | Na COP29 os países acordaram levar o financiamento climático aos países em desenvolvimento a pelo menos 300 bilhões de dólares por ano até 2035, dentro de uma meta maior de 1,3 trilhão vindo de todas as fontes. | **[NCQG24]** | Os 300 bilhões triplicam a meta anterior, de 100 bilhões. Os dois números são da mesma decisão: o menor é o que os países desenvolvidos lideram, o maior é de todas as fontes |
| `just-transition` | A energia renovável empregava 16,6 milhões de pessoas no mundo em 2024, e o emprego do setor cresce há mais de uma década. | **[IRENA-JOBS]** | Edição de 2025 da série, com a OIT. Foi o **crescimento mais lento** já medido (2,3%) apesar de um recorde de instalações — automação e gargalos de rede são as razões apontadas |

## Fatos das 3 ações do mundo real

A tela final do `docs/GDD.md §2.7` fecha com três ações que existem fora do jogo, escolhidas pelos
ramos que a partida deixou de lado. Preenchido em `P7-06`, com as 5 ações de `src/data/actions.json`
— uma por ramo, três mostradas.

**Nenhuma fonte nova entrou por causa desta tela, e isso é a regra e não a economia.** Cada `fact`
aqui já sustentava um nó da árvore na tabela acima: o mesmo número, a mesma publicação, a mesma
consulta de 2026-08-18. Escrever fato novo para a tela de fim significaria abrir uma segunda frente
de verificação para o texto que o jogador lê **por último** — que é justamente o que ele leva para
casa. Reaproveitar o que já foi conferido é o caminho mais honesto e o mais barato ao mesmo tempo.

| Ramo | Ação como o jogador lê | Fato | Fonte | Nó que já usava o mesmo fato |
|---|---|---|---|---|
| `energy` | Descubra de onde vem a eletricidade que você usa e o que custa trocá-la. | O custo da eletricidade solar caiu 90% entre 2010 e 2023, de US$ 0,460 para US$ 0,044 por kWh. | **[IRENA24]** | `solar` |
| `transport` | Troque uma viagem de carro por dia por bicicleta, caminhada ou transporte público. | Trocar uma viagem de carro por dia pela bicicleta corta cerca de meia tonelada de CO₂ por ano, por pessoa. | **[BRAND21]** | `active-travel` |
| `nature` | Olhe para uma refeição por dia: de onde ela veio e quanto dela vai para o lixo. | Os sistemas alimentares respondem por algo entre 21% e 37% das emissões humanas de gases de efeito estufa. | **[SRCCL]** | `regen-agriculture` |
| `industry` | Conserte, empreste e recuse o descartável antes de comprar de novo. | Extrair e processar materiais responde por mais de 60% das emissões que aquecem o planeta. | **[IRP24]** | `circular-economy` |
| `society` | Cobre o assunto de quem decide: na escola, no trabalho, na sua cidade. | Só 53% dos currículos escolares nacionais do mundo mencionam mudança do clima em algum ponto. | **[UNESCO21]** | `climate-education` |

**A ação não é fonte, o fato é.** A coluna "ação" é escolha editorial — o que uma pessoa pode fazer
na segunda-feira de manhã —, e é a única coisa desta tabela que o pacote `[D-Historia]` pode
reescrever livremente. A coluna "fato" carrega o número, e um número sem a fonte ao lado não entra:
é a mesma separação da tabela das habilidades, onde o `fact` é verdade sobre o mundo e o efeito é
verdade sobre o jogo.

**O que estas ações deliberadamente não fazem:** nenhuma promete efeito quantificado da escolha
individual sobre a temperatura global. O `[BRAND21]` é a única que traz um número por pessoa, e ele
é o do próprio estudo — deslocamento diário, sete cidades europeias —, não uma extrapolação nossa.
Somar meia tonelada por pessoa vezes uma população para anunciar um resultado seria inventar
ciência com números verdadeiros, que é pior do que inventá-la com números falsos: parece conferível.

---

## Fatos dos eventos

Mesma regra para o `fact` de cada evento climático (`docs/GDD.md §2.5`). Preenchido em `P7-01`,
com os 10 eventos de `src/data/events.json`.

**Estas fontes são setoriais, como as das habilidades.** Um número errado aqui não quebra a
simulação, mas quebra a honestidade do jogo — que é pior, porque é o texto que o jogador lê.

**Consultadas em 2026-08-20.**

| Chave | Publicação | Link |
|---|---|---|
| **[UNEP-FIRE]** | UNEP e GRID-Arendal, _Spreading like Wildfire: The Rising Threat of Extraordinary Landscape Fires_ (2022) | <https://www.unep.org/resources/report/spreading-wildfire-rising-threat-extraordinary-landscape-fires> |
| **[NOAA-CRW]** | NOAA Coral Reef Watch / ICRI, sobre o 4º evento global de branqueamento (2023–2025) | <https://www.nesdis.noaa.gov/news/worlds-fourth-mass-coral-bleaching-event-likely-ended-2025> |
| **[IJID25]** | Boletim global de dengue de 2024, _International Journal of Infectious Diseases_ (2025) | <https://www.ijidonline.com/article/S1201-9712(25)00164-X/fulltext> |
| **[GFDL-LS]** | NOAA GFDL, _Changes in extreme precipitation and landslides over High Mountain Asia_ | <https://www.gfdl.noaa.gov/research_highlight/changes-in-extreme-precipitation-and-landslides-over-high-mountain-asia/> |
| **[WMO-SGC24]** | WMO, _State of the Global Climate 2024_ | <https://wmo.int/publication-series/state-of-global-climate-2024> |

A chave **[AR6]** não se repete aqui: ela é fonte primária no topo deste arquivo, e é de lá que
saem cinco dos dez primeiros fatos.

### Os 10 eventos novos (2026-10-06)

**Os eventos subiram de 10 para 20**, item do Gelo do `PLANO.md`. **A frequência não mudou:** o
`drawEvent` usa a *soma* dos pesos como eventos por ano, então os dez pesos antigos foram divididos
por dois e os novos ocuparam a metade que sobrou — 2,370 antes, 2,355 depois. Dobrou a variedade, e
não a pressão.

**Nenhum dos dez é geológico**, e isso foi critério de escolha, não acaso: é a mesma régua que tirou
o tsunami no `P3-06`. Cada um é consequência medida do aquecimento.

**Consultadas em 2026-10-06.**

| Chave | Publicação | Link |
|---|---|---|
| **[ILO19]** | OIT, _Working on a warmer planet: the impact of heat stress on labour productivity_ (2019) | <https://www.ilo.org/publications/working-warmer-planet-impact-heat-stress-labour-productivity-and-decent> |
| **[WGMS25]** | WMO / World Glacier Monitoring Service, Dia Mundial das Geleiras (2025) | <https://www.unognewsroom.org/story/en/2566/world-day-for-glaciers> |
| **[UNCCD-SDS]** | UNCCD e WMO, sobre tempestades de areia e poeira | <https://www.unccd.int/news-stories/press-releases/sand-and-dust-storm-frequency-increasing-many-world-regions-un-warns> |
| **[IEA-COOL]** | IEA, _The Future of Cooling_ (2018) | <https://www.iea.org/reports/the-future-of-cooling> |
| **[HJORT22]** | Hjort et al., _Impacts of permafrost degradation on infrastructure_, Nature Reviews Earth & Environment 3, 24–38 (2022) | <https://www.nature.com/articles/s43017-021-00247-8> |
| **[IDMC25]** | IDMC, _Global Report on Internal Displacement 2025_ | <https://www.internal-displacement.org/global-report/grid2025/> |
| **[SWISSRE25]** | Swiss Re Institute, _sigma_ sobre catástrofes naturais de 2024 | <https://www.swissre.com/institute/research/sigma-research/sigma-2025-01-natural-catastrophes-trend.html> |
| **[FAO-FISH]** | FAO, _Impacts of climate change on fisheries and aquaculture_ — potencial de captura por região | <https://www.fao.org/3/i9705en/i9705en.pdf> |

| Evento | Fato no jogo | Fonte | Observação |
|---|---|---|---|
| `marine-heatwave` | As ondas de calor marinhas dobraram de frequência desde 1982, e ficaram mais longas e mais intensas. | **[AR6]** | Classificado como *very likely*. É evento **distinto** do branqueamento de corais, que é a consequência: um é o calor do mar, o outro o que ele faz ao recife. Como ele, não é mitigado por resiliência — defesa costeira não esfria o oceano |
| `glacier-loss` | Dois bilhões de pessoas dependem do degelo das geleiras e da neve das montanhas para ter água. | **[WGMS25]** | Desde 1975 as geleiras perderam cerca de 9.000 Gt de gelo, e seis dos sete piores anos da série aconteceram nos últimos sete. **O evento mira seis regiões**, deixando de fora África e Oceania: as geleiras de lá existem, mas abastecem pouca gente perto dos Andes, dos Alpes, do Cáucaso, da Ásia Central e do Himalaia |
| `heat-labour` | A 1,5 °C de aquecimento, o calor deve custar 2,2% das horas de trabalho do mundo em 2030 — o equivalente a 80 milhões de empregos de tempo integral. | **[ILO19]** | Estimativa **conservadora**: supõe trabalho à sombra. Ao sol, a perda vai a 3,8%. **Os alvos do evento saem da própria fonte**, que aponta Ásia Meridional, África Ocidental, Sudeste Asiático e África Central como as mais atingidas, e diz que América do Norte e Europa não são afetadas de forma significativa |
| `dust-storm` | Dois bilhões de toneladas de areia e poeira entram na atmosfera por ano, e as tempestades que elas formam já atingem 330 milhões de pessoas em mais de 150 países. | **[UNCCD-SDS]** | Mais de 80% se originam nos desertos do norte da África e do Oriente Médio, o que define os alvos. A UNCCD atribui ao menos um quarto das tempestades a atividade humana — mineração e pastagem excessivas —, e não só ao clima: a frase evita dizer que o aquecimento as causa, e diz o tamanho delas |
| `cooling-blackout` | A energia gasta com ar-condicionado deve triplicar até 2050, e em países como a Índia o resfriamento pode responder por quase metade do pico de eletricidade. | **[IEA-COOL]** | 45% do pico na Índia em 2050, contra 10% hoje. Os alvos são os cinco países que o relatório nomeia — EUA, Oriente Médio, Indonésia, Índia e Brasil —, traduzidos para as regiões do jogo |
| `permafrost-thaw` | O degelo do permafrost pode danificar de 30% a 50% da infraestrutura do Ártico até 2050: 120 mil prédios, 40 mil km de estradas e 9,5 mil km de dutos. | **[HJORT22]** | Mira só `na` e `eu` — o Ártico habitado é Alasca, Canadá e Rússia, e a Rússia está na Europa neste recorte (ver a tabela das 8 macrorregiões) |
| `ocean-acidification` | O oceano está acidificando mais rápido do que em qualquer momento dos últimos 26 mil anos. | **[AR6]** | O CO₂ dissolvido é o motor, e por isso o evento vale para qualquer região e **não** é mitigado por resiliência: nenhuma obra local muda a química do mar |
| `fishery-shift` | No cinturão tropical o potencial de pesca pode cair 40% até meados do século, e ali não há peixe novo para substituir o que migra para os polos. | **[FAO-FISH]** | A assimetria é o ponto: as zonas temperadas recebem o que o trópico perde. Cerca de 1,3 bilhão de pessoas vivem em costas tropicais, muitas delas dependentes da pesca |
| `climate-displacement` | Em 2024 os desastres deslocaram 45,8 milhões de pessoas dentro dos próprios países — o maior número já medido, e 99,5% deles ligados ao clima. | **[IDMC25]** | Maior número desde o início da série, em 2008, e mais que o dobro da média da década. Ciclones responderam por 54% dos deslocamentos e enchentes por 42% |
| `insurance-gap` | Em 2024 os desastres causaram 318 bilhões de dólares de prejuízo, e 57% disso não tinha seguro nenhum. | **[SWISSRE25]** | Perda segurada de 137 bilhões; o rombo sem seguro é de 181 bilhões. É o único evento do jogo cujo dano é **econômico por construção** — ele não quebra nada, ele tira a rede que paga o conserto |

| Evento | Fato no jogo | Fonte | Observação |
|---|---|---|---|
| `heatwave` | O calor extremo que acontecia uma vez a cada dez anos fica cerca de quatro vezes mais frequente a 2 °C de aquecimento. | **[AR6]** | Figura SPM.6. A frequência do evento decenal de calor sobe ~3× a 1,5 °C, ~4× a 2 °C, ~5,5× a 3 °C e ~9× a 4 °C, contra a linha de base 1850–1900 |
| `drought` | Em regiões que já secam, a seca agrícola extrema fica pelo menos duas vezes mais provável a 1,5 °C de aquecimento. | **[AR6]** | Figura SPM.6, e **só para as regiões em secagem** — o próprio AR6 restringe o resultado a elas. Seca agrícola e ecológica é definida por umidade do solo abaixo do 10º percentil de 1850–1900 |
| `flood` | A cada grau de aquecimento a atmosfera segura cerca de 7% mais vapor de água — e é essa água que volta como chuva concentrada. | **[AR6]** | Relação de Clausius-Clapeyron. O AR6 registra que em algumas regiões a taxa de pico de chuva sobe **mais** que os 7%; o jogo usa o valor conservador |
| `coral-bleaching` | Entre 2023 e 2025 o calor do mar branqueou 84% dos recifes do mundo, em 83 países. | **[NOAA-CRW]** | 4º evento global. Os três anteriores atingiram 21% (1998), 37% (2010) e 68% (2014–2017) — é a escalada que dá sentido ao número |
| `cyclone` | A proporção de ciclones tropicais das categorias 3 a 5 aumentou nas últimas quatro décadas. | **[AR6]** | Classificado como *likely* pelo AR6. **É proporção, não número absoluto** — trocar uma coisa pela outra na frase seria erro grave, e é o motivo de ela estar escrita assim |
| `wildfire` | Os incêndios extremos devem aumentar até 14% até 2030 e 50% até o fim do século. | **[UNEP-FIRE]** | Também 30% até 2050. O relatório atribui a mudança a clima **e** uso da terra juntos — o jogo simplifica ao citar só o total |
| `vector-disease` | Em 2024 foram 14,1 milhões de casos de dengue no mundo, doze vezes mais que dez anos antes. | **[IJID25]** | Mais de 100 países; 9 508 mortes. O salto de 2023 para 2024 é de ~7 mi para 14,1 mi. **Notificação não é incidência** — parte do aumento é vigilância melhor, e o artigo diz isso |
| `landslide` | Na Alta Ásia, os deslizamentos disparados por chuva extrema devem ficar 10% mais frequentes até o fim do século. | **[GFDL-LS]** | +7% em 2031–2060 e +10% em 2066–2095, contra 1971–2000. **É um resultado regional**, e o evento do jogo mira quatro regiões — a frase diz "na Alta Ásia" justamente para não generalizar |
| `storm-surge` | A inundação costeira que acontecia uma vez por século deve passar a acontecer ao menos uma vez por ano em mais da metade dos marégrafos até 2100. | **[AR6]** | Entre ~60% (SSP1-2.6) e ~82% (SSP5-8.5) dos marégrafos, conforme o cenário. O jogo usa "mais da metade", que vale nos dois extremos |
| `crop-failure` | Em 2024, oito países tiveram ao menos um milhão de pessoas a mais em insegurança alimentar aguda do que no ano anterior. | **[WMO-SGC24]** | O relatório atribui a eventos climáticos junto com conflito e economia — **não é atribuição climática pura**, e por isso a frase relata o fato sem afirmar a causa |

**O limite que estes dez fatos compartilham.** Nenhum deles alimenta número da simulação: o
`baseWeight`, o `tempThreshold` e o `impact` de cada evento são **balanceamento**, e moram em
`docs/BALANCEAMENTO.md`. É a mesma separação dos fatos das habilidades — o fato é verdade sobre o
mundo, o efeito é verdade sobre o jogo. Um evento que sorteia mais a 2,5 °C do que a 1,5 °C está
imitando uma tendência real; a taxa exata é escolha de desenho.

## Licenças de jogo assumidas

Onde o jogo simplifica ou distorce de propósito, a decisão fica registrada aqui — dita
com todas as letras, não escondida.

- **Tsunami — resolvido em 2026-08-20 (`P3-06`). Não há licença a assumir, porque o tsunami saiu
  do jogo.** Ele estava no conceito original, mas o aquecimento não causa tsunami: a causa é
  geológica. O `docs/GDD.md §2.5` abria duas saídas, e uma terceira apareceu na decisão:
  1. **Manter o nome com a ressalva colada ao evento** — honesto, mas gasta a única frase
     educativa do cartão explicando o que o evento **não** é.
  2. **Apelar ao único elo real** — o tsunami de deslizamento em fiorde, que o degelo destrava
     ao desestabilizar encostas (Groenlândia, 2017; Barry Arm, no Alasca, sob vigilância). É
     verdade, mas é fenômeno polar de nicho, difícil de encaixar em 8 macrorregiões.
  3. **Trocar o evento** — escolhida. Virou **ressaca e maré de tempestade sobre um mar mais
     alto**: entrega a mesma imagem que o conceito queria, a costa engolida pela água, e é
     inteiramente climático.

  **Esta entrada fica no arquivo mesmo sem haver licença a registrar.** Quem abrir o repositório
  e não achar tsunami numa lista que o conceito original prometia precisa achar aqui o motivo —
  e a decisão de recusar o atalho é, ela mesma, o registro que a regra 9 pede.

  O evento substituto entrou no `P7-01` como `storm-surge`, com a fonte fixada na seção anterior.

- **Incerteza do TCRE descartada** — o jogo usa a estimativa central e ignora a faixa provável do
  **[AR6]**. Registrado na tabela de constantes.
- **`cleanShare` mede eletricidade, não a matriz energética inteira** — limite 5.
- **A linha de base do jogo é um cenário escolhido, o SSP3-7.0** — não é previsão do que vai
  acontecer, e sim do que aconteceria sem ação climática nova. Ver a seção anterior.
- **A taxa de crescimento é única para as 8 regiões** — limite 8.
