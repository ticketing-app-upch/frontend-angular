import { EventCategory } from '../core/models/event.model';

/**
 * Imagen de portada para un evento, determinista a partir del nombre/lugar.
 * Prioridad:
 *   1. Fútbol "A vs B"  -> foto de estadio (se usa difuminada de fondo tras
 *      los escudos; ver `matchArt`).
 *   2. Palabra clave del nombre (orquesta, maratón, gastronomía peruana…).
 *   3. Lugar reconocido (Dibós, Teatro Municipal…) -> foto real del recinto.
 *   4. Pool por categoría (Unsplash).
 *
 * Un `imageUrl` propio en el evento siempre gana sobre esto.
 */
export function eventImage(input: {
  name: string;
  category: EventCategory;
  venue?: string;
}): string {
  const name = input.name.toLowerCase();
  const venue = (input.venue ?? '').toLowerCase();

  if (matchArt(input.name, input.category)) {
    return unsplash(pick(FOOTBALL_BG, input.name));
  }

  for (const rule of BY_KEYWORD) {
    if (rule.test.test(name)) return resolve(rule.ids, input.name);
  }

  for (const rule of BY_VENUE) {
    if (rule.test.test(venue)) return rule.url;
  }

  return unsplash(pick(BY_CATEGORY[input.category] ?? BY_CATEGORY.CONCIERTO, input.name));
}

// --- Escudos para partidos de fútbol ---------------------------------------

export interface MatchArt {
  teamA: string;
  teamB: string;
  /** Mejor escudo disponible (logo real si existe, si no el generado). */
  crestA: string;
  crestB: string;
  /** Escudo generado de respaldo (por si el logo real falla al cargar). */
  crestAAlt: string;
  crestBAlt: string;
}

/** Devuelve escudos + nombres si el evento es un partido de fútbol "A vs B". */
export function matchArt(name: string, category: EventCategory): MatchArt | null {
  if (category !== 'DEPORTE') return null;
  const teams = parseTeams(name);
  if (!teams) return null;
  const [teamA, teamB] = teams;
  // Dispara los escudos si el nombre menciona el deporte, o si ambos equipos
  // tienen escudo real registrado (así "Cienciano vs Melgar" ya funciona solo).
  const mentionsFootball = /f[uú]tbol|cl[aá]sico|derbi|derby/i.test(name);
  const bothKnown =
    TEAM_CRESTS[normalizeTeam(teamA)] !== undefined &&
    TEAM_CRESTS[normalizeTeam(teamB)] !== undefined;
  if (!mentionsFootball && !bothKnown) return null;
  return {
    teamA,
    teamB,
    crestA: crestFor(teamA),
    crestB: crestFor(teamB),
    crestAAlt: crest(teamA, TEAM_COLORS[normalizeTeam(teamA)]),
    crestBAlt: crest(teamB, TEAM_COLORS[normalizeTeam(teamB)]),
  };
}

/**
 * Logos oficiales por equipo. Vacío a propósito: pega aquí la URL del escudo
 * que tengas permiso de usar (kit de prensa del club, Wikimedia, tus assets en
 * /public/events…). Si el equipo no está, se genera un escudo con sus colores
 * e iniciales.  Ej.:  'sporting cristal': '/events/crest-sporting-cristal.png'
 */
// Las claves se comparan contra el nombre YA normalizado por `normalizeTeam()`:
// minúsculas, sin tildes y sin las palabras club/deportivo/fbc/fc/cd. Por eso
// aquí no hay tildes ni esas palabras. Varias claves pueden apuntar al mismo
// archivo (alias por nombre corto o nombre oficial completo).
const TEAM_CRESTS: Record<string, string> = {
  'sporting cristal': '/events/crest-sporting-cristal.webp',
  cristal: '/events/crest-sporting-cristal.webp',
  universitario: '/events/crest-universitario.png',
  'universitario de deportes': '/events/crest-universitario.png',
  'la u': '/events/crest-universitario.png',
  'alianza lima': '/events/Alianza lima.webp',
  alianza: '/events/Alianza lima.webp',
  cienciano: '/events/cienciano.png',
  melgar: '/events/melgar.webp',
  'sport boys': '/events/Sport Boys.webp',
  boys: '/events/Sport Boys.webp',
  'sport huancayo': '/events/Sport Huancayo.png',
  huancayo: '/events/Sport Huancayo.png',
  'atletico grau': '/events/atlético grau.png',
  'atletico grau de piura': '/events/atlético grau.png',
  grau: '/events/atlético grau.png',
  'atletico de sullana': '/events/Atlético de Sullana.png',
  'alianza atletico': '/events/Atlético de Sullana.png',
  'alianza atletico sullana': '/events/Atlético de Sullana.png',
  sullana: '/events/Atlético de Sullana.png',
  cusco: '/events/cusco.png',
  garcilaso: '/events/deportivo garcilaso.webp',
  'garcilaso del cusco': '/events/deportivo garcilaso.webp',
  chankas: '/events/Chankas.png',
  'los chankas': '/events/Chankas.png',
  'los chankas de andahuaylas': '/events/Chankas.png',
  adt: '/events/ADT.webp',
  'adt tarma': '/events/ADT.webp',
  'asociacion deportiva tarma': '/events/ADT.webp',
  tarma: '/events/ADT.webp',
  utc: '/events/UTC.png',
  'utc cajamarca': '/events/UTC.png',
  'utc de cajamarca': '/events/UTC.png',
  cajamarca: '/events/cajamarca.png',
  'comerciantes unidos': '/events/comerciantes unidos.png',
  comerciantes: '/events/comerciantes unidos.png',
  moquegua: '/events/moquegua.png',
  'juan pablo ii': '/events/juan pablo II.webp',
  'juan pablo ii college': '/events/juan pablo II.webp',
  'juan pablo': '/events/juan pablo II.webp',
};

/** Colores de camiseta (conocimiento público, no son los logos). */
const TEAM_COLORS: Record<string, [string, string]> = {
  'sporting cristal': ['#0aa5e0', '#0b3b8c'],
  cristal: ['#0aa5e0', '#0b3b8c'],
  universitario: ['#f3e2be', '#7a1f2b'],
  'universitario de deportes': ['#f3e2be', '#7a1f2b'],
  'la u': ['#f3e2be', '#7a1f2b'],
  'alianza lima': ['#12306e', '#eef2ff'],
  alianza: ['#12306e', '#eef2ff'],
  melgar: ['#b21f2d', '#141414'],
  'fbc melgar': ['#b21f2d', '#141414'],
  cienciano: ['#c62828', '#7a1f1f'],
  'sport boys': ['#e0608b', '#6f2440'],
  'deportivo municipal': ['#ededed', '#b21f2d'],
  municipal: ['#ededed', '#b21f2d'],
  'atletico grau': ['#c9a227', '#1a1a1a'],
  'sport huancayo': ['#d3313a', '#e8e8e8'],
  'cusco fc': ['#8a1a2e', '#d8b04a'],
  ado: ['#0aa5e0', '#0b3b8c'],
  peru: ['#d21f2b', '#f4f4f4'],
  perú: ['#d21f2b', '#f4f4f4'],
  brasil: ['#f7d417', '#1e7d3c'],
  argentina: ['#75aadb', '#f4f4f4'],
  chile: ['#d21f2b', '#12306e'],
  colombia: ['#f7d417', '#12306e'],
  ecuador: ['#f7d417', '#12306e'],
  uruguay: ['#4fa3d1', '#141414'],
  bolivia: ['#1e7d3c', '#f7d417'],
  paraguay: ['#d21f2b', '#12306e'],
};

function crestFor(team: string): string {
  const key = normalizeTeam(team);
  return TEAM_CRESTS[key] ?? crest(team, TEAM_COLORS[key]);
}

function normalizeTeam(team: string): string {
  return team
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/\b(club|deportivo|fbc|fc|cd)\b/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function parseTeams(name: string): [string, string] | null {
  const base = name.split(/\s+[—–-]\s+/)[0];
  const parts = base.split(/\s+(?:vs\.?|v\.?)\s+/i);
  if (parts.length !== 2) return null;
  const a = parts[0].trim();
  const b = parts[1].trim();
  return a && b ? [a, b] : null;
}

/**
 * Escudo genérico en los colores de la camiseta (no es el logo del club):
 * silueta de escudo + banda diagonal + iniciales.
 */
function crest(team: string, colors?: [string, string]): string {
  const [c1, c2] = colors ?? [`hsl(${hashCode(team) % 360} 56% 42%)`, '#0f172a'];
  const label = esc(initials(team));
  const ink = readableInk(c1);
  const shield = 'M8 10 H112 V70 Q112 120 60 136 Q8 120 8 70 Z';
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 144">` +
    `<defs><clipPath id="s"><path d="${shield}"/></clipPath></defs>` +
    `<g clip-path="url(#s)">` +
    `<rect width="120" height="144" fill="${c1}"/>` +
    `<path d="M-10 96 L70 -10 L130 -10 L50 96 Z" fill="${c2}" opacity="0.92"/>` +
    `</g>` +
    `<path d="${shield}" fill="none" stroke="#ffffff" stroke-width="6"/>` +
    `<text x="60" y="84" text-anchor="middle" font-family="Inter,Arial,sans-serif" font-weight="800" font-size="40" fill="${ink}" stroke="rgba(0,0,0,0.25)" stroke-width="0.6">${label}</text>` +
    `</svg>`;
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}

/** Texto blanco o casi negro según lo claro que sea el color de fondo. */
function readableInk(hex: string): string {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return '#ffffff';
  const n = parseInt(m[1], 16);
  const r = (n >> 16) & 255;
  const g = (n >> 8) & 255;
  const b = n & 255;
  const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return lum > 0.62 ? '#12131a' : '#ffffff';
}

function initials(team: string): string {
  const words = team.split(/\s+/).filter(Boolean);
  if (words.length === 1) return words[0].slice(0, 3).toUpperCase();
  return words
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase();
}

// --- Fuentes de imágenes --------------------------------------------------

const UNSPLASH_PARAMS = '?auto=format&fit=crop&w=1400&q=72';
const unsplash = (id: string) => `https://images.unsplash.com/photo-${id}${UNSPLASH_PARAMS}`;

/** Fondos de estadio para los partidos de fútbol (van difuminados). */
const FOOTBALL_BG = ['1431324155629-1a6deb1dec8d', '1489944440615-453fc2b6a9a9'];

/** Fotos reales de recintos (en /public/events). */
const BY_VENUE: { test: RegExp; url: string }[] = [
  { test: /dib[oó]s/, url: '/events/coliseo-dibos.jpg' },
  { test: /teatro municipal/, url: '/events/teatro-municipal-lima.jpg' },
  { test: /parque de la exposici/, url: '/events/parque-exposicion.jpg' },
];

/**
 * Plano oficial del recinto (imagen a la que tengas derecho de uso, en
 * /public/events). Si falta el archivo, el checkout usa el plano genérico.
 * La clave se compara como substring del nombre del recinto (sin tildes).
 */
const VENUE_MAPS: Record<string, string> = {
  monumental: '/events/map-monumental.webp',
};

/**
 * Zonas clicables sobre cada plano-imagen (coords 0..100, % del alto/ancho).
 * `match` se compara contra el nombre del sector del evento.
 */
interface HotspotTemplate {
  match: RegExp;
  points: string;
}
const VENUE_MAP_HOTSPOTS: Record<string, HotspotTemplate[]> = {
  monumental: [
    { match: /oriente|este\b/, points: '25,4 75,4 68,24 32,24' },
    { match: /norte|north/, points: '12,26 28,24 28,62 12,56' },
    { match: /familiar|\bsur\b|visitante/, points: '72,24 88,26 88,56 72,62' },
    { match: /lateral\s*a\b|\bocc.*\ba\b/, points: '21,66 30,66 28,90 8,90' },
    { match: /central\s*b\b|\bocc.*\bb\b/, points: '30,66 39,66 42,90 28,90' },
    { match: /central\s*c\b|\bocc.*\bc\b/, points: '39,66 46,66 49,90 42,90' },
    { match: /butaca/, points: '46,57 54,57 55,90 45,90' },
    { match: /central\s*d\b|\bocc.*\bd\b/, points: '54,66 61,66 58,90 51,90' },
    { match: /central\s*e\b|\bocc.*\be\b/, points: '61,66 71,66 76,90 58,90' },
    { match: /lateral\s*f\b|\bocc.*\bf\b/, points: '71,66 79,66 92,90 76,90' },
    { match: /^occidente$/, points: '20,66 80,66 91,90 9,90' },
  ],
};

/**
 * Configuración de planos SVG generados para estadios sin imagen real.
 * Cada entrada define la forma (shape) y cómo mapear los stands.
 */
export type VenueShape =
  | 'oval'
  | 'rectangle'
  | 'octagon'
  | 'theater'
  | 'arena'
  | 'outdoor'
  | 'conference'
  | 'route'
  | 'club';

export function venueShape(venue: string | undefined): VenueShape {
  if (!venue) return 'octagon';
  const v = venue.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  if (/gran teatro|teatro|anfiteatro/.test(v)) return 'theater';
  if (/arena\s*1|coliseo|dibos|costa\s*21|multiespacio/.test(v)) return 'arena';
  if (/circuito/.test(v)) return 'route';
  if (/convenciones|westin/.test(v)) return 'conference';
  if (/jazz zone|club de jazz/.test(v)) return 'club';
  if (/parque de la exposicion|explanada|plaza de armas/.test(v)) return 'outdoor';
  if (/san marcos/.test(v)) return 'rectangle';
  if (/estadio nacional/.test(v)) return 'oval';
  return 'octagon';
}


function venueKey(venue: string): string {
  return venue.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

export function venueMap(venue: string | undefined): string | null {
  if (!venue) return null;
  const key = venueKey(venue);
  for (const k of Object.keys(VENUE_MAPS)) {
    if (key.includes(k)) return VENUE_MAPS[k];
  }
  return null;
}

/** Polígonos clicables para el plano-imagen del recinto (si hay plantilla). */
export function venueHotspots(
  venue: string | undefined,
  zones: { id: string; name: string }[],
): { id: string; points: string }[] {
  if (!venue) return [];
  const key = venueKey(venue);
  const tplKey = Object.keys(VENUE_MAP_HOTSPOTS).find((k) => key.includes(k));
  if (!tplKey) return [];
  const out: { id: string; points: string }[] = [];
  for (const t of VENUE_MAP_HOTSPOTS[tplKey]) {
    const z = zones.find((z) => t.match.test(z.name.toLowerCase()));
    if (z) out.push({ id: z.id, points: t.points });
  }
  return out;
}

/** Emparejamiento por palabra clave (ids Unsplash o rutas locales). */
const BY_KEYWORD: { test: RegExp; ids: string[] }[] = [
  {
    test: /sinf[oó]nic|sinfon[ií]a|orquesta|filarm[oó]nic|c[aá]mara/,
    ids: ['1519683384663-c9b34271669a', '1465847899084-d164df4dedc6'],
  },
  {
    test: /marat[oó]n|running|trote|10k|21k|42k/,
    ids: ['1452626038306-9aae5e071dd3', '1476480862126-209bfaa8edc8'],
  },
  {
    test: /gastron[oó]mic|sabores|feria|food\s*truck|culinari/,
    ids: ['/events/perú.jpg'],
  },
];

const BY_CATEGORY: Record<EventCategory, string[]> = {
  CONCIERTO: [
    '1470229722913-7c0e2dbbafd3',
    '1493225457124-a3eb161ffa5f',
    '1501386761578-eac5c94b800a',
    '1516450360452-9312f5e86fc7',
  ],
  DEPORTE: [
    '1522778119026-d647f0596c20',
    '1431324155629-1a6deb1dec8d',
    '1489944440615-453fc2b6a9a9',
    '1553778263-73a83bab9b0c',
  ],
  TEATRO: [
    '1503095396549-807759245b35',
    '1507924538820-ede94a04019d',
    '1516307365426-bea591f05011',
  ],
  FESTIVAL: [
    '1514525253161-7a46d19cd819',
    '1470225620780-dba8ba36b745',
    '1506157786151-b8491531f063',
    '1459749411175-04bf5292ceea',
  ],
  CONFERENCIA: [
    '1540575467063-178a50c2df87',
    '1587825140708-dfaf72ae4b04',
    '1475721027785-f74eccf877e2',
    '1591115765373-5207764f72e7',
  ],
};

function resolve(ids: string[], seed: string): string {
  const value = pick(ids, seed);
  return value.startsWith('/') ? value : unsplash(value);
}

function pick(ids: string[], seed: string): string {
  return ids[hashCode(seed) % ids.length];
}

function hashCode(str: string): number {
  let h = 0;
  for (let i = 0; i < str.length; i++) {
    h = (Math.imul(31, h) + str.charCodeAt(i)) | 0;
  }
  return h >>> 0;
}

function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
