/**
 * /internal/menu/* moderator tools. Every item here is mapped in devvit.json (AGENTS.md rule).
 */

import { Hono } from 'hono';
import type { UiResponse } from '@devvit/web/shared';
import { context } from '@devvit/web/server';
import { dayIdOf } from '../../shared/core/day';
import { cellLabel } from '../../shared/core/layout';
import { getPostRef } from '../repo/crypts';
import { listTombs } from '../repo/tombs';
import { listQueue } from '../repo/ugc';
import { postNecropolis } from '../services/community';
import { ensureCrypt } from '../services/daily';
import { devvitPlatform } from '../services/devvit-platform';
import { db } from './ctx';

export const menu = new Hono();

const postUrl = (postId: string) => `https://reddit.com/r/${context.subredditName}/comments/${postId.replace(/^t3_/, '')}`;

menu.post('/create-today', async (c) => {
  try {
    const now = Date.now();
    const r = await ensureCrypt(db, devvitPlatform(), dayIdOf(new Date(now)), now);
    if (r.rec.postId) return c.json<UiResponse>({ navigateTo: postUrl(r.rec.postId) }, 200);
    return c.json<UiResponse>({ showToast: "Today's crypt is open." }, 200);
  } catch (e) {
    console.error(e);
    return c.json<UiResponse>({ showToast: "Could not create today's crypt." }, 400);
  }
});

menu.post('/review-ugc', async (c) => {
  const queue = await listQueue(db, 20);
  if (queue.length === 0) return c.json<UiResponse>({ showToast: 'No community crypts are waiting.' }, 200);
  return c.json<UiResponse>(
    {
      showForm: {
        name: 'reviewUgc',
        form: {
          title: 'Review community crypts',
          description: 'Every crypt here already passed the fairness solver. Approved crypts become Friday crypts, oldest first.',
          fields: [
            {
              type: 'select',
              name: 'ugcId',
              label: 'Crypt',
              required: true,
              options: queue.map((u) => ({
                label: `#${u.id} · ${u.name} · by u/${u.designer} · ${u.layout.pits.length} pits, ${u.layout.curses.length} curses`,
                value: u.id,
              })),
            },
            {
              type: 'select',
              name: 'decision',
              label: 'Decision',
              required: true,
              options: [
                { label: 'Approve for a Friday', value: 'approve' },
                { label: 'Reject', value: 'reject' },
              ],
            },
          ],
        },
      },
    },
    200,
  );
});

menu.post('/remove-epitaph', async (c) => {
  const ref = context.postId ? await getPostRef(db, context.postId) : null;
  if (!ref || ref.kind !== 'crypt') return c.json<UiResponse>({ showToast: 'Use this on a Here Lies crypt post.' }, 200);
  const tombs = (await listTombs(db, ref.ref)).filter((t) => !t.removed).reverse().slice(0, 40);
  if (tombs.length === 0) return c.json<UiResponse>({ showToast: 'No epitaphs in this crypt yet.' }, 200);
  return c.json<UiResponse>(
    {
      showForm: {
        name: 'removeEpitaph',
        form: {
          title: 'Moderate an epitaph',
          fields: [
            {
              type: 'select',
              name: 'tombId',
              label: 'Epitaph',
              required: true,
              options: tombs.map((t) => ({
                label: `${t.hidden ? '[reported] ' : ''}${cellLabel(t.cell)} · ${t.name ?? 'anonymous'}: ${t.epitaph}`,
                value: `${ref.ref}|${t.id}`,
              })),
            },
            {
              type: 'select',
              name: 'decision',
              label: 'Action',
              required: true,
              options: [
                { label: 'Remove the epitaph', value: 'remove' },
                { label: 'Restore a reported epitaph', value: 'restore' },
              ],
            },
          ],
        },
      },
    },
    200,
  );
});

menu.post('/forget-user', async (c) =>
  c.json<UiResponse>(
    {
      showForm: {
        name: 'forgetUser',
        form: {
          title: 'Delete a player’s Here Lies data',
          description: 'Removes their profile, streaks, reputation and leaderboard entries, and makes their tombstones anonymous.',
          fields: [{ type: 'string', name: 'username', label: 'Username (without u/)', required: true }],
          acceptLabel: 'Delete data',
        },
      },
    },
    200,
  ),
);

menu.post('/post-necropolis', async (c) => {
  try {
    const post = await postNecropolis(db, devvitPlatform(), dayIdOf(new Date()));
    return c.json<UiResponse>(post.url ? { navigateTo: post.url } : { showToast: "This week's Necropolis is already posted." }, 200);
  } catch (e) {
    console.error(e);
    return c.json<UiResponse>({ showToast: 'Could not post the Necropolis.' }, 400);
  }
});
