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
