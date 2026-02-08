

# Technical Design Document: Company Health Job Scraping System

## 1. Executive Summary

### 1.1 Overview
This document outlines the technical architecture for a Company Health system that monitors job postings, news, fundraising rounds, web traffic, internal metrics and more to assess company health metrics.

### 1.2 Objectives
- Automatically discover and scrape job postings from multiple sources
- Automatically discover fundraising rounds
- Ingest news to detect sentiment and media presence
- Normalize and store job data in a unified format
- Track changes for documents and metrics over time
- Provide metrics for assessing company health and growth trajectories

---

## 2. System Architecture

### 2.1 High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Scraping System                      │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐  │
│  │   Scraping   │    │     Data     │    │  Analytics   │  │
│  │   Layer      │───▶│  Processing  │───▶│   Engine     │  │
│  │              │    │    Layer     │    │              │  │
│  └──────────────┘    └──────────────┘    └──────────────┘  │
│         │                    │                    │          │
│         ▼                    ▼                    ▼          │
│  ┌──────────────────────────────────────────────────────┐  │
│  │              Data Storage Layer                       │  │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────────────┐  │  │
│  │  │PostgreSQL│  │  Redis   │  │  Object Storage  │  │  │
│  │  └──────────┘  └──────────┘  └──────────────────┘  │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                               │
│  ┌──────────────────────────────────────────────────────┐  │
│  │              Orchestration Layer                      │  │
│  │                    (Temporal)                          │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
         │                                          │
         ▼                                          ▼
  ┌─────────────┐                           ┌─────────────┐
  │   API/UI    │                           │ Monitoring  │
  │   Layer     │                           │   & Alerts  │
  └─────────────┘                           └─────────────┘
```

### 2.2 Component Descriptions

#### 2.2.1 Scraping Layer
**Purpose**: Extract job posting data from multiple sources

**Components**:
Scrapers:
- **LinkedIn Scraper**: Scrapes LinkedIn job postings
- **Ashby Scraper**: Scrapes Ashby-hosted career pages
- **Website Scraper**: Generic scraper for company career pages
- **Tavily News Scraper**: Fetches company news articles via Tavily Search API
- **Tavily Funding Scraper**: Searches for funding announcements and investment rounds via Tavily Search API, with keyword filtering for funding-related content
Web Analysis:
- **Web Traffic Observer**: Fetches web traffic metrics for the company domain
- **SEO Presence Observer**: Fetches SEO metrics for the company domain


#### 2.2.2 Data Processing Layer
**Purpose**: Normalize, deduplicate, and enrich job data

**Components**: (EASY TO DO, HARD TO DO WELL!)
- **Data Normalizer**: Standardizes job data across sources
- **Deduplication Engine**: Identifies and merges duplicate postings
- **Entity Extractor**: Extracts skills, locations, seniority levels
- **Change Detector**: Identifies new, updated, or removed postings

#### 2.2.3 Analytics Engine
**Purpose**: Generate company health metrics

**Components**:
- **Metrics Calculator**: Computes health scores and trends
- **Anomaly Detector**: Identifies unusual hiring patterns
- **Report Generator**: Creates summary reports and visualizations

#### 2.2.4 Data Storage Layer
**Purpose**: Persist all system data

**Components**:
- **PostgreSQL**: Primary relational database
- **Redis**: Caching and job queue
- **Object Storage (S3/GCS)**: Raw HTML snapshots and backups

---

### 3. Data Flow / Implementation (Job Example)

**Approach**: Use a mixture of direct API / web scraping to fetch jobs (depends on what fields the Company has available in registry)

**Challenges & Solutions**:
- **Detecting diffs**: Not easy due to dynamicness of HTML in web scraping use case
- **Extracting metadata**: Again, for web scraping case extrapolating on the job posting raw's contents is not trivial / consistent

```
1. Scraping Run Initiated
   ├─▶ LinkedIn Scraper fetches jobs
   ├─▶ Ashby Scraper fetches jobs
   └─▶ Website Scraper fetches jobs
        │
        ▼
2. Raw Data Processing
   ├─▶ Store raw HTML to object storage
   ├─▶ Parse HTML/JSON (many ways to do this)
   └─▶ Extract structured fields
        │
        ▼
3. Normalization & Deduplication (Hard)
   ├─▶ Standardize field formats
   ├─▶ Check for existing job by external_id
   ├─▶ Detect changes via description hash (Not thi simple)
   └─▶ Update or insert job_postings
        │
        ▼
4. Change Detection
   ├─▶ Compare with previous snapshot
   ├─▶ Mark removed jobs (removed_at)
   ├─▶ Create new job_snapshots
   └─▶ Update scraping_runs stats
        │
        ▼
5. Metrics Calculation
   ├─▶ Aggregate job counts
   ├─▶ Calculate velocity scores
   ├─▶ Compute diversity metrics
   └─▶ Generate health_score
        │
        ▼
6. Storage & Alerting
   ├─▶ Insert company_health_metrics
   └─▶ Trigger alerts for anomalies
```
---

## 4. Orchestration & Scheduling

### 4.1 Workflow Architecture

**Option 1**: Pubsub / Queue (traditional approach)
**Option 2**: Workflow orchestrator (e.g. Temporal)

The job service for example is an ELT (not ETL) pipeline. Ingestors scrape the data (initial MVP calls functions directly) and proceed with the workflow in the same parent function. With a queue / workflow orchestration we would have better persistence, fault tolerance and replayability. The data processoring layer will then pick up the ingested jobs and be responsible for writing to storage the raw contents. The transformation layer will be responsible for parsing and extracting fields into a normalized model that is writing to the data store. There can be many more steps in this process for better deduping, normalization, anomaly detection, alert detectiong, etc.

Pros: Loading job contents to data store immediately after injestion keeps it flexible in case we eventually want to change how we do parsing / extraction (libraries are sprouting like weeds doing html -> markdown better and better).

Cons: Transparency, telemetry and configurability. A workflow orchestration tool like Temporal would allow us to skip queues / pubsub and call individual activities with built-in retires, backoffs, etc. and provide out-of-the-box visibility into the workflow activity inputs / outputs during execution.


## 5. Possible Future Enhancements

**Advanced Analytics**:
- ML-based health categorization
- Company growth forecasting
- Competitor analysis

**Additional Data Sources**:
- Job board integration
- GitHub code analysis
- Social media monitoring
- Sentiment analysis
- Internal investor data points*

**Real-time Capabilities**:
- Push notifications for new events (e.g. fundraise) or anomalies

**AI Integration**:
- Natural language querying for company information 

