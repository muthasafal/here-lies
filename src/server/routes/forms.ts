/**
 * /internal/form/* submit endpoints for the moderator forms in menu.ts (devvit.json "forms").
 */

import { Hono } from 'hono';
import type { UiResponse } from '@devvit/web/shared';
import { decide } from '../repo/ugc';
import { forgetUser, removeEpitaph, restoreEpitaph } from '../services/community';
import { devvitPlatform } from '../services/devvit-platform';
import { db } from './ctx';

export const forms = new Hono();

/** Select fields arrive as string arrays; text fields as strings. */
function field(values: unknown, name: string): string {
  if (typeof values !== 'object' || values === null) return '';
  const v: unknown = Reflect.get(values, name);
  if (Array.isArray(v)) return typeof v[0] === 'string' ? v[0] : '';
  return typeof v === 'string' ? v : '';
}

forms.post('/review-ugc', async (c) => {
  const values: unknown = await c.req.json();
  const id = field(values, 'ugcId');
  const approve = field(values, 'decision') === 'approve';
  const u = await decide(db, id, approve);
  if (!u) return c.json<UiResponse>({ showToast: 'That crypt is gone.' }, 200);
  return c.json<UiResponse>({ showToast: approve ? `"${u.name}" will open on a Friday.` : `"${u.name}" was rejected.` }, 200);
});

forms.post('/remove-epitaph', async (c) => {
  const values: unknown = await c.req.json();
  const [dayId, tombId] = field(values, 'tombId').split('|');
  if (!dayId || !tombId) return c.json<UiResponse>({ showToast: 'Pick an epitaph.' }, 200);
  const ok =
    field(values, 'decision') === 'restore' ? await restoreEpitaph(db, dayId, tombId) : await removeEpitaph(db, devvitPlatform(), dayId, tombId);
  return c.json<UiResponse>({ showToast: ok ? 'Done.' : 'That tombstone is gone.' }, 200);
});

forms.post('/forget-user', async (c) => {
  const values: unknown = await c.req.json();
  const name = field(values, 'username').trim().replace(/^u\//i, '');
  if (!name) return c.json<UiResponse>({ showToast: 'Enter a username.' }, 200);
  const n = await forgetUser(db, name);
  return c.json<UiResponse>({ showToast: `Deleted data for u/${name} (${n} tombstones made anonymous).` }, 200);
});
