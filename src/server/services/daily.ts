/**
 * The daily loop (BRIEF 5): create today's crypt and its post, name it, credit community
 * designers on Fridays, and summarise finished days.
 */

import type { CryptInfo, FinalSummary } from '../../shared/api';
import { cryptName, honourName, postTitle } from '../../shared/core/crypt-names';
import { WEEKDAY_SHORT, addDays, cryptNumber, dayIdOf, weekdayOf } from '../../shared/core/day';
import { candles, difficultyFor, weekdayName } from '../../shared/core/difficulty';
import { UGC_DIFFICULTY, validateDesign } from '../../shared/core/editor-validate';
import { generate } from '../../shared/core/generator';
import type { Layout } from '../../shared/core/layout';
import type { CryptRecord } from '../repo/crypts';
import { getCrypt, getFirstEscape, getPostRef, patchCrypt, saveCrypt, setPostRef } from '../repo/crypts';
import { markArchitect } from '../repo/players';
import type { Store } from '../repo/store';
import { getVotes, listTombs } from '../repo/tombs';
import { takeApproved } from '../repo/ugc';
import type { Platform } from './platform';

/** Public crypt info for the client. */
export function cryptInfo(rec: CryptRecord, now: number): CryptInfo {
  return {
    dayId: rec.dayId,
    number: rec.number,
    name: rec.name,
    weekday: weekdayName(rec.dayId),
    weekdayShort: WEEKDAY_SHORT[weekdayOf(rec.dayId)] ?? '',
    candles: candles(rec.dayId),
    oil: rec.budget,
    bones: rec.bones,
    pits: rec.pits,
    curses: rec.curses,
    curseDrain: rec.curseDrain,
    source: rec.source,
    ...(rec.designer ? { designer: rec.designer } : {}),
    isToday: rec.dayId === dayIdOf(new Date(now)),
  };
}

/** First escapee and the most-believed epitaph of a day (BRIEF 5 end-of-day summary). */
export async function finalSummary(db: Store, dayId: string): Promise<FinalSummary> {
  const tombs = (await listTombs(db, dayId)).filter((t) => !t.removed && !t.hidden);
  let best: FinalSummary['fittingEpitaph'] = null;
  for (const t of tombs) {
    const v = await getVotes(db, dayId, t.id);
    if (v.true > 0 && (!best || v.true > best.votes)) {
      best = { epitaph: t.epitaph, name: t.anonymous ? null : (t.name ?? null), votes: v.true };
    }
  }
  return { firstEscape: await getFirstEscape(db, dayId), fittingEpitaph: best };
}

/** Builds (but does not save) the crypt record and layout for a day. */
export async function planCrypt(db: Store, p: Platform, dayId: string, now: number): Promise<{ rec: CryptRecord; layout: Layout }> {
  const number = cryptNumber(dayId);
  if (weekdayOf(dayId) === 5) {
    const ugc = await takeApproved(db);
    if (ugc) {
      const v = validateDesign(ugc.layout, ugc.name);
      if (v.ok && v.solver && v.budget !== undefined) {
        await markArchitect(db, ugc.designerId);
        return {
          layout: ugc.layout,
          rec: {
            dayId,
            seed: 0,
            subSeed: 0,
            version: 0,
            budget: v.budget,
            bones: UGC_DIFFICULTY.bones,
            pits: ugc.layout.pits.length,
            curses: ugc.layout.curses.length,
            curseDrain: UGC_DIFFICULTY.curseDrain,
            name: ugc.name,
            number,
            source: 'ugc',
            designer: ugc.designer,
            designerId: ugc.designerId,
            oilNeeded: v.solver.oilNeeded,
            inferenceSteps: v.solver.inferenceSteps,
            solverPath: v.solver.path.map((c) => c.y * 7 + c.x),
            createdAt: now,
          },
        };
      }
    }
  }
  const difficulty = difficultyFor(dayId);
  const g = generate({ subredditId: p.subredditId, dayId, difficulty });
  const yesterday = await finalSummary(db, addDays(dayId, -1));
  const honoured = yesterday.fittingEpitaph?.name;
  return {
    layout: g.layout,
    rec: {
      dayId,
      seed: g.seed,
      subSeed: g.subSeed,
      version: g.version,
      budget: g.budget,
      bones: difficulty.bones,
      pits: difficulty.pits,
      curses: difficulty.curses,
      curseDrain: difficulty.curseDrain,
      name: honoured ? honourName(honoured) : cryptName(g.seed),
      number,
      source: 'gen',
      oilNeeded: g.solver.oilNeeded,
      inferenceSteps: g.solver.inferenceSteps,
      solverPath: g.solver.path.map((c) => c.y * 7 + c.x),
      createdAt: now,
    },
  };
}

const HOW_TO = [
  'Here Lies: a daily crypt deduction game.',
  'Find the relic and return to the entrance before your lantern runs dry.',
  'Cold draft = a pit next door. Whispers = a curse next door. Faint glow = the relic is within two rooms.',
  'When you die, your tombstone and epitaph stay here for everyone after you.',
].join('\n\n');

export type EnsureResult = { rec: CryptRecord; created: boolean; url: string | null };

/**
 * Makes sure today's (or a given day's) crypt exists and has a post. Idempotent and guarded by
 * a short Redis lock so the cron, install trigger and menu can never double-post.
 */
export async function ensureCrypt(db: Store, p: Platform, dayId: string, now: number): Promise<EnsureResult> {
  const existing = await getCrypt(db, dayId);
  if (existing?.postId) return { rec: existing, created: false, url: null };
  const got = await db.set(`lock:crypt:${dayId}`, String(now), { nx: true, expiration: new Date(now + 60_000) });
  if (!got) {
    const again = await getCrypt(db, dayId);
    if (again) return { rec: again, created: false, url: null };
    throw new Error('Crypt creation already in progress');
  }
  try {
    let rec = existing;
    if (!rec) {
      const plan = await planCrypt(db, p, dayId, now);
      rec = plan.rec;
      await saveCrypt(db, rec, plan.layout);
    }
    const title = postTitle(rec.number, weekdayName(dayId), rec.name);
    const post = await p.createPost({ title, textFallback: `${title}\n\n${HOW_TO}` });
    await setPostRef(db, post.id, { kind: 'crypt', ref: dayId });
    const commentId = await p.pinComment(
      post.id,
      `**${title}**${rec.designer ? `\n\nA community crypt designed by u/${rec.designer}.` : ''}\n\nShare your result here with the Share to comments button after your run. No spoilers about where the relic lies, please.`,
    );
    const patch: Partial<CryptRecord> = { postId: post.id, ...(commentId ? { commentId } : {}) };
    await patchCrypt(db, dayId, patch);
    return { rec: { ...rec, ...patch }, created: true, url: post.url };
  } finally {
    await db.del(`lock:crypt:${dayId}`);
  }
}

/** The crypt day a post shows, if it is a crypt post. */
export async function dayForPost(db: Store, postId: string | undefined): Promise<string | null> {
  if (!postId) return null;
  const ref = await getPostRef(db, postId);
  return ref?.kind === 'crypt' ? ref.ref : null;
}
