import { describe, expect, it } from 'vitest';
import {
  compareEntries,
  mergeRanking,
  rankingEntryFor,
  type RankingEntry,
} from '../src/engine/ranking';
import {
  balance,
  createInitialState,
  REGION_IDS,
  type GameState,
  type Region,
  type RegionId,
} from '../src/engine/state';
import { TOTAL_TICKS } from '../src/engine/tick';

/**
 * O ranking local do docs/GDD.md §2.9 (RANK-01).
 *
 * `rankingEntryFor` roda sobre estados de verdade, como o outcome.test.ts; o
 * comparador e o `mergeRanking` rodam sobre `RankingEntry` construídas à mão,
 * porque a régua deles não depende de nenhum outro campo do GameState.
 */

const start = (): GameState => createInitialState(2025);

/** Um estado com todas as regiões no mesmo apoio — do outcome.test.ts. */
function withSupport(state: GameState, support: number): GameState {
  const regions: Partial<Record<RegionId, Region>> = {};
  for (const id of REGION_IDS) regions[id] = { ...state.regions[id], support };
  return { ...state, regions: regions as Record<RegionId, Region> };
}

/** Uma entrada pronta, só com o que o teste precisa variar. */
function entry(partial: Partial<RankingEntry>): RankingEntry {
  return {
    outcome: { kind: 'finished', ending: 'horizon', medal: 'bronze' },
    temperature: 2.4,
    year: 2100,
    character: null,
    ...partial,
  };
}

describe('rankingEntryFor', () => {
  it('uma partida em curso não rende entrada', () => {
    expect(rankingEntryFor(start())).toBeNull();
  });

  it('uma partida que termina rende o desfecho, a temperatura, o ano e o personagem', () => {
    const state: GameState = {
      ...start(),
      tick: TOTAL_TICKS,
      year: 2100,
      temperature: 2.4,
      character: 'juliana-almeida',
    };

    expect(rankingEntryFor(state)).toEqual({
      outcome: { kind: 'finished', ending: 'horizon', medal: 'bronze' },
      temperature: 2.4,
      year: 2100,
      character: 'juliana-almeida',
    });
  });

  it('uma derrota rende o motivo junto, para a UI escolher a frase', () => {
    const state = withSupport({ ...start(), year: 2058 }, 0);

    expect(rankingEntryFor(state)).toMatchObject({
      outcome: { kind: 'defeat', cause: 'support' },
      year: 2058,
    });
  });
});

describe('compareEntries', () => {
  it('quem terminou vem antes de quem foi derrotado, mesmo mais quente', () => {
    const finished = entry({
      outcome: { kind: 'finished', ending: 'horizon', medal: null },
      temperature: 2.9,
    });
    const defeated = entry({ outcome: { kind: 'defeat', cause: 'temperature' }, temperature: 1.6 });

    expect(compareEntries(finished, defeated)).toBeLessThan(0);
    expect(compareEntries(defeated, finished)).toBeGreaterThan(0);
  });

  it('dentro do mesmo grupo, a temperatura mais baixa vem primeiro', () => {
    const fria = entry({ temperature: 1.4 });
    const quente = entry({ temperature: 2.5 });

    expect(compareEntries(fria, quente)).toBeLessThan(0);
    expect(compareEntries(quente, fria)).toBeGreaterThan(0);
  });

  it('duas derrotas também se ordenam pela temperatura em que pararam', () => {
    const cedo = entry({ outcome: { kind: 'defeat', cause: 'support' }, temperature: 1.2 });
    const tarde = entry({ outcome: { kind: 'defeat', cause: 'temperature' }, temperature: 3.01 });

    expect(compareEntries(cedo, tarde)).toBeLessThan(0);
  });

  it('entradas empatadas (mesmo grupo, mesma temperatura) devolvem 0', () => {
    expect(compareEntries(entry({}), entry({}))).toBe(0);
  });
});

describe('mergeRanking', () => {
  it('entra numa lista que ainda não está cheia', () => {
    const stored = [entry({ temperature: 2.0 })];
    const nova = entry({ temperature: 2.5 });

    const result = mergeRanking(stored, nova, 10);

    expect(result).not.toBeNull();
    expect(result).toHaveLength(2);
    expect(result).toContain(nova);
  });

  it('desbanca a pior posição quando é estritamente melhor', () => {
    const stored = Array.from({ length: 10 }, (_, i) => entry({ temperature: 1.0 + i * 0.1 }));
    const nova = entry({ temperature: 0.5 });

    const result = mergeRanking(stored, nova, 10);

    expect(result).not.toBeNull();
    expect(result).toHaveLength(10);
    expect(result).toContain(nova);
    // A 10ª posição antiga (a mais quente) caiu da lista.
    expect(result).not.toContain(stored[9]);
  });

  it('não entra quando a lista está cheia e a partida é pior que a última', () => {
    const stored = Array.from({ length: 10 }, (_, i) => entry({ temperature: 1.0 + i * 0.1 }));
    const nova = entry({ temperature: 3.0 });

    expect(mergeRanking(stored, nova, 10)).toBeNull();
  });

  it('empatar com a última posição de uma lista cheia não desbanca ninguém', () => {
    // A entrada nova entra no fim antes de ordenar (compareEntries.test acima
    // cobre o 0 do empate); o sort estável a mantém depois de quem já estava
    // lá, e ela cai fora do corte — é a régua do §2.9: para tirar alguém do
    // ranking, é preciso ser melhor, não só igual.
    const stored = Array.from({ length: 10 }, (_, i) => entry({ temperature: 1.0 + i * 0.1 }));
    const nova = entry({ temperature: stored[9]!.temperature });

    expect(mergeRanking(stored, nova, 10)).toBeNull();
  });

  it('usa balance.rankingSize quando nenhum limite é passado', () => {
    const stored = Array.from({ length: balance.rankingSize }, (_, i) =>
      entry({ temperature: 1.0 + i * 0.1 }),
    );
    const pior = entry({ temperature: 99 });
    const melhor = entry({ temperature: 0.1 });

    expect(mergeRanking(stored, pior)).toBeNull();
    expect(mergeRanking(stored, melhor)).not.toBeNull();
  });
});
