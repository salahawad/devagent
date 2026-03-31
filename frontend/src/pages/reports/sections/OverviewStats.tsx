export default function OverviewStats({ data }: { data: any }) {
  if (!data) return null;
  const stats = [
    { label: 'Total Commits', value: data.total_commits, sub: 'all engineers' },
    { label: 'Lines Added', value: data.lines_added >= 1000 ? `${Math.round(data.lines_added / 1000)}K` : data.lines_added, sub: `net +${data.lines_added?.toLocaleString()}` },
    { label: 'Issues', value: data.total_issues, sub: 'team backlog' },
    { label: 'Story Points', value: Math.round(data.story_points), sub: 'allocated total' },
    { label: 'CI Pass Rate', value: `${data.ci_pass_rate}%`, sub: 'pipeline success', color: data.ci_pass_rate >= 90 ? 'var(--green)' : data.ci_pass_rate >= 70 ? 'var(--amber)' : 'var(--red)' },
  ];

  return (
    <div id="overview" className="grid-5" style={{ marginBottom: 52 }}>
      {stats.map((s, i) => (
        <div key={i} style={{ background: 'var(--bg2)', padding: '22px 18px' }}>
          <div className="label">{s.label}</div>
          <div className="stat-value" style={{ color: s.color }}>{s.value}</div>
          <div style={{ fontSize: 10, color: 'var(--dim)' }}>{s.sub}</div>
        </div>
      ))}
    </div>
  );
}
