// Vem de 'vitest/config' e não de 'vite': é a mesma defineConfig, com o bloco
// `test` tipado junto. Evita ter um vitest.config.ts separado repetindo aliases.
import { defineConfig } from 'vitest/config';

// `base: './'` gera caminhos relativos para os assets. Isso resolve duas coisas
// de uma vez só:
//   1. GitHub Pages serve em https://<usuário>.github.io/<repositório>/ — com
//      caminho absoluto os assets dariam 404 no deploy (SETUP-04);
//   2. o build abre direto do disco, sem servidor — que é o aceite do P8-05
//      (build offline para a feira).
// Efeito colateral: só vale enquanto o jogo for uma página só, sem rotas.
export default defineConfig({
  base: './',
  build: {
    outDir: 'dist',
    target: 'es2022',
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
});
