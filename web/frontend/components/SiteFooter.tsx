import Link from "next/link";

const footerLinks = [
  { label: "About", href: "/about" },
  { label: "Blog", href: "/blog" },
  { label: "Discord", href: "/discord" },
  { label: "Twitter", href: "/twitter" },
  { label: "Terms", href: "/terms" },
  { label: "Privacy", href: "/privacy" },
];

export function SiteFooter() {
  return (
    <footer className="mt-14 bg-brand-yellow border-t-2 border-ink">
      <div className="px-6 lg:px-10 py-5 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <span className="text-2xl" aria-hidden>
            ☀️
          </span>
          <span className="font-display font-bold text-lg">LevelCraft</span>
          <span className="text-sm text-ink/70">© 2026 LevelCraft. All rights reserved.</span>
        </div>
        <ul className="flex flex-wrap items-center gap-5 text-sm font-semibold">
          {footerLinks.map((l) => (
            <li key={l.label}>
              <Link href={l.href} className="hover:underline">
                {l.label}
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </footer>
  );
}
