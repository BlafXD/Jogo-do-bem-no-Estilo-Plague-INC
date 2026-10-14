// O painel de conquistas do título (CONQ-02, 2ª entrega).
//
// **Por que um painel, e não um quarto bloco na tela.** Decidido no chat em
// 2026-10-14: a tela de título é a do protótipo aprovado no VIS-08 — a abertura
// à esquerda, a equipe à direita e as listras embaixo —, e enfiar seis
// conquistas ali empurraria as listras para fora da vista num estande. O painel
// deixa o layout intacto e cobra um clique de quem quiser ver.
//
// É uma janela modal de verdade, como o painel da árvore (VIS-05): o resto da
// página fica `inert`, o Tab dá a volta dentro dela (modal.ts), e `Esc` fecha
// com o foco voltando para quem abriu (§5 do GDD). Quem decide a ordem do que o
// `Esc` fecha é o main.ts.
//
// **A lista não é montada aqui.** Ela vem do achievements.ts, a mesma peça que
// a tela de fim usa — é o que impede as duas telas de divergirem no dia em que
// um item ganhar uma linha.
//
// Mesma divisão do resto da UI: as views são puras, e só as funções de baixo
// tocam no DOM.

import { ui } from '../data/i18n';
import { mountShelf, renderShelf, shelfView, type ShelfView } from './achievements';
import { prependIcon, writeLabel } from './icons';
import { trapTab } from './modal';

// --------------------------------------------------------------- a view ---

export type AchievementsPanelView = {
  readonly open: boolean;
  readonly shelf: ShelfView;
};

/**
 * O painel só abre no título.
 *
 * **Fechado em qualquer outra tela, mesmo que o jogador o tenha deixado
 * aberto** — é a mesma regra do `treePanelView`, e pela mesma razão: a partida
 * que começa com um painel na frente é uma partida que ninguém vê começar.
 */
export function achievementsPanelView(
  stored: readonly string[],
  open: boolean,
  onTitle: boolean,
): AchievementsPanelView {
  return { open: open && onTitle, shelf: shelfView([], stored) };
}

/** O botão do título: "Conquistas · 3 de 6". */
export type AchievementsButtonView = {
  readonly label: string;
  readonly hint: string;
};

export function achievementsButtonView(stored: readonly string[]): AchievementsButtonView {
  const { tally } = shelfView([], stored);

  return {
    label: ui.achievements.button(tally),
    hint: ui.achievements.buttonHint,
  };
}

// ------------------------------------------------------------------ DOM ---

/**
 * Monta o painel inteiro uma vez e liga os três jeitos de fechar: o botão, o
 * clique no fundo escurecido e o `Esc` — este último pelo main.ts.
 *
 * Ao contrário do painel da árvore, o conteúdo **não** vem do index.html: lá a
 * árvore, o detalhe e a contenção são três seções que outros módulos montam, e
 * aqui há uma lista só. Pôr a casca no HTML seria espalhar por dois arquivos
 * uma peça que cabe em um.
 */
export function mountAchievementsPanel(root: HTMLElement, onClose: () => void): void {
  const dialog = document.createElement('div');
  dialog.className = 'achievements-panel__dialog';
  dialog.setAttribute('role', 'dialog');
  dialog.setAttribute('aria-modal', 'true');

  const head = document.createElement('header');
  head.className = 'achievements-panel__head';

  const title = document.createElement('h2');
  title.className = 'achievements-panel__title';
  title.id = `${root.id}-titulo`;
  title.textContent = ui.achievements.label;
  dialog.setAttribute('aria-labelledby', title.id);

  const intro = document.createElement('p');
  intro.className = 'achievements-panel__intro';
  intro.textContent = ui.achievements.intro;

  // A contagem grande no canto, como o saldo de PAC no painel da árvore: é o
  // número que a pessoa veio ver.
  const tally = document.createElement('p');
  tally.className = 'achievements-panel__tally';

  const tallyLabel = document.createElement('span');
  tallyLabel.className = 'achievements-panel__tally-label';
  tallyLabel.textContent = ui.achievements.tallyLabel;

  const tallyValue = document.createElement('strong');
  tallyValue.className = 'achievements-panel__count';
  tallyValue.dataset.achievementsPanel = 'tally';

  tally.append(tallyLabel, tallyValue);

  const close = document.createElement('button');
  close.type = 'button';
  close.className = 'achievements-panel__close';
  close.dataset.achievementsPanel = 'close';
  writeLabel(close, ui.achievements.close);
  prependIcon(close, 'close', 'icon--button');
  close.title = ui.achievements.closeHint;
  close.addEventListener('click', onClose);

  head.append(title, intro, tally, close);

  const body = document.createElement('div');
  body.className = 'achievements-panel__body';
  body.append(mountShelf('achievements-panel__shelf'));

  dialog.append(head, body);
  root.replaceChildren(dialog);

  // Só o clique no próprio fundo fecha: um clique dentro do painel que borbulha
  // até aqui não pode fechá-lo.
  root.addEventListener('click', (event) => {
    if (event.target === root) onClose();
  });
  dialog.addEventListener('keydown', (event) => trapTab(dialog, event));
}

/** Abre ou fecha o painel, e escreve a prateleira. */
export function renderAchievementsPanel(root: HTMLElement, view: AchievementsPanelView): void {
  root.hidden = !view.open;

  // Escrever a lista com o painel fechado é trabalho jogado fora a cada quadro,
  // e o render do título roda sempre. Fechado, ninguém lê o que está lá dentro.
  if (!view.open) return;

  const shelf = root.querySelector('[data-shelf="list"]');
  if (shelf !== null) renderShelf(shelf, view.shelf);

  const tally = root.querySelector('[data-achievements-panel="tally"]');
  if (tally !== null) tally.textContent = view.shelf.tally;
}

/** Leva o foco ao botão de fechar — o pouso ao abrir, já que nada aqui é clicável. */
export function focusPanelClose(root: ParentNode): void {
  root.querySelector<HTMLElement>('[data-achievements-panel="close"]')?.focus();
}
