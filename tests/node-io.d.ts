// Os tipos de Node que este projeto usa — e nada além deles.
//
// **Por que não `@types/node`.** O tsconfig.json tipa o projeto para navegador
// (`lib: ES2022, DOM`) e não instala tipos de Node em lugar nenhum. Instalar o
// pacote resolveria estas linhas e, de quebra, faria `process`, `Buffer` e
// `__dirname` passarem a existir **dentro de `src/`** — inclusive dentro do
// `engine/`, que o §3 quer sem nenhuma noção de ambiente. O preço de evitar isso
// é este arquivo, que declara à mão só o que é chamado de verdade.
//
// **Quem chama.** Eram duas funções, para o `tests/planilha-relatorio.ts` (P3-02).
// O `P8-05` somou três: o plugin de arquivo único do `vite.config.ts` apaga do
// disco o JS e o CSS depois de embuti-los no HTML, e confere o que sobrou. O
// arquivo mora em `tests/` por herança, mas a declaração é ambiente e vale para
// todo o `include` do tsconfig — que é onde o `vite.config.ts` também está.
//
// **O risco assumido:** tipo escrito à mão não é conferido contra a
// implementação real. Se uma destas assinaturas estiver errada, o `tsc` passa e
// o erro só aparece ao rodar — o que, para todas elas, o próprio teste ou o
// próprio build faz na hora. São funções de biblioteca padrão que não mudam de
// forma há uma década. Se um dia mais de um punhado de arquivos precisar de
// Node, a saída certa passa a ser `@types/node` com um tsconfig separado.

declare module 'node:fs' {
  export function mkdirSync(path: string, options?: { recursive?: boolean }): void;
  export function writeFileSync(path: string, data: string, encoding: 'utf8'): void;
  export function readFileSync(path: string, encoding: 'utf8'): string;
  export function readdirSync(path: string, options?: { recursive?: boolean }): string[];
  export function unlinkSync(path: string): void;
  export function rmdirSync(path: string): void;
}
