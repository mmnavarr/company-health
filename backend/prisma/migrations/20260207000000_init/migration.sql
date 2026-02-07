-- CreateTable
CREATE TABLE "companies" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" VARCHAR(255) NOT NULL,
    "linkedinUrl" VARCHAR(500),
    "ashbyUrl" VARCHAR(500),
    "careersPageUrl" VARCHAR(500),
    "industry" VARCHAR(100),
    "companySize" VARCHAR(50),
    "headquartersLocation" VARCHAR(255),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "metadata" JSONB,

    CONSTRAINT "companies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "job_postings" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "companyId" UUID NOT NULL,
    "externalId" VARCHAR(255),
    "source" VARCHAR(50) NOT NULL,
    "sourceUrl" VARCHAR(1000) NOT NULL,
    "title" VARCHAR(500) NOT NULL,
    "description" TEXT,
    "descriptionHtml" TEXT,
    "location" VARCHAR(255),
    "remoteType" VARCHAR(50),
    "isRemote" BOOLEAN,
    "employmentType" VARCHAR(50),
    "seniorityLevel" VARCHAR(50),
    "department" VARCHAR(100),
    "team" VARCHAR(100),
    "descriptionHash" VARCHAR(64),
    "publishedAt" TIMESTAMP(3),
    "jobUrl" VARCHAR(1000),
    "applyUrl" VARCHAR(1000),
    "compensation" JSONB,
    "secondaryLocations" JSONB,
    "firstSeenAt" TIMESTAMP(3) NOT NULL,
    "lastSeenAt" TIMESTAMP(3) NOT NULL,
    "removedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "metadata" JSONB,

    CONSTRAINT "job_postings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "news_articles" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "companyId" UUID NOT NULL,
    "externalUrl" VARCHAR(2000) NOT NULL,
    "title" VARCHAR(1000) NOT NULL,
    "snippet" TEXT,
    "content" TEXT,
    "publishedAt" TIMESTAMP(3),
    "source" VARCHAR(50) NOT NULL,
    "sentiment" VARCHAR(20),
    "rawScore" DECIMAL(5,4),
    "contentHash" VARCHAR(64),
    "firstSeenAt" TIMESTAMP(3) NOT NULL,
    "lastSeenAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "news_articles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "scraping_runs" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "companyId" UUID NOT NULL,
    "source" VARCHAR(50) NOT NULL,
    "status" VARCHAR(50) NOT NULL,
    "jobsFound" INTEGER,
    "jobsNew" INTEGER,
    "jobsUpdated" INTEGER,
    "jobsRemoved" INTEGER,
    "errorMessage" TEXT,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "scraping_runs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "company_health_metrics" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "companyId" UUID NOT NULL,
    "metricDate" DATE NOT NULL,
    "totalActiveJobs" INTEGER NOT NULL,
    "jobsAdded7d" INTEGER,
    "jobsRemoved7d" INTEGER,
    "jobsAdded30d" INTEGER,
    "jobsRemoved30d" INTEGER,
    "jobVelocityScore" DECIMAL(5,2),
    "departmentDiversityScore" DECIMAL(5,2),
    "locationDiversityScore" DECIMAL(5,2),
    "seniorityDistribution" JSONB,
    "departmentDistribution" JSONB,
    "healthScore" DECIMAL(5,2),
    "growthIndicator" VARCHAR(50),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "company_health_metrics_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "companies_name_idx" ON "companies"("name");

-- CreateIndex
CREATE UNIQUE INDEX "job_postings_companyId_source_externalId_key" ON "job_postings"("companyId", "source", "externalId");
CREATE INDEX "job_postings_companyId_idx" ON "job_postings"("companyId");
CREATE INDEX "job_postings_source_idx" ON "job_postings"("source");
CREATE INDEX "job_postings_firstSeenAt_idx" ON "job_postings"("firstSeenAt");
CREATE INDEX "job_postings_removedAt_idx" ON "job_postings"("removedAt");

-- CreateIndex
CREATE UNIQUE INDEX "news_articles_companyId_externalUrl_key" ON "news_articles"("companyId", "externalUrl");
CREATE INDEX "news_articles_companyId_idx" ON "news_articles"("companyId");
CREATE INDEX "news_articles_source_idx" ON "news_articles"("source");
CREATE INDEX "news_articles_publishedAt_idx" ON "news_articles"("publishedAt");
CREATE INDEX "news_articles_firstSeenAt_idx" ON "news_articles"("firstSeenAt");

-- CreateIndex
CREATE INDEX "scraping_runs_companyId_idx" ON "scraping_runs"("companyId");
CREATE INDEX "scraping_runs_status_idx" ON "scraping_runs"("status");
CREATE INDEX "scraping_runs_startedAt_idx" ON "scraping_runs"("startedAt");

-- CreateIndex
CREATE UNIQUE INDEX "company_health_metrics_companyId_metricDate_key" ON "company_health_metrics"("companyId", "metricDate");
CREATE INDEX "company_health_metrics_companyId_idx" ON "company_health_metrics"("companyId");
CREATE INDEX "company_health_metrics_metricDate_idx" ON "company_health_metrics"("metricDate");

-- AddForeignKey
ALTER TABLE "job_postings" ADD CONSTRAINT "job_postings_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "news_articles" ADD CONSTRAINT "news_articles_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scraping_runs" ADD CONSTRAINT "scraping_runs_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "company_health_metrics" ADD CONSTRAINT "company_health_metrics_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;
