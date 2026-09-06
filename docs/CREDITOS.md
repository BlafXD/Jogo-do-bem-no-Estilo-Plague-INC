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

Nenhum ainda. Previsto em `P7-05`: três efeitos CC0 e botão de mudo. Trilha é do
pacote `[D-Musica]`.

| Arquivo | Autor | Licença | Origem |
|---|---|---|---|
| — | — | — | — |

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
