import { describe, expect, it } from 'vitest';

import { claimAllBubbles } from '../src/engine/bubbles';
import {
  canUnlock,
  completedSynergies,
  hasSynergy,
  synergiesEarned,
  synergyProgress,
  unlockSkill,
} from '../src/engine/skills';
import {
  averageSupport,
  createInitialState,
  parseSynergies,
  REGION_IDS,
  SKILL_BRANCHES,
  skills,
  synergies,
  SYNERGY_EFFECTS,
  type GameState,
  type RawSynergy,
  type SkillId,
} from '../src/engine/state';
import { advanceTick, TOTAL_TICKS } from '../src/engine/tick';
import { synergyView } from '../src/ui/synergy';

/**
 * As sinergias (INTER-08): bônus que não moram em nó nenhum.
 *
 * **O que este arquivo existe para impedir** é o erro que o `CONQ-01` aprendeu
 * com as conquistas: um bônus impossível se parece com um bônus difícil. A
 * varredura do fim joga partidas de referência e exige que cada sinergia seja
 * ganha por uma e recusada por outra.
 */

const start = (): GameState => createInitialState(2025);

/** Uma partida com os nós já comprados, sem passar pelo caixa. */
function com(...ids: readonly SkillId[]): GameState {
  return { ...start(), unlockedSkills: ids };
}

/** O nó mais barato de cada ramo — a raiz. */
const RAIZES = SKILL_BRANCHES.map(
  (branch) => skills.find((skill) => skill.branch === branch && skill.requires.length === 0)?.id,
).filter((id): id is SkillId => id !== undefined);

describe('o contrato do synergies.json', () => {
  it('as três sinergias carregam com id, nome, descrição e efeito', () => {
    expect(synergies.length).toBeGreaterThanOrEqual(3);

    for (const synergy of synergies) {
      expect(synergy.id.trim()).toBeTruthy();
      expect(synergy.name.trim()).toBeTruthy();
      expect(synergy.description.trim()).toBeTruthy();
      expect(synergy.effects.length).toBeGreaterThan(0);
      expect(synergy.nodesPerBranch).toBeGreaterThan(0);
    }
  });

  /**
   * A regra que o `SYNERGY_EFFECTS` do state.ts cobra na carga, e o número que a
   * decidiu está no docs/BALANCEAMENTO.md: com `emissionCut`, a sinergia
   * inverteu a ordem das quatro estratégias de referência do §4.
   */
  it('nenhuma sinergia usa efeito contínuo', () => {
    for (const synergy of synergies) {
      for (const effect of synergy.effects) {
        expect(SYNERGY_EFFECTS as readonly string[]).toContain(effect.kind);
      }
    }
  });

  it('nenhuma sinergia tem `fact`: ciência com fonte é dos nós', () => {
    for (const synergy of synergies) {
      expect(Object.keys(synergy)).not.toContain('fact');
    }
  });

  it('recusa efeito que não vale para sinergia, na carga', () => {
    const cru: readonly RawSynergy[] = [
      {
        id: 'x',
        name: 'X',
        description: 'x',
        nodesPerBranch: 1,
        effects: [{ kind: 'emissionCut', target: 'global', value: 1 }],
      },
    ];

    expect(() => parseSynergies(cru)).toThrow(/não vale para sinergia/);
  });

  it('recusa condição inalcançável por construção', () => {
    const cru: readonly RawSynergy[] = [
      {
        id: 'x',
        name: 'X',
        description: 'x',
        nodesPerBranch: 99,
        effects: [{ kind: 'inertiaCut', value: 1 }],
      },
    ];

    expect(() => parseSynergies(cru)).toThrow(/menor ramo tem/);
  });

  it('recusa id repetido e campo vazio', () => {
    const base: RawSynergy = {
      id: 'x',
      name: 'X',
      description: 'x',
      nodesPerBranch: 1,
      effects: [{ kind: 'inertiaCut', value: 1 }],
    };

    expect(() => parseSynergies([base, base])).toThrow(/mais de uma vez/);
    expect(() => parseSynergies([{ ...base, name: ' ' }])).toThrow(/está sem name/);
  });
});

describe('synergyProgress e hasSynergy', () => {
  it('uma partida nova não fechou nenhuma', () => {
    expect(completedSynergies(start())).toHaveLength(0);
    for (const synergy of synergies) expect(synergyProgress(start(), synergy)).toBe(0);
  });

  it('conta os ramos que já cumprem a condição, não os nós', () => {
    const quatroRamos = com(...RAIZES.slice(0, 4));
    const cinco = com(...RAIZES);
    const umRamoFundo = com('solar', 'wind', 'storage', 'smart-grid');

    const [cincoFrentes] = synergies;
    if (cincoFrentes === undefined) throw new Error('sem sinergia');

    expect(synergyProgress(quatroRamos, cincoFrentes)).toBe(4);
    expect(hasSynergy(quatroRamos, cincoFrentes)).toBe(false);
    expect(hasSynergy(cinco, cincoFrentes)).toBe(true);
    // Quatro nós num ramo só não valem nada para uma condição de largura.
    expect(synergyProgress(umRamoFundo, cincoFrentes)).toBe(1);
  });

  /**
   * É o que torna a condição agnóstica de caminho: quem comprou `storage` em vez
   * de `wind` cumpriu a mesma coisa. Listar ids puniria uma rota legítima.
   */
  it('não se importa com **quais** nós são, só com quantos', () => {
    const [, segundaFileira] = synergies;
    if (segundaFileira === undefined) throw new Error('sem sinergia');

    const porCima = com('solar', 'wind', 'transit', 'ev-fleet');
    const porBaixo = com('solar', 'storage', 'transit', 'active-travel');

    expect(synergyProgress(porCima, segundaFileira)).toBe(
      synergyProgress(porBaixo, segundaFileira),
    );
  });

  it('id desconhecido na lista de compras não conta ramo nenhum', () => {
    const comLixo = com('habilidade-que-sumiu' as SkillId);
    const [cincoFrentes] = synergies;
    if (cincoFrentes === undefined) throw new Error('sem sinergia');

    expect(synergyProgress(comLixo, cincoFrentes)).toBe(0);
  });
});

describe('o bônus entra na compra que fecha a sinergia', () => {
  /** Quatro raízes compradas, caixa cheio: a quinta compra fecha "Cinco frentes". */
  function naBorda(): GameState {
    return { ...com(...RAIZES.slice(0, 4)), actionPoints: 500 };
  }

  it('aplica o empurrão único no mesmo instante', () => {
    const antes = naBorda();
    const quinta = RAIZES[4];
    if (quinta === undefined) throw new Error('sem raiz');

    const depois = unlockSkill(antes, quinta);
    const [cincoFrentes] = synergies;
    if (cincoFrentes === undefined) throw new Error('sem sinergia');

    const bônus = cincoFrentes.effects[0];
    if (bônus === undefined || bônus.kind !== 'support') throw new Error('bônus mudou de tipo');

    // O apoio do nó comprado **mais** o da sinergia: a conta é a soma dos dois,
    // e é por isso que o teste lê a diferença, e não um número absoluto.
    expect(averageSupport(depois)).toBeGreaterThan(averageSupport(antes) + bônus.value - 0.001);
    expect(hasSynergy(depois, cincoFrentes)).toBe(true);
  });

  it('não aplica duas vezes: a sexta compra não repete o bônus', () => {
    const quinta = RAIZES[4];
    if (quinta === undefined) throw new Error('sem raiz');

    const fechou = unlockSkill(naBorda(), quinta);
    const maisUm = unlockSkill({ ...fechou, actionPoints: 500 }, 'wind');

    expect(synergiesEarned(fechou, maisUm)).toHaveLength(0);
    // O apoio da sexta compra é só o do nó — `wind` não dá apoio nenhum.
    expect(averageSupport(maisUm)).toBeCloseTo(averageSupport(fechou), 10);
  });

  it('`synergiesEarned` só olha para a frente', () => {
    const quinta = RAIZES[4];
    if (quinta === undefined) throw new Error('sem raiz');
    const fechou = unlockSkill(naBorda(), quinta);

    expect(synergiesEarned(naBorda(), fechou).map((s) => s.id)).toEqual(['five-fronts']);
    // Nó comprado não se vende: a diferença é sempre num sentido só.
    expect(synergiesEarned(fechou, naBorda())).toHaveLength(0);
  });

  it('o empurrão respeita o teto de 100 do apoio e da resiliência', () => {
    const base = com(...RAIZES.slice(0, 4));
    const cheio: GameState = {
      ...base,
      actionPoints: 500,
      regions: Object.fromEntries(
        REGION_IDS.map((id) => [id, { ...base.regions[id], support: 100, resilience: 100 }]),
      ) as GameState['regions'],
    };
    const quinta = RAIZES[4];
    if (quinta === undefined) throw new Error('sem raiz');

    const depois = unlockSkill(cheio, quinta);
    for (const id of REGION_IDS) {
      expect(depois.regions[id].support).toBeLessThanOrEqual(100);
      expect(depois.regions[id].resilience).toBeLessThanOrEqual(100);
    }
  });
});

describe('a view da lista', () => {
  it('escreve condição, progresso e estado com ícone E rótulo (§5)', () => {
    const view = synergyView(com(...RAIZES.slice(0, 3)));
    const [linha] = view.rows;

    expect(view.rows).toHaveLength(synergies.length);
    expect(linha?.requirement).toContain('5 ramos');
    expect(linha?.progress).toContain('3 de 5');
    expect(linha?.statusIcon.trim()).toBeTruthy();
    expect(linha?.statusLabel.trim()).toBeTruthy();
  });

  it('a sinergia fechada perde o progresso e muda de rótulo', () => {
    const [linha] = synergyView(com(...RAIZES)).rows;

    expect(linha?.done).toBe(true);
    expect(linha?.progress).toBe('');
    expect(linha?.statusLabel).not.toBe(synergyView(start()).rows[0]?.statusLabel);
  });

  it('o título conta quantas estão fechadas', () => {
    expect(synergyView(start()).count).toBe(`0 de ${synergies.length}`);
    expect(synergyView(com(...RAIZES)).count).toBe(`1 de ${synergies.length}`);
  });

  it('o singular da condição não sai errado', () => {
    const [uma] = synergyView(start()).rows;

    expect(uma?.requirement).toContain('1 nó em cada');
    expect(uma?.requirement).not.toContain('1 nós');
  });
});

/**
 * **Nenhuma sinergia é inalcançável, e nenhuma é automática** — a régua do
 * `CONQ-01`, aplicada a bônus em vez de a troféus. As duas partidas abaixo são
 * jogadas contra o engine de verdade, com o relógio, o caixa e a Inércia.
 */
describe('a varredura: alcançável por quem joga largo, negada a quem joga fundo', () => {
  /** Compra o nó mais barato que couber, todo mês: joga largo por economia. */
  function largo(): GameState {
    let state = start();

    for (let i = 0; i < TOTAL_TICKS; i += 1) {
      state = claimAllBubbles(advanceTick(state));
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

  /** Compra só Energia, sempre: a partida que nenhuma sinergia alcança. */
  function fundo(): GameState {
    let state = start();

    for (let i = 0; i < TOTAL_TICKS; i += 1) {
      state = claimAllBubbles(advanceTick(state));
      const next = skills
        .filter((skill) => skill.branch === 'energy')
        .find((skill) => canUnlock(state, skill.id).ok);
      if (next !== undefined) state = unlockSkill(state, next.id);
    }

    return state;
  }

  it('quem compra o mais barato de todos os ramos fecha as três', () => {
    const state = largo();

    expect(completedSynergies(state).map((synergy) => synergy.id)).toEqual(
      synergies.map((synergy) => synergy.id),
    );
  });

  it('quem só compra um ramo não fecha nenhuma', () => {
    const state = fundo();

    expect(state.unlockedSkills.length).toBeGreaterThan(4);
    expect(completedSynergies(state)).toHaveLength(0);
  });
});
