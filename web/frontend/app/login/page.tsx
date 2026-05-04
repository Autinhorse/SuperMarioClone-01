import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

type SearchParams = Promise<{ error?: string }>;

export default async function LoginPage({ searchParams }: { searchParams: SearchParams }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user) redirect("/");

  const { error } = await searchParams;

  return (
    <main className="px-6 py-12 max-w-md mx-auto w-full">
      <h1 className="font-display font-bold text-3xl mb-2">Log in</h1>
      <p className="text-sm text-ink/70 mb-6">Welcome back to LevelCraft.</p>

      <form
        method="post"
        action="/auth/login"
        className="rounded-3xl border-2 border-ink bg-white p-6 shadow-[6px_6px_0_0_var(--color-ink)] space-y-4"
      >
        {error && (
          <div className="rounded-xl border-2 border-ink bg-brand-coral/40 px-3 py-2 text-sm">
            {error}
          </div>
        )}
        <label className="block">
          <span className="block font-display font-semibold text-sm mb-1">Email</span>
          <input
            type="email"
            name="email"
            required
            autoComplete="email"
            className="w-full h-11 px-3 rounded-xl border-2 border-ink bg-paper focus:outline-none focus:ring-2 focus:ring-brand-purple"
          />
        </label>
        <label className="block">
          <span className="block font-display font-semibold text-sm mb-1">Password</span>
          <input
            type="password"
            name="password"
            required
            autoComplete="current-password"
            className="w-full h-11 px-3 rounded-xl border-2 border-ink bg-paper focus:outline-none focus:ring-2 focus:ring-brand-purple"
          />
        </label>
        <button
          type="submit"
          className="w-full h-12 rounded-full border-2 border-ink bg-brand-yellow font-display font-semibold shadow-[4px_4px_0_0_var(--color-ink)] hover:-translate-y-0.5 transition"
        >
          Log in
        </button>
      </form>

      <p className="text-sm text-center mt-5">
        New here?{" "}
        <Link href="/signup" className="font-semibold underline">
          Create an account
        </Link>
      </p>
    </main>
  );
}
