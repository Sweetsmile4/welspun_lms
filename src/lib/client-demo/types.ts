export type ExplanationMode = 'eli5' | 'operator' | 'engineer';

export interface QuizOption {
  id: string;
  text: string;
  isCorrect: boolean;
  explanation: string;
}

export interface ScenarioQuiz {
  question: string;
  context: string;
  options: QuizOption[];
  standardReference?: string;
}

export interface CourseScene {
  id: string;
  number: number;
  title: string;
  subtitle: string;
  story: string;
  diagramType:
    | 'coil_receiving'
    | 'strip_prep'
    | 'helical_forming'
    | 'submerged_arc_welding'
    | 'quality_testing'
    | 'release_dispatch'
    | 'ppe_safety'
    | 'hazard_loads'
    | 'loto_isolation'
    | 'near_miss'
    | 'inspection_gates'
    | 'defect_types'
    | 'traceability_lineage'
    | 'quarantine_ncr';
  hasInteractiveVisualizer?: boolean;
  explanations: {
    eli5: {
      title: string;
      analogy: string;
      body: string;
    };
    operator: {
      title: string;
      checkpoints: string[];
      cues: string[];
      warnings: string;
    };
    engineer: {
      title: string;
      specifications: string;
      parameters: Record<string, string>;
      standards: string[];
      technicalNote: string;
    };
  };
  quiz: ScenarioQuiz;
  practicalTakeaway: string;
}

export interface CourseData {
  id: string;
  title: string;
  code: string;
  subtitle: string;
  description: string;
  category:
    'Manufacturing Process' | 'Shop Floor Safety' | 'Quality & Compliance';
  estimatedMinutes: number;
  badgeLabel: string;
  thumbnailType: 'pipe_process' | 'safety_gear' | 'quality_stamp';
  scenes: CourseScene[];
}

export type CourseStatus = 'not_started' | 'in_progress' | 'completed';

export interface CourseProgress {
  courseId: string;
  status: CourseStatus;
  currentSceneIndex: number;
  completedSceneIds: string[];
  answeredQuestions: Record<string, string>; // sceneId -> selectedOptionId
  completedAt?: string;
}

export interface DemoUserProfile {
  id: string;
  employeeCode: string;
  fullName: string;
  jobTitle: string;
  plantLocation: string;
  department: string;
  shift: string;
  avatarInitials: string;
}
