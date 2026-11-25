/**
 * Scoring (BRIEF 4.8).
 */

import type { RunStatus } from './rules.js';

export const RETREAT_SCORE = 150;

export type ScoreInput = {
  status: RunStatus;
  oilLeft: number;
  bonesLeft: number;
  flareUsed: boolean;
  cursed: boolean;
  /** Tombstones visible at the start of the run. */
  tombstonesAtStart: number;
};

export type ScoreBreakdown = {
  base: number;
  oilBonus: number;
  bonesBonus: number;
  flareBonus: number;
  cursePenalty: number;
  raw: number;
  multiplier: number;
  final: number;
};

/** Pioneer multiplier m = 1 + e^(-T/8): about 2.0 with no tombstones, towards 1.0 as the crypt fills. */
export function pioneerMultiplier(tombstones: number): number {
  return 1 + Math.exp(-Math.max(0, tombstones) / 8);
}

/** Escape with relic: (1000 + 20·oil + 60·bones + 150·flareUnused − 200·cursed) × m. Retreat 150. Death 0. */
export function scoreRun(input: ScoreInput): ScoreBreakdown {
  if (input.status === 'retreated') {
    return { base: RETREAT_SCORE, oilBonus: 0, bonesBonus: 0, flareBonus: 0, cursePenalty: 0, raw: RETREAT_SCORE, multiplier: 1, final: RETREAT_SCORE };
  }
  if (input.status !== 'escaped') {
    return { base: 0, oilBonus: 0, bonesBonus: 0, flareBonus: 0, cursePenalty: 0, raw: 0, multiplier: 1, final: 0 };
  }
  const base = 1000;
  const oilBonus = 20 * Math.max(0, input.oilLeft);
  const bonesBonus = 60 * Math.max(0, input.bonesLeft);
  const flareBonus = input.flareUsed ? 0 : 150;
  const cursePenalty = input.cursed ? 200 : 0;
  const raw = base + oilBonus + bonesBonus + flareBonus - cursePenalty;
  const multiplier = pioneerMultiplier(input.tombstonesAtStart);
  return { base, oilBonus, bonesBonus, flareBonus, cursePenalty, raw, multiplier, final: Math.round(raw * multiplier) };
}
