// Tipos do domínio e estado inicial da partida. Os contratos estão escritos em
// docs/GDD.md §3 — GameState, Region, Skill, Effect e ClimateEvent.
// O estado inicial é montado a partir de src/data/*.json, nunca de número solto
// no código (regra 8).

import balanceData from '../data/balance.json';
import regionsData from '../data/regions.json';
import { createRngState, type RngState } from './rng';

// ---------------------------------------------------------------- regiões ---

/**
 * Fonte única das 8 macrorregiões (docs/GDD.md §2.3). O tipo `RegionId` é
 * derivado daqui, então acrescentar uma região é mexer em um lugar só.
 */
export const REGION_IDS = ['na', 'la', 'eu', 'af', 'me', 'ea', 'sa', 'oc'] as const;

export type RegionId = (typeof REGION_IDS)[number];

export type Region = {
  readonly id: RegionId;
  readonly name: string;
  /** Milhões de habitantes. */
  readonly population: number;
  /** GtCO₂ por ano: fóssil mais uso da terra. Fonte em docs/CIENCIA.md. */
  readonly emissions: number;
  /** Fatia limpa da matriz elétrica, de 0 a 1. Fonte em docs/CIENCIA.md. */
  readonly cleanShare: number;
  /** Apoio público, de 0 a 100. */
  readonly support: number;
  /** Resiliência, de 0 a 100. */
  readonly resilience: number;
  /** Índice econômico relativo, base 100. */
  readonly economy: number;
};

// ------------------------------------------------------------ habilidades ---

export type SkillId = string;

export type SkillBranch = 'energy' | 'transport' | 'nature' | 'industry' | 'society';

export type Effect =
  | { readonly kind: 'emissionCut'; readonly target: RegionId | 'global'; readonly value: number }
  | { readonly kind: 'pointsPerYear'; readonly value: number }
  | { readonly kind: 'resilience'; readonly target: RegionId | 'global'; readonly value: number }
  | { readonly kind: 'support'; readonly target: RegionId | 'global'; readonly value: number }
  | { readonly kind: 'inertiaCut'; readonly value: number };

export type Skill = {
  readonly id: SkillId;
  readonly branch: SkillBranch;
  readonly name: string;
  /** Efeito no jogo, uma frase. */
  readonly description: string;
  /** Fato real, uma frase — fonte em docs/CIENCIA.md. */
  readonly fact: string;
  readonly cost: number;
  readonly requires: readonly SkillId[];
  readonly effects: readonly Effect[];
};

// ----------------------------------------------------------------- eventos ---

export type ClimateEvent = {
  readonly id: string;
  readonly name: string;
  /** Só entra no sorteio acima desta temperatura. */
  readonly tempThreshold: number;
  readonly baseWeight: number;
  readonly targets: readonly RegionId[] | 'any';
  readonly impact: {
    readonly support: number;
    readonly economy: number;
    readonly points: number;
  };
  readonly mitigatedByResilience: boolean;
  readonly fact: string;
};

/**
 * Evento em curso. Forma mínima — quem define o ciclo de vida de verdade
 * (duração, intensidade, encadeamento) é o P7-01, dono de events.ts.
 */
export type ActiveEvent = {
  readonly eventId: string;
  readonly target: RegionId;
  readonly ticksRemaining: number;
};

// ------------------------------------------------------------------ estado ---

/** Uma linha do gráfico da linha do tempo da tela final (docs/GDD.md §2.7). */
export type Snapshot = {
  readonly tick: number;
  readonly year: number;
  readonly temperature: number;
  readonly emissions: number;
  readonly cumulativeCO2: number;
  readonly averageSupport: number;
};

export type GameState = {
  readonly year: number;
  /** 1 tick = 1 mês. Começa em 0. */
  readonly tick: number;
  /** PAC — Pontos de Ação Climática. */
  readonly actionPoints: number;
  /** GtCO₂ acumulados desde o startYear. */
  readonly cumulativeCO2: number;
  /** °C acima do pré-industrial. */
  readonly temperature: number;
  readonly regions: Readonly<Record<RegionId, Region>>;
  readonly unlockedSkills: readonly SkillId[];
  readonly activeEvents: readonly ActiveEvent[];
  readonly inertia: number;
  /**
   * Seed original da partida. Nunca muda — é o que identifica a partida e
   * permite repetir uma exatamente igual.
   */
  readonly seed: number;
  /**
   * Posição atual do gerador. Anda a cada sorteio.
   *
   * É um campo a mais em relação ao `docs/GDD.md §3`, que só previa `seed`.
   * Separar os dois é o que faz o save/load do P6-07 funcionar: recarregar
   * precisa continuar a sequência de onde parou, e não recomeçá-la — se
   * `seed` fizesse os dois papéis, ou se perderia a identidade da partida, ou
   * se perderia a posição. Confirmar no GDD antes de considerar fechado.
   */
  readonly rngState: RngState;
  readonly history: readonly Snapshot[];
};

// -------------------------------------------------------------- balanceamento ---

export type Balance = {
  readonly startYear: number;
  readonly endYear: number;
  readonly ticksPerYear: number;
  readonly startTemperature: number;
  readonly startEmissions: number;
  /** °C por GtCO₂ acumulado (TCRE). Fonte em docs/CIENCIA.md. */
  readonly tcre: number;
  readonly basePointsPerYear: number;
  readonly supportDecayPerYear: number;
  readonly inertiaGrowthPerYear: number;
  readonly eventWeightPerDegree: number;
  readonly loseTemperature: number;
};

export const balance: Balance = balanceData;

// ----------------------------------------------------------------- leitura ---

/**
 * A mesma região como ela sai do JSON: o `id` ainda é `string` solta, porque o
 * `tsc` não tem como saber que o texto do arquivo é um dos oito ids válidos.
 * É `parseRegions` que faz essa passagem.
 */
export type RawRegion = Omit<Region, 'id'> & { readonly id: string };

function isRegionId(valor: string): valor is RegionId {
  return (REGION_IDS as readonly string[]).includes(valor);
}

function assertFaixa(
  valor: number,
  minimo: number,
  maximo: number,
  campo: string,
  id: string,
): void {
  if (!Number.isFinite(valor) || valor < minimo || valor > maximo) {
    throw new Error(
      `regions.json: a região "${id}" tem ${campo} = ${valor}, fora da faixa de ${minimo} a ${maximo}.`,
    );
  }
}

/**
 * Converte a lista crua de `regions.json` no mapa tipado do estado.
 *
 * Existe porque o `tsc` só garante o formato do JSON, não os valores: ele não
 * sabe que `support` vai de 0 a 100 nem que os 8 ids têm que estar presentes e
 * sem repetição. E `src/data/*.json` é exatamente o arquivo que o pacote
 * `[D-Historia]` vai editar à mão, sem abrir um `.ts` — então o erro precisa
 * dizer o que está errado, e não quebrar em algum lugar distante depois.
 */
export function parseRegions(cru: readonly RawRegion[]): Readonly<Record<RegionId, Region>> {
  const porId: Partial<Record<RegionId, Region>> = {};

  for (const regiao of cru) {
    const id = regiao.id;

    if (!isRegionId(id)) {
      throw new Error(`regions.json: id de região desconhecido "${id}".`);
    }
    if (porId[id] !== undefined) {
      throw new Error(`regions.json: a região "${id}" aparece mais de uma vez.`);
    }

    assertFaixa(regiao.cleanShare, 0, 1, 'cleanShare', id);
    assertFaixa(regiao.support, 0, 100, 'support', id);
    assertFaixa(regiao.resilience, 0, 100, 'resilience', id);

    porId[id] = { ...regiao, id };
  }

  const faltando = REGION_IDS.filter((id) => porId[id] === undefined);
  if (faltando.length > 0) {
    throw new Error(`regions.json: faltam as regiões ${faltando.join(', ')}.`);
  }

  return porId as Record<RegionId, Region>;
}

/**
 * Monta o estado do começo da partida.
 *
 * `actionPoints` e `inertia` começam em zero por serem "nada ainda", não por
 * serem valores ajustáveis. Se algum dia precisarem começar diferentes, o lugar
 * deles é o balance.json, não aqui (regra 8).
 */
export function createInitialState(seed: number): GameState {
  return {
    year: balance.startYear,
    tick: 0,
    actionPoints: 0,
    cumulativeCO2: 0,
    temperature: balance.startTemperature,
    regions: parseRegions(regionsData),
    unlockedSkills: [],
    activeEvents: [],
    inertia: 0,
    seed,
    rngState: createRngState(seed),
    history: [],
  };
}
