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

As rodadas de playtest ainda não aconteceram — saem de `P3-02` (a planilha) e de `P8-02`
(o playtest com 5 pessoas). As seis linhas abaixo são anteriores a isso: vieram de fonte
científica (`P3-01`) e de furos de desenho achados na conta (`P6-02`, `P6-03` e `P6-05`), não de
partida jogada. Por isso todas estão com **resultado não testado**.

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
  do GDD ainda não descreve esse desfecho.

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
