/**
 * Vuelca a docs/skills/menciones-usadas.json todas las empresas y personas que
 * ya hemos mencionado en un post de peloteo (mapa o "Los 10"), de las TRES
 * cuentas.
 *
 * POR QUE EXISTE
 * --------------
 * `post-workflow §4.0c` prohibe repetir una empresa o una persona entre posts de
 * la misma region, y el cruce cuenta TODAS las cuentas y los DOS formatos: el
 * mapa de Iker y el "Los 10" de Unai comparten region. Medido en Cataluña el
 * 2026-07-17: 83 entidades ya mencionadas entre los dos.
 *
 * Hacerlo a ojo no escala. Y el objetivo de negocio es literal: cada post tiene
 * que traer clientes NUEVOS, no repetir a los de siempre.
 *
 * POR QUE UN FICHERO Y NO UNA CONSULTA EN VIVO
 * -------------------------------------------
 * El validador se ejecuta en cada entrega y tiene que ser instantaneo y
 * funcionar sin red. Esto se regenera de vez en cuando (o tras publicar) y el
 * validador solo lee el JSON.
 *
 * Uso:  node scripts/extraer-menciones.mjs
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const RAIZ = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const SALIDA = path.join(RAIZ, 'docs', 'skills', 'menciones-usadas.json');

const API = 'https://linkedin-post-analyzer-production.up.railway.app';
const CUENTAS = {
  Iker: '3d545376-057c-48db-8b45-c5c5510110bb',
  Unai: '88d272b7-0f93-49cf-bac1-1334965f361d',
  Asier: '89610120-758c-4d25-8353-76c1147e0f0c',
};

/**
 * Normalizacion para comparar. Sin esto se cuela "Bioiberica" contra
 * "Bioibérica" y "Prefabricados Pujol" contra "Prefabricats Pujol" — que es el
 * fallo real que documenta §4.0c.
 */
export function normalizar(s) {
  return (s || '')
    .normalize('NFD').replace(/[̀-ͯ]/g, '')   // fuera acentos
    .toLowerCase()
    .replace(/\b(s\.?a\.?u?\.?|s\.?l\.?u?\.?|group|grupo|holding|company)\b/g, '')
    .replace(/[^a-z0-9ñ ]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * De una linea "→ Empresa - Persona · logro" saca las dos entidades.
 *
 * El filtro de abajo NO es cosmetico: hay posts (ofertas de empleo, listas de
 * ventajas) que tambien usan `→` y colaban cosas como "18.000€ brutos fijos + …"
 * como si fueran empresas. Un nombre propio no lleva euros, ni empieza por
 * cifra, ni tiene siete palabras.
 */
function entidadesDeLinea(l) {
  const sinFlecha = l.replace(/^\s*→\s*/, '');
  const sinLogro = sinFlecha.split('·')[0];
  return sinLogro
    .split(' - ')
    .map((x) => x.trim())
    .filter((x) =>
      x.length > 2 &&
      x.length < 45 &&
      x.split(/\s+/).length <= 6 &&
      !/[€$%]/.test(x) &&
      // 2026-10-28: solo una cifra SUELTA ("3 meses…"). `^\d` a secas tiraba las
      // empresas que empiezan por cifra (3PBIOVIAN, del mapa de Navarra del 30/06)
      // y el cruce de repetidas no las veia.
      !/^\d+([.,]\d+)?(\s|$)/.test(x) &&
      !/\d{3,}/.test(x)
    );
}

const auth = 'Basic ' + Buffer.from(
  `${process.env.APP_BASIC_USER}:${process.env.APP_BASIC_PASS}`
).toString('base64');

const entidades = new Map();   // normalizado -> {original, posts:[]}
let postsConMenciones = 0;

for (const [cuenta, id] of Object.entries(CUENTAS)) {
  const r = await fetch(`${API}/api/creators/${id}/posts?limit=300`, { headers: { Authorization: auth } });
  if (!r.ok) { console.error(`  ${cuenta}: HTTP ${r.status}`); continue; }
  const j = await r.json();
  for (const p of (j.posts || j.items || j)) {
    const t = p.content_text || '';
    const lineas = t.split('\n').filter((l) => /^\s*→\s/.test(l));
    // Menos de 5 flechas no es un post de peloteo: son flechas decorativas.
    if (lineas.length < 5) continue;
    postsConMenciones++;
    const etiqueta = `${cuenta} ${(p.published_at || '').slice(0, 10)}`;
    for (const l of lineas) {
      for (const e of entidadesDeLinea(l)) {
        const k = normalizar(e);
        if (!k) continue;
        if (!entidades.has(k)) entidades.set(k, { original: e, posts: [] });
        const reg = entidades.get(k);
        if (!reg.posts.includes(etiqueta)) reg.posts.push(etiqueta);
      }
    }
  }
}

const salida = {
  generado: new Date().toISOString().slice(0, 10),
  posts_de_peloteo: postsConMenciones,
  total: entidades.size,
  entidades: Object.fromEntries([...entidades.entries()].sort()),
};
fs.writeFileSync(SALIDA, JSON.stringify(salida, null, 1), 'utf8');
console.log(`  ${entidades.size} entidades de ${postsConMenciones} posts de peloteo → ${SALIDA}`);
