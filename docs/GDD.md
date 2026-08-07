# GDD — "Ponto de Virada" (codinome provisório)

> **Documento de Design do Jogo.** Descreve *o que o jogo é* e *como ele se comporta*.
> É a fonte da verdade do design: se o código discordar deste arquivo, o código está errado.
>
> | Arquivo | Para quê |
> |---|---|
> | `docs/GDD.md` (este) | O jogo: mecânicas, dados, balanceamento, escopo |
> | `CLAUDE.md` | Como se trabalha neste repositório: stack, convenções, git |
> | `PLANO.md` | Backlog por aula, com checkboxes |
> | `PROGRESSO.md` | Diário datado — evidência de evolução |

<details>
<summary>Equivalência com a numeração antiga do <code>CLAUDE.md</code></summary>

Este documento nasceu de dentro do `CLAUDE.md`, que acumulava design e regras de trabalho no mesmo lugar. As seções foram movidas sem alteração de conteúdo:

| Antes | Agora |
|---|---|
| `CLAUDE.md §0` Contexto | `GDD §1` |
| `CLAUDE.md §6` Design do jogo | `GDD §2` |
| `CLAUDE.md §7` Contratos de dados | `GDD §3` |
| `CLAUDE.md §8` Balanceamento inicial | `GDD §4` |
| `CLAUDE.md §9` Acessibilidade e UX | `GDD §5` |
| `CLAUDE.md §10` Roadmap por aula | `GDD §6` |
| `CLAUDE.md §13` Entregas acadêmicas | `GDD §7` |
| `CLAUDE.md §14` Decisões pendentes | `GDD §8` |

O `CLAUDE.md` **manteve** a numeração original das seções que ficaram (§1 a §5, §11, §12), de propósito: existem referências a `§3`, `§4.1` e `§5` espalhadas por `PLANO.md`, `PROGRESSO.md` e comentários de código. Preservar os números custa uma lacuna estética e economiza uma caça a referências quebradas.

</details>

---

## 1. Contexto

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

## 2. Design do jogo

### 2.1 Loop principal

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

### 2.2 Indicadores

| Indicador | Faixa | Papel |
|---|---|---|
| **PAC** (Pontos de Ação Climática) | acumula | moeda da árvore de habilidades |
| **Emissões globais** | GtCO₂/ano | soma das regiões; meta é chegar a zero |
| **CO₂ acumulado** | GtCO₂ desde 2025 | dirige a temperatura |
| **Temperatura** | °C acima do pré-industrial | dirige frequência/severidade dos eventos |
| **Apoio público** | 0–100 por região | zerou em muitas regiões = derrota |
| **Resiliência** | 0–100 por região | reduz o dano dos eventos |
| **Inércia** | 0–100 | força do antagonista |

### 2.3 Regiões

8 macrorregiões (América do Norte, América Latina, Europa, África, Oriente Médio, Ásia Oriental, Ásia Meridional, Oceania). Cada uma tem população, emissões próprias, matriz energética, apoio e resiliência. **Regiões diferentes = estratégias diferentes**: quem tem sol abundante e pouca verba não se resolve igual a quem tem indústria pesada e verba alta.

### 2.4 Árvore de habilidades

5 ramos, ~8 nós cada (~40 no total). Nós de nível 1 são baratos e genéricos; níveis 3–4 são caros e transformadores.

| Ramo | Exemplos de nós |
|---|---|
| **Energia** | solar, eólica, hidrelétrica, armazenamento em bateria, rede inteligente |
| **Transporte e Cidades** | eletrificação de frotas, transporte público, ciclovias, prédios eficientes |
| **Natureza** | reflorestamento, manguezais, agricultura regenerativa, proteção oceânica |
| **Indústria** | eficiência industrial, economia circular, cimento e aço verdes |
| **Sociedade** | educação climática, acordos internacionais, alerta precoce, defesa costeira |

Todo nó tem: custo em PAC, pré-requisitos, **efeito mecânico** e **um fato real de uma frase com fonte** (é isso que transforma o jogo em conscientização sem virar palestra).

> O corte de escopo do modo solo (20 nós em vez de 40) está registrado em `PLANO.md`, na tabela da Estratégia Solo.

### 2.5 Eventos

Sorteados por tick, com peso crescente conforme a temperatura. Cada um tem um limiar: tsunami e elevação do mar só entram acima de certo aquecimento — **o jogador precisa sentir que o mundo piora porque ele demorou.**

Tipos: onda de calor, seca, enchente, tempestade/ciclone, incêndio florestal, deslizamento/desabamento, tsunami e elevação do nível do mar, colapso de safra.

> **Nota de honestidade científica:** tsunamis são geológicos, não climáticos. Se o jogo incluir tsunami (está no conceito original), o texto do evento deve tratá-lo como **elevação do nível do mar + ressaca extrema**, ou marcar explicitamente que é licença de jogo. Registre a decisão em `docs/CIENCIA.md`. Não venda desinformação como educação.

Cada evento carrega uma frase educativa curta ligada a um fenômeno real.

### 2.6 O antagonista — "A Inércia"

Não é um vilão de bigode. É a **força que resiste à mudança**: lobby fóssil, desinformação, subsídios, prioridade de curto prazo. Age a cada ~6 ticks: campanhas de desinformação (derrubam apoio), subsídios (aumentam emissões), recuos regulatórios (encarecem habilidades).

Cresce quando o jogador avança rápido demais sem preparar apoio público. **É um espelho das decisões do jogador, não um dado aleatório.** Habilidades do ramo Sociedade são o contra-ataque.

### 2.7 Vitória e derrota

- **Vitória**: emissões líquidas ≈ 0 antes de 2100.
  - `< 1,5 °C` → Ouro · `< 2,0 °C` → Prata · `< 2,5 °C` → Bronze
- **Derrota**: temperatura > 3,0 °C, **ou** apoio público médio global = 0 (a agência é dissolvida).
- Tela final: gráfico da linha do tempo + "o que você poderia ter feito diferente" + 3 ações reais do mundo real. Curto. Sem sermão.

---

## 3. Contratos de dados

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

## 4. Balanceamento inicial (`balance.json`)

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

## 5. Acessibilidade e UX (obrigatório, não "se der tempo")

- **Nunca comunicar informação só por cor.** Todo estado tem ícone + rótulo em texto. Verde/vermelho sozinhos não valem.
- Contraste mínimo AA (4.5:1) em todo texto.
- Fonte mínima 16px; o jogo será visto de pé, numa feira, de longe.
- Todo painel navegável por teclado; `Esc` sempre fecha.
- Tooltip em tudo que tem número.
- **Partida de demonstração da feira cabe em ~5 minutos** (modo rápido). Ninguém vai jogar 40 minutos no estande.

---

## 6. Roadmap por aula

Espelha as 8 partes do plano de ensino. Cada aula precisa de **algo jogável ou visível** — vale nota parcial.

| Parte | Entrega |
|---|---|
| 1. Introdução | Conceito fechado + **protótipo de papel** (print and play) da árvore e dos eventos — testar diversão antes de programar |
| 2. Narrativa e personagens | O Gerente, A Inércia, vozes regionais, tom do texto |
| 3. Mecânicas | Loop no papel, curva de dificuldade, Teoria do Fluxo aplicada |
| 4. Projetando | Escopo travado, cronograma, repo + CI + as regras de trabalho no lugar |
| 5. Primeiros cenários | Mapa SVG/canvas com 8 regiões, HUD, identidade visual |
| 6. Primeiras mecânicas | Engine com tick, clima e árvore funcionando de ponta a ponta |
| 7. Desenvolvimento | Eventos, Inércia, áudio, telas de fim de jogo |
| 8. Testes e finalização | Playtests (vira a **APS 2**), balanceamento, build da feira |

**Regra do protótipo de papel:** se a mecânica não for interessante com papel e caneta, programar não vai salvar.

---

## 7. Entregas acadêmicas paralelas

- **APS 1 — Relatório técnico** sobre o jogo que inspirou o projeto (*Plague Inc*): mecânica de propagação, moeda de evolução (DNA), árvore de upgrades, curva de dificuldade, e **como cada um desses elementos foi invertido aqui**. Diagramado, com logo do UniSENAI. Entrega na Avaliação Parcial, via AVA.
- **APS 2 — Vídeo de 1 a 3 min** com alguém de fora da equipe jogando o protótipo, com opiniões positivas e negativas. Sai naturalmente do playtest da Parte 8. Entrega na data da apresentação, via AVA.
- **Feira de Jogos Digitais** — build offline, modo demo de 5 min, cartaz com o ODS 13 e QR code para jogar.

---

## 8. Decisões pendentes (resolver com a equipe antes da Parte 4)

- [ ] Nome definitivo do jogo
- [ ] Formar o grupo e distribuir os 3 pacotes delegáveis (Design, Música, História) — ver `PLANO.md`
- [ ] Direção de arte (pixel art? flat vetorial? mapa estilizado?)
- [ ] Trilha e efeitos sonoros (fonte CC0)
- [ ] Confirmar stack com o professor
