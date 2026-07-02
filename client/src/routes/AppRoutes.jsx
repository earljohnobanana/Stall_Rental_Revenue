import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import MainLayout from '../layouts/MainLayout';
import Login from '../pages/Login';
import Dashboard from '../pages/Dashboard';
import Buildings from '../pages/Buildings';
import Stalls from '../pages/Stalls';
import StallOwners from '../pages/StallOwners';
import Payments from '../pages/Payments';
import Reports from '../pages/Reports';
import NightMarket from '../pages/NightMarket';
import StaffManagement from '../pages/StaffManagement';
import Settings from '../pages/Settings';
import Loader from '../components/Loader';

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <Loader message="Authenticating..." />;
  if (!user) return <Navigate to="/login" replace />;
  return children;
}

function AdminRoute({ children }) {
  const { user, isAdmin, loading } = useAuth();
  if (loading) return <Loader />;
  if (!user) return <Navigate to="/login" replace />;
  if (!isAdmin()) return <Navigate to="/dashboard" replace />;
  return children;
}

export default function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/" element={<ProtectedRoute><MainLayout /></ProtectedRoute>}>
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="dashboard"    element={<Dashboard />} />
        <Route path="buildings"    element={<Buildings />} />
        <Route path="stalls"       element={<Stalls />} />
        <Route path="owners"       element={<StallOwners />} />
        <Route path="payments"     element={<Payments />} />
        <Route path="night-market" element={<NightMarket />} />
        <Route path="reports"      element={<Reports />} />
        <Route path="staff"        element={<AdminRoute><StaffManagement /></AdminRoute>} />
        <Route path="settings"     element={<AdminRoute><Settings /></AdminRoute>} />
      </Route>
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}