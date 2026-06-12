import { useNavigate, useLocation } from 'react-router-dom';
import { ClipboardList, ClipboardCheck, Settings, LogOut } from 'lucide-react';

const links = [
  { path: '/collecte', label: 'Collecte', icon: ClipboardList },
  { path: '/traitement', label: 'Traitement', icon: ClipboardCheck },
  { path: '/param', label: 'Paramétrage', icon: Settings },
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
    <header className="bg-ivry-navy shadow-lg">
      <div className="max-w-7xl mx-auto px-6">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center gap-4">
            <img
              src="https://ivryetmoi.ivry94.fr/Theme/Img/logo.svg"
              alt="Ivry-sur-Seine"
              className="h-9 brightness-0 invert"
              onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
            />
            <div className="border-l border-white/25 pl-4">
              <p className="text-white font-bold text-sm leading-tight tracking-wide uppercase">
                Plan de formation 2027–2029
              </p>
              <p className="text-white/50 text-xs">Ville d'Ivry-sur-Seine</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-white/70 text-sm">{displayName}</span>
            <button
              onClick={handleLogout}
              title="Déconnexion"
              className="text-white/40 hover:text-ivry-red transition-colors p-1"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>

        <nav className="flex">
          {visibleLinks.map((l) => {
            const active = location.pathname === l.path;
            return (
              <button
                key={l.path}
                onClick={() => navigate(l.path)}
                className={`flex items-center gap-2 px-5 py-3 text-sm font-medium border-b-2 transition-colors
                  ${active
                    ? 'border-ivry-red text-white'
                    : 'border-transparent text-white/50 hover:text-white/80 hover:border-white/20'
                  }`}
              >
                <l.icon className="w-4 h-4" />
                {l.label}
              </button>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
