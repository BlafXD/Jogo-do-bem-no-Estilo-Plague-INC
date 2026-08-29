// As três telas do jogo (P5-06): título, partida e fim.
//
// Até aqui o jogo não tinha telas: a página abria já jogando, com o relógio
// correndo desde o primeiro quadro. Isso serviu enquanto o que se testava era a
// simulação, e deixa de servir num estande — quem chega precisa de um começo,
// e quem termina precisa de um fim que não seja "a árvore ficou cinza".
//
// **O roteador é uma função pura de duas perguntas**: o jogador já saiu do
// título? a partida acabou? Não há máquina de estados, nem histórico, nem rota
// na URL. Três telas não justificam nada disso, e o `vite.config.ts` registra
// que o jogo é página única sem rotas — mudar isso quebraria o `base: './'` que
// o GitHub Pages e o build offline da feira dependem.
//
// **O que cada tela mostra, e por quê:**
//
// | | título | partida | fim |
// |---|---|---|---|
// | tela de título | visível | — | — |
// | topo (HUD, tempo, partida) | — | visível | **visível** |
// | tabuleiro (mapa, árvore, eventos) | — | visível | — |
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

export const SCREENS = ['title', 'game', 'end'] as const;

export type Screen = (typeof SCREENS)[number];

export type ScreenState = {
  /** O jogador saiu do título — por "Continuar" ou por "Nova partida". */
  readonly started: boolean;
  /** Acabou, e o jogador pediu para rever o mundo em vez do resultado. */
  readonly reviewing: boolean;
};

export function createScreens(): ScreenState {
  return { started: false, reviewing: false };
}

/**
 * Sair do título.
 *
 * Zera o `reviewing` em vez de preservá-lo: uma partida nova não herda o que o
 * jogador estava olhando na anterior.
 */
export function startGame(): ScreenState {
  return { started: true, reviewing: false };
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
 * A ordem das perguntas é a regra: o título vem antes de tudo. Um save de
 * partida encerrada abre no título, e não direto na tela de fim — quem senta
 * na frente do computador da feira precisa ver o jogo se apresentar primeiro.
 */
export function currentScreen(screens: ScreenState, finished: boolean): Screen {
  if (!screens.started) return 'title';
  if (finished && !screens.reviewing) return 'end';
  return 'game';
}

// -------------------------------------------------------------------- DOM ---

/**
 * Os três blocos da página que o roteador liga e desliga.
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
  /** O cabeçalho: HUD, controle de tempo e barra da partida. */
  readonly chrome: HTMLElement;
  /** O invólucro do tabuleiro: eventos, mapa, painel, contenção e árvore. */
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
};

/**
 * Liga e desliga os três blocos.
 *
 * `hidden` de verdade, e não `display: none` no CSS: o que sai da tela precisa
 * sair junto da ordem de tabulação e da árvore de acessibilidade. Um botão
 * invisível mas focável é a armadilha que só quem navega por teclado encontra —
 * e aqui um deles apaga a partida salva.
 */
export function renderScreens(layout: ScreenLayout, screen: Screen): void {
  layout.title.hidden = screen !== 'title';
  layout.chrome.hidden = screen === 'title';
  layout.board.hidden = screen !== 'game';
  layout.skip.hidden = screen !== 'game';
}
