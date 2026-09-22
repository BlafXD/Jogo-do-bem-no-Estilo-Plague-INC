// A árvore de habilidades na tela (P6-06).
//
// Mesma divisão do hud.ts e do controls.ts, pelo mesmo motivo: `treeView` é
// **puro** — entra GameState, sai a árvore inteira já classificada e com os
// textos prontos — e só `mountTree` e `renderTree` tocam no DOM. O `document`
// nunca aparece no topo do módulo.
//
// **Esta UI não reimplementa nenhuma regra de jogo.** Quem decide se um nó pode
// ser comprado é o `canUnlock` do engine, e quem cobra o PAC é o `unlockSkill`.
// Aqui só se traduz a resposta em texto. Uma segunda implementação da regra de
// pré-requisito seria exatamente o jeito de a tela e o engine discordarem em
// silêncio.
//
// **Quatro estados visuais, e não os três do PLANO.md.** O plano escreve
// "bloqueado / disponível / comprado", mas o `canUnlock` já separa
// `missingRequirement` de `notEnoughPoints` — e o comentário do `UnlockRefusal`
// no skills.ts diz que é a UI do P6-06 que usa essa distinção para explicar o
// nó. "Bloqueado" vira dois porque as duas situações pedem coisas opostas do
// jogador: uma se resolve esperando o PAC entrar, a outra só se resolve
// comprando outro nó antes. Dizer "bloqueado" nos dois casos esconde justamente
// a informação que decide o próximo clique.
//
// **Desde o VIS-05, cada ramo é um losango** — a raiz, os dois nós do meio e o
// nó final, com as ligações desenhadas —, e ao lado fica o detalhe do nó
// escolhido. O painel que os envolve é do tree-panel.ts.

import { ui } from '../data/i18n';
import { canUnlock, skillById, type UnlockRefusal } from '../engine/skills';
import {
  SKILL_BRANCHES,
  skills,
  type GameState,
  type Skill,
  type SkillBranch,
  type SkillId,
} from '../engine/state';
import { prependIcon } from './icons';

// --------------------------------------------------------------- a view ---

export const NODE_STATUSES = ['unlocked', 'available', 'unaffordable', 'locked'] as const;

export type NodeStatus = (typeof NODE_STATUSES)[number];

export type SkillNodeView = {
  readonly id: SkillId;
  readonly name: string;
  /** Quantos pré-requisitos encadeados existem acima deste nó. Raiz = 0. */
  readonly depth: number;
  /** Os pais do nó, de onde saem as ligações do losango (VIS-05). */
  readonly requires: readonly SkillId[];
  /** Custo já formatado com a unidade — "40 PAC". */
  readonly cost: string;
  /** O efeito no jogo, uma frase (vem do skills.json). */
  readonly description: string;
  /** O fato real, uma frase. Desde o VIS-05, aparece no detalhe antes da compra. */
  readonly fact: string;
  readonly status: NodeStatus;
  readonly statusIcon: string;
  readonly statusLabel: string;
  /** Por que não dá para comprar agora, em uma frase. Vazio quando dá. */
  readonly detail: string;
};

export type BranchView = {
  readonly branch: SkillBranch;
  readonly name: string;
  readonly nodes: readonly SkillNodeView[];
};

export type TreeView = readonly BranchView[];

const whole = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 0 });

/**
 * Profundidade de cada nó, deduzida dos `requires`.
 *
 * Não está escrita no skills.json de propósito: um "nível" gravado à mão é um
 * número que pode discordar do grafo, e aí a tela mostraria uma ordem que os
 * pré-requisitos não confirmam. Deduzir custa uma travessia na carga e não tem
 * como divergir.
 *
 * Sem guarda de ciclo porque o `parseSkills` já recusou o arquivo com ciclo
 * antes de esta função existir — repetir a checagem aqui seria dizer que não
 * confio na que já rodou.
 */
function computeDepths(tree: readonly Skill[]): ReadonlyMap<SkillId, number> {
  const depths = new Map<SkillId, number>();

  const depthOf = (id: SkillId): number => {
    const known = depths.get(id);
    if (known !== undefined) return known;

    const requires = skillById(id)?.requires ?? [];
    const depth = requires.reduce((deepest, req) => Math.max(deepest, depthOf(req) + 1), 0);

    depths.set(id, depth);
    return depth;
  };

  for (const skill of tree) depthOf(skill.id);
  return depths;
}

const DEPTHS = computeDepths(skills);

/**
 * De recusa do engine para estado de tela.
 *
 * É um `Record` completo, e não um `switch`, para o `tsc` cobrar: se o engine
 * ganhar uma quinta razão de recusa, este arquivo para de compilar em vez de
 * cair num `default` silencioso e mostrar o nó errado.
 */
const STATUS_FOR_REFUSAL: Readonly<Record<UnlockRefusal, NodeStatus>> = {
  alreadyUnlocked: 'unlocked',
  notEnoughPoints: 'unaffordable',
  missingRequirement: 'locked',
  // Inalcançável: só desenhamos nós que vieram da própria árvore, então o
  // engine nunca vai chamar um deles de desconhecido. Mapeado porque o Record
  // exige, e 'locked' é a leitura mais conservadora — não convida ao clique.
  unknownSkill: 'locked',
};

function statusOf(state: GameState, id: SkillId): NodeStatus {
  const check = canUnlock(state, id);
  return check.ok ? 'available' : STATUS_FOR_REFUSAL[check.reason];
}

/**
 * A frase que explica a recusa.
 *
 * No caso do pré-requisito, nomeia **só o que falta**: um nó que exige dois
 * pais e já tem um deles não deve mandar comprar o que já é seu.
 *
 * No caso do PAC, arredonda a falta **para cima**. O PAC entra fracionado (o
 * P6-03 divide a entrada anual por 12), então quem tem 39,5 e precisa de 40
 * está devendo 0,5 — e "Faltam 0 PAC" num nó que não compra é o tipo de texto
 * que faz o jogador achar que o jogo travou. É a mesma escolha do HUD, que
 * arredonda o PAC para baixo: o número na tela nunca promete o que a compra vai
 * negar.
 */
function detailFor(state: GameState, skill: Skill, status: NodeStatus): string {
  if (status === 'locked') {
    const missing = skill.requires
      .filter((id) => !state.unlockedSkills.includes(id))
      .map((id) => skillById(id)?.name ?? id);

    return ui.tree.requires(missing);
  }

  if (status === 'unaffordable') {
    return ui.tree.missingPoints(whole.format(Math.ceil(skill.cost - state.actionPoints)));
  }

  return '';
}

function nodeView(state: GameState, skill: Skill): SkillNodeView {
  const status = statusOf(state, skill.id);
  const badge = ui.tree.status[status];

  return {
    id: skill.id,
    name: skill.name,
    depth: DEPTHS.get(skill.id) ?? 0,
    requires: skill.requires,
    cost: ui.tree.cost(whole.format(skill.cost)),
    description: skill.description,
    fact: skill.fact,
    status,
    statusIcon: badge.icon,
    statusLabel: badge.label,
    detail: detailFor(state, skill, status),
  };
}

/**
 * A árvore inteira, agrupada por ramo e ordenada por profundidade.
 *
 * A ordem dos ramos é a do `SKILL_BRANCHES`, que é a mesma do docs/GDD.md §2.4.
 * Dentro do ramo, `sort` estável mantém a ordem do skills.json entre nós de
 * mesma profundidade — os dois nós de nível 2 aparecem na ordem do arquivo, que
 * é onde o pacote [D-Historia] consegue mexer sem abrir um .ts.
 *
 * **O parâmetro `tree` existe por causa do teste, e vale explicar por quê.** O
 * skills.json de hoje já está escrito em ordem de profundidade, então trocar o
 * `sort` por nada não muda uma linha da tela — e um teste que só conferisse a
 * lista atual passaria com a ordenação removida. Foi o que aconteceu quando
 * plantei esse defeito de propósito: 161 testes verdes com o `sort` fora. Com o
 * parâmetro, o teste entrega os mesmos 20 nós embaralhados e exige a mesma
 * ordem de saída. O `main.ts` nunca passa nada; o padrão é o arquivo.
 *
 * O que vier aqui precisa ser feito de nós da árvore carregada — a profundidade
 * sai do mapa montado na carga, e um nó estranho a ela sairia como raiz.
 */
export function treeView(state: GameState, tree: readonly Skill[] = skills): TreeView {
  return SKILL_BRANCHES.map((branch) => ({
    branch,
    name: ui.tree.branches[branch],
    nodes: tree
      .filter((skill) => skill.branch === branch)
      .map((skill) => nodeView(state, skill))
      .sort((a, b) => a.depth - b.depth),
  }));
}

// ------------------------------------------------------------ o detalhe ---

/**
 * O nó escolhido, ao lado dos losangos (VIS-05).
 *
 * **Escolher e comprar viraram dois gestos.** Até o VIS-04 o cartão inteiro
 * comprava; com o detalhe ao lado, clicar num nó só o mostra, e quem compra é o
 * botão do detalhe, sempre à vista. É o que deixa ler o efeito e o fato **antes**
 * de gastar — o custo de um clique a mais numa decisão que não tem desfazer.
 */
export type SkillDetailView = {
  readonly id: SkillId;
  /** O nome do ramo, em cima do nome do nó. */
  readonly branch: string;
  readonly name: string;
  readonly status: NodeStatus;
  readonly statusIcon: string;
  /** "Disponível · 40 PAC": o estado e o custo numa linha. */
  readonly state: string;
  readonly description: string;
  readonly fact: string;
  /** O texto do botão de compra — ou, quando ele recusa, o porquê. */
  readonly buy: string;
  readonly canBuy: boolean;
};

/**
 * O detalhe do nó `id`, tirado da view da árvore.
 *
 * Sai da `TreeView`, e não do GameState, para não classificar o nó duas vezes
 * por mês: o `main.ts` já tem a árvore pronta quando pede o detalhe.
 *
 * Um id que a árvore não conhece cai no primeiro nó, e não em erro: a escolha é
 * estado da tela, e uma tela que quebra porque o skills.json mudou de nomes
 * entre duas versões é pior do que uma que escolhe outro nó.
 *
 * `finished` troca o botão por "A partida acabou": a árvore vira histórico, e
 * um "Comprar" que não compra nada seria mentira. Quem recusa de verdade
 * continua sendo o `handleUnlock` do main.ts.
 */
export function skillDetailView(
  view: TreeView,
  id: SkillId,
  finished = false,
): SkillDetailView | null {
  const all = view.flatMap((branch) => branch.nodes.map((node) => ({ branch, node })));
  const found = all.find((entry) => entry.node.id === id) ?? all[0];
  if (found === undefined) return null;

  const { branch, node } = found;
  const text = ui.tree.detail;

  return {
    id: node.id,
    branch: branch.name,
    name: node.name,
    status: node.status,
    statusIcon: node.statusIcon,
    state: text.state(node.statusLabel, node.cost),
    description: node.description,
    fact: node.fact,
    buy: buyLabel(node, finished),
    canBuy: node.status === 'available' && !finished,
  };
}

function buyLabel(node: SkillNodeView, finished: boolean): string {
  if (node.status === 'unlocked') return ui.tree.detail.bought;
  if (finished) return ui.tree.detail.finished;
  if (node.status === 'available') return ui.tree.detail.buy(node.cost);
  // Bloqueado ou sem PAC: o botão diz o que falta, com a mesma frase que o
  // `detailFor` escreve. É a frase que decide o próximo passo do jogador.
  return node.detail;
}

// ------------------------------------------------------------------ DOM ---

function span(className: string, text?: string): HTMLSpanElement {
  const element = document.createElement('span');
  element.className = className;
  if (text !== undefined) element.textContent = text;
  return element;
}

/** Escreve um texto só quando ele mudou: o render roda a cada mês de jogo. */
function write(target: Element | null, text: string): void {
  if (target !== null && target.textContent !== text) target.textContent = text;
}

/**
 * Monta o cartão de um nó no losango.
 *
 * O cartão inteiro é um `<button>`, e não um cartão com um botãozinho dentro,
 * por duas razões: o alvo de clique fica do tamanho do cartão — o dedo de quem
 * passa num estande não mira bem, é o mesmo motivo dos 44px do controls.css — e
 * cada nó vira **uma** parada de tabulação em vez de duas.
 *
 * O cartão diz o nome, o custo e o estado, e nada além disso: o efeito e o fato
 * moram no detalhe. Vinte cartões com três frases cada não cabem numa tela.
 */
function nodeElement(node: SkillNodeView, place: string, onChoose: (id: SkillId) => void) {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'tree__node';
  button.dataset.skill = node.id;
  // Os pais, para as ligações do losango: quem as desenha lê o DOM, e não a
  // view, porque redesenha sozinho quando o painel muda de tamanho.
  button.dataset.requires = node.requires.join(' ');
  button.title = ui.tree.detail.chooseHint;

  const status = span('tree__status');
  const icon = span('tree__icon');
  icon.dataset.tree = 'icon';
  // Decoração: quem carrega o estado para o leitor de tela é o rótulo ao lado.
  icon.setAttribute('aria-hidden', 'true');
  const label = span('tree__status-label');
  label.dataset.tree = 'label';
  status.append(icon, ' ', label);

  // Os espaços entre os pedaços são para o nome acessível, como no botão da
  // barra: sem eles, o leitor de tela leria "Energia solar em escala40 PAC".
  button.append(span('tree__name', node.name), ' ', span('tree__cost', node.cost), ' ', status);
  button.addEventListener('click', () => onChoose(node.id));

  const item = document.createElement('li');
  item.className = 'tree__item';
  // O lugar no losango. A linha não é escrita: os nós chegam em ordem de
  // profundidade, e a grade os põe um abaixo do outro sozinha — o que deixa o
  // tree.css empilhá-los quando o ramo é estreito demais para o losango.
  item.dataset.place = place;
  item.append(button);
  return item;
}

/**
 * O lugar de cada nó no losango: `alone` para quem está sozinho na linha dele,
 * `left` e `right` para os dois do meio. Sai das profundidades, e não da
 * posição no arquivo — é o mesmo cuidado do `computeDepths`.
 */
function placesOf(nodes: readonly SkillNodeView[]): ReadonlyMap<SkillId, string> {
  const places = new Map<SkillId, string>();

  for (const node of nodes) {
    const row = nodes.filter((other) => other.depth === node.depth);
    const place = row.length === 1 ? 'alone' : row.indexOf(node) === 0 ? 'left' : 'right';
    places.set(node.id, place);
  }

  return places;
}

const SVG = 'http://www.w3.org/2000/svg';

/**
 * Monta os cinco ramos, uma vez, e já escreve o estado atual neles.
 *
 * Diferente do `mountHud`, este recebe a view: a estrutura da tela depende dos
 * dados (quantos ramos, quantos nós, que nome tem cada um), e ler o skills.json
 * uma segunda vez aqui só criaria uma segunda ordem para discordar da primeira.
 */
export function mountTree(
  root: HTMLElement,
  view: TreeView,
  chosen: SkillId,
  onChoose: (id: SkillId) => void,
): void {
  // A frase de introdução mora no cabeçalho do painel (tree-panel.ts).
  root.setAttribute('aria-label', ui.tree.label);

  const branches = view.map((branch) => {
    const section = document.createElement('section');
    section.className = 'tree__branch';
    section.dataset.branch = branch.branch;

    // <h3> de verdade, e não um <div> com cara de título: é o que faz um leitor
    // de tela conseguir pular de ramo em ramo em vez de varrer os 20 nós. O
    // <h2> é o título do painel.
    const title = document.createElement('h3');
    title.className = 'tree__branch-name';
    title.textContent = branch.name;
    // O ícone do ramo (VIS-09) tem o nome do ramo no skills.json.
    prependIcon(title, branch.branch);

    const places = placesOf(branch.nodes);
    const list = document.createElement('ol');
    list.className = 'tree__nodes';
    list.append(
      ...branch.nodes.map((node) => nodeElement(node, places.get(node.id) ?? 'alone', onChoose)),
    );

    // As ligações ficam numa camada por baixo dos cartões, fora da lista: um
    // <svg> dentro de um <ol> não é HTML válido.
    const links = document.createElementNS(SVG, 'svg');
    links.setAttribute('class', 'tree__links');
    links.setAttribute('aria-hidden', 'true');

    const diamond = document.createElement('div');
    diamond.className = 'tree__diamond';
    diamond.append(links, list);

    section.append(title, diamond);
    return section;
  });

  root.replaceChildren(...branches);
  renderTree(root, view, chosen);

  // O painel abre e fecha, e a janela muda de tamanho: as ligações dependem da
  // posição dos cartões, então são refeitas a cada mudança de tamanho. Fechado,
  // o painel mede zero, e o `drawTreeLinks` não desenha nada.
  if (typeof ResizeObserver !== 'undefined') {
    new ResizeObserver(() => drawTreeLinks(root)).observe(root);
  }
}

/**
 * Escreve o estado atual nos cartões já montados.
 *
 * **Atualiza em vez de reconstruir**, e isso não é otimização: a árvore
 * redesenha a cada mês de jogo, e recriar os botões arrancaria o foco do
 * teclado de quem estivesse navegando — a cada 1,5 segundo, na velocidade 1x.
 */
export function renderTree(root: HTMLElement, view: TreeView, chosen: SkillId): void {
  let changed = false;

  for (const branch of view) {
    for (const node of branch.nodes) {
      const button = root.querySelector<HTMLElement>(`[data-skill="${node.id}"]`);
      if (button === null) continue;

      if (button.dataset.status !== node.status) {
        button.dataset.status = node.status;
        changed = true;
      }

      // `aria-pressed`, como as regiões do mapa: é o que diz ao leitor de tela
      // qual nó está no detalhe. O estado de compra vai escrito no rótulo.
      button.setAttribute('aria-pressed', String(node.id === chosen));

      write(button.querySelector('[data-tree="icon"]'), node.statusIcon);
      write(button.querySelector('[data-tree="label"]'), node.statusLabel);
    }
  }

  // As ligações só mudam de cor quando um nó muda de estado.
  if (changed) drawTreeLinks(root);
}

/**
 * Desenha as ligações de cada losango: de cada pai até o filho, descendo, com
 * um degrau no meio do caminho.
 *
 * **Mede a tela**, e por isso lê o DOM em vez de receber a view: é chamada pelo
 * `ResizeObserver`, que não sabe nada da partida. Com o painel fechado as
 * medidas são zero, e a função sai sem desenhar — ela roda de novo quando o
 * painel abre e ganha tamanho.
 *
 * A ligação entre dois nós comprados fica acesa, com a cor de comprado. Ela é
 * reforço: quem diz que o nó foi comprado é o rótulo escrito no cartão (§5).
 */
export function drawTreeLinks(root: ParentNode): void {
  for (const diamond of root.querySelectorAll<HTMLElement>('.tree__diamond')) {
    const links = diamond.querySelector('.tree__links');
    const box = diamond.getBoundingClientRect();
    if (links === null || box.width === 0) continue;

    links.setAttribute('viewBox', `0 0 ${box.width} ${box.height}`);

    const paths = [...diamond.querySelectorAll<HTMLElement>('[data-skill]')].flatMap((child) =>
      (child.dataset.requires ?? '')
        .split(' ')
        .filter((id) => id !== '')
        .flatMap((id) => {
          const parent = diamond.querySelector<HTMLElement>(`[data-skill="${id}"]`);
          return parent === null ? [] : [linkPath(box, parent, child)];
        }),
    );

    links.replaceChildren(...paths);
  }
}

function linkPath(box: DOMRect, parent: HTMLElement, child: HTMLElement): SVGPathElement {
  const from = parent.getBoundingClientRect();
  const to = child.getBoundingClientRect();
  const x1 = from.left + from.width / 2 - box.left;
  const y1 = from.bottom - box.top;
  const x2 = to.left + to.width / 2 - box.left;
  const y2 = to.top - box.top;
  const middle = (y1 + y2) / 2;

  const path = document.createElementNS(SVG, 'path');
  path.setAttribute('d', `M${x1} ${y1}V${middle}H${x2}V${y2}`);
  const lit = parent.dataset.status === 'unlocked' && child.dataset.status === 'unlocked';
  if (lit) path.setAttribute('data-lit', '');
  return path;
}

/** Leva o foco ao nó que está no detalhe. Usado quando o painel abre. */
export function focusChosenNode(root: ParentNode): boolean {
  const chosen = root.querySelector<HTMLElement>('[data-skill][aria-pressed="true"]');
  chosen?.focus();
  return chosen !== null;
}

// ---------------------------------------------------------- o detalhe (DOM) ---

type DetailSlot = 'branch' | 'name' | 'icon' | 'state' | 'description' | 'fact' | 'buy';

function detailSlot(root: ParentNode, name: DetailSlot): HTMLElement | null {
  return root.querySelector<HTMLElement>(`[data-detail="${name}"]`);
}

function tagged<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  className: string,
  name: DetailSlot,
): HTMLElementTagNameMap[K] {
  const element = document.createElement(tag);
  element.className = className;
  element.dataset.detail = name;
  return element;
}

/** Monta o detalhe, uma vez. `onBuy` recebe o nó que estava no detalhe. */
export function mountSkillDetail(root: HTMLElement, onBuy: (id: SkillId) => void): void {
  root.setAttribute('aria-label', ui.tree.detail.label);

  const state = document.createElement('p');
  state.className = 'skill-detail__state';
  const icon = tagged('span', 'skill-detail__icon', 'icon');
  icon.setAttribute('aria-hidden', 'true');
  state.append(icon, ' ', tagged('span', 'skill-detail__state-text', 'state'));

  // O fato real no cartão creme, com o rótulo em cima.
  const fact = document.createElement('p');
  fact.className = 'skill-detail__fact';
  const factLabel = span('skill-detail__fact-label', ui.tree.detail.fact);
  fact.append(factLabel, ' ', tagged('span', 'skill-detail__fact-text', 'fact'));

  const buy = tagged('button', 'skill-detail__buy', 'buy');
  buy.type = 'button';
  buy.title = ui.tree.detail.buyHint;
  buy.addEventListener('click', () => {
    const id = root.dataset.skill;
    if (id !== undefined) onBuy(id);
  });

  const body = document.createElement('div');
  body.className = 'skill-detail__body';
  body.append(
    tagged('p', 'skill-detail__branch', 'branch'),
    tagged('h3', 'skill-detail__name', 'name'),
    state,
    tagged('p', 'skill-detail__description', 'description'),
    fact,
  );

  root.replaceChildren(body, buy);
}

/** Escreve o nó escolhido no detalhe já montado. */
export function renderSkillDetail(root: HTMLElement, view: SkillDetailView | null): void {
  root.hidden = view === null;
  if (view === null) return;

  root.dataset.skill = view.id;
  root.dataset.status = view.status;

  write(detailSlot(root, 'branch'), view.branch);
  write(detailSlot(root, 'name'), view.name);
  write(detailSlot(root, 'icon'), view.statusIcon);
  write(detailSlot(root, 'state'), view.state);
  write(detailSlot(root, 'description'), view.description);
  write(detailSlot(root, 'fact'), view.fact);

  const buy = detailSlot(root, 'buy');
  if (buy === null) return;
  write(buy, view.buy);
  // `aria-disabled`, e não `disabled`, pela regra da árvore inteira: um botão
  // desabilitado sai da ordem de tabulação, e quem navega por teclado não
  // chegaria nele para ler por que a compra não sai. O clique recusado não faz
  // mal — quem recusa é o `unlockSkill`, que devolve o estado intacto.
  buy.setAttribute('aria-disabled', String(!view.canBuy));
}

// ------------------------------------------------------ o botão da árvore ---

/**
 * O botão da barra de baixo que abre a árvore (VIS-04, VIS-05).
 *
 * Com a partida em tela cheia, a árvore não cabe na tela junto com o mapa. Sem
 * um caminho à vista, quem chega ao estande não descobre que ela existe — e a
 * árvore é onde o jogo acontece. Desde o VIS-05 o botão abre o painel dela por
 * cima da partida.
 */
export type TreeButtonView = {
  /** O PAC para gastar, com a unidade. */
  readonly points: string;
};

export function treeButtonView(state: GameState): TreeButtonView {
  // Para baixo, pela regra do hud.ts: o número na tela nunca promete o que a
  // compra vai negar. Os dois números ficam lado a lado na tela, e o
  // tests/tree.test.ts trava que eles concordam.
  return { points: ui.treeButton.points(wholePoints(state)) };
}

/** O saldo de PAC arredondado para baixo, sem unidade. O painel usa também. */
export function wholePoints(state: GameState): string {
  return whole.format(Math.floor(state.actionPoints));
}

/**
 * Monta o botão uma vez. O nome que o leitor de tela anuncia é o próprio texto:
 * "Árvore de habilidades 120 PAC".
 *
 * `panelId` é o painel que ele abre: o `aria-controls` e o `aria-haspopup`
 * dizem ao leitor de tela que o clique abre uma janela, e o `aria-expanded`,
 * escrito pelo `renderTreeButton`, se ela está aberta.
 */
export function mountTreeButton(root: Element, panelId: string, onOpen: () => void): void {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'tree-button';
  button.title = ui.treeButton.hint;
  button.setAttribute('aria-haspopup', 'dialog');
  button.setAttribute('aria-controls', panelId);
  button.setAttribute('aria-expanded', 'false');

  const points = span('tree-button__points');
  points.dataset.treeButton = 'points';

  // O espaço entre os dois é para o nome acessível: dois `<span>` colados
  // viram "habilidades120" no leitor de tela. Na tela ele não aparece — num
  // contêiner flex, texto só de espaço não é desenhado, e quem separa é o gap.
  button.append(span('tree-button__label', ui.treeButton.label), ' ', points);
  prependIcon(button, 'tree', 'icon--button');
  button.addEventListener('click', onOpen);
  root.replaceChildren(button);
}

/** Escreve o saldo e se o painel está aberto no botão já montado. */
export function renderTreeButton(root: ParentNode, view: TreeButtonView, open = false): void {
  write(root.querySelector('[data-tree-button="points"]'), view.points);
  root.querySelector('button')?.setAttribute('aria-expanded', String(open));
}
