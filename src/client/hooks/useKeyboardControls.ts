/**
 * Arrow keys and WASD move; B arms a bone throw; F fires the flare; R retreats at the entrance
 * (BRIEF 7.6, 7.8 full keyboard play). Ignores keys typed into inputs.
 */

import { useEffect } from 'react';
import type { Direction } from '../../shared/core/types';

export type KeyHandlers = {
  move: (dir: Direction) => void;
  bone?: () => void;
  flare?: () => void;
  retreat?: () => void;
};

const KEYS: Record<string, Direction> = {
  ArrowUp: 'north',
  ArrowDown: 'south',
  ArrowLeft: 'west',
  ArrowRight: 'east',
  w: 'north',
  s: 'south',
  a: 'west',
  d: 'east',
};

export function useKeyboardControls(enabled: boolean, h: KeyHandlers): void {
  useEffect(() => {
    if (!enabled) return;
    const onKey = (e: KeyboardEvent) => {
      const target = e.target;
      if (target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement) return;
      const dir = KEYS[e.key] ?? KEYS[e.key.toLowerCase()];
      if (dir) {
        e.preventDefault();
        h.move(dir);
      } else if (e.key.toLowerCase() === 'b') h.bone?.();
      else if (e.key.toLowerCase() === 'f') h.flare?.();
      else if (e.key.toLowerCase() === 'r') h.retreat?.();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [enabled, h]);
}
