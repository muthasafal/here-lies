# Art Direction

Applied to: `src/client/**`

## Visual Identity

**Here Lies** uses a hand-inked linocut and woodcut aesthetic on near-black stone. This is a deliberate dark theme for a crypt game.

## Colour Palette

- **Stone black:** `#0a0a0a` (background)
- **Bone white:** `#f5f1e8` (primary text, linework)
- **Lantern amber:** `#f4a460` (the only strong colour, for the light and glow)
- **Moss green:** `#5a7a5a` (muted, for success states)
- **Rust red:** `#8a4a3a` (desaturated, for danger states)

**Contrast:** At least WCAG AA. Bone-white on stone-black exceeds this. Danger and success colours are distinguishable by colour-blind users and always paired with icons.

## Typography

- **Display (epitaphs, tombstones):** A hand-cut serif display face with an open license (e.g., Cinzel, Vollkorn, or similar carved aesthetic).
- **Body (UI, omens, stats):** A readable humanist sans-serif (e.g., Inter, Public Sans).
- **Sizes:**
  - Epitaphs: 18-20px, bold, tight letter-spacing
  - Omens: 16-18px, prominent
  - UI text: 14-16px, readable at mobile sizes
- **Touch targets:** Minimum 44px for mobile (iOS guideline)

## Textures

- **Carved-line hatching:** SVG `<path>` elements with hand-drawn line patterns, not raster images.
- **Stone grain:** Subtle SVG noise or fine hatching on the background.
- **Tombstone variation:** Procedurally assembled from SVG shapes (top cap, body, base, cracks, moss). Each tombstone is slightly different.
- **No AI-generated art, no stock photos.**

## Glyphs (Always with Text Labels)

Omens and UI elements use custom SVG glyphs:
- **Cold draft:** Wind lines (curved strokes)
- **Whispers:** Echo curves or wispy trails
- **Faint glow:** Concentric circles or halo
- **Silence:** A small calm circle or still-water ripple
- **Pit:** A dark void with rough edges
- **Curse:** A twisted sigil or thorn
- **Relic:** An ornate chalice or ancient amulet (revealed on the final map)
- **Oil/lantern:** A dripping lantern icon
- **Bone:** A small skeletal hand or femur
- **Flare:** Radiating light burst

**Every glyph is paired with a text label.** Colour is never the sole indicator.

## Motion and Animation

Respect `prefers-reduced-motion`. When motion is enabled:

- **Lantern flicker:** Subtle canvas animation, 0.5-1 Hz
- **Tombstone drop:** Soft fall with a dust puff (SVG particles or CSS scale/fade), duration ~600ms
- **Map reveal:** Rooms unfold sequentially from the entrance, ~100ms per room
- **Transitions:** CSS `transition` for state changes, easing `cubic-bezier(0.4, 0.0, 0.2, 1)`
- **Hover/focus:** Gentle scale (1.02×) or glow on interactive elements

**When reduced motion is on:** crossfade only, no scale/rotation/translation.

## Layout

- **Mobile-first:** Most Reddit traffic is mobile. The grid scales to fit the viewport.
- **Splash (inline, in feed):**
  - Crypt name and number at the top
  - Weekday difficulty as 1-6 candles (simple icon metaphor)
  - Live stats in a compact bar
  - "Descend" button, large and centred, bone-white with amber glow on hover
- **Game screen:**
  - Grid fills the safe area, leaving room for omens at the top and controls at the bottom
  - Current room highlights with a subtle amber border
  - Lantern light is a radial gradient canvas overlay, constrained to visited rooms
  - Oil meter: a vertical lantern icon that empties from top to bottom
  - Bone and flare buttons: icon + count, 44px minimum, bottom corners
- **Tombstones in darkness:**
  - Faint ghost-light glow (soft white aura)
  - Visible even in unvisited rooms
  - Tap/click to read the epitaph (modal overlay)
- **Death screen:**
  - Full-screen fade to black
  - "Here lies..." heading
  - Epitaph input (60 chars max), centred
  - "Carve" and "Skip" buttons
  - Anonymous toggle
- **Reveal:**
  - Map unfolds with a staggered animation
  - Hazards and the relic are revealed
  - Tombstones you passed are highlighted for voting
- **Result card:**
  - Score, multiplier breakdown, streak
  - Rank (if top 10)
  - Emoji summary (copyable)
  - "Share to comments" button (explicit, manual)
  - "Practice yesterday's crypt" link

## Accessibility Beyond Colour

- **Keyboard navigation:** Tab order follows visual order. Enter/Space activates buttons. Arrow keys move on the grid.
- **ARIA live region:** Announces omens and room state on each move: "Room C4. Cold draft, 1. Faint glow."
- **Focus indicators:** High-contrast outline (2px amber or bone-white)
- **Screen reader labels:** Every interactive element has an `aria-label` or visible text.

## Mobile Considerations

- **Touch targets:** 44px minimum
- **No hover-only interactions:** Tap replaces hover. Long-press for secondary actions if needed.
- **Viewport scaling:** Grid cells scale to fit, with a minimum size of 48px per cell on small screens.
- **Safe area insets:** Respect `env(safe-area-inset-*)` for notched devices.

## The Tombstone Signature Visual

Tombstones are the game's visual identity:
- **Shape:** Classic rounded-top headstone, procedurally varied (slight rotation, different cap styles, cracks).
- **Epitaph:** Carved into the stone, displayed in the serif display font with tight leading.
- **Avatar:** Small, circular, inset at the top (snoovatar or ghost silhouette).
- **Username:** Below the avatar, in a smaller sans font, or "a nameless soul" if anonymous.
- **Cause icon:** Small glyph at the bottom (pit void, curse sigil, or stranded lantern).
- **Stacking:** Multiple tombstones in one room form a mound (z-index stack with slight offsets).

## No Reddit Branding

- **Never use Snoo** (the Reddit alien mascot)
- **Never use "REDDIT" wordmark or logo**
- Snoovatar images are allowed (they're user avatars, not branding), but the app itself has no Reddit identity references.

## Performance

- **Inline SVGs** for glyphs and textures (no external image requests)
- **Canvas for lantern light only** (the radial gradient and flicker)
- **Lazy-load non-critical assets** (leaderboards, necropolis)
- **Target:** ≤500 KB initial page weight
