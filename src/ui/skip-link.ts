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
//
// **Desde o VIS-05 a árvore mora num painel fechado**, e o segundo link o abre
// em vez de rolar até ela. Os 20 nós só entram na ordem de tabulação com o
// painel aberto, então o bloco que o link contornava deixou de estar no
// caminho — mas abrir a árvore sem passar pelo mapa continua valendo o atalho.

import { ui } from '../data/i18n';

/**
 * Leva o foco e a rolagem até um bloco da página.
 *
 * O alvo precisa ser focável por código — o `mountSkipLink` já deu
 * `tabindex="-1"` a ele. O foco vai sem rolar e a rolagem vem depois, para as
 * duas não brigarem: `block: 'start'` põe o topo do bloco na tela.
 */
export function jumpTo(target: HTMLElement): void {
  target.focus({ preventScroll: true });
  target.scrollIntoView({ block: 'start' });
}

/**
 * Monta os links de pulo.
 *
 * Recebe os alvos em vez de procurá-los por seletor: quem sabe quais são os
 * blocos da página é o `main.ts`, que já os tem em mão, e um `querySelector`
 * aqui criaria uma segunda lista para discordar da primeira.
 *
 * `tree` é o id do painel da árvore, e `onOpenTree` o abre — é o mesmo caminho
 * do botão da barra de baixo, que leva o foco para dentro do painel.
 */
export function mountSkipLink(
  root: Element,
  board: HTMLElement,
  tree: HTMLElement,
  onOpenTree: () => void,
): void {
  root.setAttribute('aria-label', ui.skipLink.label);

  // O tabuleiro precisa ser focável por código para o salto levar o foco junto.
  // `-1` e não `0`: ele não pode virar uma parada de Tab a mais, senão o link
  // que economiza paradas passa a criar duas.
  board.tabIndex = -1;

  const links = [
    link(board, ui.skipLink.toContent, () => jumpTo(board)),
    link(tree, ui.skipLink.toTree, onOpenTree),
  ];

  root.replaceChildren(...links);
}

function link(target: HTMLElement, label: string, onFollow: () => void): HTMLAnchorElement {
  const anchor = document.createElement('a');
  anchor.className = 'pular__link';
  anchor.href = `#${target.id}`;
  anchor.textContent = label;

  anchor.addEventListener('click', (event) => {
    // `preventDefault` porque o pulo é feito aqui inteiro: deixar o navegador
    // também navegar para o fragmento acrescentaria `#tabuleiro` à URL, e o
    // `vite.config.ts` registra que o jogo é página única sem rotas.
    event.preventDefault();
    onFollow();
  });

  return anchor;
}
