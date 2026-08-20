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
