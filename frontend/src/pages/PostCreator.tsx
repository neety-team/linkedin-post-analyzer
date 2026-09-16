import { useState, useRef, useEffect } from 'react';
import LinkedInPostPreview from '../components/postcreator/LinkedInPostPreview';
import MarkdownMessage from '../components/postcreator/MarkdownMessage';
import Usage from './Usage';

const BASE = import.meta.env.VITE_API_URL || '';

// Attached image is held as a data URL on the client (no upload to our
// server — the bytes are sent inline to Anthropic on each turn). We keep
// the original mediaType so the API call uses the correct Content-Type.
interface AttachedImage {
  dataUrl: string;
  mediaType: 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp';
}

interface Message {
  role: 'user' | 'assistant';
  content: string;
  images?: AttachedImage[];
}

const ACCEPTED_IMAGE_TYPES: AttachedImage['mediaType'][] = [
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
];
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

// Preview persona = one of our managed accounts (Iker / Unai). We post
// for both now, so the preview shows whichever identity you pick. Name +
// photo + headline come straight from the Accounts data (always fresh),
// not the old standalone creator_profile.
interface Persona {
  id: string;
  name: string | null;
  headline: string | null;
  profile_image_url: string | null;
  followers_count: number;
}

// Extract post blocks from an assistant message. Tries several strategies in
// order so it works whether the model emits `---` separators, numbered
// "OPCIÓN" / "OPTION" / "VARIANTE" headings, fenced code blocks, or none.
// `strict` = "only treat this as a post if it's unambiguously a post".
// The model now wraps every post body in a ``` fence (system-prompt rule
// #16), so a code fence is the reliable signal that the message actually
// contains a post. In strict mode we REQUIRE a fence and skip the
// whole-message fallback — that fallback is what was dumping plain
// non-post replies ("¿quieres que lo haga más agresivo?") into the
// LinkedIn preview. The preview auto-update and the per-message preview
// buttons both run strict; nothing else should leak into the preview.
function extractPostBlocks(content: string, strict = false): string[] {
  const cleaned = content.trim();
  if (cleaned.length < 50) return [];

  // In strict mode, no fence = not a post. Bail before any heuristic so a
  // stray "---" or "OPCIÓN" inside an explanation can't masquerade as a post.
  if (strict && !cleaned.includes('```')) return [];

  // Helper: when a chunk of text contains a triple-backtick fence (which is
  // now the model's default for every post body), the pasteable content is
  // ONLY the fence's interior — drop the surrounding OPCIÓN heading, the
  // virality tag, and any 'why this works' commentary that lives outside it.
  // Falls back to the original chunk when no fence is found.
  const stripToFenceIfPresent = (chunk: string): string => {
    const m = chunk.match(/```(?:[a-zA-Z0-9_-]*\n)?([\s\S]+?)```/);
    return m ? m[1].trim() : chunk;
  };

  // 1. `---` delimited (legacy explicit separator)
  const dashed = cleaned.split(/\n---+\n/).map((b) => b.trim()).filter((b) => b.length > 50);
  if (dashed.length >= 2) return dashed.map(stripToFenceIfPresent);

  // 2. Numbered "OPCIÓN N" / "OPTION N" / "VARIANTE N" / "VERSIÓN N" headings.
  // This is what the chat actually emits most of the time, and is what the
  // user sees in the screenshot. Each match starts a new block; the block
  // runs until the next match or end of message.
  const optionRegex =
    /(?:^|\n)\s*(?:📌|✨|🎯|📝|⭐)?\s*(?:OPCIÓN|OPCION|OPTION|VARIANT|VARIANTE|VERSIÓN|VERSION|VARIACIÓN|VARIACION|VARIATION)\s*\d+\s*[:\-—]/gi;
  const matches = [...cleaned.matchAll(optionRegex)];
  if (matches.length >= 2) {
    const blocks: string[] = [];
    for (let i = 0; i < matches.length; i++) {
      const start = matches[i].index ?? 0;
      const end = i + 1 < matches.length ? (matches[i + 1].index ?? cleaned.length) : cleaned.length;
      blocks.push(stripToFenceIfPresent(cleaned.slice(start, end).trim()));
    }
    return blocks.filter((b) => b.length > 50);
  }

  // 3. Fenced code blocks (the model sometimes wraps the post in ```)
  const fenceMatches = [...cleaned.matchAll(/```(?:[a-zA-Z0-9_-]*\n)?([\s\S]+?)```/g)];
  if (fenceMatches.length >= 1) {
    const blocks = fenceMatches.map((m) => m[1].trim()).filter((b) => b.length > 50);
    if (blocks.length >= 1) return blocks;
  }

  // 4. Fall back: treat the whole message as a single block. The user can
  // always click "send to preview" and trim by hand. NOT in strict mode —
  // a fence-less message in strict mode is not a post.
  if (strict) return [];
  return [cleaned];
}

// Within a single detected block, find the actual post text. The chat often
// wraps the post in commentary ("## **VARIACIÓN 2: archetype name…**\n\n*(meta…)*
// \n\n<post>\n\nPor qué funciona: …"). We strip leading heading lines and
// trailing meta lines so the preview gets the post body, not the wrapper text.
function cleanBlockForPreview(block: string): string {
  let text = block.trim();

  // Iterate up to 3 leading lines and strip any that look like metadata:
  //   - markdown headings ("## **VARIACIÓN 2:**")
  //   - plain "OPCIÓN N: …" lines
  //   - italic / parenthesised meta ("(Arquetipo con 5.8x ratio…)")
  //   - leftover empty lines
  for (let i = 0; i < 3; i++) {
    const before = text;

    // (a) optional markdown leader (#, **) + option/variation keyword
    text = text.replace(
      /^\s*(?:#{1,6}\s*)?(?:\*\*|\*)?\s*(?:📌|✨|🎯|📝|⭐)?\s*(?:OPCIÓN|OPCION|OPTION|VARIANT|VARIANTE|VERSIÓN|VERSION|VARIACIÓN|VARIACION|VARIATION)\s*\d+[^\n]*\n+/i,
      ''
    );

    // (b) italic-wrapped or parenthesised meta line (often "(Arquetipo…)")
    text = text.replace(/^\s*(?:\*+\s*)?\(?[^()\n]*?(?:rati[oó]|arquetipo|formato|estilo|hook)[^()\n]*\)?\*?\s*\n+/i, '');

    // (c) plain leading parens line
    text = text.replace(/^\s*\*?\([^)\n]*\)\*?\s*\n+/, '');

    if (text === before) break;
    text = text.trimStart();
  }

  // Strip a trailing "Por qué funciona:" / "Why this works:" commentary block
  // (everything from that label to the end of the block).
  text = text.replace(/\n+(?:Por qué funciona|Why this works|Why it works|Mi recomendación|Recomendación)[\s\S]*$/i, '');

  // Strip surrounding code-block fences if any survived.
  text = text.replace(/^```[a-zA-Z0-9_-]*\n?/, '').replace(/\n?```\s*$/, '');

  // Strip stray leading/trailing markdown bold/italic markers
  text = text.replace(/^\*+\s*/, '').replace(/\s*\*+$/, '');

  return text.trim();
}

export default function PostCreator() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [streaming, setStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [personas, setPersonas] = useState<Persona[]>([]);
  const [personaId, setPersonaId] = useState<string | null>(null);
  const [previewText, setPreviewText] = useState<string>('');
  // null = user hasn't edited (use the latest generated text); string = user
  // has typed something, including '' if they cleared the field. This split
  // matters because `manualPreview || previewText` falls back to previewText
  // on empty, so without the sentinel the textarea snaps back to the
  // pre-edit text the moment the user selects-all and deletes.
  const [manualPreview, setManualPreview] = useState<string | null>(null);
  // Usage (API spend) opens as a modal from a button here instead of being
  // its own header section — one fewer top-level tab.
  const [showUsage, setShowUsage] = useState(false);
  // The right column just renders the LinkedIn preview + an editable
  // textarea. The image and carousel generators were removed — the team
  // prefers producing those assets directly in ChatGPT's web app.
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  // Lets the "Stop" button abort the in-flight /api/chat fetch. Set at the
  // start of each stream, cleared when it ends.
  const abortControllerRef = useRef<AbortController | null>(null);
  // Images the user has attached to the NEXT message they send. Cleared
  // after send. Each entry is base64 in a data URL so we can both render
  // a thumbnail and forward the bytes inline to Anthropic.
  const [pendingImages, setPendingImages] = useState<AttachedImage[]>([]);
  // Edit-in-place state: when the user clicks the pencil on a previous
  // user turn we capture its index here and copy the current text into
  // editingDraft. The chat then renders an inline editor in place of
  // that bubble, with Send (truncates history + re-streams) / Cancel.
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editingDraft, setEditingDraft] = useState<string>('');

  // Load managed accounts (Iker / Unai …) for the preview persona picker.
  useEffect(() => {
    fetch(`${BASE}/api/accounts`)
      .then((r) => r.json())
      .then((data) => {
        const list: Persona[] = Array.isArray(data)
          ? data.map((a: any) => ({
              id: a.id,
              name: a.name,
              headline: a.headline,
              profile_image_url: a.profile_image_url,
              followers_count: a.followers_count ?? 0,
            }))
          : [];
        setPersonas(list);
        if (list.length > 0) setPersonaId((prev) => prev ?? list[0].id);
      })
      .catch(() => {});
  }, []);

  const activePersona = personas.find((p) => p.id === personaId) || null;

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 200) + 'px';
    }
  }, [input]);

  // Auto-update preview with the latest POST block from the most recent
  // assistant message that actually contains a post. Strict mode: only
  // messages with a fenced post count — a plain reply with no post (a
  // question, an explanation, a validation warning) is skipped, so the
  // preview keeps showing the last real post instead of dumping a
  // non-post reply into it.
  useEffect(() => {
    for (let i = messages.length - 1; i >= 0; i--) {
      if (messages[i].role === 'assistant') {
        const blocks = extractPostBlocks(messages[i].content, true);
        if (blocks.length > 0) {
          // Pick longest block (typically the full post) and strip wrapper text
          const longest = blocks.reduce((a, b) => (a.length > b.length ? a : b));
          setPreviewText(cleanBlockForPreview(longest));
          return;
        }
      }
    }
  }, [messages]);

  // File -> data URL with size/type validation. Sets error on rejection so
  // the user sees why nothing happened.
  const readFileAsImage = (file: File): Promise<AttachedImage | null> => {
    return new Promise((resolve) => {
      if (!ACCEPTED_IMAGE_TYPES.includes(file.type as AttachedImage['mediaType'])) {
        setError(`Unsupported image type: ${file.type || 'unknown'}. Use JPEG, PNG, GIF or WebP.`);
        resolve(null);
        return;
      }
      if (file.size > MAX_IMAGE_BYTES) {
        setError(`Image too large (${(file.size / 1024 / 1024).toFixed(1)}MB). Max 5MB.`);
        resolve(null);
        return;
      }
      const reader = new FileReader();
      reader.onload = () => {
        const dataUrl = typeof reader.result === 'string' ? reader.result : '';
        if (!dataUrl) { resolve(null); return; }
        resolve({ dataUrl, mediaType: file.type as AttachedImage['mediaType'] });
      };
      reader.onerror = () => { setError('Could not read image file.'); resolve(null); };
      reader.readAsDataURL(file);
    });
  };

  const handleFiles = async (files: FileList | File[]) => {
    setError(null);
    const arr = Array.from(files);
    const results: AttachedImage[] = [];
    for (const f of arr) {
      const img = await readFileAsImage(f);
      if (img) results.push(img);
    }
    if (results.length > 0) setPendingImages((prev) => [...prev, ...results]);
  };

  const handlePaste = async (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const items = e.clipboardData?.items;
    if (!items) return;
    const imgFiles: File[] = [];
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (item.kind === 'file' && item.type.startsWith('image/')) {
        const f = item.getAsFile();
        if (f) imgFiles.push(f);
      }
    }
    if (imgFiles.length > 0) {
      e.preventDefault();
      await handleFiles(imgFiles);
    }
  };

  // Core streaming pipeline: takes a fully-formed message list ending in
  // the user turn we want to fire, paints an empty assistant bubble,
  // POSTs to /api/chat, and folds the SSE chunks into that bubble.
  // Used by both sendMessage (new turn) and submitEdit (re-run from a
  // truncated history). On error we roll the assistant placeholder back.
  const streamResponseFor = async (newMessages: Message[]) => {
    setMessages([...newMessages, { role: 'assistant', content: '' }]);
    setStreaming(true);
    const controller = new AbortController();
    abortControllerRef.current = controller;
    let assistantContent = '';
    try {
      const res = await fetch(`${BASE}/api/chat`, {
        method: 'POST',
        signal: controller.signal,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          // When a turn has images we send content blocks (text + image
          // sources). Turns without images stay as plain strings to keep
          // the payload small. Anthropic accepts both shapes in the same
          // conversation.
          messages: newMessages.map((m) => {
            if (m.images && m.images.length > 0) {
              const blocks: any[] = [];
              if (m.content) blocks.push({ type: 'text', text: m.content });
              for (const img of m.images) {
                blocks.push({
                  type: 'image',
                  source: {
                    type: 'base64',
                    media_type: img.mediaType,
                    data: img.dataUrl.split(',')[1] || '',
                  },
                });
              }
              return { role: m.role, content: blocks };
            }
            return { role: m.role, content: m.content };
          }),
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || `Error ${res.status}`);
      }

      const reader = res.body?.getReader();
      if (!reader) throw new Error('No reader available');

      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          const data = line.slice(6);
          if (data === '[DONE]') continue;

          try {
            const parsed = JSON.parse(data);
            if (parsed.error) throw new Error(parsed.error);
            if (parsed.text) {
              assistantContent += parsed.text;
              setMessages((prev) => {
                const updated = [...prev];
                updated[updated.length - 1] = { role: 'assistant', content: assistantContent };
                return updated;
              });
            }
          } catch {}
        }
      }
    } catch (err: any) {
      // User pressed Stop → keep whatever the assistant streamed so far
      // (don't roll the bubble back, don't surface an error). Only drop
      // the placeholder if nothing had been generated yet.
      if (err?.name === 'AbortError') {
        if (!assistantContent) setMessages((prev) => prev.slice(0, -1));
      } else {
        setError(err.message);
        setMessages((prev) => prev.slice(0, -1));
      }
    } finally {
      abortControllerRef.current = null;
      setStreaming(false);
    }
  };

  // Stop the in-flight response. Aborts the fetch; streamResponseFor's
  // catch keeps the partial assistant text.
  const stopStreaming = () => {
    abortControllerRef.current?.abort();
  };

  const sendMessage = async (text?: string) => {
    const content = text || input.trim();
    // Allow sending an image-only message (no text) — Claude can still
    // analyse the image. But require at least one of the two.
    if ((!content && pendingImages.length === 0) || streaming) return;

    const imagesToSend = pendingImages;
    setInput('');
    setPendingImages([]);
    setError(null);

    const userMsg: Message = {
      role: 'user',
      content,
      ...(imagesToSend.length > 0 ? { images: imagesToSend } : {}),
    };
    await streamResponseFor([...messages, userMsg]);
  };

  // Re-send an earlier user turn after editing it. We DROP everything
  // from that turn onwards (the assistant's old reply + any subsequent
  // turns) and re-stream from the truncated history with the edited
  // message in place — same shape ChatGPT / Claude.ai use when the
  // user clicks the pencil on a previous turn.
  const submitEdit = async (index: number) => {
    const original = messages[index];
    if (!original || original.role !== 'user' || streaming) return;
    const newText = editingDraft.trim();
    if (!newText && !(original.images && original.images.length > 0)) return;

    const editedMsg: Message = {
      role: 'user',
      content: newText,
      ...(original.images && original.images.length > 0 ? { images: original.images } : {}),
    };
    const truncated = messages.slice(0, index);
    setEditingIndex(null);
    setEditingDraft('');
    setError(null);
    await streamResponseFor([...truncated, editedMsg]);
  };

  const beginEdit = (index: number) => {
    const msg = messages[index];
    if (!msg || msg.role !== 'user' || streaming) return;
    setEditingIndex(index);
    setEditingDraft(msg.content || '');
  };

  const cancelEdit = () => {
    setEditingIndex(null);
    setEditingDraft('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  const activePreviewText = manualPreview != null ? manualPreview : previewText;

  return (
    // Offset = global nav (~64px) + the <main> py-8 top+bottom (64px) so
    // the input bar lands inside the viewport at entry (no scroll). The
    // old -80px under-counted the chrome and pushed Send below the fold.
    <div className="flex flex-col h-[calc(100vh-128px)]">
      {/* Compact header — just the title. The "My Profile" tab was removed:
          we post for our managed accounts (Iker, Unai, Asier) and that
          standalone profile was stale; voice/style now comes from the single
          generic Neety voice and the preview identity is chosen per-post below. */}
      <div className="flex items-center border-b border-border mb-3 pr-1">
        <h1 className="text-lg font-semibold text-text-primary leading-none py-2">Post Creator</h1>
        <button
          onClick={() => setShowUsage(true)}
          className="ml-auto text-xs px-2.5 py-1 rounded-md border border-border text-text-secondary hover:text-accent hover:border-accent/40 transition-colors"
          title="Ver el gasto de la API (Usage)"
        >
          💸 Usage
        </button>
      </div>

      {(
        <div className="flex-1 flex gap-4 min-h-0">
          {/* Chat column — min-h-0 is essential: without it the column
              expands with its content past the viewport, which silently
              defeats the overflow-y-auto on the scroll wrapper below
              and makes long assistant replies appear truncated. */}
          <div className="flex-1 flex flex-col min-w-0 min-h-0">
            <div className="flex-1 overflow-y-auto space-y-4 pb-4">
              {messages.length === 0 && (
                <div className="flex flex-col items-center justify-center h-full text-center">
                  <div className="text-5xl mb-4">&#x270D;&#xFE0F;</div>
                  <h2 className="text-xl font-semibold text-text-primary mb-1">Create viral LinkedIn posts</h2>
                  <p className="text-text-muted text-sm mb-5">Based on your outlier data.</p>
                  <div className="max-w-md text-left text-xs text-text-muted space-y-2">
                    <p>🎬 Type <span className="text-accent">"modo texto"</span> for LinkedIn posts or <span className="text-accent">"modo video"</span> for video scripts.</p>
                    <p>🧑 Elige <span className="text-accent">"Ver como"</span> en el preview para verlo con el nombre y la foto de esa cuenta (Iker, Unai o Asier).</p>
                    <p>🖼️ Also suggests post image ideas, based on what actually works.</p>
                  </div>
                </div>
              )}

              {messages.map((msg, i) => (
                <div
                  key={i}
                  className={`group flex items-start gap-2 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  {/* Pencil — only on user turns, only when not currently
                      editing, only when not streaming. Sits to the LEFT
                      of the bubble (which itself sits on the right edge),
                      reveals on hover via group-hover, and on click swaps
                      the bubble for an inline editor. */}
                  {msg.role === 'user' && editingIndex !== i && !streaming && (
                    <button
                      onClick={() => beginEdit(i)}
                      title="Edit this message and re-run the conversation from here"
                      aria-label="Edit message"
                      className="self-center mt-1 opacity-0 group-hover:opacity-100 transition-opacity p-1.5 rounded-md text-text-muted hover:text-accent hover:bg-bg-card border border-transparent hover:border-border"
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M12 20h9" />
                        <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
                      </svg>
                    </button>
                  )}

                  {/* When this user turn is the one being edited, render
                      an inline editor in place of the bubble. Cancel
                      restores the bubble; Send truncates history at this
                      index and re-streams with the new text. */}
                  {msg.role === 'user' && editingIndex === i ? (
                    <div className="max-w-[90%] w-full sm:w-[520px] bg-bg-card border border-accent/40 rounded-xl px-3 py-3">
                      {msg.images && msg.images.length > 0 && (
                        <div className="flex flex-wrap gap-2 mb-2">
                          {msg.images.map((img, ii) => (
                            <img
                              key={ii}
                              src={img.dataUrl}
                              alt={`Attached ${ii + 1}`}
                              className="max-h-32 rounded-lg border border-border object-cover"
                            />
                          ))}
                        </div>
                      )}
                      <textarea
                        value={editingDraft}
                        onChange={(e) => setEditingDraft(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault();
                            submitEdit(i);
                          } else if (e.key === 'Escape') {
                            e.preventDefault();
                            cancelEdit();
                          }
                        }}
                        autoFocus
                        rows={Math.min(8, Math.max(2, editingDraft.split('\n').length))}
                        className="w-full bg-bg-primary border border-border rounded-lg px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent/50 resize-none"
                      />
                      <div className="flex items-center justify-end gap-2 mt-2">
                        <button
                          onClick={cancelEdit}
                          className="px-3 py-1.5 text-xs text-text-muted hover:text-text-primary transition-colors"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={() => submitEdit(i)}
                          disabled={!editingDraft.trim() && !(msg.images && msg.images.length > 0)}
                          className="px-3 py-1.5 bg-accent text-bg-primary rounded-lg text-xs font-medium disabled:opacity-40 hover:bg-accent-light transition-colors"
                        >
                          Send
                        </button>
                      </div>
                      <p className="text-[10px] text-text-muted mt-1.5">
                        Sending will discard the {messages.length - i - 1} message{messages.length - i - 1 === 1 ? '' : 's'} after this one and continue the conversation from here.
                      </p>
                    </div>
                  ) : (
                  <div
                    className={`max-w-[90%] rounded-xl px-4 py-3 ${
                      msg.role === 'user'
                        ? 'bg-accent/20 text-text-primary'
                        : 'bg-bg-card border border-border text-text-primary'
                    }`}
                  >
                    {msg.role === 'assistant' ? (
                      <div>
                        <MarkdownMessage
                          content={msg.content}
                          onPreview={(text) => {
                            setManualPreview(cleanBlockForPreview(text));
                          }}
                        />

                        {msg.content && !streaming && (() => {
                          // Strict: only show preview buttons when the message
                          // actually contains a fenced post. A plain reply with
                          // no post gets just "Copy all" — never a button that
                          // would push a non-post into the LinkedIn preview.
                          const blocks = extractPostBlocks(msg.content, true);
                          const hasPost = blocks.length > 0;
                          const showPerBlockButtons = blocks.length > 1;
                          return (
                            <div className="flex gap-1.5 mt-3 pt-2 border-t border-border/50 flex-wrap items-center">
                              {hasPost && showPerBlockButtons && (
                                blocks.map((block, bi) => (
                                  <button
                                    key={bi}
                                    onClick={() => {
                                      const clean = cleanBlockForPreview(block);
                                      setManualPreview(clean);
                                    }}
                                    className="text-[11px] px-2.5 py-1 rounded-md border border-accent/30 bg-accent/10 text-accent hover:bg-accent/20 transition-colors"
                                  >
                                    📤 Preview opción {bi + 1}
                                  </button>
                                ))
                              )}
                              {hasPost && !showPerBlockButtons && (
                                <button
                                  onClick={() => {
                                    const clean = cleanBlockForPreview(blocks[0]);
                                    setManualPreview(clean);
                                  }}
                                  className="text-[11px] px-2.5 py-1 rounded-md border border-accent/30 bg-accent/10 text-accent hover:bg-accent/20 transition-colors"
                                >
                                  📤 Send to preview
                                </button>
                              )}
                              <span className="ml-auto flex gap-2">
                                <button
                                  onClick={() => copyToClipboard(msg.content)}
                                  className="text-[10px] text-text-muted hover:text-accent transition-colors"
                                >
                                  Copy all
                                </button>
                              </span>
                            </div>
                          );
                        })()}

                        {streaming && i === messages.length - 1 && (
                          <span className="inline-block w-2 h-4 bg-accent animate-pulse ml-0.5" />
                        )}
                      </div>
                    ) : (
                      <div>
                        {msg.images && msg.images.length > 0 && (
                          <div className="flex flex-wrap gap-2 mb-2">
                            {msg.images.map((img, ii) => (
                              <img
                                key={ii}
                                src={img.dataUrl}
                                alt={`Attached ${ii + 1}`}
                                className="max-h-48 rounded-lg border border-border object-cover"
                              />
                            ))}
                          </div>
                        )}
                        {msg.content && <p className="text-sm whitespace-pre-wrap">{msg.content}</p>}
                      </div>
                    )}
                  </div>
                  )}
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>

            {error && (
              <div className="bg-danger/10 border border-danger/30 rounded-lg p-3 mb-3 text-danger text-sm">
                {error}
              </div>
            )}

            <div className="border-t border-border pt-4">
              {pendingImages.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-2">
                  {pendingImages.map((img, i) => (
                    <div key={i} className="relative group">
                      <img
                        src={img.dataUrl}
                        alt={`Attachment ${i + 1}`}
                        className="h-16 w-16 rounded-lg border border-border object-cover"
                      />
                      <button
                        onClick={() => setPendingImages((prev) => prev.filter((_, idx) => idx !== i))}
                        disabled={streaming}
                        className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-bg-primary border border-border text-text-muted hover:text-danger hover:border-danger/50 text-[10px] leading-none flex items-center justify-center transition-colors disabled:opacity-40"
                        aria-label="Remove image"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
              )}
              <div className="flex gap-3 items-end">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept={ACCEPTED_IMAGE_TYPES.join(',')}
                  multiple
                  className="hidden"
                  onChange={(e) => {
                    if (e.target.files) handleFiles(e.target.files);
                    if (fileInputRef.current) fileInputRef.current.value = '';
                  }}
                />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={streaming}
                  title="Attach image (or paste from clipboard)"
                  aria-label="Attach image"
                  className="shrink-0 h-[46px] w-[46px] flex items-center justify-center bg-bg-card border border-border rounded-xl text-text-muted hover:text-accent hover:border-accent/50 disabled:opacity-40 transition-colors"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="w-5 h-5"
                  >
                    <path d="m21.44 11.05-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48" />
                  </svg>
                </button>
                <textarea
                  ref={textareaRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  onPaste={handlePaste}
                  placeholder="Describe the post you want to create... (paste or attach images for reference)"
                  rows={1}
                  className="flex-1 bg-bg-card border border-border rounded-xl px-4 py-3 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent/50 resize-none"
                  disabled={streaming}
                />
                {streaming ? (
                  <button
                    onClick={stopStreaming}
                    title="Stop generating"
                    className="px-5 py-3 bg-bg-card border border-border text-text-primary rounded-xl text-sm font-medium hover:border-danger/50 hover:text-danger transition-colors whitespace-nowrap inline-flex items-center gap-2"
                  >
                    <span className="inline-block w-2.5 h-2.5 bg-current rounded-[2px]" />
                    Stop
                  </button>
                ) : (
                  <button
                    onClick={() => sendMessage()}
                    disabled={!input.trim() && pendingImages.length === 0}
                    className="px-5 py-3 bg-accent text-bg-primary rounded-xl text-sm font-medium disabled:opacity-40 hover:bg-accent-light transition-colors whitespace-nowrap"
                  >
                    Send
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Preview column — the LinkedIn post preview + inline editor. */}
          <div className="w-[460px] flex-shrink-0 flex flex-col min-h-0">
            {/* Header: title + actions. Stays at the top of the column as a
                flex sibling above the scrolling content pane. */}
            <div className="flex-shrink-0 pb-2">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-semibold text-text-primary">LinkedIn Preview</h3>
                {activePreviewText && (
                  <div className="flex items-center gap-2 text-[10px] text-text-muted">
                    <button
                      onClick={() => copyToClipboard(activePreviewText)}
                      className="hover:text-accent transition-colors"
                      title="Copiar texto"
                    >
                      📋 Copiar
                    </button>
                    <span className="text-border">·</span>
                    <button
                      onClick={() => {
                        setManualPreview(null);
                        setPreviewText('');
                      }}
                      className="hover:text-danger transition-colors"
                      title="Limpiar preview"
                    >
                      ✕ Clear
                    </button>
                  </div>
                )}
              </div>

              {/* Persona picker — preview the post as any managed account
                  (name + photo pulled live from Accounts). */}
              {personas.length > 0 && (
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] text-text-muted mr-0.5">Ver como:</span>
                  {personas.map((p) => (
                    <button
                      key={p.id}
                      onClick={() => setPersonaId(p.id)}
                      className={`flex items-center gap-1.5 text-[11px] px-2 py-1 rounded-full border transition-colors ${
                        p.id === personaId
                          ? 'border-accent/50 bg-accent/10 text-accent'
                          : 'border-border bg-bg-card text-text-muted hover:border-accent/30'
                      }`}
                    >
                      {p.profile_image_url ? (
                        <img src={p.profile_image_url} alt="" className="w-4 h-4 rounded-full object-cover" />
                      ) : (
                        <span className="w-4 h-4 rounded-full bg-bg-secondary inline-flex items-center justify-center text-[8px]">
                          {(p.name || '?')[0]}
                        </span>
                      )}
                      {(p.name || 'Cuenta').split(' ')[0]}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Stacked content — preview + inline editor. */}
            <div className="flex-1 overflow-y-auto pb-4 space-y-4">
              {!activePreviewText ? (
                <div className="bg-bg-card border border-dashed border-border rounded-xl p-8 text-center text-text-muted text-xs">
                  Your post preview will appear here once the AI generates content.
                  <br />
                  <br />
                  You can also paste any text below to preview it.
                  <textarea
                    value={manualPreview ?? ''}
                    onChange={(e) => setManualPreview(e.target.value)}
                    rows={5}
                    className="w-full mt-3 bg-bg-primary border border-border rounded-lg px-3 py-2 text-xs text-text-secondary focus:outline-none focus:border-accent/50 resize-none text-left"
                    placeholder="Paste post text..."
                  />
                </div>
              ) : (
                <>
                  {/* The post preview itself. */}
                  <div>
                    <LinkedInPostPreview
                      text={activePreviewText}
                      authorName={activePersona?.name}
                      authorHeadline={activePersona?.headline}
                      authorImage={activePersona?.profile_image_url}
                      followersCount={activePersona?.followers_count}
                    />
                    {/* Always-visible edit textarea — typing here updates the
                        preview above in real time. The previous "✏️ Editar"
                        toggle hid this and broke the core editing flow. */}
                    <div className="mt-3 max-w-lg mx-auto">
                      <div className="flex items-center justify-between mb-1">
                        <label className="block text-[11px] text-text-muted font-medium">
                          ✏️ Editar texto del post
                        </label>
                        <span className="text-[10px] text-text-muted">
                          {activePreviewText.length} chars
                        </span>
                      </div>
                      <textarea
                        value={activePreviewText}
                        onChange={(e) => setManualPreview(e.target.value)}
                        rows={8}
                        className="w-full bg-bg-card border border-border rounded-lg px-3 py-2 text-xs text-text-secondary focus:outline-none focus:border-accent/50 resize-y leading-relaxed"
                        placeholder="Edit the post to see the preview update..."
                      />
                      <p className="text-[10px] text-text-muted mt-1">
                        Los cambios se reflejan en vivo en el preview de arriba.
                      </p>
                    </div>
                  </div>

                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Usage modal — opens from the 💸 Usage button above the preview.
          Click the backdrop or "Cerrar" to return to the Post Creator. */}
      {showUsage && (
        <div
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-start justify-center p-4 sm:p-8 overflow-y-auto"
          onClick={() => setShowUsage(false)}
        >
          <div
            className="bg-bg-primary border border-border rounded-xl w-full max-w-5xl my-auto shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-end px-4 py-2.5 border-b border-border sticky top-0 bg-bg-primary rounded-t-xl z-10">
              <button
                onClick={() => setShowUsage(false)}
                className="text-xs text-text-muted hover:text-text-primary px-2.5 py-1 rounded-md hover:bg-bg-hover transition-colors"
                aria-label="Cerrar Usage"
              >
                ✕ Cerrar
              </button>
            </div>
            <div className="p-5 max-h-[80vh] overflow-y-auto">
              <Usage />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
