import { useEffect, useState } from 'react';
import { ReferenceLine } from 'recharts';
import { useChartColors } from '../theme';
import { cifraCorta, porDia, textoHito, type Hito } from '../utils/hitos';

// HITOS EN LAS GRAFICAS (2026-11-11). Una banderita naranja por encima del
// area de datos el dia en que se cruza una cifra redonda, con una linea
// discontinua hasta el eje. Spec: docs/superpowers/specs/2026-11-11-hitos-en-graficas-design.md

const BASE = import.meta.env.VITE_API_URL || '';

/** Margen superior que necesita la grafica para que la banderita no tape la curva. */
export const MARGEN_HITOS = 26;

const ALTO = 16;
const COLA = 5;

export interface HoverHito {
  hitos: Hito[];
  x: number;
  y: number;
}

/** Los hitos de una cuenta (o de todas si creatorId es null). Si falla, devuelve listas vacias. */
export function useHitos(creatorId: string | null, includeManual: boolean, reload?: number) {
  const [data, setData] = useState<{ impresiones: Hito[]; seguidores: Hito[] }>({ impresiones: [], seguidores: [] });
  useEffect(() => {
    let cancelado = false;
    const params = new URLSearchParams();
    if (creatorId) params.set('creator_id', creatorId);
    if (!includeManual) params.set('include_manual', 'false');
    fetch(`${BASE}/api/accounts/milestones?${params.toString()}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (cancelado) return;
        setData({
          impresiones: Array.isArray(d?.impresiones) ? d.impresiones : [],
          seguidores: Array.isArray(d?.seguidores) ? d.seguidores : [],
        });
      })
      .catch(() => {
        if (!cancelado) setData({ impresiones: [], seguidores: [] });
      });
    return () => { cancelado = true; };
  }, [creatorId, includeManual, reload]);
  return data;
}

function anchoBanderin(texto: string): number {
  return texto.length * 6.4 + 10 + COLA;
}

function Banderitas({ viewBox, hitos, onHover }: { viewBox?: any; hitos: Hito[]; onHover: (h: HoverHito | null) => void }) {
  const cc = useChartColors();
  if (!viewBox) return null;
  const x = viewBox.x as number;
  const top = viewBox.y as number;
  const yBanderin = top - ALTO - 4;
  let offset = 0;
  return (
    <g
      style={{ cursor: 'default' }}
      onMouseEnter={() => onHover({ hitos, x, y: yBanderin })}
      onMouseLeave={() => onHover(null)}
    >
      {/* Zona sensible invisible algo mayor que el banderin: apuntar a 16 px cuesta. */}
      <rect
        x={x - 6}
        y={yBanderin - 6}
        width={hitos.reduce((s, h) => s + anchoBanderin(cifraCorta(h.valor)) + 2, 0) + 12}
        height={ALTO + 12}
        fill="transparent"
      />
      <line x1={x} x2={x} y1={yBanderin} y2={top} stroke={cc.accent} strokeWidth={1.5} />
      {hitos.map((h, i) => {
        const texto = cifraCorta(h.valor);
        const w = anchoBanderin(texto);
        const x0 = x + offset + (i === 0 ? 0 : 2);
        offset += w + 2;
        const y0 = yBanderin;
        const d = `M${x0},${y0} H${x0 + w} L${x0 + w - COLA},${y0 + ALTO / 2} L${x0 + w},${y0 + ALTO} H${x0} Z`;
        return (
          <g key={`${h.metrica}-${h.valor}-${h.creatorId ?? 'todas'}`}>
            <path d={d} fill={cc.accent} />
            <text
              x={x0 + 5}
              y={y0 + ALTO / 2 + 3.5}
              fontSize={10}
              fontWeight={700}
              fill={cc.onAccent}
              style={{ fontVariantNumeric: 'tabular-nums' }}
            >
              {texto}
            </text>
          </g>
        );
      })}
    </g>
  );
}

/**
 * Las ReferenceLine de los hitos, para poner DENTRO del ComposedChart como
 * `{capaHitos({ ... })}` (Recharts solo reconoce sus hijos directos).
 * `x` es el valor del eje X de ese dia (la grafica usa el dia como dataKey).
 */
export function capaHitos({
  hitos, yAxisId, onHover, color,
}: { hitos: Hito[]; yAxisId?: string; onHover: (h: HoverHito | null) => void; color: string }) {
  return [...porDia(hitos).entries()].map(([dia, delDia]) => (
    <ReferenceLine
      key={`hito-${dia}`}
      x={dia}
      yAxisId={yAxisId}
      stroke={color}
      strokeOpacity={0.45}
      strokeDasharray="3 3"
      ifOverflow="visible"
      label={(props: any) => <Banderitas viewBox={props.viewBox} hitos={delDia} onHover={onHover} />}
    />
  ));
}

/** Tooltip HTML, fuera del SVG. Va dentro de un contenedor con position: relative. */
export function HitoTooltip({ hover }: { hover: HoverHito | null }) {
  const cc = useChartColors();
  if (!hover) return null;
  return (
    <div
      style={{
        position: 'absolute',
        left: hover.x + 8,
        top: Math.max(0, hover.y - 4),
        transform: 'translateY(-100%)',
        backgroundColor: cc.tooltipBg,
        border: `1px solid ${cc.accent}55`,
        borderRadius: 10,
        padding: '8px 12px',
        boxShadow: `0 0 14px ${cc.accent}33`,
        pointerEvents: 'none',
        zIndex: 70,
        whiteSpace: 'nowrap',
      }}
    >
      {hover.hitos.map((h) => {
        const t = textoHito(h);
        return (
          <div key={`${h.metrica}-${h.valor}-${h.creatorId ?? 'todas'}`} style={{ marginBottom: 2 }}>
            <div style={{ color: cc.accent, fontSize: 14, fontWeight: 700 }}>🏁 {t.titulo}</div>
            <div style={{ color: cc.muted, fontSize: 11 }}>{t.quien} · {t.fecha}</div>
          </div>
        );
      })}
    </div>
  );
}
