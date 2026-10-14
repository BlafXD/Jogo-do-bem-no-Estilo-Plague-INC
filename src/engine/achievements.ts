// As conquistas da partida (CONQ-01). A lista está em docs/GDD.md §2.8.
//
// **Tudo aqui é derivado do GameState final, e nada é gravado.** É a mesma
// decisão do outcome.ts, e ela é o que segura o arquivo inteiro:
//
//   - o save não ganhou campo nenhum e o `SAVE_VERSION` não subiu;
//   - um save adulterado não entrega um troféu que a partida dele não
//     sustenta, pelo mesmo motivo que não entrega uma medalha;
//   - não existe o bug de "consegui e o jogo não percebeu", que é o que
//     acontece quando uma bandeira booleana deixa de ser ligada num caminho de
//     código — e numa lista de conquistas esse caminho são dezenas.
//
// **O preço está assumido:** uma conquista só pode perguntar o que o estado
// final sabe responder. "Contive a Inércia cinco vezes" **não é possível**,
// porque o número de contenções não existe no contrato do §3 — e inventar um
// contador para isso trocaria a garantia acima por uma estatística. Quando uma
// ideia de conquista não couber aqui, a resposta certa é mudar a ideia.
//
// A outra metade — guardar o que já foi conquistado entre partidas — é da
// CONQ-02, e mora na UI: `localStorage`, chave própria, como a preferência de
// som. Este arquivo não sabe que existe tela nem que existe armazenamento.

import achievementsData from '../data/achievements.json';
import { CONTAIN_REQUIRES } from './inertia';
import { medalFor, outcomeOf } from './outcome';
import { purchasesByBranch, turningPoint } from './review';
import { isUnlocked } from './skills';
import { balance, REGION_IDS, SKILL_BRANCHES, type GameState } from './state';

/**
 * Os números do balance.json que um texto de conquista pode citar.
 *
 * Existem para a frase e a regra **não saírem de dois lugares diferentes** — é
 * a mesma razão pela qual o outcome.ts exporta o `MEDAL_CEILING` para o cartão
 * de fim. Escrever "antes de 2040" no achievements.json faria com que mudar o
 * `turningPointYear` deixasse o jogador lendo o ano errado, e nada no código
 * perceberia.
 *
 * Só entram inteiros. Um número com casa decimal precisaria da vírgula do
 * pt-BR, e formatação de idioma é da UI (src/ui/format.ts), não do engine — por
 * isso a conquista do teto de Paris não cita a temperatura dela.
 */
const TOKENS = {
  turningPointYear: balance.turningPointYear,
  calmInertia: balance.calmInertia,
} as const;

type Token = keyof typeof TOKENS;

/** Acha `{algumaCoisa}` numa descrição. */
const TOKEN_PATTERN = /\{(\w+)\}/g;

/**
 * O id de uma conquista. `string`, como o `SkillId` do state.ts e pelo mesmo
 * motivo: a lista é o arquivo de dados, e o `resolveJsonModule` alarga todo
 * literal de texto do JSON para `string` — exigir uma união aqui faria o `tsc`
 * recusar o próprio achievements.json.
 *
 * Quem impede o id solto não é o tipo, é o `CONDITIONS` abaixo, que precisa ter
 * **exatamente** as mesmas chaves, e o teste que cobra os dois lados.
 */
export type AchievementId = string;

export type Achievement = {
  readonly id: AchievementId;
  readonly name: string;
  /** A condição em uma frase, para o jogador. Pode citar um `{token}`. */
  readonly description: string;
};

/** Uma conquista como ela sai do JSON, antes de `parseAchievements` prová-la. */
export type RawAchievement = {
  readonly id: string;
  readonly name: string;
  readonly description: string;
};

/**
 * Valida o achievements.json na carga, e **lança** quando ele não fecha.
 *
 * Mesma escolha do `parseSkills` e do `parseActions`, e pela mesma razão: isto
 * é arquivo do repositório, editável à mão sem abrir um `.ts`. O caso que mais
 * importa é o token escrito errado — um `{anoDaVirada}` não reconhecido
 * chegaria à tela com as chaves à mostra, e ninguém descobre isso em teste de
 * unidade nenhum porque o texto continua sendo um texto válido.
 */
export function parseAchievements(raw: readonly RawAchievement[]): readonly Achievement[] {
  const byId = new Map<string, Achievement>();

  for (const item of raw) {
    if (!item.id.trim()) {
      throw new Error('achievements.json: há uma conquista sem id.');
    }
    if (byId.has(item.id)) {
      throw new Error(`achievements.json: a conquista "${item.id}" aparece mais de uma vez.`);
    }
    for (const field of ['name', 'description'] as const) {
      if (!item[field].trim()) {
        throw new Error(`achievements.json: "${item.id}" está sem ${field}.`);
      }
    }
    for (const [, token] of item.description.matchAll(TOKEN_PATTERN)) {
      if (!(token !== undefined && token in TOKENS)) {
        throw new Error(`achievements.json: "${item.id}" cita o número desconhecido "{${token}}".`);
      }
    }

    byId.set(item.id, { ...item, id: item.id as AchievementId });
  }

  return [...byId.values()];
}

/** A lista inteira, validada na carga. Ordem igual à do achievements.json. */
export const ACHIEVEMENTS: readonly Achievement[] = parseAchievements(achievementsData);

/**
 * A condição de cada conquista.
 *
 * **Mora em código, e o texto mora em dados — de propósito.** Uma condição é
 * uma pergunta ao estado, e escrevê-la no JSON exigiria uma linguagenzinha de
 * expressões para seis conquistas: mais peça para manter do que as seis que ela
 * serviria, e sem o `tsc` conferindo nada. O que liga as duas metades é o
 * tests/achievements.test.ts, que recusa um id que exista só de um lado.
 */
const CONDITIONS: Readonly<Record<string, (state: GameState) => boolean>> = {
  /**
   * A curva de emissões do mundo virou cedo.
   *
   * O ano da virada é, na prática, o ano em que o jogador começou a comprar —
   * medido em docs/BALANCEAMENTO.md. Então esta é a conquista do "agir agora",
   * que é a primeira lição do §2.1, e é de propósito que ela é a mais fácil da
   * lista: uma prateleira inteira de conquistas difíceis não ensina ninguém.
   *
   * `null` — a curva ainda subia no fim — nunca conta.
   */
  'turning-point': (state) => {
    const peak = turningPoint(state);
    return peak !== null && peak.year < balance.turningPointYear;
  },

  /**
   * Um nó em cada um dos cinco ramos.
   *
   * A recusa é o jogador que só corta emissão: ele é a estratégia mais
   * eficiente da planilha e **é dissolvido antes de 2100**, porque pula
   * Sociedade. É o dilema do §2.1 virado em troféu.
   */
  'five-fronts': (state) => {
    const bought = purchasesByBranch(state);
    return SKILL_BRANCHES.every((branch) => bought[branch] > 0);
  },

  /**
   * Terminou com a Inércia contida — e tendo de fato podido contê-la.
   *
   * A segunda metade da condição não é zelo à toa: **quem não faz nada termina
   * com a Inércia baixa**, porque ela cresce com o que o jogador já cortou
   * (§2.6). Sem a exigência do nó que abre a contenção, a conquista do
   * contra-ataque seria entregue a quem nunca atacou.
   *
   * O nó exigido é o mesmo que o engine já usa para liberar a contenção, lido
   * do `inertia.ts` em vez de escrito aqui: duas listas do que destrava a
   * contenção é como as duas discordam em silêncio.
   */
  'license-to-fight': (state) =>
    CONTAIN_REQUIRES !== undefined &&
    isUnlocked(state, CONTAIN_REQUIRES) &&
    state.inertia < balance.calmInertia,

  /**
   * As oito regiões ainda apoiam a agência.
   *
   * `> 0` e não um piso confortável: o apoio é moído por 75 anos de desgaste,
   * de eventos e de desinformação, e a varredura do docs/BALANCEAMENTO.md
   * mostra que **nenhuma das cinco estratégias de referência chega a 2100 com
   * uma região sequer acima de zero** — só quem contém a Inércia cedo chega. O
   * número está exatamente onde a condição ainda é alcançável.
   */
  'nobody-left-behind': (state) => REGION_IDS.every((id) => state.regions[id].support > 0),

  /**
   * Parou abaixo do teto que o Acordo de Paris fixou — a prata do §2.7.
   *
   * Pergunta pela medalha e não pela temperatura, para herdar a catraca do
   * `medalFor` em vez de repetir a comparação. O ouro conta junto porque quem
   * fica abaixo de 1,5 °C também ficou abaixo de 2,0 °C; que ninguém o alcance
   * hoje é assunto de balanceamento, não desta linha.
   */
  'paris-ceiling': (state) => {
    const medal = medalFor(state.temperature);
    return medal === 'gold' || medal === 'silver';
  },

  /**
   * A agência chegou ao fim da partida sem ser dissolvida.
   *
   * Vale para os dois desfechos do §2.7 — zero líquido e fim do horizonte —,
   * porque negar "a agência de pé" a quem venceu antes de 2100 seria punir o
   * desfecho melhor. Quem perde por temperatura ou por apoio não a leva.
   */
  'agency-standing': (state) => outcomeOf(state).kind === 'finished',
};

/**
 * O texto da conquista com os números do balance.json no lugar dos `{token}`.
 *
 * Mora no engine, junto do `ACHIEVEMENTS`, pela mesma razão que o `name` e o
 * `description` de um nó da árvore moram no skills.json: é conteúdo do jogo, e
 * não moldura de interface. O que a regra 8 proíbe é a frase nascer dentro de
 * um `.ts`, e ela nasce no JSON.
 */
export function describeAchievement(achievement: Achievement): string {
  return achievement.description.replace(TOKEN_PATTERN, (whole, token: string) =>
    token in TOKENS ? String(TOKENS[token as Token]) : whole,
  );
}

/**
 * As conquistas que **esta** partida rendeu, na ordem do achievements.json.
 *
 * Lida uma vez, quando a partida acaba — como o review.ts, e ao contrário do
 * outcome.ts, que é consultado a cada tick porque é ele que para o relógio.
 *
 * **Partida em andamento não rende nada, e isso é regra e não economia.**
 * Metade destas perguntas só tem resposta honesta no fim: "as oito regiões
 * ainda apoiam" é verdade em 2030 para todo mundo, e entregar o troféu ali
 * seria premiar quem ainda não foi testado.
 */
export function achievementsEarned(state: GameState): readonly AchievementId[] {
  if (outcomeOf(state).kind === 'playing') return [];

  return ACHIEVEMENTS.filter((achievement) => {
    const condition = CONDITIONS[achievement.id];
    // Um id sem condição é recusado pelo tests/achievements.test.ts, que cobra
    // os dois lados. Ignorar aqui, em vez de lançar, é o certo mesmo assim:
    // isto é leitura de tela de fim, e derrubar a tela de fim por causa de uma
    // conquista mal cadastrada trocaria uma prateleira incompleta por nenhuma.
    return condition !== undefined && condition(state);
  }).map((achievement) => achievement.id);
}

/** As conquistas que têm condição escrita — a outra metade do contrato. */
export const CONDITION_IDS: readonly string[] = Object.keys(CONDITIONS);
