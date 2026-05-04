import Link from "next/link";

export default function UserNotFound() {
  return (
    <main className="px-6 py-20 max-w-md mx-auto text-center">
      <div className="text-6xl mb-4" aria-hidden>
        🔍
      </div>
      <h1 className="font-display font-bold text-3xl mb-2">User not found</h1>
      <p className="text-sm text-ink/70 mb-6">
        That username doesn&apos;t exist. Maybe it was claimed and abandoned, or you typed it wrong?
      </p>
      <Link
        href="/"
        className="inline-block px-5 h-11 rounded-full border-2 border-ink bg-brand-yellow font-display font-semibold leading-[40px] shadow-[4px_4px_0_0_var(--color-ink)] hover:-translate-y-0.5 transition"
      >
        ← Back to home
      </Link>
    </main>
  );
}
