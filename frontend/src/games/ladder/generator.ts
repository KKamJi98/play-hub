import { ROWS, MIN_BRIDGES, MAX_BRIDGES } from "./constants";

export interface Bridge {
  row: number;
  fromCol: number;
  toCol: number;
}

export interface Waypoint {
  x: number;
  y: number;
}

export interface LadderData {
  columns: number;
  rows: number;
  bridges: Bridge[];
  paths: Waypoint[][];
  results: number[];
}

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function generateBridges(columns: number, rows: number): Bridge[] {
  const bridgeCount = randomInt(
    MIN_BRIDGES,
    Math.min(MAX_BRIDGES, rows * (columns - 1) * 0.4),
  );
  const bridges: Bridge[] = [];
  const occupied = new Set<string>();

  let attempts = 0;
  while (bridges.length < bridgeCount && attempts < bridgeCount * 10) {
    attempts++;
    const row = randomInt(1, rows - 1);
    const fromCol = randomInt(0, columns - 2);
    const toCol = fromCol + 1;
    const key = `${row}-${fromCol}`;
    const keyLeft = `${row}-${fromCol - 1}`;
    const keyRight = `${row}-${toCol}`;

    if (occupied.has(key) || occupied.has(keyLeft) || occupied.has(keyRight)) {
      continue;
    }

    occupied.add(key);
    bridges.push({ row, fromCol, toCol });
  }

  return bridges;
}

function computePath(
  startCol: number,
  bridges: Bridge[],
  rows: number,
): Waypoint[] {
  const bridgeMap = new Map<string, Bridge>();
  for (const b of bridges) {
    bridgeMap.set(`${b.row}-${b.fromCol}`, b);
    bridgeMap.set(`${b.row}-${b.toCol}`, b);
  }

  const path: Waypoint[] = [{ x: startCol, y: 0 }];
  let col = startCol;

  for (let row = 1; row <= rows; row++) {
    const key = `${row}-${col}`;
    const bridge = bridgeMap.get(key);
    if (bridge) {
      path.push({ x: col, y: row });
      if (bridge.fromCol === col) {
        col = bridge.toCol;
      } else {
        col = bridge.fromCol;
      }
      path.push({ x: col, y: row });
    }
  }

  path.push({ x: col, y: rows });
  return path;
}

export function generateLadder(columns: number): LadderData {
  const rows = ROWS;
  const bridges = generateBridges(columns, rows);
  const paths: Waypoint[][] = [];
  const results: number[] = [];

  for (let c = 0; c < columns; c++) {
    const path = computePath(c, bridges, rows);
    paths.push(path);
    const lastWaypoint = path[path.length - 1];
    results.push(lastWaypoint ? lastWaypoint.x : c);
  }

  return { columns, rows, bridges, paths, results };
}
