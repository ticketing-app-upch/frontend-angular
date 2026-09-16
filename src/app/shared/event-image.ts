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
  'parque de la exposicion': '/events/anfiteatro-del-parque-de-la-exposicion-en-peru.jpg',
  'arena 1': '/events/arena-1-costa-verde.png',
};

/**
 * Recintos con dos planos oficiales distintos según el formato del evento
 * (deportivo o concierto), elegidos por los nombres de zona de cada evento.
 * La clave se compara igual que en `VENUE_MAPS` (substring del recinto).
 */
const DUAL_VENUE_MAPS: Record<string, { concierto: string; futbol: string }> = {
  'estadio nacional': {
    concierto: '/events/estadio-nacional-conciertos.png',
    futbol: '/events/estadio-nacional-partidos.png',
  },
  dibos: {
    concierto: '/events/coliseo-dibos-conciertos.png',
    futbol: '/events/coliseo-dibos-partidos.png',
  },
};

function isConcertLayout(zones: { name: string }[]): boolean {
  return zones.some((z) => /^campo\s*a$|^zona vip$|^platinum$/i.test(z.name.trim()));
}

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
  'parque de la exposicion': [
    // Tres tajadas de lado a lado (no franjas de adelante hacia atrás): de
    // la más cercana al escenario (VIP, izquierda) a la más cercana a la
    // laguna (General, derecha), cada una abarcando toda la profundidad de
    // la platea (de la primera a la última fila). El borde de arriba y de
    // abajo sigue la curva real de la platea en la foto; los cortes entre
    // sectores son verticales.
    {
      match: /^vip$/,
      points: '40.5,58.5 47.5,63 53,65.9 53,25.3 47.5,26.5 40.5,31',
    },
    {
      match: /preferencial/,
      points: '53,65.9 55,67 62.5,67.5 66,66.6 66,27 62.5,25.5 55,24.8 53,25.3',
    },
    {
      match: /general/,
      points: '66,66.6 70,65.5 77,57.5 79,48.5 78.5,38 76.5,33.5 69.5,28.5 66,27',
    },
  ],
  'arena 1': [
    { match: /^campo\s*a$/, points: '10.2,21.2 88.4,21.2 88.4,51.5 10.2,51.5' },
    { match: /^campo\s*b$/, points: '10.2,53.4 88.4,53.4 88.4,76.1 10.2,76.1' },
    { match: /^tribuna$/, points: '10.2,77.9 38.6,77.9 38.6,95.7 10.2,95.7' },
    { match: /^tribuna$/, points: '60,77.9 88.4,77.9 88.4,95.7 60,95.7' },
  ],
};

/**
 * Hotspots de los recintos con dos planos-imagen (ver `DUAL_VENUE_MAPS`), uno
 * por formato, elegidos en `venueHotspots` con el mismo criterio
 * (`isConcertLayout`). Cuando un sector aparece dos o más veces en la foto
 * (p. ej. Occidente Central a ambos lados del Palco), se repite la misma
 * zona con varios polígonos distintos.
 */
const DUAL_VENUE_HOTSPOTS: Record<string, Record<'concierto' | 'futbol', HotspotTemplate[]>> = {
  'estadio nacional': {
    concierto: [
      { match: /^or1$/, points: '4.9,32.9 21.1,32.9 21.1,51.7 4.9,51.7' },
      { match: /^campo\s*a$/, points: '24.4,32 75.3,32 75.3,54.5 24.4,54.5' },
      { match: /^occ1$/, points: '78.6,32.9 95.1,32.9 95.1,51.7 78.6,51.7' },
      { match: /^or2$/, points: '4.9,54.8 21.1,54.8 21.1,84.6 4.9,84.6' },
      { match: /^campo\s*b$/, points: '24.4,56.7 75.3,56.7 75.3,83 24.4,83' },
      { match: /^occ2$/, points: '78.6,54.8 95.1,54.8 95.1,84.6 78.6,84.6' },
      {
        match: /^norte$/,
        points:
          '10,77 15,75.7 20,74.6 25,75.3 30,79.7 35,82.3 40,84.1 45,85 50,85.2 55,85 60,83.9 65,82.3 70,79.7 75,75.3 80,74.6 85,75.7 90,77 90,79.9 85,85 80,88.5 75,91.2 70,93.1 65,94.5 60,95.4 55,96 50,96.2 45,96 40,95.4 35,94.5 30,93.1 25,91.2 20,88.7 15,85 10,80.1',
      },
    ],
    futbol: [
      { match: /^oriente central$/, points: '37,7 63,7 63,25 37,25' },
      { match: /^oriente lateral$/, points: '31,7 37,7 37,25 31,25' },
      { match: /^oriente lateral$/, points: '63,7 69,7 69,25 63,25' },
      { match: /^occidente central$/, points: '37,73 48,73 48,96 37,96' },
      { match: /^occidente central$/, points: '51.5,73 62.5,73 62.5,96 51.5,96' },
      { match: /^occidente lateral$/, points: '31,73 37,73 37,96 31,96' },
      { match: /^occidente lateral$/, points: '62.5,73 69,73 69,96 62.5,96' },
      { match: /palco/, points: '48,73 51.5,73 51.5,96 48,96' },
      {
        match: /^norte$/,
        points:
          '16,35.1 18,27.3 20,21.9 22,18.4 24,15.3 26,13 28,11 30,9.9 32,19.6 32,78.3 30,87.6 28,86.6 26,84.5 24,82.2 22,79.1 20,75.6 18,70.2 16,62.6',
      },
      {
        match: /^sur$/,
        points:
          '68,18.2 70,10.7 72,12.4 74,14.3 76,16.5 78,19.8 80,24.2 82,31 84,39 84,59.1 82,66.5 80,73.3 78,77.7 76,81 74,83.3 72,85.1 70,86.8 68,79.3',
      },
    ],
  },
  dibos: {
    concierto: [
      { match: /^general$/, points: '28.3,1 71.4,1 82.2,11.8 17.5,11.8' },
      { match: /^general$/, points: '28.3,99 71.4,99 82.2,88.2 17.5,88.2' },
      { match: /^general$/, points: '0.1,35 12.3,35 12.3,65 0.1,65' },
      { match: /^general$/, points: '87.6,35 99.8,35 99.8,65 87.6,65' },
      { match: /^zona vip$/, points: '35.5,17 64.5,17 71.5,24 28.5,24' },
      { match: /^zona vip$/, points: '35.5,83 64.5,83 71.5,76 28.5,76' },
      { match: /^zona vip$/, points: '16.4,45 25.7,45 25.7,65 16.4,65' },
      { match: /^zona vip$/, points: '74.4,45 83.6,45 83.6,65 74.4,65' },
      { match: /^platinum$/, points: '28.2,30.3 47.6,30.3 47.6,48.1 28.2,48.1' },
      { match: /^platinum$/, points: '52.3,30.3 71.9,30.3 71.9,48.1 52.3,48.1' },
      { match: /^platinum$/, points: '28.2,51.8 47.6,51.8 47.6,69.7 28.2,69.7' },
      { match: /^platinum$/, points: '52.3,51.8 71.9,51.8 71.9,69.7 52.3,69.7' },
    ],
    futbol: [
      { match: /^alta general$/, points: '26.7,19 72.5,19 78.2,27.9 22,27.9' },
      { match: /^alta general$/, points: '2.8,75 96.5,75 70.3,96 29,96' },
      { match: /^alta general$/, points: '0.8,41 13.4,41 13.4,73 0.8,73' },
      { match: /^alta general$/, points: '85.8,41 98.5,41 98.5,73 85.8,73' },
      { match: /^oriente preferencial$/, points: '28.2,22.3 71.2,22.3 71.2,38.5 28.2,38.5' },
      { match: /^occidente preferencial$/, points: '28.1,76.3 71.4,76.3 71.4,92.5 28.1,92.5' },
      { match: /^norte preferencial$/, points: '16.3,40.3 25.7,40.3 25.7,73.7 16.3,73.7' },
      { match: /^sur preferencial$/, points: '74.3,40.3 83.7,40.3 83.7,73.7 74.3,73.7' },
    ],
  },
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

export function venueMap(venue: string | undefined, zones: { name: string }[] = []): string | null {
  if (!venue) return null;
  const key = venueKey(venue);
  const dualKey = Object.keys(DUAL_VENUE_MAPS).find((k) => key.includes(k));
  if (dualKey) {
    const maps = DUAL_VENUE_MAPS[dualKey];
    return isConcertLayout(zones) ? maps.concierto : maps.futbol;
  }
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
  const dualKey = Object.keys(DUAL_VENUE_HOTSPOTS).find((k) => key.includes(k));
  const templates = dualKey
    ? DUAL_VENUE_HOTSPOTS[dualKey][isConcertLayout(zones) ? 'concierto' : 'futbol']
    : VENUE_MAP_HOTSPOTS[Object.keys(VENUE_MAP_HOTSPOTS).find((k) => key.includes(k)) ?? ''];
  if (!templates) return [];
  const out: { id: string; points: string }[] = [];
  for (const t of templates) {
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
