/**
 * Fixed tutorial crypt and contextual hints (BRIEF 4.9, 7.6 screen 8): one hint at a time,
 * triggered by the situation.
 */

import type { Layout } from './layout.js';
import { idx } from './layout.js';
import type { RunState } from './rules.js';
import type { Omens } from './types.js';

/** A small, gentle crypt. Entrance at D7. */
export const TUTORIAL_LAYOUT: Layout = {
  entrance: idx({ x: 3, y: 6 }),
  relic: idx({ x: 3, y: 2 }),
  pits: [idx({ x: 1, y: 4 }), idx({ x: 5, y: 3 }), idx({ x: 4, y: 1 })],
  curses: [idx({ x: 2, y: 2 })],
};
export const TUTORIAL_CONFIG = { oil: 30, bones: 2, curseDrain: 5 };

export type HintId = 'start' | 'draft' | 'whispers' | 'glow' | 'silence' | 'bone' | 'flare' | 'relic' | 'low-oil' | 'tombstone';

export const HINTS: Record<HintId, string> = {
  start: 'Tap a room next to you, or use the arrow keys, to step into the dark.',
  draft: 'You feel a cold draft. One of the rooms next to you hides a pit.',
  whispers: 'Whispers. A room next to you is cursed: it drains oil, but you survive.',
  glow: 'A faint glow. The relic lies within two rooms of here.',
  silence: 'Silence. Every room next to you is safe.',
  bone: 'Not sure? Throw a bone into an unvisited room next to you to hear what is there.',
  flare: 'The flare reveals the omens of all eight rooms around you, for 2 oil.',
  relic: 'You have the relic. Find your way back to the entrance.',
  'low-oil': 'Your lantern is running low. Head home.',
  tombstone: 'A tombstone marks where someone died. The dead light the way.',
};

/** The single most useful hint for this moment, skipping hints already seen. */
export function nextHint(state: RunState, omens: Omens | undefined, seen: readonly HintId[], tombstonesVisible: boolean): HintId | null {
  const order: HintId[] = [];
  if (state.knowledge.visited.length <= 1) order.push('start');
  if (tombstonesVisible) order.push('tombstone');
  if (state.hasRelic) order.push('relic');
  if (state.oil <= 4) order.push('low-oil');
  if (omens) {
    if (omens.coldDraft > 0) order.push('draft', 'bone');
    if (omens.whispers > 0) order.push('whispers');
    if (omens.faintGlow) order.push('glow');
    if (omens.coldDraft === 0 && omens.whispers === 0 && !omens.faintGlow) order.push('silence');
  }
  if (state.knowledge.visited.length > 4) order.push('flare');
  return order.find((h) => !seen.includes(h)) ?? null;
}
