# AGENTS.md — Veylith Read

## Project
Veylith Read — a landing page / reading app for blockchain security researcher vulnerability
write-ups (audit reports, post-mortems, disclosed exploit breakdowns). Not a
CMS — content is mostly static/markdown-sourced, read-focused, fast-loading.

## Stack
- Framework: Next.js (App Router) + TypeScript
- Styling: Tailwind CSS
- Content: MDX or markdown files in `/content/vulns/*.mdx`, frontmatter-driven
- Deploy target: Vercel (static export where possible)
- No backend/DB for v1 — content is file-based

## Directory conventions
- `/app` — routes only, keep thin
- `/components` — presentational, no data fetching
- `/lib` — content loading, frontmatter parsing, search/filter logic
- `/content/vulns/` — one `.mdx` file per write-up
- `/public` — static assets

## Content model (frontmatter per doc)
```yaml
title: string
slug: string
severity: critical | high | medium | low | informational
protocol: string          # e.g. "Compound", "Euler"
chain: string             # e.g. "Ethereum", "Solana"
category: string          # e.g. "reentrancy", "oracle-manipulation", "logic-error"
date: ISO date
source_url: string        # original report/disclosure link
tags: string[]
```

## Design direction (avoid generic template look)
- No default shadcn/Vercel-starter aesthetic — no centered hero with generic
  gradient blob, no stock "Inter font + rounded cards + soft shadows" look.
- Pick a point of view: this reads like a security research archive/terminal,
  not a SaaS landing page. Lean into a dense, technical, almost
  "incident report" visual language — monospace accents for
  severity/protocol/chain metadata, sharp edges over rounded corners, a
  restrained/dark palette with a single accent color tied to severity
  (e.g. red/orange/yellow/gray scale).
- Typography should carry the design: a distinct serif or monospace pairing
  for headings vs body, not default sans-serif everywhere.
- Reference real editorial/technical sites (e.g. security disclosure blogs,
  CVE databases, research journals) for layout cues — not generic startup
  templates.
- Every screen should look intentional, not scaffolded — no unstyled default
  browser elements, no placeholder Lorem Ipsum in the final build.

## Testing
- Unit/component tests: Vitest + React Testing Library for `/lib` content
  parsing (frontmatter validation, filtering/search logic) and key
  components (severity badge, filter bar, doc card).
- E2E: Playwright — cover landing page load, `/vulns` filtering, and
  `/vulns/[slug]` rendering for at least one real doc.
- Every content file added to `/content/vulns` must pass a frontmatter
  schema test (required fields present, `severity`/`category` enums valid,
  `source_url` resolves to a non-empty string) — wire this into CI or a
  pre-commit check.
- `npm run test` and `npm run build` must both pass before a task is
  considered done — not just `build`.

## Content sourcing
Content is curated, not scraped live — the agent should never auto-pull and
publish external content without a human passing it through review.
- Primary sources to draw from: OWASP Smart Contract Top 10, published audit
  reports from firms (CertiK, Sherlock, Hacken, SlowMist, Quantstamp, Trail
  of Bits, zkSecurity), DeFiLlama's exploit archive, rekt.news post-mortems,
  and official incident write-ups (client teams, protocol postmortems) for
  chain-halt / consensus-bug cases.
- Category coverage should span: classic Solidity bugs (reentrancy, access
  control, integer/overflow, oracle manipulation), consensus-level incidents
  (chain halts, client bugs, finality issues), and ZK-specific issues
  (circuit under-constraint, trusted setup, prover/verifier mismatches,
  witness leakage).
- Workflow: agent drafts a `.mdx` file with `source_url` pointing to the
  original disclosure/report, writes an original summary (never copy-pasted
  from the source — see copyright note below), and flags it for human
  review before merge. Do not mark content "published" without that
  human sign-off.
- Copyright: summaries must be substantially reworded, not close paraphrase
  of the original report. Quote the source directly only for short, load-
  bearing phrases (e.g. an official severity rating), never full paragraphs.
- If ingesting many reports at once, batch by source and keep a running
  `/content/vulns/_sources.md` log of what's been pulled from where, so
  coverage gaps and duplicate entries are easy to spot.

## Core pages (v1)
1. `/` — landing page: hero, value prop, latest/featured docs grid
2. `/vulns` — full list, filterable by severity/category/chain/protocol
3. `/vulns/[slug]` — single doc reader view (clean typography, TOC, code blocks)
4. `/about` — who this is for / methodology

## Agent rules
- **Don't fabricate vulnerability content.** Every doc in `/content` must map
  to a real, cited, publicly disclosed source (`source_url` required, no
  placeholder data in production content).
- **No exploit code that provides uplift.** Summaries, root-cause
  explanations, and remediation are fine. Do not write step-by-step
  reproduction/exploit scripts, even for "educational" framing.
- Reader view prioritizes long-form readability: constrain prose width
  (~65-75ch), generous line-height, code blocks with syntax highlighting.
- Keep components accessible (semantic HTML, proper heading hierarchy —
  important since this is a reading-heavy app).
- Prefer static generation (`generateStaticParams`) over client fetching for
  content pages.
- Run `npm run lint` and `npm run build` before considering a task done.
- Don't add auth, comments, or a backend unless explicitly asked — v1 stays
  static/file-based.

## Commands
```bash
npm run dev       # local dev server
npm run build     # production build
npm run lint       # eslint
npm run test       # vitest unit/component tests
npm run test:e2e   # playwright e2e tests
```

