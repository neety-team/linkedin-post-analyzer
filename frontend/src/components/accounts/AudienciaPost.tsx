import InfoHint from '../InfoHint';
import { etiquetaAudiencia, fmtPct, pctDecisores, type Demografia } from '../../utils/audiencia';

/* QUIEN LO HA VISTO (Mario, 2026-10-14). Va dentro de "Ver estadisticas" de cada
   post, encima de las curvas. Datos de la analitica Premium de LinkedIn (services/
   audienciaPost.ts en el backend): alcance, dentro/fuera de la red y el top de cada
   categoria. Para afinar a quien le hablamos: si lo ven comerciales o directivos. */

const BLOQUES: { campo: keyof Demografia; titulo: string }[] = [
  { campo: 'nivel', titulo: 'Nivel' },
  { campo: 'cargo', titulo: 'Cargo' },
  { campo: 'sector', titulo: 'Sector' },
  { campo: 'tamano', titulo: 'Tamaño de empresa' },
  { campo: 'zona', titulo: 'Zona' },
  { campo: 'empresa', titulo: 'Empresa' },
];

export default function AudienciaPost({ post }: {
  post: { members_reached?: number | null; in_network_pct?: number | null; audiencia?: Demografia | null };
}) {
  const { members_reached: alcance, in_network_pct: enRed, audiencia } = post;
  if (alcance == null && !audiencia) {
    return (
      <p className="text-xs text-text-muted mb-3">
        👥 Quién lo ha visto: aún sin leer (llega con la analítica Premium de LinkedIn).
      </p>
    );
  }
  const decisores = pctDecisores(audiencia);
  return (
    <div className="mb-4">
      <div className="flex items-baseline gap-x-3 gap-y-1 flex-wrap text-xs text-text-secondary mb-2">
        <span className="text-sm font-semibold text-text-primary">👥 Quién lo ha visto</span>
        {alcance != null && (
          <span>
            <span className="font-medium text-text-primary tabular-nums">{alcance.toLocaleString('es-ES')}</span> personas
          </span>
        )}
        {enRed != null && <span>{enRed}% de tu red · {100 - enRed}% nuevas</span>}
        {decisores != null && (
          <span>
            <span className="font-medium text-text-primary">{decisores}%</span> decisores
          </span>
        )}
        <InfoHint text="Analítica Premium de LinkedIn: personas distintas que lo vieron y quiénes eran. Decisores = director, VP, C-level, socio o propietario. LinkedIn redondea y da solo los primeros de cada lista." />
      </div>
      {audiencia && (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-x-6 gap-y-3">
          {BLOQUES.map(({ campo, titulo }) => (
            <div key={campo} className="min-w-0">
              <div className="text-[10px] uppercase tracking-wide text-text-muted mb-1">{titulo}</div>
              {(audiencia[campo] ?? []).slice(0, 5).map((f) => (
                <div key={f.label} className="flex items-center gap-2 text-xs leading-5">
                  <span className="truncate text-text-secondary" title={f.label}>{etiquetaAudiencia(campo, f.label)}</span>
                  <span className="ml-auto tabular-nums text-text-muted">{fmtPct(f.pct)}</span>
                </div>
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
