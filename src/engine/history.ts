// O registro da partida — a linha do tempo que a tela final desenha (P7-06).
//
// O `Snapshot` está no contrato do docs/GDD.md §3 desde o começo, e até aqui
// nenhuma partida escrevia nele. Este arquivo é quem escreve.
//
// **Um retrato por ano, não por mês.** Uma partida inteira tem 900 ticks; um
// gráfico de 75 anos de largura não tem 900 colunas para gastar, e o save
// carregaria doze vezes mais números para desenhar exatamente a mesma curva. A
// cadência anual dá 76 pontos — um por ano de 2025 a 2100 — que é a resolução
// que o eixo do §2.7 pede.
//
// **O retrato é do estado que entra no mês, não do que sai dele.** Parece
// detalhe e não é: é o que faz o ponto de 2025 existir. O tick 0 é o único
// instante em que a partida está intocada — temperatura de partida, CO₂
// acumulado zero, nenhuma compra —, e é essa a linha de base contra a qual o
// jogador vai ser lido no fim. Fotografar depois do primeiro `advanceClimate`
// perderia esse ponto para sempre. A alternativa seria semear o retrato dentro
// do `createInitialState`, e ela esbarra na arquitetura: o `state.ts` teria de
// importar o `globalEmissions` do `climate.ts`, que importa o `state.ts` de
// volta — o ciclo que o inertia.ts já registrou estar evitando.
//
// **O último ponto não está guardado, e é de propósito.** Ele é o estado atual,
// e quem o acrescenta é o `timeline`. Duas razões: o tick 900 nunca chega a
// entrar no `history` porque o `advanceTick` para antes de rodá-lo, e uma
// partida que acaba no meio do ano — derrota por apoio zero em julho — precisa
// terminar o gráfico em julho, e não no janeiro anterior. O engine não sabe o
// que faz uma partida acabar (o `outcome.ts` sabe, e o tick.ts registra por que
// não o importa); guardar só os aniversários e deixar a ponta viva por conta do
// leitor resolve os dois casos sem que este módulo precise saber de nenhum.

import { globalEmissions } from './climate';
import { averageSupport, balance, type GameState, type Snapshot } from './state';

/**
 * O retrato de um instante da partida: os seis números do `Snapshot` do §3.
 *
 * Nenhum deles é recalculado aqui de um jeito próprio — `emissions` e
 * `averageSupport` saem das mesmas funções que o HUD usa. Uma segunda conta da
 * média seria o jeito de o gráfico e o topo da tela discordarem em silêncio,
 * que é exatamente o que o `averageSupport` do state.ts existe para impedir.
 */
export function snapshotOf(state: GameState): Snapshot {
  return {
    tick: state.tick,
    year: state.year,
    temperature: state.temperature,
    emissions: globalEmissions(state),
    cumulativeCO2: state.cumulativeCO2,
    averageSupport: averageSupport(state),
  };
}

/**
 * Guarda o retrato do estado, se ele cair num aniversário da partida.
 *
 * Nos outros onze meses devolve o estado recebido, sem cópia. É o caminho
 * comum — onze de cada doze chamadas — e alocar um `GameState` novo para não
 * mudar nada nele seria lixo puro num laço que roda 900 vezes por partida.
 *
 * **Idempotente:** um tick que já está no fim da lista não entra de novo. No
 * fluxo normal isso nunca acontece, porque o `advanceTick` fotografa o mês que
 * começa e em seguida sai dele. A rede é para o save adulterado: o `save.ts`
 * confere a forma dos retratos, não se eles combinam com o `tick` da partida,
 * e um `history` editado à mão até o mês atual produziria um ponto dobrado no
 * gráfico sem nada quebrar antes.
 */
export function recordSnapshot(state: GameState): GameState {
  if (state.tick % balance.ticksPerYear !== 0) {
    return state;
  }

  const last = state.history[state.history.length - 1];
  if (last !== undefined && last.tick >= state.tick) {
    return state;
  }

  return { ...state, history: [...state.history, snapshotOf(state)] };
}

/**
 * A linha do tempo inteira: os aniversários guardados mais o instante atual.
 *
 * É esta a função que a tela final consome, e não o `history` cru. Ela é a
 * única leitura em que a curva termina onde a partida terminou de verdade —
 * inclusive quando a partida acabou fora de um aniversário, que é o caso de
 * toda derrota e de todo zero líquido.
 *
 * Durante a partida o último ponto é o mês corrente, o que faz a mesma função
 * servir para um gráfico ao vivo sem nenhum tratamento à parte.
 */
export function timeline(state: GameState): readonly Snapshot[] {
  const last = state.history[state.history.length - 1];
  if (last !== undefined && last.tick >= state.tick) {
    return state.history;
  }

  return [...state.history, snapshotOf(state)];
}
