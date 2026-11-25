/**
 * The game controller: loads today's crypt, runs scored (server) and practice (local) runs,
 * reacts to realtime tombstones, and moves between screens. Screens only call these actions
 * and render the state, so the UI can be redesigned without touching game logic.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { showToast } from '@devvit/web/client';
import type { CryptStats, InitResponse, PracticeKind, PublicTomb, RealtimeMessage, RevealResponse, RunResult, TodayResponse } from '../../shared/api';
import { cryptChannel, deathToast } from '../../shared/api';
import type { Layout } from '../../shared/core/layout';
import type { Action, RunEvent, RunState } from '../../shared/core/rules';
import { applyAction, startRun } from '../../shared/core/rules';
import { scoreRun } from '../../shared/core/scoring';
import { shareText } from '../../shared/core/share';
import { solve } from '../../shared/core/solver';
import type { VoteType } from '../../shared/core/types';
import { idx } from '../../shared/core/layout';
import { ApiFailure, api } from '../lib/api';
import { announce } from '../lib/view-model';
import { useRealtime } from './useRealtime';

export type Screen = 'home' | 'play' | 'death' | 'reveal' | 'result' | 'leaderboard' | 'practice' | 'editor' | 'necropolis' | 'howto';

export type Session = {
  mode: 'scored' | 'practice';
  title: string;
  practiceKind?: PracticeKind;
  state: RunState;
  budget: number;
  bones: number;
  entrance: number;
  tombstonesAtStart: number;
  /** Practice only: the layout is known locally. */
  layout: Layout | null;
  curseDrain: number;
  result: RunResult | null;
  lastEvents: RunEvent[];
};

export type GameController = ReturnType<typeof useGame>;

function errorText(e: unknown): string {
  return e instanceof ApiFailure || e instanceof Error ? e.message : 'Something stirred in the dark.';
}

function practiceResult(s: Session, state: RunState): RunResult {
  const score = scoreRun({ status: state.status, oilLeft: state.oil, bonesLeft: state.bonesLeft, flareUsed: state.flareUsed, cursed: state.cursed, tombstonesAtStart: 0 });
  return {
    status: state.status,
    score,
    rank: null,
    streak: { play: 0, escape: 0, best: 0 },
    gravesPassed: 0,
    share: shareText({
      cryptNumber: 0,
      weekdayShort: s.title,
      status: state.status,
      ...(state.deathCause ? { deathCause: state.deathCause } : {}),
      score: score.final,
      oilLeft: state.oil,
      bonesLeft: state.bonesLeft,
      gravesPassed: 0,
      streak: 0,
      practice: true,
    }).replace('Crypt #0 · ', ''),
    tombId: null,
    epitaphCarved: false,
  };
}

export function useGame() {
  const [init, setInit] = useState<InitResponse | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [screen, setScreen] = useState<Screen>('home');
  const [session, setSession] = useState<Session | null>(null);
  const [tombs, setTombs] = useState<PublicTomb[]>([]);
  const [stats, setStats] = useState<CryptStats | null>(null);
  const [reveal, setReveal] = useState<RevealResponse | null>(null);
  const [live, setLive] = useState('');
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const myTomb = useRef<string | null>(null);

  const today: TodayResponse | null = init?.kind === 'crypt' ? init : null;

  const toast = useCallback((text: string) => {
    setNotice(text);
    try {
      showToast(text);
    } catch {
      /* outside Reddit (local preview) */
    }
  }, []);

  const applyInit = useCallback((r: InitResponse) => {
    setInit(r);
    setLoadError(null);
    if (r.kind === 'crypt') {
      setTombs(r.tombs);
      setStats(r.stats);
      if (r.run) {
        myTomb.current = r.run.result?.tombId ?? null;
        setSession({
          mode: 'scored',
          title: r.crypt.name,
          state: r.run.state,
          budget: r.crypt.oil,
          bones: r.crypt.bones,
          entrance: r.run.state.knowledge.visited[0] ?? r.run.state.pos,
          tombstonesAtStart: r.run.tombstonesAtStart,
          layout: null,
          curseDrain: r.crypt.curseDrain,
          result: r.run.result,
          lastEvents: [],
        });
      }
    }
    if (r.kind === 'necropolis') setScreen('necropolis');
  }, []);

  const refresh = useCallback(async () => {
    try {
      applyInit(await api.today());
    } catch (e) {
      setLoadError(errorText(e));
    }
  }, [applyInit]);

  useEffect(() => {
    api.today().then(applyInit, (e: unknown) => setLoadError(errorText(e)));
  }, [applyInit]);

  useRealtime(today?.crypt.isToday ? cryptChannel(today.crypt.dayId) : null, (m: RealtimeMessage) => {
    if (m.t === 'tomb') {
      setTombs((prev) => {
        const isNew = !prev.some((t) => t.id === m.tomb.id);
        if (isNew && m.tomb.id !== myTomb.current) toast(deathToast(m.tomb));
        return isNew ? [...prev, m.tomb] : prev.map((t) => (t.id === m.tomb.id ? m.tomb : t));
      });
    } else if (m.t === 'stats') {
      setStats(m.stats);
    } else if (m.t === 'escape') {
      toast(`u/${m.name} escaped with the relic · ${m.score.toLocaleString('en-US')} pts`);
    }
  });

  /** Opens today's scored run (creating it on the server the first time). */
  const descend = useCallback(async () => {
    if (!today) return;
    if (session?.mode === 'scored') {
      setScreen(session.state.status === 'active' ? 'play' : session.result?.status === 'died' && !session.result.epitaphCarved ? 'death' : 'result');
      return;
    }
    if (!today.crypt.isToday) {
      setScreen('practice');
      return;
    }
    setBusy(true);
    try {
      const r = await api.start();
      setSession({
        mode: 'scored',
        title: today.crypt.name,
        state: r.run.state,
        budget: today.crypt.oil,
        bones: today.crypt.bones,
        entrance: r.run.state.pos,
        tombstonesAtStart: r.run.tombstonesAtStart,
        layout: null,
        curseDrain: today.crypt.curseDrain,
        result: r.run.result,
        lastEvents: [],
      });
      setLive(announce(r.run.state.pos, r.run.state.knowledge.omens[r.run.state.pos]));
      setScreen('play');
    } catch (e) {
      toast(errorText(e));
    } finally {
      setBusy(false);
    }
  }, [today, session, toast]);

  const afterAction = useCallback((s: Session, state: RunState, events: RunEvent[], result: RunResult | null) => {
    const next: Session = { ...s, state, lastEvents: events, result: result ?? s.result };
    setSession(next);
    for (const ev of events) {
      if (ev.t === 'moved') setLive(announce(ev.to, ev.omens));
      if (ev.t === 'cursed') setLive(`A curse drains ${ev.drained} oil.`);
      if (ev.t === 'relic') setLive('You hold the relic. Return to the entrance.');
      if (ev.t === 'bone') setLive(ev.result === 'long-fall' ? 'A long fall. A pit.' : ev.result === 'shriek' ? 'A shriek. A curse.' : 'A clatter. Safe.');
      if (ev.t === 'flare') setLive('The flare reveals the rooms around you.');
    }
    if (state.status === 'died') {
      if (result?.tombId) myTomb.current = result.tombId;
      setLive(state.deathCause === 'fell' ? 'You fell into a pit.' : state.deathCause === 'cursed' ? 'The curse took the last of your oil.' : 'Your lantern went out. The dark takes you.');
      setScreen(s.mode === 'scored' ? 'death' : 'result');
    } else if (state.status !== 'active') {
      setScreen('result');
    }
  }, []);

  /** Applies a move, bone, flare or retreat. */
  const act = useCallback(
    async (action: Action) => {
      if (!session || session.state.status !== 'active' || busy) return;
      if (session.mode === 'practice' && session.layout) {
        const r = applyAction(session.layout, session.state, action, session.curseDrain);
        if (!r.ok) {
          toast(r.error);
          return;
        }
        afterAction(session, r.state, r.events, r.state.status === 'active' ? null : practiceResult(session, r.state));
        return;
      }
      setBusy(true);
      try {
        const r = await api.act(action);
        afterAction(session, r.state, r.events, r.result);
      } catch (e) {
        toast(errorText(e));
      } finally {
        setBusy(false);
      }
    },
    [session, busy, toast, afterAction],
  );

  /** Carves the epitaph after a death (scored runs only). */
  const carve = useCallback(
    async (text: string, anonymous: boolean): Promise<string | null> => {
      try {
        const r = await api.epitaph(text, anonymous);
        setTombs((prev) => (prev.some((t) => t.id === r.tomb.id) ? prev.map((t) => (t.id === r.tomb.id ? r.tomb : t)) : [...prev, r.tomb]));
        setSession((s) => (s && s.result ? { ...s, result: { ...s.result, epitaphCarved: true } } : s));
        setScreen('reveal');
        return null;
      } catch (e) {
        return errorText(e);
      }
    },
    [],
  );

  /** Loads the full map (server for scored runs; local for practice). */
  const openReveal = useCallback(async () => {
    if (session?.mode === 'practice' && session.layout) {
      const sol = solve(session.layout, { bones: session.bones });
      setReveal({ type: 'reveal', layout: session.layout, tombs: [], votable: [], solverPath: sol.path.map((c) => idx(c)) });
      setScreen('reveal');
      return;
    }
    try {
      setReveal(await api.reveal());
      setScreen('reveal');
    } catch (e) {
      toast(errorText(e));
    }
  }, [session, toast]);

  const vote = useCallback(
    async (tombId: string, v: VoteType) => {
      try {
        const r = await api.vote(tombId, v);
        setReveal((prev) =>
          prev
            ? {
                ...prev,
                votable: prev.votable.map((x) => (x.tombId === tombId ? { ...x, vote: v } : x)),
                tombs: prev.tombs.map((t) => (t.id === tombId ? { ...t, votes: r.votes } : t)),
              }
            : prev,
        );
      } catch (e) {
        toast(errorText(e));
      }
    },
    [toast],
  );

  const report = useCallback(
    async (tombId: string) => {
      try {
        await api.report(tombId);
        toast('Reported. Thank you, keeper.');
      } catch (e) {
        toast(errorText(e));
      }
    },
    [toast],
  );

  /** Copies the spoiler-free share text. */
  const copyShare = useCallback(async () => {
    const text = session?.result?.share;
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
      toast('Copied to your clipboard.');
    } catch {
      toast('Could not copy. Select the text instead.');
    }
  }, [session, toast]);

  /** Explicit "Share to comments" button: posts as the user. Never called automatically. */
  const shareToComments = useCallback(
    async (includeEpitaph: boolean) => {
      try {
        await api.share(includeEpitaph);
        toast('Your result is carved into the comments.');
      } catch (e) {
        toast(errorText(e));
      }
    },
    [toast],
  );

  /** Explicit "Subscribe" button. */
  const subscribe = useCallback(async () => {
    try {
      await api.subscribe();
      toast('You will find tomorrow’s crypt in your feed.');
    } catch (e) {
      toast(errorText(e));
    }
  }, [toast]);

  const setQuiet = useCallback(
    async (quiet: boolean) => {
      try {
        await api.prefs(quiet);
        setInit((prev) => (prev ? { ...prev, viewer: { ...prev.viewer, quiet } } : prev));
      } catch (e) {
        toast(errorText(e));
      }
    },
    [toast],
  );

  /** Starts a practice run (no score): yesterday, the tutorial, a random crypt, or this closed crypt. */
  const startPractice = useCallback(
    async (kind: PracticeKind) => {
      setBusy(true);
      try {
        const p = await api.practice(kind, kind === 'random' ? Math.floor(Math.random() * 1e9) : undefined);
        const state = startRun(p.layout, { oil: p.oil, bones: p.bones, curseDrain: p.curseDrain });
        setSession({
          mode: 'practice',
          title: p.title,
          practiceKind: kind,
          state,
          budget: p.oil,
          bones: p.bones,
          entrance: p.layout.entrance,
          tombstonesAtStart: 0,
          layout: p.layout,
          curseDrain: p.curseDrain,
          result: null,
          lastEvents: [],
        });
        setReveal(null);
        setLive(announce(state.pos, state.knowledge.omens[state.pos]));
        setScreen('play');
      } catch (e) {
        toast(errorText(e));
      } finally {
        setBusy(false);
      }
    },
    [toast],
  );

  /** Leaves practice and returns to today's scored run (if any). */
  const backToToday = useCallback(async () => {
    setSession(null);
    setReveal(null);
    setScreen('home');
    await refresh();
  }, [refresh]);

  return {
    init,
    today,
    loadError,
    screen,
    go: setScreen,
    session,
    tombs,
    stats,
    reveal,
    live,
    busy,
    notice,
    refresh,
    descend,
    act,
    carve,
    openReveal,
    vote,
    report,
    copyShare,
    shareToComments,
    subscribe,
    setQuiet,
    startPractice,
    backToToday,
  };
}
