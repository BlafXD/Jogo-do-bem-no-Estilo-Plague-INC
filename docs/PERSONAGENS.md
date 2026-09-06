# PERSONAGENS.md — a equipe da agência

> **Decidido em 2026-09-06, no chat.** Os quatro personagens entram no projeto como **identidade
> visual e narrativa**. Eles **não dão bônus nenhum** hoje, não aparecem no `GameState` e não
> mexem em uma linha de balanceamento.
>
> A versão com bônus de ramo continua no Gelo do `PLANO.md`. Este arquivo é o que torna essa
> decisão futura barata: ele já traduz cada habilidade para o vocabulário que o engine entende.
>
> **De onde vem:** conceito e arte do autor do projeto, 2026-09-06. A origem precisa de uma linha
> em `docs/CREDITOS.md` antes de a imagem entrar no repositório — ver §5.

---

## 1. Quem são

O `docs/GDD.md §1` diz que o jogador é **o Gerente, coordenador de uma agência climática global**.
Um coordenador coordena alguém: estes quatro são a agência. É por isso que eles funcionam sem
mecânica nenhuma — eles não são personagens *jogáveis*, são a equipe que o jogador dirige.

### Ana Luiza — Engenheira Elétrica

| Atributo | |
|---|---|
| Foco em Sustentabilidade | 5/5 |
| Conhecimento Técnico | 4/5 |
| Gestão de Energia | 4/5 |

- **Desconto de Rede** — −10% de custo de pontos em projetos de infraestrutura de energia renovável.
- **Eficiência Térmica** — +15% de produção de energia em painéis solares e turbinas eólicas.

### Carlos Mendes — Engenheiro Ambiental

| Atributo | |
|---|---|
| Gestão de Resíduos | 5/5 |
| Conservação de Ecossistemas | 5/5 |
| Conformidade Regulatória | 3/5 |

- **Remediação Ágil** — −20% do tempo de limpeza de áreas contaminadas.
- **Biodiversidade Urbana** — +10% de bônus de felicidade da comunidade ao implementar parques e
  corredores verdes.

### Ricardo Souza — Gestor de Recursos Hídricos

| Atributo | |
|---|---|
| Eficiência no Uso da Água | 5/5 |
| Tratamento de Efluentes | 4/5 |
| Monitoramento Hidrológico | 4/5 |

- **Otimização de Ciclo** — −15% de consumo de água em processos industriais e urbanos.
- **Captação de Água da Chuva** — +25% de armazenamento de água em sistemas de coleta integrados.

### Juliana Almeida — Auditora de Sustentabilidade Corporativa

| Atributo | |
|---|---|
| Análise de Impacto | 5/5 |
| Estratégia ESG | 4/5 |
| Engajamento de Stakeholders | 4/5 |

- **Certificação Verde** — +20% de bônus de reputação e financiamento ao obter certificações
  ambientais (como LEED ou ISO).
- **Mitigação de Risco** — −15% de probabilidade de eventos de crise ambiental e multas
  regulatórias.

---

## 2. As habilidades, traduzidas para o que o engine sabe fazer

Esta seção é a razão de o arquivo existir. O engine conhece **cinco tipos de efeito** e nada além
deles (`docs/GDD.md §3`):

```ts
emissionCut · pointsPerYear · resilience · support · inertiaCut
```

Das oito habilidades das fichas, **uma se traduz direto e quatro descrevem sistemas que este jogo
não tem**. Isso não é defeito das fichas — é a distância entre um jogo de gestão ambiental e um
jogo de orçamento climático global. A coluna da direita é a ponte, se um dia ela for atravessada.

| Habilidade | Encaixe | Como ficaria neste jogo |
|---|---|---|
| **Biodiversidade Urbana** | ✅ direto | É `support`, com esse nome e essa função. O único de encaixe perfeito |
| **Certificação Verde** | ✅ em dois | "Financiamento" é `pointsPerYear` (PAC é a moeda); "reputação" é `support` |
| **Desconto de Rede** | 🟡 campo novo | Desconto no `cost` dos nós de Energia. **Há precedente:** o `containDiscountPerNode` já desconta a contenção por nó de Sociedade |
| **Mitigação de Risco** | 🟡 campo novo | O peso dos eventos existe (`baseWeight` × `eventWeightPerDegree`); falta um modificador por personagem |
| **Eficiência Térmica** | ❌ sem sistema | Não há produção de energia. Em espírito: reforçar o `emissionCut` dos nós de Energia (solar iria de 0,5 para 0,575 %/ano) |
| **Remediação Ágil** | ❌ sem sistema | Não há contaminação nem tempo de limpeza. Em espírito: `resilience` global, que é o que reduz o dano dos eventos |
| **Otimização de Ciclo** | ❌ sem sistema | Não há água. Pelo tema (processos industriais): `emissionCut` no ramo Indústria |
| **Captação de Água da Chuva** | ❌ sem sistema | Não há água. Pelo tema (resiliência hídrica): `resilience` nas cinco regiões que a **Seca** atinge |

---

## 3. O mapa contra os cinco ramos

O `PLANO.md` já avisava, no Gelo, que "são 5 ramos, não 4". Com as fichas na mão, o problema tem
nome:

| Personagem | Ramo | |
|---|---|---|
| Ana Luiza | **Energia** | encaixe limpo |
| Carlos Mendes | **Natureza** | encaixe limpo — ecossistemas, parques, corredores verdes |
| Juliana Almeida | **Sociedade** | encaixe limpo — acordos, stakeholders, alerta precoce |
| Ricardo Souza | **nenhum** | água não é ramo deste jogo |
| — | **Transporte** | sem personagem |
| — | **Indústria** | sem personagem |

**Três ramos cobertos, dois vazios e um personagem órfão.** As saídas, se a versão mecânica for
adiante um dia:

1. **Remapear Ricardo** para Indústria (o "processos industriais" da Otimização de Ciclo puxa para
   lá) e criar um quinto personagem para Transporte.
2. **Criar dois** — Transporte e Indústria — e remapear Ricardo, chegando a seis.
3. **Abandonar o 1:1** e escrever a regra de qual bônus cobre o quê, que é o que o `PLANO.md`
   pedia desde o início.

Nada disso precisa ser decidido agora. Como identidade visual, quatro é um número perfeitamente bom.

---

## 4. Onde eles aparecem

| Onde | Estado |
|---|---|
| **Tela de título** | ✔ **no ar** — os quatro, sob o rótulo "A equipe da agência" |
| **Cartaz da feira** (`P8-06`) | previsto — é o uso mais forte: quatro rostos vendem um estande melhor que um mapa |
| **Slides** (`P8-07`) | previsto |
| **Dentro da partida** | **não.** Nenhuma tela de jogo muda |

**Sobre a tela de título:** se entrarem, entram como **a equipe**, não como escolha. O jogador é o
Gerente; estes são os quatro especialistas que ele dirige. Pôr um rosto só implicaria que aquele
é o Gerente, e aí os outros três sobrariam.

---

## 5. Como a arte entrou

As três pendências que travavam a imagem foram resolvidas em 2026-09-06.

**Origem e licença.** Conceito, personagens e o logotipo fictício ECO-GRID são criação do autor do
projeto — confirmado no chat, e registrado em `docs/CREDITOS.md`. Nenhuma marca real na arte.

**Os recortes.** A folha original é 1408 × 768 com as quatro cartas lado a lado, em passo exato de
352 px. Cada retrato foi cortado em `(24 + i × 352, 54)`, com 312 × 410 e qualidade JPEG 82 — pelo
`System.Drawing` do Windows, que já vem instalado e não custou dependência nova (o `convert` do
`PATH` é o do Windows, não o ImageMagick).

**O corte exclui o bloco de atributos e habilidades, de propósito.** Ele ocupa metade de cada carta
e anuncia bônus que o jogo não tem — "−15% de consumo de água", "5/5" — e mostrá-lo dentro do jogo
prometeria mecânica que não existe. Retrato e nome sobem; a ficha completa fica para o cartaz e os
slides, onde é material de apresentação e não interface.

### O peso, medido nos dois builds

| | antes | depois |
|---|---|---|
| `dist/` (Pages) | 1 JS + 1 CSS | + **4 JPEG** de ~34 KB, servidos à parte |
| `dist-feira/index.html` (arquivo único) | 95 KB | **286 KB** |

A build da feira embute tudo em base64 (`assetsInlineLimit: Infinity`) e o plugin **falha** se sobrar
arquivo externo — ele passou, e o `dist-feira/` continua com um arquivo só. 286 KB num pendrive é
irrelevante.

### Duas medidas que só o navegador deu

O layout foi ajustado **duas vezes** contra a tela, e nenhum dos dois ajustes teria aparecido em
teste:

1. Os retratos herdaram o `max-width: 60ch` do pitch — medida de conforto de **leitura**, que os
   espremeu a ~130 px e deixou o nome desenhado dentro do quadro ilegível. **Imagem não se mede em
   `ch`.**
2. Soltos para crescer pela largura, empurraram "Começar" e "Modo Feira" para fora da primeira
   dobra numa janela de 717 px. Numa feira isso é fatal: quem chega de pé não rola a página. Agora
   a altura manda — `clamp(9rem, 28vh, 15rem)` —, e os botões voltaram para dentro.
