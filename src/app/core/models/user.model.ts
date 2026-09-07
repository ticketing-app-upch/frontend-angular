export type UserRole = 'CLIENT' | 'ORGANIZER';

export type OrganizerType = 'PERSONA' | 'EMPRESA';

export type VerificationStatus = 'PENDING' | 'VERIFIED' | 'REJECTED';

export type DocType = 'DNI' | 'CE' | 'PASAPORTE';

export type Gender = 'F' | 'M';

/** Datos personales del cliente. */
export interface ClientProfile {
  /** Código ISO-2 del país (PE, CL, CO…). */
  country: string;
  city: string;
  /** Distrito (sobre todo para Lima); opcional. */
  district: string;
  docType: DocType;
  docNumber: string;
  gender: Gender;
  /** Prefijo telefónico, p. ej. "+51". */
  phoneCode: string;
  phone: string;
}

/** Datos de la organización, presentes sólo cuando `role === 'ORGANIZER'`. */
export interface OrganizerProfile {
  orgType: OrganizerType;
  /** Nombre comercial: el que ve el público. */
  displayName: string;
  /** RUC (empresa) o DNI (persona natural). */
  taxId: string;
  /** Razón social; sólo aplica a empresas. */
  legalName: string;
  /** Representante / responsable de la cuenta. */
  repName: string;
  phone: string;
  /** País del organizador (puede ser extranjero). */
  country: string;
  city: string;
  website: string;
  verificationStatus: VerificationStatus;
}

export interface User {
  id: string;
  fullName: string;
  email: string;
  role: UserRole;
  profile?: ClientProfile;
  organizer?: OrganizerProfile;
  marketingOptIn?: boolean;
}

export interface AuthResponse {
  token: string;
  user: User;
}

export interface LoginPayload {
  email: string;
  password: string;
}

export interface RegisterPayload {
  fullName: string;
  email: string;
  password: string;
  role: UserRole;
  acceptedTerms: boolean;
  marketingOptIn: boolean;
  /** Requerido cuando `role === 'CLIENT'`. */
  profile?: ClientProfile;
  /** Requerido cuando `role === 'ORGANIZER'`. */
  organizer?: Omit<OrganizerProfile, 'verificationStatus'>;
}
