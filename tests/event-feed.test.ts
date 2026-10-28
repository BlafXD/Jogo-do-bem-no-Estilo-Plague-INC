import { describe, expect, it } from 'vitest';

import { CARD_TICKS } from '../src/engine/events';
import { balance, createInitialState, type ActiveEvent, type GameState } from '../src/engine/state';
import { yearForTick } from '../src/engine/tick';
import { eventCardsView } from '../src/ui/event-cards';
import {
  cardHoldTicks,
  createFeed,
  feedFromState,
  feedRegions,
  FEED_LIMIT,
  updateFeed,
} from '../src/ui/event-feed';

/**
 * A janela de leitura do boletim (INTER-01). O defeito que ela conserta é
 * medido: a 4x, um cartão ficava 2,25 s na tela.
 */

function withCards(tick: number, ...actives: readonly ActiveEvent[]): GameState {
  return { ...createInitialState(2025), tick, year: yearForTick(tick), activeEvents: actives };
}

function card(
  eventId: string,
  ticksRemaining = CARD_TICKS,
  target: 'na' | 'eu' = 'na',
): ActiveEvent {
  return { eventId, target, ticksRemaining, toll: { support: 0, economy: 0, points: 0 } };
}

/** Quantos segundos reais a janela dá, numa velocidade. */
function seconds(speed: number): number {
  return (cardHoldTicks(speed) * balance.realSecondsPerTick) / speed;
}

describe('cardHoldTicks', () => {
  /**
   * O número que abriu o épico: 6 meses a 4x são 2,25 s de leitura, e era essa
   * a reclamação do chat — "muito rápido e sem sentido", no Modo Feira.
   */
  it('a janela antiga dava 2,25 s de leitura no Modo Feira', () => {
    expect((CARD_TICKS * balance.realSecondsPerTick) / 4).toBeCloseTo(2.25, 5);
  });

  it('a janela nova dá os `eventCardSeconds` em qualquer velocidade', () => {
    for (const speed of [1, 2, 4]) {
      expect(seconds(speed)).toBeGreaterThanOrEqual(balance.eventCardSeconds);
    }
  });

  /**
   * O arredondamento é para cima, e o piso é o do engine: a janela da tela
   * nunca pode ser menor que a janela do mundo, senão o cartão sairia do
   * boletim com o mapa ainda marcando a região.
   */
  it('nunca encurta abaixo da janela do engine', () => {
    expect(cardHoldTicks(1)).toBe(CARD_TICKS);
    expect(cardHoldTicks(0.25)).toBe(CARD_TICKS);
  });

  it('cresce com a velocidade', () => {
    expect(cardHoldTicks(4)).toBeGreaterThan(cardHoldTicks(2));
    expect(cardHoldTicks(2)).toBeGreaterThan(cardHoldTicks(1));
  });
});

describe('updateFeed', () => {
  it('um boletim novo não tem cartão nenhum', () => {
    expect(createFeed().cards).toHaveLength(0);
    expect(createFeed().hold).toBe(CARD_TICKS);
  });

  it('guarda o evento que o engine acabou de sortear', () => {
    const feed = updateFeed(createFeed(), withCards(100, card('heatwave')), 4);

    expect(feed.cards).toHaveLength(1);
    expect(feed.cards[0]?.eventId).toBe('heatwave');
    expect(feed.cards[0]?.startTick).toBe(100);
  });

  /**
   * O ponto do arquivo: a 4x o engine descarta o evento em 6 meses e o cartão
   * **continua** em cena, porque 6 meses ali são 2,25 s.
   */
  it('segura o cartão depois de o engine descartar o evento', () => {
    let feed = updateFeed(createFeed(), withCards(100, card('heatwave')), 4);
    // Seis meses depois: o `activeEvents` do engine já está vazio.
    feed = updateFeed(feed, withCards(106), 4);

    expect(feed.cards).toHaveLength(1);
    expect(feed.hold).toBeGreaterThan(CARD_TICKS);
  });

  it('solta o cartão quando a janela vence', () => {
    let feed = updateFeed(createFeed(), withCards(100, card('heatwave')), 4);
    feed = updateFeed(feed, withCards(100 + cardHoldTicks(4)), 4);

    expect(feed.cards).toHaveLength(0);
  });

  it('a 1x a janela é a do engine, e o boletim não guarda nada além dela', () => {
    let feed = updateFeed(createFeed(), withCards(100, card('heatwave')), 1);
    feed = updateFeed(feed, withCards(100 + CARD_TICKS), 1);

    expect(feed.cards).toHaveLength(0);
  });

  it('não duplica um cartão que ainda está em cena nos dois lados', () => {
    let feed = updateFeed(createFeed(), withCards(100, card('heatwave')), 4);
    feed = updateFeed(feed, withCards(101, card('heatwave', CARD_TICKS - 1)), 4);

    expect(feed.cards).toHaveLength(1);
  });

  it('guarda no máximo `FEED_LIMIT` cartões, e descarta os mais velhos', () => {
    let feed = createFeed();
    for (let i = 0; i < FEED_LIMIT + 3; i += 1) {
      feed = updateFeed(feed, withCards(100 + i, card(`evento-${i}`)), 4);
    }

    expect(feed.cards).toHaveLength(FEED_LIMIT);
    // Os que sobraram são os mais novos, em ordem crescente de entrada: o
    // último mês do laço é 106, e o quinto mais velho caiu fora.
    expect(feed.cards.map((c) => c.startTick)).toEqual([103, 104, 105, 106]);
  });
});

describe('feedRegions', () => {
  it('devolve as regiões com cartão em cena, sem repetir', () => {
    let feed = updateFeed(createFeed(), withCards(100, card('heatwave', CARD_TICKS, 'na')), 4);
    feed = updateFeed(feed, withCards(101, card('flood', CARD_TICKS, 'eu')), 4);

    expect([...feedRegions(feed)].sort()).toEqual(['eu', 'na']);
  });

  it('a região sai do mapa junto com o cartão, não antes', () => {
    let feed = updateFeed(createFeed(), withCards(100, card('heatwave')), 4);
    feed = updateFeed(feed, withCards(106), 4);

    expect(feedRegions(feed).has('na')).toBe(true);
  });
});

describe('feedFromState', () => {
  /**
   * O padrão de quem chama a view sem boletim: exatamente o que ela fazia antes
   * do INTER-01. É o que mantém os testes de view e qualquer tela sem relógio
   * respondendo a uma pergunta só sobre o GameState.
   */
  it('é o boletim sem memória: o que o engine tem em cena, na janela do engine', () => {
    const state = withCards(100, card('heatwave'), card('flood', CARD_TICKS - 2, 'eu'));
    const feed = feedFromState(state);

    expect(feed.hold).toBe(CARD_TICKS);
    expect(feed.cards.map((c) => c.eventId)).toEqual(['heatwave', 'flood']);
    expect(feed.cards.map((c) => c.startTick)).toEqual([100, 98]);
  });

  it('a view com e sem boletim diz a mesma coisa quando os dois têm os mesmos cartões', () => {
    const state = withCards(100, card('heatwave'));
    const feed = updateFeed(createFeed(), state, 1);

    expect(eventCardsView(state, false, [], feed).cards).toEqual(eventCardsView(state).cards);
  });
});
