import { describe, expect, it } from 'vitest';

import {
  advanceEvents,
  applyEvent,
  CARD_TICKS,
  damageMultiplier,
  drawEvent,
  eligibleEvents,
  eventById,
  isCritical,
  startTickOf,
  weightFor,
} from '../src/engine/events';
import {
  averageSupport,
  balance,
  climateEvents,
  createInitialState,
  parseEvents,
  REGION_IDS,
  type ClimateEvent,
  type GameState,
  type RawClimateEvent,
} from '../src/engine/state';
import { advanceTick, TOTAL_TICKS } from '../src/engine/tick';

/** Um evento cru mínimo e válido, para os testes de validação partirem dele. */
function raw(overrides: Partial<RawClimateEvent> = {}): RawClimateEvent {
  return {
    id: 'teste',
    name: 'Evento de teste',
    tempThreshold: 1.5,
    baseWeight: 1,
    targets: 'any',
    impact: { support: 1, economy: 1, points: 1 },
    mitigatedByResilience: true,
    fact: 'Um fato.',
    ...overrides,
  };
}

/** Roda N ticks a partir do começo. */
function run(ticks: number, seed = 2025): GameState {
  let state = createInitialState(seed);
  for (let i = 0; i < ticks; i += 1) state = advanceTick(state);
  return state;
}

describe('parseEvents', () => {
  it('aceita o events.json do repositório, com os 10 eventos', () => {
    expect(climateEvents).toHaveLength(10);
  });

  it('recusa id repetido, vazio, e campo de texto em branco', () => {
    expect(() => parseEvents([raw(), raw()])).toThrow(/mais de uma vez/);
    expect(() => parseEvents([raw({ id: '  ' })])).toThrow(/sem id/);
    expect(() => parseEvents([raw({ name: '' })])).toThrow(/sem name/);
    expect(() => parseEvents([raw({ fact: '   ' })])).toThrow(/sem fact/);
  });

  it('recusa peso e limiar que não fazem sentido', () => {
    expect(() => parseEvents([raw({ baseWeight: 0 })])).toThrow(/baseWeight/);
    expect(() => parseEvents([raw({ baseWeight: Number.NaN })])).toThrow(/baseWeight/);
    expect(() => parseEvents([raw({ tempThreshold: -1 })])).toThrow(/tempThreshold/);
  });

  it('recusa impacto negativo — o campo é dano, não presente', () => {
    // Um menos digitado por engano criaria um evento que **melhora** a partida
    // do jogador, e nada mais no jogo perceberia.
    expect(() => parseEvents([raw({ impact: { support: -1, economy: 1, points: 1 } })])).toThrow(
      /impact.support/,
    );
    expect(() => parseEvents([raw({ impact: { support: 1, economy: -2, points: 1 } })])).toThrow(
      /impact.economy/,
    );
  });

  it('recusa região desconhecida, lista vazia e texto que não seja "any"', () => {
    // Sem isto, um id errado produziria um evento que nunca acerta ninguém —
    // falha silenciosa, que é a pior espécie num arquivo editado à mão.
    expect(() => parseEvents([raw({ targets: ['na', 'xx'] })])).toThrow(/xx/);
    expect(() => parseEvents([raw({ targets: [] })])).toThrow(/targets vazio/);
    expect(() => parseEvents([raw({ targets: 'todas' })])).toThrow(/todas/);
  });

  it('recusa arquivo sem evento nenhum', () => {
    expect(() => parseEvents([])).toThrow(/nenhum evento/);
  });

  it('todo evento do repositório mira regiões que existem', () => {
    for (const event of climateEvents) {
      if (event.targets === 'any') continue;
      for (const id of event.targets) {
        expect(REGION_IDS).toContain(id);
      }
    }
  });
});

describe('o peso cresce com a temperatura', () => {
  const event: ClimateEvent = {
    ...raw({ tempThreshold: 2, baseWeight: 0.5 }),
    targets: 'any',
  } as ClimateEvent;

  it('vale zero abaixo do limiar — o evento nem entra no sorteio', () => {
    expect(weightFor(event, 1.99)).toBe(0);
    expect(weightFor(event, 0)).toBe(0);
  });

  it('vale o peso de base exatamente no limiar', () => {
    expect(weightFor(event, 2)).toBeCloseTo(0.5, 6);
  });

  it('segue a fórmula do §2.5 acima do limiar', () => {
    // peso = baseWeight × (1 + eventWeightPerDegree × (T − limiar))
    const esperado = 0.5 * (1 + balance.eventWeightPerDegree * 1);
    expect(weightFor(event, 3)).toBeCloseTo(esperado, 6);
  });

  it('ACEITE: o mundo piora — mais eventos ficam possíveis, e mais frequentes', () => {
    const frio = eligibleEvents(balance.startTemperature);
    const quente = eligibleEvents(2.5);
    const soma = (list: readonly { readonly weight: number }[]) =>
      list.reduce((total, e) => total + e.weight, 0);

    expect(quente.length).toBeGreaterThan(frio.length);
    expect(soma(quente)).toBeGreaterThan(soma(frio) * 5);
  });

  it('no começo da partida quase nada está destravado', () => {
    // É o que dá ao jogador uma década para agir antes de o mundo cobrar.
    expect(eligibleEvents(balance.startTemperature)).toHaveLength(1);
  });
});

describe('drawEvent', () => {
  it('não sorteia nada quando nenhum evento está destravado, e não gasta o gerador', () => {
    const abaixoDeTudo = 0;
    const before = createInitialState(7).rngState;
    const { draw, rngState } = drawEvent(abaixoDeTudo, before);

    expect(draw).toBeNull();
    expect(rngState).toBe(before);
  });

  it('é determinístico: mesmo estado do gerador, mesmo sorteio', () => {
    const state = createInitialState(99).rngState;
    expect(drawEvent(2.5, state)).toEqual(drawEvent(2.5, state));
  });

  it('anda com o gerador mesmo quando não sorteia nada', () => {
    // Se o estado não andasse num mês sem evento, o mês seguinte repetiria o
    // mesmo sorteio para sempre — a partida travaria num laço invisível.
    const before = createInitialState(3).rngState;
    let state = before;
    let semEvento = 0;

    for (let i = 0; i < 40; i += 1) {
      const step = drawEvent(balance.startTemperature, state);
      if (step.draw === null) semEvento += 1;
      expect(step.rngState).not.toBe(state);
      state = step.rngState;
    }

    expect(semEvento).toBeGreaterThan(0);
  });

  it('só mira as regiões que o evento lista', () => {
    let state = createInitialState(11).rngState;
    let vistos = 0;

    for (let i = 0; i < 2000 && vistos < 50; i += 1) {
      const step = drawEvent(3, state);
      state = step.rngState;
      if (step.draw === null) continue;
      vistos += 1;
      const { event, target } = step.draw;
      if (event.targets !== 'any') expect(event.targets).toContain(target);
      else expect(REGION_IDS).toContain(target);
    }

    expect(vistos).toBeGreaterThan(10);
  });
});

describe('a resiliência mitiga, mas nunca zera', () => {
  const start = createInitialState(1);
  const mitigado = climateEvents.find((e) => e.mitigatedByResilience);
  const nao = climateEvents.find((e) => !e.mitigatedByResilience);

  it('resiliência 0 deixa o dano passar inteiro', () => {
    if (mitigado === undefined) throw new Error('sem evento mitigável');
    expect(damageMultiplier(mitigado, { ...start.regions.na, resilience: 0 })).toBe(1);
  });

  it('resiliência 100 não zera: o piso segura em 0,25', () => {
    // Sem o piso, a árvore inteira levaria as 8 regiões a 100 de resiliência e o
    // último nó viraria botão de imunidade.
    if (mitigado === undefined) throw new Error('sem evento mitigável');
    expect(damageMultiplier(mitigado, { ...start.regions.na, resilience: 100 })).toBe(0.25);
  });

  it('quem não é mitigável ignora a resiliência inteira', () => {
    if (nao === undefined) throw new Error('sem evento não-mitigável');
    expect(damageMultiplier(nao, { ...start.regions.na, resilience: 100 })).toBe(1);
  });
});

describe('applyEvent', () => {
  const start = createInitialState(1);
  const event = climateEvents.find((e) => e.id === 'cyclone');

  it('ACEITE: fura o piso de apatia — a derrota por apoio deixou de ser decorativa', () => {
    // A regra do §2.7 existe desde o P6-08 e nada no jogo conseguia disparar.
    if (event === undefined) throw new Error('evento sumiu');
    const naBorda: GameState = {
      ...start,
      regions: { ...start.regions, la: { ...start.regions.la, support: 1, resilience: 0 } },
    };

    const depois = applyEvent(naBorda, { event, target: 'la' });
    expect(depois.regions.la.support).toBe(0);
    expect(depois.regions.la.support).toBeLessThan(balance.supportFloor);
  });

  it('nunca deixa apoio, economia ou PAC negativos', () => {
    if (event === undefined) throw new Error('evento sumiu');
    const vazio: GameState = {
      ...start,
      actionPoints: 0,
      regions: {
        ...start.regions,
        la: { ...start.regions.la, support: 0, economy: 0, resilience: 0 },
      },
    };

    const depois = applyEvent(vazio, { event, target: 'la' });
    expect(depois.regions.la.support).toBe(0);
    expect(depois.regions.la.economy).toBe(0);
    expect(depois.actionPoints).toBe(0);
  });

  it('atinge só a região sorteada', () => {
    if (event === undefined) throw new Error('evento sumiu');
    const depois = applyEvent(start, { event, target: 'la' });

    for (const id of REGION_IDS) {
      if (id === 'la') continue;
      expect(depois.regions[id]).toEqual(start.regions[id]);
    }
  });

  it('põe o cartão em cena e não muta o estado recebido', () => {
    if (event === undefined) throw new Error('evento sumiu');
    const antes = start.regions.la.support;
    const depois = applyEvent(start, { event, target: 'la' });

    expect(depois.activeEvents).toHaveLength(1);
    expect(depois.activeEvents[0]?.eventId).toBe('cyclone');
    expect(depois.activeEvents[0]?.target).toBe('la');
    expect(start.regions.la.support).toBe(antes);
    expect(start.activeEvents).toHaveLength(0);
  });
});

describe('advanceEvents', () => {
  it('envelhece o cartão e o descarta quando vence', () => {
    const start = createInitialState(5);
    const comCartao: GameState = {
      ...start,
      activeEvents: [{ eventId: 'heatwave', target: 'na', ticksRemaining: 1 }],
    };

    expect(advanceEvents(comCartao).activeEvents.some((a) => a.eventId === 'heatwave')).toBe(false);
  });

  it('não deixa cartão acumular sem fim ao longo da partida', () => {
    const end = run(TOTAL_TICKS);
    expect(end.activeEvents.length).toBeLessThan(10);
  });
});

describe('a partida inteira, com eventos', () => {
  it('ACEITE: quem não faz nada continua perdendo por temperatura em 2089', () => {
    // O aceite do P6-02 e do P6-08 sobrevive ao P7-01: os eventos pressionam o
    // apoio, mas quem não faz nada ainda é o clima que mata, e no mesmo ano.
    let state = createInitialState(2025);
    let ano: number | null = null;

    for (let i = 0; i < TOTAL_TICKS; i += 1) {
      state = advanceTick(state);
      if (ano === null && state.temperature > balance.loseTemperature) ano = state.year;
    }

    expect(ano).toBe(2089);
  });

  it('ACEITE: os eventos derrubam o apoio bem abaixo do piso ao longo do século', () => {
    // Antes do P7-01 o apoio médio parava em 25 e ficava lá para sempre.
    const end = run(TOTAL_TICKS);
    expect(averageSupport(end)).toBeLessThan(balance.supportFloor / 2);
  });

  it('a mesma seed produz exatamente a mesma sequência de eventos', () => {
    expect(run(400, 77).activeEvents).toEqual(run(400, 77).activeEvents);
    expect(run(400, 77).regions).toEqual(run(400, 77).regions);
  });

  it('seeds diferentes produzem partidas diferentes', () => {
    expect(run(400, 1).regions).not.toEqual(run(400, 2).regions);
  });

  it('todo evento do repositório é alcançável antes de 2100', () => {
    // Um evento com limiar acima da temperatura máxima da partida seria conteúdo
    // escrito, revisado e nunca visto por ninguém.
    const semCompras = run(TOTAL_TICKS);
    for (const event of climateEvents) {
      expect(event.tempThreshold).toBeLessThan(semCompras.temperature);
    }
  });
});

// ------------------------------------------------------------------ P7-02 ---

describe('eventById', () => {
  it('acha os 10 do catálogo e devolve undefined para o que não existe', () => {
    for (const event of climateEvents) expect(eventById(event.id)).toBe(event);
    expect(eventById('evento-que-nao-existe')).toBeUndefined();
  });
});

describe('startTickOf', () => {
  it('um cartão recém-criado começou neste tick', () => {
    expect(startTickOf({ eventId: 'x', target: 'na', ticksRemaining: CARD_TICKS }, 40)).toBe(40);
  });

  it('cada tick a menos no cartão é um mês a mais de idade', () => {
    for (let age = 0; age < CARD_TICKS; age += 1) {
      const active = { eventId: 'x', target: 'na' as const, ticksRemaining: CARD_TICKS - age };
      expect(startTickOf(active, 100)).toBe(100 - age);
    }
  });

  it('ACEITE: a idade deduzida bate com o tick real, numa partida de verdade', () => {
    // **Este é o teste que segura o P7-02 inteiro.** O `startTickOf` deduz a
    // idade do `ticksRemaining` em vez de gravá-la, e a dedução só vale
    // enquanto o `advanceEvents` envelhecer todo cartão em 1 por tick e criar
    // no máximo um por tick. Conferir a aritmética contra ela mesma não
    // provaria nada; o que prova é rodar a partida e anotar, por fora, o tick
    // em que cada evento de fato entrou.
    //
    // Se um dia a duração do cartão variar por evento, é aqui que quebra — e
    // quebra ruidosamente, em vez de a UI passar a pausar no evento errado.
    let state = createInitialState(2025);
    const realStart = new Map<string, number>();
    let conferidos = 0;

    for (let i = 0; i < TOTAL_TICKS; i += 1) {
      state = advanceTick(state);

      // **No máximo um cartão novo por tick** — a invariante de que a dedução
      // depende. Com dois, dois eventos diferentes nasceriam no mesmo tick e a
      // chave `id@tick` do cartão deixaria de ser única.
      const fresh = state.activeEvents.filter((a) => a.ticksRemaining === CARD_TICKS);
      expect(fresh.length).toBeLessThanOrEqual(1);

      const born = fresh[0];
      if (born !== undefined) realStart.set(`${born.eventId}@${state.tick}`, state.tick);

      for (const active of state.activeEvents) {
        const deduzido = startTickOf(active, state.tick);
        expect(realStart.get(`${active.eventId}@${deduzido}`)).toBe(deduzido);
        conferidos += 1;
      }
    }

    // Sem isto o teste passaria com a lista sempre vazia.
    expect(conferidos).toBeGreaterThan(1000);
  });

  it('o cartão vive exatamente CARD_TICKS meses', () => {
    const start = createInitialState(9);
    let state: GameState = {
      ...start,
      activeEvents: [{ eventId: 'heatwave', target: 'na', ticksRemaining: CARD_TICKS }],
    };

    for (let i = 1; i < CARD_TICKS; i += 1) {
      state = { ...advanceEvents(state), rngState: state.rngState };
      expect(state.activeEvents.some((a) => a.eventId === 'heatwave')).toBe(true);
    }

    state = { ...advanceEvents(state), rngState: state.rngState };
    // Pode haver outro `heatwave` sorteado no caminho; o que não pode
    // sobreviver é o cartão original, e ele é o único que chegaria a 0.
    expect(state.activeEvents.every((a) => a.ticksRemaining > 0)).toBe(true);
  });
});

describe('isCritical', () => {
  it('crítico é o que ameaça a derrota por apoio do §2.7', () => {
    for (const event of climateEvents) {
      expect(isCritical(event)).toBe(event.impact.support >= balance.criticalEventSupport);
    }
  });

  it('com o balanceamento de hoje, são a ressaca e o colapso de safra', () => {
    // O número escolhido está medido em docs/BALANCEAMENTO.md: 10 pausas numa
    // partida bem jogada. Este teste é o alarme de que mexer no
    // `criticalEventSupport` muda quantas vezes o jogo interrompe quem joga.
    const criticos = climateEvents.filter(isCritical).map((e) => e.id);
    expect(criticos).toEqual(['storm-surge', 'crop-failure']);
  });

  it('nenhum evento crítico é alcançável antes de 2 °C', () => {
    // É o que faz a auto-pausa aparecer só na segunda metade da partida. Se um
    // evento crítico ganhasse limiar baixo, o jogo passaria a parar sozinho na
    // primeira década — justamente a que o P7-01 deixou silenciosa de propósito.
    for (const event of climateEvents.filter(isCritical)) {
      expect(event.tempThreshold).toBeGreaterThanOrEqual(2);
    }
  });
});
