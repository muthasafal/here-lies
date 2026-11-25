/**
 * Epitaph moderation: local word filter, then Perspective API when a key is configured
 * (BRIEF 4.7). Perspective failures never block a player: the local filter still applies.
 */

import { checkEpitaph } from '../../shared/core/epitaph-filter';
import type { Platform } from './platform';

export const PERSPECTIVE_URL = 'https://commentanalyzer.googleapis.com/v1alpha1/comments:analyze';
export const TOXICITY_LIMIT = 0.8;

type PerspectiveReply = { attributeScores?: Record<string, { summaryScore?: { value?: number } }> };

/** Highest Perspective score across the attributes we ask for, or null if unavailable. */
export async function perspectiveScore(p: Platform, text: string): Promise<number | null> {
  const key = await p.perspectiveKey();
  if (!key) return null;
  try {
    const res = await p.fetch(`${PERSPECTIVE_URL}?key=${encodeURIComponent(key)}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        comment: { text },
        languages: ['en'],
        requestedAttributes: { TOXICITY: {}, SEVERE_TOXICITY: {}, IDENTITY_ATTACK: {}, THREAT: {} },
        doNotStore: true,
      }),
    });
    if (!res.ok) return null;
    const body: PerspectiveReply = await res.json();
    const scores = Object.values(body.attributeScores ?? {}).map((a) => a.summaryScore?.value ?? 0);
    return scores.length > 0 ? Math.max(...scores) : null;
  } catch {
    return null;
  }
}

export type ModerationResult = { ok: true; text: string } | { ok: false; reason: string };

/** Runs both filters on an epitaph. */
export async function moderateEpitaph(p: Platform, raw: string): Promise<ModerationResult> {
  const local = checkEpitaph(raw);
  if (!local.ok) return local;
  const score = await perspectiveScore(p, local.text);
  if (score !== null && score >= TOXICITY_LIMIT) return { ok: false, reason: 'The stone refuses those words.' };
  return local;
}
