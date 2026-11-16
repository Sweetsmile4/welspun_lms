import { beforeEach, describe } from 'vitest';
import { memoryAuthorizationRepository } from './authorization-memory.js';
import { authorizationScenarios } from './authorization-scenarios.js';
describe('authorization policy and service boundary (test double)', () => {
  let store: ReturnType<typeof memoryAuthorizationRepository>;
  beforeEach(() => {
    store = memoryAuthorizationRepository();
  });
  authorizationScenarios(() => store);
});
