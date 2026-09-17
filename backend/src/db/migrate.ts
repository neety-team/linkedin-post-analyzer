import pool from './index';

const migration = `
  CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

  CREATE TABLE IF NOT EXISTS creators (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    linkedin_url TEXT UNIQUE NOT NULL,
    linkedin_id TEXT,
    name TEXT,
    headline TEXT,
    followers_count INTEGER DEFAULT 0,
    connections_count INTEGER DEFAULT 0,
    profile_image_url TEXT,
    last_scraped_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
  );

  CREATE TABLE IF NOT EXISTS posts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    creator_id UUID NOT NULL REFERENCES creators(id) ON DELETE CASCADE,
    linkedin_post_id TEXT UNIQUE,
    content_text TEXT,
    content_type TEXT DEFAULT 'text'
      CHECK (content_type IN (
        'text','text_image','text_carousel','text_video','text_document',
        'image','carousel','video','document','poll','article'
      )),
    published_at TIMESTAMP WITH TIME ZONE,
    likes_count INTEGER DEFAULT 0,
    comments_count INTEGER DEFAULT 0,
    reposts_count INTEGER DEFAULT 0,
    impressions_count INTEGER,
    engagement_score FLOAT DEFAULT 0,
    outlier_ratio FLOAT DEFAULT 0,
    is_outlier BOOLEAN DEFAULT FALSE,
    hook_text TEXT,
    word_count INTEGER DEFAULT 0,
    has_hashtags BOOLEAN DEFAULT FALSE,
    hashtags TEXT[] DEFAULT '{}',
    has_emoji BOOLEAN DEFAULT FALSE,
    has_call_to_action BOOLEAN DEFAULT FALSE,
    language TEXT,
    post_url TEXT,
    raw_data JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
  );

  CREATE INDEX IF NOT EXISTS idx_posts_creator_id ON posts(creator_id);
  CREATE INDEX IF NOT EXISTS idx_posts_is_outlier ON posts(is_outlier);
  CREATE INDEX IF NOT EXISTS idx_posts_published_at ON posts(published_at);
  CREATE INDEX IF NOT EXISTS idx_posts_content_type ON posts(content_type);

  -- v2: text structure & engagement ratio fields
  -- Marca de que el post YA NO EXISTE en LinkedIn (lo borro el autor). No se
  -- borra la fila: sus metricas siguen valiendo para analisis historico, solo
  -- deja de aparecer en Live Posts.
  ALTER TABLE posts ADD COLUMN IF NOT EXISTS deleted_from_linkedin_at TIMESTAMPTZ;
  -- Pilar corregido A MANO. El clasificador no lo vuelve a tocar: hay formatos
  -- que no puede acertar por estructura (mapa-meme sin menciones, fichas con la
  -- flecha en medio) y la correccion humana tiene que sobrevivir al reproceso.
  ALTER TABLE posts ADD COLUMN IF NOT EXISTS pillar_manual BOOLEAN DEFAULT FALSE;
  ALTER TABLE posts ADD COLUMN IF NOT EXISTS char_count INTEGER DEFAULT 0;
  ALTER TABLE posts ADD COLUMN IF NOT EXISTS line_break_count INTEGER DEFAULT 0;
  ALTER TABLE posts ADD COLUMN IF NOT EXISTS has_aggressive_spacing BOOLEAN DEFAULT FALSE;
  ALTER TABLE posts ADD COLUMN IF NOT EXISTS hook_type TEXT DEFAULT 'other';
  ALTER TABLE posts ADD COLUMN IF NOT EXISTS post_structure TEXT DEFAULT 'other';
  ALTER TABLE posts ADD COLUMN IF NOT EXISTS comment_like_ratio FLOAT DEFAULT 0;
  ALTER TABLE posts ADD COLUMN IF NOT EXISTS share_like_ratio FLOAT DEFAULT 0;

  -- v3: text psychology/tone analysis
  ALTER TABLE posts ADD COLUMN IF NOT EXISTS text_tone TEXT DEFAULT 'neutral';

  -- v4: creator location & timezone
  ALTER TABLE creators ADD COLUMN IF NOT EXISTS location TEXT;
  ALTER TABLE creators ADD COLUMN IF NOT EXISTS timezone TEXT;
  ALTER TABLE creators ADD COLUMN IF NOT EXISTS utc_offset FLOAT;

  -- v5: Strategic Network module
  CREATE TABLE IF NOT EXISTS commenter_profile (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    headline TEXT,
    niche TEXT,
    expertise TEXT,
    tone TEXT DEFAULT 'direct' CHECK (tone IN ('direct','provocative','empathetic','technical')),
    objectives TEXT,
    topics TEXT[] DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
  );

  CREATE TABLE IF NOT EXISTS network_creators (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    linkedin_url TEXT UNIQUE NOT NULL,
    linkedin_id TEXT,
    name TEXT,
    headline TEXT,
    followers_count INTEGER DEFAULT 0,
    profile_image_url TEXT,
    tier INTEGER NOT NULL DEFAULT 2 CHECK (tier IN (1,2,3)),
    last_fetched_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
  );

  CREATE TABLE IF NOT EXISTS network_posts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    network_creator_id UUID NOT NULL REFERENCES network_creators(id) ON DELETE CASCADE,
    linkedin_post_id TEXT UNIQUE,
    content_text TEXT,
    hook_text TEXT,
    published_at TIMESTAMPTZ,
    likes_count INTEGER DEFAULT 0,
    comments_count INTEGER DEFAULT 0,
    reposts_count INTEGER DEFAULT 0,
    post_url TEXT,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending','commented','skipped')),
    created_at TIMESTAMPTZ DEFAULT NOW()
  );
  CREATE INDEX IF NOT EXISTS idx_network_posts_creator ON network_posts(network_creator_id);
  CREATE INDEX IF NOT EXISTS idx_network_posts_published ON network_posts(published_at);
  CREATE INDEX IF NOT EXISTS idx_network_posts_status ON network_posts(status);

  CREATE TABLE IF NOT EXISTS network_comments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    network_post_id UUID NOT NULL REFERENCES network_posts(id) ON DELETE CASCADE,
    angle TEXT NOT NULL CHECK (angle IN ('personal_experience','provocative_question','plot_twist')),
    comment_text TEXT NOT NULL,
    is_selected BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
  );
  CREATE INDEX IF NOT EXISTS idx_network_comments_post ON network_comments(network_post_id);

  -- v6: Creator profile for Post Creator (single-row)
  CREATE TABLE IF NOT EXISTS creator_profile (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    linkedin_url TEXT,
    linkedin_id TEXT,
    name TEXT,
    headline TEXT,
    profile_image_url TEXT,
    followers_count INTEGER DEFAULT 0,
    company TEXT,
    product TEXT,
    positioning TEXT,
    tone_style TEXT,
    my_posts JSONB DEFAULT '[]',
    last_fetched_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
  );

  -- v7: Commenter profile voice redesign
  ALTER TABLE commenter_profile ADD COLUMN IF NOT EXISTS voice_style TEXT;
  ALTER TABLE commenter_profile ADD COLUMN IF NOT EXISTS worldview TEXT;
  ALTER TABLE commenter_profile ADD COLUMN IF NOT EXISTS signature_moves TEXT;
  ALTER TABLE commenter_profile ADD COLUMN IF NOT EXISTS avoid TEXT;

  -- v8: Creator Discovery module
  CREATE TABLE IF NOT EXISTS discovered_creators (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    linkedin_url TEXT UNIQUE NOT NULL,
    linkedin_id TEXT,
    name TEXT,
    headline TEXT,
    followers_count INTEGER DEFAULT 0,
    profile_image_url TEXT,
    location TEXT,
    search_query TEXT,
    niche_tags TEXT[] DEFAULT '{}',
    avg_engagement FLOAT DEFAULT 0,
    max_engagement FLOAT DEFAULT 0,
    outlier_count INTEGER DEFAULT 0,
    outlier_ratio_avg FLOAT DEFAULT 0,
    total_posts_sampled INTEGER DEFAULT 0,
    virality_score FLOAT DEFAULT 0,
    followers_prev INTEGER,
    followers_prev_at TIMESTAMPTZ,
    enriched_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
  );
  CREATE INDEX IF NOT EXISTS idx_disc_query ON discovered_creators(search_query);
  CREATE INDEX IF NOT EXISTS idx_disc_virality ON discovered_creators(virality_score DESC);

  -- v9: Post Ideas directory
  CREATE TABLE IF NOT EXISTS post_ideas (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    raw_content TEXT NOT NULL,
    source_type TEXT DEFAULT 'manual' CHECK (source_type IN ('manual','book_quote','demo_moment','observation','meeting')),
    tags TEXT[] DEFAULT '{}',
    generated_post TEXT,
    generation_score INTEGER,
    status TEXT DEFAULT 'draft' CHECK (status IN ('draft','generating','ready')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
  );
  CREATE INDEX IF NOT EXISTS idx_post_ideas_status ON post_ideas(status);
  CREATE INDEX IF NOT EXISTS idx_post_ideas_created ON post_ideas(created_at DESC);

  -- v10: Store 3 archetype variants before user selects one
  ALTER TABLE post_ideas ADD COLUMN IF NOT EXISTS generated_variants JSONB;

  -- v11: Topic classification for outlier inspiration browsing
  ALTER TABLE posts ADD COLUMN IF NOT EXISTS topic TEXT;
  CREATE INDEX IF NOT EXISTS idx_posts_topic ON posts(topic);

  -- v12: Network comment angles redesigned (3 contrarians + reframe)
  ALTER TABLE network_comments DROP CONSTRAINT IF EXISTS network_comments_angle_check;

  -- v14: 9 comment types (reinforce, 3 contrarian, reframe, add_missing, steal_phrase, warm_supportive, better_question)
  ALTER TABLE network_comments ADD CONSTRAINT network_comments_angle_check
    CHECK (angle IN (
      'reinforce','contrarian_data','contrarian_premise','contrarian_survivorship',
      'reframe','add_missing','steal_phrase','warm_supportive','better_question',
      'contrarian_reflective','contrarian_direct','supportive',
      'personal_experience','provocative_question','plot_twist'
    ));

  -- v15: Media URLs + content type for network posts (view creative without leaving app)
  ALTER TABLE network_posts ADD COLUMN IF NOT EXISTS content_type TEXT DEFAULT 'text';
  ALTER TABLE network_posts ADD COLUMN IF NOT EXISTS media_urls TEXT[] DEFAULT '{}';

  -- v13: Managed accounts flag for the BI dashboard
  ALTER TABLE creators ADD COLUMN IF NOT EXISTS is_managed BOOLEAN DEFAULT FALSE;
  CREATE INDEX IF NOT EXISTS idx_creators_is_managed ON creators(is_managed);

  -- v16: Per-creator Unipile account ID override — lets each managed account
  -- be scraped with its own authenticated Unipile account so impressions come through.
  ALTER TABLE creators ADD COLUMN IF NOT EXISTS unipile_account_id TEXT;

  -- v17: Post snapshots — time-series rows captured every 15 min during the
  -- first 6 hours after publication, so we can plot the impressions/engagement curve.
  CREATE TABLE IF NOT EXISTS post_snapshots (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
    captured_at TIMESTAMPTZ DEFAULT NOW(),
    impressions_count INTEGER,
    likes_count INTEGER,
    comments_count INTEGER,
    reposts_count INTEGER
  );
  CREATE INDEX IF NOT EXISTS idx_snapshots_post ON post_snapshots(post_id, captured_at);

  -- v19 + v29: single canonical commenter voice named 'Neety'. v19 originally
  -- seeded per-person 'Iker'/'Unai' rows; v29 collapses to ONE generic voice.
  -- Fully idempotent and safe to run on every boot (no re-seeding of the retired
  -- names, and the rename is guarded so it never collides with the unique index).
  ALTER TABLE commenter_profile ADD COLUMN IF NOT EXISTS name TEXT;
  CREATE UNIQUE INDEX IF NOT EXISTS uniq_commenter_profile_name ON commenter_profile (LOWER(name));
  -- Legacy singleton (pre-v19, name IS NULL) becomes the Neety row.
  UPDATE commenter_profile SET name = 'Neety' WHERE name IS NULL;
  -- One-time rename of the previously-seeded 'Iker' row → 'Neety' (keeps its
  -- filled-in content), only when a 'Neety' row does not already exist.
  UPDATE commenter_profile SET name = 'Neety'
    WHERE LOWER(name) = 'iker'
      AND NOT EXISTS (SELECT 1 FROM commenter_profile WHERE LOWER(name) = 'neety');
  -- Remove the retired per-person rows: 'Unai' always; a stray 'Iker' only once a
  -- 'Neety' row already exists (so we never delete the sole content row).
  DELETE FROM commenter_profile WHERE LOWER(name) = 'unai';
  DELETE FROM commenter_profile WHERE LOWER(name) = 'iker'
    AND EXISTS (SELECT 1 FROM commenter_profile WHERE LOWER(name) = 'neety');
  -- Ensure a 'Neety' row exists on a fresh DB.
  INSERT INTO commenter_profile (name)
    SELECT 'Neety'
    WHERE NOT EXISTS (SELECT 1 FROM commenter_profile WHERE LOWER(name) = 'neety');

  -- v18: Content-type taxonomy split — posts that mix text with media now get
  -- dedicated combined categories (text_image, text_carousel, text_video,
  -- text_document) so the plain 'text' bucket contains text-only posts. Also
  -- renames text_only → text for clarity. Migration is idempotent: existing
  -- rows are remapped based on presence of content_text.
  DO $mig18$
  BEGIN
    -- posts: drop old CHECK if present
    IF EXISTS (
      SELECT 1 FROM information_schema.table_constraints
      WHERE table_name = 'posts' AND constraint_name = 'posts_content_type_check'
    ) THEN
      ALTER TABLE posts DROP CONSTRAINT posts_content_type_check;
    END IF;

    -- Remap existing posts rows
    UPDATE posts SET content_type =
      CASE
        WHEN content_type = 'text_only' THEN 'text'
        WHEN content_type = 'image' AND content_text IS NOT NULL AND LENGTH(TRIM(content_text)) > 0 THEN 'text_image'
        WHEN content_type = 'carousel' AND content_text IS NOT NULL AND LENGTH(TRIM(content_text)) > 0 THEN 'text_carousel'
        WHEN content_type = 'video' AND content_text IS NOT NULL AND LENGTH(TRIM(content_text)) > 0 THEN 'text_video'
        WHEN content_type = 'document' AND content_text IS NOT NULL AND LENGTH(TRIM(content_text)) > 0 THEN 'text_document'
        ELSE content_type
      END
    WHERE content_type IN ('text_only','image','carousel','video','document');

    -- Add new CHECK on posts
    ALTER TABLE posts ADD CONSTRAINT posts_content_type_check
      CHECK (content_type IN (
        'text','text_image','text_carousel','text_video','text_document',
        'image','carousel','video','document','poll','article'
      ));
    ALTER TABLE posts ALTER COLUMN content_type SET DEFAULT 'text';

    -- network_posts: same treatment
    IF EXISTS (
      SELECT 1 FROM information_schema.table_constraints
      WHERE table_name = 'network_posts' AND constraint_name = 'network_posts_content_type_check'
    ) THEN
      ALTER TABLE network_posts DROP CONSTRAINT network_posts_content_type_check;
    END IF;

    UPDATE network_posts SET content_type =
      CASE
        WHEN content_type = 'text_only' THEN 'text'
        WHEN content_type = 'image' AND content_text IS NOT NULL AND LENGTH(TRIM(content_text)) > 0 THEN 'text_image'
        WHEN content_type = 'carousel' AND content_text IS NOT NULL AND LENGTH(TRIM(content_text)) > 0 THEN 'text_carousel'
        WHEN content_type = 'video' AND content_text IS NOT NULL AND LENGTH(TRIM(content_text)) > 0 THEN 'text_video'
        WHEN content_type = 'document' AND content_text IS NOT NULL AND LENGTH(TRIM(content_text)) > 0 THEN 'text_document'
        ELSE content_type
      END
    WHERE content_type IN ('text_only','image','carousel','video','document');

    ALTER TABLE network_posts ALTER COLUMN content_type SET DEFAULT 'text';
  END $mig18$;

  -- v20: Follower growth snapshots — one row per creator per day, upserted on
  -- every scrape. Lets us plot how an account's followers evolve alongside
  -- their engagement curve. Keeping one row per day keeps storage trivial
  -- (a few hundred rows/creator/year) and gives plenty of resolution for
  -- growth curves — LinkedIn follower deltas aren't interesting sub-daily.
  CREATE TABLE IF NOT EXISTS creator_follower_snapshots (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    creator_id UUID NOT NULL REFERENCES creators(id) ON DELETE CASCADE,
    captured_on DATE NOT NULL DEFAULT CURRENT_DATE,
    captured_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    followers_count INTEGER NOT NULL
  );
  CREATE UNIQUE INDEX IF NOT EXISTS uniq_follower_snapshot_day
    ON creator_follower_snapshots (creator_id, captured_on);
  CREATE INDEX IF NOT EXISTS idx_follower_snapshots_creator
    ON creator_follower_snapshots (creator_id, captured_on);

  -- Seed one snapshot per managed creator with today's count, so the chart
  -- has a starting point. Safe to re-run: the unique index kicks in.
  INSERT INTO creator_follower_snapshots (creator_id, captured_on, followers_count)
    SELECT id, CURRENT_DATE, COALESCE(followers_count, 0)
      FROM creators
     WHERE is_managed = TRUE
  ON CONFLICT (creator_id, captured_on) DO NOTHING;

  -- v17: Allow 'generated' source_type for AI-brainstormed ideas (Inspiration → Generate).
  -- The original CREATE TABLE at v9 only listed 5 source types; CREATE TABLE IF NOT EXISTS
  -- skips re-applying the constraint, so we explicitly drop & recreate it here.
  ALTER TABLE post_ideas DROP CONSTRAINT IF EXISTS post_ideas_source_type_check;
  ALTER TABLE post_ideas ADD CONSTRAINT post_ideas_source_type_check
    CHECK (source_type IN ('manual','book_quote','demo_moment','observation','meeting','generated'));

  -- v21: Profile-view snapshots — daily count of recent profile viewers per
  -- managed creator. Mirrors creator_follower_snapshots (1 row per creator
  -- per day, unique on (creator_id, captured_on), upserted during scrape).
  -- Source is LinkedIn's WVMP ("Who Viewed My Profile") feed proxied via
  -- Unipile's raw-data passthrough — premium accounts return ~90 days of
  -- viewers; free accounts only see a teaser so the metric is only useful
  -- on Premium/Sales-Nav.
  CREATE TABLE IF NOT EXISTS creator_profile_view_snapshots (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    creator_id UUID NOT NULL REFERENCES creators(id) ON DELETE CASCADE,
    captured_on DATE NOT NULL DEFAULT CURRENT_DATE,
    captured_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    -- Number of viewers visible in this snapshot (Premium = ~90-day window)
    views_count INTEGER NOT NULL,
    -- Full WVMP response so we can later mine individual viewers without
    -- needing to re-fetch. JSONB so we can index into it if needed.
    raw_response JSONB
  );
  CREATE UNIQUE INDEX IF NOT EXISTS uniq_profile_view_snapshot_day
    ON creator_profile_view_snapshots (creator_id, captured_on);
  CREATE INDEX IF NOT EXISTS idx_profile_view_snapshots_creator
    ON creator_profile_view_snapshots (creator_id, captured_on);

  -- v22: One-shot cleanup. The 2026-05-05/06 snapshots were captured before
  -- the WVMP pagination fix and only saw LinkedIn's default first page
  -- (~22 elements aggregated across both managed creators), so the chart
  -- showed a flat 22→22 line with 0% deltas. Wiping them lets the curve
  -- restart from real paginated counts on the next snapshot tick.
  -- Idempotent: if these rows are already gone (re-runs / fresh installs),
  -- the DELETE is a no-op.
  DELETE FROM creator_profile_view_snapshots
    WHERE captured_on IN (DATE '2026-05-05', DATE '2026-05-06');

  -- v23: Per-viewer timestamps for the WVMP feed.
  --
  -- Before this change, views_count = "viewers currently visible in the WVMP
  -- feed" (a rolling ~90-day window). Plotting that daily produced flat
  -- stretches on consecutive captures because the feed itself rarely moves
  -- by much from one day to the next, and the cumulative number never lined
  -- up with LinkedIn's "viewers in last 28 days" headline (which also
  -- includes anonymous viewers we can't fetch element-by-element).
  --
  -- viewer_timestamps stores the ms-epoch viewedAt for every viewer in the
  -- feed. We bucket by day at read time to compute true "new viewers per
  -- day" — matching what LinkedIn's UI shows. A single capture backfills
  -- ~90 days of bucket data because each WVMP response carries the full
  -- rolling history. Compact (8 bytes × ≤1000 viewers per capture ≤ 8 KB)
  -- so we can keep it inline without the raw_response blow-up.
  ALTER TABLE creator_profile_view_snapshots
    ADD COLUMN IF NOT EXISTS viewer_timestamps BIGINT[];

  -- v24: Backfill Iker's April follower history from LinkedIn's own
  -- exported analytics. We only began snapshotting on 2026-04-24
  -- (7617 followers), but the first post went viral on 2026-04-14.
  -- LinkedIn Creator Analytics → Followers export gives the real
  -- "new followers per day"; anchored on our measured 2026-04-24=7617
  -- (which matches LinkedIn's 2026-05-18 total of 8314 exactly), we
  -- reconstruct the end-of-day cumulative total for every missing day.
  -- These are NOT estimates — they are LinkedIn's exported numbers
  -- arithmetic'd back from a verified anchor, so the curve stays 100%
  -- real and splices into the measured series with no discontinuity.
  --
  -- ON CONFLICT DO NOTHING: never overwrites a measured snapshot
  -- (2026-04-24 onward already exists). Guarded so it only runs if
  -- Iker's creator row is present. Safe to re-run.
  INSERT INTO creator_follower_snapshots (creator_id, captured_on, followers_count)
  SELECT v.creator_id::uuid, v.captured_on::date, v.followers_count
  FROM (VALUES
    ('3d545376-057c-48db-8b45-c5c5510110bb', '2026-04-12', 7053),
    ('3d545376-057c-48db-8b45-c5c5510110bb', '2026-04-13', 7073),
    ('3d545376-057c-48db-8b45-c5c5510110bb', '2026-04-14', 7288),
    ('3d545376-057c-48db-8b45-c5c5510110bb', '2026-04-15', 7389),
    ('3d545376-057c-48db-8b45-c5c5510110bb', '2026-04-16', 7454),
    ('3d545376-057c-48db-8b45-c5c5510110bb', '2026-04-17', 7487),
    ('3d545376-057c-48db-8b45-c5c5510110bb', '2026-04-18', 7504),
    ('3d545376-057c-48db-8b45-c5c5510110bb', '2026-04-19', 7515),
    ('3d545376-057c-48db-8b45-c5c5510110bb', '2026-04-20', 7533),
    ('3d545376-057c-48db-8b45-c5c5510110bb', '2026-04-21', 7572),
    ('3d545376-057c-48db-8b45-c5c5510110bb', '2026-04-22', 7594),
    ('3d545376-057c-48db-8b45-c5c5510110bb', '2026-04-23', 7606)
  ) AS v(creator_id, captured_on, followers_count)
  WHERE EXISTS (SELECT 1 FROM creators c WHERE c.id = v.creator_id::uuid)
  ON CONFLICT (creator_id, captured_on) DO NOTHING;

  -- v23: Claude API usage log. One row per messages.create / messages.stream
  -- call. The wrapper in services/claudeClient.ts inserts here so the Usage
  -- page can show where the Anthropic spend actually goes. cost_usd is
  -- computed at insert time from the per-model pricing table — the values
  -- don't change retroactively if Anthropic adjusts pricing, but the raw
  -- token counts are preserved so we can recompute if needed.
  CREATE TABLE IF NOT EXISTS claude_usage_logs (
    id BIGSERIAL PRIMARY KEY,
    -- High-level label for which feature triggered the call, e.g.
    -- "post_creator_chat", "reply_generator", "ideas_variant".
    feature TEXT NOT NULL,
    model TEXT NOT NULL,
    input_tokens INTEGER NOT NULL DEFAULT 0,
    output_tokens INTEGER NOT NULL DEFAULT 0,
    -- Cache hits cost 10% of normal input; cache writes cost 25% more.
    -- Tracked separately so the UI can show effective cache savings.
    cache_read_tokens INTEGER NOT NULL DEFAULT 0,
    cache_write_tokens INTEGER NOT NULL DEFAULT 0,
    cost_usd NUMERIC(10,6) NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );
  CREATE INDEX IF NOT EXISTS idx_claude_usage_created ON claude_usage_logs (created_at DESC);
  CREATE INDEX IF NOT EXISTS idx_claude_usage_feature ON claude_usage_logs (feature, created_at DESC);

  -- v24: Per-post LinkedIn reaction breakdown. Populated only for outliers
  -- via the reactionMixBackfill job (which uses a dedicated Unipile account
  -- to keep the load off Iker/Unai's profiles). Shape is
  -- { LIKE: n, FUNNY: n, CELEBRATE: n, INSIGHTFUL: n, SUPPORT: n,
  --   EMPATHY: n, INTEREST: n, total: n, sampled: n }. "total" is the
  --   reaction_counter the post object exposes; "sampled" is how many we
  --   actually saw on the reactions endpoint (sometimes we cap pagination).
  -- The funny_pct heuristic (FUNNY/total > 0.25) is what flags memes
  -- without needing Claude to read the text.
  ALTER TABLE posts ADD COLUMN IF NOT EXISTS reaction_mix JSONB;
  CREATE INDEX IF NOT EXISTS idx_posts_reaction_mix_funny
    ON posts (((reaction_mix->>'FUNNY')::int))
    WHERE reaction_mix IS NOT NULL;

  -- v25: Individual follower roster per managed creator, for organic-growth
  -- tracking. One row per (creator, follower). first_seen_on is the day WE
  -- first detected them (the followers endpoint doesn't expose a follow
  -- date). is_baseline = TRUE for everyone captured in the initial full
  -- snapshot — those are pre-existing followers we can't retroactively
  -- classify, so they're excluded from the "new organic followers/day"
  -- series. classification:
  --   'pure_follow' → not in the creator's connections when detected:
  --                   they followed by hitting Follow, i.e. organic pull.
  --   'connection'  → was in connections when detected: entered via a
  --                   connection (inbound OR outbound — Phase 2 with sent
  --                   invitations will split these).
  --   'unknown'     → couldn't resolve connection membership.
  CREATE TABLE IF NOT EXISTS creator_followers (
    creator_id UUID NOT NULL REFERENCES creators(id) ON DELETE CASCADE,
    follower_provider_id TEXT NOT NULL,
    name TEXT,
    headline TEXT,
    profile_url TEXT,
    profile_picture_url TEXT,
    first_seen_on DATE NOT NULL DEFAULT CURRENT_DATE,
    is_baseline BOOLEAN NOT NULL DEFAULT FALSE,
    classification TEXT NOT NULL DEFAULT 'unknown'
      CHECK (classification IN ('pure_follow','connection','unknown')),
    is_connection BOOLEAN NOT NULL DEFAULT FALSE,
    connection_created_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (creator_id, follower_provider_id)
  );
  CREATE INDEX IF NOT EXISTS idx_creator_followers_seen
    ON creator_followers (creator_id, first_seen_on);
  CREATE INDEX IF NOT EXISTS idx_creator_followers_class
    ON creator_followers (creator_id, classification, first_seen_on);

  -- Tracks whether each managed creator has had its one-time baseline
  -- snapshot taken yet, so the daily sync knows to run the full capture
  -- first (marking everyone is_baseline) before switching to incremental.
  CREATE TABLE IF NOT EXISTS creator_follower_sync_state (
    creator_id UUID PRIMARY KEY REFERENCES creators(id) ON DELETE CASCADE,
    baseline_done BOOLEAN NOT NULL DEFAULT FALSE,
    baseline_count INTEGER,
    last_synced_at TIMESTAMPTZ,
    last_new_count INTEGER
  );

  -- v19: Permanent image-bytes cache for visual posts.
  -- LinkedIn CDN URLs rotate every few weeks. Storing the actual image
  -- bytes once means we keep visual context forever (even after the URL
  -- dies, even if the post is deleted, even across server redeploys).
  -- The Post Creator chat reads from this cache directly and ships the
  -- image to Anthropic as base64 instead of a URL, removing the entire
  -- "Unable to download" failure mode at the source.
  --
  -- Size budget: ~100KB avg per image, ~500 posts in the rolling
  -- window → ~50MB max. Negligible for Railway Postgres.
  --
  -- cached_image_source_url remembers WHICH URL we cached from, so if a
  -- later raw_data refresh surfaces a DIFFERENT URL (creator edited the
  -- post / replaced the image), we know to re-fetch.
  ALTER TABLE posts ADD COLUMN IF NOT EXISTS cached_image_b64 TEXT;
  ALTER TABLE posts ADD COLUMN IF NOT EXISTS cached_image_media_type TEXT;
  ALTER TABLE posts ADD COLUMN IF NOT EXISTS cached_image_source_url TEXT;
  ALTER TABLE posts ADD COLUMN IF NOT EXISTS cached_image_cached_at TIMESTAMPTZ;
  -- v28: cached image pixel dimensions. Anthropic bills image input by
  -- RESOLUTION (~tokens = w*h/750), not file size — so the downscale
  -- decision + the cost diagnostic must be driven by dimensions, not KB.
  -- Stored when an image is cached/downscaled; lets us skip re-decoding
  -- already-small images and report a truthful token estimate.
  ALTER TABLE posts ADD COLUMN IF NOT EXISTS cached_image_w INTEGER;
  ALTER TABLE posts ADD COLUMN IF NOT EXISTS cached_image_h INTEGER;

  -- v26: Kanban pipeline for post_ideas + outlier-origin trace. The existing
  -- \`status\` column tracks the generation lifecycle (draft → generating →
  -- ready) and stays untouched. \`pipeline_status\` is the editorial workflow
  -- the user moves cards through: proposed → in_progress → scheduled →
  -- published. Defaults to 'proposed' so new ideas land in the first column.
  --
  -- source_outlier_post_id traces ideas that came from the Tinder-style
  -- outlier swipe so the kanban card can show the original outlier.
  ALTER TABLE post_ideas ADD COLUMN IF NOT EXISTS pipeline_status TEXT NOT NULL DEFAULT 'proposed';
  ALTER TABLE post_ideas DROP CONSTRAINT IF EXISTS post_ideas_pipeline_status_check;
  ALTER TABLE post_ideas ADD CONSTRAINT post_ideas_pipeline_status_check
    CHECK (pipeline_status IN ('proposed','in_progress','scheduled','published','discarded'));
  CREATE INDEX IF NOT EXISTS idx_post_ideas_pipeline ON post_ideas(pipeline_status);

  ALTER TABLE post_ideas ADD COLUMN IF NOT EXISTS source_outlier_post_id UUID
    REFERENCES posts(id) ON DELETE SET NULL;
  CREATE INDEX IF NOT EXISTS idx_post_ideas_source_outlier ON post_ideas(source_outlier_post_id);

  -- One swipe per (user-ish) per outlier so the deck never repeats. We don't
  -- have a real user model, so the swipe roster is global — fine for a 2-user
  -- internal tool. \`action\` is 'like' (saved as idea) or 'skip' (filtered out
  -- of the deck next time).
  CREATE TABLE IF NOT EXISTS outlier_swipes (
    post_id UUID PRIMARY KEY REFERENCES posts(id) ON DELETE CASCADE,
    action TEXT NOT NULL CHECK (action IN ('like','skip')),
    idea_id UUID REFERENCES post_ideas(id) ON DELETE SET NULL,
    swiped_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );
  CREATE INDEX IF NOT EXISTS idx_outlier_swipes_action ON outlier_swipes(action);

  -- v27: reactions we've sent to comments on our own posts (Comentarios tab).
  -- LinkedIn allows one reaction per comment, and Unipile's comment object
  -- doesn't reliably expose the viewer's own reaction back — so we persist
  -- every reaction we successfully send here. The comments endpoint joins
  -- this table to tell the UI which comments are already reacted (and with
  -- which type), so the state survives reloads and the reaction bar can
  -- lock once set. Keyed by the comment's LinkedIn social id (unique across
  -- LinkedIn), with post_id kept for scoping / cleanup on post deletion.
  CREATE TABLE IF NOT EXISTS comment_reactions (
    comment_social_id TEXT PRIMARY KEY,
    post_id UUID REFERENCES posts(id) ON DELETE CASCADE,
    reaction_type TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );
  CREATE INDEX IF NOT EXISTS idx_comment_reactions_post ON comment_reactions(post_id);

  -- v28: the resource we sent to each person who commented the keyword on a
  -- lead-magnet post (Lead Magnet tab). Unlike replies (LinkedIn tells us
  -- who we answered via answered_by_author) and reactions (Unipile's
  -- user_reacted), a DM or an invitation leaves NO trace on the comment
  -- object — so without this table a reload would re-offer someone we
  -- already wrote to, and they'd get the resource twice. Keyed by
  -- (comment_social_id, kind) so the same person can legitimately get an
  -- invite AND, later, a DM once they accept.
  --
  -- Failures are stored too (status='failed' + error): the whole point of
  -- the degree pre-check is knowing who we couldn't reach, and that answer
  -- must survive a reload.
  CREATE TABLE IF NOT EXISTS lead_magnet_sends (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    post_id UUID REFERENCES posts(id) ON DELETE CASCADE,
    comment_social_id TEXT NOT NULL,
    provider_id TEXT NOT NULL,
    kind TEXT NOT NULL CHECK (kind IN ('dm','invite')),
    status TEXT NOT NULL CHECK (status IN ('sent','failed')),
    text TEXT,
    error TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (comment_social_id, kind)
  );
  CREATE INDEX IF NOT EXISTS idx_lead_magnet_sends_post ON lead_magnet_sends(post_id);

  -- v28b: the uniqueness above is per COMMENT, which is the wrong unit. One
  -- person can leave two comments that both carry the keyword (the real
  -- request, plus a longer one where the keyword happens to appear mid
  -- sentence) — two comments, two rows, and nothing stopping us from sending
  -- the same person the resource twice. The thing we actually promise is
  -- "one resource per PERSON per post", so that's what the database should
  -- enforce.
  --
  -- Dedupe before indexing: rows from before this constraint could already
  -- violate it, and CREATE UNIQUE INDEX would fail on them and take the whole
  -- migration (and the boot) down with it. Keep the newest row per person —
  -- it's the one whose status/error reflects reality.
  DELETE FROM lead_magnet_sends a
   USING lead_magnet_sends b
   WHERE a.post_id = b.post_id
     AND a.provider_id = b.provider_id
     AND a.kind = b.kind
     AND a.created_at < b.created_at;

  ALTER TABLE lead_magnet_sends DROP CONSTRAINT IF EXISTS lead_magnet_sends_comment_social_id_kind_key;
  CREATE UNIQUE INDEX IF NOT EXISTS uq_lead_magnet_sends_person
    ON lead_magnet_sends (post_id, provider_id, kind);

  -- v31: las 2 metricas de LinkedIn PREMIUM que Unipile sí expone, y que
  -- llevabamos sin usar. Vienen en raw.analytics de cada post.
  --
  -- POR QUE IMPORTAN: son lo mas parecido a "esto trajo negocio" que tenemos.
  -- Medido el 2026-07-20: el mapa convierte a visita de perfil 3,6x mejor que el
  -- meme (404 visitas sobre 79.224 impresiones = 0,51% contra 125 sobre 86.815 =
  -- 0,14%), pese a que el meme tuvo MAS impresiones. Sin esto, los dos parecian
  -- igual de buenos porque solo mirabamos alcance.
  --
  -- Sobre los clics al enlace: ver v32, se resolvieron leyendo la pagina web.
  ALTER TABLE posts ADD COLUMN IF NOT EXISTS profile_viewers_count INTEGER;
  ALTER TABLE posts ADD COLUMN IF NOT EXISTS followers_gained_count INTEGER;
  -- Relleno retroactivo: raw_data ya guarda el JSON entero de Unipile, asi que
  -- los posts ya escaneados tienen el dato dentro sin necesidad de re-escanear.
  UPDATE posts SET
    profile_viewers_count  = COALESCE(profile_viewers_count,  (raw_data->'analytics'->>'profile_viewers_from_this_post')::int),
    followers_gained_count = COALESCE(followers_gained_count, (raw_data->'analytics'->>'followers_gained_from_this_post')::int)
   WHERE raw_data ? 'analytics';

  -- v30: lead magnet PÚBLICO con página personalizada ("rastro").
  -- Cada persona que comenta la palabra clave recibe SU análisis. El comentario
  -- público lleva el enlace a esta fila, y la página pide el correo para enseñar
  -- el análisis entero.
  --
  -- El gate ES el motivo de que exista la tabla: el lead magnet público que
  -- mejor fue (8.55x · 483 comentarios) regalaba el análisis completo sin pedir
  -- nada y capturó CERO correos. Aquí el teaser va gratis y el resto se cambia
  -- por el email.
  CREATE TABLE IF NOT EXISTS rastro_analysis (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    share_id TEXT UNIQUE NOT NULL,
    post_id UUID REFERENCES posts(id) ON DELETE SET NULL,
    commenter_name TEXT,
    commenter_headline TEXT,
    commenter_profile_id TEXT,
    sector TEXT,
    teaser JSONB,          -- lo que se ve gratis, antes del correo
    full_analysis JSONB,   -- lo que se desbloquea al dejarlo
    public_comment TEXT,   -- lo que pegamos en LinkedIn, guardado para saber qué se dijo
    email TEXT,
    email_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
  );
  CREATE INDEX IF NOT EXISTS idx_rastro_share ON rastro_analysis (share_id);
  CREATE INDEX IF NOT EXISTS idx_rastro_email ON rastro_analysis (email) WHERE email IS NOT NULL;

  -- v32: las metricas Premium que la API de Unipile NO da, leidas del HTML de
  -- linkedin.com/analytics/post-summary/ (ver services/premiumAnalytics.ts).
  --
  -- link_clicks_count es LA razon de todo esto: sin el, un lead magnet solo se
  -- podia juzgar por comentarios, y eso mide ruido, no intencion. Con 26 clics
  -- sobre 22.420 impresiones ya se puede calcular conversion de verdad.
  --
  -- saves/sends nunca los habiamos medido. Un guardado o un envio por privado
  -- valen mas que un like: cuestan mas y nadie los hace por compromiso.
  ALTER TABLE posts ADD COLUMN IF NOT EXISTS saves_count INTEGER;
  ALTER TABLE posts ADD COLUMN IF NOT EXISTS sends_count INTEGER;
  ALTER TABLE posts ADD COLUMN IF NOT EXISTS link_clicks_count INTEGER;
  ALTER TABLE posts ADD COLUMN IF NOT EXISTS premium_button_clicks INTEGER;
  -- A donde apuntaba el enlace. Sirve para saber que se estaba midiendo y para
  -- decidir en el frontend si enseñar el icono de clics.
  ALTER TABLE posts ADD COLUMN IF NOT EXISTS link_url TEXT;
  -- Cuando se leyo por ultima vez. Permite reintentar los que fallaron sin
  -- confundirlos con los que de verdad tienen 0 clics.
  ALTER TABLE posts ADD COLUMN IF NOT EXISTS premium_analytics_at TIMESTAMPTZ;

  -- v33: SEGUIMIENTO del lead magnet "lista" para quien NO es 1er grado.
  -- A esa gente se le manda una INVITACIÓN con nota (la lista entera no cabe en
  -- 300 car.), prometiéndole la lista al aceptar. El problema: cuando aceptan,
  -- hay que mandarles la lista completa por DM, y regenerarla entonces es rehacer
  -- el trabajo (y otra búsqueda a Unipile). Solución: al ENVIAR la invitación,
  -- pre-generamos y GUARDAMOS aquí la lista completa (followup_text). Cuando
  -- aceptan, el follow-up es pulsar enviar — sin regenerar, sin leer su chat.
  -- provider_name se guarda para pintar la lista de seguimientos sin una llamada
  -- a Unipile por fila; el sector, por referencia.
  ALTER TABLE lead_magnet_sends ADD COLUMN IF NOT EXISTS followup_text TEXT;
  ALTER TABLE lead_magnet_sends ADD COLUMN IF NOT EXISTS sector TEXT;
  ALTER TABLE lead_magnet_sends ADD COLUMN IF NOT EXISTS provider_name TEXT;

  -- v26: PILAR de contenido (a que formato de la parrilla pertenece el post).
  -- hook_type/post_structure dicen COMO esta escrito; esto dice QUE ES:
  -- peloteo_mapa · peloteo_los10 · peloteo_objeto · lead_magnet · meme · historia · otro.
  -- Sin esto se comparaban memes (cortos por diseño, viven de la imagen) con
  -- mapas (2.000 caracteres) y salian conclusiones falsas al leer la tabla.
  -- Lo rellena services/pillar.ts, y se recalcula en lote desde
  -- POST /api/posts/classify-pillars.
  ALTER TABLE posts ADD COLUMN IF NOT EXISTS pillar TEXT;
  CREATE INDEX IF NOT EXISTS idx_posts_pillar ON posts (pillar) WHERE pillar IS NOT NULL;

  -- Estado interno del backend, clave-valor. Nace para una sola cosa
  -- (2026-08-13): guardar con que VERSION de las reglas de services/pillar.ts
  -- se clasifico el historico por ultima vez, para reprocesar al desplegar
  -- solo si esas reglas han cambiado. Sin esto, la alternativa era reclasificar
  -- en cada arranque, que reescribe 47k filas para nada.
  CREATE TABLE IF NOT EXISTS app_state (
    key        TEXT PRIMARY KEY,
    value      TEXT NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );

  -- v34: CICLO DE VIDA DEL OUTLIER.
  --
  -- El problema: is_outlier es un booleano que se recalcula ENTERO en cada
  -- refresco contra la MEDIA MOVIL del creador (services/outliers.ts). Un post
  -- puede volverse outlier meses despues porque la media bajo, y un outlier
  -- real puede dejar de serlo al subir la media — las dos cosas en silencio.
  -- Sin registrar la transicion no existe la pregunta "¿que es NUEVO?", y sin
  -- esa pregunta no hay resumen diario posible: o repites los mismos posts
  -- cada dia o te saltas los que tardan tres dias en despegar.
  --
  -- became_outlier_at: cuando cruzo el umbral por primera vez.
  -- peak_outlier_ratio: su techo historico (el ratio vivo baja al subir la media).
  ALTER TABLE posts ADD COLUMN IF NOT EXISTS became_outlier_at TIMESTAMPTZ;
  ALTER TABLE posts ADD COLUMN IF NOT EXISTS peak_outlier_ratio FLOAT;

  CREATE TABLE IF NOT EXISTS outlier_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
    -- nuevo:     entro siendo un post reciente (creció de verdad)
    -- promovido: post viejo que cruzo el umbral porque se movio la media
    -- degradado: salio de outlier
    evento TEXT NOT NULL CHECK (evento IN ('nuevo', 'promovido', 'degradado')),
    ratio_antes FLOAT,
    ratio_despues FLOAT,
    motivo TEXT,
    detectado_en TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    -- Idempotencia del digest: se sella al mandarlo para no repetirlo manana.
    enviado_en TIMESTAMPTZ
  );
  CREATE INDEX IF NOT EXISTS idx_outlier_events_detectado
    ON outlier_events (detectado_en DESC);
  CREATE INDEX IF NOT EXISTS idx_outlier_events_pendientes
    ON outlier_events (detectado_en DESC) WHERE enviado_en IS NULL;
  -- Un evento por post, tipo y dia. El recalculo corre en cada tick del
  -- monitor (cada 15 min): sin esto, un post que oscila alrededor del umbral
  -- generaria decenas de eventos identicos en una tarde.
  -- AT TIME ZONE 'UTC' en vez de ::date a secas porque el cast directo depende
  -- del TimeZone de la sesion y entonces el indice no seria inmutable.
  CREATE UNIQUE INDEX IF NOT EXISTS uq_outlier_event_dia
    ON outlier_events (post_id, evento, ((detectado_en AT TIME ZONE 'UTC')::date));

  -- Indices del buscador de outliers. Los que habia cubrian el filtrado
  -- (is_outlier, published_at, creator_id) pero ninguno el ORDEN, que es como
  -- se consulta siempre: "los N mejores de X".
  CREATE INDEX IF NOT EXISTS idx_posts_ratio ON posts (outlier_ratio DESC);
  CREATE INDEX IF NOT EXISTS idx_posts_creator_ratio ON posts (creator_id, outlier_ratio DESC);
  CREATE INDEX IF NOT EXISTS idx_posts_outlier_fecha
    ON posts (published_at DESC) WHERE is_outlier = TRUE;

  -- v35: REFRESCOS EN SEGUNDO PLANO.
  --
  -- El refresco era sincrono: la peticion no respondia hasta terminar. Con 145
  -- creadores a unos segundos cada uno son ~10 minutos, y el timeout de una
  -- tool MCP son 60 segundos. Resultado: el cliente se rendia, el servidor
  -- seguia trabajando y nadie sabia si habia acabado, fallado o seguia vivo.
  --
  -- Ahora el trabajo corre en segundo plano y su estado vive aqui, no en una
  -- variable del proceso. En Postgres y no en memoria por dos motivos: el
  -- estado sobrevive a un redeploy de Railway a mitad de vuelta, y la guarda
  -- de "no lanzar dos a la vez" funciona aunque haya varias instancias detras
  -- del balanceador (una variable en memoria solo protege a su propio proceso).
  CREATE TABLE IF NOT EXISTS refresh_jobs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    ambito TEXT NOT NULL,
    estado TEXT NOT NULL CHECK (estado IN ('en_curso', 'terminado', 'fallido', 'abandonado')),
    total INTEGER NOT NULL DEFAULT 0,
    procesados INTEGER NOT NULL DEFAULT 0,
    ok INTEGER NOT NULL DEFAULT 0,
    con_error INTEGER NOT NULL DEFAULT 0,
    posts_nuevos INTEGER NOT NULL DEFAULT 0,
    creador_actual TEXT,
    errores JSONB NOT NULL DEFAULT '[]'::jsonb,
    empezado_en TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    -- Se toca despues de cada creador. Si se queda atras, el proceso murio:
    -- es lo unico que distingue "sigue trabajando" de "lo mato un redeploy".
    latido_en TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    terminado_en TIMESTAMPTZ,
    error TEXT
  );
  CREATE INDEX IF NOT EXISTS idx_refresh_jobs_empezado
    ON refresh_jobs (empezado_en DESC);
  CREATE INDEX IF NOT EXISTS idx_refresh_jobs_en_curso
    ON refresh_jobs (latido_en DESC) WHERE estado = 'en_curso';

  -- v36: EL INMAIL COMO TERCER CANAL, Y EL RECIBO DE CADA ENVIO.
  --
  -- Dos cambios que vienen del mismo dia malo (2026-08-13). A la cuenta de Unai
  -- le metieron un baneo de invitaciones y LinkedIn empezo a tirar las notas en
  -- silencio: Unipile seguia respondiendo 200, la app las guardaba como
  -- 'sent', y horas despues los comentaristas escribian diciendo que no habian
  -- recibido nada. La herramienta decia "enviado" y "contestado" sobre gente a
  -- la que no le habia llegado nada.
  --
  --  · 'inmail' — el canal que sustituye a la nota cuando no hay conexion ni
  --    solicitud pendiente. Sale por /chats con linkedin[inmail] y su asunto.
  --  · verificado — TRUE solo cuando, DESPUES de enviar, hemos releido LinkedIn
  --    y el mensaje o la invitacion estaban de verdad ahi. NULL = no se pudo
  --    comprobar (la comprobacion fallo), que NO es lo mismo que enviado: la UI
  --    los pinta distinto a proposito.
  --
  -- El CHECK viejo se busca por su DEFINICION y no por su nombre: un
  -- "DROP CONSTRAINT IF EXISTS lead_magnet_sends_kind_check" es un no-op
  -- silencioso si en esa base el constraint se llama de otra forma, y entonces
  -- el nuevo se añade AL LADO del viejo — que sigue rechazando 'inmail'. Un
  -- fallo asi no se ve hasta el primer InMail real.
  DO $$
  DECLARE c TEXT;
  BEGIN
    FOR c IN
      SELECT conname FROM pg_constraint
       WHERE conrelid = 'lead_magnet_sends'::regclass
         AND contype = 'c'
         AND pg_get_constraintdef(oid) ILIKE '%kind%'
    LOOP
      EXECUTE format('ALTER TABLE lead_magnet_sends DROP CONSTRAINT %I', c);
    END LOOP;
  END $$;
  -- ⛔ AQUI IBA UN "ADD CONSTRAINT CHECK (kind IN ('dm','invite','inmail'))"
  -- Y TUMBO EL DEPLOY EL 2026-08-18. Se quita a proposito.
  --
  -- El fallo: esta migracion NO esta versionada, corre ENTERA en cada arranque.
  -- La v37 de aqui abajo amplia el CHECK con 'ask' y el codigo empezo a escribir
  -- filas 'ask'. En el siguiente boot, esta linea volvia a intentar poner el
  -- CHECK viejo SIN 'ask' sobre una tabla que ya tenia filas 'ask' ->
  -- "check constraint lead_magnet_sends_kind_check is violated by some row",
  -- runMigrations lanza, index.ts hace process.exit(1) y el healthcheck se cae
  -- 11 veces. El build salia en verde: lo que petaba era el arranque.
  --
  -- Por que quitarla es seguro: la v37 dropea cualquier CHECK de kind y pone el
  -- definitivo dos sentencias mas abajo, dentro de la MISMA transaccion. En una
  -- base nueva el resultado final es identico; en una base viva, deja de haber
  -- un instante en el que la tabla tiene un CHECK mas estrecho que sus datos.
  --
  -- 📌 La leccion, para la proxima migracion: en un runner que reejecuta todo
  -- en cada boot, una migracion antigua que ESTRECHA un dominio es una bomba de
  -- relojeria que estalla cuando alguien inserta el primer valor nuevo.
  ALTER TABLE lead_magnet_sends ADD COLUMN IF NOT EXISTS verificado BOOLEAN;

  -- v37: 'ask' — el recibo de "a esta persona se le PIDIO que nos mande ella la
  -- solicitud". Es el unico kind que NO manda nada a LinkedIn: lo que sale de
  -- verdad es la respuesta publica al comentario, y esta fila es lo que permite,
  -- dias despues, cruzar contra las solicitudes recibidas y saber quien ha dado
  -- el paso. Sin ella, la persona manda su solicitud y no aparece por ningun
  -- lado.
  --
  -- Nace de retirar la invitacion con nota y el InMail (Iker, 2026-08-17): la
  -- herramienta ya no agrega a nadie. El cupo semanal de invitaciones se acaba,
  -- en la cuenta de Unai estan baneadas desde el 14/08, y los creditos de InMail
  -- son pocos. Pedir la solicitud no tiene tope y encima construye red.
  --
  -- 'invite' e 'inmail' se quedan en el CHECK: sus filas historicas siguen ahi y
  -- se siguen leyendo (Seguimientos, /reverificar). Lo que ya no se hace es
  -- crear nuevas, y eso lo impone la ruta, no la BD.
  --
  -- El CHECK viejo se busca por su DEFINICION y no por su nombre, por lo mismo
  -- que en v36: un DROP CONSTRAINT IF EXISTS con el nombre equivocado es un
  -- no-op silencioso, el constraint viejo se queda, y el fallo no se ve hasta el
  -- primer lead magnet real.
  DO $$
  DECLARE c TEXT;
  BEGIN
    FOR c IN
      SELECT conname FROM pg_constraint
       WHERE conrelid = 'lead_magnet_sends'::regclass
         AND contype = 'c'
         AND pg_get_constraintdef(oid) ILIKE '%kind%'
    LOOP
      EXECUTE format('ALTER TABLE lead_magnet_sends DROP CONSTRAINT %I', c);
    END LOOP;
  END $$;
  -- El CHECK entra NOT VALID y se valida despues en un bloque que captura el
  -- error. Motivo: una fila con un kind desconocido NO puede volver a impedir
  -- que el backend arranque. Con NOT VALID el constraint se aplica a todo lo
  -- que se inserte a partir de ahora, que es lo que de verdad protege, y las
  -- filas viejas se quedan donde estan hasta que alguien las mire.
  ALTER TABLE lead_magnet_sends ADD CONSTRAINT lead_magnet_sends_kind_check
    CHECK (kind IN ('dm','invite','inmail','ask')) NOT VALID;

  -- v38: CUENTAS QUE ESCRIBIMOS PERO NO CONTROLAMOS (Iker, 2026-08-19).
  --
  -- Empezamos a escribir posts para gente de la empresa que no son los 3 jefes.
  -- Esas cuentas NO estan conectadas por Unipile y no lo van a estar. Antes de
  -- esto sus posts no existian para la herramienta: ni Live posts, ni dashboard,
  -- ni forma de saber si funcionaron.
  --
  -- La cuenta manual es is_managed = TRUE + is_manual = TRUE, y
  -- unipile_account_id se queda en NULL. Ese NULL no es un descuido: es LA
  -- protección. live-refresh y accountSnapshotTick filtran por
  -- unipile_account_id IS NOT NULL, asi que jamas intentaran capturar
  -- seguidores de una cuenta que no controlamos. Sin eso, la captura correria
  -- con la sesion prestada y guardaria los seguidores de Iker como los del
  -- trabajador — datos corruptos y en silencio.
  --
  -- Los posts se leen prestando la sesion de una cuenta conectada, que para
  -- contenido publico basta. Lo unico que NO se puede leer asi son las
  -- impresiones (privadas del dueño): esas se escriben a mano.
  ALTER TABLE creators ADD COLUMN IF NOT EXISTS is_manual BOOLEAN DEFAULT FALSE;

  -- Y si hay filas fuera del dominio, se AVISA con sus valores y su recuento en
  -- vez de morir. Un WARNING en el log del deploy es lo que convierte esto en
  -- algo que se puede arreglar; un exit 1 solo dice que algo fallo.
  DO $$
  DECLARE malos TEXT;
  BEGIN
    SELECT string_agg(t.kind || ' x' || t.n, ', ') INTO malos
      FROM (SELECT kind, count(*) AS n
              FROM lead_magnet_sends
             WHERE kind NOT IN ('dm','invite','inmail','ask')
             GROUP BY kind) t;
    IF malos IS NULL THEN
      ALTER TABLE lead_magnet_sends VALIDATE CONSTRAINT lead_magnet_sends_kind_check;
    ELSE
      RAISE WARNING '[migrate] lead_magnet_sends.kind fuera del CHECK: %. El constraint queda NOT VALID: protege lo nuevo y no bloquea el arranque.', malos;
    END IF;
  END $$;

  -- v35: CATALOGO DE PILARES, editable desde el frontend (Iker, 2026-08-20).
  --
  -- POR QUE: el pilar lo detecta services/pillar.ts al ingerir el post, y falla
  -- —un mapa dibujado sin bloque de menciones, una historia corta con foto—.
  -- Hasta hoy cada fallo era un mensaje a Claude y un commit tocando reglas: una
  -- semana de latencia para arreglar UNA etiqueta. Con esto Iker pulsa el badge
  -- y lo cambia, y puede crear categorias que el clasificador no conoce.
  --
  -- ⚠️ posts.pillar NO lleva clave foranea a esta tabla, y es deliberado: hay
  -- 47.828 filas y alguna arrastra etiquetas de reglas viejas que ya no estan en
  -- el catalogo. Una FK las tumbaria al migrar. Esta tabla manda en lo que se
  -- puede ELEGIR, no en lo que ya hay guardado.
  --
  -- ⚠️ La columna color guarda una CLAVE ('esmeralda'), no clases de Tailwind.
  -- Tailwind compila las clases que ve en el codigo fuente: una que llega de la BD
  -- en tiempo de ejecucion no existe en el CSS y el badge saldria sin color.
  CREATE TABLE IF NOT EXISTS pillars (
    slug       TEXT PRIMARY KEY,
    label      TEXT NOT NULL,
    color      TEXT NOT NULL DEFAULT 'gris',
    ayuda      TEXT,
    -- Los 8 de serie. No se borran ni cambian de slug: el clasificador los emite
    -- POR NOMBRE, asi que borrar 'meme' solo consigue que el siguiente reproceso
    -- lo reinvente, con sus posts ya movidos a 'otro'.
    builtin    BOOLEAN NOT NULL DEFAULT FALSE,
    sort_order INTEGER NOT NULL DEFAULT 100,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );

  -- Semilla: los 8 pilares de hoy, con la etiqueta, el color y la ayuda que ya
  -- tenian en PILAR_META del frontend, para que nada cambie de aspecto el dia
  -- del despliegue. ON CONFLICT DO NOTHING: no pisa lo que Iker haya renombrado.
  INSERT INTO pillars (slug, label, color, ayuda, builtin, sort_order) VALUES
    ('peloteo_mapa',   'Peloteo Regional (mapa)',   'esmeralda', 'Peloteo regional en formato MAPA (foto del mapa + ~20 menciones)', TRUE, 10),
    ('peloteo_los10',  'Peloteo Regional (los 10)', 'esmeralda', 'Peloteo regional en formato LOS 10 (foto "los 10" + ~10 menciones)', TRUE, 20),
    ('peloteo_objeto', 'Peloteo Regional (objeto)', 'esmeralda', 'Peloteo regional por OBJETO: un objeto cotidiano despiezado en las empresas que lo fabrican', TRUE, 30),
    ('lead_magnet',    'Lead Magnet',               'cielo',     'Ofrece un recurso y lo entrega por privado a quien comenta o conecta', TRUE, 40),
    ('evento',         'Evento',                    'ambar',     'Anuncia una jornada nuestra y lleva el enlace de inscripcion de Luma', TRUE, 50),
    ('meme',           'Meme',                      'naranja',   'El motor es la imagen y las reacciones de risa se disparan (>25%)', TRUE, 60),
    ('historia',       'Historia',                  'morado',    'Anecdota personal en primera persona', TRUE, 70),
    ('otro',           'Otro',                      'gris',      'Sin pilar claro. Ante la duda se deja en "otro" en vez de inventar etiqueta', TRUE, 999)
  ON CONFLICT (slug) DO NOTHING;

  -- v36: la config del lead magnet, a la base (Iker, 2026-08-20).
  --
  -- Vivia en localStorage con clave por post. Con la pestana Lead Magnet
  -- fusionada en Comments eso ya no vale: el TIPO (dm/lista/publico) decide QUE
  -- mensaje se genera, y perderlo al limpiar el navegador significa mandarle a
  -- alguien el texto equivocado. El pilar dice que el post ES un lead magnet;
  -- esto dice de cual de los tres tipos, que el clasificador no puede saber
  -- porque no esta en el texto.
  --
  -- JSONB y no cuatro columnas: los cuatro campos se leen y se escriben SIEMPRE
  -- juntos, y nunca se filtra ni se ordena por ellos.
  ALTER TABLE posts ADD COLUMN IF NOT EXISTS lead_magnet_config JSONB;

  -- top_del_creador: "los mejores posts DE ESTA CUENTA", que es una pregunta
  -- DISTINTA de is_outlier y por eso es una columna aparte y no un umbral nuevo.
  --
  --   is_outlier       = alerta.      "esto ha destacado de verdad"
  --   top_del_creador  = inspiracion. "esto es lo mejor que hace esta cuenta"
  --
  -- Existe porque el 3x sobre la media es CIEGO A LA DISPERSION. Adam Grant
  -- (5,6M seguidores) tiene media 15.525 y maximo 42.642: max/media = 2,75x,
  -- asi que con el umbral en 3,00x NO PUEDE tener un outlier jamas. Y sin
  -- outliers, patterns.ts cortaba en seco y el Explorer no sacaba ni un patron
  -- de la cuenta mas viral de LinkedIn. Le pasa a 4 de 142 cuentas con >=20
  -- posts, y las cuatro son ultraconsistentes (CV 0,31-0,55 frente a 2-7 del
  -- resto): Adam Grant, Lara Acosta, Jasmin Alic y Adam Ali.
  --
  -- NO se toca is_outlier. Se probo sustituirlo por un z robusto y se descarto
  -- con datos: con cualquier umbral que destape a Grant, las cuentas de cola
  -- pesada pierden outliers LEGITIMOS (en Daniel Disney salian 29 de 50, y el
  -- mas alto estaba a 10,7x su mediana). Son dos preguntas, no una.
  ALTER TABLE posts ADD COLUMN IF NOT EXISTS top_del_creador BOOLEAN NOT NULL DEFAULT FALSE;

  CREATE INDEX IF NOT EXISTS idx_posts_top_del_creador
    ON posts (creator_id, top_del_creador) WHERE top_del_creador;

  -- Cuando se anuncio este post en el Google Chat del equipo. Lo escribe el
  -- anunciador automatico (services/anuncioChat.ts) y es lo UNICO que impide
  -- que el mismo post se anuncie dos veces: el job corre varias veces por
  -- mañana a proposito, porque LinkedIn tarda hasta ~20 min en soltar un post
  -- al feed y el primer pase se encontraria la cuenta vacia.
  -- NULL = no anunciado todavia. Se marca DESPUES del envio, nunca antes: si
  -- el webhook falla, el post sigue pendiente y el pase siguiente lo reintenta.
  ALTER TABLE posts ADD COLUMN IF NOT EXISTS chat_announced_at TIMESTAMPTZ;

  CREATE INDEX IF NOT EXISTS idx_posts_chat_pendientes
    ON posts (creator_id, published_at) WHERE chat_announced_at IS NULL;

  -- Ultima vez que el monitor releyo el feed ENTERO de la cuenta para poner al
  -- dia likes, comentarios, reposts e impresiones de sus posts de mas de 7 dias
  -- (services/postMonitor.ts, refrescarContadoresPostsViejos). NULL = nunca.
  ALTER TABLE creators ADD COLUMN IF NOT EXISTS public_counters_synced_at TIMESTAMPTZ;
  -- Cuando toca el siguiente pase (NULL = ya). Lo fija el propio pase: dentro
  -- de 7 dias o el dia 1 del mes siguiente, lo que llegue antes; 24h si fallo.
  ALTER TABLE creators ADD COLUMN IF NOT EXISTS public_counters_next_at TIMESTAMPTZ;

  -- Cifras OFICIALES de la pagina de resumen de LinkedIn, una fila por cuenta y
  -- dia (services/linkedinOverview.ts). Son el numero que la persona ve en
  -- LinkedIn; la reconstruccion desde la lista de visitantes no cuadraba.
  CREATE TABLE IF NOT EXISTS creator_linkedin_overview (
    creator_id UUID NOT NULL REFERENCES creators(id) ON DELETE CASCADE,
    captured_on DATE NOT NULL,
    captured_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    profile_viewers_90d INTEGER,
    post_impressions_7d INTEGER,
    followers INTEGER,
    search_appearances INTEGER,
    PRIMARY KEY (creator_id, captured_on)
  );

  -- Impresiones DIARIAS oficiales de cada cuenta (Content analytics de
  -- LinkedIn, ultimos 365 dias; services/linkedinOverview.ts). De aqui sale
  -- "Impressions per month" para las cuentas conectadas.
  CREATE TABLE IF NOT EXISTS creator_daily_impressions (
    creator_id UUID NOT NULL REFERENCES creators(id) ON DELETE CASCADE,
    day DATE NOT NULL,
    impressions INTEGER NOT NULL,
    captured_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (creator_id, day)
  );
  -- Engagement diario oficial (misma pagina, serie "Engagements").
  ALTER TABLE creator_daily_impressions ADD COLUMN IF NOT EXISTS engagements INTEGER;

  -- Lecturas periodicas de los contadores de un post DESPUES de su semana de
  -- snapshots (pase semanal + una al empezar cada mes). No se mezclan con
  -- post_snapshots para no ensuciar la curva de 7 dias. Con los snapshots
  -- forman la serie de la que sale "impresiones GANADAS cada mes" (Iker,
  -- 2026-09-17): el mes suma lo que crece cada post entre dos lecturas.
  CREATE TABLE IF NOT EXISTS post_metric_readings (
    id BIGSERIAL PRIMARY KEY,
    post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
    captured_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    impressions_count INTEGER,
    likes_count INTEGER,
    comments_count INTEGER,
    reposts_count INTEGER
  );
  CREATE INDEX IF NOT EXISTS idx_post_metric_readings_post
    ON post_metric_readings (post_id, captured_at);

  -- Lectura inicial: el valor que cada post tiene HOY. Sin ella, el primer
  -- pase semanal de un post viejo contaria toda su vida como ganada ese mes.
  -- Idempotente: solo para posts que aun no tienen ninguna lectura.
  INSERT INTO post_metric_readings (post_id, captured_at, impressions_count, likes_count, comments_count, reposts_count)
  SELECT p.id, NOW(), p.impressions_count, p.likes_count, p.comments_count, p.reposts_count
    FROM posts p
    JOIN creators c ON c.id = p.creator_id AND c.is_managed = TRUE
   WHERE p.published_at IS NOT NULL
     AND NOT EXISTS (SELECT 1 FROM post_metric_readings r WHERE r.post_id = p.id);

  -- LA IMAGEN DE UN MEME, EN TEXTO (Iker, 2026-09-17). Las fotos se quitaron de
  -- las respuestas el 15/09 por coste, y el generador se quedo sin entender la
  -- broma de los memes. Esto guarda UNA vez por post lo que dice y ensena la
  -- imagen (services/postImageText.ts), y cada respuesta lo lee como texto.
  -- source_url: de que imagen salio, para rehacerlo si el creador la cambia.
  ALTER TABLE posts ADD COLUMN IF NOT EXISTS image_summary TEXT;
  ALTER TABLE posts ADD COLUMN IF NOT EXISTS image_summary_source_url TEXT;
  -- Ultimo intento de resumir (haya salido o no): un fallo no se reintenta
  -- hasta pasadas 6 horas, ni en cada vuelta del monitor ni en cada respuesta.
  ALTER TABLE posts ADD COLUMN IF NOT EXISTS image_summary_tried_at TIMESTAMPTZ;
`;

/**
 * Migracion OPCIONAL: busqueda por texto.
 *
 * Va aparte y con su propio try/catch porque CREATE EXTENSION exige permisos
 * que el usuario de la BD puede no tener. Si falla, el buscador sigue
 * funcionando con ILIKE (mas lento, mismos resultados) en vez de tumbar el
 * arranque entero del backend por un indice.
 */
const migracionTexto = `
  CREATE EXTENSION IF NOT EXISTS pg_trgm;
  CREATE INDEX IF NOT EXISTS idx_posts_texto_trgm
    ON posts USING GIN (content_text gin_trgm_ops);
  CREATE INDEX IF NOT EXISTS idx_posts_hook_trgm
    ON posts USING GIN (hook_text gin_trgm_ops);
`;

export async function runMigrations() {
  const client = await pool.connect();
  try {
    await client.query(migration);
    console.log('Migration completed successfully');
  } catch (err) {
    console.error('Migration failed:', err);
    throw err;
  } finally {
    client.release();
  }

  // Best-effort: un fallo aqui degrada el buscador a ILIKE, no rompe el boot.
  const clienteTexto = await pool.connect();
  try {
    await clienteTexto.query(migracionTexto);
    console.log('Migration (texto/pg_trgm) completed successfully');
  } catch (err: any) {
    console.warn(
      `[migrate] pg_trgm no disponible (${err?.message}). El buscador usara ILIKE sin indice.`
    );
  } finally {
    clienteTexto.release();
  }
}

// Allow running directly: npx tsx src/db/migrate.ts
if (require.main === module) {
  runMigrations().then(() => pool.end());
}
