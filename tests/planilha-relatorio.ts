// A escrita dos arquivos da planilha: CSV e a página de curvas.
//
// Separado do tests/planilha.test.ts de propósito — lá mora a simulação e os
// aceites, que é o que se lê para entender o balanceamento; aqui mora só
// formatação de saída, que é volume sem decisão. Este arquivo não termina em
// `.test.ts`, então o vitest não o executa como suíte (o `include` do
// vite.config.ts é `tests/**/*.test.ts`); ele é importado.

import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';

import { ui } from '../src/data/i18n';
import { medalFor, MEDALS } from '../src/engine/outcome';
import { balance, skills } from '../src/engine/state';

/**
 * O nome da medalha em pt-BR, ou "Sem medalha".
 *
 * Vem do `i18n.ts` e não de um texto escrito aqui: a regra 12 manda a interface
 * inteira em pt-BR, e o `medalFor` devolve o **id** interno (`gold`), que é
 * inglês por causa da regra 11. Repetir "Ouro" neste arquivo criaria um segundo
 * lugar para o nome da medalha mudar — que é o mesmo motivo de o `MEDAL_CEILING`
 * do outcome.ts ser exportado em vez de o cartão reescrever os limiares.
 */
function medalName(temperature: number): string {
  const medal = medalFor(temperature);
  return medal === null ? ui.outcome.result.none.title : ui.outcome.result[medal].title;
}

/**
 * O mesmo, a partir do **id** da medalha em vez da temperatura.
 *
 * Existe porque o P3-03 já tem a medalha resolvida quando chega aqui — perguntar
 * de novo a partir de uma temperatura reconstruída daria chance de os dois
 * caminhos discordarem numa borda.
 */
function medalTitle(id: string): string {
  const known = MEDALS.find((m) => m === id);
  return known === undefined ? ui.outcome.result.none.title : ui.outcome.result[known].title;
}

/**
 * A pasta da planilha, relativa à raiz do repositório.
 *
 * Relativa de propósito, em vez de derivada de `import.meta.dirname`: o vitest
 * roda com o diretório de trabalho na raiz — é o `root` do vite.config.ts — e
 * derivar do módulo custaria `node:path` mais uma extensão da interface
 * `ImportMeta`, que o ESLint deste projeto recusa (só `interface` funde
 * declarações, e a regra do §4 manda preferir `type`). O teste que gera os
 * arquivos confere que eles existem e têm o conteúdo esperado, então o dia em
 * que este caminho estiver errado é um dia em que a suíte cai.
 */
const OUT_DIR = 'docs/planilha';

export type YearRow = {
  readonly year: number;
  readonly temperature: number;
  readonly emissions: number;
  readonly cumulativeCO2: number;
  readonly actionPoints: number;
  readonly pointsPerYear: number;
  readonly unlocked: number;
  readonly support: number;
  /** O que foi comprado nos 12 meses que terminam neste ano. */
  readonly boughtThisYear: readonly string[];
};

export type Run = {
  readonly id: string;
  readonly label: string;
  readonly rows: readonly YearRow[];
  readonly unlockedCount: number;
  /** PAC que **entrou** na partida inteira, tenha sido gasto ou não. */
  readonly earnedPoints: number;
  readonly spentPoints: number;
  /** Ano em que a partida cruzou cada limiar, ou `null` se nunca cruzou. */
  readonly crossings: Readonly<Record<string, number | null>>;
  /** Ano da derrota, ou `null`. A simulação segue mesmo depois dela. */
  readonly defeatYear: number | null;
};

/** Uma linha da varredura do P3-04: comprar o ramo Sociedade depois de quantos cortes. */
export type SweepRow = {
  readonly afterCuts: number | 'nunca';
  readonly temperature: number;
  readonly emissions: number;
  readonly unlocked: number;
  readonly earnedPoints: number;
};

/** Uma linha da curva de dificuldade do P3-03: quanto ainda está em jogo no ano. */
export type TensionRow = {
  readonly year: number;
  /** `pior − melhor`, em °C. É a tensão: o quanto a decisão do jogador ainda pesa. */
  readonly stakes: number;
  readonly bestFromHere: number;
  readonly worstFromHere: number;
  readonly medalBest: string | null;
  readonly medalWorst: string | null;
  /** O teto de quem não fez nada até aqui e resolve agir agora. */
  readonly lateStartBest: number;
  readonly lateStartDefeated: boolean;
  readonly purchasesThisYear: number;
};

export const TREE_COST = skills.reduce((sum, s) => sum + s.cost, 0);

/** Os nomes dos arquivos gerados, na ordem em que a página de curvas os cita. */
export const OUTPUT_FILES = [
  'partidas.csv',
  'economia-pac.csv',
  'economia-quando-comprar.csv',
  'tensao-por-ano.csv',
  'curvas.html',
  'tensao.html',
] as const;

/**
 * Lê de volta um arquivo gerado.
 *
 * Existe para o teste conferir que a escrita caiu onde deveria: `OUT_DIR` é um
 * caminho relativo, e um dia em que o diretório de trabalho do vitest mudar,
 * os arquivos iriam parar em outro lugar **sem erro nenhum** — a planilha do
 * repositório ficaria velha em silêncio, que é exatamente o que este desenho
 * inteiro tenta impedir.
 */
export function readOutput(name: (typeof OUTPUT_FILES)[number]): string {
  return readFileSync(`${OUT_DIR}/${name}`, 'utf8');
}

/** Número no formato que o Excel em pt-BR entende: vírgula decimal. */
export function num(value: number, digits: number): string {
  return value.toFixed(digits).replace('.', ',');
}

/**
 * CSV com `;` e vírgula decimal.
 *
 * Não é preciosismo regional: num Excel configurado em pt-BR, um arquivo com
 * ponto decimal e vírgula separadora abre com tudo empilhado numa coluna só, e
 * a planilha da entrega vira uma tela de lixo na frente do professor.
 */
function writeCsv(name: string, header: readonly string[], lines: readonly string[]): void {
  mkdirSync(OUT_DIR, { recursive: true });
  writeFileSync(`${OUT_DIR}/${name}`, [header.join(';'), ...lines].join('\n') + '\n', 'utf8');
}

export function writePartidasCsv(runs: readonly Run[]): void {
  const lines: string[] = [];
  for (const run of runs) {
    for (const row of run.rows) {
      lines.push(
        [
          run.id,
          String(row.year),
          num(row.temperature, 4),
          num(row.emissions, 3),
          num(row.cumulativeCO2, 1),
          num(row.actionPoints, 1),
          num(row.pointsPerYear, 1),
          String(row.unlocked),
          num(row.support, 2),
          row.boughtThisYear.join(' '),
        ].join(';'),
      );
    }
  }
  writeCsv(
    'partidas.csv',
    [
      'estrategia',
      'ano',
      'temperatura_C',
      'emissoes_Gt_ano',
      'co2_acumulado_Gt',
      'pac_em_caixa',
      'pac_por_ano',
      'nos_comprados',
      'apoio_medio',
      'comprou_no_ano',
    ],
    lines,
  );
}

export function writeEconomiaCsv(runs: readonly Run[]): void {
  const lines = runs.map((run) => {
    const missing = Math.max(0, TREE_COST - run.earnedPoints);
    return [
      run.id,
      run.label,
      num(run.earnedPoints, 1),
      String(TREE_COST),
      num(run.spentPoints, 1),
      String(run.unlockedCount),
      String(skills.length),
      num(missing, 1),
      num((missing / TREE_COST) * 100, 1),
    ].join(';');
  });
  writeCsv(
    'economia-pac.csv',
    [
      'estrategia',
      'descricao',
      'pac_arrecadado_75_anos',
      'custo_total_da_arvore',
      'pac_gasto',
      'nos_comprados',
      'nos_totais',
      'pac_faltando',
      'falta_percentual',
    ],
    lines,
  );
}

export function writeVarreduraCsv(rows: readonly SweepRow[]): void {
  const lines = rows.map((r) =>
    [
      String(r.afterCuts),
      num(r.temperature, 4),
      num(r.emissions, 3),
      String(r.unlocked),
      num(r.earnedPoints, 1),
    ].join(';'),
  );
  writeCsv(
    'economia-quando-comprar.csv',
    [
      'sociedade_comprada_apos_n_cortes',
      'temperatura_2100_C',
      'emissoes_2100_Gt_ano',
      'nos_comprados',
      'pac_arrecadado',
    ],
    lines,
  );
}

export function writeTensaoCsv(rows: readonly TensionRow[]): void {
  const lines = rows.map((r) =>
    [
      String(r.year),
      num(r.stakes, 4),
      num(r.bestFromHere, 4),
      num(r.worstFromHere, 4),
      r.medalBest === null ? 'nenhuma' : medalTitle(r.medalBest),
      r.medalWorst === null ? 'nenhuma' : medalTitle(r.medalWorst),
      num(r.lateStartBest, 4),
      r.lateStartDefeated ? 'sim' : 'nao',
      String(r.purchasesThisYear),
    ].join(';'),
  );
  writeCsv(
    'tensao-por-ano.csv',
    [
      'ano',
      'tensao_C',
      'melhor_final_daqui_C',
      'pior_final_daqui_C',
      'melhor_medalha_possivel',
      'pior_medalha_possivel',
      'teto_de_quem_comeca_agora_C',
      'comecar_agora_ja_perde',
      'compras_no_ano',
    ],
    lines,
  );
}

// ------------------------------------------------------------- o gráfico ----

const CHART = { width: 720, height: 320, padLeft: 96, padRight: 176, padTop: 20, padBottom: 40 };
const MIN_T = 1.0;
const MAX_T = 3.6;

/** Cor por estratégia. Toda curva também recebe rótulo escrito — §5. */
const COLORS: Readonly<Record<string, string>> = {
  nada: '#c2410c',
  tarde: '#7c3aed',
  'sociedade-cedo': '#a16207',
  melhor: '#047857',
};

function plotSize() {
  return {
    plotW: CHART.width - CHART.padLeft - CHART.padRight,
    plotH: CHART.height - CHART.padTop - CHART.padBottom,
  };
}

function yFor(temperature: number): number {
  const { plotH } = plotSize();
  return CHART.padTop + plotH - ((temperature - MIN_T) / (MAX_T - MIN_T)) * plotH;
}

function temperaturePath(run: Run): string {
  const { plotW } = plotSize();
  return run.rows
    .map((row, i) => {
      const x = CHART.padLeft + (i / (run.rows.length - 1)) * plotW;
      return `${i === 0 ? 'M' : 'L'}${x.toFixed(1)} ${yFor(row.temperature).toFixed(1)}`;
    })
    .join(' ');
}

function gridlines(): string {
  const { plotW } = plotSize();
  return [1.5, 2.0, 2.5, 3.0]
    .map((t) => {
      const y = yFor(t).toFixed(1);
      // `t - 0.01` porque o teto é estrito: 1,5 °C exato não é Ouro, mas a linha
      // do gráfico marca a fronteira **da faixa** que termina ali.
      const label =
        t === 3.0 ? `${num(t, 1)} °C · derrota` : `${num(t, 1)} °C · ${medalName(t - 0.01)}`;
      return `<line x1="${CHART.padLeft}" y1="${y}" x2="${CHART.padLeft + plotW}" y2="${y}" class="grid" />
      <text x="${CHART.padLeft - 8}" y="${(Number(y) + 4).toFixed(1)}" class="tick-y">${label}</text>`;
    })
    .join('\n      ');
}

function xTicks(): string {
  const { plotW } = plotSize();
  return [2025, 2050, 2075, 2100]
    .map((year) => {
      const span = balance.endYear - balance.startYear;
      const x = CHART.padLeft + ((year - balance.startYear) / span) * plotW;
      return `<text x="${x.toFixed(1)}" y="${CHART.height - CHART.padBottom + 20}" class="tick-x">${year}</text>`;
    })
    .join('\n      ');
}

function legend(runs: readonly Run[]): string {
  const { plotW } = plotSize();
  return runs
    .map((run, i) => {
      const last = run.rows[run.rows.length - 1];
      const y = CHART.padTop + 14 + i * 22;
      const color = COLORS[run.id] ?? '#475569';
      return `<rect x="${CHART.padLeft + plotW + 12}" y="${y - 9}" width="10" height="10" fill="${color}" />
      <text x="${CHART.padLeft + plotW + 28}" y="${y}" class="legend">${run.id} · ${num(last?.temperature ?? 0, 2)} °C</text>`;
    })
    .join('\n      ');
}

function tableRows(runs: readonly Run[]): string {
  return runs
    .map((run) => {
      const last = run.rows[run.rows.length - 1];
      const desfecho =
        run.defeatYear === null
          ? medalName(last?.temperature ?? 0)
          : `Derrota em ${run.defeatYear}`;
      return `<tr>
        <td><b>${run.id}</b><br /><span class="muted">${run.label}</span></td>
        <td>${num(last?.temperature ?? 0, 2)} °C</td>
        <td>${num(last?.emissions ?? 0, 1)} Gt/ano</td>
        <td>${run.unlockedCount} de ${skills.length}</td>
        <td>${num(run.earnedPoints, 0)} PAC</td>
        <td>${desfecho}</td>
      </tr>`;
    })
    .join('\n      ');
}

const STYLE = `:root { color-scheme: light dark; --ink: #0f172a; --muted: #64748b; --line: #cbd5e1; --bg: #fff; }
      @media (prefers-color-scheme: dark) {
        :root { --ink: #e2e8f0; --muted: #94a3b8; --line: #334155; --bg: #0f172a; }
      }
      body { font: 16px/1.6 system-ui, sans-serif; color: var(--ink); background: var(--bg); margin: 0; padding: 32px; }
      main { max-width: 840px; margin: 0 auto; }
      h1 { font-size: 1.5rem; margin: 0 0 4px; }
      h2 { font-size: 1.1rem; margin: 32px 0 8px; }
      p.sub { color: var(--muted); margin: 0 0 24px; }
      svg { max-width: 100%; height: auto; display: block; }
      .grid { stroke: var(--line); stroke-width: 1; stroke-dasharray: 3 3; }
      .axis { stroke: var(--line); stroke-width: 1.5; }
      .tick-y { fill: var(--muted); font: 12px system-ui, sans-serif; text-anchor: end; }
      .tick-x { fill: var(--muted); font: 12px system-ui, sans-serif; text-anchor: middle; }
      .legend { fill: var(--ink); font: 13px system-ui, sans-serif; }
      table { border-collapse: collapse; width: 100%; font-size: 0.95rem; }
      th, td { text-align: left; padding: 8px 10px; border-bottom: 1px solid var(--line); vertical-align: top; }
      th { color: var(--muted); font-weight: 600; }
      .muted { color: var(--muted); font-size: 0.85rem; }
      footer { margin-top: 28px; color: var(--muted); font-size: 0.9rem; }`;

export function writeCurvasHtml(runs: readonly Run[], seed: number): void {
  const { plotW } = plotSize();
  const html = `<!doctype html>
<html lang="pt-BR">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Planilha dos 75 anos — P3-02</title>
    <style>
      ${STYLE}
    </style>
  </head>
  <body>
    <main>
      <h1>A curva de temperatura reage à compra</h1>
      <p class="sub">
        Aceite do <code>P3-02</code>. Gerado por <code>tests/planilha.test.ts</code> com o engine de
        produção — não editar à mão. Seed ${seed}.
      </p>
      <svg viewBox="0 0 ${CHART.width} ${CHART.height}" role="img"
           aria-label="Temperatura de 2025 a 2100 em quatro estratégias de compra">
      ${gridlines()}
      <line x1="${CHART.padLeft}" y1="${CHART.padTop}" x2="${CHART.padLeft}" y2="${CHART.height - CHART.padBottom}" class="axis" />
      <line x1="${CHART.padLeft}" y1="${CHART.height - CHART.padBottom}" x2="${CHART.padLeft + plotW}" y2="${CHART.height - CHART.padBottom}" class="axis" />
      ${xTicks()}
      ${runs
        .map(
          (run) =>
            `<path d="${temperaturePath(run)}" fill="none" stroke="${COLORS[run.id] ?? '#475569'}" stroke-width="2.5" />`,
        )
        .join('\n      ')}
      ${legend(runs)}
      </svg>
      <h2>Em 2100</h2>
      <table>
        <thead>
          <tr><th>Estratégia</th><th>Temperatura</th><th>Emissões</th><th>Nós</th><th>PAC arrecadado</th><th>Desfecho</th></tr>
        </thead>
        <tbody>
      ${tableRows(runs)}
        </tbody>
      </table>
      <footer>
        Dados ano a ano em <code>partidas.csv</code>. A economia de PAC do <code>P3-04</code> está em
        <code>economia-pac.csv</code> e <code>economia-quando-comprar.csv</code>. Os achados e o que
        fazer com eles estão em <code>docs/BALANCEAMENTO.md</code>.
      </footer>
    </main>
  </body>
</html>
`;
  mkdirSync(OUT_DIR, { recursive: true });
  writeFileSync(`${OUT_DIR}/curvas.html`, html, 'utf8');
}

// ------------------------------------------- a curva de dificuldade (P3-03) ---

/**
 * A página da tensão.
 *
 * Vive à parte da `curvas.html` porque cada teste é dono do que escreve: se os
 * dois arquivos gravassem a mesma página, a ordem em que o vitest roda passaria
 * a decidir o conteúdo dela — que é o tipo de dependência que só aparece meses
 * depois, num dia em que alguém renomeia um teste.
 */
export function writeTensaoHtml(rows: readonly TensionRow[], seed: number): void {
  const { plotW, plotH } = plotSize();
  const maxStakes = 1.0;

  const xOf = (year: number): number =>
    CHART.padLeft + ((year - balance.startYear) / (balance.endYear - balance.startYear)) * plotW;
  const yOf = (stakes: number): number => CHART.padTop + plotH - (stakes / maxStakes) * plotH;

  const curve = rows
    .map((r, i) => `${i === 0 ? 'M' : 'L'}${xOf(r.year).toFixed(1)} ${yOf(r.stakes).toFixed(1)}`)
    .join(' ');

  const yGrid = [0, 0.25, 0.5, 0.75, 1.0]
    .map((v) => {
      const y = yOf(v).toFixed(1);
      return `<line x1="${CHART.padLeft}" y1="${y}" x2="${CHART.padLeft + plotW}" y2="${y}" class="grid" />
      <text x="${CHART.padLeft - 8}" y="${(Number(y) + 4).toFixed(1)}" class="tick-y">${num(v, 2)} °C</text>`;
    })
    .join('\n      ');

  const locked = rows.find((r) => r.medalBest === r.medalWorst)?.year;
  const forgiven = rows.find((r) => r.lateStartDefeated)?.year;

  /** Marco vertical com rótulo escrito ao lado — nunca só a linha (§5). */
  const marker = (year: number | undefined, label: string, dy: number): string => {
    if (year === undefined) return '';
    const x = xOf(year).toFixed(1);
    return `<line x1="${x}" y1="${CHART.padTop}" x2="${x}" y2="${CHART.height - CHART.padBottom}" class="axis" stroke-dasharray="4 3" />
      <text x="${(Number(x) + 6).toFixed(1)}" y="${CHART.padTop + dy}" class="legend">${year} · ${label}</text>`;
  };

  const decadeRows = [2025, 2035, 2045, 2055, 2065, 2075, 2085, 2095]
    .map((start) => {
      const row = rows.find((r) => r.year === start);
      if (row === undefined) return '';
      const minutes =
        ((start - balance.startYear) * balance.ticksPerYear * balance.realSecondsPerTick) / 60;
      const purchases = rows
        .filter((r) => r.year >= start && r.year < start + 10)
        .reduce((a, r) => a + r.purchasesThisYear, 0);
      return `<tr>
        <td><b>${start}–${Math.min(start + 9, balance.endYear)}</b></td>
        <td>${num(minutes, 0)} min</td>
        <td>${num(row.stakes, 3)} °C</td>
        <td>${purchases}</td>
        <td>${num(row.lateStartBest, 2)} °C${row.lateStartDefeated ? ' · já perdeu' : ''}</td>
      </tr>`;
    })
    .join('\n      ');

  const html = `<!doctype html>
<html lang="pt-BR">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Curva de dificuldade — P3-03</title>
    <style>
      ${STYLE}
    </style>
  </head>
  <body>
    <main>
      <h1>Quanto ainda está em jogo, ano a ano</h1>
      <p class="sub">
        Aceite do <code>P3-03</code>. A tensão é a distância entre o melhor e o pior desfecho ainda
        alcançáveis a partir daquele ano. Zero significa que nada do que o jogador fizer muda o
        resultado. Gerado por <code>tests/tensao.test.ts</code> — não editar à mão. Seed ${seed}.
      </p>
      <svg viewBox="0 0 ${CHART.width} ${CHART.height}" role="img"
           aria-label="Tensão da partida de 2025 a 2100, caindo de 0,91 °C para zero">
      ${yGrid}
      <line x1="${CHART.padLeft}" y1="${CHART.padTop}" x2="${CHART.padLeft}" y2="${CHART.height - CHART.padBottom}" class="axis" />
      <line x1="${CHART.padLeft}" y1="${CHART.height - CHART.padBottom}" x2="${CHART.padLeft + plotW}" y2="${CHART.height - CHART.padBottom}" class="axis" />
      ${xTicks()}
      ${marker(locked, 'a medalha trava', 16)}
      ${marker(forgiven, 'o perdão fecha', 38)}
      <path d="${curve}" fill="none" stroke="#047857" stroke-width="2.5" />
      </svg>
      <h2>Década a década</h2>
      <table>
        <thead>
          <tr><th>Década</th><th>Começa em</th><th>Tensão no início</th><th>Compras</th><th>Teto de quem começa aqui</th></tr>
        </thead>
        <tbody>
      ${decadeRows}
        </tbody>
      </table>
      <footer>
        Dados ano a ano em <code>tensao-por-ano.csv</code>. A leitura, os três problemas de Fluxo e a
        especificação do que precisa existir para a partida seguir tensa até 2100 estão em
        <code>docs/CURVA-DE-DIFICULDADE.md</code>.
      </footer>
    </main>
  </body>
</html>
`;
  mkdirSync(OUT_DIR, { recursive: true });
  writeFileSync(`${OUT_DIR}/tensao.html`, html, 'utf8');
}
