# INERCIA.md — especificação do antagonista

> **Tarefa `P3-05`.** Gatilhos, ações e contra-ataques da Inércia, com números **verificados contra
> o engine** antes de virarem código.
>
> A regra proposta está em `tests/inercia-modelo.ts` e a verificação em `tests/inercia.test.ts`.
> Quem implementa é o `P7-03`, em `src/engine/inertia.ts`. Nada em `src/` mudou nesta tarefa, e
> **nenhuma constante do `balance.json` precisou mudar** — o que foi o achado mais aliviante.
>
> Conceito no `docs/GDD.md §2.6`. O problema que ela resolve está em
> `docs/CURVA-DE-DIFICULDADE.md`; a armadilha que ela cura, em `docs/BALANCEAMENTO.md`.

## O que ela precisa resolver

Duas coisas medidas antes desta tarefa:

- **A partida está decidida em 2055** — ano 30 de 75. Treze minutos e meio dos vinte e dois e meio
  de tela são o jogador assistindo a uma conclusão que ele já escreveu (`P3-03`).
- **O ramo Sociedade é uma armadilha.** Ele rende PAC, compra mais nós, termina com emissão menor —
  e a partida acaba **mais quente**. A ordem gulosa ótima simplesmente o ignora (`P3-04`).

As duas têm a mesma causa raiz: **hoje a trajetória só melhora.** Nenhuma força tira do jogador o
que ele construiu, então a tensão só pode decair e o único ramo que não corta emissão não tem
função. A Inércia existe para ser essa força.

## Resultado da verificação

| | Sem Inércia (hoje) | Com a Inércia proposta |
|---|---|---|
| Medalha travada em | **2055** | **2080** |
| Anos sem nada em jogo | 46 | **21** |
| Minutos mortos a 1x (de 22,5) | 13,8 | **6,3** |
| Melhor jogada | 2,4400 °C · Bronze | 2,4938 °C · **Bronze** |
| Quem ignora a Inércia | — | **derrota por apoio** |
| Quem pula o ramo Sociedade | melhor jogada | **derrota por apoio em 2089** |
| Derrota por apoio | inalcançável | **alcançável** |

A meta acordada era manter a disputa até ~2075. A proposta chega a **2080**, e o Bronze continua ao
alcance de quem joga bem com **0,006 °C de folga** — sem tocar em `balance.json`.

## A regra

### O gatilho: ela é espelho, e o espelho é uma conta

O `§2.6` diz que a Inércia "cresce quando o jogador avança rápido demais sem preparar apoio
público". Escrito como conta, por ano:

```
crescimento = baseGrowthPerYear
            + growthPerCutPercent × (soma dos cortes já comprados, em %/ano)
            − dampingPerSupportPoint × (apoio médio − supportFloor, quando positivo)
```

O valor fica preso entre 0 e 100, como o `GameState.inertia` já prevê.

| Termo | Valor | O que faz |
|---|---|---|
| `baseGrowthPerYear` | **0,5** | O lobby existe mesmo se o jogador não fizer nada |
| `growthPerCutPercent` | **1,0** | Cada 1%/ano de corte comprado alimenta a Inércia — a transição ameaça quem vive do fóssil |
| `dampingPerSupportPoint` | **0,25** | Apoio acima do piso de apatia segura a Inércia |

> **Por que a base é 0,5 e não os 2 do `balance.json`.** O `inertiaGrowthPerYear` está lá desde o
> começo e **nunca foi lido por ninguém**. Com 2 ao ano, a Inércia satura em 100 antes de 2075
> contra um jogador que não fez nada — o antagonista venceria sozinho, e o espelho do `§2.6`
> viraria enfeite. Com 0,5, quem não age enfrenta uma Inércia fraca, e quem age enfrenta a que ele
> mesmo criou. **É a única constante existente cujo valor a proposta contradiz.**

Na partida bem jogada a Inércia chega a **72** de pico. Contra quem corta e nunca contém, ela satura.

### As ações: a cada 6 ticks, e o estrago é permanente

A cadência é a do `§2.6`. A intensidade de cada ação é proporcional ao nível: `inércia / 100`.

| Ação | Efeito | Valor |
|---|---|---|
| **Subsídios** | multiplica a emissão de cada região | `× (1 + 0,002 × intensidade)` |
| **Desinformação** | subtrai apoio de cada região, **furando o piso de apatia** | `− 1,0 × intensidade` |
| **Recuos regulatórios** | encarece as habilidades ainda não compradas | **não modelado** — ver abaixo |

**Os dois efeitos são permanentes, e é isso que faz o modelo funcionar.** O subsídio empurra a
emissão da região para cima e ela segue dali, crescendo e sendo cortada a partir do valor novo; a
desinformação tira apoio e o desgaste do `tick.ts` não devolve. Uma Inércia cujo estrago se desfaz
sozinha não cria tensão nenhuma — só barulho.

O `tick.ts` já estava escrito para isto: *"Quem já está no piso ou abaixo dele não se move (…) Furar
o piso é trabalho de evento e da Inércia"*. E o `climate.ts` também: *"A Inércia age por cima deste
crescimento, não no lugar dele"*. As duas peças que a proposta precisa do engine já existiam.

**Por que os recuos regulatórios ficaram de fora da verificação.** Encarecer habilidades futuras
não tira nada do que o jogador já tem — é a mesma classe de efeito que o `P3-03` mostrou incapaz de
gerar tensão tardia. Ele é bom sabor e vale implementar, mas não carrega peso mecânico; deixá-lo
fora da medição mantém honesto o número que os outros dois entregam.

**A alternância é determinística, de propósito.** Um sorteio faria a verificação depender da seed e
um "escolhe a mais eficaz" faria da Inércia um otimizador — desenho que o `P7-03` pode explorar, mas
que esta medição não precisa. Alternar dá o caso médio e mantém o número reprodutível.

### O contra-ataque: a contenção, destravada pelo ramo Sociedade

**Esta é a única mecânica nova da proposta**, e ela vai além do que o `docs/GDD.md §2.6` descreve
hoje — decidida no chat em 2026-08-20, e registrada aqui porque a regra 1 manda propor antes de
escrever.

O jogador pode, em vez de comprar um nó no mês, **gastar PAC para empurrar a Inércia para baixo**:

| Parâmetro | Valor |
|---|---|
| Custo base | **30 PAC** |
| Desconto por nó de Sociedade além do primeiro | **20%** |
| Alívio | **−25** pontos de Inércia |
| Pré-requisito | **`climate-education` comprado** |

> **A trava em `climate-education` nasceu de uma medição que deu errado, e é a decisão central da
> proposta.** Na primeira versão a contenção era um gasto de PAC solto, disponível desde 2025. A
> varredura mostrou que ela neutralizava a Inércia inteira mais barato do que o ramo Sociedade —
> **agravando** a armadilha em vez de curá-la: agora o ramo não só não compensava como tinha um
> substituto melhor.
>
> Condicionar a contenção a Sociedade inverte isso de uma vez. O ramo deixa de ser um bônus de PAC
> que não se paga e passa a ser a **licença para lutar**; e cada nó seguinte barateia a luta, o que
> finalmente dá razão para comprar os quatro.

**O dilema que isso cria, e que é o ponto da tarefa:** a partida que mais corta emissão não é a que
sobrevive. Quem pula Sociedade e compra só cortes termina em **2,4556 °C** — mais frio que a melhor
jogada — e **é dissolvido por falta de apoio em 2089**. O jogador tem que escolher entre o número
bonito e continuar existindo.

## O que ficou aberto

- **A verificação usa uma política de jogador simplificada** — "contenha acima de 70, senão compre o
  próximo da lista". Um humano vai jogar diferente, e o `P8-01` é quem descobre como. Os números
  aqui são o ponto de partida do playtest, não o fim.
- **A tensão ainda decai, só que mais devagar.** De 2080 a 2100 continua não havendo nada em jogo —
  6,3 minutos de tela. Fechar esse resto exigiria a alavanca 4 do `docs/CURVA-DE-DIFICULDADE.md`
  (realimentações do ciclo de carbono, que precisam de fonte no `docs/CIENCIA.md`), e essa é
  decisão do `P8-02`.
- ~~O `GDD §2.6` não descreve a contenção.~~ **Resolvido em 2026-08-20**: o `§2.6` foi reescrito e
  agora descreve o espelho, as três ações, a permanência do estrago e as duas metades do
  contra-ataque.
- **O `inertiaGrowthPerYear` do `balance.json` está em 2 e a proposta pede 0,5.** É a única
  contradição com um valor existente, e ela é deliberada: o porquê está acima. Como ninguém lê essa
  chave hoje, mudá-la não quebra nada.
- **Nenhum número foi aplicado.** Tudo isto vive em `tests/`. Quem move para `src/data/balance.json`
  é o `P7-03`, e as sete chaves novas são: `inertiaGrowthPerCutPercent`, `inertiaDampingPerSupport`,
  `inertiaSubsidyBite`, `inertiaDisinformationBite`, `inertiaActionEveryTicks`, `containCost`,
  `containDiscountPerNode` e `containRelief`.
- **A interação com os eventos foi medida em 2026-08-20, no `P7-01`, e a proposta não sobreviveu.**
  Somados, os dois consomem a folga de 0,06 °C entre a melhor jogada e o teto do Bronze — e a
  inversão que esta especificação tinha conseguido, o ramo Sociedade virar obrigação, **desapareceu**:
  com eventos em cena, comprá-lo volta a custar a medalha. **Não é bug de nenhum dos dois sistemas**,
  é o orçamento de dano do jogo estourando. Os números desta página valem para um mundo sem eventos
  e precisam ser refeitos junto com o conserto, que o `docs/BALANCEAMENTO.md` mede como mover o teto
  do Bronze para ~2,55 °C. Os três testes que registram a colisão estão em `tests/inercia.test.ts`,
  marcados com `COLISÃO`, e é para eles falharem no dia em que houver espaço de novo.
