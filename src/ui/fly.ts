// Um rótulo curto "voando" de um elemento a outro, e sumindo (REF-02).
//
// Existe por causa da compra: o custo sai do botão de comprar e pousa no saldo
// de PAC, para o jogador **ver** o preço saindo do bolso. É só enfeite — não lê
// estado nem muda nada, e o número de verdade quem escreve é o renderTreePanel.
//
// Mora fora do engine pela regra de ouro do §3, mas é UI pura como o resto: não
// é importado por nenhum arquivo de engine.

/** Com movimento reduzido, nada voa (§5 do GDD / P8-04). */
const REDUCED = '(prefers-reduced-motion: reduce)';

/**
 * Solta um `text` que viaja do centro de `from` até o centro de `to` e some.
 *
 * Sai calado em três casos, e cada um tem razão: sem os dois elementos não há
 * trajeto; com movimento reduzido o §5 pede quieto; e quando o layout ainda não
 * tem medida — o jsdom dos testes, ou um elemento escondido — as caixas vêm
 * zeradas, e animar de lugar nenhum para lugar nenhum só criaria lixo no DOM.
 */
export function flyCost(from: Element | null, to: Element | null, text: string): void {
  if (from === null || to === null) return;
  if (typeof document === 'undefined' || typeof window === 'undefined') return;

  const media = typeof window.matchMedia === 'function' ? window.matchMedia(REDUCED) : null;
  if (media?.matches) return;

  const start = from.getBoundingClientRect();
  const end = to.getBoundingClientRect();
  if (start.width === 0 && start.height === 0) return;

  const startX = start.left + start.width / 2;
  const startY = start.top + start.height / 2;
  const dx = end.left + end.width / 2 - startX;
  const dy = end.top + end.height / 2 - startY;

  const ghost = document.createElement('span');
  ghost.className = 'fly-cost';
  ghost.setAttribute('aria-hidden', 'true');
  ghost.textContent = text;
  ghost.style.left = `${startX}px`;
  ghost.style.top = `${startY}px`;
  document.body.append(ghost);

  const remove = (): void => ghost.remove();

  // Um quadro para o navegador assumir a posição inicial antes de a transição
  // partir dela; sem a espera, ele iria direto para o destino, sem viagem.
  requestAnimationFrame(() => {
    ghost.style.transform = `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px)) scale(0.6)`;
    ghost.style.opacity = '0';
  });

  ghost.addEventListener('transitionend', remove);
  // Rede de segurança: numa aba em segundo plano a transição não dispara, e sem
  // isto o rótulo ficaria pendurado para sempre.
  window.setTimeout(remove, 1200);
}
