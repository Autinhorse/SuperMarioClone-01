import Link from "next/link";

export const metadata = {
  title: "Terms of Service — LevelCraft",
  description:
    "The terms for using LevelCraft, a free community platform for creating and sharing game levels.",
};

const DISCORD = "https://discord.gg/prAuYMsBvc";

export default function TermsPage() {
  return (
    <div className="px-6 lg:px-10 mt-10 mb-16 max-w-3xl mx-auto space-y-8">
      <header className="rounded-3xl border-2 border-ink bg-white p-8 lg:p-10 shadow-[6px_6px_0_0_var(--color-ink)]">
        <p className="font-display text-sm uppercase tracking-[0.2em] text-ink/60 mb-2">
          LevelCraft
        </p>
        <h1 className="font-display font-bold text-4xl lg:text-5xl leading-tight mb-3">
          Terms of Service
        </h1>
        <p className="text-sm text-ink/60">Last updated: May 10, 2026</p>
      </header>

      <article className="space-y-7 text-ink/85 leading-relaxed text-base">
        <Section title="1. What LevelCraft is">
          <p>
            LevelCraft is a free platform for creating, sharing, and playing
            user-made game levels. There are no paid plans, subscriptions, or
            in-app purchases. Use it, build things, share them.
          </p>
        </Section>

        <Section title="2. Your account">
          <p>
            You need an account to publish levels. You&apos;re responsible for
            activity under your account, so keep your login details to yourself —
            one person, one account. You must be old enough to consent to data
            processing where you live (generally 13 or older).
          </p>
        </Section>

        <Section title="3. Content you create">
          <p>
            You keep ownership of the levels you make. To run the platform, you
            grant LevelCraft a worldwide, non-exclusive, royalty-free license to
            host, store, reproduce, display, and distribute your published levels
            so other players can find and play them.
          </p>
          <p>
            You also grant LevelCraft permission to use screenshots, video
            recordings, thumbnails, and short excerpts of your published levels
            to promote LevelCraft and its games — for example in trailers,
            social-media posts, app-store listings, or press materials — with
            credit to your username where it&apos;s reasonable to include it.
          </p>
          <p>
            You can delete your levels at any time, which removes them from the
            platform and ends these licenses going forward. If we had already
            published promotional material containing your content before you
            deleted it, we may keep using those existing materials.
          </p>
        </Section>

        <Section title="4. Your responsibility for your content">
          <p>
            Everything in a level you upload is your responsibility. By
            publishing, you confirm that you created it or otherwise have the
            rights to use it, and that it doesn&apos;t break the law or infringe
            anyone else&apos;s rights — copyright, trademark, privacy, or
            otherwise.
          </p>
          <p>
            LevelCraft hosts content created by its users and does not pre-screen
            it. We are not responsible or liable for user-created content. If
            your content leads to a legal claim against LevelCraft or its
            operator, you agree to be responsible for the resulting claims,
            costs, and damages.
          </p>
        </Section>

        <Section title="5. What you can't do">
          <p>Don&apos;t use LevelCraft to:</p>
          <ul className="list-disc pl-6 space-y-1 mt-2">
            <li>
              upload content that is illegal, hateful, harassing, or sexual
              content involving minors;
            </li>
            <li>infringe someone else&apos;s copyright or trademark;</li>
            <li>impersonate other people;</li>
            <li>break, overload, scrape, or attack the service;</li>
            <li>upload malware or attempt to exploit other users.</li>
          </ul>
        </Section>

        <Section title="6. Copyright complaints">
          <p>
            If you believe content on LevelCraft infringes your copyright, send
            us a notice through the contact channel below that includes: (1) your
            contact details; (2) identification of the work you say is infringed;
            (3) the location (URL) of the content on LevelCraft; (4) a statement
            that you believe in good faith the use is not authorized by the
            copyright owner, its agent, or the law; and (5) a statement, made
            under penalty of perjury, that the information in your notice is
            accurate and that you are the copyright owner or authorized to act on
            its behalf.
          </p>
          <p>
            We&apos;ll review valid notices and remove or disable the reported
            content where appropriate. Accounts that repeatedly infringe will be
            terminated.
          </p>
        </Section>

        <Section title="7. Moderation">
          <p>
            We may remove any level, comment, or account that breaks these
            terms, with or without notice. If you think something was removed by
            mistake, get in touch (see below).
          </p>
        </Section>

        <Section title="8. No warranty">
          <p>
            LevelCraft is provided &ldquo;as is&rdquo;. It is a small project run
            by one person — things may break, levels may be lost, and the site
            may go down. We are not liable for losses arising from using, or
            being unable to use, the service. Don&apos;t store anything here that
            you can&apos;t afford to lose.
          </p>
        </Section>

        <Section title="9. Changes">
          <p>
            We may update these terms as the platform evolves. If we make a
            significant change, we&apos;ll note it on this page and update the
            date above. Continuing to use LevelCraft after a change means you
            accept the new terms.
          </p>
        </Section>

        <Section title="10. Contact">
          <p>
            Questions, takedown requests, or anything else — find us on the{" "}
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
        <Link href="/privacy" className="font-semibold underline">
          Privacy Policy
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
