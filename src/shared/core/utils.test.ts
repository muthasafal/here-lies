import { describe, it, expect } from 'vitest';
import {
  coordKey,
  parseCoordKey,
  inBounds,
  coordsEqual,
  moveInDirection,
  manhattanDistance,
  getOrthogonalNeighbors,
  getSurroundingNeighbors,
  getDirection,
  oppositeDirection,
  isInSafeZone,
} from './utils.js';

describe('coordKey and parseCoordKey', () => {
  it('converts coord to string and back', () => {
    const coord = { x: 3, y: 5 };
    const key = coordKey(coord);
    expect(key).toBe('3,5');
    expect(parseCoordKey(key)).toEqual(coord);
  });
});

describe('inBounds', () => {
  it('returns true for valid coordinates', () => {
    expect(inBounds({ x: 0, y: 0 })).toBe(true);
    expect(inBounds({ x: 6, y: 6 })).toBe(true);
    expect(inBounds({ x: 3, y: 3 })).toBe(true);
  });

  it('returns false for out-of-bounds coordinates', () => {
    expect(inBounds({ x: -1, y: 0 })).toBe(false);
    expect(inBounds({ x: 7, y: 0 })).toBe(false);
    expect(inBounds({ x: 0, y: -1 })).toBe(false);
    expect(inBounds({ x: 0, y: 7 })).toBe(false);
  });
});

describe('coordsEqual', () => {
  it('returns true for equal coordinates', () => {
    expect(coordsEqual({ x: 2, y: 3 }, { x: 2, y: 3 })).toBe(true);
  });

  it('returns false for different coordinates', () => {
    expect(coordsEqual({ x: 2, y: 3 }, { x: 2, y: 4 })).toBe(false);
    expect(coordsEqual({ x: 2, y: 3 }, { x: 3, y: 3 })).toBe(false);
  });
});

describe('moveInDirection', () => {
  it('moves north (y-1)', () => {
    expect(moveInDirection({ x: 3, y: 3 }, 'north')).toEqual({ x: 3, y: 2 });
  });

  it('moves south (y+1)', () => {
    expect(moveInDirection({ x: 3, y: 3 }, 'south')).toEqual({ x: 3, y: 4 });
  });

  it('moves east (x+1)', () => {
    expect(moveInDirection({ x: 3, y: 3 }, 'east')).toEqual({ x: 4, y: 3 });
  });

  it('moves west (x-1)', () => {
    expect(moveInDirection({ x: 3, y: 3 }, 'west')).toEqual({ x: 2, y: 3 });
  });
});

describe('manhattanDistance', () => {
  it('calculates distance correctly', () => {
    expect(manhattanDistance({ x: 0, y: 0 }, { x: 0, y: 0 })).toBe(0);
    expect(manhattanDistance({ x: 0, y: 0 }, { x: 3, y: 4 })).toBe(7);
    expect(manhattanDistance({ x: 2, y: 3 }, { x: 5, y: 1 })).toBe(5);
  });
});

describe('getOrthogonalNeighbors', () => {
  it('returns 4 neighbors for center cells', () => {
    const neighbors = getOrthogonalNeighbors({ x: 3, y: 3 });
    expect(neighbors).toHaveLength(4);
    expect(neighbors).toContainEqual({ x: 3, y: 2 }); // north
    expect(neighbors).toContainEqual({ x: 3, y: 4 }); // south
    expect(neighbors).toContainEqual({ x: 4, y: 3 }); // east
    expect(neighbors).toContainEqual({ x: 2, y: 3 }); // west
  });

  it('returns 2 neighbors for corner cells', () => {
    const neighbors = getOrthogonalNeighbors({ x: 0, y: 0 });
    expect(neighbors).toHaveLength(2);
    expect(neighbors).toContainEqual({ x: 1, y: 0 }); // east
    expect(neighbors).toContainEqual({ x: 0, y: 1 }); // south
  });

  it('filters out-of-bounds neighbors', () => {
    const neighbors = getOrthogonalNeighbors({ x: 0, y: 0 });
    neighbors.forEach(coord => {
      expect(inBounds(coord)).toBe(true);
    });
  });
});

describe('getSurroundingNeighbors', () => {
  it('returns 8 neighbors for center cells', () => {
    const neighbors = getSurroundingNeighbors({ x: 3, y: 3 });
    expect(neighbors).toHaveLength(8);
  });

  it('returns 3 neighbors for corner cells', () => {
    const neighbors = getSurroundingNeighbors({ x: 0, y: 0 });
    expect(neighbors).toHaveLength(3);
  });
});

describe('getDirection', () => {
  it('returns correct direction for adjacent cells', () => {
    const from = { x: 3, y: 3 };
    expect(getDirection(from, { x: 3, y: 2 })).toBe('north');
    expect(getDirection(from, { x: 3, y: 4 })).toBe('south');
    expect(getDirection(from, { x: 4, y: 3 })).toBe('east');
    expect(getDirection(from, { x: 2, y: 3 })).toBe('west');
  });

  it('returns null for non-adjacent cells', () => {
    expect(getDirection({ x: 0, y: 0 }, { x: 2, y: 2 })).toBeNull();
    expect(getDirection({ x: 0, y: 0 }, { x: 1, y: 1 })).toBeNull(); // diagonal
  });
});

describe('oppositeDirection', () => {
  it('returns opposite directions', () => {
    expect(oppositeDirection('north')).toBe('south');
    expect(oppositeDirection('south')).toBe('north');
    expect(oppositeDirection('east')).toBe('west');
    expect(oppositeDirection('west')).toBe('east');
  });
});

describe('isInSafeZone', () => {
  it('returns true for entrance', () => {
    const entrance = { x: 3, y: 6 };
    expect(isInSafeZone(entrance, entrance)).toBe(true);
  });

  it('returns true for orthogonal neighbors of entrance', () => {
    const entrance = { x: 3, y: 6 };
    expect(isInSafeZone({ x: 2, y: 6 }, entrance)).toBe(true);
    expect(isInSafeZone({ x: 4, y: 6 }, entrance)).toBe(true);
    expect(isInSafeZone({ x: 3, y: 5 }, entrance)).toBe(true);
  });

  it('returns false for cells outside safe zone', () => {
    const entrance = { x: 3, y: 6 };
    expect(isInSafeZone({ x: 0, y: 0 }, entrance)).toBe(false);
    expect(isInSafeZone({ x: 3, y: 4 }, entrance)).toBe(false);
  });
});
