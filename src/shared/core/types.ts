/**
 * Core types for Here Lies game engine.
 * Platform-agnostic, shared by client and server.
 */

/** Grid coordinates (0-6 inclusive) */
export interface Coord {
  x: number;
  y: number;
}

/** Cardinal directions */
export type Direction = 'north' | 'south' | 'east' | 'west';

/** Cell content (hidden from player until revealed) */
export type CellContent = 'empty' | 'pit' | 'curse' | 'relic';

/** Omen types sensed in a room */
export interface Omens {
  coldDraft: number; // 0-4 pits adjacent
  whispers: number;  // 0-4 curses adjacent
  faintGlow: boolean; // relic within Manhattan distance 2
}

/** What the player knows about a cell */
export type CellKnowledge = 
  | 'unknown'
  | 'safe'
  | 'pit'
  | 'curse'
  | 'relic'
  | 'relic-candidate';

/** Result of throwing a bone */
export type BoneResult = 'long-fall' | 'shriek' | 'clatter';

/** How the player died */
export type DeathCause = 'fell' | 'cursed' | 'stranded';

/** Run status */
export type RunStatus = 
  | 'active'
  | 'escaped-with-relic'
  | 'retreated'
  | 'died';

/** Full crypt layout (server-side, hidden during active run) */
export interface CryptLayout {
  grid: CellContent[][]; // 7x7 grid
  entrance: Coord;
  relic: Coord;
  pits: Coord[];
  curses: Coord[];
}

/** Difficulty settings by weekday */
export interface Difficulty {
  pits: number;
  curses: number;
  bones: number;
  slackFactor: number;
  curseDrain: number;
}

/** Crypt metadata */
export interface CryptMeta {
  dayId: string;        // yyyy-mm-dd
  number: number;       // Sequential crypt number
  name: string;         // "The Weeping Vault" or "The Crypt of u/name"
  weekday: string;      // "Monday", "Tuesday", etc.
  seed: number;         // The RNG seed
  version: number;      // GENERATOR_VERSION
  difficulty: Difficulty;
  oilBudget: number;
  source: 'generated' | 'community';
  designer?: string;    // For community crypts
}

/** Player knowledge state */
export interface KnowledgeState {
  visited: Set<string>;        // "x,y" for each visited cell
  knowledge: Map<string, CellKnowledge>; // "x,y" -> what we know
  boneResults: Map<string, BoneResult>;  // "x,y" -> bone test result
  flareReveals: Map<string, Omens>;      // "x,y" -> omens from flare
}

/** Active game state */
export interface GameState {
  status: RunStatus;
  position: Coord;
  oil: number;
  bonesLeft: number;
  flareUsed: boolean;
  cursed: boolean;
  hasRelic: boolean;
  knowledge: KnowledgeState;
  deathCause?: DeathCause;
  deathCell?: Coord;
}

/** Player action */
export type GameAction =
  | { type: 'move'; direction: Direction }
  | { type: 'bone'; target: Coord }
  | { type: 'flare' }
  | { type: 'retreat' };

/** Result of applying an action */
export interface ActionResult {
  success: boolean;
  newState: GameState;
  omens?: Omens;
  boneResult?: BoneResult;
  flareOmens?: Map<string, Omens>;
  error?: string;
}

/** Tombstone data */
export interface Tombstone {
  id: string;
  cell: Coord;
  userId?: string;
  username?: string;
  avatar?: string;
  epitaph: string;
  cause: DeathCause;
  timestamp: number;
  removed?: boolean;
}

/** Vote type */
export type VoteType = 'true' | 'false' | 'funny';

/** Reputation title */
export type ReputationTitle = 
  | 'Honest Ghost'
  | 'Trickster'
  | 'Poet of the Crypt'
  | 'Architect'
  | null;

/** Player score breakdown */
export interface ScoreBreakdown {
  base: number;
  oilBonus: number;
  bonesBonus: number;
  flareBonus: number;
  cursePenalty: number;
  raw: number;
  pioneerMultiplier: number;
  final: number;
}

/** Solver output */
export interface SolverResult {
  solvable: boolean;
  oilNeeded: number;          // L (oil for perfect deduction)
  inferenceSteps: number;
  usedBones: number;
  usedFlare: boolean;
  path?: Coord[];             // Solution path (for debugging)
  stuckReason?: string;       // Why it failed
}

/** Constants */
export const GRID_SIZE = 7;
export const MIN_INFERENCE_STEPS = 6;
export const GENERATOR_VERSION = 1;
export const CURSE_DRAIN_DEFAULT = 5;

/** Weekday difficulties (UTC) */
export const DIFFICULTY_BY_WEEKDAY: Record<number, Difficulty> = {
  1: { pits: 5,  curses: 2, bones: 3, slackFactor: 1.8, curseDrain: 5 }, // Monday
  2: { pits: 6,  curses: 2, bones: 3, slackFactor: 1.6, curseDrain: 5 }, // Tuesday
  3: { pits: 7,  curses: 3, bones: 2, slackFactor: 1.5, curseDrain: 5 }, // Wednesday
  4: { pits: 8,  curses: 3, bones: 2, slackFactor: 1.4, curseDrain: 5 }, // Thursday
  5: { pits: 8,  curses: 3, bones: 2, slackFactor: 1.4, curseDrain: 5 }, // Friday (default to Thu)
  6: { pits: 9,  curses: 4, bones: 2, slackFactor: 1.3, curseDrain: 5 }, // Saturday
  0: { pits: 10, curses: 4, bones: 1, slackFactor: 1.2, curseDrain: 5 }, // Sunday
};

/** Direction vectors */
export const DIRECTION_VECTORS: Record<Direction, Coord> = {
  north: { x: 0, y: -1 },
  south: { x: 0, y: 1 },
  east: { x: 1, y: 0 },
  west: { x: -1, y: 0 },
};

/** All 8 surrounding offsets (orthogonal + diagonal) */
export const SURROUNDING_OFFSETS: Coord[] = [
  { x: -1, y: -1 }, { x: 0, y: -1 }, { x: 1, y: -1 },
  { x: -1, y: 0 },                   { x: 1, y: 0 },
  { x: -1, y: 1 },  { x: 0, y: 1 },  { x: 1, y: 1 },
];

/** Orthogonal (4-way) offsets only */
export const ORTHOGONAL_OFFSETS: Coord[] = [
  { x: 0, y: -1 }, // north
  { x: 1, y: 0 },  // east
  { x: 0, y: 1 },  // south
  { x: -1, y: 0 }, // west
];
