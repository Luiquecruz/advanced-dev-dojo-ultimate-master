import type { Lesson, Module, Track } from '../content';
import { isLessonComplete, type ProgressState } from '../app/progress';

export type TrackStatus = 'not-started' | 'in-progress' | 'completed';

export interface ModuleProgress {
  module: Module;
  index: number;
  done: number;
  total: number;
  state: 'done' | 'current' | 'upcoming';
}

export interface TrackSummary {
  done: number;
  total: number;
  percent: number;
  status: TrackStatus;
  resumeLesson: Lesson;
  currentModuleIndex: number;
  modules: ModuleProgress[];
}

/**
 * Progress overview of a track: overall completion, the lesson to resume, the current stage (module) and per-module progress.
 */
export function summarizeTrack(track: Track, state: ProgressState): TrackSummary {
  const done = track.lessons.filter((lesson) => isLessonComplete(state, lesson)).length;
  const total = track.lessons.length;
  const lastLesson = track.lessons.find((lesson) => lesson.id === state.lastLesson[track.id]);
  const resumeLesson = lastLesson ?? track.lessons.find((lesson) => !isLessonComplete(state, lesson)) ?? track.lessons[0];
  const currentModuleIndex = track.modules.findIndex((module) => module.id === resumeLesson.moduleId);
  const modules = track.modules.map((module, index): ModuleProgress => {
    const moduleDone = module.lessons.filter((lesson) => isLessonComplete(state, lesson)).length;
    const complete = moduleDone === module.lessons.length;
    return { module, index, done: moduleDone, total: module.lessons.length, state: index === currentModuleIndex && !complete ? 'current' : complete ? 'done' : 'upcoming' };
  });
  const status: TrackStatus = done === total ? 'completed' : done > 0 || lastLesson ? 'in-progress' : 'not-started';
  return { done, total, percent: total ? Math.round((done / total) * 100) : 0, status, resumeLesson, currentModuleIndex, modules };
}

/**
 * A window of `size` modules around the current stage, for compact timelines.
 */
export function modulesAroundStage(summary: TrackSummary, size: number): ModuleProgress[] {
  const start = Math.min(Math.max(summary.currentModuleIndex - 1, 0), Math.max(summary.modules.length - size, 0));
  return summary.modules.slice(start, start + size);
}
