import Phaser from 'phaser';

import {
  CAMPAIGN_LEVEL_COUNT,
  COLOR_BACKGROUND,
  LEVELCRAFT_URL,
} from '../config/feel';
import { SOUND_KEYS, SOUND_VOLUMES, loadSounds } from '../sounds';

// Landing screen for the standalone build (the itch.io export and any
// bare `index.html` open). Player-facing: "Play All Levels", a grid of
// the campaign levels (each plays that level), and a "Try the Level
// Editor" button. The editor is reachable from this one page — there's
// no separate route — which is the whole point of the standalone bundle.
//
// `?dev=1` flips the grid back to its old behaviour (clicking a level
// opens it in the editor) so the authoring shortcut isn't lost. The
// `?level=NN` deep-link is also still honoured (skips the menu, opens
// EditScene directly) — used by PlayScene's Play→Edit hand-off and for
// bookmarking straight to a level during authoring.
//
// Persistence note: levels built via "Try the Level Editor" only live
// in this browser's localStorage (see EditScene's try-mode banner).
// The footer links to LevelCraft for accounts / community / publishing.
export class MenuScene extends Phaser.Scene {
  private overlay: HTMLDivElement | null = null;

  constructor() {
    super('MenuScene');
  }

  preload(): void {
    // All scenes call loadSounds — Phaser dedupes by key, so the first
    // scene to land downloads the audio and subsequent scenes are no-ops
    // against the cache. We load here so the menu's UI_Button click is
    // ready immediately rather than waiting for PlayScene preload.
    loadSounds(this);
  }

  create(): void {
    this.cameras.main.setBackgroundColor(COLOR_BACKGROUND);

    // Stop the gameplay BGM if we're returning to the menu after a
    // PlayScene session. The sound persists across scenes (it lives on
    // the global sound manager); MenuScene isn't a music scene, so we
    // explicitly silence it here. No-op when there's no active BGM.
    this.sound.get(SOUND_KEYS.bgm)?.stop();

    // Deep-link via URL (?level=NN). One-shot — if the parameter is
    // present we never show the menu, we just hand off to EditScene.
    const params = new URLSearchParams(window.location.search);
    const levelParam = params.get('level');
    if (levelParam) {
      const padded = String(levelParam).padStart(2, '0');
      this.scene.start('EditScene', { levelPath: `levels/level-${padded}.json` });
      return;
    }

    this.buildOverlay(params.get('dev') === '1');

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.destroyOverlay());
    this.events.once(Phaser.Scenes.Events.DESTROY, () => this.destroyOverlay());
  }

  private buildOverlay(devMode: boolean): void {
    const overlay = document.createElement('div');
    overlay.className = 'menu-overlay';
    const buttons = Array.from({ length: CAMPAIGN_LEVEL_COUNT }, (_, i) => {
      const n = i + 1;
      const padded = String(n).padStart(2, '0');
      return `<button data-level="${padded}" class="menu-btn">Level ${n}</button>`;
    }).join('');
    overlay.innerHTML = `
      <div class="menu-content">
        <h1 class="menu-title">LevelCraft: Ricochet</h1>
        <button data-action="play-campaign" class="menu-play-btn">▶ Play All Levels</button>
        <p class="menu-subtitle">${devMode ? 'or pick a level to edit' : 'or pick a level'}</p>
        <div class="menu-grid">${buttons}</div>
        <button data-action="try-editor" class="menu-secondary-btn">✏️ Try the Level Editor</button>
      </div>
      <div class="menu-footer">
        Part of <b>LevelCraft</b> — play community-made levels and publish your own at
        <a href="${LEVELCRAFT_URL}" target="_blank" rel="noopener">levelcraft.gg</a>
      </div>
    `;
    document.body.appendChild(overlay);
    overlay.addEventListener('click', (ev) => this.onOverlayClick(ev, devMode));
    this.overlay = overlay;
  }

  private onOverlayClick(ev: MouseEvent, devMode: boolean): void {
    const target = ev.target as HTMLElement;
    // Let the levelcraft.gg link behave like a normal link.
    if (target.tagName === 'A') return;

    const action = target.getAttribute('data-action');
    if (action === 'play-campaign') {
      this.sound.play(SOUND_KEYS.uiButton, { volume: SOUND_VOLUMES.sfx });
      // Boot campaign mode at Level 1 — PlayScene reads `campaignLevel`
      // and threads it through cross-page transitions / Next-Level.
      this.scene.start('PlayScene', { campaignLevel: 1 });
      return;
    }
    if (action === 'try-editor') {
      this.sound.play(SOUND_KEYS.uiButton, { volume: SOUND_VOLUMES.sfx });
      // No levelPath / embedLevelId → EditScene boots in "try mode":
      // saves go to localStorage, and a banner explains the limits.
      this.scene.start('EditScene', {});
      return;
    }

    const lvl = target.getAttribute('data-level');
    if (!lvl) return;
    this.sound.play(SOUND_KEYS.uiButton, { volume: SOUND_VOLUMES.sfx });
    if (devMode) {
      // Authoring shortcut: open the level in the editor (the old menu
      // behaviour). Save still routes through the dev-server endpoint.
      this.scene.start('EditScene', { levelPath: `levels/level-${lvl}.json` });
      return;
    }
    // Player path: play that campaign level. PlayScene threads
    // `campaignLevel` through Next-Level / cross-page transitions, so
    // picking Level 3 here carries on to 4..10 and the finale.
    this.scene.start('PlayScene', { campaignLevel: parseInt(lvl, 10) });
  }

  private destroyOverlay(): void {
    if (this.overlay) {
      this.overlay.remove();
      this.overlay = null;
    }
  }
}
