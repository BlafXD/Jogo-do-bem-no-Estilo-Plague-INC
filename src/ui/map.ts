// O mapa esquemático das 8 regiões (P5-01). As regiões estão no docs/GDD.md §2.3.
//
// Mesma divisão do hud.ts, do tree.ts e do contain.ts: `mapView` é **puro** —
// entra GameState, sai o mapa inteiro em texto e coordenada — e só `mountMap` e
// `renderMap` tocam no DOM.
//
// **Por que este arquivo existe.** O engine simula as oito regiões desde o
// P6-01: o climate.ts cresce emissão região a região, o events.ts acerta um
// alvo, a Inércia derruba apoio localmente e as habilidades aplicam efeito
// regional. Nada disso aparecia na tela — o HUD mostra a **média** do apoio, e
// uma média esconde exatamente o que interessa: que a África pode estar em 12
// enquanto a Europa está em 68. Metade da simulação rodava invisível.
//
// **Por que o apoio, e não as emissões.** O HUD já mostra a emissão global, e a
// emissão de uma região é um número pequeno com decimal (0,56 a 16,4 Gt) que se
// lê mal de longe. O apoio é o número que só existe em média no HUD, é o que os
// eventos e a Inércia atacam, e é uma das duas condições de derrota do §2.7 —
// zerar nas oito regiões dissolve a agência. É o que o jogador precisa ver
// chegando.
//
// **Por que formas geométricas, e não um mapa-múndi de verdade.** O corte de
// escopo do modo solo (PLANO.md) diz "mapa esquemático" e "formas + ícones
// CC0"; um contorno de continente traçado de outra fonte esbarraria na regra 10
// e no §12. Blocos arredondados em posição aproximadamente geográfica dizem
// "onde" sem copiar nada de ninguém.
//
// A regra de ouro do §3 continua valendo na direção que importa: este arquivo
// importa do engine; nenhum arquivo do engine importa daqui.

import { ui } from '../data/i18n';
import { medalFor, MEDAL_CEILING, type Medal } from '../engine/outcome';
import { balance, REGION_IDS, type GameState, type RegionId } from '../engine/state';

// ------------------------------------------------------------- geometria ---

export type RegionShape = {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
};

/** O sistema de coordenadas do SVG. Tudo abaixo é em unidade de viewBox. */
export const MAP_VIEWBOX = { width: 1000, height: 620 } as const;

/**
 * Onde cada região fica no desenho.
 *
 * **Não vai para o balance.json nem para o regions.json**, e os dois motivos
 * são diferentes. Do balance.json porque a regra 8 fala de número de
 * balanceamento — coordenada de desenho não muda o jogo, muda o layout, e
 * misturá-la com o TCRE faria o arquivo de constantes deixar de ser legível
 * como planilha. Do regions.json porque aquele arquivo é o contrato de edição
 * do pacote [D-Historia] (PLANO.md): quem for escrever o nome de uma região não
 * deve tropeçar em `x` e `height`, nem poder quebrar o mapa mexendo em texto.
 *
 * A disposição é aproximadamente geográfica — Américas à esquerda, Ásia à
 * direita, Oceania no canto inferior. O tests/map.test.ts cobra que nenhuma
 * forma invada a outra e que todas caibam no viewBox.
 */
export const REGION_SHAPES: Readonly<Record<RegionId, RegionShape>> = {
  na: { x: 40, y: 40, width: 230, height: 170 },
  la: { x: 150, y: 250, width: 180, height: 230 },
  eu: { x: 400, y: 40, width: 170, height: 130 },
  af: { x: 390, y: 215, width: 190, height: 240 },
  me: { x: 610, y: 190, width: 170, height: 140 },
  ea: { x: 650, y: 40, width: 290, height: 140 },
  sa: { x: 610, y: 345, width: 190, height: 140 },
  oc: { x: 810, y: 460, width: 170, height: 130 },
};

/**
 * Os tamanhos de fonte, em unidade de viewBox.
 *
 * Ficam aqui, e não no CSS, porque o cálculo de onde cada linha de texto pousa
 * depende deles — e uma medida que o TypeScript usa para posicionar e o CSS usa
 * para desenhar, cada um com o seu próprio valor, é uma discordância esperando
 * acontecer. O `mountMap` os escreve como atributo de apresentação, que é a
 * forma de menor precedência: o theme.css do P5-02 ainda pode assumir o
 * controle com uma regra de CSS, se o Design quiser outra escala.
 *
 * **Não são livres.** O §5 do GDD fixa 16px como piso para todo texto, e o SVG
 * encolhe junto com a tela: o `min-width` do map.css é o que garante que 26
 * unidades nunca desçam abaixo desse piso. Mexer num dos dois é mexer no outro.
 */
export const NAME_FONT_SIZE = 26;
export const SUPPORT_FONT_SIZE = 26;
export const MARKER_FONT_SIZE = 30;
export const ALERT_FONT_SIZE = 22;

/** Distância entre as duas linhas do nome. */
const NAME_LINE_HEIGHT = 30;

/** Linha de base do marcador de seleção e do alerta, medida do topo da forma. */
const CORNER_Y = 28;

/**
 * O quanto o nome tem que descer para não entrar na faixa dos cantos.
 *
 * **Isto existe por causa de um defeito visto no navegador**, e não por
 * precaução: com o alerta do P7-04 no canto direito, as três formas de 140 de
 * altura com nome em duas linhas — Ásia Oriental, Oriente Médio e Ásia
 * Meridional — desenhavam "▲ crítico" **por cima** do nome. O bloco de texto é
 * centrado na forma, e numa forma baixa o centro sobe até a faixa dos cantos.
 *
 * O piso é a soma que dá folga: a base do alerta cai em `CORNER_Y`, a descida
 * dele vai a cerca de `+5`, e a primeira linha do nome sobe cerca de `19` acima
 * da própria base. `28 + 5 + 19 = 52`, e 56 deixa 4 unidades de sobra.
 *
 * Vale para as duas linhas do bloco: o apoio desce junto, para o espaçamento
 * entre nome e apoio continuar o mesmo. Nas formas altas o piso nunca é
 * alcançado e nada se move.
 */
const NAME_TOP_LIMIT = 56;

export type CellText = {
  /** O eixo em que o nome e o apoio se centram. */
  readonly cx: number;
  /** Linha de base da primeira linha do nome. */
  readonly nameY: number;
  readonly lineHeight: number;
  /** Linha de base do apoio. */
  readonly supportY: number;
  readonly markerX: number;
  readonly markerY: number;
  /** O canto do alerta (P7-04): o oposto do marcador de seleção. */
  readonly alertX: number;
  readonly alertY: number;
};

/**
 * Onde o texto de uma região pousa dentro da forma.
 *
 * O bloco de texto é centrado na forma, e o deslocamento depende de o nome ter
 * quebrado em duas linhas ou não — sem isso, "Europa" ficaria alto e "Ásia
 * Meridional" transbordaria por baixo. É função pura de propósito: o
 * tests/map.test.ts consegue cobrar que nada saia da forma sem precisar de
 * navegador, que é onde esse tipo de erro costuma ser descoberto tarde.
 */
export function textAnchors(shape: RegionShape, lines: number): CellText {
  const cx = shape.x + shape.width / 2;
  const cy = shape.y + shape.height / 2;
  const twoLines = lines >= 2;

  // O bloco quer ficar centrado; numa forma baixa ele é empurrado para baixo o
  // bastante para sair da faixa dos cantos. O empurrão depende só da **forma e
  // do nome**, nunca de haver alerta em cena — se dependesse, o nome pularia de
  // lugar toda vez que um evento caísse na região.
  const wantedNameY = cy - (twoLines ? 26 : 8);
  const nameY = Math.max(wantedNameY, shape.y + NAME_TOP_LIMIT);
  const push = nameY - wantedNameY;

  return {
    cx,
    nameY,
    lineHeight: NAME_LINE_HEIGHT,
    supportY: cy + (twoLines ? 48 : 30) + push,
    // O marcador de seleção mora no canto superior esquerdo, fora do caminho do
    // nome: ele aparece e some durante a partida, e se dividisse a linha com o
    // nome faria o nome pular de lugar a cada clique.
    markerX: shape.x + 16,
    markerY: shape.y + CORNER_Y,
    // Espelho do marcador, no canto oposto: os dois podem estar em cena ao
    // mesmo tempo (uma região escolhida que acabou de ser atingida) e nenhum
    // dos dois pode empurrar o nome de lugar.
    alertX: shape.x + shape.width - 16,
    alertY: shape.y + CORNER_Y,
  };
}

// ---------------------------------------------------------------- a view ---

/**
 * O quanto o mundo esquentou, em faixas (P7-04).
 *
 * **As faixas são os tetos das medalhas do §2.7**, e sai de graça o que isso
 * ensina: a cor do mapa é a mesma escala pela qual a tela de fim vai julgar a
 * partida. Quem vê as oito formas passarem de frias a quentes está vendo o ouro
 * e depois a prata ficarem para trás, antes de qualquer texto dizer isso.
 *
 * Quem decide a faixa é o `medalFor` do engine — a mesma função que concede a
 * medalha. Uma segunda leitura dos limiares aqui seria o jeito de o mapa e a
 * tela de fim discordarem em silêncio.
 */
export type MapHeat = Medal | 'over';

export type RegionAlertKind = 'event' | 'support';

/**
 * O alerta no canto da forma.
 *
 * **Ícone mais palavra escrita, nunca a cor sozinha** (§5 do GDD): tire as cores
 * da tela e continua escrito `evento` ou `crítico` no canto da região.
 */
export type RegionAlert = {
  readonly kind: RegionAlertKind;
  readonly icon: string;
  readonly label: string;
};

export type RegionCell = {
  readonly id: RegionId;
  readonly name: string;
  /** O nome quebrado em até duas linhas, para caber na forma. */
  readonly nameLines: readonly string[];
  /** "Apoio 50" — rótulo mais valor, nunca o número sozinho (§5 do GDD). */
  readonly support: string;
  /** A frase que o leitor de tela lê no lugar da forma. */
  readonly ariaLabel: string;
  readonly selected: boolean;
  /** O sinal visível de seleção. Vazio quando a região não está selecionada. */
  readonly marker: string;
  readonly shape: RegionShape;
  readonly text: CellText;
  /** `null` quando não há nada a avisar sobre esta região. */
  readonly alert: RegionAlert | null;
};

export type MapView = {
  readonly cells: readonly RegionCell[];
  readonly selected: RegionId | null;
  readonly heat: MapHeat;
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

/**
 * A faixa em que o mundo está, e a frase que a nomeia.
 *
 * O `?? 'over'` é a única tradução feita aqui: o `medalFor` devolve `null` acima
 * do bronze, e `null` não é nome de faixa de cor.
 */
function heatFor(state: GameState): { readonly heat: MapHeat; readonly caption: string } {
  const heat: MapHeat = medalFor(state.temperature) ?? 'over';
  const limit = `${threshold.format(HEAT_CEILING[heat])} ${ui.units.celsius}`;

  return { heat, caption: ui.map.heat.caption(ui.map.heat[heat](limit)) };
}

/**
 * O alerta de uma região, ou `null` quando não há o que avisar.
 *
 * **A prioridade é regra, não gosto.** Com evento em cena e apoio abaixo do
 * piso ao mesmo tempo, quem aparece é o evento — porque ele é o único dos dois
 * que não tem outro lugar no mapa. O apoio crítico continua escrito na própria
 * forma, no número logo abaixo do nome; um `Apoio 18` já denuncia o estado sem
 * ajuda de canto nenhum.
 *
 * **O limiar do apoio é o `supportFloor`, e não um número novo.** O tick.ts
 * registra que o desgaste do tempo *para* no piso: uma região abaixo dele não
 * chegou ali sozinha — foi um evento (P7-01) ou a Inércia (P7-03) que a furou.
 * É a diferença entre "o tempo passou" e "alguma coisa quebrou aqui", e ela já
 * está medida no balance.json.
 */
function alertFor(state: GameState, id: RegionId): RegionAlert | null {
  if (state.activeEvents.some((active) => active.target === id)) {
    return { kind: 'event', ...ui.map.alert.event };
  }
  if (state.regions[id].support < balance.supportFloor) {
    return { kind: 'support', ...ui.map.alert.support };
  }
  return null;
}

const whole = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 0 });

/**
 * Quebra o nome em até duas linhas, no ponto que deixa as duas mais parecidas.
 *
 * "América do Norte" vira "América" / "do Norte" (7 e 8 caracteres) em vez de
 * "América do" / "Norte" (10 e 5). A diferença importa porque as formas são
 * estreitas: é a linha mais longa que decide se o texto cabe.
 *
 * Nunca quebra em três — nenhum dos oito nomes precisa, e uma terceira linha
 * não caberia na altura das formas menores. Se um dia entrar um nome de quatro
 * palavras, é o teste de "o texto cabe na forma" que vai reclamar primeiro.
 */
export function nameLines(name: string): readonly string[] {
  const words = name.split(' ');
  if (words.length < 2) return [name];

  let cut = 1;
  let smallest = Number.POSITIVE_INFINITY;

  for (let index = 1; index < words.length; index += 1) {
    const left = words.slice(0, index).join(' ').length;
    const right = words.slice(index).join(' ').length;
    const difference = Math.abs(left - right);

    if (difference < smallest) {
      smallest = difference;
      cut = index;
    }
  }

  return [words.slice(0, cut).join(' '), words.slice(cut).join(' ')];
}

/**
 * Traduz o estado da partida no mapa inteiro.
 *
 * `selected` chega de fora e não sai do GameState: onde o jogador está olhando
 * não é estado da partida, é estado da tela. O porquê está no main.ts.
 *
 * O apoio é **arredondado**, igual ao apoio médio do HUD. Aqui não vale a regra
 * do PAC (truncar, para o número na tela não prometer o que a ação vai negar):
 * ninguém gasta apoio, ele só é lido — e mostrar 49 para 49,7 afastaria a soma
 * das oito da média que o HUD mostra logo acima.
 */
export function mapView(state: GameState, selected: RegionId | null): MapView {
  const cells = REGION_IDS.map((id): RegionCell => {
    const region = state.regions[id];
    const shape = REGION_SHAPES[id];
    const lines = nameLines(region.name);
    const support = whole.format(Math.round(region.support));
    const isSelected = selected === id;
    const alert = alertFor(state, id);

    return {
      id,
      name: region.name,
      nameLines: lines,
      support: ui.map.support(support),
      // O alerta entra na frase falada, e não só no canto do desenho: quem não
      // enxerga o mapa precisa saber que a região foi atingida pelo mesmo
      // caminho por que fica sabendo o apoio dela.
      ariaLabel:
        ui.map.cell(region.name, support) + (alert === null ? '' : ui.map.alert.said(alert.label)),
      selected: isSelected,
      marker: isSelected ? ui.map.selectedMarker : '',
      shape,
      text: textAnchors(shape, lines.length),
      alert,
    };
  });

  const { heat, caption } = heatFor(state);
  return { cells, selected, heat, heatCaption: caption };
}

// ------------------------------------------------------------------- DOM ---

const SVG_NS = 'http://www.w3.org/2000/svg';

type Slot = 'support' | 'marker' | 'alert';

function svg<K extends keyof SVGElementTagNameMap>(tag: K): SVGElementTagNameMap[K] {
  return document.createElementNS(SVG_NS, tag);
}

/**
 * Monta a forma de uma região: o bloco, o marcador, o nome e o apoio.
 *
 * **É um `<g role="button">`, e não um `<button>` de verdade**, e essa é a
 * única vez no projeto em que a UI abre mão do elemento nativo. Um `<button>`
 * não pode conter um `<rect>` de SVG, e envolver o desenho em oito botões de
 * HTML posicionados por cima exigiria manter duas geometrias em sincronia — a
 * do desenho e a dos botões —, que é justamente o tipo de duplicação que este
 * projeto evita em todo lugar. O preço é ter que tratar Enter e Espaço à mão,
 * que é o que o `keydown` abaixo faz.
 */
function regionElement(cell: RegionCell, onSelect: (id: RegionId) => void): SVGGElement {
  const group = svg('g');
  group.setAttribute('class', 'map__region');
  group.dataset.region = cell.id;
  group.setAttribute('role', 'button');
  group.setAttribute('tabindex', '0');

  const shape = svg('rect');
  shape.setAttribute('class', 'map__shape');
  shape.setAttribute('x', String(cell.shape.x));
  shape.setAttribute('y', String(cell.shape.y));
  shape.setAttribute('width', String(cell.shape.width));
  shape.setAttribute('height', String(cell.shape.height));
  shape.setAttribute('rx', '14');

  const marker = svg('text');
  marker.setAttribute('class', 'map__marker');
  marker.dataset.map = 'marker';
  marker.setAttribute('x', String(cell.text.markerX));
  marker.setAttribute('y', String(cell.text.markerY));
  marker.setAttribute('font-size', String(MARKER_FONT_SIZE));
  // Decoração: quem diz ao leitor de tela que a região está escolhida é o
  // `aria-pressed` do grupo, e repetir isso em texto faria a leitura anunciar
  // duas vezes a mesma coisa.
  marker.setAttribute('aria-hidden', 'true');

  const name = svg('text');
  name.setAttribute('class', 'map__name');
  name.setAttribute('x', String(cell.text.cx));
  name.setAttribute('y', String(cell.text.nameY));
  name.setAttribute('text-anchor', 'middle');
  name.setAttribute('font-size', String(NAME_FONT_SIZE));
  name.append(
    ...cell.nameLines.map((line, index) => {
      const span = svg('tspan');
      span.setAttribute('x', String(cell.text.cx));
      span.setAttribute('dy', index === 0 ? '0' : String(cell.text.lineHeight));
      span.textContent = line;
      return span;
    }),
  );

  const support = svg('text');
  support.setAttribute('class', 'map__support');
  support.dataset.map = 'support';
  support.setAttribute('x', String(cell.text.cx));
  support.setAttribute('y', String(cell.text.supportY));
  support.setAttribute('text-anchor', 'middle');
  support.setAttribute('font-size', String(SUPPORT_FONT_SIZE));

  // O alerta mora no canto oposto ao marcador de seleção, e é montado sempre —
  // vazio quando não há o que avisar. Criá-lo só quando aparece obrigaria o
  // renderMap a reconstruir o grupo, que é justamente o que ele evita para não
  // arrancar o foco do teclado de quem estiver navegando o mapa.
  const alert = svg('text');
  alert.setAttribute('class', 'map__alert');
  alert.dataset.map = 'alert';
  alert.setAttribute('x', String(cell.text.alertX));
  alert.setAttribute('y', String(cell.text.alertY));
  alert.setAttribute('text-anchor', 'end');
  alert.setAttribute('font-size', String(ALERT_FONT_SIZE));

  group.append(shape, marker, name, support, alert);
  group.addEventListener('click', () => onSelect(cell.id));

  group.addEventListener('keydown', (event) => {
    if (event.key !== 'Enter' && event.key !== ' ') return;

    // `preventDefault` porque a barra de espaço rola a página. `stopPropagation`
    // porque o main.ts escuta Espaço no `document` para pausar o jogo, e a
    // guarda de lá deixa passar tudo que não for `HTMLButtonElement` — um `<g>`
    // não é. Sem esta linha, escolher uma região pelo teclado pausaria a
    // partida junto: é o preço escondido de não usar um botão nativo, e ele se
    // paga aqui.
    event.preventDefault();
    event.stopPropagation();
    onSelect(cell.id);
  });

  return group;
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

  const intro = document.createElement('p');
  intro.className = 'map__intro';
  intro.textContent = ui.map.intro;

  const canvas = svg('svg');
  canvas.setAttribute('class', 'map__canvas');
  canvas.setAttribute('viewBox', `0 0 ${MAP_VIEWBOX.width} ${MAP_VIEWBOX.height}`);
  // O papel de grupo dá ao SVG algo que o leitor de tela reconhece como
  // recipiente de coisas focáveis. O nome acessível fica na seção, como nos
  // outros módulos — repeti-lo aqui faria a leitura anunciar o mapa duas vezes.
  canvas.setAttribute('role', 'group');
  canvas.append(...view.cells.map((cell) => regionElement(cell, onSelect)));

  // O rolador existe por causa do §5: o texto dentro do SVG encolhe junto com o
  // SVG, e abaixo de certa largura ele cairia sob o piso de 16px. O map.css
  // trava a largura mínima e deixa esta caixa rolar de lado — encolher o texto
  // seria trocar uma régua de acessibilidade por conforto de layout.
  const scroll = document.createElement('div');
  scroll.className = 'map__scroll';
  scroll.append(canvas);

  // A legenda do aquecimento (P7-04). Fica **abaixo** do desenho: ela explica
  // uma cor que já está na tela, e quem lê antes de olhar não tem o que ligar à
  // frase. É também o que impede o aquecimento de ser só cor (§5).
  const heat = document.createElement('p');
  heat.className = 'map__heat';
  heat.dataset.map = 'heat';

  root.replaceChildren(intro, scroll, heat);
  renderMap(root, view);
}

function slot(group: ParentNode, name: Slot): SVGElement | null {
  return group.querySelector<SVGElement>(`[data-map="${name}"]`);
}

/**
 * Devolve o foco do teclado à forma de uma região (P5-04).
 *
 * Existe por causa do painel de detalhe: quando ele fecha, o botão que tinha o
 * foco desaparece da tela, e sem isto o foco cairia no `<body>` — quem navega
 * por teclado voltaria ao começo da página e teria que atravessar o HUD, a barra
 * de tempo e os cartões de evento de novo para chegar ao mapa. O §5 do GDD pede
 * painel navegável por teclado; sair dele sem perder o lugar faz parte disso.
 *
 * Devolve se conseguiu, em vez de falhar calado: quem chama sabe que o foco
 * pode não ter ido a lugar nenhum.
 */
export function focusRegion(root: ParentNode, id: RegionId): boolean {
  const group = root.querySelector<SVGGElement>(`[data-region="${id}"]`);
  if (group === null) return false;

  group.focus();
  return true;
}

/**
 * Escreve o estado atual nas formas já montadas.
 *
 * **Atualiza em vez de reconstruir**, como a árvore e pelo mesmo motivo: o mapa
 * redesenha a cada mês de jogo, e recriar os oito grupos arrancaria o foco do
 * teclado de quem estivesse navegando — a cada 1,5 segundo na velocidade 1x.
 */
export function renderMap(root: ParentNode, view: MapView): void {
  for (const cell of view.cells) {
    const group = root.querySelector<SVGGElement>(`[data-region="${cell.id}"]`);
    if (group === null) continue;

    group.dataset.selected = String(cell.selected);
    // `aria-pressed`, e não `aria-current`: o clique numa região já escolhida a
    // desmarca, então isto é um interruptor de dois estados — que é exatamente
    // o que `pressed` descreve.
    group.setAttribute('aria-pressed', String(cell.selected));
    group.setAttribute('aria-label', cell.ariaLabel);

    const support = slot(group, 'support');
    if (support !== null) support.textContent = cell.support;

    const marker = slot(group, 'marker');
    if (marker !== null) marker.textContent = cell.marker;

    const alert = slot(group, 'alert');
    if (alert !== null) {
      // Texto vazio, e não `hidden`: um <text> sem conteúdo não pinta nada, e
      // assim o elemento continua no lugar para o próximo mês reaproveitar.
      alert.textContent = cell.alert === null ? '' : `${cell.alert.icon} ${cell.alert.label}`;
      if (cell.alert === null) alert.removeAttribute('data-alert');
      else alert.setAttribute('data-alert', cell.alert.kind);
    }
  }

  // O aquecimento vive no <svg>, e não no grupo de cada região: são oito formas
  // lendo a mesma faixa, e escrevê-la oito vezes seria oito lugares para ela
  // ficar dessincronizada por um quadro.
  const canvas = root.querySelector('.map__canvas');
  if (canvas !== null) canvas.setAttribute('data-heat', view.heat);

  const heat = root.querySelector('[data-map="heat"]');
  if (heat !== null) heat.textContent = view.heatCaption;
}
