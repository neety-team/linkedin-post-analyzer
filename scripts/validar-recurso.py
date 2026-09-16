#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Validador MECANICO del recurso de recursos.neety.com.

POR QUE EXISTE (Mario, 2026-08-26). El post de /errores/ prometia CINCO errores.
Yo adapte el gate, di el recurso por hecho y no abri la guia: dentro seguian
NUEVE secciones numeradas por canal, de la version vieja de 8 trucos. El lector
entraba buscando cinco cosas y encontraba nueve. Y ya estaba en produccion.

La promesa del post es el indice del recurso. Eso se cuenta, no se recuerda.
Ver `post-workflow §4.5.0-YO-LO-HAGO`.

    python scripts/validar-recurso.py <ruta/index.html> --promete 5

Comprueba cuatro cosas, todas contables:
  1. Secciones numeradas == lo que promete el post.
  2. Datos y fuentes: cada dato con su fuente (repartir no es perder).
  3. Tildes comidas, que es lo que pasa al reescribir parrafos a mano.
  4. Ingles suelto en un recurso en castellano.
"""
import argparse
import io
import re
import sys

# Palabras que en castellano SIEMPRE llevan tilde. Si aparecen sin ella dentro
# de un parrafo, es que alguien reescribio a mano y se la comio.
SIN_TILDE = [
    'maquina', 'numero', 'numeros', 'envio', 'linea', 'peticion',
    'demas', 'facil', 'dificil', 'prospeccion', 'informacion', 'concrecion',
    'conversion', 'personalizacion', 'previsualizacion', 'senal', 'campana',
    'movil', 'rapida', 'rapido', 'tambien', 'despues', 'segun', 'todavia',
    'aqui', 'asi que', 'estes', 'queria', 'tenias', 'leelo', 'leelos',
    'mandate', 'prohibele', 'automatico', 'metrica', 'metricas', 'ademas',
]

# Ingles que se cuela al traducir. No entran los terminos que el ICP usa a
# diario (CTA, reply, outbound, pipeline, lead): esos son vocabulario, no
# descuido.
INGLES = [
    'I hope this', 'Quick question', 'circle back', 'reach out', 'follow up',
    'Just wanted', 'baseline', 'specificity', 'insights', 'awareness',
]


def texto_visible(html):
    h = re.sub(r'<(script|style|head)\b.*?</\1>', ' ', html, flags=re.S | re.I)
    return re.sub(r'<[^>]+>', ' ', h)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('fichero')
    ap.add_argument('--promete', type=int, required=True,
                    help='cuantos items promete el post (5 errores, 7 senales...)')
    a = ap.parse_args()

    html = io.open(a.fichero, encoding='utf-8').read()
    fallos, avisos = [], []

    # ── 1. el indice es la promesa ──────────────────────────────────────────
    numeradas = [m.group(1).strip() for m in
                 re.finditer(r'<span class="section-number">(.*?)</span>', html, re.S)]
    reales = [n for n in numeradas if re.fullmatch(r'0?\d+', n)]
    if len(reales) != a.promete:
        fallos.append('El post promete %d, pero la guia tiene %d secciones numeradas '
                      '(§4.5.0-YO-LO-HAGO). Las de consulta van SIN numerar.'
                      % (a.promete, len(reales)))

    toc = re.findall(r'<nav class="toc"[^>]*>(.*?)</nav>', html, re.S)
    if toc:
        n_toc = len(re.findall(r'<a\b', toc[0]))
        if n_toc < a.promete:
            fallos.append('El indice tiene %d enlaces y la promesa son %d.' % (n_toc, a.promete))

    # ── 2. ningun dato se pierde al repartir ────────────────────────────────
    datos = html.count('<div class="data-row">')
    fuentes = len(re.findall(r'class="source"', html))
    if datos and fuentes < datos:
        fallos.append('%d datos pero solo %d fuentes: hay datos sin citar.' % (datos, fuentes))

    # ── 3. tildes comidas ───────────────────────────────────────────────────
    visible = texto_visible(html)
    comidas = sorted({w for w in SIN_TILDE
                      if re.search(r'\b%s\b' % re.escape(w), visible, re.I)})
    if comidas:
        fallos.append('Tildes comidas: %s' % ', '.join(comidas))

    # ── 4. ingles suelto ────────────────────────────────────────────────────
    suelto = sorted({w for w in INGLES if re.search(re.escape(w), visible, re.I)})
    if suelto:
        avisos.append('Ingles suelto en un recurso en castellano: %s' % ', '.join(suelto))

    # ── 5. la guia no se indexa ─────────────────────────────────────────────
    # Las dos mitades del gate: robots.txt Y la meta noindex (playbook §14).
    # El 17/09 se vio que /perfil/ y /mensajes/ llevaban meses sin la meta:
    # robots.txt no impide indexar una URL que Google encuentra enlazada.
    if not re.search(r'<meta\s+name="robots"\s+content="noindex', html, re.I):
        fallos.append('La guia no lleva <meta name="robots" content="noindex">: '
                      'Google puede indexarla y el gate no sirve (playbook §14).')

    # ── salida ──────────────────────────────────────────────────────────────
    total = 5
    print('Recurso: %s' % a.fichero)
    print('  secciones numeradas: %d (promesa: %d)' % (len(reales), a.promete))
    print('  datos: %d  ·  fuentes: %d' % (datos, fuentes))
    for f in fallos:
        print('  ERROR  %s' % f)
    for v in avisos:
        print('  AVISO  %s' % v)
    ok = total - len(fallos)
    print('%s Validador de recurso %d/%d' % ('OK' if not fallos else 'FALLA', ok, total))
    return 1 if fallos else 0


if __name__ == '__main__':
    sys.exit(main())
