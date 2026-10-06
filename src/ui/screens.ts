// As quatro telas do jogo: título, escolha do especialista, partida e fim.
//
// Até aqui o jogo não tinha telas: a página abria já jogando, com o relógio
// correndo desde o primeiro quadro. Isso serviu enquanto o que se testava era a
// simulação, e deixa de servir num estande — quem chega precisa de um começo,
// e quem termina precisa de um fim que não seja "a árvore ficou cinza".
//
// **A quarta tela entrou no REF-08** (eram três no P5-06), entre o título e a
// partida. Ela existe porque o `GameState` tem um `character` desde o REF-04, e
// o `createInitialState` o **recebe** em vez de adotá-lo depois: alguém precisa
// ter escolhido antes de a partida existir.
//
// **O roteador continua uma função pura de perguntas em ordem**: onde o jogador
// está antes da partida? ele já saiu de lá? a partida acabou? Não há máquina de
// estados, nem histórico, nem rota na URL. Quatro telas ainda não justificam
// nada disso, e o `vite.config.ts` registra que o jogo é página única sem rotas
// — mudar isso quebraria o `base: './'` de que o GitHub Pages e o build offline
// da feira dependem.
//
// **Por que `entry` é uma união, e não um terceiro booleano.** Título e escolha
// são dois lugares do *mesmo* momento — antes da partida —, e não dois fatos
// independentes como `started` e `reviewing`. Um `choosing: boolean` ao lado do
// `started` deixaria `{ choosing: true, started: true }` existir no tipo sem
// significar nada. O §4 da FORMA-DE-TRABALHO pede união discriminada em vez de
// flag booleana exatamente para isso.
//
// **O que cada tela mostra, e por quê:**
//
// | | título | escolha | partida | fim |
// |---|---|---|---|---|
// | tela de título | visível | — | — | — |
// | tela de escolha | — | visível | — | — |
// | topo (HUD, tempo, partida) | — | — | visível | **visível** |
// | tabuleiro (mapa, árvore, eventos) | — | — | visível | — |
//
// **A escolha esconde o HUD e as duas barras, como o título faz.** Os
// indicadores de uma partida que ainda não começou seriam todos o valor de
// 2025, e o controle de tempo ofereceria pausa e velocidade para um relógio
// parado — controles mentindo sobre o estado do jogo.
//
// O HUD **continua na tela no fim**, e essa linha da tabela é a mais pensada
// daqui. O `outcome.css` do P6-08 registrou, com todas as letras, por que o
// resultado não virou modal: "um modal cobriria justamente o HUD, que é onde
// estão os números que o jogador quer ler quando a partida acaba". A objeção
// continua de pé e é respeitada — o que a tela de fim esconde é o tabuleiro, que
// não tem mais nada para o jogador fazer, e não os indicadores, que são o
// resumo da partida que ele acabou de jogar.
//
// **`reviewing` existe pela outra metade da mesma objeção.** O `map.css` e o
// `region-panel.css` registraram que mapa e painel são justamente o que se quer
// olhar depois do fim, para entender em que região o apoio ruiu. Com a tela de
// fim escondendo o tabuleiro, isso se perderia — então dá para voltar a ele.
// Voltar não desfaz o fim: a partida continua encerrada e nada mais é clicável.
//
// A regra de ouro do §3 vale aqui como em toda a UI: este arquivo não sabe nada
// do engine além de um booleano de "acabou", que quem calcula é o outcome.ts.

export const SCREENS = ['title', 'select', 'game', 'end'] as const;

export type Screen = (typeof SCREENS)[number];

/**
 * Onde o jogador está **antes** da partida: na apresentação do jogo, ou
 * escolhendo o especialista que vai dirigir.
 *
 * Sai de `Screen` com `Extract`, e não escrito à mão, porque o `currentScreen`
 * devolve o `entry` direto: as duas listas têm que concordar, e aqui o `tsc`
 * cobra isso em vez de uma revisão humana.
 */
export type Entry = Extract<Screen, 'title' | 'select'>;

export type ScreenState = {
  /** Em que ponto da entrada o jogador está, enquanto não começou (REF-08). */
  readonly entry: Entry;
  /** O jogador saiu da entrada — por "Continuar" ou escolhendo um especialista. */
  readonly started: boolean;
  /** Acabou, e o jogador pediu para rever o mundo em vez do resultado. */
  readonly reviewing: boolean;
};

export function createScreens(): ScreenState {
  return { entry: 'title', started: false, reviewing: false };
}

/**
 * Ir do título para a escolha do especialista (REF-08).
 *
 * É o caminho de toda partida **nova** — inclusive a do Modo Feira, por decisão
 * do chat em 2026-10-06: a escolha é a primeira coisa que o visitante do
 * estande faz, e vale o punhado de segundos que custa.
 *
 * "Continuar" não passa por aqui: a partida guardada já tem o personagem dela
 * dentro do save (`SAVE_VERSION` 3), e perguntar de novo seria oferecer a troca
 * de um especialista no meio da partida — o que mudaria o balanceamento já
 * corrido.
 */
export function chooseCharacter(): ScreenState {
  return { entry: 'select', started: false, reviewing: false };
}

/**
 * Sair da entrada para a partida.
 *
 * Zera o `reviewing` em vez de preservá-lo: uma partida nova não herda o que o
 * jogador estava olhando na anterior. E devolve o `entry` ao título, que é onde
 * o jogador vai estar se voltar — a escolha não fica armada esperando.
 */
export function startGame(): ScreenState {
  return { entry: 'title', started: true, reviewing: false };
}

export function reviewWorld(screens: ScreenState): ScreenState {
  return { ...screens, reviewing: true };
}

/**
 * Voltar ao título sem recarregar a página (P7-07).
 *
 * **É o que faz o estande girar sozinho.** Até aqui não havia caminho de volta
 * — nem do fim, nem da partida —, e entre um visitante e outro alguém precisava
 * apertar F5. O `P5-06` já tinha anotado isso como problema de feira.
 *
 * Devolve o estado inicial em vez de só zerar o `started`: voltar ao título é
 * literalmente recomeçar a navegação, e um `reviewing` que sobrevivesse faria a
 * próxima partida abrir no tabuleiro em vez do resultado quando ela acabasse.
 */
export function backToTitle(): ScreenState {
  return createScreens();
}

/**
 * Qual tela está no ar.
 *
 * `finished` chega de fora porque quem responde isso é o `isFinished` do
 * engine, e este arquivo não importa engine (§3).
 *
 * A ordem das perguntas é a regra: a **entrada** vem antes de tudo. Um save de
 * partida encerrada abre no título, e não direto na tela de fim — quem senta
 * na frente do computador da feira precisa ver o jogo se apresentar primeiro.
 * E quem está escolhendo o especialista também não vê a tela de fim da partida
 * anterior aparecer por baixo da escolha.
 */
export function currentScreen(screens: ScreenState, finished: boolean): Screen {
  if (!screens.started) return screens.entry;
  if (finished && !screens.reviewing) return 'end';
  return 'game';
}

// -------------------------------------------------------------------- DOM ---

/**
 * Os blocos da página que o roteador liga e desliga, e o invólucro que ele
 * marca.
 *
 * Cada um é **dono exclusivo** do próprio `hidden`, e isso é o que torna o
 * roteador seguro. O `#resultado` de propósito não está aqui: quem manda no
 * `hidden` dele é o `renderOutcome`, que o usa para tirar o botão "Jogar de
 * novo" da ordem de tabulação durante a partida. Dois donos do mesmo atributo
 * seria o jeito de as duas regras se apagarem em silêncio, uma por quadro.
 *
 * O `#tabuleiro` é um invólucro criado no P5-06 exatamente por isso: o
 * `#eventos` já tem dono do próprio `hidden` (o `renderEventCards`), então o
 * roteador não pode tocar nas seções uma a uma.
 */
export type ScreenLayout = {
  /** A tela de título inteira. */
  readonly title: HTMLElement;
  /**
   * A tela de escolha do especialista (REF-08).
   *
   * Vizinha do título no `index.html`, e fora do invólucro da partida pela
   * mesma razão que ele: as duas são telas de entrada, e o invólucro existe
   * para as três faixas da partida.
   */
  readonly select: HTMLElement;
  /** A barra de cima: o HUD e a barra da partida. */
  readonly chrome: HTMLElement;
  /**
   * A barra de baixo (VIS-04): o controle de tempo, as listras e o botão da
   * árvore.
   *
   * Acompanha a barra de cima, e não o tabuleiro. Até o VIS-04 o controle de
   * tempo morava no cabeçalho e ficava na tela de fim junto com ele — o botão de
   * som inclusive, que continua servindo ali. As listras da partida inteira
   * também são leitura de fim.
   */
  readonly bar: HTMLElement;
  /** O invólucro do tabuleiro: mapa, painel, eventos, contenção e árvore. */
  readonly board: HTMLElement;
  /**
   * Os links de pulo (P8-04).
   *
   * Acompanham o tabuleiro, e não o cabeçalho: eles existem para contornar as
   * 28 paradas de tabulação do mapa e da árvore, e nas outras duas telas não há
   * bloco nenhum a contornar. Um atalho oferecido onde ele não leva a lugar
   * algum é pior que atalho nenhum — quem o segue perde o foco no vazio.
   */
  readonly skip: HTMLElement;
  /**
   * O invólucro das três faixas da partida (VIS-04): a barra de cima, o meio e a
   * barra de baixo.
   *
   * Ele nunca some — só recebe o nome da tela no ar, em `data-screen`. É por
   * esse nome que o layout.css decide montar a tela cheia: na partida e no fim,
   * sim; no título e na escolha, não, porque ali as três faixas estão
   * escondidas e um invólucro da altura da janela seria uma página vazia
   * embaixo da tela de entrada.
   */
  readonly frame: HTMLElement;
};

/**
 * Liga e desliga os blocos, e diz ao invólucro qual tela está no ar.
 *
 * `hidden` de verdade, e não `display: none` no CSS: o que sai da tela precisa
 * sair junto da ordem de tabulação e da árvore de acessibilidade. Um botão
 * invisível mas focável é a armadilha que só quem navega por teclado encontra —
 * e aqui um deles apaga a partida salva.
 */
export function renderScreens(layout: ScreenLayout, screen: Screen): void {
  // As duas telas de entrada escondem a mesma coisa, e a pergunta é feita uma
  // vez: um `screen === 'title' || screen === 'select'` repetido em duas linhas
  // é o jeito de alguém editar uma e esquecer a outra.
  const entering = screen === 'title' || screen === 'select';

  layout.title.hidden = screen !== 'title';
  layout.select.hidden = screen !== 'select';
  layout.chrome.hidden = entering;
  layout.bar.hidden = entering;
  layout.board.hidden = screen !== 'game';
  layout.skip.hidden = screen !== 'game';
  layout.frame.dataset.screen = screen;
}
