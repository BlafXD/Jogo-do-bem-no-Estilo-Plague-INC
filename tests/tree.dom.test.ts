// @vitest-environment jsdom

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { unlockSkill } from '../src/engine/skills';
import { createInitialState, skills, type GameState, type SkillId } from '../src/engine/state';
import { ui } from '../src/data/i18n';
import {
  drawTreeLinks,
  focusChosenNode,
  mountSkillDetail,
  mountTree,
  mountTreeButton,
  renderSkillDetail,
  renderTree,
  renderTreeButton,
  skillDetailView,
  treeButtonView,
  treeView,
} from '../src/ui/tree';

/**
 * O primeiro arquivo de teste do projeto que roda com DOM. O jsdom entrou no
 * P6-06 com aprovação no chat (§2), e o ambiente é pedido **por arquivo**, no
 * cabeçalho acima — o padrão do vite.config.ts continua sendo 'node', para que
 * um `document` que vaze para dentro do engine ainda quebre um teste (§3).
 *
 * O que se testa aqui é só o que não existe sem DOM: clique, foco, atributo de
 * acessibilidade e a promessa de que redesenhar não recria os botões. A lógica
 * de estado e texto está no tests/tree.test.ts, que roda em node.
 *
 * Desde o VIS-05 a árvore tem duas metades: os losangos, onde clicar escolhe um
 * nó, e o detalhe, onde se compra.
 */

function mount(
  state: GameState,
  chosen: SkillId = 'solar',
  onChoose: (id: SkillId) => void = () => {},
): HTMLElement {
  const root = document.createElement('section');
  // Precisa estar no documento: sem isso o .focus() do jsdom não pega.
  document.body.replaceChildren(root);
  mountTree(root, treeView(state), chosen, onChoose);
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

function rich(points: number): GameState {
  return { ...createInitialState(1), actionPoints: points };
}

beforeEach(() => {
  document.body.replaceChildren();
});

describe('mountTree', () => {
  it('monta um botão por habilidade, com o id no dataset', () => {
    const root = mount(rich(0));

    expect(root.querySelectorAll('[data-skill]')).toHaveLength(skills.length);
    for (const skill of skills) {
      expect(nodeButton(root, skill.id).tagName).toBe('BUTTON');
      expect(nodeButton(root, skill.id).getAttribute('type')).toBe('button');
    }
  });

  it('cada ramo vira uma seção com <h3> e uma lista de verdade', () => {
    // Estrutura semântica é o que deixa um leitor de tela pular de ramo em ramo
    // em vez de varrer os 20 nós um a um (§5). O <h2> é o título do painel.
    const root = mount(rich(0));

    expect(root.querySelectorAll('section.tree__branch > h3')).toHaveLength(5);
    expect(root.querySelectorAll('ol.tree__nodes')).toHaveLength(5);
    expect(root.getAttribute('aria-label')).toBe(ui.tree.label);
  });

  /**
   * O losango: a raiz sozinha em cima, os dois do meio lado a lado, o nó final
   * sozinho embaixo. Quem desce cada um para a sua linha é a grade do CSS, com
   * os nós na ordem da profundidade — por isso a ordem da lista também conta.
   */
  /**
   * **Dois losangos empilhados desde o REF-07**, e não mais um. O segundo
   * começa onde o primeiro termina: o `offshore-wind` pede o `smart-grid`, que é
   * o fundo do de cima. O `placesOf` não sabe disso — ele só lê profundidade e
   * conta quantos nós há em cada fileira —, e é por isso que o desenho saiu de
   * graça quando a árvore dobrou.
   */
  it('põe cada nó no lugar dele nos dois losangos, na ordem da profundidade', () => {
    const root = mount(rich(0));
    const ramo = root.querySelector('[data-branch="energy"]');
    const itens = [...(ramo?.querySelectorAll<HTMLElement>('li') ?? [])];

    expect(itens.map((li) => li.querySelector<HTMLElement>('[data-skill]')?.dataset.skill)).toEqual(
      [
        'solar',
        'wind',
        'storage',
        'smart-grid',
        'offshore-wind',
        'hydro',
        'green-hydrogen',
        'coal-phaseout',
      ],
    );
    expect(itens.map((li) => li.dataset.place)).toEqual([
      'alone',
      'left',
      'right',
      'alone',
      'alone',
      'left',
      'right',
      'alone',
    ]);
  });

  it('cada losango tem uma camada de ligações, escondida do leitor de tela', () => {
    const root = mount(rich(0));
    const camadas = root.querySelectorAll('.tree__diamond > svg.tree__links');

    expect(camadas).toHaveLength(5);
    for (const camada of camadas) expect(camada.getAttribute('aria-hidden')).toBe('true');
  });

  it('o cartão diz o nome, o custo e o estado, com espaço entre eles', () => {
    // O nome acessível do botão é o texto dele: sem os espaços, o leitor de
    // tela leria "Energia solar em escala40 PAC".
    const root = mount(rich(40));

    expect(nodeButton(root, 'solar').textContent).toBe(
      `Energia solar em escala 40 PAC ${ui.tree.status.available.icon} ${ui.tree.status.available.label}`,
    );
  });
});

describe('o clique no losango', () => {
  it('escolhe o nó, e não compra nada', () => {
    const onChoose = vi.fn();
    const root = mount(rich(40), 'solar', onChoose);

    nodeButton(root, 'wind').click();

    expect(onChoose).toHaveBeenCalledWith('wind');
  });

  it('um nó bloqueado também pode ser escolhido — é assim que se lê o que ele exige', () => {
    const onChoose = vi.fn();
    const root = mount(rich(0), 'solar', onChoose);

    nodeButton(root, 'smart-grid').click();

    expect(onChoose).toHaveBeenCalledWith('smart-grid');
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
    expect(textOf(wind, 'label')).toBe('Bloqueado');
  });

  /**
   * **O bug que o REF-08 descobriu.** O custo do cartão era escrito só no
   * `mountTree`, e até a tela de escolha existir isso nunca pesou: o
   * `character` era `null` em toda partida de verdade, então o preço não mudava
   * depois da montagem. Com a escolha do especialista **depois** do mount, o
   * desconto de ramo do REF-05 entrava no detalhe e na compra e não entrava no
   * cartão — dois números discordando na tela, que é exatamente o que o
   * `costFor` existe para impedir.
   */
  it('reescreve o custo quando o personagem muda o desconto (REF-05/REF-08)', () => {
    const semNinguem = rich(40);
    const root = mount(semNinguem);
    const solar = nodeButton(root, 'solar');

    // Montada no baseline: `solar` custa os 40 do skills.json.
    expect(textOf(solar, 'cost')).toBe(ui.tree.cost('40'));

    // A Ana Luiza desconta 10% do ramo Energia: 40 → 36.
    renderTree(root, treeView({ ...semNinguem, character: 'ana-luiza' }), 'solar');
    expect(textOf(solar, 'cost')).toBe(ui.tree.cost('36'));

    // E o nó de outro ramo não se mexe.
    expect(textOf(nodeButton(root, 'transit'), 'cost')).toBe(ui.tree.cost('40'));

    // Voltar ao baseline devolve o preço cheio: o render não guarda estado.
    renderTree(root, treeView(semNinguem), 'solar');
    expect(textOf(solar, 'cost')).toBe(ui.tree.cost('40'));
  });

  it('marca só o nó escolhido com aria-pressed', () => {
    const root = mount(rich(0), 'wind');

    const marcados = [...root.querySelectorAll('[aria-pressed="true"]')];
    expect(marcados).toEqual([nodeButton(root, 'wind')]);

    renderTree(root, treeView(rich(0)), 'transit');
    expect(nodeButton(root, 'wind').getAttribute('aria-pressed')).toBe('false');
    expect(nodeButton(root, 'transit').getAttribute('aria-pressed')).toBe('true');
  });

  it('nenhum nó é desabilitado: todos precisam ser escolhíveis pelo teclado', () => {
    const root = mount(rich(0));

    for (const skill of skills) {
      expect(nodeButton(root, skill.id).hasAttribute('disabled')).toBe(false);
    }
  });

  it('não recria os botões: o foco sobrevive ao redesenho do tick', () => {
    // Este é o teste que justifica o jsdom. A árvore redesenha a cada mês de
    // jogo — 1,5 s na velocidade 1x. Se o render reconstruísse os cartões, o
    // foco de quem estivesse navegando seria arrancado a cada segundo e meio, e
    // nada disso apareceria num teste que roda em node.
    const root = mount(rich(0));
    const solar = nodeButton(root, 'solar');

    solar.focus();
    for (let redraw = 0; redraw < 12; redraw++) {
      renderTree(root, treeView(rich(redraw * 5)), 'solar');
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

  it('o foco do painel pousa no nó escolhido', () => {
    const root = mount(rich(0), 'storage');

    expect(focusChosenNode(root)).toBe(true);
    expect(document.activeElement).toBe(nodeButton(root, 'storage'));
  });
});

// ------------------------------------------------------------ ligações ---

/**
 * jsdom não faz layout: todo `getBoundingClientRect` devolve zero. Aqui cada
 * peça do ramo Energia ganha uma caixa de mentira, na forma do losango.
 */
function comCaixas(root: HTMLElement): void {
  const caixa = (el: Element, x: number, y: number, w: number, h: number): void => {
    vi.spyOn(el, 'getBoundingClientRect').mockReturnValue(new DOMRect(x, y, w, h));
  };

  const ramo = root.querySelector('[data-branch="energy"] .tree__diamond');
  if (ramo === null) throw new Error('o losango da Energia não foi montado.');

  // Seis fileiras desde o REF-07: os dois losangos empilhados. As medidas do
  // primeiro não mudaram, de propósito — é o que mantém o caminho pinado abaixo
  // valendo e prova que o segundo losango não mexeu no desenho do primeiro.
  caixa(ramo, 100, 100, 200, 640);
  caixa(nodeButton(root, 'solar'), 150, 100, 100, 60);
  caixa(nodeButton(root, 'wind'), 100, 200, 95, 60);
  caixa(nodeButton(root, 'storage'), 205, 200, 95, 60);
  caixa(nodeButton(root, 'smart-grid'), 150, 320, 100, 60);
  caixa(nodeButton(root, 'offshore-wind'), 150, 440, 100, 60);
  caixa(nodeButton(root, 'hydro'), 100, 560, 95, 60);
  caixa(nodeButton(root, 'green-hydrogen'), 205, 560, 95, 60);
  caixa(nodeButton(root, 'coal-phaseout'), 150, 680, 100, 60);
}

function caminhos(root: ParentNode): SVGPathElement[] {
  return [...root.querySelectorAll<SVGPathElement>('[data-branch="energy"] .tree__links path')];
}

describe('drawTreeLinks', () => {
  it('liga cada pai ao filho, descendo do fundo de um ao topo do outro', () => {
    const root = mount(rich(0));
    comCaixas(root);

    drawTreeLinks(root);

    // Nove ligações: as quatro do losango de cima (solar → eólica, solar →
    // bateria, e as duas até a rede) mais as cinco do de baixo, que o REF-07
    // acrescentou — rede → eólica no mar, ela até hidrelétrica e hidrogênio, e
    // os dois até o fim do carvão.
    expect(caminhos(root)).toHaveLength(9);
    // Do fundo da solar (x 100, y 60) ao topo da eólica (x 47,5, y 100).
    expect(caminhos(root)[0]?.getAttribute('d')).toBe('M100 60V80H47.5V100');
  });

  it('com o painel fechado, as medidas são zero e nada é desenhado', () => {
    const root = mount(rich(0));

    drawTreeLinks(root);

    expect(root.querySelectorAll('.tree__links path')).toHaveLength(0);
  });

  it('acende só a ligação entre dois nós comprados', () => {
    const state = unlockSkill(unlockSkill(rich(110), 'solar'), 'wind');
    const root = mount(state);
    comCaixas(root);

    drawTreeLinks(root);

    const acesas = caminhos(root).filter((path) => path.hasAttribute('data-lit'));
    expect(acesas).toHaveLength(1);
    expect(acesas[0]).toBe(caminhos(root)[0]);
  });
});

// ------------------------------------------------------------- detalhe ---

function montarDetalhe(onBuy: (id: SkillId) => void = () => {}): HTMLElement {
  const root = document.createElement('section');
  document.body.append(root);
  mountSkillDetail(root, onBuy);
  return root;
}

function slotDo(root: ParentNode, nome: string): HTMLElement | null {
  return root.querySelector<HTMLElement>(`[data-detail="${nome}"]`);
}

function botaoDeCompra(root: ParentNode): HTMLElement {
  const buy = slotDo(root, 'buy');
  if (buy === null) throw new Error('o botão de compra não foi montado.');
  return buy;
}

describe('o detalhe do nó', () => {
  it('mostra ramo, nome, estado, efeito e o fato real antes da compra', () => {
    const root = montarDetalhe();
    const solar = skills.find((skill) => skill.id === 'solar');

    renderSkillDetail(root, skillDetailView(treeView(rich(40)), 'solar'));

    expect(slotDo(root, 'branch')?.textContent).toBe(ui.tree.branches.energy);
    expect(slotDo(root, 'name')?.textContent).toBe(solar?.name);
    expect(slotDo(root, 'state')?.textContent).toBe('Disponível · 40 PAC');
    expect(slotDo(root, 'description')?.textContent).toBe(solar?.description);
    // Decidido no chat em 2026-09-17: o fato aparece antes da compra.
    expect(slotDo(root, 'fact')?.textContent).toBe(solar?.fact);
    expect(slotDo(root, 'fact')?.closest('[hidden]')).toBeNull();
    expect(root.textContent).toContain(ui.tree.detail.fact);
  });

  it('o ícone do estado é decoração, e o rótulo vai escrito ao lado', () => {
    const root = montarDetalhe();

    renderSkillDetail(root, skillDetailView(treeView(rich(40)), 'solar'));

    expect(slotDo(root, 'icon')?.textContent).toBe('●');
    expect(slotDo(root, 'icon')?.getAttribute('aria-hidden')).toBe('true');
  });

  it('o botão compra o nó que está no detalhe', () => {
    const onBuy = vi.fn();
    const root = montarDetalhe(onBuy);

    renderSkillDetail(root, skillDetailView(treeView(rich(40)), 'solar'));
    botaoDeCompra(root).click();

    expect(onBuy).toHaveBeenCalledWith('solar');
  });

  it('recusando, o botão diz o porquê e continua focável', () => {
    // `aria-disabled`, e não `disabled`: botão desabilitado sai da ordem de
    // tabulação, e quem navega por teclado não chegaria nele para ler POR QUE
    // a compra não sai.
    const root = montarDetalhe();

    renderSkillDetail(root, skillDetailView(treeView(rich(40)), 'wind'));
    const buy = botaoDeCompra(root);

    expect(buy.textContent).toBe('Exige: Energia solar em escala');
    expect(buy.getAttribute('aria-disabled')).toBe('true');
    expect(buy.hasAttribute('disabled')).toBe(false);
    buy.focus();
    expect(document.activeElement).toBe(buy);
  });

  it('não recria o botão de compra: o foco sobrevive ao redesenho', () => {
    const root = montarDetalhe();
    renderSkillDetail(root, skillDetailView(treeView(rich(0)), 'solar'));
    const buy = botaoDeCompra(root);
    buy.focus();

    for (let pac = 0; pac <= 40; pac += 5) {
      renderSkillDetail(root, skillDetailView(treeView(rich(pac)), 'solar'));
    }

    expect(botaoDeCompra(root)).toBe(buy);
    expect(document.activeElement).toBe(buy);
    expect(buy.getAttribute('aria-disabled')).toBe('false');
  });

  it('sem nó para mostrar, o detalhe some', () => {
    const root = montarDetalhe();

    renderSkillDetail(root, null);

    expect(root.hidden).toBe(true);
  });
});

describe('ponta a ponta: escolher, comprar e a tela mostrar o resultado', () => {
  it('a compra sai do detalhe e aparece no losango', () => {
    let state = rich(0);
    let chosen: SkillId = 'wind';
    const tree = document.createElement('section');
    const detail = document.createElement('section');
    document.body.replaceChildren(tree, detail);

    const render = (): void => {
      const view = treeView(state);
      renderTree(tree, view, chosen);
      renderSkillDetail(detail, skillDetailView(view, chosen));
    };

    mountTree(tree, treeView(state), chosen, (id) => {
      chosen = id;
      render();
    });
    mountSkillDetail(detail, (id) => {
      state = unlockSkill(state, id);
      render();
    });
    render();

    // Escolher a solar sem PAC: o detalhe mostra, e o botão diz quanto falta.
    nodeButton(tree, 'solar').click();
    expect(slotDo(detail, 'name')?.textContent).toBe('Energia solar em escala');
    expect(botaoDeCompra(detail).textContent).toBe('Faltam 40 PAC');
    botaoDeCompra(detail).click();
    expect(state.unlockedSkills).toHaveLength(0);

    // O PAC entra — na partida quem faz isso é o tick — e a compra abre.
    state = rich(40);
    render();
    botaoDeCompra(detail).click();

    expect(state.unlockedSkills).toContain('solar');
    expect(state.actionPoints).toBe(0);
    expect(textOf(nodeButton(tree, 'solar'), 'label')).toBe('Comprado');
    expect(botaoDeCompra(detail).textContent).toBe(ui.tree.detail.bought);
    // E o filho sai de "bloqueado" para "falta PAC" na mesma tela.
    expect(textOf(nodeButton(tree, 'wind'), 'label')).toBe('PAC insuficiente');
  });
});

// ------------------------------------------------------ botão da árvore ---

describe('o botão da árvore na barra de baixo (VIS-04, VIS-05)', () => {
  function montarBotao(onOpen: () => void = () => {}): HTMLElement {
    const root = document.createElement('div');
    document.body.replaceChildren(root);
    mountTreeButton(root, 'painel-arvore', onOpen);
    return root;
  }

  const botao = (root: ParentNode): HTMLButtonElement | null => root.querySelector('button');

  it('é um botão de verdade, com dica', () => {
    const alvo = botao(montarBotao());

    expect(alvo?.type).toBe('button');
    expect(alvo?.title).toBe(ui.treeButton.hint);
  });

  it('diz ao leitor de tela que abre uma janela, e qual', () => {
    const alvo = botao(montarBotao());

    expect(alvo?.getAttribute('aria-haspopup')).toBe('dialog');
    expect(alvo?.getAttribute('aria-controls')).toBe('painel-arvore');
    expect(alvo?.getAttribute('aria-expanded')).toBe('false');
  });

  it('escreve se o painel está aberto', () => {
    const root = montarBotao();

    renderTreeButton(root, treeButtonView(rich(0)), true);
    expect(botao(root)?.getAttribute('aria-expanded')).toBe('true');

    renderTreeButton(root, treeButtonView(rich(0)), false);
    expect(botao(root)?.getAttribute('aria-expanded')).toBe('false');
  });

  it('avisa quem montou, uma vez por clique', () => {
    const onOpen = vi.fn();
    const root = montarBotao(onOpen);

    botao(root)?.click();

    expect(onOpen).toHaveBeenCalledTimes(1);
  });

  /**
   * O nome acessível é o texto do botão. Sem o espaço entre os pedaços, o leitor
   * de tela leria "habilidades120" — e, desde o INTER-06, "PAC5 prontos".
   */
  it('diz o que é, quanto PAC há e quantos nós cabem, com espaço entre eles', () => {
    const root = montarBotao();
    const view = treeButtonView(rich(120));

    renderTreeButton(root, view);

    expect(botao(root)?.textContent).toBe(`${ui.treeButton.label} ${view.points} ${view.ready}`);
    // Com 120 PAC há nós ao alcance, então o selo do INTER-06 está na frase.
    expect(view.ready).not.toBe('');
  });

  /** Sem nada ao alcance, o selo some e o texto volta a ser o de antes. */
  it('sem nó ao alcance, o botão diz só o que é e quanto PAC há', () => {
    const root = montarBotao();
    const view = treeButtonView(rich(0));

    renderTreeButton(root, view);

    expect(view.ready).toBe('');
    expect(botao(root)?.textContent?.trim()).toBe(`${ui.treeButton.label} ${view.points}`);
  });

  it('atualiza o saldo sem recriar o botão', () => {
    const root = montarBotao();
    const antes = botao(root);
    antes?.focus();

    renderTreeButton(root, treeButtonView(rich(10)));
    renderTreeButton(root, treeButtonView(rich(55)));

    expect(botao(root)).toBe(antes);
    expect(document.activeElement).toBe(antes);
    expect(root.querySelector('[data-tree-button="points"]')?.textContent).toBe(
      treeButtonView(rich(55)).points,
    );
  });
});

/**
 * O pulso de vida (Fase 1 da reforma de 2026-09-30): um nó comprado, e um nó
 * que acabou de ficar comprável, ganham a classe da animação. O primeiro render
 * não pulsa nada, e um nó que não muda de estado fica quieto.
 */
describe('o pulso de conquista', () => {
  const GANHO = 'tree__node--gained';

  it('não pulsa no primeiro render', () => {
    const root = mount(rich(200), 'solar');

    expect(nodeButton(root, 'solar').classList.contains(GANHO)).toBe(false);
    expect(nodeButton(root, 'wind').classList.contains(GANHO)).toBe(false);
  });

  it('pulsa o nó comprado e os que viraram compráveis, e mais nenhum', () => {
    const inicio = rich(200);
    const root = mount(inicio, 'solar');

    // Comprar a raiz de Energia destrava os dois nós do meio.
    renderTree(root, treeView(unlockSkill(inicio, 'solar')), 'solar');

    expect(nodeButton(root, 'solar').classList.contains(GANHO)).toBe(true); // comprado
    expect(nodeButton(root, 'wind').classList.contains(GANHO)).toBe(true); // virou comprável
    expect(nodeButton(root, 'storage').classList.contains(GANHO)).toBe(true);
    // O transporte não foi tocado: continua disponível, sem pulsar.
    expect(nodeButton(root, 'transit').classList.contains(GANHO)).toBe(false);
  });
});

/**
 * A ligação "acendendo" até o próximo nó (pedido no chat em 2026-10-26): o
 * mesmo instante em que o pulso de conquista dispara, a ligação até o nó que
 * reagiu ganha `data-charge` — uma vez só, não a cada redesenho.
 */
describe('a ligação que acende', () => {
  it('acende as duas ligações que saem da raiz recém-comprada', () => {
    const inicio = rich(200);
    const root = mount(inicio, 'solar');
    comCaixas(root);

    renderTree(root, treeView(unlockSkill(inicio, 'solar')), 'solar');

    const acendendo = caminhos(root).filter((path) => path.hasAttribute('data-charge'));
    expect(acendendo).toHaveLength(2);
  });

  it('cada redesenho recalcula do zero: só quem reagiu agora acende', () => {
    const inicio = rich(200);
    const root = mount(inicio, 'solar');
    comCaixas(root);

    const depoisSolar = unlockSkill(inicio, 'solar');
    renderTree(root, treeView(depoisSolar), 'solar');
    expect(caminhos(root).filter((path) => path.hasAttribute('data-charge'))).toHaveLength(2);

    // Agora só o "wind" reage; o "storage" continua disponível, sem mudar.
    const depoisWind = unlockSkill(depoisSolar, 'wind');
    renderTree(root, treeView(depoisWind), 'wind');

    expect(caminhos(root).filter((path) => path.hasAttribute('data-charge'))).toHaveLength(1);
  });
});

/**
 * A celebração do ramo completo (pedido no chat em 2026-10-26): a seção
 * inteira comemora quando o 8º e último nó do ramo é comprado, e só então.
 */
describe('a celebração do ramo completo', () => {
  const ENERGIA: readonly SkillId[] = [
    'solar',
    'wind',
    'storage',
    'smart-grid',
    'offshore-wind',
    'hydro',
    'green-hydrogen',
  ];

  function comprarTudoMenosOUltimo(): GameState {
    let state = rich(100000);
    for (const id of ENERGIA) state = unlockSkill(state, id);
    return state;
  }

  it('comemora quando o último nó do ramo é comprado', () => {
    const quaseLa = comprarTudoMenosOUltimo();
    const root = mount(quaseLa, 'coal-phaseout');
    const secao = root.querySelector<HTMLElement>('[data-branch="energy"]');

    expect(secao?.classList.contains('tree__branch--complete')).toBe(false);

    renderTree(root, treeView(unlockSkill(quaseLa, 'coal-phaseout')), 'coal-phaseout');

    expect(secao?.classList.contains('tree__branch--complete')).toBe(true);
    expect(secao?.dataset.complete).toBe('true');
  });

  it('não comemora um ramo incompleto', () => {
    const quaseLa = comprarTudoMenosOUltimo();
    const root = mount(quaseLa, 'coal-phaseout');

    // Redesenhar sem comprar o 8º nó não muda estado nenhum do ramo.
    renderTree(root, treeView(quaseLa), 'coal-phaseout');

    expect(
      root.querySelector('[data-branch="energy"]')?.classList.contains('tree__branch--complete'),
    ).toBe(false);
  });
});
