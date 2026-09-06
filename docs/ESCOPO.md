# ESCOPO.md — o que este jogo é, e o que ele não vai ser

> **Travado em 2026-09-06** (`P4-01`). Este arquivo existe para ser citado quando alguém — inclusive
> eu — propuser alguma coisa boa que o projeto não vai fazer.
>
> A regra 1 da `FORMA-DE-TRABALHO.md` já diz: nada se implementa que não esteja em `docs/GDD.md` ou
> em `PLANO.md`. Ideia nova vira proposta no chat, não vira código. **O que faltava era a outra
> metade da frase: a lista explícita do que fica de fora, e por quê.** Um escopo que só diz "sim"
> não é escopo, é uma lista de desejos.

---

## 1. O que o jogo é, medido

Não é promessa: são os números do repositório em 2026-09-06.

| | |
|---|---|
| **Gênero** | Estratégia em tempo real com pausa, uma partida por sessão |
| **Tema** | ODS 13 — combate às alterações climáticas |
| **Plataforma** | Navegador. Uma página, sem instalação, sem conta, sem servidor |
| **Período simulado** | 2025 → 2100 · 1 tick = 1 mês · **900 ticks** |
| **Duração** | ~22 min a 1x · **~5,6 min a 4x** (o Modo Feira) |
| **Regiões** | 8, com população, emissões, matriz, apoio e resiliência próprios |
| **Árvore** | **20 nós**, 5 ramos × 4 · custo total **1600 PAC** |
| **Eventos** | **10**, com limiar de temperatura de 1,3 °C a 2,2 °C |
| **Antagonista** | A Inércia — age a cada 6 ticks, com contenção comprável |
| **Finais** | 4 — ouro < 1,5 °C · prata < 2,0 °C · bronze < 2,55 °C · derrota ≥ 3,0 °C |
| **Save** | `localStorage`, com versão — não existe no Modo Feira, de propósito |
| **Idioma** | pt-BR só, com a estrutura pronta para um segundo |
| **Peso** | 74 kB de JS + 20 kB de CSS · a build da feira é **um arquivo de 95 kB** |
| **Testes** | 672, em 38 arquivos |

**A decisão central do jogo, que nada disso pode diluir:** mitigar (lento, resolve a causa) contra
adaptar (imediato, não resolve nada). Nenhuma partida rende PAC para comprar a árvore inteira —
falta cerca de 35%, medido em `docs/BALANCEAMENTO.md`. **A escolha precisa doer, senão o jogo não
tem assunto.**

---

## 2. O escopo travado, e o que dele já saiu

A tabela abaixo é a da Estratégia Solo do `PLANO.md`, com uma coluna a mais: o que de fato foi
entregue.

| Item | Travado (solo) | Entregue | Expansão, se houver cargo |
|---|---|---|---|
| Árvore de habilidades | 20 nós | **20** ✔ | 40 nós |
| Eventos | 10 | **10** ✔ | 20 |
| Regiões | 8 + mapa esquemático | **8 + SVG que esquenta** ✔ | mapa ilustrado |
| Arte | formas geométricas | **formas + tema em variáveis CSS** ✔ | identidade própria `[D-Design]` |
| Áudio | mudo + 3 efeitos CC0 | **mudo** — os 3 efeitos são o `P7-05` | trilha `[D-Musica]` |
| Texto | 1 frase por nó e por evento | **1 frase por nó, evento e ação** ✔ | narrativa `[D-Historia]` |

**A regra do número:** se sobrar tempo, o número sobe. **Nunca o contrário.** Cortar 20 nós para 15
na véspera da feira seria admitir que o corte de escopo foi feito no lugar errado.

---

## 3. O que **não** vai ter

Esta é a metade do arquivo que justifica ele existir. Quatro camadas, por motivos diferentes — e o
motivo importa, porque só a primeira camada é negociável.

### 3.1 Cortado por escopo: existe no gelo, e fica lá até depois do M3

Todos são ideias boas. Nenhuma é puxada antes de a build da feira estar testada em máquina limpa.

| Não vai ter | Por quê |
|---|---|
| **Árvore de 40 nós** | 20 já obrigam a escolher. Dobrar o número dobra o balanceamento a refazer, não a diversão |
| **20 eventos** | Os 10 cobrem os limiares de 1,3 a 2,2 °C sem buraco. Mais eventos é mais texto com fonte, que é o trabalho caro |
| **Conquistas / troféus** | Recompensa paralela à medalha; competiria com o único placar que o jogo tem |
| **Cenários históricos** ("e se em 1990?") | Um segundo conjunto de dados climáticos com fonte — é um `P3-01` inteiro de novo |
| **Ranking local de partidas** | Exige uma tela nova e um formato de save novo, para uma feira onde ninguém joga duas vezes |
| **Tradução para inglês** | A estrutura de i18n existe; o custo é traduzir 528 linhas de texto e revisar. Não rende nota nenhuma |
| **Clima animado no mapa** | O mapa já muda de cor com a temperatura. Animação é polimento, e polimento vem depois de jogável |
| **Personagens jogáveis com bônus de ramo** | Ver abaixo — este tem três problemas registrados, não um |

**Sobre os personagens jogáveis** (ideia de 2026-08-26): ela não está no gelo por falta de vontade.
São 5 ramos e não 4, então o mapeamento 1:1 não fecha; um bônus de ramo **desloca as duas contas já
medidas** (o déficit de ~35% e o teto do bronze em 2,55 °C, que subiu no `P7-03` porque nenhuma
estratégia alcançava medalha); e o personagem escolhido entraria no `GameState`, que é mudança do
contrato do `§3` do GDD e sobe o `SAVE_VERSION`. **Refazer a planilha do `P3-02` faz parte da
tarefa, não é passo opcional.** O detalhe está no `PLANO.md`, no Gelo.

### 3.2 Cortado por regra do projeto: não é negociável nem se sobrar tempo

Estas não voltam à mesa. São o `§12` da `FORMA-DE-TRABALHO.md`.

- **Backend, banco de dados, autenticação ou qualquer chamada de API externa.** O jogo é 100%
  client-side. Isso não é preguiça: é o que faz a build da feira rodar de um pendrive numa máquina
  sem internet, que é o `R5` da tabela de riscos.
- **Analytics ou telemetria de qualquer tipo.**
- **Qualquer asset de terceiros com direito autoral.** Nada vindo de *Plague Inc* ou de qualquer
  jogo comercial — nem arte, nem ícone, nem fonte, nem som, nem elemento de interface. Nenhum logo
  de marca, empresa ou ONG real. Só CC0 ou CC-BY com crédito em `docs/CREDITOS.md`.
- **Framework de UI** (React, Svelte), **engine de jogo** (Phaser, Three.js), **biblioteca de
  gráficos** ou **de animação**. Qualquer uma delas precisa de aprovação explícita, e até hoje o
  jogo publicado não embarca uma linha de biblioteca de terceiros.
- **`Math.random()`**, em lugar nenhum. Todo sorteio usa o RNG semeado — é o que torna bug
  reproduzível e playtest comparável.
- **Número climático sem fonte.**

### 3.3 Cortado por honestidade científica

**O tsunami saiu** (`P3-06`, 2026-08-20). Ele estava no conceito original e é um evento
espetacular. Mas tsunami é geológico: o aquecimento não causa nenhum. Manter o nome exigiria colar
uma ressalva no evento, e a ressalva gastaria a frase educativa explicando o que ele **não** é.

Virou **ressaca e maré de tempestade sobre um mar mais alto** — mesma imagem, a costa engolida pela
água, e inteiramente climático.

Isso não é um caso isolado, é um critério: **um evento que precisa de ressalva para ser honesto não
entra.** Se o `[D-Historia]` propuser um fenômeno e a fonte não sustentar o vínculo com o clima, ele
cai pela mesma régua.

### 3.4 Nunca esteve em cima da mesa

Vale escrever, porque são as perguntas que um avaliador ou um colega novo faz primeiro:

- **Multijogador**, cooperativo ou competitivo.
- **Aplicativo de celular** (nem nativo, nem *wrapper*). O jogo abre no navegador do celular, mas o
  layout foi medido para tela de feira, e ninguém vai testá-lo em 20 aparelhos.
- **Modo campanha ou progressão entre partidas.** Uma partida é uma partida.
- **Editor de cenário para o jogador.**
- **Narração por voz.**

---

## 4. O que ainda falta entregar

**39 tarefas concluídas · 1 em andamento · 17 abertas** (sem contar esta).

**O jogo, como software, está pronto.** Das 17 abertas, só **uma** é código: o `P7-05` (três efeitos
CC0 e um botão de mudo). Todo o resto é entrega de disciplina, texto delegável, ou depende de
pessoas de fora.

| Bloco | Aberto | Observação |
|---|---|---|
| **Parte 1** | `P1-01` one-pager · `P1-02` protótipo de papel · `P1-03` playtest do papel · `P1-05` APS 1 | Ver a tensão em §6 |
| **Parte 2** | `P2-01` a `P2-05`, todos `[D]` | Existem em versão mínima no jogo; ver §5 |
| **Parte 4** | `P4-02` cronograma · `P4-03` custo · `P4-05` distribuir | |
| **Parte 7** | `P7-05` áudio `[D]` | A única de código |
| **Parte 8** | `P8-01` playtest `[~]` · `P8-02` balanceamento · `P8-03` vídeo APS 2 · `P8-06` cartaz `[D]` · `P8-07` slides | |

**O caminho crítico é o `P8-01`.** Ele não depende de mim: depende de cinco pessoas de fora
sentarem para jogar. O `P8-02` e o `P8-03` saem dele. O instrumento está pronto em
`docs/playtests/`; faltam as sessões.

---

## 5. Os três pacotes: o que dá para delegar hoje

Auditado ao escrever o `README.md` (`P4-04`). **Metade dos contratos não estava de pé**, e
distribuir um pacote sem lugar para encaixar a entrega é a forma mais cara de delegar.

| Pacote | Entrega | Pronto? |
|---|---|---|
| `[D-Historia]` — os JSON | `skills.json`, `events.json`, `actions.json`, `regions.json` | **sim** — 43 registros somados, e o código já lê deles |
| `[D-Design]` — tema | `src/ui/theme.css` | **sim** — drop-in, com o contraste virando teste |
| `[D-Design]` — ícones | `assets/icons/*.svg` | **não** — hoje são caracteres Unicode no `i18n.ts` |
| `[D-Musica]` — áudio | `assets/*.ogg` | **não** — não há código de áudio, nem pasta; quem decide é o `P7-05` |

E duas tarefas da Parte 2 caem fora do próprio contrato que deveria cobri-las:

- **`P2-03` (identidade das 8 regiões)** — o `regions.json` só tem `name`. Guardar "1 linha +
  desafio" por região exige um campo novo no JSON **e** código que o mostre.
- **`P2-05` (textos dos 4 finais)** — eles moram no `src/data/i18n.ts`, que é `.ts`, e o contrato do
  `[D-Historia]` proíbe tocar em `.ts`. Ou o texto sai de lá para um JSON, ou esta tarefa não é
  delegável como está escrita.

Só o **`P2-04`** (10 microtextos de evento) é entregável hoje pelo contrato, como ele está.

---

## 6. Duas tensões que travar o escopo não resolve sozinho

Escrever este arquivo expôs duas coisas que precisam de decisão sua, não minha. Ficam registradas em
vez de ficarem implícitas.

**A ordem da Parte 1 se inverteu.** O `P1-02` pede um protótipo de papel *print and play*, e a regra
do GDD `§6` é explícita: *"se a mecânica não for interessante com papel e caneta, programar não vai
salvar"*. Só que o jogo digital **já existe e já é jogável de ponta a ponta**. Construir agora um
protótipo de papel de um jogo pronto testa uma pergunta que a versão digital já respondeu. As
opções honestas são três, e nenhuma é ignorar: (a) fazer mesmo assim, porque vale nota; (b) fazer
uma versão reduzida, como material de estande na feira, que é um uso real; (c) registrar o corte
com a justificativa. **Não decidi por você.**

**A Parte 2 já foi entregue pelo caminho errado.** Os 5 itens `[D]` da narrativa existem em versão
mínima porque o código precisou deles para funcionar — os 4 finais, os 10 fatos de evento, os 20 de
habilidade. Isso era o previsto pela Estratégia Solo ("camadas substituíveis"), mas significa que a
Parte 2 não tem entrega própria a mostrar. Se ela precisa render nota, o entregável é o documento
de narrativa (`P2-01`, `P2-02`), não o texto que já está na tela.

---

## 7. Como se muda este arquivo

Ideia nova chega o tempo todo, e a maioria é boa. O caminho é:

1. **Ela cabe em alguma coisa já travada?** Se sim, não é ideia nova — é a tarefa que já existe.
2. **Ela está no gelo (§3.1)?** Então a resposta é "depois do M3", e não "não".
3. **Ela bate no §3.2 ou no §3.3?** A resposta é não, e não muda com tempo sobrando.
4. **É genuinamente nova?** Escreva **o que sai** para ela entrar. Uma proposta sem a coluna do que
   é cortado não é uma proposta de escopo, é um pedido.

O `PROGRESSO.md` registra a decisão no dia em que ela for tomada, com a razão. É o que impede a
mesma discussão de acontecer duas vezes em três semanas.
