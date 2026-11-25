/**
 * Local epitaph filter (BRIEF 4.6, 4.7). Runs before Perspective API on the server and in the
 * client for instant feedback. Conservative: blocks slurs, threats, links and handles.
 */

export const EPITAPH_MAX = 60;
export const DEFAULT_EPITAPH = 'Here lies one who went east.';

/** Suggestions offered on the death screen. */
export const EPITAPH_SUGGESTIONS = [
  'The draft did not lie.',
  'Trust the silence.',
  'I should have thrown a bone.',
  'The glow was closer than I thought.',
  'Not this way.',
  'Mind the whispers.',
];

const BLOCKED = ['nigg', 'fagg', 'retard', 'kike', 'chink', 'tranny', 'cunt', 'rape', 'killyourself', 'kys', 'hitler', 'nazi'];

function normalize(s: string): string {
  return s
    .toLowerCase()
    .replace(/[0@]/g, 'o')
    .replace(/[1!|]/g, 'i')
    .replace(/3/g, 'e')
    .replace(/4/g, 'a')
    .replace(/[5$]/g, 's')
    .replace(/[^a-z]/g, '');
}

export type FilterResult = { ok: true; text: string } | { ok: false; reason: string };

/** Trims and collapses whitespace, then checks the epitaph. Empty text becomes the default epitaph. */
export function checkEpitaph(raw: string): FilterResult {
  const text = raw.replace(/\s+/g, ' ').trim();
  if (text.length === 0) return { ok: true, text: DEFAULT_EPITAPH };
  if (text.length > EPITAPH_MAX) return { ok: false, reason: `Keep it to ${EPITAPH_MAX} characters.` };
  if (/https?:|www\.|\.com\b|\.gg\b|(^|\s)[ur]\/\w|@\w/i.test(text)) return { ok: false, reason: 'No links or handles on gravestones.' };
  const n = normalize(text);
  if (BLOCKED.some((w) => n.includes(w))) return { ok: false, reason: 'The stone refuses those words.' };
  return { ok: true, text };
}
