import { describe, expect, it } from 'vitest';
import { ui } from '../src/data/i18n';

/**
 * A trava contra nota interna que vaza para a tela.
 *
 * **De onde veio.** Em 2026-08-26 o parágrafo `#pendente` foi removido depois de
 * um print da verificação do `P8-05` mostrar que ele dizia ao jogador *"o painel
 * de detalhe entra no P5-04, e o mapa passa a reagir à temperatura no P7-04"*.
 * A frase esteve na tela por semanas com a suíte verde o tempo todo, porque
 * **nenhum teste olhava para ela**. Quem achou foi um olho, por acaso, numa
 * verificação sobre outro assunto.
 *
 * O `P7-08` já tinha aprendido essa lição uma vez, com o teste que varre os
 * textos do tutorial atrás das palavras do dilema. Este aqui é o mesmo remédio
 * para a classe toda: código de tarefa, marca de seção e caminho de arquivo do
 * repositório não têm o que fazer na interface de um jogo.
 *
 * **A varredura é do objeto, e não do arquivo.** O `i18n.ts` está cheio de
 * comentários que citam `P7-03` e `docs/GDD.md §2.6` com razão — eles explicam
 * de onde o texto veio. Ler o código-fonte acusaria todos eles. O que importa é
 * o que chega ao `textContent`, então quem é lido aqui é o `ui` já montado.
 */

type Achado = { readonly caminho: string; readonly valor: string };

/**
 * O que entra no lugar de cada parâmetro das funções do `i18n`.
 *
 * Uma lista de textos serve para os dois formatos que existem no arquivo: quem
 * espera `string` recebe `ALFA,BETA` na interpolação, e quem espera
 * `readonly string[]` recebe a lista que o `Intl.ListFormat` sabe formatar. Um
 * texto sozinho quebraria o segundo grupo.
 */
const ARGUMENTO = ['ALFA', 'BETA'];

function coletar(valor: unknown, caminho: string, achados: Achado[]): void {
  if (typeof valor === 'string') {
    achados.push({ caminho, valor });
    return;
  }

  if (typeof valor === 'function') {
    const fabrica = valor as (...args: readonly unknown[]) => unknown;
    // `length` é a aridade declarada. O `max(1)` cobre uma função sem parâmetro
    // nomeado, que ainda assim devolve texto.
    const argumentos = Array.from({ length: Math.max(fabrica.length, 1) }, () => ARGUMENTO);
    const saida = fabrica(...argumentos);

    if (typeof saida !== 'string') {
      throw new Error(`i18n: ${caminho} é função e não devolveu texto.`);
    }

    achados.push({ caminho: `${caminho}()`, valor: saida });
    return;
  }

  if (Array.isArray(valor)) {
    valor.forEach((item, indice) => coletar(item, `${caminho}[${indice}]`, achados));
    return;
  }

  if (valor !== null && typeof valor === 'object') {
    for (const [chave, item] of Object.entries(valor)) {
      coletar(item, `${caminho}.${chave}`, achados);
    }
    return;
  }

  // Um número ou um booleano aqui seria texto de UI que não é texto. Falhar é
  // melhor do que ignorar em silêncio: a varredura precisa cobrir tudo, ou não
  // vale nada.
  throw new Error(`i18n: ${caminho} não é texto, lista, objeto nem função — é ${typeof valor}.`);
}

const TEXTOS: readonly Achado[] = (() => {
  const achados: Achado[] = [];
  coletar(ui, 'ui', achados);
  return achados;
})();

const PROIBIDOS = [
  { descricao: 'um código de tarefa do PLANO.md', padrao: /\bP\d-\d{2}\b/ },
  { descricao: 'um código SETUP-nn', padrao: /\bSETUP-\d{2}\b/ },
  { descricao: 'uma marca de seção (§) dos documentos', padrao: /§/ },
  { descricao: 'um caminho de arquivo do repositório', padrao: /\b(?:docs|src|tests)\/|\.md\b/ },
];

describe('textos da interface', () => {
  // Uma varredura que não varre nada passa sempre. Estes dois primeiros testes
  // existem para que o resto signifique alguma coisa.
  it('alcança todo o objeto, e não só o primeiro nível', () => {
    const caminhos = TEXTOS.map((achado) => achado.caminho);

    expect(caminhos).toContain('ui.title.start'); // texto solto
    expect(caminhos).toContain('ui.title.pitch[0]'); // item de lista
    expect(caminhos).toContain('ui.map.support()'); // função
    expect(caminhos).toContain('ui.map.heat.caption()'); // função aninhada fundo
    expect(caminhos).toContain('ui.tutorial.fair.lines[0]'); // lista aninhada
  });

  it('não deixa nenhum texto de fora', () => {
    // Se alguém trocar um texto por um número, o `coletar` lança em vez de
    // ignorar — e este teste é o que garante que o `coletar` chegou a rodar.
    expect(TEXTOS.length).toBeGreaterThan(120);
    expect(TEXTOS.every((achado) => achado.valor.length > 0)).toBe(true);
  });

  it.each(PROIBIDOS)('ACEITE: nenhum texto da interface traz $descricao', ({ padrao }) => {
    // A lista vazia é o aceite. Quando falha, a mensagem do vitest mostra o
    // caminho e o texto inteiro do culpado — que é o que se precisa saber.
    const culpados = TEXTOS.filter((achado) => padrao.test(achado.valor)).map(
      (achado) => `${achado.caminho} → ${achado.valor}`,
    );

    expect(culpados).toEqual([]);
  });
});
