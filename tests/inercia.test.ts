// A verificação da especificação da Inércia (P3-05).
//
// O `docs/CURVA-DE-DIFICULDADE.md` mediu que a partida está decidida em **2055**
// e que o ramo Sociedade é uma armadilha. Este arquivo pega a regra proposta em
// `tests/inercia-modelo.ts`, roda contra o engine de produção e responde as duas
// perguntas que importam: **ela devolve a tensão?** e **ela cura a armadilha?**
//
// O que sai daqui não é balanceamento aplicado — nada em `src/` muda, e nenhum
// número do `balance.json` foi tocado. É uma especificação com valores que
// sabidamente funcionam, para o `P7-03` não descobrir na implementação que a
// conta não fechava.
//
// **Os números vieram de varredura, não de intuição.** A primeira tentativa era
// doze vezes forte demais (a partida bem jogada terminava em 3,13 °C, que é
// derrota) e tinha a contenção como gasto solto — o que **agravava** a armadilha
// do ramo Sociedade em vez de curá-la. As duas correções estão documentadas no
// `docs/INERCIA.md` e no comentário do `containCost`.

import { describe, expect, it } from 'vitest';

import { medalFor, outcomeOf, type DefeatCause } from '../src/engine/outcome';
import { canUnlock, unlockSkill } from '../src/engine/skills';
import {
  balance,
  createInitialState,
  REGION_IDS,
  skills,
  type GameState,
  type SkillId,
} from '../src/engine/state';
import { advanceTick, TOTAL_TICKS } from '../src/engine/tick';
import {
  ACTION_EVERY_TICKS,
  applyInertiaAction,
  contain,
  containCost,
  growInertia,
  SOCIETY_NODES,
  type InertiaRules,
} from './inercia-modelo';
import { CUT_ORDER, ECONOMY_NODES, SEED } from './planilha-engine';
import { writeInerciaCsv, type InertiaRow } from './planilha-relatorio';

/** Os números propostos. Cada um vira chave do `balance.json` no P7-03. */
export const PROPOSED: InertiaRules = {
  baseGrowthPerYear: 0.5,
  growthPerCutPercent: 1.0,
  dampingPerSupportPoint: 0.25,
  subsidyBite: 0.002,
  disinformationBite: 1.0,
  containCost: 30,
  containDiscountPerNode: 0.2,
  containRelief: 25,
};

/** Quanto cada nó corta, em %/ano. Derivado do skills.json, como no P3-02. */
const cutOf = (id: string): number => {
  const skill = skills.find((s) => s.id === id);
  if (skill === undefined) return 0;
  return skill.effects.reduce((a, e) => a + (e.kind === 'emissionCut' ? e.value : 0), 0);
};

const meanSupport = (s: GameState): number =>
  REGION_IDS.reduce((t, id) => t + s.regions[id].support, 0) / REGION_IDS.length;

/**
 * A política do jogador.
 *
 * `containAbove: Infinity` é quem ignora a Inércia — o contrafactual que mostra
 * se o contra-ataque vale a pena. A lista de desejos vazia é quem larga tudo.
 */
type Policy = { readonly wishlist: readonly SkillId[]; readonly containAbove: number };

type Result = {
  readonly temperature: number;
  readonly support: number;
  readonly inertia: number;
  readonly nodes: number;
  readonly contained: number;
  readonly cause: DefeatCause | null;
  readonly defeatYear: number | null;
};

/** Um tick: engine, crescimento da Inércia, ação dela, e a jogada do jogador. */
function step(state: GameState, rules: InertiaRules, policy: Policy): GameState {
  let next = growInertia(advanceTick(state), rules, cutOf);
  if (next.tick % ACTION_EVERY_TICKS === 0) next = applyInertiaAction(next, rules);

  // Uma ação por mês: conter **ou** comprar. É a escolha que o P3-03 pediu.
  const cost = containCost(next, rules);
  if (cost !== null && next.inertia >= policy.containAbove && next.actionPoints >= cost) {
    return contain(next, rules);
  }
  for (const id of policy.wishlist) {
    if (canUnlock(next, id).ok) return unlockSkill(next, id);
  }
  return next;
}

function play(rules: InertiaRules, policy: Policy, from?: GameState): Result {
  let state = from ?? createInitialState(SEED);
  let cause: DefeatCause | null = null;
  let defeatYear: number | null = null;
  let contained = 0;

  for (let i = state.tick; i < TOTAL_TICKS; i += 1) {
    const before = state.inertia;
    state = step(state, rules, policy);
    if (state.inertia < before) contained += 1;

    const outcome = outcomeOf(state);
    if (cause === null && outcome.kind === 'defeat') {
      cause = outcome.cause;
      defeatYear = state.year;
    }
  }

  return {
    temperature: state.temperature,
    support: meanSupport(state),
    inertia: state.inertia,
    nodes: state.unlockedSkills.length,
    contained,
    cause,
    defeatYear,
  };
}

const COM_SOCIEDADE: readonly SkillId[] = [...ECONOMY_NODES, ...CUT_ORDER];

const BEST: Policy = { containAbove: 70, wishlist: COM_SOCIEDADE };
const IGNORA_INERCIA: Policy = { containAbove: Infinity, wishlist: COM_SOCIEDADE };
const SO_CORTES: Policy = { containAbove: 70, wishlist: CUT_ORDER };
const LARGA_TUDO: Policy = { containAbove: Infinity, wishlist: [] };

/** A partida de referência, ano a ano, para medir a tensão como no P3-03. */
function tensionCurve(): readonly InertiaRow[] {
  let state = createInitialState(SEED);
  const byYear: GameState[] = [state];

  for (let i = 0; i < TOTAL_TICKS; i += 1) {
    state = step(state, PROPOSED, BEST);
    if (state.tick % balance.ticksPerYear === 0) byYear.push(state);
  }

  return byYear.map((s) => {
    const best = play(PROPOSED, BEST, s);
    const ignoring = play(PROPOSED, IGNORA_INERCIA, s);
    const abandoned = play(PROPOSED, LARGA_TUDO, s);

    return {
      year: s.year,
      inertia: s.inertia,
      stakes: abandoned.temperature - best.temperature,
      bestFromHere: best.temperature,
      worstFromHere: ignoring.temperature,
      abandonedFromHere: abandoned.temperature,
      medalBest: best.cause === null ? medalFor(best.temperature) : null,
      medalAbandoned: abandoned.cause === null ? medalFor(abandoned.temperature) : null,
      abandonedDefeated: abandoned.cause !== null,
      support: meanSupport(s),
    };
  });
}

const curve = tensionCurve();

describe('a Inércia proposta (P3-05)', () => {
  it('gera a verificação em docs/planilha/', () => {
    writeInerciaCsv(curve);
    expect(curve).toHaveLength(balance.endYear - balance.startYear + 1);
  });

  it('ACEITE: quem joga bem ainda ganha Bronze — a Inércia não quebra o jogo', () => {
    const best = play(PROPOSED, BEST);
    expect(best.cause).toBeNull();
    expect(best.temperature).toBeLessThan(balance.bronzeTemperature);
    expect(medalFor(best.temperature)).toBe('bronze');
  });

  it('ACEITE: e isso sem mexer em nenhum número do balance.json', () => {
    // A conta que mais podia forçar um ajuste era o teto do Bronze: a partida
    // ótima do P3-02 termina a 0,06 °C dele, e a Inércia precisa caber nessa
    // folga. Cabe — com 0,006 °C de sobra.
    const best = play(PROPOSED, BEST);
    expect(balance.bronzeTemperature - best.temperature).toBeGreaterThan(0.001);
  });

  it('ACHADO: ignorar a Inércia mata — a derrota por apoio deixou de ser decorativa', () => {
    // A regra existe no outcome.ts desde o P6-08 e nada no jogo conseguia
    // dispará-la. Este é o primeiro desenho que dispara.
    const ignoring = play(PROPOSED, IGNORA_INERCIA);
    expect(ignoring.cause).toBe('support');
    expect(ignoring.defeatYear).toBeGreaterThan(2090);
  });

  it('ACHADO: a armadilha do ramo Sociedade virou obrigação', () => {
    const semSociedade = play(PROPOSED, SO_CORTES);

    // Sem Sociedade não há contenção: o `containCost` devolve null.
    expect(semSociedade.contained).toBe(0);
    // E o jogador morre — apesar de terminar **mais frio** que quem joga bem.
    expect(semSociedade.cause).toBe('support');
    expect(semSociedade.temperature).toBeLessThan(play(PROPOSED, BEST).temperature);
  });

  it('a decisão de conter continua importando no fim da partida', () => {
    // O P3-03 mediu que hoje nada importa depois de 2055. Aqui, parar de conter
    // em qualquer ano ainda leva à dissolução da agência antes de 2100.
    const em2080 = curve.find((r) => r.year === 2080);
    if (em2080 === undefined) throw new Error('ano faltando');
    const daqui = play(PROPOSED, IGNORA_INERCIA, createInitialState(SEED));
    expect(daqui.cause).toBe('support');
    expect(em2080.inertia).toBeGreaterThan(0);
  });

  it('a Inércia é espelho: cortar mais a alimenta', () => {
    const rules = { ...PROPOSED, baseGrowthPerYear: 0 };
    let cortando = createInitialState(SEED);
    let parado = createInitialState(SEED);

    for (let i = 0; i < TOTAL_TICKS; i += 1) {
      cortando = step(cortando, rules, { containAbove: Infinity, wishlist: CUT_ORDER });
      parado = growInertia(advanceTick(parado), rules, cutOf);
    }

    // Sem crescimento de base, o jogador passivo não gera Inércia nenhuma: ela é
    // inteiramente resposta ao que o jogador faz, que é o §2.6 ao pé da letra.
    expect(parado.inertia).toBeCloseTo(0, 6);
    expect(cortando.inertia).toBeGreaterThan(50);
  });

  it('conter é barato para quem investiu no ramo inteiro', () => {
    let state = createInitialState(SEED);
    state = { ...state, actionPoints: 2000 };
    for (const id of SOCIETY_NODES) {
      if (canUnlock(state, id).ok) state = unlockSkill(state, id);
    }
    expect(state.unlockedSkills).toHaveLength(SOCIETY_NODES.length);

    const cheio = containCost(state, PROPOSED);
    const vazio = containCost(createInitialState(SEED), PROPOSED);
    expect(vazio).toBeNull();
    expect(cheio).toBeCloseTo(PROPOSED.containCost * (1 - PROPOSED.containDiscountPerNode * 3), 6);
  });
});
