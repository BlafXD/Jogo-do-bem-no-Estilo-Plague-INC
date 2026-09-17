// @vitest-environment jsdom

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ui } from '../src/data/i18n';
import { CARD_TICKS, isCritical } from '../src/engine/events';
import {
  climateEvents,
  createInitialState,
  type ActiveEvent,
  type GameState,
} from '../src/engine/state';
import { yearForTick } from '../src/engine/tick';
import { eventCast, personLabel, personText } from '../src/ui/characters';
import {
  criticalCardView,
  focusResume,
  mountCriticalCard,
  renderCriticalCard,
} from '../src/ui/critical-card';

/**
 * O cartão central do evento crítico (VIS-07): quando ele aparece, o que ele
 * diz, e o botão que solta o tempo.
 */

const CRITICOS = climateEvents.filter(isCritical);
const MODERADO = climateEvents.find((event) => !isCritical(event));
const [primeiro, segundo] = CRITICOS;
if (primeiro === undefined || segundo === undefined || MODERADO === undefined) {
  throw new Error('o catálogo precisa de dois críticos e um moderado');
}

function ativo(eventId: string, ticksRemaining = CARD_TICKS): ActiveEvent {
  return { eventId, target: 'af', ticksRemaining };
}

function partida(tick: number, ...ativos: readonly ActiveEvent[]): GameState {
  return { ...createInitialState(2025), tick, year: yearForTick(tick), activeEvents: ativos };
}

function montar(onResume: () => void = () => {}): HTMLElement {
  const root = document.createElement('div');
  root.id = 'evento-critico';
  document.body.replaceChildren(root);
  mountCriticalCard(root, onResume);
  return root;
}

function texto(root: ParentNode, slot: string): string {
  return root.querySelector(`[data-critical="${slot}"]`)?.textContent ?? '';
}

beforeEach(() => {
  document.body.replaceChildren();
});

describe('criticalCardView', () => {
  it('só existe com o tempo parado por um evento', () => {
    const state = partida(300, ativo(primeiro.id));

    expect(criticalCardView(state, false)).toBeNull();
    expect(criticalCardView(state, true)).not.toBeNull();
  });

  it('um evento moderado não abre cartão', () => {
    expect(criticalCardView(partida(300, ativo(MODERADO.id)), true)).toBeNull();
  });

  it('mostra o crítico mais recente, que é o que parou o relógio', () => {
    // O que tem mais meses pela frente entrou por último.
    const state = partida(300, ativo(primeiro.id, 2), ativo(segundo.id, CARD_TICKS));

    expect(criticalCardView(state, true)?.name).toBe(segundo.name);
  });

  it('diz onde, quando, o fato e quem dá a notícia', () => {
    const view = criticalCardView(partida(300, ativo(primeiro.id)), true);

    expect(view?.where).toBe(ui.events.where('África', String(yearForTick(300))));
    expect(view?.fact).toBe(primeiro.fact);
    expect(view?.speaker).toEqual(eventCast(primeiro.id));
    expect(view?.notice).toBe(ui.events.paused(primeiro.name));
  });
});

describe('o cartão na tela', () => {
  it('nasce escondido, e aparece com a notícia', () => {
    const root = montar();
    expect(root.hidden).toBe(true);

    renderCriticalCard(root, criticalCardView(partida(300, ativo(primeiro.id)), true));

    expect(root.hidden).toBe(false);
    expect(texto(root, 'name')).toBe(primeiro.name);
    expect(texto(root, 'fact')).toBe(primeiro.fact);
  });

  it('é um alertdialog com nome e descrição', () => {
    const root = montar();
    const card = root.querySelector('[role="alertdialog"]');

    expect(card?.getAttribute('aria-modal')).toBe('true');
    expect(
      document.getElementById(card?.getAttribute('aria-labelledby') ?? '')?.dataset.critical,
    ).toBe('name');
    expect(
      document.getElementById(card?.getAttribute('aria-describedby') ?? '')?.dataset.critical,
    ).toBe('fact');
  });

  /** §5: a gravidade vai escrita, e o ícone é decoração. */
  it('o selo diz "Crítico" e "O tempo parou" por escrito', () => {
    const root = montar();
    const selo = root.querySelector('.critical__seal');

    expect(selo?.textContent).toContain(ui.events.severity.critical.label);
    expect(selo?.textContent).toContain(ui.events.critical.paused);
    expect(root.querySelector('.critical__icon')?.getAttribute('aria-hidden')).toBe('true');
  });

  it('mostra o especialista, com nome e cargo na faixa', () => {
    const root = montar();
    renderCriticalCard(root, criticalCardView(partida(300, ativo(primeiro.id)), true));
    const quem = eventCast(primeiro.id);
    if (quem === null) throw new Error('o evento precisa de especialista');

    const img = root.querySelector<HTMLImageElement>('.critical__portrait img');
    expect(img?.alt).toBe(personLabel(quem.person));
    expect(img?.getAttribute('src')).toBeTruthy();
    expect(root.querySelector('[data-cast="name"]')?.textContent).toBe(
      personText(quem.person).name,
    );
  });

  it('some quando a pausa acaba', () => {
    const root = montar();
    renderCriticalCard(root, criticalCardView(partida(300, ativo(primeiro.id)), true));

    renderCriticalCard(root, criticalCardView(partida(300, ativo(primeiro.id)), false));

    expect(root.hidden).toBe(true);
  });
});

describe('retomar', () => {
  it('o botão avisa quem montou, e tem a dica dos atalhos', () => {
    const onResume = vi.fn();
    const root = montar(onResume);
    const botao = root.querySelector<HTMLButtonElement>('[data-critical="resume"]');

    botao?.click();

    expect(onResume).toHaveBeenCalledTimes(1);
    expect(botao?.type).toBe('button');
    expect(botao?.title).toBe(ui.events.critical.resumeHint);
  });

  /** Fechar solta o tempo: um clique errado ao lado não pode fazer isso. */
  it('o clique no fundo não retoma', () => {
    const onResume = vi.fn();
    const root = montar(onResume);

    root.click();

    expect(onResume).not.toHaveBeenCalled();
  });

  it('o foco pousa no "Retomar", e o Tab não sai do cartão', () => {
    const root = montar();
    renderCriticalCard(root, criticalCardView(partida(300, ativo(primeiro.id)), true));
    const botao = root.querySelector<HTMLElement>('[data-critical="resume"]');

    focusResume(root);
    expect(document.activeElement).toBe(botao);

    const tab = new KeyboardEvent('keydown', { key: 'Tab', bubbles: true, cancelable: true });
    botao?.dispatchEvent(tab);

    expect(tab.defaultPrevented).toBe(true);
    expect(document.activeElement).toBe(botao);
  });
});
