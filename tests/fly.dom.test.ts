// @vitest-environment jsdom

import { afterEach, describe, expect, it } from 'vitest';

import { flyCost } from '../src/ui/fly';

/**
 * O rótulo que voa na compra (REF-02). O que dá para testar sem um navegador de
 * verdade são os guardas — quando ele NÃO cria nada — e a montagem: posição e
 * texto do elemento. A viagem em si (transform, opacity, transitionend) é do
 * navegador, e o jsdom não a roda.
 */

const rect = (left: number, top: number, width: number, height: number): DOMRect =>
  ({
    left,
    top,
    width,
    height,
    right: left + width,
    bottom: top + height,
    x: left,
    y: top,
    toJSON: () => ({}),
  }) as DOMRect;

function elementoEm(box: DOMRect): HTMLElement {
  const element = document.createElement('button');
  element.getBoundingClientRect = () => box;
  document.body.append(element);
  return element;
}

const fantasma = (): HTMLElement | null => document.querySelector<HTMLElement>('.fly-cost');

afterEach(() => {
  document.body.replaceChildren();
});

describe('flyCost', () => {
  it('não cria nada sem os dois elementos', () => {
    flyCost(null, elementoEm(rect(0, 0, 10, 10)), '−40 PAC');
    flyCost(elementoEm(rect(0, 0, 10, 10)), null, '−40 PAC');

    expect(fantasma()).toBeNull();
  });

  it('não cria nada quando o layout ainda não tem medida (jsdom)', () => {
    // getBoundingClientRect padrão do jsdom devolve tudo zero.
    flyCost(document.createElement('button'), document.createElement('span'), '−40 PAC');

    expect(fantasma()).toBeNull();
  });

  it('solta o rótulo no centro da origem, com o texto pedido', () => {
    const de = elementoEm(rect(10, 20, 40, 10));
    const para = elementoEm(rect(200, 5, 30, 12));

    flyCost(de, para, '−40 PAC');

    const ghost = fantasma();
    expect(ghost).not.toBeNull();
    expect(ghost?.textContent).toBe('−40 PAC');
    // Centro da origem: 10 + 40/2 = 30 ; 20 + 10/2 = 25.
    expect(ghost?.style.left).toBe('30px');
    expect(ghost?.style.top).toBe('25px');
    // Não rouba clique, e não é lido pelo leitor de tela.
    expect(ghost?.style.pointerEvents === 'auto').toBe(false);
    expect(ghost?.getAttribute('aria-hidden')).toBe('true');
  });
});
