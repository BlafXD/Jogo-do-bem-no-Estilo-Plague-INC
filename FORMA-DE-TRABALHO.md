# FORMA DE TRABALHO

> **Leia `docs/GDD.md` antes de qualquer tarefa.** Ele é o Documento de Design do Jogo: o que o
> jogo é, como se comporta, contratos de dados e balanceamento. Este arquivo aqui cobre só
> *como se trabalha neste repositório* — stack, convenções, git, fluxo de entrega.
>
> Em caso de conflito entre uma instrução do chat e estes dois arquivos, avise e peça
> confirmação antes de prosseguir.
> Ao final de cada tarefa, atualize `PROGRESSO.md`.

| Arquivo | Para quê |
|---|---|
| `docs/GDD.md` | **O jogo**: mecânicas, indicadores, regiões, árvore, eventos, dados, balanceamento |
| `FORMA-DE-TRABALHO.md` (este) | **O trabalho**: stack, arquitetura, convenções, git, fluxo |
| `PLANO.md` | Backlog por aula, com checkboxes |
| `PROGRESSO.md` | Diário datado — evidência de evolução |

> **Sobre a numeração:** as seções §0, §6 a §10, §13 e §14 mudaram para `docs/GDD.md`. As que
> ficaram mantiveram o número original de propósito — há referências a `§3`, `§4.1` e `§5` em
> `PLANO.md`, `PROGRESSO.md` e em comentários de código. A lacuna é intencional.

---

## 1. Regras inegociáveis do agente

1. **Escopo primeiro.** Não implemente nada que não esteja em `docs/GDD.md` ou em `PLANO.md`. Ideia nova → proponha no chat, não escreva código.
2. **Tarefas pequenas.** Uma tarefa = um objetivo verificável = **um diff que cabe em uma revisão**. Nada de PRs gigantes — quem revisa é uma pessoa, à noite, depois da aula.
3. **Nunca apague nem renomeie arquivos existentes sem pedir.**
4. **Nunca instale dependência fora da lista permitida (§2)** sem justificar e obter aprovação.
5. **Antes de considerar qualquer tarefa concluída:** `npm run typecheck && npm run test && npm run build` passando.
6. **Sem `any`, sem `@ts-ignore`, sem `console.log` no código final.**
7. **Sem `Math.random()`** em qualquer lugar. Todo sorteio usa o RNG semeado (`docs/GDD.md §3`).
8. **Números de balanceamento e textos de UI nunca ficam hardcoded** no código — vivem em `src/data/*.json` e `src/data/i18n.ts`.
9. **Nenhum dado científico inventado.** Todo número climático precisa de fonte registrada em `docs/CIENCIA.md`.
10. **Nenhum asset de terceiros com direito autoral.** Nada de arte, ícones, fontes, sons ou UI de *Plague Inc* ou de marcas reais. Só CC0/CC-BY com crédito em `docs/CREDITOS.md`.
11. **Comentários e mensagens de commit em pt-BR; código, nomes de variáveis e tipos em inglês.**
12. **Idioma da interface: pt-BR.** Estrutura pronta para i18n, mas só pt-BR nesta entrega.
13. **Autoria é da equipe.** Nenhum commit, PR, issue ou comentário leva assinatura, co-autoria ou rodapé de ferramenta de IA (§4.1).

---

## 2. Stack e dependências

**Decisão:** aplicação web — roda em qualquer máquina da feira, sem instalação, e publica em GitHub Pages.

- **TypeScript** (strict) + **Vite**
- **Engine de simulação em TS puro** — zero dependência de UI, 100% testável
- **UI**: HTML + CSS moderno (custom properties, grid) + `<canvas>` só para o mapa e partículas
- **Testes**: Vitest
- **Lint/format**: ESLint + Prettier
- **Deploy**: GitHub Actions → GitHub Pages

**Dependências permitidas sem perguntar:** as acima.
**Precisa de aprovação:** qualquer framework de UI (React/Svelte), Phaser, Three.js, bibliotecas de gráficos, libs de animação.
**Proibido:** backend, banco de dados, autenticação, analytics, qualquer coisa que exija servidor. O jogo é 100% client-side; save em `localStorage`.

---

## 3. Estrutura de pastas

```
/
├── FORMA-DE-TRABALHO.md   # este arquivo — regras de trabalho (não editar sem pedir)
├── CLAUDE.md              # ponteiro de 6 linhas para este arquivo e para o GDD
├── PLANO.md               # backlog por aula, com checkboxes
├── PROGRESSO.md           # diário datado — evidência de evolução por aula
├── docs/
│   ├── GDD.md             # Documento de Design do Jogo (não editar sem pedir)
│   ├── CIENCIA.md         # cada número climático + fonte
│   ├── CREDITOS.md        # assets e licenças
│   ├── BALANCEAMENTO.md   # o que foi ajustado, por quê, resultado
│   └── evidencias/        # prints e GIFs por aula (Definition of Done, §11)
├── src/
│   ├── engine/            # TS PURO — sem DOM, sem window, sem import de UI
│   │   ├── state.ts       # tipos e estado inicial
│   │   ├── tick.ts        # avanço de tempo (função pura)
│   │   ├── climate.ts     # emissões → CO₂ acumulado → temperatura
│   │   ├── skills.ts      # aplicação de efeitos da árvore
│   │   ├── events.ts      # sorteio e resolução de eventos
│   │   ├── inertia.ts     # comportamento do antagonista
│   │   └── rng.ts         # RNG semeado (mulberry32)
│   ├── data/
│   │   ├── regions.json
│   │   ├── skills.json
│   │   ├── events.json
│   │   └── balance.json   # todas as constantes ajustáveis
│   ├── ui/                # renderização e interação
│   └── main.ts
└── tests/
```

**Regra de ouro da arquitetura:** `engine/` não sabe que existe uma tela. Se um arquivo em `engine/` importar algo de `ui/`, está errado.

---

## 4. Convenções de código

- Funções do engine são **puras**: recebem `GameState`, devolvem `GameState` novo. Nunca mutam o estado recebido.
- Uma função faz uma coisa. Se passar de ~40 linhas, quebre.
- Prefira `type` a `interface`; união discriminada em vez de flags booleanas.
- Sem herança de classes no domínio — dados + funções.
- Nome de arquivo em `kebab-case`, tipos em `PascalCase`, funções em `camelCase`.
- Todo módulo do engine tem teste correspondente em `tests/`.

**Commits (Conventional Commits, em pt-BR):**
`feat(skills): adiciona ramo de energia`, `fix(events): corrige impacto negativo duplicado`, `docs(progresso): registra aula 5`.

### 4.1 Git e autoria

**O agente nunca commita. Nunca.** Quem lê o diff, decide e registra o commit é a equipe — é nesse momento que vocês entendem de fato o que entrou no projeto. O agente edita arquivos, roda os testes e **para**.

- **Proibido ao agente:** `git commit`, `push`, `rebase`, `reset`, `merge`, `checkout`, `switch`, `stash`, `cherry-pick`, `tag`, `revert`, `gh pr create`, `gh pr merge`
- **Liberado (leitura):** `git status`, `git diff`, `git log`, `git show`, `git branch --list`
- **`git add` também não** — deixar o *staging* limpo para quem for revisar

**O repositório é da equipe. Nenhuma ferramenta assina o trabalho.**

O agente **nunca** adiciona a um commit, PR, issue ou comentário:

- `Co-Authored-By: Claude <noreply@anthropic.com>` (ou qualquer variação com nome de modelo)
- `🤖 Generated with [Claude Code](...)` ou rodapé equivalente
- Emoji de robô, menção a IA ou a "gerado por" na mensagem de commit
- Qualquer assinatura em `PROGRESSO.md`, `README.md` ou nos comentários do código

A mensagem de commit descreve **o que mudou**, nada mais.

**Três camadas para garantir isso — implementar as três:**

**1. Configuração** — `.claude/settings.json` na raiz do repositório (versionado: quando os outros integrantes entrarem, já vale para eles):

```json
{
  "includeCoAuthoredBy": false,
  "permissions": {
    "allow": [
      "Bash(git status)",
      "Bash(git diff:*)",
      "Bash(git log:*)",
      "Bash(git show:*)",
      "Bash(npm run:*)",
      "Bash(npx vitest:*)"
    ],
    "deny": [
      "Bash(git commit:*)",
      "Bash(git add:*)",
      "Bash(git push:*)",
      "Bash(git rebase:*)",
      "Bash(git reset:*)",
      "Bash(git merge:*)",
      "Bash(git checkout:*)",
      "Bash(git switch:*)",
      "Bash(git stash:*)",
      "Bash(git cherry-pick:*)",
      "Bash(git revert:*)",
      "Bash(git tag:*)",
      "Bash(gh pr:*)",
      "Bash(rm -rf:*)"
    ]
  }
}
```

> A lista de `deny` é uma trava forte, não uma prisão: ela casa por padrão de comando e um comando escrito de forma criativa pode escapar. Ela existe para impedir o acidente, não para substituir a sua revisão. Se um dia o agente pedir permissão para commitar, a resposta é não.

**2. Hook de git** (a rede de segurança — a configuração acima nem sempre é respeitada). Criar `.githooks/commit-msg`:

```sh
#!/bin/sh
# Remove qualquer atribuição automática de IA da mensagem de commit.
grep -v -e '^Co-Authored-By: Claude' \
        -e 'Generated with \[Claude Code\]' \
        -e '^🤖' "$1" > "$1.tmp" || true
mv "$1.tmp" "$1"
```

Ativar (uma vez por máquina — e de novo em cada máquina que entrar no projeto):

```bash
chmod +x .githooks/commit-msg
git config core.hooksPath .githooks
```

**3. Identidade correta antes do primeiro commit:**

```bash
git config user.name "Seu Nome"
git config user.email "seu-email@do-github"
```

O autor do commit é sempre a identidade do git local — o agente nunca commita com identidade própria.

**Sobre colaboradores no GitHub:** a ferramenta de IA não vira colaboradora do repositório; ela usa o seu git local. O que apareceria seria só o trailer de co-autoria (um segundo avatar no commit), e é isso que as três camadas acima eliminam. **Não instalar o app de IA no GitHub** — ele adicionaria um bot visível nos PRs.

Se algum commit já tiver saído com o trailer: `git rebase -i` para poucos commits, `git filter-repo --message-callback` para muitos.

---

## 5. Fluxo de trabalho do agente

A cada sessão:

1. Ler `FORMA-DE-TRABALHO.md`, `docs/GDD.md`, `PLANO.md` e as últimas 3 entradas de `PROGRESSO.md`.
2. Escolher **uma** tarefa não concluída de `PLANO.md` (ou a que o usuário indicar).
3. Declarar em 3 linhas o que vai fazer e quais arquivos vai tocar. **Esperar "ok" se a tarefa mexer em mais de 4 arquivos.**
4. Implementar + testes.
5. Rodar typecheck, testes e build.
6. Marcar o checkbox em `PLANO.md` e adicionar entrada em `PROGRESSO.md` no formato:
   `## AAAA-MM-DD — <o que mudou> — <como verificar> — <o que ficou pendente>`
7. **Parar e entregar para revisão.** O agente encerra a tarefa com um bloco assim, e nada além disso:

```
Arquivos alterados:  (saída de `git diff --stat`)
O que mudei:         3 linhas, em português
Por que:             1 linha
Como verificar:      comando exato para rodar, ou o que olhar na tela
Atenção:             o que ficou mal resolvido ou merece um segundo olhar
Commit sugerido:     feat(engine): calcula temperatura a partir do CO₂ acumulado
```

O commit é feito por uma pessoa, depois de ler o diff. **Se o agente sugerir "quer que eu commite?", a resposta é não.**

Se algo do plano estiver ambíguo, **pergunte antes de assumir**. Assumir errado custa mais que perguntar.

---

## 11. Definition of Done (por aula)

- [ ] `typecheck`, `test` e `build` passando
- [ ] Deploy no GitHub Pages atualizado
- [ ] Entrada nova em `PROGRESSO.md`
- [ ] Print ou GIF salvo em `docs/evidencias/` (matéria-prima do relatório e da apresentação)
- [ ] Nenhum `TODO` sem dono no código

---

## 12. Proibições

- Assets, arte, sons, ícones ou UI copiados de *Plague Inc* ou de qualquer jogo comercial
- Logos de marcas, empresas ou ONGs reais
- Números climáticos sem fonte
- Dependência nova sem aprovação
- Backend, banco de dados ou chamada de API externa
- Rodar `git commit`, `add`, `push`, `rebase`, `reset`, `merge`, `checkout` ou `gh pr` — o histórico é da equipe
- Trailer de co-autoria, rodapé "Generated with Claude Code" ou emoji 🤖 em commits, PRs ou issues
- Reescrever este arquivo ou `docs/GDD.md` sem pedir
- "Ajustar" balanceamento direto no código em vez de `balance.json`
