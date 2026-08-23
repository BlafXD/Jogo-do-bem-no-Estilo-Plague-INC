// Aplicação dos efeitos da árvore de habilidades: checagem de pré-requisito,
// cobrança do custo em PAC e soma dos Effect no estado.
// Os nós ficam em src/data/skills.json; os ramos estão em docs/GDD.md §2.4.
// Implementado em P6-05. A validação do arquivo mora no parseSkills (state.ts).
//
// Os cinco tipos de Effect se dividem em dois grupos, e a divisão é a decisão
// central deste módulo:
//
//   1. `support`, `resilience` e `inertiaCut` valem **na hora da compra**. São
//      um empurrão único: entram no estado e acabou.
//   2. `emissionCut` e `pointsPerYear` são **contínuos**. Não são gravados em
//      lugar nenhum — são recalculados a partir de `unlockedSkills` a cada tick.
//
// Guardar os contínuos no estado seria duplicar informação que já está na lista
// de compras, e save/load (P6-07) teria dois lugares para errar. Como derivada,
// a lista de habilidades é a única fonte da verdade.

import {
  balance,
  REGION_IDS,
  skills,
  type GameState,
  type Region,
  type RegionId,
  type Skill,
  type SkillId,
} from './state';

const byId: ReadonlyMap<SkillId, Skill> = new Map(skills.map((skill) => [skill.id, skill]));

export function skillById(id: SkillId): Skill | undefined {
  return byId.get(id);
}

export function isUnlocked(state: GameState, id: SkillId): boolean {
  return state.unlockedSkills.includes(id);
}

// ------------------------------------------------------------- a compra ---

/** Por que uma compra foi recusada. A UI (P6-06) usa isto para explicar o nó. */
export type UnlockRefusal =
  'unknownSkill' | 'alreadyUnlocked' | 'missingRequirement' | 'notEnoughPoints';

export type UnlockCheck =
  { readonly ok: true } | { readonly ok: false; readonly reason: UnlockRefusal };

/**
 * A habilidade pode ser comprada agora?
 *
 * A ordem das recusas é a ordem em que elas interessam a quem lê: primeiro se o
 * nó existe, depois se já é seu, depois se está destravado, e só então se o
 * dinheiro dá. Um nó bloqueado por pré-requisito não deve dizer "falta PAC".
 */
export function canUnlock(state: GameState, id: SkillId): UnlockCheck {
  const skill = byId.get(id);

  if (skill === undefined) return { ok: false, reason: 'unknownSkill' };
  if (isUnlocked(state, id)) return { ok: false, reason: 'alreadyUnlocked' };
  if (!skill.requires.every((required) => isUnlocked(state, required))) {
    return { ok: false, reason: 'missingRequirement' };
  }
  if (state.actionPoints < skill.cost) return { ok: false, reason: 'notEnoughPoints' };

  return { ok: true };
}

/** Mantém apoio e resiliência dentro do 0 a 100 do docs/GDD.md §2.2. */
function clamp(value: number): number {
  return Math.max(0, Math.min(100, value));
}

/**
 * Aplica os efeitos de empurrão único de uma habilidade recém-comprada.
 *
 * `emissionCut` e `pointsPerYear` não aparecem aqui de propósito: quem os lê é
 * o tick, a cada mês, a partir da lista de compras.
 */
function applyImmediateEffects(state: GameState, skill: Skill): GameState {
  let regions = state.regions;
  let inertia = state.inertia;

  const bump = (target: RegionId | 'global', field: 'support' | 'resilience', value: number) => {
    const touched: Partial<Record<RegionId, Region>> = {};
    for (const regionId of REGION_IDS) {
      const region = regions[regionId];
      touched[regionId] =
        target === 'global' || target === regionId
          ? { ...region, [field]: clamp(region[field] + value) }
          : region;
    }
    regions = touched as Record<RegionId, Region>;
  };

  for (const effect of skill.effects) {
    switch (effect.kind) {
      case 'support':
      case 'resilience':
        bump(effect.target, effect.kind, effect.value);
        break;
      case 'inertiaCut':
        inertia = clamp(inertia - effect.value);
        break;
      case 'emissionCut':
      case 'pointsPerYear':
        break;
    }
  }

  return { ...state, regions, inertia };
}

/**
 * Compra uma habilidade: cobra o PAC, guarda o id e aplica os efeitos imediatos.
 *
 * Quando a compra não é possível, devolve o estado recebido **intacto**, em vez
 * de lançar. É a mesma escolha do advanceTick depois do fim da partida: a UI
 * pergunta antes com `canUnlock`, e um clique numa borda de quadro não pode
 * derrubar a página.
 */
export function unlockSkill(state: GameState, id: SkillId): GameState {
  const skill = byId.get(id);
  if (skill === undefined || !canUnlock(state, id).ok) return state;

  return {
    ...applyImmediateEffects(state, skill),
    actionPoints: state.actionPoints - skill.cost,
    unlockedSkills: [...state.unlockedSkills, id],
  };
}

// --------------------------------------------------- os efeitos contínuos ---

/** Percorre os efeitos das habilidades já compradas. */
function* unlockedEffects(state: GameState) {
  for (const id of state.unlockedSkills) {
    const skill = byId.get(id);
    if (skill !== undefined) yield* skill.effects;
  }
}

/**
 * Quanto as emissões de uma região caem por ano graças à árvore, como fração.
 *
 * O `value` do Effect é **porcentagem ao ano** (docs/GDD.md §3), então a divisão
 * por 100 acontece aqui e em nenhum outro lugar. O teto de 1 existe para o caso
 * de uma árvore futura somar mais de 100%: emissão negativa não é sumidouro, é
 * bug.
 */
export function emissionCutFor(state: GameState, region: RegionId): number {
  let percent = 0;
  for (const effect of unlockedEffects(state)) {
    if (effect.kind === 'emissionCut' && (effect.target === 'global' || effect.target === region)) {
      percent += effect.value;
    }
  }
  return Math.min(1, percent / 100);
}

/**
 * A soma dos cortes já comprados, em **porcentagem ao ano**.
 *
 * É o que a Inércia (P7-03) enxerga como ameaça: o §2.6 diz que ela cresce mais
 * quanto mais o jogador já cortou, porque é exatamente aí que a transição
 * ameaça quem vive do combustível fóssil.
 *
 * **Soma todo `emissionCut`, com ou sem região alvo**, e é diferente do
 * `emissionCutFor`: aquele responde "quanto cai *nesta* região" e divide por
 * 100; este responde "quanto o jogador já cortou no total" e devolve o número
 * na unidade em que o docs/GDD.md §3 o escreve. Um corte regional de 0,5%/ano
 * conta como 0,5, igual a um global — o lobby de quem perde a região reage do
 * mesmo jeito. É a forma que a verificação do P3-05 mediu.
 */
export function purchasedCutPercent(state: GameState): number {
  let percent = 0;
  for (const effect of unlockedEffects(state)) {
    if (effect.kind === 'emissionCut') percent += effect.value;
  }
  return percent;
}

/** PAC por ano: a entrada de base do balance.json mais o que a árvore acrescenta. */
export function pointsPerYear(state: GameState): number {
  let extra = 0;
  for (const effect of unlockedEffects(state)) {
    if (effect.kind === 'pointsPerYear') extra += effect.value;
  }
  return balance.basePointsPerYear + extra;
}
