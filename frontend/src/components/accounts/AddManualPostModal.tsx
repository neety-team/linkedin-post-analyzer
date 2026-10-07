import { useState } from 'react';
import { apiPost, apiPatch } from '../../hooks/useApi';

// AÑADIR A MANO EL POST DE UNA CUENTA QUE NO ESTA CONECTADA (Iker, 2026-08-19).
//
// Escribimos posts para gente de la empresa que no son los 3 jefes, y esas
// cuentas no estan conectadas por Unipile ni lo van a estar. Este modal es la
// via de entrada de esos posts.
//
// El reparto es: TODO lo publico lo extrae la herramienta sola (texto, foto,
// autor, likes, comentarios, compartidos), y lo privado lo escribe el usuario,
// porque LinkedIn no lo enseña a nadie que no sea el dueño de la cuenta.
//
// Dos pasos y no uno a proposito: pegar la URL equivocada es facil, y
// descubrirlo DESPUES —con una cuenta ya creada y un post ya guardado— es un
// lio de limpiar. Hasta que no se ve lo extraido y se confirma, no se escribe
// nada en la base de datos.

interface Autor {
  provider_id: string | null;
  public_identifier: string | null;
  name: string | null;
  headline: string | null;
  profile_image_url: string | null;
  is_company: boolean;
  linkedin_url: string | null;
}

interface VistaPrevia {
  urn: string;
  post_url: string | null;
  autor: Autor;
  content_text: string;
  content_type: string;
  published_at: string | null;
  likes_count: number;
  comments_count: number;
  reposts_count: number;
  imagenes: string[];
  cuenta_existente: { id: string; name: string | null; is_manual: boolean; conectada: boolean } | null;
  leido_con: 'cuenta_propia' | 'sesion_prestada';
}

// Las metricas que LinkedIn solo enseña al dueño de la cuenta. El texto de
// ayuda dice DONDE se lee cada una, porque no todas estan en la misma pantalla
// y buscarlas a ciegas es la parte lenta de esto.
const CAMPOS: { clave: string; etiqueta: string; ayuda: string }[] = [
  { clave: 'impressions_count', etiqueta: 'Impresiones', ayuda: 'Analíticas del post · "Impresiones"' },
  { clave: 'profile_viewers_count', etiqueta: 'Visitas al perfil', ayuda: 'Las que vinieron de este post' },
  { clave: 'followers_gained_count', etiqueta: 'Seguidores ganados', ayuda: 'Los que llegaron por este post' },
  { clave: 'link_clicks_count', etiqueta: 'Clics en el enlace', ayuda: 'Solo si el post lleva enlace' },
  { clave: 'premium_button_clicks', etiqueta: 'Clics en el botón', ayuda: 'Botón de acción, si lo hay' },
  { clave: 'saves_count', etiqueta: 'Guardados', ayuda: 'Vale más que una reacción: cuesta más' },
  { clave: 'sends_count', etiqueta: 'Envíos', ayuda: 'Veces que lo mandaron por privado' },
];

// Etiquetas para mostrar el tipo de contenido que devuelve el backend (el valor
// no se toca: es el dato de la BD).
const TIPO_CONTENIDO: Record<string, string> = {
  text: 'Texto',
  text_image: 'Texto + foto',
  text_carousel: 'Texto + carrusel',
  text_video: 'Texto + vídeo',
  text_document: 'Texto + documento',
  image: 'Solo foto',
  carousel: 'Solo carrusel',
  video: 'Solo vídeo',
  document: 'Solo documento',
  poll: 'Encuesta',
  article: 'Artículo',
};

interface Props {
  onClose: () => void;
  onSaved: () => void;
  // Modo edicion: se salta el paso de la URL y solo pide las metricas privadas
  // de un post que ya existe.
  editarPostId?: string;
  valoresIniciales?: Record<string, number | null>;
  nombreCuenta?: string | null;
}

export default function AddManualPostModal({
  onClose,
  onSaved,
  editarPostId,
  valoresIniciales,
  nombreCuenta,
}: Props) {
  const editando = !!editarPostId;

  const [url, setUrl] = useState('');
  const [vista, setVista] = useState<VistaPrevia | null>(null);
  const [extrayendo, setExtrayendo] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [metricas, setMetricas] = useState<Record<string, string>>(() => {
    const inicial: Record<string, string> = {};
    for (const c of CAMPOS) {
      const v = valoresIniciales?.[c.clave];
      inicial[c.clave] = v === null || v === undefined ? '' : String(v);
    }
    return inicial;
  });
  const [linkUrl, setLinkUrl] = useState('');

  const extraer = async () => {
    setExtrayendo(true);
    setError(null);
    setVista(null);
    try {
      setVista(await apiPost<VistaPrevia>('/api/accounts/manual-post/preview', { url }));
    } catch (err: any) {
      setError(err.message);
    } finally {
      setExtrayendo(false);
    }
  };

  // Los campos vacios viajan como null: "no lo se" y "es cero" no son lo mismo.
  // Un 0 escrito a mano significa que se miro y no habia; un vacio significa que
  // no se ha mirado, y esa diferencia es la que hace que la curva no mienta.
  const cuerpoMetricas = () => {
    const out: Record<string, any> = {};
    for (const c of CAMPOS) {
      const v = metricas[c.clave]?.trim();
      out[c.clave] = v === '' || v === undefined ? null : Number(v);
    }
    out.link_url = linkUrl.trim() || null;
    return out;
  };

  const guardar = async () => {
    setGuardando(true);
    setError(null);
    try {
      if (editando) {
        await apiPatch(`/api/accounts/posts/${editarPostId}/manual-metrics`, cuerpoMetricas());
      } else {
        await apiPost('/api/accounts/manual-post', { url, ...cuerpoMetricas() });
      }
      onSaved();
      onClose();
    } catch (err: any) {
      setError(err.message);
      setGuardando(false);
    }
  };

  const fmt = (n: number) => n.toLocaleString('es-ES');

  return (
    <div
      className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-start justify-center overflow-y-auto py-8 px-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-bg-card border border-border rounded-2xl shadow-2xl w-full max-w-2xl my-auto overflow-hidden">
        <div className="flex items-center justify-between px-6 pt-5 pb-4">
          <h2 className="text-[15px] font-semibold text-text-primary flex items-center gap-2">
            <span>📝</span>
            {editando ? `Métricas privadas${nombreCuenta ? ` · ${nombreCuenta}` : ''}` : 'Añadir post a mano'}
          </h2>
          <button
            onClick={onClose}
            className="text-text-muted hover:text-text-primary transition-colors text-xl leading-none -mr-1 px-2"
            aria-label="Cerrar"
          >
            ×
          </button>
        </div>

        <div className="px-6 pb-5 space-y-4">
          {!editando && (
            <p className="text-xs text-text-muted leading-relaxed">
              Para cuentas de la empresa que <span className="text-text-secondary">no están conectadas</span> por
              Unipile. Pega el enlace y se extrae solo todo lo público. Las impresiones y los clics no se pueden
              leer de un post ajeno, así que esos los escribes tú.
            </p>
          )}

          {!editando && (
            <div className="flex gap-2">
              <input
                type="text"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter' && url.trim() && !extrayendo) extraer(); }}
                placeholder="https://www.linkedin.com/posts/..."
                className="flex-1 bg-bg-secondary/60 border border-border rounded-lg px-3 py-2 text-xs text-text-secondary focus:outline-none focus:border-accent"
                autoFocus
                spellCheck={false}
              />
              <button
                onClick={extraer}
                disabled={!url.trim() || extrayendo}
                className="px-4 py-2 rounded-lg bg-accent text-white text-xs font-medium hover:bg-accent-light transition-colors disabled:opacity-40 disabled:cursor-not-allowed whitespace-nowrap"
              >
                {extrayendo ? 'Extrayendo…' : 'Extraer'}
              </button>
            </div>
          )}

          {error && (
            <div className="bg-danger/10 border border-danger/30 rounded-lg px-3 py-2 text-danger text-xs leading-relaxed">
              {error}
            </div>
          )}

          {vista && (
            <div className="border border-border rounded-xl p-4 space-y-3 bg-bg-primary">
              <div className="flex items-center gap-3">
                {vista.autor.profile_image_url ? (
                  <img
                    src={vista.autor.profile_image_url}
                    alt=""
                    className="w-10 h-10 rounded-full object-cover border border-border"
                  />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-bg-secondary border border-border" />
                )}
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-medium text-text-primary truncate">
                    {vista.autor.name || 'Autor desconocido'}
                  </div>
                  <div className="text-[11px] text-text-muted truncate">{vista.autor.headline || '—'}</div>
                </div>
                <span className="text-[10px] px-2 py-1 rounded bg-bg-secondary text-text-muted whitespace-nowrap">
                  {vista.cuenta_existente
                    ? vista.cuenta_existente.conectada
                      ? 'cuenta conectada'
                      : 'cuenta ya existente'
                    : 'se creará la cuenta'}
                </span>
              </div>

              {vista.imagenes.length > 0 && (
                <img
                  src={vista.imagenes[0]}
                  alt=""
                  className="w-full max-h-52 object-contain rounded-lg border border-border bg-bg-secondary"
                />
              )}

              <pre className="text-[11px] text-text-secondary whitespace-pre-wrap font-sans leading-relaxed max-h-44 overflow-y-auto">
                {vista.content_text || '(sin texto)'}
              </pre>

              <div className="flex items-center gap-4 text-[11px] text-text-muted flex-wrap">
                <span>👍 {fmt(vista.likes_count)}</span>
                <span>💬 {fmt(vista.comments_count)}</span>
                <span>🔁 {fmt(vista.reposts_count)}</span>
                <span>· {TIPO_CONTENIDO[vista.content_type] || vista.content_type}</span>
                {vista.published_at && (
                  <span>· {new Date(vista.published_at).toLocaleString('es-ES')}</span>
                )}
              </div>

              {vista.leido_con === 'cuenta_propia' && (
                <p className="text-[11px] text-amber-400">
                  Ojo: este post es de una cuenta que YA está conectada. Se añadirá a su cuenta de siempre y se
                  seguirá solo, sin necesidad de escribir nada a mano.
                </p>
              )}
            </div>
          )}

          {(vista || editando) && (
            <div>
              <div className="text-xs font-medium text-text-secondary mb-1">Métricas privadas</div>
              <p className="text-[11px] text-text-muted mb-3">
                Todas opcionales. Deja en blanco lo que no hayas mirado: un cero significa
                <span className="text-text-secondary"> lo he mirado y no hay</span>, y un hueco significa
                <span className="text-text-secondary"> no lo sé</span>.
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {CAMPOS.map((c) => (
                  <label key={c.clave} className="block">
                    <span className="block text-[11px] text-text-secondary mb-1">{c.etiqueta}</span>
                    <input
                      type="number"
                      min={0}
                      value={metricas[c.clave] ?? ''}
                      onChange={(e) => setMetricas((m) => ({ ...m, [c.clave]: e.target.value }))}
                      placeholder="—"
                      className="w-full bg-bg-secondary/60 border border-border rounded-lg px-2 py-1.5 text-xs text-text-secondary focus:outline-none focus:border-accent"
                    />
                    <span className="block text-[10px] text-text-muted mt-0.5 leading-tight">{c.ayuda}</span>
                  </label>
                ))}
              </div>
              <label className="block mt-3">
                <span className="block text-[11px] text-text-secondary mb-1">Enlace del post (opcional)</span>
                <input
                  type="text"
                  value={linkUrl}
                  onChange={(e) => setLinkUrl(e.target.value)}
                  placeholder="https://recursos.neety.com/..."
                  className="w-full bg-bg-secondary/60 border border-border rounded-lg px-2 py-1.5 text-xs text-text-secondary focus:outline-none focus:border-accent"
                  spellCheck={false}
                />
              </label>
              {editando && (
                <p className="text-[11px] text-text-muted mt-3">
                  Cada vez que guardes se añade un punto a la curva con la hora. Si vuelves a mirar las
                  impresiones a las 24 h y a las 72 h, la línea se dibuja sola.
                </p>
              )}
            </div>
          )}
        </div>

        {(vista || editando) && (
          <div className="px-6 pb-5 flex items-center justify-end gap-3">
            <button
              onClick={onClose}
              className="text-xs text-text-muted hover:text-text-primary transition-colors px-3 py-2"
            >
              Cancelar
            </button>
            <button
              onClick={guardar}
              disabled={guardando}
              className="px-4 py-2 rounded-lg bg-accent text-white text-xs font-medium hover:bg-accent-light transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {guardando ? 'Guardando…' : editando ? 'Guardar métricas' : 'Guardar post'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
