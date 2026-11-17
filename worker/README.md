# Worker de `contenido.neety.team`

Mete el analizador en la suite de neety.team: se entra con la sesión de `auth.neety.team`, sin la contraseña compartida. El analizador sigue en Railway; el Worker solo decide quién pasa y le reenvía la petición firmada.

Mientras el Worker no tenga sus dos secretos es un proxy puro y todo funciona como antes.

## Qué pasa y qué no pasa por el login

| Petición | Qué hace el Worker |
|---|---|
| Una persona con sesión de neety.team y acceso a la app | La reenvía firmada, con su correo y su nombre. Entra sin contraseña |
| Una persona sin sesión | La manda al login central y vuelve |
| Con sesión pero sin acceso a esta app | Página de "Sin acceso" |
| `/api/health`, `/r/…`, `/api/submit` | Públicas, igual que en el backend |
| `/mcp` y cualquier petición con credencial de máquina (`Authorization: Basic` o `Bearer`) | Pasan sin firmar: la credencial la comprueba el backend. Es por donde entran Claude y los scripts |
| El login central no responde | 503. No pasa nadie |

## Quién usa hoy la contraseña

No solo las personas. También:

- El MCP `neety-outliers`, en la configuración de Claude de cada uno.
- Ocho scripts de `scripts/` y `backend/src/scripts/` (validador, auditorías, refresco de creadores, menciones).
- `backend/src/services/roaster.ts`, que usa esas mismas dos variables para llamar a otro servicio.

Por eso quitarla tiene dos niveles, y el primero es el que no rompe nada.

## Ponerlo en marcha

En este orden. Los secretos los escribe una persona: no van en el repo.

1. **Backend.** Fusionar este cambio. El backend ya entiende las peticiones firmadas, pero nada cambia hasta el paso 2.
2. **Railway.** En el servicio, añadir la variable `PROXY_SECRET` con un valor largo y aleatorio. Guardarlo: hace falta otra vez en el paso 5.
3. **Login central.** Un C-Level da de alta la aplicación en `https://auth.neety.team/admin/apps`: slug `contenido`, URL `https://contenido.neety.team`. Y da acceso a quien tenga que entrar.
4. **Cloudflare, DNS.** En la zona `neety.team`, borrar el CNAME `contenido` y el TXT `_railway-verify.contenido`. Desde aquí hasta el paso 5 el dominio no responde.
5. **Cloudflare, Worker.** Desde la raíz del repo:

   ```bash
   npx wrangler deploy
   ```

   ```bash
   npx wrangler secret put INTERNAL_TOKEN
   ```

   ```bash
   npx wrangler secret put PROXY_SECRET
   ```

   `INTERNAL_TOKEN` es el mismo valor que tiene el Worker de auth. `PROXY_SECRET`, el del paso 2.
6. **Comprobar.** Abrir `https://contenido.neety.team/semana`: tiene que mandar al login y, al volver, enseñar "Entras como …" sin pedir contraseña.
7. **Quitar la contraseña a las personas.** En Railway, añadir `SOLO_SUITE=1`. Desde ese momento el navegador no vuelve a pedir contraseña en ninguna dirección: quien abra la de Railway ve un aviso de que se entra por la suite. El MCP y los scripts siguen funcionando igual. **Solo después de comprobar el paso 6**, o nadie podrá entrar.
8. **Railway, limpieza.** Quitar `contenido.neety.team` de los dominios del servicio: ya no lo sirve Railway directamente.

## Quitarla también para las máquinas (opcional, más adelante)

Borrar `APP_BASIC_USER` y `APP_BASIC_PASS` en Railway. Antes hay que:

- Añadir `API_TOKEN` en Railway y cambiar la cabecera del MCP de cada uno a `Authorization: Bearer <token>`.
- Pasar los scripts a ese token.
- Dar otra credencial al roaster, que hoy reutiliza esas dos variables.

Con `PROXY_SECRET` o `API_TOKEN` definidos, la app no se queda abierta al borrar la contraseña: lo que no venga firmado ni con token recibe un 401.

## Volver atrás

- Quitar `SOLO_SUITE` devuelve la ventana de contraseña.
- Borrar cualquiera de los dos secretos del Worker lo deja en proxy puro.

## Probarlo sin desplegar

```bash
node worker/prueba.mjs
```

Sustituye el login central y el backend por dobles y comprueba 25 casos: sin secretos, sin sesión, con sesión, identidad falsificada por el cliente, CSRF, rutas públicas, MCP, sin acceso y login caído.
