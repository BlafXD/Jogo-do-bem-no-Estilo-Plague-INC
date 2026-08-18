import { describe, expect, it } from 'vitest';
import {
  balance,
  createInitialState,
  parseRegions,
  REGION_IDS,
  type RawRegion,
} from '../src/engine/state';

function regiaoValida(id: string): RawRegion {
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
    const estado = createInitialState(2025);

    expect(estado.year).toBe(balance.startYear);
    expect(estado.temperature).toBe(balance.startTemperature);
    expect(estado.tick).toBe(0);
    expect(estado.cumulativeCO2).toBe(0);
  });

  it('começa sem habilidade, sem evento e sem histórico', () => {
    const estado = createInitialState(1);

    expect(estado.unlockedSkills).toEqual([]);
    expect(estado.activeEvents).toEqual([]);
    expect(estado.history).toEqual([]);
    expect(estado.actionPoints).toBe(0);
    expect(estado.inertia).toBe(0);
  });

  it('carrega as 8 macrorregiões, indexadas por id', () => {
    const estado = createInitialState(1);

    expect(Object.keys(estado.regions)).toHaveLength(8);
    for (const id of REGION_IDS) {
      expect(estado.regions[id].id).toBe(id);
      expect(estado.regions[id].name.length).toBeGreaterThan(0);
    }
  });

  it('guarda a seed e deriva dela a posição inicial do gerador', () => {
    const estado = createInitialState(2025);

    expect(estado.seed).toBe(2025);
    expect(estado.rngState).toBe(2025);
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
    const mapa = parseRegions(REGION_IDS.map((id) => regiaoValida(id)));
    expect(Object.keys(mapa)).toHaveLength(8);
  });

  it('recusa id de região desconhecido', () => {
    const lista = [...REGION_IDS.map((id) => regiaoValida(id)), regiaoValida('br')];
    expect(() => parseRegions(lista)).toThrow(/desconhecido "br"/);
  });

  it('recusa região repetida', () => {
    const lista = [...REGION_IDS.map((id) => regiaoValida(id)), regiaoValida('eu')];
    expect(() => parseRegions(lista)).toThrow(/"eu" aparece mais de uma vez/);
  });

  it('recusa lista incompleta e diz quais faltam', () => {
    const lista = [regiaoValida('na'), regiaoValida('eu')];
    expect(() => parseRegions(lista)).toThrow(/faltam as regiões la, af, me, ea, sa, oc/);
  });

  it('recusa cleanShare fora de 0 a 1', () => {
    const lista = REGION_IDS.map((id) =>
      id === 'af' ? { ...regiaoValida(id), cleanShare: 1.5 } : regiaoValida(id),
    );
    expect(() => parseRegions(lista)).toThrow(/cleanShare = 1.5, fora da faixa de 0 a 1/);
  });

  it('recusa support fora de 0 a 100', () => {
    const lista = REGION_IDS.map((id) =>
      id === 'oc' ? { ...regiaoValida(id), support: -3 } : regiaoValida(id),
    );
    expect(() => parseRegions(lista)).toThrow(/support = -3, fora da faixa de 0 a 100/);
  });

  it('recusa resilience não numérica vinda de JSON malformado', () => {
    const lista = REGION_IDS.map((id) =>
      id === 'na' ? { ...regiaoValida(id), resilience: Number.NaN } : regiaoValida(id),
    );
    expect(() => parseRegions(lista)).toThrow(/resilience/);
  });
});

describe('dados reais de src/data', () => {
  // O P3-01 preencheu regions.json com dado de fonte (docs/CIENCIA.md). Estes
  // dois testes existem para o zero não voltar em silêncio e para a soma das
  // regiões não descolar do startEmissions. As duas coisas quebram a simulação
  // de clima sem fazer nenhum outro teste ficar vermelho.
  const estado = createInitialState(1);
  const regioes = REGION_IDS.map((id) => estado.regions[id]);

  it('nenhuma região ficou com dado zerado', () => {
    for (const regiao of regioes) {
      expect(regiao.population).toBeGreaterThan(0);
      expect(regiao.emissions).toBeGreaterThan(0);
      expect(regiao.cleanShare).toBeGreaterThan(0);
    }
  });

  it('a soma das emissões das regiões é o startEmissions do balance.json', () => {
    const soma = regioes.reduce((total, regiao) => total + regiao.emissions, 0);
    expect(soma).toBeCloseTo(balance.startEmissions, 6);
  });
});
