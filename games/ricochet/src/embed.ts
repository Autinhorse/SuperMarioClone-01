// postMessage protocol used when the game is embedded inside the
// LevelCraft web platform (iframe). Two modes:
//   ?mode=play&levelId=xxx → host posts level data, game posts back
//                            play-started / level-completed lifecycle events.
//   ?mode=edit&levelId=xxx → host posts level data, game posts back
//                            level-saved (request-response) for save flow.
//
// All messages are namespaced "ricochet:..." to coexist with other
// frames or extensions on the same window. Same-origin only — the game
// build is served from the same domain as the host site.

import type { LevelData } from './shared/level-format/types';

const NS = 'ricochet:';

export type EmbedMode = 'play' | 'edit';

export type EmbedContext = {
  embed: boolean;
  mode: EmbedMode | null;
  levelId: string | null;
};

export function detectEmbedMode(): EmbedContext {
  const params = new URLSearchParams(window.location.search);
  const rawMode = params.get('mode');
  const levelId = params.get('levelId');
  const mode: EmbedMode | null =
    rawMode === 'play' || rawMode === 'edit' ? rawMode : null;
  const embed = !!mode && !!levelId;
  return { embed, mode, levelId };
}

export function postToParent(type: string, payload: Record<string, unknown> = {}): void {
  const parent = window.parent;
  if (!parent || parent === window) return;
  parent.postMessage({ type: NS + type, ...payload }, window.location.origin);
}

// Resolves with the level JSON once the host posts it. Rejects on
// timeout — protects against the iframe being opened standalone (no
// parent listening) or a host bug that never sends the data.
export function waitForLevel(levelId: string, timeoutMs = 10_000): Promise<LevelData> {
  return new Promise((resolve, reject) => {
    const timer = window.setTimeout(() => {
      window.removeEventListener('message', handler);
      reject(new Error('Timed out waiting for level data from host page.'));
    }, timeoutMs);

    const handler = (ev: MessageEvent) => {
      if (ev.origin !== window.location.origin) return;
      const data = ev.data as { type?: string; levelId?: string; data?: unknown } | null;
      if (!data || typeof data !== 'object') return;
      if (data.type !== NS + 'level') return;
      if (data.levelId !== levelId) return;
      window.clearTimeout(timer);
      window.removeEventListener('message', handler);
      resolve(data.data as LevelData);
    };
    window.addEventListener('message', handler);

    postToParent('ready', { levelId });
  });
}

export type SaveResult = { ok: true } | { ok: false; error: string };

// Posts the edited level back to the host and waits for a save-result
// reply. The host calls a Route Handler that updates Supabase (RLS
// enforces ownership), then posts the result back. Single in-flight
// request — the editor's Save button is naturally debounced by the UI.
export function saveLevelToHost(
  levelId: string,
  data: LevelData,
  timeoutMs = 15_000,
): Promise<SaveResult> {
  return new Promise((resolve) => {
    const timer = window.setTimeout(() => {
      window.removeEventListener('message', handler);
      resolve({ ok: false, error: 'Timed out waiting for host save response.' });
    }, timeoutMs);

    const handler = (ev: MessageEvent) => {
      if (ev.origin !== window.location.origin) return;
      const msg = ev.data as
        | { type?: string; levelId?: string; ok?: boolean; error?: string }
        | null;
      if (!msg || typeof msg !== 'object') return;
      if (msg.type !== NS + 'save-result') return;
      if (msg.levelId !== levelId) return;
      window.clearTimeout(timer);
      window.removeEventListener('message', handler);
      if (msg.ok) resolve({ ok: true });
      else resolve({ ok: false, error: msg.error ?? 'Save failed.' });
    };
    window.addEventListener('message', handler);

    postToParent('level-saved', { levelId, data });
  });
}
