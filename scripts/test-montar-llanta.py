# -*- coding: utf-8 -*-
"""Pruebas del centrado de logos en la llanta (montar-llanta.py).

Nacen del 2026-09-16: la "U" de Talleres Unamunzaga. Centrada por su caja se
veia con mas aire abajo (-22% de vacio arriba frente a abajo); centrada por el
circulo minimo, con mas aire arriba (+47%) y ademas mas grande. Iker vio los
dos fallos. La medida que coincide con lo que ve el ojo es el VACIO dentro del
circulo por encima y por debajo de la SILUETA (contorno convexo) del logo.

Uso: python scripts/test-montar-llanta.py <carpeta de logos de prueba>
Cada logo de la carpeta tiene que salir con el vacio de arriba y el de abajo a
menos de un 10% de diferencia, y sin salirse del circulo.
"""
import importlib.util
import os
import sys

import numpy as np
from PIL import Image, ImageDraw

_s = importlib.util.spec_from_file_location('ml', os.path.join(os.path.dirname(__file__), 'montar-llanta.py'))
ml = importlib.util.module_from_spec(_s)
_s.loader.exec_module(ml)

LADO = 166
TOLERANCIA = 0.10


def desequilibrio(disco):
    a = np.array(disco.convert('RGB')).astype(int)
    lado = a.shape[0]
    c = (lado - 1) / 2.0
    yy, xx = np.mgrid[0:lado, 0:lado]
    circ = np.hypot(yy - c, xx - c) <= lado / 2.0
    marca = circ & (np.abs(a - 255).max(axis=2) > 30)
    ys, xs = np.nonzero(marca)
    hull = ml._contorno_convexo(xs, ys)
    im = Image.new('L', (lado, lado), 0)
    ImageDraw.Draw(im).polygon([tuple(p) for p in hull], fill=1)
    sil = np.array(im).astype(bool) | marca
    arr = aba = 0
    for x in range(lado):
        col = np.nonzero(sil[:, x])[0]
        if not len(col):
            continue
        cc = np.nonzero(circ[:, x])[0]
        arr += col.min() - cc.min()
        aba += cc.max() - col.max()
    fuera = bool((np.hypot(ys - c, xs - c) > lado / 2.0 - 1).any())
    return (arr - aba) / max(arr + aba, 1), fuera


def main():
    carpeta = sys.argv[1]
    fallos = 0
    for f in sorted(os.listdir(carpeta)):
        if not f.lower().endswith(('.jpg', '.jpeg', '.png', '.webp')):
            continue
        disco = ml.contener(Image.open(os.path.join(carpeta, f)), LADO)
        d, fuera = desequilibrio(disco)
        assert abs(d - ml.desequilibrio_vertical(disco)) < 1e-9, 'la prueba y el aviso del script miden distinto'
        ok = abs(d) <= TOLERANCIA and not fuera
        fallos += not ok
        print('  %s %-24s vacio arriba-abajo %+5.0f%%%s' % ('ok ' if ok else 'MAL', f[:24], 100 * d,
                                                          '  (se sale del circulo)' if fuera else ''))
    print('\n%s' % ('✅ todos centrados' if not fallos else '❌ %d descentrados' % fallos))
    return 1 if fallos else 0


if __name__ == '__main__':
    sys.exit(main())
