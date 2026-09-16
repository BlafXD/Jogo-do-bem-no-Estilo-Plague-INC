// @vitest-environment jsdom

import { describe, expect, it, vi } from 'vitest';

import { ui } from '../src/data/i18n';
import { REGION_IDS, createInitialState, type GameState, type RegionId } from '../src/engine/state';
import { focusRegion, mapView, mountMap, renderMap } from '../src/ui/map';

/**
 * O mapa no DOM (P5-01; ilustrado desde o VIS-03).
 *
 * O texto e os números estão no tests/map.test.ts, e a geometria no
 * tests/map-geometry.test.ts, os dois em node. Aqui só o que não existe sem
 * DOM: o clique, o foco, as camadas do desenho e as exigências do §5 do GDD —
 * alvo focável, nome acessível, nada de estado comunicado só por cor.
 *
 * **O que este arquivo não alcança:** as máscaras. O jsdom não carrega imagem
 * nem implementa `<canvas>`, então o palco fica em `data-masks="pending"` o
 * tempo todo — e é exatamente o caminho de reserva que o mapa precisa ter.
 * Que as regiões acendem e o clique no desenho escolhe a região certa é
 * conferido no navegador, e está no PROGRESSO.md.
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

function label(root: ParentNode, id: RegionId): HTMLButtonElement {
  const found = root.querySelector<HTMLButtonElement>(`button[data-region="${id}"]`);
  if (found === null) throw new Error(`a etiqueta de ${id} não foi montada`);
  return found;
}

function layer(root: ParentNode, id: RegionId): HTMLElement {
  const found = root.querySelector<HTMLElement>(`[data-layer="${id}"]`);
  if (found === null) throw new Error(`a camada de ${id} não foi montada`);
  return found;
}

const stage = (root: ParentNode): HTMLElement => {
  const found = root.querySelector<HTMLElement>('.map__stage');
  if (found === null) throw new Error('o palco do mapa não foi montado');
  return found;
};

describe('o mapa montado', () => {
  it('tem rótulo acessível na seção', () => {
    expect(mount().getAttribute('aria-label')).toBe(ui.map.label);
  });

  it('escreve o intro da seção', () => {
    expect(mount().querySelector('.map__intro')?.textContent).toBe(ui.map.intro);
  });

  it('desenha o mapa-múndi como imagem decorativa — quem fala são as etiquetas', () => {
    const imagens = mount().querySelectorAll('img');

    // A de baixo é o mapa; a de cima é a mesma imagem, secando com o calor.
    expect(imagens).toHaveLength(2);
    for (const imagem of imagens) {
      expect(imagem.getAttribute('src')).toMatch(/world/);
      expect(imagem.getAttribute('alt')).toBe('');
    }
  });

  it('monta uma etiqueta e uma camada por região', () => {
    const root = mount();

    expect(root.querySelectorAll('button[data-region]')).toHaveLength(REGION_IDS.length);
    expect(root.querySelectorAll('[data-layer]')).toHaveLength(REGION_IDS.length);
  });

  it('esconde as camadas do leitor de tela: são desenho', () => {
    for (const id of REGION_IDS) {
      expect(layer(mount(), id).getAttribute('aria-hidden'), id).toBe('true');
    }
  });

  it('mostra o nome e o apoio de cada região em texto', () => {
    const africa = label(
      mount(() => {}, comApoio('af', 23)),
      'af',
    );

    expect(africa.querySelector('.map__name')?.textContent).toBe('África');
    expect(africa.querySelector('[data-map="support"]')?.textContent).toBe(ui.map.support('23'));
  });

  it('põe cada etiqueta no seu ponto do desenho', () => {
    const view = mapView(start(), null);
    const root = mount();

    for (const cell of view.cells) {
      expect(label(root, cell.id).style.left, cell.id).toBe(`${cell.anchor.left * 100}%`);
      expect(label(root, cell.id).style.top, cell.id).toBe(`${cell.anchor.top * 100}%`);
    }
  });

  /**
   * Sem canvas, o mapa não tem máscara — e precisa continuar inteiro. É o caso
   * do jsdom, e seria o de um navegador que não deixasse ler os pixels.
   */
  it('começa sem máscaras e não pede canvas enquanto a imagem não carregou', () => {
    const getContext = vi.spyOn(HTMLCanvasElement.prototype, 'getContext');
    const root = mount();

    expect(stage(root).dataset.masks).toBe('pending');
    expect(getContext).not.toHaveBeenCalled();
    getContext.mockRestore();
  });
});

describe('a etiqueta como alvo de clique', () => {
  /**
   * O P5-01 usava `<g role="button">` e tratava Enter e Espaço à mão. Um botão
   * de verdade traz o teclado de graça — e o atalho de pausa do main.ts já deixa
   * passar as teclas que nascem num `HTMLButtonElement`.
   */
  it('é um botão de verdade, que não envia formulário', () => {
    const africa = label(mount(), 'af');

    expect(africa).toBeInstanceOf(HTMLButtonElement);
    expect(africa.type).toBe('button');
  });

  it('carrega o nome, o apoio e o alerta na frase do leitor de tela', () => {
    const africa = label(
      mount(() => {}, comApoio('af', 23)),
      'af',
    );

    // 23 está abaixo do piso de apatia, então a frase leva o alerta junto
    // (P7-04): quem não enxerga o mapa fica sabendo que a região foi furada
    // pelo mesmo caminho por que fica sabendo o apoio dela.
    expect(africa.getAttribute('aria-label')).toBe(
      ui.map.cell('África', '23') + ui.map.alert.said(ui.map.alert.support.label),
    );
  });

  it('sem alerta, a frase não ganha sobra nenhuma', () => {
    const africa = label(
      mount(() => {}, comApoio('af', 60)),
      'af',
    );

    expect(africa.getAttribute('aria-label')).toBe(ui.map.cell('África', '60'));
  });

  it('avisa quem escolheu, com o id da região — uma vez só', () => {
    const onSelect = vi.fn();
    label(mount(onSelect), 'eu').click();

    // O palco também escuta clique; se ele contasse este, a região seria
    // escolhida e desmarcada no mesmo gesto.
    expect(onSelect).toHaveBeenCalledExactlyOnceWith('eu');
  });

  it('um clique no desenho sem máscara não escolhe nada', () => {
    const onSelect = vi.fn();
    stage(mount(onSelect)).dispatchEvent(new MouseEvent('click', { bubbles: true }));

    expect(onSelect).not.toHaveBeenCalled();
  });

  it('esconde o medidor do leitor de tela — o apoio já está na frase', () => {
    const medidor = label(mount(), 'af').querySelector('[data-map="meter"]');

    expect(medidor?.getAttribute('aria-hidden')).toBe('true');
  });
});

describe('a região escolhida', () => {
  it('nasce sem nenhuma escolhida', () => {
    const root = mount();

    for (const id of REGION_IDS) {
      expect(label(root, id).getAttribute('aria-pressed'), id).toBe('false');
    }
  });

  it('marca só a escolhida, na etiqueta e na camada', () => {
    const root = mount();
    renderMap(root, mapView(start(), 'sa'));

    for (const id of REGION_IDS) {
      const escolhida = id === 'sa';
      expect(label(root, id).dataset.selected, id).toBe(String(escolhida));
      expect(label(root, id).getAttribute('aria-pressed'), id).toBe(String(escolhida));
      expect(layer(root, id).dataset.state?.split(' ').includes('selected'), id).toBe(escolhida);
    }
  });

  /**
   * §5 do GDD, aplicado à seleção: além da cor, a etiqueta escolhida ganha borda
   * grossa (no CSS) e um marcador escrito. Tire as cores da tela e ainda dá para
   * ver qual está escolhida.
   */
  it('ganha um marcador visível, e o perde ao ser desmarcada', () => {
    const root = mount();
    const marcador = () => label(root, 'sa').querySelector('[data-map="marker"]')?.textContent;

    renderMap(root, mapView(start(), 'sa'));
    expect(marcador()).toBe(ui.map.selectedMarker);

    renderMap(root, mapView(start(), null));
    expect(marcador()).toBe('');
  });

  it('esconde o marcador do leitor de tela — quem diz isso é o aria-pressed', () => {
    const marker = label(mount(), 'sa').querySelector('[data-map="marker"]');

    expect(marker?.getAttribute('aria-hidden')).toBe('true');
  });
});

describe('o mapa redesenhado', () => {
  it('atualiza o apoio e o medidor quando a partida muda', () => {
    const root = mount();
    const apoio = () => label(root, 'af').querySelector('[data-map="support"]')?.textContent;
    const medidor = () =>
      label(root, 'af')
        .querySelector<HTMLElement>('[data-map="meter"]')
        ?.style.getPropertyValue('--apoio');

    expect(apoio()).toBe(ui.map.support('50'));
    expect(medidor()).toBe('50%');

    renderMap(root, mapView(comApoio('af', 11), null));
    expect(apoio()).toBe(ui.map.support('11'));
    expect(medidor()).toBe('11%');
    expect(label(root, 'af').dataset.level).toBe('low');
  });

  it('atualiza também a frase do leitor de tela', () => {
    const root = mount();
    renderMap(root, mapView(comApoio('af', 11), null));

    expect(label(root, 'af').getAttribute('aria-label')).toBe(
      ui.map.cell('África', '11') + ui.map.alert.said(ui.map.alert.support.label),
    );
  });

  /**
   * O mapa redesenha a cada mês de jogo — a cada 1,5 s na velocidade 1x.
   * Recriar as etiquetas arrancaria o foco do teclado de quem estivesse
   * navegando por elas.
   */
  it('atualiza as etiquetas em vez de recriá-las', () => {
    const root = mount();
    const antes = label(root, 'af');
    antes.focus();

    renderMap(root, mapView(comApoio('af', 11), 'af'));

    expect(label(root, 'af')).toBe(antes);
    expect(document.activeElement).toBe(antes);
  });

  it('continua respondendo ao clique depois de redesenhado', () => {
    const onSelect = vi.fn();
    const root = mount(onSelect);

    renderMap(root, mapView(comApoio('af', 11), 'af'));
    label(root, 'af').click();

    expect(onSelect).toHaveBeenCalledExactlyOnceWith('af');
  });
});

/**
 * Devolver o foco ao mapa (P5-04).
 *
 * O painel de detalhe fecha e o botão que tinha o foco some da tela. Sem isto o
 * foco cairia no `<body>`, e quem navega por teclado voltaria ao começo da
 * página.
 */
describe('focusRegion', () => {
  it('põe o foco do teclado na etiqueta da região', () => {
    const root = mount();

    expect(focusRegion(root, 'af')).toBe(true);
    expect(document.activeElement).toBe(label(root, 'af'));
  });

  it('avisa em vez de falhar calado quando a região não está na tela', () => {
    expect(focusRegion(document.createElement('section'), 'af')).toBe(false);
  });
});

describe('o aquecimento e os alertas no desenho (P7-04)', () => {
  const alertOf = (root: ParentNode, id: RegionId): HTMLElement | null =>
    label(root, id).querySelector('[data-map="alert"]');

  it('a faixa e o nível de calor vivem no palco, e não repetidos em cada região', () => {
    // Oito lugares para o mesmo valor são oito chances de ele ficar
    // dessincronizado por um quadro.
    const root = mount(() => {}, { ...start(), temperature: 2.9 });

    expect(stage(root).dataset.heat).toBe('over');
    expect(root.querySelectorAll('[data-heat]')).toHaveLength(1);
    expect(Number(stage(root).style.getPropertyValue('--calor'))).toBeGreaterThan(0.9);
  });

  it('a legenda escrita acompanha o desenho', () => {
    const root = mount();
    const legenda = (): string => root.querySelector('[data-map="heat"]')?.textContent ?? '';

    expect(legenda()).toContain('ouro');
    expect(stage(root).style.getPropertyValue('--calor')).toBe('0.000');

    renderMap(root, mapView({ ...start(), temperature: 2.9 }, null));
    expect(stage(root).dataset.heat).toBe('over');
    expect(legenda()).toContain('2,55');
  });

  it('o alerta aparece com ícone e palavra, e some quando passa', () => {
    const root = mount();

    expect(alertOf(root, 'af')?.textContent).toBe('');

    renderMap(root, mapView(comApoio('af', 5), null));
    const escrito = alertOf(root, 'af')?.textContent ?? '';
    expect(escrito).toContain(ui.map.alert.support.icon);
    expect(escrito).toContain(ui.map.alert.support.label);
    expect(alertOf(root, 'af')?.getAttribute('data-alert')).toBe('support');
    expect(layer(root, 'af').dataset.state).toBe('low');

    // O mês seguinte cura a região: o alerta e a hachura precisam sumir juntos.
    renderMap(root, mapView(comApoio('af', 60), null));
    expect(alertOf(root, 'af')?.textContent).toBe('');
    expect(alertOf(root, 'af')?.hasAttribute('data-alert')).toBe(false);
    expect(layer(root, 'af').dataset.state).toBe('');
  });

  it('a região atingida por evento pulsa, e continua com hachura se o apoio furou', () => {
    const state: GameState = {
      ...comApoio('af', 5),
      activeEvents: [{ eventId: 'drought', target: 'af', ticksRemaining: 2 }],
    };
    const root = mount(() => {}, state);

    expect(layer(root, 'af').dataset.state?.split(' ').sort()).toEqual(['event', 'low']);
    expect(alertOf(root, 'af')?.getAttribute('data-alert')).toBe('event');
  });

  it('o alerta e o marcador de seleção convivem', () => {
    const root = mount(() => {}, comApoio('af', 5), 'af');

    expect(label(root, 'af').querySelector('[data-map="marker"]')?.textContent).toBe(
      ui.map.selectedMarker,
    );
    expect(alertOf(root, 'af')?.textContent).toContain(ui.map.alert.support.label);
  });

  it('redesenhar não cria um segundo elemento de alerta', () => {
    const root = mount();

    for (let i = 0; i < 5; i++) renderMap(root, mapView(comApoio('af', 5), null));

    expect(label(root, 'af').querySelectorAll('[data-map="alert"]')).toHaveLength(1);
  });
});
