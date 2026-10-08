// AVISO DE CADA INSCRITO AL WEBINAR EN EL CHAT DE GROWTH & SALES (2026-10-08)
//
// Google Apps Script (script.google.com) que corre en la cuenta de Gmail que recibe los
// correos de Luma "Nueva inscripción para…" (llegan a team@neety.com, un Grupo de Google,
// y se reenvían a Iker, Mario…). Gratis: no hace falta Luma Plus.
//
// Lee cada correo nuevo y manda UNA línea al chat, con el molde de los avisos de la web:
//   🎟️ Nuevo asistente · webinar · Correos sí · van 14
// Sin nombre (el chat ya tiene el panel de Luma). "Correos sí" = marcó la casilla y se le
// puede meter en Brevo. Las inscripciones de prueba con empresa "Neety…" no avisan.
//
// INSTALAR (una vez, logueado en la cuenta que recibe los correos):
//   1. script.google.com → Nuevo proyecto → pega este fichero entero.
//   2. Configuración del proyecto (rueda) → Propiedades del script → añade
//      CHAT_WEBHOOK = la URL del webhook del chat de Growth & Sales.
//   3. Arriba, elige la función `instalar` y pulsa Ejecutar. Acepta los permisos.
//   Desde ahí revisa el correo cada hora. Para pararlo: `desinstalar`.

const ASUNTO = 'subject:"Nueva inscripción para" newer_than:7d';
const CLAVE_ULTIMO = 'ultimo_correo_ms';

function avisarInscritosLuma() {
  const props = PropertiesService.getScriptProperties();
  const webhook = props.getProperty('CHAT_WEBHOOK');
  if (!webhook) throw new Error('Falta la propiedad CHAT_WEBHOOK');

  // La primera vez solo marca el punto de partida: no avisa de los que ya estaban.
  const ultimo = Number(props.getProperty(CLAVE_ULTIMO) || 0);
  if (!ultimo) return props.setProperty(CLAVE_ULTIMO, String(Date.now()));

  // Se filtra por FECHA de cada correo y no por etiqueta: Gmail puede meter varias
  // inscripciones en el mismo hilo (mismo asunto) y una etiqueta de hilo repetiría avisos.
  const nuevos = [];
  GmailApp.search(ASUNTO).forEach((hilo) => hilo.getMessages().forEach((m) => {
    if (m.getDate().getTime() > ultimo) nuevos.push(m);
  }));
  nuevos.sort((a, b) => a.getDate() - b.getDate());

  let hasta = ultimo;
  nuevos.forEach((m) => {
    hasta = Math.max(hasta, m.getDate().getTime());
    const t = m.getPlainBody();
    if (!/se ha inscrito en/.test(t)) return;
    const empresa = ((t.match(/Empresa \(opcional\)[ \t]+(.+)/) || [])[1] || '').trim();
    if (/^neety\b/i.test(empresa)) return; // pruebas internas
    const correos = /novedades de Neety\.\s*Sí/.test(t) ? 'sí' : 'no';
    const van = (t.match(/(\d+)\s+asistirá/) || [])[1];
    const texto = '🎟️ Nuevo asistente · webinar · Correos ' + correos + (van ? ' · van *' + van + '*' : '');
    UrlFetchApp.fetch(webhook, {
      method: 'post',
      contentType: 'application/json; charset=UTF-8',
      payload: JSON.stringify({ text: texto }),
    });
  });
  props.setProperty(CLAVE_ULTIMO, String(hasta));
}

function instalar() {
  desinstalar();
  ScriptApp.newTrigger('avisarInscritosLuma').timeBased().everyHours(1).create();
  avisarInscritosLuma(); // marca el punto de partida
}

function desinstalar() {
  ScriptApp.getProjectTriggers()
    .filter((t) => t.getHandlerFunction() === 'avisarInscritosLuma')
    .forEach((t) => ScriptApp.deleteTrigger(t));
}
