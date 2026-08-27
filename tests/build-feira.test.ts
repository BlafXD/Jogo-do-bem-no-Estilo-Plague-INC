import { describe, expect, it } from 'vitest';
import { inlineIntoHtml } from '../vite.config';

/**
 * O embutimento do build da feira (`P8-05`).
 *
 * Por que isto merece teste próprio: aberto em `file://`, o Chromium recusa por
 * CORS **tanto** o `<script type="module" src>` **quanto** o
 * `<link rel="stylesheet">` do build normal — medido em 2026-08-26, com o
 * porquê escrito no `vite.config.ts`. Se alguém desfizer o embutimento sem
 * perceber, nada quebra aqui, nada quebra na CI, e o jogo falha na frente de
 * quem estiver no estande.
 *
 * A função é pura, então dá para cobrir os cantos sem rodar um build inteiro.
 */

/** O formato que o Vite gera hoje, incluindo o `crossorigin` que é o problema. */
function distHtml(): string {
  return [
    '<!doctype html>',
    '<html lang="pt-BR">',
    '  <head>',
    '    <title>Ponto de Virada</title>',
    '    <script type="module" crossorigin src="./assets/index-abc123.js"></script>',
    '    <link rel="stylesheet" crossorigin href="./assets/index-def456.css">',
    '  </head>',
    '  <body><main id="app"></main></body>',
    '</html>',
  ].join('\n');
}

function parts(overrides: { js?: string; css?: string | null; html?: string } = {}) {
  return {
    html: overrides.html ?? distHtml(),
    js: { fileName: 'assets/index-abc123.js', code: overrides.js ?? 'console.warn("oi")' },
    css:
      overrides.css === null
        ? null
        : { fileName: 'assets/index-def456.css', code: overrides.css ?? 'body{color:red}' },
  };
}

describe('inlineIntoHtml', () => {
  it('troca a tag do JS por um script de módulo embutido', () => {
    const html = inlineIntoHtml(parts({ js: 'globalThis.pronto = true' }));

    expect(html).toContain('<script type="module">');
    expect(html).toContain('globalThis.pronto = true');
    expect(html).not.toContain('src="./assets/index-abc123.js"');
  });

  it('troca a tag do CSS por um style embutido', () => {
    const html = inlineIntoHtml(parts({ css: '.hud{gap:8px}' }));

    expect(html).toContain('<style>');
    expect(html).toContain('.hud{gap:8px}');
    expect(html).not.toContain('href="./assets/index-def456.css"');
  });

  it('não deixa sobrar nenhuma referência a arquivo ao lado', () => {
    // É este o aceite do P8-05: o que sobra tem que ser um arquivo só.
    expect(inlineIntoHtml(parts())).not.toMatch(/(?:src|href)="[^"]*assets\//);
  });

  it('preserva o resto do HTML', () => {
    const html = inlineIntoHtml(parts());

    expect(html).toContain('<title>Ponto de Virada</title>');
    expect(html).toContain('<main id="app"></main>');
    expect(html).toContain('lang="pt-BR"');
  });

  it('não deixa o JS fechar a tag script antes da hora', () => {
    // Um `</script>` dentro de uma string do bundle encerraria o elemento no
    // meio do código, e o resto do jogo viraria texto na página.
    const html = inlineIntoHtml(parts({ js: 'const t = "</script><h1>oi</h1>"' }));

    expect(html).not.toContain('</script><h1>');
    expect(html).toContain('<\\/script>');
  });

  it('escapa o <!-- do JS, que também confunde o analisador de HTML', () => {
    const html = inlineIntoHtml(parts({ js: 'const t = "<!-- oi"' }));

    expect(html).toContain('<\\!--');
  });

  it('não deixa o CSS fechar a tag style antes da hora', () => {
    const html = inlineIntoHtml(parts({ css: 'a::after{content:"</style>"}' }));

    expect(html).not.toContain('"</style>"');
    expect(html).toContain('<\\/style>');
  });

  it('não confunde cifrão do JS minificado com grupo de captura', () => {
    // `$&` e `$1` são a sintaxe de substituição do String.replace. Se o
    // embutimento usasse texto em vez de função, isto sairia como o próprio
    // trecho casado — ou seja, com a tag <script> antiga colada no meio do
    // código, sem erro nenhum na hora do build.
    const code = 'const a = "$&"; const b = "$1"; const c = `$\'`;';
    const html = inlineIntoHtml(parts({ js: code }));

    expect(html).toContain(code);
    expect(html).not.toContain('index-abc123.js');
  });

  it('aceita um build sem CSS', () => {
    const semLink = distHtml().replace(/ *<link[^>]*>\n/, '');
    const html = inlineIntoHtml(parts({ html: semLink, css: null }));

    expect(html).toContain('<script type="module">');
    expect(html).not.toContain('<style>');
  });

  it('recusa HTML em que não achou a tag do script', () => {
    const semScript = distHtml().replace(/ *<script[^>]*><\/script>\n/, '');

    expect(() => inlineIntoHtml(parts({ html: semScript }))).toThrow(/não achei a tag <script>/);
  });

  it('recusa HTML em que não achou a tag do CSS', () => {
    const semLink = distHtml().replace(/ *<link[^>]*>\n/, '');

    expect(() => inlineIntoHtml(parts({ html: semLink }))).toThrow(/não achei a tag <link>/);
  });

  it('recusa quando sobra referência a um asset que ninguém embutiu', () => {
    // O caso que isto antecipa é o P7-05: um .ogg que o Vite deixe ao lado
    // passaria despercebido, e o botão de som falharia só na feira.
    const comAudio = distHtml().replace(
      '<main id="app"></main>',
      '<audio src="./assets/clique-xyz.ogg"></audio>',
    );

    expect(() => inlineIntoHtml(parts({ html: comAudio }))).toThrow(
      /sobrou referência a arquivo externo/,
    );
  });
});
