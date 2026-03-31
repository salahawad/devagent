import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

export default function Signup() {
  const [companyName, setCompanyName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { signup } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await signup(companyName, email, password);
      navigate('/');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Signup failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
      <div style={{ width: 380 }}>
        <h1 style={{
          fontFamily: "'Bebas Neue', sans-serif", fontSize: 48,
          color: 'var(--white)', letterSpacing: '0.04em', marginBottom: 8,
        }}>
          Dev<span style={{ color: 'var(--amber)' }}>Agent</span>
        </h1>
        <p style={{ color: 'var(--dim)', fontSize: 12, marginBottom: 32 }}>Create your company account</p>

        {error && <div style={{ color: 'var(--red)', fontSize: 12, marginBottom: 16 }}>{error}</div>}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <input placeholder="Company Name" value={companyName} onChange={e => setCompanyName(e.target.value)} required />
          <input type="email" placeholder="Admin Email" value={email} onChange={e => setEmail(e.target.value)} required />
          <input type="password" placeholder="Password" value={password} onChange={e => setPassword(e.target.value)} required minLength={6} />
          <button className="btn-primary" type="submit" disabled={loading}>
            {loading ? 'Creating...' : 'Create Account'}
          </button>
        </form>

        <p style={{ color: 'var(--dim)', fontSize: 12, marginTop: 20, textAlign: 'center' }}>
          Already have an account? <Link to="/login">Sign in</Link>
        </p>
      </div>
    </div>
  );
}
