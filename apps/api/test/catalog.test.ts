import { beforeEach, describe } from 'vitest';
import { memoryCourseHarness } from './course-fixture.js';
import { catalogScenarios } from './catalog-scenarios.js';
describe('isolated catalog memory services', () => {
  let h: ReturnType<typeof memoryCourseHarness>;
  beforeEach(() => {
    h = memoryCourseHarness();
  });
  catalogScenarios(() => h);
});
