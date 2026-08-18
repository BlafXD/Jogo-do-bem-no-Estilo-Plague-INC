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
(o playtest com 5 pessoas). As três linhas abaixo são anteriores a isso: vieram de fonte
científica (`P3-01`) e de um furo de desenho achado na conta (`P6-02`), não de partida
jogada. Por isso todas estão com **resultado não testado**.

| Data | Constante | De → Para | Por quê | Resultado |
|---|---|---|---|---|
| 2026-08-18 | `startTemperature` | 1,3 → **1,37 °C** | O valor do GDD não tinha fonte. O `P3-01` fechou a fonte: aquecimento de origem humana em 2025, pelo IGCC 2025 | não testado |
| 2026-08-18 | `startEmissions` | 41 → **40,753 GtCO₂/ano** | Passou a ser a soma das 8 regiões, por construção. Com valores diferentes, o global e o regional discordariam e a simulação erraria em silêncio | não testado |
| 2026-08-18 | `baselineGrowthPerYear` | — → **0,0093 (0,93%/ano)** | **Constante nova.** Com emissão constante a partida terminava em 2,75 °C e não fazer nada não perdia o jogo. A taxa escolhida dobra as emissões até 2100, como o cenário SSP3-7.0 do IPCC | não testado |

### O que observar no primeiro playtest

O `baselineGrowthPerYear` é o número mais provável de mudar. Hoje o jogador que não faz
nada cruza os 3 °C em **2089** — sobrevive a 85% da partida antes de perder. Se o playtest
mostrar que a ameaça demora demais a aparecer, o caminho é **subir a taxa**, não baixar o
`loseTemperature`: o limiar de 3 °C é o que dá sentido ao jogo, e a taxa é o que dá ritmo.

Trocar essa constante muda a curva inteira da partida. O `tests/climate.test.ts` trava os
valores de referência (4410,6 GtCO₂ e 3,3548 °C em 2100), então qualquer mudança aqui vai
fazer aquele teste falhar de propósito — **é sinal para atualizar o teste junto, não para
apagá-lo.**
