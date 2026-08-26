# Como se roda um playtest neste projeto

> Vale para o `P1-03` (protótipo de papel) e para o `P8-01` (jogo). Uma rodada por arquivo,
> numerado: `01-papel.md`, `02-jogo.md`, e assim por diante.

## Por que existe um protocolo escrito

Porque cinco sessões conduzidas de cinco jeitos diferentes não são cinco dados — são cinco
anedotas. Se a primeira pessoa recebe uma explicação de como jogar e a quinta não, o que se
descobre sobre "onde as pessoas travam" diz mais sobre quem explicou do que sobre o jogo.

O roteiro abaixo é literal de propósito. Ler a mesma frase cinco vezes é chato e é o que torna as
cinco sessões comparáveis.

---

## As três regras de quem observa

**1. Não ajude. Nem quando doer.**

É a regra mais violada de todas, e violá-la destrói a sessão inteira. Quando a pessoa travar, você
vai sentir vontade de dizer "é só clicar ali" — e aquele travamento era exatamente o dado que você
foi buscar. Um jogo de feira não vem com você ao lado.

Se ela perguntar diretamente ("o que eu faço agora?"), responda **"o que você acha que acontece?"**
e anote a pergunta. **Uma pergunta é um achado**, não uma interrupção.

**2. Anote o que a pessoa faz, não o que ela diz que faria.**

"Eu acho que compraria energia primeiro" não vale nada. O que vale é o que ela clicou, em que ordem,
e quanto tempo levou até o primeiro clique.

**3. Cronometre o silêncio.**

Mais de **10 segundos** parada olhando para a tela sem clicar é um travamento, mesmo que ela não
reclame — e ela quase nunca reclama, porque a maioria das pessoas assume que a culpa é dela. Anote o
momento e o que estava na tela.

---

## Antes de chamar a pessoa

- [ ] `npm run build` e abrir o **`dist/index.html` direto do disco**, sem servidor. É o que a
      máquina da feira vai rodar (`P8-05`), então testar outra coisa é testar outra coisa.
- [ ] Limpar a partida guardada entre uma pessoa e outra — ou usar o **Modo Feira**, que já não
      salva nada e é a experiência que o estande vai ter.
- [ ] Ter a ficha da pessoa aberta e o cronômetro à mão.

---

## O roteiro, palavra por palavra

**Ao sentar:**

> "Este é um jogo sobre clima. Vou te pedir para jogar uns cinco minutos.
> **Não estou testando você — estou testando o jogo.** Se travar, trava; é isso que eu preciso ver.
> Pode falar em voz alta o que estiver pensando, mesmo que pareça bobagem."

**Depois disso, cale a boca.** Aponte para o computador e não fale mais nada até a partida acabar.

**Se ela perguntar como joga:** "o que você acha que acontece?" — e anote.
**Se ela travar:** conte 10 segundos, anote, e continue calado.
**Se ela desistir no meio:** anote em que ano e por quê. Desistência é o achado mais valioso da
lista, e é o mais fácil de perder por constrangimento de quem observa.

---

## As cinco perguntas do fim

Só depois que a partida acabar. Na ordem, sem pular.

1. **"Com suas palavras, do que era esse jogo?"**
   É a pergunta mais importante das cinco. O `docs/GDD.md §2.1` afirma que a mensagem do ODS 13 está
   *"embutida na mecânica — não em um texto de tutorial"*. Esta pergunta é o único jeito de saber se
   isso é verdade ou se é só uma frase bonita no documento. Anote a resposta **literal**.

2. **"Teve algum momento em que você não sabia o que fazer?"**

3. **"O que você faria diferente se jogasse de novo?"**
   Testa se a tela de fim funcionou. Se a resposta for "não sei", a seção "O que ficou para trás"
   não está chegando.

4. **(para o vídeo) "O que você mais gostou?"**

5. **(para o vídeo) "O que mais te incomodou?"**

As perguntas 4 e 5 são a matéria-prima do `P8-03` (APS 2), que pede opiniões positivas **e**
negativas. Elas saem de graça daqui — mas só se você gravar.

### Sobre gravar

**Pergunte antes, e aceite um não.** "Posso gravar só o áudio das suas duas últimas respostas, para
um trabalho da faculdade?" Quem disser não continua valendo como playtest; só não entra no vídeo.

Anote o consentimento na ficha. Um "sim" dito de boca não é o suficiente para você lembrar daqui a
três semanas, quando estiver montando o vídeo.

---

## O que **não** perguntar

**Nada que sugira a resposta.** A lista de suspeitas de cada rodada (a seção "O que já está sob
suspeita") é para **você**, que observa — nunca para a pessoa que joga.

Perguntar *"o mapa ficou confuso com tantos alertas?"* garante um "é, um pouco" de qualquer pessoa
educada, e você terá confirmado uma suspeita sem ter aprendido nada. Se os alertas confundem, a
pessoa vai parar em frente ao mapa sem clicar, e é **isso** que vai para a ficha.

---

## Depois das cinco sessões

- Contar quantas pessoas travaram **no mesmo lugar**. Um travamento é anedota; três é um bug de
  desenho.
- Escrever os achados no arquivo da rodada, com a contagem.
- O que for balanceamento vai para o `P8-02` e termina em `docs/BALANCEAMENTO.md`.
- O que for acessibilidade vai para o `P8-04`.
- O que for conserto pequeno vira tarefa nova no `PLANO.md`.
