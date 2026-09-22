// Os ícones do jogo e a marca da folha (VIS-09).
//
// **O desenho não está escrito neste `.ts`, e é o ponto** — o mesmo do
// audio.ts. Cada ícone é um arquivo em `src/assets/icons/`, no formato do
// contrato do `[D-Design]` (PLANO.md): 24×24, traço de 2 px, uma cor só e sem
// texto. Quem for redesenhar troca o arquivo e não abre código nenhum; quem
// confere o formato de cada um é o `tests/icons.test.ts`.
//
// **Entram na página como `<svg>` de verdade, e não como `<img>`.** Um `<img>`
// não herda a cor do texto em volta, e cada cor pediria um arquivo. Embutido, o
// `stroke="currentColor"` do arquivo pega a cor do rótulo ao lado, e a cor
// continua morando só no theme.css. O `?raw` também resolve o build da feira
// sem passo nenhum a mais: o desenho vira texto dentro do JS, e não sobra
// arquivo para o `file://` recusar (vite.config.ts).
//
// **Nada aqui pode lançar**, pela razão do audio.ts: um ícone que falta é um
// rótulo sem desenho, e não um jogo que não abre. Quem cobra a falta é a suíte.
//
// Os sinais de estado (✔ ● ◌ ✕ ▲ ◉) **não** são daqui. Eles são texto, grudados
// no rótulo, e moram no i18n.ts (docs/DIRECAO-DE-ARTE.md §9).

import markSource from '../assets/brand/mark.svg?raw';

/**
 * Os ícones que o jogo desenha.
 *
 * Os seis indicadores e os cinco ramos usam **o mesmo nome** do campo do HUD e
 * do ramo do skills.json. É o que deixa o `tsc` cobrar os dois lados: um
 * indicador novo no `HUD_FIELDS` sem ícone aqui para de compilar no hud.ts.
 */
export const ICON_NAMES = [
  'year',
  'temperature',
  'emissions',
  'actionPoints',
  'support',
  'inertia',
  'energy',
  'transport',
  'nature',
  'industry',
  'society',
  'contain',
] as const;

export type IconName = (typeof ICON_NAMES)[number];

/** O arquivo de um ícone, sem caminho: `actionPoints` mora em `action-points.svg`. */
export function iconFile(name: IconName): string {
  return `${name.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`)}.svg`;
}

/**
 * O texto de cada arquivo da pasta.
 *
 * A pasta inteira, como no audio.ts: um ícone redesenhado é lido sem tocar
 * neste arquivo. Em troca, um arquivo esquecido na pasta entra no bundle — e o
 * `tests/icons.test.ts` cobra que a pasta e a lista acima sejam a mesma.
 */
const sources: Record<string, unknown> = import.meta.glob('../assets/icons/*.svg', {
  eager: true,
  query: '?raw',
  import: 'default',
});

function baseName(path: string): string {
  const parts = path.split('/');
  return parts[parts.length - 1] ?? path;
}

/** Os arquivos que o `import.meta.glob` achou, pelo nome puro. Para os testes. */
export function iconAssets(): readonly string[] {
  return Object.keys(sources).map(baseName).sort();
}

/** O desenho de um ícone, ou `null` quando o arquivo não está na pasta. */
export function iconSource(name: IconName): string | null {
  const wanted = iconFile(name);

  for (const [path, source] of Object.entries(sources)) {
    if (baseName(path) === wanted && typeof source === 'string') return source;
  }

  return null;
}

// --------------------------------------------------------------------- DOM ---

/**
 * Tira do desenho os nós de texto que são só a indentação do arquivo.
 *
 * Sem isso, o `textContent` de quem recebe um ícone ganharia as quebras de
 * linha e os espaços do `.svg` — e "Energia" deixaria de ser "Energia" para quem
 * lê o texto do título do ramo.
 */
function dropBlankText(node: Node): void {
  for (const child of [...node.childNodes]) {
    if (child.nodeType === Node.TEXT_NODE && (child.textContent ?? '').trim() === '') {
      child.remove();
    } else {
      dropBlankText(child);
    }
  }
}

/**
 * Transforma o texto de um arquivo num `<svg>` desta página.
 *
 * Pelo leitor de XML, e não por `innerHTML`: um arquivo quebrado vira `null` em
 * vez de um pedaço de desenho. O Chrome não recusa o XML inválido — ele devolve
 * o que conseguiu ler com um `<parsererror>` dentro, e é isso que a segunda
 * conferência pega.
 *
 * **Sempre fora do leitor de tela.** Todo ícone do jogo fica ao lado de um
 * texto que já diz o que ele diz (docs/GDD.md §5).
 */
function parseSvg(source: string, className: string): SVGSVGElement | null {
  const parsed = new DOMParser().parseFromString(source, 'image/svg+xml').documentElement;
  const svg = document.importNode(parsed, true);

  if (!(svg instanceof SVGSVGElement) || svg.querySelector('parsererror') !== null) return null;

  dropBlankText(svg);
  svg.setAttribute('class', className);
  svg.setAttribute('aria-hidden', 'true');
  svg.setAttribute('focusable', 'false');
  return svg;
}

/**
 * Põe o ícone no começo de `target`, com a classe `icon` mais a do lugar.
 *
 * Sem o arquivo, não põe nada: o rótulo continua lá, escrito.
 */
export function prependIcon(target: Element, name: IconName, className = ''): void {
  const source = iconSource(name);
  const svg = source === null ? null : parseSvg(source, `icon ${className}`.trim());
  if (svg === null) return;

  svg.dataset.icon = name;
  target.prepend(svg);
}

/**
 * Põe a marca — a folha no anel de circuito — no começo de `target`.
 *
 * A marca é o logotipo, e **não segue o contrato dos ícones**: tem três cores e
 * 48 × 48. Por isso mora fora da pasta deles, em `src/assets/brand/`. As cores
 * saem do tema, com a reserva escrita no próprio arquivo, como nas folhas de
 * estilo — aberto sozinho, fora do jogo, ele continua sendo a marca.
 */
export function prependBrandMark(target: Element, className: string): void {
  const svg = parseSvg(markSource, `brand-mark ${className}`);
  if (svg !== null) target.prepend(svg);
}
