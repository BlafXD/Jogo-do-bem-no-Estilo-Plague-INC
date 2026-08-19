// A ponte entre a partida e o `localStorage` (P6-07).
//
// Fino de propósito: o formato, a versão e a validação moram no
// src/engine/save.ts, que é puro. Aqui só se lê e se escreve uma string — é a
// mesma divisão do hud.ts, e o `localStorage` nunca aparece no topo do módulo,
// só dentro do corpo das funções.
//
// **Nada aqui pode lançar.** `localStorage` falha em situações comuns e nada
// exóticas: navegação privada em alguns navegadores, cota estourada, cookies
// bloqueados, e o `file://` de um build aberto direto do disco — que é
// exatamente o cenário do P8-05, a build offline da feira. Um jogo que quebra
// na carga porque não conseguiu salvar seria o pior desfecho possível para uma
// tarefa cujo objetivo é não perder progresso.

import { fromSave, toSave, type SaveRefusal } from '../engine/save';
import type { GameState } from '../engine/state';

/** A chave é do jogo e leva o nome dele — outro projeto no mesmo domínio não colide. */
export const SAVE_KEY = 'ponto-de-virada:partida';

/**
 * Mensagens de diagnóstico, não texto de interface.
 *
 * Ficam aqui e não no i18n.ts de propósito: a regra 8 fala de texto que o
 * **jogador** lê, e nada disto chega à tela. Quem lê é quem abrir o console
 * para entender por que a partida não voltou.
 */
const REFUSAL_MESSAGES: Readonly<Record<SaveRefusal, string>> = {
  noSave: 'não havia partida salva.',
  unreadable: 'o armazenamento não respondeu ou o conteúdo não é JSON.',
  wrongVersion: 'o save é de outra versão do jogo.',
  wrongShape: 'o save não tem o formato esperado.',
  badNumber: 'o save tem um número inválido.',
  badRegions: 'as regiões do save não fecham.',
  badSkills: 'o save cita uma habilidade que não existe mais na árvore.',
};

/**
 * O `localStorage`, ou `null` quando não dá para usá-lo.
 *
 * Duas defesas, e as duas são casos reais. O acesso à propriedade **lança**
 * quando cookies estão bloqueados, por isso o try/catch envolve a leitura e não
 * só as chamadas. E ele vem **indefinido** num documento de origem opaca — que
 * é o `about:blank`, e é também o que acontece ao abrir a build da feira
 * (P8-05) direto do disco em alguns navegadores.
 */
function storage(): Storage | null {
  try {
    return window.localStorage ?? null;
  } catch {
    return null;
  }
}

/** Guarda a partida. Devolve se conseguiu — o jogo segue de qualquer jeito. */
export function saveGame(state: GameState): boolean {
  const store = storage();
  if (store === null) return false;

  try {
    store.setItem(SAVE_KEY, JSON.stringify(toSave(state)));
    return true;
  } catch {
    // Cota estourada é o caso realista. Não vale insistir nem limpar nada: a
    // partida na memória continua válida, só não sobrevive a um recarregamento.
    return false;
  }
}

/**
 * Recupera a partida guardada, ou `null` se não deu.
 *
 * O aviso no console é o único rastro de uma recusa. É deliberado: contar ao
 * jogador que "o save era da versão errada" não lhe dá nada para fazer, e a
 * tela já mostra uma partida em 2025, que é a informação que importa.
 */
export function loadGame(): GameState | null {
  const store = storage();
  if (store === null) return refuse('unreadable');

  let text: string | null;
  try {
    text = store.getItem(SAVE_KEY);
  } catch {
    return refuse('unreadable');
  }

  if (text === null) return refuse('noSave');

  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    return refuse('unreadable');
  }

  const result = fromSave(parsed);
  return result.ok ? result.state : refuse(result.reason);
}

function refuse(reason: SaveRefusal): null {
  // `warn` é canal de erro de verdade, e o eslint.config.js o libera; o que a
  // regra 6 proíbe é `console.log` de depuração esquecido.
  console.warn(`Partida não retomada: ${REFUSAL_MESSAGES[reason]}`);
  return null;
}

/** Apaga a partida guardada. É o que o botão de reiniciar chama. */
export function clearGame(): boolean {
  const store = storage();
  if (store === null) return false;

  try {
    store.removeItem(SAVE_KEY);
    return true;
  } catch {
    return false;
  }
}
