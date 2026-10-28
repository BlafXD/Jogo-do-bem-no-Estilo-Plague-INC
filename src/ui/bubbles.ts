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
// bolha não pode cobrir o número do apoio — a única leitura regional que o mapa
// oferece — nem o chip de alerta pendurado acima dele. Onde não cabe acima, ela
// pousa ao lado da etiqueta; a conta que escolhe está no `placementOf`, e o
// mapa na menor largura possível é o pior caso dela.

import { ui } from '../data/i18n';
import { bubbleKeyOf } from '../engine/bubbles';
import { REGION_IDS, type GameState, type RegionId } from '../engine/state';
import { prependIcon } from './icons';
import { LABEL_ANCHORS, MAP_CROP_HEIGHT, MAP_SIZE } from './map-geometry';

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
  /** Acima da etiqueta, ao lado ou embaixo — quem decide é o `bubblePlacement`. */
  readonly placement: BubblePlacement;
  /** O deslocamento a partir do anchor, em rem, que esse lugar pede. */
  readonly offset: { readonly x: number; readonly y: number };
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

/**
 * Onde a bolha pousa em relação à etiqueta da região: acima dela, ao lado ou
 * embaixo. A escolha é calculada — veja o `bubblePlacement`.
 */
export type BubblePlacement = 'above' | 'right' | 'left' | 'below';

/** Um retângulo no desenho do mapa, em rem, com o mapa na menor largura. */
type Box = {
  readonly left: number;
  readonly right: number;
  readonly top: number;
  readonly bottom: number;
};

/**
 * A menor largura que o mapa pode ter, em rem: o `--largura-mundo` do
 * theme.css, que o layout.css usa como piso (`width: max(var(--largura-mundo),
 * …)`).
 *
 * **É o pior caso de toda conta daqui.** A etiqueta, o chip e a bolha têm
 * medida em rem e não encolhem; o desenho é o único que cresce. Num mapa mais
 * largo os anchors se afastam e as mesmas caixas sobram — então o que couber
 * aqui cabe em qualquer janela, e a bolha de uma região não muda de lugar
 * quando a janela muda de tamanho, que é o que um jogador de feira espera.
 */
const MAP_MIN_WIDTH = 54;

/** A altura do que a moldura mostra, em rem: a imagem sem a faixa da Antártida. */
const VISIBLE_HEIGHT = (MAP_MIN_WIDTH * MAP_CROP_HEIGHT) / MAP_SIZE.width;

/** A etiqueta da região, do map.css: a largura mínima e a altura de duas linhas. */
const LABEL_MIN_WIDTH = 8.5;
const LABEL_HEIGHT = 3.275;

/** O chip de alerta, pendurado acima da etiqueta (`.map__alert`, 1,25 de linha). */
const CHIP_HEIGHT = 1.25;

/**
 * A bolha, em rem. A altura é o alvo de toque; a largura é a de "+12 PAC" com o
 * ícone, medida no Edge e arredondada para cima — a bolha mais larga que o jogo
 * consegue mostrar.
 */
const BUBBLE_HEIGHT = 2.75;
const BUBBLE_WIDTH = 7;

/** A folga entre a bolha e o que estiver do lado dela. */
const GAP = 0.25;

/**
 * Um fio de folga — 1,6 px — exigido entre a bolha e qualquer caixa vizinha.
 *
 * Não é estética: é o que impede a conta de aceitar um lugar em que as duas
 * bordas nascem coladas. Maior que isto tira a bolha da África de baixo da
 * etiqueta dela (sobram 0,2rem até a linha do conselho) e não sobra lugar
 * nenhum para ela.
 */
const MARGIN = 0.1;

/**
 * A faixa de baixo do quadro, onde moram a legenda do calor (`.map__caption`) e
 * a linha do conselho (`.map__coach`): 4,58rem de altura e 44 de largura, que é
 * até onde a legenda chega com o texto mais longo. Bolha nenhuma pousa aqui.
 */
const FOOTER: Box = {
  left: 0,
  right: 44,
  top: VISIBLE_HEIGHT - 4.58,
  bottom: VISIBLE_HEIGHT,
};

/**
 * A largura da etiqueta de uma região, em rem.
 *
 * Estimativa conservadora, a mesma do tests/map-geometry.test.ts: 0,58 em por
 * caractere, o marcador de seleção somando um caractere e o padding das duas
 * bordas. Nunca menos que o `min-width` da folha.
 */
function labelWidth(name: string): number {
  return Math.max(LABEL_MIN_WIDTH, (name.length + 1) * 0.58 + 1.25);
}

/** O anchor de uma região em rem, com o mapa na menor largura. */
function anchorInRem(target: RegionId): { x: number; y: number } {
  const scale = MAP_MIN_WIDTH / MAP_SIZE.width;
  return { x: LABEL_ANCHORS[target].x * scale, y: LABEL_ANCHORS[target].y * scale };
}

/** A caixa que a etiqueta ocupa, com o chip de alerta pendurado nela. */
function labelBox(target: RegionId, name: string): Box {
  const anchor = anchorInRem(target);
  const half = labelWidth(name) / 2;
  return {
    left: anchor.x - half,
    right: anchor.x + half,
    top: anchor.y - LABEL_HEIGHT / 2 - CHIP_HEIGHT,
    bottom: anchor.y + LABEL_HEIGHT / 2,
  };
}

/**
 * O deslocamento da bolha em relação ao anchor, em rem, para cada lugar.
 *
 * Acima: a soma que tira a bolha de cima do número do apoio **e** do chip —
 * meia etiqueta, o chip inteiro, a folga e meia bolha. Ao lado: meia etiqueta
 * mais meia bolha, e por isso depende do nome da região.
 */
function offsetFor(place: BubblePlacement, name: string): { x: number; y: number } {
  const side = labelWidth(name) / 2 + GAP + BUBBLE_WIDTH / 2;
  const down = LABEL_HEIGHT / 2 + GAP + BUBBLE_HEIGHT / 2;
  // Acima, a folga é o fio do `MARGIN` e não os 0,25rem dos outros lados: a
  // linha do chip (1,25 para um texto de 1rem) já traz o respiro dela, e os
  // 0,25 cheios punham a bolha da América do Norte para fora do desenho por
  // 0,04 px — perder o lugar de projeto da região mais olhada do mapa por meio
  // centésimo de rem seria uma piada. Com o fio, sobram 0,15rem até a borda.
  const up = LABEL_HEIGHT / 2 + CHIP_HEIGHT + MARGIN + BUBBLE_HEIGHT / 2;

  if (place === 'above') return { x: 0, y: -up };
  if (place === 'below') return { x: 0, y: down };
  return { x: place === 'right' ? side : -side, y: 0 };
}

/** A caixa que a bolha ocuparia num lugar. */
function bubbleBox(target: RegionId, name: string, place: BubblePlacement): Box {
  const anchor = anchorInRem(target);
  const offset = offsetFor(place, name);
  const x = anchor.x + offset.x;
  const y = anchor.y + offset.y;
  return {
    left: x - BUBBLE_WIDTH / 2,
    right: x + BUBBLE_WIDTH / 2,
    top: y - BUBBLE_HEIGHT / 2,
    bottom: y + BUBBLE_HEIGHT / 2,
  };
}

/** Dois retângulos se encostam, com a folga exigida entrando como margem? */
function touches(one: Box, other: Box, margin: number): boolean {
  return (
    one.left < other.right + margin &&
    other.left < one.right + margin &&
    one.top < other.bottom + margin &&
    other.top < one.bottom + margin
  );
}

/** A bolha cabe inteira no que a moldura mostra? */
function insideMap(box: Box): boolean {
  return (
    box.left >= 0 && box.right <= MAP_MIN_WIDTH && box.top >= 0 && box.bottom <= VISIBLE_HEIGHT
  );
}

/** A ordem de preferência: acima é o lugar de projeto; o resto é saída. */
const PLACES: readonly BubblePlacement[] = ['above', 'right', 'left', 'below'];

/**
 * Onde a bolha desta região pousa.
 *
 * **Acima da etiqueta é o lugar de projeto**: a bolha não pode cobrir o número
 * do apoio, que é a única leitura regional que o mapa oferece, nem o chip de
 * alerta pendurado acima dele. Só que o mapa na menor largura é apertado, e
 * medido no Edge a bolha de uma região cobria a etiqueta **da vizinha** — a do
 * Oriente Médio chegava a cobrir 53% da etiqueta da Europa, a linha do apoio
 * inclusive. Por isso a conta: tenta acima, depois à direita, à esquerda e
 * embaixo, e fica com o primeiro lugar que (1) cabe inteiro no quadro, (2) não
 * encosta em etiqueta nenhuma e (3) não invade a faixa da legenda e do
 * conselho.
 *
 * **Sem lugar livre, volta para cima**: é o lugar que o jogador espera, e cobrir
 * um canto de vizinha é menos ruim que inventar um canto qualquer. Hoje isso
 * acontece com uma região só — a Oceania, que cobre 10% da etiqueta da Ásia
 * Meridional. As outras sete saem limpas, e o tests/bubbles.dom.test.ts conta
 * quantas são.
 */
export function bubblePlacement(target: RegionId, regions: GameState['regions']): BubblePlacement {
  const name = regions[target].name;

  const free = PLACES.find((place) => {
    const box = bubbleBox(target, name, place);
    if (!insideMap(box)) return false;
    if (touches(box, FOOTER, MARGIN)) return false;
    return !REGION_IDS.some(
      (other) => other !== target && touches(box, labelBox(other, regions[other].name), MARGIN),
    );
  });

  return free ?? 'above';
}

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
      const placement = bubblePlacement(bubble.target, state.regions);

      return {
        key: bubbleKeyOf(bubble, state.tick),
        label: ui.bubbles.claim(points),
        ariaLabel: ui.bubbles.said(points, state.regions[bubble.target].name),
        hint: ui.bubbles.hint(bubble.ticksRemaining),
        anchor: { left: anchor.x / MAP_SIZE.width, top: anchor.y / MAP_SIZE.height },
        placement,
        offset: offsetFor(placement, state.regions[bubble.target].name),
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
  button.style.left = `calc(${view.anchor.left * 100}% + ${view.offset.x}rem)`;
  // O lugar vira dois números: a posição é o anchor da etiqueta mais o
  // deslocamento em rem que o `bubblePlacement` escolheu. O `data-place` fica
  // no botão só para o CSS saber para onde o `--vez` empurra a segunda bolha
  // da mesma região (acontece: nascem de 6 em 6 meses e vivem 12).
  button.dataset.place = view.placement;
  button.style.top = `calc(${view.anchor.top * 100}% + ${view.offset.y}rem)`;
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
