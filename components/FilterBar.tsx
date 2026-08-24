"use client";

import { useRouter, useSearchParams } from "next/navigation";

interface FilterBarProps {
  severities: string[];
  categories: string[];
  chains: string[];
  protocols: string[];
  activeFilters: {
    severity?: string;
    category?: string;
    chain?: string;
    protocol?: string;
  };
}

export function FilterBar({
  severities,
  categories,
  chains,
  protocols,
  activeFilters,
}: FilterBarProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  function setFilter(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value) {
      params.set(key, value);
    } else {
      params.delete(key);
    }
    router.push(`/vulns?${params.toString()}`);
  }

  return (
    <div className="flex flex-wrap gap-3 border-b border-zinc-800 pb-4">
      <div>
        <label className="mb-1 block text-xs font-mono uppercase tracking-wider text-zinc-500">
          Severity
        </label>
        <select
          value={activeFilters.severity || ""}
          onChange={(e) => setFilter("severity", e.target.value)}
          className="rounded-sm border border-zinc-700 bg-zinc-800 px-3 py-1.5 font-mono text-sm text-zinc-300 focus:border-zinc-500 focus:outline-none"
        >
          <option value="">All</option>
          {severities.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className="mb-1 block text-xs font-mono uppercase tracking-wider text-zinc-500">
          Category
        </label>
        <select
          value={activeFilters.category || ""}
          onChange={(e) => setFilter("category", e.target.value)}
          className="rounded-sm border border-zinc-700 bg-zinc-800 px-3 py-1.5 font-mono text-sm text-zinc-300 focus:border-zinc-500 focus:outline-none"
        >
          <option value="">All</option>
          {categories.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className="mb-1 block text-xs font-mono uppercase tracking-wider text-zinc-500">
          Chain
        </label>
        <select
          value={activeFilters.chain || ""}
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
          Protocol
        </label>
        <select
          value={activeFilters.protocol || ""}
          onChange={(e) => setFilter("protocol", e.target.value)}
          className="rounded-sm border border-zinc-700 bg-zinc-800 px-3 py-1.5 font-mono text-sm text-zinc-300 focus:border-zinc-500 focus:outline-none"
        >
          <option value="">All</option>
          {protocols.map((p) => (
            <option key={p} value={p}>
              {p}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
