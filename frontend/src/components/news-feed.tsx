"use client";

import { useEffect, useState } from "react";
import {
  ApiClient,
  ApiRequestError,
  getApiUrl,
  type NewsArticle,
} from "@/lib/api";

interface NewsFeedProps {
  companySlug: string;
  limit?: number;
}

export function NewsFeed({ companySlug, limit = 5 }: NewsFeedProps) {
  const [news, setNews] = useState<NewsArticle[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const api = new ApiClient(getApiUrl());

    async function fetchNews() {
      try {
        setIsLoading(true);
        setError(null);
        const data = await api.getCompanyNews(companySlug, { limit });
        setNews(data);
      } catch (err) {
        setError(
          err instanceof ApiRequestError ? err.message : "Failed to load news"
        );
      } finally {
        setIsLoading(false);
      }
    }
    fetchNews();
  }, [companySlug, limit]);

  if (isLoading) {
    return (
      <div>
        <h2 className="font-semibold text-slate-100 text-xl tracking-tight">
          Latest News
        </h2>
        <div className="mt-4 flex items-center gap-2">
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-slate-600 border-t-indigo-500" />
          <span className="text-slate-500 text-sm">Loading news...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div>
        <h2 className="font-semibold text-slate-100 text-xl tracking-tight">
          Latest News
        </h2>
        <p className="mt-4 text-rose-400 text-sm">{error}</p>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between">
        <h2 className="font-semibold text-slate-100 text-xl tracking-tight">
          Latest News
        </h2>
        <span className="text-slate-500 text-xs">
          {news.length} article{news.length !== 1 ? "s" : ""}
        </span>
      </div>
      {news.length === 0 ? (
        <p className="mt-4 text-slate-500 text-sm">No news articles yet</p>
      ) : (
        <div className="mt-4 space-y-4">
          {news.map((article) => (
            <NewsArticleCard article={article} key={article.id} />
          ))}
        </div>
      )}
    </div>
  );
}

interface NewsArticleCardProps {
  article: NewsArticle;
}

function NewsArticleCard({ article }: NewsArticleCardProps) {
  const sentimentColor =
    article.sentiment === "positive"
      ? "bg-emerald-100 text-emerald-700"
      : article.sentiment === "negative"
        ? "bg-rose-100 text-rose-700"
        : "bg-slate-100 text-slate-700";

  const formatDate = (dateString: string | null) => {
    if (!dateString) {
      return null;
    }
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      });
    } catch {
      return null;
    }
  };

  return (
    <a
      className="block rounded-lg border border-slate-800 bg-slate-950/40 p-4 transition-colors hover:border-slate-700 hover:bg-slate-950/60"
      href={article.externalUrl}
      rel="noopener noreferrer"
      target="_blank"
    >
      <div className="flex items-start justify-between gap-3">
        <h3 className="font-medium text-slate-200 text-sm leading-snug">
          {article.title}
        </h3>
        {article.sentiment && (
          <span
            className={`shrink-0 rounded-full px-2 py-0.5 text-xs ${sentimentColor}`}
          >
            {article.sentiment}
          </span>
        )}
      </div>
      {article.snippet && (
        <p className="mt-2 line-clamp-2 text-slate-400 text-sm">
          {article.snippet}
        </p>
      )}
      <div className="mt-3 flex items-center gap-3 text-slate-500 text-xs">
        <span>{article.source}</span>
        {article.publishedAt && (
          <>
            <span>•</span>
            <span>{formatDate(article.publishedAt)}</span>
          </>
        )}
        {article.rawScore !== null && (
          <>
            <span>•</span>
            <span>Score: {article.rawScore.toFixed(2)}</span>
          </>
        )}
      </div>
    </a>
  );
}

export default NewsFeed;
