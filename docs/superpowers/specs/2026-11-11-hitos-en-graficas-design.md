# Hitos en las gráficas de seguidores e impresiones

**Fecha:** 2026-11-11 · **Estado:** aprobado para implementar

## Qué es

Una banderita en la gráfica el día en que una cuenta (o el conjunto de cuentas) cruza una cifra redonda. Al pasar el ratón por encima dice qué se consiguió y cuándo. Solo en dos gráficas: **Crecimiento de seguidores** e **Interacciones en el tiempo** cuando muestra impresiones. El resto de gráficas no cambia.

## Cada cuánto (calibrado con los datos reales del 11/11)

| Métrica | Umbrales | Por qué |
|---|---|---|
| Impresiones | cada **1.000.000** | El conjunto cruzó 1 M el 26/05, 2 M el 07/07, 3 M el 18/08 y 4 M el 18/10: uno cada mes y medio. Iker, 1 M el 06/06 y 2 M el 24/09; Unai, 1 M el 08/08. Con rangos de 30 días sale como mucho una banderita |
| Seguidores | **1.000 · 2.500 · 5.000 · 7.500 · 10.000** y después **cada 5.000** (15.000, 20.000…) | Iker cruzó 10.000 el 25/10; Unai está en 9.990 y Asier en 4.738, así que los dos tienen hito a la vista. Más fino satura; más grueso deja a las cuentas pequeñas sin ninguno |

## Reglas

1. **Impresiones acumuladas desde el primer dato, no desde el inicio del filtro.** La curva arranca en 0 al principio del rango (como LinkedIn), pero el hito es histórico: el 4.º millón cae donde el total desde siempre pasa de 4 M. Se usa la misma serie diaria que la gráfica (la oficial de LinkedIn en las cuentas conectadas y la fecha de publicación en las manuales), así que la banderita cae en un día real de la curva.
2. **Lo que ya estaba superado al empezar a medir no es un hito.** La serie de seguidores de Iker arranca en 7.053: no se pintan 1.000, 2.500 ni 5.000 ese primer día. Un umbral solo cuenta si un día está por debajo y otro posterior por encima.
3. **Seguidores, vista de todas las cuentas: los hitos de cada cuenta, no los de la suma.** La suma "cruzó" 25.000 el 21/08 por el alta de las cuentas manuales, no por crecer. En la vista conjunta salen los hitos individuales con el nombre (`Iker · 10.000 seguidores`). Las impresiones sí se suman: cada post lleva su fecha y la suma no tiene saltos.
4. **Solo aparece si el día del hito cae dentro del rango de fechas elegido.** En los dos modos (acumulado y diario).
5. **Respeta el interruptor de cuentas manuales.**

## Diseño visual

- Línea vertical fina y discontinua en el naranja de la marca (`accent`) a baja opacidad, de arriba abajo del área de la gráfica, en el día del hito.
- Arriba, una banderita: mástil corto y un banderín naranja con la cifra corta en el color sobre acento (`4M`, `10K`). Pequeña, sin tapar la curva.
- Al pasar el ratón, un tooltip con el estilo de los de la herramienta: `🏁 4.000.000 impresiones` · `entre todas las cuentas` o el nombre de la cuenta · la fecha completa.
- Si dos hitos caen el mismo día (dos cuentas), las banderitas se apilan con un pequeño desplazamiento.

## Arquitectura

- **Backend, lógica pura** `backend/src/services/hitos.ts`: `umbralesSeguidores(max)`, `umbralesImpresiones(max)` y `cruces(serie, umbrales)` → `[{ valor, dia }]`. Sin BD, con test.
- **Backend, endpoint** `GET /api/accounts/milestones?creator_id&include_manual` → `{ impresiones: Hito[], seguidores: Hito[] }`, con `Hito = { metrica, valor, dia, creatorId | null, creatorName | null }`. Calcula sobre todo el histórico con las mismas consultas que las gráficas.
- **Frontend, lógica pura** `frontend/src/utils/hitos.ts`: `hitosEnRango(hitos, inicio, fin)`, `cifraCorta(valor)` y `textoHito(hito)`. Con test.
- **Frontend, componente** `frontend/src/components/HitoFlag.tsx`: la banderita de Recharts (etiqueta de `ReferenceLine`) y su tooltip.
- **Integración** en `FollowerGrowthChart.tsx` y en `AccountsEngagementChart.tsx` (solo con la métrica de impresiones). Cada gráfica pide sus hitos al endpoint.

## Errores y bordes

- Si el endpoint falla, la gráfica se pinta igual, sin banderitas.
- Rangos de más de un año con días de etiqueta repetida: la banderita se coloca por el día exacto del dato, no por la etiqueta.
- Vista de un post colaborativo: sin hitos (la gráfica ya esconde lo que es de cuenta).

## Pruebas

- `cruces`: umbral superado antes del primer dato no cuenta; dos umbrales el mismo día; serie vacía; serie que baja y vuelve a subir (cuenta una vez, la primera).
- `hitosEnRango`: dentro, fuera y en los bordes del rango.
- En el navegador: rango del 01/10 al 11/11 de Iker (banderita de 10.000 el 25/10) y todas las cuentas en octubre (banderita de 4 M el 18/10).
