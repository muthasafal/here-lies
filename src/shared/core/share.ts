/**
 * Spoiler-free emoji share text (BRIEF 5).
 */

import type { RunStatus } from './rules.js';
import type { DeathCause } from './types.js';

export type ShareInput = {
  cryptNumber: number;
  weekdayShort: string;
  status: RunStatus;
  deathCause?: DeathCause;
  score: number;
  oilLeft: number;
  bonesLeft: number;
  gravesPassed: number;
  streak: number;
  practice?: boolean;
};

function outcome(i: ShareInput): string {
  if (i.status === 'escaped') return `🕯️ escaped with the relic · ${i.score.toLocaleString('en-US')} pts`;
  if (i.status === 'retreated') return `🚪 lived to tell · ${i.score.toLocaleString('en-US')} pts`;
  if (i.deathCause === 'cursed') return '💀 taken by a curse';
  if (i.deathCause === 'stranded') return '💀 the dark took me';
  return '💀 fell into the dark';
}

/** Builds the share block: title, outcome, resources and graves, and the streak when there is one. */
export function shareText(i: ShareInput): string {
  const lines = [
    `Here Lies · Crypt #${i.cryptNumber} · ${i.weekdayShort}${i.practice ? ' · practice' : ''}`,
    outcome(i),
    `oil ${i.oilLeft} left · bones ${i.bonesLeft} · ⚰️ passed ${i.gravesPassed} graves`,
  ];
  if (i.streak > 0) lines.push(`🔥 streak ${i.streak}`);
  return lines.join('\n');
}
