// @vitest-environment jsdom

import { describe, expect, it, vi } from 'vitest';

import { ui } from '../src/data/i18n';
import { REGION_IDS, createInitialState, type GameState, type RegionId } from '../src/engine/state';
import { mapView, mountMap, renderMap } from '../src/ui/map';

/**
 * O mapa no DOM (P5-01).
 *
 * A geometria e o texto estão no tests/map.test.ts, que roda em node. Aqui só o
 * que não existe sem DOM: o clique, o teclado, e as exigências do §5 do GDD —
 * alvo focável, nome acessível, nada de estado comunicado só por cor.
 */

const start = (): GameState => createInitialState(2025);

function comApoio(id: RegionId, support: number): GameState {
  const base = start();
  return { ...base, regions: { ...base.regions, [id]: { ...base.regions[id], support } } };
}

function mount(
  onSelect: (id: RegionId) => void = () => {},
  state: GameState = start(),
  selected: RegionId | null = null,
): HTMLElement {
  const root = document.createElement('section');
  document.body.replaceChildren(root);
  mountMap(root, mapView(state, selected), onSelect);
  return root;
}

function region(root: ParentNode, id: RegionId): SVGGElement {
  const found = root.querySelector<SVGGElement>(`[data-region="${id}"]`);
  if (found === null) throw new Error(`a região ${id} não foi montada`);
  return found;
}

function press(target: Element, key: string): KeyboardEvent {
  const event = new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true });
  target.dispatchEvent(event);
  return event;
}

describe('o mapa montado', () => {
  it('tem rótulo acessível na seção', () => {
    expect(mount().getAttribute('aria-label')).toBe(ui.map.label);
  });

  it('desenha um SVG com viewBox, e não uma imagem de tamanho fixo', () => {
    const canvas = mount().querySelector('svg');

    expect(canvas).not.toBeNull();
    expect(canvas?.getAttribute('viewBox')).toBe('0 0 1000 620');
    // Sem width nem height fixos: quem manda no tamanho é o CSS, que é o que
    // deixa o desenho acompanhar a tela sem o texto perder o piso de 16px.
    expect(canvas?.hasAttribute('width')).toBe(false);
    expect(canvas?.hasAttribute('height')).toBe(false);
  });

  it('desenha as 8 regiões, cada uma com a própria forma', () => {
    const root = mount();

    expect(root.querySelectorAll('[data-region]')).toHaveLength(REGION_IDS.length);

    for (const id of REGION_IDS) {
      expect(region(root, id).querySelector('rect')).not.toBeNull();
    }
  });

  it('escreve o intro da seção', () => {
    expect(mount().querySelector('.map__intro')?.textContent).toBe(ui.map.intro);
  });

  it('mostra o nome e o apoio de cada região em texto', () => {
    const root = mount(() => {}, comApoio('af', 23));
    const africa = region(root, 'af');

    expect(africa.querySelector('.map__name')?.textContent).toBe('África');
    expect(africa.querySelector('.map__support')?.textContent).toBe(ui.map.support('23'));
  });

  it('quebra o nome em tspans quando ele não cabe numa linha', () => {
    const spans = region(mount(), 'na').querySelectorAll('.map__name tspan');

    expect([...spans].map((span) => span.textContent)).toEqual(['América', 'do Norte']);
  });
});

describe('a região como alvo de clique', () => {
  it('anuncia-se como botão e entra na ordem de tabulação', () => {
    const africa = region(mount(), 'af');

    expect(africa.getAttribute('role')).toBe('button');
    expect(africa.getAttribute('tabindex')).toBe('0');
  });

  it('carrega o nome e o apoio na frase do leitor de tela', () => {
    const africa = region(
      mount(() => {}, comApoio('af', 23)),
      'af',
    );

    expect(africa.getAttribute('aria-label')).toBe(ui.map.cell('África', '23'));
  });

  it('avisa quem escolheu, com o id da região', () => {
    const onSelect = vi.fn();
    region(mount(onSelect), 'eu').dispatchEvent(new MouseEvent('click', { bubbles: true }));

    expect(onSelect).toHaveBeenCalledExactlyOnceWith('eu');
  });

  it('responde a Enter e à barra de espaço, como um botão de verdade', () => {
    for (const key of ['Enter', ' ']) {
      const onSelect = vi.fn();
      press(region(mount(onSelect), 'oc'), key);

      expect(onSelect, key).toHaveBeenCalledExactlyOnceWith('oc');
    }
  });

  it('ignora as outras teclas', () => {
    const onSelect = vi.fn();
    const oceania = region(mount(onSelect), 'oc');

    for (const key of ['Tab', 'a', 'Escape', '1', 'ArrowRight']) press(oceania, key);

    expect(onSelect).not.toHaveBeenCalled();
  });

  /**
   * O preço escondido de usar `<g role="button">` em vez de um `<button>`.
   *
   * O main.ts escuta Espaço no `document` para pausar o jogo, e a guarda de lá
   * deixa passar tudo que não for `HTMLButtonElement` — um `<g>` não é. Sem o
   * `stopPropagation`, escolher uma região pelo teclado pausaria a partida
   * junto, e o jogador não teria como ligar uma coisa à outra.
   */
  it('não deixa a tecla escapar para o atalho de pausa do documento', () => {
    const noDocumento = vi.fn();
    document.addEventListener('keydown', noDocumento);

    press(region(mount(), 'oc'), ' ');

    expect(noDocumento).not.toHaveBeenCalled();
    document.removeEventListener('keydown', noDocumento);
  });

  it('impede a rolagem que a barra de espaço causaria', () => {
    expect(press(region(mount(), 'oc'), ' ').defaultPrevented).toBe(true);
  });
});

describe('a região escolhida', () => {
  it('nasce sem nenhuma escolhida', () => {
    const root = mount();

    for (const id of REGION_IDS) {
      expect(region(root, id).getAttribute('aria-pressed'), id).toBe('false');
    }
  });

  it('marca só a escolhida, para o CSS e para o leitor de tela', () => {
    const root = mount();
    renderMap(root, mapView(start(), 'sa'));

    for (const id of REGION_IDS) {
      const escolhida = id === 'sa';
      expect(region(root, id).dataset.selected, id).toBe(String(escolhida));
      expect(region(root, id).getAttribute('aria-pressed'), id).toBe(String(escolhida));
    }
  });

  /**
   * §5 do GDD, aplicado à seleção: além da cor do traço, que o map.css muda, a
   * região escolhida ganha um marcador visível dentro da forma. Tire as cores
   * da tela e ainda dá para ver qual está escolhida.
   */
  it('ganha um marcador visível, e o perde ao ser desmarcada', () => {
    const root = mount();
    const marcador = () => region(root, 'sa').querySelector('[data-map="marker"]')?.textContent;

    renderMap(root, mapView(start(), 'sa'));
    expect(marcador()).toBe(ui.map.selectedMarker);

    renderMap(root, mapView(start(), null));
    expect(marcador()).toBe('');
  });

  it('esconde o marcador do leitor de tela — quem diz isso é o aria-pressed', () => {
    const marker = region(mount(), 'sa').querySelector('[data-map="marker"]');

    expect(marker?.getAttribute('aria-hidden')).toBe('true');
  });
});

describe('o mapa redesenhado', () => {
  it('atualiza o apoio quando ele muda na partida', () => {
    const root = mount();
    const apoio = () => region(root, 'af').querySelector('.map__support')?.textContent;

    expect(apoio()).toBe(ui.map.support('50'));

    renderMap(root, mapView(comApoio('af', 11), null));
    expect(apoio()).toBe(ui.map.support('11'));
  });

  it('atualiza também a frase do leitor de tela', () => {
    const root = mount();
    renderMap(root, mapView(comApoio('af', 11), null));

    expect(region(root, 'af').getAttribute('aria-label')).toBe(ui.map.cell('África', '11'));
  });

  /**
   * O mapa redesenha a cada mês de jogo — a cada 1,5 s na velocidade 1x.
   * Recriar os grupos arrancaria o foco do teclado de quem estivesse navegando
   * pelas regiões, e a tabulação voltaria ao começo da página sozinha.
   */
  it('atualiza os grupos em vez de recriá-los', () => {
    const root = mount();
    const antes = region(root, 'af');

    renderMap(root, mapView(comApoio('af', 11), 'af'));

    expect(region(root, 'af')).toBe(antes);
  });

  it('continua respondendo ao clique depois de redesenhado', () => {
    const onSelect = vi.fn();
    const root = mount(onSelect);

    renderMap(root, mapView(comApoio('af', 11), 'af'));
    region(root, 'af').dispatchEvent(new MouseEvent('click', { bubbles: true }));

    expect(onSelect).toHaveBeenCalledExactlyOnceWith('af');
  });
});
