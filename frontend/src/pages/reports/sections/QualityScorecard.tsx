export default function QualityScorecard({ data }: { data: any[] }) {
  if (!data || data.length === 0) return null;

  const badge = (value: number, thresholds: [number, number]) => {
    if (value >= thresholds[1]) return 'badge-red';
    if (value >= thresholds[0]) return 'badge-amber';
    return 'badge-green';
  };

  return (
    <section id="quality" className="section">
      <div className="section-title">Quality Scorecard</div>
      <div className="section-subtitle">Signal-by-signal comparison</div>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Signal</th>
              {data.map((d, i) => <th key={i}>{d.developer}</th>)}
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Commits / week</td>
              {data.map((d, i) => <td key={i}>{d.commits_per_week}</td>)}
            </tr>
            <tr>
              <td>Bug-fix ratio</td>
              {data.map((d, i) => (
                <td key={i}><span className={`badge ${badge(d.bug_fix_ratio, [15, 25])}`}>{d.bug_fix_ratio}%</span></td>
              ))}
            </tr>
            <tr>
              <td>Code churn</td>
              {data.map((d, i) => (
                <td key={i}><span className={`badge ${badge(d.code_churn, [25, 50])}`}>{d.code_churn}%</span></td>
              ))}
            </tr>
            <tr>
              <td>Reverts</td>
              {data.map((d, i) => (
                <td key={i}><span className={`badge ${badge(d.reverts, [1, 3])}`}>{d.reverts}</span></td>
              ))}
            </tr>
            <tr>
              <td>Merge noise</td>
              {data.map((d, i) => (
                <td key={i}><span className={`badge ${badge(d.merge_noise, [20, 40])}`}>{d.merge_noise}%</span></td>
              ))}
            </tr>
            <tr>
              <td>Completion rate</td>
              {data.map((d, i) => <td key={i} style={{ color: d.completion_rate >= 80 ? 'var(--green)' : 'var(--amber)' }}>{d.completion_rate}%</td>)}
            </tr>
            <tr>
              <td>CI pass rate</td>
              {data.map((d, i) => <td key={i} style={{ color: d.ci_pass_rate >= 90 ? 'var(--green)' : d.ci_pass_rate ? 'var(--amber)' : 'var(--muted)' }}>
                {d.ci_pass_rate ? `${d.ci_pass_rate}%` : 'No CI'}
              </td>)}
            </tr>
            <tr>
              <td>Traceability</td>
              {data.map((d, i) => (
                <td key={i}><span className={`badge ${d.traceability >= 50 ? 'badge-green' : d.traceability >= 20 ? 'badge-amber' : 'badge-red'}`}>{d.traceability}%</span></td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>
    </section>
  );
}
