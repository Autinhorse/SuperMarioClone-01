import type { SupabaseClient, User } from "@supabase/supabase-js";
import type { MutationResult } from "./mutations";
import type { ApiErrorCode } from "@/lib/api/respond";

// Player feedback on a level: ratings and reports.
//
// Split from mutations.ts (which is about the level row itself) and shared by
// both API surfaces for the usual reason — the cookie routes and /api/v1/ must
// not drift on rules like "you can't rate your own level". These functions take
// the Supabase client and the already-authenticated user, so the caller decides
// whether it is cookie-bound or bearer-bound.

/** Failure with a machine code, so a native client can branch on it. */
export type FeedbackFailure = {
  ok: false;
  status: number;
  error: string;
  code: ApiErrorCode;
};

export type FeedbackResult<T> = { ok: true; value: T } | FeedbackFailure;

export const RATING_MIN = 1;
export const RATING_MAX = 5;

export const REPORT_REASONS = [
  "inappropriate",
  "broken",
  "stolen",
  "other",
] as const;
export type ReportReason = (typeof REPORT_REASONS)[number];
export const REPORT_DETAIL_MAX = 1000;

export function isReportReason(value: string): value is ReportReason {
  return (REPORT_REASONS as readonly string[]).includes(value);
}

/** The two checks both rating and reporting need: the level exists, and it is
 *  published and not the caller's own. Returns the row on success. */
async function requireOtherPublishedLevel(
  supabase: SupabaseClient,
  levelId: string,
  user: User,
  selfCode: ApiErrorCode,
  selfMessage: string,
): Promise<FeedbackResult<{ creator_id: string }>> {
  const { data, error } = await supabase
    .from("levels")
    .select("creator_id, status")
    .eq("id", levelId)
    .maybeSingle();
  if (error) {
    return { ok: false, status: 500, error: error.message, code: "server_error" };
  }
  // RLS hides other people's drafts, so "not found" here also covers
  // "exists but isn't yours to see" — deliberately indistinguishable.
  if (!data) {
    return { ok: false, status: 404, error: "Level not found.", code: "not_found" };
  }
  if (data.creator_id === user.id) {
    return { ok: false, status: 403, error: selfMessage, code: selfCode };
  }
  // Drafts shouldn't accumulate public feedback before the author intends to
  // publish — and a draft nobody else can see can't be meaningfully reported.
  if (data.status !== "published") {
    return {
      ok: false,
      status: 403,
      error: "Only published levels accept this.",
      code: "not_published",
    };
  }
  return { ok: true, value: { creator_id: data.creator_id } };
}

/**
 * Set or update the caller's 1–5 rating. Upsert keyed by (user_id, level_id) so
 * a re-rate overwrites; the `ratings_adjust_level` trigger keeps
 * `levels.rating_sum` / `rating_count` in sync.
 *
 * The owner check is enforced here rather than in RLS on purpose: a policy
 * denial gives an opaque message, and the client needs a specific code to show
 * "you can't rate your own level" instead of "something went wrong".
 */
export async function rateLevel(
  supabase: SupabaseClient,
  levelId: string,
  user: User,
  value: number,
): Promise<FeedbackResult<{ value: number }>> {
  if (
    typeof value !== "number" ||
    !Number.isInteger(value) ||
    value < RATING_MIN ||
    value > RATING_MAX
  ) {
    return {
      ok: false,
      status: 400,
      error: `value must be an integer between ${RATING_MIN} and ${RATING_MAX}.`,
      code: "bad_request",
    };
  }

  const gate = await requireOtherPublishedLevel(
    supabase,
    levelId,
    user,
    "self_rate",
    "You can't rate your own level.",
  );
  if (!gate.ok) return gate;

  const { error } = await supabase
    .from("ratings")
    .upsert(
      { user_id: user.id, level_id: levelId, value },
      { onConflict: "user_id,level_id" },
    );
  if (error) {
    return { ok: false, status: 500, error: error.message, code: "server_error" };
  }
  return { ok: true, value: { value } };
}

/** Remove the caller's rating. Deleting a missing row is a silent no-op, so
 *  this is idempotent — a client that isn't sure whether it rated can just call
 *  it. The trigger updates the aggregates. */
export async function unrateLevel(
  supabase: SupabaseClient,
  levelId: string,
  user: User,
): Promise<FeedbackResult<Record<string, never>>> {
  const { error } = await supabase
    .from("ratings")
    .delete()
    .eq("user_id", user.id)
    .eq("level_id", levelId);
  if (error) {
    return { ok: false, status: 500, error: error.message, code: "server_error" };
  }
  return { ok: true, value: {} };
}

/**
 * File (or amend) a report against a level.
 *
 * Upsert on the `(level_id, reporter_id)` unique key: re-reporting replaces the
 * previous submission rather than adding a row. One angry player should not be
 * able to bury a level under a hundred entries, and someone who picked the
 * wrong reason should be able to fix it.
 *
 * Reporting your own level is rejected — the author already has Delete, and a
 * self-report is either a mistake or an attempt to game whatever moderation
 * signal report count becomes.
 */
export async function reportLevel(
  supabase: SupabaseClient,
  levelId: string,
  user: User,
  reason: string,
  detail: string | null,
): Promise<FeedbackResult<Record<string, never>>> {
  if (!isReportReason(reason)) {
    return {
      ok: false,
      status: 400,
      error: `reason must be one of: ${REPORT_REASONS.join(", ")}.`,
      code: "bad_request",
    };
  }
  if (detail !== null && detail.length > REPORT_DETAIL_MAX) {
    return {
      ok: false,
      status: 400,
      error: `detail must be at most ${REPORT_DETAIL_MAX} characters.`,
      code: "bad_request",
    };
  }

  const gate = await requireOtherPublishedLevel(
    supabase,
    levelId,
    user,
    "self_report",
    "You can't report your own level — delete it instead.",
  );
  if (!gate.ok) return gate;

  const { error } = await supabase.from("reports").upsert(
    {
      level_id: levelId,
      reporter_id: user.id,
      reason,
      detail: detail === "" ? null : detail,
      // Amending a report puts it back in the queue: the moderator's earlier
      // decision was about the old text.
      status: "open",
    },
    { onConflict: "level_id,reporter_id" },
  );
  if (error) {
    return { ok: false, status: 500, error: error.message, code: "server_error" };
  }
  return { ok: true, value: {} };
}

/** Re-export so route files can keep one import for both shapes. */
export type { MutationResult };
