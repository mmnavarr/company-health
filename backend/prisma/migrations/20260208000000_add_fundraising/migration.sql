-- CreateTable
CREATE TABLE "fundraising_summaries" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "company_id" UUID NOT NULL,
    "total_raised" DECIMAL(15, 2),
    "total_raised_ccy" VARCHAR(3),
    "latest_valuation" DECIMAL(15, 2),
    "valuation_ccy" VARCHAR(3),
    "round_count" INTEGER NOT NULL DEFAULT 0,
    "investor_count" INTEGER NOT NULL DEFAULT 0,
    "last_funding_date" TIMESTAMP(3),
    "last_scraped_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "fundraising_summaries_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "fundraising_summaries_company_id_key" UNIQUE ("company_id")
);

-- CreateTable
CREATE TABLE "funding_rounds" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "company_id" UUID NOT NULL,
    "summary_id" UUID NOT NULL,
    "round_type" VARCHAR(50) NOT NULL,
    "amount" DECIMAL(15, 2),
    "amount_ccy" VARCHAR(3),
    "announced_date" TIMESTAMP(3),
    "investors" VARCHAR(255)[] DEFAULT ARRAY[]::VARCHAR(255)[],
    "lead_investors" VARCHAR(255)[] DEFAULT ARRAY[]::VARCHAR(255)[],
    "valuation" DECIMAL(15, 2),
    "valuation_ccy" VARCHAR(3),
    "source_url" VARCHAR(2000) NOT NULL,
    "source_title" VARCHAR(1000) NOT NULL,
    "raw_content" TEXT,
    "extracted_data" JSONB,
    "confidence_score" DECIMAL(3, 2),
    "first_seen_at" TIMESTAMP(3) NOT NULL,
    "last_seen_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "funding_rounds_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "funding_rounds_company_id_source_url_key" UNIQUE ("company_id", "source_url")
);

-- CreateIndex
CREATE INDEX "fundraising_summaries_company_id_idx" ON "fundraising_summaries"("company_id");

-- CreateIndex
CREATE INDEX "funding_rounds_company_id_idx" ON "funding_rounds"("company_id");

-- CreateIndex
CREATE INDEX "funding_rounds_summary_id_idx" ON "funding_rounds"("summary_id");

-- CreateIndex
CREATE INDEX "funding_rounds_announced_date_idx" ON "funding_rounds"("announced_date");

-- CreateIndex
CREATE INDEX "funding_rounds_round_type_idx" ON "funding_rounds"("round_type");

-- AddForeignKey
ALTER TABLE "fundraising_summaries" ADD CONSTRAINT "fundraising_summaries_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "funding_rounds" ADD CONSTRAINT "funding_rounds_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "funding_rounds" ADD CONSTRAINT "funding_rounds_summary_id_fkey" FOREIGN KEY ("summary_id") REFERENCES "fundraising_summaries"("id") ON DELETE CASCADE ON UPDATE CASCADE;
