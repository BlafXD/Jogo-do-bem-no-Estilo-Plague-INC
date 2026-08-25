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
import { REGION_IDS, type GameState, type RegionId } from '../engine/state';

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

/** Distância entre as duas linhas do nome. */
const NAME_LINE_HEIGHT = 30;

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

  return {
    cx,
    nameY: cy - (twoLines ? 26 : 8),
    lineHeight: NAME_LINE_HEIGHT,
    supportY: cy + (twoLines ? 48 : 30),
    // O marcador de seleção mora no canto superior esquerdo, fora do caminho do
    // nome: ele aparece e some durante a partida, e se dividisse a linha com o
    // nome faria o nome pular de lugar a cada clique.
    markerX: shape.x + 16,
    markerY: shape.y + 34,
  };
}

// ---------------------------------------------------------------- a view ---

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
};

export type MapView = {
  readonly cells: readonly RegionCell[];
  readonly selected: RegionId | null;
};

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

    return {
      id,
      name: region.name,
      nameLines: lines,
      support: ui.map.support(support),
      ariaLabel: ui.map.cell(region.name, support),
      selected: isSelected,
      marker: isSelected ? ui.map.selectedMarker : '',
      shape,
      text: textAnchors(shape, lines.length),
    };
  });

  return { cells, selected };
}

// ------------------------------------------------------------------- DOM ---

const SVG_NS = 'http://www.w3.org/2000/svg';

type Slot = 'support' | 'marker';

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

  group.append(shape, marker, name, support);
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

  root.replaceChildren(intro, scroll);
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
  }
}
