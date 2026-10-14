#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""salud-suscriptores.py — ¿siguen entrando en Brevo los que nos dan el correo?

Va en la REVISIÓN SEMANAL, apartado de correos (Mario, 2026-10-14). Del 22/09 al
14/10 la tubería web → CRM → Brevo estuvo rota y nadie lo vio en tres semanas:
los formularios de neety.com guardaban la casilla en su D1 y el CRM leía otra base.
Esto lo comprueba solo, en un minuto, sin acordarse de nada.

Comprueba:
  1. Que el endpoint de la web que lee el CRM está vivo y protegido
     (GET neety.com/api/crm/leads → 401 sin clave).
  2. Que el aviso al momento del CRM está vivo y protegido
     (POST meetings.neety.com/api/public/web-leads/sync → 401 sin clave).
  3. Que cada correo con la casilla marcada en la D1 de neety.com está en la lista
     15 de Brevo, o bloqueado en Brevo (la baja manda: también vale). FALLO si falta
     alguno.
  4. Cuánto tardó en entrar en Brevo cada alta nueva desde el arreglo (14/10 11:32):
     menos de ~2 min = el aviso al momento funciona; cerca de 1 h = solo va la
     lectura horaria (no se pierde nadie, pero el aviso está roto).
  5. Que el webhook de bajas de Brevo hacia el CRM sigue registrado.

Necesita BREVO_API_KEY en el entorno y acceso de wrangler a Cloudflare desde el repo
`landing` (por defecto C:/Users/LENOVO/Desktop/landing). Los correos salen enmascarados.

Uso:
  python scripts/salud-suscriptores.py [--landing RUTA]
Salida: líneas ✅/⚠️/❌ y "N/M". Exit 1 si hay fallos.
"""
import argparse, json, os, subprocess, sys, urllib.request, urllib.parse
from datetime import datetime, timezone

LISTA = 15
ARREGLO = datetime(2026, 10, 14, 9, 32, tzinfo=timezone.utc)  # 11:32 hora de España
INTERNO = ('@neety.com', '@neety.io')


def mask(e):
    u, _, d = e.partition('@')
    return f'{u[:2]}***@{d}'


# Cloudflare da 403 a urllib por la firma del cliente (la misma trampa que /senders de
# Brevo, email-marketing §1): con un User-Agent normal responde lo que responde a curl.
UA = {'User-Agent': 'Mozilla/5.0 (salud-suscriptores; Neety)'}
# Los 68 bloqueados (bajas y rebotes) que se guardaron al limpiar Brevo el 28/08: en
# Brevo ya no existen como contacto, pero el CRM los tiene como baja y no los sube.
BLOQUEADOS_AGOSTO = 'C:/Users/LENOVO/Desktop/BREVO-CONTACTOS-BORRADOS/bloqueados-no-volver-a-escribir.txt'


def bloqueados_agosto():
    try:
        with open(BLOQUEADOS_AGOSTO, encoding='utf-8') as f:
            return {l.strip().lower() for l in f if '@' in l}
    except OSError:
        return set()


def http_status(url, method='GET'):
    req = urllib.request.Request(url, method=method, data=b'' if method == 'POST' else None, headers=UA)
    try:
        return urllib.request.urlopen(req, timeout=20).status
    except urllib.error.HTTPError as e:
        return e.code
    except Exception as e:  # red caída, DNS…
        return f'error: {e}'


def brevo(path, key):
    req = urllib.request.Request('https://api.brevo.com/v3' + path,
                                 headers={'api-key': key, 'accept': 'application/json'})
    return json.load(urllib.request.urlopen(req, timeout=30))


def d1_consentimientos(landing):
    sql = ("SELECT lower(email) email, resource, origin, created_at FROM leads "
           "WHERE consent_comms = 1 ORDER BY created_at")
    out = subprocess.run(
        ['npx', '--no-install', 'wrangler', 'd1', 'execute', 'landing', '--remote', '--json', '--command', sql],
        cwd=landing, capture_output=True, text=True, encoding='utf-8', timeout=180, shell=(os.name == 'nt'))
    if out.returncode != 0:
        raise RuntimeError((out.stderr or out.stdout)[-300:])
    return json.loads(out.stdout)[0]['results']


def parse_fecha(s):
    if not s:
        return None
    try:
        d = datetime.fromisoformat(str(s).replace('Z', '+00:00'))
        return d if d.tzinfo else d.replace(tzinfo=timezone.utc)
    except ValueError:
        return None


def main():
    if hasattr(sys.stdout, 'reconfigure'):
        sys.stdout.reconfigure(encoding='utf-8', errors='replace')
    ap = argparse.ArgumentParser()
    ap.add_argument('--landing', default='C:/Users/LENOVO/Desktop/landing')
    a = ap.parse_args()
    key = os.environ.get('BREVO_API_KEY')
    if not key:
        print('❌ Falta BREVO_API_KEY en el entorno (engranaje del entorno local).')
        sys.exit(2)

    ok, fallos, avisos = [], [], []

    s = http_status('https://neety.com/api/crm/leads')
    (ok if s == 401 else fallos).append(f'Web: GET /api/crm/leads responde {s} (debe ser 401 sin clave)')
    s = http_status('https://meetings.neety.com/api/public/web-leads/sync', 'POST')
    (ok if s in (401, 503) else fallos).append(f'CRM: POST /api/public/web-leads/sync responde {s} (debe ser 401 sin clave)')

    try:
        filas = d1_consentimientos(a.landing)
    except Exception as e:
        fallos.append(f'No pude leer la D1 de neety.com con wrangler: {e}')
        filas = []

    primera = {}
    for f in filas:
        e = f['email']
        if e.endswith(INTERNO) or '@' not in e:
            continue
        primera.setdefault(e, f)

    lista = {}
    off = 0
    while True:
        cs = brevo(f'/contacts/lists/{LISTA}/contacts?limit=500&offset={off}', key)['contacts']
        for c in cs:
            lista[c['email'].lower()] = c
        if len(cs) < 500:
            break
        off += 500

    faltan, bloqueados, lags = [], [], []
    viejos = bloqueados_agosto()
    for e, f in primera.items():
        c = lista.get(e)
        if c is None and e in viejos:
            bloqueados.append(e)
            continue
        if c is None:
            try:
                info = brevo('/contacts/' + urllib.parse.quote(e), key)
                if info.get('emailBlacklisted'):
                    bloqueados.append(e)
                    continue
            except urllib.error.HTTPError:
                pass
            faltan.append((e, f))
            continue
        alta_web = parse_fecha(f['created_at'])
        alta_brevo = parse_fecha(c.get('createdAt'))
        if alta_web and alta_brevo and alta_web >= ARREGLO:
            lags.append((e, (alta_brevo - alta_web).total_seconds() / 60))

    if faltan:
        fallos.append(f'{len(faltan)} con la casilla marcada en la web NO están en Brevo: '
                      + ', '.join(f'{mask(e)} ({str(f["created_at"])[:10]}, {f["resource"]})' for e, f in faltan))
    else:
        ok.append(f'Los {len(primera)} con la casilla marcada en la web están en la lista {LISTA} o bloqueados en Brevo')
    if bloqueados:
        ok.append(f'{len(bloqueados)} marcaron la casilla pero están bloqueados en Brevo y se quedan fuera (la baja manda): '
                  + ', '.join(mask(e) for e in bloqueados))

    if lags:
        lentos = [(e, m) for e, m in lags if m > 5]
        texto = ', '.join(f'{mask(e)} {m:.0f} min' for e, m in lags)
        (avisos if lentos else ok).append(
            f'Tiempo de la web a Brevo de las altas nuevas: {texto}'
            + (' → alguna tardó más de 5 min: el aviso al momento puede estar roto (la lectura horaria sí funciona)' if lentos else ' → el aviso al momento funciona'))
    else:
        avisos.append('Todavía no ha entrado ningún alta nueva desde el arreglo (14/10 11:32): el aviso al momento sigue sin verse en real')

    ultima = max((parse_fecha(c.get('createdAt')) for c in lista.values()), default=None, key=lambda d: d or datetime.min.replace(tzinfo=timezone.utc))
    if ultima:
        dias = (datetime.now(timezone.utc) - ultima).days
        (avisos if dias > 14 else ok).append(f'Último alta en la lista {LISTA}: {ultima.astimezone().strftime("%d/%m %H:%M")} (hace {dias} días)')

    try:
        hooks = brevo('/webhooks?type=marketing', key).get('webhooks', [])
        bajas = [h for h in hooks if 'unsubscribed' in (h.get('events') or []) and 'railway.app' in (h.get('url') or '')]
        (ok if bajas else fallos).append('Webhook de bajas de Brevo → CRM ' + ('registrado' if bajas else 'NO registrado'))
    except Exception as e:
        avisos.append(f'No pude leer los webhooks de Brevo: {e}')

    for x in ok:
        print('✅', x)
    for x in avisos:
        print('⚠️', x)
    for x in fallos:
        print('❌', x)
    total = len(ok) + len(fallos)
    print(f'\n{"✅" if not fallos else "❌"} Salud de suscriptores {len(ok)}/{total}')
    sys.exit(1 if fallos else 0)


if __name__ == '__main__':
    main()
