# PLANO.md — Backlog do projeto

> **Modo atual: solo.** O projeto é executado por uma pessoa + Claude Code.
> Design do jogo: `docs/GDD.md`. Regras de trabalho: `FORMA-DE-TRABALHO.md`. Diário de evolução: `PROGRESSO.md`.
> **Uma tarefa por vez.** Ao concluir: marcar o checkbox, registrar em `PROGRESSO.md`, revisar o diff e commitar (o agente não commita).

## Como usar

- **ID**: `P<parte>-<n>` · `SETUP-*` para infraestrutura
- **Esforço**: `P` (até 1h) · `M` (2–4h) · `G` (uma sessão inteira)
- **Status**: `[ ]` a fazer · `[~]` em andamento · `[x]` concluído
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
| Árvore de habilidades | **20 nós** (4 por ramo) | 40 nós |
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

- [ ] `P1-01` One-pager do conceito: pitch de 5 linhas, fantasia do jogador, dilema central — **P**
- [ ] `P1-02` Protótipo de papel *print and play*: 12 cartas de habilidade, 8 cartas de evento, ficha de indicadores — **M**
- [ ] `P1-03` Playtest do protótipo com 2 pessoas quaisquer (colega, família) — **M** — aceite: `docs/playtests/01-papel.md` com 3 problemas encontrados
- [ ] `P1-04` Escolher o nome do jogo — **P**
- [ ] `P1-05` (APS 1) Levantamento sobre *Plague Inc*: propagação, DNA, árvore de upgrades, curva de dificuldade — **M**

---

## Parte 2 — Narrativa e personagens

Tudo aqui é `[D-Historia]` no futuro. Agora: versão mínima, curta, funcional.

- [ ] `P2-01` `[D]` Meia página sobre o Gerente, a Agência e A Inércia — **P**
- [ ] `P2-02` `[D]` Tom de voz dos textos, com 2 exemplos bons e 2 ruins — **P**
- [ ] `P2-03` `[D]` Identidade das 8 regiões: 1 linha + desafio característico de cada — **M**
- [ ] `P2-04` `[D]` 10 microtextos de evento (1 frase + 1 fato real com fonte) — **M**
- [ ] `P2-05` `[D]` Textos dos 4 finais (Ouro / Prata / Bronze / Derrota) — **P**

---

## Parte 3 — Mecânicas de jogos digitais

**A parte mais importante do projeto.** Balanceamento descoberto em código custa 3x mais caro que na planilha.

- [x] `P3-01` `docs/CIENCIA.md`: fórmulas e constantes com fonte (IPCC AR6, Global Carbon Budget) — **M**
- [ ] `P3-02` Planilha simulando os 75 anos do loop — **G** — aceite: dá para ver a curva de temperatura reagindo à compra de habilidades
- [ ] `P3-03` Curva de dificuldade e Teoria do Fluxo: mapear a tensão década a década — **M**
- [ ] `P3-04` Economia de PAC: quanto entra por ano vs custo total da árvore — **M** — aceite: falta ~35% para comprar tudo (a escolha precisa doer)
- [ ] `P3-05` Especificação da Inércia: gatilhos, ações, contra-ataques — **M**
- [x] `P3-06` Decidir e registrar o tratamento do tsunami (`docs/GDD.md §2.5`) — **P**

---

## Parte 4 — Projetando um jogo digital

- [ ] `P4-01` Escopo travado — incluindo a **lista do que não vai ter** — **P**
- [ ] `P4-02` Cronograma aula a aula — **M**
- [ ] `P4-03` Estimativa de custo: horas × valor-hora, assets, hospedagem — **P**
- [ ] `P4-04` `README.md` de onboarding: como rodar o projeto + os 3 contratos de pacote acima — **M** — *destrava a entrada do grupo sem me custar tempo depois*
- [ ] `P4-05` Distribuir `[D-Design]`, `[D-Musica]` e `[D-Historia]` assim que o grupo for definido — **P**
- [x] `P4-06` **M1** — `SETUP-01` a `SETUP-07` concluídos e Pages no ar — **marco**

---

## Parte 5 — Primeiros cenários e personagens

- [ ] `P5-01` Mapa esquemático com 8 regiões clicáveis (SVG) — **G**
- [ ] `P5-02` `theme.css` com paleta e tipografia, contraste AA; todo estado com **ícone + rótulo de texto**, nunca só cor — **M** — *o arquivo que o Design vai substituir depois*
- [x] `P5-03` HUD: ano, temperatura, emissões, PAC, apoio médio — **M**
- [ ] `P5-04` Painel de detalhe da região ao clicar — **M**
- [x] `P5-05` Controle de tempo: pausa e 1x / 2x / 4x — **M** — aceite: `Espaço` pausa e retoma
- [ ] `P5-06` Esqueleto das telas de título e de fim de jogo — **M**

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

- [ ] `P7-01` `engine/events.ts` + `data/events.json` com 10 eventos e limiares de temperatura — **G**
- [ ] `P7-02` Cartão de evento com o fato real + auto-pausa em evento crítico — **M**
- [ ] `P7-03` `engine/inertia.ts`: ações do antagonista a cada ~6 ticks — **M**
- [ ] `P7-04` Feedback visual: o mapa muda com a temperatura; alertas por região — **M**
- [ ] `P7-05` `[D]` Áudio: 3 efeitos CC0 + botão de mudo (a trilha vem com o cargo) — **P**
- [ ] `P7-06` Telas de fim com gráfico da linha do tempo da partida — **G**
- [ ] `P7-07` **Modo Feira**: partida rápida de ~5 min — **M**
- [ ] `P7-08` Tutorial de 4 passos contextuais (sem modal gigante) — **M**

---

## Parte 8 — Testes e finalização

- [ ] `P8-01` Playtest com 5 pessoas de fora; anotar onde travam — **G**
- [ ] `P8-02` Rodada de balanceamento a partir do playtest → `docs/BALANCEAMENTO.md` — **G**
- [ ] `P8-03` (APS 2) Gravar o vídeo de 1 a 3 min com opiniões positivas e negativas — **M** — *sai de graça do `P8-01`*
- [ ] `P8-04` Passagem de acessibilidade: contraste, navegação por teclado, tamanho de fonte — **M**
- [ ] `P8-05` Build offline para a feira, testado em máquina limpa — **M** — aceite: roda sem internet
- [ ] `P8-06` `[D]` Cartaz com o ODS 13, QR code e pitch de 60s para o estande — **M**
- [ ] `P8-07` Slides da apresentação final — **M**

---

## Gelo (só se sobrar tempo)

Não puxar nada daqui antes do **M3**.

- Subir a árvore de 20 para 40 nós
- Subir os eventos de 10 para 20
- Conquistas / troféus
- Cenários históricos ("e se tivéssemos começado em 1990?")
- Ranking local de melhores partidas
- Tradução para inglês
- Clima animado no mapa

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
