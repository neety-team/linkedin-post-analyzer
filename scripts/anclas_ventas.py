# -*- coding: utf-8 -*-
"""Perspectivas del ancla de ventas en el gancho (global §2.3-PERSPECTIVAS, 2026-10-27).

El ancla de ventas no se quita; lo que rota es la PERSPECTIVA desde la que se
ancla. Lo usan validar-post.py (aviso de entrega con la perspectiva del gancho)
y auditar-anclas.py (tabla por perspectiva y cuenta contra la BD).

Las familias se solapan a proposito: un gancho puede anclar por dos sitios
("subir en ventas pasa factura" es vender y marcador a la vez).
"""
import re

PERSPECTIVAS = [
    ('vendedor', 'el que vende (comercial, director comercial, vendedor)',
     r'\bcomercial(es)?\b|vendedor|jefe de ventas|director comercial'),
    ('ventas', 'vender / ventas, dicho tal cual',
     r'\bvend(er\w*|o|es|e|emos|í|ió|ido|iendo\w*|ía\w*)\b|\bventas?\b'),
    ('cliente', 'el cliente (cliente, cartera)',
     r'\bclientes?\b|\bcartera\b'),
    ('accion', 'la accion del dia (llamar, reunion, visita, feria, propuesta)',
     r'llam(ar|o|ada|adas|é|aba)\b|reuni[oó]n|visita|feria|propuesta|puerta fr[ií]a'),
    ('marcador', 'el marcador (pedido, factura, cuota, comision, contrato)',
     r'pedido|factur|cuota|comisi[oó]n|contrato|presupuesto'),
    ('exportar', 'exportar / mercado / pais',
     r'export|\bmercados?\b|\bpa[ií]s(es)?\b'),
    ('comprador', 'el que compra (comprador, el que firma o decide)',
     r'comprador|\bcompr(a|as|an|ó|aron)\b|el que firma|quien firma|\bdecide|decisor'),
    ('precio', 'el precio (precio, descuento, negociar)',
     r'precio|descuento|negoci|regate'),
    ('competencia', 'la competencia (competidor, compro a otro)',
     r'competencia|competidor|compr[oó] a otro|se fue con otro'),
    ('empresa', 'la empresa que vende (fabricante, fabrica, taller)',
     r'f[aá]bric|\btaller'),
]


def perspectivas(gancho):
    """Claves de las perspectivas que aparecen en el gancho, en el orden de la lista."""
    g = (gancho or '').lower()
    return [k for k, _, rx in PERSPECTIVAS if re.search(rx, g)]


def etiqueta(clave):
    return next((e for k, e, _ in PERSPECTIVAS if k == clave), clave)
