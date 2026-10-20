// O ranking local de melhores partidas (RANK-01). A regra está no
// docs/GDD.md §2.9; quem decide o desfecho que o ranking lê é o outcome.ts.
//
// **A entrada é derivada do GameState final, e nada é gravado.** É a mesma
// decisão do outcome.ts e do achievements.ts: o `rankingEntryFor` só lê o
// estado, nunca o estado lê de volta. Um save adulterado não entrega uma
// posição no ranking que a partida dele não sustenta.
//
// A outra metade — guardar a lista entre partidas — é da RANK-02, e mora na
// UI: `localStorage`, chave própria, como as conquistas e a preferência de
// som. Este arquivo não sabe que existe tela nem que existe armazenamento, e
// por isso o `mergeRanking` não grava nada por conta própria: ele só diz como
// a lista fica depois de uma partida entrar, e quem escreve é quem chama.

import { outcomeOf, type Outcome } from './outcome';
import { balance, type CharacterId, type GameState } from './state';

/**
 * O que uma linha do ranking precisa saber sobre a partida.
 *
 * **Sem data e sem nome de jogador** — a mesma decisão das conquistas (§2.8):
 * é uma lista do aparelho, não de uma pessoa. O `outcome` é o `Outcome` inteiro
 * do `outcomeOf`, e não só a medalha, porque a derrota também entra na lista
 * (§2.9) e precisa do motivo para o texto da UI escolher a frase certa.
 */
export type RankingEntry = {
  readonly outcome: Outcome;
  readonly temperature: number;
  readonly year: number;
  readonly character: CharacterId | null;
};

/**
 * A entrada que esta partida rende, ou `null` enquanto ela está em curso.
 *
 * Mesma guarda do `achievementsEarned`: metade do que uma entrada diz só tem
 * resposta honesta no fim — uma partida em 2030 não "parou" em lugar nenhum.
 */
export function rankingEntryFor(state: GameState): RankingEntry | null {
  const outcome = outcomeOf(state);
  if (outcome.kind === 'playing') return null;

  return {
    outcome,
    temperature: state.temperature,
    year: state.year,
    character: state.character,
  };
}

/**
 * O grupo de uma entrada: quem terminou vem antes de quem foi derrotado.
 *
 * `0` nunca é produzido por uma entrada com `outcome.kind === 'playing'`
 * porque o `rankingEntryFor` já recusa essa partida — mas a função é total
 * sobre `RankingEntry`, e tratar o caso inalcançável como "terminou" em vez de
 * lançar é a mesma escolha do `achievementsEarned`: isto é leitura de uma
 * lista, e não o lugar para derrubar a tela por uma entrada mal formada.
 */
function bucketOf(entry: RankingEntry): 0 | 1 {
  return entry.outcome.kind === 'defeat' ? 1 : 0;
}

/**
 * Ordena duas entradas na régua do §2.9: primeiro quem terminou, depois quem
 * foi derrotado; dentro do mesmo grupo, temperatura final mais baixa primeiro
 * — a mesma régua da medalha do §2.7.
 *
 * **Em caso de empate, devolve 0 de propósito.** O `Array.prototype.sort` é
 * estável desde o ES2019, então duas entradas empatadas mantêm a ordem em que
 * chegaram a ele — e é o `mergeRanking`, abaixo, que decide essa ordem ao
 * colocar a entrada nova no fim da lista antes de ordenar. Sem isso, cada
 * partida reordenaria empates antigos sem nenhum motivo para o jogador ver.
 */
export function compareEntries(a: RankingEntry, b: RankingEntry): number {
  const bucketDiff = bucketOf(a) - bucketOf(b);
  if (bucketDiff !== 0) return bucketDiff;
  return a.temperature - b.temperature;
}

/**
 * A lista depois de uma partida tentar entrar, ou `null` se ela não coube.
 *
 * `limit` tem padrão `balance.rankingSize` e não é fixado no corpo da função:
 * quem chama no fim de uma partida de verdade não precisa saber que esse
 * número existe, e quem testa pode apertar a régua sem editar o balance.json.
 *
 * **A entrada nova entra no fim, antes de ordenar** — é o que faz o empate do
 * `compareEntries` favorecer quem já estava na lista: para desbancar a décima
 * colocada, a partida nova precisa ser estritamente melhor, não apenas igual.
 */
export function mergeRanking(
  stored: readonly RankingEntry[],
  entry: RankingEntry,
  limit: number = balance.rankingSize,
): readonly RankingEntry[] | null {
  const combined = [...stored, entry].sort(compareEntries).slice(0, limit);
  return combined.includes(entry) ? combined : null;
}
