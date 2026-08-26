import { readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

/**
 * O tema (P5-02): a paleta, a tipografia e as medidas.
 *
 * **Por que este teste existe.** Até aqui as razões de contraste do jogo eram
 * calculadas à mão e escritas em comentário no cabeçalho de cada folha de
 * estilo. O PROGRESSO.md do P5-01 registrou isso como pendência com todas as
 * letras: "nenhum teste mede o contraste". Comentário não confere nada — e o
 * P5-02 já encontrou o resultado disso, com o `--cor-alerta` documentado como
 * 9,73:1 em três arquivos quando o valor real é 8,66:1.
 *
 * Agora as cores são lidas **do próprio theme.css** e as razões são recalculadas
 * aqui. Trocar uma cor por outra que não passe o AA do §5 do GDD quebra a suíte,
 * que é a única forma de o contrato do pacote [D-Design] valer alguma coisa:
 * quem entregar a identidade visual descobre o problema ao rodar os testes, e
 * não numa feira.
 */

const CSS_DIR = 'src/ui';

function readCss(name: string): string {
  return readFileSync(`${CSS_DIR}/${name}`, 'utf8');
}

const theme = readCss('theme.css');

// --------------------------------------------------------------- WCAG 2.1 ---

/** Componentes de 0 a 255, a partir de `#rrggbb`. */
function channels(hex: string): readonly number[] {
  return [1, 3, 5].map((at) => Number.parseInt(hex.slice(at, at + 2), 16));
}

/** Luminância relativa, pela definição da WCAG 2.1. */
function luminance(hex: string): number {
  const [r, g, b] = channels(hex).map((value) => {
    const c = value / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });

  return 0.2126 * (r ?? 0) + 0.7152 * (g ?? 0) + 0.0722 * (b ?? 0);
}

/** Razão de contraste entre duas cores opacas. */
function contrast(a: string, b: string): number {
  const [claro, escuro] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return ((claro ?? 0) + 0.05) / ((escuro ?? 0) + 0.05);
}

/**
 * Compõe uma cor translúcida sobre um fundo opaco.
 *
 * Os fundos de hover são a cor de destaque a 12% — o que se lê na tela não é o
 * `#7FD1A8`, é a mistura. Medir o contraste contra a cor pura daria um número
 * que ninguém enxerga.
 */
function over(front: string, back: string, alpha: number): string {
  const [f, b] = [channels(front), channels(back)];
  const mix = f.map((value, index) => Math.round(value * alpha + (b[index] ?? 0) * (1 - alpha)));
  return `#${mix.map((value) => value.toString(16).padStart(2, '0')).join('')}`;
}

// ------------------------------------------------------------- os tokens ---

/** Lê `--nome: valor;` do theme.css. */
function token(name: string): string {
  const found = new RegExp(`--${name}:\\s*([^;]+);`).exec(theme);
  if (found?.[1] === undefined) throw new Error(`o theme.css não define --${name}`);
  return found[1].trim();
}

const PALETTE = [
  'cor-fundo',
  'cor-superficie',
  'cor-valor',
  'cor-rotulo',
  'cor-destaque',
  'cor-alerta',
  'cor-borda',
] as const;

/** As duas cores que servem de fundo para o texto. */
const BACKGROUNDS = ['cor-fundo', 'cor-superficie'] as const;

/** As quatro que o jogo usa como cor de texto. */
const TEXT = ['cor-valor', 'cor-rotulo', 'cor-destaque', 'cor-alerta'] as const;

/** As três que aparecem como borda, traço ou anel de foco. */
const NON_TEXT = ['cor-borda', 'cor-destaque', 'cor-alerta'] as const;

/** O que o §5 do GDD exige: AA. */
const AA_TEXT = 4.5;
const AA_NON_TEXT = 3;

/** A opacidade dos fundos de hover, que o theme.css declara no color-mix. */
const HOVER_ALPHA = 0.12;

describe('a paleta', () => {
  it('define as 7 cores, todas em #rrggbb', () => {
    for (const name of PALETTE) {
      expect(token(name), name).toMatch(/^#[0-9a-f]{6}$/);
    }
  });

  /** ACEITE do P5-02: contraste AA em todo texto. */
  it('passa o AA de texto sobre os dois fundos', () => {
    for (const fundo of BACKGROUNDS) {
      for (const texto of TEXT) {
        const razao = contrast(token(texto), token(fundo));
        expect(razao, `${texto} sobre ${fundo}: ${razao.toFixed(2)}:1`).toBeGreaterThanOrEqual(
          AA_TEXT,
        );
      }
    }
  });

  it('passa o mínimo de 3:1 em borda, traço e anel de foco', () => {
    for (const fundo of BACKGROUNDS) {
      for (const cor of NON_TEXT) {
        const razao = contrast(token(cor), token(fundo));
        expect(razao, `${cor} sobre ${fundo}: ${razao.toFixed(2)}:1`).toBeGreaterThanOrEqual(
          AA_NON_TEXT,
        );
      }
    }
  });

  /**
   * O hover não é decorativo do ponto de vista do contraste: o texto do botão
   * continua lá por cima. Medir contra a cor pura daria um número que ninguém vê.
   */
  it('passa o AA também sobre os fundos de hover, já compostos', () => {
    for (const base of ['cor-destaque', 'cor-alerta'] as const) {
      for (const fundo of BACKGROUNDS) {
        const composto = over(token(base), token(fundo), HOVER_ALPHA);

        for (const texto of TEXT) {
          const razao = contrast(token(texto), composto);
          expect(
            razao,
            `${texto} sobre ${base} a ${HOVER_ALPHA * 100}% de ${fundo} (${composto}): ${razao.toFixed(2)}:1`,
          ).toBeGreaterThanOrEqual(AA_TEXT);
        }
      }
    }
  });

  it('deriva os fundos de hover das cores da paleta, e não de números soltos', () => {
    const derivados = [
      { suave: 'cor-destaque-suave', base: 'cor-destaque' },
      { suave: 'cor-alerta-suave', base: 'cor-alerta' },
    ];

    for (const { suave, base } of derivados) {
      expect(token(suave), suave).toContain(`var(--${base})`);
      // A opacidade que o teste de contraste usa precisa ser a que está escrita
      // aqui, ou ele mediria uma cor que a tela não mostra.
      expect(token(suave), suave).toContain(`${HOVER_ALPHA * 100}%`);
    }
  });
});

describe('a tipografia', () => {
  /**
   * O §5 do GDD fixa 16px como piso para TODO texto — o jogo é visto de pé, de
   * longe, numa feira.
   */
  it('põe o piso em 1rem', () => {
    expect(token('tamanho-base')).toBe('1rem');
  });

  it('tem uma pilha de fontes com reserva, e não uma família só', () => {
    expect(token('fonte-base').split(',').length).toBeGreaterThan(1);
  });
});

describe('as folhas dos módulos', () => {
  const sheets = [
    'contain.css',
    'controls.css',
    'event-cards.css',
    'hud.css',
    'map.css',
    'outcome.css',
    'region-panel.css',
    'session.css',
    'tree.css',
  ];

  /**
   * O contrato do [D-Design] no PLANO.md: o tema é "só variáveis CSS", e trocar
   * a identidade visual é abrir um arquivo só. Uma cor escrita à mão numa folha
   * de módulo é uma cor que a troca não alcança — foi o que aconteceu com os
   * fundos de hover, que viveram como `rgb(127 209 168 / 12%)` em cinco lugares.
   */
  it('não escreve nenhuma cor fora de um var() do tema', () => {
    for (const name of sheets) {
      const semComentarios = readCss(name).replace(/\/\*[\s\S]*?\*\//g, '');
      // Tira as reservas de dentro dos `var()`: elas são deliberadas — sem o
      // theme.css a página continua legível. Uma reserva nunca atravessa o `;`
      // que fecha a declaração, então o corte é seguro. O que sobrar é cor
      // escrita solta, que é o que a troca de paleta não alcançaria.
      const semReservas = semComentarios.replace(/var\(--[a-z-]+,[^;]*\)/g, '');
      const soltas = semReservas.match(/#[0-9a-f]{3,8}\b|\brgba?\(|\bhsla?\(/gi) ?? [];

      expect(soltas, `${name} escreve cor fora do tema`).toEqual([]);
    }
  });

  /**
   * O piso de 16px do §5, cobrado no CSS.
   *
   * O P5-02 encontrou dois textos em 0,875rem — 14px — no event-cards.css, um
   * deles a palavra "CRÍTICO". Passaram porque ninguém estava olhando; este
   * teste é quem olha daqui em diante.
   */
  it('não escreve nenhum texto abaixo do piso de 16px', () => {
    for (const name of sheets) {
      const semComentarios = readCss(name).replace(/\/\*[\s\S]*?\*\//g, '');

      for (const [, valor] of semComentarios.matchAll(/font-size:\s*([\d.]+)rem\s*;/g)) {
        expect(Number(valor), `${name}: font-size ${valor}rem`).toBeGreaterThanOrEqual(1);
      }

      for (const [, valor] of semComentarios.matchAll(/font-size:\s*([\d.]+)px\s*;/g)) {
        expect(Number(valor), `${name}: font-size ${valor}px`).toBeGreaterThanOrEqual(16);
      }
    }
  });

  it('lê o alvo de toque do tema, e nunca em px', () => {
    for (const name of sheets) {
      const semComentarios = readCss(name).replace(/\/\*[\s\S]*?\*\//g, '');

      for (const [linha] of semComentarios.matchAll(/min-height:[^;]+;/g)) {
        expect(linha, name).toContain('--alvo-toque');
      }
    }
  });
});
