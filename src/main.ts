// Ponto de entrada da aplicação: monta o HUD, a barra de tempo, a barra da
// partida, o cartão de resultado e a árvore, retoma o save e roda o relógio.
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
import { contain } from './engine/inertia';
import { isFinished } from './engine/outcome';
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
import { containView, mountContain, renderContain } from './ui/contain';
import {
  eventCardsView,
  mountEventCards,
  newestCriticalTick,
  renderEventCards,
} from './ui/event-cards';
import { hudView, mountHud, renderHud } from './ui/hud';
import { mountOutcome, outcomeView, renderOutcome } from './ui/outcome';
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
import './ui/contain.css';
import './ui/controls.css';
import './ui/event-cards.css';
import './ui/hud.css';
import './ui/outcome.css';
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
const resultado = required('#resultado');
const eventos = required('#eventos');
const contencao = required('#contencao');
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

/**
 * O tick do evento crítico que já parou o relógio (P7-02).
 *
 * Começa no tick atual, e não em -1: os cartões que vieram dentro de um save já
 * estavam em cena quando o jogador fechou a aba, e retomar a partida não deve
 * parar o tempo de novo por causa deles.
 */
let pausedForTick = state.tick;

/**
 * O tempo parou por causa de um evento, e não porque alguém pediu.
 *
 * Separar as duas pausas paga em dois lugares: o aviso na tela só aparece na
 * primeira, e o reinício desfaz só a primeira.
 */
let autoPaused = false;

function handleCommand(command: TimeCommand | null): void {
  control = applyCommand(control, command);

  // O aviso sai da tela no instante em que o tempo volta a correr — por
  // qualquer caminho, inclusive a barra de espaço. Deixá-lo no ar depois disso
  // faria a tela afirmar que o jogo está parado enquanto ele anda.
  if (!control.paused) autoPaused = false;

  renderControls(controls, control);
  renderEvents();
}

/** Os cartões de evento e o aviso de auto-pausa. */
function renderEvents(): void {
  renderEventCards(eventos, eventCardsView(state, autoPaused));
}

/**
 * Para o relógio quando um evento crítico **novo** entra em cena (P7-02).
 *
 * A comparação é contra o tick do último crítico que já pausou, e não contra um
 * booleano de "tem crítico na tela": o cartão fica seis meses em cena, e um
 * booleano repausaria o jogo a cada mês desses — o jogador não conseguiria
 * voltar a jogar sem esperar o cartão vencer.
 *
 * **Limitação conhecida.** O relógio do P6-04 entrega até 12 ticks num quadro
 * quando a aba volta do segundo plano, e o cartão vive 6: um crítico que
 * apareça e vença dentro do mesmo lote não pausa nada, porque quando este
 * código roda ele já saiu de cena. Só acontece depois de ~18 s de aba parada, e
 * consertar exigiria o engine chamar de volta a UI a cada passo — o §3 não
 * deixa. Fica registrado no PROGRESSO.md.
 */
function checkAutoPause(): void {
  const newest = newestCriticalTick(state);
  if (newest === null || newest <= pausedForTick) return;

  pausedForTick = newest;
  autoPaused = true;
  handleCommand({ kind: 'pause' });
}

/** Redesenha tudo que depende do estado da partida. */
function renderGame(): void {
  renderHud(hud, hudView(state));
  renderTree(tree, treeView(state));
  renderOutcome(resultado, outcomeView(state));
  renderEvents();
  renderContain(contencao, containView(state));
  // A árvore e a contenção ficam apagadas depois do fim. O `data-finished` só
  // existe para o CSS: quem de fato recusa é o `handleUnlock` e o
  // `handleContain`.
  app.dataset.finished = String(isFinished(state));
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
  pausedForTick = state.tick;

  // Um reinício desfaz a **auto**-pausa, e só ela. A pausa que o jogador pediu
  // continua valendo — é a regra que o controls.ts registra, e ela não muda
  // aqui. A distinção importa porque o relógio parado por um evento que não
  // existe mais na partida nova faria o jogo parecer travado na largada, e
  // `autoPaused` é exatamente o que separa os dois casos.
  if (autoPaused) handleCommand({ kind: 'togglePause' });

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
  // Partida acabada não compra mais nada. A trava mora aqui, e não no
  // `unlockSkill`, porque o engine não deve precisar do `outcome.ts` para
  // responder uma pergunta de compra — o §2.7 fala de quando a partida termina,
  // não de quanto custa um nó. Com a árvore apagada e o cartão na tela, o
  // caminho até este clique é curto: basta a tecla Tab.
  if (isFinished(state)) return;

  const next = unlockSkill(state, id);
  if (next === state) return;

  state = next;
  renderGame();
  // Salva na hora, sem esperar o mês virar: a compra é a decisão que o jogador
  // mais lamentaria perder, e é justamente depois de clicar num nó caro que dá
  // vontade de fechar a aba.
  saveGame(state);
}

/**
 * A contenção da Inércia (P7-03).
 *
 * Mesmo padrão do `handleUnlock`, e pelo mesmo motivo: a UI manda conter e olha
 * o que voltou. Recusada, o `contain` devolve **o mesmo objeto** de estado, e a
 * comparação por identidade detecta isso sem redesenhar nada — é o que permite
 * ao botão bloqueado continuar clicável e focável.
 *
 * Salva na hora, como a compra: gastar PAC é a decisão que o jogador mais
 * lamentaria perder ao fechar a aba.
 */
function handleContain(): void {
  if (isFinished(state)) return;

  const next = contain(state);
  if (next === state) return;

  state = next;
  renderGame();
  saveGame(state);
}

mountHud(hud);
mountControls(controls, handleCommand);
mountEventCards(eventos);
mountContain(contencao, handleContain);
// O "Jogar de novo" do cartão vai direto ao reinício, sem os dois cliques que a
// barra da partida exige. Os dois passos de lá existem para proteger vinte
// minutos de jogo em curso; aqui não há mais partida para destruir.
mountOutcome(resultado, handleReset);
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
  // `isFinished` é perguntado pelo engine a cada passo do lote, não aqui uma
  // vez por quadro: uma chamada entrega até doze ticks quando a aba volta do
  // segundo plano, e sem isso a partida rodaria até nove meses depois do mês em
  // que acabou. O porquê está no advanceRealTime.
  //
  // O laço de quadro **não** para depois do fim — só deixa de avançar. É a
  // mesma razão de o engine ser chamado durante a pausa: um laço que se desliga
  // precisa ser religado no reinício, e um `previousFrame` velho entregaria o
  // intervalo inteiro de uma vez no primeiro quadro da partida nova.
  const step = advanceRealTime(
    state,
    clock,
    now - previousFrame,
    effectiveSpeed(control),
    isFinished,
  );

  previousFrame = now;
  state = step.state;
  clock = step.clock;

  // Redesenha só quando o mês vira. Sem isto seriam 60 escritas por segundo no
  // DOM para mostrar exatamente os mesmos textos.
  //
  // A árvore entra aqui junto com o HUD porque o PAC sobe a cada tick: é a
  // virada do mês que faz um nó sair de "PAC insuficiente" para "Disponível".
  if (state.tick !== shownTick) {
    // Antes do desenho: a auto-pausa muda o aviso que o `renderGame` escreve, e
    // deixá-la depois faria o cartão crítico aparecer um mês antes do texto que
    // explica por que o tempo parou.
    checkAutoPause();
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
