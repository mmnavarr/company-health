export default function Home() {
  const company = {
    name: "Rain",
    domain: "rain.ashby",
    industry: "Fintech",
    companySize: "51-200",
    headquartersLocation: "San Francisco, CA",
  };

  const health = {
    score: 78.4,
    growthIndicator: "expanding",
    totalActiveJobs: 42,
    jobsAdded7d: 9,
    jobsRemoved7d: 2,
    jobsAdded30d: 18,
    jobsRemoved30d: 6,
    jobVelocityScore: 22.5,
    departmentDiversityScore: 68.2,
    locationDiversityScore: 54.9,
    lastUpdated: "2026-02-07",
  };

  const departmentDistribution = [
    { name: "Engineering", value: 16 },
    { name: "Product", value: 6 },
    { name: "Sales", value: 7 },
    { name: "Marketing", value: 5 },
    { name: "Operations", value: 4 },
    { name: "Finance", value: 4 },
  ];

  const seniorityDistribution = [
    { name: "Entry", value: 7 },
    { name: "Mid", value: 18 },
    { name: "Senior", value: 12 },
    { name: "Staff+", value: 5 },
  ];

  const recentRuns = [
    {
      source: "ashby",
      status: "completed",
      jobsFound: 42,
      jobsNew: 6,
      jobsUpdated: 3,
      jobsRemoved: 1,
      completedAt: "2026-02-07 10:42",
    },
    {
      source: "linkedin",
      status: "completed",
      jobsFound: 31,
      jobsNew: 4,
      jobsUpdated: 2,
      jobsRemoved: 1,
      completedAt: "2026-02-07 09:58",
    },
    {
      source: "website",
      status: "failed",
      jobsFound: 0,
      jobsNew: 0,
      jobsUpdated: 0,
      jobsRemoved: 0,
      completedAt: "2026-02-07 09:40",
    },
  ];

  const growthBadge =
    health.growthIndicator === "expanding"
      ? "bg-emerald-100 text-emerald-700"
      : health.growthIndicator === "contracting"
        ? "bg-rose-100 text-rose-700"
        : "bg-slate-100 text-slate-700";

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <div className="mx-auto w-full max-w-6xl px-6 py-10">
        <header className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-slate-400 text-sm uppercase tracking-[0.2em]">
              Company Health
            </p>
            <h1 className="font-semibold text-4xl">{company.name}</h1>
            <div className="mt-2 flex flex-wrap gap-3 text-slate-400 text-sm">
              <span>{company.industry}</span>
              <span>•</span>
              <span>{company.companySize} employees</span>
              <span>•</span>
              <span>{company.headquartersLocation}</span>
              <span>•</span>
              <span>{company.domain}</span>
            </div>
          </div>
          <div className="rounded-2xl border border-slate-800 bg-slate-900/40 px-6 py-4">
            <div className="flex items-center gap-4">
              <div className="font-semibold text-5xl">{health.score}</div>
              <div>
                <p className="text-slate-400 text-sm">Health score</p>
                <span
                  className={`mt-2 inline-flex rounded-full px-3 py-1 font-semibold text-xs ${growthBadge}`}
                >
                  {health.growthIndicator}
                </span>
              </div>
            </div>
            <p className="mt-2 text-slate-500 text-xs">
              Updated {health.lastUpdated}
            </p>
          </div>
        </header>

        <section className="mt-10 grid gap-6 md:grid-cols-3">
          <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-5">
            <p className="text-slate-500 text-xs uppercase tracking-[0.2em]">
              Active jobs
            </p>
            <p className="mt-3 font-semibold text-3xl">
              {health.totalActiveJobs}
            </p>
            <div className="mt-4 grid grid-cols-2 gap-3 text-slate-400 text-sm">
              <div>
                <p className="text-slate-500 text-xs">Added (7d)</p>
                <p className="text-base text-emerald-400">
                  {health.jobsAdded7d}
                </p>
              </div>
              <div>
                <p className="text-slate-500 text-xs">Removed (7d)</p>
                <p className="text-base text-rose-400">
                  {health.jobsRemoved7d}
                </p>
              </div>
              <div>
                <p className="text-slate-500 text-xs">Added (30d)</p>
                <p className="text-base text-emerald-400">
                  {health.jobsAdded30d}
                </p>
              </div>
              <div>
                <p className="text-slate-500 text-xs">Removed (30d)</p>
                <p className="text-base text-rose-400">
                  {health.jobsRemoved30d}
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-5">
            <p className="text-slate-500 text-xs uppercase tracking-[0.2em]">
              Velocity & diversity
            </p>
            <div className="mt-4 space-y-4">
              <div>
                <div className="flex items-center justify-between text-slate-400 text-sm">
                  <span>Job velocity score</span>
                  <span className="text-slate-200">
                    {health.jobVelocityScore}
                  </span>
                </div>
                <div className="mt-2 h-2 rounded-full bg-slate-800">
                  <div
                    className="h-2 rounded-full bg-emerald-500"
                    style={{ width: "72%" }}
                  />
                </div>
              </div>
              <div>
                <div className="flex items-center justify-between text-slate-400 text-sm">
                  <span>Department diversity</span>
                  <span className="text-slate-200">
                    {health.departmentDiversityScore}
                  </span>
                </div>
                <div className="mt-2 h-2 rounded-full bg-slate-800">
                  <div
                    className="h-2 rounded-full bg-indigo-400"
                    style={{ width: "68%" }}
                  />
                </div>
              </div>
              <div>
                <div className="flex items-center justify-between text-slate-400 text-sm">
                  <span>Location diversity</span>
                  <span className="text-slate-200">
                    {health.locationDiversityScore}
                  </span>
                </div>
                <div className="mt-2 h-2 rounded-full bg-slate-800">
                  <div
                    className="h-2 rounded-full bg-sky-400"
                    style={{ width: "55%" }}
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-5">
            <p className="text-slate-500 text-xs uppercase tracking-[0.2em]">
              Signals
            </p>
            <ul className="mt-4 space-y-3 text-slate-300 text-sm">
              <li className="rounded-lg border border-slate-800 bg-slate-950/40 p-3">
                Hiring is accelerating in engineering and sales.
              </li>
              <li className="rounded-lg border border-slate-800 bg-slate-950/40 p-3">
                Remote roles expanded to 3 new regions in 30 days.
              </li>
              <li className="rounded-lg border border-slate-800 bg-slate-950/40 p-3">
                Job removals remain below the 10% risk threshold.
              </li>
            </ul>
          </div>
        </section>

        <section className="mt-10 grid gap-6 lg:grid-cols-3">
          <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-5 lg:col-span-2">
            <div className="flex items-center justify-between">
              <p className="font-semibold text-slate-200 text-sm">
                Department distribution
              </p>
              <span className="text-slate-500 text-xs">last 30 days</span>
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {departmentDistribution.map((item) => (
                <div
                  className="rounded-lg border border-slate-800 bg-slate-950/40 p-3"
                  key={item.name}
                >
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-300">{item.name}</span>
                    <span className="text-slate-100">{item.value}</span>
                  </div>
                  <div className="mt-2 h-2 rounded-full bg-slate-800">
                    <div
                      className="h-2 rounded-full bg-indigo-500"
                      style={{ width: `${(item.value / 20) * 100}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-5">
            <p className="font-semibold text-slate-200 text-sm">
              Seniority mix
            </p>
            <div className="mt-4 space-y-3">
              {seniorityDistribution.map((item) => (
                <div key={item.name}>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-300">{item.name}</span>
                    <span className="text-slate-100">{item.value}</span>
                  </div>
                  <div className="mt-2 h-2 rounded-full bg-slate-800">
                    <div
                      className="h-2 rounded-full bg-emerald-500"
                      style={{ width: `${(item.value / 20) * 100}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="mt-10 rounded-2xl border border-slate-800 bg-slate-900/40 p-5">
          <div className="flex items-center justify-between">
            <p className="font-semibold text-slate-200 text-sm">
              Recent scraping runs
            </p>
            <button className="rounded-full border border-slate-700 px-4 py-1 text-slate-300 text-xs">
              Trigger scrape
            </button>
          </div>
          <div className="mt-4 grid gap-3 md:grid-cols-3">
            {recentRuns.map((run) => (
              <div
                className="rounded-lg border border-slate-800 bg-slate-950/40 p-3 text-sm"
                key={`${run.source}-${run.completedAt}`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-slate-400 uppercase">{run.source}</span>
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs ${
                      run.status === "completed"
                        ? "bg-emerald-100 text-emerald-700"
                        : "bg-rose-100 text-rose-700"
                    }`}
                  >
                    {run.status}
                  </span>
                </div>
                <p className="mt-2 text-slate-500 text-xs">{run.completedAt}</p>
                <div className="mt-3 grid grid-cols-2 gap-2 text-slate-300 text-xs">
                  <span>Found: {run.jobsFound}</span>
                  <span>New: {run.jobsNew}</span>
                  <span>Updated: {run.jobsUpdated}</span>
                  <span>Removed: {run.jobsRemoved}</span>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
