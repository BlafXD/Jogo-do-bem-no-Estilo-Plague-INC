// O cartão de fim de partida (P6-08).
//
// Mesma divisão do hud.ts, do controls.ts e do tree.ts: `outcomeView` é **puro**
// — entra GameState, sai o cartão inteiro em texto — e só `mountOutcome` e
// `renderOutcome` tocam no DOM. O `document` nunca aparece no topo do módulo.
//
// **Esta UI não decide nada.** Quem diz se a partida acabou, e como, é o
// `outcomeOf` do engine; aqui só se escolhe a frase. Uma segunda leitura da
// regra do §2.7 seria o jeito de a tela e o engine discordarem em silêncio,
// exatamente como o tree.ts registra sobre os pré-requisitos.
//
// **Os números finais vêm do `hudView`, não de uma segunda formatação.** O
// cartão mostra ano, temperatura e emissões — os mesmos três que ficam no topo
// da tela. Formatá-los de novo aqui abriria a porta para o cartão dizer 2,48 °C
// enquanto o HUD, a dois centímetros de distância, diz outra coisa.
//
// **O cartão tem as três partes que o docs/GDD.md §2.7 pede** (P7-06): o
// gráfico da linha do tempo, o que ficou para trás e as 3 ações do mundo real.
// As três se apoiam no `history`, que toda partida preenche a um retrato por
// ano desde a entrega anterior.
//
// **Nenhuma das três é decidida aqui.** O gráfico sai do `timeline-chart.ts`, e
// o que ficou para trás e a escolha das ações saem do `engine/review.ts`. Este
// arquivo é o que junta e escreve — se ele passasse a decidir em que ano o ouro
// ficou para trás, essa conta existiria em dois lugares e o gráfico e o texto
// logo abaixo dele poderiam apontar anos diferentes.

import { ui } from '../data/i18n';
import { MEDALS, MEDAL_CEILING, outcomeOf, type Outcome } from '../engine/outcome';
import {
  crossings,
  purchasesByBranch,
  suggestedActions,
  unboughtCount,
  type RealWorldAction,
} from '../engine/review';
import { balance, skills, SKILL_BRANCHES, type GameState } from '../engine/state';
import { hudView } from './hud';
import {
  mountTimelineChart,
  renderTimelineChart,
  timelineChartView,
  type TimelineChartView,
} from './timeline-chart';

/** Um par rótulo/valor do rodapé do cartão. */
export type OutcomeStat = {
  readonly label: string;
  readonly value: string;
};

/**
 * O peso do resultado, para o CSS pintar o cartão.
 *
 * É **reforço**, nunca o recado: o §5 do GDD proíbe comunicar estado só por
 * cor, e quem diz o que aconteceu é o ícone mais o título escrito mais as duas
 * frases. Tire as cores da tela e o cartão continua legível — este campo só
 * evita que uma derrota e um ouro cheguem com exatamente a mesma cara num
 * estande visto de três metros de distância.
 */
export type OutcomeTone = 'medal' | 'none' | 'defeat';

export type OutcomeView = {
  readonly tone: OutcomeTone;
  /** Ícone do resultado. Nunca sozinho — anda sempre com o `title` ao lado. */
  readonly icon: string;
  /** "Ouro", "Sem medalha", "Derrota". */
  readonly title: string;
  /** Como a partida acabou, uma frase. */
  readonly lead: string;
  /** O que esse resultado significa, uma frase. */
  readonly verdict: string;
  readonly stats: readonly OutcomeStat[];
  /**
   * A geometria do gráfico da linha do tempo (P7-06).
   *
   * Entra na mesma vista, e não num segundo cálculo do lado do DOM, para o
   * `outcomeView` continuar sendo o que este arquivo diz que ele é: uma função
   * pura que recebe o estado e devolve o cartão inteiro. Quem monta a tela
   * nunca precisa do `GameState`.
   */
  readonly chart: TimelineChartView;
  /** O "o que ficou para trás" do §2.7, uma frase por linha. */
  readonly lookBack: readonly string[];
  /** As 3 ações do mundo real, já escolhidas pelo que esta partida deixou de lado. */
  readonly realWorld: readonly RealWorldAction[];
};

/**
 * Formata um limiar de temperatura para entrar numa frase.
 *
 * Sem casa decimal fixa, ao contrário do HUD: ali o número muda a cada mês e as
 * duas casas impedem que ele trema; aqui ele é uma constante do balanceamento e
 * "abaixo de 1,50 °C" só faz a frase ficar pior de ler.
 */
const threshold = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 2 });

function celsius(value: number): string {
  return `${threshold.format(value)} ${ui.units.celsius}`;
}

/**
 * O ícone, o título e o veredito de um desfecho.
 *
 * O `switch` é sobre a união discriminada do engine e cobre os três `kind`; se
 * o §2.7 ganhar um quarto desfecho, o `tsc` para de compilar este arquivo em
 * vez de deixar um `default` silencioso escolher a frase errada.
 */
type Headline = Pick<OutcomeView, 'tone' | 'icon' | 'title' | 'lead' | 'verdict'>;

function resultFor(outcome: Outcome): Headline {
  const text = ui.outcome;

  switch (outcome.kind) {
    case 'defeat': {
      const lead =
        outcome.cause === 'temperature'
          ? text.ending.temperature(celsius(balance.loseTemperature))
          : text.ending.support;

      return { tone: 'defeat', ...text.result.defeat, lead };
    }

    case 'finished': {
      const lead =
        outcome.ending === 'netZero'
          ? text.ending.netZero(
              `${threshold.format(balance.netZeroEmissions)} ${ui.units.emissionsPerYear}`,
            )
          : text.ending.horizon(String(balance.endYear));

      // Sem medalha, o limiar que interessa é o do bronze — foi por ele que a
      // partida passou. Com medalha, é o teto da própria medalha.
      const { icon, title, verdict } =
        outcome.medal === null ? text.result.none : text.result[outcome.medal];
      const limit = outcome.medal === null ? MEDAL_CEILING.bronze : MEDAL_CEILING[outcome.medal];

      return {
        tone: outcome.medal === null ? 'none' : 'medal',
        icon,
        title,
        lead,
        verdict: verdict(celsius(limit)),
      };
    }

    // Inalcançável: quem chama já perguntou se a partida acabou. Escrito assim
    // porque `outcomeView` devolve `null` enquanto se joga, e um `throw` aqui
    // seria uma segunda regra sobre a mesma coisa.
    case 'playing':
      return { tone: 'none', icon: '', title: '', lead: '', verdict: '' };
  }
}

/**
 * As frases do "o que ficou para trás".
 *
 * São até três, e cada uma só entra quando tem o que dizer. A partida de ouro
 * não lê "0 medalhas perdidas"; a partida que comprou a árvore inteira não lê
 * "0 nós ficaram na árvore". Frase que só existe para dizer que não há nada a
 * dizer é o oposto do "curto, sem sermão" do §2.7.
 */
function lookBackFor(state: GameState): readonly string[] {
  const text = ui.outcome.lookBack;
  const lines: string[] = [];

  // A ordem de MEDALS é a do engine — do mais exigente para o menos —, então a
  // frase sai na ordem em que as medalhas foram sendo perdidas.
  const crossed = crossings(state);
  const lost = MEDALS.filter((medal) => crossed[medal] !== null).map((medal) =>
    text.lostItem(ui.outcome.result[medal].title, String(crossed[medal])),
  );

  lines.push(lost.length === 0 ? text.keptAll(celsius(MEDAL_CEILING.gold)) : text.lost(lost));

  const left = unboughtCount(state);
  if (left > 0) lines.push(text.tree(String(left), String(skills.length)));

  // Só vale a pena nomear os ramos intocados quando **algum** foi tocado. Numa
  // partida sem nenhuma compra os cinco estão zerados, e listar os cinco só
  // repete, com mais palavras, o que a linha da árvore acabou de dizer.
  const bought = purchasesByBranch(state);
  const untouched = SKILL_BRANCHES.filter((branch) => bought[branch] === 0);
  if (untouched.length > 0 && untouched.length < SKILL_BRANCHES.length) {
    lines.push(text.untouched(untouched.map((branch) => ui.tree.branches[branch])));
  }

  return lines;
}

/**
 * O cartão de fim, ou `null` enquanto a partida está em curso.
 *
 * O `null` é o que faz o `renderOutcome` esconder a seção inteira, e é
 * deliberadamente a mesma pergunta que o engine responde — a tela não tem uma
 * ideia própria de "acabou".
 */
export function outcomeView(state: GameState): OutcomeView | null {
  const outcome = outcomeOf(state);
  if (outcome.kind === 'playing') return null;

  const hud = hudView(state);
  const whole = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 0 });

  return {
    ...resultFor(outcome),
    chart: timelineChartView(state),
    lookBack: lookBackFor(state),
    realWorld: suggestedActions(state),
    stats: [
      { label: ui.hud.year.label, value: hud.year },
      { label: ui.hud.temperature.label, value: hud.temperature },
      { label: ui.hud.emissions.label, value: hud.emissions },
      {
        label: ui.outcome.skillsLabel,
        value: ui.outcome.skillsValue(
          whole.format(state.unlockedSkills.length),
          whole.format(skills.length),
        ),
      },
    ],
  };
}

// ------------------------------------------------------------------ DOM ---

type Slot =
  'card' | 'icon' | 'title' | 'lead' | 'verdict' | 'stats' | 'review' | 'lookback' | 'realworld';

function slot(root: ParentNode, name: Slot): HTMLElement | null {
  return root.querySelector<HTMLElement>(`[data-outcome="${name}"]`);
}

/**
 * Uma seção do cartão: título de verdade mais a lista que o render preenche.
 *
 * **`<h2>` e não uma `<p>` com cara de título**, como no tree.ts e pelo mesmo
 * motivo: é o que faz um leitor de tela oferecer as seções na navegação por
 * cabeçalhos, em vez de obrigar quem usa a atravessar o cartão inteiro de cima
 * a baixo. O `<h1>` da página é o nome do jogo, então este é o nível certo.
 */
function section(name: Extract<Slot, 'lookback' | 'realworld'>, title: string): HTMLElement {
  const block = document.createElement('section');
  block.className = `outcome__${name}`;

  const heading = document.createElement('h2');
  heading.className = 'outcome__section-title';
  heading.textContent = title;

  // <ul> e não parágrafos soltos: são itens de uma lista, e é o que faz o
  // leitor de tela anunciar "lista de 3 itens" antes de começar a ler.
  const list = document.createElement('ul');
  list.className = `outcome__${name}-list`;
  list.dataset.outcome = name;

  block.append(heading, list);
  return block;
}

/** A seção das 3 ações, que leva uma linha de contexto entre o título e a lista. */
function realWorldSection(): HTMLElement {
  const block = section('realworld', ui.outcome.realWorld.label);

  const intro = document.createElement('p');
  intro.className = 'outcome__realworld-intro';
  intro.textContent = ui.outcome.realWorld.intro;

  // Entre o <h2> e a <ul> — o contexto vem antes da lista que ele explica.
  block.querySelector('h2')?.after(intro);
  return block;
}

/**
 * Monta o cartão uma vez, escondido, na carga da página.
 *
 * **Um cartão dentro do `#app`, e não um modal por cima da tela.** Um modal
 * exigiria prender o foco, tratar `Esc` e decidir o que fica por baixo — e
 * cobriria justamente o HUD, que é onde estão os números que o jogador quer ler
 * quando a partida acaba. Aqui o resultado entra acima da árvore, o topo da
 * tela continua visível, e a navegação por teclado do §5 sai de graça porque
 * nada foi sequestrado.
 */
export function mountOutcome(root: Element, onPlayAgain: () => void, onReview?: () => void): void {
  root.setAttribute('aria-label', ui.outcome.label);

  const card = document.createElement('div');
  card.className = 'outcome__card';
  card.dataset.outcome = 'card';

  // `polite` avisa quem usa leitor de tela que a partida acabou, sem atropelar
  // o que estiver sendo lido. Envolve só o texto: o botão fica de fora, porque
  // região viva que contém controle faz alguns leitores reanunciarem o botão a
  // cada mudança.
  const said = document.createElement('div');
  said.className = 'outcome__said';
  said.setAttribute('aria-live', 'polite');

  const headline = document.createElement('p');
  headline.className = 'outcome__headline';

  const icon = document.createElement('span');
  icon.className = 'outcome__icon';
  icon.dataset.outcome = 'icon';
  // O ícone é decoração: quem carrega o resultado para o leitor de tela é o
  // título escrito ao lado. Sem isto, "🥉 Bronze" seria lido duas vezes.
  icon.setAttribute('aria-hidden', 'true');

  const title = document.createElement('span');
  title.className = 'outcome__title';
  title.dataset.outcome = 'title';

  headline.append(icon, title);

  const lead = document.createElement('p');
  lead.className = 'outcome__lead';
  lead.dataset.outcome = 'lead';

  const verdict = document.createElement('p');
  verdict.className = 'outcome__verdict';
  verdict.dataset.outcome = 'verdict';

  said.append(headline, lead, verdict);

  // <dl> e não uma fileira de <div>: rótulo e valor são exatamente um par
  // termo/definição, e é o que faz um leitor de tela ler "Temperatura, 2,48 °C"
  // em vez de duas frases soltas.
  const stats = document.createElement('dl');
  stats.className = 'outcome__stats';
  stats.dataset.outcome = 'stats';

  const again = document.createElement('button');
  again.type = 'button';
  again.className = 'outcome__again';
  again.textContent = ui.outcome.playAgain;
  again.title = ui.outcome.playAgainHint;
  again.addEventListener('click', onPlayAgain);

  const actions = document.createElement('div');
  actions.className = 'outcome__actions';
  actions.append(again);

  // O caminho de volta ao tabuleiro (P5-06). Só é montado quando alguém pede:
  // sem `onReview`, o cartão continua exatamente o que era no P6-08, e os
  // testes de lá continuam medindo o mesmo cartão.
  if (onReview !== undefined) {
    const review = document.createElement('button');
    review.type = 'button';
    review.className = 'outcome__review';
    review.dataset.outcome = 'review';
    review.textContent = ui.outcome.review;
    review.title = ui.outcome.reviewHint;
    review.addEventListener('click', onReview);
    actions.append(review);
  }

  // A ordem é a leitura que o §2.7 quer, e ela vai do jogo para fora dele: o
  // resultado diz o que aconteceu, os números dizem em que ponto o mundo parou,
  // a curva diz **quando** cada coisa foi decidida, o "ficou para trás" põe isso
  // em palavras, e só então a tela fala do mundo real. Os botões ficam por
  // último porque são a saída, não parte do que se lê.
  card.append(
    said,
    stats,
    mountTimelineChart(),
    section('lookback', ui.outcome.lookBack.label),
    realWorldSection(),
    actions,
  );
  root.replaceChildren(card);
  renderOutcome(root, null);
}

/**
 * Escreve o resultado no cartão, ou esconde a seção enquanto se joga.
 *
 * `reviewing` diz que o jogador já está vendo o tabuleiro (P5-06). Nesse caso o
 * botão "Ver o mundo" sai da tela — e sai por `hidden`, não por CSS, pelo mesmo
 * motivo da seção inteira: um botão invisível mas focável é a armadilha que só
 * quem navega por teclado encontra.
 */
export function renderOutcome(root: Element, view: OutcomeView | null, reviewing = false): void {
  const review = slot(root, 'review');
  if (review !== null) review.hidden = reviewing;

  // `hidden` na seção inteira, e não `display: none` no CSS: assim o botão
  // "Jogar de novo" sai da ordem de tabulação durante a partida. Um botão
  // invisível mas focável é o tipo de armadilha que só quem navega por teclado
  // encontra — e ele reinicia o jogo.
  if (root instanceof HTMLElement) root.hidden = view === null;
  if (view === null) return;

  const card = slot(root, 'card');
  if (card !== null) card.dataset.tone = view.tone;

  renderTimelineChart(root, view.chart);

  const lookBack = slot(root, 'lookback');
  if (lookBack !== null) {
    lookBack.replaceChildren(
      ...view.lookBack.map((line) => {
        const item = document.createElement('li');
        item.className = 'outcome__lookback-item';
        item.textContent = line;
        return item;
      }),
    );
  }

  const realWorld = slot(root, 'realworld');
  if (realWorld !== null) {
    realWorld.replaceChildren(
      ...view.realWorld.map((action) => {
        const item = document.createElement('li');
        item.className = 'outcome__action';
        item.dataset.branch = action.branch;

        const name = document.createElement('p');
        name.className = 'outcome__action-name';
        name.textContent = action.name;

        const description = document.createElement('p');
        description.className = 'outcome__action-description';
        description.textContent = action.description;

        // O fato é o que separa a tela de fim de um cartaz de campanha: cada um
        // deles tem fonte registrada em docs/CIENCIA.md, e nenhum foi escrito
        // para esta tela — todos já sustentavam um nó da árvore.
        const fact = document.createElement('p');
        fact.className = 'outcome__action-fact';
        fact.textContent = action.fact;

        item.append(name, description, fact);
        return item;
      }),
    );
  }

  for (const [name, text] of [
    ['icon', view.icon],
    ['title', view.title],
    ['lead', view.lead],
    ['verdict', view.verdict],
  ] as const) {
    const target = slot(root, name);
    if (target !== null) target.textContent = text;
  }

  const stats = slot(root, 'stats');
  if (stats === null) return;

  // Reconstrói, ao contrário do tree.ts e do hud.ts, e aqui isso é seguro: o
  // <dl> não contém nada focável, e o cartão só é redesenhado quando a partida
  // acaba — não a cada mês. O foco que o tree.ts protege não existe aqui.
  //
  // **Cada par vive dentro de um <div>, e isso não é decoração.** Com <dt> e
  // <dd> soltos, a grade trata cada um como uma célula própria: na primeira
  // versão o rótulo "Emissões" caiu no fim de uma linha e o "46,7 Gt/ano" no
  // começo da seguinte, e o cartão passou a mostrar o valor de um indicador
  // debaixo do nome de outro. O <div> agrupador é HTML válido dentro de <dl>
  // desde o HTML 5.2, exatamente para este caso, e não muda o que o leitor de
  // tela anuncia.
  stats.replaceChildren(
    ...view.stats.map((stat) => {
      const pair = document.createElement('div');
      pair.className = 'outcome__stat';

      const term = document.createElement('dt');
      term.className = 'outcome__stat-label';
      term.textContent = stat.label;

      const value = document.createElement('dd');
      value.className = 'outcome__stat-value';
      value.textContent = stat.value;

      pair.append(term, value);
      return pair;
    }),
  );
}
