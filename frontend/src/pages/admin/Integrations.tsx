import { useEffect, useState } from 'react';
import api from '../../api/client';
import { useToast } from '../../components/Toast';

const PROVIDERS = [
  { value: 'gitlab', label: 'GitLab', type: 'git', needsEmail: false },
  { value: 'github', label: 'GitHub', type: 'git', needsEmail: false },
  { value: 'jira', label: 'Jira', type: 'pm', needsEmail: true },
  { value: 'clickup', label: 'ClickUp', type: 'pm', needsEmail: false },
];

export default function Integrations() {
  const { toast } = useToast();
  const [integrations, setIntegrations] = useState<any[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ provider: 'gitlab', base_url: '', token: '', email: '', group_id: '', project_key: '' });
  const [loading, setLoading] = useState(false);
  const [testing, setTesting] = useState<string | null>(null);

  const load = () => api.get('/integrations').then(r => setIntegrations(r.data));
  useEffect(() => { load(); }, []);

  const selectedProvider = PROVIDERS.find(p => p.value === form.provider);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await api.post('/integrations', {
        provider: form.provider,
        type: selectedProvider?.type,
        base_url: form.base_url,
        token: form.token,
        email: form.email || undefined,
        group_id: form.group_id || undefined,
        project_key: form.project_key || undefined,
      });
      setShowForm(false);
      setForm({ provider: 'gitlab', base_url: '', token: '', email: '', group_id: '', project_key: '' });
      load();
    } finally {
      setLoading(false);
    }
  };

  const handleTest = async (id: string) => {
    setTesting(id);
    try {
      const { data } = await api.post(`/integrations/${id}/test`);
      toast(data.success ? 'Connection successful!' : 'Connection failed', data.success ? 'success' : 'error');
      load();
    } finally {
      setTesting(null);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Remove this integration?')) return;
    await api.delete(`/integrations/${id}`);
    load();
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <div className="section-title">Integrations</div>
          <div className="section-subtitle">Connect your Git and PM tools</div>
        </div>
        <button className="btn-primary" onClick={() => setShowForm(!showForm)}>
          {showForm ? 'Cancel' : 'Add Integration'}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleAdd} className="card" style={{ marginBottom: 24 }}>
          <div className="grid-2" style={{ gap: 14, marginBottom: 14 }}>
            <div>
              <div className="label">Provider</div>
              <select value={form.provider} onChange={e => setForm({ ...form, provider: e.target.value })}>
                {PROVIDERS.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
              </select>
            </div>
            <div>
              <div className="label">Base URL</div>
              <input placeholder="https://gitlab.example.com" value={form.base_url}
                onChange={e => setForm({ ...form, base_url: e.target.value })} required />
            </div>
            <div>
              <div className="label">Token / API Key</div>
              <input type="password" placeholder="Your API token" value={form.token}
                onChange={e => setForm({ ...form, token: e.target.value })} required />
            </div>
            {selectedProvider?.needsEmail && (
              <div>
                <div className="label">Email (for Basic Auth)</div>
                <input type="email" placeholder="user@company.com" value={form.email}
                  onChange={e => setForm({ ...form, email: e.target.value })} />
              </div>
            )}
            {selectedProvider?.type === 'git' && (
              <div>
                <div className="label">Group / Org ID (optional)</div>
                <input placeholder="group-id or org-name" value={form.group_id}
                  onChange={e => setForm({ ...form, group_id: e.target.value })} />
              </div>
            )}
            {selectedProvider?.type === 'pm' && (
              <div>
                <div className="label">Project Key (optional)</div>
                <input placeholder="DEV" value={form.project_key}
                  onChange={e => setForm({ ...form, project_key: e.target.value })} />
              </div>
            )}
          </div>
          <button className="btn-primary" type="submit" disabled={loading}>
            {loading ? 'Adding...' : 'Add'}
          </button>
        </form>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {integrations.map((i: any) => (
          <div key={i.id} className="card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
                <span style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 16, color: 'var(--white)', letterSpacing: '0.06em' }}>
                  {i.provider.toUpperCase()}
                </span>
                <span className={`badge badge-${i.status === 'connected' ? 'green' : 'red'}`}>{i.status}</span>
                <span className="badge badge-amber">{i.type}</span>
              </div>
              <div style={{ fontSize: 11, color: 'var(--dim)' }}>
                {i.config.base_url}
                {i.last_sync_at && ` · Last sync: ${new Date(i.last_sync_at).toLocaleString()}`}
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="btn-secondary" style={{ padding: '6px 14px', fontSize: 11 }}
                onClick={() => handleTest(i.id)} disabled={testing === i.id}>
                {testing === i.id ? 'Testing...' : 'Test'}
              </button>
              <button className="btn-danger" style={{ padding: '6px 14px', fontSize: 11 }}
                onClick={() => handleDelete(i.id)}>
                Remove
              </button>
            </div>
          </div>
        ))}
        {integrations.length === 0 && (
          <div className="card" style={{ textAlign: 'center', color: 'var(--dim)', padding: 40 }}>
            No integrations yet. Click "Add Integration" to connect your tools.
          </div>
        )}
      </div>
    </div>
  );
}
