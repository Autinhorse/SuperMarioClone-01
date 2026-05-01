import Phaser from 'phaser';

import { PlayScene } from './game/scenes/PlayScene';

// Mirrors the Godot project's design size so Phase-2 ports can copy
// pixel-coordinate constants over without rescaling math.
const GAME_WIDTH = 1600;
const GAME_HEIGHT = 960;

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.WEBGL,
  width: GAME_WIDTH,
  height: GAME_HEIGHT,
  parent: 'game',
  backgroundColor: '#22252c',
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  physics: {
    default: 'arcade',
    arcade: {
      // World gravity is zero — the player manages gravity manually per
      // state to mirror the Godot reference's launch-and-stop feel.
      gravity: { x: 0, y: 0 },
      debug: false,
    },
  },
  scene: [PlayScene],
};

new Phaser.Game(config);
