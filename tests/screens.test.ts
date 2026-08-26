import { describe, expect, it } from 'vitest';

import {
  SCREENS,
  createScreens,
  currentScreen,
  reviewWorld,
  startGame,
  type ScreenState,
} from '../src/ui/screens';

/**
 * O roteador das três telas (P5-06). Roda em node — ele é uma função de duas
 * perguntas e não precisa de DOM para ser cobrado.
 *
 * O que **não** está aqui está no tests/screens.dom.test.ts: quem some da tela e
 * quem sai da ordem de tabulação.
 */

const NO_TITULO = createScreens();
const JOGANDO = startGame();
const REVENDO = reviewWorld(startGame());

describe('a tela que está no ar', () => {
  it('começa no título', () => {
    expect(currentScreen(NO_TITULO, false)).toBe('title');
  });

  /**
   * O título vem antes de tudo, e é a primeira pergunta do `currentScreen`.
   * Um save de partida encerrada abre no título e não direto no fim — quem senta
   * no computador da feira precisa ver o jogo se apresentar primeiro.
   */
  it('fica no título mesmo com a partida encerrada no save', () => {
    expect(currentScreen(NO_TITULO, true)).toBe('title');
  });

  it('vai para a partida quando o jogador sai do título', () => {
    expect(currentScreen(JOGANDO, false)).toBe('game');
  });

  it('vai para o fim quando a partida acaba', () => {
    expect(currentScreen(JOGANDO, true)).toBe('end');
  });

  it('volta ao tabuleiro quando o jogador pede para rever', () => {
    expect(currentScreen(REVENDO, true)).toBe('game');
  });

  it('só existem três telas, e o roteador não inventa uma quarta', () => {
    const todas = [NO_TITULO, JOGANDO, REVENDO].flatMap((s) => [
      currentScreen(s, false),
      currentScreen(s, true),
    ]);

    for (const tela of todas) expect(SCREENS).toContain(tela);
  });
});

describe('rever o mundo', () => {
  /**
   * Rever não desfaz o fim: é só uma escolha de o que olhar. Se apagasse o
   * encerramento, a árvore voltaria a comprar e o `handleUnlock` do main.ts
   * seria a única coisa entre o jogador e uma partida ressuscitada.
   */
  it('não faz a partida voltar a valer', () => {
    expect(REVENDO.started).toBe(true);
    expect(currentScreen(REVENDO, false)).toBe('game');
    expect(currentScreen(REVENDO, true)).toBe('game');
  });

  it('não tem efeito antes de a partida acabar', () => {
    expect(currentScreen(reviewWorld(JOGANDO), false)).toBe('game');
  });
});

describe('sair do título', () => {
  /** Uma partida nova não herda o que o jogador estava olhando na anterior. */
  it('zera o "revendo" da partida anterior', () => {
    expect(startGame().reviewing).toBe(false);
  });
});

describe('as funções de estado', () => {
  it('não mutam o estado que recebem', () => {
    const antes: ScreenState = startGame();
    const copia = { ...antes };

    reviewWorld(antes);

    expect(antes).toEqual(copia);
  });
});
