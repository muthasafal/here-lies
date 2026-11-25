/**
 * Request and response types shared by client and server (BRIEF 7.3, 7.5).
 * Nothing here ever carries the hidden layout of an active scored run.
 */

import type { Layout } from './core/layout';
import { cellLabel } from './core/layout';
import type { Action, RunEvent, RunState } from './core/rules';
import type { ScoreBreakdown } from './core/scoring';
import type { Streak } from './core/streaks';
import type { DeathCause, VoteType } from './core/types';

export type ApiError = { status: 'error'; message: string };

/** Public crypt metadata (no layout). */
export type CryptInfo = {
  dayId: string;
  number: number;
  name: string;
  weekday: string;
  weekdayShort: string;
  candles: number;
  oil: number;
  bones: number;
  pits: number;
  curses: number;
  curseDrain: number;
  source: 'gen' | 'ugc';
  designer?: string;
  /** True when this is today's crypt (the only one with scored runs). */
  isToday: boolean;
};

export type CryptStats = {
  entered: number;
  fell: number;
  cursed: number;
  stranded: number;
  escaped: number;
  retreated: number;
  relics: number;
};

/** A tombstone as everyone sees it. */
export type PublicTomb = {
  id: string;
  cell: number;
  name: string | null;
  avatar: string | null;
  epitaph: string;
  cause: DeathCause;
  ts: number;
  removed: boolean;
  votes?: VoteCounts;
};

export type VoteCounts = { true: number; false: number; funny: number };

export type LeaderEntry = { rank: number; name: string; score: number; mine: boolean };

/** End-of-day summary shown once a crypt is over (BRIEF 5). */
export type FinalSummary = {
  firstEscape: string | null;
  fittingEpitaph: { epitaph: string; name: string | null; votes: number } | null;
};

export type RunResult = {
  status: RunState['status'];
  score: ScoreBreakdown;
  rank: number | null;
  streak: Streak;
  gravesPassed: number;
  share: string;
  tombId: string | null;
  epitaphCarved: boolean;
};

export type MyRun = {
  state: RunState;
  tombstonesAtStart: number;
  result: RunResult | null;
};

export type ViewerInfo = { loggedIn: boolean; name: string | null; quiet: boolean };

export type TodayResponse = {
  type: 'today';
  kind: 'crypt';
  crypt: CryptInfo;
  stats: CryptStats;
  tombs: PublicTomb[];
  run: MyRun | null;
  streak: Streak;
  leaderboard: LeaderEntry[];
  viewer: ViewerInfo;
  final: FinalSummary | null;
};

export type NecropolisPostResponse = { type: 'today'; kind: 'necropolis'; week: string; viewer: ViewerInfo };
export type NoCryptResponse = { type: 'today'; kind: 'none'; viewer: ViewerInfo };
export type InitResponse = TodayResponse | NecropolisPostResponse | NoCryptResponse;

export type StartResponse = { type: 'start'; run: MyRun };

export type ActRequest = { action: Action };
export type ActResponse = { type: 'act'; state: RunState; events: RunEvent[]; result: RunResult | null };

export type EpitaphRequest = { text: string; anonymous: boolean };
export type EpitaphResponse = { type: 'epitaph'; tomb: PublicTomb };

export type RevealResponse = {
  type: 'reveal';
  layout: Layout;
  tombs: PublicTomb[];
  /** Tombs this player may judge, and their vote if already cast. */
  votable: { tombId: string; vote: VoteType | null }[];
  solverPath: number[];
};

export type VoteRequest = { tombId: string; vote: VoteType };
export type VoteResponse = { type: 'vote'; tombId: string; votes: VoteCounts };

export type ShareRequest = { includeEpitaph: boolean };
export type ShareResponse = { type: 'share'; commentUrl: string | null };

export type SubscribeResponse = { type: 'subscribe'; ok: boolean };
export type PrefsRequest = { quiet: boolean };
export type PrefsResponse = { type: 'prefs'; quiet: boolean };
export type ReportRequest = { tombId: string };
export type ReportResponse = { type: 'report'; hidden: boolean };

export type LeaderboardResponse = { type: 'leaderboard'; scope: 'day' | 'week'; entries: LeaderEntry[]; me: LeaderEntry | null };

export type PracticeKind = 'yesterday' | 'tutorial' | 'random' | 'past';
export type PracticeResponse = {
  type: 'practice';
  kind: PracticeKind;
  title: string;
  layout: Layout;
  oil: number;
  bones: number;
  curseDrain: number;
};

export type UgcSubmitRequest = { layout: Layout; name: string };
export type UgcSubmitResponse = { type: 'ugc'; ok: boolean; problems: string[] };

export type NecropolisDay = { dayId: string; crypt: CryptInfo; stats: CryptStats; tombs: PublicTomb[]; layout: Layout | null };
export type NecropolisResponse = {
  type: 'necropolis';
  week: string;
  days: NecropolisDay[];
  leaderboard: LeaderEntry[];
  titles: { honest: string[]; tricksters: string[]; poet: string | null; architects: string[] };
};

/** Realtime messages on channel `crypt-{dayId}` (BRIEF 7.5). */
export type RealtimeMessage =
  | { t: 'tomb'; tomb: PublicTomb }
  | { t: 'stats'; stats: CryptStats }
  | { t: 'escape'; name: string; score: number };

/** Realtime channel for a crypt day (no colons allowed). */
export function cryptChannel(dayId: string): string {
  return `crypt-${dayId}`;
}

/** Human-readable death toast, e.g. "u/name fell at C4" (BRIEF 4.6). */
export function deathToast(t: PublicTomb): string {
  const who = t.name ? `u/${t.name}` : 'A nameless soul';
  const verb = t.cause === 'fell' ? 'fell' : t.cause === 'cursed' ? 'was taken by a curse' : 'was taken by the dark';
  return `${who} ${verb} at ${cellLabel(t.cell)}`;
}
