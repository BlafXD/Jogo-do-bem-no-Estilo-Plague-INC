// O que as duas janelas por cima da partida têm em comum (VIS-05, VIS-07): o
// painel da árvore e o cartão do evento crítico.
//
// **Uma janela modal de verdade pede duas coisas além de aparecer:** o resto da
// página fica `inert` — nem o mouse nem o Tab chegam lá —, e o Tab dá a volta
// dentro dela, em vez de escapar para a barra do navegador. O `<dialog>` nativo
// faria as duas sozinho, mas o jsdom dos testes não tem o `showModal`.
//
// **O `inert` tem um dono só: o main.ts.** As duas janelas podem estar abertas
// juntas (um evento crítico cai com a árvore aberta), e duas funções escrevendo
// o mesmo atributo nos mesmos blocos se apagariam uma à outra, um quadro por
// vez. Quem sabe o que está aberto é o main.ts, e é ele que chama o `setInert`.

/** O que pode receber foco dentro de uma janela, na ordem da página. */
const FOCUSABLE = 'button, a[href], [tabindex]:not([tabindex="-1"])';

function focusables(dialog: Element): HTMLElement[] {
  return [...dialog.querySelectorAll<HTMLElement>(FOCUSABLE)].filter(
    (element) => element.closest('[hidden]') === null,
  );
}

/**
 * Prende o Tab dentro da janela: do último vai para o primeiro, e do primeiro,
 * com Shift, para o último. Para ligar num `keydown` da janela.
 */
export function trapTab(dialog: HTMLElement, event: KeyboardEvent): void {
  if (event.key !== 'Tab') return;

  const all = focusables(dialog);
  const first = all[0];
  const last = all.at(-1);
  if (first === undefined || last === undefined) return;

  const active = document.activeElement;
  if (event.shiftKey && (active === first || !dialog.contains(active))) {
    event.preventDefault();
    last.focus();
  } else if (!event.shiftKey && active === last) {
    event.preventDefault();
    first.focus();
  }
}

/**
 * Liga ou desliga os blocos que ficam atrás de uma janela.
 *
 * O `inert` vai como atributo, e não como propriedade, porque o jsdom dos
 * testes não conhece a propriedade — e o atributo é o que o navegador honra.
 */
export function setInert(blocks: readonly HTMLElement[], on: boolean): void {
  for (const block of blocks) block.toggleAttribute('inert', on);
}

/**
 * Um elemento ainda pode receber o foco de volta: está na página, fora de
 * bloco escondido e fora de bloco `inert`.
 */
export function canRefocus(element: HTMLElement | null): element is HTMLElement {
  return (
    element !== null &&
    element.isConnected &&
    element !== document.body &&
    element.closest('[hidden], [inert]') === null
  );
}
