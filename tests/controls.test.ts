import { describe, expect, it } from 'vitest';
import { balance, createInitialState } from '../src/engine/state';
import { advanceRealTime, createClock } from '../src/engine/tick';
import {
  applyCommand,
  commandForKey,
  createTimeControl,
  effectiveSpeed,
  setSpeed,
  SPEEDS,
  togglePause,
} from '../src/ui/controls';

/**
 * Cobre o núcleo puro do controle de tempo e a costura dele com o engine. Os
 * botões em si (`mountControls`, `renderControls`) ficam de fora pelo mesmo
 * motivo do HUD: exigiriam jsdom, que é dependência nova (§2).
 */
describe('o controle de tempo', () => {
  it('começa rodando a 1x', () => {
    expect(createTimeControl()).toEqual({ paused: false, speed: 1 });
  });

  it('togglePause alterna, sem mutar o que recebeu', () => {
    const running = createTimeControl();
    const paused = togglePause(running);

    expect(paused.paused).toBe(true);
    expect(running.paused).toBe(false);
    expect(togglePause(paused).paused).toBe(false);
  });

  it('trocar de velocidade não tira da pausa', () => {
    // São duas decisões separadas: escolher 4x enquanto se lê a tela não deve
    // fazer o tempo voltar a correr por baixo do jogador.
    const paused = togglePause(createTimeControl());
    const faster = setSpeed(paused, 4);

    expect(faster.paused).toBe(true);
    expect(faster.speed).toBe(4);
  });

  it('effectiveSpeed devolve a velocidade escolhida, e zero em pausa', () => {
    for (const speed of SPEEDS) {
      expect(effectiveSpeed(setSpeed(createTimeControl(), speed))).toBe(speed);
      expect(effectiveSpeed(togglePause(setSpeed(createTimeControl(), speed)))).toBe(0);
    }
  });
});

describe('os atalhos de teclado', () => {
  it('ACEITE: Espaço pausa e retoma', () => {
    let control = createTimeControl();
    expect(control.paused).toBe(false);

    control = applyCommand(control, commandForKey(' '));
    expect(control.paused).toBe(true);

    control = applyCommand(control, commandForKey(' '));
    expect(control.paused).toBe(false);
  });

  it('aceita o nome legado da barra de espaço', () => {
    expect(commandForKey('Spacebar')).toEqual({ kind: 'togglePause' });
  });

  it('as teclas 1, 2 e 4 escolhem a velocidade', () => {
    for (const speed of SPEEDS) {
      expect(commandForKey(String(speed))).toEqual({ kind: 'setSpeed', speed });
    }
  });

  it('ignora tecla que não é atalho', () => {
    // O '0' e o '3' importam: são dígitos que o Number() converte sem reclamar,
    // e sem a checagem contra SPEEDS virariam velocidade 0 ou 3.
    for (const key of ['0', '3', '5', 'a', 'Enter', 'Escape', '']) {
      expect(commandForKey(key)).toBeNull();
    }
  });

  it('applyCommand com null devolve o mesmo controle', () => {
    const control = createTimeControl();
    expect(applyCommand(control, null)).toBe(control);
  });
});

describe('o controle de tempo movendo o engine', () => {
  const MS_PER_TICK = balance.realSecondsPerTick * 1000;

  it('em pausa a partida não anda — e o resto do mês não se perde', () => {
    const running = createTimeControl();
    const paused = togglePause(running);

    // 900 ms a 1x: mais da metade do mês, sem completar nenhum tick.
    const warm = advanceRealTime(
      createInitialState(1),
      createClock(),
      900,
      effectiveSpeed(running),
    );

    expect(warm.state.tick).toBe(0);
    expect(warm.clock.leftoverMs).toBeCloseTo(900, 6);

    // Dez segundos de quadros em pausa: seriam mais de seis meses de jogo.
    let state = warm.state;
    let clock = warm.clock;
    for (let frame = 0; frame < 600; frame++) {
      const step = advanceRealTime(state, clock, 16.7, effectiveSpeed(paused));
      state = step.state;
      clock = step.clock;
    }

    expect(state).toEqual(warm.state);
    expect(clock.leftoverMs).toBeCloseTo(900, 6);

    // Retomar continua de onde parou: faltavam 600 ms para fechar o mês.
    const resumed = advanceRealTime(state, clock, 600, effectiveSpeed(running));
    expect(resumed.state.tick).toBe(1);
  });

  it('4x anda o quádruplo de 1x no mesmo tempo real', () => {
    // 3000 ms: 2 ticks a 1x e 8 a 4x. Abaixo do teto de 12 passos por chamada
    // do P6-04, senão seria o teto que estaria sendo medido, não a velocidade.
    const slow = advanceRealTime(createInitialState(1), createClock(), 3000, 1);
    const fast = advanceRealTime(createInitialState(1), createClock(), 3000, 4);

    expect(slow.state.tick).toBe(2);
    expect(fast.state.tick).toBe(8);
    expect(MS_PER_TICK).toBe(1500);
  });
});
