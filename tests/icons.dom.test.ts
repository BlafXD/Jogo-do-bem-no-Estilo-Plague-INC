// @vitest-environment jsdom

import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ui } from '../src/data/i18n';
import { createInitialState, SKILL_BRANCHES } from '../src/engine/state';
import { mountContain } from '../src/ui/contain';
import { createTimeControl, mountControls, renderControls, togglePause } from '../src/ui/controls';
import { mountCriticalCard } from '../src/ui/critical-card';
import { HUD_FIELDS, mountHud } from '../src/ui/hud';
import { ICON_NAMES, prependBrandMark, prependIcon, setIcon, writeLabel } from '../src/ui/icons';
import { mountOutcome } from '../src/ui/outcome';
import { mountRegionPanel } from '../src/ui/region-panel';
import { mountSession } from '../src/ui/session';
import { createTitle, mountTitle, renderTitle, titleView } from '../src/ui/title';
import { mountTree, mountTreeButton, treeView } from '../src/ui/tree';
import { mountTreePanel } from '../src/ui/tree-panel';

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

/** A tela de título montada, com o <h1> que o index.html traria. */
function montarTitulo(): HTMLElement {
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
  return root;
}

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

describe('setIcon', () => {
  /**
   * A pausa e o som passam por aqui a cada quadro. Recriar o `<svg>` toda vez
   * seria ler o arquivo sessenta vezes por segundo à toa.
   */
  it('troca o ícone quando o estado muda, e só então', () => {
    const alvo = document.createElement('button');
    setIcon(alvo, 'pause');
    const primeiro = alvo.firstElementChild;

    setIcon(alvo, 'pause');
    expect(alvo.firstElementChild).toBe(primeiro);

    setIcon(alvo, 'play');
    expect(icones(alvo)).toEqual(['play']);
  });

  it('com null, tira o ícone', () => {
    const alvo = document.createElement('button');
    setIcon(alvo, 'play');
    setIcon(alvo, null);

    expect(alvo.querySelector('svg')).toBe(null);
  });
});

describe('writeLabel', () => {
  it('escreve o texto sem apagar o ícone, num <span> só', () => {
    const botao = document.createElement('button');
    prependIcon(botao, 'play');
    writeLabel(botao, 'Começar');
    writeLabel(botao, 'Nova partida');

    expect(icones(botao)).toEqual(['play']);
    expect(botao.querySelectorAll('[data-label]')).toHaveLength(1);
    expect(botao.textContent).toBe('Nova partida');
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
    const ods = montarTitulo().querySelector('.title__ods');
    expect(ods?.firstElementChild?.classList.contains('title__mark')).toBe(true);
    expect(ods?.textContent).toBe(ui.title.ods);
  });
});

describe('os botões (2ª entrega)', () => {
  /** O ícone que vem na frente do botão, pelo nome. */
  const iconeDe = (botao: Element | null): string | null =>
    botao?.querySelector<SVGSVGElement>(':scope > svg.icon')?.dataset.icon ?? null;

  /**
   * A pausa diz o que o clique faz, como o rótulo: correndo, pausar; parado, o
   * play. O som diz o estado, como o marcador ● ao lado: o alto-falante riscado
   * é o mudo. É a mesma leitura do protótipo do VIS-01.
   */
  it('a pausa e o som trocam de ícone junto com o estado, sem perder o rótulo', () => {
    const root = document.createElement('div');
    mountControls(
      root,
      () => {},
      () => {},
    );
    const pausa = root.querySelector('[data-control="pause"]');
    const som = root.querySelector('[data-control="sound"]');

    renderControls(root, createTimeControl(), false);
    expect([iconeDe(pausa), pausa?.textContent]).toEqual(['pause', ui.controls.pause]);
    expect(iconeDe(som)).toBe('sound');

    renderControls(root, togglePause(createTimeControl()), true);
    expect([iconeDe(pausa), pausa?.textContent]).toEqual(['play', ui.controls.resume]);
    expect(iconeDe(som)).toBe('mute');
    expect(pausa?.querySelectorAll('svg')).toHaveLength(1);
  });

  /**
   * A barra é redesenhada a cada quadro. Um `textContent =` no botão apagaria o
   * ícone, e o `setIcon` o recriaria logo em seguida: a tela ficaria certa, mas
   * lendo o arquivo sessenta vezes por segundo. Por isso o rótulo passa pelo
   * `writeLabel`, e o `<svg>` precisa ser o mesmo depois do redesenho.
   */
  it('redesenhar sem mudar o estado não recria o ícone da pausa', () => {
    const root = document.createElement('div');
    mountControls(
      root,
      () => {},
      () => {},
    );
    renderControls(root, createTimeControl(), false);
    const antes = root.querySelector('[data-control="pause"] svg');

    renderControls(root, createTimeControl(), false);
    expect(root.querySelector('[data-control="pause"] svg')).toBe(antes);
  });

  /**
   * O play vai no caminho principal, como no protótipo: "Começar" sem partida
   * salva, "Continuar" com ela. "Nova partida" apaga o save, e não é o convite.
   */
  it('no título, o play acompanha o caminho principal', () => {
    const root = montarTitulo();
    const continuar = root.querySelector('[data-title="continue"]');
    const nova = root.querySelector('[data-title="new"]');

    renderTitle(root, titleView(null, createTitle()));
    expect([iconeDe(continuar), iconeDe(nova)]).toEqual(['play', 'play']);
    expect(continuar?.closest('[hidden]')).toBe(continuar);

    renderTitle(root, titleView(2047, createTitle()));
    expect([iconeDe(continuar), iconeDe(nova)]).toEqual(['play', null]);
    expect(nova?.textContent).toBe(ui.title.newGame);
  });

  it('no título, o som troca de ícone como o da barra', () => {
    const root = montarTitulo();
    const som = root.querySelector('[data-title="sound"]');

    renderTitle(root, titleView(null, createTitle(), false));
    expect([iconeDe(som), som?.textContent]).toEqual(['sound', ui.sound.mute]);

    renderTitle(root, titleView(null, createTitle(), true));
    expect([iconeDe(som), som?.textContent]).toEqual(['mute', ui.sound.unmute]);
  });

  it('os botões fixos têm o ícone deles, e o texto continua o mesmo', () => {
    const arvore = document.createElement('div');
    mountTreeButton(arvore, 'painel', () => {});

    const painel = document.createElement('div');
    painel.innerHTML = '<div role="dialog"><header data-tree-panel="head"></header></div>';
    mountTreePanel(painel, () => {});

    const regiao = document.createElement('section');
    mountRegionPanel(regiao, () => {});

    const critico = document.createElement('div');
    mountCriticalCard(critico, () => {});

    const fim = document.createElement('section');
    mountOutcome(
      fim,
      () => {},
      () => {},
    );

    const sessao = document.createElement('div');
    mountSession(sessao, { onArm: () => {}, onCancel: () => {}, onReset: () => {} });

    expect(iconeDe(arvore.querySelector('.tree-button'))).toBe('tree');
    expect(iconeDe(painel.querySelector('[data-tree-panel="close"]'))).toBe('close');
    expect(painel.querySelector('[data-tree-panel="close"]')?.textContent).toBe(ui.treePanel.close);
    expect(iconeDe(regiao.querySelector('[data-panel="close"]'))).toBe('close');
    expect(iconeDe(critico.querySelector('[data-critical="resume"]'))).toBe('play');
    expect(iconeDe(fim.querySelector('.outcome__again'))).toBe('play');
    expect(iconeDe(fim.querySelector('[data-outcome="review"]'))).toBe('globe');
    expect(iconeDe(sessao.querySelector('[data-session="arm"]'))).toBe('leave');
    expect(sessao.querySelector('[data-session="arm"]')?.textContent).toBe(ui.session.leave);
  });

  /**
   * Confirmar e cancelar respondem a uma pergunta que apaga a partida. Quem
   * responde precisa ler a consequência, e um desenho ao lado só disputaria a
   * atenção com ela.
   */
  it('confirmar e cancelar o reinício ficam só com o texto', () => {
    const sessao = document.createElement('div');
    mountSession(sessao, { onArm: () => {}, onCancel: () => {}, onReset: () => {} });

    expect(iconeDe(sessao.querySelector('[data-session="confirm"]'))).toBe(null);
    expect(iconeDe(sessao.querySelector('[data-session="cancel"]'))).toBe(null);
  });
});
