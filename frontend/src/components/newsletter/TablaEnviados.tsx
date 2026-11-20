import { Fragment } from 'react';
import { porcentaje, cantidad } from '../../utils/formatoMetricas';
import { cuandoCorreo, type Correo } from './tipos';

/**
 * Los correos ya enviados con sus métricas de Brevo (2026-11-20). Lo que no hay
 * sale como «—». Con A/B, una fila por brazo debajo del correo, solo con tasas:
 * Brevo no da recuentos por brazo. La tabla hace scroll dentro de su caja, no
 * la página.
 */

const TH = 'px-3 py-2.5 text-left text-[12px] font-semibold text-text-muted whitespace-nowrap';
const TD = 'px-3 py-3 align-top text-[13px] text-text-primary tabular-nums whitespace-nowrap';

function Conversiones({ c }: { c: Correo }) {
  const conv = c.conversiones;
  if (!conv || (conv.demos == null && conv.inscritos == null)) return <>—</>;
  return (
    <>
      {cantidad(conv.demos)} <span className="text-text-muted">/</span> {cantidad(conv.inscritos)}
    </>
  );
}

export default function TablaEnviados({ correos }: { correos: Correo[] }) {
  if (!correos.length) {
    return <p className="text-sm text-text-muted">Todavía no hay correos enviados.</p>;
  }
  return (
    <div className="bg-bg-card border border-border rounded-xl overflow-x-auto">
      <table className="min-w-full border-collapse">
        <thead className="border-b border-border bg-bg-secondary/60">
          <tr>
            <th scope="col" className={TH}>Correo</th>
            <th scope="col" className={TH}>Fecha</th>
            <th scope="col" className={`${TH} text-right`}>Entregados</th>
            <th scope="col" className={`${TH} text-right`}>Apertura real</th>
            <th scope="col" className={`${TH} text-right`}>Personas que pulsan</th>
            <th scope="col" className={`${TH} text-right`}>CTOR</th>
            <th scope="col" className={`${TH} text-right`}>Bajas</th>
            <th scope="col" className={`${TH} text-right`}>Rebotes</th>
            <th scope="col" className={`${TH} text-right`}>Reuniones / leads</th>
          </tr>
        </thead>
        <tbody>
          {correos.map((c) => {
            const m = c.metricas;
            const ab = m?.ab;
            return (
              <Fragment key={c.id}>
                <tr className="border-t border-border first:border-t-0">
                  <td className={`${TD} whitespace-normal min-w-[220px] max-w-[320px]`}>
                    <p className="font-semibold">
                      {c.numero != null ? `Correo ${c.numero}` : c.clave}
                      <span className="font-normal text-text-muted"> · {c.remitente}</span>
                    </p>
                    <p className="text-text-secondary break-words">{c.asunto}</p>
                  </td>
                  <td className={TD}>{cuandoCorreo(c.fecha, c.hora)}</td>
                  <td className={`${TD} text-right`}>{cantidad(m?.entregados)}</td>
                  <td className={`${TD} text-right`}>{porcentaje(m?.apertura_real ?? null)}</td>
                  <td className={`${TD} text-right`}>
                    {cantidad(m?.personas)}
                    {m && m.clic != null && <span className="block text-[12px] text-text-muted">{porcentaje(m.clic)} de entregados</span>}
                    {m && m.personas_primer_minuto > 0 && (
                      <span className="block text-[12px] text-warning">
                        {m.personas_primer_minuto} posible escáner
                      </span>
                    )}
                  </td>
                  <td className={`${TD} text-right`}>{porcentaje(m?.ctor ?? null)}</td>
                  <td className={`${TD} text-right`}>{cantidad(m?.bajas)}</td>
                  <td className={`${TD} text-right`}>{cantidad(m?.rebotes)}</td>
                  <td className={`${TD} text-right`}>
                    <Conversiones c={c} />
                  </td>
                </tr>
                {ab &&
                  (['a', 'b'] as const).map((k) => (
                    <tr key={k} className="bg-bg-secondary/40">
                      <td className={`${TD} whitespace-normal pl-6 text-text-secondary`} colSpan={3}>
                        <span className="font-semibold text-text-primary">Brazo {k.toUpperCase()}: </span>
                        <span className="break-words">{ab[k].asunto || '—'}</span>
                      </td>
                      {/* relative: el sr-only es absoluto y, sin ancla, se sale de la caja con scroll */}
                      <td className={`${TD} relative text-right text-text-secondary`}>
                        <span className="sr-only">Apertura del brazo {k.toUpperCase()}: </span>
                        {porcentaje(ab[k].apertura)}
                      </td>
                      <td className={`${TD} text-right text-text-secondary`}>
                        clic {porcentaje(ab[k].clic)}
                      </td>
                      <td className={TD} colSpan={4} />
                    </tr>
                  ))}
              </Fragment>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
