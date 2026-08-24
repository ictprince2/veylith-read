import Link from "next/link";
import type { VulnDoc } from "@/lib/content";
import { SeverityBadge } from "./SeverityBadge";
import { formatDate } from "@/lib/utils";

interface DocCardProps {
  doc: VulnDoc;
}

export function DocCard({ doc }: DocCardProps) {
  return (
    <Link
      href={`/vulns/${doc.slug}`}
      className="group block border border-zinc-800 bg-zinc-900/50 p-5 transition-colors hover:border-zinc-600 hover:bg-zinc-900"
    >
      <div className="mb-3 flex items-center justify-between gap-2">
        <SeverityBadge severity={doc.severity} />
        <time className="font-mono text-xs text-zinc-500">{formatDate(doc.date)}</time>
      </div>
      <h3 className="mb-2 font-serif text-lg font-semibold text-zinc-100 group-hover:text-white">
        {doc.title}
      </h3>
      <div className="mb-3 flex flex-wrap gap-2 text-xs font-mono text-zinc-500">
        <span>{doc.protocol}</span>
        <span className="text-zinc-700">/</span>
        <span>{doc.chain}</span>
        <span className="text-zinc-700">/</span>
        <span>{doc.category}</span>
      </div>
      <div className="flex flex-wrap gap-1">
        {doc.tags.slice(0, 3).map((tag) => (
          <span key={tag} className="rounded-sm bg-zinc-800 px-1.5 py-0.5 text-xs text-zinc-400">
            {tag}
          </span>
        ))}
        {doc.tags.length > 3 && (
          <span className="text-xs text-zinc-600">+{doc.tags.length - 3}</span>
        )}
      </div>
    </Link>
  );
}
