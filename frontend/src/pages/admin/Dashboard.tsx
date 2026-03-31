import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../../api/client';
import { useAuth } from '../../contexts/AuthContext';

function formatFrequency(minutes: number): { value: string; unit: string } {
  if (minutes < 60) return { value: String(minutes), unit: 'minutes' };
  if (minutes < 1440) return { value: String(Math.round(minutes / 60 * 10) / 10), unit: 'hours' };
  if (minutes < 10080) return { value: String(Math.round(minutes / 1440 * 10) / 10), unit: 'days' };
  if (minutes < 43200) return { value: String(Math.round(minutes / 10080 * 10) / 10), unit: 'weeks' };
  if (minutes < 525600) return { value: String(Math.round(minutes / 43200 * 10) / 10), unit: 'months' };
  return { value: String(Math.round(minutes / 525600 * 10) / 10), unit: 'years' };
}

export default function Dashboard() {
  const { tenant } = useAuth();
  const [integrations, setIntegrations] = useState<any[]>([]);
  const [syncInfo, setSyncInfo] = useState<any>(null);

  useEffect(() => {
    api.get('/integrations').then(r => setIntegrations(r.data));
    api.get('/sync/settings').then(r => setSyncInfo(r.data));
  }, []);

  return (
    <div>
      <div style={{ marginBottom: 40 }}>
        <div style={{ fontSize: 11, letterSpacing: '0.25em', textTransform: 'uppercase', color: 'var(--amber)', marginBottom: 14 }}>
          Admin Dashboard
        </div>
        <h1 style={{
          fontFamily: "'Bebas Neue', sans-serif", fontSize: 56,
          color: 'var(--white)', letterSpacing: '0.04em', lineHeight: 0.9,
        }}>
          {tenant?.name}
        </h1>
      </div>

      <div className="grid-3" style={{ marginBottom: 32 }}>
        <div className="card">
          <div className="label">Integrations</div>
          <div className="stat-value">{integrations.length}</div>
          <div style={{ fontSize: 10, color: 'var(--dim)', marginTop: 4 }}>connected sources</div>
        </div>
        <div className="card">
          <div className="label">Sync Frequency</div>
          {(() => {
            const freq = formatFrequency(syncInfo?.sync_frequency_minutes || 0);
            return (
              <>
                <div className="stat-value">{syncInfo ? freq.value : '—'}</div>
                <div style={{ fontSize: 10, color: 'var(--dim)', marginTop: 4 }}>{freq.unit} between syncs</div>
              </>
            );
          })()}
        </div>
        <div className="card">
          <div className="label">Last Sync</div>
          <div className="stat-value" style={{ fontSize: 20 }}>
            {syncInfo?.last_sync?.completed_at
              ? new Date(syncInfo.last_sync.completed_at).toLocaleString()
              : 'Never'}
          </div>
          <div style={{ fontSize: 10, color: 'var(--dim)', marginTop: 4 }}>
            {syncInfo?.last_sync?.status || 'no sync yet'}
          </div>
        </div>
      </div>

      <div className="grid-2">
        <Link to="/integrations" className="card" style={{ textDecoration: 'none' }}>
          <div className="label">Connect Sources</div>
          <p style={{ color: 'var(--text)', marginTop: 8 }}>Add GitHub, GitLab, Jira, or ClickUp integrations</p>
        </Link>
        <Link to="/report" className="card" style={{ textDecoration: 'none' }}>
          <div className="label">View Report</div>
          <p style={{ color: 'var(--text)', marginTop: 8 }}>Developer efficiency analysis dashboard</p>
        </Link>
      </div>
    </div>
  );
}
