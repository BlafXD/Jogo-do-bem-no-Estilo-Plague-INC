# CURVA-DE-DIFICULDADE.md — a tensão da partida, década a década

> **Tarefa `P3-03`.** Mede onde a partida prende o jogador e onde ela o solta, e diz o que
> precisa existir para ela prender até o fim.
>
> Os números vêm do `tests/tensao.test.ts`, que roda o **engine de produção**. Nada aqui é
> estimativa: é o próprio jogo respondendo. Dados brutos em `docs/planilha/tensao-por-ano.csv`.
> Os achados de economia estão em `docs/BALANCEAMENTO.md`; a regra de desfecho, no `GDD §2.7`.

## Como a tensão virou número

A Teoria do Fluxo põe a diversão num canal estreito entre a **ansiedade** — desafio muito acima
da habilidade — e o **tédio** — desafio muito abaixo. O problema é aplicar isso a um jogo de
estratégia com pausa: aqui não há reflexo a testar, não há execução que se possa errar. Medir
"dificuldade" pelo tempo de reação não diria nada.

O que separa o canal do tédio neste jogo é outra coisa: **ainda existe decisão capaz de mudar o
desfecho?** Uma partida cujo resultado já está selado não é fácil — é tédio, mesmo que os números
na tela continuem se mexendo, mesmo que o jogador continue clicando.

Isso é mensurável, e a medida é direta. No ano `Y`, pega-se a partida como ela está e joga-se dela
em diante de dois jeitos: **o melhor possível** e **o pior possível** (parar de comprar). A
distância entre os dois finais é o quanto a decisão do jogador ainda pesa. Chamo isso de **tensão**.

```
tensão(Y) = temperatura final se ele largar tudo agora
          − temperatura final se ele jogar perfeito daqui em diante
```

Tensão zero significa: nada do que o jogador fizer a partir de `Y` muda o resultado. O jogo acabou,
mesmo que o relógio não saiba.

Uma segunda medida acompanha a primeira, porque elas respondem a perguntas diferentes. A **janela de
perdão** parte da linha de quem **não fez nada** até `Y` e pergunta qual é o teto dele se começar a
agir agora. A primeira mede o engajado; a segunda, quem largou o controle na metade.

## A curva medida

| Década | Minutos a 1x | Tensão no início | Perde na década | Compras | Teto de quem começa aqui |
|---|---|---|---|---|---|
| 2025–2034 | 0–3 | **0,915 °C** | 0,527 | 2 | 2,44 °C |
| 2035–2044 | 3–6 | 0,388 °C | 0,196 | 2 | 2,48 °C |
| 2045–2054 | 6–9 | 0,192 °C | 0,141 | 1 | 2,59 °C |
| 2055–2064 | 9–12 | **0,051 °C** | 0,026 | 2 | 2,73 °C |
| 2065–2074 | 12–15 | 0,025 °C | 0,013 | 1 | 2,90 °C |
| 2075–2084 | 15–18 | 0,011 °C | 0,011 | 2 | 3,08 °C |
| 2085–2094 | 18–21 | 0,001 °C | 0,001 | 1 | 3,23 °C |
| 2095–2100 | 21–22,5 | **0,000 °C** | 0,000 | 1 | 3,34 °C |

Três marcos saem daí:

- **2055 — a medalha trava.** A partir deste ano, largar o controle e jogar perfeito dão a mesma
  medalha. É o **ano 30 de 75**: nove minutos de tela, de vinte e dois e meio.
- **2071 — a janela de perdão fecha.** Quem não fez nada até aqui já não escapa da derrota, jogue o
  que jogar.
- **2090 — a tensão chega a zero absoluto.** Os últimos dez anos são literalmente inertes.

**25 dos 76 anos têm menos de 0,01 °C em jogo** — um terço da partida, mais de sete minutos de tela.

## Onde o Fluxo quebra

### 1. O jogo tem nove minutos de jogo e treze de espera

A partida dura 22,5 minutos a 1x (900 ticks × 1,5 s), dentro da meta de 20–30 min do `PLANO.md`. Só
que a decisão termina no minuto nove. Os treze e meio restantes são o jogador assistindo a uma
conclusão que ele já escreveu — **60% do tempo de tela**. No Modo Feira (`P7-07`), a 4x, a proporção
é a mesma: 2,2 minutos de jogo e 3,4 de espera.

### 2. A assimetria que é o pior achado deste documento

Entre **2055 e 2071** existe uma faixa de dezesseis anos com uma propriedade perversa:

- quem está **engajado** já não tem nada a decidir — a medalha está travada desde 2055;
- quem está **parado** ainda pode piorar — a derrota só se torna inevitável em 2071.

Ou seja: **o jogo para de recompensar a ação antes de parar de punir a inação.** É exatamente ao
contrário do que o canal do Fluxo pede. Quem joga bem entra no tédio primeiro; quem joga mal
continua na ansiedade. A punição sobrevive à recompensa por dezesseis anos.

### 3. Doze decisões em vinte e dois minutos, e nenhuma delas é difícil

A partida bem jogada compra **12 nós em 75 anos** — uma decisão a cada **113 segundos** de tela. E
não são escolhas: a ordem gulosa por corte por PAC é ótima, e uma busca de 200 permutações não achou
nada melhor (`docs/BALANCEAMENTO.md`). O jogador não escolhe entre caminhos, ele espera o dinheiro
chegar e clica no próximo item de uma lista cuja ordem certa não muda.

A fantasia central do `GDD §1` é "escolher o que sacrificar". Hoje não há sacrifício: há fila.

## O alvo — tensão até 2100

**Decidido no chat em 2026-08-20:** a partida deve continuar em disputa até o fim. Uma decisão
tomada em 2080 precisa poder mudar o desfecho.

Isso não é pedir que o jogo fique difícil: é pedir que ele **continue sendo um jogo** durante os 13
minutos que hoje são cinemática. E há uma boa notícia enterrada nos números — **falta muito menos do
que parece**.

### Quanto exatamente falta

A partida ótima termina em **2,44 °C**, e o teto do Bronze é 2,50 °C. A folga é de **0,06 °C**, que
pelo TCRE do `docs/CIENCIA.md` (0,00045 °C por GtCO₂) equivale a **133 Gt de CO₂**.

E o número que mais importa: em **2055**, a diferença entre largar tudo e jogar perfeito é 0,0508 °C
— contra os 0,06 °C que separariam o Bronze do nada. **A medalha trava por 0,0092 °C.** O jogo não
está decidido por goleada; está decidido por nove milésimos de grau.

Daí sai a especificação, e ela é uma conta simples: para a medalha seguir em disputa a partir do ano
`Y`, alguma força precisa poder somar 133 Gt de CO₂ nos anos que restam.

| A partida segue em disputa a partir de | A Inércia precisa poder somar | Contra as emissões de uma partida bem jogada ali |
|---|---|---|
| 2060 | **3,3 Gt/ano** | ~27 Gt/ano — um agravo de 12% |
| 2070 | **4,4 Gt/ano** | ~13 Gt/ano — um agravo de 34% |
| 2080 | **6,7 Gt/ano** | ~13 Gt/ano — um agravo de 52% |
| 2090 | **13,3 Gt/ano** | ~13 Gt/ano — dobrar as emissões |

Manter a disputa viva **até 2070** custa uma força capaz de agravar as emissões em cerca de um
terço. Isso está inteiramente ao alcance de um antagonista com três ou quatro ações que empilham —
que é exatamente o que o `GDD §2.6` já descreve para a Inércia. Manter até 2090 exige dobrar as
emissões de um mundo já descarbonizado, o que é caro demais e provavelmente não vale.

**Alvo prático, então: disputa viva até ~2075, e os últimos 25 anos como desfecho.** É a diferença
entre 60% de tempo morto e 25%.

## O que precisa existir — a lista para o `P7-01` e o `P7-03`

A causa raiz do achado 1 e do achado 2 é a mesma, e não é o balanceamento: **hoje a trajetória só
melhora.** Nenhuma força do jogo tira do jogador o que ele construiu. Um nó comprado é permanente,
o apoio não cai abaixo do piso, e a emissão de base é uma curva fixa que a árvore só reduz. Num jogo
assim, tensão só pode decair — e o teste `tests/tensao.test.ts` trava justamente essa propriedade
("a tensão só cai"), para que **ela falhe** no dia em que deixar de ser verdade.

Em ordem do que resolve mais por menos:

1. **A Inércia precisa poder desfazer, não só atrasar** (`P7-03`). O `GDD §2.6` já promete três
   ações: desinformação derruba apoio, subsídios aumentam emissões, recuos regulatórios encarecem
   habilidades. **Só a segunda cria tensão tardia** — as outras duas encarecem o futuro sem tocar no
   que já foi conquistado. A conta acima diz de quanto os subsídios precisam ser: um agravo de ~34%
   nas emissões, empilhável, mantém a partida viva até 2070.

2. **A derrota por apoio precisa ser alcançável** (`P7-01`). Ela existe no `GDD §2.7`, está testada
   no `outcome.ts` e é **inatingível**: o `supportFloor` trava o desgaste em 25 e nada empurra para
   baixo. Enquanto for assim, o ramo Sociedade defende contra um perigo que não existe — que é a
   causa do "ramo Sociedade é uma armadilha" do `BALANCEAMENTO.md`. Eventos que derrubem apoio de
   verdade resolvem os dois problemas com uma mudança só, **e sem tocar em nenhum número de
   `balance.json`.**

3. **Os eventos precisam escalar com a temperatura de forma que morda** (`P7-01`). O
   `eventWeightPerDegree` já está no `balance.json` e a fórmula está no `events.ts`. Um mundo a
   2,4 °C em 2080 deveria ser visivelmente mais hostil que um a 1,8 °C em 2040 — é o que dá sentido
   à segunda metade da partida e é, de quebra, a lição climática mais honesta que o jogo tem para
   dar.

4. **Realimentações do ciclo de carbono, se houver fôlego.** Um evento acima de certo aquecimento
   que **suba a emissão de base** — degelo de permafrost, morte de floresta — inverte a curva de
   dificuldade de vez: quanto mais tarde, mais perigoso. É a única alavanca desta lista que torna o
   fim de jogo o momento mais tenso, e é cientificamente ancorada. Precisa de fonte no
   `docs/CIENCIA.md` antes de virar número.

**O que não está nesta lista, de propósito:** mexer em `basePointsPerYear`, no custo dos nós ou nos
limiares de medalha. Todas resolveriam sintoma. A partida não é curta demais nem cara demais — ela
é **unidirecional**, e é isso que precisa mudar.

## O que perguntar no playtest (`P8-01`)

A medição diz onde o jogo perde a tensão. Ela **não** diz onde o jogador perde o interesse, e os
dois podem não coincidir.

- **Marcar o minuto em que a pessoa se recosta na cadeira.** Se for por volta do minuto 9, a
  medição está certa. Se for antes, o problema é maior que a curva. Se for depois, a fantasia está
  segurando o que a mecânica largou — e isso é informação valiosa.
- **Perguntar, no fim: "em que momento você sentiu que já tinha ganhado ou perdido?"** Comparar com
  2055.
- **Ver se alguém descobre sozinho que o ramo Sociedade não compensa.** Se descobrir, a árvore está
  transparente demais; se não descobrir, o jogo está cobrando uma armadilha.
- **Contar quantas vezes a pessoa usa a pausa depois do minuto 10.** Pausa é sintoma de decisão
  difícil. Se ela sumir na segunda metade, é a confirmação comportamental de tudo acima.

## O que esta medição não enxerga

**A partida medida é de um jogo incompleto.** Não existem eventos (`P7-01`) nem Inércia (`P7-03`) —
os dois arquivos estão vazios. Todo número deste documento vai mudar quando eles entrarem, e é
justamente por isso que ele existe: ele é a **linha de base** contra a qual medir se esses dois
sistemas fizeram o trabalho que se espera deles.

Refazer a medição é `npm test`. Se a tabela da curva mudar, este documento está desatualizado.
