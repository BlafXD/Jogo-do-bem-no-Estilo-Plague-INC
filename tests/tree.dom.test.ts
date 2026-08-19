// @vitest-environment jsdom

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { unlockSkill } from '../src/engine/skills';
import { createInitialState, skills, type GameState, type SkillId } from '../src/engine/state';
import { mountTree, renderTree, treeView } from '../src/ui/tree';

/**
 * O primeiro arquivo de teste do projeto que roda com DOM. O jsdom entrou no
 * P6-06 com aprovação no chat (§2), e o ambiente é pedido **por arquivo**, no
 * cabeçalho acima — o padrão do vite.config.ts continua sendo 'node', para que
 * um `document` que vaze para dentro do engine ainda quebre um teste (§3).
 *
 * O que se testa aqui é só o que não existe sem DOM: clique, foco, atributo de
 * acessibilidade e a promessa de que redesenhar não recria os botões. A lógica
 * de estado e texto está no tests/tree.test.ts, que roda em node.
 */

function mount(state: GameState, onUnlock: (id: SkillId) => void = () => {}): HTMLElement {
  const root = document.createElement('section');
  // Precisa estar no documento: sem isso o .focus() do jsdom não pega.
  document.body.replaceChildren(root);
  mountTree(root, treeView(state), onUnlock);
  return root;
}

function nodeButton(root: ParentNode, id: string): HTMLElement {
  const button = root.querySelector<HTMLElement>(`[data-skill="${id}"]`);
  if (button === null) throw new Error(`o botão do nó "${id}" não foi montado.`);
  return button;
}

function textOf(button: ParentNode, slot: string): string {
  return button.querySelector(`[data-tree="${slot}"]`)?.textContent ?? '';
}

/**
 * Olha o atributo, e não a propriedade `.hidden`: hoje ela é `boolean | string`
 * por causa do `hidden="until-found"`, e comparar contra `true` passaria a
 * mentir se alguém usasse essa forma. A presença do atributo é o que o
 * navegador de fato honra.
 */
function isHidden(button: ParentNode, slot: string): boolean {
  const target = button.querySelector(`[data-tree="${slot}"]`);
  return target === null || target.hasAttribute('hidden');
}

function rich(points: number): GameState {
  return { ...createInitialState(1), actionPoints: points };
}

beforeEach(() => {
  document.body.replaceChildren();
});

describe('mountTree', () => {
  it('monta um botão por habilidade, com o id no dataset', () => {
    const root = mount(rich(0));
    const buttons = root.querySelectorAll('[data-skill]');

    expect(buttons).toHaveLength(skills.length);
    for (const skill of skills) {
      expect(nodeButton(root, skill.id).tagName).toBe('BUTTON');
    }
  });

  it('cada ramo vira uma seção com <h2> e uma lista de verdade', () => {
    // Estrutura semântica é o que deixa um leitor de tela pular de ramo em ramo
    // em vez de varrer os 20 nós um a um (§5).
    const root = mount(rich(0));

    expect(root.querySelectorAll('h2')).toHaveLength(5);
    expect(root.querySelectorAll('ol.tree__nodes')).toHaveLength(5);
    expect(root.getAttribute('aria-label')).toBe('Árvore de habilidades');
  });

  it('o botão é do tipo button — não submete formulário nenhum', () => {
    const root = mount(rich(0));

    for (const skill of skills) {
      expect(nodeButton(root, skill.id).getAttribute('type')).toBe('button');
    }
  });

  it('o fato real fica no tooltip antes da compra', () => {
    const root = mount(rich(0));
    const source = skills.find((skill) => skill.id === 'solar');

    expect(nodeButton(root, 'solar').getAttribute('title')).toBe(source?.fact);
  });
});

describe('o clique', () => {
  it('avisa com o id do nó clicado', () => {
    const onUnlock = vi.fn();
    const root = mount(rich(40), onUnlock);

    nodeButton(root, 'solar').click();

    expect(onUnlock).toHaveBeenCalledWith('solar');
  });

  it('avisa também num nó bloqueado — quem recusa a compra é o engine', () => {
    // A UI é burra de propósito: reimplementar a regra de pré-requisito aqui
    // seria criar uma segunda regra para discordar da do engine em silêncio.
    const onUnlock = vi.fn();
    const root = mount(rich(10_000), onUnlock);

    nodeButton(root, 'wind').click();

    expect(onUnlock).toHaveBeenCalledWith('wind');
    // E o engine devolve o estado intacto — o mesmo objeto, por identidade.
    const state = rich(10_000);
    expect(unlockSkill(state, 'wind')).toBe(state);
  });

  it('ponta a ponta: clicar, comprar e a tela mostrar o resultado', () => {
    let state = rich(0);
    const root = mount(state, (id) => {
      state = unlockSkill(state, id);
      renderTree(root, treeView(state));
    });

    // Sem PAC o nó está na tela, mas clicar nele não faz nada.
    expect(textOf(nodeButton(root, 'solar'), 'label')).toBe('PAC insuficiente');
    nodeButton(root, 'solar').click();
    expect(state.unlockedSkills).toHaveLength(0);

    // O PAC entra — na partida quem faz isso é o tick — e o nó abre.
    state = rich(40);
    renderTree(root, treeView(state));
    expect(textOf(nodeButton(root, 'solar'), 'label')).toBe('Disponível');

    nodeButton(root, 'solar').click();

    expect(state.unlockedSkills).toContain('solar');
    expect(state.actionPoints).toBe(0);
    expect(textOf(nodeButton(root, 'solar'), 'label')).toBe('Comprado');
    // E o filho sai de "bloqueado" para "falta PAC" na mesma tela.
    expect(textOf(nodeButton(root, 'wind'), 'label')).toBe('PAC insuficiente');
  });
});

describe('renderTree', () => {
  it('escreve estado, ícone e rótulo em cada nó', () => {
    const root = mount(rich(40));
    const solar = nodeButton(root, 'solar');
    const wind = nodeButton(root, 'wind');

    expect(solar.dataset.status).toBe('available');
    expect(textOf(solar, 'icon')).toBe('●');
    expect(textOf(solar, 'label')).toBe('Disponível');

    expect(wind.dataset.status).toBe('locked');
    expect(textOf(wind, 'detail')).toBe('Exige: Energia solar em escala');
  });

  it('esconde o motivo quando não há motivo nenhum', () => {
    const root = mount(rich(40));

    expect(isHidden(nodeButton(root, 'solar'), 'detail')).toBe(true);
    expect(isHidden(nodeButton(root, 'wind'), 'detail')).toBe(false);
  });

  it('o fato real só aparece depois da compra', () => {
    // Vinte fatos na tela ao mesmo tempo seriam a palestra que o §2.4 do GDD
    // quer evitar. Antes da compra ele existe, mas escondido — e no tooltip.
    const root = mount(rich(40));
    expect(isHidden(nodeButton(root, 'solar'), 'fact')).toBe(true);

    renderTree(root, treeView(unlockSkill(rich(40), 'solar')));
    expect(isHidden(nodeButton(root, 'solar'), 'fact')).toBe(false);
    expect(textOf(nodeButton(root, 'solar'), 'fact').trim().length).toBeGreaterThan(0);
  });

  it('marca com aria-disabled, e não com disabled', () => {
    // Botão com `disabled` sai da ordem de tabulação: quem navega por teclado
    // não conseguiria nem chegar no nó para ler POR QUE ele está bloqueado.
    const root = mount(rich(40));
    const wind = nodeButton(root, 'wind');

    expect(wind.getAttribute('aria-disabled')).toBe('true');
    expect(wind.hasAttribute('disabled')).toBe(false);
    expect(nodeButton(root, 'solar').getAttribute('aria-disabled')).toBe('false');
  });

  it('um nó bloqueado continua alcançável pelo teclado', () => {
    const root = mount(rich(40));
    const wind = nodeButton(root, 'wind');

    wind.focus();

    expect(document.activeElement).toBe(wind);
  });

  it('não recria os botões: o foco sobrevive ao redesenho do tick', () => {
    // Este é o teste que justifica o jsdom. A árvore redesenha a cada mês de
    // jogo — 1,5 s na velocidade 1x. Se o render reconstruísse os cartões, o
    // foco de quem estivesse navegando seria arrancado a cada segundo e meio, e
    // nada disso apareceria num teste que roda em node.
    const root = mount(rich(0));
    const solar = nodeButton(root, 'solar');

    solar.focus();
    expect(document.activeElement).toBe(solar);

    for (let redraw = 0; redraw < 12; redraw++) {
      renderTree(root, treeView(rich(redraw * 5)));
    }

    expect(nodeButton(root, 'solar')).toBe(solar);
    expect(document.activeElement).toBe(solar);
    // E o nó acompanhou o PAC subindo, sem ter sido recriado.
    expect(solar.dataset.status).toBe('available');
  });

  it('nenhum nó fica com ícone sem rótulo ao lado', () => {
    // O §5 em forma de teste de DOM: o par ícone + texto é o que impede a tela
    // de comunicar estado só por cor.
    const root = mount(rich(70));

    for (const skill of skills) {
      const button = nodeButton(root, skill.id);
      expect(textOf(button, 'icon').trim().length).toBeGreaterThan(0);
      expect(textOf(button, 'label').trim().length).toBeGreaterThan(0);
      // O ícone é decoração: quem carrega a informação para o leitor de tela é
      // o rótulo escrito.
      expect(button.querySelector('[data-tree="icon"]')?.getAttribute('aria-hidden')).toBe('true');
    }
  });
});
