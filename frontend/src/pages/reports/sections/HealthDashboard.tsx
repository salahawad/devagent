export default function HealthDashboard({ data }: { data: any[] }) {
  if (!data || data.length === 0) return null;

  const nameMap: Record<string, string> = {
    velocity_trend: 'Velocity Trend',
    code_review_culture: 'Code Review Culture',
    commit_traceability: 'Commit Traceability',
    wip_discipline: 'WIP Discipline',
    cicd_coverage: 'CI/CD Coverage',
    bus_factor: 'Bus Factor',
    cycle_time: 'Cycle Time',
    sprint_carry_over: 'Sprint Carry-over',
    blocked_items: 'Blocked Items',
    backlog_hygiene: 'Backlog Hygiene',
  };

  return (
    <section id="health" className="section">
      <div className="section-title">Team Health Dashboard</div>
      <div className="section-subtitle">{data.length} key indicators</div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 8, marginBottom: 8 }}>
        {data.map((h: any, i: number) => (
          <div key={i} style={{
            background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 4,
            padding: '14px 16px', display: 'flex', gap: 10, alignItems: 'flex-start',
          }}>
            <div className={`health-dot health-${h.status}`} style={{ marginTop: 3 }} />
            <div>
              <div style={{ fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--white)', marginBottom: 3 }}>
                {nameMap[h.indicator] || h.indicator}
              </div>
              <div style={{ fontSize: 10, color: 'var(--dim)', lineHeight: 1.4 }}>{h.detail}</div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
