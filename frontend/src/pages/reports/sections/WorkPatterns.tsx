export default function WorkPatterns({ data }: { data: any[] }) {
  if (!data || data.length === 0) return null;

  const periods = [
    { key: 'morning_pct', label: 'Morning' },
    { key: 'afternoon_pct', label: 'Afternoon' },
    { key: 'evening_pct', label: 'Evening' },
    { key: 'late_night_pct', label: 'Late Night' },
  ];

  return (
    <section id="patterns" className="section">
      <div className="section-title">Work Patterns</div>
      <div className="section-subtitle">Commit timestamp analysis</div>
      <div className="grid-4" style={{ gap: 1, background: 'var(--border)', border: '1px solid var(--border)', borderRadius: 4, overflow: 'hidden' }}>
        {data.map((d, i) => (
          <div key={i} style={{ background: 'var(--bg2)', padding: 18 }}>
            <div style={{ fontSize: 10, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'var(--amber)', marginBottom: 12 }}>
              {d.developer}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 5, marginBottom: 12 }}>
              {periods.map(p => {
                const val = d[p.key] || 0;
                return (
                  <div key={p.key} style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                    <div style={{ fontSize: 10, color: 'var(--dim)', width: 64, flexShrink: 0 }}>{p.label}</div>
                    <div style={{ flex: 1, height: 5, background: 'var(--border)', borderRadius: 2, overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${val}%`, background: 'var(--amber)', borderRadius: 2, opacity: p.key === 'late_night_pct' ? 0.7 : 1 }} />
                    </div>
                    <div style={{ fontSize: 10, color: 'var(--dim)', width: 28, textAlign: 'right' }}>{val}%</div>
                  </div>
                );
              })}
            </div>
            <div style={{ fontSize: 11, display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border)', padding: '3px 0' }}>
              <span style={{ color: 'var(--dim)' }}>Peak hours</span><span>{d.peak_hours || '—'}</span>
            </div>
            <div style={{ fontSize: 11, display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border)', padding: '3px 0' }}>
              <span style={{ color: 'var(--dim)' }}>Busiest day</span><span>{d.busiest_day || '—'}</span>
            </div>
            <div style={{ fontSize: 11, display: 'flex', justifyContent: 'space-between', padding: '3px 0' }}>
              <span style={{ color: 'var(--dim)' }}>Multi-project days</span><span style={{ color: 'var(--amber)' }}>{d.multi_project_day_pct || 0}%</span>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
