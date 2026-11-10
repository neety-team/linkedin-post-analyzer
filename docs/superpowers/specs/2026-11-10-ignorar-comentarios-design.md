# Ignorar comentarios en la bandeja (2026-11-10)

## Problema

La pestaña Comentarios solo saca un hilo de la bandeja cuando su último mensaje
está atendido (respuesta nuestra o reacción). Un comentario que se decide NO
atender a propósito (polémico, no merece más visibilidad) se queda en la bandeja
para siempre, porque responder o reaccionar es justo lo que no se quiere hacer.

## Qué se construye

Un botón «Ignorar» por comentario, en el comentario de arriba de un hilo y en
cada respuesta marcada «sin contestar». Ignorar es una **reacción invisible**:
solo existe en nuestra base de datos, LinkedIn no se entera.

## Reglas

1. Se ignora un **comentario** (su id de LinkedIn), nunca una persona ni un post.
   No afecta a otros comentarios de la misma persona ni a otras publicaciones.
2. Un comentario ignorado cuenta como atendido, igual que uno con reacción.
3. La cola del hilo (lo que decide si está cerrado) es el **último mensaje no
   ignorado**:
   - si es nuestro o tiene reacción → hilo cerrado;
   - si no queda ninguno (todo lo de fuera ignorado) → hilo cerrado;
   - si queda uno sin atender → hilo abierto, y la respuesta apunta al primer
     pendiente no ignorado.
4. Ignorar el último mensaje NO cierra el hilo si sigue habiendo un follow-up
   pendiente antes que él.
5. Un comentario nuevo posterior (de otra persona o de la misma) es otro id:
   vuelve a abrir el hilo.
6. Si se ignora el comentario de arriba de un hilo en el que nunca hemos
   escrito, las respuestas de otros que no estén atendidas pasan a ser los
   follow-ups pendientes (la respuesta va dirigida a ellos, no al ignorado).
7. **Fuera de los lead magnet.** En un post de pilar `lead_magnet` el botón no se
   pinta (tampoco en comentarios de página de empresa): ahí cada comentario es
   casi siempre un lead y perderlo por un clic cuesta más de lo que ahorra.
8. Se puede deshacer: aviso «Ignorado · Deshacer» unos segundos tras el clic.

## Arquitectura

- **Tabla** `comment_ignores (comment_social_id PK, post_id FK posts ON DELETE
  CASCADE, created_at)` en `backend/src/db/migrate.ts`.
- **Lógica pura** en `backend/src/services/comentariosPendientes.ts`:
  `marcarPendientes(threads, authorId, ignorados)` decide `answered_by_author` y
  `pending_followups`. Sale de `buildThreadsForPost` para poder testearla.
  `buildThreadsForPost` lee los ignorados del post y la llama: así la bandeja
  general y la vista de un post dicen lo mismo.
- **Rutas**: `POST` y `DELETE /api/accounts/posts/:postId/comments/:commentId/ignore`.
- **Frontend** (`CommentCards.tsx`): botón en `ThreadCard` y en cada respuesta
  «sin contestar». Al ignorar, la tarjeta se actualiza al momento: desaparece si
  no queda pendiente, o se reapunta al siguiente follow-up. La chapa «N sin
  responder» baja. El borrador en curso se descarta.

## Pruebas

`backend/src/scripts/testComentariosPendientes.ts` (npx tsx) cubre: el hilo de la
captura (respuesta nuestra + follow-up ignorado → cerrado), dos follow-ups con
uno ignorado, ignorar el último con otro pendiente antes, comentario nuevo
después de ignorar, la misma persona que vuelve a escribir, comentario de arriba
ignorado sin respuestas y con respuesta de un tercero, y las reglas previas sin
ignorados (reacción, cola nuestra, el de en medio sin atender) sin cambios.
