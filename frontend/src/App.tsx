import { Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import Collecte from './pages/Collecte';
import AdminFormations from './pages/AdminFormations';
import AdminAxes from './pages/AdminAxes';
import Traitement from './pages/Traitement';
import Parametrage from './pages/Parametrage';
import Navbar from './components/Navbar';

function ProtectedRoute({ children, adminOnly }: { children: React.ReactNode; adminOnly?: boolean }) {
  const token = localStorage.getItem('token');
  const role = localStorage.getItem('role');
  if (!token) return <Navigate to="/login" replace />;
  if (adminOnly && role !== 'admin') return <Navigate to="/collecte" replace />;
  return <>{children}</>;
}

export default function App() {
  const token = localStorage.getItem('token');

  return (
    <div className="min-h-screen bg-gray-50">
      {token && <Navbar />}
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/collecte" element={<ProtectedRoute><Collecte /></ProtectedRoute>} />
        <Route path="/admin/formations" element={<ProtectedRoute adminOnly><AdminFormations /></ProtectedRoute>} />
        <Route path="/admin/axes" element={<ProtectedRoute adminOnly><AdminAxes /></ProtectedRoute>} />
        <Route path="/traitement" element={<ProtectedRoute><Traitement /></ProtectedRoute>} />
        <Route path="/param" element={<ProtectedRoute adminOnly><Parametrage /></ProtectedRoute>} />
        <Route path="/" element={<Navigate to="/collecte" replace />} />
      </Routes>
    </div>
  );
}
