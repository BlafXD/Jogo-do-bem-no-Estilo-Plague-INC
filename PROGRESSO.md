# PROGRESSO.md — Diário do projeto

> **Para que serve:** provar evolução. Cada aula vale nota parcial, e a memória falha três
> semanas depois. Aqui fica o registro datado do que entrou no projeto, como conferir e o
> que ficou aberto. É a matéria-prima do relatório final e da apresentação.
>
> Design do jogo: `docs/GDD.md`. Regras de trabalho: `CLAUDE.md`. Backlog: `PLANO.md`.

## Como escrever uma entrada

Uma entrada por sessão de trabalho, **mais recente no topo**. Formato de `CLAUDE.md §5`:

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

## 2026-08-07 — Separação: design do jogo vira `docs/GDD.md`

- **Parte / tarefa:** nenhuma do `PLANO.md` — reorganização documental, decidida no chat
- **Motivo:** o `CLAUDE.md` acumulava duas coisas diferentes: *o que o jogo é* e *como se trabalha no repositório*. Quem entrasse no projeto para escrever narrativa ou desenhar ícone precisava atravessar regras de git para achar a descrição da árvore de habilidades. Separar também deixa o repositório com cara de projeto acadêmico — um GDD é um artefato reconhecível da disciplina.
- **O que mudou:**
  - `docs/GDD.md` **criado** — recebe §0 (Contexto), §6 (Design do jogo), §7 (Contratos de dados), §8 (Balanceamento), §9 (Acessibilidade), §10 (Roadmap), §13 (Entregas acadêmicas) e §14 (Decisões pendentes). **Conteúdo movido na íntegra, sem reescrita** — só mudou de arquivo e de número de seção.
  - `CLAUDE.md` **enxugado** — fica com §1 a §5, §11 e §12: regras do agente, stack, estrutura de pastas, convenções, git, fluxo e Definition of Done. Ganhou no topo a leitura obrigatória do GDD.
  - `PLANO.md` — cabeçalho aponta para os dois arquivos; `P3-06` passa a referenciar `docs/GDD.md §2.5` (era `CLAUDE.md §6.5`).
- **Decisão registrada — a numeração do `CLAUDE.md` não foi refeita.** As seções que ficaram mantiveram os números originais, com lacunas (§1–5, depois §11–12). Há referências a `§2`, `§3`, `§4.1` e `§5` em `PLANO.md`, `.gitignore`, `tsconfig.json` e `index.html`; renumerar quebraria todas por ganho estético. Com isso, **uma única referência** no projeto inteiro precisou de conserto.
- **Entradas antigas deste diário não foram editadas**, mesmo citando seções que se moveram (ex.: `CLAUDE.md §14` na entrada de 2026-08-06). Elas descrevem o que era verdade naquela data — reescrever histórico é o que a regra "entrada reconstruída de memória vira ficção" tenta evitar. A tabela de equivalência no topo do `GDD.md` resolve a leitura.
- **Como verificar:**
  ```bash
  git diff --stat                        # CLAUDE.md encolhe, docs/GDD.md aparece
  grep -rn "CLAUDE.md §" --include="*.md" --include="*.json" --include="*.html" .
  # as seções citadas (§2, §3, §4.1, §5) precisam existir no CLAUDE.md enxuto
  ```
- **Pendente:**
  - `CLAUDE.md` continua no repositório e no histórico do GitHub — a mudança foi de conteúdo, não de visibilidade. Se um dia a decisão for tirar o arquivo de vez, o custo cresce com o número de commits.
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
  - `SETUP-03`: sem Vitest, ESLint e Prettier. Os scripts `test` e `lint` **não existem** — ou seja, a regra 5 do `CLAUDE.md` (`typecheck && test && build`) só pode ser cumprida pela metade até isso entrar.
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
