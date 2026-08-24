import Link from "next/link";
import { getAllVulns } from "@/lib/content";
import { Header } from "@/components/Header";
import { DocCard } from "@/components/DocCard";

export default function Home() {
  const vulns = getAllVulns();
  const featured = vulns.slice(0, 6);

  return (
    <>
      <Header />
      <main className="flex-1">
        <section className="border-b border-zinc-800 px-6 py-20">
          <div className="mx-auto max-w-6xl">
            <h1 className="mb-4 font-serif text-4xl font-bold tracking-tight text-zinc-100">
              Blockchain Security
              <br />
              <span className="text-red-500">Research Archive</span>
            </h1>
            <p className="mb-8 max-w-xl font-mono text-sm leading-relaxed text-zinc-400">
              Curated vulnerability write-ups, audit reports, and exploit
              breakdowns across DeFi protocols, L1 chains, and zero-knowledge
              systems.
            </p>
            <Link
              href="/vulns"
              className="inline-flex items-center gap-2 border border-zinc-700 bg-zinc-900 px-4 py-2 font-mono text-sm text-zinc-300 transition-colors hover:border-zinc-500 hover:text-white"
            >
              Browse All Write-ups
              <span className="text-zinc-600">→</span>
            </Link>
          </div>
        </section>

        <section className="px-6 py-12">
          <div className="mx-auto max-w-6xl">
            <div className="mb-6 flex items-center justify-between">
              <h2 className="font-mono text-xs uppercase tracking-widest text-zinc-500">
                Latest Write-ups
              </h2>
              <Link
                href="/vulns"
                className="font-mono text-xs text-zinc-600 transition-colors hover:text-zinc-400"
              >
                View all →
              </Link>
            </div>
            {featured.length > 0 ? (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {featured.map((doc) => (
                  <DocCard key={doc.slug} doc={doc} />
                ))}
              </div>
            ) : (
              <p className="font-mono text-sm text-zinc-600">
                No write-ups yet. Add content to{" "}
                <code className="text-zinc-400">/content/vulns/</code>
              </p>
            )}
          </div>
        </section>
      </main>
      <footer className="border-t border-zinc-800 px-6 py-6">
        <div className="mx-auto max-w-6xl font-mono text-xs text-zinc-600">
          Veylith Read — Blockchain Security Research Archive
        </div>
      </footer>
    </>
  );
}
