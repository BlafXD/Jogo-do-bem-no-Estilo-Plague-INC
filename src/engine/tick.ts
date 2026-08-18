// Avanço de tempo. 1 tick = 1 mês; a partida vai de 2025 a 2100.
// Função pura: recebe GameState, devolve GameState novo, nunca muta o recebido (§4).
// Implementado em P6-03.
//
// Este é o orquestrador do loop do docs/GDD.md §2.1. Hoje ele chama só o clima,
// porque é o único módulo que existe. Conforme os outros chegarem, é aqui que
// entram: eventos (P7-01), A Inércia (P7-03) e o efeito das habilidades (P6-05).

import { advanceClimate } from './climate';
import { balance, type GameState } from './state';

/** Ticks de uma partida inteira: 75 anos × 12 meses. */
export const TOTAL_TICKS = (balance.endYear - balance.startYear) * balance.ticksPerYear;

/** PAC que entra por mês, derivado da entrada anual. */
const POINTS_PER_TICK = balance.basePointsPerYear / balance.ticksPerYear;

/**
 * O ano em que um tick acontece. O tick 0 é o primeiro mês de `startYear`, e o
 * tick `TOTAL_TICKS` cai exatamente em `endYear` — o instante em que a partida
 * acaba, não um mês a ser jogado.
 */
export function yearForTick(tick: number): number {
  return balance.startYear + Math.floor(tick / balance.ticksPerYear);
}

/** A partida chegou ao fim do horizonte de simulação. */
export function isOver(state: GameState): boolean {
  return state.tick >= TOTAL_TICKS;
}

/**
 * Avança a partida em um mês.
 *
 * Depois do fim do horizonte, devolve o estado recebido sem tocar em nada. Não
 * é preciosismo: o relógio de tempo real do P6-04 entrega vários ticks de uma
 * vez quando um quadro demora, e sem essa trava um engasgo de meio segundo
 * empurraria a partida para além de 2100.
 */
export function advanceTick(state: GameState): GameState {
  if (isOver(state)) {
    return state;
  }

  const nextTick = state.tick + 1;

  return {
    ...advanceClimate(state),
    tick: nextTick,
    year: yearForTick(nextTick),
    actionPoints: state.actionPoints + POINTS_PER_TICK,
  };
}
