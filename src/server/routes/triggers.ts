/**
 * /internal/triggers/* (devvit.json triggers). Installing or upgrading the app makes sure
 * today's crypt exists; the daily and weekly jobs are cron tasks declared in devvit.json.
 */

import { Hono } from 'hono';
import type { TriggerResponse } from '@devvit/web/shared';
import { dayIdOf } from '../../shared/core/day';
import { ensureCrypt } from '../services/daily';
import { devvitPlatform } from '../services/devvit-platform';
import { db } from './ctx';

export const triggers = new Hono();

async function ensureToday(): Promise<TriggerResponse> {
  const now = Date.now();
  const r = await ensureCrypt(db, devvitPlatform(), dayIdOf(new Date(now)), now);
  const message = `Crypt ${r.rec.dayId} (#${r.rec.number}, ${r.rec.name}) ${r.created ? 'created' : 'already open'} · post ${r.rec.postId ?? 'none'}`;
  console.log(`[here-lies] ${message}`);
  return { status: 'success', message };
}

triggers.post('/on-app-install', async (c) => {
  try {
    return c.json<TriggerResponse>(await ensureToday(), 200);
  } catch (error) {
    console.error('install trigger failed', error);
    return c.json<TriggerResponse>({ status: 'error', message: "Failed to create today's crypt" }, 400);
  }
});

triggers.post('/on-app-upgrade', async (c) => {
  try {
    return c.json<TriggerResponse>(await ensureToday(), 200);
  } catch (error) {
    console.error('upgrade trigger failed', error);
    return c.json<TriggerResponse>({ status: 'error', message: "Failed to ensure today's crypt" }, 400);
  }
});
