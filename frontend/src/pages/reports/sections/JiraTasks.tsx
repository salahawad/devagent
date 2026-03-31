export default function JiraTasks({ data }: { data: any[] }) {
  if (!data || data.length === 0) return null;

  const statusColors: Record<string, string> = {
    Done: 'var(--green)', Test: 'var(--blue)', 'In Progress': 'var(--amber)',
    'To Do': 'var(--dim)', Blocked: 'var(--red)', Review: 'var(--purple)',
  };

  return (
    <section id="jira" className="section">
      <div className="section-title">Task Overview</div>
      <div className="section-subtitle">Issue health and status distribution</div>
      <div className="grid-4" style={{ gap: 1, background: 'var(--border)', border: '1px solid var(--border)', borderRadius: 4, overflow: 'hidden' }}>
        {data.map((d, i) => (
          <div key={i} style={{ background: 'var(--bg2)', padding: 18 }}>
            <div style={{ fontSize: 10, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'var(--amber)', marginBottom: 12 }}>
              {d.developer}
            </div>
            <div style={{ fontFamily: "'Bebas Neue'", fontSize: 30, color: 'var(--white)', lineHeight: 1 }}>
              {d.total_issues}
            </div>
            <div style={{ fontSize: 10, color: 'var(--dim)', marginBottom: 9 }}>
              issues · {d.story_points} story points
            </div>

            {/* Status chips */}
            <div style={{ display: 'flex', gap: 3, flexWrap: 'wrap', marginBottom: 7 }}>
              {Object.entries(d.status_distribution || {}).map(([status, count]) => (
                <span key={status} style={{
                  fontSize: 9, letterSpacing: '0.06em', padding: '2px 6px', borderRadius: 2,
                  background: `${statusColors[status] || 'var(--dim)'}20`,
                  color: statusColors[status] || 'var(--dim)',
                }}>
                  {status} ({count as number})
                </span>
              ))}
            </div>

            {/* Stats */}
            <div style={{ fontSize: 11, display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border)', padding: '3px 0' }}>
              <span style={{ color: 'var(--dim)' }}>Completion</span>
              <span style={{ color: d.completion_rate >= 80 ? 'var(--green)' : 'var(--amber)' }}>{d.completion_rate}%</span>
            </div>
            <div style={{ fontSize: 11, display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border)', padding: '3px 0' }}>
              <span style={{ color: 'var(--dim)' }}>Stale To Do</span>
              <span style={{ color: d.stale_todos > 5 ? 'var(--red)' : 'var(--dim)' }}>{d.stale_todos}</span>
            </div>
            {d.blocked_count > 0 && (
              <div style={{ fontSize: 11, display: 'flex', justifyContent: 'space-between', padding: '3px 0' }}>
                <span style={{ color: 'var(--dim)' }}>Blocked</span>
                <span style={{ color: 'var(--red)' }}>{d.blocked_count}</span>
              </div>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}
