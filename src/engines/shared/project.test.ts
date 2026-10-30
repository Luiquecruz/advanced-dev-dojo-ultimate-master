import { describe, expect, it } from 'vitest';
import { evaluateProject, resolveFile } from './project';

const compiled = {
  'App.jsx': 'module.exports = require("./features/cart");',
  'features/cart/index.js': 'module.exports = { total: require("./model").total, label: require("../../shared/ui/label").label };',
  'features/cart/model.js': 'module.exports = { total: 3 };',
  'shared/ui/label.ts': 'module.exports = { label: "Cart" };',
  'main.ts': 'module.exports = require("/shared/ui/label");',
};

describe('resolveFile', () => {
  it('resolves extensions and folder index files', () => {
    expect(resolveFile(compiled, './shared/ui/label')).toBe('shared/ui/label.ts');
    expect(resolveFile(compiled, './features/cart')).toBe('features/cart/index.js');
  });

  it('resolves relative to the importing directory', () => {
    expect(resolveFile(compiled, './model', 'features/cart')).toBe('features/cart/model.js');
    expect(resolveFile(compiled, '../../shared/ui/label', 'features/cart')).toBe('shared/ui/label.ts');
    expect(resolveFile(compiled, '/shared/ui/label', 'features/cart')).toBe('shared/ui/label.ts');
  });

  it('returns undefined for a missing file', () => {
    expect(resolveFile(compiled, './missing')).toBeUndefined();
  });
});

describe('evaluateProject', () => {
  it('loads nested files through relative imports', () => {
    const project = evaluateProject(compiled, 'App.jsx', {});
    expect(project.entry).toEqual({ total: 3, label: 'Cart' });
    expect(project.modules['main.ts']).toEqual({ label: 'Cart' });
  });
});
