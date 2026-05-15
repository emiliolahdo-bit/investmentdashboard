# Implementationsplan — Investment Dashboard v1

## Kontext

Bygger ett personligt command center för en 50 000 SEK satellite-portfölj
inriktad på strukturella långsiktiga teman (AI-compute, energi, läkemedel/
longevity, försvar). Avanza ISK-konto, SEK som basvaluta.

Dashboarden har två syften:
1. **Minne** — strukturerad lagring av positioner, transaktioner, watchlist
   och beslut.
2. **Behavioral skydd genom design** — "Why-Buy modal" med tvingande
   reflektionsfrågor (tes, invalidations-trigger, känslosskala, tre-nivå-test)
   plus en 5-sekunders nedräkning innan transaktion sparas. Friktionen sitter
   *bara* i reflektionen — sifferinmatning ska vara snabb (under 15 sekunder).

Användaren är nybörjare på programmering och arbetar i Claude Code-webbappen.
Stacken är fastställd: Next.js 14 (App Router) + TypeScript, Supabase
(PostgreSQL), Drizzle ORM, Tailwind + shadcn/ui, Recharts, yahoo-finance2,
react-hook-form + zod, date-fns. Mörk Bloomberg/TradingView-estetik med
IBM Plex Sans (UI) + JetBrains Mono (siffror).

## Arkitekturella beslut

| Beslut | Val | Varför |
|---|---|---|
| Antal aktier i positions | **Cachat** (uppdateras automatiskt vid varje transaktionsändring i app-logik, inte DB-triggers) | Snabb läsning. Säkerhetsnät via `recalculate_positions`-script. |
| Multi-position samma ticker | **Tillåt** | Användaren kan ha samma ticker som core + moonshot. |
| Why-Buy-flöde | **Stepper, en fråga i taget** | Tvingar reflektion, kan inte skummas. |
| Tre-nivå-test | **3 separata booleans** (`test_bolag_ok`, `test_tema_ok`, `test_tajming_ok`) | Bevarar information, tvingar 3 medvetna ja. |
| Invalidation-validering | **Min 30 tecken + minst en siffra** (`/\d/` regex) | "om Q3 revenue < $X bn" ja, "om det går dåligt" nej. |
| Sälj/Trim | **Samma modal, dynamisk frågetext** baserat på transaction_type | Återanvänd kod. |
| Drizzle workflow | **`drizzle-kit push`** (ej migrations) | En användare, en miljö — migrations är onödig komplexitet i v1. |
| Numeric precision | **`numeric(18, 6)`** för pris/quantity, aldrig `float` | Decimaldrift på pengar är värsta nybörjarbuggen. |
| Courtage default | **Avanza Mini: max(39 SEK, 0,25% * ordervärde)** i `lib/utils/constants.ts` | Användaren kan skriva över manuellt. |
| Tester | **Vitest endast på rena funktioner** (`format.ts`, `calc.ts`, `recalculate.ts`, ticker-mapping) | Ingen komponent-testning i v1. |
| Cron | **Vercel Cron** (kräver Production-deploy) | Set-and-forget för EOD-snapshots. |

## Milstolpar

Vertikal slice (M0-M5) ska köra end-to-end efter ca 3 arbetsdagar. Det är
projektets motivations-checkpoint.

### M0 — Repo-skelett + första deploy
- **Levererar:** Next.js 14 + TS + Tailwind som bygger lokalt och på Vercel.
- **Filer:** `package.json`, `tsconfig.json`, `next.config.mjs`,
  `tailwind.config.ts`, `app/layout.tsx`, `app/page.tsx` (placeholder),
  `app/globals.css` med alla design-tokens som CSS-variabler,
  `.env.local.example`, `.gitignore`, `.nvmrc`.
- **Acceptans:** `npm run dev` renderar; `npm run build` lyckas; Vercel
  preview-URL grön.
- **Första commit:** Exakt dessa filer. Inget Supabase än.

### M1 — Drizzle schema + Supabase-koppling + seed
- **Levererar:** Alla 6 tabeller finns i Supabase. Seed-script lägger in
  testdata.
- **Filer:** `drizzle.config.ts`, `lib/db/schema.ts`, `lib/db/client.ts`
  (postgres-js + Drizzle), `lib/db/seed.ts`.
- **Tabeller (exakt schema):**
  - `positions`: ticker, namn, börs (enum), valuta (enum), tema, kategori
    (enum: core/aggressive/moonshot), conviction_score (1-10), status (enum),
    thesis_text, thesis_invalidation_trigger, max_drawdown_review_pct,
    max_drawdown_sell_pct, first_trim_zone, **antal_aktier** (cached),
    skapad_datum, uppdaterad_datum, thesis_skapad_datum.
  - `transactions`: id, position_id (FK nullable), typ (enum), datum,
    antal_aktier, pris_per_aktie, valutakurs_vid_handel, courtage_sek,
    total_kostnad_sek, motivering, kanslo_skala (1-5), **test_bolag_ok**,
    **test_tema_ok**, **test_tajming_ok**, broker_order_id (nullable).
  - `watchlist`, `decision_journal`, `price_snapshots`,
    `benchmark_snapshots` — enligt original-spec.
- **Acceptans:** `npm run db:push` synkar, `npm run db:seed` visar rader i
  Supabase Studio.
- **Bekräftat projekt:** `lmmkzwrxpyuckaofxlbe` ("emiliolahdo@gmail.com's
  investeringar"), region `eu-north-1` (Stockholm), Postgres 17.
- **Två URL:er används:**
  - `DATABASE_URL` = **pooled** (port 6543) — appen i drift.
    Format: `postgresql://postgres.lmmkzwrxpyuckaofxlbe:[PWD]@aws-0-eu-north-1.pooler.supabase.com:6543/postgres?pgbouncer=true`
  - `DIRECT_URL` = **direct** (port 5432) — drizzle-kit push (DDL).
    Format: `postgresql://postgres:[PWD]@db.lmmkzwrxpyuckaofxlbe.supabase.co:5432/postgres`
- **Lagring:** Båda sätts som env-secrets via Claude Code-webbens
  environment-inställningar (persisterar mellan sessioner). Ingen
  `.env.local`-fil behövs i container.
- **Gotchas:**
  - `pgEnum` ska bara definieras en gång.
  - Lösenordet finns inne i URL:en — aldrig committa eller klistra in
    URL:en i chatten.
  - Pooled användarnamnet är `postgres.PROJECTREF`, direkt är bara `postgres`.

### M2 — Utility-scaffolding
- **Levererar:** Alla format/parse-helpers innan någon vy behöver dem.
- **Filer:**
  - `lib/utils/format.ts` — `formatSEK`, `formatPercent`, `formatNumber`,
    `formatDate` med `sv-SE` locale, tabular nums.
  - `lib/utils/yahoo-ticker.ts` — mappar börs-enum till Yahoo-suffix
    (STO→`.ST`, FRA→`.F`, NASDAQ→ingen). Hantera Avanza-quirks
    (`INVE-B.ST`, inte `INVE.B.ST`).
  - `lib/utils/calc.ts` — `calcCourtageMini(ordervärdeSEK)` =
    `Math.max(39, 0.0025 * ordervärdeSEK)`.
  - `lib/utils/constants.ts` — themes, kategorier, courtage-tier, Yahoo
    rate-limit settings.
- **Acceptans:** Vitest unit tests för varje pure function.

### M3 — DB-queries-lager + Yahoo-prisinterface
- **Levererar:** Typade läs/skriv-funktioner och en pris-fetcher.
- **Filer:**
  - `lib/db/queries/positions.ts`, `queries/transactions.ts`,
    `queries/watchlist.ts`, `queries/journal.ts`, `queries/snapshots.ts`.
  - `lib/prices/yahoo.ts` — interface `getQuote(ticker)` och
    `getHistorical(ticker, from, to)`. Wrapparmar `yahoo-finance2` så att
    resten av appen kan byta källa utan att veta om det.
  - `lib/transactions/recalculate.ts` — pure function. Givet
    transactions för en position, returnera korrekt `antal_aktier` och
    snittpris. Anropas automatiskt vid varje transaction-insert/update/delete.
- **Acceptans:** Vitest integration-test mot ett test-projekt i Supabase
  som verifierar att recalculate korrekt hanterar buy/sell/trim/add/dividend.

### M4 — App-skal + shadcn-installation
- **Levererar:** Layout med vänster-sidebar, dark mode, fonts laddade, fyra
  rutter (placeholders).
- **Filer:** `app/layout.tsx` (fonts via `next/font/google`),
  `components/layout/Sidebar.tsx`, `components/layout/AppShell.tsx`, samt
  fyra `app/(dashboard)/{overview,positions,watchlist,journal}/page.tsx`.
- **shadcn-komponenter:** button, dialog, input, select, form, table,
  checkbox, popover, calendar, sonner.
- **Gotchas:** Override `--radius: 4px` i `globals.css` — shadcn-default är
  för rundat. Tabular-nums-utility-klass `.tabular`.

### M5 — Positions-vyn (read-only) — **VERTIKAL SLICE KLAR**
- **Levererar:** Verklig seed-data renderas som tabell med marknadsvärde,
  PnL, vikt, tema. Appen är "alive."
- **Filer:** `app/(dashboard)/positions/page.tsx` (server component),
  `components/positions/PositionsTable.tsx`, `lib/positions/derive.ts`
  (`marketValue`, `unrealizedPnL`, `weight` från position + senaste
  price_snapshot).
- **Acceptans:** Visa seed-position, korrekt formaterad, grön/röd PnL,
  sv-SE-locale.

### M6 — Transaktionsformulär (utan modal-wrapper än)
- **Levererar:** `/transactions/new`-rutt med fullt formulär (react-hook-form
  + zod).
- **Filer:** `app/transactions/new/page.tsx`,
  `components/transactions/TransactionForm.tsx`,
  `lib/transactions/schema.ts` (zod per typ),
  `app/api/transactions/route.ts` (POST), `app/api/quote/[ticker]/route.ts`
  (server-side Yahoo-proxy).
- **Snabb data-entry (kritiskt krav):**
  - Autofocus på antal_aktier vid öppning.
  - Ticker autofyller namn/börs/valuta (300ms debounce).
  - Senaste pris förifyllt.
  - Datum default = idag.
  - Courtage auto-beräknas (Avanza Mini).
  - Total SEK visas live ovanför submit.
  - Tab-ordning: Antal → Pris → Datum → Courtage → Nästa.
- **Acceptans:** Submit av köp → ny rad i transactions → position.antal_aktier
  uppdateras → /positions reflekterar nya summan.
- **Gotcha:** react-hook-form `Controller` (inte `register`) för shadcn-inputs.

### M7 — Why-Buy stepper-modal som wrappar formuläret
- **Levererar:** "Lägg till transaktion"-knapp på Positions öppnar dialog
  med en reflektionsfråga per steg, sedan sifferfälten, sedan
  sammanfattning + 5s countdown.
- **Filer:** `components/transactions/WhyBuyModal.tsx`,
  `components/transactions/steps/` (en per steg: Motivering,
  TreNivaaTest, Invalidation, Kanslo, Siffror, Sammanfattning).
- **Step-ordning:**
  1. Motivering (textarea, min 20 tecken, räknare visar tecken kvar)
  2. Tre-nivå-test (3 separata checkboxar: Bolag / Tema / Tajming)
  3. Invalidation (textarea, min 30 tecken + minst en siffra)
  4. Känsloskala (slider med ord: Lugn/Eftertänksam/Aktiv/Spänd/FOMO)
  5. Siffror (formuläret från M6)
  6. Sammanfattning + 5s countdown
- **Acceptans:** Kan inte gå förbi steg N utan giltig input. Bakåt-knapp
  bevarar state. Invalidation-fältet avvisar "när det går dåligt", accepterar
  "om Q3 revenue < $X bn".
- **Gotcha:** Håll en enda `useForm` runt hela steppern; villkorlig
  rendering av steg, **unmounta inte** — då tappas form-state.

### M8 — Sälj/Trim-variant
- **Levererar:** Samma modal med dynamisk frågetext för
  buy/sell/trim/add/dividend.
- **Filer:** Utöka `WhyBuyModal.tsx` med `transactionType`-prop, frågetext
  via en strings-map (`lib/transactions/copy.ts`).
- **Acceptans:** Från en position-rad öppnar "Sälj"-knapp samma modal med
  sälj-flavored copy.

### M9 — Watchlist-vyn med live-priser
- **Levererar:** Watchlist-tabell som refreshar var 60:e sekund och visar
  current price vs entry barrier.
- **Filer:** `app/(dashboard)/watchlist/page.tsx`,
  `components/watchlist/WatchlistTable.tsx` (client, useSWR/useQuery med
  `refetchInterval: 60_000`, `refetchIntervalInBackground: false`),
  `app/api/prices/live/route.ts` (batchad Yahoo-quote för flera tickers),
  `components/watchlist/WatchlistForm.tsx`.
- **Acceptans:** Lägg till rad → live-pris uppdateras → rad highlights när
  priset korsar barriär.
- **Gotcha:** Batcha tickers i ett anrop. Pausa när tab är dold.

### M10 — Journal-vyn
- **Levererar:** Journal-lista filterbar per typ + formulär för
  abstained/behavioral-entries. Executed trades skapar journal-rader
  automatiskt från M7.
- **Filer:** `app/(dashboard)/journal/page.tsx`,
  `components/journal/JournalTable.tsx`, `components/journal/JournalForm.tsx`.
- **Scope-cut:** `vad_ai_sa` och `utfall_efter_30_dagar` är endast textfält
  i edit-formuläret. Ingen 30-dagars-påminnelse i v1.
- **Acceptans:** Varje executed buy/sell skapar journal-entry; abstained
  recommendations kan loggas utan transaction.

### M11 — Overview-vyn
- **Levererar:** Toppnivå-summering: totalt portföljvärde, daglig/MTD/YTD
  PnL, tema-allokering (pie), top movers, recent journal entries.
- **Filer:** `app/(dashboard)/overview/page.tsx`,
  `components/overview/Scorecards.tsx`,
  `components/overview/ThemeAllocation.tsx` (Recharts),
  `lib/positions/aggregate.ts`.
- **Acceptans:** Siffror reconcilerar med Positions-vyn (sanity check).

### M12 — Vercel Cron: EOD-snapshot
- **Levererar:** Nattlig job som lagrar stängningskurser för alla aktiva
  positioner + benchmark (URTH).
- **Filer:** `app/api/cron/eod-snapshot/route.ts`, `vercel.json` med
  cron-config, `lib/snapshots/run-eod.ts`.
- **Säkerhet:** `CRON_SECRET` env-var, kontrollera header i handler.
- **Schema:** `0 22 * * 1-5` UTC (efter US-stängning, vardagar).
- **Gotcha:** Vercel Cron körs bara på Production-deploy, inte Preview.
  Hobby tier max once/day räcker.

### M13 — Benchmark-jämförelse på Overview
- **Levererar:** Linjediagram portföljvärde vs URTH sedan första
  transaktionen, båda rebased till 100.
- **Filer:** `components/overview/BenchmarkChart.tsx` (Recharts dual-line),
  `lib/benchmark/normalize.ts`.
- **Acceptans:** Båda linjer synliga, tooltip visar båda värden.

### M14 — Manuell recalculate-script + polish
- **Levererar:** `npm run recalc` kör om position-aggregeringen från
  transactions. Liten bug-pass.
- **Filer:** `scripts/recalculate.ts` (wrappar `lib/transactions/recalculate.ts`).

## Designtokens (CSS-variabler i `app/globals.css`)

```css
--bg-0: #0a0a0b;
--bg-1: #111114;
--bg-2: #1a1a1f;
--bg-3: #26262e;
--text-primary: #f5f5f7;
--text-secondary: #a1a1aa;
--text-muted: #6b6b73;
--border-subtle: #1f1f24;
--border-default: #2a2a31;
--pnl-positive: #22c55e;
--pnl-negative: #ef4444;
--warning: #f59e0b;
--neutral-data: #3b82f6;
--info: #06b6d4;
--radius: 4px;
```

## Kritiska filer

- `lib/db/schema.ts` — sanningen för datamodellen
- `lib/db/queries/positions.ts` — alla position-läsningar
- `lib/transactions/recalculate.ts` — penningkorrekthet
- `lib/prices/yahoo.ts` — pris-interface (utbytbart)
- `lib/utils/format.ts` — sv-SE formatering överallt
- `components/transactions/WhyBuyModal.tsx` — behavioral kärna
- `app/api/transactions/route.ts` — transaction-insert + auto-recalc
- `app/api/cron/eod-snapshot/route.ts` — nattlig prisinsamling

## Återanvändbara bibliotek/mönster

- **shadcn `Dialog`** för modal-wrappern
- **react-hook-form `Controller`** för shadcn-inputs
- **Drizzle `relations` API** för joins (transaction → position)
- **`next/font/google`** för IBM Plex + JetBrains Mono
- **`postgres-js`** som driver (snabbare än `pg` för serverless)
- **Recharts `LineChart` + `ResponsiveContainer`** för benchmark-grafer

## Test-strategi

Endast Vitest, endast på pure functions:
1. `lib/utils/format.ts`, `calc.ts` — locale + courtage
2. `lib/transactions/recalculate.ts` — table-driven tests för alla
   transaktionstyper (buy/sell/trim/add/dividend)
3. `lib/utils/yahoo-ticker.ts` — suffix-mapping inkl. Avanza-quirks

Ingen komponent-testning, ingen Playwright i v1.

## Risker att flagga

1. **Yahoo Finance är inofficiellt API** — `yahoo-finance2` kan brytas om
   Yahoo ändrar format. Cacha aggressivt i `price_snapshots`.
2. **Avanza courtage-tiers ändras** — håll det i `constants.ts`, kommentera
   källa.
3. **Tidszoner** — alla timestamps lagras UTC, renderas
   `Europe/Stockholm`. Cron-schemat är UTC.
4. **Vercel Cron Hobby = max 1/dag** — räcker för EOD, men om vi vill ha
   intra-day i v2 måste tier bytas.
5. **`thesis_invalidation` regex `/\d/` är svag** — kompletterad med
   min-30-tecken-krav.

## Verifiering — end-to-end-test efter implementation

Manuell körning som verifierar hela kedjan:

1. **DB-uppsättning:** Logga in på Supabase Studio, verifiera att alla 6
   tabeller finns med korrekta kolumner. Kör `npm run db:seed`,
   verifiera testdata.
2. **Lokal dev:** `npm run dev`. Navigera till `/positions` — seed-positionen
   syns med rätt format.
3. **Köp-flöde:** Klicka "Lägg till transaktion" på Positions. Verifiera:
   - Modal öppnas, fokuserar på första frågan.
   - Försök gå förbi steg 1 utan att fylla i 20 tecken — knappen disabled.
   - I invalidations-steget, skriv "om det går dåligt" — avvisas.
   - Skriv "om Q3 revenue < $30 bn 2026" — accepteras.
   - I siffer-steget, skriv ticker "NVDA" — namn/börs/valuta/pris autofylls.
   - Tab genom alla fält, total SEK uppdateras live.
   - Sammanfattning visas, countdown från 5 → 0.
   - Spara → /positions visar uppdaterat antal_aktier.
   - /journal visar ny rad av typ `executed_trade`.
4. **Watchlist:** Lägg till en ticker. Verifiera live-pris uppdateras inom
   60s.
5. **Recalculate-säkerhetsnät:** Manuellt ändra `position.antal_aktier`
   i Supabase Studio till fel värde. Kör `npm run recalc`. Verifiera att
   värdet återställs.
6. **Production-deploy:** Push till GitHub, verifiera Vercel-deploy. Trigga
   cron-endpoint manuellt med `CRON_SECRET`-header. Verifiera nya rader i
   `price_snapshots` och `benchmark_snapshots`.
7. **Overview:** Verifiera att totalsumma + tema-pie + benchmark-graf
   matchar Positions-vyns siffror.

## Tidsestimering

~10-11 arbetsdagar för nybörjare med Claude Code-assistans. Vertikal slice
(M0-M5) klar efter ~3 dagar — då blir projektet motiverande att fortsätta
bygga.

## Commit-strategi

En commit per milstolpe (eller mindre delsteg när komponenter är stora).
Commit-meddelanden på engelska, t.ex. `M5: render positions table with
seed data`. Push till `claude/enable-superpowers-UnbGf` efter varje
milstolpe.
