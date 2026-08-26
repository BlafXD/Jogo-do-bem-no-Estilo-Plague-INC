import { describe, expect, it } from 'vitest';
import { globalEmissions } from '../src/engine/climate';
import { recordSnapshot, snapshotOf, timeline } from '../src/engine/history';
import {
  averageSupport,
  balance,
  createInitialState,
  type GameState,
  type Snapshot,
} from '../src/engine/state';
import { advanceTick, TOTAL_TICKS, yearForTick } from '../src/engine/tick';

/** Roda N ticks a partir do começo da partida. */
function run(ticks: number, seed = 2025): GameState {
  let state = createInitialState(seed);
  for (let i = 0; i < ticks; i++) {
    state = advanceTick(state);
  }
  return state;
}

describe('snapshotOf', () => {
  it('leva os seis números do Snapshot do §3', () => {
    const state = run(40);
    const retrato = snapshotOf(state);

    expect(retrato).toEqual({
      tick: state.tick,
      year: state.year,
      temperature: state.temperature,
      emissions: globalEmissions(state),
      cumulativeCO2: state.cumulativeCO2,
      averageSupport: averageSupport(state),
    });
  });

  it('o retrato do tick 0 é a linha de base da partida', () => {
    // É o ponto contra o qual o jogador vai ser lido no fim: o mundo antes de
    // qualquer escolha dele. Se ele se perder, o gráfico da tela final começa
    // com a partida já em andamento.
    const retrato = snapshotOf(createInitialState(1));

    expect(retrato.tick).toBe(0);
    expect(retrato.year).toBe(balance.startYear);
    expect(retrato.temperature).toBe(balance.startTemperature);
    expect(retrato.cumulativeCO2).toBe(0);
    expect(retrato.emissions).toBeCloseTo(balance.startEmissions, 6);
  });
});

describe('recordSnapshot', () => {
  it('grava no aniversário e ignora os outros onze meses', () => {
    const janeiro = run(12);
    const fevereiro = run(13);

    expect(recordSnapshot(janeiro).history).toHaveLength(janeiro.history.length + 1);
    expect(recordSnapshot(fevereiro)).toBe(fevereiro);
  });

  it('não gasta uma cópia do estado quando não tem o que gravar', () => {
    // Onze de cada doze chamadas caem aqui, num laço que roda 900 vezes por
    // partida: devolver o mesmo objeto é a diferença entre não fazer nada e
    // alocar um GameState inteiro para não mudar nada nele.
    const fevereiro = run(1);

    expect(recordSnapshot(fevereiro)).toBe(fevereiro);
  });

  it('é idempotente: o mesmo tick não entra duas vezes', () => {
    // A rede contra o save adulterado — o save.ts confere a forma dos retratos,
    // não se eles combinam com o tick da partida.
    const janeiro = run(12);
    const uma = recordSnapshot(janeiro);

    expect(recordSnapshot(uma)).toBe(uma);
  });

  it('não mexe no estado que recebeu', () => {
    const janeiro = run(12);
    const antes = janeiro.history.length;

    recordSnapshot(janeiro);

    expect(janeiro.history).toHaveLength(antes);
  });
});

describe('o registro que a partida vai deixando', () => {
  it('o que ficou guardado é o que a partida era naquele mês', () => {
    // O teste que pega o erro de um mês de defasagem: fotografar depois do
    // advanceClimate daria retratos parecidos o bastante para ninguém notar no
    // gráfico, e errados.
    let state = createInitialState(2025);
    const esperado: Snapshot[] = [];

    for (let i = 0; i < 120; i++) {
      if (state.tick % balance.ticksPerYear === 0) esperado.push(snapshotOf(state));
      state = advanceTick(state);
    }

    expect(state.history).toEqual(esperado);
  });

  it('um retrato por ano, na ordem, sem buracos', () => {
    const dezAnos = run(120);
    const ticks = dezAnos.history.map((retrato) => retrato.tick);

    expect(ticks).toEqual([0, 12, 24, 36, 48, 60, 72, 84, 96, 108]);
    expect(dezAnos.history.map((retrato) => retrato.year)).toEqual([
      2025, 2026, 2027, 2028, 2029, 2030, 2031, 2032, 2033, 2034,
    ]);
  });

  it('advanceTick não muta o history que recebeu', () => {
    const antes = run(24);
    const historyOriginal = antes.history;

    advanceTick(antes);

    expect(antes.history).toBe(historyOriginal);
    expect(antes.history).toHaveLength(2);
  });

  it('a partida inteira guarda 75 aniversários, de 2025 a 2099', () => {
    // O tick 900 não está aqui, e é de propósito: o advanceTick para antes de
    // rodá-lo. Quem fecha a ponta é o timeline.
    const fim = run(TOTAL_TICKS);
    const ultimo = fim.history[fim.history.length - 1];

    expect(fim.history).toHaveLength(75);
    expect(fim.history[0]?.year).toBe(balance.startYear);
    expect(ultimo?.year).toBe(balance.endYear - 1);
  });
});

describe('timeline', () => {
  it('acrescenta o instante atual ao que já está guardado', () => {
    const meio = run(703);
    const curva = timeline(meio);

    expect(curva).toHaveLength(meio.history.length + 1);
    expect(curva[curva.length - 1]).toEqual(snapshotOf(meio));
  });

  it('uma partida que acaba no meio do ano termina no mês em que acabou', () => {
    // O caso de toda derrota por apoio zero e de todo zero líquido: sem isto, a
    // curva pararia no janeiro anterior e o gráfico contaria uma partida que
    // termina até sete meses antes daquela que o HUD, ao lado, está mostrando.
    const julho = run(703);
    const curva = timeline(julho);

    expect(curva[curva.length - 1]?.tick).toBe(703);
    expect(curva[curva.length - 1]?.year).toBe(yearForTick(703));
  });

  it('no tick 0 a curva é um ponto só, e é a linha de base', () => {
    const curva = timeline(createInitialState(1));

    expect(curva).toHaveLength(1);
    expect(curva[0]?.year).toBe(balance.startYear);
  });

  it('não dobra o ponto quando o instante atual já está guardado', () => {
    const janeiro = recordSnapshot(run(12));

    expect(timeline(janeiro)).toBe(janeiro.history);
  });

  it('ACEITE: o gráfico da tela final tem um ponto por ano, de 2025 a 2100', () => {
    const curva = timeline(run(TOTAL_TICKS));
    const anos = curva.map((retrato) => retrato.year);

    expect(curva).toHaveLength(balance.endYear - balance.startYear + 1);
    expect(anos[0]).toBe(balance.startYear);
    expect(anos[anos.length - 1]).toBe(balance.endYear);
    expect(new Set(anos).size).toBe(anos.length);
  });

  it('ACEITE: a curva sobe de temperatura e os ticks nunca voltam', () => {
    // As duas propriedades que um gráfico de linha assume sem perguntar. A
    // temperatura é catraca de mão única (§2.7): o CO₂ acumulado só cresce.
    const curva = timeline(run(TOTAL_TICKS));

    for (let i = 1; i < curva.length; i++) {
      const anterior = curva[i - 1];
      const atual = curva[i];
      if (anterior === undefined || atual === undefined) throw new Error('curva com buraco');

      expect(atual.tick).toBeGreaterThan(anterior.tick);
      expect(atual.temperature).toBeGreaterThanOrEqual(anterior.temperature);
    }
  });
});
