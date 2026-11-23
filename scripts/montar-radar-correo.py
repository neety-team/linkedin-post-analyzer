#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""montar-radar-correo.py — el correo mensual del Radar de inversiones, desde el fichero de la edición.

Es el otro tipo de correo de la casa (email-marketing §5R, 2026-11-23): sobrio, con la marca, sin
Kaixito, para consultar. Se genera, no se escribe a mano, así que el formato no depende de nadie:

  1. cabecera con el logotipo y «Radar de inversiones industriales · <región> · <mes>»
  2. titular y entradilla de la edición
  3. tres cifras contadas en la tabla: inversiones, comunidades y cuántas salen de boletines oficiales
  4. el mapa (JPG o PNG, nunca AVIF) enlazado a la edición
  5. las tendencias del mes, tal cual
  6. 5 destacadas (las de más importe según su fuente), con la fuente enlazada
  7. botones: ver la edición completa y descargar el Excel
  8. el bloque de Neety con el botón a la reunión
  9. (con --solo-radar) la línea para pasarse también a la newsletter

Todo enlace lleva utm_source=brevo, utm_medium=email, utm_campaign=radar-<región>-<mes> y su
utm_content. Con --pie se añade el pie de la casa tal como lo pone Brevo, para la preview.

Uso:
  python scripts/montar-radar-correo.py <edicion.md> --mapa <url jpg/png> --logo <url png> \\
      [--excel <url>] [--titular "..."] [--pie] [--solo-radar] > correo.html
  Imprime además por stderr el asunto y la preview propuestos.
"""
import argparse, html as H, io, re, sys

PLUM, NARANJA, SURF, TEXTO, SUAVE = '#431B44', '#FE8238', '#F5F7F9', '#2B2B2B', '#6B5A6C'
MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre',
         'octubre', 'noviembre', 'diciembre']
REGIONES = {'espana': 'España', 'europa': 'Europa', 'eeuu': 'EE. UU.'}
PIE = ('¿Prefieres que no te escriba más? <a href="#" style="color:%s;">Date de baja aquí</a> · '
       'Neety · Miramon Pasealekua 170, Donostia, España' % SUAVE)

# Provincia (la que va entre paréntesis en «Ubicación») → comunidad autónoma.
CCAA = {
    'Almería': 'Andalucía', 'Cádiz': 'Andalucía', 'Córdoba': 'Andalucía', 'Granada': 'Andalucía',
    'Huelva': 'Andalucía', 'Jaén': 'Andalucía', 'Málaga': 'Andalucía', 'Sevilla': 'Andalucía',
    'Huesca': 'Aragón', 'Teruel': 'Aragón', 'Zaragoza': 'Aragón', 'Asturias': 'Asturias',
    'Illes Balears': 'Illes Balears', 'Baleares': 'Illes Balears', 'Las Palmas': 'Canarias',
    'Santa Cruz de Tenerife': 'Canarias', 'Cantabria': 'Cantabria', 'Albacete': 'Castilla-La Mancha',
    'Ciudad Real': 'Castilla-La Mancha', 'Cuenca': 'Castilla-La Mancha', 'Guadalajara': 'Castilla-La Mancha',
    'Toledo': 'Castilla-La Mancha', 'Ávila': 'Castilla y León', 'Burgos': 'Castilla y León',
    'León': 'Castilla y León', 'Palencia': 'Castilla y León', 'Salamanca': 'Castilla y León',
    'Segovia': 'Castilla y León', 'Soria': 'Castilla y León', 'Valladolid': 'Castilla y León',
    'Zamora': 'Castilla y León', 'Barcelona': 'Cataluña', 'Girona': 'Cataluña', 'Lleida': 'Cataluña',
    'Tarragona': 'Cataluña', 'Alicante': 'Comunitat Valenciana', 'Castellón': 'Comunitat Valenciana',
    'Valencia': 'Comunitat Valenciana', 'Badajoz': 'Extremadura', 'Cáceres': 'Extremadura',
    'A Coruña': 'Galicia', 'Lugo': 'Galicia', 'Ourense': 'Galicia', 'Pontevedra': 'Galicia',
    'Madrid': 'Madrid', 'Murcia': 'Región de Murcia', 'Navarra': 'Navarra', 'Álava': 'País Vasco',
    'Araba': 'País Vasco', 'Gipuzkoa': 'País Vasco', 'Bizkaia': 'País Vasco', 'La Rioja': 'La Rioja',
    'Ceuta': 'Ceuta', 'Melilla': 'Melilla',
}
OFICIAL = re.compile(r'\b(BOE|BOCYL|BOJA|BOA|BOPA|BOC|BOIB|BORM|BOPV|DOGC|DOGV|DOCM|DOE|BOR|BOCM)\b|'
                     r'Bolet[ií]n Oficial|Diario Oficial', re.I)


def leer(ruta):
    t = io.open(ruta, encoding='utf-8').read()
    fm = dict(re.findall(r'^(\w+):\s*"?(.*?)"?\s*$', t.split('---')[1], re.M))
    tend = re.search(r'## Tendencias del mes\s*\n(.*?)\n## ', t, re.S)
    tendencias = [l[2:].strip() for l in (tend.group(1) if tend else '').splitlines() if l.startswith('- ')]
    filas = []
    for l in t.splitlines():
        if not l.startswith('|') or l.startswith('| Empresa') or l.startswith('| ---'):
            continue
        c = [x.strip() for x in l.strip('|').split('|')]
        if len(c) < 7:
            continue
        m = re.match(r'\[(.*?)\]\((.*?)\)', c[6])
        filas.append(dict(empresa=c[0], sector=c[1], ubicacion=c[2], senal=c[3], necesita=c[4],
                          fecha=c[5], fuente=m.group(1) if m else c[6], url=m.group(2) if m else ''))
    return fm, tendencias, filas


def importe(senal):
    """El mayor importe en M€ que cita la señal (0 si no cita ninguno)."""
    vals = []
    for n in re.findall(r'(\d[\d.]*(?:,\d+)?)\s*M€', senal):
        try:
            vals.append(float(n.replace('.', '').replace(',', '.')))
        except ValueError:
            pass
    return max(vals) if vals else 0.0


def provincia(ubicacion):
    m = re.search(r'\(([^)]+)\)\s*$', ubicacion)
    return m.group(1).strip() if m else ubicacion.strip()


def negritas(s):
    return re.sub(r'\*\*(.+?)\*\*', r'<strong>\1</strong>', H.escape(s))


def utm(url, campana, contenido):
    sep = '&' if '?' in url else '?'
    return f'{url}{sep}utm_source=brevo&utm_medium=email&utm_campaign={campana}&utm_content={contenido}'


def boton(texto, url, relleno=True):
    if relleno:
        estilo = f'background:{PLUM};color:#FFFFFF;border:1px solid {PLUM};'
    else:
        estilo = f'background:#FFFFFF;color:{PLUM};border:1px solid {PLUM};'
    return (f'<a href="{H.escape(url)}" style="{estilo}display:inline-block;padding:12px 22px;border-radius:999px;'
            f'font-family:Arial,Helvetica,sans-serif;font-size:15px;font-weight:bold;text-decoration:none;">{H.escape(texto)}</a>')


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('edicion')
    ap.add_argument('--mapa', required=True, help='URL pública del mapa en JPG o PNG')
    ap.add_argument('--logo', required=True, help='URL pública del logotipo en PNG (blanco, va sobre berenjena)')
    ap.add_argument('--excel', default=None, help='URL de la página del Excel (por defecto neety.com/para-ti/radar-<región>-<mes>)')
    ap.add_argument('--titular', default=None, help='Titular del asunto; por defecto, la inversión de más importe')
    ap.add_argument('--pie', action='store_true', help='Añade el pie de Brevo, para la preview')
    ap.add_argument('--solo-radar', action='store_true', help='Añade la línea para pasarse también a la newsletter')
    a = ap.parse_args()

    if re.search(r'\.avif(\?|$)', a.mapa, re.I):
        sys.exit('El mapa va en JPG o PNG: Gmail y Outlook no pintan AVIF (email-marketing §5R)')
    fm, tendencias, filas = leer(a.edicion)
    if not filas:
        sys.exit('La edición no tiene tabla de inversiones')
    region, mes = fm['region'], fm['mes']
    anio, nmes = mes.split('-')
    nombre_mes = MESES[int(nmes) - 1]
    campana = f'radar-{region}-{mes}'
    edicion = f'https://neety.com/radar/{region}/{mes}'
    excel = a.excel or f'https://neety.com/para-ti/radar-{region}-{mes}'
    demo = 'https://neety.com/solicitar-demo'

    comunidades = {CCAA.get(provincia(f['ubicacion']), provincia(f['ubicacion'])) for f in filas}
    oficiales = sum(1 for f in filas if OFICIAL.search(f['fuente']))
    destacadas = sorted(filas, key=lambda f: -importe(f['senal']))[:5]

    top = destacadas[0]
    titular = a.titular or f"{top['empresa'].split(' (')[0].split(',')[0]} · {top['senal'].split(' — ')[0].lower()} en {top['ubicacion']}"
    asunto = f'Radar de inversiones · {nombre_mes}: {titular}'
    preview = f'{len(filas)} empresas industriales que invierten en {REGIONES.get(region, region)}, cada una con su fuente.'

    cifras = [(str(len(filas)), 'inversiones'), (str(len(comunidades)), 'comunidades'),
              (str(oficiales), 'de boletines oficiales')]
    p = []
    p.append(f'<div style="display:none;max-height:0;overflow:hidden;">{H.escape(preview)}{"&zwnj;&nbsp;" * 60}</div>')
    p.append(f'<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:{SURF};">'
             '<tr><td align="center" style="padding:24px 12px;">'
             '<table role="presentation" width="600" cellpadding="0" cellspacing="0" '
             'style="width:100%;max-width:600px;background:#FFFFFF;border-radius:16px;overflow:hidden;'
             f'font-family:Arial,Helvetica,sans-serif;color:{TEXTO};">')
    # 1 · cabecera
    p.append(f'<tr><td style="background:{PLUM};padding:24px 32px;">'
             f'<img src="{H.escape(a.logo)}" alt="Neety" width="120" style="display:block;width:120px;height:auto;border:0;">'
             f'<p style="margin:16px 0 0;font-size:13px;letter-spacing:1px;text-transform:uppercase;color:#FFFFFF;opacity:.75;">'
             f'Radar de inversiones industriales · {REGIONES.get(region, region)} · {nombre_mes} {anio}</p></td></tr>')
    # 2 · titular y entradilla
    p.append(f'<tr><td style="padding:32px 32px 8px;">'
             f'<h1 style="margin:0 0 12px;font-size:26px;line-height:1.25;color:{PLUM};">Las inversiones industriales de {nombre_mes}</h1>'
             f'<p style="margin:0;font-size:16px;line-height:1.6;color:{SUAVE};">{H.escape(fm.get("entradilla", ""))}</p></td></tr>')
    # 3 · cifras
    celdas = ''.join(f'<td align="center" width="33%" style="padding:16px 8px;background:{SURF};border-radius:12px;">'
                     f'<p style="margin:0;font-size:30px;font-weight:bold;color:{PLUM};">{n}</p>'
                     f'<p style="margin:4px 0 0;font-size:13px;color:{SUAVE};">{H.escape(t)}</p></td>'
                     + ('<td width="8"></td>' if i < 2 else '') for i, (n, t) in enumerate(cifras))
    p.append(f'<tr><td style="padding:24px 32px 8px;"><table role="presentation" width="100%" cellpadding="0" '
             f'cellspacing="0"><tr>{celdas}</tr></table></td></tr>')
    # 4 · mapa
    p.append(f'<tr><td style="padding:24px 32px 8px;"><a href="{H.escape(utm(edicion, campana, "mapa"))}">'
             f'<img src="{H.escape(a.mapa)}" alt="Mapa de las inversiones industriales de {nombre_mes}" width="536" '
             f'style="display:block;width:100%;max-width:536px;height:auto;border:0;border-radius:12px;"></a></td></tr>')
    # 5 · tendencias
    if tendencias:
        lis = ''.join(f'<li style="margin:0 0 10px;">{negritas(t)}</li>' for t in tendencias[:3])
        p.append(f'<tr><td style="padding:24px 32px 0;"><h2 style="margin:0 0 12px;font-size:18px;color:{PLUM};">'
                 f'Lo que se ve este mes</h2><ul style="margin:0;padding-left:20px;font-size:15px;line-height:1.6;">{lis}</ul></td></tr>')
    # 6 · destacadas
    filas_html = ''
    for f in destacadas:
        tipo, _, que = f['senal'].partition(' — ')
        que = (que or tipo)
        que = que[:1].upper() + que[1:]
        filas_html += (f'<tr><td style="padding:14px 0;border-top:1px solid #E6E0E6;">'
                       f'<p style="margin:0 0 4px;"><span style="display:inline-block;padding:2px 10px;border-radius:999px;'
                       f'background:#FFF0E7;color:#B4521C;font-size:12px;font-weight:bold;">{H.escape(tipo)}</span></p>'
                       f'<p style="margin:0;font-size:15px;font-weight:bold;color:{PLUM};">{H.escape(f["empresa"])}</p>'
                       f'<p style="margin:2px 0 6px;font-size:13px;color:{SUAVE};">{H.escape(f["ubicacion"])} · {H.escape(f["sector"])}</p>'
                       f'<p style="margin:0 0 6px;font-size:15px;line-height:1.5;">{H.escape(que)}</p>'
                       f'<p style="margin:0 0 6px;font-size:14px;line-height:1.5;color:{SUAVE};"><strong style="color:{TEXTO};">Puede necesitar:</strong> '
                       f'{H.escape(f["necesita"])}</p>'
                       f'<p style="margin:0;font-size:13px;"><a href="{H.escape(f["url"])}" style="color:{PLUM};">'
                       f'Fuente: {H.escape(f["fuente"])}</a></p></td></tr>')
    p.append(f'<tr><td style="padding:24px 32px 0;"><h2 style="margin:0 0 4px;font-size:18px;color:{PLUM};">Cinco para empezar</h2>'
             f'<table role="presentation" width="100%" cellpadding="0" cellspacing="0">{filas_html}</table></td></tr>')
    # 7 · botones
    p.append(f'<tr><td align="center" style="padding:24px 32px 8px;">'
             f'{boton("Ver las " + str(len(filas)) + " en el mapa", utm(edicion, campana, "edicion"))}'
             f'<span style="display:inline-block;width:8px;"></span>'
             f'{boton("Descargar el Excel", utm(excel, campana, "excel"), relleno=False)}</td></tr>')
    # 8 · bloque de Neety
    p.append(f'<tr><td style="padding:24px 32px 32px;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" '
             f'style="background:{SURF};border-radius:12px;"><tr><td style="padding:24px;">'
             f'<p style="margin:0 0 8px;font-size:17px;font-weight:bold;color:{PLUM};">Estas las reunimos a mano, una vez al mes.</p>'
             f'<p style="margin:0 0 16px;font-size:15px;line-height:1.6;">Salen de boletines oficiales y prensa, empresa por empresa. '
             f'Con Neety ves cada día qué empresas encajan con lo que vendes, a quién escribir dentro y qué ha pasado para que sea el momento.</p>'
             f'{boton("Reserva media hora con el equipo", utm(demo, campana, "demo"))}</td></tr></table></td></tr>')
    # 9 · solo para quien llega por el Radar
    if a.solo_radar:
        p.append(f'<tr><td style="padding:0 32px 24px;font-size:13px;line-height:1.6;color:{SUAVE};">'
                 'Te llega porque te apuntaste al Radar. Si también quieres el correo semanal sobre a quién vender, '
                 'responde a este correo con un «sí».</td></tr>')
    p.append('</table>')
    if a.pie:
        p.append(f'<p style="max-width:600px;margin:16px auto 0;font-family:Arial,Helvetica,sans-serif;font-size:12px;'
                 f'line-height:1.6;color:{SUAVE};text-align:center;">{PIE}</p>')
    p.append('</td></tr></table>')
    sys.stdout.write('<html><body style="margin:0;padding:0;">\n' + '\n'.join(p) + '\n</body></html>\n')
    sys.stderr.write(f'ASUNTO: {asunto}\nPREVIEW: {preview}\nCAMPAÑA: {campana}\n'
                     f'DESTACADAS: {", ".join(f["empresa"] for f in destacadas)}\n'
                     f'CIFRAS: {len(filas)} inversiones, {len(comunidades)} comunidades, {oficiales} de boletines oficiales\n')


if __name__ == '__main__':
    main()
