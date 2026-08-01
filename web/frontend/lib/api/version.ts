import { fail } from "./respond";

// Client-version negotiation for /api/v1/ (ADR-004).
//
// The whole reason /api/v1/ exists instead of letting the game talk to
// PostgREST is that a shipped binary cannot be updated in lockstep with this
// repo. This is the escape hatch for the case where it must be: the server can
// answer 426 with a human-readable reason, and the client surfaces "please
// update" rather than a raw error.
//
// Today every version is accepted — MIN_CLIENT is 0 and the header is
// optional. That is intentional: rejecting clients is a decision to make when
// there is actually an incompatibility, not a policy to switch on up front.
// The plumbing exists now so that raising MIN_CLIENT later is a one-line
// change rather than a protocol addition an old binary can't understand.

/** Bump this only when older clients genuinely cannot work against the current
 *  server, and expect every install below it to stop functioning. */
export const MIN_CLIENT = 0;

/** Header the game client sends, e.g. "X-Client-Version: 4". Plain integer —
 *  a monotonic build number, not semver, so comparison can't get creative. */
export const CLIENT_VERSION_HEADER = "X-Client-Version";

export function checkClientVersion(req: Request) {
  const raw = req.headers.get(CLIENT_VERSION_HEADER);
  // Absent header → allowed. curl, the web app itself, and anything exploring
  // the API shouldn't need to know about this.
  if (raw === null) return null;

  const version = Number.parseInt(raw, 10);
  if (!Number.isFinite(version)) return null; // unparseable → treat as absent

  if (version < MIN_CLIENT) {
    return fail(
      426,
      "This version of the game is too old to talk to the server. Please update.",
      "upgrade_required",
    );
  }
  return null;
}
