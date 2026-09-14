#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
metricas-brevo.py — las metricas REALES de las campanas de la newsletter.

Por que existe este script y no se mira el panel:

1. 🔴 LA TRAMPA DE LA API (verificada en 3 campanas el 2026-09-14):
   `GET /emailCampaigns/{id}` SIN el parametro `statistics` devuelve el bloque
   `globalStats` ENTERO A CEROS en vez de omitirlo. No falta el campo: esta,
   con sent=0 y delivered=0, en campanas que salieron perfectamente.

       camp 15  sin parametro: sent=0  deliv=0   -> MENTIRA
       camp 15  con parametro: sent=45 deliv=45  -> la verdad

   Es la regla de `email-marketing §1` otra vez: en Brevo un 0 no es un dato,
   es una pregunta. Aqui el bloque se pide SIEMPRE explicitamente.

2. 🔴 EL CLIC DEL PANEL ESTA INFLADO: `globalStats.uniqueClicks` cuenta tambien
   el enlace de BAJA y el de preferencias. El clic que vale es la suma de
   `linksStats`, que solo mira los enlaces del cuerpo. Se sacan los dos y se
   ensenan al lado para que la diferencia se vea.

3. 🔴 Y PARTE DE ESE CLIC SOMOS NOSOTROS. Con `--quien` recorre los contactos
   uno a uno y dice QUIEN pulso y cuando, marcando los internos (@neety.com).
   El 14/09, 2 de los 3 clics de los correos 2 y 3 eran de mario@neety.com
   revisandolos. Sin esta columna, el numero engana.

Uso:
    python scripts/metricas-brevo.py                # tabla de campanas enviadas
    python scripts/metricas-brevo.py --quien        # ademas, quien pulso
    python scripts/metricas-brevo.py --quien --listas 15,4

Necesita `BREVO_API_KEY` en el entorno (nunca pegada aqui, `CLAUDE.md`).
"""
import json
import os
import sys
import urllib.error
import urllib.parse
import urllib.request

BASE = 'https://api.brevo.com/v3'
INTERNO = '@neety.com'


def api(path, key):
    req = urllib.request.Request(BASE + path, headers={'api-key': key, 'accept': 'application/json'})
    try:
        with urllib.request.urlopen(req, timeout=45) as r:
            return json.load(r)
    except urllib.error.HTTPError as e:
        print(f'  ⚠️  {path} -> HTTP {e.code}', file=sys.stderr)
        return None


def stats(cid, key, bloque):
    """SIEMPRE con el parametro. Ver la nota 1 de la cabecera."""
    d = api(f'/emailCampaigns/{cid}?statistics={bloque}&excludeHtmlContent=true', key)
    return ((d or {}).get('statistics') or {}).get(bloque) or {}


def main():
    key = os.environ.get('BREVO_API_KEY')
    if not key:
        print('Falta BREVO_API_KEY en el entorno.')
        sys.exit(2)

    quien = '--quien' in sys.argv
    listas = [15, 4]
    if '--listas' in sys.argv:
        listas = [int(x) for x in sys.argv[sys.argv.index('--listas') + 1].split(',')]

    d = api('/emailCampaigns?type=classic&limit=100&excludeHtmlContent=true', key)
    if not d:
        sys.exit(1)

    # 'rejected' entra a proposito: la tanda 6 salio y luego la marcaron asi, y
    # sus 327 entregados son el mejor dato que tenemos sobre el ninja.
    vivas = [c for c in d.get('campaigns', []) if c.get('status') in ('sent', 'rejected')]
    vivas.sort(key=lambda c: c.get('sentDate') or '')

    print(f"{'id':>3}  {'campaña':32} {'salió':16} {'env':>4} {'entr':>4} {'ab.u':>5} "
          f"{'%ab':>6} {'clic✗':>6} {'CLIC':>5} {'CTR':>7} {'bajas':>5}")
    print('-' * 108)
    total_entr = total_clic = 0
    for c in vivas:
        g = stats(c['id'], key, 'globalStats')
        ls = stats(c['id'], key, 'linksStats')
        clic = sum(ls.values()) if isinstance(ls, dict) else 0
        entr = g.get('delivered', 0)
        ctr = f'{1000 * clic / entr:.1f}‰' if entr else '—'
        total_entr += entr
        total_clic += clic
        print(f"{c['id']:>3}  {c.get('name', '')[:32]:32} {(c.get('sentDate') or '')[:16]:16} "
              f"{g.get('sent', 0):>4} {entr:>4} {g.get('uniqueViews', 0):>5} "
              f"{g.get('opensRate', 0):>5.1f}% {g.get('uniqueClicks', 0):>6} {clic:>5} {ctr:>7} "
              f"{g.get('unsubscriptions', 0):>5}")
    ctr_t = f'{1000 * total_clic / total_entr:.1f}‰' if total_entr else '—'
    print('-' * 108)
    print(f"{'':>3}  {'TOTAL':32} {'':16} {'':>4} {total_entr:>4} {'':>5} {'':>6} {'':>6} "
          f"{total_clic:>5} {ctr_t:>7}")
    print('\n  clic✗ = uniqueClicks del panel, INFLADO: cuenta el enlace de baja.')
    print('  CLIC  = suma de linksStats, solo los enlaces del cuerpo. Es el bueno.')

    if not quien:
        print('\n  (pasa --quien para ver quién pulsó, y descontar los clics internos)')
        return

    print(f'\n=== QUIÉN PULSÓ (listas {listas}) ===')
    mails = []
    for lid in listas:
        r = api(f'/contacts/lists/{lid}/contacts?limit=500', key) or {}
        mails += [c['email'] for c in r.get('contacts', [])]
    mails = sorted(set(mails))
    print(f'  {len(mails)} contactos únicos')
    filas = []
    for m in mails:
        c = api('/contacts/' + urllib.parse.quote(m, safe=''), key)
        if not c:
            continue
        st = c.get('statistics') or {}
        for x in st.get('clicked') or []:
            for lk in x.get('links') or []:
                filas.append((x.get('campaignId'), lk.get('eventTime', '')[:19], m, lk.get('url', '')))
        ub = (st.get('unsubscriptions') or {}).get('userUnsubscription') or []
        for u in ub:
            filas.append((u.get('campaignId'), u.get('eventTime', '')[:19], m, '‹BAJA›'))
    for cid, ts, m, url in sorted(filas):
        marca = '🏠 INTERNO' if INTERNO in m else '  lead   '
        print(f'  camp {cid:>3}  {ts}  {marca}  {m:36} {url[:70]}')
    reales = sum(1 for _, _, m, u in filas if INTERNO not in m and u != '‹BAJA›')
    internos = sum(1 for _, _, m, u in filas if INTERNO in m and u != '‹BAJA›')
    print(f'\n  clics de LEAD: {reales}   ·   clics INTERNOS a descontar: {internos}')


if __name__ == '__main__':
    main()
