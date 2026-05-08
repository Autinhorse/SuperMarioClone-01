import type Phaser from 'phaser';

// Centralised audio loader + key registry. Same idea as sprites.ts:
// every scene that wants any of these sounds calls loadSounds(this) in
// preload, and the global Phaser audio cache deduplicates so we only
// fetch each file once even though three scenes call it. Playback uses
// the SOUND_KEYS constants — string-typo-safe and one place to rename
// keys if assets get re-organised.

export const SOUND_KEYS = {
  death: 'sfx_death',
  fly: 'sfx_fly',
  getCoin: 'sfx_get_coin',
  getKey: 'sfx_get_key',
  hitGlass: 'sfx_hit_glass',
  hitWall: 'sfx_hit_wall',
  jump: 'sfx_jump',
  landGround: 'sfx_land_ground',
  levelCompleted: 'sfx_level_completed',
  portal: 'sfx_portal',
  teleport: 'sfx_teleport',
  uiButton: 'sfx_ui_button',
  bgm: 'bgm_music',
} as const;

// Per-sound default volumes. Music sits well under SFX so action cues
// stay legible over the loop. SFX at 0.7 leaves headroom for browsers
// that bias loud, without having to ship trimmed wavs.
export const SOUND_VOLUMES = {
  bgm: 0.2,
  sfx: 0.7,
} as const;

export function loadSounds(scene: Phaser.Scene): void {
  scene.load.audio(SOUND_KEYS.death, 'sounds/Death.wav');
  scene.load.audio(SOUND_KEYS.fly, 'sounds/Fly.wav');
  scene.load.audio(SOUND_KEYS.getCoin, 'sounds/GetCoin.wav');
  scene.load.audio(SOUND_KEYS.getKey, 'sounds/GetKey.wav');
  scene.load.audio(SOUND_KEYS.hitGlass, 'sounds/HitGlass.wav');
  scene.load.audio(SOUND_KEYS.hitWall, 'sounds/HitWall.wav');
  scene.load.audio(SOUND_KEYS.jump, 'sounds/Jump.wav');
  scene.load.audio(SOUND_KEYS.landGround, 'sounds/LandGround.wav');
  scene.load.audio(SOUND_KEYS.levelCompleted, 'sounds/LevelCompleted.wav');
  scene.load.audio(SOUND_KEYS.portal, 'sounds/Portal.wav');
  scene.load.audio(SOUND_KEYS.teleport, 'sounds/Teleport.wav');
  scene.load.audio(SOUND_KEYS.uiButton, 'sounds/UI_Button.wav');
  scene.load.audio(SOUND_KEYS.bgm, 'sounds/Music_Background.mp3');
}
