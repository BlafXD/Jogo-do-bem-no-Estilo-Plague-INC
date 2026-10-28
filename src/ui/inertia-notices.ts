// O aviso da Inércia no boletim (VIS-11, 2ª entrega).
//
// **Até aqui a Inércia agia em silêncio.** A cada seis meses ela espalha
// desinformação ou puxa subsídios (docs/GDD.md §2.6), e o jogador só via o
// número dela subir no HUD. O aviso é um cartão no boletim, com a silhueta
// apontando, quando ela passa de um dos níveis do `balance.json` subindo.
//
// **Por que por nível, e não a cada vez que ela age.** São 150 turnos por
// partida — a 4x, um a cada dois segundos. Um cartão por turno enterraria os
// eventos, que são o que o boletim existe para mostrar. Três níveis dão três
// avisos por subida, e cada um diz que a força dela mudou de patamar.
//
// **Por que não fica salvo.** Guardar o aviso exigiria um campo novo no
// `GameState` ou no `Snapshot`, e um `SAVE_VERSION` novo — o contrato do
// docs/GDD.md §3. Para um cartão que sai de cena em seis meses, não compensa:
// recarregar a partida perde só os avisos que estavam no boletim. A lista mora
// na memória do main.ts, como o `autoPaused`.
//
// Este arquivo é **puro**: nada de DOM. Quem transforma o aviso em cartão é o
// event-cards.ts, que já desenha o boletim.

import { CARD_TICKS } from '../engine/events';
import { balance, type GameState } from '../engine/state';

/** A Inércia passou de `level` no mês `tick`. */
export type InertiaNotice = {
  readonly level: number;
  readonly tick: number;
};

/**
 * O nível mais alto que a Inércia passou **subindo** entre dois valores, ou
 * `null` se não passou nenhum.
 *
 * Só para cima: a contenção derruba a Inércia, e descer de 50 para 30 não é
 * notícia. Se ela voltar a subir e passar de 50 de novo, aí é — e o aviso volta.
 *
 * O mais alto, e não um por nível: o relógio entrega até doze meses num
 * quadro quando a aba volta do segundo plano (main.ts), e dois cartões no
 * mesmo mês diriam a mesma coisa duas vezes.
 */
export function crossedLevel(
  before: number,
  after: number,
  levels: readonly number[] = balance.inertiaNoticeLevels,
): number | null {
  let crossed: number | null = null;

  for (const level of levels) {
    if (before < level && after >= level && (crossed === null || level > crossed)) crossed = level;
  }

  return crossed;
}

/**
 * Os avisos ainda em cena no mês `tick`: os que entraram há menos de `hold`
 * meses, o mesmo tempo que um evento fica no boletim.
 *
 * `hold` é a janela do boletim (`EventFeed.hold`, INTER-01), que depende da
 * velocidade do relógio — a 4x do Modo Feira ela vale 22 meses, não 6. O padrão
 * é o `CARD_TICKS` do engine, que é o que esta função usava sozinha antes do
 * INTER-01: um aviso saindo de cena em 6 meses enquanto o evento ao lado fica 22
 * faria a mesma coluna piscar em dois ritmos.
 */
export function noticesInScene(
  notices: readonly InertiaNotice[],
  tick: number,
  hold: number = CARD_TICKS,
): readonly InertiaNotice[] {
  return notices.filter((notice) => tick >= notice.tick && tick - notice.tick < hold);
}

/**
 * A lista depois de um passo do relógio: com o aviso novo, se a Inércia passou
 * de um nível, e sem os que já saíram de cena.
 */
export function updateNotices(
  notices: readonly InertiaNotice[],
  before: GameState,
  after: GameState,
  hold: number = CARD_TICKS,
): readonly InertiaNotice[] {
  const level = crossedLevel(before.inertia, after.inertia);
  const next = level === null ? notices : [...notices, { level, tick: after.tick }];
  return noticesInScene(next, after.tick, hold);
}
