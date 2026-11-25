/**
 * PLACEHOLDER SCREENS (unstyled, functional). Written by Claude Code only to make the game
 * playable end to end while Kiro had no credits. Kiro's game-client spec designs the real
 * screens (layout, art, copy, motion) and replaces this file; the controller API they use
 * (hooks/useGame.ts, hooks/useEditor.ts, lib/view-model.ts) stays.
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import type { LeaderboardResponse, NecropolisResponse } from '../../shared/api';
import { EPITAPH_MAX, EPITAPH_SUGGESTIONS } from '../../shared/core/epitaph-filter';
import { startRun } from '../../shared/core/rules';
import type { Direction } from '../../shared/core/types';
import { Grid } from '../components/Grid';
import type { GameController } from '../hooks/useGame';
import { useEditor } from '../hooks/useEditor';
import type { EditorTool } from '../hooks/useEditor';
import { useHints } from '../hooks/useHints';
import { useKeyboardControls } from '../hooks/useKeyboardControls';
import { api } from '../lib/api';
import { buildGrid, moundOrder, oilFraction } from '../lib/view-model';

type P = { g: GameController };

export const Home = ({ g }: P) => {
  const t = g.today;
  if (!t) return <p>{g.init?.kind === 'none' ? 'No crypt is attached to this post.' : 'Lighting the lantern…'}</p>;
  const s = g.stats ?? t.stats;
  return (
    <section>
      <h1>
        Crypt #{t.crypt.number} · {t.crypt.weekday} · {t.crypt.name}
      </h1>
      <p>Difficulty: {'🕯'.repeat(t.crypt.candles)} ({t.crypt.pits} pits, {t.crypt.curses} curses, {t.crypt.bones} bones, {t.crypt.oil} oil)</p>
      {t.crypt.designer && <p>A community crypt by u/{t.crypt.designer}</p>}
      <p>
        {s.entered} entered, {s.fell + s.cursed + s.stranded} fell, {s.escaped} escaped
      </p>
      {t.streak.escape > 0 && <p>Your streak: {t.streak.escape}</p>}
      {t.final && (
        <p>
          This crypt is closed. First to escape: {t.final.firstEscape ?? 'no one'}.
          {t.final.fittingEpitaph && ` Most fitting epitaph: “${t.final.fittingEpitaph.epitaph}”`}
        </p>
      )}
      {!t.viewer.loggedIn && t.crypt.isToday && <p>Sign in to play the daily crypt. You can still practice.</p>}
      <button type="button" disabled={g.busy || (!t.viewer.loggedIn && t.crypt.isToday)} onClick={() => void g.descend()}>
        {g.session?.mode === 'scored' ? (g.session.state.status === 'active' ? 'Continue' : 'See your result') : t.crypt.isToday ? 'Descend' : 'Practice this crypt'}
      </button>
      <nav>
        <button type="button" onClick={() => g.go('practice')}>Practice</button>
        <button type="button" onClick={() => g.go('leaderboard')}>Leaderboards</button>
        <button type="button" onClick={() => g.go('editor')}>Design a crypt</button>
        <button type="button" onClick={() => g.go('howto')}>How to play</button>
      </nav>
    </section>
  );
};

export const Play = ({ g }: P) => {
  const s = g.session;
  const [boneMode, setBoneMode] = useState(false);
  const tombs = useMemo(() => (s?.mode === 'scored' ? g.tombs : []), [s?.mode, g.tombs]);
  const hints = useHints(s?.state ?? null, tombs.length > 0);
  const grid = useMemo(() => (s ? buildGrid({ state: s.state, entrance: s.entrance, tombs }) : null), [s, tombs]);
  const move = useCallback((dir: Direction) => void g.act({ type: 'move', dir }), [g]);
  const handlers = useMemo(
    () => ({ move, bone: () => setBoneMode((b) => !b), flare: () => void g.act({ type: 'flare' }), retreat: () => void g.act({ type: 'retreat' }) }),
    [move, g],
  );
  useKeyboardControls(s?.state.status === 'active', handlers);
  if (!s || !grid) return null;
  const st = s.state;
  const here = st.knowledge.omens[st.pos];
  return (
    <section>
      <h2>{s.mode === 'practice' ? `Practice: ${s.title}` : s.title}</h2>
      <p>
        Oil {st.oil}/{s.budget} ({Math.round(oilFraction(st.oil, s.budget) * 100)}%) · Bones {st.bonesLeft} · Flare {st.flareUsed ? 'spent' : 'ready'}
        {st.cursed ? ' · cursed' : ''}
        {st.hasRelic ? ' · carrying the relic' : ''}
      </p>
      {here && (
        <p>
          Here: {here.coldDraft ? `cold draft (${here.coldDraft}) ` : ''}
          {here.whispers ? `whispers (${here.whispers}) ` : ''}
          {here.faintGlow ? 'faint glow ' : ''}
          {!here.coldDraft && !here.whispers && !here.faintGlow ? 'silence' : ''}
        </p>
      )}
      {hints.text && (
        <p role="note">
          {hints.text} <button type="button" onClick={hints.dismiss}>Got it</button>
        </p>
      )}
      <Grid
        grid={grid}
        caption={boneMode ? 'Choose an unvisited room next to you to throw a bone into' : 'Tap a room next to you to move'}
        isActive={(i) => (boneMode ? (grid.cells[i]?.canBone ?? false) : (grid.cells[i]?.adjacent ?? false))}
        onCell={(i) => {
          if (boneMode) {
            setBoneMode(false);
            void g.act({ type: 'bone', target: i });
          } else void g.act({ type: 'step', to: i });
        }}
      />
      <button type="button" disabled={st.bonesLeft === 0} onClick={() => setBoneMode((b) => !b)}>
        {boneMode ? 'Cancel bone' : `Throw a bone (${st.bonesLeft})`}
      </button>
      <button type="button" disabled={st.flareUsed || st.oil < 2} onClick={() => void g.act({ type: 'flare' })}>
        Light the flare (2 oil)
      </button>
      <button type="button" disabled={st.pos !== s.entrance} onClick={() => void g.act({ type: 'retreat' })}>
        {st.hasRelic ? 'Escape' : 'Retreat (150 pts)'}
      </button>
      {s.mode === 'practice' && <button type="button" onClick={() => void g.backToToday()}>Leave practice</button>}
    </section>
  );
};

export const Death = ({ g }: P) => {
  const [text, setText] = useState('');
  const [anon, setAnon] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const cause = g.session?.state.deathCause;
  return (
    <section>
      <h2>{cause === 'fell' ? 'You fell.' : cause === 'cursed' ? 'The curse took you.' : 'The dark took you.'}</h2>
      <p>Carve your epitaph. Everyone after you will read it. It may help them, or lie to them.</p>
      <label>
        Epitaph ({text.length}/{EPITAPH_MAX})
        <input value={text} maxLength={EPITAPH_MAX} onChange={(e) => setText(e.target.value)} placeholder="Here lies one who went east." />
      </label>
      <p>
        {EPITAPH_SUGGESTIONS.map((s) => (
          <button key={s} type="button" onClick={() => setText(s)}>
            {s}
          </button>
        ))}
      </p>
      <label>
        <input type="checkbox" checked={anon} onChange={(e) => setAnon(e.target.checked)} /> Carve it as a nameless soul
      </label>
      {err && <p role="alert">{err}</p>}
      <button type="button" onClick={() => void g.carve(text, anon).then(setErr)}>
        Carve it
      </button>
      <button type="button" onClick={() => void g.openReveal()}>
        Skip
      </button>
    </section>
  );
};

export const Reveal = ({ g }: P) => {
  const r = g.reveal;
  const s = g.session;
  useEffect(() => {
    if (!r) void g.openReveal();
  }, [r, g]);
  if (!r || !s) return <p>The map unfolds…</p>;
  const grid = buildGrid({ state: s.state, entrance: r.layout.entrance, tombs: r.tombs, layout: r.layout, solverPath: r.solverPath });
  return (
    <section>
      <h2>The crypt revealed</h2>
      <Grid grid={grid} caption="Full map. Rooms on the perfect path are marked in the room's label." />
      {r.votable.length > 0 && <h3>Judge the epitaphs you passed</h3>}
      <ul>
        {r.votable.map((v) => {
          const t = r.tombs.find((x) => x.id === v.tombId);
          if (!t) return null;
          return (
            <li key={v.tombId}>
              “{t.epitaph}” — {t.name ? `u/${t.name}` : 'a nameless soul'} ({t.cause})
              {v.vote ? (
                <span> You judged: {v.vote}</span>
              ) : (
                <>
                  <button type="button" onClick={() => void g.vote(v.tombId, 'true')}>True</button>
                  <button type="button" onClick={() => void g.vote(v.tombId, 'false')}>False</button>
                  <button type="button" onClick={() => void g.vote(v.tombId, 'funny')}>Just funny</button>
                </>
              )}
              <button type="button" onClick={() => void g.report(v.tombId)}>Report</button>
            </li>
          );
        })}
      </ul>
      <button type="button" onClick={() => g.go('result')}>See your result</button>
    </section>
  );
};

export const Result = ({ g }: P) => {
  const s = g.session;
  const r = s?.result;
  if (!s || !r) return null;
  return (
    <section>
      <h2>{r.status === 'escaped' ? 'You escaped with the relic' : r.status === 'retreated' ? 'You lived to tell' : 'Here you lie'}</h2>
      <p>
        Score {r.score.final.toLocaleString('en-US')} (raw {r.score.raw} × pioneer {r.score.multiplier.toFixed(2)})
        {r.rank ? ` · rank #${r.rank}` : ''}
      </p>
      {s.mode === 'scored' && (
        <p>
          Escape streak {r.streak.escape} · play streak {r.streak.play} · best {r.streak.best}
        </p>
      )}
      <pre>{r.share}</pre>
      <button type="button" onClick={() => void g.copyShare()}>Copy</button>
      {s.mode === 'scored' && (
        <>
          <button type="button" onClick={() => void g.shareToComments(false)}>Share to comments</button>
          {r.tombId && r.epitaphCarved && <button type="button" onClick={() => void g.shareToComments(true)}>Share with my epitaph</button>}
          <button type="button" onClick={() => void g.subscribe()}>Subscribe for tomorrow’s crypt</button>
        </>
      )}
      <button type="button" onClick={() => void g.openReveal()}>See the map</button>
      <button type="button" onClick={() => void g.startPractice('yesterday')}>Practice yesterday’s crypt</button>
      <button type="button" onClick={() => g.go('practice')}>More practice</button>
      <button type="button" onClick={() => g.go('leaderboard')}>Leaderboards</button>
      {s.mode === 'practice' && <button type="button" onClick={() => void g.backToToday()}>Back to today</button>}
      {s.mode === 'scored' && g.today?.viewer.loggedIn && (
        <label>
          <input type="checkbox" checked={g.today.viewer.quiet} onChange={(e) => void g.setQuiet(e.target.checked)} /> Quiet mode (no flair, no
          escape announcements)
        </label>
      )}
    </section>
  );
};

export const Leaderboards = ({ g }: P) => {
  const [scope, setScope] = useState<'day' | 'week'>('day');
  const [data, setData] = useState<LeaderboardResponse | null>(null);
  useEffect(() => {
    api.leaderboard(scope).then(setData, () => setData(null));
  }, [scope]);
  return (
    <section>
      <h2>Leaderboards</h2>
      <button type="button" aria-pressed={scope === 'day'} onClick={() => setScope('day')}>Today</button>
      <button type="button" aria-pressed={scope === 'week'} onClick={() => setScope('week')}>This week</button>
      <ol>
        {data?.entries.map((e) => (
          <li key={e.rank}>
            {e.name} · {e.score.toLocaleString('en-US')}
            {e.mine ? ' (you)' : ''}
          </li>
        ))}
      </ol>
      {data?.entries.length === 0 && <p>No one has escaped yet. Be the first.</p>}
      {data?.me && !data.entries.some((e) => e.mine) && <p>You: #{data.me.rank} · {data.me.score}</p>}
      <button type="button" onClick={() => g.go('home')}>Back</button>
    </section>
  );
};

export const Practice = ({ g }: P) => (
  <section>
    <h2>Practice (no score)</h2>
    <button type="button" onClick={() => void g.startPractice('tutorial')}>The Teaching Crypt (tutorial)</button>
    <button type="button" onClick={() => void g.startPractice('yesterday')}>Yesterday’s crypt</button>
    <button type="button" onClick={() => void g.startPractice('random')}>A wandering crypt</button>
    {g.today && !g.today.crypt.isToday && <button type="button" onClick={() => void g.startPractice('past')}>This crypt ({g.today.crypt.name})</button>}
    <button type="button" onClick={() => g.go('home')}>Back</button>
  </section>
);

const TOOLS: EditorTool[] = ['entrance', 'relic', 'pit', 'curse', 'erase'];

export const Editor = ({ g }: P) => {
  const e = useEditor();
  const state = useMemo(() => startRun(e.layout, { oil: 1, bones: 0 }), [e.layout]);
  const grid = useMemo(() => buildGrid({ state: { ...state, status: 'retreated' }, entrance: e.layout.entrance, tombs: [], layout: e.layout }), [state, e.layout]);
  return (
    <section>
      <h2>Design a Community Crypt</h2>
      <p>Place the entrance (bottom row), the relic, pits and curses. The solver checks fairness as you build.</p>
      {TOOLS.map((t) => (
        <button key={t} type="button" aria-pressed={e.tool === t} onClick={() => e.setTool(t)}>
          {t}
        </button>
      ))}
      <Grid grid={grid} caption="Your crypt" isActive={() => true} onCell={e.paint} />
      <label>
        Name <input value={e.name} maxLength={40} onChange={(ev) => e.setName(ev.target.value)} placeholder="The Weeping Vault" />
      </label>
      <p>
        {e.verdict.ok
          ? `Fair. A perfect player needs ${e.verdict.solver?.oilNeeded ?? 0} oil and ${e.verdict.solver?.inferenceSteps ?? 0} deductions.`
          : e.verdict.problems.join(' ')}
      </p>
      {e.serverProblems && e.serverProblems.length > 0 && <p role="alert">{e.serverProblems.join(' ')}</p>}
      {e.submitted ? (
        <p>Submitted. The moderators will judge it; approved crypts open on Fridays.</p>
      ) : (
        <button type="button" disabled={!e.verdict.ok || e.name.trim().length < 3 || e.submitting} onClick={() => void e.submit()}>
          Submit for a Friday
        </button>
      )}
      <button type="button" onClick={() => g.go('home')}>Back</button>
    </section>
  );
};

export const Necropolis = ({ g }: P) => {
  const [data, setData] = useState<NecropolisResponse | null>(null);
  useEffect(() => {
    api.necropolis(g.init?.kind === 'necropolis' ? g.init.week : undefined).then(setData, () => setData(null));
  }, [g.init]);
  if (!data) return <p>Gathering the week’s dead…</p>;
  return (
    <section>
      <h1>The Necropolis · {data.week}</h1>
      {data.days.map((d) => (
        <article key={d.dayId}>
          <h2>
            {d.crypt.weekday} · Crypt #{d.crypt.number} · {d.crypt.name}
          </h2>
          <p>
            {d.stats.entered} entered, {d.stats.escaped} escaped, {d.tombs.length} tombstones
          </p>
          <ul>
            {moundOrder(d.tombs)
              .slice(0, 12)
              .map((t) => (
                <li key={t.id}>
                  “{t.epitaph}” — {t.name ? `u/${t.name}` : 'a nameless soul'} ({t.votes?.true ?? 0} true)
                </li>
              ))}
          </ul>
        </article>
      ))}
      <h2>Week leaderboard</h2>
      <ol>
        {data.leaderboard.map((e) => (
          <li key={e.rank}>
            {e.name} · {e.score}
          </li>
        ))}
      </ol>
      <h2>Titles</h2>
      <p>Honest Ghosts: {data.titles.honest.join(', ') || 'none yet'}</p>
      <p>Tricksters: {data.titles.tricksters.join(', ') || 'none yet'}</p>
      <p>Poet of the Crypt: {data.titles.poet ?? 'none yet'}</p>
      <p>Architects: {data.titles.architects.join(', ') || 'none yet'}</p>
    </section>
  );
};

export const HowTo = ({ g }: P) => (
  <section>
    <h2>How to play</h2>
    <p>Find the relic and bring it back to the entrance before your lantern runs dry. Each step costs 1 oil.</p>
    <p>Cold draft: a pit is next to you (the number says how many). Whispers: a curse is next to you. Faint glow: the relic is within two rooms. Silence: every room next to you is safe.</p>
    <p>Bones test an unvisited room next to you for free. The flare reveals the omens of all 8 rooms around you for 2 oil.</p>
    <p>When you die, your tombstone and epitaph stay for everyone after you. Epitaphs can lie.</p>
    <p>Every crypt is solvable by deduction alone. No guessing is ever required.</p>
    <button type="button" onClick={() => void g.startPractice('tutorial')}>Try the Teaching Crypt</button>
    <button type="button" onClick={() => g.go('home')}>Back</button>
  </section>
);

/** Screen switch. */
export const ScreenRouter = ({ g }: P) => {
  if (g.loadError) return <p role="alert">{g.loadError}</p>;
  switch (g.screen) {
    case 'play':
      return <Play g={g} />;
    case 'death':
      return <Death g={g} />;
    case 'reveal':
      return <Reveal g={g} />;
    case 'result':
      return <Result g={g} />;
    case 'leaderboard':
      return <Leaderboards g={g} />;
    case 'practice':
      return <Practice g={g} />;
    case 'editor':
      return <Editor g={g} />;
    case 'necropolis':
      return <Necropolis g={g} />;
    case 'howto':
      return <HowTo g={g} />;
    default:
      return <Home g={g} />;
  }
};
