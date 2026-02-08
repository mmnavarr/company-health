"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { NewsFeed } from "@/components/NewsFeed";
import {
  ApiClient,
  ApiRequestError,
  type Company,
  type DashboardData,
  getApiUrl,
} from "@/lib/api";

const API_BASE_URL = getApiUrl();

export default function Home() {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [selectedSlug, setSelectedSlug] = useState<string | null>(null);
  const [dashboard, setDashboard] = useState<DashboardData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const api = new ApiClient(API_BASE_URL);

  // Fetch companies list on mount
  useEffect(() => {
    async function fetchCompanies() {
      try {
        const data = await api.getCompanies();
        setCompanies(data);
        // Auto-select first company
        if (data.length > 0) {
          setSelectedSlug(data[0].slug);
        }
      } catch (err) {
        setError(
          err instanceof ApiRequestError
            ? err.message
            : "Failed to load companies"
        );
      }
    }
    fetchCompanies();
  }, []);

  // Fetch dashboard data when selected company changes
  useEffect(() => {
    if (!selectedSlug) {
      setIsLoading(false);
      return;
    }

    async function fetchDashboard() {
      try {
        setIsLoading(true);
        setError(null);
        const data = await api.getDashboard(selectedSlug!);
        setDashboard(data);
      } catch (err) {
        setError(
          err instanceof ApiRequestError
            ? err.message
            : "Failed to load dashboard"
        );
        setDashboard(null);
      } finally {
        setIsLoading(false);
      }
    }
    fetchDashboard();
  }, [selectedSlug]);

  if (error && !dashboard) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950 text-slate-100">
        <div className="text-center">
          <p className="text-lg text-rose-400">{error}</p>
          <button
            className="mt-4 rounded-lg border border-slate-700 px-4 py-2 text-slate-300 hover:bg-slate-800"
            onClick={() => window.location.reload()}
            type="button"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (isLoading || !dashboard) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950 text-slate-100">
        <div className="flex items-center gap-3">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-slate-600 border-t-indigo-500" />
          <span className="text-slate-400">Loading dashboard...</span>
        </div>
      </div>
    );
  }

  const {
    company,
    health,
    departmentDistribution,
    seniorityDistribution,
    recentRuns,
  } = dashboard;

  const growthBadge =
    health.growthIndicator === "expanding"
      ? "bg-emerald-100 text-emerald-700"
      : health.growthIndicator === "contracting"
        ? "bg-rose-100 text-rose-700"
        : "bg-slate-100 text-slate-700";

  // Calculate max values for progress bars
  const maxDeptValue = Math.max(
    ...departmentDistribution.map((d) => d.value),
    1
  );
  const maxSeniorityValue = Math.max(
    ...seniorityDistribution.map((s) => s.value),
    1
  );

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <div className="mx-auto w-full max-w-6xl px-6 py-10">
        <header className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
          <div>
            <div className="flex items-center gap-4">
              <p className="text-slate-400 text-sm uppercase tracking-[0.2em]">
                Company Health
              </p>
              <Link
                className="rounded-lg border border-indigo-600 bg-indigo-600/20 px-3 py-1 text-indigo-300 text-sm transition-colors hover:bg-indigo-600/30"
                href="/jobs"
              >
                View Jobs
              </Link>
            </div>
            <div className="mt-2 flex items-center gap-3">
              <h1 className="font-semibold text-4xl">{company.name}</h1>
              {companies.length > 1 && (
                <select
                  className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-1 text-slate-300 text-sm focus:border-indigo-500 focus:outline-none"
                  onChange={(e) => setSelectedSlug(e.target.value)}
                  value={selectedSlug || ""}
                >
                  {companies.map((c) => (
                    <option key={c.id} value={c.slug}>
                      {c.name}
                    </option>
                  ))}
                </select>
              )}
            </div>
            <div className="mt-2 flex flex-wrap gap-3 text-slate-400 text-sm">
              {company.industry && <span>{company.industry}</span>}
              {company.companySize && (
                <>
                  <span>•</span>
                  <span>{company.companySize} employees</span>
                </>
              )}
              {company.headquartersLocation && (
                <>
                  <span>•</span>
                  <span>{company.headquartersLocation}</span>
                </>
              )}
              {company.ashbyBoardName && (
                <>
                  <span>•</span>
                  <span>{company.ashbyBoardName}.ashby</span>
                </>
              )}
            </div>
          </div>
          <div className="rounded-2xl border border-slate-800 bg-slate-900/40 px-6 py-4">
            <div className="flex items-center gap-4">
              <div className="font-semibold text-5xl">
                {health.score.toFixed(1)}
              </div>
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

        <section className="mt-10">
          <h2 className="font-semibold text-slate-100 text-xl tracking-tight">
            Jobs
          </h2>
          <div className="mt-4 grid gap-6 md:grid-cols-3">
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
                      {health.jobVelocityScore.toFixed(1)}
                    </span>
                  </div>
                  <div className="mt-2 h-2 rounded-full bg-slate-800">
                    <div
                      className="h-2 rounded-full bg-emerald-500"
                      style={{ width: `${health.jobVelocityScore}%` }}
                    />
                  </div>
                </div>
                <div>
                  <div className="flex items-center justify-between text-slate-400 text-sm">
                    <span>Department diversity</span>
                    <span className="text-slate-200">
                      {health.departmentDiversityScore.toFixed(1)}
                    </span>
                  </div>
                  <div className="mt-2 h-2 rounded-full bg-slate-800">
                    <div
                      className="h-2 rounded-full bg-indigo-400"
                      style={{ width: `${health.departmentDiversityScore}%` }}
                    />
                  </div>
                </div>
                <div>
                  <div className="flex items-center justify-between text-slate-400 text-sm">
                    <span>Location diversity</span>
                    <span className="text-slate-200">
                      {health.locationDiversityScore.toFixed(1)}
                    </span>
                  </div>
                  <div className="mt-2 h-2 rounded-full bg-slate-800">
                    <div
                      className="h-2 rounded-full bg-sky-400"
                      style={{ width: `${health.locationDiversityScore}%` }}
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
                {health.growthIndicator === "expanding" && (
                  <li className="rounded-lg border border-slate-800 bg-slate-950/40 p-3">
                    Hiring is accelerating with {health.jobsAdded30d} new roles
                    in 30 days.
                  </li>
                )}
                {health.growthIndicator === "contracting" && (
                  <li className="rounded-lg border border-slate-800 bg-slate-950/40 p-3">
                    Hiring has slowed with {health.jobsRemoved30d} roles removed
                    recently.
                  </li>
                )}
                {health.growthIndicator === "stable" && (
                  <li className="rounded-lg border border-slate-800 bg-slate-950/40 p-3">
                    Hiring is stable with balanced job additions and removals.
                  </li>
                )}
                {departmentDistribution.length > 0 && (
                  <li className="rounded-lg border border-slate-800 bg-slate-950/40 p-3">
                    Most hiring in {departmentDistribution[0]?.name} (
                    {departmentDistribution[0]?.value} roles).
                  </li>
                )}
                {health.jobsRemoved30d < health.totalActiveJobs * 0.1 && (
                  <li className="rounded-lg border border-slate-800 bg-slate-950/40 p-3">
                    Job removals remain below the 10% risk threshold.
                  </li>
                )}
              </ul>
            </div>
          </div>
        </section>

        <section className="mt-4 grid gap-6 lg:grid-cols-3">
          <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-5 lg:col-span-2">
            <div className="flex items-center justify-between">
              <p className="font-semibold text-slate-200 text-sm">
                Department distribution
              </p>
              <span className="text-slate-500 text-xs">
                {health.totalActiveJobs} active jobs
              </span>
            </div>
            {departmentDistribution.length === 0 ? (
              <p className="mt-4 text-slate-500 text-sm">
                No department data available
              </p>
            ) : (
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
                        style={{
                          width: `${(item.value / maxDeptValue) * 100}%`,
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-5">
            <p className="font-semibold text-slate-200 text-sm">
              Seniority mix
            </p>
            {seniorityDistribution.length === 0 ? (
              <p className="mt-4 text-slate-500 text-sm">
                No seniority data available
              </p>
            ) : (
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
                        style={{
                          width: `${(item.value / maxSeniorityValue) * 100}%`,
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>

        <section className="mt-10 rounded-2xl border border-slate-800 bg-slate-900/40 p-5">
          <div className="flex items-center justify-between">
            <p className="font-semibold text-slate-200 text-sm">
              Recent scraping runs
            </p>
            <button
              className="rounded-full border border-slate-700 px-4 py-1 text-slate-300 text-xs transition-colors hover:bg-slate-800"
              type="button"
            >
              Trigger scrape
            </button>
          </div>
          {recentRuns.length === 0 ? (
            <p className="mt-4 text-slate-500 text-sm">No scraping runs yet</p>
          ) : (
            <div className="mt-4 grid gap-3 md:grid-cols-3">
              {recentRuns.slice(0, 3).map((run, index: number) => (
                <div
                  className="rounded-lg border border-slate-800 bg-slate-950/40 p-3 text-sm"
                  key={`${run.source}-${run.completedAt}-${index}`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400 uppercase">
                      {run.source}
                    </span>
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs ${
                        run.status === "completed"
                          ? "bg-emerald-100 text-emerald-700"
                          : run.status === "running"
                            ? "bg-amber-100 text-amber-700"
                            : "bg-rose-100 text-rose-700"
                      }`}
                    >
                      {run.status}
                    </span>
                  </div>
                  <p className="mt-2 text-slate-500 text-xs">
                    {run.completedAt || "In progress..."}
                  </p>
                  <div className="mt-3 grid grid-cols-2 gap-2 text-slate-300 text-xs">
                    <span>Found: {run.jobsFound}</span>
                    <span>New: {run.jobsNew}</span>
                    <span>Updated: {run.jobsUpdated}</span>
                    <span>Removed: {run.jobsRemoved}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="mt-10">
          <NewsFeed companySlug={selectedSlug!} limit={5} />
        </section>
      </div>
    </div>
  );
}
