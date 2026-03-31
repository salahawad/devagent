export default function BusFactorSection({ data }: { data: any[] }) {
  if (!data || data.length === 0) return null;

  const scoreColor = (score: number) => score <= 1 ? 'var(--red)' : score <= 2 ? 'var(--amber)' : 'var(--green)';
  const borderClass = (score: number) => score <= 1 ? 'var(--red)' : score <= 2 ? 'var(--amber)' : 'var(--green)';

  return (
    <section id="bus-factor" className="section">
      <div className="section-title">Bus Factor</div>
      <div className="section-subtitle">Single-point-of-failure analysis</div>
      <div className="grid-3" style={{ gap: 10 }}>
        {data.map((r, i) => {
          const primary = r.contributors?.[0];
          return (
            <div key={i} style={{
              background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 4,
              padding: '16px 18px', position: 'relative', overflow: 'hidden',
              borderLeft: `3px solid ${borderClass(r.bus_factor_score)}`,
            }}>
              <div style={{ fontFamily: "'Bebas Neue'", fontSize: 16, letterSpacing: '0.06em', color: 'var(--white)', marginBottom: 6 }}>
                {r.repository}
              </div>
              <div style={{ fontFamily: "'Bebas Neue'", fontSize: 36, lineHeight: 1, color: scoreColor(r.bus_factor_score), marginBottom: 4 }}>
                {r.bus_factor_score}
              </div>
              {primary && (
                <div style={{ fontSize: 11, color: 'var(--dim)', marginBottom: 6 }}>
                  Primary: {primary.developer} ({primary.commit_pct}%)
                </div>
              )}
              <div style={{ height: 5, background: 'var(--border)', borderRadius: 2, overflow: 'hidden', marginBottom: 8 }}>
                <div style={{ height: '100%', width: `${primary?.commit_pct || 0}%`, background: scoreColor(r.bus_factor_score), borderRadius: 2 }} />
              </div>
              {r.contributors?.length > 1 && (
                <div style={{ fontSize: 10, color: 'var(--muted)' }}>
                  {r.contributors.slice(1).map((c: any) => `${c.developer} (${c.commit_pct}%)`).join(', ')}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
