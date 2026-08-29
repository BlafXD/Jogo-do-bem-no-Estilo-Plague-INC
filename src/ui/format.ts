// Formatação de número que mais de uma tela precisa escrever igual.
//
// **Existe por causa de um número só, e vale a pena registrar qual** (P8-04).
//
// O cartão de fim e o gráfico da linha do tempo escrevem os mesmos limiares de
// temperatura, e cada um tinha o seu `Intl.NumberFormat`. Os dois usavam
// `maximumFractionDigits: 2` sem mínimo, o que dava "1,5 °C", "2 °C" e
// "2,55 °C" — e na pilha vertical do gráfico o "2" sozinho parece erro de
// digitação, não medida. O `P7-06` anotou isso duas vezes e adiou as duas para
// cá, sempre pelo mesmo motivo: trocar num arquivo só faria os dois discordarem.
//
// Agora é um formatador só, e a discordância deixou de ser possível.

import { ui } from '../data/i18n';

/**
 * Um limiar de temperatura como ele entra numa frase ou num rótulo de gráfico.
 *
 * **Uma casa no mínimo, duas no máximo.** O mínimo é o conserto: 2 vira "2,0" e
 * para de parecer um número truncado ao lado de "1,5" e "2,55". O máximo
 * preserva o "2,55" do bronze, que precisa das duas.
 *
 * Duas casas fixas — "1,50 °C" — foram descartadas, e a razão está no comentário
 * que o `outcome.ts` carregava desde o P6-08: numa frase corrida como "abaixo de
 * 1,50 °C" a casa a mais só atrapalha a leitura. O HUD é o caso oposto e
 * continua com as duas fixas, porque ali o número muda a cada mês e sem elas ele
 * treme de largura — o `tests/hud.test.ts` trava isso.
 */
const thresholdFormat = new Intl.NumberFormat('pt-BR', {
  minimumFractionDigits: 1,
  maximumFractionDigits: 2,
});

/** "1,5 °C", "2,0 °C", "2,55 °C" — o limiar já com a unidade colada. */
export function celsius(value: number): string {
  return `${thresholdFormat.format(value)} ${ui.units.celsius}`;
}

/** Só o número, para quem tem outra unidade para colar. */
export function threshold(value: number): string {
  return thresholdFormat.format(value);
}
