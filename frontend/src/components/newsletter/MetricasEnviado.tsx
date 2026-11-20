import { porcentaje, cantidad } from '../../utils/formatoMetricas';
import type { Correo } from './tipos';

/**
 * Las métricas de Brevo de un correo enviado (2026-11-20), en el detalle que se
 * abre desde el calendario. Son las columnas de la antigua tabla de enviados:
 * lo que no hay sale como «—». Con A/B, las tasas de cada brazo debajo (Brevo no
 * da recuentos por brazo).
 */

function Dato({ etiqueta, valor, nota, aviso }: { etiqueta: string; valor: string; nota?: string; aviso?: string }) {
  return (
    <div className="rounded-lg bg-bg-secondary border border-border px-3 py-2 min-w-0">
      <dt className="text-[12px] text-text-muted">{etiqueta}</dt>
      <dd className="text-[16px] font-semibold text-text-primary tabular-nums">{valor}</dd>
      {nota && <dd className="text-[12px] text-text-muted">{nota}</dd>}
      {aviso && <dd className="text-[12px] text-warning">{aviso}</dd>}
    </div>
  );
}

function conversiones(c: Correo): string {
  const conv = c.conversiones;
  if (!conv || (conv.demos == null && conv.inscritos == null)) return '—';
  return `${cantidad(conv.demos)} / ${cantidad(conv.inscritos)}`;
}

export default function MetricasEnviado({ correo }: { correo: Correo }) {
  const m = correo.metricas;
  const ab = m?.ab;
  return (
    <section className="space-y-3" aria-label="Métricas de Brevo">
      <h3 className="font-display text-[15px] font-semibold text-text-primary">Métricas</h3>
      <dl className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        <Dato etiqueta="Entregados" valor={cantidad(m?.entregados)} />
        <Dato etiqueta="Apertura real" valor={porcentaje(m?.apertura_real ?? null)} />
        <Dato
          etiqueta="Personas que pulsan"
          valor={cantidad(m?.personas)}
          nota={m && m.clic != null ? `${porcentaje(m.clic)} de entregados` : undefined}
          aviso={m && m.personas_primer_minuto > 0 ? `${m.personas_primer_minuto} posible escáner` : undefined}
        />
        <Dato etiqueta="CTOR" valor={porcentaje(m?.ctor ?? null)} />
        <Dato etiqueta="Bajas" valor={cantidad(m?.bajas)} />
        <Dato etiqueta="Rebotes" valor={cantidad(m?.rebotes)} />
        <Dato etiqueta="Reuniones / inscritos" valor={conversiones(correo)} />
      </dl>
      {ab && (
        <ul className="space-y-1.5 text-[13px]">
          {(['a', 'b'] as const).map((k) => (
            <li key={k} className="rounded-lg bg-bg-secondary/60 px-3 py-2 text-text-secondary break-words">
              <span className="font-semibold text-text-primary">Brazo {k.toUpperCase()}: </span>
              {ab[k].asunto || '—'}
              <span className="block tabular-nums text-text-muted">
                Apertura {porcentaje(ab[k].apertura)} · clic {porcentaje(ab[k].clic)}
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
