import './index.css';

import { requestExpandedMode } from '@devvit/web/client';
import { StrictMode, useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import type { InitResponse } from '../shared/api';

/**
 * Inline splash (BRIEF 7.6 screen 1). PLACEHOLDER visuals: Kiro's game-client spec designs it.
 * Data wiring (crypt name, number, weekday candles, live counts, streak) is final.
 */
export const Splash = () => {
  const [data, setData] = useState<InitResponse | null>(null);
  useEffect(() => {
    fetch('/api/today')
      .then((r) => r.json())
      .then((d: InitResponse) => setData(d))
      .catch(() => setData(null));
  }, []);
  const crypt = data?.kind === 'crypt' ? data : null;
  const s = crypt?.stats;
  return (
    <div className="flex flex-col justify-center items-center min-h-screen gap-4 bg-stone-950 text-stone-100">
      <h1 className="text-3xl font-bold text-center">Here Lies</h1>
      {crypt ? (
        <>
          <p className="text-base text-center">
            Crypt #{crypt.crypt.number} · {crypt.crypt.weekday} · {crypt.crypt.name}
          </p>
          <p aria-label={`Difficulty ${crypt.crypt.candles} of 6`}>{'🕯'.repeat(crypt.crypt.candles)}</p>
          {s && (
            <p className="text-sm text-center">
              {s.entered} entered, {s.fell + s.cursed + s.stranded} fell, {s.escaped} escaped
            </p>
          )}
          {crypt.final && <p className="text-sm text-center">Closed. First to escape: {crypt.final.firstEscape ?? 'no one'}</p>}
          {crypt.streak.escape > 0 && <p className="text-sm">Your streak: {crypt.streak.escape}</p>}
        </>
      ) : data?.kind === 'necropolis' ? (
        <p className="text-base text-center">The Necropolis: every grave of the week.</p>
      ) : (
        <p className="text-base text-center text-amber-100/80">A new crypt every day. The dead light the way.</p>
      )}
      <button
        className="h-11 px-6 rounded-full bg-amber-400 text-stone-950 font-semibold cursor-pointer"
        onClick={(e) => requestExpandedMode(e.nativeEvent, 'game')}
      >
        {data?.kind === 'necropolis' ? 'Walk the graves' : crypt?.run && crypt.run.state.status !== 'active' ? 'See your result' : 'Descend'}
      </button>
    </div>
  );
};

const root = document.getElementById('root');
if (root) {
  createRoot(root).render(
    <StrictMode>
      <Splash />
    </StrictMode>,
  );
}
