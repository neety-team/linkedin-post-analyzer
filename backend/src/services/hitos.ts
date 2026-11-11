// HITOS EN LAS GRAFICAS (2026-11-11, spec docs/superpowers/specs/2026-11-11-hitos-en-graficas-design.md).
// Logica pura: que cifras redondas cuentan como hito y que dia se cruzo cada una.
// Sin BD, para poder probarla sola (hitos.test.ts).

export interface PuntoSerie {
  dia: string; // YYYY-MM-DD
  valor: number; // total ese dia (seguidores) o acumulado desde el primer dato (impresiones)
}

export interface Cruce {
  valor: number; // el umbral cruzado
  dia: string; // primer dia en que la serie llega o pasa del umbral
}

const UN_MILLON = 1_000_000;

/** 1.000 · 2.500 · 5.000 · 7.500 · 10.000 y despues cada 5.000, hasta cubrir `max`. */
export function umbralesSeguidores(max: number): number[] {
  const out = [1_000, 2_500, 5_000, 7_500, 10_000].filter((u) => u <= max);
  for (let u = 15_000; u <= max; u += 5_000) out.push(u);
  return out;
}

/** Cada millon, hasta cubrir `max`. */
export function umbralesImpresiones(max: number): number[] {
  const out: number[] = [];
  for (let u = UN_MILLON; u <= max; u += UN_MILLON) out.push(u);
  return out;
}

/**
 * El dia en que la serie cruza cada umbral por primera vez.
 * - La serie empieza en su primer punto con valor > 0. Lo que ya estaba
 *   superado ese dia NO es un hito: no lo vimos pasar.
 * - Si la serie baja y vuelve a subir, el umbral cuenta una vez, la primera.
 */
export function cruces(serie: PuntoSerie[], umbrales: number[]): Cruce[] {
  const ordenada = [...serie].sort((a, b) => a.dia.localeCompare(b.dia));
  const inicio = ordenada.findIndex((p) => p.valor > 0);
  if (inicio === -1) return [];
  const base = ordenada[inicio].valor;
  const pendientes = umbrales.filter((u) => u > base).sort((a, b) => a - b);
  const out: Cruce[] = [];
  for (let i = inicio + 1; i < ordenada.length && pendientes.length; i++) {
    const p = ordenada[i];
    while (pendientes.length && p.valor >= pendientes[0]) {
      out.push({ valor: pendientes.shift() as number, dia: p.dia });
    }
  }
  return out;
}

/** Serie diaria (lo de cada dia) a acumulado desde el primer dato. */
export function acumular(diaria: PuntoSerie[]): PuntoSerie[] {
  let total = 0;
  return [...diaria]
    .sort((a, b) => a.dia.localeCompare(b.dia))
    .map((p) => {
      total += p.valor;
      return { dia: p.dia, valor: total };
    });
}
