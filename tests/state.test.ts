import { describe, expect, it } from 'vitest';
import {
  balance,
  createInitialState,
  parseRegions,
  REGION_IDS,
  type RawRegion,
} from '../src/engine/state';

function validRegion(id: string): RawRegion {
  return {
    id,
    name: `Região ${id}`,
    population: 0,
    emissions: 0,
    cleanShare: 0,
    support: 50,
    resilience: 50,
    economy: 100,
  };
}

describe('createInitialState', () => {
  it('lê os valores de abertura do balance.json, sem número solto no código', () => {
    const state = createInitialState(2025);

    expect(state.year).toBe(balance.startYear);
    expect(state.temperature).toBe(balance.startTemperature);
    expect(state.tick).toBe(0);
    expect(state.cumulativeCO2).toBe(0);
  });

  it('começa sem habilidade, sem evento e sem histórico', () => {
    const state = createInitialState(1);

    expect(state.unlockedSkills).toEqual([]);
    expect(state.activeEvents).toEqual([]);
    expect(state.history).toEqual([]);
    expect(state.actionPoints).toBe(0);
    expect(state.inertia).toBe(0);
  });

  it('carrega as 8 macrorregiões, indexadas por id', () => {
    const state = createInitialState(1);

    expect(Object.keys(state.regions)).toHaveLength(8);
    for (const id of REGION_IDS) {
      expect(state.regions[id].id).toBe(id);
      expect(state.regions[id].name.length).toBeGreaterThan(0);
    }
  });

  it('guarda a seed e deriva dela a posição inicial do gerador', () => {
    const state = createInitialState(2025);

    expect(state.seed).toBe(2025);
    expect(state.rngState).toBe(2025);
  });

  it('a mesma seed produz o mesmo estado inicial', () => {
    expect(createInitialState(42)).toEqual(createInitialState(42));
  });

  it('seeds diferentes começam em posições diferentes do gerador', () => {
    expect(createInitialState(1).rngState).not.toBe(createInitialState(2).rngState);
  });
});

describe('parseRegions', () => {
  // O pacote [D-Historia] edita src/data/*.json à mão, sem abrir um .ts. Estes
  // testes existem para o erro apontar o campo errado em vez de estourar longe
  // dali, no meio de um tick.
  it('aceita as 8 regiões válidas', () => {
    const map = parseRegions(REGION_IDS.map((id) => validRegion(id)));
    expect(Object.keys(map)).toHaveLength(8);
  });

  it('recusa id de região desconhecido', () => {
    const list = [...REGION_IDS.map((id) => validRegion(id)), validRegion('br')];
    expect(() => parseRegions(list)).toThrow(/desconhecido "br"/);
  });

  it('recusa região repetida', () => {
    const list = [...REGION_IDS.map((id) => validRegion(id)), validRegion('eu')];
    expect(() => parseRegions(list)).toThrow(/"eu" aparece mais de uma vez/);
  });

  it('recusa lista incompleta e diz quais faltam', () => {
    const list = [validRegion('na'), validRegion('eu')];
    expect(() => parseRegions(list)).toThrow(/faltam as regiões la, af, me, ea, sa, oc/);
  });

  it('recusa cleanShare fora de 0 a 1', () => {
    const list = REGION_IDS.map((id) =>
      id === 'af' ? { ...validRegion(id), cleanShare: 1.5 } : validRegion(id),
    );
    expect(() => parseRegions(list)).toThrow(/cleanShare = 1.5, fora da faixa de 0 a 1/);
  });

  it('recusa support fora de 0 a 100', () => {
    const list = REGION_IDS.map((id) =>
      id === 'oc' ? { ...validRegion(id), support: -3 } : validRegion(id),
    );
    expect(() => parseRegions(list)).toThrow(/support = -3, fora da faixa de 0 a 100/);
  });

  it('recusa resilience não numérica vinda de JSON malformado', () => {
    const list = REGION_IDS.map((id) =>
      id === 'na' ? { ...validRegion(id), resilience: Number.NaN } : validRegion(id),
    );
    expect(() => parseRegions(list)).toThrow(/resilience/);
  });
});

describe('dados reais de src/data', () => {
  // O P3-01 preencheu regions.json com dado de fonte (docs/CIENCIA.md). Estes
  // dois testes existem para o zero não voltar em silêncio e para a soma das
  // regiões não descolar do startEmissions. As duas coisas quebram a simulação
  // de clima sem fazer nenhum outro teste ficar vermelho.
  const state = createInitialState(1);
  const regions = REGION_IDS.map((id) => state.regions[id]);

  it('nenhuma região ficou com dado zerado', () => {
    for (const region of regions) {
      expect(region.population).toBeGreaterThan(0);
      expect(region.emissions).toBeGreaterThan(0);
      expect(region.cleanShare).toBeGreaterThan(0);
    }
  });

  it('a soma das emissões das regiões é o startEmissions do balance.json', () => {
    const sum = regions.reduce((total, region) => total + region.emissions, 0);
    expect(sum).toBeCloseTo(balance.startEmissions, 6);
  });
});
