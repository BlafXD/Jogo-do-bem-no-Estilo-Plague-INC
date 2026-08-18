// O HUD: ano, temperatura, emissões, PAC e apoio médio (P5-03).
//
// Duas metades, e a divisão é o que torna isto testável sem dependência nova:
//
//   1. `hudView` é **puro** — entra GameState, saem cinco strings prontas. Toda
//      a lógica onde cabe bug (arredondamento, unidade, média) mora aqui, e o
//      tests/hud.test.ts roda em node, sem jsdom.
//   2. `mountHud` e `renderHud` são as únicas funções que tocam no DOM, e são
//      burras de propósito: montam cinco caixas e escrevem textContent.
//
// O `document` só aparece dentro do corpo dessas duas funções, nunca no topo do
// módulo — é isso que deixa o arquivo ser importado por um teste em node.
//
// A regra de ouro do §3 continua valendo na direção que importa: este arquivo
// importa do engine; nenhum arquivo do engine importa daqui.

import { ui } from '../data/i18n';
import { globalEmissions } from '../engine/climate';
import { averageSupport, type GameState } from '../engine/state';

export const HUD_FIELDS = ['year', 'temperature', 'emissions', 'actionPoints', 'support'] as const;

export type HudField = (typeof HUD_FIELDS)[number];

/** Os cinco indicadores já formatados, prontos para virar texto na tela. */
export type HudView = Readonly<Record<HudField, string>>;

function decimals(digits: number): Intl.NumberFormat {
  return new Intl.NumberFormat('pt-BR', {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
}

const twoDecimals = decimals(2);
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
    temperature: `${twoDecimals.format(state.temperature)} ${ui.units.celsius}`,
    emissions: `${oneDecimal.format(globalEmissions(state))} ${ui.units.emissionsPerYear}`,
    actionPoints: whole.format(Math.floor(state.actionPoints)),
    support: whole.format(Math.round(averageSupport(state))),
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
 * e tudo que tem número tem dica.
 */
export function mountHud(root: Element): void {
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
      return item;
    }),
  );
}

/** Escreve os valores nas caixas montadas pelo mountHud. */
export function renderHud(root: ParentNode, view: HudView): void {
  for (const field of HUD_FIELDS) {
    const target = root.querySelector(`[data-hud="${field}"]`);
    if (target !== null) target.textContent = view[field];
  }
}
