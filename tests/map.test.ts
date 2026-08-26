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
import {
  MAP_VIEWBOX,
  NAME_FONT_SIZE,
  REGION_SHAPES,
  SUPPORT_FONT_SIZE,
  mapView,
  nameLines,
  textAnchors,
  type RegionShape,
} from '../src/ui/map';

/**
 * A metade pura do mapa (P5-01). Roda em node, sem jsdom — o que este arquivo
 * cobra é a geometria e o texto, e nenhum dos dois precisa de navegador.
 *
 * O que **não** está aqui está no tests/map.dom.test.ts: o clique, o teclado e
 * as exigências de acessibilidade que só existem quando há DOM.
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

describe('nameLines', () => {
  it('deixa nome de uma palavra numa linha só', () => {
    expect(nameLines('Europa')).toEqual(['Europa']);
    expect(nameLines('África')).toEqual(['África']);
  });

  it('quebra no ponto que deixa as duas linhas mais parecidas', () => {
    // "América do" / "Norte" seria 10 e 5; este corte dá 7 e 8.
    expect(nameLines('América do Norte')).toEqual(['América', 'do Norte']);
  });

  it('quebra em duas partes, nunca em três', () => {
    for (const id of REGION_IDS) {
      const linhas = nameLines(start().regions[id].name);
      expect(linhas.length).toBeGreaterThanOrEqual(1);
      expect(linhas.length).toBeLessThanOrEqual(2);
    }
  });

  it('não perde nem inventa palavra', () => {
    for (const id of REGION_IDS) {
      const nome = start().regions[id].name;
      expect(nameLines(nome).join(' ')).toBe(nome);
    }
  });
});

describe('as formas das 8 regiões', () => {
  it('cobre exatamente as 8 regiões do REGION_IDS', () => {
    expect(Object.keys(REGION_SHAPES).sort()).toEqual([...REGION_IDS].sort());
  });

  it('cabe inteira dentro do viewBox', () => {
    for (const id of REGION_IDS) {
      const shape = REGION_SHAPES[id];

      expect(shape.x, id).toBeGreaterThanOrEqual(0);
      expect(shape.y, id).toBeGreaterThanOrEqual(0);
      expect(shape.x + shape.width, id).toBeLessThanOrEqual(MAP_VIEWBOX.width);
      expect(shape.y + shape.height, id).toBeLessThanOrEqual(MAP_VIEWBOX.height);
    }
  });

  /**
   * ACEITE do P5-01: oito regiões distinguíveis. Duas formas sobrepostas dariam
   * uma região clicável que come a outra — e num SVG a de cima ganha o clique
   * sem nenhum aviso, que é o jeito silencioso de esse erro passar.
   */
  it('nenhuma forma invade outra', () => {
    for (const a of REGION_IDS) {
      for (const b of REGION_IDS) {
        if (a === b) continue;

        const um = REGION_SHAPES[a];
        const outro = REGION_SHAPES[b];
        const separadas =
          um.x + um.width <= outro.x ||
          outro.x + outro.width <= um.x ||
          um.y + um.height <= outro.y ||
          outro.y + outro.height <= um.y;

        expect(separadas, `${a} e ${b} se sobrepõem`).toBe(true);
      }
    }
  });
});

/**
 * Largura estimada de um texto, em unidade de viewBox.
 *
 * 0,58 em por caractere é uma média conservadora para as famílias sem serifa do
 * `system-ui` — larga o bastante para não deixar passar um nome que só caberia
 * numa fonte estreita. Não é o valor exato de nenhuma fonte, e não precisa ser:
 * o que este teste protege é a margem, não o pixel.
 */
function textWidth(text: string, fontSize: number): number {
  return text.length * fontSize * 0.58;
}

describe('textAnchors', () => {
  /**
   * ACEITE do P5-01: o texto de cada região cai dentro da própria forma.
   *
   * É o teste que vale por uma ida ao navegador. Transbordo de texto em SVG não
   * quebra nada, não avisa e não corta — ele simplesmente pinta o nome por cima
   * da região vizinha, e só se descobre olhando.
   */
  it('mantém nome e apoio dentro da forma, nas 8 regiões', () => {
    for (const id of REGION_IDS) {
      const shape = REGION_SHAPES[id];
      const linhas = nameLines(start().regions[id].name);
      const texto = textAnchors(shape, linhas.length);

      // Vertical: da subida da primeira linha do nome à descida do apoio.
      const topo = texto.nameY - NAME_FONT_SIZE * 0.85;
      const base = texto.supportY + SUPPORT_FONT_SIZE * 0.3;

      expect(topo, `${id}: o nome sobe acima da forma`).toBeGreaterThanOrEqual(shape.y);
      expect(base, `${id}: o apoio desce abaixo da forma`).toBeLessThanOrEqual(
        shape.y + shape.height,
      );

      // Horizontal: a linha mais longa é a que decide, e o texto é centrado.
      // 100 é o pior apoio possível de escrever — três dígitos.
      const maisLarga = Math.max(
        ...linhas.map((linha) => textWidth(linha, NAME_FONT_SIZE)),
        textWidth(ui.map.support('100'), SUPPORT_FONT_SIZE),
      );

      expect(maisLarga / 2, `${id}: o texto passa da lateral da forma`).toBeLessThanOrEqual(
        shape.width / 2,
      );
    }
  });

  it('empurra o bloco para cima quando o nome ocupa duas linhas', () => {
    const shape: RegionShape = { x: 0, y: 0, width: 200, height: 200 };

    expect(textAnchors(shape, 2).nameY).toBeLessThan(textAnchors(shape, 1).nameY);
    expect(textAnchors(shape, 2).supportY).toBeGreaterThan(textAnchors(shape, 1).supportY);
  });

  it('põe o marcador dentro da forma e fora do caminho do nome', () => {
    const shape = REGION_SHAPES.na;
    const texto = textAnchors(shape, 2);

    expect(texto.markerX).toBeGreaterThan(shape.x);
    expect(texto.markerX).toBeLessThan(texto.cx);
    expect(texto.markerY).toBeGreaterThan(shape.y);
    expect(texto.markerY).toBeLessThan(texto.nameY);
  });
});

describe('mapView', () => {
  it('devolve as 8 regiões, na ordem do REGION_IDS', () => {
    expect(mapView(start(), null).cells.map((cell) => cell.id)).toEqual([...REGION_IDS]);
  });

  /**
   * §5 do GDD: nada de número solto. O apoio na tela vem com rótulo escrito, e
   * é o par rótulo-mais-valor que carrega a informação — não a cor da forma.
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
  });

  it('leva o nome e a escala para a frase do leitor de tela', () => {
    const [primeira] = mapView(comApoio({ na: 37 }), null).cells;

    expect(primeira?.ariaLabel).toBe(ui.map.cell('América do Norte', '37'));
    expect(primeira?.ariaLabel).toContain('América do Norte');
    expect(primeira?.ariaLabel).toContain('100');
  });

  it('mostra o apoio de cada região separadamente, e não a média', () => {
    const view = mapView(comApoio({ na: 90, af: 10 }), null);
    const apoios = new Map(view.cells.map((cell) => [cell.id, cell.support]));

    expect(apoios.get('na')).toBe(ui.map.support('90'));
    expect(apoios.get('af')).toBe(ui.map.support('10'));
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
});

describe('os alertas por região (P7-04)', () => {
  it('marca a região que está abaixo do piso de apatia', () => {
    // O limiar é o supportFloor, e não um número novo: o tick.ts registra que o
    // desgaste do tempo para no piso, então abaixo dele foi evento ou Inércia.
    const view = mapView(comApoio({ af: balance.supportFloor - 1 }), null);

    expect(view.cells.find((cell) => cell.id === 'af')?.alert?.kind).toBe('support');
  });

  it('não marca quem está exatamente no piso — ali o tempo para sozinho', () => {
    const view = mapView(comApoio({ af: balance.supportFloor }), null);

    expect(view.cells.find((cell) => cell.id === 'af')?.alert).toBeNull();
  });

  it('marca a região que um evento acaba de atingir', () => {
    const state: GameState = {
      ...start(),
      activeEvents: [{ eventId: 'heatwave', target: 'ea', ticksRemaining: 3 }],
    };
    const view = mapView(state, null);

    expect(view.cells.find((cell) => cell.id === 'ea')?.alert?.kind).toBe('event');
    expect(view.cells.find((cell) => cell.id === 'na')?.alert).toBeNull();
  });

  it('com evento E apoio crítico, o evento vence', () => {
    // A prioridade é regra: o apoio crítico continua escrito no número da
    // própria forma, e o evento não tem outro lugar no mapa.
    const state: GameState = {
      ...comApoio({ af: 5 }),
      activeEvents: [{ eventId: 'drought', target: 'af', ticksRemaining: 2 }],
    };
    const view = mapView(state, null);

    expect(view.cells.find((cell) => cell.id === 'af')?.alert?.kind).toBe('event');
  });

  it('o alerta leva ícone E palavra escrita, nunca só a cor (§5)', () => {
    const view = mapView(comApoio({ af: 5 }), null);
    const alert = view.cells.find((cell) => cell.id === 'af')?.alert;

    expect(alert?.icon.trim()).toBeTruthy();
    expect(alert?.label.trim()).toBeTruthy();
  });

  it('numa partida recém-começada nenhuma região está em alerta', () => {
    expect(mapView(start(), null).cells.every((cell) => cell.alert === null)).toBe(true);
  });

  it('o canto do alerta fica dentro da forma, do lado oposto ao da seleção', () => {
    for (const id of REGION_IDS) {
      const shape = REGION_SHAPES[id];
      const text = textAnchors(shape, 2);

      expect(text.alertX).toBeGreaterThan(text.markerX);
      expect(text.alertX).toBeLessThanOrEqual(shape.x + shape.width);
      expect(text.alertY).toBeGreaterThanOrEqual(shape.y);
    }
  });
});

describe('a faixa dos cantos não invade o nome (P7-04)', () => {
  /**
   * Defeito real, achado no navegador e não pelos testes: com o alerta no canto
   * direito, as três formas de 140 de altura com nome em duas linhas desenhavam
   * "▲ crítico" **por cima** do nome. O bloco de texto é centrado na forma, e
   * numa forma baixa o centro sobe até a faixa dos cantos.
   *
   * As caixas abaixo são aproximações da altura de glifo — o SVG só sabe a
   * medida real com um documento na tela. São conservadoras de propósito: se
   * estas não se tocam, as de verdade também não.
   */
  const ALERT_DESCENT = 5;
  const NAME_ASCENT = 19;
  const SUPPORT_DESCENT = 6;

  it('nenhum nome sobe até a base do alerta, em nenhuma das 8 formas', () => {
    for (const id of REGION_IDS) {
      const shape = REGION_SHAPES[id];
      const region = createInitialState(1).regions[id];
      const linhas = nameLines(region.name).length;
      const text = textAnchors(shape, linhas);

      const baseDoAlerta = text.alertY + ALERT_DESCENT;
      const topoDoNome = text.nameY - NAME_ASCENT;

      expect(topoDoNome, `${id} (${linhas} linha(s))`).toBeGreaterThan(baseDoAlerta);
    }
  });

  it('empurrar o nome não joga o apoio para fora da forma', () => {
    // A outra ponta do mesmo conserto: o bloco desce inteiro, e numa forma
    // baixa quem corre risco de vazar passa a ser a linha de baixo.
    for (const id of REGION_IDS) {
      const shape = REGION_SHAPES[id];
      const linhas = nameLines(createInitialState(1).regions[id].name).length;
      const text = textAnchors(shape, linhas);

      expect(text.supportY + SUPPORT_DESCENT, id).toBeLessThan(shape.y + shape.height);
    }
  });

  it('as formas altas não se mexeram — o piso só age onde precisa', () => {
    // América Latina tem 230 de altura: o bloco dela continua centrado.
    const la = REGION_SHAPES.la;
    const centrado = la.y + la.height / 2 - 26;

    expect(textAnchors(la, 2).nameY).toBe(centrado);
  });
});
