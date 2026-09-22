import { describe, expect, it } from 'vitest';

import { CARD_TICKS } from '../src/engine/events';
import { balance, createInitialState, type GameState } from '../src/engine/state';
import { crossedLevel, noticesInScene, updateNotices } from '../src/ui/inertia-notices';

/**
 * Quando a Inércia ganha um aviso no boletim (VIS-11, 2ª entrega). A regra
 * mora no src/ui/inertia-notices.ts; o cartão, no event-cards.ts.
 */

const NIVEIS = [25, 50, 75] as const;

function comInercia(inertia: number, tick: number): GameState {
  return { ...createInitialState(2025), inertia, tick };
}

describe('crossedLevel', () => {
  it('os níveis de verdade são os do balance.json', () => {
    expect(balance.inertiaNoticeLevels).toEqual(NIVEIS);
  });

  it('avisa quando a Inércia passa de um nível subindo', () => {
    expect(crossedLevel(49.9, 50.1)).toBe(50);
    expect(crossedLevel(24, 25)).toBe(25);
  });

  it('não avisa enquanto ela anda entre dois níveis', () => {
    expect(crossedLevel(26, 49)).toBeNull();
    expect(crossedLevel(0, 0)).toBeNull();
  });

  /** A contenção derruba a Inércia, e descer não é notícia. */
  it('não avisa quando ela desce', () => {
    expect(crossedLevel(60, 35)).toBeNull();
  });

  /** Ela já estava no nível: quem passou foi o mês anterior. */
  it('não avisa de novo quem já estava no nível', () => {
    expect(crossedLevel(50, 51)).toBeNull();
  });

  /**
   * Depois de um lote de meses — a aba que volta do segundo plano —, ela pode
   * ter passado de dois níveis de uma vez. Um aviso só, o do mais alto.
   */
  it('passando de dois níveis de uma vez, avisa só o mais alto', () => {
    expect(crossedLevel(20, 55)).toBe(50);
  });

  it('lê outros níveis, se o balance.json mudar', () => {
    expect(crossedLevel(9, 11, [10, 20])).toBe(10);
  });
});

describe('noticesInScene', () => {
  it('um aviso fica o mesmo tempo que um evento no boletim', () => {
    const aviso = { level: 50, tick: 100 };

    expect(noticesInScene([aviso], 100)).toEqual([aviso]);
    expect(noticesInScene([aviso], 100 + CARD_TICKS - 1)).toEqual([aviso]);
    expect(noticesInScene([aviso], 100 + CARD_TICKS)).toEqual([]);
  });

  /** Uma partida nova começa no mês 0; um aviso "do futuro" é de outra partida. */
  it('não mostra aviso de um mês que ainda não chegou', () => {
    expect(noticesInScene([{ level: 50, tick: 100 }], 99)).toEqual([]);
  });
});

describe('updateNotices', () => {
  it('guarda o aviso no mês em que a Inércia passou do nível', () => {
    const avisos = updateNotices([], comInercia(49, 300), comInercia(51, 301));

    expect(avisos).toEqual([{ level: 50, tick: 301 }]);
  });

  it('sem nível passado, a lista só perde os avisos vencidos', () => {
    const velho = { level: 25, tick: 10 };
    const recente = { level: 50, tick: 298 };

    expect(updateNotices([velho, recente], comInercia(55, 300), comInercia(56, 301))).toEqual([
      recente,
    ]);
  });

  /**
   * A contenção derruba a Inércia para baixo de 50, e ela volta a subir. É
   * notícia de novo: a força dela voltou ao patamar.
   */
  it('avisa de novo quando ela volta a passar do mesmo nível', () => {
    const primeiro = updateNotices([], comInercia(49, 200), comInercia(50, 201));
    const segundo = updateNotices(primeiro, comInercia(49, 203), comInercia(50, 204));

    expect(segundo).toEqual([
      { level: 50, tick: 201 },
      { level: 50, tick: 204 },
    ]);
  });
});
