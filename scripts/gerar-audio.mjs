// Gera os três efeitos sonoros do P7-05, em WAV, dentro de src/assets/audio/.
//
//     node scripts/gerar-audio.mjs
//
// **Por que um gerador, e não três arquivos baixados.** O P7-05 pede "3 efeitos
// CC0", e o contrato do [D-Musica] no PLANO.md aceita "autoral ou CC0". Esta
// máquina não tem `ffmpeg` nem `oggenc`, então produzir `.ogg` aqui não era
// possível; e baixar arquivos de terceiros traria para dentro do repositório uma
// licença que eu teria que verificar de fora, escolhendo som pelo nome do
// arquivo. Somar seno e decaimento resolve os dois problemas de uma vez: a
// autoria é nossa (a regra 10 fica satisfeita por construção, não por promessa),
// e o resultado é reproduzível — quem duvidar do som roda este arquivo de novo e
// compara os bytes.
//
// **Isto é andaime, e o contrato existe para ele ser trocado.** Quando o cargo
// de Música entrar, ele entrega `.ogg` na mesma pasta e corrige o campo `file`
// do src/data/audio.json. Nenhum `.ts` muda, e este script pode ser apagado.
//
// **Sem `Math.random()`** (regra 7): não há sorteio nenhum aqui. O mesmo comando
// escreve sempre os mesmos bytes, o que é o que permite conferir no `git diff`
// se um arquivo de som mudou de verdade ou só foi regravado.

const SAMPLE_RATE = 22050; // 11 kHz de Nyquist — sobra para tons de até ~1 kHz.
const BITS = 16;
const PICO = 0.85; // Deixa margem para o navegador não distorcer no volume 1.

const DESTINO = new URL('../src/assets/audio/', import.meta.url);

// --------------------------------------------------------------- síntese ---

/**
 * Uma nota: seno na fundamental mais os harmônicos pedidos, com ataque curto e
 * decaimento exponencial.
 *
 * O ataque de 4 ms não é sutileza de músico: começar um seno em amplitude cheia
 * é uma descontinuidade, e descontinuidade em áudio é um clique audível. O mesmo
 * vale para o fim, que o decaimento resolve sozinho ao chegar perto de zero.
 */
function nota({ freq, inicio, duracao, ganho, harmonicos = [] }) {
  const ataque = 0.004;
  // Constante escolhida para a cauda valer ~0,1% da amplitude ao fim da nota.
  const k = 6.9 / duracao;

  return (t) => {
    const local = t - inicio;
    if (local < 0 || local > duracao) return 0;

    const envelope = Math.min(1, local / ataque) * Math.exp(-k * local);

    let onda = Math.sin(2 * Math.PI * freq * local);
    for (const [multiplo, amplitude] of harmonicos) {
      onda += amplitude * Math.sin(2 * Math.PI * freq * multiplo * local);
    }

    return ganho * envelope * onda;
  };
}

/** Soma as vozes, normaliza para o pico e aplica um esmaecimento final. */
function renderizar(vozes, segundos) {
  const total = Math.round(segundos * SAMPLE_RATE);
  const amostras = new Float64Array(total);

  for (let i = 0; i < total; i += 1) {
    const t = i / SAMPLE_RATE;
    let soma = 0;
    for (const voz of vozes) soma += voz(t);
    amostras[i] = soma;
  }

  // O esmaecimento dos últimos 8 ms fecha o arquivo em zero mesmo que alguma
  // cauda ainda esteja soando — é o clique do fim, o irmão do clique do começo.
  const saida = Math.round(0.008 * SAMPLE_RATE);
  for (let i = 0; i < saida; i += 1) {
    const posicao = total - saida + i;
    if (posicao >= 0) amostras[posicao] *= 1 - i / saida;
  }

  let maior = 0;
  for (const amostra of amostras) maior = Math.max(maior, Math.abs(amostra));
  const escala = maior === 0 ? 0 : PICO / maior;

  return amostras.map((amostra) => amostra * escala);
}

// ------------------------------------------------------------------ WAV ---

/** WAV mono PCM de 16 bits — o cabeçalho canônico de 44 bytes, e nada mais. */
function wav(amostras) {
  const dados = amostras.length * 2;
  const buffer = new ArrayBuffer(44 + dados);
  const vista = new DataView(buffer);

  const texto = (posicao, valor) => {
    for (let i = 0; i < valor.length; i += 1) vista.setUint8(posicao + i, valor.charCodeAt(i));
  };

  texto(0, 'RIFF');
  vista.setUint32(4, 36 + dados, true);
  texto(8, 'WAVE');
  texto(12, 'fmt ');
  vista.setUint32(16, 16, true); // Tamanho do bloco fmt.
  vista.setUint16(20, 1, true); // 1 = PCM sem compressão.
  vista.setUint16(22, 1, true); // Mono.
  vista.setUint32(24, SAMPLE_RATE, true);
  vista.setUint32(28, SAMPLE_RATE * 2, true); // Bytes por segundo.
  vista.setUint16(32, 2, true); // Alinhamento de bloco.
  vista.setUint16(34, BITS, true);
  texto(36, 'data');
  vista.setUint32(40, dados, true);

  for (let i = 0; i < amostras.length; i += 1) {
    // O limite de 32767 é assimétrico de propósito: o mínimo do int16 é -32768,
    // e multiplicar por 32768 estouraria o positivo em +1.
    const valor = Math.max(-1, Math.min(1, amostras[i]));
    vista.setInt16(44 + i * 2, Math.round(valor * 32767), true);
  }

  return new Uint8Array(buffer);
}

// ------------------------------------------------------------- os três ---

// As três estão em Dó maior, e não é decoração: os efeitos tocam juntos numa
// mesma partida — uma compra logo depois de um alerta é o caso comum — e três
// timbres fora de escala soariam como três jogos diferentes.

/** Compra de habilidade: dois tons subindo. Curto, porque acontece muito. */
const COMPRA = {
  file: 'unlock.wav',
  segundos: 0.3,
  vozes: [
    nota({ freq: 659.25, inicio: 0, duracao: 0.12, ganho: 0.8, harmonicos: [[2, 0.25]] }), // Mi5
    nota({ freq: 987.77, inicio: 0.08, duracao: 0.2, ganho: 0.7, harmonicos: [[2, 0.2]] }), // Si5
  ],
};

/** Evento crítico: dois tons descendo, com o terceiro harmônico dando a aresta. */
const ALERTA = {
  file: 'alert.wav',
  segundos: 0.5,
  vozes: [
    nota({ freq: 440, inicio: 0, duracao: 0.22, ganho: 0.85, harmonicos: [[3, 0.3]] }), // Lá4
    nota({ freq: 349.23, inicio: 0.18, duracao: 0.3, ganho: 0.85, harmonicos: [[3, 0.3]] }), // Fá4
  ],
};

/** Fim da partida: um arpejo de Dó maior. Mais longo — acontece uma vez só. */
const FIM = {
  file: 'outcome.wav',
  segundos: 0.85,
  vozes: [
    nota({ freq: 523.25, inicio: 0, duracao: 0.5, ganho: 0.6, harmonicos: [[2, 0.15]] }), // Dó5
    nota({ freq: 659.25, inicio: 0.16, duracao: 0.5, ganho: 0.6, harmonicos: [[2, 0.15]] }), // Mi5
    nota({ freq: 783.99, inicio: 0.32, duracao: 0.5, ganho: 0.6, harmonicos: [[2, 0.15]] }), // Sol5
  ],
};

const { writeFileSync } = await import('node:fs');

for (const efeito of [COMPRA, ALERTA, FIM]) {
  const bytes = wav(renderizar(efeito.vozes, efeito.segundos));
  writeFileSync(new URL(efeito.file, DESTINO), bytes);
  console.log(`${efeito.file}: ${(bytes.length / 1024).toFixed(1)} KB`);
}
