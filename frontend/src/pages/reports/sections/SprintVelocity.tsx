export default function SprintVelocity({ data }: { data: any[] }) {
  if (!data || data.length === 0) return null;

  return (
    <section id="velocity" className="section">
      <div className="section-title">Sprint Velocity</div>
      <div className="section-subtitle">Story points per sprint</div>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Sprint</th>
              <th>Team SP</th>
              {data[0] && Object.keys(data[0].developers || {}).map(dev => (
                <th key={dev}>{dev}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.map((sprint, i) => (
              <tr key={i}>
                <td style={{ color: 'var(--white)' }}>{sprint.sprint_name}</td>
                <td style={{ color: 'var(--green)', fontWeight: 500 }}>{sprint.team_sp}</td>
                {Object.entries(sprint.developers || {}).map(([dev, d]: [string, any]) => (
                  <td key={dev}>
                    {d.sp > 0 ? (
                      <span>
                        {d.sp}
                        <span style={{ fontSize: 10, color: d.completion_rate >= 80 ? 'var(--green)' : 'var(--amber)', marginLeft: 4 }}>
                          ({d.completion_rate}%)
                        </span>
                      </span>
                    ) : '—'}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
