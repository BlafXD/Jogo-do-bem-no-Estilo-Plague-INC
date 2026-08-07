import { describe, expect, it } from 'vitest';

// Teste de fumaça do SETUP-03. Existe por um motivo só: `npm run test` precisa
// ter o que rodar para o aceite ("os 4 scripts rodam limpos") significar alguma
// coisa — um `vitest --passWithNoTests` passaria sem provar nada.
//
// DONO: some no SETUP-06, quando entrar o primeiro teste de verdade
// (determinismo do RNG semeado). Se este arquivo ainda estiver aqui depois
// disso, foi esquecimento.
describe('toolchain de testes', () => {
  it('executa TypeScript e avalia asserções', () => {
    const total: number = [1, 2, 3].reduce((sum, n) => sum + n, 0);
    expect(total).toBe(6);
  });

  it('respeita noUncheckedIndexedAccess — índice fora da faixa é undefined', () => {
    const regions = ['na', 'la', 'eu'];
    expect(regions[99]).toBeUndefined();
  });
});
