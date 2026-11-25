/**
 * Crypt names from word pools, e.g. "The Weeping Vault" (BRIEF 5).
 */

import { SeededRNG } from './rng.js';

const ADJECTIVES = [
  'Weeping', 'Hollow', 'Sunken', 'Forgotten', 'Silent', 'Ashen', 'Moonless', 'Crooked', 'Drowned', 'Whispering',
  'Starved', 'Bone-Cold', 'Unquiet', 'Mossbound', 'Shattered', 'Lightless', 'Hungry', 'Patient', 'Gilded', 'Rusted',
];
const NOUNS = [
  'Vault', 'Ossuary', 'Catacomb', 'Barrow', 'Undercroft', 'Sepulchre', 'Charnel', 'Tomb', 'Reliquary', 'Mausoleum',
  'Crypt', 'Cellar', 'Warren', 'Chapel', 'Hollows',
];

/** A name for a generated crypt, deterministic per seed. */
export function cryptName(seed: number): string {
  const rng = new SeededRNG(seed ^ 0x5eed);
  return `The ${rng.pick(ADJECTIVES)} ${rng.pick(NOUNS)}`;
}

/** A crypt honouring yesterday's top epitaph author. */
export function honourName(username: string): string {
  return `The Crypt of u/${username}`;
}

/** Post title: "Crypt #<n> · <Weekday> · <Crypt name>". */
export function postTitle(n: number, weekday: string, name: string): string {
  return `Crypt #${n} · ${weekday} · ${name}`;
}
