// As sinergias no painel da árvore (INTER-08). A regra está no
// src/engine/skills.ts e os dados no src/data/synergies.json.
//
// **Por que elas precisam de uma lista na tela.** Um bônus que o jogador não
// sabe que existe não muda decisão nenhuma — ele só aparece de surpresa e some.
// A lista diz as três, o que cada uma pede, o que cada uma dá e quanto falta:
// é o que transforma "ganhei um bônus" em "vou atrás daquele bônus". Era o
// pedido do chat em 2026-10-28, de novo: "o jogador precisa entender o que está
// acontecendo".
//
// **Onde ela mora.** Na coluna do painel da árvore, embaixo da contenção, pela
// mesma razão que a contenção mora ali (VIS-05): é uma decisão de onde gastar
// PAC, e fica ao lado da compra porque compete com ela. A diferença é que a
// sinergia não tem botão — ela não se compra, se cumpre.
//
// Mesma divisão do resto da UI: `synergyView` é puro, e só as duas funções de
// baixo tocam no DOM.

import { ui } from '../data/i18n';
import { hasSynergy, synergyProgress } from '../engine/skills';
import { SKILL_BRANCHES, synergies, type GameState } from '../engine/state';
import { prependIcon } from './icons';

// --------------------------------------------------------------- a view ---

export type SynergyRowView = {
  readonly id: string;
  readonly name: string;
  /** O que ela dá, em uma frase — a `description` do synergies.json. */
  readonly description: string;
  /** "1 nó em cada um dos 5 ramos" — a condição, escrita. */
  readonly requirement: string;
  /** "3 de 5 ramos" — o progresso. Vazio quando ela já está fechada. */
  readonly progress: string;
  readonly done: boolean;
  /** Ícone **mais** rótulo, nunca a cor sozinha (§5 do GDD). */
  readonly statusIcon: string;
  readonly statusLabel: string;
};

export type SynergyView = {
  readonly rows: readonly SynergyRowView[];
  /** "1 de 3" — quantas já estão fechadas, para o título da seção. */
  readonly count: string;
};

export function synergyView(state: GameState): SynergyView {
  const rows = synergies.map((synergy): SynergyRowView => {
    const done = hasSynergy(state, synergy);
    const badge = done ? ui.synergy.status.done : ui.synergy.status.pending;

    return {
      id: synergy.id,
      name: synergy.name,
      description: synergy.description,
      requirement: ui.synergy.requirement(synergy.nodesPerBranch, SKILL_BRANCHES.length),
      progress: done
        ? ''
        : ui.synergy.progress(synergyProgress(state, synergy), SKILL_BRANCHES.length),
      done,
      statusIcon: badge.icon,
      statusLabel: badge.label,
    };
  });

  return {
    rows,
    count: ui.synergy.count(rows.filter((row) => row.done).length, rows.length),
  };
}

// ------------------------------------------------------------------ DOM ---

function span(className: string, text: string): HTMLSpanElement {
  const element = document.createElement('span');
  element.className = className;
  element.textContent = text;
  return element;
}

function rowElement(row: SynergyRowView): HTMLLIElement {
  const item = document.createElement('li');
  item.className = 'synergy__row';
  item.dataset.synergy = row.id;
  item.dataset.done = String(row.done);

  const head = document.createElement('p');
  head.className = 'synergy__head';
  // O ícone é decoração: o rótulo do estado vai escrito ao lado dele.
  const icon = span('synergy__status-icon', row.statusIcon);
  icon.setAttribute('aria-hidden', 'true');
  head.append(icon, span('synergy__status', row.statusLabel), span('synergy__name', row.name));

  const requirement = document.createElement('p');
  requirement.className = 'synergy__requirement';
  requirement.textContent = row.requirement;
  if (row.progress !== '') requirement.append(' · ', span('synergy__progress', row.progress));

  const description = document.createElement('p');
  description.className = 'synergy__description';
  description.textContent = row.description;

  item.append(head, requirement, description);
  return item;
}

/** Monta a casca uma vez: o título com a contagem e a lista. */
export function mountSynergy(root: Element): void {
  root.setAttribute('aria-label', ui.synergy.label);

  const title = document.createElement('h3');
  title.className = 'synergy__title';
  title.dataset.synergyPanel = 'title';
  prependIcon(title, 'globe', 'synergy__icon');

  const intro = document.createElement('p');
  intro.className = 'synergy__intro';
  intro.textContent = ui.synergy.intro;

  const list = document.createElement('ul');
  list.className = 'synergy__list';
  list.dataset.synergyPanel = 'list';

  root.replaceChildren(title, intro, list);
}

/**
 * Escreve a lista.
 *
 * Reconstrói sempre, e aqui isso é seguro: **nada nesta seção é focável.** Ela
 * não tem botão — a sinergia não se compra, se cumpre —, então um
 * `replaceChildren` por mês não arranca o foco de ninguém. É a mesma razão que o
 * event-cards.ts registra para o boletim.
 */
export function renderSynergy(root: Element, view: SynergyView): void {
  const title = root.querySelector<HTMLElement>('[data-synergy-panel="title"]');
  if (title !== null) {
    const text = `${ui.synergy.label} · ${view.count}`;
    if (title.lastChild?.textContent !== text) {
      // O ícone montado pelo `prependIcon` fica; só o texto ao lado dele muda.
      const icon = title.querySelector('svg.icon');
      title.replaceChildren(...(icon === null ? [] : [icon]), document.createTextNode(text));
    }
  }

  const list = root.querySelector<HTMLElement>('[data-synergy-panel="list"]');
  if (list === null) return;

  list.replaceChildren(...view.rows.map(rowElement));
}
