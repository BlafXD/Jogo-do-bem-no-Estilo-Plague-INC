// @vitest-environment jsdom

import { describe, expect, it } from 'vitest';
import { ui } from '../src/data/i18n';
import { balance, createInitialState, skills, type GameState } from '../src/engine/state';
import { advanceTick, TOTAL_TICKS } from '../src/engine/tick';
import {
  mountTimelineChart,
  renderTimelineChart,
  timelineChartView,
} from '../src/ui/timeline-chart';

/**
 * O desenho do gráfico da tela final (P7-06).
 *
 * A geometria está no tests/timeline-chart.test.ts, que roda em node. Aqui só o
 * que não existe sem DOM: os elementos serem de SVG de verdade, o texto
 * equivalente chegar ao `aria-label`, e as exigências do §5 do GDD — cada linha
 * com o nome escrito, nada comunicado só por cor.
 */

function run(state: GameState, ticks: number): GameState {
  let next = state;
  for (let i = 0; i < ticks; i++) next = advanceTick(next);
  return next;
}

const semAcao = run(createInitialState(2025), TOTAL_TICKS);
const comTudo = run(
  { ...createInitialState(2025), unlockedSkills: skills.map((skill) => skill.id) },
  TOTAL_TICKS,
);

function desenhado(state: GameState): HTMLElement {
  const figure = mountTimelineChart();
  document.body.replaceChildren(figure);
  renderTimelineChart(figure, timelineChartView(state));
  return figure;
}

function slot(root: ParentNode, name: string): Element | null {
  return root.querySelector(`[data-chart="${name}"]`);
}

describe('a montagem', () => {
  it('é uma figura com legenda, e não uma div com um parágrafo solto', () => {
    const figure = mountTimelineChart();

    expect(figure.tagName).toBe('FIGURE');
    expect(figure.querySelector('figcaption')?.textContent).toBe(ui.timelineChart.intro('1,37 °C'));
  });

  it('o desenho é SVG de verdade, não um elemento de HTML com nome de SVG', () => {
    // `document.createElement('svg')` produz um HTMLUnknownElement que não
    // desenha nada e não reclama. O namespace é a diferença.
    const canvas = slot(mountTimelineChart(), 'canvas');

    expect(canvas?.namespaceURI).toBe('http://www.w3.org/2000/svg');
    expect(canvas?.getAttribute('viewBox')).toMatch(/^0 0 \d+ \d+$/);
  });

  it('o desenho é uma imagem para quem usa leitor de tela', () => {
    // `img` e não `group`: aqui não há nada focável dentro, ao contrário do
    // mapa. O conteúdo chega pelo aria-label.
    expect(slot(mountTimelineChart(), 'canvas')?.getAttribute('role')).toBe('img');
  });

  it('vive dentro de um rolador, para o texto não encolher abaixo de 16px (§5)', () => {
    const canvas = slot(mountTimelineChart(), 'canvas');

    expect(canvas?.parentElement?.className).toBe('chart__scroll');
  });
});

describe('o que fica desenhado', () => {
  it('a curva chega ao atributo d', () => {
    const view = timelineChartView(semAcao);

    expect(slot(desenhado(semAcao), 'curve')?.getAttribute('d')).toBe(view.path);
  });

  it('quatro linhas tracejadas, cada uma com o nome escrito ao lado (§5)', () => {
    const figure = desenhado(semAcao);
    const linhas = figure.querySelectorAll('.chart__threshold');
    const rotulos = [...figure.querySelectorAll('.chart__threshold-label[data-threshold]')];

    expect(linhas).toHaveLength(4);
    expect(rotulos).toHaveLength(4);
    for (const rotulo of rotulos) {
      expect(rotulo.textContent?.trim().length ?? 0).toBeGreaterThan(0);
    }
  });

  it('as tracejadas são pintadas antes da curva, para não a partirem', () => {
    // Em SVG a ordem do documento é a ordem de pintura. Uma tracejada por cima
    // cortaria a curva justamente nos pontos que mais importam.
    const figure = desenhado(semAcao);
    const canvas = slot(figure, 'canvas');
    const filhos = [...(canvas?.children ?? [])];

    const tracejadas = filhos.findIndex((node) => node.getAttribute('data-chart') === 'thresholds');
    const curva = filhos.findIndex((node) => node.getAttribute('data-chart') === 'curve');

    expect(tracejadas).toBeGreaterThanOrEqual(0);
    expect(tracejadas).toBeLessThan(curva);
  });

  it('as marcas do eixo do tempo vão de 2025 a 2100', () => {
    const anos = [...desenhado(semAcao).querySelectorAll('.chart__year')].map(
      (node) => node.textContent,
    );

    expect(anos[0]).toBe(String(balance.startYear));
    expect(anos.at(-1)).toBe(String(balance.endYear));
  });

  it('a legenda diz de onde a curva parte — o piso não cabia dentro do desenho', () => {
    // O teto do ouro fica a 8% do piso: um rótulo no piso e o do ouro nasciam a
    // 26 unidades um do outro e se encostavam em qualquer partida. Conferido no
    // navegador antes de a legenda assumir o número.
    expect(desenhado(semAcao).querySelector('figcaption')?.textContent).toContain('1,37');
  });
});

describe('a marca da virada', () => {
  it('some quando a emissão ainda subia — sem rótulo órfão para o leitor de tela', () => {
    const figure = desenhado(semAcao);

    expect(slot(figure, 'turn')?.hasAttribute('hidden')).toBe(true);
    expect(slot(figure, 'turn-label')?.hasAttribute('hidden')).toBe(true);
  });

  it('aparece em cima da curva quando houve virada', () => {
    const figure = desenhado(comTudo);
    const marca = slot(figure, 'turn');
    const rotulo = slot(figure, 'turn-label');
    const view = timelineChartView(comTudo);

    expect(marca?.hasAttribute('hidden')).toBe(false);
    expect(Number(marca?.getAttribute('cx'))).toBeCloseTo(view.turn?.x ?? -1, 1);
    expect(Number(marca?.getAttribute('cy'))).toBeCloseTo(view.turn?.y ?? -1, 1);
    expect(rotulo?.textContent).toBe(view.turn?.label);
  });

  it('some de novo quando o mesmo desenho recebe uma partida que não virou', () => {
    // O render é chamado mais de uma vez sobre o mesmo SVG (o cartão redesenha
    // ao voltar do "Ver o mundo"). Um estado que não se limpa é o bug clássico
    // aqui: a marca da partida anterior ficaria no desenho da seguinte.
    const figure = desenhado(comTudo);
    renderTimelineChart(figure, timelineChartView(semAcao));

    expect(slot(figure, 'turn')?.hasAttribute('hidden')).toBe(true);
  });
});

describe('o texto equivalente', () => {
  it('o aria-label carrega o conteúdo do desenho, não o nome dele', () => {
    const canvas = slot(desenhado(semAcao), 'canvas');
    const label = canvas?.getAttribute('aria-label') ?? '';

    expect(label).toContain(ui.timelineChart.label);
    expect(label).toContain(timelineChartView(semAcao).summary);
  });
});
