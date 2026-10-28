# -*- coding: utf-8 -*-
"""Lo que funcionaba y hemos dejado de hacer (y lo que no funciona y hacemos mas).

    python scripts/auditar-derivas.py [--dias 28] [--desde 2026-04-01]

Por que existe (28/10): un gancho tibio paso diez validaciones y, al mirar la BD, se vio que
el concepto que se ve en el gancho (las llaves, enterrado en vida, la caja de herramientas
que engorda) se habia ido perdiendo desde finales de septiembre sin que nadie lo notase. El
validador mira un post; esto mira la serie: compara las ultimas N semanas con todo lo de
antes, para las tres cuentas, y canta dos cosas:
  · DERIVA BUENA PERDIDA: un rasgo que rinde mas (outlier_ratio de la BD, que ya corrige por
    cuenta) y que ahora usamos bastante menos que antes.
  · DERIVA MALA: un rasgo que rinde menos y que ahora usamos mas.
Mezcla pilar, cuenta y semana: dice por donde mirar, no cierra nada. Va en la revision de los
lunes (historial-publicaciones, bloque del lunes).
"""
import argparse
import datetime as dt
import os
import re
import statistics as st
import sys

import requests

BASE = 'https://linkedin-post-analyzer-production.up.railway.app'
CUENTAS = {'iker': '3d545376-057c-48db-8b45-c5c5510110bb',
           'unai': '88d272b7-0f93-49cf-bac1-1334965f361d',
           'asier': '89610120-758c-4d25-8353-76c1147e0f0c'}

# Palabras con imagen o con fuerza que han estado en nuestros ganchos de mas alcance
# (global §2.9-ESCALERA, 28/10). No es una lista para exigir: es para medir si las usamos.
FUERZA = (r'\b(mat\w+|enterr\w+|resucit\w+|engord\w+|desmont\w+|tir[eéoó]\w*|revent\w+|tumb\w+|'
          r'jubil\w+|llaves?|peaje|caja de herramientas|psic[oó]logo|sopa|tenedor|destornillador|'
          r'muert\w+|barco|pelo|factura|cobr\w+|robo|rob\w+|invad\w+|ardi?\w*|caza\w*|'
          r'plant[oó]|portátil|teléfono|excel|carpeta|taco|nariz|coche|barrio|boli)\b')

RASGOS = {
    'gancho: palabra con imagen o fuerza': lambda h, t: bool(re.search(FUERZA, h.lower())),
    'gancho: empieza por Nunca': lambda h, t: h.lower().startswith('nunca'),
    'gancho: lleva cifra': lambda h, t: bool(re.search(r'\d', h)),
    'gancho: en primera persona (me/mi/nos)': lambda h, t: bool(re.search(r'\b(me|mi|mis|nos|nuestr\w+)\b', h.lower())),
    'gancho: pregunta': lambda h, t: '?' in h,
    'gancho: IA o Claude': lambda h, t: bool(re.search(r'\b(ia|claude|chatgpt)\b', h.lower())),
    'gancho: 70 car o menos': lambda h, t: len(h) <= 70,
    'gancho: acaba en 👇': lambda h, t: h.rstrip().endswith('👇'),
    'cuerpo: cita entre comillas': lambda h, t: bool(re.search(r'["“«][^"”»\n]{12,}["”»]', t)),
    'cuerpo: lleva enlace': lambda h, t: 'http' in t or 'lnkd.in' in t,
    'cuerpo: 800 car o menos': lambda h, t: len(t) <= 800,
}


def posts(desde):
    a = (os.environ['APP_BASIC_USER'], os.environ['APP_BASIC_PASS'])
    out = []
    for cuenta, cid in CUENTAS.items():
        off = 0
        while True:
            r = requests.get(f'{BASE}/api/creators/{cid}/posts?limit=100&offset={off}', auth=a, timeout=120).json()
            for p in r['posts']:
                d = (p.get('published_at') or '')[:10]
                ratio = p.get('outlier_ratio')
                if d < desde or ratio in (None, 'None'):
                    continue
                txt = p.get('content_text') or ''
                out.append({'d': d, 'cuenta': cuenta, 'pilar': p.get('pillar') or '',
                            'ratio': float(ratio), 'imp': int(p.get('impressions_count') or 0),
                            'gancho': (p.get('hook_text') or txt.split('\n')[0]).strip(), 'texto': txt,
                            'hook_type': p.get('hook_type') or '', 'tono': p.get('text_tone') or ''})
            off += 100
            if off >= r['total'] or not r['posts']:
                break
    return out


def med(xs):
    return st.median(xs) if xs else 0.0


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--dias', type=int, default=28)
    ap.add_argument('--desde', default='2026-04-01')
    a = ap.parse_args()
    ps = posts(a.desde)
    corte = (dt.date.today() - dt.timedelta(days=a.dias)).isoformat()
    # Los posts de menos de 3 dias aun no tienen su ratio asentado.
    asentado = (dt.date.today() - dt.timedelta(days=3)).isoformat()
    ps = [p for p in ps if p['d'] <= asentado]
    antes = [p for p in ps if p['d'] < corte]
    ahora = [p for p in ps if p['d'] >= corte]
    print(f'\n  {len(ps)} posts asentados desde {a.desde} · antes {len(antes)} · ultimas {a.dias // 7} semanas {len(ahora)}')
    print('  rendimiento = mediana de outlier_ratio (BD, ya corregido por cuenta)\n')

    def fila(nombre, f):
        con = [p['ratio'] for p in ps if f(p)]
        sin = [p['ratio'] for p in ps if not f(p)]
        uso_antes = sum(1 for p in antes if f(p)) / max(1, len(antes))
        uso_ahora = sum(1 for p in ahora if f(p)) / max(1, len(ahora))
        rinde = med(con) / med(sin) if med(sin) else 0
        marca = ''
        if len(con) >= 6 and len(sin) >= 6:
            if rinde >= 1.3 and uso_ahora <= uso_antes * 0.6:
                marca = '⛔ DERIVA: rinde mas y la usamos menos'
            elif rinde <= 0.77 and uso_ahora >= uso_antes * 1.4 and uso_ahora > 0.15:
                marca = '⛔ DERIVA: rinde menos y la usamos mas'
        print(f'  {nombre[:44]:44} con {med(con):5.2f} (n={len(con):3}) sin {med(sin):5.2f} (n={len(sin):3}) · '
              f'x{rinde:4.2f} · uso antes {uso_antes:4.0%} ahora {uso_ahora:4.0%}  {marca}')

    for nombre, f in RASGOS.items():
        fila(nombre, lambda p, f=f: f(p['gancho'], p['texto']))
    print('\n  POR PILAR (cuanto pesa cada uno en lo que publicamos y cuanto rinde)')
    for pil in sorted({p['pilar'] for p in ps}):
        fila('pilar: ' + (pil or 'sin pilar'), lambda p, pil=pil: p['pilar'] == pil)
    print('\n  POR TIPO DE GANCHO (lo asigna la herramienta)')
    for ht in sorted({p['hook_type'] for p in ps}):
        fila('hook_type: ' + (ht or '-'), lambda p, ht=ht: p['hook_type'] == ht)
    print('\n  Mezcla pilar, cuenta y semana: dice por donde mirar, no cierra nada (global §2.9-ESCALERA).\n')


if __name__ == '__main__':
    sys.exit(main())
