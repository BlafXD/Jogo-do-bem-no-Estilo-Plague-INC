# CUSTO.md — o que este projeto custou, e o que custaria

> **`P4-03`, escrito em 2026-09-06.** Duas perguntas diferentes, com respostas muito diferentes, e
> misturá-las é o erro clássico de estimativa de projeto acadêmico:
>
> 1. **Quanto custaria contratar este trabalho?** — a conta que vai no relatório. §2.
> 2. **Quanto custou de fato?** — tempo real e dinheiro real. §3 e §4.
>
> Todo número aqui saiu do repositório, exceto o **valor-hora**, que é a única entrada que você
> precisa escolher. Ele está isolado na §2.2 justamente para poder ser trocado sem refazer nada.

---

## 1. As horas, contadas de dois jeitos

### 1.1 Pelo esforço estimado das tarefas

O `PLANO.md` classifica cada tarefa em **P** (até 1h), **M** (2–4h) e **G** (uma sessão inteira).
Para fechar a conta, **G = 5h** — é uma suposição minha, e é a única aqui; troque-a se discordar.

| | P | M | G | Horas |
|---|---|---|---|---|
| **Concluídas** (42) | 10 | 24 | 6 | **88 – 136 h** |
| **Restantes** (16, com a em andamento) | 6 | 8 | 2 | **32 – 48 h** |
| **Projeto inteiro** (58) | 16 | 32 | 8 | **120 – 184 h** |

*Duas das 42 concluídas são marcos (`P4-06`, `P6-08`) e não têm esforço próprio — são o aceite de um
conjunto de tarefas já contadas.*

### 1.2 Pelo relógio, medido no `git log`

Somando, para cada dia de trabalho, o intervalo entre o primeiro e o último commit:

**≈ 33 horas em 10 dias**, entre 2026-08-06 e 2026-09-06.

**Este número é um piso, e um piso frouxo.** Ele ignora o que foi feito antes do primeiro commit e
depois do último de cada dia, e o dia 08-29 conta zero porque teve um commit só — quando a entrada
do `PROGRESSO.md` daquele dia descreve uma auditoria de acessibilidade inteira.

### 1.3 A diferença entre 33 e 85–131 é o dado, não o erro

As duas contas medem coisas diferentes, e as duas estão certas:

- **85–131 h** é o que este escopo custa **como trabalho** — o que um contratante pagaria. É a
  resposta certa para "estimativa de custo".
- **≈ 33 h** é o que ele **levou aqui**, com as tarefas dimensionadas para uma pessoa sozinha e o
  trabalho conduzido com assistência de ferramenta.

A conta que vai no relatório é a primeira. A segunda é o registro honesto do que aconteceu, e é o
que explica como 40 tarefas couberam em 32 dias de calendário sem ninguém virar noite todo dia.

---

## 2. O custo do trabalho

### 2.1 Distribuição por parte da disciplina

| Parte | Concluído | Aberto |
|---|---|---|
| SETUP — fundação | 7 tarefas | — |
| 1. Introdução | 1 | 4 |
| 2. Narrativa | — | 5 |
| 3. Mecânicas | 6 | — |
| 4. Projetando | 5 | 1 |
| 5. Cenários | 6 | — |
| 6. Primeiras mecânicas | 8 | — |
| 7. Desenvolvimento | 7 | 1 |
| 8. Testes e finalização | 2 | 5 |

O peso está em **SETUP + Partes 5, 6 e 7** — 28 das 42 concluídas. É onde mora o software.

### 2.2 O valor-hora, que é a entrada que falta

**Este é o único número que não sai do repositório.** Os três abaixo são âncoras ilustrativas para a
tabela ter forma, **não são cotação de mercado** — substitua pelo valor que você for defender na
entrega, e diga de onde ele veio.

| Valor-hora | Projeto inteiro (120–184 h) | Só o que falta (32–48 h) |
|---|---|---|
| R$ 30 | R$ 3.600 – 5.520 | R$ 960 – 1.440 |
| R$ 50 | R$ 6.000 – 9.200 | R$ 1.600 – 2.400 |
| R$ 80 | R$ 9.600 – 14.720 | R$ 2.560 – 3.840 |

**Se a entrega pedir um número único**, o meio da faixa a R$ 50/h dá **≈ R$ 7.600** pelo projeto
completo. Diga que é uma faixa e qual valor-hora você usou; uma estimativa com uma casa decimal e
sem premissa é menos confiável que uma faixa honesta.

---

## 3. O dinheiro que saiu: quase nada, e por decisão

| Item | Custo | Por quê |
|---|---|---|
| **Hospedagem** | **R$ 0** | GitHub Pages em repositório público. O `§12` proíbe backend — não há servidor para pagar |
| **Domínio** | **R$ 0** | `blafxd.github.io/…`; nenhum domínio próprio foi comprado |
| **Banco de dados** | **R$ 0** | Não existe. O save é `localStorage`, no navegador de quem joga |
| **Arte e ícones** | **R$ 0** | Formas geométricas e caracteres Unicode. `docs/CREDITOS.md` está vazio |
| **Fontes** | **R$ 0** | Pilha de fontes do sistema — sem licença e sem download |
| **Áudio** | **R$ 0** | Não existe ainda (`P7-05`); quando existir, a regra é CC0 |
| **Bibliotecas** | **R$ 0** | O `package.json` **não tem bloco `dependencies`** — só `devDependencies`, todas de código aberto e nenhuma embarcada no build |
| **Ferramentas** | *a preencher* | Editor e assistente de código. É a única linha possivelmente não-zero, e só você sabe o valor |

**Custo direto em dinheiro até hoje: R$ 0**, fora a linha de ferramentas.

Isso não é sorte. É o `§12` da `FORMA-DE-TRABALHO.md` — sem backend, sem banco, sem API externa,
sem asset de terceiro — cobrando o preço em restrição de escopo e devolvendo em custo zero e em
**uma build que roda de pendrive sem internet**, que é o requisito real da feira.

---

## 4. O que ainda vai custar dinheiro

Duas coisas, as duas na Parte 8, e as duas fora do software:

| Item | Tarefa | Estimativa |
|---|---|---|
| **Impressão do cartaz** (ODS 13 + QR code) | `P8-06` | *depende do formato e da gráfica — não tenho como estimar* |
| **Pendrive para a build offline** | `P8-05` (já feita) | O arquivo tem **95 kB**. Qualquer pendrive serve, inclusive um que você já tenha |

O pendrive é quase piada, mas está na tabela de propósito: **95 kB é o custo de infraestrutura do
projeto inteiro na feira.** Cabe num e-mail.

---

## 5. O que o corte de escopo economizou

O `docs/ESCOPO.md` lista o que não vai ter. Traduzido em horas, pela mesma régua da §1.1:

| Cortado | Economia estimada |
|---|---|
| Árvore de 40 nós em vez de 20 | ~1 G + refazer o balanceamento — **8 a 12 h** |
| 20 eventos em vez de 10 | ~1 G, quase toda em pesquisa de fonte — **5 a 8 h** |
| Conquistas, cenários históricos, ranking, inglês, clima animado | ~1 M cada — **10 a 20 h** |
| Personagens jogáveis com bônus de ramo | Engine + arte + **refazer a planilha do `P3-02`** — **10 a 15 h** |

**Entre 33 e 55 horas não gastas** — algo entre um quarto e um terço do projeto inteiro. É o que a
tabela da Estratégia Solo comprou, e é o argumento de que o corte foi feito no lugar certo: nada do
que ficou de fora é o que faz o jogo ser um jogo.

---

## 6. Como refazer estas contas

As duas primeiras são um comando; a terceira é uma escolha sua.

```bash
# Horas por esforço — recontar as tarefas de cada tipo
grep '^- \[x\]' PLANO.md | grep -o '\*\*[PMG]\*\*' | sort | uniq -c
grep '^- \[ \]\|^- \[~\]' PLANO.md | grep -o '\*\*[PMG]\*\*' | sort | uniq -c

# Horas de relógio — a janela de cada dia de trabalho
git log --format="%ad" --date=format:"%Y-%m-%d %H:%M" | sort
```

E o valor-hora da §2.2, que é premissa, não medida. **Se ele mudar, tudo na §2 muda e nada na §3
muda** — essa separação é o motivo de as duas seções existirem em vez de uma tabela só.
