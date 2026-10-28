// A prateleira de compra rápida, na barra de baixo (INTER-06).
//
// **O defeito que ela conserta.** Desde o VIS-05 a árvore mora num painel que
// cobre a tela, e gastar PAC passou a ser: parar de olhar o mundo, abrir o
// painel, escolher, comprar, fechar. Uma partida compra 25 a 30 nós, então são
// 30 idas e voltas — e foi exatamente essa a reclamação do chat em 2026-10-28:
// "não precisar ficar TODA hora na tela de melhorar o personagem". Com a
// prateleira, o gesto mais comum do jogo (comprar o que já está ao alcance)
// acontece sem sair do mapa.
//
// **Ela não substitui o painel, e não deve.** Mostra no máximo `SHELF_LIMIT`
// nós, os mais baratos ao alcance do caixa — quem quer escolher, ler o fato real
// antes de gastar ou planejar um ramo continua abrindo a árvore. O que ela tira
// de lá é a compra óbvia, não a decisão.
//
// **A contagem no botão da árvore é a outra metade.** Sem ela, o jogador precisa
// abrir o painel só para descobrir se tem algo para comprar — e a 4x do Modo
// Feira isso custa meses de jogo. Com ela, o botão diz de longe "tem 3 prontos",
// e a prateleira entrega os três.
//
// Mesma divisão do resto da UI: `quickBuyView` é puro, e só as duas funções de
// baixo tocam no DOM.

import { ui } from '../data/i18n';
import { costFor, readyToUnlock } from '../engine/skills';
import type { GameState, SkillId } from '../engine/state';
import { prependIcon, type IconName } from './icons';

// --------------------------------------------------------------- a view ---

/**
 * Quantos nós a prateleira mostra de uma vez.
 *
 * **Dois, e o número foi medido na tela.** Com três, a 1600 px, a barra de baixo
 * passava da largura: ou a prateleira quebrava em três linhas e comia 90 px de
 * altura do mapa, ou os nomes encolhiam até "E… 36 PAC". Dois cabem na largura
 * que sobra entre as listras e o botão da árvore, com o nome legível — e quem
 * quer escolher entre os outros tem o selo do botão dizendo quantos são.
 */
export const SHELF_LIMIT = 2;

export type QuickBuyItem = {
  readonly id: SkillId;
  readonly name: string;
  /** "40 PAC" — o custo já com o desconto do personagem (REF-05). */
  readonly cost: string;
  /** O ícone do ramo, para o nó ser reconhecido de longe. */
  readonly icon: IconName;
  /** O nome acessível: nome, ramo e custo, sem depender do desenho. */
  readonly ariaLabel: string;
  /** A dica: o que o nó faz, e quanto custa (§5: tooltip em tudo que tem número). */
  readonly hint: string;
};

export type QuickBuyView = {
  /** Os mais baratos ao alcance do caixa, em ordem de custo. */
  readonly items: readonly QuickBuyItem[];
  /**
   * Quantos nós estão ao alcance **agora**, inclusive os que não couberam na
   * prateleira — e é por isso que ele existe: com `SHELF_LIMIT` em 2, o selo do
   * botão da árvore é o único lugar que diz o número de verdade.
   */
  readonly ready: number;
};

const whole = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 0 });

/**
 * A prateleira: o que o PAC de agora compra.
 *
 * **Quem decide o que é comprável é o engine** (`canUnlock`), e não uma segunda
 * leitura da regra aqui — é a mesma razão que o tree.ts registra para o estado
 * de cada nó. Um botão desta prateleira nunca pode ser recusado pelo
 * `unlockSkill`: se ele aparece, a compra passa.
 *
 * **Ordem: o mais barato primeiro.** Não é "o melhor" — a prateleira não tem
 * opinião sobre estratégia, e fingir que tem seria jogar pelo jogador. O mais
 * barato é o critério que ele mesmo usaria para não deixar PAC parado.
 */
export function quickBuyView(state: GameState): QuickBuyView {
  const ready = readyToUnlock(state).map((skill) => ({ skill, cost: costFor(state, skill) }));

  return {
    ready: ready.length,
    items: ready.slice(0, SHELF_LIMIT).map(({ skill, cost }): QuickBuyItem => {
      const written = ui.tree.cost(whole.format(cost));
      const branch = ui.tree.branches[skill.branch];

      return {
        id: skill.id,
        name: skill.name,
        cost: written,
        icon: skill.branch,
        ariaLabel: ui.quickBuy.said(skill.name, branch, written),
        hint: ui.quickBuy.hint(skill.description, written),
      };
    }),
  };
}

// ------------------------------------------------------------------ DOM ---

function itemElement(item: QuickBuyItem, onBuy: (id: SkillId) => void): HTMLButtonElement {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'quick-buy__item';
  button.dataset.skill = item.id;
  button.setAttribute('aria-label', item.ariaLabel);
  button.title = item.hint;

  const name = document.createElement('span');
  name.className = 'quick-buy__name';
  name.textContent = item.name;

  const cost = document.createElement('span');
  cost.className = 'quick-buy__cost';
  cost.textContent = item.cost;

  button.append(name, cost);
  // O ícone do ramo é decoração: o nome do ramo vai no nome acessível.
  prependIcon(button, item.icon, 'quick-buy__icon');
  button.querySelector('svg.icon')?.setAttribute('aria-hidden', 'true');

  button.addEventListener('click', () => onBuy(item.id));
  return button;
}

/** Monta a casca uma vez: o rótulo escrito e a lista vazia. */
export function mountQuickBuy(root: Element): void {
  root.setAttribute('role', 'group');
  root.setAttribute('aria-label', ui.quickBuy.label);

  const label = document.createElement('p');
  label.className = 'quick-buy__label';
  label.textContent = ui.quickBuy.label;

  const list = document.createElement('div');
  list.className = 'quick-buy__list';
  list.dataset.quickBuy = 'list';

  root.replaceChildren(label, list);
}

/**
 * Escreve a prateleira.
 *
 * **Reconstrói só quando a lista muda**, como o boletim e as bolhas: a tela é
 * redesenhada a cada mês, e um `replaceChildren` por mês arrancaria o foco de
 * quem estivesse no meio de uma compra pelo teclado — justamente no botão que
 * ele ia apertar.
 *
 * Com a prateleira vazia a seção inteira sai da tela: uma caixa escrita
 * "Comprar agora" sem nada dentro é ruído, e no começo da partida ela ficaria
 * assim por três anos de jogo.
 */
export function renderQuickBuy(
  root: Element,
  view: QuickBuyView,
  onBuy: (id: SkillId) => void,
): void {
  if (root instanceof HTMLElement) root.hidden = view.items.length === 0;

  const list = root.querySelector<HTMLElement>('[data-quick-buy="list"]');
  if (list === null) return;

  const shown = Array.from(list.querySelectorAll<HTMLElement>('[data-skill]'));
  const wanted = view.items.map((item) => item.id);
  const same =
    shown.length === wanted.length && shown.every((item, i) => item.dataset.skill === wanted[i]);
  if (same) return;

  list.replaceChildren(...view.items.map((item) => itemElement(item, onBuy)));
}
