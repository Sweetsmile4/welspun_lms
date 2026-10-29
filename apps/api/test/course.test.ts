import { beforeEach, describe } from 'vitest';
import { memoryCourseHarness } from './course-fixture.js';
import { courseScenarios } from './course-scenarios.js';
describe('course draft domain with rollback-capable memory store', () => {
  let harness: ReturnType<typeof memoryCourseHarness>;
  beforeEach(() => {
    harness = memoryCourseHarness();
  });
  courseScenarios(() => harness);
});
