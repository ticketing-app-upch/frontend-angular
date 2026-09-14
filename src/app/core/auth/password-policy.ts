/**
 * Regla de contraseña compartida entre registro y login, para que nunca se
 * desalineen: mínimo 8 caracteres, con al menos una mayúscula, un número y
 * un carácter especial. El backend debe repetir esta misma regla (ver
 * FRONTEND_HANDOFF.md), nunca confiar en que el cliente la cumplió.
 */
export const PASSWORD_PATTERN = /^(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/;

export const PASSWORD_HINT =
  'Mínimo 8 caracteres, con mayúscula, número y carácter especial.';
