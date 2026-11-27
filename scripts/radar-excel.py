#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""radar-excel.py — una edición del Radar de inversiones convertida en Excel de trabajo.

Es el recurso exclusivo de la newsletter (email-marketing §5, 2026-11-23): la lista ya está en
la web, lo que solo tiene quien recibe el correo es este Excel, que se filtra por lo que vendes.

Pestañas:
  1. Cómo usarlo: tres pasos, la fecha de los datos y de dónde salen.
  2. Las inversiones: una fila por empresa, con filtros. Además de lo que publica la edición,
     dos columnas de CLASIFICACIÓN (no son datos nuevos): la familia de compra, sacada por
     palabras del texto «Qué puede necesitar», y a quién buscar dentro, el papel que da la guía
     de quién decide la compra para esa familia. Lo que no encaja claro queda en «Varios».
  3. Por lo que vendes: la misma lista agrupada por familia de compra.
  4. Quién decide: la tabla de la guía de quién decide la compra.

Sin personas, sin fechas estimadas y sin importes que no dé la fuente.

Uso:
  python scripts/radar-excel.py <edicion.md> <salida.xlsx>
"""
import importlib.util, os, re, sys
from collections import Counter, defaultdict

from openpyxl import Workbook
from openpyxl.styles import Alignment, Border, Font, PatternFill, Side
from openpyxl.utils import get_column_letter
from openpyxl.worksheet.datavalidation import DataValidation

_spec = importlib.util.spec_from_file_location(
    'radar_correo', os.path.join(os.path.dirname(os.path.abspath(__file__)), 'montar-radar-correo.py'))
rc = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(rc)

# Familia de compra → palabras que la delatan en «Qué puede necesitar», y a quién buscar dentro
# (el papel que empuja la compra según la guía «Cómo encontrar a quien decide la compra en una
# empresa industrial», neety.com/guias/quien-decide-compra-empresa-industrial).
FAMILIAS = [
    ('Maquinaria y equipos de proceso',
     r'maquinaria|equipos? de (fabricaci|proceso|procesado|producci|medida|corte|varada)|l[ií]neas? de|llenador|'
     r'lavador|extrusor|reactor|horno|corte l[aá]ser|punzonador|mecanizad|utillaje|prensa|troquel|perfilado|'
     r'electrolizador|digestor|gasificaci|dep[oó]sitos|calderer|caldera|soldadura|s[ií]ntesis|chorreado|'
     r'cabinas de pintura|bancos de',
     'Dirección de operaciones o de planta; ingeniería de procesos'),
    ('Automatización y control',
     r'automatizaci|rob[oó]tic|robotizad|sistemas? de control|control y (seguridad|trazabilidad)|instrumentaci|'
     r'trazabilidad|software|paletizad|visi[oó]n artificial|digitalizaci',
     'Ingeniería de procesos; producción'),
    ('Obra, naves e instalaciones',
     r'obra|nave|construcci|montaje|puentes? gr[uú]a|gr[uú]a|instalaciones|tuber[ií]as|tanques|salas? limpias?',
     'Ingeniería o dirección técnica del proyecto'),
    ('Energía, electrificación y climatización',
     r'el[eé]ctric|electrificaci|energ[ií]a|fotovoltaic|biomasa|alta tensi|bomba de calor|fr[ií]o|climatizaci|'
     r'combustibles|bater[ií]as|t[eé]rmica',
     'Dirección de planta; mantenimiento'),
    ('Logística interna y almacén',
     r'almac[eé]n\b|log[ií]stic|intralog|transelevador|lgv|muelle|silo|elevaci[oó]n y transporte',
     'Dirección de operaciones o de planta'),
    ('Materiales, componentes y consumibles',
     r'componentes|consumibles|materiales?\b|materia prima|cemento|[aá]ridos|acero|adhesivos|tintas|suministros|'
     r'material cat[oó]dico',
     'Ingeniería de producto o compras'),
    ('Mantenimiento',
     r'mantenimiento',
     'Mantenimiento; dirección de planta'),
    ('Medio ambiente, emisiones y aguas',
     r'emisiones|captura de (co2|carbono)|almacenamiento de co2|residuos|aguas|descarboniz|biog[aá]s',
     'Dirección técnica; medio ambiente'),
    ('Ingeniería y servicios técnicos',
     r'ingenier[ií]a|consultor|calibraci|ensayo',
     'Ingeniería, dirección técnica'),
]
VARIOS = 'Varios'

QUIEN_DECIDE = [
    ('Lo que vendes', 'Quién lo empuja (sufre el problema)', 'Quién lo valida técnicamente', 'Quién paga', 'Quién cierra'),
    ('Máquina o línea nueva (inversión)', 'Dirección de operaciones o de planta, ingeniería de procesos', 'Ingeniería, proyectos', 'Dirección general; en grupos, la matriz', 'Compras'),
    ('Automatización, mejora de proceso', 'Ingeniería de procesos, producción', 'Ingeniería, mantenimiento', 'Dirección de planta', 'Compras'),
    ('Componente o material para su producto', 'Ingeniería de producto, I+D', 'Calidad (homologación)', 'Dirección de compras', 'Compras'),
    ('Recambios, mantenimiento, servicio técnico', 'Mantenimiento', 'Mantenimiento', 'Dirección de planta', 'Compras'),
    ('Consumibles y productos estándar', 'Producción', 'Calidad', 'Compras', 'Compras'),
    ('Servicios de ingeniería o consultoría', 'Ingeniería, dirección técnica', 'Dirección técnica', 'Dirección general', 'Dirección general o compras'),
    ('Software industrial', 'Ingeniería, operaciones', 'IT o sistemas', 'Dirección general', 'Compras o dirección'),
]

PLUM, SURF = '431B44', 'F5F7F9'
H = Font(name='Arial', bold=True, color='FFFFFF', size=11)
T = Font(name='Arial', bold=True, color=PLUM, size=16)
B = Font(name='Arial', color='2B2B2B', size=11)
BB = Font(name='Arial', bold=True, color=PLUM, size=11)
LINK = Font(name='Arial', color='1155CC', underline='single', size=11)
FILL_H = PatternFill('solid', fgColor=PLUM)
FILL_S = PatternFill('solid', fgColor=SURF)
_l = Side(style='thin', color='DDD6DE')
BOX = Border(left=_l, right=_l, top=_l, bottom=_l)
WRAP = Alignment(wrap_text=True, vertical='top')


def familias(texto):
    t = texto.lower()
    fs = [f for f, rx, _ in FAMILIAS if re.search(rx, t)]
    return fs or [VARIOS]


def quien(fs):
    """Los papeles de sus familias, sin repetir y como mucho tres, en el orden de FAMILIAS."""
    papeles = []
    for f, _, p in FAMILIAS:
        if f not in fs:
            continue
        for trozo in p.split(';'):
            t = trozo.strip()
            t = t[:1].upper() + t[1:]
            if t and t not in papeles:
                papeles.append(t)
    return '; '.join(papeles[:3]) if papeles else 'Dirección general o de planta'


def cabecera(ws, cols):
    for j, (n, w) in enumerate(cols, start=1):
        c = ws.cell(row=1, column=j, value=n)
        c.font, c.fill, c.border = H, FILL_H, BOX
        c.alignment = Alignment(wrap_text=True, vertical='center')
        ws.column_dimensions[get_column_letter(j)].width = w
    ws.row_dimensions[1].height = 36
    ws.freeze_panes = 'B2'


def main():
    if len(sys.argv) < 3:
        sys.exit(__doc__)
    fm, _tend, filas = rc.leer(sys.argv[1])
    region, mes = fm['region'], fm['mes']
    anio, nmes = mes.split('-')
    nombre_mes = rc.MESES[int(nmes) - 1]
    semanal = 'semana' in fm
    if semanal:
        # Aviso semanal (email-marketing §5S): solo las filas válidas, igual que el correo.
        _sa = importlib.util.spec_from_file_location(
            'aviso', os.path.join(os.path.dirname(os.path.abspath(__file__)), 'montar-aviso-semanal.py'))
        av = importlib.util.module_from_spec(_sa)
        _sa.loader.exec_module(av)
        filas, _desc = av.filas_validas(fm, filas)
        d, h = (av._fecha(fm['desde']), av._fecha(fm['hasta']))
        periodo = f'semana del {d:%d/%m} al {h:%d/%m}'
    oficiales = sum(1 for f in filas if rc.OFICIAL.search(f['fuente']))

    wb = Workbook()
    # 1 · Cómo usarlo
    ws = wb.active
    ws.title = 'Cómo usarlo'
    ws.sheet_view.showGridLines = False
    ws.column_dimensions['A'].width = 4
    ws.column_dimensions['B'].width = 100
    lineas = [
        (f'Radar de inversiones industriales · {rc.REGIONES.get(region, region)} · '
         + (periodo if semanal else f'{nombre_mes} {anio}'), T),
        (f'{len(filas)} empresas industriales que han anunciado una inversión en '
         + (f'la {periodo}' if semanal else nombre_mes) + ': plantas nuevas, '
         'ampliaciones, ayudas concedidas y tramitaciones. Cada una con lo que puede necesitar comprar y su fuente.', B),
        ('', B),
        ('Cómo usarlo en 10 minutos', BB),
        ('1. En la pestaña «Las inversiones», filtra la columna «Familia de compra» por lo que vendes '
         '(o mira directamente la pestaña «Por lo que vendes»).', B),
        ('2. Filtra por comunidad o provincia para quedarte con las que te pillan cerca.', B),
        ('3. Quédate con 5. Abre su fuente, comprueba la inversión y busca dentro el papel de la columna '
         '«A quién buscar dentro». Apunta en las dos últimas columnas si te encaja y tu próximo paso.', B),
        ('', B),
        ('De dónde sale', BB),
        ((f'Del aviso semanal de inversiones de la newsletter de Neety ({periodo}), antes de que entren en el Radar del mes. '
          if semanal else f'De la edición de {nombre_mes} del Radar de Neety (neety.com/radar/{region}/{mes}). ')
         + f'{oficiales} de las {len(filas)} salen de boletines oficiales y el resto, de prensa. '
         'Cada fila lleva el enlace a su fuente.', B),
        ('«Familia de compra» y «A quién buscar dentro» son una clasificación nuestra del texto «Qué puede necesitar», '
         'con la guía de quién decide la compra en una empresa industrial. Son orientativas: lo que no encaja claro va en «Varios».', B),
        ('El importe solo aparece cuando lo da la fuente.', B),
        ('', B),
        (('¿Te interesa alguna? Responde «quiero esta» al correo y te decimos a quién escribir dentro.', B)
         if semanal else
         ('Si quieres ver estas señales cada día, filtradas por lo que vendes y con la persona a la que escribir, '
          'reserva media hora con el equipo: neety.com/solicitar-demo', B)),
    ]
    for i, (t, f) in enumerate(lineas, start=2):
        c = ws.cell(row=i, column=2, value=t)
        c.font, c.alignment = f, WRAP
        ws.row_dimensions[i].height = 26 if f is T else (34 if len(t) > 100 else 18)

    # 2 · Las inversiones
    wi = wb.create_sheet('Las inversiones')
    cols = [('Empresa', 30), ('Sector', 20), ('Comunidad', 18), ('Provincia', 14), ('Municipio', 18),
            ('Tipo de señal', 20), ('La señal', 50), ('Importe (M€, si lo da la fuente)', 14),
            ('Qué puede necesitar comprar', 44), ('Familia de compra', 30), ('A quién buscar dentro', 32),
            ('Fecha', 11), ('Tipo de fuente', 14), ('Fuente', 34), ('¿Me encaja?', 12), ('Próximo paso', 26)]
    cabecera(wi, cols)
    por_familia = defaultdict(list)
    for r, f in enumerate(filas, start=2):
        prov = rc.provincia(f['ubicacion'])
        muni = re.sub(r'\s*\([^)]*\)\s*$', '', f['ubicacion']).strip()
        tipo, _, que = f['senal'].partition(' — ')
        fs = familias(f['necesita'])
        for fam in fs:
            por_familia[fam].append(f)
        imp = rc.importe(f['senal'])
        vals = [f['empresa'], f['sector'], rc.CCAA.get(prov, prov), prov, muni, tipo.strip(), (que or tipo).strip(),
                imp if imp else None, f['necesita'], ' · '.join(fs), quien(fs), f['fecha'],
                'Boletín oficial' if rc.OFICIAL.search(f['fuente']) else 'Prensa', f['fuente'], None, None]
        for j, v in enumerate(vals, start=1):
            c = wi.cell(row=r, column=j, value=v)
            c.font, c.alignment, c.border = B, WRAP, BOX
            if r % 2 == 0:
                c.fill = FILL_S
        if f['url']:
            c = wi.cell(row=r, column=14)
            c.hyperlink, c.font = f['url'], LINK
        wi.cell(row=r, column=8).number_format = '#,##0.0'
    ultima = len(filas) + 1
    wi.auto_filter.ref = f'A1:{get_column_letter(len(cols))}{ultima}'
    dv = DataValidation(type='list', formula1='"Sí,No,Quizá"', allow_blank=True)
    wi.add_data_validation(dv)
    dv.add(f'O2:O{ultima}')

    # 3 · Por lo que vendes
    wv = wb.create_sheet('Por lo que vendes')
    wv.sheet_view.showGridLines = False
    for j, w in enumerate([30, 22, 20, 50, 34], start=1):
        wv.column_dimensions[get_column_letter(j)].width = w
    fila = 1
    orden = [f for f, _, _ in FAMILIAS] + [VARIOS]
    for fam in orden:
        lista = por_familia.get(fam)
        if not lista:
            continue
        papel = next((p for f, _, p in FAMILIAS if f == fam), 'Dirección general o de planta')
        c = wv.cell(row=fila, column=1, value=f'Si vendes {fam.lower()}: {len(lista)} empresas')
        c.font = BB
        wv.cell(row=fila + 1, column=1, value=f'A quién buscar dentro: {papel}').font = B
        fila += 2
        for j, n in enumerate(['Empresa', 'Ubicación', 'Tipo de señal', 'Qué puede necesitar comprar', 'Fuente'], start=1):
            c = wv.cell(row=fila, column=j, value=n)
            c.font, c.fill, c.border = H, FILL_H, BOX
        fila += 1
        for f in lista:
            tipo = f['senal'].split(' — ')[0]
            for j, v in enumerate([f['empresa'], f['ubicacion'], tipo, f['necesita'], f['fuente']], start=1):
                c = wv.cell(row=fila, column=j, value=v)
                c.font, c.alignment, c.border = B, WRAP, BOX
            if f['url']:
                c = wv.cell(row=fila, column=5)
                c.hyperlink, c.font = f['url'], LINK
            fila += 1
        fila += 1

    # 4 · Quién decide
    wq = wb.create_sheet('Quién decide')
    wq.sheet_view.showGridLines = False
    for j, w in enumerate([34, 40, 30, 32, 26], start=1):
        wq.column_dimensions[get_column_letter(j)].width = w
    for i, row in enumerate(QUIEN_DECIDE, start=1):
        for j, v in enumerate(row, start=1):
            c = wq.cell(row=i, column=j, value=v)
            c.border, c.alignment = BOX, WRAP
            if i == 1:
                c.font, c.fill = H, FILL_H
            else:
                c.font = BB if j == 1 else B
                if i % 2 == 0:
                    c.fill = FILL_S
    n = len(QUIEN_DECIDE) + 2
    wq.cell(row=n, column=1, value='De la guía «Cómo encontrar a quien decide la compra en una empresa industrial»: '
            'neety.com/guias/quien-decide-compra-empresa-industrial').font = B

    wb.properties.creator = 'Neety'
    wb.properties.title = (f'Inversiones industriales · {fm["semana"]} · {periodo}' if semanal
                           else f'Radar de inversiones industriales · {nombre_mes} {anio}')
    wb.save(sys.argv[2])
    cuenta = Counter(fam for f in filas for fam in familias(f['necesita']))
    print(f'{len(filas)} inversiones, {oficiales} de boletines oficiales')
    for fam in orden:
        if cuenta.get(fam):
            print(f'  {fam}: {cuenta[fam]}')


if __name__ == '__main__':
    main()
