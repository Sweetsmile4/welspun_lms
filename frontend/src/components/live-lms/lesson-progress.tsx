'use client';
import { useEffect, useState } from 'react';
import { api, ApiError } from './api';
import Link from 'next/link';
type Quiz = { question: string; options: { id: string; text: string }[] };
export function LessonProgress({
  courseId,
  lessonId,
  quiz,
}: {
  courseId: string;
  lessonId: string;
  quiz?: Quiz;
}) {
  const [answer, setAnswer] = useState('');
  const [message, setMessage] = useState('');
  const [percent, setPercent] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [signedOut, setSignedOut] = useState(false);
  useEffect(() => {
    setAnswer('');
    setMessage('');
    void api<{ courseId: string; percent: number }[]>('/learning')
      .then((rows) =>
        setPercent(rows.find((row) => row.courseId === courseId)?.percent ?? 0),
      )
      .catch((error) => {
        if (error instanceof ApiError && error.status === 401)
          setSignedOut(true);
      });
  }, [courseId, lessonId]);
  return (
    <section className="mt-8 rounded-xl border bg-slate-50 p-6">
      <h3 className="text-lg font-semibold">Your learning progress</h3>
      {percent !== null && (
        <p className="mt-2">{percent}% of this course completed</p>
      )}
      {signedOut ? (
        <Link href="/login" className="underline">
          Sign in to save progress
        </Link>
      ) : (
        <form
          onSubmit={async (event) => {
            event.preventDefault();
            setBusy(true);
            try {
              await api(`/learning/${courseId}/enroll`, {});
              const result = await api<{
                correct: boolean;
                explanation: string;
                progress: { percent: number; certificateId: string | null };
              }>(
                `/learning/${courseId}/lessons/${lessonId}/complete`,
                quiz ? { answerId: answer } : {},
              );
              setPercent(result.progress.percent);
              setMessage(
                (result.correct ? 'Correct. ' : 'Try again. ') +
                  result.explanation +
                  (result.progress.certificateId
                    ? ' Course completed — your certificate is available.'
                    : ''),
              );
            } catch (error) {
              setMessage(
                error instanceof Error
                  ? error.message
                  : 'Could not save progress',
              );
            } finally {
              setBusy(false);
            }
          }}
        >
          {quiz && (
            <fieldset className="mt-4 space-y-3">
              <legend className="font-medium">{quiz.question}</legend>
              {quiz.options.map((option) => (
                <label key={option.id} className="flex gap-3">
                  <input
                    type="radio"
                    name="answer"
                    value={option.id}
                    required
                    checked={answer === option.id}
                    onChange={() => setAnswer(option.id)}
                  />
                  {option.text}
                </label>
              ))}
            </fieldset>
          )}
          <button
            disabled={busy}
            className="mt-5 rounded bg-blue-950 px-4 py-2 text-white disabled:opacity-50"
          >
            {busy
              ? 'Saving…'
              : quiz
                ? 'Submit answer and save progress'
                : 'Complete lesson and save progress'}
          </button>
        </form>
      )}
      {message && (
        <p role="status" className="mt-4">
          {message}
        </p>
      )}
    </section>
  );
}
