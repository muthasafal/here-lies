import { describe, expect, it } from 'vitest';
import type { PublicTomb } from '../../shared/api';
import { deathToast } from '../../shared/api';
import { idx } from '../../shared/core/layout';
import { applyAction, startRun } from '../../shared/core/rules';
import { TUTORIAL_CONFIG, TUTORIAL_LAYOUT } from '../../shared/core/tutorial';
import { announce, buildGrid, moundOrder, oilFraction } from './view-model';

const tomb = (id: string, cell: number, t: number, ts: number): PublicTomb => ({
  id,
  cell,
  name: id === 'a' ? null : `n${id}`,
  avatar: null,
  epitaph: 'x',
  cause: 'fell',
  ts,
  removed: false,
  votes: { true: t, false: 0, funny: 0 },
});

describe('view-model', () => {
  it('lights visited rooms and neighbours, marks adjacency and bone targets, hides contents mid-run', () => {
    const s = startRun(TUTORIAL_LAYOUT, TUTORIAL_CONFIG);
    const g = buildGrid({ state: s, entrance: TUTORIAL_LAYOUT.entrance, tombs: [tomb('b', idx({ x: 0, y: 0 }), 0, 1)] });
    const here = g.cells[TUTORIAL_LAYOUT.entrance];
    expect(here?.isCurrent).toBe(true);
    expect(here?.ariaLabel).toMatch(/^D7, entrance, you are here/);
    expect(g.cells.filter((c) => c.adjacent)).toHaveLength(3);
    expect(g.cells.filter((c) => c.canBone)).toHaveLength(3);
    expect(g.cells.filter((c) => c.lit)).toHaveLength(4);
    expect(g.cells.every((c) => c.content === null)).toBe(true);
    expect(g.cells[0]?.tombs).toHaveLength(1);
  });
  it('shows contents only when a layout is passed (reveal)', () => {
    let s = startRun(TUTORIAL_LAYOUT, TUTORIAL_CONFIG);
    s = applyAction(TUTORIAL_LAYOUT, s, { type: 'retreat' }).state;
    const g = buildGrid({ state: s, entrance: TUTORIAL_LAYOUT.entrance, tombs: [], layout: TUTORIAL_LAYOUT });
    expect(g.cells[TUTORIAL_LAYOUT.relic]?.content).toBe('relic');
    expect(g.cells.filter((c) => c.adjacent)).toHaveLength(0);
  });
  it('orders mounds by true votes then recency; formats toasts and announcements', () => {
    expect(moundOrder([tomb('a', 1, 0, 5), tomb('b', 1, 3, 1), tomb('c', 1, 0, 9)]).map((t) => t.id)).toEqual(['b', 'c', 'a']);
    expect(deathToast(tomb('a', idx({ x: 2, y: 3 }), 0, 0))).toBe('A nameless soul fell at C4');
    expect(deathToast(tomb('b', idx({ x: 2, y: 3 }), 0, 0))).toBe('u/nb fell at C4');
    expect(announce(idx({ x: 2, y: 3 }), { coldDraft: 1, whispers: 0, faintGlow: true })).toBe('Room C4. Cold draft, 1. Faint glow.');
    expect(oilFraction(5, 20)).toBe(0.25);
  });
});
