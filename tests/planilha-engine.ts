// O motor das sondas de balanceamento: estratégias e simulação.
//
// Compartilhado entre o `planilha.test.ts` (P3-02 e P3-04) e o `tensao.test.ts`
// (P3-03), que precisam da **mesma** partida de referência — se cada um
// simulasse a seu jeito, os dois documentos passariam a falar de jogos
// levemente diferentes e ninguém notaria.
//
// Nada aqui é código de jogo: é o engine de produção sendo dirigido de fora.

import { globalEmissions } from '../src/engine/climate';
import { outcomeOf } from '../src/engine/outcome';
import { canUnlock, pointsPerYear, unlockSkill } from '../src/engine/skills';
import {
  averageSupport,
  balance,
  createInitialState,
  skills,
  type GameState,
  type SkillId,
} from '../src/engine/state';
import { advanceTick, isOver, TOTAL_TICKS } from '../src/engine/tick';
import type { Run, YearRow } from './planilha-relatorio';

/** Uma seed qualquer, fixa: a partida precisa ser a mesma em toda máquina. */
export const SEED = 20260820;

/**
 * Uma estratégia é uma **lista de desejos ordenada** mais um ano de início, e
 * não uma agenda de compras datada.
 *
 * A diferença importa: uma agenda ("compre solar em 2031") quebra sozinha
 * quando um custo muda, e quebra em silêncio — a compra simplesmente não
 * acontece e a curva piora sem ninguém entender por quê. A lista de desejos
 * pergunta ao `canUnlock` a cada mês e compra o primeiro item que couber no
 * bolso, que é também o que um jogador atento faz.
 */
export type Strategy = {
  readonly id: string;
  readonly label: string;
  readonly startYear: number;
  readonly wishlist: readonly SkillId[];
};

/**
 * Os 16 nós que cortam emissão, do maior corte por PAC gasto para o menor.
 *
 * A ordem é derivada do `skills.json`, e não escrita à mão, porque uma lista
 * fixa apodrece: mudar um custo no arquivo de dados deixaria a "melhor ordem"
 * em silêncio errada, e a planilha passaria a comparar a estratégia ótima de
 * ontem com o balanceamento de hoje.
 *
 * **Que esta é de fato a melhor ordem foi medido, não assumido.** Uma busca de
 * 200 permutações aleatórias não achou nada melhor que ela (o melhor sorteio
 * empata em 2,44 °C; o pior chega a 2,53 °C). Ordenar por corte absoluto dá o
 * mesmo resultado; ordenar do mais barato para o mais caro é 0,014 °C pior.
 */
export const CUT_ORDER: readonly SkillId[] = skills
  .filter((s) => s.effects.some((e) => e.kind === 'emissionCut'))
  .map((s) => ({
    id: s.id,
    ratio: s.effects.reduce((a, e) => a + (e.kind === 'emissionCut' ? e.value : 0), 0) / s.cost,
  }))
  .sort((a, b) => b.ratio - a.ratio)
  .map((n) => n.id);

/** Os dois únicos nós que aumentam a entrada de PAC: +2/ano e +3/ano. */
export const ECONOMY_NODES: readonly SkillId[] = ['climate-education', 'treaties'];

export const STRATEGIES: readonly Strategy[] = [
  { id: 'nada', label: 'Não faz nada', startYear: balance.startYear, wishlist: [] },
  {
    id: 'melhor',
    label: 'Corta cedo, na melhor ordem, e ignora Sociedade',
    startYear: balance.startYear,
    wishlist: CUT_ORDER,
  },
  {
    id: 'sociedade-cedo',
    label: 'Investe em Sociedade antes de cortar',
    startYear: balance.startYear,
    wishlist: [...ECONOMY_NODES, ...CUT_ORDER],
  },
  {
    id: 'tarde',
    label: 'Acorda em 2060',
    startYear: 2060,
    wishlist: [...ECONOMY_NODES, ...CUT_ORDER],
  },
];

const costById = new Map(skills.map((s) => [s.id, s.cost]));

export type SimResult = Run & {
  readonly finalState: GameState;
  /**
   * O estado ao fim de cada ano, do primeiro ao último — a matéria-prima do
   * P3-03, que precisa **bifurcar** a partida a partir de um ano qualquer para
   * medir quanto ainda está em jogo dali em diante.
   */
  readonly statesByYear: readonly GameState[];
};

/**
 * Roda os 900 ticks de uma lista de desejos.
 *
 * **A simulação não para na derrota, de propósito.** O jogo para — é o que o
 * P6-08 ligou — mas a planilha precisa da curva inteira até 2100 para que dê
 * para comparar estratégias no mesmo eixo. O ano da derrota fica registrado à
 * parte, e é ele que a página de curvas mostra na coluna de desfecho.
 */
export function simulate(strategy: Strategy): SimResult {
  let state = createInitialState(SEED);
  const rows: YearRow[] = [];
  const statesByYear: GameState[] = [];
  const crossings: Record<string, number | null> = { '1.5': null, '2.0': null, '2.5': null };
  let defeatYear: number | null = null;
  let earnedPoints = 0;
  let spentPoints = 0;
  let boughtThisYear: SkillId[] = [];

  const note = (s: GameState): void => {
    for (const key of Object.keys(crossings)) {
      if (crossings[key] === null && s.temperature >= Number(key)) crossings[key] = s.year;
    }
    if (defeatYear === null && outcomeOf(s).kind === 'defeat') defeatYear = s.year;
  };

  const snapshot = (s: GameState): YearRow => ({
    year: s.year,
    temperature: s.temperature,
    emissions: globalEmissions(s),
    cumulativeCO2: s.cumulativeCO2,
    actionPoints: s.actionPoints,
    pointsPerYear: pointsPerYear(s),
    unlocked: s.unlockedSkills.length,
    support: averageSupport(s),
    boughtThisYear: [...boughtThisYear],
  });

  note(state);
  rows.push(snapshot(state));
  statesByYear.push(state);

  for (let step = 0; step < TOTAL_TICKS; step += 1) {
    const before = state.actionPoints;
    state = advanceTick(state);
    // Medido **antes** da compra do mês: o que interessa aqui é quanto a
    // partida arrecadou, não quanto sobrou no caixa.
    earnedPoints += state.actionPoints - before;

    if (state.year >= strategy.startYear) {
      // Um item por mês, no máximo. Esvaziar a lista de uma vez quando o bolso
      // permite esconderia o ritmo — que é justamente o que a planilha mostra.
      for (const id of strategy.wishlist) {
        if (canUnlock(state, id).ok) {
          state = unlockSkill(state, id);
          spentPoints += costById.get(id) ?? 0;
          boughtThisYear.push(id);
          break;
        }
      }
    }

    note(state);

    if (state.tick % balance.ticksPerYear === 0) {
      rows.push(snapshot(state));
      statesByYear.push(state);
      boughtThisYear = [];
    }
  }

  return {
    id: strategy.id,
    label: strategy.label,
    rows,
    unlockedCount: state.unlockedSkills.length,
    earnedPoints,
    spentPoints,
    crossings,
    defeatYear,
    finalState: state,
    statesByYear,
  };
}

/** Como uma partida bifurcada terminou. */
export type PlayOut = {
  readonly temperature: number;
  readonly unlocked: number;
  /** `true` se a partida cruzou o limiar de derrota em qualquer ponto do caminho. */
  readonly defeated: boolean;
};

/**
 * Continua uma partida **a partir de um estado qualquer** até 2100.
 *
 * É a peça que o P3-03 precisa e o P3-02 não precisava: para medir quanto ainda
 * está em jogo no ano Y, é preciso pegar a partida como ela está em Y e jogá-la
 * de dois jeitos — o melhor possível e o pior possível. A distância entre os
 * dois finais **é** a tensão daquele momento.
 *
 * Nada é mutado: o `advanceTick` devolve estado novo, então bifurcar é só
 * chamar esta função duas vezes com o mesmo `from`.
 */
export function playOut(from: GameState, wishlist: readonly SkillId[]): PlayOut {
  let state = from;
  let defeated = outcomeOf(state).kind === 'defeat';

  while (!isOver(state)) {
    state = advanceTick(state);
    for (const id of wishlist) {
      if (canUnlock(state, id).ok) {
        state = unlockSkill(state, id);
        break;
      }
    }
    if (!defeated && outcomeOf(state).kind === 'defeat') defeated = true;
  }

  return { temperature: state.temperature, unlocked: state.unlockedSkills.length, defeated };
}
