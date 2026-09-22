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
no `src/data/i18n.ts` — não há arquivo de ícone, e por isso não há licença a registrar.

**Os ícones desenhados também são da casa.** Os vinte de `src/assets/icons/` e a marca da folha foram
escritos em SVG, caminho por caminho, no protótipo do `VIS-01` (2026-09-16), e o `VIS-09` os passou
para arquivo sem mudar o desenho. Nenhum vem de biblioteca de ícones. A marca só trocou o latão-forte do
protótipo pelo creme do tema, que é quase a mesma cor.

**A equipe da agência é da casa.** Conceito, personagens e o logotipo fictício
**ECO-GRID**, que aparece no crachá da Ana Luiza e na jaqueta do Carlos, são criação do autor do
projeto — confirmado no chat em 2026-09-06. Nenhuma marca, empresa ou ONG real aparece na arte, que
é o que a regra 10 barra.

**O mapa-múndi também é da casa.** O `Mapa Mundi.jpeg` que o `VIS-03` pôs no jogo foi gerado pelo
autor do projeto, como a equipe — confirmado no chat em 2026-09-16. Entrou sem edição nenhuma: as
fronteiras das 8 regiões não estão na imagem, são polígonos do projeto no `src/ui/map-geometry.ts`.

| Arquivo | Autor | Licença | Origem |
|---|---|---|---|
| `src/assets/characters/poses/*.jpg` (as 16 poses da equipe) | autor do projeto | própria | quatro poses de cada pessoa, recebidas em 2026-09-16; o fundo virou creme `#F4EDD0` e a altura, 480 px, no `VIS-01` (`VisTool.cs`, fora do repositório) |
| `src/assets/map/world.jpg` | autor do projeto | própria | cópia sem edição do `Mapa Mundi.jpeg`, de 1376 × 768, em 2026-09-16 |
| `src/assets/icons/*.svg` (20 ícones) | autor do projeto | própria | desenhados no protótipo do `VIS-01` em 2026-09-16; viraram arquivo no `VIS-09`, em 2026-09-22 |
| `src/assets/brand/mark.svg` | autor do projeto | própria | a folha no anel de circuito, desenhada no protótipo do `VIS-01` a partir da folha da ficha dos personagens |
| `src/assets/characters/poses/inercia-*.jpg` (4 silhuetas) | equipe do projeto | própria | a Inércia, geradas pela equipe e recebidas em 2026-09-22 (confirmado no chat); retingidas no creme `#F4EDD0`, com 480 px de altura, no `VIS-11` |

## Áudio

**Os seis efeitos são do pacote _Interface Sounds_, do Kenney, com licença CC0** — domínio público,
sem obrigação de crédito. O crédito fica aqui mesmo assim, porque a regra 10 pede a origem de todo
asset de terceiro, e porque o Kenney pede. Entraram no `P7-09`, em 2026-09-22, a pedido do chat: o
autor do projeto trouxe o zip. A licença foi conferida duas vezes: no `License.txt` de dentro do zip
e na página do pacote.

**Os arquivos foram renomeados pelo momento em que tocam**, e o conteúdo é o do pacote, sem edição.
Trocar um som é pôr outro `.ogg` na pasta e corrigir o campo `file` do `src/data/audio.json`, sem
tocar em `.ts`. O `tests/audio.test.ts` cobra o contrato do `[D-Musica]`: até seis efeitos, em Ogg
de verdade, com menos de 100 KB cada.

**Os três sons de teste do `P7-05` saíram** junto com o `scripts/gerar-audio.mjs`, que os gerava,
com permissão no chat. A trilha em loop continua sendo do `[D-Musica]`: o pacote só tem efeitos.

| Arquivo | Autor | Licença | Origem |
|---|---|---|---|
| `src/assets/audio/unlock.ogg` | Kenney | CC0 | `confirmation_001.ogg` do *Interface Sounds* — https://kenney.nl/assets/interface-sounds |
| `src/assets/audio/contain.ogg` | Kenney | CC0 | `minimize_008.ogg` do mesmo pacote |
| `src/assets/audio/refuse.ogg` | Kenney | CC0 | `error_004.ogg` do mesmo pacote |
| `src/assets/audio/alert.ogg` | Kenney | CC0 | `bong_001.ogg` do mesmo pacote |
| `src/assets/audio/inertia.ogg` | Kenney | CC0 | `glitch_002.ogg` do mesmo pacote |
| `src/assets/audio/outcome.ogg` | Kenney | CC0 | `confirmation_004.ogg` do mesmo pacote |

## Ideias e linguagens visuais

**As listras do aquecimento são uma linguagem, e não um arquivo.** Desde o `VIS-04`, a barra de
baixo da partida desenha uma listra por ano, na cor da temperatura daquele ano. É a ideia das
*warming stripes*, criadas por Ed Hawkins, da Universidade de Reading. Nenhuma imagem dele entra no
jogo: as cores são as do `src/ui/theme.css` e os números são os da partida. O crédito fica aqui
porque a ideia é dele, como o `docs/DIRECAO-DE-ARTE.md §5` combinou.

| Ideia | Autor | Onde aparece | Origem |
|---|---|---|---|
| *Warming stripes* | Ed Hawkins, Universidade de Reading | as listras da barra de baixo (`src/ui/stripes.ts`) | https://showyourstripes.info/ |

## Fontes tipográficas

**Nenhuma fonte é baixada nem entra no pacote do jogo.** Desde o `VIS-04`, os títulos e os números
usam a Bahnschrift, que vem instalada no Windows 10 e 11, e o texto corrido usa a Segoe UI, também
do sistema. As duas são lidas da máquina de quem joga, então não há licença a registrar. Numa máquina
sem elas, entra a próxima fonte da pilha do `src/ui/theme.css`. Isso também ajuda o build offline da
feira: nada precisa ser carregado.

| Fonte | Autor | Licença | Origem |
|---|---|---|---|
| — | — | — | — |

## Código e bibliotecas

As dependências de desenvolvimento estão no `package.json` com suas licenças próprias.
O jogo publicado não embarca biblioteca de terceiros: o engine e a interface são
escritos no projeto.
