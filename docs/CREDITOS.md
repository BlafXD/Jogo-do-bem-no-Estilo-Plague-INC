# CREDITOS.md — assets de terceiros e suas licenças

> **Regra 10 da `FORMA-DE-TRABALHO.md`: nenhum asset com direito autoral de terceiros.**
> Só CC0 ou CC-BY, e todo CC-BY exige crédito nesta página.
>
> Nada de arte, ícone, fonte, som ou elemento de interface vindo de *Plague Inc* ou de
> qualquer jogo comercial. Nada de logo de marca, empresa ou ONG real.

## Como registrar

| Campo | Regra |
|---|---|
| **Arquivo** | Caminho no repositório (ex.: `assets/icons/solar.svg`) |
| **Autor** | Nome de quem fez, como o autor pede para ser creditado |
| **Licença** | CC0, CC-BY 4.0, etc. |
| **Origem** | Link direto para a página do asset, não para a home do site |

Assets feitos pela equipe não precisam de linha aqui — mas se for um pacote inteiro
(ícones, trilha), vale registrar de quem é.

## Ícones e imagens

Os ícones de estado da interface são **caracteres Unicode** (`✔`, `●`, `◌`, `✕`, `▲`, `◉`) escritos
no `src/data/i18n.ts` — não há arquivo de ícone, e por isso não há licença a registrar. O pacote
delegável `[D-Design]` segue previsto.

**Os quatro retratos da equipe são da casa.** Conceito, personagens e o logotipo fictício
**ECO-GRID**, que aparece no crachá da Ana Luiza e na jaqueta do Carlos, são criação do autor do
projeto — confirmado no chat em 2026-09-06. Nenhuma marca, empresa ou ONG real aparece na arte, que
é o que a regra 10 barra.

| Arquivo | Autor | Licença | Origem |
|---|---|---|---|
| `src/assets/characters/*.jpg` (4 retratos) | autor do projeto | própria | recortados de uma folha única de 1408 × 768, em 2026-09-06 |

## Áudio

**Os três efeitos são da casa, e nenhum deles foi baixado.** O `P7-05` pedia "3 efeitos CC0", e o
contrato do `[D-Musica]` no `PLANO.md` aceita "autoral **ou** CC0"; a segunda metade é a que valeu,
por duas razões práticas. Esta máquina não tem `ffmpeg` nem `oggenc`, então produzir `.ogg` aqui não
era possível — e trazer arquivo de terceiro obrigaria a verificar de fora uma licença que a regra 10
não deixa errar, escolhendo som pelo nome do arquivo em vez de pelo som.

O `scripts/gerar-audio.mjs` soma seno e decaimento exponencial e escreve os três WAV. **A autoria
fica satisfeita por construção, não por promessa**, e o resultado é reproduzível: rodar o script de
novo escreve exatamente os mesmos bytes (não há sorteio nenhum ali — regra 7).

**São andaime, e existem para serem trocados.** O `[D-Musica]` entrega `.ogg` na mesma pasta e
corrige o campo `file` do `src/data/audio.json`; nenhum arquivo `.ts` muda, e o script pode ser
apagado no mesmo dia. A trilha em loop continua sendo do pacote.

| Arquivo | Autor | Licença | Origem |
|---|---|---|---|
| `src/assets/audio/unlock.wav` | autor do projeto | própria | gerado por `scripts/gerar-audio.mjs` em 2026-09-09 |
| `src/assets/audio/alert.wav` | autor do projeto | própria | gerado por `scripts/gerar-audio.mjs` em 2026-09-09 |
| `src/assets/audio/outcome.wav` | autor do projeto | própria | gerado por `scripts/gerar-audio.mjs` em 2026-09-09 |

## Fontes tipográficas

Nenhuma ainda. Enquanto não houver, a interface usa a pilha de fontes do sistema —
que não precisa de licença e carrega instantâneo, o que ajuda no build offline da feira.

| Fonte | Autor | Licença | Origem |
|---|---|---|---|
| — | — | — | — |

## Código e bibliotecas

As dependências de desenvolvimento estão no `package.json` com suas licenças próprias.
O jogo publicado não embarca biblioteca de terceiros: o engine e a interface são
escritos no projeto.
