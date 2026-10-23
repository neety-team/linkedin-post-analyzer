# Resumen del periodo: conversiones centralizadas (2026-10-23)

Aprobado por Iker el 23/10 para contar el lunes 26/10 la revisión de cada dos semanas.

## Definiciones (una por tipo)
- **Oportunidad**: solicitud de demo atribuida a Mario, cualificada con hora o descartada. Sin cambios.
- **Lead**: persona nueva que nos da permiso para escribirle (entra en la newsletter): casilla de cualquier
  formulario de la web (recursos, newsletter, demo, contacto) **o** casilla de un evento de Luma (webinar o
  presencial). Sin casilla no es lead (sale en la ayuda). Una persona en las dos fuentes cuenta una vez: se
  cruza por SHA-256 del correo en minúsculas, nunca el correo.
- **Inscritos a un evento**: aprobados del CSV de Luma. Después del evento, además, asistentes reales
  (`has_joined_event`).

## Arriba: dos filas de 4
- Alcance: Publicaciones · Impresiones · Visitas al perfil · Seguidores.
- Conversión: Clics · Oportunidades (cualificadas · descartadas) · Leads · una tarjeta por evento con
  inscripciones o fecha en el periodo (si no hay ninguno, no sale). Los eventos se guardan
  (`luma_eventos`) para que la tarjeta siga tras la fecha del evento.

## Debajo: una franja de origen por conversión, mismo árbol
LinkedIn (pilares · Botón del perfil · sin post concreto) · DMs (por jefe) · Newsletter · Eventos (solo
leads) · Google · Web · Otros · Sin rastro.

Precedencia del origen: enlace de un post > newsletter > DM > botón del perfil > web de recursos >
respuesta de «¿Cómo nos conociste?» (LinkedIn → LinkedIn sin post concreto; correo → Newsletter) >
buscador > otros > sin rastro. Igual en oportunidades y leads (web: `origenUnificado` en
`worker/agendar/api/analyzer.js`); los inscritos de Luma, por su `utm_source`.

## Datos
- Web: `/api/analyzer/demos` y `/api/analyzer/leads` devuelven `origenes` (árbol) y, en leads, la lista
  `consentidos` = `{h, canal, detalle}` del periodo y del anterior, para cruzar con Luma.
- Analizador: `luma_inscritos` gana `email_hash` (solo si marcó la casilla) y `asistio`; `luma_eventos`
  guarda nombre, fechas y URL de cada evento leído.
