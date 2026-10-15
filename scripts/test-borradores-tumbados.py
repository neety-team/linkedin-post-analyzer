#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""Regresion INVERSA del validador: borradores que Iker TUMBO, y el check que los tiene que cazar.

POR QUE EXISTE (2026-10-15). test-validador.py comprueba que ningun GANADOR falle por un
bug. Faltaba la otra mitad: que los borradores MALOS fallen. El 15/10 el validador dio
69/69 a ganchos de Unai que contaban la confesion entera ("nos confeso que le pidio a su
jefe licencias de otra empresa"): la regla del bucle abierto (global §2.0) estaba escrita
como un aviso fijo que salia siempre, no miraba el texto y no podia fallar.

Cada caso: un borrador real tumbado, el motivo de Iker y el nombre (o un trozo) del check
que DEBE salir en FALLA. Si un caso pasa en verde, el validador tiene un agujero.

USO:  python scripts/test-borradores-tumbados.py
"""
import io
import os
import subprocess
import sys
import tempfile

AQUI = os.path.dirname(os.path.abspath(__file__))

# Cuerpo de la historia de Unai del 15/10 (version aprobada), al que se le pega cada gancho.
CUERPO = """Contestó con la acreditación colgada.

Su empresa vive de la inteligencia artificial.
Y aun así buscaba clientes con filtros.

Como casi cualquier comercial.

No quería más filtros.
Quería decir de cada empresa si le sirve o no.
Y que con cada descarte la siguiente llegara mejor elegida.

Él no les ve los días contados.

Los ve más en la calle que en la oficina.
Con un audio al salir de cada visita, no con fichas.

Por eso su respuesta nos pesó tanto.

El miércoles 28 damos una sesión gratis por videollamada.

Un filtro no le dice al comercial quién firma dentro.
Ese nombre de dentro sí te lo enseñamos: https://luma.com/7hhyx07z?utm_source=historia-entrevista-15oct-unai&utm_medium=post&utm_campaign=historia-entrevista-15oct&utm_content=unai

Es @Telmo E. de @Multiverse Computing y nos lo contó en el evento Neety Forward.

Y le escribió a su jefe para probarnos con su equipo.

Lo que tiene los días contados es el filtro."""

FLAGS = ['--pilar', 'historia', '--cuenta', 'unai', '--historia-evento']

# (texto entero, motivo de Iker, trozo del nombre del check que DEBE fallar)
CASOS = [
    ('Vende inteligencia artificial y nos confesó que le pidió a su jefe licencias de otra empresa 👀\n\n' + CUERPO,
     '15/10: "me estas revelando la confesion, para que me voy a leer la publicacion"',
     'el gancho no CUENTA la respuesta'),
    ('Hasta quien vende IA nos confesó que busca clientes como cualquier comercial 👀\n\n' + CUERPO,
     '15/10: "ya me estas otra vez revelando la confesion"',
     'el gancho no CUENTA la respuesta'),
    ('Más que los aplausos, nos quedamos con lo que un ponente de ventas le escribió a su jefe 👀\n\n' + CUERPO,
     '15/10: "si dices nuestra mesa redonda, nuestro evento o nuestro ponente, ya la estamos fastidiando"',
     'el gancho no delata el EVENTO'),
    ('Le preguntamos a quien vende IA si los comerciales tienen los días contados 👀\n\n'
     + CUERPO.replace('Es @Telmo E. de @Multiverse Computing y nos lo contó en el evento Neety Forward.',
                      'Es @Telmo E. de @Multiverse Computing y nos lo contó en Neety Forward.'),
     '15/10: "estamos dando por hecho que Neety Forward lo conoce la gente"',
     'Neety Forward va con su categoria'),
    ('Le preguntamos a quien vende IA si los comerciales tienen los días contados 👀\n\n'
     + CUERPO.replace('\n\nLo que tiene los días contados es el filtro.', '')
             .replace('Y le escribió a su jefe para probarnos con su equipo.',
                      'Y le escribió a su jefe para probarnos con su equipo.\n\nNos lo contó en el evento Neety Forward, cuando enseñamos la herramienta nueva.'),
     '15/10: "no puede ser que la ultima linea sea la de desvelar el nombre del evento"',
     'la ultima linea es la moraleja'),
    ('Le preguntamos a quien vende IA si los comerciales tienen los días contados 👀\n\n'
     + CUERPO.replace('por videollamada', 'online'),
     '15/10: "online, yo quiero evitar siempre esos anglicismos"',
     'Sin anglicismos'),
]


def main() -> int:
    agujeros = 0
    for texto, motivo, debe in CASOS:
        with tempfile.NamedTemporaryFile('w', suffix='.txt', delete=False, encoding='utf-8') as f:
            f.write(texto)
            ruta = f.name
        out = subprocess.run([sys.executable, os.path.join(AQUI, 'validar-post.py'), ruta] + FLAGS,
                             capture_output=True, text=True, encoding='utf-8').stdout or ''
        os.unlink(ruta)
        cazado = any(l.startswith('  FALLA') and debe.lower() in l.lower() for l in out.splitlines())
        print(('OK      ' if cazado else 'AGUJERO ') + texto.split('\n')[0][:70])
        if not cazado:
            agujeros += 1
            print('        no salio FALLA en "%s" · %s' % (debe, motivo))
    print('\n%s' % ('✅ el validador caza los %d borradores tumbados' % len(CASOS) if not agujeros
                    else '❌ %d de %d borradores tumbados pasan en verde' % (agujeros, len(CASOS))))
    return 1 if agujeros else 0


if __name__ == '__main__':
    for _f in (sys.stdout, sys.stderr):
        if hasattr(_f, 'reconfigure'):
            _f.reconfigure(encoding='utf-8', errors='replace')
    sys.exit(main())
