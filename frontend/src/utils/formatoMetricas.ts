/**
 * Formato de las métricas de la newsletter (2026-11-20). Las tasas llegan de la
 * API entre 0 y 1; lo que falta (sin Brevo, sin datos) sale como «—».
 */

/** 0.443 → «44,3 %», con coma decimal; null → «—». */
export function porcentaje(v: number | null | undefined): string {
  if (v == null || !Number.isFinite(v)) return '—';
  return `${(v * 100).toFixed(1).replace('.', ',')} %`;
}

/** Un recuento con separador de miles; null → «—». */
export function cantidad(v: number | null | undefined): string {
  if (v == null || !Number.isFinite(v)) return '—';
  return v.toLocaleString('es-ES');
}
