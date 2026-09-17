import { readdirSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import castData from '../src/data/characters.json';
import { ui } from '../src/data/i18n';
import { climateEvents } from '../src/engine/state';
import {
  CAST_MOMENTS,
  PERSON_IDS,
  cast,
  eventCast,
  faceOf,
  momentCast,
  parseCast,
  personLabel,
  personText,
  poseAssets,
  poseFile,
  poseUrl,
  type Appearance,
  type RawCast,
} from '../src/ui/characters';

/**
 * O manifesto das poses (VIS-06): o que o JSON diz, contra o que está na pasta
 * e contra os eventos do jogo.
 *
 * Mesma costura do tests/audio.test.ts. Quem edita o characters.json é um cargo
 * que não abre `.ts`, e o erro provável é esquecer uma das duas metades — o
 * nome no JSON ou o arquivo na pasta. Os dois ficam vermelhos aqui, e não em
 * branco na feira.
 */

const PASTA = 'src/assets/characters/poses';
const EVENT_IDS = climateEvents.map((event) => event.id);

/** Uma cópia do manifesto de verdade, para estragar num campo só. */
function copia(): RawCast {
  return structuredClone(castData);
}

/** Toda aparição que o manifesto pede, em qualquer momento. */
function todasAsAparicoes(): Appearance[] {
  return [
    ...CAST_MOMENTS.map(momentCast),
    ...cast.title,
    ...EVENT_IDS.flatMap((id) => {
      const quem = eventCast(id);
      return quem === null ? [] : [quem];
    }),
  ];
}

describe('as poses na pasta', () => {
  it('são dezesseis: quatro pessoas, quatro poses cada', () => {
    expect(PERSON_IDS).toHaveLength(4);
    for (const person of PERSON_IDS) expect(cast.poses[person], person).toHaveLength(4);
    expect(readdirSync(PASTA)).toHaveLength(16);
  });

  it('toda pose do manifesto tem arquivo, e o Vite a resolve', () => {
    for (const person of PERSON_IDS) {
      for (const pose of cast.poses[person]) {
        expect(readdirSync(PASTA), `${person} ${pose}`).toContain(poseFile({ person, pose }));
        expect(poseUrl({ person, pose }), `${person} ${pose}`).not.toBeNull();
      }
    }
  });

  /**
   * A outra ponta: o `import.meta.glob` varre a pasta inteira, e um arquivo
   * esquecido ali entra no `dist-feira/index.html` como base64.
   */
  it('não deixa arquivo órfão na pasta', () => {
    const usados = PERSON_IDS.flatMap((person) =>
      cast.poses[person].map((pose) => poseFile({ person, pose })),
    ).sort();

    expect(readdirSync(PASTA).sort()).toEqual(usados);
    expect(poseAssets()).toEqual(usados);
  });

  it('o arquivo sai do nome da pessoa e da pose', () => {
    expect(poseFile({ person: 'ana-luiza', pose: 'aponta' })).toBe('ana-luiza-aponta.jpg');
  });
});

describe('quem aparece onde', () => {
  it('toda aparição tem imagem e texto alternativo', () => {
    for (const quem of todasAsAparicoes()) {
      expect(poseUrl(quem), `${quem.person} ${quem.pose}`).not.toBeNull();
      expect(personLabel(quem.person).trim().length).toBeGreaterThan(0);
    }
  });

  /** A tabela "Quem aparece onde" do docs/DIRECAO-DE-ARTE.md §7. */
  it('segue a tabela da direção de arte', () => {
    expect(momentCast('tutorial-time')).toEqual({ person: 'ana-luiza', pose: 'aponta' });
    expect(momentCast('tutorial-tree')).toEqual({ person: 'carlos-mendes', pose: 'explica' });
    expect(momentCast('tutorial-event')).toEqual({ person: 'ricardo-souza', pose: 'aponta' });
    expect(momentCast('tutorial-inertia')).toEqual({ person: 'juliana-almeida', pose: 'atencao' });
    expect(momentCast('outcome')).toEqual({ person: 'juliana-almeida', pose: 'painel' });
  });

  it('a tela de título mostra a equipe inteira, cada pessoa uma vez', () => {
    expect(cast.title.map((quem) => quem.person).sort()).toEqual([...PERSON_IDS].sort());
  });

  it('as quatro pessoas aparecem em algum lugar da partida', () => {
    const naPartida = new Set(CAST_MOMENTS.map((moment) => momentCast(moment).person));
    expect([...naPartida].sort()).toEqual([...PERSON_IDS].sort());
  });
});

describe('quem dá cada notícia', () => {
  it('todo evento do jogo tem especialista', () => {
    for (const id of EVENT_IDS) expect(eventCast(id), id).not.toBeNull();
  });

  /** A tabela "Quem dá cada notícia" do docs/DIRECAO-DE-ARTE.md §7. */
  it('segue a tabela da direção de arte', () => {
    const porPessoa = (person: string): string[] =>
      EVENT_IDS.filter((id) => eventCast(id)?.person === person).sort();

    expect(porPessoa('ana-luiza')).toEqual(['cyclone', 'heatwave']);
    expect(porPessoa('ricardo-souza')).toEqual(['drought', 'flood', 'storm-surge']);
    expect(porPessoa('carlos-mendes')).toEqual(['coral-bleaching', 'landslide', 'wildfire']);
    expect(porPessoa('juliana-almeida')).toEqual(['crop-failure', 'vector-disease']);
  });

  /** Decidido no chat em 2026-09-17: a pose de alerta de cada um. */
  it('no cartão crítico, cada especialista usa a pose de alerta', () => {
    expect(eventCast('heatwave')?.pose).toBe('aponta');
    expect(eventCast('wildfire')?.pose).toBe('analisa');
    expect(eventCast('flood')?.pose).toBe('atencao');
    expect(eventCast('crop-failure')?.pose).toBe('mapa');
  });

  it('um evento desconhecido não tem ninguém, e não quebra', () => {
    expect(eventCast('tsunami')).toBeNull();
  });
});

describe('parseCast', () => {
  it('aceita o manifesto de verdade', () => {
    expect(() => parseCast(copia(), EVENT_IDS)).not.toThrow();
  });

  /** Cada caso estraga um campo, e o erro precisa dizer qual. */
  const casos: readonly [string, (raw: RawCast) => RawCast, RegExp][] = [
    [
      'pessoa a mais',
      (raw) => ({ ...raw, people: { ...raw.people, gerente: { aponta: { face: [0.5, 0.2] } } } }),
      /chave desconhecida: gerente/,
    ],
    [
      'pessoa sem pose',
      (raw) => ({ ...raw, people: { ...raw.people, 'ana-luiza': {} } }),
      /"ana-luiza" não tem pose/,
    ],
    [
      'pose que não vira nome de arquivo',
      (raw) => ({
        ...raw,
        people: { ...raw.people, 'ana-luiza': { 'Aponta Já': { face: [0.5, 0.2] } } },
      }),
      /não vira nome de arquivo/,
    ],
    [
      'rosto fora da imagem',
      (raw) => ({
        ...raw,
        people: {
          ...raw.people,
          'ana-luiza': { ...raw.people['ana-luiza'], aponta: { face: [0.5, 1.2] } },
        },
      }),
      /a pose "aponta" de "ana-luiza" tem o rosto em \[0.5, 1.2\]/,
    ],
    [
      'rosto com um número só',
      (raw) => ({
        ...raw,
        people: {
          ...raw.people,
          'ana-luiza': { ...raw.people['ana-luiza'], aponta: { face: [0.5] } },
        },
      }),
      /dois números entre 0 e 1/,
    ],
    [
      'momento que falta',
      (raw) => {
        const { outcome: _fora, ...resto } = raw.moments;
        return { ...raw, moments: resto };
      },
      /"moments" sem outcome/,
    ],
    [
      'pose que a pessoa não tem',
      (raw) => ({
        ...raw,
        moments: { ...raw.moments, outcome: { person: 'juliana-almeida', pose: 'folha' } },
      }),
      /pede a pose "folha"/,
    ],
    [
      'pessoa que não existe no título',
      (raw) => ({ ...raw, title: [{ person: 'gerente', pose: 'aponta' }] }),
      /pessoa "gerente"/,
    ],
    ['título vazio', (raw) => ({ ...raw, title: [] }), /"title" está vazio/],
    [
      'evento sem especialista',
      (raw) => {
        const { heatwave: _fora, ...resto } = raw.events.speaker;
        return { ...raw, events: { ...raw.events, speaker: resto } };
      },
      /"events.speaker" sem heatwave/,
    ],
    [
      'evento que não existe no jogo',
      (raw) => ({
        ...raw,
        events: { ...raw.events, speaker: { ...raw.events.speaker, tsunami: 'ana-luiza' } },
      }),
      /chave desconhecida: tsunami/,
    ],
    [
      'especialista que não existe',
      (raw) => ({
        ...raw,
        events: { ...raw.events, speaker: { ...raw.events.speaker, flood: 'gerente' } },
      }),
      /"flood" cita a pessoa "gerente"/,
    ],
    [
      'pose de evento que a pessoa não tem',
      (raw) => ({
        ...raw,
        events: { ...raw.events, pose: { ...raw.events.pose, 'ricardo-souza': 'mapa' } },
      }),
      /pede a pose "mapa"/,
    ],
  ];

  for (const [nome, estraga, erro] of casos) {
    it(`recusa ${nome}`, () => {
      expect(() => parseCast(estraga(copia()), EVENT_IDS)).toThrow(erro);
    });
  }

  it('o erro começa pelo nome do arquivo', () => {
    expect(() => parseCast({ ...copia(), title: [] }, EVENT_IDS)).toThrow(/^characters\.json: /);
  });
});

describe('o rosto e o nome', () => {
  it('toda pose tem o rosto dentro da imagem', () => {
    for (const person of PERSON_IDS) {
      for (const pose of cast.poses[person]) {
        const [x, y] = faceOf({ person, pose });
        expect(x, `${person} ${pose}`).toBeGreaterThan(0);
        expect(x, `${person} ${pose}`).toBeLessThan(1);
        expect(y, `${person} ${pose}`).toBeGreaterThan(0);
        expect(y, `${person} ${pose}`).toBeLessThan(1);
      }
    }
  });

  it('o rosto sai do manifesto, e não de um valor fixo', () => {
    expect(faceOf({ person: 'juliana-almeida', pose: 'aponta' })).toEqual([0.43, 0.11]);
  });

  /** O texto da tela de título e o de dentro da partida saem da mesma fonte. */
  it('o nome do retrato é o mesmo da tela de título', () => {
    expect(personLabel('ana-luiza')).toBe(ui.title.team.alt.anaLuiza);
    expect(personLabel('juliana-almeida')).toBe(ui.title.team.alt.julianaAlmeida);
    expect(personText('carlos-mendes').short).toBe('Carlos');
  });
});
