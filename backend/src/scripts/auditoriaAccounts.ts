// AUDITORIA DE LA SECCION ACCOUNTS (Iker, 2026-09-17): produccion contra
// LinkedIn en vivo y coherencia interna. SOLO LECTURAS.
//   npx tsx src/scripts/auditoriaAccounts.ts
// Necesita APP_BASIC_USER / APP_BASIC_PASS y las variables de Unipile.
// Compara: cifras de cuenta (resumen, series diarias, seguidores), cada post de
// los ultimos 30 dias contra su pagina de analiticas, y que KPIs, tabla por
// cuenta, graficas y listas cuadren entre si. LinkedIn a veces devuelve una
// pagina vacia: un "LinkedIn 0" suelto es una lectura fallida, se repite.
import { fetchPremiumAnalytics } from '../services/premiumAnalytics';
import { fetchResumenLinkedIn, fetchSeriesDiarias, fetchSeguidoresDiarios } from '../services/linkedinOverview';

const B = 'https://linkedin-post-analyzer-production.up.railway.app';
const AUTH = 'Basic ' + Buffer.from(`${process.env.APP_BASIC_USER}:${process.env.APP_BASIC_PASS}`).toString('base64');
const api = async (u: string): Promise<any> => (await fetch(B + u, { headers: { Authorization: AUTH } })).json();
const pausa = (ms: number) => new Promise((r) => setTimeout(r, ms));
const hoy = new Date();
const FIN = hoy.toISOString().slice(0, 10);
const INI = new Date(hoy.getTime() - 29 * 86400000).toISOString().slice(0, 10);
const n = (v: any) => Number(v ?? 0);
const hallazgos: string[] = [];
const ok = (cond: boolean, texto: string) => {
  console.log(`${cond ? 'OK   ' : 'FALLO'} ${texto}`);
  if (!cond) hallazgos.push(texto);
};
const cerca = (a: number, b: number, tol: number) => (b === 0 ? a === 0 : Math.abs(a - b) / b <= tol);

(async () => {
  const creadores: any[] = await api('/api/creators');
  const conectadas = creadores.filter((c) => c.is_managed && c.unipile_account_id && !c.is_manual);

  console.log('\n=== 1. CIFRAS DE CUENTA: produccion vs LinkedIn en vivo ===');
  for (const c of conectadas) {
    const nombre = c.name.split(' ')[0];
    const [r, s, f] = [
      await fetchResumenLinkedIn(c.unipile_account_id),
      await fetchSeriesDiarias(c.unipile_account_id),
      await fetchSeguidoresDiarios(c.unipile_account_id),
    ];
    const an = await api(`/api/accounts/analytics?start_date=${INI}&end_date=${FIN}&creator_id=${c.id}`);
    const pv = await api(`/api/accounts/profile-view-history?start_date=${INI}&end_date=${FIN}&creator_id=${c.id}`);
    const fh = await api(`/api/accounts/follower-history?start_date=${INI}&end_date=${FIN}&creator_id=${c.id}`);
    const mm = await api(`/api/accounts/impressions-monthly?start_date=${FIN.slice(0, 4)}-01-01&end_date=${FIN}&creator_id=${c.id}`);
    const fm = await api(`/api/accounts/follower-monthly?start_date=${FIN.slice(0, 4)}-01-01&end_date=${FIN}&creator_id=${c.id}`);
    if (!r || !s || !f) { ok(false, `${nombre}: LinkedIn no devolvio alguna pagina (resumen ${!!r}, series ${!!s}, seguidores ${!!f})`); continue; }
    ok(cerca(n(an.linkedin_oficial?.profile_viewers_90d), n(r.profileViewers90d), 0.02), `${nombre} visitas 90d: herramienta ${an.linkedin_oficial?.profile_viewers_90d} / LinkedIn ${r.profileViewers90d}`);
    ok(cerca(n(an.linkedin_oficial?.post_impressions_7d), n(r.postImpressions7d), 0.05), `${nombre} impresiones 7d: herramienta ${an.linkedin_oficial?.post_impressions_7d} / LinkedIn ${r.postImpressions7d}`);
    ok(n(pv.oficial_actual) === n(an.linkedin_oficial?.profile_viewers_90d), `${nombre} tarjeta Profile views = KPI (${pv.oficial_actual})`);
    const totalHoy = fh.points[fh.points.length - 1]?.followers;
    ok(cerca(n(totalHoy), n(r.followers), 0.002), `${nombre} seguidores totales: herramienta ${totalHoy} / LinkedIn ${r.followers}`);
    // series en el rango
    const enRango = s.filter((d) => d.dia >= INI && d.dia <= FIN);
    const impLive = enRango.reduce((a, d) => a + d.impresiones, 0);
    const engLive = enRango.reduce((a, d) => a + (d.engagements ?? 0), 0);
    const impTool = an.daily.reduce((a: number, d: any) => a + n(d.total_impressions), 0);
    const engTool = an.daily.reduce((a: number, d: any) => a + n(d.total_engagement), 0);
    ok(cerca(impTool, impLive, 0.03), `${nombre} Engagement over time · impresiones 30d: herramienta ${impTool} / LinkedIn ${impLive}`);
    ok(cerca(engTool, engLive, 0.05), `${nombre} Engagement over time · engagement 30d: herramienta ${engTool} / LinkedIn ${engLive}`);
    for (const p of mm.points) {
      const live = s.filter((d) => d.dia.startsWith(p.month)).reduce((a, d) => a + d.impresiones, 0);
      ok(cerca(n(p.impressions), live, p.month === FIN.slice(0, 7) ? 0.03 : 0.005), `${nombre} Impressions per month ${p.month}: herramienta ${p.impressions} / LinkedIn ${live}`);
    }
    const segLive = [...f.entries()].filter(([d]) => d >= INI && d <= FIN).reduce((a, [, v]) => a + v, 0);
    const segTool = fh.points.reduce((a: number, p: any) => a + n(p.gained), 0);
    ok(cerca(segTool, segLive, 0.05), `${nombre} Follower growth 30d: herramienta ${segTool} / LinkedIn ${segLive}`);
    ok(segTool === n(an.totals.followers_gained), `${nombre} KPI Followers gained (${an.totals.followers_gained}) = grafica (${segTool})`);
    for (const p of fm.points) {
      const live = [...f.entries()].filter(([d]) => d.startsWith(p.month)).reduce((a, [, v]) => a + v, 0);
      ok(cerca(n(p.gained), live, p.month === FIN.slice(0, 7) ? 0.05 : 0.005), `${nombre} New followers per month ${p.month}: herramienta ${p.gained} / LinkedIn ${live}`);
    }
    await pausa(2000);
  }

  console.log('\n=== 2. CADA POST DE LOS ULTIMOS 30 DIAS: produccion vs su pagina de LinkedIn ===');
  const todo = await api(`/api/accounts/analytics?start_date=${INI}&end_date=${FIN}&include_manual=false`);
  const porNombre = new Map(conectadas.map((c) => [c.name, c.unipile_account_id]));
  for (const p of todo.top_posts) {
    const urn = String(p.post_url || '').match(/urn:li:[a-zA-Z]+:\d+/)?.[0];
    const acc = porNombre.get(p.creator_name);
    if (!urn || !acc) { ok(false, `post ${p.id}: sin urn o sin cuenta`); continue; }
    const a = await fetchPremiumAnalytics(urn, acc);
    await pausa(1500);
    const quien = `${p.creator_name.split(' ')[0]} ${String(p.published_at).slice(0, 10)} "${String(p.content_text || '').slice(0, 30).replace(/\n/g, ' ')}"`;
    if (!a) { console.log(`AVISO ${quien}: LinkedIn no dio la pagina (post borrado o lectura fallida)`); continue; }
    // lo guardado puede ir algo por detras de LinkedIn (se lee cada cierto tiempo), nunca por delante
    const par = (campo: string, tool: any, live: number | null, tol = 0.1) => {
      if (live == null) return;
      const t = n(tool);
      const bien = t <= live * 1.02 + 2 && (live === 0 || t >= live * (1 - tol) - 3);
      ok(bien, `${quien} ${campo}: herramienta ${tool} / LinkedIn ${live}`);
    };
    par('impresiones', p.impressions_count, a.impressions);
    par('reacciones', p.likes_count, a.reactions);
    par('comentarios', p.comments_count, a.comments);
    par('reposts', p.reposts_count, a.reposts, 0.2);
    par('guardados', p.saves_count, a.saves, 0.2);
    par('envios', p.sends_count, a.sends, 0.2);
    par('clics enlace', p.link_clicks_count, a.linkClicks, 0.2);
    par('visitas perfil', p.profile_viewers_count, a.profileViewers, 0.2);
    par('seguidores', p.followers_gained_count, a.followersGained, 0.3);
  }

  console.log('\n=== 3. COHERENCIA INTERNA (todas las cuentas, con manuales) ===');
  const g = await api(`/api/accounts/analytics?start_date=${INI}&end_date=${FIN}`);
  const tp = g.top_posts;
  ok(n(g.totals.total_posts) === tp.length, `KPI posts (${g.totals.total_posts}) = posts listados en Top posts (${tp.length})`);
  const sumaPA = g.per_account.reduce((a: number, r: any) => a + n(r.posts), 0);
  ok(sumaPA === n(g.totals.total_posts), `Tabla por cuenta suma ${sumaPA} posts = KPI ${g.totals.total_posts}`);
  const sum = (k: string) => tp.reduce((a: number, p: any) => a + n(p[k]), 0);
  ok(sum('likes_count') === n(g.totals.total_likes), `KPI likes ${g.totals.total_likes} = suma de posts ${sum('likes_count')}`);
  ok(sum('comments_count') === n(g.totals.total_comments), `KPI comentarios ${g.totals.total_comments} = suma ${sum('comments_count')}`);
  ok(sum('reposts_count') === n(g.totals.total_reposts), `KPI reposts ${g.totals.total_reposts} = suma ${sum('reposts_count')}`);
  ok(sum('impressions_count') === n(g.totals.total_impressions), `KPI impresiones ${g.totals.total_impressions} = suma ${sum('impressions_count')}`);
  const sumaImpPA = g.per_account.reduce((a: number, r: any) => a + n(r.total_impressions), 0);
  ok(sumaImpPA === n(g.totals.total_impressions), `Tabla por cuenta impresiones ${sumaImpPA} = KPI ${g.totals.total_impressions}`);
  const fmix = g.format_mix.reduce((a: number, r: any) => a + n(r.count), 0);
  ok(fmix === n(g.totals.total_posts), `Content format mix ${fmix} posts = KPI ${g.totals.total_posts}`);
  const hooks = g.hook_types.reduce((a: number, r: any) => a + n(r.count), 0);
  ok(hooks === n(g.totals.total_posts), `Best-performing hooks ${hooks} posts = KPI ${g.totals.total_posts}`);
  const outl = tp.filter((p: any) => p.is_outlier).length;
  ok(outl === n(g.totals.total_outliers), `KPI outliers ${g.totals.total_outliers} = outliers listados ${outl}`);
  const fhAll = await api(`/api/accounts/follower-history?start_date=${INI}&end_date=${FIN}`);
  const segAll = fhAll.points.reduce((a: number, p: any) => a + n(p.gained), 0);
  ok(segAll === n(g.totals.followers_gained), `KPI Followers gained ${g.totals.followers_gained} = Follower growth ${segAll}`);
  const live = await api(`/api/accounts/live-posts?start_date=${INI}&end_date=${FIN}`);
  ok(live.length === tp.length, `Live posts (${live.length}) = Top posts (${tp.length}) en el mismo rango`);

  console.log(`\n=== RESUMEN: ${hallazgos.length} fallos ===`);
  hallazgos.forEach((h) => console.log(' - ' + h));
  process.exit(0);
})();
