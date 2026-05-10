import Link from "next/link";

export const metadata = {
  title: "Privacy Policy — LevelCraft",
  description:
    "What data LevelCraft collects, why we collect it, and what you can do about it.",
};

const DISCORD = "https://discord.gg/prAuYMsBvc";

export default function PrivacyPage() {
  return (
    <div className="px-6 lg:px-10 mt-10 mb-16 max-w-3xl mx-auto space-y-8">
      <header className="rounded-3xl border-2 border-ink bg-white p-8 lg:p-10 shadow-[6px_6px_0_0_var(--color-ink)]">
        <p className="font-display text-sm uppercase tracking-[0.2em] text-ink/60 mb-2">
          LevelCraft
        </p>
        <h1 className="font-display font-bold text-4xl lg:text-5xl leading-tight mb-3">
          Privacy Policy
        </h1>
        <p className="text-sm text-ink/60">Last updated: May 10, 2026</p>
      </header>

      <article className="space-y-7 text-ink/85 leading-relaxed text-base">
        <Section title="The short version">
          <p>
            LevelCraft collects the minimum it needs to run accounts and show
            level stats. We don&apos;t sell your data, we don&apos;t run ad
            trackers, and you can delete your account whenever you want.
          </p>
        </Section>

        <Section title="What we collect">
          <ul className="list-disc pl-6 space-y-1">
            <li>
              <strong>Account info</strong> — your email address and the
              username you choose. If you sign in through a third-party provider,
              we receive your email address from them.
            </li>
            <li>
              <strong>Content</strong> — the levels, titles, descriptions,
              ratings, and likes you create.
            </li>
            <li>
              <strong>Usage data</strong> — basic counts such as how many times a
              level was played or cleared, plus aggregate site traffic
              analytics.
            </li>
            <li>
              <strong>Technical data</strong> — standard server logs (such as IP
              address and browser type), kept briefly for security and
              debugging.
            </li>
          </ul>
        </Section>

        <Section title="Why we collect it">
          <p>
            To let you log in, to attribute levels to their creators, to show
            play / like / rating counts, and to keep the service secure and
            working. That&apos;s it.
          </p>
        </Section>

        <Section title="Who processes it">
          <p>We rely on a small number of service providers:</p>
          <ul className="list-disc pl-6 space-y-1 mt-2">
            <li>
              <strong>Supabase</strong> — database, authentication, and file
              storage (level thumbnails, avatars).
            </li>
            <li>
              <strong>Vercel</strong> — hosting and aggregate site analytics.
            </li>
          </ul>
          <p className="mt-2">
            These providers process data on our behalf. We don&apos;t sell or
            rent your personal data to anyone.
          </p>
        </Section>

        <Section title="Cookies">
          <p>
            We use cookies only to keep you signed in. No advertising or
            cross-site tracking cookies.
          </p>
        </Section>

        <Section title="Your choices">
          <ul className="list-disc pl-6 space-y-1">
            <li>You can edit or delete your levels at any time.</li>
            <li>
              You can delete your account, which removes your profile and
              levels.
            </li>
            <li>
              You can ask us what data we hold about you, or ask us to delete it
              — reach out via Discord.
            </li>
          </ul>
        </Section>

        <Section title="Children">
          <p>
            LevelCraft is not directed at children under 13. If you believe a
            child has given us personal data, contact us and we&apos;ll remove
            it.
          </p>
        </Section>

        <Section title="Changes">
          <p>
            If this policy changes, we&apos;ll update the date above and note
            significant changes on this page.
          </p>
        </Section>

        <Section title="Contact">
          <p>
            Privacy questions or data requests — reach us on the{" "}
            <a
              href={DISCORD}
              target="_blank"
              rel="noopener noreferrer"
              className="font-semibold underline decoration-brand-coral decoration-[3px] underline-offset-2"
            >
              LevelCraft Discord
            </a>
            .
          </p>
        </Section>
      </article>

      <p className="text-sm text-ink/60">
        See also our{" "}
        <Link href="/terms" className="font-semibold underline">
          Terms of Service
        </Link>
        .
      </p>
    </div>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-2">
      <h2 className="font-display font-bold text-xl text-ink">{title}</h2>
      {children}
    </section>
  );
}
