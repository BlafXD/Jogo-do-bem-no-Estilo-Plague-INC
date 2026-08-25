// O painel de detalhe da região escolhida no mapa (P5-04).
//
// Mesma divisão do resto da UI: `regionPanelView` é **puro** — entra GameState
// mais a região escolhida, saem os rótulos e os valores já formatados — e só
// `mountRegionPanel` e `renderRegionPanel` tocam no DOM.
//
// **O que este painel existe para resolver.** O `§2.3` do GDD diz que regiões
// diferentes pedem estratégias diferentes: "quem tem sol abundante e pouca
// verba não se resolve igual a quem tem indústria pesada e verba alta". O mapa
// do P5-01 mostra o apoio de cada uma e mais nada — não dá para saber que a
// Ásia Oriental emite trinta vezes mais que a Oceania, nem que a África tem
// quase quatro vezes a população da América do Norte. É aqui que a diferença
// entre as oito fica legível.
//
// **Por que os campos vêm em dois grupos.** A divisão é factual, não editorial:
// `population` e `cleanShare` não são escritos por ninguém durante a partida, e
// os outros quatro são. Chamar os dois primeiros de "o que ela é" e os outros de
// "como ela está" é descrever o que o engine faz, não decorar a tela.
//
// **O que este painel deliberadamente não afirma.** Hoje só `emissions`,
// `support` e `resilience` são lidos pela simulação: `population` e `cleanShare`
// não são lidos por nenhum módulo, e `economy` só é derrubada por evento sem
// nunca ser consultada de volta. As dicas do i18n dizem o que move cada número e
// param aí — nenhuma promete um efeito que não existe. A lacuna está registrada
// no PROGRESSO.md do P5-04; consertá-la é mexer na simulação, não na tela.
//
// A regra de ouro do §3 continua valendo na direção que importa: este arquivo
// importa do engine; nenhum arquivo do engine importa daqui.

import { ui } from '../data/i18n';
import { globalEmissions } from '../engine/climate';
import type { GameState, Region, RegionId } from '../engine/state';

// ----------------------------------------------------------------- a view ---

/**
 * Os campos que não mudam em nenhum momento da partida.
 *
 * Verificado contra o engine: nada em `climate.ts`, `events.ts`, `inertia.ts`,
 * `skills.ts` ou `tick.ts` escreve nestes dois.
 */
export const CHARACTER_FIELDS = ['population', 'cleanShare'] as const;

/** Os campos que a partida move. */
export const LIVE_FIELDS = ['emissions', 'support', 'resilience', 'economy'] as const;

export type PanelField = (typeof CHARACTER_FIELDS)[number] | (typeof LIVE_FIELDS)[number];

export type PanelRow = {
  readonly field: PanelField;
  readonly label: string;
  readonly value: string;
  /** Contexto que só faz sentido colado ao valor. Vazio quando não há. */
  readonly note: string;
  readonly hint: string;
};

export type PanelGroup = {
  readonly title: string;
  readonly rows: readonly PanelRow[];
};

/**
 * União discriminada em vez de um campo opcional: sem região escolhida não
 * existe "nome vazio" nem "linhas vazias" — existe outra tela. É a convenção do
 * §4, e é o que impede o `renderRegionPanel` de escrever um painel meio montado.
 */
export type RegionPanelView =
  | { readonly kind: 'empty'; readonly message: string }
  | {
      readonly kind: 'region';
      readonly id: RegionId;
      readonly name: string;
      readonly groups: readonly PanelGroup[];
    };

function decimals(digits: number): Intl.NumberFormat {
  return new Intl.NumberFormat('pt-BR', {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
}

const oneDecimal = decimals(1);
const twoDecimals = decimals(2);
const whole = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 0 });

/**
 * O valor de um campo, já formatado.
 *
 * `support` e `resilience` são **arredondados**, e isso não é escolha de estilo:
 * o mapa do P5-01 arredonda o apoio pela mesma regra, e um painel que truncasse
 * mostraria 24 ao lado de um mapa mostrando 25 para a mesma região. O
 * tests/region-panel.test.ts tranca as duas telas juntas.
 */
function valueOf(region: Region, field: PanelField): string {
  switch (field) {
    case 'population':
      return `${oneDecimal.format(region.population)} ${ui.units.millions}`;
    case 'cleanShare':
      return `${whole.format(region.cleanShare * 100)}%`;
    case 'emissions':
      return `${twoDecimals.format(region.emissions)} ${ui.units.emissionsPerYear}`;
    case 'support':
      return ui.regionPanel.scale(whole.format(Math.round(region.support)));
    case 'resilience':
      return ui.regionPanel.scale(whole.format(Math.round(region.resilience)));
    case 'economy':
      return whole.format(Math.round(region.economy));
  }
}

/**
 * O contexto que acompanha um valor.
 *
 * Só a emissão tem: sozinho, "2,71 Gt/ano" não diz se é muito. A fatia do total
 * é o que transforma o número em comparação, e é ela que mostra por que cortar
 * na Ásia Oriental vale mais do que cortar na Oceania.
 *
 * A divisão é guardada porque a emissão global **chega a zero** — é a condição
 * de vitória do §2.7. Sem a guarda, a partida vencida mostraria "NaN% do mundo"
 * no exato momento em que o jogador ganhou.
 */
function noteOf(state: GameState, region: Region, field: PanelField): string {
  if (field !== 'emissions') return '';

  const total = globalEmissions(state);
  if (total <= 0) return '';

  return ui.regionPanel.shareOfWorld(`${whole.format((region.emissions / total) * 100)}%`);
}

function rowsFor(
  state: GameState,
  region: Region,
  fields: readonly PanelField[],
): readonly PanelRow[] {
  return fields.map((field) => ({
    field,
    label: ui.regionPanel.fields[field].label,
    value: valueOf(region, field),
    note: noteOf(state, region, field),
    hint: ui.regionPanel.fields[field].hint,
  }));
}

/** Traduz a região escolhida no painel inteiro, ou na tela de "nenhuma". */
export function regionPanelView(state: GameState, selected: RegionId | null): RegionPanelView {
  if (selected === null) return { kind: 'empty', message: ui.regionPanel.empty };

  const region = state.regions[selected];

  return {
    kind: 'region',
    id: selected,
    name: region.name,
    groups: [
      { title: ui.regionPanel.groups.character, rows: rowsFor(state, region, CHARACTER_FIELDS) },
      { title: ui.regionPanel.groups.live, rows: rowsFor(state, region, LIVE_FIELDS) },
    ],
  };
}

// -------------------------------------------------------------------- DOM ---

type Slot = 'name' | 'value' | 'note';

function element<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  className: string,
  text?: string,
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

/**
 * Monta a linha de um campo: rótulo, valor e o contexto do valor.
 *
 * `<dt>` e `<dd>` de verdade, e não dois `<span>` com cara de tabela: é o que
 * faz um leitor de tela anunciar "População, 1.479,0 milhões" em vez de ler duas
 * frases soltas que por acaso estão perto uma da outra.
 */
function rowElement(field: PanelField): HTMLDivElement {
  const row = element('div', 'region__row');
  row.dataset.field = field;
  // O §5 do GDD pede dica em tudo que tem número, e a linha inteira é o alvo:
  // mirar num `<dt>` de duas palavras com o mouse de um estande é pedir demais.
  row.title = ui.regionPanel.fields[field].hint;

  const value = element('dd', 'region__value');
  value.dataset.panel = 'value';

  const note = element('dd', 'region__note');
  note.dataset.panel = 'note';

  row.append(element('dt', 'region__label', ui.regionPanel.fields[field].label), value, note);
  return row;
}

function groupElement(title: string, fields: readonly PanelField[]): HTMLElement {
  const group = element('section', 'region__group');

  // <h3> de verdade: o nome da região é <h2>, e os dois grupos vêm abaixo dele.
  // É o que deixa um leitor de tela pular de grupo em grupo.
  const heading = element('h3', 'region__group-title', title);

  const list = element('dl', 'region__rows');
  list.append(...fields.map(rowElement));

  group.append(heading, list);
  return group;
}

/**
 * Monta o painel uma vez, na carga da página.
 *
 * Diferente do `mountTree` e do `mountMap`, este **não recebe a view**: os seis
 * campos e os dois grupos são os mesmos para as oito regiões, então a estrutura
 * não depende de qual está escolhida. Só os valores dependem, e quem os escreve
 * é o `renderRegionPanel`.
 *
 * **Fica visível mesmo sem região escolhida**, com a frase que ensina a clicar.
 * É a mesma razão do botão de contenção bloqueado do P7-03: um painel que só
 * aparece depois do primeiro clique não tem como ensinar que o clique existe — e
 * num estande de feira ninguém descobre sozinho que uma forma de SVG é clicável.
 */
export function mountRegionPanel(root: Element, onClose: () => void): void {
  root.setAttribute('aria-label', ui.regionPanel.label);

  const empty = element('p', 'region__empty', ui.regionPanel.empty);
  empty.dataset.panel = 'empty';

  const detail = element('div', 'region__detail');
  detail.dataset.panel = 'detail';

  const head = element('div', 'region__head');
  const name = element('h2', 'region__name');
  name.dataset.panel = 'name';

  const close = document.createElement('button');
  close.type = 'button';
  close.className = 'region__close';
  close.dataset.panel = 'close';
  close.textContent = ui.regionPanel.close;
  close.title = ui.regionPanel.closeHint;
  close.addEventListener('click', onClose);

  head.append(name, close);
  detail.append(
    head,
    groupElement(ui.regionPanel.groups.character, CHARACTER_FIELDS),
    groupElement(ui.regionPanel.groups.live, LIVE_FIELDS),
  );

  root.replaceChildren(empty, detail);

  // Deixa o painel num estado válido já na montagem, em vez de contar com o
  // primeiro `renderGame` para isso. Sem esta linha as **duas** telas ficam
  // visíveis entre montar e desenhar — o `hidden` de nenhuma delas foi escrito
  // ainda. No main.ts a janela é de microssegundos e ninguém veria; num teste,
  // ou em qualquer outra ordem de chamada, é um painel quebrado. A regra de "só
  // uma das duas por vez" mora inteira no `renderRegionPanel`, e é ele que a
  // aplica aqui também.
  renderRegionPanel(root, { kind: 'empty', message: ui.regionPanel.empty });
}

function slot(row: ParentNode, name: Slot): HTMLElement | null {
  return row.querySelector<HTMLElement>(`[data-panel="${name}"]`);
}

/**
 * Escreve a região escolhida no painel já montado.
 *
 * **Atualiza em vez de reconstruir**, como o mapa e a árvore: o painel redesenha
 * a cada mês de jogo, e recriar os nós arrancaria o foco de quem estivesse no
 * botão de fechar — a cada 1,5 segundo na velocidade 1x.
 */
export function renderRegionPanel(root: ParentNode, view: RegionPanelView): void {
  const empty = root.querySelector<HTMLElement>('[data-panel="empty"]');
  const detail = root.querySelector<HTMLElement>('[data-panel="detail"]');
  if (empty === null || detail === null) return;

  // `hidden` nos dois lados, e nunca os dois visíveis: a união discriminada da
  // view já garante que só um dos casos existe por vez, e o `hidden` é o que faz
  // a tela concordar com ela.
  empty.hidden = view.kind !== 'empty';
  detail.hidden = view.kind === 'empty';

  if (view.kind === 'empty') {
    empty.textContent = view.message;
    // O painel não anuncia região nenhuma enquanto não há escolha. Sem isto, o
    // `data-region` velho ficaria no DOM e o CSS — e qualquer teste — acreditaria
    // que a última escolhida continua de pé.
    delete detail.dataset.region;
    return;
  }

  detail.dataset.region = view.id;

  const name = slot(detail, 'name');
  if (name !== null) name.textContent = view.name;

  for (const group of view.groups) {
    for (const row of group.rows) {
      const target = detail.querySelector<HTMLElement>(`[data-field="${row.field}"]`);
      if (target === null) continue;

      const value = slot(target, 'value');
      if (value !== null) value.textContent = row.value;

      const note = slot(target, 'note');
      if (note !== null) {
        note.textContent = row.note;
        note.hidden = row.note === '';
      }
    }
  }
}
