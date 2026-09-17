import { describe, expect, it } from 'vitest';
import { unlockSkill } from '../src/engine/skills';
import { createInitialState, SKILL_BRANCHES, skills, type GameState } from '../src/engine/state';
import { ui } from '../src/data/i18n';
import { hudView } from '../src/ui/hud';
import {
  skillDetailView,
  treeButtonView,
  treeView,
  type SkillNodeView,
  type TreeView,
} from '../src/ui/tree';

/**
 * Estes testes cobrem só as views puras, que rodam em node: o `treeView` e, desde
 * o VIS-04, o `treeButtonView`. O DOM dos dois fica no tests/tree.dom.test.ts,
 * que pede jsdom por arquivo.
 *
 * A divisão é a mesma do hud.ts: o que decide texto e estado — profundidade,
 * arredondamento, qual recusa vira qual rótulo — está deste lado.
 */

function nodeOf(view: TreeView, id: string): SkillNodeView {
  const found = view.flatMap((branch) => branch.nodes).find((node) => node.id === id);
  if (found === undefined) throw new Error(`o nó "${id}" não está na view.`);
  return found;
}

/** Uma partida no começo, com o PAC que o teste quiser. */
function withPoints(actionPoints: number): GameState {
  return { ...createInitialState(1), actionPoints };
}

describe('treeView', () => {
  it('entrega os 5 ramos na ordem do GDD, com 4 nós cada', () => {
    const view = treeView(withPoints(0));

    expect(view.map((branch) => branch.branch)).toEqual([...SKILL_BRANCHES]);
    expect(view.flatMap((branch) => branch.nodes)).toHaveLength(skills.length);

    for (const branch of view) {
      expect(branch.nodes).toHaveLength(4);
      expect(branch.name.trim().length).toBeGreaterThan(0);
    }
  });

  it('a profundidade sai dos pré-requisitos, não de um campo do arquivo', () => {
    const view = treeView(withPoints(0));

    // O ramo Energia é solar → (wind, storage) → smart-grid.
    expect(nodeOf(view, 'solar').depth).toBe(0);
    expect(nodeOf(view, 'wind').depth).toBe(1);
    expect(nodeOf(view, 'storage').depth).toBe(1);
    expect(nodeOf(view, 'smart-grid').depth).toBe(2);
  });

  it('dentro do ramo, os nós vêm em ordem de profundidade', () => {
    for (const branch of treeView(withPoints(0))) {
      const depths = branch.nodes.map((node) => node.depth);
      expect(depths).toEqual([...depths].sort((a, b) => a - b));
    }
  });

  it('a ordenação é real, não sorte de o arquivo já estar ordenado', () => {
    // O teste acima passa mesmo com o `sort` removido, porque o skills.json de
    // hoje já vem em ordem de profundidade — descobri isso plantando o defeito
    // e vendo os 161 testes ficarem verdes. Aqui os mesmos 20 nós entram na
    // ordem inversa e a saída tem que ser idêntica à do arquivo.
    //
    // O caso não é hipotético: o pacote [D-Historia] edita o skills.json à mão,
    // e um nó acrescentado no fim do ramo é a coisa mais natural do mundo.
    // Invertido, o ramo Energia entraria como smart-grid(2), storage(1),
    // wind(1), solar(0) — a ordem exatamente errada. Sem o `sort`, é assim que
    // ele sairia na tela.
    const backwards = treeView(withPoints(0), [...skills].reverse());

    for (const branch of backwards) {
      const depths = branch.nodes.map((node) => node.depth);
      expect(depths).toEqual([...depths].sort((a, b) => a - b));
    }

    // A ordem entre nós de mesma profundidade **não** é afirmada aqui: o `sort`
    // é estável, então os dois nós de nível 2 saem na ordem em que entraram, e
    // exigir a ordem do arquivo seria exigir do `sort` algo que ele não promete.
    // O que tem que bater é o conjunto: ordenar não pode perder nem duplicar nó.
    expect(backwards.flatMap((branch) => branch.nodes.map((node) => node.id)).sort()).toEqual(
      treeView(withPoints(0))
        .flatMap((branch) => branch.nodes.map((node) => node.id))
        .sort(),
    );
  });

  it('nenhum nó aparece antes de um pré-requisito dele', () => {
    // A promessa que a ordem por profundidade faz ao jogador: ler o ramo de
    // cima para baixo é ler a ordem em que dá para comprar.
    for (const branch of treeView(withPoints(0))) {
      const seen = new Set<string>();

      for (const node of branch.nodes) {
        const requires = skills.find((skill) => skill.id === node.id)?.requires ?? [];

        for (const required of requires) {
          // Só cobra os pais do mesmo ramo — a árvore de hoje não cruza ramos,
          // e se um dia cruzar, esta linha é o aviso de que a tela precisa
          // resolver isso.
          if (branch.nodes.some((other) => other.id === required)) {
            expect(seen).toContain(required);
          }
        }

        seen.add(node.id);
      }
    }
  });

  it('sem PAC, a raiz é "PAC insuficiente" — e não "bloqueado"', () => {
    // Os dois estados pedem coisas opostas do jogador: um se resolve esperando,
    // o outro só comprando outro nó antes. Chamar os dois de "bloqueado"
    // esconderia justamente a informação que decide o próximo clique.
    const node = nodeOf(treeView(withPoints(0)), 'solar');

    expect(node.status).toBe('unaffordable');
    expect(node.detail).toBe('Faltam 40 PAC');
  });

  it('com o custo no bolso, a raiz fica disponível e sem recusa a explicar', () => {
    const node = nodeOf(treeView(withPoints(40)), 'solar');

    expect(node.status).toBe('available');
    expect(node.detail).toBe('');
  });

  it('um filho continua bloqueado mesmo com dinheiro de sobra', () => {
    const node = nodeOf(treeView(withPoints(10_000)), 'wind');

    expect(node.status).toBe('locked');
    expect(node.detail).toBe('Exige: Energia solar em escala');
  });

  it('o pré-requisito vem antes do dinheiro na explicação', () => {
    // Sem o pai E sem PAC: o jogador precisa ouvir do pai primeiro, porque
    // juntar PAC não vai destravar este nó.
    expect(nodeOf(treeView(withPoints(0)), 'wind').status).toBe('locked');
  });

  it('o bloqueio nomeia só o que falta, não o que já é seu', () => {
    // smart-grid exige wind e storage. Com wind comprado, mandar comprar wind
    // de novo seria mandar o jogador refazer o que já fez.
    let state = withPoints(10_000);
    state = unlockSkill(state, 'solar');
    state = unlockSkill(state, 'wind');

    const node = nodeOf(treeView(state), 'smart-grid');

    expect(node.status).toBe('locked');
    expect(node.detail).toBe('Exige: Armazenamento em bateria');
  });

  it('cita os dois pais na forma que o português escreve', () => {
    let state = withPoints(10_000);
    state = unlockSkill(state, 'solar');

    expect(nodeOf(treeView(state), 'smart-grid').detail).toBe(
      'Exige: Energia eólica e Armazenamento em bateria',
    );
  });

  it('comprado é comprado: some a recusa, entra o rótulo de comprado', () => {
    const state = unlockSkill(withPoints(40), 'solar');
    const node = nodeOf(treeView(state), 'solar');

    expect(node.status).toBe('unlocked');
    expect(node.statusLabel).toBe('Comprado');
    expect(node.detail).toBe('');
  });

  it('a compra de um pai destrava os filhos na mesma view', () => {
    const before = treeView(withPoints(1_000));
    const after = treeView(unlockSkill(withPoints(1_000), 'solar'));

    expect(nodeOf(before, 'wind').status).toBe('locked');
    expect(nodeOf(after, 'wind').status).toBe('available');
    expect(nodeOf(after, 'smart-grid').status).toBe('locked');
  });

  it('"Faltam N PAC" arredonda para cima, nunca para baixo', () => {
    // O PAC entra fracionado (o P6-03 divide a entrada anual por 12). Com 39,5
    // no bolso e um nó de 40, faltam 0,5 — e "Faltam 0 PAC" num nó que não
    // compra faz o jogador achar que o jogo travou.
    expect(nodeOf(treeView(withPoints(39.5)), 'solar').detail).toBe('Faltam 1 PAC');
    expect(nodeOf(treeView(withPoints(39.999)), 'solar').detail).toBe('Faltam 1 PAC');
    expect(nodeOf(treeView(withPoints(0.1)), 'solar').detail).toBe('Faltam 40 PAC');
  });

  it('o custo aparece com unidade, não como número solto', () => {
    const view = treeView(withPoints(0));

    expect(nodeOf(view, 'solar').cost).toBe('40 PAC');
    expect(nodeOf(view, 'smart-grid').cost).toBe('140 PAC');
  });

  it('todo nó tem ícone E rótulo escrito — o §5 não aceita só um dos dois', () => {
    // A regra é que nenhum estado do jogo seja comunicado só por cor. O par
    // ícone + rótulo é o que cumpre isso; um nó com ícone e sem texto ao lado
    // seria exatamente a violação.
    for (const node of treeView(withPoints(70)).flatMap((branch) => branch.nodes)) {
      expect(node.statusIcon.trim().length).toBeGreaterThan(0);
      expect(node.statusLabel.trim().length).toBeGreaterThan(0);
    }
  });

  it('os quatro estados têm rótulos diferentes entre si', () => {
    // Se "Bloqueado" e "PAC insuficiente" dissessem a mesma coisa, ter separado
    // os dois estados não teria servido para nada.
    const poor = treeView(withPoints(0));
    const rich = treeView(unlockSkill(withPoints(1_000), 'solar'));

    const labels = [
      nodeOf(poor, 'solar').statusLabel, // unaffordable
      nodeOf(poor, 'wind').statusLabel, // locked
      nodeOf(rich, 'solar').statusLabel, // unlocked
      nodeOf(rich, 'wind').statusLabel, // available
    ];

    expect(new Set(labels).size).toBe(4);
  });

  it('o texto do nó vem do skills.json intacto', () => {
    // O pacote [D-Historia] edita name, description e fact sem abrir um .ts. Se
    // a UI reescrevesse esses campos, a edição dele não chegaria na tela.
    const node = nodeOf(treeView(withPoints(0)), 'solar');
    const source = skills.find((skill) => skill.id === 'solar');

    expect(node.name).toBe(source?.name);
    expect(node.description).toBe(source?.description);
    expect(node.fact).toBe(source?.fact);
  });

  it('nenhum campo de texto sai vazio', () => {
    for (const node of treeView(withPoints(0)).flatMap((branch) => branch.nodes)) {
      for (const field of ['name', 'cost', 'description', 'fact'] as const) {
        expect(node[field].trim().length).toBeGreaterThan(0);
      }
    }
  });

  it('ACEITE: pré-requisito, custo e os estados bloqueado / disponível / comprado', () => {
    // O aceite do P6-06, numa partida só.
    let state = withPoints(40);

    expect(nodeOf(treeView(state), 'solar').status).toBe('available');
    expect(nodeOf(treeView(state), 'wind').status).toBe('locked');

    state = unlockSkill(state, 'solar');

    expect(state.actionPoints).toBe(0);
    expect(nodeOf(treeView(state), 'solar').status).toBe('unlocked');
    // O pré-requisito caiu, mas o custo não: agora falta PAC, e o texto muda.
    expect(nodeOf(treeView(state), 'wind').status).toBe('unaffordable');
    expect(nodeOf(treeView(state), 'wind').detail).toBe('Faltam 70 PAC');
  });
});

describe('treeButtonView', () => {
  /**
   * O botão da barra de baixo (VIS-04) mostra o PAC ao lado do HUD. Os dois
   * números ficam a poucos centímetros um do outro, e um arredondamento
   * diferente seria o jeito de a tela se contradizer.
   */
  it('mostra o mesmo PAC do HUD, arredondado para baixo', () => {
    for (const pontos of [0, 39.9, 40, 125.4, 999.99]) {
      const state = withPoints(pontos);
      expect(treeButtonView(state).points, String(pontos)).toBe(
        ui.treeButton.points(hudView(state).actionPoints),
      );
    }

    expect(treeButtonView(withPoints(39.9)).points).toContain('39');
  });
});

describe('skillDetailView', () => {
  /**
   * O detalhe do VIS-05. Ele sai da view da árvore, então herda dela os
   * estados e as frases de recusa — o que se testa aqui é o que ele acrescenta:
   * a linha de estado, o texto do botão de compra e quando ele compra.
   */
  const detalhe = (state: GameState, id: string, finished = false) => {
    const view = skillDetailView(treeView(state), id, finished);
    if (view === null) throw new Error('o detalhe saiu vazio.');
    return view;
  };

  it('um nó disponível oferece a compra, com o preço', () => {
    const view = detalhe(withPoints(40), 'solar');

    expect(view.canBuy).toBe(true);
    expect(view.buy).toBe(ui.tree.detail.buy('40 PAC'));
    expect(view.state).toBe('Disponível · 40 PAC');
    expect(view.branch).toBe(ui.tree.branches.energy);
  });

  it('sem PAC, o botão diz quanto falta, arredondado para cima', () => {
    const view = detalhe(withPoints(39.5), 'solar');

    expect(view.canBuy).toBe(false);
    expect(view.buy).toBe(ui.tree.missingPoints('1'));
  });

  it('bloqueado, o botão diz o que falta comprar antes', () => {
    const view = detalhe(withPoints(10_000), 'wind');

    expect(view.canBuy).toBe(false);
    expect(view.buy).toBe(ui.tree.requires(['Energia solar em escala']));
  });

  it('comprado, o botão diz que já é seu', () => {
    const view = detalhe(unlockSkill(withPoints(40), 'solar'), 'solar');

    expect(view.canBuy).toBe(false);
    expect(view.buy).toBe(ui.tree.detail.bought);
    expect(view.status).toBe('unlocked');
  });

  /**
   * Depois do fim a árvore vira histórico. Um "Comprar" que não compra nada
   * seria mentira; o que foi comprado continua dizendo que foi.
   */
  it('com a partida acabada, nada se compra, e o comprado continua comprado', () => {
    const state = unlockSkill(withPoints(1000), 'solar');

    expect(detalhe(state, 'wind', true).canBuy).toBe(false);
    expect(detalhe(state, 'wind', true).buy).toBe(ui.tree.detail.finished);
    expect(detalhe(state, 'solar', true).buy).toBe(ui.tree.detail.bought);
  });

  it('o fato real vem sempre, comprado ou não', () => {
    // Decidido no chat em 2026-09-17: o fato aparece antes da compra.
    for (const skill of skills) {
      expect(detalhe(withPoints(0), skill.id).fact, skill.id).toBe(skill.fact);
    }
  });

  it('um id que a árvore não conhece cai no primeiro nó, e não em erro', () => {
    expect(detalhe(withPoints(0), 'nao-existe').id).toBe(skills[0]?.id);
  });

  it('só compra quando o engine deixaria comprar', () => {
    // O detalhe não tem regra própria: ele diz "pode" exatamente quando o
    // `unlockSkill` não devolve o estado intacto.
    for (const pontos of [0, 40, 70, 200]) {
      const state = unlockSkill(withPoints(pontos), 'solar');
      for (const skill of skills) {
        const compra = unlockSkill(state, skill.id) !== state;
        expect(detalhe(state, skill.id).canBuy, `${skill.id} com ${pontos}`).toBe(compra);
      }
    }
  });
});

describe('os pais de cada nó', () => {
  it('a view traz os pré-requisitos do arquivo, para as ligações do losango', () => {
    for (const skill of skills) {
      expect(nodeOf(treeView(withPoints(0)), skill.id).requires).toEqual(skill.requires);
    }
  });
});
