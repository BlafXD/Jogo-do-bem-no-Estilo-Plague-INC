// A leitura da partida depois que ela acaba (P7-06).
//
// O `outcome.ts` responde **como** a partida terminou; este arquivo responde
// **o que aconteceu no caminho**. São perguntas diferentes e por isso módulos
// diferentes: o desfecho decide medalha e é consultado a cada tick durante o
// jogo (é ele que para o relógio); isto aqui é lido uma vez, no fim, e não
// participa de nenhuma regra.
//
// Como o outcome.ts, **nada aqui é gravado no estado**: tudo sai da linha do
// tempo que o history.ts já guarda. Um save adulterado não consegue entregar um
// ponto de virada que a curva dele não sustenta.

import actionsData from '../data/actions.json';
import { timeline } from './history';
import { MEDALS, MEDAL_CEILING, type Medal } from './outcome';
import { skillById } from './skills';
import { skills, SKILL_BRANCHES, type GameState, type SkillBranch, type Snapshot } from './state';

/**
 * O ano em que a curva de emissões virou — o pico —, ou `null` se ela ainda
 * subia quando a partida acabou.
 *
 * **É o número que dá nome ao jogo**, e é a única coisa que a linha do tempo
 * sabe dizer sobre *quando* o jogador agiu. O `unlockedSkills` guarda o quê,
 * nunca o quando; a curva do mundo guarda o quando sem precisar de campo novo
 * no contrato do docs/GDD.md §3.
 *
 * Devolve o retrato inteiro, e não só o ano, porque quem desenha precisa da
 * temperatura daquele instante para pôr a marca em cima da curva.
 *
 * **O primeiro máximo, não o último.** A pergunta é em que ano a emissão parou
 * de subir, e num platô é a primeira vez que ela chega ao topo que responde
 * isso. Empate exato entre dois anos é impraticável com estes números de ponto
 * flutuante; a regra existe para a resposta ser definida, não porque o caso
 * aconteça.
 *
 * **`null` quando o pico é o último ponto**: uma curva que ainda subia no fim
 * não virou em lugar nenhum, e marcar o último ano seria dizer que virou
 * exatamente quando o mundo acabou.
 */
export function turningPoint(state: GameState): Snapshot | null {
  const curve = timeline(state);

  let peak = 0;
  for (let index = 1; index < curve.length; index++) {
    const here = curve[index];
    const best = curve[peak];
    if (here !== undefined && best !== undefined && here.emissions > best.emissions) {
      peak = index;
    }
  }

  if (peak === curve.length - 1) return null;
  return curve[peak] ?? null;
}

// ------------------------------------------------- o que ficou para trás ---

/**
 * O ano em que cada medalha ficou para trás, ou `null` para a que sobrou.
 *
 * É a catraca do docs/GDD.md §2.7 traduzida em datas. A temperatura sai do CO₂
 * acumulado, que só cresce — então cruzar um teto é definitivo, e o ano em que
 * isso aconteceu é a resposta honesta para "o que eu poderia ter feito
 * diferente": nada **depois** daquele ano teria trazido aquela medalha de volta.
 *
 * O `>=` é o espelho do `<` do `medalFor`: o §2.7 dá ouro a quem fica **abaixo**
 * de 1,5 °C, então chegar a 1,5 exatamente já é tê-lo perdido.
 *
 * A resolução é anual porque a linha do tempo é anual (history.ts). O gráfico
 * desenha a mesma curva, então o ano que aparece aqui é o ano em que a curva
 * cruza a tracejada lá — os dois não têm como discordar.
 */
export function crossings(state: GameState): Readonly<Record<Medal, number | null>> {
  const curve = timeline(state);
  const found: Partial<Record<Medal, number | null>> = {};

  for (const medal of MEDALS) {
    const ceiling = MEDAL_CEILING[medal];
    found[medal] = curve.find((point) => point.temperature >= ceiling)?.year ?? null;
  }

  return found as Record<Medal, number | null>;
}

/** Quantos nós de cada ramo o jogador comprou. Ramo sem compra nenhuma vale 0. */
export function purchasesByBranch(state: GameState): Readonly<Record<SkillBranch, number>> {
  const count: Partial<Record<SkillBranch, number>> = {};
  for (const branch of SKILL_BRANCHES) count[branch] = 0;

  for (const id of state.unlockedSkills) {
    const skill = skillById(id);
    // Um id que não existe mais na árvore é recusado na carga do save
    // (save.ts), então isto não acontece por save velho. Ignorar em vez de
    // lançar é o certo mesmo assim: esta função é leitura de tela de fim, e
    // derrubar a tela de fim por causa de um id órfão seria trocar um resumo
    // incompleto por nenhum resumo.
    if (skill === undefined) continue;
    count[skill.branch] = (count[skill.branch] ?? 0) + 1;
  }

  return count as Record<SkillBranch, number>;
}

/** Os nós que continuaram na árvore quando a partida acabou. */
export function unboughtCount(state: GameState): number {
  return skills.length - state.unlockedSkills.length;
}

// ----------------------------------------- as 3 ações do mundo real (§2.7) ---

/** Uma ação que existe fora do jogo, com um fato verificado em docs/CIENCIA.md. */
export type RealWorldAction = {
  readonly branch: SkillBranch;
  readonly name: string;
  readonly description: string;
  readonly fact: string;
};

/** Quantas o §2.7 pede na tela final. Três — "curto, sem sermão". */
const ACTIONS_SHOWN = 3;

type RawAction = {
  readonly branch: string;
  readonly name: string;
  readonly description: string;
  readonly fact: string;
};

/**
 * Valida o actions.json na carga, e **lança** quando ele não fecha.
 *
 * Mesma escolha do `parseSkills`, e pela mesma razão: isto é um arquivo do
 * repositório, não entrada do jogador. Um erro aqui é bug de quem editou — e
 * como o pacote `[D-Historia]` pode editar este arquivo sem tocar em `.ts`, o
 * erro precisa aparecer alto em vez de virar uma tela de fim com um item em
 * branco que ninguém percebe.
 */
export function parseActions(raw: readonly RawAction[]): readonly RealWorldAction[] {
  const byBranch = new Map<string, RealWorldAction>();

  for (const action of raw) {
    if (!(SKILL_BRANCHES as readonly string[]).includes(action.branch)) {
      throw new Error(`actions.json: ramo desconhecido "${action.branch}".`);
    }
    if (byBranch.has(action.branch)) {
      throw new Error(`actions.json: o ramo "${action.branch}" aparece mais de uma vez.`);
    }
    for (const field of ['name', 'description', 'fact'] as const) {
      if (!action[field].trim()) {
        throw new Error(`actions.json: "${action.branch}" está sem ${field}.`);
      }
    }

    byBranch.set(action.branch, { ...action, branch: action.branch as SkillBranch });
  }

  // Um ramo sem ação deixaria a tela final mostrar duas sugestões em vez de
  // três, e só na partida de quem tivesse negligenciado justo aquele ramo.
  for (const branch of SKILL_BRANCHES) {
    if (!byBranch.has(branch)) {
      throw new Error(`actions.json: falta a ação do ramo "${branch}".`);
    }
  }

  return SKILL_BRANCHES.map((branch) => byBranch.get(branch) as RealWorldAction);
}

/** As 5 ações do mundo real, uma por ramo, validadas na carga. */
export const realWorldActions: readonly RealWorldAction[] = parseActions(actionsData);

/**
 * As três ações que esta partida merece ouvir.
 *
 * **Escolhidas pelo que o jogador deixou de fazer**, do ramo mais abandonado
 * para o menos. É o que separa a tela de fim de um cartaz: quem nunca comprou
 * nada em Transporte lê sobre transporte, e quem cobriu o ramo inteiro não
 * recebe conselho sobre ele. O §2.7 pede "sem sermão", e um sermão é
 * exatamente o texto que seria o mesmo para todo mundo.
 *
 * O empate é desfeito pela ordem do `SKILL_BRANCHES`, que é a do §2.4. Sem uma
 * regra explícita, a partida em que ninguém comprou nada — a mais comum de
 * todas — dependeria de como o `sort` do motor trata empates.
 */
export function suggestedActions(state: GameState): readonly RealWorldAction[] {
  const bought = purchasesByBranch(state);

  return [...realWorldActions]
    .sort((a, b) => bought[a.branch] - bought[b.branch])
    .slice(0, ACTIONS_SHOWN);
}
