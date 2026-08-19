import { describe, expect, it } from 'vitest';
import { temperatureFor } from '../src/engine/climate';
import { fromSave, SAVE_VERSION, toSave } from '../src/engine/save';
import { unlockSkill } from '../src/engine/skills';
import { balance, createInitialState, type GameState } from '../src/engine/state';
import { advanceTick, yearForTick } from '../src/engine/tick';

/**
 * O formato do save é puro e roda em node. O `localStorage` fica no
 * tests/storage.dom.test.ts, que pede jsdom por arquivo.
 */

/** Uma partida com alguns anos rodados e uma habilidade comprada. */
function partidaEmAndamento(): GameState {
  let state: GameState = { ...createInitialState(7), actionPoints: 100 };
  for (let tick = 0; tick < 30; tick++) state = advanceTick(state);
  return unlockSkill(state, 'solar');
}

/** O JSON de ida e volta, que é o caminho real do save. */
function idaEVolta(state: GameState): GameState {
  const result = fromSave(JSON.parse(JSON.stringify(toSave(state))));
  if (!result.ok) throw new Error(`o save foi recusado: ${result.reason}`);
  return result.state;
}

describe('o formato do save', () => {
  it('a partida sobrevive à ida e volta pelo JSON', () => {
    const antes = partidaEmAndamento();

    expect(idaEVolta(antes)).toEqual(antes);
  });

  it('leva a semente E a posição do gerador — são coisas diferentes', () => {
    // O docs/GDD.md §3: sem o rngState separado, recarregar recomeçaria a
    // sequência de sorteios do zero e a partida deixaria de ser reprodutível.
    const antes: GameState = { ...partidaEmAndamento(), seed: 12345, rngState: 999 };
    const depois = idaEVolta(antes);

    expect(depois.seed).toBe(12345);
    expect(depois.rngState).toBe(999);
  });

  it('guarda as compras, e é delas que os efeitos contínuos voltam', () => {
    // O skills.ts não grava emissionCut nem pointsPerYear em lugar nenhum: eles
    // saem de unlockedSkills a cada tick. Se a lista voltar certa, os efeitos
    // voltam juntos — é a razão de o save ter um lugar só para errar.
    const depois = idaEVolta(partidaEmAndamento());

    expect(depois.unlockedSkills).toEqual(['solar']);
  });

  it('a partida retomada continua idêntica a uma que nunca parou', () => {
    let seguida = partidaEmAndamento();
    let retomada = idaEVolta(seguida);

    for (let tick = 0; tick < balance.ticksPerYear; tick++) {
      seguida = advanceTick(seguida);
      retomada = advanceTick(retomada);
    }

    expect(retomada).toEqual(seguida);
  });

  it('recusa um save de outra versão', () => {
    const envelope = { ...toSave(createInitialState(1)), version: SAVE_VERSION + 1 };

    expect(fromSave(envelope)).toEqual({ ok: false, reason: 'wrongVersion' });
  });

  it('recusa o que não é save nenhum', () => {
    for (const lixo of [null, undefined, 42, 'texto', [], { qualquer: 'coisa' }]) {
      expect(fromSave(lixo).ok).toBe(false);
    }
  });

  it('recusa número que não é número', () => {
    for (const campo of ['tick', 'actionPoints', 'cumulativeCO2', 'seed', 'rngState'] as const) {
      const envelope = toSave(createInitialState(1));
      const quebrado = {
        ...envelope,
        state: { ...envelope.state, [campo]: 'muito' },
      };

      expect(fromSave(quebrado)).toEqual({ ok: false, reason: 'badNumber' });
    }
  });

  it('recusa NaN e Infinity, que passam por typeof number', () => {
    // É o caso que um `typeof === "number"` sozinho deixaria entrar, e um NaN no
    // cumulativeCO2 contaminaria a temperatura de toda a partida daí em diante.
    const envelope = toSave(createInitialState(1));

    for (const valor of [NaN, Infinity]) {
      expect(fromSave({ ...envelope, state: { ...envelope.state, cumulativeCO2: valor } }).ok).toBe(
        false,
      );
    }
  });

  it('recusa um save com região faltando', () => {
    const envelope = toSave(createInitialState(1));
    const { af: _af, ...semAfrica } = envelope.state.regions;

    expect(fromSave({ ...envelope, state: { ...envelope.state, regions: semAfrica } })).toEqual({
      ok: false,
      reason: 'badRegions',
    });
  });

  it('recusa uma habilidade que não existe mais na árvore', () => {
    // O cenário real: o [D-Historia] renomeia um nó e alguém esquece de subir o
    // SAVE_VERSION. Recusar faz o jogador recomeçar; deixar passar o faria jogar
    // com o PAC gasto e sem a habilidade, sem nunca saber.
    const envelope = toSave(createInitialState(1));
    const quebrado = {
      ...envelope,
      state: { ...envelope.state, unlockedSkills: ['painel-solar'] },
    };

    expect(fromSave(quebrado)).toEqual({ ok: false, reason: 'badSkills' });
  });

  it('recusa compra repetida na lista', () => {
    const envelope = toSave(createInitialState(1));
    const quebrado = {
      ...envelope,
      state: { ...envelope.state, unlockedSkills: ['solar', 'solar'] },
    };

    // Duplicata significaria o efeito contínuo contado duas vezes: o
    // emissionCutFor soma por entrada da lista, não por habilidade distinta.
    expect(fromSave(quebrado)).toEqual({ ok: false, reason: 'badSkills' });
  });

  it('não confia no ano nem na temperatura: recalcula os dois', () => {
    // São derivados — o ano sai do tick, a temperatura sai do CO₂ acumulado.
    // Um save adulterado não consegue entregar um par que não combina.
    const envelope = toSave(partidaEmAndamento());
    const mentiroso = {
      ...envelope,
      state: { ...envelope.state, year: 2099, temperature: 42 },
    };

    const result = fromSave(mentiroso);
    if (!result.ok) throw new Error('deveria ter carregado');

    expect(result.state.year).toBe(yearForTick(result.state.tick));
    expect(result.state.temperature).toBe(temperatureFor(result.state.cumulativeCO2));
    expect(result.state.year).not.toBe(2099);
  });

  it('ACEITE: salvar no meio da partida e carregar devolve a mesma partida', () => {
    const antes = partidaEmAndamento();
    const depois = idaEVolta(antes);

    expect(depois.tick).toBe(antes.tick);
    expect(depois.actionPoints).toBe(antes.actionPoints);
    expect(depois.cumulativeCO2).toBe(antes.cumulativeCO2);
    expect(depois.unlockedSkills).toEqual(antes.unlockedSkills);
    expect(depois.regions).toEqual(antes.regions);
  });
});
