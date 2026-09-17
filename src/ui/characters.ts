// As poses da equipe e quem aparece em cada momento (VIS-06).
//
// **Quem aparece onde não está escrito neste `.ts`, e é o ponto.** Vem do
// src/data/characters.json, que o `[D-Historia]` e o `[D-Design]` editam sem
// abrir código: trocar a pose de um passo do tutorial, ou o especialista que dá
// a notícia de um evento, é mudar uma linha do JSON. A tabela de origem está no
// docs/DIRECAO-DE-ARTE.md §7.
//
// **O arquivo de cada pose sai do nome, e não do JSON:** a pose `aponta` da
// Ana Luiza é `src/assets/characters/poses/ana-luiza-aponta.jpg`. Uma pose nova
// é um arquivo com esse nome na pasta mais o nome da pose na lista da pessoa. O
// `tests/characters.test.ts` confere as duas metades, como o de áudio.
//
// **Os personagens não mexem no jogo.** Nenhum bônus, nada no `GameState`,
// nenhum balanceamento (docs/PERSONAGENS.md). Por isso este arquivo mora em
// `ui/`: é identidade visual. Quem os põe na tela é o `VIS-07`.
//
// Mesma divisão do audio.ts: o manifesto é lido e conferido na carga, e as URLs
// saem do `import.meta.glob`, que é o que faz o Vite processar os arquivos — no
// build da feira, eles viram `data:` dentro do HTML único.

import { ui } from '../data/i18n';
import castData from '../data/characters.json';
import { climateEvents } from '../engine/state';

// --------------------------------------------------------------- os tipos ---

/**
 * As quatro pessoas da agência.
 *
 * União fechada, e não `string`: cada uma tem nome e cargo no i18n, e uma quinta
 * pessoa precisaria desse texto antes de aparecer — o `tsc` cobra os dois
 * lados juntos.
 */
export const PERSON_IDS = [
  'ana-luiza',
  'carlos-mendes',
  'ricardo-souza',
  'juliana-almeida',
] as const;

export type PersonId = (typeof PERSON_IDS)[number];

/**
 * Os momentos com uma pessoa fixa: os quatro passos do tutorial e a tela de
 * fim. A tela de título tem a equipe inteira, e o evento tem o especialista do
 * assunto; os dois moram em campos próprios do manifesto.
 */
export const CAST_MOMENTS = [
  'tutorial-time',
  'tutorial-tree',
  'tutorial-event',
  'tutorial-inertia',
  'outcome',
] as const;

export type CastMoment = (typeof CAST_MOMENTS)[number];

/** Uma pessoa numa pose. */
export type Appearance = {
  readonly person: PersonId;
  readonly pose: string;
};

export type Cast = {
  /** As poses de cada pessoa, na ordem do manifesto. */
  readonly poses: Readonly<Record<PersonId, readonly string[]>>;
  readonly moments: Readonly<Record<CastMoment, Appearance>>;
  /** A equipe na tela de título, na ordem em que aparece. */
  readonly title: readonly Appearance[];
  /** A pose de cada especialista no cartão do evento crítico. */
  readonly eventPose: Readonly<Record<PersonId, string>>;
  /** O especialista de cada evento, pelo id do events.json. */
  readonly speakers: Readonly<Record<string, PersonId>>;
};

/** O manifesto como ele sai do JSON, antes de `parseCast` conferir. */
type RawAppearance = { readonly person: string; readonly pose: string };

export type RawCast = {
  readonly people: Readonly<Record<string, readonly string[]>>;
  readonly moments: Readonly<Record<string, RawAppearance>>;
  readonly title: readonly RawAppearance[];
  readonly events: {
    readonly pose: Readonly<Record<string, string>>;
    readonly speaker: Readonly<Record<string, string>>;
  };
};

// ----------------------------------------------------------- a conferência ---

/** Nome de pose: minúsculas, dígitos e hífen — ele vira parte do nome do arquivo. */
const POSE_NAME = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

function fail(message: string): never {
  throw new Error(`characters.json: ${message}`);
}

function isPerson(id: string): id is PersonId {
  return (PERSON_IDS as readonly string[]).includes(id);
}

/** As chaves de um objeto têm que ser exatamente as esperadas — nem mais, nem menos. */
function sameKeys(what: string, found: readonly string[], expected: readonly string[]): void {
  const missing = expected.filter((key) => !found.includes(key));
  const extra = found.filter((key) => !expected.includes(key));
  if (missing.length > 0) fail(`${what} sem ${missing.join(', ')}.`);
  if (extra.length > 0) fail(`${what} com chave desconhecida: ${extra.join(', ')}.`);
}

function parsePoses(people: RawCast['people']): Record<PersonId, readonly string[]> {
  sameKeys('"people"', Object.keys(people), PERSON_IDS);

  const poses = {} as Record<PersonId, readonly string[]>;
  for (const person of PERSON_IDS) {
    const list = people[person] ?? [];
    if (list.length === 0) fail(`"${person}" não tem pose nenhuma.`);
    for (const pose of list) {
      if (!POSE_NAME.test(pose)) {
        fail(`"${person}" tem a pose "${pose}", que não vira nome de arquivo.`);
      }
    }
    if (new Set(list).size !== list.length) fail(`"${person}" repete uma pose.`);
    poses[person] = list;
  }
  return poses;
}

function appearance(
  where: string,
  raw: RawAppearance,
  poses: Readonly<Record<PersonId, readonly string[]>>,
): Appearance {
  if (!isPerson(raw.person)) fail(`${where} cita a pessoa "${raw.person}", que não existe.`);
  if (!poses[raw.person].includes(raw.pose)) {
    fail(`${where} pede a pose "${raw.pose}", que "${raw.person}" não tem.`);
  }
  return { person: raw.person, pose: raw.pose };
}

/**
 * Converte o manifesto cru no tipado, e explode com o motivo escrito.
 *
 * Mesma razão do `parseSkills` e do `parseEvents`: o `tsc` garante o formato,
 * não os valores. Uma pose digitada errado viraria um retrato em branco na
 * feira, e um evento esquecido viraria um cartão sem ninguém dando a notícia —
 * as duas falhas silenciosas que este arquivo existe para impedir.
 *
 * `eventIds` são os eventos do jogo: todo evento precisa de especialista, e
 * nenhum especialista pode citar um evento que não existe.
 */
export function parseCast(raw: RawCast, eventIds: readonly string[]): Cast {
  const poses = parsePoses(raw.people);

  sameKeys('"moments"', Object.keys(raw.moments), CAST_MOMENTS);
  const moments = {} as Record<CastMoment, Appearance>;
  for (const moment of CAST_MOMENTS) {
    const entry = raw.moments[moment];
    if (entry === undefined) fail(`"moments" sem ${moment}.`);
    moments[moment] = appearance(`o momento "${moment}"`, entry, poses);
  }

  if (raw.title.length === 0) fail('"title" está vazio.');
  const title = raw.title.map((entry, index) =>
    appearance(`o título (${index + 1}º)`, entry, poses),
  );

  sameKeys('"events.pose"', Object.keys(raw.events.pose), PERSON_IDS);
  const eventPose = {} as Record<PersonId, string>;
  for (const person of PERSON_IDS) {
    eventPose[person] = appearance(
      `"events.pose"`,
      { person, pose: raw.events.pose[person] ?? '' },
      poses,
    ).pose;
  }

  sameKeys('"events.speaker"', Object.keys(raw.events.speaker), eventIds);
  const speakers: Record<string, PersonId> = {};
  for (const [event, person] of Object.entries(raw.events.speaker)) {
    if (!isPerson(person)) fail(`o evento "${event}" cita a pessoa "${person}", que não existe.`);
    speakers[event] = person;
  }

  return { poses, moments, title, eventPose, speakers };
}

export const cast: Cast = parseCast(
  castData,
  climateEvents.map((event) => event.id),
);

// --------------------------------------------------------------- consultas ---

/** Quem aparece num momento fixo. */
export function momentCast(moment: CastMoment): Appearance {
  return cast.moments[moment];
}

/**
 * Quem dá a notícia de um evento, já na pose do cartão crítico. `null` para um
 * id que o manifesto não conhece — o que o `parseCast` impede para os eventos
 * do jogo, e que sobra só para um save de uma versão com outro evento.
 */
export function eventCast(eventId: string): Appearance | null {
  const person = cast.speakers[eventId];
  return person === undefined ? null : { person, pose: cast.eventPose[person] };
}

/** O nome e o cargo, para o texto alternativo da imagem (regra 8: no i18n). */
const LABEL: Readonly<Record<PersonId, string>> = {
  'ana-luiza': ui.title.team.alt.anaLuiza,
  'carlos-mendes': ui.title.team.alt.carlosMendes,
  'ricardo-souza': ui.title.team.alt.ricardoSouza,
  'juliana-almeida': ui.title.team.alt.julianaAlmeida,
};

export function personLabel(person: PersonId): string {
  return LABEL[person];
}

// ---------------------------------------------------------------- arquivos ---

/** O nome do arquivo de uma pose, sem caminho. */
export function poseFile(appearance: Appearance): string {
  return `${appearance.person}-${appearance.pose}.jpg`;
}

/**
 * As URLs que o Vite gerou para as poses.
 *
 * A pasta inteira, como no audio.ts: uma pose nova é resolvida sem tocar neste
 * arquivo. Em troca, um arquivo esquecido na pasta entra no bundle — no build
 * da feira, como base64 — e é o `tests/characters.test.ts` que cobra.
 */
const assets: Record<string, unknown> = import.meta.glob('../assets/characters/poses/*', {
  eager: true,
  query: '?url',
  import: 'default',
});

function baseName(path: string): string {
  const parts = path.split('/');
  return parts[parts.length - 1] ?? path;
}

/** Os arquivos que o `import.meta.glob` achou, pelo nome puro. Para os testes. */
export function poseAssets(): readonly string[] {
  return Object.keys(assets).map(baseName).sort();
}

/** A URL da pose, ou `null` quando o arquivo não está na pasta. */
export function poseUrl(appearance: Appearance): string | null {
  const wanted = poseFile(appearance);

  for (const [path, url] of Object.entries(assets)) {
    if (baseName(path) === wanted && typeof url === 'string') return url;
  }

  return null;
}
