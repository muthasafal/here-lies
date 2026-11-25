import './index.css';

import { requestExpandedMode } from '@devvit/web/client';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

// Placeholder splash. The real one (crypt name, weekday, live stats) is built by the daily-loop spec.
export const Splash = () => {
  return (
    <div className="flex flex-col justify-center items-center min-h-screen gap-4 bg-stone-950 text-stone-100">
      <h1 className="text-3xl font-bold text-center">Here Lies</h1>
      <p className="text-base text-center text-amber-100/80">
        A new crypt every day. The dead light the way.
      </p>
      <button
        className="h-11 px-6 rounded-full bg-amber-400 text-stone-950 font-semibold cursor-pointer"
        onClick={(e) => requestExpandedMode(e.nativeEvent, 'game')}
      >
        Descend
      </button>
    </div>
  );
};

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Splash />
  </StrictMode>
);
