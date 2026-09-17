import { Pool } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

// HORA DE MADRID EN TODA LA BD (Iker, 2026-09-17). Los dias y los meses de las
// graficas (`::date`, `date_trunc`, `CURRENT_DATE`) se calculaban en UTC: un
// post del dia 1 publicado entre las 00:00 y las 02:00 contaba en el mes
// anterior. Con la sesion en Europe/Madrid, esas funciones y cualquier fecha
// sin zona que mande el backend ('2026-09-01 00:00:00') se leen en hora de
// Madrid, con el cambio de hora resuelto por Postgres. Los timestamptz
// guardados no cambian: son instantes absolutos.
pool.on('connect', (client) => {
  client.query(`SET TIME ZONE 'Europe/Madrid'`).catch((err) =>
    console.error('[db] no se pudo fijar la zona horaria:', err?.message)
  );
});

pool.on('error', (err) => {
  console.error('Unexpected error on idle client', err);
  process.exit(-1);
});

export default pool;
