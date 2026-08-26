import { describe, expect, it } from 'vitest';
import { ui } from '../src/data/i18n';
import {
  activeStep,
  completeStep,
  createTutorial,
  dismissPanel,
  showsPanel,
  skipTutorial,
  tutorialView,
  TUTORIAL_STEPS,
  type TutorialCues,
} from '../src/ui/tutorial';

/**
 * O núcleo dos dois tutoriais (P7-08). Roda em node: qual passo está na tela é
 * função pura do estado do tutorial mais o que a partida já tem para ensinar, e
 * nada disso precisa de navegador. O DOM está no tests/tutorial.dom.test.ts.
 */

/** Uma partida que ainda não tem nada além do tempo correndo. */
const nada: TutorialCues = { canBuy: false, hasEvent: false, inertiaActed: false };

const cues = (over: Partial<TutorialCues> = {}): TutorialCues => ({ ...nada, ...over });

describe('qual tutorial roda', () => {
  it('partida nova ensina em passos; retomada não ensina nada', () => {
    // Quem clica "Continuar de 2043" já sabe jogar.
    expect(activeStep(createTutorial('new'), nada)).toBe('time');
    expect(activeStep(createTutorial('continue'), nada)).toBeNull();
  });

  it('o Modo Feira usa o painel, e nunca os passos', () => {
    const feira = createTutorial('fair');

    expect(showsPanel(feira)).toBe(true);
    expect(activeStep(feira, cues({ canBuy: true, hasEvent: true }))).toBeNull();
  });

  it('só o Modo Feira mostra painel', () => {
    expect(showsPanel(createTutorial('new'))).toBe(false);
    expect(showsPanel(createTutorial('continue'))).toBe(false);
  });
});

describe('a ordem dos passos', () => {
  it('o tempo vem primeiro, e não espera nada acontecer', () => {
    // Ele é o único cuja pista é sempre verdadeira: o relógio já está correndo
    // quando a pessoa chega.
    expect(activeStep(createTutorial('new'), nada)).toBe('time');
  });

  it('um passo de cada vez, mesmo com três assuntos disponíveis', () => {
    // Dois balões abertos em cantos diferentes é o oposto de contextual.
    const tudo = cues({ canBuy: true, hasEvent: true, inertiaActed: true });

    expect(activeStep(createTutorial('new'), tudo)).toBe('time');
  });

  it('dispensado o tempo, o próximo é o que a partida já permite', () => {
    const depois = completeStep(createTutorial('new'), 'time');

    expect(activeStep(depois, nada)).toBeNull();
    expect(activeStep(depois, cues({ canBuy: true }))).toBe('tree');
  });

  it('um evento entra na frente da árvore se cair antes de haver PAC', () => {
    // É o que a lista de dispensados compra: nada é reordenado, e a dica da
    // árvore continua por vir porque continua por dispensar.
    const depois = completeStep(createTutorial('new'), 'time');

    expect(activeStep(depois, cues({ hasEvent: true }))).toBe('event');
    expect(activeStep(completeStep(depois, 'event'), cues({ canBuy: true }))).toBe('tree');
  });

  it('a contenção só é ensinada quando há o que conter', () => {
    const semTempo = completeStep(createTutorial('new'), 'time');

    expect(activeStep(semTempo, cues({ inertiaActed: false }))).toBeNull();
    expect(activeStep(semTempo, cues({ inertiaActed: true }))).toBe('inertia');
  });

  it('dispensados os quatro, acabou', () => {
    let tutorial = createTutorial('new');
    for (const step of TUTORIAL_STEPS) tutorial = completeStep(tutorial, step);

    expect(
      activeStep(tutorial, cues({ canBuy: true, hasEvent: true, inertiaActed: true })),
    ).toBeNull();
  });
});

describe('dispensar e pular', () => {
  it('dispensar o mesmo passo duas vezes não muda nada', () => {
    const uma = completeStep(createTutorial('new'), 'time');

    expect(completeStep(uma, 'time')).toBe(uma);
  });

  it('"Pular tutorial" mata o que resta de uma vez', () => {
    const pulado = skipTutorial(createTutorial('new'));

    expect(activeStep(pulado, cues({ canBuy: true, hasEvent: true }))).toBeNull();
  });

  it('pular vale também no Modo Feira', () => {
    expect(showsPanel(skipTutorial(createTutorial('fair')))).toBe(false);
  });

  it('ler o painel é o mesmo que encerrá-lo', () => {
    expect(showsPanel(dismissPanel(createTutorial('fair')))).toBe(false);
  });
});

describe('a vista', () => {
  it('leva o texto e a seção em que o balão pousa', () => {
    const view = tutorialView(createTutorial('new'), nada);

    expect(view?.step).toBe('time');
    expect(view?.anchor).toBe('controls');
    expect(view?.text).toBe(ui.tutorial.steps.time);
  });

  it('cada passo aponta para a seção de que fala', () => {
    let tutorial = createTutorial('new');
    const ancoras: string[] = [];

    for (const step of TUTORIAL_STEPS) {
      const view = tutorialView(
        tutorial,
        cues({ canBuy: true, hasEvent: true, inertiaActed: true }),
      );
      if (view !== null) ancoras.push(view.anchor);
      tutorial = completeStep(tutorial, step);
    }

    expect(ancoras).toEqual(['controls', 'tree', 'events', 'contain']);
  });

  it('ACEITE: nenhum texto do tutorial ensina o dilema do jogo', () => {
    // O §2.1 do GDD: a mensagem do ODS 13 está "embutida na mecânica — não em um
    // texto de tutorial". Este teste é a trava. As palavras abaixo são as do
    // próprio dilema; se alguma aparecer numa dica, alguém entregou de graça a
    // descoberta que o jogo existe para provocar.
    const proibidas = ['mitigar', 'adaptar', 'dilema', 'urgente', 'planeta', 'salvar'];
    const textos = [
      ...Object.values(ui.tutorial.steps),
      ui.tutorial.fair.title,
      ...ui.tutorial.fair.lines,
    ].join(' ');

    for (const palavra of proibidas) {
      expect(textos.toLowerCase(), palavra).not.toContain(palavra);
    }
  });

  it('ACEITE: o painel da feira é mais raso que os 4 passos', () => {
    // Quem está de pé num estande não lê o terceiro parágrafo.
    const painel = ui.tutorial.fair.lines.join(' ');
    const passos = Object.values(ui.tutorial.steps).join(' ');

    expect(ui.tutorial.fair.lines).toHaveLength(2);
    expect(painel.length).toBeLessThan(passos.length);
  });
});
