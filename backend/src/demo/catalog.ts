import { demoBootstrapSchema } from '@welspun/contracts/demo';
export const demoBootstrap = demoBootstrapSchema.parse({
  mode: 'demo',
  persistence: 'browser-local',
  courses: [
    {
      id: 'pipe-process-101',
      title: 'From Steel Coil to Finished Pipe',
      code: 'MFG-HSAW-01',
      category: 'Manufacturing Process',
      estimatedMinutes: 25,
    },
    {
      id: 'safety-essentials-102',
      title: 'Shop Floor Safety Essentials',
      code: 'SAF-IND-01',
      category: 'Shop Floor Safety',
      estimatedMinutes: 15,
    },
    {
      id: 'quality-basics-103',
      title: 'Quality Inspection Basics',
      code: 'QAL-INSP-01',
      category: 'Quality & Compliance',
      estimatedMinutes: 15,
    },
  ],
});
