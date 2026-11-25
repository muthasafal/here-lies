/**
 * Weekday difficulty (BRIEF 4.4). Friday uses Thursday's settings unless a community crypt is approved.
 */

import { WEEKDAYS, weekdayOf } from './day.js';
import type { Difficulty } from './types.js';
import { DIFFICULTY_BY_WEEKDAY } from './types.js';

/** Difficulty for a UTC day. */
export function difficultyFor(dayId: string): Difficulty {
  const d = DIFFICULTY_BY_WEEKDAY[weekdayOf(dayId)];
  if (!d) throw new Error(`No difficulty for ${dayId}`);
  return d;
}

/** Candles 1-6 shown on the splash: Mon 1 ... Sun 6 (Friday shows Thursday's 4). */
export function candles(dayId: string): number {
  return [6, 1, 2, 3, 4, 4, 5][weekdayOf(dayId)] ?? 1;
}

/** Full weekday name for a dayId. */
export function weekdayName(dayId: string): string {
  return WEEKDAYS[weekdayOf(dayId)] ?? 'Monday';
}
