// @vitest-environment jsdom

import { describe, expect, it, vi } from 'vitest';
import { ui } from '../src/data/i18n';
import {
  completeStep,
  createTutorial,
  mountTutorial,
  mountTutorialPanel,
  renderTutorial,
  renderTutorialPanel,
  showsPanel,
  tutorialView,
  type TutorialAnchor,
  type TutorialCues,
} from '../src/ui/tutorial';

/**
 * Os dois tutoriais no DOM (P7-08).
 *
 * A ordem dos passos está no tests/tutorial.test.ts, que roda em node. Aqui só
 * o que não existe sem DOM: o balão mudar de seção, sair da página inteiro, e
 * as exigências do §5 — botão de verdade, nada focável escondido.
 */

const nada: TutorialCues = { canBuy: false, hasEvent: false, inertiaActed: false };
const cues = (over: Partial<TutorialCues> = {}): TutorialCues => ({ ...nada, ...over });

function ancoras(): Readonly<Record<TutorialAnchor, HTMLElement>> {
  const feito: Record<string, HTMLElement> = {};
  document.body.replaceChildren();

  for (const nome of ['controls', 'tree', 'events', 'contain']) {
    const secao = document.createElement('section');
    secao.dataset.anchor = nome;
    document.body.append(secao);
    feito[nome] = secao;
  }

  return feito as Record<TutorialAnchor, HTMLElement>;
}

const onde = (callout: HTMLElement): string | undefined => callout.parentElement?.dataset.anchor;

describe('o balão dos 4 passos', () => {
  it('pousa na seção de que o passo fala', () => {
    const alvos = ancoras();
    const callout = mountTutorial(
      () => {},
      () => {},
    );

    renderTutorial(callout, alvos, tutorialView(createTutorial('new'), nada));

    expect(onde(callout)).toBe('controls');
    expect(callout.querySelector('[data-tutorial="text"]')?.textContent).toBe(
      ui.tutorial.steps.time,
    );
  });

  it('muda de seção quando o passo muda', () => {
    const alvos = ancoras();
    const callout = mountTutorial(
      () => {},
      () => {},
    );
    const depois = completeStep(createTutorial('new'), 'time');

    renderTutorial(callout, alvos, tutorialView(createTutorial('new'), nada));
    expect(onde(callout)).toBe('controls');

    renderTutorial(callout, alvos, tutorialView(depois, cues({ canBuy: true })));
    expect(onde(callout)).toBe('tree');
  });

  it('só existe um balão, por mais que se redesenhe', () => {
    const alvos = ancoras();
    const callout = mountTutorial(
      () => {},
      () => {},
    );

    for (let i = 0; i < 5; i++) {
      renderTutorial(callout, alvos, tutorialView(createTutorial('new'), nada));
    }

    expect(document.querySelectorAll('[data-tutorial="callout"]')).toHaveLength(1);
  });

  it('sai do DOM inteiro quando não há passo, e leva os botões junto', () => {
    // Um botão invisível mas focável é a armadilha que só quem navega por
    // teclado encontra. Aqui dá para remover de verdade porque nada mais
    // depende de o balão estar no lugar.
    const alvos = ancoras();
    const callout = mountTutorial(
      () => {},
      () => {},
    );

    renderTutorial(callout, alvos, tutorialView(createTutorial('new'), nada));
    expect(document.querySelectorAll('[data-tutorial="callout"]')).toHaveLength(1);

    renderTutorial(callout, alvos, null);
    expect(document.querySelectorAll('[data-tutorial="callout"]')).toHaveLength(0);
    expect(document.querySelectorAll('.tutorial__button')).toHaveLength(0);
  });

  it('a dica vem antes do conteúdo que ela explica', () => {
    const alvos = ancoras();
    const conteudo = document.createElement('p');
    alvos.controls.append(conteudo);

    const callout = mountTutorial(
      () => {},
      () => {},
    );
    renderTutorial(callout, alvos, tutorialView(createTutorial('new'), nada));

    expect(alvos.controls.firstElementChild).toBe(callout);
  });

  it('"Entendi" e "Pular tutorial" são botões de verdade, com dica', () => {
    const callout = mountTutorial(
      () => {},
      () => {},
    );

    for (const slot of ['next', 'skip']) {
      const botao = callout.querySelector<HTMLButtonElement>(`[data-tutorial="${slot}"]`);
      expect(botao?.tagName, slot).toBe('BUTTON');
      expect(botao?.type, slot).toBe('button');
      expect((botao?.title.length ?? 0) > 0, slot).toBe(true);
    }
  });

  it('os dois botões avisam quem clicou', () => {
    const onNext = vi.fn();
    const onSkip = vi.fn();
    const callout = mountTutorial(onNext, onSkip);

    callout.querySelector<HTMLButtonElement>('[data-tutorial="next"]')?.click();
    callout.querySelector<HTMLButtonElement>('[data-tutorial="skip"]')?.click();

    expect(onNext).toHaveBeenCalledOnce();
    expect(onSkip).toHaveBeenCalledOnce();
  });

  it('é anunciado a quem usa leitor de tela, sem atropelar o que está sendo lido', () => {
    // Ele aparece sozinho, no meio da partida.
    const callout = mountTutorial(
      () => {},
      () => {},
    );

    expect(callout.getAttribute('aria-live')).toBe('polite');
    expect(callout.getAttribute('aria-label')).toBe(ui.tutorial.label);
  });
});

describe('o painel do Modo Feira', () => {
  it('tem as duas frases e um botão só', () => {
    const panel = mountTutorialPanel(() => {});
    const linhas = [...panel.querySelectorAll('.tutorial-panel__line')].map((p) => p.textContent);

    expect(panel.querySelector('.tutorial-panel__title')?.textContent).toBe(ui.tutorial.fair.title);
    expect(linhas).toEqual([...ui.tutorial.fair.lines]);
    expect(panel.querySelectorAll('button')).toHaveLength(1);
  });

  it('o título é cabeçalho de verdade', () => {
    expect(mountTutorialPanel(() => {}).querySelector('.tutorial-panel__title')?.tagName).toBe(
      'H2',
    );
  });

  it('entra e sai do tabuleiro conforme o modo', () => {
    const board = document.createElement('div');
    document.body.replaceChildren(board);
    const panel = mountTutorialPanel(() => {});

    renderTutorialPanel(panel, board, showsPanel(createTutorial('fair')));
    expect(board.contains(panel)).toBe(true);

    renderTutorialPanel(panel, board, showsPanel(createTutorial('new')));
    expect(document.querySelectorAll('[data-tutorial="panel"]')).toHaveLength(0);
  });

  it('o botão avisa que foi lido', () => {
    const onStart = vi.fn();
    mountTutorialPanel(onStart)
      .querySelector<HTMLButtonElement>('[data-tutorial="start"]')
      ?.click();

    expect(onStart).toHaveBeenCalledOnce();
  });
});
