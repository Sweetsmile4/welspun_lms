'use client';
import { useEffect, useState } from 'react';
import { api } from './api';
type Certificate = {
  certificateId: string;
  courseTitle: string;
  learnerName: string;
  completedAt: string;
};
export function Certificates() {
  const [rows, setRows] = useState<Certificate[]>([]);
  const [error, setError] = useState('');
  useEffect(() => {
    void api<Certificate[]>('/certificates')
      .then(setRows)
      .catch((error) => setError(error.message));
  }, []);
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Your completion certificates</h1>
      {error && <p role="alert">{error}</p>}
      {rows.map((row) => (
        <article
          key={row.certificateId}
          className="rounded-xl border bg-white p-8"
        >
          <p className="text-sm uppercase tracking-widest">
            Welspun LMS — course completion
          </p>
          <h2 className="mt-4 text-2xl font-bold">{row.courseTitle}</h2>
          <p className="mt-3">Awarded to {row.learnerName}</p>
          <p>Completed {new Date(row.completedAt).toLocaleDateString()}</p>
          <p className="mt-4 text-xs">Reference: {row.certificateId}</p>
          <p className="mt-2 text-xs text-slate-500">
            Learning completion record; not an industrial certification or
            operating authorization.
          </p>
        </article>
      ))}
      {!error && rows.length === 0 && (
        <p>Complete all lessons and required quizzes to earn a certificate.</p>
      )}
      <button
        onClick={() => window.print()}
        className="rounded border px-4 py-2"
      >
        Print certificates
      </button>
    </div>
  );
}
