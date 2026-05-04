import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function TestSupabasePage() {
  const supabase = await createClient();

  const { data: authData, error: authError } = await supabase.auth.getUser();
  const dbProbe = await supabase.from("_connectivity_probe").select("*").limit(1);

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "(missing)";
  const keyPrefix = (process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? "").slice(0, 20);

  // Auth service responded if either: a session was returned, no error, OR the error
  // is the expected "no session" signal (which itself proves GoTrue is reachable).
  const authReachable =
    !authError ||
    authError.message === "Auth session missing!" ||
    authError.status === 400;

  const dbReachable =
    dbProbe.error?.code === "PGRST205" ||
    dbProbe.error?.code === "PGRST106" ||
    dbProbe.error?.code === "42P01" ||
    dbProbe.data !== null;

  return (
    <main className="px-6 lg:px-10 py-10 max-w-3xl mx-auto">
      <h1 className="font-display font-bold text-3xl mb-6">Supabase connectivity test</h1>

      <section className="rounded-2xl border-2 border-ink bg-white p-5 mb-4 shadow-[4px_4px_0_0_var(--color-ink)]">
        <h2 className="font-display font-bold text-lg mb-2">Env</h2>
        <dl className="text-sm font-mono space-y-1">
          <div>URL: {url}</div>
          <div>Publishable key prefix: {keyPrefix}…</div>
        </dl>
      </section>

      <section className="rounded-2xl border-2 border-ink bg-white p-5 mb-4 shadow-[4px_4px_0_0_var(--color-ink)]">
        <h2 className="font-display font-bold text-lg mb-2">
          Auth service (GoTrue):{" "}
          {authReachable ? (
            <span className="text-brand-green">OK</span>
          ) : (
            <span className="text-brand-coral">FAIL</span>
          )}
        </h2>
        <p className="text-sm">
          Current user:{" "}
          <code>{authData.user ? authData.user.id : "null (not signed in — expected)"}</code>
        </p>
        {authError && (
          <pre className="mt-2 text-xs text-ink/60 whitespace-pre-wrap">
            Auth response: {authError.message}{" "}
            {authReachable && <span className="text-brand-green">(this is the expected "no session" signal)</span>}
          </pre>
        )}
      </section>

      <section className="rounded-2xl border-2 border-ink bg-white p-5 mb-4 shadow-[4px_4px_0_0_var(--color-ink)]">
        <h2 className="font-display font-bold text-lg mb-2">
          DB service (PostgREST):{" "}
          {dbReachable ? (
            <span className="text-brand-green">OK</span>
          ) : (
            <span className="text-brand-coral">FAIL</span>
          )}
        </h2>
        <p className="text-sm">
          Probed missing table <code>_connectivity_probe</code>. Expecting a "table not found" error
          (PGRST205 / PGRST106 / 42P01) — that proves we can reach PostgREST.
        </p>
        {dbProbe.error && (
          <pre className="mt-2 text-xs whitespace-pre-wrap">
            code: {dbProbe.error.code}
            {"\n"}message: {dbProbe.error.message}
          </pre>
        )}
      </section>

      <p className="text-xs text-ink/60 mt-6">
        This page is a developer tool. Delete <code>app/test-supabase/</code> before launch.
      </p>
    </main>
  );
}
