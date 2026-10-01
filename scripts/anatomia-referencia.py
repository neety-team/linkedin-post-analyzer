# -*- coding: utf-8 -*-
"""Mide la ANATOMIA de la referencia y la del remix, para calcarla con numeros.

    python scripts/anatomia-referencia.py original.txt mio.txt

Por que existe (Iker, 2026-08-06): al remixar el meme de Daniel Disney copie el
tema y el motor, pero no MEDI la referencia. Resultado:

    ORIGINAL  hook 34 car | 1 frase  | emoji 🤣
    EL MIO    hook 62 car | 2 frases | emoji 👇     <- el doble de largo

Iker: *"no puede ser que el gancho original sea tan corto con un emoji de risa
y el nuestro sea el doble de largo, dos frases en vez de una, y el emoji de la
mano en vez del suyo. Todo lo queremos validar en datos. En las referencias
igual: analiza su ritmo, su lenguaje, sus conjugaciones, su longitud, sus
emojis, todo. Y copiamos y mejoramos."*

QUE SE MIDE Y COMO SE USA:
  - LONGITUD DEL HOOK. El ingles dice lo mismo con menos, asi que se admite un
    margen, pero no el DOBLE. Si el suyo son 34 caracteres, el nuestro no puede
    irse a 62.
  - NUMERO DE FRASES DEL HOOK. Una frase es una frase. Partirla en dos cambia el
    ritmo y se pierde el golpe seco del original.
  - EMOJI DEL HOOK. Si el suyo lleva 🤣, el nuestro lleva 🤣. Cambiarlo por 👇
    es cambiar la promesa: la risa anuncia broma, la mano anuncia lista.
  - DONDE VIVE CADA EMOJI. En este original el 👇 esta en el CIERRE, no en el
    hook. Copiar el 👇 al hook es ponerlo donde el original no lo puso.
  - LONGITUD TOTAL Y NUMERO DE BLOQUES. Si el suyo tiene 1.289 caracteres y 17
    bloques y el nuestro 773 y 9, nos hemos dejado media publicacion.
  - RITMO DE BLOQUES. El nuestro deberia ser MEJOR que el suyo, no mas pobre:
    ahi si le ganamos siempre (bloques de 2 y 3 en escalera, lineas sueltas).

LO QUE NO SE CALCA, y se dice en la entrega para que sea una decision y no un
descuido: el CIERRE. El suyo remata con una pregunta + 👇; el nuestro remata con
un bold statement porque asi lo pide `global §4.5` (un solo CTA, y el hueco del
CTA ya lo ocupa el spam ninja).
"""
import io
import os
import re
import sys

EMOJI = r'[\U0001F000-\U0001FAFF☀-➿←-⇿]'


def anatomia(texto, nombre):
    t = texto.strip()
    bs = [b.split('\n') for b in t.split('\n\n')]
    hook = bs[0][0]
    frases = len([x for x in re.split(r'[.!?]+', hook) if x.strip()])
    out = [
        '%-9s hook: %2d car | %d frase(s) | emoji del hook: %s'
        % (nombre, len(hook), frases, ''.join(re.findall(EMOJI, hook)) or '-'),
        '          post: %4d car | %2d bloques | ritmo %s'
        % (len(t), len(bs), '-'.join(str(len(b)) for b in bs)),
        '          emojis del post: %s'
        % (''.join(dict.fromkeys(re.findall(EMOJI, t))) or '-'),
        '          cierre: %s' % bs[-1][-1][:62],
    ]
    return '\n'.join(out)



# ---------------------------------------------------------------- ESENCIA ---
#
# Por que existe (Iker, 2026-08-11): este script media la FORMA -longitud,
# frases, emojis, ritmo- y no median la ESENCIA. Con eso se puede calcar un
# meme entero y perder el chiste, que es justo lo que paso con el de Lauren
# Vilips: copie su estructura y tire su concepto -"you're not saving lives"-,
# asi que la imagen tenia un medico y ningun texto explicaba por que.
#
# El metodo es de Iker, y es rapidisimo: *"yo sobre todo pillo las esencias con
# los VERBOS. Lo de salvar vidas es un concepto y un verbo punchy, por eso se
# hace viral: es un concepto original, exagerado, controversial, una metafora"*.
#
# Asi que el script hace lo unico que puede hacer una maquina aqui -sacar los
# candidatos y obligar a nombrarlos-. Decidir cual es el concepto sigue siendo
# criterio, pero ya no se puede saltar sin darse cuenta.

# Verbos en infinitivo o conjugados en las formas que aparecen en un gancho.
# No es un analizador morfologico: es una red para pescar candidatos y que el
# ojo humano elija. Falsos positivos incluidos a proposito.
_VERBO = re.compile(
    r"\b\w+(?:ar|er|ir|as|es|an|en|a|e|o|amos|emos|imos|aste|iste|"
    r"ando|iendo|ado|ido|ing|ed)\b", re.I)

_VACIAS = {
    'the', 'you', 'your', 'not', 'are', 'and', 'for', 'que', 'los', 'las',
    'una', 'uno', 'con', 'por', 'del', 'este', 'esta', 'como', 'mas', 'pero',
    'sus', 'nos', 'ese', 'eso', 'todo', 'toda', 'muy', 'sin',
    # OJO: aqui NO van palabras con carga. La primera version excluia `work` y
    # `lives`, que son EXACTAMENTE las dos que hacen el chiste del meme de
    # Vilips, asi que el extractor devolvia "ninguno claro" sobre el gancho
    # mas facil de leer que teniamos. Aqui solo van conectores y los nombres
    # del sector, que nunca son el chiste.
    'ventas', 'marketing', 'comercial', 'cliente', 'clientes',
}


def esencia(texto):
    hook = texto.strip().split('\n')[0]
    cand = [p for p in _VERBO.findall(hook) if p.lower() not in _VACIAS and len(p) > 3]
    return [
        'PASO 1 de 2 · LA IDEA — y es el importante (Iker, 2026-08-11):',
        '  "primero se capta la esencia de la IDEA; el paso dos es la esencia del',
        '   FORMATO, del gancho y del cuerpo. Las dos cosas, pero lo primero y lo',
        '   mas importante es la idea." Un remix con el formato perfecto y la idea',
        '   perdida es el meme de otro vaciado; al reves todavia se salva.',
        '',
        'Responde a las 4 ANTES de escribir nada:',
        '',
        '  gancho: %s' % hook[:110],
        '  posibles verbos: %s' % (', '.join(dict.fromkeys(cand)) or '(ninguno claro)'),
        '',
        '  1. ¿Cual es el VERBO que hace el chiste? Es donde vive casi siempre.',
        '  2. ¿Cual es el CONCEPTO? Tiene que ser una de estas cuatro cosas, y si',
        '     no lo es, probablemente no has dado con el: original, exagerado,',
        '     controversial o una metafora. ("salvar vidas" es metafora + exageracion)',
        '  3. ¿Donde VIVE ese concepto en la referencia: en el texto, en la imagen',
        '     o en los dos? Si esta en los dos, nosotros lo dejamos SOLO en la',
        '     imagen y ganamos un hueco (images §2d).',
        '  4. ¿Que hace en el dibujo cada elemento cargado (un medico, una camilla,',
        '     un tiburon)? Si alguno no lo recoge ningun texto nuestro, la',
        '     referencia esta calcada por fuera y vacia por dentro.',
        '',
    ]


if __name__ == '__main__':
    # La consola de Windows es cp1252 y el post lleva emojis: sin esto el
    # script peta con UnicodeEncodeError a mitad de la salida (01/10).
    for _f in (sys.stdout, sys.stderr):
        try:
            _f.reconfigure(encoding='utf-8', errors='replace')
        except Exception:
            pass
    if len(sys.argv) < 3:
        sys.exit(__doc__)
    original = io.open(sys.argv[1], encoding='utf-8').read()
    for linea in esencia(original):
        print(linea)
    print('PASO 2 de 2 · EL FORMATO — solo despues de haber respondido arriba:')
    print()
    for nom, ruta in [('ORIGINAL', sys.argv[1]), ('EL MIO', sys.argv[2])]:
        print(anatomia(io.open(ruta, encoding='utf-8').read(), nom))
        print()
