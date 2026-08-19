// Conserto de ambiente para os testes que rodam em jsdom (P6-07).
//
// **O problema.** O Node 22 passou a expor um `localStorage` global próprio,
// experimental, que fica `undefined` a menos que o processo seja iniciado com
// `--localstorage-file`. Esse global chega antes do jsdom e fica por cima do
// dele: dentro de um teste, `window.localStorage` é o do Node — indefinido — e
// não o do jsdom. O `sessionStorage`, que o Node não tem, funciona normalmente.
// Ou seja: o save do P6-07 não teria como ser testado, não por culpa do código,
// mas porque o nome estava ocupado.
//
// **O conserto.** A propriedade é `configurable`, então dá para devolver o nome
// a um `Storage` de verdade. O que se coloca ali é o `sessionStorage` **do
// próprio jsdom** — a mesma classe `Storage`, da mesma implementação. Não é um
// dublê escrito à mão: coerção de chave e valor para string, `null` para chave
// ausente, `clear`, `removeItem` e os erros de cota são os de verdade, e é isso
// que os testes exercitam.
//
// **O que este arquivo não prova, e nenhum teste em jsdom provaria:** que o
// save sobrevive a fechar e reabrir a página. Persistência é a única diferença
// real entre os dois armazenamentos, e jsdom não recarrega página nenhuma.
// Quem confere isso é o navegador, e está registrado no PROGRESSO.md.
//
// **Consequência a lembrar:** enquanto isto valer, `localStorage` e
// `sessionStorage` são o mesmo objeto dentro dos testes. Nenhum código do jogo
// usa `sessionStorage` hoje; no dia em que usar, os dois passam a colidir aqui
// e este arquivo precisa de outra saída.

if (typeof window !== 'undefined' && window.localStorage === undefined) {
  Object.defineProperty(globalThis, 'localStorage', {
    value: window.sessionStorage,
    configurable: true,
    writable: false,
  });
}
