import { defineConfig } from 'vite';

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
});
