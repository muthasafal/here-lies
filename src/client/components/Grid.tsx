/**
 * PLACEHOLDER (unstyled). The crypt grid as a table of buttons. Kiro's game-client spec replaces
 * the visuals; keep the props. All state comes from lib/view-model.ts.
 */

import type { GridView } from '../lib/view-model';

export type GridProps = {
  grid: GridView;
  onCell?: (index: number) => void;
  /** Which cells accept a tap right now. */
  isActive?: (index: number) => boolean;
  caption: string;
};

function glyphs(c: GridView['cells'][number]): string {
  const out: string[] = [];
  if (c.isCurrent) out.push('YOU');
  if (c.isEntrance) out.push('door');
  if (c.content === 'pit') out.push('PIT');
  if (c.content === 'curse') out.push('CURSE');
  if (c.content === 'relic') out.push('RELIC');
  if (c.omens) {
    if (c.omens.coldDraft) out.push(`draft ${c.omens.coldDraft}`);
    if (c.omens.whispers) out.push(`whisper ${c.omens.whispers}`);
    if (c.omens.faintGlow) out.push('glow');
    if (!c.omens.coldDraft && !c.omens.whispers && !c.omens.faintGlow) out.push('silence');
  }
  if (c.bone) out.push(c.bone);
  if (c.tombs.length) out.push(`✝${c.tombs.length}`);
  return out.join(' · ') || (c.lit ? '·' : '');
}

export const Grid = ({ grid, onCell, isActive, caption }: GridProps) => (
  <table>
    <caption>{caption}</caption>
    <tbody>
      {Array.from({ length: grid.size }, (_, y) => (
        <tr key={y}>
          {grid.cells
            .filter((c) => c.y === y)
            .map((c) => (
              <td key={c.index}>
                <button type="button" aria-label={c.ariaLabel} disabled={!(isActive?.(c.index) ?? false)} onClick={() => onCell?.(c.index)}>
                  {c.label} {glyphs(c)}
                </button>
              </td>
            ))}
        </tr>
      ))}
    </tbody>
  </table>
);
