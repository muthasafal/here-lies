# Tasks: game-client (UI)

Kiro builds these. Run `npm run test:types && npm run lint && npm test && npm run build` after each.

- [ ] 1. Design tokens, fonts (open-license, self-hosted or Google Fonts via CSS), base styles in
      `src/client/index.css`; SVG hatching pattern library. _R8, R9_
- [ ] 2. `OmenGlyph` set (cold draft, whispers, faint glow, silence) with text labels. _R2.3, R8_
- [ ] 3. Procedural `Tombstone` SVG and `GraveMound` (cycling epitaphs via `moundOrder`). _R3_
- [ ] 4. `CryptGrid` + `Room` from `CellView`, 44 px minimum, fits 375 x 667; keyboard focus. _R2.1, R2.5_
- [ ] 5. `LanternCanvas` (light radius = visited area, fog, flicker, dust), reduced-motion aware. _R2.2, R8.3_
- [ ] 6. `PlayScreen` HUD: dripping-lantern oil meter, bone mode, flare, retreat/escape; hint card;
      toasts; tomb drop animation on realtime arrivals. _R2_
- [ ] 7. `DeathScreen` slow fade + epitaph form. _R4_
- [ ] 8. `RevealScreen` unfold animation + vote list. _R5_
- [ ] 9. `ResultCard` with explicit Share to comments / Subscribe buttons. _R6_
- [ ] 10. `HomeScreen` and the inline `splash.tsx` (light, no canvas). _R1_
- [ ] 11. Leaderboards, Practice picker, How to play. _R7_
- [ ] 12. Editor screen (tool palette, live verdict). _R7.3_
- [ ] 13. Necropolis screen. _R7.4_
- [ ] 14. Accessibility pass (AA contrast, focus, live region, no colour-only signals) and a
      Playwright MCP screenshot check at 375 x 667 and 768 x 1024. _R8_
- [ ] 15. Delete the placeholder `screens/Screens.tsx` and `components/Grid.tsx`.
