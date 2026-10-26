// O pop-up de efeito ao comprar um nó — "estilo Plague Inc", pedido no chat em
// 2026-10-26. Mostra o que acabou de entrar na partida: o nome do nó e o
// efeito dele, que já está escrito no detalhe (skills.json), sem frase nova.
//
// Ao contrário do fly.ts, o conteúdo aqui **é** a informação, não só enfeite —
// por isso ele aparece igual com `prefers-reduced-motion`; só a entrada e a
// saída deslizando se desligam (§5 / P8-04, ver toast.css).
//
// Mora fora do engine pela regra de ouro do §3, como o resto da UI.

const VISIBLE_MS = 4200;
const LEAVE_MS = 400;

let stack: HTMLElement | null = null;

/**
 * O recipiente onde os avisos se empilham, criado na primeira vez que algum
 * aviso aparece — como os `ghost` do fly.ts, sem precisar de um lugar
 * reservado no index.html.
 */
function ensureStack(): HTMLElement {
  if (stack !== null && document.body.contains(stack)) return stack;

  stack = document.createElement('div');
  stack.className = 'toast-stack';
  // `polite`: o pop-up aparece sozinho, enquanto o jogador pode estar lendo
  // outra coisa — mesma regra do balão do tutorial.
  stack.setAttribute('aria-live', 'polite');
  document.body.append(stack);
  return stack;
}

/** Mostra um aviso com `title` e `text`, que some sozinho em alguns segundos. */
export function showToast(title: string, text: string): void {
  if (typeof document === 'undefined') return;

  const root = ensureStack();
  const toast = document.createElement('div');
  toast.className = 'toast';

  const heading = document.createElement('p');
  heading.className = 'toast__title';
  heading.textContent = title;

  const body = document.createElement('p');
  body.className = 'toast__text';
  body.textContent = text;

  toast.append(heading, body);
  root.append(toast);

  const remove = (): void => toast.remove();

  window.setTimeout(() => {
    toast.classList.add('toast--leaving');
    window.setTimeout(remove, LEAVE_MS);
  }, VISIBLE_MS);
}
