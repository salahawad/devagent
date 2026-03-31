export default function CycleTime({ data }: { data: any[] }) {
  if (!data || data.length === 0) return null;

  return (
    <section id="cycle-time" className="section">
      <div className="section-title">Cycle Time & Lead Time</div>
      <div className="section-subtitle">From status transitions</div>
      <div className="grid-4" style={{ gap: 1, background: 'var(--border)', border: '1px solid var(--border)', borderRadius: 4, overflow: 'hidden' }}>
        {data.map((d, i) => (
          <div key={i} style={{ background: 'var(--bg2)', padding: 18 }}>
            <div style={{ fontSize: 10, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'var(--amber)', marginBottom: 12 }}>
              {d.developer}
            </div>
            <div style={{ fontFamily: "'Bebas Neue'", fontSize: 34, color: 'var(--white)', lineHeight: 1 }}>
              {d.avg_cycle_time ? `${d.avg_cycle_time.toFixed(1)}d` : '—'}
            </div>
            <div style={{ fontSize: 10, color: 'var(--dim)', marginBottom: 10 }}>avg cycle time</div>

            {[
              ['Median cycle', d.median_cycle_time ? `${d.median_cycle_time.toFixed(1)}d` : '—'],
              ['Avg lead time', d.avg_lead_time ? `${d.avg_lead_time.toFixed(1)}d` : '—'],
              ['Completed', d.completed_issues],
              ['Carry-over', `${Math.round(d.carry_over_rate || 0)}%`],
            ].map(([label, value], j) => (
              <div key={j} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, borderBottom: '1px solid var(--border)', padding: '3px 0' }}>
                <span style={{ color: 'var(--dim)' }}>{label}</span>
                <span>{value}</span>
              </div>
            ))}
          </div>
        ))}
      </div>
    </section>
  );
}
