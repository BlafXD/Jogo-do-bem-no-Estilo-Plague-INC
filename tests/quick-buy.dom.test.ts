// @vitest-environment jsdom

import { describe, expect, it, vi } from 'vitest';

import { ui } from '../src/data/i18n';
import { costFor, skillById } from '../src/engine/skills';
import { createInitialState, skills, type GameState } from '../src/engine/state';
import { mountQuickBuy, quickBuyView, renderQuickBuy, SHELF_LIMIT } from '../src/ui/quick-buy';
import { mountTreeButton, renderTreeButton, treeButtonView } from '../src/ui/tree';

/**
 * A prateleira de compra rápida e a contagem no botão da árvore (INTER-06).
 *
 * A view é pura e roda em node; está junto aqui porque o que importa nela é o
 * botão que sai do outro lado. O que este arquivo cobra é o §5 do GDD — botão de
 * verdade, nome acessível, custo escrito, dica com o número — e a regra de não
 * recriar os botões sem necessidade, que é o que preserva o foco do teclado.
 */

const start = (): GameState => createInitialState(2025);

/** Uma partida com PAC no caixa, mas nada comprado ainda. */
function comPac(actionPoints: number): GameState {
  return { ...start(), actionPoints };
}

function mount(): HTMLElement {
  const root = document.createElement('div');
  document.body.replaceChildren(root);
  mountQuickBuy(root);
  return root;
}

function itens(root: ParentNode): readonly HTMLButtonElement[] {
  return Array.from(root.querySelectorAll<HTMLButtonElement>('button.quick-buy__item'));
}

describe('quickBuyView', () => {
  it('sem PAC, a prateleira está vazia', () => {
    const view = quickBuyView(start());

    expect(view.items).toHaveLength(0);
    expect(view.ready).toBe(0);
  });

  it('mostra os mais baratos ao alcance, em ordem de custo', () => {
    const view = quickBuyView(comPac(500));
    const custos = view.items.map((item) => Number(item.cost.replace(/\D/g, '')));

    expect(view.items.length).toBeGreaterThan(0);
    expect([...custos]).toEqual([...custos].sort((a, b) => a - b));
  });

  it('nunca mostra mais que `SHELF_LIMIT`, mas conta todos os que cabem', () => {
    const view = quickBuyView(comPac(99999));

    expect(view.items).toHaveLength(SHELF_LIMIT);
    expect(view.ready).toBeGreaterThan(SHELF_LIMIT);
  });

  /**
   * A garantia que faz a prateleira ser segura: se o botão aparece, a compra
   * passa. Quem responde é o `canUnlock` do engine, não uma segunda leitura da
   * regra na tela.
   */
  it('todo nó da prateleira é comprável de verdade', () => {
    const state = comPac(200);

    for (const item of quickBuyView(state).items) {
      const skill = skillById(item.id);
      expect(skill).toBeDefined();
      if (skill !== undefined) expect(costFor(state, skill)).toBeLessThanOrEqual(200);
    }
  });

  it('o custo é o do personagem, com desconto de ramo (REF-05)', () => {
    const comAna: GameState = { ...comPac(500), character: 'ana-luiza' };
    const solar = skills.find((skill) => skill.id === 'solar');
    const item = quickBuyView(comAna).items.find((candidate) => candidate.id === 'solar');

    expect(solar).toBeDefined();
    if (solar === undefined || item === undefined) return;
    expect(item.cost).toBe(ui.tree.cost(String(costFor(comAna, solar))));
    expect(costFor(comAna, solar)).toBeLessThan(solar.cost);
  });

  it('o nome acessível diz o nó, o ramo e o custo; a dica diz o efeito', () => {
    const [item] = quickBuyView(comPac(500)).items;
    const skill = item === undefined ? undefined : skillById(item.id);

    expect(item?.ariaLabel).toContain(skill?.name ?? '');
    expect(item?.ariaLabel).toContain('PAC');
    expect(item?.hint).toContain(skill?.description ?? '');
  });
});

describe('a prateleira no DOM', () => {
  it('fica escondida enquanto não há o que comprar', () => {
    const root = mount();
    renderQuickBuy(root, quickBuyView(start()), () => {});

    expect(root.hidden).toBe(true);
    expect(itens(root)).toHaveLength(0);
  });

  it('cada nó é um `button` de verdade, com nome e custo escritos (§5)', () => {
    const root = mount();
    renderQuickBuy(root, quickBuyView(comPac(500)), () => {});

    const [botão] = itens(root);
    expect(root.hidden).toBe(false);
    expect(botão?.tagName).toBe('BUTTON');
    expect(botão?.type).toBe('button');
    expect(botão?.textContent).toContain('PAC');
    expect(botão?.title.length).toBeGreaterThan(10);
  });

  it('o ícone do ramo é decoração', () => {
    const root = mount();
    renderQuickBuy(root, quickBuyView(comPac(500)), () => {});

    expect(itens(root)[0]?.querySelector('svg.icon')?.getAttribute('aria-hidden')).toBe('true');
  });

  it('o clique devolve o id do nó', () => {
    const root = mount();
    const onBuy = vi.fn();
    const view = quickBuyView(comPac(500));
    renderQuickBuy(root, view, onBuy);

    itens(root)[0]?.click();

    expect(onBuy).toHaveBeenCalledWith(view.items[0]?.id);
  });

  it('não recria os botões quando a lista não mudou', () => {
    const root = mount();
    renderQuickBuy(root, quickBuyView(comPac(500)), () => {});
    const antes = itens(root)[0];

    renderQuickBuy(root, quickBuyView(comPac(500)), () => {});

    expect(itens(root)[0]).toBe(antes);
  });

  /**
   * A prateleira acompanha o que já foi comprado — e **não** o saldo: ela mostra
   * sempre os três mais baratos ao alcance, e ganhar mais PAC não muda quais são
   * os três mais baratos. O que muda a lista é a árvore andar.
   */
  it('troca os botões quando a árvore anda', () => {
    const root = mount();
    renderQuickBuy(root, quickBuyView(comPac(500)), () => {});
    const antes = itens(root).map((item) => item.dataset.skill);

    const depois: GameState = { ...comPac(500), unlockedSkills: ['solar', 'wind'] };
    renderQuickBuy(root, quickBuyView(depois), () => {});

    expect(itens(root).map((item) => item.dataset.skill)).not.toEqual(antes);
  });
});

describe('a contagem no botão da árvore', () => {
  function mountButton(): HTMLElement {
    const root = document.createElement('div');
    document.body.replaceChildren(root);
    mountTreeButton(root, 'painel', () => {});
    return root;
  }

  it('fica escondida quando nada cabe no caixa', () => {
    const root = mountButton();
    renderTreeButton(root, treeButtonView(start()));

    const selo = root.querySelector<HTMLElement>('[data-tree-button="ready"]');
    expect(selo?.hidden).toBe(true);
    expect(selo?.textContent).toBe('');
  });

  it('diz quantos nós já cabem, com a palavra escrita (§5)', () => {
    const root = mountButton();
    const view = treeButtonView(comPac(99999));
    renderTreeButton(root, view);

    const selo = root.querySelector<HTMLElement>('[data-tree-button="ready"]');
    expect(selo?.hidden).toBe(false);
    expect(selo?.textContent).toBe(view.ready);
    expect(view.ready).toMatch(/prontos?$/);
  });

  it('o singular não sai errado', () => {
    expect(ui.treeButton.ready(1)).toContain('1 pronto');
    expect(ui.treeButton.ready(1)).not.toContain('prontos');
    expect(ui.treeButton.ready(0)).toBe('');
  });

  it('a dica do botão acompanha a contagem', () => {
    const root = mountButton();

    renderTreeButton(root, treeButtonView(start()));
    expect(root.querySelector('button')?.title).toBe(ui.treeButton.hint);

    renderTreeButton(root, treeButtonView(comPac(99999)));
    expect(root.querySelector('button')?.title).toContain('cabem');
  });
});
