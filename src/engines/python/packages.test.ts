import { describe, expect, it } from 'vitest';
import { requiredPackages } from './packages';

describe('requiredPackages', () => {
  it('finds vendored packages from imports in learner files and tests', () => {
    expect(requiredPackages({ 'main.py': 'from pydantic import BaseModel\n' })).toEqual(['pydantic']);
    expect(requiredPackages({ 'main.py': 'import json, pydantic.functional_validators as v\n' })).toEqual(['pydantic']);
    expect(requiredPackages({ 'main.py': 'x = 1\n' }, '    from annotated_types import Gt\n')).toEqual(['pydantic']);
  });

  it('ignores the standard library, other files and comments', () => {
    expect(requiredPackages({ 'main.py': 'import json\nfrom dataclasses import dataclass\n# import pydantic\n', 'notes.md': 'import pydantic' })).toEqual([]);
  });
});
