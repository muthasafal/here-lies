/**
 * Community Crypt editor state (BRIEF 5): place the entrance, relic, pits and curses, name it,
 * and see the reference solver's verdict live. Submitting re-validates on the server.
 */

import { useCallback, useMemo, useState } from 'react';
import type { Layout } from '../../shared/core/layout';
import { idx } from '../../shared/core/layout';
import { validateDesign } from '../../shared/core/editor-validate';
import { GRID_SIZE } from '../../shared/core/types';
import { api } from '../lib/api';

export type EditorTool = 'entrance' | 'relic' | 'pit' | 'curse' | 'erase';

const START: Layout = { entrance: idx({ x: 3, y: GRID_SIZE - 1 }), relic: idx({ x: 3, y: 1 }), pits: [], curses: [] };

export function useEditor() {
  const [layout, setLayout] = useState<Layout>(START);
  const [name, setName] = useState('');
  const [tool, setTool] = useState<EditorTool>('pit');
  const [submitting, setSubmitting] = useState(false);
  const [serverProblems, setServerProblems] = useState<string[] | null>(null);
  const [submitted, setSubmitted] = useState(false);

  const verdict = useMemo(() => validateDesign(layout, name.trim().length >= 3 ? name : 'Untitled'), [layout, name]);

  /** Applies the current tool to a cell. */
  const paint = useCallback(
    (cell: number) => {
      setServerProblems(null);
      setLayout((l) => {
        const clear = (x: Layout): Layout => ({ ...x, pits: x.pits.filter((c) => c !== cell), curses: x.curses.filter((c) => c !== cell) });
        if (tool === 'entrance') return Math.floor(cell / GRID_SIZE) === GRID_SIZE - 1 ? { ...clear(l), entrance: cell } : l;
        if (tool === 'relic') return cell === l.entrance ? l : { ...clear(l), relic: cell };
        if (cell === l.entrance || cell === l.relic) return l;
        if (tool === 'erase') return clear(l);
        if (tool === 'pit') return l.pits.includes(cell) ? clear(l) : { ...clear(l), pits: [...clear(l).pits, cell] };
        return l.curses.includes(cell) ? clear(l) : { ...clear(l), curses: [...clear(l).curses, cell] };
      });
    },
    [tool],
  );

  const submit = useCallback(async () => {
    setSubmitting(true);
    try {
      const r = await api.submitCrypt(layout, name);
      setServerProblems(r.problems);
      setSubmitted(r.ok);
    } catch (e) {
      setServerProblems([e instanceof Error ? e.message : 'Could not submit.']);
    } finally {
      setSubmitting(false);
    }
  }, [layout, name]);

  const reset = useCallback(() => {
    setLayout(START);
    setName('');
    setSubmitted(false);
    setServerProblems(null);
  }, []);

  return { layout, name, setName, tool, setTool, paint, verdict, submit, submitting, serverProblems, submitted, reset };
}
