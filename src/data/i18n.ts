// Todo texto que o jogador lê na interface.
//
// A regra 8 da FORMA-DE-TRABALHO.md proíbe string de UI espalhada pelo código;
// ela vive aqui. A estrutura já tem o formato de um dicionário de idioma, mas
// só existe pt-BR nesta entrega (§12): quando entrar um segundo idioma, o que
// muda é o que envolve este objeto, não quem o consome.
//
// **O nome do jogo não está aqui**, de propósito: ele aparece no <title> e no
// <h1> do index.html, e os dois têm que casar. Enquanto o P1-04 não decidir o
// nome definitivo, manter os dois lados no mesmo arquivo é menos duplicação do
// que espalhá-los por dois.
//
// Chaves em inglês, conteúdo em pt-BR — é o §11 aplicado ao pé da letra.

/**
 * Junta nomes na forma que o português escreve: "a e b", "a, b e c". Mora aqui
 * porque a conjunção é regra do idioma, não do jogo — quando entrar um segundo
 * idioma (§12), é este arquivo que troca.
 */
const listOfNames = new Intl.ListFormat('pt-BR', { style: 'long', type: 'conjunction' });

export const ui = {
  hud: {
    year: {
      label: 'Ano',
      hint: 'O ano corrente. A partida vai de 2025 a 2100.',
    },
    temperature: {
      label: 'Temperatura',
      hint: 'Aquecimento acima do nível pré-industrial. Passar de 3 °C dissolve a agência.',
    },
    emissions: {
      label: 'Emissões',
      hint: 'O que o mundo emite por ano, somando as 8 regiões. A meta é chegar a zero.',
    },
    actionPoints: {
      label: 'PAC',
      hint: 'Pontos de Ação Climática: a moeda que compra habilidades. Mostrado arredondado para baixo — você só gasta o que já tem.',
    },
    support: {
      label: 'Apoio médio',
      hint: 'Média do apoio público das 8 regiões, de 0 a 100. Se zerar, a agência é dissolvida.',
    },
  },

  controls: {
    label: 'Controle de tempo',
    pause: 'Pausar',
    resume: 'Retomar',
    pauseHint: 'Pausa e retoma a passagem do tempo. Atalho: barra de espaço.',
    speedHint: 'Velocidade da simulação. Atalhos: as teclas 1, 2 e 4.',
  },

  tree: {
    label: 'Árvore de habilidades',
    intro:
      'Cada nó custa PAC e libera os que vêm abaixo dele. Nenhuma partida rende PAC para comprar tudo — a escolha é o jogo.',
    branches: {
      energy: 'Energia',
      transport: 'Transporte e Cidades',
      nature: 'Natureza',
      industry: 'Indústria',
      society: 'Sociedade',
    },

    // Cada estado é ícone **mais** rótulo escrito. O §5 do GDD proíbe comunicar
    // estado só por cor, e é este par que carrega a informação — a borda do
    // tree.css é reforço, não o recado. Os quatro rótulos são de propósito
    // diferentes entre si: se "Bloqueado" e "PAC insuficiente" dissessem a mesma
    // coisa, separar os dois estados não teria servido para nada.
    status: {
      unlocked: { icon: '✔', label: 'Comprado' },
      available: { icon: '●', label: 'Disponível' },
      unaffordable: { icon: '◌', label: 'PAC insuficiente' },
      locked: { icon: '✕', label: 'Bloqueado' },
    },

    cost: (points: string) => `${points} PAC`,
    missingPoints: (points: string) => `Faltam ${points} PAC`,
    requires: (names: readonly string[]) => `Exige: ${listOfNames.format(names)}`,
  },

  hudLabel: 'Indicadores da partida',

  units: {
    celsius: '°C',
    emissionsPerYear: 'Gt/ano',
  },

  app: {
    pending: 'O mapa das 8 regiões entra no P5-01. Por enquanto, o tempo corre e a árvore compra.',
  },
} as const;
