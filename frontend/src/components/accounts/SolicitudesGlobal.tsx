/* Las solicitudes pedidas de TODAS las cuentas del filtro, arriba del todo de
   Comments (Iker, 2026-08-20).

   POR QUE EXISTE: hasta hoy esto solo se veia entrando a la pestana Lead Magnet,
   eligiendo cuenta, eligiendo post y pulsando un boton. Cuatro pasos para saber
   si alguien te habia mandado la solicitud. Iker: "a veces se me olvida entrar a
   la seccion de lead magnets y perdemos posibles leads".

   Es el MISMO componente `SolicitudesPedidas` del workspace, montado sin post.
   No es una copia a proposito: el envio, la verificacion y el aviso de "mandado
   pero sin comprobar" viven ahi dentro, y dos copias acabarian divergiendo. */
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
// pedir la solicitud, y si no `resolverRecurso`—, exactamente igual que dentro
// de un post.
const CFG_DEFECTO: LmConfig = { kind: 'dm', keyword: '', link: '', topic: '' };

// `recargaKey` sube cuando pulsas «↻ Actualizar» arriba. Va en la `key` de cada
// bloque para REMONTARLO: asi se releen las solicitudes y se vuelve a comprobar
// quien ya es contacto, sin necesidad de un segundo boton de recargar aqui.
export default function SolicitudesGlobal({ cuentas, recargaKey = 0 }: {
  cuentas: CuentaResumen[]; recargaKey?: number;
}) {
  if (cuentas.length === 0) return null;
  return (
    <div className="space-y-3">
      {cuentas.map((c) => (
        <div key={`${c.creator_id}:${recargaKey}`} className="space-y-1">
          {/* El aviso va FUERA del bloque: si Unipile no contesta,
              `SolicitudesPedidas` no pinta nada y el aviso se perderia con el. */}
          {c.aviso && (
            <p className="text-[11px] text-amber-700 dark:text-amber-300 leading-snug">⚠️ {c.aviso}</p>
          )}
          <SolicitudesPedidas
            creatorId={c.creator_id}
            cfg={CFG_DEFECTO}
            voice={voiceFor(c.creator_name)}
          />
        </div>
      ))}
    </div>
  );
}
