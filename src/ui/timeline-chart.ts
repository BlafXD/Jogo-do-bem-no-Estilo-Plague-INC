// O gráfico da linha do tempo da tela final (P7-06). A regra está no
// docs/GDD.md §2.7: "gráfico da linha do tempo + o que você poderia ter feito
// diferente + 3 ações reais. Curto. Sem sermão."
//
// Mesma divisão do hud.ts, do map.ts e do outcome.ts: `timelineChartView` é
// **puro** — entra GameState, sai a geometria inteira em números — e só
// `mountTimelineChart` e `renderTimelineChart` tocam no DOM. Isso é o que
// permite conferir onde cada linha cai sem abrir um navegador.
//
// **Uma curva só, e é a da temperatura.** É ela que dá a medalha, e é ela que o
// §2.7 chama de catraca de mão única. Uma segunda curva de emissões contaria a
// mesma história com o dobro de tinta; o que a emissão tem de único — o ano em
// que ela parou de subir — cabe numa marca sobre a curva da temperatura, e é o
// que o `turningPoint` do engine devolve.
//
// **Nenhuma biblioteca de gráfico.** O §2 da FORMA-DE-TRABALHO.md as põe atrás
// de aprovação, e um `<path>` de polilinha com quatro linhas tracejadas não
// justifica a dependência. O padrão de SVG é o do map.ts, inclusive o
// `createElementNS` — `document.createElement('svg')` faz um elemento de HTML
// com o nome errado, que não desenha nada e não avisa.

import { ui } from '../data/i18n';
import { timeline } from '../engine/history';
import { MEDAL_CEILING, type Medal } from '../engine/outcome';
import { turningPoint } from '../engine/review';
import { balance, type GameState } from '../engine/state';

// ------------------------------------------------------------- geometria ---

/**
 * A caixa de desenho, em unidades do viewBox.
 *
 * Mil de largura, como o map.ts, e pela mesma razão prática: o `min-width` das
 * duas folhas resolve a mesma conta de tamanho de fonte, então quem mexer numa
 * não precisa refazer a aritmética da outra.
 */
const VIEWBOX = { width: 1000, height: 420 } as const;

/**
 * A área onde a curva vive.
 *
 * A margem direita é larga (210 unidades) porque os rótulos das linhas
 * tracejadas moram lá. Foi a saída para um problema de colisão: rótulo em cima
 * da linha, dentro da área de desenho, cai justamente onde a curva passa — a do
 * ouro fica a 8% do piso, que é por onde a curva sobe nos primeiros anos. Numa
 * calha à parte, nenhum rótulo encosta na curva, em nenhuma partida.
 */
const PLOT = { left: 40, right: 790, top: 30, bottom: 360 } as const;

/** A linha de base dos números do eixo do tempo, abaixo do desenho. */
const YEAR_LABEL_Y = 396;

/** A calha dos rótulos das linhas tracejadas, à direita da área de desenho. */
const LABEL_X = PLOT.right + 14;

/**
 * De quantos em quantos anos o eixo do tempo é marcado.
 *
 * Quinze cai redondo nos 75 anos da partida: seis marcas, a primeira em 2025 e
 * a última exatamente em 2100, sem sobra. É medida de layout, não de
 * balanceamento — a regra 8 fala dos números que mudam o jogo, e mudar isto
 * para 25 só troca quantos números aparecem embaixo do desenho.
 */
const YEAR_STEP = 15;

/** Distância entre a marca da virada e o texto dela. */
const TURN_LABEL_OFFSET = 34;

/**
 * A partir de que distância da borda o rótulo da virada deixa de ser centrado.
 *
 * **130 é a metade da largura do rótulo**, e é isso que o número quer dizer:
 * centrado, o texto avança 130 unidades para cada lado da marca. Conferido no
 * navegador com um pico em 2037, que é onde a partida gulosa vira: com 110 o
 * rótulo começava antes da margem esquerda do desenho e encostava no eixo.
 */
const TURN_LABEL_MARGIN = 130;

/**
 * O quanto o rótulo se afasta da marca quando deixa de ser centrado.
 *
 * Ancorado no começo ou no fim, o texto nasce em cima do círculo da marca. Um
 * pouco mais do que o raio dele resolve.
 */
const TURN_LABEL_NUDGE = 14;

// ------------------------------------------------------------- formatação ---

/**
 * A temperatura como o HUD a escreve — duas casas.
 *
 * É formatação repetida, e é deliberada: o `hudView` recebe um `GameState` e
 * aqui se formata um `Snapshot`, que é um instante qualquer da partida e não o
 * estado atual. O que impede as duas de divergirem não é este comentário, é o
 * teste que cobra que o fim da curva seja exatamente o que o HUD mostra.
 */
const twoDecimals = new Intl.NumberFormat('pt-BR', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

/** Os limiares entram na frase sem casa fixa, como no cartão: "1,5 °C", não "1,50 °C". */
const threshold = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 2 });

function celsius(value: number, format: Intl.NumberFormat): string {
  return `${format.format(value)} ${ui.units.celsius}`;
}

// ------------------------------------------------------------------ vista ---

/** As chaves das linhas tracejadas. `lose` é o teto da partida, não uma medalha. */
export type ThresholdKey = Medal | 'lose';

export type ChartThreshold = {
  readonly key: ThresholdKey;
  /** "Ouro · 1,5 °C". Nunca só a cor da linha — o §5 do GDD proíbe. */
  readonly label: string;
  readonly y: number;
};

export type ChartYear = {
  readonly year: number;
  readonly x: number;
};

export type ChartTurn = {
  readonly x: number;
  readonly y: number;
  readonly label: string;
  readonly labelX: number;
  readonly labelY: number;
  readonly anchor: 'start' | 'middle' | 'end';
};

export type TimelineChartView = {
  /** O atributo `d` da curva. */
  readonly path: string;
  readonly thresholds: readonly ChartThreshold[];
  readonly years: readonly ChartYear[];
  /** `null` quando a emissão ainda subia no fim: não houve virada para marcar. */
  readonly turn: ChartTurn | null;
  /** O texto que substitui o desenho para quem não o enxerga. */
  readonly summary: string;
};

/** Onde um ano cai no eixo horizontal. O domínio é fixo: 2025 a 2100, sempre. */
function xForYear(year: number): number {
  const span = balance.endYear - balance.startYear;
  const ratio = (year - balance.startYear) / span;
  return PLOT.left + ratio * (PLOT.right - PLOT.left);
}

/**
 * Onde uma temperatura cai no eixo vertical.
 *
 * O piso é sempre a temperatura de partida e o teto é sempre o limiar de
 * derrota — **domínio fixo, não ajustado à partida**. É o que torna dois
 * gráficos comparáveis: uma curva que para na metade da altura parou na metade
 * do caminho para a derrota, em qualquer partida. Escalar ao máximo de cada
 * partida faria toda curva encher o desenho, e a que quase perdeu ficaria com
 * exatamente a mesma cara da que ganhou ouro.
 *
 * O teto cede quando a partida termina acima dele: a derrota por temperatura é
 * declarada **acima** de 3,0 °C (§2.7), então o último ponto pode passar do
 * limiar por uma fração. Sem esta folga, ele seria desenhado fora da caixa.
 */
function yForTemperature(temperature: number, ceiling: number): number {
  const span = ceiling - balance.startTemperature;
  const ratio = (temperature - balance.startTemperature) / span;
  return PLOT.bottom - ratio * (PLOT.bottom - PLOT.top);
}

/** As marcas do eixo do tempo, de YEAR_STEP em YEAR_STEP, terminando no fim da partida. */
function yearTicks(): readonly ChartYear[] {
  const ticks: ChartYear[] = [];
  for (let year = balance.startYear; year <= balance.endYear; year += YEAR_STEP) {
    ticks.push({ year, x: xForYear(year) });
  }
  return ticks;
}

/** Os nomes das medalhas saem do cartão, para os dois nunca discordarem. */
const THRESHOLD_NAMES: Readonly<Record<ThresholdKey, string>> = {
  gold: ui.outcome.result.gold.title,
  silver: ui.outcome.result.silver.title,
  bronze: ui.outcome.result.bronze.title,
  lose: ui.outcome.result.defeat.title,
};

const THRESHOLD_VALUES: Readonly<Record<ThresholdKey, number>> = {
  gold: MEDAL_CEILING.gold,
  silver: MEDAL_CEILING.silver,
  bronze: MEDAL_CEILING.bronze,
  lose: balance.loseTemperature,
};

const THRESHOLD_KEYS: readonly ThresholdKey[] = ['gold', 'silver', 'bronze', 'lose'];

/**
 * A geometria inteira do gráfico de uma partida.
 *
 * Devolve números, nunca elementos: é o que permite conferir no vitest, sem
 * DOM, que a linha do ouro está abaixo da do bronze e que a curva termina no
 * ano em que a partida terminou.
 */
export function timelineChartView(state: GameState): TimelineChartView {
  const curve = timeline(state);
  const first = curve[0];
  // Pela catraca do §2.7 o último ponto é sempre o mais quente: o CO₂ acumulado
  // só cresce, e nenhuma compra faz a temperatura descer.
  const last = curve[curve.length - 1] ?? first;
  const ceiling = Math.max(balance.loseTemperature, last?.temperature ?? 0);

  const steps = curve.map(
    (point) =>
      `${xForYear(point.year).toFixed(1)} ${yForTemperature(point.temperature, ceiling).toFixed(1)}`,
  );

  // Um ponto só é o primeiro mês da partida. Ele vira um segmento de
  // comprimento zero, e não um `M` solto: um `M` sozinho não pinta nada, nem
  // com ponta arredondada, e a curva de uma partida recém-começada sumiria.
  const [origin = '', ...rest] = steps;
  const path =
    steps.length === 0 ? '' : `M ${[origin, ...(rest.length === 0 ? [origin] : rest)].join(' L ')}`;

  const turned = turningPoint(state);
  const turn: ChartTurn | null =
    turned === null
      ? null
      : (() => {
          const x = xForYear(turned.year);
          const y = yForTemperature(turned.temperature, ceiling);
          // Perto das bordas o texto centrado vazaria da área de desenho.
          const anchor =
            x < PLOT.left + TURN_LABEL_MARGIN
              ? 'start'
              : x > PLOT.right - TURN_LABEL_MARGIN
                ? 'end'
                : 'middle';

          return {
            x,
            y,
            label: ui.timelineChart.turn(String(turned.year)),
            // Encostado na borda, o texto sai de lado da marca em vez de nascer
            // por cima dela.
            labelX:
              anchor === 'start'
                ? x + TURN_LABEL_NUDGE
                : anchor === 'end'
                  ? x - TURN_LABEL_NUDGE
                  : x,
            // Abaixo da marca: a curva sobe da esquerda para a direita, então o
            // espaço debaixo dela é o que está livre em qualquer partida. O que
            // **não** está livre ali são as tracejadas dos limiares, e é por
            // isso que o CSS dá um halo ao texto — ele apaga a linha atrás de si
            // em vez de a geometria ter que desviar de quatro alturas fixas.
            labelY: y + TURN_LABEL_OFFSET,
            anchor,
          };
        })();

  const text = ui.timelineChart;
  const summary = [
    text.summary(
      celsius(first?.temperature ?? balance.startTemperature, twoDecimals),
      String(first?.year ?? balance.startYear),
      celsius(last?.temperature ?? balance.startTemperature, twoDecimals),
      String(last?.year ?? balance.startYear),
    ),
    turned === null ? text.summaryNoTurn : text.summaryTurn(String(turned.year)),
  ].join(' ');

  return {
    path,
    thresholds: THRESHOLD_KEYS.map((key) => ({
      key,
      label: text.threshold(THRESHOLD_NAMES[key], celsius(THRESHOLD_VALUES[key], threshold)),
      y: yForTemperature(THRESHOLD_VALUES[key], ceiling),
    })),
    years: yearTicks(),
    turn,
    summary,
  };
}

// ------------------------------------------------------------------- DOM ---

const SVG_NS = 'http://www.w3.org/2000/svg';

function svg<K extends keyof SVGElementTagNameMap>(tag: K): SVGElementTagNameMap[K] {
  return document.createElementNS(SVG_NS, tag);
}

type Slot = 'canvas' | 'curve' | 'turn' | 'turn-label' | 'thresholds' | 'years';

function slot(root: ParentNode, name: Slot): SVGElement | null {
  return root.querySelector<SVGElement>(`[data-chart="${name}"]`);
}

function text(className: string, x: number, y: number): SVGTextElement {
  const node = svg('text');
  node.setAttribute('class', className);
  node.setAttribute('x', String(x));
  node.setAttribute('y', String(y));
  return node;
}

/**
 * Monta o desenho vazio, uma vez.
 *
 * **Um `<figure>` com `<figcaption>`**, e não uma `<div>` com um parágrafo
 * solto: a legenda pertence ao desenho, e é assim que um leitor de tela sabe
 * disso sem que ninguém precise costurar um `aria-describedby` à mão.
 *
 * O rolador de lado é o mesmo do map.css, pela mesma razão do §5: o texto
 * dentro de um SVG encolhe junto com o SVG, e abaixo de certa largura ele
 * cairia sob o piso de 16px. Encolher o texto seria trocar uma régua de
 * acessibilidade por conforto de layout.
 */
export function mountTimelineChart(): HTMLElement {
  const figure = document.createElement('figure');
  figure.className = 'chart';

  const canvas = svg('svg');
  canvas.setAttribute('class', 'chart__canvas');
  canvas.dataset.chart = 'canvas';
  canvas.setAttribute('viewBox', `0 0 ${VIEWBOX.width} ${VIEWBOX.height}`);
  // `img` e não `group`: aqui não há nada focável dentro, ao contrário do mapa.
  // Para quem usa leitor de tela isto é uma figura com um texto equivalente, e
  // é o `aria-label` escrito pelo render que carrega o conteúdo do desenho.
  canvas.setAttribute('role', 'img');

  // As linhas tracejadas entram antes da curva para ficarem **atrás** dela: em
  // SVG a ordem do documento é a ordem de pintura, e uma tracejada por cima
  // partiria a curva em pedaços justamente nos pontos que mais importam.
  const thresholds = svg('g');
  thresholds.dataset.chart = 'thresholds';

  const axis = svg('line');
  axis.setAttribute('class', 'chart__axis');
  axis.setAttribute('x1', String(PLOT.left));
  axis.setAttribute('y1', String(PLOT.bottom));
  axis.setAttribute('x2', String(PLOT.right));
  axis.setAttribute('y2', String(PLOT.bottom));

  const years = svg('g');
  years.dataset.chart = 'years';

  const curve = svg('path');
  curve.setAttribute('class', 'chart__curve');
  curve.dataset.chart = 'curve';
  curve.setAttribute('fill', 'none');

  const turnMark = svg('circle');
  turnMark.setAttribute('class', 'chart__turn');
  turnMark.dataset.chart = 'turn';
  turnMark.setAttribute('r', '9');

  const turnLabel = text('chart__turn-label', 0, 0);
  turnLabel.dataset.chart = 'turn-label';

  canvas.append(thresholds, axis, years, curve, turnMark, turnLabel);

  const scroll = document.createElement('div');
  scroll.className = 'chart__scroll';
  scroll.append(canvas);

  const caption = document.createElement('figcaption');
  caption.className = 'chart__caption';
  caption.textContent = ui.timelineChart.intro(celsius(balance.startTemperature, threshold));

  figure.append(scroll, caption);
  return figure;
}

/** Escreve a partida no desenho já montado. */
export function renderTimelineChart(root: ParentNode, view: TimelineChartView): void {
  const canvas = slot(root, 'canvas');
  if (canvas !== null)
    canvas.setAttribute('aria-label', `${ui.timelineChart.label}. ${view.summary}`);

  const curve = slot(root, 'curve');
  if (curve !== null) curve.setAttribute('d', view.path);

  const thresholds = slot(root, 'thresholds');
  if (thresholds !== null) {
    thresholds.replaceChildren(
      ...view.thresholds.flatMap((line) => {
        const rule = svg('line');
        rule.setAttribute('class', 'chart__threshold');
        rule.dataset.threshold = line.key;
        rule.setAttribute('x1', String(PLOT.left));
        rule.setAttribute('y1', String(line.y));
        rule.setAttribute('x2', String(PLOT.right));
        rule.setAttribute('y2', String(line.y));

        const label = text('chart__threshold-label', LABEL_X, line.y);
        label.dataset.threshold = line.key;
        label.setAttribute('dominant-baseline', 'middle');
        label.textContent = line.label;

        return [rule, label];
      }),
    );
  }

  const years = slot(root, 'years');
  if (years !== null) {
    years.replaceChildren(
      ...view.years.map((tick) => {
        const label = text('chart__year', tick.x, YEAR_LABEL_Y);
        label.setAttribute('text-anchor', 'middle');
        label.textContent = String(tick.year);
        return label;
      }),
    );
  }

  // A virada some da tela quando não houve virada. Sai por `hidden`, e não por
  // um `d` vazio, para o leitor de tela também não encontrar um rótulo órfão —
  // o `summary` já diz, em palavras, que as emissões ainda subiam.
  const mark = slot(root, 'turn');
  const markLabel = slot(root, 'turn-label');
  const turn = view.turn;

  for (const node of [mark, markLabel]) {
    if (node instanceof SVGElement) node.toggleAttribute('hidden', turn === null);
  }
  if (turn === null || mark === null || markLabel === null) return;

  mark.setAttribute('cx', turn.x.toFixed(1));
  mark.setAttribute('cy', turn.y.toFixed(1));
  markLabel.setAttribute('x', turn.labelX.toFixed(1));
  markLabel.setAttribute('y', turn.labelY.toFixed(1));
  markLabel.setAttribute('text-anchor', turn.anchor);
  markLabel.textContent = turn.label;
}
