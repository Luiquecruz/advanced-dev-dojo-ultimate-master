import type { LessonEntry, Module, Track } from '@/content';
import { isLessonComplete, type ProgressState } from './progressStore';

export type TrackStatus = 'not-started' | 'in-progress' | 'completed';

export interface ModuleProgress {
  module: Module;
  index: number;
  done: number;
  total: number;
  state: 'done' | 'current' | 'upcoming' | 'optional';
}

export interface TrackSummary {
  done: number;
  total: number;
  percent: number;
  status: TrackStatus;
  resumeLesson: LessonEntry;
  currentModuleIndex: number;
  lastStageNumber: number;
  modules: ModuleProgress[];
}

/**
 * A required module always counts toward track progress; an optional one once it is complete or a lesson between its first and its last is complete.
 */
function isModuleCounted(state: ProgressState, module: Module): boolean {
  if (!module.optional) {
    return true;
  }
  const complete = (lesson: LessonEntry) => isLessonComplete(state, lesson);
  return module.lessons.every(complete) || module.lessons.slice(1, -1).some(complete);
}

/**
 * Progress overview of a track: overall completion, the lesson to resume, the current stage (module) and per-module progress.
 */
export function summarizeTrack(track: Track, state: ProgressState): TrackSummary {
  const countedLessons = track.modules.filter((module) => isModuleCounted(state, module)).flatMap((module) => module.lessons);
  const done = countedLessons.filter((lesson) => isLessonComplete(state, lesson)).length;
  const total = countedLessons.length;
  const lastLesson = track.lessons.find((lesson) => lesson.id === state.lastLesson[track.id]);
  const status: TrackStatus = total > 0 && done === total ? 'completed' : done > 0 || lastLesson ? 'in-progress' : 'not-started';
  const resumeLesson = lastLesson ?? track.lessons.find((lesson) => !isLessonComplete(state, lesson)) ?? track.lessons[0];
  const currentModuleIndex = track.modules.findIndex((module) => module.id === resumeLesson.moduleId);
  const modules = track.modules.map((module, index): ModuleProgress => {
    const moduleDone = module.lessons.filter((lesson) => isLessonComplete(state, lesson)).length;
    const complete = moduleDone === module.lessons.length;
    const current = index === currentModuleIndex && !complete && status !== 'completed';
    return { module, index, done: moduleDone, total: module.lessons.length, state: current ? 'current' : complete ? 'done' : module.optional ? 'optional' : 'upcoming' };
  });
  const lastStageNumber = Math.max(0, ...track.modules.filter((module) => !module.optional).map((module) => module.number));
  return { done, total, percent: total ? Math.round((done / total) * 100) : 0, status, resumeLesson, currentModuleIndex, lastStageNumber, modules };
}

/**
 * A window of `size` modules around the current stage, for compact timelines.
 */
export function modulesAroundStage(summary: TrackSummary, size: number): ModuleProgress[] {
  const start = Math.min(Math.max(summary.currentModuleIndex - 1, 0), Math.max(summary.modules.length - size, 0));
  return summary.modules.slice(start, start + size);
}
