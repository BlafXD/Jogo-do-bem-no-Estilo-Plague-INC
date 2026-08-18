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
  { readonly kind: 'togglePause' } | { readonly kind: 'setSpeed'; readonly speed: Speed };

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

export function applyCommand(control: TimeControl, command: TimeCommand | null): TimeControl {
  if (command === null) return control;
  return command.kind === 'togglePause' ? togglePause(control) : setSpeed(control, command.speed);
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

  root.replaceChildren(pause, ...speeds);
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
