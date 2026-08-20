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
`src/data/skills.json`.

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

**O que estes fatos deliberadamente não fazem:** nenhum deles alimenta número da simulação. O
efeito mecânico de um nó (quanto ele corta de emissão, quanto custa em PAC) é **balanceamento**, e
mora em `docs/BALANCEAMENTO.md`. Misturar as duas coisas seria dar aparência de ciência a uma
escolha de jogo — o corte de 0,5% ao ano da solar não sai de lugar nenhum do IRENA, é número de
desenho. O fato é verdade sobre o mundo; o efeito é verdade sobre o jogo.

## Fatos dos eventos

Mesma regra para o `fact` de cada evento climático (`docs/GDD.md §2.5`).
Preenchimento: `P7-01`.

**Um aviso para quem for preencher.** O evento de **ressaca e maré de tempestade** entrou no lugar
do tsunami (ver a seção seguinte) e é o que mais pede cuidado na fonte. O achado do **[AR6]** que
ele ilustra é o das cotas extremas de nível do mar: o que hoje é evento de uma vez por século passa
a acontecer ao menos uma vez por ano em boa parte dos marégrafos até 2100. **Fixe o item exato do
Resumo para Formuladores de Políticas antes de escrever a frase** — ele não está fixado aqui de
propósito, porque citar item errado é pior do que não citar.

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

- **Incerteza do TCRE descartada** — o jogo usa a estimativa central e ignora a faixa provável do
  **[AR6]**. Registrado na tabela de constantes.
- **`cleanShare` mede eletricidade, não a matriz energética inteira** — limite 5.
- **A linha de base do jogo é um cenário escolhido, o SSP3-7.0** — não é previsão do que vai
  acontecer, e sim do que aconteceria sem ação climática nova. Ver a seção anterior.
- **A taxa de crescimento é única para as 8 regiões** — limite 8.
