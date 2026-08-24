import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-6 text-center">
      <h1 className="mb-2 font-mono text-6xl font-bold text-zinc-800">404</h1>
      <p className="mb-6 font-mono text-sm text-zinc-500">Page not found</p>
      <Link
        href="/"
        className="border border-zinc-700 px-4 py-2 font-mono text-sm text-zinc-400 transition-colors hover:border-zinc-500 hover:text-white"
      >
        Return home
      </Link>
    </div>
  );
}
