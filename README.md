# Ponto de Virada

[![CI](https://github.com/BlafXD/Jogo-do-bem-no-Estilo-Plague-INC/actions/workflows/ci.yml/badge.svg)](https://github.com/BlafXD/Jogo-do-bem-no-Estilo-Plague-INC/actions/workflows/ci.yml)

Jogo de estratégia sobre ação climática — **ODS 13**. Projeto de sala de aula da disciplina
Desenvolvimento de Jogos e Simuladores, UniSENAI.

**A ideia em uma frase:** é _Plague Inc_ com a lógica invertida. Em vez de evoluir um patógeno até
o mundo colapsar, você é o Gerente de uma agência climática global e evolui **soluções** contra um
mundo que já está esquentando — de 2025 a 2100, um mês por tick.

A tensão não é vencer o relógio, é **escolher o que sacrificar**: nenhuma partida rende PAC
suficiente para comprar a árvore inteira. Isso não é impressão, é conta feita — falta cerca de 35%,
e está medido em `docs/BALANCEAMENTO.md`.

**▶ Jogar agora:** <https://blafxd.github.io/Jogo-do-bem-no-Estilo-Plague-INC/>

---

## Só quero abrir o jogo, não programar

Esse link acima já é o jogo — não precisa de nada instalado, e é o jeito de mostrar para alguém.

**Sem internet** (feira, pendrive), o jogo inteiro cabe num arquivo só, que abre com dois cliques:
`dist-feira/index.html`. Ele não vem no repositório porque é gerado; quem o gera é o
`npm run build:feira`, ou o **`ABRIR-O-JOGO.bat`** na raiz, que gera e abre de uma vez.

O **`COMO-RODAR.txt`**, também na raiz, é a versão de bolso disso tudo — separada por "primeira vez
nesta máquina" e "toda vez, depois disso", em texto puro, para ser lida por quem travou e não abriu
este README.

---

## Rodar na sua máquina

Você precisa de **Node 22.12 ou mais novo** (`node --version` para conferir) e de nada além disso.
Sem banco, sem servidor, sem conta em lugar nenhum: o jogo é 100% client-side e o save mora no
`localStorage` do navegador.

```bash
git clone https://github.com/BlafXD/Jogo-do-bem-no-Estilo-Plague-INC.git
cd Jogo-do-bem-no-Estilo-Plague-INC
npm ci
npm run dev
```

**`npm ci` e não `npm install`:** ele instala exatamente as versões do `package-lock.json` e falha
se o lock estiver desatualizado. É o que garante que a sua máquina rode o mesmo que a CI — e o
mesmo que a máquina da feira.

O `npm run dev` imprime um endereço (normalmente <http://localhost:5173/>). Abra no navegador; ele
recarrega sozinho a cada arquivo salvo.

### Mais um passo, se você vai commitar

```bash
git config core.hooksPath .githooks
```

Uma vez por máquina, e de novo em cada máquina nova. Isso liga o hook que remove assinatura
automática de ferramenta de IA da mensagem de commit. **O repositório é da equipe: nenhuma
ferramenta assina o trabalho** — é a regra 13 da `FORMA-DE-TRABALHO.md`, e o hook existe porque
configuração sozinha nem sempre é respeitada.

---

## Os comandos

| Comando               | O que faz                                                                                   |
| --------------------- | ------------------------------------------------------------------------------------------- |
| `npm run check`       | **Os seis abaixo, em sequência.** É o comando de "terminei" — ~30 s                          |
| `npm run dev`         | Servidor de desenvolvimento, com recarga automática                                          |
| `npm run typecheck`   | Só confere tipos (`tsc --noEmit`)                                                            |
| `npm test`            | Roda a suíte inteira uma vez                                                                 |
| `npm run test:watch`  | Roda a suíte e fica observando os arquivos                                                   |
| `npm run lint`        | ESLint                                                                                       |
| `npm run format`      | Prettier — **arruma** a formatação                                                           |
| `npm run format:check`| Prettier — só **reclama**. É este que a CI roda                                              |
| `npm run build`       | Build de produção em `dist/` — é o que vai para o GitHub Pages                               |
| `npm run build:feira` | Build da feira em `dist-feira/`: **um `index.html` só**, que abre do disco sem internet      |
| `npm run preview`     | Serve o `dist/` para conferir o build                                                        |

> O `npm run build` **não** abre de `file://` — ele depende de módulos ES servidos por HTTP. Quem
> roda de pendrive na feira é o `build:feira`, e a diferença está registrada no `P8-05`.

### Antes de considerar qualquer coisa pronta

```bash
npm run check
```

Ele é só o atalho para esta sequência, que é a que importa:

```bash
npm run typecheck && npm test && npm run lint && npm run build && npm run build:feira && npm run format:check
```

**A ordem não é decorativa.** É a regra 5 da `FORMA-DE-TRABALHO.md`, e é a mesma da CI — se um falhar
aqui, ele falha lá. O `typecheck` vem antes do `test` porque o Vitest **não confere tipo**: em
2026-09-06 um teste com o tipo errado passou na suíte e só o `tsc` acusou.

O `check` roda os seis em cerca de 30 segundos. Rodar um por um continua valendo enquanto se
trabalha — `npm run test:watch` numa aba é mais rápido do que a sequência inteira a cada mudança; o
`check` é para o fim, antes de ler o diff e commitar.

Os seis rodam também na CI, em todo pull request — se um falhar aqui, ele falha lá.

**"Passando" inclui o rodapé.** O Vitest consegue terminar com todos os testes verdes e uma linha
`Errors N` embaixo: erro lançado dentro de um ouvinte de evento não derruba o teste que o disparou,
e o relatório o recolhe como _unhandled error_ no fim. Suíte verde com erro no rodapé não é suíte
verde. Já aconteceu uma vez neste projeto, e passou uma semana despercebido.

---

## Onde as coisas ficam

```
src/
├── engine/     TypeScript puro: a simulação. Sem DOM, sem window, sem import de ui/
├── data/       Números e textos: *.json e i18n.ts
├── ui/         Renderização e interação. Um .ts e um .css por pedaço de tela
└── main.ts     O laço de tempo real e a montagem — o único que conhece os dois lados
tests/          Um arquivo por módulo do engine e da UI
docs/           GDD, ciência com fonte, balanceamento, playtests e evidências
```

**A regra de ouro:** `engine/` não sabe que existe uma tela. Se um arquivo em `engine/` importar
algo de `ui/`, está errado — e o `npm run lint` recusa, com a razão escrita na mensagem. Não é
honra, é trava.

Duas consequências que economizam tempo:

- **A simulação inteira é testável sem navegador.** Os testes rodam em `node` por padrão; só quem
  escreve `// @vitest-environment jsdom` na primeira linha ganha um `document`. Isso é de propósito:
  se todo teste tivesse um DOM à mão, um `document` que vazasse para dentro do engine passaria
  despercebido.
- **Nenhum número de balanceamento e nenhum texto de tela mora no código.** Eles vivem em
  `src/data/`, e é isso que torna os três pacotes abaixo possíveis.

---

## Contribuir sem escrever TypeScript

Esta é a parte que interessa a quem está entrando agora. **Três pacotes de trabalho não exigem ler
uma linha de código**, porque o formato do arquivo já está definido e o código já lê dele.

Em todos os três, o jeito de conferir o seu trabalho é o mesmo: `npm run dev`, olhar a tela, e
rodar `npm test`. Se a suíte passar, você não quebrou nada.

### `[D-Design]` — identidade visual

**Você entrega:** `src/ui/theme.css`.

Só **variáveis CSS**, e é ao pé da letra: nenhum seletor, nenhuma regra de layout, nenhuma cor
escrita fora daquele arquivo. Você troca os valores e não abre mais nada — nem `.ts`, nem as outras
folhas de estilo, que leem tudo como `var(--nome, reserva)`.

Duas travas que o arquivo já carrega:

- **Contraste AA é teste, não recomendação.** O `tests/theme.test.ts` lê o `theme.css`, recalcula
  pela fórmula da WCAG 2.1 o contraste de todas as combinações que o jogo usa de verdade, e falha se
  alguma cair abaixo de 4,5:1 em texto ou 3:1 em traço. Trocar uma cor por uma que não passe
  **quebra a suíte**, com o número na mensagem de erro.
- **Nenhum estado do jogo pode ser comunicado só por cor** (`docs/GDD.md §5`). Todo estado já tem
  ícone + rótulo em texto ao lado; se o seu tema depender de verde vs. vermelho para dizer alguma
  coisa, ele está dizendo menos do que o jogo precisa.

**Sobre os ícones, leia antes de desenhar.** O contrato do `PLANO.md` prevê `assets/icons/*.svg`,
24×24, traço de 2px, monocromáticos, sem texto embutido. **Essa metade ainda não está ligada:** hoje
os ícones do jogo são caracteres Unicode (`✔`, `●`, `◌`, `✕`, `▲`, `◉`) escritos no
`src/data/i18n.ts`, e trocá-los por arquivos exige uma mudança de código que ninguém fez ainda. A
substituição do `theme.css` é drop-in hoje; a dos ícones não é. Combine antes de produzir os
arquivos.

### `[D-Musica]` — trilha e efeitos

**Você entrega:** arquivos `.ogg`.

| Item     | Limite                                       |
| -------- | -------------------------------------------- |
| Trilha   | em loop, menos de 2 min, menos de 1,5 MB     |
| Efeitos  | até 6, menos de 100 KB cada                  |

Tudo autoral ou **CC0**, com a origem anotada em `docs/CREDITOS.md` — link direto para a página do
asset, nunca para a home do site.

**O limite de tamanho não é frescura.** O `npm run build:feira` empacota o jogo inteiro num
`index.html` único, para rodar de um pendrive sem internet; áudio embutido entra nesse arquivo.

**Estado hoje:** não há áudio nenhum, nem código que toque áudio — o `P7-05` (três efeitos CC0 e um
botão de mudo) ainda não foi feito, e a pasta de assets **ainda não existe**; ela nasce com o
primeiro arquivo. Combine o caminho junto com quem for fazer o `P7-05`, para não entregar num lugar
onde o código não vai procurar.

### `[D-Historia]` — narrativa e texto

**Você edita:** só `src/data/*.json` e `docs/NARRATIVA.md` (que ainda não existe — nasce com o
pacote). **Nenhum arquivo `.ts`.**

JSON é um formato exigente: vírgula sobrando, aspas curvas no lugar das retas, ou acento fora de
UTF-8 quebram o arquivo inteiro. O `npm test` avisa na hora, e é para isso que ele serve aqui.

| Arquivo         | Registros                            | Campos que são seus            |
| --------------- | ------------------------------------ | ------------------------------ |
| `skills.json`   | 20 nós da árvore                     | `name`, `description`, `fact`  |
| `events.json`   | 10 eventos                           | `name`, `fact`                 |
| `regions.json`  | 8 regiões                            | `name`                         |
| `actions.json`  | 5 ações do mundo real, na tela de fim| `name`, `description`, `fact`  |

Os outros campos — `cost`, `requires`, `effects`, `tempThreshold`, `baseWeight`, `impact`,
`emissions`, `population`, `cleanShare` — são balanceamento medido. **Mexer neles muda o jogo, não o
texto**, e eles têm dono em `docs/BALANCEAMENTO.md` e `docs/CIENCIA.md`.

Três regras sobre o campo `fact`:

1. **Todo `fact` é um fato real, com fonte**, e a fonte vai em `docs/CIENCIA.md`. É isso que separa
   conscientização de palestra — e o que impede o projeto de vender desinformação como educação. O
   `P3-06` já cortou um evento inteiro por causa disso: tsunami saiu, porque é geológico e o
   aquecimento não causa nenhum.
2. **Uma frase.** O `fact` aparece dentro de um cartão, ao lado de números. Duas frases não cabem.
3. **Nenhum número sem fonte.** Se você não achar a fonte, o número não entra.

O texto da **interface** — rótulo, botão, dica, mensagem de fim — **não** está nos JSON: ele mora no
`src/data/i18n.ts`, que é `.ts` e está fora do contrato. Se um rótulo estiver ruim, aponte; não
edite.

---

## As regras que não se negociam

Estão inteiras na `FORMA-DE-TRABALHO.md`. Estas são as que mais pegam quem chega:

- **Sem `Math.random()`, em lugar nenhum.** Todo sorteio usa o RNG semeado de `src/engine/rng.ts`:
  mesma seed, mesma partida. É o que torna bug reproduzível e playtest comparável. O ESLint recusa.
- **Sem `any`, sem `@ts-ignore`, sem `console.log`.** O `tsc` está em `strict` e o ESLint cobra.
- **Número de balanceamento e texto de tela nunca ficam no código.** `src/data/`.
- **Nenhum dado científico inventado.** Todo número climático tem fonte em `docs/CIENCIA.md`.
- **Nenhum asset de terceiros com direito autoral.** Nada vindo de _Plague Inc_ ou de qualquer jogo
  comercial, nenhum logo de marca real. Só CC0 ou CC-BY, com crédito em `docs/CREDITOS.md`.
- **Comentário e mensagem de commit em pt-BR; código, variável e tipo em inglês.**
- **Sem backend.** Nada de servidor, banco ou API externa.
- **Uma tarefa por vez, e o `PROGRESSO.md` atualizado ao fim de cada uma.**

---

## Os documentos

| Arquivo                       | Para quê                                                                       |
| ----------------------------- | ------------------------------------------------------------------------------ |
| `docs/GDD.md`                 | **O jogo**: mecânicas, indicadores, regiões, árvore, eventos, contratos de dados|
| `FORMA-DE-TRABALHO.md`        | **O trabalho**: stack, arquitetura, convenções, git, fluxo de entrega           |
| `PLANO.md`                    | O backlog, uma tarefa por vez, com o corte de escopo assumido                   |
| `PROGRESSO.md`                | O diário datado: o que entrou, como conferir, o que ficou aberto                |
| `docs/CONCEITO.md`            | O one-pager: pitch em 5 linhas, fantasia do jogador, dilema central             |
| `docs/PERSONAGENS.md`         | A equipe da agência: as quatro fichas e a tradução delas para o engine          |
| `docs/ESCOPO.md`              | O escopo travado — e, principalmente, a lista do que o jogo **não** vai ter     |
| `docs/CRONOGRAMA.md`          | O que aconteceu dia a dia, e o que falta em ordem de dependência                |
| `docs/CUSTO.md`               | Quanto custaria contratar este trabalho, e quanto ele custou de fato            |
| `docs/CIENCIA.md`             | Cada número climático e a sua fonte                                             |
| `docs/BALANCEAMENTO.md`       | O que foi ajustado, por quê, e o resultado medido                               |
| `docs/CURVA-DE-DIFICULDADE.md`| A tensão década a década                                                        |
| `docs/INERCIA.md`             | A especificação do antagonista                                                  |
| `docs/CREDITOS.md`            | Assets de terceiros e licenças                                                  |
| `docs/playtests/`             | O protocolo de playtest e as fichas                                             |
| `docs/evidencias/`            | Prints e GIFs por aula                                                          |

**Comece pelo `docs/GDD.md`.** Ele responde "o que é este jogo" em vinte minutos de leitura, e quase
toda dúvida sobre por que alguma coisa é do jeito que é está lá ou no `PROGRESSO.md`.

---

## Licença

MIT — ver `LICENSE`.
