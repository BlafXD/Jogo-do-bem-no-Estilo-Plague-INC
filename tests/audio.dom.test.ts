// @vitest-environment jsdom

import { describe, expect, it, vi } from 'vitest';
import { ui } from '../src/data/i18n';
import { createTimeControl } from '../src/ui/controls';
import { mountControls, renderControls } from '../src/ui/controls';
import { loadMuted, MUTE_KEY, saveMuted } from '../src/ui/storage';

/**
 * O botão de som na barra de controle e a preferência guardada (P7-05).
 *
 * O que ele toca está no tests/audio.test.ts, que roda em node. Aqui só o que
 * não existe sem DOM: o botão ser botão de verdade, o rótulo dizer a ação, e o
 * estado aparecer por forma — nunca só por cor, que é o que o §5 proíbe.
 */

function barra(): HTMLElement {
  const root = document.createElement('div');
  document.body.replaceChildren(root);
  return root;
}

const botao = (root: ParentNode): HTMLButtonElement | null =>
  root.querySelector('[data-control="sound"]');

describe('o botão de som', () => {
  it('é um <button> de verdade, com dica e rótulo escritos', () => {
    const root = barra();
    mountControls(root, vi.fn(), vi.fn());
    renderControls(root, createTimeControl(), false);

    const alvo = botao(root);
    expect(alvo).not.toBeNull();
    expect(alvo?.tagName).toBe('BUTTON');
    // `type="button"` importa: o padrão de um <button> é `submit`, e num
    // formulário isso recarregaria a página em vez de silenciar o jogo.
    expect(alvo?.type).toBe('button');
    expect(alvo?.title).toBe(ui.sound.hint);
  });

  it('o rótulo é a ação, e ele acompanha o estado', () => {
    const root = barra();
    mountControls(root, vi.fn(), vi.fn());

    renderControls(root, createTimeControl(), false);
    expect(botao(root)?.textContent).toContain(ui.sound.mute);

    renderControls(root, createTimeControl(), true);
    expect(botao(root)?.textContent).toContain(ui.sound.unmute);
  });

  /**
   * A regra do §5 aplicada ao pé da letra: o estado precisa aparecer sem cor.
   * São dois sinais e nenhum deles é tinta — o marcador ● e a classe que engrossa
   * a borda, o mesmo vocabulário das velocidades.
   */
  it('marca "há som" por forma, não por cor', () => {
    const root = barra();
    mountControls(root, vi.fn(), vi.fn());

    renderControls(root, createTimeControl(), false);
    expect(botao(root)?.classList.contains('is-active')).toBe(true);

    renderControls(root, createTimeControl(), true);
    expect(botao(root)?.classList.contains('is-active')).toBe(false);

    // O marcador fica sempre no DOM — some por `visibility`, no CSS — para o
    // botão não mudar de largura ao ser clicado.
    expect(botao(root)?.querySelector('.ctl__marker')).not.toBeNull();
  });

  it('avisa quem montou, uma vez por clique', () => {
    const root = barra();
    const onToggle = vi.fn();
    mountControls(root, vi.fn(), onToggle);
    renderControls(root, createTimeControl(), false);

    botao(root)?.click();
    botao(root)?.click();

    expect(onToggle).toHaveBeenCalledTimes(2);
  });

  /**
   * O botão entra **antes** da linha de atalhos, e não depois.
   *
   * Não é capricho de ordem: a linha de atalhos ocupa a fileira inteira do flex
   * (`flex: 1 0 100%`, no controls.css), então um botão depois dela cairia
   * sozinho numa terceira linha da barra. É o tipo de coisa que só se vê no
   * navegador — e por isso fica travada aqui.
   */
  it('fica entre as velocidades e a linha de atalhos', () => {
    const root = barra();
    mountControls(root, vi.fn(), vi.fn());

    const filhos = [...root.children];
    const som = filhos.findIndex((filho) => filho.matches('[data-control="sound"]'));
    const atalhos = filhos.findIndex((filho) => filho.matches('.ctl__shortcuts'));
    const ultimaVelocidade = filhos.findIndex((filho) => filho.matches('[data-speed="4"]'));

    expect(ultimaVelocidade).toBeLessThan(som);
    expect(som).toBeLessThan(atalhos);
  });
});

describe('a preferência de som', () => {
  it('sem nada guardado, o jogo tem som', () => {
    window.localStorage.removeItem(MUTE_KEY);
    expect(loadMuted()).toBe(false);
  });

  it('vai e volta pelo armazenamento', () => {
    expect(saveMuted(true)).toBe(true);
    expect(loadMuted()).toBe(true);

    expect(saveMuted(false)).toBe(true);
    expect(loadMuted()).toBe(false);
  });

  /**
   * Chave separada da partida, e o teste existe para a separação não se perder
   * numa limpeza futura: é ela que faz a escolha sobreviver ao Modo Feira, que
   * não salva partida nenhuma (P7-07).
   */
  it('mora numa chave própria, fora do save', () => {
    saveMuted(true);
    expect(MUTE_KEY).not.toBe('ponto-de-virada:partida');
    expect(window.localStorage.getItem(MUTE_KEY)).toBe('1');
  });
});
