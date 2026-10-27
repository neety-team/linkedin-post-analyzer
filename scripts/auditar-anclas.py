# -*- coding: utf-8 -*-
"""Rendimiento de cada PERSPECTIVA del ancla de ventas en el gancho (global §2.3-PERSPECTIVAS).

    python scripts/auditar-anclas.py                # sin peloteo, desde el 01/05
    python scripts/auditar-anclas.py --desde 2026-09-01 --cuenta asier
    python scripts/auditar-anclas.py --peloteo      # solo peloteos

Saca, por perspectiva: posts, mediana de impresiones, mediana de clics por cada
1.000 impresiones (solo posts con enlace) y cuantos van en el ultimo mes. Despues,
los ultimos ganchos de cada cuenta con su perspectiva, para rotar antes de escribir
el siguiente. Los inscritos de Luma no estan en la BD: se cruzan a mano con el CSV.
Se corre cada lunes en el paso 0 (registro de A/B del historial).
"""
import argparse
import datetime
import io
import os
import statistics as st
import sys

import requests

from anclas_ventas import PERSPECTIVAS, perspectivas

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

BASE = 'https://linkedin-post-analyzer-production.up.railway.app'
CUENTAS = {'iker': '3d545376-057c-48db-8b45-c5c5510110bb',
           'unai': '88d272b7-0f93-49cf-bac1-1334965f361d',
           'asier': '89610120-758c-4d25-8353-76c1147e0f0c'}


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--desde', default='2026-05-01')
    ap.add_argument('--cuenta', choices=list(CUENTAS))
    ap.add_argument('--peloteo', action='store_true', help='solo peloteos (por defecto se excluyen)')
    ap.add_argument('--ultimos', type=int, default=5)
    a = ap.parse_args()
    auth = (os.environ['APP_BASIC_USER'], os.environ['APP_BASIC_PASS'])

    filas = []
    for nombre, cid in CUENTAS.items():
        if a.cuenta and a.cuenta != nombre:
            continue
        posts = requests.get(f'{BASE}/api/creators/{cid}/posts?limit=300', auth=auth, timeout=120).json()['posts']
        vistos = set()
        for p in posts:
            dia = str(p['published_at'])[:10]
            pil = p['pillar'] or ''
            gancho = (p['hook_text'] or (p['content_text'] or '').split('\n')[0] or '').strip()
            if dia < a.desde or ('peloteo' in pil) != a.peloteo:
                continue
            # la BD guarda a veces el mismo post dos veces (republicado o capado): uno por gancho y dia
            if (dia, gancho.lower()) in vistos:
                continue
            vistos.add((dia, gancho.lower()))
            filas.append(dict(cuenta=nombre, dia=dia, pilar=pil, imp=p['impressions_count'] or 0,
                              clics=p['link_clicks_count'] or 0, enlace=bool(p['link_url']),
                              gancho=gancho, persp=perspectivas(gancho)))

    med = lambda xs: int(st.median(xs)) if xs else 0
    hace_mes = (datetime.date.today() - datetime.timedelta(days=30)).isoformat()
    print(f'{len(filas)} posts · desde {a.desde} · {"solo peloteo" if a.peloteo else "sin peloteo"}'
          f' · mediana de impresiones {med([f["imp"] for f in filas])}\n')
    print(f'{"perspectiva":58} {"n":>4} {"imp med":>8} {"clics/1000":>11} {"ult. 30 d":>10}')
    for clave, etiqueta, _ in PERSPECTIVAS:
        s = [f for f in filas if clave in f['persp']]
        con = [1000 * f['clics'] / f['imp'] for f in s if f['enlace'] and f['imp']]
        cpm = f'{st.median(con):.2f}' if con else '-'
        print(f'{etiqueta:58} {len(s):>4} {med([f["imp"] for f in s]):>8} {cpm:>11} '
              f'{sum(1 for f in s if f["dia"] >= hace_mes):>10}')
    sin = [f for f in filas if not f['persp']]
    print(f'{"(sin ancla de ventas reconocida)":58} {len(sin):>4} {med([f["imp"] for f in sin]):>8}')

    print(f'\nULTIMOS {a.ultimos} GANCHOS POR CUENTA (rota: no repitas la perspectiva de los 2 ultimos si otra encaja)')
    for nombre in CUENTAS:
        if a.cuenta and a.cuenta != nombre:
            continue
        ult = sorted([f for f in filas if f['cuenta'] == nombre], key=lambda f: f['dia'], reverse=True)[:a.ultimos]
        print(f'\n  {nombre}')
        for f in ult:
            print(f'    {f["dia"]} {f["imp"]:>7} {",".join(f["persp"]) or "-":24} {f["gancho"][:70]}')
    print('\n⚠️ Familias solapadas y n pequeño: dice por donde mirar, no cierra un A/B. Alcance sin conversion no gana.')


if __name__ == '__main__':
    main()
