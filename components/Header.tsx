import Link from "next/link";

export function Header() {
  return (
    <header className="border-b border-zinc-800">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-6">
        <Link href="/" className="font-mono text-sm font-bold tracking-wider text-zinc-100">
          VEYLITH<span className="text-red-500">.</span>READ
        </Link>
        <nav className="flex items-center gap-6 text-sm font-mono text-zinc-400">
          <Link href="/vulns" className="transition-colors hover:text-zinc-100">
            Vulns
          </Link>
          <Link href="/about" className="transition-colors hover:text-zinc-100">
            About
          </Link>
        </nav>
      </div>
    </header>
  );
}
