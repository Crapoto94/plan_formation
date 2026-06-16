import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { ClipboardList, ClipboardCheck, BarChart3, Settings, LogOut } from 'lucide-react';
import api from '../api/axios';

function isDGADGA(fonction: string | null) {
  if (!fonction) return false;
  const dgKeywords = ['dga', 'directeur.adjoint', 'directeur.general', 'directeur.général', 'dg', 'directeur.adjoint'];
  return dgKeywords.some((k) => fonction.replace(/[\s_-]+/g, '.').includes(k));
}

const links: { path: string; label: string; icon: any; descKey: string | null }[] = [
  { path: '/collecte', label: 'Collecte', icon: ClipboardList, descKey: 'description_collecte' },
  { path: '/traitement', label: 'Traitement', icon: ClipboardCheck, descKey: 'description_traitement' },
  { path: '/recapitulatif', label: 'Récapitulatif', icon: BarChart3, descKey: 'description_recapitulatif' },
  { path: '/param', label: 'Paramétrage', icon: Settings, descKey: null },
];

export default function Navbar() {
  const navigate = useNavigate();
  const location = useLocation();
  const role = localStorage.getItem('role');
  const displayName = localStorage.getItem('displayName') || '';
  const [orgRole, setOrgRole] = useState<string | null>(null);
  const [orgFonction, setOrgFonction] = useState<string | null>(null);
  const [descriptions, setDescriptions] = useState<Record<string, string>>({});
  const [hoveredPath, setHoveredPath] = useState<string | null>(null);

  useEffect(() => {
    api.get('/api/v1/auth/me').then((r) => {
      const o = r.data?.org;
      if (o?.role) { setOrgRole(o.role); localStorage.setItem('org_role', o.role); }
      if (o?.fonction) { setOrgFonction(o.fonction); localStorage.setItem('org_fonction', o.fonction); }
    }).catch(() => {});
    api.get('/api/v1/admin/page-config').then((r) => {
      if (r.data) setDescriptions(r.data);
    }).catch(() => {});
  }, []);

  const effectiveRole = orgRole || localStorage.getItem('org_role') || role;
  const effectiveFonction = orgFonction || localStorage.getItem('org_fonction') || null;

  function canShow(path: string) {
    const isDgDga = isDGADGA(effectiveFonction);
    if (path === '/param') return role === 'admin' || effectiveRole === 'service_formation' || isDgDga;
    if (path === '/traitement') return role === 'admin' || effectiveRole === 'directeur' || effectiveRole === 'service_formation' || effectiveRole === 'responsable_service' || isDgDga;
    if (path === '/recapitulatif') return role === 'admin' || effectiveRole === 'service_formation' || effectiveFonction === 'dg' || isDgDga;
    return true;
  }

  function handleLogout() {
    localStorage.removeItem('token');
    localStorage.removeItem('role');
    localStorage.removeItem('org_role');
    localStorage.removeItem('org_fonction');
    localStorage.removeItem('displayName');
    navigate('/login');
  }

  const visibleLinks = links.filter(l => canShow(l.path));

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
            const desc = l.descKey ? (descriptions[l.descKey] || '') : '';
            const show = hoveredPath === l.path && desc;
            return (
              <div
                key={l.path}
                className="relative"
                onMouseEnter={() => setHoveredPath(l.path)}
                onMouseLeave={() => setHoveredPath(null)}
              >
                <button
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
                {show && (
                  <div className="absolute left-1/2 -translate-x-1/2 top-full mt-2 px-3 py-1.5 bg-gray-900 text-white text-xs rounded shadow-lg whitespace-nowrap z-50">
                    {desc}
                  </div>
                )}
              </div>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
