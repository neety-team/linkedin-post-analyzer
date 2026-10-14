import InfoHint from '../InfoHint';
import { etiquetaAudiencia, fmtPct, type Demografia } from '../../utils/audiencia';

/* QUIEN NOS LEE (Mario, 2026-10-14). Va en el resumen de Cuentas: la demografia de
   TODOS los posts del periodo juntos (backend: audiencia_resumen en /analytics), no la
   de cada post ("por cada post concreto no nos da mucha info"). Datos de la analitica
   Premium de LinkedIn (services/audienciaPost.ts). Para saber a quien le hablamos: si
   nos leen comerciales o los que deciden la compra. */

const BLOQUES: { campo: keyof Demografia; titulo: string }[] = [
  { campo: 'nivel', titulo: 'Nivel' },
  { campo: 'cargo', titulo: 'Cargo' },
  { campo: 'sector', titulo: 'Sector' },
  { campo: 'tamano', titulo: 'Tamaño de empresa' },
  { campo: 'zona', titulo: 'Zona' },
  { campo: 'empresa', titulo: 'Empresa' },
];

export default function AudienciaResumen({ posts, alcance, demografia, decisores }: {
  posts: number;
  alcance: number;
  demografia: Partial<Demografia>;
  decisores: number | null;
}) {
  if (!posts) return null;
  return (
    <div className="bg-bg-card border border-border rounded-xl p-4">
      <div className="mb-3">
        <h3 className="text-base font-semibold">👥 Quién nos lee</h3>
        <p className="text-xs text-text-muted">
          {posts} posts con datos · {alcance.toLocaleString('es-ES')} personas alcanzadas
          {decisores != null && <> · <span className="font-medium text-text-primary">{decisores}%</span> deciden la compra</>}
          <InfoHint text="Demografía de la analítica Premium de LinkedIn de los posts del periodo, juntos. Cada % es la media de los posts ponderada por personas alcanzadas. LinkedIn solo da los primeros de cada lista en cada post, así que son porcentajes mínimos: sirven para ordenar, no para sumar. Decide la compra = director, VP, C-level, socio o propietario." />
        </p>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-x-6 gap-y-3">
        {BLOQUES.map(({ campo, titulo }) => (
          <div key={campo} className="min-w-0">
            <div className="text-[10px] uppercase tracking-wide text-text-muted mb-1">{titulo}</div>
            {(demografia[campo] ?? []).slice(0, 5).map((f) => (
              <div key={f.label} className="flex items-center gap-2 text-xs leading-5">
                <span className="truncate text-text-secondary" title={f.label}>{etiquetaAudiencia(campo, f.label)}</span>
                <span className="ml-auto tabular-nums text-text-muted">{fmtPct(f.pct)}</span>
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
