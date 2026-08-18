# PROGRESSO.md — Diário do projeto

> **Para que serve:** provar evolução. Cada aula vale nota parcial, e a memória falha três
> semanas depois. Aqui fica o registro datado do que entrou no projeto, como conferir e o
> que ficou aberto. É a matéria-prima do relatório final e da apresentação.
>
> Design do jogo: `docs/GDD.md`. Regras de trabalho: `FORMA-DE-TRABALHO.md`. Backlog: `PLANO.md`.

## Como escrever uma entrada

Uma entrada por sessão de trabalho, **mais recente no topo**. Formato de `FORMA-DE-TRABALHO.md §5`:

```markdown
## AAAA-MM-DD — <o que mudou>

- **Parte / tarefa:** IDs do `PLANO.md` (ex.: `SETUP-02`, `P6-03`)
- **Como verificar:** comando exato para rodar, ou o que olhar na tela
- **Pendente:** o que ficou aberto ou merece um segundo olhar
- **Evidência:** arquivo em `docs/evidencias/` (print ou GIF), quando houver
```

Regras curtas:

- **Escreva no dia.** Entrada reconstruída de memória vira ficção.
- **"Como verificar" é um comando, não uma promessa.** Quem lê precisa conseguir repetir.
- **Registre o que deu errado também.** Um beco sem saída documentado economiza a próxima tentativa.
- Data em `AAAA-MM-DD`. Nunca "ontem", "semana passada" ou "na aula anterior".

---

## 2026-08-18 — A árvore de habilidades: o jogo passou a ser vencível

- **Parte / tarefa:** `P6-05` ✔ — a tarefa **G** da Parte 6.
- **Três commits, na ordem em que dependem um do outro:**
  1. `feat(data)` — os 20 nós em `src/data/skills.json` e as 19 fontes novas no `docs/CIENCIA.md`.
  2. `feat(engine)` — `parseSkills` no `state.ts` e o `skills.ts` inteiro, com 34 testes.
  3. `feat(engine)` — os efeitos ligados no `climate.ts` e no `tick.ts`. Suíte: 68 → **109**.
- **A tarefa começou com uma ambiguidade que decidia o jogo inteiro.** O `docs/GDD.md §3` descreve o `emissionCut` só como `// % ao ano`, o que admite duas leituras: taxa anual de queda, ou corte único aplicado à emissão anual. Rodei as duas com as constantes reais, e o que decidiu não foi a temperatura — foi a **emissão final**. Na leitura de corte único, a emissão volta a crescer 0,93% ao ano logo depois da compra, e nem um corte de 99% chega perto de zero em 2100. Como o `§2.7` dá vitória por "emissões líquidas ≈ 0", **a vitória que o próprio GDD define só existe na leitura de taxa.** É também a leitura em que comprar cedo vale mais que comprar tarde, que é a mensagem do ODS 13 virando mecânica em vez de texto de tutorial.
- **O que a partida virou.** Um jogador de referência — compra sempre que pode, paga primeiro o que gera PAC, depois o mais barato:

  ```
  temperatura em 2100 .... 2,495 °C   (sem comprar nada: 3,355)
  emissões em 2100 ....... 13,58 Gt/ano   (começou em 40,753)
  CO₂ acumulado .......... 2500 Gt   (sem comprar nada: 4411)
  nós comprados .......... 16/20, com 8 PAC sobrando
  ```

  A primeira compra sai em 2029 e a última em 2099. Os quatro nós que ficam de fora são exatamente os capstones caros de Transporte, Natureza, Indústria e Sociedade — o corte de escopo dói no lugar certo.
- **O orçamento caiu no alvo do `P3-04` sem eu forçar.** Custos de 40 / 70 / 140 PAC por nível dão 1600 PAC de árvore contra os 750 que a partida entrega de base; com o PAC extra do ramo Sociedade, o jogador fecha em **65% da árvore — faltando 35%**, que é exatamente o aceite escrito no `PLANO.md`. Tem teste travando os dois números.
- **A validação ficou dividida entre dois lugares, de propósito.** O `parseSkills` recusa só o que torna o arquivo **inutilizável**: id repetido, ramo desconhecido, efeito malformado, pré-requisito inexistente, ciclo. As invariantes de **desenho** — 20 nós, 4 por ramo, custo total, corte total — foram para o `skills.test.ts`. Se o `[D-Historia]` acrescentar um nó, o jogo tem que carregar; o que deve falhar é o teste, avisando que uma decisão de escopo acabou de acontecer. Um parser rigoroso demais quebraria o jogo na feira por causa de uma vírgula de escopo.
- **Os cinco `Effect` se dividem em dois grupos, e essa é a decisão central do `skills.ts`.** `support`, `resilience` e `inertiaCut` valem **na hora da compra** — empurrão único que entra no estado. `emissionCut` e `pointsPerYear` são **contínuos** e não são gravados em lugar nenhum: saem de `unlockedSkills` a cada tick. Guardá-los duplicaria informação que já está na lista de compras, e o save/load do `P6-07` teria dois lugares para errar.
- **Conferi que os testes pegam — quatorze defeitos plantados nas três levas.** Os que interessam:
  - Bastar **um** pré-requisito em vez de todos → 1 teste. Checar dinheiro antes de pré-requisito → 1. Compra sem cobrar PAC → 1, que virou **2** depois de eu acrescentar `compras sucessivas drenam o PAC até travar`: cobrar o custo uma vez é fácil de acertar por acidente, e o que prova a cobrança é a terceira compra não acontecer.
  - Crescimento ignorando o corte → 4. Corte aplicado antes de o mês emitir → 4. PAC de volta à taxa fixa → 2.
  - **Um defeito passou em todos os 108 testes:** corte mensal como `taxa / 12` em vez da raiz de ordem 12. É exatamente o erro que o `P6-02` cobriu do lado do *crescimento* e que eu deixei descoberto do lado do *corte* — o mesmo bug, na função irmã, invisível. Acrescentei `doze ticks de corte compõem exatamente a taxa anual`, que compara duas partidas idênticas com e sem uma habilidade para isolar o corte do crescimento. Com ele, o defeito cai.
- **Os 20 fatos têm fonte de verdade, cada uma verificada antes de eu escrever a frase.** IRENA (solar, eólica), BloombergNEF (bateria), IEA (rede, carros elétricos, prédios, aço, cimento, eficiência), FAO (floresta), Donato *et al.* 2011 na Nature Geoscience (manguezal), IPCC SRCCL (alimentos), UNEP/IRP (economia circular), UNESCO (educação), NOAA (Protocolo de Montreal), WMO (alerta precoce), Reimann *et al.* 2021 na ESSD (costa), Brand *et al.* 2021 via Oxford (bicicleta). O oceano reaproveita o `[GCB25]` que já estava na tabela primária.
  - **A tabela de fatos do `CIENCIA.md` é gerada a partir do `skills.json`**, não digitada — os dois não têm como divergir em silêncio.
  - **Separei fonte de balanceamento com todas as letras.** Nenhum fato alimenta número da simulação: o corte de 0,5% ao ano da solar **não** sai do IRENA, é número de desenho. Misturar os dois daria aparência de ciência a uma escolha de jogo, que é o oposto do que a regra 9 quer.
- **Como verificar:**
  ```bash
  npm run typecheck && npm run test && npm run lint && npm run build && npm run format:check
  ```
  109 testes em 5 arquivos. O aceite é `ACEITE: um jogador que compra sempre que pode termina abaixo dos 3 °C` — o espelho exato do aceite do `P6-02`, que exige o contrário para quem não compra nada. Os dois juntos são a prova de que a árvore importa.
- **Pendente:**
  - **A medalha de Ouro é inalcançável, e não consertei.** Com `startTemperature` em 1,37 °C sobram 0,13 °C até o limiar de 1,5 do `§2.7` — 289 GtCO₂ para 75 anos, contra as 40,8 Gt/ano de onde a partida começa. Nem a árvore inteira comprada no primeiro mês chega lá: o melhor caso do modelo é 1,79 °C. As saídas são todas de desenho (`P3-03` com `P3-04`) e estão escritas no `docs/BALANCEAMENTO.md`.
  - **O Bronze sai por cinco milésimos.** 2,495 °C contra o limiar de 2,5. Isso não é margem desenhada, é coincidência: qualquer ajuste de custo ou de corte joga a jogada de referência para o outro lado. Vale saber antes do primeiro playtest.
  - **A última compra acontece em 2099** e não muda nada — o PAC continua entrando depois de a árvore não caber mais no tempo restante. É sintoma de que a economia tardia não tem para onde ir; é assunto do `P3-04`.
  - **O apoio termina no piso, em 25.** O ramo Sociedade empurra para cima e o desgaste do tempo puxa de volta. Hoje isso é inofensivo; quando os eventos (`P7-01`) e A Inércia (`P7-03`) começarem a furar o piso, essa folga some.
  - **O alvo regional do `Effect` não tem teste.** O tipo permite `target: RegionId | 'global'`, os 20 nós usam só `global`, e os ramos regionais do `emissionCutFor` e do empurrão de apoio compilam sem nenhum teste passar por eles. Não há como injetar uma habilidade regional sem abrir uma costura artificial no módulo. Quando o primeiro nó regional aparecer — `P7-04` é o candidato — é ali que esses caminhos ganham cobertura.
  - **O `P3-04` continua aberto.** Só o orçamento foi medido; a economia de PAC inteira (curva de entrada, custo por década, o que fazer com a sobra) é a tarefa.
  - **A Parte 5 está em zero e agora é o caminho crítico.** Não existe uma linha em `src/ui/`. O engine roda uma partida completa e vencível, e ninguém consegue jogá-la: sem HUD, sem mapa, sem botão de comprar. O marco `M2` (`P6-08`) pede "engine ligado à UI" — o que falta para o marco não é engine.
- **Evidência:** —

---

## 2026-08-18 — Três pendências fechadas: GDD em dia, piso de apatia e nomes em inglês

- **Parte / tarefa:** nenhuma nova do `PLANO.md` — são as três pendências que o `P6-02`, o `P6-03` e o `P6-04` deixaram anotadas, cobradas antes de abrir o `P6-05`.
- **Três commits, não um.** Renomeação mecânica misturada com mecânica nova é o tipo de diff que ninguém revisa de verdade. A ordem também foi escolhida: o piso **antes** da renomeação, para que os nomes novos atravessassem uma suíte que já cobria o comportamento novo — assim, um teste que quebrasse na leva 3 seria prova de erro de renomeação, e não de mecânica.
  1. `docs(gdd)` — o `§4` ganhou `realSecondsPerTick` e `supportFloor`.
  2. `feat(engine)` — o piso de apatia, com 7 testes novos.
  3. `refactor` — 365 identificadores para inglês, em 5 arquivos.
- **O `§4` estava desatualizado desde o `P6-04`.** O `realSecondsPerTick` vivia só no `balance.json`. Agora os dois lados têm as mesmas **14 chaves, na mesma ordem, com os mesmos valores** — conferido por script que lê o bloco `jsonc` do GDD e o JSON de verdade. O `supportFloor` entrou junto, um commit antes de existir no código: o GDD é o documento de design, e design vir antes da implementação é a ordem certa.
- **O piso de apatia, e a bomba-relógio que ele desarma.** O `supportDecayPerYear: 1.5` existia desde o primeiro dia **sem regra de aplicação**. Aplicá-lo do jeito óbvio dava isto: apoio começa em 50, cai 1,5 ao ano e **zera no tick 400 — ano de 2058**. Como o `§2.7` dá derrota por apoio médio zero, toda partida se perderia ali, fizesse o jogador o que fizesse. A saída escolhida foi um piso: o desgaste do tempo desce até `supportFloor: 25`, encosta nele em **2041** (tick 200) e para. Derrota por apoio deixa de ser automática e passa a exigir evento (`P7-01`) ou Inércia (`P7-03`).
  - **As duas alternativas descartadas, e por quê.** Amarrar o decaimento à Inércia (`decay × inertia/100`) é o que o `§2.6` descreve, mas hoje `inertia` é 0 e nada aplica o `inertiaGrowthPerYear` — daria duas constantes paradas em vez de uma. Zerar o `supportDecayPerYear` era honesto e menor, mas deixava o apoio congelado até a Parte 7.
- **O detalhe que quase virou bug.** A forma óbvia é `Math.max(piso, apoio - desgaste)` e pronto. Só que isso transforma o piso num **valor de repouso**: uma região derrubada a 10 por um evento seria *promovida* de volta a 25 no mês seguinte — o desgaste do tempo consertando o dano do evento. Por isso a guarda `if (support <= supportFloor) return support` vem antes do `Math.max`. Tem teste com uma região em 10 e outra exatamente em 25.
- **Conferi que os testes pegam.** Quatro defeitos plantados, um de cada vez: sem piso nenhum → **3 testes**; piso como valor de repouso → **1**; taxa anual cobrada todo mês → **2**; desgaste aplicado ao mapa de regiões velho, antes do clima → **2**. Todos revertidos.
  - **O terceiro derrubava só 1 na primeira rodada, e o motivo era estrutural:** o piso absorve o erro de taxa, então todos os outros testes seguiam coerentes consigo mesmos. Acrescentei o teste `encosta no piso em 2041` — o ano é fato de balanceamento, não conta derivada das constantes — e aí o defeito passou a derrubar 2. Mesmo tipo de furo que o `P6-03` achou, pela mesma razão.
- **A renomeação foi feita pela AST, não por regex — e isso não é preciosismo.** O `§11` manda identificadores em inglês e prosa em pt-BR. Um `s/estado/state/g` acertaria as variáveis **e destruiria a prosa**, porque "estado" aparece em quase todo comentário e em vários nomes de teste. A ferramenta usa o `typescript` que já está instalado: monta a AST, reescreve **só** nós `Identifier` e não enxerga comentário nem string. Depois, uma segunda passada extrai toda a prosa dos dois lados — comentários pelo scanner, strings e templates pela AST — e compara. **Prosa idêntica nos 5 arquivos, medida contra o `HEAD`.** Sem essa prova, "só renomeei" é promessa, não fato.
  - **Escopo:** no `src/`, o `state.ts` era o único arquivo fora da regra — `rng.ts`, `climate.ts` e `tick.ts` já estavam certos. Os 4 arquivos de teste estavam todos em pt-BR. Nomes de `describe`/`it`, comentários e mensagens de erro continuam em pt-BR, que é o que a regra manda.
  - O Prettier reformatou uma coisa sozinho: a lista de parâmetros do `assertRange` (ex-`assertFaixa`) voltou para uma linha só, porque os nomes mais curtos passaram a caber na largura. Está no diff.
- **Como verificar:**
  ```bash
  npm run typecheck && npm run test && npm run lint && npm run build && npm run format:check
  ```
  68 testes em 4 arquivos. O aceite do piso é o teste `ACEITE: 2058 deixa de decidir a partida sozinho`.
- **Pendente:**
  - **O `P3-05` continua aberto.** Só a fatia do `supportDecayPerYear` foi decidida aqui. Gatilhos, ações e contra-ataques da Inércia seguem por fazer — e o `inertiaGrowthPerYear` continua **inerte**: nada no engine faz a Inércia crescer.
  - **Ninguém verifica derrota.** O `§2.7` define derrota por temperatura acima de 3 °C **ou** apoio médio zero, e o engine não tem função que dê a partida por perdida — quem faz essa conta hoje são só os testes. É trabalho do `P6-08` com a Parte 7.
  - **`supportFloor: 25` é decisão de desenho, não número com fonte.** Está no `docs/BALANCEAMENTO.md` com resultado "não testado", junto do que observar no primeiro playtest.
  - **Entradas antigas deste diário citam `porId`, `faltando` e `regiao`**, nomes que não existem mais. Não foram editadas, pela regra de sempre: elas descrevem o que era verdade na data delas.
  - O `P6-05` está destravado e é o próximo da fila: `skills.ts` mais os 20 nós da árvore.
- **Evidência:** —

---

## 2026-08-18 — Relógio de tempo real: a partida anda igual em qualquer FPS

- **Parte / tarefa:** `P6-04` ✔
- **O que mudou:**
  - `src/engine/tick.ts` — ganhou a segunda metade: `Clock`, `createClock`, `stepsForElapsed` e `advanceRealTime`.
  - `tests/tick.test.ts` — 10 testes novos. Suíte total: **61**.
  - `src/data/balance.json` — constante nova: `realSecondsPerTick: 1.5`. O tipo `Balance` acompanhou.
- **Onde o relógio mora, e por quê não é um arquivo novo.** O `FORMA-DE-TRABALHO.md §3` lista os arquivos do `engine/` e não prevê um `clock.ts`; criar arquivo fora da estrutura documentada é coisa de pedir antes. O `tick.ts` já se chama "avanço de tempo", que é exatamente o que um acumulador faz, então as duas metades ficaram juntas com uma divisória no cabeçalho. **Se crescer, extrair um `clock.ts` é o movimento natural — mas aí com o `§3` atualizado junto.**
- **O engine continua sem saber que existe uma tela.** Nem `stepsForElapsed` nem `advanceRealTime` conhecem `requestAnimationFrame`: quem mede o tempo do quadro é a UI, que passa o número para cá. É a regra de ouro da arquitetura do `§3` mantida no módulo que mais tentaria quebrá-la.
- **O ritmo: 1,5 segundo por mês de jogo.** Não foi escolha estética — é o ponto onde os dois alvos do `PLANO.md` se encontram: **22,5 min a 1x** (dentro da faixa de 20–30) e **5,6 min a 4x**, que entrega o Modo Feira (`P7-07`) quase de graça, sem precisar de um modo separado com regras próprias. Tem teste que trava as duas contas.
- **Teto de 12 passos por chamada, contra a espiral da morte.** Se a aba ficar dez minutos em segundo plano, o navegador entrega um quadro com 600 000 ms de uma vez. Sem teto, a simulação tentaria 400 ticks num quadro, travaria a página, e o quadro seguinte viria ainda mais atrasado. Com teto, ela descarta o atraso — a partida fica atrás do relógio de parede, que é o comportamento certo: voltar para a aba não deve adiantar vinte anos de jogo.
- **O aceite falhou na primeira tentativa, e o errado era o teste, não o código.** Eu tinha fixado o alvo em 60 000 ms de tempo real — que cai **exatamente** na fronteira do 40º tick. Ali um erro de ponto flutuante de 1,5 nanossegundo decide entre 39 e 40 ticks, e o teste vira refém do arredondamento em vez de medir o que interessa. Medi antes de mexer: **a 30 e a 144 FPS os dois davam 39**, ou seja, o aceite já passava; era a minha expectativa de 40 que estava errada. Refiz com 61 000 ms, fora de fronteira, e acrescentei um teste que declara a garantia honesta do acumulador — **o erro nunca passa de um tick**, e um mês de atraso num jogo de 1,5 s por mês é invisível.
  - O teste de velocidade tinha o mesmo tipo de erro meu: eu esperava `4x == 1x × 4`, o que é falso porque o `floor` de 1x descarta um resto que a corrida a 4x aproveita. O certo é comparar **4x por 10 s com 1x por 40 s**, que é o que ele faz agora.
- **Conferi que os testes pegam.** Três defeitos plantados: descartar o resto em vez de carregá-lo para o quadro seguinte derrubou **5 testes**, incluindo o aceite — que é o esperado, já que carregar o resto *é* o passo fixo; tirar o teto derrubou **1**; ignorar o multiplicador de velocidade derrubou **1**. Todos revertidos.
- **Como verificar:**
  ```bash
  npm run typecheck && npm run test && npm run lint && npm run build && npm run format:check
  ```
  61 testes em 4 arquivos. O aceite é o teste `ACEITE: a simulação avança igual a 30 e a 144 FPS`, que roda 1830 e 8784 quadros e exige estado final idêntico.
- **Pendente:**
  - **O `docs/GDD.md §4` não lista o `realSecondsPerTick`.** Mesma situação da constante anterior: o `§12` exige autorização e eu não a tinha para esta. É uma linha, e fica junto do resto quando você voltar.
  - **Ninguém chama o `advanceRealTime` ainda.** O laço de `requestAnimationFrame` é da UI, e a UI começa na Parte 5. Hoje o relógio existe, está testado, e está sem motorista.
  - Pausa e as velocidades 1x/2x/4x são o `P5-05`. O `speed` já é parâmetro; pausa é simplesmente não chamar.
- **Evidência:** —

---

## 2026-08-18 — O tempo passa: o tick de um mês

- **Parte / tarefa:** `P6-03` ✔
- **O que mudou:**
  - `src/engine/tick.ts` — implementado. `advanceTick` (o passo de um mês), mais `yearForTick`, `isOver` e a constante `TOTAL_TICKS`.
  - `tests/tick.test.ts` — 14 testes novos. Suíte total: **51**.
  - Nenhuma constante nova, nenhum dado novo, nenhuma edição no GDD. A tarefa é de orquestração.
- **O que um tick faz hoje:** avança `tick` e `year`, chama o `advanceClimate` do `P6-02` e acumula PAC (`basePointsPerYear` dividido por 12). É o loop do `docs/GDD.md §2.1` com as peças que já existem. Eventos (`P7-01`), Inércia (`P7-03`) e efeito de habilidade (`P6-05`) entram aqui quando chegarem — o arquivo diz isso no cabeçalho, para ninguém procurar noutro lugar.
- **A trava do fim da partida não é preciosismo.** Depois do tick 900, `advanceTick` devolve o estado recebido intacto. O motivo é o `P6-04`: o relógio de tempo real entrega vários ticks de uma vez quando um quadro demora, e sem a trava um engasgo de meio segundo empurraria a partida para além de 2100. Tem teste que roda 20 ticks depois do fim e exige estado idêntico.
- **Deixei duas coisas de fora de propósito:**
  - **O decaimento do apoio público.** A constante `supportDecayPerYear: 1.5` existe, mas o GDD não diz como ela se aplica — e a conta assusta: **apoio começa em 50, cai 1,5 por ano, zera em 2058.** Como o `§2.7` define derrota por apoio médio zero, aplicar isso sem mais nada faria toda partida ser perdida em 2058, faça o jogador o que fizer. Isso é decisão de desenho, não detalhe de implementação — é do `P3-05` com o `P3-04`, e não cabia eu resolver dentro de uma tarefa de orquestração de tempo.
  - **O `history`.** O `P6-01` deixou o `Snapshot` na forma mínima de propósito, escrito que quem define o que o gráfico final precisa é o `P7-06`. Preencher agora travaria um formato que pertence a outra tarefa.
- **Conferi que os testes pegam — e o exercício achou um furo meu.** Plantei quatro defeitos:
  1. Sem a trava do fim → **1 teste** falhou.
  2. Ano calculado a partir do tick antigo → **1 teste** falhou.
  3. PAC entrando à taxa anual a cada mês → **2 falharam**.
  4. Tick que esquece de avançar o clima → **2 falharam**.
  **O defeito 2 me incomodou por derrubar pouco**, e o motivo era meu: eu testava o ano no tick 25, que é meio de ano — e no meio do ano calcular a partir do tick antigo dá o mesmo resultado, então o erro de um tick passava batido. Acrescentei um teste na virada do ano (tick 11 e tick 12), que é o único lugar onde ele aparece. **Com ele, o defeito 2 passou a derrubar 2 testes.** É exatamente para isso que plantar defeito serve: não para confirmar que os testes passam, mas para descobrir o que eles não veem.
- **Amarração entre os dois módulos:** o `tick.test.ts` roda a partida inteira pelo `advanceTick` e exige chegar nos mesmos 3,3548 °C que o `climate.test.ts` trava rodando pelo `advanceClimate`. Se um dia os dois caminhos divergirem, alguém quebrou a ligação entre eles.
- **Como verificar:**
  ```bash
  npm run typecheck && npm run test && npm run lint && npm run build && npm run format:check
  ```
  51 testes em 4 arquivos.
- **Pendente:**
  - **Decisão sua, quando chegar no `P3-05`:** o que fazer com o `supportDecayPerYear`. Do jeito que a constante está, ela sozinha decide a partida em 2058.
  - **PAC entra fracionado** (0,833 por mês). É de propósito, para a barra encher continuamente em vez de saltar de ano em ano, mas quem for fazer o HUD (`P5-03`) precisa arredondar na exibição.
  - O `advanceTick` ainda não tem quem o chame: o relógio de tempo real é o `P6-04`, a próxima da fila.
- **Evidência:** —

---

## 2026-08-18 — O clima roda: não fazer nada agora perde o jogo

- **Parte / tarefa:** `P6-02` ✔
- **O que mudou:**
  - `src/engine/climate.ts` — implementado. Três exportações: `globalEmissions`, `temperatureFor` e `advanceClimate`, mais o `growEmissions` interno.
  - `tests/climate.test.ts` — 12 testes novos. Suíte total: **37**.
  - `src/data/balance.json` — constante nova: `baselineGrowthPerYear: 0.0093`. O tipo `Balance` em `state.ts` ganhou o campo.
  - `docs/CIENCIA.md` — a constante com fonte, uma quarta conferência e a seção do achado do `P3-01` reescrita: de problema em aberto para decisão registrada.
  - `docs/BALANCEAMENTO.md` — saiu do zero. As três primeiras linhas do histórico.
- **A decisão que a tarefa exigia antes da primeira linha de código: como as emissões crescem sem o jogador.** O `P3-01` tinha achado o furo — emissão constante terminava em 2,75 °C, abaixo dos 3 °C de derrota, e dava para vencer o jogo dormindo. Escolhemos **0,93% ao ano**, que não é chute: é exatamente a taxa que **dobra** as emissões até 2100, que é como o IPCC AR6 descreve o **SSP3-7.0**, o cenário de mundo sem política climática nova. Resultado: **3,35 °C em 2100**, e o jogador passivo cruza os 3 °C em **2089**.
- **A conferência que me deixou confortável com o número.** O AR6 dá **3,6 °C** de melhor estimativa para o SSP3-7.0. O jogo dá **3,35 °C** para a mesma trajetória de emissões. Os 0,25 °C de diferença apontam para o lado que o limite 4 do `CIENCIA.md` já previa — o jogo não simula metano nem os outros gases. **Um modelo que erra na direção certa, pelo motivo já documentado, é um modelo que se entende.** Se tivesse dado 3,9 °C, aí sim haveria algo errado.
- **Duas coisas que a decisão deliberadamente não fez, e o porquê:**
  - **Não usou a Inércia como motor da linha de base.** Ela age por cima do crescimento (`P7-03`), não no lugar dele. Se o antagonista fosse a única fonte de crescimento, o `climate.ts` dependeria de um módulo que ainda não existe e o aceite desta tarefa seria impossível de verificar hoje.
  - **Não mexeu no `loseTemperature`.** Baixar o limiar até a conta fechar seria ajustar a ficção ao número.
- **Detalhe de implementação que evita um erro que só apareceria no fim da partida:** o crescimento por tick é a **raiz de ordem 12** da taxa anual, não `taxa / 12`. As duas parecem iguais e não são — a segunda faz doze meses somarem um pouco mais que um ano, e o resto se acumula por 900 ticks. Tem teste só para isso.
- **A ordem dentro do tick também é decisão, não acaso:** a emissão do mês entra com a taxa vigente **antes** de a taxa crescer. Inverter adiantaria um mês de crescimento e faria a partida terminar mais quente do que a fonte descreve. Também tem teste.
- **Conferi que os testes pegam.** Plantei três defeitos, um de cada vez:
  1. Crescimento `taxa / 12` em vez da raiz → **3 testes falharam**, incluindo o dos valores de referência.
  2. Crescer antes de acumular → **2 falharam**.
  3. `baselineGrowthPerYear` de volta a zero, que é o furo original → **4 falharam**, entre eles o do aceite.
  Nenhum defeito derrubou a suíte inteira, que é o ponto: os testes discriminam, não estão só acoplados uns aos outros. Todos revertidos.
- **Valores de referência travados**, no mesmo espírito dos do `rng.ts`: 4410,6 GtCO₂ acumulados e 3,3548 °C em 2100. Sem eles, uma refatoração muda a curva do jogo inteiro e todos os outros testes continuam verdes, porque cada um segue coerente consigo mesmo.
- **Como verificar:**
  ```bash
  npm run typecheck && npm run test && npm run lint && npm run build && npm run format:check
  ```
  37 testes em 3 arquivos. O aceite da tarefa é o bloco `a partida inteira sem nenhuma habilidade`, que roda os 900 ticks e exige terminar acima de 3 °C.
- **Pendente:**
  - ~~O `docs/GDD.md §4` não lista o `baselineGrowthPerYear`.~~ **Resolvido logo depois, na mesma sessão, com autorização.** A chave entrou no bloco do `§4` e ganhou um parágrafo explicando que a linha de base é o SSP3-7.0 e que A Inércia age por cima dela. Conferido por script: os dois lados têm as mesmas 12 chaves, na mesma ordem, com os mesmos valores.
  - **`climate.ts` não mexe em `tick`, `year` nem `history`.** É de propósito: quem orquestra a passagem do mês é o `P6-03`, e quem alimenta o gráfico final é o `P7-06`. O `advanceClimate` faz só a parte de carbono.
  - **Nenhuma habilidade abate emissões ainda**, porque `skills.ts` é `P6-05`. Hoje o `emissionCut` existe como tipo e não como efeito — a curva de 3,35 °C é, por enquanto, a única curva possível.
  - **Convenção de nomes divergindo:** o `§11` manda nomes de variáveis em inglês, mas o `state.ts` do `P6-01` usa português nos locais (`porId`, `faltando`, `regiao`). Escrevi o `climate.ts` seguindo a regra escrita. **Vale decidir qual das duas vale antes que o terceiro módulo entre e a mistura fique cara.**
- **Evidência:** —

---

## 2026-08-18 — Marco M1 fechado

- **Parte / tarefa:** `SETUP-07` ✔ · `P4-06` **M1** ✔
- **O que mudou:** só os checkboxes do `PLANO.md`. Nenhum arquivo do projeto foi tocado — o trabalho dessas duas linhas já estava feito; faltava a verificação.
- **O aceite do `SETUP-07` era observação, não trabalho, e agora tem evidência.** Ele pedia duas coisas que só o tempo podia provar:
  1. **"Um commit de teste sai sem trailer de IA."** Desde que o hook entrou (`7c1fe05`), saíram **4 commits**: `44e699c`, `8011fbd`, `50168af` e `f6b65af`. Nenhum tem trailer. Varri também o histórico inteiro procurando `Co-Authored-By: Claude`, `Generated with [Claude Code]` e o emoji de robô: **zero ocorrências em todo o repositório.**
  2. **"O agente recusa `git commit`."** As três camadas estão ativas: `includeCoAuthoredBy: false` e **14 regras de `deny`** no `.claude/settings.json`, o `.githooks/commit-msg` executável (`-rwxr-xr-x`) e o `core.hooksPath` apontando para `.githooks`. Não testei rodando `git commit` — tentar já é proibido pelo `§12`, e a prova pedida é o resultado dos commits acima, não uma simulação.
- **O que o M1 entrega, de fato:** repositório com regras escritas, CI que roda os 5 comandos em todo push, deploy automático e **uma tela pública no ar** em <https://blafxd.github.io/Jogo-do-bem-no-Estilo-Plague-INC/>. O engine já tem RNG semeado, tipos do domínio, estado inicial e dados climáticos com fonte. 25 testes.
- **Definition of Done do `§11`, item a item, sem maquiar:** typecheck, test e build passando ✔ · deploy no Pages atualizado ✔ · entrada no `PROGRESSO.md` ✔ · nenhum `TODO` sem dono ✔ · print em `docs/evidencias/` ✔. **Marco fechado com o DoD inteiro cumprido.**
- **O print quase entrou errado, e isso vale mais registrado do que escondido.** A primeira captura foi da própria página no ar — e saiu **byte a byte idêntica** à evidência do `SETUP-02` de 2026-08-07: mesmo SHA-256, mesmos 12.986 bytes. Faz sentido, é o mesmo HTML estático no mesmo viewport, e a ferramenta captura só o conteúdo da página, sem barra de endereço. **Só que isso a torna inútil como prova de deploy: um print do `localhost` sairia igualzinho.** Troquei pela tela de _Deployments_ do GitHub, que mostra o ambiente `github-pages` ativo, a URL pública escrita na página e o histórico das execuções que falhavam virando sucesso.
- **Detalhe cosmético, para não virar mistério depois:** o commit `50168af` ficou com um espaço sobrando no começo da mensagem. Não é o hook — ele só remove linhas, não mexe em espaço. Foi a mensagem que entrou assim. Fica como está: consertar exigiria reescrever histórico já publicado, o que é bem pior que a falha.
- **Como verificar:**
  ```bash
  grep -nE "^- \[.\] \`(SETUP-0[1-7]|P4-06)\`" PLANO.md    # os 8 com [x]
  git log --all --format='%B' | grep -icE "co-authored-by: claude|generated with \[claude"   # 0
  git config core.hooksPath                                # .githooks
  ```
- **Pendente:**
  - **A próxima tarefa é `P6-02`, e ela já nasce com um requisito herdado:** decidir como as emissões crescem na linha de base. Está escrito em `docs/CIENCIA.md`, na seção do achado — sem isso, não fazer nada não perde o jogo.
  - As actions do `ci.yml` seguem com aviso de Node 20 depreciado. Aviso hoje, quebra amanhã.
- **Evidência:** `docs/evidencias/2026-08-18-m1-pages-no-ar.jpg` — tela de _Deployments_ do repositório, com a URL pública e o deploy ativo.

---

## 2026-08-18 — Pages no ar: o repositório virou público e o deploy passou

- **Parte / tarefa:** `SETUP-04` ✔
- **O que mudou:** nada no código. As mudanças foram na configuração do repositório no GitHub.
  - **Repositório de privado para público**, com sua autorização.
  - **GitHub Pages habilitado** com `build_type: workflow` (a fonte é o Actions, não uma branch `gh-pages`) e HTTPS obrigatório.
  - Execução do `ci.yml` disparada pelo botão (`workflow_dispatch`) para republicar sem precisar de commit novo.
  - `PLANO.md` — `SETUP-04` marcado.
- **A causa real da falha não era o workflow, e vale registrar para não caçar no lugar errado de novo.** Por 5 execuções o job `publicar` falhou com `404 — Ensure GitHub Pages has been enabled`, o que parece configuração faltando. Ao tentar habilitar pela API, a resposta foi outra: `Your current plan does not support GitHub Pages for this repository` (HTTP 422). **No plano gratuito do GitHub, o Pages só funciona em repositório público.** O 404 era sintoma; a causa era o repositório ser privado. Nenhuma linha do `ci.yml` precisou mudar.
- **Varredura antes de tornar público.** Tornar público é irreversível na prática — o que sai, sai. Antes disso conferi: nenhum arquivo `.env`, nenhuma chave, nenhum token no conteúdo versionado, licença MIT já no lugar. O único dado pessoal exposto é o e-mail dos commits, que é o mesmo que já aparecia no perfil. **Se incomodar, dá para trocar por um endereço `noreply` do GitHub nos commits futuros.**
- **O aceite foi verificado de verdade, não de olho na aba verde.** A página responde `200`, entrega o HTML certo (`<title>Ponto de Virada</title>`) e o bundle referenciado carrega: `assets/index-BJNT7GbZ.js`, `200`, 818 bytes — o mesmo hash e o mesmo tamanho do build local. Isso prova de quebra que o `base: './'` do `vite.config.ts` resolve certo no subcaminho do Pages, que era a aposta feita lá no `SETUP-02`.
- **URL pública:** <https://blafxd.github.io/Jogo-do-bem-no-Estilo-Plague-INC/>
- **Como verificar:**
  ```bash
  gh run list --workflow=ci.yml --limit 1          # verificar e publicar, os dois verdes
  curl -sS -o /dev/null -w "%{http_code}\n" https://blafxd.github.io/Jogo-do-bem-no-Estilo-Plague-INC/
  ```
- **Pendente:**
  - **As actions do `ci.yml` estão ficando velhas.** O GitHub avisa em toda execução que `checkout@v4`, `setup-node@v4` e `upload-pages-artifact@v3` miram Node 20 e estão sendo forçadas a rodar no Node 24. Hoje é só aviso; quando virar erro, quebra o deploy. Subir os majors é tarefa de meia hora que não vale a pena fazer na véspera da feira.
  - **`SETUP-07` é a única coisa entre aqui e o marco M1** (`P4-06`). O aceite dele já está cumprido: os três últimos commits saíram sem trailer de IA, com `core.hooksPath` ativo. Falta só trocar o `[~]` por `[x]`.
  - Repositório público significa que `PLANO.md`, `PROGRESSO.md` e o `docs/GDD.md` estão legíveis por qualquer pessoa. É bom para a defesa do projeto e para o QR code do estande (`P8-06`), mas convém lembrar disso antes de escrever qualquer coisa aqui.
- **Evidência:** — (a URL pública é a própria evidência; um print dela cabe no `docs/evidencias/`)

---

## 2026-08-18 — `rngState` confirmado no contrato do GDD

- **Parte / tarefa:** `P6-01` — pendência fechada
- **O que mudou:**
  - `docs/GDD.md §3` — `rngState: number` entrou no `GameState`, ao lado de `seed`, cada um com o seu papel escrito na própria linha. A nota do RNG no fim da seção passou a dizer **por que** são dois campos e não um.
  - `src/engine/state.ts` — só comentário: o campo deixou de ser "um campo a mais em relação ao GDD" e passou a apontar para o contrato que agora o prevê.
- **O que a confirmação destrava:** o `P6-07` (save e load em `localStorage`) pode ser escrito sem decidir nada antes. Com um campo só, ou o save perderia a identidade da partida, ou recarregar reiniciaria o sorteio do zero — que é exatamente o bug que o RNG semeado existe para evitar.
- **Nenhuma linha de código mudou.** `RngState` já era `number` no `rng.ts` e o campo já existia no `GameState` desde o `P6-01`. O que faltava era o contrato reconhecer o que a implementação já fazia — e é essa distância entre documento e código que apodrece calada.
- **Como verificar:**
  ```bash
  grep -n "rngState" docs/GDD.md src/engine/state.ts
  npm run typecheck && npm run test && npm run lint && npm run build && npm run format:check
  ```
  O `GameState` do `docs/GDD.md §3` e o do `src/engine/state.ts` voltaram a ter exatamente os mesmos 12 campos.
- **Pendente:** nada desta decisão.
- **Evidência:** —

---

## 2026-08-18 — Dados climáticos com fonte: as 8 regiões saíram do zero

- **Parte / tarefa:** `P3-01` ✔
- **O que mudou:**
  - `docs/CIENCIA.md` — reescrito. Tabela de fontes primárias, as constantes de `balance.json` com origem, os dados das 8 regiões, o mapa de agregação país a país, três conferências e sete limites assumidos.
  - `src/data/regions.json` — `population`, `emissions` e `cleanShare` preenchidos nas 8 regiões. Eram zero desde o `P6-01`.
  - `src/data/balance.json` — `startTemperature` 1,3 → **1,37**; `startEmissions` 41 → **40,753**. `tcre` ficou em 0,00045: era o único valor que já estava certo.
  - `docs/GDD.md` — 4 linhas, **com autorização no chat** (o `§12` proíbe sem pedir): os dois valores do `§4` e, no `§3`, a unidade de `emissions` e a definição de `cleanShare`.
  - `src/engine/state.ts` — só comentário: as mesmas duas unidades, mais um ponteiro para o `CIENCIA.md` em cada uma.
  - `tests/state.test.ts` — 2 testes novos. Suíte total: 25.
- **De onde vieram os números.** TCRE do IPCC AR6 (0,45 °C por 1000 GtCO₂); aquecimento de origem humana em 2025 do Indicators of Global Climate Change 2025 (1,37 °C); emissões e população por país do Global Carbon Budget e da ONU, energia do Ember e do Energy Institute, ambos via Our World in Data. Todos com link e data de consulta no `CIENCIA.md`.
- **As 8 macrorregiões não existem em fonte nenhuma — precisei montá-las.** Agreguei 197 países usando as sub-regiões da ONU (M49) como recorte, com 4 exceções que mudam número e estão todas escritas: Sudeste Asiático entra na Ásia Oriental, Ásia Central entra no Oriente Médio, o Irã sai da Ásia Meridional para o Oriente Médio, e Taiwan (que o M49 não lista) entra na Ásia Oriental. O `CIENCIA.md` traz o procedimento inteiro — **qualquer pessoa com os mesmos CSVs chega nos mesmos números.** Isso importa: é o que faz a tabela ser defensável se alguém perguntar na apresentação.
- **Troquei a definição de `cleanShare`, e essa foi a decisão mais importante do dia.** O `GDD §3` dizia "fração da matriz energética". Fui atrás e a série de energia primária limpa por país só existe para **4 dos 56 países africanos** — somar dá 0,028 para a África, quando a própria fonte publica 0,095 para o continente. Errado por mais de 3x, justamente na região que o jogo quer mostrar. A série de **eletricidade** cobre 44 países africanos e fecha com o total mundial. Com sua autorização, `cleanShare` passou a ser a fatia limpa da **matriz elétrica**. De quebra casa melhor com o ramo Energia da árvore, que é todo intervenção em eletricidade (solar, eólica, bateria, rede).
- **Três conferências, porque erro de agregação vira mecânica errada e ninguém percebe:**
  1. A fatia limpa de eletricidade somando os 197 países dá **39,4%** — idêntico ao total mundial publicado. Se estivesse perdendo país, cairia.
  2. Soma nacional de CO₂ fóssil (36,667 Gt) + aviação e navegação internacionais (1,125 Gt) = 37,792 Gt, **exatamente** a linha `World` da fonte.
  3. A fórmula do `§4` com emissão constante dá **2,75 °C em 2100**; o UNEP projeta **2,8 °C** para o cenário de políticas atuais. Um modelo de uma linha errar por 0,05 °C é a evidência mais forte de que `tcre` e as emissões estão certos.
- **O achado que muda o `P6-02`: com os números certos, não fazer nada não perde o jogo.** 2,75 °C em 2100 está **abaixo** dos 3,0 °C de `loseTemperature` — dá para deixar o tempo correr até o fim sem comprar nada e sobreviver. Não é bug do modelo, é o modelo acertando: catástrofe depende de as emissões **crescerem**, e quem faz isso no jogo é A Inércia. **Consequência prática: a linha de base do `P6-02` não pode ser emissão constante, ou o antagonista deixa de ser tempero e vira requisito da condição de derrota.** Para referência: chegar a 3,0 °C exige média de 48,3 GtCO₂/ano, ~19% acima do valor de partida. Está escrito no `CIENCIA.md`, endereçado a `P6-02` e `P3-05`.
- **`startEmissions` agora é a soma das 8 regiões, por construção.** Não é coincidência nem arredondamento: se alguém editar uma região sem refazer a soma, o global e o regional passam a discordar e a simulação de clima fica errada em silêncio. É por isso que um dos testes novos trava exatamente essa igualdade.
- **Conferi que os testes novos pegam.** Plantei os dois defeitos que eles existem para impedir — zerei o `emissions` da Oceania e voltei o `startEmissions` para 41. **Os 2 falharam e os outros 23 continuaram verdes.** Defeitos revertidos.
- **Como verificar:**
  ```bash
  npm run typecheck && npm run test && npm run lint && npm run build && npm run format:check
  ```
  25 testes em 2 arquivos. Para conferir a conta central sem abrir o código:
  ```bash
  node -e "const b=require('./src/data/balance.json'),r=require('./src/data/regions.json');const s=r.reduce((a,x)=>a+x.emissions,0);console.log('soma das regioes:',s.toFixed(3),'| 2100 sem habilidade:',(b.startTemperature+b.tcre*s*75).toFixed(2),'C')"
  ```
- **Pendente:**
  - **`P6-02` está destravado, mas com um requisito novo:** decidir como as emissões crescem na linha de base. Não dá para escrever `climate.ts` fingindo que essa decisão não existe.
  - ~~A decisão do `rngState` continua aberta.~~ **Resolvida na mesma sessão, logo depois desta tarefa** — está na entrada acima.
  - **Dado de 2023 num jogo que começa em 2025.** É o último ano com quebra por país. Quando o Global Carbon Budget publicar 2025 por país, é refazer a agregação — o procedimento está escrito.
  - **Aviação e navegação internacionais (1,117 Gt) ficaram de fora** por não serem atribuídas a país nenhum. O jogo emite 2,4% a menos que o mundo real de 2023.
  - `docs/BALANCEAMENTO.md` continua vazio. A primeira linha dele nasce quando o `P6-02` decidir o crescimento da linha de base.
- **Evidência:** —

---

## 2026-08-07 — Tipos do domínio e estado inicial da partida

- **Parte / tarefa:** `P6-01` ✔
- **O que mudou:**
  - `src/engine/state.ts` — todos os tipos do `docs/GDD.md §3` (`Region`, `Skill`, `Effect`, `ClimateEvent`, `GameState`), mais `createInitialState(seed)` e `parseRegions`.
  - `src/data/balance.json` — preenchido com os 11 valores do `docs/GDD.md §4`.
  - `src/data/regions.json` — as 8 macrorregiões, com nome e id.
  - `tests/state.test.ts` — 13 testes. Suíte total: 23.
  - `docs/CIENCIA.md` — registradas as constantes climáticas que entraram, todas marcadas como **sem fonte**.
- **Três tipos que o GDD cita mas não define, e que precisei desenhar:** `SkillId` (alias de `string`, porque as habilidades vêm de JSON e não dá para enumerar em tipo), `ActiveEvent` e `Snapshot`. Os dois últimos ficaram na forma mínima de propósito — quem define o ciclo de vida de um evento é `P7-01`, e quem define o que o gráfico final precisa é `P7-06`. Estão marcados assim no código.
- **Campo novo no `GameState`, que precisa da sua confirmação: `rngState`.** O `GDD §3` prevê só `seed: number`. Separei em dois:
  - `seed` — a seed original, nunca muda. É o que identifica a partida e permite repetir uma igual.
  - `rngState` — a posição atual do gerador, que anda a cada sorteio.
  - **Por que não dá para ser um campo só:** o `P6-07` vai salvar em `localStorage`. Se o mesmo número fizesse os dois papéis, ou o save perderia a identidade da partida, ou recarregar reiniciaria o sorteio do zero — que é justamente o bug que o RNG semeado existe para evitar. **Não editei o `docs/GDD.md`** (§12 proíbe sem pedir); a decisão está registrada no comentário do campo.
- **`parseRegions` valida o que o `tsc` não alcança.** O compilador garante o formato do JSON, mas não sabe que `support` vai de 0 a 100, que os 8 ids têm que estar presentes e sem repetição, nem que `"br"` não é uma região válida. Como `src/data/*.json` é exatamente o arquivo que o pacote `[D-Historia]` vai editar à mão sem abrir um `.ts`, o erro precisa apontar o campo errado — não estourar longe dali, no meio de um tick. Sete testes cobrem exatamente esses casos.
- **Limite importante do que foi entregue: `population`, `emissions` e `cleanShare` estão todos em zero nas 8 regiões.** Não é esquecimento — são dados do mundo real e a regra 9 proíbe inventá-los. **Enquanto estiverem zerados, a simulação de clima roda mas não produz resultado com significado.** Quem resolve é `P3-01`, com fonte. Registrado em `docs/CIENCIA.md`.
  - Mesmo problema, menor, nas constantes de `balance.json`: os valores vieram da redação do `GDD §4`, não de publicação consultada. São plausíveis, não verificados. Nenhum deles pode ser citado como fato no relatório ou na feira antes de `P3-01`.
- **Como verificar:**
  ```bash
  npm run test        # 2 arquivos, 23 testes
  npm run typecheck && npm run lint && npm run build && npm run format:check
  ```
- **Pendente:**
  - **Decisão sua:** confirmar (ou recusar) o `rngState` no `GDD §3`.
  - `P3-01` virou bloqueio real de `P6-02`: dá para escrever a fórmula do clima e testá-la com números sintéticos, mas não dá para verificar o aceite ("sem nenhuma habilidade, a partida termina acima de 3 °C") com emissões zeradas.
  - `skills.json` e `events.json` continuam vazios — são `P6-05` e `P7-01`.
- **Evidência:** —

---

## 2026-08-07 — Guardrails de git e remoção do teste de fumaça

- **Parte / tarefa:** `SETUP-07` (em andamento — falta uma observação, ver abaixo)
- **O que mudou:**
  - `tests/toolchain.test.ts` **apagado**, com autorização. Cumpriu o que prometia: existiu do `SETUP-03` ao `SETUP-06` só para o `npm run test` ter o que rodar. A suíte segue com 10 testes, todos do RNG.
  - `.claude/settings.json` **criado e versionado** — `includeCoAuthoredBy: false` e a lista de `deny` do `FORMA-DE-TRABALHO.md §4.1`. Versionado de propósito: quando o grupo entrar, a trava já vale para todo mundo sem ninguém configurar nada.
  - `.githooks/commit-msg` **criado**, executável, e `core.hooksPath` apontado para `.githooks`.
  - `.gitattributes` — regra nova, explicada abaixo.
- **Bug encontrado e corrigido antes de existir: o hook quebraria em qualquer máquina que clonasse o repositório.** O `core.autocrlf` está em `true` e o `.gitattributes` só tinha `* text=auto`. Com isso o checkout entregaria o `commit-msg` com CRLF, o shebang viraria `#!/bin/sh\r`, e o `sh` recusaria com "bad interpreter". **A falha é silenciosa** — o commit passa normalmente, só que sem trava nenhuma. E não apareceria aqui: o arquivo escrito localmente já nasceu com LF; o estrago só surgiria no `git clone` do colega. Corrigido com `.githooks/** text eol=lf`, e conferido com `git check-attr` (`eol: lf`).
- **Teste do hook, sem commitar.** Chamei o script direto com quatro arquivos de mensagem:
  1. Mensagem normal → intacta.
  2. `Co-Authored-By: Claude ...` → linha removida.
  3. `🤖 Generated with [Claude Code](...)` → linha removida.
  4. **Co-autor real + o da IA → o real ficou, só o da IA saiu.** É o caso que vai importar quando o grupo se formar e houver commit de duas pessoas.
- **A trava de `deny` foi demonstrada por acidente:** logo depois de criar o `settings.json`, um comando meu de limpeza com `rm -rf` foi **bloqueado** pela regra `Bash(rm -rf:*)`. Não estava planejado, mas é a evidência mais honesta de que a lista funciona.
- **Conferido que nada foi desativado:** `.git/hooks/` só tinha arquivos `.sample` (inativos), então apontar o `core.hooksPath` para `.githooks` não desligou nenhum hook em uso.
- **Como verificar:**
  ```bash
  git config core.hooksPath                       # .githooks
  git check-attr text eol -- .githooks/commit-msg # text: set, eol: lf
  ls -l .githooks/commit-msg                      # precisa estar executável (x)
  ```
- **Pendente:**
  - **`core.hooksPath` é por máquina e não é versionado.** Quem clonar o repositório precisa rodar `git config core.hooksPath .githooks` uma vez. Está escrito no `FORMA-DE-TRABALHO.md §4.1` e vai para o `README.md` de onboarding (`P4-04`).
  - **A tarefa fica `[~]` por um motivo específico:** o aceite tem duas partes que eu não posso verificar sem violar as próprias regras que acabei de instalar. Não testei `git commit` porque tentar já é proibido (§12), e não posso fazer o commit de teste. **Vira `[x]` no seu próximo commit** — se ele sair sem trailer de IA, está fechado. É observação, não trabalho.
- **Evidência:** —

---

## 2026-08-07 — RNG semeado (mulberry32) — primeiro código do engine

- **Parte / tarefa:** `SETUP-06` ✔
- **O que mudou:**
  - `src/engine/rng.ts` — implementado. Três exportações: `nextRandom` (passo puro), `mulberry32` (gerador com estado interno, a forma escrita no `docs/GDD.md §3`) e `createRngState` (normaliza a seed).
  - `tests/rng.test.ts` — 12 testes.
- **Decisão de desenho: o núcleo é um passo puro, não um closure.** A versão mais divulgada do mulberry32 devolve uma função que guarda o estado dentro dela. Isso não serve aqui por dois motivos:
  1. **§4 manda funções do engine serem puras.** Um closure com estado mutável dentro do `engine/` contraria a regra logo no primeiro arquivo.
  2. **`P6-07` vai salvar a partida no `localStorage`.** Closure não se serializa. Salvar no meio da partida e recarregar reiniciaria o sorteio do zero — a partida deixaria de ser reprodutível justamente no caso em que a reprodutibilidade importa.
  - `nextRandom(state)` devolve `{ value, state }` e não toca no que recebeu. O `mulberry32(seed)` do GDD continua existindo, implementado em cima dele, para uso local dentro de uma função. Está escrito no próprio arquivo que ele **não** deve ser usado em nada que precise ser salvo.
- **Detalhe de implementação que evita um bug lento:** o estado é mantido em 32 bits (`>>> 0`) em vez de deixar o acumulador crescer como ponto flutuante, que é como o código mais copiado do algoritmo faz. Deixar crescer funciona no começo e apodrece depois: passando de 2⁵³ o `number` perde precisão inteira e a sequência para de ser reprodutível. Numa partida de 900 ticks talvez nunca aparecesse — mas apareceria num teste longo, e o custo de fazer certo agora é zero.
- **Testes travam valores de referência, não só coerência interna.** `SEQUENCIA_SEED_42` guarda os 6 primeiros valores da seed 42, e outro teste guarda o estado após 3 passos da seed 2025. Isso é o que faz o determinismo valer **entre builds**: sem essas constantes, uma refatoração muda o gerador, todos os outros testes continuam verdes (a sequência segue igual a ela mesma) e toda partida salva muda em silêncio.
- **Verificação de que os testes realmente pegam:** alterei a constante do algoritmo de `0x6d2b79f5` para `0x6d2b79f6` de propósito e rodei. **Só os 2 testes de valor de referência falharam; os outros 10 passaram** — que é exatamente a demonstração de por que eles existem. Constante revertida em seguida.
- **Como verificar:**
  ```bash
  npm run test                # 2 arquivos, 12 testes
  npm run typecheck && npm run lint && npm run build && npm run format:check
  ```
  Números conferidos contra a referência pública do mulberry32 (seed 42 começa em `0.6011037519201636`) e distribuição sã: média `0,49925` em 200 mil sorteios.
- **Pendente:**
  - **`tests/toolchain.test.ts` deveria morrer agora.** O próprio arquivo diz que sai no `SETUP-06`. Não apaguei porque a regra 3 proíbe o agente apagar arquivo sem pedir — fica para a próxima sessão, ou some no mesmo commit se eu remover à mão.
  - Faltam auxiliares que os eventos vão precisar (sortear inteiro numa faixa, escolher item por peso). São escopo de `P7-01`, não deste `SETUP-06` — entram junto com quem os usa.
  - O `RngState` ainda não está no `GameState`; isso é `P6-01`.
- **Evidência:** —

---

## 2026-08-07 — Esqueleto de pastas do projeto

- **Parte / tarefa:** `SETUP-05` ✔
- **O que mudou:** criada a estrutura do `FORMA-DE-TRABALHO.md §3`, toda vazia.
  - `src/engine/` — `rng.ts`, `state.ts`, `climate.ts`, `tick.ts`, `skills.ts`, `events.ts`, `inertia.ts`
  - `src/data/` — `regions.json`, `skills.json`, `events.json`, `balance.json`
  - `src/ui/` — só um `.gitkeep`
  - `docs/` — `CIENCIA.md`, `CREDITOS.md`, `BALANCEAMENTO.md`
- **"Vazio" aqui não quer dizer arquivo em branco.** Cada `.ts` carrega um comentário com o que o módulo faz, onde está a especificação no `docs/GDD.md` e **qual tarefa do `PLANO.md` vai implementá-lo**. Isso atende o item do Definition of Done que proíbe `TODO` sem dono: todo arquivo em aberto tem um responsável escrito dentro dele. Sem isso, daqui a três semanas ninguém lembra se `inertia.ts` está vazio de propósito ou se foi esquecido.
- **Decisões pequenas que valem registro:**
  - Os `.json` levam `[]` e `{}` em vez de nada. Arquivo `.json` vazio é JSON inválido — o `npm run format:check` quebraria na hora.
  - `src/ui/.gitkeep` existe porque o git não versiona pasta vazia. Ele some quando o primeiro módulo de interface chegar (Parte 5).
  - **`balance.json` ficou como `{}` de propósito.** Os valores estão escritos no `docs/GDD.md §4`, mas preenchê-los é escopo de `P6-01`/`P6-02`, não deste `SETUP-05` — a tarefa pede estrutura, não conteúdo.
  - Os três documentos de `docs/` receberam **o formato de entrada**, não entradas. Cada um explica o que registrar e qual tarefa é dona dele (`P3-01` para o `CIENCIA.md`, `P3-02` e `P8-02` para o `BALANCEAMENTO.md`).
- **Como verificar:**
  ```bash
  npm run typecheck && npm run test && npm run lint && npm run build && npm run format:check
  ```
  Os arquivos só de comentário passam no `tsc` porque o `tsconfig.json` usa `moduleDetection: "force"` — sem isso, arquivo sem `import`/`export` não conta como módulo e o `isolatedModules` reclamaria.
- **Efeito colateral conferido: nenhum.** O bundle continua com 818 bytes e o mesmo hash de antes (`index-BJNT7GbZ.js`) — nada importa os arquivos novos ainda, então eles não entram no build.
- **Pendente:**
  - Nenhum dos arquivos criados tem implementação. Os primeiros a sair do zero são `rng.ts` (`SETUP-06`, próximo) e `state.ts` (`P6-01`).
  - `docs/CIENCIA.md` está com a seção do tsunami marcada como pendente, apontando para `P3-06`.
- **Evidência:** —

---

## 2026-08-07 — GitHub Actions: verificação em PR e deploy no Pages

- **Parte / tarefa:** `SETUP-04` (em andamento — **o aceite depende de um passo manual meu**, ver abaixo)
- **O que mudou:**
  - `.github/workflows/ci.yml` **criado** — um workflow, dois jobs.
    - **`verificar`** roda em *pull request* e em push na `main`: `npm ci`, depois `typecheck`, `test`, `lint`, `build` e `format:check`, nessa ordem. Ao final sobe `dist/` como artefato do Pages.
    - **`publicar`** roda só quando `verificar` passa (`needs: verificar`) **e** só na `main`. É o `needs` que impede a `main` de publicar código quebrado.
- **Decisões registradas:**
  - **Um arquivo, dois jobs** em vez de dois workflows. Evita buildar duas vezes: o artefato do Pages sai do mesmo job que já rodou os testes.
  - **`npm ci`, não `npm install`.** O `ci` instala exatamente o que está no `package-lock.json` e falha se o lock estiver desatualizado. É o que garante que a máquina da feira receba as versões testadas aqui.
  - **`node-version: '22'`** — casa com o `engines.node: ">=22.12.0"` do `package.json`. A máquina local está no 26, mas fixar o mínimo suportado é o que faz a CI pegar incompatibilidade cedo.
  - **A condição do `publicar` checa o ref, não só o tipo de evento.** Sem isso, o `workflow_dispatch` deixaria publicar a partir de qualquer branch pelo botão.
  - **`concurrency` com `cancel-in-progress`** — dois pushes seguidos não geram fila, e um deploy velho não sobrescreve um novo.
- **O que deu errado (fica registrado para não repetir):** rodei `npm ci` localmente para validar o lockfile e ele **falhou e apagou o `node_modules` no meio do caminho**. Não foi o lock: o Windows recusou a remoção de um binário nativo (`@rolldown/binding-win32-x64-msvc`) que ainda estava travado pelo build que havia acabado de rodar. Restaurei com `npm install` (109 pacotes, lockfile inalterado, todos os scripts verdes de novo).
  - **A lição:** para validar o lock no Windows, usar **`npm ci --dry-run`** — ele confere a sincronia entre `package.json` e `package-lock.json` sem encostar no disco. Rodou limpo (`up to date`), que é a prova que faltava de que a CI vai instalar sem erro.
- **Como verificar:**
  ```bash
  npx --yes js-yaml .github/workflows/ci.yml   # o YAML parseia e a estrutura confere
  npm ci --dry-run                             # lock em sincronia; NÃO usar `npm ci` puro aqui
  npm run typecheck && npm run test && npm run lint && npm run build
  ```
- **Pendente — o aceite ("URL pública abre") ainda não foi verificado, e não dá para verificar daqui:**
  1. **Passo manual, uma vez:** no GitHub, `Settings → Pages → Build and deployment → Source: GitHub Actions`. Enquanto isso não for feito, o job `publicar` falha com erro de ambiente.
  2. Depois: commitar e dar push na `main`, acompanhar a aba `Actions` e abrir a URL que o job `publicar` imprime.
  3. Só então `SETUP-04` vira `[x]`. Fica `[~]` até lá — mesmo critério usado no `SETUP-02`.
  - As versões das actions (`checkout@v4`, `setup-node@v4`, `upload-pages-artifact@v3`, `deploy-pages@v4`) foram escolhidas por serem majors estáveis, mas **não foram executadas de verdade nenhuma vez**. A primeira execução é o teste real.
- **Evidência:** —

---

## 2026-08-07 — Vitest, ESLint e Prettier; TypeScript rebaixado para 6.0.3

- **Parte / tarefa:** `SETUP-03` ✔
- **O risco do TypeScript 7 se materializou, e a saída registrada ontem foi usada.** O `typescript-eslint@8.66.0` declara `typescript: ">=4.8.4 <6.1.0"`; o projeto estava em `7.0.2`, fora da faixa. TypeScript rebaixado para **`~6.0.3`** (a última estável abaixo do teto). O `~` é deliberado: com `^`, o npm subiria para 6.1 e quebraria o par de novo.
  - **O que se perdeu:** o compilador nativo em Go do TS 7, que é bem mais rápido. Num projeto deste tamanho a diferença é irrelevante; lint com conhecimento de tipos vale mais.
  - **Quando revisitar:** quando o `typescript-eslint` anunciar suporte a TS 7. Aí é só soltar o pino.
  - `npm run typecheck` passou no TS 6.0.3 **sem uma única alteração de código** — todas as flags estritas do `tsconfig.json` (`erasableSyntaxOnly`, `exactOptionalPropertyTypes`, `noUncheckedIndexedAccess`, `verbatimModuleSyntax`) já existem na 6.0.
- **Instalado:** `vitest@4.1.10`, `eslint@10.8.0`, `typescript-eslint@8.66.0`, `prettier@3.9.6`, `eslint-config-prettier@10.1.8`, `@eslint/js`. Tudo já estava na lista permitida da `FORMA-DE-TRABALHO.md §2` — nenhuma dependência nova precisou de aprovação. 0 vulnerabilidades.
- **O que mudou:**
  - `eslint.config.js` — flat config. **O lint agora cobra as regras do projeto em vez de confiar na memória de quem revisa:** `no-console` (regra 6), `Math.random()` proibido com mensagem apontando para o RNG semeado (regra 7), `type` em vez de `interface` (§4), `@ts-ignore` barrado (regra 6) e — a mais importante — `no-restricted-imports` impedindo que `src/engine/**` importe de `ui/` (regra de ouro da arquitetura, §3).
  - `.prettierrc.json` — aspas simples, ponto e vírgula, vírgula final, 100 colunas, `endOfLine: lf` (casa com a normalização do `.gitattributes`).
  - `.prettierignore` — **ignora `*.md` de propósito.** Os documentos do projeto são formatados à mão, com tabelas alinhadas; uma passada do Prettier reflui tudo e gera um diff enorme sem ganho de legibilidade.
  - `vite.config.ts` — passa a importar `defineConfig` de `vitest/config` e ganha o bloco `test`. `environment: 'node'` de propósito: o engine é TS puro e não pode depender de DOM. Se a UI precisar de teste um dia, aí entra `jsdom` — e aí é dependência nova, com aprovação.
  - `tests/toolchain.test.ts` — teste de fumaça, 2 asserções.
  - `package.json` — scripts `test`, `test:watch`, `lint`, `lint:fix`, `format`, `format:check`.
- **Verificação do lint (o passo que costuma ser pulado):** regra que nunca dispara é regra que não existe. Criei um arquivo temporário em `src/engine/` violando as 5 regras de propósito e conferi que **todas as 5 dispararam**, com as mensagens certas. Arquivo apagado em seguida.
- **Como verificar:**
  ```bash
  npm run typecheck        # limpo
  npm run test             # 1 arquivo, 2 testes passando
  npm run lint             # limpo, exit 0
  npm run build            # gera dist/
  npm run format:check     # "All matched files use Prettier code style!"
  ```
- **Pendente:**
  - **`tests/toolchain.test.ts` tem dono e data de morte:** sai no `SETUP-06`, quando entrar o teste de determinismo do RNG. Está escrito dentro do próprio arquivo. Se sobreviver ao `SETUP-06`, foi esquecimento.
  - **Lint com conhecimento de tipos não foi ligado.** O `typescript-eslint` tem `recommendedTypeChecked`, que pega coisas que a versão sintática não pega (promessa não aguardada, comparação sempre falsa). Exige `parserOptions.projectService` e deixa o lint mais lento. Ficou de fora para não virar um buraco no meio do `SETUP-03`; vale uma tarefa própria depois do M1.
  - A regra 5 da `FORMA-DE-TRABALHO.md` (`typecheck && test && build`) agora pode ser cumprida **inteira** — era meia até hoje.
  - `SETUP-04` está destravado: a CI já tem os 4 comandos para rodar.
- **Evidência:** —

---

## 2026-08-07 — Regras divididas em `docs/GDD.md` e `FORMA-DE-TRABALHO.md`

- **Parte / tarefa:** nenhuma do `PLANO.md` — reorganização documental, decidida no chat
- **Motivo:** o `CLAUDE.md` acumulava duas coisas diferentes: *o que o jogo é* e *como se trabalha no repositório*. Quem entrasse no projeto para escrever narrativa ou desenhar ícone precisava atravessar regras de git para achar a descrição da árvore de habilidades. Separar também deixa o repositório com cara de projeto acadêmico — um GDD é um artefato reconhecível da disciplina.
- **O que mudou:**
  - `docs/GDD.md` **criado** — recebe §0 (Contexto), §6 (Design do jogo), §7 (Contratos de dados), §8 (Balanceamento), §9 (Acessibilidade), §10 (Roadmap), §13 (Entregas acadêmicas) e §14 (Decisões pendentes). **Conteúdo movido na íntegra, sem reescrita** — só mudou de arquivo e de número de seção.
  - `FORMA-DE-TRABALHO.md` **criado** — recebe §1 a §5, §11 e §12: regras do agente, stack, estrutura de pastas, convenções, git, fluxo e Definition of Done.
  - `CLAUDE.md` **reduzido a um ponteiro de 10 linhas** para os dois arquivos acima.
  - `PLANO.md`, `.gitignore`, `tsconfig.json`, `index.html` — referências atualizadas para os nomes novos.
- **Por que o `CLAUDE.md` não foi apagado:** é o nome que a ferramenta de agente carrega automaticamente no início de cada sessão. Um arquivo chamado `FORMA-DE-TRABALHO.md` não é lido sozinho. O ponteiro custa 10 linhas e evita ter que lembrar de mandar ler os dois arquivos toda vez. Se um dia for apagado, essa é a consequência a aceitar.
- **Decisão registrada — a numeração não foi refeita.** As seções que foram para a `FORMA-DE-TRABALHO.md` mantiveram os números originais, com lacunas (§1–5, depois §11–12). Havia referências a `§2`, `§3`, `§4.1` e `§5` em `PLANO.md`, `.gitignore`, `tsconfig.json` e `index.html`; renumerar quebraria todas por ganho estético. Com isso, só **uma** referência de seção precisou de conserto no projeto inteiro (`P3-06`, que virou `docs/GDD.md §2.5`).
- **Entradas antigas deste diário não foram editadas**, mesmo citando arquivos e seções que se moveram (ex.: `CLAUDE.md §14` na entrada de 2026-08-06). Elas descrevem o que era verdade naquela data — reescrever histórico é o que a regra "entrada reconstruída de memória vira ficção" tenta evitar. A tabela de equivalência no topo do `GDD.md` resolve a leitura. Pela mesma razão, `SETUP-01` no `PLANO.md` continua citando o `CLAUDE.md`: descreve uma tarefa já concluída.
- **Como verificar:**
  ```bash
  npm run typecheck && npm run build      # nenhum arquivo de código mudou de comportamento
  grep -rn "CLAUDE.md" --include="*.md" --include="*.json" --include="*.html" . | grep -v node_modules
  # só devem sobrar: o ponteiro, a tabela de equivalência do GDD, o diário e o SETUP-01
  ```
- **Pendente:**
  - `CLAUDE.md` continua no repositório e no histórico do GitHub — a mudança foi de conteúdo e nome, não de visibilidade.
  - `README.md` (`P4-04`) ainda não existe; quando existir, é ele que deve ser a porta de entrada do repositório, com o GDD logo atrás.
- **Evidência:** —

---

## 2026-08-07 — Dependências instaladas e aceite do scaffold verificado

- **Parte / tarefa:** `SETUP-02` ✔ (fechado)
- **O que mudou:**
  - `npm install` rodou pela primeira vez — 17 pacotes, 0 vulnerabilidades. `package-lock.json` gerado (versionado; não está no `.gitignore`).
  - `docs/evidencias/` criada com o primeiro print do projeto.
  - Nenhum arquivo de código foi tocado. O scaffold escrito em 2026-08-06 passou como estava.
- **Aceite verificado (o que estava pendente desde ontem):**
  - `npm run typecheck` — limpo, saída vazia, exit 0.
  - `npm run build` — `dist/index.html` 0,80 kB e `dist/assets/index-*.js` 0,81 kB, em 39 ms.
  - `npm run dev` — sobe em 189 ms; `http://localhost:5173/` responde **HTTP 200**.
  - **No navegador:** `#app` ganha `data-status="pronto"`, `document.title` = "Ponto de Virada", `lang` = `pt-BR`. Esta é a prova de que o módulo TypeScript executou — só o HTTP 200 não provava isso.
- **Bloqueio do OneDrive: resolvido.** O projeto está em `C:\Users\caiqu\Desktop\Programação\...`; o registro do Windows (`User Shell Folders\Desktop`) aponta para `C:\Users\caiqu\Desktop` sem redirecionamento, e `C:\Users\caiqu\OneDrive\Desktop` não existe. Caminho fora da sincronização — foi por isso que o `install` correu em 5 s e sem erro de lock.
- **Risco do TypeScript 7 não se materializou (ainda):** `tsc 7.0.2` + `vite 8.2.1` instalados e funcionando juntos. O atrito previsto era com o `typescript-eslint`, que só entra no `SETUP-03` — o risco continua aberto até lá.
- **Como verificar:**
  ```bash
  npm run typecheck        # sai limpo
  npm run build            # gera dist/
  npm run dev              # http://localhost:5173 — no DevTools, #app tem data-status="pronto"
  ```
- **Pendente:**
  - `SETUP-03`: sem Vitest, ESLint e Prettier. Os scripts `test` e `lint` **não existem** — ou seja, a regra 5 da `FORMA-DE-TRABALHO.md` (`typecheck && test && build`) só pode ser cumprida pela metade até isso entrar.
  - `SETUP-04` (CI e Pages), `SETUP-05` (estrutura de pastas), `SETUP-06` (`rng.ts`), `SETUP-07` (guardrails de git) — abertos. `.githooks/` e `.claude/settings.json` versionado ainda não existem; `core.hooksPath` não está configurado.
  - As Partes 1, 2 e 3 do backlog seguem intactas — inclusive o protótipo de papel (`P1-02/03`) e a planilha de balanceamento (`P3-02`).
  - O `package.json` ainda usa o codinome `ponto-de-virada` (`P1-04`).
- **Evidência:** `docs/evidencias/2026-08-07-setup-02-scaffold-no-ar.jpg`

---

## 2026-08-06 — Scaffold Vite + TypeScript strict (sem instalar dependências)

- **Parte / tarefa:** `SETUP-02` (em andamento — aceite não verificado)
- **O que mudou:**
  - `package.json` — Vite `^8.2.1` e TypeScript `^7.0.2`, scripts `dev` / `build` / `preview` / `typecheck`. `engines` fixa Node >= 22.12, que é o mínimo do Vite 8.
  - `tsconfig.json` — `strict` mais `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`, `noUnusedLocals/Parameters`, `verbatimModuleSyntax` e `erasableSyntaxOnly`. `resolveJsonModule` ligado porque `src/data/*.json` será importado direto (`CLAUDE.md §3`).
  - `vite.config.ts` — `base: './'`. Caminho relativo resolve o deploy no GitHub Pages (`SETUP-04`) e o build offline da feira (`P8-05`) de uma vez; vale enquanto o jogo for página única, sem rotas.
  - `index.html` — `lang="pt-BR"`, marcação provisória.
  - `src/main.ts` — só monta e marca `#app` com `data-status="pronto"`.
  - `src/vite-env.d.ts` — tipos do cliente Vite.
- **Decisão registrada:** `npm install` **não** foi rodado. A pasta ainda está dentro do OneDrive e instalar aqui despejaria dezenas de milhares de arquivos na sincronização — a instalação acontece depois do move, no destino.
- **Por que TypeScript 7:** é a versão `latest` estável no registro. É o compilador nativo reescrito em Go; se aparecer atrito com `typescript-eslint` no `SETUP-03`, a saída é fixar uma versão 6.x.
- **Como verificar (só depois do move):**
  ```bash
  npm install
  npm run typecheck        # precisa sair limpo
  npm run dev              # abre no navegador; #app com data-status="pronto"
  npm run build            # gera dist/; abrir dist/index.html direto do disco também funciona
  ```
- **Pendente:**
  - **A pasta ainda não foi movida para fora do OneDrive.** A tentativa anterior falhou porque a sessão do Claude Code segurava o diretório de trabalho — precisa fechar a sessão antes.
  - `SETUP-02` fica `[~]` até o aceite rodar de verdade.
  - `SETUP-03`: sem Vitest, ESLint e Prettier, os scripts `test` e `lint` ainda não existem.
  - O `package.json` usa o codinome `ponto-de-virada`; muda quando o nome do jogo sair (`P1-04`).
- **Evidência:** —

---

## 2026-08-06 — Fundação do repositório: regras, backlog, diário e licença

- **Parte / tarefa:** `SETUP-01` ✔
- **O que mudou:**
  - Repositório criado no GitHub (`BlafXD/Jogo-do-bem-no-Estilo-Plague-INC`); commit inicial só com `.gitattributes` (normalização de fim de linha para LF).
  - `CLAUDE.md` escrito — fonte da verdade: escopo, stack, arquitetura, contratos de dados, balanceamento inicial e regras de git.
  - `PLANO.md` escrito — backlog completo das 8 partes da disciplina, com marcos M1–M3, cortes de escopo do modo solo e contratos dos 3 pacotes delegáveis.
  - `PROGRESSO.md` criado (este arquivo).
  - `.gitignore` criado — cobre `node_modules/`, `dist/`, cache do Vite, cobertura do Vitest e lixo do Windows. **Deixa `.claude/settings.json` versionado de propósito** (`CLAUDE.md §4.1`) e ignora só o `settings.local.json`, que é por máquina.
  - `LICENSE` criada — MIT, decisão tomada por ser o padrão acadêmico e por não conflitar com assets CC0/CC-BY.
- **Ambiente conferido:** Node v26.5.1 · npm 11.17.0 · identidade git local correta (`CaiqueHB <caiquehb54@gmail.com>`).
- **Decisão registrada:** o projeto sai de dentro do `OneDrive`. `node_modules` tem dezenas de milhares de arquivos e a sincronização causa erro de lock no `npm install` e instabilidade no HMR do Vite — `.gitignore` resolve o git, não o OneDrive.
- **Como verificar:**
  ```bash
  git log --oneline        # mostra o commit inicial
  git status               # os 5 arquivos de fundação como untracked
  node --version           # v26.5.1
  ```
- **Pendente:**
  - Os 5 arquivos de fundação ainda não foram commitados.
  - Titular do copyright na `LICENSE` está como `CaiqueHB` — trocar por nome completo e somar os integrantes quando o grupo for formado.
  - `SETUP-02` em diante: nenhum código ainda. Sem `package.json`, sem Vite, sem testes.
  - `SETUP-07`: `core.hooksPath` não configurado; `.claude/settings.json` versionado ainda não existe.
  - Decisões de `CLAUDE.md §14` continuam abertas — nome do jogo, formação do grupo, direção de arte, trilha, confirmação da stack com o professor.
- **Evidência:** —
