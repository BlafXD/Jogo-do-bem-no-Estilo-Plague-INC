// O tutorial (P7-08). São dois, e a diferença é de propósito.
//
// **O modo padrão ensina em 4 passos contextuais**, cada um ancorado na seção de
// que fala e disparado no instante em que o assunto vira acionável: a dica da
// árvore só aparece quando há PAC para comprar alguma coisa, a do evento quando
// um evento cai, a da Inércia quando ela age. Ninguém lê sobre contenção antes
// de ter o que conter.
//
// **O Modo Feira ensina num painel só, e mais raso.** Quem está de pé num
// estande tem cinco minutos e não lê o terceiro parágrafo. O painel diz as duas
// ações que existem — o tempo corre, o PAC compra —, some no primeiro clique e
// não volta. O mapa, os eventos e a Inércia se explicam acontecendo.
//
// **O que o tutorial deliberadamente não ensina:** o dilema do jogo. O
// docs/GDD.md §2.1 fecha dizendo que a mensagem do ODS 13 está "embutida na
// mecânica — não em um texto de tutorial", e é uma trava, não um conselho. Aqui
// só se ensina a **operar**: que tecla pausa, onde clicar para comprar. Escrever
// "quem só adapta perde no longo prazo" seria entregar de graça a descoberta que
// o jogo inteiro existe para provocar.
//
// Mesma divisão do resto da UI: o núcleo é puro e roda em node, e só as funções
// de baixo tocam no DOM.

import { ui } from '../data/i18n';

// ------------------------------------------------------------------ núcleo ---

/** A ordem é a ordem em que se aprende, e o `activeStep` a respeita. */
export const TUTORIAL_STEPS = ['time', 'tree', 'event', 'inertia'] as const;

export type TutorialStep = (typeof TUTORIAL_STEPS)[number];

/**
 * Qual tutorial está valendo.
 *
 * `off` cobre três situações que não têm nada a ver entre si e terminam no
 * mesmo lugar: o jogador pulou, o tutorial acabou, ou ele retomou um save — e
 * quem clica "Continuar de 2043" já sabe jogar.
 */
export type TutorialMode = 'steps' | 'panel' | 'off';

export type TutorialState = {
  readonly mode: TutorialMode;
  /** Passos já dispensados. Um passo visto não volta na mesma partida. */
  readonly done: readonly TutorialStep[];
};

/** Como a partida começou. É isto, e só isto, que decide qual tutorial roda. */
export type TutorialStart = 'new' | 'continue' | 'fair';

export function createTutorial(start: TutorialStart): TutorialState {
  const mode: TutorialMode = start === 'new' ? 'steps' : start === 'fair' ? 'panel' : 'off';
  return { mode, done: [] };
}

/**
 * O jogador dispensou o passo que estava na tela.
 *
 * Guardar o passo em vez de um índice é o que deixa o `activeStep` ser função
 * pura do estado do jogo: se um evento cair antes de o jogador ter PAC, a dica
 * do evento entra na frente da dica da árvore sem que nada precise ser
 * reordenado — e a da árvore ainda aparece depois, porque continua por dispensar.
 */
export function completeStep(tutorial: TutorialState, step: TutorialStep): TutorialState {
  if (tutorial.done.includes(step)) return tutorial;
  return { ...tutorial, done: [...tutorial.done, step] };
}

/** "Pular tutorial": mata o que resta de uma vez, nos dois modos. */
export function skipTutorial(tutorial: TutorialState): TutorialState {
  return { ...tutorial, mode: 'off' };
}

/** O painel do Modo Feira foi lido. */
export function dismissPanel(tutorial: TutorialState): TutorialState {
  return skipTutorial(tutorial);
}

/**
 * O que a partida já tem para ensinar.
 *
 * Vem de fora em vez de este módulo importar o engine: é a mesma regra do
 * screens.ts, que recebe um booleano de "acabou" em vez de perguntar ao
 * `outcomeOf`. Aqui a UI não sabe o que é PAC nem o que é Inércia — sabe que há
 * ou não há algo a dizer sobre cada assunto.
 */
export type TutorialCues = {
  /** O PAC já alcança algum nó comprável. */
  readonly canBuy: boolean;
  /** Há evento em cena. */
  readonly hasEvent: boolean;
  /** A Inércia já subiu o bastante para ter o que conter. */
  readonly inertiaActed: boolean;
};

const CUE: Readonly<Record<TutorialStep, (cues: TutorialCues) => boolean>> = {
  // O tempo corre desde o primeiro quadro; não há o que esperar.
  time: () => true,
  tree: (cues) => cues.canBuy,
  event: (cues) => cues.hasEvent,
  inertia: (cues) => cues.inertiaActed,
};

/**
 * O passo que está na tela agora, ou `null`.
 *
 * **Um de cada vez.** Dois balões abertos ao mesmo tempo em cantos diferentes
 * da página é o oposto de contextual — a pessoa não sabe qual ler primeiro, e o
 * segundo some antes de ela chegar nele.
 */
export function activeStep(tutorial: TutorialState, cues: TutorialCues): TutorialStep | null {
  if (tutorial.mode !== 'steps') return null;

  return TUTORIAL_STEPS.find((step) => !tutorial.done.includes(step) && CUE[step](cues)) ?? null;
}

// ------------------------------------------------------------------- vista ---

/** Onde cada passo mora. A chave é a seção da página a que ele se ancora. */
export type TutorialAnchor = 'controls' | 'tree' | 'events' | 'contain';

const ANCHOR: Readonly<Record<TutorialStep, TutorialAnchor>> = {
  time: 'controls',
  tree: 'tree',
  event: 'events',
  inertia: 'contain',
};

export type TutorialView = {
  readonly step: TutorialStep;
  readonly anchor: TutorialAnchor;
  readonly text: string;
};

export function tutorialView(tutorial: TutorialState, cues: TutorialCues): TutorialView | null {
  const step = activeStep(tutorial, cues);
  if (step === null) return null;

  return { step, anchor: ANCHOR[step], text: ui.tutorial.steps[step] };
}

/** O painel do Modo Feira está no ar? */
export function showsPanel(tutorial: TutorialState): boolean {
  return tutorial.mode === 'panel';
}

// --------------------------------------------------------------------- DOM ---

function button(className: string, slot: string, label: string, hint: string): HTMLButtonElement {
  const element = document.createElement('button');
  element.type = 'button';
  element.className = className;
  element.dataset.tutorial = slot;
  element.textContent = label;
  element.title = hint;
  return element;
}

/**
 * Monta o balão dos 4 passos, uma vez, e devolve-o desligado.
 *
 * **É um elemento só, que muda de lugar.** Criar um balão por seção deixaria
 * quatro elementos escondidos no DOM esperando a vez, três deles sempre inúteis
 * — e cada um com dois botões que precisariam sair da ordem de tabulação. Um
 * que se move é menos coisa para dar errado.
 */
export function mountTutorial(onNext: () => void, onSkip: () => void): HTMLElement {
  const callout = document.createElement('div');
  callout.className = 'tutorial';
  callout.dataset.tutorial = 'callout';
  callout.setAttribute('aria-label', ui.tutorial.label);
  // `polite` porque o balão aparece sozinho, no meio da partida: quem usa leitor
  // de tela precisa saber que aquilo entrou, sem ser atropelado no que estava
  // ouvindo.
  callout.setAttribute('aria-live', 'polite');

  const text = document.createElement('p');
  text.className = 'tutorial__text';
  text.dataset.tutorial = 'text';

  const next = button('tutorial__button', 'next', ui.tutorial.next, ui.tutorial.nextHint);
  next.addEventListener('click', onNext);

  const skip = button(
    'tutorial__button tutorial__button--quiet',
    'skip',
    ui.tutorial.skip,
    ui.tutorial.skipHint,
  );
  skip.addEventListener('click', onSkip);

  const actions = document.createElement('div');
  actions.className = 'tutorial__actions';
  actions.append(next, skip);

  callout.append(text, actions);
  return callout;
}

/**
 * Põe o balão na seção certa, ou tira-o da página.
 *
 * **Sai do DOM inteiro quando não há passo**, e não por `hidden`: ele carrega
 * dois botões, e um botão invisível mas focável é a armadilha que só quem navega
 * por teclado encontra — a mesma razão que o outcome.ts registra. Aqui dá para
 * remover de verdade porque nada mais depende de ele estar no lugar.
 */
export function renderTutorial(
  callout: HTMLElement,
  anchors: Readonly<Record<TutorialAnchor, Element>>,
  view: TutorialView | null,
): void {
  if (view === null) {
    callout.remove();
    return;
  }

  const text = callout.querySelector<HTMLElement>('[data-tutorial="text"]');
  if (text !== null) text.textContent = view.text;
  callout.dataset.step = view.step;

  const target = anchors[view.anchor];
  // `prepend` e não `append`: a dica explica a seção, então ela vem antes do que
  // explica. E mover um nó que já está no lugar certo é operação vazia, o que
  // deixa o render seguro de chamar a cada quadro.
  if (callout.parentElement !== target) target.prepend(callout);
}

/**
 * Monta o painel do Modo Feira, uma vez.
 *
 * Um bloco, duas frases, um botão. O `P7-08` do PLANO.md pedia "sem modal
 * gigante", e isto não é um: ele não trava nada, some no primeiro clique, e
 * **substitui** os 4 passos em vez de somar com eles.
 */
export function mountTutorialPanel(onStart: () => void): HTMLElement {
  const panel = document.createElement('section');
  panel.className = 'tutorial-panel';
  panel.dataset.tutorial = 'panel';
  panel.setAttribute('aria-label', ui.tutorial.label);

  const title = document.createElement('h2');
  title.className = 'tutorial-panel__title';
  title.textContent = ui.tutorial.fair.title;

  const lines = ui.tutorial.fair.lines.map((line) => {
    const p = document.createElement('p');
    p.className = 'tutorial-panel__line';
    p.textContent = line;
    return p;
  });

  const start = button(
    'tutorial__button tutorial__button--primary',
    'start',
    ui.tutorial.fair.start,
    ui.tutorial.fair.startHint,
  );
  start.addEventListener('click', onStart);

  const actions = document.createElement('div');
  actions.className = 'tutorial__actions';
  actions.append(start);

  panel.append(title, ...lines, actions);
  return panel;
}

/** Põe o painel no lugar, ou tira-o da página — mesma regra do balão. */
export function renderTutorialPanel(panel: HTMLElement, anchor: Element, visible: boolean): void {
  if (!visible) {
    panel.remove();
    return;
  }

  if (panel.parentElement !== anchor) anchor.prepend(panel);
}
