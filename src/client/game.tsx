import './index.css';

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

// Placeholder game screen. The real game is built by the game-client spec.
export const App = () => {
  return (
    <div className="flex flex-col justify-center items-center min-h-screen gap-4 bg-stone-950 text-stone-100">
      <h1 className="text-2xl font-bold text-center">Descending into the crypt</h1>
      <p className="text-base text-center text-amber-100/80">The game is being built.</p>
    </div>
  );
};

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
