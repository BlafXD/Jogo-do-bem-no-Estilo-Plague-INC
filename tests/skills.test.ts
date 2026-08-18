import { describe, expect, it } from 'vitest';
import {
  canUnlock,
  emissionCutFor,
  isUnlocked,
  pointsPerYear,
  unlockSkill,
} from '../src/engine/skills';
import {
  balance,
  createInitialState,
  parseSkills,
  REGION_IDS,
  skills,
  SKILL_BRANCHES,
  type GameState,
  type RawSkill,
} from '../src/engine/state';

/** Um nó cru válido, para os testes de validação estragarem um campo por vez. */
function validSkill(id: string): RawSkill {
  return {
    id,
    branch: 'energy',
    name: `Nó ${id}`,
    description: 'Faz alguma coisa.',
    fact: 'Um fato real com fonte.',
    cost: 10,
    requires: [],
    effects: [{ kind: 'pointsPerYear', value: 1 }],
  };
}

describe('a árvore de src/data/skills.json', () => {
  it('tem 20 nós, 4 em cada um dos 5 ramos', () => {
    // O corte do modo solo está na tabela da Estratégia Solo do PLANO.md. Subir
    // para 40 é decisão de escopo — se este teste falhar, é para atualizá-lo de
    // propósito, junto do PLANO.md.
    expect(skills).toHaveLength(20);

    for (const branch of SKILL_BRANCHES) {
      expect(skills.filter((skill) => skill.branch === branch)).toHaveLength(4);
    }
  });

  it('cada ramo tem exatamente uma raiz, e nenhum nó depende de outro ramo', () => {
    const byId = new Map(skills.map((skill) => [skill.id, skill]));

    for (const branch of SKILL_BRANCHES) {
      const inBranch = skills.filter((skill) => skill.branch === branch);
      expect(inBranch.filter((skill) => skill.requires.length === 0)).toHaveLength(1);
    }

    for (const skill of skills) {
      for (const required of skill.requires) {
        expect(byId.get(required)?.branch).toBe(skill.branch);
      }
    }
  });

  it('trava o custo total em 1600 PAC e o corte total em 5,5% ao ano', () => {
    // Estes dois números são o balanceamento inteiro da árvore. Sem travá-los,
    // mexer no custo de um nó muda a dificuldade da partida e nenhum outro
    // teste percebe. Mudança aqui vira linha em docs/BALANCEAMENTO.md.
    const cost = skills.reduce((total, skill) => total + skill.cost, 0);
    const cut = skills
      .flatMap((skill) => skill.effects)
      .filter((effect) => effect.kind === 'emissionCut')
      .reduce((total, effect) => total + effect.value, 0);

    expect(cost).toBe(1600);
    expect(cut).toBeCloseTo(5.5, 10);
  });

  it('todo nó tem nome, descrição e fato preenchidos', () => {
    // O fato é o que torna o jogo educativo (docs/GDD.md §2.4) e é o campo que
    // o pacote [D-Historia] vai reescrever. Um nó sem fato passaria despercebido.
    for (const skill of skills) {
      expect(skill.name.trim().length).toBeGreaterThan(0);
      expect(skill.description.trim().length).toBeGreaterThan(0);
      expect(skill.fact.trim().length).toBeGreaterThan(10);
    }
  });
});

describe('parseSkills recusa arquivo malformado', () => {
  it('id repetido', () => {
    expect(() => parseSkills([validSkill('a'), validSkill('a')])).toThrow(/mais de uma vez/);
  });

  it('pré-requisito que não existe', () => {
    const orphan = { ...validSkill('b'), requires: ['fantasma'] };
    expect(() => parseSkills([validSkill('a'), orphan])).toThrow(/não existe/);
  });

  it('pré-requisito circular', () => {
    // Sem esta checagem o jogo carregaria normalmente e os dois nós ficariam
    // bloqueados para sempre, sem ninguém saber por quê.
    const a = { ...validSkill('a'), requires: ['b'] };
    const b = { ...validSkill('b'), requires: ['a'] };
    expect(() => parseSkills([a, b])).toThrow(/circular/);
  });

  it('ramo desconhecido', () => {
    expect(() => parseSkills([{ ...validSkill('a'), branch: 'politica' }])).toThrow(/ramo/);
  });

  it('efeito de tipo desconhecido', () => {
    const weird = { ...validSkill('a'), effects: [{ kind: 'teleporte', value: 1 }] };
    expect(() => parseSkills([weird])).toThrow(/desconhecido/);
  });

  it('alvo faltando num efeito que precisa de alvo', () => {
    const noTarget = { ...validSkill('a'), effects: [{ kind: 'emissionCut', value: 1 }] };
    expect(() => parseSkills([noTarget])).toThrow(/precisa de target/);
  });

  it('alvo sobrando num efeito que não leva alvo', () => {
    const extra = { ...validSkill('a'), effects: [{ kind: 'inertiaCut', value: 1, target: 'eu' }] };
    expect(() => parseSkills([extra])).toThrow(/não leva target/);
  });

  it('alvo que não é região nem global', () => {
    const bad = { ...validSkill('a'), effects: [{ kind: 'support', value: 1, target: 'marte' }] };
    expect(() => parseSkills([bad])).toThrow(/alvo desconhecido/);
  });

  it('custo zero, e nó sem efeito nenhum', () => {
    expect(() => parseSkills([{ ...validSkill('a'), cost: 0 }])).toThrow(/custo/);
    expect(() => parseSkills([{ ...validSkill('a'), effects: [] }])).toThrow(/efeito nenhum/);
  });

  it('fato vazio — o campo que o [D-Historia] mais vai mexer', () => {
    expect(() => parseSkills([{ ...validSkill('a'), fact: '   ' }])).toThrow(/sem fact/);
  });
});

// ---------------------------------------------------------------------------

const semPac = 0;

function gameWith(points: number, unlocked: readonly string[] = []): GameState {
  return { ...createInitialState(1), actionPoints: points, unlockedSkills: unlocked };
}

describe('canUnlock', () => {
  it('libera uma raiz assim que o PAC dá', () => {
    expect(canUnlock(gameWith(40), 'solar')).toEqual({ ok: true });
  });

  it('recusa por PAC insuficiente', () => {
    expect(canUnlock(gameWith(39), 'solar')).toEqual({ ok: false, reason: 'notEnoughPoints' });
  });

  it('recusa por pré-requisito faltando, mesmo com PAC de sobra', () => {
    expect(canUnlock(gameWith(9999), 'smart-grid')).toEqual({
      ok: false,
      reason: 'missingRequirement',
    });
  });

  it('exige TODOS os pré-requisitos, não só um', () => {
    // smart-grid pede wind e storage. Ter só um dos dois não basta — é o caso
    // que um `some` no lugar de um `every` deixaria passar.
    const meio = gameWith(9999, ['solar', 'wind']);
    expect(canUnlock(meio, 'smart-grid')).toEqual({ ok: false, reason: 'missingRequirement' });

    const inteiro = gameWith(9999, ['solar', 'wind', 'storage']);
    expect(canUnlock(inteiro, 'smart-grid')).toEqual({ ok: true });
  });

  it('recusa a que já foi comprada, e o id que não existe', () => {
    expect(canUnlock(gameWith(9999, ['solar']), 'solar')).toEqual({
      ok: false,
      reason: 'alreadyUnlocked',
    });
    expect(canUnlock(gameWith(9999), 'fusao-a-frio')).toEqual({
      ok: false,
      reason: 'unknownSkill',
    });
  });

  it('pré-requisito é recusado antes de dinheiro', () => {
    // A ordem importa para a UI: um nó bloqueado por pré-requisito não pode
    // dizer ao jogador que falta PAC — ele juntaria dinheiro à toa.
    expect(canUnlock(gameWith(semPac), 'smart-grid')).toEqual({
      ok: false,
      reason: 'missingRequirement',
    });
  });
});

describe('unlockSkill', () => {
  it('cobra o custo exato e guarda o id', () => {
    const depois = unlockSkill(gameWith(100), 'solar');

    expect(depois.actionPoints).toBe(60);
    expect(depois.unlockedSkills).toEqual(['solar']);
    expect(isUnlocked(depois, 'solar')).toBe(true);
  });

  it('compras sucessivas drenam o PAC até travar', () => {
    // O custo cobrado uma vez é fácil de acertar por acidente. O que prova que
    // ele é cobrado *de verdade* é a terceira compra não acontecer.
    let state = gameWith(40 + 70);

    state = unlockSkill(state, 'solar');
    expect(state.actionPoints).toBe(70);

    state = unlockSkill(state, 'wind');
    expect(state.actionPoints).toBe(0);

    state = unlockSkill(state, 'storage');
    expect(state.unlockedSkills).toEqual(['solar', 'wind']);
  });

  it('não muta o estado recebido (§4: funções do engine são puras)', () => {
    const antes = gameWith(100);

    unlockSkill(antes, 'solar');

    expect(antes.actionPoints).toBe(100);
    expect(antes.unlockedSkills).toEqual([]);
    expect(antes.regions.na.support).toBe(50);
  });

  it('devolve o estado intacto quando a compra é impossível', () => {
    const pobre = gameWith(10);
    expect(unlockSkill(pobre, 'solar')).toBe(pobre);
    expect(unlockSkill(pobre, 'fusao-a-frio')).toBe(pobre);
    expect(unlockSkill(gameWith(9999), 'smart-grid')).toEqual(gameWith(9999));
  });

  it('destrava o nó seguinte do ramo', () => {
    const depois = unlockSkill(gameWith(200), 'solar');
    expect(canUnlock(depois, 'wind')).toEqual({ ok: true });
  });

  it('aplica apoio na hora, nas 8 regiões', () => {
    const depois = unlockSkill(gameWith(100), 'climate-education');

    for (const id of REGION_IDS) {
      expect(depois.regions[id].support).toBe(58);
    }
  });

  it('o apoio não passa de 100', () => {
    const quaseCheio = gameWith(100);
    const alto = {
      ...quaseCheio,
      regions: { ...quaseCheio.regions, na: { ...quaseCheio.regions.na, support: 97 } },
    };

    const depois = unlockSkill(alto, 'climate-education');

    expect(depois.regions.na.support).toBe(100);
    expect(depois.regions.eu.support).toBe(58);
  });

  it('a Inércia não fica abaixo de zero', () => {
    // treaties derruba 15 pontos e a Inércia começa em 0 — sem trava, iria a -15.
    const depois = unlockSkill(gameWith(200, ['climate-education']), 'treaties');
    expect(depois.inertia).toBe(0);

    const comInercia = { ...gameWith(200, ['climate-education']), inertia: 40 };
    expect(unlockSkill(comInercia, 'treaties').inertia).toBe(25);
  });

  it('emissionCut e pointsPerYear não mexem no estado no ato da compra', () => {
    // Eles são contínuos: quem os lê é o tick, todo mês, a partir da lista de
    // compras. Se aparecessem aqui também, o efeito contaria duas vezes.
    const antes = gameWith(100);
    const depois = unlockSkill(antes, 'solar');

    expect(depois.regions.ea.emissions).toBe(antes.regions.ea.emissions);
    expect(depois.regions.ea.support).toBe(antes.regions.ea.support);
    expect(depois.regions.ea.resilience).toBe(antes.regions.ea.resilience);
  });
});

describe('os efeitos contínuos', () => {
  it('sem habilidade nenhuma, o corte é zero e o PAC é o do balance.json', () => {
    const zerado = gameWith(0);

    expect(emissionCutFor(zerado, 'na')).toBe(0);
    expect(pointsPerYear(zerado)).toBe(balance.basePointsPerYear);
  });

  it('soma os cortes das habilidades compradas', () => {
    // solar corta 0,5% e wind 0,45% — o value é porcentagem, o retorno é fração.
    expect(emissionCutFor(gameWith(0, ['solar']), 'na')).toBeCloseTo(0.005, 10);
    expect(emissionCutFor(gameWith(0, ['solar', 'wind']), 'na')).toBeCloseTo(0.0095, 10);
  });

  it('a árvore inteira corta 5,5% ao ano, em todas as 8 regiões', () => {
    const tudo = gameWith(
      0,
      skills.map((skill) => skill.id),
    );

    for (const id of REGION_IDS) {
      expect(emissionCutFor(tudo, id)).toBeCloseTo(0.055, 10);
    }
  });

  it('o ramo Sociedade acrescenta PAC por ano', () => {
    expect(pointsPerYear(gameWith(0, ['climate-education']))).toBe(balance.basePointsPerYear + 2);
    expect(pointsPerYear(gameWith(0, ['climate-education', 'treaties']))).toBe(
      balance.basePointsPerYear + 5,
    );
  });

  it('id desconhecido na lista de compras é ignorado, não quebra', () => {
    // Save antigo (P6-07) com uma habilidade que não existe mais no skills.json.
    const comLixo = gameWith(0, ['solar', 'habilidade-que-sumiu']);

    expect(emissionCutFor(comLixo, 'na')).toBeCloseTo(0.005, 10);
    expect(pointsPerYear(comLixo)).toBe(balance.basePointsPerYear);
  });
});
