#!/usr/bin/env python3
"""Audita las campanas VIVAS de Brevo buscando ajustes reseteados a su valor
por defecto.

Existe por un fallo real del 2026-08-28: un `PUT` a una campana de Brevo
**resetea a `[DEFAULT_*]` todo campo que no le reenvies**, y el pie del correo 2
se quedo en `[DEFAULT_FOOTER]` sin que nada avisara. Salio en una captura de
Iker, no en ningun error. Es la misma trampa que la doc ya describia de
MailerLite y que decia expresamente que NO estaba verificada en Brevo.

Se corre ANTES de dar por buena cualquier campana:
    python scripts/auditar-campanas-brevo.py
"""
import json
import os
import re
import sys

# La consola de Windows va en cp1252 y revienta con los emojis del informe.
# Se fuerza UTF-8 en la salida, que es mas barato que quitar los simbolos.
if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")
import urllib.error
import urllib.request

PIE_ESPERADO = ("¿Prefieres que no te escriba más? {Date de baja aquí} · Neety · "
                "Miramon Pasealekua 170, Donostia, España")
# Estados que todavia se pueden arreglar. Una enviada ya no.
VIVAS = {"draft", "queued", "inProcess", "inReview", "suspended"}


def pedir(path, key):
    req = urllib.request.Request(
        "https://api.brevo.com/v3" + path,
        headers={"api-key": key, "Accept": "application/json"},
    )
    with urllib.request.urlopen(req) as r:
        return json.loads(r.read() or b"{}")


def revisar(c):
    """Devuelve la lista de problemas de una campana."""
    fallos = []
    pie = c.get("footer") or ""
    if pie.startswith("[DEFAULT"):
        fallos.append("el PIE se ha reseteado al generico de Brevo")
    elif pie != PIE_ESPERADO:
        fallos.append(f"el PIE no es el de la casa: {pie[:60]!r}")
    # Sin el enlace de baja el correo es ilegal, ademas de feo.
    elif "baja" not in pie.lower():
        fallos.append("el PIE no lleva enlace de baja")
    # utm_campaign solo hace falta si algun enlace va a NUESTRA web (GA4). Si
    # todos van a Luma/forward, el seguimiento UTM va APAGADO a proposito y la
    # identidad viaja en utm_source (email-marketing §1). Falso positivo del 22/09.
    enlaces_web = [e for e in re.findall(r'href="(https?://[^"]+)"', c.get("htmlContent") or "")
                   if "luma.com" not in e and "forward.neety.com" not in e
                   and "unsubscribe" not in e.lower() and "{{" not in e
                   # con el seguimiento apagado, el UTM va escrito a mano en el href (22/09)
                   and "utm_campaign=" not in e]
    if enlaces_web and not (c.get("utmCampaignValue") or "").strip():
        fallos.append("no lleva utm_campaign: los clics no se podran atribuir")
    if not (c.get("previewText") or "").strip():
        fallos.append("no lleva preview: Gmail cogera la primera linea del cuerpo")
    if not c.get("recipients", {}).get("lists"):
        fallos.append("no tiene ninguna lista de destinatarios")
    # 🔴 LUMA: solo lee `utm_source`, asi que la identidad va AHI y escrita a
    # mano. Si Brevo se cuela con `sendinblue`, los registros del evento caen
    # todos juntos y no se sabe que correo los trajo. Pasa de forma
    # intermitente (2026-08-28) y por eso se comprueba SIEMPRE antes de enviar.
    html = c.get("htmlContent") or ""
    for enlace in re.findall(r'href="([^"]+)"', html):
        if "luma.com" not in enlace and "forward.neety.com" not in enlace:
            continue
        fuente = re.search(r"utm_source=([^&\"]*)", enlace)
        if not fuente:
            fallos.append(f"el enlace del EVENTO no lleva utm_source: {enlace[:60]}")
        elif fuente.group(1) in ("sendinblue", "brevo", ""):
            fallos.append(
                f"el enlace del EVENTO lleva utm_source={fuente.group(1)!r}: Luma solo lee "
                f"ese campo, asi que la atribucion se pierde. Apaga Google Analytics en los "
                f"ajustes de la campana y vuelve a escribir el enlace a mano"
            )

    remitente = (c.get("sender") or {}).get("name") or ""
    if remitente.startswith("[DEFAULT"):
        fallos.append("el REMITENTE se ha reseteado al generico")
    elif len(remitente) > 20:
        # Medido en Gmail el 27/08: `Iker Galarza de Neety` (21) sale cortado.
        fallos.append(f"el remitente mide {len(remitente)} caracteres y se cortara en la bandeja")
    return fallos


def main():
    key = os.environ.get("BREVO_API_KEY")
    if not key:
        print("Falta BREVO_API_KEY en el entorno.")
        return 2
    try:
        datos = pedir("/emailCampaigns?type=classic&limit=100", key)
    except urllib.error.HTTPError as e:
        print(f"Brevo respondio {e.code}: {e.read().decode()[:200]}")
        return 2

    vivas = [c for c in datos.get("campaigns", []) if c.get("status") in VIVAS]
    if not vivas:
        print("No hay campanas vivas que auditar.")
        return 0

    total = 0
    for c in sorted(vivas, key=lambda x: x["id"]):
        fallos = revisar(c)
        total += len(fallos)
        marca = "❌" if fallos else "✅"
        print(f"{marca} id={c['id']} [{c['status']}] {c['name']}")
        for f in fallos:
            print(f"     ⚠️  {f}")

    print()
    if total:
        print(f"❌ {total} problema(s). Recuerda: un PUT a Brevo resetea todo campo "
              f"que no le reenvies, asi que el arreglo va en la MISMA llamada.")
        return 1
    print("✅ Todas las campanas vivas estan bien")
    return 0


if __name__ == "__main__":
    sys.exit(main())
