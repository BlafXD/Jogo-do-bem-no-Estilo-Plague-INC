# Playtest 02 — o jogo, Modo Feira (`P8-01`)

> **Estado: fichas em branco, esperando as sessões.** O protocolo está em `README.md` deste
> diretório. Leia-o antes da primeira pessoa — principalmente as três regras de quem observa.
>
> **Data das sessões:** ___/___/______
> **Build testada:** `dist/index.html` aberto do disco · commit: ______________

## Por que Modo Feira, e não a partida completa

Cinco pessoas × 25 minutos são duas horas de sessão e ninguém aguenta. Cinco × 5,6 minutos cabem
numa tarde — e o Modo Feira **é uma partida completa**: 2025 a 2100 a 4×, com os mesmos eventos, a
mesma Inércia e a mesma tela de fim. Não é uma demonstração cortada, é o jogo inteiro acelerado
(`docs/GDD.md §4`).

É também a experiência que o estande vai ter, que é a que precisa funcionar.

**O que isto não mede:** o ritmo da partida a 1×. Se alguém tiver paciência para jogar 22 minutos,
essa sessão vale ouro para o `P8-02` — mas ela é bônus, não meta.

---

## O que já está sob suspeita

**Esta lista é para quem observa. Nunca vire nenhum destes itens em pergunta** — o `README.md`
explica por quê. Ela existe para você reconhecer o travamento quando ele acontecer, não para
induzi-lo.

Cada item saiu de uma pendência anotada no `PROGRESSO.md` por quem escreveu o código, e nenhum foi
confirmado por ninguém de fora.

| # | Suspeita | De onde veio | O que seria a confirmação |
|---|---|---|---|
| 1 | **Oito alertas ao mesmo tempo no mapa** viram uma parede de laranja que informa menos que três | `P7-04` | A pessoa para em frente ao mapa numa partida ruim e não clica em nada |
| 2 | A **velocidade 4× sobrevive** à saída do Modo Feira | `P7-07` | Ela volta à partida normal e estranha o tempo correndo rápido |
| 3 | O **painel da feira não tem "Pular"** | `P7-08` | Ela procura um jeito de fechar antes de ler |
| 4 | **"Prata · 2 °C"** sem casa decimal, ao lado de "1,5" e "2,55" | `P7-06` | Ela lê o gráfico em voz alta e tropeça, ou pergunta |
| 5 | A frase **"Ficou para trás: Ouro em 2032, Prata em 2059 e Bronze em 2081"** é longa demais | `P7-06` | Ela não termina de ler a linha |
| 6 | A faixa **`silver` do mapa é idêntica** ao neutro — entre 1,5 e 2,0 °C o mapa não muda | `P7-04` | Ela não percebe o mapa esquentando em nenhum momento |
| 7 | **O tutorial repete** a cada partida nova | `P7-08` | Só aparece em quem jogar duas vezes |
| 8 | Não há **volta automática ao título** por inatividade | `P7-07` | Alguém larga a partida no meio e a tela fica parada |

**Suspeita de balanceamento, que é do `P8-02`:** o teto do bronze subiu para 2,55 °C no `P7-03`
porque nenhuma estratégia alcançava medalha nenhuma — e a faixa ficou **larga o bastante para caber
também quem desistiu depois de 2070**. Se três das cinco pessoas ganharem bronze sem entender por
quê, é este número que está errado.

---

## Fichas

Uma por pessoa. Copie o bloco se precisar de mais.

### Pessoa 1

- **Apelido ou inicial:** ______  (não precisa de nome completo)
- **Joga videogame com que frequência?** ( ) nunca ( ) às vezes ( ) muito
- **Conhece *Plague Inc* ou parecido?** ( ) sim ( ) não
- **Consentiu em gravar o áudio das perguntas 4 e 5?** ( ) sim ( ) não

**Tempo até o primeiro clique dentro da partida:** ______ s

**Desfecho:** ( ) Ouro ( ) Prata ( ) Bronze ( ) Sem medalha ( ) Derrota ( ) Desistiu em ______

**Travamentos** — momento, o que estava na tela, o que ela tentou:

| Ano do jogo | O que estava na tela | O que ela fez ou tentou | Tempo parada |
|---|---|---|---|
|  |  |  |  |
|  |  |  |  |
|  |  |  |  |

**Perguntas que ela fez** (transcrever, mesmo as que você respondeu com "o que você acha?"):

-
-

**Respostas:**

1. Do que era o jogo (**literal**):
2. Momento em que não sabia o que fazer:
3. O que faria diferente:
4. O que mais gostou:
5. O que mais incomodou:

**Suspeitas da tabela acima que apareceram sozinhas:** ______________

---

### Pessoa 2

- **Apelido ou inicial:** ______
- **Joga videogame com que frequência?** ( ) nunca ( ) às vezes ( ) muito
- **Conhece *Plague Inc* ou parecido?** ( ) sim ( ) não
- **Consentiu em gravar?** ( ) sim ( ) não

**Tempo até o primeiro clique:** ______ s
**Desfecho:** ( ) Ouro ( ) Prata ( ) Bronze ( ) Sem medalha ( ) Derrota ( ) Desistiu em ______

| Ano do jogo | O que estava na tela | O que ela fez ou tentou | Tempo parada |
|---|---|---|---|
|  |  |  |  |
|  |  |  |  |

**Perguntas que ela fez:**

-

**Respostas:**

1. Do que era o jogo (**literal**):
2. Momento em que não sabia o que fazer:
3. O que faria diferente:
4. O que mais gostou:
5. O que mais incomodou:

**Suspeitas que apareceram sozinhas:** ______________

---

### Pessoa 3

- **Apelido ou inicial:** ______
- **Joga videogame com que frequência?** ( ) nunca ( ) às vezes ( ) muito
- **Conhece *Plague Inc* ou parecido?** ( ) sim ( ) não
- **Consentiu em gravar?** ( ) sim ( ) não

**Tempo até o primeiro clique:** ______ s
**Desfecho:** ( ) Ouro ( ) Prata ( ) Bronze ( ) Sem medalha ( ) Derrota ( ) Desistiu em ______

| Ano do jogo | O que estava na tela | O que ela fez ou tentou | Tempo parada |
|---|---|---|---|
|  |  |  |  |
|  |  |  |  |

**Perguntas que ela fez:**

-

**Respostas:**

1. Do que era o jogo (**literal**):
2. Momento em que não sabia o que fazer:
3. O que faria diferente:
4. O que mais gostou:
5. O que mais incomodou:

**Suspeitas que apareceram sozinhas:** ______________

---

### Pessoa 4

- **Apelido ou inicial:** ______
- **Joga videogame com que frequência?** ( ) nunca ( ) às vezes ( ) muito
- **Conhece *Plague Inc* ou parecido?** ( ) sim ( ) não
- **Consentiu em gravar?** ( ) sim ( ) não

**Tempo até o primeiro clique:** ______ s
**Desfecho:** ( ) Ouro ( ) Prata ( ) Bronze ( ) Sem medalha ( ) Derrota ( ) Desistiu em ______

| Ano do jogo | O que estava na tela | O que ela fez ou tentou | Tempo parada |
|---|---|---|---|
|  |  |  |  |
|  |  |  |  |

**Perguntas que ela fez:**

-

**Respostas:**

1. Do que era o jogo (**literal**):
2. Momento em que não sabia o que fazer:
3. O que faria diferente:
4. O que mais gostou:
5. O que mais incomodou:

**Suspeitas que apareceram sozinhas:** ______________

---

### Pessoa 5

- **Apelido ou inicial:** ______
- **Joga videogame com que frequência?** ( ) nunca ( ) às vezes ( ) muito
- **Conhece *Plague Inc* ou parecido?** ( ) sim ( ) não
- **Consentiu em gravar?** ( ) sim ( ) não

**Tempo até o primeiro clique:** ______ s
**Desfecho:** ( ) Ouro ( ) Prata ( ) Bronze ( ) Sem medalha ( ) Derrota ( ) Desistiu em ______

| Ano do jogo | O que estava na tela | O que ela fez ou tentou | Tempo parada |
|---|---|---|---|
|  |  |  |  |
|  |  |  |  |

**Perguntas que ela fez:**

-

**Respostas:**

1. Do que era o jogo (**literal**):
2. Momento em que não sabia o que fazer:
3. O que faria diferente:
4. O que mais gostou:
5. O que mais incomodou:

**Suspeitas que apareceram sozinhas:** ______________

---

## Fechamento da rodada

> Preencher **depois** das cinco sessões, não durante. O padrão só aparece no fim.

**Travamentos por lugar** — um é anedota, três é bug de desenho:

| Onde | Quantas pessoas | O que fazer a respeito |
|---|---|---|
|  |  |  |
|  |  |  |
|  |  |  |

**A pergunta 1, das cinco pessoas juntas.** O `§2.1` do GDD aposta que o dilema *mitigar vs adaptar*
chega pela mecânica, sem texto explicando. Quantas descreveram o jogo em termos de **escolha** ou
**tempo perdido**, e não como "um jogo de clicar em coisas verdes"?

Resposta: ______ de 5.

**Os três problemas da rodada** (o `P1-03` pedia três; aqui vale a mesma régua):

1.
2.
3.

**Para onde cada achado foi:**

- Balanceamento → `P8-02`, e daí para `docs/BALANCEAMENTO.md`
- Acessibilidade → `P8-04`
- Conserto pequeno → tarefa nova no `PLANO.md`
- Nada a fazer (e por quê) → anotar aqui mesmo, para não ser reaberto depois
