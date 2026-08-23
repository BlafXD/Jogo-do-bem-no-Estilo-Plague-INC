// A Inércia — o antagonista (P7-03). Conceito no docs/GDD.md §2.6, regra e
// números verificados em docs/INERCIA.md.
//
// **Ela é espelho, não sorteio.** Cresce um pouco sozinha — o lobby fóssil
// existe de qualquer jeito — e cresce muito mais quanto mais o jogador já
// cortou, porque é exatamente aí que a transição ameaça quem vive do
// combustível fóssil. Apoio público acima do piso de apatia a segura. Nada aqui
// consome o RNG, e é de propósito: uma Inércia sorteada faria a mesma jogada dar
// partidas diferentes pelo motivo errado.
//
// **O estrago é permanente, e é isso que faz o modelo funcionar.** O subsídio
// empurra a emissão da região para cima e ela segue dali, crescendo e sendo
// cortada a partir do valor novo; a desinformação tira apoio e o desgaste do
// tick.ts não devolve. Uma Inércia cujo estrago se desfaz sozinho não cria
// tensão nenhuma — só barulho.
//
// **O que este módulo não implementa:** os recuos regulatórios do §2.6, a
// terceira ação. Encarecer habilidades ainda não compradas não tira nada do que
// o jogador já tem, e o docs/CURVA-DE-DIFICULDADE.md mostrou que essa classe de
// efeito não gera tensão tardia. O P3-05 deixou-a fora da verificação por isso;
// implementá-la sem número medido seria pôr no jogo um efeito que ninguém pesou.

import { purchasedCutPercent } from './skills';
import {
  balance,
  REGION_IDS,
  skills,
  type GameState,
  type Region,
  type RegionId,
  type SkillId,
} from './state';

/** Mantém a Inércia dentro do 0 a 100 do docs/GDD.md §2.2. */
function clamp(value: number): number {
  return Math.max(0, Math.min(100, value));
}

/** O apoio médio global. Mesma conta do `averageSupport`, sem o import circular. */
function meanSupport(state: GameState): number {
  return REGION_IDS.reduce((total, id) => total + state.regions[id].support, 0) / REGION_IDS.length;
}

// ------------------------------------------------------------ o espelho ---

/**
 * Quanto a Inércia cresce neste tick.
 *
 * É o §2.6 escrito como conta, por ano:
 *
 *   crescimento = inertiaGrowthPerYear
 *               + inertiaGrowthPerCutPercent × (cortes comprados, em %/ano)
 *               − inertiaDampingPerSupport × (apoio médio − piso de apatia)
 *
 * O termo do meio é o que devolve tensão à segunda metade da partida — sem ele
 * a trajetória só melhora, e o docs/CURVA-DE-DIFICULDADE.md mediu que isso
 * decide a partida em 2055. O de baixo é o que dá função ao ramo Sociedade.
 *
 * **Pode ser negativo**, e precisa poder: um jogador com muito apoio e pouco
 * corte empurra a Inércia para baixo sozinho. O `clamp` do `growInertia` é quem
 * impede de passar de 0.
 */
export function inertiaGrowthPerTick(state: GameState): number {
  const pressure = balance.inertiaGrowthPerCutPercent * purchasedCutPercent(state);
  const slack = Math.max(0, meanSupport(state) - balance.supportFloor);
  const perYear =
    balance.inertiaGrowthPerYear + pressure - balance.inertiaDampingPerSupport * slack;

  return perYear / balance.ticksPerYear;
}

/** Um tick de crescimento, sem agir. */
export function growInertia(state: GameState): GameState {
  return { ...state, inertia: clamp(state.inertia + inertiaGrowthPerTick(state)) };
}

// ------------------------------------------------------------- as ações ---

/** As duas ações modeladas. A terceira do §2.6 está na especificação e fora daqui. */
export type InertiaAction = 'subsidies' | 'disinformation';

/**
 * Qual ação a Inércia usa neste turno.
 *
 * **Alterna, e a escolha é deliberada.** Um sorteio faria a partida depender da
 * seed por um motivo que o jogador não tem como ler, e um "escolhe a mais
 * eficaz" faria dela um otimizador — desenho legítimo, mas que ninguém mediu.
 * Alternar dá o caso médio e mantém a partida reprodutível, que é o que o P3-05
 * verificou.
 *
 * O primeiro turno (tick 6) é desinformação: `1 % 2 === 1`.
 */
export function actionForTick(tick: number): InertiaAction {
  return (tick / balance.inertiaActionEveryTicks) % 2 === 0 ? 'subsidies' : 'disinformation';
}

/** A Inércia age neste tick? */
export function actsOnTick(tick: number): boolean {
  return tick % balance.inertiaActionEveryTicks === 0;
}

/**
 * Aplica um turno da Inércia às oito regiões.
 *
 * A intensidade é proporcional ao nível acumulado (`inercia / 100`), como o
 * §2.6 pede — uma Inércia em 20 arranha, uma em 90 machuca.
 *
 * **A desinformação não tem piso**, e é justamente o trabalho dela: furar o piso
 * de apatia é o que torna a derrota por apoio do §2.7 alcançável. O tick.ts já
 * previa este dia por escrito — "Furar o piso é trabalho de evento e da
 * Inércia". O zero continua sendo o fundo: apoio negativo não é oposição, é bug.
 */
export function applyInertiaAction(state: GameState): GameState {
  const intensity = state.inertia / 100;
  const action = actionForTick(state.tick);
  const touched: Partial<Record<RegionId, Region>> = {};

  for (const id of REGION_IDS) {
    const region = state.regions[id];

    touched[id] =
      action === 'subsidies'
        ? { ...region, emissions: region.emissions * (1 + balance.inertiaSubsidyBite * intensity) }
        : {
            ...region,
            support: Math.max(0, region.support - balance.inertiaDisinformationBite * intensity),
          };
  }

  return { ...state, regions: touched as Record<RegionId, Region> };
}

/**
 * Um tick inteiro de Inércia: ela cresce e, na cadência do §2.6, age.
 *
 * É a única função que o `tick.ts` chama, no mesmo padrão do `advanceEvents`.
 */
export function advanceInertia(state: GameState): GameState {
  const grown = growInertia(state);
  return actsOnTick(grown.tick) ? applyInertiaAction(grown) : grown;
}

// -------------------------------------------------------- a contenção ---

/**
 * Os nós do ramo Sociedade, lidos da árvore em vez de escritos à mão.
 *
 * Uma lista fixa aqui apodreceria em silêncio: acrescentar um quinto nó de
 * Sociedade no `skills.json` deixaria o desconto da contenção parado no quarto,
 * e nada quebraria para avisar.
 */
const SOCIETY_SKILLS: readonly SkillId[] = skills
  .filter((skill) => skill.branch === 'society')
  .map((skill) => skill.id);

/**
 * O nó que destrava a contenção: a **raiz** do ramo Sociedade.
 *
 * O docs/INERCIA.md nomeia o `climate-education`, e é ele — mas escrito como "a
 * raiz do ramo", não como um id literal. Os dois são a mesma coisa hoje, e a
 * versão derivada é a que sobrevive a uma renomeação: um id literal que
 * deixasse de existir tornaria a contenção **permanentemente indisponível**, sem
 * erro nenhum, e o jogo ficaria sem contra-ataque.
 */
export const CONTAIN_REQUIRES: SkillId | undefined = skills.find(
  (skill) => skill.branch === 'society' && skill.requires.length === 0,
)?.id;

/**
 * Abaixo disto não há o que conter.
 *
 * **Não é balanceamento, é a resolução do mostrador** — por isso mora aqui e
 * não no `balance.json`. O HUD mostra a Inércia em número inteiro; com a guarda
 * em `> 0`, uma Inércia de 0,4 aparecia como **0** na tela e o botão dizia
 * "Disponível" ao lado. O jogador gastaria 30 PAC para derrubar algo que ele não
 * tem como enxergar. Achado no navegador, no P7-03.
 *
 * O par disto é o `Math.floor` do hud.ts: o número na tela nunca promete mais do
 * que existe, e a guarda recusa exatamente quando a tela mostra zero. É a mesma
 * regra que o PAC já seguia.
 */
const MIN_INERTIA_TO_CONTAIN = 1;

/** Por que uma contenção foi recusada. A UI usa isto para explicar o botão. */
export type ContainRefusal = 'notUnlocked' | 'notEnoughPoints' | 'nothingToContain';

export type ContainCheck =
  { readonly ok: true } | { readonly ok: false; readonly reason: ContainRefusal };

/** Quantos nós do ramo Sociedade o jogador já comprou. */
export function societyNodesOwned(state: GameState): number {
  return SOCIETY_SKILLS.filter((id) => state.unlockedSkills.includes(id)).length;
}

/**
 * Quanto custa uma contenção agora, ou `null` se o ramo ainda não a destravou.
 *
 * **A trava no ramo Sociedade é a decisão central da mecânica**, e ela nasceu de
 * uma medição que deu errado (docs/INERCIA.md). Numa primeira versão a contenção
 * era um gasto de PAC solto, disponível desde 2025 — e a varredura mostrou que
 * ela neutralizava a Inércia inteira mais barato do que o ramo Sociedade,
 * **agravando** a armadilha do docs/BALANCEAMENTO.md em vez de curá-la.
 *
 * Condicionar a contenção ao ramo inverte isso: Sociedade deixa de ser um bônus
 * de PAC que não se paga e passa a ser a **licença para lutar**, e cada nó
 * seguinte barateia a luta.
 *
 * O `Math.max(0, …)` é guarda de crescimento futuro: com os 4 nós de hoje o
 * desconto máximo é de 60% e o custo nunca chega perto de zero, mas um ramo de
 * 6 nós zeraria a conta e a contenção viraria de graça. Se um dia chegar lá, o
 * conserto é um piso no `balance.json`, não este `max`.
 */
export function containCost(state: GameState): number | null {
  const owned = societyNodesOwned(state);
  if (CONTAIN_REQUIRES === undefined || !state.unlockedSkills.includes(CONTAIN_REQUIRES)) {
    return null;
  }

  const discount = balance.containDiscountPerNode * (owned - 1);
  return Math.max(0, balance.containCost * (1 - discount));
}

/**
 * Dá para conter agora?
 *
 * Mesma forma do `canUnlock` do skills.ts, e pela mesma razão: a UI precisa
 * saber **por que** não dá, para escrever no botão em vez de deixá-lo morto sem
 * explicação. A ordem das recusas é a ordem em que elas interessam a quem lê.
 */
export function canContain(state: GameState): ContainCheck {
  const cost = containCost(state);

  if (cost === null) return { ok: false, reason: 'notUnlocked' };
  // Antes do PAC: gastar 12 pontos para derrubar uma Inércia que já está no chão
  // é o tipo de clique que o jogador só entende depois de o PAC ter sumido.
  if (state.inertia < MIN_INERTIA_TO_CONTAIN) return { ok: false, reason: 'nothingToContain' };
  if (state.actionPoints < cost) return { ok: false, reason: 'notEnoughPoints' };

  return { ok: true };
}

/**
 * O jogador gasta PAC para empurrar a Inércia para baixo.
 *
 * Devolve o estado **intacto** quando a contenção não é possível, em vez de
 * lançar — mesma escolha do `unlockSkill` e do `advanceTick` depois do fim: a UI
 * pergunta antes com `canContain`, e um clique numa borda de quadro não pode
 * derrubar a página.
 */
export function contain(state: GameState): GameState {
  const cost = containCost(state);
  if (cost === null || !canContain(state).ok) return state;

  return {
    ...state,
    actionPoints: state.actionPoints - cost,
    inertia: clamp(state.inertia - balance.containRelief),
  };
}
