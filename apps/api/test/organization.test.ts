import { describe } from 'vitest';
import { MemoryOrganizationRepository } from './organization-memory.js';
import { organizationScenarios } from './organization-scenarios.js';
describe('organization service rules — in-memory test double, not MongoDB', () => {
  organizationScenarios(() => new MemoryOrganizationRepository());
});
