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
    python scripts/validar-email.py <fichero.txt>

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

# email-marketing §8g (2026-09-14): la mediana del corpus lleva CUATRO ventanas bajando
# (43 -> 36 -> 36 -> 31 caracteres; 8 -> 7 -> 7 -> 5 palabras) y el 61% de los 75 asuntos
# de la ultima cabe en 35. El techo duro sigue en 62 (p90), pero la DIANA es otra: a
# partir de aqui se avisa, porque casi siempre hay una version mas corta de la misma idea.
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
                                f'(§8g: la mediana del corpus es 31 y el 61% cabe en 35). '
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
        if '?' in asunto and '¿' not in asunto:
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
    _pat = _lineas_de([b for i, b in enumerate(_rb) if i not in (_idx, _idx - 1)]
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
        _su = sum(1 for n in _pat if n == 1) / len(_pat)
        if _su >= 0.55:
            checks.append(ok(f'Ritmo: la linea suelta domina ({_su:.0%})'))
        else:
            checks.append(aviso(f'Ritmo {_ritmo}: solo {_su:.0%} son lineas sueltas. En correo '
                                f'la suelta es la base (§3: 92-99% del corpus) y los bloques '
                                f'son la variedad'))

    # --- enlaces: 1 principal como máximo ---
    links = re.findall(r'https?://\S+', cuerpo)
    if len(links) <= 1:
        checks.append(ok(f'{len(links)} enlace(s) (máx 1)'))
    else:
        checks.append(fallo(f'{len(links)} enlaces compitiendo (máx 1 principal)'))

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
            # correo 4 · Kaixito · el evento, ultima semana
            'por correo no te guardo sitio': '2026-09-16',
            'de las 20 sillas que quedan elegimos': '2026-09-16',
        }
        _hoy = datetime.date.today()
        q = next((x for x, f in QUEMADAS.items() if x in cuerpo_low
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

    # PPD: RunnerPro lleva Pd + Pd2 en 11 de 11 (§8g) y §5-HISTORIA reparte el trabajo
    # entre las dos (PD = referidos, PPD = remate de la historia). Aviso, no fallo.
    if tiene_pd and not re.search(r'^\s*(ppd|p\.?d\.?\s?2|pd2)', cuerpo_low, re.M):
        checks.append(aviso('Solo una PD. RunnerPro lleva Pd + Pd2 en 11 de 11 (§8g) y §5-HISTORIA '
                            'las reparte: PD = pedir el reenvío, PPD = remate de la historia'))

    # --- preview: sin techo medido, aviso a partir de 100 chars ---
    if preview and len(preview) > 100:
        checks.append(aviso(f'Preview de {len(preview)} chars; en móvil se corta mucho antes'))

    # --- firma humana (ventana de 10 líneas: P.S.+P.P.S.+baja pueden empujarla) ---
    ultimas = '\n'.join(cuerpo_lineas[-10:]).lower()
    if rem_base and rem_base in ultimas:
        checks.append(ok('Firma con el nombre del remitente'))
    else:
        checks.append(fallo('No se ve la firma humana con el nombre del remitente al final'))

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
