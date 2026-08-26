import { describe, expect, it } from 'vitest';
import { ui } from '../src/data/i18n';
import { MEDAL_CEILING } from '../src/engine/outcome';
import { balance, createInitialState, skills, type GameState } from '../src/engine/state';
import { advanceTick, TOTAL_TICKS } from '../src/engine/tick';
import { hudView } from '../src/ui/hud';
import { timelineChartView, type ThresholdKey } from '../src/ui/timeline-chart';

/**
 * A geometria do gráfico da tela final (P7-06).
 *
 * Roda em node: `timelineChartView` devolve números, e é isso que permite
 * conferir onde cada linha cai sem abrir um navegador. O que só existe com DOM
 * está no tests/timeline-chart.dom.test.ts.
 *
 * **Quase nada aqui é medido em pixels absolutos.** As constantes de layout do
 * módulo não são exportadas de propósito, e testar contra os números delas
 * transformaria qualquer ajuste de margem numa enxurrada de testes vermelhos
 * que não descobriram bug nenhum. O que se cobra são as relações: a ordem das
 * linhas, a curva começar onde o eixo começa, o fim bater com o HUD.
 */

/** Roda N ticks a partir de um estado. */
function run(state: GameState, ticks: number): GameState {
  let next = state;
  for (let i = 0; i < ticks; i++) next = advanceTick(next);
  return next;
}

/** Uma partida inteira, sem nenhuma compra. */
const semAcao = run(createInitialState(2025), TOTAL_TICKS);

/** Uma partida inteira com a árvore toda, que é a que vira a curva. */
const comTudo = run(
  { ...createInitialState(2025), unlockedSkills: skills.map((skill) => skill.id) },
  TOTAL_TICKS,
);

/** Os pares x/y de um atributo `d` de polilinha. */
function pontos(path: string): readonly { readonly x: number; readonly y: number }[] {
  return path
    .split(/[ML]/)
    .map((piece) => piece.trim())
    .filter((piece) => piece.length > 0)
    .map((piece) => {
      const [x = '0', y = '0'] = piece.split(/\s+/);
      return { x: Number(x), y: Number(y) };
    });
}

function limiar(
  state: GameState,
  key: ThresholdKey,
): { readonly y: number; readonly label: string } {
  const found = timelineChartView(state).thresholds.find((line) => line.key === key);
  if (found === undefined) throw new Error(`o gráfico não desenhou a linha ${key}`);
  return found;
}

describe('as linhas de limiar', () => {
  it('ficam na ordem do §2.7 — o ouro embaixo, a derrota em cima', () => {
    // Em SVG o y cresce para baixo, então "mais frio" é um y maior. Se esta
    // ordem inverter, o gráfico entrega ouro visual a quem terminou em 2,9 °C.
    const y = (key: ThresholdKey) => limiar(semAcao, key).y;

    expect(y('gold')).toBeGreaterThan(y('silver'));
    expect(y('silver')).toBeGreaterThan(y('bronze'));
    expect(y('bronze')).toBeGreaterThan(y('lose'));
  });

  it('cada uma leva o nome escrito, nunca só a cor (§5)', () => {
    const rotulos = timelineChartView(semAcao).thresholds.map((line) => line.label);

    expect(rotulos[0]).toContain(ui.outcome.result.gold.title);
    expect(rotulos[1]).toContain(ui.outcome.result.silver.title);
    expect(rotulos[2]).toContain(ui.outcome.result.bronze.title);
    expect(rotulos[3]).toContain(ui.outcome.result.defeat.title);
  });

  it('o rótulo traz o número do balanceamento, não um escrito à mão', () => {
    expect(limiar(semAcao, 'gold').label).toContain('1,5');
    expect(limiar(semAcao, 'bronze').label).toContain(
      String(MEDAL_CEILING.bronze).replace('.', ','),
    );
  });
});

describe('o eixo do tempo', () => {
  it('vai de 2025 a 2100 e termina exatamente no fim da partida', () => {
    const anos = timelineChartView(semAcao).years.map((tick) => tick.year);

    expect(anos[0]).toBe(balance.startYear);
    expect(anos[anos.length - 1]).toBe(balance.endYear);
  });

  it('as marcas andam para a direita, sem repetir', () => {
    const xs = timelineChartView(semAcao).years.map((tick) => tick.x);

    for (let i = 1; i < xs.length; i++) {
      expect(xs[i]).toBeGreaterThan(xs[i - 1] ?? 0);
    }
  });
});

describe('a curva', () => {
  it('começa onde o eixo começa', () => {
    const view = timelineChartView(semAcao);

    expect(pontos(view.path)[0]?.x).toBeCloseTo(view.years[0]?.x ?? -1, 6);
  });

  it('uma partida inteira termina onde o eixo termina', () => {
    const view = timelineChartView(semAcao);
    const fim = pontos(view.path).at(-1);
    const ultimaMarca = view.years.at(-1);

    expect(fim?.x).toBeCloseTo(ultimaMarca?.x ?? -1, 6);
  });

  it('uma partida interrompida para antes da borda direita', () => {
    // É o desenho de uma derrota: a linha simplesmente acaba no meio do
    // caminho, e o espaço vazio à direita é o que sobrou do século.
    const view = timelineChartView(run(createInitialState(2025), TOTAL_TICKS / 2));
    const fim = pontos(view.path).at(-1);

    expect(fim?.x).toBeLessThan(view.years.at(-1)?.x ?? 0);
  });

  it('só sobe, nunca desce — a catraca do §2.7 desenhada', () => {
    // O CO₂ acumulado só cresce, então o y da curva só pode diminuir. Uma curva
    // que descesse seria sinal de que a temperatura passou a cair em algum
    // lugar do engine.
    const trilha = pontos(timelineChartView(semAcao).path);

    for (let i = 1; i < trilha.length; i++) {
      expect(trilha[i]?.y).toBeLessThanOrEqual(trilha[i - 1]?.y ?? 0);
    }
  });

  it('não passa por cima da linha de derrota quando a partida não perdeu', () => {
    const view = timelineChartView(comTudo);
    const teto = limiar(comTudo, 'lose').y;

    for (const ponto of pontos(view.path)) {
      expect(ponto.y).toBeGreaterThanOrEqual(teto);
    }
  });

  it('uma partida de um mês só vira um traço, e não um comando solto', () => {
    // Um `M` sozinho não pinta nada, nem com ponta arredondada.
    const view = timelineChartView(createInitialState(1));

    expect(view.path).toContain('L');
    expect(pontos(view.path)).toHaveLength(2);
  });
});

describe('a marca da virada', () => {
  it('não existe quando a emissão ainda subia no fim', () => {
    expect(timelineChartView(semAcao).turn).toBeNull();
  });

  it('cai dentro da área de desenho quando existe', () => {
    const view = timelineChartView(comTudo);
    const primeira = view.years[0]?.x ?? 0;
    const ultima = view.years.at(-1)?.x ?? 0;

    expect(view.turn).not.toBeNull();
    expect(view.turn?.x).toBeGreaterThanOrEqual(primeira);
    expect(view.turn?.x).toBeLessThanOrEqual(ultima);
  });

  it('o rótulo diz o ano', () => {
    const view = timelineChartView(comTudo);
    const ano = view.turn?.label.match(/\d{4}/)?.[0];

    expect(Number(ano)).toBeGreaterThanOrEqual(balance.startYear);
    expect(Number(ano)).toBeLessThan(balance.endYear);
  });
});

describe('o texto que substitui o desenho', () => {
  it('ACEITE: o fim da curva é o mesmo número que o HUD mostra', () => {
    // O gráfico formata um Snapshot e o HUD formata um GameState — duas
    // formatações da mesma temperatura, a dois centímetros uma da outra no
    // mesmo cartão. Este teste é o que impede as duas de divergirem; o
    // comentário no timeline-chart.ts não impede nada.
    expect(timelineChartView(semAcao).summary).toContain(hudView(semAcao).temperature);
  });

  it('traz os dois extremos da curva, não uma descrição do desenho', () => {
    const summary = timelineChartView(semAcao).summary;

    expect(summary).toContain(String(balance.startYear));
    expect(summary).toContain(String(balance.endYear));
    expect(summary).toContain('1,37');
  });

  it('diz em palavras o que a marca diz em desenho', () => {
    expect(timelineChartView(comTudo).summary).toContain(
      String(timelineChartView(comTudo).turn?.label.match(/\d{4}/)?.[0]),
    );
    expect(timelineChartView(semAcao).summary).toBe(
      `${ui.timelineChart.summary(
        hudView(createInitialState(2025)).temperature,
        String(balance.startYear),
        hudView(semAcao).temperature,
        String(balance.endYear),
      )} ${ui.timelineChart.summaryNoTurn}`,
    );
  });
});
