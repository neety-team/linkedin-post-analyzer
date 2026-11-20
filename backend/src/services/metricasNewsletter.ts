// Cálculo de métricas de un envío de newsletter (funciones puras, sin red).
// Definiciones del diseño: apertura real = aperturas únicas menos las de Apple MPP;
// clic = personas distintas que han hecho clic / entregados; CTOR = personas / aperturas reales.

export interface GlobalStats {
  sent?: number;
  delivered?: number;
  hardBounces?: number;
  softBounces?: number;
  unsubscriptions?: number;
  uniqueViews?: number;
  appleMppOpens?: number;
  uniqueClicks?: number;
  [k: string]: unknown;
}

export interface Clic {
  email: string;
  url: string;
  t: string; // ISO
}

// Un brazo de un test A/B. Lo rellena la capa de Brevo.
export interface Brazo {
  asunto: string;
  entregados: number;
  aperturas: number;
  clics: number;
}

export interface Metricas {
  enviados: number;
  entregados: number;
  rebotes: number;
  bajas: number;
  aperturas_reales: number | null;
  apertura_real: number | null; // 0-1
  personas: number;
  personas_primer_minuto: number;
  clic: number | null; // personas / entregados
  ctor: number | null; // personas / aperturas_reales
  ab?: { a: Brazo; b: Brazo };
}

// Enlaces de baja o de preferencias de Brevo: no son interés del lector.
export function esEnlaceDeBaja(url: string): boolean {
  return /\/unsubscribe|\/preferences|\/unsub\b/i.test(url);
}

const dividir = (a: number, b: number): number | null => (b > 0 ? a / b : null);

export function calcularMetricas(g: GlobalStats, sentDate: string, clics: Clic[]): Metricas {
  const entregados = g.delivered ?? 0;
  const aperturasReales = Math.max(0, (g.uniqueViews ?? 0) - (g.appleMppOpens ?? 0));

  // Primer clic válido de cada persona (sin internos ni enlaces de baja).
  const primeros = new Map<string, number>();
  for (const c of clics) {
    const email = c.email.trim().toLowerCase();
    if (email.endsWith('@neety.com') || esEnlaceDeBaja(c.url)) continue;
    const t = Date.parse(c.t);
    const previo = primeros.get(email);
    if (previo === undefined || t < previo) primeros.set(email, t);
  }
  const envio = Date.parse(sentDate);
  // Los clics del primer minuto se cuentan como personas, pero marcados: suelen ser escáneres de enlaces.
  const primerMinuto = [...primeros.values()].filter((t) => t - envio <= 60_000).length;
  const personas = primeros.size;

  return {
    enviados: g.sent ?? 0,
    entregados,
    rebotes: (g.hardBounces ?? 0) + (g.softBounces ?? 0),
    bajas: g.unsubscriptions ?? 0,
    aperturas_reales: entregados > 0 ? aperturasReales : null,
    apertura_real: dividir(aperturasReales, entregados),
    personas,
    personas_primer_minuto: primerMinuto,
    clic: dividir(personas, entregados),
    ctor: dividir(personas, aperturasReales),
  };
}

export function estadoMetricas(): { configurado: boolean } {
  return { configurado: !!process.env.BREVO_API_KEY };
}
