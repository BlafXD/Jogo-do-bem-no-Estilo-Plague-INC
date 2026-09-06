# CRONOGRAMA.md — o que aconteceu, e o que falta

> **`P4-02`, escrito em 2026-09-06.** Com 42 das 58 tarefas concluídas, **dois terços deste
> documento são retrospectivos.** Isso não é defeito: um cronograma escrito no começo teria virado
> ficção na segunda semana, e o que serve para o relatório e para os slides é o registro do que de
> fato aconteceu, com as datas certas.
>
> A metade que olha para a frente não tem datas absolutas por um motivo simples: **a data da Feira
> de Jogos Digitais não está registrada em lugar nenhum do repositório.** Ela é a única entrada que
> falta. Enquanto não estiver, a contagem regressiva da §4 fica ancorada em **D** = dia da feira.

---

## 1. O que aconteceu, dia a dia

Dez dias de trabalho entre **2026-08-06 e 2026-09-06** — 32 dias de calendário, 54 commits, 50
entradas no diário. As janelas são do primeiro ao último commit de cada dia, medidas do `git log`.

| Dia | Janela | Entregue |
|---|---|---|
| **08-06** | 16:52 → 20:52 | `SETUP-01` repositório, regras, backlog, diário, licença |
| **08-07** | 12:49 → 15:55 | `SETUP-02` a `SETUP-07` (dois parciais) · `P6-01` tipos do domínio · divisão do `CLAUDE.md` em GDD + `FORMA-DE-TRABALHO` |
| **08-18** | 10:26 → 18:15 | `P3-01` ciência com fonte · `P6-02` clima · `P6-03` tick · `P6-04` relógio · `P6-05` árvore · `P5-03` HUD · `P5-05` controle de tempo · **M1** |
| **08-19** | 18:00 → 22:25 | `P6-06` UI da árvore · `P6-07` save · **M2 — o jogo virou jogo** |
| **08-20** | 10:24 → 11:59 | `P3-02` planilha · `P3-03` curva · `P3-05` Inércia · `P3-06` tsunami · `P7-01` eventos |
| **08-23** | 20:08 → 20:55 | `P7-02` cartão de evento · `P7-03` Inércia no engine |
| **08-25** | 20:30 → 22:24 | `P5-01` mapa · `P5-02` tema · `P5-04` painel de região · `P5-06` telas |
| **08-26** | 14:31 → 23:10 | `P7-06` telas de fim (3 partes) · `P7-04` mapa que esquenta · `P7-07` Modo Feira · `P7-08` tutorial · `P8-01` instrumento · `P1-04` nome · `P8-05` build da feira |
| **08-29** | — | `P8-04` acessibilidade |
| **09-06** | 17:34 → 18:14 | conserto do `P8-04` · `P4-04` README · `P4-01` escopo · GDD ratificado · `P4-02` cronograma · `P4-03` custo |

**Os dois dias que carregaram o projeto foram 08-18 e 08-26** — 7h49 e 8h39, 28 dos 54 commits. Os
dois marcos e a virada para jogável saíram deles.

---

## 2. A ordem do plano e a ordem da execução divergiram

Vale registrar porque é a informação que um cronograma retrospectivo tem e um prospectivo não teria.

| Parte da disciplina | Quando o plano previa | Quando aconteceu |
|---|---|---|
| 1. Introdução | primeiro | **ainda aberta** (só o `P1-04`) |
| 2. Narrativa | segundo | **ainda aberta** |
| 3. Mecânicas no papel | terceiro | 08-20 — **depois** do engine |
| 4. Projetando | quarto | 08-07 (infra) e 09-06 (os quatro documentos) |
| 5. Cenários | quinto | 08-18 e 08-25, partido em dois |
| 6. Primeiras mecânicas | sexto | **08-07 a 08-19 — o primeiro a andar** |
| 7. Desenvolvimento | sétimo | 08-20 a 08-26 |
| 8. Testes e finalização | oitavo | 08-26 a 09-06, parcial |

**A inversão foi deliberada, e está escrita no `PLANO.md`:** *"o engine é o caminho crítico. Fazer
uma fatia vertical fina cedo — tick + temperatura + um botão que compra uma habilidade — mesmo que
feia."* Em modo solo, chegar na Parte 6 sem simulação nenhuma era o risco maior.

**Uma inversão, porém, não foi planejada, e é honesto dizer.** O risco `R2` tinha como mitigação
*"planilha antes do código"* — o `P3-02` deveria preceder o engine. Ele foi feito em **08-20**, dois
dias **depois** do `P6-02` calcular temperatura. Na prática deu certo (a planilha confirmou o
modelo em vez de corrigi-lo), mas foi sorte de um modelo simples, não método. Num modelo com
realimentação a conta teria saído cara.

---

## 3. Onde o projeto está hoje

**42 concluídas · 1 em andamento · 15 abertas.**

**Das 16 que restam, uma só é código** — o `P7-05` (áudio). O jogo, como software, está pronto: engine,
UI, eventos, antagonista, telas de fim, Modo Feira, tutorial, acessibilidade e build offline, com
672 testes.

Marcos: **M1** ✔ (08-18) · **M2** ✔ (08-19) · **M3** ✔ (08-26, build da feira testada).

---

## 4. O que falta, em ordem de dependência

Sem datas absolutas, porque **D** — o dia da feira — ainda não está registrado. O que a tabela dá é
a ordem em que as coisas destravam umas às outras, que é o que decide se dá tempo.

### O caminho crítico: tudo passa pelo `P8-01`

```
P8-01  cinco sessões de playtest        ← só você pode; nada meu depende disso
  ├──► P8-02  rodada de balanceamento
  └──► P8-03  vídeo de 1 a 3 min (APS 2 — nota, via AVA)
```

**Este é o único gargalo real do projeto.** Ele está `[~]` desde 08-26: o protocolo e as fichas
estão prontos em `docs/playtests/`, faltam cinco pessoas de fora sentarem para jogar. Enquanto ele
não acontecer, duas tarefas — uma delas valendo nota — ficam paradas sem que nenhum trabalho meu
as destrave.

### O que roda em paralelo, sem depender de ninguém

| Tarefa | Esforço | Observação |
|---|---|---|
| `P1-01` one-pager | P | O pitch que sai daqui é insumo do `P8-06` e do `P8-07` |
| `P1-05` APS 1 | M | Nota, via AVA, na Avaliação Parcial |
| `P7-05` áudio | P | A última de código. Destrava o `[D-Musica]` |
| `P4-05` distribuir os pacotes | P | Depende do grupo existir |

### O que só fecha no fim

| Tarefa | Depende de |
|---|---|
| `P8-06` cartaz com ODS 13 e QR code | `P1-01` (o pitch de 60s) |
| `P8-07` slides | praticamente tudo |
| `P1-02` / `P1-03` protótipo de papel | **decisão sua** — ver `docs/ESCOPO.md §6` |
| `P2-01` a `P2-05` narrativa | o grupo (`P4-05`), e duas delas precisam de código antes |

### Contagem regressiva sugerida

| Quando | O quê |
|---|---|
| **D − 21** | Começar as sessões do `P8-01`. Cinco pessoas levam mais tempo que se imagina para agendar |
| **D − 14** | `P8-01` fechado · `P8-02` balanceamento a partir do que ele achar |
| **D − 10** | `P8-03` vídeo montado (a gravação sai das sessões, então grave desde a primeira) |
| **D − 7** | `P8-06` cartaz na gráfica · rebuild da feira e novo teste em máquina limpa |
| **D − 2** | Pendrive preparado e testado **na máquina que vai ao estande**, sem rede |
| **D** | Feira |
| **D + n** | `P8-07` slides da apresentação final |

**A regra que essa tabela existe para impor:** o `P8-01` precisa começar cedo porque ele não depende
de esforço, depende de agenda alheia. Todo o resto se comprime; ele não.

---

## 5. O que este cronograma precisa para deixar de ter buracos

Três datas que não estão em nenhum arquivo do repositório e que só você tem:

1. **A data da Feira de Jogos Digitais** — é o **D** de tudo acima.
2. **A data da Avaliação Parcial**, que é o prazo da APS 1 (`P1-05`), via AVA.
3. **A data da apresentação final**, que é o prazo do `P8-07`.

Com as três, a §4 vira um calendário. Sem elas, ela é uma ordem de dependência — que já é o mais
importante, mas não avisa quando começar.
