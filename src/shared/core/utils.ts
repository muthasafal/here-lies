/**
 * Utility functions for coordinate manipulation and game logic.
 */

import type { Coord, Direction } from './types.js';
import { GRID_SIZE, DIRECTION_VECTORS, ORTHOGONAL_OFFSETS, SURROUNDING_OFFSETS } from './types.js';

/** Convert coord to string key "x,y" */
export function coordKey(coord: Coord): string {
  return `${coord.x},${coord.y}`;
}

/** Parse string key "x,y" to coord */
export function parseCoordKey(key: string): Coord {
  const [x, y] = key.split(',').map(Number);
  if (x === undefined || y === undefined || Number.isNaN(x) || Number.isNaN(y)) {
    throw new Error(`Invalid coord key: ${key}`);
  }
  return { x, y };
}

/** Check if coordinate is within grid bounds */
export function inBounds(coord: Coord): boolean {
  return coord.x >= 0 && coord.x < GRID_SIZE && coord.y >= 0 && coord.y < GRID_SIZE;
}

/** Check if two coordinates are equal */
export function coordsEqual(a: Coord, b: Coord): boolean {
  return a.x === b.x && a.y === b.y;
}

/** Add two coordinates */
export function addCoord(a: Coord, offset: Coord): Coord {
  return { x: a.x + offset.x, y: a.y + offset.y };
}

/** Get coordinate in a direction */
export function moveInDirection(coord: Coord, direction: Direction): Coord {
  return addCoord(coord, DIRECTION_VECTORS[direction]);
}

/** Manhattan distance between two coordinates */
export function manhattanDistance(a: Coord, b: Coord): number {
  return Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
}

/** Get all orthogonally adjacent coordinates (4-way) */
export function getOrthogonalNeighbors(coord: Coord): Coord[] {
  return ORTHOGONAL_OFFSETS
    .map(offset => addCoord(coord, offset))
    .filter(inBounds);
}

/** Get all surrounding coordinates (8-way, orthogonal + diagonal) */
export function getSurroundingNeighbors(coord: Coord): Coord[] {
  return SURROUNDING_OFFSETS
    .map(offset => addCoord(coord, offset))
    .filter(inBounds);
}

/** Get all coordinates on the bottom edge (potential entrances) */
export function getBottomEdgeCoords(): Coord[] {
  return Array.from({ length: GRID_SIZE }, (_, x) => ({ x, y: GRID_SIZE - 1 }));
}

/** Check if a coordinate is on the bottom edge */
export function isBottomEdge(coord: Coord): boolean {
  return coord.y === GRID_SIZE - 1;
}

/** Get direction from one coord to an adjacent coord, or null if not adjacent */
export function getDirection(from: Coord, to: Coord): Direction | null {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  
  if (Math.abs(dx) + Math.abs(dy) !== 1) return null; // Not adjacent
  
  if (dy === -1) return 'north';
  if (dy === 1) return 'south';
  if (dx === 1) return 'east';
  if (dx === -1) return 'west';
  
  return null;
}

/** Get opposite direction */
export function oppositeDirection(dir: Direction): Direction {
  const opposites: Record<Direction, Direction> = {
    north: 'south',
    south: 'north',
    east: 'west',
    west: 'east',
  };
  return opposites[dir];
}

/** Get all coordinates in the grid */
export function getAllCoords(): Coord[] {
  const coords: Coord[] = [];
  for (let y = 0; y < GRID_SIZE; y++) {
    for (let x = 0; x < GRID_SIZE; x++) {
      coords.push({ x, y });
    }
  }
  return coords;
}

/** Check if a coordinate is in the safe zone (entrance + neighbors) */
export function isInSafeZone(coord: Coord, entrance: Coord): boolean {
  if (coordsEqual(coord, entrance)) return true;
  return getOrthogonalNeighbors(entrance).some(neighbor => coordsEqual(neighbor, coord));
}
