// A Inércia medida contra o engine — antes proposta (P3-05), agora implementada
// (P7-03).
//
// **O que mudou neste arquivo no P7-03.** Até aqui ele aplicava a regra
// proposta **por fora** do engine, entre um `advanceTick` e o seguinte, porque
// `src/engine/inertia.ts` estava vazio. Agora o `advanceTick` a aplica sozinho,
// e continuar somando o protótipo por cima aplicaria a Inércia duas vezes. As
// partidas abaixo são o engine de produção puro, dirigido por uma política de
// jogador.
//
// **O `tests/inercia-modelo.ts` não virou lixo — virou o contrato.** Ele é a
// especificação do P3-05 escrita como código, e foi contra ele que os números
// foram varridos. O último bloco deste arquivo cobra que a implementação
// concorde com ele função por função: é o que impede o engine de derivar da
// regra que foi verificada, sem ninguém notar.

import { describe, expect, it } from 'vitest';

import {
  actionForTick,
  advanceInertia,
  applyInertiaAction,
  canContain,
  contain,
  containCost,
  growInertia,
  inertiaGrowthPerTick,
  societyNodesOwned,
} from '../src/engine/inertia';
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
  actionForTick as modeloActionForTick,
  applyInertiaAction as modeloApplyAction,
  containCost as modeloContainCost,
  inertiaGrowthPerTick as modeloGrowth,
  SOCIETY_NODES,
  type InertiaRules,
} from './inercia-modelo';
import { CUT_ORDER, ECONOMY_NODES, SEED } from './planilha-engine';
import { writeInerciaCsv, type InertiaRow } from './planilha-relatorio';

/**
 * Os números do P3-05, agora lidos do `balance.json` em vez de escritos aqui.
 *
 * **Um deles mudou, e a mudança foi medida.** A especificação pedia
 * `disinformationBite: 1.0`, verificado num mundo **sem eventos**. Com os
 * eventos do P7-01 em cena, 1,0 dissolve a agência em toda estratégia — os
 * eventos já consomem quase todo o apoio sozinhos, e não sobra pool para a
 * desinformação morder. O `docs/BALANCEAMENTO.md` tem a varredura em 5 seeds.
 */
const RULES: InertiaRules = {
  baseGrowthPerYear: balance.inertiaGrowthPerYear,
  growthPerCutPercent: balance.inertiaGrowthPerCutPercent,
  dampingPerSupportPoint: balance.inertiaDampingPerSupport,
  subsidyBite: balance.inertiaSubsidyBite,
  disinformationBite: balance.inertiaDisinformationBite,
  containCost: balance.containCost,
  containDiscountPerNode: balance.containDiscountPerNode,
  containRelief: balance.containRelief,
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
  readonly peakInertia: number;
  readonly nodes: number;
  readonly contained: number;
  readonly cause: DefeatCause | null;
  readonly defeatYear: number | null;
};

/**
 * Um tick: o engine (que já move a Inércia) e a jogada do jogador.
 *
 * Uma ação por mês: conter **ou** comprar. É a escolha que o P3-03 pediu, e é o
 * que dá peso à contenção — ela custa um nó adiado, não só PAC.
 */
function step(state: GameState, policy: Policy): { state: GameState; contained: boolean } {
  const next = advanceTick(state);

  if (next.inertia >= policy.containAbove && canContain(next).ok) {
    return { state: contain(next), contained: true };
  }
  for (const id of policy.wishlist) {
    if (canUnlock(next, id).ok) return { state: unlockSkill(next, id), contained: false };
  }
  return { state: next, contained: false };
}

function play(policy: Policy, from?: GameState): Result {
  let state = from ?? createInitialState(SEED);
  let cause: DefeatCause | null = null;
  let defeatYear: number | null = null;
  let contained = 0;
  let peakInertia = state.inertia;

  for (let i = state.tick; i < TOTAL_TICKS; i += 1) {
    const turn = step(state, policy);
    state = turn.state;
    if (turn.contained) contained += 1;
    peakInertia = Math.max(peakInertia, state.inertia);

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
    peakInertia,
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
    state = step(state, BEST).state;
    if (state.tick % balance.ticksPerYear === 0) byYear.push(state);
  }

  return byYear.map((s) => {
    const best = play(BEST, s);
    const ignoring = play(IGNORA_INERCIA, s);
    const abandoned = play(LARGA_TUDO, s);

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

/** A partida de referência interrompida no começo do ano pedido. */
function playUntil(year: number): GameState {
  let state = createInitialState(SEED);
  while (state.year < year && state.tick < TOTAL_TICKS) state = step(state, BEST).state;
  return state;
}

describe('a Inércia no engine (P7-03)', () => {
  it('gera a verificação em docs/planilha/', () => {
    writeInerciaCsv(curve);
    expect(curve).toHaveLength(balance.endYear - balance.startYear + 1);
  });

  it('ACEITE: a melhor jogada chega viva a 2100 e leva bronze', () => {
    // Era isto que a proposta do P3-05 prometia e que a colisão com os eventos
    // do P7-01 tinha tirado. Volta com o `inertiaDisinformationBite` refeito
    // com eventos em cena e o teto do bronze em 2,55 °C.
    const best = play(BEST);

    expect(best.cause).toBeNull();
    expect(best.temperature).toBeLessThan(balance.bronzeTemperature);
    expect(medalFor(best.temperature)).toBe('bronze');
    expect(best.contained).toBeGreaterThan(0);
  });

  it('ACEITE: pular o ramo Sociedade termina mais frio e ainda assim perde', () => {
    // **A inversão que o P3-05 procurava, e que a colisão do P7-01 tinha
    // desfeito.** Quem ignora Sociedade não tem como conter, alimenta a Inércia
    // com os próprios cortes, e é dissolvido — com uma temperatura que teria
    // dado medalha. É o dilema do §2.6 em forma de asserção.
    const semSociedade = play(SO_CORTES);
    const comSociedade = play(BEST);

    expect(semSociedade.contained).toBe(0);
    expect(semSociedade.temperature).toBeLessThan(comSociedade.temperature);
    expect(semSociedade.cause).toBe('support');
    expect(semSociedade.defeatYear).toBeLessThan(balance.endYear);
  });

  it('comprar Sociedade sem nunca conter não basta', () => {
    // A licença de lutar não é a luta. O ramo destrava a contenção e empurra o
    // apoio para cima uma vez; quem para aí termina à beira da dissolução.
    const ignoring = play(IGNORA_INERCIA);

    expect(ignoring.support).toBeLessThan(play(BEST).support);
    expect(ignoring.peakInertia).toBeGreaterThan(play(BEST).peakInertia);
  });

  it('ignorar a Inércia drena o apoio para muito abaixo do piso de apatia', () => {
    const ignoring = play(IGNORA_INERCIA);
    expect(ignoring.support).toBeLessThan(balance.supportFloor / 2);
  });

  it('a Inércia empurra a janela de perdão de 2055 para depois de 2065', () => {
    // **O aceite central do P3-05, medido contra o engine de verdade.** O
    // `docs/CURVA-DE-DIFICULDADE.md` mediu que largar o controle já era
    // inconsequente a partir de 2055: dali em diante, abandonar a partida dava
    // o mesmo desfecho que jogá-la. Com a Inércia agindo, largar continua sendo
    // fatal por muito mais tempo, porque ela cobra o apoio que ninguém está
    // defendendo.
    const largarAindaMata = (ano: number): boolean =>
      play(LARGA_TUDO, playUntil(ano)).cause !== null;

    expect(largarAindaMata(2055)).toBe(true);
    expect(largarAindaMata(2065)).toBe(true);
  });

  it('ACHADO: depois de ~2070 largar tudo ainda dá bronze — a medalha decide cedo', () => {
    // **Este teste registra um problema, não uma qualidade**, no mesmo espírito
    // do `outcome.test.ts` sobre a vitória inalcançável.
    //
    // Mover o teto do bronze para 2,55 °C no P7-03 devolveu a medalha à melhor
    // jogada — sem isso, nenhuma estratégia ganhava nada. O preço é este: a
    // faixa ficou larga o bastante para caber também quem desiste no último
    // terço. De 2070 em diante, continuar jogando e largar o controle terminam
    // ambos em bronze, separados por 0,005 °C.
    //
    // O conserto não é enfraquecer a Inércia — é a escala de medalhas, e ela
    // precisa de playtest (risco R2). É do `P8-02`; o número está no
    // `docs/BALANCEAMENTO.md`.
    const largando = play(LARGA_TUDO, playUntil(2075));
    const jogando = play(BEST, playUntil(2075));

    expect(largando.cause).toBeNull();
    expect(medalFor(largando.temperature)).toBe(medalFor(jogando.temperature));
    expect(Math.abs(largando.temperature - jogando.temperature)).toBeLessThan(0.02);
  });

  it('conter mantém o apoio acima de quem desiste, até o fim', () => {
    // O que continua em jogo depois de 2070, já que a medalha não está: quem
    // segue contendo termina com mais apoio e a Inércia longe da saturação.
    const em2080 = playUntil(2080);
    const continua = play(BEST, em2080);
    const desiste = play(IGNORA_INERCIA, em2080);

    expect(em2080.inertia).toBeGreaterThan(50);
    expect(continua.support).toBeGreaterThan(desiste.support);
    expect(desiste.inertia).toBeGreaterThan(continua.inertia);
  });

  it('a Inércia é espelho: cortar mais a alimenta', () => {
    // Sem crescimento de base não dá para desligar a constante do balance.json,
    // então a prova é comparativa: duas partidas, mesma seed, e a única
    // diferença é o quanto o jogador cortou.
    const cortando = play({ containAbove: Infinity, wishlist: CUT_ORDER });
    const parado = play(LARGA_TUDO);

    expect(cortando.peakInertia).toBeGreaterThan(parado.peakInertia * 2);
    expect(parado.peakInertia).toBeLessThan(50);
  });

  it('o apoio acima do piso de apatia segura a Inércia', () => {
    const start = createInitialState(SEED);
    const apatico = {
      ...start,
      regions: Object.fromEntries(
        REGION_IDS.map((id) => [id, { ...start.regions[id], support: balance.supportFloor }]),
      ) as GameState['regions'],
    };

    // Com apoio no piso não há amortecimento, e ela cresce à taxa de base.
    expect(inertiaGrowthPerTick(apatico)).toBeCloseTo(
      balance.inertiaGrowthPerYear / balance.ticksPerYear,
      10,
    );
    // Com apoio acima do piso, cresce menos — e aqui chega a encolher.
    expect(inertiaGrowthPerTick(start)).toBeLessThan(inertiaGrowthPerTick(apatico));
  });

  it('a Inércia fica presa entre 0 e 100', () => {
    const start = createInitialState(SEED);

    // **O teto precisa de um estado em que ela de fato cresça.** Numa partida
    // recém-começada o apoio está em 50 e o amortecimento (0,25 × 25 = 6,25 ao
    // ano) come a base mais toda a pressão de corte — a Inércia *encolhe*, e um
    // teste ingênuo mediria o clamp errado. Com o apoio no piso não há
    // amortecimento e ela sobe.
    const semAmortecimento: GameState = {
      ...start,
      inertia: 100,
      unlockedSkills: CUT_ORDER,
      regions: Object.fromEntries(
        REGION_IDS.map((id) => [id, { ...start.regions[id], support: balance.supportFloor }]),
      ) as GameState['regions'],
    };

    expect(inertiaGrowthPerTick(semAmortecimento)).toBeGreaterThan(0);
    expect(growInertia(semAmortecimento).inertia).toBe(100);

    // E o piso, no caminho oposto: apoio alto e nenhum corte comprado fazem o
    // crescimento ficar negativo, e ela não passa de zero.
    expect(inertiaGrowthPerTick(start)).toBeLessThan(0);
    expect(growInertia({ ...start, inertia: 0 }).inertia).toBe(0);
  });

  it('as duas ações alternam, e a primeira é desinformação', () => {
    const every = balance.inertiaActionEveryTicks;
    expect(actionForTick(every)).toBe('disinformation');
    expect(actionForTick(every * 2)).toBe('subsidies');
    expect(actionForTick(every * 3)).toBe('disinformation');
  });

  it('a desinformação fura o piso de apatia; o subsídio não toca no apoio', () => {
    const start = createInitialState(SEED);
    const noPiso = {
      ...start,
      inertia: 100,
      regions: Object.fromEntries(
        REGION_IDS.map((id) => [id, { ...start.regions[id], support: balance.supportFloor }]),
      ) as GameState['regions'],
    };

    const every = balance.inertiaActionEveryTicks;
    const desinformando = applyInertiaAction({ ...noPiso, tick: every });
    const subsidiando = applyInertiaAction({ ...noPiso, tick: every * 2 });

    expect(desinformando.regions.na.support).toBeLessThan(balance.supportFloor);
    expect(subsidiando.regions.na.support).toBe(balance.supportFloor);
    expect(subsidiando.regions.na.emissions).toBeGreaterThan(noPiso.regions.na.emissions);
  });

  it('o estrago é permanente: um mês depois nada voltou', () => {
    // É a propriedade que faz o modelo funcionar. Se o apoio ou a emissão
    // voltassem sozinhos, a Inércia seria barulho em vez de tensão.
    const start = {
      ...createInitialState(SEED),
      inertia: 100,
      tick: balance.inertiaActionEveryTicks,
    };
    const atingido = applyInertiaAction(start);
    const depois = advanceTick(atingido);

    expect(depois.regions.na.support).toBeLessThanOrEqual(atingido.regions.na.support);
    expect(depois.regions.na.emissions).toBeGreaterThan(atingido.regions.na.emissions);
  });

  it('ela só age na cadência do §2.6', () => {
    const every = balance.inertiaActionEveryTicks;
    const base = { ...createInitialState(SEED), inertia: 100 };

    // Num tick que não é múltiplo, só o crescimento acontece.
    const quieto = advanceInertia({ ...base, tick: every + 1 });
    expect(quieto.regions).toEqual(base.regions);

    const agindo = advanceInertia({ ...base, tick: every * 2 });
    expect(agindo.regions).not.toEqual(base.regions);
  });
});

describe('a contenção', () => {
  const rico = (state: GameState): GameState => ({ ...state, actionPoints: 2000 });

  function comSociedade(quantos: number): GameState {
    let state = rico(createInitialState(SEED));
    for (const id of SOCIETY_NODES.slice(0, quantos)) {
      if (canUnlock(state, id).ok) state = unlockSkill(state, id);
    }
    return state;
  }

  it('não existe antes do primeiro nó de Sociedade', () => {
    const start = createInitialState(SEED);

    expect(containCost(start)).toBeNull();
    expect(canContain(start)).toEqual({ ok: false, reason: 'notUnlocked' });
    expect(contain(start)).toBe(start);
  });

  it('fica mais barata a cada nó do ramo', () => {
    const custos = [1, 2, 3, 4].map((n) => containCost(comSociedade(n)));

    expect(custos[0]).toBeCloseTo(balance.containCost, 10);
    expect(custos[3]).toBeCloseTo(
      balance.containCost * (1 - balance.containDiscountPerNode * 3),
      10,
    );
    for (let i = 1; i < custos.length; i += 1) {
      expect(custos[i]).toBeLessThan(custos[i - 1] as number);
    }
    // Com a árvore de hoje o desconto máximo é 60% — nunca chega a zero.
    expect(custos[3]).toBeGreaterThan(0);
  });

  it('conta os nós de Sociedade que o jogador tem', () => {
    expect(societyNodesOwned(createInitialState(SEED))).toBe(0);
    expect(societyNodesOwned(comSociedade(2))).toBe(2);
  });

  it('cobra o PAC e derruba a Inércia', () => {
    const antes = { ...comSociedade(1), inertia: 80 };
    const custo = containCost(antes);
    const depois = contain(antes);

    expect(custo).not.toBeNull();
    expect(depois.actionPoints).toBeCloseTo(antes.actionPoints - (custo as number), 10);
    expect(depois.inertia).toBe(80 - balance.containRelief);
  });

  it('recusa sem PAC, e recusa com a Inércia já em zero', () => {
    const pobre = { ...comSociedade(1), actionPoints: 0, inertia: 80 };
    const limpo = { ...comSociedade(1), inertia: 0 };

    expect(canContain(pobre)).toEqual({ ok: false, reason: 'notEnoughPoints' });
    expect(contain(pobre)).toBe(pobre);

    // Sem esta guarda, o jogador gastaria PAC para derrubar o que já está no
    // chão — e só descobriria depois de o PAC ter sumido.
    expect(canContain(limpo)).toEqual({ ok: false, reason: 'nothingToContain' });
    expect(contain(limpo)).toBe(limpo);
  });
});

// ---------------------------------------------------------------------------
// A implementação bate com a especificação verificada no P3-05?
//
// O `tests/inercia-modelo.ts` é a regra como ela foi varrida e aprovada, escrita
// como código e aplicada por fora do engine. Estes testes cobram que
// `src/engine/inertia.ts` calcule exatamente o mesmo — função por função, sobre
// estados tirados de uma partida de verdade. Sem eles, uma refatoração do engine
// poderia afastá-lo em silêncio dos números que o docs/INERCIA.md publica.
// ---------------------------------------------------------------------------

describe('o engine concorda com o modelo do P3-05', () => {
  /** Estados variados: anos diferentes, compras diferentes, apoios diferentes. */
  const amostras: readonly GameState[] = (() => {
    const out: GameState[] = [];
    let state = createInitialState(SEED);
    for (let i = 0; i < TOTAL_TICKS; i += 1) {
      state = step(state, BEST).state;
      if (i % 97 === 0) out.push(state);
    }
    return out;
  })();

  it('a amostra cobre a partida inteira', () => {
    expect(amostras.length).toBeGreaterThan(5);
    expect(amostras.some((s) => s.inertia > 50)).toBe(true);
  });

  it('o crescimento por tick é o mesmo', () => {
    for (const s of amostras) {
      expect(inertiaGrowthPerTick(s)).toBeCloseTo(modeloGrowth(s, RULES, cutOf), 12);
    }
  });

  it('a ação de cada turno é a mesma', () => {
    for (let tick = 0; tick <= TOTAL_TICKS; tick += balance.inertiaActionEveryTicks) {
      expect(actionForTick(tick)).toBe(modeloActionForTick(tick));
    }
  });

  it('o efeito de uma ação é o mesmo', () => {
    for (const s of amostras) {
      const engine = applyInertiaAction({ ...s, tick: balance.inertiaActionEveryTicks });
      const modelo = modeloApplyAction({ ...s, tick: balance.inertiaActionEveryTicks }, RULES);
      expect(engine.regions).toEqual(modelo.regions);
    }
  });

  it('o custo da contenção é o mesmo', () => {
    for (const s of amostras) {
      expect(containCost(s)).toBe(modeloContainCost(s, RULES));
    }
  });
});
