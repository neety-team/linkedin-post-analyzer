# -*- coding: utf-8 -*-
"""Hoja comparativa del GIF de un lead magnet: las referencias y el nuestro, uno al lado del otro,
en UNA imagen, con autor, comentarios y palabra encima de cada uno. Va SIEMPRE en el output de un
lead magnet con GIF (post-workflow §4.5.0-ENTREGA, images §0b-GIF-CHECKLIST punto 12).

Uso:
  python scripts/montar-comparativa-gif.py <salida.png> \
      "<gif o png>|<antetitulo>|<titulo>|<linea>" ["..."]  (el NUESTRO, el ultimo)
Cada panel se toma del fotograma central del GIF y se escala a 480x600 (el tamano con el que
LinkedIn sirve los 4:5 en el feed)."""
from PIL import Image, ImageDraw, ImageFont
import sys

FD = r'C:/Users/LENOVO/AppData/Local/Microsoft/Windows/Fonts/'
B = lambda s: ImageFont.truetype(FD + 'Switzer-Bold.otf', s)
R = lambda s: ImageFont.truetype(FD + 'Switzer-Regular.otf', s)
MENTA, BER, NAR, MUT, LINE = (235, 255, 246), (67, 27, 68), (254, 130, 56), (110, 90, 112), (222, 214, 224)

def fotograma(ruta):
    im = Image.open(ruta)
    n = getattr(im, 'n_frames', 1)
    im.seek(n // 2)
    return im.convert('RGB')

out = sys.argv[1]
paneles = [a.split('|') for a in sys.argv[2:]]
W, H, G, TOP = 480, 600, 40, 110
hoja = Image.new('RGB', (len(paneles) * W + (len(paneles) + 1) * G, H + TOP + G), MENTA)
d = ImageDraw.Draw(hoja)
for i, (ruta, ante, tit, linea) in enumerate(paneles):
    x = G + i * (W + G)
    d.text((x, 22), ante, font=B(15), fill=NAR)
    d.text((x, 46), tit, font=B(22), fill=BER)
    d.text((x, 78), linea, font=R(16), fill=MUT)
    hoja.paste(fotograma(ruta).resize((W, H), Image.LANCZOS), (x, TOP))
    d.rectangle((x - 1, TOP - 1, x + W, TOP + H), outline=LINE)
hoja.save(out)
print('guardada', out, hoja.size)
