#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""validar-video.py — el pase MECANICO del guion de un video (voz en off = subtitulos).

POR QUE EXISTE (Iker, 2026-09-30). El primer video de la casa se entrego con un guion
que "no era de video ni era de nada": nueve frases sueltas de 2-5 palabras que
describian lo que ya se veia en los planos, sin leer los apuntes de video (Rodri,
Jenny). validar-post.py no lo podia cazar: mira posts de texto. Esto es su gemelo
para la VOZ EN OFF, y el caption se sigue pasando por validar-post.py.

USO:
    python scripts/validar-video.py <voz.txt> [--caption <caption.txt>] [--cuenta unai]
                                    [--pilar-video manana] [--publica-manana]

Lo que comprueba (fallo duro salvo que diga AVISO):
  - puntuacion de persona real (brand-voice §3): cero guion largo, cero coma antes
    de "y", cero dos puntos en medio de una frase
  - cifras en digito (global §3.6): los subtitulos son la voz, y la voz se escribe
    como se subtitula
  - duracion: <=85 palabras (~30 s a 2,8 palabras/s, techo de Iker) y AVISO por
    debajo de 35
  - NARRACION, NO TELEGRAMA (video §6.5b): si mas del 40% de las frases tienen 4
    palabras o menos, es una lista leida en voz alta
  - el gancho = la primera frase: 6-10 palabras (video §6.3), y en el pilar
    "una manana" empieza por "Una mañana" con articulo
  - promesas vetadas (global §4.4b-MUNICION): automatismo y volumen
  - anglicismos con traduccion llana (brand-voice §2b)
  - registro de Unai (brand-voice §1b): nada de expresiones de calle
  - el caption no manda al final del video (video §6.5, retencion) y pasa entero
    por validar-post.py

Lo que NO puede ver y se imprime como checklist para contestarlo POR ESCRITO:
el chequeo de 9 puntos del gancho (video §6.3-CHECK), la voz que complementa el
plano en vez de describirlo (video §6.5c) y el punto 36 del playbook.
"""
import argparse
import importlib.util
import io
import os
import re
import subprocess
import sys

AQUI = os.path.dirname(os.path.abspath(__file__))

# Se importan las listas de validar-post.py en vez de copiarlas: dos copias de la
# misma lista divergen en cuanto se toca una (working-preferences, 2026-08-21).
_spec = importlib.util.spec_from_file_location('vp', os.path.join(AQUI, 'validar-post.py'))
vp = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(vp)

ANGLICISMOS = r'\b(pipeline|funnel|forecast|workflow|engagement|insights?|pitch|closing|prompts?)\b'
CALLE_UNAI = r'(ni de broma|flipa\w*|de locos|se queda tieso|de la muerte|de infarto|a saco|mogoll[oó]n)'
MANDA_AL_FINAL = (r'(al final del v[ií]deo|[uú]ltimo plano|hasta el final|no te pierdas el final'
                  r'|espera al final|qu[eé]date hasta)')

res = []


def chk(ok, nombre, detalle='', aviso=False):
    res.append((ok, nombre, detalle, aviso))


def frases(texto):
    t = re.sub(r'\s+', ' ', texto.strip())
    partes = re.split(r'(?<=[.!?…])\s+', t)
    return [p.strip() for p in partes if p.strip()]


def palabras(s):
    return [w for w in re.findall(r"[\wáéíóúñü]+", s, re.I)]


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('voz')
    ap.add_argument('--caption')
    ap.add_argument('--cuenta')
    ap.add_argument('--pilar-video', default='manana', choices=['manana', 'otro'])
    ap.add_argument('--publica-manana', action='store_true')
    ap.add_argument('--carpeta', help='carpeta con los clips grabados')
    ap.add_argument('--planos', help='mapa de planos: cada clip usado o DESCARTADO con su motivo')
    a = ap.parse_args()

    voz = io.open(a.voz, encoding='utf-8').read().strip()
    fr = frases(voz)
    n = len(palabras(voz))

    chk(not re.search(r'[—–]', voz), 'Voz: sin guion largo (brand-voice §3)')
    m = re.findall(r',\s+[ye]\s', voz)
    chk(not m, 'Voz: sin coma antes de "y" (brand-voice §3)', f'{len(m)} encontradas' if m else '')
    dp = re.search(r':\s*\S', re.sub(r'\d:\d', '', voz))
    chk(not dp, 'Voz: sin dos puntos en medio de una frase (brand-voice §3)')
    m = re.findall(vp.NUMERO_EN_LETRA, voz, re.I)
    chk(not m, 'Voz: cifras en digito, los subtitulos son la voz (global §3.6)', f'{m[:3]}' if m else '')

    # 2026-09-30 (Iker): "quiero un video de maximo 20, si dura unos 21 segundos estaria
    # guay". Referencias: la rampa 15,8 s con 66% de retencion; Jenny, TikTok 10-20 s.
    chk(n <= 70, 'Voz: 25 s como mucho (<=70 palabras a 2,8/s)', f'{n} palabras, ~{round(n / 2.8)} s')
    chk(n <= 62, 'Voz: en torno a 21 s, el objetivo de Iker (<=62 palabras)', f'{n} palabras, ~{round(n / 2.8)} s', aviso=True)
    chk(n >= 35, 'Voz: dura 12 s o mas (>=35 palabras)', f'{n} palabras', aviso=True)

    cortas = [f for f in fr if len(palabras(f)) <= 4]
    pct = round(100 * len(cortas) / len(fr)) if fr else 0
    chk(pct <= 40, 'Voz: NARRACION, no telegrama (<=40% de frases de 4 palabras o menos, video §6.5b)',
        f'{pct}% cortas: {cortas[:4]}')

    gancho = fr[0] if fr else ''
    ng = len(palabras(gancho))
    chk(6 <= ng <= 10, 'Gancho (1a frase): 6-10 palabras (video §6.3)', f'{ng}: "{gancho}"')
    if a.pilar_video == 'manana':
        chk(gancho.lower().startswith('una mañana'), 'Gancho: empieza por "Una mañana", con articulo (video §6.3)')

    m = re.search(vp.PROMESA_AUTOMATISMO, voz, re.I)
    chk(not m, 'Voz: no promete AUTOMATISMO (global §4.4b-MUNICION)', f'"{m.group(0)}"' if m else '')
    m = re.search(vp.PROMESA_VOLUMEN, voz, re.I)
    chk(not m, 'Voz: no vende VOLUMEN (global §4.4b-MUNICION)', f'"{m.group(0)}"' if m else '', aviso=True)
    m = re.search(ANGLICISMOS, voz, re.I)
    chk(not m, 'Voz: sin anglicismos con traduccion llana (brand-voice §2b)', f'"{m.group(0)}"' if m else '')
    m = re.search(vp.AI_TELLS, voz, re.I)
    chk(not m, 'Voz: sin AI-tells (brand-voice §3)', f'"{m.group(0)}"' if m else '')
    if (a.cuenta or '').lower() == 'unai':
        m = re.search(CALLE_UNAI, voz, re.I)
        chk(not m, 'Voz: registro de Unai, sin expresiones de calle (brand-voice §1b)',
            f'"{m.group(0)}"' if m else '')

    # 2026-09-30 (Iker): "no puede ser que haya planos que no me hayas incluido". En el
    # primer video se quedaron fuera 4899 (un trabajador) y otros cuatro sin decir por que.
    # Cada clip de la carpeta tiene que salir en el mapa: usado, o DESCARTADO con motivo
    # (normalmente, duplicado de otro).
    if a.carpeta and a.planos:
        clips = sorted({os.path.splitext(f)[0].upper() for f in os.listdir(a.carpeta)
                        if re.search(r'\.(mov|mp4|m4v)$', f, re.I)})
        mapa = io.open(a.planos, encoding='utf-8').read().upper()
        faltan = [c for c in clips if c.replace('IMG_', '') not in mapa]
        chk(not faltan, f'Planos: los {len(clips)} clips de la carpeta estan en el mapa (usados o descartados con motivo)',
            f'faltan {faltan}' if faltan else '')
        sin_motivo = [l.strip() for l in mapa.split('\n') if 'DESCART' in l and 'PORQUE' not in l and 'DUPLICADO' not in l]
        chk(not sin_motivo, 'Planos: todo descarte dice por que (duplicado de X / porque...)', f'{sin_motivo[:2]}')
    salida_caption = ''
    if a.caption:
        cap = io.open(a.caption, encoding='utf-8').read()
        m = re.search(MANDA_AL_FINAL, cap, re.I)
        chk(not m, 'Caption: no manda al final del video (video §6.5, retencion)', f'"{m.group(0)}"' if m else '')
        cmd = [sys.executable, os.path.join(AQUI, 'validar-post.py'), a.caption, '--pilar', 'meme',
               '--referencia-fuera', '--meme-sobrio']
        if a.cuenta:
            cmd += ['--cuenta', a.cuenta]
        if a.publica_manana:
            cmd += ['--publica-manana']
        salida_caption = subprocess.run(cmd, capture_output=True, text=True, encoding='utf-8').stdout or ''
        tot = re.search(r'(\d+)/(\d+) checks', salida_caption)
        chk(bool(tot) and tot.group(1) == tot.group(2), 'Caption: validar-post.py entero en verde',
            tot.group(0) if tot else 'validar-post.py NO ha terminado: esta roto')

    print('\n  VALIDADOR DE VIDEO\n')
    duros = [r for r in res if not r[3]]
    for ok, nombre, det, aviso in res:
        marca = 'OK  ' if ok else ('AVISO' if aviso else 'FALLA')
        print(f'  {marca} {nombre}')
        if det and (not ok or aviso):
            print(f'        └─ {det}')
    if salida_caption:
        for l in salida_caption.split('\n'):
            if 'FALLA' in l:
                print('  [caption] ' + l.strip())
    print('\n  LO QUE EL SCRIPT NO VE, Y SE CONTESTA POR ESCRITO EN LA ENTREGA:')
    print('   1. Chequeo de 9 puntos del gancho (video §6.3-CHECK): bucle, autogol, segunda lectura, ancla,')
    print('      punch, rodable, verdad, registro, longitud.')
    print('   2. La voz COMPLEMENTA el plano, no lo describe (video §6.5c): frase por frase, ¿dice algo que')
    print('      la imagen no puede decir?')
    print('   3. Rodri y Jenny (Documentos/Mario/APRILYNNE): narracion que encadena, giro sin insinuar antes,')
    print('      corte seco tras el pago.')
    print('   4. Punto 36 del playbook (video §4): sin sonido, primer frame, promesa cumplida, giro, corte.')
    print('   5. 3 propuestas de voz distintas de verdad (working-preferences §1d-BIS).')
    ok_duros = sum(1 for r in duros if r[0])
    print(f'\n  {ok_duros}/{len(duros)} checks · {len(res) - len(duros)} aviso(s)')
    sys.exit(0 if ok_duros == len(duros) else 1)


if __name__ == '__main__':
    main()
