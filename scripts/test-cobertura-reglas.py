# -*- coding: utf-8 -*-
"""Cada regla dura de las recetas tiene un dueño, o este test falla.

    python scripts/test-cobertura-reglas.py

Por que existe (auditoria del 2026-10-28): un gancho sin una palabra que parase el scroll
paso diez validaciones en verde. La regla (global §2.9) estaba escrita, y global §8 la
listaba en "lo que el script NO puede ver, esto lo miras tu"; nada obligaba a mirarla.
Contadas ese dia: 139 reglas duras (titulo con ⛔, CANÓNICO o GLOBAL) en las cuatro recetas
del texto del post, y 63 sin nada que las comprobase a la vista.

Una regla tiene dueño si se cumple una de estas:
  1. su id (p. ej. 4.4b-CONTEXTO) sale en validar-post.py;
  2. su seccion dice que esta mecanizada o que se contesta en --criterio;
  3. tiene una linea en scripts/cobertura-reglas.txt, y esa linea apunta a algo que existe:
     "check: <trozo del nombre>" que salga en validar-post.py, "criterio: <clave>" que este
     en CRITERIO, "fuera: <motivo>" o "pendiente: <que falta>".

Falla si hay una regla dura sin dueño (una regla nueva escrita sin decir quien la mira) o si
el registro apunta a un check o una clave que no existen. Los "pendiente" no fallan: se
imprimen, para que la lista se vea y baje.
"""
import datetime as dt
import io
import os
import re
import sys
import unicodedata

RAIZ = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
RECETAS = ['global-instructions', 'brand-voice', 'post-workflow', 'working-preferences']
DURA = re.compile(r'⛔|CANÓNICO|— GLOBAL|GLOBAL,')


def ascii_(s):
    return unicodedata.normalize('NFKD', s).encode('ascii', 'ignore').decode()


def clave(titulo):
    t = re.sub(r'[^A-Za-z0-9 .\-]', '', ascii_(titulo)).strip()
    return re.sub(r'\s+', ' ', t)[:48].strip()


def main():
    val = io.open(os.path.join(RAIZ, 'scripts', 'validar-post.py'), encoding='utf-8').read()
    val_n = ascii_(val).lower()
    claves_criterio = set(re.findall(r"^\s*\('(\w+)', '", val[val.index('CRITERIO = ['):], re.M))
    registro = {}
    for l in io.open(os.path.join(RAIZ, 'scripts', 'cobertura-reglas.txt'), encoding='utf-8'):
        if l.startswith('#') or not l.strip():
            continue
        f, t, dueno = [x.strip() for x in l.split('|', 2)]
        registro[(f, t)] = dueno

    fallos, pendientes, usadas, todas = [], [], set(), set()
    for f in RECETAS:
        lineas = io.open(os.path.join(RAIZ, 'docs', 'skills', f + '.md'), encoding='utf-8').read().splitlines()
        cab = [(i, re.match(r'^\s*>?\s*#{2,6}\s+(.*)', l)) for i, l in enumerate(lineas)]
        cab = [(i, m.group(1)) for i, m in cab if m]
        for k, (i, titulo) in enumerate(cab):
            if not DURA.search(titulo):
                continue
            todas.add((f, clave(titulo)))
            fin = cab[k + 1][0] if k + 1 < len(cab) else len(lineas)
            cuerpo = ascii_('\n'.join(lineas[i:fin])).lower()
            ids = re.findall(r'(\d+(?:\.\d+)*[a-z]?(?:-[A-ZÁÉÍÓÚÑ0-9]+)+)\s*·', titulo)
            if any(re.search(r'(?<![\w.])' + re.escape(ascii_(x).lower()) + r'(?![\w])', val_n) for x in ids):
                continue
            if 'mecanizad' in cuerpo or '--criterio' in cuerpo:
                continue
            reg = (f, clave(titulo))
            if reg not in registro:
                fallos.append(f'{f}:{i + 1} SIN DUEÑO · {titulo[:90]}')
                continue
            usadas.add(reg)
            tipo, _, que = registro[reg].partition(':')
            que = que.strip()
            # 28/10: "todo lo que esta en las recetas se tiene en cuenta; si no, se borra". Un
            # pendiente lleva fecha y caduca a los 14 dias: o tiene dueño o sale de la receta.
            _fecha = re.match(r'pendiente\((\d{4}-\d{2}-\d{2})\)', tipo)
            if tipo.startswith('pendiente'):
                if not _fecha:
                    fallos.append(f'{f}:{i + 1} pendiente sin fecha: pendiente(AAAA-MM-DD)')
                elif (dt.date.today() - dt.date.fromisoformat(_fecha.group(1))).days > 14:
                    fallos.append(f'{f}:{i + 1} pendiente CADUCADO (desde {_fecha.group(1)}): '
                                  f'dale dueño o borra la regla de la receta · {que}')
                tipo = 'pendiente'
            if tipo == 'check' and ascii_(que).lower() not in val_n:
                fallos.append(f'{f}:{i + 1} el check "{que}" no existe en validar-post.py')
            elif tipo == 'criterio' and que not in claves_criterio:
                fallos.append(f'{f}:{i + 1} la clave de criterio "{que}" no existe')
            elif tipo == 'pendiente':
                pendientes.append(f'{f}:{i + 1} · {que}')
            elif tipo not in ('check', 'criterio', 'fuera', 'pendiente'):
                fallos.append(f'{f}:{i + 1} dueño desconocido: {registro[reg]}')
    for reg in set(registro) - todas:
        fallos.append(f'registro sin regla (se movió o se renombró): {reg[0]} | {reg[1]}')

    for p in pendientes:
        print('  PENDIENTE', p)
    for x in fallos:
        print('  ⛔', x)
    print(f'\n  {len(fallos)} fallo(s) · {len(pendientes)} pendiente(s)')
    sys.exit(1 if fallos else 0)


if __name__ == '__main__':
    main()
