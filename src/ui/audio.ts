// Os três efeitos sonoros e o estado de mudo (P7-05).
//
// Mora em `ui/` e não em `engine/`: a regra de ouro do §3 diz que o engine não
// sabe que existe uma tela, e som é tela. O engine continua sem saber que a
// compra de um nó faz barulho — quem liga uma coisa à outra é o main.ts.
//
// **O caminho de cada arquivo não está escrito neste `.ts`, e é o ponto.** Ele
// vem do src/data/audio.json, e o `import.meta.glob` abaixo resolve o nome do
// arquivo para a URL que o Vite gerar. É o que faz o contrato do `[D-Musica]`
// (PLANO.md) valer de verdade: quando o cargo entregar `.ogg`, ele põe os
// arquivos na pasta e corrige o campo `file` do JSON. Nenhuma linha de código
// muda, e os `.wav` de andaime do scripts/gerar-audio.mjs podem ser apagados.
//
// **Nada aqui pode lançar**, pela mesma razão do storage.ts: um jogo que não
// abre porque não conseguiu tocar um som seria o pior desfecho possível para uma
// tarefa cujo objetivo é fazer barulho. Som ausente é silêncio, não erro.

import manifest from '../data/audio.json';

/**
 * Os três momentos que fazem barulho.
 *
 * União fechada, e não `string`: é o que faz o `tsc` cobrar o dia em que alguém
 * remover uma entrada do JSON sem remover a chamada — ou o contrário.
 */
export type SfxName = 'unlock' | 'alert' | 'outcome';

export const SFX_NAMES = ['unlock', 'alert', 'outcome'] as const;

export type Sfx = {
  /** O nome do arquivo dentro de `src/assets/audio/`, sem caminho. */
  readonly file: string;
  /** De 0 a 1. Ajuste de mixagem, não de balanceamento — por isso vive no JSON. */
  readonly volume: number;
};

export const sfx: Readonly<Record<SfxName, Sfx>> = manifest;

/**
 * As URLs que o Vite gerou para os arquivos de som.
 *
 * O padrão é a pasta inteira, e não os três nomes: um `.ogg` que o cargo de
 * Música ponha ali passa a ser resolvido sem tocar neste arquivo. Em troca, um
 * arquivo esquecido na pasta entra no bundle sem ninguém pedir — é o que o
 * `tests/audio.test.ts` confere, varrendo o disco contra o manifesto.
 *
 * `Record<string, unknown>` de propósito: o valor de um glob não é conferido
 * pelo compilador, então quem confere é o `sfxUrl` abaixo, em tempo de execução.
 */
const assets: Record<string, unknown> = import.meta.glob('../assets/audio/*', {
  eager: true,
  query: '?url',
  import: 'default',
});

/** O último trecho de um caminho, sem depender de `path` (que é de Node). */
function baseName(path: string): string {
  const parts = path.split('/');
  return parts[parts.length - 1] ?? path;
}

/** Os arquivos que o `import.meta.glob` achou, pelo nome puro. Para os testes. */
export function audioAssets(): readonly string[] {
  return Object.keys(assets).map(baseName).sort();
}

/**
 * A URL do efeito, ou `null` quando o arquivo do manifesto não está na pasta.
 *
 * O `null` não é defensividade decorativa: é exatamente o que acontece se o
 * cargo de Música corrigir o JSON para `.ogg` e esquecer de subir o arquivo. Na
 * tela isso vira silêncio; na suíte, um teste vermelho.
 */
export function sfxUrl(name: SfxName): string | null {
  const wanted = sfx[name].file;

  for (const [path, url] of Object.entries(assets)) {
    if (baseName(path) === wanted && typeof url === 'string') return url;
  }

  return null;
}

// --------------------------------------------------------------- o mudo ---

/**
 * O estado de som, e nada além dele.
 *
 * **Não entra no `GameState`**, pela mesma razão que a velocidade e a pausa não
 * entram (controls.ts): mudo é de quem assiste, não da simulação. Pô-lo lá
 * mudaria o contrato do §3 do GDD e obrigaria a subir o `SAVE_VERSION` por um
 * dado que não muda uma vírgula do clima.
 */
export type Sound = {
  readonly muted: boolean;
};

export function createSound(muted: boolean): Sound {
  return { muted };
}

export function toggleMute(sound: Sound): Sound {
  return { muted: !sound.muted };
}

/**
 * O efeito a tocar, ou `null` para não tocar nada.
 *
 * A decisão fica separada da ação de propósito: é isto que dá um teste de
 * verdade ao "no mudo não sai som", sem precisar de um elemento de áudio que o
 * jsdom não implementa.
 */
export function sfxToPlay(sound: Sound, name: SfxName): Sfx | null {
  return sound.muted ? null : sfx[name];
}

// ----------------------------------------------------------------- DOM ---

/**
 * Um elemento por efeito, criado na primeira vez que ele toca.
 *
 * Reaproveitar em vez de criar a cada disparo evita uma fila de elementos de
 * áudio órfãos numa partida de 900 meses. Dois efeitos diferentes se sobrepõem
 * sem problema, porque cada um tem o seu; o mesmo efeito duas vezes seguidas
 * recomeça, que é o comportamento esperado de um som de clique.
 */
const players = new Map<SfxName, HTMLAudioElement>();

/**
 * Toca o efeito. Devolve se chegou a tentar — falso no mudo e no arquivo
 * ausente.
 *
 * O `catch` no `play()` não é opcional: o navegador **rejeita** a promessa
 * quando a página ainda não recebeu interação do usuário, e uma rejeição não
 * tratada aparece no console de quem estiver com ele aberto. Na prática o caso
 * não acontece — todo som daqui vem depois de um clique —, mas a promessa
 * rejeitada é do navegador, não nossa.
 */
export function playSfx(sound: Sound, name: SfxName): boolean {
  const entry = sfxToPlay(sound, name);
  if (entry === null) return false;

  const url = sfxUrl(name);
  if (url === null) return false;

  try {
    let player = players.get(name);
    if (player === undefined) {
      player = new Audio(url);
      players.set(name, player);
    }

    player.volume = entry.volume;
    player.currentTime = 0;
    void player.play().catch(() => {
      // Silêncio é o pior que pode acontecer aqui, e já aconteceu.
    });
    return true;
  } catch {
    return false;
  }
}

/** Esquece os elementos criados. Existe para os testes não vazarem um no outro. */
export function resetSfx(): void {
  players.clear();
}
