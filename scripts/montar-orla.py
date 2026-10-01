#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""Monta la orla de "Los 10" pegando las fotos en los huecos de la plantilla.

POR QUÉ EXISTE: esto lo hacía un modelo generativo de imagen y no puede hacerlo.
Un modelo así no pega, REDIBUJA: sintetiza píxeles nuevos en todo el lienzo, así
que reinterpreta las caras (llegó a cambiar el color de los ojos y a devolver
personas que no eran), suaviza las fotos malas hasta convertirlas en modelos,
mete ruido en los fondos oscuros y descentra el título. No es un fallo de prompt:
es lo único que sabe hacer. Aquí las fotos entran píxel a píxel y la plantilla no
se toca, así que el resultado es idéntico cada semana.

QUÉ HACE, Y NADA MÁS:
  1. Localiza los huecos TRANSPARENTES de la plantilla (los detecta solos).
  2. Escala cada foto lo justo para cubrir su hueco y recorta el sobrante
     centrado (las fotos de LinkedIn son cuadradas y los huecos redondos).
  3. Pone las fotos DEBAJO y la plantilla ENCIMA. La máscara del círculo es la
     que dibujó el diseñador, no una que me invente yo, y el aro y el título
     quedan intactos porque nadie los reescribe.

Lo que NO hace, a propósito: retocar, suavizar, mejorar, iluminar ni reencuadrar.
Si alguien tiene una foto borrosa o en la que no se le ve la cara, sale así. Es
su foto de LinkedIn y ese es justo el punto.

USO:
  python scripts/montar-orla.py --plantilla "…/PLANTILLA.psd" \
      --fotos "…/los10-asturias" --salida "…/orla-asturias.png"

Las fotos se ordenan por nombre de fichero (01_…, 02_…, …), que es el mismo
orden de mención del post y el de los nombres de la plantilla.

"LAS 10" (Iker, 2026-10-01): la misma orla, pero con LOGOS de empresa en vez de
caras. Las caras de personas de otras empresas son lo que costó las quejas y el
veto de "Los 10"; el mapa y el despiece, que solo enseñan logos, no han tenido
ni una. Tres cosas nuevas, y las tres son opcionales para no romper lo de antes:
  --logos           cada logo entra CONTENIDO en un disco blanco, sin recortar
                    (el `contener` de montar-llanta.py, el mismo de la llanta).
  --titulo          sustituye el texto del título del PSD. La palabra entre
                    corchetes va en el color de acento del PSD (el naranja):
                    "LAS 10 QUE LEVANTAN|LA INDUSTRIA [XXX]" (el naranja, en la region).
  --aro N           aro berenjena de N px alrededor de cada logo (4 con --logos).
  (siempre)         título y nombres se AJUSTAN para no salirse de la franja ni
                    del lienzo: un gentilicio largo (CASTELLANOMANCHEGA) o un
                    nombre de empresa largo ya no se cortan por el borde.
"""
import argparse
import os
import sys
from collections import deque

import numpy as np
from PIL import Image, ImageDraw, ImageFont

# La plantilla trae los nombres como capas de texto con el literal "Nombre".
# Se localizan por ese literal, así que si el diseñador renombra el placeholder
# hay que tocar esto (el script avisa en vez de dibujar "Nombre" 10 veces).
PLACEHOLDER = 'Nombre'

# Un hueco de verdad son ~35.000 px. Por debajo de esto son pinholes de
# antialiasing en el borde de los círculos (en la plantilla DEF hay 20 sueltos).
MIN_PX_HUECO = 2000
# Alpha por debajo de esto = agujero. No es 0 exacto por el antialiasing del borde.
UMBRAL_ALPHA = 8


def buscar_huecos(alpha: np.ndarray) -> list[dict]:
    """Componentes conexas de píxeles transparentes, ordenadas como se lee."""
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
                huecos.append({'n': len(ys), 'y0': min(ys), 'y1': max(ys), 'x0': min(xs), 'x1': max(xs)})
    # Orden de lectura. Agrupar la Y por filas antes de ordenar por X: si no, una
    # fila con los círculos a distinta altura se barajaría.
    if huecos:
        alto_medio = sum(h['y1'] - h['y0'] for h in huecos) / len(huecos)
        huecos.sort(key=lambda h: (round(h['y0'] / max(alto_medio, 1)), h['x0']))
    return huecos


MODELO_CARA = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'modelos',
                           'face_detection_yunet_2023mar.onnx')


def detectar_cara(ruta: str):
    """Devuelve (x, y, w, h, confianza) de la cara más grande, o None.

    YuNet, NO las cascadas Haar. Haar se probó primero y era inservible aquí:
    en la foto de Alvaro Platero (blanco y negro, poco contraste, él de tres
    cuartos) devolvió TRES "caras" y las tres eran fondo desenfocado. Como el
    código cogía la más grande, le recortó la nuca. Peor aún: hizo creer que su
    cara ocupaba un 15% cuando ocupa un 35%, o sea que casi se "arregla" una
    foto que estaba perfecta.

    YuNet da confianza (0.89-0.96 en nuestras 10) y encuentra exactamente una
    cara por foto. Solo LOCALIZA: lo único que se hace con el resultado es
    recortar. No toca un píxel.
    """
    import cv2

    if not os.path.exists(MODELO_CARA):
        raise FileNotFoundError(
            f'Falta el modelo de caras en {MODELO_CARA}.\n'
            'Bájalo (232 KB) del zoo de OpenCV, que lo sirve por Git LFS:\n'
            '  curl -sL -o scripts/modelos/face_detection_yunet_2023mar.onnx \\\n'
            '    https://media.githubusercontent.com/media/opencv/opencv_zoo/main/'
            'models/face_detection_yunet/face_detection_yunet_2023mar.onnx\n'
            'Ojo: la URL de raw.githubusercontent devuelve un puntero LFS de 131 bytes, no el modelo.'
        )
    # cv2.imread se atraganta con las tildes de las rutas en Windows (Menéndez).
    img = cv2.imdecode(np.fromfile(ruta, dtype=np.uint8), cv2.IMREAD_COLOR)
    if img is None:
        return None
    det = cv2.FaceDetectorYN.create(MODELO_CARA, '', (320, 320), 0.6, 0.3, 5000)
    det.setInputSize((img.shape[1], img.shape[0]))
    _, caras = det.detect(img)
    if caras is None or len(caras) == 0:
        return None
    c = max(caras, key=lambda c: c[2] * c[3])
    return int(c[0]), int(c[1]), int(c[2]), int(c[3]), float(c[-1])


def recuadro_hacia_cara(foto: Image.Image, cara, objetivo: float, ancho: int, alto: int):
    """Recorte, con la proporción del hueco, en el que la cara ocupa `objetivo`.

    Esto NO es un retoque: es el mismo encuadre que haría un humano en Photoshop.
    No se suaviza, no se deforma, no se inventa un píxel. Solo se elige qué trozo
    de la foto original se ve.
    """
    x, y, w, h = cara[:4]
    alto_rec = h / objetivo
    ancho_rec = alto_rec * (ancho / alto)
    # La cara, un pelín por encima del centro: es como se encuadra un retrato.
    # Centrada exacta deja demasiado aire arriba y corta el pecho.
    cx = x + w / 2
    cy = y + h / 2 - alto_rec * 0.04
    alto_rec = min(alto_rec, foto.height)
    ancho_rec = min(ancho_rec, foto.width)
    x0 = max(0, min(cx - ancho_rec / 2, foto.width - ancho_rec))
    y0 = max(0, min(cy - alto_rec / 2, foto.height - alto_rec))
    return foto.crop((round(x0), round(y0), round(x0 + ancho_rec), round(y0 + alto_rec)))


def encajar(foto: Image.Image, ancho: int, alto: int) -> Image.Image:
    """Escala para CUBRIR el hueco y recorta el sobrante centrado.

    Lanczos solo reduce información, no la inventa. Si una foto es más pequeña
    que su hueco hay que ampliarla y ahí sí se pierde nitidez: se avisa fuera.
    """
    escala = max(ancho / foto.width, alto / foto.height)
    nuevo = (max(1, round(foto.width * escala)), max(1, round(foto.height * escala)))
    foto = foto.resize(nuevo, Image.LANCZOS)
    izq = (foto.width - ancho) // 2
    arr = (foto.height - alto) // 2
    return foto.crop((izq, arr, izq + ancho, arr + alto))


def leer_placeholders(ruta_psd: str) -> tuple[list[dict], dict]:
    """Saca del PSD los placeholders de nombre y su estilo REAL.

    Nada de esto se hardcodea: la fuente, el cuerpo, el color y la posición se
    leen del propio PSD, así que si el diseñador cambia el estilo, el script le
    sigue sin tocar una línea.
    """
    from psd_tools import PSDImage

    psd = PSDImage.open(ruta_psd)
    cajas, estilo = [], {}
    for capa in psd.descendants():
        if getattr(capa, 'kind', '') != 'type' or capa.text.strip() != PLACEHOLDER:
            continue
        cajas.append({'x0': capa.bbox[0], 'y0': capa.bbox[1], 'x1': capa.bbox[2], 'y1': capa.bbox[3]})
        if not estilo:
            datos = capa.engine_dict['StyleRun']['RunArray'][0]['StyleSheet']['StyleSheetData']
            rgba = datos.get('FillColor', {}).get('Values', [1, 0, 0, 0])
            estilo = {
                'fuente': str(capa.resource_dict['FontSet'][0].get('Name')).strip("'"),
                'cuerpo': float(datos.get('FontSize', 29)),
                'color': tuple(round(c * 255) for c in rgba[1:4]),
            }
    cajas.sort(key=lambda c: (round(c['y0'] / 100), c['x0']))
    return cajas, estilo


MARCADOR_REGION = 'XXX'
FUENTE_TITULO = ('C:/Users/LENOVO/Documents/Mario/LINKEDIN GROWTH/TIPOGRAFÍAS/'
                 'Bricolage Grotesque/static/BricolageGrotesque-ExtraBold.ttf')


def leer_titulo(ruta_psd: str):
    """Saca del PSD la capa de TITULO (la que no es un placeholder de nombre).

    Devuelve texto, color de cada tramo, cuerpo real en pixeles e interlineado.
    El FontSize del PSD esta en unidades del DOCUMENTO: hay que multiplicarlo
    por la escala de la matriz de transformacion de la capa.
    """
    import math

    from psd_tools import PSDImage

    psd = PSDImage.open(ruta_psd)
    for capa in psd.descendants():
        if getattr(capa, 'kind', '') != 'type' or capa.text.strip() == PLACEHOLDER:
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
        tr = capa.transform or (1, 0, 0, 1, 0, 0)
        escala = math.hypot(tr[0], tr[1]) or 1
        d0 = runs[0]['StyleSheet']['StyleSheetData']
        return {'texto': texto, 'tramos': tramos, 'bbox': capa.bbox,
                'cuerpo': float(d0.get('FontSize', 29)) * escala,
                'salto': float(d0.get('Leading') or d0.get('FontSize', 29) * 1.2) * escala,
                'cx': tr[4], 'base': tr[5]}
    return None


def sustituir_region(texto: str, region: str) -> str:
    """Mete la region en el titulo.

    Dos caminos, y el segundo existe por un fallo real (Iker, 2026-07-30): la
    plantilla de "Los 10" traia `LA INDUSTRIA ASTURIANA` escrito a fuego, y por
    eso la orla de Andalucia salio diciendo ASTURIANA y hubo que corregirla a
    mano. Lo suyo es que el PSD lleve XXX como marcador, igual que el del
    despiece; mientras no lo lleve, se sustituye la ULTIMA PALABRA del titulo,
    que es donde siempre va el gentilicio.
    """
    region = region.upper()
    if MARCADOR_REGION in texto:
        return texto.replace(MARCADOR_REGION, region)
    lineas = texto.split('\n')
    palabras = lineas[-1].split()
    if palabras:
        palabras[-1] = region
        lineas[-1] = ' '.join(palabras)
    return '\n'.join(lineas)


# Margen minimo a cada lado del titulo y de los nombres. El 32 sale de la orla
# de Gipuzkoa (15/09): `LA INDUSTRIA GUIPUZCOANA` mide 1.189 px en el cuerpo
# del PSD y quedo a 32-35 px de cada borde, y Iker la dio por buena.
MARGEN_TITULO = 32
MARGEN_VERTICAL = 26
# ESCALERA del titulo (Iker, 2026-10-01): la linea de arriba ocupa como mucho
# este tanto del ancho de la de abajo; la de abajo puede crecer hasta este
# tanto sobre el cuerpo del PSD; y por debajo de ARRIBA_MIN del PSD la de
# arriba ya no se lee y ese corte no vale.
ESCALERA = 0.85
ESCALA_MAX_ABAJO = 1.2
ARRIBA_MIN = 0.55
# Un renglon del titulo no acaba nunca en una de estas: se leeria cortado.
NO_CIERRAN_LINEA = {'LA', 'LAS', 'EL', 'LOS', 'QUE', 'DE', 'DEL', 'Y', 'A', 'AL', 'EN', 'CON', 'POR', 'PARA', 'SU', 'SUS'}


def dibujar_aro(img: Image.Image, hueco: dict, grosor: int, color) -> None:
    """Aro berenjena alrededor del hueco del logo (Iker, 2026-10-01).

    Un disco blanco sobre el menta claro no se despega del fondo: los logos se
    funden. Es lo mismo que ya decidio Iker en la llanta el 30/07 (`images
    §0a-novena`, "un logo blanco sobre el menta claro no se despega"). Va FUERA
    del hueco, pegado a su borde, para no comerle sitio al logo, y fino: es un
    marco de orla, no un adorno. Se dibuja a 4x y se reduce para que el borde
    salga suave.
    """
    k = 4
    x0, y0, x1, y1 = hueco['x0'] - 1, hueco['y0'] - 1, hueco['x1'] + 2, hueco['y1'] + 2
    m = grosor + 2
    w, h = x1 - x0 + 2 * m, y1 - y0 + 2 * m
    capa = Image.new('L', (w * k, h * k), 0)
    ImageDraw.Draw(capa).ellipse(
        ((m - grosor) * k, (m - grosor) * k, (w - m + grosor) * k, (h - m + grosor) * k), fill=255)
    ImageDraw.Draw(capa).ellipse((m * k, m * k, (w - m) * k, (h - m) * k), fill=0)
    capa = capa.resize((w, h), Image.LANCZOS)
    img.paste(Image.new('RGBA', (w, h), tuple(color[:3]) + (255,)), (x0 - m, y0 - m), mask=capa)


def _franja_alto(img: Image.Image) -> int:
    """Alto de la franja del titulo: donde la columna x=12 deja de ser su color."""
    col = img.getpixel((12, 4))[:3]
    for y in range(4, img.height):
        if sum(abs(a - b) for a, b in zip(img.getpixel((12, y))[:3], col)) > 40:
            return y
    return 256


def _lineas_titulo(texto: str, base_color, acento):
    """'LAS 10 QUE [LEVANTAN]|LA INDUSTRIA X' -> lineas de tramos con su color."""
    lineas = []
    for linea in texto.replace('\n', '|').split('|'):
        segs, buf, dentro = [], '', False
        for ch in linea:
            if ch in '[]':
                if buf:
                    segs.append({'txt': buf, 'color': acento if dentro else base_color})
                buf, dentro = '', ch == '['
            else:
                buf += ch
        if buf:
            segs.append({'txt': buf, 'color': acento if dentro else base_color})
        if segs:
            lineas.append(segs)
    return lineas


def dibujar_titulo_ajustado(img: Image.Image, titulo: dict, texto: str, ruta_fuente: str) -> str:
    """Titulo en ESCALERA: dos lineas, la de abajo MAS ANCHA y mas grande (Iker, 2026-10-01).

    Dos correcciones de Iker el mismo dia. (1) Tres lineas no: `LAS 10 QUE
    LEVANTAN / LA INDUSTRIA / CASTELLANOMANCHEGA` se baja de letra hasta caber en
    dos. (2) Y la segunda no puede quedar mas estrecha que la primera: la orla
    siempre fue escalera (`LAS 10 QUE LEVANTAN` / `LA INDUSTRIA GUIPUZCOANA`), y
    la linea de abajo es la que lleva la region en naranja, que es lo que para al
    de alli. Asi que cada linea va a SU cuerpo:
      - la de abajo, tan grande como quepa a lo ancho (hasta un 20% sobre el PSD);
      - la de arriba, como mucho el 85% del ancho de la de abajo y nunca mayor que
        ella ni que el PSD.
    Se prueban todos los cortes en dos lineas (ninguno deja un renglon acabado en
    articulo o relativo) y gana el que mas letra da entre las dos. Un corte cuya
    linea de arriba bajaria del 55% del PSD no vale: ya no se lee.
    """
    colores = [t['color'] for t in titulo['tramos']]
    base_color = colores[0]
    acento = next((c for c in colores if c != base_color), base_color)
    lineas_pedidas = _lineas_titulo(texto, base_color, acento)
    d = ImageDraw.Draw(img)
    franja = _franja_alto(img)
    ancho_max = img.width - 2 * MARGEN_TITULO
    limite = franja - 2 * MARGEN_VERTICAL
    psd = titulo['cuerpo']
    ratio_salto = titulo['salto'] / psd
    ref = ImageFont.truetype(ruta_fuente, 100)

    def fuente(c):
        # A la baja: Pillow solo pinta cuerpos enteros, y redondear hacia arriba
        # dejaba la linea de abajo 6 px mas ancha que el hueco medido.
        return ImageFont.truetype(ruta_fuente, max(8, int(c)))

    def ancho(linea, f):
        return sum(d.textlength(s['txt'], font=f) for s in linea)

    def cap(c):
        return -fuente(c).getbbox('H', anchor='ls')[1]

    def alto_bloque(cs):
        """Mayusculas de la primera + (salto - mayusculas) de cada una de arriba + mayusculas de la siguiente."""
        alto = cap(cs[0])
        for a, b in zip(cs, cs[1:]):
            alto += (a * ratio_salto - cap(a)) + cap(b)
        return alto

    def medir(lns):
        w = [ancho(l, ref) / 100 for l in lns]       # px por punto de cuerpo
        if len(lns) == 1:
            cs = [min(psd, ancho_max / w[0])]
        else:
            abajo = min(psd * ESCALA_MAX_ABAJO, ancho_max / w[1])
            arriba = min(psd, abajo, ancho_max / w[0], ESCALERA * abajo * w[1] / w[0])
            cs = [arriba, abajo]
        alto = alto_bloque(cs)
        if alto > limite:
            cs = [c * limite / alto for c in cs]
        return cs

    # Palabras sueltas con su color, para poder cortar por cualquier sitio.
    palabras = []
    for linea in lineas_pedidas:
        for seg in linea:
            palabras += [(w, seg['color']) for w in seg['txt'].split()]

    def montar(trozo):
        """Palabras -> tramos, juntando las seguidas del mismo color."""
        segs = []
        for i, (w, c) in enumerate(trozo):
            txt = w if i == 0 else ' ' + w
            if segs and segs[-1]['color'] == c:
                segs[-1]['txt'] += txt
            else:
                segs.append({'txt': txt, 'color': c})
        return segs

    opciones = []
    for k in range(1, len(palabras)):
        if palabras[k - 1][0].upper() in NO_CIERRAN_LINEA:
            continue
        lns = [montar(palabras[:k]), montar(palabras[k:])]
        opciones.append((medir(lns), lns))
    validas = [o for o in opciones if o[0][0] >= psd * ARRIBA_MIN]
    if not opciones:
        opciones = [(medir([montar(palabras)]), [montar(palabras)])]
    cuerpos, lineas = max(validas or opciones, key=lambda o: sum(o[0]))

    alto = alto_bloque(cuerpos)
    base = (franja - alto) / 2 + cap(cuerpos[0])
    for i, (linea, c) in enumerate(zip(lineas, cuerpos)):
        if i:
            base += (cuerpos[i - 1] * ratio_salto - cap(cuerpos[i - 1])) + cap(c)
        f = fuente(c)
        x = titulo['cx'] - ancho(linea, f) / 2
        for s in linea:
            d.text((x, base), s['txt'], font=f, fill=s['color'] + (255,), anchor='ls')
            x += d.textlength(s['txt'], font=f)
    resumen = ' / '.join(''.join(s['txt'] for s in l) for l in lineas)
    anchos = [round(ancho(l, fuente(c))) for l, c in zip(lineas, cuerpos)]
    print(f'  titulo    : {resumen}  ·  {" / ".join(f"{c:.1f}" for c in cuerpos)} px (PSD {psd:.1f})'
          f'  ·  anchos {" / ".join(map(str, anchos))} px')
    return resumen


def dibujar_titulo(img: Image.Image, titulo: dict, region: str, ruta_fuente: str) -> None:
    """Redibuja el titulo con la region puesta, en el MISMO cuerpo y sitio del PSD."""
    texto = sustituir_region(titulo['texto'], region)
    # Los tramos llevan el color; se reparte el texto nuevo respetando el corte
    # de los tramos originales por longitud proporcional.
    orig = titulo['texto']
    lineas_txt = texto.split('\n')
    lineas_orig = orig.split('\n')
    lineas = []
    pos = 0
    for idx, lo in enumerate(lineas_orig):
        segs, resto = [], lineas_txt[idx] if idx < len(lineas_txt) else ''
        # Se reconstruyen los tramos de ESTA linea desde los del PSD.
        consumido = 0
        for t in titulo['tramos']:
            ini, fin = pos, pos + len(t['txt'])
            trozo = orig[ini:fin]
            pos_linea = orig[:ini].count('\n')
            if pos_linea == idx and trozo.strip('\n'):
                segs.append({'txt': trozo.replace('\n', ''), 'color': t['color']})
                consumido += len(trozo.replace('\n', ''))
            pos = fin
        pos = 0
        if not segs:
            continue
        # Si la linea cambio de largo (la region), el ultimo tramo absorbe el cambio.
        largo_orig = sum(len(x['txt']) for x in segs)
        if resto and largo_orig != len(resto):
            segs[-1]['txt'] = resto[largo_orig - len(segs[-1]['txt']):]
        lineas.append(segs)

    fuente = ImageFont.truetype(ruta_fuente, round(titulo['cuerpo']))
    d = ImageDraw.Draw(img)
    base = titulo['base']
    for linea in lineas:
        ancho = sum(d.textlength(x['txt'], font=fuente) for x in linea)
        x = titulo['cx'] - ancho / 2
        for x_seg in linea:
            d.text((x, base), x_seg['txt'], font=fuente, fill=x_seg['color'] + (255,), anchor='ls')
            x += d.textlength(x_seg['txt'], font=fuente)
        base += titulo['salto']


def main() -> int:
    p = argparse.ArgumentParser(description='Monta la orla de "Los 10" sin retocar las fotos.')
    p.add_argument('--plantilla', required=True, help='PSD o PNG con los huecos transparentes')
    p.add_argument('--fotos', required=True, help='Carpeta con 01_….jpg … 10_….jpg')
    p.add_argument('--salida', required=True, help='PNG de salida')
    p.add_argument('--region', help='Region del titulo (ASTURIANA, ANDALUZA, VASCA). Sustituye XXX, o la ultima palabra si el PSD aun no lo lleva)')
    p.add_argument('--nombres', help='Los 10 nombres separados por " | ", en orden de mención')
    p.add_argument('--fuente', help='Ruta al .ttf (por defecto, el Bricolage Grotesque ExtraBold del sistema)')
    p.add_argument('--sin-encuadre', action='store_true',
                   help='No acercar las caras lejanas: pega cada foto tal cual venga')
    p.add_argument('--umbral-cara', type=float, default=0.6,
                   help='Se acerca la cara si baja de este múltiplo de la mediana (0.6 por defecto)')
    p.add_argument('--logos', action='store_true',
                   help='"LAS 10": la carpeta trae LOGOS de empresa, que entran contenidos en un disco blanco')
    p.add_argument('--aro', type=int, default=None,
                   help='Grosor en px del aro berenjena alrededor de cada logo (por defecto 4 con --logos, 0 lo quita)')
    p.add_argument('--titulo',
                   help='Texto del título; "|" parte la línea y [palabra] va en el color de acento. '
                        'Ej: "LAS 10 QUE LEVANTAN|LA INDUSTRIA [XXX]"')
    a = p.parse_args()
    if a.logos:
        a.sin_encuadre = True   # el detector de caras no pinta nada con un logo

    plantilla = Image.open(a.plantilla).convert('RGBA')
    huecos = buscar_huecos(np.array(plantilla.split()[3]))
    ficheros = sorted(
        f for f in os.listdir(a.fotos) if f.lower().endswith(('.jpg', '.jpeg', '.png', '.webp'))
    )

    print(f'plantilla : {os.path.basename(a.plantilla)}  {plantilla.width}x{plantilla.height}')
    print(f'huecos    : {len(huecos)}')
    print(f'fotos     : {len(ficheros)}')
    if len(huecos) != len(ficheros):
        print(f'\nERROR: {len(huecos)} huecos y {len(ficheros)} fotos. Tienen que ser iguales.', file=sys.stderr)
        return 1
    if not huecos:
        print('\nERROR: la plantilla no tiene huecos transparentes.', file=sys.stderr)
        return 1

    # Las fotos van en una capa DEBAJO; la plantilla se superpone encima y su
    # propio alpha recorta el círculo. Así el aro, el título y el fondo salen
    # bit a bit idénticos: este script no escribe un solo píxel sobre ellos.
    # Encuadre: hay quien tiene una foto de LinkedIn hecha desde la otra punta de
    # la sala. En la orla, al lado de 8 primeros planos, no se le ve. Se mide
    # cuánto ocupa cada cara, y a las que se salen por abajo se les acerca hasta
    # la MEDIANA del grupo. Solo a esas: al que ya está bien no se le toca.
    caras, ratios = {}, []
    if not a.sin_encuadre:
        for fichero in ficheros:
            cara = detectar_cara(os.path.join(a.fotos, fichero))
            caras[fichero] = cara
            if cara:
                alto_img = Image.open(os.path.join(a.fotos, fichero)).height
                ratios.append(cara[3] / alto_img)
        if ratios:
            objetivo = float(np.median(ratios))
            umbral = objetivo * a.umbral_cara
            print(f'\nencuadre  : cara mediana {objetivo * 100:.1f}% · se acerca por debajo de {umbral * 100:.1f}%')

    capa = Image.new('RGBA', plantilla.size, (0, 0, 0, 0))
    print()
    if a.logos:
        # El `contener` de la llanta: logo lo mas grande posible dentro del
        # CIRCULO, sin recortarle el nombre y centrado como lo ve el ojo. El
        # hueco de esta plantilla es una elipse de 213x224, asi que el disco es
        # el circulo de 213 inscrito, y debajo va blanco en toda la caja para
        # que no asome una media luna menta arriba y abajo.
        import importlib.util
        spec = importlib.util.spec_from_file_location(
            'llanta', os.path.join(os.path.dirname(os.path.abspath(__file__)), 'montar-llanta.py'))
        llanta = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(llanta)
        for hueco, fichero in zip(huecos, ficheros):
            ancho = hueco['x1'] - hueco['x0'] + 1
            alto = hueco['y1'] - hueco['y0'] + 1
            lado = min(ancho, alto)
            logo = Image.open(os.path.join(a.fotos, fichero))
            disco = llanta.contener(logo, lado)
            capa.paste(Image.new('RGBA', (ancho, alto), (255, 255, 255, 255)), (hueco['x0'], hueco['y0']))
            capa.paste(disco, (hueco['x0'] + (ancho - lado) // 2, hueco['y0'] + (alto - lado) // 2))
            nota = ''
            if min(logo.size) < lado * (1 - 2 * llanta.MARGEN):
                nota = f'  ⚠️ logo de {min(logo.size)} px para {lado}: se amplía y pierde nitidez'
            de = llanta.desequilibrio_vertical(disco)
            if abs(de) > 0.10:
                nota += f'  ⚠️ descentrado en vertical {100 * de:+.0f}%'
            print(f"  ({hueco['x0']:4d},{hueco['y0']:4d})  logo {logo.width}x{logo.height} → disco {lado}px  {fichero}{nota}")
    for hueco, fichero in ([] if a.logos else zip(huecos, ficheros)):
        ancho = hueco['x1'] - hueco['x0'] + 1
        alto = hueco['y1'] - hueco['y0'] + 1
        foto = Image.open(os.path.join(a.fotos, fichero)).convert('RGBA')
        nota = ''
        cara = caras.get(fichero)
        if cara and ratios:
            r = cara[3] / foto.height
            if r < umbral:
                foto = recuadro_hacia_cara(foto, cara, objetivo, ancho, alto)
                nota = f'  🔍 cara {r * 100:.0f}%→{objetivo * 100:.0f}%, acercada'
        elif not a.sin_encuadre and cara is None:
            nota = '  (sin detectar cara, se deja tal cual)'
        escala = max(ancho / foto.width, alto / foto.height)
        if escala > 1:
            nota += f'  ⚠️ AMPLIADA x{escala:.2f}, pierde nitidez'
        capa.paste(encajar(foto, ancho, alto), (hueco['x0'], hueco['y0']))
        print(f"  ({hueco['x0']:4d},{hueco['y0']:4d})  {foto.width}x{foto.height} → {ancho}x{alto}  x{escala:.2f}  {fichero}{nota}")

    final = Image.alpha_composite(capa, plantilla)
    grosor_aro = (4 if a.logos else 0) if a.aro is None else a.aro
    if grosor_aro:
        berenjena_aro = plantilla.getpixel((12, 4))
        for hueco in huecos:
            dibujar_aro(final, hueco, grosor_aro, berenjena_aro)
        print(f'\naro       : {grosor_aro} px en rgb{tuple(berenjena_aro[:3])} alrededor de cada logo')

    # Los nombres. La plantilla los trae como "Nombre" ×10, así que hay que
    # escribirlos encima: es lo ÚNICO que se dibuja sobre la plantilla, y solo
    # dentro de la caja de su propio placeholder.
    if a.nombres:
        nombres = [n.strip() for n in a.nombres.split('|')]
        cajas, estilo = leer_placeholders(a.plantilla)
        if len(nombres) != len(cajas):
            print(f'\nERROR: {len(nombres)} nombres y {len(cajas)} placeholders "{PLACEHOLDER}".', file=sys.stderr)
            return 1
        ruta = a.fuente or r'C:\Windows\Fonts\BricolageGrotesque-VariableFont_opsz,wdth,wght.ttf'
        try:
            fuente = ImageFont.truetype(ruta, round(estilo['cuerpo']))
        except OSError:
            print(f'\nERROR: no encuentro la fuente {ruta}. Pásala con --fuente.', file=sys.stderr)
            return 1
        print(f"\nnombres   : {estilo['fuente']} {estilo['cuerpo']:.0f}px  rgb{estilo['color']}")
        lienzo = ImageDraw.Draw(final)
        # DOS pasadas, y el orden importa: si se tapa y se escribe en el mismo
        # bucle, el rectángulo que borra un placeholder se come el final del
        # nombre anterior (un nombre largo invade la caja de al lado). Primero
        # se borran los 10 "Nombre", y solo después se escribe encima.
        for caja in cajas:
            fondo_txt = plantilla.getpixel((8, (caja['y0'] + caja['y1']) // 2))[:3]
            lienzo.rectangle((caja['x0'] - 2, caja['y0'] - 4, caja['x1'] + 2, caja['y1'] + 4), fill=fondo_txt)
        # ANCHO MAXIMO de cada nombre (Iker, 2026-10-01: "sin que se salgan de
        # las lineas, sin que se salga de la pantalla"). Hasta hoy el nombre se
        # pintaba a 29 px pasara lo que pasara: `Gustavo Lascurain` llego a 34 px
        # del borde derecho, y un nombre de empresa largo se habria cortado.
        # Cada nombre tiene de sitio la mitad del hueco hasta su vecino de fila
        # y hasta el borde del lienzo. Todos van al MISMO cuerpo (el que quepa
        # en la caja mas apretada), porque una orla con letras de tres tamaños
        # se lee como un error; solo si a 21 px aun no cabe, ese nombre se parte
        # en dos lineas.
        centros = [((c['x0'] + c['x1']) / 2, (c['y0'] + c['y1']) / 2) for c in cajas]
        maximos = []
        for cx, cy in centros:
            vecinos = [abs(ox - cx) for ox, oy in centros if abs(oy - cy) < 30 and ox != cx]
            medio = min(vecinos) / 2 - 12 if vecinos else 9999
            borde = min(cx, final.width - cx) - MARGEN_TITULO
            maximos.append(2 * min(medio, borde))
        def partir(nombre, f, maximo):
            """El nombre en una linea si cabe; si no, en dos, cortado por el medio."""
            if lienzo.textlength(nombre, font=f) <= maximo or ' ' not in nombre:
                return [nombre]
            pal = nombre.split()
            corte = min(range(1, len(pal)), key=lambda k: abs(len(' '.join(pal[:k])) - len(' '.join(pal[k:]))))
            return [' '.join(pal[:corte]), ' '.join(pal[corte:])]

        # Primero se intenta partir en dos lineas al cuerpo del PSD; solo si aun
        # asi no cabe (una palabra sola muy larga) se baja el cuerpo, y entonces
        # a TODOS por igual.
        cuerpo = estilo['cuerpo']
        for nombre, maximo in zip(nombres, maximos):
            w = max(lienzo.textlength(ln, font=fuente) for ln in partir(nombre, fuente, maximo))
            if w > maximo:
                cuerpo = min(cuerpo, estilo['cuerpo'] * maximo / w)
        cuerpo = max(int(cuerpo), 21)
        if cuerpo < estilo['cuerpo'] - 0.5:
            print(f'  ⚠️ nombres a {cuerpo} px (PSD {estilo["cuerpo"]:.0f}) para que quepa el mas largo')
        fuente = ImageFont.truetype(ruta, cuerpo)
        for (cx, cy), nombre, maximo in zip(centros, nombres, maximos):
            lineas = partir(nombre, fuente, maximo)
            salto = cuerpo * 1.1
            y = cy - salto * (len(lineas) - 1) / 2
            for ln in lineas:
                lienzo.text((cx, y), ln, font=fuente, fill=estilo['color'], anchor='mm')
                y += salto
            ancho_txt = max(lienzo.textlength(ln, font=fuente) for ln in lineas)
            aviso = '' if ancho_txt <= maximo else '  ⚠️ SE SALE'
            print(f"  ({cx:6.0f},{cy:5.0f})  {' / '.join(lineas):30s} ancho {ancho_txt:.0f}/{maximo:.0f}px{aviso}")

    # Quedan los pinholes de antialiasing (20 px sueltos en el borde de los
    # círculos). Se aplanan sobre el color de fondo de la propia plantilla, no
    # sobre blanco: sobre negro cantarían como puntitos.
    if a.region or a.titulo:
        titulo = leer_titulo(a.plantilla)
        if not titulo:
            print('⚠️  El PSD no tiene capa de titulo: no se toca.', file=sys.stderr)
        else:
            x0, y0, x1, y1 = titulo['bbox']
            berenjena = final.getpixel((12, max(4, y0 - 20)))
            ImageDraw.Draw(final).rectangle([x0 - 8, y0 - 12, x1 + 8, y1 + 12], fill=berenjena)
            # La misma fuente que los nombres. El Bricolage del sistema es la
            # variable y no la ExtraBold, asi que si Iker pasa --fuente se usa esa.
            ruta_ttf = a.fuente or FUENTE_TITULO
            if a.titulo:
                texto = a.titulo
            else:
                # El del PSD, con el acento donde lo tiene el diseñador.
                texto = ''.join(f"[{t['txt'].rstrip(chr(10))}]" + ('\n' if t['txt'].endswith('\n') else '')
                                if t['color'] != titulo['tramos'][0]['color'] else t['txt']
                                for t in titulo['tramos'])
            region = (a.region or '').upper()
            if MARCADOR_REGION in texto and region:
                texto = texto.replace(MARCADOR_REGION, region)
            elif region:
                texto = sustituir_region(texto.replace('|', '\n'), region)
                print(f'  ⚠️  El título no lleva {MARCADOR_REGION}: se ha sustituido la ULTIMA PALABRA.')
            dibujar_titulo_ajustado(final, titulo, texto, ruta_ttf)

    fondo = plantilla.getpixel((8, plantilla.height // 2))[:3]
    plano = Image.new('RGB', final.size, fondo)
    plano.paste(final, mask=final.split()[3])
    plano.save(a.salida)
    print(f'\n✅ {a.salida}  {plano.width}x{plano.height}')
    return 0


if __name__ == '__main__':
    sys.exit(main())
