import { readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

import { REGION_IDS, createInitialState, type RegionId } from '../src/engine/state';
import {
  LABEL_ANCHORS,
  MAP_CROP_HEIGHT,
  MAP_SIZE,
  REGION_POLYGONS,
  edgeOf,
  fillPolygon,
  halfMask,
  hitGrid,
  isWater,
  landOf,
  rasterizeRegions,
  regionAt,
  regionCode,
  regionOfCode,
} from '../src/ui/map-geometry';

/**
 * A geometria do mapa ilustrado (VIS-03). Roda em node: nada aqui precisa de
 * navegador, e é justamente por isso que o recorte das regiões pode ser cobrado
 * ponto a ponto. O que só existe com DOM — o canvas, o clique, o foco — está no
 * tests/map.dom.test.ts.
 */

const { width: W, height: H } = MAP_SIZE;

/** A grade inteira, na resolução da imagem: a mesma que o map.ts pinta. */
const grade = rasterizeRegions(W, H, 1);

const regiaoEm = (x: number, y: number): RegionId | null => regionOfCode(grade[y * W + x] ?? 0);

describe('os polígonos', () => {
  it('cobrem as 8 regiões', () => {
    const cobertas = new Set(REGION_POLYGONS.map((polygon) => polygon.region));
    expect([...cobertas].sort()).toEqual([...REGION_IDS].sort());
  });

  it('têm pelo menos três vértices, sempre com x e y em par', () => {
    for (const { region, points } of REGION_POLYGONS) {
      expect(points.length % 2, region).toBe(0);
      expect(points.length / 2, region).toBeGreaterThanOrEqual(3);
      expect(points.every(Number.isFinite), region).toBe(true);
    }
  });

  it('não saem para longe da imagem — a folga é só para cobrir a borda', () => {
    for (const { region, points } of REGION_POLYGONS) {
      for (let i = 0; i < points.length; i += 2) {
        expect(points[i], region).toBeGreaterThanOrEqual(-20);
        expect(points[i], region).toBeLessThanOrEqual(W + 20);
        expect(points[i + 1], region).toBeGreaterThanOrEqual(-20);
        expect(points[i + 1], region).toBeLessThanOrEqual(H);
      }
    }
  });
});

/**
 * O recorte do docs/CIENCIA.md, ponto a ponto.
 *
 * Cada linha é uma decisão do recorte, conferida sobre a imagem. Quem mexer num
 * polígono descobre aqui se mudou a geografia do jogo — e as linhas marcadas com
 * "(exceção)" são as quatro que o CIENCIA.md registra porque mudam número.
 */
describe('o recorte das regiões', () => {
  const pontos: readonly (readonly [string, number, number, RegionId])[] = [
    ['os Estados Unidos', 300, 200, 'na'],
    ['o Alasca', 60, 70, 'na'],
    ['a Groenlândia', 520, 60, 'na'],
    ['o Havaí', 85, 290, 'na'],
    ['o México', 262, 262, 'la'],
    ['o Brasil', 470, 420, 'la'],
    ['a Islândia', 600, 70, 'eu'],
    ['a Rússia europeia', 800, 130, 'eu'],
    ['a Sibéria', 1100, 90, 'eu'],
    ['a Chukotka, que a imagem repete na borda esquerda', 10, 60, 'eu'],
    ['a ilha de Sacalina', 1212, 150, 'eu'],
    ['Creta', 762, 227, 'eu'],
    ['a Sicília', 720, 219, 'eu'],
    ['o Saara', 700, 280, 'af'],
    ['a Tunísia', 706, 224, 'af'],
    ['o Sinai (exceção: o Egito fica na África)', 792, 252, 'af'],
    ['Madagascar', 845, 440, 'af'],
    ['a Turquia', 790, 212, 'me'],
    ['Israel', 802, 245, 'me'],
    ['a Arábia', 840, 280, 'me'],
    ['Omã', 900, 283, 'me'],
    ['o Irã (exceção: sai da Ásia Meridional)', 880, 240, 'me'],
    ['o Cazaquistão (exceção: a Ásia Central)', 900, 170, 'me'],
    ['o Afeganistão', 925, 235, 'sa'],
    ['o Paquistão', 925, 265, 'sa'],
    ['a Índia', 960, 290, 'sa'],
    ['Bangladesh', 1012, 280, 'sa'],
    ['a China', 1060, 220, 'ea'],
    ['a Mongólia', 1050, 175, 'ea'],
    ['a Coreia', 1155, 218, 'ea'],
    ['Hokkaido', 1215, 185, 'ea'],
    ['Mianmar', 1030, 275, 'ea'],
    ['Bornéu (exceção: o Sudeste Asiático)', 1100, 360, 'ea'],
    ['a metade oeste da Nova Guiné', 1190, 380, 'ea'],
    ['a metade leste da Nova Guiné', 1215, 385, 'oc'],
    ['a Austrália', 1170, 470, 'oc'],
    ['a Nova Zelândia', 1320, 540, 'oc'],
  ];

  it.each(pontos)('%s fica na região certa', (_nome, x, y, regiao) => {
    expect(regiaoEm(x, y)).toBe(regiao);
  });
});

/**
 * Um valor da regra-base de um seletor do map.css, lido da própria folha — o
 * mesmo cuidado do tests/theme.test.ts com as misturas: a conta usa a medida
 * que a tela mostra, e não a que alguém lembrou de copiar para cá.
 */
function medidaDoMapa(seletor: string, propriedade: string): string {
  const folha = readFileSync('src/ui/map.css', 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
  const regra = folha.split(`\n${seletor} {`)[1]?.split('}')[0] ?? '';
  const valor = new RegExp(`\\s${propriedade}:\\s*([^;]+);`).exec(regra)?.[1];
  if (valor === undefined) throw new Error(`o map.css não define ${propriedade} em ${seletor}`);
  return valor.trim();
}

/** `0.25rem` → 0.25; `1px` → 1; `1.2` → 1.2. */
const numero = (valor: string): number => Number.parseFloat(valor);

describe('as etiquetas', () => {
  it('existem para as 8 regiões', () => {
    expect(Object.keys(LABEL_ANCHORS).sort()).toEqual([...REGION_IDS].sort());
  });

  it('pousam dentro do recorte da imagem', () => {
    for (const id of REGION_IDS) {
      const { x, y } = LABEL_ANCHORS[id];
      expect(x, id).toBeGreaterThan(0);
      expect(x, id).toBeLessThan(W);
      expect(y, id).toBeGreaterThan(0);
      expect(y, id).toBeLessThan(MAP_CROP_HEIGHT);
    }
  });

  it('pousam em cima da própria região', () => {
    for (const id of REGION_IDS) {
      const { x, y } = LABEL_ANCHORS[id];
      expect(regiaoEm(x, y), id).toBe(id);
    }
  });

  /**
   * ACEITE do VIS-03: as oito etiquetas não se tocam.
   *
   * A largura é uma estimativa conservadora, como a do teste de texto do P5-01:
   * 0,58 em por caractere, o piso do map.css e o marcador de seleção somando um
   * caractere. As alturas saem do map.css, e o alerta está pendurado acima de
   * todas (o pior caso). A largura do mapa sai do próprio tema — as etiquetas e
   * o mapa crescem juntos em `rem`, então a proporção entre eles não muda com o
   * zoom do navegador.
   */
  it('não se sobrepõem com o mapa na largura do tema', () => {
    const tema = readFileSync('src/ui/theme.css', 'utf8');
    const largura = /--largura-mundo:\s*([\d.]+)rem;/.exec(tema)?.[1];
    expect(largura, '--largura-mundo em rem').toBeDefined();

    const pixelsPorRem = 16;
    const escala = (Number(largura) * pixelsPorRem) / W;

    // A etiqueta tem duas linhas — o nome e o apoio —, o gap entre elas, o
    // padding e a borda: 52,4 px com as medidas de hoje, os mesmos 52 que o
    // Chrome mede. O alerta é uma linha só, apoiada na borda de cima.
    const [acima = '', , abaixo = ''] = medidaDoMapa('.map__label', 'padding').split(' ');
    const borda = numero(medidaDoMapa('.map__label', 'border'));
    const alturaEtiqueta =
      (2 * numero(medidaDoMapa('.map__label', 'line-height')) +
        numero(medidaDoMapa('.map__label', 'gap')) +
        numero(acima) +
        numero(abaixo)) *
        pixelsPorRem +
      2 * borda;
    const alturaAlerta = numero(medidaDoMapa('.map__alert', 'line-height')) * pixelsPorRem;
    const larguraMinima = numero(medidaDoMapa('.map__label', 'min-width')) * pixelsPorRem;

    for (const [nome, medida] of Object.entries({ alturaEtiqueta, alturaAlerta, larguraMinima })) {
      expect(medida, `${nome}, lida do map.css`).toBeGreaterThan(0);
    }

    const nomes = createInitialState(1).regions;
    const caixa = (id: RegionId) => {
      const { x, y } = LABEL_ANCHORS[id];
      const larguraPx = Math.max(larguraMinima, (nomes[id].name.length + 1) * 0.58 * 16 + 20);
      const meiaLargura = larguraPx / 2 / escala;
      const meiaAltura = alturaEtiqueta / 2 / escala;
      const alerta = alturaAlerta / escala;
      return {
        esquerda: x - meiaLargura,
        direita: x + meiaLargura,
        topo: y - meiaAltura - alerta,
        base: y + meiaAltura,
      };
    };

    for (const a of REGION_IDS) {
      for (const b of REGION_IDS) {
        if (a >= b) continue;
        const um = caixa(a);
        const outro = caixa(b);
        const separadas =
          um.direita <= outro.esquerda ||
          outro.direita <= um.esquerda ||
          um.base <= outro.topo ||
          outro.base <= um.topo;
        expect(separadas, `as etiquetas de ${a} e ${b} se tocam`).toBe(true);
      }
    }
  });
});

describe('terra e água', () => {
  it('reconhece os mares da imagem como água', () => {
    expect(isWater(0x03, 0x59, 0x78)).toBe(true); // oceano profundo
    expect(isWater(0x17, 0x73, 0x77)).toBe(true); // mar raso do Caribe
    expect(isWater(0x0b, 0x66, 0x79)).toBe(true); // Mediterrâneo
  });

  it('reconhece deserto, floresta e gelo como terra', () => {
    expect(isWater(0xa9, 0xe7, 0x5a)).toBe(false); // Saara
    expect(isWater(0x16, 0x44, 0x04)).toBe(false); // Amazônia
    expect(isWater(0xf0, 0xf0, 0xf2)).toBe(false); // Groenlândia
  });

  it('landOf lê a imagem RGBA pixel a pixel', () => {
    const rgba = [0x03, 0x59, 0x78, 255, 0xa9, 0xe7, 0x5a, 255];
    expect([...landOf(rgba, 2, 1)]).toEqual([0, 1]);
  });
});

describe('fillPolygon', () => {
  /** Uma grade pequena, desenhada como texto: `#` pintado, `.` vazio. */
  const desenho = (grid: Uint8Array, largura: number): string[] => {
    const linhas: string[] = [];
    for (let i = 0; i < grid.length; i += largura) {
      linhas.push([...grid.slice(i, i + largura)].map((v) => (v === 0 ? '.' : '#')).join(''));
    }
    return linhas;
  };

  it('pinta um quadrado pelos centros das células', () => {
    const grid = new Uint8Array(5 * 5);
    fillPolygon(grid, 5, 5, [1, 1, 4, 1, 4, 4, 1, 4], 1, 7);
    expect(desenho(grid, 5)).toEqual(['.....', '.###.', '.###.', '.###.', '.....']);
    expect(grid[6]).toBe(7);
  });

  it('respeita a regra par-ímpar num polígono côncavo', () => {
    // Um "U": o vão do meio fica vazio.
    const grid = new Uint8Array(5 * 4);
    fillPolygon(grid, 5, 4, [0, 0, 2, 0, 2, 2, 3, 2, 3, 0, 5, 0, 5, 4, 0, 4], 1, 1);
    expect(desenho(grid, 5)).toEqual(['##.##', '##.##', '#####', '#####']);
  });

  it('corta o que passa da borda, sem estourar a grade', () => {
    const grid = new Uint8Array(3 * 3);
    fillPolygon(grid, 3, 3, [-10, -10, 20, -10, 20, 20, -10, 20], 1, 1);
    expect(desenho(grid, 3)).toEqual(['###', '###', '###']);
  });

  it('converte a escala: meia resolução pinta metade das células', () => {
    const grid = new Uint8Array(4 * 4);
    fillPolygon(grid, 4, 4, [0, 0, 4, 0, 4, 4, 0, 4], 0.5, 1);
    expect(desenho(grid, 4)).toEqual(['##..', '##..', '....', '....']);
  });
});

describe('rasterizeRegions', () => {
  it('devolve uma célula por pixel, com números de 0 a 8', () => {
    expect(grade).toHaveLength(W * H);
    expect(Math.max(...grade.slice(0, 5000))).toBeLessThanOrEqual(REGION_IDS.length);
  });

  it('pinta por último quem vem depois na lista', () => {
    // A Turquia está dentro da caixa da Europa; o Oriente Médio pinta por cima.
    expect(regiaoEm(790, 212)).toBe('me');
  });

  it('regionCode e regionOfCode são o caminho de ida e de volta', () => {
    for (const id of REGION_IDS) expect(regionOfCode(regionCode(id))).toBe(id);
    expect(regionOfCode(0)).toBeNull();
  });
});

describe('as máscaras', () => {
  // Uma imagem de 4 × 2: duas colunas da região 1 e duas da região 2; a
  // primeira linha é toda terra, a segunda só tem terra na coluna 0.
  const regioes = Uint8Array.from([1, 1, 2, 2, 1, 1, 2, 2]);
  const terra = Uint8Array.from([1, 1, 1, 1, 1, 0, 0, 0]);

  it('halfMask conta a terra de cada região em blocos de 2 × 2', () => {
    expect([...halfMask(regioes, terra, 4, 2, 1)]).toEqual([191, 0]);
    expect([...halfMask(regioes, terra, 4, 2, 2)]).toEqual([0, 128]);
  });

  it('halfMask com código 0 é a terra de qualquer região', () => {
    expect([...halfMask(regioes, terra, 4, 2, 0)]).toEqual([191, 128]);
  });

  it('edgeOf marca só a borda de dentro, e não a moldura da imagem', () => {
    // prettier-ignore
    const alpha = Uint8ClampedArray.from([
      0, 0, 0, 0, 0,
      0, 255, 255, 255, 0,
      0, 255, 255, 255, 0,
      0, 255, 255, 255, 0,
      0, 0, 0, 0, 0,
    ]);
    const borda = [...edgeOf(alpha, 5, 5)].map((v) => (v === 0 ? '.' : '#'));
    expect(borda.join('')).toBe('.....' + '.###.' + '.#.#.' + '.###.' + '.....');

    const cheia = Uint8ClampedArray.from(Array.from({ length: 9 }, () => 255));
    expect([...edgeOf(cheia, 3, 3)].every((v) => v === 0)).toBe(true);
  });

  it('hitGrid fica com a região de mais terra em cada célula', () => {
    const grid = hitGrid([
      Uint8ClampedArray.from([200, 0, 64]),
      Uint8ClampedArray.from([100, 0, 128]),
    ]);
    expect([...grid]).toEqual([1, 0, 2]);
  });
});

describe('regionAt', () => {
  // 5 × 1: só a célula 3 é terra, da região 4 (a África).
  const grid = Uint8Array.from([0, 0, 0, 4, 0]);

  it('acha a região em cheio', () => {
    expect(regionAt(grid, 5, 1, 3.7, 0.2, 0)).toBe('af');
  });

  it('perdoa um clique perto da costa, dentro do raio', () => {
    expect(regionAt(grid, 5, 1, 1.5, 0.5, 2)).toBe('af');
  });

  it('é mar quando não há terra no raio, e não estoura fora da grade', () => {
    expect(regionAt(grid, 5, 1, 0.5, 0.5, 2)).toBeNull();
    expect(regionAt(grid, 5, 1, -30, 40, 3)).toBeNull();
  });
});
