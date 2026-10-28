// @vitest-environment jsdom

import { readFileSync } from 'node:fs';

import { describe, expect, it, vi } from 'vitest';

import { ui } from '../src/data/i18n';
import { bubbleKeyOf } from '../src/engine/bubbles';
import {
  balance,
  createInitialState,
  REGION_IDS,
  type Bubble,
  type GameState,
  type RegionId,
} from '../src/engine/state';
import { bubblesView, bubblesWorth, renderBubbles } from '../src/ui/bubbles';
import { LABEL_ANCHORS, MAP_CROP_HEIGHT, MAP_SIZE } from '../src/ui/map-geometry';
import { bubbleHost, mapView, mountMap } from '../src/ui/map';

/**
 * As bolhas de PAC na tela (INTER-04).
 *
 * A mecânica está no tests/bubbles.test.ts, em node. Aqui só o que não existe
 * sem DOM: o botão de verdade, o clique que volta com a chave certa, a posição
 * no palco do mapa e as exigências do §5 do GDD — alvo focável, valor escrito,
 * prazo escrito, ícone como decoração.
 */

function bubble(target: Bubble['target'], value = 5.75, ticksRemaining = balance.bubbleTicks) {
  return { target, value, ticksRemaining } satisfies Bubble;
}

function withBubbles(...bubbles: readonly Bubble[]): GameState {
  return { ...createInitialState(2025), tick: 100, bubbles };
}

/** Monta o mapa (que cria a camada) e devolve a camada das bolhas. */
function mount(): HTMLElement {
  const root = document.createElement('section');
  document.body.replaceChildren(root);
  mountMap(root, mapView(createInitialState(2025), null), () => {});

  const host = bubbleHost(root);
  if (host === null) throw new Error('o mapa não criou a camada das bolhas');
  return host;
}

function botões(host: ParentNode): readonly HTMLButtonElement[] {
  return Array.from(host.querySelectorAll<HTMLButtonElement>('button.bubble'));
}

describe('bubblesView', () => {
  it('escreve o valor com rótulo, e não só o desenho (§5)', () => {
    const [view] = bubblesView(withBubbles(bubble('af'))).bubbles;

    expect(view?.label).toBe(ui.bubbles.claim('6'));
    expect(view?.label).toContain('PAC');
  });

  /**
   * **Para o mais perto, e não para baixo como o PAC do HUD.** A regra do HUD
   * existe para o saldo nunca prometer o que a compra vai negar; aqui o número é
   * ganho, e uma bolha de 5,75 que anuncia "+5" e move o HUD de 78 para 84 faz o
   * jogador desconfiar da conta — medido no Edge, no jogo de verdade.
   */
  it('arredonda o valor para o mais perto', () => {
    expect(bubblesView(withBubbles(bubble('af', 5.75))).bubbles[0]?.label).toBe(
      ui.bubbles.claim('6'),
    );
    expect(bubblesView(withBubbles(bubble('af', 6.2))).bubbles[0]?.label).toBe(
      ui.bubbles.claim('6'),
    );
  });

  it('a frase do leitor de tela diz o valor e a região', () => {
    const state = withBubbles(bubble('oc'));
    const [view] = bubblesView(state).bubbles;

    expect(view?.ariaLabel).toContain('6');
    expect(view?.ariaLabel).toContain(state.regions.oc.name);
  });

  it('a chave é a mesma que o engine reconhece', () => {
    const state = withBubbles(bubble('ea'));
    const [bolha] = state.bubbles;
    const [view] = bubblesView(state).bubbles;

    expect(bolha).toBeDefined();
    expect(view?.key).toBe(bolha === undefined ? '' : bubbleKeyOf(bolha, state.tick));
  });

  /** Nascem de 6 em 6 meses e vivem 12: duas na mesma região acontece. */
  it('separa duas bolhas que calharam na mesma região', () => {
    const view = bubblesView(withBubbles(bubble('af'), bubble('af'), bubble('eu')));

    expect(view.bubbles.map((b) => b.slot)).toEqual([0, 1, 0]);
  });

  it('marca as que estão nos últimos meses, e escreve o prazo', () => {
    const view = bubblesView(withBubbles(bubble('af', 5.75, 2), bubble('eu')));

    expect(view.bubbles[0]?.fading).toBe(true);
    expect(view.bubbles[1]?.fading).toBe(false);
    // O prazo vai escrito: "está sumindo" não pode ser só um pisca-pisca (§5).
    expect(view.bubbles[0]?.hint).toContain('2');
  });

  it('o singular do prazo não sai errado', () => {
    const [view] = bubblesView(withBubbles(bubble('af', 5.75, 1))).bubbles;

    expect(view?.hint).toContain('1 mês');
    expect(view?.hint).not.toContain('1 meses');
  });

  it('bubblesWorth soma o que o atalho recolheria', () => {
    expect(bubblesWorth(withBubbles(bubble('af', 5.75), bubble('eu', 6.25)))).toBeCloseTo(12, 10);
    expect(bubblesWorth(createInitialState(2025))).toBe(0);
  });
});

describe('as bolhas no DOM', () => {
  it('o mapa cria a camada, com rótulo para o leitor de tela', () => {
    const host = mount();

    expect(host.getAttribute('role')).toBe('group');
    expect(host.getAttribute('aria-label')).toBe(ui.bubbles.label);
    expect(botões(host)).toHaveLength(0);
  });

  it('cada bolha é um `button` de verdade, focável pelo teclado (§5)', () => {
    const host = mount();
    renderBubbles(host, bubblesView(withBubbles(bubble('af'))), () => {});

    const [botão] = botões(host);
    expect(botão?.tagName).toBe('BUTTON');
    expect(botão?.type).toBe('button');
    // Nada de `disabled` nem de `tabindex` negativo: o Tab precisa chegar nela.
    expect(botão?.hasAttribute('disabled')).toBe(false);
    expect(botão?.getAttribute('tabindex')).toBeNull();
  });

  it('pousa acima da etiqueta, longe do apoio e do chip de alerta', () => {
    const host = mount();
    renderBubbles(host, bubblesView(withBubbles(bubble('na'))), () => {});

    const [botão] = botões(host);
    expect(botão?.dataset.place).toBe('above');
    expect(botão?.style.left).toContain('%');
    expect(botão?.style.top).toContain('calc(');
    // Meia etiqueta, o chip, o fio de folga e meia bolha: 4,3625rem para cima.
    expect(botão?.style.top).toContain('- 4.3625rem');
  });

  /**
   * A Europa não tem altura para a bolha acima da etiqueta: o anchor dela está
   * a 13,5% da altura do desenho, e a bolha pede 5,675rem no mapa mais
   * estreito. Ali ela pousa à esquerda.
   */
  it('pousa ao lado onde não há altura acima', () => {
    const host = mount();
    renderBubbles(host, bubblesView(withBubbles(bubble('eu'))), () => {});

    const [botão] = botões(host);
    expect(botão?.dataset.place).toBe('left');
    expect(botão?.style.left).toContain('rem');
    expect(botão?.style.top).toContain('0rem');
  });
});

/**
 * O lugar de cada bolha, conferido contra as folhas de estilo.
 *
 * Mesmo cuidado do tests/map-geometry.test.ts: as medidas saem do CSS que a
 * tela usa, e a conta é refeita aqui do zero, a partir do que o botão pede ao
 * navegador (`style.left` e `style.top`). Se alguém mudar o padding da
 * etiqueta, a linha do chip ou a largura mínima do mundo, é aqui que o lugar da
 * bolha quebra — e não na feira.
 */
describe('o lugar da bolha, medido', () => {
  const medida = (arquivo: string, seletor: string, propriedade: string): string => {
    const folha = readFileSync(`src/ui/${arquivo}`, 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
    const regra = folha.split(`\n${seletor} {`)[1]?.split('}')[0] ?? '';
    const linha = regra
      .split(';')
      .map((parte) => parte.trim())
      .find((parte) => parte.startsWith(`${propriedade}:`));
    if (linha === undefined) throw new Error(`${arquivo} não define ${propriedade} em ${seletor}`);
    return linha.slice(propriedade.length + 1).trim();
  };
  /** O primeiro número de um valor — `0.25rem 0.6rem` → 0.25; `var(--x, 2.75rem)` → 2.75. */
  const rem = (valor: string): number => Number.parseFloat(/([\d.]+)rem/.exec(valor)?.[1] ?? '0');

  const tema = readFileSync('src/ui/theme.css', 'utf8');
  const MUNDO = Number(/--largura-mundo:\s*([\d.]+)rem;/.exec(tema)?.[1]);
  const ALTURA = (MUNDO * MAP_SIZE.height) / MAP_SIZE.width;
  const VISIVEL = (MUNDO * MAP_CROP_HEIGHT) / MAP_SIZE.width;

  const [acima = '', , abaixo = ''] = medida('map.css', '.map__label', 'padding').split(' ');
  const ETIQUETA =
    2 * Number.parseFloat(medida('map.css', '.map__label', 'line-height')) +
    rem(medida('map.css', '.map__label', 'gap')) +
    rem(acima) +
    rem(abaixo) +
    (2 * Number.parseFloat(medida('map.css', '.map__label', 'border'))) / 16;
  const CHIP = Number.parseFloat(medida('map.css', '.map__alert', 'line-height'));
  const BOLHA = rem(medida('bubbles.css', '.bubble', 'min-height'));
  const MIN_ETIQUETA = rem(medida('map.css', '.map__label', 'min-width'));

  it('as medidas saem do CSS, e não de um número lembrado', () => {
    expect(MUNDO).toBe(54);
    expect(ETIQUETA).toBeCloseTo(3.275, 2);
    expect(CHIP).toBe(1.25);
    expect(BOLHA).toBe(2.75);
    expect(MIN_ETIQUETA).toBe(8.5);
  });

  const nomes = createInitialState(1).regions;
  const largura = (id: RegionId) =>
    Math.max(MIN_ETIQUETA, (nomes[id].name.length + 1) * 0.58 + 1.25);

  /** A caixa da etiqueta, com o chip pendurado, em rem. */
  const caixaEtiqueta = (id: RegionId) => {
    const x = (LABEL_ANCHORS[id].x * MUNDO) / MAP_SIZE.width;
    const y = (LABEL_ANCHORS[id].y * MUNDO) / MAP_SIZE.width;
    const meia = largura(id) / 2;
    return { e: x - meia, d: x + meia, t: y - ETIQUETA / 2 - CHIP, b: y + ETIQUETA / 2 };
  };

  /** A caixa da bolha, lida do que o botão pede ao navegador. */
  const caixaBolha = (id: RegionId) => {
    const host = mount();
    renderBubbles(host, bubblesView(withBubbles(bubble(id))), () => {});
    const [botão] = botões(host);
    if (botão === undefined) throw new Error('a bolha não foi para a tela');

    const conta = (valor: string, total: number): number => {
      const fracao = Number.parseFloat(/([\d.]+)%/.exec(valor)?.[1] ?? '0') / 100;
      // O navegador normaliza "+ -8rem" para "- 8rem": o sinal vem separado.
      const parte = /([+-])\s*([\d.]+)rem/.exec(valor);
      const deslocamento = parte === null ? 0 : Number(parte[2]) * (parte[1] === '-' ? -1 : 1);
      return fracao * total + deslocamento;
    };
    const x = conta(botão.style.left, MUNDO);
    const y = conta(botão.style.top, ALTURA);
    return { e: x - 3.5, d: x + 3.5, t: y - BOLHA / 2, b: y + BOLHA / 2 };
  };

  const encosta = (um: { e: number; d: number; t: number; b: number }, outro: typeof um) =>
    um.e < outro.d && outro.e < um.d && um.t < outro.b && outro.t < um.b;

  it('toda bolha cabe inteira no que a moldura mostra', () => {
    for (const id of REGION_IDS) {
      const c = caixaBolha(id);
      expect(c.e, `${id} sai pela esquerda`).toBeGreaterThanOrEqual(0);
      expect(c.d, `${id} sai pela direita`).toBeLessThanOrEqual(MUNDO);
      expect(c.t, `${id} sai por cima`).toBeGreaterThanOrEqual(0);
      expect(c.b, `${id} sai por baixo`).toBeLessThanOrEqual(VISIVEL);
    }
  });

  it('nenhuma bolha cobre a própria etiqueta — o apoio continua legível', () => {
    for (const id of REGION_IDS) {
      expect(encosta(caixaBolha(id), caixaEtiqueta(id)), `${id} cobre a própria etiqueta`).toBe(
        false,
      );
    }
  });

  /**
   * Sete regiões saem limpas. A oitava é a Oceania, encurralada entre a Ásia
   * Meridional, a borda do desenho e a faixa da legenda: ela volta para cima e
   * encosta num canto da etiqueta vizinha. O teto de 12% é o que mantém esse
   * encosto sendo um canto — a linha do apoio da vizinha continua à vista.
   */
  it('só a Oceania encosta numa etiqueta vizinha, e só num canto', () => {
    const encostos = REGION_IDS.flatMap((id) => {
      const c = caixaBolha(id);
      return REGION_IDS.filter((outro) => outro !== id && encosta(c, caixaEtiqueta(outro))).map(
        (outro) => {
          const e = caixaEtiqueta(outro);
          const dx = Math.min(c.d, e.d) - Math.max(c.e, e.e);
          const dy = Math.min(c.b, e.b) - Math.max(c.t, e.t);
          return { id, outro, parte: (dx * dy) / (largura(outro) * (ETIQUETA + CHIP)) };
        },
      );
    });

    expect(encostos.map(({ id, outro }) => `${id}→${outro}`)).toEqual(['oc→sa']);
    for (const { id, outro, parte } of encostos) {
      expect(parte, `${id} cobre ${outro} demais`).toBeLessThan(0.12);
    }
  });

  it('o lugar escolhido de cada região está escrito', () => {
    const lugares = Object.fromEntries(
      REGION_IDS.map((id) => [id, bubblesView(withBubbles(bubble(id))).bubbles[0]?.placement]),
    );

    expect(lugares).toEqual({
      na: 'above',
      la: 'above',
      eu: 'left',
      af: 'below',
      me: 'left',
      ea: 'above',
      sa: 'right',
      oc: 'above',
    });
  });

  it('o clique devolve a chave da bolha', () => {
    const host = mount();
    const onClaim = vi.fn();
    const state = withBubbles(bubble('ea'));
    renderBubbles(host, bubblesView(state), onClaim);

    botões(host)[0]?.click();

    const [bolha] = state.bubbles;
    expect(onClaim).toHaveBeenCalledWith(bolha === undefined ? '' : bubbleKeyOf(bolha, state.tick));
  });

  it('o ícone é decoração: quem carrega o valor é o texto', () => {
    const host = mount();
    renderBubbles(host, bubblesView(withBubbles(bubble('af'))), () => {});

    const svg = botões(host)[0]?.querySelector('svg.icon');
    expect(svg?.getAttribute('aria-hidden')).toBe('true');
    expect(botões(host)[0]?.textContent).toContain('PAC');
  });

  it('a dica com o número está no `title` (§5)', () => {
    const host = mount();
    renderBubbles(host, bubblesView(withBubbles(bubble('af'))), () => {});

    expect(botões(host)[0]?.title).toBe(ui.bubbles.hint(balance.bubbleTicks));
  });

  /**
   * O foco de quem navega por teclado não pode ser arrancado a cada mês: a lista
   * só é reconstruída quando ela muda de verdade, como o boletim de eventos.
   */
  it('não recria os botões quando a lista não mudou', () => {
    const host = mount();
    const state = withBubbles(bubble('af'));

    renderBubbles(host, bubblesView(state), () => {});
    const antes = botões(host)[0];

    renderBubbles(host, bubblesView(state), () => {});
    expect(botões(host)[0]).toBe(antes);
  });

  it('atualiza o prazo e o aviso de fim sem recriar o botão', () => {
    const host = mount();
    renderBubbles(host, bubblesView(withBubbles(bubble('af'))), () => {});
    const antes = botões(host)[0];

    // A mesma bolha, dois meses depois do fim do prazo: mesma chave, outro aviso.
    const velha = { ...withBubbles(bubble('af', 5.75, 2)), tick: 100 + (balance.bubbleTicks - 2) };
    renderBubbles(host, bubblesView(velha), () => {});

    expect(botões(host)[0]).toBe(antes);
    expect(botões(host)[0]?.dataset.fading).toBe('');
  });

  it('a bolha recolhida sai da camada', () => {
    const host = mount();
    renderBubbles(host, bubblesView(withBubbles(bubble('af'))), () => {});
    renderBubbles(host, bubblesView(createInitialState(2025)), () => {});

    expect(botões(host)).toHaveLength(0);
  });

  /** Antes de o mapa existir, não há camada — e isso não pode derrubar o jogo. */
  it('sem camada, não faz nada e não lança', () => {
    expect(() =>
      renderBubbles(null, bubblesView(withBubbles(bubble('af'))), () => {}),
    ).not.toThrow();
  });
});
