import { NextResponse } from "next/server";

// Shared response shapes for the JSON API routes.
//
// The convention already in use across app/api/levels/* is:
//   success → { ok: true, ...extra }        (never wrapped in `data`)
//   failure → { error: "&lt;human sentence&gt;", code?: "&lt;machine code&gt;" }
// `error` is a user-facing sentence with terminal punctuation; `code` is only
// present where the caller must branch programmatically.
//
// Collecting the codes into a union is new, and it exists for /api/v1/
// specifically: that surface is consumed by a *shipped binary* which cannot be
// updated in lockstep with this repo (ADR-004). A typo in a code string there
// is a silent behaviour change in an installed game, so the compiler should
// catch it. The web app's own fetch() callers benefit too, but they can always
// be redeployed — the binary can't.
export type ApiErrorCode =
  // pre-existing, used by app/api/levels/*
  | "playtest_required"
  | "thumbnail_failed"
  | "self_rate"
  | "not_published"
  // added with /api/v1/ feedback (rate / report)
  | "self_report"
  // added with /api/v1/
  | "not_authenticated"
  | "not_found"
  | "bad_request"
  | "forbidden"
  | "upgrade_required"
  | "server_error";

export function ok(extra: Record<string, unknown> = {}) {
  return NextResponse.json({ ok: true, ...extra });
}

// `code` is optional on purpose: several existing responses deliberately ship
// only a message (400s for malformed bodies, the 404 that hides row existence).
// Passing one is additive and never changes the status or message.
export function fail(
  status: number,
  error: string,
  code?: ApiErrorCode,
) {
  return NextResponse.json(code ? { error, code } : { error }, { status });
}

// The 404 used for "either it doesn't exist or it isn't yours". Deliberately
// ambiguous — it avoids leaking row existence while still giving the editor a
// useful signal. RLS is what actually made the write affect 0 rows.
export function notFoundOrForbidden(verb = "edit") {
  return fail(
    404,
    `Level not found, or you don't have permission to ${verb} it.`,
    "not_found",
  );
}
