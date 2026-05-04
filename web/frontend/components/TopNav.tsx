import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

const navLinks = [
  { label: "Play", href: "/play", active: true },
  { label: "Build", href: "/build" },
  { label: "Explore", href: "/explore" },
  { label: "Challenges", href: "/challenges" },
  { label: "About", href: "/about" },
];

export async function TopNav() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let username: string | null = null;
  if (user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("username")
      .eq("id", user.id)
      .maybeSingle();
    username = profile?.username ?? null;
  }

  return (
    <header className="w-full px-6 lg:px-10 pt-6">
      <nav className="flex items-center justify-between gap-6 flex-wrap">
        <Link href="/" className="flex items-center gap-3">
          <span className="text-3xl" aria-hidden>
            ☀️
          </span>
          <div className="leading-tight">
            <div className="font-display font-bold text-2xl tracking-tight">LevelCraft</div>
            <div className="text-[11px] font-semibold uppercase tracking-wider text-ink/60">
              Build. Share. Play.
            </div>
          </div>
        </Link>

        <ul className="hidden md:flex items-center gap-8 font-display font-medium text-base">
          {navLinks.map((link) => (
            <li key={link.label}>
              <Link
                href={link.href}
                className={`pb-1 hover:opacity-70 transition ${
                  link.active ? "border-b-2 border-ink" : ""
                }`}
              >
                {link.label}
              </Link>
            </li>
          ))}
        </ul>

        <div className="flex items-center gap-3">
          <button
            type="button"
            aria-label="Search"
            className="size-11 rounded-full border-2 border-ink bg-white grid place-items-center hover:bg-paper transition"
          >
            <span aria-hidden>🔍</span>
          </button>

          {user ? (
            <>
              <Link
                href={username ? `/u/${username}` : "/"}
                className="px-4 h-11 rounded-full border-2 border-ink bg-white font-display font-semibold flex items-center gap-2 hover:-translate-y-0.5 transition"
              >
                <span aria-hidden>👤</span>
                <span>{username ?? user.email?.split("@")[0] ?? "Account"}</span>
              </Link>
              <form action="/auth/signout" method="post">
                <button
                  type="submit"
                  className="px-4 h-11 rounded-full border-2 border-ink bg-paper font-display font-semibold hover:-translate-y-0.5 transition"
                >
                  Sign out
                </button>
              </form>
            </>
          ) : (
            <>
              <Link
                href="/login"
                className="px-5 h-11 rounded-full border-2 border-ink bg-brand-yellow font-display font-semibold grid place-items-center hover:-translate-y-0.5 transition"
              >
                Log in
              </Link>
              <Link
                href="/signup"
                className="px-5 h-11 rounded-full border-2 border-ink bg-brand-purple text-white font-display font-semibold grid place-items-center hover:-translate-y-0.5 transition"
              >
                Sign up — it&apos;s free!
              </Link>
            </>
          )}
        </div>
      </nav>
    </header>
  );
}
