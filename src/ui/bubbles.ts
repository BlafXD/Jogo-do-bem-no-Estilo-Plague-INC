// As bolhas de PAC em cima do mapa (INTER-04). A mecânica está no
// src/engine/bubbles.ts; aqui só o botão.
//
// Mesma divisão do hud.ts, do map.ts e do tree.ts: `bubblesView` é **puro** —
// entra GameState, saem as bolhas já com texto e posição — e só `renderBubbles`
// toca no DOM.
//
// **Cada bolha é um `<button>` de verdade**, e não um desenho clicável. É a
// mesma decisão que o map.ts registra para as etiquetas das regiões: teclado,
// foco e leitor de tela vêm de graça. E é por isso que ela pousa na camada de
// bolhas **dentro** do palco do mapa, que o mountMap deixa pronta: o lugar onde
// um `<button>` precisa estar para ficar em cima do desenho é o mesmo lugar onde
// as etiquetas já estão.
//
// **Um alvo com prazo é hostil para quem navega por teclado**, e o §5 do GDD não
// deixa isso passar: o Tab chegaria na bolha depois de ela ter sumido. Por isso
// existe o atalho do `ui.bubbles.key` — uma tecla recolhe tudo que está na mesa
// —, e é o engine que o atende (`claimAllBubbles`). Sem ele, a fatia de renda do
// `bubbleShare` seria inalcançável sem mouse, o que é cobrar habilidade motora
// para arrecadar PAC.
//
// **A posição sai da mesma geometria das etiquetas**, deslocada para cima: a
// bolha não pode cobrir o número do apoio, que é a única leitura regional que o
// mapa oferece. O anchor mais alto do mapa é o da Europa, a 13,5% da altura, e
// 3,4rem acima dele ainda cai dentro do palco.

import { ui } from '../data/i18n';
import { bubbleKeyOf } from '../engine/bubbles';
import type { GameState } from '../engine/state';
import { prependIcon } from './icons';
import { LABEL_ANCHORS, MAP_SIZE } from './map-geometry';

// ---------------------------------------------------------------- a view ---

export type BubbleView = {
  /** A chave do engine: é com ela que o clique volta e recolhe esta bolha. */
  readonly key: string;
  /** "+6 PAC" — o que ela paga, escrito. Nunca só o desenho (§5). */
  readonly label: string;
  /** A frase do leitor de tela: o valor e a região. */
  readonly ariaLabel: string;
  /**
   * A dica com o número: quanto falta para ela sumir, e o atalho do teclado.
   *
   * **É aqui que o §5 se resolve.** "Está sumindo" é um estado, e um estado não
   * pode ser comunicado só pelo piscar da animação — quem não distingue o
   * movimento lê o prazo escrito.
   */
  readonly hint: string;
  /** Onde a bolha pousa, em fração do desenho — de 0 a 1, como as etiquetas. */
  readonly anchor: { readonly left: number; readonly top: number };
  /** A vez dela entre as bolhas da **mesma** região: 0, 1, … */
  readonly slot: number;
  /** Está nos últimos meses. Vale o pisca-pisca, e o prazo escrito na dica. */
  readonly fading: boolean;
};

export type BubblesView = {
  readonly bubbles: readonly BubbleView[];
};

/** Nos últimos meses de vida, a bolha avisa. */
const FADING_TICKS = 3;

const whole = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 0 });

/**
 * As bolhas na mesa, traduzidas para a tela.
 *
 * **O valor é arredondado para o mais perto, e não para baixo como o PAC do
 * HUD.** A regra do HUD existe para o saldo nunca prometer o que a compra vai
 * negar; aqui o número não é saldo, é **ganho** — e uma bolha de 5,75 que
 * anuncia "+5 PAC" e move o HUD de 78 para 84 faz o jogador desconfiar da conta.
 * Medido no Edge, foi exatamente o que aconteceu.
 */
export function bubblesView(state: GameState): BubblesView {
  const used = new Map<string, number>();

  return {
    bubbles: state.bubbles.map((bubble): BubbleView => {
      const slot = used.get(bubble.target) ?? 0;
      used.set(bubble.target, slot + 1);

      const points = whole.format(Math.round(bubble.value));
      const anchor = LABEL_ANCHORS[bubble.target];

      return {
        key: bubbleKeyOf(bubble, state.tick),
        label: ui.bubbles.claim(points),
        ariaLabel: ui.bubbles.said(points, state.regions[bubble.target].name),
        hint: ui.bubbles.hint(bubble.ticksRemaining),
        anchor: { left: anchor.x / MAP_SIZE.width, top: anchor.y / MAP_SIZE.height },
        slot,
        fading: bubble.ticksRemaining <= FADING_TICKS,
      };
    }),
  };
}

/** O total que o atalho do teclado recolheria agora, para o rótulo dele. */
export function bubblesWorth(state: GameState): number {
  return state.bubbles.reduce((sum, bubble) => sum + bubble.value, 0);
}

// ------------------------------------------------------------------- DOM ---

function bubbleElement(view: BubbleView, onClaim: (key: string) => void): HTMLButtonElement {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'bubble';
  button.dataset.key = view.key;
  button.style.left = `${view.anchor.left * 100}%`;
  // O deslocamento para cima tira a bolha de cima do número do apoio; o
  // `--vez` separa duas bolhas que calharam na mesma região (acontece: nascem
  // de 6 em 6 meses e vivem 12).
  button.style.top = `calc(${view.anchor.top * 100}% - 3.4rem)`;
  button.style.setProperty('--vez', String(view.slot));
  if (view.fading) button.dataset.fading = '';

  button.setAttribute('aria-label', view.ariaLabel);
  button.title = view.hint;

  const text = document.createElement('span');
  text.className = 'bubble__value';
  text.textContent = view.label;
  button.append(text);
  // O ícone do PAC é decoração: o valor vai escrito ao lado dele.
  prependIcon(button, 'actionPoints', 'bubble__icon');
  button.querySelector('svg.icon')?.setAttribute('aria-hidden', 'true');

  button.addEventListener('click', () => onClaim(view.key));
  return button;
}

/**
 * Escreve as bolhas na camada do mapa.
 *
 * **Reconstrói só quando a lista muda**, como o boletim de eventos: a tela é
 * redesenhada a cada mês, e recriar os botões em todo mês arrancaria o foco de
 * quem estivesse navegando por teclado justamente na bolha que quer recolher.
 * O `data-fading` é escrito a cada passagem, porque esse muda sem a lista mudar.
 */
export function renderBubbles(
  host: Element | null,
  view: BubblesView,
  onClaim: (key: string) => void,
): void {
  if (host === null) return;

  const shown = Array.from(host.querySelectorAll<HTMLElement>('[data-key]'));
  const wanted = view.bubbles.map((bubble) => bubble.key);
  const same =
    shown.length === wanted.length && shown.every((item, i) => item.dataset.key === wanted[i]);

  if (!same) {
    host.replaceChildren(...view.bubbles.map((bubble) => bubbleElement(bubble, onClaim)));
    return;
  }

  for (const [i, item] of shown.entries()) {
    const bubble = view.bubbles[i];
    if (bubble === undefined) continue;

    item.title = bubble.hint;
    if (bubble.fading) item.dataset.fading = '';
    else delete item.dataset.fading;
  }
}
