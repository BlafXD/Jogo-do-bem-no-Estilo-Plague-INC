// As bolhas de PAC sobre o mapa (INTER-03). Pedido do chat em 2026-10-28: "uns
// pop-up em cada país que dá um bônus do PAC", como as bolhas de DNA do
// *Plague Inc*.
//
// **A bolha não é PAC novo — é a renda que já existia, só que agora ela precisa
// ser recolhida.** O `REF-09` mediu que o `basePointsPerYear` tem teto em 46: a
// 48, quem pula o ramo Sociedade passa a sobreviver, e o dilema do
// `docs/GDD.md §2.6` vira preferência. Um bônus por cima da renda quebraria o
// jogo de propósito. Então o `bubbleShare` do balance.json **fatia** a renda: a
// parte automática cai sozinha a cada mês, como sempre, e a outra parte aparece
// em cima de uma região e **expira se ninguém a recolher**. Quem joga olhando o
// mapa arrecada exatamente o que arrecadava antes; quem só olha a árvore
// arrecada menos. É a mesma troca do jogo que inspirou esta mecânica, onde o DNA
// também se paga com atenção.
//
// **A bolha vale uma fatia de toda a renda, e não um número fixo.** Ela sai do
// `pointsPerYear` do estado, que já inclui os nós de PAC/ano e o bônus da
// Juliana — se fosse constante, o ramo Sociedade e o financiamento dela
// passariam a render menos do que a tabela do §4 promete, e o `REF-09` teria de
// ser medido de novo por causa de uma decisão de interface.
//
// **O sorteio da região tem um gerador próprio, e isso é escolha de engenharia.** Cada mês
// tem um estado derivado de `(seed, tick)`, em vez de consumir o `rngState` do
// `GameState`. As duas formas são semeadas e reprodutíveis (regra 7), e a
// diferença está no preço: consumir o `rngState` deslocaria **toda** a sequência
// de sorteio de eventos de 2025 a 2100, invalidando de uma vez as cinco partidas
// de referência, as varreduras do `docs/BALANCEAMENTO.md` e as temperaturas
// pinadas nos testes — um dia de medição para pagar por uma mecânica que não
// mexe no clima. Com um estado por mês, a bolha é determinística, sobrevive ao
// save/load (ela nasce de `seed` e `tick`, que o save guarda) e **não desloca
// uma vírgula** do que já estava medido.
//
// O que **precisa** ficar guardado é a bolha em si: quanto ela vale e quanto
// tempo falta para ela sumir. Sem isso, recarregar a partida criaria de novo uma
// bolha já recolhida — ou pior, ressuscitaria o PAC de quem já gastou.

import { nextRandom, createRngState, type RngState } from './rng';
import { pointsPerYear } from './skills';
import { balance, REGION_IDS, type Bubble, type GameState, type RegionId } from './state';

/**
 * O estado do gerador deste mês.
 *
 * Mistura a seed com o mês para que dois meses seguidos não devolvam valores
 * vizinhos — o mulberry32 embaralha bem passos consecutivos, mas aqui cada mês
 * **começa** uma sequência, e seeds vizinhas merecem estados distantes. As duas
 * constantes são as de mistura do MurmurHash3, usadas como multiplicadores
 * ímpares grandes; não há nada de criptográfico em jogo.
 */
function streamFor(seed: number, tick: number): RngState {
  return createRngState(Math.imul(seed, 0x9e3779b1) ^ Math.imul(tick + 1, 0x85ebca6b));
}

/**
 * Quanto vale uma bolha nesta partida, agora.
 *
 * A conta é a fatia da renda anual dividida pelas bolhas de um ano: se as
 * `bubblesPerYear` bolhas de um ano forem todas recolhidas, a renda total do
 * jogador é a mesma de antes do INTER-03. Nenhuma bolha recolhida custa-lhe o
 * `bubbleShare` da renda.
 */
export function bubbleValue(state: GameState): number {
  return (pointsPerYear(state) * balance.bubbleShare) / balance.bubblesPerYear;
}

/** O PAC que cai sozinho num mês: a renda menos a fatia que vai para as bolhas. */
export function automaticPointsPerTick(state: GameState): number {
  return (pointsPerYear(state) * (1 - balance.bubbleShare)) / balance.ticksPerYear;
}

/**
 * A identidade de uma bolha na tela.
 *
 * Deduzida do mês em que ela nasceu, como o `startTickOf` dos eventos faz com os
 * cartões, e pelo mesmo motivo: a idade já está codificada no `ticksRemaining`,
 * e gravar um campo a mais seria guardar um número que dá para deduzir. Nasce no
 * máximo uma bolha por mês, então a chave é única por construção.
 */
export function bubbleKeyOf(bubble: Bubble, currentTick: number): string {
  return `bolha@${currentTick - (balance.bubbleTicks - bubble.ticksRemaining)}`;
}

/** Envelhece as bolhas em cena e descarta as que ninguém recolheu. */
function ageBubbles(state: GameState): readonly Bubble[] {
  return state.bubbles
    .map((bubble) => ({ ...bubble, ticksRemaining: bubble.ticksRemaining - 1 }))
    .filter((bubble) => bubble.ticksRemaining > 0);
}

/**
 * De quantos em quantos meses nasce uma bolha.
 *
 * **A cadência é fixa, e só o lugar é sorteado. Isso é conserto de um defeito
 * medido, não preferência.** A primeira versão sorteava se nascia bolha a cada
 * mês, com chance `bubblesPerYear / ticksPerYear`. Funcionava, e trazia um
 * passageiro indesejado: **variância na renda**. Com a seed 2025, três anos de
 * jogo sortearam 8 bolhas em vez das 6 esperadas — 13,8 PAC a mais, 10% da
 * arrecadação do período. O `REF-09` mediu que 2 PAC/ano a mais no
 * `basePointsPerYear` já derrubam o dilema do `§2.6`, e uma renda que varia com
 * a sorte é exatamente o que não se pode ter num jogo cujo balanceamento é
 * medido em varreduras de partidas de referência.
 *
 * Com cadência fixa, quem recolhe tudo arrecada **exatamente** a renda de antes
 * do INTER-03, e o que o sorteio decide é só **onde olhar** — que é a parte da
 * mecânica que interessa.
 */
const BUBBLE_EVERY = balance.ticksPerYear / balance.bubblesPerYear;

/**
 * A bolha deste mês, ou `null` nos meses em que nenhuma nasce.
 *
 * **O deslocamento de meio período (`BUBBLE_EVERY / 2`) é de propósito.** Sem
 * ele, a cadência de 6 meses cairia no mesmo mês do turno da Inércia
 * (`inertiaActionEveryTicks`, também 6), e o jogador veria a silhueta avisando
 * que o lobby agiu no instante em que uma bolha de PAC aparece — duas notícias
 * opostas no mesmo mês, com uma boa chance de ele concluir que uma causou a
 * outra.
 *
 * **A região é uniforme entre as oito.** Pesar o sorteio pela emissão faria as
 * bolhas se concentrarem onde o mundo emite mais, o que é uma afirmação sobre
 * onde a ação climática aparece — e o `docs/CIENCIA.md` já fixou a régua: alvo
 * regional é afirmação sobre o mundo, e afirmação sobre o mundo tem fonte ou não
 * entra. Uniforme não afirma nada, e espalha o olhar do jogador pelo mapa
 * inteiro, que é o que a mecânica existe para fazer.
 */
function drawBubble(state: GameState): Bubble | null {
  if (state.tick % BUBBLE_EVERY !== Math.floor(BUBBLE_EVERY / 2)) return null;

  const where = nextRandom(streamFor(state.seed, state.tick));
  const index = Math.min(REGION_IDS.length - 1, Math.floor(where.value * REGION_IDS.length));
  const target: RegionId | undefined = REGION_IDS[index];
  if (target === undefined) return null;

  return { target, value: bubbleValue(state), ticksRemaining: balance.bubbleTicks };
}

/**
 * Um mês de bolhas: envelhece o que está na mesa e sorteia uma nova.
 *
 * Chamada pelo `tick.ts` **depois** dos eventos e da Inércia, de propósito: o
 * valor da bolha sai do `pointsPerYear`, e ele depende dos nós comprados, não do
 * que o mês fez. A ordem só importaria se a Inércia pudesse mexer na renda — ela
 * não pode (ela encarece os nós, o que é outra conta).
 */
export function advanceBubbles(state: GameState): GameState {
  const aged = ageBubbles(state);
  const fresh = drawBubble(state);

  return { ...state, bubbles: fresh === null ? aged : [...aged, fresh] };
}

/**
 * Recolhe a bolha de chave `key`: o PAC entra no caixa e ela sai da mesa.
 *
 * **Devolve o mesmo objeto de estado quando a chave não existe**, como o
 * `unlockSkill` e o `contain` fazem na recusa. É o que permite à tela comparar
 * por identidade e não redesenhar nada — e o que torna inofensivo o duplo
 * clique numa bolha que já foi recolhida, que no Modo Feira a 4x é o acidente
 * mais provável desta mecânica.
 */
/**
 * Recolhe **todas** as bolhas na mesa de uma vez.
 *
 * Existe por duas razões, e nenhuma delas é conveniência de teste.
 *
 * **A primeira é o §5 do GDD**: a bolha é um alvo que aparece e some, e um alvo
 * com prazo é a pior coisa que existe para quem navega por teclado — o Tab
 * chegaria nela depois de ela ter sumido. O atalho do INTER-04 recolhe o que
 * estiver na mesa com uma tecla, e é esta função que ele chama. Sem isso, a
 * fatia de renda do `bubbleShare` seria inalcançável sem mouse, o que é cobrar
 * do jogador uma habilidade motora para arrecadar PAC.
 *
 * **A segunda é o balanceamento**: as partidas de referência do
 * `docs/BALANCEAMENTO.md` modelam quem **joga bem**, e quem joga bem recolhe o
 * que o mapa oferece. Sem esta função, o harness mediria um jogador que ignora
 * 30% da própria renda, e todas as varreduras do `REF-09` passariam a descrever
 * uma partida que ninguém joga.
 */
export function claimAllBubbles(state: GameState): GameState {
  if (state.bubbles.length === 0) return state;

  const total = state.bubbles.reduce((sum, bubble) => sum + bubble.value, 0);
  return { ...state, actionPoints: state.actionPoints + total, bubbles: [] };
}

export function claimBubble(state: GameState, key: string): GameState {
  const found = state.bubbles.find((bubble) => bubbleKeyOf(bubble, state.tick) === key);
  if (found === undefined) return state;

  return {
    ...state,
    actionPoints: state.actionPoints + found.value,
    bubbles: state.bubbles.filter((bubble) => bubble !== found),
  };
}
