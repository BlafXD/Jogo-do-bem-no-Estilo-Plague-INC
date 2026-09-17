import { describe, expect, it } from 'vitest';

import { timeline } from '../src/engine/history';
import { MEDAL_CEILING } from '../src/engine/outcome';
import { balance, createInitialState, type GameState } from '../src/engine/state';
import { advanceTick, TOTAL_TICKS } from '../src/engine/tick';
import { hudView } from '../src/ui/hud';
import {
  RULER_BANDS,
  STRIPE_STOPS,
  STRIPE_YEARS,
  rulerMark,
  stripeTicks,
  stripeTone,
  stripesView,
  type Stripe,
} from '../src/ui/stripes';

/**
 * As listras do aquecimento (VIS-04), a metade pura. Roda em node; o que só
 * existe com DOM está no tests/stripes.dom.test.ts.
 */

/** Roda N ticks a partir do começo da partida, sem comprar nada. */
function run(ticks: number, seed = 2025): GameState {
  let state = createInitialState(seed);
  for (let i = 0; i < ticks; i++) {
    state = advanceTick(state);
  }
  return state;
}

/** A posição de um tom na escala inteira, para comparar dois tons. */
const escala = (temperature: number): number => {
  const { segment, mix } = stripeTone(temperature);
  return segment + mix;
};

const pintado = (stripe: Stripe | undefined): boolean => stripe?.lived === true;

describe('a escala das listras', () => {
  it('tem oito paradas, uma para cada cor do tema, em ordem crescente', () => {
    expect(STRIPE_STOPS).toHaveLength(8);

    for (let i = 1; i < STRIPE_STOPS.length; i++) {
      expect(STRIPE_STOPS[i], `parada ${i}`).toBeGreaterThan(STRIPE_STOPS[i - 1] ?? Infinity);
    }
  });

  /**
   * A cor muda de faixa exatamente onde a nota muda. Se o balanceamento mexer
   * num teto, a escala acompanha — é por isso que eles são lidos, e não escritos
   * de novo no stripes.ts.
   */
  it('põe uma parada em cada teto de medalha e na derrota', () => {
    expect(STRIPE_STOPS[1]).toBe(MEDAL_CEILING.gold);
    expect(STRIPE_STOPS[3]).toBe(MEDAL_CEILING.silver);
    expect(STRIPE_STOPS[5]).toBe(MEDAL_CEILING.bronze);
    expect(STRIPE_STOPS[6]).toBe(balance.loseTemperature);
  });

  it('deixa as duas paradas sem regra a meio caminho entre dois tetos', () => {
    expect(STRIPE_STOPS[2]).toBeCloseTo((MEDAL_CEILING.gold + MEDAL_CEILING.silver) / 2);
    expect(STRIPE_STOPS[4]).toBeCloseTo((MEDAL_CEILING.silver + MEDAL_CEILING.bronze) / 2);
  });

  it('começa abaixo da partida e termina além da derrota', () => {
    expect(STRIPE_STOPS[0]).toBeLessThan(balance.startTemperature);
    expect(STRIPE_STOPS.at(-1)).toBeGreaterThan(balance.loseTemperature);
  });

  /**
   * 1,5 °C é o fim do primeiro trecho, e não o começo do segundo. Os dois
   * caminhos dão a mesma cor, mas só um deles é escrito — e é este.
   */
  it('numa parada exata, o ano pega a cor inteira dela', () => {
    expect(stripeTone(STRIPE_STOPS[0] ?? 0)).toEqual({ segment: 0, mix: 0 });

    for (let i = 1; i < STRIPE_STOPS.length; i++) {
      expect(stripeTone(STRIPE_STOPS[i] ?? 0), `parada ${i}`).toEqual({ segment: i - 1, mix: 1 });
    }
  });

  it('entre duas paradas, mistura na proporção do caminho andado', () => {
    const [, ouro = 0, meio = 0] = STRIPE_STOPS;
    const tom = stripeTone(ouro + (meio - ouro) / 4);

    expect(tom.segment).toBe(1);
    expect(tom.mix).toBeCloseTo(0.25);
  });

  it('fora da escala, o tom para na ponta', () => {
    expect(stripeTone(0)).toEqual({ segment: 0, mix: 0 });
    expect(stripeTone(9)).toEqual({ segment: STRIPE_STOPS.length - 2, mix: 1 });
  });

  it('só esquenta com a temperatura', () => {
    let anterior = -1;
    for (let t = 0.9; t <= 3.8; t += 0.01) {
      const agora = escala(t);
      expect(agora, `${t.toFixed(2)} °C`).toBeGreaterThanOrEqual(anterior);
      anterior = agora;
    }
  });
});

describe('a régua de medalhas do HUD', () => {
  it('são as quatro faixas da nota, encostadas, até a derrota', () => {
    expect(RULER_BANDS.map((faixa) => faixa.band)).toEqual(['gold', 'silver', 'bronze', 'over']);

    for (let i = 1; i < RULER_BANDS.length; i++) {
      expect(RULER_BANDS[i]?.from).toBe(RULER_BANDS[i - 1]?.to);
    }

    expect(RULER_BANDS.map((faixa) => faixa.to)).toEqual([
      MEDAL_CEILING.gold,
      MEDAL_CEILING.silver,
      MEDAL_CEILING.bronze,
      balance.loseTemperature,
    ]);
  });

  it('começa na mesma ponta fria das listras', () => {
    expect(RULER_BANDS[0]?.from).toBe(STRIPE_STOPS[0]);
  });

  it('o marcador vai de 0 na ponta fria a 1 na derrota, e não passa disso', () => {
    expect(rulerMark(STRIPE_STOPS[0] ?? 0)).toBe(0);
    expect(rulerMark(balance.loseTemperature)).toBe(1);
    expect(rulerMark(0)).toBe(0);
    expect(rulerMark(9)).toBe(1);
  });

  /**
   * O hud.ts desenha cada faixa com largura proporcional ao trecho dela. O
   * marcador só cai na divisa certa se as duas contas usarem a mesma régua — é
   * o que este teste amarra.
   */
  it('cada teto cai exatamente na divisa entre duas faixas desenhadas', () => {
    const total = RULER_BANDS.reduce((soma, faixa) => soma + (faixa.to - faixa.from), 0);
    let andado = 0;

    for (const faixa of RULER_BANDS) {
      andado += faixa.to - faixa.from;
      expect(rulerMark(faixa.to), faixa.band).toBeCloseTo(andado / total);
    }
  });
});

describe('stripesView', () => {
  it('tem uma listra por ano jogado, de 2025 a 2099', () => {
    const { stripes } = stripesView(createInitialState(2025));

    expect(STRIPE_YEARS).toBe(balance.endYear - balance.startYear);
    expect(stripes).toHaveLength(STRIPE_YEARS);
    expect(stripes[0]?.year).toBe(balance.startYear);
    expect(stripes.at(-1)?.year).toBe(balance.endYear - 1);
  });

  it('na partida recém-começada, só o ano corrente está pintado', () => {
    const { stripes } = stripesView(createInitialState(2025));

    expect(stripes.filter(pintado).map((stripe) => stripe.year)).toEqual([balance.startYear]);
  });

  it('pinta os anos vividos e deixa vazios os que faltam', () => {
    const state = run(10 * balance.ticksPerYear + 5);
    const { stripes } = stripesView(state);

    for (const stripe of stripes) {
      expect(stripe.lived, String(stripe.year)).toBe(stripe.year <= state.year);
    }
  });

  /**
   * A cor de 2027 é a temperatura com que 2028 começou: o fim de 2027. E a do
   * ano corrente é a de agora, e anda mês a mês.
   */
  it('dá a cada ano a temperatura em que ele terminou', () => {
    const state = run(6 * balance.ticksPerYear + 3);
    const { stripes } = stripesView(state);
    const inicioDe = (year: number) =>
      timeline(state).find((point) => point.year === year)?.temperature;

    const ano2027 = stripes.find((stripe) => stripe.year === 2027);
    expect(ano2027?.lived && ano2027.tone).toEqual(stripeTone(inicioDe(2028) ?? NaN));

    const corrente = stripes.find((stripe) => stripe.year === state.year);
    expect(corrente?.lived && corrente.tone).toEqual(stripeTone(state.temperature));
  });

  it('em 2100 os 75 anos estão pintados, e o último fecha com a temperatura final', () => {
    const state = run(TOTAL_TICKS);
    const { stripes } = stripesView(state);

    expect(stripes.every(pintado)).toBe(true);
    const ultimo = stripes.at(-1);
    expect(ultimo?.lived && ultimo.tone).toEqual(stripeTone(state.temperature));
  });

  it('o marcador anda pelo mês, e escreve o ano e a temperatura como o HUD', () => {
    const state = run(123);
    const { marker } = stripesView(state);
    const hud = hudView(state);

    expect(marker.position).toBeCloseTo(123 / TOTAL_TICKS);
    expect(marker.text).toContain(hud.year);
    expect(marker.text).toContain(hud.temperature);
  });

  it('perto das pontas, o rótulo do marcador encosta para dentro da barra', () => {
    expect(stripesView(createInitialState(2025)).marker.edge).toBe('start');
    expect(stripesView(run(TOTAL_TICKS / 2)).marker.edge).toBe('middle');
    expect(stripesView(run(TOTAL_TICKS)).marker.edge).toBe('end');
  });

  it('a frase do leitor de tela diz de que ano a que ano, e o que a cor quer dizer', () => {
    const state = run(8 * balance.ticksPerYear);
    const { label } = stripesView(state);

    expect(label).toContain(String(balance.startYear));
    expect(label).toContain(String(state.year));
    expect(label.toLowerCase()).toContain('temperatura');
  });

  it('não muda o estado da partida', () => {
    const state = run(30);
    const copia = JSON.stringify(state);

    stripesView(state);

    expect(JSON.stringify(state)).toBe(copia);
  });
});

describe('os anos escritos embaixo da barra', () => {
  it('são 2025, 2050, 2075 e 2100, nas pontas e nos terços', () => {
    const ticks = stripeTicks();

    expect(ticks.map((tick) => tick.year)).toEqual(['2025', '2050', '2075', '2100']);
    expect(ticks.map((tick) => tick.position)).toEqual([0, 1 / 3, 2 / 3, 1]);
  });
});
