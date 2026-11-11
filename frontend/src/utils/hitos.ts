// HITOS EN LAS GRAFICAS (2026-11-11). Logica pura del frontend: que hitos caen
// en el rango elegido y como se escriben. Los cruces los calcula el backend
// (GET /api/accounts/milestones) sobre todo el historico.

export interface Hito {
  metrica: 'impresiones' | 'seguidores';
  valor: number;
  dia: string; // YYYY-MM-DD
  creatorId: string | null;
  creatorName: string | null;
}

/** Los hitos cuyo dia cae dentro de [inicio, fin], ambos incluidos. */
export function hitosEnRango(hitos: Hito[], inicio: string, fin: string): Hito[] {
  return hitos.filter((h) => h.dia >= inicio && h.dia <= fin);
}

/** 4.000.000 → "4M" · 10.000 → "10K" · 2.500 → "2,5K". */
export function cifraCorta(valor: number): string {
  const fmt = (n: number) => n.toLocaleString('es-ES', { maximumFractionDigits: 1 });
  if (valor >= 1_000_000) return `${fmt(valor / 1_000_000)}M`;
  if (valor >= 1_000) return `${fmt(valor / 1_000)}K`;
  return fmt(valor);
}

/** Textos del tooltip: "4.000.000 impresiones" · "entre todas las cuentas" · "18 de octubre de 2026". */
export function textoHito(h: Hito): { titulo: string; quien: string; fecha: string } {
  const unidad = h.metrica === 'impresiones' ? 'impresiones' : 'seguidores';
  const titulo = `${h.valor.toLocaleString('es-ES')} ${unidad}`;
  const quien = h.creatorName ? h.creatorName.trim().split(/\s+/)[0] : 'entre todas las cuentas';
  const fecha = new Date(`${h.dia}T00:00:00`).toLocaleDateString('es-ES', {
    day: 'numeric', month: 'long', year: 'numeric',
  });
  return { titulo, quien, fecha };
}

/** Agrupa por dia, en el orden en que llegan. */
export function porDia(hitos: Hito[]): Map<string, Hito[]> {
  const m = new Map<string, Hito[]>();
  for (const h of hitos) {
    const lista = m.get(h.dia);
    if (lista) lista.push(h);
    else m.set(h.dia, [h]);
  }
  return m;
}
