declare module 'virtual:dojo-content' {
  export const tracks: Array<Omit<import('./types').Track, 'lessons'>>;
  export const lessonLoaders: Record<string, () => Promise<{ default: import('./loader').StoredLessonContent }>>;
}
