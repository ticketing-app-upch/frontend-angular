import { HttpClient } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { Observable, tap } from 'rxjs';
import { Router } from '@angular/router';
import { environment } from '../../../enviroments/enviroment';
import { MockStore } from '../mock/mock-store';
import { mockError, mockResponse } from '../mock/mock-latency';
import {
  AuthResponse,
  LoginPayload,
  RegisterPayload,
  User,
} from '../models/user.model';

const TOKEN_KEY = 'tkt.token';
const USER_KEY = 'tkt.user';
const SESSION_DURATION_MS = 8 * 60 * 60 * 1000;

@Injectable({ providedIn: 'root' })
export class AuthService {
  private http = inject(HttpClient);
  private store = inject(MockStore);
  private base = environment.apiBackendUrl;
  private router = inject(Router);
  private expiryTimer: ReturnType<typeof setTimeout> | null = null;
  private expiryRedirectPending = false;
  private readonly _sessionExpired = signal(false);
  readonly sessionExpired = this._sessionExpired.asReadonly();

  private readonly _user = signal<User | null>(this.restoreUser());
  private readonly _token = signal<string | null>(this.restoreToken());

  readonly user = this._user.asReadonly();
  readonly isAuthenticated = computed(() => this._user() !== null && this._token() !== null);
  readonly isOrganizer = computed(() => this._user()?.role === 'ORGANIZER');
  readonly isClient = computed(() => this._user()?.role === 'CLIENT');
  readonly isAdmin = computed(() => this._user()?.role === 'ADMIN');

  constructor() {
    const stored = this.storedToken();
    if (stored && !sessionTokenValid(stored)) this.expireSession(false);
    else this.scheduleExpiry();
  }

  get token(): string | null {
    const token = this._token();
    if (token && !sessionTokenValid(token)) { this.expireSession(false); return null; }
    return token;
  }

  login(payload: LoginPayload): Observable<AuthResponse> {
    const req = environment.useMockAuth
      ? this.mockLogin(payload)
      : this.http.post<AuthResponse>(`${this.base}/auth/login`, payload);
    return req.pipe(tap((res) => this.persistSession(res, payload.remember ?? true)));
  }

  register(payload: RegisterPayload): Observable<AuthResponse> {
    const req = environment.useMockAuth
      ? this.mockRegister(payload)
      : this.http.post<AuthResponse>(`${this.base}/auth/register`, payload);
    return req.pipe(tap((res) => this.persistSession(res)));
  }

  logout(): void {
    if (this.expiryTimer !== null) clearTimeout(this.expiryTimer);
    this.expiryTimer = null;
    this.expiryRedirectPending = false;
    this._sessionExpired.set(false);
    this._token.set(null);
    this._user.set(null);
    for (const storage of [localStorage, sessionStorage]) {
      try {
        storage.removeItem(TOKEN_KEY);
        storage.removeItem(USER_KEY);
      } catch { /* La sesión en memoria ya fue eliminada. */ }
    }
  }

  /** Cierra una sesión vencida o rechazada por el backend. */
  expireSession(redirectToLogin = true): void {
    if (!this._sessionExpired()) {
      this.logout();
      this._sessionExpired.set(true);
    }
    if (!redirectToLogin || this.expiryRedirectPending) return;
    this.expiryRedirectPending = true;
    queueMicrotask(() => {
      this.expiryRedirectPending = false;
      if (!this._sessionExpired()) return;
      const current = this.router.url;
      const redirect = current !== '/' && !current.startsWith('/auth/') ? current : null;
      void this.router.navigate(['/auth/login'], {
        queryParams: { reason: 'expired', ...(redirect ? { redirect } : {}) },
        replaceUrl: true,
      });
    });
  }

  private scheduleExpiry(): void {
    if (this.expiryTimer !== null) clearTimeout(this.expiryTimer);
    this.expiryTimer = null;
    const token = this._token();
    if (!token) return;
    const expiresAt = sessionExpiresAt(token);
    if (expiresAt === null || expiresAt <= Date.now()) {
      this.expireSession();
      return;
    }
    this.expiryTimer = setTimeout(() => {
      if (this._token() && !sessionTokenValid(this._token()!)) this.expireSession();
      else this.scheduleExpiry();
    }, Math.min(expiresAt - Date.now(), 2_147_483_647));
  }

  private storedToken(): string | null {
    try { return sessionStorage.getItem(TOKEN_KEY) ?? localStorage.getItem(TOKEN_KEY); }
    catch { return null; }
  }

  // --- Sesión ---------------------------------------------------------
  private persistSession(res: AuthResponse, remember = true): void {
    this.logout();
    this._token.set(res.token);
    this._user.set(res.user);
    try {
      const storage = remember ? localStorage : sessionStorage;
      storage.setItem(TOKEN_KEY, res.token);
      storage.setItem(USER_KEY, JSON.stringify(res.user));
    } catch {
      /* almacenamiento no disponible */
    }
    this.scheduleExpiry();
  }

  private restoreToken(): string | null {
    try {
      const token = this.storedToken();
      return token && sessionTokenValid(token) ? token : null;
    } catch {
      return null;
    }
  }

  private restoreUser(): User | null {
    try {
      if (!this.restoreToken()) return null;
      const raw = sessionStorage.getItem(USER_KEY) ?? localStorage.getItem(USER_KEY);
      const user = raw ? JSON.parse(raw) as User : null;
      return user && typeof user.id === 'string' && typeof user.fullName === 'string' && ['CLIENT', 'ORGANIZER', 'ADMIN'].includes(user.role) ? user : null;
    } catch {
      return null;
    }
  }

  // --- Implementación mock -----------------------------------------------
  private mockLogin(payload: LoginPayload): Observable<AuthResponse> {
    const found = this.store.users.find(
      (u) => u.email.toLowerCase() === payload.email.trim().toLowerCase(),
    );
    if (!found || found.password !== payload.password) {
      return mockError<AuthResponse>('Credenciales inválidas.', 401);
    }
    if (found.active === false) {
      return mockError<AuthResponse>('Esta cuenta fue inhabilitada. Contacta a soporte.', 403);
    }
    return mockResponse(this.toAuthResponse(found));
  }

  private mockRegister(payload: RegisterPayload): Observable<AuthResponse> {
    if (!['CLIENT', 'ORGANIZER'].includes(payload.role) || !payload.acceptedTerms) return mockError('Rol o aceptación de términos inválidos.', 422);
    const email = payload.email.trim().toLowerCase();
    if (this.store.users.some((u) => u.email.toLowerCase() === email)) {
      return mockError<AuthResponse>('Ya existe una cuenta con ese correo.', 409);
    }
    const user: User & { password: string } = {
      id: `u-${crypto.randomUUID().slice(0, 8)}`,
      fullName: payload.fullName.trim(),
      email,
      role: payload.role,
      password: payload.password,
      marketingOptIn: payload.marketingOptIn,
    };
    if (payload.role === 'CLIENT' && payload.profile) {
      user.profile = payload.profile;
    }
    if (payload.role === 'ORGANIZER' && payload.organizer) {
      user.organizer = {
        ...payload.organizer,
        // En un backend real quedaría 'PENDING' hasta revisión.
        // Se verifica al registrarla para habilitar la publicación.
        verificationStatus: 'VERIFIED',
      };
    }
    this.store.addUser(user);
    return mockResponse(this.toAuthResponse(user));
  }

  private toAuthResponse(user: User): AuthResponse {
    const { id, fullName, email, role, organizer, profile, marketingOptIn } = user;
    return {
      token: `mock.${btoa(`${id}:${role}`)}.${Date.now()}`,
      user: { id, fullName, email, role, organizer, profile, marketingOptIn },
    };
  }
}

/** Solo vencimiento para UX; la autenticidad del JWT debe verificarse en el servidor. */
export function sessionExpiresAt(token: string): number | null {
  if (token.startsWith('mock.')) {
    if (!environment.useMockAuth) return null;
    const issuedAt = Number(token.split('.')[2]);
    return Number.isFinite(issuedAt) && issuedAt > 0 ? issuedAt + SESSION_DURATION_MS : null;
  }
  try {
    const payload = JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')));
    if (typeof payload.exp !== 'number' || !Number.isFinite(payload.exp)) return null;
    const expiresAt = payload.exp * 1000;
    return typeof payload.iat === 'number' && Number.isFinite(payload.iat)
      ? Math.min(expiresAt, payload.iat * 1000 + SESSION_DURATION_MS)
      : expiresAt;
  } catch { return null; }
}

export function sessionTokenValid(token: string, now = Date.now()): boolean {
  const expiresAt = sessionExpiresAt(token);
  if (expiresAt === null || expiresAt <= now) return false;
  if (token.startsWith('mock.')) return Number(token.split('.')[2]) <= now;
  return true;
}
