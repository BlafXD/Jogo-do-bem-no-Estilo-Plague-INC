// @vitest-environment jsdom

import { describe, expect, it, vi } from 'vitest';

import { ui } from '../src/data/i18n';
import { createInitialState, type GameState, type RegionId } from '../src/engine/state';
import {
  CHARACTER_FIELDS,
  LIVE_FIELDS,
  mountRegionPanel,
  regionPanelView,
  renderRegionPanel,
} from '../src/ui/region-panel';

/**
 * O painel de detalhe no DOM (P5-04).
 *
 * A regra está no tests/region-panel.test.ts, que roda em node. Aqui só o que
 * não existe sem DOM: o botão de fechar, a troca entre as duas telas e as
 * exigências do §5 do GDD — dica em tudo que tem número, estrutura que um leitor
 * de tela consiga percorrer.
 */

const start = (): GameState => createInitialState(2025);

function mount(onClose: () => void = () => {}): HTMLElement {
  const root = document.createElement('section');
  document.body.replaceChildren(root);
  mountRegionPanel(root, onClose);
  return root;
}

function show(
  root: HTMLElement,
  selected: RegionId | null,
  state: GameState = start(),
): HTMLElement {
  renderRegionPanel(root, regionPanelView(state, selected));
  return root;
}

function part(root: ParentNode, name: string): HTMLElement {
  const found = root.querySelector<HTMLElement>(`[data-panel="${name}"]`);
  if (found === null) throw new Error(`o painel não tem a parte ${name}`);
  return found;
}

function field(root: ParentNode, name: string): HTMLElement {
  const found = root.querySelector<HTMLElement>(`[data-field="${name}"]`);
  if (found === null) throw new Error(`o painel não tem o campo ${name}`);
  return found;
}

function valueOf(root: ParentNode, name: string): string {
  return field(root, name).querySelector('[data-panel="value"]')?.textContent ?? '';
}

describe('o painel montado', () => {
  it('tem rótulo acessível na seção', () => {
    expect(mount().getAttribute('aria-label')).toBe(ui.regionPanel.label);
  });

  it('já traz as 6 linhas, antes de qualquer escolha', () => {
    const root = mount();

    for (const name of [...CHARACTER_FIELDS, ...LIVE_FIELDS]) {
      expect(field(root, name), name).not.toBeNull();
    }
  });

  it('escreve rótulo em <dt> e valor em <dd>, para o leitor de tela ligar os dois', () => {
    const linha = field(mount(), 'support');

    expect(linha.querySelector('dt')?.textContent).toBe(ui.regionPanel.fields.support.label);
    expect(linha.querySelector('[data-panel="value"]')?.tagName).toBe('DD');
  });

  /** §5 do GDD: dica em tudo que tem número. O alvo é a linha inteira. */
  it('põe a dica na linha inteira, e não só no rótulo', () => {
    for (const name of [...CHARACTER_FIELDS, ...LIVE_FIELDS]) {
      expect(field(mount(), name).title, name).toBe(ui.regionPanel.fields[name].hint);
    }
  });

  it('usa títulos de verdade, para dar por onde pular', () => {
    const root = mount();

    expect(part(root, 'name').tagName).toBe('H2');
    expect([...root.querySelectorAll('h3')].map((h) => h.textContent)).toEqual([
      ui.regionPanel.groups.character,
      ui.regionPanel.groups.live,
    ]);
  });
});

describe('sem região escolhida', () => {
  it('nasce mostrando a frase que ensina o clique', () => {
    const root = mount();

    expect(part(root, 'empty').hidden).toBe(false);
    expect(part(root, 'empty').textContent).toBe(ui.regionPanel.empty);
    expect(part(root, 'detail').hidden).toBe(true);
  });

  /**
   * Sem isto o `data-region` da última escolhida ficaria no DOM depois de
   * fechar, e o CSS — ou um teste — acreditaria que ela continua de pé.
   */
  it('apaga a região do detalhe ao fechar', () => {
    const root = show(mount(), 'af');
    expect(part(root, 'detail').dataset.region).toBe('af');

    show(root, null);
    expect(part(root, 'detail').dataset.region).toBeUndefined();
  });

  it('nunca mostra as duas telas ao mesmo tempo', () => {
    const root = mount();

    for (const escolha of [null, 'af', null, 'oc'] as const) {
      show(root, escolha);
      expect(part(root, 'empty').hidden).toBe(!part(root, 'detail').hidden);
    }
  });
});

describe('com uma região escolhida', () => {
  it('troca a frase pelo detalhe e escreve o nome', () => {
    const root = show(mount(), 'af');

    expect(part(root, 'empty').hidden).toBe(true);
    expect(part(root, 'detail').hidden).toBe(false);
    expect(part(root, 'name').textContent).toBe('África');
  });

  it('escreve os seis valores da região', () => {
    const root = show(mount(), 'af');

    expect(valueOf(root, 'population')).toBe(`1.479,0 ${ui.units.millions}`);
    expect(valueOf(root, 'cleanShare')).toBe('25%');
    expect(valueOf(root, 'emissions')).toBe(`2,71 ${ui.units.emissionsPerYear}`);
    expect(valueOf(root, 'support')).toBe(ui.regionPanel.scale('50'));
    expect(valueOf(root, 'resilience')).toBe(ui.regionPanel.scale('50'));
    expect(valueOf(root, 'economy')).toBe('100');
  });

  it('troca os números inteiros ao mudar de região', () => {
    const root = show(mount(), 'af');
    show(root, 'oc');

    expect(part(root, 'name').textContent).toBe('Oceania');
    expect(valueOf(root, 'emissions')).toBe(`0,56 ${ui.units.emissionsPerYear}`);
  });

  it('mostra a fatia do mundo só na emissão, e esconde as outras notas', () => {
    const root = show(mount(), 'ea');
    const nota = (name: string) =>
      field(root, name).querySelector<HTMLElement>('[data-panel="note"]');

    expect(nota('emissions')?.hidden).toBe(false);
    expect(nota('emissions')?.textContent).toContain('%');

    for (const name of ['population', 'cleanShare', 'support', 'resilience', 'economy']) {
      expect(nota(name)?.hidden, name).toBe(true);
      expect(nota(name)?.textContent, name).toBe('');
    }
  });
});

describe('o botão de fechar', () => {
  it('é um <button> de verdade, com dica que ensina o atalho', () => {
    const botao = part(show(mount(), 'af'), 'close');

    expect(botao.tagName).toBe('BUTTON');
    expect((botao as HTMLButtonElement).type).toBe('button');
    expect(botao.textContent).toBe(ui.regionPanel.close);
    expect(botao.title).toBe(ui.regionPanel.closeHint);
    expect(botao.title).toContain('Esc');
  });

  it('avisa quem quer fechar', () => {
    const onClose = vi.fn();
    part(show(mount(onClose), 'af'), 'close').click();

    expect(onClose).toHaveBeenCalledOnce();
  });

  it('continua funcionando depois de o painel ser redesenhado', () => {
    const onClose = vi.fn();
    const root = show(mount(onClose), 'af');

    show(root, 'oc');
    part(root, 'close').click();

    expect(onClose).toHaveBeenCalledOnce();
  });
});

describe('o painel redesenhado', () => {
  it('acompanha o apoio quando ele muda na partida', () => {
    const root = show(mount(), 'af');
    expect(valueOf(root, 'support')).toBe(ui.regionPanel.scale('50'));

    const base = start();
    const caiu = { ...base, regions: { ...base.regions, af: { ...base.regions.af, support: 11 } } };
    show(root, 'af', caiu);

    expect(valueOf(root, 'support')).toBe(ui.regionPanel.scale('11'));
  });

  /**
   * O painel redesenha a cada mês de jogo — a cada 1,5 s na velocidade 1x.
   * Recriar os nós arrancaria o foco de quem estivesse no botão de fechar.
   */
  it('atualiza os nós em vez de recriá-los', () => {
    const root = show(mount(), 'af');
    const antes = { linha: field(root, 'support'), botao: part(root, 'close') };

    show(root, 'oc');

    expect(field(root, 'support')).toBe(antes.linha);
    expect(part(root, 'close')).toBe(antes.botao);
  });

  it('sobrevive a um root sem painel montado, sem explodir', () => {
    const vazio = document.createElement('section');

    expect(() => renderRegionPanel(vazio, regionPanelView(start(), 'af'))).not.toThrow();
  });
});
