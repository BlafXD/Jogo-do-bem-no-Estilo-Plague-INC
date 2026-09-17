// O cartão central do evento crítico (VIS-07).
//
// **Por que um cartão por cima da partida.** Um evento crítico já parava o
// tempo desde o P7-02, e o aviso ficava no boletim, ao lado do mapa. O
// protótipo aprovado no VIS-01 põe a notícia no centro: o especialista do
// assunto, o selo "▲ Crítico", "O tempo parou", o fato real no cartão creme e
// o botão de retomar. Decidido no chat em 2026-09-17. O cartão continua também
// no boletim, que é onde ele fica depois.
//
// **Ele só existe enquanto a pausa automática vale.** Quem decide isso é o
// main.ts (`autoPaused`), e fechar o cartão **é** retomar o tempo: pelo botão,
// pela barra de espaço ou pelo Esc. Um cartão que só sumisse deixaria o mundo
// parado sem nada na tela explicando por quê — a mesma regra do painel do Modo
// Feira.
//
// **São poucos.** O `docs/BALANCEAMENTO.md` mede uns dez críticos por partida,
// contra 279 eventos: é por isso que só o crítico ganha janela, e o moderado
// continua só no boletim.
//
// Mesma divisão do resto da UI: `criticalCardView` é puro, e só as funções de
// baixo tocam no DOM.

import { ui } from '../data/i18n';
import { eventById, isCritical, startTickOf } from '../engine/events';
import type { GameState } from '../engine/state';
import { yearForTick } from '../engine/tick';
import { eventCast, mountPortrait, renderPortrait, type Appearance } from './characters';
import { trapTab } from './modal';

// --------------------------------------------------------------- a view ---

export type CriticalCardView = {
  /** O evento e o tick em que ele entrou — a mesma chave do boletim. */
  readonly key: string;
  readonly name: string;
  /** "Oceania · 2087". */
  readonly where: string;
  readonly fact: string;
  /** Quem dá a notícia, na pose do cartão crítico. */
  readonly speaker: Appearance | null;
  /** A frase que diz por que o tempo parou e como voltar. */
  readonly notice: string;
};

/**
 * O cartão do crítico mais recente em cena, ou `null` quando não há o que
 * mostrar: o tempo não parou sozinho, ou o evento saiu do catálogo.
 *
 * O mais recente é o que parou o relógio — o main.ts pausa pelo tick mais novo.
 */
export function criticalCardView(state: GameState, autoPaused: boolean): CriticalCardView | null {
  if (!autoPaused) return null;

  let newest: CriticalCardView | null = null;
  let newestTick = -1;

  for (const active of state.activeEvents) {
    const event = eventById(active.eventId);
    if (event === undefined || !isCritical(event)) continue;

    const started = startTickOf(active, state.tick);
    if (started <= newestTick) continue;

    newestTick = started;
    newest = {
      key: `${event.id}@${started}`,
      name: event.name,
      where: ui.events.where(state.regions[active.target].name, String(yearForTick(started))),
      fact: event.fact,
      speaker: eventCast(event.id),
      notice: ui.events.paused(event.name),
    };
  }

  return newest;
}

// ------------------------------------------------------------------ DOM ---

type Slot = 'name' | 'where' | 'fact' | 'notice';

function tagged(tag: 'p' | 'h2' | 'span', className: string, slot?: Slot): HTMLElement {
  const element = document.createElement(tag);
  element.className = className;
  if (slot !== undefined) element.dataset.critical = slot;
  return element;
}

/**
 * Monta o cartão uma vez, escondido.
 *
 * `root` é o fundo escurecido; o cartão dentro dele é um `alertdialog`, que é o
 * papel de uma janela que interrompe para dar uma notícia. O nome dele é o nome
 * do evento, e a descrição é o fato real.
 *
 * **O clique no fundo não fecha**, diferente do painel da árvore: fechar aqui
 * solta o tempo, e isso não pode acontecer por um clique errado ao lado.
 */
export function mountCriticalCard(root: HTMLElement, onResume: () => void): void {
  root.hidden = true;

  const card = document.createElement('section');
  card.className = 'critical__card';
  card.setAttribute('role', 'alertdialog');
  card.setAttribute('aria-modal', 'true');

  const name = tagged('h2', 'critical__name', 'name');
  name.id = `${root.id}-nome`;
  const factText = tagged('span', 'critical__fact-text', 'fact');
  factText.id = `${root.id}-fato`;
  card.setAttribute('aria-labelledby', name.id);
  card.setAttribute('aria-describedby', factText.id);

  // O selo: o ícone é decoração, e a palavra "Crítico" vai escrita (§5).
  const seal = tagged('p', 'critical__seal');
  const icon = tagged('span', 'critical__icon');
  icon.textContent = ui.events.severity.critical.icon;
  icon.setAttribute('aria-hidden', 'true');
  const severity = tagged('span', 'critical__severity');
  severity.textContent = ui.events.severity.critical.label;
  const paused = tagged('span', 'critical__paused');
  paused.textContent = ui.events.critical.paused;
  seal.append(icon, ' ', severity, ' ', paused);

  const fact = tagged('p', 'critical__fact');
  const factLabel = tagged('span', 'critical__fact-label');
  factLabel.textContent = ui.events.critical.fact;
  fact.append(factLabel, ' ', factText);

  const resume = document.createElement('button');
  resume.type = 'button';
  resume.className = 'critical__resume';
  resume.dataset.critical = 'resume';
  resume.title = ui.events.critical.resumeHint;
  const key = tagged('span', 'critical__key');
  key.textContent = ui.events.critical.resumeKey;
  // A tecla desenhada é decoração: a dica do botão diz os atalhos por escrito.
  key.setAttribute('aria-hidden', 'true');
  resume.append(ui.events.critical.resume, ' ', key);
  resume.addEventListener('click', onResume);

  const body = document.createElement('div');
  body.className = 'critical__body';
  body.append(
    seal,
    name,
    tagged('p', 'critical__where', 'where'),
    fact,
    tagged('p', 'critical__notice', 'notice'),
    resume,
  );

  card.append(mountPortrait('critical__portrait', true), body);
  card.addEventListener('keydown', (event) => trapTab(card, event));
  root.replaceChildren(card);
}

function write(root: ParentNode, slot: Slot, text: string): void {
  const target = root.querySelector(`[data-critical="${slot}"]`);
  if (target !== null && target.textContent !== text) target.textContent = text;
}

/** Mostra o cartão com a notícia, ou o esconde. */
export function renderCriticalCard(root: HTMLElement, view: CriticalCardView | null): void {
  root.hidden = view === null;
  if (view === null) return;

  root.dataset.key = view.key;
  write(root, 'name', view.name);
  write(root, 'where', view.where);
  write(root, 'fact', view.fact);
  write(root, 'notice', view.notice);

  const portrait = root.querySelector<HTMLElement>('.critical__portrait');
  if (portrait !== null) renderPortrait(portrait, view.speaker);
}

/** Leva o foco ao "Retomar": é a única ação do cartão. */
export function focusResume(root: ParentNode): void {
  root.querySelector<HTMLElement>('[data-critical="resume"]')?.focus();
}
