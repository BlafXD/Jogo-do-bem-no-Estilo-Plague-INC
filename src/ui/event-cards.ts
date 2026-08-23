// Os cartões de evento climático na tela (P7-02).
//
// Mesma divisão do hud.ts, do controls.ts, do tree.ts e do outcome.ts:
// `eventCardsView` é **puro** — entra GameState, saem os cartões já com o texto
// pronto — e só `mountEventCards` e `renderEventCards` tocam no DOM. O
// `document` nunca aparece no topo do módulo.
//
// **Por que este arquivo existe.** Desde o P7-01 o sorteio funciona, o apoio
// cai, o PAC some, e nada na tela diz de onde veio a pancada. O PROGRESSO.md do
// dia registrou isso como "a pior versão possível desta mecânica": o jogador
// sente o efeito sem saber o motivo, e as dez fontes científicas que custaram a
// maior parte daquela tarefa não chegam a ninguém. O cartão é o que as entrega.
//
// **Nenhuma regra de jogo é reimplementada aqui.** Quem diz que um evento é
// grave é o `isCritical` do engine, quem diz quando ele entrou é o
// `startTickOf`, e quem já aplicou o estrago foi o `applyEvent`. Esta camada só
// escolhe a frase — a mesma separação que o outcome.ts registra sobre o §2.7.
//
// **O que este cartão deliberadamente não mostra:** quanto de apoio e de
// economia o evento tirou da região. O dano depende da resiliência **no instante
// da pancada**, e a resiliência muda depois — recalcular aqui mostraria um
// número diferente do que foi cobrado, que é pior do que não mostrar nenhum.
// Guardar o valor aplicado exigiria campo novo no `ActiveEvent` e um
// `SAVE_VERSION` novo; ficou decidido no chat que isso é do P7-04.

import { ui } from '../data/i18n';
import { eventById, isCritical, startTickOf } from '../engine/events';
import type { ActiveEvent, GameState } from '../engine/state';
import { yearForTick } from '../engine/tick';

// --------------------------------------------------------------- a view ---

export const EVENT_SEVERITIES = ['critical', 'moderate'] as const;

export type EventSeverity = (typeof EVENT_SEVERITIES)[number];

export type EventCardView = {
  /**
   * Identidade do cartão na tela: id do evento mais o tick em que ele entrou.
   *
   * É única por construção — o `advanceEvents` sorteia no máximo um evento por
   * tick —, e é o que permite ao `renderEventCards` reconstruir a lista **só
   * quando ela muda de verdade**, em vez de a cada mês.
   */
  readonly key: string;
  readonly name: string;
  /** "Oceania · 2087" — onde bateu e quando. */
  readonly where: string;
  /** O fato real, uma frase. Vem do events.json, com fonte em docs/CIENCIA.md. */
  readonly fact: string;
  readonly severity: EventSeverity;
  readonly severityIcon: string;
  readonly severityLabel: string;
};

export type EventCardsView = {
  /** Do mais recente para o mais antigo. No máximo `CARD_TICKS` cartões. */
  readonly cards: readonly EventCardView[];
  /** O aviso da auto-pausa, ou vazio quando o tempo está correndo. */
  readonly notice: string;
};

/**
 * Um cartão, ou `null` quando o id não existe mais no catálogo.
 *
 * O `null` cobre um caso real e chato: um save gravado antes de alguém renomear
 * um evento no `events.json`. Um cartão sem nome e sem fato é pior que cartão
 * nenhum — e a alternativa, recusar o save inteiro, jogaria fora uma partida de
 * vinte minutos por causa de uma linha de vitrine.
 */
function cardFor(state: GameState, active: ActiveEvent): EventCardView | null {
  const event = eventById(active.eventId);
  if (event === undefined) return null;

  const started = startTickOf(active, state.tick);
  const severity: EventSeverity = isCritical(event) ? 'critical' : 'moderate';
  const badge = ui.events.severity[severity];

  return {
    key: `${event.id}@${started}`,
    name: event.name,
    where: ui.events.where(state.regions[active.target].name, String(yearForTick(started))),
    fact: event.fact,
    severity,
    severityIcon: badge.icon,
    severityLabel: badge.label,
  };
}

/**
 * O tick do evento crítico mais recente em cena, ou `null` se não há nenhum.
 *
 * Mora na UI, e não no engine, porque pausar é decisão de quem assiste: o §3 diz
 * que o engine não sabe que existe uma tela, e "parar o relógio" só faz sentido
 * onde existe uma. O engine contribui com a classificação (`isCritical`) e com a
 * idade (`startTickOf`); a conclusão é daqui.
 *
 * Devolve o **tick**, e não um booleano, porque o main.ts precisa distinguir um
 * evento crítico novo de um que já pausou o jogo uma vez. Um booleano
 * repausaria o jogo a cada quadro enquanto o cartão estivesse em cena.
 */
export function newestCriticalTick(state: GameState): number | null {
  let newest: number | null = null;

  for (const active of state.activeEvents) {
    const event = eventById(active.eventId);
    if (event === undefined || !isCritical(event)) continue;

    const started = startTickOf(active, state.tick);
    if (newest === null || started > newest) newest = started;
  }

  return newest;
}

/**
 * Os cartões em cena, do mais novo para o mais velho.
 *
 * A ordem sai do `ticksRemaining` — quanto maior, mais recente — e não da ordem
 * do array. As duas coincidem hoje (o `applyEvent` sempre acrescenta no fim),
 * mas depender disso seria depender de um detalhe interno de outro módulo: no
 * dia em que o `advanceEvents` reordenasse a lista, os cartões apareceriam
 * embaralhados sem nada quebrar. Empate é impossível, porque só entra um evento
 * por tick.
 *
 * `autoPaused` vem do main.ts em vez de ser deduzido aqui: pausa é estado da
 * UI, e o controls.ts registra por que ela não mora no GameState.
 */
export function eventCardsView(state: GameState, autoPaused = false): EventCardsView {
  const cards = [...state.activeEvents]
    .sort((a, b) => b.ticksRemaining - a.ticksRemaining)
    .map((active) => cardFor(state, active))
    .filter((card): card is EventCardView => card !== null);

  // O crítico mais recente é o que parou o relógio — o main.ts pausa pelo tick
  // mais novo, que é o primeiro crítico desta lista já ordenada.
  const culprit = cards.find((card) => card.severity === 'critical');
  const notice = autoPaused && culprit !== undefined ? ui.events.paused(culprit.name) : '';

  return { cards, notice };
}

// ------------------------------------------------------------------ DOM ---

function span(className: string, text?: string): HTMLSpanElement {
  const element = document.createElement('span');
  element.className = className;
  if (text !== undefined) element.textContent = text;
  return element;
}

function paragraph(className: string, text: string): HTMLParagraphElement {
  const element = document.createElement('p');
  element.className = className;
  element.textContent = text;
  return element;
}

function cardElement(card: EventCardView): HTMLLIElement {
  const item = document.createElement('li');
  item.className = 'events__card';
  item.dataset.severity = card.severity;
  item.dataset.key = card.key;

  const head = document.createElement('p');
  head.className = 'events__head';

  // O ícone é decoração: quem carrega a gravidade para o leitor de tela é o
  // rótulo escrito ao lado. Sem isto, "▲ Crítico" seria anunciado duas vezes —
  // mesma razão do ícone do cartão de fim.
  const icon = span('events__icon', card.severityIcon);
  icon.setAttribute('aria-hidden', 'true');

  head.append(icon, span('events__severity', card.severityLabel), span('events__name', card.name));

  item.append(head, paragraph('events__where', card.where), paragraph('events__fact', card.fact));
  return item;
}

/**
 * Monta a casca uma vez, escondida, na carga da página.
 *
 * Uma seção dentro do `#app`, e não um modal — mesma decisão do outcome.ts, e
 * aqui ela é ainda mais forte: numa partida inteira caem **279 eventos**
 * (medido, `docs/BALANCEAMENTO.md`). Um modal por evento seria um jogo que só
 * faz fechar caixa de diálogo.
 *
 * **Nada aqui é focável, de propósito.** Sem botão dentro, a lista pode ser
 * reconstruída sem arrancar o foco do teclado de ninguém — que é justamente o
 * que o tree.ts precisa evitar e por isso atualiza em vez de recriar. Quem
 * quiser retomar o tempo usa o botão que já existe na barra de controle, a
 * poucos centímetros daqui; um segundo botão de retomar seria dois lugares para
 * a mesma ação divergir.
 */
export function mountEventCards(root: Element): void {
  root.setAttribute('aria-label', ui.events.label);

  const notice = document.createElement('p');
  notice.className = 'events__notice';
  notice.dataset.events = 'notice';
  // `polite` avisa que o tempo parou sem atropelar o que estiver sendo lido.
  //
  // **Só a auto-pausa é anunciada, e não cada evento.** Anunciar os 279 de uma
  // partida deixaria a tela impossível de usar com leitor de tela; os críticos
  // são ~10. Os moderados continuam na lista, dentro de uma seção com rótulo,
  // para quem for lê-los. A passagem de acessibilidade do P8-04 é quem confere
  // se essa troca se sustenta com alguém que use leitor de tela de verdade.
  notice.setAttribute('aria-live', 'polite');

  const list = document.createElement('ol');
  list.className = 'events__list';
  list.dataset.events = 'list';
  list.title = ui.events.hint;

  root.replaceChildren(notice, list);
  renderEventCards(root, { cards: [], notice: '' });
}

/** Os `data-key` que estão hoje no DOM, na ordem em que aparecem. */
function shownKeys(list: ParentNode): readonly (string | undefined)[] {
  return Array.from(list.querySelectorAll<HTMLElement>('[data-key]'), (item) => item.dataset.key);
}

/**
 * Escreve os cartões na tela.
 *
 * **Reconstrói a lista, mas só quando ela muda.** A tela é redesenhada a cada
 * mês de jogo — 1,5 s a 1x — e na maioria deles nenhum evento entra nem sai. Sem
 * a comparação de chaves, uma reconstrução por mês apagaria a seleção de texto
 * de quem estivesse no meio de uma frase, a cada segundo e meio. Com ela, o DOM
 * fica intocado nos meses parados.
 *
 * Reconstruir (em vez de atualizar cartão a cartão, como o tree.ts) é seguro
 * aqui justamente porque nada nestes cartões é focável.
 */
export function renderEventCards(root: Element, view: EventCardsView): void {
  // `hidden` na seção inteira: nos primeiros anos não cai evento nenhum, e uma
  // caixa vazia com título ocupando o topo da tela seria ruído.
  if (root instanceof HTMLElement) root.hidden = view.cards.length === 0 && view.notice === '';

  const notice = root.querySelector<HTMLElement>('[data-events="notice"]');
  if (notice !== null) {
    notice.textContent = view.notice;
    notice.hidden = view.notice === '';
  }

  const list = root.querySelector<HTMLElement>('[data-events="list"]');
  if (list === null) return;

  const shown = shownKeys(list);
  const wanted = view.cards.map((card) => card.key);
  const same = shown.length === wanted.length && shown.every((key, i) => key === wanted[i]);
  if (same) return;

  list.replaceChildren(...view.cards.map(cardElement));
}
