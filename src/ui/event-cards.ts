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
import { balance, type EventToll, type GameState } from '../engine/state';
import { yearForTick } from '../engine/tick';
import { eventCast, momentCast, mountAvatar, personText, type Appearance } from './characters';
import { feedFromState, type EventFeed, type FeedCard } from './event-feed';
import { noticesInScene, type InertiaNotice } from './inertia-notices';

// --------------------------------------------------------------- a view ---

/**
 * O selo de cada cartão. O terceiro não é gravidade de evento: é o aviso da
 * Inércia (VIS-11), que mora no mesmo boletim e precisa do próprio selo — ícone
 * e palavra, como os outros dois (docs/GDD.md §5).
 */
export const EVENT_SEVERITIES = ['critical', 'moderate', 'inertia'] as const;

/** Uma casa decimal: o apoio e a economia que o evento cobrou (INTER-02). */
const tenths = new Intl.NumberFormat('pt-BR', {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});

/** PAC é inteiro, como em toda a árvore. */
const units = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 0 });

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
  /**
   * "Cobrou: 3,2 de apoio · 8 PAC" — o que o evento levou (INTER-02).
   *
   * Vazio quando não houve pedágio nenhum: o aviso da Inércia não cobra por este
   * caminho (ele age no `inertia.ts`), e um evento pode pegar uma região já em
   * zero e um caixa vazio.
   */
  readonly toll: string;
  /** O fato real, uma frase. Vem do events.json, com fonte em docs/CIENCIA.md. */
  readonly fact: string;
  /**
   * Quem deu a notícia (VIS-07): o especialista do assunto, pelo
   * src/data/characters.json. `null` para um evento sem especialista.
   */
  readonly speaker: Appearance | null;
  /** "por Ricardo", ou vazio quando não há especialista. */
  readonly by: string;
  readonly severity: EventSeverity;
  readonly severityIcon: string;
  readonly severityLabel: string;
};

export type EventCardsView = {
  /** Do mais recente para o mais antigo. No máximo `FEED_LIMIT` cartões (INTER-01). */
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
/**
 * O pedágio em uma frase, ou vazio quando o evento não levou nada (INTER-02).
 *
 * **Uma casa decimal no apoio e na economia, PAC inteiro.** O apoio vai de 0 a
 * 100 e um evento cobra frações dele — arredondar para inteiro mostraria "0 de
 * apoio" numa pancada de 0,4, que é pequena mas não é nada. O PAC é contado em
 * unidades na árvore inteira, então a casa decimal ali seria precisão falsa.
 *
 * **Uma parcela zerada não entra na frase**, e isso acontece de verdade: um
 * evento que pega o caixa vazio cobra 0 de PAC, e escrever "0 PAC" ao lado de
 * "3,2 de apoio" faria o jogador procurar um dinheiro que nunca saiu.
 */
function tollLine(toll: EventToll): string {
  const parts: string[] = [];

  if (toll.support > 0) parts.push(ui.events.toll.support(tenths.format(toll.support)));
  if (toll.economy > 0) parts.push(ui.events.toll.economy(tenths.format(toll.economy)));
  if (toll.points >= 1) parts.push(ui.events.toll.points(units.format(toll.points)));

  return parts.length === 0 ? '' : ui.events.toll.line(parts);
}

function cardFor(state: GameState, entry: FeedCard): EventCardView | null {
  const event = eventById(entry.eventId);
  if (event === undefined) return null;

  const started = entry.startTick;
  const severity: EventSeverity = isCritical(event) ? 'critical' : 'moderate';
  const badge = ui.events.severity[severity];
  const speaker = eventCast(event.id);

  return {
    key: entry.key,
    name: event.name,
    where: ui.events.where(state.regions[entry.target].name, String(yearForTick(started))),
    toll: tollLine(entry.toll),
    fact: event.fact,
    speaker,
    by: speaker === null ? '' : ui.cast.by(personText(speaker.person).short),
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
 * O aviso da Inércia como cartão (VIS-11): a silhueta apontando, o nível que
 * ela passou e o que isso quer dizer. Sem "por", porque ela não é da equipe.
 */
function noticeCard(notice: InertiaNotice): EventCardView {
  const badge = ui.events.severity.inertia;

  return {
    key: `inercia-${notice.level}@${notice.tick}`,
    name: ui.events.inertia.name(String(notice.level)),
    where: ui.events.where(ui.events.inertia.where, String(yearForTick(notice.tick))),
    // A Inércia não cobra por aqui: ela age no inertia.ts, por cima das oito
    // regiões, e não tem um pedágio de uma pancada para mostrar.
    toll: '',
    fact: ui.events.inertia.fact(String(balance.inertiaActionEveryTicks), String(notice.level)),
    speaker: momentCast('inertia-notice'),
    by: '',
    severity: 'inertia',
    severityIcon: badge.icon,
    severityLabel: badge.label,
  };
}

/**
 * Os cartões em cena, do mais novo para o mais velho.
 *
 * A ordem sai do mês em que cada um entrou — o `startTickOf` do evento, o
 * `tick` do aviso — e não da ordem do array. As duas coincidem hoje (o
 * `applyEvent` sempre acrescenta no fim), mas depender disso seria depender de
 * um detalhe interno de outro módulo: no dia em que o `advanceEvents`
 * reordenasse a lista, os cartões apareceriam embaralhados sem nada quebrar.
 * Só entra um evento por mês; um aviso da Inércia no mesmo mês vem antes dele.
 *
 * `autoPaused` e `notices` vêm do main.ts em vez de serem deduzidos aqui:
 * os dois são estado da UI, e o controls.ts registra por que a pausa não mora
 * no GameState. O inertia-notices.ts diz o mesmo dos avisos.
 *
 * **O `feed` é a janela de leitura (INTER-01).** Ele diz quais cartões estão em
 * cena e por quantos meses — uma janela medida em segundos reais, que a 4x do
 * Modo Feira vale muito mais que os 6 meses do engine. Omitido, a view cai no
 * `feedFromState`: exatamente o que ela fazia antes do INTER-01, lendo o
 * `activeEvents` na janela do engine. Os avisos da Inércia usam a mesma janela,
 * e é por isso que ela viaja dentro do boletim em vez de ser um argumento solto.
 */
export function eventCardsView(
  state: GameState,
  autoPaused = false,
  notices: readonly InertiaNotice[] = [],
  feed: EventFeed = feedFromState(state),
): EventCardsView {
  const events = feed.cards.flatMap((entry) => {
    const card = cardFor(state, entry);
    return card === null ? [] : [{ tick: entry.startTick, rank: 1, card }];
  });
  const warnings = noticesInScene(notices, state.tick, feed.hold).map((notice) => ({
    tick: notice.tick,
    rank: 0,
    card: noticeCard(notice),
  }));

  const cards = [...events, ...warnings]
    .sort((a, b) => b.tick - a.tick || a.rank - b.rank)
    .map((entry) => entry.card);

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

function cardElement(card: EventCardView, entering: boolean): HTMLLIElement {
  const item = document.createElement('li');
  item.className = 'events__card';
  item.dataset.severity = card.severity;
  item.dataset.key = card.key;
  // Só o cartão que acabou de entrar anima (REF-03). A lista é reconstruída
  // inteira quando muda, mas os que já estavam em cena voltam sem `data-enter` —
  // reaparecem no lugar, sem piscar, e só o novo desliza para dentro.
  if (entering) item.dataset.enter = '';

  const head = document.createElement('p');
  head.className = 'events__head';

  // O ícone é decoração: quem carrega a gravidade para o leitor de tela é o
  // rótulo escrito ao lado. Sem isto, "▲ Crítico" seria anunciado duas vezes —
  // mesma razão do ícone do cartão de fim.
  const icon = span('events__icon', card.severityIcon);
  icon.setAttribute('aria-hidden', 'true');

  head.append(icon, span('events__severity', card.severityLabel), span('events__name', card.name));

  const where = paragraph('events__where', card.where);
  if (card.by !== '') where.append(' · ', span('events__by', card.by));

  // O avatar é decoração: o nome de quem deu a notícia vai escrito acima.
  if (card.speaker !== null) item.append(mountAvatar(card.speaker));
  item.append(head, where);
  // O pedágio entre o "onde" e o fato real (INTER-02): primeiro o que
  // aconteceu com a partida, depois o que isso é no mundo. A ordem inversa
  // faria o jogador ler ciência antes de saber que perdeu apoio.
  if (card.toll !== '') item.append(paragraph('events__toll', card.toll));
  item.append(paragraph('events__fact', card.fact));
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
 * quiser retomar o tempo usa a barra de controle, ou o "Retomar" do cartão
 * central do evento crítico (critical-card.ts, VIS-07), que aparece por cima da
 * partida enquanto o tempo está parado.
 */
export function mountEventCards(root: Element): void {
  root.setAttribute('aria-label', ui.events.label);

  // O título escrito (VIS-04). Na coluna ao lado do mapa, a seção divide a
  // altura com o painel da região, e um bloco de cartões sem nome pareceria
  // continuação do painel. O texto é o mesmo do rótulo da seção.
  const title = document.createElement('h2');
  title.className = 'events__title';
  title.textContent = ui.events.label;

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

  root.replaceChildren(title, notice, list);
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

  // As chaves que ainda não estavam no boletim: só elas entram animando.
  const fresh = new Set(wanted.filter((key) => !shown.includes(key)));
  list.replaceChildren(...view.cards.map((card) => cardElement(card, fresh.has(card.key))));
}
