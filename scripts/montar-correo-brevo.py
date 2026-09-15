#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""montar-correo-brevo.py — genera el HTML de una campana DESDE EL .TXT VALIDADO.

El HTML se REGENERA, nunca se parchea con expresiones regulares
(`email-marketing 3b`: una sustitucion sobre la URL suelta se comio el
`</a></p><p style=` y fusiono el enlace con la linea siguiente).

Convenciones que copia del correo 3, verificadas en produccion:
  - relleno invisible del preheader (zwnj+nbsp), o Gmail cuela la 1a frase del cuerpo
  - fondo Alabastro #f9f3ef, ancho 600, cuerpo 16/1.6 en #2b2b2b
  - un <p> por bloque, <br> entre lineas del mismo bloque
  - el enlace se pinta con TEXTO CORTO y el UTM va solo en el href
  - el GIF va centrado a 280px con su alt

Uso:
  python scripts/montar-correo-brevo.py <fichero.txt> --gif <url> --alt "..." \
      [--enlace-texto forward.neety.com] > salida.html
"""
import sys, re, io, argparse, html as H

RELLENO = '&zwnj;&nbsp;' * 60
GIF_TPL = ('<p style="margin:0 0 24px;text-align:center;"><img src="{url}" alt="{alt}" '
           'width="280" height="280" style="display:block;margin:0 auto;width:280px;'
           'max-width:70%;height:auto;border:0;outline:none;text-decoration:none;"></p>')


def bloques_de(txt):
    """Los bloques del cuerpo, sin la cabecera REMITENTE/ASUNTO/PREVIEW."""
    lineas = txt.splitlines()
    desde = 0
    for i, l in enumerate(lineas[:6]):
        if re.match(r'^(REMITENTE|ASUNTO|PREVIEW)\s*:', l.strip(), re.I):
            desde = i + 1
    cuerpo = '\n'.join(lineas[desde:]).strip()
    return [b for b in cuerpo.split('\n\n') if b.strip()]


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('fichero')
    ap.add_argument('--gif', default=None)
    ap.add_argument('--alt', default='')
    ap.add_argument('--enlace-texto', default='forward.neety.com')
    a = ap.parse_args()

    txt = io.open(a.fichero, encoding='utf-8').read()
    partes = []
    for b in bloques_de(txt):
        if b.strip().startswith('['):          # marcador [GIF: ...] -> la imagen
            if a.gif:
                partes.append(GIF_TPL.format(url=a.gif, alt=H.escape(a.alt)))
            continue
        lineas = [H.escape(l.strip()) for l in b.splitlines() if l.strip()]
        html = '<br>'.join(lineas)
        # el enlace: texto corto visible, URL entera (con su UTM) solo en el href
        html = re.sub(r'(https?://\S+)',
                      lambda m: '<a href="%s" style="color:#fe8238;">%s</a>'
                                % (m.group(1), a.enlace_texto), html)
        partes.append('<p style="margin:0 0 20px;">%s</p>' % html)

    print('<html><body>\n'
          '<div style="display:none;font-size:1px;line-height:1px;max-height:0;max-width:0;'
          'opacity:0;overflow:hidden;mso-hide:all;">%s</div>\n'
          '<div style="background:#f9f3ef;padding:32px 16px;font-family:-apple-system,'
          'BlinkMacSystemFont,\'Segoe UI\',Helvetica,Arial,sans-serif;">\n'
          '<div style="max-width:600px;margin:0 auto;font-size:16px;line-height:1.6;'
          'color:#2b2b2b;">\n%s\n</div>\n</div></body></html>'
          % (RELLENO, '\n'.join(partes)))


if __name__ == '__main__':
    main()
