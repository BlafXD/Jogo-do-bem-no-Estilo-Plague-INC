import { readdirSync } from 'node:fs';
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

  it('no mudo não sai som nenhum, em nenhum dos três efeitos', () => {
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
  it('cobre exatamente os três nomes que o código conhece', () => {
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
   * **O teste que o cargo de Música vai encontrar.** Trocar os `.wav` de andaime
   * por `.ogg` é editar o campo `file` e subir o arquivo; esquecer uma das duas
   * metades é o erro provável, e ele fica vermelho aqui em vez de virar silêncio
   * na feira.
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
