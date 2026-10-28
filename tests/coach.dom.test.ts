// @vitest-environment jsdom

import { describe, expect, it } from 'vitest';

import { ui } from '../src/data/i18n';
import { canContain } from '../src/engine/inertia';
import { readyToUnlock } from '../src/engine/skills';
import { balance, createInitialState, type Bubble, type GameState } from '../src/engine/state';
import { TOTAL_TICKS } from '../src/engine/tick';
import { coachView, COACH_CUES, mountCoach, renderCoach } from '../src/ui/coach';

/**
 * A linha do "faça isto agora" (INTER-07).
 *
 * A ordem dos conselhos é a regra deste arquivo, e ela não é de gosto: aponta
 * primeiro para o que se **perde** esperando. Quem ignora isso ao mexer na
 * escada reprova aqui.
 */

const start = (): GameState => createInitialState(2025);

function bolha(): Bubble {
  return { target: 'af', value: 5.75, ticksRemaining: balance.bubbleTicks };
}

/** Uma partida sem bolhas na mesa — o estado "limpo" para testar as outras pontas. */
function semBolhas(extra: Partial<GameState> = {}): GameState {
  return { ...start(), bubbles: [], ...extra };
}

describe('coachView — a escada', () => {
  it('a bolha vem primeiro: ela expira, e as outras não', () => {
    const state = semBolhas({ bubbles: [bolha()], actionPoints: 9999, inertia: 90 });

    expect(coachView(state).cue).toBe('bubble');
    expect(coachView(state).text).toBe(ui.coach.bubble(1));
  });

  it('a contenção vem antes da compra: o estrago da Inércia é permanente', () => {
    // Com o nó raiz de Sociedade e PAC no caixa, conter é possível (P7-03).
    const state = semBolhas({
      unlockedSkills: ['climate-education'],
      actionPoints: balance.containCost + 500,
      inertia: 70,
    });

    expect(canContain(state).ok).toBe(true);
    expect(readyToUnlock(state).length).toBeGreaterThan(0);
    expect(coachView(state).cue).toBe('contain');
    expect(coachView(state).text).toContain('70');
  });

  /**
   * Mandar conter sem poder conter seria mandar o jogador a um botão recusado —
   * o pior tipo de conselho. Quem responde se dá é o engine.
   */
  it('não manda conter quando conter não é possível', () => {
    const state = semBolhas({ inertia: 90, actionPoints: 0 });

    expect(canContain(state).ok).toBe(false);
    expect(coachView(state).cue).not.toBe('contain');
  });

  it('aponta a região que furou o piso de apatia, pelo nome', () => {
    const base = semBolhas();
    const state: GameState = {
      ...base,
      regions: { ...base.regions, af: { ...base.regions.af, support: 4 } },
    };

    expect(coachView(state).cue).toBe('support');
    expect(coachView(state).text).toContain(base.regions.af.name);
  });

  it('entre duas regiões abaixo do piso, aponta a mais abalada', () => {
    const base = semBolhas();
    const state: GameState = {
      ...base,
      regions: {
        ...base.regions,
        af: { ...base.regions.af, support: 10 },
        eu: { ...base.regions.eu, support: 3 },
      },
    };

    expect(coachView(state).text).toContain(base.regions.eu.name);
  });

  it('manda comprar quando há nó ao alcance e nenhuma urgência', () => {
    const state = semBolhas({ actionPoints: 500 });
    const view = coachView(state);

    expect(view.cue).toBe('buy');
    expect(view.text).toBe(ui.coach.buy(readyToUnlock(state).length));
  });

  it('com o caixa vazio e o mundo calmo, explica que o PAC entra sozinho', () => {
    expect(coachView(semBolhas()).cue).toBe('wait');
    expect(coachView(semBolhas()).text).toBe(ui.coach.wait);
  });

  it('cala com o painel do Modo Feira no ar', () => {
    const state = semBolhas({ bubbles: [bolha()] });

    expect(coachView(state, true).text).toBe('');
    expect(coachView(state, true).cue).toBeNull();
  });

  it('cala na partida encerrada', () => {
    const acabou: GameState = { ...semBolhas({ bubbles: [bolha()] }), tick: TOTAL_TICKS };

    expect(coachView(acabou).text).toBe('');
  });

  it('toda dica tem texto, e nenhum texto é um sermão', () => {
    for (const cue of COACH_CUES) {
      const texto =
        cue === 'bubble'
          ? ui.coach.bubble(2)
          : cue === 'contain'
            ? ui.coach.contain(60)
            : cue === 'support'
              ? ui.coach.support('África')
              : cue === 'buy'
                ? ui.coach.buy(3)
                : ui.coach.wait;

      expect(texto.trim().length).toBeGreaterThan(10);
      // Uma frase de pé, lida de longe: duas linhas no máximo em 44rem.
      expect(texto.length).toBeLessThan(110);
    }
  });

  it('o singular das frases com número não sai errado', () => {
    expect(ui.coach.bubble(1)).toContain('uma bolha');
    expect(ui.coach.bubble(2)).toContain('2 bolhas');
    expect(ui.coach.buy(1)).toContain('para um nó');
    expect(ui.coach.buy(4)).toContain('para 4 nós');
  });
});

describe('a linha no DOM', () => {
  /**
   * A camada de verdade nasce dentro do quadro do mapa (`coachHost`); aqui basta
   * um `div` com a mesma classe, porque o que o teste cobra é o conteúdo.
   */
  function mount(): HTMLElement {
    const root = document.createElement('div');
    root.className = 'map__coach';
    document.body.replaceChildren(root);
    mountCoach(root);
    return root;
  }

  it('nasce escondida e anuncia com `polite` (§5)', () => {
    const root = mount();

    expect(root.hidden).toBe(true);
    expect(root.getAttribute('aria-live')).toBe('polite');
  });

  it('escreve o conselho e marca o que ele aponta', () => {
    const root = mount();
    renderCoach(root, coachView(semBolhas({ bubbles: [bolha()] })));

    expect(root.hidden).toBe(false);
    expect(root.dataset.cue).toBe('bubble');
    expect(root.textContent).toContain('bolha');
  });

  it('o ícone é decoração: quem diz o que fazer é o texto', () => {
    const root = mount();
    renderCoach(root, coachView(semBolhas({ actionPoints: 500 })));

    expect(root.querySelector('svg.icon')?.getAttribute('aria-hidden')).toBe('true');
    expect(root.textContent?.trim().length).toBeGreaterThan(10);
  });

  it('volta a se esconder quando não há conselho', () => {
    const root = mount();
    renderCoach(root, coachView(semBolhas({ actionPoints: 500 })));
    renderCoach(root, coachView(semBolhas(), true));

    expect(root.hidden).toBe(true);
    expect(root.dataset.cue).toBeUndefined();
  });
});
