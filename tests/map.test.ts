import { describe, expect, it } from 'vitest';

import { ui } from '../src/data/i18n';
import { MEDAL_CEILING } from '../src/engine/outcome';
import {
  balance,
  REGION_IDS,
  createInitialState,
  type GameState,
  type RegionId,
} from '../src/engine/state';
import { mapView } from '../src/ui/map';
import { LABEL_ANCHORS, MAP_SIZE } from '../src/ui/map-geometry';

/**
 * A metade pura do mapa (P5-01; ilustrado desde o VIS-03). Roda em node, sem
 * jsdom — o que este arquivo cobra é o texto e os números que a view entrega.
 *
 * A geometria (os contornos, a terra, onde as etiquetas pousam) está no
 * tests/map-geometry.test.ts; o clique, o foco e as camadas, no
 * tests/map.dom.test.ts.
 */

const start = (): GameState => createInitialState(2025);

function comApoio(values: Partial<Record<RegionId, number>>): GameState {
  const base = start();
  const regions = { ...base.regions };

  for (const [id, support] of Object.entries(values)) {
    const key = id as RegionId;
    regions[key] = { ...regions[key], support };
  }

  return { ...base, regions };
}

const celula = (view: ReturnType<typeof mapView>, id: RegionId) =>
  view.cells.find((cell) => cell.id === id);

describe('mapView', () => {
  it('devolve as 8 regiões, na ordem do REGION_IDS', () => {
    expect(mapView(start(), null).cells.map((cell) => cell.id)).toEqual([...REGION_IDS]);
  });

  /**
   * §5 do GDD: nada de número solto. O apoio na tela vem com rótulo escrito, e
   * é o par rótulo-mais-valor que carrega a informação — não a cor do desenho.
   */
  it('escreve o apoio com rótulo, nunca o número sozinho', () => {
    const [primeira] = mapView(comApoio({ na: 37 }), null).cells;

    expect(primeira?.support).toBe(ui.map.support('37'));
    expect(primeira?.support).toContain('37');
    expect(primeira?.support).not.toBe('37');
  });

  it('arredonda o apoio, como o apoio médio do HUD', () => {
    const view = mapView(comApoio({ na: 49.7, la: 12.2 }), null);

    expect(view.cells[0]?.support).toBe(ui.map.support('50'));
    expect(view.cells[1]?.support).toBe(ui.map.support('12'));
    expect(view.cells[0]?.supportValue).toBe(50);
  });

  it('leva o nome e a escala para a frase do leitor de tela', () => {
    const [primeira] = mapView(comApoio({ na: 37 }), null).cells;

    expect(primeira?.ariaLabel).toBe(ui.map.cell('América do Norte', '37'));
    expect(primeira?.ariaLabel).toContain('100');
  });

  it('mostra o apoio de cada região separadamente, e não a média', () => {
    const view = mapView(comApoio({ na: 90, af: 10 }), null);

    expect(celula(view, 'na')?.support).toBe(ui.map.support('90'));
    expect(celula(view, 'af')?.support).toBe(ui.map.support('10'));
  });

  it('marca uma região só, e só a que foi escolhida', () => {
    const view = mapView(start(), 'af');

    expect(view.selected).toBe('af');
    expect(view.cells.filter((cell) => cell.selected).map((cell) => cell.id)).toEqual(['af']);
  });

  it('dá marcador visível à região escolhida e a mais nenhuma', () => {
    const view = mapView(start(), 'af');

    for (const cell of view.cells) {
      expect(cell.marker, cell.id).toBe(cell.id === 'af' ? ui.map.selectedMarker : '');
    }
  });

  it('sem escolha, nenhuma região fica marcada', () => {
    const view = mapView(start(), null);

    expect(view.selected).toBeNull();
    expect(view.cells.some((cell) => cell.selected)).toBe(false);
    expect(view.cells.every((cell) => cell.marker === '')).toBe(true);
  });

  it('põe cada etiqueta no ponto da geometria, em fração do desenho', () => {
    for (const cell of mapView(start(), null).cells) {
      expect(cell.anchor.left, cell.id).toBeCloseTo(LABEL_ANCHORS[cell.id].x / MAP_SIZE.width);
      expect(cell.anchor.top, cell.id).toBeCloseTo(LABEL_ANCHORS[cell.id].y / MAP_SIZE.height);
      expect(cell.anchor.left).toBeGreaterThan(0);
      expect(cell.anchor.top).toBeLessThan(1);
    }
  });

  it('não muda o estado da partida', () => {
    const antes = start();
    const copia = JSON.stringify(antes);

    mapView(antes, 'eu');

    expect(JSON.stringify(antes)).toBe(copia);
  });
});

describe('o aquecimento do mapa (P7-04)', () => {
  /** Uma partida na temperatura pedida. */
  const aQuente = (temperature: number): GameState => ({ ...start(), temperature });

  it('as faixas são os tetos das medalhas do §2.7', () => {
    // Se esta correspondência quebrar, o mapa passa a pintar uma escala e a
    // tela de fim a julgar por outra.
    expect(mapView(aQuente(MEDAL_CEILING.gold - 0.01), null).heat).toBe('gold');
    expect(mapView(aQuente(MEDAL_CEILING.silver - 0.01), null).heat).toBe('silver');
    expect(mapView(aQuente(MEDAL_CEILING.bronze - 0.01), null).heat).toBe('bronze');
    expect(mapView(aQuente(MEDAL_CEILING.bronze + 0.01), null).heat).toBe('over');
  });

  it('a partida começa na faixa mais fria', () => {
    expect(mapView(start(), null).heat).toBe('gold');
  });

  it('a legenda nomeia a faixa por escrito, com o número do balanceamento (§5)', () => {
    // É ela que impede o aquecimento de ser só cor.
    const frio = mapView(start(), null).heatCaption;
    const quente = mapView(aQuente(2.9), null).heatCaption;

    expect(frio).toContain('1,5');
    expect(frio).toContain('ouro');
    expect(quente).toContain('2,55');
    expect(quente).not.toBe(frio);
  });

  /**
   * O quanto a terra secou (VIS-03): de 0 a 1, entre a temperatura em que a
   * partida começa e o limiar da derrota — os dois do balance.json.
   */
  it('seca a terra do começo da partida ao limiar da derrota', () => {
    expect(mapView(aQuente(balance.startTemperature), null).heatLevel).toBe(0);
    expect(mapView(aQuente(balance.loseTemperature), null).heatLevel).toBe(1);

    const meio = (balance.startTemperature + balance.loseTemperature) / 2;
    expect(mapView(aQuente(meio), null).heatLevel).toBeCloseTo(0.5);
  });

  it('não passa dos dois extremos', () => {
    expect(mapView(aQuente(0), null).heatLevel).toBe(0);
    expect(mapView(aQuente(9), null).heatLevel).toBe(1);
  });

  it('só cresce com a temperatura', () => {
    let anterior = -1;
    for (let t = 1.3; t <= 3.2; t += 0.1) {
      const nivel = mapView(aQuente(t), null).heatLevel;
      expect(nivel).toBeGreaterThanOrEqual(anterior);
      anterior = nivel;
    }
  });
});

describe('os alertas por região (P7-04)', () => {
  it('marca a região que está abaixo do piso de apatia', () => {
    // O limiar é o supportFloor, e não um número novo: o tick.ts registra que o
    // desgaste do tempo para no piso, então abaixo dele foi evento ou Inércia.
    const view = mapView(comApoio({ af: balance.supportFloor - 1 }), null);

    expect(celula(view, 'af')?.alert?.kind).toBe('support');
    expect(celula(view, 'af')?.low).toBe(true);
  });

  it('não marca quem está exatamente no piso — ali o tempo para sozinho', () => {
    const view = mapView(comApoio({ af: balance.supportFloor }), null);

    expect(celula(view, 'af')?.alert).toBeNull();
    expect(celula(view, 'af')?.low).toBe(false);
  });

  /**
   * O defeito que o VIS-02 viu na tela: 24,99 aparecia como "Apoio 25" e
   * "▲ crítico" ao mesmo tempo. O alerta agora olha para o número que a etiqueta
   * mostra, e a etiqueta nunca contradiz o próprio piso.
   */
  it('julga o piso pelo número mostrado, e não pelo valor exato', () => {
    const quase = mapView(comApoio({ af: balance.supportFloor - 0.01 }), null);
    expect(celula(quase, 'af')?.support).toBe(ui.map.support(String(balance.supportFloor)));
    expect(celula(quase, 'af')?.alert).toBeNull();

    const abaixo = mapView(comApoio({ af: balance.supportFloor - 0.6 }), null);
    expect(celula(abaixo, 'af')?.support).toBe(ui.map.support(String(balance.supportFloor - 1)));
    expect(celula(abaixo, 'af')?.alert?.kind).toBe('support');
  });

  it('marca a região que um evento acaba de atingir', () => {
    const state: GameState = {
      ...start(),
      activeEvents: [{ eventId: 'heatwave', target: 'ea', ticksRemaining: 3 }],
    };
    const view = mapView(state, null);

    expect(celula(view, 'ea')?.alert?.kind).toBe('event');
    expect(celula(view, 'na')?.alert).toBeNull();
  });

  it('com evento E apoio crítico, o evento vence — e o apoio continua marcado como baixo', () => {
    // A prioridade é regra: o evento não tem outro lugar no mapa, e o apoio
    // crítico continua escrito no número e pintado de hachura no desenho.
    const state: GameState = {
      ...comApoio({ af: 5 }),
      activeEvents: [{ eventId: 'drought', target: 'af', ticksRemaining: 2 }],
    };
    const view = mapView(state, null);

    expect(celula(view, 'af')?.alert?.kind).toBe('event');
    expect(celula(view, 'af')?.low).toBe(true);
  });

  it('o alerta leva ícone E palavra escrita, nunca só a cor (§5)', () => {
    const alert = celula(mapView(comApoio({ af: 5 }), null), 'af')?.alert;

    expect(alert?.icon.trim()).toBeTruthy();
    expect(alert?.label.trim()).toBeTruthy();
  });

  it('numa partida recém-começada nenhuma região está em alerta', () => {
    expect(mapView(start(), null).cells.every((cell) => cell.alert === null)).toBe(true);
  });
});
