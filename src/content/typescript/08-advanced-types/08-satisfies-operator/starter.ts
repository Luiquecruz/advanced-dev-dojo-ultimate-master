type Color = string | { r: number; g: number; b: number };
type PaletteKey = 'primary' | 'secondary' | 'accent';
type Route = { path: string; auth: boolean };

// TODO: replace the annotation with satisfies
const palette: Record<PaletteKey, Color> = {
  primary: '#3178c6',
  secondary: '#ffffff',
  accent: { r: 255, g: 0, b: 128 },
};

// TODO: replace the assertion with as const satisfies
const routes = {
  home: { path: '/', auth: false },
  profile: { path: '/profile', auth: true },
  settings: { path: '/settings', auth: true },
} as Record<string, Route>;

type RouteName = keyof typeof routes;

function routePath(name: RouteName): string {
  return routes[name].path;
}

function accentCss(): string {
  // TODO: read r, g and b from palette.accent once its type is precise
  return '';
}
