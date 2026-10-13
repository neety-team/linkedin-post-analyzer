import { useState } from 'react';
import MediaViewer from './MediaViewer';

interface PostData {
  id: string;
  linkedin_post_id?: string | null;
  content_text: string | null;
  content_type: string;
  published_at: string | null;
  likes_count: number;
  comments_count: number;
  reposts_count: number;
  engagement_score: number;
  outlier_ratio: number;
  is_outlier: boolean;
  hook_text: string | null;
  post_url: string | null;
  creator_name?: string;
  creator_image?: string;
}

interface Props {
  post: PostData;
}

function getLinkedInUrl(post: PostData): string | null {
  if (post.post_url) return post.post_url;
  if (post.linkedin_post_id) return `https://www.linkedin.com/feed/update/${post.linkedin_post_id}/`;
  return null;
}

function ratioBadge(ratio: number) {
  if (ratio >= 10) return (
    <span className="bg-diamond/20 text-diamond px-2 py-0.5 rounded text-xs font-bold shadow-[0_0_8px_rgba(126,58,168,0.3)]">{ratio}x</span>
  );
  if (ratio >= 3) return (
    <span className="bg-accent/20 text-accent px-2 py-0.5 rounded text-xs font-bold">{ratio}x</span>
  );
  return <span className="bg-bg-hover text-text-muted px-2 py-0.5 rounded text-xs">{ratio}x</span>;
}

const TYPE_CONFIG: Record<string, { icon: string; label: string; color: string; hasMedia: boolean }> = {
  text:            { icon: '📝', label: 'Texto',           color: 'text-text-muted bg-bg-hover',          hasMedia: false },
  text_image:      { icon: '📝🖼️', label: 'Texto + foto',    color: 'text-blue-700 dark:text-blue-300 bg-blue-400/10',          hasMedia: true  },
  text_carousel:   { icon: '📝📎', label: 'Texto + carrusel', color: 'text-purple-700 dark:text-purple-300 bg-purple-400/10',      hasMedia: true  },
  text_video:      { icon: '📝🎥', label: 'Texto + vídeo',   color: 'text-danger bg-danger/10',            hasMedia: true  },
  text_document:   { icon: '📝📄', label: 'Texto + documento',color: 'text-amber-700 dark:text-amber-300 bg-amber-400/10',        hasMedia: true  },
  image:           { icon: '🖼️', label: 'Solo foto',        color: 'text-blue-700 dark:text-blue-300 bg-blue-300/10',          hasMedia: true  },
  carousel:        { icon: '📎', label: 'Solo carrusel',    color: 'text-purple-700 dark:text-purple-300 bg-purple-300/10',      hasMedia: true  },
  video:           { icon: '🎥', label: 'Solo vídeo',       color: 'text-danger bg-danger/10',            hasMedia: true  },
  document:        { icon: '📄', label: 'Solo documento',   color: 'text-amber-700 dark:text-amber-300 bg-amber-300/10',        hasMedia: true  },
  poll:            { icon: '📊', label: 'Encuesta',         color: 'text-success bg-success/10',        hasMedia: false },
  article:         { icon: '📰', label: 'Artículo',         color: 'text-cyan-700 dark:text-cyan-300 bg-cyan-400/10',          hasMedia: false },
};

function TypeBadge({ type }: { type: string }) {
  const cfg = TYPE_CONFIG[type] || { icon: '?', label: type, color: 'text-text-muted bg-bg-hover', hasMedia: false };
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium ${cfg.color}`}>
      <span>{cfg.icon}</span>
      <span>{cfg.label}</span>
    </span>
  );
}

const PREVIEW_CHARS = 280;

function ExpandableText({ text }: { text: string }) {
  const [expanded, setExpanded] = useState(false);
  const needsTrunc = text.length > PREVIEW_CHARS;
  return (
    <div className="mb-3">
      <p className="text-text-primary text-sm leading-relaxed whitespace-pre-wrap">
        {expanded || !needsTrunc ? text : text.slice(0, PREVIEW_CHARS) + '…'}
      </p>
      {needsTrunc && (
        <button
          onClick={() => setExpanded(!expanded)}
          className="text-[11px] text-accent hover:text-accent-strong mt-1"
        >
          {expanded ? 'Ver menos ↑' : 'Ver más ↓'}
        </button>
      )}
    </div>
  );
}

export default function PostCard({ post }: Props) {
  const linkedinUrl = getLinkedInUrl(post);

  return (
    <div className="bg-bg-card rounded-xl p-5 border border-border hover:border-accent/30 transition-colors">
      {post.creator_name && (
        <div className="flex items-center gap-2 mb-3">
          {post.creator_image ? (
            <img src={post.creator_image} alt="" className="w-6 h-6 rounded-full" />
          ) : (
            <div className="w-6 h-6 rounded-full bg-accent/30 flex items-center justify-center text-xs text-accent font-bold">
              {post.creator_name[0]}
            </div>
          )}
          <span className="text-sm text-text-secondary">{post.creator_name}</span>
        </div>
      )}

      <ExpandableText text={post.content_text || 'Sin contenido'} />

      <div className="flex items-center justify-between text-xs text-text-muted">
        <div className="flex gap-3">
          <span>{post.likes_count.toLocaleString('es-ES')} reacciones</span>
          <span>{post.comments_count.toLocaleString('es-ES')} comentarios</span>
          <span>{post.reposts_count.toLocaleString('es-ES')} compartidos</span>
        </div>
        <div className="flex items-center gap-2">
          <TypeBadge type={post.content_type} />
          {post.outlier_ratio > 0 && ratioBadge(post.outlier_ratio)}
        </div>
      </div>

      {/* Media viewer — always available (content_type can be misclassified if Unipile missed the attachment) */}
      <div className="mt-3">
        <MediaViewer postId={post.id} contentType={post.content_type} linkedinUrl={linkedinUrl} />
      </div>

      <div className="flex items-center justify-between mt-3 pt-3 border-t border-border/50">
        <span className="text-xs text-text-muted">
          {post.published_at ? new Date(post.published_at).toLocaleDateString('es-ES') : '—'}
        </span>
        {linkedinUrl && (
          <a
            href={linkedinUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-linkedin hover:underline"
          >
            Ver en LinkedIn ↗
          </a>
        )}
      </div>
    </div>
  );
}
