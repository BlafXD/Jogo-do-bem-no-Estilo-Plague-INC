import { describe, expect, it } from 'vitest';
import { unlockSkill } from '../src/engine/skills';
import { balance, createInitialState, REGION_IDS, type GameState } from '../src/engine/state';
import { advanceTick } from '../src/engine/tick';
import { HUD_FIELDS, hudView } from '../src/ui/hud';

/**
 * Estes testes cobrem só o `hudView`, que é puro. O `mountHud` e o `renderHud`
 * tocam no DOM e ficam de fora: testá-los exigiria jsdom, que é dependência
 * nova e passa por aprovação (§2). A divisão do módulo foi feita para que a
 * parte onde cabe bug — arredondamento, unidade, média — caísse deste lado.
 */
describe('hudView', () => {
  it('mostra os seis indicadores de abertura da partida', () => {
    // O sexto entrou no P7-03. O docs/GDD.md §2.2 sempre listou a Inércia como
    // indicador; até ali ela era um campo do estado que ninguém mostrava.
    expect(hudView(createInitialState(2025))).toEqual({
      year: '2025',
      temperature: '1,37 °C',
      emissions: '40,8 Gt/ano',
      actionPoints: '0',
      support: '50',
      inertia: '0',
    });
  });

  it('a Inércia é truncada, como o PAC — e pela mesma razão', () => {
    // **Este teste nasceu de um defeito visto no navegador.** Com a Inércia
    // arredondada, uma partida em 0,4 mostrava "0" no HUD enquanto o botão de
    // conter dizia "Disponível" logo abaixo: 30 PAC para derrubar algo que o
    // jogador não tinha como enxergar. Truncar faz o mostrador e a guarda do
    // `canContain` concordarem em toda faixa.
    const start = createInitialState(2025);

    expect(hudView({ ...start, inertia: 0.4 }).inertia).toBe('0');
    expect(hudView({ ...start, inertia: 0.9 }).inertia).toBe('0');
    expect(hudView({ ...start, inertia: 67.6 }).inertia).toBe('67');
  });

  it('formata em pt-BR: vírgula decimal, não ponto', () => {
    // O §12 fixa a interface em pt-BR. Um "1.37 °C" na tela seria erro de idioma,
    // não de estilo — em português aquilo se lê como mil trezentos e setenta.
    const view = hudView(createInitialState(1));

    expect(view.temperature).toContain(',');
    expect(view.temperature).not.toContain('.');
    expect(view.emissions).toContain(',');
  });

  it('o ano não ganha separador de milhar', () => {
    // O formatador de número em pt-BR transformaria 2100 em "2.100".
    const state: GameState = { ...createInitialState(1), year: 2100 };

    expect(hudView(state).year).toBe('2100');
  });

  it('arredonda o PAC para baixo, nunca para cima', () => {
    // O PAC entra fracionado (o P6-03 divide a entrada anual por 12). Mostrar 40
    // com 39,9 no bolso faria o jogador achar que um nó de 40 está ao alcance —
    // o número na tela não pode prometer o que a compra vai negar.
    const almost: GameState = { ...createInitialState(1), actionPoints: 39.9 };
    const exact: GameState = { ...createInitialState(1), actionPoints: 40 };

    expect(hudView(almost).actionPoints).toBe('39');
    expect(hudView(exact).actionPoints).toBe('40');
  });

  it('a temperatura mantém sempre duas casas, mesmo redonda', () => {
    // Sem o mínimo de casas, "2 °C" e "1,37 °C" alternariam de largura e o HUD
    // dançaria a cada tick.
    const round: GameState = { ...createInitialState(1), temperature: 2 };

    expect(hudView(round).temperature).toBe('2,00 °C');
  });

  it('o apoio é a média das 8 regiões, não o de uma delas', () => {
    const base = createInitialState(1);
    const uneven: GameState = {
      ...base,
      regions: {
        ...base.regions,
        na: { ...base.regions.na, support: 90 },
        af: { ...base.regions.af, support: 10 },
      },
    };

    // Seis regiões em 50, uma em 90 e uma em 10: a média continua 50.
    expect(hudView(uneven).support).toBe('50');

    const collapsing: GameState = {
      ...base,
      regions: Object.fromEntries(
        REGION_IDS.map((id) => [id, { ...base.regions[id], support: 12 }]),
      ) as GameState['regions'],
    };

    expect(hudView(collapsing).support).toBe('12');
  });

  it('nenhum campo sai vazio', () => {
    const view = hudView(createInitialState(7));

    for (const field of HUD_FIELDS) {
      expect(view[field].trim().length).toBeGreaterThan(0);
    }
  });

  it('acompanha a partida: um ano de tick muda ano, temperatura, emissões e PAC', () => {
    let state = createInitialState(2025);
    const before = hudView(state);

    for (let tick = 0; tick < balance.ticksPerYear; tick++) {
      state = advanceTick(state);
    }
    const after = hudView(state);

    expect(after.year).toBe('2026');
    expect(after.temperature).not.toBe(before.temperature);
    expect(after.emissions).not.toBe(before.emissions);
    expect(after.actionPoints).toBe('10');
  });

  it('a compra de uma habilidade aparece no PAC e no apoio', () => {
    // climate-education custa 40 e dá 8 pontos de apoio às 8 regiões.
    const rich: GameState = { ...createInitialState(1), actionPoints: 100 };
    const after = hudView(unlockSkill(rich, 'climate-education'));

    expect(after.actionPoints).toBe('60');
    expect(after.support).toBe('58');
  });
});
