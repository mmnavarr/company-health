-- CreateTable
CREATE TABLE "companies" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" VARCHAR(255) NOT NULL,
    "slug" VARCHAR(255) NOT NULL,
    "linkedin_url" VARCHAR(500),
    "ashby_board_name" VARCHAR(500),
    "careers_page_url" VARCHAR(500),
    "industry" VARCHAR(100),
    "company_size" VARCHAR(50),
    "headquarters_location" VARCHAR(255),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "metadata" JSONB,

    CONSTRAINT "companies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "job_postings" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "company_id" UUID NOT NULL,
    "external_id" VARCHAR(255),
    "source" VARCHAR(50) NOT NULL,
    "source_url" VARCHAR(1000) NOT NULL,
    "title" VARCHAR(500) NOT NULL,
    "description" TEXT,
    "description_html" TEXT,
    "location" VARCHAR(255),
    "remote_type" VARCHAR(50),
    "is_remote" BOOLEAN,
    "employment_type" VARCHAR(50),
    "seniority_level" VARCHAR(50),
    "department" VARCHAR(100),
    "team" VARCHAR(100),
    "description_hash" VARCHAR(64),
    "published_at" TIMESTAMP(3),
    "job_url" VARCHAR(1000),
    "apply_url" VARCHAR(1000),
    "compensation" JSONB,
    "secondary_locations" JSONB,
    "first_seen_at" TIMESTAMP(3) NOT NULL,
    "last_seen_at" TIMESTAMP(3) NOT NULL,
    "removed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "metadata" JSONB,

    CONSTRAINT "job_postings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "news_articles" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "company_id" UUID NOT NULL,
    "external_url" VARCHAR(2000) NOT NULL,
    "title" VARCHAR(1000) NOT NULL,
    "snippet" TEXT,
    "content" TEXT,
    "published_at" TIMESTAMP(3),
    "source" VARCHAR(50) NOT NULL,
    "sentiment" VARCHAR(20),
    "raw_score" DECIMAL(5,4),
    "content_hash" VARCHAR(64),
    "first_seen_at" TIMESTAMP(3) NOT NULL,
    "last_seen_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "news_articles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "scraping_runs" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "company_id" UUID NOT NULL,
    "source" VARCHAR(50) NOT NULL,
    "status" VARCHAR(50) NOT NULL,
    "jobs_found" INTEGER,
    "jobs_new" INTEGER,
    "jobs_updated" INTEGER,
    "jobs_removed" INTEGER,
    "error_message" TEXT,
    "started_at" TIMESTAMP(3),
    "completed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "scraping_runs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "company_health_metrics" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "company_id" UUID NOT NULL,
    "metric_date" DATE NOT NULL,
    "total_active_jobs" INTEGER NOT NULL,
    "jobs_added_7d" INTEGER,
    "jobs_removed_7d" INTEGER,
    "jobs_added_30d" INTEGER,
    "jobs_removed_30d" INTEGER,
    "job_velocity_score" DECIMAL(5,2),
    "department_diversity_score" DECIMAL(5,2),
    "location_diversity_score" DECIMAL(5,2),
    "seniority_distribution" JSONB,
    "department_distribution" JSONB,
    "health_score" DECIMAL(5,2),
    "growth_indicator" VARCHAR(50),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "company_health_metrics_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "companies_name_idx" ON "companies"("name");
CREATE UNIQUE INDEX "companies_slug_key" ON "companies"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "job_postings_company_id_source_external_id_key" ON "job_postings"("company_id", "source", "external_id");
CREATE INDEX "job_postings_company_id_idx" ON "job_postings"("company_id");
CREATE INDEX "job_postings_source_idx" ON "job_postings"("source");
CREATE INDEX "job_postings_first_seen_at_idx" ON "job_postings"("first_seen_at");
CREATE INDEX "job_postings_removed_at_idx" ON "job_postings"("removed_at");

-- CreateIndex
CREATE UNIQUE INDEX "news_articles_company_id_external_url_key" ON "news_articles"("company_id", "external_url");
CREATE INDEX "news_articles_company_id_idx" ON "news_articles"("company_id");
CREATE INDEX "news_articles_source_idx" ON "news_articles"("source");
CREATE INDEX "news_articles_published_at_idx" ON "news_articles"("published_at");
CREATE INDEX "news_articles_first_seen_at_idx" ON "news_articles"("first_seen_at");

-- CreateIndex
CREATE INDEX "scraping_runs_company_id_idx" ON "scraping_runs"("company_id");
CREATE INDEX "scraping_runs_status_idx" ON "scraping_runs"("status");
CREATE INDEX "scraping_runs_started_at_idx" ON "scraping_runs"("started_at");

-- CreateIndex
CREATE UNIQUE INDEX "company_health_metrics_company_id_metric_date_key" ON "company_health_metrics"("company_id", "metric_date");
CREATE INDEX "company_health_metrics_company_id_idx" ON "company_health_metrics"("company_id");
CREATE INDEX "company_health_metrics_metric_date_idx" ON "company_health_metrics"("metric_date");

-- AddForeignKey
ALTER TABLE "job_postings" ADD CONSTRAINT "job_postings_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "news_articles" ADD CONSTRAINT "news_articles_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scraping_runs" ADD CONSTRAINT "scraping_runs_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "company_health_metrics" ADD CONSTRAINT "company_health_metrics_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;
