// Vem de 'vitest/config' e não de 'vite': é a mesma defineConfig, com o bloco
// `test` tipado junto. Evita ter um vitest.config.ts separado repetindo aliases.
import { defineConfig } from 'vitest/config';
import type { Plugin } from 'vite';
// Os tipos destas três vêm de `tests/node-io.d.ts`, declarados à mão. O porquê
// de não haver `@types/node` aqui está escrito lá.
import { readdirSync, rmdirSync, unlinkSync } from 'node:fs';

// ---------------------------------------------------------------------------
// Build da feira: um arquivo só (P8-05)
// ---------------------------------------------------------------------------
//
// **Medido no Chromium (Edge 151) em 2026-08-26, e não deduzido.** Aberto em
// `file://`, o navegador recusa o build normal inteiro:
//
//     Access to script at 'file:///.../assets/index-*.js' from origin 'null'
//     has been blocked by CORS policy: Cross origin requests are only
//     supported for protocol schemes: ..., http, https, ...
//
// E recusa a folha de estilo pela mesma razão, porque o Vite marca as duas tags
// com `crossorigin`. A página abre como HTML cru, em Times New Roman, com o
// jogo morto. Caminho relativo resolve o Pages; não resolve o disco.
//
// O conserto é não haver o que buscar: o JS e o CSS entram embutidos no HTML.
// Um `<script type="module">` embutido roda em `file://` sem erro nenhum
// (também medido), porque não existe requisição para bloquear.
//
// Isto vale só no `--mode feira`. O `npm run build`, que alimenta a CI e o
// GitHub Pages (SETUP-04), continua exatamente como era.

/** As peças que o build da feira precisa juntar num arquivo só. */
export type SingleFileParts = {
  html: string;
  js: { fileName: string; code: string };
  css: { fileName: string; code: string } | null;
};

// A única sequência que fecharia a tag antes da hora. Dentro de uma string ou
// de uma expressão regular do JS, `<\/script` vale exatamente o mesmo que
// `</script`; fora delas a sequência já seria erro de sintaxe de qualquer jeito.
// O `<!--` leva o mesmo tratamento porque muda o estado do analisador de HTML
// quando aparece dentro de <script>.
function escapeForScript(code: string): string {
  return code.replace(/<\/script/gi, '<\\/script').replace(/<!--/g, '<\\!--');
}

// Mesma ideia para o CSS: `\/` é uma fuga válida dentro de string de CSS.
function escapeForStyle(code: string): string {
  return code.replace(/<\/style/gi, '<\\/style');
}

function escapeRegExp(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Troca a tag que aponta para o JS por um `<script>` embutido, e a que aponta
 * para o CSS por um `<style>`. Devolve o HTML novo; lança se não achar as tags
 * ou se sobrar alguma referência a arquivo externo.
 *
 * É função pura de propósito: quem verifica isto é `tests/build-feira.test.ts`,
 * sem precisar rodar um build inteiro.
 */
export function inlineIntoHtml(parts: SingleFileParts): string {
  const scriptTag = new RegExp(
    `<script\\b[^>]*\\bsrc="[^"]*${escapeRegExp(parts.js.fileName)}"[^>]*>\\s*</script>`,
  );
  if (!scriptTag.test(parts.html)) {
    throw new Error(`build da feira: não achei a tag <script> de ${parts.js.fileName} no HTML.`);
  }

  // O segundo argumento é uma função, e não um texto, de propósito: com texto o
  // `replace` leria os cifrões que aparecem no JS minificado como referências ao
  // trecho casado, e o código sairia corrompido em silêncio.
  const inlineScript = `<script type="module">\n${escapeForScript(parts.js.code)}\n</script>`;
  let html = parts.html.replace(scriptTag, () => inlineScript);

  if (parts.css) {
    const linkTag = new RegExp(
      `<link\\b[^>]*\\bhref="[^"]*${escapeRegExp(parts.css.fileName)}"[^>]*>`,
    );
    if (!linkTag.test(html)) {
      throw new Error(`build da feira: não achei a tag <link> de ${parts.css.fileName} no HTML.`);
    }
    const inlineStyle = `<style>\n${escapeForStyle(parts.css.code)}\n</style>`;
    html = html.replace(linkTag, () => inlineStyle);
  }

  const leftover = html.match(/(?:src|href)="[^"]*\bassets\/[^"]*"/g);
  if (leftover) {
    throw new Error(
      `build da feira: sobrou referência a arquivo externo no HTML — ${leftover.join(', ')}.`,
    );
  }

  return html;
}

function assetText(source: string | Uint8Array): string {
  return typeof source === 'string' ? source : new TextDecoder().decode(source);
}

function feiraSingleFile(): Plugin {
  // O que o `generateBundle` embutiu e o `writeBundle` precisa apagar do disco.
  //
  // **Por que não dá para simplesmente remover do bundle.** O caminho
  // documentado do Rollup é `delete bundle[nome]`, e o Vite 8 roda em cima do
  // rolldown, onde esse objeto é um proxy: medido em 2026-08-26, o `delete`
  // **retorna `true` e não apaga nada**. Escrever em `source` propaga; remover
  // não. Como o silêncio é total, a limpeza foi para o disco, onde o resultado
  // é verificável.
  let inlined: string[] = [];

  return {
    name: 'feira-arquivo-unico',
    apply: 'build',
    // `post` para rodar depois do 'vite:build-html', que é quem escreve as tags
    // que este plugin substitui.
    enforce: 'post',
    generateBundle(_options, bundle) {
      const htmlFile = bundle['index.html'];
      if (!htmlFile || htmlFile.type !== 'asset') {
        throw new Error('build da feira: não achei o index.html no bundle.');
      }

      const chunks = Object.values(bundle).filter((item) => item.type === 'chunk');
      const [chunk, ...extraChunks] = chunks;
      if (!chunk || extraChunks.length > 0) {
        throw new Error(
          `build da feira: esperava 1 pedaço de JS e achei ${chunks.length}. ` +
            'Divisão de código não cabe em arquivo único — um import() dinâmico faria isto.',
        );
      }

      // Os dois `filter` separados não são desleixo: o primeiro é o que o
      // TypeScript consegue ler como estreitamento de tipo. Juntos num `&&`, o
      // resultado volta a ser `OutputAsset | OutputChunk` e o `.source` some.
      const [cssAsset, ...extraCss] = Object.values(bundle)
        .filter((item) => item.type === 'asset')
        .filter((item) => item.fileName.endsWith('.css'));
      if (extraCss.length > 0) {
        throw new Error('build da feira: esperava no máximo 1 arquivo de CSS.');
      }

      htmlFile.source = inlineIntoHtml({
        html: assetText(htmlFile.source),
        js: { fileName: chunk.fileName, code: chunk.code },
        css: cssAsset ? { fileName: cssAsset.fileName, code: assetText(cssAsset.source) } : null,
      });

      inlined = cssAsset ? [chunk.fileName, cssAsset.fileName] : [chunk.fileName];

      // Falha antes de escrever qualquer coisa: um arquivo a mais no bundle é um
      // arquivo que o pendrive teria que carregar ao lado — e que o navegador
      // recusaria em file://. É por aqui que os efeitos sonoros do P7-05 vão
      // avisar, em vez de quebrarem calados no estande.
      const leftovers = Object.keys(bundle).filter(
        (name) => name !== 'index.html' && !inlined.includes(name),
      );
      if (leftovers.length > 0) {
        throw new Error(
          `build da feira: ${leftovers.length} arquivo(s) ficaram fora do HTML — ` +
            `${leftovers.join(', ')}. A feira roda de um arquivo só; embuta-os ou ` +
            'deixe o assetsInlineLimit absorvê-los.',
        );
      }
    },

    writeBundle(options) {
      const outDir = options.dir;
      if (!outDir) {
        throw new Error('build da feira: o Vite não informou o diretório de saída.');
      }

      for (const fileName of inlined) {
        unlinkSync(`${outDir}/${fileName}`);
      }

      // As pastas dos arquivos embutidos ficam vazias depois disso; somem junto,
      // para o que sobra ser um arquivo e nada mais.
      const dirs = new Set(
        inlined.map((name) => name.split('/').slice(0, -1).join('/')).filter(Boolean),
      );
      for (const dir of dirs) {
        const full = `${outDir}/${dir}`;
        if (readdirSync(full).length === 0) rmdirSync(full);
      }

      // A conferência final é no disco, e não no bundle, porque nem tudo que vai
      // parar no `dist-feira` passa pelo bundle: o Vite copia a pasta `public/`
      // direto para a saída, sem o plugin ver. Se um dia alguém puser o cartaz
      // do P8-06 ou um .ogg lá, é aqui que o build avisa.
      const sobraram = readdirSync(outDir, { recursive: true })
        .map((name) => name.replace(/\\/g, '/'))
        .filter((name) => name !== 'index.html');
      if (sobraram.length > 0) {
        throw new Error(
          `build da feira: sobrou ${sobraram.join(', ')} em ${outDir}. ` +
            'A feira leva um arquivo só — provavelmente veio de public/.',
        );
      }
    },
  };
}

export default defineConfig(({ mode }) => {
  const feira = mode === 'feira';

  return {
    // `base: './'` gera caminhos relativos para os assets: o GitHub Pages serve
    // em https://<usuário>.github.io/<repositório>/, e com caminho absoluto os
    // assets dariam 404 no deploy (SETUP-04).
    //
    // Isto NÃO faz o build abrir do disco — essa parte é do plugin acima, e a
    // razão está escrita lá. Efeito colateral: só vale enquanto o jogo for uma
    // página só, sem rotas.
    base: './',
    plugins: feira ? [feiraSingleFile()] : [],
    build: {
      // Pastas separadas para os dois artefatos não se sobrescreverem: o `dist`
      // é o que a CI publica, o `dist-feira` é o que vai no pendrive.
      outDir: feira ? 'dist-feira' : 'dist',
      target: 'es2022',
      ...(feira
        ? {
            // Em arquivo único não há o que pré-carregar, e a tag de
            // modulepreload seria justamente mais uma referência externa.
            modulePreload: false,
            // Todo asset vira data: URI em vez de arquivo ao lado.
            assetsInlineLimit: Number.POSITIVE_INFINITY,
          }
        : {}),
    },
    test: {
      // 'node' continua sendo o padrão, mesmo depois de o jsdom entrar no P6-06
      // (dependência aprovada no chat, §2). Trocar este valor para 'jsdom' faria
      // TODO teste passar a enxergar um `document` — e aí a regra de ouro do §3
      // deixaria de ser verificável: um `document` que vazasse para dentro do
      // engine passaria despercebido, porque o teste teria um para oferecer.
      //
      // Quem precisa de DOM pede por arquivo, com `// @vitest-environment jsdom`
      // na primeira linha. É explícito, e a lista de quem pediu é um `grep`.
      environment: 'node',
      // Vale só para os arquivos que pedem jsdom; os de node ignoram. A URL não é
      // enfeite: sem ela o jsdom sobe em `about:blank`, que tem **origem opaca**,
      // e documento de origem opaca não tem `localStorage` — é a mesma regra que
      // o navegador aplica de verdade. Sem isto, os testes do save (P6-07)
      // falhariam por falta de armazenamento, e não pelo que eles medem.
      environmentOptions: {
        jsdom: { url: 'http://localhost/' },
      },
      // Roda antes de cada arquivo de teste, inclusive os de node — ele mesmo se
      // desliga quando não há `window`. Devolve o nome `localStorage` a um Storage
      // de verdade; o porquê está escrito no arquivo.
      setupFiles: ['tests/setup-jsdom.ts'],
      include: ['tests/**/*.test.ts'],
    },
  };
});
