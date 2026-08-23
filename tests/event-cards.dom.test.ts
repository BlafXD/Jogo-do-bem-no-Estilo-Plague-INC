// @vitest-environment jsdom

import { describe, expect, it } from 'vitest';

import { ui } from '../src/data/i18n';
import { CARD_TICKS, isCritical } from '../src/engine/events';
import {
  climateEvents,
  createInitialState,
  type ActiveEvent,
  type GameState,
} from '../src/engine/state';
import { yearForTick } from '../src/engine/tick';
import {
  eventCardsView,
  mountEventCards,
  renderEventCards,
  type EventCardsView,
} from '../src/ui/event-cards';

/**
 * Os cartões de evento no DOM (P7-02).
 *
 * A regra está no tests/event-cards.test.ts, que roda em node. Aqui só o que
 * não existe sem DOM: a seção esconder-se quando não há evento, o `aria-live`
 * do aviso, as exigências do §5 do GDD (ícone com rótulo escrito ao lado, nada
 * focável escondido) e a reconstrução da lista só quando ela muda de verdade.
 */

const CRITICO = climateEvents.filter(isCritical);
const MODERADO = climateEvents.filter((e) => !isCritical(e));

function card(eventId: string, ticksRemaining = CARD_TICKS): ActiveEvent {
  return { eventId, target: 'na', ticksRemaining };
}

function withCards(tick: number, ...actives: readonly ActiveEvent[]): GameState {
  return {
    ...createInitialState(2025),
    tick,
    year: yearForTick(tick),
    activeEvents: actives,
  };
}

function mount(): HTMLElement {
  const root = document.createElement('section');
  document.body.replaceChildren(root);
  mountEventCards(root);
  return root;
}

function show(root: HTMLElement, view: EventCardsView): HTMLElement {
  renderEventCards(root, view);
  return root;
}

function cardsIn(root: ParentNode): readonly HTMLElement[] {
  return Array.from(root.querySelectorAll<HTMLElement>('.events__card'));
}

function textOf(root: ParentNode, selector: string): string {
  return root.querySelector(selector)?.textContent ?? '';
}

const critico = CRITICO[0];
const moderado = MODERADO[0];
if (critico === undefined || moderado === undefined) throw new Error('catálogo incompleto');

describe('a seção some quando não há o que mostrar', () => {
  it('nasce escondida', () => {
    expect(mount().hidden).toBe(true);
  });

  it('aparece com um evento em cena e some quando o último vence', () => {
    const root = mount();

    show(root, eventCardsView(withCards(400, card(moderado.id))));
    expect(root.hidden).toBe(false);
    expect(cardsIn(root)).toHaveLength(1);

    show(root, eventCardsView(withCards(406)));
    expect(root.hidden).toBe(true);
    expect(cardsIn(root)).toHaveLength(0);
  });

  it('continua visível com o aviso de pausa, mesmo sem cartão', () => {
    // Não deveria acontecer com o main.ts de hoje, mas esconder a seção com um
    // aviso dentro seria esconder do jogador a explicação de por que o jogo
    // parou — o pior jeito de a auto-pausa falhar.
    const root = mount();
    show(root, { cards: [], notice: 'Tempo pausado.' });
    expect(root.hidden).toBe(false);
  });
});

describe('o cartão na tela', () => {
  it('mostra nome, região com ano e o fato real', () => {
    const root = mount();
    show(root, eventCardsView(withCards(600, card(critico.id))));

    expect(textOf(root, '.events__name')).toBe(critico.name);
    expect(textOf(root, '.events__fact')).toBe(critico.fact);
    expect(textOf(root, '.events__where')).toContain('América do Norte');
    expect(textOf(root, '.events__where')).toContain(String(yearForTick(600)));
  });

  it('§5: a gravidade tem ícone E rótulo escrito, e o ícone é decoração', () => {
    // Tire as cores da tela e o cartão continua dizendo "Crítico" por escrito.
    // O `aria-hidden` no ícone evita que o leitor de tela anuncie duas vezes.
    const root = mount();
    show(root, eventCardsView(withCards(600, card(critico.id))));

    expect(textOf(root, '.events__severity')).toBe(ui.events.severity.critical.label);
    expect(textOf(root, '.events__icon')).toBe(ui.events.severity.critical.icon);
    expect(root.querySelector('.events__icon')?.getAttribute('aria-hidden')).toBe('true');
  });

  it('o data-severity distingue crítico de moderado para o CSS', () => {
    const root = mount();
    show(root, eventCardsView(withCards(600, card(critico.id), card(moderado.id, 3))));

    const severidades = cardsIn(root).map((item) => item.dataset.severity);
    expect(severidades).toEqual(['critical', 'moderate']);
  });

  it('§5: nada dentro da seção é focável', () => {
    // É o que permite reconstruir a lista sem arrancar o foco de quem navega
    // por teclado — e o que impede um controle invisível de ficar na ordem de
    // tabulação enquanto a seção está escondida.
    const root = mount();
    show(root, eventCardsView(withCards(600, card(critico.id), card(moderado.id, 4))));

    expect(root.querySelectorAll('button, a, input, [tabindex]')).toHaveLength(0);
  });

  it('a seção tem rótulo acessível', () => {
    expect(mount().getAttribute('aria-label')).toBe(ui.events.label);
  });
});

describe('o aviso da auto-pausa', () => {
  it('é uma região viva, para o leitor de tela anunciar que o tempo parou', () => {
    const notice = mount().querySelector('[data-events="notice"]');
    expect(notice?.getAttribute('aria-live')).toBe('polite');
  });

  it('aparece com o nome do evento e some quando o tempo volta a correr', () => {
    const root = mount();
    const state = withCards(600, card(critico.id));
    const notice = (): HTMLElement | null => root.querySelector('[data-events="notice"]');

    show(root, eventCardsView(state, true));
    expect(notice()?.hidden).toBe(false);
    expect(notice()?.textContent).toContain(critico.name);

    show(root, eventCardsView(state, false));
    expect(notice()?.hidden).toBe(true);
    expect(notice()?.textContent).toBe('');
  });

  it('o mesmo elemento é reaproveitado — região viva recriada não anuncia nada', () => {
    const root = mount();
    const antes = root.querySelector('[data-events="notice"]');

    show(root, eventCardsView(withCards(600, card(critico.id)), true));
    expect(root.querySelector('[data-events="notice"]')).toBe(antes);
  });
});

describe('a lista só é reconstruída quando muda', () => {
  it('o mesmo conjunto de cartões deixa o DOM intacto', () => {
    // A tela é redesenhada a cada mês de jogo — 1,5 s a 1x. Sem esta guarda, a
    // seleção de texto de quem estivesse lendo uma frase seria apagada a cada
    // segundo e meio.
    const root = mount();
    show(root, eventCardsView(withCards(600, card(critico.id, 4))));
    const antes = cardsIn(root)[0];

    // O mês passou, o cartão envelheceu, mas é o mesmo cartão.
    show(root, eventCardsView(withCards(601, card(critico.id, 3))));
    expect(cardsIn(root)[0]).toBe(antes);
  });

  it('um evento novo reconstrói a lista', () => {
    const root = mount();
    show(root, eventCardsView(withCards(600, card(critico.id, 4))));
    const antes = cardsIn(root)[0];

    show(root, eventCardsView(withCards(601, card(critico.id, 3), card(moderado.id, CARD_TICKS))));
    expect(cardsIn(root)).toHaveLength(2);
    expect(cardsIn(root)[0]).not.toBe(antes);
  });

  it('um evento que venceu reconstrói a lista', () => {
    const root = mount();
    show(root, eventCardsView(withCards(600, card(critico.id, 1), card(moderado.id, 4))));
    expect(cardsIn(root)).toHaveLength(2);

    show(root, eventCardsView(withCards(601, card(moderado.id, 3))));
    expect(cardsIn(root)).toHaveLength(1);
    expect(textOf(root, '.events__name')).toBe(moderado.name);
  });
});
