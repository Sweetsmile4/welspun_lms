import { describe, expect, it } from 'vitest';
import { foundationQuerySchema } from '../src/index.js';
describe('public runtime schemas', () => {
  it('defaults detail and rejects unknown query fields', () => {
    expect(foundationQuerySchema.parse({})).toEqual({ detail: 'summary' });
    expect(foundationQuerySchema.safeParse({ role: 'admin' }).success).toBe(
      false,
    );
  });
});
