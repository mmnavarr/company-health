# Job Service

Company health job scraping and analysis system. TypeScript implementation of the design in **[specs/TDD.md](specs/TDD.md)**.

## Stack

- **Runtime**: [Bun](https://bun.sh)
- **Language**: TypeScript (strict, ESM)

## Setup

```bash
bun install
```

## Scripts

| Command | Description |
|---------|-------------|
| `bun run dev` | Run with watch |
| `bun run start` | Run once |
| `bun run build` | Build for Bun |
| `bun test` | Run tests |
| `bun run typecheck` | TypeScript check |

## Layout

- `src/types/` — Domain types (Company, JobPosting, ScrapingRun, etc.) from TDD §3
- `src/scraping/` — Scrapers (LinkedIn, Ashby, website) — TDD §4
- `src/data/` — Normalization, deduplication — TDD §5
- `src/analytics/` — Health metrics, growth indicator — TDD §6
- `src/api/` — REST API surface — TDD §8

## Design

See **[specs/TDD.md](specs/TDD.md)** for architecture, data model, scraping strategy, and API design.





## Design Brain Dump

The job service is an ELT (not ETL) pipeline. Ingestors scrape the data and post their contents to persisted message bus (initial MVP will call functions directly) so that we have persistence, fault tolerance and replayability. The data processoring layer will then pick up the ingested jobs and be responsible for writing to storage the raw contents. The transformation layer will be responsible for parsing and extracting fields into a normalized model that is writing to the data store.

1. Scraping Run Initiated
   ├─▶ LinkedIn Scraper fetches jobs
   ├─▶ Ashby Scraper fetches jobs
   └─▶ Website Scraper fetches jobs
        │
        ▼
2. Raw Data Processing
   ├─▶ Parse HTML/JSON
   ├─▶ Extract structured fields
   └─▶ Store raw HTML to the database (could use object storage for flexibility)
        │
        ▼
3. Transformation: Normalization & Deduplication
   ├─▶ Standardize field formats
   ├─▶ Check for existing job by external_id
   ├─▶ Detect changes via description hash
   └─▶ Update or insert to normalized job_postings

Pros: Loading job contents to data store immediately after injestion keeps it flexible in case we eventually want to change how we do parsing / extraction (libraries are sprouting like weeds doing html -> markdown better and better).

Cons: Transparency, telemetry and configurability. A workflow orchestration tool like Temporal would allow us to skip queues / pubsub and call individual activities with built-in retires, backoffs, etc. and provide out-of-the-box visibility into the workflow activity inputs / outputs during execution.