import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export default function AdminLayout() {
  const { tenant, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const navItems = [
    { to: '/', label: 'Dashboard', end: true },
    { to: '/integrations', label: 'Integrations' },
    { to: '/developers', label: 'Developers' },
    { to: '/sync', label: 'Sync' },
    { to: '/report', label: 'Report' },
  ];

  return (
    <div>
      <nav style={{
        position: 'sticky', top: 0, zIndex: 200,
        background: 'rgba(10,11,14,0.94)', backdropFilter: 'blur(14px)',
        borderBottom: '1px solid var(--border)',
        padding: '0 32px',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
            <span style={{
              fontFamily: "'Bebas Neue', sans-serif",
              fontSize: 20, letterSpacing: '0.08em',
              color: 'var(--amber)', padding: '12px 0',
            }}>
              DevAgent
            </span>
            <div style={{ display: 'flex', overflow: 'auto' }}>
              {navItems.map(item => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.end}
                  style={({ isActive }) => ({
                    fontSize: 10, letterSpacing: '0.14em', textTransform: 'uppercase' as const,
                    color: isActive ? 'var(--amber)' : 'var(--muted)',
                    padding: '13px 15px', whiteSpace: 'nowrap' as const,
                    borderBottom: `2px solid ${isActive ? 'var(--amber)' : 'transparent'}`,
                    textDecoration: 'none', display: 'block',
                    transition: 'color 0.2s, border-color 0.2s',
                  })}
                >
                  {item.label}
                </NavLink>
              ))}
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <span style={{ fontSize: 11, color: 'var(--dim)' }}>{tenant?.name}</span>
            <button className="btn-secondary" style={{ padding: '6px 14px', fontSize: 11 }} onClick={handleLogout}>
              Logout
            </button>
          </div>
        </div>
      </nav>

      <div className="page" style={{ paddingTop: 32 }}>
        <Outlet />
      </div>
    </div>
  );
}
