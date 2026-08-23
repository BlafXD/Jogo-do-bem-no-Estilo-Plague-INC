# GDD — "Ponto de Virada" (codinome provisório)

> **Documento de Design do Jogo.** Descreve *o que o jogo é* e *como ele se comporta*.
> É a fonte da verdade do design: se o código discordar deste arquivo, o código está errado.
>
> | Arquivo | Para quê |
> |---|---|
> | `docs/GDD.md` (este) | O jogo: mecânicas, dados, balanceamento, escopo |
> | `FORMA-DE-TRABALHO.md` | Como se trabalha neste repositório: stack, convenções, git |
> | `PLANO.md` | Backlog por aula, com checkboxes |
> | `PROGRESSO.md` | Diário datado — evidência de evolução |

<details>
<summary>Equivalência com a numeração antiga do <code>CLAUDE.md</code></summary>

Até 2026-08-07 o projeto tinha um único arquivo de regras, o `CLAUDE.md`, que acumulava duas coisas: o design do jogo e as regras de trabalho. Ele foi dividido em dois, **sem alteração de conteúdo** — só mudou de arquivo e de número de seção.

O design veio para cá:

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

As regras de trabalho foram para `FORMA-DE-TRABALHO.md`, que **manteve a numeração original** das seções (§1 a §5, §11, §12), de propósito: existem referências a `§3`, `§4.1` e `§5` espalhadas por `PLANO.md`, `.gitignore`, `tsconfig.json` e comentários de código. Preservar os números custa uma lacuna estética e economiza uma caça a referências quebradas.

O `CLAUDE.md` continua na raiz como um ponteiro de poucas linhas para estes dois arquivos — é o nome que a ferramenta de agente carrega sozinha no início de cada sessão.

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

Sorteados por tick, com peso crescente conforme a temperatura. Cada um tem um limiar: ressaca costeira e elevação do mar só entram acima de certo aquecimento — **o jogador precisa sentir que o mundo piora porque ele demorou.**

Tipos: onda de calor, seca, enchente, tempestade/ciclone, incêndio florestal, deslizamento/desabamento, **ressaca e maré de tempestade** sobre um mar mais alto, colapso de safra.

> **Nota de honestidade científica — decidido no `P3-06`, em 2026-08-20: o tsunami saiu.** Ele estava no conceito original, mas tsunami é geológico: o aquecimento não causa nenhum. Manter o nome exigiria colar uma ressalva no evento, e a ressalva gastaria a frase educativa explicando o que ele **não** é. Em vez disso o evento virou **ressaca e maré de tempestade sobre um mar mais alto** — mesma imagem, a costa engolida pela água, e inteiramente climático. Não sobra licença a assumir. O motivo completo está em `docs/CIENCIA.md`. **Não venda desinformação como educação.**

Cada evento carrega uma frase educativa curta ligada a um fenômeno real.

### 2.6 O antagonista — "A Inércia"

Não é um vilão de bigode. É a **força que resiste à mudança**: lobby fóssil, desinformação, subsídios, prioridade de curto prazo.

**Ela é um espelho das decisões do jogador, não um dado aleatório.** Cresce um pouco sozinha — o lobby existe de qualquer jeito — e cresce muito mais quanto mais o jogador já cortou, porque é exatamente aí que a transição ameaça quem vive do combustível fóssil. Apoio público acima do piso de apatia a segura.

Age a cada ~6 ticks, com intensidade proporcional ao nível que acumulou:

| Ação | Efeito |
|---|---|
| **Desinformação** | derruba o apoio das regiões, **furando o piso de apatia** |
| **Subsídios** | empurra a emissão das regiões para cima |
| **Recuos regulatórios** | encarecem as habilidades ainda não compradas |

**O estrago é permanente.** Nada do que ela faz se desfaz sozinho: a emissão segue a partir do valor novo, e o apoio derrubado não volta com o tempo. É essa permanência que dá peso à segunda metade da partida.

**O contra-ataque tem duas metades.** O ramo Sociedade é a primeira, como sempre foi. A segunda é a **contenção**: em vez de comprar um nó no mês, o jogador pode gastar PAC para empurrar a Inércia para baixo — e **isso só fica disponível depois de comprar `climate-education`**, ficando mais barato a cada nó de Sociedade que ele tiver.

> **Por que a contenção existe** (decidido em 2026-08-20, no `P3-05`). Sem ela, o ramo Sociedade era uma armadilha medida: rendia PAC, comprava mais nós, e a partida terminava mais quente — a jogada ótima simplesmente o ignorava. Condicionar a contenção a ele inverte a conta: o ramo deixa de ser um bônus que não se paga e passa a ser a **licença para lutar**. O dilema que sai daí é o ponto: a partida que mais corta emissão não é a que sobrevive, porque quem pula Sociedade termina mais frio e é dissolvido por falta de apoio antes de 2100.
>
> A especificação completa, com os números verificados contra o engine, está em `docs/INERCIA.md`. Quem implementa é o `P7-03`.

### 2.7 Vitória e derrota

A partida acaba de três jeitos, e **a ordem em que as perguntas são feitas faz parte da regra**:

1. **Derrota** — temperatura `> 3,0 °C`, **ou** apoio público médio global `≤ 0` (a agência é dissolvida). Vem primeiro, sempre: uma agência dissolvida não recebe medalha por ter zerado as emissões no mesmo mês em que o apoio acabou.
2. **Vitória por zero líquido** — emissões líquidas globais `≤ 0,5 GtCO₂/ano` antes de 2100.
3. **Fim do horizonte** — 2100 chegou com o mundo ainda emitindo e abaixo do limiar de derrota. **Chegar vivo a 2100 também vale a escala de medalhas.**

**Nos dois desfechos a medalha sai da temperatura em que a partida parou:**

| Temperatura final | Resultado |
|---|---|
| `< 1,5 °C` | Ouro |
| `< 2,0 °C` | Prata |
| `< 2,5 °C` | Bronze |
| `≥ 2,5 °C` | sobrevivência, sem medalha |

> **Por que chegar a 2100 vale medalha** — decisão de 2026-08-19, no `P6-08`. O zero líquido é
> hoje **inalcançável**: a árvore inteira soma 5,5% ao ano de corte contra 0,93% de crescimento da
> linha de base, e o jogo ótimo medido com o engine real termina em **13 Gt/ano**, vinte e seis
> vezes o limiar. Sem esta regra o jogo não teria vitória nenhuma. A escala por temperatura também
> é a que a mecânica já ensina sozinha: o TCRE faz da temperatura uma **catraca de mão única** — o
> CO₂ acumulado só cresce, e nenhuma compra faz a temperatura descer — o que transforma **quando**
> o jogador agiu na decisão que decide a partida. Os números e as alavancas de conserto estão em
> `docs/BALANCEAMENTO.md`.

**O desfecho é recalculado, nunca gravado.** Ele sai de temperatura, apoio, emissões e tick a cada
consulta, e não existe campo de "venceu" no `GameState` (`§3`). É o que impede um save adulterado
de entregar uma medalha que a partida dele não sustenta, e o que elimina o bug de "ganhei mas o
jogo não percebeu".

Tela final: gráfico da linha do tempo + "o que você poderia ter feito diferente" + 3 ações reais do mundo real. Curto. Sem sermão.

---

## 3. Contratos de dados

```ts
type RegionId = 'na' | 'la' | 'eu' | 'af' | 'me' | 'ea' | 'sa' | 'oc';

type Region = {
  id: RegionId;
  name: string;
  population: number;        // milhões
  emissions: number;         // GtCO₂/ano (fóssil + uso da terra)
  cleanShare: number;        // 0..1 da matriz elétrica
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
  seed: number;              // identidade da partida — nunca muda
  rngState: number;          // posição do gerador — anda a cada sorteio
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
**RNG:** `mulberry32(seed)` — mesma seed, mesma partida. Isso torna bugs reproduzíveis e o playtest confiável. A posição do gerador é guardada à parte, em `rngState`: sem ela, carregar um save recomeçaria a sequência de sorteios do zero, e a partida deixaria de ser reprodutível justamente onde isso importa.

---

## 4. Balanceamento inicial (`balance.json`)

Ponto de partida para ajustar com playtest, **não é sagrado**:

```jsonc
{
  "startYear": 2025,
  "endYear": 2100,
  "ticksPerYear": 12,
  "realSecondsPerTick": 1.5,       // segundos de tempo real por mês, a 1x
  "startTemperature": 1.37,        // °C acima do pré-industrial
  "startEmissions": 40.753,        // GtCO₂/ano global
  "tcre": 0.00045,                 // °C por GtCO₂ acumulado
  "baselineGrowthPerYear": 0.0093, // crescimento anual das emissões sem ação
  "basePointsPerYear": 10,
  "supportDecayPerYear": 1.5,      // pontos de apoio perdidos por ano, por região
  "supportFloor": 25,              // piso de apatia: o decaimento para aqui
  "inertiaGrowthPerYear": 2,
  "eventWeightPerDegree": 1.8,     // multiplicador de frequência por °C
  "criticalEventSupport": 2.5,     // impacto de apoio que torna o evento crítico
  "loseTemperature": 3.0
}
```

Fórmula da temperatura: `temperature = startTemperature + tcre * cumulativeCO2`.
Peso de um evento: `baseWeight * (1 + eventWeightPerDegree * max(0, T - tempThreshold))`.

Enquanto o jogador não age, as emissões de cada região crescem `baselineGrowthPerYear` ao ano.
É a linha de base do cenário **SSP3-7.0** do IPCC — o mundo sem política climática nova, em que
as emissões dobram até 2100. Fonte em `docs/CIENCIA.md`. **A Inércia age por cima dessa linha,
não no lugar dela.**

**Ritmo (`realSecondsPerTick`).** Um mês de jogo leva 1,5 segundo de tempo real na velocidade
1x. É o número que faz as duas metas de duração do `PLANO.md` caberem na mesma partida:
**22,5 min a 1x** (dentro da faixa de 20–30) e **5,6 min a 4x**, que é o Modo Feira — sem
precisar de um modo à parte com regras próprias.

**Apoio (`supportDecayPerYear` e `supportFloor`).** O apoio de cada região perde 1,5 ponto por
ano e **para no piso de apatia**; sozinho, o decaimento nunca desce abaixo dele. O piso existe
porque sem ele a constante decidiria toda partida: 50 pontos caindo 1,5 ao ano zeram em 2058, e
o §2.7 dá derrota por apoio médio zero — o jogador perderia em 2058 fizesse o que fizesse.
**Furar o piso para baixo é trabalho de evento (§2.5) e da Inércia (§2.6)**, que agem por cima
dele; o ramo Sociedade (§2.4) é o que empurra de volta para cima.

**Evento crítico (`criticalEventSupport`).** Um evento cujo `impact.support` alcança este valor
**pausa o relógio sozinho** e mostra o cartão com o fato real (`P7-02`). O eixo é o apoio, e não a
soma dos três impactos, porque é o único ligado a uma condição de fim: o §2.7 dissolve a agência
quando o apoio médio zera. Crítico quer dizer *ameaça encerrar a partida*, não "tem números
grandes". Com 2,5, os eventos que param o jogo são a ressaca e o colapso de safra — nenhum dos dois
alcançável abaixo de 2 °C, então **a primeira metade da partida nunca é interrompida.** A contagem
que escolheu o valor está em `docs/BALANCEAMENTO.md`.

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
