# -*- coding: utf-8 -*-
"""Pruebas del estilo de la newsletter en montar-correo-brevo.py.

Estilo C (27/11/2026, elegido por Iker entre tres): Kaixito no va grande en medio del correo, va
pequeño (56 px, redondo) junto a la firma «Iker Galarza / Cofundador de Neety».

Uso: python3 scripts/test-montar-correo.py
"""
import os
import re
import subprocess
import sys

AQUI = os.path.dirname(os.path.abspath(__file__))
MONTAR = os.path.join(AQUI, 'montar-correo-brevo.py')
EJEMPLO = os.path.join(AQUI, 'fixtures', 'correo-ejemplo.txt')
GIF = 'https://img.mailinblue.com/11927007/images/content_library/original/6a8722b7e5f747179059068e.gif'


def montar(texto=None):
    ruta = EJEMPLO
    if texto is not None:
        ruta = os.path.join(AQUI, 'fixtures', '_tmp-correo.txt')
        open(ruta, 'w', encoding='utf-8').write(texto)
    r = subprocess.run([sys.executable, MONTAR, ruta, '--gif', GIF, '--alt', 'Kaixito'], capture_output=True, text=True)
    if texto is not None:
        os.remove(ruta)
    assert r.returncode == 0, r.stderr
    return r.stdout


def test_kaixito_en_la_firma_y_no_en_medio():
    html = montar()
    assert 'width="280"' not in html, 'el GIF grande sigue en medio del correo'
    imgs = re.findall(r'<img [^>]*>', html)
    assert len(imgs) == 1, imgs
    assert 'width="56"' in imgs[0] and 'border-radius:50%' in imgs[0], imgs[0]
    firma = html.index('Iker Galarza')
    assert html.index(GIF) < firma < html.index('Cofundador de Neety'), 'el avatar va justo antes del nombre'
    assert html.index('Lo leo yo.') < html.index(GIF), 'el avatar va al final, no en medio'
    assert 'Iker Galarza, cofundador de Neety' not in html


def test_sin_firma_el_avatar_va_al_final():
    html = montar('REMITENTE: Iker\nASUNTO: hola\nPREVIEW: prueba corta.\n\nHola.\n\n[GIF regalo]\n\nAdiós.\n')
    assert html.index('Adiós.') < html.index(GIF)
    assert 'width="56"' in html


if __name__ == '__main__':
    fallos = 0
    for nombre, f in list(globals().items()):
        if nombre.startswith('test_') and callable(f):
            try:
                f(); print(f'OK   {nombre}')
            except Exception as e:  # noqa: BLE001
                fallos += 1; print(f'FALLA {nombre}: {type(e).__name__}: {e}')
    print(f'{fallos} fallos')
    sys.exit(1 if fallos else 0)
