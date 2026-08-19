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

// --------------------------------------------------------------- a view ---

export const NODE_STATUSES = ['unlocked', 'available', 'unaffordable', 'locked'] as const;

export type NodeStatus = (typeof NODE_STATUSES)[number];

export type SkillNodeView = {
  readonly id: SkillId;
  readonly name: string;
  /** Quantos pré-requisitos encadeados existem acima deste nó. Raiz = 0. */
  readonly depth: number;
  /** Custo já formatado com a unidade — "40 PAC". */
  readonly cost: string;
  /** O efeito no jogo, uma frase (vem do skills.json). */
  readonly description: string;
  /** O fato real, uma frase. Só vai para a tela depois da compra. */
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

// ------------------------------------------------------------------ DOM ---

/**
 * Os pedaços do cartão que mudam durante a partida.
 *
 * União escrita à mão, e não um `as const` derivado de array como o HUD_FIELDS
 * e o SPEEDS: aqueles existem para serem percorridos, e este nunca é — cada
 * pedaço recebe um valor diferente. O tipo é só para o `tsc` recusar um nome de
 * slot digitado errado, que é onde mora o bug (um `querySelector` que não acha
 * nada não reclama, só não escreve).
 */
type Slot = 'icon' | 'label' | 'detail' | 'fact';

function slot(node: ParentNode, name: Slot): HTMLElement | null {
  return node.querySelector<HTMLElement>(`[data-tree="${name}"]`);
}

function span(className: string, text?: string): HTMLSpanElement {
  const element = document.createElement('span');
  element.className = className;
  if (text !== undefined) element.textContent = text;
  return element;
}

/**
 * Monta o cartão de um nó.
 *
 * O cartão inteiro é um `<button>`, e não um cartão com um botãozinho dentro,
 * por duas razões: o alvo de clique fica do tamanho do cartão — o dedo de quem
 * passa num estande não mira bem, é o mesmo motivo dos 44px do controls.css — e
 * cada nó vira **uma** parada de tabulação em vez de duas.
 */
function nodeElement(node: SkillNodeView, onUnlock: (id: SkillId) => void): HTMLLIElement {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'tree__node';
  button.dataset.skill = node.id;

  // O fato real fica no tooltip antes da compra: o §5 pede dica em tudo que tem
  // número, e assim quem quiser saber no que está gastando antes de gastar
  // consegue — sem despejar vinte fatos na tela de uma vez.
  button.title = node.fact;

  const head = span('tree__head');
  head.append(span('tree__name', node.name), span('tree__cost', node.cost));

  const status = span('tree__status');
  const icon = span('tree__icon');
  icon.dataset.tree = 'icon';
  icon.setAttribute('aria-hidden', 'true');
  const label = span('tree__status-label');
  label.dataset.tree = 'label';
  status.append(icon, label);

  const detail = span('tree__detail');
  detail.dataset.tree = 'detail';

  const fact = span('tree__fact', node.fact);
  fact.dataset.tree = 'fact';

  button.append(head, status, span('tree__description', node.description), detail, fact);
  button.addEventListener('click', () => onUnlock(node.id));

  const item = document.createElement('li');
  item.className = 'tree__item';
  item.append(button);
  return item;
}

/**
 * Monta a árvore uma vez e já escreve o estado atual nela.
 *
 * Diferente do `mountHud`, este recebe a view: a estrutura da tela depende dos
 * dados (quantos ramos, quantos nós, que nome tem cada um), e ler o skills.json
 * uma segunda vez aqui só criaria uma segunda ordem para discordar da primeira.
 */
export function mountTree(root: Element, view: TreeView, onUnlock: (id: SkillId) => void): void {
  root.setAttribute('aria-label', ui.tree.label);

  const intro = document.createElement('p');
  intro.className = 'tree__intro';
  intro.textContent = ui.tree.intro;

  const branches = view.map((branch) => {
    const section = document.createElement('section');
    section.className = 'tree__branch';

    // <h2> de verdade, e não um <div> com cara de título: é o que faz um leitor
    // de tela conseguir pular de ramo em ramo em vez de varrer os 20 nós.
    const title = document.createElement('h2');
    title.className = 'tree__branch-name';
    title.textContent = branch.name;

    const list = document.createElement('ol');
    list.className = 'tree__nodes';
    list.append(...branch.nodes.map((node) => nodeElement(node, onUnlock)));

    section.append(title, list);
    return section;
  });

  root.replaceChildren(intro, ...branches);
  renderTree(root, view);
}

/**
 * Escreve o estado atual nos cartões já montados.
 *
 * **Atualiza em vez de reconstruir**, e isso não é otimização: a árvore
 * redesenha a cada mês de jogo, e recriar os botões arrancaria o foco do
 * teclado de quem estivesse navegando — a cada 1,5 segundo, na velocidade 1x.
 */
export function renderTree(root: ParentNode, view: TreeView): void {
  for (const branch of view) {
    for (const node of branch.nodes) {
      const button = root.querySelector<HTMLElement>(`[data-skill="${node.id}"]`);
      if (button === null) continue;

      button.dataset.status = node.status;

      // `aria-disabled`, e não o atributo `disabled`: botão desabilitado sai da
      // ordem de tabulação, e aí quem navega por teclado não consegue nem
      // chegar no nó para ler **por que** ele está bloqueado. Deixar o clique
      // acontecer não faz mal: quem recusa a compra é o `unlockSkill`, que
      // devolve o estado intacto.
      button.setAttribute('aria-disabled', String(node.status !== 'available'));

      write(button, 'icon', node.statusIcon);
      write(button, 'label', node.statusLabel);
      write(button, 'detail', node.detail);

      const fact = slot(button, 'fact');
      if (fact !== null) fact.hidden = node.status !== 'unlocked';
    }
  }
}

/** Escreve um pedaço do cartão e o esconde quando não há o que dizer. */
function write(button: ParentNode, name: Slot, text: string): void {
  const target = slot(button, name);
  if (target === null) return;

  target.textContent = text;
  target.hidden = text === '';
}
