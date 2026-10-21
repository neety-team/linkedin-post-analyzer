# -*- coding: utf-8 -*-
"""Comentarios de cada post separados en NUESTROS y DE FUERA (Mario, 2026-10-21).

Por que: en cada post se autocomenta con al menos 3 cuentas (si publica un jefe,
comentan los otros dos y Mario; si publica Mario, los 3 jefes) y a veces algun
companero de Neety. El suelo de ~10 comentarios de una historia es casi todo
nuestro, asi que el motor de un pilar (outliers-database §4.0b-MOTOR) solo se lee
bien contando los de fuera.

NUESTRO = por IDENTIDAD, nunca por grado de red:
  - el autor del post (sus respuestas tambien son suyas),
  - Iker, Unai, Asier y Mario (ids fijos abajo),
  - cualquiera cuyo cargo ACTUAL este en Neety (plantilla de la empresa 88425929
    en LinkedIn, via Unipile) o cuyo titular diga Neety.
⛔ `network_distance` NO vale para esto: depende de la cuenta que mira (el 02/10
de Unai, leido desde la de Iker, saca a Iker como DISTANCE_3 = SELF y a Mario como 1).

Fuente: GET /api/accounts/posts/{id}/comments del backend (lee Unipile en vivo
con la cuenta del dueno). OJO al leerlo: los comentarios vienen en `threads`
y sus respuestas en `threads[].replies`; el total es la suma de los dos y
cuadra con comments_count de la BD. No hay clave `comments`.

Uso:
  python scripts/comentarios-de-fuera.py --post <uuid del post>
  python scripts/comentarios-de-fuera.py --pilar historia --desde 2026-07-25 [--cuenta Unai] [--json salida.json]
  python scripts/comentarios-de-fuera.py --pilar todos --desde 2026-07-25
"""
import sys, os, re, json, time, base64, argparse, statistics, urllib.request, urllib.error
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import unipile_client as uni

if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')

BACKEND = 'https://linkedin-post-analyzer-production.up.railway.app'
CUENTAS = {
    'Iker':  '3d545376-057c-48db-8b45-c5c5510110bb',
    'Unai':  '88d272b7-0f93-49cf-bac1-1334965f361d',
    'Asier': '89610120-758c-4d25-8353-76c1147e0f0c',
}
# provider_id de LinkedIn (los mismos que guarda creators.linkedin_id)
EQUIPO_FIJO = {
    'ACoAAC3Y0xIBY3GmF1Fzh8sTaB5OABfF0GgS7OQ': 'Iker Galarza Rodríguez',
    'ACoAAC1plYYB0s7hWdQYLWEgi_GLPBdDgtwRKeU': 'Unai Arambarri Yeregui',
    'ACoAADg_W2kBoSHWUnJdfHEgMJ50rGYG6MAEkyo': 'Asier Olaizola',
    'ACoAAEaCQAsBHk3K3NiWKjgP9dnRV2tKkfUPLJE': 'Mario Carrillo Ramírez',
}
NEETY_COMPANY_ID = '88425929'
TITULAR_NEETY = re.compile(r'\bneety\b', re.I)


def _backend(path):
    auth = base64.b64encode(('%s:%s' % (os.environ['APP_BASIC_USER'], os.environ['APP_BASIC_PASS'])).encode()).decode()
    r = urllib.request.Request(BACKEND + path, headers={'Authorization': 'Basic ' + auth})
    try:
        with urllib.request.urlopen(r, timeout=180) as f:
            return json.load(f)
    except urllib.error.HTTPError as e:
        return {'_error': e.code, '_body': e.read()[:300].decode('utf8', 'replace')}


def plantilla_neety():
    """provider_id -> nombre de quien tiene hoy un cargo en Neety (todas las paginas)."""
    gente, cursor = {}, None
    for _ in range(20):
        q = '/api/v1/linkedin/search?account_id=%s&limit=50' % uni.A
        if cursor:
            q += '&cursor=' + urllib.parse.quote(cursor)
        r = uni._req('POST', q, {'api': 'classic', 'category': 'people', 'company': [NEETY_COMPANY_ID]})
        if r.get('_error'):
            print('⚠️ plantilla de Neety incompleta (Unipile %s): quedan los fijos y el titular' % r['_error'])
            break
        for p in r.get('items', []):
            if p.get('id'):
                gente[p['id']] = p.get('name') or ''
        cursor = r.get('cursor')
        if not cursor or not r.get('items'):
            break
    return gente


def es_nuestro(autor, autor_post_id, plantilla):
    """Devuelve el motivo si es nuestro ('autor', 'equipo', 'plantilla', 'titular') o None."""
    pid = autor.get('profile_id')
    if pid and pid == autor_post_id:
        return 'autor'
    if pid in EQUIPO_FIJO:
        return 'equipo'
    if pid in plantilla:
        return 'plantilla'
    if TITULAR_NEETY.search(autor.get('headline') or ''):
        return 'titular'
    return None


def contar(post, autor_post_id, plantilla, reintentos=2):
    """{'total', 'nuestros', 'de_fuera', 'fuera_unicos', 'fuera', 'por_titular'} o {'error'}."""
    for i in range(reintentos + 1):
        j = _backend('/api/accounts/posts/%s/comments' % post['id'])
        if j.get('_error'):
            # 404 de Unipile = el post ya no existe en LinkedIn (capado y resubido, o
            # borrado como el Los 10 de Unai del 15/09). Medido el 21/10: los 12 eran eso.
            if 'resource_not_found' in j.get('_body', ''):
                return {'error': 'borrado en LinkedIn'}
            return {'error': '%s %s' % (j['_error'], j.get('_body', '')[:120])}
        threads = j.get('threads') or []
        # Unipile da ceros a ratos: si la BD dice que hay y llega vacio, se repite.
        if threads or not post.get('comments_count') or i == reintentos:
            break
        time.sleep(5)
    todos = [c for t in threads for c in [t] + (t.get('replies') or [])]
    fuera, por_titular, nuestros = [], set(), 0
    for c in todos:
        a = c.get('author') or {}
        motivo = es_nuestro(a, autor_post_id, plantilla)
        if motivo:
            nuestros += 1
            if motivo == 'titular':
                por_titular.add(a.get('name') or a.get('profile_id'))
        else:
            fuera.append(a.get('name') or a.get('profile_id') or '?')
    return {
        'total': len(todos), 'nuestros': nuestros, 'de_fuera': len(fuera),
        'fuera_unicos': len(set(fuera)), 'fuera': sorted(set(fuera)),
        'por_titular': sorted(por_titular),
    }


def posts_de(creator_id):
    j = _backend('/api/creators/%s/posts?limit=500' % creator_id)
    return j.get('posts') or []


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--post')
    ap.add_argument('--pilar', help='historia, meme, mapa... o "todos"')
    ap.add_argument('--desde', default='2026-07-25')
    ap.add_argument('--cuenta', choices=list(CUENTAS))
    ap.add_argument('--json')
    a = ap.parse_args()

    plantilla = plantilla_neety()
    print('Equipo: %d fijos + %d en la plantilla de Neety' % (len(EQUIPO_FIJO), len(plantilla)))

    filas = []
    for cuenta, cid in CUENTAS.items():
        if a.cuenta and cuenta != a.cuenta:
            continue
        autor_id = next(k for k, v in EQUIPO_FIJO.items() if v.split()[0] == cuenta)
        for p in posts_de(cid):
            if a.post:
                if p['id'] != a.post:
                    continue
            else:
                if (p.get('published_at') or '')[:10] < a.desde:
                    continue
                if a.pilar != 'todos' and p.get('pillar') != a.pilar:
                    continue
            r = contar(p, autor_id, plantilla)
            r.update({'cuenta': cuenta, 'fecha': p['published_at'][:10], 'pilar': p.get('pillar'),
                      'id': p['id'], 'imp': p.get('impressions_count'), 'bd': p.get('comments_count'),
                      'gancho': (p.get('hook_text') or '')[:60]})
            filas.append(r)

    filas.sort(key=lambda r: (r['pilar'] or '', r['cuenta'], r['fecha']))
    print('\n%-10s %-5s %-10s %7s %5s %5s %5s %5s  %s' % ('pilar', 'cta', 'fecha', 'imp', 'total', 'nues', 'fuera', 'únic', 'gancho'))
    for r in filas:
        if 'error' in r:
            print('%-10s %-5s %-10s  ERROR %s' % (r['pilar'], r['cuenta'], r['fecha'], r['error']))
            continue
        aviso = '' if r['total'] == r['bd'] else '  ⚠️ BD dice %s' % r['bd']
        print('%-10s %-5s %-10s %7s %5d %5d %5d %5d  %s%s' % (r['pilar'], r['cuenta'], r['fecha'], r['imp'], r['total'],
              r['nuestros'], r['de_fuera'], r['fuera_unicos'], r['gancho'], aviso))

    ok = [r for r in filas if 'error' not in r]
    print('\nMedianas por pilar (de fuera / total):')
    for pilar in sorted({r['pilar'] or '-' for r in ok}):
        g = [r for r in ok if (r['pilar'] or '-') == pilar]
        print('  %-10s n=%2d  de fuera %4.1f  únicos %4.1f  total %4.1f  nuestros %4.1f' % (
            pilar, len(g), statistics.median(r['de_fuera'] for r in g), statistics.median(r['fuera_unicos'] for r in g),
            statistics.median(r['total'] for r in g), statistics.median(r['nuestros'] for r in g)))
    tit = sorted({n for r in ok for n in r['por_titular']})
    if tit:
        print('\nContados como nuestros SOLO por el titular (revisar a mano): ' + ', '.join(tit))
    if a.json:
        with open(a.json, 'w', encoding='utf-8') as f:
            json.dump(filas, f, ensure_ascii=False, indent=1)


if __name__ == '__main__':
    main()
