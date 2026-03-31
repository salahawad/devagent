export default function CiCd({ data }: { data: any[] }) {
  if (!data || data.length === 0) return null;

  return (
    <section id="ci/cd" className="section">
      <div className="section-title">CI/CD Pipeline Health</div>
      <div className="section-subtitle">Pass rates by repository</div>
      <div className="card">
        {data.map((r, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 0', borderBottom: i < data.length - 1 ? '1px solid var(--border)' : 'none' }}>
            <div style={{ fontSize: 11, color: 'var(--text)', width: 140, flexShrink: 0 }}>{r.repository}</div>
            <div style={{ flex: 1, height: 6, background: 'var(--border)', borderRadius: 3, overflow: 'hidden' }}>
              <div style={{
                height: '100%', width: `${r.pass_rate}%`, borderRadius: 3,
                background: r.pass_rate >= 90 ? 'var(--green)' : r.pass_rate >= 70 ? 'var(--amber)' : 'var(--red)',
              }} />
            </div>
            <div style={{ fontSize: 11, width: 42, textAlign: 'right', color: r.pass_rate >= 90 ? 'var(--green)' : r.pass_rate >= 70 ? 'var(--amber)' : 'var(--red)' }}>
              {r.pass_rate}%
            </div>
            <div style={{ fontSize: 10, color: 'var(--dim)', width: 60, textAlign: 'right' }}>
              {r.total_runs} runs
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
