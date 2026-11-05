import type { Module } from '@/content';

/**
 * Two-digit module number as learners see it and lesson text cites it, taken from the folder prefix (`00`, `07`, `12`).
 */
export function moduleNumberLabel(module: Module): string {
  return String(module.number).padStart(2, '0');
}
