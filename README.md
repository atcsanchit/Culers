# Culers — FC Barcelona Fan Hub

Local-first Barça dashboard: fixtures, news, live match graphics, and post-match player ratings.

## Run

```bash
cd culers
npm install
npm run dev
```

Open [http://localhost:5175](http://localhost:5175).

## Features

- **Fetch latest** — pulls fixtures, squad, news, and live status from the web
- **Fixtures** — season archive + upcoming matches with W/L/D badges
- **News** — RSS aggregation (FC Barcelona, Google News, Marca)
- **Match day** — scoreboard, squad panel, **Go Live** with 30s polling + pitch graphic
- **Ratings** — rate coach and full squad after matches (stored in `localStorage`)

## Data sources (defaults)

Configured in `culers-fetch.ts` and documented in `src/lib/sources.ts`. You can swap or add sources later without changing the UI.

| Data | Current source |
|------|----------------|
| Fixtures | TheSportsDB |
| Squad | TheSportsDB |
| Live scores | TheSportsDB livescore + timeline |
| News | FC Barcelona RSS, Google News, Marca |

## Project layout

```
culers/
  api/[...path].ts       # Vercel serverless /api/* (same handlers as local)
  culers-fetch.ts        # Vite dev-server API middleware
  culers-api-handlers.ts # Shared API dispatcher
  vercel.json            # Vercel Hobby deploy settings
  src/
    components/          # UI pages and widgets
    store/               # React state + local persistence
    lib/                 # API helpers + source config slots
```

## Deploy (Vercel Hobby — free)

1. Import this repo in Vercel (Framework: Vite)
2. Build: `npm run build` · Output: `dist`
3. Deploy — `/api/*` is served by `api/[...path].ts`
