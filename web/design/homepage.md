# LevelCraft Homepage — Layout

Reference: `reference-homepage.png`. Visual language: `style.md`.

The homepage is the front door. Top to bottom:

---

## 1. Top nav bar

- **Logo:** "LevelCraft" wordmark + sun mascot, with sub-tagline "Build. Share. Play."
- **Nav links:** Play · Build · Explore · Challenges · About
- **Search icon** (right of nav links)
- **Log in** button (yellow, pill)
- **Sign up** button (purple, pill, with "— it's free!" suffix to lower friction)

---

## 2. Hero (two-column)

**Left card (text + CTAs):**
- Slogan in big bold display type: "Build your world. / Share the challenge. / Play together."
- Sub-line: "Create and share your own levels. Challenge players around the world."
- Two buttons:
  - **Play Ricochet** — yellow primary, play-icon
  - **Build Level** — white-with-outline secondary, pencil-icon
- Toast mascot waving from the side

**Right card (game preview):**
- A featured game video / hero clip — currently Ricochet
- Card has a header label ("Ricochet") and a star badge in the corner
- Standard video controls (play/pause, scrubber, time, volume, fullscreen)
- When more games exist, this slot rotates or features the most popular game

---

## 3. Available Game(s)

- Section header: **"Available Game"** (singular for now; becomes "Available Games" when ≥ 2)
- For each game, one wide card:
  - Left: game thumbnail / animated preview
  - Middle: game name (e.g. **Ricochet**), tagline (e.g. *"Bounce. Aim. Escape. Use angles and timing to reach the goal!"*), small mascot illustration of the game's character
  - Right: stacked **Play** and **Build Level** buttons
- Each card uses a different accent color band so games are visually distinct
- Currently just one card (Ricochet, green band). Stack vertically as more arrive — no pagination needed until we hit ~5+ games

---

## 4. Featured Levels

- Section header: **"Featured Levels"** with **"Explore More Levels →"** link on the right
- Horizontal row of level cards (5 visible at standard desktop width, with carousel arrows to scroll):
  - Level thumbnail (screenshot of the level)
  - Play-icon overlay button
  - Title (e.g. "Laser Maze")
  - Creator (e.g. "by Alex")
  - Like count (heart) and play count (play-arrow) below
- Cards link to the level's play page

---

## 5. Three-column info row

Three side-by-side cards, each in a different accent color:

- **Weekly Challenge** (purple): challenge prompt (e.g. *"Build a level using only walls."*), illustration, **"Join Challenge →"** button
- **Your Creative Journey** (yellow): logged-in user's XP / level progress bar, recent achievement (e.g. "First Level Published"). For logged-out users: replace with a "Sign up to track your journey" prompt
- **Top Creators** (coral / red): leaderboard top 3 (avatar, name, XP), **"See All Creators →"** button

---

## 6. Stats strip

Single row, four stats with mascot icons:
- **10K+** Levels Created
- **50K+** Players
- **200K+** Plays
- **12K+** Daily Creators

(Numbers are real, pulled from the database. Don't ship made-up stats.)

---

## 7. Closing tagline

Centered: "Made with ❤ by creators, for players."

---

## 8. Footer

- Logo + copyright (`© 2026 LevelCraft. All rights reserved.`)
- Links: About · Blog · Discord · Twitter · Terms · Privacy

---

## Responsive notes (sketch — refine when we build)

- Hero collapses to single column on mobile (text card on top, video card below)
- Available Game card: keep wide layout on tablet+, stack thumbnail above text on mobile
- Featured Levels: same horizontal carousel; show 1.5 cards at a time on mobile to hint at scroll
- Three-column info row: stacks vertically on mobile
- Stats strip: stays horizontal but shrinks (2×2 grid on narrow phones if needed)
