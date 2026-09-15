#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Recorta una foto a CUADRADO para el pilar historia, sin cargarse el color.

POR QUE EXISTE ESTE SCRIPT (Mario, 2026-08-21)
----------------------------------------------
Dos fallos el mismo dia, los dos recortando a mano con Pillow:

1. EL COLOR. Para quitar los metadatos hice `Image.new('RGB') + paste`, y eso
   se lleva por delante el PERFIL ICC ademas del EXIF. Las fotos de movil son
   **Display P3** (gama ancha); sin el perfil, el visor las interpreta como
   sRGB y salen lavadas. Mario: "haces que pierda un poco el color, cosa que no
   puede ser". Tenia razon y se ve a simple vista.
   → Aqui el ICC se CONSERVA siempre y solo se tira el EXIF, que es lo unico
     que hay que quitar (GPS y modelo de movil). Y se COMPRUEBA al terminar.

2. LA COMPOSICION. El primer recorte de Mario dejaba las placas al 75% de
   altura. Mario: "con los recortes cuadrados tienes que procurar que en el
   centro de la imagen se quede lo mas importante". Regla entera en
   `images §0j-CUADRADA`.
   → El modo `--sujeto` hace ese trabajo: le das la caja de lo que importa y
     el script centra el cuadrado en ella, lo mas grande que quepa.

USO
---
  # centrado automatico en lo importante (lo normal)
  python scripts/recortar-cuadrada.py origen.jpg salida.jpg --sujeto 330,950,3720,3800

  # caja exacta, cuando ya la has medido mirando
  python scripts/recortar-cuadrada.py origen.jpg salida.jpg --caja 125,800,3925,4600

  # rejilla de coordenadas para poder MEDIR antes de decidir
  python scripts/recortar-cuadrada.py origen.jpg --rejilla rejilla.jpg

⚠️ El recorte se elige MIRANDO la foto, nunca a ojo de fichero. La rejilla esta
   para eso: se mira, se apuntan las coordenadas de lo importante y se pasa.
"""
import argparse
import io
import os
import sys

from PIL import Image, ImageDraw

# HEIC/HEIF (Mario, 2026-09-15). El banco de fotos lo llenan los jefes desde el
# movil, y un iPhone entrega **.HEIC**: `IMG_9698.HEIC`, `IMG_9879.HEIC`,
# `IMG_0290.HEIC`. Sin esta linea Pillow no reconoce el formato y el script
# muere con `UnidentifiedImageError` en la foto que mas veces vamos a recibir,
# asi que la rejilla y el recorte habia que hacerlos convirtiendo a mano antes.
# `pillow_heif` ya estaba instalado; lo unico que faltaba era registrarlo.
try:
    import pillow_heif

    pillow_heif.register_heif_opener()
except ImportError:  # pragma: no cover - entorno sin el paquete
    pass

try:
    from PIL import ImageCms
except ImportError:                                    # pragma: no cover
    ImageCms = None


def describir_icc(icc):
    if not icc:
        return 'NINGUNO'
    if ImageCms is None:
        return f'{len(icc)} bytes'
    try:
        perfil = ImageCms.ImageCmsProfile(io.BytesIO(icc))
        return ImageCms.getProfileDescription(perfil).strip()
    except Exception:
        return f'{len(icc)} bytes'


def rejilla(origen, destino, paso=400, div=8):
    """Vuelca la foto con una rejilla de coordenadas encima, para MEDIR."""
    im = Image.open(origen)
    W, H = im.size
    p = im.resize((W // div, H // div))
    w, h = p.size
    d = ImageDraw.Draw(p)
    for y in range(0, H, paso):
        yy = y // div
        d.line([(0, yy), (w, yy)], fill=(255, 0, 0), width=1)
        d.text((4, yy + 2), str(y), fill=(255, 255, 0))
    for x in range(0, W, paso):
        xx = x // div
        d.line([(xx, 0), (xx, h)], fill=(0, 150, 255), width=1)
        d.text((xx + 2, 4), str(x), fill=(0, 255, 255))
    p.save(destino, quality=90)
    print(f'rejilla: {destino}  ({W}x{H}, paso de {paso}px)')


def caja_desde_sujeto(sujeto, W, H):
    """El cuadrado MAS GRANDE que quepa, centrado en la caja de lo importante.

    Es la regla de `images §0j-CUADRADA` en codigo: lo importante manda el
    centro, y lo decorativo (pared, cuadro, cama) es lo que se sacrifica.
    Si el cuadrado se sale de la foto, se EMPUJA hacia dentro en vez de
    encogerlo: encoger recortaria al sujeto, que es justo lo que no se hace.
    """
    x1, y1, x2, y2 = sujeto
    cx, cy = (x1 + x2) / 2, (y1 + y2) / 2
    lado = min(W, H)                                   # el mayor cuadrado posible
    # nunca mas pequeño que el propio sujeto: si no cabe, es que hay que
    # recortar al sujeto y eso lo decide un humano, no el script.
    if lado < max(x2 - x1, y2 - y1):
        sys.exit('❌ el sujeto no cabe en un cuadrado de esta foto: recorta a mano')
    izq = int(round(cx - lado / 2))
    arr = int(round(cy - lado / 2))
    izq = max(0, min(izq, W - lado))                   # empujar hacia dentro
    arr = max(0, min(arr, H - lado))
    return (izq, arr, izq + lado, arr + lado)


def recortar(origen, destino, caja, lado, calidad):
    im = Image.open(origen)
    W, H = im.size
    icc = im.info.get('icc_profile')                   # ⚠️ ESTO ES LO QUE NO SE PIERDE

    l, t, r, b = caja
    if (r - l) != (b - t):
        sys.exit(f'❌ la caja no es cuadrada: {r - l}x{b - t}')
    if l < 0 or t < 0 or r > W or b > H:
        sys.exit(f'❌ la caja {caja} se sale de la foto ({W}x{H})')

    c = im.crop(caja)
    if lado and lado != c.width:
        c = c.resize((lado, lado), Image.LANCZOS)

    # Un PNG del banco puede venir en RGBA o en paleta, y JPEG no admite alfa.
    # Se aplana sobre BLANCO (no sobre negro, que es el default de convert y
    # deja halos oscuros en los bordes de lo transparente).
    if c.mode in ('RGBA', 'LA', 'P'):
        c = c.convert('RGBA')
        fondo = Image.new('RGB', c.size, (255, 255, 255))
        fondo.paste(c, mask=c.split()[-1])
        c = fondo

    # Se guarda SIN exif (fuera GPS y modelo de movil) y CON icc (el color).
    # No se usa Image.new+paste: eso tira el perfil y desatura la foto.
    guardar = {'quality': calidad, 'optimize': True, 'subsampling': 0}
    if icc:
        guardar['icc_profile'] = icc
    c.save(destino, 'JPEG', **guardar)

    # ---- COMPROBACION, que es media razon de que exista este script ----
    v = Image.open(destino)
    icc_out = v.info.get('icc_profile')
    exif_out = dict(v.getexif())
    print(f'✅ {destino}')
    print(f'   {v.size[0]}x{v.size[1]} · {round(os.path.getsize(destino) / 1024)} KB · caja {caja}')
    print(f'   perfil de color: {describir_icc(icc_out)}   (original: {describir_icc(icc)})')
    print(f'   EXIF: {exif_out or "ninguno"}')
    if icc and not icc_out:
        sys.exit('❌ SE HA PERDIDO EL PERFIL ICC. La foto va a salir lavada.')
    if icc_out != icc:
        sys.exit('❌ el perfil ICC de salida NO es el del original.')
    if exif_out:
        print('   ⚠️ queda EXIF dentro: revisalo antes de publicar')


def main():
    ap = argparse.ArgumentParser(description=__doc__,
                                 formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument('origen')
    ap.add_argument('destino', nargs='?')
    ap.add_argument('--caja', help='x1,y1,x2,y2 exactos, ya cuadrados')
    ap.add_argument('--sujeto', help='x1,y1,x2,y2 de LO IMPORTANTE; el script centra el cuadrado ahi')
    ap.add_argument('--lado', type=int, default=2048, help='lado de salida en px (0 = sin reescalar)')
    ap.add_argument('--calidad', type=int, default=92)
    ap.add_argument('--rejilla', help='vuelca una rejilla de coordenadas y sale')
    a = ap.parse_args()

    if a.rejilla:
        return rejilla(a.origen, a.rejilla)
    if not a.destino:
        ap.error('falta el destino')
    if not (a.caja or a.sujeto):
        ap.error('pasa --caja o --sujeto (o --rejilla para medir antes)')

    W, H = Image.open(a.origen).size
    if a.sujeto:
        caja = caja_desde_sujeto([int(v) for v in a.sujeto.split(',')], W, H)
        print(f'sujeto centrado → caja {caja}')
    else:
        caja = tuple(int(v) for v in a.caja.split(','))
    recortar(a.origen, a.destino, caja, a.lado, a.calidad)


if __name__ == '__main__':
    main()
