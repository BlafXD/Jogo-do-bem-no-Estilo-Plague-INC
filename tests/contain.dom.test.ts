// @vitest-environment jsdom

import { describe, expect, it, vi } from 'vitest';

import { ui } from '../src/data/i18n';
import { CONTAIN_REQUIRES } from '../src/engine/inertia';
import { unlockSkill } from '../src/engine/skills';
import { balance, createInitialState, type GameState } from '../src/engine/state';
import { containView, mountContain, renderContain } from '../src/ui/contain';

/**
 * O botão de contenção no DOM (P7-03).
 *
 * A regra está no tests/contain.test.ts, que roda em node. Aqui só o que não
 * existe sem DOM: o clique, o `aria-disabled` em vez de `disabled`, e as
 * exigências do §5 do GDD — ícone com rótulo escrito ao lado, nada de estado
 * comunicado só por cor.
 */

const start = (): GameState => createInitialState(2025);

function destravado(inertia = 80, actionPoints = 2000): GameState {
  if (CONTAIN_REQUIRES === undefined) throw new Error('a árvore não tem raiz de Sociedade');
  const rico = { ...start(), actionPoints: 2000 };
  return { ...unlockSkill(rico, CONTAIN_REQUIRES), inertia, actionPoints };
}

function mount(onContain: () => void = () => {}): HTMLElement {
  const root = document.createElement('section');
  document.body.replaceChildren(root);
  mountContain(root, onContain);
  return root;
}

function show(root: HTMLElement, state: GameState): HTMLElement {
  renderContain(root, containView(state));
  return root;
}

function button(root: ParentNode): HTMLButtonElement {
  const found = root.querySelector<HTMLButtonElement>('[data-contain="button"]');
  if (found === null) throw new Error('botão não montado');
  return found;
}

function textOf(root: ParentNode, selector: string): string {
  return root.querySelector(selector)?.textContent ?? '';
}

describe('o botão de conter', () => {
  it('tem rótulo acessível na seção e dica no botão', () => {
    const root = mount();

    expect(root.getAttribute('aria-label')).toBe(ui.contain.label);
    expect(button(root).title).toBe(ui.contain.hint);
  });

  it('é um <button> de verdade — foco, Enter e Espaço saem de graça', () => {
    expect(button(mount()).tagName).toBe('BUTTON');
    expect(button(mount()).type).toBe('button');
  });

  it('§5: o estado tem ícone E rótulo escrito, e o ícone é decoração', () => {
    const root = show(mount(), destravado());

    expect(textOf(root, '.contain__status-label')).toBe(ui.contain.status.available.label);
    expect(textOf(root, '.contain__icon')).toBe(ui.contain.status.available.icon);
    expect(root.querySelector('.contain__icon')?.getAttribute('aria-hidden')).toBe('true');
  });

  it('o data-status distingue os quatro estados para o CSS', () => {
    const root = mount();

    expect(
      show(root, start()).querySelector('[data-contain="button"]')?.getAttribute('data-status'),
    ).toBe('locked');
    expect(button(show(root, destravado())).dataset.status).toBe('available');
    expect(button(show(root, destravado(80, 0))).dataset.status).toBe('unaffordable');
    expect(button(show(root, destravado(0))).dataset.status).toBe('idle');
  });

  it('usa aria-disabled e não disabled — o bloqueado continua alcançável por Tab', () => {
    // Botão com `disabled` sai da ordem de tabulação, e aí quem navega por
    // teclado não chega nele para ler **por que** está bloqueado.
    const bloqueado = button(show(mount(), start()));

    expect(bloqueado.getAttribute('aria-disabled')).toBe('true');
    expect(bloqueado.disabled).toBe(false);

    expect(button(show(mount(), destravado())).getAttribute('aria-disabled')).toBe('false');
  });

  it('o clique chama o handler, inclusive quando está bloqueado', () => {
    // Quem recusa é o engine, não a tela: o `contain` devolve o estado intacto.
    // Barrar o clique aqui seria uma segunda implementação da mesma regra.
    const onContain = vi.fn();
    const root = mount(onContain);

    show(root, start());
    button(root).click();
    show(root, destravado());
    button(root).click();

    expect(onContain).toHaveBeenCalledTimes(2);
  });

  it('esconde o custo enquanto bloqueado e o mostra quando destrava', () => {
    const root = mount();
    const custo = (): HTMLElement | null => root.querySelector('[data-contain="cost"]');

    show(root, start());
    expect(custo()?.hidden).toBe(true);

    show(root, destravado());
    expect(custo()?.hidden).toBe(false);
    expect(custo()?.textContent).toBe(ui.contain.cost(String(balance.containCost)));
  });

  it('esconde o detalhe quando não há o que explicar', () => {
    const root = mount();
    const detalhe = (): HTMLElement | null => root.querySelector('[data-contain="detail"]');

    show(root, start());
    expect(detalhe()?.hidden).toBe(false);
    expect(detalhe()?.textContent).toContain('Educação climática');

    show(root, destravado());
    expect(detalhe()?.hidden).toBe(true);
    expect(detalhe()?.textContent).toBe('');
  });

  it('atualiza em vez de recriar: o foco de quem navega por teclado sobrevive', () => {
    // A tela é redesenhada a cada mês de jogo. Recriar o botão arrancaria o
    // foco a cada 1,5 s a 1x — a mesma razão que o tree.ts registra.
    const root = mount();
    show(root, destravado());
    const antes = button(root);

    antes.focus();
    show(root, destravado(80, 0));

    expect(button(root)).toBe(antes);
    expect(document.activeElement).toBe(antes);
  });
});
