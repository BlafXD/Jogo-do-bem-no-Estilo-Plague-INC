// @vitest-environment jsdom

import { readFileSync } from 'node:fs';

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ui } from '../src/data/i18n';
import { createInitialState, type GameState } from '../src/engine/state';
import { focusClose, mountTreePanel, renderTreePanel, treePanelView } from '../src/ui/tree-panel';

/**
 * O painel da árvore (VIS-05): abrir, fechar, desligar o resto da página e
 * prender o Tab. O que mora dentro dele — os losangos e o detalhe — está no
 * tests/tree.dom.test.ts.
 *
 * Os testes montam a mesma forma do index.html: o fundo, a janela com o
 * cabeçalho vazio e um conteúdo com dois botões.
 */

type Pagina = {
  panel: HTMLElement;
  dialog: HTMLElement;
  behind: HTMLElement[];
  onClose: ReturnType<typeof vi.fn>;
};

function pagina(): Pagina {
  const behind = [document.createElement('header'), document.createElement('main')];
  const panel = document.createElement('div');
  panel.id = 'painel-arvore';
  panel.hidden = true;
  panel.innerHTML = `
    <div role="dialog" aria-modal="true">
      <header data-tree-panel="head"></header>
      <section><button type="button" data-no>nó</button></section>
      <div><button type="button" data-compra>comprar</button></div>
    </div>`;

  document.body.replaceChildren(...behind, panel);
  const onClose = vi.fn();
  mountTreePanel(panel, onClose);

  const dialog = panel.querySelector<HTMLElement>('[role="dialog"]');
  if (dialog === null) throw new Error('a janela não foi montada.');
  return { panel, dialog, behind, onClose };
}

function withPoints(actionPoints: number): GameState {
  return { ...createInitialState(1), actionPoints };
}

function tab(target: HTMLElement, shiftKey = false): KeyboardEvent {
  const event = new KeyboardEvent('keydown', {
    key: 'Tab',
    shiftKey,
    bubbles: true,
    cancelable: true,
  });
  target.dispatchEvent(event);
  return event;
}

beforeEach(() => {
  document.body.replaceChildren();
});

describe('treePanelView', () => {
  it('só abre na partida', () => {
    expect(treePanelView(withPoints(0), true, true).open).toBe(true);
    expect(treePanelView(withPoints(0), true, false).open).toBe(false);
    expect(treePanelView(withPoints(0), false, true).open).toBe(false);
  });

  it('mostra o PAC arredondado para baixo, como o HUD', () => {
    expect(treePanelView(withPoints(39.9), true, true).points).toBe('39');
  });
});

describe('o cabeçalho', () => {
  it('tem um <h2> que dá nome à janela', () => {
    const { panel, dialog } = pagina();
    const title = panel.querySelector('h2');

    expect(title?.textContent).toBe(ui.treePanel.title);
    expect(dialog.getAttribute('aria-labelledby')).toBe(title?.id);
    expect(title?.id).not.toBe('');
  });

  it('traz a introdução, o saldo com rótulo e o botão de fechar com dica', () => {
    const { panel } = pagina();
    const close = panel.querySelector<HTMLButtonElement>('[data-tree-panel="close"]');

    expect(panel.textContent).toContain(ui.tree.intro);
    expect(panel.textContent).toContain(ui.treePanel.balance);
    expect(close?.type).toBe('button');
    expect(close?.textContent).toBe(ui.treePanel.close);
    expect(close?.title).toBe(ui.treePanel.closeHint);
  });
});

describe('fechar', () => {
  it('pelo botão', () => {
    const { panel, onClose } = pagina();

    panel.querySelector<HTMLElement>('[data-tree-panel="close"]')?.click();

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('pelo clique no fundo escurecido', () => {
    const { panel, onClose } = pagina();

    panel.click();

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('um clique dentro da janela não fecha', () => {
    const { panel, dialog, onClose } = pagina();

    dialog.click();
    panel.querySelector<HTMLElement>('[data-no]')?.click();

    expect(onClose).not.toHaveBeenCalled();
  });

  it('o foco pode pousar no botão de fechar', () => {
    const { panel } = pagina();
    panel.hidden = false;

    focusClose(panel);

    expect(document.activeElement).toBe(panel.querySelector('[data-tree-panel="close"]'));
  });
});

describe('renderTreePanel', () => {
  it('abre e fecha pelo hidden, e escreve o saldo', () => {
    const { panel } = pagina();

    renderTreePanel(panel, treePanelView(withPoints(120), true, true));
    expect(panel.hidden).toBe(false);
    expect(panel.querySelector('[data-tree-panel="points"]')?.textContent).toBe('120');

    renderTreePanel(panel, treePanelView(withPoints(120), false, true));
    expect(panel.hidden).toBe(true);
  });
});

describe('o Tab fica dentro do painel', () => {
  it('do último botão, volta ao primeiro', () => {
    const { panel, dialog } = pagina();
    panel.hidden = false;
    const botoes = [...dialog.querySelectorAll<HTMLElement>('button')];
    botoes.at(-1)?.focus();

    const event = tab(dialog);

    expect(event.defaultPrevented).toBe(true);
    expect(document.activeElement).toBe(botoes[0]);
  });

  it('do primeiro, com Shift, vai ao último', () => {
    const { panel, dialog } = pagina();
    panel.hidden = false;
    const botoes = [...dialog.querySelectorAll<HTMLElement>('button')];
    botoes[0]?.focus();

    tab(dialog, true);

    expect(document.activeElement).toBe(botoes.at(-1));
  });

  it('no meio do caminho, deixa o navegador seguir', () => {
    const { panel, dialog } = pagina();
    panel.hidden = false;
    dialog.querySelector<HTMLElement>('[data-no]')?.focus();

    expect(tab(dialog).defaultPrevented).toBe(false);
  });

  it('ignora o que está escondido ao contar o último', () => {
    const { panel, dialog } = pagina();
    panel.hidden = false;
    const compra = dialog.querySelector<HTMLElement>('[data-compra]');
    const no = dialog.querySelector<HTMLElement>('[data-no]');
    if (compra?.parentElement) compra.parentElement.hidden = true;
    no?.focus();

    tab(dialog);

    expect(document.activeElement).toBe(dialog.querySelector('[data-tree-panel="close"]'));
  });
});

/**
 * A coluna da direita do painel, conferida contra o index.html.
 *
 * **O defeito que este teste pega.** Em tela cheia a coluna é um grid com uma
 * fila por seção. O `INTER-08` acrescentou as sinergias ao index.html e não
 * acrescentou a fila: a terceira seção caiu numa fila implícita, a coluna
 * passou do painel e o `overflow: hidden` do diálogo cortou o que sobrou —
 * medido no Edge a 1366 × 768, as sinergias ficavam 164 px abaixo da borda e o
 * botão de comprar do detalhe era pintado por cima do título da contenção.
 *
 * As duas fontes são arquivos: dá para cobrar isso sem navegador nenhum.
 */
describe('as filas da coluna do painel', () => {
  const html = readFileSync('index.html', 'utf8');
  const css = readFileSync('src/ui/tree-panel.css', 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');

  it('tem uma fila para cada seção que o index.html põe na coluna', () => {
    const coluna = html.split('class="tree-panel__side"')[1]?.split('</div>')[0] ?? '';
    const secoes = coluna.match(/<section /g)?.length ?? 0;

    // A regra da tela cheia é a última que define as filas da coluna.
    const regras = css.split('.tree-panel__side {').slice(1);
    const ultima = regras.at(-1) ?? '';
    const filas = /grid-template-rows:\s*([^;]+);/.exec(ultima)?.[1] ?? '';
    const trilhas = filas
      .replace(/minmax\([^)]*\)/g, 'x')
      .trim()
      .split(/\s+/)
      .filter(Boolean);

    expect(secoes, 'seções na coluna do index.html').toBe(3);
    expect(trilhas.length, `filas em "${filas}"`).toBe(secoes);
  });

  /**
   * E a coluna rola: com três seções e uma janela baixa, nem sempre cabe tudo —
   * sem isto, o que não coube ficaria inalcançável atrás do recorte do diálogo.
   */
  it('rola quando as três seções não cabem', () => {
    const regras = css.split('.tree-panel__side {').slice(1);
    expect(regras.at(-1)).toContain('overflow-y: auto');
  });
});
