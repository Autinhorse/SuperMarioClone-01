import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

type SearchParams = Promise<{ error?: string; check?: string }>;

export default async function SignupPage({ searchParams }: { searchParams: SearchParams }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user) redirect("/");

  const { error, check } = await searchParams;

  return (
    <main className="px-6 py-12 max-w-md mx-auto w-full">
      <h1 className="font-display font-bold text-3xl mb-2">Sign up — it&apos;s free!</h1>
      <p className="text-sm text-ink/70 mb-6">
        Build your world. Share the challenge. Play together.
      </p>

      {check === "email" ? (
        <div className="rounded-2xl border-2 border-ink bg-brand-green p-5 shadow-[4px_4px_0_0_var(--color-ink)] mb-4">
          <h2 className="font-display font-bold text-lg mb-1">Check your email</h2>
          <p className="text-sm">
            We sent a confirmation link. Click it to finish creating your account.
          </p>
        </div>
      ) : (
        <form
          method="post"
          action="/auth/signup"
          className="rounded-3xl border-2 border-ink bg-white p-6 shadow-[6px_6px_0_0_var(--color-ink)] space-y-4"
        >
          {error && (
            <div className="rounded-xl border-2 border-ink bg-brand-coral/40 px-3 py-2 text-sm">
              {error}
            </div>
          )}
          <Field label="Username" hint="3–20 letters, numbers, or underscores">
            <input
              type="text"
              name="username"
              required
              minLength={3}
              maxLength={20}
              pattern="[a-zA-Z0-9_]+"
              autoComplete="username"
              className="w-full h-11 px-3 rounded-xl border-2 border-ink bg-paper focus:outline-none focus:ring-2 focus:ring-brand-purple"
            />
          </Field>
          <Field label="Email">
            <input
              type="email"
              name="email"
              required
              autoComplete="email"
              className="w-full h-11 px-3 rounded-xl border-2 border-ink bg-paper focus:outline-none focus:ring-2 focus:ring-brand-purple"
            />
          </Field>
          <Field label="Password" hint="At least 8 characters">
            <input
              type="password"
              name="password"
              required
              minLength={8}
              autoComplete="new-password"
              className="w-full h-11 px-3 rounded-xl border-2 border-ink bg-paper focus:outline-none focus:ring-2 focus:ring-brand-purple"
            />
          </Field>
          <button
            type="submit"
            className="w-full h-12 rounded-full border-2 border-ink bg-brand-purple text-white font-display font-semibold shadow-[4px_4px_0_0_var(--color-ink)] hover:-translate-y-0.5 transition"
          >
            Create account
          </button>
        </form>
      )}

      <p className="text-sm text-center mt-5">
        Already have an account?{" "}
        <Link href="/login" className="font-semibold underline">
          Log in
        </Link>
      </p>
    </main>
  );
}

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="block font-display font-semibold text-sm mb-1">{label}</span>
      {children}
      {hint && <span className="block text-xs text-ink/60 mt-1">{hint}</span>}
    </label>
  );
}
