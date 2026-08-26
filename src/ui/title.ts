// A tela de título (P5-06).
//
// Mesma divisão do resto da UI: `titleView` é **puro** — entra o ano do save,
// saem os botões em texto — e só `mountTitle` e `renderTitle` tocam no DOM.
//
// **O que ela diz, e o que ela não diz.** O texto sai comprimido da "Fantasia
// central" do `§1` do GDD, sem uma frase inventada: o papel do jogador, a lógica
// invertida do *Plague Inc* e a tensão de não haver pontos para comprar tudo. O
// `§2.1` fecha avisando que a mensagem do ODS 13 está "embutida na mecânica —
// não em um texto de tutorial", e é por isso que esta tela tem três linhas e não
// trinta. O pitch definitivo é do `P1-01`, e a narrativa é do `[D-Historia]`.
//
// **"Nova partida" apaga o save, e por isso pede dois cliques.** É a mesma regra
// do `session.ts`, e o raciocínio inteiro está lá: apagar a partida é a única
// ação da tela que destrói vinte minutos de jogo e não tem desfazer. O estado
// daqui é próprio em vez de reaproveitar o `Session` porque o `restoredYear`
// dele não significa nada nesta tela — dois campos que não se aplicam custam
// mais do que as três linhas de `armed`.
//
// A confirmação só aparece quando **existe** save. Sem partida guardada não há
// nada para destruir, e um segundo clique ali seria cerimônia à toa.

import { ui } from '../data/i18n';

export type TitleState = {
  /** O jogador pediu "Nova partida" por cima de um save, e a tela pergunta. */
  readonly armed: boolean;
};

export function createTitle(): TitleState {
  return { armed: false };
}

export function armNewGame(title: TitleState): TitleState {
  return { ...title, armed: true };
}

export function cancelNewGame(title: TitleState): TitleState {
  return { ...title, armed: false };
}

// ----------------------------------------------------------------- a view ---

export type TitleView = {
  readonly pitch: readonly string[];
  /** O rótulo de "Continuar", com o ano. Vazio quando não há save. */
  readonly continueLabel: string;
  readonly canContinue: boolean;
  /** "Começar" sem save, "Nova partida" quando há um para apagar. */
  readonly newLabel: string;
  /** A pergunta dos dois cliques está no ar. */
  readonly armed: boolean;
  /** O que se perde ao confirmar. Vazio quando nada se perde. */
  readonly warning: string;
};

/**
 * Traduz "existe save, e de que ano" nos botões da tela.
 *
 * `savedYear` é o ano da partida guardada, ou `null` quando não há nenhuma —
 * exatamente o que o `loadGame` do P6-07 devolve. Esta tela não abre o save nem
 * sabe o que tem dentro dele: um número e um nulo bastam.
 */
export function titleView(savedYear: number | null, state: TitleState): TitleView {
  const canContinue = savedYear !== null;

  return {
    pitch: ui.title.pitch,
    continueLabel: canContinue ? ui.title.continueGame(String(savedYear)) : '',
    canContinue,
    newLabel: canContinue ? ui.title.newGame : ui.title.start,
    // Sem save não há o que confirmar, e o `armed` de uma tela anterior não pode
    // sobreviver a isso — senão a pergunta ficaria no ar sem nada para apagar.
    armed: state.armed && canContinue,
    warning: canContinue ? ui.title.warning : '',
  };
}

// -------------------------------------------------------------------- DOM ---

export type TitleHandlers = {
  readonly onContinue: () => void;
  /** "Começar" sem save, ou o primeiro clique de "Nova partida" com save. */
  readonly onNew: () => void;
  readonly onConfirmNew: () => void;
  readonly onCancelNew: () => void;
};

type Slot = 'continue' | 'new' | 'confirm' | 'cancel' | 'warning';

function button(className: string, slot: Slot, label: string, hint: string): HTMLButtonElement {
  const element = document.createElement('button');
  element.type = 'button';
  element.className = className;
  element.dataset.title = slot;
  element.textContent = label;
  element.title = hint;
  return element;
}

/**
 * Monta a tela de título uma vez, na carga da página.
 *
 * **O nome do jogo não está aqui.** Ele vive no `index.html`, ao lado do
 * `<title>` e do `<h1>` do topo, pela razão que aquele arquivo já registra: os
 * três precisam casar, e o `P1-04` vai trocar os três de uma vez. Trazê-lo para
 * o i18n criaria uma quarta cópia em outro arquivo.
 */
export function mountTitle(root: Element, handlers: TitleHandlers): void {
  root.setAttribute('aria-label', ui.title.label);

  const pitch = document.createElement('div');
  pitch.className = 'title__pitch';
  pitch.append(
    ...ui.title.pitch.map((line) => {
      const p = document.createElement('p');
      p.className = 'title__line';
      p.textContent = line;
      return p;
    }),
  );

  const actions = document.createElement('div');
  actions.className = 'title__actions';

  const keep = button(
    'title__button title__button--primary',
    'continue',
    '',
    ui.title.continueHint,
  );
  keep.addEventListener('click', handlers.onContinue);

  const fresh = button('title__button', 'new', ui.title.start, ui.title.newGameHint);
  fresh.addEventListener('click', handlers.onNew);

  actions.append(keep, fresh);

  // A confirmação mora num bloco próprio que some inteiro: o rótulo do botão diz
  // o que vai acontecer ("Apagar e recomeçar"), e não "Sim" — quem clica rápido
  // precisa ler a consequência no próprio botão. É a regra do session.ts.
  const confirm = document.createElement('div');
  confirm.className = 'title__confirm';
  confirm.dataset.title = 'confirm-box';

  const warning = document.createElement('p');
  warning.className = 'title__warning';
  warning.dataset.title = 'warning';

  const confirmButton = button(
    'title__button title__button--danger',
    'confirm',
    ui.title.confirmNew,
    ui.title.confirmNewHint,
  );
  confirmButton.addEventListener('click', handlers.onConfirmNew);

  const cancelButton = button('title__button', 'cancel', ui.title.cancel, ui.title.cancelHint);
  cancelButton.addEventListener('click', handlers.onCancelNew);

  const confirmActions = document.createElement('div');
  confirmActions.className = 'title__actions';
  confirmActions.append(confirmButton, cancelButton);

  confirm.append(warning, confirmActions);

  // O `<h1>` com o nome do jogo vem do index.html e é preservado: ele é a única
  // parte desta tela que não sai do i18n, pela razão explicada acima. Recolhê-lo
  // antes do `replaceChildren` mantém o `mountTitle` idempotente — montar duas
  // vezes dá o mesmo resultado — em vez de apagar o nome na segunda.
  const name = root.querySelector('.title__name');

  root.replaceChildren(...(name === null ? [] : [name]), pitch, actions, confirm);
}

function slot(root: ParentNode, name: Slot | 'confirm-box'): HTMLElement | null {
  return root.querySelector<HTMLElement>(`[data-title="${name}"]`);
}

/** Escreve o estado atual na tela já montada. */
export function renderTitle(root: ParentNode, view: TitleView): void {
  const keep = slot(root, 'continue');
  if (keep !== null) {
    keep.textContent = view.continueLabel;
    // `hidden` e não `disabled`: sem save, "Continuar" não é uma ação
    // indisponível, é uma ação que não existe. Um botão apagado ali faria a
    // pessoa procurar o que fazer para destravá-lo.
    keep.hidden = !view.canContinue;
  }

  const fresh = slot(root, 'new');
  if (fresh !== null) {
    fresh.textContent = view.newLabel;
    // Enquanto a pergunta está no ar, o botão que a abriu sai da tela: deixá-lo
    // ao lado de "Apagar e recomeçar" daria dois caminhos para a mesma coisa,
    // um deles sem aviso.
    fresh.hidden = view.armed;
  }

  const box = slot(root, 'confirm-box');
  if (box !== null) box.hidden = !view.armed;

  const warning = slot(root, 'warning');
  if (warning !== null) warning.textContent = view.warning;
}
