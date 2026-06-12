import { useEffect, useState } from 'react';
import { CheckCircle, XCircle, Filter, MessageSquare, AlertTriangle, Loader } from 'lucide-react';
import api from '../api/axios';
import type { Soumission } from '../types';

function badge(s: string) {
  const c = s === 'en_attente' ? 'bg-yellow-100 text-yellow-800'
    : s === 'valide' ? 'bg-green-100 text-green-800'
    : 'bg-red-100 text-red-800';
  return <span className={`text-xs px-2 py-0.5 rounded ${c}`}>{s === 'en_attente' ? 'En attente' : s === 'valide' ? 'Validé' : 'Refusé'}</span>;
}

export default function Traitement() {
  const [soumissions, setSoumissions] = useState<Soumission[]>([]);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [comments, setComments] = useState<Record<number, string>>({});
  const [refuseMotif, setRefuseMotif] = useState('');
  const [showRefuseDialog, setShowRefuseDialog] = useState(false);
  const [org, setOrg] = useState<{ role: string; direction: string | null; service: string | null }>({ role: '', direction: null, service: null });
  const [loading, setLoading] = useState(true);

  const isAdmin = org.role === 'admin';
  const isDirector = org.role === 'directeur';
  const isServiceFormation = org.role === 'service_formation';
  const canValidate = isAdmin || isDirector || isServiceFormation;
  const canView = isAdmin || isDirector || isServiceFormation || org.role === 'responsable_service';
  const isRestricted = !loading && !canView;

  useEffect(() => {
    (async () => {
      try {
        const { data } = await api.get('/api/v1/auth/me');
        const o = data.org || { role: 'agent', direction: null, service: null };
        setOrg(o);
        const { data: reqs } = await api.get('/api/v1/traitement/soumissions');
        setSoumissions(reqs || []);
      } catch {
        setOrg({ role: 'agent', direction: null, service: null });
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  function toggle(id: number) {
    setSelected((p) => { const n = new Set(p); n.has(id) ? n.delete(id) : n.add(id); return n; });
  }

  function toggleAll(ids: number[]) {
    ids.every((id) => selected.has(id))
      ? setSelected(new Set([...selected].filter((id) => !ids.includes(id))))
      : setSelected(new Set([...selected, ...ids]));
  }

  async function handleValider() {
    if (!selected.size) return;
    const ids = [...selected];
    try {
      await api.post('/api/v1/traitement/valider', { ids, commentaire: comments[ids[0]] || '' });
      setSoumissions((p) => p.map((s) => selected.has(s.id) ? { ...s, statut: 'valide' as const } : s));
      setSelected(new Set());
    } catch { alert('Erreur lors de la validation'); }
  }

  function handleRefuser() { if (selected.size) setShowRefuseDialog(true); }

  async function confirmRefuser() {
    if (!refuseMotif.trim()) return;
    const ids = [...selected];
    try {
      await api.post('/api/v1/traitement/refuser', { ids, motif: refuseMotif });
      setSoumissions((p) => p.map((s) => selected.has(s.id) ? { ...s, statut: 'refuse' as const, motif_refus: refuseMotif } : s));
      setSelected(new Set());
      setShowRefuseDialog(false);
      setRefuseMotif('');
    } catch { alert('Erreur lors du refus'); }
  }

  const grouped = soumissions.reduce<Record<string, Soumission[]>>((acc, s) => {
    const k = s.service || 'Autre';
    (acc[k] = acc[k] || []).push(s);
    return acc;
  }, {});

  const sortedGroups = Object.entries(grouped).sort(([a], [b]) => a.localeCompare(b));

  if (loading) return (
    <div className="flex items-center justify-center min-h-screen"><Loader className="w-6 h-6 animate-spin text-ivry-navy" /></div>
  );

  if (isRestricted) return (
    <div className="max-w-lg mx-auto mt-20 p-6 text-center">
      <AlertTriangle className="w-12 h-12 text-yellow-500 mx-auto mb-4" />
      <h2 className="text-xl font-bold mb-2">Accès restreint</h2>
      <p className="text-gray-500">Seuls les directeurs et responsables de service peuvent accéder à cette page.</p>
    </div>
  );

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Demandes de formation</h1>
          {org.direction && <p className="text-sm text-gray-500">{org.direction} — {org.role}</p>}
        </div>
        <span className="text-sm text-gray-400">{soumissions.length} demande(s)</span>
      </div>

      {canValidate && selected.size > 0 && (
        <div className="bg-ivry-navy/5 border border-ivry-navy/20 rounded p-3 mb-4 flex items-center gap-3">
          <span className="text-sm font-medium">{selected.size} sélectionnée(s)</span>
          <button onClick={handleValider} className="flex items-center gap-1 bg-green-600 text-white px-3 py-1.5 rounded text-sm hover:bg-green-700">
            <CheckCircle className="w-4 h-4" /> Valider
          </button>
          <button onClick={handleRefuser} className="flex items-center gap-1 bg-red-600 text-white px-3 py-1.5 rounded text-sm hover:bg-red-700">
            <XCircle className="w-4 h-4" /> Refuser
          </button>
        </div>
      )}

      {sortedGroups.map(([serviceName, reqs]) => (
        <div key={serviceName} className="mb-8">
          <div className="flex items-center gap-3 mb-3">
            <h2 className="text-lg font-bold text-ivry-navy border-l-4 border-ivry-red pl-3">{serviceName}</h2>
            <span className="text-xs text-gray-400">({reqs.length})</span>
            {canValidate && (
              <button onClick={() => toggleAll(reqs.map((r) => r.id))} className="text-xs text-ivry-navy hover:underline ml-auto">
                {reqs.every((r) => selected.has(r.id)) ? 'Tout désélectionner' : 'Tout sélectionner'}
              </button>
            )}
          </div>

          <div className="overflow-x-auto rounded border shadow-sm">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {canValidate && <th className="px-3 py-3 w-8"><Filter className="w-3 h-3" /></th>}
                  <th className="px-3 py-3">Agent</th>
                  <th className="px-3 py-3">Date</th>
                  <th className="px-3 py-3">Formation</th>
                  <th className="px-3 py-3">Axe</th>
                  <th className="px-3 py-3">Agents</th>
                  <th className="px-3 py-3">Statut</th>
                  {canValidate && <th className="px-3 py-3">Commentaire</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {reqs.map((s) => (
                  <tr key={s.id} className={`hover:bg-gray-50 ${s.statut !== 'en_attente' ? 'text-gray-400' : ''}`}>
                    {canValidate && (
                      <td className="px-3 py-2">
                        {s.statut === 'en_attente' && (
                          <input type="checkbox" checked={selected.has(s.id)} onChange={() => toggle(s.id)} className="accent-[#29345C]" />
                        )}
                      </td>
                    )}
                    <td className="px-3 py-2 font-medium">{s.agent_name}</td>
                    <td className="px-3 py-2 whitespace-nowrap">{new Date(s.created_at).toLocaleDateString('fr-FR')}</td>
                    <td className="px-3 py-2">
                      {s.details?.map((d, i) => (
                        <div key={d.id || i}>{d.type === 'autre' ? d.intitule || 'Formation autre' : d.formation_libelle}</div>
                      ))}
                    </td>
                    <td className="px-3 py-2">
                      {s.details?.map((d, i) => (
                        <div key={d.id || i} className="text-gray-500">{d.axe_libelle || '—'}</div>
                      ))}
                    </td>
                    <td className="px-3 py-2">
                      {s.details?.map((d, i) => <div key={d.id || i}>{d.nb_agents}</div>)}
                    </td>
                    <td className="px-3 py-2">
                      {badge(s.statut)}
                      {s.motif_refus && <p className="text-xs text-red-500 mt-1 max-w-40">{s.motif_refus}</p>}
                    </td>
                    {canValidate && (
                      <td className="px-3 py-2">
                        <div className="flex items-center gap-1">
                          <MessageSquare className="w-3 h-3 text-gray-300 shrink-0" />
                          <input
                            type="text"
                            placeholder="..."
                            value={comments[s.id] ?? s.commentaire ?? ''}
                            onChange={(e) => setComments({ ...comments, [s.id]: e.target.value })}
                            className="w-24 border-b border-gray-200 text-xs py-0.5 focus:outline-none focus:border-ivry-navy bg-transparent"
                          />
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ))}

      {!soumissions.length && (
        <p className="text-center text-gray-400 py-16">Aucune demande pour votre direction/service.</p>
      )}

      {showRefuseDialog && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded shadow-xl p-6 w-full max-w-md">
            <h3 className="font-bold text-lg mb-2">Motif du refus</h3>
            <p className="text-sm text-gray-500 mb-4">{selected.size} demande(s) sélectionnée(s)</p>
            <textarea value={refuseMotif} onChange={(e) => setRefuseMotif(e.target.value)}
              placeholder="Expliquez le motif du refus..." className="w-full border rounded px-3 py-2 text-sm min-h-[100px]" required />
            <div className="flex justify-end gap-2 mt-4">
              <button onClick={() => { setShowRefuseDialog(false); setRefuseMotif(''); }} className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded">Annuler</button>
              <button onClick={confirmRefuser} disabled={!refuseMotif.trim()} className="px-4 py-2 text-sm bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50">Confirmer le refus</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
