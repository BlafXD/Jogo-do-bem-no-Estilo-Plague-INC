// @vitest-environment jsdom

import { beforeEach, describe, expect, it } from 'vitest';
import { ui } from '../src/data/i18n';
import { passiveRun } from '../src/engine/passive-run';
import { balance, createInitialState, type GameState } from '../src/engine/state';
import { TOTAL_TICKS } from '../src/engine/tick';
import {
  comparisonView,
  mountComparison,
  passiveFor,
  renderComparison,
} from '../src/ui/comparison';
import { liveCelsius } from '../src/ui/format';

/**
 * A comparação da tela de fim (VIS-10): a partida jogada contra a mesma
 * partida sem nenhuma compra, em duas faixas de listras.
 */

/** Uma partida que chegou a 2100, na temperatura pedida. */
function chegou(temperature: number): GameState {
  return {
    ...createInitialState(2025),
    tick: TOTAL_TICKS,
    year: balance.endYear,
    temperature,
    history: [
      {
        tick: 0,
        year: 2025,
        temperature: 1.37,
        emissions: 40,
        cumulativeCO2: 0,
        averageSupport: 50,
      },
    ],
  };
}

beforeEach(() => {
  document.body.replaceChildren();
});

describe('comparisonView', () => {
  const parada = passiveRun(2025);

  it('a sua partida diz o período e a temperatura final', () => {
    const view = comparisonView(chegou(2.2), parada);

    expect(view.played.name).toBe(ui.outcome.compare.played);
    expect(view.played.span).toBe(ui.outcome.compare.span('2025', '2100'));
    expect(view.played.value).toBe(liveCelsius(2.2));
  });

  it('a partida parada diz o ano em que a agência acabou', () => {
    const view = comparisonView(chegou(2.2), parada);
    const ano = String(parada.year);

    expect(view.passive.name).toBe(ui.outcome.compare.passive);
    expect(view.passive.span).toBe(ui.outcome.compare.ended(ano));
    expect(view.passive.value).toBe(`${ui.outcome.result.defeat.icon} ${ano}`);
  });

  /** A cor não é o recado sozinha (§5): cada faixa tem a sua frase. */
  it('cada faixa tem a frase do leitor de tela', () => {
    const view = comparisonView(chegou(2.2), parada);

    expect(view.played.stripes.label).toContain(liveCelsius(2.2));
    expect(view.passive.stripes.label).toContain('dissolvida');
  });

  it('a partida parada deixa os anos depois do fim sem cor', () => {
    const view = comparisonView(chegou(2.2), parada);
    const vividos = view.passive.stripes.stripes.filter((stripe) => stripe.lived);

    expect(vividos).toHaveLength(parada.year - 2025 + 1);
  });

  it('sem a partida parada, ela é simulada pela seed, e guardada', () => {
    const view = comparisonView(chegou(2.2));

    expect(view.passive.value).toContain(String(parada.year));
    expect(passiveFor(2025)).toBe(passiveFor(2025));
  });
});

describe('as faixas na tela', () => {
  it('monta duas faixas, cada uma com listras de verdade', () => {
    const root = mountComparison();
    document.body.append(root);

    renderComparison(root, comparisonView(chegou(2.2), passiveRun(2025)));

    expect(root.getAttribute('aria-label')).toBe(ui.outcome.compare.section);
    expect(root.querySelectorAll('.compare__row')).toHaveLength(2);
    for (const faixa of root.querySelectorAll('.compare__stripes')) {
      expect(faixa.getAttribute('role')).toBe('img');
      expect(faixa.getAttribute('aria-label')?.length).toBeGreaterThan(0);
      expect(faixa.querySelectorAll('.stripes__year')).toHaveLength(75);
    }
    expect(root.querySelector('[data-compare="passive-value"]')?.textContent).toContain('✕');
  });
});
