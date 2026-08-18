// Ponto de entrada da aplicação: monta o HUD e roda o relógio.
//
// Este arquivo é o **único motorista** do engine. Ele é quem finalmente chama o
// `advanceRealTime`, que estava escrito e testado desde o P6-04 e sem ninguém
// para chamá-lo — o laço de requestAnimationFrame sempre foi da UI, porque o
// engine não pode saber que existe uma tela (§3).
//
// Hoje o tempo corre a 1x desde a carga. Pausa e as velocidades 1x/2x/4x são o
// P5-05: o `speed` já é parâmetro do advanceRealTime, e pausar é simplesmente
// não chamar.

import { ui } from './data/i18n';
import { createInitialState } from './engine/state';
import { advanceRealTime, createClock } from './engine/tick';
import { hudView, mountHud, renderHud } from './ui/hud';
import './ui/hud.css';

/**
 * Semente fixa por enquanto: a mesma partida a cada recarga, o que é o que se
 * quer enquanto se está desenvolvendo. Escolher semente é assunto da tela de
 * título (P5-06) e do save (P6-07).
 */
const SEED = 2025;

/**
 * Busca um elemento que a página *precisa* ter, e explode com nome se faltar.
 *
 * Devolve o tipo já sem `null`, o que importa mais do que parece: sem isso o
 * `tsc` perde o estreitamento dentro do laço de quadro e obriga a espalhar
 * checagem de nulo em código que roda 60 vezes por segundo.
 */
function required<T extends Element>(selector: string): T {
  const element = document.querySelector<T>(selector);

  if (element === null) {
    throw new Error(`${selector} não encontrado — verifique o index.html.`);
  }

  return element;
}

const hud = required('#hud');
const app = required<HTMLElement>('#app');

app.textContent = ui.app.pending;
// Herdado do SETUP-02: a prova, no DevTools, de que o módulo executou.
app.dataset.status = 'pronto';

mountHud(hud);

let state = createInitialState(SEED);
let clock = createClock();
let previousFrame = performance.now();
let shownTick = state.tick;

renderHud(hud, hudView(state));

function frame(now: number): void {
  const step = advanceRealTime(state, clock, now - previousFrame);

  previousFrame = now;
  state = step.state;
  clock = step.clock;

  // Redesenha só quando o mês vira. Sem isto seriam 60 escritas por segundo no
  // DOM para mostrar exatamente os mesmos cinco textos.
  if (state.tick !== shownTick) {
    renderHud(hud, hudView(state));
    shownTick = state.tick;
  }

  requestAnimationFrame(frame);
}

requestAnimationFrame(frame);
