/**
 * Side effects the services need from Devvit (posts, comments, flair, realtime, settings,
 * outbound fetch). Services receive a Platform so tests can pass a fake.
 */

import type { RealtimeMessage } from '../../shared/api';

export type Platform = {
  /** Sends a realtime message on a crypt channel. */
  publish(channel: string, msg: RealtimeMessage): Promise<void>;
  /** The user's avatar URL, or null for the ghost silhouette. */
  avatar(username: string): Promise<string | null>;
  /** Creates a custom post (as the app). */
  createPost(opts: { title: string; entry?: string; textFallback: string }): Promise<{ id: string; url: string }>;
  /** Adds a sticky, distinguished app comment to a post. Returns the comment id. */
  pinComment(postId: string, text: string): Promise<string | null>;
  /** Posts a comment AS THE USER. Only ever called from the explicit Share button. */
  commentAsUser(parentId: string, text: string): Promise<string | null>;
  /** Subscribes the user. Only ever called from the explicit Subscribe button. */
  subscribeUser(): Promise<void>;
  /** Sets the user's flair text in this subreddit. */
  setFlair(username: string, text: string): Promise<void>;
  /** The Perspective API key from Devvit settings, if a moderator configured one. */
  perspectiveKey(): Promise<string | null>;
  fetch: typeof fetch;
  subredditId: string;
  subredditName: string;
};
