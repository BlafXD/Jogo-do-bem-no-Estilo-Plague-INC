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
  badCharacter: 'o save cita um personagem que não existe.',
  badRegions: 'as regiões do save não fecham.',
  badSkills: 'o save cita uma habilidade que não existe mais na árvore.',
  badHistory: 'a linha do tempo do save está incompleta ou fora de ordem.',
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

/**
 * A preferência de som (P7-05).
 *
 * **Chave própria, e não um campo do save.** Mudo é do aparelho, não da
 * partida: quem silenciou o computador do estande quer que ele siga silencioso
 * na partida seguinte, e no Modo Feira — que não salva nada (P7-07) — a escolha
 * precisa sobreviver do mesmo jeito. Guardá-la no save também obrigaria a subir
 * o `SAVE_VERSION` por um dado que não muda uma vírgula do clima.
 */
export const MUTE_KEY = 'ponto-de-virada:mudo';

/** Guarda a preferência. Devolve se conseguiu — o som segue de qualquer jeito. */
export function saveMuted(muted: boolean): boolean {
  const store = storage();
  if (store === null) return false;

  try {
    store.setItem(MUTE_KEY, muted ? '1' : '0');
    return true;
  } catch {
    return false;
  }
}

/**
 * A preferência guardada. **Sem preferência é com som**, e não mudo: um jogo
 * calado por padrão faria o P7-05 inteiro parecer quebrado no estande.
 */
export function loadMuted(): boolean {
  const store = storage();
  if (store === null) return false;

  try {
    return store.getItem(MUTE_KEY) === '1';
  } catch {
    return false;
  }
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

/**
 * A prateleira de conquistas (CONQ-02).
 *
 * **Chave própria, e não um campo do save** — a mesma decisão do mudo, e pelo
 * mesmo motivo elevado ao quadrado: a prateleira é de quem joga, não da
 * partida. Ela precisa **sobreviver ao fim da partida**, que é justamente
 * quando o save é apagado, e precisa valer no Modo Feira, que não salva nada
 * (P7-07). Guardá-la no save a perderia nos dois casos.
 *
 * O `docs/GDD.md §2.8` manda: o que atravessa partidas é só o conjunto de ids
 * conquistados. Nada de data, nada de contagem, nada de qual partida rendeu o
 * quê — isso viraria um segundo save, com um segundo formato para versionar.
 */
export const ACHIEVEMENTS_KEY = 'ponto-de-virada:conquistas';

/**
 * Os ids já conquistados, em qualquer partida.
 *
 * **Lê com desconfiança, e nunca lança.** O conteúdo é texto que o jogador pode
 * ter editado à mão, e vem de versões futuras e passadas do jogo: qualquer
 * coisa que não seja uma lista de textos vira prateleira vazia, e um id que a
 * lista de conquistas não conhece mais é descartado em silêncio. A alternativa
 * — confiar — entregaria um troféu com nome em branco na tela de fim.
 *
 * A filtragem fica com quem chama, que é quem conhece a lista: este módulo é a
 * ponte com o `localStorage` e nada mais (a divisão do topo do arquivo).
 */
export function loadAchievements(): readonly string[] {
  const store = storage();
  if (store === null) return [];

  let text: string | null;
  try {
    text = store.getItem(ACHIEVEMENTS_KEY);
  } catch {
    return [];
  }

  if (text === null) return [];

  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    return [];
  }

  if (!Array.isArray(parsed)) return [];
  return parsed.filter((id): id is string => typeof id === 'string');
}

/**
 * Guarda a prateleira. Devolve se conseguiu — o jogo segue de qualquer jeito.
 *
 * Escreve a lista inteira, e não só o que entrou: ela é pequena, e uma escrita
 * que lê-modifica-grava em duas etapas é como duas abas abertas no estande se
 * sobrescrevem. Quem junta o novo com o velho é o `main.ts`, que tem os dois na
 * mão no mesmo instante.
 */
export function saveAchievements(ids: readonly string[]): boolean {
  const store = storage();
  if (store === null) return false;

  try {
    store.setItem(ACHIEVEMENTS_KEY, JSON.stringify([...ids]));
    return true;
  } catch {
    return false;
  }
}
