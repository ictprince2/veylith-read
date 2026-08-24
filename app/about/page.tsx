import { Header } from "@/components/Header";

export default function AboutPage() {
  return (
    <>
      <Header />
      <main className="flex-1 px-6 py-12">
        <div className="mx-auto max-w-[65ch]">
          <h1 className="mb-6 font-serif text-3xl font-bold tracking-tight text-zinc-100">
            About
          </h1>
          <div className="space-y-4 font-mono text-sm leading-relaxed text-zinc-400">
            <p>
              Veylith Read is a curated archive of blockchain security
              vulnerability write-ups. It covers audit reports, post-mortems,
              and disclosed exploit breakdowns across DeFi protocols, L1 chains,
              and zero-knowledge systems.
            </p>
            <p>
              Content is sourced from published audit reports, official incident
              write-ups, and community disclosures. Each entry provides a
              structured summary with severity rating, root-cause analysis, and
              references to the original source.
            </p>
            <p className="text-zinc-600">
              This is a read-focused, static archive — no backend, no
              authentication, no comments. Just the research.
            </p>
          </div>
        </div>
      </main>
    </>
  );
}
