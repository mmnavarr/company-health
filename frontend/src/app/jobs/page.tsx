"use client";

import { useState } from "react";
import Link from "next/link";
import { CompanyDropdown, type Company } from "@/components/CompanyDropdown";
import { JobsList } from "@/components/JobsList";
import { getApiUrl } from "@/lib/api";

const API_BASE_URL = getApiUrl();

export default function JobsPage() {
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <div className="mx-auto w-full max-w-6xl px-6 py-10">
        {/* Header */}
        <header className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
          <div>
            <div className="flex items-center gap-4">
              <Link
                href="/"
                className="text-slate-400 text-sm uppercase tracking-[0.2em] transition-colors hover:text-slate-200"
              >
                Company Health
              </Link>
            </div>
            <h1 className="font-semibold text-4xl">Jobs Board</h1>
            <p className="mt-2 text-slate-400 text-sm">
              Browse open positions across tracked companies
            </p>
          </div>
          <CompanyDropdown
            selectedSlug={selectedCompany?.slug || null}
            onSelect={setSelectedCompany}
            apiBaseUrl={API_BASE_URL}
          />
        </header>

        {/* Company info banner */}
        {selectedCompany && (
          <div className="mt-8 rounded-2xl border border-slate-800 bg-slate-900/40 px-6 py-4">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <h2 className="font-semibold text-xl text-slate-100">
                  {selectedCompany.name}
                </h2>
                <div className="mt-1 flex flex-wrap gap-3 text-slate-400 text-sm">
                  {selectedCompany.industry && (
                    <span>{selectedCompany.industry}</span>
                  )}
                  {selectedCompany.companySize && (
                    <>
                      <span className="text-slate-600">|</span>
                      <span>{selectedCompany.companySize} employees</span>
                    </>
                  )}
                  {selectedCompany.headquartersLocation && (
                    <>
                      <span className="text-slate-600">|</span>
                      <span>{selectedCompany.headquartersLocation}</span>
                    </>
                  )}
                </div>
              </div>
              <div className="rounded-xl bg-indigo-900/30 px-4 py-2 text-center">
                <p className="font-semibold text-2xl text-indigo-300">
                  {selectedCompany.activeJobsCount}
                </p>
                <p className="text-indigo-400 text-xs">Active Jobs</p>
              </div>
            </div>
          </div>
        )}

        {/* Jobs list */}
        <section className="mt-8">
          <JobsList
            companySlug={selectedCompany?.slug || null}
            apiBaseUrl={API_BASE_URL}
          />
        </section>
      </div>
    </div>
  );
}
