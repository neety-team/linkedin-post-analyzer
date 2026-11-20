/**
 * CALENDARIO POR MESES (2026-11-20): la lógica de fechas de la página Newsletter,
 * sin React para poder probarla. El mes va como «2026-12», los días como
 * «2026-12-01», y las semanas empiezan en lunes, como en España. Toda la cuenta
 * se hace en UTC para que el cambio de hora no mueva ningún día.
 */
import { ZONA } from './horaMadrid';

export interface DiaCalendario {
  /** «2026-11-30» */
  fecha: string;
  /** Número del día, 1-31. */
  dia: number;
  /** false si es de la semana del mes anterior o del siguiente. */
  delMes: boolean;
}

const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
const MESES_CORTOS = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sept', 'oct', 'nov', 'dic'];
const DIAS_LARGOS = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];

const dos = (n: number) => String(n).padStart(2, '0');
const aFecha = (t: number) => {
  const d = new Date(t);
  return `${d.getUTCFullYear()}-${dos(d.getUTCMonth() + 1)}-${dos(d.getUTCDate())}`;
};
const DIA_MS = 86_400_000;

/** «2026-12» con un mes de 01 a 12. */
export function esMes(s: string | null | undefined): s is string {
  const m = /^(\d{4})-(\d{2})$/.exec(s || '');
  return !!m && +m[2] >= 1 && +m[2] <= 12;
}

/** El día de hoy en Madrid, «2026-11-20». */
export function hoyMadrid(ahora: Date = new Date()): string {
  // en-CA da AAAA-MM-DD.
  return ahora.toLocaleDateString('en-CA', { timeZone: ZONA });
}

/** El mes de hoy en Madrid, «2026-11». */
export function mesDeHoy(ahora: Date = new Date()): string {
  return hoyMadrid(ahora).slice(0, 7);
}

/** El mes de `?m=`; si no vale, el de respaldo (el de hoy si no se da otro). */
export function mesDeParam(param: string | null | undefined, respaldo: string = mesDeHoy()): string {
  return esMes(param) ? param : respaldo;
}

/** El mes de una fecha «2026-12-03» → «2026-12»; null si no es una fecha. */
export function mesDeFecha(fecha: string | null | undefined): string | null {
  const m = /^(\d{4}-\d{2})-\d{2}$/.exec(fecha || '');
  return m && esMes(m[1]) ? m[1] : null;
}

/** El mes `delta` meses antes (negativo) o después. */
export function mesVecino(mes: string, delta: number): string {
  const [a, m] = mes.split('-').map(Number);
  const d = new Date(Date.UTC(a, m - 1 + delta, 1));
  return `${d.getUTCFullYear()}-${dos(d.getUTCMonth() + 1)}`;
}

/** «2026-12» → «Diciembre 2026». */
export function tituloMes(mes: string): string {
  const [a, m] = mes.split('-').map(Number);
  const nombre = MESES[m - 1];
  return `${nombre.charAt(0).toUpperCase()}${nombre.slice(1)} ${a}`;
}

/**
 * Las semanas que tocan el mes, de lunes a domingo: la primera empieza el lunes
 * de la semana del día 1 y la última acaba el domingo de la del último día.
 */
export function semanasDelMes(mes: string): DiaCalendario[][] {
  const [a, m] = mes.split('-').map(Number);
  const primero = Date.UTC(a, m - 1, 1);
  const ultimo = Date.UTC(a, m, 0);
  // getUTCDay: 0 domingo … 6 sábado. Días que hay que retroceder hasta el lunes.
  const atras = (new Date(primero).getUTCDay() + 6) % 7;
  const adelante = (7 - new Date(ultimo).getUTCDay()) % 7;
  const semanas: DiaCalendario[][] = [];
  for (let t = primero - atras * DIA_MS; t <= ultimo + adelante * DIA_MS; t += DIA_MS) {
    const d = new Date(t);
    if (!semanas.length || semanas[semanas.length - 1].length === 7) semanas.push([]);
    semanas[semanas.length - 1].push({
      fecha: aFecha(t),
      dia: d.getUTCDate(),
      delMes: d.getUTCMonth() === m - 1,
    });
  }
  return semanas;
}

/** «30 nov» de «2026-11-30». */
function diaCorto(fecha: string): string {
  const [, m, d] = fecha.split('-').map(Number);
  return `${d} ${MESES_CORTOS[m - 1]}`;
}

/** «Semana del 30 nov al 6 dic». */
export function etiquetaSemana(semana: DiaCalendario[]): string {
  return `Semana del ${diaCorto(semana[0].fecha)} al ${diaCorto(semana[semana.length - 1].fecha)}`;
}

/** «lunes 30 de noviembre» de «2026-11-30». */
export function diaLargo(fecha: string): string {
  const [a, m, d] = fecha.split('-').map(Number);
  return `${DIAS_LARGOS[new Date(Date.UTC(a, m - 1, d)).getUTCDay()]} ${d} de ${MESES[m - 1]}`;
}

/** Los correos por fecha y, dentro del día, por hora. Los que no tienen fecha, aparte. */
export function agruparPorFecha<T extends { fecha: string | null; hora: string | null }>(
  correos: T[],
): { porFecha: Map<string, T[]>; sinFecha: T[] } {
  const porFecha = new Map<string, T[]>();
  const sinFecha: T[] = [];
  for (const c of correos) {
    if (!c.fecha || !mesDeFecha(c.fecha)) {
      sinFecha.push(c);
      continue;
    }
    const lista = porFecha.get(c.fecha) || [];
    lista.push(c);
    porFecha.set(c.fecha, lista);
  }
  for (const lista of porFecha.values()) lista.sort((x, y) => (x.hora || '').localeCompare(y.hora || ''));
  return { porFecha, sinFecha };
}

/** El primer correo de hoy en adelante (por fecha y hora); null si no queda ninguno. */
export function proximoCorreo<T extends { fecha: string | null; hora: string | null }>(correos: T[], hoy: string): T | null {
  const futuros = correos.filter((c) => c.fecha && mesDeFecha(c.fecha) && c.fecha >= hoy);
  futuros.sort((x, y) => (x.fecha as string).localeCompare(y.fecha as string) || (x.hora || '').localeCompare(y.hora || ''));
  return futuros[0] || null;
}
