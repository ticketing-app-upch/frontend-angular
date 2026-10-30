import { UserRole } from '../models/user.model';

/** Pantalla de inicio del rol; los visitantes usan el catálogo público. */
export function roleHome(role: UserRole | null | undefined): string {
  if (role === 'ORGANIZER') return '/organizador/eventos';
  if (role === 'ADMIN') return '/admin/usuarios';
  if (role === 'CLIENT') return '/attendee/catalog';
  return '/eventos';
}
