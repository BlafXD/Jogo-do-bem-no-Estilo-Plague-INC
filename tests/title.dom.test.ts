// @vitest-environment jsdom

import { describe, expect, it, vi } from 'vitest';

import { ui } from '../src/data/i18n';
import {
  armNewGame,
  cancelNewGame,
  createTitle,
  mountTitle,
  renderTitle,
  titleView,
  type TitleHandlers,
  type TitleState,
} from '../src/ui/title';

/**
 * A tela de título (P5-06).
 *
 * O núcleo é pequeno o bastante para não render um arquivo em node só para ele,
 * então as duas metades ficam aqui: o `titleView` puro e o DOM.
 */

function handlers(over: Partial<TitleHandlers> = {}): TitleHandlers {
  return {
    onContinue: vi.fn(),
    onNew: vi.fn(),
    onConfirmNew: vi.fn(),
    onCancelNew: vi.fn(),
    ...over,
  };
}

function mount(h: TitleHandlers = handlers()): HTMLElement {
  const root = document.createElement('section');
  // O nome vem do index.html, e o mount tem que preservá-lo.
  const nome = document.createElement('h1');
  nome.className = 'title__name';
  nome.textContent = 'Ponto de Virada';
  root.append(nome);

  document.body.replaceChildren(root);
  mountTitle(root, h);
  return root;
}

function show(root: HTMLElement, savedYear: number | null, state = createTitle()): HTMLElement {
  renderTitle(root, titleView(savedYear, state));
  return root;
}

function part(root: ParentNode, name: string): HTMLElement {
  const found = root.querySelector<HTMLElement>(`[data-title="${name}"]`);
  if (found === null) throw new Error(`a tela de título não tem ${name}`);
  return found;
}

describe('o titleView', () => {
  it('sem save, oferece começar e não oferece continuar', () => {
    const view = titleView(null, createTitle());

    expect(view.canContinue).toBe(false);
    expect(view.continueLabel).toBe('');
    expect(view.newLabel).toBe(ui.title.start);
  });

  it('com save, oferece continuar do ano guardado', () => {
    const view = titleView(2056, createTitle());

    expect(view.canContinue).toBe(true);
    expect(view.continueLabel).toBe(ui.title.continueGame('2056'));
    expect(view.continueLabel).toContain('2056');
    expect(view.newLabel).toBe(ui.title.newGame);
  });

  /**
   * O rótulo muda porque a ação muda: sem save, começar não destrói nada; com
   * save, "Nova partida" apaga vinte minutos de jogo. Chamar as duas de
   * "Começar" esconderia justamente a diferença que importa.
   */
  it('troca o rótulo conforme haja ou não o que apagar', () => {
    expect(titleView(null, createTitle()).newLabel).not.toBe(
      titleView(2056, createTitle()).newLabel,
    );
  });

  it('avisa o que se perde, e só quando há o que perder', () => {
    expect(titleView(2056, createTitle()).warning).toBe(ui.title.warning);
    expect(titleView(null, createTitle()).warning).toBe('');
  });

  /**
   * A pergunta dos dois cliques não pode sobreviver ao save sumir: ficaria no ar
   * oferecendo apagar uma partida que não existe mais.
   */
  it('não deixa a confirmação no ar quando não há save', () => {
    const armado: TitleState = armNewGame(createTitle());

    expect(titleView(2056, armado).armed).toBe(true);
    expect(titleView(null, armado).armed).toBe(false);
  });
});

describe('a tela montada', () => {
  it('tem rótulo acessível', () => {
    expect(mount().getAttribute('aria-label')).toBe(ui.title.label);
  });

  it('preserva o nome do jogo que veio do index.html', () => {
    expect(mount().querySelector('.title__name')?.textContent).toBe('Ponto de Virada');
  });

  it('monta duas vezes sem perder o nome', () => {
    const root = mount();
    mountTitle(root, handlers());

    expect(root.querySelectorAll('.title__name')).toHaveLength(1);
  });

  it('escreve o pitch do GDD, uma linha por parágrafo', () => {
    const linhas = [...mount().querySelectorAll('.title__line')].map((p) => p.textContent);

    expect(linhas).toEqual([...ui.title.pitch]);
  });

  it('usa botões de verdade, com dica em cada um', () => {
    const root = show(mount(), 2056);

    for (const name of ['continue', 'new']) {
      expect(part(root, name).tagName, name).toBe('BUTTON');
      expect((part(root, name) as HTMLButtonElement).type, name).toBe('button');
      expect(part(root, name).title.length, name).toBeGreaterThan(0);
    }
  });
});

describe('sem partida salva', () => {
  it('esconde "Continuar" em vez de apagá-lo', () => {
    const root = show(mount(), null);

    // `hidden`, e não `disabled`: sem save, continuar não é uma ação
    // indisponível, é uma ação que não existe — e um botão apagado faria a
    // pessoa procurar como destravá-lo.
    expect(part(root, 'continue').hidden).toBe(true);
    expect(part(root, 'continue').hasAttribute('disabled')).toBe(false);
  });

  it('começa no primeiro clique, sem perguntar nada', () => {
    const onNew = vi.fn();
    const root = show(mount(handlers({ onNew })), null);

    expect(part(root, 'confirm-box').hidden).toBe(true);
    part(root, 'new').click();
    expect(onNew).toHaveBeenCalledOnce();
  });
});

describe('com partida salva', () => {
  it('mostra os dois caminhos', () => {
    const root = show(mount(), 2056);

    expect(part(root, 'continue').hidden).toBe(false);
    expect(part(root, 'continue').textContent).toBe(ui.title.continueGame('2056'));
    expect(part(root, 'new').hidden).toBe(false);
  });

  it('continua a partida ao clicar', () => {
    const onContinue = vi.fn();
    show(mount(handlers({ onContinue })), 2056);
    part(document.body, 'continue').click();

    expect(onContinue).toHaveBeenCalledOnce();
  });

  /**
   * A regra dos dois cliques do session.ts: apagar a partida é a única ação da
   * tela que destrói vinte minutos de jogo, e não tem desfazer.
   */
  it('pede confirmação antes de apagar, e o botão diz o que vai fazer', () => {
    const root = show(mount(), 2056, armNewGame(createTitle()));

    expect(part(root, 'confirm-box').hidden).toBe(false);
    expect(part(root, 'confirm').textContent).toBe(ui.title.confirmNew);
    expect(part(root, 'confirm').textContent).not.toBe('Sim');
    expect(part(root, 'warning').textContent).toBe(ui.title.warning);
  });

  it('tira o botão que abriu a pergunta enquanto ela está no ar', () => {
    const root = show(mount(), 2056, armNewGame(createTitle()));

    // Dois caminhos para a mesma coisa, um deles sem aviso, seria o jeito de a
    // confirmação não servir para nada.
    expect(part(root, 'new').hidden).toBe(true);
  });

  it('confirma e cancela pelos dois botões', () => {
    const onConfirmNew = vi.fn();
    const onCancelNew = vi.fn();
    const root = show(
      mount(handlers({ onConfirmNew, onCancelNew })),
      2056,
      armNewGame(createTitle()),
    );

    part(root, 'confirm').click();
    part(root, 'cancel').click();

    expect(onConfirmNew).toHaveBeenCalledOnce();
    expect(onCancelNew).toHaveBeenCalledOnce();
  });

  it('fecha a pergunta ao cancelar', () => {
    const root = show(mount(), 2056, cancelNewGame(armNewGame(createTitle())));

    expect(part(root, 'confirm-box').hidden).toBe(true);
    expect(part(root, 'new').hidden).toBe(false);
  });

  /**
   * A confirmação fechada leva dois botões dentro, um deles destrutivo. Se
   * saísse da tela por uma classe de CSS em vez de `hidden`, continuaria
   * alcançável por Tab — e "Apagar e recomeçar" é o pior botão do jogo para se
   * chegar sem querer.
   *
   * A pergunta é sobre os ancestrais, e não `focus()`: o jsdom deixa focar um
   * botão dentro de um bloco escondido. O porquê está no tests/screens.dom.test.ts.
   */
  it('tira os botões da confirmação da ordem de tabulação quando ela fecha', () => {
    const root = show(mount(), 2056);

    for (const name of ['confirm', 'cancel']) {
      expect(part(root, name).closest('[hidden]'), name).not.toBeNull();
    }
  });

  it('devolve os botões da confirmação à tabulação quando ela abre', () => {
    const root = show(mount(), 2056, armNewGame(createTitle()));

    for (const name of ['confirm', 'cancel']) {
      expect(part(root, name).closest('[hidden]'), name).toBeNull();
    }
  });
});
