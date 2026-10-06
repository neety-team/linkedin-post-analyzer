import { useState, useRef, useCallback, useEffect } from 'react';

interface Props {
  text: string;
  authorName?: string | null;
  authorHeadline?: string | null;
  authorImage?: string | null;
  followersCount?: number | null;
  // When set, overrides the local drag/drop image with whatever the
  // parent has provided (typically the AI-generated result). The user
  // can still clear it via the ✕ button on the image overlay.
  externalImageUrl?: string | null;
}

type ViewMode = 'desktop' | 'mobile';
type ImageRatio = '1:1' | '4:5' | '1.91:1';

const RATIO_VALUES: Record<ImageRatio, number> = {
  '1:1': 1,
  '4:5': 4 / 5,
  '1.91:1': 1.91,
};

const MAX_CHARS = 3000;

// Hook cutoff — LinkedIn mobile caps around 140 chars before "…see more".
// Front-load the hook here so it stays fully visible on both platforms.
const HOOK_CUTOFF = 140;

// Card content widths (card width minus 32px horizontal padding)
// Desktop card: 555px → content: 523px. Mobile card: 347px → content: 315px.
// At 14px system font, average char ≈ 7.1px → chars per line:
const CHARS_PER_LINE: Record<ViewMode, number> = {
  desktop: Math.floor(523 / 7.1), // ≈ 73
  mobile: Math.floor(315 / 7.1),  // ≈ 44
};

// Hard character cutoff before "…see more" (measured on real LinkedIn posts).
// Line breaks burn the budget — 2 sentences separated by a blank line usually
// push the second sentence past the cutoff on mobile.
const MAX_CHARS_CUT: Record<ViewMode, { text: number; withMedia: number }> = {
  desktop: { text: 220, withMedia: 140 },
  mobile:  { text: 140, withMedia: 120 },
};

// Max visible lines before "see more" (works alongside the char cap —
// whichever hits first is the cutoff).
const MAX_LINES = {
  desktop: { text: 3, withMedia: 2 },
  mobile:  { text: 2, withMedia: 2 },
};

function charCount(text: string): number {
  return [...text].reduce((n, ch) => {
    const cp = ch.codePointAt(0) ?? 0;
    return cp > 0xffff ? n + 2 : n + 1;
  }, 0);
}

/**
 * Counts how many visual lines a piece of text occupies given a chars-per-line width.
 * Blank lines count as 1 line each.
 */
function countVisualLines(text: string, charsPerLine: number): number {
  return text.split('\n').reduce((total, seg) => {
    if (seg.trim() === '') return total + 1;
    return total + Math.max(1, Math.ceil(seg.length / charsPerLine));
  }, 0);
}

/**
 * Returns the visible portion of text before LinkedIn's "…see more" cut.
 * Cut triggers — whichever fires first:
 *   1. Char cap
 *   2. Line cap
 *   3. First blank line (paragraph break) after any content — observed in
 *      real LinkedIn: once a blank line appears, everything after is hidden.
 */
function truncate(
  text: string,
  maxLines: number,
  maxChars: number,
  charsPerLine: number,
): {
  visible: string;
  truncated: boolean;
  linesUsed: number;
  totalLines: number;
  charsUsed: number;
  totalChars: number;
  cutReason: 'chars' | 'lines' | 'blank-line' | null;
} {
  const totalLines = countVisualLines(text, charsPerLine);
  const totalChars = charCount(text);

  const segments = text.split('\n');
  let linesConsumed = 0;
  let charsConsumed = 0;
  const visibleParts: string[] = [];
  let cutReason: 'chars' | 'lines' | 'blank-line' | null = null;

  for (let idx = 0; idx < segments.length; idx++) {
    const seg = segments[idx];
    const isBlank = seg.trim() === '';

    // Blank line after content = hard cut. LinkedIn hides everything after.
    if (isBlank && visibleParts.length > 0) {
      cutReason = 'blank-line';
      break;
    }

    const segLines = isBlank ? 1 : Math.max(1, Math.ceil(seg.length / charsPerLine));
    const newlineCost = visibleParts.length > 0 ? 1 : 0;
    const projectedChars = charsConsumed + newlineCost + seg.length;
    const projectedLines = linesConsumed + segLines;

    if (projectedLines > maxLines || projectedChars > maxChars) {
      const remainingLines = maxLines - linesConsumed;
      const remainingChars = maxChars - charsConsumed - newlineCost;
      const maxAllowed = Math.min(remainingLines * charsPerLine, remainingChars);
      if (maxAllowed > 0 && !isBlank) {
        visibleParts.push(seg.slice(0, maxAllowed).trimEnd());
        charsConsumed += newlineCost + Math.min(seg.length, maxAllowed);
        linesConsumed += Math.max(1, Math.ceil(Math.min(seg.length, maxAllowed) / charsPerLine));
      }
      cutReason = projectedLines > maxLines && projectedChars <= maxChars ? 'lines' : 'chars';
      break;
    }

    linesConsumed = projectedLines;
    charsConsumed = projectedChars;
    visibleParts.push(seg);
  }

  const truncated = cutReason !== null;
  return {
    visible: visibleParts.join('\n').trimEnd(),
    truncated,
    linesUsed: Math.min(linesConsumed, maxLines),
    totalLines,
    charsUsed: Math.min(charsConsumed, maxChars),
    totalChars,
    cutReason,
  };
}

function PostText({
  text,
  view,
  hasMedia,
}: {
  text: string;
  view: ViewMode;
  hasMedia: boolean;
}) {
  const [expanded, setExpanded] = useState(false);

  const maxLines = hasMedia ? MAX_LINES[view].withMedia : MAX_LINES[view].text;
  const maxChars = hasMedia ? MAX_CHARS_CUT[view].withMedia : MAX_CHARS_CUT[view].text;
  const charsPerLine = CHARS_PER_LINE[view];
  const { visible, truncated, linesUsed, totalLines, charsUsed, totalChars, cutReason } = truncate(
    text,
    maxLines,
    maxChars,
    charsPerLine,
  );

  // Is the hook (first 140 chars) fully visible before the cut?
  const hookVisible = charCount(visible) >= Math.min(HOOK_CUTOFF, totalChars);

  const cutLabel =
    cutReason === 'blank-line'
      ? 'cut by blank line'
      : cutReason === 'lines'
        ? 'cut by line cap'
        : cutReason === 'chars'
          ? 'cut by char cap'
          : '';

  return (
    <div>
      <div
        style={{
          fontFamily: '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial,sans-serif',
          fontSize: 14,
          lineHeight: 1.5,
          color: '#191919',
          whiteSpace: 'pre-wrap',
          wordBreak: 'break-word',
        }}
      >
        {expanded ? text : visible}
        {truncated && !expanded && (
          <>
            {/* For blank-line cuts real LinkedIn preserves the paragraph break and
                puts "… more" on its own line. For char/line caps it's inline. */}
            {cutReason === 'blank-line' ? '\n\n' : ' '}
            <span
              onClick={() => setExpanded(true)}
              style={{ color: '#666', cursor: 'pointer', fontWeight: 600 }}
            >
              …more
            </span>
          </>
        )}
        {expanded && (
          <>
            {' '}
            <span
              onClick={() => setExpanded(false)}
              style={{ color: '#666', cursor: 'pointer', fontWeight: 600 }}
            >
              see less
            </span>
          </>
        )}
      </div>
      {/* Cutoff hint below text */}
      {!expanded && (
        <div style={{ fontSize: 10, color: '#aaa', marginTop: 4, display: 'flex', flexDirection: 'column', gap: 2 }}>
          <div>
            {truncated ? (
              <>
                {charsUsed}/{maxChars} chars · {linesUsed}/{maxLines} lines visible · {cutLabel}
                {' · '}{totalChars} chars / {totalLines} lines total
              </>
            ) : (
              <>
                {totalChars}/{maxChars} chars · {totalLines}/{maxLines} lines · not truncated
              </>
            )}
          </div>
          {truncated && !hookVisible && (
            <div style={{ color: '#ef4444', fontWeight: 600 }}>
              ⚠ Hook cut short — front-load the point in the first {HOOK_CUTOFF} chars
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function ReactionBubble({ bg, emoji }: { bg: string; emoji: string }) {
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: 18,
        height: 18,
        borderRadius: '50%',
        background: bg,
        border: '1.5px solid #fff',
        fontSize: 10,
        lineHeight: 1,
        marginLeft: -4,
      }}
    >
      {emoji}
    </span>
  );
}

export default function LinkedInPostPreview({
  text,
  authorName,
  authorHeadline,
  authorImage,
  followersCount,
  externalImageUrl,
}: Props) {
  const [view, setView] = useState<ViewMode>('desktop');
  const [localImageUrl, setLocalImageUrl] = useState<string | null>(null);
  const [imageRatio, setImageRatio] = useState<ImageRatio>('1:1');
  const [dragging, setDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // External (AI-generated) wins; local drag/drop is the fallback. The user
  // can hide either via the ✕ overlay; when the parent pushes a NEW external
  // URL we un-hide automatically so a regenerated image appears in the post.
  const [externalCleared, setExternalCleared] = useState(false);
  useEffect(() => {
    // Any time externalImageUrl changes (parent generated/regenerated), reset
    // the user-cleared flag so the new image is visible.
    setExternalCleared(false);
  }, [externalImageUrl]);

  const effectiveExternalUrl = externalCleared ? null : externalImageUrl;
  const imageUrl = effectiveExternalUrl || localImageUrl;
  const setImageUrl = (url: string | null) => {
    if (url === null) {
      setLocalImageUrl(null);
      if (effectiveExternalUrl) setExternalCleared(true);
    } else {
      setExternalCleared(false);
      setLocalImageUrl(url);
    }
  };

  const CARD_WIDTH = view === 'desktop' ? 555 : 347;
  const chars = charCount(text);
  const charPct = Math.min(chars / MAX_CHARS, 1);
  const charColor = chars > 2800 ? '#ef4444' : chars > 2400 ? '#f59e0b' : '#10b981';

  const handleFile = useCallback((file: File) => {
    if (!file.type.startsWith('image/')) return;
    if (file.size > 5 * 1024 * 1024) {
      alert('Image too large (max 5 MB)');
      return;
    }
    const url = URL.createObjectURL(file);
    setImageUrl(url);
  }, []);

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  };

  const displayName = authorName || 'Tu nombre';
  const displayHeadline = authorHeadline || 'Tu titular de LinkedIn';
  const displayFollowers =
    followersCount && followersCount > 0
      ? `${followersCount.toLocaleString()} seguidores`
      : '2h';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {/* Toolbar */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
        {/* View toggle */}
        <div
          style={{
            display: 'flex',
            background: '#1e293b',
            borderRadius: 8,
            padding: 2,
            gap: 2,
          }}
        >
          {(['desktop', 'mobile'] as ViewMode[]).map((v) => (
            <button
              key={v}
              onClick={() => setView(v)}
              style={{
                padding: '4px 12px',
                borderRadius: 6,
                fontSize: 11,
                fontWeight: 600,
                border: 'none',
                cursor: 'pointer',
                background: view === v ? '#3b82f6' : 'transparent',
                color: view === v ? '#fff' : '#94a3b8',
                transition: 'all 0.15s',
              }}
            >
              {v === 'desktop' ? '🖥 Desktop' : '📱 Mobile'}
            </button>
          ))}
        </div>

        {/* Character counter */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <div
            style={{
              width: 60,
              height: 4,
              background: '#334155',
              borderRadius: 2,
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                width: `${charPct * 100}%`,
                height: '100%',
                background: charColor,
                transition: 'width 0.2s, background 0.2s',
              }}
            />
          </div>
          <span style={{ fontSize: 11, color: charColor, fontFamily: 'monospace', fontWeight: 600 }}>
            {chars}/{MAX_CHARS}
          </span>
        </div>
      </div>

      {/* Feed background wrapper */}
      <div
        style={{
          background: '#F4F2EE',
          borderRadius: 10,
          padding: '12px 0',
          display: 'flex',
          justifyContent: 'center',
          overflow: 'hidden',
        }}
      >
        {/* Card */}
        <div
          style={{
            width: CARD_WIDTH,
            background: '#fff',
            borderRadius: 8,
            border: '1px solid #e0e0e0',
            boxShadow: '0 0 0 1px rgba(0,0,0,.08)',
            overflow: 'hidden',
            fontFamily: '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial,sans-serif',
            transition: 'width 0.2s',
          }}
        >
          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '12px 16px 8px' }}>
            {authorImage ? (
              <img
                src={authorImage}
                alt=""
                style={{ width: 48, height: 48, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }}
              />
            ) : (
              <div
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: '50%',
                  background: '#0a66c2',
                  color: '#fff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 700,
                  fontSize: 18,
                  flexShrink: 0,
                }}
              >
                {displayName[0]?.toUpperCase() || '?'}
              </div>
            )}

            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <span style={{ fontSize: 14, fontWeight: 600, color: '#191919', lineHeight: 1.3 }}>
                  {displayName}
                </span>
                <span style={{ fontSize: 12, color: '#0a66c2', fontWeight: 600 }}>· 1ro</span>
              </div>
              <p
                style={{
                  fontSize: 12,
                  color: '#666',
                  lineHeight: 1.3,
                  margin: '1px 0',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {displayHeadline}
              </p>
              <div style={{ fontSize: 12, color: '#666', display: 'flex', alignItems: 'center', gap: 3, marginTop: 1 }}>
                <span>{displayFollowers}</span>
                <span>·</span>
                <span title="Public">
                  <svg width="12" height="12" viewBox="0 0 16 16" fill="#666">
                    <path d="M8 0a8 8 0 1 1 0 16A8 8 0 0 1 8 0zm0 1.5a6.5 6.5 0 1 0 0 13 6.5 6.5 0 0 0 0-13zm0 2c.28 0 .54.04.79.1C8.5 4 8.5 4.5 8.5 5c0 .83-.67 1.5-1.5 1.5A1.5 1.5 0 0 1 5.5 5c0-.28.08-.55.2-.79A5 5 0 0 1 8 3.5zm-3.5 5.5h7a.5.5 0 0 1 .5.5v.5a4 4 0 0 1-8 0V9.5a.5.5 0 0 1 .5-.5z" />
                  </svg>
                </span>
              </div>
            </div>

            <button
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                color: '#666',
                fontSize: 20,
                lineHeight: 1,
                padding: '2px 4px',
                borderRadius: 4,
              }}
            >
              ···
            </button>
          </div>

          {/* Post text */}
          <div style={{ padding: '0 16px 12px' }}>
            {text ? (
              <PostText text={text} view={view} hasMedia={!!imageUrl} />
            ) : (
              <span style={{ color: '#aaa', fontSize: 13, fontStyle: 'italic' }}>
                Post content will appear here…
              </span>
            )}
          </div>

          {/* Image zone */}
          {imageUrl ? (
            <div style={{ position: 'relative' }}>
              <div
                style={{
                  width: '100%',
                  paddingBottom: `${(1 / RATIO_VALUES[imageRatio]) * 100}%`,
                  position: 'relative',
                  overflow: 'hidden',
                  background: '#000',
                }}
              >
                <img
                  src={imageUrl}
                  alt=""
                  style={{
                    position: 'absolute',
                    inset: 0,
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover',
                  }}
                />
              </div>
              {/* Image controls overlay */}
              <div
                style={{
                  position: 'absolute',
                  top: 8,
                  right: 8,
                  display: 'flex',
                  gap: 4,
                }}
              >
                {(['1:1', '4:5', '1.91:1'] as ImageRatio[]).map((r) => (
                  <button
                    key={r}
                    onClick={() => setImageRatio(r)}
                    style={{
                      padding: '2px 6px',
                      fontSize: 10,
                      borderRadius: 4,
                      border: 'none',
                      cursor: 'pointer',
                      background: imageRatio === r ? '#0a66c2' : 'rgba(0,0,0,0.55)',
                      color: '#fff',
                      fontWeight: 600,
                    }}
                  >
                    {r}
                  </button>
                ))}
                <button
                  onClick={() => setImageUrl(null)}
                  style={{
                    padding: '2px 6px',
                    fontSize: 10,
                    borderRadius: 4,
                    border: 'none',
                    cursor: 'pointer',
                    background: 'rgba(200,0,0,0.75)',
                    color: '#fff',
                    fontWeight: 700,
                  }}
                >
                  ✕
                </button>
              </div>
            </div>
          ) : (
            /* Drop zone */
            <div
              onClick={() => fileInputRef.current?.click()}
              onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
              onDragLeave={() => setDragging(false)}
              onDrop={onDrop}
              style={{
                margin: '0 16px 12px',
                border: `1.5px dashed ${dragging ? '#0a66c2' : '#ccc'}`,
                borderRadius: 6,
                padding: '16px',
                textAlign: 'center',
                cursor: 'pointer',
                fontSize: 11,
                color: '#999',
                background: dragging ? '#e8f0fe' : 'transparent',
                transition: 'all 0.15s',
              }}
            >
              📷 Drag an image or click to add
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/gif"
                style={{ display: 'none' }}
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleFile(file);
                }}
              />
            </div>
          )}

          {/* Reactions bar */}
          <div
            style={{
              padding: '6px 16px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              fontSize: 12,
              color: '#666',
              borderTop: '1px solid #e0e0e0',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <span style={{ display: 'flex', alignItems: 'center', marginLeft: 4 }}>
                <ReactionBubble bg="#0a66c2" emoji="👍" />
                <ReactionBubble bg="#df704d" emoji="❤️" />
                <ReactionBubble bg="#f5c400" emoji="💡" />
              </span>
              <span style={{ marginLeft: 6 }}>42</span>
            </div>
            <span>3 comments · 1 repost</span>
          </div>

          {/* Action bar */}
          <div
            style={{
              display: 'flex',
              borderTop: '1px solid #e0e0e0',
              padding: '2px 0',
            }}
          >
            {[
              { icon: '👍', label: 'Like' },
              { icon: '💬', label: 'Comment' },
              { icon: '🔁', label: 'Repost' },
              { icon: '✉️', label: 'Send' },
            ].map(({ icon, label }) => (
              <button
                key={label}
                style={{
                  flex: 1,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: view === 'mobile' ? 2 : 5,
                  padding: '10px 4px',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: view === 'mobile' ? 11 : 13,
                  fontWeight: 600,
                  color: '#666',
                  borderRadius: 4,
                  transition: 'background 0.1s',
                }}
              >
                <span>{icon}</span>
                {view === 'desktop' && <span>{label}</span>}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Blank-line warning — in real LinkedIn the first blank line hides everything after it */}
      {text && /\n\s*\n/.test(text) && (
        <div style={{ fontSize: 10, color: '#f59e0b', textAlign: 'center' }}>
          ⚠ Blank line detected — LinkedIn hides everything after the first blank line behind "see more"
        </div>
      )}
    </div>
  );
}
