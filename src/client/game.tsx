import './index.css';

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { useGame } from './hooks/useGame';
import { ScreenRouter } from './screens/Screens';

/** Expanded view: the game. Screens are placeholders until Kiro's game-client spec designs them. */
export const App = () => {
  const g = useGame();
  return (
    <main>
      <ScreenRouter g={g} />
      <div aria-live="polite" role="status">
        {g.live}
      </div>
    </main>
  );
};

const root = document.getElementById('root');
if (root) {
  createRoot(root).render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
}
