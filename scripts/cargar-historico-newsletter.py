#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
cargar-historico-newsletter.py — genera `newsletter-historico.json` con los
correos ya enviados, listo para `neety_newsletter_publicar` (estado borrador) y
luego `neety_newsletter_vincular {clave, campaign_id, historico: true}`.

Fuentes (no se inventa nada: lo que no aparece, va a null):
  - docs/skills/corpus-correos-enviados.md : texto literal, asunto, preheader,
    remitente, fecha y hora de cada correo.
  - docs/skills/historial-newsletter.md    : ids de campaña de Brevo (tabla
    CAMPANAS de abajo, copiada de ahí con su línea) y horas reales.

Regla de varias campañas (tandas): UNA entrada por correo, con la PRIMERA
campaña de Brevo como `brevo_campaign_id`; las demás se listan en `por_que`.

Uso: python3 scripts/cargar-historico-newsletter.py [salida.json]
El JSON NO se commitea.
"""
import json
import re
import sys
from pathlib import Path

RAIZ = Path(__file__).resolve().parent.parent
CORPUS = RAIZ / 'docs' / 'skills' / 'corpus-correos-enviados.md'
SALIDA_POR_DEFECTO = ('/private/tmp/claude-501/-Users-ikergalarza-Desktop-contenido/'
                      '0e9a7c21-c5bc-45ff-bdf3-e02a7f1f1232/scratchpad/newsletter-historico.json')

REMITENTES = ('Iker', 'Asier', 'Unai', 'Kaixito')

# numero -> (campaña primera, otras campañas, fuente). Ids de historial-newsletter.md
# (líneas 71, 522, 715 para el 1; las demás, de la cabecera de cada correo en el corpus).
CAMPANAS = {
    1: (2, [3, 4, 5, 6, 11], 'historial-newsletter §tandas del correo 0 (ids 2-6 y 11; el envío de MailerLite del 07 y 10/08 no tiene campaña de Brevo)'),
    2: (15, [], 'corpus, cabecera del correo 2'),
    3: (18, [], 'corpus, cabecera del correo 3'),
    4: (21, [], 'corpus, cabecera del correo 4'),
    5: (22, [23], 'corpus, cabecera del correo 5 (tanda 1 = 22, tanda 2 = 23)'),
    6: (27, [], 'corpus, cabecera del correo 6'),
    7: (28, [], 'corpus, cabecera del correo 7'),
    8: (29, [], 'corpus, cabecera del correo 8'),
    9: (30, [], 'corpus, cabecera del correo 9'),
    10: (31, [], 'corpus, cabecera del correo 10'),
    11: (33, [], 'corpus, cabecera del correo 11'),
    12: (34, [], 'corpus, cabecera del correo 12'),
    13: (36, [], 'corpus, cabecera del correo 13 (A/B nativo dentro de la misma campaña)'),
    14: (38, [], 'corpus, cabecera del correo 14'),
}

# Fecha y hora: la del corpus; solo donde el historial da la real se corrige (12 y 13).
HORAS_REALES = {12: '09:13', 13: '09:09'}   # historial-newsletter, repasos del 09/11 y 16/11

# UTM que no van dentro de la URL del cuerpo, sacados de las cabeceras del corpus/historial.
UTM_EXTRA = {
    1: {'utm_campaign': 'kaixito-01-tanda-1'},                 # historial, tabla de tandas
    2: {'utm_campaign': 'iker-02-feria'},                      # corpus, cabecera
    3: {'utm_source': 'unai-03-evento-correo'},                # corpus, cabecera
    4: {'utm_source': 'kaixito-04-evento-correo'},             # corpus, cabecera
    5: {'utm_campaign': 'correo-05-iker-objecion'},            # corpus, cabecera
    6: {'utm_campaign': 'correo-06-unai-calendario'},          # corpus, cabecera
    7: {'utm_campaign': 'correo-07-kaixito-mito'},             # corpus, cabecera
    8: {'utm_source': 'correo-08-asier-receta', 'utm_campaign': 'correo-08-asier-receta'},  # historial, ninja del correo 8
    9: {'utm_source': 'correo-09-kaixito-dolor'},              # corpus, cabecera
    10: {'utm_source': 'correo-10-kaixito-anzuelos'},          # corpus, cabecera
    11: {'utm_campaign': 'correo-11-kaixito-grabacion'},       # corpus, cabecera
}

# Biblioteca de GIFs de Brevo (corpus §BIBLIOTECA DE GIFS). 12 y 13 salieron del CDN
# de MailerLite (historial, incidencia del 12/11): su URL real no consta, va null.
GIFS = {
    'estresado': 'https://img.mailinblue.com/11927007/images/content_library/original/6a8722b7e5f747179059068f.gif',
    'alegría': 'https://img.mailinblue.com/11927007/images/content_library/original/6a8722b7e5f747179059068e.gif',
    'enfado': 'https://img.mailinblue.com/11927007/images/content_library/original/6a8722b7d90d741e712f9a11.gif',
    'curiosidad': 'https://img.mailinblue.com/11927007/images/content_library/original/6a8722b7d90d741e712f9a10.gif',
    'aburrimiento': 'https://img.mailinblue.com/11927007/images/content_library/original/6a8722afd90d741e712f9a0a.gif',
}
GIF_SIN_URL = {12, 13}

PILAR_MANUAL = {1: 'Correo 0 segmentador', 11: None}

RE_CABECERA = re.compile(r'^## (Kaixito|Iker|Unai|Asier) (\d\d) · (.+)$', re.M)
RE_FENCE = re.compile(r'^```[^\n]*\n(.*?)\n```', re.M | re.S)
RE_URL = re.compile(r'https?://[^\s)\]]+')
# El corpus a veces escribe el dominio sin esquema ni UTM (`luma.com/7hhyx07z`).
RE_DOMINIO = re.compile(r'(?<![\w@/.])((?:[a-z0-9-]+\.)+(?:com|es|eus)(?:/[^\s)\]]*)?)')


def secciones(texto):
    ms = list(RE_CABECERA.finditer(texto))
    fin_corpus = texto.find('\n## 🔴 Las tres líneas')
    for i, m in enumerate(ms):
        fin = ms[i + 1].start() if i + 1 < len(ms) else (fin_corpus if fin_corpus > 0 else len(texto))
        yield m, texto[m.start():fin]


def fecha_hora(bloque, numero):
    m = re.search(r'\*\*(?:Enviado|Programado):\*\*[^\n]*?(\d{4}-\d{2}-\d{2})(?: (\d{2}:\d{2}))?', bloque)
    if not m:
        return None, None
    return m.group(1), m.group(2)


def extraer(texto):
    items, fuera = [], []
    for m, bloque in secciones(texto):
        remitente, numero, titulo = m.group(1), int(m.group(2)), m.group(3)
        faltan = []
        # asunto y preheader: fences entre «### ...asunto» y «### El cuerpo»
        i_as = re.search(r'^### .*[Aa]sunto', bloque, re.M)
        i_cu = re.search(r'^### El cuerpo, literal', bloque, re.M)
        asunto = asunto_b = preview = cuerpo = None
        if i_as and i_cu:
            fences = [f.strip() for f in RE_FENCE.findall(bloque[i_as.start():i_cu.start()])]
            if fences:
                asunto = fences[0]
                if len(fences) > 1:
                    preview = fences[1]
                ab = re.match(r'A: (.+)\nB: (.+)$', asunto)
                if ab:
                    asunto, asunto_b = ab.group(1).strip(), ab.group(2).strip()
        if i_cu:
            f = RE_FENCE.search(bloque[i_cu.end():])
            if f:
                cuerpo = f.group(1).strip('\n')
        if not asunto:
            faltan.append('asunto')
        if not cuerpo:
            faltan.append('cuerpo')
        campana = CAMPANAS.get(numero)
        if not campana:
            faltan.append('campaña de Brevo')

        fecha, hora = fecha_hora(bloque, numero)
        hora = HORAS_REALES.get(numero, hora)
        pilar = PILAR_MANUAL[numero] if numero in PILAR_MANUAL else None
        if numero not in PILAR_MANUAL:
            mp = re.search(r'pilar ([A-ZÁÉÍÓÚÑ][A-ZÁÉÍÓÚÑ\-]+(?: [^,·)]+)?)', titulo)
            pilar = mp.group(1).strip() if mp else None

        urls = RE_URL.findall(cuerpo or '')
        enlace = urls[0].rstrip('.,') if urls else None
        if not enlace and cuerpo:
            md = RE_DOMINIO.search(cuerpo)
            if md:
                enlace = 'https://' + md.group(1).rstrip('.,')
        utm = {'utm_campaign': None, 'utm_source': None}
        if enlace:
            for k in utm:
                mu = re.search(k + r'=([^&\s]+)', enlace)
                if mu:
                    utm[k] = mu.group(1)
        for k, v in UTM_EXTRA.get(numero, {}).items():
            utm[k] = utm[k] or v

        gif_alt = gif_url = None
        if cuerpo:
            mg = re.search(r'\[GIF(?::| )\s*([^\]]+)\]', cuerpo)
            if mg:
                gif_alt = mg.group(1).strip()
                emocion = next((e for e in GIFS if e in gif_alt), None)
                if emocion is None and numero in (1, 4, 10):
                    emocion = {1: 'estresado', 4: 'curiosidad', 10: 'curiosidad'}[numero]
                if numero not in GIF_SIN_URL and emocion:
                    gif_url = GIFS[emocion]

        if faltan:
            fuera.append((numero, remitente, ', '.join(faltan)))
            continue

        primera, otras, fuente = campana
        notas = [f'Histórico ya enviado, cargado de corpus-correos-enviados.md: «{titulo}».',
                 f'Campaña de Brevo {primera} (fuente: {fuente}).']
        if otras:
            notas.append('Otras campañas del mismo correo: ' + ', '.join(str(o) for o in otras) + '.')
        if numero == 13:
            notas.append('Dos asuntos en A/B nativo de Brevo (asunto y asunto_b).')
        if numero in HORAS_REALES:
            notas.append(f'Hora real del envío ({hora}) del historial; el corpus decía programado 09:05.')
        elif re.search(r'\*\*Programado:\*\*', bloque):
            notas.append('Hora y fecha son las programadas según el corpus; no se comprobó el envío real.')
        if numero in GIF_SIN_URL:
            notas.append('El GIF salió del CDN de MailerLite y su URL no consta: gif_url null.')
        if numero == 1:
            notas.append('Fecha y hora del primer envío (MailerLite, 07/08); la primera campaña de Brevo (id 2) salió el 20/08 18:40.')

        items.append({
            'clave': f'correo-{numero:02d}-{remitente.lower()}',
            'numero': numero,
            'fecha': fecha,
            'hora': hora,
            'remitente': remitente,
            'asunto': asunto,
            'asunto_b': asunto_b,
            'preview': preview,
            'cuerpo': cuerpo,
            'gif_url': gif_url,
            'gif_alt': gif_alt,
            'enlace': enlace,
            'utm_campaign': utm['utm_campaign'],
            'utm_source': utm['utm_source'],
            'pilar': pilar,
            'por_que': ' '.join(notas),
            'estado': 'borrador',
            'brevo_campaign_id': primera,
        })
    return items, fuera


def main():
    salida = Path(sys.argv[1] if len(sys.argv) > 1 else SALIDA_POR_DEFECTO)
    items, fuera = extraer(CORPUS.read_text(encoding='utf-8'))
    for it in items:
        assert it['remitente'] in REMITENTES
    salida.parent.mkdir(parents=True, exist_ok=True)
    salida.write_text(json.dumps(items, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    print(f'{"nº":>3}  {"fecha":10} {"hora":5}  {"remitente":8} {"campaña":>7}  estado')
    for it in items:
        nulos = [k for k in ('fecha', 'hora', 'preview', 'enlace', 'pilar') if not it[k]]
        print(f'{it["numero"]:>3}  {it["fecha"] or "-":10} {it["hora"] or "-":5}  {it["remitente"]:8} '
              f'{it["brevo_campaign_id"]:>7}  ok' + (f' (null: {", ".join(nulos)})' if nulos else ''))
    for n, r, motivo in fuera:
        print(f'{n:>3}  {"-":10} {"-":5}  {r:8} {"-":>7}  FALTA: {motivo}')
    print(f'\n{len(items)} correos escritos en {salida}; {len(fuera)} fuera.')


if __name__ == '__main__':
    main()
