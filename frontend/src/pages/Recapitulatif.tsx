import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { BarChart3, ChevronDown, ChevronRight, Euro, Shield, LayoutList, Building2 } from 'lucide-react';
import api from '../api/axios';

interface Detail {
  id: number;
  formation_libelle?: string;
  axe_libelle?: string;
  axe_description?: string;
  nb_agents: number;
  type?: string;
  intitule?: string;
  date_souhaitee?: string;
  organisme?: string;
  organisme_nom?: string;
  estimation_budget?: string;
  statut?: string;
  motif_refus?: string;
}

interface Soumission {
  id: number;
  agent_name: string;
  agent_email: string | null;
  service: string;
  direction: string;
  statut: string;
  created_at: string;
  details: Detail[];
}

function badge(s: string) {
  const m: Record<string, string> = {
    en_attente: 'bg-yellow-100 text-yellow-700',
    valide: 'bg-green-100 text-green-700',
    refuse: 'bg-red-100 text-red-700',
  };
  return <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${m[s] || 'bg-gray-100 text-gray-500'}`}>{s === 'en_attente' ? 'En attente' : s === 'valide' ? 'Validée' : s === 'refuse' ? 'Refusée' : s}</span>;
}

function formatBudget(val: string | undefined): string {
  if (!val) return '—';
  const num = parseFloat(val.replace(/[^0-9,.-]/g, '').replace(',', '.'));
  return isNaN(num) ? val : num.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 });
}

function formatDate(raw: string | undefined): string {
  if (!raw) return '—';
  let s = raw;
  try { const p = JSON.parse(raw); if (Array.isArray(p)) s = p.join(', '); } catch {}
  return s;
}

export default function Recapitulatif() {
  const navigate = useNavigate();
  const [data, setData] = useState<Soumission[]>([]);
  const [orgRole, setOrgRole] = useState('');
  const [orgFonction, setOrgFonction] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [viewMode, setViewMode] = useState<'direction' | 'obligatoire'>('direction');

  useEffect(() => {
    (async () => {
      try {
        const { data: me } = await api.get('/api/v1/auth/me');
        const role = me.org?.role || '';
        const fonction = me.org?.fonction || '';
        setOrgRole(role);
        setOrgFonction(fonction);
        localStorage.setItem('org_role', role);
        if (fonction) localStorage.setItem('org_fonction', fonction);
        if (role !== 'admin' && role !== 'service_formation' && fonction !== 'dg') {
          setError('Accès réservé aux administrateurs, DGA et service formation.');
          setLoading(false);
          return;
        }
        const { data: rows } = await api.get('/api/v1/traitement/recapitulatif');
        setData(rows || []);
      } catch {
        setError('Erreur lors du chargement du récapitulatif.');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const grouped = useMemo(() => {
    const map = new Map<string, Soumission[]>();
    for (const s of data) {
      const d = s.direction || 'Sans direction';
      if (!map.has(d)) map.set(d, []);
      map.get(d)!.push(s);
    }
    const arr = [...map.entries()].map(([dir, rows]) => {
      type Row = Detail & { service: string; agent_name: string };
      const details: Row[] = rows.flatMap((s) =>
        (s.details?.length ? s.details : [{ id: 0, nb_agents: 0, statut: s.statut } as Detail]).map((d) => ({
          ...d,
          service: s.service,
          agent_name: s.agent_name,
        }))
      );
      const totalBudget = details.reduce((sum, d) => {
        const n = parseFloat(String(d.estimation_budget || '0').replace(/[^0-9,.-]/g, '').replace(',', '.'));
        return sum + (isNaN(n) ? 0 : n);
      }, 0);
      return { direction: dir, rows, details, totalBudget };
    });
    arr.sort((a, b) => a.direction.localeCompare(b.direction));
    return arr;
  }, [data]);

  const obligatoireData = useMemo(() => {
    const map = new Map<string, { libelle: string; totalAgents: number; submissions: { agent_name: string; service: string; direction: string; nb_agents: number; statut: string }[] }>();
    for (const s of data) {
      for (const d of (s.details || [])) {
        if (d.type !== 'reglementaire' || !d.formation_libelle) continue;
        const key = d.formation_libelle;
        if (!map.has(key)) map.set(key, { libelle: key, totalAgents: 0, submissions: [] });
        const entry = map.get(key)!;
        entry.totalAgents += d.nb_agents || 0;
        entry.submissions.push({ agent_name: s.agent_name, service: s.service, direction: s.direction, nb_agents: d.nb_agents || 0, statut: d.statut || '' });
      }
    }
    return [...map.values()].sort((a, b) => a.libelle.localeCompare(b.libelle));
  }, [data]);

  function toggle(dir: string) {
    setExpanded((p) => ({ ...p, [dir]: !p[dir] }));
  }

  if (loading) {
    return <div className="w-full px-4 py-4 text-gray-500 text-sm">Chargement...</div>;
  }

  if (error) {
    return (
      <div className="w-full px-4 py-4">
        <div className="flex items-center gap-2 mb-6">
          <BarChart3 className="w-6 h-6 text-green-600" />
          <h1 className="text-2xl font-bold">Récapitulatif</h1>
        </div>
        <p className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">{error}</p>
      </div>
    );
  }

  return (
    <div className="w-full px-4 py-4">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <BarChart3 className="w-6 h-6 text-green-600" />
          <h1 className="text-2xl font-bold">Récapitulatif global</h1>
        </div>
        <span className="text-xs text-gray-400">{data.length} demande(s)</span>
      </div>

      <div className="flex items-center gap-2 mb-6">
        <button
          onClick={() => setViewMode('direction')}
          className={`flex items-center gap-1.5 px-4 py-2 rounded text-sm font-medium transition ${viewMode === 'direction' ? 'bg-ivry-navy text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
        >
          <Building2 className="w-4 h-4" /> Par direction
        </button>
        <button
          onClick={() => setViewMode('obligatoire')}
          className={`flex items-center gap-1.5 px-4 py-2 rounded text-sm font-medium transition ${viewMode === 'obligatoire' ? 'bg-ivry-navy text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
        >
          <Shield className="w-4 h-4" /> Formations obligatoires
        </button>
      </div>

      {viewMode === 'obligatoire' ? (
        <div>
          <div className="flex items-center gap-2 mb-4">
            <Shield className="w-5 h-5 text-ivry-navy" />
            <h2 className="text-lg font-bold">Formations obligatoires — Récapitulatif par formation</h2>
            <span className="text-xs text-gray-400">({obligatoireData.length} formation{(obligatoireData.length > 1 ? 's' : '')})</span>
          </div>
          {obligatoireData.length === 0 ? (
            <p className="bg-gray-100 text-gray-500 px-4 py-3 rounded text-sm">Aucune formation obligatoire demandée.</p>
          ) : (
            <div className="overflow-x-auto rounded border shadow-sm mb-6">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    <th className="px-3 py-3">Formation obligatoire</th>
                    <th className="px-3 py-3 text-right">Nombre d'agents</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {obligatoireData.map((f) => (
                    <tr key={f.libelle} className="hover:bg-gray-50">
                      <td className="px-3 py-2 flex items-center gap-2">
                        <Shield className="w-4 h-4 text-ivry-navy shrink-0" />
                        <span>{f.libelle}</span>
                      </td>
                      <td className="px-3 py-2 text-right font-semibold">{f.totalAgents}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      ) : (
        <>
          {grouped.map((g) => {
          const isOpen = expanded[g.direction] !== false;
          return (
            <div key={g.direction} className="mb-6">
              <button
                onClick={() => toggle(g.direction)}
                className="flex items-center gap-2 w-full text-left mb-2"
              >
                {isOpen ? <ChevronDown className="w-4 h-4 text-gray-400" /> : <ChevronRight className="w-4 h-4 text-gray-400" />}
                <h2 className="text-lg font-bold text-ivry-navy border-l-4 border-ivry-red pl-3">{g.direction}</h2>
                <span className="text-xs text-gray-400">({g.details.length} ligne{(g.details.length > 1 ? 's' : '')})</span>
                <span className="ml-auto flex items-center gap-1 text-xs font-medium text-ivry-red">
                  <Euro className="w-3 h-3" /> {g.totalBudget.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 })}
                </span>
              </button>

              {isOpen && (
                <div className="overflow-x-auto rounded border shadow-sm">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        <th className="px-3 py-3">Date</th>
                        <th className="px-3 py-3">Demandeur</th>
                        <th className="px-3 py-3">Service</th>
                        <th className="px-3 py-3">Formation</th>
                        <th className="px-3 py-3">Axe</th>
                        <th className="px-3 py-3">Agents</th>
                        <th className="px-3 py-3">Date souhaitée</th>
                        <th className="px-3 py-3">Prix</th>
                        <th className="px-3 py-3">Statut</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {g.rows.map((s) => {
                        const details = s.details?.length ? s.details : [{ id: 0, nb_agents: 0, formation_libelle: '', statut: s.statut } as Detail];
                        return details.map((d) => (
                          <tr key={`${s.id}-${d.id}`} className="hover:bg-gray-50">
                            <td className="px-3 py-2 whitespace-nowrap">{new Date(s.created_at).toLocaleDateString('fr-FR')}</td>
                            <td className="px-3 py-2 whitespace-nowrap">{s.agent_name}</td>
                            <td className="px-3 py-2 whitespace-nowrap">{s.service}</td>
                            <td className="px-3 py-2">
                              {d.type === 'autre' ? (d.intitule || 'Formation autre') : <><Shield className="w-3.5 h-3.5 text-ivry-navy inline-block mr-1" />{d.formation_libelle || '—'}</>}
                            </td>
                            <td className="px-3 py-2 text-gray-500 text-xs">
                              {d.axe_libelle
                                ? d.axe_description
                                  ? `${d.axe_libelle} — ${d.axe_description}`
                                  : d.axe_libelle
                                : '—'}
                            </td>
                            <td className="px-3 py-2">{d.nb_agents}</td>
                            <td className="px-3 py-2 whitespace-nowrap">{formatDate(d.date_souhaitee)}</td>
                            <td className="px-3 py-2 whitespace-nowrap">{formatBudget(d.estimation_budget)}</td>
                            <td className="px-3 py-2">
                              {badge(d.statut || '')}
                              {d.motif_refus && <p className="text-xs text-red-500 mt-1 max-w-40">{d.motif_refus}</p>}
                            </td>
                          </tr>
                        ));
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          );
        })}

          {!grouped.length && !loading && (
            <p className="bg-gray-100 text-gray-500 px-4 py-3 rounded text-sm">Aucune demande soumise pour le moment.</p>
          )}

          <div className="mt-8 pt-4 border-t text-xs text-gray-400">
            <strong>Total général : </strong>
            {grouped.reduce((sum, g) => sum + g.totalBudget, 0).toLocaleString('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 })}
          </div>
        </>
      )}
    </div>
  );
}
