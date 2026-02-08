"use client";

import { useEffect, useState } from "react";
import { type Company, ApiClient, ApiRequestError } from "@/lib/api";

// Re-export Company type for convenience
export type { Company };

interface CompanyDropdownProps {
  selectedSlug: string | null;
  onSelect: (company: Company | null) => void;
  apiBaseUrl: string;
}

export function CompanyDropdown({
  selectedSlug,
  onSelect,
  apiBaseUrl,
}: CompanyDropdownProps) {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const api = new ApiClient(apiBaseUrl);

    async function fetchCompanies() {
      try {
        setIsLoading(true);
        const data = await api.getCompanies();
        setCompanies(data);
        setError(null);

        // Auto-select first company if none selected
        if (!selectedSlug && data.length > 0) {
          onSelect(data[0]);
        } else if (selectedSlug) {
          const selected = data.find((c) => c.slug === selectedSlug);
          if (selected) onSelect(selected);
        }
      } catch (err) {
        if (err instanceof ApiRequestError) {
          setError(err.message);
        } else {
          setError(err instanceof Error ? err.message : "Failed to load companies");
        }
      } finally {
        setIsLoading(false);
      }
    }

    fetchCompanies();
  }, [apiBaseUrl]);

  const selectedCompany = companies.find((c) => c.slug === selectedSlug);

  if (isLoading) {
    return (
      <div className="relative w-64">
        <div className="flex h-10 items-center rounded-lg border border-slate-700 bg-slate-900 px-3 text-slate-400">
          <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-slate-600 border-t-slate-400" />
          Loading...
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="relative w-64">
        <div className="flex h-10 items-center rounded-lg border border-rose-700 bg-slate-900 px-3 text-rose-400 text-sm">
          {error}
        </div>
      </div>
    );
  }

  if (companies.length === 0) {
    return (
      <div className="relative w-64">
        <div className="flex h-10 items-center rounded-lg border border-slate-700 bg-slate-900 px-3 text-slate-400 text-sm">
          No companies found
        </div>
      </div>
    );
  }

  return (
    <div className="relative w-64">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex h-10 w-full items-center justify-between rounded-lg border border-slate-700 bg-slate-900 px-3 text-left transition-colors hover:border-slate-600"
      >
        <span className="truncate text-slate-100">
          {selectedCompany?.name || "Select a company"}
        </span>
        <svg
          className={`h-4 w-4 text-slate-400 transition-transform ${isOpen ? "rotate-180" : ""}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 9l-7 7-7-7"
          />
        </svg>
      </button>

      {isOpen && (
        <>
          {/* Backdrop to close dropdown when clicking outside */}
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute z-50 mt-1 max-h-60 w-full overflow-auto rounded-lg border border-slate-700 bg-slate-900 shadow-lg">
            {companies.map((company) => (
              <button
                key={company.id}
                type="button"
                onClick={() => {
                  onSelect(company);
                  setIsOpen(false);
                }}
                className={`flex w-full items-center justify-between px-3 py-2 text-left transition-colors hover:bg-slate-800 ${
                  company.slug === selectedSlug ? "bg-slate-800" : ""
                }`}
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-slate-100">{company.name}</p>
                  <p className="truncate text-slate-500 text-xs">
                    {company.industry || "Unknown industry"}
                  </p>
                </div>
                <span className="ml-2 rounded-full bg-slate-800 px-2 py-0.5 text-slate-400 text-xs">
                  {company.activeJobsCount} jobs
                </span>
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
