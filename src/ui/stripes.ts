// As listras do aquecimento, na barra de baixo (VIS-04).
//
// É a assinatura da direção de arte (docs/DIRECAO-DE-ARTE.md §5): **uma listra
// por ano, na cor da temperatura em que ele terminou**. A linguagem é a das
// *warming stripes* de Ed Hawkins, desenhada com os números da própria partida
// — o crédito da ideia está no docs/CREDITOS.md.
//
// Mesma divisão do resto da UI: `stripesView` é puro, e só `mountStripes` e
// `renderStripes` tocam no DOM. O `document` nunca aparece no topo do módulo.
//
// **As cores não moram aqui.** O theme.css tem as oito paradas da escala; este
// arquivo só diz entre quais duas cada ano cai e quanto do caminho ele andou. A
// mistura é o `color-mix` do stripes.css que faz, e trocar a paleta continua
// sendo abrir um arquivo só.
//
// **A régua sob a temperatura do HUD também sai daqui.** Ela é a mesma escala
// vista de outro jeito — as faixas das medalhas —, e duas escalas em dois
// arquivos seriam dois lugares para o teto do bronze divergir.

import { ui } from '../data/i18n';
import { timeline } from '../engine/history';
import { MEDAL_CEILING } from '../engine/outcome';
import { balance, type GameState } from '../engine/state';
import { TOTAL_TICKS } from '../engine/tick';
import { liveCelsius } from './format';

// --------------------------------------------------------------- a escala ---

/**
 * A parada mais fria. Fica abaixo de onde a partida começa, para 2025 não
 * nascer na ponta da escala: o azul é "mais frio do que isto já foi".
 */
const COLD = 1.2;

/**
 * A parada mais quente. Fica além da derrota, para o ano em que a agência caiu
 * ainda ter para onde escurecer.
 */
const BEYOND = 3.4;

/**
 * As oito paradas da escala, em °C, na ordem das cores `--cor-listra-0` a
 * `--cor-listra-7` do theme.css.
 *
 * Os tetos das medalhas e o limiar da derrota são **lidos** do engine, e não
 * repetidos: se o balanceamento mexer no bronze, a cor acompanha. As duas
 * paradas que não são regra de nada ficam a meio caminho entre dois tetos, pela
 * mesma razão.
 */
export const STRIPE_STOPS: readonly number[] = [
  COLD,
  MEDAL_CEILING.gold,
  (MEDAL_CEILING.gold + MEDAL_CEILING.silver) / 2,
  MEDAL_CEILING.silver,
  (MEDAL_CEILING.silver + MEDAL_CEILING.bronze) / 2,
  MEDAL_CEILING.bronze,
  balance.loseTemperature,
  BEYOND,
];

function clampUnit(value: number): number {
  return Math.min(1, Math.max(0, value));
}

/**
 * Onde uma temperatura cai na escala: entre a parada `segment` e a seguinte, e
 * quanto do caminho entre as duas ela andou, de 0 a 1.
 */
export type StripeTone = {
  readonly segment: number;
  readonly mix: number;
};

/**
 * O tom de uma temperatura.
 *
 * Numa parada exata o ano pega a cor dela inteira: 1,5 °C é o fim do primeiro
 * trecho, e não o começo do segundo — a mesma cor pelos dois caminhos. Fora da
 * escala, o tom para na ponta.
 */
export function stripeTone(temperature: number): StripeTone {
  const lastSegment = STRIPE_STOPS.length - 2;
  let segment = 0;

  while (segment < lastSegment && temperature > (STRIPE_STOPS[segment + 1] ?? Infinity)) {
    segment += 1;
  }

  const from = STRIPE_STOPS[segment] ?? COLD;
  const to = STRIPE_STOPS[segment + 1] ?? BEYOND;
  return { segment, mix: clampUnit((temperature - from) / (to - from)) };
}

/** As faixas de medalha que a régua do HUD desenha. */
export type RulerBand = 'gold' | 'silver' | 'bronze' | 'over';

/**
 * As quatro faixas da régua, em °C: ouro, prata, bronze e sem medalha.
 *
 * A régua termina na derrota, e não além dela. O marcador na ponta direita
 * quer dizer "a agência acabou", e é essa a leitura que a ponta precisa ter. As
 * larguras são proporcionais às faixas — quatro pedaços iguais mentiriam sobre
 * quanto falta para cada teto.
 */
export const RULER_BANDS: readonly {
  readonly band: RulerBand;
  readonly from: number;
  readonly to: number;
}[] = [
  { band: 'gold', from: COLD, to: MEDAL_CEILING.gold },
  { band: 'silver', from: MEDAL_CEILING.gold, to: MEDAL_CEILING.silver },
  { band: 'bronze', from: MEDAL_CEILING.silver, to: MEDAL_CEILING.bronze },
  { band: 'over', from: MEDAL_CEILING.bronze, to: balance.loseTemperature },
];

/** Onde a temperatura cai na régua: 0 na ponta fria, 1 na derrota. */
export function rulerMark(temperature: number): number {
  return clampUnit((temperature - COLD) / (balance.loseTemperature - COLD));
}

// ---------------------------------------------------------------- a view ---

/** Quantas listras a barra tem: uma por ano jogado, de 2025 a 2099. */
export const STRIPE_YEARS = balance.endYear - balance.startYear;

/**
 * Um ano da barra. União discriminada: um ano que ainda não aconteceu não tem
 * tom nenhum, e não um tom vazio.
 */
export type Stripe =
  | { readonly year: number; readonly lived: false }
  | { readonly year: number; readonly lived: true; readonly tone: StripeTone };

/** Perto de uma ponta, o rótulo do marcador encosta para dentro da barra. */
export type MarkerEdge = 'start' | 'middle' | 'end';

export type StripesView = {
  readonly stripes: readonly Stripe[];
  readonly marker: {
    /** De 0 a 1, pelo mês: o marcador anda a cada tick, e não a cada ano. */
    readonly position: number;
    readonly text: string;
    readonly edge: MarkerEdge;
  };
  /** A frase do leitor de tela, que diz o que a cor quer dizer. */
  readonly label: string;
};

/** O quanto da barra, em cada ponta, faz o rótulo do marcador encostar. */
const EDGE = 0.08;

/** De quantos em quantos anos a barra escreve o ano embaixo. */
export const TICK_EVERY = 25;

/** Os anos escritos embaixo da barra, na posição de cada um. */
export function stripeTicks(): readonly { readonly year: string; readonly position: number }[] {
  const ticks: { year: string; position: number }[] = [];

  for (let year = balance.startYear; year <= balance.endYear; year += TICK_EVERY) {
    ticks.push({ year: String(year), position: (year - balance.startYear) / STRIPE_YEARS });
  }

  return ticks;
}

/**
 * A temperatura de cada ano no instante em que ele começou — e a do ano
 * corrente, agora.
 *
 * O `timeline` guarda um retrato por aniversário e acrescenta o mês atual no
 * fim. No `Map`, o retrato atual sobrescreve o do começo do mesmo ano, e é isso
 * que faz a listra do ano corrente acompanhar a partida mês a mês.
 */
function temperaturesByYear(state: GameState): ReadonlyMap<number, number> {
  return new Map(timeline(state).map((point) => [point.year, point.temperature]));
}

function edgeOf(position: number): MarkerEdge {
  if (position < EDGE) return 'start';
  if (position > 1 - EDGE) return 'end';
  return 'middle';
}

/**
 * A barra inteira, pronta para desenhar.
 *
 * **Um ano termina onde o seguinte começa.** A cor de 2030 é a temperatura do
 * retrato de 2031, e o ano corrente usa a de agora. Na última volta, a partida
 * em 2100 é o retrato que fecha 2099.
 */
export function stripesView(state: GameState): StripesView {
  const started = temperaturesByYear(state);

  const stripes = Array.from({ length: STRIPE_YEARS }, (_, index): Stripe => {
    const year = balance.startYear + index;
    if (year > state.year) return { year, lived: false };

    const ended = started.get(year + 1) ?? started.get(year) ?? state.temperature;
    return { year, lived: true, tone: stripeTone(ended) };
  });

  const position = clampUnit(state.tick / TOTAL_TICKS);

  return {
    stripes,
    marker: {
      position,
      text: ui.stripes.now(String(state.year), liveCelsius(state.temperature)),
      edge: edgeOf(position),
    },
    label: ui.stripes.label(String(balance.startYear), String(state.year)),
  };
}

// ------------------------------------------------------------------ DOM ---

function element(tag: 'div' | 'span', className: string, text?: string): HTMLElement {
  const node = document.createElement(tag);
  node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

/**
 * Monta a barra uma vez: as 75 listras, o marcador e os anos escritos embaixo.
 *
 * **O bloco é uma imagem para o leitor de tela** (`role="img"`), com a frase do
 * `renderStripes` como nome. Setenta e cinco caixas coloridas anunciadas uma a
 * uma seriam ruído; o que importa nelas é o desenho, e o número do ano corrente
 * já está no HUD. Os filhos de uma imagem ficam de fora da árvore de
 * acessibilidade, então o marcador e os anos não são lidos duas vezes.
 */
export function mountStripes(root: HTMLElement): void {
  root.setAttribute('role', 'img');
  root.title = ui.stripes.hint;

  const now = element('div', 'stripes__now');
  now.dataset.stripes = 'now';
  const nowText = element('span', 'stripes__now-text');
  nowText.dataset.stripes = 'now-text';
  now.append(nowText);

  const band = element('div', 'stripes__band');
  band.append(...Array.from({ length: STRIPE_YEARS }, () => element('span', 'stripes__year')));

  const ticks = element('div', 'stripes__ticks');
  ticks.append(
    ...stripeTicks().map(({ year, position }) => {
      const tick = element('span', 'stripes__tick', year);
      tick.style.left = `${position * 100}%`;
      return tick;
    }),
  );

  root.replaceChildren(now, band, ticks);
}

function paint(target: HTMLElement, stripe: Stripe): void {
  if (!stripe.lived) {
    target.dataset.empty = '';
    delete target.dataset.tone;
    target.style.removeProperty('--mistura');
    return;
  }

  delete target.dataset.empty;
  target.dataset.tone = String(stripe.tone.segment);
  target.style.setProperty('--mistura', `${Math.round(stripe.tone.mix * 100)}%`);
}

/**
 * Escreve a partida na barra já montada.
 *
 * **Atualiza em vez de reconstruir**, como o mapa: a barra redesenha a cada mês
 * de jogo, e 75 elementos novos por mês seriam 75 nós jogados fora a cada 1,5 s.
 */
export function renderStripes(root: HTMLElement, view: StripesView): void {
  root.setAttribute('aria-label', view.label);

  const years = root.querySelectorAll<HTMLElement>('.stripes__year');
  view.stripes.forEach((stripe, index) => {
    const target = years[index];
    if (target !== undefined) paint(target, stripe);
  });

  const now = root.querySelector<HTMLElement>('[data-stripes="now"]');
  if (now !== null) {
    now.style.left = `${(view.marker.position * 100).toFixed(2)}%`;
    now.dataset.edge = view.marker.edge;
  }

  const nowText = root.querySelector<HTMLElement>('[data-stripes="now-text"]');
  if (nowText !== null && nowText.textContent !== view.marker.text) {
    nowText.textContent = view.marker.text;
  }
}
