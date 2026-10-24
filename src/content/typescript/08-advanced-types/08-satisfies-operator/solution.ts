type Color = string | { r: number; g: number; b: number };
type PaletteKey = 'primary' | 'secondary' | 'accent';
type Route = { path: string; auth: boolean };

const palette = {
  primary: '#3178c6',
  secondary: '#ffffff',
  accent: { r: 255, g: 0, b: 128 },
} satisfies Record<PaletteKey, Color>;

const routes = {
  home: { path: '/', auth: false },
  profile: { path: '/profile', auth: true },
  settings: { path: '/settings', auth: true },
} as const satisfies Record<string, Route>;

type RouteName = keyof typeof routes;

function routePath(name: RouteName): string {
  return routes[name].path;
}

function accentCss(): string {
  const { r, g, b } = palette.accent;
  return `rgb(${r}, ${g}, ${b})`;
}
