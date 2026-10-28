// A memória do boletim: por quanto tempo um cartão de evento fica em cena
// (INTER-01).
//
// **O defeito que este arquivo conserta, com número.** O cartão vivia
// `CARD_TICKS = 6` meses, e meses não são segundos: a 1x um tick dura 1,5 s e o
// cartão fica 9 s na tela, mas o Modo Feira roda a 4x, onde o mesmo tick dura
// 0,375 s — **2,25 s de cartão**, com um evento novo caindo a cada 1,9 s (2,355
// eventos por ano, docs/GDD.md §2.5). O boletim da feira era um letreiro que
// trocava antes de qualquer pessoa ler, e foi assim que o pedido do chat
// descreveu os eventos: "muito rápido e sem sentido".
//
// **A janela passou a ser medida em segundos reais** (`eventCardSeconds`, no
// balance.json) e convertida em meses pela velocidade do relógio. A 1x nada
// muda — 8 s dão os mesmos 6 meses de antes, que é o piso. A 4x a conta dá 22
// meses, e o cartão fica os mesmos 8 s que alguém de pé num estande precisa
// para ler três linhas.
//
// **Por que a memória é da UI, e não do engine.** O `ticksRemaining` do
// `ActiveEvent` é a presença do evento **no mundo** — é ele que o mapa usa para
// marcar a região que levou a pancada, e esticá-lo deixaria quatro regiões
// alertadas o tempo todo, apagando justamente o sinal de *onde* doeu. Quanto
// tempo uma notícia fica no boletim é outra pergunta, e é da tela: o §3 do GDD
// diz que o engine não sabe que existe uma tela, e "quanto tempo dá para ler"
// só faz sentido onde existe uma. Mesma divisão do `autoPaused` (controls.ts) e
// dos avisos da Inércia (inertia-notices.ts).
//
// **Não fica salvo**, pela mesma razão do inertia-notices.ts: recarregar a
// partida perde só os cartões que estavam em cena, e guardá-los custaria um
// campo novo no `GameState`.
//
// Este arquivo é **puro**: nada de DOM. Quem desenha é o event-cards.ts.

import { CARD_TICKS, startTickOf } from '../engine/events';
import {
  balance,
  type ActiveEvent,
  type EventToll,
  type GameState,
  type RegionId,
} from '../engine/state';

/**
 * Quantos cartões o boletim mostra de uma vez.
 *
 * **A janela maior pedia um teto.** A 4x ela guarda 22 meses, e 2,355 eventos
 * por ano dão ~4,3 cartões em cena no fim da partida — uma coluna que cresce
 * até empurrar o painel da região para fora da tela. Com 4, o quinto evento
 * empurra o mais velho para fora, e o boletim tem sempre o tamanho de um
 * boletim.
 *
 * **A 1x o teto não aperta nada**: a janela ali são os 6 meses de sempre, em
 * que a chance de cair o quinto evento é remota. O que ele limita é a feira.
 */
export const FEED_LIMIT = 4;

/**
 * Um evento no boletim: o que caiu, onde, e em que mês entrou.
 *
 * **Não é o `ActiveEvent`**, e a diferença é o ponto deste arquivo: o
 * `ticksRemaining` do engine conta a presença do evento no mundo, e aqui o que
 * conta é o `startTick` contra a janela de leitura. Guardar os dois juntos seria
 * guardar dois relógios para o mesmo cartão.
 */
export type FeedCard = {
  /** Identidade na tela: id do evento mais o mês em que entrou. Única por construção. */
  readonly key: string;
  readonly eventId: string;
  readonly target: RegionId;
  readonly startTick: number;
  /**
   * O que o evento cobrou (INTER-02).
   *
   * **Copiado para dentro do boletim, e não lido do `activeEvents` na hora de
   * desenhar.** É o que permite ao cartão continuar dizendo o que o evento
   * cobrou depois de o engine já ter descartado o evento — que é a vida inteira
   * do cartão no Modo Feira, onde a janela da tela é quase quatro vezes a do
   * mundo.
   */
  readonly toll: EventToll;
};

export type EventFeed = {
  /** Do mais velho para o mais novo. Quem ordena para a tela é o event-cards.ts. */
  readonly cards: readonly FeedCard[];
  /**
   * Quantos meses um cartão fica em cena nesta velocidade.
   *
   * Viaja junto com os cartões porque o boletim também abriga os avisos da
   * Inércia (VIS-11), que precisam da **mesma** janela: um aviso que sai de
   * cena em 6 meses enquanto o evento ao lado fica 22 faria a coluna piscar em
   * dois ritmos diferentes.
   */
  readonly hold: number;
};

/** A chave de um cartão. Mesmo formato de antes do INTER-01, para o DOM não notar. */
function keyOf(eventId: string, startTick: number): string {
  return `${eventId}@${startTick}`;
}

/**
 * Quantos meses de cartão equivalem aos `eventCardSeconds` nesta velocidade.
 *
 * O piso é o `CARD_TICKS` do engine: a 1x a conta já dá menos que ele, e deixar
 * a janela da tela **encurtar** abaixo da janela do mundo criaria o caso
 * absurdo de um cartão sair do boletim enquanto o mapa ainda marca a região.
 */
export function cardHoldTicks(speed: number): number {
  const ticks = Math.ceil((balance.eventCardSeconds * speed) / balance.realSecondsPerTick);
  return Math.max(CARD_TICKS, ticks);
}

/** Os cartões que o engine tem em cena agora, na janela dele. */
function cardsOf(state: GameState): readonly FeedCard[] {
  return state.activeEvents.map((active: ActiveEvent): FeedCard => {
    const startTick = startTickOf(active, state.tick);
    return {
      key: keyOf(active.eventId, startTick),
      eventId: active.eventId,
      target: active.target,
      startTick,
      toll: active.toll,
    };
  });
}

/** Um boletim vazio, na janela de 1x. Chamado no começo de cada partida. */
export function createFeed(): EventFeed {
  return { cards: [], hold: CARD_TICKS };
}

/**
 * O boletim como ele seria **sem memória nenhuma**: só o que o engine tem em
 * cena, na janela do engine.
 *
 * É o padrão de quem chama o `eventCardsView` sem passar boletim — os testes de
 * view e qualquer tela que não tenha um relógio por perto. Assim a view continua
 * respondendo a uma pergunta só sobre o `GameState`, como antes do INTER-01.
 */
export function feedFromState(state: GameState): EventFeed {
  return { cards: cardsOf(state), hold: CARD_TICKS };
}

/**
 * O boletim depois de um passo do relógio: com o que entrou, sem o que venceu.
 *
 * **Limitação conhecida, a mesma do `checkAutoPause`:** o relógio do P6-04
 * entrega até doze meses num quadro quando a aba volta do segundo plano, e um
 * evento que apareceu e venceu dentro do mesmo lote nunca chega aqui — quando
 * esta função roda, ele já saiu do `activeEvents`. Consertar exigiria o engine
 * chamar de volta a UI a cada passo, e o §3 não deixa.
 */
export function updateFeed(feed: EventFeed, state: GameState, speed: number): EventFeed {
  const hold = cardHoldTicks(speed);
  const known = new Set(feed.cards.map((card) => card.key));
  const fresh = cardsOf(state).filter((card) => !known.has(card.key));

  const cards = [...feed.cards, ...fresh]
    .filter((card) => state.tick - card.startTick < hold)
    .sort((a, b) => a.startTick - b.startTick)
    .slice(-FEED_LIMIT);

  return { cards, hold };
}

/**
 * As regiões com cartão no boletim — o que o mapa marca com o chip de evento.
 *
 * **O chip acompanha o cartão, e não o `activeEvents`.** O tutorial promete que
 * "o mapa marca a região onde doeu", e na feira o mapa cumpria essa promessa por
 * 2,25 s: quem terminasse de ler o cartão e olhasse para o mundo não achava mais
 * nada. Com a janela do boletim, a notícia e o lugar dela saem de cena juntos.
 */
export function feedRegions(feed: EventFeed): ReadonlySet<RegionId> {
  return new Set(feed.cards.map((card) => card.target));
}
