#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""Regresion del filtro de CARGO de scripts/menciones.py (CLAUDE.md, menciones: el cargo es
el primer filtro duro).

POR QUE EXISTE (2026-10-27): en un "Las 10" el filtro dio por buenos a un KAM, a un
"Gerente de cuentas" y a un "Purchase/Sales Manager", y en la lista de candidatos salian
directores de finanzas, riesgos y juridico como mencionables. Cada caso es un titular real
de esa entrega. Si uno de los NO pasa, o uno de los SI se cae, el filtro se ha roto.

USO:  python scripts/test-menciones-cargo.py
"""
import importlib.util
import os
import sys

AQUI = os.path.dirname(os.path.abspath(__file__))
_spec = importlib.util.spec_from_file_location('menciones', os.path.join(AQUI, 'menciones.py'))
m = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(m)

NO = [
    'Key Account Manager North EU and Middle East',
    'Gerente de cuentas',
    'Gerente de Cuenta',
    'Gerente de proyectos',
    'Gerente de gestión de proyectos',
    'Gerente de produccion',
    'Purchase/Sales Manager - Europe Sales Team',
    'Director Financiero Corporativo',
    'Directora de Asesoría Jurídica y Cumplimiento',
    'Director de Riesgos y Seguros Corporativos en GRUPO PROFAND',
    'Directora de Tesorería Corporativa',
    'Finance Director - Aquaculture Area',
    'Independent Non Executive Director',
    'Product Manager - Mariscos',
    'Especialista en ventas',
    'Asistente de dirección',
    'Export Manager',
    'Sales Manager',
    'Director Unidad de Negocio Data',
    'Directora de sostenibilidad',
]
SI = [
    'Presidente Ejecutivo en Corporación Hijos de Rivera S.L.',
    'CEO Y  CCO en Genesal Energy / Grupos Electrógenos / Generators',
    'Gerente general en Grupo Copo; Componentes de Vehiculos de Galicia S.A.',
    'Director General Cortizo LATAM/U.S.',
    'Director General Corporativo  - Corporate General Manager',
    'Consejero Delegado en Congalsa S.L.',
    'DIRECTOR GERENTE UNIDAD DE NEGOCIOS',
    'Director de exportaciones',
    'Director comercial',
    'Director de marketing',
    'Gerente',
    'Director en Talleres López',
]


def main() -> int:
    malos = 0
    for h in NO:
        s = m.score(h)
        if s:
            malos += 1
            print('AGUJERO  pasa y no deberia (%d): %s' % (s, h))
    for h in SI:
        if not m.score(h):
            malos += 1
            print('ROTO     se cae y deberia pasar: %s' % h)
    total = len(NO) + len(SI)
    print('\n%s' % ('✅ filtro de cargo: %d/%d casos bien' % (total, total) if not malos
                    else '❌ %d de %d casos mal' % (malos, total)))
    return 1 if malos else 0


if __name__ == '__main__':
    for _f in (sys.stdout, sys.stderr):
        if hasattr(_f, 'reconfigure'):
            _f.reconfigure(encoding='utf-8', errors='replace')
    sys.exit(main())
