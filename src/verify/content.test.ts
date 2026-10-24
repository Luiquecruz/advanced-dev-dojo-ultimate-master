// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { allLessons, tracks } from '../content';

const filter = process.env.LESSON;
const lessons = allLessons.filter((lesson) => !filter || lesson.id.includes(filter));

describe('content structure', () => {
  it('loads every track with a known engine', () => {
    expect(tracks.length).toBeGreaterThanOrEqual(4);
    tracks.forEach((track) => expect(['typescript', 'react', 'vue', 'angular']).toContain(track.engine));
  });

  it.each(tracks.map((track) => [track.id, track] as const))('%s has unique lesson ids', (_, track) => {
    const ids = track.lessons.map((lesson) => lesson.id);
    expect(ids.length).toBe(new Set(ids).size);
  });

  it.each(lessons.map((lesson) => [lesson.key, lesson] as const))('%s is complete', (_, lesson) => {
    expect(lesson.title.length).toBeGreaterThan(2);
    expect(lesson.summary.length).toBeGreaterThan(10);
    expect(['beginner', 'intermediate', 'advanced', 'expert']).toContain(lesson.level);
    expect(lesson.theory.trim().length).toBeGreaterThan(200);
    expect(Boolean(lesson.challenge) || lesson.quiz.length > 0).toBe(true);
    if (lesson.challenge) {
      expect(lesson.challenge.hints.length).toBeGreaterThanOrEqual(2);
      expect(lesson.challenge.approach.trim().length).toBeGreaterThan(20);
    }
    lesson.quiz.forEach((question) => {
      expect(question.options.length).toBeGreaterThanOrEqual(2);
      expect(question.answer).toBeGreaterThanOrEqual(0);
      expect(question.answer).toBeLessThan(question.options.length);
      expect(question.explanation.length).toBeGreaterThan(10);
    });
  });
});
