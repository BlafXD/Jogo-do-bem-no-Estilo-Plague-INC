// @vitest-environment jsdom
//
// O `localStorage` só existe aqui porque o vite.config.ts dá uma URL ao jsdom:
// em `about:blank` a origem é opaca e o armazenamento não existe, que é a mesma
// regra do navegador de verdade.

import { afterEach, describe, expect, it } from 'vitest';

import { ui } from '../src/data/i18n';
import { ACHIEVEMENTS } from '../src/engine/achievements';
import { balance, createInitialState, type GameState } from '../src/engine/state';
import { TOTAL_TICKS } from '../src/engine/tick';
import { mergeAchievements, mountShelf, renderShelf, shelfView } from '../src/ui/achievements';
import { mountOutcome, outcomeView, renderOutcome } from '../src/ui/outcome';
import { ACHIEVEMENTS_KEY, loadAchievements, saveAchievements } from '../src/ui/storage';

/**
 * A prateleira na tela (CONQ-02). A regra de quem ganha o quê está no
 * tests/achievements.test.ts, que roda em node; aqui é o que não existe sem
 * DOM — o bloco no cartão de fim — mais a ponte com o `localStorage`.
 */

const TOTAL = ACHIEVEMENTS.length;
const PRIMEIRA = ACHIEVEMENTS[0]?.id ?? '';
const SEGUNDA = ACHIEVEMENTS[1]?.id ?? '';

afterEach(() => {
  localStorage.clear();
});

// --------------------------------------------------------------- a view ---

describe('shelfView', () => {
  it('mostra as seis sempre, conquistadas ou não', () => {
    const view = shelfView([], []);

    expect(view.entries).toHaveLength(TOTAL);
    expect(view.earnedCount).toBe(0);
    expect(view.entries.every((entry) => !entry.earned)).toBe(true);
  });

  it('mantém a ordem do achievements.json, e não empurra as ganhas para cima', () => {
    const view = shelfView([SEGUNDA], []);

    expect(view.entries.map((entry) => entry.id)).toEqual(ACHIEVEMENTS.map((a) => a.id));
  });

  /** A diferença entre as duas listas é o que faz o "Nova" existir. */
  it('marca como nova só o que não estava guardado', () => {
    const view = shelfView([PRIMEIRA, SEGUNDA], [PRIMEIRA]);

    const primeira = view.entries.find((entry) => entry.id === PRIMEIRA);
    const segunda = view.entries.find((entry) => entry.id === SEGUNDA);

    expect(primeira?.earned).toBe(true);
    expect(primeira?.fresh).toBe(false);
    expect(primeira?.status).toBe(ui.achievements.earned);

    expect(segunda?.fresh).toBe(true);
    expect(segunda?.status).toBe(ui.achievements.fresh);
  });

  it('conta as guardadas mesmo quando a partida não rendeu nenhuma', () => {
    const view = shelfView([], [PRIMEIRA]);

    expect(view.earnedCount).toBe(1);
    expect(view.tally).toBe(ui.achievements.tally(1, TOTAL));
  });

  /**
   * Uma aba velha aberta no estande pode ter uma lista menor que a do
   * armazenamento. O id que ela não conhece é ignorado na tela — e não some do
   * disco, porque quem escreve é o merge, que o preserva.
   */
  it('ignora um id guardado que a lista não conhece', () => {
    const view = shelfView([], ['conquista-de-outra-versao']);

    expect(view.entries).toHaveLength(TOTAL);
    expect(view.earnedCount).toBe(0);
  });

  it('escreve a condição com o número do balance.json, não com a chave', () => {
    const view = shelfView([], []);

    for (const entry of view.entries) expect(entry.description).not.toMatch(/[{}]/);
    expect(view.entries.map((entry) => entry.description).join(' ')).toContain(
      String(balance.turningPointYear),
    );
  });
});

describe('mergeAchievements', () => {
  it('não devolve nada quando a partida não rendeu novidade', () => {
    expect(mergeAchievements([], [])).toBeNull();
    expect(mergeAchievements([PRIMEIRA], [PRIMEIRA])).toBeNull();
  });

  it('soma o que é novo sem repetir e sem reordenar o que já havia', () => {
    expect(mergeAchievements([PRIMEIRA, SEGUNDA], [SEGUNDA])).toEqual([SEGUNDA, PRIMEIRA]);
  });

  /** O id de outra versão fica onde está: apagá-lo perderia a conquista de alguém. */
  it('preserva um id guardado que a lista não conhece', () => {
    expect(mergeAchievements([PRIMEIRA], ['de-outra-versao'])).toEqual([
      'de-outra-versao',
      PRIMEIRA,
    ]);
  });
});

// ---------------------------------------------------------- o armazenamento ---

describe('a prateleira no localStorage', () => {
  it('guarda e devolve a lista, em chave própria', () => {
    expect(saveAchievements([PRIMEIRA])).toBe(true);
    expect(localStorage.getItem(ACHIEVEMENTS_KEY)).toBe(JSON.stringify([PRIMEIRA]));
    expect(loadAchievements()).toEqual([PRIMEIRA]);
  });

  it('sem nada guardado, é prateleira vazia e não erro', () => {
    expect(loadAchievements()).toEqual([]);
  });

  /**
   * O conteúdo é texto que o jogador pode ter editado à mão. Nenhuma das três
   * formas abaixo pode derrubar a tela de título.
   */
  it('devolve vazio para conteúdo que não é uma lista de textos', () => {
    localStorage.setItem(ACHIEVEMENTS_KEY, 'não é json');
    expect(loadAchievements()).toEqual([]);

    localStorage.setItem(ACHIEVEMENTS_KEY, '{"turning-point":true}');
    expect(loadAchievements()).toEqual([]);
  });

  it('descarta o que não é texto de dentro da lista', () => {
    localStorage.setItem(ACHIEVEMENTS_KEY, JSON.stringify([PRIMEIRA, 7, null, { a: 1 }]));
    expect(loadAchievements()).toEqual([PRIMEIRA]);
  });

  /** A chave é outra: apagar a partida não pode apagar a estante. */
  it('não é a mesma chave do save da partida', () => {
    expect(ACHIEVEMENTS_KEY).not.toBe('ponto-de-virada:partida');
  });
});

// -------------------------------------------------------------------- DOM ---

describe('a prateleira desenhada', () => {
  function lista(): HTMLElement {
    const root = document.createElement('div');
    document.body.replaceChildren(root);
    const list = mountShelf('shelf');
    root.append(list);
    return list;
  }

  it('desenha um item por conquista, com nome e condição', () => {
    const list = lista();
    renderShelf(list, shelfView([], []));

    const itens = [...list.querySelectorAll('.shelf__item')];
    expect(itens).toHaveLength(TOTAL);
    expect(itens[0]?.querySelector('.shelf__name')?.textContent).toContain(
      ACHIEVEMENTS[0]?.name ?? '',
    );
    expect(itens[0]?.querySelector('.shelf__how')?.textContent?.length ?? 0).toBeGreaterThan(0);
  });

  /**
   * O §5 do GDD proíbe comunicar estado só por cor. Rode a página em escala de
   * cinza e o estado continua escrito em cada item.
   */
  it('escreve o estado de cada item, além de marcá-lo no atributo', () => {
    const list = lista();
    renderShelf(list, shelfView([PRIMEIRA], []));

    const ganha = list.querySelector(`[data-achievement="${PRIMEIRA}"]`);
    expect(ganha?.getAttribute('data-earned')).toBe('true');
    expect(ganha?.querySelector('.shelf__status')?.textContent).toBe(ui.achievements.fresh);

    const faltando = list.querySelector(`[data-achievement="${SEGUNDA}"]`);
    expect(faltando?.getAttribute('data-earned')).toBe('false');
    expect(faltando?.querySelector('.shelf__status')?.textContent).toBe(ui.achievements.locked);
  });

  it('redesenhar substitui a lista, não a empilha', () => {
    const list = lista();
    for (let i = 0; i < 4; i++) renderShelf(list, shelfView([], []));

    expect(list.querySelectorAll('.shelf__item')).toHaveLength(TOTAL);
  });

  it('não põe nada focável dentro, que ficaria escondido durante a partida', () => {
    const list = lista();
    renderShelf(list, shelfView([], []));

    expect(list.querySelector('button, a[href], [tabindex]')).toBeNull();
  });
});

// ------------------------------------------------------- no cartão de fim ---

describe('a prateleira no cartão de fim', () => {
  const ended = (temperature: number): GameState => ({
    ...createInitialState(2025),
    tick: TOTAL_TICKS,
    year: balance.endYear,
    temperature,
  });

  function cartao(): HTMLElement {
    const root = document.createElement('section');
    document.body.replaceChildren(root);
    mountOutcome(root, () => {});
    return root;
  }

  it('entra no cartão com a contagem no cabeçalho', () => {
    const root = cartao();
    const view = outcomeView(ended(2.4), undefined, []);
    renderOutcome(root, view);

    expect(root.querySelectorAll('.shelf__item')).toHaveLength(TOTAL);
    expect(root.querySelector('[data-outcome="achievements-tally"]')?.textContent).toBe(
      view?.achievements.tally,
    );
  });

  /**
   * A partida de 2100 abaixo do limiar de derrota ganha "A agência de pé". Com
   * a prateleira vazia ela é nova; com ela já guardada, não é mais — e é esse
   * par que prova que o destaque não é decorativo.
   */
  it('marca como nova só o que não estava guardado antes da partida', () => {
    const state = ended(2.4);

    const zerada = outcomeView(state, undefined, []);
    const novas = zerada?.achievements.entries.filter((entry) => entry.fresh) ?? [];
    expect(novas.length).toBeGreaterThan(0);

    const jaTinha = outcomeView(
      state,
      undefined,
      novas.map((entry) => entry.id),
    );
    expect(jaTinha?.achievements.entries.filter((entry) => entry.fresh)).toHaveLength(0);
    expect(jaTinha?.achievements.earnedCount).toBe(zerada?.achievements.earnedCount);
  });

  it('o cartão esconde a prateleira junto com o resto durante a partida', () => {
    const root = cartao();
    renderOutcome(root, null);

    expect(root.hidden).toBe(true);
  });
});
