import { markRaw, reactive, ref, shallowRef, toRaw, triggerRef } from 'vue';

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

// TODO: use a shallowRef
export const points = ref<Point[]>([]);

export function addPoint(point: Point): void {
  // TODO: replace points.value with a new array
}

export function movePoint(index: number, x: number, y: number): void {
  // TODO: mutate the point in place, then call triggerRef
}

// TODO: wrap the engine with markRaw
export const chart = reactive({ title: 'Sales', engine: new ChartEngine() });

export const settings = reactive({ theme: 'dark', grid: { visible: true, size: 8 } });

export function snapshotSettings() {
  // TODO: clone the raw object with toRaw
  return structuredClone(settings);
}
