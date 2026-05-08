import Phaser from 'phaser';

import { CAMPAIGN_LEVEL_COUNT, COLOR_BACKGROUND } from '../config/feel';
import { SOUND_KEYS, SOUND_VOLUMES, loadSounds } from '../sounds';

// Landing screen. Shows a 4×3 grid of "Level 1..12" buttons; clicking
// one starts EditScene with that level's path. Also handles the
// `?level=NN` deep-link by skipping the menu entirely (useful for the
// Play→Edit hand-off in PlayScene's back button, and for bookmarking
// directly to a level during authoring).
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

    this.buildOverlay();

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.destroyOverlay());
    this.events.once(Phaser.Scenes.Events.DESTROY, () => this.destroyOverlay());
  }

  private buildOverlay(): void {
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
        <p class="menu-subtitle">or pick a level to edit</p>
        <div class="menu-grid">${buttons}</div>
      </div>
    `;
    document.body.appendChild(overlay);
    overlay.addEventListener('click', (ev) => this.onOverlayClick(ev));
    this.overlay = overlay;
  }

  private onOverlayClick(ev: MouseEvent): void {
    const target = ev.target as HTMLElement;
    const action = target.getAttribute('data-action');
    if (action === 'play-campaign') {
      this.sound.play(SOUND_KEYS.uiButton, { volume: SOUND_VOLUMES.sfx });
      // Boot campaign mode at Level 1 — PlayScene reads `campaignLevel`
      // and threads it through cross-page transitions / Next-Level.
      this.scene.start('PlayScene', { campaignLevel: 1 });
      return;
    }
    const lvl = target.getAttribute('data-level');
    if (!lvl) return;
    this.sound.play(SOUND_KEYS.uiButton, { volume: SOUND_VOLUMES.sfx });
    this.scene.start('EditScene', { levelPath: `levels/level-${lvl}.json` });
  }

  private destroyOverlay(): void {
    if (this.overlay) {
      this.overlay.remove();
      this.overlay = null;
    }
  }
}
