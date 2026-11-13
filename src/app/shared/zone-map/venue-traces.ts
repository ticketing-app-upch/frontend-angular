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

const rect = (x1: number, y1: number, x2: number, y2: number) =>
  `M${x1} ${y1}H${x2}V${y2}H${x1}Z`;
const region = (name: string, path: string, id = name): VenueRegion => ({ id, name, priceZone: name, path });

const monumental: VenueTrace = {
  image: 'monumental-realista.png', height: 750,
  regions: [
    region('Oriente', 'M165 126 Q500 -22 835 126 L750 167 Q500 108 250 167Z'),
    region('Norte', 'M165 126 L250 167 Q225 228 225 375 Q225 460 270 511 L174 607 Q90 505 90 376 Q90 208 165 126Z'),
    region('Tribuna Familiar Sur', 'M835 126 L750 167 Q790 231 790 377 Q790 463 739 511 L832 607 Q925 494 925 376 Q925 214 835 126Z'),
    region('Occidente Lateral A', 'M174 607 L270 511 L338 523 L300 681 Q230 652 174 607Z'),
    region('Occidente Central B', 'M270 511 L338 523 L385 529 L385 691 L300 681Z'),
    region('Occidente Central C', 'M385 529 L455 529 L455 696 L385 691Z'),
    region('Butaca Negra', 'M455 529 L545 529 L545 696 L455 696Z'),
    region('Occidente Central D', 'M545 529 L615 529 L615 691 L545 696Z'),
    region('Occidente Central E', 'M615 529 L662 523 L730 511 L700 681 L615 691Z'),
    region('Occidente Lateral F', 'M730 511 L832 607 Q770 652 700 681 L730 511Z'),
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
      region('Tribuna Norte', 'M164 135 L278 184 Q244 281 244 374 Q244 480 280 555 L163 625 Q77 515 77 374 Q77 230 164 135Z'),
      region('Oriente', 'M164 135 Q500 -18 836 135 L732 184 Q500 108 278 184Z'),
      region('Occidente', 'M163 625 L280 555 Q500 618 720 555 L837 625 Q500 786 163 625Z'),
      region('VIP', 'M278 184 L397 197 L397 554 L280 555 Q244 480 244 374 Q244 281 278 184Z'),
      region('Platinum', 'M397 197 L732 184 Q767 282 767 374 Q767 479 720 555 L397 554Z'),
    ],
  },
  'estadio-san-marcos-zonas.png': {
    image: 'san-marcos-realista.png', height: 750,
    regions: [
      region('Norte', 'M164 136 L278 186 Q242 279 242 373 Q242 482 278 552 L164 625 Q76 515 76 373 Q76 228 164 136Z'),
      region('Oriente', 'M164 136 Q500 -13 837 136 L727 183 Q500 110 278 186Z'),
      region('Occidente', 'M164 625 L278 552 Q500 614 726 552 L837 625 Q500 782 164 625Z'),
      region('VIP', 'M278 186 L473 194 L473 552 L278 552 Q242 482 242 373 Q242 279 278 186Z'),
      region('Platinum', 'M473 194 L727 183 Q767 279 767 373 Q767 482 726 552 L473 552Z'),
    ],
  },
  'arena-1-costa-verde.png': {
    image: 'arena1-realista.png', height: 579,
    clip: 'M14 0H990L990 101L995 150L986 175L930 184L905 177L905 376L940 448L995 485L990 507L935 553L825 575L750 570L650 555L570 548L455 533L300 515L220 498L5 412L10 348L80 360L135 290L170 223L125 209L70 125L67 115L18 103Z',
    regions: [
      region('VIP', 'M379 177 L443 167 L445 332 L350 330 L330 246Z'),
      region('General', 'M445 167 L707 176 L707 351 L445 332Z'),
    ],
  },
  'centro-de-convenciones-de-lima.png': {
    image: 'ccl-realista.png', height: 750,
    clip: 'M33 68L915 68L935 211L954 277L954 636L905 640L905 671L36 671L32 589Z',
    regions: [
      region('General', 'M79 199 L369 199 L369 474 L79 474Z'),
      region('Pro (incluye talleres)', 'M699 213 L910 213 L910 508 L699 508Z'),
    ],
  },
  'circuito-costa-verde.png': {
    image: 'circuito-realista.png', height: 750,
    regions: [
      region('Reto 10K', 'M50 236 Q170 277 322 331 L299 372 Q166 322 50 280Z'),
      region('Inscripción 21K', 'M299 331 Q487 381 643 459 L622 499 Q459 419 299 372Z'),
      region('Inscripción 42K', 'M643 459 Q801 536 963 573 L963 615 Q779 574 622 499Z'),
    ],
  },
  'coliseo-eduardo-dibos.png': {
    image: 'dibos-realista.png', height: 750,
    clip: 'M161 203L338 19L663 19L842 204L911 342L911 515L660 733L338 733L89 515L89 342Z',
    regions: [
      region('Oriente', 'M336 27L664 27L756 161L663 216L337 216L244 161Z'),
      region('Occidente', 'M336 533L664 533L756 607L664 723L336 723L244 607Z'),
      region('Populares', 'M161 203L244 161L337 216L337 533L244 607L89 515L89 342Z'),
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
      region('Platea', 'M229 125 Q500 54 771 125 L814 315 Q500 421 186 315Z'),
      region('Balcón', 'M182 315 Q500 421 818 315 L876 501 Q500 615 124 501Z'),
      region('Galería', 'M124 501 Q500 615 876 501 L951 713 Q500 792 49 713Z'),
    ],
  },
  'jazz-zone-miraflores.png': {
    image: 'jazz-realista.png', height: 750,
    regions: [
      region('Mesa', 'M68 232 L851 232 L851 666 L68 666Z'),
      region('Barra', 'M856 169 L950 169 L950 673 L856 673Z'),
    ],
  },
  'parque-de-la-exposicion.png': {
    image: 'parque-realista.png', height: 750,
    regions: [
      region('Platea', 'M345 160 Q500 245 655 160 L705 319 Q500 415 295 319Z'),
      region('Palco', 'M295 319 Q500 415 705 319 L829 452 Q500 591 171 452Z'),
      region('Campo', 'M171 452 Q500 591 829 452 L950 588 Q500 806 50 588Z'),
    ],
  },
  'plaza-de-armas-de-lima.png': {
    image: 'plaza-realista.png', height: 750,
    regions: [
      region('Platea', 'M125 397 L479 397 L479 650 L125 650Z'),
      region('General', 'M520 120 L865 120 L865 425 L520 425Z'),
    ],
  },
  'teatro-la-plaza.png': {
    image: 'laplaza-realista.png', height: 750,
    regions: [
      region('Platea', 'M238 185 L762 185 L762 451 L238 451Z'),
      region('Mezzanine', 'M238 451 L762 451 L762 659 L238 659Z'),
    ],
  },
  'teatro-municipal.png': {
    image: 'municipal-realista.png', height: 750,
    regions: [
      region('Galería', 'M55 91 Q500 -52 945 91 L883 235 Q500 74 117 235Z'),
      region('Platea alta', 'M117 235 Q500 74 883 235 L787 418 Q500 275 213 418Z'),
      region('Platea baja', 'M213 418 Q500 275 787 418 L719 602 Q500 522 281 602Z'),
    ],
  },
  'the-westin-lima.png': {
    image: 'westin-realista.png', height: 750,
    clip: 'M64 25L200 25L200 92L130 92L130 306L186 346L397 346L397 451L557 451L557 389L647 389L647 411L758 411L758 293L914 293L914 408L941 477L941 675L622 675L622 530L435 530L435 675L167 675L60 449L176 449L130 383L64 306Z',
    regions: [
      region('General', 'M179 354 L402 354 L402 453 L444 494 L445 675 L171 675 L59 448 L178 448Z'),
      region('Premium (networking)', 'M618 512 L750 512 L750 416 L914 416 L941 478 L941 675 L618 675Z'),
    ],
  },
};

export function traceFor(image: string | null): VenueTrace | null {
  return VENUE_TRACES[image?.split('/').at(-1) ?? ''] ?? null;
}
