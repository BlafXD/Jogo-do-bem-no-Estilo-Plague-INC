// A planilha dos 75 anos (P3-02) e a economia de PAC (P3-04).
//
// **Por que isto é um teste e não um script.** A planilha do P3-02 existe para
// responder uma pergunta de balanceamento: a curva de temperatura reage à
// compra? Uma planilha escrita à mão responde isso no dia em que foi escrita e
// mente a partir do dia seguinte, porque o balance.json muda e ela não. Aqui a
// planilha é **gerada pelo engine de produção** — o mesmo advanceTick e o mesmo
// unlockSkill que o jogador roda — e as asserções abaixo são os aceites das duas
// tarefas. Se alguém mexer num custo ou numa taxa e quebrar a economia, este
// arquivo cai e diz qual propriedade morreu.
//
// **Por que os arquivos são regravados a cada `npm test`.** A partida é
// determinística: mesma seed, mesmo engine, mesmos bytes. Regravar sempre torna
// impossível o cenário clássico de a planilha do repositório estar velha em
// relação ao código. Se o `git status` acusar mudança em `docs/planilha/` depois
// de um `npm test`, isso **é o sinal** de que o balanceamento mudou — vale ler o
// diff antes de commitar.
//
// **O que este arquivo deliberadamente não faz: ajustar balanceamento.** Ele
// mede e registra. Mexer em número sem playtest por trás é o risco R2 do
// PLANO.md; o conserto do que for encontrado aqui é do P3-03 e do P8-02.

import { describe, expect, it } from 'vitest';

import { globalEmissions } from '../src/engine/climate';
import { outcomeOf } from '../src/engine/outcome';
import { canUnlock, pointsPerYear, unlockSkill } from '../src/engine/skills';
import {
  averageSupport,
  balance,
  createInitialState,
  skills,
  type GameState,
  type SkillId,
} from '../src/engine/state';
import { advanceTick, TOTAL_TICKS } from '../src/engine/tick';
import {
  OUTPUT_FILES,
  readOutput,
  TREE_COST,
  writeCurvasHtml,
  writeEconomiaCsv,
  writePartidasCsv,
  writeVarreduraCsv,
  type Run,
  type SweepRow,
  type YearRow,
} from './planilha-relatorio';

/** Uma seed qualquer, fixa: a partida precisa ser a mesma em toda máquina. */
const SEED = 20260820;

// --------------------------------------------------------- as estratégias ---

/**
 * Uma estratégia é uma **lista de desejos ordenada** mais um ano de início, e
 * não uma agenda de compras datada.
 *
 * A diferença importa: uma agenda ("compre solar em 2031") quebra sozinha
 * quando um custo muda, e quebra em silêncio — a compra simplesmente não
 * acontece e a curva piora sem ninguém entender por quê. A lista de desejos
 * pergunta ao `canUnlock` a cada mês e compra o primeiro item que couber no
 * bolso, que é também o que um jogador atento faz.
 */
type Strategy = {
  readonly id: string;
  readonly label: string;
  readonly startYear: number;
  readonly wishlist: readonly SkillId[];
};

/**
 * Os 16 nós que cortam emissão, do maior corte por PAC gasto para o menor.
 *
 * A ordem é derivada do `skills.json`, e não escrita à mão, porque uma lista
 * fixa apodrece: mudar um custo no arquivo de dados deixaria a "melhor ordem"
 * em silêncio errada, e a planilha passaria a comparar a estratégia ótima de
 * ontem com o balanceamento de hoje.
 *
 * **Que esta é de fato a melhor ordem foi medido, não assumido.** Uma busca de
 * 200 permutações aleatórias não achou nada melhor que ela (o melhor sorteio
 * empata em 2,44 °C; o pior chega a 2,53 °C). Ordenar por corte absoluto dá o
 * mesmo resultado; ordenar do mais barato para o mais caro é 0,014 °C pior.
 */
const CUT_ORDER: readonly SkillId[] = skills
  .filter((s) => s.effects.some((e) => e.kind === 'emissionCut'))
  .map((s) => ({
    id: s.id,
    ratio: s.effects.reduce((a, e) => a + (e.kind === 'emissionCut' ? e.value : 0), 0) / s.cost,
  }))
  .sort((a, b) => b.ratio - a.ratio)
  .map((n) => n.id);

/** Os dois únicos nós que aumentam a entrada de PAC: +2/ano e +3/ano. */
const ECONOMY_NODES: readonly SkillId[] = ['climate-education', 'treaties'];

const STRATEGIES: readonly Strategy[] = [
  { id: 'nada', label: 'Não faz nada', startYear: balance.startYear, wishlist: [] },
  {
    id: 'melhor',
    label: 'Corta cedo, na melhor ordem, e ignora Sociedade',
    startYear: balance.startYear,
    wishlist: CUT_ORDER,
  },
  {
    id: 'sociedade-cedo',
    label: 'Investe em Sociedade antes de cortar',
    startYear: balance.startYear,
    wishlist: [...ECONOMY_NODES, ...CUT_ORDER],
  },
  {
    id: 'tarde',
    label: 'Acorda em 2060',
    startYear: 2060,
    wishlist: [...ECONOMY_NODES, ...CUT_ORDER],
  },
];

// ------------------------------------------------------------- a simulação ---

const costById = new Map(skills.map((s) => [s.id, s.cost]));

type SimResult = Run & { readonly finalState: GameState };

/**
 * Roda os 900 ticks de uma lista de desejos.
 *
 * **A simulação não para na derrota, de propósito.** O jogo para — é o que o
 * P6-08 ligou — mas a planilha precisa da curva inteira até 2100 para que dê
 * para comparar estratégias no mesmo eixo. O ano da derrota fica registrado à
 * parte, e é ele que a página de curvas mostra na coluna de desfecho.
 */
function simulate(strategy: Strategy): SimResult {
  let state = createInitialState(SEED);
  const rows: YearRow[] = [];
  const crossings: Record<string, number | null> = { '1.5': null, '2.0': null, '2.5': null };
  let defeatYear: number | null = null;
  let earnedPoints = 0;
  let spentPoints = 0;
  let boughtThisYear: SkillId[] = [];

  const note = (s: GameState): void => {
    for (const key of Object.keys(crossings)) {
      if (crossings[key] === null && s.temperature >= Number(key)) crossings[key] = s.year;
    }
    if (defeatYear === null && outcomeOf(s).kind === 'defeat') defeatYear = s.year;
  };

  const snapshot = (s: GameState): YearRow => ({
    year: s.year,
    temperature: s.temperature,
    emissions: globalEmissions(s),
    cumulativeCO2: s.cumulativeCO2,
    actionPoints: s.actionPoints,
    pointsPerYear: pointsPerYear(s),
    unlocked: s.unlockedSkills.length,
    support: averageSupport(s),
    boughtThisYear: [...boughtThisYear],
  });

  note(state);
  rows.push(snapshot(state));

  for (let step = 0; step < TOTAL_TICKS; step += 1) {
    const before = state.actionPoints;
    state = advanceTick(state);
    // Medido **antes** da compra do mês: o que interessa aqui é quanto a
    // partida arrecadou, não quanto sobrou no caixa.
    earnedPoints += state.actionPoints - before;

    if (state.year >= strategy.startYear) {
      // Um item por mês, no máximo. Esvaziar a lista de uma vez quando o bolso
      // permite esconderia o ritmo — que é justamente o que a planilha mostra.
      for (const id of strategy.wishlist) {
        if (canUnlock(state, id).ok) {
          state = unlockSkill(state, id);
          spentPoints += costById.get(id) ?? 0;
          boughtThisYear.push(id);
          break;
        }
      }
    }

    note(state);

    if (state.tick % balance.ticksPerYear === 0) {
      rows.push(snapshot(state));
      boughtThisYear = [];
    }
  }

  return {
    id: strategy.id,
    label: strategy.label,
    rows,
    unlockedCount: state.unlockedSkills.length,
    earnedPoints,
    spentPoints,
    crossings,
    defeatYear,
    finalState: state,
  };
}

/**
 * A varredura do P3-04: comprar os dois nós de PAC depois de quantos cortes?
 *
 * `nunca` é a última linha, e é o achado da tarefa.
 */
function sweepEconomyTiming(): readonly SweepRow[] {
  const positions = [0, 1, 2, 3, 4, 5, 6, 8, 10, 12, 16];
  const rows: SweepRow[] = positions.map((k) => {
    const wishlist = [...CUT_ORDER.slice(0, k), ...ECONOMY_NODES, ...CUT_ORDER.slice(k)];
    const r = simulate({ id: `apos-${k}`, label: '', startYear: balance.startYear, wishlist });
    const last = r.rows[r.rows.length - 1];
    return {
      afterCuts: k,
      temperature: last?.temperature ?? Number.NaN,
      emissions: last?.emissions ?? Number.NaN,
      unlocked: r.unlockedCount,
      earnedPoints: r.earnedPoints,
    };
  });
  const never = simulate(STRATEGIES[1] as Strategy);
  const last = never.rows[never.rows.length - 1];
  return [
    ...rows,
    {
      afterCuts: 'nunca',
      temperature: last?.temperature ?? Number.NaN,
      emissions: last?.emissions ?? Number.NaN,
      unlocked: never.unlockedCount,
      earnedPoints: never.earnedPoints,
    },
  ];
}

// ------------------------------------------------------------- os aceites ---

const runs = STRATEGIES.map(simulate);
const byId = new Map(runs.map((r) => [r.id, r]));

/** Estoura em vez de devolver `undefined` — id digitado errado não deve virar teste que passa. */
function run(id: string): SimResult {
  const found = byId.get(id);
  if (found === undefined) throw new Error(`estratégia desconhecida: ${id}`);
  return found;
}

function finalTemperature(id: string): number {
  const rows = run(id).rows;
  return rows[rows.length - 1]?.temperature ?? Number.NaN;
}

describe('planilha dos 75 anos (P3-02)', () => {
  it('gera os quatro arquivos da planilha em docs/planilha/', () => {
    writePartidasCsv(runs);
    writeEconomiaCsv(runs);
    writeVarreduraCsv(sweepEconomyTiming());
    writeCurvasHtml(runs, SEED);

    // Lidos de volta: a escrita usa caminho relativo, e sem esta conferência um
    // diretório de trabalho diferente mandaria os arquivos para outro lugar sem
    // erro nenhum, deixando a planilha do repositório velha em silêncio.
    for (const name of OUTPUT_FILES) {
      expect(readOutput(name).length, `${name} saiu vazio`).toBeGreaterThan(200);
    }
    expect(readOutput('partidas.csv').split('\n')[0]).toBe(
      'estrategia;ano;temperatura_C;emissoes_Gt_ano;co2_acumulado_Gt;pac_em_caixa;pac_por_ano;nos_comprados;apoio_medio;comprou_no_ano',
    );
    // Uma linha por ano, por estratégia, mais o cabeçalho.
    const anos = balance.endYear - balance.startYear + 1;
    expect(readOutput('partidas.csv').trim().split('\n')).toHaveLength(anos * runs.length + 1);

    for (const r of runs) {
      expect(r.rows).toHaveLength(anos);
      expect(r.rows[0]?.year).toBe(balance.startYear);
      expect(r.rows[r.rows.length - 1]?.year).toBe(balance.endYear);
    }
  });

  it('ACEITE: a curva de temperatura reage à compra de habilidades', () => {
    // A prova é a ordem estrita entre as quatro curvas em 2100. Não faz nada é
    // de longe a pior; acordar em 2060 custa quase meio grau contra agir já.
    expect(finalTemperature('melhor')).toBeLessThan(finalTemperature('sociedade-cedo'));
    expect(finalTemperature('sociedade-cedo')).toBeLessThan(finalTemperature('tarde'));
    expect(finalTemperature('tarde')).toBeLessThan(finalTemperature('nada'));
  });

  it('ACEITE: quem não compra nada perde, e quem compra cedo chega vivo a 2100', () => {
    expect(run('nada').defeatYear).not.toBeNull();
    expect(run('melhor').defeatYear).toBeNull();
    expect(outcomeOf(run('melhor').finalState).kind).toBe('finished');
  });

  it('agir cedo vale mais do que agir muito: quem acorda em 2060 fica atrás', () => {
    // `tarde` compra a lista inteira e chega a mais nós que `melhor`, e ainda
    // assim termina mais quente. É a catraca do TCRE: a temperatura integra a
    // emissão ao longo do tempo, então mês emitido não volta.
    expect(run('tarde').unlockedCount).toBeGreaterThan(run('melhor').unlockedCount);
    expect(finalTemperature('tarde')).toBeGreaterThan(finalTemperature('melhor'));
  });

  it('a mesma seed produz a mesma partida — a planilha é reproduzível', () => {
    const repeat = simulate(STRATEGIES[1] as Strategy);
    expect(repeat.rows).toEqual(run('melhor').rows);
  });
});

describe('economia de PAC (P3-04)', () => {
  it('a árvore custa mais do que 75 anos rendem — a escolha precisa doer', () => {
    for (const r of runs) expect(r.earnedPoints).toBeLessThan(TREE_COST);
  });

  it('ACEITE: falta uma fatia grande da árvore mesmo com a economia toda ligada', () => {
    const missing = ((TREE_COST - run('sociedade-cedo').earnedPoints) / TREE_COST) * 100;
    // O alvo do PLANO.md é "falta ~35%". A faixa é larga porque o número exato
    // é achado de balanceamento e está no docs/BALANCEAMENTO.md; o que o teste
    // trava é a **propriedade** — falta o bastante para a escolha doer, e não
    // tanto que a árvore vire enfeite. Se cair, foi o balanceamento que mudou.
    expect(missing).toBeGreaterThan(25);
    expect(missing).toBeLessThan(45);
  });

  it('sem nenhuma compra, a entrada de PAC é exatamente a de base', () => {
    const anos = balance.endYear - balance.startYear;
    expect(run('nada').earnedPoints).toBeCloseTo(balance.basePointsPerYear * anos, 6);
  });

  it('ACHADO: o ramo Sociedade é uma armadilha — rende PAC e piora a partida', () => {
    const comEconomia = run('sociedade-cedo');
    const semEconomia = run('melhor');

    // Ele faz o que promete: mais PAC, mais nós comprados, menos emissão em 2100.
    expect(comEconomia.earnedPoints).toBeGreaterThan(semEconomia.earnedPoints);
    expect(comEconomia.unlockedCount).toBeGreaterThan(semEconomia.unlockedCount);

    // E ainda assim termina **mais quente**, que é o único número que dá medalha.
    // Os 110 PAC gastos nele no começo atrasam todo corte em cerca de uma
    // década, e o CO₂ desses anos fica no ar para sempre. Este teste registra um
    // problema, não uma qualidade: no dia em que o balanceamento fizer o ramo se
    // pagar, **é ele que deve falhar** e ser reescrito.
    expect(comEconomia.finalState.temperature).toBeGreaterThan(semEconomia.finalState.temperature);
  });

  it('ACHADO: quanto mais tarde o ramo Sociedade entra, melhor a partida acaba', () => {
    const sweep = sweepEconomyTiming();
    const numeric = sweep.filter((r) => r.afterCuts !== 'nunca');
    const nunca = sweep.find((r) => r.afterCuts === 'nunca');

    // Monótono: adiar a compra melhora o resultado, sem exceção.
    for (let i = 1; i < numeric.length; i += 1) {
      const anterior = numeric[i - 1];
      const atual = numeric[i];
      if (anterior === undefined || atual === undefined) throw new Error('varredura incompleta');
      expect(atual.temperature).toBeLessThan(anterior.temperature);
    }
    // E o limite dessa monotonia é nunca comprar.
    const ultimo = numeric[numeric.length - 1];
    if (nunca === undefined || ultimo === undefined) throw new Error('varredura incompleta');
    expect(nunca.temperature).toBeLessThan(ultimo.temperature);
  });
});
