// O protótipo da Inércia (P3-05), como camada de simulação.
//
// **Isto não é a implementação.** Quem implementa é o `P7-03`, em
// `src/engine/inertia.ts`. Aqui a regra proposta é aplicada **por fora** do
// engine, entre um `advanceTick` e o seguinte, usando só o que o engine já
// exporta. O objetivo é um só: descobrir se os números da especificação
// produzem a curva de tensão que o `docs/CURVA-DE-DIFICULDADE.md` pede, **antes**
// de alguém escrever o código de produção.
//
// O `climate.ts` já previa esta forma: "A Inércia (P7-03) age por cima deste
// crescimento, não no lugar dele". E o `tick.ts` já previa o dreno de apoio:
// "Quem já está no piso ou abaixo dele não se move (…) Furar o piso é trabalho
// de evento e da Inércia". As duas peças que este protótipo precisa do engine
// já estavam lá, escritas para este dia.

import {
  balance,
  REGION_IDS,
  type GameState,
  type Region,
  type RegionId,
} from '../src/engine/state';

/** As constantes da proposta. Todas viram chave do `balance.json` no P7-03. */
export type InertiaRules = {
  /** Crescimento de base, ao ano. O lobby existe mesmo se o jogador não fizer nada. */
  readonly baseGrowthPerYear: number;
  /** Quanto cada 1%/ano de corte comprado alimenta a Inércia, ao ano — o espelho do §2.6. */
  readonly growthPerCutPercent: number;
  /** Quanto cada ponto de apoio acima do piso segura a Inércia, ao ano. */
  readonly dampingPerSupportPoint: number;
  /** Agravo de emissão que uma ação de subsídio aplica, com a Inércia em 100. */
  readonly subsidyBite: number;
  /** Pontos de apoio que uma campanha de desinformação derruba, com a Inércia em 100. */
  readonly disinformationBite: number;
  /** Custo em PAC de uma contenção, com só o primeiro nó de Sociedade comprado. */
  readonly containCost: number;
  /** Desconto no custo da contenção por nó de Sociedade além do primeiro. */
  readonly containDiscountPerNode: number;
  /** Pontos de Inércia que uma contenção derruba. */
  readonly containRelief: number;
};

/** De quantos em quantos ticks a Inércia age — o "~6 ticks" do `docs/GDD.md §2.6`. */
export const ACTION_EVERY_TICKS = 6;

function clamp(value: number): number {
  return Math.min(100, Math.max(0, value));
}

/** A soma dos cortes comprados, em %/ano. É o que a Inércia enxerga como ameaça. */
function purchasedCutPercent(state: GameState, cutOf: (id: string) => number): number {
  return state.unlockedSkills.reduce((total, id) => total + cutOf(id), 0);
}

/** O apoio médio global. Repetido aqui para não depender da ordem de import do engine. */
function meanSupport(state: GameState): number {
  return REGION_IDS.reduce((t, id) => t + state.regions[id].support, 0) / REGION_IDS.length;
}

/**
 * Quanto a Inércia cresce neste tick.
 *
 * **É o espelho do `docs/GDD.md §2.6`, escrito como conta.** Ela sobe sozinha um
 * pouco (o lobby não depende do jogador), sobe mais quanto mais o jogador já
 * cortou — porque é exatamente aí que a transição ameaça quem vive do combustível
 * fóssil — e desce na medida em que houver apoio público acima do piso de apatia.
 *
 * O termo do meio é o que devolve tensão ao fim da partida, e o de baixo é o que
 * dá função ao ramo Sociedade, que o `docs/BALANCEAMENTO.md` mostrou ser hoje uma
 * armadilha.
 */
export function inertiaGrowthPerTick(
  state: GameState,
  rules: InertiaRules,
  cutOf: (id: string) => number,
): number {
  const pressure = rules.growthPerCutPercent * purchasedCutPercent(state, cutOf);
  const slack = Math.max(0, meanSupport(state) - balance.supportFloor);
  const perYear = rules.baseGrowthPerYear + pressure - rules.dampingPerSupportPoint * slack;
  return perYear / balance.ticksPerYear;
}

/** As duas ações modeladas. A terceira do §2.6 está na especificação e fora daqui. */
export type InertiaAction = 'subsidies' | 'disinformation';

/**
 * Qual ação a Inércia usa neste turno.
 *
 * Alterna, de propósito: um sorteio faria a verificação depender da seed e um
 * "escolhe a mais eficaz" faria dela um otimizador, que é desenho que o `P7-03`
 * pode explorar mas que esta medição não precisa. Alternar dá o pior caso médio
 * e mantém o número reprodutível.
 */
export function actionForTick(tick: number): InertiaAction {
  return (tick / ACTION_EVERY_TICKS) % 2 === 0 ? 'subsidies' : 'disinformation';
}

/**
 * Aplica um turno da Inércia ao estado.
 *
 * **Os dois efeitos são permanentes**, e é essa a diferença que faz o modelo
 * funcionar: o subsídio empurra a emissão da região para cima e ela segue dali,
 * crescendo e sendo cortada a partir do valor novo; a desinformação tira apoio e
 * o desgaste do `tick.ts` não devolve. Uma Inércia cujo estrago se desfaz sozinho
 * não cria tensão nenhuma — só barulho.
 */
export function applyInertiaAction(state: GameState, rules: InertiaRules): GameState {
  const intensity = state.inertia / 100;
  const action = actionForTick(state.tick);
  const regions: Partial<Record<RegionId, Region>> = {};

  for (const id of REGION_IDS) {
    const region = state.regions[id];
    regions[id] =
      action === 'subsidies'
        ? { ...region, emissions: region.emissions * (1 + rules.subsidyBite * intensity) }
        : {
            ...region,
            // Sem piso: furar o de apatia é justamente o trabalho dela, e é o
            // que torna a derrota por apoio do §2.7 alcançável pela primeira vez.
            support: Math.max(0, region.support - rules.disinformationBite * intensity),
          };
  }

  return { ...state, regions: regions as Record<RegionId, Region> };
}

/** Cresce a Inércia num tick, sem agir. */
export function growInertia(
  state: GameState,
  rules: InertiaRules,
  cutOf: (id: string) => number,
): GameState {
  return { ...state, inertia: clamp(state.inertia + inertiaGrowthPerTick(state, rules, cutOf)) };
}

/** Os quatro nós do ramo Sociedade, na ordem da árvore. */
export const SOCIETY_NODES = [
  'climate-education',
  'treaties',
  'early-warning',
  'coastal-defence',
] as const;

/**
 * Quanto custa uma contenção agora, ou `null` se ela ainda não está disponível.
 *
 * **A trava em `climate-education` é a decisão central da proposta**, e ela
 * nasceu de uma medição que deu errado. Numa primeira versão a contenção era um
 * gasto de PAC solto, disponível desde 2025 — e a varredura mostrou que ela
 * neutralizava a Inércia inteira mais barato do que o ramo Sociedade,
 * **agravando** a armadilha do `docs/BALANCEAMENTO.md` em vez de curá-la: agora
 * o ramo não só não compensava como tinha um substituto melhor.
 *
 * Condicionar a contenção a Sociedade inverte isso de uma vez. O ramo deixa de
 * ser um bônus de PAC que não se paga e passa a ser a **licença para lutar**; e
 * cada nó seguinte barateia a luta, o que dá razão para comprar os quatro.
 */
export function containCost(state: GameState, rules: InertiaRules): number | null {
  if (!state.unlockedSkills.includes(SOCIETY_NODES[0])) return null;
  const owned = SOCIETY_NODES.filter((id) => state.unlockedSkills.includes(id)).length;
  return rules.containCost * (1 - rules.containDiscountPerNode * (owned - 1));
}

/** O jogador gasta PAC para empurrar a Inércia para baixo. */
export function contain(state: GameState, rules: InertiaRules): GameState {
  const cost = containCost(state, rules);
  if (cost === null || state.actionPoints < cost) return state;
  return {
    ...state,
    actionPoints: state.actionPoints - cost,
    inertia: clamp(state.inertia - rules.containRelief),
  };
}
