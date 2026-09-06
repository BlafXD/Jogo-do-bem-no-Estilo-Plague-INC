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
| **Cartaz da feira** (`P8-06`) | previsto — é o uso mais forte: quatro rostos vendem um estande melhor que um mapa |
| **Slides** (`P8-07`) | previsto |
| **Tela de título** | possível, e depende do §5 |
| **Dentro da partida** | **não.** Nenhuma tela de jogo muda |

**Sobre a tela de título:** se entrarem, entram como **a equipe**, não como escolha. O jogador é o
Gerente; estes são os quatro especialistas que ele dirige. Pôr um rosto só implicaria que aquele
é o Gerente, e aí os outros três sobrariam.

---

## 5. O que falta para a arte entrar no repositório

Três coisas, nenhuma delas grande:

1. **Uma linha de origem para o `docs/CREDITOS.md`.** A regra 10 exige registrar de onde veio todo
   asset. Para pacote feito pela equipe, o `CREDITOS.md` pede só "de quem é" — mas se a imagem foi
   produzida com alguma ferramenta, é isso que a linha precisa dizer.
2. **Confirmar que o logotipo "ECO-GRID"** — no crachá da Ana Luiza e na jaqueta do Carlos — é
   fictício. A regra 10 barra logotipo de marca, empresa ou ONG real.
3. **Os quatro recortes.** A imagem original é uma folha única de 1408 × 768 com as quatro cartas
   lado a lado (≈352 px de largura cada). Não há ferramenta de imagem nesta máquina — o `convert`
   disponível é o do Windows, não o ImageMagick —, então os recortes precisam vir prontos.

**Sobre peso, que aqui não é detalhe:** a build da feira é **um arquivo só**, e o `vite.config.ts`
usa `assetsInlineLimit: Infinity` para embutir tudo em base64 — o plugin **falha o build** se sobrar
qualquer arquivo externo. A folha inteira tem 279 KB, que viram **372 KB** em base64, contra os
95 KB que o `dist-feira/index.html` tem hoje. Quadruplica, e ainda assim cabe folgado num pendrive.
Se os quatro recortes vierem redimensionados para a altura em que serão exibidos, o custo cai muito.
