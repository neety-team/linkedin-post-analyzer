# -*- coding: utf-8 -*-
"""GIF del lead magnet de /sistema/ (Iker, 12/11/2026), calcado del GIF de Pablo Rodriguez
(587 comentarios, 11/11, «Claude Bot · Maquina de prospeccion») y de los rasgos que comparten
los 8 GIF de lead magnet de ventas que mas comentan (post-workflow §4.5.0-BUENOS-CONTRA-MALOS,
remedido el 11/11): cabecera Claude x LinkedIn, «en vivo», contadores que suben, lista en
directo con estados, ranking, flujo de pasos con el activo latiendo y barra oscura al pie con la
palabra en un chip naranja. Cuadrado (1080 de trabajo, se exporta a 800) en vez de su 4:5.

Lo que NO se calca (reglas de la casa): ninguna persona ni empresa inventada (solo sectores y
cargos), ninguna promesa de automatismo ni de volumen (las cifras son de criba: revisadas,
encajan, fuera), y el mensaje lo manda el comercial.

Uso: python scripts/montar-gif-sistema-ventas.py "<salida.gif>" [4x5|1x1]   (deja al lado la fija .png)
Por defecto 4:5 (1080x1350 de trabajo, se exporta a 800x1000): desde el 12/11 es el formato
por defecto (images §0b, medido en el feed) y el de los GIF que vuelan."""
from PIL import Image, ImageDraw, ImageFont
import sys, math

OUT = sys.argv[1]
FORMATO = sys.argv[2] if len(sys.argv) > 2 else '4x5'
S = 1080
H = 1350 if FORMATO == '4x5' else 1080
V = H > S                       # vertical: el alto extra se reparte abajo
# Paleta del brandbook (docs/brandbook-neety-2026.pdf, pagina 23): berenjena #431b44, naranja
# #fe8238, menta #ebfff6 y azul bebe #a7c5f9. Los azules de la referencia pasan a berenjena.
BG = (235, 255, 246); CARD = (255, 255, 255); LINE = (222, 214, 224); SOFT = (246, 241, 247)
INK = (67, 27, 68); MUT = (110, 90, 112); FAINT = (182, 168, 184)
BLUE = (67, 27, 68); BLUE_T = (240, 232, 241); NAR = (254, 130, 56); NAR_T = (255, 238, 226)
NAVY1 = (67, 27, 68); NAVY2 = (104, 46, 106); BEBE = (167, 197, 249)
FD = r'C:/Users/LENOVO/AppData/Local/Microsoft/Windows/Fonts/'
WF = r'C:/Windows/Fonts/'
def bri(sz, w=b'Bold'):
    f = ImageFont.truetype(FD + 'BricolageGrotesque-VariableFont_opsz,wdth,wght.ttf', sz); f.set_variation_by_name(w); return f
SW = lambda s: ImageFont.truetype(FD + 'Switzer-Regular.otf', s)
SWB = lambda s: ImageFont.truetype(FD + 'Switzer-Bold.otf', s)
MONO = SWB                       # las etiquetas de la referencia van en mono; aqui, Switzer
SERIF_I = lambda s: bri(s, b'ExtraBold')

fH1 = bri(52, b'ExtraBold'); fH2 = SW(44); fChip = SWB(15); fSerif = bri(62, b'ExtraBold'); fSerifS = SW(24)
fCardT = SWB(26); fCardS = SW(17); fLab = SWB(15); fBig = bri(96 if V else 78, b'Bold'); fBigS = SW(17)
fRowT = SWB(20); fRowS = SW(15); fStat = SWB(15); fRank = SWB(20); fRankS = SW(14); fNum = SWB(22)
fFlow = SW(16); fFlowB = SWB(16); fCTA = bri(46, b'Bold')

M = 30
FRAMES = 150; MS = 80            # 12 s de bucle, como el de la referencia (11,99 s)

def tw(d, t, f): return d.textlength(t, font=f)
def ease(x): x = max(0.0, min(1.0, x)); return 1 - (1 - x) ** 3

# Logos OFICIALES de la carpeta LINKEDIN GROWTH, nunca redibujados: el asterisco de Claude
# (solo el simbolo, en su naranja) y el cuadro «in» de LinkedIn en berenjena, en una tinta,
# como sale en el modo oscuro. Se escalan con su proporcion real, sin estirarlos.
LG = r'C:/Users/LENOVO/Documents/Mario/LINKEDIN GROWTH/'
def _cargar_logos():
    c = Image.open(LG + 'claude logo.png').convert('RGBA')
    px = c.load(); w, h = c.size
    m = Image.new('L', c.size, 0); mp = m.load()
    for y in range(h):
        for x in range(w):
            r, g, b, a = px[x, y]
            if a > 0 and r > 150 and g < 170 and b < 140: mp[x, y] = a
    ast = Image.new('RGBA', c.size, (0, 0, 0, 0)); ast.paste(c, (0, 0), m); ast = ast.crop(m.getbbox())
    li = Image.open(LG + 'linkedin logo.png').convert('RGBA'); li = li.crop(li.getbbox())
    a = li.split()[3]; W, H_ = li.size
    col = [sum(1 for y in range(0, H_, 4) if a.getpixel((x, y)) > 128) for x in range(W)]
    full = max(col); xs = [x for x, v in enumerate(col) if v >= full * 0.9]
    caja = li.crop((min(xs), 0, max(xs) + 1, H_)); caja = caja.crop(caja.split()[3].getbbox())
    ber = Image.new('RGBA', caja.size, INK + (255,)); ber.putalpha(caja.split()[3])
    return ast, ber
LOGO_C, LOGO_IN = _cargar_logos()
# Neety: el logotipo oficial en blanco (NEETY LOGO.zip, PNG alta), recortado al ras
LOGO_N = Image.open(LG + 'neety logo blanco.png').convert('RGBA')

def pegar(im, logo, cx, cy, alto):
    w = max(1, round(logo.width * alto / logo.height))
    l = logo.resize((w, alto), Image.LANCZOS)
    im.paste(l, (round(cx - w / 2), round(cy - alto / 2)), l)
    return w

def chip(d, x, y, txt, fg, bg, f=fStat, padx=12, h=30, outline=None):
    w = tw(d, txt, f) + 2 * padx
    d.rounded_rectangle((x, y, x + w, y + h), radius=h // 2, fill=bg, outline=outline, width=2 if outline else 0)
    b = d.textbbox((0, 0), txt, font=f)
    d.text((x + padx, y + h / 2 - (b[1] + b[3]) / 2), txt, font=f, fill=fg)
    return w

# ---------------------------------------------------------------- datos (sin personas ni empresas)
FILAS = [  # sector, detalle, estado
    ('Fabricante de válvulas', '85 empl. · vende a energía', 'enc'),
    ('Taller de mecanizado', '40 empl. · subcontratación', 'fuera'),
    ('Fabricante de maquinaria', '160 empl. · exporta a 30 países', 'enc'),
    ('Distribuidor de ferretería', '25 empl. · solo reventa', 'fuera'),
    ('Fundición de aluminio', '120 empl. · vende a automoción', 'enc'),
    ('Fabricante de envases', '70 empl. · alimentación', 'lee'),
    ('Ingeniería de automatización', '55 empl. · proyectos llave en mano', 'enc'),
    ('Calderería industrial', '30 empl. · sin web de producto', 'fuera'),
    ('Fabricante de bombas', '200 empl. · exporta a Latinoamérica', 'enc'),
]
RANK = [('Director comercial', 'decide · tiene el presupuesto', 92),
        ('Director de exportación', 'influye · sufre las ferias', 84),
        ('Gerente', 'decide si no hay dir. comercial', 79),
        ('Director financiero', 'puede frenarlo · pide retorno', 71),
        ('Jefe de producción', 'usa · no pinta en la compra', 58)]
if V:
    RANK = RANK[:4] + [('Director general', 'decide en las más pequeñas', 66)] + RANK[4:]
FLOW = [('01', 'A quién vender'), ('02', 'Qué empresas'), ('03', 'Quién decide'), ('04', 'Primer mensaje'), ('05', 'Seguimiento')]

# ---------------------------------------------------------------- medidas fijas
HEAD_Y = 34
# en 4:5 los 270 px de mas: aire bajo la cabecera, contadores mas grandes, 2 filas mas en
# directo y en el ranking, aire en el flujo y una barra algo mas alta
# 12/11: G1 crece para la escalera de los 3 niveles (la diapositiva 6 del webinar de Iker)
G1, G2, GR, G3, G4 = (116, 40, 54, 30, 10) if V else (0, 0, 0, 0, 0)
LADDER = V
CARD_Y = 182 + G1; CARD_B = 928 + G1 + G2 + GR + G3 + G4
CTA_Y = CARD_B + 18; CTA_B = H - 30

def frame(i):
    t = i / FRAMES                      # 0..1 a lo largo del bucle
    im = Image.new('RGB', (S, H), BG); d = ImageDraw.Draw(im)

    # --- cabecera izquierda
    d.text((M + 6, HEAD_Y), 'Sistema de ventas', font=fH1, fill=INK)
    x = M + 6 + tw(d, 'Sistema de ventas', fH1) + 16
    wc_ = pegar(im, LOGO_C, x + 22, HEAD_Y + 34, 42); pegar(im, LOGO_IN, x + 22 + wc_ / 2 + 14 + 21, HEAD_Y + 34, 42)
    d.text((M + 6, HEAD_Y + 74), '5 encargos a Claude', font=fH2, fill=(75, 85, 99))
    # --- cabecera derecha: chip, serif y subtitulo que se escribe
    cw = tw(d, '• CLAUDE PROPONE', fChip) + 24
    cx = S - M - 6 - cw
    d.rounded_rectangle((cx, HEAD_Y, cx + cw, HEAD_Y + 28), radius=14, fill=NAR_T, outline=(248, 200, 178), width=1)
    d.text((cx + 12, HEAD_Y + 5), '• CLAUDE PROPONE', font=fChip, fill=NAR)
    s1 = 'tú decides'; w1 = tw(d, s1, fSerif)
    d.text((S - M - 6 - w1, HEAD_Y + 40), s1, font=fSerif, fill=BLUE)
    sub = 'y el mensaje lo mandas tú'
    # quieto y completo hasta la mitad del bucle: el primer fotograma se lee entero (images §0b-GIF regla 1)
    n = len(sub); k = n if not (0.55 <= t < 0.85) else int(n * ease((t - 0.55) / 0.25))
    shown = sub[:k]
    ws = tw(d, sub, fSerifS)
    d.text((S - M - 6 - ws, HEAD_Y + 116), shown, font=fSerifS, fill=(75, 85, 99))
    if (i // 5) % 2 == 0:
        cxp = S - M - 6 - ws + tw(d, shown, fSerifS) + 3
        d.line((cxp, HEAD_Y + 118, cxp, HEAD_Y + 144), fill=(75, 85, 99), width=2)

    # --- la escalera de los 3 niveles: esta guia es el 2; el 3, lo mas completo, es Neety
    if LADDER:
        ly = HEAD_Y + 168; lh = 62; gapl = 14; wl = (S - 2 * M - 2 * gapl) / 3
        NIV = [('NIVEL 1', 'LinkedIn solo', CARD, INK, NAR), ('NIVEL 2 · ESTA GUÍA', 'Con Claude', INK, (255, 255, 255), NAR),
               ('NIVEL 3 · LO MÁS COMPLETO', None, NAR, (255, 255, 255), (255, 255, 255))]
        for q, (k_, t_, bg_, fg_, kc_) in enumerate(NIV):
            x0_ = M + q * (wl + gapl)
            d.rounded_rectangle((x0_, ly, x0_ + wl, ly + lh), radius=16, fill=bg_, outline=LINE if q == 0 else bg_, width=2)
            d.text((x0_ + 18, ly + 10), k_, font=SWB(13), fill=kc_)
            if q == 1:
                wl_ = pegar(im, LOGO_C, x0_ + 18 + 10, ly + 42, 18)
                d.text((x0_ + 18 + 26, ly + 30), t_, font=SWB(20), fill=fg_)
            elif q == 2:
                pegar(im, LOGO_N, x0_ + 18 + 56, ly + 42, 24)
            else:
                d.text((x0_ + 18, ly + 30), t_, font=SWB(20), fill=fg_)

    # --- tarjeta principal
    d.rounded_rectangle((M, CARD_Y, S - M, CARD_B), radius=26, fill=CARD, outline=LINE, width=2)
    px = M + 26; py = CARD_Y + 24
    d.ellipse((px, py, px + 42, py + 42), fill=INK)
    d.ellipse((px + 13, py + 18, px + 18, py + 23), fill=(255, 255, 255)); d.ellipse((px + 24, py + 18, px + 29, py + 23), fill=(255, 255, 255))
    d.text((px + 56, py - 2), 'Encargo 2 · una tanda a mano', font=fCardT, fill=INK)
    d.text((px + 56, py + 30), 'Ejemplo · fabricantes industriales · pegadas por tandas pequeñas', font=fCardS, fill=MUT)
    # chips de la derecha
    webs = 9 + int(3 * ease(t * 1.4))
    vivo = '• EN VIVO'
    xr = S - M - 26 - tw(d, vivo, fLab)
    d.text((xr, py + 10), vivo, font=fLab, fill=NAR if (i // 6) % 2 == 0 else (255, 196, 160))
    tt = f'{webs} webs leídas'
    xr2 = xr - 18 - tw(d, tt, fLab); d.text((xr2, py + 10), tt, font=fLab, fill=MUT)
    cl = 'Claude'; wcl = tw(d, cl, fStat) + 44
    xc = xr2 - 18 - wcl
    d.rounded_rectangle((xc, py + 2, xc + wcl, py + 34), radius=8, fill=SOFT, outline=LINE)
    pegar(im, LOGO_C, xc + 18, py + 18, 20); d.text((xc + 34, py + 9), cl, font=fStat, fill=INK)

    # --- contadores
    cy0 = CARD_Y + 96
    d.line((M + 26, cy0 - 8, S - M - 26, cy0 - 8), fill=LINE, width=2)
    colw = (S - 2 * M - 52) / 3
    # suben poco para que el reinicio del bucle no se note (regla 2)
    # nivel 2 = una tanda a mano, no todo el mercado: cifras de tanda pequena
    rev = 9 + int(3 * ease(t * 1.4)); enc = 2 + int(ease((t - 0.25) * 2)); fue = rev - enc
    COUNT = [('EN ESTA TANDA', f'{rev}', 'pegadas a mano, una a una', INK),
             ('ENCAJAN', f'{enc}', 'cada una con su frase de prueba', BLUE),
             ('FUERA', f'{fue}', 'sin prueba en su web, aunque cuadren', FAINT)]
    for c, (lab, val, sub2, col) in enumerate(COUNT):
        x0 = M + 26 + c * colw
        if c: d.line((x0 - 14, cy0 + 6, x0 - 14, cy0 + 132 + G2), fill=LINE, width=2)
        d.text((x0, cy0 + 8), lab, font=fLab, fill=MUT)
        d.text((x0, cy0 + 30), val, font=fBig, fill=col)
        d.text((x0, cy0 + 118 + G2), sub2, font=fBigS, fill=MUT)

    # --- dos columnas
    top = cy0 + 154 + G2
    bot = top + 330 + GR
    lw = 560
    L = (M + 20, top, M + 20 + lw, bot); R = (M + 20 + lw + 16, top, S - M - 20, bot)
    for b in (L, R): d.rounded_rectangle(b, radius=18, fill=SOFT, outline=LINE)
    d.text((L[0] + 18, top + 14), 'EMPRESAS EN DIRECTO', font=fLab, fill=MUT)
    secs = int(t * 12)
    clk = f'10:41:{(2 + secs) % 60:02d}'
    d.text((L[2] - 18 - tw(d, clk, fLab), top + 14), clk, font=fLab, fill=INK)
    # filas que suben: cada 2 s entra una por arriba
    ROWH = 54; vis = 5 + GR // 54
    shift = (t * 6) % 1.0; base = int(t * 6)
    sl = ease(min(1, shift / 0.25))
    clip = Image.new('RGB', (lw - 20, vis * ROWH + 8), SOFT); dc = ImageDraw.Draw(clip)
    for r in range(vis + 1):
        idx = (base - r) % len(FILAS)
        sector, det, est = FILAS[idx]
        y = int((r - 1 + sl) * ROWH) + 4
        if r == 0 and sl < 0.05: continue
        hi = (r == 1 and sl > 0.9 and est == 'enc')
        dc.rounded_rectangle((0, y, lw - 22, y + ROWH - 8), radius=12, fill=CARD, outline=BLUE if hi else LINE, width=2 if hi else 1)
        dc.ellipse((10, y + 10, 34, y + 34), fill=BLUE_T)
        dc.ellipse((18, y + 16, 26, y + 24), fill=BLUE)
        dc.text((44, y + 5), sector, font=fRowT, fill=INK if est != 'fuera' else FAINT)
        dc.text((44, y + 27), det, font=fRowS, fill=MUT if est != 'fuera' else FAINT)
        # puntos de progreso
        for p in range(5):
            on = p < (5 if est == 'enc' else 2 if est == 'fuera' else 1 + int(3 * ((t * 8) % 1)))
            dc.ellipse((lw - 232 + p * 11, y + 20, lw - 225 + p * 11, y + 27), fill=BLUE if on and est == 'enc' else NAR if on else LINE)
        if est == 'enc':
            cw_ = tw(dc, 'encaja', fStat) + 44; x_ = lw - 165
            dc.rounded_rectangle((x_, y + 9, x_ + cw_, y + 39), radius=15, fill=BLUE)
            dc.line((x_ + 13, y + 24, x_ + 18, y + 29, x_ + 27, y + 18), fill=(255, 255, 255), width=3)
            bb_ = dc.textbbox((0, 0), 'encaja', font=fStat)
            dc.text((x_ + 33, y + 24 - (bb_[1] + bb_[3]) / 2), 'encaja', font=fStat, fill=(255, 255, 255))
        elif est == 'fuera': chip(dc, lw - 165, y + 9, 'fuera · sin prueba', FAINT, CARD, f=SW(14))
        else: chip(dc, lw - 165, y + 9, 'leyendo web…', NAR, NAR_T, outline=(248, 200, 178))
    im.paste(clip, (L[0] + 10, top + 46))
    d = ImageDraw.Draw(im)
    # ranking de quien decide
    d.text((R[0] + 18, top + 14), 'QUIÉN DECIDE', font=fLab, fill=MUT)
    tr = 'por dónde empezar'; d.text((R[2] - 18 - tw(d, tr, fLab), top + 14), tr, font=fLab, fill=INK)
    nuevo = (t % 0.5) > 0.12
    for r, (cargo, papel, sc) in enumerate(RANK):
        y = top + 48 + r * 55
        hi = (r == 1 and nuevo)
        d.rounded_rectangle((R[0] + 12, y, R[2] - 12, y + 49), radius=12, fill=CARD, outline=NAR if hi else LINE, width=2 if hi else 1)
        d.text((R[0] + 26, y + 12), f'#{r + 1}', font=fNum, fill=BLUE if r == 0 else NAR if hi else FAINT)
        d.text((R[0] + 70, y + 4), cargo, font=fRank, fill=INK)
        d.text((R[0] + 70, y + 28), papel, font=fRankS, fill=NAR if hi else MUT)
        sb = f'{sc}'; ws2 = tw(d, sb, fStat) + 22
        if hi: chip(d, R[0] + 70 + tw(d, papel, fRankS) + 8, y + 27, 'NUEVO', (255, 255, 255), NAR, f=SWB(10), padx=6, h=17)
        d.rounded_rectangle((R[2] - 24 - ws2, y + 12, R[2] - 24, y + 38), radius=13, fill=BLUE_T)
        d.text((R[2] - 24 - ws2 + 11, y + 16), sb, font=fStat, fill=BLUE)

    # --- flujo de los 5 encargos
    fy = bot + 18 + G3
    d.text((M + 26, fy), 'EL SISTEMA · 5 ENCARGOS', font=fLab, fill=MUT)
    tx = 'cada encargo arranca donde acaba el anterior'
    d.text((S - M - 26 - tw(d, tx, fLab), fy), tx, font=fLab, fill=INK)
    act = int(t * 5) % 5; ph = (t * 5) % 1
    gap = (S - 2 * M - 180) / 4
    cyf = fy + 50
    d.line((M + 90, cyf, S - M - 90, cyf), fill=LINE, width=3)
    for k, (num, lab) in enumerate(FLOW):
        x = M + 90 + k * gap
        if k == act:
            rr = 30 + 6 * math.sin(ph * math.pi * 2)
            d.ellipse((x - rr, cyf - rr, x + rr, cyf + rr), fill=BLUE_T if k % 2 == 0 else NAR_T)
        col = BLUE if k % 2 == 0 else NAR
        d.ellipse((x - 22, cyf - 22, x + 22, cyf + 22), fill=CARD, outline=col, width=3)
        d.ellipse((x - 8, cyf - 8, x + 8, cyf + 8), fill=col)
        d.text((x - tw(d, num, fFlow) / 2, cyf + 30), num, font=fFlow, fill=FAINT)
        ff = fFlowB if k == act else fFlow
        d.text((x - tw(d, lab, ff) / 2, cyf + 52), lab, font=ff, fill=col if k == act else INK)

    # --- barra del CTA, degradado azul marino como la referencia
    bar = Image.new('RGB', (S - 2 * M, CTA_B - CTA_Y))
    bd = ImageDraw.Draw(bar)
    for xx in range(bar.width):
        a = xx / bar.width
        bd.line((xx, 0, xx, bar.height), fill=tuple(int(NAVY1[c] + (NAVY2[c] - NAVY1[c]) * a) for c in range(3)))
    mask = Image.new('L', bar.size, 0); ImageDraw.Draw(mask).rounded_rectangle((0, 0, bar.width - 1, bar.height - 1), radius=20, fill=255)
    im.paste(bar, (M, CTA_Y), mask)
    d = ImageDraw.Draw(im)
    a, w_, b = 'Comenta ', 'VENTAS', ' y te lo envío'
    wa, ww, wb = tw(d, a, fCTA), tw(d, w_, fCTA), tw(d, b, fCTA)
    padx = 22
    total = wa + ww + 2 * padx + wb
    x0 = (S - total) / 2
    cap = d.textbbox((0, 0), 'VENTAS', font=fCTA)
    midy = CTA_Y + (CTA_B - CTA_Y) / 2
    ty = midy - (cap[1] + cap[3]) / 2
    d.text((x0, ty), a, font=fCTA, fill=(255, 255, 255))
    d.rounded_rectangle((x0 + wa, midy - 34, x0 + wa + ww + 2 * padx, midy + 34), radius=12, fill=NAR)
    d.text((x0 + wa + padx, ty), w_, font=fCTA, fill=(255, 255, 255))
    d.text((x0 + wa + ww + 2 * padx, ty), b, font=fCTA, fill=(255, 255, 255))
    return im

frames = [frame(i) for i in range(FRAMES)]
EXPORT = 720 if V else 800   # 4:5 a 720x900: por debajo de 5 MB, y la referencia se sirve a 480x600
small = [f.resize((EXPORT, EXPORT * H // S), Image.LANCZOS) for f in frames]
# fija: el fotograma mas completo (texto escrito entero y la fila nueva ya dentro)
fija = frames[int(FRAMES * 0.45)]
fija.save(OUT.rsplit('.', 1)[0] + '.png')
pal = [s.quantize(colors=112 if V else 128, method=Image.MEDIANCUT, dither=Image.NONE) for s in small]
pal[0].save(OUT, save_all=True, append_images=pal[1:], duration=MS, loop=0, optimize=True, disposal=1)
import os
print('guardado', OUT, round(os.path.getsize(OUT) / 1e6, 2), 'MB', len(frames), 'fotogramas', FRAMES * MS / 1000, 's')
