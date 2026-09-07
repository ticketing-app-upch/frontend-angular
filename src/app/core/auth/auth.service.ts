import { HttpClient } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { Observable, tap } from 'rxjs';
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

@Injectable({ providedIn: 'root' })
export class AuthService {
  private http = inject(HttpClient);
  private store = inject(MockStore);
  private base = environment.apiBackendUrl;

  private readonly _user = signal<User | null>(this.restoreUser());
  private readonly _token = signal<string | null>(this.restoreToken());

  readonly user = this._user.asReadonly();
  readonly isAuthenticated = computed(() => this._token() !== null);
  readonly isOrganizer = computed(() => this._user()?.role === 'ORGANIZER');
  readonly isClient = computed(() => this._user()?.role === 'CLIENT');

  get token(): string | null {
    return this._token();
  }

  login(payload: LoginPayload): Observable<AuthResponse> {
    const req = environment.useMock
      ? this.mockLogin(payload)
      : this.http.post<AuthResponse>(`${this.base}/auth/login`, payload);
    return req.pipe(tap((res) => this.persistSession(res)));
  }

  register(payload: RegisterPayload): Observable<AuthResponse> {
    const req = environment.useMock
      ? this.mockRegister(payload)
      : this.http.post<AuthResponse>(`${this.base}/auth/register`, payload);
    return req.pipe(tap((res) => this.persistSession(res)));
  }

  logout(): void {
    this._token.set(null);
    this._user.set(null);
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
  }

  // --- Sesión ---------------------------------------------------------
  private persistSession(res: AuthResponse): void {
    this._token.set(res.token);
    this._user.set(res.user);
    try {
      localStorage.setItem(TOKEN_KEY, res.token);
      localStorage.setItem(USER_KEY, JSON.stringify(res.user));
    } catch {
      /* almacenamiento no disponible */
    }
  }

  private restoreToken(): string | null {
    try {
      return localStorage.getItem(TOKEN_KEY);
    } catch {
      return null;
    }
  }

  private restoreUser(): User | null {
    try {
      const raw = localStorage.getItem(USER_KEY);
      return raw ? (JSON.parse(raw) as User) : null;
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
    return mockResponse(this.toAuthResponse(found));
  }

  private mockRegister(payload: RegisterPayload): Observable<AuthResponse> {
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
        // Para la demo la dejamos verificada para poder publicar.
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
