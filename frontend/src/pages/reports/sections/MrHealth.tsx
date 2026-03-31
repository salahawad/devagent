export default function MrHealth({ data }: { data: any }) {
  if (!data) return null;

  const formatTime = (minutes: number) => {
    if (!minutes) return '—';
    if (minutes < 60) return `${minutes}m`;
    if (minutes < 1440) return `${(minutes / 60).toFixed(1)}h`;
    return `${(minutes / 1440).toFixed(1)}d`;
  };

  return (
    <section id="mr-health" className="section">
      <div className="section-title">Merge Request Health</div>
      <div className="section-subtitle">MR turnaround and review metrics</div>
      <div className="grid-4" style={{ gap: 1, background: 'var(--border)', border: '1px solid var(--border)', borderRadius: 4, overflow: 'hidden' }}>
        <div style={{ background: 'var(--bg2)', padding: 20 }}>
          <div style={{ fontSize: 10, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'var(--dim)', marginBottom: 12 }}>
            Total MRs
          </div>
          <div style={{ fontFamily: "'Bebas Neue'", fontSize: 30, color: 'var(--white)', lineHeight: 1 }}>
            {data.total}
          </div>
          <div style={{ fontSize: 11, color: 'var(--dim)', marginTop: 4 }}>{data.merged} merged</div>
        </div>
        <div style={{ background: 'var(--bg2)', padding: 20 }}>
          <div style={{ fontSize: 10, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'var(--dim)', marginBottom: 12 }}>
            Open
          </div>
          <div style={{ fontFamily: "'Bebas Neue'", fontSize: 30, color: 'var(--amber)', lineHeight: 1 }}>
            {data.open}
          </div>
        </div>
        <div style={{ background: 'var(--bg2)', padding: 20 }}>
          <div style={{ fontSize: 10, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'var(--dim)', marginBottom: 12 }}>
            Avg Turnaround
          </div>
          <div style={{ fontFamily: "'Bebas Neue'", fontSize: 30, color: 'var(--white)', lineHeight: 1 }}>
            {formatTime(data.avg_turnaround_minutes)}
          </div>
          <div style={{ fontSize: 10, color: 'var(--dim)', marginTop: 4 }}>open to merge</div>
        </div>
        <div style={{ background: 'var(--bg2)', padding: 20 }}>
          <div style={{ fontSize: 10, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'var(--dim)', marginBottom: 12 }}>
            Range
          </div>
          <div style={{ fontSize: 11, marginTop: 6 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
              <span style={{ color: 'var(--dim)' }}>Min</span><span>{formatTime(data.min_turnaround_minutes)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--dim)' }}>Max</span><span>{formatTime(data.max_turnaround_minutes)}</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
