# Resume Roaster (No LLM)

A production-quality MVP web app that analyzes resumes using deterministic heuristics - zero AI/LLM usage.

## Overview
Users upload a resume PDF or paste text. The app extracts text, analyzes it with rule-based pattern matching, and generates:
1. AI Replacement Risk Score (1-10) with detailed breakdown
2. Comedic roasts at 3 heat levels (light/medium/spicy)
3. Actionable improvement suggestions with bullet rewrites

## Tech Stack
- **Frontend**: React + TypeScript + Tailwind CSS + shadcn/ui + Framer Motion
- **Backend**: Express.js API routes
- **PDF Parsing**: pdf-parse (server-side)
- **Routing**: wouter
- **Data Fetching**: TanStack React Query
- **No database** - stateless analysis, in-memory rate limiting

## Architecture

### Server Libraries (`server/lib/`)
- `analyzer.ts` - Resume analysis engine: text cleaning, section extraction, buzzword/metric/tech detection, scoring rubric
- `roaster.ts` - Roast generation: template-based roasts triggered by analysis conditions, seeded randomization
- `improver.ts` - Improvement engine: priority fixes, bullet rewrites, summary generation, ATS tips
- `rateLimit.ts` - In-memory IP-based rate limiter (20 req/hour per endpoint)

### API Endpoints
- `POST /api/extract` - PDF text extraction (multipart form upload)
- `POST /api/analyze` - Resume analysis with scoring
- `POST /api/roast` - Comedic roast generation
- `POST /api/improve` - Improvement suggestions

### Frontend (`client/src/`)
- Single-page app with home page at `client/src/pages/home.tsx`
- Shared types in `shared/schema.ts`

## Running
The workflow "Start application" runs `npm run dev` which starts Express + Vite dev server.

## Key Design Decisions
- All analysis is deterministic - same resume always gets same results
- Roasts use seeded randomization based on text hash for consistency
- No personal attacks in roasts - only targets resume writing/content
- Consent checkbox required before roasting
- PDF extraction warns if text seems image-based (<100 chars)
