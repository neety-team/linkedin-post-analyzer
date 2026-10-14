#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
montar-destacado.py — la imagen de un DESTACADO del perfil de LinkedIn de los jefes.

Por que existe (Mario, 2026-10-14): los dos destacados de los perfiles (el recurso
del perfil y la reunion) iban con una plantilla vieja, 16:9 y en 3 lineas. Ahora
van con la MISMA plantilla que las portadas de los recursos de la web, para que el
perfil y neety.com se vean iguales:

  · fondo: `landing/scripts/portada/fondo.png` (1731x909 = 1,90:1, el del PSD
    «PLANTILLA COMPARTIR v2», con las dos piezas de puzle a la derecha);
  · Bricolage Grotesque ExtraBold, linea 1 NARANJA #FE8238 y linea 2 BLANCO
    #F5F7F9 (el naranja arriba: abajo a la izquierda esta el brillo naranja y ahi
    pierde contraste, medido en `academia-portada.mjs`);
  · logo blanco arriba a la izquierda, alineado con el texto.

Lo que cambia frente a la portada de recurso, y es a proposito: el TEXTO es mas
grande, porque LinkedIn ensena el destacado a ~455 px de ancho. El tamaño es el
MISMO para todos los destacados (se calcula con el texto mas largo de la tanda):
si una frase no cabe sin tocar el puzle, se acorta la frase, no se encoge la letra.

Sale a 2400x1260 (1,905:1, el 1,91:1 en el que LinkedIn ensena la tarjeta).

    python scripts/montar-destacado.py --salida-dir "C:/.../DESTACADOS" \\
        perfil "Tu perfil" "vende por ti" \\
        reunion "Busca menos" "Vende más"
"""
import argparse
import io
import os
import subprocess
import sys

import numpy as np
from PIL import Image, ImageDraw, ImageFont

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")

LANDING = "C:/Users/LENOVO/Desktop/landing"
PORTADA = f"{LANDING}/scripts/portada"
PSD_W, PSD_H = 1731, 909
OUT_W, OUT_H = 2400, 1260
S = OUT_W / PSD_W

X = 113                       # inicio de la tinta, como en la portada de recurso
LOGO_Y, LOGO_W = 70, 200      # en unidades del PSD, igual que la portada
RATIO_L2 = 149.5 / 122.1      # la linea 2 es mas grande que la 1, como en el PSD
INTERLINEA = 1.08             # distancia entre bases = tamaño de la linea 2 x esto
MARGEN_PUZLE = 70             # aire minimo entre la tinta y el puzle (PSD)
NARANJA, BLANCO = (0xFE, 0x82, 0x38), (0xF5, 0xF7, 0xF9)


def borde_puzle(fondo):
    """Para cada fila del PSD, la x del primer pixel azul del puzle (o el ancho)."""
    a = np.asarray(fondo.convert("RGB")).astype(int)
    azul = (a[:, :, 2] > 200) & (a[:, :, 0] > 120) & (a[:, :, 1] > 160)
    borde = np.full(a.shape[0], a.shape[1])
    for y in range(a.shape[0]):
        xs = np.flatnonzero(azul[y])
        if xs.size:
            borde[y] = xs[0]
    return borde


def logo_png(ancho_px):
    """El SVG del logo, rasterizado con el sharp de la landing (PIL no lee SVG)."""
    svg = open(f"{PORTADA}/neety-logo.svg", encoding="utf-8").read()
    svg = svg.replace("fill: #fff", "fill: #F5F7F9").replace("fill:#fff", "fill:#F5F7F9")
    js = (
        "const sharp=require(process.argv[1]);let b='';process.stdin.on('data',d=>b+=d)"
        ".on('end',()=>sharp(Buffer.from(b)).resize({width:+process.argv[2]})"
        ".png().toBuffer().then(o=>process.stdout.write(o)))"
    )
    out = subprocess.run(
        ["node", "-e", js, f"{LANDING}/node_modules/sharp", str(ancho_px)],
        input=svg.encode("utf-8"), capture_output=True, check=True,
    )
    return Image.open(io.BytesIO(out.stdout)).convert("RGBA")


def medir(texto, tam):
    f = ImageFont.truetype(f"{PORTADA}/BricolageGrotesque-ExtraBold.ttf", round(tam))
    l, t, r, b = f.getbbox(texto, anchor="ls")   # caja de tinta respecto a la base
    return f, l, t, r, b


def colocar(l1, l2, tam1, centro):
    """Bases (PSD) de las dos lineas para un tamaño, con el bloque centrado en `centro`."""
    tam2 = tam1 * RATIO_L2
    _, _, t1, _, _ = medir(l1, tam1)
    _, _, _, _, b2 = medir(l2, tam2)
    sep = tam2 * INTERLINEA
    alto = -t1 + sep + b2                       # de la tapa de la 1 al pie de la 2
    base1 = centro - alto / 2 - t1
    return tam2, base1, base1 + sep


def cabe(l1, l2, tam1, centro, borde):
    tam2, base1, base2 = colocar(l1, l2, tam1, centro)
    peor = None
    for txt, tam, base in ((l1, tam1, base1), (l2, tam2, base2)):
        _, l, t, r, b = medir(txt, tam)
        y0, y1 = int(base + t), int(base + b) + 1
        limite = int(borde[max(0, y0):min(PSD_H, y1)].min()) - MARGEN_PUZLE
        derecha = X - l + r
        if derecha > limite:
            peor = (txt, derecha, limite)
    return peor


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--salida-dir", required=True)
    ap.add_argument("--centro", type=float, default=440.0, help="centro vertical del bloque (PSD)")
    ap.add_argument("--tam", type=float, help="fija el tamaño de la linea 1 (PSD) en vez de calcularlo")
    ap.add_argument("piezas", nargs="+", help="nombre linea1 linea2 [nombre linea1 linea2 ...]")
    a = ap.parse_args()
    if len(a.piezas) % 3:
        sys.exit("Las piezas van de tres en tres: nombre, linea 1, linea 2")
    tandas = [a.piezas[i:i + 3] for i in range(0, len(a.piezas), 3)]

    fondo = Image.open(f"{PORTADA}/fondo.png").convert("RGB")
    borde = borde_puzle(fondo)

    # Un solo tamaño para toda la tanda: el mayor con el que caben TODAS.
    if a.tam:
        tam1 = a.tam
        for _, l1, l2 in tandas:
            p = cabe(l1, l2, tam1, a.centro, borde)
            if p:
                sys.exit(f"✗ «{p[0]}» llega a {p[1]:.0f} y el puzle deja hasta {p[2]}. Acorta la frase.")
    else:
        tam1 = 122.1
        while all(not cabe(l1, l2, tam1 + 1, a.centro, borde) for _, l1, l2 in tandas) and tam1 < 400:
            tam1 += 1
    print(f"tamaño linea 1 = {tam1:.0f} (portada de recurso: 115) · linea 2 = {tam1 * RATIO_L2:.0f}")

    logo = logo_png(round(LOGO_W * S))
    os.makedirs(a.salida_dir, exist_ok=True)
    for nombre, l1, l2 in tandas:
        img = fondo.resize((OUT_W, OUT_H), Image.LANCZOS)
        d = ImageDraw.Draw(img)
        tam2, base1, base2 = colocar(l1, l2, tam1, a.centro)
        for txt, tam, base, color in ((l1, tam1, base1, NARANJA), (l2, tam2, base2, BLANCO)):
            f, l, _, _, _ = medir(txt, tam * S)
            d.text((X * S - l, base * S), txt, font=f, fill=color, anchor="ls")
        img.paste(logo, (round(X * S), round(LOGO_Y * S)), logo)
        out = os.path.join(a.salida_dir, f"DESTACADO {nombre.upper()} 191.png")
        img.save(out, optimize=True)
        print(f"{out}  ({OUT_W}x{OUT_H})")


if __name__ == "__main__":
    main()
