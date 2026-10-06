import { readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

import { climateEvents, skills } from '../src/engine/state';

/**
 * O contrato entre o `docs/CIENCIA.md` e os dados do jogo (REF-07).
 *
 * **A regra 9 da FORMA-DE-TRABALHO — "nenhum dado científico inventado" — era
 * uma promessa sem fiador.** O próprio `CIENCIA.md` avisa que a tabela dos
 * fatos sai do `skills.json` e que, "se um `fact` mudar lá e não aqui, os dois
 * deixam de bater e é para regerar, não para editar à mão". Só que nada cobrava
 * isso: até o `REF-07` dava para trocar a frase de um nó e deixar a fonte
 * apontando para outra coisa, e a suíte ficava verde.
 *
 * Este arquivo é o fiador. Ele não confere se o fato é **verdade** — isso é
 * trabalho de quem pesquisa, e a fonte está lá para ser conferida à mão. Ele
 * confere que todo fato que o jogador lê **tem uma linha com fonte**, e que a
 * linha fala do mesmo fato.
 *
 * Lê o `.md` como texto, de propósito: um gerador que reescrevesse o documento
 * resolveria a sincronia e perderia a coluna de observação, que é escrita à mão
 * e é onde mora metade do valor do arquivo.
 */

const CIENCIA = readFileSync('docs/CIENCIA.md', 'utf8');

/**
 * As linhas de tabela do documento, quebradas em células.
 *
 * O separador é o `|` do Markdown. Linhas de cabeçalho e de alinhamento saem
 * fora porque nenhuma delas tem um id de nó na primeira célula.
 */
const LINHAS: readonly (readonly string[])[] = CIENCIA.split('\n')
  .filter((line) => line.trimStart().startsWith('|'))
  .map((line) =>
    line
      .trim()
      .replace(/^\|/, '')
      .replace(/\|$/, '')
      .split('|')
      .map((cell) => cell.trim()),
  );

/** A linha da tabela cujo primeiro campo é `` `id` ``, ou `undefined`. */
function linhaDe(id: string): readonly string[] | undefined {
  return LINHAS.find((cells) => cells[0] === `\`${id}\``);
}

/** As chaves de fonte citadas numa célula: `**[IRENA24]**` vira `IRENA24`. */
function fontesDe(cell: string): readonly string[] {
  return [...cell.matchAll(/\[([A-Z0-9-]+)\]/g)].map((match) => match[1] ?? '');
}

/** Toda chave que o documento **define** numa tabela de fontes. */
const DEFINIDAS = new Set(LINHAS.flatMap((cells) => fontesDe(cells[0] ?? '')));

describe('docs/CIENCIA.md cobre todo fato que o jogador lê', () => {
  it('tem uma linha para cada um dos 40 nós da árvore', () => {
    const faltando = skills.filter((skill) => linhaDe(skill.id) === undefined).map((s) => s.id);

    expect(faltando).toEqual([]);
  });

  /**
   * **O teste que o REF-07 existe para não deixar quebrar.** Vinte fatos novos
   * entraram de uma vez; sem isto, um deles ficar com a frase de outro passaria.
   */
  it('a frase registrada é a mesma que o nó mostra', () => {
    for (const skill of skills) {
      const linha = linhaDe(skill.id);
      expect(linha?.[1], skill.id).toBe(skill.fact);
    }
  });

  it('todo nó cita ao menos uma fonte, e a fonte está definida no documento', () => {
    for (const skill of skills) {
      const citadas = fontesDe(linhaDe(skill.id)?.[2] ?? '');

      expect(citadas.length, skill.id).toBeGreaterThan(0);
      for (const chave of citadas) {
        expect(DEFINIDAS.has(chave), `${skill.id} cita [${chave}]`).toBe(true);
      }
    }
  });

  /**
   * Os eventos seguem a mesma regra desde o `P7-01`, e entram aqui porque o
   * contrato é o mesmo: o `fact` de um evento também é frase que o jogador lê.
   */
  it('tem uma linha para cada evento, com a frase e a fonte', () => {
    for (const event of climateEvents) {
      const linha = linhaDe(event.id);

      expect(linha?.[1], event.id).toBe(event.fact);
      expect(fontesDe(linha?.[2] ?? '').length, event.id).toBeGreaterThan(0);
    }
  });

  it('nenhuma chave de fonte é definida duas vezes com links diferentes', () => {
    const porChave = new Map<string, Set<string>>();

    for (const cells of LINHAS) {
      const [chave, , link] = cells;
      const nomes = fontesDe(chave ?? '');
      if (nomes.length !== 1 || link === undefined || !link.startsWith('<http')) continue;

      const nome = nomes[0] ?? '';
      porChave.set(nome, (porChave.get(nome) ?? new Set()).add(link));
    }

    for (const [chave, links] of porChave) {
      expect([...links].length, `[${chave}]`).toBe(1);
    }
  });
});
