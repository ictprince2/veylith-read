import { Suspense } from "react";
import { getAllVulns } from "@/lib/content";
import { Header } from "@/components/Header";
import { DocCard } from "@/components/DocCard";
import { FilterBar } from "@/components/FilterBar";

export default function VulnsPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | undefined }>;
}) {
  return (
    <Suspense fallback={<VulnsPageSkeleton />}>
      <VulnsPageInner searchParams={searchParams} />
    </Suspense>
  );
}

async function VulnsPageInner({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | undefined }>;
}) {
  const params = await searchParams;
  const allVulns = getAllVulns();

  const filters = {
    severity: params.severity,
    category: params.category,
    chain: params.chain,
    protocol: params.protocol,
  };

  let filtered = allVulns;
  if (filters.severity) filtered = filtered.filter((v) => v.severity === filters.severity);
  if (filters.category) filtered = filtered.filter((v) => v.category === filters.category);
  if (filters.chain) filtered = filtered.filter((v) => v.chain === filters.chain);
  if (filters.protocol) filtered = filtered.filter((v) => v.protocol === filters.protocol);

  const categories = [...new Set(allVulns.map((v) => v.category))].sort();
  const chains = [...new Set(allVulns.map((v) => v.chain))].sort();
  const protocols = [...new Set(allVulns.map((v) => v.protocol))].sort();

  return (
    <>
      <Header />
      <main className="flex-1">
        <div className="mx-auto max-w-6xl px-6 py-8">
          <div className="mb-6">
            <h1 className="mb-1 font-serif text-2xl font-bold tracking-tight text-zinc-100">
              Vulnerability Write-ups
            </h1>
            <p className="font-mono text-xs text-zinc-500">
              {filtered.length} {filtered.length === 1 ? "write-up" : "write-ups"}
            </p>
          </div>

          <FilterBar
            severities={["critical", "high", "medium", "low", "informational"]}
            categories={categories}
            chains={chains}
            protocols={protocols}
            activeFilters={filters}
          />

          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((doc) => (
              <DocCard key={doc.slug} doc={doc} />
            ))}
          </div>

          {filtered.length === 0 && (
            <div className="mt-12 text-center">
              <p className="font-mono text-sm text-zinc-600">
                No write-ups match the selected filters.
              </p>
            </div>
          )}
        </div>
      </main>
    </>
  );
}

function VulnsPageSkeleton() {
  return (
    <>
      <Header />
      <main className="flex-1">
        <div className="mx-auto max-w-6xl px-6 py-8">
          <div className="mb-6">
            <h1 className="mb-1 font-serif text-2xl font-bold tracking-tight text-zinc-100">
              Vulnerability Write-ups
            </h1>
          </div>
          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-48 animate-pulse rounded bg-zinc-900" />
            ))}
          </div>
        </div>
      </main>
    </>
  );
}
