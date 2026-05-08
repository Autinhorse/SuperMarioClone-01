import type {
  Cannon as CannonData,
  Cell as CellData,
  Conveyor as ConveyorData,
  ExitPoint as ExitPointData,
  Gear as GearData,
  GlassWall as GlassWallData,
  Key as KeyData,
  KeyWall as KeyWallData,
  LaserCannon as LaserCannonData,
  Spike as SpikeData,
  SpikeBlock as SpikeBlockData,
  Teleport as TeleportData,
  TextLabel as TextLabelData,
  Turret as TurretData,
} from '../../../shared/level-format/types';

// Selection state for per-instance editing. Each array-backed `ref`
// is a direct pointer into the level's per-page array, so mutating
// `ref` flows straight back into the saved JSON. The discriminated
// union lets callers narrow on `kind` to access type-specific
// properties (e.g. only spike / cannon / laser_cannon carry `dir`).
//
// `wall` and `coin` are tile-string chars, not array entries; their
// `ref` is a synthesized `{x, y}` carrying just the cell position.
// They have no editable params (the panel just shows the kind), but
// selection still gives the orange highlight + drag-move parity with
// other elements.
//
// `spawn` and `exit` are level-singleton positions (not arrays); their
// `ref` points at the live `page.spawn` / `level.exit` object, so
// drag-moves auto-track via the same in-place mutation path as
// array-backed elements.
export type SelectedElement =
  | { kind: 'wall'; ref: { x: number; y: number } }
  | { kind: 'coin'; ref: { x: number; y: number } }
  | { kind: 'spawn'; ref: CellData }
  | { kind: 'exit'; ref: ExitPointData }
  | { kind: 'glass_wall'; ref: GlassWallData }
  | { kind: 'spike_block'; ref: SpikeBlockData }
  | { kind: 'spike'; ref: SpikeData }
  | { kind: 'conveyor'; ref: ConveyorData }
  | { kind: 'cannon'; ref: CannonData }
  | { kind: 'turret'; ref: TurretData }
  | { kind: 'gear'; ref: GearData }
  | { kind: 'key'; ref: KeyData }
  | { kind: 'key_wall'; ref: KeyWallData }
  | { kind: 'teleport'; ref: TeleportData }
  | { kind: 'laser_cannon'; ref: LaserCannonData }
  | { kind: 'text_label'; ref: TextLabelData };
