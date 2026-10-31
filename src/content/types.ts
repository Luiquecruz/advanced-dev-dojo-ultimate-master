export type EngineId = 'typescript' | 'react' | 'vue' | 'angular' | 'node';
export type LanguageId = string;
export type TrackId = string;
export type Level = 'beginner' | 'intermediate' | 'advanced' | 'expert';
export type ProjectFiles = Record<string, string>;

export interface LanguageInfo {
  label: string;
  engine: EngineId;
}

export type LanguageRegistry = Record<LanguageId, LanguageInfo>;

export interface QuizQuestion {
  question: string;
  options: string[];
  answer: number;
  explanation: string;
}

export interface Concept {
  term: string;
  description: string;
}

export interface Challenge {
  engine: EngineId;
  language?: LanguageId;
  instructions: string;
  starter: ProjectFiles;
  solution: ProjectFiles;
  entry: string;
  tests: string;
  hints: string[];
  approach: string;
  preview: boolean;
}

export interface Lesson {
  key: string;
  id: string;
  folder: string;
  trackId: TrackId;
  moduleId: string;
  title: string;
  summary: string;
  level: Level;
  tags: string[];
  theory: string;
  concepts: Concept[];
  challenge?: Challenge;
  variants: Challenge[];
  quiz: QuizQuestion[];
  resources: Array<{ label: string; url: string }>;
}

export interface Module {
  id: string;
  trackId: TrackId;
  title: string;
  description: string;
  lessons: Lesson[];
}

export interface Track {
  id: TrackId;
  engine: EngineId;
  languages: LanguageId[];
  order: number;
  title: string;
  shortTitle?: string;
  monogram: string;
  description: string;
  version: string;
  modules: Module[];
  lessons: Lesson[];
}
