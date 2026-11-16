import { beforeEach, describe } from 'vitest';
import { memoryCourseHarness } from './course-fixture.js';
import { publishingScenarios } from './publishing-scenarios.js';
describe('review and publishing isolated memory transactions', () => {
  let h: ReturnType<typeof memoryCourseHarness>;
  beforeEach(() => {
    h = memoryCourseHarness();
  });
  publishingScenarios(() => h);
});
