// A escolha do especialista, entre o título e a partida (REF-08).
//
// Mesma divisão do resto da UI: `selectView` é **puro** — entra quem está
// escolhido, saem os cartões em texto — e só `mountSelect`/`renderSelect` tocam
// no DOM.
//
// **Quem é selecionável não está escrito aqui, é derivado:** quem é jogável
// (`CHARACTER_IDS`, no engine) **e** tem retrato (`PERSON_IDS`, no
// characters.ts). Hoje isso dá quatro — a Marina Costa entrou na camada jogável
// no REF-07, mas a arte dela não chegou, então ela não aparece. Quando o
// `[D-Design]` entregar as poses e ela entrar no `PERSON_IDS`, ela aparece nesta
// tela **sem nenhuma linha de código nova**. Era a alternativa a uma lista de
// quatro nomes escrita à mão, que alguém teria que lembrar de editar.
//
// **O bônus de cada um sai dos números, não de uma frase escrita.** O
// `character-buffs.json` é a fonte: "custam 10% menos" é o `costDiscount` lido e
// formatado na hora. É a regra 8 da FORMA-DE-TRABALHO levada a sério — quando o
// `REF-09` afinar os buffs, esta tela passa a dizer os valores novos sozinha, em
// vez de mentir até alguém notar.
//
// **Por que a escolha é uma tela, e não um menu no título.** A tela de título já
// carrega o ODS, o nome, o pitch, três botões, a equipe em poses e as listras de
// uma partida sem compras (VIS-08). Um quinto bloco ali, com quatro cartões
// clicáveis e o texto de quatro bônus, afogaria a abertura — e o §5 exige que o
// jogo seja legível de pé, de longe, num estande.

import { ui } from '../data/i18n';
import {
  CHARACTER_IDS,
  characterBuffs,
  type CharacterBuff,
  type CharacterId,
} from '../engine/state';
import {
  PERSON_IDS,
  cast,
  mountPortrait,
  personText,
  renderPortrait,
  type Appearance,
  type PersonId,
} from './characters';
import { prependIcon, writeLabel } from './icons';

// --------------------------------------------------------------- quem entra ---

/**
 * Um especialista que o jogador pode escolher: jogável **e** com retrato.
 *
 * O `Extract` é o que faz o `tsc` cobrar as duas metades. Um id que exista só na
 * camada jogável — a Marina, hoje — não é desta união, e o compilador recusa
 * qualquer tentativa de pô-lo num cartão sem a arte dele existir.
 */
export type SelectableId = Extract<CharacterId, PersonId>;

function isSelectable(id: CharacterId): id is SelectableId {
  return (PERSON_IDS as readonly string[]).includes(id);
}

/**
 * Os especialistas da tela, na ordem do `CHARACTER_IDS` — que é a ordem dos
 * ramos do `docs/GDD.md §2.4`, e não a ordem em que a arte chegou.
 */
export const SELECTABLE_IDS: readonly SelectableId[] = CHARACTER_IDS.filter(isSelectable);

/**
 * A pose de cada um, reaproveitada da tela de título.
 *
 * Não há campo novo no `characters.json` de propósito: esta tela mostra a mesma
 * equipe nas mesmas poses da abertura, e um segundo manifesto só criaria o risco
 * de as duas telas discordarem sobre a cara de quem. O `[D-Design]` troca a pose
 * num lugar e as duas seguem.
 */
function poseOf(person: SelectableId): Appearance {
  const fromTitle = cast.title.find((who) => who.person === person);
  if (fromTitle !== undefined) return fromTitle;

  // Rede de segurança para um manifesto que não cite a pessoa no título: a
  // primeira pose dela. O `parseCast` já cobra que toda pose exista em arquivo.
  const first = cast.poses[person][0];
  return { person, pose: first ?? '' };
}

// ----------------------------------------------------------------- a view ---

/**
 * O percentual de um buff como o jogador o lê.
 *
 * Mora aqui, e não no format.ts, pela razão que aquele arquivo registra: ele é
 * para formatação que **mais de uma tela** escreve igual, e por enquanto só esta
 * escreve percentual de bônus. Se o `REF-09` levar o número para o HUD ou para a
 * árvore, ele se muda para lá.
 */
const percentFormat = new Intl.NumberFormat('pt-BR', {
  style: 'percent',
  maximumFractionDigits: 0,
});

/**
 * As frases do bônus de um personagem, derivadas dos números do buff.
 *
 * Um campo em zero **não gera frase**: o `startResilience` da Ana Luiza é 0, e
 * "começa com 0 de resiliência a mais" seria ruído com cara de vantagem. O
 * desconto de custo é o único que todos têm, e mesmo ele é condicionado — se o
 * `REF-09` zerar o de alguém, a linha some em vez de dizer "0% menos".
 */
export function bonusLines(buff: CharacterBuff): readonly string[] {
  const text = ui.select.bonus;
  const branch = ui.tree.branches[buff.branch];
  const lines: string[] = [];

  if (buff.costDiscount > 0) {
    lines.push(text.cost(percentFormat.format(buff.costDiscount), branch));
  }
  if (buff.emissionBoost > 0) {
    lines.push(text.emission(percentFormat.format(buff.emissionBoost), branch));
  }
  if (buff.startResilience > 0) {
    lines.push(text.resilience(String(buff.startResilience)));
  }
  if (buff.pointsPerYearBonus > 0) {
    lines.push(text.points(String(buff.pointsPerYearBonus)));
  }

  return lines;
}

export type SelectCard = {
  readonly id: SelectableId;
  /** A pose, para o retrato. */
  readonly who: Appearance;
  readonly name: string;
  /** O cargo da ficha (docs/PERSONAGENS.md) — a profissão, não o ramo. */
  readonly role: string;
  /** O ramo da árvore que o bônus dele cobre, por extenso. */
  readonly branch: string;
  /** O nome do ramo em inglês, que é também o nome do ícone dele. */
  readonly branchIcon: CharacterBuff['branch'];
  readonly bonus: readonly string[];
  readonly chosen: boolean;
};

export type SelectView = {
  readonly heading: string;
  readonly lead: string;
  readonly cards: readonly SelectCard[];
  /** O rótulo do botão de começar — na Feira ele diz "demonstração". */
  readonly startLabel: string;
  /** Há escolha feita. Com `false`, o botão fica `aria-disabled`, não `disabled`. */
  readonly canStart: boolean;
  /**
   * A linha embaixo do botão: o que falta, ou quem vai dirigir.
   *
   * Escrita **sempre**, e não só quando falta algo: é a mesma regra do detalhe
   * da árvore, que diz "Faltam 12 PAC" em vez de só apagar o botão. O §5 proíbe
   * comunicar estado só por cor, e um botão apagado sem frase é exatamente isso.
   */
  readonly status: string;
};

/**
 * Traduz "quem está escolhido" nos cartões da tela.
 *
 * **O `canStart` sai do cartão marcado, e não do `chosen` não ser nulo**, e a
 * diferença aparece num caso só: um `chosen` que a tela não sabe desenhar — a
 * Marina, hoje, se alguém a passasse daqui. Começar com um especialista que não
 * está na tela seria começar sem o jogador ter escolhido nada. O contrato desta
 * tela é "escolha um destes", e é ele que o `canStart` responde.
 */
export function selectView(chosen: CharacterId | null, fair = false): SelectView {
  const text = ui.select;

  const cards: readonly SelectCard[] = SELECTABLE_IDS.map((id) => {
    const buff = characterBuffs[id];
    const person = personText(id);

    return {
      id,
      who: poseOf(id),
      name: person.name,
      role: person.role,
      branch: ui.tree.branches[buff.branch],
      branchIcon: buff.branch,
      bonus: bonusLines(buff),
      chosen: chosen === id,
    };
  });

  const current = cards.find((card) => card.chosen);

  return {
    heading: text.heading,
    lead: text.lead,
    cards,
    startLabel: fair ? text.startFair : text.start,
    canStart: current !== undefined,
    status:
      current === undefined ? text.statusEmpty : text.statusChosen(current.name, current.branch),
  };
}

// -------------------------------------------------------------------- DOM ---

export type SelectHandlers = {
  /** Um cartão foi clicado: escolher esta pessoa (ou desfazer, clicando de novo). */
  readonly onChoose: (id: SelectableId) => void;
  /** Começar a partida com quem está escolhido. */
  readonly onStart: () => void;
  /** Voltar ao título sem começar — o botão, ou o Esc (§5). */
  readonly onBack: () => void;
};

type Slot = 'heading' | 'lead' | 'list' | 'mark' | 'start' | 'status' | 'back';

function slot(root: ParentNode, name: Slot): HTMLElement | null {
  return root.querySelector<HTMLElement>(`[data-select="${name}"]`);
}

/**
 * O cartão de um especialista: o retrato, o nome, o cargo, o ramo e o bônus.
 *
 * É um `<button>` de verdade, e não uma `<div>` com `onclick`: chega pela
 * tabulação, responde ao Enter e ao espaço sem código nenhum, e anuncia o estado
 * por `aria-pressed`. O `role="radio"` foi descartado — ele obrigaria a
 * implementar a navegação por setas à mão para não quebrar a expectativa de
 * quem usa leitor de tela, e quatro paradas de tabulação não doem.
 */
function cardElement(card: SelectCard, onChoose: (id: SelectableId) => void): HTMLElement {
  const item = document.createElement('li');
  item.className = 'select__item';

  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'select__card';
  button.dataset.character = card.id;
  button.addEventListener('click', () => onChoose(card.id));

  const portrait = mountPortrait('select__face', false);
  renderPortrait(portrait, card.who);

  const name = document.createElement('strong');
  name.className = 'select__name';
  name.textContent = card.name;

  const role = document.createElement('span');
  role.className = 'select__role';
  role.textContent = card.role;

  // O ramo com ícone **e** rótulo escrito: o §5 não deixa um estado viver só no
  // desenho, e aqui o ramo é a informação que decide o clique.
  const branch = document.createElement('p');
  branch.className = 'select__branch';
  branch.textContent = ui.select.branchLabel(card.branch);
  prependIcon(branch, card.branchIcon, 'icon--button');

  const bonus = document.createElement('ul');
  bonus.className = 'select__bonus';
  bonus.append(
    ...card.bonus.map((line) => {
      const li = document.createElement('li');
      li.textContent = line;
      return li;
    }),
  );

  // A marca de escolhido é texto, não só borda. "Escolha atual" em vez de
  // "escolhido" porque o rótulo descreve o cartão, e não a pessoa — assim não
  // há concordância de gênero a acertar para cada integrante da equipe.
  const mark = document.createElement('span');
  mark.className = 'select__mark';
  mark.dataset.select = 'mark';
  mark.textContent = ui.select.current;

  button.append(portrait, name, role, branch, bonus, mark);
  item.append(button);
  return item;
}

/**
 * Monta a tela uma vez, na carga da página.
 *
 * **Os cartões são montados aqui, e não a cada render**, porque a lista é
 * estática: quem aparece sai do `SELECTABLE_IDS`, que é uma constante de módulo.
 * O que muda ao clicar é só qual está marcado, e isso o `renderSelect` escreve
 * por atributo — o mesmo contrato do HUD e da árvore. Remontar a lista a cada
 * clique faria o navegador reconferir cinco imagens e tiraria o foco do cartão
 * que o jogador acabou de escolher pelo teclado.
 *
 * O `Esc` é escutado no documento, e não aqui: a tela não tem foco próprio, e
 * exigir que o jogador tenha clicado dentro dela antes de o Esc valer seria uma
 * regra invisível. O guarda de tela está no main.ts, que é quem sabe qual delas
 * está no ar.
 */
export function mountSelect(root: Element, handlers: SelectHandlers): void {
  root.setAttribute('aria-label', ui.select.label);

  const heading = document.createElement('h2');
  heading.className = 'select__heading';
  heading.dataset.select = 'heading';

  const lead = document.createElement('p');
  lead.className = 'select__lead';
  lead.dataset.select = 'lead';

  const list = document.createElement('ul');
  list.className = 'select__list';
  list.dataset.select = 'list';
  // A view sem ninguém escolhido: as partes fixas do cartão saem dela, e o
  // `renderSelect` acende a marca certa no primeiro render.
  list.append(...selectView(null).cards.map((card) => cardElement(card, handlers.onChoose)));

  const start = document.createElement('button');
  start.type = 'button';
  start.className = 'select__button select__button--primary';
  start.dataset.select = 'start';
  start.title = ui.select.startHint;
  start.addEventListener('click', handlers.onStart);
  prependIcon(start, 'play', 'icon--button');

  const status = document.createElement('p');
  status.className = 'select__status';
  status.dataset.select = 'status';

  const back = document.createElement('button');
  back.type = 'button';
  back.className = 'select__button';
  back.dataset.select = 'back';
  back.title = ui.select.backHint;
  writeLabel(back, ui.select.back);
  back.addEventListener('click', handlers.onBack);
  prependIcon(back, 'leave', 'icon--button');

  const actions = document.createElement('div');
  actions.className = 'select__actions';
  actions.append(start, back);

  root.replaceChildren(heading, lead, list, actions, status);
}

/** Escreve o estado atual na tela já montada. */
export function renderSelect(root: ParentNode, view: SelectView): void {
  const heading = slot(root, 'heading');
  if (heading !== null) heading.textContent = view.heading;

  const lead = slot(root, 'lead');
  if (lead !== null) lead.textContent = view.lead;

  for (const card of view.cards) {
    const button = root.querySelector<HTMLElement>(`[data-character="${card.id}"]`);
    if (button === null) continue;

    button.setAttribute('aria-pressed', String(card.chosen));
    button.title = card.chosen ? ui.select.chosenHint(card.name) : ui.select.chooseHint(card.name);

    const mark = button.querySelector<HTMLElement>('[data-select="mark"]');
    if (mark !== null) mark.hidden = !card.chosen;
  }

  const start = slot(root, 'start');
  if (start !== null) {
    writeLabel(start, view.startLabel);
    // `aria-disabled`, e não `disabled`: o botão continua focável e o leitor de
    // tela anuncia que ele não está disponível, enquanto a frase do `status` diz
    // o porquê. Um botão `disabled` sai da tabulação e leva a explicação com ele.
    start.setAttribute('aria-disabled', String(!view.canStart));
  }

  const status = slot(root, 'status');
  if (status !== null) status.textContent = view.status;
}

/** O primeiro cartão, para levar o foco até a lista ao entrar na tela. */
export function focusFirstCard(root: ParentNode): void {
  root.querySelector<HTMLElement>('.select__card')?.focus();
}
