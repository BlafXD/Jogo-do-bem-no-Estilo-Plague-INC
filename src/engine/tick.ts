// Avanço de tempo. 1 tick = 1 mês; a partida vai de 2025 a 2100.
// Função pura: recebe GameState, devolve GameState novo, nunca muta o recebido (§4).
// Implementado em P6-03; o relógio de tempo real veio em P6-04.
//
// Este é o orquestrador do loop do docs/GDD.md §2.1. Hoje ele avança o clima,
// desgasta o apoio público, acumula PAC à taxa que a árvore de habilidades
// determina e sorteia os eventos do §2.5. Falta A Inércia (P7-03).
//
// Duas metades, e a divisão importa:
//   1. `advanceTick` — o passo fixo. Um mês acontece, sempre igual.
//   2. `advanceRealTime` — quantos passos o relógio de parede pede. Nenhuma das
//      duas conhece `requestAnimationFrame`: quem mede o tempo do quadro é a UI,
//      que passa o resultado para cá. O engine não sabe que existe uma tela (§3).

import { advanceClimate } from './climate';
import { advanceEvents } from './events';
import { pointsPerYear } from './skills';
import { balance, REGION_IDS, type GameState, type Region, type RegionId } from './state';

/** Ticks de uma partida inteira: 75 anos × 12 meses. */
export const TOTAL_TICKS = (balance.endYear - balance.startYear) * balance.ticksPerYear;

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

  const afterTime: GameState = {
    ...afterClimate,
    tick: nextTick,
    year: yearForTick(nextTick),
    // A entrada de PAC não é mais constante: o ramo Sociedade a aumenta, e por
    // isso ela é lida do estado a cada mês em vez de ser uma constante do módulo.
    actionPoints: state.actionPoints + pointsPerYear(state) / balance.ticksPerYear,
    regions: decaySupport(afterClimate.regions),
  };

  // Os eventos entram **por último**, e a ordem é regra, não gosto (P7-01):
  //
  //  - depois do clima, para que o sorteio use a temperatura deste mês. Sortear
  //    antes deixaria o limiar do §2.5 sempre um mês atrasado;
  //  - depois do desgaste, porque o evento **fura o piso de apatia** e o
  //    `decaySupport` devolveria uma região derrubada ao piso se rodasse em
  //    cima dela — que é exatamente o oposto do que o §2.5 quer.
  return advanceEvents(afterTime);
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
 *
 * **`hasEnded` é perguntado a cada passo do lote, não uma vez por chamada** — e
 * é para isso que ele existe. Uma chamada entrega até MAX_STEPS_PER_CALL ticks
 * de uma vez quando a aba volta do segundo plano (o P6-06 registrou a partida
 * andando em degraus de um ano inteiro). Sem a pergunta dentro do laço, uma
 * derrota no terceiro passo de doze deixaria a simulação rodar mais nove meses
 * **depois** de a partida ter acabado, e o jogador leria no cartão de fim um
 * mundo mais quente do que aquele em que ele perdeu.
 *
 * Ele entra como parâmetro em vez de este módulo importar o `outcome.ts` porque
 * o caminho inverso fecharia um ciclo: o `outcome.ts` precisa do `isOver` e do
 * `TOTAL_TICKS` daqui. O tick continua sem saber o que faz uma partida acabar —
 * só honra a resposta de quem sabe. O padrão nunca para, que é o que mantém
 * todo chamador anterior a esta tarefa funcionando igual.
 */
export function advanceRealTime(
  state: GameState,
  clock: Clock,
  elapsedMs: number,
  speed = 1,
  hasEnded: (state: GameState) => boolean = () => false,
): { readonly state: GameState; readonly clock: Clock } {
  const { steps, clock: nextClock } = stepsForElapsed(clock, elapsedMs, speed);

  let next = state;
  for (let i = 0; i < steps; i++) {
    if (hasEnded(next)) break;
    next = advanceTick(next);
  }

  return { state: next, clock: nextClock };
}
