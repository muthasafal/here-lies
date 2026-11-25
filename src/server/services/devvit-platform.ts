/**
 * The real Platform, backed by @devvit/web/server.
 */

import { context, realtime, reddit, settings } from '@devvit/web/server';
import type { Platform } from './platform';

const isPost = (id: string): id is `t3_${string}` => id.startsWith('t3_');
const isComment = (id: string): id is `t1_${string}` => id.startsWith('t1_');

/** Builds a Platform for the current request context. */
export function devvitPlatform(): Platform {
  const subredditName = context.subredditName ?? '';
  return {
    subredditId: context.subredditId,
    subredditName,
    fetch: (...args) => fetch(...args),
    async publish(channel, msg) {
      try {
        await realtime.send(channel, msg);
      } catch (e) {
        console.error('realtime send failed', e);
      }
    },
    async avatar(username) {
      try {
        return (await reddit.getSnoovatarUrl(username)) ?? null;
      } catch {
        return null;
      }
    },
    async createPost({ title, entry, textFallback }) {
      const post = await reddit.submitCustomPost({
        title,
        subredditName,
        ...(entry ? { entry } : {}),
        textFallback: { text: textFallback },
      });
      return { id: post.id, url: post.url };
    },
    async pinComment(postId, text) {
      if (!isPost(postId)) return null;
      try {
        const c = await reddit.submitComment({ id: postId, text });
        await c.distinguish(true);
        return c.id;
      } catch (e) {
        console.error('pin comment failed', e);
        return null;
      }
    },
    async commentAsUser(parentId, text) {
      if (!isPost(parentId) && !isComment(parentId)) return null;
      const c = await reddit.submitComment({ id: parentId, text, runAs: 'USER' });
      return c.url;
    },
    async subscribeUser() {
      await reddit.subscribeToCurrentSubreddit();
    },
    async setFlair(username, text) {
      try {
        await reddit.setUserFlair({ subredditName, username, text });
      } catch (e) {
        console.error('flair failed', e);
      }
    },
    async perspectiveKey() {
      try {
        const key = await settings.get<string>('perspectiveApiKey');
        return typeof key === 'string' && key.length > 0 ? key : null;
      } catch {
        return null;
      }
    },
  };
}
