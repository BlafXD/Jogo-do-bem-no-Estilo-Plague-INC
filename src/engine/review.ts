// A leitura da partida depois que ela acaba (P7-06).
//
// O `outcome.ts` responde **como** a partida terminou; este arquivo responde
// **o que aconteceu no caminho**. São perguntas diferentes e por isso módulos
// diferentes: o desfecho decide medalha e é consultado a cada tick durante o
// jogo (é ele que para o relógio); isto aqui é lido uma vez, no fim, e não
// participa de nenhuma regra.
//
// Como o outcome.ts, **nada aqui é gravado no estado**: tudo sai da linha do
// tempo que o history.ts já guarda. Um save adulterado não consegue entregar um
// ponto de virada que a curva dele não sustenta.

import { timeline } from './history';
import { type GameState, type Snapshot } from './state';

/**
 * O ano em que a curva de emissões virou — o pico —, ou `null` se ela ainda
 * subia quando a partida acabou.
 *
 * **É o número que dá nome ao jogo**, e é a única coisa que a linha do tempo
 * sabe dizer sobre *quando* o jogador agiu. O `unlockedSkills` guarda o quê,
 * nunca o quando; a curva do mundo guarda o quando sem precisar de campo novo
 * no contrato do docs/GDD.md §3.
 *
 * Devolve o retrato inteiro, e não só o ano, porque quem desenha precisa da
 * temperatura daquele instante para pôr a marca em cima da curva.
 *
 * **O primeiro máximo, não o último.** A pergunta é em que ano a emissão parou
 * de subir, e num platô é a primeira vez que ela chega ao topo que responde
 * isso. Empate exato entre dois anos é impraticável com estes números de ponto
 * flutuante; a regra existe para a resposta ser definida, não porque o caso
 * aconteça.
 *
 * **`null` quando o pico é o último ponto**: uma curva que ainda subia no fim
 * não virou em lugar nenhum, e marcar o último ano seria dizer que virou
 * exatamente quando o mundo acabou.
 */
export function turningPoint(state: GameState): Snapshot | null {
  const curve = timeline(state);

  let peak = 0;
  for (let index = 1; index < curve.length; index++) {
    const here = curve[index];
    const best = curve[peak];
    if (here !== undefined && best !== undefined && here.emissions > best.emissions) {
      peak = index;
    }
  }

  if (peak === curve.length - 1) return null;
  return curve[peak] ?? null;
}
