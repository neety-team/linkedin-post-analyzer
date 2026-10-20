#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""Regresion INVERSA del validador: borradores que Iker TUMBO, y el check que los tiene que cazar.

POR QUE EXISTE (2026-10-15). test-validador.py comprueba que ningun GANADOR falle por un
bug. Faltaba la otra mitad: que los borradores MALOS fallen. El 15/10 el validador dio
69/69 a ganchos de Unai que contaban la confesion entera ("nos confeso que le pidio a su
jefe licencias de otra empresa"): la regla del bucle abierto (global §2.0) estaba escrita
como un aviso fijo que salia siempre, no miraba el texto y no podia fallar.

Cada caso: un borrador real tumbado, el motivo de Iker y el nombre (o un trozo) del check
que DEBE salir en FALLA. Si un caso pasa en verde, el validador tiene un agujero.

USO:  python scripts/test-borradores-tumbados.py
"""
import io
import os
import subprocess
import sys
import tempfile

AQUI = os.path.dirname(os.path.abspath(__file__))

# Cuerpo de la historia de Unai del 15/10 (version aprobada), al que se le pega cada gancho.
CUERPO = """Contestó con la acreditación colgada.

Su empresa vive de la inteligencia artificial.
Y aun así buscaba clientes con filtros.

Como casi cualquier comercial.

No quería más filtros.
Quería decir de cada empresa si le sirve o no.
Y que con cada descarte la siguiente llegara mejor elegida.

Él no les ve los días contados.

Los ve más en la calle que en la oficina.
Con un audio al salir de cada visita, no con fichas.

Por eso su respuesta nos pesó tanto.

El miércoles 28 damos una sesión gratis por videollamada.

Un filtro no le dice al comercial quién firma dentro.
Ese nombre de dentro sí te lo enseñamos: https://luma.com/7hhyx07z?utm_source=historia-entrevista-15oct-unai&utm_medium=post&utm_campaign=historia-entrevista-15oct&utm_content=unai

Es @Telmo E. de @Multiverse Computing y nos lo contó en el evento Neety Forward.

Y le escribió a su jefe para probarnos con su equipo.

Lo que tiene los días contados es el filtro."""

FLAGS = ['--pilar', 'historia', '--cuenta', 'unai', '--historia-evento']

# (texto entero, motivo de Iker, trozo del nombre del check que DEBE fallar)
CASOS = [
    ('Vende inteligencia artificial y nos confesó que le pidió a su jefe licencias de otra empresa 👀\n\n' + CUERPO,
     '15/10: "me estas revelando la confesion, para que me voy a leer la publicacion"',
     'el gancho no CUENTA la respuesta'),
    ('Hasta quien vende IA nos confesó que busca clientes como cualquier comercial 👀\n\n' + CUERPO,
     '15/10: "ya me estas otra vez revelando la confesion"',
     'el gancho no CUENTA la respuesta'),
    ('Más que los aplausos, nos quedamos con lo que un ponente de ventas le escribió a su jefe 👀\n\n' + CUERPO,
     '15/10: "si dices nuestra mesa redonda, nuestro evento o nuestro ponente, ya la estamos fastidiando"',
     'el gancho no delata el EVENTO'),
    ('Le preguntamos a quien vende IA si los comerciales tienen los días contados 👀\n\n'
     + CUERPO.replace('Es @Telmo E. de @Multiverse Computing y nos lo contó en el evento Neety Forward.',
                      'Es @Telmo E. de @Multiverse Computing y nos lo contó en Neety Forward.'),
     '15/10: "estamos dando por hecho que Neety Forward lo conoce la gente"',
     'Neety Forward va con su categoria'),
    ('Le preguntamos a quien vende IA si los comerciales tienen los días contados 👀\n\n'
     + CUERPO.replace('\n\nLo que tiene los días contados es el filtro.', '')
             .replace('Y le escribió a su jefe para probarnos con su equipo.',
                      'Y le escribió a su jefe para probarnos con su equipo.\n\nNos lo contó en el evento Neety Forward, cuando enseñamos la herramienta nueva.'),
     '15/10: "no puede ser que la ultima linea sea la de desvelar el nombre del evento"',
     'la ultima linea es la moraleja'),
    ('Le preguntamos a quien vende IA si los comerciales tienen los días contados 👀\n\n'
     + CUERPO.replace('por videollamada', 'online'),
     '15/10: "online, yo quiero evitar siempre esos anglicismos"',
     'Sin anglicismos'),
    ('Le preguntamos a quien vende IA si los comerciales tienen los días contados 👀\n\n' + CUERPO,
     '15/10, Unai: "siendo nosotros una herramienta de ventas, puede ser peligroso que lo preguntemos nosotros"',
     'sin plantear que la IA sustituye'),
]

# Tarjeta de Asier del 15/10, primera version: dio 42/42 juzgando al cliente que paga poco.
# Iker: "no criticar a la gente con poder de decision que nos puede acabar comprando tiene
# que estar en los tres jefes". Cada caso lleva sus flags y el texto de DENTRO de la tarjeta.
TARJETA_ASIER = """Al cliente que regatea cada euro casi nunca se le elige.
Se le acepta porque llegó primero.

Y con la cuota encima nadie espera al que paga bien.

El miércoles 28 a las 10 hacemos una sesión gratis por videollamada.

Dar con el cliente que paga lleva meses a cualquiera.
Esos meses sí te enseñamos a recortarlos: https://luma.com/7hhyx07z?utm_source=tarjeta-cliente-15oct-asier&utm_medium=post&utm_campaign=tarjeta-cliente-15oct&utm_content=asier

El descuento de hoy suele ser la prisa de hace un mes."""
CARD_ASIER = """Querido comercial novato: cuanto menos paga un cliente, más problemas da.

Elige a quién le vendes antes de que el descuento lo elija por ti.

El cliente barato sale caro."""
FLAGS_TARJETA = ['--pilar', 'tarjeta', '--cuenta', 'asier']
CASOS += [
    (TARJETA_ASIER,
     '15/10: el texto juzga al cliente que regatea, y en la cuenta de un fundador se lee como burla al que compra',
     'Sin juicio negativo sobre el que COMPRA', FLAGS_TARJETA, None),
    (TARJETA_ASIER.replace('Al cliente que regatea cada euro casi nunca se le elige.\nSe le acepta porque llegó primero.',
                           'La venta con más descuento casi nunca se busca.\nSe acepta porque fue la primera en llegar.'),
     '15/10: la TARJETA dice "cuanto menos paga un cliente, mas problemas da" aunque el texto ya este limpio',
     'Sin juicio negativo sobre el que COMPRA', FLAGS_TARJETA, CARD_ASIER),
]


# "Las 10" de Aragon de Iker del 15/10, primera version: 84/84 en verde con el gancho
# reciclado del mapa de Asier (14/07: "jota, Pilar" y el cierzo) y Uruguay, que Iker ya
# habia usado en Murcia. Iker: "habra cosas mas conocidas de Aragon que el Pilar y el cierzo".
LAS10_ARAGON_V1 = 'A la sala de calderas del Pirineo la despachan con el Pilar, el cierzo y puerta. Y exporta más que Uruguay entero 👇\n\nPero sin esa sala no sale agua caliente en toda la casa.\n\nArriba solo se oye el viento.\nAbajo no se apaga nada en todo el año.\n\nY para quien se atreva a bajar, 3 números:\n\n1. 1,4 millones de personas venden fuera 15.615 millones de euros al año (Cámara de Comercio de Zaragoza e INE)\n2. Sri Lanka, con 16 veces más gente, se queda en 12.041 millones (Aduanas de Sri Lanka)\n3. Y 1.773 empresas firman casi el 97% de todo lo que sale fuera (Cámara de Comercio de Zaragoza)\n\nCon 16 veces menos gente que Sri Lanka, le vende al mundo un 30% más.\n\nEstas son 10 de las que tienen la caldera encendida y quién las lleva:\n\n→ @Saica Group - @Enrique de Yraolagoitia · 3.962 M€ en ventas\n→ @Grupo Lacasa - @Fernando Bellido · roza los 300 M€ de facturación\n→ @Mr. Brownie - @Jacqueline Páez Pérez · Premio Exportación Pyme de Aragón, en casi 90 países\n→ @KEPAR ELECTRONICA - @Sergio Andrés Aguilar · 18.000 balizas V16 al día\n→ @Libelium - @Alicia Asín Pérez · 11,8 M€, el mejor año de su historia\n\n→ @Certest Biotec, S.L. - @Nelson Fernandes · alianza con Almirall para nuevas terapias de ARNm\n→ @MAGAPOR - @Montse de Lorenzo Palomar · 24 M€ y ventas en más de 60 países\n→ @SCATI: Video Management Systems - @Miguel Ángel Gimeno Martín · Premio de Marketing Internacional de Aragón\n→ @Arvensis Agro - Fertilizantes ecológicos y nutrición vegetal - @Esteban Santirso · Premio a la Trayectoria Internacional de Aragón\n→ @Bodega ENATE - @Christian González Toledo DipWSET · Mejor Tinto Seco del Berliner Wein Trophy\n\nY a ninguna le llegaron los clientes por casualidad.\n\nEl miércoles 28 lo repasamos en directo y gratis.\n\nBuscar clientes de puerta en puerta no baja de meses.\nCómo ahorrarte esos meses, lo ves con nosotros: https://luma.com/7hhyx07z?utm_source=las10-aragon-15oct-iker&utm_medium=post&utm_campaign=las10-aragon-15oct&utm_content=iker\n\nY es fácil que ya tengas algo suyo en casa.\n\nEl brownie del café, desde Alfamén.\nLos Lacasitos de los críos, desde Utebo.\nLa baliza V16 de tu guantera, desde Zaragoza.\n\nY el tinto del sábado puede venir de Salas Bajas, en pleno Somontano.\n\nNo pagan las nóminas los cabezudos ni el cachirulo.\nNi el melocotón de Calanda.\n\nLas paga gente que arrancó con 3 personas en un local de 100 metros.\n\nY hoy saca una baliza cada 4 segundos.\n\nLas migas se cenan con uva.\nEn Fuendetodos nació Goya, que no es poco.\nY por el Tubo se tapea de pie y en Monegros hay desierto.\n\nLa sala de calderas del Pirineo es Aragón.\n\nDe Jaca a Alfamén, sin bajar la potencia ni en agosto.\n\nA la sala de calderas no baja nadie. Y es la única que no se apaga nunca.\n'
FLAGS_LAS10 = ['--pilar', 'las10', '--cuenta', 'iker']
CASOS += [
    (LAS10_ARAGON_V1, '15/10: cliches del gancho de Asier de Aragon repetidos al repetir region',
     'sin cliches del gancho anterior de esa region', FLAGS_LAS10, None),
    (LAS10_ARAGON_V1, '15/10: Uruguay ya lo uso Iker en Murcia (23/07)',
     'el pais no lo ha usado NUNCA esta cuenta', FLAGS_LAS10, None),
]
CASOS += [
    (TARJETA_ASIER.replace('Al cliente que regatea cada euro casi nunca se le elige.\nSe le acepta porque llegó primero.',
                           'La venta con más descuento casi nunca se busca.\nSe acepta porque fue la primera en llegar.'),
     '15/10: "¿desde cuando hacemos ganchos con dos lineas y sin salto de linea entre ellos?"',
     'GANCHO de UNA linea', FLAGS_TARJETA,
     CARD_ASIER.replace('cuanto menos paga un cliente, más problemas da', 'cuanto más descuento das, más problemas trae la venta')
               .replace('El cliente barato sale caro.', 'La venta barata sale cara.')),
    ('La venta con más descuento casi nunca se busca.\n\n' + TARJETA_ASIER.split('\n\n', 1)[1].replace(
        'Dar con el cliente que paga lleva meses a cualquiera.', 'Dar con quien compra sin descuento lleva meses.'),
     '15/10: "Querido comercial novato" se percibe como critica total al novato',
     'Sin etiqueta que rebaje al comercial', FLAGS_TARJETA,
     CARD_ASIER.replace('cuanto menos paga un cliente, más problemas da', 'cuanto más descuento das, más problemas trae la venta')
               .replace('El cliente barato sale caro.', 'La venta barata sale cara.')),
]

# Historia/evento de Asier del 16/10 (ponente en el evento Neety Forward). Iker tumbo dos
# ganchos el 15/10: "nunca habia vendido nada" es mentira (llevan 3-4 anos con la empresa)
# y Asier, como Unai, no se hace de menos en publico ("nunca habia rezado", "nunca habia
# pensado"). brand-voice §1b, ASIER TAMBIEN VA GRANDIOSO.
CUERPO_ASIER = """La primera vez fue con algo que llevaba meses construyendo.

Y me llevé la lección de cualquier comercial.

No me costó explicar lo que hace.
Me costó saber quién de los que escuchaban podía comprarlo.

Lo que enseñé hace eso por el comercial.

Pocas empresas, de la que más encaja a la que menos.
Cada una con su porqué y con quien decide dentro.
Ninguna entra sin que el comercial la apruebe.

Lo que descarta, la herramienta lo aprende.

Lo primero que enseñé fue esa herramienta nueva, @Neety.

La presenté con @Angela Brook Uria en el evento Neety Forward.

El miércoles 28 lo desgranamos gratis y por videollamada.

Buscando a mano no hay comercial con tiempo de vender.
Ese tiempo sí te decimos cómo recuperarlo: https://luma.com/7hhyx07z?utm_source=historia-ponente-16oct-asier&utm_medium=post&utm_campaign=historia-ponente-16oct&utm_content=asier

Programar es más fácil que saber a quién vendérselo."""
FLAGS_ASIER = ['--pilar', 'historia', '--cuenta', 'asier', '--historia-evento']
CASOS += [
    ('Llevo años programando para comerciales y nunca había vendido nada yo 😅\n\n' + CUERPO_ASIER,
     '15/10: "¿como vamos a decir que nunca han vendido nada?" Lleva 3-4 anos de socio',
     'no se dice que nunca ha vendido', FLAGS_ASIER),
    ('Nunca había rezado tanto para que saliera bien una demo de ventas 🙏\n\n' + CUERPO_ASIER,
     '15/10: "siendo jefes, publicamente no quieren dar a entender cosas como nunca habia rezado"',
     'el gancho no se hace de menos', FLAGS_ASIER),
    # 16/10: la v1 aprobada salio en verde con 6 sueltas seguidas (77% de sueltas) porque
    # el check de ciclo empujaba a "meter lineas sueltas seguidas" y no habia techo.
    ("""Nunca vi a un comercial vender más por tener más empresas 👇

Lo comprobé en años programando para los que venden.

Les sobran nombres.
Les falta saber por cuál empezar.

Por eso la herramienta nueva la programé al revés.

Pocas empresas, de la que más encaja a la que menos.
Cada una con su porqué y con quien decide dentro.
Ninguna entra sin que el comercial la apruebe.

Lo que descarta, la herramienta lo aprende.

El comercial decide siempre y nosotros le quitamos el trabajo de buscar.

Vender más nunca dependió de tener más empresas.

Esa herramienta nueva es @Neety.

La presenté con @Angela Brook Uria en el evento Neety Forward.

El miércoles 28 lo desgranamos gratis y por videollamada.

La empresa ya la conoces, la persona que compra ahí no.
Esa persona sí te decimos cómo dar con ella: https://luma.com/7hhyx07z?utm_source=historia-ponente-16oct-asier&utm_medium=post&utm_campaign=historia-ponente-16oct&utm_content=asier

Un comercial con menos empresas llama mejor.""",
     '16/10: "me sorprende que hayas fallado en eso… demasiadas lineas individuales"',
     'como mucho 4 sueltas seguidas', FLAGS_ASIER),
    ('Nunca he visto a un comercial vender más por tener más empresas 👇\n\n' + CUERPO_ASIER.replace(
        'La presenté con @Angela Brook Uria', 'La nueva @Neety la presenté con @Angela Brook Uria'),
     '16/10: "creo que lo dicen en masculino, es el nuevo Neety"',
     'NEETY va en masculino', FLAGS_ASIER),
]


# Misma pieza, v2 del 16/10: "jamon de Teruel" en el gancho. Iker: "al decir jamon de
# Teruel, Teruel, ya sabemos que es Aragon". Un toponimo destapa la region antes del reveal.
LAS10_ARAGON_V2 = 'A la sala de calderas del Pirineo la despachan con jamón de Teruel, esquí y puerta. Y exporta más que Sri Lanka entera 👇\n\nPero sin esa sala no sale agua caliente en toda la casa.\n\nArriba solo se oye el viento.\nAbajo no se apaga nada en todo el año.\n\nY para quien se atreva a bajar, 3 números:\n\n1. 1,4 millones de personas venden fuera 15.615 millones de euros al año (Cámara de Comercio de Zaragoza e INE)\n2. Sri Lanka, con 16 veces más gente, se queda en 12.041 millones (Aduanas de Sri Lanka)\n3. Y 1.773 empresas firman casi el 97% de todo lo que sale fuera (Cámara de Comercio de Zaragoza)\n\nCon 16 veces menos gente que Sri Lanka, le vende al mundo un 30% más.\n\nEstas son 10 de las que tienen la caldera encendida y quién las lleva:\n\n→ @Saica Group - @Enrique de Yraolagoitia · 3.962 M€ en ventas\n→ @Grupo Lacasa - @Fernando Bellido · roza los 300 M€ de facturación\n→ @Mr. Brownie - @Jacqueline Páez Pérez · Premio Exportación Pyme de Aragón, en casi 90 países\n→ @KEPAR ELECTRONICA - @Sergio Andrés Aguilar · 18.000 balizas V16 al día\n→ @Libelium - @Alicia Asín Pérez · 11,8 M€, el mejor año de su historia\n\n→ @Certest Biotec, S.L. - @Nelson Fernandes · alianza con Almirall para nuevas terapias de ARNm\n→ @MAGAPOR - @Montse de Lorenzo Palomar · 24 M€ y ventas en más de 60 países\n→ @SCATI: Video Management Systems - @Miguel Ángel Gimeno Martín · Premio de Marketing Internacional de Aragón\n→ @Arvensis Agro - Fertilizantes ecológicos y nutrición vegetal - @Esteban Santirso · Premio a la Trayectoria Internacional de Aragón\n→ @Bodega ENATE - @Christian González Toledo DipWSET · Mejor Tinto Seco del Berliner Wein Trophy\n\nY a ninguna le llegaron los clientes por casualidad.\n\nEl miércoles 28 lo repasamos en directo y gratis.\n\nLa puerta de cada empresa la encuentra cualquiera.\nQuién compra tras esa puerta, lo ves con nosotros: https://luma.com/7hhyx07z?utm_source=las10-aragon-16oct-iker&utm_medium=post&utm_campaign=las10-aragon-16oct&utm_content=iker\n\nY es fácil que ya tengas algo suyo en casa.\n\nEl brownie del café, desde Alfamén.\nLos Lacasitos de los críos, desde Utebo.\nLa baliza V16 de tu guantera, desde Zaragoza.\n\nY el tinto del sábado puede venir de Salas Bajas, en pleno Somontano.\n\nNo pagan las nóminas los cabezudos ni el cachirulo.\nNi el melocotón de Calanda.\n\nLas paga gente que arrancó con 3 personas en un local de 100 metros.\n\nY hoy saca una baliza cada 4 segundos.\n\nLas migas se cenan con uva.\nEn Fuendetodos nació Goya, que no es poco.\nY por el Tubo se tapea de pie y en Monegros hay desierto.\n\nLa sala de calderas del Pirineo es Aragón.\n\nDe Jaca a Alfamén, sin bajar la potencia ni en agosto.\n\nA la sala de calderas no baja nadie. Y es la única que no se apaga nunca.\n'
CASOS += [
    (LAS10_ARAGON_V2, '16/10: Teruel en el gancho rompe el bucle abierto del peloteo',
     'sin topónimos ni gentilicios de la region', FLAGS_LAS10, None),
]


# AGRADECIMIENTO DE UNAI (20/10). Unai tumbo el ninja al webinar en su post del Gipuzkoako
# Inbertsio Foroa: los mencionados verian que les usamos de escaparate. Con --agradecimiento,
# cualquier enlace es fallo duro.
INBERTSIO_CON_NINJA = """Pocas veces hemos visto a un director comercial esperar tanto para enseñar su mejor máquina 👇

Pasó 7 meses buscando a quién enseñársela.

Por las tardes hacía la lista a mano.
Por las mañanas llamaba a centralitas.

Hasta que le sentaron con 3 fábricas interesadas.

Una pidió precio.
Otra pidió una visita.
La tercera firmó en 15 días.

El miércoles 28 abrimos sesión gratis por videollamada.

Enseñar la máquina es fácil, buscar a quién no.
Esa búsqueda sí te ayudamos a acortarla: https://luma.com/7hhyx07z?utm_source=historia-inbertsio-20oct-unai&utm_medium=post&utm_campaign=historia-inbertsio-20oct&utm_content=unai

Con la inversión pasa igual.

Por eso pesa tanto el Gipuzkoako Inbertsio Foroa, el foro de inversión de aquí.

Une capital y proyectos.
Lleva inversión a nuestras empresas.
Y hace crecer el territorio con impacto directo.

Gracias a @ADEGI - Asociación de Empresas de Gipuzkoa y a @GEROA PENTSIOAK EPSV DE EMPLEO PREFERENTE por organizarlo.

Ni una máquina ni un proyecto se venden solos."""
CASOS += [
    (INBERTSIO_CON_NINJA, '20/10: un agradecimiento de Unai va sin spam ninja (brand-voice §1b)',
     'AGRADECIMIENTO: sin spam ninja', FLAGS + ['--agradecimiento']),
]

def main() -> int:
    agujeros = 0
    for caso in CASOS:
        texto, motivo, debe = caso[:3]
        flags = caso[3] if len(caso) > 3 else FLAGS
        card = caso[4] if len(caso) > 4 else None
        with tempfile.NamedTemporaryFile('w', suffix='.txt', delete=False, encoding='utf-8') as f:
            f.write(texto)
            ruta = f.name
        extra = []
        if card:
            with tempfile.NamedTemporaryFile('w', suffix='.txt', delete=False, encoding='utf-8') as f:
                f.write(card)
                ruta_card = f.name
            extra = ['--tarjeta', ruta_card]
        out = subprocess.run([sys.executable, os.path.join(AQUI, 'validar-post.py'), ruta] + flags + extra,
                             capture_output=True, text=True, encoding='utf-8').stdout or ''
        os.unlink(ruta)
        if card:
            os.unlink(ruta_card)
        cazado = any(l.startswith('  FALLA') and debe.lower() in l.lower() for l in out.splitlines())
        print(('OK      ' if cazado else 'AGUJERO ') + texto.split('\n')[0][:70])
        if not cazado:
            agujeros += 1
            print('        no salio FALLA en "%s" · %s' % (debe, motivo))
    print('\n%s' % ('✅ el validador caza los %d borradores tumbados' % len(CASOS) if not agujeros
                    else '❌ %d de %d borradores tumbados pasan en verde' % (agujeros, len(CASOS))))
    return 1 if agujeros else 0


if __name__ == '__main__':
    for _f in (sys.stdout, sys.stderr):
        if hasattr(_f, 'reconfigure'):
            _f.reconfigure(encoding='utf-8', errors='replace')
    sys.exit(main())
