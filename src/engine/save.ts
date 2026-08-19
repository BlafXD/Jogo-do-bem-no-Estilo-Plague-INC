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

import { temperatureFor } from './climate';
import { skillById } from './skills';
import { parseRegions, type GameState, type RawRegion, type SkillId } from './state';
import { yearForTick } from './tick';

/**
 * Versão do formato. **Suba este número sempre que o formato do `GameState` ou
 * os ids do `skills.json` mudarem** — um save da versão anterior é recusado, e
 * o jogador começa de novo em vez de jogar uma partida meio remendada.
 */
export const SAVE_VERSION = 1;

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
  | 'badRegions'
  | 'badSkills';

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

  // `activeEvents` e `history` ainda nascem vazios em toda partida — quem os
  // preenche é o P7-01 e o P7-06. Enquanto for assim, conferir que são listas é
  // tudo que dá para conferir de honesto; validar o conteúdo delas seria
  // inventar um formato que ainda não existe.
  if (!Array.isArray(saved.activeEvents) || !Array.isArray(saved.history)) {
    return { ok: false, reason: 'wrongShape' };
  }

  const tick = saved.tick as number;
  const cumulativeCO2 = saved.cumulativeCO2 as number;

  return {
    ok: true,
    state: {
      tick,
      // Derivados: recalculados, nunca lidos do save. Um arquivo adulterado não
      // consegue entregar um ano que não combina com o tick, nem uma
      // temperatura que não combina com o CO₂ acumulado.
      year: yearForTick(tick),
      temperature: temperatureFor(cumulativeCO2),
      cumulativeCO2,
      actionPoints: saved.actionPoints as number,
      inertia: saved.inertia as number,
      seed: saved.seed as number,
      rngState: saved.rngState as number,
      regions,
      unlockedSkills,
      activeEvents: saved.activeEvents as GameState['activeEvents'],
      history: saved.history as GameState['history'],
    },
  };
}
