/** Trazados referenciales sobre las ilustraciones sin rótulos de Demo 3.
 * Coordenadas en el viewBox de cada recinto, no planos oficiales de butacas.
 */
export interface VenueRegion {
  id: string;
  name: string;
  priceZone: string;
  path: string;
  color?: string;
}

export interface VenueTrace {
  image: string;
  height: number;
  clip?: string;
  regions: VenueRegion[];
}

const region = (name: string, path: string, id = name): VenueRegion => ({ id, name, priceZone: name, path });

const monumental: VenueTrace = {
  image: 'monumental-realista.png', height: 750,
  regions: [
    region('Oriente', 'M250 143 L330 67 L440 30 L560 30 L670 67 L750 143 L715 185 L645 120 L550 96 L450 96 L355 120 L285 185Z'),
    region('Norte', 'M215 150 L285 185 L250 260 L236 365 L250 470 L300 530 L245 625 L170 550 L118 450 L100 360 L120 260 L165 190Z'),
    region('Tribuna Familiar Sur', 'M785 150 L715 185 L750 260 L764 365 L750 470 L700 530 L755 625 L830 550 L882 450 L900 360 L880 260 L835 190Z'),
    region('Occidente Lateral A', 'M245 625 L300 530 L318 535 L318 647 L285 642Z'),
    region('Occidente Central B', 'M318 535 L387 545 L387 660 L318 647Z'),
    region('Occidente Central C', 'M387 545 L456 549 L456 666 L387 660Z'),
    region('Butaca Negra', 'M456 549 L544 549 L544 666 L456 666Z'),
    region('Occidente Central D', 'M544 549 L613 545 L613 660 L544 666Z'),
    region('Occidente Central E', 'M613 545 L682 535 L682 647 L613 660Z'),
    region('Occidente Lateral F', 'M682 535 L700 530 L755 625 L715 642 L682 647Z'),
  ],
};

const costa21 = {
  image: 'costa21-realista.png', height: 750,
  regions: [
    region('Palco Premium', 'M407 177 L611 177 L615 239 L403 239Z'),
    region('VIP', 'M403 239 L615 239 L620 371 L399 371Z'),
    region('General', 'M399 371 L620 371 L630 492 L390 492Z'),
  ],
} satisfies VenueTrace;

export const VENUE_TRACES: Record<string, VenueTrace> = {
  'estadio-monumental-zonas.png': monumental,
  'estadio-nacional-zonas.png': {
    image: 'nacional-realista.png', height: 750,
    regions: [
      region('Tribuna Norte', 'M178 155 L260 117 L287 235 L238 275 L206 365 L225 470 L290 570 L215 638 L132 560 L75 450 L57 345 L86 245Z'),
      region('Oriente', 'M260 117 L380 71 L500 56 L620 71 L728 117 L700 177 L615 140 L500 127 L385 140 L287 235Z'),
      region('Occidente', 'M290 570 L385 615 L500 625 L615 615 L710 570 L790 638 L685 690 L500 717 L315 690 L215 638Z'),
      region('VIP', 'M287 235 L385 215 L385 505 L290 570 L225 470 L206 365 L238 275Z'),
      region('Platinum', 'M385 215 L615 215 L615 505 L385 505Z'),
    ],
  },
  'estadio-san-marcos-zonas.png': {
    image: 'san-marcos-realista.png', height: 750,
    regions: [
      region('Norte', 'M155 154 L235 125 L280 222 L230 280 L205 375 L230 465 L280 530 L230 635 L120 540 L65 430 L58 330 L90 230Z'),
      region('Oriente', 'M235 125 L350 75 L500 55 L650 75 L765 125 L725 185 L635 135 L500 120 L365 135 L280 222Z'),
      region('Occidente', 'M280 530 L365 610 L500 630 L635 610 L720 530 L770 635 L650 690 L500 715 L350 690 L230 635Z'),
      region('VIP', 'M280 222 L365 202 L485 210 L485 500 L365 510 L280 530 L230 465 L205 375 L230 280Z'),
      region('Platinum', 'M505 210 L635 202 L725 185 L770 280 L795 375 L770 465 L720 530 L635 510 L505 500Z'),
    ],
  },
  'arena-1-costa-verde.png': {
    image: 'arena1-realista.png', height: 579,
    clip: 'M14 0H990L990 101L995 150L986 175L930 184L905 177L905 376L940 448L995 485L990 507L935 553L825 575L750 570L650 555L570 548L455 533L300 515L220 498L5 412L10 348L80 360L135 290L170 223L125 209L70 125L67 115L18 103Z',
    regions: [
      region('VIP', 'M354 188 L434 175 L434 324 L354 320 L336 244Z'),
      region('General', 'M445 175 L706 182 L706 345 L445 325Z'),
    ],
  },
  'centro-de-convenciones-de-lima.png': {
    image: 'ccl-realista.png', height: 750,
    clip: 'M33 68L915 68L935 211L954 277L954 636L905 640L905 671L36 671L32 589Z',
    regions: [
      region('General', 'M93 220 L356 220 L356 469 L93 469Z'),
      region('Pro (incluye talleres)', 'M706 223 L903 223 L903 501 L706 501Z'),
    ],
  },
  'circuito-costa-verde.png': {
    image: 'circuito-realista.png', height: 750,
    regions: [
      region('Reto 10K', 'M35 66 L130 105 L225 155 L315 203 L299 225 L205 175 L115 128 L25 90Z'),
      region('Inscripción 21K', 'M315 203 L410 250 L505 300 L635 356 L622 378 L490 321 L395 273 L299 225Z'),
      region('Inscripción 42K', 'M635 356 L750 415 L855 465 L975 523 L963 549 L840 488 L735 437 L622 378Z'),
    ],
  },
  'coliseo-eduardo-dibos.png': {
    image: 'dibos-realista.png', height: 750,
    clip: 'M161 203L338 19L663 19L842 204L911 342L911 515L660 733L338 733L89 515L89 342Z',
    regions: [
      region('Oriente', 'M350 35 L650 35 L755 157 L654 210 L346 210 L245 157Z'),
      region('Occidente', 'M346 540 L654 540 L755 593 L650 715 L350 715 L245 593Z'),
      region('Populares', 'M145 218 L245 157 L315 220 L315 530 L245 593 L105 505 L105 345Z M855 218 L755 157 L685 220 L685 530 L755 593 L895 505 L895 345Z'),
    ],
  },
  'explanada-costa-verde-costa-21-san-miguel.png': costa21,
  'explanada-costa-verde-costa-21-san-miguel-feria.png': {
    image: 'costa21-realista.png', height: 750,
    regions: [
      region('Pase degustación', 'M401 178 L615 178 L617 336 L398 336Z'),
      region('Entrada general', 'M398 336 L617 336 L627 492 L389 492Z'),
    ],
  },
  'gran-teatro-nacional.png': {
    image: 'gtn-realista.png', height: 750,
    regions: [
      region('Platea', 'M320 85 L680 85 L755 255 L670 305 L330 305 L245 255Z'),
      region('Balcón', 'M245 305 L330 325 L670 325 L755 305 L830 455 L730 505 L270 505 L170 455Z'),
      region('Galería', 'M170 520 L270 540 L730 540 L830 520 L905 665 L790 715 L210 715 L95 665Z'),
    ],
  },
  'jazz-zone-miraflores.png': {
    image: 'jazz-realista.png', height: 750,
    regions: [
      region('Mesa', 'M90 250 L832 250 L832 660 L90 660Z'),
      region('Barra', 'M862 125 L930 125 L930 655 L862 655Z'),
    ],
  },
  'parque-de-la-exposicion.png': {
    image: 'parque-realista.png', height: 750,
    regions: [
      region('Platea', 'M365 120 L635 120 L700 155 L750 235 L680 270 L610 280 L390 280 L320 270 L250 235 L300 155Z'),
      region('Palco', 'M250 235 L320 270 L390 280 L610 280 L680 270 L750 235 L845 350 L740 415 L625 440 L375 440 L260 415 L155 350Z'),
      region('Campo', 'M155 350 L260 415 L375 440 L625 440 L740 415 L845 350 L935 485 L900 590 L720 640 L500 655 L280 640 L100 590 L65 485Z'),
    ],
  },
  'plaza-de-armas-de-lima.png': {
    image: 'plaza-realista.png', height: 750,
    regions: [
      region('Platea', 'M135 345 L435 345 L435 620 L135 620Z'),
      region('General', 'M565 145 L850 145 L850 405 L565 405Z'),
    ],
  },
  'teatro-la-plaza.png': {
    image: 'laplaza-realista.png', height: 750,
    regions: [
      region('Platea', 'M248 190 L752 190 L752 450 L248 450Z'),
      region('Mezzanine', 'M248 465 L752 465 L752 645 L248 645Z'),
    ],
  },
  'teatro-municipal.png': {
    image: 'municipal-realista.png', height: 750,
    regions: [
      region('Galería', 'M155 175 L250 90 L365 40 L500 20 L635 40 L750 90 L845 175 L805 245 L715 175 L615 125 L500 105 L385 125 L285 175 L195 245Z'),
      region('Platea alta', 'M195 255 L285 190 L385 140 L500 120 L615 140 L715 190 L805 255 L750 390 L660 330 L585 285 L500 270 L415 285 L340 330 L250 390Z'),
      region('Platea baja', 'M250 405 L340 345 L415 300 L500 285 L585 300 L660 345 L750 405 L705 570 L610 530 L500 510 L390 530 L295 570Z'),
    ],
  },
  'the-westin-lima.png': {
    image: 'westin-realista.png', height: 750,
    clip: 'M64 25L200 25L200 92L130 92L130 306L186 346L397 346L397 451L557 451L557 389L647 389L647 411L758 411L758 293L914 293L914 408L941 477L941 675L622 675L622 530L435 530L435 675L167 675L60 449L176 449L130 383L64 306Z',
    regions: [
      region('General', 'M170 525 L440 525 L440 665 L175 665 L105 565Z'),
      region('Premium (networking)', 'M625 525 L755 525 L755 455 L900 455 L930 515 L930 665 L625 665Z'),
    ],
  },
};

export function traceFor(image: string | null): VenueTrace | null {
  return VENUE_TRACES[image?.split('/').at(-1) ?? ''] ?? null;
}
