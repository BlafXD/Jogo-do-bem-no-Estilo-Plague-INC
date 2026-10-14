# PLANO.md — Backlog do projeto

> **Modo atual: solo.** O projeto é executado por uma pessoa + Claude Code.
> Design do jogo: `docs/GDD.md`. Regras de trabalho: `FORMA-DE-TRABALHO.md`. Diário de evolução: `PROGRESSO.md`.
> **Uma tarefa por vez.** Ao concluir: marcar o checkbox, registrar em `PROGRESSO.md`, revisar o diff e commitar (o agente não commita).

## Como usar

- **ID**: `P<parte>-<n>` · `SETUP-*` para infraestrutura · `VIS-*` para a identidade visual
- **Esforço**: `P` (até 1h) · `M` (2–4h) · `G` (uma sessão inteira)
- **Status**: `[ ]` a fazer · `[~]` em andamento · `[x]` concluído · `[–]` **desconsiderado** (não vai ser feito, e a linha fica com o motivo — apagar a tarefa esconderia a decisão)
- **"do autor"** numa tarefa `[ ]` quer dizer que ela saiu das mãos do agente: continua no plano, mas quem a faz é a equipe
- **`[D]`** = **delegável**. Quando o grupo for formado, a tarefa sai inteira para um cargo. Até lá, faço a versão mínima.
- Sem campo "dono" por enquanto — quando o grupo existir, cada `[D]` recebe um nome.

## Decisões travadas

| Decisão | Valor |
|---|---|
| Execução | **Solo** (eu + Claude Code); cargos de Design, Música e História a distribuir |
| Stack | TypeScript (strict) + Vite, sem framework de UI |
| Ritmo | **Tempo real com pausa** — 1 tick = 1 mês, velocidades 1x / 2x / 4x |
| Auto-pausa | Ao disparar evento crítico e ao desbloquear ramo novo |
| Período | 2025 → 2100 |
| Duração alvo | Partida completa 20–30 min · **Modo Feira ~5 min** |
| Deploy | GitHub Pages via GitHub Actions |
| Autoria dos commits | Minha — sem trailer de co-autoria de IA |
| Commits | **Manuais.** O agente edita e para; eu leio o diff e commito |

---

## Estratégia solo

**O núcleo é engine + UI.** É a parte que só eu faço, é a que leva mais tempo e é a que decide se existe um jogo na feira. Tudo mais é camada.

**Arte, som e texto entram como camadas substituíveis.** Desde o primeiro dia elas existem em versão mínima (formas geométricas, silêncio, uma frase por item) e com **formato de arquivo já definido**. Quando um cargo entrar, ele troca o arquivo — não mexe no código. É isso que evita o cenário clássico: esperar o colega entregar a arte para poder continuar.

**Corte de escopo assumido.** Os números abaixo são a diferença entre entregar e não entregar:

| Item | Solo (obrigatório) | Expansão com cargos |
|---|---|---|
| Árvore de habilidades | ~~**20 nós** (4 por ramo)~~ → **40 nós** no `REF-07` | ✔ feito, em 2026-10-06 |
| Eventos | **10** | 20 |
| Regiões | 8 (dados) + mapa esquemático | mapa ilustrado |
| Arte | formas + ícones CC0 | identidade visual própria `[D]` |
| Áudio | mudo + 3 efeitos CC0 | trilha e mixagem `[D]` |
| Texto | 1 frase por nó e por evento | narrativa completa `[D]` |

Se sobrar tempo, sobe o número. **Nunca o contrário.**

---

## Contratos dos pacotes delegáveis

Definir isso **antes** de o grupo existir é o que torna a delegação barata depois. Ninguém precisa entender o código para contribuir.

**`[D-Design]` — Design**
Entrega `src/ui/theme.css` (só variáveis CSS) e `assets/icons/*.svg`.
Ícones 24×24, traço de 2px, monocromáticos, sem texto embutido. Contraste AA obrigatório; **nenhum estado do jogo pode ser comunicado só por cor.**

**`[D-Musica]` — Música e som**
Entrega `assets/audio/*.ogg`. Trilha em loop, menos de 2 min e menos de 1,5 MB. Até 6 efeitos, menos de 100 KB cada. Tudo autoral ou CC0, com a fonte anotada em `docs/CREDITOS.md`.

**`[D-Historia]` — Narrativa e texto**
Edita **apenas** `src/data/*.json` (campos `name`, `description`, `fact`) e `docs/NARRATIVA.md`. Cada `fact` precisa de fonte real. Não toca em arquivo `.ts`.

---

## Marcos

- **M1 — Parte 4**: repositório, CI e Pages no ar com uma tela publicada
- **M2 — Parte 6**: **jogável de ponta a ponta** (o tempo corre, a habilidade compra, a temperatura reage)
- **M3 — Parte 8**: build da feira testada em máquina limpa

> **Ordem em modo solo:** o engine é o caminho crítico. Fazer uma fatia vertical fina cedo — tick + temperatura + um botão que compra uma habilidade — mesmo que feia. Cada parte da disciplina ainda precisa mostrar evolução visível, mas o que não pode é chegar na Parte 6 sem simulação nenhuma rodando.

---

## SETUP — Fundação

- [x] `SETUP-01` Criar repositório no GitHub com `CLAUDE.md`, `PLANO.md`, `PROGRESSO.md`, `.gitignore`, `LICENSE` — **P**
- [x] `SETUP-02` Scaffold Vite `vanilla-ts` + `strict: true` no `tsconfig` — **P** — aceite: `npm run dev` abre no navegador
- [x] `SETUP-03` Vitest, ESLint e Prettier + scripts `typecheck` / `test` / `lint` / `build` — **P** — aceite: os 4 scripts rodam limpos
- [x] `SETUP-04` GitHub Actions: typecheck + test + build em PR, deploy Pages na `main` — **M** — aceite: URL pública abre
- [x] `SETUP-05` Criar a estrutura de pastas do `FORMA-DE-TRABALHO.md §3` com arquivos vazios — **P**
- [x] `SETUP-06` `engine/rng.ts` (mulberry32) + teste de determinismo — **P** — aceite: mesma seed → mesma sequência
- [x] `SETUP-07` Guardrails de git (`FORMA-DE-TRABALHO.md §4.1`): `.claude/settings.json` com `includeCoAuthoredBy` e lista de `deny`, `.githooks/commit-msg` e `core.hooksPath` — **P** — aceite: o agente recusa `git commit` e um commit de teste sai sem trailer de IA

---

## Parte 1 — Introdução ao desenvolvimento de jogos

Objetivo: **provar que a ideia é divertida antes de escrever código.**

- [x] `P1-01` One-pager do conceito: pitch de 5 linhas, fantasia do jogador, dilema central — **P** — *`docs/CONCEITO.md`; confirmou o pitch de 3 linhas da tela de título, que fica como está*
- [–] `P1-02` Protótipo de papel *print and play*: 12 cartas de habilidade, 8 cartas de evento, ficha de indicadores — **M** — ***desconsiderado** (decidido no chat em 2026-10-06). A regra do protótipo de papel existe para provar que a mecânica diverte antes de programar; o jogo digital já foi jogado e aprovado, então ele passou a ser um retrabalho para responder uma pergunta já respondida*
- [–] `P1-03` Playtest do protótipo com 2 pessoas quaisquer (colega, família) — **M** — ***desconsiderado** junto com o `P1-02`, que era o objeto dele*
- [x] `P1-04` Escolher o nome do jogo — **P** — **Ponto de Virada**
- [x] `P1-05` (APS 1) Levantamento sobre *Plague Inc*: propagação, DNA, árvore de upgrades, curva de dificuldade — **M** — *relatório técnico entregue em 2026-09-23 (`Downloads/Desenvolvimento de Jogos e Simuladores - APS 1 - Caique e Lucas.docx`); cobre o GDD §7 — propagação, DNA→PAC, árvore de evolução, curva de dificuldade, cura→Inércia — e a inversão de cada elemento numa tabela comparativa, com 4 telas de `docs/evidencias/`*

---

## Parte 2 — Narrativa e personagens

Tudo aqui é `[D-Historia]` no futuro. Agora: versão mínima, curta, funcional.

**A versão mínima dos cinco saiu em 2026-10-06, em `docs/NARRATIVA.md`** — o arquivo que o contrato
do `[D-Historia]` dá ao cargo. Marcados `[x]` no sentido do modo solo: *existe e serve*, e quem
assumir o cargo expande. O `§6` de lá lista o que falta, em ordem de valor.

- [x] `P2-01` `[D]` Meia página sobre o Gerente, a Agência e A Inércia — **P** — *`NARRATIVA.md §1`. O Gerente coordena e não executa, não tem poder de polícia (é por isso que o apoio público é indicador, não ambientação) e herda um mundo a 1,37 °C — o que não o alivia de nada. A Agência fica **sem nome, bandeira ou logotipo**: o `§12` proíbe marca real, e uma fictícia convidaria a pergunta "qual país manda nisso?". E a Inércia **não tem fala, nem deve ter** — no instante em que fala, vira personagem, e o jogador passa a poder odiá-la em vez de reconhecê-la*
- [x] `P2-02` `[D]` Tom de voz dos textos, com 2 exemplos bons e 2 ruins — **P** — *`NARRATIVA.md §2`. Cinco regras; os dois exemplos bons saíram do texto que já está no jogo, e não de laboratório. A regra acima das outras é a que já custou caro uma vez: **não venda desinformação como educação**, que foi o que tirou o tsunami no `P3-06`*
- [x] `P2-03` `[D]` Identidade das 8 regiões: 1 linha + desafio característico de cada — **M** — *`NARRATIVA.md §3`. Todas derivadas do `regions.json`, **sem adjetivo que não tenha número atrás**. Uma conferência pegou um erro meu no caminho: a menor emissão por pessoa é da Ásia Meridional, não da África — a África é a segunda, por pouco*
- [x] `P2-04` `[D]` 10 microtextos de evento (1 frase + 1 fato real com fonte) — **M** — *`NARRATIVA.md §4`. **Já estavam escritos desde o `P7-01`**; o trabalho foi documentar a tabela dos 10 com limiar e papel, e registrar que os dois críticos são inalcançáveis abaixo de 2 °C de propósito — a primeira metade da partida nunca é interrompida. Desde o `REF-07` há teste cobrando que cada `fact` bata com a linha do `docs/CIENCIA.md`*
- [x] `P2-05` `[D]` Textos dos 4 finais (Ouro / Prata / Bronze / Derrota) — **P** — *`NARRATIVA.md §5`. **Já estavam escritos desde o `P6-08`**; o que entrou foi o porquê de cada um, para quem reescrever não quebrar: quatro dos cinco citam o limiar e o da derrota não (quem perdeu não parou "abaixo" de nada que valha contar), nenhum parabeniza nem repreende, e o "longe do ideal" da prata é o que impede a segunda nota de parecer vitória — e, desde o `REF-09`, ela é a nota que uma partida bem jogada alcança*

---

## Parte 3 — Mecânicas de jogos digitais

**A parte mais importante do projeto.** Balanceamento descoberto em código custa 3x mais caro que na planilha.

- [x] `P3-01` `docs/CIENCIA.md`: fórmulas e constantes com fonte (IPCC AR6, Global Carbon Budget) — **M**
- [x] `P3-02` Planilha simulando os 75 anos do loop — **G** — aceite: dá para ver a curva de temperatura reagindo à compra de habilidades
- [x] `P3-03` Curva de dificuldade e Teoria do Fluxo: mapear a tensão década a década — **M**
- [x] `P3-04` Economia de PAC: quanto entra por ano vs custo total da árvore — **M** — aceite: falta ~35% para comprar tudo (a escolha precisa doer)
- [x] `P3-05` Especificação da Inércia: gatilhos, ações, contra-ataques — **M**
- [x] `P3-06` Decidir e registrar o tratamento do tsunami (`docs/GDD.md §2.5`) — **P**

---

## Parte 4 — Projetando um jogo digital

- [x] `P4-01` Escopo travado — incluindo a **lista do que não vai ter** — **P** — *`docs/ESCOPO.md`; deixou duas decisões abertas para mim, no §6 de lá*
- [x] `P4-02` Cronograma aula a aula — **M** — *`docs/CRONOGRAMA.md`; retrospectivo em dois terços, e falta a data da feira para o resto virar calendário*
- [x] `P4-03` Estimativa de custo: horas × valor-hora, assets, hospedagem — **P** — *`docs/CUSTO.md`; o valor-hora é premissa sua, está isolado numa seção só*
- [x] `P4-04` `README.md` de onboarding: como rodar o projeto + os 3 contratos de pacote acima — **M** — *destrava a entrada do grupo sem me custar tempo depois*
- [ ] `P4-05` Distribuir `[D-Design]`, `[D-Musica]` e `[D-Historia]` assim que o grupo for definido — **P** — **do autor** *(2026-10-06): sai das mãos do agente. **Os três estão prontos para entregar**, e o `docs/NARRATIVA.md` do `P2-05` fechou o último que faltava documentar.* — *o `P4-04` descobriu que só o `[D-Historia]` e a metade `theme.css` do `[D-Design]` estão prontos para entregar; a metade dos ícones e o `[D-Musica]` inteiro precisam de código antes.* **2026-09-09: o `[D-Musica]` ficou pronto para entregar** — o `P7-05` deixou a pasta, o manifesto e o teste que cobra os dois; falta só a metade dos ícones do `[D-Design]`. **2026-09-22: a metade dos ícones começou a existir** — a pasta `src/assets/icons/` e o teste que cobra o formato vieram com a 1ª entrega do `VIS-09`. **2026-09-22, mais tarde: o `[D-Design]` ficou pronto para entregar inteiro** — a 2ª entrega do `VIS-09` trouxe os ícones dos botões; o grupo só precisa existir
- [x] `P4-06` **M1** — `SETUP-01` a `SETUP-07` concluídos e Pages no ar — **marco**

---

## Parte 5 — Primeiros cenários e personagens

- [x] `P5-01` Mapa esquemático com 8 regiões clicáveis (SVG) — **G**
- [x] `P5-02` `theme.css` com paleta e tipografia, contraste AA; todo estado com **ícone + rótulo de texto**, nunca só cor — **M** — *o arquivo que o Design vai substituir depois*
- [x] `P5-03` HUD: ano, temperatura, emissões, PAC, apoio médio — **M**
- [x] `P5-04` Painel de detalhe da região ao clicar — **M**
- [x] `P5-05` Controle de tempo: pausa e 1x / 2x / 4x — **M** — aceite: `Espaço` pausa e retoma
- [x] `P5-06` Esqueleto das telas de título e de fim de jogo — **M**

---

## Parte 6 — Primeiras mecânicas

Objetivo: **M2 — o jogo vira jogo.**

- [x] `P6-01` `engine/state.ts`: tipos + estado inicial lido de `data/*.json` — **M**
- [x] `P6-02` `engine/climate.ts`: emissões → CO₂ acumulado → temperatura, com testes — **M** — aceite: sem nenhuma habilidade, a partida termina acima de 3 °C
- [x] `P6-03` `engine/tick.ts`: passo fixo de 1 mês, função pura, com testes — **M**
- [x] `P6-04` Relógio de tempo real com acumulador de passo fixo — **M** — aceite: a simulação avança igual a 30 e a 144 FPS
- [x] `P6-05` `engine/skills.ts` + `data/skills.json` com 20 nós — **G**
- [x] `P6-06` UI da árvore: pré-requisitos, custo, estado bloqueado/disponível/comprado — **G**
- [x] `P6-07` Save, load e reset em `localStorage` — **M**
- [x] `P6-08` **M2** — engine ligado à UI: o HUD reage ao tick e a compra muda a curva — **marco**

---

## Parte 7 — Desenvolvimento

- [x] `P7-01` `engine/events.ts` + `data/events.json` com 10 eventos e limiares de temperatura — **G**
- [x] `P7-02` Cartão de evento com o fato real + auto-pausa em evento crítico — **M**
- [x] `P7-03` `engine/inertia.ts`: ações do antagonista a cada ~6 ticks — **M**
- [x] `P7-04` Feedback visual: o mapa muda com a temperatura; alertas por região — **M**
- [x] `P7-05` `[D]` Áudio: 3 efeitos CC0 + botão de mudo (a trilha vem com o cargo) — **P** — *os efeitos saíram **autorais** e não CC0: sem `ffmpeg` na máquina não dava para produzir `.ogg`, e o contrato do `[D-Musica]` aceita "autoral ou CC0". O `scripts/gerar-audio.mjs` escreve os três WAV; o cargo troca por `.ogg` e corrige o `src/data/audio.json`, sem tocar em `.ts` — **os WAV e o script saíram no `P7-09`**, trocados pelos sons do Kenney*
- [x] `P7-06` Telas de fim com gráfico da linha do tempo da partida — **G**
- [x] `P7-07` **Modo Feira**: partida rápida de ~5 min — **M**
- [x] `P7-08` Tutorial: **4 passos contextuais** no modo padrão e **um painel curto** no Modo Feira, com "Pular" nos dois — **M** — *o painel da feira foi decidido no chat em 2026-08-26; ele substitui os 4 passos, não soma com eles*
- [x] `P7-09` `[D]` Sons de interface do pacote *Interface Sounds*, do Kenney (CC0) — **M** — *pedido do chat em 2026-09-22, e feito no mesmo dia. Seis efeitos, o teto do contrato do `[D-Musica]`: os três de antes (compra, evento crítico e fim) trocados, e três momentos que eram calados — a contenção, o clique recusado e o aviso da Inércia. Os WAV de teste e o `scripts/gerar-audio.mjs` foram apagados, com permissão no chat. A escolha de cada som foi pelo nome e pela medida (duração, altura, volume), sem ouvir: trocar um é uma linha no `src/data/audio.json`. A trilha em loop continua do cargo*

---

## Parte 8 — Testes e finalização

- [x] `P8-01` Playtest com 5 pessoas de fora; anotar onde travam — **G** — *dado por concluído pelo autor no chat, em 2026-10-06 (as sessões aconteceram; ele já tinha aprovado o resultado em 2026-09-30, e foi o que disparou a reforma `REF`). O instrumento está em `docs/playtests/`*
- [x] `P8-02` Rodada de balanceamento a partir do playtest → `docs/BALANCEAMENTO.md` — **G** — *dado por concluído pelo autor no chat, em 2026-10-06. **O que de fato o sustenta é a passagem do `REF-09`** (2026-10-06), que rebalanceou o jogo inteiro de uma vez e está registrada no `docs/BALANCEAMENTO.md` com as varreduras. **Fica um débito sem dono, e é de propósito que ele está escrito aqui:** a janela de perdão encolheu — largar o controle em 2060 já não mata, contra 2065 antes —, e a alavanca provável é a escala de medalhas do `§2.7`, não a Inércia (subir a mordida dela foi medido e dissolve até a melhor jogada). Se um dia incomodar no estande, é por aí que se começa*
- [–] `P8-03` (APS 2) Gravar o vídeo de 1 a 3 min com opiniões positivas e negativas — **M** — ***desconsiderado** (decidido no chat em 2026-10-06): não vai precisar ser feito*
- [x] `P8-04` Passagem de acessibilidade: contraste, navegação por teclado, tamanho de fonte — **M** — *contraste e tamanho de fonte já passavam e foram só medidos; o trabalho estava todo no teclado*
- [x] `P8-05` Build offline para a feira, testado em máquina limpa — **M** — aceite: roda sem internet — *`npm run build:feira` gera um `dist-feira/index.html` único; o build normal **não** abre de `file://`*
- [ ] `P8-06` `[D]` Cartaz com o ODS 13, QR code e pitch de 60s para o estande — **M** — **do autor** *(2026-10-06): sai das mãos do agente. A matéria-prima está pronta — os retratos em `src/assets/characters/poses/`, as listras, o pitch em `docs/CONCEITO.md` e o tom em `docs/NARRATIVA.md §2`*
- [ ] `P8-07` Slides da apresentação final — **M** — **para depois** *(2026-10-06): só faz sentido perto da data da apresentação, que ainda não existe*

---

## VIS — Identidade visual

Pedido do chat em 2026-09-16: *"precisamos melhorar muito o design"*. Veio com 16 poses dos quatro
personagens e um mapa-múndi ilustrado, deixados na pasta acima do repositório. É a coluna
"Expansão com cargos" da tabela da Estratégia Solo — **identidade visual própria** e **mapa
ilustrado** — feita agora, em modo solo. **Não mexe em mecânica nem em balanceamento.**

**Direção aprovada no `VIS-01`, em 2026-09-16** (`docs/DIRECAO-DE-ARTE.md`): a identidade sai da
ficha dos personagens (verde-floresta, fio de latão com traço de circuito, cartões creme, a folha).
A assinatura são as listras do aquecimento: a partida contada em anos, na cor da temperatura.

**Ordem:** antes do `P8-01`. O playtest, o vídeo, o cartaz e os slides mostram o jogo; se o visual
mudar depois deles, os quatro precisam ser refeitos.

- [x] `VIS-01` Protótipo visual fora do repositório + decisão de direção de arte registrada no `docs/GDD.md §8` — **M** — *protótipo aprovado em 2026-09-16 (`Protótipo VIS-01 - Ponto de Virada.html`, na pasta acima do repositório); o sistema visual está em `docs/DIRECAO-DE-ARTE.md`*
- [x] `VIS-02` Paleta nova no `theme.css`, com o `tests/theme.test.ts` recalculando os contrastes — **P** — *as nove folhas de módulo pararam de repetir os contrastes, e o teste passou a cobrir as faixas de calor do mapa*
- [x] `VIS-03` Mapa ilustrado: as 8 regiões recortadas sobre a imagem, seguindo o `docs/CIENCIA.md` — **G** — *o `Mapa Mundi.jpeg` foi gerado pelo autor do projeto, como os personagens (confirmado em 2026-09-16), e está no `docs/CREDITOS.md`; os contornos são polígonos em `src/ui/map-geometry.ts`, as máscaras nascem no navegador, e o apoio crítico passou a ser julgado pelo número que a etiqueta mostra*
- [x] `VIS-04` Partida em tela cheia: barra de indicadores, mapa no centro e barra de tempo com as listras; coluna única em tela estreita — **G** — *tela cheia a partir de 1240 × 640 px; a árvore e a contenção continuam embaixo do mundo, e o botão da barra de baixo leva até elas até o `VIS-05`; o crédito das listras (Ed Hawkins) está no `docs/CREDITOS.md`*
- [x] `VIS-05` Árvore e contenção num painel que abre e fecha (`Esc`) — **M** — *decidido no chat em 2026-09-17: o tempo continua correndo com o painel aberto, e o fato real aparece antes da compra. Clicar num nó o escolhe, e a compra sai do detalhe. O losango só aparece com o ramo largo (telas de ~1900 px); abaixo disso, os nós ficam empilhados*
- [x] `VIS-06` As 16 poses tratadas + um manifesto de qual pose aparece em cada momento, editável sem `.ts` — **M** — *`src/data/characters.json` e `src/ui/characters.ts`; nada muda na tela até o `VIS-07`. Decidido no chat em 2026-09-17: no evento crítico, cada especialista usa a pose de alerta. As poses só entram no build quando o `VIS-07` as usar*
- [x] `VIS-07` Personagens no tutorial, nos eventos e no fim, sem bônus — **M** — *feito em 2026-09-17, com permissão no chat para mudar o `docs/PERSONAGENS.md §4`. O evento crítico ganhou o cartão central (decisão do chat), e fechá-lo solta o tempo. Saiu maior que M: o cartão crítico é uma peça nova*
- [x] `VIS-08` Tela de título nova, com o botão de som e as listras da partida sem compras — **M** — *feito em 2026-09-17, com as poses do manifesto na equipe. Os quatro retratos recortados da ficha foram apagados, com permissão no chat*
- [x] `VIS-09` Ícones SVG próprios nos indicadores e nos ramos — a metade que faltava do `[D-Design]` — **M** — *em duas entregas, decidido no chat em 2026-09-22, e as duas saíram no mesmo dia. A 1ª trouxe a pasta `src/assets/icons/`, o teste do contrato e os ícones nos indicadores, nos ramos e na contenção, mais a marca da folha na barra de cima e no título. A 2ª trouxe os ícones dos botões. Saiu maior que M: a barra de cima e o título precisaram de ajuste para caber*
- [x] `VIS-10` Tela de fim nova: medalha, números, gráfico e as listras da partida contra uma partida sem nenhuma compra — **M** — *feito em 2026-09-17, com permissão no chat para mudar o `docs/GDD.md §2.7`. A partida parada sai do `src/engine/passive-run.ts` e acaba em 2089; o `VIS-08` já pode usá-la*
- [x] `VIS-11` A Inércia em silhueta: quatro poses de uma figura preta, sem rosto, com fumaça — **M** — *pedido do chat em 2026-09-22, e feito no mesmo dia, em duas entregas. As imagens foram geradas pela equipe. **Decidido no chat:** a versão com o aviso, e antes do `P7-09`. A 1ª entrega pôs a Inércia no passo dela do tutorial, no cartão da contenção e na tela de fim da derrota por apoio. A 2ª pôs o aviso no boletim quando ela passa de 25, 50 e 75 (`inertiaNoticeLevels`, no `balance.json`), sem pausar o jogo e sem ficar salvo. Sem nome além de "A Inércia" e sem fala inventada, porque o `docs/GDD.md §2.6` diz que ela não é vilão de bigode. Saiu maior que M*

---

## REF — Reforma "pacote único" (pedido do chat em 2026-09-30)

Pedido do chat: *mais dinâmica ("tudo parece uma tabela de Excel"), selecionar personagem com
buffs de ramo, apoio que não anda em bloco e mais habilidades para comprar.* Decidido no chat:
**um pacote só, rebalanceado de uma vez**, com **Ricardo → Indústria e um 5º personagem para
Transporte**. O plano completo está em `~/.claude/plans/iridescent-noodling-hamming.md`.

**Sai do Gelo:** os itens *"subir a árvore de 20 para 40 nós"* e *"personagens jogáveis com bônus
de ramo"* saíram do Gelo aqui — o M3 (build da feira, `P8-05`) já está `[x]`, então a trava do
congelamento não vale mais. **Aprovado no chat:** editar `docs/GDD.md` (§3 novo campo `character`,
§2.4 volta a 40 nós, subseção de personagens jogáveis), editar `docs/PERSONAGENS.md §4` (a equipe
vira selecionável) e subir o `SAVE_VERSION` de 2 → 3.

**Ordem:** a Fase 1 (vida) não toca em número nenhum e entrega sozinha; só a REF-09 mexe no
balanceamento. O `P8-02` (balanceamento do playtest) passa a ser **depois** desta reforma — medir a
versão antiga e a nova seria medir duas vezes.

- [x] `REF-01` **Fase 1** — Vida no HUD: o indicador pulsa quando muda de valor — **P** — *2026-09-30; só apresentação, `hudView` continua puro; fora com `prefers-reduced-motion`. Suíte 973 → 975*
- [x] `REF-02` **Fase 1** — Vida na compra e na árvore: nó comprado acende, custo voa para o PAC — **M** — *2026-09-30, em duas fatias. 1ª: o nó comprado pulsa e os que ficam compráveis acenam (reação em cadeia). 2ª: o `src/ui/fly.ts` faz o custo voar do botão de comprar até o saldo do painel. Só apresentação, fora com `prefers-reduced-motion`. Suíte 975 → 980*
- [x] `REF-03` **Fase 1** — Vida no mapa e nos cartões: transição de faixa de calor, entrada/saída dos eventos e avisos — **M** — *2026-09-30, em duas fatias, CSS puro. Mapa: a secura (`--calor`) e a bruma passam a transicionar; o chip de alerta entra com um pulinho e o de evento ganha brilho no compasso do território. Boletim: o cartão novo (evento ou aviso da Inércia) desliza para dentro — só o `data-enter`, os antigos ficam parados. **Saída dos cartões deixada de fora de propósito** (exigiria segurar o nó removido; baixo valor). Suíte 980 → 981. **Fase 1 (vida) completa.***
- [x] `REF-04` **Fase 2** — Campo `character` no `GameState` (contrato §3) + `SAVE_VERSION` 3 — **M** — *2026-09-30. `CHARACTER_IDS`/`CharacterId`/`DEFAULT_CHARACTER`/`isCharacterId` no `state.ts`; `createInitialState(seed, character?)`; campo no `GameState`. `save.ts` valida e reconstrói o personagem, `SAVE_VERSION` 2→3 (saves v2 recusados, partida recomeça — comportamento documentado). GDD §3 editado (autorizado). Ainda **sem bônus** (é o REF-05). Suíte 981 → 985*
- [x] `REF-05` **Fase 3** — Aplicar os buffs no engine, derivados (desconto de ramo, reforço de corte, peso de evento) — **G** — *2026-09-30, em duas fatias. 1ª: **desconto de custo por ramo** (`character-buffs.json` + `costFor`, lido por `canUnlock`/`unlockSkill`/árvore). **Decisão:** `character` virou `CharacterId | null` — `null` é o baseline sem bônus, que mantém o harness e os testes neutros (revisou o default do REF-04, GDD §3). 2ª: o buff temático de cada um — Ana e Ricardo reforçam o corte de emissão do ramo (+15%), Juliana financia (+3 PAC/ano), Carlos começa com +8 de resiliência. Tudo derivado, aplicado no `skills.ts` e no `createInitialState`. Números provisórios (REF-09 afina). Suíte 985 → 993. `docs/planilha/` não mudou.*
- [x] `REF-06` **Fase 4** — Apoio por região: `supportDecay` por região, nós de `support` com alvo regional — **M** — *2026-09-30. Cada região ganhou `supportDecay` no `regions.json` (matriz mais suja = apoio mais frágil), com **média 1,5** para não deslocar o agregado; o `tick.ts` lê o da região. O apoio inicial fica em 50 (preserva as asserções); a divergência vem do decaimento, o que já tira o apoio de "andar em bloco". `Region` ganhou o campo (GDD §3 + §4). O `docs/planilha/` regenerou (mudança real de balanceamento; propriedades mantidas) e a temperatura da Inércia foi re-pinada (3,3663 → 3,3655). Suíte 993 → 994. **Adiado para o REF-09:** nós de `support` com alvo regional (mais balanceamento).*
- [x] `REF-07` **Fase 5** — Árvore 20 → 40 nós (+ fatos com fonte) + 5º personagem + remapeamento do Ricardo — **G** — *2ª metade em 2026-10-06, junto com a `REF-09` (o plano manda fazer as duas na mesma passagem). Os **20 nós novos** estendem cada ramo com um **segundo losango** — raiz, dois do meio, fecho —, custando 150/220/220/350 PAC, e cada ramo passou a custar exatamente 1260 PAC. Cada nó novo tem **um fato real com fonte**, os 20 pesquisados e registrados no `docs/CIENCIA.md` (IEA, GWEC, IMO, IATA, UNEP, IRENA, Banco Mundial, OCDE, Global CCS Institute, artigo revisado por pares). **Dois fatos foram corrigidos na conferência** — o da hidrelétrica dizia algo que a fonte não sustenta, e o dos gases de refrigeração contradizia um número que o próprio arquivo já tinha. Entrou também o `tests/ciencia.test.ts`, que amarra os 40 fatos do `skills.json` às linhas do `docs/CIENCIA.md` — a regra §1.9 era uma promessa sem fiador. `docs/GDD.md §2.4` reescrito (a nota do corte solo saiu). **1ª fatia, 2026-09-30:** a **5ª personagem jogável** (`marina-costa`, Transporte — id de rascunho) entrou em `CHARACTER_IDS` + `character-buffs.json`, fechando o mapa 1:1 (5 personagens, 5 ramos). O **remap do Ricardo → Indústria** foi documentado no `PERSONAGENS.md §3` (o buff dele já apontava para lá desde o REF-05). GDD §3 atualizado.*
- [x] `REF-08` **Fase 6** — Tela de seleção de personagem antes da partida — **M** — *2026-10-06. Uma quarta tela entre o título e a partida (`src/ui/character-select.*`), com os quatro em fichas creme: retrato, cargo, ramo e o bônus **derivado dos números** do `character-buffs.json`. **Decidido no chat:** a escolha é **obrigatória nos dois modos**, Feira inclusive, e a **Marina fica de fora até a arte chegar** (nada de placeholder). Quem é selecionável é derivado — jogável (`CHARACTER_IDS`) **e** com retrato (`PERSON_IDS`) —, então ela entra sozinha quando o `[D-Design]` entregar as poses. "Continuar" não passa pela escolha (o save já traz o personagem). `docs/PERSONAGENS.md §4` reescrito, com a autorização do plano da reforma. **Dois bugs achados e consertados no caminho:** o cartão da árvore escrevia o custo só na montagem (o desconto de ramo não chegava à tela, só ao detalhe e à compra), e a barra de espaço nas telas de entrada guardava uma pausa que fazia a partida começar congelada. Suíte 995 → 1028*
- [x] `REF-09` **Fase 6** — Rebalanceamento: `balance.json`, harness de planilha e `docs/BALANCEAMENTO.md`, com medalha alcançável por personagem — **G** — *2026-10-06, na mesma passagem da `REF-07`. **`basePointsPerYear` 10 → 46** (a árvore de 6300 PAC deixava faltar 83% com a renda antiga; com 46 falta 39,6%, dentro da faixa de 25–45%), **`containCost` 30 → 140** (mesma razão: três anos de arrecadação, antes e depois) e **`containDiscountPerNode` 0,2 → 0,1** (com 8 nós de Sociedade o desconto antigo deixava **a contenção de graça**; o `inertia.ts` tinha previsto isso por escrito). O `impact.points` dos 10 eventos foi escalado pelo mesmo fator, senão a mordida de PAC deles cairia a um quinto em silêncio. **O teto é 46, e quem o define é a lição do P7-03:** em 48 quem pula o ramo Sociedade passa a sobreviver, e o dilema do §2.6 vira preferência. **Os cinco personagens chegam à prata**, separados por 0,044 °C. **A vitória por zero líquido deixou de ser impossível por construção** — a árvore inteira leva as emissões a 0,005 Gt/ano —, e o teste que pedia por escrito para falhar nesse dia falhou e foi reescrito. **Preço registrado, não consertado:** a janela de perdão encolheu (largar em 2060 já não mata, contra 2065 antes); subir a mordida da Inércia foi medido e dissolve até a melhor jogada. É do `P8-02`. Tudo em `docs/BALANCEAMENTO.md`. Suíte 1028 → 1034*

---

## CONQ — Conquistas (puxado do Gelo em 2026-10-14)

Escolhido no chat em 2026-10-14, com o backlog numerado drenado: o Gelo já era "a lista de onde o
trabalho sai", e as conquistas foram o item escolhido por serem o que mais rende na feira — motivo
para rejogar os ~5 minutos do Modo Feira e prova, para quem olha o estande, de que **há mais de um
jeito de jogar bem**.

**A regra que define o épico, aprovada no chat:** uma conquista só pode ser **derivada do
`GameState` final**, como a medalha do `§2.7`. Nada é gravado no estado, o save não ganha campo e o
`SAVE_VERSION` não sobe. O que atravessa partidas é só o conjunto de ids já conquistados, em chave
própria no `localStorage`. A especificação está no `docs/GDD.md §2.8`.

**Em duas fatias**, no modelo do `VIS-06`/`VIS-07`: o engine primeiro, sem nada na tela.

- [x] `CONQ-01` Engine e dados: `achievements.json`, `achievements.ts`, as duas constantes e a varredura que prova que nenhuma é inalcançável — **M** — *2026-10-14. **São seis, e não as oito propostas:** a varredura reprovou o Ouro e o Zero líquido por inalcançáveis (a melhor partida medida para em 1,962 °C e 0,86 Gt/ano), "a casa toda" pelo mesmo motivo (o máximo são 7 nós de 8, e só com o desconto da Juliana) e "escudo erguido" por ser automática (toda partida que compra algo termina com 77,8 de resiliência média). O teste joga **cinco partidas de referência** e exige que cada conquista seja ganha por uma e recusada por outra — impossível reprova, automática também. **Um palpite meu caiu na medição:** conter cedo não domina conter tarde (nove milésimos de grau entre os extremos); quem sustenta o apoio é a profundidade no ramo Sociedade. Tudo em `docs/BALANCEAMENTO.md`. Suíte 1038 → 1066*
- [ ] `CONQ-02` Tela e persistência: a prateleira no título, o destaque na tela de fim e a chave no `localStorage` — **M**

---

## Gelo (só se sobrar tempo)

~~Não puxar nada daqui antes do **M3**.~~ **A trava caiu**: o `M3` (`P8-05`, build da feira) está
`[x]` desde 2026-08-26, e a reforma `REF` já tirou dois itens daqui. Com o `P8-01` e o `P8-02`
fechados em 2026-10-06, **o Gelo passou a ser a lista de onde o trabalho sai**, e não mais a lista
do que não cabe.

- ~~Subir a árvore de 20 para 40 nós~~ — **feito** no `REF-07`, em 2026-10-06
- ~~**Personagens jogáveis com bônus de ramo**~~ — **feito** na reforma `REF`: `REF-04` (campo no
  contrato), `REF-05` (buffs no engine), `REF-07` (a 5ª) e `REF-08` (a tela de escolha). A nota
  longa que havia aqui, com os três bloqueios a resolver antes de escrever código, cumpriu o papel
  dela e virou o plano da reforma — fica registrada no `docs/PERSONAGENS.md §4`
- ~~Subir os eventos de 10 para 20~~ — **feito** em 2026-10-06. Os dez novos atravessam a escala de
  aquecimento e **nenhum é geológico** (a régua do tsunami). **A frequência não mudou:** os pesos
  antigos foram divididos por dois, porque a soma deles é a taxa de eventos por ano — dobrou a
  variedade, não a pressão. De graça, o jogo ficou mais honesto com o `§2.6`: comprar o ramo
  Sociedade e **nunca conter** passou a ser dissolvido em 2099
- ~~Efeitos com **alvo regional**~~ — **começou** em 2026-10-06, com o `mangroves`: 14 de resiliência
  nas 5 regiões tropicais em vez de 10 no mundo. Era adiado do `REF-06` para o `REF-09`, e o
  `REF-09` não o fez. **O galho regional do engine era código morto** — os 47 efeitos eram `global`,
  e as duas funções que o tratam buscam o nó nos dados reais, então nenhum teste o alcançava. Agora
  há um nó regional de verdade e três testes em cima dele. **Os outros 46 efeitos seguem globais, e
  quais mais virar regional é desenho** — o `docs/CIENCIA.md` registra o precedente e a régua: um
  alvo regional é uma afirmação sobre o mundo, e afirmação sobre o mundo tem fonte ou não entra
- **A árvore em tela de notebook** — investigado e medido em 2026-10-06, **sem conserto aplicado**.
  O losango só cabe a partir de 1920 px, e as três saídas medidas trocam o losango por mais
  rolagem, que era o defeito que se queria curar. A tabela das medidas e as três opções estão no
  cabeçalho do `src/ui/tree.css`; **a escolha é de desenho, e é do autor**
- ~~Conquistas / troféus~~ — **saiu do Gelo** em 2026-10-14 e virou o épico `CONQ`, acima. A `CONQ-01` (engine, dados e a varredura que reprovou 4 das 8 propostas) está `[x]`; falta a `CONQ-02`, que é a tela
- Cenários históricos ("e se tivéssemos começado em 1990?")
- Ranking local de melhores partidas
- Tradução para inglês
- Clima animado no mapa
### A única coisa travada por algo de fora

**A arte da Marina Costa** — a 5ª personagem, do ramo Transporte. Confirmado no chat em 2026-10-06:
**ela segue mulher**, e o autor vai desenhar **duas poses** (apresentação e alerta), mas a entrega
depende de coisas de fora e **demora**. Contrato no `docs/PERSONAGENS.md §3`; medida que os 16
arquivos de hoje usam: **JPEG de 480 px de altura**, largura livre entre ~390 e ~470, fundo creme
`#F4EDD0`, meio-corpo, 18–35 KB, em `src/assets/characters/poses/marina-costa-<pose>.jpg`.

Enquanto não chegam, **ela é jogável e não selecionável**: o mapa 1:1 dos cinco ramos existe no
engine e não na tela. Quando chegarem, o que falta é pequeno e já está mapeado — entrar no
`PERSON_IDS`, o manifesto `characters.json` (com o ponto do rosto de cada pose), nome e cargo no
`i18n.ts`, e os dois testes que hoje cravam "quatro pessoas, vinte arquivos".

---

## Riscos (modo solo)

| # | Risco | Mitigação |
|---|---|---|
| R1 | Uma pessoa só não dar conta do escopo | Números de corte na tabela da Estratégia Solo — cortar cedo, não na véspera |
| R2 | Balanceamento consumir mais tempo que o previsto | `P3-02` — planilha antes do código |
| R3 | Ficar bloqueado esperando arte ou som de colega | Camadas substituíveis com contrato de arquivo (`P4-04`) — o jogo roda feio, mas roda |
| R4 | Grupo entrar tarde e querer refatorar tudo | `README.md` de onboarding + contratos: contribuição sem tocar em `.ts` |
| R5 | Máquina da feira sem internet | `P8-05` build offline |
| R6 | Fila de revisão de diff acumular | Tarefas pequenas; revisar no mesmo dia em que o agente entrega |
