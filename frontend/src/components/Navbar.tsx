import { useNavigate, useLocation } from 'react-router-dom';
import { ClipboardList, ClipboardCheck, Settings, LogOut } from 'lucide-react';

const links = [
  { path: '/collecte', label: 'Collecte', icon: ClipboardList },
  { path: '/traitement', label: 'Traitement', icon: ClipboardCheck },
  { path: '/param', label: 'Param', icon: Settings },
];

export default function Navbar() {
  const navigate = useNavigate();
  const location = useLocation();
  const role = localStorage.getItem('role');
  const displayName = localStorage.getItem('displayName') || '';

  function handleLogout() {
    localStorage.removeItem('token');
    localStorage.removeItem('role');
    localStorage.removeItem('displayName');
    navigate('/login');
  }

  const visibleLinks = links.filter(l => l.path !== '/param' || role === 'admin');

  return (
    <nav className="bg-white border-b shadow-sm">
      <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
        <div className="flex items-center gap-1">
          {visibleLinks.map((l) => {
            const active = location.pathname === l.path;
            return (
              <button
                key={l.path}
                onClick={() => navigate(l.path)}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition
                  ${active ? 'bg-blue-100 text-blue-700' : 'text-gray-600 hover:bg-gray-100'}`}
              >
                <l.icon className="w-4 h-4" />
                {l.label}
              </button>
            );
          })}
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm text-gray-500">{displayName}</span>
          <button onClick={handleLogout} className="text-gray-400 hover:text-red-600">
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </nav>
  );
}
