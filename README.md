# Company Health

A system that monitors job postings, news, and fundraising rounds to assess company health metrics. Built with Bun, ElysiaJS, Prisma, and Next.js.

## Repository Structure

```
company-health/
├── backend/                        # Backend service (Bun + ElysiaJS)
│   ├── src/
│   │   ├── api/                    # REST API layer (ElysiaJS)
│   │   │   ├── index.ts            # API entrypoint & server setup
│   │   │   └── routes/             # Route handlers
│   │   │       ├── companies.ts    # Company CRUD & job listings
│   │   │       ├── dashboard.ts    # Dashboard aggregate data
│   │   │       ├── fundraising.ts  # Funding rounds & summaries
│   │   │       ├── jobs.ts         # Job posting endpoints
│   │   │       └── news.ts         # News article endpoints
│   │   ├── jobs/                   # ELT pipeline orchestrators
│   │   │   ├── index.ts            # Base Job class
│   │   │   ├── ashby-elt.ts        # Ashby job board scraping pipeline
│   │   │   ├── news-elt.ts         # News article scraping pipeline
│   │   │   └── fundraising-elt.ts  # Fundraising data scraping pipeline
│   │   ├── services/
│   │   │   ├── scraping/           # Data source scrapers
│   │   │   │   ├── ashby-scraper.ts          # Ashby job board API
│   │   │   │   ├── tavily-news-scraper.ts    # Tavily news search
│   │   │   │   └── tavily-funding-scraper.ts # Tavily funding search
│   │   │   ├── data-processor/     # Normalization, dedup & DB sync
│   │   │   │   ├── job-processor.ts          # Job posting upserts
│   │   │   │   ├── news-processor.ts         # News article upserts
│   │   │   │   └── fundraising-processor.ts  # Funding round extraction & upserts
│   │   │   ├── llm/                # LLM-powered extraction
│   │   │   │   └── funding-extraction.ts     # OpenAI structured extraction for funding data
│   │   │   └── health-metrics/     # Health score calculation
│   │   ├── lib/
│   │   │   ├── prisma.ts           # Prisma client singleton (Bun adapter)
│   │   │   └── storage.ts          # Vercel Blob storage wrapper
│   │   ├── types/                  # Shared TypeScript types
│   │   └── utils/                  # Helpers (hashing, slugify, etc.)
│   ├── prisma/
│   │   ├── schema.prisma           # Database schema
│   │   └── migrations/             # SQL migration files
│   ├── generated/prisma/           # Generated Prisma client (git-ignored)
│   ├── scripts/                    # CLI runner scripts for ELT jobs
│   └── .env                        # Environment variables (not committed)
├── frontend/                       # Next.js dashboard UI
│   └── src/
│       ├── app/                    # Next.js app router pages
│       ├── components/             # React components
│       └── lib/api.ts              # Backend API client
└── specs/
    └── TDD.md                      # Technical design document
```

## Tech Stack

| Layer       | Technology                                      |
|-------------|------------------------------------------------|
| Runtime     | [Bun](https://bun.sh)                          |
| API         | [ElysiaJS](https://elysiajs.com) (type-safe)   |
| Database    | PostgreSQL (Supabase)                           |
| ORM         | [Prisma](https://prisma.io) with Bun adapter   |
| Blob Storage| [Vercel Blob](https://vercel.com/docs/storage/blob) |
| Search      | [Tavily](https://tavily.com) (news & funding)  |
| LLM         | OpenAI (structured funding data extraction)     |
| Frontend    | [Next.js](https://nextjs.org) + Tailwind CSS   |

## Getting Started

### Prerequisites

- [Bun](https://bun.sh) v1.3+
- PostgreSQL database (Supabase recommended)
- API keys for Tavily, OpenAI, and Vercel Blob

### Install Dependencies

```bash
# From the repo root
bun install

# Backend dependencies
cd backend && bun install

# Frontend dependencies
cd frontend && bun install
```

### Environment Variables

Create `backend/.env` with the following keys:

```env
# Database (Supabase)
POSTGRES_URL_NON_POOLING=postgres://...

# Tavily (news & funding search)
TAVILY_API_KEY=tvly-...

# Vercel Blob (raw data storage)
BLOB_READ_WRITE_TOKEN=vercel_blob_rw_...

# OpenAI (funding data extraction)
OPENAI_API_KEY=sk-proj-...
```

### Database Setup

```bash
cd backend

# Generate Prisma client
bun prisma generate

# Push schema to database (development)
bun prisma db push

# Or run migrations (production)
bun prisma migrate deploy
```

## Running the API Server

```bash
cd backend

# Development (with hot reload)
bun run dev

# Production
bun run start

# API-only server (no job service)
bun run src/api/index.ts
```

The API runs at `http://localhost:3000`. Key endpoints:

| Endpoint                          | Description                        |
|-----------------------------------|------------------------------------|
| `GET /health`                     | Health check                       |
| `GET /api/companies`              | List all companies                 |
| `GET /api/companies/:slug`        | Company details                    |
| `GET /api/companies/:slug/jobs`   | Job listings for a company         |
| `GET /api/dashboard/:slug`        | Full dashboard data (metrics, distributions, runs) |
| `GET /api/news/:slug`             | News articles for a company        |
| `GET /api/fundraising/:slug`      | Funding rounds & summary           |

## Running the Frontend

```bash
cd frontend
bun run dev
```

Runs at `http://localhost:3001` (or the next available port).

## Running ELT Jobs

Each ELT pipeline follows a 3-layer pattern: **Extract** (scrape) -> **Load** (store raw to blob) -> **Transform** (normalize & write to DB).

All scripts accept an optional company slug argument (defaults to `rain`).

### Ashby Jobs ELT

Scrapes job postings from a company's Ashby job board, stores raw JSON to blob storage, and upserts normalized job data to the database.

```bash
cd backend

# Default company (rain)
bun run elt:ashby

# Specific company
bun run elt:ashby -- acme
```

### News ELT

Searches for company news articles via the Tavily Search API, stores raw results to blob, and upserts articles to the database. Uses the company's `description` field (if set) to disambiguate search queries.

```bash
cd backend

bun run elt:news

bun run elt:news -- acme
```

### Fundraising ELT

Searches for funding announcements via Tavily, stores raw results to blob, extracts structured funding round data using OpenAI, and upserts rounds with deduplication. Uses the company's `description` field (if set) to disambiguate search queries.

```bash
cd backend

bun run elt:fundraising

bun run elt:fundraising -- acme
```

## Database Schema

Core models managed via Prisma (`backend/prisma/schema.prisma`):

- **Company** — Tracked companies with metadata, description, and linked board names
- **JobPosting** — Normalized job listings from any scraper source
- **NewsArticle** — News articles fetched via Tavily
- **FundraisingSummary** — Aggregate funding totals per company
- **FundingRound** — Individual funding rounds with investor data
- **ScrapingRun** — Audit log of every ELT pipeline execution
- **CompanyHealthMetric** — Point-in-time health scores and distributions

Migrations live in `backend/prisma/migrations/` and are applied in order.

## Data Storage

- **PostgreSQL** (Supabase) — Primary relational store for all structured data
- **Vercel Blob** — Raw scraping results (JSON) stored per-run for auditability and reprocessing
