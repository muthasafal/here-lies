/**
 * Typed client for the /api endpoints (BRIEF 7.3). Throws ApiFailure with the server's message.
 */

import type {
  ActResponse,
  EpitaphResponse,
  InitResponse,
  LeaderboardResponse,
  NecropolisResponse,
  PracticeKind,
  PracticeResponse,
  PrefsResponse,
  ReportResponse,
  RevealResponse,
  ShareResponse,
  StartResponse,
  SubscribeResponse,
  UgcSubmitResponse,
  VoteResponse,
} from '../../shared/api';
import type { Layout } from '../../shared/core/layout';
import type { Action } from '../../shared/core/rules';
import type { VoteType } from '../../shared/core/types';

export class ApiFailure extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
  }
}

async function call<T>(method: 'GET' | 'POST', path: string, body?: unknown): Promise<T> {
  const res = await fetch(`/api${path}`, {
    method,
    headers: body === undefined ? {} : { 'content-type': 'application/json' },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
  const data: unknown = await res.json().catch(() => ({}));
  if (!res.ok) {
    const message = typeof data === 'object' && data !== null && typeof Reflect.get(data, 'message') === 'string' ? String(Reflect.get(data, 'message')) : 'The crypt did not answer.';
    throw new ApiFailure(message, res.status);
  }
  const typed: T = JSON.parse(JSON.stringify(data));
  return typed;
}

export const api = {
  today: () => call<InitResponse>('GET', '/today'),
  start: () => call<StartResponse>('POST', '/run/start'),
  act: (action: Action) => call<ActResponse>('POST', '/act', { action }),
  epitaph: (text: string, anonymous: boolean) => call<EpitaphResponse>('POST', '/epitaph', { text, anonymous }),
  reveal: () => call<RevealResponse>('GET', '/reveal'),
  vote: (tombId: string, vote: VoteType) => call<VoteResponse>('POST', '/vote', { tombId, vote }),
  report: (tombId: string) => call<ReportResponse>('POST', '/report', { tombId }),
  share: (includeEpitaph: boolean) => call<ShareResponse>('POST', '/share', { includeEpitaph }),
  subscribe: () => call<SubscribeResponse>('POST', '/subscribe'),
  prefs: (quiet: boolean) => call<PrefsResponse>('POST', '/prefs', { quiet }),
  leaderboard: (scope: 'day' | 'week') => call<LeaderboardResponse>('GET', `/leaderboard?scope=${scope}`),
  practice: (kind: PracticeKind, seed?: number) => call<PracticeResponse>('GET', `/practice/${kind}${seed !== undefined ? `?seed=${seed}` : ''}`),
  submitCrypt: (layout: Layout, name: string) => call<UgcSubmitResponse>('POST', '/ugc/submit', { layout, name }),
  necropolis: (week?: string) => call<NecropolisResponse>('GET', `/necropolis${week ? `?week=${week}` : ''}`),
};
