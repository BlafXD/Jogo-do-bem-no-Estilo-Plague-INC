// @vitest-environment jsdom

import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ui } from '../src/data/i18n';
import { createInitialState, SKILL_BRANCHES } from '../src/engine/state';
import { mountContain } from '../src/ui/contain';
import { HUD_FIELDS, mountHud } from '../src/ui/hud';
import { ICON_NAMES, prependBrandMark, prependIcon } from '../src/ui/icons';
import { mountTitle } from '../src/ui/title';
import { mountTree, treeView } from '../src/ui/tree';

/**
 * Onde os ícones do VIS-09 aparecem, e como entram na página. O formato de
 * cada arquivo está no tests/icons.test.ts, que roda em node.
 *
 * O que se cobra em todo lugar é o mesmo: o ícone chega como `<svg>` de
 * verdade, fica fora do leitor de tela e **não muda o texto** de quem o
 * recebe. É o texto que diz o que a coisa é (docs/GDD.md §5); o ícone é
 * reforço.
 */

beforeEach(() => {
  document.body.replaceChildren();
});

/** Os ícones de dentro de `root`, pelo nome. */
const icones = (root: ParentNode): (string | undefined)[] =>
  [...root.querySelectorAll<SVGSVGElement>('svg.icon')].map((svg) => svg.dataset.icon);

describe('prependIcon', () => {
  it('põe o ícone no começo, como <svg>, com a classe do lugar', () => {
    const alvo = document.createElement('span');
    alvo.textContent = 'Energia';
    prependIcon(alvo, 'energy', 'lugar__icon');

    const svg = alvo.firstElementChild;
    expect(svg?.namespaceURI).toBe('http://www.w3.org/2000/svg');
    expect(svg?.localName).toBe('svg');
    expect(svg?.getAttribute('class')).toBe('icon lugar__icon');
    expect(alvo.lastChild?.textContent).toBe('Energia');
  });

  it('fica fora do leitor de tela e fora da ordem do Tab', () => {
    const alvo = document.createElement('span');
    prependIcon(alvo, 'contain');

    expect(alvo.firstElementChild?.getAttribute('aria-hidden')).toBe('true');
    expect(alvo.firstElementChild?.getAttribute('focusable')).toBe('false');
  });

  /**
   * O arquivo tem quebra de linha e indentação entre os caminhos. Sem o
   * cuidado do icons.ts, elas iriam parar no `textContent` de quem recebe o
   * ícone — "Energia" viraria "\n  \n  Energia".
   */
  it('não traz texto nenhum para dentro — nem a indentação do arquivo', () => {
    for (const name of ICON_NAMES) {
      const alvo = document.createElement('span');
      alvo.textContent = 'rótulo';
      prependIcon(alvo, name);

      expect(alvo.textContent, name).toBe('rótulo');
      expect(alvo.querySelector('svg')?.childElementCount, name).toBeGreaterThan(0);
    }
  });
});

describe('prependBrandMark', () => {
  it('põe a marca como <svg>, escondida do leitor de tela, sem mudar o texto', () => {
    const alvo = document.createElement('h1');
    alvo.textContent = 'Ponto de Virada';
    prependBrandMark(alvo, 'topo__marca');

    const svg = alvo.firstElementChild;
    expect(svg?.localName).toBe('svg');
    expect(svg?.getAttribute('class')).toBe('brand-mark topo__marca');
    expect(svg?.getAttribute('aria-hidden')).toBe('true');
    expect(alvo.textContent).toBe('Ponto de Virada');
  });
});

describe('os lugares', () => {
  it('cada indicador do HUD tem o ícone de mesmo nome, antes do rótulo', () => {
    const root = document.createElement('div');
    mountHud(root);
    const itens = [...root.querySelectorAll('.hud__item')];

    expect(itens.map((item) => item.querySelector('svg')?.dataset.icon)).toEqual([...HUD_FIELDS]);
    for (const item of itens) {
      expect(item.firstElementChild?.classList.contains('hud__icon')).toBe(true);
      expect(item.querySelector('.hud__label')?.textContent).not.toBe('');
    }
  });

  it('cada ramo da árvore tem o ícone dele no título, e o título continua o nome', () => {
    const root = document.createElement('section');
    const view = treeView(createInitialState(1));
    mountTree(root, view, 'solar', () => {});

    const titulos = [...root.querySelectorAll('.tree__branch-name')];
    expect(titulos.map((h) => h.querySelector('svg')?.dataset.icon)).toEqual([...SKILL_BRANCHES]);
    expect(titulos.map((h) => h.textContent)).toEqual(view.map((branch) => branch.name));
  });

  it('a contenção tem o escudo na frente do nome', () => {
    const root = document.createElement('section');
    mountContain(root, () => {});

    expect(icones(root)).toEqual(['contain']);
    expect(root.querySelector('.contain__name')?.textContent).toBe(ui.contain.name);
  });

  it('o título tem a marca na frente do ODS, e o ODS continua dizendo o mesmo', () => {
    const root = document.createElement('section');
    const nome = document.createElement('h1');
    nome.className = 'title__name';
    root.append(nome);
    mountTitle(root, {
      onContinue: vi.fn(),
      onNew: vi.fn(),
      onConfirmNew: vi.fn(),
      onCancelNew: vi.fn(),
      onFair: vi.fn(),
      onToggleSound: vi.fn(),
    });

    const ods = root.querySelector('.title__ods');
    expect(ods?.firstElementChild?.classList.contains('title__mark')).toBe(true);
    expect(ods?.textContent).toBe(ui.title.ods);
  });
});
