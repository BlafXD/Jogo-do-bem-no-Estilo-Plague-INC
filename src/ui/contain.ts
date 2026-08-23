// O botão de conter a Inércia (P7-03). Regra no docs/GDD.md §2.6.
//
// Mesma divisão do hud.ts, do tree.ts e do event-cards.ts: `containView` é
// **puro** — entra GameState, sai o botão inteiro em texto — e só
// `mountContain` e `renderContain` tocam no DOM.
//
// **Esta UI não decide nada.** Quem diz se dá para conter é o `canContain` do
// engine, quem diz o preço é o `containCost`, e quem cobra é o `contain`. Aqui
// só se escolhe a frase — a mesma separação que o tree.ts registra sobre os
// pré-requisitos, e pelo mesmo motivo: uma segunda implementação da regra seria
// o jeito de a tela e o engine discordarem em silêncio.
//
// **Por que a contenção é um botão e não um nó da árvore.** Ela não é uma
// compra: não fica comprada, pode ser repetida, e o que ela dá é tempo, não
// capacidade. Pô-la entre os 20 nós faria o jogador procurá-la uma vez e nunca
// mais — e é justamente uma decisão que ele precisa tomar de novo a cada vez
// que a Inércia sobe.

import { ui } from '../data/i18n';
import { balance, type GameState } from '../engine/state';
import { canContain, containCost, CONTAIN_REQUIRES, type ContainRefusal } from '../engine/inertia';
import { skillById } from '../engine/skills';

// --------------------------------------------------------------- a view ---

export const CONTAIN_STATUSES = ['available', 'unaffordable', 'locked', 'idle'] as const;

export type ContainStatus = (typeof CONTAIN_STATUSES)[number];

export type ContainView = {
  readonly name: string;
  /** "12 PAC", ou vazio enquanto o ramo Sociedade não destravou o preço. */
  readonly cost: string;
  /** O que a contenção faz, uma frase. */
  readonly description: string;
  readonly status: ContainStatus;
  readonly statusIcon: string;
  readonly statusLabel: string;
  /** Por que não dá para conter agora, em uma frase. Vazio quando dá. */
  readonly detail: string;
};

const whole = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 0 });

/**
 * De recusa do engine para estado de tela.
 *
 * É um `Record` completo, e não um `switch`, para o `tsc` cobrar: se o engine
 * ganhar uma quarta razão de recusa, este arquivo para de compilar em vez de
 * cair num `default` silencioso e mostrar o botão errado.
 */
const STATUS_FOR_REFUSAL: Readonly<Record<ContainRefusal, ContainStatus>> = {
  notUnlocked: 'locked',
  notEnoughPoints: 'unaffordable',
  nothingToContain: 'idle',
};

/**
 * A frase que explica a recusa.
 *
 * O PAC que falta é arredondado **para cima**, como no tree.ts e pelo mesmo
 * motivo: o PAC entra fracionado, e "Faltam 0 PAC" num botão que não funciona é
 * o tipo de texto que faz o jogador achar que o jogo travou.
 */
function detailFor(state: GameState, status: ContainStatus): string {
  if (status === 'locked') {
    const nome = CONTAIN_REQUIRES === undefined ? '' : (skillById(CONTAIN_REQUIRES)?.name ?? '');
    return ui.contain.requires(nome);
  }

  if (status === 'unaffordable') {
    const falta = (containCost(state) ?? 0) - state.actionPoints;
    return ui.contain.missingPoints(whole.format(Math.ceil(falta)));
  }

  if (status === 'idle') return ui.contain.idle;

  return '';
}

export function containView(state: GameState): ContainView {
  const check = canContain(state);
  const status: ContainStatus = check.ok ? 'available' : STATUS_FOR_REFUSAL[check.reason];
  const badge = ui.contain.status[status];
  const cost = containCost(state);

  return {
    name: ui.contain.name,
    // Sem preço enquanto o ramo não destravou: mostrar "30 PAC" num botão
    // bloqueado anuncia um número que ainda vai mudar — o desconto por nó de
    // Sociedade faz o custo cair antes de o jogador poder usá-lo uma vez.
    cost: cost === null ? '' : ui.contain.cost(whole.format(Math.round(cost))),
    description: ui.contain.description(whole.format(balance.containRelief)),
    status,
    statusIcon: badge.icon,
    statusLabel: badge.label,
    detail: detailFor(state, status),
  };
}

// ------------------------------------------------------------------ DOM ---

type Slot = 'cost' | 'icon' | 'label' | 'detail';

function span(className: string, text?: string): HTMLSpanElement {
  const element = document.createElement('span');
  element.className = className;
  if (text !== undefined) element.textContent = text;
  return element;
}

/**
 * Monta o botão uma vez, na carga da página.
 *
 * O cartão inteiro é um `<button>`, como os nós da árvore: alvo de clique do
 * tamanho do cartão, para o dedo de quem passa num estande, e **uma** parada de
 * tabulação em vez de duas.
 *
 * **Fica visível mesmo bloqueado, e isso é desenho.** É o botão bloqueado que
 * ensina que o ramo Sociedade destrava alguma coisa — sem ele, o jogador
 * descobriria a contenção só depois de comprar o nó por outro motivo, e o §2.6
 * quer que Sociedade seja escolhida **como** licença para lutar.
 */
export function mountContain(root: Element, onContain: () => void): void {
  root.setAttribute('aria-label', ui.contain.label);

  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'contain__button';
  button.dataset.contain = 'button';
  button.title = ui.contain.hint;

  const head = span('contain__head');
  const cost = span('contain__cost');
  cost.dataset.contain = 'cost';
  head.append(span('contain__name', ui.contain.name), cost);

  const status = span('contain__status');
  const icon = span('contain__icon');
  icon.dataset.contain = 'icon';
  // Decoração: quem carrega o estado para o leitor de tela é o rótulo ao lado.
  icon.setAttribute('aria-hidden', 'true');
  const label = span('contain__status-label');
  label.dataset.contain = 'label';
  status.append(icon, label);

  const detail = span('contain__detail');
  detail.dataset.contain = 'detail';

  button.append(head, status, span('contain__description', ''), detail);
  button.addEventListener('click', onContain);

  root.replaceChildren(button);
}

function slot(root: ParentNode, name: Slot): HTMLElement | null {
  return root.querySelector<HTMLElement>(`[data-contain="${name}"]`);
}

/** Escreve um pedaço do botão e o esconde quando não há o que dizer. */
function write(root: ParentNode, name: Slot, text: string): void {
  const target = slot(root, name);
  if (target === null) return;

  target.textContent = text;
  target.hidden = text === '';
}

/** Reflete o estado atual no botão já montado. */
export function renderContain(root: ParentNode, view: ContainView): void {
  const button = root.querySelector<HTMLElement>('[data-contain="button"]');
  if (button === null) return;

  button.dataset.status = view.status;

  // `aria-disabled`, e não o atributo `disabled`: botão desabilitado sai da
  // ordem de tabulação, e aí quem navega por teclado não chega nele para ler
  // **por que** está bloqueado. Deixar o clique acontecer não faz mal — quem
  // recusa é o `contain`, que devolve o estado intacto.
  button.setAttribute('aria-disabled', String(view.status !== 'available'));

  write(button, 'cost', view.cost);
  write(button, 'icon', view.statusIcon);
  write(button, 'label', view.statusLabel);
  write(button, 'detail', view.detail);

  const description = button.querySelector('.contain__description');
  if (description !== null) description.textContent = view.description;
}
