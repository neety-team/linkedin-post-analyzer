# linkedin-post-analyzer

Herramienta interna de Neety para **analizar outliers de LinkedIn** y el **cerebro con el que escribimos** posts y correos en las cuentas de los fundadores.

## Qué hay

| Carpeta | Qué es |
|---|---|
| `backend/` | API (Node + TypeScript, Railway): creadores, posts, métricas, outliers y el Post Creator |
| `frontend/` | Panel web del analizador (React + Vite) |
| `mcp/` | Servidor MCP `neety-outliers`: el corpus de outliers consultable desde Claude |
| `docs/skills/` | Las recetas: cómo se escribe cada post y cada correo |
| `scripts/` | Validadores, montadores de imágenes y auditorías |

## Skills (`docs/skills/`)

**Se cargan en este orden antes de escribir un post:**
1. `aboutme.md` · identidad, ICP y diferenciales
2. `brand-voice.md` · cómo suena cada cuenta y las reglas anti-IA
3. `working-preferences.md` · cómo se entrega y cuándo se avisa
4. `global-instructions.md` · gancho, cuerpo, ninja y pase de criterio
5. `outliers-database.md` · la evidencia (lo que ha funcionado y por qué)
6. `swipe-file.md` · anatomía de nuestros mejores posts

**Orquestación:** `post-workflow.md` · receta por pilar (mapa, Las 10, despiece, meme, historia, lead magnet, noticia, tarjeta) y plan semanal de las tres cuentas.

**Según el artefacto:**
- `images.md` · imagen y tarjeta
- `video.md` · vídeo
- `lead-magnet-web.md` · gate y recurso de `recursos.neety.com`
- `email-marketing.md` (+ `_EMPIEZA-AQUI-email.md`, `corpus-correos-enviados.md`) · newsletter y secuencias

**Estado (cambia cada semana):**
- `historial-publicaciones.md` · qué publicó cada cuenta, A/B abiertos y cobertura de regiones
- `historial-newsletter.md` · qué correos se enviaron

## Validadores (`scripts/`)

| Script | Para qué |
|---|---|
| `validar-post.py` | Post de LinkedIn: reglas mecánicas + criterio por escrito. Con `ENTREGABLE: SÍ` imprime el bloque para pegar |
| `validar-email.py` | Correos |
| `validar-video.py` | Guion y caption de vídeo |
| `validar-recurso.py` | Recurso de un lead magnet |
| `test-cobertura-reglas.py` | Que cada regla dura de las recetas tenga dueño |

Ejemplo:

```bash
python scripts/validar-post.py post.txt --pilar historia --cuenta unai --criterio criterio.txt
```

## Reglas que no se negocian

- Nada inventado: ni empresas, ni personas, ni cifras. Lo no verificado va como `[PENDIENTE · no verificado]`.
- Al que compra no se le juzga, en ninguna cuenta.
- Credenciales siempre del entorno, nunca en el repo.
- Detalle completo en `CLAUDE.md`.
