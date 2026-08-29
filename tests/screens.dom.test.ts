// @vitest-environment jsdom

import { describe, expect, it } from 'vitest';

import { SCREENS, renderScreens, type Screen, type ScreenLayout } from '../src/ui/screens';

/**
 * O roteador no DOM (P5-06).
 *
 * A regra está no tests/screens.test.ts, que roda em node. Aqui só o que não
 * existe sem DOM: quem some da tela, e — o que mais importa — quem some junto
 * da ordem de tabulação.
 */

function montar(): ScreenLayout & { readonly botao: HTMLButtonElement } {
  const title = document.createElement('section');
  const chrome = document.createElement('header');
  const board = document.createElement('div');
  const skip = document.createElement('nav');

  // Um botão dentro da tela de título, para medir a ordem de tabulação. Na
  // página de verdade este é o "Apagar e recomeçar".
  const botao = document.createElement('button');
  botao.type = 'button';
  title.append(botao);

  document.body.replaceChildren(skip, title, chrome, board);
  return { title, chrome, board, skip, botao };
}

/**
 * O elemento está fora da tela porque ele ou algum ancestral está escondido.
 *
 * É a mesma pergunta que um navegador faz para decidir se algo é focável, e é a
 * única que o jsdom sabe responder: ele computa `display: none` no elemento que
 * tem o `hidden`, mas não propaga isso para os filhos nem para o `focus()`.
 */
function foraDaTela(element: Element): boolean {
  for (let node: Element | null = element; node !== null; node = node.parentElement) {
    if (getComputedStyle(node).display === 'none') return true;
  }

  return false;
}

/** O que está visível numa tela, em texto, para os testes ficarem legíveis. */
function visiveis(layout: ScreenLayout, screen: Screen): readonly string[] {
  renderScreens(layout, screen);

  return (
    [
      ['title', layout.title],
      ['chrome', layout.chrome],
      ['board', layout.board],
      ['skip', layout.skip],
    ] as const
  )
    .filter(([, element]) => !element.hidden)
    .map(([name]) => name);
}

describe('cada tela mostra o que precisa', () => {
  it('no título, só a tela de título', () => {
    expect(visiveis(montar(), 'title')).toEqual(['title']);
  });

  /**
   * O link de pulo entra e sai com o tabuleiro (P8-04): ele existe para
   * contornar as 28 paradas de tabulação do mapa e da árvore, e nas outras duas
   * telas não há bloco nenhum a contornar.
   */
  it('na partida, o topo, o tabuleiro e o link de pulo', () => {
    expect(visiveis(montar(), 'game')).toEqual(['chrome', 'board', 'skip']);
  });

  /**
   * A linha mais pensada do roteador. O outcome.css do P6-08 registrou por que o
   * resultado não virou modal: "um modal cobriria justamente o HUD, que é onde
   * estão os números que o jogador quer ler quando a partida acaba". A tela de
   * fim esconde o tabuleiro, que não tem mais nada para o jogador fazer, e
   * **mantém** o topo, que é o resumo da partida.
   */
  it('no fim, o topo fica e o tabuleiro sai', () => {
    expect(visiveis(montar(), 'end')).toEqual(['chrome']);
  });

  it('nunca deixa a tela de título junto com o resto', () => {
    const layout = montar();

    for (const screen of SCREENS) {
      const abertos = visiveis(layout, screen);
      if (abertos.includes('title')) expect(abertos).toEqual(['title']);
    }
  });
});

describe('o roteador', () => {
  it('volta atrás sem deixar resto — qualquer tela leva a qualquer outra', () => {
    const layout = montar();

    // Passa por todas e volta ao começo: o estado final tem que ser igual ao
    // primeiro, ou alguma tela estaria acendendo algo que ninguém apaga.
    const primeiro = visiveis(layout, 'title');
    for (const screen of ['game', 'end', 'game', 'end'] as const) visiveis(layout, screen);

    expect(visiveis(layout, 'title')).toEqual(primeiro);
  });

  /**
   * `hidden` de verdade, e não `display: none` numa classe de CSS: o que sai da
   * tela precisa sair junto da ordem de tabulação. Um botão invisível mas
   * focável é a armadilha que só quem navega por teclado encontra — e o da tela
   * de título apaga a partida salva.
   *
   * **O teste não é `focus()`, e não podia ser.** O jsdom deixa focar um botão
   * dentro de um bloco escondido: ele não sobe a árvore para decidir
   * focabilidade, e `checkVisibility` não existe nele. O que ele modela é o
   * `display` computado de cada elemento — e a pergunta que decide a
   * focabilidade num navegador de verdade é exatamente essa, feita subindo os
   * ancestrais. É o que `foraDaTela` faz.
   *
   * O que sobra por conta do navegador é se ele honra o `display: none`, e isso
   * está conferido à mão e registrado no PROGRESSO.md.
   */
  it('tira da ordem de tabulação o que tirou da tela', () => {
    const layout = montar();

    renderScreens(layout, 'title');
    expect(foraDaTela(layout.botao)).toBe(false);

    for (const screen of ['game', 'end'] as const) {
      renderScreens(layout, screen);
      expect(foraDaTela(layout.botao), screen).toBe(true);
    }
  });
});
