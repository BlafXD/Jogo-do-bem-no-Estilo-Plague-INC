// O mapa das 8 regiões: o mapa-múndi ilustrado do VIS-03, que substituiu os
// retângulos do P5-01. As regiões estão no docs/GDD.md §2.3; o desenho, no
// docs/DIRECAO-DE-ARTE.md §6.
//
// Mesma divisão do hud.ts, do tree.ts e do contain.ts: `mapView` é **puro** —
// entra GameState, sai o mapa inteiro em texto e número — e só `mountMap` e
// `renderMap` tocam no DOM. A geometria (a imagem, os contornos, onde cada
// etiqueta pousa) está no map-geometry.ts, também pura.
//
// **Por que este arquivo existe.** O engine simula as oito regiões desde o
// P6-01: o climate.ts cresce emissão região a região, o events.ts acerta um
// alvo, a Inércia derruba apoio localmente e as habilidades aplicam efeito
// regional. O HUD mostra a **média** do apoio, e uma média esconde exatamente o
// que interessa: que a África pode estar em 12 enquanto a Europa está em 68.
//
// **Por que o apoio, e não as emissões.** O HUD já mostra a emissão global, e a
// emissão de uma região é um número pequeno com decimal que se lê mal de longe.
// O apoio é o número que só existe em média no HUD, é o que os eventos e a
// Inércia atacam, e é uma das duas condições de derrota do §2.7.
//
// **As etiquetas são botões de verdade.** O P5-01 desenhava cada região como um
// `<g role="button">` dentro do SVG — a única vez em que a interface abria mão do
// elemento nativo, pagando com Enter e Espaço tratados à mão. Agora o desenho é
// uma imagem, e o que se clica e se alcança por Tab é um `<button>` por cima
// dela: teclado, foco e leitor de tela vêm de graça, e o atalho de pausa do
// main.ts já ignora teclas que nascem num botão.
//
// **As máscaras nascem no navegador.** Quando a imagem carrega, um `<canvas>` lê
// os pixels, separa terra de água e pinta, para cada região, uma máscara e um
// contorno. Nenhuma imagem gerada entra no repositório: só o mapa e os
// polígonos. Sem canvas — ou com um canvas que não deixa ler os pixels —, o mapa
// fica sem os realces, e as oito etiquetas continuam fazendo tudo.
//
// A regra de ouro do §3 continua valendo na direção que importa: este arquivo
// importa do engine; nenhum arquivo do engine importa daqui.

import worldImage from '../assets/map/world.jpg';
import { ui } from '../data/i18n';
import { medalFor, MEDAL_CEILING, type Medal } from '../engine/outcome';
import { balance, REGION_IDS, type GameState, type RegionId } from '../engine/state';
import {
  LABEL_ANCHORS,
  MAP_SIZE,
  edgeOf,
  halfMask,
  hitGrid,
  landOf,
  rasterizeRegions,
  regionAt,
  regionCode,
} from './map-geometry';

// ---------------------------------------------------------------- a view ---

/**
 * O quanto o mundo esquentou, em faixas (P7-04).
 *
 * **As faixas são os tetos das medalhas do §2.7**, e quem decide a faixa é o
 * `medalFor` do engine — a mesma função que concede a medalha. Uma segunda
 * leitura dos limiares aqui seria o jeito de o mapa e a tela de fim discordarem
 * em silêncio.
 */
export type MapHeat = Medal | 'over';

export type RegionAlertKind = 'event' | 'support';

/**
 * O alerta pendurado na etiqueta.
 *
 * **Ícone mais palavra escrita, nunca a cor sozinha** (§5 do GDD): tire as cores
 * da tela e continua escrito `evento` ou `crítico` em cima da região.
 */
export type RegionAlert = {
  readonly kind: RegionAlertKind;
  readonly icon: string;
  readonly label: string;
};

export type RegionCell = {
  readonly id: RegionId;
  readonly name: string;
  /** "Apoio 50" — rótulo mais valor, nunca o número sozinho (§5 do GDD). */
  readonly support: string;
  /** O apoio que a etiqueta mostra, de 0 a 100: o número e a largura do medidor. */
  readonly supportValue: number;
  /** Se esse mesmo número está abaixo do piso de apatia. */
  readonly low: boolean;
  /** A frase que o leitor de tela lê no lugar da etiqueta. */
  readonly ariaLabel: string;
  readonly selected: boolean;
  /** O sinal visível de seleção. Vazio quando a região não está escolhida. */
  readonly marker: string;
  /** Onde o centro da etiqueta pousa, em fração do desenho — de 0 a 1. */
  readonly anchor: { readonly left: number; readonly top: number };
  /** `null` quando não há nada a avisar sobre esta região. */
  readonly alert: RegionAlert | null;
};

export type MapView = {
  readonly cells: readonly RegionCell[];
  readonly selected: RegionId | null;
  readonly heat: MapHeat;
  /**
   * O quanto a terra já secou: 0 na temperatura em que a partida começa, 1 no
   * limiar da derrota. Os dois extremos são do balance.json, e não números
   * novos.
   */
  readonly heatLevel: number;
  /** A faixa dita por escrito. É o que impede o aquecimento de ser só cor (§5). */
  readonly heatCaption: string;
};

/** O limiar que define cada faixa de aquecimento. */
const HEAT_CEILING: Readonly<Record<MapHeat, number>> = {
  gold: MEDAL_CEILING.gold,
  silver: MEDAL_CEILING.silver,
  bronze: MEDAL_CEILING.bronze,
  // Acima do bronze não há teto seguinte: o número que descreve essa faixa é o
  // que ela já ultrapassou.
  over: MEDAL_CEILING.bronze,
};

const threshold = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 2 });
const whole = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 0 });

/** A faixa em que o mundo está, e a frase que a nomeia. */
function heatFor(state: GameState): { readonly heat: MapHeat; readonly caption: string } {
  const heat: MapHeat = medalFor(state.temperature) ?? 'over';
  const limit = `${threshold.format(HEAT_CEILING[heat])} ${ui.units.celsius}`;

  return { heat, caption: ui.map.heat.caption(ui.map.heat[heat](limit)) };
}

/** O quanto a terra secou, de 0 a 1 — ver `MapView.heatLevel`. */
function heatLevelFor(state: GameState): number {
  const span = balance.loseTemperature - balance.startTemperature;
  const level = (state.temperature - balance.startTemperature) / span;
  return Math.min(1, Math.max(0, level));
}

/**
 * O alerta de uma região, ou `null` quando não há o que avisar.
 *
 * **A prioridade é regra, não gosto.** Com evento em cena e apoio abaixo do piso
 * ao mesmo tempo, quem aparece é o evento, porque ele é o único dos dois que não
 * tem outro lugar no mapa: o apoio crítico continua escrito no número da
 * própria etiqueta, e pintado de hachura no desenho.
 *
 * **O limiar do apoio é o `supportFloor`, e não um número novo.** O tick.ts
 * registra que o desgaste do tempo *para* no piso: uma região abaixo dele não
 * chegou ali sozinha — foi um evento (P7-01) ou a Inércia (P7-03) que a furou.
 */
function alertFor(state: GameState, id: RegionId, low: boolean): RegionAlert | null {
  if (state.activeEvents.some((active) => active.target === id)) {
    return { kind: 'event', ...ui.map.alert.event };
  }
  if (low) return { kind: 'support', ...ui.map.alert.support };
  return null;
}

/**
 * Traduz o estado da partida no mapa inteiro.
 *
 * `selected` chega de fora e não sai do GameState: onde o jogador está olhando
 * não é estado da partida, é estado da tela. O porquê está no main.ts.
 *
 * O apoio é **arredondado**, igual ao apoio médio do HUD e ao painel da região.
 * **E o alerta de apoio crítico olha para esse mesmo número arredondado** (VIS-02
 * achou o defeito): antes ele comparava o valor exato, e uma região em 24,99
 * aparecia como "Apoio 25" e "▲ crítico" ao mesmo tempo — a tela dizendo duas
 * coisas contra o próprio piso de 25.
 */
export function mapView(state: GameState, selected: RegionId | null): MapView {
  const cells = REGION_IDS.map((id): RegionCell => {
    const region = state.regions[id];
    const value = Math.round(region.support);
    const low = value < balance.supportFloor;
    const alert = alertFor(state, id, low);
    const shown = whole.format(value);
    const anchor = LABEL_ANCHORS[id];

    return {
      id,
      name: region.name,
      support: ui.map.support(shown),
      supportValue: value,
      low,
      // O alerta entra na frase falada, e não só no desenho: quem não enxerga o
      // mapa precisa saber que a região foi atingida pelo mesmo caminho por que
      // fica sabendo o apoio dela.
      ariaLabel:
        ui.map.cell(region.name, shown) + (alert === null ? '' : ui.map.alert.said(alert.label)),
      selected: selected === id,
      marker: selected === id ? ui.map.selectedMarker : '',
      anchor: { left: anchor.x / MAP_SIZE.width, top: anchor.y / MAP_SIZE.height },
      alert,
    };
  });

  const { heat, caption } = heatFor(state);
  return { cells, selected, heat, heatLevel: heatLevelFor(state), heatCaption: caption };
}

// ---------------------------------------------------------- as máscaras ---

/** As máscaras de um mapa, já prontas para virar `mask-image`. */
type MapMasks = {
  readonly regions: ReadonlyMap<RegionId, string>;
  readonly edges: ReadonlyMap<RegionId, string>;
  readonly land: string;
  readonly hit: HitGrid;
};

/** A grade de clique, na mesma meia resolução das máscaras. */
type HitGrid = { readonly cells: Uint8Array; readonly width: number; readonly height: number };

/**
 * Quantas células da grade de clique um clique no mar ainda alcança.
 *
 * Três células de meia resolução são seis pixels da imagem — o bastante para
 * acertar uma ilha pequena sem que um clique no meio do oceano escolha nada.
 */
const HIT_RADIUS = 3;

/** As grades de clique de cada mapa montado. */
const hitGrids = new WeakMap<Element, HitGrid>();

/** Os pixels da imagem, ou `null` quando o navegador não deixa lê-los. */
function readPixels(image: HTMLImageElement): Uint8ClampedArray | null {
  const canvas = document.createElement('canvas');
  canvas.width = MAP_SIZE.width;
  canvas.height = MAP_SIZE.height;
  const context = canvas.getContext('2d', { willReadFrequently: true });
  if (context === null) return null;

  context.drawImage(image, 0, 0, MAP_SIZE.width, MAP_SIZE.height);
  try {
    return context.getImageData(0, 0, MAP_SIZE.width, MAP_SIZE.height).data;
  } catch {
    // Canvas contaminado: a imagem veio de uma origem que não deixa ler os
    // pixels. O mapa segue sem realces, e as etiquetas seguem funcionando.
    return null;
  }
}

/** Uma máscara em alfa vira um PNG branco com aquela transparência. */
function toDataUrl(alpha: Uint8ClampedArray, width: number, height: number): string {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext('2d');
  if (context === null) return '';

  const image = context.createImageData(width, height);
  for (let i = 0; i < alpha.length; i += 1) {
    image.data.fill(255, i * 4, i * 4 + 3);
    image.data[i * 4 + 3] = alpha[i] ?? 0;
  }
  context.putImageData(image, 0, 0);
  return canvas.toDataURL('image/png');
}

/** As máscaras das oito regiões, o contorno de cada uma, a terra e o clique. */
function buildMasks(image: HTMLImageElement): MapMasks | null {
  const { width, height } = MAP_SIZE;
  const pixels = readPixels(image);
  if (pixels === null) return null;

  const land = landOf(pixels, width, height);
  const regions = rasterizeRegions(width, height, 1);
  const half = { width: Math.floor(width / 2), height: Math.floor(height / 2) };
  const masks = REGION_IDS.map((id) => ({
    id,
    alpha: halfMask(regions, land, width, height, regionCode(id)),
  }));
  const png = (alpha: Uint8ClampedArray): string => toDataUrl(alpha, half.width, half.height);

  return {
    regions: new Map(masks.map(({ id, alpha }) => [id, png(alpha)])),
    edges: new Map(masks.map(({ id, alpha }) => [id, png(edgeOf(alpha, half.width, half.height))])),
    land: png(halfMask(regions, land, width, height, 0)),
    hit: { cells: hitGrid(masks.map(({ alpha }) => alpha)), ...half },
  };
}

function setMask(target: Element | null, url: string | undefined): void {
  if (!(target instanceof HTMLElement) || url === undefined || url === '') return;
  target.style.setProperty('-webkit-mask-image', `url("${url}")`);
  target.style.setProperty('mask-image', `url("${url}")`);
}

/** Pendura as máscaras nas camadas do mapa e liga a grade de clique. */
function applyMasks(stage: HTMLElement, image: HTMLImageElement): void {
  const masks = buildMasks(image);
  if (masks === null) {
    stage.dataset.masks = 'unavailable';
    return;
  }

  for (const id of REGION_IDS) {
    const layer = stage.querySelector(`[data-layer="${id}"]`);
    setMask(layer?.querySelector('.map__light') ?? null, masks.regions.get(id));
    setMask(layer?.querySelector('.map__state') ?? null, masks.regions.get(id));
    setMask(layer?.querySelector('.map__edge') ?? null, masks.edges.get(id));
  }
  setMask(stage.querySelector('.map__heat'), masks.land);

  hitGrids.set(stage, masks.hit);
  stage.dataset.masks = 'ready';
}

/**
 * Roda quando a imagem estiver decodificada — agora, se ela já estiver.
 *
 * Em teste, com jsdom, a imagem nunca carrega: nenhum canvas é pedido, e é isso
 * que mantém a suíte sem o aviso de "não implementado" no rodapé.
 */
function whenLoaded(image: HTMLImageElement, run: () => void): void {
  if (image.complete && image.naturalWidth > 0) {
    run();
    return;
  }
  image.addEventListener('load', run, { once: true });
}

// ------------------------------------------------------------------- DOM ---

type Slot = 'marker' | 'support' | 'meter' | 'alert' | 'heat';

function element<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  className: string,
  slot?: Slot,
): HTMLElementTagNameMap[K] {
  const created = document.createElement(tag);
  created.className = className;
  if (slot !== undefined) created.dataset.map = slot;
  return created;
}

/** Uma camada de realce por região: a luz, o estado e o contorno. */
function layerElement(id: RegionId): HTMLDivElement {
  const layer = element('div', 'map__layer');
  layer.dataset.layer = id;
  layer.setAttribute('aria-hidden', 'true');

  const halo = element('div', 'map__halo');
  halo.append(element('div', 'map__edge'));
  layer.append(element('div', 'map__light'), element('div', 'map__state'), halo);
  return layer;
}

/**
 * A etiqueta de uma região: nome, apoio, medidor e o alerta pendurado.
 *
 * O marcador de seleção e o medidor são decoração para o leitor de tela: quem
 * diz que a região está escolhida é o `aria-pressed`, e quem diz o apoio é a
 * frase do `aria-label`.
 */
function labelElement(cell: RegionCell): HTMLButtonElement {
  const button = element('button', 'map__label');
  button.type = 'button';
  button.dataset.region = cell.id;
  button.style.left = `${cell.anchor.left * 100}%`;
  button.style.top = `${cell.anchor.top * 100}%`;

  const marker = element('span', 'map__marker', 'marker');
  marker.setAttribute('aria-hidden', 'true');
  const name = element('span', 'map__name');
  name.textContent = cell.name;
  const head = element('span', 'map__head');
  head.append(marker, name);

  const meter = element('span', 'map__meter', 'meter');
  meter.setAttribute('aria-hidden', 'true');
  // O piso de apatia marcado dentro do medidor, na escala de 0 a 100 do apoio.
  meter.style.setProperty('--piso', `${balance.supportFloor}%`);
  meter.append(document.createElement('i'));
  const row = element('span', 'map__row');
  row.append(element('span', 'map__support', 'support'), meter);

  button.append(head, row, element('span', 'map__alert', 'alert'));
  return button;
}

/** Acende a região sob o ponteiro, e só ela. */
function setHover(stage: HTMLElement, id: RegionId | null): void {
  for (const layer of stage.querySelectorAll<HTMLElement>('[data-layer]')) {
    if (layer.dataset.layer === id) layer.dataset.hover = '';
    else delete layer.dataset.hover;
  }
  stage.dataset.pointer = id === null ? '' : 'region';
}

/** A região da etiqueta sob o ponteiro, ou `null` fora das etiquetas. */
function labelUnder(target: EventTarget | null): RegionId | null {
  const button = target instanceof Element ? target.closest<HTMLElement>('.map__label') : null;
  return REGION_IDS.find((id) => id === button?.dataset.region) ?? null;
}

/**
 * O ponteiro sobre o desenho: acender a região sob ele e escolhê-la no clique.
 *
 * A grade de clique só existe depois das máscaras; antes disso, e em qualquer
 * navegador que não as produza, o desenho não reage — e as etiquetas, sim.
 */
function wirePointer(stage: HTMLElement, onSelect: (id: RegionId) => void): void {
  const regionUnder = (event: MouseEvent): RegionId | null => {
    const grid = hitGrids.get(stage);
    const box = stage.getBoundingClientRect();
    if (grid === undefined || box.width === 0 || box.height === 0) return null;

    const x = ((event.clientX - box.left) / box.width) * grid.width;
    const y = ((event.clientY - box.top) / box.height) * grid.height;
    return regionAt(grid.cells, grid.width, grid.height, x, y, HIT_RADIUS);
  };

  // Em cima de uma etiqueta vale a região dela, mesmo que o desenho embaixo seja
  // mar ou outra região.
  stage.addEventListener('mousemove', (event) => {
    setHover(stage, labelUnder(event.target) ?? regionUnder(event));
  });
  stage.addEventListener('mouseleave', () => setHover(stage, null));
  stage.addEventListener('click', (event) => {
    // A etiqueta tem o próprio clique; contar este também desmarcaria de volta.
    if (labelUnder(event.target) !== null) return;
    const id = regionUnder(event);
    if (id !== null) onSelect(id);
  });
}

/**
 * Monta o mapa uma vez e já escreve o estado atual nele.
 *
 * Recebe a view pelo mesmo motivo do `mountTree`: os nomes das oito regiões vêm
 * do estado, e lê-los uma segunda vez aqui só criaria uma segunda ordem para
 * discordar da primeira.
 */
export function mountMap(root: Element, view: MapView, onSelect: (id: RegionId) => void): void {
  root.setAttribute('aria-label', ui.map.label);

  const intro = element('p', 'map__intro');
  intro.textContent = ui.map.intro;

  // As duas imagens são a mesma: a de baixo é o mapa, a de cima é a mesma terra
  // passada por um filtro de secura, recortada pela máscara da terra. O
  // navegador decodifica o arquivo uma vez só.
  const image = element('img', 'map__image');
  const heat = element('img', 'map__heat');
  for (const picture of [image, heat]) {
    picture.src = worldImage;
    picture.alt = '';
    picture.decoding = 'async';
    picture.draggable = false;
  }
  heat.setAttribute('aria-hidden', 'true');

  const haze = element('div', 'map__haze');
  haze.setAttribute('aria-hidden', 'true');

  const stage = element('div', 'map__stage');
  stage.dataset.masks = 'pending';
  stage.append(image, heat, haze, ...REGION_IDS.map(layerElement));
  for (const cell of view.cells) {
    const button = labelElement(cell);
    button.addEventListener('click', () => onSelect(cell.id));
    stage.append(button);
  }

  // A legenda do aquecimento (P7-04). É o que impede o aquecimento de ser só cor
  // (§5). Desde o VIS-04 ela fica no canto de baixo do desenho, sobre o mar
  // onde a Antártida foi cortada: embaixo do mapa, ela tirava da altura que a
  // tela cheia precisa para o mapa crescer.
  const caption = element('p', 'map__caption', 'heat');

  const frame = element('div', 'map__frame');
  frame.append(stage, caption);
  // O rolador existe por causa do §5: a etiqueta tem 16 px, e o mapa não pode
  // encolher abaixo da largura em que as oito cabem sem se tocar. Numa tela
  // estreita ele rola de lado, dentro da própria caixa; a página, não.
  const scroll = element('div', 'map__scroll');
  scroll.append(frame);

  root.replaceChildren(intro, scroll);
  wirePointer(stage, onSelect);
  whenLoaded(image, () => applyMasks(stage, image));
  renderMap(root, view);
}

function slot(parent: ParentNode, name: Slot): HTMLElement | null {
  return parent.querySelector<HTMLElement>(`[data-map="${name}"]`);
}

function setText(target: HTMLElement | null, text: string): void {
  if (target !== null && target.textContent !== text) target.textContent = text;
}

/** O que a camada da região mostra: escolhida, atingida, com apoio crítico. */
function layerState(cell: RegionCell): string {
  const states: string[] = [];
  if (cell.selected) states.push('selected');
  if (cell.alert?.kind === 'event') states.push('event');
  if (cell.low) states.push('low');
  return states.join(' ');
}

function renderLabel(button: HTMLElement, cell: RegionCell): void {
  button.dataset.selected = String(cell.selected);
  button.dataset.level = cell.low ? 'low' : 'ok';
  // `aria-pressed`, e não `aria-current`: o clique numa região já escolhida a
  // desmarca, então isto é um interruptor de dois estados.
  button.setAttribute('aria-pressed', String(cell.selected));
  button.setAttribute('aria-label', cell.ariaLabel);

  setText(slot(button, 'marker'), cell.marker);
  setText(slot(button, 'support'), cell.support);
  slot(button, 'meter')?.style.setProperty(
    '--apoio',
    `${Math.min(100, Math.max(0, cell.supportValue))}%`,
  );

  const alert = slot(button, 'alert');
  if (alert === null) return;
  setText(alert, cell.alert === null ? '' : `${cell.alert.icon} ${cell.alert.label}`);
  if (cell.alert === null) alert.removeAttribute('data-alert');
  else alert.setAttribute('data-alert', cell.alert.kind);
}

/**
 * Devolve o foco do teclado à etiqueta de uma região (P5-04).
 *
 * Existe por causa do painel de detalhe: quando ele fecha, o botão que tinha o
 * foco desaparece da tela, e sem isto o foco cairia no `<body>`. Devolve se
 * conseguiu, em vez de falhar calado.
 */
export function focusRegion(root: ParentNode, id: RegionId): boolean {
  const button = root.querySelector<HTMLButtonElement>(`button[data-region="${id}"]`);
  if (button === null) return false;

  button.focus();
  return true;
}

/**
 * Escreve o estado atual no mapa já montado.
 *
 * **Atualiza em vez de reconstruir**, como a árvore e pelo mesmo motivo: o mapa
 * redesenha a cada mês de jogo, e recriar as etiquetas arrancaria o foco do
 * teclado de quem estivesse navegando por elas.
 */
export function renderMap(root: ParentNode, view: MapView): void {
  for (const cell of view.cells) {
    const button = root.querySelector<HTMLElement>(`button[data-region="${cell.id}"]`);
    if (button !== null) renderLabel(button, cell);

    const layer = root.querySelector<HTMLElement>(`[data-layer="${cell.id}"]`);
    if (layer !== null) layer.dataset.state = layerState(cell);
  }

  // O aquecimento vive no palco, e não em cada região: são oito camadas lendo a
  // mesma faixa, e escrevê-la oito vezes seria oito lugares para ela ficar
  // dessincronizada por um quadro.
  const stage = root.querySelector<HTMLElement>('.map__stage');
  if (stage !== null) {
    stage.dataset.heat = view.heat;
    stage.style.setProperty('--calor', view.heatLevel.toFixed(3));
  }

  setText(slot(root, 'heat'), view.heatCaption);
}
