import { useEffect, useState, useMemo } from 'react';
import {
  CheckCircle, XCircle, MessageSquare, AlertTriangle, Loader,
  ChevronUp, ChevronDown, Search
} from 'lucide-react';
import api from '../api/axios';
import type { Soumission, SoumissionDetail } from '../types';

function badge(s: string) {
  const c = s === 'en_attente' ? 'bg-yellow-100 text-yellow-800'
    : s === 'valide' ? 'bg-green-100 text-green-800'
    : 'bg-red-100 text-red-800';
  return <span className={`text-xs px-2 py-0.5 rounded ${c}`}>{s === 'en_attente' ? 'En attente' : s === 'valide' ? 'Validé' : 'Refusé'}</span>;
}

interface DetailRow {
  key: string;
  detailId: number;
  soumissionId: number;
  agent_name: string;
  created_at: string;
  service: string;
  statut: 'en_attente' | 'valide' | 'refuse';
  motif_refus: string | null;
  commentaire: string | null;
  formation_libelle: string;
  domaine_libelle: string | null;
  axe_libelle: string | null;
  axe_description: string | null;
  nb_agents: number;
}

type SortKey = 'agent_name' | 'created_at' | 'service' | 'statut';
type SortDir = 'asc' | 'desc';

export default function Traitement() {
  const [soumissions, setSoumissions] = useState<Soumission[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [comments, setComments] = useState<Record<number, string>>({});
  const [refuseMotif, setRefuseMotif] = useState('');
  const [showRefuseDialog, setShowRefuseDialog] = useState(false);
  const [pendingRefuseKeys, setPendingRefuseKeys] = useState<Set<string> | null>(null);
  const [org, setOrg] = useState<{ role: string; direction: string | null; service: string | null }>({ role: '', direction: null, service: null });
  const [loading, setLoading] = useState(true);

  const [sortKey, setSortKey] = useState<SortKey>('service');
  const [sortDir, setSortDir] = useState<SortDir>('asc');
  const [filterService, setFilterService] = useState('');
  const [filterStatut, setFilterStatut] = useState('');
  const [filterSearch, setFilterSearch] = useState('');

  const isAdmin = org.role === 'admin';
  const isDirector = org.role === 'directeur';
  const isServiceFormation = org.role === 'service_formation';
  const canValidate = isAdmin || isDirector || isServiceFormation;
  const canView = isAdmin || isDirector || isServiceFormation || org.role === 'responsable_service';
  const isRestricted = !loading && !canView;

  function getDetailIds(keys: Set<string>): number[] {
    return [...keys].map((k) => Number(k.split('-')[1]));
  }

  useEffect(() => {
    (async () => {
      try {
        const { data } = await api.get('/api/v1/auth/me');
        const o = data.org || { role: 'agent', direction: null, service: null };
        setOrg(o);
        localStorage.setItem('org_role', o.role);
        if (o.fonction) localStorage.setItem('org_fonction', o.fonction);
        const { data: reqs } = await api.get('/api/v1/traitement/soumissions');
        setSoumissions(reqs || []);
      } catch {
        setOrg({ role: 'agent', direction: null, service: null });
        localStorage.setItem('org_role', 'agent');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  function toggle(key: string) {
    setSelected((p) => { const n = new Set(p); n.has(key) ? n.delete(key) : n.add(key); return n; });
  }

  function toggleAll(keys: string[]) {
    keys.every((k) => selected.has(k))
      ? setSelected(new Set([...selected].filter((k) => !keys.includes(k))))
      : setSelected(new Set([...selected, ...keys]));
  }

  function updateDetailStatut(detailIds: number[], statut: 'valide' | 'refuse', motif?: string) {
    setSoumissions((prev) =>
      prev.map((s) => ({
        ...s,
        statut: statut as 'valide' | 'refuse',
        details: s.details?.map((d) =>
          d.id && detailIds.includes(d.id)
            ? { ...d, statut, motif_refus: motif ?? d.motif_refus }
            : d
        ),
      }))
    );
  }

  async function handleValider() {
    if (!selected.size) return;
    const detailIds = getDetailIds(selected);
    try {
      await api.post('/api/v1/traitement/valider', { detail_ids: detailIds, commentaire: comments[detailIds[0]] || '' });
      updateDetailStatut(detailIds, 'valide');
      setSelected(new Set());
    } catch { alert('Erreur lors de la validation'); }
  }

  function handleRefuser() { if (selected.size) { setPendingRefuseKeys(null); setShowRefuseDialog(true); } }

  async function confirmRefuser() {
    if (!refuseMotif.trim()) return;
    const keys = pendingRefuseKeys ?? selected;
    const detailIds = getDetailIds(keys);
    try {
      await api.post('/api/v1/traitement/refuser', { detail_ids: detailIds, motif: refuseMotif });
      updateDetailStatut(detailIds, 'refuse', refuseMotif);
      setSelected(new Set());
      setShowRefuseDialog(false);
      setRefuseMotif('');
      setPendingRefuseKeys(null);
    } catch { alert('Erreur lors du refus'); }
  }

  function handleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir((d) => d === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
  }

  function sortIcon(key: SortKey) {
    if (sortKey !== key) return null;
    return sortDir === 'asc'
      ? <ChevronUp className="w-3 h-3 inline-block ml-0.5" />
      : <ChevronDown className="w-3 h-3 inline-block ml-0.5" />;
  }

  async function validerLigne(row: DetailRow) {
    try {
      await api.post('/api/v1/traitement/valider', { detail_ids: [row.detailId], commentaire: comments[row.soumissionId] || '' });
      updateDetailStatut([row.detailId], 'valide');
    } catch { alert('Erreur lors de la validation'); }
  }

  function refuserLigne(row: DetailRow) {
    setPendingRefuseKeys(new Set([row.key]));
    setShowRefuseDialog(true);
  }

  const allRows = useMemo(() => {
    return soumissions.flatMap((s) => {
      const details: SoumissionDetail[] = s.details?.length ? s.details : [];
      if (!details.length) {
        return [{
          key: `${s.id}-0`,
          detailId: 0,
          soumissionId: s.id,
          agent_name: s.agent_name,
          created_at: s.created_at,
          service: s.service,
          statut: s.statut as 'en_attente' | 'valide' | 'refuse',
          motif_refus: s.motif_refus,
          commentaire: s.commentaire,
          formation_libelle: '',
          domaine_libelle: null,
          axe_libelle: null,
          axe_description: null,
          nb_agents: 0,
        }];
      }
      return details.map((d) => ({
        key: `${s.id}-${d.id}`,
        detailId: d.id!,
        soumissionId: s.id,
        agent_name: s.agent_name,
        created_at: s.created_at,
        service: s.service,
        statut: (d.statut as 'en_attente' | 'valide' | 'refuse') ?? s.statut,
        motif_refus: d.motif_refus ?? s.motif_refus,
        commentaire: s.commentaire,
          formation_libelle: d.type === 'autre' ? (d.intitule || 'Formation autre') : (d.formation_libelle || ''),
          domaine_libelle: d.domaine_libelle || null,
          axe_libelle: d.axe_libelle || null,
          axe_description: d.axe_description || null,
          nb_agents: d.nb_agents,
        }));
    });
  }, [soumissions]);

  const services = useMemo(() => {
    const set = new Set(soumissions.map((s) => s.service || 'Autre'));
    return [...set].sort((a, b) => a.localeCompare(b));
  }, [soumissions]);

  const displayRows = useMemo(() => {
    let list = [...allRows];
    if (filterService) list = list.filter((r) => (r.service || 'Autre') === filterService);
    if (filterStatut) list = list.filter((r) => r.statut === filterStatut);
    if (filterSearch) {
      const q = filterSearch.toLowerCase();
      list = list.filter((r) => r.agent_name.toLowerCase().includes(q));
    }
    list.sort((a, b) => {
      const aVal = String(a[sortKey] ?? '');
      const bVal = String(b[sortKey] ?? '');
      const cmp = aVal.localeCompare(bVal);
      return sortDir === 'asc' ? cmp : -cmp;
    });
    return list;
  }, [allRows, filterService, filterStatut, filterSearch, sortKey, sortDir]);

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
    <div className="max-w-6xl mx-auto p-4">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-2xl font-bold">Demandes de formation</h1>
          {org.direction && <p className="text-sm text-gray-500">{org.direction} — {org.role}</p>}
        </div>
        <span className="text-sm text-gray-400">{displayRows.length} / {allRows.length} demande(s)</span>
      </div>

      <div className="flex flex-wrap items-center gap-2 mb-3 p-2 bg-gray-50 rounded border">
        <span className="text-xs font-medium text-gray-500">Filtres</span>
        <select value={filterService} onChange={(e) => setFilterService(e.target.value)}
          className="text-sm border rounded px-2 py-1 bg-white">
          <option value="">Tous les services</option>
          {services.map((svc) => <option key={svc} value={svc}>{svc}</option>)}
        </select>
        <select value={filterStatut} onChange={(e) => setFilterStatut(e.target.value)}
          className="text-sm border rounded px-2 py-1 bg-white">
          <option value="">Tous les statuts</option>
          <option value="en_attente">En attente</option>
          <option value="valide">Validé</option>
          <option value="refuse">Refusé</option>
        </select>
        <div className="flex items-center gap-1">
          <Search className="w-3 h-3 text-gray-400" />
          <input type="text" placeholder="Rechercher..."
            value={filterSearch} onChange={(e) => setFilterSearch(e.target.value)}
            className="text-sm border rounded px-2 py-1 bg-white w-36" />
        </div>
      </div>

      {canValidate && selected.size > 0 && (
        <div className="bg-ivry-navy/5 border border-ivry-navy/20 rounded p-2 mb-3 flex items-center gap-2">
          <span className="text-sm font-medium">{selected.size} sélectionnée(s)</span>
          <button onClick={handleValider} className="flex items-center gap-1 bg-green-600 text-white px-3 py-1.5 rounded text-sm hover:bg-green-700">
            <CheckCircle className="w-4 h-4" /> Valider
          </button>
          <button onClick={handleRefuser} className="flex items-center gap-1 bg-red-600 text-white px-3 py-1.5 rounded text-sm hover:bg-red-700">
            <XCircle className="w-4 h-4" /> Refuser
          </button>
        </div>
      )}

      <div className="overflow-x-auto rounded border shadow-sm">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              {canValidate && (
                <th className="px-2 py-2 w-8">
                  <input type="checkbox"
                    checked={displayRows.length > 0 && displayRows.every((r) => selected.has(r.key))}
                    onChange={() => toggleAll(displayRows.map((r) => r.key))}
                    className="accent-[#29345C]" />
                </th>
              )}
              <th className="px-2 py-2 cursor-pointer select-none hover:text-ivry-navy" onClick={() => handleSort('agent_name')}>
                Demandeur {sortIcon('agent_name')}
              </th>
              <th className="px-2 py-2 cursor-pointer select-none hover:text-ivry-navy" onClick={() => handleSort('created_at')}>
                Date {sortIcon('created_at')}
              </th>
              <th className="px-2 py-2">Formation</th>
              <th className="px-2 py-2">Domaine</th>
              <th className="px-2 py-2">Axe</th>
              <th className="px-2 py-2">Agents</th>
              <th className="px-2 py-2 cursor-pointer select-none hover:text-ivry-navy" onClick={() => handleSort('service')}>
                Service {sortIcon('service')}
              </th>
              <th className="px-2 py-2 cursor-pointer select-none hover:text-ivry-navy" onClick={() => handleSort('statut')}>
                Statut {sortIcon('statut')}
              </th>
              {canValidate && <th className="px-2 py-2">Actions</th>}
              {canValidate && <th className="px-2 py-2">Commentaire</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {displayRows.map((r) => (
              <tr key={r.key} className={`hover:bg-gray-50 ${r.statut !== 'en_attente' ? 'text-gray-400' : ''}`}>
                {canValidate && (
                  <td className="px-2 py-1.5">
                    {r.statut === 'en_attente' && (
                      <input type="checkbox" checked={selected.has(r.key)} onChange={() => toggle(r.key)} className="accent-[#29345C]" />
                    )}
                  </td>
                )}
                <td className="px-2 py-1.5 font-medium">{r.agent_name}</td>
                <td className="px-2 py-1.5 whitespace-nowrap">{new Date(r.created_at).toLocaleDateString('fr-FR')}</td>
                <td className="px-2 py-1.5">{r.formation_libelle || '—'}</td>
                <td className="px-2 py-1.5">{r.domaine_libelle || '—'}</td>
                <td className="px-2 py-1.5 text-gray-500">
                  {r.axe_libelle
                    ? r.axe_description
                      ? `${r.axe_libelle} — ${r.axe_description}`
                      : r.axe_libelle
                    : '—'}
                </td>
                <td className="px-2 py-1.5">{r.nb_agents}</td>
                <td className="px-2 py-1.5">{r.service || '—'}</td>
                <td className="px-2 py-1.5">
                  {badge(r.statut)}
                  {r.motif_refus && <p className="text-xs text-red-500 mt-1 max-w-40">{r.motif_refus}</p>}
                </td>
                {canValidate && (
                  <td className="px-2 py-1.5">
                    {r.statut === 'en_attente' && (
                      <div className="flex items-center gap-1">
                        <button onClick={() => validerLigne(r)}
                          className="flex items-center gap-0.5 bg-green-600 text-white px-2 py-1 rounded text-xs hover:bg-green-700">
                          <CheckCircle className="w-3 h-3" /> Valider
                        </button>
                        <button onClick={() => refuserLigne(r)}
                          className="flex items-center gap-0.5 bg-red-600 text-white px-2 py-1 rounded text-xs hover:bg-red-700">
                          <XCircle className="w-3 h-3" /> Refuser
                        </button>
                      </div>
                    )}
                  </td>
                )}
                {canValidate && (
                  <td className="px-2 py-1.5">
                    <div className="flex items-center gap-1">
                      <MessageSquare className="w-3 h-3 text-gray-300 shrink-0" />
                      <input
                        type="text"
                        placeholder="..."
                        value={comments[r.soumissionId] ?? r.commentaire ?? ''}
                        onChange={(e) => setComments({ ...comments, [r.soumissionId]: e.target.value })}
                        className="w-16 border-b border-gray-200 text-xs py-0.5 focus:outline-none focus:border-ivry-navy bg-transparent"
                      />
                    </div>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {!displayRows.length && (
        <p className="text-center text-gray-400 py-16">Aucune demande pour votre direction/service.</p>
      )}

      {showRefuseDialog && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded shadow-xl p-6 w-full max-w-md">
            <h3 className="font-bold text-lg mb-2">Motif du refus</h3>
            <p className="text-sm text-gray-500 mb-4">{getDetailIds(pendingRefuseKeys ?? selected).length} demande(s) sélectionnée(s)</p>
            <textarea value={refuseMotif} onChange={(e) => setRefuseMotif(e.target.value)}
              placeholder="Expliquez le motif du refus..." className="w-full border rounded px-3 py-2 text-sm min-h-[100px]" required />
            <div className="flex justify-end gap-2 mt-4">
              <button onClick={() => { setShowRefuseDialog(false); setRefuseMotif(''); setPendingRefuseKeys(null); }} className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded">Annuler</button>
              <button onClick={confirmRefuser} disabled={!refuseMotif.trim()} className="px-4 py-2 text-sm bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50">Confirmer le refus</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
