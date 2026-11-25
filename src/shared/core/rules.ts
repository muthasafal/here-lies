/**
 * Rules engine: applyAction(state, action) -> new state + what the player learns (BRIEF 4.3).
 * Pure and JSON-serializable, so the server (authoritative scored runs) and the client
 * (practice, tutorial) run the exact same rules (BRIEF 9, property 7).
 */

import type { Layout } from './layout.js';
import { contentAt, neighbours, omensAt, surrounding } from './layout.js';
import type { BoneResult, DeathCause, Direction, Omens } from './types.js';
import { CURSE_DRAIN_DEFAULT, GRID_SIZE } from './types.js';

export const FLARE_COST = 2;

export type RunStatus = 'active' | 'escaped' | 'retreated' | 'died';

/** Everything the player has learned. Cell indices are the keys. Safe to send to the client. */
export type RunKnowledge = {
  visited: number[];
  /** Omens of visited rooms and of rooms revealed by the flare. */
  omens: Record<number, Omens>;
  bones: Record<number, BoneResult>;
  /** Curse rooms the player has stepped in (each curse drains only once). */
  spentCurses: number[];
};

export type RunState = {
  status: RunStatus;
  pos: number;
  oil: number;
  bonesLeft: number;
  flareUsed: boolean;
  cursed: boolean;
  hasRelic: boolean;
  moves: number;
  knowledge: RunKnowledge;
  deathCause?: DeathCause;
  deathCell?: number;
};

export type Action =
  | { type: 'move'; dir: Direction }
  | { type: 'step'; to: number }
  | { type: 'bone'; target: number }
  | { type: 'flare' }
  | { type: 'retreat' };

/** Something that happened, for the UI, toasts and the live region. */
export type RunEvent =
  | { t: 'moved'; to: number; omens: Omens }
  | { t: 'relic' }
  | { t: 'cursed'; drained: number }
  | { t: 'bone'; target: number; result: BoneResult }
  | { t: 'flare'; revealed: Record<number, Omens> }
  | { t: 'died'; cause: DeathCause; cell: number }
  | { t: 'escaped' }
  | { t: 'retreated' };

export type ApplyResult = { ok: true; state: RunState; events: RunEvent[] } | { ok: false; error: string; state: RunState };

export type RunConfig = { oil: number; bones: number; curseDrain?: number };

/** Starting state: standing in the entrance, which is observed immediately. */
export function startRun(layout: Layout, cfg: RunConfig): RunState {
  return {
    status: 'active',
    pos: layout.entrance,
    oil: cfg.oil,
    bonesLeft: cfg.bones,
    flareUsed: false,
    cursed: false,
    hasRelic: false,
    moves: 0,
    knowledge: { visited: [layout.entrance], omens: { [layout.entrance]: omensAt(layout, layout.entrance) }, bones: {}, spentCurses: [] },
  };
}

const DIRS: Record<Direction, number> = { north: -GRID_SIZE, south: GRID_SIZE, east: 1, west: -1 };

/** The cell one step in a direction, or null at the edge. */
export function stepFrom(pos: number, dir: Direction): number | null {
  const to = pos + DIRS[dir];
  return neighbours(pos).includes(to) ? to : null;
}

function clone(s: RunState): RunState {
  return {
    ...s,
    knowledge: {
      visited: [...s.knowledge.visited],
      omens: { ...s.knowledge.omens },
      bones: { ...s.knowledge.bones },
      spentCurses: [...s.knowledge.spentCurses],
    },
  };
}

function die(s: RunState, cause: DeathCause, cell: number, events: RunEvent[]): void {
  s.status = 'died';
  s.deathCause = cause;
  s.deathCell = cell;
  events.push({ t: 'died', cause, cell });
}

/**
 * Applies one action. Rules: a move costs 1 oil (revisits too); a pit kills; a curse drains
 * curseDrain oil once and marks the run cursed; stepping on the relic picks it up; reaching
 * the entrance with the relic escapes; 0 oil anywhere else strands you. A bone tests an
 * adjacent unvisited room for free. The flare costs 2 oil and reveals the omens of all 8
 * surrounding rooms. Retreat is only allowed at the entrance.
 */
export function applyAction(layout: Layout, prev: RunState, action: Action, curseDrain = CURSE_DRAIN_DEFAULT): ApplyResult {
  if (prev.status !== 'active') return { ok: false, error: 'This run is over.', state: prev };
  const s = clone(prev);
  const events: RunEvent[] = [];

  if (action.type === 'move' || action.type === 'step') {
    const to = action.type === 'move' ? stepFrom(s.pos, action.dir) : action.to;
    if (to === null || !neighbours(s.pos).includes(to)) return { ok: false, error: 'You can only move to an adjacent room.', state: prev };
    s.oil -= 1;
    s.moves += 1;
    s.pos = to;
    const content = contentAt(layout, to);
    if (content === 'pit') {
      die(s, 'fell', to, events);
      return { ok: true, state: s, events };
    }
    const omens = omensAt(layout, to);
    s.knowledge.omens[to] = omens;
    if (!s.knowledge.visited.includes(to)) s.knowledge.visited.push(to);
    events.push({ t: 'moved', to, omens });
    if (content === 'curse' && !s.knowledge.spentCurses.includes(to)) {
      s.knowledge.spentCurses.push(to);
      s.cursed = true;
      s.oil -= curseDrain;
      events.push({ t: 'cursed', drained: curseDrain });
      if (s.oil <= 0) {
        s.oil = 0;
        die(s, 'cursed', to, events);
        return { ok: true, state: s, events };
      }
    }
    if (content === 'relic' && !s.hasRelic) {
      s.hasRelic = true;
      events.push({ t: 'relic' });
    }
    if (s.hasRelic && to === layout.entrance) {
      s.status = 'escaped';
      events.push({ t: 'escaped' });
      return { ok: true, state: s, events };
    }
    if (s.oil <= 0) {
      s.oil = 0;
      die(s, 'stranded', to, events);
    }
    return { ok: true, state: s, events };
  }

  if (action.type === 'bone') {
    if (s.bonesLeft <= 0) return { ok: false, error: 'You have no bones left.', state: prev };
    if (!neighbours(s.pos).includes(action.target)) return { ok: false, error: 'Throw a bone into an adjacent room.', state: prev };
    if (s.knowledge.visited.includes(action.target)) return { ok: false, error: 'You have already been in that room.', state: prev };
    if (s.knowledge.bones[action.target]) return { ok: false, error: 'You already tested that room.', state: prev };
    const content = contentAt(layout, action.target);
    const result: BoneResult = content === 'pit' ? 'long-fall' : content === 'curse' ? 'shriek' : 'clatter';
    s.bonesLeft -= 1;
    s.knowledge.bones[action.target] = result;
    events.push({ t: 'bone', target: action.target, result });
    return { ok: true, state: s, events };
  }

  if (action.type === 'flare') {
    if (s.flareUsed) return { ok: false, error: 'Your flare is spent.', state: prev };
    if (s.oil < FLARE_COST) return { ok: false, error: 'Not enough oil for the flare.', state: prev };
    s.flareUsed = true;
    s.oil -= FLARE_COST;
    const revealed: Record<number, Omens> = {};
    for (const c of surrounding(s.pos)) {
      revealed[c] = omensAt(layout, c);
      s.knowledge.omens[c] = revealed[c];
    }
    events.push({ t: 'flare', revealed });
    if (s.oil <= 0) {
      s.oil = 0;
      die(s, 'stranded', s.pos, events);
    }
    return { ok: true, state: s, events };
  }

  if (s.pos !== layout.entrance) return { ok: false, error: 'You can only leave at the entrance.', state: prev };
  if (s.hasRelic) {
    s.status = 'escaped';
    events.push({ t: 'escaped' });
  } else {
    s.status = 'retreated';
    events.push({ t: 'retreated' });
  }
  return { ok: true, state: s, events };
}

/** Applies a sequence of actions, stopping at the first rejected one. */
export function replay(layout: Layout, start: RunState, actions: Action[], curseDrain = CURSE_DRAIN_DEFAULT): RunState {
  let s = start;
  for (const a of actions) {
    const r = applyAction(layout, s, a, curseDrain);
    if (!r.ok) break;
    s = r.state;
  }
  return s;
}
