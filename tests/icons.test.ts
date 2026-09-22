import { readdirSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

import { SKILL_BRANCHES } from '../src/engine/state';
import { HUD_FIELDS } from '../src/ui/hud';
import { ICON_NAMES, iconAssets, iconFile, iconSource, type IconName } from '../src/ui/icons';

/**
 * Os ícones do VIS-09 e o contrato do `[D-Design]` (PLANO.md): 24×24, traço de
 * 2 px, uma cor só e sem texto.
 *
 * **Este é o teste que o cargo de Design vai encontrar.** Quem redesenhar um
 * ícone troca o arquivo em `src/assets/icons/` e roda a suíte; se o desenho
 * novo sair do formato, é aqui que fica vermelho, com o nome do arquivo na
 * mensagem — e não na feira, com um ícone gigante ou verde no meio da barra.
 *
 * Roda em node, lendo o texto de cada arquivo. Onde cada ícone aparece na tela
 * está no tests/icons.dom.test.ts.
 */

const PASTA = 'src/assets/icons';

const ler = (name: IconName): string => readFileSync(`${PASTA}/${iconFile(name)}`, 'utf8');

/** A tag de abertura do `<svg>`, onde moram as medidas e o traço. */
const raiz = (source: string): string => /<svg\b[^>]*>/.exec(source)?.[0] ?? '';

describe('a lista de ícones', () => {
  it('tem um ícone para cada indicador do HUD, com o mesmo nome', () => {
    for (const field of HUD_FIELDS) expect(ICON_NAMES).toContain(field);
  });

  it('tem um ícone para cada ramo da árvore, com o mesmo nome', () => {
    for (const branch of SKILL_BRANCHES) expect(ICON_NAMES).toContain(branch);
  });

  it('dá nome de arquivo em kebab-case, como pede a convenção do projeto', () => {
    expect(iconFile('actionPoints')).toBe('action-points.svg');
    expect(iconFile('energy')).toBe('energy.svg');

    for (const name of ICON_NAMES) expect(iconFile(name)).toMatch(/^[a-z]+(-[a-z]+)*\.svg$/);
  });

  /**
   * A pasta inteira entra no bundle (icons.ts). Um arquivo que ninguém usa é
   * peso à toa; um que falta é um rótulo sem ícone na tela.
   */
  it('bate com a pasta: nenhum arquivo sobrando, nenhum faltando', () => {
    const esperados = ICON_NAMES.map(iconFile).sort();

    expect(readdirSync(PASTA).sort()).toEqual(esperados);
    expect(iconAssets()).toEqual(esperados);
  });

  it('entrega o desenho de todos, pelo mesmo caminho que a tela usa', () => {
    for (const name of ICON_NAMES) expect(iconSource(name), name).toMatch(/^<svg\b/);
  });
});

describe('o contrato de cada arquivo', () => {
  it('é um <svg> de 24×24', () => {
    for (const name of ICON_NAMES) {
      const tag = raiz(ler(name));

      expect(tag, iconFile(name)).toContain('xmlns="http://www.w3.org/2000/svg"');
      expect(tag, iconFile(name)).toContain('viewBox="0 0 24 24"');
      expect(tag, iconFile(name)).toContain('width="24"');
      expect(tag, iconFile(name)).toContain('height="24"');
    }
  });

  /**
   * Um traço só, escrito uma vez, na raiz. Um `stroke-width` num caminho de
   * dentro engrossaria ou afinaria só aquele pedaço do desenho.
   */
  it('tem traço de 2 px, declarado só na raiz', () => {
    for (const name of ICON_NAMES) {
      const source = ler(name);

      expect(raiz(source), iconFile(name)).toContain('stroke-width="2"');
      expect(source.match(/stroke-width=/g), iconFile(name)).toHaveLength(1);
    }
  });

  /**
   * Uma cor só, e ela é a do texto em volta: `currentColor`. É o que deixa a
   * cor morar só no theme.css. Qualquer outro valor — um `#hex`, um `rgb()`, um
   * `style` — seria uma cor que a troca de tema não alcança.
   */
  it('é monocromático: toda cor é currentColor ou nenhuma', () => {
    for (const name of ICON_NAMES) {
      const source = ler(name);

      for (const [, valor] of source.matchAll(/\b(?:fill|stroke|color)="([^"]*)"/g)) {
        expect(['none', 'currentColor'], `${iconFile(name)}: ${valor}`).toContain(valor);
      }
      expect(raiz(source), iconFile(name)).toContain('stroke="currentColor"');
      expect(source, iconFile(name)).not.toMatch(/#[0-9a-f]{3,8}\b|\brgba?\(|\bhsla?\(/i);
      expect(source, iconFile(name)).not.toMatch(/\bstyle=|<style\b|stop-color/);
    }
  });

  /**
   * Sem texto embutido, e sem nada que rode. O desenho entra na página como
   * `<svg>` de verdade (icons.ts), então um `<script>` ou um `onload` num arquivo
   * rodaria junto com o jogo.
   */
  it('não tem texto, imagem de fora nem nada que rode', () => {
    for (const name of ICON_NAMES) {
      const source = ler(name);

      expect(source, iconFile(name)).not.toMatch(
        /<(?:text|tspan|image|script|foreignObject|use)\b/i,
      );
      expect(source, iconFile(name)).not.toMatch(/\son[a-z]+=|href=/i);
    }
  });
});

describe('a marca da folha', () => {
  const marca = readFileSync('src/assets/brand/mark.svg', 'utf8');
  const tema = readFileSync('src/ui/theme.css', 'utf8');

  it('é um <svg> de 48×48, fora da pasta dos ícones', () => {
    expect(raiz(marca)).toContain('viewBox="0 0 48 48"');
    expect(readdirSync(PASTA)).not.toContain('mark.svg');
  });

  /**
   * A marca tem três cores, e nenhuma é escrita solta: todas vêm do tema, com
   * a reserva no próprio `var()`, como nas folhas de estilo. Sem isso a troca
   * de paleta deixaria o logotipo para trás.
   */
  it('lê as cores do tema, com reserva, e só tokens que existem', () => {
    const usos = [...marca.matchAll(/var\((--[a-z0-9-]+),\s*#[0-9a-f]{6}\)/g)];
    const soltas = marca.replace(/var\(--[a-z0-9-]+,\s*#[0-9a-f]{6}\)/g, '');

    expect(usos.length).toBeGreaterThan(0);
    expect(soltas).not.toMatch(/#[0-9a-f]{3,8}\b|\brgba?\(/i);
    for (const [, token] of usos) expect(tema, `${token} no theme.css`).toContain(`${token}:`);
  });

  it('não tem texto nem nada que rode', () => {
    expect(marca).not.toMatch(/<(?:text|tspan|image|script|foreignObject|use)\b/i);
    expect(marca).not.toMatch(/\son[a-z]+=|href=/i);
  });
});
