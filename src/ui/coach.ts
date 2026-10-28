// A linha do "faça isto agora", em cima do mapa (INTER-07).
//
// **Por que ela existe.** O pedido do chat em 2026-10-28: "as pessoas precisam
// entender de primeira o que está acontecendo", principalmente no Modo Feira,
// "porque ai vai ter muita rotação de pessoas jogando". O tutorial do P7-08
// explica o jogo **uma vez**, no começo; esta linha responde a outra pergunta, a
// cada mês: *o que eu faço agora?*
//
// **Ela aponta para o que desaparece se for ignorado.** A ordem não é de gosto —
// é por quanto se perde esperando:
//
//   1. a bolha de PAC expira em meses e não volta (INTER-03);
//   2. o estrago da Inércia é **permanente** (docs/GDD.md §2.6), e conter é a
//      única coisa que o desfaz;
//   3. uma região abaixo do piso de apatia caminha para a dissolução da agência
//      (§2.7), e o ramo Sociedade é o que a levanta;
//   4. o PAC parado não se perde — só rende menos cedo.
//
// Comprar fica em quarto **porque já está à vista**: a prateleira do INTER-06 e
// o selo do botão da árvore dizem isso com botões. A linha existe para o que
// mora escondido num painel.
//
// **Ela não tem opinião sobre estratégia.** Nunca diz qual nó comprar nem qual
// ramo seguir — isso é o jogo (§2.4), e um conselho ali seria jogar pelo
// jogador. Ela diz onde está a ação que o jogador não está vendo.
//
// Mesma divisão do resto da UI: `coachView` é puro, e só `renderCoach` toca no
// DOM.

import { ui } from '../data/i18n';
import { canContain } from '../engine/inertia';
import { isFinished } from '../engine/outcome';
import { readyToUnlock } from '../engine/skills';
import { balance, REGION_IDS, type GameState, type RegionId } from '../engine/state';
import { setIcon, type IconName } from './icons';

// --------------------------------------------------------------- a view ---

export const COACH_CUES = ['bubble', 'contain', 'support', 'buy', 'wait'] as const;

/** O que a linha está apontando agora. */
export type CoachCue = (typeof COACH_CUES)[number];

export type CoachView = {
  /** O conselho, ou vazio quando a linha não deve aparecer. */
  readonly text: string;
  /** O que ele aponta, ou `null` com a linha fora da tela. */
  readonly cue: CoachCue | null;
  /** O ícone ao lado, ou `null` sem linha. Decoração: o texto diz tudo. */
  readonly icon: IconName | null;
};

const EMPTY: CoachView = { text: '', cue: null, icon: null };

const ICONS: Readonly<Record<CoachCue, IconName>> = {
  bubble: 'actionPoints',
  contain: 'contain',
  support: 'support',
  buy: 'tree',
  wait: 'year',
};

/** A região mais abalada abaixo do piso de apatia, ou `null` se não há nenhuma. */
function weakest(state: GameState): RegionId | null {
  let found: RegionId | null = null;

  for (const id of REGION_IDS) {
    // O mesmo número arredondado que a etiqueta do mapa mostra (VIS-02): a
    // linha não pode mandar olhar uma região que a tela diz estar no piso.
    const support = Math.round(state.regions[id].support);
    if (support >= balance.supportFloor) continue;
    if (found === null || support < Math.round(state.regions[found].support)) found = id;
  }

  return found;
}

/**
 * O conselho de agora.
 *
 * `silent` vem do main.ts: com o painel do Modo Feira no ar, a linha cala. Os
 * dois ocupam o mesmo canto do mapa, e o painel já está dizendo o que fazer —
 * "Começar".
 */
export function coachView(state: GameState, silent = false): CoachView {
  if (silent || isFinished(state)) return EMPTY;

  const cue = cueFor(state);
  return { text: textFor(state, cue), cue, icon: ICONS[cue] };
}

function cueFor(state: GameState): CoachCue {
  if (state.bubbles.length > 0) return 'bubble';
  // Conter só entra quando **dá** para conter: mandar conter sem PAC, ou sem o
  // nó que abre a contenção, seria mandar o jogador a um botão recusado. Quem
  // responde é o engine, como sempre.
  if (state.inertia >= balance.calmInertia && canContain(state).ok) return 'contain';
  if (weakest(state) !== null) return 'support';
  if (readyToUnlock(state).length > 0) return 'buy';
  return 'wait';
}

function textFor(state: GameState, cue: CoachCue): string {
  if (cue === 'bubble') return ui.coach.bubble(state.bubbles.length);
  if (cue === 'contain') return ui.coach.contain(Math.round(state.inertia));
  if (cue === 'support') {
    const id = weakest(state);
    return id === null ? ui.coach.wait : ui.coach.support(state.regions[id].name);
  }
  if (cue === 'buy') return ui.coach.buy(readyToUnlock(state).length);
  return ui.coach.wait;
}

// ------------------------------------------------------------------ DOM ---

/**
 * Monta a linha uma vez, escondida.
 *
 * **`aria-live="polite"`, e não `assertive`:** o conselho muda de mês em mês, e
 * um leitor de tela que interrompesse a leitura a cada troca tornaria a partida
 * impossível de acompanhar. `polite` o anuncia quando houver silêncio, que é o
 * mesmo arranjo do aviso de auto-pausa do boletim.
 */
export function mountCoach(root: Element | null): void {
  if (root === null) return;
  root.setAttribute('aria-live', 'polite');

  const text = document.createElement('p');
  text.className = 'coach__text';
  text.dataset.coach = 'text';

  root.replaceChildren(text);
  renderCoach(root, EMPTY);
}

/** Escreve o conselho, e só mexe no DOM quando ele muda. */
export function renderCoach(root: Element | null, view: CoachView): void {
  if (root === null) return;
  if (root instanceof HTMLElement) {
    root.hidden = view.text === '';
    if (view.cue === null) delete root.dataset.cue;
    else root.dataset.cue = view.cue;
  }

  const text = root.querySelector<HTMLElement>('[data-coach="text"]');
  if (text === null) return;
  if (text.textContent !== view.text) text.textContent = view.text;

  // O ícone é decoração — o conselho vai escrito ao lado — e só é redesenhado
  // quando muda, que é o contrato do `setIcon`.
  setIcon(text, view.icon, 'coach__icon');
  text.querySelector('svg.icon')?.setAttribute('aria-hidden', 'true');
}
