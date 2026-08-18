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
