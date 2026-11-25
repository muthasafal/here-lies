/**
 * Unit tests: scoring formula, share text, epitaph filter, streaks across UTC days, rules edge cases.
 */
import { describe, expect, it } from 'vitest';
import { scoreRun } from './scoring.js';
import { shareText } from './share.js';
import { checkEpitaph, DEFAULT_EPITAPH } from './epitaph-filter.js';
import { EMPTY_STREAK, currentStreak, updateStreak } from './streaks.js';
import { addDays, cryptNumber, isoWeek, weekdayOf } from './day.js';
import { applyAction, startRun } from './rules.js';
import type { Layout } from './layout.js';
import { cellLabel, describeOmens, idx } from './layout.js';
import { deduce, EMPTY, PIT, unknownDomains } from './knowledge.js';
import { TUTORIAL_CONFIG, TUTORIAL_LAYOUT } from './tutorial.js';
import { solve } from './solver.js';
import { postTitle } from './crypt-names.js';

const L: Layout = { entrance: idx({ x: 3, y: 6 }), relic: idx({ x: 3, y: 3 }), pits: [idx({ x: 4, y: 4 })], curses: [idx({ x: 2, y: 4 })] };

describe('scoring', () => {
  it('matches the BRIEF 4.8 formula', () => {
    const s = scoreRun({ status: 'escaped', oilLeft: 6, bonesLeft: 1, flareUsed: false, cursed: false, tombstonesAtStart: 0 });
    expect(s.raw).toBe(1000 + 120 + 60 + 150);
    expect(s.multiplier).toBe(2);
    expect(s.final).toBe(2660);
    expect(scoreRun({ status: 'retreated', oilLeft: 9, bonesLeft: 2, flareUsed: false, cursed: false, tombstonesAtStart: 0 }).final).toBe(150);
    expect(scoreRun({ status: 'died', oilLeft: 9, bonesLeft: 2, flareUsed: false, cursed: false, tombstonesAtStart: 0 }).final).toBe(0);
    expect(scoreRun({ status: 'escaped', oilLeft: 0, bonesLeft: 0, flareUsed: true, cursed: true, tombstonesAtStart: 8 }).final).toBe(Math.round(800 * (1 + Math.exp(-1))));
  });
});

describe('share text', () => {
  it('follows the BRIEF 5 format', () => {
    expect(
      shareText({ cryptNumber: 42, weekdayShort: 'Thu', status: 'escaped', score: 1840, oilLeft: 6, bonesLeft: 1, gravesPassed: 9, streak: 4 }),
    ).toBe('Here Lies · Crypt #42 · Thu\n🕯️ escaped with the relic · 1,840 pts\noil 6 left · bones 1 · ⚰️ passed 9 graves\n🔥 streak 4');
  });
});

describe('epitaph filter', () => {
  it('defaults, trims, limits and blocks', () => {
    expect(checkEpitaph('   ')).toEqual({ ok: true, text: DEFAULT_EPITAPH });
    expect(checkEpitaph('  pit   east of the glow ')).toEqual({ ok: true, text: 'pit east of the glow' });
    expect(checkEpitaph('x'.repeat(61)).ok).toBe(false);
    expect(checkEpitaph('visit www.example.com').ok).toBe(false);
    expect(checkEpitaph('ask u/someone').ok).toBe(false);
    expect(checkEpitaph('k y s').ok).toBe(false);
  });
});

describe('streaks across UTC days', () => {
  it('counts consecutive escapes, keeps play streak through deaths, resets on gaps', () => {
    let s = updateStreak(EMPTY_STREAK, '2026-12-01', true);
    s = updateStreak(s, '2026-12-02', true);
    expect(s).toMatchObject({ play: 2, escape: 2, best: 2 });
    s = updateStreak(s, '2026-12-02', false);
    expect(s.escape).toBe(2);
    s = updateStreak(s, '2026-12-03', false);
    expect(s).toMatchObject({ play: 3, escape: 0, best: 2 });
    s = updateStreak(s, '2026-12-05', true);
    expect(s).toMatchObject({ play: 1, escape: 1 });
    expect(currentStreak(s, '2026-12-07').play).toBe(0);
  });
  it('day helpers', () => {
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01');
    expect(weekdayOf('2026-11-26')).toBe(4);
    expect(isoWeek('2026-11-26')).toBe('2026-W48');
    expect(cryptNumber('2026-11-25')).toBe(1);
    expect(postTitle(3, 'Friday', 'The Hollow Vault')).toBe('Crypt #3 · Friday · The Hollow Vault');
  });
});

describe('rules', () => {
  it('curse drains once, pit kills, relic then entrance escapes', () => {
    let s = startRun(L, { oil: 20, bones: 1 });
    let r = applyAction(L, s, { type: 'move', dir: 'north' });
    expect(r.ok && r.state.oil).toBe(19);
    s = r.state;
    r = applyAction(L, s, { type: 'bone', target: idx({ x: 3, y: 3 }) });
    expect(r.ok).toBe(false);
    r = applyAction(L, s, { type: 'bone', target: idx({ x: 3, y: 4 }) });
    expect(r.ok && r.events[0]).toEqual({ t: 'bone', target: idx({ x: 3, y: 4 }), result: 'clatter' });
    s = r.state;
    s = applyAction(L, s, { type: 'move', dir: 'north' }).state;
    s = applyAction(L, s, { type: 'move', dir: 'west' }).state;
    expect(s.cursed).toBe(true);
    expect(s.oil).toBe(20 - 3 - 5);
    s = applyAction(L, s, { type: 'move', dir: 'east' }).state;
    s = applyAction(L, s, { type: 'move', dir: 'north' }).state;
    expect(s.hasRelic).toBe(true);
    s = applyAction(L, s, { type: 'move', dir: 'south' }).state;
    s = applyAction(L, s, { type: 'move', dir: 'south' }).state;
    s = applyAction(L, s, { type: 'move', dir: 'south' }).state;
    expect(s.status).toBe('escaped');
  });
  it('pit kills and records the death cell; stranding at 0 oil', () => {
    const s = startRun(L, { oil: 20, bones: 1 });
    const up2 = applyAction(L, applyAction(L, s, { type: 'move', dir: 'north' }).state, { type: 'move', dir: 'north' }).state;
    const a = applyAction(L, up2, { type: 'move', dir: 'east' });
    expect(a.ok && a.state.status).toBe('died');
    expect(a.state.deathCause).toBe('fell');
    expect(a.state.deathCell).toBe(idx({ x: 4, y: 4 }));
    const b = applyAction(L, startRun(L, { oil: 1, bones: 0 }), { type: 'move', dir: 'west' });
    expect(b.state.deathCause).toBe('stranded');
  });
  it('retreat only at the entrance', () => {
    const s = startRun(L, { oil: 20, bones: 1 });
    expect(applyAction(L, s, { type: 'retreat' }).state.status).toBe('retreated');
    expect(applyAction(L, applyAction(L, s, { type: 'move', dir: 'north' }).state, { type: 'retreat' }).ok).toBe(false);
  });
});

describe('knowledge and tutorial', () => {
  it('deduces a lone pit from a 1-draft corner', () => {
    const d = unknownDomains();
    // cell 0 (A1) has neighbours 1 and 7; 7 is known safe, draft 1 -> 1 is a pit
    d[7] = EMPTY;
    const r = deduce(d, [{ cell: 0, draft: 1, whispers: 0 }]);
    expect(r.domains[1]).toBe(PIT);
    expect(r.nonObvious).toContain(1);
  });
  it('labels and omen text', () => {
    expect(cellLabel(idx({ x: 2, y: 3 }))).toBe('C4');
    expect(describeOmens({ coldDraft: 1, whispers: 0, faintGlow: true })).toBe('Cold draft, 1. Faint glow.');
    expect(describeOmens({ coldDraft: 0, whispers: 0, faintGlow: false })).toBe('Silence.');
  });
  it('tutorial crypt is fair with its oil', () => {
    const r = solve(TUTORIAL_LAYOUT, { bones: TUTORIAL_CONFIG.bones });
    expect(r.solvable).toBe(true);
    expect(r.oilNeeded).toBeLessThanOrEqual(TUTORIAL_CONFIG.oil);
  });
});
