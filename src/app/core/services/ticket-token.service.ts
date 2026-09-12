import { Injectable } from '@angular/core';
import { sha256 } from 'js-sha256';
import { environment } from '../../../enviroments/enviroment';
import { TicketOrder } from '../models/ticket.model';

/** Duración de cada intervalo del QR rotativo (estilo TOTP). */
export const STEP_MS = 30_000;
/** Intervalos de gracia que la puerta acepta hacia atrás/adelante. */
export const STEP_TOLERANCE = 1;
/** Vigencia del pase tras el inicio del evento. */
const GRACE_AFTER_START_MS = 6 * 60 * 60 * 1000;
/** Versión del formato del payload; permite evolucionar sin romper lectores viejos. */
const CLAIM_VERSION = 1;

/**
 * Datos que viajan firmados dentro del QR. Claves cortas para que el código
 * quepa en una versión de QR razonable y siga siendo legible al escanear.
 */
export interface TicketClaims {
  /** versión de formato */ v: number;
  /** id de la orden */ oid: string;
  /** código legible */ cod: string;
  /** id del evento */ eid: string;
  /** nombre del evento (para mostrar en la puerta) */ evt: string;
  /** recinto */ ven: string;
  /** id del comprador */ sub: string;
  /** titular */ who: string;
  /** zona(s) */ zon: string;
  /** n.º de entradas */ qty: number;
  /** emitido (epoch s) */ iat: number;
  /** expira (epoch s) */ exp: number;
  /** intervalo rotativo (floor(ms / STEP_MS)) */ stp: number;
}

export type TicketTokenReason =
  | 'ok'
  | 'not-configured'
  | 'malformed'
  | 'bad-signature'
  | 'expired'
  | 'stale';

export interface TicketTokenCheck {
  reason: TicketTokenReason;
  /** Claims decodificados. Presentes salvo en `not-configured` / `malformed`. */
  claims: TicketClaims | null;
  /** Distancia (en intervalos) entre el QR y la hora actual de la puerta. */
  stepDrift: number;
  /** `true` solo cuando firma, vigencia e intervalo son válidos. */
  valid: boolean;
}

const textEncoder = new TextEncoder();
const textDecoder = new TextDecoder();

function bytesToB64url(bytes: Uint8Array): string {
  let bin = '';
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function b64urlToBytes(value: string): Uint8Array {
  const b64 =
    value.replace(/-/g, '+').replace(/_/g, '/') +
    '==='.slice((value.length + 3) % 4);
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

/** Comparación en tiempo constante para no filtrar la firma byte a byte. */
function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

/**
 * Emite y verifica los pases QR de las entradas.
 *
 * El QR contiene una URL a `/validar` con un token `payload.firma`, donde la
 * firma es un HMAC-SHA256 del payload con `environment.ticketSecret`. Alterar
 * cualquier dato invalida la firma. El campo `stp` rota el código cada
 * {@link STEP_MS} ms, así una captura vieja deja de servir a los pocos
 * segundos (la puerta tolera ±{@link STEP_TOLERANCE} intervalos).
 *
 * En un sistema real esta clase vive en el backend / la app del escáner y la
 * clave nunca llega al navegador; aquí corre en el cliente para poder
 * completar el flujo mientras se integra el servidor.
 */
@Injectable({ providedIn: 'root' })
export class TicketTokenService {
  private readonly secret = environment.ticketSecret ?? '';
  /** Base absoluta para el enlace del QR (sin barra final). Vacío = origen actual. */
  private readonly publicBase = (environment.publicBaseUrl ?? '').replace(
    /\/+$/,
    '',
  );

  get configured(): boolean {
    return environment.useMock && this.secret.length > 0;
  }

  /** Base efectiva del enlace que se codifica en el QR. */
  get linkBase(): string {
    return this.publicBase || location.origin;
  }

  /** Intervalo rotativo vigente para una marca de tiempo dada. */
  step(at: number = Date.now()): number {
    return Math.floor(at / STEP_MS);
  }

  /** Milisegundos restantes hasta que el QR rote al siguiente intervalo. */
  msToNextStep(at: number = Date.now()): number {
    return STEP_MS - (at % STEP_MS);
  }

  /** Construye los claims de una orden para el intervalo actual. */
  claimsForOrder(order: TicketOrder, at: number = Date.now()): TicketClaims {
    const qty = order.lines.reduce((sum, l) => sum + l.quantity, 0);
    const zones = order.lines.map((l) => l.zoneName).join(' + ');
    const startsAt = new Date(order.eventStartsAt).getTime();
    return {
      v: CLAIM_VERSION,
      oid: order.id,
      cod: order.code,
      eid: order.eventId,
      evt: order.eventName,
      ven: order.eventVenue,
      sub: order.buyerId,
      who: order.buyerName,
      zon: zones || '—',
      qty,
      iat: Math.floor(at / 1000),
      exp: Math.floor((startsAt + GRACE_AFTER_START_MS) / 1000),
      stp: this.step(at),
    };
  }

  /** Firma los claims y devuelve el token `payload.firma` (base64url). */
  sign(claims: TicketClaims): string {
    if (!this.configured) throw new Error('Los pases reales deben emitirse desde el backend.');
    const payload = bytesToB64url(textEncoder.encode(JSON.stringify(claims)));
    const mac = bytesToB64url(
      new Uint8Array(sha256.hmac.array(this.secret, payload)),
    );
    return `${payload}.${mac}`;
  }

  /** URL final que se codifica en el QR. El token va en el hash (`#`). */
  ticketUrl(claims: TicketClaims, origin: string = this.linkBase): string {
    return `${origin}/validar#${this.sign(claims)}`;
  }

  /** Atajo: URL del pase de una orden para el intervalo actual. */
  issueUrl(order: TicketOrder, at: number = Date.now()): string {
    return this.ticketUrl(this.claimsForOrder(order, at));
  }

  /** Verifica un token recibido en la puerta. No registra la redención. */
  verify(token: string, at: number = Date.now()): TicketTokenCheck {
    const fail = (
      reason: TicketTokenReason,
      claims: TicketClaims | null = null,
      stepDrift = 0,
    ): TicketTokenCheck => ({ reason, claims, stepDrift, valid: false });

    if (!this.configured) return fail('not-configured');

    const parts = (token ?? '').trim().replace(/^#/, '').split('.');
    if (parts.length !== 2 || !parts[0] || !parts[1]) return fail('malformed');

    const [payload, mac] = parts;
    const expectedMac = bytesToB64url(
      new Uint8Array(sha256.hmac.array(this.secret, payload)),
    );
    if (!timingSafeEqual(mac, expectedMac)) return fail('bad-signature');

    let claims: TicketClaims;
    try {
      claims = JSON.parse(textDecoder.decode(b64urlToBytes(payload)));
    } catch {
      return fail('malformed');
    }

    if (!claims || claims.v !== CLAIM_VERSION || !Number.isFinite(claims.exp) || !Number.isInteger(claims.stp) || !Number.isInteger(claims.qty) || claims.qty < 1 || claims.qty > 6 || typeof claims.oid !== 'string' || typeof claims.cod !== 'string') return fail('malformed');
    const stepDrift = Math.abs(this.step(at) - claims.stp);
    if (typeof claims.exp === 'number' && claims.exp * 1000 < at) {
      return fail('expired', claims, stepDrift);
    }
    if (stepDrift > STEP_TOLERANCE) return fail('stale', claims, stepDrift);

    return { reason: 'ok', claims, stepDrift, valid: true };
  }
}
