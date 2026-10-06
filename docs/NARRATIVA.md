# NARRATIVA.md — quem fala, como fala, e sobre o quê

> **O documento do pacote `[D-Historia]`.** O `PLANO.md` define o contrato: quem assumir Narrativa
> edita **apenas** este arquivo e os campos de texto do `src/data/*.json` (`name`, `description`,
> `fact`). Não toca em `.ts`.
>
> **Esta é a versão mínima**, escrita em 2026-10-06 enquanto o projeto é solo, e cobre o `P2-01` ao
> `P2-05` do `PLANO.md`. Ela registra o que o jogo **já diz hoje** e fecha os buracos com o mínimo
> que faz a voz ser consistente. Quem entrar no cargo expande — e a primeira coisa a saber é que
> boa parte do texto já está escrita e testada, então expandir é mais barato que começar.
>
> **Onde o texto mora de verdade:** `src/data/i18n.ts` (interface), `src/data/skills.json` (os 40
> nós), `src/data/events.json` (os 10 eventos), `src/data/actions.json` (as 3 ações do fim) e
> `src/data/regions.json` (os nomes das regiões). Este arquivo **não é a fonte** — é a razão.

---

## 1. O Gerente, a Agência e A Inércia (`P2-01`)

### O Gerente — quem o jogador é

O jogador é **o Gerente de uma agência climática global**, de 2025 a 2100. Não é um presidente, não
é um cientista, não é um ativista: é quem **decide onde o dinheiro vai**, com o relógio correndo e
sem nunca ter o bastante.

Três coisas definem o papel, e as três já estão na mecânica:

- **Ele coordena, não executa.** Quem executa são os especialistas — a equipe do
  `docs/PERSONAGENS.md`. Desde o `REF-08` o jogador escolhe um deles para dirigir a partida, e
  mesmo assim continua sendo o Gerente: escolher quem está à frente é uma decisão de coordenação.
- **Ele não tem poder de polícia.** Nada no jogo obriga uma região a nada. O que ele tem é PAC, e o
  que o PAC compra é capacidade — não obediência. É por isso que **o apoio público é um indicador**,
  e não um detalhe de ambientação: sem ele, a agência é dissolvida.
- **Ele herda um mundo já quente.** A partida começa em **1,37 °C**, não em zero. O Gerente não é
  quem causou o problema, e isso **não o alivia de nada** — é a situação que ele recebe.

> **O que o Gerente nunca diz.** Ele não tem fala no jogo, e isso é decisão de desenho: o jogador
> não deve ouvir a si mesmo. Quem fala é a equipe, e o que ela diz é informação, não opinião.

### A Agência — onde a partida acontece

Uma **sala de situação**: o mapa-múndi na parede, os indicadores em cima, a árvore de habilidades
num painel que abre quando é hora de decidir. A direção de arte inteira sai daí
(`docs/DIRECAO-DE-ARTE.md`) — é por isso que o jogo tem cor de madeira, latão e papel creme, e não
de interface de ficção científica.

**A Agência não tem nome, bandeira nem logotipo**, e é de propósito: a `FORMA-DE-TRABALHO.md §12`
proíbe marca real, e inventar uma marca fictícia convidaria o jogador a perguntar "qual país manda
nisso?" — pergunta que o jogo não quer responder e não precisa.

### A Inércia — o antagonista

**Não é um vilão.** É a força que resiste à mudança: lobby fóssil, desinformação, subsídio,
prioridade de curto prazo. O `docs/GDD.md §2.6` fecha a questão numa frase — *"não é um vilão de
bigode"* —, e as regras de texto saem dela:

| O que ela é | O que ela **não** é |
|---|---|
| Uma silhueta preta, sem rosto, com fumaça (`VIS-11`) | Uma pessoa, uma empresa, um país |
| Um indicador de 0 a 100 que o jogador vê subir | Uma personagem com plano e motivação |
| Três ações nomeadas: desinformação, subsídios, recuos regulatórios | Alguém que fala, ameaça ou provoca |

**Ela não tem nome além de "A Inércia", e não tem fala.** Nenhuma linha de diálogo foi escrita para
ela e nenhuma deve ser: no instante em que ela fala, vira personagem, e o jogador passa a poder
odiá-la em vez de reconhecê-la. O que o jogo mostra dela é **o que ela fez** — o apoio que caiu, a
emissão que subiu, o nó que ficou mais caro.

**Ela é espelho.** Cresce um pouco sozinha e cresce muito mais quanto mais o jogador já cortou. Isso
é narrativa feita de mecânica: a resistência aumenta porque a mudança está funcionando.

---

## 2. Tom de voz (`P2-02`)

**Uma regra acima das outras: o jogo informa, não prega.** O `docs/GDD.md §2.1` diz que a mensagem
do ODS 13 está "embutida na mecânica — não em um texto de tutorial". Todo texto do jogo é escrito
com isso em mente.

### As cinco regras

1. **Frase curta, uma ideia.** O jogo é lido de pé, de longe, num estande.
2. **Diga o que fazer ou o que aconteceu — nunca o que sentir.** "Caiu um evento" e não "que
   tragédia".
3. **Número com unidade, sempre.** "0,5% ao ano", "36 PAC", "1,82 °C". Número solto não ensina.
4. **Nenhum fato sem fonte.** Regra 9 da `FORMA-DE-TRABALHO.md`, e desde o `REF-07` há um teste
   cobrando (`tests/ciencia.test.ts`).
5. **Nenhuma culpa dirigida ao jogador.** Nem na derrota. A frase da derrota fala do carbono, não de
   quem falhou.

### Dois exemplos bons, dois ruins

| | Texto | Por quê |
|---|---|---|
| ✔ | *"Corta 0,5% ao ano das emissões globais."* | Diz o efeito, com número e unidade. O jogador decide com isso na mão |
| ✔ | *"O carbono já emitido não volta atrás: a curva precisava ter virado antes."* | A frase da derrota. Explica **o mecanismo** — a catraca do TCRE — em vez de lamentar |
| ✘ | *"Que desastre! O planeta está morrendo e é culpa nossa."* | Prega, acusa e não informa nada. O jogador já viu o número subir |
| ✘ | *"Invista em energia limpa para um futuro melhor!"* | Publicidade. Não diz quanto corta, quanto custa, nem o que fica de fora |

### A regra que mais custou caro

**Não venda desinformação como educação.** Está no `docs/GDD.md §2.5`, e nasceu de uma decisão
concreta: o **tsunami saiu do jogo** no `P3-06` porque tsunami é geológico e o aquecimento não causa
nenhum. Trocá-lo pela **ressaca sobre um mar mais alto** manteve a imagem e devolveu a honestidade.
Quando um texto bonito depender de um fato que não se sustenta, **o texto cede.**

---

## 3. As 8 regiões: identidade e desafio (`P2-03`)

Uma linha por região, e o desafio característico de cada uma. **Tudo abaixo sai dos dados reais do
`src/data/regions.json`**, cujas fontes estão em `docs/CIENCIA.md` — não há região inventada nem
adjetivo sem número atrás.

O `supportDecay` é o quanto de apoio a região perde por ano (`REF-06`): quanto mais suja a matriz e
mais exposta a economia, mais frágil o apoio.

| Região | Uma linha | O desafio característico |
|---|---|---|
| **América do Norte** | 383 milhões de pessoas, 5,7 Gt/ano e quase metade da eletricidade já limpa | Emite muito **por pessoa**. O problema não é falta de capacidade, é consumo instalado |
| **América Latina** | 654 milhões, 3,3 Gt/ano e a matriz **mais limpa do mundo** (65%) | Já começou limpa, e quase todo o ganho que falta está em **uso da terra**, não em energia |
| **Europa** | 744 milhões, 5,2 Gt/ano, 60% de eletricidade limpa | Tem a política e o dinheiro. O que lhe falta é **indústria pesada** sem resposta pronta |
| **África** | 1,48 bilhão de pessoas e 2,7 Gt/ano — por pessoa, cerca de **um oitavo** do que a América do Norte emite | Emite pouco e **sofre primeiro**. Qualquer solução que lhe peça sacrifício é injusta por construção |
| **Oriente Médio** | 475 milhões, 3,4 Gt/ano e a matriz **mais suja** (15% limpa) | A economia **é** o combustível fóssil. É onde a transição ameaça mais, e onde o apoio cai mais rápido (1,9/ano) |
| **Ásia Oriental** | 2,35 bilhões e **16,4 Gt/ano** — 40% das emissões do mundo | É onde a partida se decide. Nenhuma estratégia global funciona sem ela |
| **Ásia Meridional** | 1,95 bilhão de pessoas e 3,5 Gt/ano, com 23% de matriz limpa — a **menor emissão por pessoa** do mapa | Vai crescer, e a pergunta é **com qual energia**. Calor extremo já chegou |
| **Oceania** | 45 milhões, 0,56 Gt/ano — a menor emissão absoluta | Quase não pesa na conta global e está **na linha de frente** do mar que sobe e do recife que branqueia |

> **O que estas linhas não fazem:** nenhuma delas dá bônus, penalidade ou regra. Elas existem para o
> painel de região, o cartaz (`P8-06`) e os slides (`P8-07`). Quem quiser transformá-las em mecânica
> está mexendo em balanceamento, e isso é `P8-02`.

---

## 4. Os 10 eventos (`P2-04`)

**Já estão escritos e em jogo**, em `src/data/events.json`: cada um tem nome, impacto e **um fato
real de uma frase**, com a fonte registrada em `docs/CIENCIA.md` e cobrada por teste. Quem assumir o
cargo reescreve as frases **sem tocar em código** — é o contrato.

| Evento | Entra acima de | O que ele cobra |
|---|---|---|
| Onda de calor | 1,3 °C | apoio e PIB; é o primeiro que o jogador vê |
| Seca | 1,5 °C | apoio, PIB e PAC |
| Enchente | 1,5 °C | apoio, PIB e PAC |
| Branqueamento de corais | 1,5 °C | apoio e PIB |
| Ciclone | 1,7 °C | o primeiro de impacto pesado |
| Incêndio florestal | 1,8 °C | apoio, PIB e PAC |
| Doença de vetor | 1,8 °C | o que mais tira apoio para o PIB que custa |
| Deslizamento | 1,9 °C | apoio, PIB e PAC |
| **Ressaca e maré de tempestade** | 2,0 °C | **crítico** — para o relógio sozinho |
| **Colapso de safra** | 2,2 °C | **crítico** — o mais caro do jogo |

**Os dois críticos são os únicos que param o jogo**, e nenhum deles é alcançável abaixo de 2 °C: a
primeira metade da partida nunca é interrompida. É desenho, não acaso — a contagem está em
`docs/BALANCEAMENTO.md`.

**Quem dá a notícia é um especialista da equipe**, definido em `src/data/characters.json`. No
boletim ele aparece num avatar redondo, com "por Ricardo"; no evento crítico, num cartão no centro
da tela, com o tempo parado. **Nenhuma fala é inventada para eles:** o que o especialista "diz" é o
fato real do próprio evento.

---

## 5. Os textos dos finais (`P2-05`)

**Já estão escritos**, em `src/data/i18n.ts`. Cada veredito é uma frase, e **a escala não é de
elogio, é de medida** — a diferença entre ouro e prata é um número, não um julgamento.

| Fim | Título | Veredito |
|---|---|---|
| < 1,5 °C | **Ouro** | *"Abaixo de 1,5 °C — o melhor caso descrito pelo Acordo de Paris."* |
| < 2,0 °C | **Prata** | *"Abaixo de 2,0 °C — dentro do limite de Paris, longe do ideal."* |
| < 2,55 °C | **Bronze** | *"Abaixo de 2,55 °C — o mundo virou a curva tarde, mas virou."* |
| ≥ 2,55 °C | **Sem medalha** | *"Acima de 2,55 °C — o mundo atravessou o século sem virar a curva."* |
| derrota | **Derrota** | *"O carbono já emitido não volta atrás: a curva precisava ter virado antes."* |

Três coisas a preservar se alguém reescrever:

1. **Quatro dos cinco vereditos citam o limiar**, porque o número é a informação. O da derrota é a
   exceção, e de propósito: quem perdeu não parou "abaixo" nem "acima" de nada que valha contar.
2. **Nenhum deles parabeniza nem repreende.** Nem o ouro diz "parabéns", nem a derrota diz "você
   falhou". Os dois descrevem o mundo que sobrou.
3. **"Longe do ideal" fica na prata.** É a linha que impede a segunda melhor nota de parecer uma
   vitória — e desde o `REF-09` ela é a nota que uma partida bem jogada alcança, então ela passou a
   ser a frase que mais gente vai ler.

A tela de fim também mostra **3 ações do mundo real** (`src/data/actions.json`), escolhidas pelos
ramos que a partida deixou de lado, e as fontes delas estão em `docs/CIENCIA.md`.

---

## 6. O que falta, para quem assumir o cargo

Em ordem de valor:

1. **As 8 vozes regionais.** O §3 dá a identidade de cada região; o que não existe é **texto de
   região dentro da partida** — hoje o painel mostra números, e nada diz como aquela região reage.
2. **Mais de uma frase por evento.** Hoje cada evento tem um texto só, e numa partida de 75 anos ele
   se repete. Variantes por região seriam o ganho mais barato de vida narrativa.
3. **As fichas de Marina Costa.** A 5ª personagem (`REF-07`) tem id, buff e ramo, e **não tem ficha
   nem arte** — o `docs/PERSONAGENS.md §3` registra o contrato. Enquanto não existir, ela não
   aparece na tela de escolha.
4. **Reescrever os `fact` dos 40 nós sem perder a fonte.** Dá para melhorar a prosa; o que não dá é
   trocar o número. O `tests/ciencia.test.ts` cobra que a frase do jogo e a linha do
   `docs/CIENCIA.md` sejam a mesma — então **mude as duas juntas**, e confira a fonte antes.
