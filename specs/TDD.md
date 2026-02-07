# Technical Design Document: Company Health Job Scraping System

## 1. Executive Summary

### 1.1 Overview
This document outlines the technical architecture for a job scraping and analysis system that monitors job postings across multiple platforms (LinkedIn, Ashby, company career pages) to assess company health metrics.

### 1.2 Objectives
- Automatically discover and scrape job postings from multiple sources
- Normalize and store job data in a unified format
- Track changes in job posting volume over time
- Provide metrics for assessing company health and growth trajectories

### 1.3 Success Metrics
- Successfully scrape 95%+ of available job postings
- Data freshness < 24 hours for all companies
- System uptime > 99.5%
- Processing time < 5 minutes per company per scraping cycle

---

## 2. System Architecture

### 2.1 High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Job Scraping System                      │
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
│  │         (Airflow / Temporal / Celery)                │  │
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
- **LinkedIn Scraper**: Scrapes LinkedIn job postings
- **Ashby Scraper**: Scrapes Ashby-hosted career pages
- **Website Scraper**: Generic scraper for company career pages
- **Rate Limiter**: Manages request rates to avoid blocking
- **Proxy Manager**: Rotates proxies and user agents
- **HTML Parser**: Extracts structured data from HTML

#### 2.2.2 Data Processing Layer
**Purpose**: Normalize, deduplicate, and enrich job data

**Components**:
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

## 3. Data Model

### 3.1 Core Entities

#### Company
```sql
CREATE TABLE companies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    domain VARCHAR(255) UNIQUE NOT NULL,
    linkedin_url VARCHAR(500),
    ashby_url VARCHAR(500),
    careers_page_url VARCHAR(500),
    industry VARCHAR(100),
    company_size VARCHAR(50),
    headquarters_location VARCHAR(255),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    metadata JSONB
);

CREATE INDEX idx_companies_domain ON companies(domain);
CREATE INDEX idx_companies_name ON companies(name);
```

#### Job Posting
```sql
CREATE TABLE job_postings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
    external_id VARCHAR(255),
    source VARCHAR(50) NOT NULL, -- 'linkedin', 'ashby', 'website'
    source_url VARCHAR(1000) NOT NULL,
    title VARCHAR(500) NOT NULL,
    description TEXT,
    location VARCHAR(255),
    remote_type VARCHAR(50), -- 'remote', 'hybrid', 'onsite'
    employment_type VARCHAR(50), -- 'full-time', 'part-time', 'contract'
    seniority_level VARCHAR(50),
    department VARCHAR(100),
    raw_html_path VARCHAR(500), -- S3/GCS path to raw HTML
    first_seen_at TIMESTAMP NOT NULL,
    last_seen_at TIMESTAMP NOT NULL,
    removed_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    metadata JSONB,
    UNIQUE(company_id, source, external_id)
);

CREATE INDEX idx_job_postings_company ON job_postings(company_id);
CREATE INDEX idx_job_postings_source ON job_postings(source);
CREATE INDEX idx_job_postings_first_seen ON job_postings(first_seen_at);
CREATE INDEX idx_job_postings_removed ON job_postings(removed_at);
CREATE INDEX idx_job_postings_active ON job_postings(company_id, removed_at) 
    WHERE removed_at IS NULL;
```

#### Job Snapshot
```sql
CREATE TABLE job_snapshots (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_posting_id UUID REFERENCES job_postings(id) ON DELETE CASCADE,
    snapshot_date DATE NOT NULL,
    title VARCHAR(500),
    description_hash VARCHAR(64), -- SHA256 hash for change detection
    location VARCHAR(255),
    metadata JSONB,
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(job_posting_id, snapshot_date)
);

CREATE INDEX idx_job_snapshots_posting ON job_snapshots(job_posting_id);
CREATE INDEX idx_job_snapshots_date ON job_snapshots(snapshot_date);
```

#### Scraping Run
```sql
CREATE TABLE scraping_runs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
    source VARCHAR(50) NOT NULL,
    status VARCHAR(50) NOT NULL, -- 'pending', 'running', 'completed', 'failed'
    jobs_found INTEGER,
    jobs_new INTEGER,
    jobs_updated INTEGER,
    jobs_removed INTEGER,
    error_message TEXT,
    started_at TIMESTAMP,
    completed_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_scraping_runs_company ON scraping_runs(company_id);
CREATE INDEX idx_scraping_runs_status ON scraping_runs(status);
CREATE INDEX idx_scraping_runs_started ON scraping_runs(started_at);
```

#### Company Health Metrics
```sql
CREATE TABLE company_health_metrics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
    metric_date DATE NOT NULL,
    total_active_jobs INTEGER NOT NULL,
    jobs_added_7d INTEGER,
    jobs_removed_7d INTEGER,
    jobs_added_30d INTEGER,
    jobs_removed_30d INTEGER,
    job_velocity_score DECIMAL(5,2), -- Net change indicator
    department_diversity_score DECIMAL(5,2),
    location_diversity_score DECIMAL(5,2),
    seniority_distribution JSONB,
    department_distribution JSONB,
    health_score DECIMAL(5,2), -- Overall health score (0-100)
    growth_indicator VARCHAR(50), -- 'expanding', 'stable', 'contracting'
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(company_id, metric_date)
);

CREATE INDEX idx_health_metrics_company ON company_health_metrics(company_id);
CREATE INDEX idx_health_metrics_date ON company_health_metrics(metric_date);
```

### 3.2 Data Flow

```
1. Scraping Run Initiated
   ├─▶ LinkedIn Scraper fetches jobs
   ├─▶ Ashby Scraper fetches jobs
   └─▶ Website Scraper fetches jobs
        │
        ▼
2. Raw Data Processing
   ├─▶ Parse HTML/JSON
   ├─▶ Extract structured fields
   └─▶ Store raw HTML to object storage
        │
        ▼
3. Normalization & Deduplication
   ├─▶ Standardize field formats
   ├─▶ Check for existing job by external_id
   ├─▶ Detect changes via description hash
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

## 4. Scraping Implementation

### 4.1 LinkedIn Scraper

**Approach**: Use Selenium/Playwright for JavaScript rendering

```python
class LinkedInScraper:
    def __init__(self, proxy_manager, rate_limiter):
        self.proxy_manager = proxy_manager
        self.rate_limiter = rate_limiter
        
    async def scrape_company_jobs(self, company_name: str) -> List[JobPosting]:
        """Scrape all job postings for a company from LinkedIn"""
        
        # Search for company jobs
        search_url = f"https://www.linkedin.com/jobs/search/?keywords={company_name}"
        
        async with self.get_browser_context() as context:
            page = await context.new_page()
            
            # Apply rate limiting
            await self.rate_limiter.wait()
            
            await page.goto(search_url)
            await page.wait_for_selector('.jobs-search__results-list')
            
            # Scroll to load all jobs
            jobs = []
            while True:
                await self.scroll_page(page)
                job_cards = await page.query_selector_all('.job-card-container')
                
                for card in job_cards:
                    job_data = await self.extract_job_data(card)
                    jobs.append(job_data)
                
                # Check for "Show more" button
                if not await self.has_more_jobs(page):
                    break
                    
            return jobs
    
    async def extract_job_data(self, card) -> dict:
        """Extract structured data from job card"""
        return {
            'external_id': await card.get_attribute('data-job-id'),
            'title': await card.query_selector('.job-card-list__title').inner_text(),
            'location': await card.query_selector('.job-card-container__metadata-item').inner_text(),
            'source_url': await card.query_selector('a').get_attribute('href'),
            'source': 'linkedin',
            # Additional fields...
        }
```

**Challenges & Solutions**:
- **Anti-bot measures**: Use residential proxies, randomize user agents, add human-like delays
- **Rate limiting**: Implement exponential backoff, respect robots.txt
- **Login requirements**: Maintain authenticated sessions with cookie rotation
- **Dynamic content**: Use headless browsers with JavaScript rendering

### 4.2 Ashby Scraper

**Approach**: API-based scraping (Ashby provides public job APIs)

```python
class AshbyScraper:
    BASE_URL = "https://jobs.ashbyhq.com"
    
    async def scrape_company_jobs(self, ashby_subdomain: str) -> List[JobPosting]:
        """Scrape jobs from Ashby-hosted career page"""
        
        api_url = f"{self.BASE_URL}/{ashby_subdomain}/api/jobs"
        
        async with httpx.AsyncClient() as client:
            response = await client.get(api_url)
            response.raise_for_status()
            
            jobs_data = response.json()
            
            jobs = []
            for job in jobs_data.get('jobs', []):
                jobs.append({
                    'external_id': job['id'],
                    'title': job['title'],
                    'location': job.get('location', {}).get('name'),
                    'department': job.get('department', {}).get('name'),
                    'employment_type': job.get('employmentType'),
                    'source_url': f"{self.BASE_URL}/{ashby_subdomain}/jobs/{job['id']}",
                    'source': 'ashby',
                    'description': job.get('description'),
                })
                
            return jobs
```

**Advantages**:
- Structured JSON responses
- No authentication required
- Reliable and fast
- Complete job data in one request

### 4.3 Website Scraper

**Approach**: Adaptive scraping with pattern detection

```python
class WebsiteScraper:
    def __init__(self):
        self.patterns = [
            # Greenhouse pattern
            {'selector': '.opening', 'type': 'greenhouse'},
            # Lever pattern
            {'selector': '.posting', 'type': 'lever'},
            # Generic patterns
            {'selector': '[class*="job"]', 'type': 'generic'},
        ]
    
    async def scrape_careers_page(self, url: str) -> List[JobPosting]:
        """Adaptively scrape company careers page"""
        
        async with self.get_browser_context() as context:
            page = await context.new_page()
            await page.goto(url)
            
            # Detect ATS platform
            platform = await self.detect_platform(page)
            
            if platform == 'greenhouse':
                return await self.scrape_greenhouse(page)
            elif platform == 'lever':
                return await self.scrape_lever(page)
            elif platform == 'workday':
                return await self.scrape_workday(page)
            else:
                return await self.scrape_generic(page)
    
    async def detect_platform(self, page) -> str:
        """Detect which ATS platform is being used"""
        
        # Check for Greenhouse
        if await page.query_selector('#greenhouse-job-board'):
            return 'greenhouse'
            
        # Check for Lever
        if 'lever.co' in page.url:
            return 'lever'
            
        # Check for Workday
        if 'myworkdayjobs.com' in page.url:
            return 'workday'
            
        return 'generic'
```

**Supported ATS Platforms**:
- Greenhouse
- Lever
- Workday
- Ashby (separate scraper)
- BambooHR
- SmartRecruiters
- Generic HTML parsing

### 4.4 Anti-Detection Strategies

```python
class ProxyManager:
    """Manages proxy rotation and health checks"""
    
    def __init__(self, proxy_list: List[str]):
        self.proxies = deque(proxy_list)
        self.failed_proxies = set()
        
    def get_next_proxy(self) -> str:
        """Get next healthy proxy with rotation"""
        proxy = self.proxies.popleft()
        self.proxies.append(proxy)
        
        if proxy in self.failed_proxies:
            return self.get_next_proxy()
            
        return proxy
    
    def mark_failed(self, proxy: str):
        """Mark proxy as failed"""
        self.failed_proxies.add(proxy)

class RateLimiter:
    """Token bucket rate limiter"""
    
    def __init__(self, requests_per_minute: int):
        self.rate = requests_per_minute
        self.tokens = requests_per_minute
        self.last_update = time.time()
        
    async def wait(self):
        """Wait if necessary to respect rate limit"""
        while self.tokens < 1:
            await asyncio.sleep(0.1)
            self._refill_tokens()
            
        self.tokens -= 1
    
    def _refill_tokens(self):
        """Refill tokens based on elapsed time"""
        now = time.time()
        elapsed = now - self.last_update
        self.tokens = min(
            self.rate,
            self.tokens + (elapsed * self.rate / 60)
        )
        self.last_update = now
```

---

## 5. Data Processing Pipeline

### 5.1 Normalization

```python
class JobNormalizer:
    """Normalizes job data across different sources"""
    
    LOCATION_PATTERNS = {
        'remote': r'remote|anywhere|work from home',
        'hybrid': r'hybrid',
    }
    
    SENIORITY_MAPPING = {
        'intern': ['intern', 'internship', 'co-op'],
        'entry': ['entry', 'junior', 'associate', 'i', 'level 1'],
        'mid': ['mid', 'ii', 'level 2', 'level 3'],
        'senior': ['senior', 'sr', 'iii', 'lead', 'level 4'],
        'staff': ['staff', 'principal', 'iv', 'level 5'],
        'executive': ['director', 'vp', 'head of', 'chief'],
    }
    
    def normalize(self, raw_job: dict) -> dict:
        """Normalize job posting data"""
        
        normalized = {
            'title': self.normalize_title(raw_job['title']),
            'location': self.normalize_location(raw_job.get('location', '')),
            'remote_type': self.detect_remote_type(raw_job),
            'seniority_level': self.extract_seniority(raw_job['title']),
            'department': self.extract_department(raw_job),
            'employment_type': self.normalize_employment_type(raw_job),
        }
        
        return {**raw_job, **normalized}
    
    def normalize_location(self, location: str) -> str:
        """Standardize location strings"""
        location = location.strip()
        
        # Handle "City, State" format
        if ',' in location:
            parts = [p.strip() for p in location.split(',')]
            return f"{parts[0]}, {parts[1]}"
            
        return location
    
    def extract_seniority(self, title: str) -> str:
        """Extract seniority level from job title"""
        title_lower = title.lower()
        
        for level, keywords in self.SENIORITY_MAPPING.items():
            if any(kw in title_lower for kw in keywords):
                return level
                
        return 'mid'  # Default
```

### 5.2 Deduplication

```python
class DeduplicationEngine:
    """Identifies and merges duplicate job postings"""
    
    def __init__(self, db_session):
        self.db = db_session
        
    async def process_job(self, company_id: UUID, job_data: dict) -> JobPosting:
        """Process job and handle deduplication"""
        
        # Check for exact match by external_id
        existing = await self.db.query(JobPosting).filter(
            JobPosting.company_id == company_id,
            JobPosting.source == job_data['source'],
            JobPosting.external_id == job_data['external_id']
        ).first()
        
        if existing:
            return await self.update_existing(existing, job_data)
        
        # Check for fuzzy match (same job from different source)
        similar = await self.find_similar_jobs(company_id, job_data)
        
        if similar:
            return await self.merge_duplicates(similar, job_data)
        
        # Create new job posting
        return await self.create_new(company_id, job_data)
    
    async def find_similar_jobs(self, company_id: UUID, job_data: dict) -> List[JobPosting]:
        """Find similar jobs using fuzzy matching"""
        
        # Get jobs with similar titles from last 7 days
        candidates = await self.db.query(JobPosting).filter(
            JobPosting.company_id == company_id,
            JobPosting.removed_at.is_(None),
            JobPosting.first_seen_at > datetime.now() - timedelta(days=7)
        ).all()
        
        similar = []
        for candidate in candidates:
            # Calculate similarity score
            title_similarity = self.calculate_similarity(
                job_data['title'],
                candidate.title
            )
            
            if title_similarity > 0.85:  # Threshold
                similar.append(candidate)
        
        return similar
    
    def calculate_similarity(self, text1: str, text2: str) -> float:
        """Calculate text similarity using Levenshtein distance"""
        from difflib import SequenceMatcher
        return SequenceMatcher(None, text1.lower(), text2.lower()).ratio()
```

### 5.3 Change Detection

```python
class ChangeDetector:
    """Detects changes in job postings over time"""
    
    def __init__(self, db_session):
        self.db = db_session
        
    async def detect_changes(self, company_id: UUID, current_jobs: List[dict]) -> dict:
        """Detect new, updated, and removed jobs"""
        
        # Get all active jobs for company
        active_jobs = await self.db.query(JobPosting).filter(
            JobPosting.company_id == company_id,
            JobPosting.removed_at.is_(None)
        ).all()
        
        active_ids = {(job.source, job.external_id) for job in active_jobs}
        current_ids = {(job['source'], job['external_id']) for job in current_jobs}
        
        # Identify changes
        new_ids = current_ids - active_ids
        removed_ids = active_ids - current_ids
        continuing_ids = current_ids & active_ids
        
        # Mark removed jobs
        for source, external_id in removed_ids:
            await self.mark_removed(company_id, source, external_id)
        
        # Check for updates in continuing jobs
        updated_jobs = []
        for job_data in current_jobs:
            job_id = (job_data['source'], job_data['external_id'])
            if job_id in continuing_ids:
                if await self.has_content_changed(company_id, job_data):
                    updated_jobs.append(job_data)
        
        return {
            'new': len(new_ids),
            'removed': len(removed_ids),
            'updated': len(updated_jobs),
            'total': len(current_jobs)
        }
    
    async def has_content_changed(self, company_id: UUID, job_data: dict) -> bool:
        """Check if job description has changed"""
        
        existing = await self.db.query(JobPosting).filter(
            JobPosting.company_id == company_id,
            JobPosting.source == job_data['source'],
            JobPosting.external_id == job_data['external_id']
        ).first()
        
        if not existing:
            return False
        
        # Compare description hashes
        new_hash = self.hash_content(job_data.get('description', ''))
        old_hash = self.hash_content(existing.description or '')
        
        return new_hash != old_hash
    
    def hash_content(self, content: str) -> str:
        """Generate SHA256 hash of content"""
        import hashlib
        return hashlib.sha256(content.encode()).hexdigest()
```

---

## 6. Health Metrics Calculation

### 6.1 Metrics Algorithm

```python
class HealthMetricsCalculator:
    """Calculates company health metrics from job data"""
    
    async def calculate_metrics(self, company_id: UUID, metric_date: date) -> dict:
        """Calculate all health metrics for a company"""
        
        # Get job counts
        total_active = await self.count_active_jobs(company_id, metric_date)
        
        # Get changes over time windows
        jobs_added_7d = await self.count_jobs_added(company_id, metric_date, days=7)
        jobs_removed_7d = await self.count_jobs_removed(company_id, metric_date, days=7)
        jobs_added_30d = await self.count_jobs_added(company_id, metric_date, days=30)
        jobs_removed_30d = await self.count_jobs_removed(company_id, metric_date, days=30)
        
        # Calculate velocity score (normalized net change)
        velocity_score = self.calculate_velocity(
            jobs_added_30d,
            jobs_removed_30d,
            total_active
        )
        
        # Calculate diversity metrics
        dept_diversity = await self.calculate_department_diversity(company_id, metric_date)
        loc_diversity = await self.calculate_location_diversity(company_id, metric_date)
        
        # Get distributions
        seniority_dist = await self.get_seniority_distribution(company_id, metric_date)
        department_dist = await self.get_department_distribution(company_id, metric_date)
        
        # Calculate overall health score
        health_score = self.calculate_health_score({
            'velocity': velocity_score,
            'dept_diversity': dept_diversity,
            'loc_diversity': loc_diversity,
            'total_jobs': total_active,
        })
        
        # Determine growth indicator
        growth_indicator = self.determine_growth_indicator(velocity_score)
        
        return {
            'company_id': company_id,
            'metric_date': metric_date,
            'total_active_jobs': total_active,
            'jobs_added_7d': jobs_added_7d,
            'jobs_removed_7d': jobs_removed_7d,
            'jobs_added_30d': jobs_added_30d,
            'jobs_removed_30d': jobs_removed_30d,
            'job_velocity_score': velocity_score,
            'department_diversity_score': dept_diversity,
            'location_diversity_score': loc_diversity,
            'seniority_distribution': seniority_dist,
            'department_distribution': department_dist,
            'health_score': health_score,
            'growth_indicator': growth_indicator,
        }
    
    def calculate_velocity(self, added: int, removed: int, total: int) -> float:
        """Calculate job velocity score (-100 to +100)"""
        
        if total == 0:
            return 0.0
        
        net_change = added - removed
        # Normalize by square root of total to account for company size
        normalized = (net_change / math.sqrt(max(total, 1))) * 10
        
        # Clamp to -100 to +100
        return max(-100, min(100, normalized))
    
    def calculate_health_score(self, metrics: dict) -> float:
        """Calculate overall health score (0-100)"""
        
        # Weighted components
        weights = {
            'velocity': 0.4,
            'diversity': 0.3,
            'volume': 0.3,
        }
        
        # Normalize velocity from -100:100 to 0:100
        velocity_norm = (metrics['velocity'] + 100) / 2
        
        # Average diversity scores
        diversity_score = (metrics['dept_diversity'] + metrics['loc_diversity']) / 2
        
        # Volume score (logarithmic scale, capped at 100 jobs = score 100)
        volume_score = min(100, (math.log(max(metrics['total_jobs'], 1) + 1) / math.log(101)) * 100)
        
        # Calculate weighted average
        health_score = (
            velocity_norm * weights['velocity'] +
            diversity_score * weights['diversity'] +
            volume_score * weights['volume']
        )
        
        return round(health_score, 2)
    
    def determine_growth_indicator(self, velocity_score: float) -> str:
        """Determine growth indicator from velocity"""
        
        if velocity_score > 10:
            return 'expanding'
        elif velocity_score < -10:
            return 'contracting'
        else:
            return 'stable'
    
    async def calculate_department_diversity(self, company_id: UUID, metric_date: date) -> float:
        """Calculate department diversity score using Shannon entropy"""
        
        dept_counts = await self.get_department_counts(company_id, metric_date)
        
        if not dept_counts:
            return 0.0
        
        total = sum(dept_counts.values())
        entropy = 0.0
        
        for count in dept_counts.values():
            if count > 0:
                p = count / total
                entropy -= p * math.log2(p)
        
        # Normalize to 0-100 (max entropy for 10 categories ≈ 3.32)
        max_entropy = math.log2(min(len(dept_counts), 10))
        normalized = (entropy / max_entropy) * 100 if max_entropy > 0 else 0
        
        return round(normalized, 2)
```

### 6.2 Anomaly Detection

```python
class AnomalyDetector:
    """Detects unusual patterns in hiring activity"""
    
    async def detect_anomalies(self, company_id: UUID) -> List[dict]:
        """Detect anomalies in job posting patterns"""
        
        anomalies = []
        
        # Check for sudden spike in job postings
        spike_anomaly = await self.detect_job_spike(company_id)
        if spike_anomaly:
            anomalies.append(spike_anomaly)
        
        # Check for mass job removals
        removal_anomaly = await self.detect_mass_removal(company_id)
        if removal_anomaly:
            anomalies.append(removal_anomaly)
        
        # Check for unusual department hiring
        dept_anomaly = await self.detect_department_spike(company_id)
        if dept_anomaly:
            anomalies.append(dept_anomaly)
        
        return anomalies
    
    async def detect_job_spike(self, company_id: UUID) -> Optional[dict]:
        """Detect sudden spike in job postings"""
        
        # Get 30-day moving average
        avg_30d = await self.get_avg_new_jobs(company_id, days=30)
        
        # Get jobs added in last 7 days
        recent_7d = await self.count_jobs_added(company_id, datetime.now().date(), days=7)
        
        # Detect spike (3x standard deviation)
        if recent_7d > avg_30d * 3:
            return {
                'type': 'job_spike',
                'severity': 'high',
                'message': f'Unusual spike: {recent_7d} jobs added in last 7 days (avg: {avg_30d:.1f})',
                'metric_value': recent_7d,
                'baseline': avg_30d,
            }
        
        return None
    
    async def detect_mass_removal(self, company_id: UUID) -> Optional[dict]:
        """Detect mass job removal (potential layoffs or hiring freeze)"""
        
        jobs_removed_7d = await self.count_jobs_removed(
            company_id,
            datetime.now().date(),
            days=7
        )
        
        total_active = await self.count_active_jobs(company_id, datetime.now().date())
        
        # If removed >20% of active jobs in 7 days
        if total_active > 0 and (jobs_removed_7d / total_active) > 0.2:
            return {
                'type': 'mass_removal',
                'severity': 'critical',
                'message': f'{jobs_removed_7d} jobs removed in last 7 days ({jobs_removed_7d/total_active*100:.1f}% of total)',
                'metric_value': jobs_removed_7d,
                'percentage': (jobs_removed_7d / total_active) * 100,
            }
        
        return None
```

---

## 7. Orchestration & Scheduling

### 7.1 Workflow Architecture

**Option 1: Apache Airflow**

```python
from airflow import DAG
from airflow.operators.python import PythonOperator
from datetime import datetime, timedelta

default_args = {
    'owner': 'data-team',
    'depends_on_past': False,
    'start_date': datetime(2025, 1, 1),
    'retries': 3,
    'retry_delay': timedelta(minutes=5),
}

dag = DAG(
    'company_job_scraping',
    default_args=default_args,
    description='Scrape job postings and calculate health metrics',
    schedule_interval='0 2 * * *',  # Daily at 2 AM
    catchup=False,
)

# Define tasks
scrape_linkedin = PythonOperator(
    task_id='scrape_linkedin',
    python_callable=scrape_linkedin_jobs,
    dag=dag,
)

scrape_ashby = PythonOperator(
    task_id='scrape_ashby',
    python_callable=scrape_ashby_jobs,
    dag=dag,
)

scrape_websites = PythonOperator(
    task_id='scrape_websites',
    python_callable=scrape_company_websites,
    dag=dag,
)

normalize_data = PythonOperator(
    task_id='normalize_data',
    python_callable=normalize_and_deduplicate,
    dag=dag,
)

calculate_metrics = PythonOperator(
    task_id='calculate_metrics',
    python_callable=calculate_health_metrics,
    dag=dag,
)

detect_anomalies = PythonOperator(
    task_id='detect_anomalies',
    python_callable=detect_anomalies_task,
    dag=dag,
)

# Define dependencies
[scrape_linkedin, scrape_ashby, scrape_websites] >> normalize_data
normalize_data >> calculate_metrics >> detect_anomalies
```

**Option 2: Temporal (Recommended for Complex Workflows)**

```python
from temporalio import workflow, activity
from datetime import timedelta

@workflow.defn
class CompanyScrapingWorkflow:
    @workflow.run
    async def run(self, company_id: str) -> dict:
        """Main workflow for scraping and processing company jobs"""
        
        # Parallel scraping from all sources
        scraping_results = await workflow.execute_activity(
            scrape_all_sources,
            company_id,
            start_to_close_timeout=timedelta(minutes=30),
        )
        
        # Process and normalize data
        normalized_data = await workflow.execute_activity(
            normalize_jobs,
            scraping_results,
            start_to_close_timeout=timedelta(minutes=10),
        )
        
        # Detect changes
        change_summary = await workflow.execute_activity(
            detect_changes,
            args=[company_id, normalized_data],
            start_to_close_timeout=timedelta(minutes=5),
        )
        
        # Calculate metrics
        metrics = await workflow.execute_activity(
            calculate_metrics,
            company_id,
            start_to_close_timeout=timedelta(minutes=5),
        )
        
        # Check for anomalies
        anomalies = await workflow.execute_activity(
            check_anomalies,
            company_id,
            start_to_close_timeout=timedelta(minutes=5),
        )
        
        return {
            'company_id': company_id,
            'changes': change_summary,
            'metrics': metrics,
            'anomalies': anomalies,
        }
```

### 7.2 Scheduling Strategy

**Priority Tiers**:
1. **Tier 1 (High Priority)**: Large public companies, high-growth startups
   - Scraping frequency: Every 12 hours
   - Sources: All (LinkedIn, Ashby, Website)
   
2. **Tier 2 (Medium Priority)**: Mid-size companies
   - Scraping frequency: Daily
   - Sources: LinkedIn + Website
   
3. **Tier 3 (Low Priority)**: Small companies, less active hiring
   - Scraping frequency: Every 3 days
   - Sources: LinkedIn only

**Smart Scheduling**:
```python
class SmartScheduler:
    """Dynamically adjusts scraping frequency based on activity"""
    
    async def determine_next_scrape(self, company_id: UUID) -> datetime:
        """Determine next scrape time based on historical activity"""
        
        # Get recent activity metrics
        activity = await self.get_activity_metrics(company_id, days=30)
        
        # Calculate activity score
        score = (
            activity['jobs_added'] * 2 +  # New jobs more important
            activity['jobs_removed'] * 1 +
            activity['jobs_updated'] * 0.5
        )
        
        # Determine interval
        if score > 50:
            # High activity - scrape every 6 hours
            interval = timedelta(hours=6)
        elif score > 20:
            # Medium activity - scrape daily
            interval = timedelta(days=1)
        elif score > 5:
            # Low activity - scrape every 3 days
            interval = timedelta(days=3)
        else:
            # Very low activity - scrape weekly
            interval = timedelta(days=7)
        
        return datetime.now() + interval
```

---

## 8. API Design

### 8.1 REST API Endpoints

```python
from fastapi import FastAPI, HTTPException, Depends
from typing import List, Optional
from datetime import date, datetime

app = FastAPI(title="Company Health API")

# Company endpoints
@app.post("/api/v1/companies", response_model=CompanyResponse)
async def create_company(company: CompanyCreate):
    """Register a new company for monitoring"""
    pass

@app.get("/api/v1/companies/{company_id}", response_model=CompanyResponse)
async def get_company(company_id: UUID):
    """Get company details"""
    pass

@app.get("/api/v1/companies", response_model=List[CompanyResponse])
async def list_companies(
    skip: int = 0,
    limit: int = 100,
    industry: Optional[str] = None
):
    """List all monitored companies"""
    pass

# Job endpoints
@app.get("/api/v1/companies/{company_id}/jobs", response_model=List[JobPostingResponse])
async def get_company_jobs(
    company_id: UUID,
    active_only: bool = True,
    source: Optional[str] = None,
    department: Optional[str] = None,
):
    """Get all job postings for a company"""
    pass

@app.get("/api/v1/jobs/{job_id}", response_model=JobPostingDetail)
async def get_job_detail(job_id: UUID):
    """Get detailed job posting information"""
    pass

# Metrics endpoints
@app.get("/api/v1/companies/{company_id}/metrics", response_model=HealthMetricsResponse)
async def get_company_metrics(
    company_id: UUID,
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
):
    """Get health metrics for a company over time"""
    pass

@app.get("/api/v1/companies/{company_id}/metrics/latest", response_model=HealthMetricsResponse)
async def get_latest_metrics(company_id: UUID):
    """Get most recent health metrics"""
    pass

@app.get("/api/v1/companies/{company_id}/trends", response_model=TrendsResponse)
async def get_hiring_trends(
    company_id: UUID,
    metric: str = "total_jobs",  # total_jobs, velocity, health_score
    days: int = 90,
):
    """Get hiring trends over time"""
    pass

# Analytics endpoints
@app.get("/api/v1/companies/{company_id}/anomalies", response_model=List[AnomalyResponse])
async def get_anomalies(
    company_id: UUID,
    days: int = 30,
):
    """Get detected anomalies"""
    pass

@app.get("/api/v1/companies/compare", response_model=ComparisonResponse)
async def compare_companies(
    company_ids: List[UUID],
    metric: str = "health_score",
):
    """Compare multiple companies"""
    pass

# Scraping control endpoints
@app.post("/api/v1/companies/{company_id}/scrape", response_model=ScrapingRunResponse)
async def trigger_scrape(company_id: UUID):
    """Manually trigger scraping for a company"""
    pass

@app.get("/api/v1/scraping-runs/{run_id}", response_model=ScrapingRunResponse)
async def get_scraping_run(run_id: UUID):
    """Get scraping run details"""
    pass
```

### 8.2 Response Models

```python
from pydantic import BaseModel
from typing import Optional, List, Dict
from datetime import datetime, date

class CompanyResponse(BaseModel):
    id: UUID
    name: str
    domain: str
    industry: Optional[str]
    company_size: Optional[str]
    headquarters_location: Optional[str]
    created_at: datetime
    
class JobPostingResponse(BaseModel):
    id: UUID
    company_id: UUID
    title: str
    location: str
    remote_type: Optional[str]
    department: Optional[str]
    seniority_level: Optional[str]
    source: str
    source_url: str
    first_seen_at: datetime
    last_seen_at: datetime
    removed_at: Optional[datetime]
    
class HealthMetricsResponse(BaseModel):
    company_id: UUID
    metric_date: date
    total_active_jobs: int
    jobs_added_7d: int
    jobs_removed_7d: int
    jobs_added_30d: int
    jobs_removed_30d: int
    job_velocity_score: float
    health_score: float
    growth_indicator: str
    department_distribution: Dict[str, int]
    seniority_distribution: Dict[str, int]
    
class TrendsResponse(BaseModel):
    company_id: UUID
    metric: str
    data_points: List[Dict[str, any]]  # [{date, value}, ...]
    
class AnomalyResponse(BaseModel):
    type: str
    severity: str
    message: str
    detected_at: datetime
    metric_value: float
    baseline: Optional[float]
```

---

## 9. Monitoring & Observability

### 9.1 Key Metrics to Monitor

**System Health**:
- Scraping success rate by source
- Average scraping duration
- Failed scraping runs
- API response times
- Database query performance
- Queue depth and processing lag

**Data Quality**:
- Duplicate detection rate
- Normalization errors
- Missing required fields
- Data freshness by company

**Business Metrics**:
- Total companies monitored
- Total active jobs tracked
- Average jobs per company
- Companies with anomalies
- API usage statistics

### 9.2 Logging Strategy

```python
import structlog
from pythonjsonlogger import jsonlogger

# Configure structured logging
structlog.configure(
    processors=[
        structlog.stdlib.add_log_level,
        structlog.stdlib.add_logger_name,
        structlog.processors.TimeStamper(fmt="iso"),
        structlog.processors.StackInfoRenderer(),
        structlog.processors.format_exc_info,
        structlog.processors.JSONRenderer()
    ],
    wrapper_class=structlog.stdlib.BoundLogger,
    context_class=dict,
    logger_factory=structlog.stdlib.LoggerFactory(),
)

logger = structlog.get_logger()

# Usage
logger.info(
    "scraping_completed",
    company_id=str(company_id),
    source="linkedin",
    jobs_found=42,
    duration_seconds=125.3,
    status="success"
)
```

### 9.3 Alerting Rules

```yaml
alerts:
  - name: HighScrapingFailureRate
    condition: scraping_failure_rate > 0.1
    duration: 5m
    severity: warning
    message: "Scraping failure rate above 10% for {{ source }}"
    
  - name: DataFreshnessIssue
    condition: max(time_since_last_scrape) > 86400
    duration: 1h
    severity: critical
    message: "Company {{ company_name }} hasn't been scraped in 24+ hours"
    
  - name: AnomalyDetected
    condition: anomaly_count > 0
    severity: info
    message: "Detected {{ anomaly_type }} for {{ company_name }}"
    
  - name: DatabaseConnectionFailure
    condition: db_connection_errors > 5
    duration: 1m
    severity: critical
    message: "Multiple database connection failures"
```

---

## 10. Deployment Architecture

### 10.1 Infrastructure Components

```yaml
# Kubernetes deployment structure

Services:
  - API Service (FastAPI)
    - Replicas: 3
    - Resources: 2 CPU, 4GB RAM
    - Autoscaling: 3-10 pods based on CPU
    
  - Scraping Workers (Celery)
    - Replicas: 5
    - Resources: 4 CPU, 8GB RAM (for headless browsers)
    - Queue: Redis
    
  - Workflow Engine (Temporal/Airflow)
    - Replicas: 2
    - Resources: 2 CPU, 4GB RAM
    
  - Metrics Calculator (Scheduled jobs)
    - Replicas: 2
    - Resources: 2 CPU, 4GB RAM

Databases:
  - PostgreSQL (RDS/Cloud SQL)
    - Instance: db.r5.xlarge (4 CPU, 32GB RAM)
    - Multi-AZ: Yes
    - Read replicas: 2
    
  - Redis (ElastiCache/Memory Store)
    - Instance: cache.m5.large (2 CPU, 6.4GB RAM)
    - Cluster mode: Yes
    
  - Object Storage (S3/GCS)
    - Lifecycle: Archive to cold storage after 90 days

Monitoring:
  - Prometheus for metrics
  - Grafana for dashboards
  - ELK stack for logs
  - PagerDuty for alerting
```

### 10.2 Scalability Considerations

**Horizontal Scaling**:
- Add more scraping workers during peak hours
- Use job queues (Celery/RabbitMQ) for load distribution
- Partition companies across worker pools by priority

**Vertical Scaling**:
- Increase resources for browser-based scrapers
- Scale database for query-heavy analytics workloads

**Caching Strategy**:
- Cache company metadata (Redis, 1 hour TTL)
- Cache health metrics (Redis, 15 minutes TTL)
- Cache API responses (CDN, 5 minutes TTL)

**Database Optimization**:
- Partition `job_postings` table by month
- Index strategy for common query patterns
- Read replicas for analytics queries
- Connection pooling (PgBouncer)

---

## 11. Security & Compliance

### 11.1 Data Protection

**Personal Data Handling**:
- Job descriptions may contain contact information
- Implement PII detection and redaction
- Store raw HTML with encryption at rest
- Secure access controls to sensitive data

**API Security**:
- JWT-based authentication
- Rate limiting (100 requests/minute per API key)
- CORS configuration for web clients
- API key rotation policy

**Scraping Ethics**:
- Respect robots.txt
- Implement rate limiting
- Use appropriate User-Agent headers
- Handle 429 (Too Many Requests) gracefully

### 11.2 Compliance Considerations

**Terms of Service**:
- Review LinkedIn, Ashby TOS for scraping restrictions
- Implement compliance checks
- Legal review of scraping practices

**GDPR/CCPA**:
- Data retention policies (auto-delete after 2 years)
- User right to deletion
- Privacy policy for data usage

---

## 12. Testing Strategy

### 12.1 Unit Tests

```python
# Test normalization
def test_seniority_extraction():
    normalizer = JobNormalizer()
    
    assert normalizer.extract_seniority("Senior Software Engineer") == "senior"
    assert normalizer.extract_seniority("Junior Developer") == "entry"
    assert normalizer.extract_seniority("Staff Engineer") == "staff"

# Test deduplication
async def test_duplicate_detection():
    engine = DeduplicationEngine(db_session)
    
    job1 = {"title": "Software Engineer", "source": "linkedin"}
    job2 = {"title": "Software Engineer ", "source": "ashby"}  # Same job, different source
    
    similar = await engine.find_similar_jobs(company_id, job1)
    assert len(similar) > 0
```

### 12.2 Integration Tests

```python
async def test_full_scraping_pipeline():
    """Test complete scraping workflow"""
    
    # 1. Scrape jobs
    scraper = LinkedInScraper(proxy_manager, rate_limiter)
    jobs = await scraper.scrape_company_jobs("Example Corp")
    
    assert len(jobs) > 0
    
    # 2. Normalize
    normalizer = JobNormalizer()
    normalized = [normalizer.normalize(job) for job in jobs]
    
    # 3. Store
    for job in normalized:
        await job_repository.upsert(company_id, job)
    
    # 4. Verify storage
    stored_jobs = await job_repository.get_active_jobs(company_id)
    assert len(stored_jobs) == len(jobs)
```

### 12.3 Load Testing

```python
# Using Locust for load testing
from locust import HttpUser, task, between

class APIUser(HttpUser):
    wait_time = between(1, 3)
    
    @task(3)
    def get_company_metrics(self):
        company_id = random.choice(self.company_ids)
        self.client.get(f"/api/v1/companies/{company_id}/metrics")
    
    @task(1)
    def list_jobs(self):
        company_id = random.choice(self.company_ids)
        self.client.get(f"/api/v1/companies/{company_id}/jobs")
```

---

## 13. Future Enhancements

### 13.1 Phase 2 Features

**Advanced Analytics**:
- ML-based job categorization
- Salary prediction models
- Company growth forecasting
- Competitor analysis

**Additional Data Sources**:
- Indeed, Glassdoor integration
- GitHub job boards
- AngelList/Wellfound
- Company engineering blogs

**Enhanced Metrics**:
- Time-to-fill estimation
- Job posting quality scores
- Tech stack analysis from job descriptions
- Team size estimation

### 13.2 Phase 3 Features

**Real-time Capabilities**:
- WebSocket API for live updates
- Push notifications for anomalies
- Real-time dashboards

**AI Integration**:
- GPT-based job description analysis
- Automated company categorization
- Natural language querying

**Collaboration Features**:
- Multi-user accounts
- Custom alerts and watchlists
- Shared dashboards
- API webhooks

---

## 14. Appendix

### 14.1 Technology Stack

**Backend**:
- Python 3.11+
- FastAPI (API framework)
- SQLAlchemy (ORM)
- Asyncio (async operations)

**Scraping**:
- Playwright/Selenium (browser automation)
- BeautifulSoup4 (HTML parsing)
- httpx (HTTP client)

**Data Processing**:
- Pandas (data manipulation)
- NumPy (numerical operations)

**Infrastructure**:
- PostgreSQL 15
- Redis 7
- Kubernetes
- Docker

**Monitoring**:
- Prometheus
- Grafana
- Sentry (error tracking)

**Workflow**:
- Temporal (recommended) or Apache Airflow

### 14.2 Estimated Costs

**Infrastructure (Monthly)**:
- Compute (K8s cluster): $500-1000
- Database (PostgreSQL): $300-600
- Cache (Redis): $100-200
- Storage (S3/GCS): $50-100
- Monitoring: $100-200
- **Total: ~$1,050-2,100/month**

**Operational**:
- Proxy services: $200-500/month
- API costs (if using third-party): $100-300/month

**Scale at 1,000 companies**:
- Expected: $2,000-3,000/month

### 14.3 Timeline Estimate

**Phase 1 - MVP (8-10 weeks)**:
- Week 1-2: Core scraping infrastructure
- Week 3-4: Data processing pipeline
- Week 5-6: Metrics calculation
- Week 7-8: API development
- Week 9-10: Testing and deployment

**Phase 2 - Production Ready (4-6 weeks)**:
- Week 11-12: Monitoring and alerting
- Week 13-14: Advanced analytics
- Week 15-16: Performance optimization

**Phase 3 - Scale (Ongoing)**:
- Additional data sources
- ML features
- UI/Dashboard development

---

## 15. Conclusion

This technical design provides a comprehensive foundation for building a robust job scraping and company health analysis system. The architecture prioritizes:

1. **Scalability**: Handles thousands of companies with horizontal scaling
2. **Reliability**: Multiple data sources with fallbacks and retries
3. **Accuracy**: Sophisticated deduplication and normalization
4. **Insights**: Rich metrics and anomaly detection
5. **Maintainability**: Clean architecture with clear component boundaries

The system can start with MVP features and iteratively add capabilities based on user feedback and business requirements.