// @vitest-environment jsdom

import { afterEach, describe, expect, it, vi } from 'vitest';
import { showToast } from '../src/ui/toast';

/**
 * O pop-up de efeito ao comprar um nó (toast.ts), pedido no chat em
 * 2026-10-26. Como o fly.ts, a viagem em si (animação, transitionend) é do
 * navegador; o que dá para testar sem ele é o conteúdo, o empilhamento, o
 * aviso ao leitor de tela e o sumiço sozinho.
 */

afterEach(() => {
  document.body.replaceChildren();
  vi.useRealTimers();
});

describe('showToast', () => {
  it('mostra o título e o texto pedidos', () => {
    showToast('Novo efeito desbloqueado', 'Energia solar em escala — corta as emissões.');

    const toast = document.querySelector('.toast');
    expect(toast?.querySelector('.toast__title')?.textContent).toBe('Novo efeito desbloqueado');
    expect(toast?.querySelector('.toast__text')?.textContent).toBe(
      'Energia solar em escala — corta as emissões.',
    );
  });

  it('empilha mais de um aviso ao mesmo tempo', () => {
    showToast('a', '1');
    showToast('b', '2');

    expect(document.querySelectorAll('.toast')).toHaveLength(2);
  });

  it('o recipiente avisa quem usa leitor de tela, sem interromper', () => {
    showToast('a', '1');

    expect(document.querySelector('.toast-stack')?.getAttribute('aria-live')).toBe('polite');
  });

  it('some sozinho depois de alguns segundos', () => {
    vi.useFakeTimers();
    showToast('a', '1');
    expect(document.querySelectorAll('.toast')).toHaveLength(1);

    vi.advanceTimersByTime(10_000);
    expect(document.querySelectorAll('.toast')).toHaveLength(0);
  });

  it('reaproveita o mesmo recipiente entre avisos', () => {
    showToast('a', '1');
    const primeiro = document.querySelector('.toast-stack');

    showToast('b', '2');
    const segundo = document.querySelector('.toast-stack');

    expect(document.querySelectorAll('.toast-stack')).toHaveLength(1);
    expect(primeiro).toBe(segundo);
  });
});
