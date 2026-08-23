import { describe, expect, it } from 'vitest';

import { ui } from '../src/data/i18n';
import { CONTAIN_REQUIRES } from '../src/engine/inertia';
import { skillById, unlockSkill } from '../src/engine/skills';
import { balance, createInitialState, type GameState } from '../src/engine/state';
import { CONTAIN_STATUSES, containView } from '../src/ui/contain';

/**
 * O núcleo puro do botão de contenção (P7-03). Roda em node — o que só existe
 * com DOM está no tests/contain.dom.test.ts.
 */

const start = (): GameState => createInitialState(2025);

/** Um estado com o ramo Sociedade destravado e PAC no bolso. */
function destravado(inertia = 80, actionPoints = 2000): GameState {
  if (CONTAIN_REQUIRES === undefined) throw new Error('a árvore não tem raiz de Sociedade');
  const rico = { ...start(), actionPoints: 2000 };
  return { ...unlockSkill(rico, CONTAIN_REQUIRES), inertia, actionPoints };
}

describe('containView', () => {
  it('nasce bloqueada: o ramo Sociedade é a licença para lutar', () => {
    const view = containView(start());

    expect(view.status).toBe('locked');
    expect(view.detail).toBe(ui.contain.requires(skillById(CONTAIN_REQUIRES ?? '')?.name ?? ''));
    // O nome do nó que falta aparece por escrito, e não o id interno: o §11
    // manda id em inglês e interface em pt-BR.
    expect(view.detail).toContain('Educação climática');
  });

  it('não anuncia preço enquanto está bloqueada', () => {
    // Mostrar "30 PAC" num botão bloqueado anunciaria um número que ainda vai
    // mudar — o desconto por nó de Sociedade derruba o custo antes de o jogador
    // poder usá-lo uma vez.
    expect(containView(start()).cost).toBe('');
  });

  it('destravada e com PAC, fica disponível e mostra o custo', () => {
    const view = containView(destravado());

    expect(view.status).toBe('available');
    expect(view.detail).toBe('');
    expect(view.cost).toBe(ui.contain.cost(String(balance.containCost)));
  });

  it('sem PAC, diz quanto falta — arredondado para cima', () => {
    // Mesma escolha do tree.ts: "Faltam 0 PAC" num botão que não funciona é o
    // texto que faz o jogador achar que o jogo travou.
    const view = containView(destravado(80, balance.containCost - 0.5));

    expect(view.status).toBe('unaffordable');
    expect(view.detail).toBe(ui.contain.missingPoints('1'));
  });

  it('com a Inércia em zero, recusa por economia e não por falta', () => {
    const view = containView(destravado(0));

    expect(view.status).toBe('idle');
    expect(view.detail).toBe(ui.contain.idle);
  });

  it('recusa enquanto o HUD ainda mostra zero — a guarda e o mostrador concordam', () => {
    // **O defeito que este teste tranca foi visto no navegador**, no P7-03: com
    // a Inércia em 0,4 o HUD escrevia "0" e o botão dizia "Disponível" logo
    // abaixo. Trinta PAC para derrubar algo que o jogador não tinha como ver.
    expect(containView(destravado(0.4)).status).toBe('idle');
    expect(containView(destravado(0.9)).status).toBe('idle');
    expect(containView(destravado(1)).status).toBe('available');
  });

  it('a Inércia em zero tem prioridade sobre a falta de PAC', () => {
    // A ordem das recusas é a ordem em que elas interessam a quem lê: dizer
    // "faltam 30 PAC" para uma Inércia que já está no chão manda o jogador
    // juntar dinheiro para nada.
    expect(containView(destravado(0, 0)).status).toBe('idle');
  });

  it('o custo cai a cada nó de Sociedade, e a tela mostra a queda', () => {
    let state = destravado();
    const primeiro = containView(state).cost;

    state = { ...unlockSkill({ ...state, actionPoints: 2000 }, 'treaties'), inertia: 80 };
    const segundo = containView(state).cost;

    expect(primeiro).not.toBe(segundo);
    expect(Number.parseInt(segundo, 10)).toBeLessThan(Number.parseInt(primeiro, 10));
  });

  it('o alívio na descrição vem do balance.json, não escrito na frase', () => {
    // A regra 8 onde ela quase escapa: "derruba 25 pontos" **é** um número de
    // balanceamento, e uma frase que o repete vira mentira sem nada quebrar.
    expect(containView(start()).description).toContain(String(balance.containRelief));
    expect(containView(start()).description).toBe(
      ui.contain.description(String(balance.containRelief)),
    );
  });

  it('§5: todo estado tem ícone E rótulo escrito, e os rótulos são distintos', () => {
    const rotulos = CONTAIN_STATUSES.map((s) => ui.contain.status[s].label);
    const icones = CONTAIN_STATUSES.map((s) => ui.contain.status[s].icon);

    expect(new Set(rotulos).size).toBe(CONTAIN_STATUSES.length);
    expect(new Set(icones).size).toBe(CONTAIN_STATUSES.length);
    for (const texto of [...rotulos, ...icones]) expect(texto.length).toBeGreaterThan(0);
  });

  it('todo estado do engine tem uma tradução de tela', () => {
    // Se o `canContain` ganhar uma quarta recusa, o `tsc` já cobra o Record do
    // contain.ts; isto cobra o outro lado, que é o i18n.
    for (const status of CONTAIN_STATUSES) {
      expect(ui.contain.status[status]).toBeDefined();
    }
  });
});
