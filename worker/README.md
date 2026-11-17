# Worker de `contenido.neety.team`

Mete el analizador en la suite de neety.team: se entra con la sesión de `auth.neety.team`. El analizador sigue en Railway; el Worker solo decide quién pasa y le reenvía la petición firmada.

**El analizador ya no tiene contraseña compartida (17/11/2026).** Hay dos puertas y nada más:

| Quién | Por dónde entra | Variable en Railway |
|---|---|---|
| Las personas | La suite: este Worker valida su sesión y firma la petición | `PROXY_SECRET` |
| Las máquinas (el MCP y los scripts) | Un token: `Authorization: Bearer <token>` | `API_TOKEN` |

Sin ninguna de las dos variables no entra nadie: la app está cerrada por defecto.

## Qué pasa y qué no pasa por el login

| Petición | Qué hace el Worker |
|---|---|
| Una persona con sesión de neety.team y acceso a la app | La reenvía firmada, con su correo y su nombre |
| Una persona sin sesión | La manda al login central y vuelve |
| Con sesión pero sin acceso a esta app | Página de "Sin acceso" |
| `/api/health`, `/r/…`, `/api/submit` | Públicas, igual que en el backend |
| `/mcp` y cualquier petición con `Authorization: Bearer …` | Pasan sin firmar: el token lo comprueba el backend |
| El login central no responde | 503. No pasa nadie |

## Ponerlo en marcha

**El orden importa.** El cambio que quita la contraseña se fusiona al final, en el paso 6: si se fusiona antes de tener la suite y el token funcionando, no puede entrar nadie. Los pasos 1 a 5 se hacen con la versión anterior desplegada, que ya entiende la firma y el token, así que no hay ningún momento sin servicio.

Los secretos los escribe una persona: no van en el repo ni en un chat.

1. **Railway.** En el servicio, añadir dos variables con valores largos y aleatorios, distintos entre sí: `PROXY_SECRET` y `API_TOKEN`. Guardarlos: el primero hace falta en el paso 3 y el segundo en el 5.
2. **Login central.** Un C-Level da de alta la aplicación en `https://auth.neety.team/admin/apps`: slug `contenido`, URL `https://contenido.neety.team`. Y da acceso a quien tenga que entrar.
3. **Cloudflare.** En la zona `neety.team`, borrar el CNAME `contenido` y el TXT `_railway-verify.contenido`. Después, desde la raíz del repo:

   ```bash
   npx wrangler deploy
   ```

   ```bash
   npx wrangler secret put INTERNAL_TOKEN
   ```

   ```bash
   npx wrangler secret put PROXY_SECRET
   ```

   `INTERNAL_TOKEN` es el mismo valor que tiene el Worker de auth. `PROXY_SECRET`, el del paso 1. Entre borrar el DNS y acabar el despliegue el dominio no responde.
4. **Comprobar a las personas.** Abrir `https://contenido.neety.team/semana`: tiene que mandar al login y, al volver, enseñar "Entras como …".
5. **Pasar las máquinas al token.**
   - El MCP `neety-outliers`, en la configuración de Claude de cada uno: la cabecera pasa a ser `Authorization: Bearer <API_TOKEN>` (ver `mcp/README.md`).
   - Quien corra los scripts de `scripts/` define `API_TOKEN` en su entorno.
   - Comprobar que el MCP sigue respondiendo.
6. **Fusionar el cambio que quita la contraseña.** A partir de aquí la contraseña no abre nada, ni en `contenido.neety.team` ni en la dirección de Railway.
7. **Limpieza en Railway.**
   - Quitar `contenido.neety.team` de los dominios del servicio: ya lo sirve el Worker.
   - Quitar `SOLO_SUITE` si se llegó a poner: ya no se lee.
   - `APP_BASIC_USER` y `APP_BASIC_PASS`: solo las usa el proxy del roaster, para entrar en la app del roaster. Se pueden borrar cuando existan `ROASTER_USER` y `ROASTER_PASS` con esas credenciales.

## Volver atrás

- Borrar cualquiera de los dos secretos del Worker lo deja en proxy puro, y entonces no entra ninguna persona.
- Para recuperar la contraseña hay que revertir el cambio del paso 6.

## En local

Para levantar el backend sin Worker ni token se pone `ACCESO_ABIERTO=1`. En Railway esa variable se ignora.

## Probarlo sin desplegar

```bash
node worker/prueba.mjs
```

Sustituye el login central y el backend por dobles y comprueba 24 casos: sin secretos, sin sesión, con sesión, identidad falsificada por el cliente, CSRF, rutas públicas, MCP, contraseña que ya no vale, sin acceso y login caído.
