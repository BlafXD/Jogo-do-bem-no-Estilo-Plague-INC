# BALANCEAMENTO.md — histórico de ajustes

> **Todo ajuste de balanceamento vira uma linha aqui**, no formato:
> **valor antigo → novo → por quê → o que mudou no playtest.**
>
> E todo ajuste acontece em `src/data/balance.json`, nunca direto no código
> (proibição da `FORMA-DE-TRABALHO.md §12`).

## Por que este arquivo existe

Sem registro, balanceamento vira chute com memória curta: três semanas depois ninguém
lembra por que `tcre` mudou, alguém "melhora" o valor de volta, e o problema antigo
retorna. Cada linha aqui é uma decisão que não precisa ser redescoberta.

Também é a matéria-prima direta da `APS 2` e da apresentação final — mostrar a evolução
de um número, com o motivo, vale mais que dizer "ajustamos o balanceamento".

## Como registrar

| Campo | Regra |
|---|---|
| **Data** | `AAAA-MM-DD` |
| **Constante** | Chave em `balance.json`, ou o nó da árvore / evento afetado |
| **De → Para** | Valor antigo e novo, com unidade |
| **Por quê** | O problema observado, não a solução |
| **Resultado** | O que mudou no playtest depois do ajuste. Se ainda não foi testado, escrever "não testado" |

## Valores iniciais

Os valores de partida estão em `docs/GDD.md §4` e são explicitamente **não sagrados** —
são chute inicial para o playtest corrigir. Eles não contam como ajuste e não entram na
tabela abaixo; a primeira linha aqui é a primeira mudança em cima deles.

## Ajustes

As rodadas de playtest ainda não aconteceram — saem do `P8-02` (o playtest com 5 pessoas). As seis
linhas abaixo são anteriores a isso: vieram de fonte científica (`P3-01`) e de furos de desenho
achados na conta (`P6-02`, `P6-03` e `P6-05`), não de partida jogada. Por isso todas estão com
**resultado não testado**.

O `P3-02` (a planilha) foi feito em 2026-08-20 e **não gerou linha nenhuma nesta tabela**: ele mede
e registra, e o que ele achou está na seção de achados abaixo, não em ajuste de número.

| Data | Constante | De → Para | Por quê | Resultado |
|---|---|---|---|---|
| 2026-08-18 | `startTemperature` | 1,3 → **1,37 °C** | O valor do GDD não tinha fonte. O `P3-01` fechou a fonte: aquecimento de origem humana em 2025, pelo IGCC 2025 | não testado |
| 2026-08-18 | `startEmissions` | 41 → **40,753 GtCO₂/ano** | Passou a ser a soma das 8 regiões, por construção. Com valores diferentes, o global e o regional discordariam e a simulação erraria em silêncio | não testado |
| 2026-08-18 | `baselineGrowthPerYear` | — → **0,0093 (0,93%/ano)** | **Constante nova.** Com emissão constante a partida terminava em 2,75 °C e não fazer nada não perdia o jogo. A taxa escolhida dobra as emissões até 2100, como o cenário SSP3-7.0 do IPCC | não testado |
| 2026-08-18 | custos da árvore (`skills.json`) | — → **40 / 70 / 140 PAC** por nível | **Árvore nova, 20 nós em 5 ramos.** Dimensionada contra os 750 PAC que a partida entrega: um jogador que compra sempre que pode fecha em **16 dos 20 nós — 65% das 1600 PAC de custo total**, que é exatamente o alvo de "falta ~35%" do `P3-04`. Custo uniforme por nível de propósito; variação por ramo é ajuste de playtest, não chute inicial | não testado |
| 2026-08-18 | corte de emissão total da árvore | — → **5,5% ao ano** | Soma dos 16 nós que cortam emissão. É o número que decide se o jogo é vencível: comprando cedo, leva a partida para a faixa de 2,0–2,4 °C (Prata/Bronze) | não testado |
| 2026-08-18 | `supportFloor` | — → **25 pontos** | **Constante nova.** O `supportDecayPerYear` sozinho levava o apoio das 8 regiões a zero no tick 400 — ano de **2058** — e o `docs/GDD.md §2.7` dá derrota por apoio médio zero: toda partida se perderia ali, fizesse o jogador o que fizesse. O piso trava o desgaste do tempo. Furar para baixo passa a ser trabalho de evento (`P7-01`) e da Inércia (`P7-03`) | não testado |
| 2026-08-19 | `goldTemperature`, `silverTemperature`, `bronzeTemperature` | — → **1,5 / 2,0 / 2,5 °C** | **Constantes novas (`P6-08`).** Os três limiares estavam escritos só em prosa no `docs/GDD.md §2.7` e não existiam em lugar nenhum que o código pudesse ler. Valores idênticos aos do GDD — não é ajuste, é a mudança de um número de prosa para `balance.json` (regra 8) | não testado |
| 2026-08-19 | `netZeroEmissions` | — → **0,5 GtCO₂/ano** | **Constante nova (`P6-08`).** O `§2.7` define vitória como "emissões líquidas ≈ 0", e "≈ 0" não é executável: o corte da árvore é multiplicativo e a curva nunca encosta em zero. Ver o achado abaixo — **com este valor a vitória é inalcançável, e com qualquer outro razoável também** | não testado |

### O achado do `P6-05`: a medalha de Ouro é inalcançável

Com `startTemperature` em 1,37 °C sobram **0,13 °C** até o limiar de Ouro do `docs/GDD.md §2.7`.
Em orçamento de carbono isso é **289 GtCO₂ para 75 anos** — 3,9 Gt por ano de média, contra as
40,8 Gt/ano de onde a partida começa. **Nem a árvore inteira comprada no primeiro mês chega lá:**
o melhor caso do modelo é **1,79 °C**, e para cruzar 1,5 seria preciso um corte total de 15% ao
ano ativo desde o tick 0 — seis vezes a soma dos 20 nós de hoje.

Prata (<2,0) e Bronze (<2,5) estão numa faixa saudável e disputada. Só o Ouro é medalha morta.

**Não foi consertado no `P6-05`, de propósito.** As saídas são todas de desenho, não de
implementação — subir os limiares do `§2.7`, engordar o corte total da árvore, ou aceitar que o
Ouro dependa de algo que a Parte 7 ainda vai trazer. É decisão do `P3-03` (curva de dificuldade)
com o `P3-04`.

### O Bronze sai por cinco milésimos

Medido depois de a árvore ser ligada à simulação (`P6-05`, leva C). Um jogador de referência —
compra sempre que pode, paga primeiro o que gera PAC, depois o mais barato — termina a partida
em **2,495 °C**, contra o limiar de Bronze de 2,5.

**Cinco milésimos não são margem de desenho, são coincidência.** Qualquer mexida em custo de nó,
em `basePointsPerYear` ou no corte de uma habilidade joga a jogada de referência para o outro
lado da medalha. Duas leituras possíveis, e o playtest decide qual:

- se o Bronze *deve* ser o piso de quem joga razoavelmente, a folga precisa ser maior — sobe o
  corte total da árvore ou barateia os nós;
- se o Bronze *deve* ser conquistado, a jogada de referência deveria ficar logo **acima** de 2,5,
  e a medalha viria de jogar melhor que ela.

Hoje o jogo não escolheu nenhuma das duas — caiu em cima da linha por acaso.

Dois sintomas para observar junto: **a última compra da partida acontece em 2099** e não muda
nada, e o apoio médio termina exatamente no `supportFloor`. O primeiro diz que a economia de PAC
tardia não tem para onde ir; o segundo, que a folga de apoio some assim que os eventos (`P7-01`)
começarem a furar o piso.

### O achado do `P6-08`: a vitória do `§2.7` também é inalcançável — não só o Ouro

O `P6-05` já tinha achado que o Ouro é medalha morta. Ao ligar a regra de vitória de verdade, a
sonda do `P6-08` mediu o resto, e **a conclusão é maior do que a anterior**: não é uma medalha que
falta, é a condição de vitória inteira.

Simulação com o engine real, 900 ticks, comprando na melhor ordem conhecida (renda primeiro,
depois corte por eficiência, `corte ÷ custo`):

| Partida | 2100 | Emissões | Nós | Cruzamentos |
|---|---|---|---|---|
| Sem comprar nada | 3,35 °C | 81,6 Gt/ano | 0/20 | 1,5 em 2031 · 2,0 em 2054 · **3,0 em 2089 (derrota)** |
| **Jogo ótimo** | **2,48 °C** | **13,0 Gt/ano** | **16/20**, o último em 2099 | 1,5 em 2031 · 2,0 em 2057 |

**As emissões param em 13 Gt/ano — vinte e seis vezes o limiar de 0,5.** E o teto não é o jogador:
a árvore inteira soma **5,5% ao ano** de corte contra 0,93% de crescimento da linha de base, o que
dá 4,6% de queda líquida. Comprando os 20 nós no tick 0 — impossível, mas serve de limite
superior — a partida terminaria em **~1,2 Gt/ano**, ainda o dobro do limiar. O custo total de 1600
PAC contra os ~1125 que 75 anos rendem garante que ninguém chega nem perto disso.

Duas consequências que já estão no código:

- **Existe um teste que trava este achado** (`tests/outcome.test.ts`, "a vitória por emissões ≈ 0 é
  inalcançável com o balanceamento de hoje"). Ele documenta um problema, não uma qualidade: no dia
  em que um ajuste tornar o zero líquido alcançável, **é ele que deve falhar** e ser reescrito.
- **Chegar a 2100 vivo passou a valer a escala de medalhas**, por decisão tomada no chat em
  2026-08-19 e registrada no `PROGRESSO.md`. Sem isso o jogo não teria vitória nenhuma. O `§2.7`
  do GDD passou a descrever esse desfecho em 2026-08-20.

**Nada de balanceamento foi mexido nesta tarefa**, também por decisão do chat: um ajuste sem
playtest por trás é exatamente o que o risco `R2` do `PLANO.md` e a regra deste arquivo tentam
evitar. O conserto é do `P3-04` (economia de PAC) e do `P8-02`. As três alavancas, em ordem de
menor para maior estrago no resto do desenho:

1. **Baratear a árvore** — mais nós comprados, mesmo corte por nó. Mexe no `P3-04` de frente.
2. **Engordar o corte por nó** — hoje 0,15% a 0,6% ao ano cada. Chegar a zero líquido exigiria
   algo como **15% ao ano** no total, quase três vezes a árvore atual.
3. **Aceitar que o zero líquido não é a vitória deste jogo** e reescrever o `§2.7` em torno da
   temperatura final — que é, de fato, o que a mecânica já ensina, porque o TCRE faz da
   temperatura uma catraca de mão única e transforma **quando** o jogador agiu na decisão central.

### A planilha do `P3-02` e a economia do `P3-04` (2026-08-20)

A partir de hoje a planilha não é escrita à mão: o `tests/planilha.test.ts` roda o **engine de
produção** por 900 ticks sob quatro estratégias e grava `docs/planilha/`. É determinístico, então
`npm test` regrava byte a byte igual — e um `git status` sujo naquela pasta depois de uma rodada é
**o sinal** de que o balanceamento mudou.

#### As quatro partidas, em 2100

| Estratégia | 2100 | Emissões | Nós | PAC arrecadado | Desfecho |
|---|---|---|---|---|---|
| `nada` — não faz nada | **3,35 °C** | 81,6 Gt/ano | 0 de 20 | 750 | derrota em **2089** |
| `tarde` — acorda em 2060 | 2,85 °C | 22,2 Gt/ano | 14 de 20 | 950 | sem medalha |
| `sociedade-cedo` — investe em PAC antes de cortar | 2,48 °C | 12,6 Gt/ano | 15 de 20 | 1047 | Bronze |
| `melhor` — corta cedo, ignora Sociedade | **2,44 °C** | 13,1 Gt/ano | 12 de 20 | 750 | Bronze |

**O aceite do `P3-02` está cumprido**: entre não fazer nada e jogar bem há **0,91 °C** de
diferença, e a curva se abre visivelmente a partir de 2040. O gráfico está em
`docs/planilha/curvas.html`.

#### Achado 1 — o ramo Sociedade é uma armadilha

`sociedade-cedo` arrecada **297 PAC a mais**, compra **3 nós a mais** e termina com **emissão
menor** que `melhor` — e ainda assim acaba **0,04 °C mais quente**. A varredura mede o efeito
inteiro (`economia-quando-comprar.csv`), e ela é **monótona**: quanto mais tarde os dois nós de PAC
entram, melhor a partida acaba, e nunca comprá-los é o melhor de todos.

| Sociedade comprada após | 2100 | PAC arrecadado |
|---|---|---|
| 0 cortes (primeira coisa) | 2,4811 °C | 1047 |
| 4 cortes | 2,4702 °C | 1007 |
| 8 cortes | 2,4558 °C | 955 |
| 16 cortes (por último) | 2,4482 °C | 867 |
| **nunca** | **2,4400 °C** | 750 |

A causa é a catraca do TCRE, não um erro de conta. `climate-education` + `treaties` custam 110 PAC,
que a 10 PAC/ano são **onze anos** em que nenhum corte foi comprado. A temperatura integra a
emissão ao longo do tempo, então esse CO₂ fica no ar para sempre; os 5 PAC/ano que os dois nós
devolvem só terminam de se pagar perto de 2060, e o que eles compram depois disso opera por poucos
anos. **Um ramo inteiro dos cinco, 320 PAC de conteúdo, é hoje um custo puro para quem joga para
ganhar.**

Vale dizer o que isto **não** é: os nós não estão "quebrados". Numa partida mais longa eles venceriam
— `sociedade-cedo` já termina 2100 emitindo menos. É o horizonte de 75 anos que os condena, e o
horizonte é o jogo.

#### Achado 2 — a economia de PAC cumpre o alvo do `P3-04`, mas só na estratégia pior

A árvore custa **1600 PAC**. A entrada de base é 10 PAC/ano, ou **750 PAC** nos 75 anos.

| Cenário | Arrecadado | % da árvore | Falta |
|---|---|---|---|
| Sem tocar em Sociedade | 750 | 46,9% | **53,1%** |
| Com os dois nós de PAC, comprados cedo | 1047 | 65,5% | **34,5%** |

O `PLANO.md` pede "falta ~35% para comprar tudo (a escolha precisa doer)". **O alvo é atingido —
34,5% — pela linha `sociedade-cedo`.** Só que essa é justamente a linha que joga pior. Quem joga
para ganhar fica com 53% da árvore fora de alcance. A escolha dói dos dois jeitos; a questão aberta
é se doer 53% é doer demais.

**Consequência prática:** os quatro nós de 140 PAC — 560 PAC, 35% do custo da árvore — são
**inalcançáveis** sem o ramo Sociedade. Rodar a melhor ordem sem eles dá exatamente o mesmo
resultado (2,4400 °C), porque o dinheiro acaba antes.

#### Achado 3 — a partida está decidida em 2060, e ainda faltam 40 anos

Os anos de cruzamento saem iguais em todas as estratégias na primeira metade:

| Estratégia | cruza 1,5 °C | cruza 2,0 °C | cruza 2,5 °C |
|---|---|---|---|
| `nada` | 2032 | 2055 | 2074 |
| `tarde` | 2032 | 2055 | 2077 |
| `sociedade-cedo` | 2032 | 2058 | — |
| `melhor` | 2032 | 2060 | — |

**Ouro morre em 2032, sempre, faça o jogador o que fizer** — o `P6-05` suspeitava, e agora está
medido. **Prata morre entre 2055 e 2060.** Depois disso a única pergunta que resta é Bronze ou nada,
e ela se decide por volta de 2060. Os últimos 40 anos da partida — mais da metade do tempo de tela,
uns 10 minutos a 1x — não têm mais nada em jogo.

Isso é insumo direto do `P3-03`, que foi feito no mesmo dia e mediu a coisa direito: a medalha
trava em **2055** e a tensão zera em **2090**. A leitura completa e a especificação do conserto estão
em `docs/CURVA-DE-DIFICULDADE.md`. É o problema de desenho mais sério que a planilha achou. As três medalhas ficam espremidas numa janela estreita: o melhor
jogo possível fica **0,06 °C** abaixo do teto do Bronze, e uma ordem de compra ruim tirada ao acaso
já perde a medalha (2,53 °C). Entre "jogou bem" e "jogou mal" há 0,09 °C; entre "jogou" e "não
jogou", 0,91 °C. **O jogo distingue muito bem agir de não agir, e quase nada agir bem de agir mal.**

#### Nada foi ajustado — de novo, e de propósito

Nenhum número de `balance.json` mudou nesta tarefa. Os três achados acima são material do `P3-03`
(curva de dificuldade), do `P3-05` (a Inércia, que pode devolver função ao ramo Sociedade) e do
`P8-02` (a rodada depois do playtest). Mexer agora seria ajustar com base em simulação sem jogador
— o risco `R2` do `PLANO.md`.

As alavancas que a planilha deixa medidas, para quando a hora chegar:

1. **Dar ao ramo Sociedade um efeito que a simulação de hoje não consegue medir.** É a saída mais
   promissora e não mexe em número nenhum: o `pointsPerYear` compete de frente com corte de
   emissão e perde. Se o apoio público e a Inércia passarem a **ameaçar a partida** — que é o
   `P7-01` e o `P7-03` —, comprar Sociedade deixa de ser luxo. Hoje o `supportFloor` trava o apoio
   em 25 e nada o empurra para baixo, então o ramo defende contra um perigo que não existe.
2. **Subir `basePointsPerYear`** de 10 para algo entre 13 e 15, que põe a árvore inteira ao alcance
   de quem joga bem sem depender de Sociedade. Custa a tensão do corte de escopo — "nenhuma partida
   tem pontos para comprar tudo" é fantasia central no `GDD §1`.
3. **Baratear os nós de 140**, que hoje são conteúdo que quase ninguém vê.
4. **Alargar a faixa das medalhas**, ou mover o teto do Bronze. É o conserto do Achado 3 com a
   menor mudança, mas trata o sintoma: a partida continuaria decidida em 2060.

### Os eventos do `P7-01` (2026-08-20)

Dez eventos entraram, e com eles o primeiro sorteio da partida. Os números abaixo são **novos**,
não ajustes de valores existentes — mas mudam a partida inteira, e por isso ficam registrados aqui.

#### O que os eventos custam

| Medida | Antes do `P7-01` | Depois |
|---|---|---|
| Nós que a jogada gulosa alcança | 16 de 20 (65% do custo) | **15 de 20 (56%)** |
| Apoio médio em 2100, jogando bem | 25,0 (o piso, para sempre) | **~7** |
| Derrota por apoio | inalcançável | **alcançável** |
| Melhor jogada conhecida | 2,4400 °C · Bronze | **2,4652 °C · Bronze** |
| Quem não faz nada | derrota por temperatura em **2089** | derrota por temperatura em **2089** |

O ano de 2089 sobreviveu intacto, e isso não é sorte: os eventos pressionam o apoio, não a
temperatura, então o aceite do `P6-02` continua medindo o que sempre mediu.

#### A frequência foi desenhada como rampa

O peso segue a fórmula do `§2.5` — `baseWeight × (1 + eventWeightPerDegree × (T − limiar))` — com
`eventWeightPerDegree` em 1,8, que já estava no `balance.json` e nunca tinha sido lido.

| Temperatura | Eventos destravados | Eventos por ano |
|---|---|---|
| 1,37 °C (início) | 1 de 10 | 0,45 |
| 1,9 °C | 8 | 3,3 |
| 2,45 °C | 10 | 5,8 |
| 3,0 °C | 10 | 8,2 |

São ~175 eventos numa partida inteira. A primeira década é quase silenciosa de propósito: dá ao
jogador tempo de agir antes de o mundo começar a cobrar.

#### Duas afinações feitas na medição, e por quê

- **O impacto de apoio caiu para ~40% do primeiro chute.** Na primeira versão o apoio médio chegava
  a zero em **toda** estratégia e a partida bem jogada morria em 2096 — o jogo deixava de ser
  vencível. O dreno tinha de caber nos ~50 pontos que separam o apoio inicial da dissolução, e
  passou a caber com folga fina: hoje quem joga bem termina entre 6 e 12, em cinco seeds testadas.
- **A resiliência ganhou um piso de 0,25 no fator de dano.** As 8 regiões começam com 50 de
  resiliência e a árvore inteira oferece +50, o que levaria a 100 — e `1 − 100/100` é **dano zero**.
  Sem o piso, o último nó de resiliência viraria botão de imunidade. Com ele, investir tudo corta o
  dano pela metade em relação ao começo, que é recompensa forte sem ser interruptor. É também a
  leitura honesta do que adaptação faz: dique e alerta precoce reduzem estrago, não cancelam
  enchente.

#### O achado que não é sobre eventos: a colisão com o `P3-05`

A especificação da Inércia foi verificada **antes** de os eventos existirem, e o próprio
`docs/INERCIA.md` fechou pedindo que quem fizesse o `P7-01` rodasse a verificação de novo. Rodou, e
ela quebrou:

| Estratégia | Só com eventos | Com eventos **e** a Inércia proposta |
|---|---|---|
| Corta bem, ignora Sociedade | 2,4652 °C · **Bronze** | 2,4819 °C · **Bronze** |
| Compra Sociedade e contém | — | 2,5197 °C · **sem medalha** |

**Não é bug de nenhum dos dois sistemas: é o orçamento de dano do jogo estourando.** A melhor
jogada termina a 0,06 °C do teto do Bronze, e eventos mais Inércia consomem mais que isso. Pior, a
inversão que o `P3-05` tinha conseguido — "Sociedade deixa de ser armadilha e vira licença para
lutar" — **desapareceu**: com eventos em cena, comprar o ramo volta a custar a medalha.

Os três testes que registram isso estão em `tests/inercia.test.ts`, escritos invertidos e marcados
com `COLISÃO`. **No dia em que o balanceamento abrir espaço, é para eles falharem.**

O conserto mais barato medido é **mover o teto do Bronze de 2,5 para ~2,55 °C**, que devolve
espaço para os dois sistemas sem tocar em árvore, em custo ou em clima. É mudança de balanceamento
sem playtest por trás, ou seja, o risco `R2` — fica para o `P8-02`, com este parágrafo como o
registro de que o problema é conhecido, medido e tem uma saída identificada.

### A auto-pausa do `P7-02` (2026-08-23)

O `P7-02` precisava de uma definição de "evento crítico" para saber quando parar o relógio, e o
`ClimateEvent` do `§3` não tem campo de gravidade — inventar um reescreveria o contrato, que o
`§12` proíbe. A gravidade passou a sair do `impact.support`, com o limiar novo
**`criticalEventSupport`** no `balance.json`.

**Por que o apoio, e não a soma dos três impactos.** É o único eixo do `impact` ligado a uma
condição de fim: o `§2.7` dissolve a agência quando o apoio médio zera. A economia, hoje, não é
lida por regra nenhuma, e o PAC perdido volta no mês seguinte. Crítico quer dizer *ameaça encerrar
a partida* — não "tem números grandes". (A soma daria o mesmo par de eventos, mas por coincidência,
sem justificativa que sobreviva a uma mudança no `events.json`.)

**O valor foi contado, não escolhido.** Uma partida tem **279 eventos** em 22,5 minutos — um a
cada 4,8 segundos. Quantos deles parariam o jogo, por limiar, na melhor jogada medida:

| `criticalEventSupport` | Eventos que pausam | Uma pausa a cada | Veredito |
|---|---|---|---|
| 2,0 | 52 | ~26 s | o jogo vira um soluço |
| **2,5** | **10** | **~2,2 min** | **escolhido** |
| 3,0 | 1 | a partida inteira | a mecânica não se paga |

Com 2,5, os críticos são a **ressaca** (`impact.support` 2,5) e o **colapso de safra** (3,0). Os
dois têm `tempThreshold` de 2,0 e 2,2 °C, então **nenhuma interrupção acontece antes de o mundo
passar de 2 °C** — a década silenciosa que o `P7-01` construiu de propósito continua silenciosa, e
o jogo só passa a interromper quando tem motivo. Numa partida sem compra nenhuma, que morre por
temperatura em 2089, são **17 pausas**.

**Fragilidade conhecida.** Se um dia o balanceamento tornar a Prata alcançável, uma partida que
fique abaixo de 2 °C nunca verá uma auto-pausa. É defensável — não houve catástrofe para
interromper ninguém — mas é uma consequência a lembrar, não um acidente.

Os dois testes que travam isso são o `ACEITE` do `tests/event-cards.test.ts` (a contagem de pausas
numa partida inteira) e o `isCritical` do `tests/events.test.ts` (a lista dos dois eventos). Mexer
no limiar faz os dois falharem — **é o alarme de que o número mudou quantas vezes o jogo
interrompe quem está jogando**, que é a decisão mais visível desta constante.

| Data | Constante | De → Para | Por quê | Resultado |
|---|---|---|---|---|
| 2026-08-23 | `criticalEventSupport` | — → 2,5 | O `P7-02` precisava de um limiar de gravidade e o `§3` não tem campo para isso | Não testado com jogador. Medido: 10 pausas na melhor jogada, 17 em quem não compra nada |

### A Inércia implementada, e a colisão resolvida (2026-08-23)

O `P7-03` levou a especificação do `P3-05` para `src/engine/inertia.ts`. Ao medir contra o engine
real — com os eventos do `P7-01` em cena — apareceu que **a colisão registrada era pior do que o
registro dizia**.

**Os três testes `COLISÃO` só verificavam temperatura e medalha, nunca a causa da derrota.** Com os
números da especificação aplicados, o desfecho de cada estratégia era:

| Estratégia | Com `disinformationBite: 1.0` |
|---|---|
| Compra Sociedade e contém | **dissolvida em 2098** |
| Corta bem, pula Sociedade | **dissolvida em 2083** |
| Sociedade mas nunca contém | **dissolvida em 2091** |
| Larga tudo | dissolvida em 2089 |

Nenhuma estratégia sobrevivia. Não era "a melhor jogada perde a medalha": era o jogo invencível.

#### O apoio é o gargalo, e é ele que não cabia

Sem Inércia nenhuma, a melhor jogada já termina 2100 com **11 pontos** de apoio médio — os eventos
consomem quase todo o pool sozinhos. A desinformação a 1,0 tira cerca de 0,7 ponto por região ao
ano, o que dá ~52 pontos ao longo do século: mais do que as regiões têm para dar.

A varredura, em **cinco seeds**, com a melhor jogada e com quem pula Sociedade:

| `inertiaDisinformationBite` | Melhor jogada | Quem pula Sociedade |
|---|---|---|
| 1,0 (especificado) | morre 2098 | morre 2083 |
| 0,7 | vive, apoio 0,3–1,3 | morre 2087–2089 |
| **0,5** | **vive, apoio 1,5–3,0** | **morre 2094–2095** |
| 0,4 | vive, apoio 2,4–4,1 | **vive** — a armadilha volta |

**0,5 é a única faixa que entrega as duas coisas ao mesmo tempo**: a melhor jogada sobrevive nas
cinco seeds, e quem pula o ramo Sociedade é dissolvido nas cinco. Abaixo de 0,4 a inversão que o
`P3-05` construiu desaparece de novo; em 0,7 o jogador que faz tudo certo termina com menos de um
ponto de apoio, que é margem nenhuma para quem joga pior que a política simulada.

#### A medalha não era problema da Inércia

Medido com `inertiaSubsidyBite: 0`, a melhor jogada ainda termina em **2,5101 °C**; e **sem Inércia
nenhuma**, comprar o ramo Sociedade já dava **2,5057 °C**. O subsídio contribui com 0,0096 °C. Ou
seja: a armadilha do `P3-04` — comprar Sociedade custa a medalha — é anterior ao `P7-03` e não se
conserta afinando o antagonista.

Por isso o **teto do Bronze foi movido de 2,5 para 2,55 °C**, que era o conserto que este arquivo já
tinha medido e adiado. Sem ele, implementar o `P7-03` deixaria o jogo sem nenhum caminho para
medalha — hoje "corta bem, pula Sociedade" ainda leva Bronze.

#### O que se ganhou, e o que se pagou

| | Antes do `P7-03` | Depois |
|---|---|---|
| Melhor jogada | 2,4652 °C · Bronze | 2,5197 °C · **Bronze, viva** |
| Quem pula Sociedade | melhor jogada, Bronze | **dissolvida em 2095** |
| Janela de perdão fecha em | 2055 | **depois de 2065** |
| Derrota por apoio | só por evento | **alcançável por estratégia** |

**O preço, medido e registrado:** com o teto em 2,55 a faixa do Bronze ficou larga, e **de ~2070 em
diante largar o controle também termina em Bronze** — continuar jogando e desistir separam-se por
0,005 °C. O `tests/inercia.test.ts` tem esse achado escrito como teste. O conserto não é
enfraquecer a Inércia; é a escala de medalhas, e ela precisa de playtest (`P8-02`).

| Data | Constante | De → Para | Por quê | Resultado |
|---|---|---|---|---|
| 2026-08-23 | `inertiaGrowthPerYear` | 2 → 0,5 | Com 2 a Inércia satura em 100 antes de 2075 contra quem não faz nada — o antagonista venceria sozinho | Não testado com jogador. Pico de 62–72 na melhor jogada |
| 2026-08-23 | `inertiaDisinformationBite` | (spec 1,0) → 0,5 | Com os eventos do `P7-01` em cena, 1,0 dissolve a agência em toda estratégia | Não testado com jogador. Medido em 5 seeds: melhor jogada viva, quem pula Sociedade morre |
| 2026-08-23 | `bronzeTemperature` | 2,5 → 2,55 | Sem isso nenhuma estratégia alcança medalha; a melhor jogada termina em 2,5197 °C | Não testado com jogador. Devolve o Bronze — e alarga a faixa demais, ver acima |

### A árvore de 40 nós e a passagem única do `REF-09` (2026-10-06)

**A maior mudança de balanceamento desde que o jogo existe**, e a primeira que mexeu na árvore
inteira de uma vez. Veio junto do `REF-07`, que realizou os ~40 nós que o `docs/GDD.md §2.4` sempre
previu e que o corte do modo solo adiava.

#### Os números, antes e depois

| | antes (20 nós) | depois (40 nós) |
|---|---|---|
| Nós | 20, 4 por ramo | **40, 8 por ramo** |
| Custo total da árvore | 1600 PAC | **6300 PAC** (1260 por ramo, igual em todos) |
| Corte somado da árvore | 5,5% ao ano | **12,25% ao ano** |
| `basePointsPerYear` | 10 | **46** |
| Arrecadação de 75 anos, jogando bem | ~1045 PAC | **~3806 PAC** |
| Falta para comprar tudo | 31% | **39,6%** |
| Nós comprados, jogando bem | 13 de 20 | **22 de 40** |
| Melhor jogada medida | 2,5196 °C, bronze | **1,9715 °C, prata** |
| Emissões em 2100, jogando bem | 15,4 Gt/ano | **1,4 Gt/ano** |

| Data | Constante | De → Para | Por quê | Resultado |
|---|---|---|---|---|
| 2026-10-06 | custos dos 20 nós novos | — → **150 / 220 / 220 / 350 PAC** | Segundo losango de cada ramo. Mais caros que o primeiro (40/70/70/140) porque o `§2.4` pede que os níveis 3–4 sejam "caros e transformadores". **Cada ramo custa exatamente 1260 PAC**, para escolher entre ramos nunca ser sobre preço | não testado |
| 2026-10-06 | `basePointsPerYear` | 10 → **46** | Com a árvore em 6300 PAC e a renda antiga, faltavam **83,4%** para comprá-la: a árvore viraria enfeite e o alvo de "~35%" do `P3-04` ficaria fora de alcance. 46 põe a falta em 39,6%, dentro da faixa de 25–45% que o `tests/planilha.test.ts` cobra | não testado |
| 2026-10-06 | `containCost` | 30 → **140** | Acompanha a renda. O que define a dificuldade de conter não é o número, é **quantos anos de arrecadação ele custa**: 3 anos antes, 3 anos depois | não testado |
| 2026-10-06 | `containDiscountPerNode` | 0,2 → **0,1** | O ramo Sociedade dobrou para 8 nós, e com 0,2 a conta passava a dar negativo: **a contenção ficava de graça a partir do sexto nó**. O `src/engine/inertia.ts` tinha previsto isso por escrito desde o `P7-03`. Com 0,1, oito nós dão 70% de desconto — o mesmo teto que quatro nós davam com 0,2 | não testado |
| 2026-10-06 | `impact.points` dos 10 eventos | 0/1/2/3 → **0/5/9/14** | Escalados pelo mesmo fator 4,6 da renda. Sem isso, a mordida de PAC dos eventos — que o `P7-01` mediu valendo **um nó inteiro** — teria caído para um quinto do peso desenhado, em silêncio | não testado |

#### Por que 46, e não 50

A varredura mediu 30, 40, 44, 46, 48 e 50. **O teto é 46, e quem o define não é a economia de PAC,
é a lição do `P7-03`:** a estratégia `melhor` — cortar na melhor ordem e ignorar o ramo Sociedade —
precisa **perder**. É ela que carrega o dilema do `§2.6`.

| `basePointsPerYear` | falta | `melhor` (pula Sociedade) | melhor jogada |
|---|---|---|---|
| 30 | 58,8% — fora da faixa | dissolvida em 2095 ✔ | 2,0968 °C, bronze |
| 40 | 46,8% — fora da faixa | dissolvida em 2096 ✔ | 2,0059 °C, bronze |
| 44 | 42,0% ✔ | dissolvida em 2096 ✔ | 1,9769 °C, prata |
| **46** | **39,6% ✔** | **dissolvida em 2097 ✔** | **1,9715 °C, prata** |
| 48 | 37,2% ✔ | **sobrevive** ✘ | 1,9531 °C, prata |
| 50 | 34,8% ✔ | **sobrevive** ✘ | 1,9428 °C, prata |

Em 48 a falta fica mais perto do alvo de "~35%" do `P3-04`, e é por isso que o número **não** foi
escolhido: com ela, quem ignora o ramo Sociedade passa a chegar vivo a 2100, e o `§2.6` deixa de
ser um dilema para virar uma preferência.

#### Cada personagem tem caminho para medalha

Era o aceite explícito do `REF-09`. Jogando bem — Sociedade primeiro, corte na melhor ordem,
contenção acima de 70 —, **os cinco chegam à prata**, e nenhum deles trivializa a partida:

| Personagem | Ramo | Temperatura final | Medalha |
|---|---|---|---|
| (nenhum, baseline) | — | 1,9715 °C | prata |
| Ana Luiza | Energia | 1,9305 °C | prata |
| Carlos Mendes | Natureza | 1,9743 °C | prata |
| Ricardo Souza | Indústria | 1,9448 °C | prata |
| Juliana Almeida | Sociedade | 1,9482 °C | prata |
| Marina Costa | Transporte | 1,9579 °C | prata |

A distância entre o melhor e o pior personagem é de **0,044 °C** — menos de um quinto da faixa da
prata. O buff muda a partida sem decidi-la, que é o que o `REF-05` tinha anotado como provisório.

#### A vitória do `§2.7` saiu do papel

O achado do `P6-08` dizia que a vitória por zero líquido era **inalcançável**, e o
`tests/outcome.test.ts` carregava um teste que pedia, por escrito, para falhar no dia em que
deixasse de ser. **Falhou.** Com 12,25% ao ano de corte, comprar a árvore inteira leva as emissões
a **0,005 Gt/ano** — abaixo do limiar de 0,5 — e o desfecho é `netZero`.

O que segura a vitória agora é **o bolso, não a física**: a melhor estratégia medida termina em
**0,77 Gt/ano**, perto do limiar e ainda acima dele. O teste foi reescrito para travar as duas
metades: o teto existe, e ninguém chegou lá.

#### O preço, registrado: a janela de perdão encolheu

**Este é o custo da passagem, e ele não foi consertado.** O `P3-05` tinha medido que, com a Inércia
em cena, largar o controle continuava fatal até depois de **2065** — contra os 2055 que o
`docs/CURVA-DE-DIFICULDADE.md` mediu sem ela. Com 40 nós e 46 PAC/ano, **largar em 2060 já não
mata**:

| Largar o controle em | Desfecho | Temperatura final |
|---|---|---|
| 2050 | dissolvida por apoio | 2,0139 °C |
| 2055 | dissolvida por apoio | 1,9943 °C |
| 2060 | **sobrevive** | 1,9802 °C |
| 2080 | sobrevive | 1,9717 °C |

A Inércia não enfraqueceu — nenhuma constante dela mudou. O que mudou é o jogador chegar a 2060
com muito mais apoio comprado, e o colchão absorver a desinformação. **Subir o
`inertiaDisinformationBite` para 0,8 foi medido e descartado:** com ele a melhor jogada também é
dissolvida, que é exatamente a parede que o `docs/INERCIA.md` encontrou quando propôs 1,0.

É o mesmo problema que o `P7-03` já tinha registrado como "a medalha decide cedo", agora dez anos
mais cedo. **É do `P8-02`**, e a alavanca provável não é a Inércia: é a escala de medalhas do
`§2.7`, que precisa de playtest antes de mexer.

### Os 20 eventos e o primeiro alvo regional (2026-10-06, mais tarde)

Dois itens do Gelo, feitos depois de o `P8-01` e o `P8-02` fecharem. **Nenhuma constante do
`balance.json` mudou** — a passagem inteira foi em `skills.json` e `events.json`.

| Data | Constante | De → Para | Por quê | Resultado |
|---|---|---|---|---|
| 2026-10-06 | `baseWeight` dos 10 eventos antigos | **dividido por 2** | O `drawEvent` usa a **soma** dos pesos como eventos por ano. Dobrar a lista sem mexer neles dobraria a pressão sobre o jogador, e o pedido do Gelo era mais **variedade**, não mais dano. Antes 2,370/ano, depois 2,355 | não testado |
| 2026-10-06 | 10 eventos novos | — → **pesos de 0,07 a 0,17** | Ocupam a metade que a divisão liberou. Mais pesados em cima (limiar baixo), mais leves embaixo, como a rampa que o `P7-01` desenhou | não testado |
| 2026-10-06 | `mangroves` → `resilience` | 10 global → **14 em 5 regiões** | Primeiro efeito com alvo regional do jogo. Realiza o `§2.3` e **destrava um galho do engine que era código morto**: os dois `target === 'global' || target === regionId` nunca rodavam, e nenhum teste os alcançava | não testado |

#### O que os 20 eventos mudaram sem ninguém pedir

| | antes (10 eventos) | depois (20) |
|---|---|---|
| Eventos por ano | 2,370 | **2,355** |
| Eventos críticos (pausam o relógio) | 2 | **2** |
| `melhor` (pula Sociedade) | dissolvida em 2097 | **dissolvida em 2092** |
| `sociedade-cedo` (compra Sociedade, nunca contém) | **sobrevive** | **dissolvida em 2099** |
| `contencao` | sobrevive, prata | sobrevive, prata |
| Melhor jogada | 1,9715 °C | 1,9822 °C |

**A linha do meio é a mais importante, e foi um ganho de graça.** Comprar o ramo Sociedade e nunca
conter deixou de bastar: agora essa partida também é dissolvida, um ano antes do fim. O `§2.6` diz
que o ramo é "a licença para lutar", e até aqui a licença sozinha salvava — **agora ela só autoriza
a luta.** Nenhuma constante da Inércia foi tocada; o que mudou é que mais tipos de evento espalham
o dano por mais regiões, e o apoio não tem onde se recompor.

#### E a janela de perdão recuperou metade do que o `REF-09` tinha perdido

| Largar o controle em | antes dos 20 eventos | depois |
|---|---|---|
| 2055 | dissolvida | dissolvida |
| 2060 | **sobrevive** | **dissolvida** |
| 2065 | sobrevive | sobrevive |

Era o débito que a passagem do `REF-09` deixou escrito acima, e metade dele fechou **sem tocar na
Inércia**. O que sobra — largar em 2065 e ainda levar prata — continua de pé e continua sendo do
`P8-02`.

### As conquistas do `CONQ-01`: seis que sobraram de oito (2026-10-14)

Duas constantes novas, e **nenhuma constante antiga tocada**. O que importa aqui não são as duas
linhas da tabela: é a varredura que as escolheu, e que **reprovou quatro das oito conquistas
propostas no chat**. A régua foi a cicatriz do `P6-05`/`P7-03` — uma escala de medalhas publicada
sem ninguém a alcançar. Um troféu impossível se parece com um troféu difícil, e a prateleira é
onde esse erro é mais barato de cometer.

| Data | Constante | De → Para | Por quê | Resultado |
|---|---|---|---|---|
| 2026-10-14 | `turningPointYear` | — → **2040** | Ano antes do qual a curva precisa virar para a conquista "Ponto de Virada". O ano da virada **é** o ano em que o jogador começa a gastar (varredura abaixo), então a constante é literalmente "até quando dá para enrolar". 2040 fica no meio da janela: separa quem agiu na primeira metade de quem acordou tarde | não testado |
| 2026-10-14 | `calmInertia` | — → **40** | Nível abaixo do qual a partida terminou com a Inércia contida. O melhor valor medido numa partida jogada até o fim é **24,5**, e as partidas sem contenção terminam em **100** — 40 cabe folgado entre os dois | não testado |

#### A varredura que reprovou quatro conquistas

Cinco planos jogados até onde a partida de fato para (derrota ou 2100), na seed de referência:

| | desfecho | °C final | emissões | Inércia | menor apoio | nós |
|---|---|---|---|---|---|---|
| não faz nada | dissolvida em 2089 (temperatura) | 3,365 | 83,0 | 29,1 | 0 | 0 |
| só corta | dissolvida em 2092 (apoio) | 1,950 | 0,91 | 100 | 0 | 25 |
| compra Sociedade, nunca contém | dissolvida em 2099 (apoio) | 1,971 | 0,86 | 100 | 0 | 28 |
| acorda em 2060 e contém | bronze | 2,547 | 4,09 | 39,4 | 8,46 | 23 |
| corta, aprofunda Sociedade e contém | **prata** | 1,985 | 1,85 | 36,0 | **7,11** | 24 |

E a melhor partida que a varredura achou, com os cinco personagens e quatro limiares de contenção:
**1,962 °C** (Ana Luiza, ramo Sociedade antes de cortar, contendo acima de 50).

**As quatro reprovadas, e por quê:**

| Conquista proposta | Veredicto |
|---|---|
| **Ouro** (< 1,5 °C) | **Inalcançável.** A melhor partida medida para em 1,962 °C. Seria o `P7-03` de novo, agora em forma de troféu |
| **Zero líquido** (≤ 0,5 Gt/ano) | **Inalcançável.** A melhor emissão final medida é 0,86 Gt/ano — e ela acontece numa partida **dissolvida**. O `§2.7` já registra que a vitória está "no horizonte, e ninguém chegou lá ainda"; o que não cabe é anunciá-la como troféu |
| **A casa toda** (os 8 nós de um ramo) | **Inalcançável.** O máximo medido é 7 de 8, e só com o desconto da Juliana no ramo dela. Ninguém arrecada os 6300 PAC da árvore |
| **Escudo erguido** (resiliência média alta) | **Automática.** Toda partida que compra qualquer coisa termina com 77,8 de resiliência média, contra 50 de quem não faz nada. Não separa ninguém de ninguém |

**O ouro e o zero líquido ficam fora por balanceamento, não por desenho.** No dia em que a árvore
ou a arrecadação os puserem ao alcance, as duas conquistas entram sem mexer em mais nada — a lista
é um arquivo de dados e a condição é uma função.

#### O ano da virada é o ano em que o jogador acorda

Oito partidas idênticas, mudando só o ano em que o jogador começa a gastar (contendo acima de 40):

| Começa em | Curva vira em | Desfecho | °C final |
|---|---|---|---|
| 2025 | 2027 | prata | 1,985 |
| 2030 | 2030 | bronze | 2,010 |
| 2035 | 2035 | bronze | 2,073 |
| 2040 | 2040 | bronze | 2,147 |
| 2045 | 2045 | bronze | 2,232 |
| 2050 | 2050 | bronze | 2,340 |
| 2055 | 2055 | bronze | 2,450 |
| 2060 | 2060 | bronze | 2,547 |

A coluna do meio não é coincidência: a emissão sobe sozinha pela linha de base, então o primeiro
mês de compra **é** o pico. É o que faz do `turningPointYear` uma pergunta sobre demora, e é por
isso que a conquista dele é a mais fácil da lista, de propósito.

**E há um achado de balanceamento aqui que não é das conquistas:** com contenção a partir de 40,
**começar em 2060 ainda rende bronze**. A escala de medalhas continua larga demais na ponta de
baixo, que é exatamente o débito que o `P8-02` deixou escrito. A diferença é que agora há uma
tabela medindo o tamanho dele.

#### Um palpite meu que a medição desmentiu

Eu tinha anotado que **conter cedo dominava conter tarde**. Não domina. Com a mesma lista de
desejos, variando só o limiar:

| Contém acima de | °C final | Inércia final | contenções | menor apoio |
|---|---|---|---|---|
| 40 | 1,991 | 48,3 | 12 | 1,31 |
| 50 | 1,988 | 53,0 | 12 | 0 |
| 60 | 1,985 | 58,6 | 12 | 0 |
| 70 | 1,982 | 62,6 | 12 | 0 |
| nunca | 1,971 | 100 | 0 | **dissolvida em 2099** |

O limiar quase não muda nada — nove milésimos de grau entre os extremos, e sempre as mesmas 12
contenções, porque o que limita é o bolso, não a política. **O que separa as partidas é a
profundidade no ramo Sociedade:** trocar os 2 nós da lista histórica pelos 8 do ramo inteiro leva a
menor região de 1,31 para 7,11 de apoio. O `§2.6` chama o ramo de "licença para lutar" — a
varredura mostra que ele é também o que sustenta o apoio enquanto a luta dura.

### O que observar no primeiro playtest

O `baselineGrowthPerYear` é o número mais provável de mudar. Hoje o jogador que não faz
nada cruza os 3 °C em **2089** — sobrevive a 85% da partida antes de perder. Se o playtest
mostrar que a ameaça demora demais a aparecer, o caminho é **subir a taxa**, não baixar o
`loseTemperature`: o limiar de 3 °C é o que dá sentido ao jogo, e a taxa é o que dá ritmo.

O `supportFloor` é o segundo candidato. Ele decide **quanto espaço o apoio tem para cair**
antes de a agência ser dissolvida: com 25, uma região absorve 25 pontos de dano de evento
acumulado antes de zerar. Se o playtest mostrar que a derrota por apoio nunca chega perto de
acontecer, o caminho é baixar o piso. Se acontecer cedo e sem o jogador entender por quê, o
problema provavelmente está no dano dos eventos (`P7-01`), não aqui.

Trocar essa constante muda a curva inteira da partida. O `tests/climate.test.ts` trava os
valores de referência (4410,6 GtCO₂ e 3,3548 °C em 2100), então qualquer mudança aqui vai
fazer aquele teste falhar de propósito — **é sinal para atualizar o teste junto, não para
apagá-lo.**

### O corte de chance de evento: quatro nós, trinta por cento, um alvo cada (2026-10-26)

Pedido do chat: a árvore ganhar "algo especial", não só mais um número escalando. Decidido no chat
que o jogador delegou a escolha: **reduz a chance** (não o impacto) de um evento, nos **4 nós de
fecho do 1º losango** que têm par honesto com algum dos 20 eventos — um por ramo, menos Indústria.

**O valor é 30% por decisão de desenho, não de medição.** É o mesmo tipo de escolha que o
`inertiaCut`/`pointsPerYear` de cada nó já era: forte o bastante para notar numa partida (o
`tests/events.test.ts` mede a diferença de verdade, sorteando milhares de vezes a mesma sequência
com e sem o corte), sem zerar o evento — ele continua podendo acontecer, e **nenhum outro número do
balanceamento muda**: o custo dos 4 nós continua 140 PAC, o corte de emissão e o ganho de
resiliência/apoio deles não mexeram, e os totais que o `tests/skills.test.ts` trava (6300 PAC,
12,25% ao ano, 1260 PAC por ramo) continuam os mesmos — a soma só filtra `kind === 'emissionCut'`,
e o `eventChanceCut` é um `kind` à parte.

| Nó (ramo) | Evento cortado | Por quê |
|---|---|---|
| Rede elétrica inteligente (Energia) | Apagão no pico do calor | rede que gerencia demanda evita apagão — ligação direta |
| Prédios eficientes (Transporte e Cidades) | Onda de calor | prédio isolado/eficiente reduz o quanto a onda vira crise urbana |
| Proteção oceânica (Natureza) | Branqueamento de corais | área marinha protegida é a defesa direta contra o branqueamento |
| Defesa costeira (Sociedade) | Ressaca e maré de tempestade | o mesmo evento que o `§2.6` já liga a este ramo |

**Por que Indústria ficou de fora.** O nó da mesma posição — Cimento de baixo carbono — não tem par
honesto com nenhum dos 20 eventos. As alternativas cogitadas (tempestade de areia, por "menos
mineração"; seca, por "menos extração") são o tipo de vínculo fraco que o precedente do
`docs/CIENCIA.md` sobre alvo regional já recusa — ali a régua é "afirmação sobre o mundo tem fonte
ou não entra", e aqui a afirmação seria sobre mecânica, não geografia, mas o padrão é o mesmo. Em vez
de forçar um elo ruim, o ramo ficou sem o efeito extra nesta rodada. Fica registrado para o dia em
que um evento novo render um par honesto com Indústria.

Nenhum personagem reforça este efeito — ao contrário do `emissionCut` (REF-05), que a Ana e o
Ricardo reforçam em 15% no ramo deles. Os quatro nós não têm ramo em comum com um personagem
específico o bastante para justificar um buff novo, e criar um sem motivo seria inventar
balanceamento para o `character-buffs.json` não pedir.
