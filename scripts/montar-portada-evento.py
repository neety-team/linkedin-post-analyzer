"""Monta la portada cuadrada de un webinar o evento online de Neety (images §11).

Fondo oficial (mint, cuadricula, manchas abajo a la izquierda), Bricolage Grotesque,
paleta de marca y Kaixito con gafas abajo a la derecha. Composicion aprobada por
Iker el 2026-10-08 para el webinar del 28/10.

Uso:
  python scripts/montar-portada-evento.py --l1 "Menos buscar." --l2 "Mas vender." \
      --fecha "Miercoles 28 octubre" --hora "10:00" \
      --info1 "Online y gratis" --info2 "30 minutos" --salida "Portada Webinar.png"

La salida va a la carpeta NEETY FORWARD salvo que --salida sea una ruta absoluta.
"""
import argparse
import os
from PIL import Image, ImageDraw, ImageFont

CARPETA = r"C:\Users\LENOVO\Documents\Mario\LINKEDIN GROWTH\NEETY FORWARD"
FONDO = os.path.join(CARPETA, "Fondo Webinars.png")
KAIXITO = r"C:\Users\LENOVO\Documents\Mario\LINKEDIN GROWTH\EMAIL MARKETING\Kaixito Mascota.png"
KAIXITO_GAFAS = (700, 880, 1140, 1200)  # el de abajo a la derecha de la hoja
FUENTE = r"C:\Users\LENOVO\AppData\Local\Microsoft\Windows\Fonts\BricolageGrotesque-VariableFont_opsz,wdth,wght.ttf"

NARANJA = (254, 130, 56)    # fe8238
BERENJENA = (67, 27, 68)    # 431b44
LADO = 1200
MARGEN = 85                 # el de la portada de Neety Forward


def fuente(px, peso):
    f = ImageFont.truetype(FUENTE, px)
    f.set_variation_by_axes([96, peso, 100])  # optical size, weight, width
    return f


def poner(d, x, y_tinta, txt, f, color):
    # coloca el texto para que la TINTA (no la caja de la fuente) empiece en y_tinta
    d.text((x, y_tinta - f.getbbox(txt)[1]), txt, font=f, fill=color)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--l1", required=True, help="linea 1 del titulo, fina")
    ap.add_argument("--l2", required=True, help="linea 2 del titulo, negrita")
    ap.add_argument("--fecha", required=True)
    ap.add_argument("--hora", required=True)
    ap.add_argument("--info1", default="Online y gratis")
    ap.add_argument("--info2", default="")
    ap.add_argument("--salida", default="Portada Webinar.png")
    ap.add_argument("--fondo", default=FONDO)
    ap.add_argument("--ancha", action="store_true",
                    help="version 1916x1200 para la foto grande de la ficha en neety.com/eventos")
    a = ap.parse_args()
    if a.ancha:
        return ancha(a)

    im = Image.open(a.fondo).convert("RGB").resize((LADO, LADO), Image.LANCZOS)
    d = ImageDraw.Draw(im)
    ancho_util = LADO - 2 * MARGEN

    # TITULO: 165 px como tope (el "Neety Forward" de septiembre); si la linea mas
    # larga no cabe en el ancho util, baja hasta que quepa. Nunca a tres lineas.
    t = 165
    while t > 90:
        f1, f2 = fuente(t, 300), fuente(t, 800)
        if max(d.textlength(a.l1, font=f1), d.textlength(a.l2, font=f2)) <= ancho_util:
            break
        t -= 1
    paso = round(t * 185 / 165)
    poner(d, MARGEN, 110, a.l1, f1, NARANJA)
    poner(d, MARGEN, 110 + paso, a.l2, f2, NARANJA)

    # FECHA Y HORA: berenjena, la fecha fina y la hora en negrita, ~0,5 del titulo
    y_fecha = 110 + paso + round(t * 225 / 165)
    poner(d, MARGEN, y_fecha, a.fecha, fuente(84, 300), BERENJENA)
    poner(d, MARGEN, y_fecha + 105, a.hora, fuente(84, 800), BERENJENA)

    # BLOQUE DE LA DERECHA (donde iba "Plazas limitadas"): alineado a la derecha
    der = LADO - MARGEN
    for i, (txt, peso) in enumerate(((a.info1, 700), (a.info2, 300))):
        if txt:
            f = fuente(48, peso)
            poner(d, der - d.textlength(txt, font=f), 700 + 60 * i, txt, f, BERENJENA)

    # KAIXITO con gafas, abajo a la derecha, sobre mint (nunca sobre una mancha)
    k = Image.open(KAIXITO).convert("RGBA").crop(KAIXITO_GAFAS)
    k = k.crop(k.getbbox())
    k = k.resize((400, round(k.height * 400 / k.width)), Image.LANCZOS)
    im.paste(k, (der - k.width, LADO - 80 - k.height), k)

    salida = a.salida if os.path.isabs(a.salida) else os.path.join(CARPETA, a.salida)
    im.save(salida)  # PNG nuevo: sin metadatos del generador
    print("titulo a %d px -> %s" % (t, salida))


def ancha(a):
    # Foto del hero de neety.com/eventos/<slug> (la web la recorta a 1,6:1). La ficha le pone
    # ENCIMA, en el tercio de abajo, dos chapas con la fecha y el lugar: por eso aqui no van
    # fecha, hora ni "Online y gratis" (saldrian repetidas y tapadas) y todo vive arriba.
    # El fondo se escala al ancho y se coge su parte de ARRIBA: las manchas de abajo a la
    # izquierda solo asoman por la esquina, debajo de las chapas.
    W, H, M = 1916, 1200, 130
    im = Image.open(a.fondo).convert("RGB").resize((W, W), Image.LANCZOS).crop((0, 300, W, 300 + H))
    d = ImageDraw.Draw(im)
    poner(d, M, 250, a.l1, fuente(175, 300), NARANJA)
    poner(d, M, 455, a.l2, fuente(175, 800), NARANJA)
    k = Image.open(KAIXITO).convert("RGBA").crop(KAIXITO_GAFAS)
    k = k.crop(k.getbbox())
    k = k.resize((460, round(k.height * 460 / k.width)), Image.LANCZOS)
    im.paste(k, (W - M - k.width, 275), k)
    salida = a.salida if os.path.isabs(a.salida) else os.path.join(CARPETA, a.salida)
    im.save(salida)
    print("version ancha -> %s" % salida)


if __name__ == "__main__":
    main()
