"""Auditoria semanal del spam ninja: clics y CTR por DOLOR (global §4.4b-ROTACION).

Uso:  python scripts/auditar-ninjas.py [--dias 60] [--desde 2026-09-25]

Lee de la BD (Basic Auth del entorno) los posts de las 3 cuentas, saca el bloque
del ninja (las dos lineas del enlace), lo clasifica por dolor con las mismas
reglas que validar-post.py y saca una tabla por PILAR y DOLOR: posts, clics,
impresiones y CTR mediano. Es la pieza fija de la revision de los lunes
(historial-publicaciones, cabecera): la conversion manda sobre el alcance.

Se excluyen los posts sin dato de clics y los que llevan enlace pero LinkedIn
no registro la URL (link_url vacio + 0 clics = no medido, global §4.4b-CLICS).
"""
import argparse
import datetime
import importlib.util
import os
import re
import statistics
import sys

AQUI = os.path.dirname(os.path.abspath(__file__))
_spec = importlib.util.spec_from_file_location('vp', os.path.join(AQUI, 'validar-post.py'))
vp = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(vp)


def bajar_posts():
    import base64
    import json
    import urllib.request
    u, pw = os.environ.get('APP_BASIC_USER'), os.environ.get('APP_BASIC_PASS')
    if not (u and pw):
        sys.exit('faltan APP_BASIC_USER/APP_BASIC_PASS en el entorno')
    auth = base64.b64encode(f'{u}:{pw}'.encode()).decode()
    posts = []
    for quien, cid in vp.BD_CREADORES.items():
        req = urllib.request.Request(f'{vp.BD_BASE}/api/creators/{cid}/posts?limit=200',
                                     headers={'Authorization': 'Basic ' + auth})
        with urllib.request.urlopen(req, timeout=30) as resp:
            for x in json.load(resp).get('posts', []):
                x['_cuenta'] = quien
                posts.append(x)
    return posts


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--dias', type=int, default=60)
    ap.add_argument('--desde', help='fecha AAAA-MM-DD; manda sobre --dias')
    a = ap.parse_args()
    hoy = datetime.date.today()
    desde = (datetime.date.fromisoformat(a.desde) if a.desde
             else hoy - datetime.timedelta(days=a.dias))

    filas, excluidos, vistos = [], 0, set()
    for p in bajar_posts():
        f = (p.get('published_at') or '')[:10]
        try:
            fd = datetime.date.fromisoformat(f)
        except ValueError:
            continue
        if fd < desde:
            continue
        nj = vp.ninja_de(p.get('content_text') or '')
        if not nj or (p['_cuenta'], nj) in vistos:
            continue
        clics, imp = p.get('link_clicks_count'), p.get('impressions_count') or 0
        # Resubidas: se queda la de mas impresiones (la que repartio).
        if clics is None or imp < 300 or (not p.get('link_url') and not clics):
            excluidos += 1
            continue
        vistos.add((p['_cuenta'], nj))
        dol = vp.dolores_de(nj)
        filas.append({
            'fecha': f, 'cuenta': p['_cuenta'], 'pilar': p.get('pillar') or '?',
            'dolor': dol[0] if dol else 'sin clasificar', 'clics': clics, 'imp': imp,
            'ctr': 100.0 * clics / imp, 'decide': bool(re.search(r'qui[eé]n decide', nj, re.I)),
            'ninja': nj,
        })

    if not filas:
        sys.exit('no hay posts con ninja medido en la ventana')

    print(f'AUDITORIA DEL NINJA · {desde} a {hoy} · {len(filas)} posts medidos · {excluidos} excluidos (sin medir o <300 imp)\n')
    print('1) POR PILAR Y DOLOR (el CTR solo se compara dentro del mismo pilar)')
    grupos = {}
    for r in filas:
        grupos.setdefault((r['pilar'], r['dolor']), []).append(r)
    for (pil, dol), rs in sorted(grupos.items()):
        ctrs = [r['ctr'] for r in rs]
        print(f'   {pil:<14} {dol:<48} n={len(rs):<2} clics={sum(r["clics"] for r in rs):<4} '
              f'CTR mediano={statistics.median(ctrs):.3f}%' + ('   (n<3: no decide nada)' if len(rs) < 3 else ''))

    print('\n2) POR DOLOR, TODOS LOS PILARES (orientativo: mezcla pilares)')
    dg = {}
    for r in filas:
        dg.setdefault(r['dolor'], []).append(r)
    for dol, rs in sorted(dg.items(), key=lambda kv: -statistics.median(x['ctr'] for x in kv[1])):
        print(f'   {dol:<48} n={len(rs):<2} CTR mediano={statistics.median(x["ctr"] for x in rs):.3f}%')

    rec = sorted(filas, key=lambda r: r['fecha'], reverse=True)[:12]
    print(f'\n3) VARIEDAD: de los ultimos {len(rec)} ninjas, {sum(r["decide"] for r in rec)} dicen "quien decide" '
          f'y el dolor mas repetido es "{max(set(r["dolor"] for r in rec), key=[r["dolor"] for r in rec].count)}"')

    print('\n4) DETALLE (mas reciente arriba)')
    for r in sorted(filas, key=lambda r: r['fecha'], reverse=True):
        print(f'   {r["fecha"]} {r["cuenta"]:<5} {r["pilar"]:<12} {r["ctr"]:.3f}% ({r["clics"]}/{r["imp"]}) '
              f'[{r["dolor"].split(" (")[0]}] {r["ninja"][:90]}')
    print('\nRegla de decision (global §4.4b-ROTACION): un dolor pasa a ser el UNICO prioritario solo con '
          '>=3 posts por dolor DENTRO del mismo pilar y ganando en dos revisiones seguidas.')


if __name__ == '__main__':
    main()
