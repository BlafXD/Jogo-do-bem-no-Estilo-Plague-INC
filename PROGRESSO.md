# PROGRESSO.md — Diário do projeto

> **Para que serve:** provar evolução. Cada aula vale nota parcial, e a memória falha três
> semanas depois. Aqui fica o registro datado do que entrou no projeto, como conferir e o
> que ficou aberto. É a matéria-prima do relatório final e da apresentação.
>
> Regras do projeto: `CLAUDE.md`. Backlog: `PLANO.md`.

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
