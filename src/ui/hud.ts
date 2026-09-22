// O HUD: ano, temperatura, emissões, PAC e apoio médio (P5-03).
//
// Duas metades, e a divisão é o que torna isto testável sem dependência nova:
//
//   1. `hudView` é **puro** — entra GameState, saem cinco strings prontas. Toda
//      a lógica onde cabe bug (arredondamento, unidade, média) mora aqui, e o
//      tests/hud.test.ts roda em node, sem jsdom.
//   2. `mountHud` e `renderHud` são as únicas funções que tocam no DOM, e são
//      burras de propósito: montam as caixas, escrevem textContent e, desde o
//      VIS-04, põem o marcador da régua de medalhas no lugar.
//
// O `document` só aparece dentro do corpo dessas duas funções, nunca no topo do
// módulo — é isso que deixa o arquivo ser importado por um teste em node.
//
// A regra de ouro do §3 continua valendo na direção que importa: este arquivo
// importa do engine; nenhum arquivo do engine importa daqui.

import { ui } from '../data/i18n';
import { globalEmissions } from '../engine/climate';
import { averageSupport, type GameState } from '../engine/state';
import { liveCelsius } from './format';
import { prependIcon } from './icons';
import { RULER_BANDS } from './stripes';

export const HUD_FIELDS = [
  'year',
  'temperature',
  'emissions',
  'actionPoints',
  'support',
  // A Inércia entrou no P7-03. O docs/GDD.md §2.2 sempre a listou como
  // indicador; até aqui ela era um campo do GameState que ninguém mostrava, e
  // sem o número na tela o antagonista seria uma força que o jogador sente sem
  // poder medir — a mesma falha que o P7-02 consertou nos eventos.
  'inertia',
] as const;

export type HudField = (typeof HUD_FIELDS)[number];

/** Os cinco indicadores já formatados, prontos para virar texto na tela. */
export type HudView = Readonly<Record<HudField, string>>;

function decimals(digits: number): Intl.NumberFormat {
  return new Intl.NumberFormat('pt-BR', {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
}

const oneDecimal = decimals(1);
const whole = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 0 });

/**
 * Traduz o estado da partida nos cinco textos do HUD.
 *
 * Duas decisões de arredondamento que não são cosméticas:
 *
 * - **O PAC é arredondado para baixo.** Ele entra fracionado (o P6-03 divide a
 *   entrada anual por 12) e mostrar 40 com 39,9 no bolso faria o jogador achar
 *   que um nó de 40 está ao alcance. Para baixo, o número na tela nunca promete
 *   o que a compra vai negar.
 * - **O ano não passa pelo Intl.** Em pt-BR o formatador põe separador de
 *   milhar e 2025 viraria "2.025".
 */
export function hudView(state: GameState): HudView {
  return {
    year: String(state.year),
    // O formatador é o do format.ts desde o VIS-04: o marcador das listras
    // escreve a mesma temperatura, e os dois precisam concordar na casa.
    temperature: liveCelsius(state.temperature),
    emissions: `${oneDecimal.format(globalEmissions(state))} ${ui.units.emissionsPerYear}`,
    actionPoints: whole.format(Math.floor(state.actionPoints)),
    support: whole.format(Math.round(averageSupport(state))),
    // Truncada, **pela mesma razão do PAC**: o número na tela não pode
    // prometer o que a ação vai negar. Arredondar mostraria "1" para uma
    // Inércia de 0,6 — e o botão de conter, que recusa abaixo de 1, diria
    // "Nada a conter" logo abaixo. Truncar faz os dois concordarem sempre.
    inertia: whole.format(Math.floor(state.inertia)),
  };
}

/**
 * Monta as cinco caixas do HUD, uma vez, na carga da página.
 *
 * Os rótulos e as dicas vêm do i18n e não do index.html — se estivessem na
 * marcação, o texto de UI estaria no lugar que a regra 8 proíbe.
 *
 * Cada caixa carrega **rótulo de texto mais valor**, nunca só o número, e um
 * `title` explicando o indicador. É o §5 do GDD: nada é comunicado só por cor,
 * e tudo que tem número tem dica. O ícone da frente (VIS-09) é enfeite.
 */
export function mountHud(root: Element): void {
  // `role="group"` junto do rótulo (P8-04). Num `<div>` sem papel — que é o que
  // o `#hud` é no index.html — a ARIA proíbe nomear, e o `aria-label` some sem
  // aviso: o bloco mais importante da tela chegava ao leitor de tela sem nome
  // nenhum. Conferido na árvore de acessibilidade do Chrome.
  root.setAttribute('role', 'group');
  root.setAttribute('aria-label', ui.hudLabel);

  root.replaceChildren(
    ...HUD_FIELDS.map((field) => {
      const item = document.createElement('div');
      item.className = 'hud__item';
      item.title = ui.hud[field].hint;

      const label = document.createElement('span');
      label.className = 'hud__label';
      label.textContent = ui.hud[field].label;

      const value = document.createElement('span');
      value.className = 'hud__value';
      value.dataset.hud = field;

      item.append(label, value);
      if (field === 'temperature') item.append(rulerElement());
      // Cada campo tem um ícone de mesmo nome (icons.ts).
      prependIcon(item, field, 'hud__icon');
      return item;
    }),
  );
}

/**
 * A régua sob a temperatura (VIS-04): as quatro faixas de medalha, com a
 * largura de cada uma, e um marcador onde o mundo está.
 *
 * **É reforço, e fica fora do leitor de tela.** O número está escrito logo
 * acima, e a faixa por extenso está na legenda do mapa. A régua só deixa ler de
 * relance quanto falta para o próximo teto — o §5 não deixa a cor dela ser o
 * recado sozinha.
 */
function rulerElement(): HTMLSpanElement {
  const ruler = document.createElement('span');
  ruler.className = 'hud__ruler';
  ruler.setAttribute('aria-hidden', 'true');

  for (const { band, from, to } of RULER_BANDS) {
    const segment = document.createElement('i');
    segment.dataset.band = band;
    segment.style.flexGrow = String(to - from);
    ruler.append(segment);
  }

  const mark = document.createElement('b');
  mark.dataset.hud = 'mark';
  ruler.append(mark);
  return ruler;
}

/**
 * Escreve os valores nas caixas montadas pelo mountHud.
 *
 * `mark` é onde a temperatura cai na régua, de 0 a 1 (o `rulerMark` do
 * stripes.ts). Vem à parte, e não dentro da view, porque a view são os textos
 * que o jogador lê; a posição do marcador é desenho.
 */
export function renderHud(root: ParentNode, view: HudView, mark = 0): void {
  for (const field of HUD_FIELDS) {
    const target = root.querySelector(`[data-hud="${field}"]`);
    if (target !== null) target.textContent = view[field];
  }

  const ruler = root.querySelector<HTMLElement>('[data-hud="mark"]');
  if (ruler !== null) ruler.style.left = `${(Math.min(1, Math.max(0, mark)) * 100).toFixed(1)}%`;
}
