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

Nenhum ainda. A primeira rodada sai de `P3-02` (a planilha) e a segunda de `P8-02`
(o playtest com 5 pessoas).

| Data | Constante | De → Para | Por quê | Resultado |
|---|---|---|---|---|
| — | — | — | — | — |
