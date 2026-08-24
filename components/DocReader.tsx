import type { VulnDoc } from "@/lib/content";
import { SeverityBadge } from "./SeverityBadge";

interface DocReaderProps {
  doc: VulnDoc;
  children: React.ReactNode;
}

export function DocReader({ doc, children }: DocReaderProps) {
  return (
    <article className="mx-auto max-w-[72ch]">
      <header className="mb-8 border-b border-zinc-800 pb-6">
        <div className="mb-4 flex items-center gap-3">
          <SeverityBadge severity={doc.severity} />
          <time className="font-mono text-xs text-zinc-500">{doc.date}</time>
        </div>
        <h1 className="mb-4 font-serif text-3xl font-bold tracking-tight text-zinc-100">
          {doc.title}
        </h1>
        <div className="flex flex-wrap gap-x-4 gap-y-1 font-mono text-sm text-zinc-500">
          <span>
            <span className="text-zinc-700">Protocol:</span> {doc.protocol}
          </span>
          <span>
            <span className="text-zinc-700">Chain:</span> {doc.chain}
          </span>
          <span>
            <span className="text-zinc-700">Category:</span> {doc.category}
          </span>
        </div>
        <div className="mt-3 flex flex-wrap gap-1.5">
          {doc.tags.map((tag) => (
            <span key={tag} className="rounded-sm bg-zinc-800 px-1.5 py-0.5 text-xs text-zinc-400">
              {tag}
            </span>
          ))}
        </div>
      </header>
      <div className="prose-custom">{children}</div>
    </article>
  );
}
