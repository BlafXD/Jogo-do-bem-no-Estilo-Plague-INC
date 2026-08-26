import { describe, expect, it } from 'vitest';
import { turningPoint } from '../src/engine/review';
import {
  balance,
  createInitialState,
  skills,
  type GameState,
  type Snapshot,
} from '../src/engine/state';
import { advanceTick, TOTAL_TICKS } from '../src/engine/tick';

/**
 * Uma partida com a linha do tempo escrita à mão.
 *
 * O estado fica no tick 0, e isso não é descuido: o `timeline` só acrescenta o
 * instante atual quando ele é posterior ao último retrato, então deixando o
 * estado no começo a curva lida é **exatamente** a lista passada aqui. É o que
 * permite testar a regra do pico sem depender do balanceamento.
 */
function comEmissoes(...emissions: readonly number[]): GameState {
  const history: Snapshot[] = emissions.map((value, index) => ({
    tick: index * balance.ticksPerYear,
    year: balance.startYear + index,
    temperature: balance.startTemperature + index * 0.01,
    emissions: value,
    cumulativeCO2: index * 40,
    averageSupport: 50,
  }));

  return { ...createInitialState(1), history };
}

/** Roda a partida inteira a partir de um estado dado. */
function ateOFim(state: GameState): GameState {
  let next = state;
  for (let i = 0; i < TOTAL_TICKS; i++) next = advanceTick(next);
  return next;
}

describe('turningPoint', () => {
  it('acha o ano em que a emissão parou de subir', () => {
    const partida = comEmissoes(40, 43, 45, 42, 38);

    expect(turningPoint(partida)?.year).toBe(balance.startYear + 2);
  });

  it('devolve o retrato inteiro, não só o ano', () => {
    // Quem desenha precisa da temperatura daquele instante para pôr a marca em
    // cima da curva, e não ao lado dela.
    const virada = turningPoint(comEmissoes(40, 45, 38));

    expect(virada?.emissions).toBe(45);
    expect(virada?.tick).toBe(balance.ticksPerYear);
    expect(virada?.temperature).toBeCloseTo(balance.startTemperature + 0.01, 10);
  });

  it('não vira quando a curva ainda subia no fim', () => {
    // Marcar o último ano seria dizer que a curva virou exatamente quando o
    // mundo acabou.
    expect(turningPoint(comEmissoes(40, 43, 45, 48))).toBeNull();
  });

  it('num platô, aponta a primeira vez que a curva chegou ao topo', () => {
    // A pergunta é em que ano a emissão **parou de subir**.
    expect(turningPoint(comEmissoes(40, 45, 45, 45))?.year).toBe(balance.startYear + 1);
  });

  it('uma partida de um retrato só não virou em lugar nenhum', () => {
    expect(turningPoint(createInitialState(1))).toBeNull();
  });

  it('vira já no começo se a curva só desceu', () => {
    expect(turningPoint(comEmissoes(45, 40, 35))?.year).toBe(balance.startYear);
  });

  it('ACEITE: quem não compra nada nunca vira a curva', () => {
    // A linha de base do docs/CIENCIA.md cresce 0,93% ao ano e nada no jogo a
    // segura sozinha: sem compra, a emissão sobe até 2100. Se este teste um dia
    // falhar, alguma coisa passou a cortar emissão de graça.
    expect(turningPoint(ateOFim(createInitialState(2025)))).toBeNull();
  });

  it('ACEITE: com a árvore inteira, a curva vira antes do fim', () => {
    // 5,5% ao ano de corte contra 0,93% de crescimento (docs/BALANCEAMENTO.md):
    // a emissão tem que passar do topo em algum ponto do século.
    const tudo: GameState = {
      ...createInitialState(2025),
      unlockedSkills: skills.map((skill) => skill.id),
    };
    const virada = turningPoint(ateOFim(tudo));

    expect(virada).not.toBeNull();
    expect(virada?.year).toBeLessThan(balance.endYear);
    expect(virada?.year).toBeGreaterThanOrEqual(balance.startYear);
  });
});
