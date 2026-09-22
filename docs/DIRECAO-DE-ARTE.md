# DIRECAO-DE-ARTE.md — a identidade visual do Ponto de Virada

> **Aprovada em 2026-09-16, no chat, depois do protótipo do `VIS-01`:** *"Gostei, podemos seguir
> com os próximos passos."* Fecha a pendência "Direção de arte" do `docs/GDD.md §8`.
>
> Este arquivo é o brief das tarefas `VIS-02` a `VIS-10` do `PLANO.md`. O protótipo que o originou
> fica **fora do repositório**, na pasta acima dele: `Protótipo VIS-01 - Ponto de Virada.html` (abre
> com dois cliques) e `Protótipo VIS-01 - fontes/` (o traçado das regiões, o utilitário de imagem,
> as poses tratadas e as máscaras). Os prints estão em `docs/evidencias/2026-09-16-vis-01-*.jpg`.

---

## 1. A direção, em uma frase

**A sala de situação de uma agência climática:** um mapa do mundo que esquenta no centro, os
instrumentos em volta, e a equipe da agência dando as notícias.

## 2. De onde ela vem

A identidade sai da **ficha dos personagens** (`docs/PERSONAGENS.md`), que já é da casa:

- cartão verde-oliva escuro;
- fio cor de champanhe com traço de circuito e pontinhos nas pontas;
- faixa de nome em bronze, com os cantos chanfrados;
- título em dourado claro;
- a folha verde num anel.

Tirar a interface da mesma fonte das poses é o que faz os personagens parecerem parte da tela, e
não recortes colados nela.

**Nada vem do _Plague Inc_** — nem paleta, nem ícone, nem arranjo de interface (regra 10 e §12). O
que o gênero tem em comum — um mapa no centro e um relógio que corre — não é de ninguém.

---

## 3. Paleta

| Nome | Hex | Papel |
|---|---|---|
| floresta | `#0F1812` | fundo da página |
| barra | `#142018` | barras de cima e de baixo, coluna lateral |
| musgo | `#1B2A1F` | painéis e cartões |
| musgo-alto | `#243629` | hover, superfície elevada |
| linha | `#2F4234` | divisórias — decorativas, sem exigência de contraste |
| **latão** | `#E2CD95` | títulos, ícones, seleção, estado disponível, botão principal |
| latão-forte | `#F1DEB0` | o anel da marca, o traço mais claro |
| fio | `#A08D5E` | borda de componente |
| bronze | `#6A5234` | faixa de nome dos personagens |
| **creme** | `#F4EDD0` | cartão dos personagens, contorno da região escolhida, o "no mundo real" |
| tinta | `#2A281D` | texto sobre creme e sobre latão |
| texto | `#F3EFE0` | texto principal |
| suave | `#B9BFA7` | rótulo, texto secundário |
| **folha** | `#A4D37A` | comprado, medidor alto |
| **brasa** | `#F2A65A` | alerta, crítico, evento — o mesmo `--cor-alerta` de hoje |
| oceano | `#0B4C63` | o fundo atrás do mapa |
| foco | `#FFE7A3` | anel de foco do teclado |

### Contraste (WCAG 2.1), medido nos quatro fundos

| Texto | floresta | barra | musgo | musgo-alto | exige |
|---|---:|---:|---:|---:|---:|
| texto | 15,72 | 14,59 | 13,05 | 11,15 | 4,5 |
| suave | 9,55 | 8,86 | 7,92 | 6,77 | 4,5 |
| latão | 11,55 | 10,72 | 9,59 | 8,20 | 4,5 |
| folha | 10,50 | 9,75 | 8,71 | 7,45 | 4,5 |
| brasa | 8,95 | 8,31 | 7,43 | 6,35 | 4,5 |
| fio (borda) | 5,58 | 5,17 | 4,63 | 3,96 | 3,0 |

Os pares fora da tabela:

| Par | Contraste |
|---|---:|
| tinta sobre creme | 12,59 |
| tinta sobre latão | 9,44 |
| creme sobre bronze | 6,23 |
| foco sobre musgo | 12,32 |

### Da paleta de hoje para a nova (o `VIS-02`)

O `src/ui/theme.css` tem sete cores. Seis trocam de valor — só a brasa fica — e **o destaque muda
de papel**: o verde-menta vira latão, e o verde fica guardado para uma coisa só, o que já foi
comprado. Aplicado no `VIS-02`, que também tirou das nove folhas de módulo os contrastes que elas
repetiam: a única tabela é a do cabeçalho do `theme.css`.

| Hoje | Vira |
|---|---|
| `--cor-fundo` `#0F1C17` | floresta `#0F1812` |
| `--cor-superficie` `#182C24` | musgo `#1B2A1F` |
| `--cor-valor` `#F2F7F4` | texto `#F3EFE0` |
| `--cor-rotulo` `#A7C0B4` | suave `#B9BFA7` |
| `--cor-destaque` `#7FD1A8` | latão `#E2CD95` |
| `--cor-alerta` `#F2A65A` | brasa `#F2A65A` (igual) |
| `--cor-borda` `#4C8069` | fio `#A08D5E` |

As outras cores entram no `theme.css` **junto com a tarefa que as usa pela primeira vez**. Uma
variável que nenhuma folha lê é uma promessa que o teste de contraste não tem como cobrar.

---

## 4. Tipografia

- **Display — Bahnschrift.** Títulos, números e rótulos em caixa alta. A versão condensada
  (`font-stretch: 75%`) fica para os nomes grandes e os nós da árvore. É a fonte de sinalização que
  **vem instalada no Windows 10 e 11**: não se baixa, não entra no pacote do jogo e, por não ser
  distribuída, não tem licença a registrar no `docs/CREDITOS.md`.
- **Pilha de reserva:** `'DIN Alternate', 'Barlow Condensed', 'Roboto Condensed', 'Arial Narrow',
  sans-serif`.
- **Texto — Segoe UI** (`'Segoe UI Variable Text', 'Segoe UI', system-ui`).
- **O piso de 16 px do §5 continua valendo para tudo**, inclusive rótulo, etiqueta do mapa e texto
  de botão.

**Risco a conferir antes da feira:** numa máquina sem Windows a identidade perde a condensada. O
jogo continua legível, mas fica menos parecido com os prints.

**No jogo desde o `VIS-04`:** as duas pilhas são o `--fonte-display` e o `--fonte-base` do
`theme.css`. A Bahnschrift está na marca, nos indicadores, nos botões das barras, nas listras e nos
títulos da coluna; o texto corrido segue na Segoe UI.

---

## 5. A assinatura: as listras do aquecimento

**Uma listra por ano, de 2025 a 2100, na cor da temperatura daquele ano.** É a linguagem das
*warming stripes* de Ed Hawkins (Universidade de Reading), uma das imagens mais conhecidas da
comunicação sobre o clima, desenhada aqui **com os números da própria partida**. O crédito à ideia
entra no `docs/CREDITOS.md` com a primeira tarefa que desenhar as listras no jogo.

A escala tem uma parada em cada teto de medalha do §2.7. A cor da listra diz, de relance, em que
faixa da nota o mundo estava naquele ano:

| Temperatura | Cor | O que marca |
|---:|---|---|
| 1,20 °C | `#1F5C73` | frio, abaixo da partida |
| 1,50 °C | `#6E9E8C` | teto do ouro |
| 1,75 °C | `#C9C98A` | — |
| 2,00 °C | `#E7C572` | teto da prata |
| 2,30 °C | `#E99A4E` | — |
| 2,55 °C | `#D9673A` | teto do bronze |
| 3,00 °C | `#B23A2E` | derrota |
| 3,40 °C | `#6E1C1E` | além da derrota |

| Onde aparece | O que mostra |
|---|---|
| Barra do tempo (`VIS-04`) | os anos vividos coloridos, os que faltam ocos, e um marcador com o ano e a temperatura |
| Tela de título (`VIS-08`) | uma partida **sem nenhuma compra**, que acaba riscada antes de 2100 — proposta 1, §10 |
| Tela de fim (`VIS-10`) | a partida do jogador contra a partida sem compras — proposta 1, §10 |

**A cor nunca é o recado sozinha** (§5). A temperatura está sempre escrita ao lado: no indicador,
no marcador da barra e na legenda do mapa.

**Como ficou no `VIS-04`:**
- As oito cores são `--cor-listra-0` a `--cor-listra-7` no `theme.css`. As temperaturas das
  paradas moram no `src/ui/stripes.ts`, que lê os tetos das medalhas e a derrota do próprio
  engine.
- As duas paradas sem regra ficaram **a meio caminho entre os tetos vizinhos**: 1,75 e 2,275 °C, e
  não 2,30. Assim elas acompanham se o balanceamento mexer num teto, e a diferença de cor não se
  vê.
- A cor de cada ano é a temperatura em que ele **terminou**. O ano corrente usa a de agora, e o
  marcador anda mês a mês.
- A régua sob a temperatura do HUD usa a mesma escala: quatro faixas (ouro, prata, bronze e sem
  medalha), com largura proporcional a cada uma, terminando na derrota.

---

## 6. O mapa

- **A imagem é o `Mapa Mundi.jpeg`** (1376 × 768), **gerado pelo autor do projeto, como os
  personagens** — confirmado no chat em 2026-09-16. No repositório ela é o
  `src/assets/map/world.jpg`, sem edição, e a linha dela está no `docs/CREDITOS.md`.
- **O recorte vai de 0 a 620 px na vertical.** A faixa branca da Antártida sai, porque nenhuma
  mecânica usa aquela terra e ela roubava a atenção (proposta 3, §10).
- **As oito regiões seguem o recorte do `docs/CIENCIA.md`, e o mapa passa a mostrá-lo.**
  - A Rússia inteira fica na Europa.
  - A Ásia Central fica no Oriente Médio.
  - A Indonésia e o resto do Sudeste Asiático ficam na Ásia Oriental.
  - O Egito, com o Sinai, fica na África.
  - A Nova Guiné se divide no meridiano 141° L.
  - A Groenlândia fica na América do Norte.
- **Terra e oceano se separam pela cor**: onde o azul predomina, é água. As fronteiras entre
  regiões foram traçadas em pixels, porque a imagem não é uma projeção exata. Ela fica perto da
  Miller, com ~3,83 px por grau, mas com desvios locais de vários pixels. Os polígonos nasceram no
  `polys.txt` das fontes do protótipo e hoje moram no `src/ui/map-geometry.ts`; o
  `tests/map-geometry.test.ts` confere 37 pontos do recorte, um por decisão.
- **Três particularidades da imagem.** Todas já estão tratadas no traçado:
  - a ponta da Chukotka reaparece na borda esquerda e pertence à Europa;
  - a ilha de Sacalina está grudada no continente;
  - o estreito de Bab-el-Mandeb está fechado.

### Os estados de uma região

| Estado | Como aparece | Por que não é só cor |
|---|---|---|
| Escolhida | contorno creme fino (2 px da imagem) com halo escuro, terra clareada | a etiqueta ganha borda grossa e o marcador `▸` |
| Sob o ponteiro | o mesmo, pela metade | — (não é estado do jogo) |
| Atingida por evento | pulso de brasa, 1,8 s | etiqueta `◉ evento` |
| Apoio abaixo do piso | hachura de brasa a 135° | **textura**, mais a etiqueta `▲ crítico` |
| Calor | a terra ganha sépia conforme a temperatura sobe; acima de 2,3 °C, um tom de brasa | a legenda diz a faixa por escrito |

**As etiquetas são botões de verdade**, em HTML, por cima do desenho. Cada uma tem:
- o nome da região;
- "Apoio N" e um medidor com o piso de apatia marcado;
- o alerta, quando houver, pendurado acima.

Isso aposentou o `<g role="button">` do `P5-01`, a única vez em que a interface abria mão do
elemento nativo. **Clicar na terra** também escolhe a região, por uma grade na metade da resolução
da imagem, gerada junto com as máscaras. Um clique a até 6 px da costa (em pixels da imagem) ainda
conta como terra; um clique no mar não faz nada.

**A etiqueta tem fundo opaco**, e não os 90% do protótipo: é o que permite medir o contraste do
texto, na tabela do `theme.css`. **O alerta se apoia na borda de cima** e não entra na etiqueta —
descendo mais, ele cobria o acento de "África" e de "Ásia".

**As máscaras nascem no navegador.** Na carga, o `map.ts` lê os pixels da imagem num canvas,
separa a terra da água, pinta os polígonos e entrega a cada camada a sua máscara. Nenhuma imagem
gerada entra no repositório, e o build da feira funciona por `file://`, porque a imagem vai
embutida no HTML. Se o canvas falhar, as camadas ficam escondidas: o desenho não reage, e as
etiquetas continuam funcionando.

**O `--largura-mundo` é a menor largura do mapa.** Na tela cheia (`VIS-04`), o mapa cresce até
ocupar o centro, até acabar a largura ou a altura. Em tela estreita ou com zoom alto, ele fica
nessa largura e rola de lado **dentro da própria caixa** — a página não rola, como já era. O piso
existe porque as etiquetas têm tamanho em `rem`: nessa largura as oito cabem sem se tocar, e
maior só as afasta. O teste de sobreposição mede no piso, então vale para qualquer tamanho e
qualquer zoom.

**A legenda do calor fica no canto de baixo do desenho** desde o `VIS-04`, como no protótipo. Ela
fica à esquerda, sobre o mar aberto, porque o canto direito cobriria a Nova Zelândia. Embaixo do
mapa, ela tirava a altura de que a tela cheia precisa.

---

## 7. Os personagens

**Regras que não mudam:** nenhum bônus, nada no `GameState`, nenhum balanceamento. Eles aparecem
em **cartões creme**, e o nome e o cargo vão numa faixa de bronze **em texto de verdade**, não em
pixel.

**O `docs/PERSONAGENS.md §4` ("dentro da partida: não") precisa mudar junto com o `VIS-07`.** O
protótipo que os mostra dentro da partida foi o aprovado.

### As 16 poses

Todas com fundo creme `#F4EDD0` e 480 px de altura.
- **Carlos, Ricardo e Juliana:** o fundo era liso e foi trocado.
- **Ana Luiza:** a moldura de circuito desenhada no fundo foi apagada. A linha de baixo da moldura
  passava por cima da calça, por isso a faixa inferior dessas imagens foi cortada.

| Pessoa | Poses |
|---|---|
| Ana Luiza | `aponta` · `energia` (medidor brilhando) · `acolhe` (braços abertos) · `planta` (lendo uma planta) |
| Carlos Mendes | `aponta` (para a esquerda) · `explica` (com planta) · `analisa` · `conversa` |
| Ricardo Souza | `aponta` · `apresenta` · `folha` (folha em branco) · `atencao` (dedo para cima) |
| Juliana Almeida | `atencao` (tablet e dedo para cima) · `painel` (tablet com gráficos) · `aponta` (corpo inteiro) · `mapa` (tablet com mapa) |

**O logotipo ECO-GRID sai deformado em várias poses** ("CCO-GREN", "ECO-GIBG"). No tamanho da tela
quase não aparece; num cartaz grande, aparece.

### Quem aparece onde

| Momento | Quem, e com qual pose | Onde |
|---|---|---|
| Tutorial — o tempo | Ana Luiza, `aponta` | canto de baixo à esquerda, perto dos controles |
| Tutorial — a árvore | Carlos, `explica` | canto de baixo à direita, perto do botão da árvore |
| Tutorial — o evento | Ricardo, `aponta` | à direita, apontando para o boletim |
| Tutorial — a Inércia | Juliana, `atencao` | no alto, apontando para o indicador |
| Evento crítico | o especialista do assunto (tabela abaixo) | cartão central, com o tempo parado |
| Boletim do clima | o mesmo especialista, em avatar redondo | ao lado de cada evento |
| Tela de título | os quatro: `acolhe`, `conversa`, `apresenta`, `painel` | a equipe da agência |
| Tela de fim | Juliana, `painel` | ao lado do resultado |

**Quem dá cada notícia** (proposta 2, §10). A tabela vive num arquivo de dados, editável pelo
`[D-Historia]` sem tocar em `.ts`:

| Especialista | Eventos |
|---|---|
| Ana Luiza | onda de calor, ciclone tropical |
| Ricardo | seca, enchente, ressaca e maré de tempestade |
| Carlos | branqueamento de corais, incêndio florestal, deslizamento |
| Juliana | surto transmitido por mosquito, colapso de safra |

**No evento crítico, cada especialista usa a pose de alerta** (decisão de 2026-09-17): Ana Luiza
`aponta`, Carlos `analisa`, Ricardo `atencao` e Juliana `mapa`.

**Desde o `VIS-06`, as três tabelas moram no `src/data/characters.json`**, com as 16 poses em
`src/assets/characters/poses/`. O `src/ui/characters.ts` confere o arquivo na carga, e o
`tests/characters.test.ts` confere que ele bate com a pasta, com os eventos do jogo e com estas
tabelas. Quem muda uma tabela aqui muda o JSON junto.

**Nenhuma fala é inventada para eles.** O que o personagem "diz" é o texto que o jogo já tem — o
passo do tutorial, o fato do evento. Voz própria é trabalho do `[D-Historia]`.

---

## 8. Os componentes

| Peça | Como é |
|---|---|
| **Barra de cima** | marca (a folha no anel de circuito) e os seis indicadores. Cada indicador tem ícone, rótulo em caixa alta e valor em Bahnschrift. Sob a temperatura, uma régua com as faixas das medalhas |
| **Barra de baixo** | pausar (com a tecla `Espaço` escrita), velocidade em botões encostados, as listras, o botão principal da árvore com o PAC, e o som |
| **Coluna** | "Região", compacta, e "Boletim do clima", com os eventos do mais novo ao mais velho |
| **Árvore** | painel por cima da partida (`Esc` fecha). Os cinco ramos são losangos: raiz, dois filhos e o nó final, com as ligações desenhadas. Ao lado, o detalhe: efeito, o fato em cartão creme e a compra sempre à vista. Embaixo, a contenção |
| **Evento crítico** | cartão com retrato, selo "▲ Crítico", "O tempo parou", o fato em creme e "Retomar" com a tecla |
| **Fim** | medalha, quatro números, as listras, o gráfico, "o que ficou para trás" e as três ações |
| **Enfeites** | o traço de circuito no canto do cabeçalho dos painéis |
| **Botões** | principal (fundo latão, texto tinta), secundário (borda fio), texto (sublinhado) |

### Como ficou no `VIS-04`

A partida ocupa a janela a partir de **1240 × 640 px**, em três faixas (`src/ui/layout.css`):
a barra de cima, o mundo e a barra de baixo. Abaixo disso, tudo vira uma coluna e a página rola,
como antes. Onde a tela saiu diferente da tabela acima:

- **Barra de cima.** A marca está sem o símbolo da folha, e os indicadores estão sem ícone: os dois
  entram com os ícones do `VIS-09`. Quando falta largura, a frase da sessão desce para baixo do
  botão, e a barra continua numa linha só.
- **Barra de baixo.**
  - A pausa não tem a tecla `Espaço` desenhada. Quem cumpre esse papel é a linha de atalhos do
    `P8-04`, embaixo dos botões.
  - O som ficou ao lado das velocidades, e não na ponta direita, porque é montado pelo
    `controls.ts`, junto com a pausa.
  - O botão da árvore levava até ela, embaixo do mundo, rolando o meio da tela. Desde o
    `VIS-05`, ele abre o painel.
- **Coluna.** A região e o boletim, com os cartões no fundo da página. Os cartões ainda não têm
  retrato (`VIS-07`).
- **Evento crítico.** Continua como cartão no boletim, com o aviso de tempo parado; o cartão grande
  com retrato é do `VIS-07`.
- **Tutorial.** O balão do tempo, o da árvore e o da contenção aparecem logo acima da barra de
  baixo, por cima do mundo — a árvore e a contenção ficam fora da tela. O do evento fica no
  boletim, e o painel do Modo Feira fica por cima do mapa.

### Como ficou no `VIS-05`

A árvore e a contenção saíram de baixo do mundo e foram para um painel por cima da partida
(`src/ui/tree-panel.ts`). Ele abre pelo botão da barra de baixo ou pelo link de pulo, e fecha pelo
botão "Fechar", pelo clique no fundo escurecido ou pelo `Esc`. O foco volta para quem abriu. O
resto da página fica `inert` e o Tab não sai do painel. **O tempo continua correndo**, decisão de
2026-09-17: as teclas `Espaço`, `1`, `2` e `4` valem com ele aberto. Onde a tela saiu diferente
da tabela acima:

- **Escolher e comprar são dois gestos.** Clicar num nó o põe no detalhe, e quem compra é o botão
  do detalhe. Quando a compra não sai, o botão diz o porquê ("Faltam 12 PAC", "Exige: …"); depois
  do fim da partida, diz "A partida acabou".
- **O fato real aparece antes da compra**, no cartão creme (decisão de 2026-09-17). Até o
  `VIS-04` ele só aparecia depois de comprar.
- **O losango só aparece quando o ramo tem 16rem.** Com os cinco ramos lado a lado, isso só
  acontece em telas de uns 1900 px. Abaixo disso, os dois nós do meio ficavam com uns 60 px de
  texto e partiam "Armazenamento" no meio. Nesses casos os quatro nós ficam empilhados, e as
  ligações descem retas por trás dos cartões. Quem decide é uma *container query* no ramo.
- **Duas cores entraram no tema:** a folha (`--cor-comprado`), no nó comprado e na ligação entre
  dois comprados, e a tinta (`--cor-tinta`), no texto do cartão creme.
- **O nó escolhido** ganha um aro creme; o foco do teclado é o anel de brasa.
- **A contenção** tem o visual da `P7-03`, embaixo do detalhe; o ícone próprio dela é do `VIS-09`.
- **O cabeçalho** tem o título, a frase de introdução, o saldo de PAC e o botão de fechar. O traço
  de circuito no canto ainda não entrou.
- **Em tela estreita**, o painel vira uma coluna e rola inteiro.

---

### Como ficou no `VIS-07`

Os personagens entraram na partida, sem bônus (o `docs/PERSONAGENS.md §4` mudou junto, com
permissão). Onde a tela saiu diferente da tabela do §7 e das peças acima:

- **Tutorial.** O balão tem o retrato à esquerda e "Nome · Cargo" em cima da fala. Ele continua
  logo acima da barra de baixo; o lugar por passo do protótipo (em cima, à direita) não entrou.
- **Boletim.** Cada cartão tem o avatar redondo do especialista, centrado no rosto, e "por
  Ricardo" depois do lugar e do ano. O centro de cada rosto está no `characters.json`.
- **Evento crítico.** É o cartão central da tabela acima: o retrato com a faixa de bronze, o
  selo, o nome, o fato em creme, o aviso e "Retomar" com a tecla `Espaço` desenhada. Ele abre por
  cima de tudo, inclusive do painel da árvore. Fechar solta o tempo — pelo botão, pelo `Espaço` ou
  pelo `Esc` —, e o clique no fundo não fecha. O aviso de tempo parado continua também no boletim.
- **Fim.** A Juliana fica ao lado do resultado, com a legenda "Auditoria da partida" na faixa. O
  balão de fala do protótipo não entrou.
- **Uma cor entrou no tema:** o bronze (`--cor-bronze`) da faixa de nome, com o creme por cima
  (6,23:1).

---

### Como ficou no `VIS-08`

A tela de título é a do protótipo: a abertura à esquerda, a equipe à direita e as listras de uma
partida sem nenhuma compra embaixo. Onde ela saiu diferente:

- **A marca** (a folha no anel) não entrou ao lado do ODS; ela é do `VIS-09`.
- **Os botões** usam o estilo que o título já tinha. Sem partida salva, "Começar" ganha o destaque
  de botão principal; com partida salva, quem o ganha é "Continuar".
- **O som** fica depois dos três caminhos de jogo e usa o mesmo mudo da barra da partida.
- **A equipe** está em duas colunas na tela larga. A altura das poses acompanha a janela, e os
  botões ficam na primeira dobra em todos os tamanhos conferidos.
- **As listras** são da partida parada da seed de uma partida nova (`passiveFor` do VIS-10), e
  acabam em "✕ 2089". Numa tela baixa, elas ficam logo abaixo da primeira dobra.

### Como ficou no `VIS-10`

A tela de fim ganhou a comparação com a mesma partida sem nenhuma compra. Onde ela saiu diferente
da tabela acima:

- **Medalha.** É o desenho do protótipo: a fita, o disco na cor da medalha e o número da
  colocação. As três cores entraram no tema (`--cor-medalha-*`). Sem medalha, fica o ícone
  escrito de antes, e o título continua dizendo o resultado.
- **Listras.** São duas faixas, "Sua partida" e "Sem nenhuma compra", com o período e o resultado
  escritos ao lado (`1,75 °C` ou `✕ 2089`). Os anos depois do fim ficam sem cor, e cada faixa
  tem a sua frase para o leitor de tela.
- **Gráfico.** A partida parada é uma tracejada miúda atrás da curva jogada, com "sem nenhuma
  compra" escrito no fim dela, e as duas usam a mesma escala.
- **Disposição.** Numa tela de 75rem ou mais, o gráfico fica à esquerda e "o que ficou para trás"
  e as três ações, à direita. Abaixo disso, tudo vira uma coluna.
- **O balão da Juliana e o texto "Resultado da partida"** do protótipo não entraram: a legenda da
  faixa dela já diz o que ela faz ali.

### Como ficou no `VIS-09` (1ª entrega: indicadores, ramos, contenção e marca)

Os ícones do protótipo viraram arquivos: doze em `src/assets/icons/` e a marca em
`src/assets/brand/mark.svg`. O traçado é o mesmo do protótipo, sem mudança. Os ícones dos botões são
da 2ª entrega. Onde a tela saiu diferente:

- **Barra de cima.** Cada indicador tem o ícone à esquerda, em latão, da altura do rótulo com o
  valor. O tamanho é de 24 px, e não os 26 do protótipo, para o traço cair inteiro no pixel.
- **O nome some da barra entre 1240 e 1360 px (85rem), e fica só a marca.** Com os seis ícones, a
  marca e o nome, a barra não cabia numa linha: medido, em 1240 px a página rolava de lado, e em
  1280 px a sessão ficava com 11rem e a barra engordava 20 px. O `<h1>` continua dizendo "Ponto de
  Virada" para o leitor de tela. A partir de 1360 px o nome volta.
- **Tela estreita.** Abaixo de 1240 px a barra de cima quebra em linhas, como antes, e fica de 12 a
  64 px mais alta: em 768 px os indicadores passam a ocupar duas linhas, e em 1024 px a sessão desce
  para uma linha própria. Nessa faixa a página já rolava.
- **Ramos.** O ícone vai na frente do nome, na cor do nome, com 22 px.
- **Contenção.** O escudo vai na frente de "Conter a Inércia", em brasa, a cor dela. O custo passou
  a se alinhar pelo centro, e não pela linha de base, porque ícone não tem linha de base.
- **A marca no título tem 40 px, e não 44.** Inteira, ela empurrava a tela 20 px para baixo, e as
  listras saíam da primeira dobra em 1536 × 702. E, em 1024 px, o ODS quebrava em duas linhas: ele
  precisa de 395 px, e sobravam 392. Agora a marca passa da linha do ODS sem aumentá-la, e o título
  mede o mesmo que no `VIS-08` nas seis telas conferidas.
- **As cores da marca saem do tema.** O anel e o circuito usam o creme (`--cor-creme`) no lugar do
  latão-forte do §3, que não entrou no `theme.css`: são `#F4EDD0` contra `#F1DEB0`, e uma variável a
  mais só para o logotipo seria uma cor que nenhuma folha lê. A folha é `--cor-comprado`, e o fundo
  do anel, `--cor-superficie`.

---

## 9. O que continua valendo do §5

- **Ícone e texto em todo estado:** `✔ Comprado`, `● Disponível`, `◌ PAC insuficiente`,
  `✕ Bloqueado`, `◉ evento`, `▲ crítico`. O ícone fica grudado no rótulo (espaço inseparável).
- **Contraste AA medido, e o `tests/theme.test.ts` continua cobrando.**
- **Teclado:** `Esc` fecha, `Espaço` pausa, `1`, `2` e `4` mudam a velocidade; as etiquetas do
  mapa e os nós da árvore são alcançáveis por `Tab`.
- **Dica em tudo que tem número.**
- **`prefers-reduced-motion`:** sem pulso e sem animação de entrada.
- **Tela estreita e zoom de 400%:** tudo vira uma coluna, e a página não rola de lado.

---

## 10. As três propostas que vieram com o protótipo

Nenhuma delas estava no GDD. As três aparecem no protótipo aprovado, e cada uma pede uma mudança
que só se confirma quando a tarefa correspondente começar.

1. **A partida sem nenhuma compra, como comparação.** Ela aparece nas listras do título e da tela
   de fim.
   - **Exige código de engine:** simular a partida paralela, com a mesma seed e sem compras.
   - O protótipo usou a fórmula do GDD §4, sem Inércia nem eventos, e essa partida acaba em 2091;
     o número de verdade sai do engine.
   - **Muda a descrição da tela de fim no `docs/GDD.md §2.7`**, que só se edita com permissão.
   - É o `VIS-10`, e o `VIS-08` depende dele.
   - **Feito no `VIS-10`, em 2026-09-17, com permissão para o §2.7.** A partida parada sai do
     `src/engine/passive-run.ts` e, simulada de verdade, acaba em **2089** nas seeds medidas
     (2025, 7 e 1).
2. **Um especialista por evento.** A tabela do §7.
3. **O mapa sem a Antártida.** O §6.

---

## 11. As tarefas e o que cada uma tira daqui

| Tarefa | Usa |
|---|---|
| `VIS-02` Paleta | §3 — as sete cores de hoje trocadas, e os contrastes |
| `VIS-03` Mapa ilustrado | §6 — a imagem, o recorte, as máscaras, os estados, as etiquetas |
| `VIS-04` Partida em tela cheia | §5 e §8 — barras, coluna, listras na barra do tempo |
| `VIS-05` Painel da árvore | §8 — losangos, detalhe, contenção |
| `VIS-06` Poses | §7 — os 16 arquivos e o manifesto de quem aparece onde |
| `VIS-07` Personagens na partida | §7 — tutorial, eventos, fim; e o `PERSONAGENS.md §4` |
| `VIS-08` Título | §4, §5 e §7 — nome, equipe, listras sem compras |
| `VIS-09` Ícones | §8 — os ícones de 24 px e traço de 2 px desenhados no protótipo |
| `VIS-10` Tela de fim | §5, §8 e §10 — a comparação e a medalha |
