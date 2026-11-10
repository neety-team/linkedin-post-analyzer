// Qué hilos de comentarios siguen pendientes y a quién hay que contestar.
//
// Sale de `buildThreadsForPost` (routes/accounts.ts) el 2026-11-10 para poder
// testearla sin Unipile: scripts/testComentariosPendientes.ts. Las reglas
// previas (contestado = contestado LO ÚLTIMO, 2026-08-11; la reacción cuenta
// como atenderlo, 2026-08-11; lo que cierra un hilo es su cola, 2026-08-12)
// siguen intactas cuando no hay ignorados. El porqué de cada una está abajo,
// copiado tal cual de accounts.ts.
//
// ⛔ IGNORAR (2026-11-10, spec docs/superpowers/specs/2026-11-10-ignorar-comentarios-design.md).
// Un comentario ignorado es una REACCIÓN INVISIBLE: cuenta como atendido y
// LinkedIn no se entera. Se ignora un COMENTARIO (su id), nunca a una persona:
// si esa misma persona vuelve a escribir, es otro id y el hilo vuelve.
// La cola que decide si el hilo está cerrado es el último mensaje NO ignorado:
// ignorar el último no cierra el hilo si queda un follow-up pendiente antes.

export interface ComentarioMin {
  id: string;
  date: string | null;
  author: { profile_id: string | null };
  my_reaction?: string | null;
}

export interface HiloMin<C extends ComentarioMin = ComentarioMin> extends ComentarioMin {
  replies: C[];
  answered_by_author?: boolean;
  pending_followups?: C[];
}

// ── Historia de las reglas previas, tal y como estaban en accounts.ts ──
// ⛔ "CONTESTADO" ES CONTESTADO LO ÚLTIMO, NO CONTESTADO ALGUNA VEZ
// (Iker, 2026-08-11).
//
// Antes bastaba con que EXISTIERA una respuesta nuestra en el hilo para
// darlo por cerrado para siempre. Pero un hilo sigue vivo después de que
// contestemos: en el lead magnet del 11/08, Iker respondió a Mario, y
// después entraron Vicente Garcés pidiendo el recurso y Mario otra vez. La
// herramienta ya no los enseñaba, así que un lead que pedía el recurso EN
// VOZ ALTA se quedaba sin contestar y sin que nadie lo viera.
//
// Ahora se compara con la FECHA: un hilo vuelve a estar pendiente si alguien
// que no somos nosotros ha escrito DESPUÉS de nuestra última intervención.
// Y los mensajes nuevos van aparte en `pending_followups`, para que la UI
// pueda enseñar exactamente cuáles hay que responder en vez de repintar el
// hilo entero como si no lo hubiéramos tocado.
// Nunca hemos ESCRITO en el hilo, así que no hay follow-ups que separar:
// el pendiente es el comentario de arriba entero.
//
// Pero sí puede estar atendido con una REACCIÓN, y eso cuenta igual que
// en el resto del flujo: la cola aquí es la última respuesta si la hay, y
// si no el propio comentario de arriba. Sin esto, reaccionar a un
// comentario sin contestarlo lo dejaba en la bandeja para siempre.
// Una fecha ausente vale 0, así que nunca cuenta como posterior: mejor no
// resucitar un hilo por un dato que falta que inundar la bandeja.
//
// ⛔ Y UNA REACCIÓN NUESTRA YA CUENTA COMO ATENDERLO (Iker, 2026-08-11).
//
// Al empezar a mostrar los follow-ups, la bandeja se llenó: cada hilo vivo
// de cada post reciente vuelve a entrar. Pero a muchos de esos mensajes la
// respuesta correcta ES un 👍 — no todo merece texto. Si reaccionar no los
// sacaba de la lista, la única forma de vaciarla era contestar a todo.
//
// `my_reaction` viene de `user_reacted` de Unipile, o sea de LinkedIn: vale
// igual si la reacción se puso desde la app o desde el móvil.
//
// ⏱️ El efecto es DIFERIDO a propósito, que es justo como lo pidió: esto se
// calcula al pedir los comentarios, así que el que acabas de reaccionar
// sigue en pantalla hasta que recargas. Si desapareciera al instante, la
// tarjeta se esfumaría bajo el cursor y no podrías rectificar.
// ⛔ LO QUE CIERRA UN HILO ES SU COLA, NO QUE NO QUEDE NADA SUELTO EN MEDIO
// (Iker, 2026-08-12).
//
// Antes bastaba UN mensaje sin atender en cualquier punto para que el hilo
// volviera. Y hay un caso en el que eso es justo lo contrario de lo que
// quieres: el hilo del tatuaje, donde a un comentario hostil de en medio se
// decidió NO contestar, y al de abajo se le puso una reacción. Con la regla
// vieja ese hilo reaparecía para siempre por el de en medio.
//
// Iker: *"si entre medias hay un comentario sin responder ni interactuar es
// por algo. Dudo que se me haya olvidado"*. Un hilo es una conversación: si
// la ÚLTIMA intervención está atendida —es nuestra, o le hemos puesto una
// reacción— la conversación está cerrada, decidas lo que decidas del medio.
// Y si entra alguien nuevo, la cola cambia y el hilo vuelve solo, que es
// exactamente lo que se quiere.
//
// La cola es la última respuesta; si el hilo no tiene ninguna, es el propio
// comentario de arriba.

const tsOf = (d: string | null) => (d ? new Date(d).getTime() : 0);

export function marcarPendientes<C extends ComentarioMin, H extends HiloMin<C>>(
  hilos: H[],
  authorId: string | null,
  ignorados: Set<string> = new Set()
): void {
  for (const t of hilos) {
    if (!authorId) {
      t.answered_by_author = false;
      t.pending_followups = [];
      continue;
    }
    const esNuestro = (c: ComentarioMin) => c.author.profile_id === authorId;
    const ignorado = (c: ComentarioMin) => ignorados.has(c.id);

    // La cola efectiva: el último mensaje del hilo que no se ha ignorado. Si
    // todo lo que no es nuestro está ignorado, no hay cola y no queda nada.
    const todos: ComentarioMin[] = [t, ...t.replies];
    const noIgnorados = todos.filter((c) => !ignorado(c));
    const cola = noIgnorados.length ? noIgnorados[noIgnorados.length - 1] : null;

    const mias = todos.filter(esNuestro).map((c) => tsOf(c.date));
    const mia = mias.length ? Math.max(...mias) : null;

    if (mia === null) {
      // Nunca hemos escrito en el hilo. El pendiente es el comentario de arriba
      // entero... salvo que lo hayamos ignorado: entonces lo que espera son las
      // respuestas de otros sin atender, y la respuesta va dirigida a ellas.
      t.pending_followups = ignorado(t)
        ? t.replies.filter((r) => !esNuestro(r) && !r.my_reaction && !ignorado(r))
        : [];
      t.answered_by_author = !cola || !!cola.my_reaction;
      continue;
    }

    // Una fecha ausente vale 0, así que nunca cuenta como posterior: mejor no
    // resucitar un hilo por un dato que falta que inundar la bandeja.
    t.pending_followups = t.replies.filter(
      (r) => !esNuestro(r) && tsOf(r.date) > mia && !r.my_reaction && !ignorado(r)
    );
    t.answered_by_author = !cola || esNuestro(cola) || !!cola.my_reaction;
  }
}
