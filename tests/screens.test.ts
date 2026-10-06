import { describe, expect, it } from 'vitest';

import {
  SCREENS,
  backToTitle,
  chooseCharacter,
  createScreens,
  currentScreen,
  reviewWorld,
  startGame,
  type ScreenState,
} from '../src/ui/screens';

/**
 * O roteador das quatro telas (P5-06; a quarta é do REF-08). Roda em node — ele
 * é uma função de perguntas em ordem e não precisa de DOM para ser cobrado.
 *
 * O que **não** está aqui está no tests/screens.dom.test.ts: quem some da tela e
 * quem sai da ordem de tabulação.
 */

const NO_TITULO = createScreens();
const ESCOLHENDO = chooseCharacter();
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

  it('só existem quatro telas, e o roteador não inventa uma quinta', () => {
    const todas = [NO_TITULO, ESCOLHENDO, JOGANDO, REVENDO].flatMap((s) => [
      currentScreen(s, false),
      currentScreen(s, true),
    ]);

    for (const tela of todas) expect(SCREENS).toContain(tela);
  });
});

describe('a escolha do especialista (REF-08)', () => {
  it('é a tela no ar depois de "Nova partida"', () => {
    expect(currentScreen(ESCOLHENDO, false)).toBe('select');
  });

  /**
   * A mesma regra do título: uma partida encerrada no save não aparece por
   * baixo da escolha. É o que o `currentScreen` garante perguntando pela
   * entrada antes de perguntar pelo fim.
   */
  it('não deixa a tela de fim aparecer por baixo dela', () => {
    expect(currentScreen(ESCOLHENDO, true)).toBe('select');
  });

  /**
   * Começar sai da escolha, e não a deixa armada esperando: um `entry` que
   * sobrevivesse faria o "Voltar ao título" do fim da partida cair na tela de
   * escolha em vez do título.
   */
  it('não sobrevive ao começo da partida', () => {
    expect(currentScreen(startGame(), false)).toBe('game');
    expect(startGame().entry).toBe('title');
  });

  it('o Esc e o "Voltar" devolvem ao título', () => {
    expect(currentScreen(backToTitle(), false)).toBe('title');
  });

  /** Escolher não começa a partida: é uma tela de entrada, não um atalho. */
  it('não vale como partida começada', () => {
    expect(ESCOLHENDO.started).toBe(false);
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

describe('backToTitle (P7-07)', () => {
  it('devolve ao título', () => {
    // Até aqui não havia caminho de volta — nem do fim, nem da partida —, e
    // entre um visitante e outro do estande alguém precisava apertar F5.
    expect(currentScreen(backToTitle(), false)).toBe('title');
    expect(currentScreen(backToTitle(), true)).toBe('title');
  });

  it('esquece o "Ver o mundo" da partida anterior', () => {
    // Um `reviewing` que sobrevivesse faria a próxima partida abrir no
    // tabuleiro em vez do resultado quando ela acabasse.
    const depoisDeRever = reviewWorld(startGame());

    expect(currentScreen(depoisDeRever, true)).toBe('game');
    expect(currentScreen(backToTitle(), true)).toBe('title');
  });

  it('é o mesmo estado de quem acabou de abrir a página', () => {
    expect(backToTitle()).toEqual(createScreens());
  });
});
