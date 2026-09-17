// A partida sem nenhuma compra (VIS-10) — a comparação da tela de fim.
//
// **O que ela é.** A mesma partida, com a mesma seed, em que o jogador nunca
// comprou nada nem conteve a Inércia: a linha de base do docs/GDD.md §4, com os
// eventos do §2.5 e a Inércia do §2.6 agindo por cima. É o "e se eu não tivesse
// feito nada?" que a tela de fim desenha ao lado da partida jogada (§2.7).
//
// **Não é uma curva de fórmula.** O protótipo do VIS-01 a tirou da fórmula da
// temperatura, sem Inércia nem eventos, e ela acabava em 2091. Simulada pelo
// engine de verdade, ela acaba em 2089 nas seeds medidas. A diferença é a
// Inércia e os eventos, e é por isso que a conta mora aqui, e não na tela.
//
// **A mesma seed não quer dizer os mesmos eventos a partida inteira.** O peso
// de cada evento depende da temperatura (§4), então as duas partidas sorteiam
// igual só enquanto as temperaturas são iguais — até a primeira compra fazer
// diferença. É exatamente essa divergência que a comparação mostra.
//
// Custa uns 10 ms: são no máximo 900 meses de `advanceTick`.

import { isFinished } from './outcome';
import { createInitialState, type GameState } from './state';
import { advanceTick, TOTAL_TICKS } from './tick';

/**
 * Joga a partida inteira sem tocar em nada, até ela acabar, e devolve o estado
 * final — com o `history` preenchido, pronto para as listras e o gráfico.
 *
 * O limite de meses é uma trava, e não uma regra: o `isFinished` já responde
 * "acabou" no tick 900. Sem ela, um defeito futuro nessa pergunta travaria a
 * tela de fim num laço sem saída.
 */
export function passiveRun(seed: number): GameState {
  let state = createInitialState(seed);

  while (!isFinished(state) && state.tick < TOTAL_TICKS) {
    state = advanceTick(state);
  }

  return state;
}
