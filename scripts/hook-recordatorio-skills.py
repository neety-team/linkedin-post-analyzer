#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Hook de UserPromptSubmit: recuerda LEER LAS SKILLS ENTERAS, pero SOLO cuando
la peticion es de contenido (LinkedIn o email).

⛔ POR QUE EXISTE ESTE FILTRO (Mario, 2026-08-26). Antes el hook era un `echo`
que inyectaba el recordatorio en TODOS los mensajes, aunque la tarea fuera
depurar codigo. El texto empezaba por "Si esta peticion toca un POST DE
LINKEDIN o un EMAIL", asi que la condicion estaba escrita pero no la comprobaba
nadie: la evaluaba el modelo despues de haberla leido.

Un recordatorio que sale siempre deja de ser una señal y pasa a ser ruido, que
es exactamente lo que le quita fuerza justo el dia que SI toca. Ahora la
condicion se comprueba aqui, y si no es de contenido el hook no dice nada.

Entrada: JSON por stdin, con el prompt del usuario en `prompt`.
Salida: el JSON de `additionalContext`, o NADA.
"""
import json
import re
import sys
import unicodedata


def sin_tildes(s):
    return ''.join(c for c in unicodedata.normalize('NFD', s)
                   if unicodedata.category(c) != 'Mn').lower()


# Las palabras que encienden el recordatorio. Van sin tildes porque el prompt se
# normaliza antes de comparar, y con \b para que "post" no case dentro de
# "postgres" ni "mapa" dentro de "mapaches".
#
# Cubren las tres formas de pedir lo mismo: el PILAR (meme, mapa, los 10...), el
# ARTEFACTO (publicacion, post, newsletter, gancho...) y el SITIO (linkedin).
DISPARADORES = re.compile(
    r'\b('
    r'linkedin|publicacion|publicaciones|publicar|post|posts'
    r'|meme|memes|mapa|mapas|los\s*10|despiece|lead\s*magnet|leadmagnet'
    r'|historia|historias|peloteo|evento|tarjeta'
    r'|newsletter|correo|correos|email|emails|mail|mailing|secuencia|campana|tanda'
    r'|gancho|ganchos|hook|cuerpo\s+del\s+post|spam\s*ninja|cta'
    r'|pilar|pilares|swipe|outlier|outliers'
    r'|caption|carrusel|copy'
    r')\b',
    re.I,
)

# 2026-09-30 (Iker): el primer video se entrego sin leer la skill de video ni los
# apuntes (Rodri, Jenny) y el guion "no era de video ni era de nada". Si la peticion
# es de VIDEO, el recordatorio nombra los ficheros exactos y el validador.
VIDEO = re.compile(
    r'\b(video|videos|reel|reels|tiktok|short|shorts|guion|guiones|voz en off|elevenlabs'
    r'|plano|planos|b-?roll|premiere|subtitulo|subtitulos)\b',
    re.I,
)

TEXTO_VIDEO = (
    " ES UN VIDEO: carga ENTERO docs/skills/video.md (sobre todo §6: el pilar, el "
    "chequeo de 9 puntos del gancho y §6.5b-c: la voz es NARRACION que COMPLEMENTA "
    "el plano, nunca lo describe) y LEE los apuntes de "
    "C:/Users/LENOVO/Documents/Mario/APRILYNNE/ (TRANSCRIPCIONES y CHECKLIST "
    "@rodri_qf, APUNTES JENNY SHORTS 1 y 2, APUNTES TIKTOK) antes de proponer nada. "
    "Entrega 3 propuestas de voz y pasa python scripts/validar-video.py <voz.txt> "
    "--caption <caption.txt> --cuenta X, pegando su resultado."
)

TEXTO = (
    "RECORDATORIO AUTOMATICO (hook, no lo ha escrito el usuario). Esta peticion "
    "parece tocar un POST DE LINKEDIN o un EMAIL: ABRE Y LEE ENTEROS los "
    "ficheros de docs/skills/ que apliquen ANTES de escribir nada, sin resumir y "
    "sin fiarte de lo que creas recordar. El runbook del pilar manda sobre tu "
    "memoria: cada vez que has reconstruido una receta de memoria has entregado "
    "una version mas pobre (paleta olvidada, cliches perdidos, referencias ya "
    "usadas). Si NO te queda contexto para releerlos enteros, DILO y pide abrir "
    "un chat nuevo en vez de escribir de memoria."
)


def main():
    try:
        datos = json.load(sys.stdin)
    except Exception:
        # Sin JSON legible no se puede decidir, y el fallo seguro es CALLARSE: un
        # recordatorio de mas en una tarea de codigo es ruido, y de menos solo
        # cuesta que el modelo lea las skills por su cuenta, que ya es su deber.
        return

    prompt = sin_tildes(str(datos.get('prompt') or ''))
    if not DISPARADORES.search(prompt) and not VIDEO.search(prompt):
        return

    texto = TEXTO + (TEXTO_VIDEO if VIDEO.search(prompt) else '')
    print(json.dumps({
        "hookSpecificOutput": {
            "hookEventName": "UserPromptSubmit",
            "additionalContext": texto,
        }
    }, ensure_ascii=False))


if __name__ == '__main__':
    main()
