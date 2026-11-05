/* Las solicitudes pedidas de TODAS las cuentas del filtro, arriba del todo de
   Comments (Iker, 2026-08-20).

   POR QUE EXISTE: hasta hoy esto solo se veia entrando a la pestana Lead Magnet,
   eligiendo cuenta, eligiendo post y pulsando un boton. Cuatro pasos para saber
   si alguien te habia mandado la solicitud. Iker: "a veces se me olvida entrar a
   la seccion de lead magnets y perdemos posibles leads".

   Es el MISMO componente `SolicitudesPedidas` del workspace, montado sin post.
   No es una copia a proposito: el envio, la verificacion y el aviso de "mandado
   pero sin comprobar" viven ahi dentro, y dos copias acabarian divergiendo.

   ⛔ UN BLOQUE, NO UNO POR CUENTA (2026-11-05). Con «Todas» se pintaban dos
   bloques identicos «Solicitudes pedidas», uno por cuenta y sin nombre: parecia
   un duplicado. Ahora es uno solo, y cada fila dice de que cuenta es. */
import { SolicitudesPedidas } from './LeadMagnetWorkspace';
import { voiceFor } from './leadMagnetCopy';
import type { LmConfig } from './lmTypes';

export interface CuentaResumen {
  creator_id: string;
  creator_name: string | null;
  solicitudes_llegadas: number;
  aviso: string | null;
}

// Aqui arriba no se sabe de que post sale cada persona, asi que no hay config de
// post que pasar. Va la de por defecto y no pasa nada: `SolicitudesPedidas`
// resuelve el recurso fila a fila —`followup_text` si la lista lo guardo al
// pedir la solicitud, y si no `resolverRecurso`— y la voz con la cuenta que
// publico el post de esa fila, exactamente igual que dentro de un post.
const CFG_DEFECTO: LmConfig = { kind: 'dm', keyword: '', link: '', topic: '' };

// `recargaKey` sube cuando pulsas «↻ Actualizar» arriba. Va en la `key` del
// bloque para REMONTARLO: asi se releen las solicitudes y se vuelve a comprobar
// quien ya es contacto, sin necesidad de un segundo boton de recargar aqui.
export default function SolicitudesGlobal({ cuentas, recargaKey = 0 }: {
  cuentas: CuentaResumen[]; recargaKey?: number;
}) {
  if (cuentas.length === 0) return null;
  const avisos = cuentas.filter((c) => c.aviso);
  return (
    <div className="space-y-1">
      {/* Los avisos van FUERA del bloque: si Unipile no contesta y no hay nadie
          pedido, `SolicitudesPedidas` no pinta nada y el aviso se perderia. */}
      {avisos.map((c) => (
        <p key={c.creator_id} className="text-[11px] text-amber-700 dark:text-amber-300 leading-snug">⚠️ {c.aviso}</p>
      ))}
      <SolicitudesPedidas
        key={recargaKey}
        creators={cuentas.map((c) => ({ id: c.creator_id, name: c.creator_name }))}
        cfg={CFG_DEFECTO}
        voice={voiceFor(cuentas[0].creator_name)}
      />
    </div>
  );
}
