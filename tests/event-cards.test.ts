import { describe, expect, it } from 'vitest';

import { ui } from '../src/data/i18n';
import { CARD_TICKS, isCritical } from '../src/engine/events';
import {
  balance,
  climateEvents,
  createInitialState,
  type ActiveEvent,
  type GameState,
} from '../src/engine/state';
import { isFinished } from '../src/engine/outcome';
import { advanceTick, TOTAL_TICKS, yearForTick } from '../src/engine/tick';
import { eventCardsView, newestCriticalTick } from '../src/ui/event-cards';

/**
 * O núcleo puro dos cartões de evento (P7-02). Roda em node — o que só existe
 * com DOM (esconder a seção, o `aria-live`, reconstruir a lista só quando ela
 * muda) está no tests/event-cards.dom.test.ts.
 */

const start = (): GameState => createInitialState(2025);

/** Um estado num tick escolhido, com os cartões que o teste quiser. */
function withCards(tick: number, ...actives: readonly ActiveEvent[]): GameState {
  return { ...start(), tick, year: yearForTick(tick), activeEvents: actives };
}

function card(eventId: string, ticksRemaining = CARD_TICKS): ActiveEvent {
  return { eventId, target: 'na', ticksRemaining };
}

const CRITICO = climateEvents.filter(isCritical);
const MODERADO = climateEvents.filter((e) => !isCritical(e));

describe('eventCardsView', () => {
  it('não devolve cartão nenhum numa partida que acabou de começar', () => {
    expect(eventCardsView(start()).cards).toHaveLength(0);
  });

  it('traz nome, região e o fato real de cada evento em cena', () => {
    const state = withCards(120, card('heatwave'));
    const [view] = eventCardsView(state).cards;
    const evento = climateEvents.find((e) => e.id === 'heatwave');

    expect(view?.name).toBe(evento?.name);
    expect(view?.fact).toBe(evento?.fact);
    // O fato é a razão de o cartão existir: sem ele, o P7-02 devolve dano sem
    // explicação, que é o que o P7-01 deixou pendente.
    expect(view?.fact.length).toBeGreaterThan(20);
  });

  it('o cabeçalho diz a região atingida e o ano em que o evento entrou', () => {
    // O ano é o do **começo** do cartão, não o de agora: um cartão de seis
    // meses pode atravessar a virada do ano, e dizer "2088" para um evento de
    // dezembro de 2087 seria mentir sobre quando o mundo cobrou.
    const tick = 12 * 63 + 11; // dezembro do 64º ano de partida
    const state = withCards(tick + 2, card('flood', CARD_TICKS - 2));
    const [view] = eventCardsView(state).cards;

    expect(view?.where).toBe(ui.events.where('América do Norte', String(yearForTick(tick))));
    expect(yearForTick(tick)).not.toBe(yearForTick(tick + 2));
  });

  it('classifica a gravidade pelo isCritical do engine, com ícone e rótulo', () => {
    const critico = CRITICO[0];
    const moderado = MODERADO[0];
    if (critico === undefined || moderado === undefined) throw new Error('catálogo vazio');

    const { cards } = eventCardsView(withCards(600, card(critico.id), card(moderado.id, 3)));
    const porId = new Map(cards.map((c) => [c.name, c]));

    expect(porId.get(critico.name)?.severity).toBe('critical');
    expect(porId.get(critico.name)?.severityLabel).toBe(ui.events.severity.critical.label);
    expect(porId.get(moderado.name)?.severity).toBe('moderate');
    expect(porId.get(moderado.name)?.severityIcon).toBe(ui.events.severity.moderate.icon);
  });

  it('ordena do mais recente para o mais antigo', () => {
    const state = withCards(
      500,
      card('heatwave', 2),
      card('flood', CARD_TICKS),
      card('drought', 4),
    );
    expect(eventCardsView(state).cards.map((c) => c.name)).toEqual([
      climateEvents.find((e) => e.id === 'flood')?.name,
      climateEvents.find((e) => e.id === 'drought')?.name,
      climateEvents.find((e) => e.id === 'heatwave')?.name,
    ]);
  });

  it('a ordem sai do ticksRemaining, não da ordem do array', () => {
    // O `applyEvent` sempre acrescenta no fim, então hoje as duas coincidem.
    // Depender disso seria depender de um detalhe interno de outro módulo.
    const antigo = card('heatwave', 1);
    const novo = card('flood', CARD_TICKS);
    const numaOrdem = eventCardsView(withCards(500, novo, antigo)).cards.map((c) => c.key);
    const naOutra = eventCardsView(withCards(500, antigo, novo)).cards.map((c) => c.key);

    expect(numaOrdem).toEqual(naOutra);
  });

  it('a chave é única e estável enquanto o cartão envelhece', () => {
    // É o que permite ao DOM não ser reconstruído a cada mês.
    const chaveNoTick = (tick: number, restante: number): string | undefined =>
      eventCardsView(withCards(tick, card('heatwave', restante))).cards[0]?.key;

    expect(chaveNoTick(500, CARD_TICKS)).toBe(chaveNoTick(503, CARD_TICKS - 3));
    expect(chaveNoTick(500, CARD_TICKS)).not.toBe(chaveNoTick(501, CARD_TICKS));
  });

  it('ignora em silêncio um id que não existe mais no catálogo', () => {
    // Um save gravado antes de alguém renomear um evento no events.json. Um
    // cartão sem nome e sem fato é pior que cartão nenhum, e recusar o save
    // inteiro jogaria fora vinte minutos de partida por causa de uma vitrine.
    const state = withCards(400, card('evento-apagado'), card('heatwave'));
    expect(eventCardsView(state).cards).toHaveLength(1);
  });

  it('nunca passa de CARD_TICKS cartões numa partida de verdade', () => {
    let state = start();
    let maior = 0;

    for (let i = 0; i < TOTAL_TICKS; i += 1) {
      state = advanceTick(state);
      maior = Math.max(maior, eventCardsView(state).cards.length);
    }

    expect(maior).toBeGreaterThan(1);
    expect(maior).toBeLessThanOrEqual(CARD_TICKS);
  });
});

describe('o aviso da auto-pausa', () => {
  const critico = CRITICO[0];

  it('fica vazio enquanto o tempo corre', () => {
    if (critico === undefined) throw new Error('sem evento crítico');
    expect(eventCardsView(withCards(600, card(critico.id)), false).notice).toBe('');
  });

  it('nomeia o evento crítico que parou o relógio', () => {
    if (critico === undefined) throw new Error('sem evento crítico');
    const { notice } = eventCardsView(withCards(600, card(critico.id)), true);

    expect(notice).toBe(ui.events.paused(critico.name));
    expect(notice).toContain(critico.name);
  });

  it('nomeia o crítico mais recente quando há dois em cena', () => {
    const [primeiro, segundo] = CRITICO;
    if (primeiro === undefined || segundo === undefined) throw new Error('só um crítico');

    const { notice } = eventCardsView(
      withCards(600, card(primeiro.id, 2), card(segundo.id, CARD_TICKS)),
      true,
    );

    expect(notice).toBe(ui.events.paused(segundo.name));
  });

  it('fica vazio se só há moderados em cena, mesmo pausado', () => {
    // Não deveria acontecer — o main.ts só pausa por crítico —, mas se
    // acontecesse, um aviso dizendo "Tempo pausado: Onda de calor" ensinaria ao
    // jogador uma regra que o jogo não tem.
    const moderado = MODERADO[0];
    if (moderado === undefined) throw new Error('sem evento moderado');
    expect(eventCardsView(withCards(600, card(moderado.id)), true).notice).toBe('');
  });
});

describe('newestCriticalTick', () => {
  it('devolve null quando não há evento nenhum, e quando só há moderados', () => {
    const moderado = MODERADO[0];
    if (moderado === undefined) throw new Error('sem evento moderado');

    expect(newestCriticalTick(start())).toBeNull();
    expect(newestCriticalTick(withCards(600, card(moderado.id)))).toBeNull();
  });

  it('devolve o tick em que o crítico mais recente entrou', () => {
    const [primeiro, segundo] = CRITICO;
    if (primeiro === undefined || segundo === undefined) throw new Error('só um crítico');

    const state = withCards(600, card(primeiro.id, 1), card(segundo.id, CARD_TICKS - 2));
    expect(newestCriticalTick(state)).toBe(598);
  });

  it('o valor cresce quando um crítico novo entra — é o que evita repausar', () => {
    const critico = CRITICO[0];
    if (critico === undefined) throw new Error('sem evento crítico');

    const velho = withCards(600, card(critico.id, 2));
    const comNovo = withCards(600, card(critico.id, 2), card(critico.id, CARD_TICKS));

    expect(newestCriticalTick(velho)).toBe(596);
    expect(newestCriticalTick(comNovo)).toBe(600);
  });

  it('ACEITE: a auto-pausa interrompe ~10 vezes numa partida, não ~50', () => {
    // **A medição que escolheu o `criticalEventSupport`** (docs/BALANCEAMENTO.md).
    // São 279 eventos numa partida de 22,5 min; com o limiar em 2,0 seriam 52
    // pausas — uma a cada 26 s — e o jogo viraria um soluço. Este teste é o
    // alarme de que mexer no limiar muda quantas vezes o jogo interrompe quem
    // está jogando, que é a decisão de balanceamento mais visível do P7-02.
    //
    // **A partida para na derrota**, como o main.ts faz. Sem isso a contagem
    // rodaria vinte anos que ninguém joga: quem não compra nada é dissolvido em
    // 2089, e são justamente os anos mais quentes — e mais cheios de crítico —
    // que ficariam de fora da experiência real e dentro da conta.
    let state = start();
    let jaPausou = state.tick;
    let pausas = 0;
    let primeira: number | null = null;

    for (let i = 0; i < TOTAL_TICKS && !isFinished(state); i += 1) {
      state = advanceTick(state);
      const newest = newestCriticalTick(state);
      if (newest === null || newest <= jaPausou) continue;

      jaPausou = newest;
      pausas += 1;
      primeira ??= state.year;
    }

    expect(pausas).toBeGreaterThanOrEqual(5);
    expect(pausas).toBeLessThanOrEqual(20);
    // A primeira interrupção só chega depois de o mundo já ter piorado — a
    // primeira década que o P7-01 deixou silenciosa continua silenciosa.
    expect(primeira).toBeGreaterThan(balance.startYear + 20);
  });
});
