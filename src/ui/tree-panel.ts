// O painel da árvore (VIS-05): a árvore e a contenção por cima da partida.
//
// **Por que um painel.** Com a partida em tela cheia (VIS-04), o mapa e a
// coluna ocupam a janela, e a árvore ficava embaixo deles, fora da tela. O
// painel a traz para cima do mundo quando o jogador pede, e a tira quando ele
// termina — o mapa volta inteiro, sem rolagem.
//
// **O tempo continua correndo com o painel aberto.** Decidido no chat em
// 2026-09-17: as pausas automáticas do plano são duas, o evento crítico e o ramo
// novo, e abrir a árvore não é nenhuma delas. As teclas do tempo (`Espaço`, `1`,
// `2`, `4`) continuam valendo com ele aberto, porque o main.ts as escuta no
// documento inteiro.
//
// **É uma janela modal de verdade**, e isso pede três coisas:
// - o resto da página fica `inert` — nem o mouse nem o Tab chegam lá;
// - o Tab dá a volta dentro do painel, em vez de escapar para a barra do
//   navegador;
// - `Esc` fecha, e o foco volta para quem abriu (§5 do GDD).
// O `<dialog>` nativo faria as três sozinho, mas o jsdom dos testes não tem o
// `showModal`, e um painel que só se testa no navegador é um painel que quebra
// calado.
//
// Mesma divisão do resto da UI: `treePanelView` é puro, e só as funções de baixo
// tocam no DOM.

import { ui } from '../data/i18n';
import type { GameState } from '../engine/state';
import { wholePoints } from './tree';

// --------------------------------------------------------------- a view ---

export type TreePanelView = {
  readonly open: boolean;
  /** O PAC para gastar, sem unidade: o rótulo em cima dele já diz o que é. */
  readonly points: string;
};

/**
 * O painel só abre na partida. No título e na tela de fim ele fica fechado,
 * mesmo que o jogador o tenha deixado aberto: a partida que acaba com a árvore
 * na tela precisa mostrar o resultado, e não a árvore.
 */
export function treePanelView(state: GameState, open: boolean, inGame: boolean): TreePanelView {
  return { open: open && inGame, points: wholePoints(state) };
}

// ------------------------------------------------------------------ DOM ---

/** O que pode receber foco dentro do painel, na ordem da página. */
const FOCUSABLE = 'button, a[href], [tabindex]:not([tabindex="-1"])';

function focusables(dialog: Element): HTMLElement[] {
  return [...dialog.querySelectorAll<HTMLElement>(FOCUSABLE)].filter(
    (element) => element.closest('[hidden]') === null,
  );
}

/**
 * Prende o Tab dentro do painel: do último vai para o primeiro, e do primeiro,
 * com Shift, para o último.
 */
function trapTab(dialog: HTMLElement, event: KeyboardEvent): void {
  if (event.key !== 'Tab') return;

  const all = focusables(dialog);
  const first = all[0];
  const last = all.at(-1);
  if (first === undefined || last === undefined) return;

  const active = document.activeElement;
  if (event.shiftKey && (active === first || !dialog.contains(active))) {
    event.preventDefault();
    last.focus();
  } else if (!event.shiftKey && active === last) {
    event.preventDefault();
    first.focus();
  }
}

/**
 * Monta o cabeçalho do painel e liga os três jeitos de fechar: o botão, o
 * clique no fundo escurecido e o `Esc` — este último pelo main.ts, que é quem
 * decide a ordem do que o `Esc` fecha.
 *
 * `root` é o fundo, e o `[role="dialog"]` dentro dele já vem do index.html, com
 * a árvore e a coluna do detalhe no lugar.
 */
export function mountTreePanel(root: HTMLElement, onClose: () => void): void {
  const dialog = root.querySelector<HTMLElement>('[role="dialog"]');
  const head = root.querySelector<HTMLElement>('[data-tree-panel="head"]');
  if (dialog === null || head === null) return;

  const title = document.createElement('h2');
  title.className = 'tree-panel__title';
  title.id = `${root.id}-titulo`;
  title.textContent = ui.treePanel.title;
  dialog.setAttribute('aria-labelledby', title.id);

  const intro = document.createElement('p');
  intro.className = 'tree-panel__intro';
  intro.textContent = ui.tree.intro;

  // O saldo, grande, no canto: é o número que decide cada clique do painel, e o
  // HUD que o mostra fica escondido atrás do fundo escurecido.
  const balance = document.createElement('p');
  balance.className = 'tree-panel__balance';
  balance.title = ui.treePanel.balanceHint;
  const label = document.createElement('span');
  label.className = 'tree-panel__balance-label';
  label.textContent = ui.treePanel.balance;
  const points = document.createElement('strong');
  points.className = 'tree-panel__points';
  points.dataset.treePanel = 'points';
  balance.append(label, ' ', points);

  const close = document.createElement('button');
  close.type = 'button';
  close.className = 'tree-panel__close';
  close.dataset.treePanel = 'close';
  close.textContent = ui.treePanel.close;
  close.title = ui.treePanel.closeHint;
  close.addEventListener('click', onClose);

  head.replaceChildren(title, intro, balance, close);

  // Só o clique no próprio fundo fecha: um clique dentro do painel que borbulha
  // até aqui não pode fechá-lo.
  root.addEventListener('click', (event) => {
    if (event.target === root) onClose();
  });
  dialog.addEventListener('keydown', (event) => trapTab(dialog, event));
}

/**
 * Abre ou fecha o painel, e desliga o resto da página enquanto ele está aberto.
 *
 * `background` são os blocos que ficam atrás do painel. O `inert` vai como
 * atributo, e não como propriedade, porque o jsdom dos testes não conhece a
 * propriedade — e o atributo é o que o navegador honra.
 */
export function renderTreePanel(
  root: HTMLElement,
  view: TreePanelView,
  background: readonly HTMLElement[],
): void {
  root.hidden = !view.open;
  for (const block of background) block.toggleAttribute('inert', view.open);

  const points = root.querySelector('[data-tree-panel="points"]');
  if (points !== null && points.textContent !== view.points) points.textContent = view.points;
}

/** Leva o foco ao botão de fechar — o pouso quando não há nó a focar. */
export function focusClose(root: ParentNode): void {
  root.querySelector<HTMLElement>('[data-tree-panel="close"]')?.focus();
}
