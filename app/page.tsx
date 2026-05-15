export default function Home() {
  return (
    <main className="min-h-screen bg-bg-0 p-8">
      <div className="mx-auto max-w-3xl space-y-8">
        <header className="border-b border-border-subtle pb-6">
          <h1 className="text-3xl font-semibold text-text-primary">
            Investment Dashboard
          </h1>
          <p className="mt-2 text-sm text-text-secondary">
            M0 — repo-skelett verifierat. Inga features än.
          </p>
        </header>

        <section className="rounded border border-border-default bg-bg-1 p-6">
          <h2 className="mb-4 text-lg font-medium text-text-primary">
            Designtokens
          </h2>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="rounded bg-bg-2 p-3">
              <span className="tabular text-pnl-positive">+12 450,75 SEK</span>
              <p className="mt-1 text-xs text-text-muted">PnL positive</p>
            </div>
            <div className="rounded bg-bg-2 p-3">
              <span className="tabular text-pnl-negative">−3 280,40 SEK</span>
              <p className="mt-1 text-xs text-text-muted">PnL negative</p>
            </div>
            <div className="rounded bg-bg-2 p-3">
              <span className="tabular text-warning">⚠ thesis flag</span>
              <p className="mt-1 text-xs text-text-muted">Warning</p>
            </div>
            <div className="rounded bg-bg-2 p-3">
              <span className="tabular text-neutral-data">URTH +8,2%</span>
              <p className="mt-1 text-xs text-text-muted">Benchmark / data</p>
            </div>
          </div>
        </section>

        <footer className="text-xs text-text-muted">
          Nästa: M1 — Drizzle schema + Supabase-koppling.
        </footer>
      </div>
    </main>
  );
}
