export function eventShareUrl(id: string): string {
  return `${window.location.origin}/eventos/${encodeURIComponent(id)}`;
}

export async function copyEventLink(id: string): Promise<void> {
  const url = eventShareUrl(id);
  if (navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(url);
      return;
    } catch {
      // Sin foco o sin contexto seguro (http en red local): se usa el respaldo.
    }
  }
  const field = document.createElement('textarea');
  field.value = url;
  field.style.position = 'fixed';
  field.style.opacity = '0';
  document.body.appendChild(field);
  field.select();
  const copied = document.execCommand('copy');
  field.remove();
  if (!copied) throw new Error('No se pudo copiar el enlace.');
}
