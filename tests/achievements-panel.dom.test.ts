// @vitest-environment jsdom

import { describe, expect, it, vi } from 'vitest';

import { ui } from '../src/data/i18n';
import { ACHIEVEMENTS } from '../src/engine/achievements';
import {
  achievementsButtonView,
  achievementsPanelView,
  focusPanelClose,
  mountAchievementsPanel,
  renderAchievementsPanel,
} from '../src/ui/achievements-panel';

/**
 * O painel de conquistas do título (CONQ-02, 2ª entrega).
 *
 * O conteúdo da prateleira é medido no tests/achievements-ui.dom.test.ts, que
 * cobre a mesma peça usada pelo cartão de fim. Aqui é só o que é do painel: ele
 * abrir e fechar, ser uma janela modal de verdade, e o botão que o chama.
 */

const TOTAL = ACHIEVEMENTS.length;
const PRIMEIRA = ACHIEVEMENTS[0]?.id ?? '';

function montar(onClose: () => void = vi.fn()): HTMLElement {
  const root = document.createElement('div');
  root.id = 'painel-conquistas';
  document.body.replaceChildren(root);
  mountAchievementsPanel(root, onClose);
  return root;
}

const aberto = (stored: readonly string[] = []) => achievementsPanelView(stored, true, true);

// --------------------------------------------------------------- a view ---

describe('achievementsPanelView', () => {
  it('só abre no título', () => {
    expect(achievementsPanelView([], true, true).open).toBe(true);
    expect(achievementsPanelView([], true, false).open).toBe(false);
  });

  it('fica fechado quando ninguém pediu para abrir', () => {
    expect(achievementsPanelView([], false, true).open).toBe(false);
  });

  /**
   * Nada aqui é "desta partida": o título não tem partida terminada para ler.
   * Toda conquista guardada aparece como conquistada, e nenhuma como nova.
   */
  it('não marca nada como novo', () => {
    const view = aberto([PRIMEIRA]);
    const entrada = view.shelf.entries.find((item) => item.id === PRIMEIRA);

    expect(entrada?.earned).toBe(true);
    expect(entrada?.fresh).toBe(false);
    expect(view.shelf.entries.some((item) => item.fresh)).toBe(false);
  });
});

describe('o botão do título', () => {
  it('leva a contagem dentro do rótulo', () => {
    expect(achievementsButtonView([]).label).toContain(ui.achievements.tally(0, TOTAL));
    expect(achievementsButtonView([PRIMEIRA]).label).toContain(ui.achievements.tally(1, TOTAL));
  });

  it('ignora um id guardado que a lista não conhece', () => {
    expect(achievementsButtonView(['de-outra-versao']).label).toContain(
      ui.achievements.tally(0, TOTAL),
    );
  });
});

// ------------------------------------------------------------------ DOM ---

describe('o painel desenhado', () => {
  it('nasce fechado e some por hidden, não por CSS', () => {
    const root = montar();
    renderAchievementsPanel(root, achievementsPanelView([], false, true));

    // `hidden` tira o botão de fechar da ordem de tabulação. Um botão invisível
    // mas focável é a armadilha que só quem navega por teclado encontra.
    expect(root.hidden).toBe(true);
  });

  it('abre com as seis e a contagem', () => {
    const root = montar();
    renderAchievementsPanel(root, aberto([PRIMEIRA]));

    expect(root.hidden).toBe(false);
    expect(root.querySelectorAll('.shelf__item')).toHaveLength(TOTAL);
    expect(root.querySelector('[data-achievements-panel="tally"]')?.textContent).toBe(
      ui.achievements.tally(1, TOTAL),
    );
  });

  /** É uma janela modal de verdade, como o painel da árvore (VIS-05). */
  it('é um dialog modal com título ligado a ele', () => {
    const root = montar();
    const dialog = root.querySelector('[role="dialog"]');

    expect(dialog?.getAttribute('aria-modal')).toBe('true');

    const rotulo = dialog?.getAttribute('aria-labelledby');
    expect(rotulo).toBeTruthy();
    expect(root.querySelector(`#${rotulo}`)?.textContent).toBe(ui.achievements.label);
  });

  it('fecha pelo botão', () => {
    const onClose = vi.fn();
    const root = montar(onClose);
    renderAchievementsPanel(root, aberto());

    root.querySelector<HTMLElement>('[data-achievements-panel="close"]')?.click();
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('fecha pelo clique no fundo, e não por um clique de dentro', () => {
    const onClose = vi.fn();
    const root = montar(onClose);
    renderAchievementsPanel(root, aberto());

    // Um clique dentro do painel borbulha até o fundo; se ele fechasse a
    // janela, ler a lista com o mouse seria impossível.
    root.querySelector<HTMLElement>('.achievements-panel__dialog')?.click();
    expect(onClose).not.toHaveBeenCalled();

    root.click();
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('leva o foco ao fechar quando abre — a única ação da janela', () => {
    const root = montar();
    renderAchievementsPanel(root, aberto());
    focusPanelClose(root);

    expect(document.activeElement).toBe(root.querySelector('[data-achievements-panel="close"]'));
  });

  /**
   * A lista é texto. Se um item virar clicável um dia, o Tab precisa dar a
   * volta dentro da janela — o `trapTab` já está ligado —, mas hoje o que
   * importa é não haver foco escondido dentro de um painel fechado.
   */
  it('não tem nada focável além do botão de fechar', () => {
    const root = montar();
    renderAchievementsPanel(root, aberto());

    const focaveis = [...root.querySelectorAll('button, a[href], [tabindex]')];
    expect(focaveis).toHaveLength(1);
    expect(focaveis[0]?.getAttribute('data-achievements-panel')).toBe('close');
  });

  it('redesenhar não empilha a lista', () => {
    const root = montar();
    for (let i = 0; i < 4; i++) renderAchievementsPanel(root, aberto());

    expect(root.querySelectorAll('.shelf__item')).toHaveLength(TOTAL);
  });
});
