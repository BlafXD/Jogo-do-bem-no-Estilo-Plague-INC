// Vitória e derrota (P6-08). A regra está no docs/GDD.md §2.7.
//
// Função pura de leitura: entra GameState, sai o desfecho. **Nada aqui é
// gravado no estado** — e essa é a decisão que segura o arquivo inteiro. O
// desfecho é sempre recalculado do que já está no estado (temperatura, apoio,
// emissões, tick), então:
//
//   - o save do P6-07 não ganhou campo nenhum e o `SAVE_VERSION` não subiu;
//   - um save adulterado não consegue entregar uma medalha que a partida dele
//     não sustenta, pelo mesmo motivo que `year` e `temperature` são
//     recalculados na carga;
//   - não existe o bug clássico de "ganhei mas o jogo não percebeu", em que uma
//     bandeira booleana deixa de ser ligada num caminho de código.
//
// **Quem para o relógio não é este módulo.** Ele só responde a pergunta; quem
// decide não avançar mais é o main.ts, que passa `isFinished` como predicado de
// parada ao `advanceRealTime`. É a mesma separação do resto do engine — aqui
// não se sabe que existe uma tela (§3).

import { globalEmissions } from './climate';
import { averageSupport, balance, type GameState } from './state';
import { isOver } from './tick';

export const MEDALS = ['gold', 'silver', 'bronze'] as const;

export type Medal = (typeof MEDALS)[number];

/** Por que a agência foi dissolvida (docs/GDD.md §2.7). */
export type DefeatCause = 'temperature' | 'support';

/**
 * Como a partida chegou ao fim sem derrota.
 *
 * `netZero` é a vitória que o §2.7 descreve: as emissões líquidas chegaram a
 * ≈ 0 antes de 2100. `horizon` é o outro jeito de a partida acabar — 2100 chegou
 * com o mundo ainda emitindo, e abaixo do limiar de derrota.
 */
export type Ending = 'netZero' | 'horizon';

export type Outcome =
  | { readonly kind: 'playing' }
  | { readonly kind: 'defeat'; readonly cause: DefeatCause }
  | {
      readonly kind: 'finished';
      readonly ending: Ending;
      /** `null` quando a partida terminou acima do teto do bronze. */
      readonly medal: Medal | null;
    };

/**
 * O teto de temperatura de cada medalha.
 *
 * Exportado porque o cartão de fim precisa **do mesmo número** para escrever
 * "abaixo de 1,5 °C": o texto que explica a medalha e a regra que a concede não
 * podem sair de dois lugares diferentes.
 */
export const MEDAL_CEILING: Readonly<Record<Medal, number>> = {
  gold: balance.goldTemperature,
  silver: balance.silverTemperature,
  bronze: balance.bronzeTemperature,
};

/**
 * A medalha de quem parou nesta temperatura, ou `null` acima do bronze.
 *
 * Percorre `MEDALS` na ordem em que a lista está escrita — do mais exigente
 * para o menos — porque **a ordem é a regra**: quem passa no teto do ouro nunca
 * deve ser chamado de prata. O tests/outcome.test.ts cobra que os três valores
 * do balance.json estejam em ordem crescente; trocá-los no arquivo entregaria
 * ouro a quem mereceu bronze, e nada no código perceberia sozinho.
 *
 * O `<` é estrito porque o §2.7 escreve `< 1,5 °C`: parar exatamente em 1,5 não
 * é ficar abaixo de 1,5.
 *
 * **Neste modelo a medalha é uma catraca de mão única.** A temperatura sai de
 * `startTemperature + tcre × cumulativeCO2` e o CO₂ acumulado só cresce, então
 * nenhuma habilidade comprada depois faz a temperatura descer. Quem cruza os
 * 2,0 °C perdeu a prata para sempre. Não é limitação da implementação, é o TCRE
 * do docs/CIENCIA.md fazendo o que faz na realidade — e é o que transforma
 * **quando** o jogador agiu na decisão que decide a partida.
 */
export function medalFor(temperature: number): Medal | null {
  for (const medal of MEDALS) {
    if (temperature < MEDAL_CEILING[medal]) return medal;
  }
  return null;
}

/**
 * O desfecho da partida como ela está agora.
 *
 * A ordem das perguntas é a ordem em que elas mandam:
 *
 *  1. **A derrota vem primeiro, sempre.** Uma agência dissolvida não recebe
 *     medalha por ter zerado as emissões no mesmo mês em que o apoio acabou.
 *  2. **Zerar as emissões vale mais do que chegar a 2100.** Quem zera no
 *     último mês da partida ganha o `netZero`, que é o desfecho que o §2.7
 *     chama de vitória — chegar junto com o fim do horizonte não deve rebaixar
 *     o feito.
 *
 * O `>` da derrota por temperatura é estrito porque o §2.7 escreve
 * "temperatura > 3,0 °C". Parar exatamente em 3,0 não perde a partida.
 */
export function outcomeOf(state: GameState): Outcome {
  if (state.temperature > balance.loseTemperature) {
    return { kind: 'defeat', cause: 'temperature' };
  }

  // `<= 0` e não `=== 0`: o apoio é um número de ponto flutuante que passa por
  // desgaste mensal e por efeito de habilidade, e exigir o zero exato de um
  // float é como um valor que deveria disparar a derrota passa reto.
  //
  // Hoje esta linha é inalcançável: o `supportFloor` do balance.json trava o
  // desgaste em 25, e o docs/GDD.md §4 registra que furar o piso para baixo é
  // trabalho de evento (P7-01) e da Inércia (P7-03). A regra entra agora porque
  // ela é do §2.7, não do P7 — e porque descobrir que ela nunca foi escrita no
  // dia em que o primeiro evento derrubar uma região seria pior.
  if (averageSupport(state) <= 0) {
    return { kind: 'defeat', cause: 'support' };
  }

  if (globalEmissions(state) <= balance.netZeroEmissions) {
    return { kind: 'finished', ending: 'netZero', medal: medalFor(state.temperature) };
  }

  if (isOver(state)) {
    return { kind: 'finished', ending: 'horizon', medal: medalFor(state.temperature) };
  }

  return { kind: 'playing' };
}

/**
 * A partida acabou?
 *
 * Existe para ser passada como predicado de parada ao `advanceRealTime`, e é
 * por isso que ela recebe o estado em vez do desfecho: o laço de lá pergunta a
 * cada passo, e passar um `Outcome` já calculado responderia sempre sobre o
 * primeiro passo do lote.
 */
export function isFinished(state: GameState): boolean {
  return outcomeOf(state).kind !== 'playing';
}
