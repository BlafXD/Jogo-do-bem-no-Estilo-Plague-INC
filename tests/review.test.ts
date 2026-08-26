import { describe, expect, it } from 'vitest';
import { timeline } from '../src/engine/history';
import { MEDAL_CEILING } from '../src/engine/outcome';
import {
  crossings,
  parseActions,
  purchasesByBranch,
  realWorldActions,
  suggestedActions,
  turningPoint,
  unboughtCount,
} from '../src/engine/review';
import {
  balance,
  createInitialState,
  skills,
  SKILL_BRANCHES,
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

describe('crossings', () => {
  /** Uma partida cuja curva de temperatura passa pelos anos pedidos. */
  function comTemperaturas(...temperatures: readonly number[]): GameState {
    const history: Snapshot[] = temperatures.map((value, index) => ({
      tick: index * balance.ticksPerYear,
      year: balance.startYear + index,
      temperature: value,
      emissions: 40,
      cumulativeCO2: index * 40,
      averageSupport: 50,
    }));

    return { ...createInitialState(1), history };
  }

  it('diz em que ano cada teto foi cruzado', () => {
    const partida = comTemperaturas(1.4, 1.6, 1.9, 2.1, 2.6);

    expect(crossings(partida).gold).toBe(balance.startYear + 1);
    expect(crossings(partida).silver).toBe(balance.startYear + 3);
    expect(crossings(partida).bronze).toBe(balance.startYear + 4);
  });

  it('devolve null para o teto que a partida nunca cruzou', () => {
    const partida = comTemperaturas(1.4, 1.6, 1.7);

    expect(crossings(partida).gold).not.toBeNull();
    expect(crossings(partida).silver).toBeNull();
    expect(crossings(partida).bronze).toBeNull();
  });

  it('parar exatamente no teto já é tê-lo perdido', () => {
    // Espelho do `<` estrito do medalFor: o §2.7 dá ouro a quem fica **abaixo**
    // de 1,5 °C. Se este teste inverter, o cartão dirá que o ouro foi perdido
    // numa partida que o ganhou.
    expect(crossings(comTemperaturas(1.4, MEDAL_CEILING.gold)).gold).toBe(balance.startYear + 1);
  });

  it('ACEITE: o ano do cruzamento não pode discordar do gráfico', () => {
    // Os dois leem a mesma linha do tempo, e é isso que este teste protege: se
    // um passar a interpolar entre os anos e o outro não, o texto apontaria um
    // ano e a curva cruzaria a tracejada em outro, na mesma tela.
    const partida = ateOFim(createInitialState(2025));
    const ano = crossings(partida).gold;
    const retrato = timeline(partida).find((ponto) => ponto.year === ano);

    expect(retrato?.temperature).toBeGreaterThanOrEqual(MEDAL_CEILING.gold);
  });
});

describe('as 3 ações do mundo real', () => {
  it('há exatamente uma ação por ramo, e nenhum campo em branco', () => {
    expect(realWorldActions).toHaveLength(SKILL_BRANCHES.length);
    for (const branch of SKILL_BRANCHES) {
      const action = realWorldActions.find((item) => item.branch === branch);
      expect(action?.name.trim()).toBeTruthy();
      expect(action?.description.trim()).toBeTruthy();
      expect(action?.fact.trim()).toBeTruthy();
    }
  });

  it('mostra três', () => {
    expect(suggestedActions(createInitialState(1))).toHaveLength(3);
  });

  it('escolhe os ramos que a partida deixou de lado', () => {
    // Quem cobriu Energia inteira não deve receber conselho sobre energia.
    const energia = skills.filter((skill) => skill.branch === 'energy').map((skill) => skill.id);
    const partida: GameState = { ...createInitialState(1), unlockedSkills: energia };

    expect(suggestedActions(partida).map((action) => action.branch)).not.toContain('energy');
  });

  it('sem compra nenhuma, o desempate é a ordem do §2.4 — não a do motor', () => {
    // A partida em que ninguém comprou nada é a mais comum de todas, e nela os
    // cinco ramos empatam em zero.
    expect(suggestedActions(createInitialState(1)).map((action) => action.branch)).toEqual(
      SKILL_BRANCHES.slice(0, 3),
    );
  });

  it('o parse recusa um actions.json que não fecha', () => {
    const valido = { branch: 'energy', name: 'a', description: 'b', fact: 'c' };

    expect(() => parseActions([{ ...valido, branch: 'nuclear' }])).toThrow(/ramo desconhecido/);
    expect(() => parseActions([valido, valido])).toThrow(/mais de uma vez/);
    expect(() => parseActions([{ ...valido, fact: '   ' }])).toThrow(/está sem fact/);
    expect(() => parseActions([valido])).toThrow(/falta a ação/);
  });
});

describe('purchasesByBranch e unboughtCount', () => {
  it('conta por ramo', () => {
    const partida: GameState = { ...createInitialState(1), unlockedSkills: ['solar', 'wind'] };

    expect(purchasesByBranch(partida).energy).toBe(2);
    expect(purchasesByBranch(partida).society).toBe(0);
  });

  it('o que sobrou na árvore é o total menos o comprado', () => {
    const partida: GameState = { ...createInitialState(1), unlockedSkills: ['solar'] };

    expect(unboughtCount(createInitialState(1))).toBe(skills.length);
    expect(unboughtCount(partida)).toBe(skills.length - 1);
  });
});
