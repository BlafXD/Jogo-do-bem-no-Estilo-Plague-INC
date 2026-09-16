// A geometria do mapa ilustrado (VIS-03): a imagem, o recorte, o contorno das
// oito regiões e onde cada etiqueta pousa.
//
// **Tudo aqui é puro.** Entra número, sai número: nenhuma função encosta no DOM,
// e por isso tudo roda em node, nos testes, sem navegador. Quem pinta as
// máscaras num `<canvas>` é o map.ts, com as funções deste arquivo.
//
// **Por que isto não mora no balance.json nem no regions.json** — a mesma razão
// que o map.ts registrava para os retângulos do P5-01. Coordenada de desenho não
// é balanceamento: muda o layout, não o jogo. E o regions.json é o contrato de
// edição do [D-Historia], que não deve tropeçar em vértice nenhum.
//
// **De onde vêm os polígonos.** Foram traçados em pixels sobre a própria imagem,
// no protótipo do VIS-01 (docs/DIRECAO-DE-ARTE.md §6), e não calculados a partir
// de latitude e longitude: a imagem fica perto da projeção de Miller, mas com
// desvios locais de vários pixels. Cada fronteira em terra segue o recorte do
// docs/CIENCIA.md — a Rússia inteira na Europa, a Ásia Central no Oriente Médio,
// o Sudeste Asiático e a Indonésia na Ásia Oriental, o Egito na África.
//
// **Só a terra pertence a uma região.** Um polígono pode passar folgado pelo
// mar, porque o que é água sai pela cor da imagem (`isWater`); só as fronteiras
// em terra precisam ser precisas. E a ordem da lista é a ordem de pintura: quem
// vem depois ganha. É o que deixa a Europa ser uma caixa larga que as outras
// regiões recortam por cima.

import { REGION_IDS, type RegionId } from '../engine/state';

/** O tamanho da imagem, em pixels. Todas as coordenadas deste arquivo estão nesta escala. */
export const MAP_SIZE = { width: 1376, height: 768 } as const;

/**
 * Até onde a imagem aparece, de cima para baixo.
 *
 * A faixa branca da Antártida, de 620 para baixo, sai do quadro: nenhuma
 * mecânica usa aquela terra, e ela roubava a atenção do resto
 * (docs/DIRECAO-DE-ARTE.md §6 e §10).
 */
export const MAP_CROP_HEIGHT = 620;

export type RegionPolygon = {
  readonly region: RegionId;
  /** Os vértices em sequência — x1, y1, x2, y2... —, em pixels da imagem. */
  readonly points: readonly number[];
};

/** Os contornos, na ordem de pintura: o de baixo vence o de cima. */
export const REGION_POLYGONS: readonly RegionPolygon[] = [
  // Europa: uma caixa larga. Os outros recortam o que é deles por cima.
  {
    region: 'eu',
    points: [530, -10, 1390, -10, 1390, 245, 530, 245],
  },
  // A ponta da Chukotka, que a imagem repete na borda esquerda: é Rússia, logo
  // Europa.
  {
    region: 'eu',
    points: [-10, -10, 26, -10, 26, 77, -10, 77],
  },
  // África: Gibraltar, o meio do Mediterrâneo, o Sinai (de Rafah a Eilat), o Mar
  // Vermelho e o Golfo de Áden.
  {
    region: 'af',
    points: [
      560, 232, 615, 232, 630, 226, 641, 225, 660, 224.5, 680, 218, 700, 215.5, 708, 213, 713, 217,
      714, 226, 722, 230, 735, 236, 745, 237, 760, 234, 775, 237, 790, 241, 799, 245, 800, 262, 803,
      267, 808, 275, 815, 285, 820, 293, 826, 302, 833, 314, 840, 322, 850, 319, 860, 316, 870, 312,
      885, 316, 915, 330, 915, 400, 905, 560, 560, 560,
    ],
  },
  // Oriente Médio: Turquia, Cáucaso, Levante, Arábia, Irã e a Ásia Central.
  {
    region: 'me',
    points: [
      779, 192, 770, 196, 764, 204, 761, 210, 766, 219, 772, 224, 780, 226, 792, 235, 797, 243, 799,
      245, 800, 262, 803, 267, 808, 275, 815, 285, 820, 293, 826, 302, 833, 314, 840, 322, 850, 319,
      860, 316, 870, 312, 885, 316, 915, 330, 915, 295, 901, 272, 903, 268, 907, 265, 905, 260, 901,
      257, 899, 253, 902, 247, 899, 246, 898, 239, 899, 234, 900, 228, 904, 230, 912, 225, 919, 220,
      924, 222, 932, 220, 937, 218, 941, 222, 949, 221, 949, 216, 945, 211, 952, 206, 961, 203, 969,
      198, 971, 194, 969, 187, 977, 183, 979, 176, 988, 176, 988, 170, 994, 165, 984, 159, 968, 150,
      955, 140, 943, 140, 928, 132, 914, 138, 900, 141, 899, 147, 892, 156, 877, 158, 870, 153, 861,
      153, 854, 159, 849, 165, 848, 170, 852, 173, 856, 179, 857, 184, 855, 192, 850, 200, 845, 197,
      838, 193, 831, 192, 831, 194, 810, 196, 790, 195,
    ],
  },
  // Ásia Oriental: China, Mongólia, Coreias, Japão e o Sudeste Asiático, até o
  // meridiano 141° L.
  {
    region: 'ea',
    points: [
      949, 221, 949, 216, 945, 211, 952, 206, 961, 203, 969, 198, 971, 194, 969, 187, 977, 183, 979,
      176, 988, 176, 988, 170, 994, 165, 1000, 158, 1007, 155, 1016, 154, 1030, 152, 1035, 147,
      1041, 149, 1052, 151, 1064, 154, 1073, 154, 1079, 157, 1090, 157, 1103, 158, 1110, 152, 1116,
      146, 1122, 143, 1130, 141, 1140, 143, 1152, 150, 1162, 157, 1172, 165, 1170, 175, 1167, 185,
      1165, 195, 1166, 202, 1170, 204, 1190, 198, 1198, 185, 1203, 179, 1235, 178, 1250, 190, 1265,
      220, 1265, 290, 1180, 330, 1203, 350, 1203, 415, 1180, 402, 1150, 404, 1140, 406, 1110, 409,
      1080, 412, 1040, 412, 1010, 390, 1000, 355, 1022, 330, 1030, 318, 1030, 312, 1024, 300, 1018,
      292, 1021, 290, 1022, 286, 1025, 280, 1028, 273, 1032, 266, 1036, 260, 1025, 260, 1015, 260,
      1005, 259, 995, 256, 985, 252, 975, 247, 965, 240, 957, 232, 953, 226,
    ],
  },
  // Ásia Meridional: Afeganistão, Paquistão, Índia, Nepal, Butão, Bangladesh e
  // Sri Lanka.
  {
    region: 'sa',
    points: [
      901, 272, 903, 268, 907, 265, 905, 260, 901, 257, 899, 253, 902, 247, 899, 246, 898, 239, 899,
      234, 900, 228, 904, 230, 912, 225, 919, 220, 924, 222, 932, 220, 937, 218, 941, 222, 949, 221,
      953, 226, 957, 232, 965, 240, 975, 247, 985, 252, 995, 256, 1005, 259, 1015, 260, 1025, 260,
      1036, 260, 1032, 266, 1028, 273, 1025, 280, 1022, 286, 1021, 290, 1018, 292, 1015, 320, 1000,
      350, 985, 365, 960, 375, 935, 360, 930, 320, 925, 290,
    ],
  },
  // Oceania: Austrália, Nova Zelândia, a metade leste da Nova Guiné e o Pacífico.
  {
    region: 'oc',
    points: [
      1203, 360, 1215, 355, 1260, 345, 1390, 330, 1390, 560, 1060, 560, 1060, 420, 1080, 410, 1110,
      407, 1140, 404, 1150, 402, 1180, 400, 1203, 412,
    ],
  },
  // América Latina: uma caixa. A América do Norte recorta a fronteira por cima.
  {
    region: 'la',
    points: [100, 230, 520, 230, 520, 300, 560, 300, 560, 615, 100, 615],
  },
  // América do Norte: EUA, Canadá, Groenlândia e Havaí. A fronteira com o México
  // são os primeiros pontos.
  {
    region: 'na',
    points: [
      226, 240, 238, 243, 250, 246, 262, 247, 270, 253, 280, 258, 292, 262, 304, 262, 312, 262, 330,
      265, 345, 268, 365, 267, 366.5, 267, 367, 250, 370, 240, 390, 220, 420, 225, 470, 170, 530,
      140, 570, 95, 575, 55, 588, 40, 598, 12, 602, -10, 26, -10, 26, 77, 12, 78, 12, 92, -10, 92,
      -10, 310, 120, 310, 200, 250,
    ],
  },
];

export type MapPoint = { readonly x: number; readonly y: number };

/**
 * Onde o centro de cada etiqueta pousa, em pixels da imagem.
 *
 * Escolhidos para cair dentro da própria região e para as oito etiquetas não se
 * tocarem com o mapa na largura do tema — o tests/map-geometry.test.ts cobra as
 * duas coisas. O Oriente Médio e a Ásia Meridional são o par mais apertado: por
 * isso um sobe para a Turquia e o outro desce para a ponta da Índia.
 */
export const LABEL_ANCHORS: Readonly<Record<RegionId, MapPoint>> = {
  na: { x: 255, y: 150 },
  la: { x: 455, y: 420 },
  eu: { x: 745, y: 104 },
  af: { x: 712, y: 380 },
  me: { x: 798, y: 224 },
  ea: { x: 1085, y: 212 },
  sa: { x: 990, y: 342 },
  oc: { x: 1178, y: 468 },
};

// ---------------------------------------------------------- terra e água ---

/**
 * Se um pixel da imagem é água.
 *
 * É água onde o azul manda — ou empata com o verde, acima do vermelho, que é o
 * mar raso turquesa. Gelo e neve, quase brancos, não passam: o azul deles não
 * fica acima do vermelho. Medido sobre a própria imagem no VIS-01: os Grandes
 * Lagos, o Cáspio e o Mar Vermelho saem limpos.
 */
export function isWater(red: number, green: number, blue: number): boolean {
  return blue >= green - 6 && blue > red + 12;
}

/** Para cada pixel de uma imagem RGBA: 1 se é terra, 0 se é água. */
export function landOf(rgba: ArrayLike<number>, width: number, height: number): Uint8Array {
  const land = new Uint8Array(width * height);

  for (let i = 0; i < land.length; i += 1) {
    const at = i * 4;
    land[i] = isWater(rgba[at] ?? 0, rgba[at + 1] ?? 0, rgba[at + 2] ?? 0) ? 0 : 1;
  }

  return land;
}

// ------------------------------------------------------------ as regiões ---

/** O número de uma região na grade: a posição no REGION_IDS, mais um. Zero é "nenhuma". */
export function regionCode(id: RegionId): number {
  return REGION_IDS.indexOf(id) + 1;
}

/** O caminho de volta: a região de um número da grade, ou `null` para o zero. */
export function regionOfCode(code: number): RegionId | null {
  return REGION_IDS[code - 1] ?? null;
}

/** Os pontos em que as arestas do polígono cruzam a linha horizontal `y`, em ordem. */
function crossingsAt(points: readonly number[], y: number): number[] {
  const count = Math.floor(points.length / 2);
  const xs: number[] = [];

  for (let i = 0; i < count; i += 1) {
    const j = (i + 1) % count;
    const x1 = points[2 * i] ?? 0;
    const y1 = points[2 * i + 1] ?? 0;
    const x2 = points[2 * j] ?? 0;
    const y2 = points[2 * j + 1] ?? 0;

    if ((y1 <= y && y2 > y) || (y2 <= y && y1 > y)) {
      xs.push(x1 + ((y - y1) / (y2 - y1)) * (x2 - x1));
    }
  }

  return xs.sort((a, b) => a - b);
}

/**
 * Pinta um polígono numa grade, pela regra par-ímpar.
 *
 * Uma célula entra quando o **centro** dela cai dentro do polígono. `scale`
 * converte as coordenadas da imagem para a grade: 1 é a imagem inteira, 0,5 é
 * meia resolução. O que passa da borda da grade é simplesmente cortado.
 */
export function fillPolygon(
  grid: Uint8Array,
  width: number,
  height: number,
  points: readonly number[],
  scale: number,
  value: number,
): void {
  for (let row = 0; row < height; row += 1) {
    const crossings = crossingsAt(points, (row + 0.5) / scale);

    for (let k = 0; k + 1 < crossings.length; k += 2) {
      const from = Math.max(0, Math.ceil((crossings[k] ?? 0) * scale - 0.5));
      const to = Math.min(width, Math.ceil((crossings[k + 1] ?? 0) * scale - 0.5));
      if (to > from) grid.fill(value, row * width + from, row * width + to);
    }
  }
}

/** A grade das oito regiões: cada célula com o número da região que a pintou por último. */
export function rasterizeRegions(width: number, height: number, scale: number): Uint8Array {
  const grid = new Uint8Array(width * height);

  for (const polygon of REGION_POLYGONS) {
    fillPolygon(grid, width, height, polygon.points, scale, regionCode(polygon.region));
  }

  return grid;
}

// ------------------------------------------------------------ as máscaras ---

/** Os quatro pixels que formam um bloco de meia resolução. */
const BLOCK = [
  [0, 0],
  [1, 0],
  [0, 1],
  [1, 1],
] as const;

/**
 * A máscara de uma região em meia resolução: para cada bloco de 2 × 2 pixels, a
 * fração que é terra daquela região, de 0 a 255.
 *
 * A borda sai suavizada de graça — um bloco meio terra, meio mar vira meio
 * transparente —, e a máscara tem um quarto do tamanho da imagem. `code` 0 quer
 * dizer "qualquer região": é a terra inteira, que o calor pinta.
 */
export function halfMask(
  regions: Uint8Array,
  land: Uint8Array,
  width: number,
  height: number,
  code: number,
): Uint8ClampedArray {
  const halfWidth = Math.floor(width / 2);
  const halfHeight = Math.floor(height / 2);
  const alpha = new Uint8ClampedArray(halfWidth * halfHeight);

  for (let y = 0; y < halfHeight; y += 1) {
    for (let x = 0; x < halfWidth; x += 1) {
      let hits = 0;

      for (const [dx, dy] of BLOCK) {
        const at = (2 * y + dy) * width + 2 * x + dx;
        const owner = regions[at] ?? 0;
        const mine = code === 0 ? owner !== 0 : owner === code;
        if (mine && land[at] === 1) hits += 1;
      }

      alpha[y * halfWidth + x] = Math.round((hits * 255) / BLOCK.length);
    }
  }

  return alpha;
}

/**
 * O contorno de uma máscara: as células de dentro (alfa da metade para cima) que
 * encostam em alguma de fora, por um dos quatro lados.
 *
 * A borda da imagem conta como dentro. Sem isso, a Europa — que vai de ponta a
 * ponta do mapa, por causa da Chukotka — ganharia um traço na moldura.
 */
export function edgeOf(alpha: Uint8ClampedArray, width: number, height: number): Uint8ClampedArray {
  const inside = (x: number, y: number): boolean =>
    x < 0 || y < 0 || x >= width || y >= height || (alpha[y * width + x] ?? 0) >= 128;
  const edge = new Uint8ClampedArray(alpha.length);

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      if (!inside(x, y)) continue;
      const border =
        !inside(x - 1, y) || !inside(x + 1, y) || !inside(x, y - 1) || !inside(x, y + 1);
      if (border) edge[y * width + x] = 255;
    }
  }

  return edge;
}

// ------------------------------------------------------------- o clique ---

/**
 * A grade de clique: em cada célula, o número da região com mais terra ali, ou
 * zero. `masks` vem na ordem do REGION_IDS — a máscara `k` é da região `k + 1`.
 */
export function hitGrid(masks: readonly Uint8ClampedArray[]): Uint8Array {
  const length = masks[0]?.length ?? 0;
  const grid = new Uint8Array(length);

  for (let i = 0; i < length; i += 1) {
    let best = 0;

    masks.forEach((mask, k) => {
      const alpha = mask[i] ?? 0;
      if (alpha > best) {
        best = alpha;
        grid[i] = k + 1;
      }
    });
  }

  return grid;
}

/**
 * A região sob um ponto da grade de clique, ou `null` quando é mar.
 *
 * Quando o ponto cai na água, procura a terra mais próxima num raio pequeno:
 * ilha pequena e costa recortada são alvos difíceis de acertar em cheio, e um
 * clique a dois passos da costa quase sempre quis a terra do lado.
 */
export function regionAt(
  grid: Uint8Array,
  width: number,
  height: number,
  x: number,
  y: number,
  radius: number,
): RegionId | null {
  const cx = Math.floor(x);
  const cy = Math.floor(y);
  let best = 0;
  let nearest = Number.POSITIVE_INFINITY;

  for (let dy = -radius; dy <= radius; dy += 1) {
    for (let dx = -radius; dx <= radius; dx += 1) {
      const px = cx + dx;
      const py = cy + dy;
      const distance = dx * dx + dy * dy;
      if (px < 0 || py < 0 || px >= width || py >= height || distance > radius * radius) continue;

      const code = grid[py * width + px] ?? 0;
      if (code !== 0 && distance < nearest) {
        best = code;
        nearest = distance;
      }
    }
  }

  return regionOfCode(best);
}
