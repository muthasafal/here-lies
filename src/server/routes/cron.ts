/**
 * /internal/cron/* scheduler endpoints (devvit.json scheduler.tasks; BRIEF 5, 7.3).
 */

import { Hono } from 'hono';
import { addDays, dayIdOf } from '../../shared/core/day';
import { postNecropolis } from '../services/community';
import { ensureCrypt } from '../services/daily';
import { devvitPlatform } from '../services/devvit-platform';
import { db } from './ctx';

export const cron = new Hono();

/** 00:00 UTC: generate and post today's crypt. Yesterday's post switches to its final summary on its own. */
cron.post('/daily', async (c) => {
  try {
    const now = Date.now();
    const r = await ensureCrypt(db, devvitPlatform(), dayIdOf(new Date(now)), now);
    return c.json({ status: 'ok', dayId: r.rec.dayId, created: r.created }, 200);
  } catch (e) {
    console.error('daily cron failed', e);
    return c.json({ status: 'error' }, 500);
  }
});

/** Sunday 00:05 UTC: post the Necropolis for the week that is ending. */
cron.post('/necropolis', async (c) => {
  try {
    const yesterday = addDays(dayIdOf(new Date()), -1);
    const post = await postNecropolis(db, devvitPlatform(), yesterday);
    return c.json({ status: 'ok', postId: post.id }, 200);
  } catch (e) {
    console.error('necropolis cron failed', e);
    return c.json({ status: 'error' }, 500);
  }
});
