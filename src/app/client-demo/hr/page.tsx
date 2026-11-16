'use client';

import { Fragment, useState } from 'react';
import Link from 'next/link';
import { useDemo } from '@/components/client-demo/demo-context';
import { DEMO_USER } from '@/lib/client-demo/course-data';

const samples = [
  {
    name: 'Priya Patel',
    code: 'WCL-DEMO-7043',
    department: 'Quality Assurance',
    fraction: 1,
  },
  {
    name: 'Amit Singh',
    code: 'WCL-DEMO-7044',
    department: 'HSAW Spiral Pipe Operations',
    fraction: 0.58,
  },
  {
    name: 'Neha Desai',
    code: 'WCL-DEMO-7045',
    department: 'Maintenance',
    fraction: 0,
  },
  {
    name: 'Vikram Rao',
    code: 'WCL-DEMO-7046',
    department: 'Quality Assurance',
    fraction: 0.32,
  },
  {
    name: 'Anjali Mehta',
    code: 'WCL-DEMO-7047',
    department: 'Maintenance',
    fraction: 1,
  },
  {
    name: 'Suresh Kumar',
    code: 'WCL-DEMO-7048',
    department: 'HSAW Spiral Pipe Operations',
    fraction: 0.78,
  },
];

type Status = 'Completed' | 'In progress' | 'Not started';
const statusOf = (completed: number, started: boolean): Status =>
  completed === 100 ? 'Completed' : started ? 'In progress' : 'Not started';
const fieldClass =
  'w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus-visible:outline-2 focus-visible:outline-blue-700';

function ProgressBar({ value }: { value: number }) {
  return (
    <div className="flex items-center gap-3">
      <div
        role="progressbar"
        aria-label="Learning progress"
        aria-valuenow={value}
        aria-valuemin={0}
        aria-valuemax={100}
        className="h-2 w-28 overflow-hidden rounded-full bg-slate-200"
      >
        <div
          className="h-full rounded-full bg-blue-700"
          style={{ width: `${value}%` }}
        />
      </div>
      <span className="text-sm font-bold tabular-nums">{value}%</span>
    </div>
  );
}

export default function HRTrackerPage() {
  const { courses, progress } = useDemo();
  const [search, setSearch] = useState('');
  const [department, setDepartment] = useState('All departments');
  const [status, setStatus] = useState('All statuses');
  const [selectedCode, setSelectedCode] = useState<string | null>(null);

  const employees = [
    {
      name: DEMO_USER.fullName,
      code: DEMO_USER.employeeCode,
      department: DEMO_USER.department,
      fraction: 0,
    },
    ...samples,
  ].map((employee, employeeIndex) => {
    const assignments = courses.map((course, courseIndex) => {
      const saved = employeeIndex === 0 ? progress[course.id] : undefined;
      // Fill complete courses first so sample employees have varied course states.
      const completed =
        employeeIndex === 0
          ? course.scenes.filter((scene) =>
              saved?.completedSceneIds.includes(scene.id),
            ).length
          : Math.floor(
              course.scenes.length *
                Math.max(
                  0,
                  Math.min(1, employee.fraction * courses.length - courseIndex),
                ),
            );
      const percent = course.scenes.length
        ? Math.round((completed / course.scenes.length) * 100)
        : 0;
      const started =
        completed > 0 ||
        saved?.status === 'in_progress' ||
        saved?.status === 'completed';
      return {
        id: course.id,
        title: course.title,
        total: course.scenes.length,
        completed,
        percent,
        status: statusOf(percent, started),
      };
    });
    const total = assignments.reduce((sum, course) => sum + course.total, 0);
    const completed = assignments.reduce(
      (sum, course) => sum + course.completed,
      0,
    );
    const percent = total ? Math.round((completed / total) * 100) : 0;
    return {
      ...employee,
      assignments,
      percent,
      status: statusOf(
        percent,
        assignments.some((course) => course.status !== 'Not started'),
      ),
    };
  });
  const filtered = employees.filter(
    (employee) =>
      `${employee.name} ${employee.code}`
        .toLowerCase()
        .includes(search.trim().toLowerCase()) &&
      (department === 'All departments' ||
        employee.department === department) &&
      (status === 'All statuses' || employee.status === status),
  );
  const completedEmployees = employees.filter(
    (employee) => employee.status === 'Completed',
  ).length;
  const startedEmployees = employees.filter(
    (employee) => employee.status !== 'Not started',
  ).length;
  const average = Math.round(
    employees.reduce((sum, employee) => sum + employee.percent, 0) /
      employees.length,
  );

  return (
    <div className="space-y-6">
      <section className="rounded-3xl bg-[#0a2540] p-6 text-white sm:p-8">
        <p className="text-xs font-bold uppercase tracking-widest text-amber-300">
          HR learning overview
        </p>
        <h1 className="mt-2 text-3xl font-extrabold">
          Employee progress tracker
        </h1>
        <p className="mt-3 max-w-2xl text-sm text-slate-300">
          Track learning participation, course completion, and employees who
          need a follow-up.
        </p>
        <Link
          href="/client-demo/dashboard"
          className="mt-4 inline-block text-sm font-semibold text-amber-300 underline underline-offset-4"
        >
          Back to employee dashboard
        </Link>
      </section>
      <p className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950">
        <strong>Client demonstration · Sample employees.</strong>{' '}
        {DEMO_USER.fullName}&apos;s row reflects learning progress saved in this
        browser. Other rows are fictional examples. This preview does not
        collect employee records across devices or provide HR access control.
      </p>
      <section
        aria-label="Workforce learning summary"
        className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4"
      >
        {[
          ['Employees', employees.length, 'In the demo roster'],
          [
            'Participation',
            `${Math.round((startedEmployees / employees.length) * 100)}%`,
            `${startedEmployees} employees have started`,
          ],
          [
            'Fully completed',
            completedEmployees,
            'Finished all assigned courses',
          ],
          [
            'Average progress',
            `${average}%`,
            'Across all employees and scenes',
          ],
        ].map(([label, value, detail]) => (
          <div
            key={label}
            className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
          >
            <p className="text-sm text-slate-600">{label}</p>
            <p className="mt-2 text-3xl font-extrabold text-[#203d68]">
              {value}
            </p>
            <p className="mt-2 text-xs text-slate-500">{detail}</p>
          </div>
        ))}
      </section>
      <section
        className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"
        aria-labelledby="employees-heading"
      >
        <div className="space-y-4 p-5">
          <h2 id="employees-heading" className="text-lg font-bold">
            All employees
          </h2>
          <div className="grid gap-3 md:grid-cols-3">
            <label className="space-y-1 text-xs font-semibold">
              Search employees
              <input
                className={fieldClass}
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Name or employee code"
                type="search"
              />
            </label>
            <label className="space-y-1 text-xs font-semibold">
              Department
              <select
                className={fieldClass}
                value={department}
                onChange={(event) => setDepartment(event.target.value)}
              >
                {[
                  'All departments',
                  ...new Set(employees.map((employee) => employee.department)),
                ].map((value) => (
                  <option key={value}>{value}</option>
                ))}
              </select>
            </label>
            <label className="space-y-1 text-xs font-semibold">
              Learning status
              <select
                className={fieldClass}
                value={status}
                onChange={(event) => setStatus(event.target.value)}
              >
                {[
                  'All statuses',
                  'Completed',
                  'In progress',
                  'Not started',
                ].map((value) => (
                  <option key={value}>{value}</option>
                ))}
              </select>
            </label>
          </div>
          <p role="status" className="text-xs text-slate-500">
            Showing {filtered.length} of {employees.length} employees. Summary
            cards cover the entire roster.
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <caption className="sr-only">
              Employee learning progress. Select View courses for individual
              course details.
            </caption>
            <thead className="border-y border-slate-200 bg-slate-50 text-xs text-slate-600">
              <tr>
                {[
                  'Employee',
                  'Department',
                  'Courses completed',
                  'Progress',
                  'Status',
                  'Details',
                ].map((heading) => (
                  <th
                    key={heading}
                    scope="col"
                    className="whitespace-nowrap px-5 py-3"
                  >
                    {heading}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map((employee) => (
                <Fragment key={employee.code}>
                  <tr
                    className={
                      selectedCode === employee.code ? 'bg-blue-50/60' : ''
                    }
                  >
                    <th scope="row" className="px-5 py-4 font-semibold">
                      <span className="block whitespace-nowrap">
                        {employee.name}
                      </span>
                      <span className="block text-xs font-normal text-slate-500">
                        {employee.code}
                        {employee.code === DEMO_USER.employeeCode
                          ? ' · This browser'
                          : ' · Sample'}
                      </span>
                    </th>
                    <td className="px-5 py-4">{employee.department}</td>
                    <td className="px-5 py-4">
                      {
                        employee.assignments.filter(
                          (course) => course.status === 'Completed',
                        ).length
                      }{' '}
                      / {courses.length}
                    </td>
                    <td className="px-5 py-4">
                      <ProgressBar value={employee.percent} />
                    </td>
                    <td className="whitespace-nowrap px-5 py-4">
                      <span
                        className={`rounded-full px-2 py-1 text-xs font-semibold ${employee.status === 'Completed' ? 'bg-emerald-100 text-emerald-800' : employee.status === 'In progress' ? 'bg-blue-100 text-blue-800' : 'bg-slate-100 text-slate-700'}`}
                      >
                        {employee.status}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      <button
                        type="button"
                        aria-label={`${selectedCode === employee.code ? 'Hide' : 'View'} courses for ${employee.name}`}
                        aria-expanded={selectedCode === employee.code}
                        aria-controls={`courses-${employee.code}`}
                        onClick={() =>
                          setSelectedCode((current) =>
                            current === employee.code ? null : employee.code,
                          )
                        }
                        className="whitespace-nowrap rounded-lg border border-blue-200 px-3 py-2 text-xs font-bold text-blue-800 hover:bg-blue-100 focus-visible:outline-2"
                      >
                        {selectedCode === employee.code
                          ? 'Hide courses -'
                          : 'View courses +'}
                      </button>
                    </td>
                  </tr>
                  <tr
                    id={`courses-${employee.code}`}
                    hidden={selectedCode !== employee.code}
                  >
                    <td colSpan={6} className="bg-blue-50/40 px-5 py-4">
                      <section aria-labelledby={`heading-${employee.code}`}>
                        <h3
                          id={`heading-${employee.code}`}
                          className="text-sm font-bold"
                        >
                          {employee.name} · Course progress
                        </h3>
                        <p className="mt-1 text-xs text-slate-500">
                          {employee.code === DEMO_USER.employeeCode
                            ? 'Progress saved in this browser'
                            : 'Sample progress for demonstration'}
                        </p>
                        <div className="mt-3 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                          {employee.assignments.map((course) => (
                            <article
                              key={course.id}
                              className="rounded-xl border border-slate-200 bg-white p-4"
                            >
                              <h4 className="text-sm font-semibold">
                                {course.title}
                              </h4>
                              <p className="my-3 text-xs text-slate-600">
                                {course.status} · {course.completed} /{' '}
                                {course.total} scenes completed
                              </p>
                              <ProgressBar value={course.percent} />
                            </article>
                          ))}
                        </div>
                      </section>
                    </td>
                  </tr>
                </Fragment>
              ))}
            </tbody>
          </table>
        </div>
        {filtered.length === 0 && (
          <div className="p-8 text-center">
            <p className="font-semibold">No employees match these filters.</p>
            <button
              type="button"
              onClick={() => {
                setSearch('');
                setDepartment('All departments');
                setStatus('All statuses');
              }}
              className="mt-3 text-sm font-bold text-blue-800 underline"
            >
              Clear filters
            </button>
          </div>
        )}
      </section>
    </div>
  );
}
