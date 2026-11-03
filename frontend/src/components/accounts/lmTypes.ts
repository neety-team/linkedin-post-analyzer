/* Los tipos del lead magnet, compartidos entre el panel viejo, el workspace y la
   pestana Comments.

   Salieron de LeadMagnetPanel.tsx el 2026-08-20: el workspace se monta ahora
   desde dos sitios y los tipos no podian seguir viviendo dentro de uno de
   ellos. MOVIMIENTO LITERAL, comentarios incluidos. */
import type { Thread } from './shared';

export interface GridPost {
  id: string;
  hook_text: string | null;
  content_text: string | null;
  content_type: string | null;
  published_at: string | null;
  post_url: string | null;
  comments_count: number | null;
  likes_count: number | null;
  creator_name: string | null;
  creator_image: string | null;
}

export interface CommentsResponse {
  post: { id: string; content_text: string | null; creator_name: string | null };
  threads: Thread[];
}

// One row of lead_magnet_sends, as the backend returns it. Keyed by PERSON
// (provider_id), not by comment — one resource per person per post.
export interface SendRecord {
  comment_social_id: string;
  provider_id: string;
  // 'invite' e 'inmail' ya no se crean (2026-08-17) pero SIGUEN LLEGANDO: las
  // filas de antes del cambio se leen igual. 'ask' es el estado nuevo: se le
  // pidió la solicitud y no se le ha mandado nada.
  kind: 'dm' | 'invite' | 'inmail' | 'ask';
  status: 'sent' | 'failed';
  text: string | null;
  error: string | null;
  // El recibo: true = releído en LinkedIn y está ahí. null = no se pudo
  // comprobar, que NO es lo mismo que enviado. false no llega nunca aquí con
  // status 'sent' — el backend lo convierte en 'failed'.
  verificado: boolean | null;
  created_at: string;
}

// Por dónde se le escribe a esta persona.
//
// 'dm' y 'dm-solicitud' son el MISMO mensaje privado (el backend recibe
// kind:'dm' en los dos), solo cambia que el segundo va colgado de la solicitud
// que ella nos mandó. 'pedir' no es un canal de envío: es la ausencia de canal, y
// lo que sale es la respuesta pública.
export type Canal = 'dm' | 'dm-solicitud' | 'pedir';

// A quién podemos escribirle gratis porque nos ha mandado él la solicitud. Se
// pide una vez por cuenta, no una por tarjeta.
export interface CanalInfo {
  pendientes: { provider_id: string; invitation_id: string; name: string | null }[];
  aviso: string | null;
}

// The per-post config (keyword / link / topic). Kept in localStorage keyed by
// post id: you'll come back to the same lead magnet over a couple of days as
// comments trickle in, and retyping the link every time is how a wrong link
// eventually goes out.
// Los 2 tipos de lead magnet (`docs/skills/global-instructions.md §4.4`). No son
// un ajuste: son dos formatos con dos mecánicas y dos resultados distintos.
//  · dm      → comenta la palabra, le mandamos el recurso por privado.
//  · publico → el valor se entrega en el comentario, a la vista de todos, y el
//              enlace lleva a lo que no puede conseguir solo (ahí pedimos correo).
// El público tiene el techo (8.55x · 483 comentarios) pero el que se hizo
// regalaba TODO y no capturó ni un correo. Por eso el público NO pide campos: su
// generador (/api/accounts/rastro/generate) escribe el análisis, le crea su
// página con gate de correo y devuelve el comentario con el enlace ya dentro.
//  · enlace  → el enlace al recurso va EN EL CUERPO del post, a la vista de todos
//              (lead magnet con enlace publico, 03/11). Nadie pide nada en
//              comentarios ni se manda nada por privado: los comentarios se
//              contestan como en cualquier post, sin "te lo acabo de mandar".
export type LmKind = 'dm' | 'publico' | 'lista' | 'enlace';

// Tipos sin canal privado: ni DM, ni solicitudes, ni seguimientos.
export const sinPrivado = (k: LmKind) => k === 'publico' || k === 'enlace';

export interface LmConfig {
  kind: LmKind;
  keyword: string;
  link: string;
  topic: string;
}
export const emptyConfig: LmConfig = { kind: 'dm', keyword: '', link: '', topic: '' };

export interface PedidoRow {
  post_id: string;
  provider_id: string;
  provider_name: string | null;
  sector: string | null;
  // Solo en el tipo lista: la lista entera, montada al pedirle la solicitud.
  followup_text: string | null;
  comment_social_id: string;
  created_at: string;
  dias: number;
  // El id de SU solicitud. Con él, el mensaje sale contestándola: llega igual que
  // un DM y no hay que aceptar nada. null = todavía no la ha mandado, o ya sois
  // contacto por otra vía (entonces sale un DM normal).
  invitation_id: string | null;
  // ⛔ EL RECURSO VIAJA CON LA FILA (Iker, 2026-08-20). El bloque de solicitudes
  // de arriba de Comments no tiene ningún post elegido, así que sin esto el DM
  // salía EN BLANCO y `Enviar DM` mandaba un mensaje vacío. Y el recurso de una
  // persona no es el del post que estés mirando: es el del post donde ELLA
  // comentó, que es de donde salen estos dos campos.
  lead_magnet_config?: LmConfig | null;
  post_content_text?: string | null;
  post_creator_name?: string | null;
}


export interface FollowupRow {
  post_id: string;
  provider_id: string;
  provider_name: string | null;
  sector: string | null;
  // Vacio salvo en el tipo lista, que guarda la lista entera al invitar. En un
  // lead magnet normal el texto se monta aqui con el recurso de la palabra clave.
  followup_text: string | null;
  comment_social_id: string;
  // true = la nota de la invitación YA llevaba el enlace del recurso, así que
  // esta persona no tiene nada pendiente. Lo calcula el backend mirando el texto
  // realmente enviado, no el tipo de lead magnet.
  ya_entregado?: boolean;
}

