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
import { balance, createInitialState, REGION_IDS, type GameState } from '../src/engine/state';

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

describe('o apoio público', () => {
  /** O apoio médio global — é o número que o §2.7 usa para dar a partida por perdida. */
  function apoioMedio(estado: GameState): number {
    const soma = REGION_IDS.reduce((total, id) => total + estado.regions[id].support, 0);
    return soma / REGION_IDS.length;
  }

  /** O apoio com que toda região começa, lido do regions.json e não chutado aqui. */
  const inicial = createInitialState(1).regions.na.support;

  it('desgasta por mês, à fração da taxa anual', () => {
    const porMes = balance.supportDecayPerYear / balance.ticksPerYear;

    expect(rodar(1).regions.na.support).toBeCloseTo(inicial - porMes, 6);
    expect(rodar(balance.ticksPerYear).regions.na.support).toBeCloseTo(
      inicial - balance.supportDecayPerYear,
      6,
    );
  });

  it('para no piso de apatia e não desce mais', () => {
    // Do valor inicial até o piso são 200 ticks exatos — ano de 2041.
    const noPiso = rodar((inicial - balance.supportFloor) / (balance.supportDecayPerYear / 12));
    const muitoDepois = rodar(TOTAL_TICKS);

    expect(noPiso.regions.na.support).toBeCloseTo(balance.supportFloor, 6);
    for (const id of REGION_IDS) {
      expect(muitoDepois.regions[id].support).toBe(balance.supportFloor);
    }
  });

  it('encosta no piso em 2041', () => {
    // O ano é fato de balanceamento, não conta derivada das constantes: se eu
    // escrever a taxa errada, os testes acima continuam coerentes consigo
    // mesmos — o piso absorve o erro — e só este aqui percebe.
    let estado = createInitialState(1);
    let tickDoPiso = 0;
    while (estado.regions.na.support > balance.supportFloor) {
      estado = advanceTick(estado);
      tickDoPiso++;
    }

    expect(tickDoPiso).toBe(200);
    expect(yearForTick(tickDoPiso)).toBe(2041);
  });

  it('ACEITE: 2058 deixa de decidir a partida sozinho', () => {
    // Sem o piso, este é o tick exato em que o apoio das 8 regiões chegaria a
    // zero. Como o §2.7 dá derrota por apoio médio zero, toda partida se
    // perderia em 2058 — fizesse o jogador o que fizesse.
    const tickDoZero = inicial / (balance.supportDecayPerYear / balance.ticksPerYear);

    expect(yearForTick(tickDoZero)).toBe(2058);
    expect(apoioMedio(rodar(tickDoZero))).toBeGreaterThan(0);
    expect(apoioMedio(rodar(TOTAL_TICKS))).toBe(balance.supportFloor);
  });

  it('não puxa de volta para cima quem já está abaixo do piso', () => {
    // Cenário do P7-01: um evento derruba uma região a 10. O desgaste do tempo
    // não pode "consertar" isso subindo o apoio de volta até o piso — o piso
    // trava o decaimento, não é um valor de repouso para onde tudo converge.
    const inicio = createInitialState(1);
    const ferida = {
      ...inicio,
      regions: {
        ...inicio.regions,
        af: { ...inicio.regions.af, support: 10 },
        oc: { ...inicio.regions.oc, support: balance.supportFloor },
      },
    };

    const depois = advanceTick(ferida);

    expect(depois.regions.af.support).toBe(10);
    expect(depois.regions.oc.support).toBe(balance.supportFloor);
  });

  it('o desgaste do apoio não atropela o crescimento das emissões', () => {
    // As duas coisas reescrevem o mesmo mapa de regiões, uma depois da outra.
    // Se o tick devolvesse o mapa errado, um dos dois efeitos sumiria em
    // silêncio e só apareceria no fim da partida.
    const antes = createInitialState(1);
    const depois = advanceTick(antes);

    expect(depois.regions.ea.emissions).toBeGreaterThan(antes.regions.ea.emissions);
    expect(depois.regions.ea.support).toBeLessThan(antes.regions.ea.support);
    expect(depois.regions.ea.resilience).toBe(antes.regions.ea.resilience);
    expect(depois.regions.ea.population).toBe(antes.regions.ea.population);
  });

  it('não muta o apoio do estado recebido', () => {
    const antes = createInitialState(3);

    advanceTick(antes);

    expect(antes.regions.na.support).toBe(inicial);
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

describe('o relógio de tempo real', () => {
  /** Roda `frames` quadros de uma taxa fixa, como a UI faria. */
  function rodarEmFps(fps: number, frames: number, speed = 1) {
    const deltaMs = 1000 / fps;
    let estado = createInitialState(2025);
    let relogio = createClock();

    for (let i = 0; i < frames; i++) {
      const passo = advanceRealTime(estado, relogio, deltaMs, speed);
      estado = passo.state;
      relogio = passo.clock;
    }

    return estado;
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
    const primeiro = stepsForElapsed(createClock(), 900);
    const segundo = stepsForElapsed(primeiro.clock, 900);

    expect(primeiro.steps).toBe(0);
    expect(segundo.steps).toBe(1);
    expect(segundo.clock.leftoverMs).toBeCloseTo(300, 6);
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
    const a30 = rodarEmFps(30, 1830);
    const a144 = rodarEmFps(144, 8784);

    expect(a30.tick).toBe(40);
    expect(a144.tick).toBe(40);
    expect(a30).toEqual(a144);
  });

  it('continua igual em corrida longa, sem o resto acumular erro', () => {
    // 601 segundos de tempo real: se o acumulador tivesse deriva, ela
    // apareceria aqui, com 86 544 somas de ponto flutuante.
    const a30 = rodarEmFps(30, 18030);
    const a144 = rodarEmFps(144, 86544);

    expect(a30.tick).toBe(400);
    expect(a144).toEqual(a30);
  });

  it('o erro nunca passa de um tick, mesmo na fronteira', () => {
    // A garantia honesta do acumulador não é "sempre o mesmo número", é "nunca
    // mais de um tick de diferença do ideal". Em cima da fronteira exata, o
    // ponto flutuante escolhe o lado — e um mês de atraso num jogo de 1,5 s
    // por mês é invisível.
    const ideal = 60_000 / (balance.realSecondsPerTick * 1000);

    for (const [fps, quadros] of [
      [30, 1800],
      [60, 3600],
      [144, 8640],
    ] as const) {
      expect(Math.abs(rodarEmFps(fps, quadros).tick - ideal)).toBeLessThanOrEqual(1);
    }
  });

  it('a velocidade multiplica o tempo, não o número de quadros', () => {
    // 10 s a 4x tem que dar o mesmo que 40 s a 1x. Comparar com `1x × 4` seria
    // errado: o floor de 1x descarta um resto que a corrida a 4x aproveita.
    const rapido = rodarEmFps(60, 600, 4);
    const longo = rodarEmFps(60, 2400, 1);

    expect(rapido.tick).toBe(longo.tick);
    expect(rapido).toEqual(longo);
  });

  it('trava a espiral da morte quando a aba volta do segundo plano', () => {
    // Dez minutos entregues num quadro só. Sem teto, seriam 400 ticks de uma
    // vez, a página travaria e o quadro seguinte viria ainda mais atrasado.
    const { steps, clock } = stepsForElapsed(createClock(), 600_000);

    expect(steps).toBe(12);
    expect(clock.leftoverMs).toBe(0);
  });

  it('não muta o estado nem o relógio recebidos', () => {
    const estado = createInitialState(9);
    const relogio = createClock();

    advanceRealTime(estado, relogio, 5000);

    expect(estado.tick).toBe(0);
    expect(relogio.leftoverMs).toBe(0);
  });

  it('a partida inteira a 1x leva os 22,5 minutos que o PLANO.md pede', () => {
    const minutos = (TOTAL_TICKS * balance.realSecondsPerTick) / 60;

    expect(minutos).toBeCloseTo(22.5, 1);
    expect(minutos).toBeGreaterThanOrEqual(20);
    expect(minutos).toBeLessThanOrEqual(30);
    // E o Modo Feira (P7-07) sai quase de graça: a 4x são ~5,6 minutos.
    expect(minutos / 4).toBeLessThan(6);
  });
});
