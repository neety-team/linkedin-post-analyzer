#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""Pega la foto de perfil del jefe en el hueco del avatar de la TARJETA de X.

POR QUÉ EXISTE (Iker, 2026-09-16): el generador de imágenes deforma a las
personas, y cada iteración que se le pide sobre la tarjeta vuelve a redibujar la
cara. Es el mismo motivo que `montar-orla.py`: un modelo generativo no pega,
REDIBUJA. Así que la cara no entra nunca en el generador.

EL FLUJO (post-workflow §4.6-PASO-2, images §9.7):
  1. El prompt del diseñador pide el avatar como un CÍRCULO MAGENTA LISO, y el
     generador no ve ninguna foto de persona.
  2. Se itera la tarjeta (fondo, cabecera, texto) hasta que doy el OK.
  3. Iker aplica el desenfoque, pasa el magenta a TRANSPARENTE en Photoshop,
     exporta sin metadatos en PNG y me pasa el fichero.
  4. Este script mete la foto DEBAJO y la tarjeta ENCIMA: la máscara redonda es
     la del círculo que dibujó el generador, y la foto entra píxel a píxel.

Lo que NO hace, a propósito: retocar, suavizar ni reencuadrar la cara más allá
de escalarla para cubrir el círculo. La foto de perfil de LinkedIn ya viene
centrada en la cara.

USO:
  python scripts/montar-avatar-tarjeta.py --tarjeta "…/tarjeta con hueco.png" \
      --foto "…/avatar iker perfil.jpg" --salida "…/tarjeta final.png"
"""
import argparse
import importlib.util
import os
import sys

import numpy as np
from PIL import Image

_AQUI = os.path.dirname(os.path.abspath(__file__))
_spec = importlib.util.spec_from_file_location('montar_orla', os.path.join(_AQUI, 'montar-orla.py'))
_orla = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(_orla)


def main() -> int:
    for _f in (sys.stdout, sys.stderr):
        try:
            _f.reconfigure(encoding='utf-8', errors='replace')
        except Exception:
            pass
    ap = argparse.ArgumentParser()
    ap.add_argument('--tarjeta', required=True, help='PNG con el hueco del avatar TRANSPARENTE')
    ap.add_argument('--foto', required=True, help='foto de perfil real del jefe')
    ap.add_argument('--salida', required=True)
    a = ap.parse_args()

    tarjeta = Image.open(a.tarjeta)
    if tarjeta.mode != 'RGBA':
        print('FALLA: la tarjeta no tiene canal alfa. El hueco del avatar tiene que llegar '
              'TRANSPARENTE (se exporta en PNG, no en JPG, que no guarda transparencia).')
        return 1
    tarjeta = tarjeta.copy()
    huecos = _orla.buscar_huecos(np.array(tarjeta.getchannel('A')))
    if not huecos:
        print('FALLA: no encuentro ningún hueco transparente. ¿Se pasó el magenta a transparente?')
        return 1
    if len(huecos) > 1:
        print(f'AVISO: hay {len(huecos)} huecos transparentes; uso el más grande. Revisa que no '
              f'se haya borrado nada más que el círculo.')
    h = max(huecos, key=lambda x: x['n'])
    ancho, alto = h['x1'] - h['x0'] + 1, h['y1'] - h['y0'] + 1
    if abs(ancho - alto) > max(4, 0.05 * ancho):
        print(f'AVISO: el hueco no es redondo ({ancho}x{alto}). Míralo antes de publicar.')

    foto = Image.open(a.foto).convert('RGB')
    if min(foto.size) < max(ancho, alto):
        print(f'AVISO: la foto ({foto.width}x{foto.height}) es más pequeña que el hueco '
              f'({ancho}x{alto}) y se amplía: perderá nitidez.')
    # El avatar de X es pequeño (~80 px en 800) y la foto de perfil trae mucho
    # fondo: sin acercar, la cara queda diminuta (probado el 16/09). Mismo
    # encuadre que la orla, solo que más cerrado: en las 14 tarjetas de Grant la
    # cara llena media altura del círculo. Solo se ELIGE qué trozo se ve.
    try:
        cara = _orla.detectar_cara(a.foto)
    except Exception as e:
        cara = None
        print(f'AVISO: sin detector de caras ({e.__class__.__name__}); encuadre centrado.')
    if cara:
        foto = _orla.recuadro_hacia_cara(foto, cara, 0.5, ancho, alto)
    else:
        print('AVISO: no encuentro la cara en la foto; encuadre centrado. Míralo.')
    avatar = _orla.encajar(foto, ancho, alto)

    lienzo = Image.new('RGBA', tarjeta.size, (255, 255, 255, 255))
    lienzo.paste(avatar, (h['x0'], h['y0']))
    lienzo.alpha_composite(tarjeta)
    final = lienzo.convert('RGB')
    # Sin EXIF ni perfil ni firma: se guarda solo el píxel.
    final.save(a.salida, 'PNG')

    # ESPACIADO, MEDIDO Y NO A OJO (2026-09-17). En la tarjeta de Iker el hueco
    # P1-P2 medía 161 px de línea a línea y el P2-P3, 134: el generador no los
    # iguala aunque se le pida. Se mide de ARRIBA de línea a ARRIBA de línea (de
    # borde de tinta a borde de tinta engaña: un rabo de "q" cambia 15 px) y se
    # compara el aire de abajo con el de arriba del avatar.
    gris = np.array(final.convert('L')).astype(int)
    cnt = (gris[:, :] < 110).sum(1)
    tramos, ini = [], None
    for y in range(h['y1'] + 40, gris.shape[0]):
        if cnt[y] and ini is None:
            ini = y
        if not cnt[y] and ini is not None:
            if y - ini > 15:
                tramos.append((ini, y - 1))
            ini = None
    if tramos:
        pasos = np.diff([t[0] for t in tramos]).tolist()
        linea = int(np.median(pasos)) if pasos else 0
        saltos = [p for p in pasos if p > 1.5 * linea]
        abajo = gris.shape[0] - 1 - tramos[-1][1]
        print(f'ESPACIADO: pasos entre líneas {pasos} · huecos entre párrafos {saltos} · '
              f'aire arriba {h["y0"]} · aire abajo {abajo}')
        if len(saltos) >= 2 and max(saltos) - min(saltos) > 6:
            print('AVISO: los huecos entre párrafos NO son iguales. Se corrige bajando el '
                  'párrafo corto en píxeles (banda entera, el degradado no deja costura), no con '
                  'otro prompt.')

    rel = h['n'] / (ancho * alto)
    print(f'OK: avatar de {ancho}x{alto} en ({h["x0"]},{h["y0"]}), relleno {rel:.0%} del '
          f'recuadro (un círculo da ~79%). Guardado en {a.salida}')
    if not 0.70 <= rel <= 0.85:
        print('AVISO: el hueco no parece un círculo limpio. Míralo antes de publicar.')
    return 0


if __name__ == '__main__':
    sys.exit(main())
