# CLAUDE.md — "Ponto de Virada" (codinome provisório)

> **Este arquivo é a fonte da verdade do projeto.** Leia-o inteiro antes de qualquer tarefa.
> Em caso de conflito entre uma instrução do chat e este arquivo, avise e peça confirmação antes de prosseguir.
> Ao final de cada tarefa, atualize `PROGRESSO.md`.

---

## 0. Contexto

Jogo digital desenvolvido como Projeto de Sala de Aula da disciplina **Desenvolvimento de Jogos e Simuladores** (UniSENAI).

| Item | Valor |
|---|---|
| ODS | **13 — Combate às alterações climáticas** |
| Inspiração de mecânica | *Plague Inc*, com a lógica **invertida** |
| Papel do jogador | **O Gerente** — coordenador de uma agência climática global |
| Equipe | 4 a 6 integrantes (exigência da disciplina) — **execução atual: solo**, com Design, Música e História a delegar depois |
| Entregas | Nota parcial a cada aula → **uma evolução visível por aula, sempre** |
| Marco final | Feira de Jogos Digitais (penúltima aula) + apresentação (última aula) |

**Fantasia central:** em *Plague Inc* você evolui um patógeno até o mundo colapsar. Aqui você evolui **soluções climáticas** contra um mundo que já está esquentando. A tensão não vem de "vencer o relógio", vem de **escolher o que sacrificar**: nenhuma partida tem pontos suficientes para comprar tudo.

---

## 1. Regras inegociáveis do agente

1. **Escopo primeiro.** Não implemente nada que não esteja neste arquivo ou em `PLANO.md`. Ideia nova → proponha no chat, não escreva código.
2. **Tarefas pequenas.** Uma tarefa = um objetivo verificável = **um diff que cabe em uma revisão**. Nada de PRs gigantes — quem revisa é uma pessoa, à noite, depois da aula.
3. **Nunca apague nem renomeie arquivos existentes sem pedir.**
4. **Nunca instale dependência fora da lista permitida (§2)** sem justificar e obter aprovação.
5. **Antes de considerar qualquer tarefa concluída:** `npm run typecheck && npm run test && npm run build` passando.
6. **Sem `any`, sem `@ts-ignore`, sem `console.log` no código final.**
7. **Sem `Math.random()`** em qualquer lugar. Todo sorteio usa o RNG semeado (§7).
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
├── CLAUDE.md              # este arquivo (não editar sem pedir)
├── PLANO.md               # backlog por aula, com checkboxes
├── PROGRESSO.md           # diário datado — evidência de evolução por aula
├── docs/
│   ├── CIENCIA.md         # cada número climático + fonte
│   ├── CREDITOS.md        # assets e licenças
│   └── BALANCEAMENTO.md   # o que foi ajustado, por quê, resultado
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

**Sobre colaboradores no GitHub:** o Claude Code não vira colaborador do repositório; ele usa o seu git local. O que apareceria seria só o trailer de co-autoria (um segundo avatar no commit), e é isso que as três camadas acima eliminam. **Não instalar o app do Claude no GitHub** (`/install-github-app`) — ele adicionaria um bot visível nos PRs.

Se algum commit já tiver saído com o trailer: `git rebase -i` para poucos commits, `git filter-repo --message-callback` para muitos.

---

## 5. Fluxo de trabalho do agente

A cada sessão:

1. Ler `CLAUDE.md`, `PLANO.md` e as últimas 3 entradas de `PROGRESSO.md`.
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

## 6. Design do jogo (fonte da verdade)

### 6.1 Loop principal

O tempo corre sozinho (com pausa e 3 velocidades), **1 tick = 1 mês**, partida de **2025 a 2100**.

```
tempo avança
  → regiões emitem CO₂ (reduzido pelas habilidades ativas)
  → CO₂ acumulado sobe → temperatura sobe
  → temperatura maior = eventos mais frequentes e mais severos
  → eventos derrubam apoio público, PIB e podem custar pontos
  → o Gerente acumula Pontos de Ação (PAC) e decide onde gastar
  → habilidades reduzem emissões / aumentam resiliência / geram mais PAC
```

**A decisão interessante em toda partida:** *mitigar* (reduzir emissões, resultado lento, evita o problema) **vs** *adaptar* (resiliência, alívio imediato, não resolve a causa). Quem só adapta perde no longo prazo. Quem só mitiga perde o apoio público antes de colher o resultado. **Isso é a mensagem do ODS 13 embutida na mecânica — não em um texto de tutorial.**

### 6.2 Indicadores

| Indicador | Faixa | Papel |
|---|---|---|
| **PAC** (Pontos de Ação Climática) | acumula | moeda da árvore de habilidades |
| **Emissões globais** | GtCO₂/ano | soma das regiões; meta é chegar a zero |
| **CO₂ acumulado** | GtCO₂ desde 2025 | dirige a temperatura |
| **Temperatura** | °C acima do pré-industrial | dirige frequência/severidade dos eventos |
| **Apoio público** | 0–100 por região | zerou em muitas regiões = derrota |
| **Resiliência** | 0–100 por região | reduz o dano dos eventos |
| **Inércia** | 0–100 | força do antagonista |

### 6.3 Regiões

8 macrorregiões (América do Norte, América Latina, Europa, África, Oriente Médio, Ásia Oriental, Ásia Meridional, Oceania). Cada uma tem população, emissões próprias, matriz energética, apoio e resiliência. **Regiões diferentes = estratégias diferentes**: quem tem sol abundante e pouca verba não se resolve igual a quem tem indústria pesada e verba alta.

### 6.4 Árvore de habilidades

5 ramos, ~8 nós cada (~40 no total). Nós de nível 1 são baratos e genéricos; níveis 3–4 são caros e transformadores.

| Ramo | Exemplos de nós |
|---|---|
| **Energia** | solar, eólica, hidrelétrica, armazenamento em bateria, rede inteligente |
| **Transporte e Cidades** | eletrificação de frotas, transporte público, ciclovias, prédios eficientes |
| **Natureza** | reflorestamento, manguezais, agricultura regenerativa, proteção oceânica |
| **Indústria** | eficiência industrial, economia circular, cimento e aço verdes |
| **Sociedade** | educação climática, acordos internacionais, alerta precoce, defesa costeira |

Todo nó tem: custo em PAC, pré-requisitos, **efeito mecânico** e **um fato real de uma frase com fonte** (é isso que transforma o jogo em conscientização sem virar palestra).

### 6.5 Eventos

Sorteados por tick, com peso crescente conforme a temperatura. Cada um tem um limiar: tsunami e elevação do mar só entram acima de certo aquecimento — **o jogador precisa sentir que o mundo piora porque ele demorou.**

Tipos: onda de calor, seca, enchente, tempestade/ciclone, incêndio florestal, deslizamento/desabamento, tsunami e elevação do nível do mar, colapso de safra.

> **Nota de honestidade científica:** tsunamis são geológicos, não climáticos. Se o jogo incluir tsunami (está no conceito original), o texto do evento deve tratá-lo como **elevação do nível do mar + ressaca extrema**, ou marcar explicitamente que é licença de jogo. Registre a decisão em `docs/CIENCIA.md`. Não venda desinformação como educação.

Cada evento carrega uma frase educativa curta ligada a um fenômeno real.

### 6.6 O antagonista — "A Inércia"

Não é um vilão de bigode. É a **força que resiste à mudança**: lobby fóssil, desinformação, subsídios, prioridade de curto prazo. Age a cada ~6 ticks: campanhas de desinformação (derrubam apoio), subsídios (aumentam emissões), recuos regulatórios (encarecem habilidades).

Cresce quando o jogador avança rápido demais sem preparar apoio público. **É um espelho das decisões do jogador, não um dado aleatório.** Habilidades do ramo Sociedade são o contra-ataque.

### 6.7 Vitória e derrota

- **Vitória**: emissões líquidas ≈ 0 antes de 2100.
  - `< 1,5 °C` → Ouro · `< 2,0 °C` → Prata · `< 2,5 °C` → Bronze
- **Derrota**: temperatura > 3,0 °C, **ou** apoio público médio global = 0 (a agência é dissolvida).
- Tela final: gráfico da linha do tempo + "o que você poderia ter feito diferente" + 3 ações reais do mundo real. Curto. Sem sermão.

---

## 7. Contratos de dados

```ts
type RegionId = 'na' | 'la' | 'eu' | 'af' | 'me' | 'ea' | 'sa' | 'oc';

type Region = {
  id: RegionId;
  name: string;
  population: number;        // milhões
  emissions: number;         // GtCO₂e/ano
  cleanShare: number;        // 0..1 da matriz energética
  support: number;           // 0..100
  resilience: number;        // 0..100
  economy: number;           // índice relativo, base 100
};

type GameState = {
  year: number;
  tick: number;              // 1 tick = 1 mês
  actionPoints: number;      // PAC
  cumulativeCO2: number;     // GtCO₂ desde 2025
  temperature: number;       // °C acima do pré-industrial
  regions: Record<RegionId, Region>;
  unlockedSkills: SkillId[];
  activeEvents: ActiveEvent[];
  inertia: number;           // 0..100
  seed: number;
  history: Snapshot[];       // para o gráfico final
};

type Effect =
  | { kind: 'emissionCut'; target: RegionId | 'global'; value: number }   // % ao ano
  | { kind: 'pointsPerYear'; value: number }
  | { kind: 'resilience'; target: RegionId | 'global'; value: number }
  | { kind: 'support'; target: RegionId | 'global'; value: number }
  | { kind: 'inertiaCut'; value: number };

type Skill = {
  id: SkillId;
  branch: 'energy' | 'transport' | 'nature' | 'industry' | 'society';
  name: string;
  description: string;   // efeito no jogo, 1 frase
  fact: string;          // fato real, 1 frase — fonte em docs/CIENCIA.md
  cost: number;
  requires: SkillId[];
  effects: Effect[];
};

type ClimateEvent = {
  id: string;
  name: string;
  tempThreshold: number;                    // só sorteia acima disso
  baseWeight: number;
  targets: RegionId[] | 'any';
  impact: { support: number; economy: number; points: number };
  mitigatedByResilience: boolean;
  fact: string;
};
```

**Toda função do engine tem esta forma:** `(state: GameState, ...args) => GameState`.
**RNG:** `mulberry32(seed)` — mesma seed, mesma partida. Isso torna bugs reproduzíveis e o playtest confiável.

---

## 8. Balanceamento inicial (`balance.json`)

Ponto de partida para ajustar com playtest, **não é sagrado**:

```jsonc
{
  "startYear": 2025,
  "endYear": 2100,
  "ticksPerYear": 12,
  "startTemperature": 1.3,        // °C acima do pré-industrial
  "startEmissions": 41,           // GtCO₂/ano global
  "tcre": 0.00045,                // °C por GtCO₂ acumulado
  "basePointsPerYear": 10,
  "supportDecayPerYear": 1.5,
  "inertiaGrowthPerYear": 2,
  "eventWeightPerDegree": 1.8,    // multiplicador de frequência por °C
  "loseTemperature": 3.0
}
```

Fórmula da temperatura: `temperature = startTemperature + tcre * cumulativeCO2`.
Peso de um evento: `baseWeight * (1 + eventWeightPerDegree * max(0, T - tempThreshold))`.

Todo ajuste de balanceamento vira uma linha em `docs/BALANCEAMENTO.md`: **valor antigo → novo → por quê → o que mudou no playtest.**

---

## 9. Acessibilidade e UX (obrigatório, não "se der tempo")

- **Nunca comunicar informação só por cor.** Todo estado tem ícone + rótulo em texto. Verde/vermelho sozinhos não valem.
- Contraste mínimo AA (4.5:1) em todo texto.
- Fonte mínima 16px; o jogo será visto de pé, numa feira, de longe.
- Todo painel navegável por teclado; `Esc` sempre fecha.
- Tooltip em tudo que tem número.
- **Partida de demonstração da feira cabe em ~5 minutos** (modo rápido). Ninguém vai jogar 40 minutos no estande.

---

## 10. Roadmap por aula

Espelha as 8 partes do plano de ensino. Cada aula precisa de **algo jogável ou visível** — vale nota parcial.

| Parte | Entrega |
|---|---|
| 1. Introdução | Conceito fechado + **protótipo de papel** (print and play) da árvore e dos eventos — testar diversão antes de programar |
| 2. Narrativa e personagens | O Gerente, A Inércia, vozes regionais, tom do texto |
| 3. Mecânicas | Loop no papel, curva de dificuldade, Teoria do Fluxo aplicada |
| 4. Projetando | Escopo travado, cronograma, repo + CI + este arquivo no lugar |
| 5. Primeiros cenários | Mapa SVG/canvas com 8 regiões, HUD, identidade visual |
| 6. Primeiras mecânicas | Engine com tick, clima e árvore funcionando de ponta a ponta |
| 7. Desenvolvimento | Eventos, Inércia, áudio, telas de fim de jogo |
| 8. Testes e finalização | Playtests (vira a **APS 2**), balanceamento, build da feira |

**Regra do protótipo de papel:** se a mecânica não for interessante com papel e caneta, programar não vai salvar.

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
- Reescrever este arquivo sem pedir
- "Ajustar" balanceamento direto no código em vez de `balance.json`

---

## 13. Entregas acadêmicas paralelas

- **APS 1 — Relatório técnico** sobre o jogo que inspirou o projeto (*Plague Inc*): mecânica de propagação, moeda de evolução (DNA), árvore de upgrades, curva de dificuldade, e **como cada um desses elementos foi invertido aqui**. Diagramado, com logo do UniSENAI. Entrega na Avaliação Parcial, via AVA.
- **APS 2 — Vídeo de 1 a 3 min** com alguém de fora da equipe jogando o protótipo, com opiniões positivas e negativas. Sai naturalmente do playtest da Parte 8. Entrega na data da apresentação, via AVA.
- **Feira de Jogos Digitais** — build offline, modo demo de 5 min, cartaz com o ODS 13 e QR code para jogar.

---

## 14. Decisões pendentes (resolver com a equipe antes da Parte 4)

- [ ] Nome definitivo do jogo
- [ ] Formar o grupo e distribuir os 3 pacotes delegáveis (Design, Música, História) — ver `PLANO.md`
- [ ] Direção de arte (pixel art? flat vetorial? mapa estilizado?)
- [ ] Trilha e efeitos sonoros (fonte CC0)
- [ ] Confirmar stack com o professor
