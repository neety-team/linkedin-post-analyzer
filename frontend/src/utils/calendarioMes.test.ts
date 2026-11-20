// Test de la lógica del calendario por meses de la newsletter. Sin runner en el
// frontend, se corre con el tsx del backend:
//   cd backend && npx tsx ../frontend/src/utils/calendarioMes.test.ts
import assert from 'node:assert/strict';
import {
  agruparPorFecha,
  diaLargo,
  esMes,
  etiquetaSemana,
  hoyMadrid,
  mesDeFecha,
  mesDeHoy,
  mesDeParam,
  mesVecino,
  semanasDelMes,
  tituloMes,
} from './calendarioMes';

// Diciembre de 2026 empieza en martes: la primera fila arranca el lunes 30 de noviembre.
const dic = semanasDelMes('2026-12');
assert.equal(dic[0][0].fecha, '2026-11-30');
assert.equal(dic[0][0].delMes, false);
assert.equal(dic[0][1].fecha, '2026-12-01');
assert.equal(dic[0][1].delMes, true);
assert.equal(dic.length, 5);
assert.ok(dic.every((s) => s.length === 7));
// Acaba el jueves 31: la última fila llega al domingo 3 de enero.
assert.equal(dic[4][3].fecha, '2026-12-31');
assert.equal(dic[4][6].fecha, '2027-01-03');
assert.equal(dic[4][6].delMes, false);
assert.equal(etiquetaSemana(dic[0]), 'Semana del 30 nov al 6 dic');

// Febrero de 2027 empieza en lunes y tiene 28 días: cuatro filas justas.
const feb = semanasDelMes('2027-02');
assert.equal(feb.length, 4);
assert.equal(feb[0][0].fecha, '2027-02-01');
assert.equal(feb[3][6].fecha, '2027-02-28');
assert.ok(feb.flat().every((d) => d.delMes));

// Noviembre de 2026 empieza en domingo: seis filas, la primera desde el lunes 26 de octubre.
const nov = semanasDelMes('2026-11');
assert.equal(nov.length, 6);
assert.equal(nov[0][0].fecha, '2026-10-26');
assert.equal(nov[0][6].fecha, '2026-11-01');
assert.equal(nov[5][0].fecha, '2026-11-30');
assert.equal(nov[5][6].fecha, '2026-12-06');
// Marzo de 2026 cruza el cambio de hora sin perder ni repetir días.
const marzo = semanasDelMes('2026-03').flat().filter((d) => d.delMes);
assert.equal(marzo.length, 31);
assert.equal(new Set(marzo.map((d) => d.fecha)).size, 31);

// Meses vecinos, con cambio de año.
assert.equal(mesVecino('2026-12', 1), '2027-01');
assert.equal(mesVecino('2027-01', -1), '2026-12');
assert.equal(mesVecino('2026-11', 0), '2026-11');
assert.equal(mesVecino('2026-03', -14), '2025-01');

// `?m=` que no vale cae al respaldo.
assert.equal(mesDeParam('2026-12', '2026-11'), '2026-12');
assert.equal(mesDeParam('2026-13', '2026-11'), '2026-11');
assert.equal(mesDeParam('2026-00', '2026-11'), '2026-11');
assert.equal(mesDeParam('diciembre', '2026-11'), '2026-11');
assert.equal(mesDeParam('2026-1', '2026-11'), '2026-11');
assert.equal(mesDeParam(null, '2026-11'), '2026-11');
assert.equal(mesDeParam('', '2026-11'), '2026-11');
assert.equal(esMes('2026-12'), true);
assert.equal(esMes('2026-12-01'), false);

// Hoy en Madrid: el 31/12 a las 23:30 UTC ya es 1 de enero allí.
assert.equal(hoyMadrid(new Date('2026-12-31T23:30:00Z')), '2027-01-01');
assert.equal(mesDeHoy(new Date('2026-12-31T23:30:00Z')), '2027-01');
assert.equal(mesDeHoy(new Date('2026-11-20T10:00:00Z')), '2026-11');

assert.equal(mesDeFecha('2026-12-03'), '2026-12');
assert.equal(mesDeFecha(null), null);
assert.equal(mesDeFecha('2026-13-01'), null);
assert.equal(tituloMes('2026-12'), 'Diciembre 2026');
assert.equal(tituloMes('2027-02'), 'Febrero 2027');
assert.equal(diaLargo('2026-11-30'), 'lunes 30 de noviembre');

// Agrupar: por fecha, ordenados por hora; sin fecha aparte.
const { porFecha, sinFecha } = agruparPorFecha([
  { id: 'b', fecha: '2026-12-01', hora: '11:00' },
  { id: 'a', fecha: '2026-12-01', hora: '09:05' },
  { id: 'c', fecha: '2026-12-03', hora: null },
  { id: 'd', fecha: null, hora: '09:00' },
  { id: 'e', fecha: 'mañana', hora: null },
]);
assert.deepEqual(porFecha.get('2026-12-01')?.map((c) => c.id), ['a', 'b']);
assert.deepEqual(porFecha.get('2026-12-03')?.map((c) => c.id), ['c']);
assert.deepEqual(sinFecha.map((c) => c.id), ['d', 'e']);

console.log('calendarioMes: ok');
