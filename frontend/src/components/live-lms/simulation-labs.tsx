export function SimulationLabs() {
  return (
    <section className="space-y-5">
      <h1 className="text-3xl font-bold">Simulation lab</h1>
      <p className="text-slate-600">
        Explore the factory twin, coating layer peeler, inspector optics,
        metrology bench, defect atlas and shop-floor practice exam. Course
        progress is saved through the course lessons and quizzes.
      </p>
      <iframe
        title="Welspun simulation labs"
        src="/learning/welspun-reference.html#labs"
        sandbox="allow-scripts"
        className="h-[850px] w-full rounded-xl border bg-white"
      />
    </section>
  );
}
