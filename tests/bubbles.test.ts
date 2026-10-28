import { describe, expect, it } from 'vitest';

import {
  advanceBubbles,
  automaticPointsPerTick,
  bubbleKeyOf,
  bubbleValue,
  claimAllBubbles,
  claimBubble,
} from '../src/engine/bubbles';
import { medalFor, outcomeOf } from '../src/engine/outcome';
import { canUnlock, pointsPerYear, unlockSkill } from '../src/engine/skills';
import {
  balance,
  createInitialState,
  REGION_IDS,
  skills,
  type GameState,
} from '../src/engine/state';
import { advanceTick, TOTAL_TICKS } from '../src/engine/tick';

/**
 * As bolhas de PAC sobre o mapa (INTER-03).
 *
 * O que este arquivo protege não é a mecânica em si — é a **identidade de
 * renda** que a mantém honesta: quem recolhe tudo arrecada exatamente o que
 * arrecadava antes de as bolhas existirem. Sem isso, o teto de 46 PAC/ano medido
 * no `REF-09` estaria furado por uma decisão de interface, e o dilema do
 * `docs/GDD.md §2.6` iria com ele.
 */

const SEED = 2025;
const start = (): GameState => createInitialState(SEED);

/** Um ano de jogo, de quem recolhe o que o mapa oferece. */
function playYear(state: GameState, years = 1): GameState {
  let next = state;
  for (let i = 0; i < balance.ticksPerYear * years; i += 1) {
    next = claimAllBubbles(advanceTick(next));
  }
  return next;
}

/** Um ano de jogo, de quem nunca clica numa bolha. */
function ignoreYear(state: GameState, years = 1): GameState {
  let next = state;
  for (let i = 0; i < balance.ticksPerYear * years; i += 1) {
    next = advanceTick(next);
  }
  return next;
}

describe('a identidade de renda', () => {
  /**
   * **A asserção mais importante do arquivo.** A renda não subiu com as bolhas:
   * ela foi dividida. Se um dia esta conta deixar de fechar, o jogo passou a
   * pagar mais do que o balanceamento mediu — e é por aí que o teto de 46
   * PAC/ano cai sem ninguém perceber.
   */
  it('o automático mais as bolhas de um ano dão exatamente a renda do ano', () => {
    const state = start();
    const automatic = automaticPointsPerTick(state) * balance.ticksPerYear;
    const fromBubbles = bubbleValue(state) * balance.bubblesPerYear;

    expect(automatic + fromBubbles).toBeCloseTo(pointsPerYear(state), 10);
  });

  it('um ano jogado recolhendo tudo rende a renda cheia', () => {
    expect(playYear(start()).actionPoints).toBeCloseTo(balance.basePointsPerYear, 10);
  });

  it('um ano jogado sem recolher nada rende a renda menos a fatia das bolhas', () => {
    const ignored = ignoreYear(start()).actionPoints;

    expect(ignored).toBeCloseTo(balance.basePointsPerYear * (1 - balance.bubbleShare), 10);
    expect(ignored).toBeLessThan(balance.basePointsPerYear);
  });

  /**
   * A bolha vale uma fatia de **toda** a renda, e não um número fixo. Sem isso,
   * os nós de PAC/ano e o financiamento da Juliana renderiam menos do que a
   * tabela do `§4` promete, e o `REF-09` precisaria ser medido de novo por causa
   * de uma decisão de interface.
   */
  it('a bolha acompanha os nós que aumentam a renda', () => {
    const taught: GameState = { ...start(), unlockedSkills: ['climate-education'] };

    expect(pointsPerYear(taught)).toBeGreaterThan(pointsPerYear(start()));
    expect(bubbleValue(taught)).toBeGreaterThan(bubbleValue(start()));
  });
});

describe('a cadência', () => {
  /**
   * Cadência fixa, lugar sorteado. O porquê está no src/engine/bubbles.ts: a
   * versão com sorteio por mês entregou 8 bolhas em 3 anos em vez de 6, e renda
   * que varia com a sorte não cabe num jogo balanceado por varredura.
   */
  it('nasce exatamente `bubblesPerYear` bolhas por ano', () => {
    let state = start();
    let born = 0;

    for (let i = 0; i < balance.ticksPerYear; i += 1) {
      const before = state.bubbles.length;
      state = advanceTick(state);
      // Nenhuma expira neste intervalo: `bubbleTicks` é de um ano.
      born += Math.max(0, state.bubbles.length - before);
    }

    expect(born).toBe(balance.bubblesPerYear);
  });

  it('nunca nasce mais de uma bolha no mesmo mês', () => {
    let state = start();

    for (let i = 0; i < 120; i += 1) {
      const before = state.bubbles.length;
      state = claimAllBubbles(advanceTick(state));
      expect(state.bubbles.length - Math.max(0, before - 1)).toBeLessThanOrEqual(1);
    }
  });

  /**
   * O deslocamento de meio período: sem ele a bolha nasceria no mesmo mês do
   * turno da Inércia, e o jogador veria a silhueta do lobby e um prêmio de PAC
   * aparecerem juntos — com boa chance de concluir que um causou o outro.
   */
  it('não nasce no mês em que a Inércia age', () => {
    let state = start();

    for (let i = 0; i < 120; i += 1) {
      const before = state.bubbles.length;
      state = advanceTick(state);
      const nasceu = state.bubbles.length > before;

      if (nasceu) expect(state.tick % balance.inertiaActionEveryTicks).not.toBe(0);
    }
  });

  it('espalha as bolhas pelas oito regiões', () => {
    let state = start();
    const seen = new Set<string>();

    for (let i = 0; i < TOTAL_TICKS; i += 1) {
      state = advanceTick(state);
      for (const bubble of state.bubbles) seen.add(bubble.target);
      state = claimAllBubbles(state);
    }

    expect(seen.size).toBe(REGION_IDS.length);
  });

  it('a mesma seed põe as bolhas nas mesmas regiões', () => {
    const a = playYear(createInitialState(7), 5);
    const b = playYear(createInitialState(7), 5);

    expect(a).toEqual(b);
  });

  /**
   * **A garantia de engenharia do INTER-03:** o sorteio da região tem gerador
   * próprio e **não consome** o `rngState` da partida. É isso que impede a
   * mecânica de deslocar todos os sorteios de evento de 2025 a 2100 — e com eles
   * as cinco partidas de referência e as varreduras do docs/BALANCEAMENTO.md.
   */
  it('não anda com o gerador da partida', () => {
    const state = start();

    expect(advanceBubbles(state).rngState).toBe(state.rngState);
  });
});

describe('recolher e perder', () => {
  /** Uma partida com uma bolha na mesa, e a chave dela. */
  function withBubble(): { state: GameState; key: string } {
    let state = start();
    while (state.bubbles.length === 0) state = advanceTick(state);

    const [bubble] = state.bubbles;
    if (bubble === undefined) throw new Error('nenhuma bolha nasceu');
    return { state, key: bubbleKeyOf(bubble, state.tick) };
  }

  it('recolher paga o valor da bolha e a tira da mesa', () => {
    const { state, key } = withBubble();
    const next = claimBubble(state, key);

    expect(next.actionPoints).toBeCloseTo(state.actionPoints + bubbleValue(state), 10);
    expect(next.bubbles).toHaveLength(state.bubbles.length - 1);
  });

  /**
   * Devolver o **mesmo objeto** na recusa é o que permite à tela comparar por
   * identidade, como no `unlockSkill` e no `contain`. É também o que torna
   * inofensivo o duplo clique na mesma bolha — o acidente mais provável desta
   * mecânica no Modo Feira, a 4x.
   */
  it('uma chave que não existe devolve o mesmo estado, sem pagar nada', () => {
    const { state, key } = withBubble();

    expect(claimBubble(state, 'bolha@-1')).toBe(state);
    expect(claimBubble(claimBubble(state, key), key).actionPoints).toBeCloseTo(
      claimBubble(state, key).actionPoints,
      10,
    );
  });

  it('a bolha que ninguém recolhe some sem pagar nada', () => {
    const { state } = withBubble();
    const antes = state.actionPoints;
    let depois = state;

    for (let i = 0; i < balance.bubbleTicks; i += 1) depois = { ...advanceTick(depois) };

    // Já não é a mesma bolha em cena, e o PAC só subiu pela parte automática.
    expect(depois.bubbles.every((bubble) => bubble.ticksRemaining < balance.bubbleTicks)).toBe(
      false,
    );
    expect(depois.actionPoints).toBeCloseTo(
      antes + automaticPointsPerTick(state) * balance.bubbleTicks,
      6,
    );
  });

  it('recolher tudo de uma vez paga a soma e limpa a mesa', () => {
    let state = start();
    state = ignoreYear(state); // duas bolhas na mesa, nenhuma recolhida

    const total = state.bubbles.reduce((sum, bubble) => sum + bubble.value, 0);
    const next = claimAllBubbles(state);

    expect(state.bubbles.length).toBeGreaterThan(0);
    expect(next.bubbles).toHaveLength(0);
    expect(next.actionPoints).toBeCloseTo(state.actionPoints + total, 10);
  });

  it('recolher com a mesa vazia devolve o mesmo estado', () => {
    const state = start();

    expect(claimAllBubbles(state)).toBe(state);
  });
});

/**
 * O preço de não olhar o mapa, medido na partida inteira (INTER-05). Os números
 * exatos estão no docs/BALANCEAMENTO.md; aqui ficam as **propriedades**, que são
 * o que não pode mudar sem alguém decidir.
 */
describe('o preço de ignorar as bolhas', () => {
  /**
   * O comprador guloso do tests/skills.test.ts: a cada mês compra o nó mais
   * barato que couber no caixa. Não é a jogada ótima — é a jogada de referência
   * do **orçamento**, que é justamente o que as bolhas mexem.
   */
  function play(collecting: boolean): GameState {
    let state = start();

    for (let i = 0; i < TOTAL_TICKS; i += 1) {
      state = advanceTick(state);
      if (collecting) state = claimAllBubbles(state);

      for (;;) {
        const next = [...skills]
          .sort((a, b) => a.cost - b.cost)
          .find((skill) => canUnlock(state, skill.id).ok);
        if (next === undefined) break;
        state = unlockSkill(state, next.id);
      }
    }

    return state;
  }

  it('quem ignora as bolhas compra menos e termina mais quente', () => {
    const atento = play(true);
    const distraído = play(false);

    expect(distraído.unlockedSkills.length).toBeLessThan(atento.unlockedSkills.length);
    expect(distraído.temperature).toBeGreaterThan(atento.temperature);
  });

  /**
   * **Quanto custa, medido:** 0,0907 °C para o comprador guloso, o que o leva de
   * **prata para bronze**. É uma faixa de medalha, e é de propósito — uma
   * mecânica de atenção que não muda o resultado é enfeite. O que ela **não**
   * faz é tirar a partida de ninguém: quem nunca clicou numa bolha ainda chega
   * vivo a 2100 com bronze, e num estande de feira é exatamente isso que
   * precisava ser verdade.
   *
   * O número está no docs/BALANCEAMENTO.md. Aqui ficam as duas pontas: custa uma
   * faixa, e não custa a partida.
   */
  it('custa uma faixa de medalha, e não a partida', () => {
    const atento = play(true);
    const distraído = play(false);

    expect(medalFor(atento.temperature)).toBe('silver');
    expect(medalFor(distraído.temperature)).toBe('bronze');
    expect(outcomeOf(distraído)).toMatchObject({ kind: 'finished' });
    expect(distraído.year).toBe(balance.endYear);
  });
});
