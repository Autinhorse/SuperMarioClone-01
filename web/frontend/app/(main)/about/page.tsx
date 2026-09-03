import Link from "next/link";

export const metadata = {
  title: "About — LevelCraft",
  description:
    "How LevelCraft was built — by a 53-year-old solo developer, in 11 days, with zero hand-written code.",
};

const GITHUB = "https://github.com/Autinhorse/levelcraft";
const YOUTUBE =
  "https://www.youtube.com/watch?v=RokVE021Ug4&list=PLGRcYbz8uCmBZSH-Ob8TIuEb3_6B3GdZv&pp=sAgC";
const DISCORD = "https://discord.gg/prAuYMsBvc";

export default function AboutPage() {
  return (
    <div className="px-6 lg:px-10 mt-10 mb-16 max-w-3xl mx-auto space-y-10">
      <Hero />
      <Stats />

      {/* Body: flat article, no per-section cards. Headings carry the
          structure; bold + colored phrases carry the emphasis. The big
          yellow + dark banners are the only visual peaks inside the
          flow, reserved for the page's two load-bearing claims. */}
      <article className="space-y-10">
        <SectionHeading emoji="📖" text="The Beginning of the Story" />
        <Prose>
          <p>
            I am 53 years old. Over forty years have passed since I
            typed my very first BASIC program into an Apple II clone as
            a fourth-grader.
          </p>
          <p>
            In those four decades, I&apos;ve traversed the entire
            landscape of the industry — from software development and
            telecommunications to testing equipment; from a junior
            &ldquo;code monkey&rdquo; to management. In 2010, I rode
            the wave of the mobile gaming boom, leading a team that
            topped the global charts. Yet, like many startups, that
            chapter ended with a mix of pride and regret.
          </p>
          <p>
            Parallel to my coding career, <em>Super Mario Bros.</em>{" "}
            has been my constant companion. Growing up in a
            then-isolated China, we kids called him &ldquo;Super
            Mary,&rdquo; always wondering why this mustachioed man had
            a girl&apos;s name. It wasn&apos;t until years later that I
            learned his true name was Mario.
          </p>
          <p>
            When I first encountered <em>Super Mario Maker</em>, I was
            mesmerized by the infinite creative freedom it offered. A
            seed was planted: I wanted to build something like it. But
            for over a decade, I started and stopped time and again.
            For a solo developer, the sheer workload was a mountain too
            steep to climb.
          </p>
        </Prose>

        <SectionHeading emoji="🤖" text="Enter AI: The Turning Point" />
        <Prose>
          <p>
            Last year, AI began to seep into my workflow. It started
            with debugging and evolved into building entire application
            frameworks. Recently, I&apos;ve entered a completely new
            field where I haven&apos;t manually written a single line
            of code in months.
          </p>
          <p>
            A sudden thought struck me:{" "}
            <Highlight>
              Could AI help me recreate that original version of Super
              Mario Bros?
            </Highlight>
          </p>
          <p>
            Balancing this with my day job, I only had a few spare
            hours each night. I braced myself for a two-week struggle,
            half-expecting to hit a wall that would prove &ldquo;AI
            isn&apos;t quite there yet.&rdquo; To my shock, the first
            level was running on my machine in <strong>just a few hours</strong>.
            By the second day, World 1 was finished.
          </p>
          <p>
            At that moment, my plan changed. I realized that two-thirds
            of my time was spent on assets and level design — the
            coding part was so seamless it obliterated my last shred of
            doubt.
          </p>
        </Prose>
        <PullQuote>
          If this is possible, can AI help me build my own Mario
          Maker?
        </PullQuote>
        <Prose>
          <p>
            I decided to try. This isn&apos;t just a technical
            experiment by a veteran coder; it&apos;s a chance to
            fulfill a long-buried dream. I envisioned a web platform
            where anyone could create and share.
          </p>
        </Prose>

        <SectionHeading emoji="✦" text="From Doubt to LevelCraft" />
        <Prose>
          <p>
            The journey wasn&apos;t without hurdles. When I shared my
            initial progress on Reddit, the consensus was:
            &ldquo;Unlikely. Good luck.&rdquo; I&apos;ll admit, I&apos;m
            someone whose ideas shift quickly, and that skepticism
            made me hesitate. I decided to pivot to a simpler
            experiment first.
          </p>
          <p>
            That experiment became <strong>LevelCraft</strong>, and its
            first fruit is <strong>Ricochet</strong>.
          </p>
          <p>
            Today marks <strong>Day 11</strong>, and the results are
            ready to be shared.
          </p>
        </Prose>
      </article>

      <ZeroCodeCallout />

      <article className="space-y-10">
        <SectionHeading emoji="⌨️" text="The Zero-Code Reality" />
        <Prose>
          <p>
            The entire project was built in VS Code using{" "}
            <strong>Claude Code</strong> for architecture and logic,
            and <strong>Codex</strong> for sprite generation. The site
            runs on Vercel and Supabase.
          </p>
          <p>
            I started with Godot, but following Claude&apos;s advice,
            I migrated to Phaser. Despite having Unity experience, my
            knowledge of both these engines was — and still is —{" "}
            <Highlight>zero</Highlight>. I haven&apos;t handwritten a
            single line of code. Claude architected the system,
            suggested a 13-step migration plan when we switched
            engines, and guided me through every integration.
          </p>
        </Prose>

        <SectionHeading emoji="🔭" text="Reflections on the Future" />
        <Prose>
          <p>
            What used to take an experienced developer 3 to 6 months
            can now be achieved in weeks through AI guidance.
          </p>
          <p>
            The old paradigm — where a domain expert explains
            requirements to a developer, who then implements and tests
            — is collapsing. If the expert can talk directly to the AI,
            the efficiency becomes terrifying. We are reaching a point
            where the &ldquo;developer&rdquo; as a middleman may no
            longer be necessary.{" "}
            <em>(A realization that makes this old coder both weep
            and wonder!)</em>
          </p>
          <p>
            However, experience still matters. When my character got
            stuck jumping against walls, my intuition told me it was a
            collision-box issue. I didn&apos;t need to code the fix;
            I just needed to tell the AI: &ldquo;Shrink the collision
            box by a few pixels and add a slight bounce-back.&rdquo;
            Experience is now about knowing <strong>what</strong> to
            tell the AI, not <strong>how</strong> to syntax it.
          </p>
        </Prose>

        <SectionHeading emoji="🚀" text="The Path Ahead" />
        <Prose>
          <p>
            <Highlight>
              AI can help us work, but it cannot help us think.
            </Highlight>{" "}
            It accelerates the realization of an idea, but the &ldquo;Big
            Idea&rdquo; remains human.
          </p>
          <p>
            LevelCraft has proven that the technical barriers to{" "}
            <em>Super Mario Maker</em> are gone. My next challenge? A
            project I&apos;ve sat on for 10 years: a Sudoku masterclass
            game that teaches complex logic step-by-step. No fancy
            art — just pure, complex programmatic logic to see exactly
            where the ceiling of AI truly lies.
          </p>
        </Prose>
      </article>

      <GameByTalkBanner />
      <LinksFooter />
    </div>
  );
}

function Hero() {
  return (
    <header className="rounded-3xl border-2 border-ink bg-white p-8 lg:p-10 shadow-[6px_6px_0_0_var(--color-ink)]">
      <p className="font-display text-sm uppercase tracking-[0.2em] text-ink/60 mb-2">
        About LevelCraft
      </p>
      <h1 className="font-display font-bold text-4xl lg:text-5xl leading-tight mb-4">
        A platform built by talking to a machine.
      </h1>
      <p className="text-lg text-ink/80 leading-relaxed">
        One solo developer. Eleven days. Zero hand-written lines of
        code. This is the story of how LevelCraft and its first game,{" "}
        <em>Ricochet</em>, came to be — and what it suggests about the
        future of making things.
      </p>
    </header>
  );
}

// Three stats in one horizontal row. flex + flex-1 forces equal widths
// regardless of viewport — using grid here previously rendered as a
// vertical stack on some Tailwind v4 builds.
function Stats() {
  return (
    <section className="flex gap-3 sm:gap-4">
      <Stat value="0" label="Lines of code" accent="bg-brand-yellow" />
      <Stat value="11" label="Days from idea to launch" accent="bg-brand-coral" />
      <Stat value="∞" label="Levels you can build" accent="bg-brand-green" />
    </section>
  );
}

function Stat({
  value,
  label,
  accent,
}: {
  value: string;
  label: string;
  accent: string;
}) {
  return (
    <div className="flex-1 min-w-0 rounded-2xl border-2 border-ink bg-white p-4 sm:p-5 shadow-[4px_4px_0_0_var(--color-ink)] text-center">
      <div
        className={`mx-auto mb-2 size-14 sm:size-16 rounded-full border-2 border-ink ${accent} grid place-items-center font-display font-bold text-2xl sm:text-3xl`}
      >
        {value}
      </div>
      <div className="text-[11px] sm:text-xs font-display font-bold uppercase tracking-wide text-ink/70">
        {label}
      </div>
    </div>
  );
}

// Plain h2 with an emoji — no card wrap. Provides the section split in
// the flat article layout the user asked for.
function SectionHeading({ emoji, text }: { emoji: string; text: string }) {
  return (
    <h2 className="font-display font-bold text-2xl flex items-center gap-3 mt-2">
      <span aria-hidden>{emoji}</span>
      {text}
    </h2>
  );
}

function Prose({ children }: { children: React.ReactNode }) {
  return (
    <div className="space-y-3 text-ink/85 leading-relaxed text-base">
      {children}
    </div>
  );
}

// Inline emphasis on key sentences — bold ink so the phrase pulls the
// eye without breaking the prose flow.
function Highlight({ children }: { children: React.ReactNode }) {
  return <strong className="font-bold text-ink">{children}</strong>;
}

function PullQuote({ children }: { children: React.ReactNode }) {
  return (
    <blockquote className="border-l-4 border-brand-coral pl-4 py-1 italic font-display font-semibold text-lg text-ink">
      &ldquo;{children}&rdquo;
    </blockquote>
  );
}

// The "0 hand-written lines of code" headline. Sized large enough to be
// the visual peak of the page when reading the Zero-Code Reality
// section, since that's the load-bearing claim of the whole project.
function ZeroCodeCallout() {
  return (
    <section className="rounded-3xl border-2 border-ink bg-brand-yellow p-8 lg:p-10 shadow-[6px_6px_0_0_var(--color-ink)] text-center">
      <p className="font-display text-sm uppercase tracking-[0.2em] text-ink/70 mb-2">
        The headline number
      </p>
      <p className="font-display font-bold text-7xl lg:text-8xl leading-none mb-3">
        0
      </p>
      <p className="font-display font-bold text-xl lg:text-2xl">
        lines of code, hand-written.
      </p>
      <p className="text-sm text-ink/70 mt-3 max-w-md mx-auto">
        Architecture, gameplay logic, web platform, database schema,
        engine migration — every line generated through conversation
        with Claude.
      </p>
    </section>
  );
}

// Final-page mantra. Closes the page on the line that sums up the
// whole thesis.
function GameByTalkBanner() {
  return (
    <section className="rounded-3xl border-2 border-ink bg-ink p-10 lg:p-12 shadow-[6px_6px_0_0_var(--color-ink)] text-center text-paper">
      <p className="font-display text-sm uppercase tracking-[0.3em] text-paper/60 mb-3">
        The thesis
      </p>
      <p className="font-display font-bold text-4xl lg:text-6xl leading-tight">
        Game By Talk Only.
      </p>
      <p className="text-sm text-paper/70 mt-4 max-w-md mx-auto">
        The experiment continues.
      </p>
    </section>
  );
}

function LinksFooter() {
  return (
    <section className="rounded-3xl border-2 border-ink bg-white p-6 lg:p-8 shadow-[4px_4px_0_0_var(--color-ink)]">
      <h2 className="font-display font-bold text-xl mb-4">Follow along</h2>
      <ul className="grid sm:grid-cols-2 gap-3">
        <li>
          <ExternalLink href={GITHUB} label="GitHub" sub="Source on github.com" />
        </li>
        <li>
          <ExternalLink href={YOUTUBE} label="YouTube" sub="Build playlist" />
        </li>
        <li>
          <ExternalLink href={DISCORD} label="Discord" sub="Join the community" />
        </li>
        <li>
          <Link
            href="/explore"
            className="block rounded-2xl border-2 border-ink bg-brand-yellow p-4 shadow-[2px_2px_0_0_var(--color-ink)] hover:-translate-y-0.5 transition"
          >
            <div className="font-display font-bold text-base">World Levels →</div>
            <div className="text-xs text-ink/70 mt-0.5">
              Play community levels
            </div>
          </Link>
        </li>
      </ul>
    </section>
  );
}

function ExternalLink({
  href,
  label,
  sub,
}: {
  href: string;
  label: string;
  sub: string;
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="block rounded-2xl border-2 border-ink bg-paper p-4 shadow-[2px_2px_0_0_var(--color-ink)] hover:-translate-y-0.5 transition"
    >
      <div className="font-display font-bold text-base">{label} ↗</div>
      <div className="text-xs text-ink/70 mt-0.5 truncate">{sub}</div>
    </a>
  );
}
