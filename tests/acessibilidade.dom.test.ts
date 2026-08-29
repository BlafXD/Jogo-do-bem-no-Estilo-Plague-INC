// @vitest-environment jsdom

import { describe, expect, it } from 'vitest';
import { ui } from '../src/data/i18n';
import { MEDAL_CEILING } from '../src/engine/outcome';
import { balance } from '../src/engine/state';
import { activatesFocusedButton, commandForKey, mountControls } from '../src/ui/controls';
import { celsius } from '../src/ui/format';
import { mountHud } from '../src/ui/hud';
import { mountSession } from '../src/ui/session';
import { mountSkipLink } from '../src/ui/skip-link';

/**
 * A passagem de acessibilidade (P8-04).
 *
 * **O que este arquivo cobre e o que ele não cobre.** Ele cobre as regras que
 * moram no DOM: quem tem nome, quem é focável, que tecla chega ao atalho. Não
 * cobre contraste — isso é o `tests/theme.test.ts`, que recalcula a paleta pela
 * fórmula da WCAG 2.1 — nem o refluxo em tela estreita, que precisa de um
 * navegador de verdade e está medido no `PROGRESSO.md`.
 */

// ---------------------------------------------------------- link de pulo ---

function paginaComPulo(): { nav: HTMLElement; board: HTMLElement; tree: HTMLElement } {
  const nav = document.createElement('nav');
  const board = document.createElement('div');
  board.id = 'tabuleiro';
  const tree = document.createElement('section');
  tree.id = 'arvore';

  document.body.replaceChildren(nav, board, tree);
  mountSkipLink(nav, board, tree);
  return { nav, board, tree };
}

describe('o link de pulo', () => {
  it('oferece os dois saltos, com rótulo escrito', () => {
    const { nav } = paginaComPulo();
    const links = [...nav.querySelectorAll('a')];

    expect(links.map((a) => a.textContent)).toEqual([ui.skipLink.toContent, ui.skipLink.toTree]);
  });

  it('aponta para o id de cada alvo', () => {
    const { nav } = paginaComPulo();

    expect([...nav.querySelectorAll('a')].map((a) => a.getAttribute('href'))).toEqual([
      '#tabuleiro',
      '#arvore',
    ]);
  });

  /**
   * **O alvo precisa ser focável por código, e só por código.**
   *
   * `<section>` não recebe foco sozinho, então o salto rolaria a página e
   * deixaria o foco do teclado para trás — o Tab seguinte recomeçaria do topo.
   * `tabindex="-1"` resolve isso; `tabindex="0"` resolveria também e criaria
   * duas paradas novas, transformando o atalho que economiza Tab em atalho que
   * cobra Tab.
   */
  it('torna os alvos focáveis por código, sem criar parada de tabulação', () => {
    const { board, tree } = paginaComPulo();

    // O **atributo**, e não a propriedade: `element.tabIndex` já devolve -1
    // sozinho num elemento que nunca recebeu `tabindex`, então a asserção pela
    // propriedade passaria mesmo se o `mountSkipLink` não fizesse nada. Foi o
    // que aconteceu na primeira versão deste teste.
    expect(board.getAttribute('tabindex')).toBe('-1');
    expect(tree.getAttribute('tabindex')).toBe('-1');
  });

  it('o clique leva o foco junto, e não só a rolagem', () => {
    const { nav, tree } = paginaComPulo();
    const paraArvore = [...nav.querySelectorAll('a')][1];

    paraArvore?.click();

    expect(document.activeElement).toBe(tree);
  });

  it('não deixa a URL virar rota — o jogo é página única', () => {
    const { nav } = paginaComPulo();
    const link = nav.querySelector('a');

    const evento = new MouseEvent('click', { bubbles: true, cancelable: true });
    link?.dispatchEvent(evento);

    expect(evento.defaultPrevented).toBe(true);
  });
});

// ---------------------------------------------------- guarda dos atalhos ---

/**
 * A guarda do ouvinte de teclado, que era ampla demais até o P8-04.
 *
 * O `main.ts` desiste do atalho quando a tecla ativaria o botão em foco. A
 * regra em si mora no `controls.ts` justamente para caber num teste: a colisão
 * é impossível de reproduzir por evento sintético, porque o despacho por script
 * não dispara o comportamento nativo do botão — foi o que o P5-05 registrou
 * depois de ter que apertar a tecla à mão.
 */
describe('a guarda dos atalhos de tempo', () => {
  it('a barra de espaço ativa o botão em foco — e por isso a guarda desiste dela', () => {
    expect(activatesFocusedButton(' ')).toBe(true);
    expect(activatesFocusedButton('Spacebar')).toBe(true);
    expect(activatesFocusedButton('Enter')).toBe(true);
  });

  /**
   * **O conserto do P8-04, em uma linha.** As teclas de velocidade não ativam
   * botão nenhum, então nunca houve colisão para evitar — e mesmo assim elas
   * morriam com o foco em qualquer um dos 27 botões de uma partida.
   */
  it('as teclas de velocidade não ativam botão, então a guarda as deixa passar', () => {
    for (const tecla of ['1', '2', '4']) {
      expect(activatesFocusedButton(tecla)).toBe(false);
      expect(commandForKey(tecla)).not.toBeNull();
    }
  });
});

// ------------------------------------------------------- nome dos blocos ---

/**
 * Um `aria-label` num `<div>` sem papel é **descartado**: a ARIA proíbe nomear
 * o papel genérico. Os três blocos do cabeçalho são `<div>` no index.html, e os
 * três estavam nesse estado — o `role` é o que faz o nome existir.
 */
describe('os blocos do cabeçalho têm nome que chega ao leitor de tela', () => {
  const casos = [
    ['HUD', (root: Element) => mountHud(root), ui.hudLabel],
    ['controle de tempo', (root: Element) => mountControls(root, () => {}), ui.controls.label],
    [
      'barra da partida',
      (root: Element) =>
        mountSession(root, { onArm: () => {}, onCancel: () => {}, onReset: () => {} }),
      ui.session.label,
    ],
  ] as const;

  for (const [nome, montar, rotulo] of casos) {
    it(`${nome}: papel e rótulo, não só rótulo`, () => {
      const root = document.createElement('div');
      montar(root);

      expect(root.getAttribute('aria-label')).toBe(rotulo);
      expect(root.getAttribute('role')).toBe('group');
    });
  }
});

// ------------------------------------------------------ atalhos escritos ---

describe('os atalhos aparecem na tela', () => {
  it('a barra de tempo escreve os atalhos, e não só os põe no title', () => {
    const root = document.createElement('div');
    mountControls(root, () => {});

    expect(root.querySelector('.ctl__shortcuts')?.textContent).toBe(ui.controls.shortcuts);
  });

  /**
   * O texto precisa citar as teclas de verdade. Se um atalho mudar no
   * `commandForKey` e a frase ficar para trás, ela vira instrução errada — pior
   * que instrução nenhuma.
   */
  it('a frase cita as teclas que o commandForKey aceita', () => {
    for (const tecla of ['1', '2', '4']) {
      expect(commandForKey(tecla)).not.toBeNull();
      expect(ui.controls.shortcuts).toContain(tecla);
    }

    expect(ui.controls.shortcuts.toLowerCase()).toContain('espaço');
  });
});

// ------------------------------------------------- legibilidade do limiar ---

/**
 * O "2 °C" que o P7-06 adiou duas vezes para cá.
 *
 * Numa pilha vertical ao lado de "1,5" e "2,55", o "2" sozinho parece erro de
 * digitação. Uma casa no mínimo conserta sem estragar o "2,55" do bronze, que
 * precisa das duas.
 */
describe('os limiares de temperatura', () => {
  it('sempre trazem ao menos uma casa decimal', () => {
    expect(celsius(MEDAL_CEILING.silver)).toBe(`2,0 ${ui.units.celsius}`);
    expect(celsius(balance.loseTemperature)).toBe(`3,0 ${ui.units.celsius}`);
  });

  it('não inventam casa em quem já tem', () => {
    expect(celsius(MEDAL_CEILING.gold)).toBe(`1,5 ${ui.units.celsius}`);
    expect(celsius(MEDAL_CEILING.bronze)).toBe(`2,55 ${ui.units.celsius}`);
  });

  /**
   * A razão de existir do `format.ts`: o cartão de fim e o gráfico escrevem os
   * mesmos limiares, e cada um tinha o seu formatador. Este teste falha se
   * alguém devolver um `Intl.NumberFormat` local a qualquer um dos dois.
   */
  it('nenhum limiar sai com o número truncado', () => {
    const limiares = [
      MEDAL_CEILING.gold,
      MEDAL_CEILING.silver,
      MEDAL_CEILING.bronze,
      balance.loseTemperature,
    ];

    for (const valor of limiares) {
      expect(celsius(valor)).toMatch(/^\d+,\d{1,2} /);
    }
  });
});
