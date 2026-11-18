# Objetivo de cada post en Cuentas

**Fecha:** 2026-11-18 · **Estado:** aprobado para implementar

## Qué es

Una chapa con el OBJETIVO con el que se publicó cada post (la intención previa, no el resultado) en las tarjetas de Cuentas, en Live posts y en Top posts. Tres valores, los mismos de Semana y sin subtipos: **Alcance**, **Notoriedad**, **Conversión**.

## Orden de la cabecera

`Pilar · Objetivo · CTR · multiplicador · ⋮`

El menú ⋮ pasa del principio al final. En Top posts no hay menú: `Pilar · Objetivo · CTR · multiplicador`.

## Diseño visual

- Mismo tamaño y forma que la chapa del pilar (`px-1.5 py-0.5 rounded text-[10px] font-medium`).
- Colores de Semana, en una constante compartida (`frontend/src/utils/objetivo.ts`) que usan las dos páginas: alcance `text-data bg-data/10`, notoriedad `text-diamond bg-diamond/15`, conversión `text-accent bg-accent/10`.
- Al pasar el ratón: de dónde sale (cambiado a mano · planificado en Semana · barrido del histórico · regla del pilar) y que se pulsa para cambiarlo.
- Se pulsa y se cambia, como el pilar: las tres opciones y «Automático», que borra el cambio a mano.

## De dónde sale (prioridad)

1. **Manual** (`posts.objetivo_origen = 'manual'`): manda siempre, también antes del 14/04.
2. **Semana**: el post de `semana_posts` enlazado por `linkedin_post_id` (comparando solo los dígitos, porque Unipile devuelve a veces la URN y a veces el número) o, si no hay enlace, el único post planificado para esa cuenta ese día cuando la cuenta solo publicó uno ese día (fecha en hora de Madrid).
3. Antes del **14/04/2026** (inicio de la estrategia) no hay objetivo: sin chapa.
4. **Barrido** (`posts.objetivo_origen = 'barrido'`): lo escrito una vez sobre el histórico.
5. **Regla del pilar**: meme y peloteo → alcance; evento e historia/evento → notoriedad; lead magnet e historia → conversión; tarjeta, otro y sin pilar → sin chapa.

Solo en cuentas propias (`creators.is_managed`). Se calcula al leer, así un cambio de pilar o un post enlazado desde Semana se ve sin reprocesar.

## Barrido del histórico (desde el 14/04)

Los posts de meme, peloteo, evento, historia/evento, lead magnet e historia los cubre la regla del pilar y no se escriben. Los de «otro» y «tarjeta» se leen uno a uno y se escribe su objetivo con origen `barrido`, por su texto y su enlace: demo o recurso → conversión; hito, evento o premio → notoriedad; humor o peloteo sin etiquetar → alcance. Las historias en las que la regla no encaja (hito o evento clasificado como historia) también se corrigen. Lista de decisiones a ojo en la entrega.

## Arquitectura

- **Migración**: `posts.objetivo TEXT` y `posts.objetivo_origen TEXT` (`manual` | `barrido`).
- **Backend** `backend/src/services/objetivo.ts`: `OBJETIVOS`, `INICIO_ESTRATEGIA`, `objetivoPorPilar(slug)` (pura, con test) y `sqlObjetivoLateral()` (el `LEFT JOIN LATERAL` que devuelve `objetivo` y `objetivo_fuente`).
- Se añade a las consultas de `/api/accounts/live-posts` y de top posts del análisis.
- `PATCH /api/posts/:id/objetivo` `{ objetivo: 'alcance'|'notoriedad'|'conversion'|null }` (null vuelve a automático).
- `POST /api/posts/objetivos/barrido` `{ asignaciones: [{ id, objetivo }] }`: escribe con origen `barrido` y nunca pisa uno manual.
- **Frontend** `frontend/src/components/accounts/ObjetivoSelector.tsx` y `frontend/src/utils/objetivo.ts`; Semana pasa a usar la constante compartida.

## Fuera

Filtrar Cuentas por objetivo y medir si se cumplió.
