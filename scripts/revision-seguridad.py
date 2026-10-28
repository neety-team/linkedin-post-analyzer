# -*- coding: utf-8 -*-
"""Revision de seguridad del sistema, cada lunes, antes de analizar la semana.

    python scripts/revision-seguridad.py [--rapida]

Por que existe (28/10): ese dia salieron a la vez cuatro fallos que el sistema no veia solo:
un gancho sin palabra con fuerza (la regla estaba escrita y nadie la exigia), 63 de 139 reglas
duras sin nada que las comprobase, los ganchos de historia alargandose mes a mes (52 -> 80
caracteres) sin que nadie lo dijera, y una correccion del jefe que no paso a la receta hasta
que el la pidio. Lo que no se revisa con un calendario no se revisa. Esto junta todo en una
pasada y se pega en la revision del lunes (historial-publicaciones, bloque del lunes).

Partes:
  1. El validador sigue sano: test-validador (ningun ganador falla), test-borradores-tumbados
     (todo lo tumbado sigue cayendo) y test-cobertura-reglas (toda regla dura tiene dueño y
     ningun pendiente ha caducado).
  2. Derivas: auditar-derivas.py (lo que funcionaba y dejamos, lo que no y hacemos mas).
  3. Reglas nuevas de la semana: cada linea de regla añadida a las recetas en los ultimos 8
     dias lleva su dato o su etiqueta (sin medir, hipotesis, criterio). Una regla sin ninguna
     de las dos es la que puede llevarnos a hacerlo peor sin darnos cuenta.
  4. Ganchos de la semana: lista para repasar la escalera (global §2.9-ESCALERA) y el tope de
     largo (global §2.2c) de lo que se publico.
  5. El primer lunes de cada mes, ademas: las dos auditorias de las recetas (ubicacion y
     contradicciones) con los encargos de scripts/auditoria-recetas-encargos.md.
"""
import argparse
import datetime as dt
import os
import re
import subprocess
import sys

RAIZ = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PY = sys.executable
ENV = dict(os.environ, PYTHONIOENCODING='utf-8')


def correr(args, timeout=600):
    r = subprocess.run([PY] + args, cwd=RAIZ, env=ENV, capture_output=True, text=True,
                       encoding='utf-8', errors='replace', timeout=timeout)
    return r.returncode, (r.stdout or '') + (r.stderr or '')


def titulo(t):
    print('\n' + '=' * 78 + f'\n  {t}\n' + '=' * 78)


def tests(rapida):
    titulo('1 · EL VALIDADOR SIGUE SANO')
    lista = [('cobertura de reglas', ['scripts/test-cobertura-reglas.py'])]
    if not rapida:
        lista = [('ganadores (test-validador)', ['scripts/test-validador.py']),
                 ('borradores tumbados', ['scripts/test-borradores-tumbados.py'])] + lista
    malos = 0
    for nombre, args in lista:
        rc, out = correr(args)
        ult = [l for l in out.strip().splitlines() if l.strip()][-1:] or ['']
        print(f"  {'✅' if rc == 0 else '⛔'} {nombre}: {ult[0].strip()[:110]}")
        if nombre == 'cobertura de reglas':
            for l in out.splitlines():
                if 'PENDIENTE' in l or '⛔' in l:
                    print('     ' + l.strip()[:150])
        malos += rc != 0
    return malos


def derivas():
    titulo('2 · DERIVAS (lo que funcionaba y dejamos; lo que no y hacemos mas)')
    rc, out = correr(['scripts/auditar-derivas.py'])
    marcadas = [l for l in out.splitlines() if 'DERIVA' in l]
    for l in marcadas:
        print('  ' + l.strip()[:150])
    if not marcadas:
        print('  ninguna deriva marcada esta semana')
    print('  (tabla entera: python scripts/auditar-derivas.py)')
    return len(marcadas)


EVIDENCIA = re.compile(r'medid|\bBD\b|\bn ?= ?\d|impresiones|outlier_ratio|\bCTR\b|inscrit|clics|'
                       r'\d+[.,]\d+ (?:de|por)|dato', re.I)
ETIQUETA = re.compile(r'sin medir|hip[oó]tesis|criterio (?:de|suyo|m[ií]o)|patr[oó]n, no ley|n=1|'
                      r'sin validar|en prueba|a/b', re.I)
REGLA = re.compile(r'⛔|CAN[OÓ]NICO|GLOBAL')
DECISION = re.compile(r'\((?:Iker|Mario|Unai|Asier)[^)]*\d{4}-\d{2}-\d{2}\)|\((?:Iker|Mario|Unai|Asier),? \d{1,2}/\d{1,2}\)')
RECETAS = ('global-instructions.md', 'post-workflow.md', 'brand-voice.md', 'working-preferences.md',
           'aboutme.md', 'images.md', 'video.md', 'email-marketing.md', 'lead-magnet-web.md')


def reglas_nuevas():
    titulo('3 · REGLAS DURAS NUEVAS DE LA SEMANA: ¿llevan su dato o su etiqueta?')
    desde = (dt.date.today() - dt.timedelta(days=8)).isoformat()
    r = subprocess.run(['git', 'log', f'--since={desde}', '-p', '--unified=0', '--', 'docs/skills/'],
                       cwd=RAIZ, capture_output=True, text=True, encoding='utf-8', errors='replace')
    sin, decision, fich, vistos = [], [], '', set()
    for l in r.stdout.splitlines():
        if l.startswith('+++ b/'):
            fich = l[6:].split('/')[-1]
            continue
        if not (l.startswith('+') and fich in RECETAS and REGLA.search(l)):
            continue
        l = l[1:].strip()
        if l in vistos or len(l) < 40:
            continue
        vistos.add(l)
        if EVIDENCIA.search(l) or ETIQUETA.search(l):
            continue
        (decision if DECISION.search(l) else sin).append((fich, l))
    for f, l in sin:
        print(f'  ⛔ sin dato ni etiqueta · {f} · {l[:120]}')
    for f, l in decision:
        print(f'  ⚠️  decision sin medir · {f} · {l[:120]}')
    print(f'\n  {len(sin)} regla(s) dura(s) sin dato ni etiqueta y {len(decision)} decision(es) sin medir. '
          'La primera lista se arregla hoy: su dato (BD, informe, n) o su etiqueta (sin medir, hipotesis), '
          'o se borra. La segunda lleva su A/B o su fecha de medida en la ficha del historial: una decision '
          'que no se mide es la que puede llevarnos a hacerlo peor sin verlo.')
    return len(sin)


def ganchos_semana():
    titulo('4 · GANCHOS DE LA SEMANA: repasar la escalera y el largo')
    try:
        import importlib.util
        s = importlib.util.spec_from_file_location('d', os.path.join(RAIZ, 'scripts', 'auditar-derivas.py'))
        d = importlib.util.module_from_spec(s)
        s.loader.exec_module(d)
        desde = (dt.date.today() - dt.timedelta(days=7)).isoformat()
        ps = sorted(d.posts(desde), key=lambda p: p['d'])
    except Exception as e:  # sin BD no se para la revision
        print(f'  no se pudo leer la BD: {e}')
        return 0
    largos = 0
    for p in ps:
        tope = None if p['pilar'].startswith('peloteo') else (70 if p['pilar'] == 'historia' else 75)
        marca = ' ⚠️ pasa del tope' if tope and len(p['gancho']) > tope else ''
        largos += bool(marca)
        print(f"  {p['d']} {p['cuenta']:5} {p['pilar'][:14]:14} {len(p['gancho']):3} car · {p['gancho'][:80]}{marca}")
    print('\n  Para cada uno: ¿que palabra para el scroll y se ve? Escribe su escalera (neutro -> elegido -> '
          'el que se pasa). Si no la tiene, va a la lista de la semana como aprendizaje.')
    return largos


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--rapida', action='store_true', help='sin los tests largos del validador')
    a = ap.parse_args()
    malos = tests(a.rapida)
    nd = derivas()
    nr = reglas_nuevas()
    ng = ganchos_semana()
    titulo('5 · AUDITORIA MENSUAL DE LAS RECETAS')
    hoy = dt.date.today()
    if hoy.day <= 7:
        print('  ⛔ ES EL PRIMER LUNES DEL MES: lanzar las dos auditorias de scripts/auditoria-recetas-encargos.md '
              '(ubicacion y contradicciones) y aplicar lo que salga en el mismo dia.')
    else:
        print('  no toca este lunes (primer lunes de cada mes).')
    titulo('RESUMEN PARA PEGAR EN LA REVISION')
    print(f"  validador {'sano' if not malos else f'⛔ {malos} test(s) en rojo'} · derivas {nd} · "
          f"reglas sin dato ni etiqueta {nr} · ganchos por encima del tope {ng}")
    return 1 if malos else 0


if __name__ == '__main__':
    sys.exit(main())
