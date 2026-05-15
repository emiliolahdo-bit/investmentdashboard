# Investment Dashboard

Personligt command center för en 50 000 SEK satellite-portfölj inriktad på
strukturella långsiktiga teman (AI-compute, energi, läkemedel/longevity,
försvar). Mäklare: Avanza (ISK-konto). Basvaluta: SEK.

Dashboarden har två syften:

1. **Minne** — strukturerad lagring av positioner, transaktioner,
   watchlist och beslut.
2. **Behavioral skydd genom design** — "Why-Buy modal" med tvingande
   reflektionsfrågor innan varje transaktion sparas.

## Stack

- Next.js 14 (App Router) + TypeScript
- Supabase (PostgreSQL) + Drizzle ORM
- Tailwind CSS + shadcn/ui
- Recharts (charts) + yahoo-finance2 (priser)
- react-hook-form + zod
- IBM Plex Sans (UI) + JetBrains Mono (siffror)

## Komma igång

```bash
# 1. Använd Node 22 (definierat i .nvmrc)
nvm use

# 2. Installera dependencies
npm install

# 3. Kopiera env-template och fyll i Supabase-credentials
cp .env.local.example .env.local

# 4. Starta dev-servern
npm run dev
```

Öppna [http://localhost:3000](http://localhost:3000).

## Scripts

| Kommando | Vad det gör |
|---|---|
| `npm run dev` | Startar Next.js i dev-läge (hot reload) |
| `npm run build` | Bygger för produktion |
| `npm run start` | Startar produktions-build lokalt |
| `npm run lint` | Kör Next.js linter |
| `npm run typecheck` | Kör TypeScript-kontroll utan att bygga |

## Milstolpar

Implementation följer planen i `/root/.claude/plans/`. Aktuell status:

- [x] **M0** — Repo-skelett + designtokens
- [ ] **M1** — Drizzle schema + Supabase
- [ ] **M2** — Utility-scaffolding
- [ ] **M3** — DB-queries + Yahoo-prisinterface
- [ ] **M4** — App-skal + shadcn
- [ ] **M5** — Positions-vyn (read-only)
- [ ] **M6** — Transaktionsformulär
- [ ] **M7** — Why-Buy stepper-modal
- [ ] **M8** — Sälj/Trim-variant
- [ ] **M9** — Watchlist + live-priser
- [ ] **M10** — Journal-vyn
- [ ] **M11** — Overview-vyn
- [ ] **M12** — Vercel Cron (EOD-snapshot)
- [ ] **M13** — Benchmark-jämförelse
- [ ] **M14** — Recalculate-script + polish
