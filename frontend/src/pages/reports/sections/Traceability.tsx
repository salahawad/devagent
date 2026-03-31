export default function Traceability({ data }: { data: any[] }) {
  if (!data || data.length === 0) return null;

  return (
    <section id="traceability" className="section">
      <div className="section-title">Commit Traceability</div>
      <div className="section-subtitle">Ticket references in commit messages</div>
      <div className="grid-4" style={{ gap: 14 }}>
        {data.map((d, i) => {
          const pct = d.traceability_pct || 0;
          const color = pct >= 60 ? 'var(--green)' : pct >= 30 ? 'var(--amber)' : 'var(--red)';
          return (
            <div key={i} className="card">
              <div style={{ fontFamily: "'Bebas Neue'", fontSize: 44, lineHeight: 1, color, marginBottom: 3 }}>
                {pct}%
              </div>
              <div style={{ fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 10 }}>{d.developer}</div>
              <div style={{ height: 5, background: 'var(--border)', borderRadius: 3, overflow: 'hidden', marginBottom: 10 }}>
                <div style={{ height: '100%', width: `${pct}%`, background: color, borderRadius: 3 }} />
              </div>
              <div style={{ fontSize: 11, color: 'var(--dim)' }}>{d.total_commits} total commits</div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
