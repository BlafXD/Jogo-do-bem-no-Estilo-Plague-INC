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

  units: {
    celsius: '°C',
    emissionsPerYear: 'Gt/ano',
  },

  app: {
    pending:
      'O mapa das 8 regiões entra no P5-01 e a árvore de habilidades no P6-06. Por enquanto, o tempo corre.',
  },
} as const;
