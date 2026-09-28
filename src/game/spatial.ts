import { SPATIAL_CELL_SIZE } from './config';

export class SpatialHashGrid3D {
  private cellSize: number;
  private cells: Map<string, any[]> = new Map();

  constructor(cellSize: number = SPATIAL_CELL_SIZE) {
    this.cellSize = cellSize;
  }

  private key(cx: number, cy: number, cz: number): string {
    return `${cx},${cy},${cz}`;
  }

  private cellCoords(x: number, y: number, z: number): [number, number, number] {
    return [
      Math.floor(x / this.cellSize),
      Math.floor(y / this.cellSize),
      Math.floor(z / this.cellSize),
    ];
  }

  clear() {
    this.cells.clear();
  }

  insert(obj: { position: { x: number; y: number; z: number } }) {
    const [cx, cy, cz] = this.cellCoords(obj.position.x, obj.position.y, obj.position.z);
    const k = this.key(cx, cy, cz);
    if (!this.cells.has(k)) this.cells.set(k, []);
    this.cells.get(k)!.push(obj);
  }

  query(x: number, y: number, z: number, radius: number): any[] {
    const results: any[] = [];
    const [cx, cy, cz] = this.cellCoords(x, y, z);
    const cellRadius = Math.ceil(radius / this.cellSize);

    for (let dx = -cellRadius; dx <= cellRadius; dx++) {
      for (let dy = -cellRadius; dy <= cellRadius; dy++) {
        for (let dz = -cellRadius; dz <= cellRadius; dz++) {
          const k = this.key(cx + dx, cy + dy, cz + dz);
          const cell = this.cells.get(k);
          if (cell) {
            for (const obj of cell) {
              const ddx = obj.position.x - x;
              const ddy = obj.position.y - y;
              const ddz = obj.position.z - z;
              const dist = Math.sqrt(ddx * ddx + ddy * ddy + ddz * ddz);
              if (dist <= radius) {
                results.push(obj);
              }
            }
          }
        }
      }
    }
    return results;
  }

  queryAdjacent(x: number, y: number, z: number): any[] {
    const results: any[] = [];
    const [cx, cy, cz] = this.cellCoords(x, y, z);
    for (let dx = -1; dx <= 1; dx++) {
      for (let dy = -1; dy <= 1; dy++) {
        for (let dz = -1; dz <= 1; dz++) {
          const k = this.key(cx + dx, cy + dy, cz + dz);
          const cell = this.cells.get(k);
          if (cell) results.push(...cell);
        }
      }
    }
    return results;
  }
}
