/**
 * Deterministic pseudo-random number generator (mulberry32).
 * Same seed always produces the same sequence across all platforms.
 */

export class SeededRNG {
  private state: number;

  constructor(seed: number) {
    // Ensure seed is a 32-bit unsigned integer
    this.state = seed >>> 0;
  }

  /** Generate next random number in [0, 1) */
  next(): number {
    this.state = (this.state + 0x6D2B79F5) | 0;
    let t = Math.imul(this.state ^ (this.state >>> 15), 1 | this.state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  /** Generate random integer in [min, max] inclusive */
  nextInt(min: number, max: number): number {
    return Math.floor(this.next() * (max - min + 1)) + min;
  }

  /** Shuffle array in place (Fisher-Yates) */
  shuffle<T>(array: T[]): T[] {
    for (let i = array.length - 1; i > 0; i--) {
      const j = this.nextInt(0, i);
      [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
  }

  /** Pick random element from array */
  pick<T>(array: T[]): T {
    return array[this.nextInt(0, array.length - 1)];
  }
}

/**
 * Generate seed from string inputs.
 * Uses a simple string hash (djb2 variant).
 */
export function hashSeed(...parts: string[]): number {
  const combined = parts.join('|');
  let hash = 5381;
  for (let i = 0; i < combined.length; i++) {
    hash = ((hash << 5) + hash) + combined.charCodeAt(i);
    hash = hash & hash; // Convert to 32-bit integer
  }
  return hash >>> 0; // Ensure unsigned
}

/**
 * Create day seed for crypt generation.
 * Format: hash32("here-lies" | subredditId | yyyy-mm-dd | version)
 */
export function createDaySeed(
  subredditId: string,
  dayId: string, // yyyy-mm-dd
  version: number,
): number {
  return hashSeed('here-lies', subredditId, dayId, version.toString());
}
