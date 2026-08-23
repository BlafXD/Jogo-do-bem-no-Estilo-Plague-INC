// Sorteio e resolução de eventos climáticos (P7-01). Regra no docs/GDD.md §2.5.
//
// **O peso cresce com a temperatura, e é isso que o jogo tem a ensinar.** Um
// evento só entra no sorteio acima do seu `tempThreshold`, e a partir dali fica
// mais provável quanto mais quente o mundo estiver:
//
//   peso = baseWeight × (1 + eventWeightPerDegree × (T − tempThreshold))
//
// Duas consequências caem de graça. O jogador que demora **sente** o mundo
// piorar, em vez de ler sobre isso num cartão; e os eventos raros e caros — a
// ressaca sobre um mar mais alto, o colapso de safra — ficam guardados para a
// segunda metade da partida sem que ninguém precise agendá-los.
//
// **Nada aqui usa Math.random()** (regra 7). Todo sorteio passa pelo `rngState`
// do GameState, que o save do P6-07 já carrega — sem isso, recarregar a partida
// recomeçaria a sequência e a mesma seed deixaria de dar a mesma partida.

import {
  balance,
  climateEvents,
  REGION_IDS,
  type ActiveEvent,
  type ClimateEvent,
  type GameState,
  type Region,
  type RegionId,
} from './state';
import { nextRandom, type RngState } from './rng';

/**
 * Quantos ticks o cartão de um evento fica em cena.
 *
 * **O impacto é instantâneo; isto é só a vitrine.** A alternativa — evento com
 * duração que aplica dano a cada tick — exigiria um campo novo no `ClimateEvent`
 * do `docs/GDD.md §3`, e o §12 proíbe reescrever o contrato sem pedir. Aplicar
 * de uma vez também é mais honesto com o `impact` que o contrato descreve: ele é
 * um delta, não uma taxa.
 *
 * Exportado no P7-02: é a constante que faz o `startTickOf` funcionar, e a UI
 * precisa dela para saber quanto tempo um cartão ainda tem de vida.
 */
export const CARD_TICKS = 6;

const eventsById: ReadonlyMap<string, ClimateEvent> = new Map(
  climateEvents.map((event) => [event.id, event]),
);

/**
 * O evento do catálogo por id, ou `undefined`.
 *
 * O `ActiveEvent` guarda só o id — o cartão do P7-02 precisa do nome e do fato,
 * e um segundo `find` linear a cada quadro sobre uma lista que nunca muda seria
 * desperdício. Mesmo padrão do `skillById`.
 */
export function eventById(id: string): ClimateEvent | undefined {
  return eventsById.get(id);
}

/**
 * O tick em que este cartão entrou em cena.
 *
 * **A idade já está codificada no `ticksRemaining`, e é exato.** O
 * `advanceEvents` envelhece todo cartão em 1 por tick e cria no máximo um por
 * tick com `CARD_TICKS` cheio — então quem está com 4 nasceu há dois meses, sem
 * ambiguidade possível.
 *
 * Existe porque a UI precisa saber **o que é novo**, e não tem como descobrir
 * sozinha: o relógio do P6-04 entrega até doze ticks num quadro só, e nesse
 * intervalo até doze eventos podem ter entrado. Comparar as duas listas não
 * resolve — o `ageCards` recria todos os objetos a cada mês, então nem a
 * identidade nem o conteúdo distinguem um cartão velho de um novo.
 *
 * A alternativa era gravar um `startedTick` no `ActiveEvent`, o que subiria o
 * `SAVE_VERSION` para guardar um número que já dá para deduzir. O preço deste
 * caminho é o acoplamento ao `CARD_TICKS`: se um dia a duração do cartão variar
 * por evento, esta função quebra em silêncio — e é por isso que o
 * `tests/events.test.ts` cobra a invariante contra uma simulação de verdade, em
 * vez de conferir a aritmética contra ela mesma.
 */
export function startTickOf(active: ActiveEvent, currentTick: number): number {
  return currentTick - (CARD_TICKS - active.ticksRemaining);
}

/**
 * O evento é grave o bastante para parar o relógio (P7-02).
 *
 * **O eixo é o apoio, e a escolha tem razão.** Dos três campos do `impact`, o
 * apoio é o único ligado a uma condição de fim: o `docs/GDD.md §2.7` dissolve a
 * agência quando o apoio médio zera. Crítico, aqui, quer dizer *ameaça encerrar
 * a partida* — não "tem números grandes". A economia, hoje, não é lida por
 * regra nenhuma, e o PAC perdido se recupera sozinho no mês seguinte.
 *
 * O limiar mora no `balance.json` (regra 8) porque é dele que depende quantas
 * vezes o jogo interrompe quem está jogando. A medição que escolheu o valor
 * está em `docs/BALANCEAMENTO.md`.
 */
export function isCritical(event: ClimateEvent): boolean {
  return event.impact.support >= balance.criticalEventSupport;
}

/** Um evento pode sortear qualquer região, ou só as que ele lista. */
function targetsOf(event: ClimateEvent): readonly RegionId[] {
  return event.targets === 'any' ? REGION_IDS : event.targets;
}

/**
 * O peso de um evento à temperatura dada, ou 0 se ele ainda não entrou.
 *
 * Exportada porque o teste precisa cobrar a fórmula do §2.5 diretamente, e
 * porque o cartão do P7-02 vai querer explicar por que aquele evento apareceu.
 */
export function weightFor(event: ClimateEvent, temperature: number): number {
  if (temperature < event.tempThreshold) return 0;
  const above = temperature - event.tempThreshold;
  return event.baseWeight * (1 + balance.eventWeightPerDegree * above);
}

/** Os eventos que a temperatura atual já destravou, com o peso de cada um. */
export function eligibleEvents(
  temperature: number,
): readonly { readonly event: ClimateEvent; readonly weight: number }[] {
  return climateEvents
    .map((event) => ({ event, weight: weightFor(event, temperature) }))
    .filter((entry) => entry.weight > 0);
}

/**
 * Escolhe um item por roleta, dado um valor em [0, 1).
 *
 * O `?? último` no fim não é paranoia decorativa: a soma de ponto flutuante
 * pode ficar um fio abaixo do total e deixar o acumulador nunca alcançar um
 * `value` muito próximo de 1. Devolver `undefined` ali viraria "nenhum evento"
 * numa borda rara — um bug que só aparece depois de milhares de sorteios.
 */
function pickWeighted<T>(
  entries: readonly { readonly item: T; readonly weight: number }[],
  value: number,
): T | undefined {
  const total = entries.reduce((sum, entry) => sum + entry.weight, 0);
  if (total <= 0) return undefined;

  let cursor = value * total;
  for (const entry of entries) {
    cursor -= entry.weight;
    if (cursor < 0) return entry.item;
  }
  return entries[entries.length - 1]?.item;
}

/** O que um tick de sorteio produziu. */
export type EventDraw = {
  readonly event: ClimateEvent;
  readonly target: RegionId;
};

/**
 * Sorteia — ou não — um evento para este tick.
 *
 * Consome **até três** passos do gerador, sempre na mesma ordem: acontece algo,
 * qual evento, qual região. O estado devolvido é o de depois do último passo
 * dado, e é ele que precisa voltar para o `GameState` — devolver o par
 * `{ draw, rngState }` em vez de mutar é o que mantém a função pura (§4).
 *
 * **A soma dos pesos é lida como eventos por ano.** Dividir por `ticksPerYear`
 * transforma isso na chance deste mês. O `Math.min(1, …)` existe para o fim da
 * partida, quando muitos eventos estão destravados e quentes: sem ele a
 * probabilidade passaria de 1 e a conta perderia o sentido, ainda que o efeito
 * prático fosse o mesmo.
 */
export function drawEvent(
  temperature: number,
  rngState: RngState,
): { readonly draw: EventDraw | null; readonly rngState: RngState } {
  const eligible = eligibleEvents(temperature);
  if (eligible.length === 0) return { draw: null, rngState };

  const perYear = eligible.reduce((sum, entry) => sum + entry.weight, 0);
  const chance = Math.min(1, perYear / balance.ticksPerYear);

  const roll = nextRandom(rngState);
  if (roll.value >= chance) return { draw: null, rngState: roll.state };

  const which = nextRandom(roll.state);
  const event = pickWeighted(
    eligible.map((entry) => ({ item: entry.event, weight: entry.weight })),
    which.value,
  );
  if (event === undefined) return { draw: null, rngState: which.state };

  const options = targetsOf(event);
  const where = nextRandom(which.state);
  const index = Math.min(options.length - 1, Math.floor(where.value * options.length));
  const target = options[index];
  if (target === undefined) return { draw: null, rngState: where.state };

  return { draw: { event, target }, rngState: where.state };
}

/**
 * O menor fator de dano que a resiliência consegue: ela nunca zera um evento.
 *
 * **Não é balanceamento disfarçado, é a única leitura honesta do que adaptação
 * faz.** Dique, alerta precoce e mangue reduzem estrago; nenhum deles cancela
 * uma enchente. Sem este piso, as oito regiões começam em 50 de resiliência e os
 * +50 que a árvore inteira oferece as levariam a 100 — dano zero, e o último nó
 * de resiliência viraria botão de imunidade. Com ele, investir tudo **corta o
 * dano pela metade** em relação ao começo da partida, que é uma recompensa forte
 * sem ser um interruptor.
 */
const MIN_DAMAGE_FACTOR = 0.25;

/**
 * Quanto do impacto sobra depois da resiliência da região.
 *
 * `mitigatedByResilience` é o que dá emprego ao ramo Natureza e aos nós de
 * alerta precoce e defesa costeira: sem ele, `resilience` seria um número que o
 * HUD mostra e nada lê.
 */
export function damageMultiplier(event: ClimateEvent, region: Region): number {
  if (!event.mitigatedByResilience) return 1;
  return Math.max(MIN_DAMAGE_FACTOR, 1 - region.resilience / 100);
}

/**
 * Aplica um evento à região que ele atingiu.
 *
 * O apoio **fura o piso de apatia**, e é aqui que a derrota por apoio do
 * `docs/GDD.md §2.7` deixa de ser decorativa: ela está escrita e testada desde o
 * P6-08 e nada no jogo conseguia disparar. O `tick.ts` já previa este dia — "o
 * desgaste do tempo não empurra mais para baixo, e também não puxa de volta
 * para cima (…) Furar o piso é trabalho de evento e da Inércia".
 *
 * O PAC nunca fica negativo: um evento caro num bolso vazio custa o que houver.
 */
export function applyEvent(state: GameState, draw: EventDraw): GameState {
  const region = state.regions[draw.target];
  const factor = damageMultiplier(draw.event, region);
  const { support, economy, points } = draw.event.impact;

  const hit: Region = {
    ...region,
    support: Math.max(0, region.support - support * factor),
    economy: Math.max(0, region.economy - economy * factor),
  };

  return {
    ...state,
    regions: { ...state.regions, [draw.target]: hit },
    actionPoints: Math.max(0, state.actionPoints - points * factor),
    activeEvents: [
      ...state.activeEvents,
      { eventId: draw.event.id, target: draw.target, ticksRemaining: CARD_TICKS },
    ],
  };
}

/** Envelhece os cartões em cena e descarta os que venceram. */
function ageCards(state: GameState): GameState['activeEvents'] {
  return state.activeEvents
    .map((active) => ({ ...active, ticksRemaining: active.ticksRemaining - 1 }))
    .filter((active) => active.ticksRemaining > 0);
}

/**
 * Um tick de eventos: envelhece o que está em cena, sorteia, e aplica.
 *
 * É a única função que o `tick.ts` chama. Ela devolve `GameState` como todas as
 * outras do engine, com o `rngState` já avançado — quem esquecer de guardar o
 * estado do gerador não quebra nada visível, só faz a partida repetir o mesmo
 * sorteio para sempre, que é o tipo de bug que ninguém encontra olhando.
 */
export function advanceEvents(state: GameState): GameState {
  const aged: GameState = { ...state, activeEvents: ageCards(state) };
  const { draw, rngState } = drawEvent(aged.temperature, aged.rngState);
  const rolled: GameState = { ...aged, rngState };

  return draw === null ? rolled : applyEvent(rolled, draw);
}
