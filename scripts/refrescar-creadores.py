"""Actualiza TODOS los creadores de la herramienta: lo mismo que el botón
"Actualizar todos" del Panel, pero desde aquí.

Por qué existe (Iker, 2026-10-23): la base llevaba sin actualizarse desde el
28/09 y nadie lo vio hasta que el segundo jefe entró al Panel. Las búsquedas de
referencias (memes, lead magnets, historias) y el Explorador tiran de esta base:
si no se refresca, se buscan outliers de hace un mes. Va en la revisión de CADA
lunes (`historial-publicaciones`, auditoría fija).

Uso:  python scripts/refrescar-creadores.py            # todos
      python scripts/refrescar-creadores.py --viejos 7 # solo los no actualizados en 7 días

Basic Auth con APP_BASIC_USER / APP_BASIC_PASS del entorno, como el resto de
scripts. Concurrencia 3, igual que el Panel: más tropieza con el límite de
Unipile.
"""
import argparse
import base64
import concurrent.futures as cf
import datetime as dt
import json
import os
import sys
import urllib.request

BASE = 'https://linkedin-post-analyzer-production.up.railway.app'


def _req(path, method='GET', timeout=600):
    tok = base64.b64encode(f"{os.environ['APP_BASIC_USER']}:{os.environ['APP_BASIC_PASS']}".encode()).decode()
    r = urllib.request.Request(BASE + path, method=method, headers={'Authorization': 'Basic ' + tok})
    with urllib.request.urlopen(r, timeout=timeout) as resp:
        body = resp.read()
        return resp.status, (json.loads(body) if body else None)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--viejos', type=int, default=0, help='solo los no actualizados en N días (0 = todos)')
    a = ap.parse_args()
    _, creadores = _req('/api/creators')
    ahora = dt.datetime.now(dt.timezone.utc)

    def viejo(c):
        if not a.viejos:
            return True
        t = c.get('last_scraped_at')
        if not t:
            return True
        return (ahora - dt.datetime.fromisoformat(t.replace('Z', '+00:00'))).days >= a.viejos

    lista = [c for c in creadores if viejo(c)]
    mas_viejo = min((c.get('last_scraped_at') or '0000') for c in creadores)
    print(f'{len(creadores)} creadores · a actualizar: {len(lista)} · el más antiguo: {mas_viejo[:10]}', flush=True)

    errores = []

    def uno(c):
        try:
            s, _ = _req(f"/api/creators/{c['id']}/refresh", method='POST')
            return c, s < 300
        except Exception as e:  # noqa: BLE001 — se cuenta y se sigue, como el Panel
            return c, False

    hechos = 0
    with cf.ThreadPoolExecutor(max_workers=3) as ex:
        for c, ok in ex.map(uno, lista):
            hechos += 1
            if not ok:
                errores.append(c.get('name') or c['id'])
            if hechos % 10 == 0 or hechos == len(lista):
                print(f'  {hechos}/{len(lista)} · errores {len(errores)}', flush=True)

    print(f'✅ Hecho: {len(lista) - len(errores)}/{len(lista)} actualizados')
    if errores:
        print('❌ Con error:', ', '.join(errores[:20]))
    return 1 if errores and len(errores) == len(lista) else 0


if __name__ == '__main__':
    sys.exit(main())
