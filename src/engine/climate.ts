// Emissões → CO₂ acumulado → temperatura.
// Fórmula em docs/GDD.md §4: temperature = startTemperature + tcre * cumulativeCO2.
// Toda constante vem de src/data/balance.json e toda origem de número climático
// está em docs/CIENCIA.md (regra 9). Implementado em P6-02.
//
// Este módulo não sabe o que é a passagem do tempo nem o que é uma habilidade.
// Ele recebe estado e devolve estado novo. Quem orquestra o mês é o tick.ts
// (P6-03); quem abate emissões é o skills.ts (P6-05).

import { balance, REGION_IDS, type GameState, type Region, type RegionId } from './state';

/**
 * Quanto as emissões crescem em um tick, derivado da taxa anual.
 *
 * A raiz de ordem `ticksPerYear` existe para que doze ticks componham
 * exatamente um ano de crescimento. Multiplicar por `1 + taxa/12` a cada mês
 * daria um ano um pouco maior, e o erro se acumularia ao longo dos 900 ticks
 * de uma partida inteira.
 */
const GROWTH_PER_TICK = (1 + balance.baselineGrowthPerYear) ** (1 / balance.ticksPerYear);

/** Emissão global anual, em GtCO₂, somando as 8 regiões. */
export function globalEmissions(state: GameState): number {
  return REGION_IDS.reduce((total, id) => total + state.regions[id].emissions, 0);
}

/**
 * Temperatura correspondente a um estoque de CO₂ acumulado, em °C acima do
 * pré-industrial.
 *
 * É a relação linear do TCRE: cada GtCO₂ que entra na atmosfera vale um tanto
 * fixo de aquecimento, e o que importa é o acumulado, não a emissão do ano.
 * É por isso que reduzir emissões desacelera a subida, mas não a desfaz —
 * o dilema que o jogo inteiro existe para mostrar.
 */
export function temperatureFor(cumulativeCO2: number): number {
  return balance.startTemperature + balance.tcre * cumulativeCO2;
}

/**
 * Aplica um tick de crescimento da linha de base às emissões de cada região.
 *
 * É o mundo seguindo sem nenhuma política climática nova: o cenário SSP3-7.0
 * do IPCC, em que as emissões dobram até 2100 (fonte em docs/CIENCIA.md).
 *
 * **Não é o antagonista.** A Inércia (P7-03) age por cima deste crescimento,
 * não no lugar dele — sem isso, o jogador que não faz nada não perde a partida.
 */
function growEmissions(regions: GameState['regions']): GameState['regions'] {
  const grown: Partial<Record<RegionId, Region>> = {};

  for (const id of REGION_IDS) {
    const region = regions[id];
    grown[id] = { ...region, emissions: region.emissions * GROWTH_PER_TICK };
  }

  return grown as Record<RegionId, Region>;
}

/**
 * Avança o clima em um tick: as regiões emitem, o CO₂ acumula, a temperatura
 * responde e a linha de base sobe para o mês seguinte.
 *
 * A ordem importa. A emissão do mês entra com a taxa vigente **antes** de a
 * taxa crescer — inverter os dois adiantaria um mês de crescimento e faria a
 * partida terminar mais quente do que a fonte descreve.
 */
export function advanceClimate(state: GameState): GameState {
  const cumulativeCO2 = state.cumulativeCO2 + globalEmissions(state) / balance.ticksPerYear;

  return {
    ...state,
    cumulativeCO2,
    temperature: temperatureFor(cumulativeCO2),
    regions: growEmissions(state.regions),
  };
}
