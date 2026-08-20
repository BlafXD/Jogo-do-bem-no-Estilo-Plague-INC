import { describe, expect, it } from 'vitest';
import { globalEmissions } from '../src/engine/climate';
import { isFinished, MEDAL_CEILING, medalFor, outcomeOf } from '../src/engine/outcome';
import { canUnlock, unlockSkill } from '../src/engine/skills';
import {
  averageSupport,
  balance,
  createInitialState,
  REGION_IDS,
  skills,
  type GameState,
  type Region,
  type RegionId,
} from '../src/engine/state';
import { advanceTick, TOTAL_TICKS } from '../src/engine/tick';

/**
 * A regra de vitória e derrota do docs/GDD.md §2.7 (P6-08).
 *
 * Roda em node: o desfecho é uma leitura pura do estado e não sabe que existe
 * uma tela. A tradução dele em texto está no tests/outcome.dom.test.ts.
 */

const start = (): GameState => createInitialState(2025);

/** Um estado com todas as regiões no mesmo apoio. */
function withSupport(state: GameState, support: number): GameState {
  const regions: Partial<Record<RegionId, Region>> = {};
  for (const id of REGION_IDS) regions[id] = { ...state.regions[id], support };
  return { ...state, regions: regions as Record<RegionId, Region> };
}

/** Um estado com todas as regiões emitindo a mesma coisa. */
function withEmissions(state: GameState, perRegion: number): GameState {
  const regions: Partial<Record<RegionId, Region>> = {};
  for (const id of REGION_IDS) regions[id] = { ...state.regions[id], emissions: perRegion };
  return { ...state, regions: regions as Record<RegionId, Region> };
}

/** Emissão global logo abaixo do limiar de "≈ 0". */
const netZero = (state: GameState): GameState =>
  withEmissions(state, (balance.netZeroEmissions * 0.9) / REGION_IDS.length);

describe('medalFor', () => {
  it('os três limiares do balance.json estão em ordem crescente', () => {
    // A ordem **é** a regra: `medalFor` percorre MEDALS do mais exigente para o
    // menos e devolve a primeira que couber. Com os valores fora de ordem no
    // arquivo, quem parasse em 2,4 °C levaria ouro e nada quebraria sozinho.
    expect(MEDAL_CEILING.gold).toBeLessThan(MEDAL_CEILING.silver);
    expect(MEDAL_CEILING.silver).toBeLessThan(MEDAL_CEILING.bronze);
  });

  it('dá a medalha da faixa em que a temperatura parou', () => {
    expect(medalFor(1.37)).toBe('gold');
    expect(medalFor(1.9)).toBe('silver');
    expect(medalFor(2.4)).toBe('bronze');
  });

  it('o limiar é estrito: parar em cima do teto cai para a medalha de baixo', () => {
    // O §2.7 escreve "< 1,5 °C". Parar exatamente em 1,5 não é ficar abaixo de
    // 1,5, e é o tipo de fronteira que um `<=` distraído entrega de graça.
    expect(medalFor(MEDAL_CEILING.gold)).toBe('silver');
    expect(medalFor(MEDAL_CEILING.silver)).toBe('bronze');
    expect(medalFor(MEDAL_CEILING.bronze)).toBeNull();
  });

  it('acima do teto do bronze não há medalha', () => {
    expect(medalFor(2.6)).toBeNull();
    expect(medalFor(3)).toBeNull();
  });
});

describe('outcomeOf', () => {
  it('uma partida recém-começada está em curso', () => {
    expect(outcomeOf(start())).toEqual({ kind: 'playing' });
    expect(isFinished(start())).toBe(false);
  });

  it('passar do loseTemperature dissolve a agência', () => {
    const state = { ...start(), temperature: balance.loseTemperature + 0.01 };

    expect(outcomeOf(state)).toEqual({ kind: 'defeat', cause: 'temperature' });
    expect(isFinished(state)).toBe(true);
  });

  it('parar exatamente no loseTemperature ainda não é derrota', () => {
    // O §2.7 escreve "temperatura > 3,0 °C". A fronteira é a metade do teste
    // que um `>=` quebraria sem ninguém perceber.
    const state = { ...start(), temperature: balance.loseTemperature };

    expect(outcomeOf(state)).toEqual({ kind: 'playing' });
  });

  it('apoio médio zerado dissolve a agência', () => {
    const state = withSupport(start(), 0);

    expect(averageSupport(state)).toBe(0);
    expect(outcomeOf(state)).toEqual({ kind: 'defeat', cause: 'support' });
  });

  it('apoio médio abaixo de zero também dissolve a agência', () => {
    // Este teste nasceu de um defeito plantado que passou em 234 de 234: trocar
    // o `<= 0` por `=== 0` não quebrava nada, porque nenhum caminho de hoje
    // produz apoio negativo — o desgaste para no piso e a compra passa por
    // `clamp`. Só que o `outcomeOf` é função total sobre o GameState, e quem
    // vai subtrair apoio de verdade é o evento do P7-01 e a Inércia do P7-03.
    // Uma subtração que passe do zero por um fio deixaria a agência de pé com
    // o apoio negativo, que é o pior jeito possível de a regra falhar.
    const state = withSupport(start(), -0.5);

    expect(outcomeOf(state)).toEqual({ kind: 'defeat', cause: 'support' });
  });

  it('apoio médio acima de zero não derrota, mesmo com regiões zeradas', () => {
    // Zerar sete das oito ainda dá média positiva. O §2.7 fala do **médio
    // global**, e transformar isso em "alguma região zerou" seria um jogo bem
    // mais curto do que o desenhado.
    let state = withSupport(start(), 0);
    state = {
      ...state,
      regions: { ...state.regions, na: { ...state.regions.na, support: 1 } },
    };

    expect(outcomeOf(state)).toEqual({ kind: 'playing' });
  });

  it('a derrota vem antes da medalha', () => {
    // Zerar as emissões no mesmo mês em que o apoio acaba não compra uma
    // medalha: a agência foi dissolvida. É a ordem das perguntas do outcomeOf,
    // e é o caso que inverter as duas primeiras linhas quebraria.
    const state = netZero(withSupport(start(), 0));

    expect(globalEmissions(state)).toBeLessThan(balance.netZeroEmissions);
    expect(outcomeOf(state)).toEqual({ kind: 'defeat', cause: 'support' });
  });

  it('emissões abaixo do limiar de "≈ 0" fecham a partida com vitória', () => {
    const state = netZero(start());

    expect(outcomeOf(state)).toEqual({
      kind: 'finished',
      ending: 'netZero',
      medal: medalFor(state.temperature),
    });
  });

  it('encostar no limiar já conta como zero líquido', () => {
    // `<=` aqui, e não `<`: "≈ 0" é uma faixa, não uma fronteira exata como a
    // do §2.7 para as medalhas. O limiar é o valor a partir do qual conta.
    const state = withEmissions(start(), balance.netZeroEmissions / REGION_IDS.length);

    expect(globalEmissions(state)).toBeCloseTo(balance.netZeroEmissions, 10);
    expect(outcomeOf(state).kind).toBe('finished');
  });

  it('chegar a 2100 ainda emitindo fecha a partida pelo horizonte', () => {
    const state = { ...start(), tick: TOTAL_TICKS };

    expect(outcomeOf(state)).toEqual({
      kind: 'finished',
      ending: 'horizon',
      medal: 'gold',
    });
  });

  it('zerar as emissões no último mês vale netZero, não horizonte', () => {
    // Quem zera junto com o fim do horizonte fez a coisa que o §2.7 chama de
    // vitória. Chegar no limite do prazo não pode rebaixar o feito.
    const state = netZero({ ...start(), tick: TOTAL_TICKS });

    expect(outcomeOf(state).kind).toBe('finished');
    expect(outcomeOf(state)).toMatchObject({ ending: 'netZero' });
  });

  it('a medalha do fim sai da temperatura, em qualquer dos dois finais', () => {
    for (const ending of [start(), { ...start(), tick: TOTAL_TICKS }]) {
      const morno = { ...ending, tick: TOTAL_TICKS, temperature: 2.4 };
      const quente = { ...ending, tick: TOTAL_TICKS, temperature: 2.9 };

      expect(outcomeOf(morno)).toMatchObject({ medal: 'bronze' });
      expect(outcomeOf(quente)).toMatchObject({ medal: null });
    }
  });

  it('não é um campo gravado: o desfecho é sempre recalculado do estado', () => {
    // É o que dispensa o SAVE_VERSION de subir no P6-07 e o que impede um save
    // editado à mão de entregar uma medalha que a partida não sustenta.
    const state = { ...start(), tick: TOTAL_TICKS, temperature: 2.9 };
    const clone: GameState = JSON.parse(JSON.stringify(state)) as GameState;

    expect(outcomeOf(clone)).toEqual(outcomeOf(state));
    expect(Object.keys(state)).not.toContain('outcome');
  });
});

describe('a partida inteira', () => {
  /** Roda até acabar, comprando na ordem pedida assim que o PAC permitir. */
  function playthrough(order: readonly string[]): GameState {
    let state = start();
    const pending = [...order];

    for (let i = 0; i < TOTAL_TICKS; i++) {
      if (isFinished(state)) break;

      let bought = true;
      while (bought) {
        bought = false;
        const next = pending.findIndex((id) => canUnlock(state, id).ok);
        if (next >= 0) {
          state = unlockSkill(state, pending[next] as string);
          pending.splice(next, 1);
          bought = true;
        }
      }

      state = advanceTick(state);
    }

    return state;
  }

  it('ACEITE: quem não compra nada perde por temperatura antes de 2100', () => {
    // A contrapartida do aceite do P6-02 ("sem nenhuma habilidade, a partida
    // termina acima de 3 °C"): agora terminar acima de 3 °C **tem
    // consequência**. O docs/CIENCIA.md registra o cruzamento em 2089, que é o
    // que o baselineGrowthPerYear do SSP3-7.0 produz.
    const state = playthrough([]);

    expect(outcomeOf(state)).toEqual({ kind: 'defeat', cause: 'temperature' });
    expect(state.year).toBe(2089);
    expect(state.tick).toBeLessThan(TOTAL_TICKS);
  });

  it('ACEITE: jogando bem, a partida chega viva a 2100 e ganha bronze', () => {
    // **A ordem mudou duas vezes desde que este teste nasceu, e as duas mudanças
    // foram medidas, não achadas.** O P6-08 usava "renda primeiro, depois corte
    // por eficiência"; o P3-04 mediu que os dois nós de renda são uma armadilha
    // — atrasam todo corte em cerca de uma década e a partida acaba mais quente
    // (docs/BALANCEAMENTO.md). Com os eventos do P7-01 cobrando PAC, aquela
    // ordem deixou de alcançar o bronze de vez. A melhor conhecida hoje é só
    // corte, do maior corte por PAC gasto para o menor.
    const cuts = skills
      .map((skill) => ({
        id: skill.id,
        cut: skill.effects.reduce((sum, e) => sum + (e.kind === 'emissionCut' ? e.value : 0), 0),
        cost: skill.cost,
      }))
      .filter((skill) => skill.cut > 0)
      .sort((a, b) => b.cut / b.cost - a.cut / a.cost)
      .map((skill) => skill.id);

    const state = playthrough(cuts);

    expect(state.tick).toBe(TOTAL_TICKS);
    expect(outcomeOf(state)).toEqual({ kind: 'finished', ending: 'horizon', medal: 'bronze' });
  });

  it('a vitória por emissões ≈ 0 é inalcançável com o balanceamento de hoje', () => {
    // **Este teste documenta um problema, não uma qualidade.** A árvore inteira
    // soma 5,5% ao ano de corte e custa 1600 PAC, enquanto 75 anos rendem no
    // máximo ~1125 — ninguém compra tudo, e nem comprar tudo bastaria. Se um
    // ajuste de balanceamento (P3-04, P8-02) tornar o zero líquido alcançável,
    // **é este teste que deve falhar** e ser reescrito. Ele existe para que
    // esse dia seja notado.
    let state = start();
    for (const skill of skills) state = unlockSkill({ ...state, actionPoints: 9999 }, skill.id);
    for (let i = 0; i < TOTAL_TICKS; i++) state = advanceTick(state);

    expect(globalEmissions(state)).toBeGreaterThan(balance.netZeroEmissions);
    expect(outcomeOf(state)).toMatchObject({ ending: 'horizon' });
  });
});
