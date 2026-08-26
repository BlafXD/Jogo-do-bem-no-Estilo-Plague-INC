// A barra da partida: reinício e o aviso de que o jogo salva sozinho (P6-07).
//
// Mesma divisão do controls.ts e do tree.ts: o núcleo é puro e roda em node, e
// só `mountSession` e `renderSession` tocam no DOM.
//
// **O botão da barra leva ao título, e não apaga mais nada** (P7-07). Antes ele
// reiniciava a partida ali mesmo, com dois cliques — e a tela de título fazia a
// mesma coisa, com a própria confirmação. Eram dois caminhos destrutivos para o
// mesmo lugar. Agora a barra só devolve ao título, e quem apaga é o "Nova
// partida" de lá.
//
// **A confirmação sobrevive num caso só: o Modo Feira.** Ela não é enfeite nem
// hábito — ela segue exatamente o risco. Numa partida normal sair não destrói
// nada, porque o jogo salva sozinho a cada mês e o "Continuar" espera do outro
// lado; pedir confirmação ali seria treinar o jogador a clicar sem ler. No Modo
// Feira a partida **não é salva**, então sair descarta o que está na tela — e aí
// os dois cliques têm o que proteger.
//
// **Não usei `confirm()`.** Ele resolveria em uma linha, mas trava a página
// inteira, não é estilizável, e some do fluxo de quem navega por teclado de um
// jeito que não dá para testar.
//
// Dois botões de verdade cumprem o mesmo papel e continuam sendo HTML que o §5
// sabe cobrar: foco, rótulo escrito, `Esc`.

import { ui } from '../data/i18n';

export type Session = {
  /** O jogador pediu para sair e a confirmação está na tela. */
  readonly armed: boolean;
  /**
   * Sair descarta o que está na tela?
   *
   * Só no Modo Feira (P7-07), que não salva. É este campo que decide se o botão
   * pergunta antes ou sai direto — a confirmação segue o risco real, e não o
   * hábito.
   */
  readonly discards: boolean;
  /**
   * O ano em que a partida foi retomada na carga, ou `null` se ela começou do
   * zero. Serve só para a linha de status dizer qual dos dois aconteceu.
   */
  readonly restoredYear: number | null;
};

export function createSession(restoredYear: number | null, discards = false): Session {
  return { armed: false, restoredYear, discards };
}

/** Sair pede confirmação? Só quando há o que perder. */
export function leaveNeedsConfirm(session: Session): boolean {
  return session.discards;
}

export function armReset(session: Session): Session {
  return { ...session, armed: true };
}

export function cancelReset(session: Session): Session {
  return { ...session, armed: false };
}

/**
 * A sessão depois de um reinício confirmado.
 *
 * Zera as duas coisas: a confirmação sai da tela e o "partida retomada" deixa
 * de valer — a partida na tela agora começou agora, e dizer o contrário seria
 * mentir para o jogador sobre o que ele está vendo.
 */
export function afterReset(): Session {
  return { armed: false, restoredYear: null, discards: false };
}

// ------------------------------------------------------------------ DOM ---

function button(className: string, action: string, label: string, hint: string): HTMLButtonElement {
  const element = document.createElement('button');
  element.type = 'button';
  element.className = className;
  element.dataset.session = action;
  element.textContent = label;
  element.title = hint;
  return element;
}

/**
 * Monta a barra: o botão de reiniciar, o de confirmar, o de cancelar e a linha
 * de status. Os três ficam sempre no DOM; o `renderSession` esconde os que não
 * valem agora, em vez de criar e destruir botão — mesma razão do tree.ts, o
 * foco de quem navega por teclado não pode sumir debaixo do dedo.
 */
export function mountSession(
  root: Element,
  handlers: {
    readonly onArm: () => void;
    readonly onCancel: () => void;
    readonly onReset: () => void;
  },
): void {
  root.setAttribute('aria-label', ui.session.label);

  const reset = button('session__button', 'arm', ui.session.leave, ui.session.leaveHint);
  reset.addEventListener('click', handlers.onArm);

  const confirm = button(
    'session__button session__button--danger',
    'confirm',
    ui.session.confirm,
    ui.session.confirmHint,
  );
  confirm.addEventListener('click', handlers.onReset);

  const cancel = button('session__button', 'cancel', ui.session.cancel, ui.session.cancelHint);
  cancel.addEventListener('click', handlers.onCancel);

  const status = document.createElement('p');
  status.className = 'session__status';
  status.dataset.session = 'status';
  // `polite` avisa quem usa leitor de tela que a partida voltou, sem atropelar
  // o que estiver sendo lido no momento.
  status.setAttribute('aria-live', 'polite');

  root.replaceChildren(reset, confirm, cancel, status);
}

/** Reflete a sessão na barra. */
export function renderSession(root: ParentNode, session: Session): void {
  for (const [action, visible] of [
    ['arm', !session.armed],
    ['confirm', session.armed],
    ['cancel', session.armed],
  ] as const) {
    const element = root.querySelector<HTMLElement>(`[data-session="${action}"]`);
    if (element !== null) element.hidden = !visible;
  }

  const status = root.querySelector<HTMLElement>('[data-session="status"]');
  if (status === null) return;

  // A linha de status é onde o Modo Feira **se declara**. Um jogador que não
  // sabe que a partida não está sendo salva descobre isso do pior jeito
  // possível: quando ela some.
  status.textContent = session.armed
    ? ui.session.warning
    : session.discards
      ? ui.session.fair
      : session.restoredYear === null
        ? ui.session.autosave
        : ui.session.restored(String(session.restoredYear));
}
