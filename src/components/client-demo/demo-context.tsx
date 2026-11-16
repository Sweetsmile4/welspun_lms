'use client';

import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useRef,
  useCallback,
  useMemo,
} from 'react';
import { DEMO_COURSES, DEMO_USER } from '@/lib/client-demo/course-data';
import type {
  CourseData,
  CourseProgress,
  DemoUserProfile,
  ExplanationMode,
} from '@/lib/client-demo/types';

const STORAGE_KEY = 'welspun_client_demo_state_v1';

interface DemoStorageState {
  activeCourseId?: string;
  isAuthenticated: boolean;
  user: DemoUserProfile | null;
  progress: Record<string, CourseProgress>;
  explanationMode: ExplanationMode;
}

interface DemoContextValue {
  activeCourseId?: string;
  setActiveCourse: (courseId: string) => void;
  isAuthenticated: boolean;
  user: DemoUserProfile | null;
  courses: CourseData[];
  progress: Record<string, CourseProgress>;
  explanationMode: ExplanationMode;
  setExplanationMode: (mode: ExplanationMode) => void;
  loginAsDemoUser: () => void;
  logoutDemoUser: () => void;
  getCourseProgress: (courseId: string) => CourseProgress;
  markSceneCompleted: (courseId: string, sceneId: string) => void;
  setCurrentSceneIndex: (courseId: string, sceneIndex: number) => void;
  recordQuestionAnswer: (
    courseId: string,
    sceneId: string,
    optionId: string,
  ) => void;
  markCourseCompleted: (courseId: string) => void;
  resetDemoProgress: () => void;
  overallStats: {
    totalCourses: number;
    completedCourses: number;
    inProgressCourses: number;
    totalScenes: number;
    completedScenes: number;
    percentComplete: number;
  };
}

function buildInitialProgress(): Record<string, CourseProgress> {
  const initial: Record<string, CourseProgress> = {};
  for (const course of DEMO_COURSES) {
    initial[course.id] = {
      courseId: course.id,
      status: 'not_started',
      currentSceneIndex: 0,
      completedSceneIds: [],
      answeredQuestions: {},
    };
  }
  return initial;
}

function getInitialDemoState(): DemoStorageState {
  if (typeof window === 'undefined') {
    return {
      isAuthenticated: true,
      user: DEMO_USER,
      progress: buildInitialProgress(),
      explanationMode: 'operator',
    };
  }
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const parsed: DemoStorageState = JSON.parse(saved);
      return {
        activeCourseId: parsed.activeCourseId,
        isAuthenticated: Boolean(parsed.isAuthenticated),
        user: parsed.user || DEMO_USER,
        progress: {
          ...buildInitialProgress(),
          ...(parsed.progress || {}),
        },
        explanationMode: parsed.explanationMode || 'operator',
      };
    }
  } catch {
    // localStorage unavailable or restricted
  }
  return {
    isAuthenticated: true,
    user: DEMO_USER,
    progress: buildInitialProgress(),
    explanationMode: 'operator',
  };
}

const DemoContext = createContext<DemoContextValue | undefined>(undefined);

export function DemoProvider({ children }: { children: React.ReactNode }) {
  const [demoState, setDemoState] = useState<DemoStorageState>(() => ({
    isAuthenticated: true,
    user: DEMO_USER,
    progress: buildInitialProgress(),
    explanationMode: 'operator',
  }));
  const storageReady = useRef(false);
  useEffect(() => {
    // Restore browser storage after hydration so the first render matches the server.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setDemoState(getInitialDemoState());
  }, []);

  const setActiveCourse = useCallback((courseId: string) => {
    if (!DEMO_COURSES.some((course) => course.id === courseId)) return;
    setDemoState((prev) =>
      prev.activeCourseId === courseId
        ? prev
        : { ...prev, activeCourseId: courseId },
    );
  }, []);

  // Sync to localStorage
  useEffect(() => {
    if (!storageReady.current) {
      storageReady.current = true;
      return;
    }
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(demoState));
    } catch {
      // Ignore storage write issues
    }
  }, [demoState]);

  const loginAsDemoUser = useCallback(() => {
    setDemoState((prev) => ({
      ...prev,
      isAuthenticated: true,
      user: DEMO_USER,
    }));
  }, []);

  const logoutDemoUser = useCallback(() => {
    setDemoState((prev) => ({
      ...prev,
      isAuthenticated: false,
    }));
  }, []);

  const setExplanationMode = useCallback((mode: ExplanationMode) => {
    setDemoState((prev) => ({
      ...prev,
      explanationMode: mode,
    }));
  }, []);

  const getCourseProgress = useCallback(
    (courseId: string): CourseProgress => {
      if (demoState.progress[courseId]) {
        return demoState.progress[courseId];
      }
      return {
        courseId,
        status: 'not_started',
        currentSceneIndex: 0,
        completedSceneIds: [],
        answeredQuestions: {},
      };
    },
    [demoState.progress],
  );

  const setCurrentSceneIndex = useCallback(
    (courseId: string, sceneIndex: number) => {
      setDemoState((prev) => {
        const current = prev.progress[courseId] || {
          courseId,
          status: 'in_progress',
          currentSceneIndex: 0,
          completedSceneIds: [],
          answeredQuestions: {},
        };
        return {
          ...prev,
          progress: {
            ...prev.progress,
            [courseId]: {
              ...current,
              status:
                current.status === 'completed' ? 'completed' : 'in_progress',
              currentSceneIndex: Math.max(0, sceneIndex),
            },
          },
        };
      });
    },
    [],
  );

  const markSceneCompleted = useCallback(
    (courseId: string, sceneId: string) => {
      setDemoState((prev) => {
        const current = prev.progress[courseId] || {
          courseId,
          status: 'in_progress',
          currentSceneIndex: 0,
          completedSceneIds: [],
          answeredQuestions: {},
        };
        const completedSet = new Set(current.completedSceneIds);
        completedSet.add(sceneId);

        const course = DEMO_COURSES.find((c) => c.id === courseId);
        const totalScenes = course ? course.scenes.length : 1;
        const isAllDone = completedSet.size >= totalScenes;

        return {
          ...prev,
          progress: {
            ...prev.progress,
            [courseId]: {
              ...current,
              status: isAllDone ? 'completed' : 'in_progress',
              completedSceneIds: Array.from(completedSet),
              completedAt: isAllDone
                ? current.completedAt || new Date().toISOString()
                : undefined,
            },
          },
        };
      });
    },
    [],
  );

  const recordQuestionAnswer = useCallback(
    (courseId: string, sceneId: string, optionId: string) => {
      setDemoState((prev) => {
        const current = prev.progress[courseId] || {
          courseId,
          status: 'in_progress',
          currentSceneIndex: 0,
          completedSceneIds: [],
          answeredQuestions: {},
        };
        return {
          ...prev,
          progress: {
            ...prev.progress,
            [courseId]: {
              ...current,
              status:
                current.status === 'completed' ? 'completed' : 'in_progress',
              answeredQuestions: {
                ...current.answeredQuestions,
                [sceneId]: optionId,
              },
            },
          },
        };
      });
    },
    [],
  );

  const markCourseCompleted = useCallback((courseId: string) => {
    setDemoState((prev) => {
      const current = prev.progress[courseId];
      const course = DEMO_COURSES.find((c) => c.id === courseId);
      const allSceneIds = course ? course.scenes.map((s) => s.id) : [];
      if (!course || !allSceneIds.every((id) => current?.answeredQuestions[id]))
        return prev;

      return {
        ...prev,
        progress: {
          ...prev.progress,
          [courseId]: {
            courseId,
            status: 'completed',
            currentSceneIndex: Math.max(0, allSceneIds.length - 1),
            completedSceneIds: allSceneIds,
            answeredQuestions: current ? current.answeredQuestions : {},
            completedAt: new Date().toISOString(),
          },
        },
      };
    });
  }, []);

  const resetDemoProgress = useCallback(() => {
    const fresh = buildInitialProgress();
    setDemoState({
      isAuthenticated: true,
      user: DEMO_USER,
      progress: fresh,
      explanationMode: 'operator',
    });
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      // Ignore storage error
    }
  }, []);

  const overallStats = useMemo(() => {
    const totalCourses = DEMO_COURSES.length;
    let completedCourses = 0;
    let inProgressCourses = 0;
    let totalScenes = 0;
    let completedScenes = 0;

    for (const course of DEMO_COURSES) {
      totalScenes += course.scenes.length;
      const prog = demoState.progress[course.id];
      if (prog) {
        completedScenes += prog.completedSceneIds.length;
        if (prog.status === 'completed') {
          completedCourses += 1;
        } else if (
          prog.status === 'in_progress' ||
          prog.completedSceneIds.length > 0
        ) {
          inProgressCourses += 1;
        }
      }
    }

    const percentComplete =
      totalScenes > 0 ? Math.round((completedScenes / totalScenes) * 100) : 0;

    return {
      totalCourses,
      completedCourses,
      inProgressCourses,
      totalScenes,
      completedScenes,
      percentComplete,
    };
  }, [demoState.progress]);

  const value = useMemo<DemoContextValue>(
    () => ({
      activeCourseId: demoState.activeCourseId,
      setActiveCourse,
      isAuthenticated: demoState.isAuthenticated,
      user: demoState.user,
      courses: DEMO_COURSES,
      progress: demoState.progress,
      explanationMode: demoState.explanationMode,
      setExplanationMode,
      loginAsDemoUser,
      logoutDemoUser,
      getCourseProgress,
      markSceneCompleted,
      setCurrentSceneIndex,
      recordQuestionAnswer,
      markCourseCompleted,
      resetDemoProgress,
      overallStats,
    }),
    [
      demoState.activeCourseId,
      setActiveCourse,
      demoState.isAuthenticated,
      demoState.user,
      demoState.progress,
      demoState.explanationMode,
      setExplanationMode,
      loginAsDemoUser,
      logoutDemoUser,
      getCourseProgress,
      markSceneCompleted,
      setCurrentSceneIndex,
      recordQuestionAnswer,
      markCourseCompleted,
      resetDemoProgress,
      overallStats,
    ],
  );

  return <DemoContext.Provider value={value}>{children}</DemoContext.Provider>;
}

export function useDemo() {
  const context = useContext(DemoContext);
  if (!context) {
    throw new Error('useDemo must be used within a DemoProvider');
  }
  return context;
}
