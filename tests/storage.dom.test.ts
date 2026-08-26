// @vitest-environment jsdom
//
// O `localStorage` só existe aqui porque o vite.config.ts dá uma URL ao jsdom:
// em `about:blank` a origem é opaca e o armazenamento não existe, que é a mesma
// regra do navegador de verdade.

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ui } from '../src/data/i18n';
import { SAVE_VERSION } from '../src/engine/save';
import { unlockSkill } from '../src/engine/skills';
import { createInitialState, type GameState } from '../src/engine/state';
import { advanceTick } from '../src/engine/tick';
import {
  afterReset,
  armReset,
  cancelReset,
  createSession,
  leaveNeedsConfirm,
  mountSession,
  renderSession,
} from '../src/ui/session';
import { clearGame, loadGame, saveGame, SAVE_KEY } from '../src/ui/storage';

/**
 * O que só existe com navegador: o `localStorage` de verdade e a barra da
 * partida. O formato do save está no tests/save.test.ts, que roda em node.
 */

function partidaEmAndamento(): GameState {
  let state: GameState = { ...createInitialState(7), actionPoints: 100 };
  for (let tick = 0; tick < 24; tick++) state = advanceTick(state);
  return unlockSkill(state, 'solar');
}

/**
 * Troca o armazenamento do documento e devolve como desfazer.
 *
 * Espionar `Storage.prototype` **não** funciona: o objeto do jsdom é um Proxy,
 * e a chamada não passa pelo espião — o teste da leitura que falha chegou a
 * passar assim, mas pelo motivo errado (a loja estava vazia, e `loadGame` já
 * devolveria null de qualquer jeito). Trocar o objeto inteiro é o que de fato
 * exercita o try/catch do storage.ts.
 */
function comArmazenamento(store: unknown): () => void {
  const original = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');

  Object.defineProperty(globalThis, 'localStorage', { value: store, configurable: true });

  return () => {
    if (original === undefined) delete (globalThis as { localStorage?: unknown }).localStorage;
    else Object.defineProperty(globalThis, 'localStorage', original);
  };
}

/** Um armazenamento que existe e falha em tudo — cota estourada, permissão negada. */
const quebrado = {
  getItem: () => {
    throw new Error('SecurityError');
  },
  setItem: () => {
    throw new Error('QuotaExceededError');
  },
  removeItem: () => {
    throw new Error('SecurityError');
  },
};

beforeEach(() => {
  localStorage.clear();
  document.body.replaceChildren();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('saveGame e loadGame', () => {
  it('a partida volta inteira depois de gravar e ler', () => {
    const antes = partidaEmAndamento();

    expect(saveGame(antes)).toBe(true);
    expect(loadGame()).toEqual(antes);
  });

  it('sem nada guardado, devolve null e avisa no console', () => {
    const aviso = vi.spyOn(console, 'warn').mockImplementation(() => {});

    expect(loadGame()).toBeNull();
    expect(aviso).toHaveBeenCalledOnce();
  });

  it('grava numa chave com o nome do jogo', () => {
    // Um `partida` solto colidiria com qualquer outro projeto servido do mesmo
    // localhost:5173 durante o desenvolvimento.
    saveGame(createInitialState(1));

    expect(localStorage.getItem(SAVE_KEY)).not.toBeNull();
    expect(SAVE_KEY).toContain('ponto-de-virada');
  });

  it('o que fica guardado é JSON com a versão do formato', () => {
    saveGame(createInitialState(1));

    const guardado: unknown = JSON.parse(localStorage.getItem(SAVE_KEY) ?? '');

    expect(guardado).toMatchObject({ version: SAVE_VERSION });
  });

  it('texto corrompido no armazenamento não derruba o jogo', () => {
    // O caso mais provável de todos: um save cortado pela metade, ou alguém
    // mexendo no DevTools. O jogo tem que abrir em 2025, não quebrar.
    const aviso = vi.spyOn(console, 'warn').mockImplementation(() => {});
    localStorage.setItem(SAVE_KEY, '{isso não é json');

    expect(loadGame()).toBeNull();
    expect(aviso).toHaveBeenCalledOnce();
  });

  it('save de outra versão é recusado sem explodir', () => {
    const aviso = vi.spyOn(console, 'warn').mockImplementation(() => {});
    localStorage.setItem(
      SAVE_KEY,
      JSON.stringify({ version: SAVE_VERSION + 1, state: createInitialState(1) }),
    );

    expect(loadGame()).toBeNull();
    expect(aviso).toHaveBeenCalledOnce();
  });

  it('quando o armazenamento recusa a escrita, o jogo continua', () => {
    // Cota estourada e navegação privada dão isso. `saveGame` devolve false; o
    // que não pode acontecer é a exceção subir e matar o laço de quadro.
    const restaurar = comArmazenamento(quebrado);

    try {
      expect(() => saveGame(createInitialState(1))).not.toThrow();
      expect(saveGame(createInitialState(1))).toBe(false);
    } finally {
      restaurar();
    }
  });

  it('quando a leitura falha, o jogo continua', () => {
    const aviso = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const restaurar = comArmazenamento(quebrado);

    try {
      expect(() => loadGame()).not.toThrow();
      expect(loadGame()).toBeNull();
      expect(aviso).toHaveBeenCalled();
    } finally {
      restaurar();
    }
  });

  it('quando o armazenamento nem existe, o jogo continua', () => {
    // É o cenário da build offline da feira (P8-05) aberta direto do disco, e o
    // da navegação privada em alguns navegadores: `localStorage` simplesmente
    // não está lá. O jogo tem que rodar, só sem lembrar de nada.
    const aviso = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const restaurar = comArmazenamento(undefined);

    try {
      expect(saveGame(createInitialState(1))).toBe(false);
      expect(loadGame()).toBeNull();
      expect(clearGame()).toBe(false);
      expect(aviso).toHaveBeenCalledOnce();
    } finally {
      restaurar();
    }
  });
});

describe('clearGame', () => {
  it('apaga a partida guardada', () => {
    const aviso = vi.spyOn(console, 'warn').mockImplementation(() => {});
    saveGame(partidaEmAndamento());

    expect(clearGame()).toBe(true);
    expect(localStorage.getItem(SAVE_KEY)).toBeNull();
    expect(loadGame()).toBeNull();
    expect(aviso).toHaveBeenCalledOnce();
  });

  it('não mexe em outras chaves do domínio', () => {
    localStorage.setItem('outra-coisa', 'valor');
    saveGame(createInitialState(1));

    clearGame();

    expect(localStorage.getItem('outra-coisa')).toBe('valor');
  });
});

describe('a barra da partida', () => {
  function montar(restoredYear: number | null = null) {
    const root = document.createElement('div');
    document.body.replaceChildren(root);

    const chamadas = { arm: 0, cancel: 0, reset: 0 };
    mountSession(root, {
      onArm: () => chamadas.arm++,
      onCancel: () => chamadas.cancel++,
      onReset: () => chamadas.reset++,
    });
    renderSession(root, createSession(restoredYear));

    return { root, chamadas };
  }

  const botao = (root: ParentNode, acao: string) =>
    root.querySelector<HTMLButtonElement>(`[data-session="${acao}"]`);

  const visivel = (root: ParentNode, acao: string) => botao(root, acao)?.hidden === false;

  const status = (root: ParentNode) =>
    root.querySelector(`[data-session="status"]`)?.textContent ?? '';

  it('em repouso mostra só o botão de reiniciar', () => {
    const { root } = montar();

    expect(visivel(root, 'arm')).toBe(true);
    expect(visivel(root, 'confirm')).toBe(false);
    expect(visivel(root, 'cancel')).toBe(false);
  });

  it('o reinício exige dois cliques — o primeiro só pede confirmação', () => {
    // É a única ação da tela que destrói a partida, e não tem desfazer.
    const { root, chamadas } = montar();

    botao(root, 'arm')?.click();

    expect(chamadas.arm).toBe(1);
    expect(chamadas.reset).toBe(0);

    renderSession(root, armReset(createSession(null)));

    expect(visivel(root, 'arm')).toBe(false);
    expect(visivel(root, 'confirm')).toBe(true);
    expect(visivel(root, 'cancel')).toBe(true);

    botao(root, 'confirm')?.click();

    expect(chamadas.reset).toBe(1);
  });

  it('cancelar volta ao repouso sem reiniciar nada', () => {
    const { root, chamadas } = montar();
    renderSession(root, armReset(createSession(null)));

    botao(root, 'cancel')?.click();

    expect(chamadas.cancel).toBe(1);
    expect(chamadas.reset).toBe(0);

    renderSession(root, cancelReset(armReset(createSession(null))));
    expect(visivel(root, 'arm')).toBe(true);
  });

  it('o aviso da saída é texto escrito, não só uma cor', () => {
    // O §5 proíbe comunicar estado só por cor, e o botão vermelho seria
    // exatamente isso. O rótulo diz o que vai acontecer, e a frase ao lado
    // repete o que se perde.
    const { root } = montar();
    renderSession(root, armReset(createSession(null, true)));

    expect(botao(root, 'confirm')?.textContent).toContain('descartar');
    expect(status(root)).toContain('não foi salva');
  });

  it('o botão da barra leva ao início, e o rótulo diz isso (P7-07)', () => {
    // Ele já se chamou "Reiniciar partida", quando de fato reiniciava ali
    // mesmo. Agora quem apaga é o "Nova partida" do título, e um rótulo que
    // prometesse reinício estaria mentindo.
    const { root } = montar();

    expect(botao(root, 'arm')?.textContent).toBe(ui.session.leave);
  });

  it('só o Modo Feira pede confirmação para sair (P7-07)', () => {
    // A confirmação segue o risco real: numa partida normal sair não destrói
    // nada, porque o jogo salva sozinho e o "Continuar" espera do outro lado.
    expect(leaveNeedsConfirm(createSession(2043))).toBe(false);
    expect(leaveNeedsConfirm(createSession(null, true))).toBe(true);
  });

  it('a barra declara o Modo Feira — não salvar é o que o jogador precisa saber', () => {
    // Quem não sabe que a partida não está sendo salva descobre do pior jeito
    // possível: quando ela some.
    const { root } = montar();
    renderSession(root, createSession(null, true));

    expect(status(root)).toBe(ui.session.fair);
  });

  it('diz se a partida foi retomada, e em que ano', () => {
    const { root } = montar(2043);

    expect(status(root)).toContain('2043');
  });

  it('numa partida nova, avisa que o jogo salva sozinho', () => {
    const { root } = montar();

    expect(status(root)).toContain('salva');
    expect(status(root)).not.toContain('retomada');
  });

  it('depois do reinício, para de dizer que a partida foi retomada', () => {
    // A partida na tela começou agora; continuar dizendo "retomada em 2043"
    // seria mentir sobre o que o jogador está vendo.
    const { root } = montar(2043);
    renderSession(root, afterReset());

    expect(status(root)).not.toContain('2043');
    expect(visivel(root, 'arm')).toBe(true);
  });

  it('a barra é feita de <button> de verdade', () => {
    const { root } = montar();

    for (const acao of ['arm', 'confirm', 'cancel']) {
      expect(botao(root, acao)?.tagName).toBe('BUTTON');
      expect(botao(root, acao)?.type).toBe('button');
    }
  });

  it('redesenhar não recria os botões: o foco sobrevive', () => {
    const { root } = montar();
    const arm = botao(root, 'arm');
    arm?.focus();

    renderSession(root, createSession(2050));

    expect(botao(root, 'arm')).toBe(arm);
    expect(document.activeElement).toBe(arm);
  });
});
