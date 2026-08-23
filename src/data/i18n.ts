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
    inertia: {
      label: 'Inércia',
      hint: 'A força que resiste à mudança, de 0 a 100. Cresce quanto mais você corta, e o apoio público a segura. A cada seis meses ela age.',
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

  // Os cartões de evento climático (P7-02), com a regra do docs/GDD.md §2.5.
  //
  // **O `fact` de cada evento não está aqui**, e é de propósito: ele mora no
  // `src/data/events.json`, que é o arquivo que o pacote [D-Historia] tem
  // contrato para editar sem abrir um `.ts` (`PLANO.md`). Trazê-lo para cá
  // tiraria justamente o texto que o cargo de narrativa existe para escrever.
  events: {
    label: 'Eventos climáticos',
    hint: 'O que o clima está cobrando agora. Cada cartão fica alguns meses em cena.',

    // Ícone **mais** rótulo escrito, como na árvore e no cartão de fim: o §5 do
    // GDD proíbe comunicar gravidade só por cor. Os dois ícones têm formas
    // diferentes de longe — triângulo e círculo —, não só tons diferentes.
    severity: {
      critical: { icon: '▲', label: 'Crítico' },
      moderate: { icon: '●', label: 'Moderado' },
    },

    /** O cabeçalho do cartão: onde bateu, e em que ano. */
    where: (region: string, year: string) => `${region} · ${year}`,

    /**
     * O aviso da auto-pausa.
     *
     * Diz **por que** o tempo parou e **como** voltar. Um jogo que para sozinho
     * sem explicar parece travado — e num estande de feira ninguém vai
     * investigar, vai chamar alguém.
     */
    paused: (name: string) =>
      `Tempo pausado: ${name}. Aperte Retomar, ou a barra de espaço, para seguir.`,
  },

  // A contenção da Inércia (P7-03), com a regra do docs/GDD.md §2.6.
  //
  // Os números — o alívio, o custo, o que falta — chegam como argumento em vez
  // de estarem escritos nas frases. É a regra 8 aplicada onde ela quase escapa:
  // "derruba 25 pontos" **é** um número de balanceamento, e uma frase que o
  // repete vira mentira no dia em que o balance.json mudar, sem nada quebrar.
  contain: {
    label: 'Contenção da Inércia',
    name: 'Conter a Inércia',
    hint: 'Gastar PAC aqui é não comprar um nó neste mês. É a escolha que o antagonista força.',
    description: (relief: string) =>
      `Derruba ${relief} pontos da Inércia. O estrago que ela já fez não volta — isto compra tempo, não perdão.`,
    cost: (points: string) => `${points} PAC`,

    // Ícone **mais** rótulo escrito, como na árvore e nos cartões de evento: o
    // §5 do GDD proíbe comunicar estado só por cor.
    status: {
      available: { icon: '●', label: 'Disponível' },
      unaffordable: { icon: '◌', label: 'PAC insuficiente' },
      locked: { icon: '✕', label: 'Bloqueado' },
      // O quarto estado não é um erro do jogador, é uma economia: conter uma
      // Inércia que já está em zero só queima PAC.
      idle: { icon: '—', label: 'Nada a conter' },
    },

    missingPoints: (points: string) => `Faltam ${points} PAC`,
    requires: (name: string) => `Exige: ${name}`,
    idle: 'A Inércia está em zero. Guarde o PAC.',
  },

  session: {
    label: 'Partida',
    reset: 'Reiniciar partida',
    resetHint: 'Apaga a partida salva e recomeça em 2025.',
    // O rótulo do botão de confirmar diz o que vai acontecer, não "Sim" nem
    // "OK": quem clica rápido precisa ler a consequência no próprio botão.
    confirm: 'Apagar e recomeçar',
    confirmHint: 'Confirma o reinício. Não dá para desfazer.',
    cancel: 'Cancelar',
    cancelHint: 'Mantém a partida como está.',
    warning: 'A partida salva será apagada. Não dá para desfazer.',
    autosave: 'A partida é salva sozinha a cada mês.',
    restored: (year: string) => `Partida retomada em ${year}.`,
  },

  // O cartão de fim de partida (P6-08), com a regra do docs/GDD.md §2.7.
  //
  // Os limiares chegam como argumento em vez de estarem escritos nas frases. É
  // a regra 8 aplicada onde ela quase escapa: "abaixo de 1,5 °C" **é** um
  // número de balanceamento, e uma frase que o repete vira mentira no dia em
  // que o balance.json mudar — sem nada quebrar, que é o pior jeito de errar.
  outcome: {
    label: 'Resultado da partida',
    playAgain: 'Jogar de novo',
    playAgainHint: 'Começa uma partida nova em 2025.',
    skillsLabel: 'Habilidades',
    skillsValue: (bought: string, total: string) => `${bought} de ${total}`,

    // Como a partida acabou — a linha de cima do cartão.
    ending: {
      netZero: (limit: string) => `As emissões líquidas caíram abaixo de ${limit} antes de 2100.`,
      horizon: (year: string) => `A partida chegou a ${year} com o mundo ainda emitindo.`,
      temperature: (limit: string) => `O aquecimento passou de ${limit}. A agência foi dissolvida.`,
      support: 'O apoio público zerou nas oito regiões. A agência foi dissolvida.',
    },

    // Ícone **mais** rótulo escrito, como nos estados da árvore: o §5 do GDD
    // proíbe comunicar resultado só por cor, e medalha é justamente o caso em
    // que a cor tenta carregar tudo sozinha. Tire as cores da tela e o cartão
    // continua dizendo "Ouro", "Sem medalha" ou "Derrota" por escrito.
    result: {
      gold: {
        icon: '🥇',
        title: 'Ouro',
        verdict: (limit: string) =>
          `Abaixo de ${limit} — o melhor caso descrito pelo Acordo de Paris.`,
      },
      silver: {
        icon: '🥈',
        title: 'Prata',
        verdict: (limit: string) =>
          `Abaixo de ${limit} — dentro do limite de Paris, longe do ideal.`,
      },
      bronze: {
        icon: '🥉',
        title: 'Bronze',
        verdict: (limit: string) => `Abaixo de ${limit} — o mundo virou a curva tarde, mas virou.`,
      },
      none: {
        icon: '◐',
        title: 'Sem medalha',
        verdict: (limit: string) =>
          `Acima de ${limit} — o mundo atravessou o século sem virar a curva.`,
      },
      // O único cujo veredito não leva limiar: quem perdeu não parou "abaixo"
      // nem "acima" de nada que valha contar — a frase fala do que sobrou.
      defeat: {
        icon: '✕',
        title: 'Derrota',
        verdict: 'O carbono já emitido não volta atrás: a curva precisava ter virado antes.',
      },
    },
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
