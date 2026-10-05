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
//
// EL ENGAGEMENT TENIA EL MISMO FALLO AL REVES (Iker, 2026-10-05, segunda
// vuelta). Al guardar las metricas a mano, el snapshot llevaba los likes,
// comentarios y reposts de la fila del post, que solo actualiza el monitor: una
// COPIA de su ultima lectura, de hace minutos o de dias. Medido ese dia: 15 de
// 15 lecturas manuales con los contadores identicos al snapshot anterior. El
// post de Mario del 02/10 copiaba (4 likes, 3 comentarios) a las 0.31h y once
// segundos despues Unipile daba (7, 8): el salto vertical del principio de la
// curva naranja. Desde ese dia el guardado lee los contadores de Unipile en el
// momento (manualPost.ts); las copias que ya estan en la BD, o las de un
// guardado en el que Unipile falle, se reconocen aqui (ver curvaPost).

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

const ordenPorEdad = (lecturas: { ageMin: number }[]) =>
  lecturas.map((_, i) => i).sort((a, b) => lecturas[a].ageMin - lecturas[b].ageMin);

// Posiciones (dentro de `orden`) que son una LECTURA de impresiones y no una
// copia. Regla de la copia en cuenta manual: arriba, en la cabecera.
function lecturasDeImpresiones(
  orden: number[],
  lecturas: { impressions: number | null }[],
  esManual: boolean
): number[] {
  const reales: number[] = [];
  let ultima: number | null = null;
  orden.forEach((i, pos) => {
    const v = lecturas[i].impressions;
    if (v == null) return;
    if (esManual && ultima !== null && Number(v) === ultima) return;
    reales.push(pos);
    ultima = Number(v);
  });
  return reales;
}

export function curvaImpresiones(lecturas: LecturaCurva[], esManual: boolean): ImpresionCurva[] {
  const orden = ordenPorEdad(lecturas);
  const salida: ImpresionCurva[] = lecturas.map(() => ({ impressions: null, estimated: false }));

  // Likes acumulados (el maximo hasta ese momento): un like quitado no debe
  // hacer bajar la curva estimada.
  const likesAcum: number[] = [];
  let maxLikes = 0;
  for (const i of orden) {
    maxLikes = Math.max(maxLikes, Number(lecturas[i].likes) || 0);
    likesAcum.push(maxLikes);
  }

  const reales = lecturasDeImpresiones(orden, lecturas, esManual);

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

// ─── Impresiones y contadores juntos ───
//
// UNA COPIA DE CONTADORES, en cuenta manual, es un snapshot de lectura manual
// (trae una cifra nueva de impresiones) con likes, comentarios y reposts
// IDENTICOS al snapshot anterior. Tambien el guardado que va justo detras (la
// misma cifra de impresiones y los mismos contadores, a 15 min o menos): es el
// mismo formulario enviado dos veces. El alta (primer snapshot) no es copia: sus
// contadores los lee Unipile al pegar la URL.
//
// Un snapshot del monitor con los contadores sin cambios NO es copia: es una
// lectura de que el post no ha crecido, y se respeta. Por eso la regla exige que
// el snapshot traiga lectura de impresiones, cosa que el monitor no hace.
//
// Lo que se pierde: una lectura manual de hoy en adelante cuyos contadores
// frescos no hayan cambiado desde el snapshot anterior se estima en vez de
// pintarse tal cual. Queda entre el valor anterior (el mismo) y la lectura
// siguiente, asi que el error es como mucho lo que crezca hasta ella.
//
// La copia se estima LINEAL EN EL TIEMPO entre la lectura de contadores de
// antes y la de despues: aqui no hay otra serie que de mejor la forma, y las
// lecturas del monitor son densas (de 30 min a 24h). Sin lectura despues, null.
//
// Las impresiones se estiman DESPUES, con los likes ya corregidos: una copia
// suele caer justo en la lectura manual de impresiones, que es el ancla de su
// estimacion, y con los likes viejos la curva subia de golpe en el snapshot
// siguiente.

export interface LecturaPost {
  ageMin: number;
  impressions: number | null;
  likes: number;
  comments: number;
  reposts: number;
}

export interface PuntoPost {
  impressions: number | null;
  impressionsEstimated: boolean;
  // null: copia sin lectura de contadores despues que permita estimarla.
  likes: number | null;
  comments: number | null;
  reposts: number | null;
  countersEstimated: boolean;
}

const VENTANA_CADENA_MIN = 15;

export function curvaPost(lecturas: LecturaPost[], esManual: boolean): PuntoPost[] {
  const orden = ordenPorEdad(lecturas);
  const en = (pos: number) => lecturas[orden[pos]];
  const mismosContadores = (a: number, b: number) =>
    Number(en(a).likes) === Number(en(b).likes) &&
    Number(en(a).comments) === Number(en(b).comments) &&
    Number(en(a).reposts) === Number(en(b).reposts);

  const esLecturaImp = new Set(lecturasDeImpresiones(orden, lecturas, esManual));
  const copia: boolean[] = orden.map(() => false);
  if (esManual) {
    for (let pos = 1; pos < orden.length; pos++) {
      if (!mismosContadores(pos, pos - 1)) continue;
      const cadena =
        copia[pos - 1] &&
        en(pos).impressions != null &&
        Number(en(pos).impressions) === Number(en(pos - 1).impressions) &&
        en(pos).ageMin - en(pos - 1).ageMin <= VENTANA_CADENA_MIN;
      copia[pos] = esLecturaImp.has(pos) || cadena;
    }
  }

  const contadores = orden.map((_, pos) => {
    const p = en(pos);
    if (!copia[pos]) {
      return { likes: Number(p.likes), comments: Number(p.comments), reposts: Number(p.reposts), estimated: false };
    }
    let a = pos - 1;
    while (a >= 0 && copia[a]) a--;
    let b = pos + 1;
    while (b < orden.length && copia[b]) b++;
    if (a < 0 || b >= orden.length) return { likes: null, comments: null, reposts: null, estimated: false };
    const pa = en(a);
    const pb = en(b);
    const dt = pb.ageMin - pa.ageMin;
    const f = dt > 0 ? (p.ageMin - pa.ageMin) / dt : 0.5;
    const mezcla = (x: number, y: number) => Math.round(Number(x) + (Number(y) - Number(x)) * f);
    return {
      likes: mezcla(pa.likes, pb.likes),
      comments: mezcla(pa.comments, pb.comments),
      reposts: mezcla(pa.reposts, pb.reposts),
      estimated: true,
    };
  });

  // curvaImpresiones devuelve en el orden de lo que recibe: se le pasa ya
  // ordenado y se recoloca abajo. Un null de likes cuenta como 0, que con el
  // acumulado (maximo hasta ahi) deja el valor anterior.
  const imp = curvaImpresiones(
    orden.map((_, pos) => ({
      ageMin: en(pos).ageMin,
      impressions: en(pos).impressions,
      likes: contadores[pos].likes ?? 0,
    })),
    esManual
  );

  const salida: PuntoPost[] = new Array(lecturas.length);
  orden.forEach((i, pos) => {
    salida[i] = {
      impressions: imp[pos].impressions,
      impressionsEstimated: imp[pos].estimated,
      likes: contadores[pos].likes,
      comments: contadores[pos].comments,
      reposts: contadores[pos].reposts,
      countersEstimated: contadores[pos].estimated,
    };
  });
  return salida;
}

// ─── Banda tipica (p25-p75 de los otros posts de la cuenta a la misma edad) ───
//
// Antes salia de un SQL que hacia COALESCE(impresiones, 0): un snapshot sin
// lectura contaba como 0 y las copias del arrastre como lectura, asi que la
// banda de una cuenta manual heredaba las mesetas y los acantilados de sus
// otros posts. Ahora cada post pasa por curvaPost antes de agruparse, y un
// snapshot sin lectura ni estimacion no cuenta (ni para impresiones ni, si es
// una copia de contadores sin lectura despues, para el engagement).
//
// UN POST, UN VOTO POR TRAMO (Iker, 2026-10-05, tercera vuelta). Se contaban
// SNAPSHOTS, no posts, y cada lectura manual añade un snapshot: el post que la
// tenia contaba doble en ese tramo. Con los 2 posts de Mario, la banda bajaba
// de golpe a las 21h ("Trabajo en growth" dos veces, a las 20.13h y en la
// lectura de las 20.54h: 899-9.399 en vez de 5.150-13.650) y saltaba a las 69h
// (el meme dos veces). Ahora cada post entra una vez con la media de sus
// snapshots del tramo, y el n del tooltip son posts.

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
  p25Eng: number | null;
  p50Eng: number | null;
  p75Eng: number | null;
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

  const media = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;
  const tramos = new Map<number, { imp: number[]; eng: number[] }>();
  for (const lista of porPost.values()) {
    // La curva se calcula con TODOS los snapshots del post: una lectura del dia
    // 8 sirve para estimar el dia 6. La ventana de 7 dias se aplica despues.
    const curva = curvaPost(lista, esManual);
    const delPost = new Map<number, { imp: number[]; eng: number[] }>();
    lista.forEach((s, i) => {
      if (s.ageMin < 0 || s.ageMin > VENTANA_TIPICA_MIN) return;
      const t = tramoDeEdad(s.ageMin);
      const tramo = delPost.get(t) || { imp: [], eng: [] };
      const c = curva[i];
      if (c.likes != null) tramo.eng.push(c.likes + 2 * (c.comments ?? 0) + 3 * (c.reposts ?? 0));
      if (c.impressions != null) tramo.imp.push(c.impressions);
      delPost.set(t, tramo);
    });
    for (const [t, { imp, eng }] of delPost) {
      const tramo = tramos.get(t) || { imp: [], eng: [] };
      if (eng.length) tramo.eng.push(media(eng));
      if (imp.length) tramo.imp.push(media(imp));
      tramos.set(t, tramo);
    }
  }

  const salida: TramoTipico[] = [];
  for (const [ageMin, { imp, eng }] of tramos) {
    // Con un solo post la banda seria una linea plana: esa metrica va a null,
    // y el tramo entero fuera si no le queda ninguna de las dos.
    const e = eng.slice().sort((a, b) => a - b);
    const i = imp.slice().sort((a, b) => a - b);
    const hayImp = i.length >= 2;
    const hayEng = e.length >= 2;
    if (!hayImp && !hayEng) continue;
    salida.push({
      ageMin,
      sampleCount: e.length,
      sampleCountImp: i.length,
      p25Imp: hayImp ? percentil(i, 0.25) : null,
      p50Imp: hayImp ? percentil(i, 0.5) : null,
      p75Imp: hayImp ? percentil(i, 0.75) : null,
      p25Eng: hayEng ? percentil(e, 0.25) : null,
      p50Eng: hayEng ? percentil(e, 0.5) : null,
      p75Eng: hayEng ? percentil(e, 0.75) : null,
    });
  }
  return salida.sort((a, b) => a.ageMin - b.ageMin);
}
