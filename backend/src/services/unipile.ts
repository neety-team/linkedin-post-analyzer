import dotenv from 'dotenv';
dotenv.config();

import { estimateTimezone } from '../utils/timezone';

interface UnipileProfile {
  id?: string;
  provider_id?: string;
  first_name?: string;
  last_name?: string;
  name?: string;
  headline?: string;
  followers_count?: number;
  connections_count?: number;
  profile_picture_url?: string;
  public_identifier?: string;
  network_info?: {
    followers_count?: number;
    follower_count?: number;
    connections_count?: number;
    connection_count?: number;
  };
  [key: string]: any;
}

interface UnipilePost {
  id?: string;
  social_id?: string;
  text?: string;
  content?: string;
  body?: string;
  created_at?: string;
  published_at?: string;
  parsed_datetime?: string;
  date?: string;
  // Unipile uses *_counter fields
  reaction_counter?: number;
  comment_counter?: number;
  repost_counter?: number;
  impressions_counter?: number;
  // Also support alternative field names
  likes_count?: number;
  reactions_count?: number;
  comments_count?: number;
  reposts_count?: number;
  shares_count?: number;
  impressions?: number;
  views_count?: number;
  attachments?: { id?: string; type?: string; url?: string; size?: string }[];
  media?: any[];
  images?: any[];
  documents?: any[];
  video?: any;
  poll?: any;
  article?: any;
  author?: { public_identifier?: string; name?: string; is_company?: boolean };
  url?: string;
  post_url?: string;
  [key: string]: any;
}

interface UnipileListResponse {
  items?: UnipilePost[];
  object?: string;
  cursor?: string;
  has_more?: boolean;
  paging?: { cursor?: string };
}

// A LinkedIn comment as Unipile surfaces it. Field names vary mildly across
// versions, so the union types accommodate the variants we've seen in the
// wild. parent_comment_id (or comment_id) signals a reply rather than a
// top-level comment; the routes layer uses this to group the thread.
export interface UnipileComment {
  id?: string;
  social_id?: string;
  text?: string;
  date?: string;
  created_at?: string;
  parsed_datetime?: string;
  parent_comment_id?: string | null;
  comment_id?: string | null; // some payloads name the parent this way
  is_reply?: boolean;
  reaction_counter?: number;
  reply_counter?: number;
  author?: {
    id?: string;
    public_identifier?: string;
    name?: string;
    headline?: string;
    profile_picture_url?: string;
    is_company?: boolean;
  };
  [key: string]: any;
}

interface UnipileCommentListResponse {
  items?: UnipileComment[];
  cursor?: string;
  paging?: { cursor?: string };
}

// The 6 reactions LinkedIn exposes, keyed by the simple lowercase name
// the frontend sends and Unipile's reaction endpoint expects. Cross-
// reference (how the GET /reactions side reports each one): like→LIKE,
// celebrate→PRAISE, support→APPRECIATION, love→EMPATHY,
// insightful→INTEREST, funny→ENTERTAINMENT. If Unipile rejects a value
// with a 400, this list is the thing to adjust.
export const LINKEDIN_REACTION_TYPES = [
  'like',
  'celebrate',
  'support',
  'love',
  'insightful',
  'funny',
] as const;
export type LinkedinReactionType = (typeof LINKEDIN_REACTION_TYPES)[number];

// Maps Unipile/LinkedIn's internal reaction VALUE (as returned on the
// comment object's `user_reacted` field, and on the GET /reactions
// items' `value` field) to our lowercase frontend type. Confirmed live
// from a comments dump: comments carry user_reacted ∈ {LIKE, PRAISE,
// APPRECIATION, EMPATHY, INTEREST, ENTERTAINMENT} (absent when the
// viewer hasn't reacted). The lowercase friendly names are accepted too,
// defensively. MAYBE (the deprecated "Curious") has no UI slot → null.
const LINKEDIN_REACTION_VALUE_MAP: Record<string, LinkedinReactionType | null> = {
  LIKE: 'like',
  PRAISE: 'celebrate',
  CELEBRATE: 'celebrate',
  APPRECIATION: 'support',
  SUPPORT: 'support',
  EMPATHY: 'love',
  LOVE: 'love',
  INTEREST: 'insightful',
  INSIGHTFUL: 'insightful',
  ENTERTAINMENT: 'funny',
  FUNNY: 'funny',
  MAYBE: null,
};

// Normalise a raw Unipile reaction value (e.g. "EMPATHY", or already
// "love") into our lowercase frontend type, or null if absent/unknown.
export function normalizeReactionValue(raw: unknown): LinkedinReactionType | null {
  if (!raw || typeof raw !== 'string') return null;
  const key = raw.trim().toUpperCase();
  return LINKEDIN_REACTION_VALUE_MAP[key] ?? null;
}

// NOTE on the read/write asymmetry (confirmed live from a 400 error):
// Unipile's SEND endpoint validates reaction_type against the LOWERCASE
// enum ["like","celebrate","support","love","insightful","funny"] — the
// same lowercase names we already use. The READ side, however, reports
// reactions as LinkedIn's INTERNAL UPPERCASE values ("EMPATHY","PRAISE",
// …) on comment.user_reacted. So: send lowercase (our type as-is),
// normalise uppercase→lowercase on read (normalizeReactionValue). Do NOT
// uppercase on send — it 400s ("Expected kind 'StringEnum'").

// ───────────────── búsqueda de empresas (lead magnet "lista") ─────────────────
// Señales de que la sede es española. El geo 105646813 (España) de la búsqueda
// clásica NO basta: LinkedIn casa el facet contra oficinas, así que cuela
// Italia, California o una Córdoba argentina. Este segundo filtro, sobre el
// texto de `location`, deja fuera lo que no es España. Sesgo deliberado: mejor
// tirar una española de más que colar una extranjera (el comercial que la
// reciba no la quiere). Por eso las provincias que chocan fuerte con LATAM
// (córdoba, león, santiago) NO están abajo: solo pasan si el location trae
// además su CCAA ("Córdoba, Andalusia") o el país.
const ES_REGIONS = new Set([
  'espana', 'spain',
  // CCAA (en español y como las escribe LinkedIn en inglés)
  'andalucia', 'andalusia', 'aragon', 'asturias', 'principado de asturias',
  'cantabria', 'castilla-la mancha', 'castile-la mancha', 'castilla la mancha',
  'castilla y leon', 'castile and leon', 'cataluna', 'catalunya', 'catalonia',
  'extremadura', 'galicia', 'galiza', 'la rioja', 'rioja', 'madrid',
  'comunidad de madrid', 'community of madrid', 'murcia', 'region de murcia',
  'region of murcia', 'navarra', 'navarre', 'comunidad foral de navarra',
  'pais vasco', 'euskadi', 'basque country', 'comunidad valenciana',
  'comunitat valenciana', 'valencian community', 'valencia', 'canarias',
  'canary islands', 'islas canarias', 'baleares', 'islas baleares',
  'balearic islands', 'illes balears', 'ceuta', 'melilla',
  // provincias y grandes ciudades (sin las de choque fuerte con LATAM)
  'alava', 'araba', 'albacete', 'alicante', 'alacant', 'almeria', 'avila',
  'badajoz', 'barcelona', 'bizkaia', 'vizcaya', 'burgos', 'caceres', 'cadiz',
  'castellon', 'castello', 'ciudad real', 'cuenca', 'gipuzkoa', 'guipuzcoa',
  'girona', 'gerona', 'granada', 'guadalajara', 'huelva', 'huesca', 'jaen',
  'a coruna', 'la coruna', 'coruna', 'las palmas', 'lleida', 'lerida', 'lugo',
  'malaga', 'ourense', 'orense', 'palencia', 'pontevedra', 'salamanca',
  'tenerife', 'santa cruz de tenerife', 'segovia', 'sevilla', 'soria',
  'tarragona', 'teruel', 'toledo', 'valladolid', 'zamora', 'zaragoza', 'bilbao',
  'donostia', 'san sebastian', 'vitoria', 'gasteiz', 'palma', 'mallorca',
  'gijon', 'vigo',
]);
// Señales explícitas de FUERA de España: si aparece una, se descarta aunque
// también haya un nombre que suene español.
const NON_ES = new Set([
  'argentina', 'mexico', 'chile', 'colombia', 'venezuela', 'carabobo', 'peru',
  'uruguay', 'ecuador', 'bolivia', 'paraguay', 'panama', 'guatemala',
  'costa rica', 'republica dominicana', 'dominican republic', 'united states',
  'usa', 'california', 'texas', 'florida', 'new york', 'new jersey', 'illinois',
  'italy', 'italia', 'france', 'francia', 'germany', 'alemania', 'deutschland',
  'netherlands', 'holanda', 'groningen', 'portugal', 'united kingdom', 'england',
  'london', 'brasil', 'brazil', 'morocco', 'marruecos',
]);

function normLoc(s: string): string {
  return (s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
}

// ¿La `location` de una empresa es española? Trocea "Ciudad, Región" por comas
// y barras y comprueba cada trozo: si alguno es de fuera, fuera; si alguno es
// una región/ciudad española, dentro; si solo hay nombres ambiguos, fuera.
export function esEspanola(location: string | null | undefined): boolean {
  if (!location) return false;
  const segs = normLoc(location).split(/[,/|]/).map((x) => x.trim()).filter(Boolean);
  if (segs.length === 0) return false;
  if (segs.some((s) => NON_ES.has(s))) return false;
  return segs.some((s) => ES_REGIONS.has(s));
}

/**
 * ¿Es un repost? Unipile lo marca de varias formas segun la version; aqui van
 * TODAS, las mismas que usa el filtro de `scrapeCreatorPosts`. Un repost lleva
 * la fecha y a veces el id del post original, asi que no sirve para decidir
 * donde cortar la lectura del feed.
 */
export function esRepost(raw: any): boolean {
  if (!raw) return false;
  if (raw.type === 'repost' || raw.type === 'RESHARE' || raw.type === 'reshare') return true;
  if (raw.is_repost || raw.is_reshare) return true;
  if (raw.reshared_post || raw.original_post) return true;
  return false;
}

export class UnipileService {
  private apiKey: string;
  private baseUrl: string;
  private accountId: string;

  constructor() {
    this.apiKey = process.env.UNIPILE_API_KEY || '';
    this.baseUrl = process.env.UNIPILE_BASE_URL || 'https://api18.unipile.com:14891';
    this.accountId = process.env.UNIPILE_ACCOUNT_ID || '';

    if (!this.apiKey) {
      console.warn('UNIPILE_API_KEY not set — Unipile calls will fail');
    }
  }

  private async request<T>(path: string, options: RequestInit = {}): Promise<T> {
    const url = `${this.baseUrl}${path}`;
    console.log(`[Unipile] ${options.method || 'GET'} ${url}`);

    // Transient errors (429 rate-limit, 502/503/504 gateway) are retried
    // with backoff instead of bubbling straight up as a 500 to the
    // Dashboard. This is the main source of the 500s during refresh-all:
    // concurrent scrapes briefly trip Unipile's rate limit. Respect
    // Retry-After when present, otherwise exponential (0.8s, 2s, 4s).
    const RETRYABLE = new Set([429, 502, 503, 504]);
    const MAX_ATTEMPTS = 4;
    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
      const res = await fetch(url, {
        ...options,
        headers: {
          'X-API-KEY': this.apiKey,
          'Content-Type': 'application/json',
          ...options.headers,
        },
      });

      if (res.ok) {
        return (await res.json()) as T;
      }

      const body = await res.text().catch(() => '');
      if (RETRYABLE.has(res.status) && attempt < MAX_ATTEMPTS) {
        const retryAfter = Number(res.headers.get('retry-after'));
        const waitMs = Number.isFinite(retryAfter) && retryAfter > 0
          ? retryAfter * 1000
          : Math.min(4000, 800 * Math.pow(2, attempt - 1));
        console.warn(`[Unipile] ${res.status} (attempt ${attempt}/${MAX_ATTEMPTS}) — retrying in ${waitMs}ms`);
        await new Promise((r) => setTimeout(r, waitMs));
        continue;
      }

      console.error(`[Unipile] Error ${res.status}: ${body}`);
      throw new Error(`Unipile API error ${res.status}: ${body}`);
    }
    // Unreachable (loop either returns or throws), but satisfies the type.
    throw new Error('Unipile API: exhausted retries');
  }

  extractLinkedInIdentifier(linkedinUrl: string): string {
    // Extract username from URLs like https://www.linkedin.com/in/john-doe/
    const match = linkedinUrl.match(/linkedin\.com\/in\/([^/?]+)/);
    if (match) return match[1].replace(/\/$/, '');

    // Extract company from URLs like https://www.linkedin.com/company/acme/
    const companyMatch = linkedinUrl.match(/linkedin\.com\/company\/([^/?]+)/);
    if (companyMatch) return companyMatch[1].replace(/\/$/, '');

    return linkedinUrl;
  }

  /**
   * Step 1: Get profile using the public LinkedIn username.
   * This returns the provider_id (internal ID starting with ACo/ADo)
   * which is needed to fetch posts.
   */
  async getProfile(linkedinUrl: string, accountIdOverride?: string): Promise<UnipileProfile> {
    const publicIdentifier = this.extractLinkedInIdentifier(linkedinUrl);
    const accountId = accountIdOverride || this.accountId;
    console.log(`[Unipile] Fetching profile for: ${publicIdentifier} (account_id: ${accountId})`);

    const profile = await this.request<UnipileProfile>(
      `/api/v1/users/${encodeURIComponent(publicIdentifier)}?account_id=${accountId}`
    );

    console.log(`[Unipile] Profile fetched. provider_id: ${profile.provider_id}, id: ${profile.id}, name: ${profile.name || profile.first_name}`);
    return profile;
  }

  /**
   * Búsqueda clásica de EMPRESAS por sector, para el lead magnet "lista".
   *
   * Devuelve empresas reales españolas del sector con nombre, zona, industria y
   * su LinkedIn. Verificado en crudo el 2026-07-22.
   *
   * Dos cosas que NO son opcionales (medidas ese día):
   * - `location:["105646813"]` (geo España). Sin él la búsqueda devuelve medio
   *   mundo (Nueva York, Cracovia, Bengaluru) porque el keyword casa global.
   * - `esEspanola(location)` encima: el geo aún cuela alguna de Italia o
   *   California, así que se filtra el `location` de cada resultado.
   *
   * Pagina con el cursor hasta reunir `limit` empresas españolas (o agotar
   * `maxPages`), deduplicando por id. Devuelve MENOS de `limit` si el sector no
   * da para más — el llamador dice el número real, nunca rellena.
   */
  async searchCompanies(
    sector: string,
    opts: { limit?: number; maxPages?: number; accountIdOverride?: string } = {}
  ): Promise<{ name: string; zona: string | null; sector: string; linkedinUrl: string }[]> {
    const accountId = opts.accountIdOverride || this.accountId;
    if (!accountId) throw new Error('No Unipile account_id available for company search');
    const limit = opts.limit ?? 15;
    const maxPages = opts.maxPages ?? 4;

    const out: { name: string; zona: string | null; sector: string; linkedinUrl: string }[] = [];
    const seen = new Set<string>();
    let cursor: string | undefined;

    for (let page = 0; page < maxPages && out.length < limit; page++) {
      const body: Record<string, unknown> = {
        api: 'classic',
        category: 'companies',
        keywords: sector,
        location: ['105646813'], // geo urn de España
      };
      if (cursor) body.cursor = cursor;

      const res = await this.request<{ items?: any[]; cursor?: string; paging?: { cursor?: string } }>(
        `/api/v1/linkedin/search?account_id=${encodeURIComponent(accountId)}`,
        { method: 'POST', body: JSON.stringify(body) }
      );

      const items = (res.items || []).filter((it) => it && it.type === 'COMPANY' && it.profile_url);
      for (const it of items) {
        const id = String(it.id || it.profile_url);
        if (seen.has(id)) continue;
        seen.add(id);
        if (!esEspanola(it.location)) continue;
        out.push({
          name: String(it.name || '').trim(),
          zona: it.location ? String(it.location).trim() : null,
          sector: it.industry ? String(it.industry).trim() : '',
          linkedinUrl: String(it.profile_url).replace(/\/$/, ''),
        });
        if (out.length >= limit) break;
      }

      cursor = res.cursor || res.paging?.cursor;
      if (!cursor) break;
      await new Promise((r) => setTimeout(r, 300)); // pacing entre páginas
    }

    console.log(`[Unipile] searchCompanies("${sector}") → ${out.length} empresas españolas`);
    return out;
  }

  /**
   * Fetch the "Who Viewed My Profile" feed for a managed account.
   *
   * Unipile doesn't ship a typed wrapper for this — we go through their
   * raw-data passthrough (POST /api/v1/linkedin) which forwards an
   * arbitrary LinkedIn Voyager request. The Voyager surface here is
   * `surfaceType:WVMP` against `voyagerPremiumDashAnalyticsObject`.
   *
   * Caveats:
   * - Requires LinkedIn **Premium / Sales Navigator** on the connected
   *   account. Free accounts get a teaser (5 viewers) and the count
   *   never moves.
   * - The `queryId` hash at the end of the URL is owned by LinkedIn and
   *   can rotate. If WVMP starts returning empty results for accounts
   *   that previously worked, refresh the hash by inspecting a real
   *   request in the LinkedIn web UI (Network tab → premiumDashAnalyticsObject).
   *
   * Returns `null` (instead of throwing) when the call fails or the
   * account doesn't have access — the snapshot routine treats that as
   * "skip this creator today" instead of bailing out the whole scrape.
   */
  async getProfileViewers(
    accountIdOverride?: string
  ): Promise<{ count: number; raw: any; pages: number; pagingTotal: number | null } | null> {
    const accountId = accountIdOverride || this.accountId;
    if (!accountId) {
      console.warn('[Unipile WVMP] No account_id available, skipping');
      return null;
    }

    // LinkedIn Voyager paginates WVMP. Without an explicit count it returns a
    // small default page (~10–22 elements) and the same first slice every day,
    // which makes the daily snapshot look frozen. We page through with count:50
    // until LinkedIn stops returning elements (or we hit the safety cap), then
    // merge everything into one response so the backfill can read every viewer.
    const PAGE_SIZE = 50;
    const MAX_PAGES = 20; // 1000 viewers ceiling — Premium WVMP rarely shows more
    const queryId =
      'voyagerPremiumDashAnalyticsObject.c31102e906e7098910f44e0cecaa5b5c';

    const buildUrl = (start: number) =>
      'https://www.linkedin.com/voyager/api/graphql' +
      `?variables=(start:${start},count:${PAGE_SIZE},query:(),analyticsEntityUrn:(activityUrn:urn%3Ali%3Adummy%3A-1),surfaceType:WVMP)` +
      `&queryId=${queryId}`;

    // Defensive — LinkedIn occasionally rotates response shape. Same paths
    // as before, just centralised so the loop and the merge step agree.
    const extractRoot = (data: any) =>
      data?.data?.data?.premiumDashAnalyticsObjectByAnalyticsEntity ??
      data?.data?.premiumDashAnalyticsObjectByAnalyticsEntity ??
      data?.premiumDashAnalyticsObjectByAnalyticsEntity ??
      null;

    const allElements: any[] = [];
    let firstPageRaw: any = null;
    let pagingTotal: number | null = null;
    let pages = 0;

    try {
      for (let page = 0; page < MAX_PAGES; page++) {
        const start = page * PAGE_SIZE;
        const res = await fetch(`${this.baseUrl}/api/v1/linkedin`, {
          method: 'POST',
          headers: {
            'X-API-KEY': this.apiKey,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            account_id: accountId,
            method: 'GET',
            request_url: buildUrl(start),
            encoding: false,
          }),
        });
        if (!res.ok) {
          const body = await res.text().catch(() => '');
          console.warn(
            `[Unipile WVMP] ${res.status} for account ${accountId} page ${page}: ${body.slice(0, 200)}`
          );
          // If we already have at least one page, return what we have rather
          // than discarding everything because page N failed.
          if (page === 0) return null;
          break;
        }
        const data: any = await res.json();
        if (page === 0) firstPageRaw = data;

        const root = extractRoot(data);
        const elements: any[] = Array.isArray(root?.elements) ? root.elements : [];
        // Voyager surfaces the total as paging.total when available — useful
        // sanity check against the elements we accumulate.
        const tot = root?.paging?.total;
        if (typeof tot === 'number' && Number.isFinite(tot)) pagingTotal = tot;

        if (elements.length === 0) {
          pages = page; // last completed page index
          break;
        }
        allElements.push(...elements);
        pages = page + 1;
        if (elements.length < PAGE_SIZE) break; // partial page → end of list
      }

      // Build a single "merged" raw payload that mirrors the first-page shape
      // but carries every element we accumulated, so downstream consumers
      // (backfill / debug endpoint) can read all viewer timestamps from one
      // object. We splice the merged elements into whichever path exists.
      let mergedRaw: any = firstPageRaw;
      if (firstPageRaw) {
        const cloned = JSON.parse(JSON.stringify(firstPageRaw));
        if (cloned?.data?.data?.premiumDashAnalyticsObjectByAnalyticsEntity) {
          cloned.data.data.premiumDashAnalyticsObjectByAnalyticsEntity.elements = allElements;
        } else if (cloned?.data?.premiumDashAnalyticsObjectByAnalyticsEntity) {
          cloned.data.premiumDashAnalyticsObjectByAnalyticsEntity.elements = allElements;
        } else if (cloned?.premiumDashAnalyticsObjectByAnalyticsEntity) {
          cloned.premiumDashAnalyticsObjectByAnalyticsEntity.elements = allElements;
        }
        mergedRaw = cloned;
      }

      const count = allElements.length;
      console.log(
        `[Unipile WVMP] account ${accountId}: ${count} viewers across ${pages} page(s)` +
          (pagingTotal != null ? ` (paging.total=${pagingTotal})` : '')
      );
      return { count, raw: mergedRaw, pages, pagingTotal };
    } catch (err: any) {
      console.warn(`[Unipile WVMP] Fetch failed for account ${accountId}: ${err.message}`);
      return null;
    }
  }

  /**
   * Step 2: Get posts using the provider_id (internal ID) from getProfile.
   * The identifier for posts MUST be the provider internal ID, not the public username.
   */
  async getPosts(
    providerInternalId: string,
    since?: Date,
    accountIdOverride?: string,
    // INCREMENTAL: ids (social_id/id) already stored for this creator.
    // LinkedIn returns posts newest-first, so as soon as we hit one we
    // already have, everything older is already stored — stop paging.
    // Pass undefined / empty for a full scrape (first time for a creator).
    knownIds?: Set<string>
  ): Promise<UnipilePost[]> {
    const allPosts: UnipilePost[] = [];
    let cursor: string | undefined;
    // `since` is a HARD time floor for callers that intentionally want a
    // bounded window (Discover/monitor/network). When NO `since` is given
    // (managed-account + Dashboard creator scrapes) we pull the FULL
    // history — LinkedIn serves a profile's activity well past 6 months
    // and the old 180-day early-return was a self-imposed cap, not a
    // LinkedIn limit. Only the page safety cap bounds the no-floor path.
    const floor: Date | null = since ?? null;
    const accountId = accountIdOverride || this.accountId;

    let page = 0;
    // 20 pages = 1000 posts. Capped here (was 40) so a single first-time
    // full-history request stays under Railway's gateway timeout — that
    // was the source of the 502s. Incremental refreshes only fetch new
    // posts so they never approach this anyway, and 1000 is already ~2x
    // the old 6-month window for the vast majority of creators.
    const maxPages = 20;

    console.log(`[Unipile] Fetching posts for identifier: ${providerInternalId} (account_id: ${accountId})`);

    do {
      const params = new URLSearchParams({
        account_id: accountId,
        limit: '50',
      });
      if (cursor) params.set('cursor', cursor);

      const response = await this.request<UnipileListResponse>(
        `/api/v1/users/${encodeURIComponent(providerInternalId)}/posts?${params.toString()}`
      );

      const posts = response.items || [];
      console.log(`[Unipile] Page ${page + 1}: ${posts.length} posts fetched`);

      if (posts.length === 0) break;

      // Log first post structure for debugging
      if (page === 0 && posts.length > 0) {
        console.log(`[Unipile] Sample post keys: ${Object.keys(posts[0]).join(', ')}`);
      }

      const incremental = !!knownIds && knownIds.size > 0;
      for (const post of posts) {
        const publishedAt = post.parsed_datetime || post.created_at || post.published_at || post.date;
        // Un REPOST llega con la fecha del post original, pero LinkedIn lo
        // coloca en el feed por la fecha en que se reposteo (Iker, 2026-09-17).
        // Si reposteas hoy un post del dia 1, sale el PRIMERO del feed con
        // fecha del dia 1, y el corte de abajo devolvia la lista vacia: el
        // monitor dejo sin snapshots a todos los posts de Iker y Unai durante
        // 20 horas sin avisar. Su fecha no dice nada del orden, asi que un
        // repost viejo se salta y se sigue leyendo.
        // Un repost tampoco corta el scrape incremental: puede llegar con el id
        // del post original, que ya tenemos, y pararia antes de ver lo nuevo.
        const repost = esRepost(post);
        if (floor && publishedAt && new Date(publishedAt) < floor && repost) {
          continue;
        }
        if (floor && publishedAt && new Date(publishedAt) < floor) {
          console.log(`[Unipile] Reached posts older than the requested window, stopping. Total: ${allPosts.length}`);
          return allPosts;
        }
        if (incremental && !repost) {
          const pid = post.social_id || post.id;
          if (pid && knownIds!.has(pid)) {
            console.log(`[Unipile] Reached already-stored post (incremental), stopping. New: ${allPosts.length}`);
            return allPosts;
          }
        }
        allPosts.push(post);
      }

      cursor = response.cursor || response.paging?.cursor;
      page++;

      // Polite pacing between pages. 250ms (was 500): over a 20-page
      // first scrape this halves the wall-time (~5s vs ~10s of pure
      // sleep), keeping the request under the gateway timeout. The
      // request() retry/backoff absorbs any 429 if we pace too fast.
      if (cursor) {
        await new Promise((r) => setTimeout(r, 250));
      }
    } while (cursor && page < maxPages);

    console.log(`[Unipile] Total posts fetched: ${allPosts.length}`);
    return allPosts;
  }

  normalizeProfile(raw: UnipileProfile, linkedinUrl: string) {
    const followersCount = raw.followers_count
      || raw.network_info?.followers_count
      || raw.follower_count
      || raw.network_info?.follower_count
      || 0;
    const connectionsCount = raw.connections_count
      || raw.network_info?.connections_count
      || raw.connection_count
      || raw.network_info?.connection_count
      || 0;

    // Extract location from various possible fields
    // Unipile may use different field names depending on API version
    const locationCandidates = [
      raw.location,
      raw.location_name,
      raw.geo_location_name,
      raw.geo_location?.name,
      raw.geo_location?.full,
      typeof raw.geo_location === 'string' ? raw.geo_location : null,
      raw.geo_country_name,
      raw.address,
      raw.city,
      raw.region,
      raw.country,
      raw.country_name,
      raw.country_code,
    ];
    const location = locationCandidates.find((v) => v && typeof v === 'string' && v.trim().length > 0) || null;

    // Debug: log all location-related fields found in raw profile
    const locationKeys = Object.keys(raw).filter((k) =>
      /location|geo|city|region|country|address|area|place|state|province/i.test(k)
    );
    console.log(`[Unipile] Profile normalize: followers=${followersCount}, connections=${connectionsCount}, location="${location}", location_related_keys=[${locationKeys.join(',')}], location_values={${locationKeys.map(k => `${k}=${JSON.stringify(raw[k])}`).join(', ')}}`);
    console.log(`[Unipile] All raw profile keys: ${Object.keys(raw).join(', ')}`);

    // Estimate timezone from location
    const tz = estimateTimezone(location);
    if (tz) {
      console.log(`[Unipile] Timezone estimated: ${tz.timezone} (UTC${tz.utc_offset >= 0 ? '+' : ''}${tz.utc_offset}) from "${location}"`);
    }

    return {
      linkedin_url: linkedinUrl,
      // provider_id is the internal ID needed for fetching posts
      linkedin_id: raw.provider_id || raw.id || raw.public_identifier || null,
      name: raw.name || [raw.first_name, raw.last_name].filter(Boolean).join(' ') || null,
      headline: raw.headline || null,
      followers_count: followersCount,
      connections_count: connectionsCount,
      profile_image_url: raw.profile_picture_url || null,
      location: location,
      timezone: tz?.timezone || null,
      utc_offset: tz?.utc_offset ?? null,
    };
  }

  normalizePost(raw: UnipilePost, creatorId: string) {
    const text = raw.text || raw.content || raw.body || '';
    const contentType = this.detectContentType(raw);
    const publishedAt = raw.parsed_datetime || raw.created_at || raw.published_at || raw.date || null;

    // Unipile uses *_counter fields (reaction_counter, comment_counter, etc.)
    const likes = raw.reaction_counter ?? raw.likes_count ?? raw.reactions_count ?? 0;
    const comments = raw.comment_counter ?? raw.comments_count ?? 0;
    const reposts = raw.repost_counter ?? raw.reposts_count ?? raw.shares_count ?? 0;
    const impressions = raw.impressions_counter ?? raw.impressions ?? raw.views_count ?? null;
    // Analitica de LinkedIn PREMIUM (las 3 cuentas lo tienen). Unipile solo
    // expone estas dos; los clics al enlace NO los da (ver migrate.ts v31).
    const an = (raw as any).analytics || {};
    const profileViewers = an.profile_viewers_from_this_post ?? null;
    const followersGained = an.followers_gained_from_this_post ?? null;

    return {
      creator_id: creatorId,
      linkedin_post_id: raw.social_id || raw.id || null,
      content_text: text,
      content_type: contentType,
      published_at: publishedAt ? new Date(publishedAt) : null,
      likes_count: likes,
      comments_count: comments,
      reposts_count: reposts,
      impressions_count: impressions,
      profile_viewers_count: profileViewers,
      followers_gained_count: followersGained,
      post_url: raw.url || raw.post_url || this.buildPostUrl(raw) || null,
      raw_data: raw,
    };
  }

  private buildPostUrl(raw: UnipilePost): string | null {
    const postId = raw.social_id || raw.id;
    if (!postId) return null;
    // LinkedIn activity/update URLs
    return `https://www.linkedin.com/feed/update/${postId}/`;
  }

  extractMediaUrls(raw: any): string[] {
    const urls = new Set<string>();
    if (!raw || typeof raw !== 'object') return [];

    const TEXT_KEYS = new Set(['text', 'content', 'body', 'description', 'caption', 'hook_text', 'content_text']);
    const MEDIA_KEYS = new Set([
      'attachments', 'attachment', 'media', 'medias', 'images', 'image',
      'image_url', 'image_urls', 'img', 'img_url', 'imgs',
      'photo', 'photos', 'picture', 'pictures',
      'thumbnail', 'thumbnail_url', 'thumbnails',
      'video', 'videos', 'video_url',
    ]);
    const MEDIA_EXT_RE = /\.(jpe?g|png|webp|gif|mp4|webm|mov)(\?|#|$)/i;

    const walk = (node: any, underMedia: boolean) => {
      if (!node) return;
      if (typeof node === 'string') {
        if (underMedia && MEDIA_EXT_RE.test(node)) urls.add(node);
        return;
      }
      if (Array.isArray(node)) { for (const el of node) walk(el, underMedia); return; }
      if (typeof node !== 'object') return;
      for (const urlKey of ['url', 'download_url', 'image_url', 'thumbnail_url', 'video_url', 'source_url', 'src']) {
        const v = node[urlKey];
        if (typeof v === 'string' && underMedia && MEDIA_EXT_RE.test(v)) urls.add(v);
      }
      for (const [k, v] of Object.entries(node)) {
        if (TEXT_KEYS.has(k)) continue;
        walk(v, underMedia || MEDIA_KEYS.has(k));
      }
    };

    walk(raw, false);
    return [...urls];
  }

  detectPostContentType(raw: UnipilePost): string {
    return this.detectContentType(raw);
  }

  private detectContentType(raw: UnipilePost): string {
    if (raw.poll) return 'poll';
    if (raw.article) return 'article';

    const hasText = ((raw.text || raw.content || raw.body || '') as string).trim().length > 0;
    const signals = this.scanMediaSignals(raw);
    if (signals.video) return hasText ? 'text_video' : 'video';
    if (signals.document) return hasText ? 'text_document' : 'document';
    if (signals.carousel) return hasText ? 'text_carousel' : 'carousel';
    if (signals.image) return hasText ? 'text_image' : 'image';

    return 'text';
  }

  // Same deep-scan logic as reclassify endpoint — kept here so live scraping and
  // reclassification stay in sync. Ignores post text fields to avoid false positives.
  private scanMediaSignals(raw: any): { image: boolean; carousel: boolean; video: boolean; document: boolean } {
    return scanMediaSignalsImpl(raw);
  }

  // Fetch every comment thread on a post.
  // - Without opts.parentCommentId → top-level comments (Unipile's default).
  // - With opts.parentCommentId    → the replies under that specific comment.
  // The same endpoint serves both; we just pass `comment_id=<parent>` to
  // scope it to a thread. Replies aren't included in the top-level call —
  // each comment with reply_counter > 0 needs its own follow-up fetch
  // (the route layer parallelises them with Promise.all).
  async getPostComments(
    postSocialId: string,
    accountIdOverride?: string,
    opts: { parentCommentId?: string } = {}
  ): Promise<UnipileComment[]> {
    const accountId = accountIdOverride || this.accountId;
    if (!accountId) {
      console.warn('[Unipile comments] No account_id available, skipping');
      return [];
    }
    const all: UnipileComment[] = [];
    let cursor: string | undefined;
    const MAX_PAGES = 10; // 10 × 50 = 500 comments ceiling
    for (let page = 0; page < MAX_PAGES; page++) {
      const params = new URLSearchParams({ account_id: accountId, limit: '50' });
      if (cursor) params.set('cursor', cursor);
      if (opts.parentCommentId) params.set('comment_id', opts.parentCommentId);
      const res = await this.request<UnipileCommentListResponse>(
        `/api/v1/posts/${encodeURIComponent(postSocialId)}/comments?${params.toString()}`
      );
      const items = res.items || [];
      if (items.length === 0) break;
      all.push(...items);
      cursor = res.cursor || res.paging?.cursor;
      if (!cursor) break;
    }
    return all;
  }

  // Post a reply under an existing comment. Unipile's API takes the parent
  // comment_id as part of the body — same endpoint as posting a top-level
  // comment, just with the extra field. Mentions use a templated syntax:
  // text contains {{0}}, {{1}}, … placeholders that line up with entries
  // in the mentions array (each {name, profile_id}). Without mentions the
  // body is a plain {account_id, comment_id, text}.
  async replyToComment(
    postSocialId: string,
    parentCommentId: string,
    text: string,
    mentions: { name: string; profile_id: string }[] | undefined,
    accountIdOverride?: string
  ): Promise<UnipileComment> {
    const accountId = accountIdOverride || this.accountId;
    if (!accountId) throw new Error('No Unipile account_id available for reply');
    const body: Record<string, unknown> = {
      account_id: accountId,
      text,
      comment_id: parentCommentId,
    };
    if (mentions && mentions.length > 0) body.mentions = mentions;
    return this.request<UnipileComment>(
      `/api/v1/posts/${encodeURIComponent(postSocialId)}/comments`,
      {
        method: 'POST',
        body: JSON.stringify(body),
      }
    );
  }

  // Fetch the per-reaction-type breakdown for a post (LIKE / FUNNY /
  // CELEBRATE / INSIGHTFUL / SUPPORT / EMPATHY / INTEREST). Walks the
  // /reactions endpoint until pagination ends or we hit maxPages.
  //
  // We aggregate into a compact count map — the caller doesn't need each
  // individual reaction, only "how many of each type". Used by the meme
  // detector: a post with funny_pct > 0.25 is virtually always a meme,
  // and computing that needs only the totals.
  // Fetch ONE post by its LinkedIn social id. Much faster than walking the
  // creator's feed and works for posts older than getPosts's window or
  // beyond its page cap. Used by the media-refresh flow (LinkedIn CDN URLs
  // expire after weeks; this gets fresh signed URLs without a full scrape).
  async getPostById(postSocialId: string, accountIdOverride?: string): Promise<any> {
    const accountId = accountIdOverride || this.accountId;
    if (!accountId) throw new Error('No Unipile account_id available for post fetch');
    return this.request<any>(
      `/api/v1/posts/${encodeURIComponent(postSocialId)}?account_id=${encodeURIComponent(accountId)}`
    );
  }

  async getPostReactions(
    postSocialId: string,
    accountIdOverride?: string,
    opts: { maxPages?: number; pageSize?: number } = {}
  ): Promise<{ counts: Record<string, number>; sampled: number; pages: number }> {
    const accountId = accountIdOverride || this.accountId;
    if (!accountId) throw new Error('No Unipile account_id available for reactions fetch');
    const pageSize = opts.pageSize ?? 100;
    const maxPages = opts.maxPages ?? 20; // 20 × 100 = 2000 reactions cap

    const counts: Record<string, number> = {};
    let sampled = 0;
    let cursor: string | undefined;
    let pages = 0;

    for (let page = 0; page < maxPages; page++) {
      const params = new URLSearchParams({ account_id: accountId, limit: String(pageSize) });
      if (cursor) params.set('cursor', cursor);
      const res = await this.request<{ items?: any[]; cursor?: string; paging?: { cursor?: string } }>(
        `/api/v1/posts/${encodeURIComponent(postSocialId)}/reactions?${params.toString()}`
      );
      const items = res.items || [];
      if (items.length === 0) break;
      for (const r of items) {
        // Unipile's PostReaction carries the type in `value` (confirmed live:
        // LIKE / ENTERTAINMENT / PRAISE / EMPATHY / APPRECIATION / INTEREST /
        // MAYBE). The older type/reaction/reaction_type fallbacks never
        // matched — that's why the first backfill stored everything as UNKNOWN.
        const type = String(
          r.value || r.type || r.reaction || r.reaction_type || 'UNKNOWN'
        ).toUpperCase();
        counts[type] = (counts[type] || 0) + 1;
      }
      sampled += items.length;
      pages = page + 1;
      cursor = res.cursor || res.paging?.cursor;
      if (!cursor || items.length < pageSize) break;
    }

    return { counts, sampled, pages };
  }

  // PROBE — returns the raw first few reaction items for one post so we can
  // see the actual field name carrying the reaction type. The aggregator
  // above stored everything as UNKNOWN, which means none of type/reaction/
  // reaction_type held the value — this shows what does.
  async probePostReactionsRaw(
    postSocialId: string,
    accountIdOverride?: string
  ): Promise<{ count: number; sample: any[]; raw_keys: string[] }> {
    const accountId = accountIdOverride || this.accountId;
    if (!accountId) throw new Error('No Unipile account_id available for reactions probe');
    const res = await this.request<{ items?: any[]; [k: string]: any }>(
      `/api/v1/posts/${encodeURIComponent(postSocialId)}/reactions?account_id=${encodeURIComponent(accountId)}&limit=5`
    );
    const items = Array.isArray(res?.items) ? res.items : [];
    return {
      count: items.length,
      sample: items.slice(0, 5),
      raw_keys: items[0] ? Object.keys(items[0]) : [],
    };
  }

  // Add a reaction to a post OR a comment (LinkedIn addresses both by their
  // social id, and Unipile's reaction endpoint takes either as post_id).
  // Used by the Comentarios tab so the user can react to a commenter
  // straight from the app instead of opening LinkedIn.
  //
  // Endpoint: POST /api/v1/posts/reaction  (body-based — note the GET side
  // is path-based at /api/v1/posts/{id}/reactions; Unipile's send + read
  // paths are deliberately asymmetric).
  // Body: { account_id, post_id, reaction_type, comment_id? }.
  // - post_id: the PARENT POST's social id (always).
  // - comment_id: set when reacting to a COMMENT (a LinkedIn comment is
  //   addressed as comment(activity:POST_ID, COMMENT_ID), so the reaction
  //   needs BOTH ids — passing the comment id as post_id returned
  //   {object:"ReactionAdded"} but never landed). Same shape as
  //   replyToComment, which carries the comment_id in the body.
  // - reaction_type: LOWERCASE value (like / celebrate / support / love /
  //   insightful / funny) — confirmed against Unipile's enum (uppercase
  //   400s with "Expected kind 'StringEnum'").
  // Request + raw response are logged so we can confirm landing from
  // Railway, and Unipile's 400s dump the schema if a param name is off.
  async addReaction(
    postSocialId: string,
    reactionType: LinkedinReactionType,
    accountIdOverride?: string,
    commentId?: string
  ): Promise<any> {
    const accountId = accountIdOverride || this.accountId;
    if (!accountId) throw new Error('No Unipile account_id available for reaction');
    const body: Record<string, unknown> = {
      account_id: accountId,
      post_id: postSocialId,
      reaction_type: reactionType,
    };
    if (commentId) body.comment_id = commentId;
    console.log(`[Unipile addReaction] → POST /api/v1/posts/reaction ${JSON.stringify(body)}`);
    const res = await this.request<any>(`/api/v1/posts/reaction`, {
      method: 'POST',
      body: JSON.stringify(body),
    });
    console.log(`[Unipile addReaction] ← ${JSON.stringify(res)}`);
    return res;
  }

  // Send a 1-to-1 LinkedIn direct message (Lead Magnet tab: deliver the
  // resource to someone who commented the keyword).
  //
  // Endpoint: POST /api/v1/chats — starts a chat with the attendee and
  // sends the first message in one call. If a chat with that person already
  // exists, LinkedIn appends to it rather than creating a duplicate.
  //
  // MULTIPART, not JSON: this endpoint takes multipart/form-data (it also
  // accepts attachments), so it can't go through `request` — that helper
  // hard-sets Content-Type: application/json. We build a FormData and let
  // fetch set the boundary itself; setting Content-Type by hand here would
  // omit the boundary and Unipile would 400.
  //
  // LinkedIn only delivers a plain DM to a 1st-degree connection. Para el
  // resto hay DOS canales más, y los dos salen por este mismo endpoint con un
  // parámetro extra (`opts`):
  //
  //  · `invitationId` — la persona nos mandó a NOSOTROS una solicitud y sigue
  //    pendiente de aceptar. LinkedIn deja contestarla con un mensaje normal
  //    (`linkedin[invitation_id]`), sin gastar InMail y sin nota.
  //  · `inmail` + `subject` — no hay conexión ni solicitud por ninguna parte.
  //    InMail de Premium/Sales Navigator (`linkedin[inmail]=true`), que LinkedIn
  //    OBLIGA a llevar asunto.
  //
  // Los nombres de campo van en notación de corchetes (`linkedin[api]`,
  // `linkedin[inmail]`, `linkedin[invitation_id]`) porque el objeto `linkedin`
  // es un campo de primer nivel del multipart, no va anidado bajo `options`.
  // Confirmado contra el OpenAPI de Unipile el 2026-08-14. `subject` sí es de
  // primer nivel, al lado de `text`.
  async sendDirectMessage(
    providerId: string,
    text: string,
    accountIdOverride?: string,
    opts: { subject?: string; inmail?: boolean; invitationId?: string } = {}
  ): Promise<{ chat_id: string | null; message_id: string | null }> {
    const accountId = accountIdOverride || this.accountId;
    if (!accountId) throw new Error('No Unipile account_id available for DM');

    const form = new FormData();
    form.append('account_id', accountId);
    form.append('attendees_ids', providerId);
    form.append('text', text);
    // El asunto solo lo pinta LinkedIn en el InMail; en un DM normal lo tira.
    if (opts.subject) form.append('subject', opts.subject);
    if (opts.inmail || opts.invitationId) form.append('linkedin[api]', 'classic');
    if (opts.inmail) form.append('linkedin[inmail]', 'true');
    if (opts.invitationId) form.append('linkedin[invitation_id]', opts.invitationId);

    const url = `${this.baseUrl}/api/v1/chats`;
    const canal = opts.inmail ? 'inmail' : opts.invitationId ? 'invitacion-pendiente' : 'dm';
    console.log(`[Unipile sendDirectMessage] → POST /api/v1/chats attendee=${providerId} canal=${canal}`);
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'X-API-KEY': this.apiKey },
      body: form,
    });
    const body = await res.text().catch(() => '');
    if (!res.ok) {
      console.error(`[Unipile sendDirectMessage] Error ${res.status}: ${body}`);
      throw new Error(`Unipile API error ${res.status}: ${body}`);
    }
    console.log(`[Unipile sendDirectMessage] ← ${body}`);
    const parsed = body ? JSON.parse(body) : {};
    return { chat_id: parsed.chat_id ?? null, message_id: parsed.message_id ?? null };
  }

  // ⛔ AQUÍ ESTABA `sendInvitation`, Y SE BORRÓ A PROPÓSITO (Iker, 2026-08-17).
  //
  // Mandaba la invitación con nota, que era el canal del lead magnet para quien
  // no es de 1er grado. Se retiró: gasta el cupo semanal, en la cuenta de Unai
  // está baneada desde el 14/08 (LinkedIn responde 200 y la tira en silencio) y
  // no construye red mientras nadie acepte. Ahora la solicitud la manda ELLA y
  // nosotros contestamos a la suya, que es gratis y no tiene tope.
  //
  // Si alguna vez hace falta volver a invitar, es POST /api/v1/users/invite con
  // {account_id, provider_id, message} y la nota tope 300 caracteres. Pero antes
  // de reescribirlo, leer `docs/superpowers/specs/2026-08-17-pedir-solicitud-lead-magnet-design.md`:
  // esto no se quitó por un bug, se quitó por una decisión.

  // ───────────── invitaciones: las que NOS mandan y las que mandamos ─────────────
  //
  // ⛔ ESTAS DOS LISTAS SON LA VERDAD DE LINKEDIN, Y LA RESPUESTA DEL POST NO LO ES
  // (Iker, 2026-08-13). Ese día la herramienta dio por buenas un montón de
  // invitaciones: Unipile respondió 200, la app las guardó como enviadas, y horas
  // después los comentaristas escribían diciendo que no les había llegado nada.
  // La cuenta tenía un baneo de invitaciones y LinkedIn las tiraba en silencio.
  //
  // La única forma de saberlo es RELEER: si la invitación existe de verdad, sale
  // en `/users/invite/sent`. Por eso las dos listas viven aquí y no en la ruta.

  // Las solicitudes que NOS han mandado y siguen pendientes de aceptar.
  //
  // Vale para dos cosas: saber a quién podemos escribirle un mensaje normal sin
  // gastar InMail (LinkedIn deja contestar una solicitud pendiente), y con qué
  // `invitation_id` hacerlo. Devuelve el id del que invita (`inviter_id`, forma
  // ACoAA…), que es el mismo provider_id que trae un comentario.
  async getReceivedInvitations(
    accountIdOverride?: string,
    opts: { maxPages?: number; pageSize?: number } = {}
  ): Promise<{ invitation_id: string; inviter_id: string; inviter_name: string | null }[]> {
    return this.listInvitations('received', accountIdOverride, opts);
  }

  // Las invitaciones que HEMOS mandado y siguen pendientes. Es el recibo de una
  // invitación: si acabas de invitar a alguien y no aparece aquí, no salió.
  async getSentInvitations(
    accountIdOverride?: string,
    opts: { maxPages?: number; pageSize?: number } = {}
  ): Promise<{ invitation_id: string; inviter_id: string; inviter_name: string | null }[]> {
    return this.listInvitations('sent', accountIdOverride, opts);
  }

  // El paginado es idéntico en las dos; lo único que cambia es de qué lado del
  // objeto sale la persona: en la recibida es `inviter`, en la enviada es el
  // `invited_user`. Se normalizan a la misma forma para que quien las compara no
  // tenga que acordarse de cuál es cuál.
  private async listInvitations(
    tipo: 'received' | 'sent',
    accountIdOverride?: string,
    opts: { maxPages?: number; pageSize?: number } = {}
  ): Promise<{ invitation_id: string; inviter_id: string; inviter_name: string | null }[]> {
    const accountId = accountIdOverride || this.accountId;
    if (!accountId) throw new Error('No Unipile account_id available for invitations');
    const pageSize = opts.pageSize ?? 50;
    const maxPages = opts.maxPages ?? 6;

    const out: { invitation_id: string; inviter_id: string; inviter_name: string | null }[] = [];
    let cursor: string | undefined;
    for (let page = 0; page < maxPages; page++) {
      const params = new URLSearchParams({ account_id: accountId, limit: String(pageSize) });
      if (cursor) params.set('cursor', cursor);
      const res = await this.request<{ items?: any[]; cursor?: string }>(
        `/api/v1/users/invite/${tipo}?${params.toString()}`
      );
      const items = res.items || [];
      for (const it of items) {
        const id = tipo === 'received' ? it?.inviter?.inviter_id : it?.invited_user_id;
        if (!id) continue;
        out.push({
          invitation_id: String(it.id || ''),
          inviter_id: String(id),
          inviter_name: (tipo === 'received' ? it?.inviter?.inviter_name : it?.invited_user) || null,
        });
      }
      cursor = res.cursor;
      if (!cursor || items.length === 0) break;
      await new Promise((r) => setTimeout(r, 250)); // pacing entre páginas
    }
    console.log(`[Unipile listInvitations:${tipo}] → ${out.length} pendientes`);
    return out;
  }

  // Los últimos mensajes de un chat. Es el recibo de un DM o de un InMail: se
  // relee el chat que devolvió el envío y se busca el mensaje. Si no está, no
  // salió, diga lo que diga el 200 de la llamada anterior.
  async getChatMessages(chatId: string, limit = 5): Promise<any[]> {
    return (await this.getChatMessagesPage(chatId, { limit })).items;
  }

  // Igual, pero devolviendo el cursor para poder SEGUIR SUBIENDO.
  //
  // ⛔ Sin esto la comprobación de un envío solo veía los últimos N mensajes, y
  // un chat que sigue vivo después de mandar el recurso empuja al nuestro fuera
  // de la ventana en un par de días: el 14/08 el DM a Mario estaba en la
  // posición 11 y el de Asier en la 10, y los dos se dieron por NO entregados
  // teniéndolos ellos en su bandeja. Los mensajes llegan del más nuevo al más
  // viejo, así que quien pagina decide cuándo parar (`buscarMensajeEnviado`).
  async getChatMessagesPage(
    chatId: string,
    opts: { limit?: number; cursor?: string } = {}
  ): Promise<{ items: any[]; cursor: string | null }> {
    const params = new URLSearchParams({ limit: String(opts.limit ?? 50) });
    if (opts.cursor) params.set('cursor', opts.cursor);
    const res = await this.request<{ items?: any[]; cursor?: string }>(
      `/api/v1/chats/${encodeURIComponent(chatId)}/messages?${params.toString()}`
    );
    return { items: res.items || [], cursor: res.cursor || null };
  }

  // Los chats que tenemos con UNA persona, buscados por su provider_id. Es como
  // se comprueba un envío del que no guardamos el chat_id (los de antes de
  // 2026-08-14).
  //
  // ⚠️ La ruta es `/chat_attendees/{provider_id}/chats`, NO `/chats?attendee_id=`:
  // ese parámetro existe pero espera el id interno de Unipile, así que con un
  // provider_id devuelve cero chats sin dar error — o sea, "no le has escrito
  // nunca" para todo el mundo. Medido el 2026-08-14.
  // Los chats de UNA BANDEJA concreta.
  //
  // ⛔ LINKEDIN TIENE DOS BUZONES Y UNIPILE SOLO ENSEÑA UNO POR DEFECTO
  // (Iker, 2026-08-14). `GET /chats` sin `folder` devuelve únicamente
  // `INBOX_LINKEDIN_CLASSIC`; los InMail mandados desde Sales Navigator viven
  // en `INBOX_LINKEDIN_SALES_NAVIGATOR` y no salían por ningún lado. Iker mandó
  // uno a mano a Susana Osorio y la herramienta seguía ofreciéndole mandarlo.
  //
  // ⚠️ Y OJO CON DOS COSAS DE ESA BANDEJA, medidas el mismo día:
  //   · Sus attendees usan ids `ACwAA…`, NO los `ACoAA…` que trae un comentario.
  //     Buscar su chat por el provider_id del comentario da 404 SIEMPRE. Por eso
  //     ahí se busca por el TEXTO del mensaje y no por la persona.
  //   · Unipile la sirve DESINCRONIZADA: el 14/08 su chat más reciente era del
  //     01/06 mientras en la web había mensajes de la víspera. O sea que NO
  //     encontrar algo aquí no prueba nada, y quien lo use tiene que tratarlo
  //     como "no lo sé" y nunca como "no ha llegado".
  async getChatsInFolder(
    folder: string,
    accountIdOverride?: string,
    limit = 50
  ): Promise<any[]> {
    const accountId = accountIdOverride || this.accountId;
    if (!accountId) throw new Error('No Unipile account_id available for chat folder');
    const params = new URLSearchParams({
      account_id: accountId,
      limit: String(limit),
      folder,
    });
    const res = await this.request<{ items?: any[] }>(`/api/v1/chats?${params.toString()}`);
    // La bandeja repite el mismo chat una vez por participante, así que se
    // deduplica por id o el barrido lee tres veces la misma conversación.
    const vistos = new Set<string>();
    return (res.items || []).filter((c: any) => {
      const id = c?.id;
      if (!id || vistos.has(id)) return false;
      vistos.add(id);
      return true;
    });
  }

  async getChatsWithAttendee(providerId: string, accountIdOverride?: string, limit = 5): Promise<any[]> {
    const accountId = accountIdOverride || this.accountId;
    if (!accountId) throw new Error('No Unipile account_id available for chat lookup');
    const res = await this.request<{ items?: any[] }>(
      `/api/v1/chat_attendees/${encodeURIComponent(providerId)}/chats` +
        `?account_id=${encodeURIComponent(accountId)}&limit=${limit}`
    );
    return res.items || [];
  }

  // List followers via /api/v1/users/followers (confirmed path). Items come
  // back reverse-chronological (most recent follower first), so callers can
  // pass `knownIds` for an incremental pull: we stop paginating the moment
  // we hit a follower we already have. Without knownIds we walk the whole
  // list up to maxPages (the initial baseline snapshot).
  //
  // UserFollower shape: { id, urn, name, headline, profile_url,
  //                       profile_picture_url, profile_picture_url_large }
  // Note: no follow date is exposed — first_seen is set by us.
  async getFollowers(
    accountIdOverride: string | undefined,
    opts: { knownIds?: Set<string>; pageSize?: number; maxPages?: number } = {}
  ): Promise<{ followers: any[]; reachedKnown: boolean; pages: number }> {
    const accountId = accountIdOverride || this.accountId;
    if (!accountId) throw new Error('No Unipile account_id available for followers fetch');
    // ⛔ 50 ES EL TECHO DEL PROVEEDOR EN ESTE ENDPOINT, NO UNA PREFERENCIA
    // (medido el 2026-08-13 contra las 3 cuentas). Estaba en 100 y Unipile
    // respondia 400 `errors/limit_too_high` — "Provider cannot accept such high
    // pagination limit" — en TODAS, asi que el sync de seguidores llevaba
    // roto desde entonces para los tres jefes, no solo para uno.
    // El corte esta acotado a mano: 50 pasa, 51 ya falla. Nada de 64 ni de 75.
    // ⚠️ Y NO se puede copiar el limite de otro endpoint: `/users/relations`
    // acepta 100 sin rechistar (probado el mismo dia) y `/posts/{id}/reactions`
    // tambien. El tope es POR ENDPOINT.
    const pageSize = opts.pageSize ?? 50;
    // 400 × 50 = 20k, el mismo techo de seguidores que habia con 200 × 100. Al
    // bajar el tamaño de pagina hay que subir las paginas o el techo se parte
    // por la mitad sin que nadie se entere.
    const maxPages = opts.maxPages ?? 400;
    const knownIds = opts.knownIds;

    const followers: any[] = [];
    let cursor: string | undefined;
    let pages = 0;
    let reachedKnown = false;

    for (let page = 0; page < maxPages; page++) {
      const params = new URLSearchParams({ account_id: accountId, limit: String(pageSize) });
      if (cursor) params.set('cursor', cursor);
      const res = await this.request<{ items?: any[]; cursor?: string; paging?: { cursor?: string } }>(
        `/api/v1/users/followers?${params.toString()}`
      );
      const items = res.items || [];
      pages = page + 1;
      if (items.length === 0) break;

      if (knownIds && knownIds.size > 0) {
        for (const it of items) {
          const id = String(it.id || it.urn || '').replace(/^urn:li:[a-z_]+:/, '');
          if (id && knownIds.has(id)) {
            reachedKnown = true;
            break;
          }
          followers.push(it);
        }
        if (reachedKnown) break;
      } else {
        followers.push(...items);
      }

      cursor = res.cursor || res.paging?.cursor;
      if (!cursor || items.length < pageSize) break;
    }

    return { followers, reachedKnown, pages };
  }

  // List the account's connections via /api/v1/users/relations. Returns a
  // Map keyed by bare provider id (member_id, urn-stripped) → connection
  // created_at (ms). Used to classify a new follower: if their id is in this
  // map they entered via a connection, otherwise it's a pure Follow (organic).
  // Reverse-chronological + cursor paginated.
  async getRelationsMap(
    accountIdOverride: string | undefined,
    opts: { pageSize?: number; maxPages?: number } = {}
  ): Promise<Map<string, number | null>> {
    const accountId = accountIdOverride || this.accountId;
    if (!accountId) throw new Error('No Unipile account_id available for relations fetch');
    const pageSize = opts.pageSize ?? 100;
    const maxPages = opts.maxPages ?? 200;

    const map = new Map<string, number | null>();
    let cursor: string | undefined;

    for (let page = 0; page < maxPages; page++) {
      const params = new URLSearchParams({ account_id: accountId, limit: String(pageSize) });
      if (cursor) params.set('cursor', cursor);
      const res = await this.request<{ items?: any[]; cursor?: string; paging?: { cursor?: string } }>(
        `/api/v1/users/relations?${params.toString()}`
      );
      const items = res.items || [];
      if (items.length === 0) break;
      for (const r of items) {
        const id = String(r.member_id || r.member_urn || '').replace(/^urn:li:[a-z_]+:/, '');
        if (id) map.set(id, typeof r.created_at === 'number' ? r.created_at : null);
      }
      cursor = res.cursor || res.paging?.cursor;
      if (!cursor || items.length < pageSize) break;
    }

    return map;
  }
}

// Shared between live detection and reclassify. LinkedIn CDN URLs lack file
// extensions, so we detect them by host + path instead of suffix.
export function scanMediaSignalsImpl(raw: any): { image: boolean; carousel: boolean; video: boolean; document: boolean } {
  const out = { image: false, carousel: false, video: false, document: false };
  if (!raw || typeof raw !== 'object') return out;

  const TEXT_KEYS = new Set(['text', 'content', 'body', 'description', 'caption', 'hook_text', 'content_text', 'title', 'subtitle', 'share_url', 'shareUrl']);
  // Author/profile branches carry the creator's own profile photo — NOT post media.
  // Skipping them prevents profile pictures from being misread as post images.
  const AUTHOR_KEYS = new Set([
    'author', 'creator', 'owner', 'user', 'by', 'posted_by', 'post_author',
    'actor', 'poster', 'sender', 'profile', 'author_profile',
  ]);
  // Key name heuristic — match keys that START with a media-ish stem (at word
  // start or after underscore). We deliberately don't anchor the end so that
  // plurals and longer forms like 'attachments', 'thumbnails', 'image_urls' all
  // qualify — the previous version anchored `(?:$|_)` and missed `attachments`,
  // which caused 3-photo carousels to be detected as single-image posts.
  const MEDIA_KEY_RE = /(?:^|_)(attach|media|image|img|photo|picture|thumb|video|document|doc|file|asset|gallery|carousel|visual|preview|cover)/i;
  const IMAGE_EXT_RE = /\.(jpe?g|png|webp|gif|heic|avif|bmp)(\?|#|$)/i;
  const VIDEO_EXT_RE = /\.(mp4|webm|mov|m4v|mkv|avi)(\?|#|$)/i;
  const DOC_EXT_RE = /\.(pdf|pptx?|docx?|xlsx?|csv)(\?|#|$)/i;

  // LinkedIn CDN signatures — authoritative regardless of tree position.
  const LICDN_HOST_RE = /(?:media|dms|static)\.licdn\.com/i;
  // Feed photo attachments live under /image/ or /dms/image/ paths
  // Document slides live under /document/ or /dms/document/ paths
  // Videos live under /dms/playlist/ (HLS manifest) or /vid/ or contain 'video/'
  const LICDN_VIDEO_PATH_RE = /\/(?:playlist|vid|video)\//i;
  const LICDN_DOC_PATH_RE = /\/(?:document|documents)\//i;
  const LICDN_IMAGE_PATH_RE = /\/(?:image|feedshare|mediaproxy)/i;

  const classifyString = (s: string): 'image' | 'video' | 'document' | null => {
    if (!s || typeof s !== 'string') return null;
    if (VIDEO_EXT_RE.test(s)) return 'video';
    if (DOC_EXT_RE.test(s)) return 'document';
    if (IMAGE_EXT_RE.test(s)) return 'image';
    if (LICDN_HOST_RE.test(s)) {
      if (LICDN_VIDEO_PATH_RE.test(s)) return 'video';
      if (LICDN_DOC_PATH_RE.test(s)) return 'document';
      if (LICDN_IMAGE_PATH_RE.test(s)) return 'image';
    }
    return null;
  };

  const normType = (t: any) => (typeof t === 'string' ? t.toLowerCase() : '');

  // Track every distinct image URL we see so we can promote image → carousel
  // even when the enclosing array doesn't live under a media-ish key.
  const imageUrls = new Set<string>();

  const walk = (node: any, underMedia: boolean) => {
    if (node == null) return;
    if (typeof node === 'string') {
      const kind = classifyString(node);
      if (kind) {
        out[kind] = true;
        if (kind === 'image') imageUrls.add(node);
      } else if (underMedia && /^https?:\/\//i.test(node)) {
        out.image = true;
        imageUrls.add(node);
      }
      return;
    }
    if (Array.isArray(node)) {
      if (underMedia && node.length > 1) out.carousel = true;
      for (const el of node) walk(el, underMedia);
      return;
    }
    if (typeof node !== 'object') return;

    const t = normType(node.type ?? node.media_type ?? node.attachment_type ?? node.kind);
    if (t) {
      if (t.includes('video')) out.video = true;
      else if (t.includes('document') || t.includes('pdf')) out.document = true;
      else if (t.includes('image') || t.includes('photo') || t.includes('picture') || t.includes('img')) out.image = true;
    }

    for (const urlKey of ['url', 'download_url', 'image_url', 'thumbnail_url', 'video_url', 'source_url', 'src', 'href', 'link', 'uri']) {
      const v = node[urlKey];
      if (typeof v === 'string') {
        const kind = classifyString(v);
        if (kind) {
          out[kind] = true;
          if (kind === 'image') imageUrls.add(v);
        } else if (underMedia) {
          out.image = true;
          imageUrls.add(v);
        }
      }
    }

    for (const [k, v] of Object.entries(node)) {
      if (TEXT_KEYS.has(k)) continue;
      if (AUTHOR_KEYS.has(k)) continue;
      const childUnderMedia = underMedia || MEDIA_KEY_RE.test(k);
      walk(v, childUnderMedia);
    }
  };

  walk(raw, false);

  // Final safety net: if we found 2+ distinct image URLs anywhere (deduped),
  // treat it as a carousel. Catches cases where the array lives under a key
  // the name heuristic doesn't recognize but the contents are clearly multiple
  // separate images.
  if (imageUrls.size >= 2) out.carousel = true;

  return out;
}

export const unipileService = new UnipileService();