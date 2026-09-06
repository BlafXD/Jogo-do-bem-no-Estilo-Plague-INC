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

// ---------------------------------------------------------------------------

// Segundo conserto: `scrollIntoView` (P8-04).
//
// **O problema.** jsdom não faz layout. Não há viewport, não há posição de
// elemento e não há rolagem, então `Element.prototype.scrollIntoView`
// simplesmente não existe — não é um método que erra, é um nome ausente. O
// `src/ui/skip-link.ts` chama esse método no ouvinte de clique do link de pulo,
// e a chamada estourava um `TypeError` dentro do ouvinte.
//
// **Por que isso passou despercebido por uma semana.** Um erro lançado dentro
// de um ouvinte de evento não derruba o teste que despachou o evento: quem o
// recolhe é o Vitest, como *unhandled error*, e a suíte termina "671 passed"
// com um aviso no rodapé. O próprio Vitest escreve ali que isso "might cause
// false positive tests". **Suíte verde com erro no rodapé não é suíte verde** —
// é a lição que este bloco existe para não deixar esquecer.
//
// **Por que o dublê fica aqui e não no `skip-link.ts`.** Um
// `if (typeof target.scrollIntoView === 'function')` no código de produção
// colocaria um galho que nunca é falso em navegador nenhum, só para agradar o
// ambiente de teste — e, pior, engoliria em silêncio o dia em que a chamada
// deixasse de acontecer. O buraco é do jsdom; o conserto é do jsdom.
//
// **O que o dublê não prova:** que a página rolou. Nada em jsdom prova isso.
// Ele devolve o nome para que a chamada aconteça e possa ser observada — o
// `tests/acessibilidade.dom.test.ts` espia o método e confere o argumento. Que
// a rolagem chega ao topo de verdade é conferido no navegador, e está no
// PROGRESSO.md.
if (typeof Element !== 'undefined' && typeof Element.prototype.scrollIntoView !== 'function') {
  Element.prototype.scrollIntoView = function scrollIntoView(): void {
    // Sem corpo de propósito: não há o que rolar num documento sem layout.
  };
}
