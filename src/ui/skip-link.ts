// O link de pulo (P8-04).
//
// **Por que ele existe, com o número medido.** Uma partida em curso tem 35
// paradas de tabulação, e 28 delas são um bloco só: as 8 regiões do mapa e os
// 20 nós da árvore. Sem um atalho, quem navega por teclado atravessa o mapa
// inteiro para alcançar a árvore, e a árvore inteira para alcançar qualquer
// coisa depois dela. A WCAG 2.4.1 (nível A) chama isso de bloco que precisa ser
// contornável, e o `docs/GDD.md §5` exige teclado em todo painel.
//
// **Ele não aparece até receber o foco.** É a primeira parada da página, então
// quem usa mouse nunca o vê e quem aperta Tab uma vez o encontra de cara. O
// esconderijo é o do `skip-link.css`, e não `display: none` nem
// `visibility: hidden` — os dois tirariam o link da ordem de tabulação, que é
// exatamente o que ele veio ocupar.
//
// **Por que um clique no `href` não basta.** Navegar para `#arvore` rola a
// página até a seção, mas o foco do teclado fica para trás: `<section>` não é
// focável, e o Tab seguinte recomeçaria do topo. Por isso o alvo recebe
// `tabindex="-1"` — focável por código, nunca por Tab — e o clique chama
// `focus()` nele.

import { ui } from '../data/i18n';

/** Um destino do salto: o elemento e o rótulo que o anuncia. */
type Target = {
  readonly target: HTMLElement;
  readonly label: string;
};

/**
 * Monta os links de pulo.
 *
 * Recebe os alvos em vez de procurá-los por seletor: quem sabe quais são os
 * blocos da página é o `main.ts`, que já os tem em mão, e um `querySelector`
 * aqui criaria uma segunda lista para discordar da primeira.
 */
export function mountSkipLink(root: Element, board: HTMLElement, tree: HTMLElement): void {
  root.setAttribute('aria-label', ui.skipLink.label);

  const targets: readonly Target[] = [
    { target: board, label: ui.skipLink.toContent },
    { target: tree, label: ui.skipLink.toTree },
  ];

  const links = targets.map(({ target, label }) => {
    // O alvo precisa ser focável por código para o salto levar o foco junto.
    // `-1` e não `0`: ele não pode virar uma parada de Tab a mais, senão o
    // link que economiza paradas passa a criar duas.
    target.tabIndex = -1;

    const link = document.createElement('a');
    link.className = 'pular__link';
    link.href = `#${target.id}`;
    link.textContent = label;

    link.addEventListener('click', (event) => {
      // `preventDefault` porque o pulo é feito aqui inteiro: deixar o navegador
      // também navegar para o fragmento acrescentaria `#arvore` à URL, e o
      // `vite.config.ts` registra que o jogo é página única sem rotas.
      event.preventDefault();
      target.focus();
      target.scrollIntoView({ block: 'start' });
    });

    return link;
  });

  root.replaceChildren(...links);
}
