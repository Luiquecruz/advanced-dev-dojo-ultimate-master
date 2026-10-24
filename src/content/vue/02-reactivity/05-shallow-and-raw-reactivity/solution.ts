import { markRaw, reactive, shallowRef, toRaw, triggerRef } from 'vue';

export interface Point {
  x: number;
  y: number;
}

export class ChartEngine {
  #renders = 0;

  render(points: Point[]): number {
    this.#renders++;
    return points.length;
  }

  get renders(): number {
    return this.#renders;
  }
}

export const points = shallowRef<Point[]>([]);

export function addPoint(point: Point): void {
  points.value = [...points.value, point];
}

export function movePoint(index: number, x: number, y: number): void {
  const point = points.value[index];
  point.x = x;
  point.y = y;
  triggerRef(points);
}

export const chart = reactive({ title: 'Sales', engine: markRaw(new ChartEngine()) });

export const settings = reactive({ theme: 'dark', grid: { visible: true, size: 8 } });

export function snapshotSettings() {
  return structuredClone(toRaw(settings));
}
