/**
 * Distrito de Lima/Callao donde queda cada recinto, para agrupar eventos en
 * el mapa del panel del organizador. Se compara como substring del nombre
 * del recinto (sin tildes, minúsculas), igual que `BY_VENUE` en
 * `event-image.ts`. Coordenadas aproximadas de uso público (sede conocida
 * del recinto); si un recinto no aparece aquí, sus eventos no se ubican.
 */
const VENUE_DISTRICT: { test: RegExp; district: string }[] = [
  { test: /estadio nacional/, district: 'Cercado de Lima' },
  { test: /plaza de armas/, district: 'Cercado de Lima' },
  { test: /teatro municipal/, district: 'Cercado de Lima' },
  { test: /parque de la exposici[oó]n/, district: 'Cercado de Lima' },
  { test: /san marcos/, district: 'Cercado de Lima' },
  { test: /centro de convenciones/, district: 'San Borja' },
  { test: /dib[oó]s/, district: 'San Borja' },
  { test: /gran teatro nacional/, district: 'San Borja' },
  { test: /westin/, district: 'San Isidro' },
  { test: /jazz zone/, district: 'Miraflores' },
  { test: /teatro la plaza/, district: 'Miraflores' },
  { test: /explanada costa verde/, district: 'Miraflores' },
  { test: /circuito costa verde/, district: 'Miraflores' },
  { test: /arena\s*1/, district: 'San Miguel' },
  { test: /costa\s*21/, district: 'San Miguel' },
  { test: /estadio monumental/, district: 'Ate' },
  { test: /teatro peruano japon[eé]s/, district: 'Jesús María' },
  { test: /villanueva/, district: 'La Victoria' },
  { test: /alberto gallardo/, district: 'La Victoria' },
  { test: /iv[aá]n el[ií]as moreno/, district: 'Callao' },
];

function normalize(venue: string): string {
  return venue
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '');
}

/** Distrito conocido para el recinto, o `null` si no está registrado. */
export function districtForVenue(venue: string): string | null {
  const v = normalize(venue);
  for (const rule of VENUE_DISTRICT) {
    if (rule.test.test(v)) return rule.district;
  }
  return null;
}
