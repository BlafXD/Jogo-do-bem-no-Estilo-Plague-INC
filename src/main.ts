// Ponto de entrada da aplicação: monta o HUD, a barra de tempo e a árvore, e
// roda o relógio.
//
// Este arquivo é o **único motorista** do engine. Ele é quem finalmente chama o
// `advanceRealTime`, que estava escrito e testado desde o P6-04 e sem ninguém
// para chamá-lo — o laço de requestAnimationFrame sempre foi da UI, porque o
// engine não pode saber que existe uma tela (§3).
//
// O tempo corre a 1x desde a carga; pausa e velocidade entraram no P5-05.
//
// Repare que o `advanceRealTime` é chamado em **todo** quadro, inclusive em
// pausa — com velocidade 0. Não é descuido: é o que evita a armadilha de
// esquecer de atualizar o `previousFrame` enquanto parado, que faria o primeiro
// quadro depois da pausa entregar o intervalo inteiro de uma vez.

import { ui } from './data/i18n';
import { unlockSkill } from './engine/skills';
import { createInitialState, type SkillId } from './engine/state';
import { advanceRealTime, createClock } from './engine/tick';
import {
  applyCommand,
  commandForKey,
  createTimeControl,
  effectiveSpeed,
  mountControls,
  renderControls,
  type TimeCommand,
} from './ui/controls';
import { hudView, mountHud, renderHud } from './ui/hud';
import { mountTree, renderTree, treeView } from './ui/tree';
import './ui/controls.css';
import './ui/hud.css';
import './ui/tree.css';

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
const controls = required('#controles');
const tree = required('#arvore');
const app = required<HTMLElement>('#app');

required('#pendente').textContent = ui.app.pending;
// Herdado do SETUP-02: a prova, no DevTools, de que o módulo executou.
app.dataset.status = 'pronto';

let state = createInitialState(SEED);
let clock = createClock();
let control = createTimeControl();
let previousFrame = performance.now();
let shownTick = state.tick;

function handleCommand(command: TimeCommand | null): void {
  control = applyCommand(control, command);
  renderControls(controls, control);
}

/**
 * A compra de um nó da árvore.
 *
 * A UI não pergunta se pode: manda comprar e olha o que voltou. Quando a compra
 * é recusada, o `unlockSkill` devolve **o mesmo objeto** de estado, e é isso que
 * a comparação por identidade detecta — sem redesenhar nada. É o que permite ao
 * cartão bloqueado continuar clicável e focável (`aria-disabled`, não
 * `disabled`), sem que a tela precise repetir a regra do engine.
 */
function handleUnlock(id: SkillId): void {
  const next = unlockSkill(state, id);
  if (next === state) return;

  state = next;
  renderHud(hud, hudView(state));
  renderTree(tree, treeView(state));
}

mountHud(hud);
mountControls(controls, handleCommand);
mountTree(tree, treeView(state), handleUnlock);

renderHud(hud, hudView(state));
renderControls(controls, control);

document.addEventListener('keydown', (event) => {
  // Com o foco num botão, o navegador já transforma Espaço e Enter em clique.
  // Tratar a tecla aqui também alternaria a pausa duas vezes, e ela pareceria
  // não funcionar — que é o jeito mais irritante de um atalho quebrar.
  //
  // Com a árvore do P6-06 na tela isso passou a valer para 20 botões a mais, e
  // com uma consequência nova: quem acabou de clicar num nó e aperta Espaço
  // reclica o nó em vez de pausar. É inofensivo (o nó já é seu, o `unlockSkill`
  // devolve o estado intacto), mas é surpresa. Anotado no PROGRESSO.md.
  if (event.target instanceof HTMLButtonElement) return;

  const command = commandForKey(event.key);
  if (command === null) return;

  // A barra de espaço rola a página por padrão.
  event.preventDefault();
  handleCommand(command);
});

function frame(now: number): void {
  const step = advanceRealTime(state, clock, now - previousFrame, effectiveSpeed(control));

  previousFrame = now;
  state = step.state;
  clock = step.clock;

  // Redesenha só quando o mês vira. Sem isto seriam 60 escritas por segundo no
  // DOM para mostrar exatamente os mesmos textos.
  //
  // A árvore entra aqui junto com o HUD porque o PAC sobe a cada tick: é a
  // virada do mês que faz um nó sair de "PAC insuficiente" para "Disponível".
  if (state.tick !== shownTick) {
    renderHud(hud, hudView(state));
    renderTree(tree, treeView(state));
    shownTick = state.tick;
  }

  requestAnimationFrame(frame);
}

requestAnimationFrame(frame);
