"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Header } from "@/components/Header";

const SOURCES = [
  { label: "Hacken", id: "810778fd-bbf6-4a29-abb7-5ca9ceab1756" },
  { label: "Immunefi", id: "" },
];

export default function TestSyncPage() {
  const [sourceId, setSourceId] = useState(SOURCES[0].id);
  const [customId, setCustomId] = useState("");
  const [status, setStatus] = useState<string>("idle");
  const [result, setResult] = useState<string>("");

  const activeSourceId = sourceId || customId;

  async function runSync() {
    if (!activeSourceId) {
      setStatus("error");
      setResult("Enter a source UUID.");
      return;
    }

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
      const res = await fetch(`/api/admin/sync/${activeSourceId}`, {
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

          <fieldset className="mb-4">
            <legend className="mb-2 font-mono text-xs text-zinc-500">
              Source
            </legend>
            <div className="flex flex-col gap-2">
              {SOURCES.map((s) => (
                <label key={s.label} className="flex items-center gap-2 font-mono text-sm text-zinc-300">
                  <input
                    type="radio"
                    name="source"
                    value={s.id}
                    checked={sourceId === s.id}
                    onChange={() => { setSourceId(s.id); setCustomId(""); }}
                    className="accent-zinc-400"
                  />
                  {s.label}
                  {s.id && (
                    <span className="text-xs text-zinc-600">({s.id.slice(0, 8)}...)</span>
                  )}
                </label>
              ))}
              <label className="flex items-center gap-2 font-mono text-sm text-zinc-300">
                <input
                  type="radio"
                  name="source"
                  value="custom"
                  checked={sourceId === ""}
                  onChange={() => setSourceId("")}
                  className="accent-zinc-400"
                />
                Custom UUID
              </label>
            </div>
          </fieldset>

          {sourceId === "" && (
            <input
              type="text"
              placeholder="Paste source UUID..."
              value={customId}
              onChange={(e) => setCustomId(e.target.value)}
              className="mb-4 w-full border border-zinc-700 bg-zinc-900 px-3 py-2 font-mono text-sm text-zinc-300 placeholder:text-zinc-600 focus:border-zinc-500 focus:outline-none"
            />
          )}

          <p className="mb-4 font-mono text-xs text-zinc-600">
            Syncing: {activeSourceId || "(none selected)"}
          </p>

          <button
            onClick={runSync}
            disabled={status === "running" || !activeSourceId}
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
