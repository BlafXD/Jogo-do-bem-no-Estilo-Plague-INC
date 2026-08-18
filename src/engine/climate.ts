// Emissões → CO₂ acumulado → temperatura.
// Fórmula em docs/GDD.md §4: temperature = startTemperature + tcre * cumulativeCO2.
// Toda constante vem de src/data/balance.json e toda origem de número climático
// está em docs/CIENCIA.md (regra 9). Implementado em P6-02.
//
// Este módulo não sabe o que é a passagem do tempo. Ele recebe estado e devolve
// estado novo; quem orquestra o mês é o tick.ts (P6-03).
//
// Desde o P6-05 ele lê a árvore de habilidades — mas só através do
// `emissionCutFor`, que devolve um número. O climate.ts não sabe o que é um nó,
// quanto ele custou nem em que ramo está: sabe que as emissões de uma região
// caem a uma certa taxa por ano, e mais nada.

import { emissionCutFor } from './skills';
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
function growEmissions(state: GameState): GameState['regions'] {
  const grown: Partial<Record<RegionId, Region>> = {};

  for (const id of REGION_IDS) {
    const region = state.regions[id];
    grown[id] = {
      ...region,
      emissions: region.emissions * GROWTH_PER_TICK * cutPerTick(state, id),
    };
  }

  return grown as Record<RegionId, Region>;
}

/**
 * O fator de queda de um mês, vindo das habilidades já compradas.
 *
 * A raiz de ordem `ticksPerYear` é a mesma do GROWTH_PER_TICK, e existe pelo
 * mesmo motivo: doze meses precisam compor exatamente a taxa anual do
 * `docs/GDD.md §3`, e não somar um resto que se acumularia por 900 ticks.
 *
 * Crescimento e corte são **fatores multiplicados**, não subtraídos um do
 * outro: 0,93% de crescimento com 5,5% de corte dá uma queda líquida, e é essa
 * composição que faz a curva virar. Quem compra cedo multiplica menos vezes
 * para cima — é daí que sai a diferença entre agir em 2030 e agir em 2060.
 */
function cutPerTick(state: GameState, region: RegionId): number {
  return (1 - emissionCutFor(state, region)) ** (1 / balance.ticksPerYear);
}

/**
 * Avança o clima em um tick: as regiões emitem, o CO₂ acumula, a temperatura
 * responde e a linha de base sobe para o mês seguinte.
 *
 * A ordem importa. A emissão do mês entra com a taxa vigente **antes** de a
 * taxa crescer — inverter os dois adiantaria um mês de crescimento e faria a
 * partida terminar mais quente do que a fonte descreve. Pela mesma razão, uma
 * habilidade comprada hoje só aparece na emissão do mês que vem.
 */
export function advanceClimate(state: GameState): GameState {
  const cumulativeCO2 = state.cumulativeCO2 + globalEmissions(state) / balance.ticksPerYear;

  return {
    ...state,
    cumulativeCO2,
    temperature: temperatureFor(cumulativeCO2),
    regions: growEmissions(state),
  };
}
