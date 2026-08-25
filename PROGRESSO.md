# PROGRESSO.md — Diário do projeto

> **Para que serve:** provar evolução. Cada aula vale nota parcial, e a memória falha três
> semanas depois. Aqui fica o registro datado do que entrou no projeto, como conferir e o
> que ficou aberto. É a matéria-prima do relatório final e da apresentação.
>
> Design do jogo: `docs/GDD.md`. Regras de trabalho: `FORMA-DE-TRABALHO.md`. Backlog: `PLANO.md`.

## Como escrever uma entrada

Uma entrada por sessão de trabalho, **mais recente no topo**. Formato de `FORMA-DE-TRABALHO.md §5`:

```markdown
## AAAA-MM-DD — <o que mudou>

- **Parte / tarefa:** IDs do `PLANO.md` (ex.: `SETUP-02`, `P6-03`)
- **Como verificar:** comando exato para rodar, ou o que olhar na tela
- **Pendente:** o que ficou aberto ou merece um segundo olhar
- **Evidência:** arquivo em `docs/evidencias/` (print ou GIF), quando houver
```

Regras curtas:

- **Escreva no dia.** Entrada reconstruída de memória vira ficção.
- **"Como verificar" é um comando, não uma promessa.** Quem lê precisa conseguir repetir.
- **Registre o que deu errado também.** Um beco sem saída documentado economiza a próxima tentativa.
- Data em `AAAA-MM-DD`. Nunca "ontem", "semana passada" ou "na aula anterior".

---

## 2026-08-25 — O painel da região entrou, e três dos sete campos de `Region` não movem nada

- **Parte / tarefa:** `P5-04` ✔ — **a Parte 5 está em 4 de 6**
- **O que mudou:**
  - `src/ui/region-panel.ts` e `region-panel.css` **criados** — os seis campos da região escolhida, em dois grupos, com botão de fechar.
  - `src/ui/map.ts` — `focusRegion` novo, para o foco do teclado voltar ao mapa quando o painel fecha.
  - `src/data/i18n.ts` — o bloco `regionPanel` e `units.millions`.
  - `index.html` — a seção `#regiao`, colada no mapa. `src/main.ts` — `renderSelection`, `handleCloseRegion` e o `Esc` do `§5`.
  - `src/ui/map.css` — nota de que o `max-width` é compartilhado com o painel.
  - `tests/region-panel.test.ts` (19) e `tests/region-panel.dom.test.ts` (18) **criados**; `map.dom.test.ts` +2. Suíte: 415 → **454**.
  - Nenhum arquivo do engine foi tocado. Nenhuma constante de balanceamento entrou.

### O achado da tarefa: três dos sete campos de `Region` são decorativos

Antes de escrever o painel, uma varredura de quem lê cada campo no engine:

| Campo | Quem escreve | Quem **lê** |
|---|---|---|
| `emissions` | clima, habilidades, Inércia | `climate.ts` — vira temperatura |
| `support` | eventos, Inércia, decaimento, habilidades | `outcome.ts`, `inertia.ts` |
| `resilience` | habilidades | `events.ts:221` — reduz o dano |
| `economy` | eventos | **ninguém** |
| `population` | ninguém | **ninguém** |
| `cleanShare` | ninguém | **ninguém** |

O `§2.3` do GDD promete que "quem tem sol abundante e pouca verba não se resolve igual a quem tem
indústria pesada e verba alta". Hoje **isso não é verdade**: a matriz energética e a população não
entram em conta nenhuma, e a economia é um contador que só desce e que ninguém consulta. As oito
regiões se diferenciam por um campo só — quanto emitem.

Isso muda o que o painel podia dizer. Um painel com seis números onde três não fazem nada seria pior
do que nenhum painel: o jogador tentaria montar estratégia em cima da matriz limpa da Ásia Meridional
e perderia a partida sem entender por quê. **A saída foi não mentir em nenhuma dica.** Cada dica diz
o que move aquele número e para aí — a de população e a de matriz limpa dizem, com todas as letras,
que não mudam durante a partida. Nenhuma promete efeito.

**Não consertei a simulação**, e é decisão: fazer `cleanShare` valer alguma coisa é inventar mecânica
nova, que o `§1` proíbe sem passar pelo chat, e é balanceamento que ninguém mediu. Fica como o
pendente mais importante desta entrada.

### Os dois grupos são uma afirmação verificável, não decoração

"O que ela é" e "Como ela está" separam os dois campos que nenhum módulo escreve dos quatro que
mudam. O `tests/region-panel.test.ts` **roda os 900 ticks de uma partida inteira** e cobra que
população e matriz limpa terminem em 2100 iguais ao que eram em 2025. No dia em que uma habilidade
mexer na matriz, o título do grupo vira mentira — e é esse teste que avisa.

### O que o painel acrescenta que o mapa não dava

A fatia do mundo, colada na emissão. A Ásia Oriental aparece com **21,96 Gt/ano · 40% do mundo**; a
Oceania, com 0,56. É a primeira vez que o jogo mostra por que cortar num lugar vale mais do que em
outro — que é exatamente o que o `§2.3` diz que deveria decidir a estratégia.

A divisão é guardada contra zero: a emissão global **chega a zero**, é a condição de vitória do
`§2.7`, e sem a guarda a partida vencida mostraria "NaN% do mundo" no instante da vitória.

### Um defeito que o teste pegou antes do navegador

O `mountRegionPanel` não deixava o painel num estado válido: entre montar e o primeiro `render`, as
**duas** telas ficavam visíveis — a frase "clique numa região" e o detalhe vazio ao mesmo tempo,
porque o `hidden` de nenhuma tinha sido escrito ainda. No `main.ts` a janela é de microssegundos e
ninguém veria; em qualquer outra ordem de chamada, é um painel quebrado. O conserto foi o `mount`
chamar o `render` com a view vazia, como o `mountMap` e o `mountTree` já faziam — a regra de "só uma
das duas por vez" mora inteira num lugar só.

### Duas medidas que só o navegador deu

**O painel ficava 34px mais largo que o mapa.** O projeto não tem reset global de `box-sizing`, então
a borda e o `padding` somavam por fora das 54rem e as duas caixas terminavam em pontos diferentes.
Com `box-sizing: border-box`, mapa e painel medem 864px e vão de 40 a 904 — conferido no navegador.

**O `Esc` não pôde ser testado com a tecla de verdade.** A automação de navegador **não entrega
`Escape` à página**: um espião em fase de captura contou **zero** eventos depois de a tecla ser
apertada. O manipulador foi exercitado por evento sintético despachado no botão de fechar com foco —
mesmo caminho, mesmo `keydown` no `document` — e fecha o painel e desmarca o mapa. Mas **alguém
precisa apertar Esc à mão uma vez**; isto aqui não é prova.

- **Como verificar:**
  ```bash
  npm run typecheck && npm run test && npm run lint && npm run build && npm run format:check
  # 454 testes em 25 arquivos
  npm run dev   # clique numa região; feche pelo botão e por Esc
  ```
  O aceite é o `ACEITE` do `tests/region-panel.test.ts` — "concorda com o mapa sobre o apoio, nas 8
  regiões" —, mais o teste dos 900 ticks que tranca a divisão em dois grupos.

  **Conferido no navegador**, sobre a partida de 2056 que estava salva: a frase que ensina o clique
  na carga; a Ásia Oriental com os seis campos e "40% do mundo"; o mapa e o painel mostrando o mesmo
  26 de apoio; o botão de fechar devolvendo o foco à forma `ea` do mapa; e mapa e painel alinhados
  em 864px. A partida ficou pausada e não andou nenhum mês desta vez.

- **Pendente:**
  - **`population`, `cleanShare` e `economy` continuam sem peso mecânico.** É a lacuna entre o `§2.3`
    do GDD e o engine, e ela é anterior a esta tarefa — o painel só a tornou visível. Enquanto durar,
    as oito regiões se diferenciam por um campo só. Consertar é decisão de design mais rodada de
    balanceamento: vale uma tarefa própria, provavelmente perto do `P8-02`.
  - **O `Esc` não foi apertado por uma pessoa.** Verificado por evento sintético; a automação não
    entrega a tecla. É o primeiro item para conferir na mão.
  - **A seleção não sobrevive ao recarregamento**, pela mesma razão registrada no `P5-01`: ela não
    entra no `GameState` nem no save.
  - **O painel não mostra evento em curso na região.** Um cartão de evento diz "Enchente · Europa"
    enquanto o painel da Europa não menciona nada. Ligar os dois é o `P7-04`, que já é dono dos
    alertas por região.
  - **A largura 54rem está escrita em dois arquivos.** O `map.css` e o `region-panel.css` repetem a
    medida, com nota cruzada nos dois. Uma custom property resolveria — e é justamente o tipo de
    coisa que o `theme.css` do `P5-02` deve absorver.
  - **`economy` aparece como número puro**, sem escala nem unidade — é a única exceção da regra de
    "nunca número solto", porque é índice de base 100 e "97 de 100" mentiria: o índice pode passar de
    100. Está escrito como exceção no teste, não escondido.
  - `P1-04`, o `theme.css` do `P5-02` e o `P5-06` seguem abertos.
- **Evidência:** `docs/evidencias/2026-08-25-p5-04-painel-de-detalhe-da-regiao.jpg` — a Ásia Oriental aberta, alinhada com o mapa acima

---

## 2026-08-25 — O mapa entrou, e metade da simulação parou de rodar invisível

- **Parte / tarefa:** `P5-01` ✔
- **O que mudou:**
  - `src/ui/map.ts` e `src/ui/map.css` **criados** — o SVG esquemático com as 8 regiões, o apoio de cada uma e a seleção por clique ou teclado.
  - `src/data/i18n.ts` — o bloco `map`. O `app.pending` deixou de prometer o mapa e passou a apontar o `P5-04` e o `P7-04`.
  - `index.html` — a seção `#mapa`, entre os eventos e as ações. `src/main.ts` — a ligação e a região selecionada.
  - `tests/map.test.ts` (19) e `tests/map.dom.test.ts` (21) **criados**. Suíte: 375 → **415**.
  - Nenhum arquivo do engine foi tocado. Nenhuma constante de balanceamento entrou.

### O problema que esta tarefa existia para resolver

O engine simula as oito regiões desde o `P6-01`: o `climate.ts` cresce emissão região a região, o
`events.ts` acerta um alvo, a Inércia derruba apoio localmente e as habilidades aplicam efeito
regional. Um `grep -rln "region" src/ui/` antes desta tarefa devolvia **um arquivo** — o
`event-cards.ts`, e só pelo nome dentro do cartão. **Metade da simulação rodava sem chegar à tela.**

O HUD mostra a **média** do apoio, e é justamente a média que esconde o que interessa. Na partida de
2055 que estava salva na máquina, o HUD dizia 26 enquanto as regiões estavam em 24, 25, 26, 27 e 29.
Não é uma diferença grande nessa partida, mas é a diferença entre um número e oito, e a derrota por
apoio do `§2.7` acontece região a região.

### Por que o apoio, e não as emissões

O HUD já mostra a emissão global. A emissão de uma região é um número pequeno com decimal (0,56 a
16,4 Gt) que se lê mal de longe, num estande. O apoio é o número que **só existe em média** no HUD, é
o que os eventos e a Inércia atacam, e é uma das duas condições de derrota. É o que o jogador precisa
ver chegando.

### O que ficou fora, de propósito

O `PLANO.md` separa três tarefas que seria fácil confundir numa só, e elas continuam separadas:

| | |
|---|---|
| **`P5-01`, esta** | as formas, os nomes, o apoio, a seleção |
| `P5-04` | o painel de detalhe da região escolhida |
| `P7-04` | o mapa **reagir à temperatura** e os alertas por região |

Por isso o mapa é monocromático e a cor não carrega nenhum estado do jogo. A seleção existe, é
visível e já expõe o `handleSelect` — é a costura em que o `P5-04` encaixa. Uma região escolhida hoje
não faz nada além de ficar marcada, e isso é o combinado, não um pedaço faltando.

### O preço escondido de não usar um `<button>`

Um `<button>` não pode conter um `<rect>` de SVG, e oito botões de HTML posicionados por cima do
desenho exigiriam manter **duas geometrias em sincronia**. A saída foi `<g role="button" tabindex="0">`
— a única vez no projeto em que a UI abre mão do elemento nativo — com Enter e Espaço tratados à mão.

E aí aparece o problema que o elemento nativo resolveria de graça: o `main.ts` escuta Espaço no
`document` para pausar, e a guarda de lá deixa passar tudo que não for `HTMLButtonElement`. Um `<g>`
não é. **Sem `stopPropagation`, escolher uma região pelo teclado pausaria a partida junto** — e o
jogador não teria como ligar uma coisa à outra. Está consertado e trancado por dois testes, um deles
citando exatamente esse caminho.

### Duas coisas que só a medição resolveu

**A altura.** Com `max-width: 68rem` o mapa renderizava a 1088 × 675 px: sozinho comia uma tela
inteira e empurrava a árvore para fora dela. Medido no navegador, corrigido para `54rem` — 864 × 536.
O número está escrito no `map.css` com o porquê.

**O texto dentro das formas.** Transbordo de texto em SVG não quebra nada, não avisa e não corta: ele
pinta o nome por cima da região vizinha. O `tests/map.test.ts` cobra que nome e apoio caibam na forma
usando uma **estimativa conservadora** de 0,58 em por caractere. No navegador, o `getBBox()` real de
cada região confirmou a estimativa e mostrou que ela erra para o lado seguro — o pior caso,
"Apoio 100", mede 116,7 unidades onde o teste supunha 135,7, e a forma mais estreita tem 170. Folga
mínima medida: **53,3 unidades na horizontal e 15,3 na vertical**, nas oito regiões.

### O que não foi possível conferir no navegador

O relógio do jogo roda em `requestAnimationFrame`, e **aba em segundo plano não recebe quadro** —
`document.visibilityState` estava `hidden` e o contador ficou em 0 quadros em 2 s. Ou seja: o mapa
**não** foi visto atualizando mês a mês numa partida correndo de verdade. O que cobre esse caminho é
o teste `atualiza o apoio quando ele muda na partida` mais a linha do `renderGame` que chama o
`renderMap`. Fica registrado como o que é: verificado por teste, não por observação.

- **Como verificar:**
  ```bash
  npm run typecheck && npm run test && npm run lint && npm run build && npm run format:check
  # 415 testes em 23 arquivos
  npm run dev   # role até o mapa; clique numa região e clique de novo para desmarcar
  ```
  Os aceites são os dois `ACEITE` do `tests/map.test.ts` — "nenhuma forma invade outra" e "mantém
  nome e apoio dentro da forma, nas 8 regiões".

  **Conferido no navegador**, sobre a partida de 2055 que estava salva: as oito regiões com apoio
  próprio (24 a 29) contra o 26 da média no HUD; seleção por clique e por Espaço com o foco na
  região; desmarcar clicando de novo; e o Espaço **não** retomando o tempo pausado. O pior caso de
  texto foi produzido escrevendo um save com apoio 0, 8 e 100 — **o save do jogador foi guardado no
  `sessionStorage` e devolvido**, conferido tick a tick depois.

- **Pendente:**
  - **A partida salva na máquina andou 12 meses** (2055 → 2056) durante a verificação: com a página
    aberta o jogo corre e salva sozinho a cada mês. Ficou pausada no fim. Nada foi perdido, mas o
    save não é byte a byte o que era antes.
  - **A seleção não sobrevive ao recarregamento**, e é decisão: ela não entra no `GameState` nem no
    save. Onde o jogador está olhando não muda o clima, e pôr isso no estado mudaria o contrato do
    `§3` e o formato do save do `P6-07` por um dado sem consequência mecânica.
  - **O mapa é monocromático e não reage a nada.** É o combinado com o `P7-04`, mas até lá ele é uma
    tabela bonita: mostra o apoio e mais nada. Quem olhar antes do `P7-04` vai achar que falta algo.
  - **O canto inferior esquerdo do desenho fica vazio.** A disposição é aproximadamente geográfica e
    não há região ali. Não incomoda, mas é onde caberia uma legenda quando o `P7-04` trouxer estados.
  - **`role="button"` num `<g>` é menos garantido que um `<button>`.** Funciona no Chrome — foco,
    Enter, Espaço e `aria-pressed` conferidos —, mas leitor de tela de verdade não foi testado. É
    candidato à passagem de acessibilidade do `P8-04`.
  - **Nenhum teste mede o contraste do `map.css`.** Os números do cabeçalho da folha foram calculados
    à mão, como nas outras. Continua valendo o que o `P5-02` vai revisar.
  - `P1-04` e o `theme.css` do `P5-02` seguem abertos.
- **Evidência:** `docs/evidencias/2026-08-25-p5-01-mapa-das-8-regioes.jpg` — as 8 regiões em 2055, com a África selecionada

---

## 2026-08-23 — A Inércia entrou no engine, e a colisão do P3-05 era pior do que o registro dizia

- **Parte / tarefa:** `P7-03` ✔ — **o loop do `§2.1` está completo**
- **O que mudou:**
  - `src/engine/inertia.ts` **implementado** — o espelho, as duas ações, a contenção. Era um comentário de 6 linhas desde o `SETUP-05`.
  - `src/engine/tick.ts` — a Inércia entra por último no tick; o cabeçalho deixou de dizer que ela faltava.
  - `src/engine/skills.ts` — `purchasedCutPercent`, que é o que a Inércia enxerga como ameaça.
  - `src/data/balance.json` + o tipo `Balance` — **8 chaves novas**, `inertiaGrowthPerYear` de 2 para 0,5, `bronzeTemperature` de 2,5 para 2,55.
  - `src/ui/hud.ts` — o sexto indicador. `src/ui/contain.ts` e `.css` **criados** — o botão de conter.
  - `src/data/i18n.ts`, `index.html`, `src/main.ts` — textos, seção e ligação.
  - `docs/GDD.md §2.7 e §4`, `docs/BALANCEAMENTO.md`, `docs/INERCIA.md` — os números e o porquê de cada um.
  - `tests/contain.test.ts` (11) e `tests/contain.dom.test.ts` (9) **criados**; `inercia.test.ts` reescrito (25); `planilha-engine.ts`, `planilha.test.ts`, `tensao.test.ts`, `outcome.test.ts`, `tick.test.ts` e `hud.test.ts` atualizados. Suíte: 334 → **375**.

### A colisão era pior do que o registro dizia, e isso é o achado da tarefa

O `docs/INERCIA.md` fechou dizendo que a Inércia mais os eventos custavam a medalha. Ao medir contra
o engine antes de escrever qualquer coisa, apareceu que **os três testes `COLISÃO` verificavam
temperatura e medalha e nunca a causa da derrota**. Com os números da especificação:

| Estratégia | Desfecho |
|---|---|
| Compra Sociedade e contém | **dissolvida em 2098** |
| Corta bem, pula Sociedade | **dissolvida em 2083** |
| Sociedade mas nunca contém | **dissolvida em 2091** |

Nenhuma sobrevivia. Não era "perde a medalha": era o jogo invencível. **A lição é sobre o teste, não
sobre o balanceamento** — um aceite que mede só o número bonito não percebe que a partida acabou.

### Dois problemas que estavam confundidos num só

**O apoio é o gargalo.** Sem Inércia nenhuma, a melhor jogada já termina 2100 com 11 pontos de apoio
médio: os eventos do `P7-01` consomem quase todo o pool sozinhos. A desinformação a 1,0 tira ~52
pontos ao longo do século, mais do que existe. A varredura em **cinco seeds** achou 0,5 como a única
faixa que entrega as duas coisas: a melhor jogada sobrevive nas cinco, e quem pula Sociedade morre
nas cinco. Em 0,4 a inversão do `P3-05` desaparece de novo; em 0,7 quem faz tudo certo termina com
menos de um ponto de apoio.

**A medalha não era culpa da Inércia.** Com `subsidyBite: 0` a melhor jogada ainda dá 2,5101 °C, e
**sem Inércia nenhuma** comprar Sociedade já dava 2,5057 °C — acima do teto de 2,5. O subsídio
contribui com 0,0096 °C. A armadilha do `P3-04` é anterior a esta tarefa e não se conserta afinando
o antagonista, então o teto do Bronze foi para 2,55 °C, que é o conserto que o `BALANCEAMENTO.md` já
tinha medido e adiado. **Decidido no chat**, porque mexe na tabela do `§2.7` e puxa uma decisão do
`P8-02` para cá.

### O que se ganhou

| | Antes | Depois |
|---|---|---|
| Melhor jogada | 2,4652 °C · Bronze | 2,5197 °C · **Bronze, viva** |
| Quem pula Sociedade | melhor jogada, Bronze | **dissolvida em 2095** |
| Janela de perdão fecha em | 2055 | **depois de 2065** |
| Derrota por apoio | só por evento | **alcançável por estratégia** |

A inversão que o `P3-05` procurava está de pé e testada: **a partida que mais corta emissão não é a
que sobrevive.** Quem ignora Sociedade termina mais frio e é dissolvido.

**E o que se pagou, registrado como teste em vez de escondido:** com a faixa do Bronze mais larga,
de ~2070 em diante largar o controle também termina em Bronze — continuar jogando e desistir
separam-se por 0,005 °C. Está no `tests/inercia.test.ts` como `ACHADO`, e o conserto é a escala de
medalhas, no `P8-02`.

### O modelo do P3-05 virou contrato, em vez de virar lixo

Com o engine aplicando a Inércia sozinho, o `tests/inercia-modelo.ts` passaria a somar o efeito duas
vezes — e foi exatamente o que aconteceu na primeira rodada de testes. Em vez de aposentá-lo, o
`tests/inercia.test.ts` agora **cobra que a implementação concorde com ele função por função**, sobre
estados tirados de uma partida de verdade. É o que impede o engine de derivar em silêncio dos
números que o `docs/INERCIA.md` publica.

### Um defeito que só o navegador achou

O HUD mostrava **INÉRCIA 0** e o botão dizia **Disponível** logo abaixo: a Inércia estava em 0,4,
arredondada para zero na tela, e a guarda do `canContain` recusava só em `<= 0`. O jogador gastaria
30 PAC para derrubar algo que não tinha como enxergar. Consertado nos dois lados de uma vez — o HUD
**trunca** a Inércia (a mesma razão do PAC: o número na tela não promete o que a ação vai negar) e a
guarda recusa abaixo de 1. Os dois testes que trancam isso citam o navegador.

- **Como verificar:**
  ```bash
  npm run typecheck && npm run test && npm run lint && npm run build && npm run format:check
  # 375 testes em 21 arquivos
  npm run dev   # compre "Educação climática" e o botão de conter destrava
  ```
  Os aceites são os quatro `ACEITE` do `tests/inercia.test.ts`, o do `tests/outcome.test.ts` ("só
  cortar termina mais frio e ainda assim perde") e o do `tests/planilha.test.ts`.

  **Conferido no navegador**, com os quatro estados do botão: bloqueado → disponível → clicado (30
  PAC cobrados, Inércia de 66 para 41) → PAC insuficiente. A partida de 2076 foi produzida rodando o
  `advanceTick` do próprio jogo no console até a Inércia passar de 60 e gravando com o `saveGame` —
  esperar isso jogando levaria vinte minutos. O save de teste foi devolvido como estava.
- **Pendente:**
  - **A faixa do Bronze ficou larga demais.** Largar o controle depois de ~2070 ainda dá medalha. É
    o preço documentado da mudança de teto, e o conserto é a escala de medalhas — `P8-02`.
  - **Os recuos regulatórios, a terceira ação do `§2.6`, não foram implementados.** O `P3-05` os
    deixou fora da verificação por não carregarem peso mecânico; pô-los no jogo sem número medido
    seria pôr um efeito que ninguém pesou.
  - **A alternância das ações é determinística.** Um jogador atento vai perceber que subsídio e
    desinformação se revezam a cada seis meses. Sortear faria a partida depender da seed por um
    motivo que ele não tem como ler; vale reavaliar depois do `P8-01`.
  - **A contenção não avisa quando acontece.** Diferente do evento crítico, ela não pausa nem mostra
    cartão — o jogador clica e vê dois números mudarem no HUD. Vale um retorno visual no `P7-04`.
  - **Nada impede gastar 30 PAC com a Inércia em 5.** A guarda só cobre o zero; conter 5 pontos pelo
    preço de 25 é uma jogada ruim que o jogo permite. Se o `P8-01` mostrar gente caindo nisso, o
    conserto é um piso, não uma trava.
  - **A política do jogador simulado continua sendo "contenha acima de 70".** Um humano vai jogar
    diferente, e é o `P8-01` que descobre como.
  - `P1-04` e o `theme.css` do `P5-02` seguem abertos.
- **Evidência:** `docs/evidencias/2026-08-23-p7-03-inercia-no-hud-e-contencao.jpg` — 2079, Inércia 45 no HUD e o botão de conter sem PAC para agir

---

## 2026-08-23 — Os eventos chegaram à tela, e os críticos param o relógio

- **Parte / tarefa:** `P7-02` ✔
- **O que mudou:**
  - `src/ui/event-cards.ts` e `src/ui/event-cards.css` **criados** — o cartão com nome, região, ano e o fato real, mais o aviso da auto-pausa.
  - `src/engine/events.ts` — `CARD_TICKS` exportado; `eventById`, `startTickOf` e `isCritical` novos.
  - `src/ui/controls.ts` — `pause` idempotente e o comando `{ kind: 'pause' }`; o `applyCommand` virou `switch`.
  - `src/data/balance.json` + o tipo `Balance` — `criticalEventSupport: 2.5`.
  - `src/data/i18n.ts` — o bloco `events`. `index.html` — a seção `#eventos`. `src/main.ts` — a ligação e a auto-pausa.
  - `docs/GDD.md §4` e `docs/BALANCEAMENTO.md` — a constante nova, com a medição que a escolheu.
  - `tests/event-cards.test.ts` (17) e `tests/event-cards.dom.test.ts` (14) **criados**; `events.test.ts` +11, `controls.test.ts` +4. Suíte: 291 → **334**.

### O problema que esta tarefa existia para resolver

O `PROGRESSO.md` do `P7-01` registrou, com todas as letras, que nenhum evento aparecia na tela e
que aquilo era "a pior versão possível desta mecânica". Era mesmo: o apoio caía, o PAC sumia, e as
dez fontes científicas que custaram a maior parte daquela sessão não chegavam a ninguém. Agora o
fato real fica no cartão, que é onde ele sempre precisou estar.

### Como a tela sabe que um evento é novo — sem tocar no contrato

Este era o problema difícil, e a solução é a decisão central da tarefa. O relógio do `P6-04`
entrega **até 12 ticks num quadro só** quando a aba volta do segundo plano, e nesse intervalo até
doze eventos podem ter entrado e saído. Comparar as duas listas não resolve: o `ageCards` recria
todos os objetos a cada mês, então nem a identidade nem o conteúdo distinguem um cartão velho de
um novo.

**A idade já estava codificada no `ticksRemaining`, e é exata.** O `advanceEvents` envelhece todo
cartão em 1 por tick e cria no máximo um por tick com `CARD_TICKS` cheio — logo
`startTick = tick − (CARD_TICKS − ticksRemaining)`, sem ambiguidade. A alternativa era gravar um
`startedTick` no `ActiveEvent`, subindo o `SAVE_VERSION` para guardar um número dedutível.

O preço é o acoplamento ao `CARD_TICKS`: se um dia a duração do cartão variar por evento, isso
quebra. Por isso o `ACEITE` do `tests/events.test.ts` **não confere a aritmética contra ela mesma**
— roda os 900 ticks, anota por fora o tick em que cada evento de fato entrou, e cobra a dedução
contra o registro. São mais de mil conferências, e o teste também cobra a invariante de que nunca
nasce mais de um cartão por tick, que é de onde a chave `id@tick` tira a unicidade.

### O limiar de "crítico" foi contado, não escolhido

Uma partida tem **279 eventos** em 22,5 minutos — um a cada 4,8 segundos. A pergunta não era
"o que é grave", era "quantas vezes o jogo pode interromper quem está jogando":

| `criticalEventSupport` | Pausas na melhor jogada | Uma a cada | Veredito |
|---|---|---|---|
| 2,0 | 52 | ~26 s | o jogo vira um soluço |
| **2,5** | **10** | **~2,2 min** | **escolhido** |
| 3,0 | 1 | a partida inteira | a mecânica não se paga |

O eixo é o `impact.support` e não a soma dos três, e a razão não é conveniência: **o apoio é o
único campo do `impact` ligado a uma condição de fim** (`§2.7`). Crítico quer dizer *ameaça
encerrar a partida*. A soma daria os mesmos dois eventos, mas por coincidência.

Cai de graça uma propriedade boa: a ressaca e o colapso de safra só existem acima de 2 °C, então
**nenhuma interrupção acontece na primeira metade da partida**. A década silenciosa que o `P7-01`
construiu de propósito continua silenciosa. Numa partida sem compra nenhuma, que morre em 2089,
são 17 pausas.

### Duas armadilhas pequenas que teriam passado

- **`togglePause` não serve para auto-pausa.** Um evento crítico caindo em cima de uma pausa do
  jogador faria o tempo **voltar a correr** sem ninguém ter pedido. Por isso entrou o `pause`
  idempotente, com teste próprio dizendo exatamente isso.
- **`auto-fit` esticava o cartão pela tela inteira.** Com um único evento em cena, o `auto-fit`
  colapsa as colunas vazias e uma frase de duas linhas virava uma caixa de 1500 px. Achado no
  navegador, não no teste — `auto-fill` mantém a coluna e o cartão tem sempre o mesmo tamanho.
  Pelo mesmo motivo, o nome do evento agora fica sempre em linha própria: antes ele cabia ao lado
  da etiqueta quando era curto e quebrava quando era longo.

### O que a lista faz e o que ela recusa fazer

A lista é **reconstruída só quando muda de verdade** — o `renderEventCards` compara as chaves antes
de mexer no DOM. Sem isso, a seleção de texto de quem estivesse lendo uma frase seria apagada a
cada 1,5 s. Nada dentro da seção é focável, e é o que torna a reconstrução segura (o `tree.ts`
precisa do contrário, e registra por quê).

O `aria-live` fica **só no aviso de pausa**, não na lista: anunciar os 279 eventos de uma partida
deixaria a tela impossível de usar com leitor de tela; os críticos são ~10.

- **Como verificar:**
  ```bash
  npm run typecheck && npm run test && npm run lint && npm run build && npm run format:check
  # 334 testes em 19 arquivos
  npm run dev   # aperte 4 e espere: o cartão entra com o fato real
  ```
  Os aceites são o `ACEITE` do `tests/events.test.ts` (a idade deduzida bate com a real numa
  partida de verdade) e o do `tests/event-cards.test.ts` (a auto-pausa interrompe ~10 vezes, não
  ~50).

  **Conferido no navegador**, e vale registrar como: esperar um evento crítico jogando levaria
  vinte anos de jogo. Em vez disso, o `advanceTick` do próprio jogo foi rodado no console até
  achar o mês do primeiro crítico (2072), o save foi gravado **um mês antes** pelo `saveGame` do
  jogo, e os últimos meses correram sozinhos na tela. O estado é o que o engine produz — mesmo
  caminho de código de quem joga —, e a auto-pausa aconteceu ao vivo. O save de teste que estava
  no `localStorage` foi devolvido como estava.
- **Pendente:**
  - **A auto-pausa perde um crítico depois de a aba ficar parada — e isso foi visto acontecer, não
    deduzido.** O lote do relógio vai a 12 ticks e o cartão vive 6: um crítico que apareça e vença
    dentro do mesmo lote já saiu de cena quando o `checkAutoPause` roda. Na primeira tentativa de
    fotografar a auto-pausa, a aba estrangulada entregou os ticks 568 a 577 num quadro só; o
    colapso de safra do tick 570 nasceu e morreu ali dentro, e o jogo não parou. Repetindo com o
    save um mês antes do evento, parou na hora. Consertar exigiria o engine chamar de volta a UI a
    cada passo — o `§3` não deixa.
  - **O cartão não diz quanto o evento tirou.** Decidido no chat: o dano depende da resiliência no
    instante da pancada e a resiliência muda depois, então recalcular mostraria um número diferente
    do que foi cobrado. Guardar o aplicado exige campo novo no `ActiveEvent` e `SAVE_VERSION` novo
    — é do `P7-04`.
  - **A 4x o cartão fica 2,25 s na tela.** Seis meses de jogo é pouco tempo real para ler uma
    frase. Os críticos pausam, então esses dão tempo; os moderados, não. Vale medir no `P8-01`.
  - **Se a Prata algum dia virar alcançável, quem ficar abaixo de 2 °C nunca verá uma auto-pausa.**
    É defensável — não houve catástrofe para interromper ninguém — mas é consequência a lembrar.
  - A colisão `P3-05` × `P7-01` segue registrada e não resolvida (`P8-02`). O `impact.economy`
    continua sem função mecânica. `P1-04` e o `theme.css` do `P5-02` seguem abertos.
- **Evidência:** `docs/evidencias/2026-08-23-p7-02-cartao-de-evento-e-auto-pausa.jpg` — 2072, três cartões em cena, o crítico com a faixa laranja e o aviso da pausa acima deles

---

## 2026-08-20 — Os eventos entraram, o GDD §2.6 alcançou o P3-05, e a Inércia colidiu com eles

- **Parte / tarefa:** `P7-01` ✔ · pendência do `P3-05` (`docs/GDD.md §2.6`) ✔
- **O que mudou:**
  - `docs/GDD.md §2.6` **reescrito** — descreve o espelho, as três ações, a permanência do estrago e as duas metades do contra-ataque, incluindo a contenção que o `P3-05` propôs.
  - `src/engine/events.ts` **implementado** — o sorteio semeado, a mitigação por resiliência e a resolução. Era placeholder desde o `SETUP-05`.
  - `src/data/events.json` **preenchido** — 10 eventos, com fonte fixada para cada fato.
  - `src/engine/state.ts` — `parseEvents` e a lista `climateEvents`, no mesmo padrão do `parseRegions` e do `parseSkills`.
  - `src/engine/tick.ts` — os eventos entram por último no tick, e o cabeçalho deixou de dizer que faltavam.
  - `docs/CIENCIA.md` — os 10 fatos com fonte, 5 tabelas novas de referência.
  - `docs/BALANCEAMENTO.md` — o custo dos eventos, a rampa de frequência, as duas afinações e a colisão.
  - `tests/events.test.ts` **criado** (30). Seis testes existentes reescritos. Suíte: 262 → **291**.

### O sorteio, e o que ele tem para ensinar

O peso segue a fórmula do `§2.5` que já estava escrita no arquivo vazio, com o
`eventWeightPerDegree` de 1,8 que estava no `balance.json` e **nunca tinha sido lido por ninguém**.
A rampa que sai dela é o argumento inteiro do jogo virado mecânica:

| Temperatura | Eventos destravados | Por ano |
|---|---|---|
| 1,37 °C (início) | 1 de 10 | 0,45 |
| 1,9 °C | 8 | 3,3 |
| 2,45 °C | 10 | 5,8 |
| 3,0 °C | 10 | 8,2 |

A primeira década é quase silenciosa **de propósito**: dá ao jogador tempo de agir antes de o mundo
cobrar. Quem demora sente o mundo piorar em vez de ler sobre isso num cartão.

**O `advanceTick` passou a consumir o gerador**, e era a primeira vez. Havia um teste que cobrava
que ele *não* sorteava, com o aviso de que deveria falhar no dia em que isso mudasse. Falhou; foi
substituído pelo teste inverso.

### As dez fontes foram buscadas e conferidas

A decisão do chat foi fixar fonte antes de escrever, e foi o que levou mais tempo desta tarefa.
O `ipcc.ch` recusa fetch, então cinco fatos do **[AR6]** foram confirmados por fontes secundárias
que os citam, e os outros cinco vêm de UNEP, NOAA Coral Reef Watch, NOAA GFDL, WMO e um artigo
revisado por pares sobre dengue — todos com link no `docs/CIENCIA.md`.

**Três frases foram escritas defensivamente, e a coluna de observação diz por quê:** o ciclone fala
em *proporção* de categorias 3–5 e não em número absoluto, porque é isso que o AR6 afirma; o
deslizamento diz "na Alta Ásia", porque o resultado é regional; e o colapso de safra relata o número
da insegurança alimentar **sem afirmar a causa**, porque o próprio WMO atribui a clima, conflito e
economia juntos.

### Duas afinações que vieram da medição, não do gosto

- **O impacto de apoio caiu para ~40% do primeiro chute.** Na primeira versão o apoio médio zerava
  em toda estratégia e a partida bem jogada **morria em 2096** — o jogo deixava de ser vencível. O
  dreno tinha de caber nos ~50 pontos entre o apoio inicial e a dissolução. Hoje quem joga bem
  termina entre 6 e 12, conferido em cinco seeds, e **as cinco dão Bronze**.
- **A resiliência ganhou piso de 0,25 no fator de dano.** As 8 regiões começam em 50 e a árvore
  oferece +50 — o que dá 100, e `1 − 100/100` é **dano zero**. Sem o piso, o último nó de
  resiliência viraria botão de imunidade. Com ele, investir tudo corta o dano pela metade. É também
  a única leitura honesta do que adaptação faz: dique reduz estrago, não cancela enchente.

**A derrota por apoio deixou de ser decorativa.** A regra está no `§2.7` desde o `P6-08`, testada,
e nada no jogo conseguia dispará-la. Os eventos furam o piso de apatia — que o `tick.ts` já previa,
por escrito, desde o `P6-03`.

### A colisão com o `P3-05`, que era a pergunta em aberto

O `docs/INERCIA.md` fechou pedindo que quem fizesse o `P7-01` rodasse a verificação da Inércia de
novo. Rodou, e **ela quebrou**:

| Estratégia | Só com eventos | Com eventos **e** a Inércia proposta |
|---|---|---|
| Corta bem, ignora Sociedade | 2,4652 °C · **Bronze** | 2,4819 °C · **Bronze** |
| Compra Sociedade e contém | — | 2,5197 °C · **sem medalha** |

Não é bug de nenhum dos dois: é o orçamento de dano estourando. A melhor jogada termina a 0,06 °C
do teto do Bronze, e os dois sistemas somados consomem mais que isso. Pior, **a inversão que o
`P3-05` tinha conseguido desapareceu** — com eventos em cena, comprar Sociedade volta a custar a
medalha.

Os três aceites da Inércia foram **reescritos invertidos**, marcados com `COLISÃO`, e é para eles
falharem no dia em que houver espaço de novo. O conserto mais barato medido é mover o teto do Bronze
de 2,5 para ~2,55 °C — mudança de balanceamento sem playtest, ou seja o risco `R2`, e por isso fica
para o `P8-02`.

### Um contador que mentia

O teste "a armadilha virou obrigação" contava contenções como "os meses em que a Inércia caiu". Mas
o termo de amortecimento do próprio crescimento também a derruba quando há apoio acima do piso —
então o teste dizia que um jogador **sem** o ramo Sociedade continha, o que é impossível por
construção. Agora o `step` devolve uma bandeira explícita.

- **Como verificar:**
  ```bash
  npm run typecheck && npm run test && npm run lint && npm run build && npm run format:check
  # 291 testes em 17 arquivos
  ```
  Os aceites são os quatro `ACEITE` do `tests/events.test.ts` — o mundo piora com a temperatura, a
  derrota por apoio fura o piso, quem não faz nada ainda perde em **2089**, e o apoio termina bem
  abaixo do piso. O `docs/CIENCIA.md` tem as 10 fontes.
- **Pendente:**
  - **A colisão do `P3-05` está registrada, não resolvida.** É `P8-02`, e o `BALANCEAMENTO.md` tem
    o número do conserto.
  - **Nenhum evento aparece na tela ainda.** O `activeEvents` enche e esvazia, e nada o mostra — o
    cartão com o fato real e a auto-pausa são o `P7-02`. Até lá o jogador sente o efeito sem saber
    o motivo, que é a pior versão possível desta mecânica. **É a próxima tarefa natural.**
  - **O `impact.economy` não faz nada mecanicamente.** O campo é aplicado e o `economy` da região
    cai, mas nenhuma regra lê esse número — nem o `outcome.ts`, nem o custo de habilidade. Ele está
    ali porque o contrato do `§3` o define; quem lhe der função é o `P7-04` ou o `P8-02`.
  - **O `SAVE_VERSION` não subiu, e vale conferir.** O `activeEvents` já era campo do `GameState` e
    já era salvo; o que mudou é que agora ele vem preenchido. Um save antigo carrega com a lista
    vazia e funciona — mas eu não testei um save gravado antes do `P7-01`.
  - **A duração de evento não existe.** O impacto é instantâneo e o `ticksRemaining` só controla
    quanto tempo o cartão fica em cena. Dano contínuo exigiria campo novo no `ClimateEvent` do `§3`,
    que o `§12` proíbe mexer sem pedir.
  - Continuam faltando os prints para `docs/evidencias/`; a extensão do Chrome não conectou.
  - `P1-04` segue aberto; o `theme.css` do `P5-02` continua sem existir.
- **Evidência:** —

---

## 2026-08-20 — A Inércia especificada e verificada: a Parte 3 fechou

- **Parte / tarefa:** `P3-05` ✔ — **Parte 3 completa** (6 de 6)
- **O que mudou:**
  - `docs/INERCIA.md` **criado** — gatilho, ações, contra-ataque e os números, com o resultado da verificação.
  - `tests/inercia-modelo.ts` **criado** — a regra proposta, aplicada **por fora** do engine.
  - `tests/inercia.test.ts` **criado** — a verificação, com oito asserções.
  - `tests/planilha-relatorio.ts` — o CSV da verificação.
  - `docs/planilha/inercia-verificacao.csv` **novo**.
  - `PLANO.md` — o checkbox.
  - Suíte: 254 → **262**. **Nenhum arquivo de `src/` foi tocado, e nenhuma constante do `balance.json` mudou.**

### O resultado

| | Sem Inércia | Com a proposta |
|---|---|---|
| Medalha travada em | 2055 | **2080** |
| Minutos mortos a 1x (de 22,5) | 13,8 | **6,3** |
| Melhor jogada | 2,4400 °C · Bronze | 2,4938 °C · **Bronze** |
| Quem pula o ramo Sociedade | melhor jogada | **derrota por apoio em 2089** |
| Derrota por apoio | inalcançável | **alcançável** |

A meta acordada no chat era segurar a disputa até ~2075. Chegou a **2080**, e o Bronze continua ao
alcance com 0,006 °C de folga.

### As duas medições que deram errado, e o que elas ensinaram

**A primeira tentativa era doze vezes forte demais.** Com os números que eu tinha escolhido por
intuição — e escrito no comentário como se fossem óbvios — a partida bem jogada terminava em
**3,13 °C**, que é derrota. Foi a primeira coisa que a sonda disse. Uma varredura sobre
`subsidyBite`, `disinformationBite`, o espelho e o custo da contenção achou a faixa que funciona.

**A segunda foi mais interessante, porque o desenho estava errado, não o número.** Na primeira
versão a contenção era um gasto de PAC solto, disponível desde 2025. A varredura mostrou que ela
neutralizava a Inércia inteira **mais barato do que o ramo Sociedade** — ou seja, eu tinha
**agravado** a armadilha do `P3-04` em vez de curá-la: agora o ramo não só não compensava como
tinha um substituto melhor.

O conserto foi condicionar a contenção a `climate-education`, com desconto por nó de Sociedade
comprado. O ramo deixa de ser um bônus de PAC que não se paga e passa a ser a **licença para lutar**.
Isso inverteu tudo de uma vez, e é a decisão central do arquivo.

### O dilema que saiu disso

**A partida que mais corta emissão não é a que sobrevive.** Quem pula Sociedade e compra só cortes
termina em **2,4556 °C** — mais frio que a melhor jogada — e **é dissolvido por falta de apoio em
2089**. O jogador escolhe entre o número bonito e continuar existindo. É a primeira vez que a
derrota por apoio do `§2.7`, escrita e testada desde o `P6-08`, tem como disparar.

### O que o engine já tinha pronto para este dia

Duas peças, escritas em tarefas anteriores com este momento em mente:

- o `climate.ts` diz *"A Inércia (P7-03) age por cima deste crescimento, não no lugar dele"* — e é
  exatamente onde o subsídio entra;
- o `tick.ts` diz *"Quem já está no piso ou abaixo dele não se move (…) Furar o piso é trabalho de
  evento e da Inércia"* — e é o que permite à desinformação levar o apoio a zero.

Nenhuma das duas precisou mudar. O protótipo é uma camada por cima do engine público.

### Uma constante existente é contrariada, de propósito

O `inertiaGrowthPerYear` está no `balance.json` em **2** desde o começo e **nunca foi lido por
ninguém**. A proposta pede **0,5**: com 2 ao ano a Inércia satura em 100 antes de 2075 contra um
jogador que não fez nada — o antagonista venceria sozinho e o espelho do `§2.6` viraria enfeite.
É a única contradição com um valor existente, e como ninguém lê a chave hoje, mudá-la não quebra nada.

- **Como verificar:**
  ```bash
  npm run typecheck && npm run test && npm run lint && npm run build && npm run format:check
  # 262 testes em 16 arquivos

  md5sum docs/planilha/* > /tmp/antes && npm run test && md5sum docs/planilha/* | diff /tmp/antes -
  ```
  Os aceites são os dois primeiros testes do `tests/inercia.test.ts` — "quem joga bem ainda ganha
  Bronze" e "e isso sem mexer em nenhum número do balance.json". A tabela completa está em
  `docs/INERCIA.md`; os dados, em `docs/planilha/inercia-verificacao.csv`.
- **Pendente:**
  - **A contenção é mecânica nova, além do que o `docs/GDD.md §2.6` descreve.** Foi decidida no chat
    e está registrada no `INERCIA.md`, mas o GDD continua descrevendo só as três ações e a árvore
    como contra-ataque. É a mesma dívida que o `§2.7` tinha antes do `P3-06` — vale um parágrafo
    antes de o `P7-03` começar.
  - **A tensão ainda decai, só que mais devagar.** De 2080 a 2100 continua sem nada em jogo — 6,3
    minutos. Fechar o resto exige a alavanca 4 do `CURVA-DE-DIFICULDADE.md` (realimentações do ciclo
    de carbono), que precisa de fonte no `docs/CIENCIA.md` antes de virar número.
  - **A verificação usa uma política de jogador simplificada** — "contenha acima de 70, senão compre
    o próximo da lista". Um humano joga diferente; quem descobre como é o `P8-01`.
  - **A Inércia e os eventos do `P7-01` não foram medidos juntos.** Os dois derrubam apoio e os dois
    escalam com o estado do mundo; somados, podem tornar a derrota por apoio fácil demais. Quem
    fizer o `P7-01` roda esta verificação de novo — é `npm test`.
  - **Nenhum número foi aplicado.** Tudo vive em `tests/`. Quem move para o `balance.json` é o
    `P7-03`, e as oito chaves novas estão listadas no `INERCIA.md`.
  - **Continuam faltando os prints** de `curvas.html` e `tensao.html` para `docs/evidencias/` — a
    extensão do Chrome não conectou em nenhuma tentativa desta sessão.
  - `P1-04` segue aberto; o `theme.css` do `P5-02` continua sem existir.
- **Evidência:** — (faltam os prints das duas páginas geradas)

---

## 2026-08-20 — A curva de dificuldade medida: o jogo tem nove minutos de jogo e treze de espera

- **Parte / tarefa:** `P3-03` ✔
- **O que mudou:**
  - `docs/CURVA-DE-DIFICULDADE.md` **criado** — a leitura de Fluxo, os três problemas e a especificação do que precisa existir para a partida seguir tensa até 2100.
  - `tests/tensao.test.ts` **criado** — a medição, com sete asserções.
  - `tests/planilha-engine.ts` **criado** — o motor de simulação, extraído do `planilha.test.ts` para ser compartilhado pelas duas sondas. Ganhou o `playOut`, que bifurca a partida a partir de um estado qualquer.
  - `tests/planilha-relatorio.ts` — o CSV e a página da tensão.
  - `docs/planilha/` — `tensao-por-ano.csv` e `tensao.html` **novos**.
  - `PLANO.md` — o checkbox.
  - Suíte: 247 → **254**. **Nenhum arquivo de `src/` foi tocado.**

### A tensão virou número, e o número é a decisão que segura o documento

O problema de aplicar Teoria do Fluxo aqui é que o canal entre ansiedade e tédio é definido por
"desafio contra habilidade" — e num jogo de estratégia com pausa não há execução para errar. Medir
dificuldade por tempo de reação não diria nada.

O que separa canal de tédio neste jogo é outra coisa: **ainda existe decisão capaz de mudar o
desfecho?** E isso é mensurável direto. No ano Y, pega-se a partida como ela está e joga-se dela em
diante de dois jeitos — o melhor possível e o pior possível. A distância entre os dois finais **é** a
tensão. Zero significa que o jogo acabou, mesmo que o relógio não saiba.

Isso só foi possível porque o `advanceTick` é puro: bifurcar a partida é chamar a mesma função duas
vezes com o mesmo estado. A regra do `§4` que parecia burocracia pagou uma conta concreta hoje.

### O que a medição achou

| Marco | Ano | Minuto a 1x |
|---|---|---|
| A medalha trava — largar tudo e jogar perfeito dão o mesmo | **2055** | 9 de 22,5 |
| A janela de perdão fecha — quem não agiu já perdeu | **2071** | 13,8 |
| A tensão chega a zero absoluto | **2090** | 19,5 |

**25 dos 76 anos têm menos de 0,01 °C em jogo.** Nove minutos de jogo, treze e meio de espera — 60%
do tempo de tela é o jogador assistindo a uma conclusão que ele já escreveu. No Modo Feira, a 4x, a
proporção é idêntica.

**A assimetria é o pior achado, e eu não esperava por ele.** Entre 2055 e 2071 há dezesseis anos em
que quem está engajado já não tem nada a decidir, mas quem está parado ainda pode piorar. **O jogo
para de recompensar a ação antes de parar de punir a inação** — exatamente ao contrário do que o
canal do Fluxo pede. Quem joga bem entra no tédio primeiro.

**E há doze decisões em vinte e dois minutos**, uma a cada 113 segundos — nenhuma delas difícil,
porque a ordem gulosa é ótima e uma busca de 200 permutações não achou nada melhor. A fantasia do
`GDD §1` é "escolher o que sacrificar". Hoje não há sacrifício: há fila.

### A boa notícia enterrada: falta muito menos do que parece

A partida ótima termina em 2,44 °C e o teto do Bronze é 2,50 — folga de **0,06 °C**, ou 133 Gt de
CO₂ pelo TCRE. E em 2055, o momento em que a medalha trava, a diferença entre largar tudo e jogar
perfeito é **0,0508 °C**. **A medalha trava por nove milésimos de grau.** O jogo não está decidido
por goleada.

Daí saiu a especificação, que é uma conta simples e está no documento: manter a disputa viva até
2070 exige uma força capaz de agravar as emissões em ~34% (4,4 Gt/ano); até 2090 exigiria dobrá-las,
o que é caro demais. **Alvo prático: disputa até ~2075, e os últimos 25 anos como desfecho** — de
60% de tempo morto para 25%.

### A causa raiz não é balanceamento

Os três problemas têm a mesma origem: **hoje a trajetória só melhora.** Nenhuma força tira do
jogador o que ele construiu — nó comprado é permanente, apoio não cai abaixo do piso, e a emissão de
base é uma curva fixa que a árvore só reduz. Num jogo assim tensão só pode decair, e há um teste
travando exatamente essa propriedade ("a tensão só cai") **para que ela falhe** no dia em que
deixar de ser verdade.

Por isso o documento não propõe mexer em `basePointsPerYear`, em custo de nó nem em limiar de
medalha. A partida não é curta demais nem cara demais — ela é **unidirecional**.

**Dois dos quatro itens da lista para o `P7-01` e o `P7-03` não custam nenhum número novo:** fazer a
derrota por apoio ser alcançável e fazer os eventos escalarem com a temperatura. O primeiro conserta,
de quebra, o "ramo Sociedade é uma armadilha" do `P3-04` — ele defende contra um perigo que ainda não
existe.

- **Como verificar:**
  ```bash
  npm run typecheck && npm run test && npm run lint && npm run build && npm run format:check
  # 254 testes em 15 arquivos

  md5sum docs/planilha/* > /tmp/antes && npm run test && md5sum docs/planilha/* | diff /tmp/antes -
  # os 6 arquivos saem byte a byte iguais
  ```
  Abra `docs/planilha/tensao.html`: a curva cai de 0,91 °C para zero, com os marcos de 2055 e 2071
  desenhados. A leitura completa está em `docs/CURVA-DE-DIFICULDADE.md`.
- **Pendente:**
  - **Não abri a `tensao.html` num navegador** — mesma limitação da entrada anterior, a extensão do
    Chrome não conectou. Conferi por varredura: 76 pontos dentro do `viewBox`, sem `NaN`, tags
    balanceadas, os dois marcos presentes. **Falta o olho humano**, e faltam os dois prints que o
    `§11` pede para `docs/evidencias/`.
  - **A medição é de um jogo incompleto.** Não existem eventos nem Inércia — os dois arquivos estão
    vazios. Todo número do documento vai mudar quando eles entrarem, e é por isso que ele existe: é
    a linha de base contra a qual medir se esses sistemas fizeram o trabalho.
  - **Quatro testes do `tensao.test.ts` estão escritos para falhar um dia.** Os três `ACHADO` e o "a
    tensão só cai" registram o problema, não a qualidade. Quando o `P7-01` e o `P7-03` entrarem, o
    conserto é **apagá-los**, não afrouxá-los.
  - **O `P3-05` (especificação da Inércia) ficou com o trabalho meio feito por esta tarefa.** A
    quantidade de dano que a Inércia precisa causar está medida; o que falta é gatilho, cadência e
    contra-ataque. Quem for fazer o `P3-05` começa pela tabela de Gt/ano do documento.
  - **A extração do `planilha-engine.ts` mexeu em código que ainda não foi commitado.** O
    `planilha.test.ts` encolheu e passou a importar o motor; os 10 testes dele continuam passando
    idênticos. Vale conferir esse pedaço do diff com atenção, porque é refatoração em cima de
    trabalho da mesma sessão.
  - `P1-04` segue aberto; o `theme.css` do `P5-02` continua sem existir.
- **Evidência:** — (faltam os prints da `curvas.html` e da `tensao.html`)

---

## 2026-08-20 — A planilha dos 75 anos saiu do engine, e achou uma armadilha na árvore

- **Parte / tarefa:** `P3-02` ✔ · `P3-04` ✔
- **O que mudou:**
  - `tests/planilha.test.ts` **criado** — a simulação das quatro estratégias e os aceites das duas tarefas.
  - `tests/planilha-relatorio.ts` **criado** — a escrita dos CSV e da página de curvas. Não termina em `.test.ts`, então o vitest não o roda como suíte; é importado.
  - `tests/node-io.d.ts` **criado** — os tipos de `node:fs` que a escrita usa, declarados à mão.
  - `docs/planilha/` **criada** — `partidas.csv`, `economia-pac.csv`, `economia-quando-comprar.csv` e `curvas.html`. **Gerados, não escritos.**
  - `docs/BALANCEAMENTO.md` — os três achados abaixo, com as tabelas completas.
  - `.prettierignore` — a pasta gerada.
  - `PLANO.md` — os dois checkboxes.
  - Suíte: 237 → **247**. **Nenhum arquivo de `src/` foi tocado.**

### A planilha é gerada pelo engine de produção, e essa é a decisão que segura a tarefa

O `PLANO.md` pedia uma planilha, e o caminho óbvio era montar uma no Excel. Uma planilha escrita à
mão responde a pergunta no dia em que foi escrita e mente a partir do dia seguinte, porque o
`balance.json` muda e ela não — que é exatamente o modo de falhar que o `R2` descreve. Aqui os
números saem do mesmo `advanceTick` e do mesmo `unlockSkill` que o jogador roda.

Três consequências saem de graça. **Os arquivos são regravados a cada `npm test`** — a partida é
determinística, então saem byte a byte iguais (conferido com `md5sum` antes e depois), e um
`git status` sujo em `docs/planilha/` depois de uma rodada **é o sinal** de que o balanceamento
mudou. **Os aceites viraram teste**: quem mexer num custo e quebrar a economia descobre pelo
`npm test`, não pela feira. E o CSV sai com `;` e vírgula decimal, porque num Excel em pt-BR o
formato americano abre com tudo empilhado numa coluna só.

**A estratégia é uma lista de desejos, não uma agenda datada.** Uma agenda ("compre solar em 2031")
quebra em silêncio quando um custo muda: a compra simplesmente não acontece e a curva piora sem
ninguém entender por quê. A lista pergunta ao `canUnlock` a cada mês e compra o primeiro item que
couber no bolso. Pelo mesmo motivo, a ordem "melhor" é **derivada do `skills.json`** por corte por
PAC, e não escrita à mão.

### O achado que inverteu a tarefa: o ramo Sociedade é uma armadilha

Comecei com uma estratégia chamada `otimo` que comprava `climate-education` e `treaties` primeiro, e
escrevi no comentário que era óbvio, porque os dois se pagam em ~20 anos. **O primeiro teste que
rodei falhou**, e falhou dizendo que a estratégia sem eles terminava mais fria.

A varredura mediu o efeito inteiro, e ela é **monótona**: quanto mais tarde os dois nós de PAC
entram, melhor a partida acaba. Nunca comprá-los é o melhor de todos.

| Sociedade comprada após | 2100 | Nós | PAC |
|---|---|---|---|
| 0 cortes | 2,4811 °C | 15 | 1047 |
| 8 cortes | 2,4558 °C | 14 | 955 |
| 16 cortes | 2,4482 °C | 14 | 867 |
| **nunca** | **2,4400 °C** | 12 | 750 |

A causa é a catraca do TCRE. Os 110 PAC dos dois nós são **onze anos** a 10 PAC/ano em que nenhum
corte foi comprado, e o CO₂ desses anos fica no ar para sempre. `sociedade-cedo` compra 3 nós a
mais, arrecada 297 PAC a mais e termina **emitindo menos** — e ainda assim mais quente. Não é bug:
numa partida mais longa ele venceria. É o horizonte de 75 anos que o condena, e o horizonte é o
jogo. **Um ramo dos cinco, 320 PAC de conteúdo, é hoje custo puro para quem joga para ganhar.**

**Está travado em teste, e o teste está escrito como registro de problema:** "no dia em que o
balanceamento fizer o ramo se pagar, é ele que deve falhar e ser reescrito" — a mesma forma do teste
de vitória inalcançável do `P6-08`.

### O `P3-04` bate o alvo, mas só na estratégia pior

A árvore custa **1600 PAC**; a base rende **750** em 75 anos.

| Cenário | Arrecadado | Falta |
|---|---|---|
| Sem tocar em Sociedade | 750 | **53,1%** |
| Com os dois nós de PAC, cedo | 1047 | **34,5%** |

O aceite do `PLANO.md` é "falta ~35%". **Atingido — 34,5% — pela linha que joga pior.** Quem joga
para ganhar fica com 53% da árvore fora de alcance, e os quatro nós de 140 PAC (35% do custo)
**nunca são vistos**: rodar a melhor ordem sem eles dá exatamente o mesmo 2,4400 °C, porque o
dinheiro acaba antes.

### O terceiro achado, que não era da tarefa e é o mais sério

A partida está decidida em 2060. **Ouro morre em 2032 em todas as estratégias**, faça o jogador o
que fizer — o `P6-05` suspeitava, agora está medido. Prata morre entre 2055 e 2060. Depois disso só
resta Bronze ou nada, e os últimos 40 anos — metade do tempo de tela — não têm nada em jogo. Entre
jogar bem e jogar mal há **0,09 °C**; entre jogar e não jogar, **0,91 °C**. O jogo distingue muito
bem agir de não agir, e quase nada agir bem de agir mal. É insumo direto do `P3-03`.

### Duas decisões de ferramenta que merecem um segundo olhar

- **`tests/node-io.d.ts` em vez de `@types/node`.** O `tsc` não tem tipos de Node — o projeto é
  tipado só para navegador (`lib: ES2022, DOM`), e a suíte passava no vitest mas o `typecheck` caía.
  Instalar `@types/node` resolveria e, de quebra, faria `process` e `Buffer` existirem **dentro de
  `src/`**, inclusive no `engine/`, que o `§3` quer sem noção de ambiente. Declarei à mão as três
  funções de `node:fs` que uso. **O risco é real e está escrito no arquivo:** tipo feito à mão não é
  conferido contra a implementação. Se preferir o pacote, é uma linha.
- **O caminho de saída é relativo (`docs/planilha`), não derivado de `import.meta.dirname`.**
  Derivar exigiria estender a interface `ImportMeta`, e o ESLint do projeto recusa `interface`
  (`consistent-type-definitions`) — só que `type` não funde declarações, então não havia saída
  limpa. O teste **lê os quatro arquivos de volta** e confere cabeçalho e contagem de linhas, para
  que um diretório de trabalho diferente caia na suíte em vez de deixar a planilha velha em
  silêncio.

- **Como verificar:**
  ```bash
  npm run typecheck && npm run test && npm run lint && npm run build && npm run format:check
  # 247 testes em 14 arquivos

  # determinismo — a prova de que a planilha nunca fica velha:
  md5sum docs/planilha/* > /tmp/antes && npm run test && md5sum docs/planilha/* | diff /tmp/antes -
  # sem diferença nenhuma
  ```
  Abra `docs/planilha/curvas.html` no navegador: as quatro curvas, com `nada` disparando para
  3,35 °C e as outras três se separando a partir de 2040. Os CSV abrem no Excel em pt-BR sem ajuste.
- **Pendente:**
  - **Não abri a `curvas.html` num navegador de verdade** — a extensão do Chrome não estava conectada
    nesta sessão. Conferi a estrutura por varredura: 4 curvas de 76 pontos, todas dentro do
    `viewBox`, sem `NaN`, tags balanceadas, rótulos em pt-BR. **Falta o olho humano**, e é o print
    que o `§11` pede para `docs/evidencias/`.
  - **Nenhum número de balanceamento foi mexido**, de novo por `R2`. Os três achados são material do
    `P3-03`, do `P3-05` e do `P8-02`. As quatro alavancas medidas estão no `BALANCEAMENTO.md`.
  - **A saída mais promissora para o ramo Sociedade não é ajustar número.** Ele defende contra um
    perigo que não existe: o `supportFloor` trava o apoio em 25 e nada o empurra para baixo. Quando
    o `P7-01` e o `P7-03` fizerem apoio e Inércia **ameaçarem a partida**, o ramo ganha função sem
    que um custo mude. Vale tentar isso antes de mexer no `basePointsPerYear`.
  - **A planilha simula um mundo sem eventos e sem Inércia**, porque eles não existem. Todo número
    aqui vai mudar quando o `P7-01` e o `P7-03` entrarem — e é justamente por isso que a planilha é
    gerada: ela se refaz sozinha.
  - **O ano da derrota aparece como 2089 na página e 2090 quando se varre o CSV.** Não é divergência:
    o `defeatYear` é medido a cada tick e o CSV só guarda dezembro de cada ano. Quem for comparar os
    dois precisa saber disso.
  - `P1-04` segue aberto: o `package.json` ainda diz `ponto-de-virada`.
  - O `theme.css` do `P5-02` continua sem existir.
- **Evidência:** — (falta o print da `curvas.html`, acima)

---

## 2026-08-20 — Duas pendências curtas fechadas: o GDD alcançou o código, e o tsunami saiu do jogo

- **Parte / tarefa:** `P3-06` ✔ · pendência do `P6-08` (`docs/GDD.md §2.7`) ✔
- **O que mudou:** só documentação. **Nenhum arquivo de código, de dados ou de teste foi tocado** — a suíte segue em 237, e o `dist/` sai idêntico.
  - `docs/GDD.md §2.7` **reescrito** — passa a descrever a regra que o `outcome.ts` executa desde o `P6-08`.
  - `docs/GDD.md §2.5` **reescrito** — o tsunami sai da lista de tipos, e a nota de honestidade científica deixa de fazer uma pergunta e passa a registrar a resposta.
  - `docs/CIENCIA.md` — a licença pendente do tsunami virou a decisão, com as três saídas avaliadas; e a seção "Fatos dos eventos" ganhou um aviso de fonte para o `P7-01`.
  - `docs/BALANCEAMENTO.md` — a linha que dizia "o `§2.7` do GDD ainda não descreve esse desfecho" deixou de ser verdade hoje; corrigida.
  - `PLANO.md` — `P3-06` marcado.

### O `§2.7` estava mentindo desde o `P6-08`

O GDD abre dizendo "se o código discordar deste arquivo, o código está errado". Desde 2026-08-19 o código discordava e **estava certo**: o `§2.7` prometia vitória por emissões líquidas ≈ 0, que a sonda do `P6-08` mediu como inalcançável, enquanto o `outcome.ts` já entregava medalha a quem chega vivo a 2100. Uma regra de fonte-da-verdade que o próprio time sabe estar desatualizada é pior que não ter regra nenhuma — é o que faz a próxima pessoa implementar o arquivo em vez do jogo.

O texto novo descreve o que o `outcomeOf` faz, na ordem em que ele pergunta, porque **a ordem é a regra**: derrota antes de tudo, zero líquido antes do horizonte. Ganhou a linha que faltava (chegar vivo a 2100 vale a escala de medalhas), a tabela com a quarta faixa que o texto antigo não tinha (`≥ 2,5 °C` → sobrevivência sem medalha), e duas correções de fidelidade ao código: o apoio derrota em `≤ 0` e não em `= 0`, e o zero líquido é `≤ 0,5 GtCO₂/ano`, que é o `netZeroEmissions` do `balance.json` — o "≈ 0" antigo não era um limiar, era um gesto.

**A justificativa entrou como citação, não como regra.** O parágrafo do TCRE e das 13 Gt/ano explica *por que* a medalha por horizonte existe; se um dia o balanceamento tornar o zero líquido alcançável, é a citação que sai, e a regra acima dela continua de pé.

### O tsunami: a decisão foi tirá-lo, não domesticá-lo

O `docs/GDD.md §2.5` oferecia duas saídas — tratar como elevação do mar com ressaca, ou marcar como licença explícita. **Nenhuma das duas foi escolhida.** Marcar como licença é honesto, mas cada evento tem **uma** frase educativa, e ela seria gasta explicando o que o evento *não* é: um cartão que ensina "isto aqui não é ciência" é um cartão desperdiçado num jogo cujo objetivo é o ODS 13.

Uma terceira saída apareceu na avaliação e também foi recusada: existe **um** elo real entre aquecimento e tsunami — o degelo desestabiliza encostas em fiorde e gera onda de deslizamento (Groenlândia, 2017; Barry Arm, no Alasca, sob vigilância). É verdadeiro e citável, mas é fenômeno polar de nicho, e as 8 macrorregiões do `§2.3` não têm onde colocá-lo sem que ele fique restrito a duas delas.

**O evento virou ressaca e maré de tempestade sobre um mar mais alto.** É a mesma imagem que o conceito original queria — a costa engolida pela água — com a diferença de ser inteiramente climático, ter limiar de temperatura que faz sentido mecânico (só entra quando o mar já subiu) e não precisar de ressalva nenhuma.

**A entrada no `CIENCIA.md` ficou mesmo não havendo licença a registrar.** Uma seção chamada "Licenças de jogo assumidas" que simplesmente perde o item do tsunami deixa quem chega depois sem resposta para "por que o conceito prometia tsunami e o jogo não tem?". A decisão de recusar o atalho é o registro.

### O que **não** foi feito, de propósito

- **O `fact` do evento novo não foi escrito, e a fonte não foi fixada.** O `CIENCIA.md` já dizia que os fatos de evento são preenchimento do `P7-01`; inventar a frase agora seria estender o escopo de uma tarefa **P**. O que entrou foi um aviso nominal para quem for preencher: o achado do **[AR6]** a usar é o das cotas extremas de nível do mar — o evento hoje centenário passando a anual em boa parte dos marégrafos até 2100 — **com o item do Resumo para Formuladores de Políticas deliberadamente não fixado**, porque citar item errado é pior que não citar. Quem fizer o `P7-01` abre o AR6 e fixa.
- **Nenhum número de balanceamento foi mexido**, pelo mesmo motivo do `P6-08`: ajuste sem playtest é o risco `R2`.
- **A entrada de 2026-08-19 deste diário não foi editada**, embora aponte o `§2.7` como pendente e a seção do tsunami como aberta. Ela descreve o que era verdade naquela data — é a mesma regra que segurou as entradas antigas na divisão do `CLAUDE.md`.
- **Nada foi renomeado no código.** Não existe evento nenhum implementado ainda: o `src/data/events.json` é `[]` e o `src/engine/events.ts` tem só o comentário da fórmula de peso. O `P3-06` fechou porque era tarefa de decisão e registro, e o `id` `storm-surge` nasce direto certo no `P7-01`.

- **Como verificar:**
  ```bash
  npm run typecheck && npm run test && npm run lint && npm run build && npm run format:check
  # 237 testes em 13 arquivos — o mesmo número de ontem, porque nenhum código mudou

  grep -rni "tsunami" --include="*.md" --include="*.ts" --include="*.json" . | grep -v node_modules
  # devem sobrar 3: a decisão no CIENCIA.md, a nota do GDD §2.5 e o P3-06 no PLANO.md
  # (mais as entradas antigas deste diário, que não se reescrevem)
  ```
  Leia o `docs/GDD.md §2.7` ao lado do `src/engine/outcome.ts`: as quatro perguntas do arquivo e as quatro do `outcomeOf` estão na mesma ordem.
- **Pendente:**
  - **As outras pendências do `P6-08` continuam abertas** e nenhuma delas é de documentação: a derrota por temperatura sempre mostrar "3,00 °C" no cartão (decisão do `P7-06`), a derrota por apoio ser inalcançável até o `P7-01` e o `P7-03` existirem, o `history` nunca ser preenchido, e `Espaço` com foco num nó da árvore recomprar em vez de pausar (`P7-08`).
  - **O `§2.7` novo descreve um desfecho que ninguém consegue alcançar jogando** — o `netZero`. Isso agora está escrito com todas as letras no próprio GDD, o que é melhor que o silêncio de antes, mas não é conserto. O conserto é do `P3-04` e do `P8-02`.
  - **O `P3-02` (planilha dos 75 anos) e o `P3-04` (economia de PAC) continuam abertos**, e são justamente os que decidem se o zero líquido volta a ser alcançável. A Parte 3 tem 4 de 6 tarefas abertas com o engine já pronto — a ordem inverteu-se em relação ao plano original.
  - `P1-04` segue aberto: o `package.json` ainda diz `ponto-de-virada`, codinome.
  - O `theme.css` do `P5-02` continua sem existir.
- **Evidência:** — (tarefa de documentação, sem tela para fotografar)

---

## 2026-08-19 — Vitória e derrota: a partida virou jogo com começo, meio e fim

- **Parte / tarefa:** `P6-08` ✔ — **marco M2**
- **O que mudou:**
  - `src/engine/outcome.ts` **criado** — a regra do `docs/GDD.md §2.7`, pura: `outcomeOf`, `medalFor` e `isFinished`.
  - `src/ui/outcome.ts` e `src/ui/outcome.css` **criados** — o cartão de fim, com a mesma divisão puro/DOM do resto.
  - `src/engine/tick.ts` — o `advanceRealTime` ganhou um **predicado de parada**.
  - `src/data/balance.json` e `src/engine/state.ts` — quatro constantes novas: `netZeroEmissions`, `goldTemperature`, `silverTemperature`, `bronzeTemperature`.
  - `src/data/i18n.ts`, `index.html`, `src/main.ts` — os textos do cartão, a seção `#resultado` e a ligação.
  - `docs/CIENCIA.md` e `docs/BALANCEAMENTO.md` — os quatro números com fonte, e o achado abaixo.
  - `tests/outcome.test.ts` (21) e `tests/outcome.dom.test.ts` (16) **criados**, `tests/tick.test.ts` (+4). Suíte: 196 → **237**.
- **O desfecho não é gravado em lugar nenhum, e essa é a decisão central do arquivo.** O `outcomeOf` recalcula a partir de temperatura, apoio, emissões e tick, sempre. Três consequências saem de graça: **o `SAVE_VERSION` não subiu**, porque não há campo novo; um save editado à mão não consegue entregar uma medalha que a partida dele não sustenta, pelo mesmo motivo que `year` e `temperature` já eram recalculados na carga; e não existe o bug clássico de "ganhei mas o jogo não percebeu", em que uma bandeira booleana deixa de ser ligada num caminho de código.
- **O predicado de parada existe por causa de um buraco concreto, não por elegância.** O `advanceRealTime` entrega até 12 ticks numa chamada quando a aba volta do segundo plano — o `P6-06` registrou a partida andando em degraus de um ano. Sem a pergunta **dentro** do laço, cruzar os 3 °C no terceiro passo de doze deixaria a simulação rodar mais nove meses depois da derrota, e o cartão mostraria um mundo diferente daquele em que o jogador perdeu. Ele entra como **parâmetro** do `tick.ts` em vez de o `tick.ts` importar o `outcome.ts` porque o caminho inverso fecharia um ciclo: o `outcome.ts` precisa do `isOver` e do `TOTAL_TICKS` de lá. O padrão é "nunca para", o que manteve todo chamador anterior funcionando sem tocar em nada.
- **O laço de quadro não se desliga depois do fim — só deixa de avançar.** É a mesma razão de o engine ser chamado durante a pausa (`P5-05`): um laço que se desliga precisa ser religado no reinício, e um `previousFrame` velho entregaria o intervalo inteiro de uma vez no primeiro quadro da partida nova.
- **O cartão entra no `#app`, e não por cima da tela.** Um modal exigiria prender o foco e tratar `Esc`, e cobriria justamente o HUD — que é onde estão os números que se quer ler quando a partida acaba. Assim o topo continua visível, a navegação por teclado do `§5` sai de graça, e o `hidden` na seção tira o botão "Jogar de novo" da ordem de tabulação durante a partida. **Conferido no navegador:** com a partida em curso, `.focus()` no botão não pega; depois do fim, pega.
- **"Jogar de novo" reinicia num clique só, ao contrário da barra da partida.** Os dois passos de lá (`P6-07`) existem para proteger vinte minutos de jogo em curso. Aqui não há mais partida para destruir.
- **A trava de compra depois do fim ficou no `main.ts`, e não no `unlockSkill`.** O engine não deve precisar do `outcome.ts` para responder uma pergunta de compra: o `§2.7` fala de quando a partida termina, não de quanto custa um nó.
- **O achado que mudou o desenho da tarefa: a vitória do `§2.7` é inalcançável.** Antes de escrever qualquer linha, rodei uma sonda com o engine real — 900 ticks, comprando na melhor ordem conhecida:

  | Partida | 2100 | Emissões | Nós |
  |---|---|---|---|
  | Sem comprar nada | 3,35 °C | 81,6 Gt/ano | 0/20 |
  | **Jogo ótimo** | **2,48 °C** | **13,0 Gt/ano** | 16/20, o último em 2099 |

  As emissões param em **vinte e seis vezes** o limiar de zero líquido. E o teto não é o jogador: a árvore inteira soma 5,5%/ano de corte contra 0,93% de crescimento, então comprar os 20 nós no tick 0 ainda terminaria em ~1,2 Gt/ano — o dobro do limiar. **Ouro e Prata também são inalcançáveis**, e por um motivo estrutural: neste modelo a temperatura **nunca desce**, porque o CO₂ acumulado só cresce. O jogo ótimo cruza 1,5 °C em 2031 e 2,0 °C em 2057. O `P6-05` já tinha achado o Ouro morto; o que é novo é que a **condição de vitória inteira** está fora de alcance. Tudo em `docs/BALANCEAMENTO.md`.
- **As três decisões que saíram disso foram tomadas no chat, não por mim** — o `CLAUDE.md` manda avisar em caso de conflito com o GDD:
  1. **Chegar a 2100 vivo passa a valer a escala de medalhas**, pela temperatura em que a partida parou; acima de 2,5 °C é sobrevivência sem medalha. É o que torna o jogo vencível hoje, e a lição vira **quando você agiu** — que é o que a catraca do TCRE já ensina sozinha.
  2. **Cartão mínimo.** O gráfico da linha do tempo, o "o que você poderia ter feito diferente" e as 3 ações reais do `§2.7` ficam no `P7-06`, dono das telas de fim.
  3. **Nenhum número de balanceamento foi mexido** — ajuste sem playtest por trás é o risco `R2` do `PLANO.md`.
- **Conferi que os testes pegam — quinze defeitos plantados, treze pegos de primeira:**

  | defeito plantado | testes que caem |
  |---|---|
  | limiar da medalha vira `<=` | 1 |
  | derrota por temperatura vira `>=` | 1 |
  | a medalha passa na frente da derrota | 1 |
  | o horizonte passa na frente do zero líquido | 2 |
  | as medalhas saem na ordem inversa | 5 |
  | a parada é perguntada uma vez, fora do laço | 1 |
  | a parada é perguntada depois de avançar | 1 |
  | o cartão não esconde a seção | 2 |
  | o ícone perde o rótulo escrito ao lado | 4 |
  | os números do cartão são formatados de novo | 1 |
  | o `<dl>` acumula em vez de trocar | 1 |
  | **o apoio exige zero exato (`=== 0`)** | **0** |
  | **sem medalha cita o teto do ouro** | **0** |

  - **O primeiro buraco:** trocar `<= 0` por `=== 0` no apoio não quebrava nada, porque **nenhum caminho de hoje produz apoio negativo** — o desgaste para no piso e a compra passa por `clamp`. Só que o `outcomeOf` é função total sobre o `GameState`, e quem vai subtrair apoio de verdade é o evento (`P7-01`) e a Inércia (`P7-03`): uma subtração que passe do zero por um fio deixaria a agência de pé com apoio negativo, que é o pior jeito possível de a regra falhar. Teste novo, com apoio a −0,5.
  - **O segundo:** nenhum teste de veredito passava pelo ramo "sem medalha", que é o único que usa o teto do bronze na frase. Com o defeito, quem terminava em 2,9 °C lia "Acima de 1,5 °C" — verdade, mas inútil; o número que interessa é o da medalha que escapou por pouco. Teste novo.
  - Replantados os dois depois dos testes novos: **1 e 1**.
- **Um defeito real escapou dos 236 testes e só apareceu no navegador.** Com `<dt>` e `<dd>` soltos dentro do `<dl>`, a grade dá uma célula a cada um: o cartão saiu com **"Emissões" no fim de uma linha e "46,7 Gt/ano" no começo da seguinte, debaixo do rótulo de outro indicador** — um cartão que atribui o valor errado ao nome errado. A contagem de `<dt>` e `<dd>` que eu tinha escrito passava feliz por isso. Conserto: cada par vive num `<div>` agrupador, que é HTML válido dentro de `<dl>` desde o 5.2 exatamente para este caso; e o teste novo exige a **estrutura**, não a contagem.
- **Verificado no navegador, com os quatro desfechos semeados via `localStorage`:**
  - **Derrota:** save com `cumulativeCO2` a 3615 (2,99 °C) no tick 700. A partida rodou dois meses, cruzou os 3 °C e **parou em 2083** — conferido esperando 5 segundos e comparando o HUD: `2083/3,00 °C` nas duas leituras.
  - **Bronze:** 2100, 2,40 °C, 13,0 Gt/ano, 16 de 20 nós — a partida do jogo ótimo, reconstruída. É a evidência.
  - **Sem medalha:** 2100, 2,90 °C — `◐ Sem medalha`, "Acima de 2,5 °C — o mundo atravessou o século sem virar a curva."
  - **Ouro:** semeado com as 8 regiões a 0,05 Gt (0,4 global) em 2058 — `🥇 Ouro`, "As emissões líquidas caíram abaixo de 0,5 Gt/ano antes de 2100". **É a prova de que a regra existe e funciona**, mesmo sendo hoje inalcançável jogando.
  - Depois do fim: `#app[data-finished=true]`, a árvore a 55% de opacidade, e **clicar num nó `Disponível` com 84 PAC no bolso não compra** — status e PAC idênticos antes e depois.
  - `Jogar de novo` → 2025, PAC 0, cartão escondido, save apagado, a linha de status de volta ao texto de partida nova.
  - Nenhum texto abaixo de 16px dentro do cartão, por varredura de `getComputedStyle`. Console sem erro nenhum.
- **Como verificar:**
  ```bash
  npm run typecheck && npm run test && npm run lint && npm run build && npm run format:check
  npm run dev    # deixe correr até 2100 — 22 min a 1x, 6 a 4x — ou semeie um save perto do fim
  ```
  237 testes em 13 arquivos. O aceite são os dois testes `ACEITE` do `tests/outcome.test.ts` — "quem não compra nada perde por temperatura antes de 2100" (derrota em **2089**, o ano que o `docs/CIENCIA.md` prevê) e "jogando bem, a partida chega viva a 2100 e ganha bronze" — mais os quatro desfechos conferidos acima.
- **Pendente:**
  - **O `docs/GDD.md §2.7` não descreve o fim por horizonte.** A decisão de dar medalha a quem chega vivo a 2100 foi tomada no chat e está registrada aqui e no `BALANCEAMENTO.md`, mas o GDD continua dizendo só "vitória: emissões líquidas ≈ 0". **Não editei** porque o `§12` proíbe reescrever o GDD sem pedir. É uma linha, e vale fazer antes que o arquivo e o código divirjam de vez.
  - **A derrota por temperatura sempre mostra "3,00 °C" no cartão.** O tick que cruza soma ~0,0018 °C, então o valor real fica entre 3,000 e 3,002 — e o HUD arredonda para duas casas. O jogador lê "O aquecimento passou de 3 °C" ao lado de um "3,00 °C". Não consertei mostrando três casas só no cartão: quebraria a propriedade de o cartão e o HUD mostrarem sempre o mesmo número, que tem teste. Vale decidir no `P7-06`.
  - **A derrota por apoio continua inalcançável.** O `supportFloor` trava o desgaste em 25 e nada mais empurra o apoio para baixo. A regra está escrita e testada; quem vai poder disparar é o `P7-01` e o `P7-03`.
  - **O cartão não tem gráfico nem "o que você poderia ter feito diferente".** É o `P7-06`, e depende do `history` — que **nenhuma partida preenche ainda**: o campo existe no `GameState` desde o `P6-01` e continua sempre vazio. Quem for fazer o `P7-06` precisa começar a gravar snapshots **e subir o `SAVE_VERSION`**.
  - **A árvore apagada a 55% é a única pista visual de que ela ficou inerte.** Quem diz que a partida acabou é o cartão, por escrito, então o `§5` está cumprido — mas um nó `Disponível` que não compra ao clique ainda é uma pequena surpresa. Vale um rótulo no `P7-08`.
  - **`Espaço` com o foco num nó da árvore continua recomprando em vez de pausar** — herdado do `P6-06`, ainda aberto no `P7-08`.
  - O `theme.css` do `P5-02` continua sem existir; as quatro folhas seguem nos valores de reserva.
  - `npm audit` segue acusando o `nanoid` de `vite → postcss`; nada a ver com esta tarefa.
- **Evidência:** `docs/evidencias/2026-08-19-p6-08-fim-de-partida-bronze.jpg`

---

## 2026-08-19 — Save, load e reset: a partida deixou de morrer no F5

- **Parte / tarefa:** `P6-07` ✔
- **O que mudou:**
  - `src/engine/save.ts` **criado** — o formato: versão, validação e reconstrução. Puro, roda em node.
  - `src/ui/storage.ts` **criado** — a ponte com o `localStorage`. Fina, e **nada nela lança**.
  - `src/ui/session.ts` e `src/ui/session.css` **criados** — a barra da partida, com o reinício em dois passos.
  - `src/data/i18n.ts`, `index.html`, `src/main.ts` — a barra entrou e o `main.ts` passou a retomar, salvar e reiniciar.
  - `vite.config.ts` e `tests/setup-jsdom.ts` **criado** — conserto de ambiente para o jsdom (abaixo).
  - `tests/save.test.ts` (13) e `tests/storage.dom.test.ts` (20) **criados**. Suíte: 163 → **196**.
- **O formato ficou no engine e o `localStorage` na UI.** O `engine/save.ts` não sabe que existe navegador — é o §3 ao pé da letra, e é o que permite testar versão, validação e campos derivados em node, sem DOM. O `ui/storage.ts` só lê e escreve uma string.
- **Um save recusado nunca derruba o jogo, e essa é a diferença para o resto do projeto.** O `parseRegions` e o `parseSkills` **lançam**, porque leem arquivo do repositório e um erro ali é bug de quem editou, que precisa aparecer alto. Aqui a entrada vem do navegador do jogador: pode estar velha, cortada pela metade, ou editada no DevTools. Recusar e começar de 2025 é a única saída que não deixa alguém com um jogo permanentemente quebrado e sem botão para consertar. Todas as recusas viram um `console.warn` e nada mais — contar ao jogador que "o save era da versão errada" não lhe dá nada para fazer.
- **O save guarda o `GameState` inteiro, mas `year` e `temperature` não são confiados de volta.** Os dois são derivados — o ano sai do tick, a temperatura sai do CO₂ acumulado — e recalcular na carga elimina de vez a chance de um save trazer um par que não combina. Tem teste que entrega um save dizendo `year: 2099, temperature: 42` e exige que os dois voltem certos.
- **O `rngState` foi junto com o `seed`, e é para isso que ele existe.** O `docs/GDD.md §3` já registrava que sem a posição do gerador salva à parte, recarregar recomeçaria a sequência de sorteios do zero. Não havia como provar isso até hoje; agora há teste.
- **As habilidades compradas são o único lugar de onde os efeitos contínuos voltam.** O `skills.ts` do `P6-05` decidiu não gravar `emissionCut` nem `pointsPerYear` em lugar nenhum — eles saem de `unlockedSkills` a cada tick. O comentário de lá dizia que era para o save ter "um lugar só para errar", e foi exatamente o que aconteceu: salvar a lista salva os efeitos junto. Tem teste que roda um ano em duas partidas — uma que nunca parou e uma que passou pelo JSON — e exige estado idêntico.
- **Habilidade desconhecida no save recusa a partida inteira, em vez de ser filtrada.** É a decisão mais dura do arquivo. Filtrar deixaria o jogador com o PAC gasto e sem a habilidade, sem nunca saber que perdeu algo; recusar o faz recomeçar. O jeito de não chegar lá é **subir o `SAVE_VERSION` junto com qualquer mudança nos ids do `skills.json`** — a checagem é a rede para quando alguém esquecer.
- **O reinício pede dois cliques.** É a única ação da tela que destrói vinte minutos de jogo, e não tem desfazer. `Reiniciar partida` troca a barra por `Apagar e recomeçar` + `Cancelar`, com a frase "A partida salva será apagada. Não dá para desfazer." ao lado. **Não usei `confirm()`**: ele resolveria em uma linha, mas trava a página, não é estilizável e some do fluxo de teclado de um jeito que não dá para testar.
- **`Esc` fecha, e teve que passar na frente da guarda de teclado.** O `main.ts` ignora atalhos quando o alvo é um `<button>` — decisão do `P5-05`. Só que depois de clicar em "Reiniciar" o foco está justamente num botão, então tratar `Esc` depois da guarda faria o `§5` ("Esc sempre fecha") não valer exatamente onde ele mais importa.
- **O jsdom não tinha `localStorage`, e a causa não era o jsdom.** O Node 22 expõe um `localStorage` global próprio, experimental, que fica `undefined` sem `--localstorage-file` — e ele chega antes e fica por cima do do jsdom. O `sessionStorage`, que o Node não tem, funcionava normalmente. Conserto no `tests/setup-jsdom.ts`: a propriedade é `configurable`, então o nome é devolvido ao `sessionStorage` **do próprio jsdom** — a mesma classe `Storage`, mesma implementação, não um dublê escrito à mão. O que isso **não** prova é persistência entre recarregamentos; isso é o navegador que provou, abaixo.
- **Conferi que os testes pegam — doze defeitos plantados, doze pegos.** Os que interessam: aceitar save de qualquer versão → **2**; confiar no ano do save → 1; confiar na temperatura → 1; aceitar habilidade repetida → 1; aceitar habilidade que não existe mais → 1; `NaN` e `Infinity` passando por `typeof number` → 1; não validar as regiões → 1; deixar a exceção da escrita subir → 1; reiniciar apagando o domínio inteiro em vez da chave → 1; reinício no primeiro clique → 1; confirmação visível junto com o botão de reiniciar → 1; a barra continuar dizendo "retomada" depois do reinício → 1.
  - **Dois achados do plantio, e o segundo é o que importa.** O primeiro foi plantio ruim meu, que não removia o `try/catch` de verdade; replantado, cai 1. O segundo é um teste que passava **pelo motivo errado**: eu espionava `Storage.prototype.getItem` para simular leitura que falha, mas o objeto do jsdom é um Proxy e a chamada não passava pelo espião — o teste passava porque a loja estava vazia e `loadGame` devolveria `null` de qualquer jeito. Agora o teste **troca o objeto de armazenamento inteiro**, que é o que de fato exercita o `try/catch`. Ganhou um irmão: armazenamento que **nem existe**, que é o cenário da build offline da feira (`P8-05`) e o da navegação privada.
- **Verificado no navegador, com recarregamento de verdade:**
  - Partida nova até 2029, 48 PAC, comprei **Educação climática**. O save foi escrito **na hora da compra**: `version 1`, `tick 58`, `["climate-education"]`, **1486 bytes**.
  - **F5.** A página voltou com `Partida retomada em 2029.`, o nó como `✔ Comprado` com o fato na tela, e o apoio médio em 50 — os 8 pontos da compra estavam lá. A velocidade voltou para 1x, que é o certo: o `controls.ts` registra que velocidade e pausa são de quem assiste, não da simulação.
  - `Reiniciar` → a confirmação apareceu. `Esc` → cancelou, e o save continuou intacto, com a compra dentro.
  - `Reiniciar` → `Apagar e recomeçar` → 2025, PAC 0, apoio 50, o nó de volta a `PAC insuficiente` com o fato escondido, a linha de status de volta ao texto de partida nova, e a chave **apagada** do `localStorage`.
  - Console sem erro nenhum.
- **Como verificar:**
  ```bash
  npm run typecheck && npm run test && npm run lint && npm run build && npm run format:check
  npm run dev    # compre um nó, aperte F5 — a partida tem que voltar onde estava
  ```
  196 testes em 11 arquivos. O aceite é o teste `ACEITE: salvar no meio da partida e carregar devolve a mesma partida`, mais o F5 conferido acima.
- **Pendente:**
  - **A confirmação de reinício não pausa o jogo.** O tempo continua correndo atrás dela, e o jogador está lendo um aviso. Pausar sozinho ali seria mais honesto — fica junto com a decisão de auto-pausa que o `P7-02` vai precisar tomar de qualquer jeito.
  - **Fechar a aba no meio do mês perde esse mês.** O save acontece na virada do tick e na compra; um `visibilitychange` cobriria o resto. A perda máxima hoje é 1,5 s de jogo a 1x, então não valeu o código — mas está anotado.
  - **`SAVE_VERSION` é um combinado, não uma trava.** Nada obriga quem mexer no `skills.json` ou no `GameState` a subir o número. A checagem de habilidade desconhecida cobre o caso mais provável; o resto depende de lembrar. Um teste que congelasse o formato resolveria — vale pensar no `P8-02`.
  - **`localStorage` e `sessionStorage` são o mesmo objeto dentro dos testes**, por causa do conserto de ambiente. Nenhum código do jogo usa `sessionStorage` hoje; no dia em que usar, os dois colidem e o `setup-jsdom.ts` precisa de outra saída.
  - **A semente continua fixa em 2025 para partidas novas.** Uma partida retomada traz a própria, mas reiniciar sempre dá a mesma partida. Escolher semente é da tela de título (`P5-06`).
  - **A vitória e a derrota continuam não existindo** — é o `P6-08`, e é a última coisa entre o projeto e o marco M2.
  - `npm audit` segue acusando o `nanoid` de `vite → postcss`; nada a ver com esta tarefa.
- **Evidência:** `docs/evidencias/2026-08-19-p6-07-partida-retomada.jpg`

---

## 2026-08-19 — A árvore de habilidades na tela: o jogo virou jogo

- **Parte / tarefa:** `P6-06` ✔ — a segunda tarefa **G** da Parte 6.
- **O que mudou:**
  - `src/ui/tree.ts` e `src/ui/tree.css` **criados** — `treeView` puro mais `mountTree` e `renderTree`.
  - `src/data/i18n.ts` — o bloco `tree` com os nomes dos 5 ramos, os 4 rótulos de estado e os textos de custo e recusa.
  - `index.html`, `src/main.ts` — a árvore entrou no `#app` e ganhou o `handleUnlock`.
  - `vite.config.ts`, `package.json` — **jsdom 30.0.1**, aprovado no chat (§2).
  - `tests/tree.test.ts` (20) e `tests/tree.dom.test.ts` (14) **criados**. Suíte: 129 → **163**.
- **O jsdom entrou por arquivo, não no `vite.config.ts` inteiro.** Trocar o `environment` global para `jsdom` faria *todo* teste passar a enxergar um `document` — e aí a regra de ouro do §3 deixaria de ser verificável, porque um `document` que vazasse para dentro do `engine/` teria um para encontrar e passaria despercebido. O padrão continua `node`; quem precisa de DOM pede na primeira linha do arquivo, com `// @vitest-environment jsdom`. A lista de quem pediu é um `grep`.
- **A tarefa entregou quatro estados de nó, e não os três que o `PLANO.md` pede.** O plano escreve "bloqueado / disponível / comprado", mas o `canUnlock` do `P6-05` já separava `missingRequirement` de `notEnoughPoints` — e o comentário do `UnlockRefusal`, escrito naquela tarefa, dizia que era a UI do `P6-06` que ia usar isso. Dividi porque as duas situações pedem coisas **opostas** do jogador: `◌ PAC insuficiente` se resolve esperando o tempo correr, `✕ Bloqueado` só se resolve comprando outro nó antes. Chamar as duas de "bloqueado" esconderia justamente a informação que decide o próximo clique. É expansão do que o plano pediu, e está registrada aqui por isso.
- **O fato real só aparece depois da compra.** O `§2.4` do GDD diz que o fato é o que faz o jogo conscientizar "sem virar palestra" — e vinte fatos na tela ao mesmo tempo *são* a palestra. Antes da compra ele fica no `title` do cartão, para quem quiser saber no que vai gastar antes de gastar; virar dono é o que traz a frase para a tela, com barra lateral. **A educação chega no momento em que o jogador está olhando para aquele nó, que é quando ela vale alguma coisa.**
- **A UI não reimplementa nenhuma regra de jogo.** Quem decide se dá para comprar é o `canUnlock`; quem cobra o PAC é o `unlockSkill`. O `main.ts` nem pergunta: manda comprar e compara o estado por **identidade** — o `unlockSkill` devolve o mesmo objeto quando recusa. Isso é o que permite deixar o cartão bloqueado clicável sem a tela precisar saber por quê.
- **`aria-disabled`, e não `disabled`.** Botão com `disabled` sai da ordem de tabulação — quem navega por teclado não conseguiria nem chegar no nó bloqueado para **ler por que** ele está bloqueado. Como o engine recusa a compra de qualquer jeito, deixar o clique acontecer não custa nada e devolve a informação a quem usa teclado.
- **`renderTree` atualiza em vez de reconstruir, e isso não é otimização.** A árvore redesenha a cada mês de jogo — 1,5 s na velocidade 1x. Se o render recriasse os cartões, o foco de quem estivesse navegando por Tab seria arrancado a cada segundo e meio. Tem teste com 12 redesenhos seguidos exigindo o mesmo elemento e o mesmo `document.activeElement`.
- **Conferi que os testes pegam — e um defeito passou em 161 de 161.** Plantei nove:

  | defeito plantado | testes que caem |
  |---|---|
  | "falta PAC" e "bloqueado" viram o mesmo estado | 5 |
  | a falta de PAC arredonda para baixo | 1 |
  | o bloqueio lista todos os pais, inclusive os já comprados | 1 |
  | a profundidade ignora os pré-requisitos | 1 |
  | o nó bloqueado usa `disabled` em vez de `aria-disabled` | 4 |
  | o fato real aparece antes da compra | 1 |
  | redesenhar recria os cartões | 9 |
  | o ícone perde o rótulo escrito ao lado | 3 |
  | **os nós saem na ordem do arquivo, não por profundidade** | **0** |

  **O último é o buraco de verdade.** O `skills.json` de hoje já está escrito em ordem de profundidade, então remover o `sort` não muda **nada** na tela agora — e o teste que eu tinha escrito confirmava que a lista *está* ordenada, não que a função *ordena*. Passou verde com a ordenação fora.

  O conserto exigiu abrir o `treeView` a um segundo parâmetro (`tree`, com o arquivo como padrão) para o teste poder entregar os mesmos 20 nós **invertidos** e exigir a mesma ordem de saída. É API que só o teste usa, e está documentada como tal na função. **O caso não é hipotético:** o pacote `[D-Historia]` edita o `skills.json` à mão, e acrescentar um nó no fim do ramo é a coisa mais natural do mundo — é exatamente aí que o `sort` deixa de ser decoração.

  Na primeira versão desse teste eu exigi demais: `toEqual` contra a view do arquivo. Falhou, e com razão — `sort` é **estável**, então inverter a entrada troca a ordem entre nós de *mesma* profundidade, e exigir a ordem do arquivo seria exigir do `sort` algo que ele não promete. O teste hoje afirma o que a função promete (profundidades crescentes) mais o que ordenar não pode fazer (perder ou duplicar nó).
- **Verificado no navegador, com compra de verdade:**
  - Nenhum texto abaixo de 16px — varri o `getComputedStyle` de todo elemento com texto dentro da árvore. É a mesma medição que pegou o rótulo de 14px no `P5-03`.
  - Os 20 nós, os 5 `<h2>` de ramo e as 5 `<ol>` no lugar.
  - Sem PAC: `◌ PAC insuficiente` · `Faltam 39 PAC`. Com o tempo correndo, o rodapé desceu sozinho para 24, 13 e **1** — e nesse ponto o HUD mostrava `PAC 39`. **As duas decisões de arredondamento concordam na tela:** o HUD trunca para baixo, a falta arredonda para cima, e o jogador nunca vê um nó prometer o que a compra vai negar.
  - Em 40 PAC os cinco nós de raiz viraram `● Disponível`, borda contínua e grossa. **Cliquei no solar: virou `✔ Comprado`, o PAC caiu 40, o fato apareceu** e os outros quatro voltaram para `Faltam 10 PAC` na mesma tela.
  - `wind` saiu de `✕ Bloqueado` para `◌ PAC insuficiente` sozinho — o pré-requisito caiu, o custo não.
  - `smart-grid` continua `✕ Bloqueado`, com **`Exige: Energia eólica e Armazenamento em bateria`** — a conjunção do português saindo do `Intl.ListFormat`, e nomeando só o que falta.
  - Foco por teclado num nó bloqueado: funciona (é `aria-disabled`, não `disabled`).
  - Console sem erro nenhum.
- **A trava do `P6-04` apareceu de novo, e agora dá para descrevê-la com precisão.** A aba da automação fica com `document.visibilityState === "hidden"` e o Chrome congela o `requestAnimationFrame`: a partida **parou** em 27 PAC por 20 segundos. Cada captura de tela devolve a aba ao primeiro plano por um instante, e o quadro seguinte entrega o atraso acumulado — limitado a 12 passos, **um ano de jogo por vez**. Ou seja: no ambiente de automação a partida anda em degraus de um ano, e é assim que cheguei aos 40 PAC. Não é regressão; é a mesma trava fazendo o certo, só que visível.
- **Como verificar:**
  ```bash
  npm run typecheck && npm run test && npm run lint && npm run build && npm run format:check
  npm run dev    # espere o PAC chegar a 40 e clique num nó de raiz
  ```
  163 testes em 9 arquivos. O aceite é o teste `ACEITE: pré-requisito, custo e os estados bloqueado / disponível / comprado`, mais a compra conferida no navegador acima.
- **Pendente:**
  - **`Espaço` com o foco num nó da árvore recompra o nó em vez de pausar.** O `main.ts` ignora o atalho quando o alvo é um `<button>` — decisão do `P5-05`, correta — só que agora existem 20 botões a mais na tela e a chance de haver um em foco subiu muito. É inofensivo (o nó já é seu, o `unlockSkill` devolve o estado intacto), mas é surpresa. Vale decidir no `P7-08`.
  - **A árvore não tem desenho de árvore.** São cinco colunas de cartões; o que liga pai e filho é a frase `Exige:`, não uma linha na tela. Foi decisão de escopo — traçar conectores é trabalho de SVG do tamanho do `P5-01`. Se o playtest do `P8-01` mostrar gente perdida, é aqui que se mexe.
  - **Nenhuma auto-pausa ao desbloquear ramo.** Está nas decisões travadas do `PLANO.md`, mas não existe "ramo novo" no modelo de dados: os 5 ramos nascem com a raiz livre. Enquanto for assim, não há o que pausar.
  - **`mountHud`, `renderHud`, `mountControls` e `renderControls` continuam sem teste.** O jsdom já está no projeto e a dívida ficou barata — foi opção sua manter o `P6-06` puro, e está registrado aqui para não se perder.
  - **A vitória e a derrota não existem.** A compra muda a curva, mas o `§2.7` (emissões ≈ 0, ou 3 °C, ou apoio zero) não é verificado em lugar nenhum. É o `P6-08`.
  - O `theme.css` do `P5-02` continua sem existir; as três folhas seguem nos valores de reserva.
  - **`npm audit` acusa 1 vulnerabilidade alta em `nanoid`** (`vite → postcss → nanoid@3.3.17`). **Não veio do jsdom** — já estava lá. Merece uma tarefa própria.
- **Evidência:** `docs/evidencias/2026-08-19-p6-06-arvore-de-habilidades.jpg`

---

## 2026-08-18 — Pausa e velocidade: o jogador ganha controle do relógio

- **Parte / tarefa:** `P5-05` ✔
- **O que mudou:**
  - `src/ui/controls.ts` e `src/ui/controls.css` **criados** — o núcleo puro do controle de tempo mais a barra de quatro botões.
  - `src/main.ts` — passa `effectiveSpeed(control)` ao `advanceRealTime` e escuta o teclado.
  - `src/data/i18n.ts`, `index.html`, `src/ui/hud.ts` — rótulos novos e o `aria-label` do HUD saindo da marcação para o i18n.
  - `tests/controls.test.ts` **criado**, 11 testes. Suíte total: **129**.
- **A decisão da tarefa: o engine é chamado mesmo em pausa, com velocidade zero.** O comentário do `P6-04` dizia "quem está em pausa simplesmente não chama", e eu fiz o contrário de propósito. Não chamar obriga a lembrar de **ainda assim** atualizar o `previousFrame` a cada quadro; quem esquecer faz o primeiro quadro depois da pausa entregar o intervalo inteiro de uma vez, e a trava do `P6-04` converte isso num **ano de jogo saltado**. Com velocidade 0, `elapsed × 0` não acumula nada, o resto parcial do mês fica intacto, e a armadilha deixa de existir. **De quebra, virou testável:** tem teste que roda 600 quadros em pausa e exige estado idêntico e resto preservado — e depois retoma com os 600 ms que faltavam e exige o mês virar.
- **A guarda que só uma tecla de verdade conseguiu testar.** Com o foco num botão, o navegador já transforma `Espaço` em clique. Se o atalho do documento também tratasse a tecla, a pausa alternaria **duas vezes** e pareceria não funcionar — que é o jeito mais irritante de um atalho quebrar. O handler ignora a tecla quando `event.target` é um `<button>`. Isso é impossível de verificar despachando `KeyboardEvent` por script, porque o despacho sintético não dispara o comportamento nativo do botão: **precisei clicar no botão e apertar a barra de espaço de verdade.** Resultado: "Pausar" → "Retomar", **um** toggle, como devia.
- **Verificado no navegador, ponta a ponta:**
  - `Espaço` alterna: Pausar → Retomar → Pausar, com o `aria-pressed` acompanhando.
  - Teclas `1`, `2` e `4` trocam a velocidade; `3`, `0`, `5` e letras são ignoradas.
  - `Espaço` em 4x pausa **sem** desmarcar o 4x — velocidade é escolha do jogador, não afirmação de que o tempo corre.
  - **Seis segundos em pausa: o HUD não se moveu um dígito.** Retomado a 4x, sete segundos levaram a partida de 2025 a 2026 e o PAC de 0 a 12 — quatorze meses, contra os cinco que 1x tinha dado em oito segundos na tarefa anterior.
  - Console sem erro nenhum.
- **Acessibilidade do `§5`, ponto a ponto:** são `<button>` nativos (foco por Tab, Enter e Espaço de graça); o botão de pausa **troca o rótulo** entre "Pausar" e "Retomar", que é texto e não cor; a velocidade escolhida é marcada por **três** coisas ao mesmo tempo, das quais duas não são cor — marcador ● visível, negrito e borda mais grossa; há anel de foco explícito, sem o qual a navegação por teclado existe mas é invisível; e a altura mínima é de 44px, porque o dedo de quem passa num estande não mira bem.
- **Conferi que os testes pegam.** Cinco defeitos plantados: `effectiveSpeed` ignorando a pausa → **2** testes; escolher velocidade tirando da pausa → **1**; qualquer dígito virando velocidade → **1**; `togglePause` que só pausa e nunca retoma → **2**; a barra de espaço deixando de ser atalho → **1**. Todos revertidos.
- **Uma correção de regra 8 que veio junto.** O `aria-label` do HUD estava escrito no `index.html` desde o `P5-03` — texto de UI no lugar que a regra 8 proíbe. Agora os dois painéis pegam o rótulo do `i18n.ts`, pelo mesmo caminho.
- **Como verificar:**
  ```bash
  npm run typecheck && npm run test && npm run lint && npm run build && npm run format:check
  npm run dev    # Espaço pausa e retoma; 1, 2 e 4 mudam a velocidade
  ```
  129 testes em 7 arquivos. O aceite é o teste `ACEITE: Espaço pausa e retoma`, mais a conferência no navegador acima.
- **Pendente:**
  - **`mountControls` e `renderControls` continuam sem teste**, pelo mesmo motivo do HUD: exigiriam jsdom. **Mas agora a conta mudou** — existe interação de verdade (clique, foco, tecla), e foi só no navegador que a guarda do foco pôde ser verificada. Se o `P5-04` ou o `P6-06` trouxerem mais interação, é hora de pedir a dependência em vez de conferir à mão toda vez.
  - **Trocar de aba ainda congela a partida**, e agora que existe pausa de verdade vale decidir de propósito: hoje o jogo perde o tempo em que ficou escondido, em silêncio. O honesto seria **pausar sozinho ao esconder a aba**, e o jogador voltar e ver "Retomar". Fica para o `P5-06` ou o `P7-08`.
  - **Os atalhos não aparecem na tela.** Estão no `title` de cada botão, o que só ajuda quem passa o mouse por cima e não ajuda ninguém no teclado. O tutorial de quatro passos é o `P7-08`.
  - **Não há sinal de pausa fora da barra.** Com o mapa (`P5-01`) na tela, o jogo parado vai precisar de algo mais visível que o rótulo de um botão.
  - O `theme.css` do `P5-02` continua sem existir; as duas folhas seguem nos valores de reserva.
- **Evidência:** `docs/evidencias/2026-08-18-p5-05-controle-de-tempo.jpg`

---

## 2026-08-18 — O HUD: a primeira tela que mostra a partida acontecendo

- **Parte / tarefa:** `P5-03` ✔ — a primeira tarefa de UI do projeto.
- **O que mudou:**
  - `src/data/i18n.ts` **criado** — os rótulos e as dicas dos cinco indicadores. Não existia, e a regra 8 proíbe texto de UI no código.
  - `src/ui/hud.ts` **criado** — `hudView` (puro) mais `mountHud` e `renderHud` (DOM).
  - `src/ui/hud.css` **criado** e `index.html` reescrito — a marcação provisória do `SETUP-02` saiu.
  - `src/main.ts` reescrito: agora tem o laço de `requestAnimationFrame`.
  - `src/engine/state.ts` — `averageSupport`, três linhas.
  - `tests/hud.test.ts` **criado**, 10 testes. Suíte total: **118**.
- **O engine finalmente ganhou motorista.** O `advanceRealTime` estava escrito, testado e parado desde o `P6-04` — o diário daquela tarefa registrou que ele estava "sem motorista" porque o laço de quadro pertence à UI. Hoje o `main.ts` é esse motorista, e é o **único** arquivo do projeto que sabe ao mesmo tempo o que é um `GameState` e o que é um quadro de vídeo.
- **O `hud.ts` foi partido em dois para não precisar de dependência nova.** O `vite.config.ts` já dizia, desde o `SETUP-03`, que testar UI exigiria jsdom e que jsdom passa por aprovação (`§2`). Em vez de pedir, dividi: `hudView` é **puro** — entra `GameState`, saem cinco strings — e concentra tudo onde cabe bug (arredondamento, unidade, média); `mountHud` e `renderHud` só escrevem `textContent` e são burros demais para errar. O `document` nunca aparece no topo do módulo, só dentro do corpo dessas duas funções — é isso que deixa o arquivo ser importado por um teste que roda em node.
- **Duas decisões de arredondamento que não são cosméticas:**
  - **O PAC é arredondado para baixo.** Ele entra fracionado (o `P6-03` divide a entrada anual por 12), e mostrar 40 com 39,9 no bolso faria o jogador achar que um nó de 40 está ao alcance. O número na tela não pode prometer o que a compra vai negar.
  - **O ano não passa pelo `Intl`.** Em pt-BR o formatador de número põe separador de milhar, e 2100 viraria "2.100". Tem teste para os dois.
- **O `averageSupport` foi para o engine, não para a UI.** É regra de jogo: o `§2.7` dissolve a agência quando esse número zera. Ele estava duplicado dentro do `tick.test.ts`; agora é um só, e o teste do tick passou a usar o do engine — os 118 continuarem verdes depois da troca é a prova de que as duas contas concordavam.
- **Conferi no navegador, e foi o navegador que achou o defeito que os testes não podiam achar.** O probe leu o CSS computado e devolveu **rótulo em 14px** — abaixo do piso de 16px que o `docs/GDD.md §5` fixa para *todo* texto. Nenhum teste pegaria isso: é regra de acessibilidade, mora no CSS, e o `hudView` não sabe que existe fonte. Corrigido para 16px. **O rótulo é justamente o que diz o que o número significa; encolher ele seria comunicar o indicador só pelo valor.**
- **Um susto que não era bug.** Na primeira medição o HUD ficou **congelado por 6 segundos**. O diagnóstico: `document.visibilityState === "hidden"` e **zero** quadros de `requestAnimationFrame` em 2 segundos — o Chrome congela o `rAF` em aba de segundo plano, e a aba da automação está sempre em segundo plano. Com a aba desenhando, os cinco indicadores andam: em ~20 s a partida foi de 2025 a **2027**, com PAC de 0 a 20 e apoio de 50 a 47.
  - **Isso tem consequência de desenho, e vale registrar:** ao voltar de uma aba parada, o primeiro quadro entrega o atraso inteiro de uma vez. A trava `MAX_STEPS_PER_CALL` do `P6-04` — 12 passos, um ano de jogo — deixou de ser hipótese e passou a ser exercitada em toda troca de aba. Ela faz o certo: descarta o atraso em vez de adiantar vinte anos.
- **Conferi que os testes pegam.** Cinco defeitos plantados no `hudView`: PAC arredondado normalmente → **1** teste; ano passando pelo formatador → **3**; temperatura sem mínimo de casas → **1**; apoio lendo uma região em vez da média → **1**; emissões de uma região em vez do global → **2**. Todos revertidos.
- **Contraste conferido por conta, não por impressão.** Contra o fundo `#0F1C17`: valor 16,17:1, rótulo 9,04:1, título 9,67:1 — todos muito acima dos 4,5:1 que o `§5` exige. A borda ficou em 3,84:1, acima dos 3:1 que a regra pede para elemento que não é texto. Os números estão em comentário no topo do `hud.css`.
- **O contrato do `[D-Design]` já está de pé.** O `hud.css` lê cor, fonte e espaçamento de custom properties **com valor de reserva dentro do próprio `var()`**. Quando o `P5-02` entregar o `theme.css`, basta ele definir as variáveis no `:root` — o `hud.css` não muda uma linha. É o contrato de pacote do `PLANO.md` funcionando na prática pela primeira vez.
- **Como verificar:**
  ```bash
  npm run typecheck && npm run test && npm run lint && npm run build && npm run format:check
  npm run dev    # http://localhost:5173 — o ano precisa virar sozinho a cada ~18 s
  ```
  118 testes em 6 arquivos.
- **Pendente:**
  - **`mountHud` e `renderHud` não têm teste.** É a consequência aceita de não trazer jsdom. Quando o `P5-05` trouxer botão e tecla — coisa que dá para clicar errado — aí o pedido de aprovação de dependência se justifica.
  - **O `theme.css` do `P5-02` ainda não existe.** Enquanto isso as variáveis vivem dos valores de reserva, e a paleta de verdade é decisão do `[D-Design]`.
  - **Não há pausa nem velocidade.** É o `P5-05`. O `speed` já é parâmetro do `advanceRealTime` e pausar é simplesmente não chamar.
  - **Trocar de aba congela a partida.** Quando o `P5-05` entrar, vale decidir de propósito o que acontece ao voltar: hoje o jogo perde o tempo em que ficou escondido, o que é defensável, mas ninguém escolheu isso — foi herdado da trava do `P6-04`.
  - **O nome do jogo está duplicado** entre o `<title>` e o `<h1>` do `index.html`. Deliberado enquanto o `P1-04` não decide o nome definitivo: os dois precisam casar e estão lado a lado no mesmo arquivo.
  - **O `#app` tem uma frase e mais nada.** O mapa das 8 regiões é o `P5-01` e a árvore é o `P6-06`.
- **Evidência:** `docs/evidencias/2026-08-18-p5-03-hud-no-ar.jpg`

---

## 2026-08-18 — A árvore de habilidades: o jogo passou a ser vencível

- **Parte / tarefa:** `P6-05` ✔ — a tarefa **G** da Parte 6.
- **Três commits, na ordem em que dependem um do outro:**
  1. `feat(data)` — os 20 nós em `src/data/skills.json` e as 19 fontes novas no `docs/CIENCIA.md`.
  2. `feat(engine)` — `parseSkills` no `state.ts` e o `skills.ts` inteiro, com 34 testes.
  3. `feat(engine)` — os efeitos ligados no `climate.ts` e no `tick.ts`. Suíte: 68 → **109**.
- **A tarefa começou com uma ambiguidade que decidia o jogo inteiro.** O `docs/GDD.md §3` descreve o `emissionCut` só como `// % ao ano`, o que admite duas leituras: taxa anual de queda, ou corte único aplicado à emissão anual. Rodei as duas com as constantes reais, e o que decidiu não foi a temperatura — foi a **emissão final**. Na leitura de corte único, a emissão volta a crescer 0,93% ao ano logo depois da compra, e nem um corte de 99% chega perto de zero em 2100. Como o `§2.7` dá vitória por "emissões líquidas ≈ 0", **a vitória que o próprio GDD define só existe na leitura de taxa.** É também a leitura em que comprar cedo vale mais que comprar tarde, que é a mensagem do ODS 13 virando mecânica em vez de texto de tutorial.
- **O que a partida virou.** Um jogador de referência — compra sempre que pode, paga primeiro o que gera PAC, depois o mais barato:

  ```
  temperatura em 2100 .... 2,495 °C   (sem comprar nada: 3,355)
  emissões em 2100 ....... 13,58 Gt/ano   (começou em 40,753)
  CO₂ acumulado .......... 2500 Gt   (sem comprar nada: 4411)
  nós comprados .......... 16/20, com 8 PAC sobrando
  ```

  A primeira compra sai em 2029 e a última em 2099. Os quatro nós que ficam de fora são exatamente os capstones caros de Transporte, Natureza, Indústria e Sociedade — o corte de escopo dói no lugar certo.
- **O orçamento caiu no alvo do `P3-04` sem eu forçar.** Custos de 40 / 70 / 140 PAC por nível dão 1600 PAC de árvore contra os 750 que a partida entrega de base; com o PAC extra do ramo Sociedade, o jogador fecha em **65% da árvore — faltando 35%**, que é exatamente o aceite escrito no `PLANO.md`. Tem teste travando os dois números.
- **A validação ficou dividida entre dois lugares, de propósito.** O `parseSkills` recusa só o que torna o arquivo **inutilizável**: id repetido, ramo desconhecido, efeito malformado, pré-requisito inexistente, ciclo. As invariantes de **desenho** — 20 nós, 4 por ramo, custo total, corte total — foram para o `skills.test.ts`. Se o `[D-Historia]` acrescentar um nó, o jogo tem que carregar; o que deve falhar é o teste, avisando que uma decisão de escopo acabou de acontecer. Um parser rigoroso demais quebraria o jogo na feira por causa de uma vírgula de escopo.
- **Os cinco `Effect` se dividem em dois grupos, e essa é a decisão central do `skills.ts`.** `support`, `resilience` e `inertiaCut` valem **na hora da compra** — empurrão único que entra no estado. `emissionCut` e `pointsPerYear` são **contínuos** e não são gravados em lugar nenhum: saem de `unlockedSkills` a cada tick. Guardá-los duplicaria informação que já está na lista de compras, e o save/load do `P6-07` teria dois lugares para errar.
- **Conferi que os testes pegam — quatorze defeitos plantados nas três levas.** Os que interessam:
  - Bastar **um** pré-requisito em vez de todos → 1 teste. Checar dinheiro antes de pré-requisito → 1. Compra sem cobrar PAC → 1, que virou **2** depois de eu acrescentar `compras sucessivas drenam o PAC até travar`: cobrar o custo uma vez é fácil de acertar por acidente, e o que prova a cobrança é a terceira compra não acontecer.
  - Crescimento ignorando o corte → 4. Corte aplicado antes de o mês emitir → 4. PAC de volta à taxa fixa → 2.
  - **Um defeito passou em todos os 108 testes:** corte mensal como `taxa / 12` em vez da raiz de ordem 12. É exatamente o erro que o `P6-02` cobriu do lado do *crescimento* e que eu deixei descoberto do lado do *corte* — o mesmo bug, na função irmã, invisível. Acrescentei `doze ticks de corte compõem exatamente a taxa anual`, que compara duas partidas idênticas com e sem uma habilidade para isolar o corte do crescimento. Com ele, o defeito cai.
- **Os 20 fatos têm fonte de verdade, cada uma verificada antes de eu escrever a frase.** IRENA (solar, eólica), BloombergNEF (bateria), IEA (rede, carros elétricos, prédios, aço, cimento, eficiência), FAO (floresta), Donato *et al.* 2011 na Nature Geoscience (manguezal), IPCC SRCCL (alimentos), UNEP/IRP (economia circular), UNESCO (educação), NOAA (Protocolo de Montreal), WMO (alerta precoce), Reimann *et al.* 2021 na ESSD (costa), Brand *et al.* 2021 via Oxford (bicicleta). O oceano reaproveita o `[GCB25]` que já estava na tabela primária.
  - **A tabela de fatos do `CIENCIA.md` é gerada a partir do `skills.json`**, não digitada — os dois não têm como divergir em silêncio.
  - **Separei fonte de balanceamento com todas as letras.** Nenhum fato alimenta número da simulação: o corte de 0,5% ao ano da solar **não** sai do IRENA, é número de desenho. Misturar os dois daria aparência de ciência a uma escolha de jogo, que é o oposto do que a regra 9 quer.
- **Como verificar:**
  ```bash
  npm run typecheck && npm run test && npm run lint && npm run build && npm run format:check
  ```
  109 testes em 5 arquivos. O aceite é `ACEITE: um jogador que compra sempre que pode termina abaixo dos 3 °C` — o espelho exato do aceite do `P6-02`, que exige o contrário para quem não compra nada. Os dois juntos são a prova de que a árvore importa.
- **Pendente:**
  - **A medalha de Ouro é inalcançável, e não consertei.** Com `startTemperature` em 1,37 °C sobram 0,13 °C até o limiar de 1,5 do `§2.7` — 289 GtCO₂ para 75 anos, contra as 40,8 Gt/ano de onde a partida começa. Nem a árvore inteira comprada no primeiro mês chega lá: o melhor caso do modelo é 1,79 °C. As saídas são todas de desenho (`P3-03` com `P3-04`) e estão escritas no `docs/BALANCEAMENTO.md`.
  - **O Bronze sai por cinco milésimos.** 2,495 °C contra o limiar de 2,5. Isso não é margem desenhada, é coincidência: qualquer ajuste de custo ou de corte joga a jogada de referência para o outro lado. Vale saber antes do primeiro playtest.
  - **A última compra acontece em 2099** e não muda nada — o PAC continua entrando depois de a árvore não caber mais no tempo restante. É sintoma de que a economia tardia não tem para onde ir; é assunto do `P3-04`.
  - **O apoio termina no piso, em 25.** O ramo Sociedade empurra para cima e o desgaste do tempo puxa de volta. Hoje isso é inofensivo; quando os eventos (`P7-01`) e A Inércia (`P7-03`) começarem a furar o piso, essa folga some.
  - **O alvo regional do `Effect` não tem teste.** O tipo permite `target: RegionId | 'global'`, os 20 nós usam só `global`, e os ramos regionais do `emissionCutFor` e do empurrão de apoio compilam sem nenhum teste passar por eles. Não há como injetar uma habilidade regional sem abrir uma costura artificial no módulo. Quando o primeiro nó regional aparecer — `P7-04` é o candidato — é ali que esses caminhos ganham cobertura.
  - **O `P3-04` continua aberto.** Só o orçamento foi medido; a economia de PAC inteira (curva de entrada, custo por década, o que fazer com a sobra) é a tarefa.
  - **A Parte 5 está em zero e agora é o caminho crítico.** Não existe uma linha em `src/ui/`. O engine roda uma partida completa e vencível, e ninguém consegue jogá-la: sem HUD, sem mapa, sem botão de comprar. O marco `M2` (`P6-08`) pede "engine ligado à UI" — o que falta para o marco não é engine.
- **Evidência:** —

---

## 2026-08-18 — Três pendências fechadas: GDD em dia, piso de apatia e nomes em inglês

- **Parte / tarefa:** nenhuma nova do `PLANO.md` — são as três pendências que o `P6-02`, o `P6-03` e o `P6-04` deixaram anotadas, cobradas antes de abrir o `P6-05`.
- **Três commits, não um.** Renomeação mecânica misturada com mecânica nova é o tipo de diff que ninguém revisa de verdade. A ordem também foi escolhida: o piso **antes** da renomeação, para que os nomes novos atravessassem uma suíte que já cobria o comportamento novo — assim, um teste que quebrasse na leva 3 seria prova de erro de renomeação, e não de mecânica.
  1. `docs(gdd)` — o `§4` ganhou `realSecondsPerTick` e `supportFloor`.
  2. `feat(engine)` — o piso de apatia, com 7 testes novos.
  3. `refactor` — 365 identificadores para inglês, em 5 arquivos.
- **O `§4` estava desatualizado desde o `P6-04`.** O `realSecondsPerTick` vivia só no `balance.json`. Agora os dois lados têm as mesmas **14 chaves, na mesma ordem, com os mesmos valores** — conferido por script que lê o bloco `jsonc` do GDD e o JSON de verdade. O `supportFloor` entrou junto, um commit antes de existir no código: o GDD é o documento de design, e design vir antes da implementação é a ordem certa.
- **O piso de apatia, e a bomba-relógio que ele desarma.** O `supportDecayPerYear: 1.5` existia desde o primeiro dia **sem regra de aplicação**. Aplicá-lo do jeito óbvio dava isto: apoio começa em 50, cai 1,5 ao ano e **zera no tick 400 — ano de 2058**. Como o `§2.7` dá derrota por apoio médio zero, toda partida se perderia ali, fizesse o jogador o que fizesse. A saída escolhida foi um piso: o desgaste do tempo desce até `supportFloor: 25`, encosta nele em **2041** (tick 200) e para. Derrota por apoio deixa de ser automática e passa a exigir evento (`P7-01`) ou Inércia (`P7-03`).
  - **As duas alternativas descartadas, e por quê.** Amarrar o decaimento à Inércia (`decay × inertia/100`) é o que o `§2.6` descreve, mas hoje `inertia` é 0 e nada aplica o `inertiaGrowthPerYear` — daria duas constantes paradas em vez de uma. Zerar o `supportDecayPerYear` era honesto e menor, mas deixava o apoio congelado até a Parte 7.
- **O detalhe que quase virou bug.** A forma óbvia é `Math.max(piso, apoio - desgaste)` e pronto. Só que isso transforma o piso num **valor de repouso**: uma região derrubada a 10 por um evento seria *promovida* de volta a 25 no mês seguinte — o desgaste do tempo consertando o dano do evento. Por isso a guarda `if (support <= supportFloor) return support` vem antes do `Math.max`. Tem teste com uma região em 10 e outra exatamente em 25.
- **Conferi que os testes pegam.** Quatro defeitos plantados, um de cada vez: sem piso nenhum → **3 testes**; piso como valor de repouso → **1**; taxa anual cobrada todo mês → **2**; desgaste aplicado ao mapa de regiões velho, antes do clima → **2**. Todos revertidos.
  - **O terceiro derrubava só 1 na primeira rodada, e o motivo era estrutural:** o piso absorve o erro de taxa, então todos os outros testes seguiam coerentes consigo mesmos. Acrescentei o teste `encosta no piso em 2041` — o ano é fato de balanceamento, não conta derivada das constantes — e aí o defeito passou a derrubar 2. Mesmo tipo de furo que o `P6-03` achou, pela mesma razão.
- **A renomeação foi feita pela AST, não por regex — e isso não é preciosismo.** O `§11` manda identificadores em inglês e prosa em pt-BR. Um `s/estado/state/g` acertaria as variáveis **e destruiria a prosa**, porque "estado" aparece em quase todo comentário e em vários nomes de teste. A ferramenta usa o `typescript` que já está instalado: monta a AST, reescreve **só** nós `Identifier` e não enxerga comentário nem string. Depois, uma segunda passada extrai toda a prosa dos dois lados — comentários pelo scanner, strings e templates pela AST — e compara. **Prosa idêntica nos 5 arquivos, medida contra o `HEAD`.** Sem essa prova, "só renomeei" é promessa, não fato.
  - **Escopo:** no `src/`, o `state.ts` era o único arquivo fora da regra — `rng.ts`, `climate.ts` e `tick.ts` já estavam certos. Os 4 arquivos de teste estavam todos em pt-BR. Nomes de `describe`/`it`, comentários e mensagens de erro continuam em pt-BR, que é o que a regra manda.
  - O Prettier reformatou uma coisa sozinho: a lista de parâmetros do `assertRange` (ex-`assertFaixa`) voltou para uma linha só, porque os nomes mais curtos passaram a caber na largura. Está no diff.
- **Como verificar:**
  ```bash
  npm run typecheck && npm run test && npm run lint && npm run build && npm run format:check
  ```
  68 testes em 4 arquivos. O aceite do piso é o teste `ACEITE: 2058 deixa de decidir a partida sozinho`.
- **Pendente:**
  - **O `P3-05` continua aberto.** Só a fatia do `supportDecayPerYear` foi decidida aqui. Gatilhos, ações e contra-ataques da Inércia seguem por fazer — e o `inertiaGrowthPerYear` continua **inerte**: nada no engine faz a Inércia crescer.
  - **Ninguém verifica derrota.** O `§2.7` define derrota por temperatura acima de 3 °C **ou** apoio médio zero, e o engine não tem função que dê a partida por perdida — quem faz essa conta hoje são só os testes. É trabalho do `P6-08` com a Parte 7.
  - **`supportFloor: 25` é decisão de desenho, não número com fonte.** Está no `docs/BALANCEAMENTO.md` com resultado "não testado", junto do que observar no primeiro playtest.
  - **Entradas antigas deste diário citam `porId`, `faltando` e `regiao`**, nomes que não existem mais. Não foram editadas, pela regra de sempre: elas descrevem o que era verdade na data delas.
  - O `P6-05` está destravado e é o próximo da fila: `skills.ts` mais os 20 nós da árvore.
- **Evidência:** —

---

## 2026-08-18 — Relógio de tempo real: a partida anda igual em qualquer FPS

- **Parte / tarefa:** `P6-04` ✔
- **O que mudou:**
  - `src/engine/tick.ts` — ganhou a segunda metade: `Clock`, `createClock`, `stepsForElapsed` e `advanceRealTime`.
  - `tests/tick.test.ts` — 10 testes novos. Suíte total: **61**.
  - `src/data/balance.json` — constante nova: `realSecondsPerTick: 1.5`. O tipo `Balance` acompanhou.
- **Onde o relógio mora, e por quê não é um arquivo novo.** O `FORMA-DE-TRABALHO.md §3` lista os arquivos do `engine/` e não prevê um `clock.ts`; criar arquivo fora da estrutura documentada é coisa de pedir antes. O `tick.ts` já se chama "avanço de tempo", que é exatamente o que um acumulador faz, então as duas metades ficaram juntas com uma divisória no cabeçalho. **Se crescer, extrair um `clock.ts` é o movimento natural — mas aí com o `§3` atualizado junto.**
- **O engine continua sem saber que existe uma tela.** Nem `stepsForElapsed` nem `advanceRealTime` conhecem `requestAnimationFrame`: quem mede o tempo do quadro é a UI, que passa o número para cá. É a regra de ouro da arquitetura do `§3` mantida no módulo que mais tentaria quebrá-la.
- **O ritmo: 1,5 segundo por mês de jogo.** Não foi escolha estética — é o ponto onde os dois alvos do `PLANO.md` se encontram: **22,5 min a 1x** (dentro da faixa de 20–30) e **5,6 min a 4x**, que entrega o Modo Feira (`P7-07`) quase de graça, sem precisar de um modo separado com regras próprias. Tem teste que trava as duas contas.
- **Teto de 12 passos por chamada, contra a espiral da morte.** Se a aba ficar dez minutos em segundo plano, o navegador entrega um quadro com 600 000 ms de uma vez. Sem teto, a simulação tentaria 400 ticks num quadro, travaria a página, e o quadro seguinte viria ainda mais atrasado. Com teto, ela descarta o atraso — a partida fica atrás do relógio de parede, que é o comportamento certo: voltar para a aba não deve adiantar vinte anos de jogo.
- **O aceite falhou na primeira tentativa, e o errado era o teste, não o código.** Eu tinha fixado o alvo em 60 000 ms de tempo real — que cai **exatamente** na fronteira do 40º tick. Ali um erro de ponto flutuante de 1,5 nanossegundo decide entre 39 e 40 ticks, e o teste vira refém do arredondamento em vez de medir o que interessa. Medi antes de mexer: **a 30 e a 144 FPS os dois davam 39**, ou seja, o aceite já passava; era a minha expectativa de 40 que estava errada. Refiz com 61 000 ms, fora de fronteira, e acrescentei um teste que declara a garantia honesta do acumulador — **o erro nunca passa de um tick**, e um mês de atraso num jogo de 1,5 s por mês é invisível.
  - O teste de velocidade tinha o mesmo tipo de erro meu: eu esperava `4x == 1x × 4`, o que é falso porque o `floor` de 1x descarta um resto que a corrida a 4x aproveita. O certo é comparar **4x por 10 s com 1x por 40 s**, que é o que ele faz agora.
- **Conferi que os testes pegam.** Três defeitos plantados: descartar o resto em vez de carregá-lo para o quadro seguinte derrubou **5 testes**, incluindo o aceite — que é o esperado, já que carregar o resto *é* o passo fixo; tirar o teto derrubou **1**; ignorar o multiplicador de velocidade derrubou **1**. Todos revertidos.
- **Como verificar:**
  ```bash
  npm run typecheck && npm run test && npm run lint && npm run build && npm run format:check
  ```
  61 testes em 4 arquivos. O aceite é o teste `ACEITE: a simulação avança igual a 30 e a 144 FPS`, que roda 1830 e 8784 quadros e exige estado final idêntico.
- **Pendente:**
  - **O `docs/GDD.md §4` não lista o `realSecondsPerTick`.** Mesma situação da constante anterior: o `§12` exige autorização e eu não a tinha para esta. É uma linha, e fica junto do resto quando você voltar.
  - **Ninguém chama o `advanceRealTime` ainda.** O laço de `requestAnimationFrame` é da UI, e a UI começa na Parte 5. Hoje o relógio existe, está testado, e está sem motorista.
  - Pausa e as velocidades 1x/2x/4x são o `P5-05`. O `speed` já é parâmetro; pausa é simplesmente não chamar.
- **Evidência:** —

---

## 2026-08-18 — O tempo passa: o tick de um mês

- **Parte / tarefa:** `P6-03` ✔
- **O que mudou:**
  - `src/engine/tick.ts` — implementado. `advanceTick` (o passo de um mês), mais `yearForTick`, `isOver` e a constante `TOTAL_TICKS`.
  - `tests/tick.test.ts` — 14 testes novos. Suíte total: **51**.
  - Nenhuma constante nova, nenhum dado novo, nenhuma edição no GDD. A tarefa é de orquestração.
- **O que um tick faz hoje:** avança `tick` e `year`, chama o `advanceClimate` do `P6-02` e acumula PAC (`basePointsPerYear` dividido por 12). É o loop do `docs/GDD.md §2.1` com as peças que já existem. Eventos (`P7-01`), Inércia (`P7-03`) e efeito de habilidade (`P6-05`) entram aqui quando chegarem — o arquivo diz isso no cabeçalho, para ninguém procurar noutro lugar.
- **A trava do fim da partida não é preciosismo.** Depois do tick 900, `advanceTick` devolve o estado recebido intacto. O motivo é o `P6-04`: o relógio de tempo real entrega vários ticks de uma vez quando um quadro demora, e sem a trava um engasgo de meio segundo empurraria a partida para além de 2100. Tem teste que roda 20 ticks depois do fim e exige estado idêntico.
- **Deixei duas coisas de fora de propósito:**
  - **O decaimento do apoio público.** A constante `supportDecayPerYear: 1.5` existe, mas o GDD não diz como ela se aplica — e a conta assusta: **apoio começa em 50, cai 1,5 por ano, zera em 2058.** Como o `§2.7` define derrota por apoio médio zero, aplicar isso sem mais nada faria toda partida ser perdida em 2058, faça o jogador o que fizer. Isso é decisão de desenho, não detalhe de implementação — é do `P3-05` com o `P3-04`, e não cabia eu resolver dentro de uma tarefa de orquestração de tempo.
  - **O `history`.** O `P6-01` deixou o `Snapshot` na forma mínima de propósito, escrito que quem define o que o gráfico final precisa é o `P7-06`. Preencher agora travaria um formato que pertence a outra tarefa.
- **Conferi que os testes pegam — e o exercício achou um furo meu.** Plantei quatro defeitos:
  1. Sem a trava do fim → **1 teste** falhou.
  2. Ano calculado a partir do tick antigo → **1 teste** falhou.
  3. PAC entrando à taxa anual a cada mês → **2 falharam**.
  4. Tick que esquece de avançar o clima → **2 falharam**.
  **O defeito 2 me incomodou por derrubar pouco**, e o motivo era meu: eu testava o ano no tick 25, que é meio de ano — e no meio do ano calcular a partir do tick antigo dá o mesmo resultado, então o erro de um tick passava batido. Acrescentei um teste na virada do ano (tick 11 e tick 12), que é o único lugar onde ele aparece. **Com ele, o defeito 2 passou a derrubar 2 testes.** É exatamente para isso que plantar defeito serve: não para confirmar que os testes passam, mas para descobrir o que eles não veem.
- **Amarração entre os dois módulos:** o `tick.test.ts` roda a partida inteira pelo `advanceTick` e exige chegar nos mesmos 3,3548 °C que o `climate.test.ts` trava rodando pelo `advanceClimate`. Se um dia os dois caminhos divergirem, alguém quebrou a ligação entre eles.
- **Como verificar:**
  ```bash
  npm run typecheck && npm run test && npm run lint && npm run build && npm run format:check
  ```
  51 testes em 4 arquivos.
- **Pendente:**
  - **Decisão sua, quando chegar no `P3-05`:** o que fazer com o `supportDecayPerYear`. Do jeito que a constante está, ela sozinha decide a partida em 2058.
  - **PAC entra fracionado** (0,833 por mês). É de propósito, para a barra encher continuamente em vez de saltar de ano em ano, mas quem for fazer o HUD (`P5-03`) precisa arredondar na exibição.
  - O `advanceTick` ainda não tem quem o chame: o relógio de tempo real é o `P6-04`, a próxima da fila.
- **Evidência:** —

---

## 2026-08-18 — O clima roda: não fazer nada agora perde o jogo

- **Parte / tarefa:** `P6-02` ✔
- **O que mudou:**
  - `src/engine/climate.ts` — implementado. Três exportações: `globalEmissions`, `temperatureFor` e `advanceClimate`, mais o `growEmissions` interno.
  - `tests/climate.test.ts` — 12 testes novos. Suíte total: **37**.
  - `src/data/balance.json` — constante nova: `baselineGrowthPerYear: 0.0093`. O tipo `Balance` em `state.ts` ganhou o campo.
  - `docs/CIENCIA.md` — a constante com fonte, uma quarta conferência e a seção do achado do `P3-01` reescrita: de problema em aberto para decisão registrada.
  - `docs/BALANCEAMENTO.md` — saiu do zero. As três primeiras linhas do histórico.
- **A decisão que a tarefa exigia antes da primeira linha de código: como as emissões crescem sem o jogador.** O `P3-01` tinha achado o furo — emissão constante terminava em 2,75 °C, abaixo dos 3 °C de derrota, e dava para vencer o jogo dormindo. Escolhemos **0,93% ao ano**, que não é chute: é exatamente a taxa que **dobra** as emissões até 2100, que é como o IPCC AR6 descreve o **SSP3-7.0**, o cenário de mundo sem política climática nova. Resultado: **3,35 °C em 2100**, e o jogador passivo cruza os 3 °C em **2089**.
- **A conferência que me deixou confortável com o número.** O AR6 dá **3,6 °C** de melhor estimativa para o SSP3-7.0. O jogo dá **3,35 °C** para a mesma trajetória de emissões. Os 0,25 °C de diferença apontam para o lado que o limite 4 do `CIENCIA.md` já previa — o jogo não simula metano nem os outros gases. **Um modelo que erra na direção certa, pelo motivo já documentado, é um modelo que se entende.** Se tivesse dado 3,9 °C, aí sim haveria algo errado.
- **Duas coisas que a decisão deliberadamente não fez, e o porquê:**
  - **Não usou a Inércia como motor da linha de base.** Ela age por cima do crescimento (`P7-03`), não no lugar dele. Se o antagonista fosse a única fonte de crescimento, o `climate.ts` dependeria de um módulo que ainda não existe e o aceite desta tarefa seria impossível de verificar hoje.
  - **Não mexeu no `loseTemperature`.** Baixar o limiar até a conta fechar seria ajustar a ficção ao número.
- **Detalhe de implementação que evita um erro que só apareceria no fim da partida:** o crescimento por tick é a **raiz de ordem 12** da taxa anual, não `taxa / 12`. As duas parecem iguais e não são — a segunda faz doze meses somarem um pouco mais que um ano, e o resto se acumula por 900 ticks. Tem teste só para isso.
- **A ordem dentro do tick também é decisão, não acaso:** a emissão do mês entra com a taxa vigente **antes** de a taxa crescer. Inverter adiantaria um mês de crescimento e faria a partida terminar mais quente do que a fonte descreve. Também tem teste.
- **Conferi que os testes pegam.** Plantei três defeitos, um de cada vez:
  1. Crescimento `taxa / 12` em vez da raiz → **3 testes falharam**, incluindo o dos valores de referência.
  2. Crescer antes de acumular → **2 falharam**.
  3. `baselineGrowthPerYear` de volta a zero, que é o furo original → **4 falharam**, entre eles o do aceite.
  Nenhum defeito derrubou a suíte inteira, que é o ponto: os testes discriminam, não estão só acoplados uns aos outros. Todos revertidos.
- **Valores de referência travados**, no mesmo espírito dos do `rng.ts`: 4410,6 GtCO₂ acumulados e 3,3548 °C em 2100. Sem eles, uma refatoração muda a curva do jogo inteiro e todos os outros testes continuam verdes, porque cada um segue coerente consigo mesmo.
- **Como verificar:**
  ```bash
  npm run typecheck && npm run test && npm run lint && npm run build && npm run format:check
  ```
  37 testes em 3 arquivos. O aceite da tarefa é o bloco `a partida inteira sem nenhuma habilidade`, que roda os 900 ticks e exige terminar acima de 3 °C.
- **Pendente:**
  - ~~O `docs/GDD.md §4` não lista o `baselineGrowthPerYear`.~~ **Resolvido logo depois, na mesma sessão, com autorização.** A chave entrou no bloco do `§4` e ganhou um parágrafo explicando que a linha de base é o SSP3-7.0 e que A Inércia age por cima dela. Conferido por script: os dois lados têm as mesmas 12 chaves, na mesma ordem, com os mesmos valores.
  - **`climate.ts` não mexe em `tick`, `year` nem `history`.** É de propósito: quem orquestra a passagem do mês é o `P6-03`, e quem alimenta o gráfico final é o `P7-06`. O `advanceClimate` faz só a parte de carbono.
  - **Nenhuma habilidade abate emissões ainda**, porque `skills.ts` é `P6-05`. Hoje o `emissionCut` existe como tipo e não como efeito — a curva de 3,35 °C é, por enquanto, a única curva possível.
  - **Convenção de nomes divergindo:** o `§11` manda nomes de variáveis em inglês, mas o `state.ts` do `P6-01` usa português nos locais (`porId`, `faltando`, `regiao`). Escrevi o `climate.ts` seguindo a regra escrita. **Vale decidir qual das duas vale antes que o terceiro módulo entre e a mistura fique cara.**
- **Evidência:** —

---

## 2026-08-18 — Marco M1 fechado

- **Parte / tarefa:** `SETUP-07` ✔ · `P4-06` **M1** ✔
- **O que mudou:** só os checkboxes do `PLANO.md`. Nenhum arquivo do projeto foi tocado — o trabalho dessas duas linhas já estava feito; faltava a verificação.
- **O aceite do `SETUP-07` era observação, não trabalho, e agora tem evidência.** Ele pedia duas coisas que só o tempo podia provar:
  1. **"Um commit de teste sai sem trailer de IA."** Desde que o hook entrou (`7c1fe05`), saíram **4 commits**: `44e699c`, `8011fbd`, `50168af` e `f6b65af`. Nenhum tem trailer. Varri também o histórico inteiro procurando `Co-Authored-By: Claude`, `Generated with [Claude Code]` e o emoji de robô: **zero ocorrências em todo o repositório.**
  2. **"O agente recusa `git commit`."** As três camadas estão ativas: `includeCoAuthoredBy: false` e **14 regras de `deny`** no `.claude/settings.json`, o `.githooks/commit-msg` executável (`-rwxr-xr-x`) e o `core.hooksPath` apontando para `.githooks`. Não testei rodando `git commit` — tentar já é proibido pelo `§12`, e a prova pedida é o resultado dos commits acima, não uma simulação.
- **O que o M1 entrega, de fato:** repositório com regras escritas, CI que roda os 5 comandos em todo push, deploy automático e **uma tela pública no ar** em <https://blafxd.github.io/Jogo-do-bem-no-Estilo-Plague-INC/>. O engine já tem RNG semeado, tipos do domínio, estado inicial e dados climáticos com fonte. 25 testes.
- **Definition of Done do `§11`, item a item, sem maquiar:** typecheck, test e build passando ✔ · deploy no Pages atualizado ✔ · entrada no `PROGRESSO.md` ✔ · nenhum `TODO` sem dono ✔ · print em `docs/evidencias/` ✔. **Marco fechado com o DoD inteiro cumprido.**
- **O print quase entrou errado, e isso vale mais registrado do que escondido.** A primeira captura foi da própria página no ar — e saiu **byte a byte idêntica** à evidência do `SETUP-02` de 2026-08-07: mesmo SHA-256, mesmos 12.986 bytes. Faz sentido, é o mesmo HTML estático no mesmo viewport, e a ferramenta captura só o conteúdo da página, sem barra de endereço. **Só que isso a torna inútil como prova de deploy: um print do `localhost` sairia igualzinho.** Troquei pela tela de _Deployments_ do GitHub, que mostra o ambiente `github-pages` ativo, a URL pública escrita na página e o histórico das execuções que falhavam virando sucesso.
- **Detalhe cosmético, para não virar mistério depois:** o commit `50168af` ficou com um espaço sobrando no começo da mensagem. Não é o hook — ele só remove linhas, não mexe em espaço. Foi a mensagem que entrou assim. Fica como está: consertar exigiria reescrever histórico já publicado, o que é bem pior que a falha.
- **Como verificar:**
  ```bash
  grep -nE "^- \[.\] \`(SETUP-0[1-7]|P4-06)\`" PLANO.md    # os 8 com [x]
  git log --all --format='%B' | grep -icE "co-authored-by: claude|generated with \[claude"   # 0
  git config core.hooksPath                                # .githooks
  ```
- **Pendente:**
  - **A próxima tarefa é `P6-02`, e ela já nasce com um requisito herdado:** decidir como as emissões crescem na linha de base. Está escrito em `docs/CIENCIA.md`, na seção do achado — sem isso, não fazer nada não perde o jogo.
  - As actions do `ci.yml` seguem com aviso de Node 20 depreciado. Aviso hoje, quebra amanhã.
- **Evidência:** `docs/evidencias/2026-08-18-m1-pages-no-ar.jpg` — tela de _Deployments_ do repositório, com a URL pública e o deploy ativo.

---

## 2026-08-18 — Pages no ar: o repositório virou público e o deploy passou

- **Parte / tarefa:** `SETUP-04` ✔
- **O que mudou:** nada no código. As mudanças foram na configuração do repositório no GitHub.
  - **Repositório de privado para público**, com sua autorização.
  - **GitHub Pages habilitado** com `build_type: workflow` (a fonte é o Actions, não uma branch `gh-pages`) e HTTPS obrigatório.
  - Execução do `ci.yml` disparada pelo botão (`workflow_dispatch`) para republicar sem precisar de commit novo.
  - `PLANO.md` — `SETUP-04` marcado.
- **A causa real da falha não era o workflow, e vale registrar para não caçar no lugar errado de novo.** Por 5 execuções o job `publicar` falhou com `404 — Ensure GitHub Pages has been enabled`, o que parece configuração faltando. Ao tentar habilitar pela API, a resposta foi outra: `Your current plan does not support GitHub Pages for this repository` (HTTP 422). **No plano gratuito do GitHub, o Pages só funciona em repositório público.** O 404 era sintoma; a causa era o repositório ser privado. Nenhuma linha do `ci.yml` precisou mudar.
- **Varredura antes de tornar público.** Tornar público é irreversível na prática — o que sai, sai. Antes disso conferi: nenhum arquivo `.env`, nenhuma chave, nenhum token no conteúdo versionado, licença MIT já no lugar. O único dado pessoal exposto é o e-mail dos commits, que é o mesmo que já aparecia no perfil. **Se incomodar, dá para trocar por um endereço `noreply` do GitHub nos commits futuros.**
- **O aceite foi verificado de verdade, não de olho na aba verde.** A página responde `200`, entrega o HTML certo (`<title>Ponto de Virada</title>`) e o bundle referenciado carrega: `assets/index-BJNT7GbZ.js`, `200`, 818 bytes — o mesmo hash e o mesmo tamanho do build local. Isso prova de quebra que o `base: './'` do `vite.config.ts` resolve certo no subcaminho do Pages, que era a aposta feita lá no `SETUP-02`.
- **URL pública:** <https://blafxd.github.io/Jogo-do-bem-no-Estilo-Plague-INC/>
- **Como verificar:**
  ```bash
  gh run list --workflow=ci.yml --limit 1          # verificar e publicar, os dois verdes
  curl -sS -o /dev/null -w "%{http_code}\n" https://blafxd.github.io/Jogo-do-bem-no-Estilo-Plague-INC/
  ```
- **Pendente:**
  - **As actions do `ci.yml` estão ficando velhas.** O GitHub avisa em toda execução que `checkout@v4`, `setup-node@v4` e `upload-pages-artifact@v3` miram Node 20 e estão sendo forçadas a rodar no Node 24. Hoje é só aviso; quando virar erro, quebra o deploy. Subir os majors é tarefa de meia hora que não vale a pena fazer na véspera da feira.
  - **`SETUP-07` é a única coisa entre aqui e o marco M1** (`P4-06`). O aceite dele já está cumprido: os três últimos commits saíram sem trailer de IA, com `core.hooksPath` ativo. Falta só trocar o `[~]` por `[x]`.
  - Repositório público significa que `PLANO.md`, `PROGRESSO.md` e o `docs/GDD.md` estão legíveis por qualquer pessoa. É bom para a defesa do projeto e para o QR code do estande (`P8-06`), mas convém lembrar disso antes de escrever qualquer coisa aqui.
- **Evidência:** — (a URL pública é a própria evidência; um print dela cabe no `docs/evidencias/`)

---

## 2026-08-18 — `rngState` confirmado no contrato do GDD

- **Parte / tarefa:** `P6-01` — pendência fechada
- **O que mudou:**
  - `docs/GDD.md §3` — `rngState: number` entrou no `GameState`, ao lado de `seed`, cada um com o seu papel escrito na própria linha. A nota do RNG no fim da seção passou a dizer **por que** são dois campos e não um.
  - `src/engine/state.ts` — só comentário: o campo deixou de ser "um campo a mais em relação ao GDD" e passou a apontar para o contrato que agora o prevê.
- **O que a confirmação destrava:** o `P6-07` (save e load em `localStorage`) pode ser escrito sem decidir nada antes. Com um campo só, ou o save perderia a identidade da partida, ou recarregar reiniciaria o sorteio do zero — que é exatamente o bug que o RNG semeado existe para evitar.
- **Nenhuma linha de código mudou.** `RngState` já era `number` no `rng.ts` e o campo já existia no `GameState` desde o `P6-01`. O que faltava era o contrato reconhecer o que a implementação já fazia — e é essa distância entre documento e código que apodrece calada.
- **Como verificar:**
  ```bash
  grep -n "rngState" docs/GDD.md src/engine/state.ts
  npm run typecheck && npm run test && npm run lint && npm run build && npm run format:check
  ```
  O `GameState` do `docs/GDD.md §3` e o do `src/engine/state.ts` voltaram a ter exatamente os mesmos 12 campos.
- **Pendente:** nada desta decisão.
- **Evidência:** —

---

## 2026-08-18 — Dados climáticos com fonte: as 8 regiões saíram do zero

- **Parte / tarefa:** `P3-01` ✔
- **O que mudou:**
  - `docs/CIENCIA.md` — reescrito. Tabela de fontes primárias, as constantes de `balance.json` com origem, os dados das 8 regiões, o mapa de agregação país a país, três conferências e sete limites assumidos.
  - `src/data/regions.json` — `population`, `emissions` e `cleanShare` preenchidos nas 8 regiões. Eram zero desde o `P6-01`.
  - `src/data/balance.json` — `startTemperature` 1,3 → **1,37**; `startEmissions` 41 → **40,753**. `tcre` ficou em 0,00045: era o único valor que já estava certo.
  - `docs/GDD.md` — 4 linhas, **com autorização no chat** (o `§12` proíbe sem pedir): os dois valores do `§4` e, no `§3`, a unidade de `emissions` e a definição de `cleanShare`.
  - `src/engine/state.ts` — só comentário: as mesmas duas unidades, mais um ponteiro para o `CIENCIA.md` em cada uma.
  - `tests/state.test.ts` — 2 testes novos. Suíte total: 25.
- **De onde vieram os números.** TCRE do IPCC AR6 (0,45 °C por 1000 GtCO₂); aquecimento de origem humana em 2025 do Indicators of Global Climate Change 2025 (1,37 °C); emissões e população por país do Global Carbon Budget e da ONU, energia do Ember e do Energy Institute, ambos via Our World in Data. Todos com link e data de consulta no `CIENCIA.md`.
- **As 8 macrorregiões não existem em fonte nenhuma — precisei montá-las.** Agreguei 197 países usando as sub-regiões da ONU (M49) como recorte, com 4 exceções que mudam número e estão todas escritas: Sudeste Asiático entra na Ásia Oriental, Ásia Central entra no Oriente Médio, o Irã sai da Ásia Meridional para o Oriente Médio, e Taiwan (que o M49 não lista) entra na Ásia Oriental. O `CIENCIA.md` traz o procedimento inteiro — **qualquer pessoa com os mesmos CSVs chega nos mesmos números.** Isso importa: é o que faz a tabela ser defensável se alguém perguntar na apresentação.
- **Troquei a definição de `cleanShare`, e essa foi a decisão mais importante do dia.** O `GDD §3` dizia "fração da matriz energética". Fui atrás e a série de energia primária limpa por país só existe para **4 dos 56 países africanos** — somar dá 0,028 para a África, quando a própria fonte publica 0,095 para o continente. Errado por mais de 3x, justamente na região que o jogo quer mostrar. A série de **eletricidade** cobre 44 países africanos e fecha com o total mundial. Com sua autorização, `cleanShare` passou a ser a fatia limpa da **matriz elétrica**. De quebra casa melhor com o ramo Energia da árvore, que é todo intervenção em eletricidade (solar, eólica, bateria, rede).
- **Três conferências, porque erro de agregação vira mecânica errada e ninguém percebe:**
  1. A fatia limpa de eletricidade somando os 197 países dá **39,4%** — idêntico ao total mundial publicado. Se estivesse perdendo país, cairia.
  2. Soma nacional de CO₂ fóssil (36,667 Gt) + aviação e navegação internacionais (1,125 Gt) = 37,792 Gt, **exatamente** a linha `World` da fonte.
  3. A fórmula do `§4` com emissão constante dá **2,75 °C em 2100**; o UNEP projeta **2,8 °C** para o cenário de políticas atuais. Um modelo de uma linha errar por 0,05 °C é a evidência mais forte de que `tcre` e as emissões estão certos.
- **O achado que muda o `P6-02`: com os números certos, não fazer nada não perde o jogo.** 2,75 °C em 2100 está **abaixo** dos 3,0 °C de `loseTemperature` — dá para deixar o tempo correr até o fim sem comprar nada e sobreviver. Não é bug do modelo, é o modelo acertando: catástrofe depende de as emissões **crescerem**, e quem faz isso no jogo é A Inércia. **Consequência prática: a linha de base do `P6-02` não pode ser emissão constante, ou o antagonista deixa de ser tempero e vira requisito da condição de derrota.** Para referência: chegar a 3,0 °C exige média de 48,3 GtCO₂/ano, ~19% acima do valor de partida. Está escrito no `CIENCIA.md`, endereçado a `P6-02` e `P3-05`.
- **`startEmissions` agora é a soma das 8 regiões, por construção.** Não é coincidência nem arredondamento: se alguém editar uma região sem refazer a soma, o global e o regional passam a discordar e a simulação de clima fica errada em silêncio. É por isso que um dos testes novos trava exatamente essa igualdade.
- **Conferi que os testes novos pegam.** Plantei os dois defeitos que eles existem para impedir — zerei o `emissions` da Oceania e voltei o `startEmissions` para 41. **Os 2 falharam e os outros 23 continuaram verdes.** Defeitos revertidos.
- **Como verificar:**
  ```bash
  npm run typecheck && npm run test && npm run lint && npm run build && npm run format:check
  ```
  25 testes em 2 arquivos. Para conferir a conta central sem abrir o código:
  ```bash
  node -e "const b=require('./src/data/balance.json'),r=require('./src/data/regions.json');const s=r.reduce((a,x)=>a+x.emissions,0);console.log('soma das regioes:',s.toFixed(3),'| 2100 sem habilidade:',(b.startTemperature+b.tcre*s*75).toFixed(2),'C')"
  ```
- **Pendente:**
  - **`P6-02` está destravado, mas com um requisito novo:** decidir como as emissões crescem na linha de base. Não dá para escrever `climate.ts` fingindo que essa decisão não existe.
  - ~~A decisão do `rngState` continua aberta.~~ **Resolvida na mesma sessão, logo depois desta tarefa** — está na entrada acima.
  - **Dado de 2023 num jogo que começa em 2025.** É o último ano com quebra por país. Quando o Global Carbon Budget publicar 2025 por país, é refazer a agregação — o procedimento está escrito.
  - **Aviação e navegação internacionais (1,117 Gt) ficaram de fora** por não serem atribuídas a país nenhum. O jogo emite 2,4% a menos que o mundo real de 2023.
  - `docs/BALANCEAMENTO.md` continua vazio. A primeira linha dele nasce quando o `P6-02` decidir o crescimento da linha de base.
- **Evidência:** —

---

## 2026-08-07 — Tipos do domínio e estado inicial da partida

- **Parte / tarefa:** `P6-01` ✔
- **O que mudou:**
  - `src/engine/state.ts` — todos os tipos do `docs/GDD.md §3` (`Region`, `Skill`, `Effect`, `ClimateEvent`, `GameState`), mais `createInitialState(seed)` e `parseRegions`.
  - `src/data/balance.json` — preenchido com os 11 valores do `docs/GDD.md §4`.
  - `src/data/regions.json` — as 8 macrorregiões, com nome e id.
  - `tests/state.test.ts` — 13 testes. Suíte total: 23.
  - `docs/CIENCIA.md` — registradas as constantes climáticas que entraram, todas marcadas como **sem fonte**.
- **Três tipos que o GDD cita mas não define, e que precisei desenhar:** `SkillId` (alias de `string`, porque as habilidades vêm de JSON e não dá para enumerar em tipo), `ActiveEvent` e `Snapshot`. Os dois últimos ficaram na forma mínima de propósito — quem define o ciclo de vida de um evento é `P7-01`, e quem define o que o gráfico final precisa é `P7-06`. Estão marcados assim no código.
- **Campo novo no `GameState`, que precisa da sua confirmação: `rngState`.** O `GDD §3` prevê só `seed: number`. Separei em dois:
  - `seed` — a seed original, nunca muda. É o que identifica a partida e permite repetir uma igual.
  - `rngState` — a posição atual do gerador, que anda a cada sorteio.
  - **Por que não dá para ser um campo só:** o `P6-07` vai salvar em `localStorage`. Se o mesmo número fizesse os dois papéis, ou o save perderia a identidade da partida, ou recarregar reiniciaria o sorteio do zero — que é justamente o bug que o RNG semeado existe para evitar. **Não editei o `docs/GDD.md`** (§12 proíbe sem pedir); a decisão está registrada no comentário do campo.
- **`parseRegions` valida o que o `tsc` não alcança.** O compilador garante o formato do JSON, mas não sabe que `support` vai de 0 a 100, que os 8 ids têm que estar presentes e sem repetição, nem que `"br"` não é uma região válida. Como `src/data/*.json` é exatamente o arquivo que o pacote `[D-Historia]` vai editar à mão sem abrir um `.ts`, o erro precisa apontar o campo errado — não estourar longe dali, no meio de um tick. Sete testes cobrem exatamente esses casos.
- **Limite importante do que foi entregue: `population`, `emissions` e `cleanShare` estão todos em zero nas 8 regiões.** Não é esquecimento — são dados do mundo real e a regra 9 proíbe inventá-los. **Enquanto estiverem zerados, a simulação de clima roda mas não produz resultado com significado.** Quem resolve é `P3-01`, com fonte. Registrado em `docs/CIENCIA.md`.
  - Mesmo problema, menor, nas constantes de `balance.json`: os valores vieram da redação do `GDD §4`, não de publicação consultada. São plausíveis, não verificados. Nenhum deles pode ser citado como fato no relatório ou na feira antes de `P3-01`.
- **Como verificar:**
  ```bash
  npm run test        # 2 arquivos, 23 testes
  npm run typecheck && npm run lint && npm run build && npm run format:check
  ```
- **Pendente:**
  - **Decisão sua:** confirmar (ou recusar) o `rngState` no `GDD §3`.
  - `P3-01` virou bloqueio real de `P6-02`: dá para escrever a fórmula do clima e testá-la com números sintéticos, mas não dá para verificar o aceite ("sem nenhuma habilidade, a partida termina acima de 3 °C") com emissões zeradas.
  - `skills.json` e `events.json` continuam vazios — são `P6-05` e `P7-01`.
- **Evidência:** —

---

## 2026-08-07 — Guardrails de git e remoção do teste de fumaça

- **Parte / tarefa:** `SETUP-07` (em andamento — falta uma observação, ver abaixo)
- **O que mudou:**
  - `tests/toolchain.test.ts` **apagado**, com autorização. Cumpriu o que prometia: existiu do `SETUP-03` ao `SETUP-06` só para o `npm run test` ter o que rodar. A suíte segue com 10 testes, todos do RNG.
  - `.claude/settings.json` **criado e versionado** — `includeCoAuthoredBy: false` e a lista de `deny` do `FORMA-DE-TRABALHO.md §4.1`. Versionado de propósito: quando o grupo entrar, a trava já vale para todo mundo sem ninguém configurar nada.
  - `.githooks/commit-msg` **criado**, executável, e `core.hooksPath` apontado para `.githooks`.
  - `.gitattributes` — regra nova, explicada abaixo.
- **Bug encontrado e corrigido antes de existir: o hook quebraria em qualquer máquina que clonasse o repositório.** O `core.autocrlf` está em `true` e o `.gitattributes` só tinha `* text=auto`. Com isso o checkout entregaria o `commit-msg` com CRLF, o shebang viraria `#!/bin/sh\r`, e o `sh` recusaria com "bad interpreter". **A falha é silenciosa** — o commit passa normalmente, só que sem trava nenhuma. E não apareceria aqui: o arquivo escrito localmente já nasceu com LF; o estrago só surgiria no `git clone` do colega. Corrigido com `.githooks/** text eol=lf`, e conferido com `git check-attr` (`eol: lf`).
- **Teste do hook, sem commitar.** Chamei o script direto com quatro arquivos de mensagem:
  1. Mensagem normal → intacta.
  2. `Co-Authored-By: Claude ...` → linha removida.
  3. `🤖 Generated with [Claude Code](...)` → linha removida.
  4. **Co-autor real + o da IA → o real ficou, só o da IA saiu.** É o caso que vai importar quando o grupo se formar e houver commit de duas pessoas.
- **A trava de `deny` foi demonstrada por acidente:** logo depois de criar o `settings.json`, um comando meu de limpeza com `rm -rf` foi **bloqueado** pela regra `Bash(rm -rf:*)`. Não estava planejado, mas é a evidência mais honesta de que a lista funciona.
- **Conferido que nada foi desativado:** `.git/hooks/` só tinha arquivos `.sample` (inativos), então apontar o `core.hooksPath` para `.githooks` não desligou nenhum hook em uso.
- **Como verificar:**
  ```bash
  git config core.hooksPath                       # .githooks
  git check-attr text eol -- .githooks/commit-msg # text: set, eol: lf
  ls -l .githooks/commit-msg                      # precisa estar executável (x)
  ```
- **Pendente:**
  - **`core.hooksPath` é por máquina e não é versionado.** Quem clonar o repositório precisa rodar `git config core.hooksPath .githooks` uma vez. Está escrito no `FORMA-DE-TRABALHO.md §4.1` e vai para o `README.md` de onboarding (`P4-04`).
  - **A tarefa fica `[~]` por um motivo específico:** o aceite tem duas partes que eu não posso verificar sem violar as próprias regras que acabei de instalar. Não testei `git commit` porque tentar já é proibido (§12), e não posso fazer o commit de teste. **Vira `[x]` no seu próximo commit** — se ele sair sem trailer de IA, está fechado. É observação, não trabalho.
- **Evidência:** —

---

## 2026-08-07 — RNG semeado (mulberry32) — primeiro código do engine

- **Parte / tarefa:** `SETUP-06` ✔
- **O que mudou:**
  - `src/engine/rng.ts` — implementado. Três exportações: `nextRandom` (passo puro), `mulberry32` (gerador com estado interno, a forma escrita no `docs/GDD.md §3`) e `createRngState` (normaliza a seed).
  - `tests/rng.test.ts` — 12 testes.
- **Decisão de desenho: o núcleo é um passo puro, não um closure.** A versão mais divulgada do mulberry32 devolve uma função que guarda o estado dentro dela. Isso não serve aqui por dois motivos:
  1. **§4 manda funções do engine serem puras.** Um closure com estado mutável dentro do `engine/` contraria a regra logo no primeiro arquivo.
  2. **`P6-07` vai salvar a partida no `localStorage`.** Closure não se serializa. Salvar no meio da partida e recarregar reiniciaria o sorteio do zero — a partida deixaria de ser reprodutível justamente no caso em que a reprodutibilidade importa.
  - `nextRandom(state)` devolve `{ value, state }` e não toca no que recebeu. O `mulberry32(seed)` do GDD continua existindo, implementado em cima dele, para uso local dentro de uma função. Está escrito no próprio arquivo que ele **não** deve ser usado em nada que precise ser salvo.
- **Detalhe de implementação que evita um bug lento:** o estado é mantido em 32 bits (`>>> 0`) em vez de deixar o acumulador crescer como ponto flutuante, que é como o código mais copiado do algoritmo faz. Deixar crescer funciona no começo e apodrece depois: passando de 2⁵³ o `number` perde precisão inteira e a sequência para de ser reprodutível. Numa partida de 900 ticks talvez nunca aparecesse — mas apareceria num teste longo, e o custo de fazer certo agora é zero.
- **Testes travam valores de referência, não só coerência interna.** `SEQUENCIA_SEED_42` guarda os 6 primeiros valores da seed 42, e outro teste guarda o estado após 3 passos da seed 2025. Isso é o que faz o determinismo valer **entre builds**: sem essas constantes, uma refatoração muda o gerador, todos os outros testes continuam verdes (a sequência segue igual a ela mesma) e toda partida salva muda em silêncio.
- **Verificação de que os testes realmente pegam:** alterei a constante do algoritmo de `0x6d2b79f5` para `0x6d2b79f6` de propósito e rodei. **Só os 2 testes de valor de referência falharam; os outros 10 passaram** — que é exatamente a demonstração de por que eles existem. Constante revertida em seguida.
- **Como verificar:**
  ```bash
  npm run test                # 2 arquivos, 12 testes
  npm run typecheck && npm run lint && npm run build && npm run format:check
  ```
  Números conferidos contra a referência pública do mulberry32 (seed 42 começa em `0.6011037519201636`) e distribuição sã: média `0,49925` em 200 mil sorteios.
- **Pendente:**
  - **`tests/toolchain.test.ts` deveria morrer agora.** O próprio arquivo diz que sai no `SETUP-06`. Não apaguei porque a regra 3 proíbe o agente apagar arquivo sem pedir — fica para a próxima sessão, ou some no mesmo commit se eu remover à mão.
  - Faltam auxiliares que os eventos vão precisar (sortear inteiro numa faixa, escolher item por peso). São escopo de `P7-01`, não deste `SETUP-06` — entram junto com quem os usa.
  - O `RngState` ainda não está no `GameState`; isso é `P6-01`.
- **Evidência:** —

---

## 2026-08-07 — Esqueleto de pastas do projeto

- **Parte / tarefa:** `SETUP-05` ✔
- **O que mudou:** criada a estrutura do `FORMA-DE-TRABALHO.md §3`, toda vazia.
  - `src/engine/` — `rng.ts`, `state.ts`, `climate.ts`, `tick.ts`, `skills.ts`, `events.ts`, `inertia.ts`
  - `src/data/` — `regions.json`, `skills.json`, `events.json`, `balance.json`
  - `src/ui/` — só um `.gitkeep`
  - `docs/` — `CIENCIA.md`, `CREDITOS.md`, `BALANCEAMENTO.md`
- **"Vazio" aqui não quer dizer arquivo em branco.** Cada `.ts` carrega um comentário com o que o módulo faz, onde está a especificação no `docs/GDD.md` e **qual tarefa do `PLANO.md` vai implementá-lo**. Isso atende o item do Definition of Done que proíbe `TODO` sem dono: todo arquivo em aberto tem um responsável escrito dentro dele. Sem isso, daqui a três semanas ninguém lembra se `inertia.ts` está vazio de propósito ou se foi esquecido.
- **Decisões pequenas que valem registro:**
  - Os `.json` levam `[]` e `{}` em vez de nada. Arquivo `.json` vazio é JSON inválido — o `npm run format:check` quebraria na hora.
  - `src/ui/.gitkeep` existe porque o git não versiona pasta vazia. Ele some quando o primeiro módulo de interface chegar (Parte 5).
  - **`balance.json` ficou como `{}` de propósito.** Os valores estão escritos no `docs/GDD.md §4`, mas preenchê-los é escopo de `P6-01`/`P6-02`, não deste `SETUP-05` — a tarefa pede estrutura, não conteúdo.
  - Os três documentos de `docs/` receberam **o formato de entrada**, não entradas. Cada um explica o que registrar e qual tarefa é dona dele (`P3-01` para o `CIENCIA.md`, `P3-02` e `P8-02` para o `BALANCEAMENTO.md`).
- **Como verificar:**
  ```bash
  npm run typecheck && npm run test && npm run lint && npm run build && npm run format:check
  ```
  Os arquivos só de comentário passam no `tsc` porque o `tsconfig.json` usa `moduleDetection: "force"` — sem isso, arquivo sem `import`/`export` não conta como módulo e o `isolatedModules` reclamaria.
- **Efeito colateral conferido: nenhum.** O bundle continua com 818 bytes e o mesmo hash de antes (`index-BJNT7GbZ.js`) — nada importa os arquivos novos ainda, então eles não entram no build.
- **Pendente:**
  - Nenhum dos arquivos criados tem implementação. Os primeiros a sair do zero são `rng.ts` (`SETUP-06`, próximo) e `state.ts` (`P6-01`).
  - `docs/CIENCIA.md` está com a seção do tsunami marcada como pendente, apontando para `P3-06`.
- **Evidência:** —

---

## 2026-08-07 — GitHub Actions: verificação em PR e deploy no Pages

- **Parte / tarefa:** `SETUP-04` (em andamento — **o aceite depende de um passo manual meu**, ver abaixo)
- **O que mudou:**
  - `.github/workflows/ci.yml` **criado** — um workflow, dois jobs.
    - **`verificar`** roda em *pull request* e em push na `main`: `npm ci`, depois `typecheck`, `test`, `lint`, `build` e `format:check`, nessa ordem. Ao final sobe `dist/` como artefato do Pages.
    - **`publicar`** roda só quando `verificar` passa (`needs: verificar`) **e** só na `main`. É o `needs` que impede a `main` de publicar código quebrado.
- **Decisões registradas:**
  - **Um arquivo, dois jobs** em vez de dois workflows. Evita buildar duas vezes: o artefato do Pages sai do mesmo job que já rodou os testes.
  - **`npm ci`, não `npm install`.** O `ci` instala exatamente o que está no `package-lock.json` e falha se o lock estiver desatualizado. É o que garante que a máquina da feira receba as versões testadas aqui.
  - **`node-version: '22'`** — casa com o `engines.node: ">=22.12.0"` do `package.json`. A máquina local está no 26, mas fixar o mínimo suportado é o que faz a CI pegar incompatibilidade cedo.
  - **A condição do `publicar` checa o ref, não só o tipo de evento.** Sem isso, o `workflow_dispatch` deixaria publicar a partir de qualquer branch pelo botão.
  - **`concurrency` com `cancel-in-progress`** — dois pushes seguidos não geram fila, e um deploy velho não sobrescreve um novo.
- **O que deu errado (fica registrado para não repetir):** rodei `npm ci` localmente para validar o lockfile e ele **falhou e apagou o `node_modules` no meio do caminho**. Não foi o lock: o Windows recusou a remoção de um binário nativo (`@rolldown/binding-win32-x64-msvc`) que ainda estava travado pelo build que havia acabado de rodar. Restaurei com `npm install` (109 pacotes, lockfile inalterado, todos os scripts verdes de novo).
  - **A lição:** para validar o lock no Windows, usar **`npm ci --dry-run`** — ele confere a sincronia entre `package.json` e `package-lock.json` sem encostar no disco. Rodou limpo (`up to date`), que é a prova que faltava de que a CI vai instalar sem erro.
- **Como verificar:**
  ```bash
  npx --yes js-yaml .github/workflows/ci.yml   # o YAML parseia e a estrutura confere
  npm ci --dry-run                             # lock em sincronia; NÃO usar `npm ci` puro aqui
  npm run typecheck && npm run test && npm run lint && npm run build
  ```
- **Pendente — o aceite ("URL pública abre") ainda não foi verificado, e não dá para verificar daqui:**
  1. **Passo manual, uma vez:** no GitHub, `Settings → Pages → Build and deployment → Source: GitHub Actions`. Enquanto isso não for feito, o job `publicar` falha com erro de ambiente.
  2. Depois: commitar e dar push na `main`, acompanhar a aba `Actions` e abrir a URL que o job `publicar` imprime.
  3. Só então `SETUP-04` vira `[x]`. Fica `[~]` até lá — mesmo critério usado no `SETUP-02`.
  - As versões das actions (`checkout@v4`, `setup-node@v4`, `upload-pages-artifact@v3`, `deploy-pages@v4`) foram escolhidas por serem majors estáveis, mas **não foram executadas de verdade nenhuma vez**. A primeira execução é o teste real.
- **Evidência:** —

---

## 2026-08-07 — Vitest, ESLint e Prettier; TypeScript rebaixado para 6.0.3

- **Parte / tarefa:** `SETUP-03` ✔
- **O risco do TypeScript 7 se materializou, e a saída registrada ontem foi usada.** O `typescript-eslint@8.66.0` declara `typescript: ">=4.8.4 <6.1.0"`; o projeto estava em `7.0.2`, fora da faixa. TypeScript rebaixado para **`~6.0.3`** (a última estável abaixo do teto). O `~` é deliberado: com `^`, o npm subiria para 6.1 e quebraria o par de novo.
  - **O que se perdeu:** o compilador nativo em Go do TS 7, que é bem mais rápido. Num projeto deste tamanho a diferença é irrelevante; lint com conhecimento de tipos vale mais.
  - **Quando revisitar:** quando o `typescript-eslint` anunciar suporte a TS 7. Aí é só soltar o pino.
  - `npm run typecheck` passou no TS 6.0.3 **sem uma única alteração de código** — todas as flags estritas do `tsconfig.json` (`erasableSyntaxOnly`, `exactOptionalPropertyTypes`, `noUncheckedIndexedAccess`, `verbatimModuleSyntax`) já existem na 6.0.
- **Instalado:** `vitest@4.1.10`, `eslint@10.8.0`, `typescript-eslint@8.66.0`, `prettier@3.9.6`, `eslint-config-prettier@10.1.8`, `@eslint/js`. Tudo já estava na lista permitida da `FORMA-DE-TRABALHO.md §2` — nenhuma dependência nova precisou de aprovação. 0 vulnerabilidades.
- **O que mudou:**
  - `eslint.config.js` — flat config. **O lint agora cobra as regras do projeto em vez de confiar na memória de quem revisa:** `no-console` (regra 6), `Math.random()` proibido com mensagem apontando para o RNG semeado (regra 7), `type` em vez de `interface` (§4), `@ts-ignore` barrado (regra 6) e — a mais importante — `no-restricted-imports` impedindo que `src/engine/**` importe de `ui/` (regra de ouro da arquitetura, §3).
  - `.prettierrc.json` — aspas simples, ponto e vírgula, vírgula final, 100 colunas, `endOfLine: lf` (casa com a normalização do `.gitattributes`).
  - `.prettierignore` — **ignora `*.md` de propósito.** Os documentos do projeto são formatados à mão, com tabelas alinhadas; uma passada do Prettier reflui tudo e gera um diff enorme sem ganho de legibilidade.
  - `vite.config.ts` — passa a importar `defineConfig` de `vitest/config` e ganha o bloco `test`. `environment: 'node'` de propósito: o engine é TS puro e não pode depender de DOM. Se a UI precisar de teste um dia, aí entra `jsdom` — e aí é dependência nova, com aprovação.
  - `tests/toolchain.test.ts` — teste de fumaça, 2 asserções.
  - `package.json` — scripts `test`, `test:watch`, `lint`, `lint:fix`, `format`, `format:check`.
- **Verificação do lint (o passo que costuma ser pulado):** regra que nunca dispara é regra que não existe. Criei um arquivo temporário em `src/engine/` violando as 5 regras de propósito e conferi que **todas as 5 dispararam**, com as mensagens certas. Arquivo apagado em seguida.
- **Como verificar:**
  ```bash
  npm run typecheck        # limpo
  npm run test             # 1 arquivo, 2 testes passando
  npm run lint             # limpo, exit 0
  npm run build            # gera dist/
  npm run format:check     # "All matched files use Prettier code style!"
  ```
- **Pendente:**
  - **`tests/toolchain.test.ts` tem dono e data de morte:** sai no `SETUP-06`, quando entrar o teste de determinismo do RNG. Está escrito dentro do próprio arquivo. Se sobreviver ao `SETUP-06`, foi esquecimento.
  - **Lint com conhecimento de tipos não foi ligado.** O `typescript-eslint` tem `recommendedTypeChecked`, que pega coisas que a versão sintática não pega (promessa não aguardada, comparação sempre falsa). Exige `parserOptions.projectService` e deixa o lint mais lento. Ficou de fora para não virar um buraco no meio do `SETUP-03`; vale uma tarefa própria depois do M1.
  - A regra 5 da `FORMA-DE-TRABALHO.md` (`typecheck && test && build`) agora pode ser cumprida **inteira** — era meia até hoje.
  - `SETUP-04` está destravado: a CI já tem os 4 comandos para rodar.
- **Evidência:** —

---

## 2026-08-07 — Regras divididas em `docs/GDD.md` e `FORMA-DE-TRABALHO.md`

- **Parte / tarefa:** nenhuma do `PLANO.md` — reorganização documental, decidida no chat
- **Motivo:** o `CLAUDE.md` acumulava duas coisas diferentes: *o que o jogo é* e *como se trabalha no repositório*. Quem entrasse no projeto para escrever narrativa ou desenhar ícone precisava atravessar regras de git para achar a descrição da árvore de habilidades. Separar também deixa o repositório com cara de projeto acadêmico — um GDD é um artefato reconhecível da disciplina.
- **O que mudou:**
  - `docs/GDD.md` **criado** — recebe §0 (Contexto), §6 (Design do jogo), §7 (Contratos de dados), §8 (Balanceamento), §9 (Acessibilidade), §10 (Roadmap), §13 (Entregas acadêmicas) e §14 (Decisões pendentes). **Conteúdo movido na íntegra, sem reescrita** — só mudou de arquivo e de número de seção.
  - `FORMA-DE-TRABALHO.md` **criado** — recebe §1 a §5, §11 e §12: regras do agente, stack, estrutura de pastas, convenções, git, fluxo e Definition of Done.
  - `CLAUDE.md` **reduzido a um ponteiro de 10 linhas** para os dois arquivos acima.
  - `PLANO.md`, `.gitignore`, `tsconfig.json`, `index.html` — referências atualizadas para os nomes novos.
- **Por que o `CLAUDE.md` não foi apagado:** é o nome que a ferramenta de agente carrega automaticamente no início de cada sessão. Um arquivo chamado `FORMA-DE-TRABALHO.md` não é lido sozinho. O ponteiro custa 10 linhas e evita ter que lembrar de mandar ler os dois arquivos toda vez. Se um dia for apagado, essa é a consequência a aceitar.
- **Decisão registrada — a numeração não foi refeita.** As seções que foram para a `FORMA-DE-TRABALHO.md` mantiveram os números originais, com lacunas (§1–5, depois §11–12). Havia referências a `§2`, `§3`, `§4.1` e `§5` em `PLANO.md`, `.gitignore`, `tsconfig.json` e `index.html`; renumerar quebraria todas por ganho estético. Com isso, só **uma** referência de seção precisou de conserto no projeto inteiro (`P3-06`, que virou `docs/GDD.md §2.5`).
- **Entradas antigas deste diário não foram editadas**, mesmo citando arquivos e seções que se moveram (ex.: `CLAUDE.md §14` na entrada de 2026-08-06). Elas descrevem o que era verdade naquela data — reescrever histórico é o que a regra "entrada reconstruída de memória vira ficção" tenta evitar. A tabela de equivalência no topo do `GDD.md` resolve a leitura. Pela mesma razão, `SETUP-01` no `PLANO.md` continua citando o `CLAUDE.md`: descreve uma tarefa já concluída.
- **Como verificar:**
  ```bash
  npm run typecheck && npm run build      # nenhum arquivo de código mudou de comportamento
  grep -rn "CLAUDE.md" --include="*.md" --include="*.json" --include="*.html" . | grep -v node_modules
  # só devem sobrar: o ponteiro, a tabela de equivalência do GDD, o diário e o SETUP-01
  ```
- **Pendente:**
  - `CLAUDE.md` continua no repositório e no histórico do GitHub — a mudança foi de conteúdo e nome, não de visibilidade.
  - `README.md` (`P4-04`) ainda não existe; quando existir, é ele que deve ser a porta de entrada do repositório, com o GDD logo atrás.
- **Evidência:** —

---

## 2026-08-07 — Dependências instaladas e aceite do scaffold verificado

- **Parte / tarefa:** `SETUP-02` ✔ (fechado)
- **O que mudou:**
  - `npm install` rodou pela primeira vez — 17 pacotes, 0 vulnerabilidades. `package-lock.json` gerado (versionado; não está no `.gitignore`).
  - `docs/evidencias/` criada com o primeiro print do projeto.
  - Nenhum arquivo de código foi tocado. O scaffold escrito em 2026-08-06 passou como estava.
- **Aceite verificado (o que estava pendente desde ontem):**
  - `npm run typecheck` — limpo, saída vazia, exit 0.
  - `npm run build` — `dist/index.html` 0,80 kB e `dist/assets/index-*.js` 0,81 kB, em 39 ms.
  - `npm run dev` — sobe em 189 ms; `http://localhost:5173/` responde **HTTP 200**.
  - **No navegador:** `#app` ganha `data-status="pronto"`, `document.title` = "Ponto de Virada", `lang` = `pt-BR`. Esta é a prova de que o módulo TypeScript executou — só o HTTP 200 não provava isso.
- **Bloqueio do OneDrive: resolvido.** O projeto está em `C:\Users\caiqu\Desktop\Programação\...`; o registro do Windows (`User Shell Folders\Desktop`) aponta para `C:\Users\caiqu\Desktop` sem redirecionamento, e `C:\Users\caiqu\OneDrive\Desktop` não existe. Caminho fora da sincronização — foi por isso que o `install` correu em 5 s e sem erro de lock.
- **Risco do TypeScript 7 não se materializou (ainda):** `tsc 7.0.2` + `vite 8.2.1` instalados e funcionando juntos. O atrito previsto era com o `typescript-eslint`, que só entra no `SETUP-03` — o risco continua aberto até lá.
- **Como verificar:**
  ```bash
  npm run typecheck        # sai limpo
  npm run build            # gera dist/
  npm run dev              # http://localhost:5173 — no DevTools, #app tem data-status="pronto"
  ```
- **Pendente:**
  - `SETUP-03`: sem Vitest, ESLint e Prettier. Os scripts `test` e `lint` **não existem** — ou seja, a regra 5 da `FORMA-DE-TRABALHO.md` (`typecheck && test && build`) só pode ser cumprida pela metade até isso entrar.
  - `SETUP-04` (CI e Pages), `SETUP-05` (estrutura de pastas), `SETUP-06` (`rng.ts`), `SETUP-07` (guardrails de git) — abertos. `.githooks/` e `.claude/settings.json` versionado ainda não existem; `core.hooksPath` não está configurado.
  - As Partes 1, 2 e 3 do backlog seguem intactas — inclusive o protótipo de papel (`P1-02/03`) e a planilha de balanceamento (`P3-02`).
  - O `package.json` ainda usa o codinome `ponto-de-virada` (`P1-04`).
- **Evidência:** `docs/evidencias/2026-08-07-setup-02-scaffold-no-ar.jpg`

---

## 2026-08-06 — Scaffold Vite + TypeScript strict (sem instalar dependências)

- **Parte / tarefa:** `SETUP-02` (em andamento — aceite não verificado)
- **O que mudou:**
  - `package.json` — Vite `^8.2.1` e TypeScript `^7.0.2`, scripts `dev` / `build` / `preview` / `typecheck`. `engines` fixa Node >= 22.12, que é o mínimo do Vite 8.
  - `tsconfig.json` — `strict` mais `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`, `noUnusedLocals/Parameters`, `verbatimModuleSyntax` e `erasableSyntaxOnly`. `resolveJsonModule` ligado porque `src/data/*.json` será importado direto (`CLAUDE.md §3`).
  - `vite.config.ts` — `base: './'`. Caminho relativo resolve o deploy no GitHub Pages (`SETUP-04`) e o build offline da feira (`P8-05`) de uma vez; vale enquanto o jogo for página única, sem rotas.
  - `index.html` — `lang="pt-BR"`, marcação provisória.
  - `src/main.ts` — só monta e marca `#app` com `data-status="pronto"`.
  - `src/vite-env.d.ts` — tipos do cliente Vite.
- **Decisão registrada:** `npm install` **não** foi rodado. A pasta ainda está dentro do OneDrive e instalar aqui despejaria dezenas de milhares de arquivos na sincronização — a instalação acontece depois do move, no destino.
- **Por que TypeScript 7:** é a versão `latest` estável no registro. É o compilador nativo reescrito em Go; se aparecer atrito com `typescript-eslint` no `SETUP-03`, a saída é fixar uma versão 6.x.
- **Como verificar (só depois do move):**
  ```bash
  npm install
  npm run typecheck        # precisa sair limpo
  npm run dev              # abre no navegador; #app com data-status="pronto"
  npm run build            # gera dist/; abrir dist/index.html direto do disco também funciona
  ```
- **Pendente:**
  - **A pasta ainda não foi movida para fora do OneDrive.** A tentativa anterior falhou porque a sessão do Claude Code segurava o diretório de trabalho — precisa fechar a sessão antes.
  - `SETUP-02` fica `[~]` até o aceite rodar de verdade.
  - `SETUP-03`: sem Vitest, ESLint e Prettier, os scripts `test` e `lint` ainda não existem.
  - O `package.json` usa o codinome `ponto-de-virada`; muda quando o nome do jogo sair (`P1-04`).
- **Evidência:** —

---

## 2026-08-06 — Fundação do repositório: regras, backlog, diário e licença

- **Parte / tarefa:** `SETUP-01` ✔
- **O que mudou:**
  - Repositório criado no GitHub (`BlafXD/Jogo-do-bem-no-Estilo-Plague-INC`); commit inicial só com `.gitattributes` (normalização de fim de linha para LF).
  - `CLAUDE.md` escrito — fonte da verdade: escopo, stack, arquitetura, contratos de dados, balanceamento inicial e regras de git.
  - `PLANO.md` escrito — backlog completo das 8 partes da disciplina, com marcos M1–M3, cortes de escopo do modo solo e contratos dos 3 pacotes delegáveis.
  - `PROGRESSO.md` criado (este arquivo).
  - `.gitignore` criado — cobre `node_modules/`, `dist/`, cache do Vite, cobertura do Vitest e lixo do Windows. **Deixa `.claude/settings.json` versionado de propósito** (`CLAUDE.md §4.1`) e ignora só o `settings.local.json`, que é por máquina.
  - `LICENSE` criada — MIT, decisão tomada por ser o padrão acadêmico e por não conflitar com assets CC0/CC-BY.
- **Ambiente conferido:** Node v26.5.1 · npm 11.17.0 · identidade git local correta (`CaiqueHB <caiquehb54@gmail.com>`).
- **Decisão registrada:** o projeto sai de dentro do `OneDrive`. `node_modules` tem dezenas de milhares de arquivos e a sincronização causa erro de lock no `npm install` e instabilidade no HMR do Vite — `.gitignore` resolve o git, não o OneDrive.
- **Como verificar:**
  ```bash
  git log --oneline        # mostra o commit inicial
  git status               # os 5 arquivos de fundação como untracked
  node --version           # v26.5.1
  ```
- **Pendente:**
  - Os 5 arquivos de fundação ainda não foram commitados.
  - Titular do copyright na `LICENSE` está como `CaiqueHB` — trocar por nome completo e somar os integrantes quando o grupo for formado.
  - `SETUP-02` em diante: nenhum código ainda. Sem `package.json`, sem Vite, sem testes.
  - `SETUP-07`: `core.hooksPath` não configurado; `.claude/settings.json` versionado ainda não existe.
  - Decisões de `CLAUDE.md §14` continuam abertas — nome do jogo, formação do grupo, direção de arte, trilha, confirmação da stack com o professor.
- **Evidência:** —
