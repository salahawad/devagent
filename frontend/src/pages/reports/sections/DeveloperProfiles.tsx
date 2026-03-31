const COLORS = ['var(--blue)', 'var(--green)', 'var(--amber)', 'var(--purple)', 'var(--red)'];

export default function DeveloperProfiles({ data }: { data: any[] }) {
  if (!data || data.length === 0) return null;

  return (
    <section id="profiles" className="section">
      <div className="section-title">Developer Profiles</div>
      <div className="section-subtitle">Combined metrics per developer</div>
      <div className="grid-2">
        {data.map((s: any, i: number) => {
          const dev = s.developer;
          const color = COLORS[i % COLORS.length];
          const bugFixRatio = s.total_commits > 0 ? Math.round((s.fix_commits / s.total_commits) * 100) : 0;

          return (
            <div key={s.id || i} style={{
              background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 4, overflow: 'hidden',
            }}>
              {/* Header */}
              <div style={{
                padding: '16px 20px', borderBottom: '1px solid var(--border)',
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 11 }}>
                  <div style={{
                    width: 32, height: 32, borderRadius: '50%', background: color,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontFamily: "'Bebas Neue', sans-serif", fontSize: 14, color: 'var(--bg)',
                  }}>
                    {dev?.display_name?.[0] || '?'}
                  </div>
                  <div>
                    <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 19, letterSpacing: '0.06em', color: 'var(--white)' }}>
                      {dev?.display_name || 'Unknown'}
                    </div>
                    <div style={{ fontSize: 10, color: 'var(--dim)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
                      {dev?.role || dev?.provider}
                    </div>
                  </div>
                </div>
              </div>

              {/* Body */}
              <div style={{ padding: '16px 20px' }}>
                {/* Metrics grid */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, marginBottom: 14 }}>
                  <div><div className="label">Commits</div><div style={{ fontFamily: "'Bebas Neue'", fontSize: 16, color }}>{s.total_commits}</div></div>
                  <div><div className="label">Active Days</div><div style={{ fontFamily: "'Bebas Neue'", fontSize: 16, color: 'var(--white)' }}>{s.active_days}</div></div>
                  <div><div className="label">Issues</div><div style={{ fontFamily: "'Bebas Neue'", fontSize: 16, color: 'var(--white)' }}>{s.total_issues}</div></div>
                  <div><div className="label">Story Points</div><div style={{ fontFamily: "'Bebas Neue'", fontSize: 16, color: 'var(--white)' }}>{Math.round(Number(s.story_points_total) || 0)}</div></div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, marginBottom: 14 }}>
                  <div><div className="label">Avg Cycle</div><div style={{ fontSize: 14, fontFamily: "'Bebas Neue'" }}>{Number(s.avg_cycle_time_days)?.toFixed(1) || '—'}d</div></div>
                  <div><div className="label">Median Cycle</div><div style={{ fontSize: 14, fontFamily: "'Bebas Neue'" }}>{Number(s.median_cycle_time_days)?.toFixed(1) || '—'}d</div></div>
                  <div><div className="label">Avg Lead</div><div style={{ fontSize: 14, fontFamily: "'Bebas Neue'" }}>{Number(s.avg_lead_time_days)?.toFixed(1) || '—'}d</div></div>
                  <div><div className="label">Completion</div><div style={{ fontSize: 14, fontFamily: "'Bebas Neue'" }}>{Math.round(Number(s.completion_rate) || 0)}%</div></div>
                </div>

                {/* Progress bars */}
                <div style={{ marginBottom: 10 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--dim)', marginBottom: 3 }}>
                    <span>Code churn</span>
                    <span style={{ color: Number(s.code_churn_pct) > 50 ? 'var(--red)' : Number(s.code_churn_pct) > 25 ? 'var(--amber)' : 'var(--green)' }}>
                      {Math.round(Number(s.code_churn_pct))}%
                    </span>
                  </div>
                  <div className="progress-bar">
                    <div className="progress-fill" style={{
                      width: `${Math.min(Number(s.code_churn_pct), 100)}%`,
                      background: Number(s.code_churn_pct) > 50 ? 'var(--red)' : Number(s.code_churn_pct) > 25 ? 'var(--amber)' : 'var(--green)',
                    }} />
                  </div>
                </div>

                <div style={{ marginBottom: 10 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--dim)', marginBottom: 3 }}>
                    <span>Bug-fix ratio</span>
                    <span style={{ color: bugFixRatio > 20 ? 'var(--red)' : 'var(--green)' }}>{bugFixRatio}%</span>
                  </div>
                  <div className="progress-bar">
                    <div className="progress-fill" style={{ width: `${bugFixRatio}%`, background: bugFixRatio > 20 ? 'var(--red)' : 'var(--green)' }} />
                  </div>
                </div>

                {/* Commit type bar */}
                <div style={{ display: 'flex', height: 5, borderRadius: 2, overflow: 'hidden', gap: 2, margin: '10px 0 4px' }}>
                  <div style={{ flex: s.feature_commits, background: color, borderRadius: 1, opacity: 0.8 }} />
                  <div style={{ flex: s.fix_commits, background: 'var(--red)', borderRadius: 1, opacity: 0.8 }} />
                  <div style={{ flex: s.merge_commits, background: 'var(--muted)', borderRadius: 1 }} />
                  {s.revert_commits > 0 && <div style={{ flex: s.revert_commits, background: 'var(--amber)', borderRadius: 1 }} />}
                </div>
                <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', fontSize: 10, color: 'var(--dim)' }}>
                  <span>Features ({s.feature_commits})</span>
                  <span>Fixes ({s.fix_commits})</span>
                  <span>Merges ({s.merge_commits})</span>
                  {s.revert_commits > 0 && <span>Reverts ({s.revert_commits})</span>}
                </div>

                {/* Alerts */}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 12 }}>
                  {Number(s.traceability_pct) < 20 && <span className="badge badge-red">{Math.round(Number(s.traceability_pct))}% traceability</span>}
                  {Number(s.code_churn_pct) > 50 && <span className="badge badge-red">{Math.round(Number(s.code_churn_pct))}% churn</span>}
                  {bugFixRatio > 20 && <span className="badge badge-red">{bugFixRatio}% fix ratio</span>}
                  {s.wip_count > 10 && <span className="badge badge-amber">WIP: {s.wip_count}</span>}
                  {s.blocked_count > 0 && <span className="badge badge-red">{s.blocked_count} blocked</span>}
                  {Number(s.completion_rate) >= 80 && <span className="badge badge-green">{Math.round(Number(s.completion_rate))}% completion</span>}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
