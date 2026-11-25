/**
 * Streaks (BRIEF 4.8): consecutive UTC days with an escape (relic or retreat), plus a play
 * streak that a death does not break.
 */

import { daysBetween } from './day.js';

export type Streak = {
  play: number;
  escape: number;
  best: number;
  lastPlayDay?: string;
  lastEscapeDay?: string;
};

export const EMPTY_STREAK: Streak = { play: 0, escape: 0, best: 0 };

/** Folds one finished scored run into a streak. Calling it twice for the same day changes nothing. */
export function updateStreak(prev: Streak, dayId: string, escaped: boolean): Streak {
  if (prev.lastPlayDay === dayId) return { ...prev };
  const next: Streak = { ...prev, lastPlayDay: dayId };
  const playGap = prev.lastPlayDay ? daysBetween(prev.lastPlayDay, dayId) : Infinity;
  next.play = playGap === 1 ? prev.play + 1 : 1;
  if (escaped) {
    const gap = prev.lastEscapeDay ? daysBetween(prev.lastEscapeDay, dayId) : Infinity;
    next.escape = gap === 1 ? prev.escape + 1 : 1;
    next.lastEscapeDay = dayId;
  } else {
    next.escape = 0;
  }
  next.best = Math.max(prev.best, next.escape);
  return next;
}

/** A streak as the player should see it today: zero once a day was missed. */
export function currentStreak(s: Streak, today: string): Streak {
  const alive = (d?: string) => d !== undefined && daysBetween(d, today) <= 1;
  return { ...s, play: alive(s.lastPlayDay) ? s.play : 0, escape: alive(s.lastEscapeDay) ? s.escape : 0 };
}
