"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Header } from "@/components/Header";

const SOURCE_ID = "810778fd-bbf6-4a29-abb7-5ca9ceab1756";

export default function TestSyncPage() {
  const [status, setStatus] = useState<string>("idle");
  const [result, setResult] = useState<string>("");

  async function runSync() {
    setStatus("running");
    setResult("");

    const supabase = createClient();
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session) {
      setStatus("error");
      setResult("Not signed in.");
      return;
    }

    try {
      const res = await fetch(`/api/admin/sync/${SOURCE_ID}`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      const body = await res.json();

      if (!res.ok) {
        setStatus("error");
        setResult(JSON.stringify(body, null, 2));
        return;
      }

      setStatus("done");
      setResult(
        `Created: ${body.created}\nUpdated: ${body.updated}\nUnchanged: ${body.unchanged}` +
          (body.errors?.length ? `\nErrors:\n${body.errors.join("\n")}` : "")
      );
    } catch (err) {
      setStatus("error");
      setResult(err instanceof Error ? err.message : String(err));
    }
  }

  return (
    <>
      <Header />
      <main className="flex-1 px-6 py-12">
        <div className="mx-auto max-w-lg">
          <h1 className="mb-4 font-serif text-2xl font-bold text-zinc-100">
            Test Sync
          </h1>
          <p className="mb-6 font-mono text-xs text-zinc-500">
            Source: Hacken ({SOURCE_ID})
          </p>
          <button
            onClick={runSync}
            disabled={status === "running"}
            className="border border-zinc-700 bg-zinc-900 px-4 py-2 font-mono text-sm text-zinc-300 transition-colors hover:border-zinc-500 hover:text-white disabled:opacity-50"
          >
            {status === "running" ? "Syncing..." : "Sync now"}
          </button>
          {result && (
            <pre className="mt-6 whitespace-pre-wrap border border-zinc-800 bg-zinc-900/50 p-4 font-mono text-xs text-zinc-400">
              {result}
            </pre>
          )}
        </div>
      </main>
    </>
  );
}
