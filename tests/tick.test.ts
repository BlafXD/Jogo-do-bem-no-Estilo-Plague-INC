import { describe, expect, it } from 'vitest';
import { advanceTick, isOver, TOTAL_TICKS, yearForTick } from '../src/engine/tick';
import { balance, createInitialState, type GameState } from '../src/engine/state';

/** Roda N ticks a partir do começo da partida. */
function rodar(ticks: number, seed = 2025): GameState {
  let estado = createInitialState(seed);
  for (let i = 0; i < ticks; i++) {
    estado = advanceTick(estado);
  }
  return estado;
}

describe('yearForTick', () => {
  it('o primeiro ano inteiro cabe nos 12 primeiros ticks', () => {
    expect(yearForTick(0)).toBe(balance.startYear);
    expect(yearForTick(11)).toBe(balance.startYear);
    expect(yearForTick(12)).toBe(balance.startYear + 1);
  });

  it('o último tick da partida cai exatamente no endYear', () => {
    expect(yearForTick(TOTAL_TICKS - 1)).toBe(balance.endYear - 1);
    expect(yearForTick(TOTAL_TICKS)).toBe(balance.endYear);
  });

  it('a partida tem 900 ticks — 75 anos de 12 meses', () => {
    expect(TOTAL_TICKS).toBe(900);
  });
});

describe('advanceTick', () => {
  it('não muta o estado recebido (§4: funções do engine são puras)', () => {
    const antes = createInitialState(3);

    advanceTick(antes);

    expect(antes.tick).toBe(0);
    expect(antes.year).toBe(balance.startYear);
    expect(antes.actionPoints).toBe(0);
    expect(antes.cumulativeCO2).toBe(0);
  });

  it('vira o ano exatamente no décimo segundo tick', () => {
    // A virada é o único lugar onde um erro de um tick aparece: em qualquer mês
    // do meio do ano, calcular o ano a partir do tick antigo dá o mesmo
    // resultado, e o defeito passa despercebido.
    expect(rodar(balance.ticksPerYear - 1).year).toBe(balance.startYear);
    expect(rodar(balance.ticksPerYear).year).toBe(balance.startYear + 1);
  });

  it('anda um mês por vez e mantém o ano em sincronia com o tick', () => {
    const depois = rodar(25);

    expect(depois.tick).toBe(25);
    expect(depois.year).toBe(yearForTick(25));
    expect(depois.year).toBe(2027);
  });

  it('faz o clima avançar junto — o tempo passar é o que emite CO₂', () => {
    const depois = advanceTick(createInitialState(1));

    expect(depois.cumulativeCO2).toBeGreaterThan(0);
    expect(depois.temperature).toBeGreaterThan(balance.startTemperature);
  });

  it('acumula um ano de PAC a cada doze ticks', () => {
    expect(rodar(balance.ticksPerYear).actionPoints).toBeCloseTo(balance.basePointsPerYear, 6);
    expect(rodar(balance.ticksPerYear * 3).actionPoints).toBeCloseTo(
      balance.basePointsPerYear * 3,
      6,
    );
  });

  it('não sorteia nada, então a posição do gerador não anda', () => {
    // Se um dia o tick passar a sortear, este teste vai falhar — e aí é para
    // atualizá-lo de propósito, não por acidente.
    const inicio = createInitialState(2025);
    expect(rodar(60).rngState).toBe(inicio.rngState);
  });

  it('a mesma seed produz exatamente a mesma partida', () => {
    expect(rodar(120, 42)).toEqual(rodar(120, 42));
  });
});

describe('o fim da partida', () => {
  const fim = rodar(TOTAL_TICKS);

  it('termina em 2100, com os 900 ticks rodados', () => {
    expect(fim.tick).toBe(TOTAL_TICKS);
    expect(fim.year).toBe(balance.endYear);
    expect(isOver(fim)).toBe(true);
  });

  it('ticks depois do fim não mudam mais nada', () => {
    // O relógio do P6-04 entrega vários ticks de uma vez quando um quadro
    // demora; sem essa trava, um engasgo empurraria a partida além de 2100.
    let depois = fim;
    for (let i = 0; i < 20; i++) {
      depois = advanceTick(depois);
    }
    expect(depois).toEqual(fim);
  });

  it('chega no mesmo clima que o climate.test.ts trava, sem habilidade nenhuma', () => {
    expect(fim.temperature).toBeCloseTo(3.3548, 4);
    expect(fim.temperature).toBeGreaterThan(balance.loseTemperature);
  });

  it('entrega 750 PAC ao longo da partida inteira', () => {
    expect(fim.actionPoints).toBeCloseTo(balance.basePointsPerYear * 75, 6);
  });
});
