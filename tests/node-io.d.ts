// Os tipos de Node que a geração da planilha usa — e nada além deles.
//
// **Por que não `@types/node`.** O tsconfig.json tipa o projeto para navegador
// (`lib: ES2022, DOM`) e não instala tipos de Node em lugar nenhum. Instalar o
// pacote resolveria estas duas linhas e, de quebra, faria `process`, `Buffer` e
// `__dirname` passarem a existir **dentro de `src/`** — inclusive dentro do
// `engine/`, que o §3 quer sem nenhuma noção de ambiente. O preço de evitar isso
// é este arquivo, que declara à mão as duas funções que o
// `tests/planilha-relatorio.ts` chama, e mais nada.
//
// **O risco assumido:** tipo escrito à mão não é conferido contra a
// implementação real. Se uma destas assinaturas estiver errada, o `tsc` passa e
// o erro só aparece ao rodar — o que, para estas duas, o próprio teste faz na
// hora. São funções de biblioteca padrão que não mudam de forma há uma década.
// Se um dia mais de um punhado de testes precisar de Node, a saída certa passa a
// ser `@types/node` com um tsconfig separado para `tests/`.

declare module 'node:fs' {
  export function mkdirSync(path: string, options?: { recursive?: boolean }): void;
  export function writeFileSync(path: string, data: string, encoding: 'utf8'): void;
  export function readFileSync(path: string, encoding: 'utf8'): string;
}
