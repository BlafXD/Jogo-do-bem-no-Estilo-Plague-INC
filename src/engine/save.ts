// O formato do save (P6-07).
//
// Este arquivo é puro: ele não sabe que `localStorage` existe. Quem encosta no
// navegador é o src/ui/storage.ts. A separação é a mesma ideia do hud.ts —
// tudo onde cabe bug (versão, validação, campos derivados) fica de um lado só,
// e esse lado roda em node.
//
// **Um save recusado nunca derruba o jogo.** É a diferença entre este arquivo e
// o `parseRegions`/`parseSkills` do state.ts, que lançam: aqueles leem um
// arquivo do repositório, e um erro ali é bug de quem editou, que precisa
// aparecer alto. Aqui a entrada vem do navegador do jogador — pode estar velha,
// pode ter sido editada à mão, pode ser de outra versão do jogo. Recusar e
// começar uma partida nova é a única saída que não deixa alguém com um jogo
// permanentemente quebrado e sem botão para consertar.
//
// **O save guarda o GameState inteiro, mas nem tudo nele é confiado de volta.**
// `year` sai de `tick` e `temperature` sai de `cumulativeCO2` — os dois são
// derivados, e recalcular na carga elimina a chance de um save trazer um par
// que não combina. O que não dá para derivar (o `rngState`, entre outros) é
// lido como está: o docs/GDD.md §3 registra que sem ele a sequência de sorteios
// recomeçaria do zero a cada carga, e a partida deixaria de ser reprodutível
// justamente onde isso importa.

import { bubbleValue } from './bubbles';
import { temperatureFor } from './climate';
import { CARD_TICKS } from './events';
import { skillById } from './skills';
import {
  balance,
  isCharacterId,
  parseRegions,
  REGION_IDS,
  type ActiveEvent,
  type Bubble,
  type GameState,
  type RawRegion,
  type SkillId,
  type Snapshot,
} from './state';
import { yearForTick } from './tick';

/**
 * Versão do formato. **Suba este número sempre que o formato do `GameState` ou
 * os ids do `skills.json` mudarem** — um save da versão anterior é recusado, e
 * o jogador começa de novo em vez de jogar uma partida meio remendada.
 *
 * **2 (P7-06):** o `history` deixou de nascer e morrer vazio. O campo já
 * existia na versão 1, então um save antigo passaria por toda a validação — e
 * essa é justamente a partida meio remendada que a regra acima descreve: ela
 * chegaria na tela final com um gráfico que começa no ano em que o save foi
 * carregado, sem nada antes, e sem nenhum sinal de que falta metade. O registro
 * de uma partida não dá para reconstruir depois: ele depende de quando cada
 * habilidade foi comprada, de quais eventos caíram e do que a Inércia fez.
 *
 * **3 (REF-04):** o GameState ganhou o campo `character` — o personagem que o
 * jogador escolheu. Um save da versão 2 não o tem, e uma partida sem personagem
 * é a "meio remendada" da regra acima: daqui a poucas tarefas (REF-05) o
 * personagem passa a dar bônus, e um save sem ele não saberia qual aplicar.
 *
 * **4 (INTER-02 e INTER-03):** duas mudanças de formato na mesma passagem, de
 * propósito — subir a versão custa a partida em andamento de quem joga, e fazer
 * isso duas vezes no mesmo dia custaria duas. Cada `ActiveEvent` ganhou o
 * `toll`, o que o evento de fato cobrou (a dívida que o `docs/GDD.md §2.5`
 * registrou em nome do `P7-04`), e o `GameState` ganhou o `bubbles`, as bolhas
 * de PAC ainda na mesa. **Um save da versão 3 não tem como ser remendado aqui:**
 * o pedágio depende da resiliência que a região tinha no instante da pancada, e
 * esse instante já passou. Autorizado no chat em 2026-10-28.
 */
export const SAVE_VERSION = 4;

export type SaveEnvelope = {
  readonly version: number;
  readonly state: GameState;
};

/** Por que um save não pôde ser carregado. Vira aviso no console, não texto de tela. */
export type SaveRefusal =
  | 'noSave'
  | 'unreadable'
  | 'wrongVersion'
  | 'wrongShape'
  | 'badNumber'
  | 'badCharacter'
  | 'badRegions'
  | 'badSkills'
  | 'badEvents'
  | 'badBubbles'
  | 'badHistory';

export type LoadResult =
  | { readonly ok: true; readonly state: GameState }
  | { readonly ok: false; readonly reason: SaveRefusal };

/** Os campos numéricos que o save carrega e que precisam voltar finitos. */
const SAVED_NUMBERS = [
  'tick',
  'actionPoints',
  'cumulativeCO2',
  'inertia',
  'seed',
  'rngState',
] as const;

export function toSave(state: GameState): SaveEnvelope {
  return { version: SAVE_VERSION, state };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

/**
 * Os ids de habilidade de um save só valem se ainda existirem na árvore.
 *
 * Recusa em vez de filtrar, e a escolha tem consequência: se o pacote
 * `[D-Historia]` renomear um nó, quem tinha partida em andamento recomeça.
 * Filtrar seria pior — o jogador continuaria com o PAC já gasto e sem a
 * habilidade que comprou, sem nunca saber que perdeu alguma coisa. O jeito de
 * não chegar nesse ponto é subir o `SAVE_VERSION` junto com a mudança; esta
 * checagem é a rede para quando alguém esquecer.
 */
function readSkills(value: unknown): readonly SkillId[] | null {
  if (!Array.isArray(value)) return null;

  const seen = new Set<string>();

  for (const id of value) {
    if (typeof id !== 'string' || skillById(id) === undefined || seen.has(id)) return null;
    seen.add(id);
  }

  return value as readonly SkillId[];
}

/** Os três campos do pedágio de um evento (`EventToll`, docs/GDD.md §3). */
const TOLL_FIELDS = ['support', 'economy', 'points'] as const;

/**
 * Os cartões de evento em cena, conferidos um por um — **a dívida que o P7-01
 * deixou aqui, paga no INTER-02.**
 *
 * Até a versão 3 deste arquivo só se conferia que `activeEvents` era uma lista,
 * e o comentário no lugar desta função explicava por que isso bastava: um cartão
 * é vitrine, e um id inventado sai da tela no mês seguinte sem levar nada junto.
 * **O `toll` muda a conta.** Ele é um número que a tela escreve como fato — "este
 * evento cobrou 3,2 de apoio" —, e um save editado à mão passaria a mentir com a
 * autoridade do jogo. Conferir é mais barato que confiar.
 *
 * **O `eventId` continua sem ser cobrado contra o catálogo**, e isso é escolha:
 * quem renomear um evento no `events.json` não deve apagar a partida de ninguém,
 * e o `cardFor` do event-cards.ts já devolve `null` para um id que não existe
 * mais — o cartão desaparece, o resto da partida segue. É o oposto do
 * `readSkills`, e a diferença é o que se perde: um nó comprado é PAC gasto, um
 * cartão em cena é uma notícia de seis meses atrás.
 */
function readActiveEvents(value: unknown): readonly ActiveEvent[] | null {
  if (!Array.isArray(value)) return null;

  for (const entry of value) {
    if (!isRecord(entry)) return null;
    if (typeof entry.eventId !== 'string') return null;
    if (typeof entry.target !== 'string') return null;
    if (!(REGION_IDS as readonly string[]).includes(entry.target)) return null;

    // Fora da faixa, a idade deduzida pelo `startTickOf` sairia errada: um
    // `ticksRemaining` maior que a janela daria um cartão que entrou no futuro.
    const remaining = entry.ticksRemaining;
    if (!isFiniteNumber(remaining) || remaining <= 0 || remaining > CARD_TICKS) return null;

    if (!isRecord(entry.toll)) return null;
    for (const field of TOLL_FIELDS) {
      const paid = entry.toll[field];
      if (!isFiniteNumber(paid) || paid < 0) return null;
    }
  }

  return value as readonly ActiveEvent[];
}

/**
 * As bolhas de PAC na mesa (INTER-03), conferidas uma por uma.
 *
 * Mesma régua do `readActiveEvents`, e aqui ela aperta mais: o `value` de uma
 * bolha **vira PAC** no clique seguinte, então um save editado à mão compraria a
 * árvore inteira com uma bolha de um milhão. O teto é o valor de uma bolha nesta
 * partida com alguma folga — não o valor exato, porque a bolha guarda o que
 * valia quando nasceu e a renda do jogador cresce durante a partida.
 */
function readBubbles(value: unknown, points: number): readonly Bubble[] | null {
  if (!Array.isArray(value)) return null;

  for (const entry of value) {
    if (!isRecord(entry)) return null;
    if (typeof entry.target !== 'string') return null;
    if (!(REGION_IDS as readonly string[]).includes(entry.target)) return null;
    if (!isFiniteNumber(entry.value) || entry.value < 0 || entry.value > points) return null;

    const remaining = entry.ticksRemaining;
    if (!isFiniteNumber(remaining) || remaining <= 0 || remaining > balance.bubbleTicks) {
      return null;
    }
  }

  return value as readonly Bubble[];
}

/** Os números de um `Snapshot` (docs/GDD.md §3). Todos obrigatórios, todos finitos. */
const SNAPSHOT_NUMBERS = [
  'tick',
  'year',
  'temperature',
  'emissions',
  'cumulativeCO2',
  'averageSupport',
] as const;

/**
 * A linha do tempo de um save, conferida retrato a retrato.
 *
 * Vale a pena conferir mais do que a forma aqui: **os ticks precisam crescer**.
 * Um gráfico é a única parte da tela que lê a *ordem* da lista, e não só o
 * conteúdo dela — uma linha do tempo embaralhada não quebraria nada, viraria um
 * ziguezague desenhado com toda a confiança. É a mesma razão do `readSkills`
 * logo acima: recusar em vez de remendar, porque o remendo é o que o jogador
 * nunca fica sabendo.
 */
function readHistory(value: unknown): readonly Snapshot[] | null {
  if (!Array.isArray(value)) return null;

  let previousTick = -1;

  for (const entry of value) {
    if (!isRecord(entry)) return null;

    for (const field of SNAPSHOT_NUMBERS) {
      if (!isFiniteNumber(entry[field])) return null;
    }

    const tick = entry.tick as number;
    if (tick <= previousTick) return null;
    previousTick = tick;
  }

  return value as readonly Snapshot[];
}

/**
 * Reconstrói uma partida a partir do que estava guardado.
 *
 * A ordem das recusas segue a ordem em que elas interessam a quem lê o aviso no
 * console: primeiro se é um save, depois se é desta versão, e só então se o
 * conteúdo fecha.
 */
export function fromSave(raw: unknown): LoadResult {
  if (!isRecord(raw)) return { ok: false, reason: 'wrongShape' };
  if (raw.version !== SAVE_VERSION) return { ok: false, reason: 'wrongVersion' };

  const saved = raw.state;
  if (!isRecord(saved)) return { ok: false, reason: 'wrongShape' };

  for (const field of SAVED_NUMBERS) {
    if (!isFiniteNumber(saved[field])) return { ok: false, reason: 'badNumber' };
  }

  // O personagem tem de ser `null` (baseline, sem especialista) ou um dos
  // jogáveis. Um save da versão 2 nem chega aqui (foi recusado pela versão
  // acima); esta checagem cobre um save v3 adulterado ou de um dia em que a
  // lista de personagens mudar sem o SAVE_VERSION subir.
  if (saved.character !== null && !isCharacterId(saved.character)) {
    return { ok: false, reason: 'badCharacter' };
  }

  if (!isRecord(saved.regions)) return { ok: false, reason: 'badRegions' };

  let regions: GameState['regions'];
  try {
    // Reaproveita a validação que já existe: o parseRegions cobra os 8 ids e as
    // faixas de 0 a 100. Ele fala em "regions.json" na mensagem porque foi
    // escrito para o arquivo do repositório; aqui a mensagem é engolida e vira
    // uma recusa, então o texto dela não chega a lugar nenhum.
    regions = parseRegions(Object.values(saved.regions) as readonly RawRegion[]);
  } catch {
    return { ok: false, reason: 'badRegions' };
  }

  const unlockedSkills = readSkills(saved.unlockedSkills);
  if (unlockedSkills === null) return { ok: false, reason: 'badSkills' };

  const activeEvents = readActiveEvents(saved.activeEvents);
  if (activeEvents === null) return { ok: false, reason: 'badEvents' };

  const history = readHistory(saved.history);
  if (history === null) return { ok: false, reason: 'badHistory' };

  const tick = saved.tick as number;
  const cumulativeCO2 = saved.cumulativeCO2 as number;

  const restored: GameState = {
    tick,
    // Derivados: recalculados, nunca lidos do save. Um arquivo adulterado não
    // consegue entregar um ano que não combina com o tick, nem uma
    // temperatura que não combina com o CO₂ acumulado.
    year: yearForTick(tick),
    temperature: temperatureFor(cumulativeCO2),
    cumulativeCO2,
    // Narrowed pelo isCharacterId acima — é um CharacterId, não um string solto.
    character: saved.character,
    actionPoints: saved.actionPoints as number,
    inertia: saved.inertia as number,
    seed: saved.seed as number,
    rngState: saved.rngState as number,
    regions,
    unlockedSkills,
    activeEvents,
    bubbles: [],
    history,
  };

  // As bolhas são conferidas **depois** do estado montado, porque o teto do
  // valor de uma delas depende da partida: `bubbleValue` lê os nós de PAC/ano
  // comprados e o bônus do personagem. Uma bolha legítima nunca vale mais do que
  // isso — a renda do jogador só cresce ao longo da partida, nunca encolhe —,
  // então o teto barra o save adulterado sem recusar nenhuma bolha de verdade.
  const bubbles = readBubbles(saved.bubbles, bubbleValue(restored));
  if (bubbles === null) return { ok: false, reason: 'badBubbles' };

  return { ok: true, state: { ...restored, bubbles } };
}
