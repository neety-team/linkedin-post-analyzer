#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
validar-email.py — el pase de validación MECÁNICO de un email de la newsletter de Neety.

Mismo espíritu que validar-post.py: las reglas viven en docs/skills/email-marketing.md,
pero estar escritas no basta. Esto hace determinista lo mecanizable.

Lo que NO hace: no juzga si el asunto abre un gap real, si la historia es buena o
si el caso es verdadero. Eso es criterio y vive en email-marketing §9.

Formato esperado del fichero:
    REMITENTE: Iker|Asier|Unai|Kaixito
    ASUNTO: ...
    PREVIEW: ...
    <línea en blanco>
    (cuerpo)

Uso:
    python scripts/validar-email.py <fichero.txt> --punch "neutro -> elegido -> se pasa" [--antes <version anterior.txt>]
    (--punch: la escalera del verbo del asunto, obligatoria, email-marketing §2-PUNCH)
    (--antes: retoque pedido sobre una version ya validada; sale ❌ si abre un fallo o un aviso
    que la anterior no tenia, working-preferences §1d-BIS)

Salida: tabla de checks + "N/M". Exit 1 si hay violaciones.
"""
import sys, os, re, io

REMITENTES = ('iker', 'asier', 'unai', 'kaixito')

# brand-voice §3 — misma lista literal que validar-post.py (AI-tells)
AI_TELLS = (r'(lo m[aá]s importante|lo fundamental|lo esencial|es (fundamental|crucial|clave) que'
            r'|hoy en d[ií]a|en la actualidad|en el mundo actual|sin embargo|no obstante|asimismo'
            r'|por lo tanto|en consecuencia|de esta manera|posibilita|optimizar|maximizar|potenciar'
            r'|numerosos|en definitiva|en resumen|en conclusi[oó]n|la clave est[aá] en|el secreto es)')

# email-marketing §2 — palabras que huelen a promoción en el ASUNTO
SPAM_ASUNTO = r'(gratis|oferta|descuento|[uú]ltima oportunidad|urgente|no te lo pierdas|newsletter de)'

# email-marketing §4 — CTA floja prohibida (apuntes de expertos)
CTA_FLOJA = r'(ya me dices|ya me cuentas|qu[eé]date atento|estamos en contacto)'

# email-marketing §7 / global §4.4b-MUNICIÓN — LAS DOS PROMESAS VETADAS.
# Misma lista literal que validar-post.py, y aquí pesan MÁS: el lector nos lee
# dentro de la misma bandeja donde recibe los mensajes automatizados que ya
# ignora. Cada una es una objeción de 5 empresas en el informe del 2026-08-24.
#   AUTOMATISMO → fallo duro (son fórmulas de oferta, no hay lectura buena).
#   VOLUMEN     → aviso (el correo PUEDE nombrar el volumen como enemigo, que es
#                 justo el pilar 3 de §5: "más leads no era tu problema").
PROMESA_AUTOMATISMO = (r'(lo hacemos por ti|lo hace por ti|escribe por ti|escribimos por ti'
                       r'|contactamos por ti|prospectamos por ti|vendemos por ti'
                       r'|sin mover un dedo|sin que muevas un dedo|sin esfuerzo'
                       r'|t[uú] solo cierras|solo tienes que cerrar|solo tienes que firmar'
                       r'|(lo |los |el mensaje |los mensajes )?(lo )?escribe la ia'
                       r'|en piloto autom[aá]tico|se (contactan|escriben|mandan) solos?'
                       r'|nos encargamos de escribir)')
PROMESA_VOLUMEN = (r'(cientos de (leads|contactos|empresas|clientes)'
                   r'|miles de (leads|contactos|correos|mensajes)'
                   r'|m[aá]s (leads|contactos)\b|\bx\s?[2-9]\b|de volumen|a volumen)')

# global §3.6 — cifras en dígito, nunca en letra
NUMERO_EN_LETRA = (r'\b(dos|tres|cuatro|cinco|seis|siete|ocho|nueve|diez|once|doce|trece|catorce|quince'
                   r'|diecis[eé]is|diecisiete|dieciocho|diecinueve|veinte|treinta|cuarenta|cincuenta'
                   r'|sesenta|setenta|ochenta|noventa|cien|ciento|doscientos|trescientos|cuatrocientos'
                   r'|quinientos|seiscientos|setecientos|ochocientos|novecientos)\b')

EMOJI = re.compile('[\U0001F000-\U0001FAFF☀-➿]')

# Corpus Timepack (353 asuntos, medido 2026-07-27): mediana 43 chars, media 43.6,
# p90 62, mediana 8 palabras. Solo el 10% lleva número y 1 de 353 acaba en puntuación.
# El techo se pone en el p90: pasarse no es "estilo", es salirse del corpus ganador.
ASUNTO_MAX = 62

# email-marketing §8g/§8h: la mediana del corpus en cinco ventanas es 43 -> 36 -> 36 -> 31
# -> 36 caracteres. El 31 fue una semana suelta (§8h, 2026-09-21): la banda estable es 31-37.
# El techo duro sigue en 62 (p90), pero la DIANA es otra: a partir de aqui se avisa, porque
# casi siempre hay una version mas corta de la misma idea.
ASUNTO_DIANA = 40


def fallo(msg):
    return ('❌', msg)

def ok(msg):
    return ('✅', msg)

def aviso(msg):
    return ('⚠️', msg)


def main():
    # Windows saca cp1252 por defecto y los emojis del informe lo tiran
    if hasattr(sys.stdout, 'reconfigure'):
        sys.stdout.reconfigure(encoding='utf-8', errors='replace')
    if len(sys.argv) < 2:
        print(__doc__)
        sys.exit(2)
    ruta = sys.argv[1]
    with io.open(ruta, encoding='utf-8') as f:
        crudo = f.read()

    lineas = crudo.splitlines()
    cab = {}
    cuerpo_desde = 0
    for i, l in enumerate(lineas[:6]):
        m = re.match(r'^(REMITENTE|ASUNTO|PREVIEW)\s*:\s*(.*)$', l.strip(), re.I)
        if m:
            cab[m.group(1).upper()] = m.group(2).strip()
            cuerpo_desde = i + 1
    cuerpo_lineas = lineas[cuerpo_desde:]
    # quitar blancos iniciales
    while cuerpo_lineas and not cuerpo_lineas[0].strip():
        cuerpo_lineas = cuerpo_lineas[1:]
    cuerpo = '\n'.join(cuerpo_lineas)
    cuerpo_low = cuerpo.lower()

    checks = []

    # --- cabecera ---
    if all(k in cab for k in ('REMITENTE', 'ASUNTO', 'PREVIEW')):
        checks.append(ok('Cabecera REMITENTE/ASUNTO/PREVIEW completa'))
    else:
        checks.append(fallo('Faltan campos de cabecera (REMITENTE/ASUNTO/PREVIEW)'))

    rem = cab.get('REMITENTE', '').lower()
    # match por prefijo: el From va con marca ("Kaixito de Neety", email-marketing §1)
    rem_base = next((r for r in REMITENTES if rem.startswith(r)), '')
    if rem_base:
        checks.append(ok(f'Remitente válido ({cab["REMITENTE"]})'))
    else:
        checks.append(fallo(f'Remitente "{cab.get("REMITENTE", "?")}" no es Iker/Asier/Unai/Kaixito'))

    asunto = cab.get('ASUNTO', '')
    # --- asunto ---
    if asunto:
        if len(asunto) <= ASUNTO_MAX:
            checks.append(ok(f'Asunto {len(asunto)} chars (techo {ASUNTO_MAX}, corpus Timepack)'))
        else:
            checks.append(fallo(f'Asunto {len(asunto)} chars > {ASUNTO_MAX} (mediana Timepack: 43)'))
        if ASUNTO_DIANA < len(asunto) <= ASUNTO_MAX:
            checks.append(aviso(f'Asunto de {len(asunto)} chars: pasa de la diana de {ASUNTO_DIANA} '
                                f'(§8h: la mediana del corpus va de 31 a 37 en cinco ventanas). '
                                f'Busca el recorte en una palabra que no sostenga el verbo ni la persona'))
        cifras = re.findall(r'\d+[.,]?\d*', asunto)
        if len(cifras) <= 1:
            checks.append(ok('Asunto con ≤1 número'))
        else:
            checks.append(fallo(f'Asunto con {len(cifras)} números (máx 1, como el hook)'))
        # Corpus: 7% lleva UNA palabra en mayúsculas como golpe; ninguno lleva dos o más
        mayus = re.findall(r'\b[A-ZÁÉÍÓÚÑ]{4,}\b', asunto)
        if len(mayus) <= 1:
            checks.append(ok('Asunto con ≤1 palabra en mayúsculas'))
        else:
            checks.append(fallo(f'Asunto con {len(mayus)} palabras en MAYÚSCULAS (máx 1, corpus Timepack)'))
        # §2 + §8g: el 97% del corpus espanol que pregunta pone la ¿; los que se la saltan
        # son los mismos que escriben "Enserio" y "testominio". Desviarse en ESTILO es
        # diferenciarse; desviarse en CORRECCION es parecer descuidado, y lo nota un lector
        # de 55 anos.
        # ⭐ Iker, 2026-09-28 (cuarta vez, y ya es regla): la pregunta en MINUSCULA va sin
        # la ¿, porque la minuscula pegada al signo no tiene sentido y sin el se lee como
        # un WhatsApp. Correos 4, 5 y 6. Si el asunto empieza en MAYUSCULA, la ¿ se pone.
        if '?' in asunto and '¿' not in asunto and asunto[:1].islower():
            checks.append(ok('Pregunta en minúscula sin "¿": registro WhatsApp (§2, decisión de Iker 28/09)'))
        elif '?' in asunto and '¿' not in asunto:
            checks.append(fallo('Asunto con "?" y sin "¿" de apertura (§2: en lo correcto no nos desviamos)'))
        elif '?' in asunto:
            checks.append(ok('Interrogacion con su ¿ de apertura'))
        if '!' in asunto or '¡' in asunto:
            checks.append(fallo('Asunto con exclamación (0 de 353 en el corpus)'))
        else:
            checks.append(ok('Asunto sin exclamaciones'))
        if re.search(SPAM_ASUNTO, asunto, re.I):
            checks.append(fallo('Asunto con palabra de promoción/spam'))
        else:
            checks.append(ok('Asunto sin palabras de promoción'))
        if len(EMOJI.findall(asunto)) <= 1:
            checks.append(ok('Asunto con ≤1 emoji'))
        else:
            checks.append(fallo('Asunto con 2+ emojis'))
        # §8g (2026-09-14) corrige el "nunca punto final" que salia solo de Timepack:
        # 14 de 75 asuntos del corpus nuevo lo llevan y son de los mejores. La condicion es
        # que sea una AFIRMACION SECA de 2-4 palabras ("No escribas mas.", "Hoy es dia 1.").
        # Con mas palabras el punto vuelve a leerse como titular. Los dos puntos siguen sin
        # aparecer ni una vez en los 75.
        _fin = asunto.rstrip()
        if _fin.endswith(':'):
            checks.append(aviso('Asunto acabado en ":" (0 de 75 en el corpus nuevo)'))
        elif _fin.endswith('.') and not _fin.endswith('...'):
            if len(asunto.split()) <= 4:
                checks.append(ok('Asunto con punto final y ≤4 palabras (§8g: afirmación seca, vale)'))
            else:
                checks.append(aviso(f'Asunto con punto final y {len(asunto.split())} palabras: el punto '
                                    f'solo funciona en afirmaciones secas de 2-4 (§8g)'))
        else:
            checks.append(ok('Asunto sin puntuación de cierre'))

    preview = cab.get('PREVIEW', '')
    primera = cuerpo_lineas[0].strip() if cuerpo_lineas else ''
    if preview and primera and preview.lower() != primera.lower():
        checks.append(ok('Preview manual y distinto de la primera línea'))
    else:
        checks.append(fallo('Preview vacío o idéntico a la primera línea del cuerpo'))

    # --- cuerpo: puntuación delatora (brand-voice §3) ---
    if '—' in crudo or '–' in crudo:
        checks.append(fallo('Guion largo — encontrado (delator IA nº 1)'))
    else:
        checks.append(ok('Cero guiones largos'))
    if re.search(r',\s+(y|e)\s', cuerpo):
        checks.append(fallo('Coma antes de "y"/"e" en el cuerpo'))
    else:
        checks.append(ok('Cero comas antes de "y"'))
    # 2026-09-29 (Iker): los dos puntos en medio de una frase son el mismo delator que
    # el guion largo. Se salvan el ':' pegado a un enlace, las horas (10:00) y la linea
    # que ACABA en ':' presentando algo debajo (esa la mira su propio check si lo hay).
    _dp = []
    for _l in cuerpo.split('\n'):
        # el marcador [GIF: ...] no es una frase: es la instruccion que lee
        # montar-correo-brevo.py, y lleva ':' desde el correo 4 (2026-10-05)
        if _l.strip().startswith('['):
            continue
        _s = re.sub(r'https?://\S+', '', _l)
        _s = re.sub(r'\d:\d', '', _s)
        if re.search(r':\s*\S', _s):
            _dp.append(_l.strip()[:60])
    if _dp:
        checks.append(fallo(f'Dos puntos en medio de una frase: {_dp[:2]} → "es", un punto o una coma'))
    else:
        checks.append(ok('Sin dos puntos en medio de una frase'))

    # --- cuerpo: markdown (el email va en texto plano) ---
    if re.search(r'(\*\*|__|^#{1,3}\s|```)', cuerpo, re.M):
        checks.append(fallo('Markdown dentro del email'))
    else:
        checks.append(ok('Sin markdown en el cuerpo'))

    # --- apertura (email-marketing §3: sin saludo, sin presentación) ---
    if re.match(r'^(hola|buenas|buenos d[ií]as|querido|estimado|hey|hello)\b', primera, re.I):
        checks.append(fallo('El cuerpo abre con saludo (la norma de la casa es entrar sin "hola")'))
    else:
        checks.append(ok('Abre sin saludo, directo a la primera línea'))
    if re.match(r'^(somos neety|soy \w+ de neety|en neety somos)', primera, re.I):
        checks.append(fallo('Abre presentándose (la primera línea recompensa, no se presenta)'))
    else:
        checks.append(ok('No abre con presentación'))

    # --- MICRO-APERTURA (§8d punto 1, §5-HISTORIA, §8g punto 2) ---
    # El patron mas fuerte del corpus espanol: una orden o una palabra suelta, CON PUNTO,
    # y linea en blanco detras. Es un freno: obliga a parar antes de leer. Isra "Mira.",
    # RunnerPro "Escuchame." / "Oye." / "Domingo.", Hugo "Atiende.", Iker "Te cuento.".
    # Es aviso y no fallo porque hay correos que abren in medias res a proposito (§3.1).
    _pal = len(primera.split())
    if 1 <= _pal <= 4 and primera.rstrip().endswith(('.', '?')):
        checks.append(ok(f'Micro-apertura de {_pal} palabra(s) con punto ("{primera.strip()}")'))
    else:
        checks.append(aviso(f'Sin micro-apertura: la línea 1 tiene {_pal} palabras. El corpus abre con '
                            f'1-3 palabras y punto ("Mira." / "Oye." / "Te cuento.") y línea en blanco '
                            f'detrás. Si es un arranque in medias res a propósito, ignora el aviso'))

    # --- párrafos de prosa ≤3 líneas (global §3.2 heredado) ---
    # Excepción, la misma que en LinkedIn (global §3.2): SOLO las listas con MARCADOR
    # (→, guion, viñeta, numeradas) quedan fuera del tope, porque son el bloque de
    # empresas de los mapas, que va en bloques de 4.
    # ⛔ Una enumeración de PROSA con anáfora NO está exenta: el tope de 3 líneas
    # también le aplica (Mario, 2026-08-03, corrigiendo una versión de este check que
    # la dejaba pasar con 4). En LinkedIn no se hacen bloques de 4 de prosa, nunca.
    def es_lista_con_marcador(b):
        ls = [l.strip() for l in b.splitlines() if l.strip()]
        return len(ls) >= 3 and all(re.match(r'^(→|-|•|\d+[.)])', l) for l in ls)

    bloques = [b for b in cuerpo.split('\n\n') if b.strip()]
    gordos = [b for b in bloques
              if len([l for l in b.splitlines() if l.strip()]) > 3
              and not es_lista_con_marcador(b)]
    if gordos:
        checks.append(fallo(f'{len(gordos)} bloque(s) de prosa con 4+ líneas (máx 3)'))
    else:
        checks.append(ok('Todos los bloques de prosa ≤3 líneas'))

    # --- RITMO DE BLOQUES (§3 + global §3.2, Iker 2026-09-15) ------------
    # Portado de validar-post.py, donde vive desde el 2026-08-06. AQUI NO ESTABA,
    # y por eso el correo 4 salio con un `1-2-1-2` de apertura y sin un solo
    # bloque de TRES: dos iteraciones de Iker para cazar algo que es aritmetica.
    # Iker, 2026-09-15: "nunca puedes poner un ritmo predecible de bloques ni en
    # el correo ni en las publicaciones, y nos faltaria un bloque de tres".
    # El GIF y las postdatas no son bloques de prosa: no entran en el patron.
    _rb = [b for b in bloques
           if not b.strip().startswith('[')
           and not re.match(r'^\s*PP?\.?D\.?[ .:]', b, re.I)
           and not es_lista_con_marcador(b)]
    # ⛔ EL TRAMO DE LA VENTA NO ENTRA EN EL PATRON, y no es una excusa: su forma
    # la IMPONE otra regla (`global §4.4b-EVENTO-CONTEXTO`: linea individual de
    # contexto + bloque de dos del ninja), asi que contarlo seria medir una regla
    # contra otra. Sin esta exclusion el check tumba el CORREO 3, que esta
    # publicado y aprobado: ese es el aviso de §3.2 de que cuando un check tumba
    # a un ganador, lo que hay que revisar es el check.
    _lineas_de = lambda bs: [len([l for l in b.splitlines() if l.strip()]) for b in bs]
    _pat_full = _lineas_de(_rb)          # el texto tal y como lo ve el lector
    _idx = next((i for i, b in enumerate(_rb) if 'http' in b), None)
    # La linea de contexto es UNA linea suelta. Si el bloque de antes del ninja tiene
    # 2-3 lineas, es cuerpo y cuenta (correo 6, 28/09: un bloque de TRES pegado al
    # ninja se excluia y el check pedia un bloque de tres que ya estaba).
    _ctx = _idx - 1 if _idx and _lineas_de([_rb[_idx - 1]])[0] == 1 else None
    _pat = _lineas_de([b for i, b in enumerate(_rb) if i not in (_idx, _ctx)]
                      if _idx is not None else _rb)
    if len(_pat) >= 6:
        _ritmo = '-'.join(map(str, _pat))
        if any(n >= 3 for n in _pat):
            checks.append(ok(f'Ritmo: hay bloque de TRES ({_ritmo})'))
        else:
            checks.append(fallo(f'Ritmo {_ritmo}: todo unos y doses, se lee plano. '
                                f'Hace falta al menos un bloque de TRES'))
        _c2 = any(_pat[i] == _pat[i+2] and _pat[i+1] == _pat[i+3] and _pat[i] != _pat[i+1]
                  for i in range(len(_pat)-3))
        _c4 = any(_pat[i:i+4] == _pat[i+4:i+8] and len(set(_pat[i:i+4])) > 1
                  for i in range(len(_pat)-7))
        # ⚠️ AVISO Y NO FALLO DURO, y el motivo es un dato nuestro: el CORREO 3
        # (publicado el 09/09, aprobado, y el de mejor CTR de la serie) lleva
        # `1-2-1-3-1-2-1-2-1`, o sea un ciclo de dos. En un correo hay ~10 bloques
        # y media estructura viene impuesta, asi que la alternancia aparece sola.
        # En posts si es fallo duro (`validar-post.py`), que ahi sobra sitio.
        # Lo que hace falta es VERLO antes de entregar, no que el script decida.
        if _c2 or _c4:
            checks.append(aviso(f'Ritmo {_ritmo}: se repite un ciclo de '
                                f'{"dos" if _c2 else "cuatro"} bloques. Rompelo con lineas '
                                f'sueltas seguidas si puedes. OJO: no bloquea porque el '
                                f'correo 3 publicado lleva 1-2-1-3-1-2-1-2-1'))
        else:
            checks.append(ok('Ritmo: sin patron que se repita'))
        # El espejo se mide sobre el texto COMPLETO: es un patron que ve el ojo,
        # y el ojo no excluye el tramo de la venta (al reves, es donde mas canta).
        _esp = next((i for i in range(len(_pat_full)-4)
                     if _pat_full[i] == _pat_full[i+1] == 1 and _pat_full[i+2] > 1
                     and _pat_full[i+3] == _pat_full[i+4] == 1), None)
        if _esp is not None:
            checks.append(aviso(f'Ritmo {"-".join(map(str,_pat_full))}: tramo en espejo 1-1-{_pat_full[_esp+2]}-1-1. '
                                f'Se lee igual del derecho que del reves, y canta mas si el '
                                f'bloque del medio es el del enlace. Mueve un bloque de sitio'))
        # RACHA DE SUELTAS (Iker, 2026-10-13, correo 8): "veo un exceso de lineas
        # individuales entre el primer bloque de dos y el bloque numerico: hay seis".
        # La suelta domina en correo (§3), pero seis seguidas se leen como una lista
        # plana. Se mide sobre lo que ve el lector; la lista con marcador no cuenta.
        _racha, _max_racha = 0, 0
        for n in _pat_full:
            _racha = _racha + 1 if n == 1 else 0
            _max_racha = max(_max_racha, _racha)
        if _max_racha >= 5:
            checks.append(aviso(f'Ritmo: {_max_racha} líneas sueltas seguidas. Mete un bloque de '
                                f'dos o de tres en medio (Iker, 13/10: se lee plano)'))
        else:
            checks.append(ok(f'Ritmo: sin rachas largas de sueltas (máx {_max_racha})'))
        _su = sum(1 for n in _pat if n == 1) / len(_pat)
        if _su >= 0.55:
            checks.append(ok(f'Ritmo: la linea suelta domina ({_su:.0%})'))
        else:
            checks.append(aviso(f'Ritmo {_ritmo}: solo {_su:.0%} son lineas sueltas. En correo '
                                f'la suelta es la base (§3: 92-99% del corpus) y los bloques '
                                f'son la variedad'))

    # ======================================================================
    # PORTADO DE validar-post.py (29/10, email-marketing §3-PORTADOS). El correo 11 salio
    # 45/45 con un salto al ninja (el dolor aparecia por primera vez dentro del bloque),
    # un 2 y un 3 separados solo por el GIF y un ciclo 1-2-1-2-1 al final que el check de
    # ciclo no veia porque excluye el tramo de la venta. Todo eso ya lo miraba el validador
    # de posts. Se cuenta el cuerpo hasta la firma: ni la firma ni las postdatas.
    # ======================================================================
    _i_pd = next((i for i, b in enumerate(bloques) if re.match(r'^\s*PP?\.?D\.?[ .:]', b, re.I)), len(bloques))
    _cb = bloques[:_i_pd]
    if _cb and rem_base and rem_base in _cb[-1].lower() and len(_cb[-1].splitlines()) == 1:
        _cb = _cb[:-1]                                   # fuera la firma
    _ls_de = lambda b: [l.strip() for l in b.splitlines() if l.strip()]
    _prosa = [(i, _ls_de(b)) for i, b in enumerate(_cb)
              if not b.strip().startswith('[') and not es_lista_con_marcador(b)]

    # 1) LINEA INDIVIDUAL ENTRE BLOQUES (§3: "nunca un bloque de 2 pegado a uno de 3, y siempre
    #    una linea individual entre bloques"). Estaba escrito y no lo miraba nadie. El GIF NO
    #    separa: se ve, pero no es una linea, y en Outlook o con imagenes bloqueadas desaparece.
    _pegados = []
    _seq = [b for b in _cb if not es_lista_con_marcador(b)]
    _seq = [_ls_de(b) for b in _seq if not b.strip().startswith('[')]
    for a, b in zip(_seq, _seq[1:]):
        if len(a) > 1 and len(b) > 1:
            _pegados.append(f'{len(a)}+{len(b)} ("{a[0][:30]}…" / "{b[0][:30]}…")')
    if _pegados:
        checks.append(fallo('Bloque pegado a otro bloque, sin línea suelta en medio (el GIF no cuenta): '
                            + ' | '.join(_pegados[:2]) + ' (§3, global §3.2)'))
    else:
        checks.append(ok('Línea individual entre cada bloque de 2-3 (el GIF no separa)'))

    # 2) EL PRIMER BLOQUE MULTIPLE ES DE DOS, y 3) MAS DOSES QUE TRESES (global §3.2, Iker
    #    10/08 y 16/10: "mas lineas individuales, luego bloques de dos y luego de tres").
    _multi = [len(ls) for _, ls in _prosa if len(ls) > 1]
    if _multi and _multi[0] != 2:
        checks.append(aviso(f'El primer bloque múltiple es de {_multi[0]}: los doses van antes que los '
                            f'treses (global §3.2)'))
    elif _multi:
        checks.append(ok('El primer bloque múltiple es de DOS'))
    _n2 = sum(1 for n in _multi if n == 2)
    _n3 = sum(1 for n in _multi if n >= 3)
    if _n3 > _n2:
        checks.append(aviso(f'{_n3} bloque(s) de 3 y {_n2} de 2: el orden de frecuencia es sueltas, '
                            f'luego doses, luego treses (global §3.2)'))
    else:
        checks.append(ok(f'Más doses que treses ({_n2} de 2, {_n3} de 3)'))

    # 4) CADA LINEA DE UN BLOQUE ES UNA ORACION CERRADA (global §3.2, 21/10) y
    # 5) UNA ORACION POR LINEA (Iker, 26/10). Las postdatas quedan fuera: son broma y los
    #    correos 9 y 10, aprobados, llevan dos frases en la PD.
    _partidas, _dos_or = [], []
    for _, ls in _prosa:
        for k, l in enumerate(ls):
            if 'http' in l:
                continue
            _sig = ls[k + 1] if k + 1 < len(ls) else ''
            if len(ls) > 1 and (l.endswith((',', ';')) or (_sig[:1].islower() and 'http' not in _sig)):
                _partidas.append(l[:50])
            if re.search(r'[a-záéíóúñü0-9)%"»”][.!?…]["»”]?\s+[¿¡"«“A-ZÁÉÍÓÚÑ]', l):
                _dos_or.append(l[:50])
    if _partidas:
        checks.append(fallo('Oración partida en varias líneas de un bloque: ' + ' | '.join(_partidas[:2])
                            + ' (cada línea de un bloque se cierra, global §3.2)'))
    else:
        checks.append(ok('Cada línea de un bloque es una oración cerrada'))
    if _dos_or:
        checks.append(aviso('Dos oraciones en una línea: ' + ' | '.join(_dos_or[:2])
                            + '. Van en dos líneas, en bloque (Iker, 26/10)'))
    else:
        checks.append(ok('Una oración por línea en el cuerpo'))

    # 6) LINEAS CORTAS (§3: diana 7-9 palabras; "si una linea pasa de ~12, partela") y
    # 7) RITMO VISUAL EN EL MOVIL (global §3.2-VISUAL, 21/10): el patron cuenta las lineas que
    #    escribo, el lector ve las que pinta el movil. Se mide con el tope de 55 del ninja
    #    (§5-NINJA: pasando de ahi la linea se parte en el movil). La URL no cuenta, igual
    #    que en el tope de 55 del ninja: con ella saltaban los correos 9 y 10, aprobados.
    _largas = [l for _, ls in _prosa for l in ls
               if 'http' not in l and len(re.findall(r'\w+', l)) > 12]
    if _largas:
        checks.append(aviso(f'{len(_largas)} línea(s) de más de 12 palabras: "{_largas[0][:55]}…". '
                            f'Diana 7-9 (§3)'))
    else:
        checks.append(ok('Ninguna línea pasa de 12 palabras'))
    _vis = []
    for _, ls in _prosa:
        _v = sum(-(-len(re.sub(r'https?://\S+', '', l).rstrip()) // 55) or 1 for l in ls)
        _vis.append(_v)
    _pv = [i for i in range(len(_vis) - 1) if _vis[i] > 1 and _vis[i + 1] > 1]
    if _pv:
        checks.append(aviso(f'Ritmo visto en el móvil {"-".join(map(str, _vis))}: una línea de más de 55 '
                            f'se pinta como dos y queda pegada a otro bloque. Acórtala (global §3.2-VISUAL)'))
    else:
        checks.append(ok(f'Ritmo visto en el móvil sin bloques pegados ({"-".join(map(str, _vis))})'))

    # 8) EL CICLO Y LA SUELTA, SOBRE LO QUE VE EL OJO. El check de arriba excluye el tramo de la
    #    venta para no medir una regla contra otra; pero el lector no lo excluye, y el 1-2-1-2-1
    #    del final del correo 11 (contexto, ninja, suelta, par, suelta) se leia de metronomo.
    _pf = [len(ls) for _, ls in _prosa]
    if len(_pf) >= 6:
        _cf = any(_pf[i] == _pf[i+2] == _pf[i+4] and _pf[i+1] == _pf[i+3] and _pf[i] != _pf[i+1]
                  for i in range(len(_pf)-4))
        if _cf:
            checks.append(aviso(f'Ritmo entero {"-".join(map(str, _pf))}: alterna cinco bloques seguidos '
                                f'(1-2-1-2-1), contando el ninja. Junta dos sueltas o mete una más'))
        else:
            checks.append(ok('Ritmo entero, con el ninja, sin alternancia de metrónomo'))
        _suf = sum(1 for n in _pf if n == 1) / len(_pf)
        if _suf < 0.6:
            checks.append(aviso(f'Contando el ninja, solo el {_suf:.0%} de los bloques son líneas sueltas. '
                                f'La prioridad es sueltas, luego doses, luego treses (§3)'))
        else:
            checks.append(ok(f'Contando el ninja, la suelta domina ({_suf:.0%})'))

    # 9) LA TRANSICION AL NINJA (global §4.4b-TRANSICION, 20/10): el cuerpo llega al bloque
    #    por una escalera (siembra, bisagra, giro, dolor), no de un salto. Lo mecanizable: la
    #    linea 1 del ninja repite una palabra (raiz de 5) de las 3 lineas de antes, sin contar
    #    la de contexto de un evento. Si no repite ninguna, el dolor sale por primera vez
    #    dentro del bloque. El oido decide el resto: se imprimen para leerlas en alto.
    _raiz = lambda t: {re.sub(r'[áàä]', 'a', re.sub(r'[éè]', 'e', re.sub(r'[íì]', 'i', re.sub(r'[óò]', 'o',
                       re.sub(r'[úùü]', 'u', w.lower())))))[:5] for w in re.findall(r'[A-Za-zÁÉÍÓÚÑáéíóúñü]{5,}', t)}
    _vacias = {'porqu', 'despu', 'tambi', 'cuand', 'donde', 'mient', 'sobre', 'entre', 'hasta',
               'desde', 'estoy', 'estas', 'tiene', 'puede', 'hacer', 'todos', 'ahora', 'nuest'}
    _todas = [l for b in _cb if not b.strip().startswith('[') for l in _ls_de(b)]
    _il = next((k for k, l in enumerate(_todas) if 'http' in l), None)
    if _il and _il >= 1:
        _n1 = _todas[_il - 1]
        _prev = [l for l in _todas[:_il - 1] if not l.startswith('→')]
        if _prev and re.search(r'\b(lunes|martes|mi[eé]rcoles|jueves|viernes)\b', _prev[-1], re.I):
            _prev = _prev[:-1]
        _prev = _prev[-3:]
        _com = (_raiz(_n1) & _raiz(' '.join(_prev))) - _vacias
        _leer = ' / '.join('"%s"' % x[:45] for x in _prev) + ' → "' + _n1[:50] + '"'
        if _com:
            checks.append(ok(f'Transición al ninja: la línea 1 recoge "{sorted(_com)[0]}…" de las de '
                             f'antes. Léelas en alto: {_leer}'))
        else:
            checks.append(aviso(f'Transición al ninja con SALTO: la línea 1 no repite nada de las 3 de antes, '
                                f'así que el dolor sale por primera vez dentro del bloque. {_leer}. Escalera: '
                                f'siembra, bisagra, giro, dolor (global §4.4b-TRANSICION)'))
        # 10) LA BISAGRA: LA LINEA 2 RECOGE LA 1 (global §4.4b-MOLDE). Un demostrativo, un
        #     sustantivo repetido, el "si" que contesta a un "no", o un interrogativo que
        #     recoge el nombre de arriba ("Saber cuales te compran", correo 10).
        _n2l = _todas[_il]
        _pre2 = re.split(r'https?://', _n2l)[0]
        _dem = re.search(r'\b(es[ae]s?|eso|est[aeo]s?|ah[ií]|all[ií]|aqu[ií]|cu[aá]l(es)?|qui[eé]n(es)?)\b', _pre2, re.I)
        if not _dem and re.search(r'\b(no|nunca|nadie)\b', _n1, re.I):
            _dem = re.search(r'\bs[ií]\b', _pre2, re.I)
        _eco = (_raiz(_n1) & _raiz(_pre2)) - _vacias
        if _dem or _eco:
            checks.append(ok('Ninja: la línea 2 recoge la 1 (bisagra: %s)'
                             % (('"%s"' % _dem.group(0)) if _dem else 'repite ' + sorted(_eco)[0])))
        else:
            checks.append(fallo(f'Ninja: la línea 2 no recoge la 1, ni con un demostrativo ni repitiendo una '
                                f'palabra suya: dos frases sueltas, no un bloque ("{_pre2.strip()[:50]}"). '
                                f'Un pronombre pegado al verbo no basta: se pierde (global §4.4b-MOLDE)'))
        # 11) EL NINJA VA DESPUES DEL VALOR (global §4.4b-VALOR, 08/10): si hay lista, detras.
        _pos_l = cuerpo.find(_n2l)
        _items = [m.start() for m in re.finditer(r'(?m)^\s*(?:\d+[.)]\s|→)', cuerpo)]
        if _items and _pos_l < max(_items):
            checks.append(fallo('Ninja ANTES de la lista: el enlace se gana después del valor (global §4.4b-VALOR)'))
        elif _items:
            checks.append(ok('Ninja después del valor (la lista)'))

    # 12) MARCA, IGUAL QUE EN LOS POSTS (brand-voice §2b, aboutme §1, brand-voice §1b): el
    #     lector del correo es el mismo director comercial de 55 que el del post.
    _ANGL = {'prompt': 'la instrucción / lo que le pides', 'prompts': 'las instrucciones / lo que le pides',
             'pipeline': 'la cartera', 'funnel': 'el embudo', 'forecast': 'la previsión',
             'workflow': 'el proceso', 'engagement': 'la respuesta', 'insight': 'el hallazgo',
             'insights': 'los hallazgos', 'pitch': 'el discurso', 'closing': 'el cierre',
             'software': 'la herramienta', 'online': 'por videollamada / en directo'}
    _sin_url = re.sub(r'https?://\S+', ' ', cuerpo)
    _ang = [w for w in _ANGL if re.search(r'\b' + w + r'\b', _sin_url, re.I)]
    if _ang:
        checks.append(fallo('Anglicismo con traducción llana: ' + ' · '.join(f'"{w}" → {_ANGL[w]}' for w in _ang)
                            + ' (brand-voice §2b)'))
    else:
        checks.append(ok('Sin anglicismos que tengan traducción llana'))
    if re.search(r'\b(la|una|esta|esa|nuestra|su)\s+(nueva\s+|primera\s+)?neety\b(?!\s+forward)', _sin_url, re.I):
        checks.append(fallo('NEETY va en masculino: el nuevo Neety (aboutme §1)'))
    _sust = [l for l in cuerpo.splitlines()
             if re.search(r'd[ií]as contados|sustitu\w*|reemplaz\w*|jubil\w*', l, re.I)
             and re.search(r'comercial|vendedor|equipo|personas|puesto', l, re.I)]
    if _sust:
        checks.append(fallo(f'MARCA: plantea que la IA sustituye al comercial ("{_sust[0][:50]}"). '
                            f'Es la visión de la casa, también en correo (brand-voice §1b)'))
    _cuerpo_sin_firma = '\n'.join(l for b in _cb for l in _ls_de(b))
    _nn = len(re.findall(r'\bneety\b(?!\s+forward)', re.sub(r'https?://\S+', ' ', _cuerpo_sin_firma), re.I))
    if _nn > 1:
        checks.append(aviso(f'Neety sale {_nn} veces en el cuerpo: como mucho una, y la firma ya lo dice '
                            f'(brand-voice §4.5)'))
    # 13) CIFRAS ELEGIDAS EN IMPAR (global §2.5b): lo que eliges tu va impar y creible; un dato
    #     verificado se queda como esta (el script no los distingue, asi que es aviso).
    _pares = []
    _sl = re.sub(r'(?m)^\s*\d+[.)]\s', '', _sin_url)
    for _m in re.finditer(r'(?<![\d.,])(\d{1,2})(?![\d.,])', _sl):
        _cola = _sl[_m.end():_m.end() + 4]
        _ant = _sl[max(0, _m.start() - 12):_m.start()]
        if re.match(r'\s*[€%]|\s*[MkKh](?![a-záéíóúñ])', _cola) or re.search(
                r'(lunes|martes|mi[eé]rcoles|jueves|viernes|\bel|\bdel|p[aá]gina|a las)\s+$', _ant, re.I):
            continue
        if int(_m.group(1)) % 2 == 0 and int(_m.group(1)):
            _pares.append(_m.group(1))
    if _pares:
        checks.append(aviso(f'Cifra par {", ".join(_pares)}: si la eliges tú, impar (global §2.5b). '
                            f'Si es un dato verificado, se queda'))

    # --- enlaces: 1 principal como máximo ---
    links = re.findall(r'https?://\S+', cuerpo)
    # ⛔ PUERTA NUEVA (Iker, 2026-10-05): "ya no mandamos a la web de recursos a
    # agendar, vamos a mandar a la web principal a solicitar demo", en posts y en
    # correos. https://neety.com/solicitar-demo guarda el UTM igual (aboutme §1).
    import datetime as _dt
    if _dt.date.today() >= _dt.date(2026, 10, 5) and 'recursos.neety.com/agendar' in cuerpo:
        checks.append(fallo('La puerta de agendar es https://neety.com/solicitar-demo, no '
                            'recursos.neety.com/agendar (Iker, 05/10)'))
    # --colaboracion (2026-10-05, correo 7): una COLABORACION con un tercero (difundir
    # algo de otra entidad) permite UN segundo enlace. ⛔ CORREGIDO EL MISMO DIA POR
    # IKER: la primera version lo mandaba a la PD, detras de la firma, y eso "queda
    # fatal": ahi nadie pulsa (0 clics de 336 con el enlace al final, §5-NINJA-POSICION).
    # La regla buena, que es la que se comprueba: (1) el primero es el nuestro, (2) LOS
    # DOS van en el CUERPO, antes de la firma, (3) separados por al menos 2 bloques, y
    # (4) el del tercero tambien es un bloque de 2-3 lineas cortas (<=55 sin la URL)
    # cuya ultima linea es UNA oracion + ":" + enlace.
    colab = '--colaboracion' in sys.argv
    if len(links) <= 1:
        checks.append(ok(f'{len(links)} enlace(s) (máx 1)'))
    elif colab and len(links) == 2:
        i_firma = next((i for i, l in enumerate(cuerpo_lineas)
                        if re.match(r'^\s*(Iker|Unai|Asier|Kaixito)\b.*Neety', l)), None)
        i_seg = next((i for i, l in enumerate(cuerpo_lineas) if links[1] in l), None)
        nuestro = lambda u: 'neety.' in u
        bl2 = next((b.splitlines() for b in bloques if links[1] in b), [])
        bl2 = [l for l in bl2 if l.strip()]
        i_b1 = next((i for i, b in enumerate(bloques) if links[0] in b), None)
        i_b2 = next((i for i, b in enumerate(bloques) if links[1] in b), None)
        sin_u = lambda x: re.sub(r'https?://\S+', '', x).strip()
        if not nuestro(links[0]) or nuestro(links[1]):
            checks.append(fallo('Colaboración: el PRIMER enlace tiene que ser el nuestro y el '
                                'segundo el del tercero'))
        elif i_firma is None or i_seg is None or i_seg > i_firma:
            checks.append(fallo('Colaboración: el enlace del tercero va en el CUERPO, antes de '
                                'la firma. En la PD nadie lo pulsa (Iker, 05/10)'))
        elif i_b1 is None or i_b2 is None or i_b2 - i_b1 < 3:
            checks.append(fallo('Colaboración: los dos bloques con enlace tienen que ir bien '
                                'separados (al menos 2 bloques entre ellos)'))
        elif not (2 <= len(bl2) <= 3) or any(len(sin_u(l)) > 55 for l in bl2) \
                or not sin_u(bl2[-1]).endswith(':') or links[1] not in bl2[-1]:
            checks.append(fallo('Colaboración: el bloque del tercero es de 2-3 líneas cortas '
                                '(≤55 sin la URL) y la última es UNA oración + ":" + enlace'))
        else:
            checks.append(ok('Colaboración: 2 enlaces en el cuerpo, separados, el del tercero '
                             'en su propio bloque corto (' + ' / '.join(str(len(sin_u(l))) for l in bl2)
                             + ' car)'))
    else:
        checks.append(fallo(f'{len(links)} enlaces compitiendo (máx 1 principal'
                            + ('' if colab else '; si es una colaboración con un tercero, --colaboracion')
                            + ')'))

    # --- SPAM NINJA EN EL CORREO (email-marketing §5-NINJA, Iker 2026-08-26) ---
    # La forma del ninja NO es de un pilar ni de un canal: es global (global §4.4b-FORMA).
    # Iker, viendo el correo 2 con el enlace en linea suelta: "en cuanto lo vea una
    # persona detectara que le estamos intentando vender algo, no lo pulsara, generara
    # rechazo y friccion". Es literalmente lo que mide la auditoria de clics del 12/08:
    #   bloque de 2 pegadas  n=4  CTR mediano 0,205%
    #   linea suelta         n=8  CTR mediano 0,069%
    # Y el par sin ruido: meme del 29/07 con bloque de dos, 93.744 imp y 142 clics;
    # meme del 06/08 con linea suelta, 95.913 imp y 4 clics. Treinta y cinco veces menos.
    #
    # LO QUE CAMBIA EN CORREO: la linea 1 no cuelga de la broma del GANCHO del post,
    # cuelga de la broma o del verbo punchy del ASUNTO, que es su equivalente.
    if links:
        bloque_ninja = next((b.splitlines() for b in bloques if 'http' in b), [])
        bl = [l for l in bloque_ninja if l.strip()]
        sin_url = lambda x: re.sub(r'https?://\S+', '', x).strip()

        if len(bl) == 2:
            checks.append(ok('Ninja: DOS líneas pegadas, dolor arriba y enlace abajo'))
        else:
            checks.append(fallo(
                f'Ninja: {len(bl)} línea(s) en el bloque del enlace, tienen que ser 2. '
                f'Con el enlace suelto se lee como un banner y el CTR se hunde '
                f'(0,069% contra 0,205%)'))

        largas = [(i + 1, len(sin_url(l))) for i, l in enumerate(bl) if len(sin_url(l)) > 55]
        if largas:
            checks.append(fallo(
                'Ninja: LAS DOS líneas cortas, ≤55 sin la URL. Línea(s) '
                + ', '.join(f'{i} con {n} car' for i, n in largas)))
        else:
            checks.append(ok('Ninja: las dos líneas ≤55 sin la URL ('
                             + ' / '.join(str(len(sin_url(l))) for l in bl) + ' car)'))

        # INFORME DE CLIENTES DEL 15/10 (global 4.4b-MUNICION-1510, Iker 16/10), los
        # mismos tres avisos que validar-post.py: descubrir empresas nuevas (17
        # empresas lo objetan), "con IA" en la promesa (17 creen que un chat les hace
        # lo mismo) y marcas de competidor o creditos en el bloque.
        if bl:
            _l2 = sin_url(bl[-1])
            _desc = re.search(r'\bdescubr\w*|\b(empresas?|clientes?|mercados?)\s+(nuev[oa]s?|que\s+(a[uú]n\s+)?no\s+conoc\w*)'
                              r'|\b(las|los)\s+que\s+(a[uú]n\s+)?no\s+conoc\w*', _l2, re.I)
            if _desc:
                checks.append(aviso(f'Ninja: la línea del enlace promete DESCUBRIR ("{_desc.group(0)}"). '
                                    f'17 empresas (16 ICP) ya conocen su nicho; lo que les falta es la '
                                    f'persona de dentro (global §4.4b-MUNICIÓN-1510)'))
            _ia2 = re.search(r'\b(con\s+ia|la\s+ia|una\s+ia|inteligencia\s+artificial|chat\s?gpt|copilot'
                             r'|claude|gemini|agentes?)\b', _l2, re.I)
            if _ia2:
                checks.append(aviso(f'Ninja: la línea del enlace promete IA ("{_ia2.group(0)}"). 17 empresas '
                                    f'creen que un chat les hace lo mismo gratis: promete lo que el chat '
                                    f'no da (global §4.4b-MUNICIÓN-1510)'))
            _marca = re.search(r'\b(chat\s?gpt|copilot|gemini|kompass|informa|alimarket|sales\s+navigator'
                               r'|apollo|waalaxy|cr[eé]ditos?|suscripci[oó]n|tarifas?)\b',
                               sin_url(' '.join(bl)), re.I)
            if _marca:
                checks.append(aviso(f'Ninja: nombra "{_marca.group(0)}". Ni competidores ni nuestro precio en '
                                    f'el bloque: un chat, una base de datos, la licencia (global §4.4b-MUNICIÓN-1510)'))

        if len(bl) == 2:
            arriba, abajo = len(sin_url(bl[0])), len(sin_url(bl[1]))
            if abajo <= arriba:
                checks.append(ok(f'Ninja: escalera invertida ({arriba} → {abajo})'))
            else:
                checks.append(aviso(f'Ninja: la línea del enlace es MÁS LARGA que la de '
                                    f'arriba ({arriba} → {abajo}). En el cierre del enlace '
                                    f'la escalera va al revés que en el cuerpo'))

        # La linea del enlace: UNA sola oracion + ":" + enlace, todo pegado
        # (global §4.4b, Iker 2026-08-07). Dos oraciones o el enlace despegado del
        # texto lo convierten otra vez en banner.
        lenl = next((l for l in bl if 'http' in l), '')
        texto_enl = sin_url(lenl)
        if texto_enl.endswith(':') and texto_enl.count('.') == 0:
            checks.append(ok('Ninja: la línea del enlace es UNA oración + ":" + enlace pegado'))
        else:
            checks.append(fallo('Ninja: la línea del enlace tiene que ser UNA sola oración '
                                'acabada en ":" con el enlace pegado detrás'))

        # ⛔ LA PALABRA DEL ASUNTO SE REPITE LITERAL DENTRO DEL BLOQUE.
        # En LinkedIn es la del gancho (global §4.4b-FORMA, fallo duro); en correo el
        # gancho ES el asunto. Sin ella el bloque aparece con vocabulario nuevo a
        # mitad de texto y el ojo lo trata como banner; con ella se lee como el
        # remate. Se compara por raiz de 5 letras y sin tildes, igual que en posts.
        def _raices(txt):
            t = (txt.lower().replace('á', 'a').replace('é', 'e').replace('í', 'i')
                 .replace('ó', 'o').replace('ú', 'u').replace('ñ', 'n'))
            return {w[:5] for w in re.findall(r'[a-z]{4,}', t)}
        VACIAS = {'para', 'como', 'esta', 'este', 'esto', 'todo', 'toda', 'cuand',
                  'porqu', 'pero', 'nunca', 'siemp', 'tambi', 'desde', 'sobre'}
        r_asunto = _raices(asunto) - VACIAS
        r_ninja = _raices(' '.join(sin_url(l) for l in bl))
        comunes = r_asunto & r_ninja
        if comunes:
            checks.append(ok(f'Ninja: repite una palabra del ASUNTO ({", ".join(sorted(comunes))})'))
        else:
            checks.append(fallo(
                'Ninja: no repite ninguna palabra del ASUNTO. El asunto habla de: '
                + ', '.join(sorted(r_asunto)) + '. En correo el asunto ES el gancho, '
                'así que su objeto o su verbo punchy tienen que aparecer literales '
                'dentro del bloque'))

        # Quemadas: mismo banco que los posts. El dolor no cambia, la frase si.
        # Al ENVIAR un correo, su linea de ninja entra aqui (misma doctrina que
        # SPAM_QUEMADO de validar-post.py: la lista describe lo YA publicado y el
        # disparador es el envio, no la entrega). El dolor no cambia; la frase si.
        # ⏳ CADUCAN (Iker, 2026-09-16: "que pasado un determinado tiempo caduquen").
        # Fecha = ultima vez que salio, en post o en correo. Ventana: 3 correos
        # seguidos, y sale uno por semana. NO va por remitente, a diferencia de
        # LinkedIn: los cuatro remitentes escriben a la MISMA lista, asi que el
        # mismo suscriptor lee los cuatro (email-marketing §7).
        import datetime
        VENTANA_CORREO_DIAS = 21
        QUEMADAS = {
            'dar con el que decide': '2026-07-31',
            'son meses a mano': '2026-07-31',
            'te lo damos hecho': '2026-07-31',
            'te lo damos resuelto': '2026-08-18',
            'te lo marcamos': '2026-08-19',
            'acertar con quien no': '2026-08-21',
            # correo 2 · Iker · la feria
            'una feria te da tarjetas, no clientes': '2026-09-02',
            'el nombre de quien decide, nosotros': '2026-09-02',
            # correo 3 · Unai · el evento
            'nos juntamos sin ti solo si no te apuntas': '2026-09-09',
            'tan solo hay 80 sillas': '2026-09-09',
            # correo 5 · Iker · OBJECION (enviado 23/09)
            'una maquina te escribe el mensaje': '2026-09-23',
            'a quien mandarselo, con su nombre, nosotros': '2026-09-23',
            # correo 4 · Kaixito · el evento, ultima semana
            'por correo no te guardo sitio': '2026-09-16',
            'de las 20 sillas que quedan elegimos': '2026-09-16',
            # correo 6 · Unai · CALENDARIO (enviado 29/09)
            'llamar en octubre es facil. lo caro es saber a quien': '2026-09-29',
            'eso lo hacemos nosotros, con quien decide dentro': '2026-09-29',
            # correo 7 · Kaixito · MITO (enviado 06/10, apuntado el 13/10: se olvido al enviar)
            'la lista larga te la vende cualquiera': '2026-10-06',
            'la corta, con quien decide, nosotros': '2026-10-06',
            # correo 8 · Asier · RECETA (enviado 14/10 11:49)
            'por sector te salen cientos de empresas': '2026-10-14',
            'dar con esas pocas es lo que ensenamos': '2026-10-14',
            # correo 9 · Kaixito · DOLOR (enviado 20/10 09:06; metido tarde, el 26/10)
            'mirar las webs de una en una le da sueno': '2026-10-20',
            'buscar menos y llamar mas, eso lo ensenan': '2026-10-20',
            # correo 10 · Kaixito · ANZUELOS (programado mar 27/10 09:05)
            'cotillear empresa por empresa a mano': '2026-10-27',
            'saber cuales te compran, te lo ensenan': '2026-10-27',
            # correo 11 · Kaixito · GRABACION (programado vie 30/10 09:05)
            'se escapan menos si sabes cuales buscar': '2026-10-30',
            'de eso va la grabacion entera': '2026-10-30',
        }
        _hoy = datetime.date.today()
        # 🔴 Se comparan SIN TILDES (23/09): la lista se escribe en ascii y el
        # cuerpo lleva tildes, asi que 'a quien mandarselo' no encontraba
        # 'a quién mandárselo' y una frase recien enviada pasaba como nueva.
        import unicodedata
        def _plano(t):
            return ''.join(c for c in unicodedata.normalize('NFD', t)
                           if unicodedata.category(c) != 'Mn')
        cuerpo_plano = _plano(cuerpo_low)
        q = next((x for x, f in QUEMADAS.items() if _plano(x) in cuerpo_plano
                  and (_hoy - datetime.date.fromisoformat(f)).days < VENTANA_CORREO_DIAS), None)
        if q:
            checks.append(fallo(f'Ninja: frase QUEMADA "{q}", salio el {QUEMADAS[q]} y se libera a los {VENTANA_CORREO_DIAS} dias (§4.4b, el dolor no cambia y la frase sí)'))
        else:
            checks.append(ok('Ninja: sin frases quemadas'))

        # Nunca la ultima linea: detras van la firma y las postdatas.
        if cuerpo_lineas and 'http' in '\n'.join(cuerpo_lineas[-2:]):
            checks.append(fallo('Ninja: el enlace es la última línea del correo (§4.4b)'))
        else:
            checks.append(ok('Ninja: el enlace no es la última línea'))

        # 🖥️ WEBINAR DEL 28/10 (global §4.4b-WEBINAR, Iker 2026-10-08). Estaba solo en
        # validar-post.py y el correo 8 (13/10) fue el primero que lo enlaza: portado el
        # mismo dia. Online, gratis y sin aforo: la linea suelta de ENCIMA del bloque dice
        # cuando, que es online y que es gratis, el bloque no vende escasez (seria falsa
        # y sube la barrera que queremos bajar) y "webinar" encoge la audiencia.
        # ⏳ Caduca solo el 28/10/2026.
        import datetime as _dt
        if '7hhyx07z' in cuerpo and _dt.date.today() <= _dt.date(2026, 10, 28):
            _i_n = next((i for i, b in enumerate(bloques) if 'http' in b), None)
            _prev = bloques[_i_n - 1] if _i_n else ''
            _prev_l = [l for l in _prev.splitlines() if l.strip()]
            _prev_low = _prev.lower()
            _blo = sin_url(' '.join(bl)).lower()
            _faltan = [n for n, v in (
                ('la fecha (miércoles 28)', re.search(r'\b28\b|mi[eé]rcoles', _prev_low)),
                ('que es online', re.search(r'online|en directo|por internet|desde (tu|el|la|casa)|pantalla|videollamada', _prev_low)),
                ('que es gratis', re.search(r'gratis|gratuit|sin pagar|no cuesta', _prev_low)),
                # 21/10 (Mario, afinado por Iker): la linea dice que es un EVENTO, con esa
                # palabra, y "por internet" vale de online. Portado de validar-post.py el 26/10
                # (correo 10): el de correo seguia sin aceptar "por internet".
                ('la palabra evento', re.search(r'(?<![a-záéíóú])(evento|seminario|conferencia)', _prev_low)))
                if not v]
            if len(_prev_l) == 1 and not _faltan:
                checks.append(ok('Webinar: línea suelta de encima con fecha, online y gratis'))
            else:
                checks.append(fallo(
                    'Webinar: justo encima del bloque del enlace va UNA línea suelta que dice '
                    'el miércoles 28, online y gratis (§4.4b-WEBINAR). '
                    + (f'Falta {" y ".join(_faltan)}. ' if _faltan else '')
                    + (f'Ahora el bloque de encima tiene {len(_prev_l)} líneas.' if len(_prev_l) != 1 else '')))
            # ⏳ FOMO DE TIEMPO (Iker, 26/10, portado de validar-post.py): el plazo es real
            # la vispera y va en la linea de encima; las plazas siguen prohibidas, tambien
            # en esa linea (antes solo se miraba el bloque). El correo no sabe cuando se
            # envia, asi que aqui la fecha va como aviso.
            _FOMO_T = (r'quedan?\s+(?:solo\s+|muy\s+)?(?:pocas\s+|unas\s+)?horas|[uú]ltimas\s+horas'
                       r'|[uú]ltimo\s+d[ií]a|queda\s+hoy|menos\s+de\s+24\s+horas|ni\s+un\s+d[ií]a|menos\s+de\s+un\s+d[ií]a')
            _esc = (re.search(r'plazas|aforo|\bsala\b|sillas|[uú]ltim[oa]s|se acaba|quedan', _blo)
                    or re.search(r'plazas|aforo|sillas|entradas|asientos', _prev_low))
            _fomo = re.search(_FOMO_T, _prev_low)
            if _fomo:
                checks.append(aviso(f'Webinar: FOMO de tiempo ("{_fomo.group(0)}"). Solo vale si el correo '
                                    f'sale la víspera (27/10) o el mismo día antes de las 10; antes es falso'))
            if _esc and re.search(_FOMO_T, _blo):
                checks.append(fallo(f'Webinar: el plazo ("{_esc.group(0)}") va en la línea de ENCIMA y solo la '
                                    f'víspera; el bloque de dos promete lo que te llevas'))
            elif _esc:
                checks.append(fallo(f'Webinar: el ninja vende escasez ("{_esc.group(0)}"). Es online, '
                                    f'gratis y sin límite: se promete lo que te llevas'))
            else:
                checks.append(ok('Webinar: el ninja no vende escasez'))
            if re.search(r'videollamada', _prev_low):
                checks.append(aviso('Webinar: la línea de encima lo vende como "videollamada", que se lee '
                                    'más pobre que un evento: "evento gratuito por internet" (Mario, 21/10)'))
            if re.search(r'webinar', _prev_low + ' ' + _blo):
                checks.append(aviso('Webinar: sale la palabra "webinar" en el ninja. Mejor "sesión '
                                    'online", "charla online" o "en directo" (brand-voice §2.3)'))

        # LUMA SOLO LEE utm_source (email-marketing §1, 28/08): la identidad del correo
        # va ahí, escrita a mano y empezando por "correo-" (22/09), para que en el panel
        # de Luma los correos no se mezclen con los posts.
        _luma = [u for u in links if 'luma.com' in u or 'lu.ma' in u]
        if _luma:
            _src = re.search(r'utm_source=([^&\s]+)', _luma[0])
            if _src and _src.group(1).startswith('correo-'):
                checks.append(ok(f'Enlace a Luma con la identidad en utm_source ({_src.group(1)})'))
            else:
                checks.append(fallo('Enlace a Luma: la identidad del correo va en utm_source y '
                                    'empieza por "correo-" (correo-{nº}-{remitente}-{pilar}). '
                                    'Luma no lee utm_campaign'))

    # --- AI-tells ---
    m = re.search(AI_TELLS, cuerpo_low)
    if m:
        checks.append(fallo(f'AI-tell encontrado: "{m.group(0)}" (brand-voice §3)'))
    else:
        checks.append(ok('Sin AI-tells de la tabla'))

    # --- CTA floja ---
    m = re.search(CTA_FLOJA, cuerpo_low)
    if m:
        checks.append(fallo(f'CTA floja: "{m.group(0)}"'))
    else:
        checks.append(ok('Sin CTA floja ("ya me dices"…)'))

    # --- promesas vetadas (email-marketing §7) ---
    m = re.search(PROMESA_AUTOMATISMO, cuerpo_low)
    if m:
        checks.append(fallo(f'Promete AUTOMATISMO: "{m.group(0)}" — objeción en 5 empresas '
                            f'del informe de demos (§7). Lo que sí se promete: la '
                            f'identificación, dejar de buscar para poder contactar'))
    else:
        checks.append(ok('Sin promesa de automatismo ("lo hace por ti"…)'))

    # --- juicio al que compra (Iker, 2026-10-15, brand-voice canónico 5) ---
    # Mismo léxico que validar-post.py: el juicio pegado al que compra (cliente,
    # director, gerente, CEO...), no la situación. El correo lo firma un jefe igual.
    _compra = r'\b(clientes?|compradore?s?|director(es)?|directoras?|gerentes?|ceos?|fundador\w*|due[ñn]o\w*)\b'
    _juicio = (r'\b(regate\w+|taca[ñn]\w+|pesad[oa]s?|ratas?|problem[aá]tic\w+|t[oó]xic\w+|escaque\w+|vag[oa]s?|'
               r'no se entera\w*|no tiene ni idea|no sabe lo que \w+)\b'
               r'|\b(da|dan|causa|causan|trae|traen)\s+(m[aá]s\s+)?problemas\b|\bproblemas\s+(da|dan|causa|causan)\b'
               r'|\bclientes?\s+(m[aá]s\s+)?barat[oa]s?\b')
    _juzga = [l.strip() for l in cuerpo.splitlines() if re.search(_compra, l, re.I) and re.search(_juicio, l, re.I)]
    if _juzga:
        checks.append(fallo(f'Juzga al que COMPRA: "{_juzga[0][:80]}" — cuenta lo que hace, sin '
                            f'el adjetivo; la culpa a la situación o al proceso (brand-voice canónico 5)'))
    else:
        checks.append(ok('Sin juicio negativo sobre el que compra'))

    m = re.search(PROMESA_VOLUMEN, cuerpo_low)
    if m:
        checks.append(aviso(f'Suena a VOLUMEN: "{m.group(0)}" — es la queja contra Waalaxy y '
                            f'Apollo en 5 empresas. Si el volumen está del lado del ENEMIGO '
                            f'(pilar 3: "más leads no era tu problema"), ignora este aviso'))
    else:
        checks.append(ok('No vende volumen'))

    # --- cifras en letra ---
    m = re.search(NUMERO_EN_LETRA, cuerpo_low)
    if m:
        checks.append(fallo(f'Número en letra: "{m.group(0)}" (global §3.6: en dígito)'))
    else:
        checks.append(ok('Cifras en dígito'))

    # --- UNA palabra en mayusculas en el cuerpo, como mucho (email-marketing §8h punto 1) ---
    # RunnerPro 4 de 4 y Isra 5 de 7 llevan exactamente UNA, y es la palabra del giro
    # (VEINTE, BARATO, VARIEDAD, INCAPACES). Ninguno de los dos mete dos. La mayuscula no
    # grita: marca donde gira el correo. Con dos ya no marca nada.
    _siglas = {'NEETY', 'FORWARD', 'LINKEDIN', 'HUBSPOT', 'GIPUZKOA', 'EUSKADI'}
    _cuerpo_sin_url = re.sub(r'https?://\S+|\S+\.(?:com|es|io)\S*', ' ', cuerpo)
    _caps = [w for w in re.findall(r'\b[A-ZÁÉÍÓÚÑ]{4,}\b', _cuerpo_sin_url) if w not in _siglas]
    if len(_caps) >= 2:
        checks.append(aviso(f'{len(_caps)} palabras en MAYÚSCULAS en el cuerpo ({", ".join(_caps[:4])}): '
                            f'el corpus lleva UNA, la del giro (§8h). Deja la que más pese'))
    else:
        checks.append(ok(f'≤1 palabra en mayúsculas en el cuerpo' + (f' ({_caps[0]})' if _caps else '')))

    # --- nombre de pila que YA salio en un correo enviado (email-marketing §8h punto 9, §8i) ---
    # RunnerPro repitio la misma cita con otro nombre a 5 dias (Maria/Marta, §8h) y volvio a
    # sacar a "Javier" cinco semanas despues (21/08 -> 25/09, §8i). El que lee dos correos
    # seguidos lo ve, y es lo que delata una historia inventada. La lista cubre los nombres
    # mas comunes; un nombre raro se escapa, y por eso es aviso y la busqueda a mano sigue.
    _NOMBRES_PILA = {
        'María', 'Marta', 'Laura', 'Ana', 'Lucía', 'Paula', 'Sara', 'Carmen', 'Elena', 'Cristina',
        'Isabel', 'Raquel', 'Patricia', 'Beatriz', 'Silvia', 'Irene', 'Nuria', 'Rocío', 'Pilar',
        'Teresa', 'Mónica', 'Sonia', 'Eva', 'Alba', 'Julia', 'Clara', 'Andrea', 'Natalia', 'Marina',
        'Rosa', 'Lourdes', 'Begoña', 'Amaia', 'Ane', 'Leire', 'Nerea', 'Maite', 'Ainhoa', 'Itziar',
        'Idoia', 'Garazi', 'Miren', 'Arantxa', 'Edurne', 'Izaskun', 'Olatz', 'June', 'Uxue',
        'Javier', 'Pablo', 'Carlos', 'Juan', 'José', 'Antonio', 'Manuel', 'Francisco', 'David',
        'Daniel', 'Miguel', 'Alejandro', 'Jorge', 'Luis', 'Sergio', 'Alberto', 'Fernando', 'Rafael',
        'Pedro', 'Ángel', 'Andrés', 'Álvaro', 'Rubén', 'Óscar', 'Raúl', 'Diego', 'Adrián', 'Íñigo',
        'Enrique', 'Ramón', 'Vicente', 'Joaquín', 'Ignacio', 'Víctor', 'Roberto', 'Eduardo', 'Tomás',
        'Mikel', 'Jon', 'Aitor', 'Iñaki', 'Unax', 'Asier', 'Ander', 'Gorka', 'Xabier', 'Josu',
        'Koldo', 'Andoni', 'Imanol', 'Eneko', 'Ibai', 'Julen', 'Oier', 'Joseba', 'Patxi', 'Txema',
        'Gaizka', 'Igor', 'Borja', 'Hugo', 'Martín', 'Lucas', 'Mateo', 'Marcos', 'Gonzalo', 'Ricardo',
    }
    _remitentes_nombre = {'Iker', 'Unai', 'Asier', 'Kaixito', 'Mario', 'Helene'}
    _usados = sorted({w for w in re.findall(r'\b[A-ZÁÉÍÓÚÑ][a-záéíóúñü]+\b', cuerpo)
                      if w in _NOMBRES_PILA and w not in _remitentes_nombre})
    if _usados:
        _ruta_corpus = os.path.join(os.path.dirname(os.path.abspath(__file__)),
                                    '..', 'docs', 'skills', 'corpus-correos-enviados.md')
        try:
            with io.open(_ruta_corpus, encoding='utf-8') as f:
                _corpus = f.read()
            _repetidos = [n for n in _usados if re.search(r'\b' + n + r'\b', _corpus)]
            if _repetidos:
                checks.append(aviso(f'Nombre de pila ya usado en un correo enviado: {", ".join(_repetidos)} '
                                    f'(§8h p.9: RunnerPro repitió María/Marta y Javier, y así se delata '
                                    f'una historia inventada). Si es una persona real, ignóralo'))
            else:
                checks.append(ok(f'Nombre de pila sin repetir en el corpus enviado ({", ".join(_usados)})'))
        except OSError:
            checks.append(aviso('No se pudo leer corpus-correos-enviados.md para comprobar nombres repetidos'))

    # --- PD (aviso, no fallo: Kaixito puede no llevarlo) ---
    # En ESPAÑOL la postdata es PD, no P.S. Medido el 2026-08-06 sobre el corpus
    # español entero (Timepack + Hugo López + Sales Hackers + newsletters):
    # 453 "PD" y 141 "PPD" contra CERO "P.S.". El P.S. es un anglicismo.
    tiene_pd = re.search(r'^\s*p\.?\s?d\.?[:. ]', cuerpo_low, re.M)
    tiene_ps = re.search(r'^\s*p\.?\s?s\.?[:. ]', cuerpo_low, re.M)
    if tiene_ps and not tiene_pd:
        checks.append(fallo('Usa "P.S." en vez de "PD" (corpus español: 453 PD, 0 P.S.)'))
    elif tiene_pd:
        checks.append(ok('Lleva PD'))
    elif rem == 'kaixito':
        checks.append(aviso('Sin PD (en Kaixito es opcional)'))
    else:
        checks.append(fallo('Sin PD (email-marketing §4b: en emails importantes, siempre)'))

    # PPD: RunnerPro lleva Pd + Pd2 en 11 de 11 (§8g). Desde el 19/10 una sola PD
    # graciosa también vale (Iker), así que es aviso, no fallo.
    if tiene_pd and not re.search(r'^\s*(ppd|p\.?d\.?\s?2|pd2)', cuerpo_low, re.M):
        checks.append(aviso('Solo una PD. Vale si es graciosa (Iker, 19/10); el corpus lleva dos en 11 de 11 (§8g)'))

    # --- Las postdatas no piden NADA (Iker, 19/10/2026) ---
    # "en los postdatas nunca pondría preguntas o CTAs que confundan… el spam ninja ya
    # es el único CTA". Medido: 0 respuestas a las postdatas en toda la serie (correo 0:
    # 0 de 191; correo 8, el del reto, tampoco). La PD va de broma (el libro de Kaixito).
    _pd_lineas = re.findall(r'^\s*(?:ppd|p\.?\s?p?\.?\s?d\.?\s?2?)[:. ].*$', cuerpo_low, re.M)
    _pide = re.compile(r'\?|\b(respond\w*|contest\w*|escr[ií]b\w*|cu[eé]nta\w*|dime|d[ií]game|reenv[ií]\w*|comp[aá]rt\w*|apunta\w*|reserv\w*|pincha\w*|haz clic)\b')
    _malas = [l.strip()[:60] for l in _pd_lineas if _pide.search(l)]
    if _malas:
        checks.append(fallo('Postdata que pregunta o pide algo: ' + ' | '.join(_malas) +
                            ' (Iker 19/10: el único CTA es el enlace; la PD va de broma)'))
    elif _pd_lineas:
        checks.append(ok('Postdatas sin preguntas ni peticiones'))

    # --- preview: sin techo medido, aviso a partir de 100 chars ---
    if preview and len(preview) > 100:
        checks.append(aviso(f'Preview de {len(preview)} chars; en móvil se corta mucho antes'))

    # --- LONGITUD DEL CUERPO (Iker, 19/10/2026: "no cometas el error de la semana pasada") ---
    # El correo 8 (240 palabras) fue el peor de la serie: 1 clic limpio y 0 inscritos,
    # contra 116-158 de los correos 0-7 (el 7 sacó 8 clics). Se cuenta el cuerpo SIN la
    # firma, las postdatas, las URL ni el marcador del GIF, que es lo que se lee de corrido.
    _hasta_pd = re.split(r'^\s*(?:pd|ppd|p\.\s?d\.)[:. ]', cuerpo, maxsplit=1, flags=re.M | re.I)[0]
    _lin = [l for l in _hasta_pd.splitlines() if l.strip()]
    if _lin and rem_base and rem_base in _lin[-1].lower():
        _lin = _lin[:-1]                                   # fuera la firma
    _texto = re.sub(r'https?://\S+', '', re.sub(r'\[GIF[^\]]*\]', '', '\n'.join(_lin)))
    _pal = len(re.findall(r'\w+', _texto))
    if _pal > 180:
        checks.append(fallo(f'Cuerpo de {_pal} palabras: el correo 8 (240) fue el peor de la serie. '
                            f'Diana 116-158, la de los correos 0-7 (historial-newsletter, A/B de longitud)'))
    elif _pal > 158:
        checks.append(aviso(f'Cuerpo de {_pal} palabras: por encima de 116-158, la banda de los correos '
                            f'que mejor han ido. Saca lo informativo, no lo punchy'))
    else:
        checks.append(ok(f'Cuerpo de {_pal} palabras (diana 116-158, sin firma ni PD)'))

    # --- firma humana (ventana de 10 líneas: P.S.+P.P.S.+baja pueden empujarla) ---
    ultimas = '\n'.join(cuerpo_lineas[-10:]).lower()
    if rem_base and rem_base in ultimas:
        checks.append(ok('Firma con el nombre del remitente'))
    else:
        checks.append(fallo('No se ve la firma humana con el nombre del remitente al final'))

    # ⛔ ESCALERA DEL VERBO DEL ASUNTO (29/10, email-marketing §2-PUNCH): la regla de
    # global §2.9-ESCALERA es de TODO gancho y el asunto es el gancho del correo, pero solo
    # la pedia validar-post.py. El correo 11 salio en verde con `te perdiste` (el neutro)
    # sin que nada preguntase por un peldaño mejor. Se escribe por argumento, como la
    # clave `punch` de --criterio: --punch "perderse -> escaparse -> plantar".
    _punch = sys.argv[sys.argv.index('--punch') + 1] if '--punch' in sys.argv[:-1] else ''
    if len([p for p in re.split(r'\s*(?:→|->)\s*', _punch) if p.strip()]) >= 3:
        checks.append(ok(f'Escalera del verbo del asunto escrita ({_punch})'))
    else:
        checks.append(fallo('Falta la escalera del verbo del ASUNTO: --punch "neutro -> elegido -> el que se pasa" '
                            '(global §2.9-ESCALERA, email-marketing §2-PUNCH). El verde no dice si para el scroll'))

    # ⛔ RETOQUE (Iker, 2026-10-22, working-preferences §1d-BIS): el retoque se queda y lo
    # que rompa se arregla; si no hay forma, el retoque se rechaza. Se compara con la version
    # anterior por el texto de cada aviso/fallo sin cifras (las cifras cambian al retocar).
    if '--antes' in sys.argv:
        _ant = sys.argv[sys.argv.index('--antes') + 1]
        import subprocess
        _o = subprocess.run([sys.executable, os.path.abspath(__file__), _ant], capture_output=True,
                            text=True, encoding='utf-8', errors='replace').stdout or ''
        _norm = lambda m: re.sub(r'\d+([.,]\d+)?', '#', m).strip()
        # El simbolo se quita hasta el primer espacio: "⚠️" son DOS caracteres (U+26A0 +
        # U+FE0F) y con l[1:] el selector de variante se quedaba pegado al texto, asi que
        # cualquier aviso de la version anterior salia como nuevo (26/10, correo 10).
        _antes = {_norm(l.split(' ', 1)[1]) for l in _o.splitlines()
                  if l[:1] in ('❌', '⚠') and ' ' in l}
        _nuevos = [m for s, m in checks if s in ('❌', '⚠️') and _norm(m) not in _antes]
        if _nuevos:
            checks.insert(0, fallo('RETOQUE: abre lo que la version anterior no tenia: ' +
                                   ' | '.join(x[:80] for x in _nuevos) +
                                   '. Se queda el retoque y se arregla esto; si no hay forma, el retoque se rechaza'))
        else:
            checks.insert(0, ok('RETOQUE: no abre fallos ni avisos nuevos contra la version anterior'))

    # --- salida ---
    fallos = sum(1 for s, _ in checks if s == '❌')
    total = len(checks)
    for s, msg in checks:
        print(f'{s} {msg}')
    print()
    print(f'{"❌" if fallos else "✅"} Validador email {total - fallos}/{total}')
    sys.exit(1 if fallos else 0)


if __name__ == '__main__':
    main()
