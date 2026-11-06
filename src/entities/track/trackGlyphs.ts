export type Point = [x: number, y: number];

export interface TrackGlyph {
  concept: string;
  lines: string[];
  stars: Point[];
  key: Point;
}

/**
 * Concept constellations of the track logos, drawn on a 48 × 48 blueprint: line paths, the stars on their vertices and the
 * bright key star.
 */
export const TRACK_GLYPHS: Record<string, TrackGlyph> = {
  typescript: {
    concept: 'overlapping type squares, a union and its intersection',
    lines: [
      'M14 11H26A3 3 0 0 1 29 14V26A3 3 0 0 1 26 29H14A3 3 0 0 1 11 26V14A3 3 0 0 1 14 11Z',
      'M22 19H34A3 3 0 0 1 37 22V34A3 3 0 0 1 34 37H22A3 3 0 0 1 19 34V22A3 3 0 0 1 22 19Z',
    ],
    stars: [
      [11.88, 11.88],
      [28.12, 11.88],
      [36.12, 36.12],
      [19.88, 36.12],
    ],
    key: [24, 24],
  },
  react: {
    concept: 'atom of three component orbits',
    lines: [
      'M8 24A16 6.2 0 1 0 40 24A16 6.2 0 1 0 8 24',
      'M16 10.14A16 6.2 60 1 0 32 37.86A16 6.2 60 1 0 16 10.14',
      'M32 10.14A16 6.2 120 1 0 16 37.86A16 6.2 120 1 0 32 10.14',
    ],
    stars: [
      [8, 24],
      [40, 24],
      [16, 10.14],
      [32, 37.86],
      [32, 10.14],
      [16, 37.86],
    ],
    key: [24, 24],
  },
  'react-state': {
    concept: 'state cycle between store, view and action',
    lines: [
      'M27.58 12.5A13 13 0 0 1 36.61 28.14',
      'M39.47 25.76L36.61 28.14L35.2 24.7',
      'M33.03 34.35A13 13 0 0 1 14.97 34.35',
      'M15.6 38.02L14.97 34.35L18.66 34.85',
      'M11.39 28.14A13 13 0 0 1 20.42 12.5',
      'M16.93 11.21L20.42 12.5L18.14 15.44',
    ],
    stars: [
      [35.26, 31.5],
      [12.74, 31.5],
    ],
    key: [24, 12],
  },
  architecture: {
    concept: 'stacked decision layers',
    lines: [
      'M24 9L37 15.5L24 22L11 15.5Z',
      'M11 23.5L24 30L37 23.5',
      'M11 31.5L24 38L37 31.5',
    ],
    stars: [
      [11, 15.5],
      [37, 15.5],
      [24, 22],
      [24, 30],
      [24, 38],
    ],
    key: [24, 9],
  },
  'ai-engineering': {
    concept: 'generative sparkles',
    lines: [
      'M21 15C22 23 25 26 33 27C25 28 22 31 21 39C20 31 17 28 9 27C17 26 20 23 21 15Z',
      'M35 8C35.4 11.4 36.6 12.6 40 13C36.6 13.4 35.4 14.6 35 18C34.6 14.6 33.4 13.4 30 13C33.4 12.6 34.6 11.4 35 8Z',
    ],
    stars: [
      [21, 15],
      [33, 27],
      [21, 39],
      [9, 27],
    ],
    key: [21, 27],
  },
  node: {
    concept: 'event loop inside a hexagon',
    lines: [
      'M24 8L37.86 16V32L24 40L10.14 32V16Z',
      'M27.5 17.94A7 7 0 1 1 20.5 17.94',
      'M17.79 17.65L20.5 17.94L19.39 20.43',
    ],
    stars: [
      [24, 8],
      [37.86, 16],
      [37.86, 32],
      [24, 40],
      [10.14, 32],
      [10.14, 16],
    ],
    key: [24, 24],
  },
  python: {
    concept: 'two interlocked serpents',
    lines: [
      'M30 22V13A3 3 0 0 0 27 10H20A3 3 0 0 0 17 13V18H12A3 3 0 0 0 9 21V28A3 3 0 0 0 12 31H17',
      'M18 26V35A3 3 0 0 0 21 38H28A3 3 0 0 0 31 35V30H36A3 3 0 0 0 39 27V20A3 3 0 0 0 36 17H31',
    ],
    stars: [
      [30, 22],
      [17, 31],
      [18, 26],
      [31, 17],
      [27, 34],
    ],
    key: [21, 14],
  },
  csharp: {
    concept: 'sharp sign grid',
    lines: ['M20 10L16 38M32 10L28 38', 'M10 19H38M9 29H37'],
    stars: [
      [18.71, 19],
      [17.29, 29],
      [29.29, 29],
      [20, 10],
      [28, 38],
    ],
    key: [30.71, 19],
  },
  'java-spring': {
    concept: 'a cup of steaming coffee over a server base',
    lines: ['M13 24H32V30A6 6 0 0 1 26 36H19A6 6 0 0 1 13 30Z', 'M32 26H36A3 3 0 0 1 36 32H31', 'M19 9C16 13 22 16 19 20', 'M26 9C23 13 29 16 26 20'],
    stars: [
      [13, 24],
      [32, 24],
      [19, 9],
      [26, 9],
      [22.5, 36],
    ],
    key: [22.5, 30],
  },
  'system-design': {
    concept: 'a balancer fanning out to replicated nodes',
    lines: ['M24 11L12 34', 'M24 11L24 34', 'M24 11L36 34', 'M12 34H36'],
    stars: [
      [12, 34],
      [24, 34],
      [36, 34],
    ],
    key: [24, 11],
  },
  vue: {
    concept: 'converging chevrons',
    lines: ['M9 12L24 37L39 12', 'M16.5 12L24 25L31.5 12'],
    stars: [
      [9, 12],
      [39, 12],
      [16.5, 12],
      [31.5, 12],
      [24, 25],
    ],
    key: [24, 37],
  },
  angular: {
    concept: 'shield with the letter A',
    lines: [
      'M24 8L38 13L36 34L24 41L12 34L10 13Z',
      'M18 32L24 17L30 32M20.4 27H27.6',
    ],
    stars: [
      [38, 13],
      [10, 13],
      [36, 34],
      [12, 34],
      [24, 41],
    ],
    key: [24, 17],
  },
};
