/* La config del lead magnet en el navegador. Sigue existiendo como SEMILLA: los
   posts que ya estaban configurados a mano tienen aqui su tipo, y perderlo
   significa que un lead magnet de tipo Lista genera el DM normal. La fuente de
   verdad pasa a ser la base en cuanto la haya (ver useLmConfig). */
import type { LmConfig } from './lmTypes';
import { emptyConfig } from './lmTypes';

export function loadConfig(postId: string): LmConfig {
  try {
    const raw = localStorage.getItem(`lm-config:${postId}`);
    if (!raw) return emptyConfig;
    const p = JSON.parse(raw);
    return {
      // los configs viejos no tienen kind
      kind: p.kind === 'publico' || p.kind === 'lista' || p.kind === 'enlace' ? p.kind : 'dm',
      keyword: p.keyword || '',
      link: p.link || '',
      topic: p.topic || '',
    };
  } catch {
    return emptyConfig;
  }
}
export function saveConfig(postId: string, cfg: LmConfig) {
  try {
    localStorage.setItem(`lm-config:${postId}`, JSON.stringify(cfg));
  } catch {
    /* private mode / quota — the config just won't persist, not fatal */
  }
}
