// LA CURVA DE IMPRESIONES ENTRE DOS LECTURAS (Iker, 2026-10-05).
//
// EL PROBLEMA: en una cuenta MANUAL las impresiones solo existen cuando alguien
// las copia de LinkedIn a mano. Entre medias, el monitor saca un snapshot cada
// 15 min-24h con likes y comentarios, y hasta hoy le ARRASTRABA la ultima cifra
// de impresiones tecleada. La grafica dibujaba asi una meseta y un acantilado:
// el post de Mario del 02/10 se quedaba en 102 durante 65 horas y saltaba a
// 3.766 en una. Esa meseta tambien es inventada: dice que nadie vio el post en
// tres dias.
//
// LO QUE HACE ESTO: separa las LECTURAS de verdad de las copias y, entre dos
// lecturas, ESTIMA el valor de cada snapshot. Antes de la primera lectura y
// despues de la ultima no estima nada (null). El frontend marca las lecturas
// con un punto, asi que se ve que es dato y que es estimacion.
//
// POR QUE ESTA FORMULA Y NO OTRA. Se midio el 05/10 sobre 60 posts de las
// cuentas conectadas (Iker, Unai, Asier), que tienen impresiones REALES en cada
// snapshot: se quitaron los puntos intermedios y se compararon los metodos con
// el valor real. Error mediano (media):
//
//                         escalon      lineal      likes       MEDIA(lin, likes)
//   lecturas 0.3/4/20/67h 38% (43%)    9% (15%)    7% (21%)    6% (15%)
//   solo 0.3h y 67h       93% (87%)   52% (54%)   20% (58%)   19% (36%)
//   1/24/48/72h           66% (57%)   19% (30%)    9% (23%)    8% (19%)
//   0.3/1/2/4/8/24h       24% (27%)    4% (5%)     8% (11%)    5% (7%)
//
// El escalon (lo de antes) es el peor siempre. Lineal en el tiempo va bien con
// lecturas juntas y fatal con lecturas lejanas, porque un post gana casi todo
// su alcance el primer dia. Proporcional a los likes acierta la forma pero se
// pasa a veces (el like del equipo llega antes que las impresiones). La media
// de los dos es la unica que gana o empata en los cuatro casos sin colas
// largas. Probado tambien: tiempo logaritmico (colas del 200%) y engagement
// ponderado (algo peor que solo likes).
//
// UNA COPIA, en cuenta manual, es una cifra IGUAL a la ultima lectura: el
// arrastre del monitor, volver a pegar la URL sin teclear impresiones o guardar
// el formulario cambiando solo los clics. Se compara con la ultima LECTURA y no
// con la fila anterior, porque desde hoy el monitor ya escribe null entre dos
// lecturas. Lo unico que se pierde es releer a mano exactamente la misma cifra,
// que no pasa: las impresiones no se paran en seco. En una cuenta CONECTADA cada
// cifra es una lectura de Unipile, y una repetida es un post que ya no crece.

export interface LecturaCurva {
  ageMin: number;
  impressions: number | null;
  likes: number;
}

export interface ImpresionCurva {
  // La lectura, la estimacion o null si no hay dos lecturas que la encierren.
  impressions: number | null;
  estimated: boolean;
}

export function curvaImpresiones(lecturas: LecturaCurva[], esManual: boolean): ImpresionCurva[] {
  const orden = lecturas.map((_, i) => i).sort((a, b) => lecturas[a].ageMin - lecturas[b].ageMin);
  const salida: ImpresionCurva[] = lecturas.map(() => ({ impressions: null, estimated: false }));

  // Likes acumulados (el maximo hasta ese momento): un like quitado no debe
  // hacer bajar la curva estimada.
  const likesAcum: number[] = [];
  let maxLikes = 0;
  for (const i of orden) {
    maxLikes = Math.max(maxLikes, Number(lecturas[i].likes) || 0);
    likesAcum.push(maxLikes);
  }

  // Posiciones (dentro de `orden`) que son lectura de verdad.
  const reales: number[] = [];
  let ultima: number | null = null;
  orden.forEach((i, pos) => {
    const v = lecturas[i].impressions;
    if (v == null) return;
    if (esManual && ultima !== null && Number(v) === ultima) return;
    reales.push(pos);
    ultima = Number(v);
  });

  for (const pos of reales) {
    salida[orden[pos]] = { impressions: Number(lecturas[orden[pos]].impressions), estimated: false };
  }

  for (let k = 0; k < reales.length - 1; k++) {
    const a = reales[k];
    const b = reales[k + 1];
    const la = lecturas[orden[a]];
    const lb = lecturas[orden[b]];
    const ia = Number(la.impressions);
    const ib = Number(lb.impressions);
    const dt = lb.ageMin - la.ageMin;
    const dl = likesAcum[b] - likesAcum[a];
    for (let pos = a + 1; pos < b; pos++) {
      const p = lecturas[orden[pos]];
      const fracT = dt > 0 ? (p.ageMin - la.ageMin) / dt : 0.5;
      const fracL = dl > 0 ? (likesAcum[pos] - likesAcum[a]) / dl : fracT;
      salida[orden[pos]] = {
        impressions: Math.round(ia + (ib - ia) * ((fracT + fracL) / 2)),
        estimated: true,
      };
    }
  }

  return salida;
}

// ─── Banda tipica (p25-p75 de los otros posts de la cuenta a la misma edad) ───
//
// Antes salia de un SQL que hacia COALESCE(impresiones, 0): un snapshot sin
// lectura contaba como 0 y las copias del arrastre como lectura, asi que la
// banda de una cuenta manual heredaba las mesetas y los acantilados de sus
// otros posts. Ahora cada post pasa por curvaImpresiones antes de agruparse,
// y un snapshot sin lectura ni estimacion no cuenta para las impresiones.

export interface SnapshotTipico {
  postId: string;
  ageMin: number;
  impressions: number | null;
  likes: number;
  comments: number;
  reposts: number;
}

export interface TramoTipico {
  ageMin: number;
  sampleCount: number;
  sampleCountImp: number;
  p25Imp: number | null;
  p50Imp: number | null;
  p75Imp: number | null;
  p25Eng: number;
  p50Eng: number;
  p75Eng: number;
}

const VENTANA_TIPICA_MIN = 7 * 24 * 60;

// Mismos tramos que la cadencia del monitor, etiquetados por su punto medio
// para que la banda caiga donde estan los datos del tramo.
export function tramoDeEdad(ageMin: number): number {
  if (ageMin < 60) return Math.floor(ageMin / 15) * 15 + 7;
  if (ageMin < 360) return Math.floor(ageMin / 30) * 30 + 15;
  if (ageMin < 1440) return Math.floor(ageMin / 120) * 120 + 60;
  if (ageMin < 4320) return Math.floor(ageMin / 360) * 360 + 180;
  return Math.floor(ageMin / 1440) * 1440 + 720;
}

// Igual que PERCENTILE_CONT de Postgres: interpolacion lineal entre vecinos.
function percentil(ordenados: number[], p: number): number {
  const pos = (ordenados.length - 1) * p;
  const lo = Math.floor(pos);
  const hi = Math.ceil(pos);
  return Math.round(ordenados[lo] + (ordenados[hi] - ordenados[lo]) * (pos - lo));
}

export function curvaTipica(snaps: SnapshotTipico[], esManual: boolean): TramoTipico[] {
  const porPost = new Map<string, SnapshotTipico[]>();
  for (const s of snaps) {
    const lista = porPost.get(s.postId) || [];
    lista.push(s);
    porPost.set(s.postId, lista);
  }

  const tramos = new Map<number, { imp: number[]; eng: number[] }>();
  for (const lista of porPost.values()) {
    // La curva se calcula con TODOS los snapshots del post: una lectura del dia
    // 8 sirve para estimar el dia 6. La ventana de 7 dias se aplica despues.
    const curva = curvaImpresiones(lista, esManual);
    lista.forEach((s, i) => {
      if (s.ageMin < 0 || s.ageMin > VENTANA_TIPICA_MIN) return;
      const t = tramoDeEdad(s.ageMin);
      const tramo = tramos.get(t) || { imp: [], eng: [] };
      tramo.eng.push((Number(s.likes) || 0) + 2 * (Number(s.comments) || 0) + 3 * (Number(s.reposts) || 0));
      if (curva[i].impressions != null) tramo.imp.push(curva[i].impressions as number);
      tramos.set(t, tramo);
    });
  }

  const salida: TramoTipico[] = [];
  for (const [ageMin, { imp, eng }] of tramos) {
    // Con una sola muestra la banda seria una linea plana; se descarta el tramo
    // (engagement) o solo sus impresiones.
    if (eng.length < 2) continue;
    const e = eng.slice().sort((a, b) => a - b);
    const i = imp.slice().sort((a, b) => a - b);
    const hayImp = i.length >= 2;
    salida.push({
      ageMin,
      sampleCount: e.length,
      sampleCountImp: i.length,
      p25Imp: hayImp ? percentil(i, 0.25) : null,
      p50Imp: hayImp ? percentil(i, 0.5) : null,
      p75Imp: hayImp ? percentil(i, 0.75) : null,
      p25Eng: percentil(e, 0.25),
      p50Eng: percentil(e, 0.5),
      p75Eng: percentil(e, 0.75),
    });
  }
  return salida.sort((a, b) => a.ageMin - b.ageMin);
}
