#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Comprueba que metricas-brevo.py cuenta igual que el panel (metricasNewsletter.test.ts),
sobre el mismo fixture. Uso: python3 scripts/test-metricas-brevo.py"""
import importlib.util
import json
import os

AQUI = os.path.dirname(os.path.abspath(__file__))
spec = importlib.util.spec_from_file_location('metricas_brevo', os.path.join(AQUI, 'metricas-brevo.py'))
mb = importlib.util.module_from_spec(spec)
spec.loader.exec_module(mb)

with open(os.path.join(AQUI, '..', 'backend', 'src', 'services', 'fixtures', 'brevo-campana.json'), encoding='utf-8') as fh:
    f = json.load(fh)


def casi(a, b):
    return a is not None and abs(a - b) < 1e-9


m = mb.calcular_metricas(f['globalStats'], f['sentDate'], f['clics'])
assert m['enviados'] == 198, m
assert m['entregados'] == 194
assert m['rebotes'] == 4
assert m['bajas'] == 2
assert m['aperturas_reales'] == 50
assert casi(m['apertura_real'], 50 / 194)
assert m['personas'] == 2
assert m['personas_primer_minuto'] == 1
assert casi(m['clic'], 2 / 194)
assert casi(m['ctor'], 2 / 50)

# Una persona con varios clics cuenta una vez
dos = mb.calcular_metricas(f['globalStats'], f['sentDate'], [
    {'email': 'A@example.com', 'url': 'https://neety.com/a', 't': '2026-11-17T09:00:00Z'},
    {'email': 'a@example.com', 'url': 'https://neety.com/b', 't': '2026-11-17T09:05:00Z'},
])
assert dos['personas'] == 1

# Campana recien programada: nada de NaN ni 0 %
v = mb.calcular_metricas({'sent': 0, 'delivered': 0, 'uniqueViews': 0, 'appleMppOpens': 0}, '2026-11-24T08:05:00Z', [])
assert v['apertura_real'] is None and v['ctor'] is None and v['clic'] is None
assert v['aperturas_reales'] is None and v['personas'] == 0

# Las aperturas reales nunca bajan de cero
assert mb.calcular_metricas({'delivered': 10, 'uniqueViews': 3, 'appleMppOpens': 9}, f['sentDate'], [])['aperturas_reales'] == 0

assert mb.es_enlace_de_baja('https://x.r.sp1-brevo.net/unsubscribe/abc123')
assert mb.es_enlace_de_baja('https://x.brevo.net/preferences/abc')
assert not mb.es_enlace_de_baja('https://neety.com/demo')

print('OK: metricas-brevo.py cuenta como el panel')
