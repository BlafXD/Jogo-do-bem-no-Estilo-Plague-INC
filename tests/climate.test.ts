import { describe, expect, it } from 'vitest';
import { advanceClimate, globalEmissions, temperatureFor } from '../src/engine/climate';
import { balance, createInitialState, REGION_IDS, type GameState } from '../src/engine/state';

const TICKS_DA_PARTIDA = (balance.endYear - balance.startYear) * balance.ticksPerYear;

/** Roda a simulação por N ticks sem nenhuma habilidade comprada. */
function simular(ticks: number): GameState {
  let estado = createInitialState(2025);
  for (let i = 0; i < ticks; i++) {
    estado = advanceClimate(estado);
  }
  return estado;
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
    const primeiroTrecho = temperatureFor(500) - temperatureFor(0);
    const segundoTrecho = temperatureFor(4500) - temperatureFor(4000);
    expect(segundoTrecho).toBeCloseTo(primeiroTrecho, 10);
  });
});

describe('advanceClimate', () => {
  it('não muta o estado recebido (§4: funções do engine são puras)', () => {
    const antes = createInitialState(7);
    const emissaoOriginal = antes.regions.ea.emissions;

    advanceClimate(antes);

    expect(antes.cumulativeCO2).toBe(0);
    expect(antes.temperature).toBe(balance.startTemperature);
    expect(antes.regions.ea.emissions).toBe(emissaoOriginal);
  });

  it('um tick acumula um doze avos da emissão anual', () => {
    const depois = advanceClimate(createInitialState(1));
    expect(depois.cumulativeCO2).toBeCloseTo(balance.startEmissions / balance.ticksPerYear, 6);
  });

  it('doze ticks de crescimento compõem exatamente um ano da taxa anual', () => {
    // Se o crescimento por tick fosse `taxa / 12` em vez da raiz de ordem 12,
    // este teste falharia por um resto pequeno — que ao longo de 900 ticks
    // deixaria de ser pequeno.
    const depois = simular(balance.ticksPerYear);
    const esperado = balance.startEmissions * (1 + balance.baselineGrowthPerYear);
    expect(globalEmissions(depois)).toBeCloseTo(esperado, 6);
  });

  it('mantém as 8 regiões, sem perder nem inventar nenhuma', () => {
    const depois = simular(50);
    expect(Object.keys(depois.regions)).toHaveLength(8);
    for (const id of REGION_IDS) {
      expect(depois.regions[id].emissions).toBeGreaterThan(0);
    }
  });
});

describe('a partida inteira sem nenhuma habilidade', () => {
  // Este bloco é o aceite do P6-02. Ele existe para provar que não fazer nada
  // perde o jogo — sem isso, o jogador poderia deixar o tempo correr até 2100.
  const fim = simular(TICKS_DA_PARTIDA);

  it('ACEITE: termina acima do limiar de derrota de 3 °C', () => {
    expect(fim.temperature).toBeGreaterThan(balance.loseTemperature);
  });

  it('as emissões dobram até 2100, como o cenário SSP3-7.0 do IPCC', () => {
    // Trava o significado da fonte citada em docs/CIENCIA.md: se alguém mexer
    // no baselineGrowthPerYear sem trocar a fonte, este teste acusa.
    expect(globalEmissions(fim) / balance.startEmissions).toBeCloseTo(2, 2);
  });

  it('cruza os 3 °C antes do fim da partida, não no último tick', () => {
    let estado = createInitialState(2025);
    let anoDaDerrota = 0;

    for (let tick = 0; tick < TICKS_DA_PARTIDA; tick++) {
      estado = advanceClimate(estado);
      if (estado.temperature > balance.loseTemperature) {
        anoDaDerrota = balance.startYear + Math.floor((tick + 1) / balance.ticksPerYear);
        break;
      }
    }

    expect(anoDaDerrota).toBe(2089);
  });

  // Valores de referência, no mesmo espírito dos do rng.ts: sem eles, uma
  // refatoração muda a curva do jogo inteiro e todos os outros testes seguem
  // verdes, porque cada um continua coerente consigo mesmo.
  it('trava a curva: 4410,6 GtCO₂ acumulados e 3,3548 °C em 2100', () => {
    expect(fim.cumulativeCO2).toBeCloseTo(4410.636, 2);
    expect(fim.temperature).toBeCloseTo(3.3548, 4);
  });
});
