import { describe, expect, it } from 'vitest';
import { createRngState, mulberry32, nextRandom, type RngState } from '../src/engine/rng';

function sortear(gerar: () => number, quantidade: number): number[] {
  return Array.from({ length: quantidade }, () => gerar());
}

/**
 * Valores de referência gerados pela primeira implementação.
 *
 * Travar isto é o que faz o determinismo valer **entre builds**, e não só
 * dentro de uma execução. Sem esta constante, alguém refatora `nextRandom`, os
 * outros testes continuam verdes (a sequência segue igual a ela mesma) e todas
 * as partidas salvas mudam sem ninguém perceber.
 *
 * Se este teste falhar depois de uma mudança no rng.ts, a pergunta certa não é
 * "qual valor novo eu coloco aqui" — é "eu queria mesmo mudar o gerador?".
 */
const SEQUENCIA_SEED_42 = [
  0.6011037519201636, 0.44829055899754167, 0.8524657934904099, 0.6697340414393693,
  0.17481389874592423, 0.5265925421845168,
];

describe('mulberry32', () => {
  it('gera a mesma sequência para a mesma seed', () => {
    // Este é o aceite do SETUP-06.
    expect(sortear(mulberry32(2025), 100)).toEqual(sortear(mulberry32(2025), 100));
  });

  it('bate com os valores de referência da seed 42', () => {
    expect(sortear(mulberry32(42), 6)).toEqual(SEQUENCIA_SEED_42);
  });

  it('gera sequências diferentes para seeds diferentes', () => {
    expect(sortear(mulberry32(1), 20)).not.toEqual(sortear(mulberry32(2), 20));
  });

  it('devolve valores dentro de [0, 1)', () => {
    const gerar = mulberry32(123);
    let minimo = 1;
    let maximo = 0;

    for (let i = 0; i < 100_000; i++) {
      const valor = gerar();
      if (valor < minimo) minimo = valor;
      if (valor > maximo) maximo = valor;
    }

    expect(minimo).toBeGreaterThanOrEqual(0);
    expect(maximo).toBeLessThan(1);
  });

  it('distribui de forma aproximadamente uniforme', () => {
    // Não é teste estatístico sério — é rede de segurança contra erro de
    // aritmética. Um gerador enviesado denuncia na média na hora.
    const gerar = mulberry32(7);
    const total = 200_000;
    let soma = 0;

    for (let i = 0; i < total; i++) soma += gerar();

    expect(soma / total).toBeCloseTo(0.5, 2);
  });
});

describe('nextRandom', () => {
  it('é pura — o mesmo estado devolve sempre o mesmo par', () => {
    const estado = createRngState(99);
    expect(nextRandom(estado)).toEqual(nextRandom(estado));
  });

  it('não altera o estado recebido', () => {
    const estado = createRngState(99);
    nextRandom(estado);
    expect(estado).toBe(createRngState(99));
  });

  it('chega ao mesmo estado depois do mesmo número de passos', () => {
    let estado: RngState = createRngState(2025);
    for (let i = 0; i < 3; i++) estado = nextRandom(estado).state;

    expect(estado).toBe(1199732168);
  });

  it('retomar de um estado salvo continua a mesma sequência', () => {
    // Este é o teste que justifica o passo puro existir. Simula o save/load do
    // P6-07: parar no meio, guardar só o número do estado e voltar depois tem
    // que dar exatamente a mesma partida de quem nunca parou.
    const doInicioAoFim: number[] = [];
    let corrido: RngState = createRngState(777);
    for (let i = 0; i < 10; i++) {
      const passo = nextRandom(corrido);
      corrido = passo.state;
      doInicioAoFim.push(passo.value);
    }

    const antesDeSalvar: number[] = [];
    let aoSalvar: RngState = createRngState(777);
    for (let i = 0; i < 4; i++) {
      const passo = nextRandom(aoSalvar);
      aoSalvar = passo.state;
      antesDeSalvar.push(passo.value);
    }

    // "Recarrega" a partida a partir do número guardado.
    const depoisDeCarregar: number[] = [];
    let aoCarregar: RngState = aoSalvar;
    for (let i = 0; i < 6; i++) {
      const passo = nextRandom(aoCarregar);
      aoCarregar = passo.state;
      depoisDeCarregar.push(passo.value);
    }

    expect([...antesDeSalvar, ...depoisDeCarregar]).toEqual(doInicioAoFim);
  });
});

describe('createRngState', () => {
  it('normaliza seed negativa, fracionária ou acima de 32 bits', () => {
    expect(createRngState(-1)).toBe(4_294_967_295);
    expect(createRngState(7.9)).toBe(7);
    expect(createRngState(2 ** 32 + 5)).toBe(5);
  });
});
