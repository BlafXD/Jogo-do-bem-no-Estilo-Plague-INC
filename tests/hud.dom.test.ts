// @vitest-environment jsdom

import { describe, expect, it } from 'vitest';

import { MEDAL_CEILING } from '../src/engine/outcome';
import { balance, createInitialState } from '../src/engine/state';
import { hudView, mountHud, renderHud } from '../src/ui/hud';
import { RULER_BANDS, rulerMark } from '../src/ui/stripes';

/**
 * A régua de medalhas sob a temperatura (VIS-04). O texto do HUD está no
 * tests/hud.test.ts, que roda em node, e o nome do bloco no
 * tests/acessibilidade.dom.test.ts; aqui só a régua.
 */

function montar(): HTMLElement {
  const root = document.createElement('div');
  document.body.replaceChildren(root);
  mountHud(root);
  return root;
}

const regua = (root: ParentNode): HTMLElement | null =>
  root.querySelector<HTMLElement>('.hud__ruler');

/**
 * Onde o marcador está, em %. Lido como número: o navegador — e o jsdom —
 * reescrevem "100.0%" como "100%", e comparar o texto seria comparar a
 * formatação.
 */
const posicao = (root: ParentNode): number =>
  Number.parseFloat(root.querySelector<HTMLElement>('[data-hud="mark"]')?.style.left ?? '');

describe('a régua de medalhas', () => {
  it('mora na caixa da temperatura, e em mais nenhuma', () => {
    const root = montar();
    const reguas = [...root.querySelectorAll('.hud__ruler')];

    expect(reguas).toHaveLength(1);
    expect(reguas[0]?.closest('.hud__item')?.querySelector('[data-hud="temperature"]')).not.toBe(
      null,
    );
  });

  /**
   * O número está escrito logo acima, e a faixa por extenso está na legenda do
   * mapa. Anunciar quatro traços coloridos seria ruído.
   */
  it('fica fora do leitor de tela', () => {
    expect(regua(montar())?.getAttribute('aria-hidden')).toBe('true');
  });

  it('desenha as quatro faixas, com a largura proporcional a cada uma', () => {
    const faixas = [...(regua(montar())?.querySelectorAll<HTMLElement>('i') ?? [])];

    expect(faixas.map((faixa) => faixa.dataset.band)).toEqual(RULER_BANDS.map((b) => b.band));
    faixas.forEach((faixa, i) => {
      const banda = RULER_BANDS[i];
      expect(Number(faixa.style.flexGrow)).toBeCloseTo((banda?.to ?? 0) - (banda?.from ?? 0));
    });
  });

  it('o marcador cai onde a temperatura está', () => {
    const root = montar();
    const quente = { ...createInitialState(2025), temperature: MEDAL_CEILING.silver };

    renderHud(root, hudView(quente), rulerMark(quente.temperature));

    expect(posicao(root)).toBeCloseTo(rulerMark(MEDAL_CEILING.silver) * 100, 1);
  });

  it('o marcador não sai da régua', () => {
    const root = montar();
    const estado = createInitialState(2025);

    renderHud(root, hudView(estado), 7);
    expect(posicao(root)).toBe(100);

    renderHud(root, hudView(estado), -2);
    expect(posicao(root)).toBe(0);
  });

  it('escrever os valores não apaga a régua', () => {
    const root = montar();

    renderHud(root, hudView({ ...createInitialState(2025), temperature: balance.loseTemperature }));

    expect(regua(root)?.querySelectorAll('i')).toHaveLength(RULER_BANDS.length);
    expect(root.querySelector('[data-hud="temperature"]')?.textContent).toContain('3,00');
  });
});
