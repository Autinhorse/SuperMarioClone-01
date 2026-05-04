# LevelCraft Web — Visual Design Style

The visual language for the LevelCraft platform website (homepage, browse, profiles, level pages, editor chrome). Reference mockup: `reference-homepage.png`.

This is **the website's** look. It is **not** the look of any individual game's gameplay (each game owns its own in-game art). The website wraps games like a friendly notebook wraps doodles.

---

## Brand voice

- **Slogan (long):** "Build your world. Share the challenge. Play together."
- **Slogan (short):** "Build. Share. Play."
- **Tone:** playful, inviting, creator-first. Kid-friendly but not babyish — adults who like making things should feel at home too.
- **Tagline (footer / about):** "Made with ❤ by creators, for players."

---

## Visual language

The whole site reads like a **hand-drawn cartoon notebook**: warm paper background, thick wobbly black outlines, sketchy shading, bouncy mascots scribbled into the margins. Nothing pixel-perfect or "designed by a corporation".

### Colors (approximate — to be locked down once frontend starts)

Background and surfaces:
- Page background: warm cream / paper (`~#FDF6E3`)
- Card surface: white (`#FFFFFF`)
- Outline / text: near-black navy (`~#1A1A2E`)

Accent palette (each section can pick one as its tint):
- **Yellow** (primary CTA, energy): `~#FFC93C`
- **Purple** (secondary CTA, signup): `~#9B6FE6`
- **Green** (available games band): `~#9CCC4F`
- **Coral / red** (top creators, hearts): `~#E85D5D`
- **Orange** (warmth, accents): `~#F18A4D`
- **Sky blue** (backgrounds for level thumbnails): `~#7BB6E8`

Use the accent palette generously — most cards and bands get one. Avoid pastel washes; saturate.

### Typography

- **Headlines:** chunky bold display sans-serif (the kind that looks slightly hand-set). Used for the slogan, section headers ("Available Game", "Featured Levels"), card titles.
- **Body text:** rounded humanist sans-serif. Friendly but legible.
- **Specific font choices:** TBD when frontend starts — pick from Google Fonts to keep things free and fast. Candidates: *Fredoka*, *Nunito*, *Quicksand*, *Baloo 2*.

### Outlines, borders, shadows

- All major components (cards, buttons, mascot illustrations) get a **thick dark outline** (~3px), slightly imperfect / hand-drawn looking.
- Cards have a **soft offset shadow** drawn as sketchy hatching, not a CSS box-shadow blur.
- Backgrounds of level thumbnails carry a **graph-paper / notebook texture** — subtle grid lines suggesting "this is a level you can sketch".

### Components

- **Buttons:** pill-shaped, thick dark border, icon + text + arrow. Yellow for primary, white-with-outline for secondary, purple for signup-style accents.
- **Cards:** rounded rectangles, thick dark border, single accent color band/tint per section.
- **Stats blobs:** little mascot icon + big number + label.
- **Carousels:** horizontally scrollable rows with arrow controls on the right.

### Mascots and decorations

A small cast of characters scattered through the site:

- **Toast/bread mascot** with hat — site greeter, appears in the hero
- **Sun mascot** — in the logo
- **Cloud mascot** — corners and footer
- **Smiley ball** — represents Ricochet (in our case the game's player character drawn cute)
- Future games can each contribute a mascot

Decorative scribbles — sparkles, squiggles, stars, doodles — scattered between sections to keep negative space alive. Used like punctuation, never overwhelming.

### Motion (suggested, not required at launch)

- Subtle wiggle / breathing on hover for buttons and mascots
- Mascots can blink or wave on a slow loop
- Page-load: cards "draw in" with a quick stroke animation

---

## What this style is NOT

- Not minimalist / flat design
- Not corporate / SaaS-template
- Not pixel art (that's an in-game choice; some games may use pixel art, but the site chrome doesn't)
- Not dark mode by default (cream paper is the brand)

---

## Page-level specs

- Homepage: see `homepage.md`
- (Browse, profile, level page, editor chrome — to be added when those pages are designed)
