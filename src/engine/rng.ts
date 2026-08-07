// RNG semeado (mulberry32). Mesma seed, mesma partida — é o que torna bug
// reproduzível e playtest confiável. Nenhum sorteio do jogo usa Math.random()
// (regra 7); o lint barra o uso.

/**
 * Estado do gerador: um inteiro de 32 bits sem sinal.
 *
 * É um número simples de propósito. O estado precisa caber no `GameState` e
 * sobreviver a uma ida e volta pelo `localStorage` (P6-07) — se o gerador
 * guardasse estado num closure, salvar no meio da partida e recarregar
 * reiniciaria a sequência do zero, e a partida deixaria de ser reprodutível.
 */
export type RngState = number;

/** Resultado de um sorteio: o valor e o estado a usar no sorteio seguinte. */
export type RngStep = {
  /** Valor em [0, 1) — inclui o 0, nunca chega a 1. */
  readonly value: number;
  readonly state: RngState;
};

/**
 * Normaliza uma seed qualquer para o estado inicial do gerador.
 *
 * O `>>> 0` trunca para inteiro de 32 bits sem sinal, então seed negativa ou
 * fracionária vira um estado válido em vez de contaminar a aritmética.
 */
export function createRngState(seed: number): RngState {
  return seed >>> 0;
}

/**
 * Um passo do mulberry32. Função pura: mesmo estado de entrada, mesmo par de
 * saída, sempre.
 *
 * O estado é mantido em 32 bits (`>>> 0`) em vez de deixar o acumulador crescer
 * como ponto flutuante, que é como a versão mais divulgada do algoritmo faz.
 * Deixar crescer funciona no começo e apodrece depois: passando de 2^53 o
 * `number` perde precisão inteira e a sequência deixa de ser reprodutível.
 */
export function nextRandom(state: RngState): RngStep {
  const nextState = (state + 0x6d2b79f5) >>> 0;

  let t = nextState;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);

  // 4294967296 é 2^32: divide o inteiro de 32 bits para cair em [0, 1).
  return { value: ((t ^ (t >>> 14)) >>> 0) / 4294967296, state: nextState };
}

/**
 * Gerador com estado interno, para quem só quer sortear em sequência.
 *
 * É a forma escrita em `docs/GDD.md §3`. Conveniente dentro de uma função, mas
 * **não use em nada que precise ser salvo** — aí o certo é carregar o
 * `RngState` no `GameState` e chamar `nextRandom` direto.
 */
export function mulberry32(seed: number): () => number {
  let state = createRngState(seed);

  return () => {
    const step = nextRandom(state);
    state = step.state;
    return step.value;
  };
}
