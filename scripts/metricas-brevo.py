#!/usr/bin/env python3
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

4. 🟢 CUENTA IGUAL QUE EL PANEL (/newsletter, 2026-11-20). Las definiciones son las
   de `backend/src/services/metricasNewsletter.ts`, y `scripts/test-metricas-brevo.py`
   comprueba los mismos numeros sobre el mismo fixture:
     - apertura real = uniqueViews - appleMppOpens (nunca por debajo de 0), sobre entregados;
     - personas = correos distintos (en minusculas) que han pulsado un enlace del cuerpo,
       sin @neety.com y sin enlaces de baja o de preferencias;
     - primer minuto = personas cuyo primer clic valido llega a 60 s o menos del envio
       (suelen ser escaneres de enlaces);
     - rebotes = hard + soft; los ratios son null (—) si el denominador es 0.
   Las personas solo se pueden contar con `--quien` (hay que recorrer los contactos).

Uso:
    python3 scripts/metricas-brevo.py                # tabla de campanas enviadas
    python3 scripts/metricas-brevo.py --quien        # ademas, quien pulso y las personas
    python3 scripts/metricas-brevo.py --quien --listas 15,4

Sin `--listas` se usan las listas de destino de cada campana (`recipients.lists`).

Necesita `BREVO_API_KEY` en el entorno (nunca pegada aqui, `CLAUDE.md`).
"""
import json
import os
import re
import sys
import urllib.error
import urllib.parse
import urllib.request
from datetime import datetime, timezone

BASE = 'https://api.brevo.com/v3'
INTERNO = '@neety.com'


# ---------------------------------------------------------------------------
# Calculo puro (sin red). Espejo de metricasNewsletter.ts: si cambia uno, cambia el otro.
# ---------------------------------------------------------------------------
_BAJA = re.compile(r'/unsubscribe|/preferences|/unsub\b', re.I)


def es_enlace_de_baja(url):
    return bool(_BAJA.search(url or ''))


def _ts(t):
    d = datetime.fromisoformat(str(t).replace('Z', '+00:00'))
    if d.tzinfo is None:
        d = d.replace(tzinfo=timezone.utc)
    return d.timestamp()


def _dividir(a, b):
    return a / b if b > 0 else None


def calcular_metricas(global_stats, sent_date, clics):
    """clics: lista de {'email', 'url', 't'} (t en ISO). Devuelve el mismo dict que el panel."""
    g = global_stats or {}
    entregados = g.get('delivered') or 0
    reales = max(0, (g.get('uniqueViews') or 0) - (g.get('appleMppOpens') or 0))

    primeros = {}
    for c in clics or []:
        email = c['email'].strip().lower()
        if email.endswith(INTERNO) or es_enlace_de_baja(c.get('url')):
            continue
        t = _ts(c['t'])
        if email not in primeros or t < primeros[email]:
            primeros[email] = t
    envio = _ts(sent_date) if sent_date else None
    primer_minuto = sum(1 for t in primeros.values() if envio is not None and t - envio <= 60)
    personas = len(primeros)

    return {
        'enviados': g.get('sent') or 0,
        'entregados': entregados,
        'rebotes': (g.get('hardBounces') or 0) + (g.get('softBounces') or 0),
        'bajas': g.get('unsubscriptions') or 0,
        'aperturas_reales': reales if entregados > 0 else None,
        'apertura_real': _dividir(reales, entregados),
        'personas': personas,
        'personas_primer_minuto': primer_minuto,
        'clic': _dividir(personas, entregados),
        'ctor': _dividir(personas, reales),
    }


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


def pct(x):
    return f'{100 * x:.1f}%' if x is not None else '—'


def main():
    key = os.environ.get('BREVO_API_KEY')
    if not key:
        print('Falta BREVO_API_KEY en el entorno.')
        sys.exit(2)

    quien = '--quien' in sys.argv
    listas_fijas = None
    if '--listas' in sys.argv:
        listas_fijas = [int(x) for x in sys.argv[sys.argv.index('--listas') + 1].split(',')]

    d = api('/emailCampaigns?type=classic&limit=100&excludeHtmlContent=true', key)
    if not d:
        sys.exit(1)

    # 'rejected' entra a proposito: la tanda 6 salio y luego la marcaron asi, y
    # sus 327 entregados son el mejor dato que tenemos sobre el ninja.
    vivas = [c for c in d.get('campaigns', []) if c.get('status') in ('sent', 'rejected')]
    vivas.sort(key=lambda c: c.get('sentDate') or '')

    # Clics por persona de cada campana: solo con --quien (hay que recorrer los contactos).
    filas = []
    listas = listas_fijas or []
    if quien:
        if not listas_fijas:
            for c in vivas:
                for lid in (c.get('recipients') or {}).get('lists') or []:
                    if lid not in listas:
                        listas.append(lid)
            listas = listas or [15, 4]
        mails = []
        for lid in listas:
            r = api(f'/contacts/lists/{lid}/contacts?limit=500', key) or {}
            mails += [c['email'] for c in r.get('contacts', [])]
        mails = sorted(set(mails))
        for m in mails:
            c = api('/contacts/' + urllib.parse.quote(m, safe=''), key)
            if not c:
                continue
            st = c.get('statistics') or {}
            for x in st.get('clicked') or []:
                for lk in x.get('links') or []:
                    filas.append((x.get('campaignId'), lk.get('eventTime', ''), m, lk.get('url', '')))
            for u in (st.get('unsubscriptions') or {}).get('userUnsubscription') or []:
                filas.append((u.get('campaignId'), u.get('eventTime', ''), m, '‹BAJA›'))

    print(f"{'id':>3}  {'campaña':32} {'salió':16} {'env':>4} {'entr':>4} {'ab.real':>7} "
          f"{'%ab.r':>6} {'clic✗':>6} {'CLIC':>5} {'CTR':>7} {'pers':>5} {'bajas':>5}")
    print('-' * 118)
    total_entr = total_clic = 0
    for c in vivas:
        g = stats(c['id'], key, 'globalStats')
        ls = stats(c['id'], key, 'linksStats')
        clic = sum(ls.values()) if isinstance(ls, dict) else 0
        propios = [{'email': m, 'url': u, 't': ts} for cid, ts, m, u in filas
                   if cid == c['id'] and u != '‹BAJA›' and ts]
        met = calcular_metricas(g, c.get('sentDate'), propios)
        entr = met['entregados']
        ctr = f'{1000 * clic / entr:.1f}‰' if entr else '—'
        total_entr += entr
        total_clic += clic
        pers = str(met['personas']) if quien else '·'
        if quien and met['personas_primer_minuto']:
            pers += f"({met['personas_primer_minuto']}⚡)"
        reales = met['aperturas_reales'] if met['aperturas_reales'] is not None else '—'
        print(f"{c['id']:>3}  {c.get('name', '')[:32]:32} {(c.get('sentDate') or '')[:16]:16} "
              f"{met['enviados']:>4} {entr:>4} {reales:>7} "
              f"{pct(met['apertura_real']):>6} {g.get('uniqueClicks', 0):>6} {clic:>5} {ctr:>7} "
              f"{pers:>5} {met['bajas']:>5}")
    ctr_t = f'{1000 * total_clic / total_entr:.1f}‰' if total_entr else '—'
    print('-' * 118)
    print(f"{'':>3}  {'TOTAL':32} {'':16} {'':>4} {total_entr:>4} {'':>7} {'':>6} {'':>6} "
          f"{total_clic:>5} {ctr_t:>7}")
    print('\n  ab.real = aperturas únicas menos las de Apple MPP. %ab.r = ab.real / entregados.')
    print('  clic✗ = uniqueClicks del panel, INFLADO: cuenta el enlace de baja.')
    print('  CLIC  = suma de linksStats, solo los enlaces del cuerpo (clics, no personas).')
    print('  pers  = personas distintas que pulsaron, sin internos ni bajas; (n⚡) = en el primer minuto.')

    if not quien:
        print('\n  (pasa --quien para ver quién pulsó, y contar las personas)')
        return

    print(f'\n=== QUIÉN PULSÓ (listas {listas}) ===')
    for cid, ts, m, url in sorted(filas, key=lambda f: (f[0] or 0, f[1], f[2], f[3])):
        marca = '🏠 INTERNO' if INTERNO in m else '  lead   '
        print(f'  camp {cid:>3}  {ts[:19]}  {marca}  {m:36} {url[:70]}')
    reales = sum(1 for _, _, m, u in filas if INTERNO not in m and u != '‹BAJA›')
    internos = sum(1 for _, _, m, u in filas if INTERNO in m and u != '‹BAJA›')
    print(f'\n  clics de LEAD: {reales}   ·   clics INTERNOS a descontar: {internos}')


if __name__ == '__main__':
    main()
