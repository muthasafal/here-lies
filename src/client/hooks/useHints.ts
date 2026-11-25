/**
 * First-run contextual hints, one at a time (BRIEF 7.6 screen 8). Seen hints are remembered in
 * localStorage when available (it resets on app update, which is fine for hints).
 */

import { useCallback, useMemo, useState } from 'react';
import type { RunState } from '../../shared/core/rules';
import type { HintId } from '../../shared/core/tutorial';
import { HINTS, nextHint } from '../../shared/core/tutorial';

const KEY = 'here-lies:hints-seen';

function load(): HintId[] {
  try {
    const raw = localStorage.getItem(KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.filter((x): x is HintId => typeof x === 'string' && x in HINTS) : [];
  } catch {
    return [];
  }
}

export function useHints(state: RunState | null, tombstonesVisible: boolean) {
  const [seen, setSeen] = useState<HintId[]>(load);
  const omens = state ? state.knowledge.omens[state.pos] : undefined;
  const hint = useMemo(() => (state && state.status === 'active' ? nextHint(state, omens, seen, tombstonesVisible) : null), [state, omens, seen, tombstonesVisible]);
  const dismiss = useCallback(() => {
    if (!hint) return;
    const next = [...seen, hint];
    setSeen(next);
    try {
      localStorage.setItem(KEY, JSON.stringify(next));
    } catch {
      /* storage unavailable */
    }
  }, [hint, seen]);
  const reset = useCallback(() => {
    setSeen([]);
    try {
      localStorage.removeItem(KEY);
    } catch {
      /* storage unavailable */
    }
  }, []);
  return { hint, text: hint ? HINTS[hint] : null, dismiss, reset };
}
