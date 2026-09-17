import { describe, expect, it } from 'vitest';
import { isFinished, outcomeOf } from '../src/engine/outcome';
import { passiveRun } from '../src/engine/passive-run';
import { unlockSkill } from '../src/engine/skills';
import { createInitialState } from '../src/engine/state';
import { advanceTick, TOTAL_TICKS } from '../src/engine/tick';

/**
 * A partida sem nenhuma compra (VIS-10), a comparação da tela de fim.
 */

describe('passiveRun', () => {
  it('joga até o fim, sem comprar nada', () => {
    const state = passiveRun(2025);

    expect(isFinished(state)).toBe(true);
    expect(state.unlockedSkills).toEqual([]);
    expect(state.tick).toBeLessThanOrEqual(TOTAL_TICKS);
  });

  /** A seed é a identidade da partida (§3): mesma seed, mesmo resultado. */
  it('é determinística', () => {
    expect(passiveRun(7)).toEqual(passiveRun(7));
  });

  it('é a mesma partida que se joga sem tocar em nada', () => {
    let state = createInitialState(11);
    while (!isFinished(state)) state = advanceTick(state);

    expect(passiveRun(11)).toEqual(state);
  });

  it('guarda a seed da partida', () => {
    expect(passiveRun(42).seed).toBe(42);
  });

  /**
   * O número que a tela de fim mostra: sem compra nenhuma, a agência é
   * dissolvida pelo calor antes de 2100. Se o balanceamento mudar isto, a frase
   * da tela continua certa — ela lê o ano do estado —, mas vale saber.
   */
  it('sem compra nenhuma, a partida acaba em derrota pelo calor', () => {
    const state = passiveRun(2025);

    expect(outcomeOf(state)).toEqual({ kind: 'defeat', cause: 'temperature' });
    expect(state.year).toBeLessThan(2100);
  });

  it('tem o retrato de cada ano, para as listras e o gráfico', () => {
    const state = passiveRun(2025);

    expect(state.history[0]?.year).toBe(2025);
    expect(state.history.length).toBe(state.year - 2025 + 1);
  });

  /** A comparação só faz sentido se as compras mudam alguma coisa. */
  it('uma partida que compra termina mais fria que a parada, na mesma seed', () => {
    let state = { ...createInitialState(2025), actionPoints: 1000 };
    for (const id of ['solar', 'wind', 'storage', 'smart-grid', 'reforestation']) {
      state = unlockSkill(state, id);
    }
    while (state.year < 2080 && !isFinished(state)) state = advanceTick(state);

    const parada = passiveRun(2025).history.find((snapshot) => snapshot.year === state.year);
    expect(parada).toBeDefined();
    expect(state.temperature).toBeLessThan(parada?.temperature ?? 0);
  });
});
