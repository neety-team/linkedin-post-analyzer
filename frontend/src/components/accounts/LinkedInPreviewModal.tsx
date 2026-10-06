import { useEffect, useMemo, useState } from 'react';
import { useApi } from '../../hooks/useApi';
import LinkedInPostPreview from './LinkedInPostPreview';

/* ── LinkedIn Preview, en una ventana modal desde Accounts ──────────────────
   (Iker, 2026-10-06). Los posts ya se escriben por Claude Code, asi que Post
   Creator se retiro entero y se salvo solo esto: pegar un texto y ver como
   corta LinkedIn el gancho con el nombre y la foto de la cuenta que publica.

   "Ver como" enseña SOLO a los tres jefes, en su orden (Unai, Iker, Asier), y
   la cuenta de la empresa. Con las ocho cuentas gestionadas la fila de chips
   se rompia y los nombres salian cortados; las demas manuales (Mario, Ismael,
   Helena, Angela) no publican desde aqui. */

interface Cuenta {
  id: string;
  name: string | null;
  headline: string | null;
  profile_image_url: string | null;
  followers_count: number | null;
  is_manual?: boolean | null;
  unipile_account_id: string | null;
}

// Orden fijo de los jefes por nombre de pila. Se casa contra las cuentas
// CONECTADAS (las que tienen sesion de Unipile), que son siempre ellos tres.
const ORDEN_JEFES = ['unai', 'iker', 'asier'];
const CUENTA_EMPRESA = 'neety';
const CLAVE_BORRADOR = 'linkedin_preview_borrador';
const CLAVE_PERSONA = 'linkedin_preview_persona';

const nombrePila = (c: Cuenta) => (c.name || '').trim().split(/\s+/)[0]?.toLowerCase() || '';

export function personasDelPreview(cuentas: Cuenta[]): Cuenta[] {
  const conectadas = cuentas.filter((c) => !c.is_manual && !!c.unipile_account_id);
  const jefes = ORDEN_JEFES
    .map((n) => conectadas.find((c) => nombrePila(c) === n))
    .filter((c): c is Cuenta => !!c);
  // Una cuenta conectada que no este en la lista (nueva) entra detras, antes
  // que la empresa: no se pierde nadie que publique con sesion propia.
  const resto = conectadas.filter((c) => !jefes.includes(c));
  const empresa = cuentas.find((c) => (c.name || '').trim().toLowerCase() === CUENTA_EMPRESA);
  return [...jefes, ...resto, ...(empresa ? [empresa] : [])];
}

const leer = (clave: string): string => {
  try { return localStorage.getItem(clave) || ''; } catch { return ''; }
};
const guardar = (clave: string, valor: string) => {
  try { localStorage.setItem(clave, valor); } catch { /* sin almacenamiento: solo esta sesion */ }
};

export default function LinkedInPreviewModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { data: cuentas } = useApi<Cuenta[]>(open ? '/api/accounts' : null);
  const personas = useMemo(() => personasDelPreview(cuentas || []), [cuentas]);
  const [personaId, setPersonaId] = useState<string>(() => leer(CLAVE_PERSONA));
  const [texto, setTexto] = useState<string>(() => leer(CLAVE_BORRADOR));

  // Si no hay persona guardada (o ya no existe), la primera: Unai.
  const persona = personas.find((p) => p.id === personaId) || personas[0] || null;

  useEffect(() => { guardar(CLAVE_BORRADOR, texto); }, [texto]);
  useEffect(() => { if (persona) guardar(CLAVE_PERSONA, persona.id); }, [persona]);

  // Escape cierra y el fondo no hace scroll mientras esta abierta.
  useEffect(() => {
    if (!open) return;
    const tecla = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', tecla);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', tecla);
      document.body.style.overflow = overflow;
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/60 backdrop-blur-sm p-4 sm:p-8"
      onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}
      role="dialog"
      aria-modal="true"
      aria-label="LinkedIn Preview"
    >
      <div className="w-full max-w-3xl my-auto rounded-2xl border border-border bg-bg-card shadow-2xl shadow-black/50 overflow-hidden">
        {/* Cabecera */}
        <div className="flex items-start justify-between gap-4 px-6 py-4 border-b border-border bg-gradient-to-r from-accent/10 to-transparent">
          <div>
            <h2 className="text-lg font-semibold">LinkedIn Preview</h2>
            <p className="text-xs text-text-muted mt-0.5">
              Pega el post y mira dónde corta LinkedIn el gancho, con el nombre y la foto de quien publica.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full border border-border text-text-muted hover:text-text-primary hover:border-accent/40 transition-colors"
            title="Cerrar (Esc)"
          >
            ×
          </button>
        </div>

        <div className="px-6 py-5 space-y-4">
          {/* Ver como */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs text-text-muted mr-1">Ver como:</span>
            {personas.length === 0 && <span className="text-xs text-text-muted">Cargando cuentas…</span>}
            {personas.map((p) => {
              const activa = persona?.id === p.id;
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setPersonaId(p.id)}
                  className={`inline-flex items-center gap-2 pl-1 pr-3 py-1 rounded-full border text-xs transition-colors ${
                    activa
                      ? 'border-accent/60 bg-accent/15 text-accent'
                      : 'border-border bg-bg-secondary text-text-secondary hover:border-accent/30'
                  }`}
                >
                  {p.profile_image_url ? (
                    <img src={p.profile_image_url} alt="" className="w-6 h-6 rounded-full object-cover" />
                  ) : (
                    <span className="w-6 h-6 rounded-full bg-bg-primary inline-flex items-center justify-center text-[10px]">
                      {(p.name || '?')[0]}
                    </span>
                  )}
                  <span className="whitespace-nowrap">{(p.name || 'Cuenta').split(/\s+/)[0]}</span>
                </button>
              );
            })}
          </div>

          {/* Texto */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-[11px] text-text-muted font-medium">Texto del post</label>
              <div className="flex items-center gap-3 text-[10px] text-text-muted">
                <span>{texto.length} chars</span>
                {texto && (
                  <button type="button" onClick={() => setTexto('')} className="hover:text-text-primary">✕ Limpiar</button>
                )}
              </div>
            </div>
            <textarea
              value={texto}
              onChange={(e) => setTexto(e.target.value)}
              rows={texto ? 6 : 4}
              className="w-full bg-bg-primary border border-border rounded-lg px-3 py-2 text-xs text-text-secondary focus:outline-none focus:border-accent/50 resize-y leading-relaxed"
              placeholder="Pega aquí el post…"
              autoFocus
            />
            <p className="text-[10px] text-text-muted mt-1">Los cambios se reflejan en vivo. El borrador se queda guardado en este navegador.</p>
          </div>

          {/* Preview */}
          {texto.trim() ? (
            <LinkedInPostPreview
              text={texto}
              authorName={persona?.name}
              authorHeadline={persona?.headline}
              authorImage={persona?.profile_image_url}
              followersCount={persona?.followers_count}
            />
          ) : (
            <div className="border border-dashed border-border rounded-xl p-8 text-center text-text-muted text-xs">
              El preview aparece aquí en cuanto pegues un texto.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
