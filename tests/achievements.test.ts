import { describe, expect, it } from 'vitest';

import {
  ACHIEVEMENTS,
  achievementsEarned,
  CONDITION_IDS,
  describeAchievement,
  parseAchievements,
  type AchievementId,
} from '../src/engine/achievements';
import { canContain, contain } from '../src/engine/inertia';
import { isFinished, outcomeOf } from '../src/engine/outcome';
import { canUnlock, unlockSkill } from '../src/engine/skills';
import {
  balance,
  createInitialState,
  REGION_IDS,
  skills,
  type GameState,
  type SkillId,
} from '../src/engine/state';
import { advanceTick } from '../src/engine/tick';
import { CUT_ORDER, SEED } from './planilha-engine';

/**
 * O contrato das conquistas (CONQ-01), e a prova de que nenhuma delas é
 * inalcançável.
 *
 * A segunda metade é a que justifica o arquivo existir. O `P7-03` já publicou
 * uma escala de medalhas que **nenhuma estratégia alcançava**, e o GDD §2.7
 * guarda a cicatriz; uma prateleira de troféus é o lugar onde esse erro é mais
 * barato de cometer e mais difícil de notar, porque um troféu impossível se
 * parece com um troféu difícil. Aqui cada conquista precisa ser ganha por ao
 * menos uma partida de referência e **não** ser ganha por outra: impossível
 * reprova, e automática também.
 */

// ------------------------------------------------------- o contrato ---

describe('o achievements.json e as condições', () => {
  it('têm exatamente os mesmos ids', () => {
    const data = ACHIEVEMENTS.map((a) => a.id).sort();
    expect([...CONDITION_IDS].sort()).toEqual(data);
  });

  it('não repetem id', () => {
    const ids = ACHIEVEMENTS.map((a) => a.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('recusam id repetido no arquivo', () => {
    expect(() =>
      parseAchievements([
        { id: 'a', name: 'A', description: 'a' },
        { id: 'a', name: 'A', description: 'a' },
      ]),
    ).toThrow(/mais de uma vez/);
  });

  it('recusam conquista sem nome', () => {
    expect(() => parseAchievements([{ id: 'a', name: '  ', description: 'a' }])).toThrow(
      /está sem name/,
    );
  });

  // O caso que de fato acontece: um número citado com o nome errado chegaria à
  // tela com as chaves à mostra, e continuaria sendo um texto válido.
  it('recusam um número desconhecido no texto', () => {
    expect(() =>
      parseAchievements([{ id: 'a', name: 'A', description: 'antes de {anoDaVirada}.' }]),
    ).toThrow(/número desconhecido/);
  });
});

describe('o texto de uma conquista', () => {
  it('troca o token pelo número do balance.json', () => {
    const virada = ACHIEVEMENTS.find((a) => a.id === 'turning-point');
    expect(virada).toBeDefined();
    expect(describeAchievement(virada as (typeof ACHIEVEMENTS)[number])).toContain(
      String(balance.turningPointYear),
    );
  });

  it('não deixa nenhuma chave à mostra', () => {
    for (const achievement of ACHIEVEMENTS) {
      expect(describeAchievement(achievement)).not.toMatch(/[{}]/);
    }
  });
});

// ------------------------------------------- partidas de referência ---

/** Os oito nós do ramo Sociedade, na ordem em que o skills.json os escreve. */
const SOCIETY: readonly SkillId[] = skills.filter((s) => s.branch === 'society').map((s) => s.id);

type Plan = {
  readonly label: string;
  /** A partir de que ano o jogador começa a gastar. */
  readonly startYear: number;
  readonly wishlist: readonly SkillId[];
  /** A partir de que nível de Inércia ele contém em vez de comprar. */
  readonly containAbove: number;
};

/**
 * Joga uma partida inteira e devolve o estado em que ela **parou**.
 *
 * Não reaproveita o `simulate` do planilha-engine de propósito: aquele segue
 * até 2100 mesmo depois da derrota, porque a planilha precisa da curva inteira
 * para comparar estratégias no mesmo eixo. Aqui é o contrário — a conquista é
 * lida no estado em que o jogador de fato vê a tela de fim, e uma partida
 * dissolvida em 2092 não continua acumulando troféus até 2100.
 */
function play(plan: Plan): GameState {
  let state = createInitialState(SEED);

  while (!isFinished(state)) {
    state = advanceTick(state);
    if (isFinished(state)) break;
    if (state.year < plan.startYear) continue;

    // Conter ou comprar, nunca os dois no mesmo mês — a mesma política do
    // planilha-engine, porque é a que o jogo permite.
    if (state.inertia >= plan.containAbove && canContain(state).ok) {
      state = contain(state);
      continue;
    }
    for (const id of plan.wishlist) {
      if (canUnlock(state, id).ok) {
        state = unlockSkill(state, id);
        break;
      }
    }
  }

  return state;
}

/**
 * Cinco jeitos de jogar, escolhidos para **cobrir as duas pontas de cada
 * conquista** — e medidos antes de serem escritos (docs/BALANCEAMENTO.md).
 *
 * As três primeiras são as do planilha-engine, que já descreviam o jogo antes
 * das conquistas existirem. As duas últimas entraram aqui porque nenhuma das
 * de lá chega a 2100 com uma região sequer acima de zero.
 *
 * **O que as separa é a profundidade no ramo Sociedade, não o limiar de
 * contenção** — e isso foi medido, ao contrário do que eu tinha suposto. Com a
 * mesma lista de desejos, conter acima de 40 e conter acima de 70 terminam a
 * 1,991 °C e 1,982 °C, com as mesmas 12 contenções: o limiar quase não importa.
 * Trocar os 2 nós de Sociedade da lista histórica pelos 8 do ramo inteiro leva
 * a menor região de 1,31 para 7,11 de apoio. O §2.6 chama o ramo de "licença
 * para lutar"; o que a varredura mostra é que ele também é o que sustenta o
 * apoio enquanto a luta dura. Os números estão em docs/BALANCEAMENTO.md.
 */
const PLANS: readonly Plan[] = [
  { label: 'não faz nada', startYear: balance.endYear, wishlist: [], containAbove: Infinity },
  { label: 'só corta', startYear: balance.startYear, wishlist: CUT_ORDER, containAbove: Infinity },
  {
    label: 'acorda em 2060',
    startYear: 2060,
    wishlist: [...CUT_ORDER, ...SOCIETY],
    containAbove: 40,
  },
  {
    label: 'corta e contém cedo',
    startYear: balance.startYear,
    wishlist: [...CUT_ORDER, ...SOCIETY],
    containAbove: 40,
  },
  {
    label: 'sociedade antes de tudo',
    startYear: balance.startYear,
    wishlist: [...SOCIETY, ...CUT_ORDER],
    containAbove: 40,
  },
];

/** As conquistas de cada plano, calculadas uma vez e lidas por vários testes. */
const EARNED: ReadonlyMap<string, readonly AchievementId[]> = new Map(
  PLANS.map((plan) => [plan.label, achievementsEarned(play(plan))]),
);

describe('nenhuma conquista é decorativa', () => {
  it.each(ACHIEVEMENTS.map((a) => a.id))('“%s” é alcançada por alguma partida', (id) => {
    const quem = [...EARNED].filter(([, ids]) => ids.includes(id)).map(([label]) => label);
    expect(
      quem.length,
      `nenhuma das ${PLANS.length} partidas de referência ganhou "${id}"`,
    ).toBeGreaterThan(0);
  });

  it.each(ACHIEVEMENTS.map((a) => a.id))('“%s” não é dada de graça', (id) => {
    const quemNao = [...EARNED].filter(([, ids]) => !ids.includes(id)).map(([label]) => label);
    expect(quemNao.length, `todas as partidas de referência ganharam "${id}"`).toBeGreaterThan(0);
  });
});

describe('as partidas de referência', () => {
  it('não dão nada a quem não faz nada', () => {
    expect(EARNED.get('não faz nada')).toEqual([]);
  });

  // É o dilema do §2.1 em forma de teste: a estratégia que mais corta emissão
  // é dissolvida, porque pula o ramo Sociedade.
  it('recusam “cinco frentes” e “a agência de pé” a quem só corta', () => {
    const ids = EARNED.get('só corta') ?? [];
    expect(ids).not.toContain('five-fronts');
    expect(ids).not.toContain('agency-standing');
    expect(ids).toContain('turning-point');
  });

  it('recusam “ponto de virada” a quem acorda em 2060', () => {
    expect(EARNED.get('acorda em 2060')).not.toContain('turning-point');
  });

  it('dão “ninguém ficou para trás” só a quem contém cedo', () => {
    expect(EARNED.get('corta e contém cedo')).toContain('nobody-left-behind');
    expect(EARNED.get('só corta')).not.toContain('nobody-left-behind');
  });
});

// --------------------------------------------- as condições, uma a uma ---

describe('achievementsEarned', () => {
  it('não dá nada enquanto a partida corre', () => {
    const state = createInitialState(SEED);
    expect(outcomeOf(state).kind).toBe('playing');
    expect(achievementsEarned(state)).toEqual([]);
  });

  it('devolve os ids na ordem do achievements.json', () => {
    const ids = ACHIEVEMENTS.map((a) => a.id);
    for (const earned of EARNED.values()) {
      const posicoes = earned.map((id) => ids.indexOf(id));
      expect(posicoes).toEqual([...posicoes].sort((a, b) => a - b));
    }
  });

  /**
   * A armadilha que a condição de "a licença para lutar" existe para evitar:
   * quem não faz nada termina com a Inércia baixa, porque ela cresce com o que
   * o jogador já cortou (§2.6). O estado abaixo é o do plano "não faz nada".
   */
  it('não dá “a licença para lutar” a quem nunca pôde conter', () => {
    const parado = play(PLANS[0] as Plan);
    expect(parado.inertia).toBeLessThan(balance.calmInertia);
    expect(parado.unlockedSkills).toEqual([]);
    expect(achievementsEarned(parado)).not.toContain('license-to-fight');
  });

  it('não dá “ninguém ficou para trás” quando uma região zera', () => {
    const vencedor = play(PLANS[3] as Plan);
    expect(achievementsEarned(vencedor)).toContain('nobody-left-behind');

    const comUmaZerada: GameState = {
      ...vencedor,
      regions: {
        ...vencedor.regions,
        na: { ...vencedor.regions.na, support: 0 },
      },
    };
    expect(achievementsEarned(comUmaZerada)).not.toContain('nobody-left-behind');
    // E as oito continuam sendo oito: a condição olha todas, não uma amostra.
    expect(REGION_IDS).toHaveLength(8);
  });

  it('dá “o teto de Paris” pela prata e também pelo ouro', () => {
    const base = play(PLANS[3] as Plan);
    const prata: GameState = { ...base, temperature: balance.silverTemperature - 0.01 };
    const ouro: GameState = { ...base, temperature: balance.goldTemperature - 0.01 };
    const bronze: GameState = { ...base, temperature: balance.bronzeTemperature - 0.01 };

    expect(achievementsEarned(prata)).toContain('paris-ceiling');
    expect(achievementsEarned(ouro)).toContain('paris-ceiling');
    expect(achievementsEarned(bronze)).not.toContain('paris-ceiling');
  });
});
