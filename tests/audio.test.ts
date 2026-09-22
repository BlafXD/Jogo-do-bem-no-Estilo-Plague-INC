import { readdirSync, readFileSync, statSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  audioAssets,
  createSound,
  sfx,
  SFX_NAMES,
  sfxToPlay,
  sfxUrl,
  toggleMute,
  type SfxName,
} from '../src/ui/audio';

/**
 * O núcleo puro do som (P7-05) e a costura entre o manifesto e o disco.
 *
 * O `playSfx` fica de fora: ele precisa de `HTMLAudioElement.play`, que o jsdom
 * **não implementa** — a chamada vira um "Not implemented" no console do
 * Vitest, e um teste que só produz ruído no rodapé não prova nada. Por isso a
 * decisão de tocar mora no `sfxToPlay`, que é puro e está coberto aqui.
 */
describe('o estado de som', () => {
  it('começa como pedido, e o toggle não muta o que recebeu', () => {
    const comSom = createSound(false);
    const mudo = toggleMute(comSom);

    expect(mudo.muted).toBe(true);
    expect(comSom.muted).toBe(false);
    expect(toggleMute(mudo).muted).toBe(false);
  });

  it('no mudo não sai som nenhum, em nenhum dos efeitos', () => {
    const mudo = createSound(true);

    for (const name of SFX_NAMES) {
      expect(sfxToPlay(mudo, name)).toBeNull();
    }
  });

  it('com som, cada efeito devolve a entrada do manifesto', () => {
    const comSom = createSound(false);

    for (const name of SFX_NAMES) {
      expect(sfxToPlay(comSom, name)).toBe(sfx[name]);
    }
  });
});

describe('o manifesto de áudio', () => {
  it('cobre exatamente os nomes que o código conhece', () => {
    expect(Object.keys(sfx).sort()).toEqual([...SFX_NAMES].sort());
  });

  it('tem volume entre 0 e 1 em todos', () => {
    for (const name of SFX_NAMES) {
      expect(sfx[name].volume).toBeGreaterThan(0);
      expect(sfx[name].volume).toBeLessThanOrEqual(1);
    }
  });

  it('nomeia arquivo, e não caminho — quem resolve o caminho é o Vite', () => {
    for (const name of SFX_NAMES) {
      expect(sfx[name].file).not.toContain('/');
    }
  });

  /**
   * **O teste que o cargo de Música vai encontrar.** Trocar um som é editar o
   * campo `file` e subir o arquivo; esquecer uma das duas metades é o erro
   * provável, e ele fica vermelho aqui em vez de virar silêncio na feira.
   */
  it('aponta para arquivos que existem de verdade na pasta', () => {
    const naPasta = readdirSync('src/assets/audio');

    for (const name of SFX_NAMES) {
      expect(naPasta).toContain(sfx[name].file);
      expect(sfxUrl(name)).not.toBeNull();
    }
  });

  /**
   * A outra ponta da mesma regra, e ela protege a build da feira (P8-05): o
   * `import.meta.glob` do audio.ts varre a pasta inteira, então um arquivo
   * esquecido ali entra no `dist-feira/index.html` como base64 sem ninguém
   * pedir — num arquivo único, cada sobra é peso que vai no pendrive.
   */
  it('não deixa arquivo órfão na pasta', () => {
    const usados = SFX_NAMES.map((name: SfxName) => sfx[name].file).sort();

    expect(readdirSync('src/assets/audio').sort()).toEqual(usados);
    expect(audioAssets()).toEqual(usados);
  });
});

/**
 * O contrato do `[D-Musica]` (PLANO.md), cobrado nos arquivos de verdade desde
 * o P7-09: até seis efeitos, em `.ogg`, com menos de 100 KB cada. O limite de
 * tamanho não é enfeite — o build da feira embute todo som no HTML único.
 */
describe('o contrato do [D-Musica]', () => {
  const PASTA = 'src/assets/audio';

  it('tem no máximo seis efeitos', () => {
    expect(SFX_NAMES.length).toBeLessThanOrEqual(6);
  });

  /**
   * A extensão não basta: um `.wav` renomeado para `.ogg` passaria por ela. Todo
   * arquivo Ogg começa com a assinatura "OggS".
   */
  it('todo efeito é um arquivo Ogg de verdade', () => {
    for (const name of SFX_NAMES) {
      const arquivo = sfx[name].file;
      expect(arquivo, name).toMatch(/.ogg$/);
      expect(readFileSync(`${PASTA}/${arquivo}`, 'utf8').startsWith('OggS'), arquivo).toBe(true);
    }
  });

  it('todo efeito tem menos de 100 KB', () => {
    for (const name of SFX_NAMES) {
      const arquivo = sfx[name].file;
      expect(statSync(`${PASTA}/${arquivo}`).size, arquivo).toBeLessThan(100 * 1024);
    }
  });
});
