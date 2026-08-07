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
    // 'node' de propósito: o engine é TS puro e não pode depender de DOM (§3).
    // Se um dia a UI precisar de teste, aí sim entra jsdom — e é dependência
    // nova, então passa por aprovação (§2).
    environment: 'node',
    include: ['tests/**/*.test.ts'],
  },
});
