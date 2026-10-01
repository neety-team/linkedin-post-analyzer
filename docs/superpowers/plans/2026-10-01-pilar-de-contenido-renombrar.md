# Pilar de contenido: textos y lápiz para renombrar · Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** El selector de pilar de Accounts habla de "pilar de contenido" y deja renombrar cualquier pilar (también los de serie) con un lápiz siempre visible; "Peloteo Regional (los 10)" pasa a "Peloteo Regional (las 10)".

**Architecture:** Solo cambia `frontend/src/components/accounts/PilarSelector.tsx`. El backend ya tiene `PATCH /api/pillars/:slug {label}`, que acepta builtin y cambia solo la etiqueta; la semilla de `migrate.ts` es `ON CONFLICT DO NOTHING`, así que un despliegue no pisa el nombre. El dato se cambia con ese mismo endpoint.

**Tech Stack:** React + TypeScript + Tailwind (Vite), Express + Postgres en Railway.

## Global Constraints

- Texto visible: "pilar de contenido", nunca "categoría".
- Lápiz `✎` en TODOS los pilares, siempre visible, gris y naranja al pasar el ratón (decisión de Iker).
- Papelera: solo en los no builtin y al pasar el ratón (sin cambios).
- Nombre entre 2 y 40 caracteres (límite del endpoint).
- Typecheck del frontend con `npx tsc -b`; `tsc --noEmit` ahí no comprueba nada.
- `git add` por nombre de fichero, nunca `-A` (hay otra sesión en el directorio).

## Lo que puede salir mal y cómo lo cubre el plan

| # | Casuística | Qué pasaría hoy | Cobertura |
|---|---|---|---|
| 1 | **Esc en el campo de renombrar** | el `keydown` de `document` cierra el panel entero; al desmontarse el input puede saltar `onBlur` y **guardar** lo que hubiera escrito | `e.stopPropagation()` en el Esc del input + ref `cancelarRef` que hace que el blur posterior no guarde |
| 2 | **Enter y después blur** (doble envío) | dos `PATCH` seguidos | guarda `if (ocupado) return` y ref `enviandoRef` |
| 3 | **Mismo nombre que ya tiene** | un `PATCH` inútil | si no cambia, se cierra sin llamar |
| 4 | **Nombre repetido de otro pilar** | dos pilares que se leen igual; el backend no lo impide | error en rojo `Ya hay un pilar de contenido con ese nombre` y no se envía |
| 5 | **Más de 40 caracteres** | 400 del backend | `maxLength={40}` en el input |
| 6 | **Vacío o 1 carácter** | hoy no envía pero se queda abierto | se cancela y vuelve a la fila |
| 7 | **Error de red o 500** | — | error en rojo, el campo sigue abierto con lo escrito para reintentar |
| 8 | **Otras tarjetas con el mismo pilar** | — | `recargar()` del contexto: cambian todas a la vez |
| 9 | **Clic en el lápiz asigna el pilar** | — | el lápiz es un botón aparte del de asignar (ya lo es) |
| 10 | **Pantalla táctil** (sin hover) | el lápiz no se veía nunca | siempre visible |
| 11 | **Fila estrecha con lápiz + papelera** | — | `min-w-0` + `truncate` en la etiqueta (ya están) |
| 12 | **Algo depende del texto `Peloteo Regional (los 10)`** | romperse al renombrar | comprobado con grep: nada en frontend, backend ni scripts (solo la semilla) |
| 13 | **El despliegue devuelve el nombre viejo** | — | la semilla es `ON CONFLICT (slug) DO NOTHING` |
| 14 | **El clasificador deja de reconocer el pilar** | — | el slug `peloteo_los10` no cambia; solo la etiqueta |

---

### Task 1: Renombrar "Los 10" en datos

**Files:** ninguno (dato vía API).

- [ ] **Step 1: Ver el estado actual**

```bash
curl -s -u "$APP_BASIC_USER:$APP_BASIC_PASS" https://linkedin-post-analyzer-production.up.railway.app/api/pillars
```
Expected: entre otros, `{"slug":"peloteo_los10","label":"Peloteo Regional (los 10)",…,"builtin":true}`. Comprobar que no hay ya otro pilar con label `Peloteo Regional (las 10)`.

- [ ] **Step 2: Renombrar**

```bash
curl -s -u "$APP_BASIC_USER:$APP_BASIC_PASS" -X PATCH -H "Content-Type: application/json" \
  -d '{"label":"Peloteo Regional (las 10)"}' \
  https://linkedin-post-analyzer-production.up.railway.app/api/pillars/peloteo_los10
```
Expected: `{"ok":true,"pillar":{"slug":"peloteo_los10","label":"Peloteo Regional (las 10)",…}}`

- [ ] **Step 3: Verificar** con el GET del Step 1 que el slug sigue siendo `peloteo_los10` y el `posts_count` no ha cambiado.

### Task 2: PilarSelector, textos y lápiz robusto

**Files:**
- Modify: `frontend/src/components/accounts/PilarSelector.tsx`

**Interfaces:** consume `apiPatch('/api/pillars/:slug', {label})` y `recargar()` del contexto (existentes). No exporta nada nuevo.

- [ ] **Step 1: Refs y función `renombrar` con las guardas 2, 3, 4, 6 y 7**

```tsx
  // Guardas del renombrado (casuisticas 1 y 2 del plan): Esc no debe guardar
  // aunque el blur llegue despues, y Enter + blur no debe mandar dos PATCH.
  const cancelarRef = useRef(false);
  const enviandoRef = useRef(false);

  const empezarRenombrar = (p: Pilar) => {
    cancelarRef.current = false;
    setError(null);
    setRenombrando(p.slug);
    setNombreNuevo(p.label);
  };

  const renombrar = async (slug: string) => {
    if (cancelarRef.current) { cancelarRef.current = false; return; }
    if (enviandoRef.current) return;
    const label = nombreNuevo.trim();
    const pilar = porSlug[slug];
    // Vacio, 1 caracter o sin cambios: se vuelve a la fila sin llamar a nadie.
    if (label.length < 2 || !pilar || label === pilar.label) { setRenombrando(null); return; }
    const repetido = pilares.some((p) => p.slug !== slug && p.label.toLowerCase() === label.toLowerCase());
    if (repetido) { setError('Ya hay un pilar de contenido con ese nombre'); return; }
    enviandoRef.current = true;
    setOcupado(true);
    setError(null);
    try {
      await apiPatch(`/api/pillars/${slug}`, { label });
      await recargar();
      setRenombrando(null);
    } catch (e: any) {
      setError(e.message);   // el campo sigue abierto con lo escrito
    } finally {
      enviandoRef.current = false;
      setOcupado(false);
    }
  };
```

- [ ] **Step 2: Input de renombrar con Esc que no cierra el panel ni guarda (casuísticas 1 y 5)**

```tsx
                  <input
                    autoFocus
                    value={nombreNuevo}
                    maxLength={40}
                    onChange={(e) => setNombreNuevo(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') void renombrar(p.slug);
                      if (e.key === 'Escape') {
                        // Sin esto el keydown de document cierra el panel entero y
                        // el blur del input al desmontarse guardaria lo escrito.
                        e.stopPropagation();
                        cancelarRef.current = true;
                        setError(null);
                        setRenombrando(null);
                      }
                    }}
                    onBlur={() => void renombrar(p.slug)}
                    disabled={ocupado}
                    className="flex-1 text-xs bg-bg-primary border border-accent rounded px-2 py-1 focus:outline-none"
                  />
```

- [ ] **Step 3: Lápiz siempre visible en todos; papelera solo en no builtin y al hover (casuísticas 9, 10, 11)**

```tsx
                    <button
                      onClick={() => empezarRenombrar(p)}
                      disabled={ocupado}
                      className="text-[10px] text-text-muted hover:text-accent px-1 flex-shrink-0 disabled:opacity-50"
                      title="Renombrar"
                      aria-label={`Renombrar ${p.label}`}
                    >
                      ✎
                    </button>
                    {/* Los de serie no llevan papelera: el clasificador los emite
                        por su slug, asi que borrarlos solo consigue que el
                        reproceso los reinvente con sus posts ya en Otro. El
                        lapiz si: cambia solo la etiqueta y el slug se queda. */}
                    {!p.builtin && (
                      <button
                        onClick={() => void borrar(p)}
                        className="text-[10px] text-text-muted hover:text-red-400 px-1 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
                        title="Borrar"
                        aria-label={`Borrar ${p.label}`}
                      >
                        🗑
                      </button>
                    )}
```

- [ ] **Step 4: Textos a "pilar de contenido"**
  - placeholder → `Buscar o crear pilar de contenido…`
  - vacío → `Ningún pilar de contenido con ese nombre.`
  - nota → `Un pilar de contenido que crees tú no se detecta solo: sus posts los marcas a mano.`
  - `title` del badge → `…\n\nPulsa para cambiar el pilar de contenido`
  - aviso de borrar → `Borrar el pilar de contenido "X"…`
  - comentario de cabecera: añadir la decisión del 01/10.

- [ ] **Step 5: Typecheck y build**

```bash
cd frontend && npx tsc -b && npx vite build
```
Expected: sin errores.

- [ ] **Step 6: Verificar en el navegador** (`preview_start frontend-prod`, contra producción), en Accounts:
  1. El badge de un post abre el panel; el placeholder dice "pilar de contenido".
  2. Se ve el `✎` en todas las filas sin pasar el ratón, también en los de serie; la papelera solo aparece al hover en los creados a mano.
  3. Lápiz en "Peloteo Regional (las 10)" → Esc: el panel sigue abierto, el nombre no cambia y no sale ningún PATCH en red.
  4. Lápiz → escribir el nombre de otro pilar existente → Enter: error en rojo y ningún PATCH.
  5. Lápiz → sin cambiar nada → clic fuera del campo: vuelve a la fila y ningún PATCH.
  6. Consola sin errores.

- [ ] **Step 7: Commit y push**

```bash
git add frontend/src/components/accounts/PilarSelector.tsx docs/superpowers/plans/2026-10-01-pilar-de-contenido-renombrar.md
git commit -m "accounts: el selector dice 'pilar de contenido' y el lapiz renombra cualquier pilar, builtin incluido, con guardas"
git push origin main
```

### Task 3: Comprobar en producción

- [ ] **Step 1:** a los ~3 min del push, GET `/api/pillars`: `peloteo_los10` sigue con `Peloteo Regional (las 10)`.
- [ ] **Step 2:** el post de "Las 10" de Iker del 01/10 (`urn:li:activity:7511376078913957888`): leer su `pillar` en la BD. Si el clasificador lo ha puesto en otro (el cuerpo lleva ahora el bloque de números del mapa), se reclasifica a `peloteo_los10` con `PATCH /api/posts/{id}/pillar` y se avisa.
