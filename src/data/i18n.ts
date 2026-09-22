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

/**
 * A equipe da agência: o nome, o nome curto e o cargo de cada pessoa (VIS-07).
 *
 * Mora fora do `ui` porque dois lugares a leem — o texto alternativo da tela de
 * título e os personagens dentro da partida —, e o nome escrito duas vezes é o
 * nome que diverge. As chaves são os ids do `src/data/characters.json`.
 */
const person = (name: string, short: string, role: string) =>
  ({
    name,
    short,
    role,
    /** "Ana Luiza, engenheira elétrica": o texto alternativo de um retrato. */
    alt: `${name}, ${role.toLowerCase()}`,
  }) as const;

const team = {
  'ana-luiza': person('Ana Luiza', 'Ana Luiza', 'Engenheira elétrica'),
  'carlos-mendes': person('Carlos Mendes', 'Carlos', 'Engenheiro ambiental'),
  'ricardo-souza': person('Ricardo Souza', 'Ricardo', 'Gestor de recursos hídricos'),
  'juliana-almeida': person(
    'Juliana Almeida',
    'Juliana',
    'Auditora de sustentabilidade corporativa',
  ),
};

/**
 * A Inércia, o antagonista do docs/GDD.md §2.6 (VIS-11). Não é da equipe, mas
 * tem retrato, e o retrato precisa de nome e de texto alternativo. No lugar do
 * cargo vai o que ela é, na frase do próprio GDD — nenhuma fala inventada.
 */
const antagonist = {
  inercia: person('A Inércia', 'Inércia', 'A força que resiste à mudança'),
};

export const ui = {
  hud: {
    year: {
      label: 'Ano',
      hint: 'O ano corrente. A partida vai de 2025 a 2100.',
    },
    temperature: {
      label: 'Temperatura',
      hint: 'Aquecimento acima do nível pré-industrial. Passar de 3 °C dissolve a agência. A régua embaixo do número mostra a faixa de medalha em que o mundo está agora.',
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
    /**
     * Os atalhos escritos na tela, e não só no `title` de cada botão (P8-04).
     *
     * O primeiro passo do tutorial já os ensina, mas ele aparece uma vez, some
     * no "Entendi" e não roda no Modo Feira — que é justamente onde entra quem
     * nunca viu o jogo. Um `title` só existe para quem tem mouse e paciência
     * de parar em cima; quem navega por teclado nunca o encontra.
     */
    shortcuts: 'Atalhos: barra de espaço pausa · teclas 1, 2 e 4 mudam a velocidade.',
  },

  /**
   * O botão de som, na mesma barra da pausa e das velocidades.
   *
   * **O rótulo é a ação, e não o estado** — é o mesmo contrato do botão de
   * pausa, que alterna entre "Pausar" e "Retomar": quem lê "Silenciar" sabe que
   * há som agora. Quem enxerga tem ainda o marcador ● e a borda grossa quando o
   * som está ligado, que são forma e não cor, como o §5 exige.
   */
  sound: {
    mute: 'Silenciar',
    unmute: 'Ativar som',
    hint: 'Liga e desliga os três efeitos sonoros. A escolha vale para as próximas partidas.',
  },

  /**
   * As listras do aquecimento, na barra de baixo (VIS-04).
   *
   * O bloco é uma imagem para o leitor de tela, e o rótulo é a frase que a
   * descreve. Ele diz o que a cor quer dizer, porque o §5 do GDD não deixa a
   * cor ser o recado sozinha. O número de cada ano está no HUD e no marcador.
   */
  stripes: {
    label: (from: string, to: string) =>
      `A partida em listras, um ano por listra, de ${from} até ${to}: cada uma tem a cor da temperatura em que o ano terminou. Os anos que faltam ficam vazios.`,
    hint: 'Cada listra é um ano da partida, na cor da temperatura em que ele terminou. A cor muda de faixa em cada teto de medalha.',
    /** O marcador em cima do ano corrente. */
    now: (year: string, temperature: string) => `${year} · ${temperature}`,
  },

  /**
   * O botão da árvore, na barra de baixo (VIS-04).
   *
   * Desde o VIS-05 ele abre o painel da árvore por cima da partida. O rótulo
   * diz o que o botão mostra, e o PAC ao lado é o saldo para gastar.
   */
  treeButton: {
    label: 'Árvore de habilidades',
    hint: 'Abre a árvore de habilidades por cima da partida. O número é o PAC que você tem para gastar.',
    points: (points: string) => `${points} PAC`,
  },

  /**
   * O painel da árvore (VIS-05): o cabeçalho, o saldo e o botão de fechar.
   *
   * O tempo **não** para com o painel aberto. As pausas automáticas do plano
   * são duas — o evento crítico e o ramo novo —, e a dica do botão de fechar
   * lembra que as teclas do tempo continuam valendo.
   */
  treePanel: {
    title: 'Árvore de habilidades',
    balance: 'PAC disponível',
    balanceHint: 'O PAC que você tem para gastar agora. Ele entra a cada mês.',
    close: 'Fechar',
    closeHint:
      'Fecha a árvore e volta ao mapa. Atalho: Esc. O tempo continua correndo; a barra de espaço pausa.',
  },

  /**
   * O link de pulo (P8-04).
   *
   * Medido no navegador: uma partida em curso tem **35 paradas de tabulação**,
   * e 28 delas são as 8 regiões do mapa mais os 20 nós da árvore. Sem um jeito
   * de saltar esse bloco, quem navega por teclado atravessa o mapa inteiro para
   * chegar à árvore, e a árvore inteira para chegar a qualquer coisa depois
   * dela. É o que a WCAG 2.4.1 (nível A) chama de bloco a ser contornável.
   *
   * Fica invisível até receber o foco: é a primeira parada da página, e a
   * primeira tecla Tab de quem chega o revela.
   */
  skipLink: {
    label: 'Atalhos de navegação',
    toContent: 'Pular para o conteúdo',
    // Desde o VIS-05 a árvore mora num painel fechado, então o atalho a abre
    // em vez de rolar até ela.
    toTree: 'Abrir a árvore de habilidades',
  },

  // A tela de título (P5-06).
  //
  // **O nome do jogo não está aqui**, pela mesma razão registrada no topo deste
  // arquivo: ele vive no `index.html`, junto do `<title>` e do `<h1>`, e o
  // `P1-04` troca os três de uma vez.
  //
  // **O pitch sai comprimido do `docs/GDD.md §1`, sem frase inventada** — papel
  // do jogador, a lógica invertida do *Plague Inc*, e a tensão de não haver PAC
  // para comprar tudo. São três linhas de propósito: o `§2.1` do GDD fecha
  // avisando que a mensagem do ODS 13 está "embutida na mecânica — não em um
  // texto de tutorial".
  //
  // **O `P1-01` conferiu estas três e as manteve.** O one-pager
  // (`docs/CONCEITO.md`) escreve o pitch em cinco linhas; as duas que sobram
  // são o enquadramento da catraca e os números do déficit de PAC, e nenhuma
  // das duas cabe numa tela de título sem empurrar o botão de começar para
  // fora da dobra. A narrativa continua sendo do pacote [D-Historia].
  title: {
    label: 'Início',

    /** A linha em cima do nome (VIS-08): o ODS do projeto, por extenso. */
    ods: 'ODS 13 · Combate às alterações climáticas',

    // As listras do título (VIS-08): uma partida sem nenhuma compra. A legenda
    // ensina a ler as listras antes de a pessoa vê-las na partida.
    band: {
      section: 'Uma partida sem nenhuma compra, em listras',
      caption:
        'Cada listra é um ano, na cor da temperatura. Estas são de uma partida sem nenhuma compra.',
      captionDissolved:
        'Cada listra é um ano, na cor da temperatura. Estas são de uma partida sem nenhuma compra — e ela não chega a 2100.',
      label: (from: string, to: string, temperature: string) =>
        `Uma partida sem nenhuma compra, em listras de ${from} a ${to}: terminou em ${temperature}.`,
      labelDissolved: (from: string, to: string, temperature: string) =>
        `Uma partida sem nenhuma compra, em listras de ${from} a ${to}: chegou a ${temperature}, e a agência foi dissolvida.`,
    },
    pitch: [
      'Você é o Gerente de uma agência climática global, de 2025 a 2100.',
      'É o Plague Inc ao contrário: em vez de evoluir uma praga até o mundo cair, você evolui soluções contra um mundo que já está esquentando.',
      'Nenhuma partida rende PAC para comprar tudo. O jogo é escolher o que fica de fora.',
    ],

    /** O ano vem junto para o jogador reconhecer a partida antes de entrar. */
    continueGame: (year: string) => `Continuar de ${year}`,
    continueHint: 'Volta para a partida salva, no mês em que ela parou.',

    /** Sem save não há o que apagar, e o rótulo não fala em apagar. */
    start: 'Começar',
    startHint: 'Começa uma partida em 2025.',

    // O Modo Feira (P7-07). O rótulo diz a duração, que é a informação que
    // decide o clique de quem está de pé num estande.
    fair: 'Modo Feira (5 min)',
    fairHint: 'Partida rápida a 4x, para demonstração. Não é salva e não apaga a sua partida.',

    newGame: 'Nova partida',
    newGameHint: 'Apaga a partida salva e recomeça em 2025.',

    // A equipe da agência (2026-09-06, decidido no chat).
    //
    // **Eles são identidade, não mecânica.** Nenhum dá bônus, nenhum entra no
    // `GameState` e nenhum é escolhido pelo jogador — o `docs/PERSONAGENS.md`
    // registra a decisão e traduz as fichas para o vocabulário do engine, caso
    // um dia a versão com bônus saia do Gelo.
    //
    // **Por que os quatro, e não um.** O `docs/GDD.md §1` diz que o jogador é o
    // Gerente, *coordenador* de uma agência. Um rosto só ali significaria "este
    // é você", e aí os outros três sobrariam sem explicação.
    //
    // **O `alt` repete o nome porque a imagem o desenha.** O nome e o cargo
    // estão dentro do quadro, em pixels: um `alt=""` decorativo esconderia de
    // quem usa leitor de tela exatamente o que a arte existe para dizer.
    team: {
      heading: 'A equipe da agência',
      alt: {
        anaLuiza: team['ana-luiza'].alt,
        carlosMendes: team['carlos-mendes'].alt,
        ricardoSouza: team['ricardo-souza'].alt,
        julianaAlmeida: team['juliana-almeida'].alt,
      },
    },

    // Diz o que vai acontecer, e não "Sim" nem "OK": quem clica rápido precisa
    // ler a consequência no próprio botão. É a regra do session.ts.
    confirmNew: 'Apagar e recomeçar',
    confirmNewHint: 'Confirma. Não dá para desfazer.',
    cancel: 'Cancelar',
    cancelHint: 'Mantém a partida salva como está.',
    warning: 'A partida salva será apagada. Não dá para desfazer.',
  },

  // O mapa das 8 regiões (P5-01; ilustrado desde o VIS-03), com a lista do
  // docs/GDD.md §2.3.
  //
  // **O nome de cada região não está aqui**, pelo mesmo motivo do `fact` dos
  // eventos: ele mora no `src/data/regions.json`, que é o arquivo que o pacote
  // [D-Historia] tem contrato para editar sem abrir um `.ts` (`PLANO.md`).
  map: {
    label: 'Mapa das regiões',
    intro:
      'As oito regiões do mundo. O apoio público de cada uma anda sozinho — os eventos derrubam, a Inércia corrói e o ramo Sociedade levanta. O indicador lá em cima mostra só a média das oito.',
    support: (value: string) => `Apoio ${value}`,

    /**
     * O que o leitor de tela lê no lugar da etiqueta da região.
     *
     * Traz a escala junto ("de 100"): quem não enxerga o mapa não tem como
     * saber, pelo número sozinho, se 50 é muito ou pouco.
     */
    cell: (name: string, support: string) => `${name}. Apoio público ${support} de 100.`,

    /** O sinal visível de que a região está escolhida. */
    selectedMarker: '▸',

    // O aquecimento pintado no mapa (P7-04).
    //
    // **As faixas são os tetos das medalhas do §2.7.** A legenda existe para o
    // aquecimento não ser só cor (§5), e ela diz o que o número do HUD não diz:
    // não a temperatura, mas **em que faixa da nota** o mundo já está.
    heat: {
      caption: (band: string) => `A terra do mapa seca conforme o mundo esquenta. Agora: ${band}.`,
      gold: (limit: string) => `abaixo de ${limit}, o teto do ouro`,
      silver: (limit: string) => `abaixo de ${limit}, o teto da prata`,
      bronze: (limit: string) => `abaixo de ${limit}, o teto do bronze`,
      over: (limit: string) => `acima de ${limit} — nenhuma medalha ao alcance`,
    },

    // O alerta pendurado na etiqueta (P7-04). Ícone **mais** palavra escrita: o §5
    // proíbe estado só por cor, e alerta é justamente onde a cor tenta carregar
    // tudo sozinha.
    alert: {
      event: { icon: '◉', label: 'evento' },
      support: { icon: '▲', label: 'crítico' },

      /** O que entra na frase do leitor de tela, depois do apoio. */
      said: (label: string) => ` Alerta: ${label}.`,
    },
  },

  // O painel de detalhe da região escolhida no mapa (P5-04).
  //
  // **As dicas dizem o que move cada número, e só isso.** Nenhuma promete efeito
  // que a simulação não tenha: hoje o `climate.ts`, o `events.ts` e o
  // `inertia.ts` leem apenas emissão, apoio e resiliência — população e matriz
  // limpa não são lidas por ninguém, e a economia só é derrubada por evento sem
  // nunca ser consultada de volta. Escrever "a matriz limpa facilita o corte"
  // seria inventar mecânica no texto, que é a forma mais barata de mentir para o
  // jogador. O que falta está registrado no PROGRESSO.md do P5-04.
  regionPanel: {
    label: 'Detalhe da região',
    empty: 'Clique numa região do mapa para ver os números dela.',
    close: 'Fechar',
    closeHint: 'Tira a região da seleção. Atalho: Esc.',

    groups: {
      // A divisão é factual, não editorial: os dois de cima não mudam em nenhum
      // momento da partida, e os quatro de baixo mudam.
      character: 'O que ela é',
      live: 'Como ela está',
    },

    fields: {
      population: {
        label: 'População',
        hint: 'Habitantes da região, em milhões. Não muda durante a partida.',
      },
      cleanShare: {
        label: 'Matriz limpa',
        hint: 'Fatia limpa da matriz elétrica no começo da partida. Não muda durante a partida.',
      },
      emissions: {
        label: 'Emissões',
        hint: 'O que a região emite por ano. Cresce sozinha, cai com as habilidades que cortam emissão e sobe quando a Inércia subsidia.',
      },
      support: {
        label: 'Apoio público',
        hint: 'De 0 a 100. Os eventos derrubam, a Inércia corrói e o ramo Sociedade levanta. Zerar nas oito regiões dissolve a agência.',
      },
      resilience: {
        label: 'Resiliência',
        hint: 'De 0 a 100. Reduz o dano dos eventos que caem aqui.',
      },
      economy: {
        label: 'Economia',
        hint: 'Índice econômico, base 100. Os eventos derrubam.',
      },
    },

    /** "27 de 100" — a escala junto do número, porque 27 sozinho não diz nada. */
    scale: (value: string) => `${value} de 100`,

    /** Quanto a emissão desta região pesa no total do mundo. */
    shareOfWorld: (percent: string) => `${percent} do mundo`,
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

    // O detalhe do nó escolhido (VIS-05), ao lado dos losangos.
    detail: {
      label: 'Nó escolhido',
      /** A dica do nó no losango: clicar escolhe, e quem compra é o detalhe. */
      chooseHint: 'Mostra este nó no detalhe, ao lado. A compra é feita por lá.',
      state: (status: string, cost: string) => `${status} · ${cost}`,
      fact: 'No mundo real',
      buy: (cost: string) => `Comprar por ${cost}`,
      buyHint: 'Compra o nó escolhido. O PAC sai na hora, e o efeito vale até o fim da partida.',
      bought: 'Já comprado',
      /** O botão depois do fim da partida: a árvore vira histórico. */
      finished: 'A partida acabou',
    },
  },

  // Os cartões de evento climático (P7-02), com a regra do docs/GDD.md §2.5.
  //
  // **O `fact` de cada evento não está aqui**, e é de propósito: ele mora no
  // `src/data/events.json`, que é o arquivo que o pacote [D-Historia] tem
  // contrato para editar sem abrir um `.ts` (`PLANO.md`). Trazê-lo para cá
  // tiraria justamente o texto que o cargo de narrativa existe para escrever.
  events: {
    // O nome da seção é também o título escrito em cima dela (VIS-04): o que o
    // leitor de tela anuncia é o que quem enxerga lê.
    label: 'Boletim do clima',
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
    /**
     * O cartão central do evento crítico (VIS-07). Ele aparece com o tempo
     * parado, e fechá-lo é o que solta o tempo — pelo botão, pela barra de
     * espaço ou pelo Esc.
     */
    critical: {
      paused: 'O tempo parou',
      fact: 'No mundo real',
      resume: 'Retomar',
      resumeKey: 'Espaço',
      resumeHint: 'Fecha este cartão e solta o tempo. Atalhos: barra de espaço ou Esc.',
    },

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

    // O botão da barra leva ao título (P7-07). O rótulo mudou junto com o que
    // ele faz: "Reiniciar partida" prometia um reinício que já não acontece
    // aqui — quem apaga é o "Nova partida" do título.
    leave: 'Voltar ao início',
    leaveHint: 'Volta para a tela inicial. A partida salva continua lá.',

    // O rótulo do botão de confirmar diz o que vai acontecer, não "Sim" nem
    // "OK": quem clica rápido precisa ler a consequência no próprio botão.
    confirm: 'Sair e descartar',
    confirmHint: 'Sai do Modo Feira. Esta partida não foi salva.',
    cancel: 'Cancelar',
    cancelHint: 'Mantém a partida como está.',
    warning: 'Esta partida não foi salva e será descartada.',
    autosave: 'A partida é salva sozinha a cada mês.',

    /** O Modo Feira se declara aqui: não salvar é a coisa que o jogador precisa saber. */
    fair: 'Modo Feira: partida rápida, não é salva.',
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

    // O caminho de volta ao tabuleiro depois do fim (P5-06). O mapa e o painel
    // são justamente o que se quer olhar quando a partida acaba — para ver em
    // que região o apoio ruiu —, e a tela de fim esconde os dois.
    review: 'Ver o mundo',
    reviewHint: 'Mostra o mapa e a árvore como ficaram. A partida continua encerrada.',
    skillsLabel: 'Habilidades',
    skillsValue: (bought: string, total: string) => `${bought} de ${total}`,

    // O "o que você poderia ter feito diferente" do §2.7 (P7-06).
    //
    // **Chama-se "o que ficou para trás", e a diferença não é de estilo.** O
    // §2.7 fecha pedindo "curto, sem sermão", e "o que você poderia ter feito"
    // convida a um parágrafo de conselho. O que a mecânica de fato sabe dizer é
    // mais duro e mais curto: em que ano cada medalha deixou de ser alcançável.
    // Depois daquele ano, nada que o jogador fizesse a traria de volta — é a
    // catraca do TCRE, não uma opinião sobre a partida dele.
    lookBack: {
      label: 'O que ficou para trás',
      // A conjunção fica deste lado: o comentário do listOfNames registra que
      // juntar nomes é regra do idioma, não do jogo.
      lost: (items: readonly string[]) => `Ficou para trás: ${listOfNames.format(items)}.`,
      lostItem: (medal: string, year: string) => `${medal} em ${year}`,
      keptAll: (limit: string) => `Nada ficou para trás — a partida fechou abaixo de ${limit}.`,
      tree: (unbought: string, total: string) => `${unbought} de ${total} nós ficaram na árvore.`,
      treeComplete: 'A árvore inteira foi comprada.',
      untouched: (branches: readonly string[]) =>
        `Nenhuma compra em ${listOfNames.format(branches)}.`,
    },

    // As 3 ações do mundo real do §2.7 (P7-06).
    //
    // Os textos das ações **não estão aqui**: eles moram em `src/data/actions.json`,
    // que é o formato que o pacote `[D-Historia]` edita sem tocar em `.ts`. Aqui
    // fica só o que é moldura.
    realWorld: {
      label: 'Três coisas que funcionam fora do jogo',
      intro: 'Escolhidas pelos ramos que esta partida deixou de lado.',
    },

    // A comparação com a mesma partida sem nenhuma compra (VIS-10).
    compare: {
      section: 'A sua partida comparada à mesma partida sem nenhuma compra',
      played: 'Sua partida',
      passive: 'Sem nenhuma compra',
      span: (from: string, to: string) => `${from} a ${to}`,
      ended: (year: string) => `acaba em ${year}`,
      /** A frase do leitor de tela de cada faixa de listras. */
      label: (name: string, from: string, temperature: string, year: string) =>
        `${name}, em listras de ${from} a ${year}: terminou em ${temperature}.`,
      labelDissolved: (name: string, from: string, temperature: string, year: string) =>
        `${name}, em listras de ${from} a ${year}: chegou a ${temperature}, e a agência foi dissolvida.`,
    },

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

  // O gráfico da linha do tempo da tela final (P7-06, docs/GDD.md §2.7).
  //
  // **Os nomes das medalhas não estão aqui.** Eles vêm do `outcome.result`, que
  // já os escreve para o cartão logo acima do gráfico — dois lugares para a
  // mesma palavra é como a legenda de uma linha e o título do resultado passam
  // a discordar. Este bloco só tem o que é do gráfico.
  timelineChart: {
    label: 'Linha do tempo da partida',

    /**
     * A legenda, e é ela que carrega a temperatura de partida.
     *
     * O piso do desenho já teve rótulo próprio dentro do SVG, e ele **não
     * cabia**: o teto do ouro fica a 8% do piso, então os dois textos nasciam
     * a 26 unidades um do outro e se encostavam em qualquer partida. Aqui
     * embaixo o número não disputa espaço com nada, e quem lê a legenda
     * descobre de onde a curva parte antes de olhar para ela.
     */
    intro: (start: string) =>
      `A temperatura ano a ano, a partir de ${start} em 2025. As linhas tracejadas são os tetos das medalhas: onde a curva cruza cada uma é o ano em que aquela medalha ficou para trás.`,

    /** "Ouro · 1,5 °C" — o rótulo de uma linha tracejada, na margem direita. */
    threshold: (name: string, value: string) => `${name} · ${value}`,

    /** A marca sobre a curva, no ano em que a emissão global parou de subir. */
    turn: (year: string) => `Pico de emissões · ${year}`,

    /**
     * O que o leitor de tela lê no lugar do desenho.
     *
     * Não é uma descrição do gráfico ("uma linha que sobe"), é o **conteúdo**
     * dele: os dois extremos da curva e o ano da virada. Quem não enxerga o
     * desenho fica sabendo a mesma coisa que quem enxerga.
     */
    summary: (from: string, fromYear: string, to: string, toYear: string) =>
      `A temperatura foi de ${from} em ${fromYear} a ${to} em ${toYear}.`,
    summaryTurn: (year: string) => `As emissões pararam de subir em ${year}.`,

    /** A curva tracejada da mesma partida sem nenhuma compra (VIS-10). */
    passive: 'sem nenhuma compra',
    summaryPassive: (temperature: string, year: string) =>
      `Sem nenhuma compra, a mesma partida chegaria a ${temperature} em ${year}.`,
    summaryNoTurn: 'As emissões ainda subiam quando a partida acabou.',
  },

  // Os dois tutoriais (P7-08).
  //
  // **Nenhum destes textos ensina o dilema do jogo.** O docs/GDD.md §2.1 fecha
  // dizendo que a mensagem do ODS 13 está "embutida na mecânica — não em um
  // texto de tutorial", e isso é trava, não conselho. Aqui só se ensina a
  // operar: que tecla pausa, onde clicar para comprar. Escrever "quem só adapta
  // perde no longo prazo" entregaria de graça a descoberta que o jogo inteiro
  // existe para provocar.
  /**
   * A equipe dentro da partida (VIS-07): no tutorial, nos eventos e no fim.
   *
   * **Nenhuma fala é inventada para eles** (docs/DIRECAO-DE-ARTE.md §7). O que
   * o personagem "diz" é o texto que o jogo já tem — o passo do tutorial, o fato
   * do evento. Voz própria é trabalho do `[D-Historia]`.
   */
  cast: {
    people: { ...team, ...antagonist },
    /** A linha de quem fala, em cima da fala. */
    speaker: (name: string, role: string) => `${name} · ${role}`,
    /** Quem deu a notícia, no cartão do boletim. */
    by: (short: string) => `por ${short}`,
    /** A legenda da Juliana na tela de fim. */
    outcome: 'Auditoria da partida',
  },

  tutorial: {
    label: 'Como jogar',
    next: 'Entendi',
    nextHint: 'Fecha esta dica. A próxima aparece quando fizer sentido.',
    skip: 'Pular tutorial',
    skipHint: 'Fecha as dicas desta partida. Elas não voltam.',

    // Um passo por assunto, e cada frase diz **o que fazer**, não o que sentir.
    steps: {
      time: 'O tempo corre sozinho, um mês por vez, até 2100. A barra de espaço pausa; as teclas 1, 2 e 4 mudam a velocidade.',
      // Os dois passos abaixo aparecem na barra de baixo, e não na seção de que
      // falam: desde o VIS-05 a árvore e a contenção moram num painel fechado.
      // Por isso a frase diz como chegar até elas.
      tree: 'Você já tem PAC para comprar. O botão da árvore, nesta barra, abre os nós — cada um libera os que vêm abaixo dele.',
      event: 'Caiu um evento. O cartão diz o que aconteceu, e o mapa marca a região onde doeu.',
      inertia:
        'A Inércia agiu. Ela cresce quanto mais você corta, e a contenção, no painel da árvore, a segura por um tempo.',
    },

    // O Modo Feira: duas frases e um botão. Quem está de pé num estande não lê
    // o terceiro parágrafo, e o mapa, os eventos e a Inércia se explicam
    // acontecendo.
    fair: {
      title: 'Como jogar, em duas frases',
      lines: [
        'O tempo corre sozinho até 2100, e você acumula PAC a cada mês.',
        'Gaste o PAC na árvore de habilidades: o botão dela fica na barra de baixo. É só isso.',
      ],
      start: 'Começar',
      startHint: 'Fecha este aviso e põe o tempo para correr.',
    },
  },

  hudLabel: 'Indicadores da partida',

  units: {
    celsius: '°C',
    emissionsPerYear: 'Gt/ano',
    millions: 'milhões',
  },
} as const;
