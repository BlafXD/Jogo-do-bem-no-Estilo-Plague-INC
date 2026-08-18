import { describe, expect, it } from 'vitest';
import { advanceClimate, globalEmissions, temperatureFor } from '../src/engine/climate';
import { balance, createInitialState, REGION_IDS, type GameState } from '../src/engine/state';

const WHOLE_GAME_TICKS = (balance.endYear - balance.startYear) * balance.ticksPerYear;

/** Roda a simulação por N ticks sem nenhuma habilidade comprada. */
function simulate(ticks: number): GameState {
  let state = createInitialState(2025);
  for (let i = 0; i < ticks; i++) {
    state = advanceClimate(state);
  }
  return state;
}

describe('globalEmissions', () => {
  it('soma as 8 regiões e bate com o startEmissions no começo da partida', () => {
    expect(globalEmissions(createInitialState(1))).toBeCloseTo(balance.startEmissions, 6);
  });
});

describe('temperatureFor', () => {
  it('sem CO₂ acumulado, a temperatura é a de abertura', () => {
    expect(temperatureFor(0)).toBe(balance.startTemperature);
  });

  it('reproduz o TCRE do IPCC AR6: 1000 GtCO₂ valem 0,45 °C', () => {
    expect(temperatureFor(1000) - temperatureFor(0)).toBeCloseTo(0.45, 10);
  });

  it('é linear — o que importa é o acumulado, não a emissão do ano', () => {
    const firstStretch = temperatureFor(500) - temperatureFor(0);
    const secondStretch = temperatureFor(4500) - temperatureFor(4000);
    expect(secondStretch).toBeCloseTo(firstStretch, 10);
  });
});

describe('advanceClimate', () => {
  it('não muta o estado recebido (§4: funções do engine são puras)', () => {
    const before = createInitialState(7);
    const originalEmissions = before.regions.ea.emissions;

    advanceClimate(before);

    expect(before.cumulativeCO2).toBe(0);
    expect(before.temperature).toBe(balance.startTemperature);
    expect(before.regions.ea.emissions).toBe(originalEmissions);
  });

  it('um tick acumula um doze avos da emissão anual', () => {
    const after = advanceClimate(createInitialState(1));
    expect(after.cumulativeCO2).toBeCloseTo(balance.startEmissions / balance.ticksPerYear, 6);
  });

  it('doze ticks de crescimento compõem exatamente um ano da taxa anual', () => {
    // Se o crescimento por tick fosse `taxa / 12` em vez da raiz de ordem 12,
    // este teste falharia por um resto pequeno — que ao longo de 900 ticks
    // deixaria de ser pequeno.
    const after = simulate(balance.ticksPerYear);
    const expected = balance.startEmissions * (1 + balance.baselineGrowthPerYear);
    expect(globalEmissions(after)).toBeCloseTo(expected, 6);
  });

  it('mantém as 8 regiões, sem perder nem inventar nenhuma', () => {
    const after = simulate(50);
    expect(Object.keys(after.regions)).toHaveLength(8);
    for (const id of REGION_IDS) {
      expect(after.regions[id].emissions).toBeGreaterThan(0);
    }
  });
});

describe('a partida inteira sem nenhuma habilidade', () => {
  // Este bloco é o aceite do P6-02. Ele existe para provar que não fazer nada
  // perde o jogo — sem isso, o jogador poderia deixar o tempo correr até 2100.
  const end = simulate(WHOLE_GAME_TICKS);

  it('ACEITE: termina acima do limiar de derrota de 3 °C', () => {
    expect(end.temperature).toBeGreaterThan(balance.loseTemperature);
  });

  it('as emissões dobram até 2100, como o cenário SSP3-7.0 do IPCC', () => {
    // Trava o significado da fonte citada em docs/CIENCIA.md: se alguém mexer
    // no baselineGrowthPerYear sem trocar a fonte, este teste acusa.
    expect(globalEmissions(end) / balance.startEmissions).toBeCloseTo(2, 2);
  });

  it('cruza os 3 °C antes do fim da partida, não no último tick', () => {
    let state = createInitialState(2025);
    let lossYear = 0;

    for (let tick = 0; tick < WHOLE_GAME_TICKS; tick++) {
      state = advanceClimate(state);
      if (state.temperature > balance.loseTemperature) {
        lossYear = balance.startYear + Math.floor((tick + 1) / balance.ticksPerYear);
        break;
      }
    }

    expect(lossYear).toBe(2089);
  });

  // Valores de referência, no mesmo espírito dos do rng.ts: sem eles, uma
  // refatoração muda a curva do jogo inteiro e todos os outros testes seguem
  // verdes, porque cada um continua coerente consigo mesmo.
  it('trava a curva: 4410,6 GtCO₂ acumulados e 3,3548 °C em 2100', () => {
    expect(end.cumulativeCO2).toBeCloseTo(4410.636, 2);
    expect(end.temperature).toBeCloseTo(3.3548, 4);
  });
});
