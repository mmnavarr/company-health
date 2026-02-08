"use client";

import { useEffect, useMemo, useState } from "react";
import { ApiClient, ApiRequestError, type Job } from "@/lib/api";

// Re-export Job type for convenience
export type { Job };

interface JobsListProps {
  companySlug: string | null;
  apiBaseUrl: string;
}

export function JobsList({ companySlug, apiBaseUrl }: JobsListProps) {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [departmentFilter, setDepartmentFilter] = useState<string>("");
  const [seniorityFilter, setSeniorityFilter] = useState<string>("");

  useEffect(() => {
    if (!companySlug) {
      setJobs([]);
      return;
    }

    const api = new ApiClient(apiBaseUrl);

    async function fetchJobs() {
      try {
        setIsLoading(true);
        setError(null);
        const data = await api.getCompanyJobs(companySlug!);
        setJobs(data);
      } catch (err) {
        if (err instanceof ApiRequestError) {
          setError(err.status === 404 ? "Company not found" : err.message);
        } else {
          setError(err instanceof Error ? err.message : "Failed to load jobs");
        }
        setJobs([]);
      } finally {
        setIsLoading(false);
      }
    }

    fetchJobs();
  }, [companySlug, apiBaseUrl]);

  // Reset filters when company changes
  useEffect(() => {
    setSearchQuery("");
    setDepartmentFilter("");
    setSeniorityFilter("");
  }, [companySlug]);

  // Get unique departments and seniority levels for filters
  const departments = useMemo(() => {
    const depts = new Set(jobs.map((j) => j.department).filter(Boolean));
    return Array.from(depts).sort() as string[];
  }, [jobs]);

  const seniorityLevels = useMemo(() => {
    const levels = new Set(jobs.map((j) => j.seniorityLevel).filter(Boolean));
    return Array.from(levels).sort() as string[];
  }, [jobs]);

  // Filter jobs based on search and filters
  const filteredJobs = useMemo(() => {
    return jobs.filter((job) => {
      const matchesSearch =
        !searchQuery ||
        job.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        job.department?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        job.location?.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesDepartment =
        !departmentFilter || job.department === departmentFilter;

      const matchesSeniority =
        !seniorityFilter || job.seniorityLevel === seniorityFilter;

      return matchesSearch && matchesDepartment && matchesSeniority;
    });
  }, [jobs, searchQuery, departmentFilter, seniorityFilter]);

  // Group jobs by department
  const jobsByDepartment = useMemo(() => {
    const grouped: Record<string, Job[]> = {};
    filteredJobs.forEach((job) => {
      const dept = job.department || "Other";
      if (!grouped[dept]) {
        grouped[dept] = [];
      }
      grouped[dept].push(job);
    });
    return Object.entries(grouped).sort(([a], [b]) => a.localeCompare(b));
  }, [filteredJobs]);

  if (!companySlug) {
    return (
      <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-8 text-center">
        <p className="text-slate-400">Select a company to view jobs</p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-8">
        <div className="flex items-center justify-center gap-3">
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-slate-600 border-t-indigo-500" />
          <span className="text-slate-400">Loading jobs...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-2xl border border-rose-800 bg-slate-900/40 p-8 text-center">
        <p className="text-rose-400">{error}</p>
        <button
          className="mt-4 rounded-lg border border-slate-700 px-4 py-2 text-slate-300 text-sm hover:bg-slate-800"
          onClick={() => window.location.reload()}
          type="button"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="flex flex-wrap gap-4">
        <div className="min-w-[200px] flex-1">
          <input
            className="h-10 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 text-slate-100 placeholder-slate-500 focus:border-indigo-500 focus:outline-none"
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search jobs..."
            type="text"
            value={searchQuery}
          />
        </div>
        <select
          className="h-10 rounded-lg border border-slate-700 bg-slate-900 px-3 text-slate-100 focus:border-indigo-500 focus:outline-none"
          onChange={(e) => setDepartmentFilter(e.target.value)}
          value={departmentFilter}
        >
          <option value="">All Departments</option>
          {departments.map((dept) => (
            <option key={dept} value={dept}>
              {dept}
            </option>
          ))}
        </select>
        <select
          className="h-10 rounded-lg border border-slate-700 bg-slate-900 px-3 text-slate-100 focus:border-indigo-500 focus:outline-none"
          onChange={(e) => setSeniorityFilter(e.target.value)}
          value={seniorityFilter}
        >
          <option value="">All Levels</option>
          {seniorityLevels.map((level) => (
            <option key={level} value={level}>
              {level}
            </option>
          ))}
        </select>
      </div>

      {/* Job count summary */}
      <div className="flex items-center justify-between">
        <p className="text-slate-400 text-sm">
          Showing {filteredJobs.length} of {jobs.length} jobs
        </p>
        {(searchQuery || departmentFilter || seniorityFilter) && (
          <button
            className="text-indigo-400 text-sm hover:text-indigo-300"
            onClick={() => {
              setSearchQuery("");
              setDepartmentFilter("");
              setSeniorityFilter("");
            }}
            type="button"
          >
            Clear filters
          </button>
        )}
      </div>

      {/* Jobs grouped by department */}
      {filteredJobs.length === 0 ? (
        <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-8 text-center">
          <p className="text-slate-400">
            {jobs.length === 0
              ? "No jobs available for this company"
              : "No jobs found matching your criteria"}
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {jobsByDepartment.map(([department, deptJobs]) => (
            <div
              className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/40"
              key={department}
            >
              <div className="border-slate-800 border-b bg-slate-900/60 px-5 py-3">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-slate-200">{department}</h3>
                  <span className="rounded-full bg-slate-800 px-2 py-0.5 text-slate-400 text-xs">
                    {deptJobs.length} {deptJobs.length === 1 ? "job" : "jobs"}
                  </span>
                </div>
              </div>
              <div className="divide-y divide-slate-800">
                {deptJobs.map((job) => (
                  <JobCard job={job} key={job.id} />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function JobCard({ job }: { job: Job }) {
  const applyLink = job.applyUrl || job.jobUrl || job.sourceUrl;

  return (
    <div className="px-5 py-4 transition-colors hover:bg-slate-800/30">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <h4 className="font-medium text-slate-100">{job.title}</h4>
          <div className="mt-1 flex flex-wrap items-center gap-2 text-slate-400 text-sm">
            {job.location && <span>{job.location}</span>}
            {job.remoteType && (
              <>
                {job.location && <span className="text-slate-600">|</span>}
                <span
                  className={`rounded px-1.5 py-0.5 text-xs ${
                    job.remoteType === "remote"
                      ? "bg-emerald-900/50 text-emerald-400"
                      : job.remoteType === "hybrid"
                        ? "bg-amber-900/50 text-amber-400"
                        : "bg-slate-800 text-slate-400"
                  }`}
                >
                  {job.remoteType}
                </span>
              </>
            )}
            {job.team && (
              <>
                <span className="text-slate-600">|</span>
                <span>{job.team}</span>
              </>
            )}
          </div>
          <div className="mt-2 flex flex-wrap gap-2">
            {job.seniorityLevel && (
              <span className="rounded bg-indigo-900/50 px-2 py-0.5 text-indigo-300 text-xs">
                {job.seniorityLevel}
              </span>
            )}
            {job.employmentType && (
              <span className="rounded bg-slate-800 px-2 py-0.5 text-slate-400 text-xs">
                {job.employmentType}
              </span>
            )}
            <span className="rounded bg-slate-800 px-2 py-0.5 text-slate-500 text-xs">
              via {job.source}
            </span>
          </div>
        </div>
        <a
          className="shrink-0 rounded-lg border border-indigo-600 bg-indigo-600/20 px-4 py-2 text-indigo-300 text-sm transition-colors hover:bg-indigo-600/30"
          href={applyLink}
          rel="noopener noreferrer"
          target="_blank"
        >
          Apply
        </a>
      </div>
    </div>
  );
}
