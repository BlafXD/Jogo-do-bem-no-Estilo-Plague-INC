// A comparação da tela de fim (VIS-10): a partida jogada contra a mesma partida
// sem nenhuma compra, em duas faixas de listras.
//
// **Por que listras, e não só o gráfico.** O gráfico mostra a distância entre
// as duas curvas; as listras mostram o que ela quer dizer, de relance e em cor:
// a sua partida clareia onde as compras seguraram o calor, e a parada escurece
// até acabar antes de 2100. A mesma escala de cor da barra de baixo (VIS-04).
//
// **Nenhuma regra mora aqui.** A partida parada vem do `engine/passive-run.ts`,
// o desfecho de cada uma vem do `outcomeOf`, e a cor de cada ano vem do
// `stripes.ts`. Este arquivo escolhe as frases e monta as duas faixas.
//
// Mesma divisão do resto da UI: `comparisonView` é puro, e só as funções de
// baixo tocam no DOM.

import { ui } from '../data/i18n';
import { outcomeOf } from '../engine/outcome';
import { passiveRun } from '../engine/passive-run';
import type { GameState } from '../engine/state';
import { liveCelsius } from './format';
import { mountStripes, renderStripes, stripesView, type StripesView } from './stripes';

// --------------------------------------------------------------- a view ---

export type ComparisonRow = {
  /** "Sua partida" ou "Sem nenhuma compra". */
  readonly name: string;
  /** "2025 a 2100", ou "acaba em 2089" quando a agência foi dissolvida. */
  readonly span: string;
  /** O resultado escrito ao lado: a temperatura final, ou "✕ 2089". */
  readonly value: string;
  /** As listras, com a frase do leitor de tela desta faixa. */
  readonly stripes: StripesView;
};

export type ComparisonView = {
  readonly played: ComparisonRow;
  readonly passive: ComparisonRow;
};

/**
 * A partida parada de cada seed, guardada.
 *
 * Simular custa uns 10 ms, e a tela de fim é redesenhada a cada clique. A seed
 * é a identidade da partida (§3), então a mesma seed dá sempre a mesma partida
 * parada, e guardar por ela é seguro. São no máximo duas ou três seeds por
 * sessão.
 */
const passiveBySeed = new Map<number, GameState>();

export function passiveFor(seed: number): GameState {
  const known = passiveBySeed.get(seed);
  if (known !== undefined) return known;

  const run = passiveRun(seed);
  passiveBySeed.set(seed, run);
  return run;
}

function rowFor(name: string, state: GameState, start: string): ComparisonRow {
  const text = ui.outcome.compare;
  const year = String(state.year);
  const temperature = liveCelsius(state.temperature);
  const outcome = outcomeOf(state);
  const dissolved = outcome.kind === 'defeat';

  const label = dissolved
    ? text.labelDissolved(name, start, temperature, year)
    : text.label(name, start, temperature, year);

  return {
    name,
    span: dissolved ? text.ended(year) : text.span(start, year),
    value: dissolved ? `${ui.outcome.result.defeat.icon} ${year}` : temperature,
    stripes: { ...stripesView(state), label },
  };
}

/**
 * As duas faixas. `passive` é a mesma partida sem nenhuma compra; sem ela, a
 * tela a simula pela seed da partida jogada.
 */
export function comparisonView(
  state: GameState,
  passive: GameState = passiveFor(state.seed),
): ComparisonView {
  const text = ui.outcome.compare;
  const start = String(state.history[0]?.year ?? state.year);

  return {
    played: rowFor(text.played, state, start),
    passive: rowFor(text.passive, passive, start),
  };
}

// ------------------------------------------------------------------ DOM ---

type Row = keyof ComparisonView;

function span(className: string, slot?: string): HTMLSpanElement {
  const element = document.createElement('span');
  element.className = className;
  if (slot !== undefined) element.dataset.compare = slot;
  return element;
}

function mountRow(row: Row): HTMLElement {
  const line = document.createElement('div');
  line.className = 'compare__row';
  line.dataset.row = row;

  const name = span('compare__name');
  name.append(span('compare__title', `${row}-name`), span('compare__span', `${row}-span`));

  const stripes = document.createElement('div');
  stripes.className = 'stripes compare__stripes';
  stripes.dataset.compare = `${row}-stripes`;
  mountStripes(stripes);

  line.append(name, stripes, span('compare__value', `${row}-value`));
  return line;
}

/** Monta a seção das duas faixas, uma vez. */
export function mountComparison(): HTMLElement {
  const section = document.createElement('section');
  section.className = 'compare';
  section.setAttribute('aria-label', ui.outcome.compare.section);
  section.append(mountRow('played'), mountRow('passive'));
  return section;
}

function write(root: ParentNode, slot: string, text: string): void {
  const target = root.querySelector(`[data-compare="${slot}"]`);
  if (target !== null && target.textContent !== text) target.textContent = text;
}

/** Escreve as duas partidas nas faixas já montadas. */
export function renderComparison(root: ParentNode, view: ComparisonView): void {
  for (const row of ['played', 'passive'] as const) {
    const data = view[row];
    write(root, `${row}-name`, data.name);
    write(root, `${row}-span`, data.span);
    write(root, `${row}-value`, data.value);

    const stripes = root.querySelector<HTMLElement>(`[data-compare="${row}-stripes"]`);
    if (stripes !== null) renderStripes(stripes, data.stripes);
  }
}
