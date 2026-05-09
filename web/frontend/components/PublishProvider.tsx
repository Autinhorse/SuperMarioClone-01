"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
} from "react";

type Status = "draft" | "published";

type PublishCtxValue = {
  status: Status;
  /** True iff the level needs a fresh playthrough verify before
   *  publishing. Mirrors the server gate: PUT /api/levels/[id] (data
   *  save) sets last_cleared_at to NULL, and POST mark-cleared sets it
   *  back to a timestamp; this flag tracks the same boolean state
   *  client-side. Initial value comes from LevelDetail.needsPlaytest. */
  needsPlaytest: boolean;
  /** Called by the iframe host (EditFrame on edit page, GameFrame on
   *  play page) after a successful POST mark-cleared. */
  markCleared: () => void;
  /** Called by EditFrame after a successful PUT save (data write). */
  markDirty: () => void;
  /** Called by PublishToggle after a successful PATCH status flip. */
  setStatus: (next: Status) => void;
  /** Triggers a publish-verify playthrough in the iframe. Only the
   *  edit page registers a real implementation (EditFrame posts
   *  ricochet:start-publish-verify into the iframe so EditScene
   *  hands off to PlayScene from page 0). On the play page no
   *  starter is registered — the user just plays normally and the
   *  natural exit posts level-cleared. */
  startVerify: () => void;
  /** True when an iframe host has registered a verify starter. The
   *  PublishToggle uses this to decide whether the gray Publish click
   *  should silently kick off the playthrough (force) or pop an
   *  explainer modal (natural — "play through to verify"). */
  canForceVerify: boolean;
  /** Iframe host registers an imperative "start verify" function.
   *  Returns an unregister callback for cleanup. */
  registerVerifyStarter: (fn: () => void) => () => void;
};

const PublishCtx = createContext<PublishCtxValue | null>(null);

export function usePublishCtx(): PublishCtxValue {
  const v = useContext(PublishCtx);
  if (!v) {
    throw new Error("usePublishCtx must be used inside <PublishProvider>.");
  }
  return v;
}

// Returns null when no <PublishProvider> is in scope. Used by surfaces
// (e.g. GameFrame on the play page) that only get a provider when the
// viewer is the owner — non-owner renders skip the publish coordination
// entirely without the component needing two render paths.
export function usePublishCtxOptional(): PublishCtxValue | null {
  return useContext(PublishCtx);
}

// Shared state holder for the publish flow. Used on both the edit page
// (where EditFrame registers a force-verify starter that postMessages
// into the editor iframe) and the play page (where the user simply
// plays and the natural level-completed event flips the gate). The
// PublishToggle reads from this context and adapts its UI based on
// canForceVerify.
export function PublishProvider({
  initialStatus,
  initialNeedsPlaytest,
  children,
}: {
  initialStatus: Status;
  initialNeedsPlaytest: boolean;
  children: React.ReactNode;
}) {
  const [status, setStatus] = useState<Status>(initialStatus);
  const [needsPlaytest, setNeedsPlaytest] = useState<boolean>(
    initialNeedsPlaytest,
  );
  const verifyStarterRef = useRef<(() => void) | null>(null);
  const [canForceVerify, setCanForceVerify] = useState<boolean>(false);

  const markCleared = useCallback(() => setNeedsPlaytest(false), []);
  const markDirty = useCallback(() => setNeedsPlaytest(true), []);

  const startVerify = useCallback(() => {
    verifyStarterRef.current?.();
  }, []);

  const registerVerifyStarter = useCallback((fn: () => void) => {
    verifyStarterRef.current = fn;
    setCanForceVerify(true);
    return () => {
      if (verifyStarterRef.current === fn) {
        verifyStarterRef.current = null;
        setCanForceVerify(false);
      }
    };
  }, []);

  const value = useMemo<PublishCtxValue>(
    () => ({
      status,
      needsPlaytest,
      markCleared,
      markDirty,
      setStatus,
      startVerify,
      canForceVerify,
      registerVerifyStarter,
    }),
    [
      status,
      needsPlaytest,
      markCleared,
      markDirty,
      startVerify,
      canForceVerify,
      registerVerifyStarter,
    ],
  );

  return <PublishCtx.Provider value={value}>{children}</PublishCtx.Provider>;
}
