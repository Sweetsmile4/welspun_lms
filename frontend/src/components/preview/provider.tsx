'use client';
import {
  createContext,
  useContext,
  useState,
  type ReactNode,
  type Dispatch,
  type SetStateAction,
} from 'react';
import {
  fixture,
  type Draft,
  type Perspective,
  type Release,
  type Review,
} from './model';
type State = {
  courses: Draft[];
  setCourses: Dispatch<SetStateAction<Draft[]>>;
  selected: string;
  setSelected: Dispatch<SetStateAction<string>>;
  perspective: Perspective;
  setPerspective: Dispatch<SetStateAction<Perspective>>;
  reviews: Review[];
  setReviews: Dispatch<SetStateAction<Review[]>>;
  releases: Release[];
  setReleases: Dispatch<SetStateAction<Release[]>>;
  visibility: string;
  setVisibility: Dispatch<SetStateAction<string>>;
  reset: () => void;
  busy: boolean;
  setBusy: Dispatch<SetStateAction<boolean>>;
  notice: { error: boolean; text: string };
  setNotice: Dispatch<SetStateAction<{ error: boolean; text: string }>>;
};
const Context = createContext<State | null>(null);
export function PreviewProvider({ children }: { children: ReactNode }) {
  const [courses, setCourses] = useState(fixture),
    [selected, setSelected] = useState('synthetic-course-1'),
    [perspective, setPerspective] = useState<Perspective>('author'),
    [reviews, setReviews] = useState<Review[]>([]),
    [releases, setReleases] = useState<Release[]>([]),
    [visibility, setVisibility] = useState('organization'),
    [busy, setBusy] = useState(false),
    [notice, setNotice] = useState({
      error: false,
      text: 'Fixture ready. All actions are simulated in this tab.',
    });
  function reset() {
    if (busy) return;
    setCourses(fixture());
    setSelected('synthetic-course-1');
    setPerspective('author');
    setReviews([]);
    setReleases([]);
    setVisibility('organization');
    setNotice({
      error: false,
      text: 'Simulated: All synthetic data reset. No backend validation or persistence.',
    });
  }
  return (
    <Context.Provider
      value={{
        courses,
        setCourses,
        selected,
        setSelected,
        perspective,
        setPerspective,
        reviews,
        setReviews,
        releases,
        setReleases,
        visibility,
        setVisibility,
        reset,
        busy,
        setBusy,
        notice,
        setNotice,
      }}
    >
      {children}
    </Context.Provider>
  );
}
export function usePreviewState() {
  const state = useContext(Context);
  if (!state) throw new Error('Preview state requires its development layout');
  return state;
}
