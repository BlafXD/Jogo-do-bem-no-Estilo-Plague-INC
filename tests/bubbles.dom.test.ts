// @vitest-environment jsdom

import { describe, expect, it, vi } from 'vitest';

import { ui } from '../src/data/i18n';
import { bubbleKeyOf } from '../src/engine/bubbles';
import { balance, createInitialState, type Bubble, type GameState } from '../src/engine/state';
import { bubblesView, bubblesWorth, renderBubbles } from '../src/ui/bubbles';
import { bubbleHost, mapView, mountMap } from '../src/ui/map';

/**
 * As bolhas de PAC na tela (INTER-04).
 *
 * A mecânica está no tests/bubbles.test.ts, em node. Aqui só o que não existe
 * sem DOM: o botão de verdade, o clique que volta com a chave certa, a posição
 * no palco do mapa e as exigências do §5 do GDD — alvo focável, valor escrito,
 * prazo escrito, ícone como decoração.
 */

function bubble(target: Bubble['target'], value = 5.75, ticksRemaining = balance.bubbleTicks) {
  return { target, value, ticksRemaining } satisfies Bubble;
}

function withBubbles(...bubbles: readonly Bubble[]): GameState {
  return { ...createInitialState(2025), tick: 100, bubbles };
}

/** Monta o mapa (que cria a camada) e devolve a camada das bolhas. */
function mount(): HTMLElement {
  const root = document.createElement('section');
  document.body.replaceChildren(root);
  mountMap(root, mapView(createInitialState(2025), null), () => {});

  const host = bubbleHost(root);
  if (host === null) throw new Error('o mapa não criou a camada das bolhas');
  return host;
}

function botões(host: ParentNode): readonly HTMLButtonElement[] {
  return Array.from(host.querySelectorAll<HTMLButtonElement>('button.bubble'));
}

describe('bubblesView', () => {
  it('escreve o valor com rótulo, e não só o desenho (§5)', () => {
    const [view] = bubblesView(withBubbles(bubble('af'))).bubbles;

    expect(view?.label).toBe(ui.bubbles.claim('6'));
    expect(view?.label).toContain('PAC');
  });

  /**
   * **Para o mais perto, e não para baixo como o PAC do HUD.** A regra do HUD
   * existe para o saldo nunca prometer o que a compra vai negar; aqui o número é
   * ganho, e uma bolha de 5,75 que anuncia "+5" e move o HUD de 78 para 84 faz o
   * jogador desconfiar da conta — medido no Edge, no jogo de verdade.
   */
  it('arredonda o valor para o mais perto', () => {
    expect(bubblesView(withBubbles(bubble('af', 5.75))).bubbles[0]?.label).toBe(
      ui.bubbles.claim('6'),
    );
    expect(bubblesView(withBubbles(bubble('af', 6.2))).bubbles[0]?.label).toBe(
      ui.bubbles.claim('6'),
    );
  });

  it('a frase do leitor de tela diz o valor e a região', () => {
    const state = withBubbles(bubble('oc'));
    const [view] = bubblesView(state).bubbles;

    expect(view?.ariaLabel).toContain('6');
    expect(view?.ariaLabel).toContain(state.regions.oc.name);
  });

  it('a chave é a mesma que o engine reconhece', () => {
    const state = withBubbles(bubble('ea'));
    const [bolha] = state.bubbles;
    const [view] = bubblesView(state).bubbles;

    expect(bolha).toBeDefined();
    expect(view?.key).toBe(bolha === undefined ? '' : bubbleKeyOf(bolha, state.tick));
  });

  /** Nascem de 6 em 6 meses e vivem 12: duas na mesma região acontece. */
  it('separa duas bolhas que calharam na mesma região', () => {
    const view = bubblesView(withBubbles(bubble('af'), bubble('af'), bubble('eu')));

    expect(view.bubbles.map((b) => b.slot)).toEqual([0, 1, 0]);
  });

  it('marca as que estão nos últimos meses, e escreve o prazo', () => {
    const view = bubblesView(withBubbles(bubble('af', 5.75, 2), bubble('eu')));

    expect(view.bubbles[0]?.fading).toBe(true);
    expect(view.bubbles[1]?.fading).toBe(false);
    // O prazo vai escrito: "está sumindo" não pode ser só um pisca-pisca (§5).
    expect(view.bubbles[0]?.hint).toContain('2');
  });

  it('o singular do prazo não sai errado', () => {
    const [view] = bubblesView(withBubbles(bubble('af', 5.75, 1))).bubbles;

    expect(view?.hint).toContain('1 mês');
    expect(view?.hint).not.toContain('1 meses');
  });

  it('bubblesWorth soma o que o atalho recolheria', () => {
    expect(bubblesWorth(withBubbles(bubble('af', 5.75), bubble('eu', 6.25)))).toBeCloseTo(12, 10);
    expect(bubblesWorth(createInitialState(2025))).toBe(0);
  });
});

describe('as bolhas no DOM', () => {
  it('o mapa cria a camada, com rótulo para o leitor de tela', () => {
    const host = mount();

    expect(host.getAttribute('role')).toBe('group');
    expect(host.getAttribute('aria-label')).toBe(ui.bubbles.label);
    expect(botões(host)).toHaveLength(0);
  });

  it('cada bolha é um `button` de verdade, focável pelo teclado (§5)', () => {
    const host = mount();
    renderBubbles(host, bubblesView(withBubbles(bubble('af'))), () => {});

    const [botão] = botões(host);
    expect(botão?.tagName).toBe('BUTTON');
    expect(botão?.type).toBe('button');
    // Nada de `disabled` nem de `tabindex` negativo: o Tab precisa chegar nela.
    expect(botão?.hasAttribute('disabled')).toBe(false);
    expect(botão?.getAttribute('tabindex')).toBeNull();
  });

  it('pousa na posição da região, deslocada para não cobrir o apoio', () => {
    const host = mount();
    renderBubbles(host, bubblesView(withBubbles(bubble('af'))), () => {});

    const [botão] = botões(host);
    expect(botão?.style.left).toMatch(/%$/);
    expect(botão?.style.top).toContain('calc(');
    expect(botão?.style.top).toContain('- 3.4rem');
  });

  it('o clique devolve a chave da bolha', () => {
    const host = mount();
    const onClaim = vi.fn();
    const state = withBubbles(bubble('ea'));
    renderBubbles(host, bubblesView(state), onClaim);

    botões(host)[0]?.click();

    const [bolha] = state.bubbles;
    expect(onClaim).toHaveBeenCalledWith(bolha === undefined ? '' : bubbleKeyOf(bolha, state.tick));
  });

  it('o ícone é decoração: quem carrega o valor é o texto', () => {
    const host = mount();
    renderBubbles(host, bubblesView(withBubbles(bubble('af'))), () => {});

    const svg = botões(host)[0]?.querySelector('svg.icon');
    expect(svg?.getAttribute('aria-hidden')).toBe('true');
    expect(botões(host)[0]?.textContent).toContain('PAC');
  });

  it('a dica com o número está no `title` (§5)', () => {
    const host = mount();
    renderBubbles(host, bubblesView(withBubbles(bubble('af'))), () => {});

    expect(botões(host)[0]?.title).toBe(ui.bubbles.hint(balance.bubbleTicks));
  });

  /**
   * O foco de quem navega por teclado não pode ser arrancado a cada mês: a lista
   * só é reconstruída quando ela muda de verdade, como o boletim de eventos.
   */
  it('não recria os botões quando a lista não mudou', () => {
    const host = mount();
    const state = withBubbles(bubble('af'));

    renderBubbles(host, bubblesView(state), () => {});
    const antes = botões(host)[0];

    renderBubbles(host, bubblesView(state), () => {});
    expect(botões(host)[0]).toBe(antes);
  });

  it('atualiza o prazo e o aviso de fim sem recriar o botão', () => {
    const host = mount();
    renderBubbles(host, bubblesView(withBubbles(bubble('af'))), () => {});
    const antes = botões(host)[0];

    // A mesma bolha, dois meses depois do fim do prazo: mesma chave, outro aviso.
    const velha = { ...withBubbles(bubble('af', 5.75, 2)), tick: 100 + (balance.bubbleTicks - 2) };
    renderBubbles(host, bubblesView(velha), () => {});

    expect(botões(host)[0]).toBe(antes);
    expect(botões(host)[0]?.dataset.fading).toBe('');
  });

  it('a bolha recolhida sai da camada', () => {
    const host = mount();
    renderBubbles(host, bubblesView(withBubbles(bubble('af'))), () => {});
    renderBubbles(host, bubblesView(createInitialState(2025)), () => {});

    expect(botões(host)).toHaveLength(0);
  });

  /** Antes de o mapa existir, não há camada — e isso não pode derrubar o jogo. */
  it('sem camada, não faz nada e não lança', () => {
    expect(() =>
      renderBubbles(null, bubblesView(withBubbles(bubble('af'))), () => {}),
    ).not.toThrow();
  });
});
