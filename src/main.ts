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

import { contain } from './engine/inertia';
import { isFinished } from './engine/outcome';
import { canUnlock, unlockSkill } from './engine/skills';
import { createInitialState, skills, type RegionId, type SkillId } from './engine/state';
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
import { focusRegion, mapView, mountMap, renderMap } from './ui/map';
import { mountOutcome, outcomeView, renderOutcome } from './ui/outcome';
import { mountRegionPanel, regionPanelView, renderRegionPanel } from './ui/region-panel';
import {
  createScreens,
  currentScreen,
  renderScreens,
  reviewWorld,
  backToTitle,
  startGame,
  type ScreenLayout,
} from './ui/screens';
import {
  afterReset,
  armReset,
  cancelReset,
  leaveNeedsConfirm,
  createSession,
  mountSession,
  renderSession,
} from './ui/session';
import { clearGame, loadGame, saveGame } from './ui/storage';
import {
  armNewGame,
  cancelNewGame,
  createTitle,
  mountTitle,
  renderTitle,
  titleView,
} from './ui/title';
import {
  completeStep,
  createTutorial,
  dismissPanel,
  mountTutorial,
  mountTutorialPanel,
  renderTutorial,
  renderTutorialPanel,
  showsPanel,
  skipTutorial,
  tutorialView,
  type TutorialAnchor,
  type TutorialCues,
} from './ui/tutorial';
import { mountTree, renderTree, treeView } from './ui/tree';
// O tema vem primeiro por leitura, não por necessidade: custom property é
// resolvida no valor computado, então um `:root` declarado por último valeria
// igual. Está no topo porque é o arquivo que manda nos outros, e quem abrir esta
// lista deve ver isso antes de ver as folhas dos módulos (P5-02).
import './ui/theme.css';
import './ui/contain.css';
import './ui/controls.css';
import './ui/event-cards.css';
import './ui/hud.css';
import './ui/map.css';
import './ui/outcome.css';
import './ui/region-panel.css';
import './ui/screens.css';
import './ui/session.css';
import './ui/timeline-chart.css';
import './ui/title.css';
import './ui/tree.css';
import './ui/tutorial.css';

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
const mapa = required('#mapa');
const regiao = required('#regiao');
const contencao = required('#contencao');
const tree = required('#arvore');
const telaTitulo = required<HTMLElement>('#tela-titulo');
const topo = required<HTMLElement>('.topo');
const tabuleiro = required<HTMLElement>('#tabuleiro');
const app = required<HTMLElement>('#app');

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

/**
 * A região escolhida no mapa (P5-01), ou nenhuma.
 *
 * **Não entra no GameState e não entra no save**, e isso é decisão, não
 * esquecimento: onde o jogador está olhando não muda o clima. Pô-la no estado
 * mudaria o contrato do §3 do GDD e o formato do save do P6-07 por um dado sem
 * consequência mecânica — e o `parseSave` passaria a ter que validar um campo
 * que, se viesse corrompido, não faria diferença nenhuma na partida.
 *
 * Pela mesma razão ela **sobrevive ao reinício**: é de quem assiste, não da
 * simulação — a mesma regra que o controls.ts registra sobre a velocidade e a
 * pausa.
 */
let selectedRegion: RegionId | null = null;

/**
 * Qual das três telas está no ar, e o que a leva de uma para a outra (P5-06).
 *
 * Como a região escolhida, isto é estado **da tela** e não entra no save: o
 * jogador que volta amanhã volta pelo título, e não no meio do tabuleiro. É
 * também o que faz o relógio ficar parado até alguém decidir jogar.
 */
let screens = createScreens();
let title = createTitle();

/**
 * O tutorial (P7-08).
 *
 * Como a região escolhida e o roteador de telas, é estado **da sessão** e não
 * entra no save: quem retomar amanhã retoma sabendo jogar. Começa desligado
 * porque a página abre no título — quem o liga é a entrada na partida, e é lá
 * que se decide qual dos dois roda.
 */
let tutorial = createTutorial('continue');

const layout: ScreenLayout = { title: telaTitulo, chrome: topo, board: tabuleiro };

/** As quatro seções em que o balão do tutorial pousa. */
const tutorialAnchors: Readonly<Record<TutorialAnchor, Element>> = {
  controls,
  tree,
  events: eventos,
  contain: contencao,
};

/**
 * O que a partida já tem para ensinar.
 *
 * O engine não sabe que existe tutorial, então quem traduz estado em pistas é
 * este arquivo — a mesma divisão do `isFinished` que o roteador de telas
 * recebe pronto.
 */
function tutorialCues(): TutorialCues {
  return {
    canBuy: skills.some((skill) => canUnlock(state, skill.id).ok),
    hasEvent: state.activeEvents.length > 0,
    // 1 é onde o botão de contenção deixa de recusar — abaixo disso não há o
    // que conter, e ensinar a conter o nada seria pior do que não ensinar.
    inertiaActed: state.inertia >= 1,
  };
}

/**
 * O ano da partida **guardada** — não o da partida em curso.
 *
 * Deixou de ser constante no P7-07. Enquanto só se entrava no título uma vez,
 * por carga de página, congelá-la na largada bastava; agora dá para voltar ao
 * título no meio do jogo, e um valor de dez minutos atrás faria o botão
 * "Continuar de 2031" abrir uma partida que já está em 2064.
 *
 * No Modo Feira ela **não anda**, porque nada é salvo — é o que faz a demo
 * deixar a partida de verdade intacta.
 */
let savedYear = restored === null ? null : restored.year;

/**
 * O Modo Feira está ligado (P7-07).
 *
 * **Não é modo do engine, é modo da sessão.** O docs/GDD.md §4 registra que o
 * ritmo de 1,5 s por mês foi escolhido para 4x cair em 5,6 min, "sem precisar
 * de um modo à parte com regras próprias" — então aqui não há regra nenhuma
 * diferente: é a mesma simulação, começada a 4x e não salva. Pôr um booleano
 * disto no GameState mudaria o contrato do §3 por uma decisão de quem assiste.
 */
let fairMode = false;

/**
 * Salva a partida, exceto no Modo Feira.
 *
 * Existe para o `fairMode` ser conferido **num lugar só**. Espalhar o `if` pelos
 * quatro pontos de escrita seria deixar quatro chances de esquecer um — e o
 * esquecido seria descoberto por um visitante do estande recebendo a partida do
 * visitante anterior.
 */
function persist(): void {
  if (fairMode) return;

  saveGame(state);
  savedYear = state.year;
}

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

/**
 * As duas telas que dependem da região escolhida: o mapa e o painel de detalhe.
 *
 * Andam sempre juntas, e por isso moram na mesma função — o mapa marcando uma
 * região enquanto o painel mostra outra seria o pior jeito de essa dupla
 * quebrar, porque nada erraria em voz alta.
 */
function renderSelection(): void {
  renderMap(mapa, mapView(state, selectedRegion));
  renderRegionPanel(regiao, regionPanelView(state, selectedRegion));
}

/**
 * Escolher uma região no mapa.
 *
 * Clicar de novo na região já escolhida desmarca. Sem isso não haveria caminho
 * de volta para "nenhuma", e o painel ficaria preso na última escolha até o fim
 * da partida.
 *
 * Redesenha só o mapa e o painel: a escolha não mexe em indicador, em árvore nem
 * em cartão, e chamar o `renderGame` aqui reescreveria a tela inteira a cada
 * clique numa forma.
 */
function handleSelect(id: RegionId): void {
  selectedRegion = selectedRegion === id ? null : id;
  renderSelection();
}

/**
 * Fechar o painel de detalhe — pelo botão ou pelo `Esc` do §5 do GDD.
 *
 * O foco volta para a forma que estava escolhida. Sem isso ele cairia no
 * `<body>` junto com o botão que sumiu, e quem navega por teclado teria que
 * atravessar o HUD, a barra de tempo e os cartões de evento de novo para voltar
 * ao mapa — que é onde a pessoa estava.
 */
function handleCloseRegion(): void {
  const closing = selectedRegion;
  if (closing === null) return;

  selectedRegion = null;
  renderSelection();
  focusRegion(mapa, closing);
}

/**
 * Sair do título para a partida (P5-06).
 *
 * `newGame` diz se é para descartar a partida guardada. O `handleReset` já
 * sabe apagar o save e zerar o relógio; aqui só se escolhe qual dos dois
 * caminhos.
 */
function handleStart(newGame: boolean): void {
  screens = startGame();
  title = cancelNewGame(title);
  // Quem clica "Continuar de 2043" já sabe jogar; quem começa do zero, não.
  tutorial = createTutorial(newGame ? 'new' : 'continue');

  if (newGame) {
    // O `handleReset` redesenha por conta própria, e já com o `screens`
    // trocado — por isso ele vem depois da troca de tela, e não antes.
    handleReset();
    return;
  }

  // Não há resto de tempo para descartar ao sair do título: o `previousFrame`
  // continuou andando a cada quadro, e o que o `advanceRealTime` recebeu o
  // tempo todo foi velocidade 0.
  renderGame();
}

/**
 * Entrar no Modo Feira (P7-07).
 *
 * Três coisas, e nenhuma delas é regra de jogo: partida nova, velocidade 4x, e
 * o `fairMode` que desliga a escrita no `localStorage`. O docs/GDD.md §4
 * registra que 4x entrega os ~5 min "sem precisar de um modo à parte com regras
 * próprias" — então a simulação aqui é a mesma de sempre.
 *
 * **A pausa é desfeita na entrada.** Uma demo que começa parada porque a pessoa
 * anterior apertou Espaço é uma tela morta num estande, e ninguém vai descobrir
 * por quê.
 */
function handleFair(): void {
  fairMode = true;
  screens = startGame();
  title = cancelNewGame(title);

  state = createInitialState(SEED);
  clock = createClock();
  session = createSession(null, true);
  shownTick = state.tick;
  pausedForTick = state.tick;
  autoPaused = false;

  tutorial = createTutorial('fair');

  // 4x já marcado, mas **parado**: o painel do P7-08 é lido com o mundo quieto,
  // e o botão dele é que solta o tempo. Sem isto a pessoa leria duas frases com
  // o ano subindo atrás delas.
  handleCommand({ kind: 'setSpeed', speed: 4 });
  handleCommand({ kind: 'pause' });

  renderGame();
  renderSessionBar();
}

/**
 * Voltar ao título sem recarregar a página (P7-07).
 *
 * **O estado em memória é recarregado do save**, e essa é a linha que faz o
 * Modo Feira cumprir a promessa dele: sem isto, o "Continuar" do título abriria
 * a demo que acabou de ser abandonada — uma partida que o jogador nunca salvou
 * e que sobrescreveria, na cabeça dele, a que ele tinha.
 *
 * O `persist` antes é o que evita perder o mês corrente de uma partida normal;
 * no Modo Feira ele não faz nada, que é o ponto.
 */
function handleBackToTitle(): void {
  persist();

  fairMode = false;
  screens = backToTitle();
  title = cancelNewGame(title);
  tutorial = createTutorial('continue');

  const saved = loadGame();
  state = saved ?? createInitialState(SEED);
  savedYear = saved === null ? null : saved.year;
  clock = createClock();
  session = createSession(savedYear);
  shownTick = state.tick;
  pausedForTick = state.tick;
  autoPaused = false;

  renderGame();
  renderSessionBar();
}

/** Voltar ao tabuleiro depois do fim, sem desfazer o fim. */
function handleReview(): void {
  screens = reviewWorld(screens);
  renderGame();
}

/**
 * Redesenha tudo que depende do estado da partida — e decide qual tela está
 * no ar (P5-06).
 *
 * O roteamento mora aqui, e não numa função à parte, porque a tela depende de
 * duas coisas que só este arquivo tem juntas: se o jogador saiu do título, e
 * se a partida acabou. Perguntá-las em lugares diferentes seria o jeito de a
 * tela de fim aparecer um mês depois do fim.
 */
function renderGame(): void {
  const screen = currentScreen(screens, isFinished(state));

  renderScreens(layout, screen);
  renderTitle(telaTitulo, titleView(savedYear, title));

  renderHud(hud, hudView(state));
  renderSelection();
  renderTree(tree, treeView(state));
  // No título o cartão de resultado não entra, nem quando o save é de uma
  // partida encerrada: quem senta na frente do computador da feira vê o jogo
  // se apresentar, e não o fim da partida de outra pessoa.
  renderOutcome(resultado, screen === 'title' ? null : outcomeView(state), screens.reviewing);
  renderEvents();
  renderContain(contencao, containView(state));

  // O tutorial depois das seções em que ele pousa: o balão é prependido no
  // container, e um render que o pusesse antes teria o `replaceChildren` do
  // vizinho arrancando-o no mesmo quadro.
  renderTutorialPanel(tutorialPanel, tabuleiro, screen === 'game' && showsPanel(tutorial));
  renderTutorial(
    tutorialCallout,
    tutorialAnchors,
    screen === 'game' ? tutorialView(tutorial, tutorialCues()) : null,
  );
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
  // No Modo Feira não há o que apagar — e apagar seria pior do que inútil:
  // "Jogar de novo" numa demo destruiria a partida de verdade do dono da
  // máquina, que é exatamente o que o modo promete não fazer.
  if (!fairMode) {
    clearGame();
    savedYear = null;
  }

  state = createInitialState(SEED);
  clock = createClock();
  session = fairMode ? createSession(null, true) : afterReset();
  // Uma partida nova é uma partida nova: no Modo Feira o painel volta, e fora
  // dele voltam os 4 passos. Quem já os dispensou vai dispensá-los de novo em
  // dois cliques, e quem chegou agora ao computador precisa deles.
  tutorial = createTutorial(fairMode ? 'fair' : 'new');
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
  persist();
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
  persist();
}

mountHud(hud);
mountControls(controls, handleCommand);
mountEventCards(eventos);
mountMap(mapa, mapView(state, selectedRegion), handleSelect);
mountRegionPanel(regiao, handleCloseRegion);
mountContain(contencao, handleContain);
// O "Jogar de novo" do cartão vai direto ao reinício, sem os dois cliques que a
// barra da partida exige. Os dois passos de lá existem para proteger vinte
// minutos de jogo em curso; aqui não há mais partida para destruir.
mountOutcome(resultado, handleReset, handleReview);
mountTitle(telaTitulo, {
  onContinue: () => {
    handleStart(false);
  },
  onNew: () => {
    // Sem save não há o que apagar, e "Começar" entra direto. Com save, o
    // primeiro clique só abre a pergunta — a regra dos dois cliques do
    // session.ts, que existe porque apagar a partida não tem desfazer.
    if (savedYear === null) {
      handleStart(true);
      return;
    }

    title = armNewGame(title);
    renderGame();
  },
  onConfirmNew: () => {
    handleStart(true);
  },
  onCancelNew: () => {
    title = cancelNewGame(title);
    renderGame();
  },
  onFair: handleFair,
});
mountSession(partida, {
  // Um clique só quando sair não destrói nada — que é toda partida normal, já
  // que ela é salva sozinha a cada mês e o "Continuar" espera do outro lado.
  // Os dois cliques ficam para o Modo Feira, que descarta.
  onArm: () => {
    if (!leaveNeedsConfirm(session)) {
      handleBackToTitle();
      return;
    }

    session = armReset(session);
    renderSessionBar();
  },
  onCancel: () => {
    session = cancelReset(session);
    renderSessionBar();
  },
  onReset: handleBackToTitle,
});
/**
 * Dispensa o passo que está na tela.
 *
 * Pergunta qual é em vez de guardar: o passo visível é função pura do estado do
 * jogo, e um índice guardado ficaria errado no instante em que um evento
 * entrasse na frente da dica da árvore.
 */
const tutorialCallout = mountTutorial(
  () => {
    const view = tutorialView(tutorial, tutorialCues());
    if (view !== null) tutorial = completeStep(tutorial, view.step);
    renderGame();
  },
  () => {
    tutorial = skipTutorial(tutorial);
    renderGame();
  },
);

/**
 * O painel do Modo Feira, e o clique que põe o mundo para andar.
 *
 * O tempo entra **parado** no Modo Feira (P7-07 o punha a correr direto), e é
 * este botão que o solta: a pessoa lê as duas frases com o mundo quieto e vê a
 * simulação começar quando ela manda. Um painel por cima de um jogo já em
 * movimento faria a leitura competir com o ano subindo atrás dela.
 */
const tutorialPanel = mountTutorialPanel(() => {
  tutorial = dismissPanel(tutorial);
  if (control.paused) handleCommand({ kind: 'togglePause' });
  renderGame();
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
    // A confirmação de reinício vem primeiro, e tem que vir: ela é a única coisa
    // da tela que segura uma decisão destrutiva esperando resposta. Fechar o
    // painel de detalhe por baixo dela deixaria a pergunta no ar.
    if (session.armed) {
      event.preventDefault();
      session = cancelReset(session);
      renderSessionBar();
      return;
    }

    // Depois dela, o painel de detalhe (P5-04).
    if (selectedRegion !== null) {
      event.preventDefault();
      handleCloseRegion();
    }

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
    // Velocidade 0 fora da tela de partida: no título o jogo ainda não
    // começou, e na tela de fim ele já acabou. O `advanceRealTime` continua
    // sendo chamado em todo quadro — é ele que mantém o `previousFrame`
    // fresco, e é por isso que sair do título não entrega de uma vez o tempo
    // que a pessoa passou lendo o pitch.
    currentScreen(screens, isFinished(state)) === 'game' ? effectiveSpeed(control) : 0,
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
    persist();
  }

  requestAnimationFrame(frame);
}

requestAnimationFrame(frame);
