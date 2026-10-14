// A prateleira de conquistas na tela (CONQ-02). A lista está no
// docs/GDD.md §2.8; quem decide quem ganhou é o src/engine/achievements.ts.
//
// Mesma divisão do resto da UI: `shelfView` é **puro** — entram os ids ganhos
// agora e os ids guardados, sai a prateleira inteira em texto — e só as funções
// de baixo tocam no DOM.
//
// **A prateleira mostra as seis, sempre**, e as não conquistadas ficam à vista
// com o nome e a condição legíveis. Não é descuido com o "spoiler": é o motivo
// de a tarefa existir. Uma conquista escondida não dá motivo para rejogar os
// cinco minutos do Modo Feira, porque ninguém persegue o que não sabe que
// existe — e o §2.8 diz que a prateleira serve justamente para mostrar ao
// visitante do estande que há mais de um jeito de jogar bem.
//
// **O que foi ganho agora aparece marcado**, e essa é a única parte que depende
// de *quando* se olha: na tela de fim o destaque é a notícia da partida que
// acabou de terminar. No painel do título (2ª entrega) não há nada fresco, e o
// mesmo `shelfView` devolve a mesma lista sem nenhuma marca.

import { ACHIEVEMENTS, describeAchievement, type AchievementId } from '../engine/achievements';
import { ui } from '../data/i18n';
import { prependIcon, writeLabel } from './icons';

// --------------------------------------------------------------- a view ---

export type ShelfEntry = {
  readonly id: AchievementId;
  readonly name: string;
  /** A condição em uma frase, com os números do balance.json já no lugar. */
  readonly description: string;
  /** Já conquistada alguma vez, nesta partida ou em outra. */
  readonly earned: boolean;
  /** Conquistada **nesta** partida, e não antes. Só a tela de fim usa. */
  readonly fresh: boolean;
  /** "Conquistada", "Nova" ou "Ainda não" — o rótulo que acompanha o estado. */
  readonly status: string;
};

export type ShelfView = {
  readonly entries: readonly ShelfEntry[];
  readonly earnedCount: number;
  readonly total: number;
  /** "3 de 6". */
  readonly tally: string;
};

/**
 * A prateleira, dados os ids ganhos nesta partida e os já guardados.
 *
 * A ordem é a do achievements.json, sempre — conquistadas e não conquistadas
 * misturadas, cada uma no seu lugar fixo. Empurrar as ganhas para cima faria a
 * prateleira se reorganizar sozinha entre uma partida e outra, e quem a
 * conhece de cor perderia a referência.
 *
 * **Um id guardado que a lista não conhece mais é ignorado**, e não some do
 * armazenamento: o jogo pode estar rodando numa aba velha enquanto o estande
 * tem a nova, e apagar o que não se entende perderia a conquista de alguém.
 */
export function shelfView(
  earnedNow: readonly AchievementId[],
  stored: readonly string[],
): ShelfView {
  const agora = new Set(earnedNow);
  const antes = new Set(stored);

  const entries = ACHIEVEMENTS.map((achievement): ShelfEntry => {
    const fresh = agora.has(achievement.id) && !antes.has(achievement.id);
    const earned = fresh || antes.has(achievement.id) || agora.has(achievement.id);

    return {
      id: achievement.id,
      name: achievement.name,
      description: describeAchievement(achievement),
      earned,
      fresh,
      status: fresh
        ? ui.achievements.fresh
        : earned
          ? ui.achievements.earned
          : ui.achievements.locked,
    };
  });

  const earnedCount = entries.filter((entry) => entry.earned).length;

  return {
    entries,
    earnedCount,
    total: entries.length,
    tally: ui.achievements.tally(earnedCount, entries.length),
  };
}

/**
 * O que precisa ser guardado depois desta partida: o que já havia mais o que
 * ela rendeu, sem repetição e sem perder id desconhecido.
 *
 * Devolve `null` quando nada mudou, e é o `main.ts` que decide não escrever —
 * uma partida que não rendeu conquista nenhuma não precisa tocar no
 * `localStorage`, e no estande são dezenas de partidas por hora.
 */
export function mergeAchievements(
  earnedNow: readonly AchievementId[],
  stored: readonly string[],
): readonly string[] | null {
  const novos = earnedNow.filter((id) => !stored.includes(id));
  if (novos.length === 0) return null;

  return [...stored, ...novos];
}

// ------------------------------------------------------------------ DOM ---

/**
 * Monta a lista vazia uma vez e devolve o `<ul>`.
 *
 * A mesma peça serve a tela de fim e o painel do título, e é por isso que ela
 * não traz título nem moldura: quem a põe na página decide o que vem em volta.
 * O `data-shelf` é o gancho dos testes e do CSS.
 */
export function mountShelf(className: string): HTMLUListElement {
  const list = document.createElement('ul');
  list.className = className;
  list.dataset.shelf = 'list';
  return list;
}

/**
 * Escreve a prateleira.
 *
 * Reconstrói a lista inteira a cada chamada. São seis itens e ela é desenhada
 * no fim da partida ou com o painel aberto, nunca a cada quadro de jogo — o
 * custo é nada, e em troca não existe item sobrando de um render anterior.
 *
 * **O estado nunca chega só pela cor** (§5 do GDD): cada item leva o ícone, o
 * nome e o rótulo escrito ("Nova", "Conquistada", "Ainda não"). O
 * `data-earned` existe para o CSS apagar o que falta, e é reforço.
 */
export function renderShelf(list: Element, view: ShelfView): void {
  list.replaceChildren(
    ...view.entries.map((entry) => {
      const item = document.createElement('li');
      item.className = 'shelf__item';
      item.dataset.earned = String(entry.earned);
      item.dataset.fresh = String(entry.fresh);
      item.dataset.achievement = entry.id;

      const name = document.createElement('p');
      name.className = 'shelf__name';
      writeLabel(name, entry.name);
      prependIcon(name, 'trophy', 'icon--shelf');

      const status = document.createElement('span');
      status.className = 'shelf__status';
      status.textContent = entry.status;
      name.append(status);

      const how = document.createElement('p');
      how.className = 'shelf__how';
      how.textContent = entry.description;

      item.append(name, how);
      return item;
    }),
  );
}
