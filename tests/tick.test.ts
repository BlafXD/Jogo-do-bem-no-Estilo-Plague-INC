import { describe, expect, it } from 'vitest';
import {
  advanceRealTime,
  advanceTick,
  createClock,
  isOver,
  stepsForElapsed,
  TOTAL_TICKS,
  yearForTick,
} from '../src/engine/tick';
import {
  averageSupport,
  balance,
  createInitialState,
  REGION_IDS,
  type GameState,
} from '../src/engine/state';

/** Roda N ticks a partir do começo da partida. */
function run(ticks: number, seed = 2025): GameState {
  let state = createInitialState(seed);
  for (let i = 0; i < ticks; i++) {
    state = advanceTick(state);
  }
  return state;
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
    const before = createInitialState(3);

    advanceTick(before);

    expect(before.tick).toBe(0);
    expect(before.year).toBe(balance.startYear);
    expect(before.actionPoints).toBe(0);
    expect(before.cumulativeCO2).toBe(0);
  });

  it('vira o ano exatamente no décimo segundo tick', () => {
    // A virada é o único lugar onde um erro de um tick aparece: em qualquer mês
    // do meio do ano, calcular o ano a partir do tick antigo dá o mesmo
    // resultado, e o defeito passa despercebido.
    expect(run(balance.ticksPerYear - 1).year).toBe(balance.startYear);
    expect(run(balance.ticksPerYear).year).toBe(balance.startYear + 1);
  });

  it('anda um mês por vez e mantém o ano em sincronia com o tick', () => {
    const after = run(25);

    expect(after.tick).toBe(25);
    expect(after.year).toBe(yearForTick(25));
    expect(after.year).toBe(2027);
  });

  it('faz o clima avançar junto — o tempo passar é o que emite CO₂', () => {
    const after = advanceTick(createInitialState(1));

    expect(after.cumulativeCO2).toBeGreaterThan(0);
    expect(after.temperature).toBeGreaterThan(balance.startTemperature);
  });

  it('acumula um ano de PAC a cada doze ticks', () => {
    expect(run(balance.ticksPerYear).actionPoints).toBeCloseTo(balance.basePointsPerYear, 6);
    expect(run(balance.ticksPerYear * 3).actionPoints).toBeCloseTo(
      balance.basePointsPerYear * 3,
      6,
    );
  });

  it('não sorteia nada, então a posição do gerador não anda', () => {
    // Se um dia o tick passar a sortear, este teste vai falhar — e aí é para
    // atualizá-lo de propósito, não por acidente.
    const start = createInitialState(2025);
    expect(run(60).rngState).toBe(start.rngState);
  });

  it('a mesma seed produz exatamente a mesma partida', () => {
    expect(run(120, 42)).toEqual(run(120, 42));
  });
});

describe('o apoio público', () => {
  /** O apoio com que toda região começa, lido do regions.json e não chutado aqui. */
  const initial = createInitialState(1).regions.na.support;

  it('desgasta por mês, à fração da taxa anual', () => {
    const perMonth = balance.supportDecayPerYear / balance.ticksPerYear;

    expect(run(1).regions.na.support).toBeCloseTo(initial - perMonth, 6);
    expect(run(balance.ticksPerYear).regions.na.support).toBeCloseTo(
      initial - balance.supportDecayPerYear,
      6,
    );
  });

  it('para no piso de apatia e não desce mais', () => {
    // Do valor inicial até o piso são 200 ticks exatos — ano de 2041.
    const atFloor = run((initial - balance.supportFloor) / (balance.supportDecayPerYear / 12));
    const muchLater = run(TOTAL_TICKS);

    expect(atFloor.regions.na.support).toBeCloseTo(balance.supportFloor, 6);
    for (const id of REGION_IDS) {
      expect(muchLater.regions[id].support).toBe(balance.supportFloor);
    }
  });

  it('encosta no piso em 2041', () => {
    // O ano é fato de balanceamento, não conta derivada das constantes: se eu
    // escrever a taxa errada, os testes acima continuam coerentes consigo
    // mesmos — o piso absorve o erro — e só este aqui percebe.
    let state = createInitialState(1);
    let floorTick = 0;
    while (state.regions.na.support > balance.supportFloor) {
      state = advanceTick(state);
      floorTick++;
    }

    expect(floorTick).toBe(200);
    expect(yearForTick(floorTick)).toBe(2041);
  });

  it('ACEITE: 2058 deixa de decidir a partida sozinho', () => {
    // Sem o piso, este é o tick exato em que o apoio das 8 regiões chegaria a
    // zero. Como o §2.7 dá derrota por apoio médio zero, toda partida se
    // perderia em 2058 — fizesse o jogador o que fizesse.
    const zeroTick = initial / (balance.supportDecayPerYear / balance.ticksPerYear);

    expect(yearForTick(zeroTick)).toBe(2058);
    expect(averageSupport(run(zeroTick))).toBeGreaterThan(0);
    expect(averageSupport(run(TOTAL_TICKS))).toBe(balance.supportFloor);
  });

  it('não puxa de volta para cima quem já está abaixo do piso', () => {
    // Cenário do P7-01: um evento derruba uma região a 10. O desgaste do tempo
    // não pode "consertar" isso subindo o apoio de volta até o piso — o piso
    // trava o decaimento, não é um valor de repouso para onde tudo converge.
    const start = createInitialState(1);
    const wounded = {
      ...start,
      regions: {
        ...start.regions,
        af: { ...start.regions.af, support: 10 },
        oc: { ...start.regions.oc, support: balance.supportFloor },
      },
    };

    const after = advanceTick(wounded);

    expect(after.regions.af.support).toBe(10);
    expect(after.regions.oc.support).toBe(balance.supportFloor);
  });

  it('o desgaste do apoio não atropela o crescimento das emissões', () => {
    // As duas coisas reescrevem o mesmo mapa de regiões, uma depois da outra.
    // Se o tick devolvesse o mapa errado, um dos dois efeitos sumiria em
    // silêncio e só apareceria no fim da partida.
    const before = createInitialState(1);
    const after = advanceTick(before);

    expect(after.regions.ea.emissions).toBeGreaterThan(before.regions.ea.emissions);
    expect(after.regions.ea.support).toBeLessThan(before.regions.ea.support);
    expect(after.regions.ea.resilience).toBe(before.regions.ea.resilience);
    expect(after.regions.ea.population).toBe(before.regions.ea.population);
  });

  it('não muta o apoio do estado recebido', () => {
    const before = createInitialState(3);

    advanceTick(before);

    expect(before.regions.na.support).toBe(initial);
  });
});

describe('o fim da partida', () => {
  const end = run(TOTAL_TICKS);

  it('termina em 2100, com os 900 ticks rodados', () => {
    expect(end.tick).toBe(TOTAL_TICKS);
    expect(end.year).toBe(balance.endYear);
    expect(isOver(end)).toBe(true);
  });

  it('ticks depois do fim não mudam mais nada', () => {
    // O relógio do P6-04 entrega vários ticks de uma vez quando um quadro
    // demora; sem essa trava, um engasgo empurraria a partida além de 2100.
    let after = end;
    for (let i = 0; i < 20; i++) {
      after = advanceTick(after);
    }
    expect(after).toEqual(end);
  });

  it('chega no mesmo clima que o climate.test.ts trava, sem habilidade nenhuma', () => {
    expect(end.temperature).toBeCloseTo(3.3548, 4);
    expect(end.temperature).toBeGreaterThan(balance.loseTemperature);
  });

  it('entrega 750 PAC ao longo da partida inteira', () => {
    expect(end.actionPoints).toBeCloseTo(balance.basePointsPerYear * 75, 6);
  });
});

describe('o relógio de tempo real', () => {
  /** Roda `frames` quadros de uma taxa fixa, como a UI faria. */
  function runAtFps(fps: number, frames: number, speed = 1) {
    const deltaMs = 1000 / fps;
    let state = createInitialState(2025);
    let clock = createClock();

    for (let i = 0; i < frames; i++) {
      const step = advanceRealTime(state, clock, deltaMs, speed);
      state = step.state;
      clock = step.clock;
    }

    return state;
  }

  it('começa sem resto acumulado', () => {
    expect(createClock().leftoverMs).toBe(0);
  });

  it('tempo menor que um mês não avança nada, mas não se perde', () => {
    const { steps, clock } = stepsForElapsed(createClock(), 500);

    expect(steps).toBe(0);
    expect(clock.leftoverMs).toBe(500);
  });

  it('o resto de um quadro entra no próximo — é isso que faz o passo ser fixo', () => {
    const first = stepsForElapsed(createClock(), 900);
    const second = stepsForElapsed(first.clock, 900);

    expect(first.steps).toBe(0);
    expect(second.steps).toBe(1);
    expect(second.clock.leftoverMs).toBeCloseTo(300, 6);
  });

  it('ACEITE: a simulação avança igual a 30 e a 144 FPS', () => {
    // 61 segundos de tempo real, entregues em 1830 quadros ou em 8784. O que
    // manda é o tempo acumulado, não o número de chamadas.
    //
    // O total é de propósito 61 s e não 60 s: 60 000 ms cai exatamente na
    // fronteira do 40º tick, e ali um erro de ponto flutuante de 1,5
    // nanossegundo decide entre 39 e 40. As duas taxas continuariam de acordo
    // uma com a outra, mas o teste ficaria refém do arredondamento em vez de
    // medir o que interessa.
    const at30 = runAtFps(30, 1830);
    const at144 = runAtFps(144, 8784);

    expect(at30.tick).toBe(40);
    expect(at144.tick).toBe(40);
    expect(at30).toEqual(at144);
  });

  it('continua igual em corrida longa, sem o resto acumular erro', () => {
    // 601 segundos de tempo real: se o acumulador tivesse deriva, ela
    // apareceria aqui, com 86 544 somas de ponto flutuante.
    const at30 = runAtFps(30, 18030);
    const at144 = runAtFps(144, 86544);

    expect(at30.tick).toBe(400);
    expect(at144).toEqual(at30);
  });

  it('o erro nunca passa de um tick, mesmo na fronteira', () => {
    // A garantia honesta do acumulador não é "sempre o mesmo número", é "nunca
    // mais de um tick de diferença do ideal". Em cima da fronteira exata, o
    // ponto flutuante escolhe o lado — e um mês de atraso num jogo de 1,5 s
    // por mês é invisível.
    const ideal = 60_000 / (balance.realSecondsPerTick * 1000);

    for (const [fps, frames] of [
      [30, 1800],
      [60, 3600],
      [144, 8640],
    ] as const) {
      expect(Math.abs(runAtFps(fps, frames).tick - ideal)).toBeLessThanOrEqual(1);
    }
  });

  it('a velocidade multiplica o tempo, não o número de quadros', () => {
    // 10 s a 4x tem que dar o mesmo que 40 s a 1x. Comparar com `1x × 4` seria
    // errado: o floor de 1x descarta um resto que a corrida a 4x aproveita.
    const fast = runAtFps(60, 600, 4);
    const long = runAtFps(60, 2400, 1);

    expect(fast.tick).toBe(long.tick);
    expect(fast).toEqual(long);
  });

  it('trava a espiral da morte quando a aba volta do segundo plano', () => {
    // Dez minutos entregues num quadro só. Sem teto, seriam 400 ticks de uma
    // vez, a página travaria e o quadro seguinte viria ainda mais atrasado.
    const { steps, clock } = stepsForElapsed(createClock(), 600_000);

    expect(steps).toBe(12);
    expect(clock.leftoverMs).toBe(0);
  });

  it('não muta o estado nem o relógio recebidos', () => {
    const state = createInitialState(9);
    const clock = createClock();

    advanceRealTime(state, clock, 5000);

    expect(state.tick).toBe(0);
    expect(clock.leftoverMs).toBe(0);
  });

  it('a partida inteira a 1x leva os 22,5 minutos que o PLANO.md pede', () => {
    const minutes = (TOTAL_TICKS * balance.realSecondsPerTick) / 60;

    expect(minutes).toBeCloseTo(22.5, 1);
    expect(minutes).toBeGreaterThanOrEqual(20);
    expect(minutes).toBeLessThanOrEqual(30);
    // E o Modo Feira (P7-07) sai quase de graça: a 4x são ~5,6 minutos.
    expect(minutes / 4).toBeLessThan(6);
  });
});

describe('o predicado de parada (P6-08)', () => {
  /** Um lote grande o bastante para pedir os 12 passos do teto. */
  const BURST_MS = balance.realSecondsPerTick * 1000 * 12;

  it('sem predicado, o lote inteiro roda — o padrão não para nada', () => {
    const { state } = advanceRealTime(createInitialState(1), createClock(), BURST_MS);

    expect(state.tick).toBe(12);
  });

  it('para no passo exato em que a partida acaba, no meio do lote', () => {
    // É o motivo de o predicado existir. A aba volta do segundo plano e o
    // quadro entrega doze meses de uma vez; se a partida acabou no terceiro,
    // os outros nove não podem acontecer — o jogador leria no cartão de fim um
    // mundo diferente daquele em que ele perdeu.
    const { state } = advanceRealTime(
      createInitialState(1),
      createClock(),
      BURST_MS,
      1,
      (s) => s.tick >= 3,
    );

    expect(state.tick).toBe(3);
  });

  it('não avança nada quando a partida já tinha acabado', () => {
    const before = createInitialState(1);
    const { state } = advanceRealTime(before, createClock(), BURST_MS, 1, () => true);

    expect(state).toBe(before);
  });

  it('o relógio consome o tempo mesmo com a simulação parada', () => {
    // O resto do mês não é guardado para depois: a partida acabou e não há
    // "depois". Guardá-lo faria o primeiro mês da partida seguinte chegar
    // adiantado, que é o mesmo defeito que o handleReset evita zerando o Clock.
    const { clock } = advanceRealTime(createInitialState(1), createClock(), 1000, 1, () => true);

    expect(clock.leftoverMs).toBe(1000);
  });
});
