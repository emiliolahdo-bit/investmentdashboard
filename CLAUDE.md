# CLAUDE.md — kontext för AI-assistenter

## Projekt

Personlig investment dashboard. Se `docs/plan.md` för fullständig
implementationsplan (M0-M14).

## Kommunikationsregler

- **Svenska** i all dialog med användaren.
- **Pedagogiskt, inte tekniskt** — användaren är nybörjare på programmering.
- **En milstolpe i taget** — vänta på godkännande mellan milstolpar.
- **Förklara VARFÖR**, inte bara VAD.

## Stack

Next.js 14 (App Router) + TypeScript, Supabase (PostgreSQL), Drizzle ORM,
Tailwind + shadcn/ui, Recharts, yahoo-finance2, react-hook-form + zod,
date-fns. IBM Plex Sans (UI) + JetBrains Mono (siffror).

## Designprinciper

Mörk Bloomberg/TradingView-estetik. Designtokens definierade som
CSS-variabler i `app/globals.css` och exponerade via Tailwind:
`bg-bg-0..3`, `text-pnl-positive/negative`, `text-warning`,
`text-neutral-data`. 4px border-radius. `.tabular` klass för alla siffror.

## Designval (lås — ändra inte utan diskussion)

- `positions.antal_aktier` är **cachat** och uppdateras automatiskt vid
  varje transaktionsändring i app-logik (inte DB-triggers).
- Multi-position per ticker tillåts (core + moonshot).
- Why-Buy-modal visar reflektionsfrågor **en i taget** (stepper).
- Tre-nivå-test = **3 separata booleans** (`test_bolag_ok`, `test_tema_ok`,
  `test_tajming_ok`).
- Thesis invalidation kräver **min 30 tecken + minst en siffra**.
- `numeric(18, 6)` för pris/quantity (aldrig float).
- Sifferinmatning ska vara snabb (under 15 sekunder).

## Supabase

Projekt: `lmmkzwrxpyuckaofxlbe` ("emiliolahdo@gmail.com's investeringar"),
region `eu-north-1`, Postgres 17.

Environment-variabler (sätts som env-secrets i Claude Code-webben):
- `DATABASE_URL` = pooled (port 6543) för app-runtime
- `DIRECT_URL` = direct (port 5432) för `drizzle-kit push`

Aldrig committa connection-strängar eller klistra in dem i chatten.

## Git-arbetsflöde

- Branch: `claude/enable-superpowers-UnbGf`
- Commit-meddelanden på engelska (kort prefix `M0:`, `M1:` etc.)
- En commit per milstolpe (eller mindre delsteg).
- Push efter varje milstolpe.

## Status

Aktuell milstolpe spåras i `README.md` checklist. Senast slutförda
milstolpe visar var nästa session ska börja.
