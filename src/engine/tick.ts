// Avanço de tempo. 1 tick = 1 mês; a partida vai de 2025 a 2100.
// Função pura: recebe GameState, devolve GameState novo, nunca muta o recebido (§4).
// Implementado em P6-03; o relógio de tempo real veio em P6-04.
//
// Este é o orquestrador do loop do docs/GDD.md §2.1. Hoje ele avança o clima e
// desgasta o apoio público. Conforme os outros módulos chegarem, é aqui que
// entram: eventos (P7-01), A Inércia (P7-03) e o efeito das habilidades (P6-05).
//
// Duas metades, e a divisão importa:
//   1. `advanceTick` — o passo fixo. Um mês acontece, sempre igual.
//   2. `advanceRealTime` — quantos passos o relógio de parede pede. Nenhuma das
//      duas conhece `requestAnimationFrame`: quem mede o tempo do quadro é a UI,
//      que passa o resultado para cá. O engine não sabe que existe uma tela (§3).

import { advanceClimate } from './climate';
import { balance, REGION_IDS, type GameState, type Region, type RegionId } from './state';

/** Ticks de uma partida inteira: 75 anos × 12 meses. */
export const TOTAL_TICKS = (balance.endYear - balance.startYear) * balance.ticksPerYear;

/** PAC que entra por mês, derivado da entrada anual. */
const POINTS_PER_TICK = balance.basePointsPerYear / balance.ticksPerYear;

/**
 * Apoio que cada região perde por mês, derivado da perda anual.
 *
 * Divisão simples, e não a raiz de ordem 12 que o climate.ts usa: aquele
 * crescimento é multiplicativo, este desgaste é aditivo. Doze parcelas de
 * `taxa / 12` somam exatamente a taxa anual, sem resto para acumular.
 */
const SUPPORT_DECAY_PER_TICK = balance.supportDecayPerYear / balance.ticksPerYear;

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

// ---------------------------------------------------------- apoio público ---

/**
 * O apoio de uma região depois de um mês de desgaste.
 *
 * Cai `supportDecayPerYear` ao ano e **para no piso de apatia**. O piso não é
 * detalhe: sem ele, os 50 pontos iniciais chegariam a zero no tick 400 — ano de
 * 2058 — e como o docs/GDD.md §2.7 dá derrota por apoio médio zero, toda partida
 * se perderia ali, fizesse o jogador o que fizesse.
 *
 * Quem já está no piso ou abaixo dele não se move. As duas metades importam: o
 * desgaste do tempo não empurra mais para baixo, e **também não puxa de volta
 * para cima** — uma região derrubada a 10 por um evento (P7-01) continua em 10.
 * Furar o piso é trabalho de evento e da Inércia (P7-03), que agem por cima
 * deste desgaste; recuperar é do ramo Sociedade (§2.4).
 */
function decayedSupport(support: number): number {
  if (support <= balance.supportFloor) {
    return support;
  }

  return Math.max(balance.supportFloor, support - SUPPORT_DECAY_PER_TICK);
}

/** Aplica um mês de desgaste ao apoio das 8 regiões. */
function decaySupport(regions: GameState['regions']): GameState['regions'] {
  const decayed: Partial<Record<RegionId, Region>> = {};

  for (const id of REGION_IDS) {
    const region = regions[id];
    decayed[id] = { ...region, support: decayedSupport(region.support) };
  }

  return decayed as Record<RegionId, Region>;
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
  // O clima roda primeiro porque é ele que faz as regiões crescerem em emissão;
  // o desgaste do apoio entra em cima do mapa que sai de lá, e não no lugar dele.
  const afterClimate = advanceClimate(state);

  return {
    ...afterClimate,
    tick: nextTick,
    year: yearForTick(nextTick),
    actionPoints: state.actionPoints + POINTS_PER_TICK,
    regions: decaySupport(afterClimate.regions),
  };
}

// ------------------------------------------------- relógio de tempo real ---

/** Tempo real de um mês de jogo na velocidade 1x, em milissegundos. */
const MS_PER_TICK = balance.realSecondsPerTick * 1000;

/**
 * Teto de passos por chamada.
 *
 * Existe contra a "espiral da morte": se a aba ficar em segundo plano por dez
 * minutos, o navegador entrega um quadro com 600 000 ms de uma vez. Sem teto,
 * a simulação tentaria rodar 400 ticks num quadro, travaria a página, e o
 * quadro seguinte viria ainda mais atrasado.
 *
 * Doze passos é um ano de jogo — o bastante para absorver um engasgo real sem
 * a partida dar um salto que o jogador não entende.
 */
const MAX_STEPS_PER_CALL = 12;

/**
 * O tempo real que já passou mas ainda não completou um mês de jogo.
 *
 * É este resto que faz a simulação andar igual em qualquer taxa de quadros: o
 * que sobra de um quadro entra no próximo em vez de ser descartado.
 */
export type Clock = {
  readonly leftoverMs: number;
};

export function createClock(): Clock {
  return { leftoverMs: 0 };
}

/**
 * Quantos passos de simulação o tempo decorrido pede, e quanto sobra.
 *
 * `speed` é o multiplicador de velocidade da UI (1x, 2x, 4x — tarefa P5-05).
 * Pausa não é tratada aqui: quem está em pausa simplesmente não chama.
 */
export function stepsForElapsed(
  clock: Clock,
  elapsedMs: number,
  speed = 1,
): { readonly steps: number; readonly clock: Clock } {
  const accumulated = clock.leftoverMs + elapsedMs * speed;
  const wanted = Math.floor(accumulated / MS_PER_TICK);

  if (wanted > MAX_STEPS_PER_CALL) {
    // Descarta o atraso em vez de tentar recuperá-lo. A partida fica atrasada
    // em relação ao relógio de parede, e é o comportamento certo: voltar para
    // a aba não deve adiantar vinte anos de jogo.
    return { steps: MAX_STEPS_PER_CALL, clock: { leftoverMs: 0 } };
  }

  return { steps: wanted, clock: { leftoverMs: accumulated - wanted * MS_PER_TICK } };
}

/**
 * Avança a partida pelo tempo real decorrido desde o quadro anterior.
 *
 * É o que a UI chama a cada quadro, passando o delta que ela mediu. O resultado
 * não depende da taxa de quadros: 30 e 144 FPS produzem a mesma partida, porque
 * o que manda é o tempo acumulado, não o número de chamadas.
 */
export function advanceRealTime(
  state: GameState,
  clock: Clock,
  elapsedMs: number,
  speed = 1,
): { readonly state: GameState; readonly clock: Clock } {
  const { steps, clock: nextClock } = stepsForElapsed(clock, elapsedMs, speed);

  let next = state;
  for (let i = 0; i < steps; i++) {
    next = advanceTick(next);
  }

  return { state: next, clock: nextClock };
}
