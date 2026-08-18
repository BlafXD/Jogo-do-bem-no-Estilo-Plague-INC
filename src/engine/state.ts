// Tipos do domínio e estado inicial da partida. Os contratos estão escritos em
// docs/GDD.md §3 — GameState, Region, Skill, Effect e ClimateEvent.
// O estado inicial é montado a partir de src/data/*.json, nunca de número solto
// no código (regra 8).

import balanceData from '../data/balance.json';
import regionsData from '../data/regions.json';
import skillsData from '../data/skills.json';
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

/**
 * Os 5 ramos do docs/GDD.md §2.4. O tipo sai daqui, como o RegionId sai de
 * REGION_IDS: acrescentar um ramo é mexer em um lugar só, e a validação de
 * skills.json usa a mesma lista.
 */
export const SKILL_BRANCHES = ['energy', 'transport', 'nature', 'industry', 'society'] as const;

export type SkillBranch = (typeof SKILL_BRANCHES)[number];

/** Kinds de Effect que apontam para uma região ou para 'global'. */
export const TARGETED_EFFECTS = ['emissionCut', 'resilience', 'support'] as const;

/** Kinds de Effect que valem para a partida inteira e não levam alvo. */
export const UNTARGETED_EFFECTS = ['pointsPerYear', 'inertiaCut'] as const;

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
   * Separar de `seed` é o que faz o save/load do P6-07 funcionar: recarregar
   * precisa continuar a sequência de onde parou, e não recomeçá-la — se
   * `seed` fizesse os dois papéis, ou se perderia a identidade da partida, ou
   * se perderia a posição. Confirmado no `docs/GDD.md §3` em 2026-08-18.
   */
  readonly rngState: RngState;
  readonly history: readonly Snapshot[];
};

// -------------------------------------------------------------- balanceamento ---

export type Balance = {
  readonly startYear: number;
  readonly endYear: number;
  readonly ticksPerYear: number;
  /** Segundos de tempo real por tick na velocidade 1x. */
  readonly realSecondsPerTick: number;
  readonly startTemperature: number;
  readonly startEmissions: number;
  /** °C por GtCO₂ acumulado (TCRE). Fonte em docs/CIENCIA.md. */
  readonly tcre: number;
  /** Crescimento anual das emissões sem ação do jogador. Fonte em docs/CIENCIA.md. */
  readonly baselineGrowthPerYear: number;
  readonly basePointsPerYear: number;
  /** Pontos de apoio que cada região perde por ano, até o piso. */
  readonly supportDecayPerYear: number;
  /** Piso de apatia: até onde o decaimento do apoio desce sozinho. */
  readonly supportFloor: number;
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

function isRegionId(value: string): value is RegionId {
  return (REGION_IDS as readonly string[]).includes(value);
}

function assertRange(value: number, min: number, max: number, field: string, id: string): void {
  if (!Number.isFinite(value) || value < min || value > max) {
    throw new Error(
      `regions.json: a região "${id}" tem ${field} = ${value}, fora da faixa de ${min} a ${max}.`,
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
export function parseRegions(raw: readonly RawRegion[]): Readonly<Record<RegionId, Region>> {
  const byId: Partial<Record<RegionId, Region>> = {};

  for (const region of raw) {
    const id = region.id;

    if (!isRegionId(id)) {
      throw new Error(`regions.json: id de região desconhecido "${id}".`);
    }
    if (byId[id] !== undefined) {
      throw new Error(`regions.json: a região "${id}" aparece mais de uma vez.`);
    }

    assertRange(region.cleanShare, 0, 1, 'cleanShare', id);
    assertRange(region.support, 0, 100, 'support', id);
    assertRange(region.resilience, 0, 100, 'resilience', id);

    byId[id] = { ...region, id };
  }

  const missing = REGION_IDS.filter((id) => byId[id] === undefined);
  if (missing.length > 0) {
    throw new Error(`regions.json: faltam as regiões ${missing.join(', ')}.`);
  }

  return byId as Record<RegionId, Region>;
}

// ------------------------------------------------------------ habilidades ---

/** Um efeito como ele sai do JSON: `kind` e `target` ainda são string solta. */
export type RawEffect = {
  readonly kind: string;
  readonly value: number;
  readonly target?: string;
};

/** Um nó como ele sai do JSON, antes de `parseSkills` provar que ele é um Skill. */
export type RawSkill = {
  readonly id: string;
  readonly branch: string;
  readonly name: string;
  readonly description: string;
  readonly fact: string;
  readonly cost: number;
  readonly requires: readonly string[];
  readonly effects: readonly RawEffect[];
};

function parseEffect(raw: RawEffect, skillId: string): Effect {
  const untargeted = (UNTARGETED_EFFECTS as readonly string[]).includes(raw.kind);
  const targeted = (TARGETED_EFFECTS as readonly string[]).includes(raw.kind);

  if (!untargeted && !targeted) {
    throw new Error(`skills.json: "${skillId}" tem efeito de tipo desconhecido "${raw.kind}".`);
  }
  if (!Number.isFinite(raw.value) || raw.value <= 0) {
    throw new Error(`skills.json: "${skillId}" tem efeito ${raw.kind} com valor ${raw.value}.`);
  }

  if (untargeted) {
    if (raw.target !== undefined) {
      throw new Error(`skills.json: o efeito ${raw.kind} de "${skillId}" não leva target.`);
    }
    return { kind: raw.kind as 'pointsPerYear' | 'inertiaCut', value: raw.value };
  }

  const target = raw.target;
  if (target === undefined) {
    throw new Error(`skills.json: o efeito ${raw.kind} de "${skillId}" precisa de target.`);
  }
  if (target !== 'global' && !(REGION_IDS as readonly string[]).includes(target)) {
    throw new Error(`skills.json: "${skillId}" aponta para o alvo desconhecido "${target}".`);
  }

  return {
    kind: raw.kind as 'emissionCut' | 'resilience' | 'support',
    target: target as RegionId | 'global',
    value: raw.value,
  };
}

/**
 * Converte a lista crua de `skills.json` na árvore tipada.
 *
 * Valida só o que é **estrutura**: id único, ramo conhecido, efeito bem
 * formado, pré-requisito que existe e grafo sem ciclo. O que é **desenho** —
 * 20 nós, 4 por ramo, custo total — fica no tests/skills.test.ts, porque
 * aumentar a árvore é uma decisão legítima (o docs/GDD.md §2.4 prevê 40 nós) e
 * não pode explodir na carga do jogo.
 *
 * Existe pelo mesmo motivo do parseRegions: `src/data/*.json` é o arquivo que o
 * pacote [D-Historia] edita à mão, sem abrir um .ts. O erro precisa dizer o que
 * está errado, e não quebrar em algum lugar distante depois.
 */
export function parseSkills(raw: readonly RawSkill[]): readonly Skill[] {
  const byId = new Map<string, Skill>();

  for (const node of raw) {
    if (!node.id.trim()) {
      throw new Error('skills.json: há um nó sem id.');
    }
    if (byId.has(node.id)) {
      throw new Error(`skills.json: a habilidade "${node.id}" aparece mais de uma vez.`);
    }
    if (!(SKILL_BRANCHES as readonly string[]).includes(node.branch)) {
      throw new Error(`skills.json: "${node.id}" está no ramo desconhecido "${node.branch}".`);
    }
    for (const field of ['name', 'description', 'fact'] as const) {
      if (!node[field].trim()) {
        throw new Error(`skills.json: "${node.id}" está sem ${field}.`);
      }
    }
    if (!Number.isFinite(node.cost) || node.cost <= 0) {
      throw new Error(`skills.json: "${node.id}" tem custo ${node.cost}.`);
    }
    if (node.effects.length === 0) {
      throw new Error(`skills.json: "${node.id}" não tem efeito nenhum.`);
    }

    byId.set(node.id, {
      ...node,
      branch: node.branch as SkillBranch,
      requires: node.requires,
      effects: node.effects.map((effect) => parseEffect(effect, node.id)),
    });
  }

  for (const node of byId.values()) {
    for (const required of node.requires) {
      if (!byId.has(required)) {
        throw new Error(`skills.json: "${node.id}" exige "${required}", que não existe.`);
      }
    }
  }

  assertNoCycle(byId);

  return [...byId.values()];
}

/**
 * Recusa pré-requisito circular.
 *
 * Sem isto, um ciclo não daria erro na carga: daria uma habilidade que nunca
 * fica disponível, porque o pré-requisito dela depende dela mesma. O jogador
 * veria um nó permanentemente bloqueado e ninguém saberia por quê.
 */
function assertNoCycle(byId: ReadonlyMap<string, Skill>): void {
  const done = new Set<string>();
  const open = new Set<string>();

  const walk = (id: string): void => {
    if (done.has(id)) return;
    if (open.has(id)) {
      throw new Error(`skills.json: pré-requisito circular em "${id}".`);
    }
    open.add(id);
    for (const required of byId.get(id)?.requires ?? []) walk(required);
    open.delete(id);
    done.add(id);
  };

  for (const id of byId.keys()) walk(id);
}

/** A árvore inteira, validada na carga. Ordem igual à do skills.json. */
export const skills: readonly Skill[] = parseSkills(skillsData);

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
