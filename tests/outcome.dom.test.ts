// @vitest-environment jsdom

import { describe, expect, it, vi } from 'vitest';
import { ui } from '../src/data/i18n';
import { MEDAL_CEILING } from '../src/engine/outcome';
import {
  balance,
  createInitialState,
  REGION_IDS,
  skills,
  type GameState,
  type Region,
  type RegionId,
} from '../src/engine/state';
import { TOTAL_TICKS } from '../src/engine/tick';
import { hudView } from '../src/ui/hud';
import { mountOutcome, outcomeView, renderOutcome } from '../src/ui/outcome';

/**
 * O cartão de fim de partida (P6-08).
 *
 * A regra está no tests/outcome.test.ts, que roda em node. Aqui só o que não
 * existe sem DOM: a seção esconder-se durante a partida, o clique do "Jogar de
 * novo", e as exigências do §5 do GDD — ícone com rótulo escrito ao lado,
 * nenhum controle focável escondido.
 */

const start = (): GameState => createInitialState(2025);

/** Uma partida terminada em 2100, na temperatura pedida. */
function ended(temperature: number): GameState {
  return { ...start(), tick: TOTAL_TICKS, year: balance.endYear, temperature };
}

function mount(onPlayAgain: () => void = () => {}): HTMLElement {
  const root = document.createElement('section');
  document.body.replaceChildren(root);
  mountOutcome(root, onPlayAgain);
  return root;
}

function textOf(root: ParentNode, slot: string): string {
  return root.querySelector(`[data-outcome="${slot}"]`)?.textContent ?? '';
}

function show(root: HTMLElement, state: GameState): HTMLElement {
  renderOutcome(root, outcomeView(state));
  return root;
}

describe('outcomeView', () => {
  it('devolve null enquanto a partida está em curso', () => {
    expect(outcomeView(start())).toBeNull();
  });

  it('os números do cartão são exatamente os do HUD', () => {
    // O cartão fica a poucos centímetros do HUD na tela. Formatar de novo aqui
    // seria a receita para o cartão dizer 2,48 °C enquanto o topo diz 2,5.
    const state = ended(2.4);
    const hud = hudView(state);
    const values = outcomeView(state)?.stats.map((stat) => stat.value) ?? [];

    expect(values).toContain(hud.year);
    expect(values).toContain(hud.temperature);
    expect(values).toContain(hud.emissions);
  });

  it('conta as habilidades compradas sobre o total da árvore', () => {
    const view = outcomeView(ended(2.4));
    const stat = view?.stats.find((s) => s.label === ui.outcome.skillsLabel);

    expect(stat?.value).toBe(ui.outcome.skillsValue('0', String(skills.length)));
  });

  it('o veredito cita o limiar que o balance.json manda, não um número fixo', () => {
    // Se a frase trouxesse "1,5 °C" escrito à mão, mudar o goldTemperature
    // deixaria o cartão mentindo sem nada quebrar.
    const view = outcomeView(ended(MEDAL_CEILING.gold - 0.01));

    expect(view?.verdict).toContain('1,5');
    expect(outcomeView(ended(2.4))?.verdict).toContain('2,5');
  });

  it('sem medalha, o limiar citado é o do bronze — o que a partida passou', () => {
    // Nasceu de um defeito plantado que passou em 234 de 234: trocar o teto do
    // bronze pelo do ouro nesta frase fazia o cartão dizer "Acima de 1,5 °C" a
    // quem terminou em 2,9. Verdade, mas inútil — o número que interessa é o da
    // medalha que escapou por pouco. Nenhum dos testes de veredito passava pelo
    // ramo "sem medalha", que é o único que usa esse limiar.
    const view = outcomeView(ended(MEDAL_CEILING.bronze + 0.4));

    expect(view?.verdict).toContain('2,5');
    expect(view?.verdict).not.toContain('1,5');
  });
});

describe('o cartão na tela', () => {
  it('nasce escondido e some de novo quando a partida recomeça', () => {
    const root = mount();

    expect(root.hidden).toBe(true);

    show(root, ended(2.4));
    expect(root.hidden).toBe(false);

    show(root, start());
    expect(root.hidden).toBe(true);
  });

  it('o botão de reiniciar sai da ordem de tabulação durante a partida', () => {
    // É por isso que quem esconde é o `hidden` da seção, e não um `display:
    // none` no CSS: um botão invisível mas focável é a armadilha que só quem
    // navega por teclado encontra — e este reinicia o jogo.
    const root = mount();
    const again = root.querySelector('button');

    expect(again).not.toBeNull();
    expect(root.hidden).toBe(true);
    // `offsetParent` não existe no jsdom; a checagem honesta é o atributo, que
    // é o que o navegador de fato honra para tirar da tabulação.
    expect(root.hasAttribute('hidden')).toBe(true);
  });

  it('o ícone nunca aparece sozinho: o rótulo escrito vem ao lado (§5)', () => {
    const root = show(mount(), ended(2.4));

    expect(textOf(root, 'icon')).toBe(ui.outcome.result.bronze.icon);
    expect(textOf(root, 'title')).toBe(ui.outcome.result.bronze.title);
    // E o ícone é decoração para quem usa leitor de tela — senão "🥉 Bronze"
    // seria anunciado duas vezes.
    expect(root.querySelector('[data-outcome="icon"]')?.getAttribute('aria-hidden')).toBe('true');
  });

  it('mostra a medalha certa em cada faixa de temperatura', () => {
    const root = mount();

    for (const [temperature, expected] of [
      [MEDAL_CEILING.gold - 0.01, ui.outcome.result.gold.title],
      [MEDAL_CEILING.silver - 0.01, ui.outcome.result.silver.title],
      [MEDAL_CEILING.bronze - 0.01, ui.outcome.result.bronze.title],
      [MEDAL_CEILING.bronze + 0.01, ui.outcome.result.none.title],
    ] as const) {
      show(root, ended(temperature));
      expect(textOf(root, 'title')).toBe(expected);
    }
  });

  /**
   * "3,0 °C", e não "3 °C" — mudou no P8-04.
   *
   * O limiar passou a sair do formatador único do `src/ui/format.ts`, com uma
   * casa decimal no mínimo. O número aqui é o mesmo do rótulo "Derrota · 3,0 °C"
   * do gráfico, e antes os dois o escreviam diferente porque cada arquivo tinha
   * o seu `Intl.NumberFormat`.
   */
  it('a derrota por temperatura diz o que aconteceu, por escrito', () => {
    const root = show(mount(), { ...start(), temperature: balance.loseTemperature + 0.5 });

    expect(textOf(root, 'title')).toBe(ui.outcome.result.defeat.title);
    expect(textOf(root, 'lead')).toBe(ui.outcome.ending.temperature(`3,0 ${ui.units.celsius}`));
  });

  it('a derrota por apoio tem texto próprio', () => {
    const regions: Partial<Record<RegionId, Region>> = {};
    for (const id of REGION_IDS) regions[id] = { ...start().regions[id], support: 0 };
    const root = show(mount(), { ...start(), regions: regions as Record<RegionId, Region> });

    expect(textOf(root, 'lead')).toBe(ui.outcome.ending.support);
  });

  it('o tom pinta o cartão sem ser o único a dizer o resultado', () => {
    const root = mount();
    const tone = (): string | undefined =>
      root.querySelector<HTMLElement>('[data-outcome="card"]')?.dataset.tone;

    show(root, ended(2.4));
    expect(tone()).toBe('medal');

    show(root, ended(2.9));
    expect(tone()).toBe('none');

    show(root, { ...start(), temperature: 3.5 });
    expect(tone()).toBe('defeat');

    // A prova de que a cor é reforço: em todos os três, o título escrito muda
    // junto. Tire o CSS da página e o cartão continua dizendo o que houve.
    expect(textOf(root, 'title')).toBe(ui.outcome.result.defeat.title);
  });

  it('os quatro números saem como pares termo/definição', () => {
    const root = show(mount(), ended(2.4));
    const terms = root.querySelectorAll('dt');
    const values = root.querySelectorAll('dd');

    expect(terms).toHaveLength(4);
    expect(values).toHaveLength(4);
    expect(terms[0]?.textContent).toBe(ui.hud.year.label);
  });

  it('rótulo e valor ficam agrupados, e não soltos na grade', () => {
    // Defeito real, achado no navegador e não pelos testes: com <dt> e <dd>
    // soltos dentro do <dl>, a grade dá uma célula a cada um. O cartão saiu com
    // "Emissões" no fim de uma linha e "46,7 Gt/ano" no começo da seguinte,
    // debaixo do rótulo de outro indicador — um cartão que atribui o valor
    // errado ao nome errado. Só a contagem de <dt> e <dd> não pegava.
    const root = show(mount(), ended(2.4));
    const pairs = root.querySelectorAll('.outcome__stat');

    expect(pairs).toHaveLength(4);
    for (const pair of pairs) {
      expect(pair.children).toHaveLength(2);
      expect(pair.children[0]?.tagName).toBe('DT');
      expect(pair.children[1]?.tagName).toBe('DD');
    }
  });

  it('redesenhar não empilha os números', () => {
    const root = mount();

    for (let i = 0; i < 5; i++) show(root, ended(2.4));

    expect(root.querySelectorAll('dt')).toHaveLength(4);
  });

  it('"Jogar de novo" chama o reinício', () => {
    const onPlayAgain = vi.fn();
    const root = show(mount(onPlayAgain), ended(2.4));

    root.querySelector('button')?.click();

    expect(onPlayAgain).toHaveBeenCalledTimes(1);
  });

  it('o gráfico da linha do tempo entra entre os números e os botões (P7-06)', () => {
    // A ordem é a leitura que o §2.7 quer: o resultado diz o que aconteceu, os
    // números dizem onde o mundo parou, e a curva diz quando cada coisa foi
    // decidida. Os botões são a saída da tela, não parte do que se lê.
    const root = show(mount(), ended(2.4));
    const card = root.querySelector('.outcome__card');
    const ordem = [...(card?.children ?? [])].map((node) => node.className);

    expect(ordem).toEqual([
      'outcome__said',
      'outcome__stats',
      'chart',
      'outcome__lookback',
      'outcome__realworld',
      'outcome__actions',
    ]);
  });

  it('o gráfico é redesenhado junto com o cartão', () => {
    const root = show(mount(), ended(2.4));
    const curva = root.querySelector('[data-chart="curve"]');

    expect(curva?.getAttribute('d')?.length ?? 0).toBeGreaterThan(0);
  });

  it('as duas seções novas têm cabeçalho de verdade, não parágrafo com cara de título', () => {
    // É o que faz um leitor de tela oferecer as seções na navegação por
    // cabeçalhos, em vez de obrigar a atravessar o cartão inteiro de cima a
    // baixo. Mesma regra do tree.ts.
    const root = show(mount(), ended(2.4));
    const titulos = [...root.querySelectorAll('.outcome__section-title')];

    expect(titulos).toHaveLength(2);
    for (const titulo of titulos) expect(titulo.tagName).toBe('H2');
  });

  it('lista as medalhas perdidas com o ano de cada uma', () => {
    const root = show(mount(), ended(2.4));
    const linha = root.querySelector('.outcome__lookback-item')?.textContent ?? '';

    expect(linha).toContain(ui.outcome.result.gold.title);
    expect(linha).toContain(ui.outcome.result.silver.title);
    expect(linha).toContain(String(balance.endYear));
    // 2,4 °C fica abaixo do teto do bronze: essa não foi perdida.
    expect(linha).not.toContain(ui.outcome.result.bronze.title);
  });

  it('a partida de ouro não lê "0 medalhas perdidas"', () => {
    // Frase que só existe para dizer que não há nada a dizer é o oposto do
    // 'curto, sem sermão' do §2.7.
    const root = show(mount(), ended(MEDAL_CEILING.gold - 0.01));
    const linha = root.querySelector('.outcome__lookback-item')?.textContent ?? '';

    expect(linha).toBe(ui.outcome.lookBack.keptAll('1,5 °C'));
  });

  it('não nomeia os ramos intocados quando nenhum foi tocado', () => {
    // Sem compra nenhuma os cinco estão zerados, e listar os cinco só repete,
    // com mais palavras, o que a linha da árvore acabou de dizer.
    const root = show(mount(), ended(2.4));
    const linhas = [...root.querySelectorAll('.outcome__lookback-item')].map((n) => n.textContent);

    expect(linhas.some((linha) => linha?.startsWith('Nenhuma compra'))).toBe(false);
  });

  it('nomeia os ramos intocados quando algum foi tocado', () => {
    const root = show(mount(), { ...ended(2.4), unlockedSkills: ['solar'] });
    const linhas = [...root.querySelectorAll('.outcome__lookback-item')].map((n) => n.textContent);
    const intocados = linhas.find((linha) => linha?.startsWith('Nenhuma compra')) ?? '';

    expect(intocados).toContain(ui.tree.branches.society);
    expect(intocados).not.toContain(ui.tree.branches.energy);
  });

  it('mostra três ações, cada uma com nome, o que fazer e o fato', () => {
    const root = show(mount(), ended(2.4));
    const acoes = [...root.querySelectorAll('.outcome__action')];

    expect(acoes).toHaveLength(3);
    for (const acao of acoes) {
      expect(acao.querySelector('.outcome__action-name')?.textContent?.trim()).toBeTruthy();
      expect(acao.querySelector('.outcome__action-description')?.textContent?.trim()).toBeTruthy();
      expect(acao.querySelector('.outcome__action-fact')?.textContent?.trim()).toBeTruthy();
    }
  });

  it('quem cobriu um ramo inteiro não recebe conselho sobre ele', () => {
    const energia = skills.filter((skill) => skill.branch === 'energy').map((skill) => skill.id);
    const root = show(mount(), { ...ended(2.4), unlockedSkills: energia });
    const ramos = [...root.querySelectorAll('.outcome__action')].map((n) =>
      n.getAttribute('data-branch'),
    );

    expect(ramos).not.toContain('energy');
  });

  it('redesenhar não empilha as seções novas', () => {
    const root = mount();

    for (let i = 0; i < 5; i++) show(root, ended(2.4));

    expect(root.querySelectorAll('.outcome__action')).toHaveLength(3);
    expect(root.querySelectorAll('.outcome__section-title')).toHaveLength(2);
  });

  it('o texto do cartão é anunciado por leitor de tela, o botão não', () => {
    const root = mount();
    const live = root.querySelector('[aria-live]');

    expect(live?.getAttribute('aria-live')).toBe('polite');
    // Região viva contendo controle faz alguns leitores reanunciarem o botão a
    // cada mudança. Ele fica de fora, de propósito.
    expect(live?.querySelector('button')).toBeNull();
  });
});
