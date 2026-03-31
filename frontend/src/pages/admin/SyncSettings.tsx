import { useEffect, useState, useRef, useCallback } from 'react';
import api from '../../api/client';

const FREQUENCIES = [
  { value: 60, label: 'Every hour' },
  { value: 180, label: 'Every 3 hours' },
  { value: 360, label: 'Every 6 hours' },
  { value: 720, label: 'Every 12 hours' },
  { value: 1440, label: 'Every 24 hours' },
];

export default function SyncSettings() {
  const [settings, setSettings] = useState<any>(null);
  const [jobs, setJobs] = useState<any[]>([]);
  const [syncing, setSyncing] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const load = useCallback(() => {
    api.get('/sync/settings').then(r => setSettings(r.data));
    api.get('/sync/jobs').then(r => setJobs(r.data));
  }, []);

  useEffect(() => { load(); }, [load]);

  // Poll while any job is running
  const hasRunning = jobs.some(j => j.status === 'running' || j.status === 'pending');

  useEffect(() => {
    if (hasRunning) {
      pollRef.current = setInterval(load, 2000);
    } else if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [hasRunning, load]);

  const updateFrequency = async (minutes: number) => {
    await api.patch('/sync/settings', { sync_frequency_minutes: minutes });
    load();
  };

  const triggerSync = async () => {
    setSyncing(true);
    try {
      await api.post('/sync/trigger');
      setTimeout(load, 500);
    } finally {
      setSyncing(false);
    }
  };

  // Find active running job for the progress card
  const activeJob = jobs.find(j => j.status === 'running' || j.status === 'pending');

  return (
    <div>
      <div className="section-title">Sync Settings</div>
      <div className="section-subtitle">Configure data synchronization frequency</div>

      <div className="grid-2" style={{ marginBottom: 32 }}>
        <div className="card">
          <div className="label">Sync Frequency</div>
          <select
            value={settings?.sync_frequency_minutes || 360}
            onChange={e => updateFrequency(Number(e.target.value))}
            style={{ marginTop: 8 }}
          >
            {FREQUENCIES.map(f => (
              <option key={f.value} value={f.value}>{f.label}</option>
            ))}
          </select>
        </div>
        <div className="card">
          <div className="label">Manual Sync</div>
          <p style={{ fontSize: 11, color: 'var(--dim)', margin: '8px 0' }}>
            Trigger an immediate data sync from all connected sources
          </p>
          <button className="btn-primary" onClick={triggerSync} disabled={syncing || !!activeJob}>
            {activeJob ? 'Sync in Progress...' : syncing ? 'Triggering...' : 'Sync Now'}
          </button>
        </div>
      </div>

      {/* Live progress card */}
      {activeJob && (
        <div style={{
          background: 'var(--bg2)', border: '1px solid var(--amber)', borderRadius: 4,
          padding: '20px 24px', marginBottom: 32,
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{
                width: 8, height: 8, borderRadius: '50%', background: 'var(--amber)',
                boxShadow: '0 0 8px var(--amber)',
                animation: 'pulse 1.5s infinite',
              }} />
              <span style={{
                fontFamily: "'Bebas Neue', sans-serif", fontSize: 18,
                letterSpacing: '0.08em', color: 'var(--white)',
              }}>
                Sync in Progress
              </span>
            </div>
            <span style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 24, color: 'var(--amber)' }}>
              {activeJob.progress || 0}%
            </span>
          </div>

          {/* Progress bar */}
          <div style={{
            height: 6, background: 'var(--border)', borderRadius: 3,
            overflow: 'hidden', marginBottom: 12,
          }}>
            <div style={{
              height: '100%', borderRadius: 3,
              width: `${activeJob.progress || 0}%`,
              background: 'var(--amber)',
              transition: 'width 0.5s ease',
            }} />
          </div>

          {/* Status details */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ fontSize: 12, color: 'var(--text)' }}>
              {activeJob.progress_message || 'Starting...'}
            </div>
            <div style={{ display: 'flex', gap: 16, fontSize: 11, color: 'var(--dim)' }}>
              <span>Step {activeJob.current_step || 0} / {activeJob.total_steps || '?'}</span>
              <span>{activeJob.records_synced?.toLocaleString() || 0} records</span>
              {activeJob.started_at && (
                <span>{Math.round((Date.now() - new Date(activeJob.started_at).getTime()) / 1000)}s elapsed</span>
              )}
            </div>
          </div>
        </div>
      )}

      <style>{`@keyframes pulse { 0%,100% { opacity:1 } 50% { opacity:.3 } }`}</style>

      <div className="section-title" style={{ fontSize: 20 }}>Sync History</div>
      <div className="section-subtitle">Recent sync jobs</div>
      <div className="table-wrap">
        <table>
          <thead>
            <tr><th>Status</th><th>Progress</th><th>Started</th><th>Completed</th><th>Records</th><th>Details</th></tr>
          </thead>
          <tbody>
            {jobs.map((j: any) => (
              <tr key={j.id}>
                <td>
                  <span className={`badge badge-${j.status === 'completed' ? 'green' : j.status === 'completed_with_errors' ? 'amber' : j.status === 'failed' ? 'red' : 'amber'}`}>
                    {j.status === 'completed_with_errors' ? 'partial' : j.status}
                  </span>
                </td>
                <td style={{ width: 140 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{ flex: 1, height: 4, background: 'var(--border)', borderRadius: 2, overflow: 'hidden' }}>
                      <div style={{
                        height: '100%', borderRadius: 2, transition: 'width 0.5s',
                        width: `${j.progress || (j.status === 'completed' ? 100 : 0)}%`,
                        background: j.status === 'completed' ? 'var(--green)'
                          : j.status === 'failed' ? 'var(--red)'
                          : 'var(--amber)',
                      }} />
                    </div>
                    <span style={{ fontSize: 10, color: 'var(--dim)', width: 30, textAlign: 'right' }}>
                      {j.progress || (j.status === 'completed' ? 100 : 0)}%
                    </span>
                  </div>
                </td>
                <td>{j.started_at ? new Date(j.started_at).toLocaleString() : '—'}</td>
                <td>{j.completed_at ? new Date(j.completed_at).toLocaleString() : '—'}</td>
                <td>{j.records_synced?.toLocaleString()}</td>
                <td style={{
                  fontSize: 11, maxWidth: 250, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                  color: j.status === 'failed' ? 'var(--red)' : 'var(--dim)',
                }}>
                  {j.error || j.progress_message || '—'}
                </td>
              </tr>
            ))}
            {jobs.length === 0 && (
              <tr><td colSpan={6} style={{ textAlign: 'center', color: 'var(--dim)', padding: 30 }}>No sync jobs yet</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
