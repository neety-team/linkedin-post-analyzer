// Quien ve cada post (backend: services/audienciaPost.ts). LinkedIn da las
// etiquetas en ingles; aqui se traducen las que tienen un conjunto cerrado.

export interface FilaAudiencia {
  label: string;
  /** porcentaje; "< 1%" llega como 0.5 */
  pct: number;
}
export interface Demografia {
  cargo: FilaAudiencia[];
  zona: FilaAudiencia[];
  nivel: FilaAudiencia[];
  empresa: FilaAudiencia[];
  sector: FilaAudiencia[];
  tamano: FilaAudiencia[];
}

// Decisores = los niveles que firman o deciden la compra.
const DECISORES = ['Director', 'VP', 'CXO', 'Partner', 'Owner'];

/** % de quienes vieron el post con nivel de decision, o null sin dato. */
export function pctDecisores(a: Demografia | null | undefined): number | null {
  if (!a?.nivel?.length) return null;
  return Math.round(a.nivel.filter((f) => DECISORES.includes(f.label)).reduce((s, f) => s + f.pct, 0));
}

const NIVEL_ES: Record<string, string> = {
  Unpaid: 'Sin remunerar', Training: 'En formación', Entry: 'Junior', Senior: 'Senior',
  Manager: 'Mánager', Director: 'Director', VP: 'VP', CXO: 'C-level', Partner: 'Socio', Owner: 'Propietario',
};

export function etiquetaAudiencia(campo: keyof Demografia, label: string): string {
  if (campo === 'nivel') return NIVEL_ES[label] ?? label;
  if (campo === 'tamano') return label.replace(/employees?/i, 'empleados').replace(/,/g, '.');
  if (campo === 'zona') {
    const m = /^Greater (.+?)(?: Metropolitan)? Area$/.exec(label);
    return m ? m[1] : label;
  }
  return label;
}

export function fmtPct(pct: number): string {
  return pct < 1 ? '<1%' : `${Math.round(pct)}%`;
}
