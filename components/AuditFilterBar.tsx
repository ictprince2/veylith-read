"use client";

import { useRouter, useSearchParams } from "next/navigation";

interface AuditFilterBarProps {
  chains: string[];
  sources: string[];
  activeFilters: {
    severity: string;
    chain: string;
    source: string;
    q: string;
  };
}

const SEVERITIES = ["critical", "high", "medium", "low", "informational"];

export function AuditFilterBar({
  chains,
  sources,
  activeFilters,
}: AuditFilterBarProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  function setFilter(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value) {
      params.set(key, value);
    } else {
      params.delete(key);
    }
    router.push(`/security/audits?${params.toString()}`);
  }

  return (
    <div className="flex flex-wrap gap-3 border-b border-zinc-800 pb-4">
      <div>
        <label className="mb-1 block text-xs font-mono uppercase tracking-wider text-zinc-500">
          Severity
        </label>
        <select
          value={activeFilters.severity}
          onChange={(e) => setFilter("severity", e.target.value)}
          className="rounded-sm border border-zinc-700 bg-zinc-800 px-3 py-1.5 font-mono text-sm text-zinc-300 focus:border-zinc-500 focus:outline-none"
        >
          <option value="">All</option>
          {SEVERITIES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className="mb-1 block text-xs font-mono uppercase tracking-wider text-zinc-500">
          Chain
        </label>
        <select
          value={activeFilters.chain}
          onChange={(e) => setFilter("chain", e.target.value)}
          className="rounded-sm border border-zinc-700 bg-zinc-800 px-3 py-1.5 font-mono text-sm text-zinc-300 focus:border-zinc-500 focus:outline-none"
        >
          <option value="">All</option>
          {chains.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className="mb-1 block text-xs font-mono uppercase tracking-wider text-zinc-500">
          Source
        </label>
        <select
          value={activeFilters.source}
          onChange={(e) => setFilter("source", e.target.value)}
          className="rounded-sm border border-zinc-700 bg-zinc-800 px-3 py-1.5 font-mono text-sm text-zinc-300 focus:border-zinc-500 focus:outline-none"
        >
          <option value="">All</option>
          {sources.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className="mb-1 block text-xs font-mono uppercase tracking-wider text-zinc-500">
          Search
        </label>
        <input
          type="text"
          value={activeFilters.q}
          onChange={(e) => setFilter("q", e.target.value)}
          placeholder="Title..."
          className="rounded-sm border border-zinc-700 bg-zinc-800 px-3 py-1.5 font-mono text-sm text-zinc-300 placeholder:text-zinc-600 focus:border-zinc-500 focus:outline-none"
        />
      </div>
    </div>
  );
}
