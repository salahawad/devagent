import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './contexts/AuthContext';
import AdminLayout from './layouts/AdminLayout';
import Login from './pages/auth/Login';
import Signup from './pages/auth/Signup';
import Dashboard from './pages/admin/Dashboard';
import Integrations from './pages/admin/Integrations';
import Developers from './pages/admin/Developers';
import SyncSettings from './pages/admin/SyncSettings';
import ReportPage from './pages/reports/ReportPage';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { token } = useAuth();
  return token ? <>{children}</> : <Navigate to="/login" />;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/signup" element={<Signup />} />
      <Route path="/" element={
        <ProtectedRoute>
          <AdminLayout />
        </ProtectedRoute>
      }>
        <Route index element={<Dashboard />} />
        <Route path="integrations" element={<Integrations />} />
        <Route path="developers" element={<Developers />} />
        <Route path="sync" element={<SyncSettings />} />
        <Route path="report" element={<ReportPage />} />
      </Route>
    </Routes>
  );
}
