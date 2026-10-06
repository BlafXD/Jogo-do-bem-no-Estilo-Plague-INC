// @vitest-environment jsdom

import { describe, expect, it, vi } from 'vitest';

import { ui } from '../src/data/i18n';
import { CHARACTER_IDS, characterBuffs, type CharacterBuff } from '../src/engine/state';
import {
  SELECTABLE_IDS,
  bonusLines,
  focusFirstCard,
  mountSelect,
  renderSelect,
  selectView,
  type SelectHandlers,
} from '../src/ui/character-select';
import { personText } from '../src/ui/characters';

/**
 * A escolha do especialista (REF-08).
 *
 * As duas metades ficam no mesmo arquivo, pela razão que o
 * tests/title.dom.test.ts registra: o núcleo puro é pequeno o bastante para não
 * render um arquivo em node só para ele.
 */

function handlers(over: Partial<SelectHandlers> = {}): SelectHandlers {
  return {
    onChoose: vi.fn(),
    onStart: vi.fn(),
    onBack: vi.fn(),
    ...over,
  };
}

function mount(h: SelectHandlers = handlers()): HTMLElement {
  const root = document.createElement('section');
  document.body.replaceChildren(root);
  mountSelect(root, h);
  return root;
}

function part(root: ParentNode, name: string): HTMLElement {
  const found = root.querySelector<HTMLElement>(`[data-select="${name}"]`);
  if (found === null) throw new Error(`a tela de escolha não tem ${name}`);
  return found;
}

function cards(root: ParentNode): readonly HTMLElement[] {
  return [...root.querySelectorAll<HTMLElement>('.select__card')];
}

function card(root: ParentNode, id: string): HTMLElement {
  const found = root.querySelector<HTMLElement>(`[data-character="${id}"]`);
  if (found === null) throw new Error(`a tela de escolha não tem o cartão de ${id}`);
  return found;
}

/** Um buff de laboratório, para medir o texto sem depender do balanceamento. */
function buff(over: Partial<CharacterBuff> = {}): CharacterBuff {
  return {
    branch: 'energy',
    costDiscount: 0,
    emissionBoost: 0,
    startResilience: 0,
    pointsPerYearBonus: 0,
    ...over,
  };
}

describe('quem entra na escolha', () => {
  /**
   * **A regra inteira do REF-08 está neste teste.** Selecionável é quem é
   * jogável *e* tem retrato: a Marina Costa entrou no `CHARACTER_IDS` no REF-07,
   * mas a arte dela não chegou, então ela não aparece na tela. Decidido no chat
   * em 2026-10-06, e a alternativa — um placeholder — foi recusada lá.
   */
  it('deixa de fora quem é jogável mas não tem retrato', () => {
    expect(CHARACTER_IDS).toContain('marina-costa');
    expect(SELECTABLE_IDS).not.toContain('marina-costa');
  });

  /**
   * Quando a arte chegar, a Marina entra sozinha: o `PERSON_IDS` ganha o id, e
   * esta tela passa a ter cinco cartões sem uma linha de código nova. O teste
   * fixa a contagem de hoje para a mudança aparecer no diff, e não em silêncio.
   */
  it('oferece os quatro que têm retrato, na ordem dos ramos', () => {
    expect(SELECTABLE_IDS).toEqual([
      'ana-luiza',
      'carlos-mendes',
      'ricardo-souza',
      'juliana-almeida',
    ]);
  });

  it('todo selecionável tem buff, nome e cargo', () => {
    for (const id of SELECTABLE_IDS) {
      expect(characterBuffs[id].branch).toBeTruthy();
      expect(personText(id).name).toBeTruthy();
      expect(personText(id).role).toBeTruthy();
    }
  });
});

describe('as frases do bônus saem dos números', () => {
  /**
   * É a regra 8 da FORMA-DE-TRABALHO conferida: o texto não guarda "10%", ele
   * formata o que está no `character-buffs.json`. Quando o REF-09 afinar os
   * valores, a tela passa a dizer os novos sozinha.
   */
  it('escreve o desconto que o buff tem, e não um escrito à mão', () => {
    expect(bonusLines(buff({ costDiscount: 0.1 }))).toEqual([
      ui.select.bonus.cost('10%', ui.tree.branches.energy),
    ]);
    expect(bonusLines(buff({ costDiscount: 0.25 }))).toEqual([
      ui.select.bonus.cost('25%', ui.tree.branches.energy),
    ]);
  });

  it('nomeia o ramo do buff, e não sempre o mesmo', () => {
    const [linha] = bonusLines(buff({ branch: 'nature', costDiscount: 0.1 }));
    expect(linha).toContain(ui.tree.branches.nature);
  });

  /**
   * Um campo em zero não vira frase: "começa com 0 de resiliência a mais" seria
   * ruído com cara de vantagem, e três deles por cartão afogariam o que importa.
   */
  it('cala o que está em zero', () => {
    expect(bonusLines(buff())).toEqual([]);
    expect(bonusLines(buff({ startResilience: 8 }))).toEqual([ui.select.bonus.resilience('8')]);
  });

  it('soma as frases de quem tem mais de um reforço', () => {
    const linhas = bonusLines(
      buff({ costDiscount: 0.1, emissionBoost: 0.15, pointsPerYearBonus: 3 }),
    );
    expect(linhas).toHaveLength(3);
  });

  /** Todo selecionável precisa dizer ao jogador o que ganha. */
  it('nenhum especialista chega à tela sem nada a oferecer', () => {
    for (const id of SELECTABLE_IDS) {
      expect(bonusLines(characterBuffs[id]).length, id).toBeGreaterThan(0);
    }
  });
});

describe('a view', () => {
  it('não marca ninguém antes da primeira escolha', () => {
    const view = selectView(null);
    expect(view.cards.every((c) => !c.chosen)).toBe(true);
    expect(view.canStart).toBe(false);
    expect(view.status).toBe(ui.select.statusEmpty);
  });

  it('marca só o escolhido, e libera o começo', () => {
    const view = selectView('carlos-mendes');
    const marcados = view.cards.filter((c) => c.chosen).map((c) => c.id);

    expect(marcados).toEqual(['carlos-mendes']);
    expect(view.canStart).toBe(true);
    expect(view.status).toContain(personText('carlos-mendes').name);
  });

  /**
   * Um `chosen` que a tela não sabe desenhar **não** libera o começo. É o caso
   * da Marina hoje: começar com um especialista que não está na tela seria
   * começar sem o jogador ter escolhido nada.
   */
  it('não começa com um especialista que a tela não mostra', () => {
    const view = selectView('marina-costa');

    expect(view.cards.every((c) => !c.chosen)).toBe(true);
    expect(view.canStart).toBe(false);
  });

  it('o Modo Feira diz "demonstração" no botão', () => {
    expect(selectView('ana-luiza', true).startLabel).toBe(ui.select.startFair);
    expect(selectView('ana-luiza', false).startLabel).toBe(ui.select.start);
  });

  it('o cargo é a profissão da ficha, e o ramo vem à parte', () => {
    const view = selectView(null);
    const ricardo = view.cards.find((c) => c.id === 'ricardo-souza');

    // O Ricardo foi remapeado para Indústria no REF-07, e a profissão dele não
    // mudou — a ficha é do [D-Historia]. A tela mostra as duas coisas, e é por
    // isso que o remap não precisou inventar uma profissão nova.
    expect(ricardo?.role).toBe(personText('ricardo-souza').role);
    expect(ricardo?.branch).toBe(ui.tree.branches.industry);
  });
});

describe('a tela montada', () => {
  it('põe um cartão por selecionável, com retrato, nome, cargo, ramo e bônus', () => {
    const root = mount();

    expect(cards(root)).toHaveLength(SELECTABLE_IDS.length);

    for (const id of SELECTABLE_IDS) {
      const botao = card(root, id);
      expect(botao.querySelector('.portrait__img')).not.toBeNull();
      expect(botao.querySelector('.select__name')?.textContent).toBe(personText(id).name);
      expect(botao.querySelector('.select__role')?.textContent).toBe(personText(id).role);
      expect(botao.querySelector('.select__branch')?.textContent).toContain(
        ui.tree.branches[characterBuffs[id].branch],
      );
      expect(botao.querySelectorAll('.select__bonus li')).toHaveLength(
        bonusLines(characterBuffs[id]).length,
      );
    }
  });

  it('os retratos têm arquivo e texto alternativo', () => {
    const imagens = [...mount().querySelectorAll<HTMLImageElement>('.select__card img')];

    expect(imagens).toHaveLength(SELECTABLE_IDS.length);
    expect(imagens.every((img) => img.getAttribute('src') !== '')).toBe(true);
    expect(imagens.every((img) => img.alt !== '')).toBe(true);
  });

  it('o clique num cartão avisa quem foi', () => {
    const onChoose = vi.fn();
    const root = mount(handlers({ onChoose }));

    card(root, 'juliana-almeida').click();

    expect(onChoose).toHaveBeenCalledWith('juliana-almeida');
  });

  it('o "Voltar" avisa, e é o mesmo caminho do Esc', () => {
    const onBack = vi.fn();
    const root = mount(handlers({ onBack }));

    part(root, 'back').click();

    expect(onBack).toHaveBeenCalledTimes(1);
  });
});

describe('a tela redesenhada', () => {
  it('acende só o cartão escolhido, em texto e em aria-pressed', () => {
    const root = mount();
    renderSelect(root, selectView('ricardo-souza'));

    for (const id of SELECTABLE_IDS) {
      const botao = card(root, id);
      const escolhido = id === 'ricardo-souza';

      expect(botao.getAttribute('aria-pressed'), id).toBe(String(escolhido));
      // A marca é texto, e não só uma borda: o §5 não deixa um estado viver só
      // no desenho.
      const marca = botao.querySelector<HTMLElement>('[data-select="mark"]');
      expect(marca?.hidden, id).toBe(!escolhido);
      expect(marca?.textContent).toBe(ui.select.current);
    }
  });

  /**
   * **Os cartões não são remontados a cada render**, e isso é o que mantém o
   * foco onde o jogador o deixou: quem escolhe pelo teclado continua no cartão
   * que acabou de marcar, em vez de ser jogado para o começo da página.
   */
  it('não troca os elementos dos cartões', () => {
    const root = mount();
    const antes = cards(root);

    renderSelect(root, selectView('ana-luiza'));
    renderSelect(root, selectView('carlos-mendes'));

    expect(cards(root)).toEqual(antes);
  });

  it('o foco sobrevive a escolher pelo teclado', () => {
    const root = mount();
    const alvo = card(root, 'carlos-mendes');

    alvo.focus();
    renderSelect(root, selectView('carlos-mendes'));

    expect(document.activeElement).toBe(alvo);
  });

  /**
   * Bloqueado é `aria-disabled`, e não `disabled`: o botão continua na ordem de
   * tabulação e o clique **chega** ao `onStart`, que é quem recusa com som. Um
   * botão `disabled` sairia da tabulação e levaria a explicação com ele.
   */
  it('deixa o botão de começar bloqueado, mas clicável, sem escolha', () => {
    const onStart = vi.fn();
    const root = mount(handlers({ onStart }));
    renderSelect(root, selectView(null));

    const start = part(root, 'start');
    expect(start.getAttribute('aria-disabled')).toBe('true');
    expect(start.hasAttribute('disabled')).toBe(false);

    start.click();
    expect(onStart).toHaveBeenCalledTimes(1);
  });

  it('libera o botão quando há escolha', () => {
    const root = mount();
    renderSelect(root, selectView('ana-luiza'));

    expect(part(root, 'start').getAttribute('aria-disabled')).toBe('false');
  });

  /** A frase embaixo do botão existe nos dois estados, nunca vazia. */
  it('sempre escreve o que falta ou quem vai dirigir', () => {
    const root = mount();

    renderSelect(root, selectView(null));
    expect(part(root, 'status').textContent).toBe(ui.select.statusEmpty);

    renderSelect(root, selectView('juliana-almeida'));
    expect(part(root, 'status').textContent).toContain(personText('juliana-almeida').name);
  });

  it('o rótulo do botão acompanha o Modo Feira', () => {
    const root = mount();

    renderSelect(root, selectView('ana-luiza', true));
    expect(part(root, 'start').textContent).toContain(ui.select.startFair);

    renderSelect(root, selectView('ana-luiza', false));
    expect(part(root, 'start').textContent).toContain(ui.select.start);
  });
});

describe('o foco ao entrar na tela', () => {
  it('vai para o primeiro cartão', () => {
    const root = mount();

    focusFirstCard(root);

    expect(document.activeElement).toBe(card(root, 'ana-luiza'));
  });
});
