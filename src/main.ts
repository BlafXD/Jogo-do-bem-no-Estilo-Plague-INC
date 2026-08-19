// Ponto de entrada da aplicação: monta o HUD, a barra de tempo, a barra da
// partida e a árvore, retoma o save e roda o relógio.
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
import {
  afterReset,
  armReset,
  cancelReset,
  createSession,
  mountSession,
  renderSession,
} from './ui/session';
import { clearGame, loadGame, saveGame } from './ui/storage';
import { mountTree, renderTree, treeView } from './ui/tree';
import './ui/controls.css';
import './ui/hud.css';
import './ui/session.css';
import './ui/tree.css';

/**
 * Semente das partidas novas. Continua fixa: a mesma partida a cada reinício é
 * o que se quer enquanto se está desenvolvendo. Escolher semente é assunto da
 * tela de título (P5-06).
 *
 * Uma partida **retomada** não passa por aqui — ela traz a própria semente, que
 * é o que o docs/GDD.md §3 quer dizer com "identidade da partida".
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
const partida = required('#partida');
const tree = required('#arvore');
const app = required<HTMLElement>('#app');

required('#pendente').textContent = ui.app.pending;
// Herdado do SETUP-02: a prova, no DevTools, de que o módulo executou.
app.dataset.status = 'pronto';

// A partida guardada tem prioridade sobre uma nova. Quando não há save, ou
// quando ele é recusado, o `loadGame` devolve null e avisa no console — o jogo
// começa em 2025 e nunca deixa de abrir por causa de um save ruim (P6-07).
const restored = loadGame();

let state = restored ?? createInitialState(SEED);
let clock = createClock();
let control = createTimeControl();
let session = createSession(restored === null ? null : restored.year);
let previousFrame = performance.now();
let shownTick = state.tick;

function handleCommand(command: TimeCommand | null): void {
  control = applyCommand(control, command);
  renderControls(controls, control);
}

/** Redesenha tudo que depende do estado da partida. */
function renderGame(): void {
  renderHud(hud, hudView(state));
  renderTree(tree, treeView(state));
}

function renderSessionBar(): void {
  renderSession(partida, session);
}

/**
 * Reinício confirmado.
 *
 * Apaga o save **antes** de trocar o estado. Se a ordem fosse a outra e o
 * `clearGame` falhasse, o jogo mostraria uma partida nova com a antiga ainda no
 * disco, e o próximo recarregamento ressuscitaria o que o jogador mandou apagar.
 *
 * O relógio zera junto: o `leftoverMs` é o resto de mês da partida que acabou de
 * ser descartada, e carregá-lo para a partida nova faria o primeiro mês dela
 * chegar antes da hora.
 *
 * A velocidade e a pausa **não** zeram — o controls.ts registra que elas são de
 * quem assiste, não da simulação.
 */
function handleReset(): void {
  clearGame();

  state = createInitialState(SEED);
  clock = createClock();
  session = afterReset();
  shownTick = state.tick;

  renderGame();
  renderSessionBar();
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
  renderGame();
  // Salva na hora, sem esperar o mês virar: a compra é a decisão que o jogador
  // mais lamentaria perder, e é justamente depois de clicar num nó caro que dá
  // vontade de fechar a aba.
  saveGame(state);
}

mountHud(hud);
mountControls(controls, handleCommand);
mountSession(partida, {
  onArm: () => {
    session = armReset(session);
    renderSessionBar();
  },
  onCancel: () => {
    session = cancelReset(session);
    renderSessionBar();
  },
  onReset: handleReset,
});
mountTree(tree, treeView(state), handleUnlock);

renderGame();
renderControls(controls, control);
renderSessionBar();

document.addEventListener('keydown', (event) => {
  // `Esc` vem antes da guarda de botão, e tem que vir: depois de clicar em
  // "Reiniciar" o foco está justamente num botão, que é onde a guarda abaixo
  // desiste. O §5 do GDD diz que Esc sempre fecha, e a confirmação de reinício
  // é a primeira coisa da tela que precisa fechar.
  if (event.key === 'Escape') {
    if (!session.armed) return;

    event.preventDefault();
    session = cancelReset(session);
    renderSessionBar();
    return;
  }

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
    renderGame();
    shownTick = state.tick;
    // Salvar aqui, e não a cada quadro, sai de graça: é uma escrita por mês de
    // jogo — no máximo 1,3 por segundo a 4x — e limita a perda de um fechamento
    // de aba a um único mês. Salvar a cada quadro seriam 60 por segundo para
    // gravar o mesmo estado.
    saveGame(state);
  }

  requestAnimationFrame(frame);
}

requestAnimationFrame(frame);
