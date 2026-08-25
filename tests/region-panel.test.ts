import { describe, expect, it } from 'vitest';

import { ui } from '../src/data/i18n';
import { globalEmissions } from '../src/engine/climate';
import { REGION_IDS, createInitialState, type GameState, type RegionId } from '../src/engine/state';
import { mapView } from '../src/ui/map';
import {
  CHARACTER_FIELDS,
  LIVE_FIELDS,
  regionPanelView,
  type PanelField,
  type PanelRow,
} from '../src/ui/region-panel';

/**
 * A metade pura do painel de detalhe (P5-04). Roda em node, sem jsdom.
 *
 * O que **não** está aqui está no tests/region-panel.dom.test.ts: o botão de
 * fechar, a troca entre as duas telas e as exigências que só existem com DOM.
 */

const start = (): GameState => createInitialState(2025);

function com(id: RegionId, campos: Partial<GameState['regions'][RegionId]>): GameState {
  const base = start();
  return { ...base, regions: { ...base.regions, [id]: { ...base.regions[id], ...campos } } };
}

/** Todas as linhas do painel, achatadas, para não repetir dois laços a cada teste. */
function rows(state: GameState, selected: RegionId): readonly PanelRow[] {
  const view = regionPanelView(state, selected);
  if (view.kind !== 'region') throw new Error('esperava o painel de uma região');
  return view.groups.flatMap((group) => group.rows);
}

function row(state: GameState, selected: RegionId, field: PanelField): PanelRow {
  const found = rows(state, selected).find((item) => item.field === field);
  if (found === undefined) throw new Error(`o painel não tem o campo ${field}`);
  return found;
}

describe('sem região escolhida', () => {
  it('mostra a frase que ensina o clique, e nenhum número', () => {
    const view = regionPanelView(start(), null);

    expect(view.kind).toBe('empty');
    if (view.kind !== 'empty') return;
    expect(view.message).toBe(ui.regionPanel.empty);
  });

  /**
   * A união discriminada existe para isto: sem escolha não há "nome vazio" nem
   * "linhas vazias", há outra tela. Se um dia alguém trocar por um campo
   * opcional, este teste para de compilar — que é o aviso que se quer.
   */
  it('não tem nome nem grupos para o render escrever', () => {
    const view = regionPanelView(start(), null);

    expect(Object.keys(view)).toEqual(['kind', 'message']);
  });
});

describe('com uma região escolhida', () => {
  it('leva o id e o nome da região escolhida', () => {
    const view = regionPanelView(start(), 'af');

    expect(view.kind).toBe('region');
    if (view.kind !== 'region') return;
    expect(view.id).toBe('af');
    expect(view.name).toBe('África');
  });

  it('mostra os 6 campos, em dois grupos', () => {
    const view = regionPanelView(start(), 'af');
    if (view.kind !== 'region') throw new Error('esperava o painel de uma região');

    expect(view.groups.map((group) => group.title)).toEqual([
      ui.regionPanel.groups.character,
      ui.regionPanel.groups.live,
    ]);
    expect(view.groups[0]?.rows.map((r) => r.field)).toEqual([...CHARACTER_FIELDS]);
    expect(view.groups[1]?.rows.map((r) => r.field)).toEqual([...LIVE_FIELDS]);
  });

  it('funciona para as 8 regiões', () => {
    for (const id of REGION_IDS) {
      expect(rows(start(), id), id).toHaveLength(CHARACTER_FIELDS.length + LIVE_FIELDS.length);
    }
  });

  /** §5 do GDD: dica em tudo que tem número. */
  it('dá rótulo e dica a todo campo', () => {
    for (const item of rows(start(), 'af')) {
      expect(item.label, item.field).toBe(ui.regionPanel.fields[item.field].label);
      expect(item.hint, item.field).toBe(ui.regionPanel.fields[item.field].hint);
      expect(item.hint.length, item.field).toBeGreaterThan(0);
    }
  });

  it('nunca mostra número solto — todo valor traz unidade, escala ou sinal', () => {
    for (const item of rows(com('af', { economy: 84 }), 'af')) {
      expect(/^[\d.,]+$/.test(item.value), `${item.field}: "${item.value}"`).toBe(
        // A economia é a única exceção, e é de propósito: ela é um índice de
        // base 100, não tem unidade que se escreva, e "84 de 100" mentiria —
        // o índice passa de 100 se algum dia alguém o levantar.
        item.field === 'economy',
      );
    }
  });
});

describe('os valores formatados', () => {
  it('escreve a população em milhões', () => {
    expect(row(start(), 'af', 'population').value).toBe(`1.479,0 ${ui.units.millions}`);
  });

  it('escreve a matriz limpa como porcentagem, e não como fração', () => {
    expect(row(start(), 'na', 'cleanShare').value).toBe('46%');
    expect(row(start(), 'la', 'cleanShare').value).toBe('65%');
  });

  it('escreve a emissão com unidade', () => {
    expect(row(start(), 'oc', 'emissions').value).toBe(`0,56 ${ui.units.emissionsPerYear}`);
  });

  it('escreve apoio e resiliência com a escala junto', () => {
    const estado = com('af', { support: 27, resilience: 63 });

    expect(row(estado, 'af', 'support').value).toBe(ui.regionPanel.scale('27'));
    expect(row(estado, 'af', 'resilience').value).toBe(ui.regionPanel.scale('63'));
  });

  /**
   * ACEITE do P5-04: o painel e o mapa não podem discordar.
   *
   * Os dois mostram o apoio da mesma região, um do lado do outro. Se um
   * truncasse e o outro arredondasse, a tela diria 24 e 25 ao mesmo tempo para o
   * mesmo número — e ninguém erraria em voz alta.
   */
  it('concorda com o mapa sobre o apoio, nas 8 regiões', () => {
    const estado = com('af', { support: 49.7 });
    const noMapa = new Map(mapView(estado, null).cells.map((cell) => [cell.id, cell.support]));

    for (const id of REGION_IDS) {
      const noPainel = row(estado, id, 'support').value;
      // O mapa escreve "Apoio 50" e o painel "50 de 100": o que precisa bater é
      // o número, não a moldura.
      const numero = noPainel.split(' ')[0] ?? '';

      expect(noMapa.get(id), id).toBe(ui.map.support(numero));
    }
  });
});

describe('a fatia do mundo', () => {
  it('acompanha só a emissão, e nenhum outro campo', () => {
    for (const item of rows(start(), 'ea')) {
      if (item.field === 'emissions') expect(item.note.length).toBeGreaterThan(0);
      else expect(item.note, item.field).toBe('');
    }
  });

  it('diz quanto a região pesa no total das oito', () => {
    const estado = start();
    const esperado = Math.round(
      (estado.regions.ea.emissions / globalEmissions(estado)) * 100,
    ).toString();

    expect(row(estado, 'ea', 'emissions').note).toBe(ui.regionPanel.shareOfWorld(`${esperado}%`));
  });

  it('mostra que a Ásia Oriental pesa mais que a Oceania — que é o ponto do §2.3', () => {
    const estado = start();
    const fatia = (id: RegionId) => Number.parseInt(row(estado, id, 'emissions').note, 10);

    expect(fatia('ea')).toBeGreaterThan(fatia('oc'));
  });

  /**
   * A emissão global chega a zero: é a condição de vitória do §2.7. Sem guarda,
   * a partida vencida mostraria "NaN% do mundo" no momento exato da vitória.
   */
  it('some quando o mundo zera a emissão, em vez de virar NaN', () => {
    const zerado = start();
    const regions = { ...zerado.regions };
    for (const id of REGION_IDS) regions[id] = { ...regions[id], emissions: 0 };

    const item = row({ ...zerado, regions }, 'ea', 'emissions');

    expect(item.note).toBe('');
    expect(item.value).not.toContain('NaN');
  });
});

describe('a divisão em dois grupos', () => {
  /**
   * A divisão é factual, não editorial: os dois campos de "o que ela é" não são
   * escritos por ninguém durante a partida. Este teste roda o jogo de verdade e
   * cobra isso do engine — se algum dia uma habilidade passar a mexer na matriz
   * limpa, é aqui que se descobre que o título do grupo virou mentira.
   */
  it('os campos fixos continuam fixos depois de uma partida inteira', async () => {
    const { advanceTick } = await import('../src/engine/tick');

    const inicio = start();
    let estado = inicio;
    for (let i = 0; i < 900; i += 1) estado = advanceTick(estado);

    for (const id of REGION_IDS) {
      for (const field of CHARACTER_FIELDS) {
        expect(estado.regions[id][field], `${id}.${field}`).toBe(inicio.regions[id][field]);
      }
    }
  });

  it('não repete nenhum campo entre os grupos', () => {
    const todos = [...CHARACTER_FIELDS, ...LIVE_FIELDS];

    expect(new Set(todos).size).toBe(todos.length);
  });
});

describe('regionPanelView', () => {
  it('não muda o estado da partida', () => {
    const antes = start();
    const copia = JSON.stringify(antes);

    regionPanelView(antes, 'eu');

    expect(JSON.stringify(antes)).toBe(copia);
  });
});
