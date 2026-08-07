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

## Constantes de balanceamento

> **Atenção: nenhuma linha desta tabela tem fonte ainda.** Os valores entraram no
> `src/data/balance.json` em `P6-01` porque estavam escritos no `docs/GDD.md §4` e o
> engine precisava de algo para ler. Eles são **plausíveis, não verificados** — vieram da
> redação do GDD, não de uma publicação consultada.
>
> **Fechar as fontes é a tarefa `P3-01`.** Até lá, nenhum número desta tabela pode ser
> citado como fato no relatório, na feira ou na apresentação.

| Valor | Onde aparece | Fonte | Observação |
|---|---|---|---|
| 1,3 °C acima do pré-industrial | `balance.json → startTemperature` | **pendente** (`P3-01`) | Aquecimento no início da partida, 2025 |
| 41 GtCO₂/ano | `balance.json → startEmissions` | **pendente** (`P3-01`) | Emissão global anual de partida |
| 0,00045 °C por GtCO₂ | `balance.json → tcre` | **pendente** (`P3-01`) | Resposta transiente ao carbono acumulado. Fonte natural: IPCC AR6 |
| 3,0 °C | `balance.json → loseTemperature` | não se aplica | Limiar de derrota — decisão de jogo, não dado científico |

## Dados por região

`src/data/regions.json` tem as 8 macrorregiões com nome e id corretos, mas
**`population`, `emissions` e `cleanShare` estão todos em zero**. Não é esquecimento: são
dados do mundo real e a regra 9 proíbe inventá-los. Entram em `P3-01`, com fonte, de uma
vez só.

Os campos `support`, `resilience` e `economy` começam em 50, 50 e 100 — esses são valores
de balanceamento, não dados científicos, e não precisam de fonte.

**Enquanto o zero estiver aí, a simulação de clima não produz resultado com significado.**

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
