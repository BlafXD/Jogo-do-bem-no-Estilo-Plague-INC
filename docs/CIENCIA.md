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

---

## Constantes de balanceamento

| Valor | Onde aparece | Fonte | Observação |
|---|---|---|---|
| **1,37 °C** acima de 1850–1900 | `balance.json → startTemperature` | **[IGCC25]** | Aquecimento **de origem humana** no ano de 2025. O ano isolado observado oscila com El Niño; o número de origem humana é o que representa a linha de base de uma partida. Era 1,3 antes desta tarefa, sem fonte |
| **40,753 GtCO₂/ano** | `balance.json → startEmissions` | **[OWID-CO2]**, ano de 2023 | **É a soma das 8 regiões, por construção** — não editar sem refazer a soma. Fica 0,66 Gt abaixo do total mundial, e a diferença é aviação e navegação internacionais, explicada nos limites |
| **0,00045 °C por GtCO₂** | `balance.json → tcre` | **[AR6]** | TCRE — resposta transiente ao carbono acumulado. O AR6 dá 0,45 °C por 1000 GtCO₂, com faixa provável de 0,27 a 0,63. **O jogo usa a estimativa central e descarta a incerteza**: sortear dentro da faixa faria a partida ser ganha ou perdida pela constante, não pela decisão do jogador |
| 2025 → 2100 | `balance.json → startYear` e `endYear` | não se aplica | Recorte da partida — decisão de jogo |
| 3,0 °C | `balance.json → loseTemperature` | não se aplica | Limiar de derrota — decisão de jogo, não dado científico. **Ver o achado no fim deste arquivo** |
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
7. **Nada aqui projeta o futuro.** A evolução das emissões dentro da partida é mecânica de jogo
   (`P6-02`, `P3-05`), não previsão científica.

---

## Achado que muda o desenho — para `P6-02` e `P3-05`

**Com os números com fonte, não fazer nada não perde o jogo.** A conta está na conferência 3:
emissão constante leva a 2,75 °C em 2100, abaixo dos 3,0 °C de `loseTemperature`. O jogador
poderia deixar o tempo correr até 2100 sem comprar nada e sobreviver.

Isso não é erro do modelo — é o modelo acertando. O mundo de políticas atuais chega a ~2,8 °C
**[UNEP25]**, e o cenário de catástrofe depende de as emissões **crescerem**. Quem faz as
emissões crescerem no jogo é A Inércia (`docs/GDD.md §2.6`: subsídios que aumentam emissões).
Ou seja: **a linha de base do `P6-02` não pode ser emissão constante**, ou o antagonista deixa de
ser tempero e vira requisito da condição de derrota.

Referência para quem for implementar: chegar a 3,0 °C em 2100 exige média de **48,3 GtCO₂/ano** ao
longo dos 75 anos, cerca de 19% acima do valor de partida. Como chegar lá — crescimento de linha
de base, ação da Inércia, ou baixar o limiar de derrota — é decisão do `P6-02` junto com o
`P3-05`, e vira uma linha em `docs/BALANCEAMENTO.md`.

---

## Fatos das habilidades

Cada nó da árvore carrega um `fact` de uma frase (`docs/GDD.md §2.4`). A fonte de cada
um entra aqui. Preenchimento: `P6-05`.

## Fatos dos eventos

Mesma regra para o `fact` de cada evento climático (`docs/GDD.md §2.5`).
Preenchimento: `P7-01`.

## Licenças de jogo assumidas

Onde o jogo simplifica ou distorce de propósito, a decisão fica registrada aqui — dita
com todas as letras, não escondida.

- **Tsunami** — pendente. Tsunamis são geológicos, não climáticos. A decisão sobre tratar
  como elevação do nível do mar com ressaca extrema, ou marcar como licença explícita,
  é a tarefa `P3-06`.
- **Incerteza do TCRE descartada** — o jogo usa a estimativa central e ignora a faixa provável do
  **[AR6]**. Registrado na tabela de constantes.
- **`cleanShare` mede eletricidade, não a matriz energética inteira** — limite 5.
- **Emissão constante não é cenário de futuro** — ver o achado acima.
