import { describe, it, expect } from 'vitest';
import { SeededRNG, hashSeed, createDaySeed } from './rng.js';

describe('SeededRNG', () => {
  it('produces consistent sequences for the same seed', () => {
    const rng1 = new SeededRNG(12345);
    const rng2 = new SeededRNG(12345);

    const sequence1 = Array.from({ length: 10 }, () => rng1.next());
    const sequence2 = Array.from({ length: 10 }, () => rng2.next());

    expect(sequence1).toEqual(sequence2);
  });

  it('produces different sequences for different seeds', () => {
    const rng1 = new SeededRNG(12345);
    const rng2 = new SeededRNG(54321);

    const sequence1 = Array.from({ length: 10 }, () => rng1.next());
    const sequence2 = Array.from({ length: 10 }, () => rng2.next());

    expect(sequence1).not.toEqual(sequence2);
  });

  it('generates numbers in [0, 1)', () => {
    const rng = new SeededRNG(42);
    for (let i = 0; i < 100; i++) {
      const n = rng.next();
      expect(n).toBeGreaterThanOrEqual(0);
      expect(n).toBeLessThan(1);
    }
  });

  it('nextInt generates integers in range inclusive', () => {
    const rng = new SeededRNG(99);
    for (let i = 0; i < 50; i++) {
      const n = rng.nextInt(10, 20);
      expect(n).toBeGreaterThanOrEqual(10);
      expect(n).toBeLessThanOrEqual(20);
      expect(Number.isInteger(n)).toBe(true);
    }
  });

  it('shuffle produces deterministic permutations', () => {
    const rng1 = new SeededRNG(777);
    const rng2 = new SeededRNG(777);
    
    const arr1 = [1, 2, 3, 4, 5];
    const arr2 = [1, 2, 3, 4, 5];
    
    rng1.shuffle(arr1);
    rng2.shuffle(arr2);
    
    expect(arr1).toEqual(arr2);
  });
});

describe('hashSeed', () => {
  it('produces consistent hashes for the same inputs', () => {
    const hash1 = hashSeed('here-lies', 't5_test', '2024-12-04', '1');
    const hash2 = hashSeed('here-lies', 't5_test', '2024-12-04', '1');
    
    expect(hash1).toBe(hash2);
  });

  it('produces different hashes for different inputs', () => {
    const hash1 = hashSeed('here-lies', 't5_test', '2024-12-04', '1');
    const hash2 = hashSeed('here-lies', 't5_test', '2024-12-05', '1');
    
    expect(hash1).not.toBe(hash2);
  });

  it('produces 32-bit unsigned integers', () => {
    const hash = hashSeed('test', 'data');
    expect(hash).toBeGreaterThanOrEqual(0);
    expect(hash).toBeLessThanOrEqual(0xFFFFFFFF);
    expect(Number.isInteger(hash)).toBe(true);
  });
});

describe('createDaySeed', () => {
  it('creates consistent seeds for the same day', () => {
    const seed1 = createDaySeed('t5_test', '2024-12-04', 1);
    const seed2 = createDaySeed('t5_test', '2024-12-04', 1);
    
    expect(seed1).toBe(seed2);
  });

  it('creates different seeds for different days', () => {
    const seed1 = createDaySeed('t5_test', '2024-12-04', 1);
    const seed2 = createDaySeed('t5_test', '2024-12-05', 1);
    
    expect(seed1).not.toBe(seed2);
  });

  it('creates different seeds for different versions', () => {
    const seed1 = createDaySeed('t5_test', '2024-12-04', 1);
    const seed2 = createDaySeed('t5_test', '2024-12-04', 2);
    
    expect(seed1).not.toBe(seed2);
  });
});
