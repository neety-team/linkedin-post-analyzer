# Pilar de contenido: nombre y lápiz para renombrar (2026-10-01)

## Qué pide Iker

En **Accounts**, el badge de arriba a la derecha de cada publicación abre el selector de pilar. Dos cosas:

1. El buscador dice *"Buscar o crear categoría…"*. Tiene que hablar de **pilar de contenido**.
2. Quiere **un lápiz para renombrar cualquier pilar**, también los de serie. Primer uso: `Peloteo Regional (los 10)` → `Peloteo Regional (las 10)`, porque desde hoy el formato es "Las 10" (10 empresas con logo, `post-workflow §4.3-LAS10`).

## Lo que ya hay (y por eso el cambio es pequeño)

- `PATCH /api/pillars/:slug {label}` ya existe y **acepta los builtin**: cambia solo la etiqueta visible. El slug (`peloteo_los10`) se queda, que es la clave de los posts y lo que emite el clasificador.
- La semilla de `migrate.ts` usa `ON CONFLICT (slug) DO NOTHING`: un despliegue no pisa el nombre que ponga Iker.
- `PilarSelector.tsx` ya tiene el modo renombrar (input, Enter guarda, Esc cancela, blur guarda), pero el `✎` solo sale en los pilares **no builtin** y solo **al pasar el ratón**. Por eso Iker no lo encontraba.

## Cambios (solo `frontend/src/components/accounts/PilarSelector.tsx`)

1. **Textos**: "categoría" → "pilar de contenido".
   - placeholder: `Buscar o crear pilar de contenido…`
   - vacío: `Ningún pilar de contenido con ese nombre.`
   - nota inferior: `Un pilar de contenido que crees tú no se detecta solo: sus posts los marcas a mano.`
   - el `title` del badge y el aviso de borrar, igual.
2. **Lápiz en todos los pilares, siempre visible** (decidido por Iker): `✎` gris pequeño a la derecha de cada fila, naranja al pasar el ratón. Título del botón: `Renombrar`.
3. **Papelera sin cambios**: solo en los no builtin y al pasar el ratón. Los builtin no se borran porque el clasificador los reinventaría.
4. **Renombrar un builtin** usa el mismo flujo y el mismo endpoint. Sin cambios de backend.

## Datos

Tras desplegar, `PATCH /api/pillars/peloteo_los10 {"label": "Peloteo Regional (las 10)"}` desde la API (con Basic Auth del entorno). Iker podrá cambiarlo después desde el lápiz.

## Errores

Los del endpoint (nombre de menos de 2 o más de 40 caracteres, pilar inexistente, 500) se pintan en rojo dentro del desplegable, como ya hace el componente. Nombre vacío o de 1 carácter: no se envía.

## Pruebas

- `tsc -b` en el frontend (el `tsc --noEmit` de ahí no comprueba nada).
- En el navegador, contra producción: el lápiz se ve en todos sin pasar el ratón; renombrar un builtin cambia la etiqueta en todas las tarjetas; Esc cancela; el placeholder dice "pilar de contenido".
- Después, el post de "Las 10" de Iker del 01/10 sigue clasificado como `peloteo_los10` y ahora se lee `Peloteo Regional (las 10)`.

## Fuera de alcance

- Cambiar slugs o el clasificador.
- Las cabeceras de anuncio de `backend/src/services/anuncioChat.ts` (`LOS 10 de {N}…`): se anotan como pendiente aparte.
