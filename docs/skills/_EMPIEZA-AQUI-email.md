# Paquete de EMAIL MARKETING de Neety — índice de lectura

Exportado el 2026-08-03 desde el repo `linkedin-post-analyzer`, rama `main`.
**La skill de email NO es un solo archivo:** es una principal + cuatro de las que depende + el validador.

---

## Orden de carga (léelo en este orden)

| # | Archivo | Qué es | ¿Imprescindible? |
|---|---|---|---|
| 1 | **`email-marketing.md`** | **LA skill.** Asuntos, cuerpos, los 4 remitentes (Iker/Asier/Unai/Kaixito), pilares, secuencia de bienvenida, sistema de tandas, animaciones de Kaixito y el análisis de los 5 corpus de newsletters | **SÍ** |
| 2 | `aboutme.md` | Quién es Neety, el ICP y los 3 diferenciales (§1b). De aquí sale lo que se promete en los correos | **SÍ** |
| 3 | `brand-voice.md` | Cómo suena la marca. **§3 = tabla anti-IA y puntuación** (nunca guion largo, nunca coma antes de "y"): aplica igual al email | **SÍ** |
| 4 | `global-instructions.md` | El manual del post de LinkedIn. Para email importa sobre todo **§3 (formateado y ritmo)** y **§2.5 (densidad de números)**, que el correo hereda con un matiz (ver abajo) | **SÍ** |
| 5 | `working-preferences.md` | Cómo se entrega el trabajo y cuándo se avisa de un riesgo | Recomendable |
| 6 | `historial-newsletter.md` | **ESTADO, no doctrina.** Qué se ha enviado, estado de la cuenta de Brevo, listas creadas. Se lee antes de planificar y se actualiza después | **SÍ** |
| 6b | **`corpus-correos-enviados.md`** | **El texto LITERAL de cada correo que ha salido, con sus métricas.** Antes de reescribir o continuar un correo enviado, se lee aquí el original. Reescribir de memoria pierde lo que lo hizo funcionar | **SÍ si tocas un correo ya enviado** |
| 7 | `images.md` | Solo si tocas imagen o mascota: **§4.0 = paleta del brandbook 2026** y la regla de que el isotipo no se redibuja con IA | Según la tarea |
| 8 | `validar-email.py` | El validador mecánico. 22 checks. Se corre antes de CADA entrega | **SÍ** |

---

## Lo que hay que saber sí o sí (el resumen de 10 líneas)

1. **El asunto es el gancho del email.** 5-9 palabras, minúsculas, abre un gap y NO lo cierra. Cero exclamaciones, cero emojis, máximo 1 número.
2. **El cuerpo hereda el formateado del post de LinkedIn, con UN matiz medido:** en email la **línea individual es la norma** (92-99% de los bloques en 4 corpus distintos), con **7-9 palabras por línea**. Prioridad de ritmo: **1º individuales · 2º bloques de dos · 3º bloques de tres**. Nunca bloques de 4. Nunca un bloque de 2 pegado a uno de 3.
3. **Anti-IA innegociable:** nunca guion largo, nunca coma antes de "y", y la tabla de AI-tells de `brand-voice §3`.
4. **4 remitentes rotando**, siempre una persona (o la mascota), nunca "Neety" a secas.
5. **Un solo CTA**, y máximo 1 enlace. En los correos de respuesta, cero enlaces.
6. **P.S. casi siempre** (86-100% en el corpus). Su mejor uso es pedir el reenvío, no vender.
7. **Historias inventadas SÍ**, si atacan un dolor real, sin nombre de empresa y con persona solo de nombre de pila. **Cifras-resultado de Neety, solo reales.**
8. **Fase actual: correo a correo**, no tandas. Las tandas de 2 semanas llegan cuando haya pilares y datos propios.
9. **El validador se corre siempre** y su resultado se pega en la entrega: `python validar-email.py <fichero.txt>`
10. **Todo aprendizaje nuevo se escribe en `email-marketing.md`** y se commitea. Si no se escribe, se pierde.

---

## Formato del fichero que come el validador

```
REMITENTE: Iker|Asier|Unai|Kaixito
ASUNTO: ...
PREVIEW: ...

(cuerpo, con sus saltos de línea reales)

(firma)
P.S. ...
```

---

## De dónde salen los datos del corpus

Analizados a fondo (los números citados en `email-marketing §8` salen de aquí):

- **Timepack** — 353 correos, jul 2024 a nov 2025. Newsletter diaria B2C española. La referencia de asuntos y de voz.
- **Hugo López** — 127 correos, jun 2025 a jul 2026. Meta Ads. La referencia de lanzamiento y cadencia diaria.
- **Sales Hackers** — 50 correos, jun 2025 a jul 2026. **IA para ventas B2B en español: nuestro sector exacto.** Su cuerpo usa nuestro mismo formateado de posts.
- **Isra Bravo** — 9 correos. El referente del email diario en español. 99% de bloques de una línea.
- **Aprilynne Alter** — 7 correos. Asuntos en minúsculas, P.S. en el 100%.
- Más inventario de Lavender, BOGA/EDEM, Cosas de Freelance, lemlist, Singularu, Kieran Flanagan.

Los .eml originales NO van en este paquete (son cientos de megas). Si hace falta re-analizarlos, los tiene el compañero de marketing en `Documents/Mario/LINKEDIN GROWTH/EMAIL MARKETING/`.

---

## Estado del sistema a fecha de exportación

> ⚠️ **Este bloque quedó obsoleto el 2026-08-11.** MailerLite canceló la cuenta y
> desde el 2026-08-20 el proveedor es **Brevo**. El estado vivo está en
> `historial-newsletter.md`, que es el que hay que leer. Lo de aquí abajo se
> conserva solo para entender qué había montado.

- **Herramienta: ~~MailerLite, conectada por MCP~~ → BREVO, por API, sin MCP.** El que llama a Brevo es un worker desatendido del CRM, no un chat. ⚠️ El conector MCP de MailerLite que sigue apareciendo en la sesión está MUERTO: no lo uses.
- **Dominio `neety.com`:** autenticado (en MailerLite; en Brevo verificado el 2026-08-20 desde Cloudflare). Remitente de la newsletter: `hola@neety.com`, con forwarding probado.
- **~~Creado: campo `origen` + 7 grupos~~** — vivían en la cuenta cancelada. En Brevo hay que rehacerlos.
- 🔴 **Pendiente:** ver la lista ordenada en `historial-newsletter.md`, bloque de Brevo.
- **Primer correo listo y validado 22/22:** el correo 0 segmentador, remitente Kaixito, asunto `no te acuerdas de mí?`. Va solo al segmento de origen desconocido, sin enlaces, y su métrica son las RESPUESTAS.
