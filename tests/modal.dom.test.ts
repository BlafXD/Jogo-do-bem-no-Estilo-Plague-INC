// @vitest-environment jsdom

import { beforeEach, describe, expect, it } from 'vitest';
import { canRefocus, setInert } from '../src/ui/modal';

/**
 * O que as duas janelas por cima da partida compartilham (VIS-05, VIS-07). O
 * Tab preso é testado pelos testes do painel e do cartão crítico, que o usam.
 */

beforeEach(() => {
  document.body.replaceChildren();
});

describe('setInert', () => {
  it('desliga e religa os blocos de trás', () => {
    const blocos = [document.createElement('header'), document.createElement('main')];
    document.body.append(...blocos);

    setInert(blocos, true);
    for (const bloco of blocos) expect(bloco.hasAttribute('inert')).toBe(true);

    setInert(blocos, false);
    for (const bloco of blocos) expect(bloco.hasAttribute('inert')).toBe(false);
  });

  /** As duas janelas podem estar abertas juntas; ligar duas vezes não desliga. */
  it('ligar de novo não alterna', () => {
    const bloco = document.createElement('main');

    setInert([bloco], true);
    setInert([bloco], true);

    expect(bloco.hasAttribute('inert')).toBe(true);
  });
});

describe('canRefocus', () => {
  it('aceita um botão na página, e recusa o nulo e o corpo', () => {
    const botao = document.createElement('button');
    document.body.append(botao);

    expect(canRefocus(botao)).toBe(true);
    expect(canRefocus(null)).toBe(false);
    expect(canRefocus(document.body)).toBe(false);
  });

  it('recusa o que saiu da página, o escondido e o desligado', () => {
    const fora = document.createElement('button');
    const escondido = document.createElement('div');
    escondido.hidden = true;
    const dentroDoEscondido = document.createElement('button');
    escondido.append(dentroDoEscondido);
    const desligado = document.createElement('div');
    desligado.setAttribute('inert', '');
    const dentroDoDesligado = document.createElement('button');
    desligado.append(dentroDoDesligado);
    document.body.append(escondido, desligado);

    expect(canRefocus(fora)).toBe(false);
    expect(canRefocus(dentroDoEscondido)).toBe(false);
    expect(canRefocus(dentroDoDesligado)).toBe(false);
  });
});
