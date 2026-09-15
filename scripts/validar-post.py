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
    python scripts/validar-post.py <fichero.txt> --pilar mapa|los10|meme|leadmagnet|tarjeta
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
SUJETO_AJENO = r'(nadie (?:habla|la tiene|la cuenta|sabe)|todos? (?:ven|la)|l[ao] (?:ven|llaman|conocen|tienen|despachan|colocan|cuentan|archivan|entierran|resumen|reducen|dan por|sitúan|situan)|le[s]? suena a|para el resto|en el mapa es|la pintan|se la imagina)'

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
    'despachan': 'Murcia (Iker)',
    'fichada': 'Asturias (Unai)',
    'fichado': 'Euskadi (Iker)',
    'jubilada': 'Asturias (Unai)',
    'la ven como': 'Navarra, Cataluña y Aragón',
    'la llaman': 'Álava (Unai)',
    'la conocen por': 'País Vasco (Unai)',
    'nadie habla': 'Gipuzkoa (Iker) y País Vasco (Unai)',
    'en el mapa es': 'Euskadi (Iker)',
    'resumen': 'Castilla y León (Iker)',
    'todos ven': 'Valencia (Iker)',
    # Leidos del texto PUBLICADO (BD en vivo, 2026-09-15). Llevaban desde
    # julio y agosto sin anotarse, y son los DOS de la cuenta de Asier.
    'archivan': 'Navarra, despiece de Asier 07/08',
    'dan por visto': 'Cantabria, mapa de Asier 01/09',
}

# §4.2 Paso 1 — la frase-rabia es el motor: sin ella el local no siente el
# desprecio, no comenta y no hay alcance. Familia validada + variantes.
FRASE_RABIA = (r'(y para de contar|y poco m[aá]s|y poco que rascar|y gracias|para irse'
               r'|antes de seguir carretera|de vuelta a|y a otra cosa|y ya|y punto|y hasta ah[ií]'
               # Variantes nuevas: el BEAT no cambia nunca (cliché de comer o de
               # fiesta + gesto de despacharla), las palabras rotan siempre
               # (§2.0b). Se añaden aquí el día que se estrenan, o el check pide
               # la frase-rabia y a la vez tumba la única forma que queda libre.
               r'|y a casa|y nada m[aá]s|y a la autov[ií]a|y se acab|y de ah[ií] no pasa)')

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
# ⛔ LA VENTANA SE CUENTA EN DIAS Y VALE PARA LAS 3 CUENTAS, no por cuenta. No es
# un capricho: lo decidio Iker el 2026-08-25 con el caso delante ("aunque sea
# otra cuenta, me da igual, hay que seguir sorprendiendo"), porque los 3 jefes
# comparten red y el mismo lector ve los tres perfiles. Si algun dia se quiere
# por cuenta, se cambia aqui y se anota el motivo.
#
# ⛔ Y NO TODAS LAS LISTAS CADUCAN. Caducan las de RITMO, que se tocan cada
# semana. `PAIS_QUEMADO`, `CONCEPTO_QUEMADO`, `FRASE_RABIA_USADA` y
# `VERBO_PREJUICIO_QUEMADO` NO: esas son la identidad de un post concreto (la
# comparacion de Navarra, el concepto de Galicia), crecen una vez al mes y
# repetirlas se lee como refrito aunque pasen seis meses.
VENTANA_ARRANQUE_DIAS = 21
VENTANA_NINJA_DIAS = 30

_RE_FECHA_ENTRADA = re.compile(r'^(\d{4})-(\d{2})-(\d{2}) ')


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
    'dar con el que decide': '2026-07-31 meme Unai 29/07, historia Iker 29/07, mapa Asturias 31/07',
    'son meses a mano': '2026-07-31 lo mismo, en los tres',
    'te lo damos hecho': '2026-07-31 lo mismo, en los tres',
    'te lo damos resuelto': '2026-08-18 historia de Iker 18/08 (era la variante de "te lo damos hecho")',
    'te lo marcamos': '2026-08-19 meme de Iker 19/08 (el de la transcripcion de la llamada)',
    'acertar con quien no': '2026-08-21 historia de Unai 21/08 (la del evento en el ninja)',
    'saber quien compra': '2026-08-27 meme de Iker 27/08 (el de la ficha del cliente)',
    'saber quien compra, no': '2026-08-27 lo mismo, la forma con la coma',
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
    'esa carretera acaba en una sala': '2026-09-15 "Los 10" de Gipuzkoa, Unai 15/09',
    'los encuentras de uno en uno': 'lo mismo, la linea 1 del bloque',
    'saber quien firma dentro': '2026-08-07 despiece de Navarra, Asier 07/08',
    'saber quién firma dentro': 'lo mismo, la forma con tilde',
}

# §4.2 Paso 1 — CONCEPTOS DE GANCHO YA USADOS. La receta decia "no repitas
# concepto usado" y no habia lista: dependia de que yo recordara diez posts.
# Auditoria del 2026-07-31.
# §4.2 Paso 2 — PAISES YA USADOS EN LA COMPARACION. Lista nueva del 2026-08-03:
# no existia y por eso propuse Bolivia para Castilla y Leon sin darme cuenta de
# que ya era el pais del mapa de Navarra. La comparacion es lo que se comparte,
# asi que repetirla se nota mas que ninguna otra cosa.
PAIS_QUEMADO = {
    'uruguay': 'Murcia',
    'bolivia': 'Navarra',
    'croacia': 'Galicia',
    'luxemburgo': 'Valencia',
    'italia': 'Andalucía',
    'portugal': 'Cataluña (Iker)',
    'chipre': 'Asturias',
    'finlandia': 'Cataluña (Unai)',
    'honduras': 'Álava',
    'kenia': 'Aragón',
    'paraguay': 'Castilla y León',
    'montenegro': 'Navarra, despiece de Asier 07/08',
    'jamaica': 'Cantabria, mapa de Asier 01/09',
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
    # Verificados leyendo el texto publicado.
    'historia': {
        'la': '2026-08-18 historia de Iker 18/08 ("La eche donde el coche...")',
        'ni': '2026-08-13 historia de Iker 13/08 ("Ni una pregunta por el precio")',
        # Publicados y leidos, no deducidos (§0f: la lista se toca al PUBLICAR).
        'nadie': '2026-08-21 historia de Unai 21/08 ("Nadie las abria / Nadie me las pedia")',
        'no': '2026-08-21 historia de Unai 21/08 ("No era la mas bonita / difícil / mejor")',
        'hoy': '2026-08-21 historia de Unai 21/08 ("Hoy no toco el codigo / Hoy levanto dinero")',
        'aquel': '2026-08-25 historia de Asier 25/08 ("Aquel numero era de la casa entera")',
        'me': '2026-08-25 historia de Asier 25/08 ("Me pregunto quien era yo / de que conocia")',
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
    },
    'mapa': {
        'no': 'mapa de Navarra ("No paga las nominas San Fermin", swipe-file)',
    },
    # Estos dos salen de nuestro propio runbook (post-workflow 4.3), no de haber
    # releido el post: si algun dia se comprueban, se anota aqui.
    'los10': {
        'no': '"Los 10" del Pais Vasco ("No publica. No da charlas.", swipe-file)',
        'con': 'Gipuzkoa, Unai 15/09 ("Con el va un taller / alguien / la nomina")',
        'aqui': 'Gipuzkoa, Unai 15/09 ("Aqui la sidra / Aqui el queso")',
        'en': 'Gipuzkoa, Unai 15/09 ("En Mendaro / En Ordizia / En Beasain")',
        'se': 'Asturias ("Se sabe... / Se sabe... / Se hace..."), via runbook',
        'su': 'Andalucia ("Su / Su / Su"), via runbook',
    },
    # El pilar meme no tenia lista y es el que mas publica. Leidos los dos
    # publicados de la semana pasada (§0f: al PUBLICAR, no al entregar).
    'meme': {
        'la': '2026-08-20 meme de Asier 20/08 ("La lista no se pule / no se hereda / se elige antes")',
        'no': '2026-08-25 meme de Unai 25/08 ("No buscan quien mande mas / escriba mejor / conteste antes")',
        'se': '2026-08-27 meme de Iker 27/08 ("Se lo que hablamos / Se en que bar desayuna")',
        # Publicados 01-11/09, anotados el 2026-09-15.
        'arriba': '2026-09-01 meme de Iker 01/09 ("Arriba llegan con agenda / Arriba nadie parte de cero / Arriba llegan con el nombre")',
        '12': '2026-09-03 meme de Asier 03/09 ("12 meses pagados / 12 meses de pantalla / 12 meses sin una cara")',
    },
    # El pilar lead magnet tampoco tenia lista. Anotado al PUBLICAR (§0f).
    # El pilar DESPIECE tampoco tenia lista. Leidos los dos publicados.
    'objeto': {
        'lo': '2026-07-30 despiece de Euskadi, Iker ("Lo asocias al monte / a la sidreria / a que llueve")',
        'es': '2026-08-07 despiece de Navarra, Asier ("Es el pacharan... / Es el Camino...")',
    },
    'leadmagnet': {
        'ninguno': '2026-08-26 lead magnet de Iker 26/08 ("Ninguno es de redaccion / de personalizacion / se arregla escribiendo mejor")',
    },
}

CONCEPTO_QUEMADO = {
    'sitio de comer': 'Euskadi',
    'desierto': 'Murcia',
    'patio trasero': 'Navarra',
    'esquina del atl': 'Galicia',
    'museo minero': 'Asturias',
    'ltima parada': 'Cataluña',
    'trastienda del norte': 'Álava',
    'secarral': 'Aragón',
    'pasillo de espa': 'descartado por Iker: critica a España',
    'tejado de la pen': 'Castilla y León',
    # Los DOS de Asier, publicados y sin anotar hasta el 2026-09-15.
    'felpudo del pir': 'Navarra, despiece de Asier 07/08',
    'tendedero del cant': 'Cantabria, mapa de Asier 01/09',
}

# §4.2 Paso 1 — FRASES-RABIA YA USADAS. Misma historia: la receta pedia no
# repetirla y no habia con que comprobarlo.
FRASE_RABIA_USADA = {
    'de vuelta al aeropuerto': 'Euskadi',
    'y para de contar': 'Murcia',
    'y poco m': 'Navarra',
    'poco que rascar': 'Asturias',
    'y a seguir': 'Cataluña',
    'para irse': 'Álava',
    'antes de seguir carretera': 'Aragón',
    'y a otra cosa': 'Castilla y León',
    'nada m': 'Navarra, despiece de Asier 07/08 ("toros, esparragos y nada mas")',
    'a la autov': 'Cantabria, mapa de Asier 01/09 ("sobaos, anchoas y a la autovia")',
}

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
                   r'|audiencia|viral|engagement|seguidores|marca personal|perfil|linkedin'
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


def validar_tarjeta(texto, card=None):
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
    n = len(texto)
    chk(150 <= n <= 400, 'TARJETA: el texto de LinkedIn cae entre 150 y 400 caracteres (§4.6-PASO-3)',
        f'{n} caracteres. Medido en Hormozi: 1-150 da 0,95x-1,06x y 151-400 da 0,91x-1,11x; '
        f'a partir de 900 se hunde a 0,71x')

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
    tiene_agendar = 'recursos.neety.com/agendar' in texto
    chk(tiene_agendar, 'TARJETA: lleva el spam ninja de agendar (§4.6-PASO-3)',
        '' if tiene_agendar else 'obligatorio en este pilar; el de correo es opcional')

    if tiene_agendar:
        bs = bloques(texto)
        idx = next((i for i, b in enumerate(bs)
                    if any('recursos.neety.com/agendar' in l for l in b)), None)
        # §4.4e-PRONTO se mide en BLOQUES, no en caracteres. Aqui NO hay gancho
        # en el texto (vive en la imagen), asi que los 2 bloques se cuentan
        # desde el principio: el enlace no puede ser el 1º ni el 2º bloque.
        chk(idx is not None and idx >= 2,
            'TARJETA: >=2 bloques de cuerpo antes del ninja de agendar (§4.4e-PRONTO)',
            f'va en el bloque {(idx or 0) + 1} de {len(bs)}. El gancho vive en la imagen, asi que '
            f'los 2 bloques se cuentan desde el inicio del texto')

    if 'recursos.neety.com/correo' in texto or 'recursos.neety.com/newsletter' in texto:
        bs = bloques(texto)
        idx = next((i for i, b in enumerate(bs)
                    if any(('recursos.neety.com/correo' in l or 'recursos.neety.com/newsletter' in l)
                           for l in b)), None)
        chk(idx is not None and idx <= len(bs) - 3,
            'TARJETA: el ninja de correo no es el ultimo ni el penultimo bloque (§4.4e)',
            f'va en el bloque {(idx or 0) + 1} de {len(bs)}; detras tiene que quedar cuerpo y el '
            f'cierre punchy en su linea')
        m = re.search(r'\b(suscr[ií]b|newsletter)\w*', texto, re.I)
        chk(not m, 'TARJETA: sin "suscribete" ni "newsletter" en el bloque de correo (§4.4e)',
            f'"{m.group(0)}" suena a formulario; a un industrial de 55 se le dice "esto lo mando '
            f'por correo antes que aqui"' if m else '')

    # Universal §3.6: si hay cifras, en digito.
    ms = re.findall(r'\b(dos|tres|cuatro|cinco|seis|siete|ocho|nueve|diez|veinte|treinta|'
                    r'cuarenta|cincuenta|cien|doscientos|quinientos|seiscientos|mil)\b',
                    texto, re.I)
    chk(not ms, 'Cifras en digito, nunca en letra (§3.6)', f'{ms[:3]}' if ms else '')

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

def validar(texto, pilar, cuenta=None, generico=False, meme_sobrio=False, ref_fuera=False, remix=False, sin_menciones=False, card=None, solo_correo=False, historico=False, publica_manana=False):
    texto = norm(texto)
    if pilar == 'entregable':
        return validar_entregable(texto)
    if pilar == 'tarjeta':
        return validar_tarjeta(texto, card)
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
    _INTENS = (r'\bningun[oa]?\b|\bni un[oa]?\b|\bnunca\b|\bjam[aá]s\b|\bs[oó]lo\b|\bsolo\b'
               r'|en la vida|ni de broma|y poco m[aá]s|y para de contar|y a otra cosa'
               r'|lo [uú]ltimo que|en la vida habr[ií]a|todav[ií]a no|ya ha empezado'
               r'|sin tocar|en una tarde|' + FRASE_RABIA)
    _int = re.search(_INTENS, hook_txt, re.I)
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
    chk(False, 'ENTREGA: ¿el gancho PRESUME? (brand-voice §1)',
        'Si la primera linea lleva un logro tuyo, una cifra tuya buena o un premio, el '
        'lector lee "mirame" y no "sigue leyendo". La autoridad se demuestra con el '
        'contenido, nunca se anuncia, y esta medido: los outliers usan un 25% MENOS '
        'lenguaje de autoridad que los posts normales (outliers-database §3.7). Busca la '
        'version HUMILDE de la misma escena, que casi siempre es mas visual y mas '
        'universal. Caso real (21/08): "me pillo con la placa de 100.000 seguidores en la '
        'mano" paso a "me pillo con el tripode montado en el salon" — misma escena, mismo '
        'verbo, 11 caracteres menos y sin presumir', aviso=True)

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
    if _es_mario:
        _mk = re.search(MARKETING_ANCLA, hook_txt, re.I)
        chk(bool(_mk), 'Hook anclado a MARKETING (cuenta Mario, aboutme §2)',
            'Mario es la cuenta de marketing/growth: el hook ancla en contenido/redes/marketing, '
            'no en "vender"' if not _mk else f'ancla marketing: "{_mk.group(0)}"')
    elif _es_helena:
        # ⛔ EL CUERPO DE HELENA NO PUEDE SONAR PREPOTENTE (Iker, 2026-08-27).
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
        chk(False, 'ENTREGA: ¿el CUERPO presume? (cuenta Helena, brand-voice EXCEPCION 4)',
            ('marcas encontradas: %s. ' % ', '.join(sorted(set(_chulo))) if _chulo else '')
            + 'El cuerpo va en 1ª PLURAL cuando el merito es de la casa, y una linea que '
              'presume de lo bien que lo hacemos se lee como chuleria. La salida es siempre '
              'la misma: la version CONFESION de la misma escena ("lo relleno todo '
              'religiosamente" -> "me lo se de memoria"). Vale igual para saber mas que el '
              'cliente: "vemos su problema antes de que lo cuenten" presume, "conocemos la '
              'hora a la que es mejor no llamarles" es cercania', aviso=True)
        _cs = re.search(CS_ANCLA, hook_txt, re.I)
        chk(bool(_cs), 'Hook anclado a ATENCION AL CLIENTE (cuenta Helena, aboutme 2-CARRIL-GANCHO)',
            'Helena es la cuenta de customer success y partnerships: el hook ancla en su oficio '
            '(cliente, cuenta, soporte, seguimiento) y la vinculacion con ventas baja al CUERPO'
            if not _cs else f'ancla de su oficio: "{_cs.group(0)}" - y la vinculacion con VENTAS '
            f'tiene que estar en el CUERPO (aboutme 2)')
    elif not generico:
        chk(bool(fuerte or ambigua), 'Hook anclado a VENTAS (§2.3)', detalle)
    m = re.search(VERBO_FLOJO, hook_txt, re.I)
    chk(not m, 'Hook sin verbo flojo (§2.9)',
        f'verbo flojo: "{m.group(0)}" → sube un peldaño (criticar→desmontar)' if m else '')
    m = re.search(DEMASIADO_NICHO, hook_txt, re.I)
    chk(not m, 'Hook sin jerga que estrecha alcance (§2.3)', f'"{m.group(0)}" fuera del hook' if m else '')
    m = re.search(r'[—–]', cuerpo)
    chk(not m, 'Sin guion largo (brand-voice §3)', 'delator de IA nº1' if m else '')
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
        _cola = _cuerpo_sin_lista[_m.end():_m.end() + 2]
        if re.match(r'\s*[€%]|\s*[MkKh]\b', _cola):
            continue
        if _n % 2 == 0 and _n != 0:
            _ctx = _cuerpo_sin_lista[max(0, _m.start() - 22):_m.end() + 10].replace('\n', ' ')
            _pares.append(f'"{_n}" en «…{_ctx.strip()}…»')
    chk(not _pares, 'Cifras ELEGIDAS en impar, en todo el post (§2.5b)',
        (' · '.join(_pares[:3]) + ' → si la cifra la eliges tu, va impar y creible '
         '(el 14/08: "a las 8" pasó a "a las 9", porque a las 7 o a las 5 no se lo cree '
         'nadie). Si es un dato VERIFICADO, se queda como esta y este aviso se ignora: '
         'un dato no se retoca para que quede impar') if _pares else '', aviso=True)

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
    m = re.search(NEGRITA_UNICODE, cuerpo)
    chk(not m, 'Sin negrita Unicode tipo 𝗟𝗮𝘀 𝟭𝟬 (§6)',
        'el check de markdown no la caza: es otro bloque Unicode' if m else '')

    # brand-voice §4.5 — el nombre del founder gana al del producto. Como mucho
    # UNA vez y nunca en el hook. El check viejo solo miraba el spam ninja.
    # §4.4e - LAS URLs NO CUENTAN COMO NOMBRAR LA MARCA. `\bNeety\b` casa dentro
    # de `recursos.neety.com` porque el punto es frontera de palabra, asi que al
    # meter el segundo bloque de correo un post limpio pasaba a 2 y suspendia solo.
    # Y ademas es lo correcto por doctrina: §4.4b dice que el enlace es la unica
    # firma y que el ninja NO nombra a Neety. Lo que se cuenta es la marca escrita
    # en el TEXTO, no el dominio del enlace.
    _neety = len(re.findall(r'\bNeety\b', re.sub(r'https?://\S+', '', cuerpo), re.I))
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
    _urls = re.findall(r'https?://\S+|\b[\w.-]+\.(?:com|es|city|io)\S*', cuerpo)
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
            'El lector lo coge y deja de leer. Rompelo metiendo lineas sueltas seguidas')
        _sueltas = sum(1 for n in _pat if n == 1) / len(_pat)
        chk(_sueltas >= 0.55, 'RITMO: la linea suelta domina, +55% de los bloques (§3.2)',
            f'ritmo {_ritmo} — solo {_sueltas:.0%} son lineas sueltas. La suelta es la base y '
            'los bloques son la variedad, no al reves')

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
                    and vigente(_qa[a], VENTANA_ARRANQUE_DIAS)}))
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
            'Excepciones: TODO LO QUE FINGE SER UN DOCUMENTO O UNA PANTALLA REAL (pantallazo '
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
            'que lo pida: 10:00 rinde 0,80x y 4.850 impresiones de mediana; las 14:00, '
            '0,43x y 2.989. Un post bueno a mala hora rinde la mitad y no se recupera. Y '
            'desde que ningun post lleva anio, esperar a manana no le cuesta nada al texto',
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
        'reparte, con el numero medido, y pegada al final la razon para que NO funcione, '
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
    if pilar in ('mapa', 'los10', 'meme', 'evento'):
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
            _dest_ok = ('recursos.neety.com/agendar' in cuerpo) or _es_evento
            chk(_dest_ok, 'El spam ninja apunta a /agendar/, no a un lead magnet (§4.4b)',
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
                _mapa = pilar == 'mapa'
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
                chk(_pos <= 650, 'Spam ninja: el enlace cae antes del caracter 650 (§4.4b)',
                    'el enlace cae en el %d. Los 2 unicos posts que lo pasaron de 650 '
                    'son los 2 peores CTR del ano (0,042%% y 0,017%%) frente al '
                    '0,050-0,151%% de los que lo ponen antes del 511' % _pos
                    if _pos > 650 else '')
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
                         'queria', 'vender', 'ventas'}

                def _sinac(_s):
                    for _a, _b in zip('áéíóúñ', 'aeioun'):
                        _s = _s.replace(_a, _b)
                    return _s
                _pal = [w for w in re.findall(r'[a-záéíóúñ]{5,}', hook_txt.lower())
                        if _sinac(w) not in _stop]
                _raiz = _sinac(' '.join(b).lower())
                _eco = [w for w in _pal if _sinac(w)[:5] in _raiz]
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
                # ⛔ EL NINJA DEL EVENTO PROMETE OTRA COSA, Y ES LA CORRECTA (2026-08-27).
                # "Identificar a la persona" es el contrato de /agendar/ (4.4b-PROMESA:
                # lo que promete el ninja lo decide el DESTINO). El destino Luma vende
                # LA SALA -- quien esta dentro y por que se ha elegido a mano
                # (4.4b, el formato validado de Grace Gong, 11.6x y 14.4x) --, asi que
                # exigirle la palabra "quien compra" es pedirle que mienta sobre lo que
                # hay al otro lado del clic. Se le pide su propia promesa: sala, plazas,
                # sitio o fecha.
                if _es_evento:
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
                        _EV_QUEMADA = {
                            'montamos un evento presencial': 'Unai 02/09, Iker 08/09, Asier 09/09 y Unai 11/09 — cuatro veces LITERAL',
                            'hacemos un evento presencial': 'Iker 01/09',
                            'el jueves 24 hacemos': 'Iker, 15/09',
                            'nos vemos en donostia para': 'Unai 24/08 y Asier 26/08',
                            'tenemos evento presencial': 'Unai 15/09',
                        }
                        _evq = [f for f in _EV_QUEMADA if f in _prev]
                        chk(not _evq,
                            'EVENTO: la frase de contexto no esta quemada (§4.4b-EVENTO-CONTEXTO)',
                            ('"%s" ya salio en %s. Las tres piezas (24 · Donostia · presencial) '
                             'no se tocan; lo que rota es el VERBO y el orden. Libres: tenemos, '
                             'abrimos, nos juntamos, nos sentamos' % (_evq[0], _EV_QUEMADA[_evq[0]]))
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
                # 4.4b-BLOQUE (Iker, 2026-08-27) - LAS DOS LINEAS SON UNA UNIDAD.
                # La 1 nombra la CARENCIA y la 2 cubre EXACTAMENTE esa carencia.
                # Si la 1 solo afirma algo, la 2 llega de la nada y el lector se
                # pierde. El check de "repite una palabra del gancho" empuja justo
                # al fallo: para colar los sustantivos del gancho, la linea 1 se
                # convierte en afirmacion en vez de setup. Aviso, no fallo duro:
                # que una frase nombre una carencia es criterio.
                _l1 = b[0] if len(b) > 1 else ''
                _carencia = re.search(r'\bno\b|cualquiera|lo f[aá]cil|es f[aá]cil'
                                      r'|lo caro|lo dif[ií]cil|ni\b|nadie|ning', _l1, re.I)
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
        m = re.search(r'\b(etiqueta|etiquetad|menciona|comenta|comparte)\w*\b', cuerpo, re.I)
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
                      and vigente(SPAM_QUEMADO_CORREO[f], VENTANA_NINJA_DIAS)))
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
    if pilar == 'los10':
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
    # ---------- GANCHO DEL PELOTEO (§4.2 Paso 1) ----------
    # Mecanizado el 2026-07-30 porque como criterio se me olvidaba.
    # SOLO mapa y objeto. "Los 10" NO usa el gancho de prejuicio regional: su
    # foco es LA PERSONA, el comercial invisible (§4.3). Aplicarselo tumbaba los
    # cuatro "Los 10" del historico, incluido el 4.83x.
    if pilar in ('mapa', 'objeto'):
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
        _pais = [] if historico else sorted(p for p in PAIS_QUEMADO if p in hook_txt.lower())
        chk(not _pais, 'GANCHO: el país de la comparación no está usado (§4.2 Paso 2)',
            ' · '.join(f'"{p}" fue {PAIS_QUEMADO[p]}' for p in _pais) +
            '. La comparacion es lo que se comparte, asi que repetir pais se nota mas '
            'que ninguna otra cosa. Busca otro con >=15% de margen y fuente oficial')
        _conc = [] if historico else sorted(c for c in CONCEPTO_QUEMADO if c in hook_txt.lower())
        chk(not _conc, 'GANCHO: el concepto no está usado (§4.2 Paso 1)',
            ' · '.join(f'"{c}" fue {CONCEPTO_QUEMADO[c]}' for c in _conc) +
            '. El concepto se inventa nuevo por region, derivado de su GEOGRAFIA')
        _rabia = [] if historico else sorted(f for f in FRASE_RABIA_USADA if f in hook_txt.lower())
        chk(not _rabia, 'GANCHO: la frase-rabia no está usada (§4.2 Paso 1)',
            ' · '.join(f'"{f}" fue {FRASE_RABIA_USADA[f]}' for f in _rabia) +
            '. El beat se mantiene siempre, las palabras cambian siempre')
        _quemados = [] if historico else sorted(v for v in VERBO_PREJUICIO_QUEMADO
                           if re.search(r'\b' + v + r'\b', texto, re.I))
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
                    and vigente(SPAM_QUEMADO[f], VENTANA_NINJA_DIAS)))
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
        chk('luma.com/ujffj66o' in texto or 'forward.neety.com' in texto,
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
        chk('recursos.neety.com/mapas/' in texto,
            'MAPA: el CTA enlaza a /mapas/{region}/ (§4.2 Paso 5)',
            'el mapa NO enlaza a /agendar/. Va "Mapa completo aquí: '
            'https://recursos.neety.com/mapas/{region}/", con la region en minuscula y sin '
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
        _con_persona = [l for l in _piezas if re.search(r' - | – | — ', l.split(':', 1)[1])]
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
        _puente = re.search(r'^(las?|ningun[ao]|est[ae]s?)\s+(empresas?|f[aá]bricas?|'
                            r'compa[nñ][ií]as?|firmas?|negocios?)', _g10, re.I)
        chk(bool(_puente), 'LOS 10: el gancho abre por la EMPRESA y gira a la PERSONA (§4.3 Paso 1)',
            'arranca en la persona. Los dos que vuelan (4.43x y 2.49x) abren por la empresa o '
            'su resultado y giran a alguien sin nombre dentro de la misma frase; el que arranca '
            'directo en el comercial se quedo en 0.75x', aviso=True)
        _ger = re.search(r'\b\w+(ando|iendo|[eé]ndose|[aá]ndose)\b', _g10, re.I)
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
            r'copiarla a C:\Users\LENOVO\Documents\Mario\LINKEDIN GROWTH\PELOTEO REGIONAL\LOS 10\ '
            'con el nombre "los 10 <region>.png": minusculas, SIN tildes ni eñes y sin guiones, '
            'calcando lo que ya hay (los 10 euskadi / cataluna / asturias / andalucia). El nombre '
            'se lista de la carpeta antes de escribirlo, no se inventa. ⏳ El disparador es su OK '
            'sobre la IMAGEN, no la entrega del post: mientras pueda llegar una foto mejor, un '
            'fichero viejo ahi es peor que ninguno, porque la siguiente region se clona de el. '
            'La copia del Escritorio se queda: esto es el archivo del pilar', aviso=True)
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
        _fuera = [l for l in cuerpo.splitlines()[1:]
                  if l.strip() and not re.match(r'^\s*→\s', l)
                  and re.search(_REGIONAL, l, re.I)
                  and 'recursos.neety.com' not in l]
        chk(not _fuera, 'Sin cifras regionales fuera de las fichas (§4.3 Paso 3b)',
            f'{len(_fuera)}: "{_fuera[0][:52]}"' if _fuera else '')
        # §4.3 Paso 3e — el beat de equipo va en el SETUP, antes de la lista.
        # Despues solo corrige la objecion; antes, la evita.
        _mb = re.search(BEAT_EQUIPO, cuerpo, re.I)
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

    if pilar == 'historia':
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
        chk(_n_hist <= 800, 'HISTORIA: <=800 caracteres (§4.6-SERIE)',
            f'{_n_hist} car. La unica historia que paso de 800 hundio los clics a la mitad '
            f'(19 contra 32-46 de las cinco que estan entre 694 y 762). El rango de trabajo '
            f'del pilar es 700-780' if _n_hist > 800 else '')
        if _n_hist <= 800:
            chk(700 <= _n_hist <= 780, 'HISTORIA: dentro del rango medido 700-780 car (§4.6-SERIE)',
                f'{_n_hist} car, fuera del rango donde estan las 5 que convierten (694-762). '
                f'No es fallo, pero mira si sobra cuerpo o falta escena' if not (700 <= _n_hist <= 780) else '',
                aviso=True)
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
        _personal = re.search(r'(^|\s)(yo|mi|mis|me|nunca|cuando|hace \w+|aquel\w*|la primera vez|acab[eé]|sub[ií]|di mi|ten[ií]a|hab[ií]a|recuerdo|empec[eé]|\bi\b|\bmy\b)(\s|,|\.)', ' '+h.lower())
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
            'referencia (§4.4-REPETIR)', aviso=True)

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
        'asier': 'ventas CON LO TECNICO AL LADO (la herramienta, el dato, el producto que el comercial vende), y sin pasarse de especifico: manda el alcance. NO vale un chiste de programacion puro',
        'mario': 'EXCEPCION: aqui la referencia SI puede ser de MARKETING Y CONTENIDO',
        'helena': 'EXCEPCION: aqui la referencia SI puede ser de ATENCION AL CLIENTE Y PARTNERSHIPS',
    }
    _c = (cuenta or '').strip().lower()
    if _c in _CARRIL:
        _exc = _c in ('mario', 'helena')
        chk(False, 'ENTREGA: la REFERENCIA es de VENTAS, y de que rincon',
            ('%s = %s. %s ⛔ SE COMPRUEBA EN EL GANCHO DEL ORIGINAL, no en el cuerpo ni en el '
             'headline del autor: la PRIMERA LINEA de la referencia tiene que llevar una palabra '
             'explicita del oficio (sales, sell, prospect, cold call, SDR, AE, deal, quota, '
             'pipeline, client, buyer, ventas, comercial, cliente, cuota). Si no esta, se '
             'descarta por buen chiste que sea: la gracia no viaja entre sectores, el formato si. '
             '⛔ Y NUESTRO GANCHO TIENE QUE RECORDAR AL SUYO: pon los dos uno al lado del otro y '
             'mira si se nota el parentesco; si no, no es un remix, es otro post. Y si la '
             'referencia no es del rincon de esta cuenta, se le da a la cuenta que si lo tiene y '
             'para esta se busca otra: cambiar de cuenta es gratis, forzar el encaje no '
             '(aboutme §2-CARRIL)')
            % (_c, _CARRIL[_c],
               '' if _exc else 'En los TRES JEFES la referencia nace SIEMPRE dentro de ventas, en cualquier idioma; lo que cambia con la cuenta es de que parte de ventas.'),
            aviso=True)

    if pilar == 'meme' and (cuenta or '').strip().lower() == 'unai':
        chk(meme_sobrio,
            'MEME en Unai: confirmado que NO es controversial (§4.4)',
            'Unai es el CEO y firma la casa. Un meme controversial ahi NO se publica: '
            'va a Iker, y si Iker ya tiene meme esa semana, a Asier. Si de verdad es '
            'sobrio, pasa --meme-sobrio y quedara constancia de que lo decidiste.')

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
                    choices=['mapa', 'los10', 'objeto', 'meme', 'leadmagnet', 'historia', 'entregable', 'evento', 'tarjeta'])
    ap.add_argument('--cuenta', default=None)
    ap.add_argument('--tarjeta', default=None, dest='tarjeta',
                    help='Fichero con el texto que va DENTRO de la tarjeta (pilar tarjeta). '
                         'Sin el no se puede comprobar la anatomia de 3 parrafos, que ES el '
                         'pilar, asi que su ausencia cuenta como fallo.')
    ap.add_argument('--meme-sobrio', action='store_true', dest='meme_sobrio',
                    help='Confirma que un meme para la cuenta de UNAI no es controversial. '
                         'Es controversial si CUALQUIERA de estas es que si: el chiste depende de '
                         'que alguien se crea que paso de verdad; hay un acto ridiculo o humillante '
                         'atribuido al que publica; alguien podria insultarnos por creerselo; hay '
                         'tacos, escatologia, sexo, politica o religion; se rie de un colectivo.')
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
    ap.add_argument('--generico', action='store_true',
                    help='Lead magnet modelo GENÉRICO (Martín Arosa/Guillermo): una palabra igual para '
                         'todos + recurso genérico + landing que captura. Salta el check del 2º dato.')
    a = ap.parse_args()
    texto = io.open(a.fichero, encoding='utf-8').read()
    card = io.open(a.tarjeta, encoding='utf-8').read() if a.tarjeta else None
    res = validar(texto, a.pilar, a.cuenta, a.generico, a.meme_sobrio, a.ref_fuera, a.remix, a.sin_menciones, card, a.solo_correo, a.historico, a.publica_manana)
    # Los avisos se imprimen pero NO cuentan: son sospechas, no infracciones.
    # Mezclarlos vaciaría de significado el marcador, y el marcador es lo único
    # que se pega en la entrega.
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
    sys.exit(0 if ok == len(duras) else 1)

if __name__ == '__main__':
    main()
