# -*- coding: utf-8 -*-
"""Pruebas del aviso semanal de inversiones (montar-aviso-semanal.py) y de la semana en radar-excel.py.

Nacen del diseño del 26/11/2026 (docs/superpowers/specs/2026-11-26-newsletter-inversiones-design.md):
el correo semanal lleva de 5 a 8 inversiones con fuente y fecha dentro de la semana, la línea fija de
«quiero esta» y ningún enlace a la reunión. Una semana con menos de 5 no sale.

Uso: python3 scripts/test-aviso-semanal.py
"""
import importlib.util
import os
import subprocess
import sys
import tempfile

from openpyxl import load_workbook

AQUI = os.path.dirname(os.path.abspath(__file__))
FIXTURE = os.path.join(AQUI, 'fixtures', 'semana-ejemplo.md')
LINEA_FIJA = '¿Te interesa alguna? Respóndeme «quiero esta» y te digo a quién escribir dentro.'
EXCEL = 'https://neety.com/para-ti/inversiones-2026-W45'
GIF = 'https://neety.com/email/kaixito-lupa.gif'
ALT = 'Kaixito con una lupa'

_s = importlib.util.spec_from_file_location('aviso', os.path.join(AQUI, 'montar-aviso-semanal.py'))
av = importlib.util.module_from_spec(_s)
_s.loader.exec_module(av)


def fila(empresa, senal, fecha='2026-11-04'):
    return dict(empresa=empresa, sector='Metal', ubicacion='Ibi (Alicante)', senal=senal,
                necesita='Maquinaria', fecha=fecha, fuente='BOE', url='https://www.boe.es/x')


def test_descarta_sin_fuente_y_fuera_de_semana():
    fm, _t, filas = av.rc.leer(FIXTURE)
    validas, descartadas = av.filas_validas(fm, filas)
    assert len(validas) == 7, len(validas)
    motivos = {d['empresa'].split(' (')[0]: d['motivo'] for d in descartadas}
    assert motivos == {'Perfiles Murcia': 'sin fuente', 'Repsol': 'fecha fuera de la semana'}, motivos


def test_elige_entre_5_y_8():
    fm, _t, filas = av.rc.leer(FIXTURE)
    validas, _ = av.filas_validas(fm, filas)
    assert len(av.elegir(validas)) == 7
    diez = [fila(f'E{i}', f'Línea nueva — {i} M€') for i in range(1, 11)]
    ocho = av.elegir(diez)
    assert [f['empresa'] for f in ocho] == [f'E{i}' for i in range(10, 2, -1)], [f['empresa'] for f in ocho]
    try:
        av.elegir(diez[:4])
    except SystemExit as e:
        assert 'menos de 5 inversiones válidas' in str(e), e
    else:
        raise AssertionError('con 4 inversiones tenía que negarse')


def test_empate_de_importe_por_fecha_mas_reciente():
    filas = [fila('Vieja', 'Planta nueva', '2026-11-02'), fila('Nueva', 'Planta nueva', '2026-11-06')] + \
            [fila(f'X{i}', 'Planta nueva', '2026-11-03') for i in range(3)]
    assert av.elegir(filas)[0]['empresa'] == 'Nueva'


def html_del_fixture():
    r = subprocess.run([sys.executable, os.path.join(AQUI, 'montar-aviso-semanal.py'), FIXTURE,
                        '--excel', EXCEL, '--gif', GIF, '--alt', ALT], capture_output=True, text=True)
    assert r.returncode == 0, r.stderr
    return r.stdout, r.stderr


def test_html():
    html, err = html_del_fixture()
    assert LINEA_FIJA in html
    fm, _t, filas = av.rc.leer(FIXTURE)
    for f in av.elegir(av.filas_validas(fm, filas)[0]):
        assert av.H.escape(f['empresa']) in html, f['empresa']
        assert av.H.escape(f['url']) in html, f['url']
    assert html.count('utm_campaign=inversiones-2026-W45') >= 8, html.count('utm_campaign=inversiones-2026-W45')
    assert 'utm_source=brevo&amp;utm_medium=email' in html
    assert av.H.escape(EXCEL) in html
    assert f'src="{GIF}"' in html and f'alt="{ALT}"' in html
    assert 'solicitar-demo' not in html
    assert 'Perfiles Murcia' not in html and 'Repsol' not in html
    assert 'ASUNTO A:' in err and 'ASUNTO B:' in err and 'PREVIEW:' in err
    assert 'DESCARTADA' in err and 'Repsol' in err


def test_semana_floja_sale_con_error():
    with tempfile.NamedTemporaryFile('w', suffix='.md', delete=False, encoding='utf-8') as t:
        lineas = open(FIXTURE, encoding='utf-8').read().splitlines()
        tabla = [l for l in lineas if l.startswith('| ') and not l.startswith('| Empresa')]
        resto = [l for l in lineas if l not in tabla[4:]]
        t.write('\n'.join(resto) + '\n')
    r = subprocess.run([sys.executable, os.path.join(AQUI, 'montar-aviso-semanal.py'), t.name,
                        '--excel', EXCEL, '--gif', GIF, '--alt', ALT], capture_output=True, text=True)
    os.unlink(t.name)
    assert r.returncode != 0 and 'menos de 5 inversiones válidas' in r.stderr, r.stderr
    assert r.stdout == ''


def test_excel_semana():
    with tempfile.TemporaryDirectory() as d:
        salida = os.path.join(d, 'semana.xlsx')
        r = subprocess.run([sys.executable, os.path.join(AQUI, 'radar-excel.py'), FIXTURE, salida],
                           capture_output=True, text=True)
        assert r.returncode == 0, r.stderr
        wb = load_workbook(salida)
        datos = [row for row in wb['Las inversiones'].iter_rows(min_row=2, values_only=True) if row[0]]
        assert len(datos) == 7, len(datos)
        texto = ' '.join(str(c.value) for c in wb['Cómo usarlo']['B'] if c.value)
        assert 'semana del 02/11 al 08/11' in texto, texto[:300]


if __name__ == '__main__':
    fallos = 0
    for nombre, f in list(globals().items()):
        if nombre.startswith('test_') and callable(f):
            try:
                f()
                print(f'OK   {nombre}')
            except Exception as e:  # noqa: BLE001
                fallos += 1
                print(f'FALLA {nombre}: {type(e).__name__}: {e}')
    print(f'{fallos} fallos')
    sys.exit(1 if fallos else 0)
