// A curva de dificuldade medida (P3-03).
//
// **A pergunta que este arquivo responde.** A Teoria do Fluxo diz que a diversão
// vive num canal estreito entre a ansiedade (desafio muito acima da habilidade)
// e o tédio (desafio muito abaixo). Num jogo de estratégia, o que separa os dois
// não é a dificuldade de execução — não há reflexo a testar aqui — e sim se
// **ainda existe decisão capaz de mudar o desfecho**. Uma partida em que o
// resultado já está selado não é fácil: é tédio, mesmo que os números na tela
// continuem se mexendo.
//
// **Como isso vira número.** No ano Y, pega-se a partida como ela está e joga-se
// dela em diante de dois jeitos: o melhor possível e o pior possível. A
// distância entre os dois finais **é** a tensão daquele momento. Se ela for
// zero, nada do que o jogador fizer dali para frente muda o resultado — o jogo
// acabou, mesmo que o relógio não saiba disso.
//
// Isso é medido com o engine de produção, bifurcando o estado real. Não é
// estimativa nem regra de bolso: é o próprio jogo respondendo.
//
// **O alvo, decidido no chat em 2026-08-20:** a partida deve continuar tensa até
// 2100. Os testes abaixo que falham hoje **não são bugs deste arquivo** — são o
// alvo registrado como dívida, e o `docs/CURVA-DE-DIFICULDADE.md` diz o que
// precisa existir para pagá-la.

import { describe, expect, it } from 'vitest';

import { medalFor } from '../src/engine/outcome';
import { balance } from '../src/engine/state';
import {
  CUT_ORDER,
  ECONOMY_NODES,
  playOut,
  SEED,
  simulate,
  STRATEGIES,
  type Strategy,
} from './planilha-engine';
import { readOutput, writeTensaoCsv, writeTensaoHtml, type TensionRow } from './planilha-relatorio';

/** Tempo real de uma década de jogo na velocidade 1x, em minutos. */
const MINUTES_PER_DECADE = (10 * balance.ticksPerYear * balance.realSecondsPerTick) / 60;

function strategyById(id: string): Strategy {
  const found = STRATEGIES.find((s) => s.id === id);
  if (found === undefined) throw new Error(`estratégia desconhecida: ${id}`);
  return found;
}

/**
 * A partir de que nível de Inércia o jogador simulado contém (P7-03).
 *
 * O mesmo número da estratégia `contencao` do `planilha-engine.ts`, e ele
 * precisa ser o mesmo: a linha de referência da tensão e a bifurcação "o melhor
 * possível daqui" têm que descrever o mesmo jogador. Com jogadores diferentes,
 * "quanto ainda está em jogo" mediria a distância entre duas pessoas em vez de
 * entre duas decisões.
 */
const CONTAIN_ABOVE = 70;

/**
 * A lista de desejos de quem joga bem hoje: os dois nós de Sociedade primeiro,
 * porque é o primeiro deles que destrava a contenção, e depois os cortes na
 * ordem de melhor corte por PAC.
 */
const BEST_ORDER = [...ECONOMY_NODES, ...CUT_ORDER];

/**
 * A tensão ano a ano, medida a partir de duas linhas de referência.
 *
 * `bem` é a partida de quem vem jogando bem; `parado` é a de quem não fez nada
 * até agora. As duas importam por razões diferentes:
 *
 *  - de `bem` sai **quanto ainda está em jogo** para quem está engajado — é a
 *    medida de Fluxo propriamente dita;
 *  - de `parado` sai a **janela de perdão**: até que ano alguém que acordou
 *    tarde ainda consegue um resultado decente. É o que decide se largar o
 *    controle no meio da partida é recuperável ou terminal.
 */
function measureTension(): readonly TensionRow[] {
  // **A linha de referência mudou no P7-03, e a mudança é o achado.** Até aqui
  // ela era a `melhor` — cortar cedo e ignorar Sociedade. Desde que a Inércia
  // age, essa partida é **dissolvida por falta de apoio em 2095**, e medir a
  // tensão de quem está morrendo diria pouco sobre o jogo. A partida bem jogada
  // de hoje compra Sociedade e contém.
  const bem = simulate(strategyById('contencao'));
  const parado = simulate(strategyById('nada'));

  const rows: TensionRow[] = [];

  for (let i = 0; i < bem.statesByYear.length; i += 1) {
    const engajado = bem.statesByYear[i];
    const inerte = parado.statesByYear[i];
    if (engajado === undefined || inerte === undefined) throw new Error('ano faltando');

    // As duas pontas do que ainda é possível, a partir de quem jogou bem.
    // "O melhor possível" agora inclui conter — desde o P7-03, uma partida que
    // só compra nós não é a melhor jogável, é uma que perde mais devagar.
    const melhorFim = playOut(engajado, BEST_ORDER, CONTAIN_ABOVE);
    const piorFim = playOut(engajado, []);

    // E o teto de quem só vai começar a agir agora.
    const perdao = playOut(inerte, BEST_ORDER, CONTAIN_ABOVE);

    rows.push({
      year: engajado.year,
      stakes: piorFim.temperature - melhorFim.temperature,
      bestFromHere: melhorFim.temperature,
      worstFromHere: piorFim.temperature,
      medalBest: medalFor(melhorFim.temperature),
      medalWorst: medalFor(piorFim.temperature),
      lateStartBest: perdao.temperature,
      lateStartDefeated: perdao.defeated,
      purchasesThisYear: bem.rows[i]?.boughtThisYear.length ?? 0,
    });
  }

  return rows;
}

const tension = measureTension();

function at(year: number): TensionRow {
  const row = tension.find((r) => r.year === year);
  if (row === undefined) throw new Error(`ano fora da partida: ${year}`);
  return row;
}

/** O primeiro ano em que largar tudo e jogar perfeito já dão a mesma medalha. */
function firstDecidedYear(): number | null {
  const row = tension.find((r) => r.medalBest === r.medalWorst);
  return row?.year ?? null;
}

describe('curva de dificuldade (P3-03)', () => {
  it('gera a tensão ano a ano em docs/planilha/', () => {
    writeTensaoCsv(tension);
    writeTensaoHtml(tension, SEED);
    expect(tension).toHaveLength(balance.endYear - balance.startYear + 1);
    expect(readOutput('tensao-por-ano.csv').length).toBeGreaterThan(200);
    expect(readOutput('tensao.html').length).toBeGreaterThan(200);
  });

  it('a tensão só cai: uma decisão adiada nunca vale mais do que valia antes', () => {
    // A catraca do TCRE em forma de propriedade. Não é tautologia — se um
    // efeito futuro (um evento, a Inércia) puder devolver margem ao jogador,
    // este teste passa a falhar, e será por um bom motivo.
    for (let i = 1; i < tension.length; i += 1) {
      const anterior = tension[i - 1];
      const atual = tension[i];
      if (anterior === undefined || atual === undefined) throw new Error('ano faltando');
      expect(atual.stakes).toBeLessThanOrEqual(anterior.stakes + 1e-9);
    }
  });

  it('no começo há muito em jogo: quase um grau separa o melhor do pior', () => {
    expect(at(balance.startYear).stakes).toBeGreaterThan(0.8);
  });

  it('ACHADO: a medalha está decidida muito antes de 2100', () => {
    const decided = firstDecidedYear();
    expect(decided).not.toBeNull();
    // O alvo do chat é "tenso até 2100". Se um dia o P7-01 e o P7-03 fizerem a
    // partida continuar em disputa, este teste falha — e o conserto é apagá-lo,
    // não afrouxá-lo.
    expect(decided).toBeLessThan(balance.endYear);
  });

  it('ACHADO: o último terço da partida não tem nada em jogo', () => {
    // A 1x, cada década custa 3 minutos de tela. Aqui se mede quantos desses
    // minutos o jogador passa sem poder mudar o próprio destino.
    const morto = tension.filter((r) => r.stakes < 0.01);
    expect(morto.length).toBeGreaterThan(20);
    expect(MINUTES_PER_DECADE).toBeCloseTo(3, 6);
  });

  it('ACHADO: a janela de perdão fecha antes do fim — largar tarde é terminal', () => {
    // Quem não fez nada até 2025 ainda alcança o melhor resultado possível.
    //
    // O limiar vem do `balance.json` e não é mais o 2.5 escrito à mão que
    // estava aqui: a regra 8 proíbe número de balanceamento no código, e este
    // era um — o teto do Bronze mudou para 2,55 no P7-03 e a linha teria
    // passado a cobrar um limiar que o jogo não usa mais.
    expect(at(balance.startYear).lateStartDefeated).toBe(false);
    expect(at(balance.startYear).lateStartBest).toBeLessThan(balance.bronzeTemperature);

    // Em algum ano essa mesma partida deixa de ter salvação: por mais bem que
    // se jogue dali em diante, a derrota já está no caminho.
    const perdido = tension.find((r) => r.lateStartDefeated);
    expect(perdido).toBeDefined();
    expect(perdido?.year).toBeLessThan(balance.endYear);
  });

  it('o ritmo de decisão não é constante: as compras se concentram no começo', () => {
    const naPrimeiraMetade = tension
      .filter((r) => r.year < 2063)
      .reduce((a, r) => a + r.purchasesThisYear, 0);
    const naSegundaMetade = tension
      .filter((r) => r.year >= 2063)
      .reduce((a, r) => a + r.purchasesThisYear, 0);
    expect(naPrimeiraMetade).toBeGreaterThan(naSegundaMetade);
  });
});
