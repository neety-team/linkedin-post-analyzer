#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""Monta la imagen del pilar DESPIECE pegando los logos en los huecos de la llanta.

POR QUÉ EXISTE, y es el mismo motivo que `montar-orla.py`: un modelo generativo
de imagen NO pega, REDIBUJA. Con logos es aún peor que con caras, porque además
los rechaza por copyright (`images §0i-2`): al pedirle logos de terceros o se
niega o se los inventa. Aquí entran píxel a píxel y la plantilla no se toca.

QUÉ HACE, Y NADA MÁS:
  1. Localiza los huecos TRANSPARENTES de la plantilla (los detecta solos).
  2. Los ordena por ÁNGULO desde el centro, empezando arriba y en el sentido
     del reloj. Esto es lo único que cambia de verdad frente a la orla: una
     orla se lee por filas, una rueda se lee como un reloj, así que el orden
     de mención del post cae en las 12 posiciones en el orden que espera el ojo.
  3. Mete cada logo CONTENIDO dentro de su hueco, sin deformar y sin recortar,
     sobre un disco blanco. Un logo no es un retrato: si lo escalas para CUBRIR
     el círculo le cortas el nombre, que es justo lo que hay que leer.
  4. Pone los logos DEBAJO y la plantilla ENCIMA, así que la máscara redonda es
     la que dibujó el diseñador.
  5. Redibuja el título cambiando el marcador XXX por la región, respetando los
     colores que ya trae el PSD (la palabra punchy en naranja).

USO:
  python scripts/montar-llanta.py \
      --plantilla "…/PELOTEO REGIONAL/DESPIECE/PLANTILLA AUTOMOCION v2.psd" \
      --logos "…/logos-despiece-euskadi" \
      --region VASCA \
      --salida "…/despiece-euskadi.png"

Los logos se ordenan por nombre de fichero (01-…, 02-…, …), que es el mismo
orden en que salen las piezas en el post.
"""
import argparse
import os
import sys
from collections import deque

import numpy as np
from PIL import Image, ImageDraw, ImageFont

# Alpha por debajo de esto = agujero. No es 0 exacto por el antialiasing del borde.
UMBRAL_ALPHA = 8
# Un hueco de verdad son ~9.000 px en la plantilla de 1254x1254. Por debajo de
# esto son pinholes del borde de los círculos, no huecos.
MIN_PX_HUECO = 1500
# Aire entre el logo y el borde del círculo, en tanto por uno del diámetro. Un
# logo pegado al borde se lee como un error de montaje.
# Bajado de 0.20 a 0.08 el 2026-08-07: con 0.20 el logo solo ocupaba el 60%
# del diametro y en la llanta de 12 huecos se veian diminutos. Con 0.08 usa el
# 84%. El disco blanco sigue dando aire suficiente para que no parezca un fallo.
# 0.04 y no 0.08 desde que se ajusta por la DIAGONAL: la geometria ya impide
# que el logo toque el borde, asi que el margen solo tiene que dar respiro
# visual. Con 0.08 encima de la diagonal los logos se quedaban pequeños otra vez.
MARGEN = 0.04
# Marcador que el diseñador deja en el PSD para la región.
MARCADOR_REGION = 'XXX'
FUENTE_DEF = ('C:/Users/LENOVO/Documents/Mario/LINKEDIN GROWTH/TIPOGRAFÍAS/'
              'Bricolage Grotesque/static/BricolageGrotesque-ExtraBold.ttf')


def buscar_huecos(alpha: np.ndarray) -> list[dict]:
    """Componentes conexas de píxeles transparentes, ordenadas como un reloj."""
    mask = alpha < UMBRAL_ALPHA
    alto, ancho = mask.shape
    visto = np.zeros((alto, ancho), bool)
    huecos = []
    for y in range(alto):
        for x in np.nonzero(mask[y] & ~visto[y])[0]:
            if visto[y, x]:
                continue
            visto[y, x] = True
            cola = deque([(y, x)])
            ys, xs = [], []
            while cola:
                cy, cx = cola.popleft()
                ys.append(cy)
                xs.append(cx)
                for dy, dx in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                    ny, nx = cy + dy, cx + dx
                    if 0 <= ny < alto and 0 <= nx < ancho and mask[ny, nx] and not visto[ny, nx]:
                        visto[ny, nx] = True
                        cola.append((ny, nx))
            if len(ys) >= MIN_PX_HUECO:
                huecos.append({'n': len(ys), 'y0': min(ys), 'y1': max(ys),
                               'x0': min(xs), 'x1': max(xs)})
    if not huecos:
        return huecos
    # Orden de RELOJ: arriba primero y luego en el sentido de las agujas. El
    # centro se calcula de los propios huecos, no se hardcodea, así que sirve
    # igual si el diseñador mueve la rueda o cambia el número de posiciones.
    cx = sum((h['x0'] + h['x1']) / 2 for h in huecos) / len(huecos)
    cy = sum((h['y0'] + h['y1']) / 2 for h in huecos) / len(huecos)
    for h in huecos:
        dx = (h['x0'] + h['x1']) / 2 - cx
        dy = (h['y0'] + h['y1']) / 2 - cy
        # atan2(dx, -dy): 0 arriba, creciendo hacia la derecha.
        h['ang'] = np.arctan2(dx, -dy) % (2 * np.pi)
    huecos.sort(key=lambda h: h['ang'])
    return huecos


def _recortar_fondo(logo):
    """Quita el fondo del logo, sea cual sea, y devuelve solo la marca.

    LAS CUATRO CASUISTICAS, porque los logos de LinkedIn vienen de todo (Iker,
    2026-08-07: "hay logos cuadrados, redondos, sin fondo, otros con fondo, y de
    todo, y todos tienen que salir grandes y centrados"):

      1. FONDO BLANCO (la mayoria) -> se recorta el blanco.
      2. TRANSPARENTE (PNG)        -> se recorta por alpha.
      3. FONDO DE COLOR (el azul de VW, el negro de Mercedes) -> NO se recorta:
         ese fondo ES el logo, y quitarlo lo dejaria irreconocible.
      4. FONDO CLARO CON DEGRADADO (Lizarte) -> el umbral fijo de 246 recortaba
         un lado si y el otro no, y el logo salia descentrado. Por eso el fondo
         no se decide con un numero fijo: se MIDE en las cuatro esquinas.
    """
    import numpy as np
    from PIL import Image

    rgba = logo.convert('RGBA')
    arr = np.array(rgba)
    alto, ancho = arr.shape[0], arr.shape[1]

    # ¿Hay transparencia de verdad? Entonces el fondo es esa.
    alpha = arr[:, :, 3]
    if (alpha < 250).mean() > 0.02:
        mask = alpha > 40
    else:
        # El fondo es el color de las esquinas. Se toma la MEDIANA de las cuatro
        # para que una esquina rara no decida por las demas.
        k = max(2, min(alto, ancho) // 25)
        esquinas = np.concatenate([
            arr[:k, :k, :3].reshape(-1, 3), arr[:k, -k:, :3].reshape(-1, 3),
            arr[-k:, :k, :3].reshape(-1, 3), arr[-k:, -k:, :3].reshape(-1, 3)])
        fondo = np.median(esquinas, axis=0)
        # Si las esquinas NO son claras, el fondo es parte del logo (caso 3).
        if fondo.mean() < 225:
            return rgba
        # Tolerancia generosa: coge el degradado entero, no solo el blanco puro.
        dist = np.abs(arr[:, :, :3].astype(int) - fondo.astype(int)).max(axis=2)
        mask = dist > 22

    ys, xs = np.nonzero(mask)
    if len(xs) == 0:
        return rgba
    x0, x1, y0, y1 = xs.min(), xs.max(), ys.min(), ys.max()
    # Guarda: si el recorte se comiera casi todo, algo ha ido mal en la medida.
    if (x1 - x0) < ancho * 0.10 or (y1 - y0) < alto * 0.10:
        return rgba
    return rgba.crop((x0, y0, x1 + 1, y1 + 1))


def _circulo_minimo(pts):
    """Circulo mas pequeño que contiene todos los puntos (Welzl iterativo).

    Se le pasa el CONTORNO CONVEXO de la marca, no todos sus pixeles: da el
    mismo circulo y son decenas de puntos en vez de miles.
    """
    import random

    def dos(a, b):
        cx, cy = (a[0] + b[0]) / 2, (a[1] + b[1]) / 2
        return cx, cy, ((a[0] - cx) ** 2 + (a[1] - cy) ** 2) ** 0.5

    def tres(a, b, c):
        ax, ay = a
        bx, by = b
        cx, cy = c
        d = 2 * (ax * (by - cy) + bx * (cy - ay) + cx * (ay - by))
        if abs(d) < 1e-9:
            return None
        ux = ((ax * ax + ay * ay) * (by - cy) + (bx * bx + by * by) * (cy - ay) + (cx * cx + cy * cy) * (ay - by)) / d
        uy = ((ax * ax + ay * ay) * (cx - bx) + (bx * bx + by * by) * (ax - cx) + (cx * cx + cy * cy) * (bx - ax)) / d
        return ux, uy, ((ax - ux) ** 2 + (ay - uy) ** 2) ** 0.5

    def dentro(c, p):
        return c is not None and ((p[0] - c[0]) ** 2 + (p[1] - c[1]) ** 2) ** 0.5 <= c[2] + 1e-7

    p = list(pts)
    random.Random(0).shuffle(p)
    c = None
    for i, a in enumerate(p):
        if dentro(c, a):
            continue
        c = (a[0], a[1], 0.0)
        for j in range(i):
            b = p[j]
            if dentro(c, b):
                continue
            c = dos(a, b)
            for k in range(j):
                q = p[k]
                if dentro(c, q):
                    continue
                t = tres(a, b, q)
                c = t if t else c
    return c


def _contorno_convexo(xs, ys):
    """Contorno convexo (cadena monotona) de una nube de pixeles."""
    pts = sorted(set(zip(xs.tolist(), ys.tolist())))
    if len(pts) <= 2:
        return pts

    def giro(o, a, b):
        return (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0])
    abajo, arriba = [], []
    for q in pts:
        while len(abajo) >= 2 and giro(abajo[-2], abajo[-1], q) <= 0:
            abajo.pop()
        abajo.append(q)
    for q in reversed(pts):
        while len(arriba) >= 2 and giro(arriba[-2], arriba[-1], q) <= 0:
            arriba.pop()
        arriba.append(q)
    return abajo[:-1] + arriba[:-1]


def holgura(disco):
    """Aire (px) entre la marca y el borde REDONDO del hueco: arriba, abajo, izq, dcha.

    Se mide la distancia al centro del pixel de marca mas lejano en cada mitad
    y se resta del radio. Es lo que el ojo compara en un marco circular.
    """
    a = np.array(disco.convert('RGB')).astype(int)
    lado = a.shape[0]
    c = (lado - 1) / 2.0
    ys, xs = np.nonzero(np.abs(a - 255).max(axis=2) > 30)
    if not len(xs):
        return None
    d = np.hypot(ys - c, xs - c)
    r = lado / 2.0
    def aire(sel):
        return r - d[sel].max() if sel.any() else r
    return (aire(ys < c), aire(ys >= c), aire(xs < c), aire(xs >= c))


def contener(logo, lado):
    """Disco blanco con el logo dentro: lo mas grande posible y CENTRADO.

    Contener y no cubrir: un logo recortado pierde el nombre de la empresa, que
    es lo unico que hay que poder leer.

    LAS DOS DECISIONES, y las dos se equivocaron una vez antes de quedar asi:

    TAMAÑO — se mide el RADIO, no el lado ni la diagonal. El hueco es un CIRCULO
    pase lo que pase con el logo. Ajustar por el lado deja que las esquinas se
    salgan; ajustar por la diagonal castiga a los logos REDONDOS, que tienen las
    esquinas vacias. El radio al pixel de marca mas lejano vale para las dos
    formas y para cualquier otra.

    CENTRADO — por el CENTRO DEL CIRCULO MINIMO que envuelve la marca (Iker,
    2026-09-16). Nunca por el centro de masa: probe con el para bajar una T que
    se veia alta y descoloco todos los logos ASIMETRICOS (el pajaro de Lizarte
    mira a la derecha y el centroide lo empujo a la izquierda). Y tampoco por
    el centro de la CAJA, que era lo de antes: el marco es un CIRCULO, y un
    logo ancho por un lado y estrecho por el otro (la "U" de Talleres
    Unamunzaga: dos brazos arriba, una curva abajo) quedaba con 32 px de caja
    arriba y abajo, pero con las esquinas de arriba pegadas al borde redondo y
    la curva de abajo con aire de sobra. El circulo minimo mide lo mismo que
    el marco: distancia al borde REDONDO. En un logo cuadrado o redondo
    coincide con el centro de la caja, asi que esos no se mueven.
    Y el RADIO de ese circulo es el que fija el tamaño, igual que antes.
    """
    import numpy as np
    from PIL import Image

    lienzo = Image.new('RGBA', (lado, lado), (255, 255, 255, 255))
    logo = _recortar_fondo(logo)
    util = round(lado * (1 - 2 * MARGEN))

    # Radio desde el CENTRO DE LA CAJA (que tras el recorte es el centro de la
    # imagen), midiendo solo pixeles de marca.
    gris = np.array(logo.convert('L'))
    alpha = np.array(logo)[:, :, 3]
    marca = (alpha > 40) & (gris <= 250)
    if not marca.any():
        marca = alpha > 40
    ys, xs = np.nonzero(marca)
    cx, cy = (logo.width - 1) / 2.0, (logo.height - 1) / 2.0
    if len(xs):
        c = _circulo_minimo(_contorno_convexo(xs, ys))
        if c:
            cx, cy, r = c
        else:
            r = float(np.max(np.sqrt((xs - cx) ** 2 + (ys - cy) ** 2)))
    else:
        r = ((logo.width ** 2 + logo.height ** 2) ** 0.5) / 2
    escala = (util / 2.0) / max(r, 1.0)

    nuevo = (max(1, round(logo.width * escala)), max(1, round(logo.height * escala)))
    logo = logo.resize(nuevo, Image.LANCZOS)
    # El centro del circulo minimo cae en el centro del disco.
    x = round((lado - 1) / 2.0 - (cx + 0.5) * escala + 0.5)
    y = round((lado - 1) / 2.0 - (cy + 0.5) * escala + 0.5)
    lienzo.paste(logo, (x, y), logo)
    return lienzo


def leer_titulo(ruta_psd: str) -> dict | None:
    """Saca del PSD el título, su caja y el color de cada tramo.

    Nada se hardcodea: si el diseñador cambia el texto, el color de la palabra
    punchy o la caja, el script le sigue sin tocar una línea.
    """
    from psd_tools import PSDImage

    psd = PSDImage.open(ruta_psd)
    for capa in psd.descendants():
        if getattr(capa, 'kind', '') != 'type':
            continue
        texto = capa.text.replace('\r', '\n')
        runs = capa.engine_dict['StyleRun']['RunArray']
        largos = capa.engine_dict['StyleRun']['RunLengthArray']
        tramos, i = [], 0
        for r, L in zip(runs, largos):
            d = r['StyleSheet']['StyleSheetData']
            v = d.get('FillColor', {}).get('Values', [1, 1, 1, 1])
            tramos.append({'txt': texto[i:i + L], 'color': tuple(round(c * 255) for c in v[1:4])})
            i += L
        # El cuerpo y el interlineado del PSD estan en unidades del DOCUMENTO,
        # no en pixeles: hay que multiplicarlos por la escala de la matriz de
        # transformacion de la capa. Aqui 29 x 2.82 = 81.8 px reales.
        # Iker, 2026-07-30: antes yo ajustaba el cuerpo a la caja por prueba y
        # error, y salia MAS PEQUENO que el que habia puesto el disenador. El
        # tamano no se recalcula, se respeta.
        import math
        tr = capa.transform or (1, 0, 0, 1, 0, 0)
        escala = math.hypot(tr[0], tr[1]) or 1
        d0 = runs[0]['StyleSheet']['StyleSheetData']
        cuerpo = float(d0.get('FontSize', 29)) * escala
        salto = float(d0.get('Leading') or d0.get('FontSize', 29) * 1.2) * escala
        return {'texto': texto, 'tramos': tramos, 'bbox': capa.bbox,
                'cuerpo': cuerpo, 'salto': salto, 'cx': tr[4], 'base': tr[5]}
    return None


def dibujar_titulo(img: Image.Image, titulo: dict, region: str, ruta_fuente: str) -> None:
    """Redibuja el título con la región puesta, en el MISMO cuerpo y sitio del PSD.

    No se ajusta nada a ojo: el cuerpo, el interlineado, el centro horizontal y
    la primera línea base salen de la capa de texto del diseñador.
    """
    # Los tramos llevan su color; se parten por línea manteniéndolo.
    lineas: list[list[dict]] = [[]]
    for t in titulo['tramos']:
        partes = t['txt'].replace(MARCADOR_REGION, region.upper()).split(chr(10))
        for j, p in enumerate(partes):
            if j:
                lineas.append([])
            if p:
                lineas[-1].append({'txt': p, 'color': t['color']})
    lineas = [l for l in lineas if l]

    fuente = ImageFont.truetype(ruta_fuente, round(titulo['cuerpo']))
    d = ImageDraw.Draw(img)
    base = titulo['base']
    for linea in lineas:
        ancho = sum(d.textlength(s['txt'], font=fuente) for s in linea)
        x = titulo['cx'] - ancho / 2
        for s in linea:
            # Ancla en la línea base izquierda, que es como posiciona Photoshop.
            d.text((x, base), s['txt'], font=fuente, fill=s['color'] + (255,), anchor='ls')
            x += d.textlength(s['txt'], font=fuente)
        base += titulo['salto']


def rellenar_llanta(img: Image.Image, color) -> int:
    """Pinta de berenjena el CENTRO de la llanta y sus VENTANAS (Iker, 2026-09-16).

    Por qué: con la plantilla tal cual, el círculo central sale vacío y se lee
    como un hueco de logo que se nos ha olvidado, y las ventanas menta dejan el
    disco blanco de cada logo fundido con el fondo. En berenjena, la rueda se
    lee como una llanta y los logos resaltan.

    Cómo, sin tocar nada más: se buscan las zonas color menta CERRADAS (que no
    tocan el borde de la imagen), por debajo de la franja del título, y se
    rellenan las pequeñas (<3% de la imagen). Así queda fuera la zona grande de
    los radios, que se sigue viendo menta, y quedan dentro el centro y las
    ventanas. Devuelve cuántas zonas ha pintado.
    """
    from collections import deque
    a = np.array(img.convert('RGB')).astype(int)
    H, W, _ = a.shape
    menta = np.abs(a - a[H - 5, 5]).sum(2) < 30          # el fondo de la plantilla
    franja = next((y for y in range(H) if menta[y, 12]), 0)  # fin de la franja del título
    vis = np.zeros((H, W), bool)
    pintar = np.zeros((H, W), bool)
    n = 0
    for y in range(franja, H):
        for x in range(W):
            if not menta[y, x] or vis[y, x]:
                continue
            q, px, borde = deque([(y, x)]), [], False
            vis[y, x] = True
            while q:
                cy, cx = q.popleft()
                px.append((cy, cx))
                if cy in (0, H - 1) or cx in (0, W - 1):
                    borde = True
                for ny, nx in ((cy + 1, cx), (cy - 1, cx), (cy, cx + 1), (cy, cx - 1)):
                    if 0 <= ny < H and 0 <= nx < W and menta[ny, nx] and not vis[ny, nx]:
                        vis[ny, nx] = True
                        q.append((ny, nx))
            if not borde and 300 < len(px) < 0.03 * H * W:
                ys, xs = zip(*px)
                pintar[list(ys), list(xs)] = True
                n += 1
    # 2 px de margen para comerse el antialias del borde (el contorno ya es berenjena).
    crece = pintar.copy()
    for dy in range(-2, 3):
        for dx in range(-2, 3):
            crece |= np.roll(np.roll(pintar, dy, 0), dx, 1)
    b = np.array(img.convert('RGBA'))
    b[crece, :3] = color[:3]
    img.paste(Image.fromarray(b))
    return n


def main() -> int:
    p = argparse.ArgumentParser(description='Monta la imagen del pilar despiece (objeto).')
    p.add_argument('--plantilla', required=True, help='PSD con los huecos transparentes')
    p.add_argument('--logos', required=True, help='Carpeta con 01-….jpg … NN-….jpg')
    p.add_argument('--salida', required=True, help='PNG de salida')
    p.add_argument('--region', help='Región que sustituye a XXX en el título (VASCA, GALLEGA…)')
    p.add_argument('--fuente', default=FUENTE_DEF, help='Ruta al .ttf del título')
    # El relleno NO va por defecto (Iker, 2026-09-16): lo vio feo y el relleno lo
    # trae la PLANTILLA nueva que pasa él. Se deja como opcion para maquetas.
    p.add_argument('--relleno', action='store_true',
                   help='Maqueta: pinta de berenjena el centro y las ventanas de la llanta')
    a = p.parse_args()

    plantilla = Image.open(a.plantilla).convert('RGBA')
    huecos = buscar_huecos(np.array(plantilla)[:, :, 3])
    ficheros = sorted(f for f in os.listdir(a.logos)
                      if f.lower().endswith(('.jpg', '.jpeg', '.png', '.webp')))
    print(f'  plantilla {plantilla.size[0]}x{plantilla.size[1]} · {len(huecos)} huecos · {len(ficheros)} logos')
    if not huecos:
        print('✗ No hay huecos transparentes. ¿Has borrado los círculos magenta en el PSD?', file=sys.stderr)
        return 1
    if len(ficheros) != len(huecos):
        print(f'⚠️  {len(ficheros)} logos para {len(huecos)} huecos: se usan los primeros '
              f'{min(len(ficheros), len(huecos))} en orden de reloj.', file=sys.stderr)

    fondo = Image.new('RGBA', plantilla.size, (0, 0, 0, 0))
    for i, (h, nombre) in enumerate(zip(huecos, ficheros), 1):
        lado = max(h['x1'] - h['x0'], h['y1'] - h['y0']) + 1
        logo = Image.open(os.path.join(a.logos, nombre))
        if min(logo.size) < lado * (1 - 2 * MARGEN):
            print(f'  ⚠️  {nombre} es {logo.size[0]}px y el hueco pide '
                  f'{round(lado * (1 - 2 * MARGEN))}px: se amplía y pierde nitidez')
        disco = contener(logo, lado)
        fondo.paste(disco, (h['x0'], h['y0']))
        print(f'  {i:2}. {nombre[:34]:36} → hueco en ({h["x0"]},{h["y0"]}) {lado}px')
        # Comprobacion de centrado contra el BORDE REDONDO (Iker, 2026-09-16):
        # aire entre la marca y el circulo en cada mitad. Si un lado tiene mucho
        # mas que el opuesto, el ojo lo lee descentrado aunque la caja cuadre.
        hol = holgura(disco)
        if hol and (abs(hol[0] - hol[1]) > 6 or abs(hol[2] - hol[3]) > 6):
            print(f'      ⚠️  descentrado: aire arriba {hol[0]:.0f} / abajo {hol[1]:.0f} · '
                  f'izq {hol[2]:.0f} / dcha {hol[3]:.0f} px. Miralo en la imagen.')

    out = Image.alpha_composite(fondo, plantilla)

    if a.region:
        titulo = leer_titulo(a.plantilla)
        if not titulo:
            print('⚠️  El PSD no tiene capa de texto: el título no se toca.', file=sys.stderr)
        elif MARCADOR_REGION not in titulo['texto']:
            print(f'⚠️  El título del PSD no lleva el marcador {MARCADOR_REGION}, '
                  f'así que no sé dónde va la región. Se deja como está.', file=sys.stderr)
        else:
            # El composite ya trae el título con XXX pintado. Se tapa su caja con
            # el berenjena de la franja (muestreado del propio PSD, no inventado)
            # y se redibuja con la región dentro.
            x0, y0, x1, y1 = titulo['bbox']
            berenjena = out.getpixel((12, max(4, y0 - 20)))
            ImageDraw.Draw(out).rectangle([x0 - 6, y0 - 10, x1 + 6, y1 + 10], fill=berenjena)
            dibujar_titulo(out, titulo, a.region, a.fuente)
            print(f'  título: {titulo["texto"].replace(chr(10), " / ").replace(MARCADOR_REGION, a.region.upper())}')

    if a.relleno:
        n = rellenar_llanta(out, out.getpixel((12, 12)))
        print(f'  relleno berenjena: {n} zonas (centro + ventanas)')
        if n != 6:
            print(f'⚠️  Esperaba 6 zonas (1 centro + 5 ventanas) y he pintado {n}: mira la imagen.',
                  file=sys.stderr)

    out.convert('RGB').save(a.salida, 'PNG')
    print(f'\n✓ {a.salida}')
    return 0


if __name__ == '__main__':
    sys.exit(main())
