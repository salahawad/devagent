export default function Blockers({ data }: { data: any }) {
  if (!data) return null;

  return (
    <section id="blockers" className="section">
      <div className="section-title">Blockers & Stale Items</div>
      <div className="section-subtitle">Issues requiring attention</div>
      <div className="grid-2">
        <div>
          <div style={{ fontSize: 11, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--red)', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 7 }}>
            <span style={{ width: 7, height: 7, background: 'var(--red)', borderRadius: '50%', display: 'inline-block' }} />
            Blocked / Needs Info — {data.blocked?.length || 0} issues
          </div>
          <div className="table-wrap" style={{ padding: '4px 14px' }}>
            <table style={{ fontSize: 11 }}>
              <thead><tr><th>Dev</th><th>Key</th><th>Status</th><th>Age</th><th>SP</th><th>Summary</th></tr></thead>
              <tbody>
                {(data.blocked || []).map((b: any, i: number) => (
                  <tr key={i}>
                    <td style={{ color: 'var(--amber)' }}>{b.developer}</td>
                    <td style={{ color: 'var(--blue)' }}>{b.key}</td>
                    <td><span className="badge badge-red">{b.status}</span></td>
                    <td><span className={`badge ${b.age_days > 30 ? 'badge-red' : b.age_days > 14 ? 'badge-amber' : 'badge-green'}`}>{b.age_days}d</span></td>
                    <td>{b.story_points}</td>
                    <td style={{ color: 'var(--dim)', fontSize: 10 }}>{b.title}</td>
                  </tr>
                ))}
                {(!data.blocked || data.blocked.length === 0) && (
                  <tr><td colSpan={6} style={{ textAlign: 'center', color: 'var(--dim)', padding: 20 }}>No blocked items</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
        <div>
          <div style={{ fontSize: 11, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--amber)', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 7 }}>
            <span style={{ width: 7, height: 7, background: 'var(--amber)', borderRadius: '50%', display: 'inline-block' }} />
            Stale To Do &gt;14 days — {data.stale?.length || 0} items
          </div>
          <div className="table-wrap" style={{ padding: '4px 14px' }}>
            <table style={{ fontSize: 11 }}>
              <thead><tr><th>Dev</th><th>Key</th><th>Age</th><th>SP</th><th>Summary</th></tr></thead>
              <tbody>
                {(data.stale || []).map((s: any, i: number) => (
                  <tr key={i}>
                    <td style={{ color: 'var(--amber)' }}>{s.developer}</td>
                    <td style={{ color: 'var(--blue)' }}>{s.key}</td>
                    <td><span className={`badge ${s.age_days > 30 ? 'badge-red' : 'badge-amber'}`}>{s.age_days}d</span></td>
                    <td>{s.story_points}</td>
                    <td style={{ color: 'var(--dim)', fontSize: 10 }}>{s.title}</td>
                  </tr>
                ))}
                {(!data.stale || data.stale.length === 0) && (
                  <tr><td colSpan={5} style={{ textAlign: 'center', color: 'var(--dim)', padding: 20 }}>No stale items</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </section>
  );
}
