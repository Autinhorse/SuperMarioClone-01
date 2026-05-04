import Phaser from 'phaser';

import { GRAVITY_TILES, TILE_SIZE } from './game/config/feel';
import { detectEmbedMode, waitForLevel } from './embed';
import { EditScene } from './game/scenes/EditScene';
import { MenuScene } from './game/scenes/MenuScene';
import { PlayScene } from './game/scenes/PlayScene';

// Mirrors the Godot project's design size so Phase-2 ports can copy
// pixel-coordinate constants over without rescaling math.
const GAME_WIDTH = 1600;
const GAME_HEIGHT = 960;

const baseConfig: Omit<Phaser.Types.Core.GameConfig, 'scene'> = {
  type: Phaser.WEBGL,
  width: GAME_WIDTH,
  height: GAME_HEIGHT,
  parent: 'game',
  backgroundColor: '#22252c',
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    // Belt-and-suspenders for the FIT mode: don't let Phaser resize the
    // #game parent to match canvas dimensions, since #game already has
    // explicit 100vw/100vh in index.html and we want that to be authoritative.
    expandParent: false,
  },
  physics: {
    default: 'arcade',
    arcade: {
      // World gravity is the player's gravity. The Player class toggles
      // body.allowGravity per state so flying / paused / rebound states
      // stay flat while falling / jumping / idle states are gravity-driven.
      gravity: { x: 0, y: GRAVITY_TILES * TILE_SIZE },
      debug: false,
    },
  },
};

// URL-driven boot order. Default lands on MenuScene (the level-select
// grid). `?mode=edit` jumps straight to EditScene — paired with
// `?level=NN` (handled by MenuScene) it deep-links to a specific
// level's edit screen. `?mode=play` keeps the legacy direct-to-play
// path so the standalone game export still works without going
// through the menu.
//
// `?mode={play|edit}&levelId=xxx` is the LevelCraft-platform embed path:
// the game waits for the host page to post the level JSON via
// postMessage, then boots the corresponding scene with that data injected.
async function boot() {
  const { embed, mode: embedMode, levelId } = detectEmbedMode();

  if (embed && levelId && embedMode) {
    let level;
    try {
      level = await waitForLevel(levelId);
    } catch (err) {
      const root = document.getElementById('game');
      if (root) {
        root.innerHTML =
          `<div style="color:#cc6666;padding:24px;font-family:system-ui;font-size:14px">` +
          `Failed to load level: ${(err as Error).message}</div>`;
      }
      return;
    }
    if (embedMode === 'edit') {
      // The editor palette is a 200px-wide fixed sidebar pinned to the
      // right of the viewport. In standalone mode the viewport is
      // wider than the canvas's 5:3 aspect, so FIT scaling already
      // leaves room on the right. Inside an iframe sized to 5:3 the
      // canvas fills the full width and the palette ends up overlapping
      // the rightmost columns — shrink #game's width by the palette's
      // width so FIT lays out the canvas in the remaining left area.
      const root = document.getElementById('game');
      if (root) root.style.width = 'calc(100vw - 200px)';
    }

    const game = new Phaser.Game({ ...baseConfig, scene: [] });
    game.scene.add('PlayScene', PlayScene);
    game.scene.add('MenuScene', MenuScene);
    game.scene.add('EditScene', EditScene);
    if (embedMode === 'edit') {
      game.scene.start('EditScene', { level, embedLevelId: levelId });
    } else {
      game.scene.start('PlayScene', { level, embedLevelId: levelId });
    }
    return;
  }

  const params = new URLSearchParams(window.location.search);
  const mode = params.get('mode');
  const startWithEditor = mode === 'edit';
  const startWithPlay = mode === 'play';

  const config: Phaser.Types.Core.GameConfig = {
    ...baseConfig,
    // First entry in this array auto-starts; the rest are registered
    // but inactive until scene.start() picks them up.
    scene: startWithEditor
      ? [EditScene, MenuScene, PlayScene]
      : startWithPlay
        ? [PlayScene, MenuScene, EditScene]
        : [MenuScene, EditScene, PlayScene],
  };

  new Phaser.Game(config);
}

void boot();
