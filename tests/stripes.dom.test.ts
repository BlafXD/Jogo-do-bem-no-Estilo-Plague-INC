// @vitest-environment jsdom

import { describe, expect, it } from 'vitest';

import { ui } from '../src/data/i18n';
import { balance, createInitialState, type GameState } from '../src/engine/state';
import { advanceTick, TOTAL_TICKS } from '../src/engine/tick';
import {
  STRIPE_YEARS,
  mountStripes,
  renderStripes,
  stripeTicks,
  stripesView,
} from '../src/ui/stripes';

/**
 * As listras no DOM (VIS-04). A escala e a view estão no tests/stripes.test.ts,
 * que roda em node; aqui só o que não existe sem DOM: o que o leitor de tela
 * recebe, o que cada listra carrega para o CSS e a promessa de que redesenhar
 * não recria nada.
 */

function run(ticks: number): GameState {
  let state = createInitialState(2025);
  for (let i = 0; i < ticks; i++) state = advanceTick(state);
  return state;
}

function montar(state: GameState = createInitialState(2025)): HTMLElement {
  const root = document.createElement('div');
  document.body.replaceChildren(root);
  mountStripes(root);
  renderStripes(root, stripesView(state));
  return root;
}

const anos = (root: ParentNode): HTMLElement[] => [
  ...root.querySelectorAll<HTMLElement>('.stripes__year'),
];

describe('a barra para o leitor de tela', () => {
  /**
   * Setenta e cinco caixas coloridas anunciadas uma a uma seriam ruído. O bloco
   * é uma imagem, e o nome dela é a frase que diz o que a cor quer dizer — o §5
   * não deixa a cor ser o recado sozinha.
   */
  it('é uma imagem com nome escrito', () => {
    const state = run(40);
    const root = montar(state);

    expect(root.getAttribute('role')).toBe('img');
    expect(root.getAttribute('aria-label')).toBe(stripesView(state).label);
  });

  it('tem dica, como tudo que tem número (§5)', () => {
    expect(montar().title).toBe(ui.stripes.hint);
  });

  it('o nome acompanha a partida', () => {
    const root = montar();
    const depois = run(3 * balance.ticksPerYear);

    renderStripes(root, stripesView(depois));

    expect(root.getAttribute('aria-label')).toContain(String(depois.year));
  });
});

describe('as listras', () => {
  it('são uma por ano jogado', () => {
    expect(anos(montar())).toHaveLength(STRIPE_YEARS);
  });

  it('o ano vivido leva o trecho e a mistura; o que falta fica vazio', () => {
    const state = run(4 * balance.ticksPerYear + 2);
    const root = montar(state);
    const view = stripesView(state);

    anos(root).forEach((listra, i) => {
      const esperado = view.stripes[i];
      if (esperado?.lived) {
        expect(listra.dataset.tone, String(esperado.year)).toBe(String(esperado.tone.segment));
        expect(listra.style.getPropertyValue('--mistura')).toBe(
          `${Math.round(esperado.tone.mix * 100)}%`,
        );
        expect(listra.hasAttribute('data-empty')).toBe(false);
      } else {
        expect(listra.hasAttribute('data-empty'), String(esperado?.year)).toBe(true);
        expect(listra.dataset.tone).toBeUndefined();
      }
    });
  });

  it('nenhuma listra carrega cor escrita — quem pinta é o tema', () => {
    const root = montar(run(TOTAL_TICKS));

    for (const listra of anos(root)) {
      expect(listra.style.background).toBe('');
      expect(listra.style.backgroundColor).toBe('');
    }
  });

  it('redesenhar não recria as listras', () => {
    const root = montar();
    const antes = anos(root);

    renderStripes(root, stripesView(run(2 * balance.ticksPerYear)));

    expect(anos(root)).toEqual(antes);
    expect(antes[1]?.dataset.tone).toBeDefined();
  });
});

describe('o marcador do mês corrente', () => {
  it('fica na posição do mês e escreve o ano e a temperatura', () => {
    const state = run(300);
    const root = montar(state);
    const { marker } = stripesView(state);
    const agora = root.querySelector<HTMLElement>('[data-stripes="now"]');

    expect(agora?.style.left).toBe(`${(marker.position * 100).toFixed(2)}%`);
    expect(agora?.dataset.edge).toBe(marker.edge);
    expect(root.querySelector('[data-stripes="now-text"]')?.textContent).toBe(marker.text);
  });
});

describe('os anos escritos embaixo', () => {
  it('ficam onde a view manda, com o texto do ano', () => {
    const root = montar();
    const escritos = [...root.querySelectorAll<HTMLElement>('.stripes__tick')];

    expect(escritos.map((tick) => tick.textContent)).toEqual(stripeTicks().map((t) => t.year));
    expect(escritos.map((tick) => tick.style.left)).toEqual(
      stripeTicks().map((t) => `${t.position * 100}%`),
    );
  });
});
