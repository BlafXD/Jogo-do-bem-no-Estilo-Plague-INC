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

import { outcomeOf } from '../src/engine/outcome';
import { balance } from '../src/engine/state';
import {
  CUT_ORDER,
  ECONOMY_NODES,
  SEED,
  simulate,
  STRATEGIES,
  type SimResult,
  type Strategy,
} from './planilha-engine';
import {
  OUTPUT_FILES,
  readOutput,
  TREE_COST,
  writeCurvasHtml,
  writeEconomiaCsv,
  writePartidasCsv,
  writeVarreduraCsv,
  type SweepRow,
} from './planilha-relatorio';

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

  it('ACEITE: quem não compra nada perde, e quem joga bem chega vivo a 2100', () => {
    // **A estratégia que cumpre este aceite mudou no P7-03**, e a troca é o
    // achado da tarefa. Até aqui era a `melhor` — cortar cedo e ignorar
    // Sociedade. Desde que a Inércia age, comprar só cortes alimenta o
    // antagonista (o espelho do §2.6) sem nunca poder contê-lo, e a agência é
    // dissolvida por falta de apoio. Quem chega vivo é quem compra Sociedade e
    // contém.
    expect(run('nada').defeatYear).not.toBeNull();
    expect(run('contencao').defeatYear).toBeNull();
    expect(outcomeOf(run('contencao').finalState).kind).toBe('finished');
  });

  it('ACEITE do P7-03: cortar sem preparar apoio deixou de ser jogar bem', () => {
    // **A inversão que o P3-05 procurava.** A `melhor` termina **mais fria** que
    // a `contencao` e ainda assim perde a partida: o número bonito não protege
    // de ser dissolvido. É o dilema que o docs/GDD.md §2.6 descreve, agora
    // mensurável — "a partida que mais corta emissão não é a que sobrevive".
    const semSociedade = run('melhor');
    const contendo = run('contencao');

    expect(finalTemperature('melhor')).toBeLessThan(finalTemperature('contencao'));
    expect(semSociedade.defeatYear).not.toBeNull();
    expect(contendo.defeatYear).toBeNull();
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

  it('sem nenhuma compra, a arrecadação é exatamente a entrada de base', () => {
    // `earnedPoints` mede o que **entrou**; o que os eventos do P7-01 cobram sai
    // do caixa depois e não desconta daqui. Separar arrecadação de saldo é o que
    // mantém a economia do P3-04 legível — misturar as duas faria "quanto o
    // jogo rende" mudar sempre que um evento fosse rebalanceado.
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

    // **A monotonia estrita morreu no P7-01, e não por causa do balanceamento.**
    // Adiar uma compra muda o mês em que cada sorteio de evento acontece, então
    // duas posições vizinhas da varredura passam a diferir por ruído além da
    // tendência. O que continua verdade — e é o achado — é a tendência inteira:
    // a primeira posição é a pior, e nunca comprar é a melhor de todas.
    const primeira = numeric[0];
    const ultima = numeric[numeric.length - 1];
    if (primeira === undefined || ultima === undefined || nunca === undefined) {
      throw new Error('varredura incompleta');
    }

    expect(ultima.temperature).toBeLessThan(primeira.temperature);
    expect(nunca.temperature).toBeLessThan(primeira.temperature);
  });
});
