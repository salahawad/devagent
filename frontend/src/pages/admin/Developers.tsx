import { useEffect, useState, useMemo } from 'react';
import api from '../../api/client';
import { useToast } from '../../components/Toast';

export default function Developers() {
  const { toast } = useToast();
  const [devs, setDevs] = useState<any[]>([]);
  const [allDevs, setAllDevs] = useState<any[]>([]); // flat list for linking
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(false);
  const [search, setSearch] = useState('');
  const [linkMode, setLinkMode] = useState<any>(null); // { primary: dev } when linking

  const load = () => {
    setLoading(true);
    Promise.all([
      api.get('/developers').then(r => setDevs(r.data)),
      api.get('/developers/all').then(r => setAllDevs(r.data)),
    ]).finally(() => setLoading(false));
  };
  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => {
    let list = [...devs].sort((a, b) => {
      if (a.is_tracked === b.is_tracked) return (a.display_name || '').localeCompare(b.display_name || '');
      return a.is_tracked ? -1 : 1;
    });
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(d =>
        d.display_name?.toLowerCase().includes(q) ||
        d.username?.toLowerCase().includes(q) ||
        d.email?.toLowerCase().includes(q) ||
        d.role?.toLowerCase().includes(q) ||
        d.provider?.toLowerCase().includes(q) ||
        d.linked_profiles?.some((lp: any) =>
          lp.display_name?.toLowerCase().includes(q) ||
          lp.username?.toLowerCase().includes(q)
        )
      );
    }
    return list;
  }, [devs, search]);

  const fetchFromSources = async () => {
    setFetching(true);
    try {
      await api.get('/developers/fetch');
      load();
    } finally {
      setFetching(false);
    }
  };

  const toggleTracking = async (id: string, isTracked: boolean) => {
    await api.patch(`/developers/${id}`, { is_tracked: !isTracked });
    load();
  };

  const untrackAll = async () => {
    await Promise.all(
      devs.filter(d => d.is_tracked).map(d => api.patch(`/developers/${d.id}`, { is_tracked: false }))
    );
    load();
  };

  const trackAll = async () => {
    await Promise.all(
      devs.filter(d => !d.is_tracked).map(d => api.patch(`/developers/${d.id}`, { is_tracked: true }))
    );
    load();
  };

  const updateRole = async (id: string, role: string) => {
    await api.patch(`/developers/${id}`, { role });
  };

  const unlinkDev = async (devId: string) => {
    await api.post(`/developers/${devId}/unlink`);
    toast('Profile unlinked', 'info');
    load();
  };

  const trackedCount = devs.filter(d => d.is_tracked).length;

  // --- Link modal logic ---
  const [selectedForLink, setSelectedForLink] = useState<string[]>([]);
  const [linkSearch, setLinkSearch] = useState('');

  const openLinkModal = (primary: any) => {
    setLinkMode(primary);
    setSelectedForLink([]);
    setLinkSearch('');
  };

  const submitLink = async () => {
    if (!linkMode || selectedForLink.length === 0) return;
    await api.post('/developers/link', {
      primary_id: linkMode.id,
      secondary_ids: selectedForLink,
    });
    toast(`Linked ${selectedForLink.length} profile(s) to ${linkMode.display_name}`, 'success');
    setLinkMode(null);
    setSelectedForLink([]);
    load();
  };

  // Simple bigram similarity for fuzzy name matching
  const bigrams = (s: string) => {
    const b = new Set<string>();
    const lower = s.toLowerCase();
    for (let i = 0; i < lower.length - 1; i++) b.add(lower.slice(i, i + 2));
    return b;
  };
  const similarity = (a: string, b: string): number => {
    if (!a || !b) return 0;
    const ba = bigrams(a), bb = bigrams(b);
    let inter = 0;
    for (const g of ba) if (bb.has(g)) inter++;
    const union = ba.size + bb.size - inter;
    return union === 0 ? 0 : inter / union;
  };

  // Candidates: not already linked, not the primary itself, sorted by name similarity
  const linkCandidates = useMemo(() => {
    if (!linkMode) return [];
    const existingLinkedIds = new Set(
      (linkMode.linked_profiles || []).map((lp: any) => lp.id)
    );
    existingLinkedIds.add(linkMode.id);

    const primaryName = linkMode.display_name || '';
    const primaryEmail = linkMode.email || '';
    const primaryUsername = linkMode.username || '';

    let candidates = allDevs
      .filter(d => !existingLinkedIds.has(d.id) && !d.linked_to)
      .map(d => {
        // Score: best of name/email/username similarity to primary
        const score = Math.max(
          similarity(d.display_name || '', primaryName),
          similarity(d.username || '', primaryUsername),
          similarity(d.email || '', primaryEmail),
          // Bonus: exact email match
          (d.email && primaryEmail && d.email.toLowerCase() === primaryEmail.toLowerCase()) ? 1 : 0,
        );
        return { ...d, _score: score };
      })
      .sort((a, b) => b._score - a._score); // best matches first

    // Apply search filter
    if (linkSearch.trim()) {
      const q = linkSearch.toLowerCase();
      candidates = candidates.filter(d =>
        d.display_name?.toLowerCase().includes(q) ||
        d.username?.toLowerCase().includes(q) ||
        d.email?.toLowerCase().includes(q) ||
        d.provider?.toLowerCase().includes(q)
      );
    }

    return candidates;
  }, [linkMode, allDevs, linkSearch]);

  const providerColor: Record<string, string> = {
    gitlab: 'var(--amber)',
    github: 'var(--white)',
    jira: 'var(--blue)',
    clickup: 'var(--purple)',
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <div className="section-title">Developers</div>
          <div className="section-subtitle">
            {allDevs.length} identities · {devs.length} profiles · {trackedCount} tracked
          </div>
        </div>
        <button className="btn-primary" onClick={fetchFromSources} disabled={fetching}>
          {fetching ? 'Fetching...' : 'Fetch from Sources'}
        </button>
      </div>

      {/* Search + bulk actions */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 16, alignItems: 'center' }}>
        <input
          placeholder="Search by name, username, email, role..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{ flex: 1, maxWidth: 400 }}
        />
        <button className="btn-secondary" style={{ padding: '8px 16px', fontSize: 11, whiteSpace: 'nowrap' }} onClick={trackAll}>
          Track All
        </button>
        <button className="btn-danger" style={{ padding: '8px 16px', fontSize: 11, whiteSpace: 'nowrap' }} onClick={untrackAll}>
          Untrack All
        </button>
      </div>

      {loading ? (
        <div style={{ color: 'var(--dim)', textAlign: 'center', padding: 40 }}>Loading...</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {filtered.map((d: any) => (
            <div key={d.id} style={{
              background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 4,
              overflow: 'hidden', opacity: d.is_tracked ? 1 : 0.5,
            }}>
              {/* Primary row */}
              <div style={{ display: 'flex', alignItems: 'center', padding: '12px 20px', gap: 14 }}>
                {d.avatar_url && (
                  <img src={d.avatar_url} alt="" style={{ width: 32, height: 32, borderRadius: '50%', flexShrink: 0 }} />
                )}
                {!d.avatar_url && (
                  <div style={{
                    width: 32, height: 32, borderRadius: '50%', background: 'var(--bg3)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontFamily: "'Bebas Neue', sans-serif", fontSize: 14, color: 'var(--dim)', flexShrink: 0,
                  }}>
                    {d.display_name?.[0]?.toUpperCase() || '?'}
                  </div>
                )}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}>
                    <span style={{
                      fontFamily: "'Bebas Neue', sans-serif", fontSize: 17,
                      letterSpacing: '0.06em', color: 'var(--white)',
                    }}>
                      {d.display_name}
                    </span>
                    <span style={{
                      fontSize: 9, letterSpacing: '0.06em', padding: '2px 6px',
                      borderRadius: 2, background: `${providerColor[d.provider] || 'var(--dim)'}20`,
                      color: providerColor[d.provider] || 'var(--dim)',
                    }}>
                      {d.provider}
                    </span>
                    <span style={{ fontSize: 11, color: 'var(--dim)' }}>{d.username}</span>
                  </div>
                  {d.email && <div style={{ fontSize: 10, color: 'var(--muted)' }}>{d.email}</div>}
                </div>

                {/* Linked profiles badges */}
                {d.linked_profiles?.length > 0 && (
                  <div style={{ display: 'flex', gap: 4, flexShrink: 0, flexWrap: 'wrap' }}>
                    {d.linked_profiles.map((lp: any) => (
                      <div key={lp.id} style={{
                        display: 'flex', alignItems: 'center', gap: 6,
                        background: 'var(--bg3)', border: '1px solid var(--border)',
                        borderRadius: 3, padding: '4px 6px 4px 8px', fontSize: 10,
                      }}>
                        <span style={{ color: providerColor[lp.provider] || 'var(--dim)' }}>{lp.provider}</span>
                        <span style={{ color: 'var(--dim)' }}>{lp.display_name || lp.username}</span>
                        <button
                          onClick={(e) => { e.stopPropagation(); unlinkDev(lp.id); }}
                          style={{
                            background: 'var(--red-d)', border: '1px solid rgba(224,80,80,.3)',
                            color: 'var(--red)', cursor: 'pointer',
                            padding: '1px 5px', fontSize: 10, lineHeight: 1,
                            borderRadius: 2, marginLeft: 2,
                          }}
                          title={`Unlink ${lp.display_name || lp.username}`}
                        >
                          unlink
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                <input
                  style={{ width: 130, padding: '4px 8px', fontSize: 11, flexShrink: 0 }}
                  defaultValue={d.role || ''}
                  placeholder="e.g. Backend"
                  onBlur={e => updateRole(d.id, e.target.value)}
                />

                <button
                  className="btn-secondary"
                  style={{ padding: '5px 10px', fontSize: 10, flexShrink: 0 }}
                  onClick={() => openLinkModal(d)}
                  title="Link another identity to this profile"
                >
                  Link
                </button>

                <button
                  className={d.is_tracked ? 'btn-success' : 'btn-secondary'}
                  style={{ padding: '5px 12px', fontSize: 10, flexShrink: 0 }}
                  onClick={() => toggleTracking(d.id, d.is_tracked)}
                >
                  {d.is_tracked ? 'Tracked' : 'Untracked'}
                </button>
              </div>
            </div>
          ))}

          {filtered.length === 0 && devs.length > 0 && (
            <div className="card" style={{ textAlign: 'center', color: 'var(--dim)', padding: 30 }}>
              No developers match "{search}"
            </div>
          )}
          {devs.length === 0 && (
            <div className="card" style={{ textAlign: 'center', color: 'var(--dim)', padding: 40 }}>
              No developers found. Add integrations first, then click "Fetch from Sources".
            </div>
          )}
        </div>
      )}

      {/* Link Modal */}
      {linkMode && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 1000,
          background: 'rgba(0,0,0,.6)', backdropFilter: 'blur(4px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}
          onClick={() => setLinkMode(null)}
        >
          <div style={{
            background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 6,
            width: 520, maxHeight: '80vh', display: 'flex', flexDirection: 'column',
          }}
            onClick={e => e.stopPropagation()}
          >
            <div style={{ padding: '18px 22px', borderBottom: '1px solid var(--border)' }}>
              <div style={{
                fontFamily: "'Bebas Neue', sans-serif", fontSize: 20,
                letterSpacing: '0.06em', color: 'var(--white)', marginBottom: 4,
              }}>
                Link Identities to {linkMode.display_name}
              </div>
              <div style={{ fontSize: 11, color: 'var(--dim)' }}>
                Select profiles from other sources that belong to the same person.
                Best matches are shown first.
              </div>
            </div>

            {/* Search within link modal */}
            <div style={{ padding: '10px 22px 0' }}>
              <input
                placeholder="Search profiles..."
                value={linkSearch}
                onChange={e => setLinkSearch(e.target.value)}
                autoFocus
              />
            </div>

            <div style={{ padding: '8px 22px', overflowY: 'auto', flex: 1 }}>
              {linkCandidates.length === 0 ? (
                <div style={{ color: 'var(--dim)', textAlign: 'center', padding: 20 }}>
                  {linkSearch ? `No profiles match "${linkSearch}"` : 'No unlinked profiles available.'}
                </div>
              ) : (
                linkCandidates.map((c: any) => {
                  const selected = selectedForLink.includes(c.id);
                  const matchPct = Math.round(c._score * 100);
                  const matchColor = matchPct >= 60 ? 'var(--green)' : matchPct >= 30 ? 'var(--amber)' : 'var(--muted)';
                  return (
                    <label key={c.id} style={{
                      display: 'flex', alignItems: 'center', gap: 12, padding: '8px 0',
                      borderBottom: '1px solid var(--border)', cursor: 'pointer',
                      opacity: selected ? 1 : 0.65,
                      background: selected ? 'rgba(240,160,48,.04)' : 'transparent',
                      borderRadius: 3, paddingLeft: 4, paddingRight: 4,
                    }}>
                      <input
                        type="checkbox"
                        checked={selected}
                        onChange={() => {
                          setSelectedForLink(prev =>
                            selected ? prev.filter(id => id !== c.id) : [...prev, c.id]
                          );
                        }}
                        style={{ width: 16, height: 16, accentColor: 'var(--amber)', flexShrink: 0 }}
                      />
                      {c.avatar_url ? (
                        <img src={c.avatar_url} alt="" style={{ width: 24, height: 24, borderRadius: '50%', flexShrink: 0 }} />
                      ) : (
                        <div style={{
                          width: 24, height: 24, borderRadius: '50%', background: 'var(--bg3)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: 11, color: 'var(--dim)', flexShrink: 0,
                        }}>
                          {c.display_name?.[0]?.toUpperCase() || '?'}
                        </div>
                      )}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ color: 'var(--white)', fontSize: 12 }}>{c.display_name}</div>
                        <div style={{ fontSize: 10, color: 'var(--dim)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {c.username}{c.email ? ` · ${c.email}` : ''}
                        </div>
                      </div>
                      {matchPct > 0 && (
                        <span style={{
                          fontSize: 9, padding: '2px 5px', borderRadius: 2,
                          color: matchColor, background: `${matchColor}18`,
                          flexShrink: 0,
                        }}>
                          {matchPct}%
                        </span>
                      )}
                      <span style={{
                        fontSize: 9, letterSpacing: '0.06em', padding: '2px 6px', borderRadius: 2,
                        background: `${providerColor[c.provider] || 'var(--dim)'}20`,
                        color: providerColor[c.provider] || 'var(--dim)',
                        flexShrink: 0,
                      }}>
                        {c.provider}
                      </span>
                    </label>
                  );
                })
              )}
            </div>

            <div style={{ padding: '14px 22px', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
              <button className="btn-secondary" style={{ padding: '8px 18px', fontSize: 11 }}
                onClick={() => setLinkMode(null)}>
                Cancel
              </button>
              <button className="btn-primary" style={{ padding: '8px 18px', fontSize: 11 }}
                onClick={submitLink} disabled={selectedForLink.length === 0}>
                Link {selectedForLink.length} Profile{selectedForLink.length !== 1 ? 's' : ''}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
