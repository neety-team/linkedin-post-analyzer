#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""montar-aviso-semanal.py — el aviso semanal de inversiones, desde el fichero de la semana.

Es el tercer tipo de correo de la casa (email-marketing §5S, diseño del 26/11/2026): las inversiones
industriales que han salido esa semana, antes de que lleguen al Radar del mes. Lo firma Iker, lleva a
Kaixito pequeño y no pide reunión en el cuerpo: pide que respondan «quiero esta».

El fichero de la semana (`newsletter/semanas/AAAA-Wnn.md`) tiene la misma tabla que la edición del Radar
y este frontmatter: region, mes (el del lunes), semana (AAAA-Wnn), desde y hasta (AAAA-MM-DD).

  1. descarta las filas sin enlace en la fuente o con la fecha fuera de la semana (y lo dice por stderr)
  2. elige de 5 a 8: las de más importe según su fuente y, si empatan, las más recientes
  3. monta el HTML: entrada, las elegidas con su fuente, botón al Excel, la línea de «quiero esta»,
     el puente a Neety, la firma y el GIF
  Con menos de 5 inversiones válidas no monta nada y sale con error: esa semana no se rellena.

Todo enlace lleva utm_source=brevo, utm_medium=email, utm_campaign=inversiones-<semana> y su utm_content.

Uso:
  python3 scripts/montar-aviso-semanal.py <semana.md> --excel <url> --gif <url> --alt "..." [--pie] > correo.html
  Imprime por stderr el asunto A y B, la preview y las filas descartadas.
"""
import argparse, datetime, html as H, importlib.util, os, sys

_s = importlib.util.spec_from_file_location(
    'radar_correo', os.path.join(os.path.dirname(os.path.abspath(__file__)), 'montar-radar-correo.py'))
rc = importlib.util.module_from_spec(_s)
_s.loader.exec_module(rc)

N_MIN, N_MAX = 5, 8
LINEA_FIJA = '¿Te interesa alguna? Respóndeme «quiero esta» y te digo a quién escribir dentro.'
PUENTE = ('Estas las juntamos a mano cada semana con fuentes públicas. Con Neety ves cada día qué empresas '
          'encajan con lo que vendes y a quién escribir dentro, y también cuándo se mueven.')


def _fecha(s):
    try:
        return datetime.date.fromisoformat(s.strip())
    except ValueError:
        return None


def filas_validas(fm, filas):
    """(válidas, descartadas). Válida = enlace en la fuente y fecha entre `desde` y `hasta`."""
    desde, hasta = _fecha(fm['desde']), _fecha(fm['hasta'])
    validas, descartadas = [], []
    for f in filas:
        d = _fecha(f['fecha'])
        if not f['url']:
            descartadas.append(dict(f, motivo='sin fuente'))
        elif d is None or not (desde <= d <= hasta):
            descartadas.append(dict(f, motivo='fecha fuera de la semana'))
        else:
            validas.append(f)
    return validas, descartadas


def elegir(validas, n_min=N_MIN, n_max=N_MAX):
    if len(validas) < n_min:
        raise SystemExit(f'menos de {n_min} inversiones válidas ({len(validas)}): esta semana no hay aviso')
    orden = sorted(validas, key=lambda f: (-rc.importe(f['senal']), -_fecha(f['fecha']).toordinal()))
    return orden[:n_max]


def _corto(empresa):
    return empresa.split(' (')[0].split(',')[0]


def asuntos(fm, validas, elegidas):
    top = elegidas[0]
    imp = rc.importe(top['senal'])
    a = f'{len(validas)} industriales que invierten esta semana'
    b = (f'{_corto(top["empresa"])} invierte {imp:g} M€ en {rc.provincia(top["ubicacion"])}'.replace('.', ',')
         if imp else f'quién invierte esta semana en {rc.provincia(top["ubicacion"])}')
    preview = f'{len(validas)} inversiones con su fuente, antes de que salgan en el Radar del mes.'
    return a, b, preview


def _tarjeta(f, campana, i):
    url = H.escape(rc.utm(f['url'], campana, f'fuente-{i}'))
    senal = f['senal'].split(' — ')
    return (f'<tr><td style="padding:8px 32px;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" '
            f'style="background:{rc.SURF};border-radius:12px;"><tr><td style="padding:16px 20px;">'
            f'<p style="margin:0;font-size:17px;font-weight:bold;color:{rc.PLUM};">{H.escape(f["empresa"])}</p>'
            f'<p style="margin:4px 0 10px;font-size:13px;color:{rc.SUAVE};">{H.escape(f["ubicacion"])} · {H.escape(f["sector"])}</p>'
            f'<p style="margin:0 0 8px;font-size:15px;line-height:1.5;"><strong>{H.escape(senal[0])}</strong>'
            + (f' — {H.escape(" — ".join(senal[1:]))}' if len(senal) > 1 else '') + '</p>'
            f'<p style="margin:0 0 8px;font-size:15px;line-height:1.5;"><strong>Qué puede necesitar:</strong> {H.escape(f["necesita"])}</p>'
            f'<p style="margin:0;font-size:13px;"><a href="{url}" style="color:{rc.NARANJA};">Fuente: {H.escape(f["fuente"])}</a></p>'
            '</td></tr></table></td></tr>')


def html(fm, validas, elegidas, excel, gif, alt, pie=False):
    campana = f'inversiones-{fm["semana"]}'
    _a, _b, preview = asuntos(fm, validas, elegidas)
    p = [f'<div style="display:none;max-height:0;overflow:hidden;">{H.escape(preview)}{"&zwnj;&nbsp;" * 60}</div>',
         f'<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:{rc.SURF};">'
         '<tr><td align="center" style="padding:24px 12px;">'
         '<table role="presentation" width="600" cellpadding="0" cellspacing="0" '
         'style="width:100%;max-width:600px;background:#FFFFFF;border-radius:16px;overflow:hidden;'
         f'font-family:Arial,Helvetica,sans-serif;color:{rc.TEXTO};">',
         f'<tr><td style="padding:32px 32px 8px;font-size:16px;line-height:1.6;">'
         f'<p style="margin:0 0 12px;">Estas son las inversiones industriales que han salido esta semana en España, '
         f'antes de que lleguen al Radar del mes.</p>'
         f'<p style="margin:0;">Cada una con lo que puede necesitar comprar y su fuente.</p></td></tr>']
    p += [_tarjeta(f, campana, i) for i, f in enumerate(elegidas, start=1)]
    p.append(f'<tr><td align="center" style="padding:24px 32px 8px;">'
             f'{rc.boton("Descargar el Excel", rc.utm(excel, campana, "excel"))}'
             f'<p style="margin:10px 0 0;font-size:13px;color:{rc.SUAVE};">Las {len(validas)} de la semana, '
             f'para filtrar por lo que vendes.</p></td></tr>')
    p.append(f'<tr><td style="padding:24px 32px 8px;font-size:16px;line-height:1.6;">'
             f'<p style="margin:0 0 16px;"><strong>{H.escape(LINEA_FIJA)}</strong></p>'
             f'<p style="margin:0 0 16px;">{H.escape(PUENTE)}</p>'
             '<p style="margin:0;">Iker</p></td></tr>')
    p.append(f'<tr><td align="center" style="padding:16px 32px 32px;"><img src="{H.escape(gif)}" alt="{H.escape(alt)}" '
             'width="200" style="display:block;margin:0 auto;width:200px;max-width:60%;height:auto;border:0;"></td></tr>')
    if pie:
        p.append(f'<tr><td style="padding:16px 32px 24px;font-size:12px;color:{rc.SUAVE};text-align:center;">{rc.PIE}</td></tr>')
    p.append('</table></td></tr></table>')
    return '\n'.join(p)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('semana')
    ap.add_argument('--excel', required=True, help='URL de la página del Excel de la semana en neety.com/para-ti/')
    ap.add_argument('--gif', required=True, help='URL pública del GIF de Kaixito')
    ap.add_argument('--alt', required=True, help='Texto alternativo del GIF')
    ap.add_argument('--pie', action='store_true', help='Añade el pie de Brevo, para la preview')
    a = ap.parse_args()

    fm, _t, filas = rc.leer(a.semana)
    for k in ('region', 'mes', 'semana', 'desde', 'hasta'):
        if k not in fm:
            sys.exit(f'Al fichero de la semana le falta «{k}» en el frontmatter')
    validas, descartadas = filas_validas(fm, filas)
    for d in descartadas:
        print(f'DESCARTADA: {d["empresa"]} · {d["motivo"]}', file=sys.stderr)
    elegidas = elegir(validas)
    a_, b_, preview = asuntos(fm, validas, elegidas)
    print(f'ASUNTO A: {a_}\nASUNTO B: {b_}\nPREVIEW: {preview}', file=sys.stderr)
    sys.stdout.write(html(fm, validas, elegidas, a.excel, a.gif, a.alt, a.pie))


if __name__ == '__main__':
    main()
