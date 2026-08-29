// Controle de tempo: pausa e as velocidades 1x, 2x e 4x (P5-05).
//
// Mesma divisão do hud.ts, pelo mesmo motivo: o núcleo é puro e roda em node;
// só `mountControls` e `renderControls` tocam no DOM, e o `document` nunca
// aparece no topo do módulo.
//
// **O estado de tempo não mora no GameState.** O docs/GDD.md §3 não o inclui, e
// com razão: velocidade e pausa são de quem assiste à simulação, não da
// simulação. Um save (P6-07) que gravasse "estava em 4x" restauraria uma
// decisão de quem jogou, não um fato do mundo.

import { ui } from '../data/i18n';

export const SPEEDS = [1, 2, 4] as const;

export type Speed = (typeof SPEEDS)[number];

export type TimeControl = {
  readonly paused: boolean;
  readonly speed: Speed;
};

export function createTimeControl(): TimeControl {
  return { paused: false, speed: 1 };
}

export function togglePause(control: TimeControl): TimeControl {
  return { ...control, paused: !control.paused };
}

/**
 * Pausa, esteja como estiver. **Idempotente, e é o ponto.**
 *
 * A auto-pausa do P7-02 não pode usar o `togglePause`: chamado com o jogo já
 * parado, ele **despausaria** — um evento crítico caindo em cima de uma pausa
 * do jogador faria o tempo voltar a correr sem ninguém ter pedido, que é o
 * oposto exato do que a auto-pausa existe para fazer. É o tipo de bug que só
 * aparece na feira, com alguém que pausou para ler.
 */
export function pause(control: TimeControl): TimeControl {
  return control.paused ? control : { ...control, paused: true };
}

/** Trocar de velocidade não tira da pausa: são duas decisões separadas. */
export function setSpeed(control: TimeControl, speed: Speed): TimeControl {
  return { ...control, speed };
}

/**
 * O multiplicador que a UI entrega ao `advanceRealTime`.
 *
 * Zero em pausa, e é aí que está o ponto: o main.ts chama o engine em **todo**
 * quadro, inclusive parado. A alternativa — não chamar — obriga a lembrar de
 * atualizar o carimbo do quadro anterior mesmo assim; quem esquecer faz o
 * primeiro quadro depois da pausa entregar o intervalo inteiro de uma vez, e a
 * trava do P6-04 converte isso num ano de jogo saltado. Com zero,
 * `elapsed × 0` não acumula nada e o resto parcial do mês fica intacto.
 */
export function effectiveSpeed(control: TimeControl): number {
  return control.paused ? 0 : control.speed;
}

// ------------------------------------------------------------- atalhos ---

export type TimeCommand =
  | { readonly kind: 'togglePause' }
  | { readonly kind: 'pause' }
  | { readonly kind: 'setSpeed'; readonly speed: Speed };

function isSpeed(value: number): value is Speed {
  return (SPEEDS as readonly number[]).includes(value);
}

/**
 * Traduz uma tecla em comando, ou `null` se a tecla não é atalho.
 *
 * Fica aqui, e não no ouvinte de teclado do main.ts, para poder ser testada:
 * mapeamento de tecla é exatamente o tipo de coisa que se digita errado uma vez
 * e ninguém repara até alguém apertar a tecla.
 */
export function commandForKey(key: string): TimeCommand | null {
  // ' ' é o valor moderno; 'Spacebar' é o legado que ainda aparece por aí.
  if (key === ' ' || key === 'Spacebar') return { kind: 'togglePause' };

  const speed = Number(key);
  return key.trim() !== '' && isSpeed(speed) ? { kind: 'setSpeed', speed } : null;
}

/**
 * A tecla é uma das que o navegador já transforma em clique num botão em foco?
 *
 * **É a pergunta que separa a colisão de verdade da colisão imaginada** (P8-04).
 *
 * O ouvinte do main.ts sempre desistiu do atalho quando o foco estava num
 * `<button>`, e por um motivo correto: o navegador ativa o botão sozinho com a
 * barra de espaço, então tratar a tecla de novo alternaria a pausa duas vezes.
 * Só que a guarda desistia de **toda** tecla, e as teclas 1, 2 e 4 não ativam
 * botão nenhum — não havia colisão para evitar.
 *
 * Medido no navegador com uma partida em curso: das 35 paradas de tabulação, 27
 * são `<button>` (a árvore sozinha tem 20). Com o foco num nó da árvore, apertar
 * `2` não fazia nada; com o foco no corpo da página, mudava a velocidade. O
 * atalho existia em 8 das 35 paradas.
 *
 * `Enter` está na lista pelo mesmo motivo da barra de espaço, embora hoje ele
 * não seja atalho de nada: se um dia virar, a guarda já o cobre.
 */
export function activatesFocusedButton(key: string): boolean {
  return key === ' ' || key === 'Spacebar' || key === 'Enter';
}

/**
 * Aplica um comando, ou devolve o controle intacto quando não há comando.
 *
 * `switch` sobre a união discriminada, e não o ternário que estava aqui: com
 * três variantes o `tsc` passa a cobrar o caso que faltar. Se um quarto comando
 * entrar, este arquivo para de compilar em vez de deixar a tecla nova cair
 * silenciosamente no ramo errado.
 */
export function applyCommand(control: TimeControl, command: TimeCommand | null): TimeControl {
  if (command === null) return control;

  switch (command.kind) {
    case 'togglePause':
      return togglePause(control);
    case 'pause':
      return pause(control);
    case 'setSpeed':
      return setSpeed(control, command.speed);
  }
}

// ----------------------------------------------------------------- DOM ---

/**
 * Monta a barra de controle: um botão de pausa e um por velocidade.
 *
 * São `<button>` de verdade, e não `<div>` com clique: o §5 exige navegação por
 * teclado, e botão nativo já vem com foco, Enter, Espaço e papel de acessibi-
 * lidade sem uma linha de código.
 */
export function mountControls(root: Element, onCommand: (command: TimeCommand) => void): void {
  // `role="group"` junto do rótulo, e não o rótulo sozinho (P8-04). O
  // `#controles` é um `<div>`, e num `<div>` sem papel o `aria-label` é
  // **descartado**: a ARIA proíbe nomear o papel genérico, então o leitor de
  // tela não anuncia nada. Conferido na árvore de acessibilidade do Chrome, que
  // trazia `generic "Controle de tempo"` — nome escrito, papel que não o carrega.
  root.setAttribute('role', 'group');
  root.setAttribute('aria-label', ui.controls.label);

  const pause = document.createElement('button');
  pause.type = 'button';
  pause.className = 'ctl__button ctl__pause';
  pause.dataset.control = 'pause';
  pause.title = ui.controls.pauseHint;
  pause.addEventListener('click', () => onCommand({ kind: 'togglePause' }));

  const speeds = SPEEDS.map((speed) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'ctl__button';
    button.dataset.speed = String(speed);
    button.title = ui.controls.speedHint;

    // O marcador é forma, não cor: o §5 proíbe comunicar estado só por cor, e
    // ele fica sempre no DOM (só invisível) para o botão não mudar de largura.
    const marker = document.createElement('span');
    marker.className = 'ctl__marker';
    marker.setAttribute('aria-hidden', 'true');
    marker.textContent = '●';

    const label = document.createElement('span');
    label.textContent = `${speed}×`;

    button.append(marker, label);
    button.addEventListener('click', () => onCommand({ kind: 'setSpeed', speed }));
    return button;
  });

  // Os atalhos escritos na tela (P8-04). Até aqui eles só existiam no `title` de
  // cada botão — invisível para quem navega por teclado, que é exatamente quem
  // os usa — e no primeiro passo do tutorial, que aparece uma vez, some no
  // "Entendi" e não roda no Modo Feira.
  const shortcuts = document.createElement('p');
  shortcuts.className = 'ctl__shortcuts';
  shortcuts.textContent = ui.controls.shortcuts;

  root.replaceChildren(pause, ...speeds, shortcuts);
}

/** Reflete o estado atual nos botões. O rótulo da pausa é texto, não cor. */
export function renderControls(root: ParentNode, control: TimeControl): void {
  const pause = root.querySelector('[data-control="pause"]');

  if (pause !== null) {
    pause.textContent = control.paused ? ui.controls.resume : ui.controls.pause;
    pause.setAttribute('aria-pressed', String(control.paused));
  }

  for (const speed of SPEEDS) {
    const button = root.querySelector(`[data-speed="${speed}"]`);
    if (button === null) continue;

    // A velocidade escolhida continua marcada durante a pausa: ela é a escolha
    // do jogador, não uma afirmação de que o tempo está correndo.
    const chosen = control.speed === speed;
    button.setAttribute('aria-pressed', String(chosen));
    button.classList.toggle('is-active', chosen);
  }
}
