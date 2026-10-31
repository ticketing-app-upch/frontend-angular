export interface ZoneLabelArea { x: number; y: number; w: number; h: number; }
export const ZONE_LABEL_AREAS: Record<string, Record<string, ZoneLabelArea>> = {
  'recinto-prueba.svg': {
    'General': { x: 35, y: 45, w: 30, h: 12 },
  },
  'arena-1-costa-verde.png': {
    'General': { x: 50.5, y: 42.111, w: 14.375, h: 5.889 },
    'VIP': { x: 30.625, y: 35.222, w: 11.875, h: 5.889 },
  },
  'centro-de-convenciones-de-lima.png': {
    'General': { x: 30.5, y: 45.111, w: 13.75, h: 5.889 },
    'Pro (incluye talleres)': { x: 56.938, y: 46.111, w: 18.75, h: 5.889 },
  },
  'circuito-costa-verde.png': {
    'Reto 10K': { x: 25.125, y: 19.333, w: 14.062, h: 5.889 },
    'Inscripción 21K': { x: 43.938, y: 31.222, w: 16.562, h: 5.889 },
    'Inscripción 42K': { x: 61.0, y: 49.0, w: 16.562, h: 5.889 },
  },
  'coliseo-eduardo-dibos.png': {
    'Occidente': { x: 42.938, y: 76.667, w: 14.062, h: 5.889 },
    'Oriente': { x: 43.125, y: 17.333, w: 13.75, h: 5.889 },
    'Populares': { x: 20.125, y: 48.0, w: 13.75, h: 5.889 },
  },
  'explanada-costa-verde-costa-21-san-miguel.png': {
    'General': { x: 44.438, y: 58.889, w: 14.062, h: 5.889 },
    'VIP': { x: 45.812, y: 34.222, w: 11.25, h: 5.889 },
    'Palco Premium': { x: 43.0, y: 19.333, w: 16.875, h: 5.889 },
  },
  'explanada-costa-verde-costa-21-san-miguel-feria.png': {
    'Entrada general': { x: 41.938, y: 55.0, w: 17.5, h: 5.889 },
    'Pase degustación': { x: 41.625, y: 29.222, w: 18.125, h: 5.889 },
  },
  'gran-teatro-nacional.png': {
    'Platea': { x: 43.0, y: 25.333, w: 12.5, h: 5.889 },
    'Balcón': { x: 42.25, y: 46.111, w: 12.5, h: 5.889 },
    'Galería': { x: 42.812, y: 65.889, w: 12.812, h: 5.889 },
  },
  'jazz-zone-miraflores.png': {
    'Mesa': { x: 40.812, y: 54.0, w: 10.938, h: 5.889 },
    'Barra': { x: 68.25, y: 42.111, w: 10.938, h: 5.889 },
  },
  'parque-de-la-exposicion.png': {
    'Platea': { x: 44.188, y: 34.222, w: 11.562, h: 5.889 },
    'Palco': { x: 22.25, y: 51.0, w: 10.938, h: 5.889 },
    'Campo': { x: 47.875, y: 69.778, w: 11.562, h: 5.889 },
  },
  'plaza-de-armas-de-lima.png': {
    'Platea': { x: 33.625, y: 60.889, w: 11.875, h: 5.889 },
    'General': { x: 57.062, y: 34.222, w: 12.5, h: 5.889 },
  },
  'teatro-la-plaza.png': {
    'Platea': { x: 43.75, y: 45.111, w: 12.5, h: 5.889 },
    'Mezzanine': { x: 42.938, y: 74.778, w: 14.062, h: 5.889 },
  },
  'teatro-municipal.png': {
    'Platea baja': { x: 42.0, y: 72.778, w: 15.938, h: 5.889 },
    'Platea alta': { x: 42.0, y: 52.0, w: 15.938, h: 5.889 },
    'Galería': { x: 43.375, y: 28.222, w: 13.125, h: 5.889 },
  },
  'the-westin-lima.png': {
    'General': { x: 31.938, y: 52.0, w: 13.75, h: 5.889 },
    'Premium (networking)': { x: 53.625, y: 55.0, w: 19.375, h: 5.889 },
  },
  'estadio-monumental-zonas.png': {
    'Occidente Lateral A': { x: 30.0, y: 70.444, w: 8.75, h: 6.667 },
    'Occidente Central B': { x: 35.188, y: 80.333, w: 8.75, h: 6.667 },
    'Occidente Central C': { x: 40.375, y: 70.444, w: 8.75, h: 6.667 },
    'Butaca Negra': { x: 45.625, y: 80.667, w: 8.75, h: 5.889 },
    'Occidente Central D': { x: 50.812, y: 70.444, w: 8.75, h: 6.667 },
    'Occidente Central E': { x: 56.0, y: 80.333, w: 8.75, h: 6.667 },
    'Occidente Lateral F': { x: 61.188, y: 70.444, w: 8.75, h: 6.667 },
    'Oriente': { x: 42.625, y: 12.444, w: 14.688, h: 5.889 },
    'Norte': { x: 20.0, y: 44.111, w: 10.938, h: 5.889 },
    'Tribuna Familiar Sur': { x: 68.188, y: 44.111, w: 14.062, h: 5.889 },
  },
  'estadio-nacional-zonas.png': {
    'Tribuna Norte': { x: 17.25, y: 45.111, w: 15.0, h: 5.889 },
    'Oriente': { x: 43.562, y: 13.444, w: 12.812, h: 5.889 },
    'Occidente': { x: 43.125, y: 80.667, w: 13.75, h: 5.889 },
    'VIP': { x: 32.062, y: 47.111, w: 10.625, h: 5.889 },
    'Platinum': { x: 45.062, y: 45.111, w: 12.812, h: 5.889 },
  },
  'estadio-san-marcos-zonas.png': {
    'Norte': { x: 19.438, y: 45.111, w: 10.625, h: 5.889 },
    'Oriente': { x: 42.812, y: 13.444, w: 12.812, h: 5.889 },
    'Occidente': { x: 42.375, y: 79.667, w: 13.75, h: 5.889 },
    'VIP': { x: 34.0, y: 46.111, w: 9.688, h: 5.889 },
    'Platinum': { x: 50.25, y: 46.111, w: 12.812, h: 5.889 },
  },
};
