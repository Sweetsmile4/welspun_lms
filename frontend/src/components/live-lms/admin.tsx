'use client';
import { useEffect, useState } from 'react';
import { api } from './api';
type Overview = {
  users: { id: string; name: string; email: string; role: string }[];
  enrollments: {
    userId: string;
    courseId: string;
    courseTitle: string;
    completedLessons: number;
    totalLessons: number;
    percent: number;
    certificateId: string | null;
  }[];
};
export function LiveAdmin() {
  const [data, setData] = useState<Overview | null>(null);
  const [message, setMessage] = useState('');
  useEffect(() => {
    void api<Overview>('/admin/overview')
      .then(setData)
      .catch((error) => setMessage(error.message));
  }, []);
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">LMS administration</h1>
      {message && <p role="status">{message}</p>}
      {data && (
        <>
          <h2 className="text-xl font-semibold">Learners and progress</h2>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Enrollments</th>
                  <th>Course progress</th>
                  <th>Certificates</th>
                </tr>
              </thead>
              <tbody>
                {data.users.map((user) => (
                  <tr key={user.id} className="border-t">
                    <td className="p-3">{user.name}</td>
                    <td>{user.email}</td>
                    <td>
                      {
                        data.enrollments.filter((row) => row.userId === user.id)
                          .length
                      }
                    </td>
                    <td className="space-y-1 py-3">
                      {data.enrollments
                        .filter((row) => row.userId === user.id)
                        .map((row) => (
                          <div key={row.courseId}>
                            <span>{row.courseTitle}: </span>
                            <strong>{row.percent}%</strong>
                            <span className="text-slate-500">
                              {' '}
                              ({row.completedLessons}/{row.totalLessons})
                            </span>
                          </div>
                        ))}
                    </td>
                    <td>
                      {
                        data.enrollments.filter(
                          (row) => row.userId === user.id && row.certificateId,
                        ).length
                      }
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <form
            className="grid max-w-2xl gap-4 rounded-xl border bg-white p-6"
            onSubmit={async (event) => {
              event.preventDefault();
              const form = event.currentTarget;
              const body = Object.fromEntries(new FormData(form));
              try {
                await api('/admin/courses', body);
                setMessage('Course published to the catalog');
                form.reset();
              } catch (error) {
                setMessage(
                  error instanceof Error ? error.message : 'Could not publish',
                );
              }
            }}
          >
            <h2 className="text-xl font-semibold">Publish a course</h2>
            {[
              ['title', 'Course title'],
              ['code', 'Course code'],
              ['description', 'Description'],
              ['lessonTitle', 'First lesson title'],
              ['lessonText', 'Lesson content'],
            ].map(([name, label]) => (
              <label key={name}>
                {label}
                {name === 'lessonText' ? (
                  <textarea
                    required
                    name={name}
                    minLength={10}
                    maxLength={8000}
                    className="mt-1 block w-full rounded border p-2"
                  />
                ) : (
                  <input
                    required
                    name={name}
                    maxLength={
                      name === 'description' ? 2000 : name === 'code' ? 64 : 200
                    }
                    className="mt-1 block w-full rounded border p-2"
                  />
                )}
              </label>
            ))}
            <button className="rounded bg-blue-950 px-4 py-3 text-white">
              Publish course
            </button>
          </form>
        </>
      )}
    </div>
  );
}
