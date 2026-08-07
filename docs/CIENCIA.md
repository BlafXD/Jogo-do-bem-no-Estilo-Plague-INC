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

Nada registrado ainda. Preencher junto com `P3-01`, que é a tarefa dona deste arquivo.

| Valor | Onde aparece | Fonte | Observação |
|---|---|---|---|
| — | — | — | — |

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
