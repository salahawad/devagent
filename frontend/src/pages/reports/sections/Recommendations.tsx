export default function Recommendations({ data }: { data: any[] }) {
  if (!data || data.length === 0) return null;

  return (
    <section id="recommendations" className="section">
      <div className="section-title">Recommendations</div>
      <div className="section-subtitle">Per-developer improvement suggestions</div>
      <div className="grid-2" style={{ gap: 10 }}>
        {data.map((r, i) => (
          <div key={i} className="card">
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
              <span style={{ fontFamily: "'Bebas Neue'", fontSize: 17, letterSpacing: '0.06em', color: 'var(--white)' }}>
                {r.developer}
              </span>
            </div>
            <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 6 }}>
              {r.items.map((item: string, j: number) => (
                <li key={j} style={{ display: 'flex', gap: 7, alignItems: 'flex-start', fontSize: 12, lineHeight: 1.5 }}>
                  <span style={{ color: 'var(--amber)', flexShrink: 0 }}>&rsaquo;</span>
                  {item}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </section>
  );
}
