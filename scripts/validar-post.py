#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
validar-post.py — el pase de validación MECÁNICO de un post de LinkedIn de Neety.

Por qué existe: las reglas están escritas en docs/skills/ (~61.000 tokens), pero
estar escritas no basta. El 2026-07-14 se entregaron tres posts saltándose reglas
que YA existían (coma antes de "y", ancla de ventas, verbo punchy). Ninguna de las
tres estaba en el pase de validación, y confiar en releer 61k tokens de memoria no
es un plan. Esto lo hace determinista.

Lo que NO hace: no juzga si un dato es cierto, si el ángulo es aburrido o si el
hueso del remix está bien robado. Eso es criterio y vive en global-instructions §8.

Uso:
    python scripts/validar-post.py <fichero.txt> --pilar mapa|las10|objeto|meme|leadmagnet|historia|tarjeta
    (pilar tarjeta: ademas --tarjeta <fichero con el texto de dentro de la imagen>)
                                   [--cuenta Iker|Unai|Asier]

Salida: tabla de checks + "N/M". Exit 1 si hay violaciones.
"""
import sys, os, re, argparse, io, datetime

RAIZ = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
HISTORIAL = os.path.join(RAIZ, 'docs', 'skills', 'historial-publicaciones.md')

# --- vocabularios (de docs/skills/) -----------------------------------------
# ============ REGLAS AÑADIDAS EN LA AUDITORIA DEL 2026-07-20 ============
# Salieron de leer las 6 skills enteras buscando lo que estaba escrito pero
# nadie comprobaba. Criterio de admision: dato detras Y cero ambiguedad. Lo que
# dependia de la POLARIDAD de una frase (pinchar una region, criticar al lector)
# se descarto: un falso positivo enseña a ignorar el validador.

# brand-voice §3 — tabla de AI-tells, "en cuanto uno aparezca en un borrador,
# cambialo antes de entregar". Lista literal cerrada.
AI_TELLS = (r'\b(lo m[aá]s importante|lo fundamental|lo esencial|es (fundamental|crucial|clave) que'
            r'|hoy en d[ií]a|en la actualidad|en el mundo actual|sin embargo|no obstante|asimismo'
            r'|por lo tanto|en consecuencia|de esta manera|posibilita|optimizar|maximizar|potenciar'
            r'|numerosos|en definitiva|en resumen|en conclusi[oó]n|la clave est[aá] en|el secreto es)\b')

# global §2.8 y §6 — cierres quemados. El validador ya miraba OPENERS; estos
# viven al FINAL y no los veia nadie.
CIERRE_QUEMADO = r'^\s*(spoiler|plot twist|p\.?\s?d\.?|posdata)\s*:'

# global §6 — listicles con negrita Unicode. El check de markdown NO los caza:
# no son asteriscos, son otro bloque Unicode (Mathematical Alphanumeric Symbols).
NEGRITA_UNICODE = r'[𝐀-𝟿]'

# post-workflow §4.5 Paso 2 — el entregable generico esta MUERTO.
# Medido: "biblia de ventas" 1.2x · 2.3K impresiones, contra 8.52x y 9.85x de
# los entregables de UNA cosa concreta.
ENTREGABLE_GENERICO = (r'\b(biblia|todo mi material|todos mis recursos|toda mi (caja|carpeta|colecci[oó]n)'
                       r'|en una caja|el pack completo|arsenal)\b')

# post-workflow §4.5 puerta 4 — CTA implicita DEPRECADA: "hundieron el conteo de
# comentarios en dos A/B independientes".
CTA_IMPLICITA = r'(d[ií]melo abajo|levanto la mano|aqu[ií] abajo|te leo abajo)'

# post-workflow §4.5.0 — en el hook de ULTIMA HORA el sujeto es el TRABAJO del
# lector, nunca el modelo. Es el dato mas fuerte de todo el corpus: mismo hook,
# mismo emoji, mismo mes, 40x de diferencia.
#   trabajo -> 9.96x (632 com.) y 2.72x (167 com.)
#   modelo  -> 0.70x, 0.23x, 0.22x
SUJETO_ES_MODELO = (r'(claude\s*(opus|sonnet|haiku)?\s*\d|gpt-?\d|gemini\s*\d'
                    r'|el nuevo claude|ha salido \w+ ?\d|sonnet|opus)')


# §4.2 Paso 1 — En el peloteo el prejuicio SIEMPRE lo dice otro: "la ven como…",
# "nadie habla de…". Sin ese sujeto, el desprecio se lee como NUESTRO y ofende a
# quien queriamos que comentara defendiendo lo suyo (Iker, 2026-07-30).
SUJETO_AJENO = r'(nadie (?:habla|la tiene|la cuenta|sabe)|todos? (?:ven|la)|l[ao] (?:ven|llaman|conocen|tienen|despachan|colocan|cuentan|archivan|entierran|resumen|reducen|dan por|dejan atr[aá]s|pasan de largo|sitúan|situan)|le[s]? suena a|para el resto|en el mapa es|la pintan|se la imagina|solo (?:paran|se paran|pasan|la cruzan|lo cruzan|conocen|le conocen|saben de)|se l[ao] ventilan|l[ao] liquidan|l[ao] mandan de|l[ao] despiden)'
# 2026-10-01, "Las 10" de Castilla-La Mancha (Iker): el prejuicio tambien lo dice
# OTRO cuando es un GESTO de la gente en impersonal ("solo paran a por queso y
# gasolina"): es el desprecio de la region de paso sin ponerlo en nuestra boca.

# §4.2 Paso 1 — VERBOS DE PREJUICIO QUEMADOS. El sujeto ajeno es obligatorio,
# pero el VERBO tiene que rotar. "Fichada" salio el 30/07 en el despiece de
# Euskadi ("nadie lo tiene fichado como tierra de coches") y al dia siguiente
# volvia a abrir el mapa de Asturias, ademas DOS veces en el mismo post. El
# verbo es lo primero que se lee: repetirlo convierte el pilar en plantilla y
# el lector deja de notar el desprecio, que es el motor entero (Iker,
# 2026-07-31). No es que el verbo sea malo, es que ya esta gastado.
#
# COMO SE MANTIENE: cuando publiques un peloteo, mete aqui el verbo que hayas
# usado. La lista solo crece.
VERBO_PREJUICIO_QUEMADO = {
    'despiden': '2026-10-29 Navarra, mapa de Asier (de adición)',
    'dan por oxidado': '2026-10-22 Bizkaia, mapa de Iker (de adición)',
    'dan por oxidada': '2026-10-22 Bizkaia, mapa de Iker (de adición), en femenino',
    'tienen cerrad': '2026-10-16 Comunidad Valenciana, mapa de Unai',
    'mandan de': '2026-10-08 Canarias, mapa de Iker',
    'liquidan': '2026-10-27 Galicia, "Las 10" de Iker; antes La Rioja, "Las 10" de Asier 07/10',
    'ventilan': '2026-10-01 Castilla-La Mancha, "Las 10" de Iker',
    'dejan atrás': '2026-09-29 Extremadura, mapa de Asier',
    'dejan atras': '2026-09-29 Extremadura, mapa de Asier',
    'tienen calada': '2026-09-22 Álava, mapa de Iker',
    # Cada valor empieza por la fecha de la ULTIMA publicacion que lo uso y
    # caduca a los VENTANA_IDENTIDAD_DIAS (global 2.0b-VENTANA, Iker 2026-09-16).
    'despachan': '2026-10-16 Aragón, "Las 10" de Iker; antes Murcia (Iker 23/07)',
    'fichada': '2026-07-31 Asturias (Unai)',
    'fichado': '2026-07-30 Euskadi (Iker)',
    'jubilada': '2026-07-31 Asturias (Unai)',
    'la ven como': '2026-07-17 Navarra, Cataluña y Aragón (Iker 30/06, Unai 17/07, Asier 14/07)',
    'la llaman': '2026-07-07 Álava (Unai)',
    'la conocen por': '2026-06-09 País Vasco (Unai)',
    'nadie habla': '2026-04-28 Gipuzkoa (Iker) y País Vasco (Unai)',
    'en el mapa es': '2026-07-30 Euskadi (Iker)',
    'resumen': '2026-08-04 Castilla y León (Iker)',
    'todos ven': '2026-06-02 Valencia (Iker)',
    'archivan': '2026-08-07 Navarra, despiece de Asier',
    'dan por visto': '2026-09-01 Cantabria, mapa de Asier',
    'reducen': '2026-09-16 Bizkaia, despiece de Asier',
}

# §4.2 Paso 1 — la frase-rabia es el motor: sin ella el local no siente el
# desprecio, no comenta y no hay alcance. Familia validada + variantes.
FRASE_RABIA = (r'(y para de contar|y poco m[aá]s|y poco que rascar|y gracias|para irse'
               r'|antes de seguir carretera|de vuelta a|y a otra cosa|y ya|y punto|y hasta ah[ií]'
               # Variantes nuevas: el BEAT no cambia nunca (cliché de comer o de
               # fiesta + gesto de despacharla), las palabras rotan siempre
               # (§2.0b). Se añaden aquí el día que se estrenan, o el check pide
               # la frase-rabia y a la vez tumba la única forma que queda libre.
               r'|y a casa|y nada m[aá]s|y a la autov[ií]a|y se acab|y de ah[ií] no pasa'
               r'|y a secarse'
               # 2026-09-28, mapa de Extremadura (Asier): el gesto de despacharla
               # es seguir viaje hacia el pais de al lado, que es el prejuicio real
               # de la region (tierra de paso camino de Lisboa).
               r'|y a portugal'
               # 2026-10-01, "Las 10" de Castilla-La Mancha (Iker): la region de paso
               # se despacha parando solo a repostar. ⚠️ Va el GESTO ("y a repostar"),
               # nunca un sustantivo: "queso, molinos y la gasolinera" Iker lo leyo
               # como TRES cliches, y tenia razon (el tercero tiene que ser el gesto
               # de despacharla). Por eso aqui no entran "y la gasolinera" ni "y gasolina".
               r'|y a repostar'
               # 2026-10-08, mapa de Canarias (Iker): la region de vacaciones se
               # despacha mandandola a tumbarse. Gesto (ir a la tumbona), no un
               # tercer cliche: los dos del gancho son playa y platanos.
               r'|y a la tumbona'
               # 2026-10-16, mapa de la Comunidad Valenciana (Unai): el porche que
               # tienen cerrado hasta junio se despacha mandandolo a dormir. Gesto
               # (irse a la siesta), no un tercer cliche: los dos son naranjas y horchata.
               r'|y a la siesta'
               # 2026-10-28, mapa de Navarra (Asier): la region de una semana de fiesta
               # se despacha saliendo corriendo. Gesto (irse a la carrera, que ademas
               # guiña al encierro), no un tercer cliche: los dos son San Fermin y pacharan.
               r'|y a correr)')

# §4.4b — FRASES DEL SPAM NINJA QUEMADAS. El dolor es SIEMPRE el mismo (dar con
# el cliente ideal, empresa y persona), pero la FORMA rota en cada post. Iker,
# 2026-07-31: "seguro que hay miles de variantes, no puede ser que siempre me
# digas es dar con el que decide". Un cierre repetido hace que la publicacion
# nueva no se note nueva, que es justo lo contrario de para lo que existe.
# Al publicar, mete aqui la frase que hayas usado. La lista solo crece.
# global 4.4b-MUNICION - LAS DOS PROMESAS VETADAS DEL NINJA, con su tamano medido
# en el informe de demos del 2026-08-24 (258 citas, 63 empresas, 87 reuniones).
# No son reglas de estilo: cada una es una objecion que dicen 5 empresas.
#
# 1) AUTOMATISMO. "vimos tantos de estos mensajes que directamente los ignoramos,
#    se detecta claramente cuando esta automatizado" (Innobide, 20 jul). El que
#    lee nuestro post recibe esos mensajes A DIARIO: prometerle eso nos mete en
#    el monton que ya ignora. Es ademas lo que aboutme 1b prohibe desde siempre
#    ("nunca sin esfuerzo / lo hace por ti / tu solo cierras"), sin mecanizar.
#    FALLO DURO: son formulas de oferta, no hay lectura buena.
PROMESA_AUTOMATISMO = (r'(lo hacemos por ti|lo hace por ti|escribe por ti|escribimos por ti'
                       r'|contactamos por ti|prospectamos por ti|vendemos por ti'
                       r'|sin mover un dedo|sin que muevas un dedo|sin esfuerzo'
                       r'|t[uú] solo cierras|solo tienes que cerrar|solo tienes que firmar'
                       r'|(lo |los |el mensaje |los mensajes )?(lo )?escribe la ia'
                       r'|en piloto autom[aá]tico|se (contactan|escriben|mandan) solos?'
                       r'|nos encargamos de escribir)')
#
# 2) VOLUMEN. Es la queja literal contra Waalaxy y Apollo: "campanas demasiado
#    masivas, con unos ratios de conversion muy bajos, mas de volumen" (i+Med,
#    27 jul). Prometer cantidad nos mete en su caja gratis.
#    AVISO, no fallo: el ninja PUEDE nombrar el volumen como ENEMIGO ("mandar
#    500 mensajes lo hace cualquiera, dar con el que firma no"), que es un buen
#    ninja. Lo que hay que mirar es de que lado de la frase esta el numero, y eso
#    es criterio.
PROMESA_VOLUMEN = (r'(cientos de (leads|contactos|empresas|clientes)'
                   r'|miles de (leads|contactos|correos|mensajes)'
                   r'|m[aá]s (leads|contactos)\b|\bx\s?[2-9]\b|de volumen|a volumen)')

# ⏳⏳ LA VENTANA DE FRESCURA (Iker, 2026-09-15). Estas listas NO son una lista
# negra: son memoria a corto plazo. Iker: "si espaciamos entre publicaciones no
# hace falta que esas palabras las metas como quemadas, rollo prohibidas, sino
# que mientras dos o tres publicaciones seguidas en la misma cuenta no repitan
# esas mismas palabras, luego podremos repetirlas".
#
# POR QUE HACIA FALTA, Y ES CONTABLE: `ARRANQUE_QUEMADO` gana ~1,6 entradas por
# publicacion (16 entradas en historia con 10 posts) y la casa publica ~9 a la
# semana. A ese ritmo, en tres meses hay mas arranques prohibidos que formas
# naturales de empezar una frase en castellano, y la regla acaba obligando a
# escribir raro — que es justo lo contrario de `brand-voice §3c`. Una lista que
# solo crece se come el idioma.
#
# ⚠️ LOS NUMEROS SON CRITERIO Y VAN DECLARADOS COMO TAL (working-preferences §0c):
# lo unico MEDIDO que tenemos sobre espaciado es `post-workflow §4.4-REPETIR`, y
# es de REFERENCIAS (a 2 dias, 5,8% del original; a 98 dias, funciona). Una
# referencia es el elemento mas visible que existe; un arranque de anafora es el
# menos. De ahi el orden de magnitud: el ninja, que es la linea que pide el clic
# y la que mas se lee como molde, hereda el minimo medido de un mes; el arranque
# se queda en tres semanas, que son ~9 publicaciones de esa cuenta (3 veces las
# "dos o tres" que pide Iker) y ~27 de la casa.
#
# 🔄🔄 LA VENTANA ES POR CUENTA (Iker, 2026-09-16, y manda sobre lo del 25/08).
# Aqui ponia "vale para las 3 cuentas", sacado de un "aunque sea otra cuenta, me
# da igual" del 25/08. Iker lo corrigio dos veces despues: "que dos o tres
# publicaciones seguidas EN LA MISMA CUENTA no repitan esas mismas palabras"
# (15/09) y "que esas palabras quemadas sean por cuenta y que pasado un
# determinado tiempo caduquen" (16/09). Asi que:
#   - bloquea (fallo duro) solo si la uso LA MISMA cuenta dentro de su ventana;
#   - si la uso OTRA cuenta hace menos de VENTANA_OTRA_CUENTA_DIAS, sale un
#     AVISO que no cuenta: el lector de los tres perfiles es el mismo y conviene
#     verlo, pero no se prohibe.
#   - sin --cuenta no se sabe quien publica, asi que bloquea como antes.
# La cuenta se lee del propio texto de la entrada (Iker/Unai/Asier).
#
# ⛔ TODAS LAS LISTAS CADUCAN, tambien las de identidad del peloteo (ver
# VENTANA_IDENTIDAD_DIAS). Lo unico que no caduca es un VETO: una entrada SIN
# fecha, y solo se escribe sin fecha lo que esta prohibido por contenido (una
# critica a España), nunca lo que simplemente ya se uso.
#
# ⛔ Y LOS CLICHES NO ESTAN EN NINGUNA LISTA, a proposito. Si una region se
# vuelve a hacer, sus cliches tipicos se pueden volver a usar: son de la region,
# no del post. Lo que rota es lo que INVENTAMOS (concepto, pais, frase-rabia,
# verbo, arranque, ninja).
# Cadencia MEDIDA en la BD el 2026-09-16 (desde el 01/06, Iker y Unai): dentro
# de una cuenta, meme, lead magnet e historia salen cada ~7 dias; un peloteo
# cada ~14; y la cuenta entera publica cada 1-3 dias.
# "Dos o tres publicaciones seguidas" = 3 publicaciones de esa cuenta:
VENTANA_ARRANQUE_DIAS = 21     # el arranque va por pilar: 3 x 7 dias
VENTANA_NINJA_DIAS = 21        # el ninja va en casi todo; antes 30 (el minimo medido de REFERENCIAS, que no son ninjas)
VENTANA_OTRA_CUENTA_DIAS = 7   # solo aviso: otra cuenta lo acaba de usar
# 🔄 LAS LISTAS DE IDENTIDAD DEL PELOTEO TAMBIEN CADUCAN (Iker, 2026-09-16).
# Hasta hoy pais, concepto, frase-rabia y verbo del prejuicio eran para siempre.
# Iker: "lo importante es que dos o tres publicaciones seguidas no repitan... pero
# sin ser tan exigente de nunca mas repetir una palabra, una frase o un concepto".
# 42 dias = 3 peloteos seguidos de una misma cuenta, con la mediana MEDIDA de 14
# dias entre peloteos de la misma cuenta (22 publicados, 2026-09-16). Criterio
# derivado, no medido en rendimiento. Lo que NO caduca: la REGION dentro de una
# misma cuenta (va por el historial) y las entradas sin fecha, que son vetos.
VENTANA_IDENTIDAD_DIAS = 42

_RE_FECHA_ENTRADA = re.compile(r'^(\d{4})-(\d{2})-(\d{2}) ')


_CUENTAS = ('iker', 'unai', 'asier')
AVISOS_OTRA_CUENTA = []


def cuentas_de(valor):
    """Las cuentas que nombra una entrada de lista ('2026-09-16 ... Asier')."""
    return {c for c in _CUENTAS if re.search(r'(?<![a-z])' + c + r'(?![a-z])', valor, re.I)}


def quemada(clave, valor, ventana_dias, cuenta=None, hoy=None):
    """True si BLOQUEA a esta cuenta hoy (Iker, 2026-09-16: por cuenta y con caducidad).

    Sin fecha = veto de contenido, bloquea siempre. Con fecha y fuera de la
    ventana, libre. Dentro de la ventana, bloquea si la uso esta misma cuenta,
    si la entrada no dice de quien era, o si no sabemos quien publica. Si fue
    otra cuenta hace muy poco, se anota para un aviso que no cuenta.
    """
    import datetime
    if not vigente(valor, ventana_dias, hoy):
        return False
    m = _RE_FECHA_ENTRADA.match(valor)
    if not m:
        return True
    cs = cuentas_de(valor)
    if not cuenta or not cs or cuenta.lower() in cs:
        return True
    pub = datetime.date(int(m.group(1)), int(m.group(2)), int(m.group(3)))
    dias = ((hoy or datetime.date.today()) - pub).days
    if dias < VENTANA_OTRA_CUENTA_DIAS:
        AVISOS_OTRA_CUENTA.append('"%s" (%s, hace %d dias)' % (clave, '/'.join(sorted(cs)), dias))
    return False


def vigente(valor, ventana_dias, hoy=None):
    """True si esa palabra sigue quemada HOY.

    El valor de la lista empieza por la fecha de PUBLICACION en ISO
    (`2026-09-11 historia de Unai...`). Sin fecha delante no se puede liberar,
    asi que se queda quemada para siempre: no inventamos la fecha de un post
    que no sabemos cuando salio.
    """
    import datetime
    m = _RE_FECHA_ENTRADA.match(valor)
    if not m:
        return True
    pub = datetime.date(int(m.group(1)), int(m.group(2)), int(m.group(3)))
    hoy = hoy or datetime.date.today()
    return (hoy - pub).days < ventana_dias


SPAM_QUEMADO = {
    # Iker 30/10, meme de las llamadas (desgaste), leido del texto publicado (BD, 13:56).
    '101 llamadas las hace cualquiera, saber a quién no': '2026-10-30 meme de Iker 30/10 (desgaste, /solicitar-demo, tipo 2), la linea 1 del ninja',
    '101 llamadas las hace cualquiera, saber a quien no': '2026-10-30 meme de Iker 30/10, sin tilde',
    'eso sí te lo damos hecho, empresa y persona': '2026-10-30 meme de Iker 30/10, la linea 2 del ninja',
    'eso si te lo damos hecho, empresa y persona': '2026-10-30 meme de Iker 30/10, sin tilde',
    # Asier 29/10, mapa de Navarra de adicion, leido del texto publicado (BD, 12:05).
    'desde la valla del corral no ves quién te compraría': '2026-10-29 mapa de Asier 29/10 (Navarra, gate del webinar, tipo 1), la linea 1 del ninja (recoge la metafora del gancho)',
    'desde la valla del corral no ves quien te compraria': '2026-10-29 mapa de Asier 29/10, sin tilde',
    'eso sí te lo enseñamos en vídeo y en diapositivas': '2026-10-29 mapa de Asier 29/10, la linea 2 del ninja',
    'eso si te lo ensenamos en video y en diapositivas': '2026-10-29 mapa de Asier 29/10, sin tilde',
    'las que te comprarían a ti siguen dentro, sin cartel': '2026-10-29 mapa de Asier 29/10, la linea puente',
    'las que te comprarian a ti siguen dentro, sin cartel': '2026-10-29 mapa de Asier 29/10, la linea puente, sin tilde',
    'cómo dejar de buscar a ciegas, elegir bien las empresas y llegar a quien firma': '2026-10-29 mapa de Asier 29/10, la linea de valor del contexto',
    'como dejar de buscar a ciegas, elegir bien las empresas y llegar a quien firma': '2026-10-29 mapa de Asier 29/10, sin tilde',
    'si te lo perdiste, ya lo tienes entero y sin pagar': '2026-10-29 mapa de Asier 29/10, la linea del por que ahora',
    # Asier 27/10, historia del fabricante que se sabe sus clientes de memoria, leido del texto publicado (BD, 13:54).
    'un buen comercial se sabe sus clientes de memoria': '2026-10-27 historia de Asier 27/10 (webinar, tipo 2), la linea 1 del ninja (recoge el gancho)',
    'a quién llegar en esos clientes, te lo enseñamos': '2026-10-27 historia de Asier 27/10, la linea 2 del ninja',
    'a quien llegar en esos clientes, te lo ensenamos': '2026-10-27 historia de Asier 27/10, sin tilde',
    'lo vemos en un evento desde casa, no cuesta nada y hoy aún llegas': '2026-10-27 historia de Asier 27/10, la linea del plazo (vispera)',
    'lo vemos en un evento desde casa, no cuesta nada y hoy aun llegas': '2026-10-27 historia de Asier 27/10, sin tilde',
    # Iker 27/10, "Las 10" de Galicia, leido del texto publicado (BD, 12:07).
    'frotar a mano en el lavadero lo hace cualquiera': '2026-10-27 "Las 10" de Iker 27/10 (Galicia, webinar), la linea 1 del ninja (recoge la metafora del gancho)',
    'quién te compraría, eso sí te lo enseñamos': '2026-10-27 "Las 10" de Iker 27/10 (Galicia, webinar), la linea 2 del ninja',
    'quien te compraria, eso si te lo ensenamos': '2026-10-27 "Las 10" de Iker 27/10 (Galicia, webinar), la linea 2 del ninja, sin tilde',
    'solo quedan unas horas para el evento de mañana': '2026-10-27 "Las 10" de Iker 27/10 (Galicia, webinar), la linea de contexto del webinar',
    'solo quedan unas horas para el evento de manana': '2026-10-27 "Las 10" de Iker 27/10 (Galicia, webinar), la linea de contexto, sin tilde',
    'las que necesitan lo que tú vendes no salen en ninguna lista': '2026-10-27 "Las 10" de Iker 27/10 (Galicia, webinar), la linea puente',
    'las que necesitan lo que tu vendes no salen en ninguna lista': '2026-10-27 "Las 10" de Iker 27/10 (Galicia, webinar), la linea puente, sin tilde',
    # Iker 22/10, mapa de Bizkaia de adición, leido del texto publicado (Unipile, 13:51).
    'rebuscar en el desván a oscuras lo hace cualquiera': '2026-10-22 mapa de Iker 22/10 (Bizkaia, webinar, tipo 1), la linea 1 del ninja (recoge la metafora del gancho)',
    'rebuscar en el desvan a oscuras lo hace cualquiera': '2026-10-22 mapa de Iker 22/10, sin tilde',
    'encontrar ahí a tus clientes sí te lo enseñamos': '2026-10-22 mapa de Iker 22/10, la linea 2 del ninja',
    'encontrar ahi a tus clientes si te lo ensenamos': '2026-10-22 mapa de Iker 22/10, sin tilde',
    'el miércoles 28 vemos cómo dar con ellas': '2026-10-22 mapa de Iker 22/10, la linea de contexto del webinar',
    'el miercoles 28 vemos como dar con ellas': '2026-10-22 mapa de Iker 22/10, sin tilde',
    'las que encajan con lo que vendes no salen en ningún mapa': '2026-10-22 mapa de Iker 22/10, la linea puente',
    'las que encajan con lo que vendes no salen en ningun mapa': '2026-10-22 mapa de Iker 22/10, la linea puente, sin tilde',
    # Iker 21/10, meme del perro (repeticion de "Tu informe de ventas resucita clientes muertos" de Unai), leido de la BD.
    '«decisor identificado» lo pone cualquier informe': '2026-10-21 meme de Iker 21/10 (el informe que resucita clientes, webinar, tipo 2), la linea 1 del ninja',
    'decisor identificado» lo pone cualquier informe': '2026-10-21 meme de Iker 21/10, sin las comillas de apertura',
    'quién firma de verdad, eso sí te lo contamos': '2026-10-21 meme de Iker 21/10, la linea 2 del ninja',
    'quien firma de verdad, eso si te lo contamos': '2026-10-21 meme de Iker 21/10, sin tilde',
    'el miércoles 28, evento gratuito por internet': '2026-10-21 meme de Iker 21/10, la linea de contexto del webinar',
    'el miercoles 28, evento gratuito por internet': '2026-10-21 meme de Iker 21/10, sin tilde',
    # Iker 20/10, historia de las avispas, leido de la BD el 21/10 (no se habia anotado al publicar).
    'correr tras lo que se cuela en la lista se come meses': '2026-10-20 historia de Iker 20/10 (las avispas, webinar, tipo 1), la linea 1 del ninja',
    'quién merece estar en esa lista, te lo enseñamos': '2026-10-20 historia de Iker 20/10, la linea 2 del ninja',
    'quien merece estar en esa lista, te lo ensenamos': '2026-10-20 historia de Iker 20/10, sin tilde',
    'el miércoles 28 lo arreglamos en directo, gratis': '2026-10-20 historia de Iker 20/10, la linea de contexto del webinar',
    'el miercoles 28 lo arreglamos en directo, gratis': '2026-10-20 historia de Iker 20/10, sin tilde',
    'buscar a mano no le ahorra la semana a nadie': '2026-10-21 historia de Unai 21/10 (el jefe comercial que dedicaba 3 personas a buscar, webinar, tipo 4), la linea 1 del ninja',
    'esa semana sí te ayudamos a recuperarla': '2026-10-21 historia de Unai 21/10, la linea 2 del ninja',
    'esa semana si te ayudamos a recuperarla': '2026-10-21 historia de Unai 21/10, sin tilde',
    'de esto va el evento del miércoles 28': '2026-10-21 historia de Unai 21/10, la linea de contexto del webinar (1a con la palabra evento)',
    'de esto va el evento del miercoles 28': '2026-10-21 historia de Unai 21/10, sin tilde',
    'un filtro no le dice al comercial quién firma dentro': '2026-10-15 historia-video de Unai 15/10 (entrevista de Telmo, webinar, tipo 2), la linea 1 del ninja',
    'un filtro no le dice al comercial quien firma dentro': '2026-10-15 historia-video de Unai 15/10, sin tilde',
    'ese nombre de dentro sí te lo enseñamos': '2026-10-15 historia-video de Unai 15/10, la linea 2 del ninja',
    'ese nombre de dentro si te lo ensenamos': '2026-10-15 historia-video de Unai 15/10, sin tilde',
    'el miércoles 28 damos una sesión gratis por videollamada': '2026-10-15 historia-video de Unai 15/10, la linea de contexto del webinar',
    'el miercoles 28 damos una sesion gratis por videollamada': '2026-10-15 historia-video de Unai 15/10, sin tilde',
    'un excel así le cuesta meses de calle': '2026-10-14 historia de Unai 14/10 (el Excel antes que las maquinas, webinar, tipo 4), la linea 1 del ninja',
    'un excel asi le cuesta meses de calle': '2026-10-14 historia de Unai 14/10, sin tilde',
    'buscar menos y vender más, eso sí te lo explicamos': '2026-10-14 historia de Unai 14/10, la linea 2 del ninja',
    'buscar menos y vender mas, eso si te lo explicamos': '2026-10-14 historia de Unai 14/10, sin tilde',
    'el miércoles 28 damos una charla online y gratis': '2026-10-14 historia de Unai 14/10, la linea de contexto del webinar',
    'el miercoles 28 damos una charla online y gratis': '2026-10-14 historia de Unai 14/10, sin tilde',
    'lanzar mensajes a miles que no comprarán': '2026-10-08 historia-video de Unai 08/10 (resumen de Neety Forward, webinar), la linea 1 del ninja',
    'lanzar mensajes a miles que no compraran': '2026-10-08 historia-video de Unai 08/10, sin tilde',
    'cuáles sí comprarían, te lo enseñamos nosotros': '2026-10-08 historia-video de Unai 08/10, la linea 2 del ninja',
    'cuales si comprarian, te lo enseñamos nosotros': '2026-10-08 historia-video de Unai 08/10, sin tilde',
    'el miércoles 28 lo contamos online y gratis': '2026-10-08 historia-video de Unai 08/10, la linea de contexto del webinar',
    'el miercoles 28 lo contamos online y gratis': '2026-10-08 historia-video de Unai 08/10, sin tilde',
    'ninguna charla te dice a quién llamar': '2026-10-07 meme de Iker 07/10 (el leon que dimite), la linea 1 del ninja',
    'ninguna charla te dice a quien llamar': '2026-10-07 meme de Iker 07/10, sin tilde',
    'eso sí te lo damos, hasta con nombre y cargo': '2026-10-07 meme de Iker 07/10, la linea 2 del ninja',
    'eso si te lo damos, hasta con nombre y cargo': '2026-10-07 meme de Iker 07/10, sin tilde',
    'del vino sabe todo el mundo': '2026-10-07 La Rioja, "Las 10" de Asier, la linea 1 del ninja',
    'eso ya te lo decimos nosotros, con nombre': '2026-10-07 La Rioja, "Las 10" de Asier, la linea 2 del ninja',
    'aplaudir al comercial es fácil': '2026-10-07 historia de Unai 07/10 (la mesa redonda de Neety Forward), la linea 1 del ninja',
    'aplaudir al comercial es facil': '2026-10-07 historia de Unai 07/10, sin tilde',
    'eso sí lo hacemos nosotros, empresa y quien decide': '2026-10-07 historia de Unai 07/10, la linea 2 del ninja',
    'eso si lo hacemos nosotros, empresa y quien decide': '2026-10-07 historia de Unai 07/10, sin tilde',
    'el teléfono te trae al cliente de siempre': '2026-10-02 historia de Unai 02/10 (el teléfono del director comercial), la linea 1 del ninja',
    'el telefono te trae al cliente de siempre': '2026-10-02 historia de Unai 02/10, sin tilde',
    'a ese nuevo sí te lo señalamos': '2026-10-02 historia de Unai 02/10, la linea 2 del ninja',
    'a ese nuevo si te lo senalamos': '2026-10-02 historia de Unai 02/10, sin tildes',
    'vender es cosa del comercial': '2026-10-02 meme de Asier 02/10 (la IA viene a por el puesto), la linea 1 del ninja',
    'esa parte ya te la damos hecha': '2026-10-02 meme de Asier 02/10, la linea 2 del ninja',
    'filtrar por sector lo hace cualquiera': '2026-10-01 historia de Asier 01/10 (el filtro), la linea 1 del ninja',
    'eso lo hacemos empresa a empresa': '2026-10-01 historia de Asier 01/10, la linea 2 del ninja',
    'al repostar no se ve': '2026-10-01 "Las 10" de Castilla-La Mancha, Iker, la linea 1 del ninja',
    'ya le ponemos nombre nosotros': '2026-10-01 "Las 10" de Castilla-La Mancha, Iker, la linea 2 del ninja',
    'nadie se plancha la camisa': '2026-10-02 historia de Mario 02/10 (la camisa planchada), la linea 1 del ninja',
    'por saber quién te comprará sí': '2026-10-02 historia de Mario 02/10, la linea 2 del ninja',
    'por saber quien te comprara si': '2026-10-02 historia de Mario 02/10, sin tildes',
    'te trae lectores. al que te compra, no': '2026-09-29 meme de Mario 29/09 (resubida del algoritmo), la linea 1 del ninja',
    'con nombre y apellidos': '2026-09-29 meme de Mario 29/09, la linea 2 del ninja',
    'nunca te dice a quién llamar': '2026-09-29 meme de Iker 29/09 (el del globo), la linea 1 del ninja',
    'nunca te dice a quien llamar': '2026-09-29 meme de Iker 29/09, sin tilde',
    'hasta el nombre de quien decide': '2026-09-29 meme de Iker 29/09, la linea 2 del ninja',
    'lo que no cabe en la lista': '2026-09-29 Extremadura, mapa de Asier, la linea 1 del ultra ninja en bloque de 2 (A/B de forma)',
    'no te presenta a nadie': '2026-09-22 mapa de Álava, Iker 22/09, la linea 1',
    'ya quedan las últimas plazas': '2026-09-22 mapa de Álava, Iker 22/09',
    'ya quedan las ultimas plazas': '2026-09-22 mapa de Álava, Iker 22/09, sin tilde',
    'dar con el que decide': '2026-07-31 meme Unai 29/07, historia Iker 29/07, mapa Asturias 31/07',
    'son meses a mano': '2026-07-31 lo mismo, en los tres (Unai e Iker)',
    'te lo damos hecho': '2026-07-31 lo mismo, en los tres (Unai e Iker)',
    'te lo damos resuelto': '2026-08-18 historia de Iker 18/08 (era la variante de "te lo damos hecho")',
    'te lo marcamos': '2026-08-19 meme de Iker 19/08 (el de la transcripcion de la llamada)',
    'acertar con quien no': '2026-08-21 historia de Unai 21/08 (la del evento en el ninja)',
    'saber quien compra': '2026-08-27 meme de Iker 27/08 (el de la ficha del cliente)',
    'saber quien compra, no': '2026-08-27 meme de Iker 27/08, la forma con la coma',
    # Con tilde tambien: el check compara por substring y NO pliega acentos,
    # asi que sin esta linea la lista no cazaba el texto real publicado.
    # Mismo patron que 'lo cuento en el correo antes que aqui/aquí'.
    'saber quién compra': '2026-08-27 meme de Iker 27/08, la forma con tilde',
    # EVENTO · los 6 ninjas de Luma publicados entre el 01 y el 11/09, leidos del
    # texto real de la BD el 2026-09-15. Se anotan las LINEAS 2, que son las que
    # se repiten de un post a otro; las lineas 1 cuelgan del gancho de cada uno y
    # no se reutilizan. Con estas seis dentro, el unico sustantivo del aforo que
    # queda libre ya no es sillas, sitios, huecos, nombres, plazas ni personas.
    'esa agenda se llena en solo 80 sillas': '2026-09-01 meme de Iker 01/09',
    'en esa mesa sí lo hacemos y solo hay 80 sitios': '2026-09-02 historia de Unai 02/09',
    'a esa sala solo entran 80 personas': '2026-09-03 meme de Asier 03/09',
    'en esa sala sí te esperan y solo hay 80 huecos': '2026-09-08 historia de Iker 08/09',
    'en esa sala sí entras y solo hay 80 sillas': '2026-09-09 historia de Asier 09/09',
    'en esa sala sí están y son solo 80 nombres': '2026-09-11 historia de Unai 11/09',
    # Y las dos formas de LINEA 1 que si son reutilizables, porque no dependen
    # del gancho: el molde "un X no te lleva/mete a la sala".
    'no te mete en la sala': '2026-09-09 historia de Asier 09/09',
    'no te lleva a la sala de los que deciden': '2026-09-11 historia de Unai 11/09',
    'en esta sala sí está y tan solo hay 80 invitados': '2026-09-15 historia de Iker 15/09',
    'no aparece en cualquier sala': '2026-09-15 historia de Iker 15/09, la linea 1',
    'sí te lo damos, con su contacto': '2026-09-16 meme de Iker 16/09',
    'a recepción llega cualquiera': '2026-09-16 meme de Iker 16/09, la linea 1',
    'esa carretera acaba en una sala': '2026-09-15 "Los 10" de Gipuzkoa, Unai 15/09',
    'los encuentras de uno en uno': '2026-09-15 "Los 10" de Gipuzkoa, Unai 15/09, la linea 1 del bloque',
    'saber quien firma dentro': '2026-08-07 despiece de Navarra, Asier 07/08',
    'saber quién firma dentro': '2026-08-07 despiece de Navarra, Asier 07/08, la forma con tilde',
    'nosotros sí, pero ya solo quedan': '2026-09-16 despiece de Bizkaia, Asier 16/09',
    'no te sienta en la sala del que': '2026-09-16 despiece de Bizkaia, Asier 16/09, la linea 1',
    'no te sienta al lado de quien compra': '2026-09-17 Iker 17/09, la linea 1',
    'la primera sala se quedó corta': '2026-09-17 Iker 17/09',
    'nunca te hace sitio en su mesa': '2026-09-18 Unai 18/09, cartel de ponentes, la linea 1',
    'la pidió tanta gente que la agrandamos': '2026-09-18 Unai 18/09, cartel de ponentes',
    'no lo calma una sala cualquiera': '2026-09-18 meme de Asier 18/09, la linea 1',
    'tanto que la primera quedó corta': '2026-09-18 meme de Asier 18/09',
    'nunca llega a quien firma': '2026-09-22 meme de Unai 22/09 (correo a "Direccion"), la linea 1',
    'en el evento sí, pero ya se acaban': '2026-09-22 meme de Unai 22/09',
    'en el evento si, pero ya se acaban': '2026-09-22 meme de Unai 22/09, sin tilde',
    'el después empieza en la sala': '2026-09-23 historia de equipo de Unai 23/09, la linea 1',
    'el despues empieza en la sala': '2026-09-23 historia de equipo de Unai 23/09, sin tilde',
    'y en esa sala aún te hacemos sitio': '2026-09-23 historia de equipo de Unai 23/09',
    'y en esa sala aun te hacemos sitio': '2026-09-23 historia de equipo de Unai 23/09, sin tilde',
    'una alarma te avisa de que alguien entra': '2026-09-30 historia de Iker 30/09, la linea 1',
    'eso sí te lo marcamos nosotros': '2026-09-30 historia de Iker 30/09',
    'eso si te lo marcamos nosotros': '2026-09-30 historia de Iker 30/09, sin tilde',
    # Historia de Iker del 23/09 (la fabrica y el coche), leida del texto publicado
    # en la BD el 2026-09-29: no se habia anotado al publicarse.
    'no lo ves desde el coche': '2026-09-23 historia de Iker 23/09, la linea 1',
    'nosotros sí te decimos quién decide': '2026-09-23 historia de Iker 23/09',
    'nosotros si te decimos quien decide': '2026-09-23 historia de Iker 23/09, sin tilde',
}

# §4.2 Paso 1 — CONCEPTOS DE GANCHO YA USADOS. La receta decia "no repitas
# concepto usado" y no habia lista: dependia de que yo recordara diez posts.
# Auditoria del 2026-07-31.
# §4.2 Paso 2 — PAISES YA USADOS EN LA COMPARACION. Lista nueva del 2026-08-03:
# no existia y por eso propuse Bolivia para Castilla y Leon sin darme cuenta de
# que ya era el pais del mapa de Navarra. La comparacion es lo que se comparte,
# asi que repetirla se nota mas que ninguna otra cosa.
PAIS_QUEMADO = {
    'cuba': '2026-10-29 Navarra, mapa de Asier (de adición)',
    'guatemala': '2026-10-27 Galicia, "Las 10" de Iker',
    'bosnia': '2026-10-22 Bizkaia, mapa de Iker (de adición)',
    'costa rica': '2026-10-16 Comunidad Valenciana, mapa de Unai',
    'sri lanka': '2026-10-16 Aragón, "Las 10" de Iker',
    'kenia': '2026-10-01 Castilla-La Mancha, "Las 10" de Iker; antes Aragón (Asier 14/07)',
    'moldavia': '2026-09-29 Extremadura, mapa de Asier',
    'islandia': '2026-09-22 Álava, mapa de Iker',
    'uruguay': '2026-07-23 Murcia (Iker)',
    'bolivia': '2026-06-30 Navarra (Iker)',
    'croacia': '2026-06-16 Galicia (Iker)',
    'luxemburgo': '2026-06-02 Valencia (Iker)',
    'italia': '2026-05-13 Andalucía (Iker)',
    'portugal': '2026-04-30 Cataluña (Iker)',
    'chipre': '2026-07-31 Asturias (Unai)',
    'finlandia': '2026-07-17 Cataluña (Unai)',
    'honduras': '2026-07-07 Álava (Unai)',
    'paraguay': '2026-08-04 Castilla y León (Iker)',
    'montenegro': '2026-10-07 La Rioja, "Las 10" de Asier; antes Navarra, despiece de Asier 07/08',
    'jamaica': '2026-10-08 Canarias, mapa de Iker; antes Cantabria, mapa de Asier 01/09',
    'noruega': '2026-09-16 Bizkaia, despiece de Asier',
}

# 4.4e - FRASES QUEMADAS DEL SEGUNDO NINJA, EL DEL CORREO. Misma logica que
# SPAM_QUEMADO pero lista aparte: el dolor de este bloque es OTRO (enterarte el
# ultimo, no la identificacion), asi que sus frases se gastan por su cuenta.
# Al publicar, mete aqui la frase usada. La lista solo crece.
SPAM_QUEMADO_CORREO = {
    'lo cuento en el correo antes que aqui': '2026-08-19 meme de Iker 19/08, el PRIMER bloque de correo publicado',
    'lo cuento en el correo antes que aquí': '2026-08-19 meme de Iker 19/08, el PRIMER bloque de correo publicado',
    # 4.4e-ROTA (Iker, 2026-08-24). Faltaba la de Mario del 21/08 y era justo la
    # que yo iba a repetir en el post de Asier. Lo que se conserva del bloque es
    # `correo de ventas` (dice de quien es y de que va); lo que ROTA en cada post
    # es el ARRANQUE que la precede, y sale del final de la linea 1, no de un
    # banco de frases. La linea 1 ya rota sola porque cuelga del gancho; la 2 no
    # cuelga de nada, asi que si nadie la mueve se queda fija para siempre.
    'va en el correo de ventas': '2026-08-21 post de Mario 21/08 (la caida de los influencers)',
    'de eso va nuestro correo de ventas': '2026-08-21 post de Mario 21/08, la forma larga',
    'eso lo tienen antes los del correo': '2026-08-20 meme de Asier 20/08 (el de la busqueda de Google)',
}

# §2.0b — ARRANQUES DE BLOQUE YA PUBLICADOS, POR PILAR (Iker, 2026-08-25).
# La ley de variedad listaba concepto, verbo del prejuicio, frase-rabia, spam,
# opener, cierre y reveal... y NO listaba el ARRANQUE DE LA ANAFORA de los
# bloques de 2 y de 3, que es lo que el lector ve tres veces seguidas. Resultado:
# entregue `La web / La centralita / La persona` una semana despues de que la
# historia de Iker del 18/08 publicara `La eche / La eche / La eche`. Mismo
# pilar, mismo arranque, cuenta distinta — y a Iker le da igual la cuenta:
# "aunque sea otra cuenta, me da igual, hay que seguir sorprendiendo".
# Al publicar se mete aqui el arranque usado. Va de AVISO y no de fallo duro
# porque `No`, `La` o `Me` son palabras demasiado comunes para vetarlas a ciegas:
# lo que hace falta es VERLAS al entregar, que es justo lo que faltaba.
ARRANQUE_QUEMADO = {
    'evento': {
        'vienen': '2026-09-18 evento de Unai 18/09 ("Vienen de la industria / del marketing / de construir la IA")',
    },
    # Verificados leyendo el texto publicado.
    'historia': {
        'la': '2026-10-27 historia de Asier 27/10 ("La fabrica / La empresa / La persona que compra dentro"); antes Iker 18/08',
        'ni': '2026-08-13 historia de Iker 13/08 ("Ni una pregunta por el precio")',
        # Publicados y leidos, no deducidos (§0f: la lista se toca al PUBLICAR).
        'nadie': '2026-08-21 historia de Unai 21/08 ("Nadie las abria / Nadie me las pedia")',
        'no': '2026-09-30 historia de Iker 30/09 ("No ardia nada / No era la de incendios / No paro"); antes Unai 21/08',
        'hoy': '2026-08-21 historia de Unai 21/08 ("Hoy no toco el codigo / Hoy levanto dinero")',
        'aquel': '2026-08-25 historia de Asier 25/08 ("Aquel numero era de la casa entera")',
        'me': '2026-08-25 historia de Asier 25/08 ("Me pregunto quien era yo / de que conocia")',
        'a': '2026-10-27 historia/evento de Unai ("A Nora... / A Asier... / Y a Mayi...", el agradecimiento a los ponentes)',
        'sabe': '2026-08-25 historia de Asier 25/08 ("Sabe el nombre / Sabe el numero / Sabe todo")',
        # Leidos del texto PUBLICADO de la ventana 01-11/09 (BD en vivo,
        # 2026-09-15). Llevaban desde el 27/08 sin anotarse, y por eso el
        # borrador de Iker del 15/09 salio con `Llevaba 3 semanas / Llevaba 11
        # llamadas` cuatro dias despues del `Llevaba 300 empresas / Llevaba 11
        # anos` de Unai: mismo arranque Y la misma cifra, en cuenta hermana.
        'recogi': '2026-09-02 historia de Unai 02/09 ("Recogi 200 tarjetas / Recogi la tarjeta")',
        'busco': '2026-09-02 historia de Unai 02/09 ("Busco solo a esos 12 / Busco antes / Busco 2 dias menos")',
        'llame': '2026-09-08 historia de Iker 08/09 ("Llame por orden alfabetico / Llame 60 veces")',
        'traia': '2026-09-08 historia de Iker 08/09 ("Traia un listado / Traia 400 nombres / Traia empresas")',
        'dentro': '2026-09-09 historia de Asier 09/09 ("Dentro tenia 40 empresas / Dentro tenia fotos")',
        'llevaba': '2026-09-11 historia de Unai 11/09 ("Llevaba 300 empresas / Llevaba 11 anos")',
        'dejo': '2026-09-11 historia de Unai 11/09 ("Dejo el ordenador / Dejo la cartera / Dejo cada ficha")',
        'estaba': '2026-09-11 historia de Unai 11/09 ("Estaba el nombre / Estaba el telefono")',
        'gaste': '2026-09-15 historia de Iker 15/09 ("Gaste 3 semanas / Gaste 7 llamadas")',
        'volvi': '2026-09-15 historia de Iker 15/09 ("Volvi al coche / Volvi a la lista / Volvi a mirarla")',
        'el': '2026-09-23 historia de Iker 23/09 ("El otro no lo leyo / El otro entro / El otro comio")',
        'gente': '2026-10-02 historia de Mario 02/10 ("Gente que condujo / Gente de traje / Gente que vino")',
        'tenia': '2026-10-14 historia de Unai 14/10 ("Tenia 43 empresas / Tenia al lado")',
        'miro': '2026-10-14 historia de Unai 14/10 ("Miro sus webs / Miro que piezas / Miro en cada feria")',
        'queria': '2026-10-15 historia-video de Unai 15/10 ("No queria mas filtros / Queria descartar")',
    },
    'mapa': {
        'ese': '2026-10-29 mapa de Navarra, Asier ("Ese corral no vive del chupinazo / de la cuajada")',
        'ni': '2026-09-22 mapa de Álava, Iker ("Ni la llena Celedón / Ni la llenan los blusas")',
        'aqui': '2026-09-22 mapa de Álava, Iker ("Aquí la sal / Aquí se discute / Aquí se sube")',
        'por': '2026-09-22 mapa de Álava, Iker ("Por fuera / Por dentro")',
        'no': '2026-10-22 mapa de Bizkaia, Iker ("No lo paga el Guggenheim / el poteo del viernes"); antes C. Valenciana, Unai 16/10 y Extremadura, Asier 29/09',
        'se': '2026-09-29 mapa de Extremadura, Asier ("Se almuerzan migas / Se va andando a Guadalupe")',
        # Leidos del texto publicado (22/10): Canarias de Iker 08/10, C. Valenciana de Unai 16/10 y Bizkaia de Iker 22/10.
        'de': '2026-10-22 mapa de Bizkaia, Iker ("De Derio sale la báscula / De Leioa / De Zamudio"); antes C. Valenciana, Unai 16/10',
        'donde': '2026-10-22 mapa de Bizkaia, Iker ("Donde San Mamés / Donde el Euskadi Eguna / Donde un pedido"); antes C. Valenciana, Unai 16/10',
        'desde': '2026-10-08 mapa de Canarias, Iker',
        'alli': '2026-10-08 mapa de Canarias, Iker',
    },
    # Estos dos salen de nuestro propio runbook (post-workflow 4.3), no de haber
    # releido el post: si algun dia se comprueban, se anota aqui.
    'los10': {
        'no': '2026-06-25 "Los 10" del Pais Vasco, Iker ("No publica. No da charlas.")',
        'con': '2026-09-15 Gipuzkoa, Unai 15/09 ("Con el va un taller / alguien / la nomina")',
        'aqui': '2026-09-15 Gipuzkoa, Unai 15/09 ("Aqui la sidra / Aqui el queso")',
        'en': '2026-09-15 Gipuzkoa, Unai 15/09 ("En Mendaro / En Ordizia / En Beasain")',
        'se': '2026-07-16 "Los 10" de Asturias, Iker ("Se sabe... / Se sabe... / Se hace...")',
    },
    # El pilar meme no tenia lista y es el que mas publica. Leidos los dos
    # publicados de la semana pasada (§0f: al PUBLICAR, no al entregar).
    'meme': {
        'la': '2026-08-20 meme de Asier 20/08 ("La lista no se pule / no se hereda / se elige antes")',
        'no': '2026-09-22 meme de Unai 22/09 ("No sabe mi nombre / que vendemos / quien firma aqui"); antes Unai 25/08 ("No buscan quien...")',
        'me': '2026-09-22 meme de Unai 22/09 ("Me jura que confia / Me mete prisa")',
        'se': '2026-08-27 meme de Iker 27/08 ("Se lo que hablamos / Se en que bar desayuna")',
        # Publicados 01-11/09, anotados el 2026-09-15.
        'arriba': '2026-09-01 meme de Iker 01/09 ("Arriba llegan con agenda / Arriba nadie parte de cero / Arriba llegan con el nombre")',
        '12': '2026-09-03 meme de Asier 03/09 ("12 meses pagados / 12 meses de pantalla / 12 meses sin una cara")',
        'filtran': '2026-09-16 meme de Iker 16/09 ("Filtran por quien pregunto / Filtran antes de oirme")',
        'sin': '2026-09-16 meme de Iker 16/09 ("Sin nombre no paso / no hay cita / no hay pedido")',
        'con': '2026-09-18 meme de Asier 18/09 ("Con 3 clientes a punto / Con 15 / Con 35")',
        'otro': '2026-10-07 meme de Iker 07/10 ("Uno, que no le interesa / Otro, que le mande un correo / Otro, que le llame la semana que viene")',
    },
    # El pilar lead magnet tampoco tenia lista. Anotado al PUBLICAR (§0f).
    # El pilar DESPIECE tampoco tenia lista. Leidos los dos publicados.
    'objeto': {
        'lo': '2026-07-30 despiece de Euskadi, Iker ("Lo asocias al monte / a la sidreria / a que llueve")',
        'es': '2026-08-07 despiece de Navarra, Asier ("Es el pacharan... / Es el Camino...")',
        'las': '2026-09-16 despiece de Bizkaia, Asier ("Las piezas salen de Zamudio / de Berriz / de Gernika")',
        'eso': '2026-09-16 despiece de Bizkaia, Asier ("Eso no lo paga el txakoli / Eso lo paga un turno")',
    },
    'las10': {
        'no': '2026-10-07 La Rioja, "Las 10" de Asier ("No pagan las nominas las rondas de la calle Laurel / No las paga el Camino"); antes Castilla-La Mancha, Iker 01/10',
        'desde': '2026-10-01 Castilla-La Mancha, Iker ("Desde la autovia / Desde dentro")',
        'aqui': '2026-10-01 Castilla-La Mancha, Iker ("Aqui se mojan gachas / Aqui se sube")',
    },
    'leadmagnet': {
        'ninguno': '2026-08-26 lead magnet de Iker 26/08 ("Ninguno es de redaccion / de personalizacion / se arregla escribiendo mejor")',
    },
}

CONCEPTO_QUEMADO = {
    'corral de la': '2026-10-29 Navarra, mapa de Asier (de adición)',
    'lavadero del fin': '2026-10-27 Galicia, "Las 10" de Iker',
    'desván del cant': '2026-10-22 Bizkaia, mapa de Iker (de adición)',
    'desvan del cant': '2026-10-22 Bizkaia, mapa de Iker, sin tilde',
    'porche del medit': '2026-10-16 Comunidad Valenciana, mapa de Unai',
    'sala de calderas': '2026-10-16 Aragón, "Las 10" de Iker',
    'terraza del atl': '2026-10-08 Canarias, mapa de Iker',
    'cuarto peque': '2026-10-07 La Rioja, "Las 10" de Asier',
    'descansillo': '2026-10-01 Castilla-La Mancha, "Las 10" de Iker',
    'despensa del oeste': '2026-09-29 Extremadura, mapa de Asier',
    'nevera del norte': '2026-09-22 Álava, mapa de Iker',
    'sitio de comer': '2026-07-30 Euskadi (Iker)',
    'desierto': '2026-07-23 Murcia (Iker)',
    'patio trasero': '2026-06-30 Navarra (Iker)',
    'esquina del atl': '2026-06-16 Galicia (Iker)',
    'museo minero': '2026-07-31 Asturias (Unai)',
    'ltima parada': '2026-07-17 Cataluña (Unai)',
    'trastienda del norte': '2026-07-07 Álava (Unai)',
    'secarral': '2026-07-14 Aragón (Asier)',
    # SIN fecha a proposito: no es un concepto gastado, es un VETO (critica a
    # España). Una entrada sin fecha no caduca nunca.
    'pasillo de espa': 'descartado por Iker: critica a España',
    'tejado de la pen': '2026-08-04 Castilla y León (Iker)',
    'felpudo del pir': '2026-08-07 Navarra, despiece de Asier',
    'tendedero del cant': '2026-09-01 Cantabria, mapa de Asier',
    'garaje del norte': '2026-09-16 Bizkaia, despiece de Asier',
}

# §4.2 Paso 1 — FRASES-RABIA YA USADAS. Misma historia: la receta pedia no
# repetirla y no habia con que comprobarlo.
FRASE_RABIA_USADA = {
    'y a correr': '2026-10-29 Navarra, mapa de Asier (de adición)',
    'y a secarse': '2026-10-27 Galicia, "Las 10" de Iker',
    'y se acab': '2026-10-22 Bizkaia, mapa de Iker (de adición)',
    'y a la siesta': '2026-10-16 Comunidad Valenciana, mapa de Unai',
    'y puerta': '2026-10-16 Aragón, "Las 10" de Iker',
    'y a la tumbona': '2026-10-08 Canarias, mapa de Iker',
    'y a repostar': '2026-10-01 Castilla-La Mancha, "Las 10" de Iker',
    'y a portugal': '2026-09-29 Extremadura, mapa de Asier',
    'y hasta ah': '2026-09-22 Álava, mapa de Iker',
    'de vuelta al aeropuerto': '2026-07-30 Euskadi (Iker)',
    'y para de contar': '2026-07-23 Murcia (Iker)',
    'y poco m': '2026-06-30 Navarra (Iker)',
    'poco que rascar': '2026-07-31 Asturias (Unai)',
    'y a seguir': '2026-07-17 Cataluña (Unai)',
    'para irse': '2026-07-07 Álava (Unai)',
    'antes de seguir carretera': '2026-07-14 Aragón (Asier)',
    'y a otra cosa': '2026-10-07 La Rioja, "Las 10" de Asier; antes Castilla y León (Iker 04/08)',
    'nada m': '2026-08-07 Navarra, despiece de Asier',
    'a la autov': '2026-09-01 Cantabria, mapa de Asier',
    'y a casa': '2026-09-16 Bizkaia, despiece de Asier',
}

# ⛔⛔ REPETIR REGION NO ES REPETIR GANCHO (Iker, 2026-10-15). Para "Las 10" de Aragon
# de Iker volvi a poner "el Pilar, el cierzo" y Uruguay: el gancho de Asier de Aragon
# (14/07) ya llevaba "jota, Pilar" con el cierzo en el concepto, y Uruguay lo habia usado
# Iker en Murcia. La regla vieja decia "los cliches de la region no se queman nunca" y por
# ese hueco el mismo lector veia el mismo gancho con otra ropa. Iker: "no me importa
# repetir la region, hacer double down es otra estrategia muy inteligente... pero que tenga
# cabeza". Ahora: al REPETIR region, el GANCHO no puede llevar ningun cliche que ya saliera
# en el gancho de un peloteo anterior de esa region (cualquier cuenta), y el PAIS no se
# repite nunca en la misma cuenta. Las dos ceden con --double-down (decision DECLARADA en
# la entrega, nunca por defecto). El CUERPO si puede repetir cliches (son de la region).
# Al publicar un peloteo, se anaden aqui los cliches de su gancho (y el del concepto).
CLICHE_GANCHO_REGION = {
    'aragon': {'pilar': '2026-07-14 Asier', 'cierzo': '2026-07-14 Asier', 'jota': '2026-07-14 Asier',
               'ternasco': '2026-07-14 Asier', 'secarral': '2026-07-14 Asier',
               'cachirulo': '2026-10-16 Iker', 'esqui': '2026-10-16 Iker'},
    'navarra': {'toro': '2026-06-30 Iker', 'txistorra': '2026-06-30 Iker', 'esparrago': '2026-08-07 Asier',
                'san fermin': '2026-10-29 Asier', 'pacharan': '2026-10-29 Asier'},
    'galicia': {'pulpo': '2026-06-16 Iker', 'camino': '2026-06-16 Iker',
                'marisco': '2026-10-27 Iker', 'gaita': '2026-10-27 Iker'},
    'valencia': {'playa': '2026-06-02 Iker', 'paella': '2026-06-02 Iker',
                 'naranja': '2026-10-16 Unai', 'horchata': '2026-10-16 Unai'},
    'murcia': {'sol': '2026-07-23 Iker', 'tomate': '2026-07-23 Iker', 'desierto': '2026-07-23 Iker'},
    'castilla y leon': {'trigo': '2026-08-04 Iker', 'castillo': '2026-08-04 Iker'},
    'asturias': {'sidra': '2026-07-31 Unai', 'fabada': '2026-07-31 Unai'},
    'cataluna': {'pan con tomate': '2026-07-17 Unai', 'playa': '2026-07-17 Unai'},
    'alava': {'pintxo': '2026-07-07 Unai', 'vino': '2026-09-22 Iker', 'baloncesto': '2026-09-22 Iker'},
    'bizkaia': {'bacalao': '2026-09-16 Asier', 'paraguas': '2026-09-16 Asier',
                'guggenheim': '2026-07-30 Iker', 'chuleton': '2026-07-30 Iker',
                'lluvia': '2026-06-09 Unai', 'pintxo': '2026-06-09 Unai',
                'boina': '2026-10-22 Iker', 'chacoli': '2026-10-22 Iker'},
    'cantabria': {'sobao': '2026-09-01 Asier', 'anchoa': '2026-09-01 Asier'},
    'extremadura': {'jamon': '2026-09-29 Asier', 'ciguena': '2026-09-29 Asier'},
    'castilla-la mancha': {'queso': '2026-10-01 Iker', 'molino': '2026-10-01 Iker'},
    'la rioja': {'vino': '2026-10-07 Asier', 'pimiento': '2026-10-07 Asier'},
    'canarias': {'playa': '2026-10-08 Iker', 'platano': '2026-10-08 Iker'},
}
# Como se reconoce la region en el CUERPO (el gancho la calla a proposito).
REGION_EN_TEXTO = {
    'aragon': r'arag[oó]n', 'navarra': r'navarra', 'galicia': r'galicia',
    'valencia': r'comunidad valenciana|valencia', 'murcia': r'murcia',
    'castilla y leon': r'castilla y le[oó]n', 'asturias': r'asturias', 'cataluna': r'catalu[nñ]a',
    'alava': r'[aá]lava', 'bizkaia': r'bizkaia|vizcaya', 'cantabria': r'cantabria',
    'extremadura': r'extremadura', 'castilla-la mancha': r'castilla-la mancha',
    'la rioja': r'la rioja', 'canarias': r'canarias',
}
# ⛔⛔ EL GANCHO NO NOMBRA NINGUN SITIO NI GENTILICIO DE LA REGION (Iker, 2026-10-16). Al
# cambiar los cliches de Aragon meti "jamon de Teruel": Teruel es una provincia y destapa
# la region antes del reveal, que es todo el bucle abierto del peloteo. El check de
# "Los 10" solo miraba el nombre de la region, no sus provincias, ciudades ni el gentilicio
# coloquial (maño, baturro). Los cliches INSINUAN (el Pilar, la txistorra); un topónimo NOMBRA.
# Raices sin tilde; se comparan como inicio de palabra.
REGION_TOPONIMOS = {
    'aragon': ['arag', 'zaragoz', 'huesca', 'oscense', 'teruel', 'turolense', 'jaca', 'calatayud',
               'monzon', 'barbastro', 'alcaniz', 'mano', 'manos', 'mana', 'manas', 'baturr'],
    'navarra': ['navarr', 'pamplon', 'iruna', 'tudela', 'estella'],
    'galicia': ['galic', 'galleg', 'coruna', 'vigo', 'lugo', 'ourense', 'pontevedr', 'compostela'],
    'valencia': ['valenci', 'alicant', 'castellon', 'elche'],
    'murcia': ['murcia', 'cartagen', 'lorca'],
    'castilla y leon': ['leon', 'leones', 'burgos', 'valladolid', 'salamanc', 'segovi', 'avila',
                        'soria', 'palencia', 'zamora'],
    'asturias': ['asturi', 'astur', 'oviedo', 'gijon', 'aviles'],
    'cataluna': ['catalu', 'catalan', 'barcelon', 'girona', 'lleida', 'tarragon'],
    'alava': ['alava', 'alaves', 'araba', 'vitoria', 'gasteiz'],
    'bizkaia': ['bizkai', 'vizcai', 'bilbao', 'bilbain', 'getxo', 'barakaldo'],
    'cantabria': ['cantabr', 'santander', 'torrelavega'],
    'extremadura': ['extremen', 'badajoz', 'caceres', 'merida'],
    'castilla-la mancha': ['mancheg', 'la mancha', 'toledo', 'cuenca', 'albacete', 'ciudad real',
                           'guadalajara'],
    'la rioja': ['rioja', 'logrono', 'haro'],
    'canarias': ['canari', 'tenerife', 'lanzarote', 'fuerteventura'],
}
DOUBLE_DOWN = False
# EXCEPCION DECLARADA (Mario, 2026-10-22, San Francisco de Unai): en la cuenta de UNAI el
# gancho puede anclar a su SEGUNDO carril (direccion: inversion, validar un mercado,
# fundadores, startups; aboutme 2-CARRIL) en vez de a ventas. Solo con --ancla-direccion,
# solo en Unai, y ventas baja al CUERPO, como en Mario y Helena. No es el default: §2.3
# sigue mandando, y cada uso se declara en la entrega y se mide en el historial.
ANCLA_DIRECCION = False
# EVENTO AJENO (Mario, 2026-10-22, San Francisco de Unai): anuncio de un programa o evento
# que NO es nuestro y no tiene inscripcion (Desafia San Francisco). No lleva Luma ni ninja de
# agendar; si hay puerta, va sin enlace (el cafe). Solo con --pilar evento --evento-ajeno.
EVENTO_AJENO = False
# GANCHO GENERICO (2026-10-30, lanzamiento del 03/11): A/B declarado en la cuenta de Unai,
# historia/evento o evento. El gancho va sin ancla de ventas ni de ecosistema ("Hoy es el gran
# dia…") para medir si el bucle maximo alcanza mas, y el cuerpo ata con ventas en lo explicito.
# El ancla del gancho pasa a aviso; que el cuerpo nombre la venta es fallo duro.
GANCHO_GENERICO = False
DIRECCION_ANCLA = (r'\b(inversi[oó]n\w*|invers\w+|inversor\w*|validar|valid\w+|mercados?'
                   r'|startups?|fundador\w*|capital|rondas?|emprend\w+|fondos?|venture|ecosistema'
                   r'|instituci\w+|empresari\w+|directiv\w+|CEOs?|aceleradoras?|cohorte)\b')

# §4.5.0a — MOLDE B del lead magnet: Claude (o yo) + VERBO PUNCHY + resultado.
# Sacado de los cinco lead magnets NUESTROS con mas comentarios, no de memoria.
# Lo habia escrito tres veces a ojo y las tres se me quedo corto, la ultima
# rechazando "Claude acaba de destapar" cuando "Claude ACABA DE MATAR el cold
# outbound" es literalmente nuestro numero 1 (632 comentarios). Metodo nuevo:
# el regex sale de la lista de ganadores, y si se anade un ganador se reabre.
#   632c "Claude ACABA DE matar…"   285c "LE PASE las llaves…"
#   232c "LE TIRE las llaves…"      183c "CLAUDE ME HA AYUDADO a cazar…"
#   167c "Claude HA REDUCIDO toda mi prospeccion…"
MOLDE_EXPERIMENTO = (
    r'\b('
    r'claude (?:acaba de|ahora|ya|me|nunca|ha|se)\s*\w*'   # Claude acaba de matar / Claude ahora destapa
    r'|le (?:di|pas[eé]|tir[eé]|dej[eé])'                  # Le tiré / Le pasé las llaves
    r'|hoy (?:desmonto|comparto|regalo|te doy|le)'
    r'|llevo (?:\w+ )?(?:meses|semanas|d[ií]as|a[ñn]os)'
    r'|nunca hab[ií]a|me ha ayudado|acaba de \w+'
    r'|me (?:destapa|caza|saca|desentierra|pone|encuentra|dice)'
    r'|cada semana (?:publico|hago|le)|(?:le )?paso a claude'
    r')\b')

def normalizar_kw(k):
    """La palabra del CTA, en minusculas y sin tildes, para compararla."""
    import unicodedata
    k = unicodedata.normalize('NFD', k.strip().lower())
    return ''.join(c for c in k if unicodedata.category(c) != 'Mn')


# §2.3 — el hook debe leerse inequívocamente sobre VENDER
# §2.3 — El ancla. OJO: la lista es un PROXY, no el test. El test de verdad es
# "¿esto solo puede publicarlo una cuenta de VENTAS?" y eso es criterio (§8).
# Por eso el ancla va partida en dos: hay palabras del oficio que NO son solo
# nuestras.
#
# FUERTE = inequívocamente ventas. Nadie más las dice así.
# OJO con la conjugación: la primera versión listaba formas sueltas (vender|vendes|
# vende|vendo|vendiendo|vendid\w+) y NO tenía ni un pretérito. "Las empresas que más
# VENDIERON este año…" — el hook del 4.82x del País Vasco — fallaba el check del ancla.
# Nuestro mejor "Los 10" no anclaba a ventas según su propio validador (2026-07-17).
# `vend[eio]\w*` coge la conjugación entera (vende, vendió, vendieron, vendemos,
# vendedor…) y deja fuera lo que solo se le parece: venda y vendaje (vend+a) y vendrá,
# que es de venir (vend+r).
# `prospect\w*` y no `prospectar` a secas (2026-08-12): el gancho del 167c
# ("Claude ha reducido toda mi prospección a una sola frase") fallaba el ancla
# porque la regex solo aceptaba el infinitivo. Prospección, prospecta y
# prospectando son ancla de ventas igual de fuertes.
ANCLA_FUERTE = (r'\b(vend[eioí]\w*|vendi|venta|ventas'
                r'|comercial|comerciales|cuota|comisi[oó]n|prospec\w+|deal|deals|propuesta comercial)\b')
# AMBIGUA = las comparte media empresa. "pedido" lo dicen logística, compras,
# almacén y producción; "cartera" la dice finanzas; "cliente" y "precio" los dice
# cualquiera. Un hook anclado SOLO en estas es candidato a post huérfano.
# Caso real (2026-07-16): "El pedido encoge cada vez que sube un piso" pasó el
# check con ancla="pedido" y el usuario preguntó, con razón, si eso se sabe que
# es de ventas. No se sabe: lo puede publicar un jefe de logística tal cual.
ANCLA_AMBIGUA = (r'\b(cliente|clientes|cerrar|cierras|cierra|cierro|cerrand\w+|comprar|compra|compras'
                 r'|comprando|precio|precios|facturar|factura|facturas|facturaci[oó]n|exportar|exporta'
                 r'|exportas|exportaci[oó]n|cartera|pedido|pedidos)\b')
ANCLA_VENTAS = f'({ANCLA_FUERTE}|{ANCLA_AMBIGUA})'
# La cuenta de Mario NO es de ventas: es la de MARKETING/growth (aboutme §2). Su
# hook ancla en marketing, no en "vender". Sin esto, todo post suyo falla el ancla.
MARKETING_ANCLA = (r'\b(marketing|contenido|redes|crecer|crecimiento|alcance|impresiones'
                   # 2026-09-29: `linkedin` FUERA de la lista. Escrito en el post capa la
                   # publicacion (global §9.3b), asi que no puede ser un ancla valida.
                   r'|audiencia|viral|engagement|seguidores|marca personal|perfil|feed'
                   # 2026-09-29 — `algoritmo` DENTRO (meme de Mario, gancho elegido por
                   # el: "Seguro que el algoritmo me ama..."). Es la misma familia que
                   # `feed` y `alcance`: el reparto del contenido. Que sea ancla NO la
                   # saca de observacion por capado (§9.3b): ese aviso sigue corriendo.
                   r'|algoritmo'
                   # 2026-08-21 — el post de la caida de los influencers de Mario. Un gancho
                   # con "influencer" dentro fallaba el ancla, y es la palabra mas de
                   # marketing que existe: esta en la misma familia que "viral" y
                   # "audiencia", que ya estaban. Mismo caso para los oficios del mundo
                   # del contenido, que es el carril de esa cuenta (aboutme §2-CARRIL).
                   r'|influencers?|creador(?:es)? de contenido|youtubers?|streamers?'
                   # 2026-08-26 — el meme del de marketing esperando (Mario). Un gancho
                   # con "campañas" dentro fallaba el ancla, y campaña es la palabra que
                   # la propia referencia lleva DENTRO de la imagen (MARKETER WITH A
                   # CAMPAIGN IDEA). Misma familia que "contenido" y "alcance", que ya
                   # estaban: es el ENTREGABLE del oficio, no una deduccion mia.
                   r'|campa[ñn]as?|anuncios?|newsletter)\b')
# La cuenta de HELENA tampoco es de ventas: es ATENCION AL CLIENTE y partnerships
# (aboutme 2-CARRIL-GANCHO, Iker 2026-08-26: en Mario y Helena el gancho ancla en
# SU oficio y la vinculacion con ventas se tiene luego en el cuerpo). La excepcion
# estaba escrita para Mario y mecanizada solo para Mario, asi que un gancho suyo de
# soporte puro (tickets, incidencias, seguimiento) fallaba el ancla aunque la receta
# lo mande. `cliente` ya colaba por ANCLA_AMBIGUA y por eso no habia saltado nunca:
# el hueco estaba en todo lo demas de su oficio.
CS_ANCLA = (r'\b(cliente|clientes|soporte|atenci[oó]n al cliente|ticket|tickets'
            r'|incidencia|incidencias|queja|quejas|reclamaci[oó]n|posventa|postventa'
            r'|seguimiento|renovaci[oó]n|renovaciones|cuenta|cuentas|partner|partners'
            r'|fidelizar|acompa[ñn]ar|alta|altas|baja|bajas)\b')
# La cuenta de ANGELA (6a cuenta, Iker 2026-10-01) es la de DISENO DE PRODUCTO:
# disena las pantallas de Neety. Se le aplica la misma regla que a Mario y Helena
# (aboutme 2-CARRIL-GANCHO: el gancho ancla en SU oficio y ventas baja al cuerpo).
# ⚠️ Es una extension por analogia, no una orden de Iker: si la tumba, se borra y
# su gancho vuelve a exigir ancla de ventas como el de los jefes.
DISENO_ANCLA = (r'\b(dise[ñn]\w*|pantallas?|bot[oó]n|botones|interfaz|interfaces'
                r'|producto|usuari[oa]s?|experiencia|bocetos?|prototipos?|flujos?'
                r'|pulsar|pulsa|clics?|dibuj\w+)\b')
# §2.3 — estrechan el alcance, FUERA del hook. Lista canónica: gana a la de
# "términos naturalizados" de brand-voice §2, que decía lo contrario. El ICP de
# aboutme desempata: lleva vendiendo desde antes de que existiera Salesforce.
# CRM y forecast añadidos el 2026-07-14 (se coló "Tu CRM…" en un hook de meme).
# ⭐ `post` entra aqui y NO en ANGLICISMOS (Iker, 2026-08-27), y la distincion
# es la que yo habia mezclado. Son DOS listas con dos criterios distintos:
#   ANGLICISMOS (brand-voice 2b) = el lector NO lo entiende -> fuera de TODO
#     el texto (pipeline, funnel, forecast...).
#   DEMASIADO_NICHO (2.3)        = el lector SI lo entiende pero ESTRECHA ->
#     fuera del GANCHO, y en el cuerpo vale.
# Iker: "esto es para el gancho, que ahi es donde hay que maximizar el alcance
# y reducir al maximo la barrera de entrada; en el spam ninja puedes dejar post
# tranquilamente porque eso ya forma parte del cuerpo".
# ⭐ Y LA SALIDA EN EL GANCHO ES EL VERBO, NO EL SUSTANTIVO, esto esta MEDIDO:
# `una publicacion` deja la linea 1 del ninja en 60 car y revienta el tope de
# 55; `publicar` la deja en 53 y en el gancho cuesta UN solo caracter mas que
# `post`. Ademas el verbo es mas punchy (2.9).
DEMASIADO_NICHO = r'\b(b2b|outbound|inbound|pipeline|cadencia|reply rate|touchpoints?|sdr|aes?|cold email|discovery|gtm|icp|crm|forecast|saas|leads?|follow-?up|posts?|postear)\b'
# §2.9 — delatores de verbo flojo: describen en vez de frenar el scroll
# Ojo con "pasa": "pasa factura" es un MODISMO punchy, no un verbo flojo, y es el
# gancho de "Subir en ventas siempre pasa factura" (13.61x). El check lo tumbaba.
VERBO_FLOJO = (r'(\bse cae\b|\bse caen\b|\bse pierde\b|\bse pierden\b|\bocurre\b|\bocurren\b'
               r'|\bpasa\b(?! factura)|\bpasan\b(?! factura)'
               r'|\bno funciona\b|\bexiste\b|\bexisten\b|\bhay que\b|\btiene que\b|\bes importante\b|\bes clave\b'
               # gerundios que DESCRIBEN en vez de frenar el scroll (§2.9). Solo se miden en el HOOK.
               r'|\bcolgando\b|\bvolviendo a\b|\bintentando\b|\btrabajando\b|\bdando vueltas\b|\bhaciendo\b)')
# §2.8 — openers quemados
OPENERS_QUEMADOS = r'(nadie te dice esto|lo que nadie te cuenta|me ha costado \w+ a[nñ]os|este es el error m[aá]s grande|el problema eres t[uú]|spoiler:|plot twist:)'

# §3.6 — cifras SIEMPRE en dígito, nunca en letra (universal). "un/una" son artículos y no cuentan.
NUMERO_EN_LETRA = (r'\b(dos|tres|cuatro|cinco|seis|siete|ocho|nueve|diez|once|doce|trece|catorce|quince'
                   r'|diecis[eé]is|diecisiete|dieciocho|diecinueve|veinte|treinta|cuarenta|cincuenta'
                   r'|sesenta|setenta|ochenta|noventa|cien|ciento|doscientos|trescientos|cuatrocientos'
                   r'|quinientos|seiscientos|setecientos|ochocientos|novecientos)\b')

# §2.3 — "En ventas," de PREFIJO se convirtió en muletilla: 3 hooks seguidos
# empezando igual. Es ancla legítima (el 16.55x lo usa) pero NO puede ser el
# reflejo: solo 1 de nuestros 11 ganadores empieza así. El resto ancla por el rol,
# el oficio, el verbo o la acción. Y ojo: esta muletilla la creó ESTE script — la
# forma más barata de aprobar el check del ancla es pegar "En ventas," delante.
MULETILLA_ANCLA = r'^\s*En ventas[,:]'

# §4.1 — comodines de peloteo gastados: 4/4 posts reales los usan LITERAL (working-preferences §4)
REVEAL_QUEMADO = r'\bs[ií],?\s+hablo\s+d'
COMODIN_LISTA = r'la gente y las empresas que mueven todo esto'
# post-workflow §4.2 Paso 3 — el eje "callado" está PROHIBIDO en mapas
EJE_CALLADO = r'(se vende callad|venden callad|en silencio|no lo cuentan|no lo cuenta|sin hacer ruido|nadie los conoce|no salen en la foto|trabajan callad)'

# post-workflow §4.3 Paso 3d — "Los 10": la EMPRESA no puede ser el sujeto que le
# quita el sitio a la persona. Es la única diferencia de texto entre el 4.82x del
# País Vasco (cero quejas) y el 0.66x de Cataluña (un trabajador pidió por privado
# que le quitáramos la mención):
#   País Vasco: "le HACEMOS fotos por fuera" (nosotros) · "no sale en la NOTA DE
#               PRENSA" (la prensa) · "nunca le PONEN el nombre delante" (impersonal)
#   Asturias:   "el número sale en la PRENSA" · "las cifras ya salieron en la
#               prensa, los nombres los pongo yo"
#   Cataluña:   "el nombre que se dice siempre es EL DE LA EMPRESA. Hoy le doy la
#               vuelta" → ahí hay un despojo con culpable, y el culpable está
#               etiquetado en el post.
# La persona invisible SIGUE siendo el eje del pilar (§4.3). Lo que se prohíbe no
# es la invisibilidad: es que la empresa sea quien la causa. El antagonista tiene
# que ser la prensa, el titular, la cifra, el foco o nosotros — algo que no tenga
# ego ni pueda mandarte un DM.
# Ojo: "ninguna empresa vende sola" NO es el beat de equipo, es su reverso. Dice
# que la empresa le debe a la persona. El beat de equipo dice que la persona le
# debe al equipo, que es lo que la audiencia pide en comentarios.
EMPRESA_LADRONA = (r'((la|las)\s+empresas?[^.\n]{0,40}(se\s+llevan?|acaparan?|roban?|tapan?|esconden?|eclipsan?|oculta)'
                   r'|el\s+nombre\s+que\s+se\s+dice\s+siempre\s+es\s+el\s+de\s+la\s+empresa'
                   r'|ninguna\s+empresa\s+vende\s+sola'
                   r'|el\s+m[eé]rito\s+se\s+lo\s+llevan?\s+(la|las|el|los)'
                   r'|le\s+doy\s+la\s+vuelta'
                   r'|detr[aá]s\s+del\s+logo)')
# post-workflow §4.3 Paso 3e — "Los 10" DEBE conceder que es trabajo en equipo.
# Decisión del usuario (2026-07-17), que corrige la lectura de este script: yo conté
# el "gracias por dar visibilidad, PERO esto es trabajo en equipo" como alcance,
# porque llega en comentarios. Es alcance Y es una crítica: el apoyo la envuelve, y
# lo que se queda es la crítica. Si no lo decimos nosotros, "se nos van a echar
# encima". Quien lee los DMs es el usuario.
#
# ⚠️ EL SUJETO ES LA PERSONA, NUNCA LA EMPRESA. Aquí está el filo:
#   ⛔ "una fábrica no factura sola" (1º) · "ninguna empresa vende sola" (2º)
#      → suenan al matiz, pero dicen que la EMPRESA depende de la persona: es el
#        marco de despojo de EMPRESA_LADRONA, no la concesión. Apuntan al revés.
#   ✅ "Ninguno de estos 10 vendió solo" · "Detrás de cada nombre hay una fábrica
#      entera" · "No lo firmó solo" · "con un taller entero detrás"
# Por eso el regex exige a la PERSONA de sujeto y no se conforma con "solo" suelto.
#
# ⚠️ RIESGO DE MULETILLA, asumido a sabiendas: la forma más barata de aprobar este
# check es pegar siempre la misma frase, que es exactamente como este script creó el
# tic de "En ventas," (ver MULETILLA_ANCLA). Mitigación: la lista de abajo tiene 4
# familias distintas, y `working-preferences §4` obliga a no repetir la formulación
# del "Los 10" anterior. Si en 3 posts sale la misma frase, el tic ya está aquí.
BEAT_EQUIPO = (r'((ningun[oa]|nadie|ni\s+uno)\s+de\s+(est[oa]s|ell[oa]s|la\s+lista|los\s+10)[^.\n]{0,40}\bsol[oa]\b'
               r'|no\s+(l[oa]\s+)?(hizo|hicieron|vendi[oó]|vendieron|firm[oó]|firmaron|cerr[oó]|cerraron|levant[oó]|levantaron)\s+sol[oa]s?\b'
               r'|detr[aá]s\s+de\s+cada\s+\w+\s+(hay|est[aá])'
               r'|(equipo|f[aá]brica|plantilla|nave|taller|oficina)\s+(enter[oa]\s+)?detr[aá]s)')

# NO existe un check de "atribución única", y no es un olvido: los datos lo tumban.
# El post que MÁS fuerte atribuye a una sola persona ("las 10 personas que más han
# hecho vender", "esa persona es la razón por la que la empresa factura lo que
# factura") es el País Vasco 4.82x, el ÚNICO de los tres sin una sola queja. El que
# más suave atribuye ("los 10 nombres que hay detrás de las cifras") es Asturias, y
# es el que se comió el DM del CEO. La atribución única ANTI-correlaciona con las
# quejas. Prohibirla habría sido prohibir las frases de nuestro mejor post de este
# pilar por una regla que suena sensata y que la evidencia contradice.
# Y el "gracias, pero esto es trabajo en equipo" que llega en comentarios NO es una
# queja: es un COMENTARIO, o sea alcance, y sale sobre todo en la 1ª y la 3ª, las dos
# que funcionan. Meter el matiz del equipo DENTRO del post le quita a la audiencia lo
# que iba a escribir. Sería cambiar DMs por comentarios. No se hace.

def norm(s):
    return s.replace('\r\n', '\n').replace('\r', '\n').strip('\n')

def bloques(texto):
    """Parte el post en bloques separados por línea en blanco."""
    return [b.split('\n') for b in re.split(r'\n\s*\n', texto) if b.strip()]

def es_lista(bloque):
    """¿Es una enumeración y no un bloque de prosa? Las enumeraciones están
    exentas de las reglas de tamaño de §3.2: van pegadas a propósito.

    Tres formas de serlo:
    1. Marcadores clásicos (→, ✅, 1., -).
    2. Patrón de ETIQUETA al final: 2+ líneas que acaban en ":" (Realidad: /
       CRM: / Traducción:). Es la unidad (c) de §3.3, "enumeración vertical
       paralela con sintaxis repetida, sin blanco entre líneas".
    3. Patrón de ETIQUETA en medio: 2+ líneas tipo "Comercial: cerrado." Es la
       MISMA unidad (c), pero con los dos puntos en medio en vez de al final.
       Faltaba, y por eso este script tumbaba por "bloque de 4+ líneas" la
       estructura del 13.61x ("SDR: ilusión y pelo intactos. / AE: primeras
       cuotas…"), que es el 3er mejor post del histórico. Lo destapó correr el
       validador contra nuestros propios ganadores, que es el test que nunca se
       había hecho.
    4. Item NUMERADO DESARROLLADO: la primera linea abre con "1." y debajo van
       2-4 lineas de desarrollo. Faltaba, y por eso este script tumbaba NUESTRO
       MEJOR LEAD MAGNET, el de 632 comentarios, cuyos 5 puntos son justo eso
       ("1. Lenguaje natural > filtros rigidos" + tres lineas explicandolo).
       Un item de lista es una unidad estructural aunque su desarrollo sea
       prosa: lo que lo hace lista es el numero de delante, no que todas las
       lineas lleven marcador. Mismo hallazgo y mismo metodo que el caso 3:
       correr el validador contra nuestros propios ganadores.
    """
    lineas = [l for l in bloque if l.strip()]
    if not lineas:
        return True
    if re.match(r'\s*(?:[0-9]+[\.\)]|1️⃣|[2-9]️⃣)\s', lineas[0]) and len(lineas) <= 5:
        return True
    if all(re.match(r'\s*(→|✅|[0-9]+[\.\)]|-|•|1️⃣|[2-9]️⃣)', l) for l in lineas):
        return True
    if sum(1 for l in lineas if l.rstrip().endswith(':')) >= 2:
        return True
    return sum(1 for l in lineas if re.match(r'\s*[^:\n]{2,28}:\s+\S', l)) >= 2


def leer_menciones_usadas():
    """Entidades ya mencionadas en posts de peloteo, de las TRES cuentas.
    Se regenera con `node scripts/extraer-menciones.mjs`. Si no existe, el
    check se salta en vez de fallar: no tener el fichero no es un error del post.
    """
    import json
    f = os.path.join(RAIZ, 'docs', 'skills', 'menciones-usadas.json')
    if not os.path.exists(f):
        return None
    try:
        return json.load(io.open(f, encoding='utf-8'))
    except Exception:
        return None


def normalizar_entidad(x):
    """Misma normalizacion que extraer-menciones.mjs. Sin ella se cuela
    'Bioiberica' contra 'Bioiberica' y 'Prefabricados Pujol' contra
    'Prefabricats Pujol', que es el fallo real documentado en §4.0c."""
    import unicodedata
    x = unicodedata.normalize('NFD', x or '')
    x = ''.join(c for c in x if unicodedata.category(c) != 'Mn').lower()
    x = re.sub(r'\b(s\.?a\.?u?\.?|s\.?l\.?u?\.?|group|grupo|holding|company)\b', '', x)
    x = re.sub(r'[^a-z0-9ñ ]', ' ', x)
    return re.sub(r'\s+', ' ', x).strip()


def leer_historial():
    if not os.path.exists(HISTORIAL):
        return ''
    return io.open(HISTORIAL, encoding='utf-8').read()

def validar_entregable(texto):
    """Cualquier cosa que entregamos y que un humano va a leer: prompt para el
    programador, descripciones del CSV, copy del gate. NO es un post de LinkedIn,
    así que no aplican hook ni bloques, pero SÍ la puntuación anti-IA: el copy del
    gate lo lee un cliente, y el prompt lo lee el programador."""
    r = []
    m = re.search(r'[—–]', texto)
    r.append((not m, 'Sin guion largo (brand-voice §3)', 'delator de IA nº1' if m else ''))
    # OJO: aquí NO se prohíbe la coma antes de "y" como en un post.
    # Decidido el 2026-07-14: la regla depende del ARTEFACTO. En un post de
    # LinkedIn está vetada (registro corto y hablado, canta a IA). En la WEB es
    # correcta en español uniendo dos oraciones independientes largas, y los seis
    # gates publicados la usan. Lo que sí está mal en los dos sitios es la coma
    # antes de "y" en una ENUMERACIÓN ("LinkedIn, email, y automatización"),
    # que es lo único que se marca aquí.
    ms = re.findall(r',\s*\w[\w\s]{0,30},\s+[ye]\s', texto)
    r.append((not ms, 'Sin coma antes de "y" en ENUMERACIONES (playbook §12)',
              f'{len(ms)}: {ms[:2]}' if ms else 'la coma uniendo 2 oraciones largas sí vale en web'))
    m = re.search(OPENERS_QUEMADOS, texto, re.I)
    r.append((not m, 'Sin openers quemados (§2.8)', f'"{m.group(0)}"' if m else ''))
    return r

RE_EMOJI_TARJETA = re.compile(
    '[\U0001F300-\U0001FAFF\U00002600-\U000027BF\U0001F1E6-\U0001F1FF⬀-⯿️]'
)


def validar_tarjeta(texto, card=None, cuenta=None, historico=False, publica_manana=False):
    """Pilar TARJETA (`post-workflow §4.6`), EN PRUEBA desde 2026-08-20.

    POR QUE ES UNA FUNCION APARTE Y NO 22 `if pilar in (...)` MAS
    -------------------------------------------------------------
    El aviso de la linea 426 dice que un pilar nuevo hay que cablearlo a los
    gates que ya existen. Aqui la respuesta a casi todos es NO, y por un motivo
    estructural, no por comodidad: **en una TARJETA el gancho vive DENTRO de la
    imagen**, y el texto de LinkedIn son 150-400 caracteres que arrancan ya en
    cuerpo. No hay hook que medir, no hay escalera, no hay bloque de dos, no hay
    reveal. Es el mismo caso que `entregable`: otro artefacto.

    Decidido gate a gate, por escrito, como manda el procedimiento:
      · hook (formato, verbo, ancla, nº de frases, densidad de cifras) → NO.
        El gancho esta en la imagen; el validador solo ve el texto de LinkedIn.
        🔄 15/10: MENOS la forma. La primera linea del texto es la que ve el feed y
        va como gancho de UNA linea con un blanco detras (check abajo).
      · ritmo §3.2 (bloque de dos, escalera, espejo, alternancia)      → NO.
        Con 400 caracteres no cabe. Mismo motivo por el que el meme queda
        fuera (`global §3.2`): la forma la decide el formato, no nuestro ritmo.
      · menciones / empresas / regiones                                 → NO.
        La tarjeta ataca una creencia, nunca nombra empresa ni persona.
      · anti-IA (guion largo, coma antes de "y", openers quemados)      → SI.
        Es copy nuestro y lo lee el ICP igual que cualquier post.
      · cifras en digito (§3.6)                                         → SI.
        Universal, y aqui ademas hay una cifra segura: la de P2.
      · spam ninja de agendar + pasillo de §4.4e-PRONTO                 → SI.
        Iker, 2026-08-20: en este pilar el ninja entra.
      · CTA imperativo                                                  → SI,
        pero AL REVES: aqui esta PROHIBIDO. Es lo unico que los datos
        castigan (Alex Hormozi 0,80x, Leila 0,90x con CTA).

    `card` es el texto que va DENTRO de la tarjeta, si se pasa con --tarjeta.
    Sin el no se puede comprobar la anatomia de 3 parrafos, que es el corazon
    del pilar, asi que su ausencia es un FALLO y no un aviso.
    """
    r = []

    def chk(ok, nombre, detalle='', aviso=False):
        r.append((ok, nombre, detalle, aviso))

    # ---------------------------------------------------------------- TEXTO
    m = re.search(r'[—–]', texto)
    chk(not m, 'Sin guion largo (brand-voice §3)', 'delator de IA nº1' if m else '')

    ms = re.findall(r'[^\s]+,\s+[ye]\s', texto)
    chk(not ms, 'Sin coma antes de "y"/"e" (brand-voice §3)', f'{len(ms)}: {ms[:3]}' if ms else '')

    m = re.search(OPENERS_QUEMADOS, texto, re.I)
    chk(not m, 'Sin openers quemados (§2.8)', f'"{m.group(0)}"' if m else '')

    # 150-400. El suelo importa tanto como el techo: por debajo de 150 no cabe
    # el ninja con su pasillo, y por encima de 400 el post deja de leerse de un
    # golpe, que es lo unico que hace funcionar al formato.
    # Se mide con el enlace YA ACORTADO, como los 450 del meme (4.4-CORTO): el
    # lector ve `lnkd.in/xxxxxxxx`, no la cola de UTM, y con la URL cruda un
    # enlace de Luma con sus cuatro parametros se comia 130 de los 400.
    n = len(re.sub(r'https?://\S+', 'https://lnkd.in/eXXXXXXX', texto))
    chk(150 <= n <= 400, 'TARJETA: el texto de LinkedIn cae entre 150 y 400 caracteres (§4.6-PASO-3)',
        f'{n} caracteres con el enlace acortado. Medido en Hormozi: 1-150 da 0,95x-1,06x y '
        f'151-400 da 0,91x-1,11x; a partir de 900 se hunde a 0,71x')

    # ⛔ EL TEXTO TAMBIEN ABRE CON UN GANCHO DE UNA LINEA (Iker, 2026-10-15). El docstring
    # decia "hook → NO" porque el gancho vive en la imagen, y entregue un texto que abria con
    # dos frases en dos lineas sin blanco entre ellas. Iker: "¿desde cuando hacemos ganchos
    # con dos lineas y sin salto de linea entre ellos? Nuestros ganchos son una linea". El
    # feed enseña la primera linea del texto antes que la tarjeta: es el gancho de la casa
    # (global §2.1), una sola linea y luego un blanco. La tarjeta de Iker del 17/09 ya abria
    # asi ("El precio casi nunca es lo que tumba una venta.").
    _bs_t = bloques(texto)
    _g = _bs_t[0] if _bs_t else []
    chk(len(_g) == 1 and len(_g[0]) <= 110,
        'TARJETA: el texto abre con un GANCHO de UNA linea y luego un blanco (global §2.1)',
        ('el primer bloque tiene %d lineas: %s. Una sola linea (zona de outliers <=110), '
         'y el cuerpo despues del blanco' % (len(_g), ' / '.join(_g)[:120])) if len(_g) != 1 else
        ('%d caracteres: la zona de nuestros ganchos ganadores llega a 110 (§2.10)' % len(_g[0])
         if len(_g[0]) > 110 else ''))

    ms = re.findall(r'#\w+', texto)
    chk(not ms, 'TARJETA: cero hashtags (§4.6-PASO-3)', f'{len(ms)}: {ms[:3]}' if ms else
        '0 de 14 tarjetas de Grant llevan')

    ms = RE_EMOJI_TARJETA.findall(texto)
    chk(not ms, 'TARJETA: cero emoji (§4.6-PASO-3)', f'{len(ms)}: {ms[:3]}' if ms else
        '0 de 14 tarjetas de Grant llevan')

    # El unico rasgo que los datos castigan de verdad. No confundir con el spam
    # ninja, que es un enlace enterrado en cuerpo y NO cuenta como CTA.
    m = re.search(r'\b(comenta|comentad|coment[aá]lo|escr[ií]beme|escribidme|desc[aá]rgat?e?|'
                  r's[ií]gueme|seguidme|dime qu[eé] opinas|qu[eé] opinas|etiqueta a|comparte '
                  r'esto|guarda esto)\b', texto, re.I)
    chk(not m, 'TARJETA: sin CTA imperativo (§4.6-PASO-3)',
        f'"{m.group(0)}" — Grant lleva 0 CTA en 75 posts, y en Hormozi el CTA rinde 0,80x y 0,90x'
        if m else 'lo unico que los datos castigan en este formato')

    # ------------------------------------------------------------ SPAM NINJA
    # ⛔ ARREGLADO EL 2026-09-16: ESTE BLOQUE SE ESCRIBIO EL 20/08 Y NO SE TOCO
    # CUANDO CAMBIARON DOS REGLAS DEL NINJA. (1) §4.4e-UNA (27/08): un post, UNA
    # puerta, y la elige el tema; el correo ya no es "opcional encima". (2) El
    # evento: mientras vive, el enlace de Luma OCUPA EL HUECO del de agendar en
    # cualquier pilar (global 4.4b, mecanizado el 21/08 y el 27/08 solo en
    # validar()). Aqui se seguia EXIGIENDO /agendar/, asi que la primera tarjeta
    # con Luma, que es justo lo que manda la receta esta semana, fallaba. Y como
    # esta funcion no pasa por validar(), ninguna regla de FORMA del ninja
    # (dos lineas, <=55, bisagra, palabra del gancho, UTM, linea de contexto del
    # evento, quemadas) se comprobaba en este pilar. Es feedback_regla_nueva_
    # revisar_codigo otra vez: una funcion aparte es un sitio donde la regla
    # nueva no llega sola.
    def _puerta(u):
        if 'recursos.neety.com/agendar' in u:
            return 'agendar'
        if 'recursos.neety.com/correo' in u or 'recursos.neety.com/newsletter' in u:
            return 'correo'
        if 'luma.com' in u or 'forward.neety.com' in u:
            return 'evento'
        if 'neety.com/academia/' in u:
            return 'gate'
        return None
    puertas = {p for p in (_puerta(u) for u in re.findall(r'https?://\S+', texto)) if p}
    chk(len(puertas) == 1, 'TARJETA: lleva UNA puerta, agendar, correo, evento o gate (§4.6-PASO-3, §4.4e-UNA)',
        ('ninguna: el spam ninja es obligatorio en este pilar' if not puertas else
         'lleva ' + ' + '.join(sorted(puertas)) + ': un post, una puerta') if len(puertas) != 1
        else 'puerta: ' + next(iter(puertas)))

    if puertas:
        bs = bloques(texto)
        idx = next((i for i, b in enumerate(bs)
                    if any(_puerta(l) for l in b)), None)
        # §4.4e-PRONTO se mide en BLOQUES, no en caracteres. Aqui NO hay gancho
        # en el texto (vive en la imagen), asi que los 2 bloques se cuentan
        # desde el principio: el enlace no puede ser el 1º ni el 2º bloque.
        chk(idx is not None and idx >= 2,
            'TARJETA: >=2 bloques de cuerpo antes del spam ninja (§4.4e-PRONTO)',
            f'va en el bloque {(idx or 0) + 1} de {len(bs)}. El gancho vive en la imagen, asi que '
            f'los 2 bloques se cuentan desde el inicio del texto')

    if 'correo' in puertas:
        m = re.search(r'\b(suscr[ií]b|newsletter)\w*', re.sub(r'https?://\S+', ' ', texto), re.I)
        chk(not m, 'TARJETA: sin "suscribete" ni "newsletter" en el bloque de correo (§4.4e)',
            f'"{m.group(0)}" suena a formulario; a un industrial de 55 se le dice "esto lo mando '
            f'por correo antes que aqui"' if m else '')

    # LAS REGLAS DE FORMA DEL NINJA, LAS MISMAS QUE EN CUALQUIER PILAR. No se
    # copian aqui: se corre validar() sobre el texto con P1 de la tarjeta delante
    # haciendo de gancho (el gancho de este pilar ES la tarjeta, y el ninja tiene
    # que recoger una palabra suya) y se quedan solo los checks del enlace. Asi,
    # la proxima regla del ninja entra en este pilar sin tocar esta funcion.
    if puertas and card:
        _p1 = norm(card).strip().split('\n\n')[0].replace('\n', ' ')
        _PREF = ('Spam ninja', 'SPAM NINJA', 'ENTREGA: repetir la palabra', 'ENTREGA: la linea',
                 'EVENTO:', 'UNA sola puerta', 'El enlace lleva https', 'Todo enlace nuestro',
                 'El utm_campaign', 'La fecha del utm', 'El UTM de NUESTRA', 'En LUMA',
                 'Con spam ninja', 'Sin anglicismos', 'Sin el AÑO', 'Sin transcribir',
                 'Sin lenguaje de reproche')
        for x in validar(_p1 + '\n\n' + texto, 'meme', cuenta, historico=historico,
                         publica_manana=publica_manana, ref_fuera=True):
            if x[1].startswith(_PREF):
                r.append(x)

    # Universal §3.6: si hay cifras, en digito.
    ms = re.findall(r'\b(dos|tres|cuatro|cinco|seis|siete|ocho|nueve|diez|veinte|treinta|'
                    r'cuarenta|cincuenta|cien|doscientos|quinientos|seiscientos|mil)\b',
                    texto, re.I)
    chk(not ms, 'Cifras en digito, nunca en letra (§3.6)', f'{ms[:3]}' if ms else '')

    # §4.6-AVATAR (Iker, 2026-09-16): el generador deforma a las personas en cada
    # iteracion. Aviso fijo de entrega porque el script no ve el prompt.
    chk(False, 'ENTREGA: el avatar va como CIRCULO MAGENTA y la cara la pega el script (§4.6-AVATAR)',
        'en el prompt, circulo liso FF00FF sin foto dentro, y al generador NO se le adjunta la '
        'foto del jefe. Con el resto aprobado, Iker pasa el magenta a transparente y se monta con '
        'scripts/montar-avatar-tarjeta.py', aviso=True)

    # ------------------------------------------------------------- LA TARJETA
    if card is None:
        chk(False, 'TARJETA: falta el texto de la tarjeta (--tarjeta <fichero>)',
            'sin el no se puede comprobar la anatomia de 3 parrafos, que ES el pilar '
            '(13 de 14 en Grant)')
        return r

    card = norm(card)
    parr = [p.strip() for p in re.split(r'\n\s*\n', card) if p.strip()]

    chk(len(parr) == 3, 'TARJETA: la tarjeta tiene 3 parrafos (§4.6-PASO-1)',
        f'{len(parr)}. Medido: 3 en 13 de 14 tarjetas de Grant. La unica de 2 es un contraste '
        f'puro ("En culturas toxicas... / En culturas sanas...")')

    if parr:
        m = re.search(r'\d', parr[0])
        chk(not m, 'TARJETA: P1 sin ninguna cifra (§4.6-PASO-1)',
            f'"{m.group(0)}" en P1. Cero de catorce tarjetas de Grant llevan cifra en P1; '
            f'la cifra vive SIEMPRE en P2' if m else '')

    if len(parr) >= 3:
        chk(len(parr[2]) < len(parr[0]) and len(parr[2]) < len(parr[1]),
            'TARJETA: P3 es mas corta que P1 y P2 (§4.6-PASO-1)',
            f'P1={len(parr[0])} P2={len(parr[1])} P3={len(parr[2])}. P3 es el aforismo y es lo '
            f'que la gente repostea: 14 de 14 en Grant')

    # 2026-09-17: se colo "Solo consigue que nadie te cuente" en P1 y "Consigue que tu
    # equipo te cuente" en P2. Grant repite el SUSTANTIVO (problems) a proposito;
    # el verbo repetido entre parrafos suena a plantilla. Aviso: a veces el eco es
    # buscado (el "te cuente" del contraste nadie / tu equipo lo era).
    if len(parr) >= 2:
        _w = lambda s: {w.lower() for w in re.findall(r'\b[a-záéíóúñ]{6,}\b', s, re.I)}
        _rep = sorted(_w(parr[0]) & _w(parr[1]))
        chk(not _rep, 'TARJETA: P2 no repite palabras de P1 sin querer (brand-voice §3c-CALCO)',
            'repetidas: %s. Un sustantivo del original puede repetirse (Grant repite problems); '
            'un VERBO repetido suena a plantilla ("consigue que" en P1 y P2, 17/09)' % _rep
            if _rep else '', aviso=True)

    ms = re.findall(r'#\w+', card)
    chk(not ms, 'TARJETA: cero hashtags DENTRO de la tarjeta (§4.6-PASO-1)', f'{ms[:3]}' if ms else '')

    ms = RE_EMOJI_TARJETA.findall(card)
    chk(not ms, 'TARJETA: cero emoji DENTRO de la tarjeta (§4.6-PASO-1)', f'{ms[:3]}' if ms else '')

    ms = re.findall(r'https?://|www\.|@\w+', card)
    chk(not ms, 'TARJETA: cero enlaces y cero menciones DENTRO de la tarjeta (§4.6-PASO-1)',
        f'{ms[:3]} (el @handle de la cabecera no cuenta: no va en este fichero)' if ms else '')

    # images §0h-FILTROS: el texto de dentro de la imagen es copy NUESTRO y pasa
    # los MISMOS filtros que el cuerpo. Los tres, no solo el guion largo.
    m = re.search(r'[—–]', card)
    chk(not m, 'TARJETA: sin guion largo dentro de la tarjeta (images §0h-FILTROS)',
        'el texto de la imagen es copy nuestro y pasa los mismos filtros' if m else '')

    ms = re.findall(r'[^\s]+,\s+[ye]\s', card)
    chk(not ms, 'TARJETA: sin coma antes de "y"/"e" dentro de la tarjeta (images §0h-FILTROS)',
        f'{len(ms)}: {ms[:3]}' if ms else '')

    m = re.search(OPENERS_QUEMADOS, card, re.I)
    chk(not m, 'TARJETA: sin openers quemados dentro de la tarjeta (§2.8)',
        f'"{m.group(0)}"' if m else '')

    # La tarjeta ataca una creencia del mundo del trabajo, nunca habla de nosotros.
    m = re.search(r'\b(neety|nuestra herramienta|nuestro producto|nosotros)\b', card, re.I)
    chk(not m, 'TARJETA: la tarjeta no habla de Neety (§4.6-PASO-1)',
        f'"{m.group(0)}". Las 14 de Grant atacan una creencia del mundo del trabajo: ni producto, '
        f'ni empresa, ni "yo". En cuanto nombra la marca deja de ser este formato' if m else '')

    return r

# ⚠️ AL AÑADIR UN PILAR NUEVO, CABLEALO A LOS GATES QUE YA EXISTEN.
# Iker, 2026-08-05: meti el pilar `evento` y solo le escribi SUS checks nuevos,
# sin revisar los 22 `if pilar in (...)` que ya habia. Resultado: el validador
# aprobo 28/28 un post sin un solo bloque de dos, porque ese check estaba
# limitado a mapa/los10/leadmagnet. Lo pillo el a ojo, que es justo lo que el
# validador existe para evitar.
# EL PROCEDIMIENTO: grep "if pilar" y decidir SI o NO para cada uno, por escrito.

# ⭐ LAS PALABRAS CON IMAGEN QUE EL MISMO LECTOR ACABA DE VER (Iker, 2026-09-23).
# La historia del 23/09 salio con "nave nueva" (el "Los 10" de Unai del 15/09),
# "naves" y "camiones" (el mapa de Alava de Iker del 22/09, EL DIA ANTERIOR) y
# "carpeta" (el gancho de la historia de Asier del 09/09). Pasaba 60/60 porque las
# listas de quemadas solo guardan FRASES y se rellenan a mano. Iker: "no se por que
# lo de nave me suena". Las tres cuentas comparten red: el lector ve las tres.
# Esto baja lo publicado de la BD y canta las palabras RARAS (poco frecuentes en
# nuestro corpus) que el borrador comparte con lo publicado en los ultimos 14
# dias. Aviso y no fallo: la idea no se quema, la frase si (global 2.0b), y una
# palabra repetida puede ser la buena; lo que hace falta es VERLA antes de entregar.
BD_BASE = 'https://linkedin-post-analyzer-production.up.railway.app'
BD_CREADORES = {
    'Iker': '3d545376-057c-48db-8b45-c5c5510110bb',
    'Unai': '88d272b7-0f93-49cf-bac1-1334965f361d',
    'Asier': '89610120-758c-4d25-8353-76c1147e0f0c',
}
_STOP_ECO = set((
    'para pero porque como cuando donde desde hasta entre sobre sin con que quien '
    'cual este esta estos estas ese esa esos esas aquel aquella nada nadie todo toda '
    'todos todas otro otra otros otras mismo misma cada algo alguien siempre nunca '
    'ahora antes despues luego tambien tampoco todavia solo mucho mucha muchos poco '
    'mas menos bien muy aqui alli entonces ademas tras hacia segun cualquier ningun '
    'ninguna ninguno tiene tienen tenia tengo hace hacen hizo hacer ser estar estaba '
    'fue fueron puede pueden sabe saber dice dijo decir llega llego vamos hemos habia '
    'jueves evento presencial donostia septiembre plazas sala '
    # Vocabulario del spam ninja, que se repite A PROPOSITO (la idea no se quema)
    'contacto primero primera ultimo ultima mejor peor gente nombre'
).split())


def _raiz_eco(w):
    import unicodedata
    w = ''.join(c for c in unicodedata.normalize('NFD', w.lower())
                if unicodedata.category(c) != 'Mn')
    if len(w) > 5 and w.endswith('es'):
        w = w[:-2]
    elif len(w) > 4 and w.endswith('s'):
        w = w[:-1]
    return w


def _palabras_eco(t):
    t = re.sub(r'https?://\S+', ' ', t)
    lineas = [l for l in t.split('\n') if not l.strip().startswith(('→', '@'))]
    return {_raiz_eco(w) for w in re.findall(r'[a-záéíóúñü]{4,}', ' '.join(lineas), re.I)} - _STOP_ECO


def eco_reciente(cuerpo, dias=14, hoy=None):
    """Devuelve (lista de ecos, error). Cada eco: (palabra, cuenta, fecha, linea)."""
    import json, base64, urllib.request
    u, p = os.environ.get('APP_BASIC_USER'), os.environ.get('APP_BASIC_PASS')
    if not (u and p):
        return None, 'faltan APP_BASIC_USER/APP_BASIC_PASS en el entorno'
    auth = base64.b64encode(f'{u}:{p}'.encode()).decode()
    posts = []
    try:
        for quien, cid in BD_CREADORES.items():
            req = urllib.request.Request(f'{BD_BASE}/api/creators/{cid}/posts?limit=120',
                                         headers={'Authorization': 'Basic ' + auth})
            with urllib.request.urlopen(req, timeout=20) as resp:
                for x in json.load(resp).get('posts', []):
                    posts.append((quien, (x.get('published_at') or '')[:10], x.get('content_text') or ''))
    except Exception as e:
        return None, f'no pude leer la BD ({e.__class__.__name__})'
    if not posts:
        return None, 'la BD no devolvio publicaciones'
    # Frecuencia en todo el corpus propio: lo que sale en mas del 6% de nuestros
    # posts (venta, cliente, firma, puerta...) es vocabulario de la casa, no un eco.
    # Afinado el 23/09 contra 235 posts: "nave" sale en 13 y tiene que cazarse;
    # "firma" en 19 y "puerta" en 20 solo metian ruido.
    df = {}
    for _, _, t in posts:
        for w in _palabras_eco(t):
            df[w] = df.get(w, 0) + 1
    tope = max(3, int(len(posts) * 0.06))
    hoy = hoy or datetime.date.today()
    mias = {w for w in _palabras_eco(cuerpo) if df.get(w, 0) <= tope}
    limpio = norm(cuerpo).strip()
    ecos = []
    for quien, fecha, t in posts:
        try:
            edad = (hoy - datetime.date.fromisoformat(fecha)).days
        except ValueError:
            continue
        if edad < 0 or edad > dias or norm(t).strip() == limpio:
            continue
        for w in sorted(mias & _palabras_eco(t)):
            linea = next((l.strip() for l in t.split('\n')
                          if w in {_raiz_eco(x) for x in re.findall(r'[a-záéíóúñü]{4,}', l, re.I)}), '')
            ecos.append((w, quien, fecha, linea[:90]))
    # Una entrada por palabra (la publicacion mas reciente) y las mas raras
    # primero: el 23/09 el aviso se cortaba a las 10 y dejaba fuera justo
    # "carpeta" (Asier) y "nave nueva" (Unai), que eran dos de los tres ecos.
    ecos.sort(key=lambda e: e[2], reverse=True)
    vistos, unicos = set(), []
    for e in ecos:
        if e[0] not in vistos:
            vistos.add(e[0])
            unicos.append(e)
    unicos.sort(key=lambda e: (df.get(e[0], 0), e[0]))
    return unicos, None


# 🔀 ROTACION DEL DOLOR DEL NINJA (Iker, 2026-10-08, global §4.4b-ROTACION).
# Medido ese dia en la BD: desde el evento, los 12 ninjas distintos de las 3
# cuentas vendian el MISMO dolor (la persona de dentro) y 7 decian literalmente
# "quien decide". El dolor no se cambia porque si: se ROTA para medir cual saca
# mas clics, y el sinonimo rota aunque el dolor se repita. Avisos, no fallos.
DOLORES_NINJA = [
    # El evento va primero: es otra PUERTA (Luma), no otro dolor, y sus ninjas
    # tambien dicen "nombres" o "quien compra" (la sala de los que deciden).
    ('evento (la sala)', r'\bsala\b|plazas|sillas|huecos|invitados|80 sitios|80 nombres|el 24 de septiembre|mi[eé]rcoles 28|28 de octubre|online y gratis'),
    ('acierto (pocas que encajan, no listas de miles)', r'encaj|miles|pocas|acierta|acertar|volumen|limpiar|sobran|no valen|que valen'),
    ('tu confirmas (nada sale sin el comercial)', r'confirm|apruebas|validas|sin que tu comercial|t[uú] decides'),
    ('buscar contra contactar', r'buscar|buscando|contactar'),
    ('la persona de dentro', r'decide|firma|qui[eé]n compra|nombre|cargo|a qui[eé]n|interlocutor|persona'),
]

# 🧩 LOS 4 TIPOS DE CLIENTE (global §4.4b-CADENA y §4.4b-TIPOS, Iker 2026-10-14).
# El ninja habla a UN eslabon roto y rota entre los 4 para que el A/B diga cual
# convierte mas. Tamano y cierre del informe "Donde le duele a cada cliente":
# 1 = 9 cuentas / 11 %, 2 = 15 / 20 %, 3 = 21 / 10 %, 4 = 26 / 62 % (16 de 22 clientes).
TIPOS_CLIENTE = [
    ('tipo 1 · no sabe a que empresas vender',
     r'encaj|acierta|acertar|sector|filtro|cu[aá]les|por lo que hace|empresas? que|miles|listas? de'),
    ('tipo 2 · sabe cuales, no a quien dentro',
     r'decide|firma|manda|[uú]ltima palabra|qui[eé]n compra|nombre|cargo|interlocutor|persona|de dentro'),
    ('tipo 3 · sabe a quien, no cuando',
     r'cu[aá]ndo|a tiempo|tarde|antes que (otro|nadie)|el momento'),
    ('tipo 4 · nada montado, se le van los meses buscando',
     r'buscar|buscando|contactar|meses|semanas|calle|tiempo|vender m[aá]s'),
]

def tipos_de(ninja):
    n = ninja.lower()
    return [nom for nom, rx in TIPOS_CLIENTE if re.search(rx, n)]


def ninja_de(texto):
    L = [l for l in texto.split('\n')]
    for i, l in enumerate(L):
        if re.search(r'https?://|lnkd\.in', l) and i > 0 and 'mapa completo' not in l.lower():
            return re.sub(r'https?://\S+', '', L[i - 1] + ' ' + l).strip()
    return ''

def dolores_de(ninja):
    n = ninja.lower()
    return [nom for nom, rx in DOLORES_NINJA if re.search(rx, n)]

def ganchos_recientes(cuenta, n=3):
    """[(fecha, pilar, gancho)] de los ultimos posts de esa cuenta, del mas nuevo al mas viejo."""
    import json, base64, urllib.request
    cid = BD_CREADORES.get((cuenta or '').strip().capitalize())
    u, pw = os.environ.get('APP_BASIC_USER'), os.environ.get('APP_BASIC_PASS')
    if not (cid and u and pw):
        return None
    auth = base64.b64encode(f'{u}:{pw}'.encode()).decode()
    try:
        req = urllib.request.Request(f'{BD_BASE}/api/creators/{cid}/posts?limit=20',
                                     headers={'Authorization': 'Basic ' + auth})
        with urllib.request.urlopen(req, timeout=20) as resp:
            posts = json.load(resp).get('posts', [])
    except Exception:
        return None
    out, vistos = [], set()
    for x in sorted(posts, key=lambda x: x.get('published_at') or '', reverse=True):
        g = (x.get('hook_text') or (x.get('content_text') or '').split('\n')[0] or '').strip()
        if g and g.lower() not in vistos:
            vistos.add(g.lower())
            out.append(((x.get('published_at') or '')[:10], x.get('pillar') or '', g))
    return out[:n]

def ninjas_recientes(dias=21, hoy=None):
    """[(cuenta, fecha, ninja)] de las 3 cuentas, sin repetir resubidas."""
    import json, base64, urllib.request
    u, pw = os.environ.get('APP_BASIC_USER'), os.environ.get('APP_BASIC_PASS')
    if not (u and pw):
        return None
    auth = base64.b64encode(f'{u}:{pw}'.encode()).decode()
    hoy = hoy or datetime.date.today()
    out, vistos = [], set()
    try:
        for quien, cid in BD_CREADORES.items():
            req = urllib.request.Request(f'{BD_BASE}/api/creators/{cid}/posts?limit=60',
                                         headers={'Authorization': 'Basic ' + auth})
            with urllib.request.urlopen(req, timeout=20) as resp:
                for x in json.load(resp).get('posts', []):
                    f = (x.get('published_at') or '')[:10]
                    try:
                        if (hoy - datetime.date.fromisoformat(f)).days > dias:
                            continue
                    except ValueError:
                        continue
                    nj = ninja_de(x.get('content_text') or '')
                    if nj and (quien, nj) not in vistos:
                        vistos.add((quien, nj))
                        out.append((quien, f, nj))
    except Exception:
        return None
    return sorted(out, key=lambda r: r[1], reverse=True)


# 🗺️ MAPA DE CAPADOS POR PSICOLOGIA (Iker, 2026-10-08, global §9.6). Cada familia
# sale de un caso REAL nuestro; las palabras de la lista son sus VECINAS: misma
# psicologia, sin caso propio. Las probadas ya tienen su check (LinkedIn, comenta,
# conecta, transcribo, robar, automatizar); esto caza a las primas, que es lo que
# yo proponia de recambio sin darme cuenta. AVISO: el corpus dice que varias
# reparten, pero en el GANCHO y junto a un enlace nuevo no se juega.
CAPADO_FAMILIAS = [
    ('CEBO DE INTERACCION (caso: Comenta "X" 06-07/08, conecta conmigo 18/08)',
     'pedir una accion a cambio de algo: la plataforma lo lee como manipular el reparto',
     r'(etiqueta a|menciona a|comparte si|dale (a )?like|reacciona con|guarda (esto|este)|s[ií]gueme|activa la campana|'
     r'te lo (mando|paso|env[ií]o) por (privado|dm|mensaje)|escr[ií]beme (por )?(privado|un dm)|deja (un|tu) comentario|link en (los )?comentarios)'),
    ('NOMBRAR LA PLATAFORMA (caso: LinkedIn 29/09, "el algoritmo de LinkedIn" 27/09)',
     'hablar del sistema que reparte: se lee como truco para el algoritmo',
     r'(el feed\b|esta red( social)?|redes sociales|hack\w*|viraliz\w+|engagement|alcance org[aá]nico)'),
    ('AUTOMATIZACION Y ENVIO MASIVO (caso: automatizar 08/10)',
     'herramientas que escriben solas y en masa: lo que la plataforma persigue',
     r'(autom[aá]tic\w*|piloto autom|\bbots?\b|en masa|masiv\w+|scrap\w*|extraer (datos|contactos|correos|emails)|invitaciones a (miles|cientos))'),
    ('DATOS O CONVERSACIONES DE TERCEROS (caso: la transcribo 19/08)',
     'reclamar en primera persona que tenemos datos o palabras de alguien que no nos los dio',
     r'(\besp[ií](o|é|amos|ar|ando|aba)\b|espionaje|(saco|sacamos|consigo|conseguimos|tengo|tenemos) (su|el|sus) (email|correo|tel[eé]fono|m[oó]vil|datos)|datos personales|base de datos de personas)'),
    ('DELITO, VIOLENCIA O SUCESO (caso: nos entraron a robar 30/09)',
     'afirmar un delito o un acto violento, sufrido o cometido',
     r'(fraude|ilegal\w*|\barmas\b|\bdispar(ar|o|os|amos|an|é|ó|aba)\b|pistola|bomba|amenaz\w+|polic[ií]a)'),
    ('SORTEO O CHOLLO (lead magnets de agosto: regalo, la peor mediana medida)',
     'la familia de la estafa: algo gratis a cambio de una accion',
     r'(\bregal[oa]\w*|sorteo|chollo|solo hoy|premio gratis)'),
]

def riesgo_capado(texto):
    """[(familia, porque, [lineas])] con las vecinas que aparecen, sin URLs."""
    limpio = re.sub(r'https?://\S+', ' ', texto)
    out = []
    for fam, porque, rx in CAPADO_FAMILIAS:
        lin = [l.strip()[:60] for l in limpio.split('\n') if re.search(rx, l, re.I)]
        if lin:
            out.append((fam, porque, lin))
    return out


def puerta_agendar(texto):
    # 2026-09-28 (Iker): la puerta de agendar se muda a la web nueva,
    # https://neety.com/solicitar-demo (reserva de 30 min con Iker, buscador en
    # directo de empresas + interlocutor, y captura el UTM igual que /agendar/).
    # Los ~25 checks de este fichero buscan 'recursos.neety.com/agendar', asi que
    # en vez de tocarlos uno a uno (y dejarme alguno vivo con la regla vieja) se
    # traduce la URL nueva a la vieja SOLO dentro del validador. El fichero del
    # post no se toca. Coste conocido: la URL vieja mide 3 caracteres mas, asi que
    # el check del caracter 650 queda un pelo mas estricto, nunca mas laxo.
    texto = texto.replace('https://neety.com/solicitar-demo',
                          'https://recursos.neety.com/agendar')
    # 2026-10-08 (Iker): el COMERCIAL de una cuenta de compañero (hoy Ismael)
    # no manda a la web: manda a SU agenda, https://meetings.neety.com/{nombre}.
    # Es la misma puerta (reservar una reunion), asi que se traduce igual que
    # /solicitar-demo (working-preferences §0c-VOZ). Va LIMPIA, sin UTM: esa app
    # no lee utm_* ni carga analitica, y las reuniones las cuenta el comercial.
    # Para que los checks de UTM de la puerta no la tumben, se le cuelga aqui
    # dentro un UTM de relleno; el fichero del post no se toca.
    texto = re.sub(r'https://meetings\.neety\.com/[a-z0-9-]+(?:\?\S*)?',
                   'https://recursos.neety.com/agendar?utm_source=linkedin&utm_medium=post'
                   '&utm_campaign=agenda-propia&utm_content=agenda', texto)
    # 2026-10-08: los mapas se mudan al blog de neety.com
    # (/blog/mapa-industrial-{region}, migracion de neety-resources 1c41929).
    # Mismo truco: dentro del validador se traduce a /mapas/{region}/ para que
    # los checks del ultra ninja, del dominio propio y del UTM sigan valiendo.
    # 2026-10-27: el GATE de un recurso de la Academia vive en la web nueva
    # (neety.com/academia/{slug}) y puede ser la puerta de cualquier pilar
    # (post-workflow §8.1b). Es dominio propio: se traduce igual, para que el
    # check de "enlace fuera" no lo tumbe y los del UTM lo sigan mirando.
    texto = texto.replace('https://neety.com/academia/',
                          'https://recursos.neety.com/academia/')
    return re.sub(r'https://neety\.com/blog/mapa-industrial-([a-z-]+)',
                  r'https://recursos.neety.com/mapas/\1/', texto)


FOTO_GRUPO = False
# Las 5 preguntas de criterio que mas han fallado con el marcador en verde (15/10). Cada
# una apunta a su regla. Se contestan por escrito en --criterio; ver el final de main().
CRITERIO = [
    ('bucle', 'Tapa todo menos el gancho (y la imagen o el video): ¿que pregunta deja abierta y en que linea del ultimo tercio se contesta? (global §2.0 y §2.0-PAGO)'),
    ('explicito', '¿Que daria por sabido alguien que no nos conoce? Cada nombre propio nuestro con su categoria, cada cifra con su sustantivo (global §2.5b-EXPLICITO)'),
    ('verdad', '¿Todo lo afirmado sale de la fuente (video, BD, cliente, informe), sin cuando, cifra ni frase puesta por nosotros? (CLAUDE.md, post-workflow §4.6)'),
    ('imagen', '¿El gancho dice algo DISTINTO de lo que ensena la foto o el video, y el cuerpo no contradice al personaje? ¿Y la foto NO huele a evento ni a venta (escenario, ponente, photocall, acreditaciones, carpeta del evento) y se le ve la CARA al que publica? ¿Y a 360 px lo primero que se ve es lo que hay que entender, sin un segundo foco que compita (una palabra naranja, una caja)? (global §2.0c, post-workflow §4.6-FOTO-VENTA, images §0a-FOCO)'),
    # 28/10: la linea de contexto decia "Iba de dar con las empresas que te comprarian", el
    # tema del evento y no su valor, y la pregunta no lo miraba. Ahora lo pide por escrito.
    ('ninja', 'Tapa el post: ¿la linea 1 dice que falta, la 2 lo cubre, y el destino cumple la promesa? ¿Va despues del valor? ¿Por que ESE destino para este post y no otro (continua el tema, mide la variable del A/B, cabe en el reparto de puertas de la semana)? Por defecto no vale (post-workflow §8.1b, 30/10). Y si lleva contexto encima: ¿nombra el dolor CONCRETO que resuelve (tiempo buscando, acertar con la empresa, la persona de dentro) y no el tema? (global §4.4b, §4.4b-CONTEXTO)'),
    # Iker, 15/10: la tarjeta de Asier juzgaba al cliente que paga poco y nadie lo vio,
    # porque la regla solo existia en el meme y en Unai. El lexico de main() caza lo
    # explicito; esto obliga a mirar lo que no tiene palabra clave (y la imagen).
    ('comprador', '¿Alguna linea, del texto, de la tarjeta o de la imagen, JUZGA al que compra (cargo con poder de decision o el cliente como figura) en vez de contar lo que hace? ¿Algo deja decir "en Neety se rien de sus clientes"? (brand-voice canonico 5)'),
    # 28/10: una historia paso 10 validaciones en verde con "nos puso precio", sin una sola
    # palabra que parase el scroll. El script solo veta verbos flojos (VERBO_FLOJO) y no puede
    # exigir uno punchy sin fabricar muletillas (global §2.9), asi que se contesta por escrito
    # y con la escalera entera: el neutro, el elegido y el que se pasa (criticar -> desmontar
    # -> despellejar). Vale tambien para un borrador heredado: heredar no exime.
    ('punch', '¿Que palabra del gancho para el scroll? Escribe la escalera con su objeto: el neutro -> el elegido -> el que se pasa (criticar -> desmontar -> despellejar). Si no la encuentras, no la hay (global §2.9-ESCALERA)'),
    # 28/10, auditoria del validador: global §8 tenia una lista "lo que el script NO puede ver,
    # esto lo miras tu" y solo 5 de sus puntos se habian pasado a preguntas escritas el 15/10.
    # Lo que no se pregunta por escrito no se mira: se pasan los que quedaban, cada uno solo en
    # los pilares donde aplica (CRITERIO_PILAR, abajo).
    ('ancla', 'Leelo como si lo subiera una consultora, una agencia o una constructora: ¿cuela? Di que palabra del oficio lo hace solo nuestro (ventas; en Unai vale ecosistema) (global §2.3 y §8)'),
    # 28/10: una referencia de meme puede pasar todos los filtros y no parecerse a nada de lo que
    # nos funciono (el globo de Yoda, 5.447). Se pregunta tambien a que meme NUESTRO se parece.
    ('motor', '¿Cual es el MOTOR y en que se sostiene? Meme: el motor A/B, su referencia validada y a que meme NUESTRO se parece por formato y psicologia (grafica o evolucion con rotulos, relacion entre roles, captura) y no a los flojos (una persona sola, plantilla infantil), y si su gracia sobrevive a nuestro dibujo en flat sin reconocer a ningun personaje ni conocer una herramienta concreta, y que SUBTIPO es y si encaja con el objetivo (post-workflow §4.4-PUBLICO y §4.4-SUBTIPOS); mapa o "Las 10": el dato o cliche verificado; lead magnet: el mecanismo (live, urgencia); tarjeta: el original (global §8, post-workflow §4)'),
    ('remix', '¿Que HUESO del original se roba y la mecanica del gancho es la misma, en una frase? ¿La referencia es de ventas, no la hemos usado ya y la traduccion literal esta escrita? (outliers §3.9c, post-workflow §4.4-PASO-0, -PASO-1-LITERAL, -FUENTE-VENTAS)'),
]
# Que pilar contesta que clave. Las que no estan aqui las contestan todos.
CRITERIO_PILAR = {
    'motor': {'meme', 'mapa', 'las10', 'los10', 'objeto', 'leadmagnet', 'tarjeta'},
    'remix': {'meme', 'tarjeta'},
}
HISTORIA_EVENTO = False


PUERTA_VIEJA = False


def validar(texto, pilar, cuenta=None, generico=False, meme_sobrio=False, ref_fuera=False, remix=False, sin_menciones=False, card=None, solo_correo=False, historico=False, publica_manana=False):
    global PUERTA_VIEJA
    # se mira ANTES de traducir: puerta_agendar() convierte la URL nueva en la vieja
    PUERTA_VIEJA = 'recursos.neety.com/agendar' in texto
    texto = puerta_agendar(norm(texto))
    if pilar == 'entregable':
        return validar_entregable(texto)
    if pilar == 'tarjeta':
        return validar_tarjeta(texto, card, cuenta, historico, publica_manana)
    # "LAS 10" (Iker, 2026-10-01): vuelve "Los 10", pero con las EMPRESAS de
    # protagonistas y sus LOGOS en la orla, no las caras de las personas (que es
    # lo que costo las quejas y el veto del 16/09). Comparte con "Los 10" todo
    # lo que no depende de que el protagonista sea una persona (10 fichas en
    # 5+5, dos @ por ficha, logro tras "·", cero cifra regional, region callada
    # en el gancho, menciones sin repetir), asi que corre como 'los10' y se
    # apagan solo los checks de persona (puente empresa->persona, gerundio de
    # herida del comercial, beat de equipo, empresa que tapa a la persona).
    LAS10 = pilar == 'las10'
    if LAS10:
        pilar = 'los10'
    # NOTICIA (Iker, 2026-10-23, en prueba, post-workflow §4.9): una noticia de esta
    # semana contada con nuestro angulo, SIN regalo. Corre como historia (enlace antes
    # del 650, ninja, ritmo) y se apagan los checks de escena personal de §4.6.
    NOTICIA = pilar == 'noticia'
    if NOTICIA:
        pilar = 'historia'
    bs = bloques(texto)
    hook = bs[0] if bs else []
    hook_txt = ' '.join(hook)
    cuerpo = texto
    r = []          # (ok, nombre, detalle, es_aviso)
    def chk(ok, nombre, detalle='', aviso=False):
        # aviso=True: se imprime pero NO cuenta en el marcador. Es para lo que
        # es SOSPECHOSO pero no prohibido — mezclarlo con las reglas duras
        # vaciaria de significado el "20/20", que es justo lo que pasa cuando
        # un post con 20/20 esta mal por criterio.
        r.append((ok, nombre, detalle, aviso))

    # ---------- CALENDARIO ESTACIONAL (post-workflow §8.0-AGOSTO) ----------
    # AVISO y no fallo, y es deliberado: esto no juzga el TEXTO, juzga el MES.
    # Un peloteo escrito en agosto puede estar perfecto y aun asi no tocaba
    # publicarlo (Iker, 2026-08-14): el motor del pilar son los mencionados
    # reaccionando y repartiendo, y en agosto en España estan de vacaciones.
    # Precedente medido fuera de agosto: el mapa de Cataluña de Unai hizo 0.59x
    # con 3.018 impresiones porque las empresas nos ignoraron. Y NO es un veto:
    # si Iker confirma, el post se escribe entero, asi que restar en el marcador
    # seria mentir sobre la calidad del texto.
    if pilar in ('mapa', 'los10', 'objeto'):
        _hoy = datetime.date.today()
        chk(_hoy.month != 8, 'AGOSTO: el peloteo no se publica (post-workflow §8.0-AGOSTO)',
            f'hoy es {_hoy.isoformat()}. En agosto el peloteo se sustituye por meme / lead '
            'magnet / historia: su motor son los mencionados y estan de vacaciones. Avisa a '
            'Iker ANTES de escribir y ofrece dejarlo preparado para septiembre'
            if _hoy.month == 8 else '', aviso=True)

    # ---------- UNIVERSALES ----------
    chk(len(hook_txt) <= 210, 'Hook ≤210 caracteres (§2.1)', f'{len(hook_txt)} caracteres')
    chk(len(hook) == 1, 'Hook es UN bloque, sin salto dentro (§2.1)',
        f'{len(hook)} líneas en el bloque del hook' if len(hook) != 1 else '')
    # §2.10 — UNA O DOS ORACIONES, NUNCA TRES. Medido sobre 224 posts el
    # 2026-07-20: 1 oracion -> 8,4% de outliers · 2 -> 17,0% · 3 -> 0 de 5.
    # Ninguna de tres ha volado jamas. Y el motivo es fisico: con tres te comes
    # el corte de la vista previa de LinkedIn y el lector no llega al gancho.
    # Se colo un hook de tres frases con 20/20 porque el script contaba
    # caracteres, no oraciones.
    _h = re.sub(r'https?://\S+', '', hook_txt)
    _orac = [t for t in re.split(r'(?<=[.!?])\s+(?=[A-ZÁÉÍÓÚÑ¿¡])', _h) if len(t.strip()) > 3]
    chk(len(_orac) <= 2, 'Hook de 1 o 2 oraciones, nunca 3 (§2.10)',
        f'{len(_orac)} oraciones. Ninguna de 3 ha sido outlier (0 de 5)' if len(_orac) > 2 else '')

    # §2.10 — la ZONA donde vive lo que funciona. El tope de 210 es el maximo
    # tecnico, pero la mediana de nuestros outliers es 75 (hook de 1 oracion) y
    # 93 (de 2). Aviso, no prohibicion: el mapa de 12.9x tiene 115.
    chk(len(hook_txt) <= 110, 'Hook en la zona de los outliers, ≤110 (§2.10)',
        f'{len(hook_txt)} car. Los ganadores viven en 75-93; el mas largo que ha '
        f'funcionado tiene 115' if len(hook_txt) > 110 else '', aviso=True)
    # 2026-10-27: corto y bueno gana a largo y bueno. El tope de 110 dejaba pasar
    # en silencio un gancho de 1 oracion de 97 caracteres, 22 por encima de la
    # mediana de los ganadores. Aviso a la mediana + 15 (90 con 1 oracion, 108 con
    # 2), y como es aviso, con --antes un retoque que alarga el gancho lo tumba.
    _tope_h = 90 if len(_orac) <= 1 else 108
    chk(len(hook_txt) <= _tope_h, 'Hook cerca de la mediana de los ganadores (§2.10)',
        f'{len(hook_txt)} car con {len(_orac)} oracion(es); la mediana de los ganadores es '
        f'{75 if len(_orac) <= 1 else 93}. Corto y bueno gana a largo y bueno: tacha hasta '
        f'{_tope_h} o menos sin perder la palabra con fuerza' if len(hook_txt) > _tope_h else '',
        aviso=True)

    # §2.2c — A IGUALDAD DE SENTIDO, GANA EL GANCHO MAS CORTO (Iker, 2026-08-17).
    # "Siempre en la vida es mejor corto y bueno que largo y bueno, sobre todo
    # alargarlo no aporta nada extra y es repetir informacion o redundante".
    # NO puede ser fallo duro: un script no sabe que palabra carga un matiz y
    # cual es relleno. Lo unico que puede hacer es obligar a correr el tachon,
    # que es donde esta el trabajo. Caso: entregue el gancho de la historia del
    # 18/08 con "del barrio" cuando la linea 2 ya decia "mi calle" — 73 car que
    # eran 62 sin perder nada.
    # ⛔ 2.3d + 2.2c — LA TIJERA NO TOCA EL INTENSIFICADOR (Iker, 2026-08-27).
    # El aviso de aqui abajo empuja a acortar, y la palabra mas barata de quitar
    # es SIEMPRE el intensificador, que es justo la que hace el trabajo. Paso el
    # 27/08: para meter "en persona" en el gancho de Helena sin alargarlo, quite
    # "a ninguno". Iker: "a ninguno era necesario, y sobre todo era un
    # intensificador". El gancho perdio la emocion y gano un carcter. Este aviso
    # va DELANTE del de la tijera a proposito: primero se mira que el
    # intensificador esta, y solo despues se recorta lo que sobra.
    # ⚠️ En PELOTEO el intensificador ES la frase-rabia (§2.3d, fila RABIA: "el
    # remate de menosprecio"), asi que la familia entera de FRASE_RABIA cuenta
    # como intensificador. Sin esto, cada peloteo con una frase-rabia NUEVA
    # disparaba este aviso en falso y empujaba a apilar un segundo
    # intensificador, que es justo lo que §2.3d prohibe ("no se apilan dos").
    # 01/10: `nadie` dentro. Es la misma negacion absoluta que `ninguno` y `nunca`
    # (§2.9-SIN-VERBO) y el gancho de Angela ("para que nadie tenga que explicarlas")
    # salia sin intensificador en falso.
    _INTENS = (r'\bningun[oa]?\b|\bni un[oa]?\b|\bnunca\b|\bjam[aá]s\b|\bnadie\b|\bs[oó]lo\b|\bsolo\b'
               r'|en la vida|ni de broma|y poco m[aá]s|y para de contar|y a otra cosa'
               r'|lo [uú]ltimo que|en la vida habr[ií]a|todav[ií]a no|ya ha empezado'
               r'|sin tocar|en una tarde|' + FRASE_RABIA)
    _int = re.search(_INTENS, hook_txt, re.I)
    # ⛔ 2.0-PAGO (Iker, 2026-09-30): el bucle que abre el gancho se CIERRA,
    # explicito, en el ultimo tercio (como el reveal de region del peloteo).
    # Es criterio: el script solo obliga a mirarlo.
    # ⛔ EL GANCHO NO CUENTA LA RESPUESTA (global §2.0, mecanizado el 15/10). La regla del
    # bucle abierto vivia solo como el aviso fijo de abajo, que sale siempre y no mira el
    # texto, asi que el 15/10 dio 69/69 a 'Vende IA y nos confeso QUE le pidio a su jefe
    # licencias de otra empresa'. La parte medible: verbo de decir + 'que' + contenido
    # cuenta lo que se dijo; el mismo verbo + 'lo que / que / como / donde / si' deja la
    # pregunta abierta. Probado: caza los 3 ganchos tumbados ese dia y no casa con ninguno
    # de nuestros 314 ganchos publicados.
    _revela = re.search(r'\b(confes[oó]|confesaron|cont[oó]|contaron|dijo|dijeron|solt[oó]|soltaron'
                        r'|explic[oó]|reconoci[oó]|admiti[oó]|revel[oó]|asegur[oó]|descubr[ií]\w*|jur[oó])\s+que\b',
                        hook_txt, re.I)
    chk(not _revela, 'Bucle abierto: el gancho no CUENTA la respuesta (global §2.0)',
        f'"{_revela.group(0)}…" cuenta lo que se dijo y ya no queda nada por lo que pulsar. '
        f'Deja la pregunta: "nos confeso LO QUE…", "QUE le pidio…", "COMO busca…"' if _revela else '')
    # 2026-10-22 (Mario, San Francisco de Unai): "Nos vamos a San Francisco a presentar una
    # startup vasca ante sus inversores" paso el check de arriba y no deja NADA abierto: dice
    # adonde, que y ante quien. Si el gancho no lleva ningun hueco (algo, lo que, como, por
    # que, a ver si, nunca, tanto…), lo mas probable es que este cerrado. Aviso: un gancho
    # puede abrir el bucle con una metafora sin ninguna de estas palabras.
    _hueco = re.search(r'\b(algo|lo que|lo [uú]nico|una cosa|qu[eé]|c[oó]mo|por qu[eé]|qui[eé]n\w*|cu[aá]l\w*'
                       r'|si|nunca|jam[aá]s|tanto|tant[oa]s|nadie|ning[uú]n\w*|ni|menos)\b', hook_txt.lower())
    chk(bool(_hueco), 'GANCHO: deja un HUECO, algo que no dice (global §2.0)',
        'no encuentro nada que el gancho se calle (algo, lo que, como, por que, a ver si, nunca…). '
        'Caso 22/10: "Nos vamos a San Francisco a presentar una startup vasca ante sus inversores" '
        'dice adonde, que y ante quien, y no deja motivo para pulsar "ver mas". Salida: callarse UNA '
        'pieza ("a contarles a sus inversores lo que no se ve desde alli") y pagarla en el ultimo tercio'
        if not _hueco else '', aviso=True)
    chk(False, 'ENTREGA: el cuerpo PAGA el bucle del gancho (§2.0-PAGO)',
        'gancho: "%s". Senala la linea del ultimo tercio que dice con todas las letras '
        'a que se referia (que era, donde, por que importaba), repitiendo la PALABRA del gancho '
        'como el "Si, hablo de X" del peloteo, o DESINFLANDOLA a proposito si el gancho exagera un '
        'hecho real ("invadio" -> "nos visitaron", global §2.0-PAGO). Si el lector acaba sin '
        'saberlo, falta el pago' % hook_txt[:90], aviso=True)
    # brand-voice §3 y global §2.9-TECHOS: el slang teen esta vetado por escrito desde agosto
    # y ningun check lo miraba (auditoria del 28/10). Lector de 45-60.
    _teen = re.search(r'\b(random|cringe|pov|modo bestia)\b', cuerpo.lower())
    chk(not _teen, 'Sin slang teen: random, cringe, POV, modo bestia (brand-voice §3, global §2.9-TECHOS)',
        f'"{_teen.group(0)}": nuestro lector tiene 45-60 y lo aleja' if _teen else '')
    # brand-voice §1b: en Unai el intensificador es el adverbio formal (jamas, nunca), nunca
    # la expresion de calle. Escrito el 21/08 y sin check hasta la auditoria del 28/10.
    if (cuenta or '').strip().lower() == 'unai':
        _calle = re.search(r'\b(ni de broma|flipa\w*|de locos|se queda tieso)\b', cuerpo.lower())
        chk(not _calle, 'UNAI: intensificador formal, nunca de calle (brand-voice §1b)',
            f'"{_calle.group(0)}": en Unai, jamas / nunca / en la vida' if _calle else '')
    # global §4.4b-AUTOGOL, el gancho (Iker, 2026-10-22): "Vamos a cruzar medio mundo a
    # ver si alli tambien se vende a pico y pala" se leyo como que NOSOTROS vendemos a
    # pico y pala. Gancho en 1a del plural + un impersonal de venta o un "tambien" pega el
    # dolor a la casa aunque no lo diga. Aviso: a quien se pega es criterio.
    _nos_hook = re.search(r'(^|\s)(nos|nosotros|vamos|somos|\w{2,}amos)\b', hook_txt.lower())
    _pega = re.search(r'\btambi[eé]n\b|\bse (vende\w*|busca\w*|prospecta\w*|llama\w*|cierra\w*)\b', hook_txt.lower())
    chk(not (_nos_hook and _pega), 'GANCHO: el dolor no se nos pega (global §4.4b-AUTOGOL)',
        'el gancho va en NOSOTROS y lleva "%s": ¿se puede leer que el dolor es nuestro? Caso 22/10: '
        '"Vamos a cruzar medio mundo a ver si alli tambien se vende a pico y pala" se leyo como que '
        'vendemos a pico y pala. El que sufre el dolor se nombra y es otro: "a ver si los comerciales '
        'de alli buscan clientes a pico y pala"' % _pega.group(0) if (_nos_hook and _pega) else '',
        aviso=True)
    # brand-voice §2c familia 3 (DELITO): en el GANCHO cero familias de riesgo.
    # Caso 30/09 (historia de Iker): "Nos entraron a robar..." + 10 etiquetas en
    # la foto -> 44 imp a los 30 min, nunca en el feed. NO esta probado que fuera
    # la palabra (va confundida con las etiquetas), por eso es AVISO: precaucion
    # barata, no veto. Lo que se evita es AFIRMAR un delito, sufrido o cometido.
    _delito = re.findall(r'\b(rob\w*|ladr[oó]n\w*|atrac\w+|asalt\w+|allan\w+|estaf\w+|denunci\w+|destap\w+|hurt[oa]\w*)\b', hook_txt, re.I)
    chk(not _delito, 'Gancho sin vocabulario de DELITO (brand-voice §2c familia 3)',
        'lleva "%s". En el gancho, cero familias de riesgo. Caso 30/09: "Nos entraron a robar" '
        'no salio en el feed (sin probar si por la palabra). Salida que repartio ese dia: contar '
        'el hecho sin afirmar el delito ("Nos entraron en casa") y dejar el resto al cuerpo' % ', '.join(_delito) if _delito else '',
        aviso=True)
    chk(False, 'ENTREGA: ¿el gancho tiene INTENSIFICADOR, y sigue ahi? (§2.3d)',
        ('intensificador: "%s" - NO se recorta para acortar, aunque sea la palabra mas '
         'barata de quitar' % _int.group(0) if _int else
         'no encuentro ninguna marca de intensificador en el gancho. Todo gancho lleva el de '
         'SU emocion: rabia -> "y poco mas"; curiosidad -> "lo ultimo que me esperaba"; miedo '
         '-> "y ya ha empezado"; deseo -> "sin tocar una tecla". Sin el, el gancho enuncia y '
         'no aprieta') , aviso=True)
    chk(False, 'ENTREGA: ¿este gancho se puede decir mas corto? (§2.2c)',
        f'{len(hook_txt)} car (la mediana de nuestros ganadores de 1 oracion son 75). '
        'Tacha una palabra y relee: si la frase sigue diciendo LO MISMO, sobraba y no '
        'vuelve. Repite hasta que el siguiente tachon se lleve un matiz de verdad. '
        'Sospechosos habituales: el complemento de sitio que el cuerpo ya situa, el '
        'adjetivo de sector que encoge alcance, y la aclaracion de lo que ya se '
        'entiende. ⚠️ Pero corto no es mutilado: no se recorta el OBJETO que pinta la '
        'imagen ni el matiz que sostiene el concepto', aviso=True)

    # §2.2d-DOBLE — objetos con lectura fisica Y digital. Si el objeto tiene dos
    # lecturas, gana la de pantalla porque es la que el lector usa a diario, y ahi
    # se pierde de golpe la imagen mental y la nostalgia.
    _DOBLE_LECTURA = ('buzon', 'buzones', 'carpeta', 'carpetas', 'archivo', 'archivos',
                      'ventana', 'ventanas', 'nube', 'muro', 'perfil', 'agenda',
                      'carrito', 'libreta', 'tablon')
    _hn = normalizar_entidad(hook_txt)
    _dobles = [w for w in _DOBLE_LECTURA if re.search(r'\b%s\b' % w, _hn)]

    # §2.2d — EL TEST DE LA CREADORA DE VIDEOS (Iker, 2026-08-17). §2.2 punto 1 ya
    # pedia "pintar una imagen", pero era yo juzgandome a mi mismo. Esto pone un
    # juez externo que no puede hacer trampa: una camara no puede grabar un
    # concepto. Si no hay plano, o falta el OBJETO (§2.0a) o falta el VERBO (§2.9).
    chk(False, 'ENTREGA: el test de la creadora de videos (§2.2d)',
        'Dale el gancho a alguien que hace videos: ¿sabe QUE grabar en el primer '
        'segundo? Tiene que haber un sujeto HACIENDO algo con un OBJETO. Si no se le '
        'ocurre ningun plano, el gancho no es lo bastante bueno y se descarta, por '
        'bien escrito que este. ⛔ "tu forma de vender ya no funciona" no se rueda; '
        '"me planto el portatil delante" y "le tire las llaves a Claude" se ruedan '
        'solos' + (_dobles and
        ' · ⛔⛔ Y OJO: el gancho lleva ' + ', '.join(f'"{w}"' for w in _dobles) +
        ', que tiene DOS lecturas (fisica y de pantalla) y el lector coge la de '
        'pantalla, que es la que usa a diario. La camara no sabe que grabar. '
        'Cambiala por una que solo exista en el mundo fisico, o aterrizala con una '
        'palabra al lado que no deje duda ("el buzon del portal") y mide si te sale a '
        'cuenta el coste en caracteres (§2.2c). Caso real: "saltandome la mitad de los '
        'buzones" se leyo como el del correo electronico y paso a "a medio barrio"'
        or ''), aviso=True)

    # §2.3b-ESCENARIO — EL DECORADO DEL GANCHO TAMBIEN ESTRECHA (Iker, 2026-08-26).
    # §2.3b vigilaba el ADJETIVO de sector ("50 empresas INDUSTRIALES") y la JERGA
    # (pipeline, SDR, B2B). Faltaba la tercera via: el SUSTANTIVO DE ESCENARIO, el
    # sitio donde pasa la escena. Caso del 26/08 (historia de Unai): "vendi
    # calendarios por los POLIGONOS de Euskadi" dejaba fuera al que no se imagina
    # vendiendo en un poligono y no ganaba nada, porque la escena del poligono se
    # cuenta igual tres lineas despues. Quedo en "por Euskadi": 17 caracteres menos
    # y el doble de gente que se ve dentro. Es la misma mecanica del mapa: el
    # cliche GENERICO va en el gancho y los especificos se desarrollan en el cuerpo.
    # ⚠️ AVISO y no fallo duro: hay ganchos donde el escenario ES el concepto y
    # quitarlo mata el post. El script solo obliga a MIRARLO.
    _esc = sorted({w for w in re.findall(
        r'\b(pol[ií]gonos?|naves?|f[aá]bricas?|talleres?|taller|almacenes?|almac[eé]n'
        r'|plantas?|obra|astilleros?|fundici[oó]n|cadena de montaje|comit[eé]s?'
        r'|centralitas?|showrooms?|feria de \w+)\b', hook_txt, re.I)})
    if _esc:
        chk(False, 'ENTREGA: ¿el gancho lleva un ESCENARIO que estrecha? (§2.3b-ESCENARIO)',
            'el gancho dice ' + ', '.join(f'"{w}"' for w in _esc) + '. Pregunta sobre CADA '
            'sustantivo, no solo sobre los adjetivos: ¿esto deja fuera a alguien sin ganar '
            'nada? Si el cuerpo ya cuenta ese sitio tres lineas despues, la respuesta es SI '
            'y sale del gancho. El cliche GENERICO arriba, el especifico en el cuerpo, igual '
            'que el mapa dice "toro, txistorra y poco mas" en el gancho y "Landaben" en el '
            'cuerpo. ⛔ Lo que NO se toca al recortar es el verbo de ventas: se va el '
            'decorado, nunca el ancla', aviso=True)

    # global §2.0c — EL GANCHO NO DICE LO QUE LA FOTO YA ENSEÑA (Mario, 2026-08-21).
    # La regla existia desde el 31/07 y aun asi la rompi: entregue "me pillo con la
    # placa de 100.000 seguidores en la mano" para un post cuya FOTO era esa misma
    # placa. Mario: "ya se va a ver en la foto que voy a poner, y como siempre te
    # digo, no solo si la foto tiene texto, sino si visualmente la foto dice lo
    # mismo, hay que cambiar el gancho o la foto". El script no ve la imagen, asi
    # que esto solo puede ser un aviso de entrega — pero el aviso es justo lo que
    # faltaba, porque el fallo se comete al elegir el gancho, no al escribirlo.
    chk(False, 'ENTREGA: ¿el gancho cuenta lo que ENSEÑA la foto? (§2.0c)',
        'Tapa el gancho y mira la imagen; luego tapa la imagen y lee el gancho. Si los '
        'dos dicen lo MISMO, has gastado el remate antes de tenerlo: el gancho promete y '
        'la imagen paga. Y no vale solo mirar si la foto lleva TEXTO repetido — cuenta '
        'igual lo que la foto enseña sin una sola palabra. Se cambia uno de los dos, y '
        'normalmente sale mas barato cambiar el gancho. Caso real (21/08, Mario): gancho '
        'con la placa de YouTube dentro y foto de esa misma placa', aviso=True)

    # ⛔ Y EL OTRO FILTRO DEL MISMO DIA: EL GANCHO NO PRESUME (Mario, 2026-08-21).
    # "Has elegido de todas las iteraciones posibles el gancho que mas prepotente
    # puedo quedar". Es global y no es de la cuenta de Mario: cualquiera puede
    # colar su propia cifra buena en la primera linea. Y choca de frente con
    # brand-voice §1 (la autoridad se DEMUESTRA, nunca se anuncia) y con
    # outliers-database §3.7 (los outliers usan un 25% MENOS lenguaje de
    # autoridad/prueba que los posts normales). La credencial va en el cuerpo si
    # hace falta, o en la foto, que no presume porque no lo dice: lo enseña.
    # ⚠️ EXCEPCION UNAI (Iker, 2026-09-30): "a este jefe le encanta no ir de
    # humilde". En su cuenta el aviso NO pide la version humilde (eso le jugaba a
    # la contra): pide que lo grande sea VERDAD, sobrio y sin compararse
    # (brand-voice §1b, UNAI QUIERE EL GANCHO GRANDIOSO).
    # 🔄 ASIER TAMBIEN (Iker, 2026-10-15): "el tono del tercer jefe tiene que parecerse
    # bastante al del primero... siendo jefes, publicamente no quieren dar a entender
    # cosas como nunca habia pensado, nunca habia rezado". Grandioso, sin humildad y sin
    # prepotencia, en Unai y en Asier. La lente del inversor sigue siendo solo de Unai.
    _cta_grande = (cuenta or '').strip().lower()
    if _cta_grande in ('unai', 'asier'):
        chk(False, f'ENTREGA: el gancho de {_cta_grande.upper()} va A LO GRANDE (brand-voice §1b)',
            'En Unai NO se busca la version humilde: se busca la version GRANDE de la misma '
            'escena verdadera ("La nueva forma de vender que presentamos no cupo en una sala"). '
            'Comprueba tres cosas: (1) el hecho es CIERTO, nada de "la mayor" ni cifras '
            'infladas; (2) la VOZ sin jerga de creador (de locos, flipa), sin ULTIMA HORA y sin '
            'revolucionar/transformar; romper/reventar SI valen sobre un objeto concreto (la '
            'sala), "no cupo" se le queda formal (30/09); (3) no se compara con '
            'nadie (mejor que nadie, los demas). Solo en Unai y Asier (15/10): el resto de '
            'cuentas sigue con la version humilde de global §2.0c-PRESUMIR', aviso=True)
        # 👑 UNAI NUNCA SE HACE DE MENOS (Iker, 2026-10-08): "jamas pense" no lo va a
        # decir nunca, y el "nunca pense que iba a presentar delante de 100 personas"
        # no le gusto. Cae jamas/nunca + pensar/imaginar/creer referido a si mismo;
        # el jamas de un HECHO ("no me deja una propuesta en visto. Jamas") sigue.
        # Ampliado el 15/10 con Asier: "nunca habia rezado tanto", "nunca habia pensado".
        _incredulo = (re.search(r'\b(jam[aá]s|nunca)\s+(me\s+)?(hab[ií]a\s+|hubiera\s+|habr[ií]a\s+)?(pens|imagin|cre[ií]|rez|so[ñn]|esper)\w*', hook_txt, re.I)
                      or re.search(r'\b(jam[aá]s|nunca)\s+(me\s+)?(hubiera|habr[ií]a)\b', hook_txt, re.I))
        chk(not _incredulo, f'{_cta_grande.upper()}: el gancho no se hace de menos, sin "jamas pense" ni "nunca habia rezado" (brand-voice §1b)',
            (f'"{_incredulo.group(0)}": es la psicologia de sorprenderse de haber llegado, y a Unai '
             'no le gusta. Cuenta el hecho grande en firme ("Defendi ante mas de 100 personas que...")')
            if _incredulo else '')
    # 🥇 EL GRAN DIA, NO UN GRAN DIA (2026-10-30): con el indefinido el momento es uno de
    # tantos; con el definido es EL momento, y eso es lo grandioso. Fallo en las cuentas
    # que van a lo grande (Unai y Asier), aviso en el resto. Solo con nombres de momento:
    # "un gran comercial" habla de un tipo de persona y ahi el indefinido es el correcto.
    # Y solo cuando el gancho habla de ESTA ocasion (hoy, es, fue, ha sido…): "Un gran dia de
    # ventas empieza a las 7" es una frase general y ahi el indefinido tambien es el correcto.
    # Medido el 30/10: 0 ganchos con "un/el gran + momento" en los 334 nuestros y en los 500
    # outliers de la competencia, asi que no tumba a ningun ganador; es criterio, no dato.
    _un_gran = re.search(r'\b(hoy|es|fue|ha\s+sido|ser[aá]|era|vivimos|tenemos|tuvimos)\b[^.!?\n]{0,25}?'
                         r'\bun(?:as?)?\s+gran(?:des)?\s+(d[ií]as?|momentos?|pasos?|anuncios?|noticias?'
                         r'|semanas?|mes|a[ñn]os?|cambios?|hitos?|noches?|ma[ñn]anas?)\b', hook_txt, re.I)
    chk(not _un_gran, 'GANCHO: "el gran dia", no "un gran dia" (brand-voice §1b, 30/10)',
        (f'"{_un_gran.group(0)}" suena a un dia cualquiera. Con el articulo definido es EL dia: '
         f'"Hoy es el gran dia"') if _un_gran else '',
        aviso=(cuenta or '').strip().lower() not in ('unai', 'asier'))
    if _cta_grande in ('unai', 'asier'):
        # 🔭 LA LENTE DEL INVERSOR (Unai via Iker, 2026-10-07): su cuenta la leen
        # tambien inversores, que miran como habla de sus clientes, como cuenta un
        # error y si usa LinkedIn para mandar el mismo mensaje a veinte. Desempate,
        # no filtro: es aviso y no suspende.
        if _cta_grande == 'unai':
          chk(False, 'ENTREGA: lente del inversor (brand-voice §1b)',
            'Prueba de 5 segundos: un inversor que no conoce a Unai lee SOLO este post. '
            'Si piensa "sabe de lo que habla y trata bien a sus clientes", vale. Si piensa '
            '"se rie de sus clientes" o "este manda spam" (prospeccion masiva, de plantilla, '
            'el mismo mensaje a muchos), se cambia LA FRASE que lo provoca, no el post. '
            'Entre dos versiones igual de fuertes, gana la que deja rastro de criterio '
            '(una opinion o un matiz del mercado). No quita punch: el gancho sigue grande', aviso=True)
        # 🗂️ BANCO DE 5 GANCHOS (Iker, 2026-10-08 en Unai; 2026-10-20 tambien en Asier):
        # en HISTORIA/EVENTO de los dos jefes sobrios va el gancho elegido y debajo 5
        # alternativos de la MISMA creencia, en un solo bloque. En historia normal, no.
        if HISTORIA_EVENTO:
          chk(False, f'ENTREGA: HISTORIA/EVENTO de {_cta_grande.upper()} lleva BANCO DE 5 GANCHOS (brand-voice §1b)',
            'El elegido primero y 5 alternativos debajo, en UN solo bloque copiable separados por '
            'una linea en blanco. Los 5 grandiosos, la MISMA creencia que paga el cuerpo con 5 '
            'entradas distintas (la pregunta, quien lo dice, la incomodidad, el plazo, el objeto), '
            'ninguno delata el evento, y cada uno validado con el cuerpo entero. Di cuales obligan '
            'a tocar el ninja (la palabra del gancho que recoge)', aviso=True)
    else:
        chk(False, 'ENTREGA: ¿el gancho PRESUME? (brand-voice §1)',
        'Si la primera linea lleva un logro tuyo, una cifra tuya buena o un premio, el '
        'lector lee "mirame" y no "sigue leyendo". La autoridad se demuestra con el '
        'contenido, nunca se anuncia, y esta medido: los outliers usan un 25% MENOS '
        'lenguaje de autoridad que los posts normales (outliers-database §3.7). Busca la '
        'version HUMILDE de la misma escena, que casi siempre es mas visual y mas '
        'universal. Caso real (21/08): "me pillo con la placa de 100.000 seguidores en la '
        'mano" paso a "me pillo con el tripode montado en el salon" — misma escena, mismo '
        'verbo, 11 caracteres menos y sin presumir', aviso=True)

    # ⛔ NEETY ES MASCULINO (Iker, 2026-10-16): "creo que lo dicen en masculino, es el
    # nuevo Neety, ya que hablamos de software". Se me colo "La nueva @Neety la presente".
    _neety_fem = re.search(r'\b(la|una|esta|esa|nuestra|su)\s+(nueva\s+|primera\s+)?@?neety\b(?!\s+forward)', texto, re.I)
    chk(not _neety_fem, 'NEETY va en masculino: el nuevo Neety (aboutme §1)',
        f'"{_neety_fem.group(0)}": Neety es el producto, en masculino ("el nuevo @Neety lo presenté")'
        if _neety_fem else '')

    # 🇪🇸 TIEMPOS VERBALES DE ESPAÑA (Iker, 2026-10-16, brand-voice §3d). La experiencia
    # que llega hasta hoy va en preterito PERFECTO ("lo he comprobado", "nunca he visto",
    # "llevo años programando"); el indefinido ("comprobe", "vi") es para una escena
    # concreta y cerrada. "Lo comprobe en años programando" y "Nunca vi a un comercial
    # vender mas…" (una experiencia de toda la vida, sin escena) suenan a traduccion y
    # Iker lo relaciona con que nos lean "roboticos". Aviso: el script no sabe si hay escena.
    _L = 'a-záéíóúñü'
    _ind_años = re.search(rf'(?<![{_L}])[{_L}]{{2,}}(?:é|ó)(?![{_L}])[^.\n]*\b(en|durante|estos|todos estos|los) años\b', texto, re.I)
    _nunca_ind = re.match(r'\s*(nunca|jam[aá]s)\s+(le\s+|la\s+|lo\s+|me\s+|te\s+)?(vi|o[ií]|tuve|hice|pens[eé]|dije)\b', hook_txt, re.I)
    chk(not (_ind_años or _nunca_ind), 'ESPAÑOL DE ESPAÑA: la experiencia hasta hoy va en "he visto", no en "vi" (brand-voice §3d)',
        ((f'"{_ind_años.group(0)[:60]}": con "años" la experiencia llega hasta hoy, y en España va en '
          '"lo he comprobado" o "llevo años…". ' if _ind_años else '') +
         (f'"{_nunca_ind.group(0).strip()}": ¿es UNA escena concreta (el taxi, aquella feria)? Entonces vale. '
          'Si es una experiencia de toda la vida, "Nunca he visto…"' if _nunca_ind else ''))
        if (_ind_años or _nunca_ind) else '', aviso=True)

    # ⛔ "NO VENDE" NO ES "NUNCA HA VENDIDO" (Iker, 2026-10-15): "llevan con la empresa
    # tres o cuatro anos, ¿como vamos a decir que nunca han vendido nada?". Asier no es
    # comercial, pero decir que no ha vendido nunca es mentira y le hace de menos.
    if (cuenta or '').strip().lower() == 'asier':
        _nunca_vendio = re.search(r'\b(nunca|jam[aá]s)\s+(he|hab[ií]a|habr[eé]|he\s+llegado\s+a)?\s*vend\w*', texto, re.I)
        chk(not _nunca_vendio, 'ASIER: no se dice que nunca ha vendido (aboutme §2-ASIER)',
            (f'"{_nunca_vendio.group(0)}": es socio de una empresa que vende desde hace anos. '
             'Que no sea comercial no significa que no haya vendido nunca') if _nunca_vendio else '')

    # 🧑‍💻 ASIER NO VENDE (Iker, 2026-10-08, aboutme §2-ASIER-MEME y post-workflow
    # §4.4-ROL). Es programador: no llama, no prospecta, no tiene cartera ni cuota ni
    # jefe de ventas. Sus memes con ese rol fallaron: "Mi historial de Google canta mas
    # que mis ventas" (3.751) y "Mi jefe de ventas me mando..." (lo borro el). Sus tres
    # mejores van en 3a persona impersonal. Gancho: fallo duro. Cuerpo: aviso, porque
    # una historia suya puede decir "llame a Unai" sin vender nada, y las citas
    # (entre comillas) son la voz de otro.
    if (cuenta or '').strip().lower() == 'asier':
        _ROL_1P = (r'\b(vendo|vend[ií]|vendemos|llamo|llam[eé]|prospecto|prospect[eé]|'
                   r'mis ventas|mi cuota|mi cartera|mis clientes|mi cliente|mi jefe de ventas|'
                   r'mi director comercial|mi comisi[oó]n|mis comisiones|mi pipeline|mi forecast|'
                   r'mis visitas|mi zona de ventas|mis pedidos)\b')
        _rol_h = re.search(_ROL_1P, hook_txt, re.I)
        chk(not _rol_h, 'ASIER: el gancho no le pone un rol COMERCIAL que no tiene (aboutme §2-ASIER-MEME)',
            (f'"{_rol_h.group(0)}": Asier programa, no vende. El gancho va en 3a persona '
             '("En ventas, el pedido encoge..."), en vocativo a los comerciales ("Comerciales, '
             '¿a cuantos...?") o en su papel real (el que programa para el comercial, el socio '
             'que paga)') if _rol_h else '')
        _rol_c = [l.strip() for l in cuerpo.split('\n')[1:]
                  if l.strip() and '"' not in l and '«' not in l and re.search(_ROL_1P, l, re.I)]
        chk(not _rol_c, 'ASIER: el cuerpo no le cuelga un rol comercial en 1a persona (aboutme §2-ASIER-MEME)',
            ('; '.join(_rol_c[:3]) + ' -> si es Asier hablando de si mismo, su yo es el del '
             'ingeniero ("Programo para comerciales"); el comercial y el cliente, en 3a')
            if _rol_c else '', aviso=True)
        # 🔄 22/10 (Iker pidio confirmarlo con datos): tampoco el CUERPO habla de programar.
        # BD, posts sin peloteo desde el 15/07: historias de las 3 cuentas con programar/codigo
        # en el cuerpo, mediana 3.715 imp y 6 clics (n=10), sin ello 6.639 y 20 (n=19); en
        # Asier 1.196 contra 2.591. Confundido con gancho, evento y fecha: aviso, no fallo.
        _ing = re.findall(r'\b(program\w*|c[oó]digo|repositorio|arquitectura|funcionalidad\w*|software)\b',
                          re.sub(r'https?://\S+', '', '\n'.join(cuerpo.split('\n')[1:])), re.I)
        chk(not _ing, 'ASIER: el cuerpo no habla de programar ni de codigo (aboutme §2-ASIER-MEME, 22/10)',
            ('lleva: %s. Las historias con ese vocabulario en el cuerpo hacen la mitad de impresiones '
             'y un tercio de clics; su papel se cuenta sin el oficio (visita, socio, estar delante)'
             % ', '.join(sorted(set(w.lower() for w in _ing)))) if _ing else '', aviso=True)

    # brand-voice §3b — LA CITA SE PUNTUA COMO LA ESCRIBIO QUIEN LA DIJO. La coma
    # del vocativo ("Hola, soy Iker") es CORRECTA en español y por eso se cuela:
    # dentro de una cita la vara no es la gramatica, es la verosimilitud. Un crio
    # de 15 escribiendo a mano no pone esa coma, y una cita perfectamente puntuada
    # delata que la ha escrito quien narra y no quien habla (Iker, 2026-08-17:
    # "parece escrito por inteligencia artificial, dudo que un niño lo sepa
    # escribir tambien"). Aviso y no fallo: fuera de una cita la coma esta bien.
    _voc = re.search(r'(?im)^\s*"?(hola|buenas|buenos d[ií]as|buenas tardes|oye|perdona|perdone)\s*,',
                     cuerpo)
    chk(not _voc, 'Sin coma de vocativo dentro de una cita (brand-voice §3b)',
        f'"{_voc.group(0).strip()}" — si eso lo dice un personaje, quitale la coma: es '
        'correcta en español y justo por eso suena a IA. Dentro de una cita manda la '
        'VEROSIMILITUD, no la gramatica. Y comprueba de paso que la cita va entre '
        'comillas rectas, abriendo en la primera linea y cerrando en la ultima'
        if _voc else '', aviso=True)

    nums = re.findall(r'\d+(?:[.,]\d+)?', hook_txt)
    chk(len(nums) <= 1, 'Hook con ≤1 cifra (§2.5)', f'{len(nums)} cifras: {nums}' if len(nums) > 1 else '')
    # global §9.3b / brand-voice §2c familia 8 (Iker, 2026-09-29): `LinkedIn`
    # escrito en el post lo capa. Confirmado con resubida de UN cambio: con la
    # palabra, 45 imp en 33 min y nunca en el feed; con `el movil`, en el feed en
    # menos de 1 minuto (y `telefono` iba en las dos). No se sabe si capa solo en el
    # gancho, asi que se mira TODO el texto. Las URLs se quitan antes: el
    # utm_source=linkedin lo lleva todo post que ha repartido. --historico lo salta.
    if not historico:
        _sin_url = re.sub(r'https?://\S+', ' ', cuerpo)
        # variantes: Linkedin, Linked In, linkedín, #linkedin, y la sigla LI (solo
        # en mayusculas y como palabra suelta, para no cazar "li" dentro de nada)
        _li = re.findall(r'[^\n]*linked\s*[ií]n[^\n]*', _sin_url, re.I)
        _li += re.findall(r'[^\n]*\bLI\b[^\n]*', _sin_url)
        chk(not _li, 'Sin "LinkedIn" escrito en el post: CAPA (§9.3b)',
            'lineas: %s. El recambio PROBADO es el objeto: el movil (el feed, esta red o '
            'aqui no estan probados y pueden caer igual). El 29/09 un post con la palabra '
            'no salio nunca en el feed y la resubida sin ella salio en menos de 1 minuto'
            % [l.strip()[:50] for l in _li] if _li else '')
        # §9.3d: `automatizar` (Unai 08/10). Con la palabra, mas de 40 min sin salir en
        # relevantes; resubida con UN cambio (`lanzar mas mensajes`), en relevantes a los
        # 28 min. n=1: AVISO, no fallo, hasta un segundo caso. Recambio probado: lanzar.
        _aut = re.findall(r'[^\n]*automati[sz]\w*[^\n]*', _sin_url, re.I)
        chk(not _aut, 'Sin "automatizar" (capado probable, §9.3d)',
            ('lineas: %s. El 08/10 un post con la palabra no salio en 40 min y la '
             'resubida sin ella (lanzar mas mensajes) salio a los 28. n=1: con un segundo '
             'caso pasa a fallo duro' % [l.strip()[:50] for l in _aut]) if _aut else '', aviso=True)
        # 🗺️ global §9.6: las VECINAS de los capados, por psicologia (aviso).
        _rc = riesgo_capado(cuerpo)
        _rc_hook = riesgo_capado(hook_txt)
        chk(not _rc, 'Sin palabras VECINAS de un capado, por psicologia (§9.6)',
            ' · '.join('%s%s: %s (%s)' % ('EN EL GANCHO · ' if any(f == r[0] for r in _rc_hook) else '',
                                         f, l, p) for f, p, l in _rc) +
            ('' if not _rc else ' -> si la palabra no es el nucleo de la escena, se cambia por una '
             'de otra familia. Y NUNCA se propone una vecina como recambio de una capada'),
            aviso=True)
        # §9.3b: `algoritmo` PROBADA el 29/09 (meme de Mario, en el gancho, en
        # "Primero los mas relevantes" de otra cuenta al minuto 3). Se queda de AVISO
        # porque Mario lo pidio (29/09): "en el futuro ponme avisos de cuidado", y
        # porque un precedente caduca (§9.2): LinkedIn cambia el filtro sin avisar.
        _alg = re.search(r'algoritmo', hook_txt, re.I)
        chk(not _alg, 'Gancho con "algoritmo": vigila el feed (§9.3b)',
            'probada 29/09 (Mario, en el feed al minuto 3), pero habla de la plataforma, que es '
            'la familia de LinkedIn. Mira "Primero los mas relevantes" desde otra cuenta en los '
            'primeros minutos y no la borres antes del 30' if _alg else '', aviso=True)
    if generico:
        # Los hooks de Martín Arosa y Guillermo Flor son CORTOS y SIN cifras
        # (`§4.5.0b`). Iker NUNCA quiere cifras en el hook y los suyos son de pocas
        # palabras; las cifras (60%, 100.000€) van al CUERPO.
        chk(len(nums) == 0, 'GENÉRICO: hook SIN cifras (Martín Arosa/Guillermo, §4.5.0b)',
            f'{len(nums)} cifra(s) {nums} — al hook no; van al cuerpo' if nums else '')
        chk(len(hook_txt) <= 90, 'GENÉRICO: hook CORTO ≤90 car (§4.5.0b)',
            f'{len(hook_txt)} car — los suyos son de pocas palabras, corta' if len(hook_txt) > 90 else '')
    m = re.search(MULETILLA_ANCLA, hook_txt, re.I)
    chk(not m, 'Hook sin la muletilla "En ventas," de prefijo (§2.3)',
        'ancla legítima pero es tu reflejo: 1 de 11 ganadores empieza así. Ancla por el ROL '
        '("la vida del comercial"), el OFICIO ("el cold calling"), el VERBO ("se vende") o '
        'métela EMBEBIDA ("Subir en ventas pasa factura")' if m else '')
    fuerte = re.search(ANCLA_FUERTE, hook_txt, re.I)
    ambigua = re.search(ANCLA_AMBIGUA, hook_txt, re.I)
    if fuerte:
        detalle = f'ancla FUERTE: "{fuerte.group(0)}"'
    elif ambigua:
        # No se falla: Navarra (7.72x, el molde gold) ancla en "exporta", que es
        # ambigua, y voló. Pero se canta, porque es donde se cuela el post
        # huérfano y el script NO puede correr el test de §2.3 por ti.
        detalle = (f'⚠️ ancla solo AMBIGUA: "{ambigua.group(0)}" — la comparten logística/compras/'
                   f'finanzas. LEE el hook y pregúntate: ¿esto SOLO puede subirlo una cuenta de '
                   f'ventas? Si cuela en otra, añade "ventas"/"comercial" (§2.3)')
    else:
        detalle = 'NINGUNA palabra de ventas en el hook → lo podría subir cualquier cuenta'
    # Mario = cuenta de MARKETING: ancla en marketing, no en ventas. El resto de
    # cuentas (Iker/Unai/Asier) sí anclan a ventas. En el GENÉRICO no se fuerza
    # ancla (los hooks de Martín/Guillermo van de IA/tendencia, §4.5.0b).
    _es_mario = (cuenta or '').strip().lower() == 'mario'
    _es_helena = (cuenta or '').strip().lower() == 'helena'
    _es_angela = (cuenta or '').strip().lower() == 'angela'
    if _es_mario:
        _mk = re.search(MARKETING_ANCLA, hook_txt, re.I)
        chk(bool(_mk), 'Hook anclado a MARKETING (cuenta Mario, aboutme §2)',
            'Mario es la cuenta de marketing/growth: el hook ancla en contenido/redes/marketing, '
            'no en "vender"' if not _mk else f'ancla marketing: "{_mk.group(0)}"')
    elif _es_helena or _es_angela:
        # ⛔ EL CUERPO DE HELENA NO PUEDE SONAR PREPOTENTE (Iker, 2026-08-27).
        # Y el de ANGELA tampoco (01/10): Iker la pide "muy humilde", con el mismo
        # tono que el post de Helena, y tambien la escribe una chica.
        # "Ten en cuenta que el tono de la publicacion esta escrito por una chica,
        # ademas no puede sonar a prepotente tampoco". Es el mismo eje que la
        # EXCEPCION 4 de brand-voice (por lo que Mario paso a hablar en plural) y
        # que 2.0c-PRESUMIR, pero aplicado al CUERPO entero y no solo al gancho.
        # AVISO y no fallo duro: la prepotencia es criterio y una lista cerrada
        # tumbaria lineas buenas. Lo que el script puede hacer es cantar las
        # marcas tipicas y obligar a releer el cuerpo con esa pregunta.
        _chulo = re.findall(r'antes que nadie|mejor que nadie|como nadie|nadie lo hace'
                            r'|me lo s[eé] todo|lo s[eé] todo|siempre acierto|nunca fallo'
                            r'|religiosamente|de memoria mejor|soy la que', cuerpo, re.I)
        chk(False, 'ENTREGA: ¿el CUERPO presume? (cuentas Helena y Angela, brand-voice EXCEPCION 4)',
            ('marcas encontradas: %s. ' % ', '.join(sorted(set(_chulo))) if _chulo else '')
            + 'El cuerpo va en 1ª PLURAL cuando el merito es de la casa, y una linea que '
              'presume de lo bien que lo hacemos se lee como chuleria. La salida es siempre '
              'la misma: la version CONFESION de la misma escena ("lo relleno todo '
              'religiosamente" -> "me lo se de memoria"). Vale igual para saber mas que el '
              'cliente: "vemos su problema antes de que lo cuenten" presume, "conocemos la '
              'hora a la que es mejor no llamarles" es cercania', aviso=True)
        if _es_angela:
            _ds = re.search(DISENO_ANCLA, hook_txt, re.I)
            chk(bool(_ds), 'Hook anclado a DISENO DE PRODUCTO (cuenta Angela, aboutme 2-CARRIL-GANCHO)',
                'Angela disena las pantallas de Neety: el hook ancla en su oficio (pantalla, '
                'diseno, boton, producto) y la vinculacion con ventas baja al CUERPO'
                if not _ds else f'ancla de su oficio: "{_ds.group(0)}" - y la vinculacion con '
                f'VENTAS tiene que estar en el CUERPO (aboutme 2). ⚠️ Regla extendida por '
                f'analogia con Mario y Helena, pendiente del OK de Iker')
            _vt = re.search(ANCLA_VENTAS, cuerpo, re.I)
            chk(bool(_vt), 'El CUERPO lleva la vinculacion con VENTAS (cuenta Angela, aboutme 2)',
                f'ancla de ventas en el cuerpo: "{_vt.group(0)}"' if _vt else
                'ni una palabra de ventas en todo el post: el gancho va de su oficio, pero el '
                'cuerpo o el ninja tienen que atarlo a vender')
        else:
            _cs = re.search(CS_ANCLA, hook_txt, re.I)
            chk(bool(_cs), 'Hook anclado a ATENCION AL CLIENTE (cuenta Helena, aboutme 2-CARRIL-GANCHO)',
                'Helena es la cuenta de customer success y partnerships: el hook ancla en su oficio '
                '(cliente, cuenta, soporte, seguimiento) y la vinculacion con ventas baja al CUERPO'
                if not _cs else f'ancla de su oficio: "{_cs.group(0)}" - y la vinculacion con VENTAS '
                f'tiene que estar en el CUERPO (aboutme 2)')
    elif GANCHO_GENERICO:
        _es_unai = (cuenta or '').strip().lower() == 'unai'
        chk(_es_unai and pilar in ('evento', 'historia'),
            'GANCHO GENERICO: A/B declarado, solo Unai en historia/evento o evento (brand-voice §1b, 30/10)',
            '' if (_es_unai and pilar in ('evento', 'historia')) else
            '--gancho-generico solo vale en la cuenta de Unai y en historia/evento o evento')
        chk(False, 'GANCHO GENERICO: el gancho va sin ancla a proposito (A/B declarado)',
            ((detalle + '. ') if (fuerte or ambigua) else '') +
            'Se declara en la entrega con su brazo de comparacion y se anota en el registro de A/B '
            'del historial el dia que se publica', aviso=True)
        _vt = re.search(ANCLA_VENTAS, cuerpo, re.I)
        chk(bool(_vt), 'GANCHO GENERICO: el CUERPO ata con VENTAS (es la otra mitad del A/B)',
            f'ancla de ventas en el cuerpo: "{_vt.group(0)}"' if _vt else
            'el gancho no ancla y el cuerpo tampoco nombra la venta: el post no le dice a nadie de que va')
    elif ((cuenta or '').strip().lower() == 'unai' and not generico
          and (pilar in ('evento', 'historia') or ANCLA_DIRECCION)):
        # 2026-10-26 (Iker): deja de ser excepcion declarada. En la cuenta de Unai, sobre
        # todo en los posts de EVENTO (y la historia/evento, que se valida como historia), el
        # gancho ancla a ventas O al ecosistema, sin flag. No es "nunca ventas": un gancho
        # de ventas sigue siendo valido; solo deja de ser obligatorio. En el resto de pilares
        # de Unai el ecosistema sigue pidiendo --ancla-direccion. Si va de ecosistema, el
        # cuerpo sin ventas es solo aviso. La variedad del ancla es criterio (brand-voice §1b).
        _dr = re.search(DIRECCION_ANCLA, hook_txt, re.I)
        _ventas = bool(fuerte or ambigua)
        chk(_ventas or bool(_dr), 'Hook anclado a VENTAS o al ECOSISTEMA (cuenta Unai, brand-voice §1b, 26/10)',
            detalle if _ventas else (f'ancla de ecosistema: "{_dr.group(0)}". Varia la palabra del '
            f'ancla y no la repitas en dos ganchos seguidos de Unai' if _dr else
            'ni ventas ni ecosistema (inversores, fondos, fundadores, startups, emprender, ronda, '
            'instituciones...) en el gancho: lo podria subir cualquier cuenta'))
        if _dr and not _ventas:
            _vt = re.search(ANCLA_VENTAS, cuerpo, re.I)
            chk(bool(_vt), 'Gancho de ecosistema: el cuerpo ata con ventas? (Unai, opcional desde 26/10)',
                f'ancla de ventas en el cuerpo: "{_vt.group(0)}"' if _vt else
                'el post no menciona vender en ningun sitio. Vale si el objetivo es la autoridad; '
                'si el post tiene que convertir, va por el carril de ventas. Y no se fuerza un refran de ventas '
                'para atarlo: si no sale natural, va sin ventas (brand-voice §1b, 27/10)', aviso=True)
    elif ANCLA_DIRECCION:
        _es_unai = (cuenta or '').strip().lower() == 'unai'
        _dr = re.search(DIRECCION_ANCLA, hook_txt, re.I)
        chk(_es_unai and bool(_dr), 'Hook anclado a DIRECCION (excepcion declarada, solo Unai, aboutme 2-CARRIL)',
            ('--ancla-direccion solo vale en la cuenta de Unai' if not _es_unai else
             'el gancho no lleva nada de inversion, validar un mercado, fundadores ni startups')
            if not (_es_unai and _dr) else f'ancla de direccion: "{_dr.group(0)}". EXCEPCION: se '
            f'declara en la entrega y la vinculacion con VENTAS va en el CUERPO (§2.3 sigue siendo el default)')
        _vt = re.search(ANCLA_VENTAS, cuerpo, re.I)
        chk(bool(_vt), 'El CUERPO lleva la vinculacion con VENTAS (excepcion de direccion, §2.3)',
            f'ancla de ventas en el cuerpo: "{_vt.group(0)}"' if _vt else
            'el gancho va de inversion o validacion, asi que el cuerpo tiene que atarlo a vender')
    elif not generico:
        chk(bool(fuerte or ambigua), 'Hook anclado a VENTAS (§2.3)', detalle)
    # 2026-10-27 (global §2.3-PERSPECTIVAS): el ancla de ventas se queda, lo que rota es
    # la PERSPECTIVA. En octubre casi todos los ganchos anclaban por el que vende o por
    # "ventas" dicho tal cual, y el cliente, la accion del dia y el marcador, que rinden
    # igual o mejor, llevaban semanas sin salir. Aviso de entrega, no fallo.
    if not generico:
        try:
            from anclas_ventas import perspectivas as _persp, etiqueta as _etq
            _ps = _persp(hook_txt)
        except ImportError:
            _ps = None
        if _ps is not None:
            chk(False, 'ENTREGA: la PERSPECTIVA del ancla de ventas rota (§2.3-PERSPECTIVAS)',
                ('este gancho ancla por: ' + ' + '.join(_etq(k) for k in _ps) if _ps else
                 'no reconozco ninguna perspectiva de ventas en el gancho') +
                '. Declara en la entrega a que fila del A/B de perspectivas suma '
                '(python scripts/auditar-anclas.py --cuenta X)', aviso=True)
            # Como la foto: el post nuevo no repite la perspectiva del ANTERIOR de esa
            # cuenta, sea del pilar que sea. Falla solo si no aporta ninguna perspectiva
            # nueva; compartir una y sumar otra vale. En peloteo, exportar es el ancla
            # fija del pilar (30.701 contra 7.789) y no cuenta como repeticion.
            _cta_p = (cuenta or '').strip().lower()
            if _ps and not historico and _cta_p in ('iker', 'unai', 'asier'):
                _rec_g = ganchos_recientes(_cta_p)
                _peloteo = pilar in ('mapa', 'las10', 'objeto')
                if _rec_g is None:
                    chk(False, 'Perspectiva del ancla distinta de la del post anterior de esta cuenta (§2.3-PERSPECTIVAS)',
                        'no pude leer la BD: compara a mano con el ultimo gancho de la cuenta '
                        '(python scripts/auditar-anclas.py --cuenta %s --ultimos 1)' % _cta_p, aviso=True)
                else:
                    _ant = next((r for r in _rec_g if r[2].strip().lower() != hook_txt.strip().lower()), None)
                    if _ant:
                        _quita = {'exportar'} if _peloteo else set()
                        _nuevo = set(_ps) - _quita
                        _viejo = set(_persp(_ant[2])) - _quita
                        _repite = bool(_nuevo) and _nuevo <= _viejo
                        chk(not _repite, 'Perspectiva del ancla distinta de la del post anterior de esta cuenta (§2.3-PERSPECTIVAS)',
                            ('el anterior (%s, %s: "%s") ya anclaba por %s y este no aporta ninguna nueva. '
                             'Igual que la foto, la perspectiva no se repite en dos posts seguidos de la '
                             'cuenta: prueba otra que encaje con el post (cliente, la accion del dia, el '
                             'marcador, exportar, la competencia)' % (_ant[0], _ant[1], _ant[2][:60],
                             ' + '.join(_etq(k) for k in sorted(_viejo)))) if _repite else
                            'anterior (%s): %s · este suma: %s' % (_ant[0], ', '.join(sorted(_viejo)) or '-',
                                                                  ', '.join(sorted(_nuevo - _viejo)) or '-'))
    m = re.search(VERBO_FLOJO, hook_txt, re.I)
    chk(not m, 'Hook sin verbo flojo (§2.9)',
        f'verbo flojo: "{m.group(0)}" → sube un peldaño (criticar→desmontar)' if m else '')
    m = re.search(DEMASIADO_NICHO, hook_txt, re.I)
    chk(not m, 'Hook sin jerga que estrecha alcance (§2.3)', f'"{m.group(0)}" fuera del hook' if m else '')
    m = re.search(r'[—–]', cuerpo)
    chk(not m, 'Sin guion largo (brand-voice §3)', 'delator de IA nº1' if m else '')
    # 2026-10-26 (Iker) — UNA ORACION POR LINEA EN EL CUERPO, tambien con --voz-ajena.
    # En la historia de Ismael le junte dos oraciones en una linea para "recuperar su
    # tono": "yo solo pongo siempre una frase por linea… no puede haber un punto entre 2
    # oraciones en la misma. Por eso siempre hacemos bloques de una linea, de 2, de 3".
    # El gancho queda fuera (global §2.10 permite dos oraciones en la linea 1) y el cierre
    # tambien (§2.10, el cierre punchy). Medido el 26/10 en los 84 posts propios desde
    # agosto: fuera de listas y siglas, las dos oraciones en una linea son parejas de
    # contraste de meme o de cierre ("No se pierde el trato. Se pierde el nombre."), asi
    # que es fallo duro en historia, donde corrigio Iker, y aviso en el resto.
    _lc = [l.strip() for l in cuerpo.split('\n') if l.strip()][:-1]
    _dos = [l for l in _lc if 'http' not in l and 'lnkd.in' not in l
            and re.search(r'[a-záéíóúñü0-9)%"»”][.!?…]["»”]?\s+[¿¡"«“A-ZÁÉÍÓÚÑ]',
                          re.sub(r'^(\d+[.)]|→|✅|-)\s*', '', l))]
    chk(not _dos, 'UNA oracion por linea en el cuerpo: dos van en dos lineas, en bloque (Iker, 26/10)',
        'parte en lineas (y en bloque de 2 o 3 si van juntas): ' + ' | '.join('"%s"' % x[:60] for x in _dos[:3])
        if _dos else '', aviso=(pilar != 'historia'))
    # 2026-09-23 (Iker) — NINGUNA LINEA DE TEXTO TERMINA EN DOS PUNTOS. "Mañana lo
    # contamos en una sala:" delante de una lista; Iker: "no me gusta nada, creo que
    # nunca lo hemos hecho, pon punto final". Los unicos ':' de final que quedan son
    # los que van pegados al enlace del ninja. Fallo duro en historia; en el resto,
    # aviso, porque la entrada al bloque de menciones del peloteo si los lleva.
    _dp = [l.strip() for l in cuerpo.split('\n')
           if l.strip().endswith(':') and 'http' not in l]
    chk(not _dp, 'Ninguna linea termina en dos puntos (brand-voice §3)',
        f'{_dp[:2]} → punto final' if _dp else '', aviso=(pilar != 'historia'))
    # 2026-09-29 (Iker) — LOS DOS PUNTOS EN MEDIO DE UNA FRASE SON EL MISMO DELATOR
    # QUE EL GUION LARGO. "Lo peor de ir a contrarreloj: no saber a quien vender" →
    # "…contrarreloj es no saber…". Fallo duro en TODOS los pilares. Se salvan: el
    # ':' pegado al enlace del ninja (el molde de global §4.4b), las horas (10:00) y
    # las listas de etiqueta ("SDR: ilusion y pelo intactos.", el 13.61x), que son
    # estructura y no una frase anunciando su segunda mitad.
    # ⚠️ Y DOS EXCEPCIONES MEDIDAS (29/09, 273 ganchos nuestros con +500 imp): el
    # GANCHO DEL PELOTEO ("La ven como el patio trasero de los Pirineos: toro,
    # txistorra y poco mas", 107.094; mediana de los 9 con enumeracion tras ':',
    # 16.689) y la ETIQUETA EN MAYUSCULAS del lead magnet ("🚨 ULTIMA HORA:",
    # 25.457). Son el molde de dos pilares, no una frase de IA. Si Iker decide
    # quitarlas tambien, se borran estas dos condiciones y test-validador lo dira.
    _hook_linea = texto.strip().split('\n')[0].strip()
    _dp_medio = []
    for _bl in re.split(r'\n\s*\n', cuerpo):
        _ls = [l for l in _bl.split('\n') if l.strip()]
        if es_lista(_ls):
            continue
        for _l in _ls:
            if pilar in ('mapa', 'los10', 'objeto') and _l.strip() == _hook_linea:
                continue
            if re.match(r'^\W*[A-ZÁÉÍÓÚÑ ]{3,}:', _l.strip()):
                continue
            _s = re.sub(r':\s*https?://\S+', '', _l)
            _s = re.sub(r'https?://\S+', '', _s)
            _s = re.sub(r'\d:\d', '', _s)
            if re.search(r':\s*\S', _s):
                _dp_medio.append(_l.strip()[:70])
    # 2026-09-30 (Iker): "¿desde cuando cerramos las publicaciones con una pregunta?".
    # Medido ese dia: 1 de 80 posts de las 3 cuentas desde julio acaba en pregunta, y es
    # un lead magnet ("¿La quieres?"). El cierre de la casa es una afirmacion corta
    # (global §4.5). Fallo duro salvo en lead magnet, donde la pregunta es la oferta.
    _ult = [l.strip() for l in texto.strip().split('\n') if l.strip()]
    _ult = _ult[-1] if _ult else ''
    chk(pilar == 'leadmagnet' or not _ult.endswith('?'),
        'El post no cierra con una pregunta (global §4.5)',
        f'"{_ult[:60]}" → una afirmacion corta que remate' if _ult.endswith('?') else '')
    chk(not _dp_medio, 'Sin dos puntos en medio de una frase (brand-voice §3)',
        f'{_dp_medio[:2]} → "es", un punto o una coma' if _dp_medio else '')
    # 2026-10-21 (Iker): "si pongo un emoji, nunca pongo punto delante". El emoji
    # cierra la frase y hace de punto: `Cierre previsto este trimestre 🚀`, nunca
    # `trimestre. 🚀`. Se mira cualquier signo de cierre (. , ; :) justo antes de un
    # emoji, sin contar los puntos suspensivos ni lo que va dentro de una URL.
    _sin_url = re.sub(r'https?://\S+', '', texto)
    _punto_emoji = [l.strip()[:60] for l in _sin_url.split('\n')
                    if re.search(r'(?<!\.)[.,;:]\s*' + RE_EMOJI_TARJETA.pattern, l)]
    chk(not _punto_emoji, 'Sin punto delante de un emoji: el emoji cierra la frase (brand-voice §3)',
        f'{_punto_emoji[:2]} → quita el punto: "...trimestre 🚀"' if _punto_emoji else '')
    # 2026-08-20 — FAMILIA 7: DECIR EN PRIMERA PERSONA QUE HEMOS TRANSCRITO O
    # GRABADO UNA CONVERSACION. El meme del 19/08 se capó a 133 imp y el MISMO post
    # con las 3 conjugaciones de `transcribir` cambiadas por `apuntar` salió a la
    # primera (test de una sola variable, con `coge` dentro: por eso el check de
    # `coger` que puse esa mañana queda REFUTADO y borrado).
    # ⚠️ LA PALABRA NO ESTA PROHIBIDA, y confundir eso nos costaría posts: nuestro
    # MAYOR meme (165.526 imp, 12.05x) lleva "6⃣ Grabar la llamada" como ítem de una
    # lista de herramientas del sector, en INFINITIVO e impersonal, y voló. Y otro
    # con "12 transcripciones de discovery" hizo 4.082. Lo que canta es la RECLAMACION
    # EN PRIMERA PERSONA de haber grabado o transcrito a un tercero, que es lo que
    # LinkedIn lee como tratamiento de datos sin consentimiento (Iker, 2026-08-20).
    m = re.search(r'\b(transcribo|transcribí|transcribimos|transcribiendo|grabo|grabé|grabamos|grabando)\b',
                  cuerpo, re.I)
    chk(not m, 'Sin transcribir/grabar en PRIMERA PERSONA (brand-voice §2c familia 7)',
        f'"{m.group(0)}" dice que hemos grabado a alguien. LinkedIn lo lee como datos de un '
        'tercero sin consentimiento y capa el post ANTES de repartirlo (19/08: 133 imp). '
        'Cambia el verbo (apuntar, dejar por escrito, pasar a papel) o pasa la frase a '
        'IMPERSONAL: "Grabar la llamada" en infinitivo hizo 165.526' if m else '')
    m = re.search(r'\b(la|mi|esta|esa|nuestra) (transcripci[oó]n|grabaci[oó]n)\b', cuerpo, re.I)
    chk(not m, 'Sin "la transcripción/grabación" con artículo (§2c familia 7)',
        f'"{m.group(0)}" afirma que existe una, hecha por nosotros. En plural y sin artículo '
        'no cantó ("12 transcripciones de discovery", 4.082 imp)' if m else '', aviso=True)
    ms = re.findall(r'[^\s]+,\s+[ye]\s', cuerpo)
    chk(not ms, 'Sin coma antes de "y"/"e" (brand-voice §3)', f'{len(ms)}: {ms[:3]}' if ms else '')
    ms = re.findall(r'\*\*|__|^#{1,6}\s|`', cuerpo, re.M)
    chk(not ms, 'Sin markdown dentro del post (working-preferences §1)', f'{ms[:3]}' if ms else '')
    m = re.search(OPENERS_QUEMADOS, cuerpo, re.I)
    chk(not m, 'Sin openers quemados (§2.8)', f'"{m.group(0)}"' if m else '')
    ms = re.findall(NUMERO_EN_LETRA, cuerpo, re.I)
    chk(not ms, 'Cifras en dígito, nunca en letra (§3.6)',
        f'{len(ms)} en letra: {ms[:4]} → mezclar "10" y "seiscientos" en un mismo post canta' if ms else '')
    ms = re.findall(r'\((?:[^()]*\b(?:19|20)\d{2}\b[^()]*)\)', cuerpo)
    chk(not ms, 'Sin AÑO de fuente en el cuerpo (§3.5b)',
        f'{ms[:2]} → cita el nombre, nunca el año' if ms else '')

    # CIFRAS IMPARES EN TODO EL POST (§2.5b, ambito ampliado por Iker el
    # 2026-08-13). La regla existia desde julio pero el titulo decia "las cifras
    # del HOOK", asi que colé un "plantarte en su portal a las 8" en el cuerpo de
    # un meme. Iker: "como regla general los numeros impares siempre son mejores".
    #
    # ⚠️ VA DE AVISO Y NO DE FALLO, Y ES DELIBERADO: la regla solo aplica a las
    # cifras que ELEGIMOS, no a las que VERIFICAMOS. Un dato real no se redondea
    # para que quede impar — eso seria inventarselo, que es la linea que no se
    # cruza. El script no puede distinguir "a las 8" (elegida) de "12 empresas"
    # (verificada), asi que las lista y decide el humano.
    #
    # Se excluyen: la numeracion de una lista al principio de linea (1. 2. 3.),
    # lo que lleva unidad pegada (€ % M k h) o separador de miles, y los años.
    # ⚠️ Y LAS URL, que fue el primer falso positivo al probarlo: un enlace
    # acortado tipo lnkd.in/eB6K6ASH lleva digitos dentro y el check cantaba dos
    # "6" que no existen en el texto. Se quitan ANTES de buscar nada.
    _cuerpo_sin_lista = re.sub(r'https?://\S+', ' ', cuerpo)
    _cuerpo_sin_lista = re.sub(r'(?m)^\s*\d+[.)]\s', '', _cuerpo_sin_lista)
    _pares = []
    for _m in re.finditer(r'(?<![\d.,])(\d{1,2})(?![\d.,])', _cuerpo_sin_lista):
        _n = int(_m.group(1))
        # cola de 4 y sin \b: con 2 caracteres, "3 horas" o "a las 7 hacia"
        # se leian como la unidad "h" y la cifra se saltaba (14/10)
        _cola = _cuerpo_sin_lista[_m.end():_m.end() + 4]
        if re.match(r'\s*[€%]|\s*[MkKh](?![a-záéíóúñ])', _cola):
            continue
        # 26/10 (Asier): el dia de una FECHA es un dato, no una cifra elegida. "miercoles 28 lo
        # vemos" saltaba y "miercoles 28." no (la puntuacion detras lo libraba por casualidad).
        _antes = _cuerpo_sin_lista[max(0, _m.start() - 12):_m.start()]
        if (re.search(r'(lunes|martes|mi[eé]rcoles|jueves|viernes|s[aá]bado|domingo|\bel|\bdel)\s+$', _antes, re.I)
                and re.match(r'(?!\s*(?:empresas|personas|clientes|comerciales|a[nñ]os|meses|d[ií]as))', _cola)) \
                or re.match(r'\s+de\s+(enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|octubre|noviembre|diciembre)',
                            _cuerpo_sin_lista[_m.end():_m.end() + 14], re.I):
            continue
        if _n % 2 == 0 and _n != 0:
            _ctx = _cuerpo_sin_lista[max(0, _m.start() - 22):_m.end() + 10].replace('\n', ' ')
            _pares.append(f'"{_n}" en «…{_ctx.strip()}…»')
    chk(not _pares, 'Cifras ELEGIDAS en impar, en todo el post (§2.5b)',
        (' · '.join(_pares[:3]) + ' → si la cifra la eliges tu, va impar y creible '
         '(el 14/08: "a las 8" pasó a "a las 9", porque a las 7 o a las 5 no se lo cree '
         'nadie). Si es un dato VERIFICADO, se queda como esta y este aviso se ignora: '
         'un dato no se retoca para que quede impar') if _pares else '', aviso=True)

    # CIFRAS ELEGIDAS VARIADAS (§2.5b-VARIAR, Iker 2026-10-14). La historia de los
    # kilometros llevaba "37 llamadas", "a las 7", "a 3 horas" y "3 cafes": todas
    # impares y aun asi "parece un poco falso". Impar no es repetir el mismo 3:
    # se rota entre 1, 3, 5 y 7 (y sus decenas), y el 9 le gusta menos.
    # Aviso y no fallo: un dato verificado puede repetir cifra y se queda.
    _cifras = []
    for _m in re.finditer(r'(?<![\d.,])(\d{1,2})(?![\d.,])', _cuerpo_sin_lista):
        # cola de 4 y sin \b: con 2 caracteres, "3 horas" o "a las 7 hacia"
        # se leian como la unidad "h" y la cifra se saltaba (14/10)
        _cola = _cuerpo_sin_lista[_m.end():_m.end() + 4]
        if re.match(r'\s*[€%]|\s*[MkKh](?![a-záéíóúñ])', _cola):
            continue
        _cifras.append(_m.group(1))
    from collections import Counter as _Counter
    _ult = _Counter(c[-1] for c in _cifras if int(c) % 2 == 1)
    _rep = [d for d, k in _ult.items() if k >= 2]
    _nueves = [c for c in _cifras if c[-1] == '9']
    _msg = []
    if _rep:
        _msg.append('se repite la terminacion ' + ', '.join(_rep) + ' en ' +
                    ', '.join(c for c in _cifras if c[-1] in _rep))
    if _nueves:
        _msg.append('lleva un 9 (' + ', '.join(_nueves) + '): a Iker le gusta menos')
    chk(not _msg, 'Cifras ELEGIDAS variadas, no siempre el mismo impar (§2.5b-VARIAR)',
        ('; '.join(_msg) + ' → rota entre 1, 3, 5 y 7 (y 15, 25…). Tres treses seguidos '
         'parecen inventados aunque sean impares. Si alguna es un dato VERIFICADO, se queda') if _msg else '',
        aviso=True)

    # bloques de prosa: ≤3 líneas, y línea individual detrás (§3.2)
    largos = [i for i, b in enumerate(bs) if not es_lista(b) and len(b) >= 4]
    chk(not largos, 'Bloques de prosa ≤3 líneas (§3.2)',
        f'bloques con 4+ líneas en posición {largos}' if largos else '')
    fallos = []
    for i, b in enumerate(bs[:-1]):
        if es_lista(b) or len(b) == 1 or i == 0:
            continue
        sig = bs[i + 1]
        if not es_lista(sig) and len(sig) > 1:
            fallos.append(i)
    chk(not fallos, 'Línea individual tras cada bloque de 2-3 (§3.2)',
        f'bloque pegado a otro bloque en posición {fallos}' if fallos else '')

    # ── menciones: colocación y unicidad (transversal, Iker 2026-07-24) ──
    # mapa/los10 quedan fuera: sus 20 fichas ya son empresas distintas por
    # construcción, y sus @ multi-palabra ("@Grupo X / @Grupo Y") darían falso
    # positivo. En los pilares de prosa (historia, leadmagnet) las menciones se
    # tejen, y ahí es donde muerden estas dos reglas.
    if pilar not in ('meme', 'mapa', 'los10'):
        # 1) NUNCA una @ pegada al gancho: el bloque justo tras el hook es para
        # la tensión de la historia o el claim, no para etiquetar. Una @ ahí se
        # lee como cebo de engagement; las menciones van tejidas más adelante.
        if len(bs) >= 2:
            _tras = ' '.join(bs[1])
            chk('@' not in _tras, 'Ninguna mención pegada al gancho (menciones §2.9)',
                'hay una @ en el bloque justo tras el hook: téjela más adelante' if '@' in _tras else '')
        # 2) cada persona/marca se menciona UNA sola vez: repetir el mismo @
        # (p.ej. @Iker arriba y otra vez en la línea de resultados) gasta alcance
        # y suena a peloteo. Token = @ + primer run de letras.
        # 🔧 CORREGIDO EL 2026-09-16 · el token era SOLO la primera palabra, y eso
        # da falso positivo en cuanto dos empresas distintas empiezan igual por un
        # generico del sector: `@TALLERES UNAMUNZAGA` y `@Talleres Industriales
        # Rofer` salian como la misma mencion repetida. Cuando la primera palabra
        # es de esa familia, el token se alarga a las DOS primeras.
        _GENERICO = {'talleres', 'grupo', 'industrias', 'aceros', 'plasticos', 'plásticos',
                     'transmisiones', 'fundiciones', 'metalurgica', 'metalúrgica', 'mecanizados',
                     'construcciones', 'hijos', 'laboratorios', 'productos', 'sociedad',
                     'troqueleria', 'troquelería', 'estampaciones', 'tornilleria', 'tornillería'}
        _pares = re.findall(r'@([A-Za-zÁÉÍÓÚÑÜáéíóúñü]+)(?:\s+([A-Za-zÁÉÍÓÚÑÜáéíóúñü]+))?', cuerpo)
        _ats = [(a + ' ' + (b or '')).strip().lower() if a.lower() in _GENERICO else a.lower()
                for a, b in _pares]
        _dups = sorted({a for a in _ats if _ats.count(a) > 1})
        chk(not _dups, 'Cada persona se menciona UNA sola vez (menciones §2.9)',
            f'repetidas: {_dups} → una mención por persona' if _dups else '')

    # escalera: todo bloque de prosa de 2-3 líneas va en longitud monótona,
    # recta (corta→larga) o invertida (larga→corta). Zigzag = no hay escalera (§3.2)
    zigzag = []
    for i, b in enumerate(bs):
        if es_lista(b) or not 2 <= len(b) <= 3:
            continue
        L = [len(l.strip()) for l in b]
        sube = all(L[j] < L[j + 1] for j in range(len(L) - 1))
        baja = all(L[j] > L[j + 1] for j in range(len(L) - 1))
        if not (sube or baja):
            zigzag.append(f'bloque {i} {L}')
    # §3.2 — TIENE que haber al menos un bloque de DOS. El ritmo de LinkedIn es
    # suelta → par → suelta → terna → sueltas, y sin pares se convierte en una
    # lista de frases sueltas con algún bloque de 3, que es exactamente lo que
    # salía: medido el 2026-07-17, el lead magnet de Iker tenía 1 bloque de 3 y
    # 10 líneas individuales, y CERO pares. El mapa de Cataluña, lo mismo.
    #
    # Por qué este check positivo SÍ y el del verbo punchy NO: este es
    # ESTRUCTURAL, no léxico. Exigir "un bloque de 2" no me empuja a escribir
    # siempre la misma frase — el contenido sigue siendo libre. Exigir "un verbo
    # de esta lista" sí, y así nació la muletilla de "En ventas,".
    #
    # ⛔ EL MEME QUEDA FUERA (usuario, 2026-07-17), y no es una excepción de
    # conveniencia: el meme CALCA SU REFERENCIA y punto, así que su forma la
    # decide el post que estamos remixando, no nuestro ritmo. La evidencia iba por
    # delante de la decisión — al meter el check, los 2 memes ganadores (13.51x y
    # 16.46x) lo fallaron mientras el mapa de Navarra 7.72x lo pasaba. Se anotó
    # como conflicto sin taparlo y el usuario lo resolvió así.
    if pilar in ('mapa', 'los10', 'leadmagnet', 'evento'):
        pares = [i for i, b in enumerate(bs) if not es_lista(b) and len(b) == 2]
        chk(bool(pares), 'Al menos un bloque de DOS (§3.2)',
            'todo son líneas sueltas y bloques de 3: el par es el ritmo típico de LinkedIn y no aparece nunca'
            if not pares else f'{len(pares)} par(es)')

    chk(not zigzag, 'Bloques de 2-3 en escalera, recta o invertida (§3.2)',
        f'{zigzag} → cada línea más larga que la anterior, o cada una más corta' if zigzag else '')

    # ---------- AUDITORIA 2026-07-20: lo que estaba escrito y nadie miraba ----------
    m = re.search(AI_TELLS, cuerpo, re.I)
    chk(not m, 'Sin AI-tells de la tabla (brand-voice §3)',
        f'"{m.group(0)}" — la tabla dice "cambialo antes de entregar"' if m else '')

    _ultimas = [l for l in cuerpo.splitlines() if l.strip()][-3:]
    m = next((re.search(CIERRE_QUEMADO, l, re.I) for l in _ultimas
              if re.search(CIERRE_QUEMADO, l, re.I)), None)
    chk(not m, 'Sin cierres quemados: Spoiler / Plot twist / P.D. (§2.8, §6)',
        f'"{m.group(0)}" al final' if m else '')

    # ⛔⛔ NUNCA EL AÑO EN EL POST (Iker, 2026-08-11) — GLOBAL, TODOS LOS PILARES.
    #
    # "Si decimos el año, tanto en la foto como en el texto, nos estamos limitando
    # el alcance, y este meme dentro de un año no se puede seguir viralizando".
    # Un post sin año se puede reflotar, reutilizar en otra cuenta y seguir
    # circulando; con el año dentro nace con fecha de caducidad y encima se lee
    # viejo en cuanto pasa enero. No cuesta nada quitarlo y no aporta nada:
    # nuestro mejor meme de este formato (13.92x) no lo lleva.
    #
    # Vale para el TEXTO y para la IMAGEN. La imagen no la ve el script, asi que
    # el prompt tampoco lo lleva nunca.
    _anio = re.search(r'\b(?:19|20)\d{2}\b', cuerpo)
    chk(not _anio, 'Sin el AÑO en el post (atemporalidad, brand-voice)',
        '"%s" dentro del texto le pone fecha de caducidad. Quitalo: casi siempre la '
        'frase funciona igual sin el, y asi el post se puede reflotar o reutilizar en '
        'otra cuenta dentro de meses' % _anio.group(0) if _anio else '')
    # Lenguaje de REPROCHE. Aviso y no fallo: `no es culpa tuya` es empatia,
    # no reproche, y una lista cerrada nunca va a distinguir las dos. Lo que
    # hace es obligar a mirar la frase con el test de brand-voice delante.
    _rep = re.search(r'\b(la culpa|por culpa|culpables?|culparon|no hicieron|'
                     r'nadie se molest\w+|se les olvid\w+|llegaron tarde|tarde y mal)\b',
                     cuerpo, re.I)
    chk(not _rep, 'Sin lenguaje de reproche (brand-voice, canonico)',
        '"%s": mira si alguien de dentro o de fuera puede sentirse senalado. El culpable '
        'nunca es una persona ni un equipo, es la falta de informacion, la herramienta o el '
        'proceso. Y si se puede, que la frase incluya al que publica' % _rep.group(0)
        if _rep else '', aviso=True)
    # LA CASA NO CONFIESA QUE SE LLEVA MAL (Mario, 2026-10-21). En su meme de ventas
    # y marketing puse "Amigos no somos, pero las reuniones no las devuelven" y lo
    # tumbo: "publicamente decir amigos no somos me juega la contra". La referencia
    # solo lo pregunta y en el cuerpo dice lo contrario (que trabajan juntos). Dicho
    # en nosotros, el lector lee que en Neety los equipos no se hablan. Fallo duro:
    # la pregunta del gancho y "nunca se hacen amigos" con likes (una practica) pasan.
    _malcasa = re.search(r'\b(no somos amigos|amigos no somos|no nos llevamos(?: nada)? bien|'
                         r'nos llevamos (?:fatal|mal)|no nos hablamos|no nos entendemos|'
                         r'no nos soportamos|somos enemigos)\b', cuerpo, re.I)
    chk(not _malcasa, 'Sin confesar que en casa nos llevamos mal (brand-voice, no criticamos 1)',
        '"%s": en nosotros se lee como que en Neety los equipos no se hablan. La tension '
        'se pregunta (gancho) o se le cuelga a la situacion; en el cuerpo, lo que hacemos '
        'juntos' % _malcasa.group(0) if _malcasa else '')
    # "ESE" DESPECTIVO PARA UNA PERSONA (Iker, 2026-10-14). En la historia de los
    # kilometros la cita decia "¿Mi jefe? Ese no recibe a comerciales": llamar
    # "ese" al que decide suena a desprecio, y el que decide es quien nos compra.
    # Quedo "Él no recibe…". Aviso: "ese cliente", "esa parte" son legitimos.
    _ese = re.search(r'(?:^|[?¿.!"\s])((?:Ese|Esa|Esos|Esas)\s+(?:no|nunca|ni|siempre|solo|ya)\b)',
                     cuerpo)
    chk(not _ese, 'Sin "ese" despectivo para una persona (brand-voice, no criticamos)',
        '"%s": "ese" a secas para referirse a alguien, sobre todo al que decide o compra, '
        'suena a desprecio. Usa "él"/"ella" o su cargo' % _ese.group(1) if _ese else '',
        aviso=True)
    m = re.search(NEGRITA_UNICODE, cuerpo)
    chk(not m, 'Sin negrita Unicode tipo 𝗟𝗮𝘀 𝟭𝟬 (§6)',
        'el check de markdown no la caza: es otro bloque Unicode' if m else '')

    # aboutme §1: la puerta de agendar se muda a neety.com/solicitar-demo.
    # El 29/09 Iker lo freno y del 05/10 se le preguntaba post a post. ⛔ CERRADO
    # EL 2026-10-05 (Iker): "a partir de ahora, tanto en publicaciones de LinkedIn
    # como en correos, ya no mandamos a la web de recursos a agendar". Desde ese
    # dia la URL vieja de agendar es FALLO. El resto de recursos.neety.com (mapas,
    # /correo/, recursos de lead magnet) NO entra: la web nueva aun no los tiene.
    if not historico and datetime.date.today() >= datetime.date(2026, 10, 5) and PUERTA_VIEJA:
        chk(False, 'La puerta de agendar es https://neety.com/solicitar-demo (aboutme §1, desde el 05/10)',
            'recursos.neety.com/agendar ya no se usa ni en posts ni en correos (Iker, 05/10). '
            'Mismo formato de UTM. Los mapas y /correo/ siguen en recursos')

    # global §2.2b-SIMBOLOS (Iker, 2026-09-29) — los marcadores de lista son
    # ENVASE, no motor: se calca que haya una lista, nunca con que simbolo la
    # tecleo el autor. El meme del 29/09 calco los guiones de la referencia y los
    # tuvo que cambiar Iker a mano por flechas. Los de la casa: → (mapa, meme),
    # 1️⃣ o 1. (listas numeradas). Fallo duro en borradores; --historico lo deja
    # pasar porque hay ganadores viejos con guiones (desmonto perfiles).
    if not historico:
        _sim = [l.strip()[:40] for l in cuerpo.split('\n')
                if re.match(r'^\s*[-•·*▪◦–]\s+\S', l)]
        chk(not _sim, 'Marcadores de lista de la CASA, no los del original (§2.2b-SIMBOLOS)',
            'lineas con guion o vineta: %s. Se cambian por → (o 1️⃣/1. si es numerada): '
            'el simbolo es como lo tecleo su autor, no lo que hizo volar el post' % _sim
            if _sim else '')

    # brand-voice §4.5 — el nombre del founder gana al del producto. Como mucho
    # UNA vez y nunca en el hook. El check viejo solo miraba el spam ninja.
    # §4.4e - LAS URLs NO CUENTAN COMO NOMBRAR LA MARCA. `\bNeety\b` casa dentro
    # de `recursos.neety.com` porque el punto es frontera de palabra, asi que al
    # meter el segundo bloque de correo un post limpio pasaba a 2 y suspendia solo.
    # Y ademas es lo correcto por doctrina: §4.4b dice que el enlace es la unica
    # firma y que el ninja NO nombra a Neety. Lo que se cuenta es la marca escrita
    # en el TEXTO, no el dominio del enlace.
    # "Neety Forward" es el NOMBRE DEL EVENTO, no una mencion del producto: no cuenta
    # (Iker, 2026-09-30: en la historia de la alarma quiere @Neety Y el evento con su nombre).
    _neety = len(re.findall(r'\bNeety\b(?!\s+Forward)', re.sub(r'https?://\S+', '', cuerpo), re.I))
    # ⛔ MARIO ES LA EXCEPCION, Y ESTABA ESCRITA PERO NO MECANIZADA (Iker,
    # 2026-08-11). `aboutme §2` lo dice desde el 22/07: en la cuenta de Mario las
    # menciones a @Neety y a los 3 jefes son OBLIGATORIAS en TODOS los posts,
    # porque su cuenta no es thought leadership de founder sino ADVOCACY DE
    # EMPLEADO — ahi nombrar a la empresa y etiquetar a los jefes es el punto,
    # no una fuga. Con la regla de los founders aplicada a su cuenta, un post
    # suyo BIEN hecho suspendia; y al reves, uno sin las menciones aprobaba.
    _es_mario_cta = (cuenta or '').strip().lower() == 'mario'
    if _es_mario_cta and sin_menciones:
        # El experimento: se comprueba lo CONTRARIO, que no queda ninguna.
        # Si se cuela una, el post no es ni lo uno ni lo otro y el test no
        # mide nada.
        _sobra = [n for n in ('Neety', 'Unai', 'Iker', 'Asier')
                  if re.search(r'@\s?' + n, cuerpo, re.I)]
        chk(not _sobra, 'EXPERIMENTO sin menciones: no queda ninguna @ (Iker, 2026-08-11)',
            'quedan ' + ', '.join('@' + n for n in _sobra) + '. O van las cuatro o no va '
            'ninguna; a medias el experimento no mide nada' if _sobra else '')
    elif _es_mario_cta:
        _falta = [n for n in ('Neety', 'Unai', 'Iker', 'Asier')
                  if not re.search(r'@\s?' + n, cuerpo, re.I)]
        chk(not _falta, 'MARIO: menciona a @Neety y a los 3 jefes (aboutme §2)',
            'faltan ' + ', '.join('@' + n for n in _falta) + '. Es obligatorio en TODOS sus '
            'posts: su cuenta es advocacy de empleado, no thought leadership de founder'
            if _falta else '')
    else:
        chk(_neety <= 1, 'Neety se nombra como mucho UNA vez (brand-voice §4.5)',
            f'{_neety} veces' if _neety > 1 else '')
    chk(not re.search(r'\bNeety\b', hook_txt, re.I), 'Neety NUNCA en el hook (brand-voice §4.5)',
        'el post vende al pensador, no al producto' if re.search(r'\bNeety\b', hook_txt, re.I) else '')

    # global §4.4b + outliers §3.14 — el link va SIEMPRE a recursos.neety.com
    # (dominio propio), nunca a web ajena. Los CTR mas altos del historico no
    # valian: iban a pampam.city. 727 clics regalados entre tres mapas.
    # Desde 2026-07-23 el mapa enlaza a recursos.neety.com/mapas/{region} (la web
    # embebe el mapa completo, el jefe ya pago PamPam) en vez de a /agendar/:
    # ambos son recursos.neety.com, asi que este check los acepta igual.
    # 2026-10-21 — una MENCION con punto dentro (`@Red.es`) no es un enlace: el
    # `(?<!@)` la deja fuera. Tumbaba el post de San Francisco de Unai por mencionar
    # a la entidad que organiza el programa con su nombre exacto de LinkedIn.
    _urls = re.findall(r'https?://\S+|(?<!@)\b[\w.-]+\.(?:com|es|city|io)\S*', cuerpo)
    _fuera = [u for u in _urls if 'recursos.neety.com' not in u and 'linkedin.com' not in u]
    # ⭐ EL EVENTO ENLAZA DIRECTO A LUMA Y NO SE AVISA DE NADA (Iker, 2026-08-05).
    # Propuse montar recursos.neety.com/evento para que el clic fuera nuestro, y
    # lo descarto con razon: "cada clic intermedio es friccion, y aqui no busco
    # trafico, busco inscripciones". Un evento PRESENCIAL en Euskadi ya tiene
    # bastante barrera como para meterle un salto mas. Asi que el check ni salta:
    # no es una mejora pendiente, es una decision tomada.
    # 2026-08-27 — `forward.neety.com` cuenta como Luma. Es un 302 de Cloudflare
    # que conserva la query entera (comprobado el 26/08, global §4.4b-UTM) y es el
    # dominio que imprimen los carteles del evento, asi que un post puede enlazarlo
    # en vez de luma.com. El check de UTM ya lo contemplaba y estos cinco no.
    _solo_luma = bool(_fuera) and all(('luma.com' in u or 'forward.neety.com' in u) for u in _fuera)
    # ⭐ AMPLIADO 2026-08-21: el enlace de Luma vale en CUALQUIER pilar, no solo
    # en --pilar evento. La doctrina lo dice desde el 05/08 (global §4.4e y el
    # bloque del evento): un post informativo del evento no lo lee nadie, asi que
    # el evento viaja DENTRO de un pilar que ya es outlier (historia, meme, mapa)
    # y alli Luma ocupa el hueco del enlace de agendar. El check seguia atado al
    # pilar y tumbaba la historia de Unai del 21/08, que es justo como manda
    # venderlo. Lo que decide es que el UNICO enlace de fuera sea el de Luma.
    if not _solo_luma:
        chk(not _fuera, 'El enlace apunta a recursos.neety.com, no fuera (outliers §3.14)',
            f'{_fuera[:2]} — un clic a web ajena no es un clic nuestro' if _fuera else '')

    # global §2.10 — la mano abajo. DURA en peloteo (su formula de hook la lleva
    # literal), AVISO en meme y lead magnet: 2 de 3 memes grandes la llevan pero
    # el 15.0x cierra con ✨ y funciona igual. Y forzarla en todo es como se
    # fabrico la muletilla "En ventas,".
    _mano = hook_txt.rstrip().endswith('👇')
    if pilar in ('mapa', 'los10'):
        chk(_mano, 'El hook cierra con 👇 (§4.2/§4.3, formula del pilar)',
            'en peloteo la formula del hook lo lleva literal' if not _mano else '')
    elif pilar in ('meme', 'leadmagnet'):
        chk(_mano, 'El hook cierra con 👇 (§2.10)',
            'no es obligatorio (el 15.0x cierra con ✨) pero es la opcion por defecto'
            if not _mano else '', aviso=True)

    # ⛔ ANGLICISMOS CON TRADUCCION LLANA (Iker, 2026-08-07). Solo se prohiben los
    # que el lector YA dice en espanol: CRM, B2B, SDR, lead o deal no tienen
    # equivalente llano y siguen valiendo en el cuerpo (`brand-voice §2`).
    # `pipeline` si lo tiene, y ni siquiera estaba en la lista: se me colo en el
    # cuerpo del meme de Unai del 06/08 y se publico. El lector es un director
    # comercial de 55 anos que vende maquinaria y puede no tener CRM.
    ANGLICISMOS = {
        # `prompt` ya estaba en la lista de anglicismos prohibidos de
        # brand-voice §2 desde hacia semanas y ayer NO la meti aqui: fallo mio.
        # Iker la quita del lead magnet del 07/08. ⚠️ Honestidad sobre el dato:
        # NO hay indicio de que LinkedIn la penalice —7 posts nuestros con ella
        # se repartieron bien y Martin Arosa la usa en 15 de sus 50 ultimos—.
        # Se prohibe por AUDIENCIA, no por algoritmo: un director comercial de
        # 55 anos que vende maquinaria no dice "prompt".
        'prompt': 'el mensaje / la instruccion que le mandas',
        'prompts': 'los mensajes / las instrucciones',
        'pipeline': 'la cartera / las oportunidades abiertas',
        'funnel': 'el embudo', 'forecast': 'la prevision',
        'workflow': 'el proceso / la rutina', 'engagement': 'la respuesta',
        'insight': 'el hallazgo', 'insights': 'los hallazgos',
        'pitch': 'el discurso', 'closing': 'el cierre',
        # Iker, 15/10: 'software' llevaba muchas publicaciones colandose y nuestro
        # lector es mayor. Lo nuestro funciona en el navegador: ni 'programa' ni
        # 'pagina web' son verdad, 'herramienta' si. Y 'online' tiene recambio llano.
        'software': 'la herramienta', 'online': 'por videollamada / en directo / a distancia',
    }
    # Se mira el texto SIN las URLs: la cola de UTM lleva `utm_medium=post`
    # (4.4b-UTM) y `post` es ahora anglicismo, asi que el check se disparaba
    # contra un parametro que el lector NO VE: LinkedIn acorta el enlace a
    # lnkd.in al publicar. Misma logica por la que los 450 del meme se miden
    # con el enlace ya acortado (4.4-CORTO).
    _sin_urls = re.sub(r'https?://\S+', ' ', cuerpo)
    _ang = [w for w in ANGLICISMOS if re.search(r'\b' + w + r'\b', _sin_urls, re.I)]
    chk(not _ang, 'Sin anglicismos que tengan traduccion llana (brand-voice §2b)',
        ' · '.join(f'"{w}" → {ANGLICISMOS[w]}' for w in _ang) if _ang else '')

    # ⛔ UNAI NO PONE SOBRE LA MESA QUE LA IA SUSTITUYE AL COMERCIAL, NI COMO PREGUNTA
    # (Unai via Iker, 15/10): 'siendo nosotros una herramienta de ventas, puede ser
    # peligroso que lo preguntemos nosotros, porque es como que si lo vemos asi'. Tumbo
    # 'Le preguntamos a quien vende IA si los comerciales tienen los dias contados' y
    # eligio 'La pregunta que mas incomoda a un comercial se la hicimos a quien vende IA'.
    # El veto es a la amenaza SOBRE EL COMERCIAL, no a la expresion: 'Lo que tiene los dias
    # contados es el filtro' cierra el post que el jefe acepto (15/10) y dice lo contrario
    # de su miedo. Por eso va por linea, y la linea cuyo sujeto es una cosa (filtro, Excel,
    # lista, ficha) y no nombra al comercial queda fuera.
    # 🔄 15/10 (Iker): "él no quiere que publicamente compartamos esa vision, asi que es
    # comun de la marca". Pasa de Unai a TODAS las cuentas: es la vision de la casa.
    if True:
        _sust = None
        for _l in cuerpo.splitlines():
            _m = re.search(r'd[ií]as contados|sustitu\w*|reemplaz\w*|jubil\w*|quit\w* (el|su) puesto'
                           r'|sin (trabajo|puesto)|acab\w* con (el|los) comercial\w*|cu[aá]nto le queda al comercial',
                           _l, re.I)
            # Al hacerse global (15/10) saltaba en 'La tienen jubilada en un museo minero' (verbo
            # del prejuicio del mapa) y en 'las he sustituido por herramientas': sustituir,
            # reemplazar y jubilar solo cuentan si la linea nombra a una PERSONA o su puesto.
            if _m and re.match(r'(sustitu|reemplaz|jubil)', _m.group(0), re.I) and not re.search(
                    r'comercial|vendedor|equipo|personas|puesto|\bte\s+(reemplaz|sustitu|jubil)', _l, re.I):
                continue
            if _m and not (re.search(r'\b(filtros?|excel|listas?|fichas?|bases? de datos)\b', _l, re.I)
                           and not re.search(r'comercial|vendedor|\bles?\b|\blos ve\b', _l, re.I)):
                _sust = _m
                break
        # 🔄 20/10 (Iker, tras hablarlo con el segundo jefe): "la marca somos todos" y en SU
        # cuenta quiere ganchos de opinion y contrarian que abran debate, como antes. En Iker
        # pasa a AVISO: vale como creencia ajena que el post desmiente; nunca como nuestra
        # vision. Unai y Asier siguen con el fallo duro.
        _es_iker = (cuenta or '').strip().lower() == 'iker'
        chk(not _sust, 'MARCA: sin plantear que la IA sustituye al comercial, ni como pregunta (Unai 15/10; en Iker, aviso desde el 20/10)',
            (f'"{_sust.group(0)}": en Iker vale como creencia ajena que el post desmiente (contrarian, '
             f'abre debate); nunca como nuestra vision ni como amenaza al que nos compra' if _es_iker else
             f'"{_sust.group(0)}": aunque sea en pregunta, en la cuenta de un fundador de una herramienta de ventas '
             f'se lee como nuestra vision. Se plantea la pregunta sin la amenaza ("la pregunta que mas '
             f'incomoda", "como ve al comercial en 5 anos")') if _sust else '', aviso=_es_iker)

    # ⛔ NUESTROS NOMBRES PROPIOS VAN CON SU CATEGORIA (global §2.5b-EXPLICITO, 30/09;
    # reincidido el 15/10 con 'nos lo conto en Neety Forward'). Quien ve el post no tiene
    # por que saber que es un evento: no somos famosos y le llega a gente nueva.
    _sin_urls_nf = re.sub(r'https?://\S+', ' ', cuerpo)
    _nf_mal = [l.strip() for l in _sin_urls_nf.splitlines()
               if re.search(r'neety\s+forward', l, re.I) and not re.search(r'\bevento\b', l, re.I)]
    chk(not _nf_mal, 'Neety Forward va con su categoria: el evento (global §2.5b-EXPLICITO)',
        f'"{_nf_mal[0][:70]}": escribe "el evento Neety Forward" o "Neety Forward, nuestro evento"' if _nf_mal else '')

    # ⛔ MARCAS TEMPORALES (Iker, 2026-08-06). El original de Daniel Disney lleva
    # una lista Monday…Friday, me quedé con ese ritmo de semana y escribí "y aun
    # no es ni jueves" en un post que se publico un JUEVES. Lo pillo Iker al
    # subirlo. Un dia de la semana o un mes son DATOS y se verifican igual que una
    # cifra: que el original diga miercoles no hace verdad nuestro miercoles.
    # Aviso y no fallo, porque a veces la marca temporal es correcta a proposito.
    _tiempo = re.search(r'\b(lunes|martes|mi[eé]rcoles|jueves|viernes|s[aá]bado|domingo'
                        r'|enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre'
                        r'|octubre|noviembre|diciembre)\b', cuerpo, re.I)
    chk(not _tiempo, 'Marca temporal verificada contra la fecha REAL de publicacion',
        (f'dice "{_tiempo.group(0)}" — comprueba que es cierto el dia que se publica, no hoy '
         'ni el dia que lo decia la referencia. Si el post aguanta dos dias en el feed, mejor '
         'una marca que no caduque (global §2.2b-CAPAS)') if _tiempo else '', aviso=True)

    # ── §3.2 · ANCHO DE LINEA y RITMO (Iker, 2026-08-06) ─────────────────────
    # Dos cosas que la receta pedia desde siempre y que el validador NO miraba,
    # y por eso se me colaron en verde tres veces en una semana.
    #
    # 1) ANCHO. Contaba las lineas que YO escribo, no las que LinkedIn PINTA.
    #    Una linea de 95 caracteres es una linea aqui y dos en el movil, asi que
    #    un "bloque de dos" acaba leyendose como cuatro.
    #    ⚠️ HONESTIDAD SOBRE EL DATO: medido en 651 lineas de outliers y 2.874 de
    #    flops, las lineas largas NO correlacionan con el rendimiento — 17,8% de
    #    lineas >80 en los outliers contra 14,8% en los flops. Es CRITERIO DE
    #    OFICIO de Iker, no una palanca de alcance, asi que va como AVISO y no
    #    cuenta en el marcador. Los enlaces se saltan: miden lo que miden.
    # El GANCHO se excluye: tiene su propia medida (§2.1 ≤210 y la zona de
    # outliers ≤110) y va en una sola linea a proposito. Incluirlo hacia que
    # este aviso saltara en CASI TODOS los posts, y un aviso que salta siempre
    # es ruido: es la razon por la que el 2026-08-07 me lo salte teniendo una
    # linea de 82 caracteres delante (Iker me la pillo).
    _largas = [l for b in bloques(texto)[1:] for l in b
               if len(l.strip()) > 80 and 'http' not in l
               and not l.strip().startswith(('→', '❌', '✅'))]
    chk(not _largas, 'Ninguna linea pasa de 80 caracteres (§3.2)',
        (f'{len(_largas)} linea(s) se parten en dos en el movil, y ahi un bloque de dos '
         f'se lee como cuatro. La peor: "{max(_largas, key=len).strip()[:60]}…"')
        if _largas else '', aviso=True)

    # 2) RITMO. `1-2-1-2-1-2` es un metronomo: el lector coge el patron y deja de
    #    leer. Iker, 2026-08-06: "superpredecible, es horrible". Se exige AL MENOS
    #    UN BLOQUE DE TRES y que no se alterne 1-2 mas de dos veces seguidas.
    #    ⭐ AMPLIADO EL 2026-08-06: la primera version solo prohibia el 1-2-1-2, y
    #    a la siguiente entrega le colé un 1-3-1-2-1-3-1-2, que es igual de
    #    predecible pero con ciclo de CUATRO. Iker: "superpredecible. Siempre tiene
    #    que haber mas lineas individuales y mas irregular". Asi que ahora se mira
    #    la PERIODICIDAD en general, no un patron concreto, y se exige que la linea
    #    suelta domine — la misma prioridad que ya estaba escrita para el email
    #    (`email-marketing`: 1º lineas individuales, 2º bloques de dos, 3º de tres).
    # Un item de lista numerada DESARROLLADO (titulo + 2-3 lineas) es una
    # unidad estructural, no un bloque de prosa, asi que no entra en las
    # reglas de ritmo ni de escalera. Sin esto, la lista de 5 items cuenta
    # como 3-3-3-3-3 y dispara el check de patron repetido. Y es justo la
    # estructura de nuestro mejor lead magnet, el de 632 comentarios.
    # ⛔⛔ TRAS EL GANCHO, LINEA INDIVIDUAL SIEMPRE (Iker, 2026-08-10).
    # "siempre te he dicho que despues del gancho nunca puede haber ni un bloque
    # de dos ni de tres en ningun tipo de publicaciones". Estaba dicho y NO
    # estaba mecanizado, asi que el 10/08 abri el lead magnet con un bloque de
    # TRES pegado al gancho y no salto nada. El primer bloque es el que decide
    # si sigues leyendo: un muro de tres lineas ahi pesa antes de haber dado
    # ningun motivo para seguir.
    _bs = bloques(texto)
    if len(_bs) >= 2:
        chk(len(_bs[1]) == 1, 'Tras el gancho, LINEA INDIVIDUAL (§3.2)',
            'el bloque de despues del gancho tiene %d lineas. Va suelta, siempre y en '
            'todos los pilares' % len(_bs[1]) if len(_bs[1]) != 1 else '')
    # Y EL PRIMER BLOQUE MULTIPLE ES DE DOS, NO DE TRES (Iker, 2026-08-10):
    # "prefiero empezar con bloques de dos y no con uno de tres". El de tres es
    # el mas pesado que tenemos; si es el primero que aparece, el post arranca
    # cuesta arriba.
    # ⛔ CADA LINEA DE UN BLOQUE DE 2 O DE 3 ES UNA ORACION CERRADA (Iker, 2026-10-21).
    # "Nosotros nunca dividimos una oracion en 3 lineas como bloque de 3. Cada linea
    # de un bloque de 3 tiene que cerrarse". El caso: la cita de un cliente partida
    # en tres lineas para hacer el bloque de tres de la historia de Asier del 22/10.
    # Se caza la oracion partida: una linea que acaba en coma o punto y coma, o una
    # linea seguida de otra que arranca en minuscula (la misma frase sigue debajo).
    _partidas = []
    for _b in _bs[1:]:
        if es_lista(_b) or not (2 <= len(_b) <= 3):
            continue
        for _i, _l in enumerate(_b):
            _s = _l.strip()
            if 'http' in _s:
                continue
            _sig = _b[_i + 1].strip() if _i + 1 < len(_b) else ''
            if _s.endswith((',', ';')) or (_sig[:1].islower() and 'http' not in _sig):
                _partidas.append(_s[:60])
    chk(not _partidas, 'Cada linea de un bloque de 2 o 3 es una oracion cerrada (§3.2)',
        'oracion partida en varias lineas del bloque: %s. Una cita larga va en UNA linea suelta, '
        'nunca troceada para hacer bloque (Iker, 21/10)' % ' | '.join(_partidas) if _partidas else '')
    _multi = [len(b) for b in _bs if not es_lista(b) and len(b) > 1]
    if _multi:
        chk(_multi[0] == 2, 'El primer bloque multiple es de DOS, no de TRES (§3.2)',
            'el primero que aparece es de %d. Los doses van antes que los treses'
            % _multi[0] if _multi[0] != 2 else '')

    # 🔧 CORREGIDO EL 2026-09-16 · el zip estaba DESALINEADO y por eso el ritmo
    # del despiece salia mal: `_pat` ya venia filtrado por `not es_lista` y se
    # cruzaba contra `bloques(texto)` SIN filtrar, asi que las longitudes se
    # emparejaban con bloques que no eran los suyos. Efecto real: un bloque de
    # TRES en prosa desaparecia del patron y el check "al menos un bloque de
    # TRES" fallaba con el bloque delante. Es la familia de §0d: un check que no
    # mide lo que dice es peor que no tenerlo.
    _bls_r = [b for b in bloques(texto) if not es_lista(b)]
    if pilar == 'objeto':
        _bls_r = [b for b in _bls_r if not any(l.strip().startswith('→') for l in b)]
    _pat = [len(b) for b in _bls_r]
    # `objeto` estaba FUERA de esta lista y no deberia haberlo estado nunca
    # (Iker, 2026-08-07): el ritmo es regla de formateado, o sea GLOBAL, y el
    # despiece es un post como cualquier otro. Se le excluye solo el tramo de
    # fichas, que va en bloques de 4 por diseño del pilar.
    if pilar in ('meme', 'mapa', 'los10', 'historia', 'leadmagnet', 'evento', 'objeto') and len(_pat) >= 6:
        _ritmo = '-'.join(map(str, _pat))
        # EXCEPCION DEL LEAD MAGNET (Iker, 2026-08-18): aqui el bloque pesado ES
        # la lista numerada de lo que trae el recurso, y el lector quiere llegar
        # a ella cuanto antes, igual que en el mapa quiere llegar a las fichas.
        # Iker: "priorizaria uno de dos, y que entre el gancho y ese bloque
        # numerico haya como mucho dos o tres lineas individuales o un bloque de
        # dos". Exigir ADEMAS un bloque de tres en prosa empuja justo al reves,
        # asi que en este pilar la lista de 3+ lineas ya cumple la densidad.
        _tres = any(n >= 3 for n in _pat)
        if pilar == 'leadmagnet' and not _tres:
            _tres = any(es_lista(b) and len(b) >= 3 for b in bloques(texto))
        chk(_tres, 'RITMO: al menos un bloque de TRES (§3.2)',
            f'ritmo {_ritmo} — todo unos y doses y sin lista numerada de 3+, se lee plano')
        # ⛔ RITMO ESPEJO (Iker, 2026-08-19). El ciclo no es la unica forma de ser
        # predecible: un tramo SIMETRICO tambien lo es, y encima no lo caza ningun
        # check de ciclo. Iker, sobre el meme del 20/08: "antes del primer bloque es
        # un ritmo diferente, pero despues del primer bloque es dos lineas
        # individuales, luego el bloque de dos y luego otra vez dos lineas
        # individuales. Eso es predecible". El tramo era 1-1-2-1-1, un palindromo
        # perfecto alrededor del bloque de venta. Se busca cualquier espejo de 5+
        # bloques; se arregla moviendo un bloque, no alargando el post.
        # El caso concreto es el SANDWICH: dos sueltas, un bloque y otras dos
        # sueltas. Un espejo con alternancia (1-2-1-3-1-2-1) NO cuenta: ese es el
        # ritmo sano de bloque-suelta-bloque y tumbaria posts nuestros que
        # funcionaron. Lo que canta es el par de sueltas repetido a los dos lados.
        _espejo = next((i for i in range(len(_pat) - 4)
                        if _pat[i] == _pat[i + 1] == 1 and _pat[i + 2] > 1
                        and _pat[i + 3] == _pat[i + 4] == 1), None)
        # ⚠️ VA DE AVISO, NO DE FALLO, y el motivo es un dato: el sandwich aparece en
        # DOS ganadores nuestros — el wojak de la caja de herramientas (el mejor post
        # del historico) y el mapa de Navarra (7.9x). Bloquearlo seria silenciar a un
        # ganador, que es justo lo que §3.2 dice que no se hace cuando un check tumba
        # uno. Asi que se canta y lo decide quien escribe.
        chk(_espejo is None, 'RITMO: ningun tramo en espejo (§3.2)',
            ('ritmo %s — hay un tramo 1-1-%d-1-1: dos sueltas, un bloque y otras dos sueltas. '
             'Se lee igual del derecho que del reves, y salta mas cuando el bloque del medio '
             'es el de la venta. Muevelo de sitio, no alargues el post. OJO: no bloquea porque '
             'el wojak de 16.5x y el mapa de Navarra lo llevan'
             % (_ritmo, _pat[_espejo + 2])) if _espejo is not None else '', aviso=True)
        # Ciclo de 2: a-b-a-b con a distinto de b. Ciclo de 4: a-b-c-d-a-b-c-d.
        _ciclo2 = any(_pat[i] == _pat[i + 2] and _pat[i + 1] == _pat[i + 3]
                      and _pat[i] != _pat[i + 1] for i in range(len(_pat) - 3))
        _ciclo4 = any(_pat[i:i + 4] == _pat[i + 4:i + 8] and len(set(_pat[i:i + 4])) > 1
                      for i in range(len(_pat) - 7))
        chk(not (_ciclo2 or _ciclo4), 'RITMO: sin patron que se repita (§3.2)',
            f'ritmo {_ritmo} — se repite un ciclo de {"dos" if _ciclo2 else "cuatro"} bloques. '
            'El lector lo coge y deja de leer. Rompelo MOVIENDO un bloque o pasando un bloque de 2 '
            'a uno de 3, no apilando sueltas: mas de 3 sueltas seguidas tambien es un ritmo '
            'predecible (Iker, 16/10, check de abajo)')
        _sueltas = sum(1 for n in _pat if n == 1) / len(_pat)
        chk(_sueltas >= 0.55, 'RITMO: la linea suelta domina, +55% de los bloques (§3.2)',
            f'ritmo {_ritmo} — solo {_sueltas:.0%} son lineas sueltas. La suelta es la base y '
            'los bloques son la variedad, no al reves')

        # ⛔ RACHA DE SUELTAS (Iker, 2026-10-16). "Que la suelta domine" tenia suelo
        # (+55%) y NO tenia techo, y la pista del check de ciclo decia literalmente
        # "rompelo metiendo lineas sueltas seguidas". Siguiendola, la historia/evento
        # de Asier del 16/10 salio con 6 sueltas seguidas (1-1-2-1-3-1-1-1-1-1-1-2-1,
        # 77%) y en verde. Iker: "un punto tan basico de formateado, de hacer ritmos
        # que no sean predecibles… que no vuelva a ocurrir". MEDIDO el 16/10 en los
        # 23 posts de historia e historia/evento desde julio (+500 imp): ninguno pasa
        # de 4 sueltas seguidas tras el gancho; con 2-3 estan los mejores (mediana
        # 10.409 y 8.654 en historia, 9.328 en historia/evento) y los 3 con racha 4
        # son de los peores (4.511, y 2.568 de mediana en historia/evento). En meme
        # hay 2 con racha 5 (calcan su referencia), asi que fuera de historia es aviso.
        # ⛔ RITMO VISUAL (Iker, 2026-10-21). El patron cuenta las lineas que YO escribo;
        # el lector ve las que PINTA LinkedIn (~78 caracteres por linea en escritorio,
        # medido por Mario el 02/10). Una cita de 185 caracteres "suelta" se ve como un
        # bloque de tres, y en la historia de Asier del 22/10 quedo pegada a un bloque
        # de dos y a uno de tres: "tiene muy pocas lineas individuales… te estas
        # confundiendo con lo de las lineas". Cada bloque se mide en lineas pintadas
        # (la URL cuenta 25, como la acorta LinkedIn) y dos bloques visuales de 2+ no
        # pueden ir seguidos. Sin el gancho, que tiene su propia medida.
        _vis = [sum(-(-len(re.sub(r'https?://\S+', 'x' * 25, _l.strip())) // 78) or 1 for _l in _b)
                for _b in _bls_r[1:]]
        _pegados = [i for i in range(len(_vis) - 1) if _vis[i] > 1 and _vis[i + 1] > 1]
        chk(not _pegados, 'RITMO VISUAL: una linea larga se ve como bloque, y nunca pegada a otro (§3.2)',
            ('como lo pinta LinkedIn: %s. Una linea de mas de ~80 caracteres ocupa varias en '
             'pantalla y se lee como un bloque; entre bloque y bloque tiene que verse una linea '
             'suelta. Acorta la linea larga o separala (Iker, 21/10)' % '-'.join(map(str, _vis)))
            if _pegados else '', aviso=(pilar != 'historia'))
        # Duro solo en historia, donde lo pidio Iker y donde el cuerpo es prosa pura. En el
        # resto es aviso: tres ganadores viejos (la caja de herramientas, "Los 10" del Pais
        # Vasco y "comiendose noes") llevan lineas largas pegadas a bloques (test-validador).
        _racha = _r = 0
        for _n in _pat[1:]:
            _r = _r + 1 if _n == 1 else 0
            _racha = max(_racha, _r)
        if pilar == 'historia':
            chk(_racha <= 4, 'RITMO: como mucho 4 sueltas seguidas tras el gancho (§3.2)',
                f'ritmo {_ritmo} — {_racha} lineas sueltas seguidas. En historia ningun post nuestro '
                'pasa de 4 y con 2-3 estan los mejores. Junta dos sueltas del mismo tema en un '
                'bloque de 2' if _racha > 4 else f'racha maxima {_racha}')
            chk(_racha <= 3, 'RITMO: en historia, mejor 2-3 sueltas seguidas que 4 (§3.2)',
                f'ritmo {_ritmo} — racha de {_racha}: las 3 historias con racha 4 son de las peores '
                '(mediana 4.511 en historia y 2.568 en historia/evento)' if _racha > 3 else '',
                aviso=True)
        else:
            chk(_racha <= 4, 'RITMO: como mucho 4 sueltas seguidas tras el gancho (§3.2)',
                f'ritmo {_ritmo} — {_racha} lineas sueltas seguidas: se lee como una lista de frases. '
                'Junta dos del mismo tema en un bloque de 2' if _racha > 4 else '', aviso=True)
        # Y LA FRECUENCIA VA POR ESTE ORDEN (Iker, 2026-10-16): "mas lineas individuales,
        # luego por frecuencia bloques de dos y luego bloques de tres". Regla suya, sin medir.
        _n2 = sum(1 for n in _pat if n == 2)
        _n3 = sum(1 for n in _pat if n >= 3)
        chk(_n2 >= _n3, 'RITMO: mas bloques de 2 que de 3 (§3.2)',
            f'ritmo {_ritmo} — {_n2} bloque(s) de 2 y {_n3} de 3. El orden de frecuencia es '
            'sueltas, luego doses, luego treses' if _n2 < _n3 else '', aviso=True)

        # §2.0b — EL ARRANQUE DE LA ANAFORA TAMBIEN ROTA, Y NO SOLO EN PELOTEO
        # (Iker, 2026-08-25). La ley de variedad no lo listaba y por eso se colo
        # `La web / La centralita / La persona` una semana despues del
        # `La eche / La eche / La eche` de la historia del 18/08. Iker: "siempre
        # tiene que haber variedad y sorprender... aunque sea otra cuenta, me da
        # igual". Aviso y no fallo duro: `La`, `No` o `Me` son demasiado comunes
        # para vetarlas a ciegas, lo que hacia falta era VERLAS antes de entregar.
        _anaf = []
        for _b in bloques(texto)[1:]:
            if len(_b) < 2 or es_lista(_b):
                continue
            _pr = [normalizar_entidad(l.strip().split()[0]) for l in _b if l.strip()]
            if len(set(_pr)) == 1:
                _anaf.append(_pr[0])
        _qa = ARRANQUE_QUEMADO.get(pilar, {})
        _rep = ([] if historico else
            sorted({a for a in _anaf if a in _qa
                    and quemada(a, _qa[a], VENTANA_ARRANQUE_DIAS, cuenta)}))
        chk(not _rep, 'RITMO: el arranque de la anafora no esta quemado (§2.0b)',
            ('arranques de este post: %s. Repetido: %s. Rota el arranque: si el '
             'anterior empezaba por articulo, este que empiece por VERBO, por '
             'nombre, por lugar o por numero (working-preferences §4)'
             % (', '.join('"%s"' % a for a in _anaf) or 'ninguno',
                ' · '.join('"%s" ya salio en %s' % (a, _qa[a]) for a in _rep)))
            if _rep else ('arranques: %s' % (', '.join('"%s"' % a for a in _anaf) or 'sin anafora')),
            aviso=True)

    # ⚠️ RECORDATORIO DE ENTREGA, en TODOS los pilares (Iker, 2026-08-06). El
    # validador solo ve el texto, asi que la forma de la ENTREGA no la puede
    # comprobar; pero puede recordarmela, que es donde reincido. La comparativa
    # original-vs-el-mio lleva escrita en working-preferences §1e desde el 22 de
    # julio y la he entregado mal tres veces: dos bloques apilados en vez de dos
    # columnas en la misma fila.
    # Si el post CALCA una referencia, su anatomia se mide, no se mira. Vale para
    # cualquier pilar (global §2.2b-MEDIR), por eso el aviso sale con --remix y
    # tambien en meme, que siempre parte de una referencia.
    if remix or pilar == 'meme':
        chk(False, 'ENTREGA: mide la anatomia de la referencia antes de entregar',
            'python scripts/anatomia-referencia.py original.txt mio.txt — compara longitud '
            'del gancho, numero de frases, emoji y DONDE vive, longitud total, bloques y '
            'ritmo. El 2026-08-06 entregue un gancho del DOBLE de largo que el original, '
            'con dos frases en vez de una y el emoji cambiado. La salida va en la entrega '
            '(global §2.2b-MEDIR)', aviso=True)
        # ⛔ SE ME OLVIDO EN LOS DOS MEMES DEL 11/08 Y ESTABA ESCRITO COMO
        # OBLIGATORIO (Iker). `images §4 · Constraints de marca (SIEMPRE, en
        # cualquier variante)` dice fuentes NUESTRAS y paleta del brandbook 2026
        # en TODA imagen con texto, memes incluidos. Un meme calcado sin nuestra
        # tipografia es el meme de otro con nuestro chiste: lo unico que lo hace
        # nuestro es como esta escrito.
        chk(False, 'ENTREGA: el prompt lleva PALETA y TIPOGRAFIA de marca',
            'Bricolage Grotesque en titulos y Switzer en cuerpo, y los colores del brandbook '
            '2026: naranja #fe8238, berenjena #431b44 (el UNICO oscuro), azul bebe #a7c5f9 y '
            'mint claro #ebfff6. Los dos claros van de detalle, nunca de masa principal. '
            'Excepciones: una PLANTILLA DE MEME (foto con letra blanca de meme) va con su letra '
            'y SIN palabra naranja salvo que el original ya lleve una de color (images '
            '§0a-sexta-quater, Iker 29/09). Y TODO LO QUE FINGE SER UN DOCUMENTO O UNA PANTALLA REAL (pantallazo '
            'de red social, correo, chat, y tambien una transcripcion, un acta o un informe): '
            'ahi van la tipografia, el tamano y los colores del ORIGINAL, porque lo que hace '
            'el chiste es reconocer el formato en el primer segundo (§0a-sexta-bis y '
            '§0a-sexta-ter). Y la anatomia (§0i-4)',
            aviso=True)
        chk(False, 'ENTREGA: UN aviso con ⚠️ debajo del prompt, con que adjuntar',
            'UNA sola linea y con el triangulo amarillo, nunca un clip ni dos avisos '
            'separados. Dentro va todo: la foto de la referencia, los instaladores de '
            'Bricolage Grotesque y Switzer, los logos si el pilar los lleva, y la '
            'postproduccion si la hay (working-preferences §1g)',
            aviso=True)
        # ⛔ LA CHECKLIST ENTERA DEL PROMPT DE IMAGEN, EN UN SOLO SITIO.
        # Estaba repartida entre `images §0b` y `§0h` y el 11/08 entregue dos
        # prompts saltandome CUATRO de los cinco puntos: sin paleta, sin
        # tipografia, en tres parrafos, sin el 1:1 y sin la contencion final.
        # Ninguno era una regla nueva: las cinco llevaban semanas escritas.
        chk(False, 'ENTREGA: preguntarle A QUE HORA lo sube (working-preferences §1h)',
            'en cuanto diga que ya esta o que lo sube, preguntar la hora y dar el dato sin '
            'que lo pida, pero el dato BUENO (remedido 01/10 con controles): la manana da solo '
            'un 10-40% mas, no el doble; despues de las 19:00 y el fin de semana, peor. Y '
            'eso sirve para ELEGIR la franja de HOY, nunca para aplazar a manana: dentro de su '
            'jornada (9:00-18:30) lo que esta listo se sube hoy, porque el objetivo es ~9 posts a '
            'la semana, 3 por cuenta (Iker 01/10). Solo se aplaza si lo dice el (working-preferences §1h)',
            aviso=True)
        chk(False, 'ENTREGA: los 7 puntos del prompt de imagen (images §0b + §0h)',
            '1) abre con SOLO HAZ LO QUE TE PIDO en mayusculas · 2) UN SOLO PARRAFO, del '
            'tiron, como se lo explicarias a un amigo · 3) paleta y tipografia de marca '
            '(Bricolage titulos, Switzer cuerpo, naranja #fe8238, berenjena #431b44) · '
            '7) ⛔ DEL COLOR DE LA REFERENCIA NO SE CALCA NADA: se recorre la imagen y se '
            'nombra CADA elemento coloreado con su color nuevo (banda del titulo, rotulos de '
            'los ejes, cajas de etiqueta, flechas, lineas, fondo). Decir "aplica la paleta" no '
            'basta: el 27/08 nombre dos de los cuatro azules y el generador dejo los otros dos. '
            'Y la CAJA solo se queda en las etiquetas de ROL; el titulo y los rotulos de los '
            'ejes van en texto suelto berenjena sobre el fondo, que sobre mint contrasta de '
            'sobra. El modelo es la escalera del 12/08, 121.706 imp (images §0a-ter-CALCO) · '
            '3b) ✏️ TODO LO QUE PINTE EL GENERADOR, EN FLAT ILLUSTRATION, aunque la referencia '
            'sea foto o 3D, y el prompt lo dice ASI, con esas dos palabras (Iker 02/10: "ilustracion '
            'plana de estilo editorial" salio con sombras, volumen y brillos y no era flat): '
            '"flat illustration, colores planos sin sombras, sin degradados, sin volumen ni brillos, '
            'sin contorno negro, caras con lo minimo para entender el gesto, nada fotorrealista ni '
            'en 3D". Nunca una persona real reconocible: se redibuja. Se calcan la maquetacion, el '
            'texto y el chiste; el acabado es el nuestro. No toca a las fotos reales del jefe ni al '
            'pantallazo (images §0a-DIBUJO) · '
            '3b-bis) SI LA REFERENCIA ES UNA CAPTURA O UN COLLAGE DE UNA APP (TikTok, X, correo, '
            'chat), el FORMATO se calca aunque la persona se redibuje: la interfaz que se ve (el '
            'circulo de perfil con el +, el subtitulo pequeño DENTRO del fotograma), el NUMERO de '
            'lineas del texto de arriba y su tamaño, y NINGUNA palabra naranja si el original no '
            'lleva palabra de color. Agrandar el subtitulo o meter la naranja no mejora: rompe que '
            'se lea como captura (Iker 02/10, images §0a-sexta-TIKTOK) · '
            '3b-ter) LA COLOCACION VA EN EL PRIMER PROMPT, en toda imagen generada de cualquier '
            'pilar: el texto de cabecera con el mismo aire por encima que por debajo, y cada '
            'elemento de interfaz DENTRO del marco con el margen de la referencia (02/10: el '
            'titulo quedo con 140 px arriba y 63 abajo, y el boton de TikTok pisando el borde). '
            'Y PARA MOVER ALGO, la frase de Iker: "sube las 2 lineas de texto hacia arriba para '
            'aprovechar el espacio que tiene". Nunca la palabra centrado ni la igualdad de huecos '
            '(images §0c, 02/10) · '
            '3b-quater) EL LEON DEL 07/10, TRES PROMPTS QUE TENIAN QUE SER UNO (images §0h-CHECKLIST checks 14-17): '
            'el GESTO que hace el chiste se pide en el primer prompt EXAGERADO al menos como en la '
            'referencia, descrito rasgo a rasgo (el flat lo suaviza solo: la v1 salio con un leon '
            'tranquilo); el TEXTO de una franja se dicta como "una frase en cada linea, las dos al '
            'mismo tamano, y si no caben, mas pequenas" y "ninguna frase lleva punto final" si el '
            'original no lo lleva; y NUNCA se le da al generador una salida alternativa ("si no cabe, '
            'partela"): la coge. En una EDICION, TODOS los cambios en UN solo prompt sencillo, nunca dos prompts separados (Iker 14/10), y sin plan B · '
            '3c) SI HAY VARIOS PERSONAJES: plano SIN contorno (la silueta pura solo para una figura '
            'de adorno), y cada uno descrito por separado con edad, pelo y ropa distintos; el '
            'generador repite la misma cara y el mismo pijama. Si el personaje ES la gracia (una pelicula, '
            'Wicked el 21/10), sus rasgos y colores iconicos se quedan aunque vaya en flat: piel verde y '
            'sombrero en punta de la bruja, rubia y de rosa la otra; lo que no se reconoce es la cara de la '
            'ACTRIZ, y sus colores mandan sobre la paleta. Y la MIRADA de cada personaje se calca, dicha '
            'por separado (images §0a-DIBUJO). Prueba de la MINIATURA a 360 px: un '
            'objeto grande por bocadillo, sin texto pequeno. Y la cifra del atrezo, creible: ni '
            'redonda ni de digitos repetidos (777.777 no, 487.350 si). El rotulo del atrezo no '
            'repite una etiqueta de la imagen: lleva un chiste del cargo, como la taza LLAMA MAS. '
            'Estilo APROBADO (Iker 01/10, nombre corregido el 02/10): "flat illustration", sin contorno, '
            'piel y pelo en tonos naturales, con el COLOR DEL PELO nombrado por personaje (el '
            'generador lo pinta en berenjena si no). Todo el texto, tambien el del atrezo, en '
            'berenjena, y en un meme NINGUNA palabra naranja salvo que la referencia ya lleve una de color '
            '(30/10: el ojo tiene que ir al dibujo); la cifra del cheque tampoco va en naranja '
            '(images §0a-DIBUJO-2, checklist del primer prompt) · '
            '4) "en formato cuadrado 1:1" SIEMPRE, aunque la referencia sea vertical: '
            'LinkedIn recorta la preview por arriba y por abajo, y 19 de nuestros 20 '
            'outliers son 1:1. ⛔ Y SI LA REFERENCIA ES MAS ALTA QUE ANCHA, que es lo '
            'normal, NO BASTA con pedir el 1:1: hay que anadir "ensanchando el contenido '
            'para que llegue de borde a borde, sin franjas ni margenes a los lados". Si no, '
            'el generador cuadra la imagen metiendo dos columnas blancas y la superficie '
            'extra que buscabas se rellena de nada (images §0b-ANCHO, pasó el 14/08) · '
            '5) cierra con "deja todo lo demas intacto y no toques '
            'nada que no te he pedido", en la ULTIMA frase, nunca al principio · '
            '5b) SI ES UN PANTALLAZO, SE LOCALIZA TODO Y NO SOLO EL IDIOMA: ciudades, '
            'moneda, formato de hora y de fecha, prefijo de telefono y nombres de persona '
            '(y el TELEFONO: 9 cifras en España; un movil 6xx no lleva ciudad, si la pantalla '
            'la ensena es un fijo de su provincia, 943 Gipuzkoa; y si el final va tapado en un '
            'sitio, va tapado en TODOS, images §0a-septima-LOCAL) '
            'pasan a España, igual que ya se adaptan las fechas y las horas. ⛔ EXCEPCION '
            'que manda: si la ubicacion es un DATO REAL de una empresa o persona NOMBRADA '
            '(la sede de una marca que sale en la captura), NO se toca, porque cambiarla es '
            'inventarse un dato comprobable; ahi se reencuadra o se quita la linea, pero no '
            'se falsea. El test: ¿es atrezo o es un dato de alguien? (images §0a-septima-LOCAL) · '
            '6) SI LA IMAGEN ES UN PANTALLAZO CON UNA CUENTA DENTRO (tuit, correo, chat),'
            'de quien es esa cuenta lo decide el ORIGINAL, no la comodidad: si el meme '
            'original captura a un TERCERO, la nuestra tambien va a nombre de un tercero, '
            'y ahi se usa una cuenta-ROL sin cara y sin verificar (el "El de Ventas" del '
            'iMessage, 8,46x), comprobando antes que ese @ no exista de verdad. NUNCA '
            'nuestro propio nombre salvo que el original use el suyo: con nuestra cara el '
            'tuit ajeno se convierte en autobombo y deja de repostearse, y ademas lo firma '
            'el CEO. Si hace falta una foto real nuestra, el prompt pide dejar el circulo '
            'del avatar VACIO como placeholder y se pega a mano (post-workflow §4.4-IDENTIDAD)',
            aviso=True)
        # ⛔ Y EL PILAR ES COPIAR *Y MEJORAR*. Lo que se calca es la esencia,
        # nunca el encuadre malo ni los defectos: el 1:1 es el primer sitio
        # donde se mejora a la referencia, porque casi ninguna lo cumple.
        chk(False, 'ENTREGA: el prompt es UN parrafo, del tiron y sin cortar a mano',
            'los bloques copiables no se parten a los 70 caracteres: el bloque no reajusta '
            'al ancho, asi que quedan el doble de altos con media pantalla vacia a la '
            'derecha, y al pegarlos se llevan los saltos falsos dentro. La unica excepcion '
            'es el TEXTO DEL POST, donde el salto ES contenido (working-preferences §1f)',
            aviso=True)
        chk(False, 'ENTREGA: la FOTO de la referencia y el enlace COMPLETO, en el mensaje final',
            'bajala DE NUEVO en el momento de entregar (las URL de media.licdn.com caducan y '
            'dan 403) y mandala como fichero EN EL MISMO MENSAJE que el post y el prompt, no '
            'suelta a mitad de turno: el 13/08 la adjunte en medio de un turno largo y se '
            'perdio de vista, y sin foto el disenador no puede calcar nada. Comprueba ademas '
            'que el post sigue vivo pidiendolo a la API. Y el ENLACE se pega TAL CUAL lo '
            'devuelve la API, sin acortarlo: ese mismo dia le quite el slug codificado al '
            'share_url para dejarlo limpio y LinkedIn devolvia error. Y VA EN MARKDOWN '
            'PULSABLE, [texto corto](URL completa), nunca en bloque de codigo: completo y '
            'pulsable NO son alternativas, el markdown hace las dos cosas a la vez '
            '(working-preferences §1d-ter y §1d-QUATER)', aviso=True)

    # working-preferences §1e-AB (2026-10-27): cada entrega propone un A/B, de una sola
    # variable y con la metrica del OBJETIVO del post (inscritos o leads, oportunidades,
    # autoridad). Si ya hay uno abierto que este post alimenta, se dice a que brazo suma.
    chk(False, 'ENTREGA: propone un A/B alineado con el OBJETIVO del post',
        'una sola variable, el brazo al que va este post, la metrica del objetivo (leads: inscritos '
        'o altas por 1.000; oportunidades: reuniones y CTR a /solicitar-demo; autoridad: guardados, '
        'envios, seguidores y visitas al perfil) y con que post se compara (misma cuenta y pilar). '
        'Si alimenta uno abierto, a que brazo suma. La fila entra en el registro de A/B del '
        'historial el dia que se publica', aviso=True)
    # working-preferences §1e-PREDICCION (Iker, 2026-08-25, global el mismo dia).
    # La ultima seccion de TODA entrega, en TODOS los pilares. Existe para que
    # Iker audite el CRITERIO sin releerse la entrega: "con tu decision sabre si
    # te has equivocado o no". El validador mira la mecanica; esto ensena la
    # decision.
    chk(False, 'ENTREGA: cierra con la PREDICCION DE VIRALIDAD',
        'ultima seccion del mensaje, titulada 🔮 PREDICCION DE VIRALIDAD. ⛔ TRES BULLETS, '
        'cinco es el techo absoluto, y cada uno de DOS LINEAS COMO MAXIMO. ⛔ Se condensan '
        'varias ideas en cada bullet: NUNCA un bullet por idea. Sin tablas, sin sub-bullets '
        'y sin bloques cercados. Los tres bullets son las tres preguntas, en este orden: '
        '(1) por que ESA referencia y no otra, con las descartadas dentro del mismo bullet '
        'y su metrica (risas absolutas, reposts, encaje de carril); en los pilares sin '
        'referencia, por que ESTA region, sector o angulo; (2) que me llevo intacto y en '
        'que lo he mejorado, las dos cosas juntas; (3) que esta VALIDADO en datos de que '
        'reparte, con el numero medido, LA METRICA QUE VA A DISPARAR LAS IMPRESIONES (el '
        'motor de su pilar: historia = comentarios de debate + likes, meme = risa, peloteo '
        '= guardados y envios, lead magnet = comentarios u hoy guardados; outliers-database '
        '4.0b-MOTOR) con la vara del OUTLIER propio del pilar, y pegada al final la razon para que NO funcione, '
        'que no ocupa bullet propio. Cada bullet lleva su cifra dentro: uno sin cifra es '
        'una opinion (working-preferences §1e-PREDICCION)', aviso=True)

    chk(False, 'ENTREGA: DOS comparativas (referencia + nuestro mejor del pilar)',
        'los dos textos ENTEROS y verbatim, izquierda el original y derecha el mio, '
        'separados por una linea discontinua vertical. Sin etiquetas de gancho ni cuerpo '
        'dentro de las columnas, y sin trocear. No hace falta que sea copiable: es para '
        'mirarla (working-preferences §1e). ⛔ Y VA CADA VEZ QUE CAMBIA EL TEXTO DEL POST, '
        'no solo la primera: si Iker corrige una linea, la comparativa NUEVA va sin que la '
        'pida, porque la que vio compara un texto que ya no existe. El disparador es que '
        'cambie el TEXTO; corregir un analisis o el codigo no la dispara '
        '(§1e-REENTREGA). ⛔ Y SON DOS VISTAS, no una (§1e-DOS): primero contra la '
        'REFERENCIA que remezclamos (¿hemos calcado lo que fuimos a robar?) y despues '
        'contra NUESTRO MEJOR post de ese mismo pilar (¿se parece a lo que ya sabemos '
        'que nos funciona?). Son preguntas distintas y pueden contestar cosas opuestas. '
        'Si no hay referencia externa, se entrega solo la segunda y se dice'
        , aviso=True)

    # ---------- POR PILAR ----------
    # En EVENTO el enlace de inscripcion hace de spam ninja: es el CTA del post.
    tiene_link = ('recursos.neety.com' in cuerpo or 'luma.com' in cuerpo
                  or 'forward.neety.com' in cuerpo)
    # ⛔⛔ ESTA LINEA VA AQUI FUERA Y NO DENTRO DEL `if` DE ABAJO (2026-08-27).
    # Estaba definida dentro del gate de mapa/los10/meme/evento y se LEE mas abajo,
    # en el bloque del ninja que corre para TODOS los pilares. Resultado: en
    # HISTORIA reventaba con UnboundLocalError en cuanto el post llevaba enlace, o
    # sea que el pilar entero era invalidable y el fallo no salia como fallo, salia
    # como traza de Python. Lo caza cualquier historia con Luma, que es justo lo que
    # manda hacer §4.6-SERIE. Mismo patron que el bug del 2026-08-12 documentado
    # aqui abajo: un bloque que se saca del `if` y se deja atras una variable suya.
    _es_evento = ('luma.com' in cuerpo or 'forward.neety.com' in cuerpo)
    if pilar in ('mapa', 'los10', 'meme', 'evento') and not (pilar == 'evento' and EVENTO_AJENO):
        chk(tiene_link, 'Spam ninja presente (§4.4b)', 'falta el link de agendar' if not tiene_link else '')
        # ⛔ 2026-08-06, Iker: este check decia "falta el link de agendar" pero se
        # conformaba con CUALQUIER url de recursos.neety.com, asi que me colo un
        # meme cuyo ninja apuntaba a /prospeccion-manual/. §4.4b es tajante: el
        # spam ninja ES el enlace de agendar. Y el orden de prioridad de conversion
        # no es opinable (Iker, 2026-08-06):
        #   1. AGENDAR — la web con el buscador de clientes que acaba en demo y venta
        #   2. LEAD MAGNET — captura el correo para email marketing, menos friccion
        #      pero tambien menos valor por lead
        # Un lead magnet en el hueco del ninja cambia lo primero por lo segundo sin
        # que nadie lo haya decidido. El MAPA es la unica excepcion y ya la valida
        # su propio check: va a la pagina del mapa, que lleva su CTA a agendar.
        # ⛔ BUG ARREGLADO EL 2026-08-24 (lo caza test-validador.py, que es para lo
        # que existe): este check corria AUNQUE NO HUBIERA NINGUN ENLACE, y entonces
        # soltaba "hay enlace pero no es el de agendar", que es literalmente falso.
        # Cuando falta el ninja entero ya lo dice el check de arriba; este mide OTRA
        # cosa, el DESTINO, y sin enlace no hay destino que medir. Encadenaba 6
        # fallos duplicados en los 6 posts historicos sin ninja.
        # ⛔⛔ ARREGLADO EL 2026-08-27: EL ENLACE DE LUMA OCUPA EL HUECO DEL DE
        # AGENDAR, Y ESTE CHECK NO LO SABIA. La regla esta escrita en global 4.4b
        # desde el 2026-08-21 ("si el evento viaja dentro de una historia, un meme o
        # un mapa, el enlace que viaja es el de Luma y ocupa el hueco del de
        # agendar... no se apilan las dos puertas de conversion en el mismo post") y
        # ese dia se mecanizo SOLO para los checks de dominio, que estaban atados a
        # --pilar evento. Los de meme y los10 se quedaron exigiendo /agendar/ a
        # secas, asi que tumbaban justo el post que la receta manda hacer.
        # Es el caso de libro de feedback_regla_nueva_revisar_codigo: al escribir una
        # regla nueva hay que mirar QUE checks codifican la vieja, no solo el que la
        # motivo.
        # (definido arriba, fuera del gate por pilar — ver el aviso del 2026-08-27)
        if pilar in ('los10', 'meme') and tiene_link:
            # 28/10 (auditoria): desde el 27/10 el gate de un recurso (neety.com/academia/,
            # que puerta_agendar traduce a recursos.neety.com/academia/) puede ser la puerta de
            # cualquier pilar (post-workflow §8.1b), y el correo vale si el tema no toca vender
            # (global §4.4e-PUERTA). Este check solo aceptaba agendar y tumbaba los dos.
            _dest_ok = (any(d in cuerpo for d in ('recursos.neety.com/agendar', 'recursos.neety.com/academia/',
                                                  'recursos.neety.com/correo', 'recursos.neety.com/newsletter'))
                        or _es_evento)
            chk(_dest_ok, 'El spam ninja apunta a una puerta nuestra: reuniones, gate de un recurso o correo (§4.4b, post-workflow §8.1b)',
                'hay enlace pero no es el de agendar. Prioridad 1 = agendar (demo y venta), '
                'prioridad 2 = lead magnet (correo). Solo el mapa enlaza a otro sitio, y '
                'porque su pagina ya lleva el CTA a agendar dentro' if not _dest_ok else '')
    # ⛔ ESTE BLOQUE VA FUERA DEL `if pilar in (mapa/los10/meme/evento)` (2026-08-12).
    # Estaba DENTRO, asi que en HISTORIA (y en cualquier pilar de prosa con enlace)
    # no se comprobaba ninguna regla del ninja: ni el https, ni que no nombre la
    # marca, ni que no sea la ultima linea, ni el caracter 650. Y el comentario del
    # check del 650 ya decia 'historia' expresamente, o sea que la regla estaba
    # escrita y era inalcanzable. Al sacarlo, la primera historia validada fallo el
    # 650 a la primera. Si algun dia se vuelve a tocar: el gate por pilar es solo
    # para 'Spam ninja presente'; las reglas de COMO se escribe el ninja valen para
    # cualquier post que lleve enlace.
    if tiene_link:
        # El enlace SIEMPRE con https:// delante, o LinkedIn puede no detectarlo
        # como clicable (Iker, 2026-07-22). Mismo criterio que los DMs.
        # Que dominio hace de CTA en ESTE post: en evento es luma.com, en el
        # resto recursos.neety.com. Antes estaba escrito a fuego y al meter el
        # pilar evento esto reventaba con StopIteration (Iker, 2026-08-05).
        _dom = ('luma.com' if 'luma.com' in cuerpo
                else 'forward.neety.com' if 'forward.neety.com' in cuerpo
                else 'recursos.neety.com')
        _bare_link = re.search(r'(?<!https://)' + re.escape(_dom), cuerpo)
        chk(not _bare_link, 'El enlace lleva https:// delante (§4.4b regla 8)',
            f'falta https:// delante de {_dom}' if _bare_link else '')
        # ⭐ TODO ENLACE NUESTRO LLEVA UTM (Iker, 2026-08-26) — GLOBAL, §4.4b-UTM.
        # Las tres webs a las que mandamos trafico (agendar, correo/newsletter y
        # Luma) tienen analitica detras, pero sin UTM todo el trafico de LinkedIn
        # entra en el mismo saco y no se sabe QUE publicacion lo trajo. Con el
        # utm_campaign puesto, cada post es una fila. No cuesta nada: LinkedIn
        # acorta el enlace a lnkd.in al publicar, asi que el lector no ve la cola.
        # Formato: utm_source=linkedin & utm_medium=post & utm_campaign={pilar}-{tema}-{ddmes}
        # & utm_content={cuenta}. Ej: historia-euskadi-26ago.
        _urls = re.findall(r'https?://(?:recursos\.neety\.com|luma\.com|forward\.neety\.com)\S*', cuerpo)
        _sin_utm = [u for u in _urls if 'utm_campaign=' not in u]
        chk(not _sin_utm, 'Todo enlace nuestro lleva utm_campaign (§4.4b-UTM)',
            ('sin UTM: %s → pega ?utm_source=linkedin&utm_medium=post&utm_campaign='
             '{pilar}-{tema}-{ddmes}&utm_content={cuenta}, p.ej. historia-euskadi-26ago. '
             'Sin esto, GA4 mete el trafico de todos los posts en la misma fila y no se '
             'sabe cual convierte' % _sin_utm[0][:60]) if _sin_utm else '')
        # ⛔⛔ LA FECHA DEL UTM ES LA DE HOY, Y SE COMPRUEBA CONTRA EL RELOJ
        # (Iker, 2026-08-27). El 27/08 entregue un post con `meme-aura-26ago`
        # porque arrastre el "26" del historial que estaba leyendo, sin mirar la
        # fecha real. Iker: "hoy es 27 de agosto, tienes que revisar muy bien y no
        # hardcodear la fecha del UTM de ayer, sino del dia real en el que estamos
        # hablando". Un dia de mas o de menos rompe la unica cosa para la que existe
        # el UTM: poder cruzar los clics de GA4 con la fila del historial. Y es un
        # DATO, asi que va en la misma familia que cualquier otra cifra del post: se
        # comprueba, no se deduce del contexto (CLAUDE.md, lo que no se negocia).
        #
        # Aviso y no fallo duro a proposito: un post se puede escribir hoy para
        # subirlo manana (§1h manda esperar a la franja de las 10), y ahi la fecha
        # correcta es la de PUBLICACION, que el script no puede saber. Lo que el
        # script si puede hacer es cantar la de hoy y la que hay puesta, que es
        # justo el gesto que no hice.
        _MESES_UTM = ('ene', 'feb', 'mar', 'abr', 'may', 'jun',
                      'jul', 'ago', 'sep', 'oct', 'nov', 'dic')
        _hoy = datetime.date.today()
        _hoy_utm = '%d%s' % (_hoy.day, _MESES_UTM[_hoy.month - 1])
        _hoy_utm0 = '%02d%s' % (_hoy.day, _MESES_UTM[_hoy.month - 1])
        _fechas = set()
        for _u in _urls:
            _m = re.search(r'utm_campaign=([^&\s]+)', _u)
            if not _m:
                continue
            for _f in re.findall(r'(\d{1,2})(%s)' % '|'.join(_MESES_UTM), _m.group(1), re.I):
                _fechas.add((_f[0] + _f[1]).lower())
        _desfasadas = sorted(f for f in _fechas
                             if f not in (_hoy_utm, _hoy_utm0))
        # ⛔ ENDURECIDO EL 2026-09-15 (Iker): "el UTM ponlo a 15 de septiembre, que lo
        # voy a subir ahora aunque sea tarde, y NUNCA hagas ese cambio sin preguntarme
        # antes a menos que yo te hubiese dicho que lo subiamos manana, que no te lo he
        # dicho". O sea: el DEFAULT es HOY, y adelantar la fecha es una decision SUYA,
        # no una deduccion mia de que la franja de manana rinde mas (§1h). Por eso una
        # fecha FUTURA pasa a ser fallo duro salvo que se declare con --publica-manana,
        # igual que se declaran --solo-correo o --sin-menciones. Una fecha PASADA sigue
        # siendo aviso: ahi el modo de fallo es el despiste (arrastrar el dia del
        # historial que estabas leyendo, como el 26ago de un dia 27), no una decision.
        _fut, _pas = [], []
        for f in _desfasadas:
            _mm = re.match(r'(\d{1,2})(%s)' % '|'.join(_MESES_UTM), f)
            try:
                _d = datetime.date(_hoy.year, _MESES_UTM.index(_mm.group(2)) + 1, int(_mm.group(1)))
            except Exception:
                _pas.append(f); continue
            (_fut if _d > _hoy else _pas).append(f)
        if _fut and not publica_manana:
            chk(False, 'El utm_campaign NO lleva fecha FUTURA sin declararla (§4.4b-UTM)',
                'el UTM lleva %s y hoy es %s. Adelantar la fecha da por hecho que el post '
                'sube otro dia, y eso lo decide Iker, no yo: el default es HOY. Si de verdad '
                'se sube manana porque el lo ha dicho, se declara con --publica-manana; si no, '
                'se corrige a hoy' % (', '.join(_fut), _hoy_utm))
        chk(not _pas, 'La fecha del utm_campaign es la de HOY (§4.4b-UTM)',
            ('el UTM lleva %s y hoy es %s (%s). La fecha se mira en el reloj, no se arrastra '
             'del historial que estabas leyendo, que es exactamente como se colo un 26ago un '
             'dia 27' % (', '.join(_pas), _hoy_utm, _hoy.isoformat())) if _pas else
            'hoy es %s' % _hoy_utm,
            aviso=True)
        # ⛔ LA EXCEPCION DE LUMA (comprobado en su documentacion el 2026-08-26):
        # Luma solo lee `utm_source` ("Luma supports the utm_source parameter") y es
        # lo unico que desglosa en Insights > Top Sources. Un utm_campaign ahi no lo
        # ve NADIE, asi que en los enlaces de Luma la IDENTIDAD del post viaja en el
        # source. En nuestras webs es al reves: source=linkedin y la identidad en
        # campaign, que es lo que GA4 espera.
        _luma = [u for u in _urls if 'luma.com' in u or 'forward.neety.com' in u]
        _propias = [u for u in _urls if u not in _luma]
        _mal_source = [u for u in _propias if 'utm_campaign=' in u and 'utm_source=linkedin' not in u]
        chk(not _mal_source, 'El UTM de NUESTRA web lleva utm_source=linkedin (§4.4b-UTM)',
            'con utm_campaign pero sin utm_source, GA4 lo cuenta como referral y no como '
            'campaña, asi que la fila del post no aparece donde se mira' if _mal_source else '')
        _luma_generico = [u for u in _luma
                          if re.search(r'utm_source=(linkedin|post|social)(&|$)', u)
                          or 'utm_source=' not in u]
        chk(not _luma_generico, 'En LUMA la identidad va en utm_source (§4.4b-UTM)',
            'Luma SOLO lee utm_source y es lo unico que sale en Insights > Top Sources: '
            'un utm_source=linkedin le dice que vino de LinkedIn y nada mas, que es lo que '
            'ya sabemos. La identidad del post tiene que ir ahi: '
            'utm_source={pilar}-{tema}-{ddmes}-{cuenta}, p.ej. historia-euskadi-26ago-unai. '
            'El resto de parametros se dejan puestos por si algun dia se activa el '
            'Measurement ID de GA4 en Luma (necesita Luma Plus)' if _luma_generico else '')
        # ⛔ LOS CUATRO PARAMETROS, NO DOS (Mario, 2026-09-14). El check de arriba
        # solo miraba `utm_campaign` y `utm_source`, y por ese hueco se colo el mapa
        # de Cantabria del 01/09 con
        #   ?utm_source=linkedin&utm_campaign=mapa-cantabria-01sep-asier
        # o sea SIN `utm_medium` y con la cuenta metida dentro del campaign en vez
        # de en `utm_content`. El enlace funciona igual y nadie lo nota, que es el
        # peor modo de fallo: sin `medium`, GA4 no puede asignar canal y manda la
        # sesion a "Sin asignar", asi que si la buscas por canal o por fuente/medio
        # no aparece aunque exista. Se tardo media hora en encontrar esos 21
        # usuarios por no tener los cuatro.
        #
        # Solo aplica a NUESTRO dominio: en Luma la identidad va en el source y el
        # resto de parametros son decorativos hasta que se pague el Measurement ID
        # (la excepcion de arriba).
        _sin_medium = [u for u in _propias if 'utm_campaign=' in u and 'utm_medium=' not in u]
        chk(not _sin_medium, 'El UTM de NUESTRA web lleva utm_medium (§4.4b-UTM)',
            'sin utm_medium GA4 no puede asignar canal y la sesion cae en "Sin asignar": '
            'el post no aparece si se busca por canal o por fuente/medio. '
            'Va utm_medium=post' if _sin_medium else '')
        _sin_content = [u for u in _propias if 'utm_campaign=' in u and 'utm_content=' not in u]
        chk(not _sin_content, 'El UTM de NUESTRA web lleva utm_content con la cuenta (§4.4b-UTM)',
            'utm_content={cuenta} es lo que permite ver QUE CUENTA trae los clics cuando '
            'el mismo concepto sale en varias. Meter la cuenta dentro del utm_campaign '
            'la esconde: hay que partir la cadena a mano para leerla' if _sin_content else '')

        chk('Neety' not in cuerpo.split(_dom)[0].split('\n')[-1],
            'Spam ninja NO nombra a Neety (§4.4b)', 'nombrar la marca = publicidad encubierta')
        lineas = [l for l in cuerpo.split('\n') if l.strip()]
        idx = next(i for i, l in enumerate(lineas) if _dom in l)
        chk(idx != len(lineas) - 1, 'Spam ninja NO es la última línea (§4.4b)',
            'el cierre va después' if idx == len(lineas) - 1 else '')
        # 4.4e - desde el 2026-08-18 puede haber DOS bloques con enlace en el mismo
        # post. Las reglas de aqui abajo son las del ninja de AGENDAR, asi que el
        # bloque del correo se salta: tiene las suyas, mas abajo.
        def _es_correo(_b):
            _j = ' '.join(_b)
            return (('/correo' in _j or '/newsletter' in _j)
                    and '/agendar' not in _j and 'luma.com' not in _j)
        for i, b in enumerate(bs):
            if any(_dom in l for l in b) and not _es_correo(b):
                # El spam ninja va FUSIONADO: la broma pegada al CTA + enlace,
                # máx 2 líneas (Iker, 2026-07-22). Antes se exigía separarlas
                # con un blanco; ahora se permite el bloque de 2 (broma / CTA+link)
                # y también el de 1. Lo que NO vale es un bloque de 3+.
                # ⛔ EXACTAMENTE DOS: DOLOR ARRIBA, ENLACE ABAJO (Iker, 2026-08-10).
                # Era 'max 2' y colaba la linea suelta. Medido en clics, el bloque
                # de dos gana en los DOS pilares donde aparece: el meme del 29/07
                # (0,151%, el mejor meme) y el mapa del 14/07 (0,415%, el mejor
                # enlace de venta de la casa). Las cinco lineas sueltas van de
                # 0,094% a 0,017%. Ninguna llega al peor de los dos bloques.
                #
                # No choca con la regla del 07/08 ('una sola oracion + dos puntos
                # + enlace, todo pegado'): esa manda sobre la LINEA DEL ENLACE, y
                # el meme del 29/07 la cumple. Lo que se anade es la linea de dolor
                # ENCIMA, en el mismo bloque.
                # ⚠️ Y EL DOLOR PUEDE IR PEGADO CON SALTO SIMPLE O CON LINEA EN
                # BLANCO. Lo intente como 'bloque de exactamente 2' y suspendia al
                # mapa del 14/07, que es EL MEJOR de la casa (0,415%): el separa sus
                # dos lineas con un blanco. El meme del 29/07 las junta con salto
                # simple. Las dos formas ganan; lo que ninguna de las dos hace es
                # soltar el enlace sin nada delante.
                # DOS LINEAS PEGADAS, Y VALE PARA TODOS LOS PILARES MENOS EL MAPA
                # (Iker, 2026-08-12). Antes esto aceptaba una linea suelta: si el
                # bloque del enlace tenia una sola linea, el codigo cogia como "dolor"
                # la ultima linea del bloque ANTERIOR, que casi nunca esta vacia, y el
                # check daba OK. Por ese agujero pasaron con 43/43 el meme del 06/08 y
                # el del 12/08, los dos peores CTR del ano con alcance real.
                #
                # Auditado en clics reales el 2026-08-12 (enlace NUESTRO, sin mapas
                # porque alli manda el ultra ninja, y con mas de 5.000 impresiones para
                # que el CTR signifique algo):
                #   bloque de 2  n=4  CTR mediano 0,205%  ·  36,7 clics/100 interacciones
                #   linea suelta n=8  CTR mediano 0,069%  ·  16,0 clics/100 interacciones
                # Y el par que lo demuestra sin ruido, dos memes casi iguales en alcance:
                # 29/07 con bloque de dos, 93.744 imp y 142 clics; 06/08 con linea
                # suelta, 95.913 imp y 4 clics. Treinta y cinco veces menos.
                # 🧵 22/10 (Iker): el mapa solo se libra del molde del ninja con el ULTRA
                # NINJA ("Mapa completo aqui:" a la pagina del mapa), que se pincha porque la
                # gente quiere ver el mapa. Con el enlace a Luma o a la demo hay que ganarse el
                # clic como en cualquier pilar: dos lineas, la palabra o la METAFORA del gancho
                # dentro y transicion desde las menciones. Por esta exencion se colo el ninja de
                # Aragon (16/10, 0,034%) que no recogia nada de "la sala de calderas", contra el
                # de Alava (22/09, 0,166%) que recogia "la nevera" (post-workflow §4.0d punto 0).
                # En los mapas viejos de la BD el enlace ya es lnkd.in: siguen exentos.
                _mapa = pilar == 'mapa' and (
                    re.search(r'mapa completo', texto, re.I)
                    # 29/10: el gate de un recurso (neety.com/academia/, que puerta_agendar traduce
                    # a recursos.neety.com/academia/) tambien hay que ganarselo; sin esto el mapa de
                    # Navarra al gate salia exento del molde, la transicion y el contexto.
                    or not re.search(r'luma\.com|solicitar-demo|/agendar|/academia/', texto))
                chk(_mapa or len(b) == 2,
                    'Spam ninja: DOS lineas pegadas, dolor arriba y enlace abajo (§4.4b)',
                    '%d lineas en el bloque del enlace. Con una sola el enlace llega sin '
                    'dolor delante y el CTR se hunde (0,069%% contra 0,205%%); con tres '
                    'deja de ser un guino y se lee anuncio' % len(b)
                    if not _mapa and len(b) != 2 else '')
                # Y la de abajo es la mas CORTA de las dos. Es el orden del corpus
                # de email: linea larga de valor y remate corto justo antes del
                # enlace, para que caiga como punto final. Nuestros dos ganadores lo
                # hacen (52→49 y 73→69 caracteres), pero por 3-4 caracteres, asi que
                # va de AVISO: sirve para desempatar, no es ley.
                if len(b) == 2:
                    _arriba = len(b[0])
                    _abajo = len(re.sub(r'https?://\S+', '', b[1]).strip())
                    chk(_abajo <= _arriba, 'Spam ninja: la linea del enlace no es mas larga que la de arriba (§4.4b)',
                        'arriba %d, abajo %d. En el cuerpo la escalera va de corto a '
                        'largo; en el cierre, al reves' % (_arriba, _abajo)
                        if _abajo > _arriba else '', aviso=True)
                # ⛔ LOS TRES DE ABAJO SALEN DE MEDIR LOS CLICS REALES (2026-08-10).
                # El mapa es el pilar que mas convierte (mediana 84 clics, CTR
                # 0,315%) y el meme el segundo (0,151%), pero el meme del 06/08
                # saco 13 clics con 77.006 impresiones: 0,017%, el peor CTR del
                # ano con alcance real. Los tres motivos, medidos:
                #
                # 1) DONDE CAE EL ENLACE. En los 6 memes con datos, los 4 que
                #    ponen el enlace antes del caracter 511 dan 0,050-0,151%; los
                #    2 que lo pasan de 650 dan 0,042% y 0,017%. Son justo los dos
                #    cuerpos mas largos. El cuerpo largo gana interaccion y pierde
                #    clics: para cuando llega el enlace, ya se han ido.
                #    OJO: solo aplica donde el cuerpo es PROSA. En el mapa y en
                #    los 10 la lista de empresas empuja el enlace mucho mas alla
                #    del 650 y aun asi convierten (el mapa de Asier del 14/07 lo
                #    pone en el 1.400 y saca 0,415%): alli la lista ES el contenido
                #    y el lector la baja entera. En prosa, no.
                # 4.4e - se busca el enlace de AGENDAR, no el primer recursos.neety.com
                # que aparezca: con dos bloques, si el del correo se colara antes, este
                # check estaria midiendo el bloque equivocado.
                _dom650 = (_dom if _dom in ('luma.com', 'forward.neety.com')
                           else 'recursos.neety.com/agendar')
                _pos = cuerpo.find(_dom650) if pilar in ('meme', 'historia', 'entregable') else 0
                _pos = max(_pos, 0)
                # ⛔ EL NINJA VA DESPUES DEL VALOR, NUNCA ANTES (Iker, 2026-10-08).
                # Si el post tiene una lista (numerada o con flechas), el enlace va
                # despues del ultimo punto, igual que en el peloteo va despues de
                # las menciones. Le adelante el ninja a Ismael por encima de sus 4
                # preguntas para cumplir el 650 y Iker: "siempre tiene que ser
                # despues del valor". Con lista, el 650 no manda: manda el valor.
                _pos_link = cuerpo.find(_dom650)
                # 2026-10-08: el mapa no enlaza a agendar sino a su pagina (ultra ninja):
                # sin esto el enlace salia en -1 y el check tumbaba un mapa con el enlace
                # bien puesto detras de las menciones. Se mide el enlace que haya.
                if _pos_link < 0:
                    _m_link = re.search(r'https?://(?:recursos\.neety\.com|neety\.com|luma\.com|forward\.neety\.com)\S*', cuerpo)
                    _pos_link = _m_link.start() if _m_link else -1
                _items = [m.start() for m in re.finditer(r'(?m)^(?:\d+[.)]\s|→)', cuerpo)]
                _ult_item = max(_items) if _items else -1
                chk(not _items or _pos_link > _ult_item,
                    'Spam ninja: va DESPUES del valor (la lista), nunca antes (§4.4b-VALOR)',
                    'el enlace cae en el %d y la lista sigue hasta el %d. El ninja se gana '
                    'despues de dar el valor, como en el peloteo tras las menciones: '
                    'muevelo detras del ultimo punto' % (_pos_link, _ult_item)
                    if _items and _pos_link <= _ult_item else '')
                if _items and _pos_link > _ult_item:
                    _pos = min(_pos, 650)
                # 🪜 TRANSICION AL NINJA (Iker, 20/10, global §4.4b-TRANSICION): el bloque suele
                # estar bien; lo que falla es el SALTO desde las lineas de antes. Se imprimen las
                # 3 ultimas del cuerpo para leerlas en alto con el ninja debajo. Aviso: el oido
                # decide si hay escalon, un lexico no.
                # 22/10: el peloteo con enlace a Luma o a la demo tambien necesita su puente
                # (las menciones -> el dolor del lector -> el ninja); solo el ultra ninja al mapa no.
                if _pos_link > 0 and not _mapa:
                    _antes = [l.strip() for l in cuerpo[:_pos_link].splitlines() if l.strip()]
                    _antes = _antes[:-1]   # la ultima es la propia linea del enlace, cortada
                    _l1 = _antes[-1] if _antes else ''
                    _prev = _antes[:-1]
                    if _prev and re.search(r'\b(miercoles|miércoles|lunes|martes|jueves|viernes)\b', _prev[-1], re.I):
                        _prev = _prev[:-1]   # la linea de contexto del evento no cuenta como cuerpo
                    chk(False, 'ENTREGA: la TRANSICION al ninja es gradual, sin salto (global §4.4b-TRANSICION)',
                        'lee en alto estas lineas y despues el ninja: ' +
                        ' / '.join('"%s"' % x[:55] for x in _prev[-3:]) + ' → "' + _l1[:55] + '". '
                        'Escalera de 4 peldaños: la escena siembra la palabra del ninja, una bisagra '
                        'la saca de la escena, un giro la lleva a ventas y una linea nombra el dolor '
                        'del cliente. Si el dolor aparece por primera vez en el ninja, hay salto',
                        aviso=True)
                    # 🧭 CONTEXTO DEL DESTINO (28/10, global §4.4b-CONTEXTO): en TODOS los
                    # pilares y destinos, las lineas de antes del ninja dicen adonde se manda
                    # al lector como si nos leyera por primera vez. El fallo que lo abrio:
                    # "Quien se perdio el directo..." da por sabido QUE directo. Se caza la
                    # referencia con articulo definido a un evento o recurso (el directo, la
                    # charla, la sesion...) sin ninguna marca de contexto (cuando, formato o que
                    # es) en esas lineas ni en el propio bloque.
                    _zona = ' '.join(_prev[-3:] + [_l1, cuerpo[_pos_link - 120:_pos_link]]).lower()
                    _ref = re.search(r'\b(el|del|al|ese|aquel) (directo|webinar|evento|encuentro)\b|'
                                     r'\b(la|esa|aquella) (charla|sesi[oó]n|presentaci[oó]n|gu[ií]a|plantilla)\b', _zona)
                    # El contexto cuenta solo si va ENCIMA del bloque (el bloque no se
                    # explica a si mismo) y dice QUE ES, no solo cuando: 'del directo de
                    # esta manana' en la linea del enlace no le dice a nadie que directo.
                    _encima = ' '.join(_prev[-5:]).lower()
                    _ctx = re.search(r'\b(dimos|damos|hacemos|hicimos|montamos|organizamos|grabamos|'
                                     r'una (charla|sesi[oó]n|presentaci[oó]n|gu[ií]a|plantilla)|'
                                     r'un (evento|directo|webinar|encuentro))\b', _encima)
                    chk(not (_ref and not _ctx),
                        'Spam ninja: el CONTEXTO del destino se entiende sin conocernos (global §4.4b-CONTEXTO)',
                        ('"%s" da por sabido de que se habla. Antes del bloque, una linea que diga '
                         'que es, cuando o como fue y que le resuelve al lector: "De eso dimos hoy '
                         'una charla por videollamada."' % _ref.group(0)) if (_ref and not _ctx) else '')
                    # ⏳ PASADO SIN AMBIGUEDAD (29/10, global §4.4b-CONTEXTO): con una fecha de
                    # evento delante, "el miercoles 28 organizamos" se lee igual en presente que
                    # en pasado, y un evento que ya paso parece anunciarse. Los -amos/-imos
                    # regulares son iguales en los dos tiempos; los preteritos irregulares no.
                    _solo_pasado = {'hicimos', 'dimos', 'tuvimos', 'vimos', 'fuimos', 'estuvimos', 'pudimos',
                                    'quisimos', 'vinimos', 'dijimos', 'trajimos', 'supimos', 'pusimos'}
                    _fecha_ev = re.search(r'\b(lunes|martes|mi[eé]rcoles|jueves|viernes|s[aá]bado|domingo) \d{1,2}\b'
                                          r'|\b\d{1,2} de (enero|febrero|marzo|abril|mayo|junio|julio|agosto|'
                                          r'septiembre|octubre|noviembre|diciembre)\b', _encima)
                    _ambiguo = sorted({w for w in re.findall(r'\b\w+(?:amos|imos)\b', _encima)
                                       if w not in _solo_pasado})
                    chk(not (_fecha_ev and _ambiguo),
                        'CONTEXTO: un evento pasado no se lee en presente (global §4.4b-CONTEXTO)',
                        ('con "%s" delante, %s se lee igual en presente que en pasado. Si el evento ya '
                         'paso: hicimos, dimos, tuvimos, o una marca (ayer, el pasado miercoles)'
                         % (_fecha_ev.group(0), ', '.join(_ambiguo))) if (_fecha_ev and _ambiguo) else '',
                        aviso=True)
                    chk(False, 'ENTREGA: el contexto antes del ninja, para quien nos lee por PRIMERA vez (global §4.4b-CONTEXTO)',
                        'lee las lineas de antes del bloque como alguien que no nos conoce: ¿sabe que es '
                        'lo que hay detras del enlace, de donde sale, que le resuelve y por que ahora? '
                        'Si falta una, se añade aunque el post pase unos caracteres de su rango: el '
                        'contexto manda sobre la longitud (un poco, no una pagina)', aviso=True)
                # HISTORIA/EVENTO (Iker, 15/10): el ninja va DESPUES de pagar la historia, como
                # en las 5 historias con mejor CTR (enlace entre el 83% y el 92% del texto, con
                # solo el remate detras). Con el tope a 900 eso cae pasado el 650, que sale de
                # dos MEMES en prosa. Ahi el 650 pasa a aviso y manda el 'despues del valor'.
                # 🎚️ BANDA, NO GUILLOTINA (Mario, 20/10): el 650 es una vara ESTADISTICA (dos
                # memes), no fisica. Le cambie 'algunos salio corriendo' por 'uno' para ganar
                # 3 caracteres y la frase pasaba a sonar a indirecta. Hasta +50 (una oracion
                # corta) es aviso; pasado el 700 vuelve a ser fallo (global §4.4b-CLICS).
                chk(_pos <= 700, 'Spam ninja: el enlace cae antes del caracter 650 (§4.4b)',
                    'el enlace cae en el %d. Los 2 unicos posts que lo pasaron de 650 '
                    'son los 2 peores CTR del ano (0,042%% y 0,017%%) frente al '
                    '0,050-0,151%% de los que lo ponen antes del 511' % _pos
                    if _pos > 700 else ('margen: %d caracteres pasado el 650, aviso y no fallo '
                                        '(la narracion manda sobre unas letras)' % (_pos - 650)
                                        if _pos > 650 else ''),
                    aviso=(HISTORIA_EVENTO and pilar == 'historia') or 650 < _pos <= 700)
                # 2) EL ENLACE VA EN LA SEGUNDA LINEA Y ESA LINEA ES CORTA. El
                #    bloque de dos (dolor / promesa corta + enlace) da 0,415% en el
                #    mapa de Asier del 14/07. Fusionarlo todo en UNA linea larga da
                #    0,172% (Unai 07/07). Iker, 2026-08-10: "que el enlace siempre
                #    este en la segunda linea, que esa linea sea corta y punchy".
                #    Se mide SIN la URL: el lector no lee la URL, lee la promesa.
                #    ⛔ Y EL TOPE ES DE LAS DOS LINEAS, NO SOLO DE LA DEL ENLACE
                #    (Iker, 2026-08-13). Este check solo miraba la del enlace y con
                #    un tope de 80, que NO es corto: a 67 caracteres una linea ya se
                #    parte en el movil y el bloque de dos se lee como cuatro. Iker,
                #    viendo el meme del 14/08: "te dije a nivel global que el bloque
                #    de dos con el enlace tuviera cada linea corta, por que me has
                #    puesto esos pedazo de lineas". Baja a 55 y aplica a AMBAS.
                #    ⚠️ Y se dice lo que cuesta, porque no es gratis: con 55 se
                #    habrian marcado la primera linea del tatuaje del 29/07 (69 car,
                #    0,151% de CTR, el mejor del ano) y la de la historia del 13/08
                #    (71). Se elige el criterio de Iker sobre esos dos puntos porque
                #    el que lo ve renderizado en el movil es el. Si algun dia el dato
                #    dice lo contrario, se sube y se anota aqui.
                _sin_url = lambda s: re.sub(r'https?://\S+', '', s).strip()
                _largas = [(i + 1, len(_sin_url(l))) for i, l in enumerate(b)
                           if len(_sin_url(l)) > 55]
                chk(not _largas, 'Spam ninja: LAS DOS lineas cortas, <=55 sin la URL (§4.4b)',
                    ('linea(s) %s. Una linea de mas de 55 se parte en el movil y el bloque '
                     'de dos se lee como cuatro, que es justo lo que el bloque evita. '
                     'Referencias que si funcionaron: 30 y 48 caracteres en la linea del '
                     'enlace' % ', '.join('%d con %d car' % x for x in _largas))
                    if _largas else '%s car' % ' / '.join(str(len(_sin_url(l))) for l in b))
                # 2b) QUE NO PROMETE (global 4.4b-MUNICION, informe del 2026-08-24).
                #     Las dos objeciones de 5 empresas cada una. Van aqui y no en
                #     el post entero a proposito: en el CUERPO se puede hablar del
                #     mensaje automatizado como enemigo; lo que no se puede es
                #     PROMETERLO pegado al enlace.
                _blo2 = ' '.join(b).lower()
                _auto = re.search(PROMESA_AUTOMATISMO, _blo2)
                chk(not _auto, 'Spam ninja: no promete AUTOMATISMO (§4.4b-MUNICION)',
                    ('"%s". Es objecion en 5 empresas del informe: "vimos tantos de estos '
                     'mensajes que directamente los ignoramos, se detecta claramente cuando '
                     'esta automatizado" (Innobide). El que lee el post recibe esos mensajes '
                     'a diario. Lo que si se promete: dejar de buscar para poder contactar, '
                     'el listado que acierta, el interlocutor' % _auto.group(0)) if _auto else '')
                _vol = re.search(PROMESA_VOLUMEN, _blo2)
                # Negado es el ANGULO, no la promesa (Iker, 2026-10-08): "no damos listas
                # a volumen" es el contraste que nos diferencia (§4.4b-ROTACION).
                if _vol and re.search(r'\b(no|nunca|ni|sin)\b[^.:]{0,30}$', _blo2[:_vol.start()]):
                    _vol = None
                chk(not _vol, 'Spam ninja: no vende VOLUMEN, vende acierto (§4.4b-MUNICION)',
                    ('"%s". Prometer cantidad es la queja literal contra Waalaxy y Apollo en 5 '
                     'empresas ("campanas demasiado masivas, ratios muy bajos, mas de volumen"). '
                     'Si el numero esta del lado del ENEMIGO ("mandar 500 lo hace cualquiera, '
                     'dar con el que firma no") el ninja es bueno: ignora este aviso'
                     % _vol.group(0)) if _vol else '', aviso=True)
                # 3) QUE PROMETE. El dolor validado por los clientes en reunion es
                #    ENCONTRAR AL CLIENTE IDEAL, empresa y persona. No el momento.
                #    El ninja de 0,415% dice "te marcamos quien va a comprar y
                #    cuando": identifica primero. El de 0,017% dice "de montar esa
                #    lista nos encargamos nosotros": no identifica a nadie.
                # 4) QUE REPITA LA PALABRA DEL GANCHO, LITERAL. Iker, 2026-08-13:
                #    "quiero que repitas explicitamente la broma o lo punchy del gancho
                #    siempre en el spam ninja". Esto era un AVISO porque yo habia escrito
                #    que "no se puede exigir por lexico", apoyandome en que los dos
                #    mejores ninjas reciclan el chiste sin repetir palabra. Esa
                #    observacion era MIA y ademas chocaba con la regla del ninja SIN
                #    broma (§4.4b, 12/08), que si obliga a repetir el OBJETO y el VERBO.
                #    Iker unifica las dos: la palabra se repite SIEMPRE, haya chiste o
                #    no. Y en cuanto es literal, ya es lexico y pasa a FALLO DURO.
                #    Se compara por raiz de 5 letras sin tildes, para que el "planto" del
                #    gancho case con el "planta" del ninja.
                _stop = {'para', 'como', 'desde', 'entre', 'cuando', 'porque', 'sobre',
                         'todos', 'todas', 'nadie', 'nunca', 'siempre', 'tambien',
                         'tampoco', 'estar', 'tener', 'hacer', 'decir', 'quiere',
                         'queria', 'vender', 'ventas',
                         # 17/09: el check ya mira palabras de 4 letras, porque el chiste
                         # puede vivir en una corta ("Vender es un caos" solo le dejaba
                         # "punto"). Las de 4 letras que no cargan nada, fuera.
                         'pero', 'solo', 'algo', 'esta', 'este', 'esto', 'cada', 'todo',
                         'toda', 'nada', 'mas', 'aqui', 'alli', 'ahora', 'bien', 'hace',
                         'hoy', 'otro', 'otra', 'tras', 'hacia', 'mismo', 'misma', 'tiene',
                         'eres', 'soy', 'fue', 'sin', 'con', 'que', 'una', 'uno', 'unos',
                         'unas', 'sus', 'mis', 'tus', 'les', 'nos', 'era', 'han', 'hay',
                         'vez', 'asi', 'muy', 'ya', 'donde', 'punto'}

                def _sinac(_s):
                    for _a, _b in zip('áéíóúñ', 'aeioun'):
                        _s = _s.replace(_a, _b)
                    return _s
                _pal = [w for w in re.findall(r'[a-záéíóúñ]{4,}', hook_txt.lower())
                        if _sinac(w) not in _stop]
                _raiz = _sinac(' '.join(b).lower())
                _eco = [w for w in _pal
                        if (re.search(r'\b' + _sinac(w) + r'\b', _raiz) if len(w) == 4
                            else _sinac(w)[:5] in _raiz)]
                chk(_mapa or bool(_eco),
                    'Spam ninja: REPITE una palabra del gancho, literal (§4.4b regla 3)',
                    ('el gancho habla de: ' + ', '.join(_pal[:6]) + ', y el ninja no recoge '
                     'ninguna. No basta con girar el chiste de lejos: la palabra que carga la '
                     'broma va DENTRO del bloque, tal cual. Si el post no tiene broma (historia, '
                     'mapa, despiece) se repiten el OBJETO y el VERBO del gancho (gancho "me '
                     'planto el portatil delante" -> ninja "un portatil lleno de filas lo planta '
                     'cualquiera, el nombre de dentro no"). Medido: los que reciclan el gancho '
                     'dan 0,151-0,209%; los genericos, 0,004-0,029%')
                    if not _eco else 'recoge del gancho: ' + ', '.join(_eco[:3]))
                chk(False, 'ENTREGA: repetir la palabra es el suelo, el ninja tiene que GIRAR el chiste',
                    'que la palabra este dentro lo comprueba el check de arriba. Encima, las dos '
                    'lineas tienen que volver esa broma CONTRA el dolor, normalmente en la forma '
                    '"eso lo hace cualquiera, lo otro no". Test: tapa el post y lee solo las dos '
                    'lineas; si valdrian pegadas a cualquier otra publicacion nuestra, estan mal '
                    'aunque lleven la palabra del gancho dentro', aviso=True)
                _blo = ' '.join(b).lower()
                _iden = re.search(r'qui[eé]n|persona|empresa|nombre|decide|firma|compra', _blo)
                # ULTRA NINJA DEL MAPA (global 4.4b-MOLDE, fila 'pagina del mapa'; post-workflow
                # 4.2 Paso 5): va SOLO 'Mapa completo aqui: {link}', y su promesa es el mapa, no
                # la identificacion de /agendar/. Este check obligaba a meter una linea encima
                # (Cantabria 01/09, Extremadura 29/09) contra la receta (Iker, 2026-09-29).
                if _mapa and 'mapa completo' in _blo:
                    _iden = True
                # ⛔ EL NINJA DEL EVENTO PROMETE OTRA COSA, Y ES LA CORRECTA (2026-08-27).
                # "Identificar a la persona" es el contrato de /agendar/ (4.4b-PROMESA:
                # lo que promete el ninja lo decide el DESTINO). El destino Luma vende
                # LA SALA -- quien esta dentro y por que se ha elegido a mano
                # (4.4b, el formato validado de Grace Gong, 11.6x y 14.4x) --, asi que
                # exigirle la palabra "quien compra" es pedirle que mienta sobre lo que
                # hay al otro lado del clic. Se le pide su propia promesa: sala, plazas,
                # sitio o fecha.
                # 🖥️ WEBINAR DEL 28/10 (Iker, 2026-10-08, global §4.4b-WEBINAR). Mismo
                # dominio (Luma) y OTRO motor: es online, gratis y sin aforo, asi que no
                # hay sala que vender ni escasez que contar. Promete lo que se ensena
                # (encontrar las empresas, gratis con LinkedIn, los prompts) y la linea
                # de encima dice cuando, online y gratis. Caduca el 28/10/2026.
                _webinar = '7hhyx07z' in cuerpo
                if _es_evento and _webinar and datetime.date.today() <= datetime.date(2026, 10, 28):
                    _iden = True
                    _prev = ' '.join(bs[i - 1]).lower() if i > 0 else ''
                    # ⏳ FOMO DE TIEMPO (Iker, 2026-10-26). La escasez de PLAZAS sigue
                    # prohibida (no hay aforo), pero el plazo es real: la vispera es el
                    # ultimo dia para apuntarse. Va en la linea de ENCIMA, al lado de la
                    # fecha absoluta, y solo si el post sale la vispera o el mismo dia: es
                    # una marca relativa y escrita antes seria falsa (§4.4b-EVENTO-FECHA).
                    # Antes, "quedan 20 plazas" en la linea de encima pasaba en verde: el
                    # check de escasez solo miraba el bloque de dos.
                    _FOMO_T = (r'quedan?\s+(?:solo\s+|muy\s+)?(?:pocas\s+|unas\s+)?horas|[uú]ltimas\s+horas'
                               r'|[uú]ltimo\s+d[ií]a|queda\s+hoy|menos\s+de\s+24\s+horas'
                               # 26/10: "hoy aun llegas" (Asier) es FOMO de tiempo y no lo veia
                               r'|hoy\s+a[uú]n|a[uú]n\s+(?:llegas|est[aá]s)\s+a\s+tiempo'
                               # 26/10: "no queda ni un dia" (Iker, peloteo de Galicia)
                               r'|ni\s+un\s+d[ií]a|menos\s+de\s+un\s+d[ií]a')
                    _esc = (re.search(r'plazas|aforo|\bsala\b|sillas|[uú]ltim[oa]s|se acaba|quedan', _blo)
                            or re.search(r'plazas|aforo|sillas|entradas|asientos', _prev))
                    _esc_t = _esc and re.search(_FOMO_T, _blo)
                    chk(not _esc, 'WEBINAR: el ninja no vende escasez (§4.4b-WEBINAR)',
                        ('"%s": el plazo es real, pero va en la linea de ENCIMA y solo la vispera '
                         '("Quedan pocas horas para el evento gratis por internet del miercoles 28."); '
                         'el bloque de dos promete lo que te llevas' % _esc.group(0)) if _esc_t else
                        ('"%s": el webinar es online, gratis y sin limite de plazas. La escasez '
                         'seria falsa y ademas sube la barrera que queremos bajar. Se promete lo '
                         'que te llevas (a quien venderle, gratis con LinkedIn, los prompts)'
                         % _esc.group(0)) if _esc else '')
                    _fomo = re.search(_FOMO_T, _prev)
                    if _fomo:
                        _pub = datetime.date.today() + datetime.timedelta(days=1 if publica_manana else 0)
                        _ok_t = datetime.date(2026, 10, 27) <= _pub <= datetime.date(2026, 10, 28)
                        chk(_ok_t, 'WEBINAR: el FOMO de TIEMPO solo la vispera o el mismo dia (§4.4b-WEBINAR, Iker 26/10)',
                            ('"%s" sale el %s y el evento es el miercoles 28 a las 10: antes de la vispera '
                             'es falso. Hasta entonces, la fecha sola ("el miercoles 28")'
                             % (_fomo.group(0), _pub.strftime('%d/%m'))) if not _ok_t else
                            '"%s" con la fecha absoluta al lado' % _fomo.group(0))
                    _f = re.search(r'\b28\b|mi[eé]rcoles', _prev)
                    # 27/10: la VISPERA, "mañana" es la fecha y suena mas natural que el dia
                    # con su numero al lado de un plazo en horas. Solo si el post sale el 27.
                    _pub_f = datetime.date.today() + datetime.timedelta(days=1 if publica_manana else 0)
                    if not _f and _pub_f == datetime.date(2026, 10, 27):
                        _f = re.search(r'ma[ñn]ana', _prev)
                    _on = re.search(r'online|en directo|por internet|desde (tu|el|la|casa)|pantalla|videollamada', _prev)
                    _gr = re.search(r'gratis|gratuit|sin pagar|no cuesta', _prev)
                    # 🎟️ QUE ES UN EVENTO, CON SU PALABRA (Mario, 2026-10-21): "decir una
                    # videollamada se ve como mas pobre que decir un evento"; los ninjas del
                    # presencial decian "evento presencial" y los del webinar ("sesion",
                    # "charla", "directo") no dejaban claro que es. Webinar = evento por
                    # internet; la palabra "webinar" sigue fuera (no la conoce todo el mundo).
                    _ev = re.search(r'(?<![a-záéíóú])(evento|seminario|conferencia)', _prev)
                    _falta = [n for n, v in (('la fecha (miercoles 28)', _f), ('que es online', _on),
                                             ('que es gratis', _gr), ('que es un EVENTO, dicho con la palabra', _ev)) if not v]
                    chk(not _falta,
                        'WEBINAR: la linea de ENCIMA dice cuando, que es online y que es gratis (§4.4b-WEBINAR)',
                        ('falta %s en la linea individual que va justo encima del bloque del '
                         'enlace. El webinar es NUEVO: antes de pedir el clic se dice que el '
                         'miercoles 28 hay una sesion online y gratis. Linea de encima: "%s"'
                         % (' y '.join(_falta), _prev[:90])) if _falta else 'linea de contexto puesta')
                    chk(not re.search(r'videollamada', _prev),
                        'WEBINAR: la linea de encima no lo vende como "videollamada" (Mario, 21/10)',
                        'se lee mas pobre que un evento: "evento gratuito por internet" (Iker 21/10: "en directo por internet" suena raro)' if re.search(r'videollamada', _prev) else '',
                        aviso=True)
                    _web = re.search(r'webinar', _prev + ' ' + _blo)
                    chk(not _web, 'WEBINAR: sin la palabra webinar en el ninja (§4.4b-WEBINAR, brand-voice §2.3)',
                        'anglicismo que encoge la audiencia: "sesion online", "charla online" '
                        'o "te lo ensenamos en directo"' if _web else '', aviso=True)
                elif _es_evento:
                    _sala = re.search(r'sala|plaza|sitio|silla|aforo|septiembre|donostia|mesa',
                                      _blo)
                    chk(bool(_sala), 'Spam ninja de EVENTO: promete LA SALA, no la agenda (§4.4b)',
                        'el enlace va a Luma, asi que la promesa es quien esta DENTRO de la sala y '
                        'que cuesta entrar (el motor medido: 11.6x y 14.4x). No vale prometer '
                        'ponentes ni programa, y tampoco la identificacion de /agendar/, que es el '
                        'contrato de OTRO destino (4.4b-PROMESA)'
                        if not _sala else 'promesa de sala: "%s"' % _sala.group(0))
                    _iden = True
                    # ⛔⛔ 4.4b-EVENTO-CONTEXTO (Iker, 2026-08-27) — LA LINEA QUE
                    # DICE QUE HAY UN EVENTO VA JUSTO ENCIMA DEL BLOQUE. Iker:
                    # "siempre que hacemos el spam de la web del evento falta una
                    # linea antes de ese bloque de dos en el que explicitamente
                    # digamos que el dia tal en Donostia vamos a hacer un evento
                    # presencial. Los bloques de spam de los otros enlaces siempre
                    # los haces bien, pero este fallas, porque es nuevo".
                    # POR QUE SOLO LE PASA A ESTE ENLACE: /agendar/ y /correo/ se
                    # explican solos (una reunion, un correo) y el mapa lleva el
                    # nombre de la region dentro. Un evento NUEVO no lo conoce
                    # nadie: sin fecha, sitio y la palabra presencial delante, el
                    # bloque de dos pide un clic a un sitio que el lector no sabe
                    # que existe. El ninja vende LA SALA; esta linea dice que la
                    # sala existe, cuando y donde.
                    # ⏳ CADUCA SOLA EL 24/09/2026: pasado el evento, este check no
                    # corre. Iker: "dentro de un mes lo dejaremos de hacer, evento
                    # ya pasado". Cuando llegue el dia, esto se borra entero.
                    _hoy_ev = datetime.date.today()
                    if _hoy_ev <= datetime.date(2026, 9, 24):
                        _prev = ' '.join(bs[i - 1]).lower() if i > 0 else ''
                        _f = re.search(r'\b24\b', _prev)
                        _si = 'donostia' in _prev
                        _pres = re.search(r'presencial|en persona|cara a cara|nos vemos'
                                          r'|nos juntamos|evento', _prev)
                        _falta = [n for n, v in (('la fecha (24)', _f), ('Donostia', _si),
                                                 ('que es presencial', _pres)) if not v]
                        chk(not _falta,
                            'EVENTO: la linea de ENCIMA dice que hay evento, cuando y donde (§4.4b-EVENTO-CONTEXTO)',
                            ('falta %s en la linea individual que va justo encima del bloque del '
                             'enlace. El evento es NUEVO y nadie lo conoce: antes de pedir el clic '
                             'hay que decir en una linea suelta que el 24 de septiembre hacemos un '
                             'evento presencial en Donostia. Los otros enlaces (agendar, correo, '
                             'mapa) se explican solos y por eso alli no hace falta. Linea de '
                             'encima: "%s"' % (' y '.join(_falta), _prev[:90]))
                            if _falta else 'linea de contexto puesta encima del bloque')
                        # ⛔ Y LA LINEA DE CONTEXTO TAMBIEN ROTA (Iker, 2026-09-15).
                        # La regla de §4.4b-EVENTO-CONTEXTO fijaba las tres PIEZAS
                        # (24 · Donostia · presencial) y nadie dijo que la FRASE
                        # tuviera que cambiar, asi que se convirtio en un tic:
                        # "El 24 de septiembre montamos un evento presencial en
                        # Donostia" se ha publicado LITERAL cuatro veces (Unai 02/09,
                        # Iker 08/09, Asier 09/09, Unai 11/09) y la variante con
                        # "hacemos", una mas (Iker 01/09). Es exactamente lo que
                        # §2.0b prohibe: la publicacion nueva tiene que notarse nueva.
                        # Lo que NO rota son las tres piezas; lo que rota es el VERBO
                        # y el orden. Al publicar, la frase usada entra aqui.
                        # Fecha = la ULTIMA vez; caduca y va por cuenta (quemada()).
                        _EV_QUEMADA = {
                            'os esperamos en donostia': '2026-09-22 Iker 22/09, mapa de Álava',
                            'hacemos evento presencial en donostia': '2026-09-22 Unai 22/09, meme del correo a "Direccion"',
                            'montamos un evento presencial': '2026-09-11 Unai 02/09 y 11/09, Iker 08/09, Asier 09/09 — cuatro veces LITERAL',
                            'hacemos un evento presencial': '2026-09-01 Iker 01/09',
                            'el jueves 24 hacemos': '2026-09-15 Iker, 15/09',
                            'nos vemos en donostia para': '2026-08-26 Unai 24/08 y Asier 26/08',
                            'tenemos evento presencial': '2026-09-15 Unai 15/09',
                            'abrimos las puertas de un evento': '2026-09-16 Asier 16/09, despiece de Bizkaia',
                            'organizamos un evento presencial': '2026-09-17 Iker 17/09',
                            'nos juntamos en un evento presencial': '2026-09-18 Unai 18/09, cartel de ponentes',
                            'hay evento presencial en donostia con los que compran': '2026-09-18 Asier 18/09, meme',
                        }
                        _evq = [f for f in _EV_QUEMADA if f in _prev
                                and quemada(f, _EV_QUEMADA[f], VENTANA_NINJA_DIAS, cuenta)]
                        chk(not _evq,
                            'EVENTO: la frase de contexto no esta quemada (§4.4b-EVENTO-CONTEXTO)',
                            ('"%s" ya salio en %s. Las tres piezas (24 · Donostia · presencial) '
                             'no se tocan; lo que rota es el VERBO y el orden. Libres: '
                             'nos juntamos, nos sentamos, os esperamos' % (_evq[0], _EV_QUEMADA[_evq[0]]))
                            if _evq else '')
                # 4.4b-EXPLICITO (Iker, 2026-08-27) - LA LINEA DEL ENLACE SE LEE SOLA.
                # El vicio: el tope de 55 caracteres empuja a tachar el complemento
                # del sustantivo, la frase sigue siendo gramatical y el lector se
                # queda sin saber de que le hablas. "El nombre lo ponemos nosotros":
                # el nombre de QUE. Es la misma familia que 2.5b-SUSTANTIVO, que se
                # escribio solo para las CIFRAS y por eso no cazaba los sustantivos.
                # AVISO y no fallo duro: que un sustantivo pida complemento es
                # criterio, y una lista cerrada tumbaria ninjas buenos.
                # Se mira el BLOQUE entero, no solo la linea del enlace: el molde
                # ganador (tatuaje, 0,151%) pone la carencia en la linea 1 y la
                # recoge con un demostrativo en la 2 ("Esa parte ya la tenemos
                # hecha"). La elipsis solo es fallo cuando NINGUNA de las dos
                # dice de que va (4.4b-EXPLICITO, la auditoria del 27/08).
                _enl = ' '.join(b)
                _hueros = [w for w in ('el nombre', 'ese nombre', 'esa parte',
                                       'esa lista', 'esos datos', 'ese trabajo',
                                       'esa gente')
                           if re.search(r'\b%s\b(?!\s+(de|del|que|con))' % w,
                                        _enl, re.I)]
                chk(False, 'ENTREGA: la linea del enlace se lee SOLA (§4.4b-EXPLICITO)',
                    'tapa el post y lee solo esa linea: si un sustantivo pide un '
                    'complemento para entenderse, se lo pones. "El nombre" -> "el '
                    'nombre del que compra dentro". Un director comercial de 55 no '
                    'reconstruye el referente, se va. Y si no cabe en los 55, se '
                    'recorta por OTRO lado (un articulo, una preposicion, el '
                    'complemento de sitio), NUNCA la palabra que dice de que hablamos'
                    + (' — aqui: %s' % ', '.join('"%s"' % w for w in _hueros)
                       if _hueros else ''), aviso=True)
                # LA LINEA DEL ENLACE DICE QUIEN LO HACE: "nosotros" (Iker 22/09 y
                # Mario 02/10). Lo quitaba para caber en los 55 y la regla ya
                # estaba escrita. Medido el 02/10 (posts a /agendar/ desde julio):
                # con y sin "nosotros" el CTR empata (historia 0,295% contra 0,319%,
                # n=4 y 4; meme 0,118% contra 0,099%, n=8 y 7), asi que decide la
                # claridad para el lector mayor. Aviso: hay ganadores sin el.
                _l2n = re.sub(r'https?://\S+', '', b[-1])
                # Afinado el mismo 02/10 (Mario): "te lo decimos" ya dice quien, porque
                # el "te" le habla al lector y el verbo va en 1a plural. Si no caben
                # los dos, se queda el "te" y sale el "nosotros", nunca al reves.
                if (not re.search(r'\bnosotros\b', _l2n, re.I)
                        and not re.search(r'\bte\b(\s+\w+){0,2}\s+\w+mos\b', _l2n, re.I)):
                    chk(False, 'ENTREGA: la linea del enlace dice QUIEN lo hace ("te lo ...mos" o "nosotros")',
                        'linea: "%s". No lleva ni "nosotros" ni "te + verbo en -mos" ("te lo '
                        'decimos", "te lo damos"). Si no caben los dos, se queda el "te", '
                        'que le habla al lector. En CTR empata con y sin "nosotros" (n '
                        'pequeno): manda que el lector no tenga que deducir quien ofrece'
                        % _l2n.strip(), aviso=True)
                # LA LINEA DEL ENLACE NO VENDE EL PRODUCTO COMO EXCEL O LISTA (Iker,
                # 2026-10-13). "Ese mismo Excel con IA te lo montamos" daba a entender
                # que la herramienta hace Excels, y no: propone empresas y personas que
                # el comercial aprueba. El Excel o la lista pueden ser la NORMA de la
                # linea 1 (lo que se hace a mano); la 2 promete detectar o acertar.
                if re.search(r'\b(excel|hojas? de c[aá]lculo|listas?|listados?)\b', _l2n, re.I) \
                        and not re.search(r'\bno\b[^.]*\blistas?\b', _l2n, re.I):
                    chk(False, 'ENTREGA: la linea del enlace no vende el producto como EXCEL o LISTA (global 4.4b-NO-EXCEL)',
                        'linea: "%s". El Excel o la lista pueden ser lo que se hace a mano '
                        '(linea 1), nunca lo que ofrecemos: la herramienta detecta y propone '
                        'empresas y personas que tu comercial aprueba. Cambia la promesa a '
                        'detectar, acertar o dar con quien compra' % _l2n.strip(), aviso=True)
                # INFORME DE CLIENTES DEL 15/10 (global 4.4b-MUNICION-1510, Iker 16/10).
                # Tres objeciones que han crecido de golpe y caben en una regex:
                #  - descubrir empresas o un mercado que no conoces: 17 empresas, 16 ICP
                #    ("me los conozco todos de memoria"). La que mas crece del informe.
                #  - "eso me lo hace ChatGPT": 17 empresas, 13 ICP. "Con IA" en la promesa
                #    nos mete en la caja que ya tienen gratis (y n=0 en clics, 13/10).
                #  - marcas de competidor y creditos: publicidad comparativa y precio,
                #    que no salen en publico.
                # Avisos: la linea 1 SI puede usar la norma ("los que ya conoces te los
                # da cualquier chat"), por eso lo de descubrir y la IA mira solo la 2.
                _desc = re.search(r'\bdescubr\w*|\b(empresas?|clientes?|mercados?)\s+(nuev[oa]s?|que\s+(a[uú]n\s+)?no\s+conoc\w*)'
                                  r'|\b(las|los)\s+que\s+(a[uú]n\s+)?no\s+conoc\w*', _l2n, re.I)
                if _desc:
                    chk(False, 'ENTREGA: la linea del enlace no promete DESCUBRIR empresas nuevas (global 4.4b-MUNICION-1510)',
                        'linea: "%s" ("%s"). 17 empresas (16 ICP) objetan justo eso: en su nicho '
                        'ya se conocen a todos. Lo que les falta es la persona de dentro (16, 15 '
                        'ICP): promete eso. Excepcion: post de exportacion o pais nuevo'
                        % (_l2n.strip(), _desc.group(0)), aviso=True)
                _ia2 = re.search(r'\b(con\s+ia|la\s+ia|una\s+ia|inteligencia\s+artificial|chat\s?gpt|copilot'
                                 r'|claude|gemini|agentes?)\b', _l2n, re.I)
                if _ia2:
                    chk(False, 'ENTREGA: la linea del enlace no promete IA (global 4.4b-MUNICION-1510)',
                        'linea: "%s" ("%s"). 17 empresas (13 ICP) creen que un chat de IA les hace '
                        'lo mismo gratis, y 13 dicen que lo automatico se nota. La linea 2 promete '
                        'lo que el chat no da: la persona de dentro, las que encajan de verdad'
                        % (_l2n.strip(), _ia2.group(0)), aviso=True)
                _marca = re.search(r'\b(chat\s?gpt|copilot|gemini|kompass|informa|alimarket|sales\s+navigator'
                                   r'|apollo|waalaxy|cr[eé]ditos?|suscripci[oó]n|tarifas?)\b',
                                   re.sub(r'https?://\S+', '', ' '.join(b)), re.I)
                if _marca:
                    chk(False, 'ENTREGA: el ninja no nombra competidores ni creditos (global 4.4b-MUNICION-1510)',
                        '"%s". Una marca en el bloque es publicidad comparativa dentro de LinkedIn '
                        '(4.4b-LICENCIA), y creditos o tarifas son nuestro precio, que no sale en '
                        'publico. Se dice como ellos: un chat, una base de datos, la licencia'
                        % _marca.group(0), aviso=True)
                # QUE EL BLOQUE NO CAIGA A TRES LINEAS EN ESCRITORIO (Mario, 2026-10-02).
                # Medido sobre su captura de un post publicado: 75 caracteres ocupan
                # 674 px de ~706 utiles (9 px por caracter), o sea que caben ~78.
                # LinkedIn deja el enlace en ~24 (lnkd.in/xxxxxxxx) + 1 espacio, asi
                # que el TEXTO de la linea del enlace tiene ~53 de techo y 51 con
                # margen. El tope duro sigue en 55 (movil); esto es aviso.
                if len(_l2n.strip()) > 51:
                    chk(False, 'ENTREGA: la linea del enlace <=51 para que no caiga a 3 lineas (escritorio)',
                        '%d car + 25 del enlace acortado = %d. Medido el 02/10: caben ~78 por '
                        'linea en escritorio; por encima de 51 de texto el enlace puede saltar '
                        'a una tercera linea' % (len(_l2n.strip()), len(_l2n.strip()) + 25),
                        aviso=True)
                # 4.4b-BLOQUE (Iker, 2026-08-27) - LAS DOS LINEAS SON UNA UNIDAD.
                # La 1 nombra la CARENCIA y la 2 cubre EXACTAMENTE esa carencia.
                # Si la 1 solo afirma algo, la 2 llega de la nada y el lector se
                # pierde. El check de "repite una palabra del gancho" empuja justo
                # al fallo: para colar los sustantivos del gancho, la linea 1 se
                # convierte en afirmacion en vez de setup. Aviso, no fallo duro:
                # que una frase nombre una carencia es criterio.
                _l1 = b[0] if len(b) > 1 else ''
                _carencia = re.search(r'\bno\b|cualquiera|lo f[aá]cil|es f[aá]cil'
                                      r'|lo caro|lo dif[ií]cil|ni\b|nadie|ning'
                                      # 2026-09-28: `nunca` y `jamas` son la norma negada
                                      # con intensificador (global §4.4b-ANTECEDENTE:
                                      # `no te sienta` -> `nunca te sienta`). Sin ellos el
                                      # aviso se quejaba justo del ninja bien escrito.
                                      r'|\bnunca\b|\bjam[aá]s\b', _l1, re.I)
                chk(False, 'ENTREGA: la linea 1 del ninja nombra la CARENCIA (§4.4b-BLOQUE)',
                    'las dos lineas son UNA unidad: la 1 dice que es lo facil y QUE FALTA, '
                    'y la 2 cubre exactamente eso. Si la 1 solo afirma algo, la 2 llega de '
                    'la nada. El molde medido es el del tatuaje (0,151%%, el mejor CTR del '
                    'ano): "Tatuarse es lo facil. Lo caro es saber de quien tiene que ser '
                    'el logo." / "Esa parte ya la tenemos hecha:". Test: lee las dos solas '
                    'y pregunta si la 2 se podria cambiar por cualquier otra oferta nuestra '
                    'sin que se note; si se puede, la 1 no ha montado nada. Linea 1: "%s"%s'
                    % (_l1.strip(), '' if _carencia else
                       ' — ⚠️ no encuentro ninguna marca de carencia (no, ni, nadie, '
                       'cualquiera, es facil, lo caro) en ella'), aviso=True)
                # 4.4b-MOLDE (Iker, 2026-08-27) - LA BISAGRA: LA LINEA 2 RECOGE LA 1.
                # El bloque de dos es UNA unidad: la 1 nombra la carencia y la 2 la
                # cubre (4.4b-BLOQUE). Lo que las cose es un DEMOSTRATIVO que apunta a
                # la linea de arriba ("Esa parte ya la tenemos hecha", tatuaje 0,151%)
                # o la repeticion de un sustantivo suyo. Sin bisagra, las dos frases
                # son correctas por separado y el bloque no significa nada junto: es
                # exactamente el fallo del 27/08, "Solo hay 80 plazas" colgado debajo
                # de "no te sienta en la sala con los que compran".
                # Se comprueba SOLO esto del molde porque es lo unico mecanizable: que
                # la 2 CUBRA de verdad es criterio y va en el test de los 10 segundos.
                # OJO: _enl de arriba es el BLOQUE ENTERO unido (lo usa el check de
                # 4.4b-EXPLICITO, que mira las dos lineas juntas a proposito). Aqui
                # hacen falta SEPARADAS, asi que se sacan del bloque: la 2 es la que
                # lleva la URL y la 1 la de encima. Sin esto el check se comparaba
                # consigo mismo y daba OK en falso, probado contra el bloque roto.
                _ix = next((k for k, l in enumerate(b) if 'http' in l), len(b) - 1)
                _l1 = b[_ix - 1] if _ix > 0 else ''
                _l2 = b[_ix]
                # La serie 'est-' (esta, este, esto) faltaba y era un hueco de verdad:
                # 'En ESTA si te sentamos' es una bisagra perfecta y el check la
                # daba por rota. Van las dos series, la de lejos (esa/ese) y la de
                # cerca (esta/este), mas los adverbios de lugar.
                _dem = re.search(r'\b(es[ae]|es[ao]s|eso|est[aeo]s?|ah[ií]|all[ií]|aqu[ií])\b', _l2, re.I)
                _pal1 = {w.lower() for w in re.findall(r'\b[a-zA-ZáéíóúñÁÉÍÓÚÑ]{5,}\b', _l1)}
                _pal2 = {w.lower() for w in re.findall(r'\b[a-zA-ZáéíóúñÁÉÍÓÚÑ]{5,}\b', _l2)}
                _eco12 = sorted(_pal1 & _pal2)
                # El 'si' que responde al 'no' de la 1 tambien cose (4.4b-EXCEPCION):
                # 'Una pieza no te sienta... / Nosotros si, pero...' (Iker, 16/09,
                # que pidio no repetir 'sala'). Recupera el verbo sin escribirlo.
                if not _dem and re.search(r'\b(no|nunca|nadie)\b', _l1, re.I):
                    _dem = re.search(r'\bs[ií]\b', _l2, re.I)
                chk(bool(_dem) or bool(_eco12),
                    'Spam ninja: la linea 2 RECOGE la 1, es una bisagra (4.4b-MOLDE)',
                    ('la linea 2 no apunta a la 1 con ningun demostrativo ni repite una '
                     'palabra suya, asi que las dos frases son correctas por separado y '
                     'el bloque no significa nada junto. Cose la 2 a la 1: "Esa parte ya '
                     'la tenemos hecha" (tatuaje, 0,151%%), "A esa sala solo entran 80". '
                     'L1: %s | L2: %s' % (_l1[:60], _l2[:60]))
                    if not (_dem or _eco12) else
                    'bisagra: %s' % (('"%s"' % _dem.group(0)) if _dem
                                     else 'repite ' + ', '.join(_eco12[:2])),
                    aviso=True)
                chk(bool(_iden), 'Spam ninja: promete IDENTIFICAR, no solo el momento (§4.4b)',
                    'el bloque no nombra a quien vas a encontrar. El momento es el '
                    'dolor secundario: los clientes compran la identificacion de la '
                    'empresa y la persona' if not _iden else '')
                break
        # post-workflow §4.4 Paso 5 — SI HAY SPAM NINJA, EL CIERRE NO ES OTRO CTA.
        # Aunque global §4.4b diga que el spam ninja no consume la regla del UNO,
        # en la practica compite: el que iba a clicar se va a comentar, y la
        # prioridad es el clic. El cierre es un bold statement, no otro CTA.
        # Las lineas de menciones (→) son NOMBRES de empresa, no piden nada: el
        # mapa de Alava del 22/09 cayo aqui por "DIREMA - Maquinaria de
        # embotellado, etiquetado y embalaje". Se miran solo las lineas de prosa.
        _prosa_cta = '\n'.join(l for l in cuerpo.split('\n') if not l.lstrip().startswith('→'))
        m = re.search(r'\b(etiqueta|etiquetad|menciona|comenta|comparte)\w*\b', _prosa_cta, re.I)
        chk(not m, 'Con spam ninja, el cierre NO es otro CTA (§4.4 Paso 5)',
            f'"{m.group(0)}" apila un 2o CTA sobre el enlace. Cierra con bold statement'
            if m else '')

    # ============================================================================
    # §4.4e - EL SEGUNDO SPAM NINJA: EL BLOQUE DEL CORREO (Iker, 2026-08-18)
    # ============================================================================
    # Todo nuestro alcance desembocaba en dos puertas caras: descargarse un recurso
    # o rellenar el formulario de agendar. El correo es el paso anterior, con menos
    # friccion. El bloque hereda ENTERA la forma de 4.4b y solo cambia el destino y
    # el dolor, asi que aqui se re-comprueba la forma sobre el bloque nuevo (el
    # bucle de arriba se lo salta a proposito) y se anaden las reglas propias.
    #
    # El riesgo esta dicho en 4.4e y se mide, no se supone: toda la doctrina del
    # ninja esta construida sobre UNA puerta, y la auditoria del 12/08 mide que
    # cuando la puerta esta peor puesta el post gusta mas y se pincha menos
    # (eng/1k x4, clics de 142 a 4). El que puede perder es agendar, que es el caro.
    # ⛔⛔ UNA SOLA PUERTA POR POST (Iker, 2026-08-27) — CANONICO, §4.4e-UNA.
    #    El doble bloque se retira entero. MEDIDO sobre los 3 unicos posts de la
    #    casa que lo llevaron: los TRES tienen link_url VACIO en la BD y ningun
    #    clic (Iker 19/08 capado a 133 imp, Iker 20/08 con 13.439, Asier 20/08 con
    #    3.225), contra 8 de 8 memes de un solo enlace que SI registran link_url y
    #    clics (76, 28, 28, 26, 12, 7, 5, 4). Con dos enlaces perdemos la
    #    atribucion entera: da igual si es friccion o si LinkedIn deja de medir,
    #    el resultado es cero dato y cero clic. La pagina del MAPA no cuenta como
    #    puerta: es el contenido que el post lleva nombrando desde el gancho.
    _puertas = set()
    for _u in re.findall(r'https?://[^\s]+', cuerpo):
        if 'recursos.neety.com/agendar' in _u:
            _puertas.add('agendar')
        elif 'recursos.neety.com/correo' in _u or 'recursos.neety.com/newsletter' in _u:
            _puertas.add('correo')
        elif 'luma.com' in _u or 'forward.neety.com' in _u:
            _puertas.add('evento')
    chk(len(_puertas) <= 1, 'UNA sola puerta por post: nunca dos enlaces (§4.4e-UNA)',
        ('lleva ' + ' + '.join(sorted(_puertas)) + '. Se elige UNA segun el tema y el pilar '
         'y la otra se QUITA: 3 de 3 posts con dos enlaces se quedaron sin link_url y sin '
         'un solo clic medido') if len(_puertas) > 1 else '')
    _correo = 'recursos.neety.com/correo' in cuerpo or 'recursos.neety.com/newsletter' in cuerpo
    if _correo:
        _bl = bloques(cuerpo)
        _j = lambda _b: ' '.join(_b)
        _i_cor = next((i for i, b in enumerate(_bl)
                       if '/correo' in _j(b) or '/newsletter' in _j(b)), None)
        _dom_ag = ('luma.com' if 'luma.com' in cuerpo
                   else 'forward.neety.com' if 'forward.neety.com' in cuerpo
                   else 'recursos.neety.com/agendar')
        _i_ag = next((i for i, b in enumerate(_bl) if _dom_ag in _j(b)), None)
        _cb = _bl[_i_cor] if _i_cor is not None else []
        _cj = _j(_cb)

        # 1) DONDE NO VA. Mapa: manda el ultra ninja, y rinde precisamente porque
        #    nada en el post huele a venta (es el pilar que mas clics da del
        #    historico). "Los 10": es el unico pilar con quejas reales de CEOs, y el
        #    diagnostico escrito es que un homenaje que acaba en un enlace convierte
        #    a la empresa mencionada en decorado de un anuncio; dos enlaces lo
        #    duplican encima de 10 personas nombradas. Lead magnet: su motor entero
        #    es el conteo de comentarios y cualquier enlace lo parte.
        _veto = {'mapa': 'en el mapa manda el ultra ninja y el correo va en la PAGINA del mapa',
                 'los10': 'el enlace ya convierte el homenaje en decorado de un anuncio, y dos lo duplican',
                 'leadmagnet': 'el motor es el conteo de comentarios y cualquier enlace lo parte'}
        chk(pilar not in _veto,
            'Doble ninja: el bloque de correo NO va en mapa, "Los 10" ni lead magnet (§4.4e)',
            _veto.get(pilar, '') + '. En lead magnet el correo entra por el DM privado y por '
            'el consentimiento del gate, no por el post' if pilar in _veto else '')

        # 2) ORDEN. El de agendar no se mueve de su posicion canonica, que es la
        #    unica medida (antes del caracter 650 en prosa, tras el reveal en
        #    peloteo). El nuevo ocupa el hueco que sobra, no le quita el sitio.
        # ⛔ EL CASO NUEVO: EL CORREO VA SOLO (Iker, 2026-08-21). Si el TEMA del post
        #    no toca vender mas, el bloque de agendar no tiene dolor al que agarrarse
        #    y se convierte en la frase de catalogo que §4.4b prohibe. Entonces no se
        #    mete a la fuerza: se quita, y el correo se queda de unica puerta. Se
        #    declara con --solo-correo para que sea una decision y no un olvido.
        if solo_correo and _i_ag is None:
            chk(True, 'Doble ninja: el correo va SOLO, sin agendar (§4.4e-SOLO)',
                'declarado con --solo-correo: el tema del post no toca vender, asi que el '
                'bloque de agendar se queda fuera en vez de importarle un dolor prestado')
            _det_orden = None
        elif _i_ag is None:
            _det_orden = ('no encuentro el bloque de agendar. Si es a proposito porque el tema '
                          'del post no toca vender, pasa --solo-correo y quedara por escrito '
                          '(§4.4e-SOLO)')
        elif _i_cor == _i_ag:
            _det_orden = ('los dos enlaces estan en el MISMO bloque. Son dos bloques de dos '
                          'lineas separados por cuerpo, nunca un bloque de cuatro: pegados se '
                          'leen como un anuncio, que es justo lo que el bloque de dos evita')
        elif _i_cor < _i_ag:
            _det_orden = ('el de correo va antes. El de agendar mantiene su posicion canonica '
                          'porque es la unica que tenemos medida')
        else:
            _det_orden = ''
        if _det_orden is not None:
            chk(_i_ag is not None and _i_cor is not None and _i_cor > _i_ag,
                'Doble ninja: el de correo va DESPUES del de agendar, en OTRO bloque (§4.4e)',
                _det_orden)

        # 3) NUNCA PEGADOS, Y CON VARIEDAD ENTRE MEDIAS. Dos bloques de venta
        #    seguidos son un anuncio de cuatro lineas, que es exactamente lo que el
        #    bloque de dos existe para evitar. Y no basta con DOS LINEAS: Iker,
        #    2026-08-19, "entre el primero y el segundo que haya variedad de
        #    lineas". Dos bloques de dos con la misma forma y casi pegados se leen
        #    como un patron y el ojo se salta los dos, asi que se piden dos BLOQUES
        #    distintos de cuerpo (una suelta y otra suelta, o una suelta y un tres).
        if _i_ag is not None and _i_cor is not None and _i_cor > _i_ag:
            _bloques_entre = _bl[_i_ag + 1:_i_cor]
            _entre = sum(len(b) for b in _bloques_entre)
            chk(len(_bloques_entre) >= 2,
                'Doble ninja: >=2 BLOQUES de cuerpo entre los dos (§4.4e-PRONTO)',
                '%d bloque(s) y %d linea(s) entre ellos. No basta con dos lineas: hacen falta '
                'dos bloques distintos, o los dos ninjas se leen como un patron y el ojo se '
                'salta los dos' % (len(_bloques_entre), _entre) if len(_bloques_entre) < 2 else
                '%d bloques y %d lineas de cuerpo entre ellos' % (len(_bloques_entre), _entre))

        # 3b) Y EL DE AGENDAR NO PUEDE IR PEGADO AL GANCHO (Iker, 2026-08-19).
        #     El 650 de §4.4b-CLICS es el TECHO y no dice nada del suelo: un enlace
        #     que aparece antes de que el post haya explicado nada le pide el clic a
        #     alguien que todavia no sabe de que le hablas. El 19/08 lo puse en el
        #     caracter 147 de 564 y Iker lo devolvio: "me has adelantado demasiado el
        #     primer enlace, no va a convertir casi; tiene que ir por el medio hacia
        #     el final". El suelo es el 30% del texto, y no tumba nada de lo que ya
        #     funciono: el meme del 14/08 lo pone en el 75% y el del 13/08 en el 83%.
        #     Se mide en BLOQUES y no en caracteres, y eso es lo que aprendimos: el
        #     borrador rechazado tenia el enlace en el 36% del texto y aun asi
        #     estaba mal, porque lo que canta es la ESTRUCTURA (gancho, una linea y
        #     ya la venta), no el porcentaje. Por delante tiene que haber el gancho
        #     y AL MENOS DOS bloques de cuerpo.
        if _i_ag is not None:
            _cuerpo_antes = _i_ag - 1
            chk(_i_ag >= 3, 'Doble ninja: el de agendar no va pegado al gancho (§4.4e-PRONTO)',
                'solo hay %d bloque(s) de cuerpo entre el gancho y la venta. Van al menos DOS: '
                'un enlace que aparece antes de que el post haya explicado nada le pide el clic '
                'a alguien que no sabe todavia de que le hablas. Se arregla REORDENANDO, no '
                'alargando' % max(_cuerpo_antes, 0) if _i_ag < 3 else
                '%d bloques de cuerpo por delante' % _cuerpo_antes)

        # 4) NUNCA AL FINAL. El post cierra con la frase punchy suelta, siempre. Se
        #    exigen 2 lineas detras: al menos una de cuerpo y el cierre en la suya.
        if _i_cor is not None:
            _desp = sum(len(b) for b in _bl[_i_cor + 1:])
            chk(_desp >= 2, 'Doble ninja: el de correo NO es el ultimo ni el penultimo bloque (§4.4e)',
                '%d linea(s) detras. Detras tiene que quedar cuerpo Y el cierre punchy en su '
                'linea: el final del post sigue siendo una frase suelta que remata' % _desp
                if _desp < 2 else '')

        # 5) LA FORMA SE HEREDA ENTERA DE 4.4b: dos lineas pegadas, cada una <=55 sin
        #    la URL, la de abajo mas corta, https:// delante y sin nombrar la marca.
        chk(len(_cb) == 2, 'Doble ninja: el bloque del correo son DOS lineas pegadas (§4.4e)',
            '%d lineas. Con una sola el enlace llega sin dolor delante y se lee banner '
            '(0,069%% contra 0,205%%)' % len(_cb) if len(_cb) != 2 else '')
        _su = lambda s: re.sub(r'https?://\S+', '', s).strip()
        _lg = [(i + 1, len(_su(l))) for i, l in enumerate(_cb) if len(_su(l)) > 55]
        chk(not _lg, 'Doble ninja: las dos lineas cortas, <=55 sin la URL (§4.4e)',
            ('linea(s) %s. Pasando de 55 se parte en el movil y el bloque de dos se lee '
             'como cuatro' % ', '.join('%d con %d car' % x for x in _lg)) if _lg else
            '%s car' % ' / '.join(str(len(_su(l))) for l in _cb))
        if len(_cb) == 2:
            chk(len(_su(_cb[1])) <= len(_su(_cb[0])),
                'Doble ninja: la linea del enlace no es mas larga que la de arriba (§4.4e)',
                'arriba %d, abajo %d' % (len(_su(_cb[0])), len(_su(_cb[1])))
                if len(_su(_cb[1])) > len(_su(_cb[0])) else '', aviso=True)
        chk('https://recursos.neety.com/correo' in cuerpo or
            'https://recursos.neety.com/newsletter' in cuerpo,
            'Doble ninja: el enlace del correo lleva https:// delante (§4.4e)',
            'sin el protocolo LinkedIn puede no detectarlo como clicable')
        chk('Neety' not in _cj, 'Doble ninja: el bloque del correo NO nombra a Neety (§4.4e)',
            'nombrar la marca = publicidad encubierta')

        # 6) PROHIBIDAS "suscribete" Y "newsletter" DENTRO DEL BLOQUE. Nuestro ICP es
        #    un director comercial industrial de 50 y pico: se le dice "esto lo mando
        #    por correo antes que aqui", no "suscribete a nuestra newsletter". La
        #    primera suena a persona, la segunda a formulario. Por eso la URL que se
        #    ESCRIBE es /correo/ aunque la canonica sea /newsletter/ (alias 301).
        _mkt = re.search(r'suscr[ií]b\w*|newsletter|bolet[ií]n', _su(_cj), re.I)
        # 4.4e punto 3 - EL BLOQUE 2 TIENE OTRO DOLOR, NO OTRAS REGLAS. Que sea la
        # puerta barata no lo hace la puerta impune: hereda los vetos de 4.4b-MUNICION.
        _auto_c = re.search(PROMESA_AUTOMATISMO, _cj.lower())
        chk(not _auto_c, 'Doble ninja: el bloque del correo tampoco promete AUTOMATISMO (§4.4e)',
            ('"%s". Mismo veto que el bloque 1 (§4.4b-MUNICION): objecion en 5 empresas'
             % _auto_c.group(0)) if _auto_c else '')
        chk(not re.search(PROMESA_VOLUMEN, _cj.lower()),
            'Doble ninja: el bloque del correo tampoco vende VOLUMEN (§4.4e)',
            'prometer cantidad nos mete en la caja de Waalaxy y Apollo', aviso=True)
        chk(not _mkt, 'Doble ninja: ni "suscribete" ni "newsletter" en el texto (§4.4e)',
            '"%s" suena a formulario. Se dice "esto lo mando por correo antes que aqui"'
            % _mkt.group(0) if _mkt else '')

        # 7) REPARTO DE LAS PALABRAS DEL GANCHO. 4.4b dice que lo mas punchy de un
        #    gancho son el OBJETO y el VERBO. El bloque 1 se queda una pieza y el 2 la
        #    otra: dos bloques colgando de la MISMA palabra se leen como un eco y se
        #    delatan los dos a la vez.
        def _sa(_s):
            for _x, _y in zip(u'áéíóúñ', 'aeioun'):
                _s = _s.replace(_x, _y)
            return _s
        _stopc = {'para', 'como', 'desde', 'entre', 'cuando', 'porque', 'sobre', 'todos',
                  'todas', 'nadie', 'nunca', 'siempre', 'tambien', 'tampoco', 'estar',
                  'tener', 'hacer', 'decir', 'quiere', 'queria', 'vender', 'ventas'}
        _palc = [w for w in re.findall(u'[a-záéíóúñ]{5,}', hook_txt.lower())
                 if _sa(w) not in _stopc]
        _rc = _sa(_cj.lower())
        _ecoc = [w for w in _palc if _sa(w)[:5] in _rc]
        chk(bool(_ecoc), 'Doble ninja: el bloque del correo recoge una palabra del gancho (§4.4e)',
            ('el gancho habla de: ' + ', '.join(_palc[:6]) + ', y el bloque del correo no '
             'recoge ninguna. Sin la palabra del gancho el bloque aparece a mitad de texto '
             'con vocabulario nuevo y el ojo lo trata como banner') if not _ecoc else
            'recoge del gancho: ' + ', '.join(_ecoc[:3]))
        if _i_ag is not None:
            _ra = _sa(_j(_bl[_i_ag]).lower())
            _ecoa = [w for w in _palc if _sa(w)[:5] in _ra]
            _comun = [w for w in _ecoc if w in _ecoa]
            chk(not _comun, 'Doble ninja: los dos bloques NO cuelgan de la misma palabra (§4.4e)',
                ('los dos recogen "%s". El gancho tiene DOS piezas punchy, el objeto y el '
                 'verbo: uno se queda una y el otro la otra. Repetir la misma se lee como un '
                 'eco y delata los dos bloques a la vez' % '", "'.join(_comun[:3])) if _comun else '')

        # 8) Y ROTA, como el otro. Sin lista de quemadas, en un mes los tres perfiles
        #    dicen lo mismo (4.4b lo lleva escrito desde el 31/07).
        _qc = ([] if historico else
               sorted(f for f in SPAM_QUEMADO_CORREO if f in _cj.lower()
                      and quemada(f, SPAM_QUEMADO_CORREO[f], VENTANA_NINJA_DIAS, cuenta)))
        chk(not _qc, 'Doble ninja: la frase del correo no esta quemada (§4.4e)',
            ' · '.join('"%s" ya salio en %s' % (f, SPAM_QUEMADO_CORREO[f]) for f in _qc))

        # 9) EL DOLOR ES OTRO, y esto es lo que mas se va a equivocar. El de agendar es
        #    la identificacion (a quien vender, quien firma dentro). El del correo es
        #    enterarte el ultimo. Va de aviso porque es criterio y por lexico no se
        #    puede exigir sin fabricar un tic.
        chk(False, 'ENTREGA: el dolor del bloque de correo NO es el de agendar',
            'el de agendar es la identificacion (a quien vender, quien firma dentro). El del '
            'correo es enterarte el ultimo: la IA esta cambiando como se vende y tu lo lees en '
            'LinkedIn seis meses tarde. Test de cinco segundos: tapa el post y lee solo las dos '
            'lineas; si valdrian pegadas a cualquier otra publicacion nuestra, estan mal',
            aviso=True)

        # 10) EN MEME: EL BLOQUE NUEVO NO SE COME EL PRESUPUESTO DEL CHISTE
        #     (Iker, 2026-08-19 — sustituye al "el post entero cabe en 450").
        #
        # Antes esto era un fallo duro sobre el TOTAL, y era demasiado restrictivo:
        # dos bloques ocupan ~150 caracteres con la URL, asi que exigir 450 en total
        # dejaba el chiste en 300 y el bloque de correo no entraba nunca en meme.
        # Iker: "modifica lo de los 140 caracteres o asi, que es demasiado
        # restrictivo; no creo que el texto se vaya a ir demasiado largo".
        #
        # LO QUE SE MIDE AHORA es el cuerpo DESCONTANDO el bloque del correo: el
        # meme sigue teniendo los mismos 450 caracteres de chiste que tenia sin el,
        # y lo que ocupa la puerta nueva no se le resta al gag. El tope duro de 700
        # del pilar (§4.4-CORTO) sigue mandando sobre el total.
        if pilar == 'meme':
            _coste = len('\n'.join(_cb)) + 2 if _cb else 0
            _sin = len(cuerpo) - _coste
            chk(_sin <= 450, 'Doble ninja en MEME: sin el bloque de correo, <=450 car (§4.4e)',
                '%d caracteres sin contar el bloque de correo (%d en total). El bloque nuevo '
                'no se le resta al chiste: si el meme ya no cabe en 450 por si solo, lo que '
                'sobra es cuerpo, no el bloque' % (_sin, len(cuerpo))
                if _sin > 450 else '%d car sin el bloque · %d en total' % (_sin, len(cuerpo)))

    # global §2.10 — EL CIERRE PUNCHY ES UNA SOLA LINEA. Dos oraciones largas al
    # final diluyen el remate: un cierre no admite explicacion detras.
    _ult = [l for l in cuerpo.splitlines() if l.strip()][-1] if cuerpo.strip() else ''
    _uo = [t for t in re.split(r'(?<=[.!?])\s+(?=[A-ZÁÉÍÓÚÑ¿¡])', _ult) if len(t.strip()) > 3]
    chk(len(_uo) <= 1 or len(_ult) <= 90, 'Cierre punchy de UNA linea (§2.10)',
        f'{len(_uo)} oraciones y {len(_ult)} car. en el cierre' if len(_uo) > 1 and len(_ult) > 90 else '')

    if pilar in ('mapa', 'los10'):
        m = re.search(REVEAL_QUEMADO, cuerpo, re.I)
        chk(not m, 'Reveal de región sin el comodín "Sí, hablo de" (§4.1)',
            f'"{m.group(0)}…" → lo usan LITERAL los 4 posts reales; di lo mismo con otras palabras' if m else '')
        m = re.search(COMODIN_LISTA, cuerpo, re.I)
        chk(not m, 'Frase de entrada a la lista sin comodín (§4.1)',
            f'"{m.group(0)}" → ya repetida entre mapas' if m else '')
    if pilar == 'los10' and not LAS10:
        m = re.search(BEAT_EQUIPO, cuerpo, re.I)
        chk(bool(m), 'Concede que es trabajo en equipo (§4.3 Paso 3e)',
            'sin esta línea se nos echan encima: el "gracias, PERO esto es trabajo en '
            'equipo" es la crítica más repetida de este pilar. Sujeto = la PERSONA '
            '("ninguno de los 10 lo hizo solo"), NUNCA la empresa ("ninguna empresa '
            'vende sola" es el marco de despojo, apunta al revés)' if not m else '')
        m = re.search(EMPRESA_LADRONA, cuerpo, re.I)
        chk(not m, 'La EMPRESA no es quien tapa a la persona (§4.3 Paso 3d)',
            f'"{m.group(0)}" → único rasgo de texto que separa el 4.82x sin quejas del '
            f'0.66x que sí las tuvo. La persona invisible se queda; el culpable, fuera: '
            f'que tape la prensa, el titular, la cifra o nosotros' if m else '')
    # ---------- POSICION DEL ENLACE EN PELOTEO (post-workflow 4.0d punto 6) ----------
    # A/B ABIERTO (Iker, 2026-09-16). 20 de los 21 peloteos con enlace lo llevan
    # entre el 88% y el 96% del texto, asi que el dato NO dice si arriba convierte
    # mas o menos: solo que abajo es lo unico que hemos publicado. Este aviso no
    # opina: imprime el % y el brazo, para que quede anotado en la ficha.
    if pilar in ('mapa', 'objeto', 'los10'):
        _m = re.search(r'https?://', texto)
        if _m:
            _pos = 100.0 * _m.start() / max(len(texto), 1)
            _brazo = 'A (abajo, 88-96%)' if _pos >= 85 else ('B (a media cola, <80%)' if _pos < 80 else 'entre los dos brazos')
            chk(True, 'PELOTEO: posicion del enlace, apuntala en la ficha (4.0d)',
                'enlace al %.0f%% del texto -> brazo %s. A/B abierto: brazo A = 20 posts, brazo B = '
                'Cantabria 01/09 y Bizkaia 16/09. Nunca en la ultima linea ni suelto' % (_pos, _brazo), aviso=True)
    # ---------- EL NINJA NUNCA VA PEGADO A LAS MENCIONES (Iker, 2026-10-07) ----------
    # Iker: "si te saltas con el ojo las menciones, te has saltado tambien el spam
    # ninja", igual que cuando iba en la ultima linea. Caso: "Las 10" de Castilla-La
    # Mancha (01/10), bloque del enlace justo detras del 2o bloque de menciones,
    # 37.779 imp y 22 clics (0,058%). ⚠️ CRITERIO, NO DATO MEDIDO: en la BD (07/10)
    # separacion 0 = 0,12% (n=4) contra >=1 linea = 0,27% (n=11), p=0,17, y el mejor
    # CTR de Asier (Extremadura, 0,419%) iba pegado; el destino (/mapas/ contra
    # /agendar/) explica mas que la posicion. Se mecaniza porque no cuesta nada y
    # nada medido lo contradice. Vale en TODOS los pilares: entre la ultima linea
    # que empieza por "→" y la 1a linea del bloque del enlace tiene que haber al
    # menos UNA linea con texto, separada por blancos.
    _ls = texto.splitlines()
    _fin = max((i for i, l in enumerate(_ls) if l.lstrip().startswith('→')), default=None)
    if _fin is not None:
        _il = next((i for i in range(_fin + 1, len(_ls))
                    if re.search(r'(https?://|lnkd\.in|neety\.com|lu\.ma|luma\.com)', _ls[i])), None)
        if _il is not None:
            _ini = _il - 1 if (_ls[_il - 1].strip() and not _ls[_il - 1].lstrip().startswith('→')) else _il
            _sep = sum(1 for l in _ls[_fin + 1:_ini] if l.strip())
            chk(_sep >= 1, 'Spam ninja: NUNCA pegado al bloque de menciones (Iker, 07/10)',
                ('%d linea(s) con texto entre la ultima "→" y el bloque del enlace. ' % _sep) +
                ('Mete al menos una suelta que respire (un cliche, el reveal o la que cose la lista '
                 'con el ninja): quien salta las menciones con el ojo se salta tambien lo que va pegado. '
                 'Criterio de Iker, no medido (post-workflow 4.0d punto 6)' if _sep < 1 else
                 'apuntala en la ficha del historial junto al % del enlace'))
    # ---------- LA LINEA DEL ENLACE NO ORDENA (Iker, 2026-09-16) ----------
    # Propuso "Solo quedan 15 plazas. Corre:" / "date prisa". El imperativo de
    # urgencia es la voz del anuncio (4.4b-EVENTO-EXPLICITO: el post que suena a
    # promo trae 0 asistentes) y choca con una sala con aprobacion: correr no
    # te mete. Y el punto en medio parte la linea en dos frases (global 3).
    _le = next((l for l in texto.splitlines() if re.search(r'https?://', l)), '')
    _pre = re.split(r'https?://', _le)[0]
    _imp = re.findall(r'\b(corre|date prisa|d[eé]pechate|ap[uú]ntate|reserva(?:\s+ya)?|no te lo pierdas|no te quedes fuera|entra ya|pincha|haz clic)\b', _pre, re.I)
    _dos = re.search(r'[.!?]\s+\S', _pre.strip())
    if _le:
        chk(not _imp and not _dos, 'Spam ninja: la linea del enlace no ORDENA ni parte en dos frases (4.4b-EMAIL)',
            ('imperativo %s' % _imp if _imp else '') + (' · punto en medio' if _dos else '') +
            '. La urgencia la pone el "solo quedan", no la orden: "En esa sala si, pero solo quedan 15 plazas:"',
            aviso=True)
    # ---------- LO QUE QUEDA DEL AFORO (Iker, 2026-09-16) ----------
    # "quedan N plazas" es un dato VIVO: solo vale leido ese mismo dia en la API
    # publica de Luma (reference_luma_aforo_api) y con la sala ya casi llena
    # (global 2.3d). El 16/09 Iker puso "quedan 20" y la API decia 15.
    _q = re.search(r'\bquedan?\s+(?:solo\s+|tan solo\s+)?(\d+)\s+(?:plazas|puestos|sillas|entradas|asientos)', texto, re.I)
    if _q:
        chk(True, 'EVENTO: "quedan %s" es un dato VIVO, leelo hoy en Luma (global 2.3d)' % _q.group(1),
            'curl -s "https://api.lu.ma/url?url=<slug>" -> data.ticket_info.spots_remaining. '
            'Pega la lectura y la hora en la entrega; si la sala no pasa del 75% lleno, vuelve al tope ("solo hay 80")',
            aviso=True)
    # ---------- GANCHO UNIVERSAL DEL PELOTEO (Iker, 2026-09-16) ----------
    # "en el gancho tiene que poder entenderlo cualquier persona, sea el pilar
    # que sea". Se escapo `el garaje de la ria`: la ria es Bilbao para el de
    # Bilbao y nada para el de Cuenca. Vale para los TRES peloteos: el gancho lo
    # lee toda España, el vocabulario y la grafia de alli bajan al CUERPO
    # (post-workflow 4.0d). LISTA CERRADA de lo que ya se nos ha colado, y NO un
    # veto a la grafia tx: la primera version vetaba cualquier `tx` y tumbaba el
    # mapa de Navarra (79.224 imp), cuyo gancho dice `txistorra`, que se vende en
    # cualquier supermercado de España. Lo que falla no es la letra, es la
    # palabra que fuera no se entiende. Se amplia la lista cuando se cuele otra.
    if pilar in ('mapa', 'objeto', 'los10'):
        _loc = re.findall(r'\b(r[ií]as?|sirimiri|txoko|txuleton|bajera|caser[ií]o|bardenas'
                          r'|margen izquierda|ribera|meseta)\b', hook_txt, re.I)
        chk(not _loc, 'GANCHO: sin vocabulario ni grafia LOCAL, lo entiende cualquiera (4.0d)',
            'en el gancho: %s. Al gancho, el sitio o el cliche que conoce toda España; '
            'lo de alli, al cuerpo' % sorted(set(x.lower() for x in _loc)) if _loc else '')
    # ---------- GENERO DE LAS PALABRAS LOCALES (Iker, 2026-09-16) ----------
    # Se colo 'La sirimiri' en el despiece de Bizkaia y la RAE lo da como
    # MASCULINO ('el sirimiri'). Lo corrigio Iker a mano antes de publicar. La
    # palabra de alli se escribe como la escribe el castellano de alli, y el
    # genero se mira en la RAE antes de usarla. Se amplia cuando se cuele otra.
    _GEN_MAL = re.compile(r'\b(?:la|una|esa|esta)\s+(sirimiri|chirimiri|txirimiri|txakoli|chacol[ií]|pachar[aá]n|txoko|caser[ií]o)\b', re.I)
    _gm = _GEN_MAL.findall(texto)
    chk(not _gm, 'GENERO: la palabra local va con su articulo (RAE)',
        ('%s es masculino: el sirimiri, el txakoli, el pacharan, el txoko, el caserio' % sorted(set(g.lower() for g in _gm))) if _gm else '')
    # ---------- GANCHO DEL PELOTEO (§4.2 Paso 1) ----------
    # Mecanizado el 2026-07-30 porque como criterio se me olvidaba.
    # Mapa, objeto y "LAS 10". "Los 10" de PERSONAS no usa el gancho de prejuicio
    # regional: su foco era la persona, el comercial invisible (§4.3-OLD), y
    # aplicarselo tumbaba los cuatro del historico, incluido el 4.83x. "LAS 10"
    # SI (Iker, 2026-10-01): las protagonistas son las EMPRESAS de la region,
    # asi que es un peloteo regional con otra imagen y su gancho es el del mapa
    # con sus cuatro inamovibles. La orla ya dice que no es un mapa.
    if pilar in ('mapa', 'objeto') or LAS10:
        chk(bool(re.search(SUJETO_AJENO, hook_txt, re.I)),
            'GANCHO: el prejuicio lo dice OTRO, no nosotros (§4.2 Paso 1)',
            'el hook afirma el desprecio en seco y se lee como NUESTRO. Necesita un sujeto '
            'ajeno: "la ven como", "la llaman", "nadie habla de", "todos ven", "la conocen por", '
            '"la tienen jubilada", "la despachan como", "la dan por"')
        # ⭐ LA PALABRA "EXPORTA" ES INAMOVIBLE EN TODO PELOTEO REGIONAL
        # (Iker, 2026-07-31). Es lo que ancla el pilar a VENTAS de forma
        # indirecta: si alguien exporta es porque VENDE. Sin ella el post se
        # queda en peloteo bonito y lo podria subir cualquiera.
        # Dos fallos reales seguidos: el despiece de Euskadi del 30/07 la quito
        # y esta rindiendo peor, y el mapa de Asturias del 31/07 la cambio por
        # un shock de produccion. En los dos casos yo justifique el cambio y en
        # los dos me equivoque. NO se negocia por muy punchy que sea la
        # alternativa.
        chk(bool(re.search(r'\bexporta\b', hook_txt, re.I)),
            'GANCHO: lleva la palabra "exporta" (§4.2 Paso 1)',
            'es lo que ata el peloteo a VENTAS: si alguien exporta es porque vende. '
            'El remate va "Y exporta más que [PAÍS] entero" en el mapa y "Y exporta más '
            'que [PAÍS] entero" tambien en el despiece, antes del objeto. Sin esa palabra '
            'el post lo podria subir cualquier cuenta')
        # El DESPIECE mete el objeto entre medias — la plantilla de §4.7 es
        # "exporta mas [piezas de coche] que [PAIS] entero" — asi que exigir
        # "mas que" pegado tumbaba un gancho que seguia la receta al pie.
        chk(bool(re.search(r'm[aá]s (?:\w+ ){0,4}que .+\benter[oa]s?\b', hook_txt, re.I)),
            'GANCHO: lleva la COMPARACIÓN con un país concreto (§4.2 Paso 1)',
            'falta el "más que [PAÍS] entero". Un país CONCRETO y verificado, nunca '
            '"medio mundo" ni "países enteros" en vago: la comparacion es el dato que '
            'hace que se comparta')
        # --historico apaga los checks de REINCIDENCIA (ver el flag en main): un
        # post ya publicado es QUIEN lleno estas listas, asi que compite contra si
        # mismo y falla siempre. No es un bug del validador ni del post.
        _pais = [] if historico else sorted(p for p in PAIS_QUEMADO if p in hook_txt.lower() and quemada(p, PAIS_QUEMADO[p], VENTANA_IDENTIDAD_DIAS, cuenta))
        chk(not _pais, 'GANCHO: el país de la comparación no está usado (§4.2 Paso 2)',
            ' · '.join(f'"{p}" fue {PAIS_QUEMADO[p]}' for p in _pais) +
            '. La comparacion es lo que se comparte, asi que repetir pais se nota mas '
            'que ninguna otra cosa. Busca otro con >=15% de margen y fuente oficial')
        # 27/10: el pais de OTRA cuenta pasaba en silencio pasados 7 dias, y Costa Rica
        # iba a repetirse a los 11 dias del mapa viral de otra cuenta. El que sigue a las
        # tres cuentas lo nota igual: aviso si otra cuenta lo uso en los ultimos 21 dias.
        def _dias_de(v):
            m_ = re.match(r'(\d{4})-(\d{2})-(\d{2})', v)
            return (datetime.date.today() - datetime.date(*map(int, m_.groups()))).days if m_ else None
        _pais_otra = [] if historico else sorted(
            p for p in PAIS_QUEMADO if p in hook_txt.lower() and p not in _pais
            and _dias_de(PAIS_QUEMADO[p]) is not None and _dias_de(PAIS_QUEMADO[p]) <= 21)
        chk(not _pais_otra, 'GANCHO: el país no lo usó otra cuenta en los últimos 21 días',
            ' · '.join(f'"{p}" fue {PAIS_QUEMADO[p]}' for p in _pais_otra) +
            '. Quien sigue a las tres cuentas lo ve repetido: busca otro' if _pais_otra else '',
            aviso=True)
        _conc = [] if historico else sorted(c for c in CONCEPTO_QUEMADO if c in hook_txt.lower() and quemada(c, CONCEPTO_QUEMADO[c], VENTANA_IDENTIDAD_DIAS, cuenta))
        chk(not _conc, 'GANCHO: el concepto no está usado (§4.2 Paso 1)',
            ' · '.join(f'"{c}" fue {CONCEPTO_QUEMADO[c]}' for c in _conc) +
            '. El concepto se inventa nuevo por region, derivado de su GEOGRAFIA')
        # 27/10: el concepto entero era nuevo ("lavadero del Atlantico") pero el ACCIDENTE
        # geografico ya lo habia usado esa cuenta dos veces (Galicia 16/06, Canarias 08/10).
        # Se compara la palabra que va detras de "del / de la" con la de los conceptos de esa
        # cuenta de los ultimos 90 dias. Aviso: el lector no lo castiga, pero suena a plantilla.
        import unicodedata as _ud2
        def _st(s):
            return ''.join(c for c in _ud2.normalize('NFKD', s.lower()) if not _ud2.combining(c))
        _acc = re.search(r'\b(?:del|de la|de los|de las)\s+([a-záéíóúñ]{4,})', hook_txt.lower())
        _acc_rep = []
        if _acc and cuenta and not historico:
            _w = _st(_acc.group(1))
            for _c, _v in CONCEPTO_QUEMADO.items():
                _m_c = re.search(r'\b(?:del|de la|de los|de las)\s+([a-záéíóúñ]+)', _c)
                _d = re.match(r'(\d{4})-(\d{2})-(\d{2})', _v)
                if not (_m_c and _d) or cuenta.lower() not in cuentas_de(_v):
                    continue
                _dias = (datetime.date.today() - datetime.date(*map(int, _d.groups()))).days
                if _dias <= 90 and _w.startswith(_st(_m_c.group(1))) and _c.split(' ')[0] not in hook_txt.lower():
                    _acc_rep.append('"%s" (%s)' % (_c, _v))
        chk(not _acc_rep, 'GANCHO: el accidente geográfico del concepto no se repite en la cuenta (90 días)',
            ('"%s" ya iba en: %s. Cambia la segunda mitad del concepto (otro rasgo de la geografia), '
             'no solo el sitio de la casa' % (_acc.group(1), ' · '.join(_acc_rep))) if _acc_rep else '',
            aviso=True)
        _rabia = [] if historico else sorted(f for f in FRASE_RABIA_USADA if f in hook_txt.lower() and quemada(f, FRASE_RABIA_USADA[f], VENTANA_IDENTIDAD_DIAS, cuenta))
        chk(not _rabia, 'GANCHO: la frase-rabia no está usada (§4.2 Paso 1)',
            ' · '.join(f'"{f}" fue {FRASE_RABIA_USADA[f]}' for f in _rabia) +
            '. El beat se mantiene siempre, las palabras cambian siempre')
        # ⛔⛔ Iker, 2026-10-15: al repetir region, el gancho no recicla cliches del gancho
        # anterior de esa region, y el pais no se repite nunca en la misma cuenta.
        import unicodedata as _ud
        def _sin_tilde(s):
            return ''.join(c for c in _ud.normalize('NFKD', s.lower()) if not _ud.combining(c))
        _hook_n = _sin_tilde(hook_txt)
        _regiones = [r for r, pat in REGION_EN_TEXTO.items() if re.search(pat, texto, re.I)]
        _recicla = [] if historico else sorted(
            '"%s" (%s, %s)' % (w, r, v) for r in _regiones for w, v in CLICHE_GANCHO_REGION.get(r, {}).items()
            if re.search(r'\b' + re.escape(w) + r'(s|es)?\b', _hook_n))
        chk(not _recicla or DOUBLE_DOWN,
            'GANCHO: al repetir region, sin cliches del gancho anterior de esa region (Iker 15/10)',
            ('ya salieron en el gancho de un peloteo anterior de esta region: ' + ' · '.join(_recicla) +
             '. Busca los 2 mas universales que NO se hayan usado arriba. Si repetir es la apuesta '
             '(double down), pasa --double-down y DECLARALO en la entrega') if _recicla else
            ('region(es) en el texto: %s' % ', '.join(_regiones) if _regiones else ''))
        _topo = [] if historico else sorted({
            raiz for r in _regiones for raiz in REGION_TOPONIMOS.get(r, [])
            if re.search(r'\b' + re.escape(raiz) + (r'\b' if raiz in ('mano', 'manos', 'mana', 'manas', 'haro', 'leon', 'soria', 'lugo', 'vigo', 'jaca', 'astur') else ''), _hook_n)})
        chk(not _topo,
            'GANCHO: sin topónimos ni gentilicios de la region, que destapan el reveal (Iker 16/10)',
            ('el gancho nombra "%s", que es de la region que se revela abajo. Los cliches '
             'insinuan, un sitio la nombra y se acaba el bucle abierto (global §2.0). Cambia el '
             'cliche por una cosa, nunca un lugar ni un gentilicio' % '", "'.join(_topo)) if _topo else '')
        _pais_cuenta = [] if (historico or not cuenta) else sorted(
            p for p in PAIS_QUEMADO if p in _hook_n and cuenta.lower() in cuentas_de(PAIS_QUEMADO[p]))
        chk(not _pais_cuenta or DOUBLE_DOWN,
            'GANCHO: el pais no lo ha usado NUNCA esta cuenta (Iker 15/10)',
            (' · '.join('"%s" fue %s' % (p, PAIS_QUEMADO[p]) for p in _pais_cuenta) +
             '. La ventana de 42 dias vale para concepto, verbo y frase-rabia; el pais es lo que se '
             'comparte y el seguidor de esta cuenta lo recuerda. Otro con >=15% de margen, o '
             '--double-down declarado') if _pais_cuenta else '')
        _quemados = [] if historico else sorted(v for v in VERBO_PREJUICIO_QUEMADO
                           if re.search(r'\b' + v + r'\b', texto, re.I) and quemada(v, VERBO_PREJUICIO_QUEMADO[v], VENTANA_IDENTIDAD_DIAS, cuenta))
        chk(not _quemados,
            'GANCHO: el verbo del prejuicio no está quemado (§4.2 Paso 1)',
            ' · '.join(f'"{v}" ya salió en {VERBO_PREJUICIO_QUEMADO[v]}' for v in _quemados) +
            '. El sujeto ajeno es obligatorio, el VERBO rota. Busca otro del mismo nivel: '
            '"la tienen jubilada", "la despachan como", "la dan por amortizada", '
            '"la entierran con", "nadie la cuenta como"')
        # AVISO y no fallo: el mejor mapa del historico (12.89x, "Nadie habla del
        # pueblo de 7.000 habitantes") NO la lleva. La receta la pide y suele
        # ayudar, pero la evidencia no soporta convertirla en obligatoria.
        chk(bool(re.search(FRASE_RABIA, hook_txt, re.I)),
            'GANCHO: lleva frase-rabia que despacha la región (§4.2 Paso 1)',
            'sin ese remate el local no siente el desprecio, no comenta y no hay motor. '
            'Familia: "y para de contar", "y poco mas", "y poco que rascar", '
            '"buena para [comer X] y para irse", "un [plato] antes de seguir carretera"', aviso=True)
        _cif = re.findall(r'\d[\d.,]*', hook_txt)
        # AVISO y no fallo, por lo mismo: el 12.89x lleva "7.000 habitantes" y el
        # 5.38x lleva "8,7 millones", y en los dos la cifra ES el concepto. Iker
        # prefiere el gancho sin cifra (2026-07-30), asi que avisa, pero no tumba.
        chk(len(_cif) == 0, 'GANCHO: sin cifras, van al cuerpo (§2.10)',
            f'{_cif} en el hook. Iker lo prefiere sin cifra: el gancho lo lee todo el mundo antes '
            'del "ver mas" y un numero ahi frena. Excepcion medida: si la cifra ES el concepto '
            '(el 12.89x con "pueblo de 7.000 habitantes"), se queda', aviso=True)

    # ---------- CTA DEL MAPA (§4.2 Paso 5) ----------
    # El jefe ya pago PamPam y la web de recursos embebe el mapa completo, asi
    # que el enlace va AHI: se lee como recurso y no como venta, y captura igual
    # porque esa pagina lleva su propio CTA a agendar. Mecanizado el 2026-07-31
    # tras entregarlo mal aun teniendolo escrito desde el 23/07.
    _spam = ([] if historico else
             sorted(f for f in SPAM_QUEMADO if f in texto.lower()
                    and quemada(f, SPAM_QUEMADO[f], VENTANA_NINJA_DIAS, cuenta)))
    chk(not _spam, 'SPAM NINJA: la frase no está quemada (§4.4b)',
        ' · '.join(f'"{f}" ya salió en {SPAM_QUEMADO[f]}' for f in _spam) +
        '. El dolor es el mismo siempre (dar con el cliente ideal, empresa Y persona) pero la '
        'forma rota en cada post. Lo mejor es colgarlo de la broma del gancho: si el post va de '
        'un tatuaje, "Tatuarse es lo facil. Lo caro es saber de quien tiene que ser el logo"')

    # ---------- PILAR EVENTO (Iker, 2026-08-05) ----------
    # El evento se vende DENTRO de formatos que ya funcionan; este pilar es para
    # el post de anuncio puro. Motor validado: la SALA, no el programa
    # (Grace Gong 11.6x y 14.4x en el corpus de competencia).
    if pilar == 'evento':
        # Aviso fijo, no es un check: siempre sale y siempre hay que pegarlo en la
        # entrega. Iker subio el post del evento el 05/08 y hubo que BORRARLO
        # porque el jefe pidio el visto bueno previo de los mencionados.
        # El porque: en un mapa mencionas empresas frias y es informacion publica;
        # en un evento la mencion ASOCIA a esa persona con el acto, y eso necesita
        # su permiso.
        chk(False, '⚠️ EVENTO: NO PUBLICAR SIN EL OK DE LOS MENCIONADOS',
            'antes de subir, que los mencionados (partners, clientes, sede) den el '
            'visto bueno. Una mencion en un post de evento les asocia al acto, y eso '
            'no es informacion publica como en un mapa. El 05/08 hubo que borrar un '
            'post ya publicado por saltarse esto', aviso=True)
        chk(EVENTO_AJENO or 'luma.com/ujffj66o' in texto or 'forward.neety.com' in texto,
            'EVENTO: lleva el enlace de inscripción (§4.4b)',
            'falta https://luma.com/ujffj66o, o https://forward.neety.com/ que redirige '
            'a ese mismo evento conservando la query. Un post de evento sin el enlace '
            'no sirve de nada')
        _agenda = re.search(r'\b(agenda|programa|ponencias?|horario|charlas?)\b.{0,40}\b(ser[aá]|habr[aá]|incluye)',
                            texto, re.I)
        chk(not _agenda, 'EVENTO: vende la SALA, no el programa (§4.4b)',
            'el motor validado es QUIEN esta dentro y por que se ha elegido a mano, '
            'no la agenda ni los ponentes. Grace Gong hizo 11.6x y 14.4x contando la sala')

    if pilar == 'mapa':
        # EXPERIMENTO mapa -> Luma (post-workflow §4.4-CONVERSION-EVENTO punto 2,
        # Iker 22/09): mientras viva el evento, el mapa puede llevar como UNICA
        # puerta el enlace de Luma en vez de la pagina del mapa. Caduca el 24/09.
        import datetime as _dt
        _mapa_luma = (_dt.date.today() <= _dt.date(2026, 9, 24)
                      and re.search(r'luma\.com/ujffj66o|forward\.neety\.com', texto)
                      and 'recursos.neety.com/mapas/' not in texto)
        # 2026-10-19 (global §4.4b-WEBINAR, Iker): mientras viva el webinar del 28/10,
        # el mapa lleva el evento en el texto y el enlace de Luma EN LUGAR del blog.
        # El de la C. Valenciana de Unai (16/10) fue al blog: 165.246 impresiones y
        # ni un inscrito. La regla se escribio en la receta y no aqui, asi que el
        # check tumbaba justo lo que la receta manda. Caduca el 28/10.
        _mapa_luma = _mapa_luma or (_dt.date.today() <= _dt.date(2026, 10, 28)
                                    and 'luma.com/7hhyx07z' in texto)
        # 2026-10-08: los mapas se mudan al blog de neety.com
        # (/blog/mapa-industrial-{region}); recursos.neety.com/mapas/ solo
        # redirige los 14 que ya existian, asi que una region NUEVA va directa
        # al blog. Se aceptan las dos para no tumbar los mapas viejos.
        _mapa_web = ('recursos.neety.com/mapas/' in texto
                     or 'neety.com/blog/mapa-industrial-' in texto)
        # 2026-10-28 (post-workflow §8.1b): el gate de un recurso de la Academia puede ser
        # la puerta de cualquier pilar, peloteo incluido. Ya se habia abierto para meme y
        # "Las 10"; el mapa seguia exigiendo el blog y tumbaba el primer mapa al gate.
        _mapa_gate = 'neety.com/academia/' in texto
        chk(_mapa_web or bool(_mapa_luma) or _mapa_gate,
            'MAPA: el CTA enlaza a /mapas/{region}/ (§4.2 Paso 5)',
            'el mapa NO enlaza a /agendar/. Va "Mapa completo aquí: '
            'https://neety.com/blog/mapa-industrial-{region}", con la region en minuscula y sin '
            'tildes. El enlace a agendar se olia a venta; el del mapa se lee como recurso')
        chk('recursos.neety.com/agendar' not in texto,
            'MAPA: sin enlace a /agendar/ (§4.2 Paso 5)',
            'queda el CTA viejo a agendar. Se sustituye por el enlace a la pagina del mapa')

    if pilar == 'mapa':
        m = re.search(EJE_CALLADO, cuerpo, re.I)
        chk(not m, 'Eje "callado" PROHIBIDO en mapas (post-workflow §4.2)',
            f'"{m.group(0)}" → rota a otro eje de mérito' if m else '')
        menciones = [b for b in bs if b and b[0].strip().startswith('→')]
        chk(bool(menciones), 'Bloque de menciones presente', '')
        if menciones:
            todas = [l for b in menciones for l in b]
            sin_arroba = [l for l in todas if l.count('@') < 2]
            chk(not sin_arroba, 'Menciones con @ en empresa Y persona (§4.2 Paso 4)',
                f'{len(sin_arroba)} líneas sin las 2 arrobas' if sin_arroba else '')
            chk(all(len(b) == 4 for b in menciones), 'Menciones en bloques de 4 (5×4)',
                f'bloques de {[len(b) for b in menciones]}')
    # ---------- GARANTIA DE VIRALIDAD · LEAD MAGNET (Iker, 2026-08-05) ----------
    # Estos tres checks NO son de forma: comprueban que el post repite lo que
    # YA nos ha funcionado a NOSOTROS. La evidencia esta en nuestras cuentas:
    #   · 5 lead magnets con Claude, los 5 con +100 comentarios (632/285/232/183/167)
    #   · mediana con IA 167 comentarios, sin IA 20
    #   · los 5 mejores son EXPERIMENTOS en primera persona, no paquetes
    #   · mediana de comentarios: mayo 208 -> junio 18, justo cuando dejamos de
    #     contar experimentos y empezamos a repartir "biblias" y "arsenales"
    if pilar == 'leadmagnet':
        _hook_l = hook_txt.lower()
        chk('claude' in _hook_l,
            'GARANTIA: Claude nombrado en el GANCHO (§4.5.0a)',
            'los 5 lead magnets nuestros con Claude pasaron de 100 comentarios; los que no '
            'lo llevan se quedan en 20 de mediana. Va en la PRIMERA linea, no solo en el cuerpo')
        # ⭐ 2026-08-05, Iker: yo tenia esto como DOS moldes rivales y basta-con-uno.
        # Es falso. Los 5 lead magnets nuestros de Claude, por comentarios:
        #   632c  🚨 ÚLTIMA HORA: Claude ACABA DE MATAR el cold outbound       <- los dos
        #   285c  LE PASE las llaves de mi LinkedIn a Claude…
        #   232c  LE TIRE las llaves de mi LinkedIn a Claude…
        #   183c  CLAUDE ME HA AYUDADO a cazar miles de leads…
        #   167c  🚨 ÚLTIMA HORA: Claude HA REDUCIDO toda mi prospeccion…      <- los dos
        # El #1 y el #5 llevan DISPARADOR *y* Claude+verbo. Y el disparador no es
        # "el molde de ellos": es el nuestro tambien, y ademas coincide con lo que
        # usan Martin Arosa y Guillermo Flor. Eso es DOBLE validacion (dentro y
        # fuera), asi que llevar los dos no es redundante, es la maxima garantia
        # que sabemos comprar. Uno solo pasa; los dos se aplauden.
        # ⛔ 2026-08-05, Iker: se me colo "te saca su nombre y su perfil SIN PAGAR
        # una herramienta" cuando a esa persona la encontramos con Sales Navigator
        # (de pago) y Unipile (49 €/mes minimo, 7 dias de prueba y ya). Es la misma
        # familia de mentira que inventarse una empresa, y encima la desmonta
        # cualquiera que lo intente. NUESTRO STACK REAL: Claude + LinkedIn Premium
        # + Sales Navigator + Unipile. Todo menos Claude a secas se paga.
        _gratis = re.search(r'sin pagar|sin gastar|gratis y sin|sin (?:ninguna |ninguna otra )?herramienta'
                            r'|no (?:hace falta|necesitas) (?:pagar|ninguna herramienta|herramientas)'
                            r'|sin suscri|sin licencia|cero herramientas', cuerpo, re.I)
        chk(not _gratis,
            'Ninguna promesa de "sin pagar/sin herramientas" (§4.5.0a)',
            (f'dice "{_gratis.group(0)}" y a la persona la sacamos con Sales Navigator + Unipile, '
             'que se pagan los dos. Di lo que el prompt SI hace ("te da el filtro exacto"), '
             'no lo que te ahorra. Regla general: toda promesa del cuerpo se verifica contra '
             'el stack que usamos DE VERDAD, igual que se verifica una cifra') if _gratis else '')
        _disp = re.search(r'ÚLTIMA HORA|ULTIMA HORA|D\.?E\.?P\.?|BREAKING|ADIÓS|ADIOS', hook_txt, re.I)
        _exp = re.search(MOLDE_EXPERIMENTO, hook_txt, re.I)
        chk(bool(_disp) or bool(_exp),
            'GARANTIA: el gancho usa uno de los DOS moldes validados (§4.5.0a)',
            'ni DISPARADOR ("🚨 ÚLTIMA HORA…", nuestro #1 y nuestro #5) ni Claude+VERBO '
            '("Claude acaba de matar…", "Le tiré las llaves a Claude…"). '
            'LO IDEAL ES LLEVAR LOS DOS: es la estructura exacta del de 632 comentarios')
        chk(bool(_disp) and bool(_exp),
            'GARANTIA MAXIMA: el gancho combina DISPARADOR + Claude+VERBO (§4.5.0a)',
            'llevas solo uno de los dos. El de 632 comentarios (y el de 167) llevan los dos '
            'en la misma linea: "🚨 ÚLTIMA HORA: Claude acaba de matar el cold outbound". '
            'Doble validacion: nuestro historial Y el de Martín Arosa/Guillermo Flor',
            aviso=True)
        _yo = len(re.findall(r'\b(yo|mi|mis|me|uso|hago|publico|llevo|prob[eé]|le (?:di|pas[eé]|tir[eé]))\b',
                             cuerpo, re.I))
        chk(_yo >= 4, 'GARANTIA: es un EXPERIMENTO en primera persona, no un paquete (§4.5.0a)',
            f'solo {_yo} marcas de primera persona. Nuestros 5 mejores son "YO hice X, me paso Y, '
            'te doy lo que use" (632/483/285/232/183 comentarios). Los paquetes ("la biblia", '
            '"el arsenal", "la lista definitiva") se hundieron a 18 de mediana en junio')

    if pilar == 'leadmagnet':
        # El gancho abre SIEMPRE con el disparador de última hora + emoji de alarma
        # (post-workflow §4.5.0). Es la estructura de nuestros 2 mejores (9.96x y
        # 2.72x) y la que usan SIN FALTA Guillermo Flor y Martín Arosa. Como
        # "exporta" en los mapas: obligatorio, no decorativo (Iker, 2026-07-23). La
        # lista de Unai (22/07) arrancó fría por saltárselo.
        # ⭐ CORREGIDO EL 2026-08-05: esto exigia que el hook EMPEZARA por alarma,
        # y era verdad mientras la referencia fueran Martin Arosa y Guillermo Flor.
        # Al mirar NUESTROS datos resulta que 4 de nuestros 5 mejores NO abren con
        # alarma, abren con un experimento en primera persona. Los dos moldes valen,
        # y el de experimento tiene mas respaldo interno.
        h = hook_txt.strip()
        _experimento = bool(re.search(MOLDE_EXPERIMENTO, h, re.I))
        alarma = h.startswith('🚨') or h.startswith('⚰') or h.startswith('⚰️') or _experimento
        chk(alarma, 'Hook: alarma 🚨/⚰️ o EXPERIMENTO en 1a persona (§4.5.0)',
            'los 2 mejores lead magnets abren con "🚨 ÚLTIMA HORA:" / "⚰️ D.E.P."; '
            'sin el disparador el post arranca frío' if not alarma else '')
        # ⛔ LA LONGITUD DE UNA LISTA NUMERADA ES UNA CIFRA ELEGIDA, Y VA IMPAR
        # (Iker, 2026-08-26). La regla existia desde el 2026-08-05 en
        # `post-workflow §4.5.0a punto 4` ("5 y 7 rinden mas que 4 y 6 en lista
        # numerada") y aun asi entregue una lista de OCHO, calcando el numero de
        # secciones del recurso. Iker: "tu sabes perfectamente en la receta global
        # que siempre que se vayan a mencionar numeros, o en este caso en
        # numeraciones, tambien tiene que ser impar; creo que esa casuistica no la
        # tenias en cuenta". No la tenia: `§2.5b` habla de cifras DENTRO del texto
        # y nadie contaba los items.
        #
        # Y no es solo estetica, hay dos motivos de negocio encima:
        #   · el recurso lo construimos nosotros, asi que cada punto de mas es
        #     una seccion mas que desarrollar, y
        #   · un recurso que se lee larguisimo se pide menos. Iker: "si ven que es
        #     un recurso larguisimo, a nivel psicologico creo que no nos lo van a
        #     pedir".
        # Por eso 5 gana a 7, y 7 gana a 9: a igualdad de valor, la lista corta.
        _items = re.findall(r'^\s*(\d+)[.)]\s', cuerpo, re.M)
        if len(_items) >= 3:
            chk(len(_items) % 2 == 1,
                'La lista numerada tiene un numero IMPAR de items (§4.5.0a p.4)',
                f'{len(_items)} items, y es PAR. 5 y 7 rinden mas que 4, 6 y 8. '
                'Quita uno o añade otro, y con el recurso delante: cada item es una '
                'seccion que hay que escribir, y una lista larga se pide menos'
                if len(_items) % 2 == 0 else '')

        if generico:
            # La vara de medir de este pilar es Martín Arosa y Guillermo Flor (los
            # que MÁS comentarios sacan del sector), NO nuestro historial de flops
            # —que no vale, salvo el 9.85x de Unai, que además usó ESTE formato—.
            # Su cuerpo SIEMPRE lleva una LISTA NUMERADA de lo que hay dentro del
            # recurso, y es LARGO (setup + malo/bueno + lista + ancla de valor). El
            # nuestro se quedaba corto (`§4.5.0b`).
            _numerados = re.findall(r'^\s*\d+[.)]\s', cuerpo, re.M)
            chk(len(_numerados) >= 3, 'GENÉRICO: lista numerada de lo que hay dentro (§4.5.0b)',
                f'{len(_numerados)} ítems numerados — ellos enumeran los componentes del recurso, mínimo 3'
                if len(_numerados) < 3 else '')
            chk(len(cuerpo) >= 320, 'GENÉRICO: cuerpo LARGO como el suyo (§4.5.0b)',
                f'{len(cuerpo)} car — el suyo es largo (setup + malo/bueno + lista + ancla de valor); no te quedes corto'
                if len(cuerpo) < 320 else '')
        # 4.4e: el veto vale para los DOS enlaces. El correo tampoco va en el POST
        # del lead magnet: entra por el DM privado (que ya lleva ninja) y por el
        # consentimiento del gate, que son superficies donde no compite con nada.
        chk(not tiene_link, 'Lead magnet SIN spam ninja, ni el de agendar ni el de correo (§4.4b y §4.4e)',
            'el link apila un 2º CTA y hunde los comentarios. El correo entra por el DM y por '
            'el gate, no por el post' if tiene_link else '')
        # ⛔⛔ EL CTA DEL LEAD MAGNET CAMBIO EL 2026-08-10 (ver §4.5.0-CTA).
        #
        # Aqui vivian ocho checks alrededor de `Comenta "palabra"`: que estuviera
        # explicito, entre comillas, en minusculas, sin tildes, con 2o dato, sin
        # repetir, sin gastar y reconectando con el gancho. TODOS EN SUSPENSO.
        #
        # LinkedIn dejo de repartir ese mecanismo entre el 4 y el 5 de agosto de
        # 2026. Medido en la cuenta de Martin Arosa: del 13/07 al 31/07 usa el
        # gate en todos sus lead magnets y saca entre 527 y 1.398 comentarios; el
        # 03/08 saca 7 y el 04/08 saca 41, los dos con gate; y desde el 05/08 no
        # lo vuelve a usar ni una vez y recupera 543, 402, 483 y 145. A nosotros
        # nos costo CUATRO publicaciones capadas antes de verlo.
        #
        # No se borra de la historia porque el mecanismo puede volver. Hoy el CTA
        # es el suyo: pregunta directa + regalarlo + conectar.
        _gate = re.search(r'coment[a\u00e1]\w*\s+["\u201c\u00ab\']', cuerpo, re.I)
        chk(not _gate, 'CTA: SIN "Comenta la palabra X", el mecanismo esta capado (§4.5.0-CTA)',
            'LinkedIn dejo de repartirlo el 05/08/2026: a Martin Arosa lo hundio de 1.254 a 7 '
            'comentarios y a nosotros nos costo 4 posts. Usa la pregunta' if _gate else '')
        _preg = re.search(r'\u00bf[^?]{5,90}\?', cuerpo)
        chk(bool(_preg), 'CTA: una PREGUNTA directa ofreciendo el recurso (§4.5.0-CTA)',
            'el CTA nuevo abre con una pregunta tipo "\u00bfQuieres los 5 mensajes?". La gente '
            'comenta igual, pero el comentario sale de ellos y cada uno escribe algo distinto, '
            'que ademas es lo que evita que parezcan comentarios coordinados' if not _preg else '')
        _regalo = re.search(r'gratuit|gratis|acceso libre|sin coste', cuerpo, re.I)
        chk(bool(_regalo), 'CTA: se dice que se comparte GRATIS (§4.5.0-CTA)',
            'sus tres ultimos lo dicen dos veces, "de forma gratuita" y "acceso libre". '
            'La palabra gratis no penaliza: medida en 15 posts nuestros, mediana 3.884 '
            'impresiones y ninguno por debajo de 500' if not _regalo else '')
        # ⛔ VOLTEADO EL 2026-08-18 (Iker). Este check EXIGIA "(Conecta conmigo...)"
        # y ahora lo PROHIBE. Motivo: el 18/08 el lead magnet de Unai se quedo en
        # 40 impresiones en 20 minutos con esa linea dentro; al quitarla y resubir,
        # aparecio en el feed Principal de las 3 cuentas en 4 minutos. Es el mismo
        # patron que "comenta" el 05/08. Iker: "que nunca mas volvamos a poner en el
        # texto ni comenta ni conecta ni cosas similares, pese a que las referencias
        # lo hagan". La peticion sigue viva, pero se mueve a la RESPUESTA al
        # comentario y al banner de la imagen, que LinkedIn todavia no lee.
        _pedir = re.search(r'\b(conecta conmigo|conectad?|comenta\w*|comparte|comp[aá]rtelo|'
                           r'gu[aá]rdal[oa]|s[ií]gueme|etiqueta|repostea|dale a|comp[aá]rteme)\b',
                           cuerpo, re.I)
        chk(not _pedir, 'CTA: NINGUNA peticion explicita de accion en el TEXTO (§4.5.0-CTA)',
            (f'dice "{_pedir.group(0)}". LinkedIn persigue la peticion explicita de engagement '
             'porque infla la senal de la primera hora, que es la que decide el reparto. Medido '
             'dos veces en nuestra cuenta: "comenta" el 05/08 y "conecta conmigo" el 18/08 (40 '
             'impresiones en 20 min; sin la linea, en el feed de las 3 cuentas en 4 min). La '
             'peticion va en el BANNER de la imagen y en la RESPUESTA al comentario, nunca aqui')
            if _pedir else '')

        _pref = re.search(r'\b(instalar|instalaci[oó]n|descargar|descarga)\b', cuerpo, re.I)
        chk(not _pref, 'Sin "instalar"/"descargar" (preferencia de marca de Iker)',
            (f'dice "{_pref.group(0)}". No hay dato de que penalicen (3 y 1 post en todo el '
             'corpus), pero Iker las tiene vetadas y suelen sobrar: "No hay nada que montar" '
             'dice lo mismo. Ojo, "gratis" SI vale: 3.884 de mediana y esta en el gancho '
             'del de 483 comentarios') if _pref else '', aviso=True)

    # ---------- AUDITORIA 2026-07-20 · POR PILAR ----------
    _flechas = [l for l in cuerpo.splitlines() if re.match(r'^\s*→\s', l)]

    # ---------- DESPIECE / OBJETO (4.7) ----------
    if pilar == 'objeto':
        # 🔧 CORREGIDO EL 2026-09-16. Este check exigia ademas un " - " DESPUES de
        # los dos puntos, o sea una PERSONA en cada ficha, y eso contradice el
        # canonico de §4.2 Paso 4 (Iker, 07/08): "como hay dos que no tienen,
        # entonces no pones ninguna, eso no me parece bien" -> una ficha sin
        # persona sigue mencionando a la empresa y se queda. La prueba de que el
        # check estaba mal es que TUMBABA el despiece de Navarra publicado el
        # 07/08, que es el molde del pilar y llevaba 6 de 12 fichas sin persona.
        # Lo que SI es la firma del pilar es "pieza + dos puntos + @empresa".
        _piezas = [l for l in _flechas if ':' in l and '@' in l.split(':', 1)[1]]
        chk(len(_piezas) == len(_flechas) and len(_flechas) > 0,
            'OBJETO: cada ficha lleva la pieza delante y los dos puntos (4.7)',
            f'{len(_flechas) - len(_piezas)} de {len(_flechas)} sin ese formato. Es la firma '
            'del pilar y lo que lo distingue del mapa en el clasificador')
        # Aviso aparte: cuantas fichas llevan persona. No es fallo (§4.2 Paso 4),
        # pero es lo unico que correlaciona con que el peloteo reparta
        # (outliers §3.13: lo que cuenta es cuantos mencionados contestan).
        _con_persona = [l for l in _piezas if l.split(':', 1)[1].count('@') >= 2]  # por arrobas: `@MFS - SINTERING` lleva guion y no es persona
        chk(True, 'ENTREGA: cuantas fichas llevan PERSONA, no solo empresa (4.7)',
            f'{len(_con_persona)} de {len(_piezas)}. Una ficha sin persona sigue notificando a la '
            'pagina y se queda (§4.2 Paso 4), pero el motor del pilar son los mencionados que '
            'contestan: si bajas de la mitad, dilo en la entrega como riesgo', aviso=True)
        # ⛔ SON 12 EXACTAS, no "10 minimo" (Iker, 2026-08-07). No es una
        # preferencia de texto: la PLANTILLA de la llanta tiene 12 huecos, asi
        # que 11 deja un hueco vacio y 13 no cabe. El texto y la imagen son la
        # misma pieza y el numero lo manda la imagen. Vale para el despiece de
        # cualquier objeto y cualquier sector, no solo la llanta de automocion.
        chk(len(_piezas) == 12,
            'OBJETO: EXACTAMENTE 12 piezas, las que tiene la plantilla (4.7)',
            f'{len(_piezas)}. Por debajo de 10 no se publica: se cambia de region, no se rellena'
            if len(_piezas) < 10 else f'{len(_piezas)} (apunta siempre a 20)')
        # Bloques de 4, y el ultimo puede bajar a 2 o 3. Nunca uno de 1, y nunca
        # un 5 pegado a un 2: eso es lo que se lee como descuadre.
        _bl, _act = [], 0
        for _l in cuerpo.splitlines():
            if _l.strip().startswith('→'):
                _act += 1
            elif _act:
                _bl.append(_act)
                _act = 0
        if _act:
            _bl.append(_act)
        _ok_bl = bool(_bl) and all(b == 4 for b in _bl[:-1]) and _bl[-1] in (2, 3, 4)
        chk(_ok_bl, 'OBJETO: bloques de 4 y el ultimo de 2, 3 o 4 (4.7)',
            f'bloques de {_bl}. Todos de 4 salvo el ultimo, que puede bajar a 2 o 3')
        # ⛔ CHECK RETIRADO EL 2026-08-07 · CONTRADECIA A §4.2 PASO 1.
        # Aqui se exigia que el despiece NO llevara la comparacion con otro pais
        # ("es la firma del mapa"), mientras que §4.2 Paso 1 la EXIGE. Los dos
        # checks corrian a la vez, asi que ningun despiece podia pasar el
        # validador: si metias el pais fallaba este y si lo quitabas fallaba el
        # otro. Manda §4.2, porque su texto es una CORRECCION posterior del
        # 31/07 que dice literalmente que la version de aqui estaba mal: lo que
        # diferencia al despiece del mapa no es quitar `exporta`, es el objeto,
        # el despiece por piezas y la imagen de la llanta.
        chk(True, 'OBJETO: la comparacion con otro pais SI va (§4.2 Paso 1)',
            'esa es la firma del MAPA. Aqui el remate del gancho es el OBJETO')

    if pilar in ('mapa', 'los10') and _flechas:
        # §4.2/§4.3 — la frase de entrada va SOLA. Pegada a la lista, el bloque
        # se lee como un muro.
        _lineas = cuerpo.splitlines()
        _i = next(i for i, l in enumerate(_lineas) if re.match(r'^\s*→\s', l))
        chk(_i > 0 and not _lineas[_i - 1].strip(),
            'Linea en blanco antes de la primera → (§4.2 Paso 4)',
            'pegada a la entrada, la lista se lee como un muro' if _i > 0 and _lineas[_i-1].strip() else '')

        # §4.0c — ni una entidad repetida de posts anteriores. El cruce cuenta
        # las TRES cuentas y los DOS formatos: en Cataluña habia 83 ya usadas
        # entre el mapa de Iker y el "Los 10" de Unai. El objetivo es traer
        # clientes NUEVOS, no repetir a los de siempre.
        _mm = {} if historico else leer_menciones_usadas()
        if _mm:
            _rep = []
            for l in _flechas:
                for e in l.replace('→', '').split('·')[0].split(' - '):
                    e = e.strip()
                    if len(e) < 3:
                        continue
                    k = normalizar_entidad(e)
                    if k in _mm.get('entidades', {}):
                        _rep.append(f"{e} ({', '.join(_mm['entidades'][k]['posts'][:2])})")
            chk(not _rep, 'Ninguna empresa ni persona repetida (§4.0c)',
                f"{len(_rep)} repetida(s): {'; '.join(_rep[:3])}" if _rep else
                f"cruzado contra {_mm.get('total', 0)} ya mencionadas")

    if pilar == 'mapa':
        # §4.2 Paso 4 — el objetivo son 20. Si la region no da, se baja, pero el
        # SUELO son 10 (Iker, 2026-07-29): por debajo de 10 el post no se hace,
        # y nunca se rellena con inventadas para llegar a una cifra bonita.
        _n = len(_flechas)
        chk(_n >= 10, 'Mapa con 10 menciones como MÍNIMO (§4.0c)',
            f'{_n}. Por debajo de 10 la publicacion NO se hace. Nunca rellenes con inventadas'
            if _n < 10 else (f'{_n} (el objetivo son 20; con menos vale, pero apunta siempre a 20)'))
        # §4.0b — en el mapa la ficha NO lleva logro. Ese es el formato de "Los 10".
        _con_logro = [l for l in _flechas if '·' in l]
        chk(not _con_logro, 'Mapa sin logro en la ficha (§4.0b)',
            f'{len(_con_logro)} llevan "·": eso es formato de "Los 10"' if _con_logro else '')

    if pilar == 'los10':
        # ⛔⛔ LOS INAMOVIBLES DEL GANCHO DE "LOS 10" (Iker, 2026-09-15).
        # Iker: "si no, por mucho que la plantilla de la foto sea siempre igual,
        # estamos arriesgando demasiado". El mapa tiene sus 4 inamovibles desde
        # julio (prejuicio ajeno, 2 cliches, `exporta`, comparacion-pais) y este
        # pilar no tenia ninguno: cada gancho se escribia de cero.
        # Destilados de los CUATRO "Los 10" del historico, y el corte es limpio:
        # los dos que vuelan llevan las TRES piezas y cada uno de los dos flojos
        # falla exactamente UNA.
        #   4.43x  puente SI · gerundio "quemando"   · region no
        #   2.49x  puente SI · gerundio "comiendose" · region no
        #   0.75x  puente NO · gerundio "aguantando" · region no
        #   0.53x  puente SI · gerundio NINGUNO      · region SI (catalanas)
        # n=4, asi que van de AVISO y no de fallo duro, salvo la region, que
        # ademas ya era regla escrita (§4.3 Paso 3b: no se nombra hasta el reveal).
        _g10 = cuerpo.splitlines()[0]
        _puente = LAS10 or re.search(r'^(las?|ningun[ao]|est[ae]s?)\s+(empresas?|f[aá]bricas?|'
                            r'compa[nñ][ií]as?|firmas?|negocios?)', _g10, re.I)
        chk(bool(_puente), 'LOS 10: el gancho abre por la EMPRESA y gira a la PERSONA (§4.3 Paso 1)',
            'arranca en la persona. Los dos que vuelan (4.43x y 2.49x) abren por la empresa o '
            'su resultado y giran a alguien sin nombre dentro de la misma frase; el que arranca '
            'directo en el comercial se quedo en 0.75x', aviso=True)
        _ger = LAS10 or re.search(r'\b\w+(ando|iendo|[eé]ndose|[aá]ndose)\b', _g10, re.I)
        chk(bool(_ger), 'LOS 10: el gancho lleva la HERIDA FISICA en gerundio (§4.3 Paso 1)',
            'sin gerundio de herida. Los tres que pasan de 0.75x lo llevan (quemando el '
            'telefono, comiendose noes, aguantando el no); el unico sin el es el 0.53x, que '
            'cambio la herida del oficio por una de ego (no salir en la foto)', aviso=True)
        _reg10 = re.search(r'\b(catalan\w*|vasc\w*|navarr\w*|asturian\w*|gallego\w*|galleg\w*|'
                           r'andaluz\w*|murcian\w*|aragon\w*|guipuzcoan\w*|vizcain\w*|alaves\w*|'
                           r'riojan\w*|extremeñ\w*|manchego\w*|canari\w*|balear\w*|cantabr\w*|'
                           r'gipuzkoa|bizkaia|araba|euskadi|catalu[nñ]a|navarra|asturias|galicia|'
                           r'andaluc[ií]a|murcia|arag[oó]n|cantabria|extremadura|la rioja)\b',
                           _g10, re.I)
        chk(not _reg10, 'LOS 10: la REGION no se nombra en el gancho (§4.3 Paso 3b)',
            ('dice "%s". La region se revela al final, despues de la lista y de los cliches. '
             'El unico "Los 10" que la nombra arriba es el de Cataluna, 0.53x, el peor del '
             'pilar') % _reg10.group(0) if _reg10 else '')
        if not LAS10:
            # El bloque que Iker pide ver en CADA entrega, para validar el gancho de un
            # vistazo contra los que ya funcionaron.
            # §4.3 Paso 7 (Iker, 2026-07-29; reincidido el 2026-09-15). La frontera del
            # formato es el NUMERO de menciones y yo daba el del mapa cuatro entregas
            # seguidas: con 20 va linea a linea, con 10 o menos va en TABLA.
            chk(False, 'ENTREGA: la guia de menciones de "Los 10" va en TABLA, no linea a linea',
                'columnas: # · Persona (enlace) · Cargo · Empresa (enlace) + sede · Ultima '
                'actividad · Logro. Persona primero, que es el orden del cuerpo en este pilar, '
                'y el logro se mantiene porque aqui es el criterio de seleccion. Enlaces '
                'markdown CLICABLES y FUERA de bloque cercado. Debajo, una linea por cada ficha '
                'con peculiaridad (nombre de LinkedIn raro, persona fuera de la region, '
                'actividad al limite): es lo que le ahorra abrir los diez perfiles', aviso=True)
            chk(False, 'ENTREGA: el bloque de los GANCHOS del pilar, de mas outlier a menos',
                'despues del texto va un bloque cercado con los ganchos reales de "Los 10" '
                'ordenados por ratio, para poder comparar el nuevo de un vistazo: '
                '4.43x/49.426 "Las empresas que mas vendieron este año tienen algo en comun: '
                'personas desconocidas quemando el telefono" · 2.49x/27.795 "Ninguna empresa '
                'vende mas por suerte. Alguien lleva un año comiendose noes para arrancar un si" '
                '· 0.75x/8.486 "Hay comerciales aguantando el no a primera hora para que su '
                'fabrica no pare" · 0.53x/6.572 "Las empresas catalanas que mas venden salen en '
                'la foto. Quien las hace vender no sale en ninguna". Son CUATRO, no cinco: el '
                'pilar tenia cuatro publicados. ⭐ QUINTO, subido el 15/09 y pendiente de ratio: '
                '"Las empresas que mas venden no tienen mejor producto. Tienen a alguien '
                'tragandose carretera" (Unai, Gipuzkoa), el primero escrito con los tres '
                'inamovibles delante. Cuando tenga numero, entra ordenado',
                aviso=True)
            # §4.3 Paso 6c (Iker, 2026-09-15) - la orla aprobada se archiva. No es
            # un check del texto: es el paso que se cae al cerrar el post, porque
            # ocurre DESPUES de que Iker de el visto bueno a la imagen y para
            # entonces la conversacion ya va de otra cosa.
            chk(False, 'ENTREGA: cuando Iker apruebe la ORLA, archivarla en la carpeta del pilar',
                r'copiarla a C:\Users\LENOVO\Documents\Mario\LINKEDIN GROWTH\PELOTEO REGIONAL\LAS 10\ '
                'con el nombre "los 10 <region>.png": minusculas, SIN tildes ni eñes y sin guiones, '
                'calcando lo que ya hay (los 10 euskadi / cataluna / asturias / andalucia). El nombre '
                'se lista de la carpeta antes de escribirlo, no se inventa. ⏳ El disparador es su OK '
                'sobre la IMAGEN, no la entrega del post: mientras pueda llegar una foto mejor, un '
                'fichero viejo ahi es peor que ninguno, porque la siguiente region se clona de el. '
                'La copia del Escritorio se queda: esto es el archivo del pilar', aviso=True)
        else:
            # ---------- "LAS 10": EL GANCHO ES EL DEL MAPA (Iker, 2026-10-01) ----------
            # Los cuatro inamovibles (sujeto ajeno, 2 cliches, `exporta`, pais
            # concreto) y sus listas de quemadas los comprueba el bloque del
            # GANCHO DEL PELOTEO, igual que en mapa y despiece. Aqui ponia
            # "SIN la comparacion-pais" y era criterio mio sin dato: Iker lo
            # tumbo el mismo dia ("si sabemos que eso funciona, lo copiamos").
            # ---------- "LAS 10": EL CUERPO TAMBIEN ES EL DEL MAPA (Iker, 2026-10-01) ----------
            # La v2 del primer caso resumio el bloque de numeros en UNA linea y no
            # llevaba la anafora de negacion: Iker lo echo en falta. Se mecaniza
            # aqui y no en el mapa para no reabrir el historico del mapa.
            _nums = [l for l in cuerpo.splitlines() if re.match(r'^\s*[1-3]\.\s', l)]
            _con_fuente = [l for l in _nums if re.search(r'\([^)]*[A-Za-zÁÉÍÓÚ][^)]*\)\s*\.?\s*$', l)]
            chk(len(_nums) >= 3 and len(_con_fuente) >= 3,
                'LAS 10: bloque de 3 NUMEROS con su fuente, como el mapa (§4.3-LAS10 punto 5)',
                f'{len(_nums)} lineas numeradas, {len(_con_fuente)} con fuente entre parentesis al final. '
                'El molde: 1. gente que vende X · 2. el pais con N veces mas gente se queda en Y · '
                '3. un dato de estructura o crecimiento. Y debajo, la linea resumen')
            _anaf = re.search(r'^No (?:paga|pagan)\b.*\n(?:No|Ni)\b', cuerpo, re.M | re.I)
            chk(bool(_anaf), 'LAS 10: anafora de negacion con cliches, como el mapa (§4.3-LAS10 punto 11)',
                'falta el "No pagan las nominas X. / No las paga Y. / Ni Z." con cliches del CUERPO: '
                'es lo que da el merito sin caer en el eje "callado"')
            _desde = re.findall(r',\s+desde\s+[A-ZÁÉÍÓÚ]', cuerpo)
            chk(len(_desde) >= 2, 'LAS 10: productos de casa con su PUEBLO (§4.3-LAS10 punto 10)',
                f'{len(_desde)} lineas "[producto de casa], desde [pueblo]". Salen de las propias fichas', aviso=True)
            _callado = re.search(EJE_CALLADO, cuerpo, re.I)
            chk(not _callado, 'LAS 10: sin el eje "callado" (§4.2 Paso 3.5)',
                f'"{_callado.group(0)}": con las EMPRESAS de protagonistas vale lo del mapa' if _callado else '')
            chk(False, 'ENTREGA: la guia de menciones de "Las 10" va en TABLA, EMPRESA primero',
                'columnas: # · Empresa (enlace) + sede · Persona (enlace) · Cargo · Ultima actividad '
                '· Logro con su fuente. La empresa primero, que es el orden del cuerpo en este pilar '
                '(`→ @Empresa - @Persona · logro`). Enlaces markdown CLICABLES fuera de bloque cercado', aviso=True)
            chk(False, 'ENTREGA: el bloque de los GANCHOS de "Los 10" y "Las 10", de mas a menos',
                'son los del mismo formato de orla; hasta que "Las 10" tenga los suyos, se compara '
                'contra los cinco "Los 10" publicados (sacados de la BD, no de memoria) y contra el '
                'mejor mapa de la cuenta, que es la otra familia de su gancho', aviso=True)
            # Iker, 2026-10-01: "no me las tienes que guardar en el escritorio". La
            # orla se renderiza con --salida directamente en la carpeta del pilar,
            # como el despiece en DESPIECE/.
            chk(False, 'ENTREGA: la ORLA de LOGOS, guardada DIRECTAMENTE en la carpeta del pilar, nunca en el Escritorio',
                r'--salida en C:\Users\LENOVO\Documents\Mario\LINKEDIN GROWTH\PELOTEO REGIONAL\LAS 10\ con el nombre '
                '"las 10 <region>.png" (minusculas, sin tildes, eñes ni guiones: "las 10 castilla la mancha"). Titulo: "LAS 10 QUE LEVANTAN|LA '
                'INDUSTRIA [XXX]", en escalera y el naranja en la region. El nombre de cada empresa en la orla es su nombre de MARCA (el que se lee en '
                'su logo), sin S.A. ni tagline; la @ del post sigue siendo el nombre exacto de LinkedIn', aviso=True)
        # ⛔⛔ CADA FICHA LLEVA LAS DOS MENCIONES, SIEMPRE (Iker, 2026-09-15).
        # Casuistica nueva: cuando el NOMBRE de LinkedIn de la persona ya incluye
        # el de su empresa ("Aitor Lizarraga - AMPO-POYAM Valves"), la ficha PARECE
        # completa con una sola arroba y yo la entregue asi, por estetica. Iker lo
        # arreglo a mano: "siempre tenemos que mencionar a ambos para maximizar el
        # alcance". Y tiene razon: el nombre escrito NO notifica a la pagina de la
        # empresa; solo la @ lo hace. Una ficha con una arroba es una notificacion
        # regalada, que es justo el motor del pilar.
        _una = [l for l in _flechas if l.count('@') < 2]
        chk(not _una, 'Cada ficha lleva DOS menciones, persona Y empresa (§4.3 Paso 2)',
            ('%d con una sola @: "%s". Aunque el nombre de la persona ya lleve la empresa '
             'dentro, la @ de la empresa va igual: el texto no notifica, la mencion si'
             % (len(_una), _una[0][:60])) if _una else '')
        chk(len(_flechas) == 10, '"Los 10" con exactamente 10 fichas (§4.3 Paso 2)',
            f'{len(_flechas)}' if len(_flechas) != 10 else '')
        _sin_logro = [l for l in _flechas if '·' not in l]
        chk(not _sin_logro, 'Cada ficha lleva su logro tras "·" (§4.3 Paso 2)',
            f'{len(_sin_logro)} sin logro' if _sin_logro else '')
        # §4.3 Paso 3b — el unico numero del pilar es el logro. El 4.81x del Pais
        # Vasco no llevaba NI UNA cifra regional: descentra el post de las
        # personas y canibaliza el mapa.
        # ⛔ BUG ARREGLADO EL 2026-08-24. Esto marcaba CUALQUIER linea con un digito,
        # y la regla no dice eso: dice "ninguna CIFRA REGIONAL", con el ejemplo
        # "exporta mas que Bolivia entera". La prueba de que estaba mal es que
        # tumbaba los TRES "Los 10" que existen, incluido el 4.81x del Pais Vasco
        # que el propio Paso 3b cita como el que NO lleva ni una. Lo que cazaba era
        # el "10" del nombre del pilar ("Las 10 personas que..."), el ano del gancho
        # y frases del cuerpo como "600 kilometros para una reunion de 40 minutos",
        # que no descentran nada ni canibalizan el mapa. Un check que falla a los
        # tres, al bueno y a los malos, no separa nada y por tanto no mide nada.
        # Ahora pide CIFRA + MARCADOR REGIONAL (dinero, %, PIB, exportacion, censo
        # de empresas, empleo, toneladas) o la comparacion-pais del mapa, y no mira
        # el gancho, que es donde vive el "10" del pilar.
        _REGIONAL = (r'(\d[\d.,]*\s*(%|por ciento|millones?|millardos|mil millones|euros?|€'
                     r'|empresas|habitantes|empleos|puestos de trabajo|toneladas|km2|km²)'
                     r'|(pib|factura|facturaci[oó]n|exporta|exportaci[oó]n)\D{0,25}\d'
                     r'|m[aá]s que \w+ enter[oa])')
        # "LAS 10" (Iker, 2026-10-01) lleva el gancho del MAPA, con su "mas que
        # [PAIS] entero", asi que el cuerpo puede respaldar esa comparacion con su
        # fuente, igual que el mapa. La regla era de "Los 10" de personas.
        _fuera = [] if LAS10 else [l for l in cuerpo.splitlines()[1:]
                  if l.strip() and not re.match(r'^\s*→\s', l)
                  and re.search(_REGIONAL, l, re.I)
                  and 'recursos.neety.com' not in l]
        chk(not _fuera, 'Sin cifras regionales fuera de las fichas (§4.3 Paso 3b)',
            f'{len(_fuera)}: "{_fuera[0][:52]}"' if _fuera else '')
        # §4.3 Paso 3e — el beat de equipo va en el SETUP, antes de la lista.
        # Despues solo corrige la objecion; antes, la evita.
        _mb = None if LAS10 else re.search(BEAT_EQUIPO, cuerpo, re.I)
        if _mb and _flechas:
            _pos_beat = cuerpo.index(_mb.group(0))
            _pos_lista = cuerpo.index(_flechas[0])
            chk(_pos_beat < _pos_lista, 'El beat de equipo va ANTES de la lista (§4.3 Paso 3e)',
                'despues de la lista solo corrige la objecion; antes la evita' if _pos_beat > _pos_lista else '')

    if pilar == 'leadmagnet':
        # ⚠️ RECORDATORIO DE ENTREGA (Iker, 2026-08-06). La receta dice desde
        # hace semanas que este pilar entrega TRES piezas y yo entregue dos: me
        # deje la imagen, y encima con un dato claro sobre cual va (§4.5.-1: se
        # ensena el ARTEFACTO, no la cara, como el 12.3x de Guillermo Flor).
        # El validador solo puede mirar el texto, asi que esto no es un check:
        # es un recordatorio que se imprime siempre para que no se me pase.
        chk(False, 'ENTREGA: ¿las CUATRO piezas? texto + imagen del POST + imagen OG + prompt',
            'son CUATRO, no tres (Iker, 2026-08-06): (1) el texto · (2) la imagen del post '
            'de LinkedIn, 1:1 · (3) la imagen de COMPARTIR del recurso web, 1200x630, que la '
            'mete el programador y sin ella el enlace llega como caja gris (images §0b-OG) · '
            '(4) el prompt del programador. Y CADA brief de imagen va CON EL ENLACE a la '
            'referencia real que calca (images §0b-REF): sin enlace me la estoy inventando. '
            'Los 4 formatos validados y sus enlaces, en images §0b-REF-bis', aviso=True)
        # 2026-08-12: el "Comenta X" volvio, pero DENTRO DE LA IMAGEN (post-workflow
        # §4.5.0-CTA-IMAGEN). LinkedIn clasifica el texto y no lee la foto: Martin
        # Arosa lleva el banner 'Comenta "SISTEMA" y te lo envio por mensaje privado'
        # dentro de la imagen (1.321c el 11/08) y el texto limpio. Este script no ve
        # imagenes, asi que lo unico que puede hacer es recordarlo en cada entrega.
        # EL LITERAL DEL BANNER SE ENTREGA HECHO, NO SE DESCRIBE (Iker, 2026-08-18).
        # Antes este aviso decia "y te lo envio por mensaje privado", que era el
        # calco literal de Martin Arosa, y por leerlo aqui se colo en el prompt
        # del disenador: dos lineas en vez de una y un "por mensaje privado" que
        # brand-voice §2c prohibe (familia 5, sacar gente a privado). Un aviso que
        # describe la regla se incumple; uno que te da la linea hecha, no.
        _fem = ('guia', 'guía', 'plantilla', 'checklist', 'hoja', 'ficha', 'lista')
        _bajo = cuerpo.lower()
        _pron = 'la' if any(w in _bajo for w in _fem) else 'lo'
        _nombre = next((w for w in _fem if w in _bajo), 'el recurso')
        chk(False, 'ENTREGA: el Comenta "PALABRA" va DENTRO de la IMAGEN (§4.5.0-CTA-IMAGEN)',
            'el texto va limpio (pregunta + gratis, y CERO peticiones de accion) y la palabra vive en '
            'un banner dentro de la foto, en UNA SOLA LINEA y sin "por mensaje privado". '
            f'El literal exacto para el prompt del disenador es: Comenta "PALABRA" y te {_pron} envio '
            f'-- el pronombre sale de que el cuerpo llama al recurso "{_nombre}", y tiene que '
            'concordar con el. La palabra va entrecomillada y en color. Comprueba que el prompt '
            'del disenador lo lleva, porque este script no puede ver la imagen. Evidencia: '
            'Martin Arosa 1.321c (11/08) y 289c (10/08), Daniel Matias 249c', aviso=True)
        m = re.search(ENTREGABLE_GENERICO, cuerpo, re.I)
        chk(not m, 'Entregable UNO y concreto, no generico (§4.5 Paso 2)',
            f'"{m.group(0)}" — la biblia hizo 1.2x · 2.3K' if m else '')
        m = re.search(CTA_IMPLICITA, cuerpo, re.I)
        chk(not m, 'CTA explicita, nunca implicita (§4.5 puerta 4)',
            f'"{m.group(0)}" hundio comentarios en dos A/B' if m else '')
        # §4.5.0 — el sujeto es el TRABAJO del lector, nunca el modelo. 40x.
        if re.search(r'(ÚLTIMA HORA|ULTIMA HORA|URGENTE|Acaba de pasar)', hook_txt, re.I):
            m = re.search(SUJETO_ES_MODELO, hook_txt, re.I)
            chk(not m, 'El sujeto es el TRABAJO del lector, no el modelo (§4.5.0)',
                f'"{m.group(0)}" — sujeto=trabajo 9.96x vs sujeto=modelo 0.70x. 40x' if m else '')
        # §4.5 Paso 5 — la palabra del CTA remata la gracia del hook.
        m2 = re.search(r'comenta\s+"([^"]+)"', cuerpo, re.I)
        if m2:
            _raiz = normalizar_entidad(m2.group(1))[:5]
            # En el GENÉRICO la palabra no tiene por qué estar en el hook: la de
            # Martín Arosa es "agente" (el tema del recurso) y su hook es "⚰️ D.E.P.
            # prospección manual" — no reconectan literal (§4.5.0b).
            if not generico:
                chk(bool(_raiz) and _raiz in normalizar_entidad(hook_txt),
                    'La palabra del CTA reconecta con el hook (§4.5 Paso 5)',
                    f'"{m2.group(1)}" no aparece en el hook' if _raiz not in normalizar_entidad(hook_txt) else '')

    if NOTICIA:
        # Medido el 23/10 sobre 53.887 posts de 164 creadores (post-workflow §4.9): la
        # noticia SIN regalo sube 1,23x sobre la base de su creador; con regalo es un
        # lead magnet y va por su receta.
        chk(not re.search(r'¿\s*l[oa]s?\s+quieres\s*\?|\bcomenta\b', texto, re.I),
            'NOTICIA: sin regalo ni gate, eso es un lead magnet (§4.9)',
            'el post ofrece un recurso: o se quita el regalo o va por --pilar leadmagnet')
        chk(bool(re.search(r'🚨|[uú]ltima hora|acaba(n)? de|esta semana|ayer|hoy', hook_txt, re.I)),
            'NOTICIA: el gancho dice que ACABA de pasar (§4.9)',
            'las noticias con marca de reciente suben 1,6x su base; sin ella, 1,07x', aviso=True)
        chk(False, 'ENTREGA: ¿hay PROTAGONISTA y la fuente va nombrada en el cuerpo? (§4.9)',
            'lo que mas multiplica es alguien o algo conocido HACIENDO algo (una persona de poder, '
            'una herramienta que el lector usa); un estudio sin protagonista se queda en ~1x. '
            'La fuente, con su nombre y sin año (global §3.5b)', aviso=True)
    if pilar == 'historia' and not NOTICIA:
        # Pilar HISTORIA PERSONAL / ANÉCDOTA (§4.6). Vara: Josh Braun (39x, 29x),
        # Daniel Disney (16 outliers). NO es autoridad ("mira qué importante soy"):
        # es una anécdota REAL en primera persona, frases cortas, mucho aire, y
        # remate con una LECCIÓN corta. En la BD se eligen por likes >> comentarios
        # (si comentarios > likes es un lead magnet disfrazado, no una historia).
        h = hook_txt.strip()
        # ⛔ LA LONGITUD DEL PILAR, MEDIDA SOBRE LAS 6 PUBLICADAS (§4.6-SERIE, 2026-08-27).
        # Los clics de una historia son una CONSTANTE (32-46) y no dependen de las
        # impresiones: da igual que haga 5.393 o 13.045. Lo unico que rompe la
        # constante es pasarse de largo. Las 5 que caen entre 694 y 762 caracteres
        # dan 32-46 clics; la unica que pasa de 800 (1.177 car, 29/07) da 19, la
        # MITAD. Por eso el techo es duro y el suelo es aviso: quedarse corto no
        # esta medido, pasarse si.
        # 🔴 Y SE MIDE CON EL ENLACE COMO LO VE EL LECTOR, NO COMO LO ESCRIBIMOS
        # (2026-08-27). El rango 694-762 sale de `char_count` de la BD, o sea del
        # texto YA PUBLICADO, donde LinkedIn ha reescrito la URL a `lnkd.in/xxxxxxxx`
        # (24 car el del 26/08, 25 el luma.com pelado del 21/08). Desde que el UTM
        # es obligatorio (§4.4b-UTM, 26/08) la URL que escribimos mide ~156 car, asi
        # que medir el fichero en crudo comparaba contra una vara de otra unidad y
        # tumbaba historias bien escritas: un borrador de 729 car de TEXTO salia como
        # 861 y fallaba. Se normaliza cada URL a 25 caracteres antes de contar.
        _n_hist = len(re.sub(r'https?://\S+', 'x' * 25, cuerpo))
        # 🔄 HISTORIA/EVENTO (Iker, 15/10): cuando al final hay que desvelar quien lo
        # conto y el evento ademas del ninja, ese tramo se come sitio a la historia, asi
        # que el tope sube a 900 con --historia-evento. Decision suya, sin medir: el
        # 07/10 de Unai (887 car, evento) saco 8 clics; se mide al publicar.
        # 🔄 GATE DE UN RECURSO (28/10): el ninja que lleva a un recurso pide una o
        # dos lineas de contexto encima (que es, de donde sale, por que le sirve al
        # que no nos conoce), y ese contexto manda sobre la longitud. Mismo tope que
        # historia/evento. Sin medir: se compara al publicar con las de 700-780.
        _gate_rec = bool(re.search(r'neety\.com/academia/', texto))
        _tope_h = 900 if (HISTORIA_EVENTO or _gate_rec) else 800
        if HISTORIA_EVENTO or _gate_rec:
            chk(_n_hist <= _tope_h, 'HISTORIA/EVENTO o con GATE de un recurso: <=900 caracteres (15/10 y 28/10)',
                f'{_n_hist} car' if _n_hist > _tope_h else f'{_n_hist} car')
        else:
          chk(_n_hist <= 800, 'HISTORIA: <=800 caracteres (§4.6-SERIE)',
              f'{_n_hist} car. La unica historia que paso de 800 hundio los clics a la mitad '
              f'(19 contra 32-46 de las cinco que estan entre 694 y 762). El rango de trabajo '
              f'del pilar es 700-780' if _n_hist > 800 else '')
        if _n_hist <= 800 and not HISTORIA_EVENTO:
            chk(700 <= _n_hist <= 780, 'HISTORIA: dentro del rango medido 700-780 car (§4.6-SERIE)',
                f'{_n_hist} car, fuera del rango donde estan las 5 que convierten (694-762). '
                f'No es fallo, pero mira si sobra cuerpo o falta escena' if not (700 <= _n_hist <= 780) else '',
                aviso=True)
        # ⛔ LA MARCA Y EL EVENTO SE DESVELAN EN EL ULTIMO TERCIO (Mario, 2026-10-02).
        # El 02/10 entregue la historia de Mario con "@Neety" en la 3ª linea (23% del
        # texto) porque en su cuenta la mencion era obligatoria y el check solo
        # miraba que ESTUVIERA, no DONDE. Medido en la BD ese dia: de las 13 historias
        # de la receta (desde el 29/07), 10 no nombran Neety ni el evento y las demas
        # lo hacen entre el 66% y el 85% (Neety 78% y 83%; evento 66-85%). Es el
        # "Si, hablo de X" del peloteo (global §2.0-PAGO) y brand-voice §4 (la marca,
        # casi como firma, cerca del final). Corte en el 60%: no tumba ninguna de las 13.
        _txt_marca = re.sub(r'https?://\S+', 'x' * 25, cuerpo)
        _cuerpo_marca = _txt_marca[len(hook_txt):] if _txt_marca.startswith(hook_txt) else _txt_marca
        _m_marca = re.search(r'\bNeety\b|\bevento\b', _cuerpo_marca, re.I)
        if _m_marca:
            _pos_marca = (len(_txt_marca) - len(_cuerpo_marca) + _m_marca.start()) / max(len(_txt_marca), 1)
            chk(_pos_marca >= 0.60, 'HISTORIA: la marca y el evento se desvelan en el ultimo tercio (global §2.0-PAGO)',
                f'"{_m_marca.group(0)}" aparece en el {round(100 * _pos_marca)}% del texto. En las 13 '
                f'historias de la receta, Neety y el evento salen entre el 66% y el 85% o no salen. '
                f'Pegado al gancho se lee como anuncio antes de que la escena enganche: se mueve al '
                f'pago, detras del ninja' if _pos_marca < 0.60 else
                f'primera vez en el {round(100 * _pos_marca)}% del texto')
        # ⛔ EL GANCHO DE UNA HISTORIA NO DELATA EL EVENTO (Iker, 2026-10-15). Una historia de
        # evento se vende como una escena de ventas en la que se reconozca cualquiera; el
        # evento se descubre en el pago. El 15/10 le di a Unai seis ganchos con 'nuestra mesa
        # redonda', 'un ponente' y 'los aplausos': se leen como anuncio desde la primera linea.
        # El molde bueno es el del 07/10 ('Nunca habia visto defender asi al comercial delante
        # de una sala llena'): nada en el gancho dice que el evento es nuestro.
        _m_ev_h = re.search(r'\b(neety|evento|forward|mesa redonda|ponentes?|aplaus\w*|presentamos'
                            r'|nuestra (?:charla|conferencia|jornada))\b', hook_txt, re.I)
        # 27/10 (DBA Conecta de Unai): en historia/evento tambien delata un evento AJENO
        # dicho a pelo ('Moderamos una charla sobre…' pasaba en verde). Solo con --historia-evento:
        # en una historia normal 'una charla con un cliente' es una escena, no un evento.
        if not _m_ev_h and HISTORIA_EVENTO:
            _m_ev_h = re.search(r'\b(charlas?|conferencias?|jornadas?|moder[oóaé]\w*|panel)\b',
                                hook_txt, re.I)
        chk(not _m_ev_h, 'HISTORIA: el gancho no delata el EVENTO ni la marca (Iker, 15/10)',
            f'"{_m_ev_h.group(0)}" en el gancho. Se cuenta la escena de ventas y el evento se '
            f'desvela en el pago (global §2.0-PAGO), como el 07/10 de Unai' if _m_ev_h else '')
        # EL VERBO PUNCHY VA AL FINAL DEL GANCHO, CON UN OBJETO (§4.6-SERIE punto 6,
        # patron cruzado de las 3 cuentas, 2026-10-02). Es criterio: aviso que
        # imprime la segunda mitad del gancho para MIRARLA.
        _pal_h = hook_txt.split()
        chk(False, 'ENTREGA: el golpe del gancho va en la SEGUNDA mitad, con un objeto (§4.6-SERIE 6)',
            'segunda mitad: "%s". Las 5 historias de mas alcance (20.470 a 10.406) abren con el '
            'contexto y sueltan el verbo punchy al final, pegado a algo que se ve ("me planto el '
            'portatil delante", "saltandome medio barrio", "me pillo con el tripode montado"). '
            'Abrir con el verbo fuerte rinde menos (6.884 y 2.394), y acabar en una REACCION '
            '("y yo aun flipo") en vez de en una escena queda flojo'
            % ' '.join(_pal_h[len(_pal_h) // 2:]), aviso=True)
        # ⛔ NO SE ABRE CON "MI PRIMERA..." (§4.6-SERIE, 2026-08-27). Los DOS peores
        # CTR del pilar abren asi (0,276% y 0,265%); los dos mejores abren por
        # NEGACION ("Nunca le vi") o por PROMESA ("jamas me imagine"). Una escena
        # cerrada no deja bucle abierto y una negacion si (global §2.0). n=6, asi
        # que va de AVISO y no de fallo duro: es el patron mas limpio del pilar,
        # no una ley.
        chk(not re.match(r'^\W*mi\s+primer[ao]\b', h, re.I),
            'HISTORIA: el hook no abre con "Mi primera..." (§4.6-SERIE)',
            'los dos peores CTR del pilar abren asi (0,276% y 0,265%). Abre por NEGACION '
            '("Nunca...", "Jamas...") o por PROMESA, que es lo que hacen los dos mejores '
            '(0,678% y 0,593%)' if re.match(r'^\W*mi\s+primer[ao]\b', h, re.I) else '',
            aviso=True)
        # ⛔ EN HISTORIA, EL GANCHO VA EN UNA SOLA ORACION (Iker, 2026-08-12).
        # global §2.10 permite una o dos en cualquier pilar; aqui se aprieta a UNA
        # y solo aqui, asi que vive en el runbook (§4.6) y no en global. El motivo
        # es del pilar: la historia entra por una ESCENA, y una escena partida en
        # dos frases se lee como resumen. El punto de en medio mete una pausa antes
        # de que el lector se haya metido dentro. Se condensa con "y", con coma o
        # con gerundio, pero el VERBO PUNCHY se queda: el fallo que lo motivo fue
        # entregar "Le pregunte a que empresas queria vender. Y en vez de
        # contestarme, me planto el portatil delante", que dice lo mismo que
        # "Le pregunte a que empresas queria vender y me planto el portatil delante"
        # con 24 caracteres mas y un frenazo en medio.
        _ho = [t for t in re.split(r'(?<=[.!?])\s+(?=[A-ZÁÉÍÓÚÑ¿¡])',
                                   re.sub(r'https?://\S+', '', h)) if len(t.strip()) > 3]
        chk(len(_ho) <= 1, 'HISTORIA: el hook va en UNA sola oracion (§4.6)',
            f'{len(_ho)} oraciones. Condensa con "y" o con coma, pero no pierdas el verbo '
            'punchy: la escena se abre de una tirada, no en dos frases' if len(_ho) > 1 else '')
        chk(not (h.startswith('🚨') or h.startswith('⚰')),
            'HISTORIA: el hook NO abre con alarma 🚨/⚰️ (§4.6)',
            'eso es lead magnet; una historia abre con una ESCENA personal, no gritando')
        # "he visto", "he conocido": la experiencia hasta hoy en 1a persona (brand-voice §3d,
        # 16/10) es personal igual que "nunca he visto". Faltaba y tumbaba el gancho de Asier (20/10).
        _personal = re.search(r'(^|\s)(yo|mi|mis|me|nunca|cuando|hace \w+|aquel\w*|la primera vez|acab[eé]|sub[ií]|di mi|ten[ií]a|hab[ií]a|recuerdo|empec[eé]|he \w+(?:ado|ido|to|cho|sto)|\bi\b|\bmy\b)(\s|,|\.)', ' '+h.lower())
        # 🧪 FOTO DE GRUPO (Iker, 2026-09-30): si la foto es del equipo entero, el
        # gancho puede ir en 1a PLURAL para que texto e imagen hablen con la misma
        # voz. Precedente, n=1: la historia de Unai del 23/09 (foto de los 11,
        # gancho sin "yo") hizo 9.739 imp, 43 clics y 18 comentarios, su mejor
        # conversacion del pilar. En contra, las historias en plural CON selfie
        # (6.554 · 6.271 · 3.628 · 2.926 · 1.321). Es prueba, no regla: se mide.
        # Primera persona por el VERBO (falso negativo cazado el 2026-10-08 con el
        # gancho de Unai "Defendi ante mas de 100 personas..."): la lista de arriba
        # mira pronombres y adverbios y no ve el preterito de 1a del singular al
        # arrancar (-e/-i con tilde, y los irregulares: dije, hice, puse...). Fuera
        # los adverbios que acaban igual.
        if not _personal:
            # 26/10: con pronombre delante ("Le pedí…", "Les dije…") tambien abre en 1a persona;
            # es el molde del 13/08 ("Le pregunté a qué empresas…") y antes solo pasaba si
            # el gancho llevaba un "me" mas adelante.
            _personal = re.match(r'(?:(?:le|les|lo|la|los|las|se|te|nos)\s+)?(?!(aqu[ií]|as[ií]|all[ií]|ah[ií]|ac[aá])\b)(\w+[éí]|dije|hice|puse|tuve|estuve|vine|quise|supe|traje)\b', h.lower().lstrip())
        # UNAI EN PLURAL (Iker, 2026-10-08): "Defendi" en primera del singular le
        # suena egocentrico; su gancho de evento o historia va en "Defendimos".
        # En su cuenta la 1a del plural tambien cuenta como gancho personal.
        # Y ASIER (Iker, 2026-10-15): su tono va como el de Unai, grandioso y con el
        # merito de la casa cuando es compartido (brand-voice §1b, ASIER TAMBIEN VA
        # GRANDIOSO). En el no es obligatorio el plural, pero tampoco cuenta como fallo.
        if (FOTO_GRUPO or (cuenta or '').strip().lower() in ('unai', 'asier')) and not _personal:
            _personal = (re.search(r'(^|\s)(nos|nosotros|nuestr\w+)(\s|,|\.)', ' '+h.lower())
                         # 15/10: el verbo en 1a del plural tambien vale si no abre el gancho
                         # ('Le preguntamos a quien vende IA...'): antes solo se miraba al arrancar.
                         # Y los cortos ("hemos", "dimos"), que el {2,} dejaba fuera (15/10, Asier).
                         # 21/10: y "vamos"/"somos", que el {2,} tambien dejaba fuera
                         # ('Vamos a cruzar medio mundo…', San Francisco de Unai).
                         or re.search(r'(^|\s)(hemos|dimos|vamos|somos|\w{2,}(amos|imos|emos))\b', h.lower()))
        chk(bool(_personal), 'HISTORIA: hook personal, en primera persona (§4.6)',
            'la vara abre "I [algo que me pasó]" / "Cuando…" / "Nunca…": una escena TUYA, no un claim ni un dato')
        _ls = [l for l in cuerpo.splitlines() if l.strip()]
        _media = sum(len(l) for l in _ls)/max(len(_ls), 1)
        chk(len(_ls) >= 8 and _media <= 78,
            'HISTORIA: ritmo de historia (frases cortas, mucho aire) (§4.6)',
            f'{len(_ls)} líneas, media {int(_media)} car — va en líneas cortas de una frase, no en párrafos densos')
        chk(bool(_ls) and len(_ls[-1]) <= 78,
            'HISTORIA: cierra con una LECCIÓN corta y punchy (§4.6)',
            (f'la última línea {len(_ls[-1])} car' if _ls else 'sin cuerpo') + ' — la moraleja es corta ("Moments do", "El método sirve para cualquiera")')
        # ⛔ LA ULTIMA LINEA NUNCA ES EL DESVELAMIENTO (Iker, 15/10): 'el final de la
        # publicacion es como el final de un video: una moraleja o algo punchy'. El evento
        # y la marca se desvelan en el ultimo tercio, pero ANTES del cierre, no en el.
        _ult = _ls[-1] if _ls else ''
        _m_ult = re.search(r'\b(neety|evento|forward)\b|@', _ult, re.I)
        chk(not _m_ult, 'HISTORIA: la ultima linea es la moraleja, no el desvelamiento (Iker, 15/10)',
            f'"{_ult[:70]}": el evento, la marca o la mencion van antes; el post cierra con '
            f'una leccion o un golpe' if _m_ult else '')
        # 🧵 HILO CONDUCTOR (Iker, 19/10, post-workflow §4.6-HILO): la escena y la venta
        # cuentan la MISMA idea de principio a fin. Si el cuerpo no toca ventas hasta el
        # ninja, el dolor del cliente queda pegado con celo al final (avispas v1: solo
        # 'cena' cosia el gancho con el ninja). Aviso: es criterio y un lexico no lo cierra.
        _iurl = next((i for i, l in enumerate(_ls) if 'http' in l), None)
        if _iurl is not None and _iurl >= 2:
            _venta = re.compile(r'\b(vend\w*|venta\w*|comercial\w*|cliente\w*|empresas?|'
                                r'llamad\w*|llamar|lista\w*|pedido\w*|comprador\w*|compra\w*)\b', re.I)
            # el cuerpo de verdad: sin gancho, sin la linea de contexto ni el bloque del ninja
            _medio = _ls[1:max(_iurl - 2, 1)]
            _puente = [l for l in _medio if _venta.search(l)]
            _st = lambda s: ''.join(dict(zip('áéíóúñ', 'aeioun')).get(c, c) for c in s.lower())
            _hilo = [w[:5] for w in re.findall(r'[a-záéíóúñ]{5,}', _st(_ls[0]))
                     if w not in ('ningun', 'ninguna', 'tanto', 'cuando', 'porque', 'nunca')]
            _cierre_ok = any(h in _st(_ls[-1]) for h in _hilo) or bool(_venta.search(_ls[-1]))
            chk(bool(_puente) and _cierre_ok,
                'ENTREGA: HISTORIA con HILO CONDUCTOR, la venta no vive solo en el ninja (§4.6-HILO)',
                ('puente en el cuerpo: "' + _puente[0][:60] + '"' if _puente else
                 '⛔ ninguna linea del cuerpo toca ventas antes del ninja: el dolor del cliente '
                 'entra de golpe al final') + ' · ' +
                ('el cierre recoge el hilo' if _cierre_ok else
                 '⛔ el cierre no recoge ni la palabra del gancho ni la venta') +
                '. La palabra-hilo del gancho tiene que pasar por la escena, el puente, el ninja y '
                'el cierre (30/09: la alarma que avisa de que alguien entra, no de quien)',
                aviso=True)
        # §4.6 punto 1c — el clasificador (backend/src/services/pillar.ts) separa
        # historia de meme contando PRETERITOS: hacen falta 4. La del 13/08 tenia
        # exactamente 4 y con 3 habria caido en 'meme'. Y esto choca de frente con
        # §4.6-NOSTALGIA, que empuja al IMPERFECTO porque es el tiempo de la
        # nostalgia en español: si escribes la etapa entera en imperfecto, el post
        # se clasifica mal y deja de compararse contra su propio pilar. La mezcla
        # correcta es imperfecto para la costumbre y preterito para los hechos.
        _pret = [w for w in re.findall(
            r'(?<![a-záéíóúñü])[a-záéíóúñü]{2,}(?:é|ó|aron|ieron|yeron)(?![a-záéíóúñü])',
            cuerpo.lower())
            if normalizar_entidad(w) not in ('que', 'porque', 'asi', 'aqui', 'ahi', 'alli',
                                        'cafe', 'jose', 'ole', 'ademas', 'quizas',
                                        'jamas', 'despues', 'tambien', 'segun', 'bebe')]
        chk(len(_pret) >= 4,
            'HISTORIA: 4+ preteritos, o la herramienta la clasifica como MEME (§4.6 1c)',
            f'solo {len(_pret)} ({", ".join(_pret) or "ninguno"}). El clasificador cuenta '
            'formas en -e/-o/-aron/-ieron acentuadas; un meme habla en PRESENTE y por eso '
            'nunca llega a 4. ⚠️ Suele pasar al buscar la NOSTALGIA (§4.6-NOSTALGIA), que '
            'pide imperfecto: usa imperfecto para la costumbre ("andaba en las mismas") y '
            'PRETERITO para los hechos ("la cerre", "la eche", "pago")'
            if len(_pret) < 4 else f'{len(_pret)}: {", ".join(_pret)}')

        # §4.6-RAMAS (Iker, 2026-08-26) — SIN VALIDAR. El pilar se abrio en dos
        # ramas por protagonista (propia / de otro) mas una variante regional que
        # cruza las dos. Si cada entrega no DECLARA cual usa, dentro de un mes
        # habra ocho historias y ninguna forma de saber que rama funciono. Por eso
        # es un aviso fijo: no comprueba nada, obliga a escribirlo.
        chk(False, 'ENTREGA: declara la RAMA y si es REGIONAL (§4.6-RAMAS)',
            'dos cosas, en una linea de la entrega y en la ficha del historial: '
            '(1) RAMA A = historia PROPIA (protagonista el dueno de la cuenta, 1a persona, '
            'el default) o RAMA B = historia DE OTRO (protagonista un tercero sin nombre y '
            'el dueno de testigo, §4.6-TESTIGO); (2) si lleva PELOTEO REGIONAL dentro '
            '(cliches y orgullo de una region, sin salir del pilar: sin lista de empresas, '
            'sin CSV y con menos de 6 menciones). ⚠️ Que sea real o inventada NO es la rama, '
            'es otro eje y lo gobierna §4.6-INVENTAR. Las dos ramas son n=1 a dia de hoy: '
            'se apuntan para poder medirlas, no porque esten validadas', aviso=True)

        chk(False, 'ENTREGA: ¿es una ETAPA compartida o solo tu anecdota? (§4.6-NOSTALGIA)',
            'El nivel que mas rinde no es "me paso esto y a ti tambien", es "aquella '
            'epoca la vivimos varios a la vez": el lector no se acuerda de si mismo, se '
            'acuerda de si mismo CON alguien, y por eso se lo manda. Nombra la etapa en '
            'la linea 2, antes que la escena, y mete al colectivo (la cuadrilla, la '
            'clase, los del barrio) SIN quitarle el protagonismo al YO', aviso=True)

        # §4.6-VEHICULO — EL DECORADO DE LA HISTORIA ROTA (Iker, 2026-08-26).
        # 4 de las 5 ultimas historias transcurren en la infancia o el instituto
        # (Iker 13/08 y 18/08, Unai 21/08, Asier 25/08) y la quinta iba camino de
        # lo mismo. La ley de variedad de global 2.0b listaba el concepto, el
        # verbo, el ninja, el opener, el cierre y el arranque de la anafora, y no
        # listaba lo mas visible de todo: DONDE pasa la historia. Aviso y no fallo
        # duro, porque algun dia la infancia volvera a tocar; lo que hace falta es
        # VERLO antes de entregar.
        _veh = sorted({w.lower() for w in re.findall(
            r'\b(instituto|colegio|cole|escuela|clase|recreo|profesor\w*|pupitre'
            r'|viaje de fin de curso|con \d{1,2} a[ñn]os|de cr[ií]o|de peque[ñn]o)\b',
            cuerpo, re.I)})
        if _veh:
            chk(False, 'ENTREGA: ¿el VEHICULO de la historia esta gastado? (§4.6-VEHICULO)',
                'el cuerpo vuelve al colegio: ' + ', '.join(f'"{w}"' for w in _veh) +
                '. Ya van CUATRO historias seguidas de infancia o instituto (13/08, 18/08, '
                '21/08 y 25/08) y las 3 cuentas comparten red, asi que el mismo lector las '
                've todas. Libres: el copiloto de un comercial veterano, la feria, el cliente '
                'que dice que no, el primer dia en un puesto, una comida con un proveedor, la '
                'llamada que sale mal, el taxi al aeropuerto', aviso=True)

        chk(not re.search(r'comenta\s+"', cuerpo, re.I),
            'HISTORIA: sin comment-gate — no pide comentar una palabra (§4.6)',
            'pedir "comenta X" la convierte en lead magnet; la historia cierra en la lección o lleva un CTA suave')

        # 2026-10-27 (post-workflow §4.6 1b-TER, global §2.5b-EXPLICITO, el limite): una
        # cita real de un cliente no cuenta que sale de una demo o una reunion de venta.
        # No le aporta nada al lector y se lee como que publicamos lo que nos dicen en
        # privado. Caso: "Se lo oyo mi socio en una demo" (Asier, 27/10).
        _txt_sin_url = re.sub(r'https?://\S+', ' ', texto)
        _demo = re.search(r'\bdemos?\b', _txt_sin_url, re.I)
        chk(not _demo, 'HISTORIA: no cuenta que la frase sale de una demo (§4.6 1b-TER)',
            '"%s": no le aporta nada al lector y nos expone (se lee como que contamos lo que nos '
            'dicen en una reunion de venta). Situa con QUIEN, no con donde: "Mi socio le pregunto..."'
            % _demo.group(0) if _demo else '')
        _con_cita = re.search(r'["“«][^"”»\n]{8,}["”»]', _txt_sin_url)
        _reu = re.search(r'\b(en|de|durante) (una|la) (reuni[oó]n|llamada|videollamada|visita comercial)\b',
                         _txt_sin_url, re.I)
        chk(not (_con_cita and _reu), 'HISTORIA: una cita real no dice que sale de una reunion de venta (§4.6 1b-TER)',
            '"%s" junto a una cita: si la frase es de un cliente o de una empresa que nos valoraba, '
            'el sitio sobra y nos expone. Si la escena es inventada y no hay cita real, ignora el aviso'
            % _reu.group(0) if (_con_cita and _reu) else '', aviso=True)

    # ---------- ROTACION DEL DOLOR DEL NINJA (global §4.4b-ROTACION) ----------
    _nj = ninja_de(texto)
    if _nj and not historico and pilar not in ('mapa', 'leadmagnet'):
        _mios = dolores_de(_nj)
        _rec = ninjas_recientes()
        if _rec is None:
            chk(False, 'ENTREGA: el DOLOR del ninja rota (§4.4b-ROTACION)',
                'no pude leer la BD. Este ninja vende: %s. Compara a mano con los ultimos '
                'ninjas de las 3 cuentas' % (', '.join(_mios) or 'sin clasificar'), aviso=True)
        else:
            _cta = (cuenta or '').strip().capitalize()
            _suyos = [r for r in _rec if r[0] == _cta][:3]
            _mismo = bool(_suyos) and bool(_mios) and all(set(dolores_de(r[2])) & set(_mios) for r in _suyos)
            _decide = [r for r in _rec[:12] if re.search(r'qui[eé]n decide', r[2], re.I)]
            _det = ('este ninja vende: %s. Ultimos de %s: %s' % (
                ', '.join(_mios) or 'sin clasificar', _cta or '?',
                ' | '.join('%s %s' % (r[1][5:], ', '.join(dolores_de(r[2])) or '?') for r in _suyos) or 'ninguno en 21 dias'))
            chk(not _mismo, 'ENTREGA: el DOLOR del ninja rota (§4.4b-ROTACION)',
                _det + ('. Los 3 ultimos de esta cuenta ya vendian lo mismo: prueba otro dolor del '
                        'menu (acierto, tu confirmas, buscar contra contactar) y apuntalo en el '
                        'historial para el A/B' if _mismo else ''), aviso=True)
            # A QUE TIPO DE CLIENTE LE HABLA (global §4.4b-TIPOS, 14/10): se imprime
            # siempre, con los de los ultimos ninjas de la cuenta y el tipo que menos
            # se ha probado en las 3 cuentas estas 3 semanas.
            _tmio = tipos_de(_nj)
            _cuenta_t = {}
            for _x in _rec:
                for t in tipos_de(_x[2]):
                    _cuenta_t[t] = _cuenta_t.get(t, 0) + 1
            _menos = min((nom for nom, _ in TIPOS_CLIENTE), key=lambda t: _cuenta_t.get(t, 0))
            chk(False, 'ENTREGA: a que TIPO de cliente le habla el ninja (§4.4b-TIPOS)',
                'este: %s. Ultimos de %s: %s. En las 3 cuentas (21 dias): %s. El menos '
                'probado: %s. Rota entre los 4 y apuntalo en el historial; con el webinar, '
                'solo los tipos que la pagina de Luma cumple' % (
                    ', '.join(t[:6] for t in _tmio) or 'ninguno claro', _cta or '?',
                    ' | '.join('%s %s' % (_x[1][5:], ', '.join(t[:6] for t in tipos_de(_x[2])) or '?') for _x in _suyos) or 'ninguno',
                    ', '.join('%s=%d' % (nom[:6], _cuenta_t.get(nom, 0)) for nom, _ in TIPOS_CLIENTE),
                    _menos[:6]), aviso=True)
            if re.search(r'qui[eé]n decide', _nj, re.I):
                chk(False, 'ENTREGA: "quien decide" ya esta muy visto (§4.4b-ROTACION)',
                    '%d de los ultimos 12 ninjas de las 3 cuentas lo dicen. Mismo dolor, otra '
                    'palabra: quien firma, quien compra dentro, quien tiene la ultima palabra, '
                    'nombre y cargo' % len(_decide), aviso=True)

    # ---------- ECO: PALABRAS CON IMAGEN YA VISTAS ESTAS DOS SEMANAS ----------
    # (Iker, 2026-09-23; el porque, encima de eco_reciente). No corre con
    # --historico: un post publicado se encontraria a si mismo y a sus vecinos.
    if not historico:
        _ecos, _err = eco_reciente(cuerpo)
        if _err:
            chk(False, 'ECO: palabras con imagen ya vistas en las 3 cuentas (14 dias)',
                _err + ' -> compara a mano el gancho, los objetos y el decorado contra '
                'lo publicado estas dos semanas en las TRES cuentas', aviso=True)
        else:
            chk(not _ecos, 'ECO: palabras con imagen ya vistas en las 3 cuentas (14 dias)',
                ' · '.join(f'"{w}" {q} {f}: «{l}»' for w, q, f, l in _ecos[:10]) +
                ('' if not _ecos else ' -> NO es una prohibicion ni una lista: el mismo lector '
                 'acaba de leer esa palabra en una de las tres cuentas. Si es decorado, se '
                 'OFRECE un sinonimo igual de punchy y de una sola lectura; si es el nucleo '
                 'de la escena, se queda y se dice en la entrega. Y SE QUEDA TAMBIEN si el eco '
                 'tiene otro sentido, si va en una cita o en el remate, o si el sinonimo es '
                 'peor: la variedad nunca justifica una frase peor. Pasados 14 dias vuelve a '
                 'estar libre sola (global 2.0b-ECO)'), aviso=True)

    # ---------- CONTRA EL HISTORIAL ----------
    h = leer_historial()
    if h:
        if pilar == 'leadmagnet':
            m2 = re.search(r'comenta\s+"([^"]+)"', cuerpo, re.I)
            if m2:
                pal = m2.group(1).lower()
                usada = re.search(r'"%s"' % re.escape(pal), h, re.I)
                chk(not usada, 'La palabra del CTA no se ha usado antes',
                    f'"{pal}" ya aparece en el historial' if usada else f'"{pal}" limpia')
        if pilar in ('mapa', 'los10') and cuenta:
            fila = re.search(r'\|\s*\*\*%s\*\*\s*\|([^|]*)\|([^|]*)\|' % cuenta, h)
            if fila:
                usadas = (fila.group(1) if pilar == 'mapa' else fila.group(2)).strip()
                chk(True, f'Regiones ya usadas por {cuenta} ({pilar})', f'NO repetir: {usadas}')

    # ------------------------------------------------------------------
    # MEME + UNAI: bloqueo duro (Iker, 2026-07-29)
    # Unai es el FUNDADOR y CEO: firma la casa. Un meme controversial en su
    # cuenta ya nos costó que un directivo nos insultara CON SU NOMBRE REAL
    # creyéndose que el tatuaje era de verdad. La doctrina ya lo decía
    # (post-workflow §4.4, brand-voice §1b) y aun así se publicó, así que
    # deja de ser doctrina y pasa a ser un check que hay que desactivar a mano.
    # ------------------------------------------------------------------
    # MEME: creditos al autor de la referencia (Iker, 2026-07-29)
    # El meme del tatuaje se viralizo Y el autor original lo vio: bloqueo la
    # cuenta de Unai. Bloquear es el aviso barato; el caro es un reporte por
    # copia. Mismo blindaje que se le puso al dato regional de los mapas
    # despues del "Andalucia es mas grande que Italia".
    # El credito se comprueba en el meme siempre, y en cualquier otro pilar
    # si se declara que es un remix (--remix). Remixar es universal.
    if pilar == 'meme' or remix:
        cred = re.search(
            r'(se lo (?:vi|rob[eé])|idea (?:original )?de|el original es de|visto en|gracias a|'
            r'v[ií] esto en|me lo (?:encontr[eé]|top[eé]) en|cr[eé]dito)\s*@?',
            cuerpo, re.I)
        lineas_ne = [l for l in cuerpo.splitlines() if l.strip()]
        pos = None
        if cred:
            linea_cred = cuerpo[:cred.start()].count('\n')
            todas = cuerpo.splitlines()
            texto_cred = todas[linea_cred] if linea_cred < len(todas) else ''
            pos = next((i for i, l in enumerate(lineas_ne) if l == texto_cred), None)
        chk(bool(cred) or ref_fuera,
            'MEME: da CRÉDITO al autor de la referencia (§4.4-CREDITO)',
            'si la referencia es ESPAÑOLA y de VENTAS, el autor te va a ver. Mencionalo con @ '
            'en una linea suelta del cuerpo. Si la referencia es de fuera o de otro sector, '
            'pasa --referencia-fuera.' if not cred else 'linea de credito presente')
        if cred and pos is not None and lineas_ne:
            ok_pos = 2 <= pos <= len(lineas_ne) - 2
            chk(ok_pos,
                'MEME: el crédito NO va ni al principio ni de cierre (§4.4-CREDITO)',
                f'esta en la linea {pos + 1} de {len(lineas_ne)}. No puede ir en el gancho ni justo '
                'despues (mata el chiste antes de contarlo) ni en la ultima linea (se come el '
                'bold statement). Va en medio, despues de que el chiste haya aterrizado.')

    if pilar == 'meme':
        # 🧑‍💼 EL SUJETO DEL CHISTE ES UNA PERSONA DE VENTAS, NO UNA HERRAMIENTA
        # (Iker, 2026-10-14, post-workflow §4.4-SUJETO). Medido ese dia sobre los
        # 30 memes de las 3 cuentas desde julio: los que van de una herramienta,
        # una app, una pantalla o la IA (14 herramientas, traductor del parte,
        # codigo de verificacion x2, historial de Google, la ficha, el movil, la
        # IA y el puesto) tienen mediana ~3.000 impresiones; los que van de la vida
        # del comercial, del cliente o del jefe (ascenso, caos, propuesta en visto,
        # llamada 79, correo comercial, el pedido que encoge) ~37.500. Excepciones
        # que funcionaron: contadas desde quien PAGA (4.797 EUR, 27.967) o desde
        # la vida del comercial (la IA y el equipo, 23.170). Aviso, no fallo.
        _tec = re.findall(r'\b(ia|inteligencia artificial|chatgpt|claude|agente|app|aplicaci[oó]n|'
                          r'herramientas?|software|google|linkedin|m[oó]vil|crm|ficha|c[oó]digo|excel|'
                          r'ordenador|pantalla|algoritmo|traductor|diccionario)\b', hook_txt, re.I)
        if _tec:
            chk(False, 'ENTREGA: ¿el chiste va de una HERRAMIENTA y no de una persona de ventas? (§4.4-SUJETO)',
                'el gancho nombra: %s. Memes nuestros de herramienta, app, pantalla o IA: '
                'mediana ~3.000 impresiones; de la vida del comercial, del cliente o del jefe: '
                '~37.500 (30 memes desde julio). Solo pasa si se cuenta desde quien paga la '
                'factura o desde lo que le pasa al comercial; si el chiste solo lo pilla quien '
                'sabe de software, otra referencia' % ', '.join(sorted(set(w.lower() for w in _tec))),
                aviso=True)
        # ⛔ LA LONGITUD DEL ORIGINAL NO SE CALCA (Iker, 2026-08-13). "Me da igual
        # como sea la referencia a nivel de longitud: aunque sea larguisima, el
        # cuerpo lo quiero corto." Sustituye al "longitud: la del original" de
        # §4.4 Paso 3, y SOLO en cuanto a longitud: la idea, el gancho, el
        # esqueleto y el tiempo verbal se siguen calcando a muerte.
        #
        # MEDIDO sobre los 59 memes de las 3 cuentas con >500 impresiones:
        #   <=450 car  n=18  mediana 11.602 impresiones
        #   451-700    n=22  mediana  3.760
        #   >700       n=19  mediana  4.745
        # Los siete memes mas vistos del historico (168.926 / 138.828 / 93.744 /
        # 89.320 / 86.815 / 60.443 / 44.997) estan TODOS por debajo de 450.
        #
        # Por que aviso a 450 y fallo duro a 700, y no fallo duro a 450: hay tres
        # largos que si volaron (817, 886 y 1.085 car). Bloquearlos seria silenciar
        # a un ganador, que es justo lo que §3.2 dice que no se hace. Pasando de
        # 700 ya no es solo alcance: ahi el ninja no cabe antes del caracter 650 y
        # el CTR se hunde (§4.4b-CLICS), asi que ese si es fallo.
        #
        # ⭐ Y SI LLEVA EL BLOQUE DE CORREO, LOS 450 SE MIDEN SIN EL (Iker,
        # 2026-08-19). El presupuesto de 450 es del CHISTE; la puerta nueva no se lo
        # come. El tope duro de 700 sigue siendo sobre el total, porque lo que mide
        # es si el ninja de agendar cabe antes del caracter 650.
        #
        # ⭐⭐ Y SE MIDE SOBRE EL TEXTO PUBLICADO, NO SOBRE EL BORRADOR (2026-08-26).
        # LinkedIn reescribe cualquier enlace a `lnkd.in/xxxxxxx` al publicar, cosa
        # que §4.4b-UTM ya da por sabida cuando dice que la cola de UTM "no roba ni
        # un caracter" de la linea del ninja. Desde que los enlaces llevan UTM
        # (regla del mismo dia), una URL de agendar ocupa ~120 caracteres en el
        # borrador y 24 en el feed: contar el borrador se comia 100 caracteres del
        # presupuesto del CHISTE y marcaba en rojo memes que el lector ve cortos.
        # Los 450 y los 700 salen de posts YA PUBLICADOS, o sea que la vara estaba
        # medida con lnkd.in y aqui se comparaba contra otra cosa.
        _pub = re.sub(r'https?://\S+', 'https://lnkd.in/eXXXXXXX', cuerpo)
        _blc = next((b for b in bloques(_pub)
                     if 'lnkd.in' in ' '.join(b) and (
                         'correo' in ' '.join(b).lower()
                         or 'newsletter' in ' '.join(b).lower())), None)
        if _blc is None:
            _blc = next((b for b in bloques(cuerpo)
                         if 'recursos.neety.com/correo' in ' '.join(b)
                         or 'recursos.neety.com/newsletter' in ' '.join(b)), None)
            if _blc is not None:
                _blc = re.sub(r'https?://\S+', 'https://lnkd.in/eXXXXXXX',
                              '\n'.join(_blc)).split('\n')
        cuerpo_pub = _pub
        _n = len(cuerpo_pub) - (len('\n'.join(_blc)) + 2 if _blc else 0)
        chk(len(cuerpo_pub) <= 700, 'MEME: cuerpo corto, la longitud del original NO se calca (§4.4-CORTO)',
            ('%d caracteres. Pasando de 700 el spam ninja ya no cabe antes del 650 y el CTR '
             'se hunde. Mediana de impresiones por tramo: <=450 -> 11.602 · 451-700 -> 3.760 · '
             '>700 -> 4.745' % len(cuerpo_pub)) if len(cuerpo_pub) > 700 else
            ('%d caracteres publicados' % len(cuerpo_pub)) if not _blc else
            '%d car sin el bloque de correo · %d publicados en total' % (_n, len(cuerpo_pub)))
        if len(cuerpo_pub) <= 700:
            chk(_n <= 450, 'MEME: en la zona corta, <=450 caracteres (§4.4-CORTO)',
                ('%d caracteres%s. No bloquea, pero los 18 memes de <=450 tienen mediana de '
                 '11.602 impresiones contra 3.760 de los de 451-700, y los siete mas vistos '
                 'de la casa estan todos por debajo de 450'
                 % (_n, ' sin el bloque de correo' if _blc else '')) if _n > 450 else '',
                aviso=True)

    # post-workflow §4.4-REPETIR - REPETIR EN OTRA CUENTA UNA REFERENCIA YA USADA
    # (Iker, 2026-08-24). En la MISMA cuenta no se repite nunca; en otra si, pero
    # con tres puertas. Los dos casos medidos: la escalera de calvicie a 98 dias
    # (138.828 -> 89.320, funciono) y el tatuaje a 2 dias (93.744 -> 5.427, un
    # 5,8%). El script no ve la referencia, asi que esto es un aviso de entrega:
    # lo que puede hacer es que la pregunta salte SIEMPRE, que es donde se falla.
    if pilar in ('meme', 'lead_magnet', 'leadmagnet', 'historia') or remix:
        chk(False, 'ENTREGA: si la referencia ya la uso otra cuenta',
            'En la MISMA cuenta no se repite nunca. En otra si, pero pasando las TRES '
            'puertas: (1) ESPACIADO minimo 1 mes desde que se publico la primera, y el '
            'unico caso medido que funciono llevaba 98 dias; (2) la primera vez VOLO, '
            'con la vara en >=3x o >=50.000 impresiones, porque la mediana del meme es '
            '6.905 y "no fue mal" no vale; (3) se repite CON el filo, que si hay que '
            'suavizarla para que quepa en la cuenta nueva no se repite. Medido: la '
            'escalera de calvicie a 98 dias hizo 138.828 y luego 89.320; el tatuaje a 2 '
            'dias hizo 93.744 y luego 5.427, un 5,8%. Si falla una puerta, se busca otra '
            'referencia (§4.4-REPETIR). Y SI LA REFERENCIA ES UN MEME NUESTRO, el texto de '
            'DENTRO de la imagen se reescribe entero: misma broma, mismo orden y mismas '
            'repeticiones, pero con otras palabras y sin alargar ninguna (§4.4-DOBLE-PROPIO)', aviso=True)

    # aboutme §2-CARRIL - CADA CUENTA ES VENTAS + SU OFICIO (Iker, 2026-08-19).
    # Las cinco cuentas anclan a ventas siempre; lo que cambia es el segundo
    # carril, que es de donde sale la REFERENCIA. El 19/08 le lleve al tercer
    # jefe (tecnico) un meme de transcripcion de llamada a puerta fria e Iker lo
    # movio al segundo, que es el comercial que llama de verdad. La referencia
    # era buena y la cuenta estaba mal elegida, y eso se decide ANTES de escribir.
    # Es criterio, asi que va de aviso: el script no sabe de que mundo sale un
    # chiste, pero si puede poner el carril delante para que no se olvide.
    # Iker, 2026-08-24: la REFERENCIA es SIEMPRE de ventas en los tres jefes, y el
    # carril solo decide QUE RINCON de las ventas. Mario y Helena son la excepcion.
    # Lo que lo motiva: el meme de la busqueda de Google de Asier (20/08) hizo 3.010
    # imp / 0.32x y su referencia era un meme, pero NO de ventas.
    _CARRIL = {
        'unai': 'ventas DESDE EL QUE MANDA (jefe de ventas, director comercial, el CEO que pide numeros, el forecast, la reunion de pipeline). Sobrio, cero infantil',
        'iker': 'ventas DE CALLE (llamar, puerta fria, el cliente que no coge, el viaje a ver al cliente). La unica que aguanta el registro bruto',
        'asier': 'ventas UNIVERSAL mirado desde fuera (el pedido, el cliente que compra a otro, la cuota, el ascenso: lo que entiende un director comercial de 55 sin saber de software). Desde el 08/10 ya NO lo tecnico: sus 5 memes tecnicos dan 718 imp de mediana y sus 4 universales ~39.400 (aboutme §2-ASIER-MEME). Y el gancho NUNCA en 1a persona de comercial: 3a impersonal, vocativo a los comerciales o su papel real (programa para ellos)',
        'mario': 'EXCEPCION: aqui la referencia SI puede ser de MARKETING Y CONTENIDO',
        'helena': 'EXCEPCION: aqui la referencia SI puede ser de ATENCION AL CLIENTE Y PARTNERSHIPS',
        'angela': 'EXCEPCION (por analogia, pendiente de OK): aqui la referencia SI puede ser de DISENO DE PRODUCTO (pantallas, experiencia de usuario)',
    }
    _c = (cuenta or '').strip().lower()
    if _c in _CARRIL:
        _exc = _c in ('mario', 'helena', 'angela')
        chk(False, 'ENTREGA: la REFERENCIA es de VENTAS, y de que rincon',
            ('%s = %s. %s ⛔ SE COMPRUEBA EN LA REFERENCIA, nunca en el headline ni en los hashtags '
             'del autor. PRIORIDAD: la PRIMERA LINEA del original lleva una palabra explicita del '
             'oficio (sales, sell, prospect, cold call, SDR, AE, deal, quota, pipeline, client, '
             'buyer, ventas, comercial, cliente, cuota); entre dos parecidas gana la que la lleva. '
             'EXCEPCION (Iker 07/10, el leon de Dachi), solo si se cumplen LAS DOS: el chiste de la '
             'IMAGEN es de ventas Y todo el cuerpo o su gran mayoria va de ventas. Una palabra '
             'suelta en el cuerpo NO vale. Test: quita el gancho, ¿la broma solo se entiende desde '
             'ventas? Si no, se descarta. La excepcion se declara en la entrega. Y NUESTRO gancho '
             'ancla a ventas SIEMPRE. '
             '⛔ Y NUESTRO GANCHO TIENE QUE RECORDAR AL SUYO: pon los dos uno al lado del otro y '
             'mira si se nota el parentesco; si no, no es un remix, es otro post. Y si la '
             'referencia no es del rincon de esta cuenta, se le da a la cuenta que si lo tiene y '
             'para esta se busca otra: cambiar de cuenta es gratis, forzar el encaje no '
             '(aboutme §2-CARRIL)')
            % (_c, _CARRIL[_c],
               '' if _exc else 'En los TRES JEFES la referencia nace SIEMPRE dentro de ventas, en cualquier idioma; lo que cambia con la cuenta es de que parte de ventas.'),
            aviso=True)

    # 2026-10-02 (Iker): Asier pasa a ser cuenta restringida como Unai. "Es como lo
    # que te explique para el primer jefe de restrictivo, el tercero es parecido".
    # Asier ya habia borrado dos posts suyos por gusto propio (la katana del 26/08 y
    # el "soñe con ella"), asi que el bloqueo es el mismo: solo Iker aguanta lo bruto.
    if pilar == 'meme' and (cuenta or '').strip().lower() in ('unai', 'asier'):
        chk(meme_sobrio,
            'MEME en %s: confirmado que NO es controversial (§4.4-STOP)' % (cuenta or '').strip().capitalize(),
            'Unai (CEO) y Asier son las dos cuentas restringidas desde el 02/10. Un meme '
            'controversial ahi NO se publica: va a IKER, y si Iker no puede, no se publica '
            '(se cambia el chiste, nunca se suaviza). Si de verdad es sobrio, pasa '
            '--meme-sobrio y quedara constancia de que lo decidiste. Pregunta 6 (01/10): '
            '¿algun detalle, tambien de la IMAGEN, deja como vago o incompetente a un '
            'director comercial, gerente o CEO? Unai borro el meme de los suenos por la '
            'placa EN REUNION del director dormido: es quien nos compra.')

    if AVISOS_OTRA_CUENTA and not historico:
        chk(True, 'QUEMADAS: otra cuenta lo acaba de usar, no bloquea (2.0b-VENTANA)',
            'libre para esta cuenta, pero el lector de los tres perfiles es el mismo: '
            + ' · '.join(sorted(set(AVISOS_OTRA_CUENTA))), aviso=True)
    AVISOS_OTRA_CUENTA.clear()
    return r

def _autochequeo():
    """El validador se valida a si mismo antes de validar nada.

    2026-08-06: 12 regex del fichero tenian un 0x08 (BACKSPACE) donde debia ir
    un \\b. Un regex que empieza por 0x08 exige un byte que no aparece nunca en
    un post, asi que NO CASA JAMAS y el check sale OK sin comprobar nada. Habia
    checks muertos desde hacia semanas: AI_TELLS, "Neety NUNCA en el hook",
    ENTREGABLE_GENERICO, el de menciones y el de la agenda del evento.

    CAUSA: parchear este fichero escribiendo Python por heredoc de shell. El
    '\\\\b' del parche llega a Python como '\\b' y Python lo escribe como el
    caracter de control. Por eso los parches van con la herramienta de edicion,
    nunca por heredoc. Un fallo silencioso en el validador es peor que no tener
    validador: da un 45/45 falso y encima te deja tranquilo.
    """
    import inspect
    src = inspect.getsource(inspect.getmodule(_autochequeo))
    malos = sorted({hex(ord(c)) for c in src if ord(c) < 9 or ord(c) == 11 or ord(c) == 12})
    if malos:
        print(f'\n  ⛔ VALIDADOR CORRUPTO: caracteres de control {malos} en el propio script.')
        print('     Son \\b de regex que se convirtieron en bytes literales.')
        print('     Los checks que los usan NO CASAN NUNCA y salen OK en falso.')
        print('     Arregla el script antes de fiarte de ningun resultado.\n')
        sys.exit(2)


def main():
    # La consola de Windows por defecto es cp1252 y el validador imprime cajas
    # (└─), flechas y ≤. Sin esto, CUALQUIER check con detalle tumbaba el script
    # con UnicodeEncodeError en vez de dar el marcador — y el marcador es lo
    # unico que se pega en la entrega. Preexistente, detectado el 2026-08-20.
    for _f in (sys.stdout, sys.stderr):
        try:
            _f.reconfigure(encoding="utf-8", errors="replace")
        except Exception:
            pass
    _autochequeo()
    ap = argparse.ArgumentParser()
    ap.add_argument('fichero')
    ap.add_argument('--pilar', required=True,
                    choices=['mapa', 'los10', 'las10', 'objeto', 'meme', 'leadmagnet', 'historia', 'noticia', 'entregable', 'evento', 'tarjeta'])
    ap.add_argument('--cuenta', default=None)
    ap.add_argument('--tarjeta', default=None, dest='tarjeta',
                    help='Fichero con el texto que va DENTRO de la tarjeta (pilar tarjeta). '
                         'Sin el no se puede comprobar la anatomia de 3 parrafos, que ES el '
                         'pilar, asi que su ausencia cuenta como fallo.')
    ap.add_argument('--meme-sobrio', action='store_true', dest='meme_sobrio',
                    help='Confirma que un meme para la cuenta de UNAI o de ASIER (restringida '
                         'desde el 2026-10-02) no es controversial. '
                         'Es controversial si CUALQUIERA de estas es que si: el chiste depende de '
                         'que alguien se crea que paso de verdad; hay un acto ridiculo o humillante '
                         'atribuido al que publica; alguien podria insultarnos por creerselo; hay '
                         'tacos, escatologia, sexo, politica o religion; se rie de un colectivo; o algun '
                         'detalle, TAMBIEN DE LA IMAGEN (placa, taza, rotulo), deja como vago o '
                         'incompetente a un cargo que decide la compra (Unai borro el meme del 01/10 '
                         'por la placa EN REUNION del director dormido).')
    ap.add_argument('--comprador-ok', action='store_true', dest='comprador_ok',
                    help='MEME, EN TODAS LAS CUENTAS (Iker, 2026-10-02): confirma que ni el '
                         'texto ni la IMAGEN (placa, taza, rotulo, etiqueta, remate de una '
                         'evolucion por cargos) dejan como vago, incompetente o ridiculo a un '
                         'cargo que compra: director comercial, gerente, CEO, fundador, director '
                         'de exportacion, de desarrollo de negocio o de marketing. Se puede jugar '
                         'con su presion o con lo que sueña; nunca con que no trabaja, se escaquea '
                         'o no sabe. Vale tambien en Iker: su cuenta aguanta lo absurdo, no '
                         'burlarse del que nos compra. Solo se pasa DESPUES de repasar la imagen.')
    ap.add_argument('--ref-con-texto', action='store_true', dest='ref_con_texto',
                    help='MEME: confirma que la IMAGEN de la referencia lleva TEXTO DENTRO que '
                         'forma parte del chiste (etiquetas de una evolucion, dialogo, rotulos, '
                         'captura de correo, chat o tuit). Una foto o fotograma de una persona '
                         'sin texto NO vale de referencia en ninguna cuenta (Iker, 2026-10-01; '
                         'medido: 20 de 20 memes nuestros de 2026 con 18.000+ impresiones llevan '
                         'texto en la imagen). Solo se pasa DESPUES de mirar la imagen.')
    ap.add_argument('--referencia-fuera', action='store_true', dest='ref_fuera',
                    help='La referencia del meme NO es española ni del sector de ventas, asi que su '
                         'autor no comparte audiencia con nosotros y no hace falta acreditarlo en el '
                         'cuerpo. Si es española Y de ventas, NO pases este flag: acredita.')
    ap.add_argument('--solo-correo', action='store_true', dest='solo_correo',
                    help='El post lleva SOLO el bloque de correo, sin el de agendar '
                         '(Iker, 2026-08-21). Se pasa cuando el TEMA del post no toca vender '
                         'mas: ahi el bloque de agendar no tiene dolor al que agarrarse y se '
                         'convierte en la frase de catalogo que global 4.4b prohibe. Es una '
                         'decision, no un olvido, y por eso hay que declararla.')
    ap.add_argument('--publica-manana', action='store_true', dest='publica_manana',
                    help='El post se sube MAÑANA y por eso el utm_campaign lleva la fecha de '
                         'mañana y no la de hoy (Iker, 2026-09-15). Solo se pasa cuando lo ha '
                         'dicho EL: "nunca hagas ese cambio sin preguntarme antes a menos que '
                         'yo te hubiese dicho que lo subiamos manana". El default es HOY; '
                         'adelantar la fecha por mi cuenta, deduciendo que la franja de las '
                         '10 rinde mas, es decidir por el.')
    ap.add_argument('--sin-menciones', action='store_true', dest='sin_menciones',
                    help='EXPERIMENTO de Iker (2026-08-11), solo para la cuenta de Mario: un '
                         'post suyo SIN mencionar a @Neety ni a los 3 jefes, escrito como si '
                         'fuera de una cuenta de founder pero con su tono. La hipotesis es que '
                         'las 4 menciones delatan el spam ninja y le quitan alcance. NO lo '
                         'pases por defecto: la regla sigue siendo mencionarlos (aboutme 2). '
                         'Al medirlo, anota el resultado en historial-publicaciones.')
    ap.add_argument('--remix', action='store_true',
                    help='Este post calca una referencia ajena aunque NO sea un meme (lead magnet, '
                         'mapa, historia...). Activa el check de credito al autor, que si no solo '
                         'corre en --pilar meme. Remixar es universal (global §2.2b).')
    ap.add_argument('--historico', action='store_true',
                    help='SOLO PARA test-validador.py. Apaga los checks de REINCIDENCIA (pais, '
                         'concepto, frase-rabia y verbo quemados, menciones ya usadas y frase del '
                         'ninja quemada) porque un post YA PUBLICADO es quien lleno esas listas: '
                         'compite contra si mismo y falla siempre, y eso no es un bug ni del '
                         'validador ni del post. NUNCA lo pases para validar un borrador: ahi la '
                         'reincidencia es exactamente lo que hay que cazar.')
    ap.add_argument('--los10-autorizado', action='store_true', dest='los10_autorizado',
                    help='"LOS 10" ESTA PROHIBIDO desde el 2026-09-16 (Iker): quejas de personas '
                         'mencionadas con su foto, una llamada de una directora de marketing y el '
                         '"Los 10" de Gipuzkoa borrado. Solo se pasa si IKER, en el chat de ESE '
                         'post, ha levantado la prohibicion por escrito. Nunca por deduccion.')
    ap.add_argument('--double-down', action='store_true', dest='double_down',
                    help='PELOTEO que repite A PROPOSITO cliches del gancho anterior de la region o un '
                         'pais ya usado por la cuenta (Iker, 2026-10-15: "double down es otra estrategia '
                         'muy inteligente, pero que tenga cabeza"). Solo si la entrega lo declara.')
    ap.add_argument('--ancla-direccion', action='store_true', dest='ancla_direccion',
                    help='EXCEPCION, solo cuenta de UNAI (Mario, 2026-10-22): el gancho ancla a '
                         'inversion o validacion de mercado (su segundo carril) en vez de a ventas, '
                         'y ventas baja al cuerpo. Solo si la entrega lo declara.')
    ap.add_argument('--evento-ajeno', action='store_true', dest='evento_ajeno',
                    help='Con --pilar evento: anuncio de un programa o evento que NO es nuestro y no '
                         'tiene inscripcion (Desafia San Francisco, 22/10). No exige Luma ni spam ninja. '
                         'Solo si la entrega lo declara.')
    ap.add_argument('--foto-grupo', action='store_true', dest='foto_grupo',
                    help='HISTORIA con FOTO DE GRUPO del equipo (Iker, 2026-09-30): acepta el '
                         'gancho en 1a PLURAL (nos, nuestro) como personal. Prueba con n=1 (Unai '
                         '23/09), no regla: se anota el resultado en historial-publicaciones.')
    ap.add_argument('--antes', help='RETOQUE (Iker, 2026-10-22): fichero con la version ANTERIOR, la que ya '
                    'pasaba. Si el retoque abre un FALLO o un AVISO que la anterior no tenia, sale FALLA: '
                    'se busca la forma de quedarse con el retoque y arreglar lo que rompe, y no se entrega '
                    'hasta que vuelva a estar limpio.')
    ap.add_argument('--criterio', help='fichero con las respuestas escritas al CRITERIO que el script no '
                    'puede medir (una linea por clave: "bucle: …"). Sin el, la entrega sale NO ENTREGABLE '
                    'aunque el marcador mecanico este en verde (Iker, 15/10)')
    ap.add_argument('--historia-evento', action='store_true', dest='historia_evento',
                    help='HISTORIA/EVENTO (Iker, 2026-10-15): historia que al final desvela quien lo '
                         'conto y el evento, ademas del ninja. El tope de longitud sube de 800 a 900 '
                         'para que la historia tenga sitio. Sin medir: se anota el resultado.')
    ap.add_argument('--agradecimiento', action='store_true', dest='agradecimiento',
                    help='AGRADECIMIENTO DE UNAI (Unai e Iker, 2026-10-20): historia/evento cuyo objetivo es '
                         'pelotear a quien organizo algo. Va SIN spam ninja: los mencionados verian que '
                         'les usamos de escaparate. Falla si el post lleva enlace y pide los dos criterios '
                         'del agradecimiento (problema concreto que resuelve el organizador y puente que '
                         'sale de la escena). brand-voice §1b.')
    ap.add_argument('--voz-ajena', action='store_true', dest='voz_ajena',
                    help='BORRADOR DE UN PERFIL QUE NO ES DE LOS 3 JEFES (Iker, 2026-10-05): un '
                         'empleado nuevo pasa SU texto para pulirlo. Se respeta su forma de escribir, '
                         'sus muletillas y sus frases, asi que los checks de FORMATO de la casa '
                         '(longitud, ritmo, bloques, cifras en letra, cierre en pregunta o leccion, '
                         'dos puntos) pasan a AVISO. Siguen duros el gancho, la puntuacion anti-IA '
                         '(guion largo, coma antes de "y"), la senal de ilegalidad, el spam ninja y el '
                         'UTM. Nunca en una cuenta de Iker, Unai, Asier o Mario.')
    ap.add_argument('--gancho-generico', action='store_true', dest='gancho_generico',
                    help='A/B DECLARADO, solo UNAI en historia/evento o evento (2026-10-30): el '
                         'gancho va sin ancla de ventas ni de ecosistema para medir si el bucle '
                         'maximo alcanza mas. El ancla del gancho pasa a aviso y el cuerpo tiene '
                         'que nombrar la venta. Solo si la entrega lo declara.')
    ap.add_argument('--generico', action='store_true',
                    help='Lead magnet modelo GENÉRICO (Martín Arosa/Guillermo): una palabra igual para '
                         'todos + recurso genérico + landing que captura. Salta el check del 2º dato.')
    a = ap.parse_args()
    global FOTO_GRUPO
    FOTO_GRUPO = a.foto_grupo
    global HISTORIA_EVENTO
    HISTORIA_EVENTO = a.historia_evento
    global DOUBLE_DOWN
    DOUBLE_DOWN = a.double_down
    global ANCLA_DIRECCION
    ANCLA_DIRECCION = a.ancla_direccion
    global EVENTO_AJENO
    EVENTO_AJENO = a.evento_ajeno
    global GANCHO_GENERICO
    GANCHO_GENERICO = a.gancho_generico
    texto = io.open(a.fichero, encoding='utf-8').read()
    card = io.open(a.tarjeta, encoding='utf-8').read() if a.tarjeta else None
    res = validar(texto, a.pilar, a.cuenta, a.generico, a.meme_sobrio, a.ref_fuera, a.remix, a.sin_menciones, card, a.solo_correo, a.historico, a.publica_manana)
    # ⛔ "LOS 10" PROHIBIDO (Iker, 2026-09-16). Va DELANTE de todo y es fallo duro:
    # el formato pone la cara de personas de otras empresas en una orla y ya ha
    # costado una queja de un mencionado, varias ediciones, una llamada de una
    # directora de marketing y el borrado del "Los 10" de Gipuzkoa (Unai, 15/09).
    # --historico lo deja pasar porque test-validador valida posts YA publicados.
    if a.pilar == 'los10' and not (a.los10_autorizado or a.historico):
        res.insert(0, (False, 'LOS 10 con CARAS: prohibido desde el 16/09. Usa --pilar las10',
                       'Desde el 01/10 el formato vuelve como "LAS 10": las 10 EMPRESAS de protagonistas y sus '
                       'LOGOS en la orla, nunca las caras (post-workflow §4.3). La version de personas solo con '
                       '--los10-autorizado, si Iker la levanta por escrito en ese chat.', False))
    # ⛔ LA REFERENCIA DE UN MEME LLEVA TEXTO DENTRO DE LA IMAGEN (Iker, 2026-10-01).
    # El 22/09 propuse para Unai la cara gritando de Alex Murphy: 49% de risa y ni
    # una palabra escrita. Iker: "nunca quiero que cojas una referencia que
    # simplemente sea una foto de una persona, sin ningun tipo de texto". Medido el
    # 01/10: los 20 memes de la casa de 2026 con 18.000+ impresiones llevan TODOS
    # texto dentro de la imagen. El script no ve la imagen, asi que se declara con
    # --ref-con-texto, igual que --meme-sobrio: es la pregunta que tiene que saltar
    # SIEMPRE al elegir referencia. --historico lo deja pasar (posts ya publicados).
    # AGRADECIMIENTO DE UNAI (Unai e Iker, 2026-10-20). El primer jefe tumbo el ninja al
    # webinar en su post del Gipuzkoako Inbertsio Foroa: "los que hemos mencionado van a ver
    # que les estamos peloteando". Un agradecimiento suyo es peloteo puro y no lleva enlace.
    # Iker lo considera un error de conversion y se acata; se mide al publicar.
    _url = re.search(r'https?://|luma\.com|neety\.com|lnkd\.in', texto)
    _gracias = re.search(r'\bgracias\b[^\n]{0,80}@', texto, re.I)
    if a.agradecimiento:
        res.append((not _url, 'AGRADECIMIENTO: sin spam ninja ni enlace (Unai, 20/10, brand-voice §1b)',
                    'quita el bloque del enlace: en un agradecimiento de Unai el objetivo es pelotear a los '
                    'mencionados, y un enlace comercial les convierte en escaparate' if _url else '', False))
        res.append((False, 'ENTREGA: el agradecimiento nombra el PROBLEMA CONCRETO que resuelve el organizador',
                    'no "hace crecer el territorio" sino lo que arregla (Inbertsio Foroa: acercar el capital a '
                    'los proyectos que lo necesitan), y llega por un PUENTE que sale de la escena, nunca pegado '
                    'detras de un enlace (brand-voice §1b, Unai 20/10)', True))
    elif (a.cuenta or '').lower() in ('unai', 'asier') and a.pilar == 'historia' and _gracias and _url:
        # Iker, 20/10: tambien Asier (mesa del Gipuzkoa AI Hackathon). En Iker NO: su
        # prioridad es que la visibilidad se convierta en algo, y ahi va el enlace.
        res.append((False, '¿es un AGRADECIMIENTO? En Unai y Asier va sin ninja (20/10)',
                    'el post da las gracias a alguien mencionado y lleva enlace. Si el objetivo es pelotear a '
                    'quien organizo algo (un evento que no es nuestro), va sin enlace: pasa --agradecimiento (brand-voice §1b)', True))
    # HISTORIA/EVENTO: QUIEN COMPARTIO LA ESCENA SE MENCIONA, SIN FILTRO DE CARGO
    # (2026-10-27). La mesa de DBA Conecta de Unai salio sin mencionar a los tres ponentes
    # porque no pasaban el filtro de cargo de menciones.py, y casi sin contar de que iba la
    # charla. Estuvieron con el jefe en persona. El filtro de cargo es del peloteo (gente que no nos conoce); aqui no aplica.
    if a.historia_evento:
        _arrobas = len(re.findall(r'@\w', texto))
        res.append((False, 'ENTREGA: HISTORIA/EVENTO menciona a QUIEN COMPARTIO LA ESCENA y cuenta DE QUE IBA',
                    '%d mencion(es). Ponentes, moderador y organizador van con @ y nombre exacto de Unipile '
                    'AUNQUE no pasen el filtro de cargo ni el de actividad: ese filtro es del peloteo, donde '
                    'no nos conoce nadie; estos estuvieron con el jefe en persona. Y el cuerpo cuenta el TEMA '
                    'de la charla con lo verificado (post del organizador), no solo el agradecimiento '
                    '(post-workflow §4.6-ESCENA-COMPARTIDA, 27/10)' % _arrobas, True))
    if a.pilar == 'meme' and not (a.ref_con_texto or a.historico):
        res.insert(0, (False, 'MEME: la IMAGEN de la referencia lleva TEXTO dentro (§4.4-TEXTO)',
                       'Tapa el post y mira la foto de la referencia: ¿hay palabras escritas DENTRO '
                       'sin las que el chiste no se entiende (etiquetas, dialogo, rotulos, captura)? '
                       'Si es una foto o un fotograma de una persona sin texto, se descarta por mucha '
                       'risa que tenga, en las cinco cuentas. Si lo lleva, pasa --ref-con-texto.', False))
    # ⛔ EL MEME NUNCA DEJA MAL AL CARGO QUE NOS COMPRA, EN NINGUNA CUENTA (Iker,
    # 2026-10-02). Hasta hoy era filtro duro solo en Unai y "cuidado igual" en Iker y
    # Asier, como aviso que no contaba. Unai borro el meme de los sueños (01/10) por la
    # placa EN REUNION del director dormido. Iker: "nunca ningun meme en ninguna de las
    # tres cuentas se meta con directores comerciales, que son los que nos compran".
    # El script no ve la imagen: se declara con --comprador-ok tras repasarla.
    if a.pilar == 'meme' and not (a.comprador_ok or a.historico):
        res.insert(0, (False, 'MEME: el chiste no deja mal al cargo que COMPRA, en ninguna cuenta (§4.4-COMPRADOR)',
                       'Director comercial, gerente, CEO, fundador, director de exportacion o de marketing: '
                       'se juega con su presion o con lo que sueña (complicidad), nunca con que no trabaja, '
                       'se escaquea o no sabe (burla). Repasa tambien placas, tazas, rotulos y el peldaño de '
                       'arriba de una evolucion por cargos. Vale en las TRES cuentas, Iker incluido. '
                       'Si pasa, --comprador-ok.', False))
    # ⛔ NI EL TEXTO NI LA TARJETA JUZGAN AL QUE COMPRA, EN NINGUN PILAR (Iker, 2026-10-15).
    # La regla vivia solo en el meme (--comprador-ok) y en la lente del inversor de Unai,
    # asi que la tarjeta de Asier del 15/10 dio 42/42 con "cuanto menos paga un cliente,
    # mas problemas da" y "Al cliente que regatea cada euro... se le acepta". Iker: "no
    # criticar a la gente con poder de decision que nos puede acabar comprando tiene que
    # estar en los tres jefes". Se caza el JUICIO pegado al que compra (cliente, director,
    # gerente, CEO...), no la situacion: "eligio al competidor mas barato" pasa. Medido el
    # 15/10 contra los 314 posts publicados de las 3 cuentas: 0 falsos positivos.
    _COMPRA = r'\b(clientes?|compradore?s?|director(es)?|directoras?|gerentes?|ceos?|fundador\w*|due[ñn]o\w*)\b'
    _JUICIO = (r'\b(regate\w+|taca[ñn]\w+|pesad[oa]s?|ratas?|problem[aá]tic\w+|t[oó]xic\w+|escaque\w+|vag[oa]s?|'
               r'no se entera\w*|no tiene ni idea|no sabe lo que \w+)\b'
               r'|\b(da|dan|causa|causan|trae|traen)\s+(m[aá]s\s+)?problemas\b|\bproblemas\s+(da|dan|causa|causan)\b'
               r'|\bclientes?\s+(m[aá]s\s+)?barat[oa]s?\b')
    _juzga = [l.strip() for l in (texto + '\n' + (card or '')).splitlines()
              if re.search(_COMPRA, l, re.I) and re.search(_JUICIO, l, re.I)]
    # ⛔ NI UNA ETIQUETA QUE REBAJE AL COMERCIAL (Iker, 2026-10-15). La tarjeta de Asier
    # abria con "Querido comercial novato:" para calcar el "Dear younger me" de Hormozi sin
    # ponerle a Asier un rol de vendedor. Iker: "lo veo muy peligroso porque se percibe como
    # critica total al novato". Es el colectivo del lector (brand-voice canonico 4). Medido
    # el 15/10: 0 de los 314 posts publicados de las 3 cuentas llevan "novato".
    _etq = [l.strip() for l in (texto + '\n' + (card or '')).splitlines()
            if re.search(r'\bnovat[oa]s?\b|\bpringad[oa]s?\b|\bnovatill\w*', l, re.I)]
    res.insert(0, (not _etq, 'Sin etiqueta que rebaje al comercial: novato, pringado (brand-voice canonico 4)',
                   ('"%s": se lee como critica al que empieza, que tambien nos lee. Al comercial se le '
                    'habla sin etiqueta ("Querido comercial:")' % _etq[0][:80]) if _etq else '', False))
    # La tarjeta va por validar_tarjeta() y no pasa por el veto global de la IA que sustituye
    # al comercial (validar()). Se repite aqui para ese pilar, sobre texto y tarjeta.
    if a.pilar == 'tarjeta':
        _ia = [l.strip() for l in (texto + '\n' + (card or '')).splitlines()
               if re.search(r'd[ií]as contados|quit\w* (el|su) puesto|cu[aá]nto le queda al comercial', l, re.I)
               or (re.search(r'sustitu\w*|reemplaz\w*|jubil\w*', l, re.I)
                   and re.search(r'comercial|vendedor|equipo|personas|puesto', l, re.I))]
        _ia_iker = (a.cuenta or '').strip().lower() == 'iker'
        res.insert(0, (not _ia, 'MARCA: sin plantear que la IA sustituye al comercial (brand-voice §1b; en Iker, aviso desde el 20/10)',
                       ('"%s": aunque se desmienta, se lee como nuestra vision' % _ia[0][:80]) if _ia else '', _ia_iker))
    res.insert(0, (not _juzga, 'Sin juicio negativo sobre el que COMPRA, en cualquier pilar y cuenta (brand-voice canonico 5)',
                   ('"%s": cuenta lo que HACE (no coge, compra a otro, pide descuento), sin colgarle el '
                    'adjetivo. La culpa va a la situacion, la prisa o el proceso: "cuanto menos paga un '
                    'cliente, mas problemas da" quedo en "cuanto mas descuento das, mas problemas trae la venta"'
                    % _juzga[0][:80]) if _juzga else '', False))
    # VOZ AJENA (Iker, 2026-10-05, borrador de Ismael): en el texto de un perfil
    # nuevo manda SU forma de escribir. La chica de producto reescribio varias
    # veces el gancho que le pulimos porque "no sonaba a ella". El FORMATO de la
    # casa pasa a aviso; lo que protege el alcance, la marca o la ley sigue duro.
    if a.voz_ajena and (a.cuenta or '').strip().lower() in ('iker', 'unai', 'asier', 'mario'):
        res.insert(0, (False, '--voz-ajena NO vale en las cuentas de los 3 jefes ni en la de Mario',
                       'Es para el borrador de un perfil nuevo (Ismael, la chica de producto...). '
                       'En Iker, Unai, Asier y Mario (marketing) el formato de la casa es obligatorio.', False))
    # ISMAEL ES EL COMERCIAL (Iker, 2026-10-08): su ninja va a su agenda,
    # meetings.neety.com/ismael, nunca a la web de solicitar demo.
    if (a.cuenta or '').strip().lower() == 'ismael' and 'neety.com' in texto:
        _a_su_agenda = re.search(r'https://meetings\.neety\.com/ismael(?![\w/-])', texto) is not None
        res.insert(0, (_a_su_agenda, 'ISMAEL: el enlace va a SU agenda, https://meetings.neety.com/ismael (§0c-VOZ)',
                       '' if _a_su_agenda else 'Es el comercial: en su cuenta el ninja manda a su agenda, no a '
                       '/solicitar-demo (Iker, 08/10). Limpio mientras la agenda no tenga analitica; con ella, UTM.', False))
    # LA PALABRA DEL OFICIO NO SE CAMBIA POR UNA PUNCHY (Iker, 2026-10-16). En el
    # borrador de Ismael del 08/10 cambie "sector" por "censo" para que pegara mas,
    # y no lo entendio nadie: en ventas se llama sector. El punch va al verbo o al
    # intensificador, nunca a la palabra con la que el lector nombra su trabajo.
    # Aviso de entrega: el script no ve el borrador original, asi que imprime las
    # palabras del oficio del gancho para comprobar que siguen siendo LAS SUYAS.
    if a.voz_ajena:
        _gancho = texto.strip().split('\n\n')[0]
        _OFICIO = (r'\b(sector|sectores|se[ñn]al(es)?|ICP|cliente ideal|lead|leads|decisor(es)?|prospect\w*|'
                   r'pipeline|cartera|embudo|oportunidad(es)?|cuenta(s)? objetivo|director comercial|'
                   r'puerta fr[ií]a|llamada en fr[ií]o|oferta|presupuesto|licitaci[oó]n|feria)\b')
        _of = sorted({m.group(0).lower() for m in re.finditer(_OFICIO, _gancho, re.I)})
        res.append((False, 'ENTREGA VOZ AJENA: la palabra del OFICIO sigue siendo la suya (working-preferences §0c-VOZ)',
                    ('en el gancho: %s. ' % ', '.join(_of) if _of else 'el gancho no lleva jerga del oficio reconocible. ') +
                    'Compara con su borrador: si una palabra del oficio (sector, señal, ICP, lead, decisor...) '
                    'paso a otra mas punchy, se devuelve la suya. El punch va al verbo o al intensificador. '
                    'Caso: "sector" -> "censo" (08/10) y no lo entendio nadie', True))
    if a.voz_ajena and (a.cuenta or '').strip().lower() not in ('iker', 'unai', 'asier', 'mario'):
        _FORMATO = ('Al menos un bloque de DOS', 'Bloques de 2-3 en escalera',
                    'Bloques de prosa', 'Cierre punchy de UNA linea', 'Cifras en digito',
                    'Cifras en dígito', 'El primer bloque multiple', 'HISTORIA: <=800',
                    'HISTORIA: ritmo de historia', 'HISTORIA: cierra con una LECCI',
                    'Línea individual tras cada bloque', 'Ninguna linea pasa de 80',
                    'Ninguna linea termina en dos puntos', 'RITMO:', 'Sin dos puntos en medio',
                    'El post no cierra con una pregunta', 'Tras el gancho, LINEA INDIVIDUAL')
        res = [(b, ('VOZ AJENA · ' + n) if (not x and n.startswith(_FORMATO)) else n, d,
                True if n.startswith(_FORMATO) else x) for b, n, d, x in res]
    # Los avisos se imprimen pero NO cuentan: son sospechas, no infracciones.
    # Mezclarlos vaciaría de significado el marcador, y el marcador es lo único
    # que se pega en la entrega.
    # ⛔ UN RETOQUE NO ABRE NADA NUEVO (Iker, 2026-10-22). En la historia de Asier del 22/10,
    # para "exprimir el CTR" cambie la linea del enlace y perdi la bisagra con la linea 1; el
    # validador lo aviso, lo descarte y lo vendi como mejora. Iker: "si un retoque que esta
    # hecho para mejorar incumple algo de tu validador, tienes que ver la manera de incluir
    # igualmente el retoque y aun asi corregir lo que se ha incumplido". Con --antes se valida
    # tambien la version anterior con los mismos flags y se compara: cualquier check que
    # estaba bien (duro o aviso) y ahora no, es un fallo duro del retoque.
    if a.antes and os.path.exists(a.antes):
        _prev = validar(io.open(a.antes, encoding='utf-8').read(), a.pilar, a.cuenta, a.generico,
                        a.meme_sobrio, a.ref_fuera, a.remix, a.sin_menciones, card, a.solo_correo,
                        a.historico, a.publica_manana)
        # _prev sale de validar() a pelo: no lleva el prefijo 'VOZ AJENA · ' ni los checks que
        # main() añade despues (el de la palabra del OFICIO). Sin normalizar, con --voz-ajena
        # esos avisos salian SIEMPRE como nuevos aunque la version anterior ya los tuviera
        # (26/10, historia de Ismael). Solo se comparan los checks que existen en las dos.
        _norm = lambda n: n.replace('VOZ AJENA · ', '')
        _todos_antes = {_norm(x[1]) for x in _prev}
        _malos_antes = {_norm(x[1]) for x in _prev if not x[0]}
        _nuevos = [x[1] for x in res if not x[0] and _norm(x[1]) in _todos_antes
                   and _norm(x[1]) not in _malos_antes]
        res.insert(0, (not _nuevos, 'RETOQUE: no abre fallos ni avisos que la version anterior no tenia (working-preferences §1d-BIS)',
                       ('el retoque rompe: %s. Quedate con el retoque y arregla esto antes de entregar'
                        % ' | '.join(_nuevos)) if _nuevos else 'limpio contra la version anterior', False))
    duras = [x for x in res if not x[3]]
    ok = sum(1 for x in duras if x[0])
    print(f"\n  VALIDADOR — pilar={a.pilar}" + (f" cuenta={a.cuenta}" if a.cuenta else "") + "\n")
    for bien, nombre, det, es_aviso in res:
        etiqueta = ('OK  ' if bien else 'AVISO') if es_aviso else ('OK  ' if bien else 'FALLA')
        print(f"  {etiqueta} {nombre}")
        if det:
            print(f"        └─ {det}")
    avisos = [x for x in res if x[3] and not x[0]]
    print(f"\n  {ok}/{len(duras)} checks" + (f" · {len(avisos)} aviso(s) que NO cuentan" if avisos else "") + "\n")
    if avisos:
        print("  Los avisos no bloquean, pero míralos: son cosas que han funcionado")
        print("  alguna vez y aun así están fuera de donde vive lo que gana.\n")
    # ⛔ EL CRITERIO SE CONTESTA POR ESCRITO, O NO HAY ENTREGA (Iker, 15/10). Causa raiz del
    # dia: las reglas que el script no puede medir vivian como ~50 avisos FIJOS que salen
    # siempre, no miran el texto y no cuentan en el marcador. El marcador salia verde (69/69)
    # con ganchos que contaban el pago, nombres propios sin su categoria y el evento en la
    # ultima linea. Ahora las 5 preguntas que mas han fallado exigen una respuesta escrita
    # (--criterio) y el veredicto final las cuenta. El marcador N/N no cambia de formato:
    # validar-video.py y los tests lo leen.
    if not a.historico:
        _resp = {}
        if a.criterio and os.path.exists(a.criterio):
            for _l in io.open(a.criterio, encoding='utf-8').read().splitlines():
                if ':' in _l:
                    _k, _v = _l.split(':', 1)
                    _resp[_k.strip().lower()] = _v.strip()
        _crit = [(k, q) for k, q in CRITERIO if k not in CRITERIO_PILAR or a.pilar in CRITERIO_PILAR[k]]
        # 28/10: el gancho de una historia crecio de 52 caracteres de mediana (junio) a 80
        # (octubre) y en historia los de 70 o menos rinden casi el doble (0,97 contra 0,55 de
        # outlier_ratio, auditar-derivas.py). El aviso de la mediana + 15 lo dejaba pasar en
        # silencio. Por encima del tope del pilar, el gancho se acorta o se justifica por
        # escrito. El peloteo se libra: sus ganchos largos son estructura y vuelan.
        _gancho = texto.strip().split('\n\n')[0].strip()
        _topes = {'historia': 70}
        _tope_g = _topes.get(a.pilar, 75)
        if a.pilar not in ('mapa', 'las10', 'los10', 'objeto') and len(_gancho) > _tope_g:
            _crit.append(('largo', f'El gancho mide {len(_gancho)} caracteres y el tope del pilar es {_tope_g} '
                                   '(en historia los de 70 o menos rinden casi el doble). Acortalo o justifica por '
                                   'que cada palabra que sobra es imprescindible (global §2.2c)'))
        # 28/10: un retoque (--antes) es una correccion de alguien, y una correccion es un
        # aprendizaje. Se escribio en la receta solo cuando el jefe lo pidio. Ahora cada retoque
        # pregunta donde ha quedado escrito lo aprendido, antes de entregar.
        if a.antes:
            _crit.append(('aprendizaje', 'Este retoque corrige algo: ¿que regla sale de el y donde ha quedado escrita '
                                         '(receta + su dueño: check, clave de criterio o cobertura-reglas.txt)? '
                                         'Si no es regla, por que (gusto puntual, dato del post) (working-preferences §1d-BIS)'))
        CRITERIO[:] = _crit
        _falta = [k for k, _q in CRITERIO if len(_resp.get(k, '')) < 15]
        # La escalera del gancho no vale como frase suelta: tres peldaños o no esta hecha.
        if 'punch' not in _falta and len(re.findall(r'→|->', _resp.get('punch', ''))) < 2:
            _falta.append('punch')
        print('  CRITERIO (lo que el script no ve; se contesta en --criterio, una linea por clave):')
        for k, q in CRITERIO:
            print(f"  {'✅' if k not in _falta else '⛔'} {k}: {q}")
            if k not in _falta:
                print(f"        └─ {_resp[k][:160]}")
        _ent = ok == len(duras) and not _falta
        print(f"\n  ENTREGABLE: {'SÍ' if _ent else 'NO'} · mecánico {ok}/{len(duras)} · "
              f"criterio {len(CRITERIO) - len(_falta)}/{len(CRITERIO)} contestado\n")
        if ok == len(duras) and _falta:
            sys.exit(3)
    sys.exit(0 if ok == len(duras) else 1)

if __name__ == '__main__':
    main()
