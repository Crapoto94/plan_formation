import { useEffect, useState, useMemo } from 'react';
import {
  CheckCircle, XCircle, MessageSquare, AlertTriangle, Loader,
  ChevronUp, ChevronDown, Search, Trash2, Pencil, X
} from 'lucide-react';
import api from '../api/axios';
import type { Soumission, SoumissionDetail, Formation, Axe, Domaine } from '../types';

const EDIT_YEARS = [2027, 2028, 2029];

function parseDateSouhaitee(raw: string | null | undefined): number[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) return parsed;
  } catch { /* not JSON */ }
  return [];
}

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
  motivation: string | null;
  type: 'reglementaire' | 'autre' | null;
  formation_id: number | null;
  domaine_id: number | null;
  axe_id: number | null;
  intitule: string | null;
  objectif: string | null;
  date_souhaitee: string | null;
  organisme: string | null;
  organisme_nom: string | null;
  justification: string | null;
  estimation_budget: string | null;
}

interface EditForm {
  type: 'reglementaire' | 'autre';
  formation_id: number;
  domaine_id: number;
  axe_id: number;
  motivation: string;
  nb_agents: number;
  intitule: string;
  objectif: string;
  date_souhaitee: number[];
  organisme: string;
  organisme_nom: string;
  justification: string;
  estimation_budget: string;
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

  const [formations, setFormations] = useState<Formation[]>([]);
  const [axesRef, setAxesRef] = useState<Axe[]>([]);
  const [domainesRef, setDomainesRef] = useState<Domaine[]>([]);
  const [editingRow, setEditingRow] = useState<DetailRow | null>(null);
  const [editForm, setEditForm] = useState<EditForm | null>(null);
  const [savingEdit, setSavingEdit] = useState(false);

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
    api.get('/api/v1/admin/formations').then(({ data }) => setFormations(data.filter((f: Formation) => f.active))).catch(() => {});
    api.get('/api/v1/admin/axes').then(({ data }) => setAxesRef(data.filter((a: Axe) => a.active))).catch(() => {});
    api.get('/api/v1/admin/domaines').then(({ data }) => setDomainesRef(data.filter((d: Domaine) => d.active))).catch(() => {});
  }, []);

  function axeLabel(a: Axe) {
    return a.description ? `${a.libelle} — ${a.description}` : a.libelle;
  }

  function openEdit(r: DetailRow) {
    if (!r.detailId) return;
    setEditingRow(r);
    setEditForm({
      type: r.type || 'reglementaire',
      formation_id: r.formation_id || 0,
      domaine_id: r.domaine_id || 0,
      axe_id: r.axe_id || 0,
      motivation: r.motivation || '',
      nb_agents: r.nb_agents || 1,
      intitule: r.intitule || '',
      objectif: r.objectif || '',
      date_souhaitee: parseDateSouhaitee(r.date_souhaitee),
      organisme: r.organisme || 'CNFPT',
      organisme_nom: r.organisme_nom || '',
      justification: r.justification || '',
      estimation_budget: r.estimation_budget || '',
    });
  }

  function closeEdit() {
    setEditingRow(null);
    setEditForm(null);
  }

  function updateEditField<K extends keyof EditForm>(field: K, value: EditForm[K]) {
    setEditForm((prev) => (prev ? { ...prev, [field]: value } : prev));
  }

  function toggleEditYear(year: number) {
    setEditForm((prev) => {
      if (!prev) return prev;
      const next = prev.date_souhaitee.includes(year)
        ? prev.date_souhaitee.filter((y) => y !== year)
        : [...prev.date_souhaitee, year];
      return { ...prev, date_souhaitee: next };
    });
  }

  async function saveEdit() {
    if (!editingRow || !editForm) return;
    setSavingEdit(true);
    try {
      const { data } = await api.patch(`/api/v1/traitement/details/${editingRow.detailId}`, editForm);
      setSoumissions((prev) => prev.map((s) => (s.id === data.id ? data : s)));
      closeEdit();
    } catch { alert('Erreur lors de la modification de la demande'); } finally { setSavingEdit(false); }
  }

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

  async function supprimerDemande(soumissionId: number) {
    if (!window.confirm('Supprimer définitivement cette demande (et toutes ses formations) ?')) return;
    try {
      await api.delete(`/api/v1/traitement/soumissions/${soumissionId}`);
      setSoumissions((prev) => prev.filter((s) => s.id !== soumissionId));
      setSelected((prev) => new Set([...prev].filter((k) => Number(k.split('-')[0]) !== soumissionId)));
    } catch { alert('Erreur lors de la suppression'); }
  }

  async function saveCommentaire(soumissionId: number, value: string) {
    try {
      await api.patch(`/api/v1/traitement/soumissions/${soumissionId}/commentaire`, { commentaire: value });
      setSoumissions((prev) => prev.map((s) => (s.id === soumissionId ? { ...s, commentaire: value } : s)));
    } catch { alert('Erreur lors de la sauvegarde du commentaire'); }
  }

  const allRows = useMemo(() => {
    return soumissions.flatMap((s): DetailRow[] => {
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
          motivation: null,
          type: null,
          formation_id: null,
          domaine_id: null,
          axe_id: null,
          intitule: null,
          objectif: null,
          date_souhaitee: null,
          organisme: null,
          organisme_nom: null,
          justification: null,
          estimation_budget: null,
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
          motivation: d.motivation || null,
          type: (d.type as 'reglementaire' | 'autre') ?? 'reglementaire',
          formation_id: d.formation_id ?? null,
          domaine_id: d.domaine_id ?? null,
          axe_id: d.axe_id ?? null,
          intitule: d.intitule ?? null,
          objectif: d.objectif ?? null,
          date_souhaitee: d.date_souhaitee ?? null,
          organisme: d.organisme ?? null,
          organisme_nom: d.organisme_nom ?? null,
          justification: d.justification ?? null,
          estimation_budget: d.estimation_budget ?? null,
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
    <div className="w-full mx-auto px-2 py-1">
      <div className="flex items-center justify-between mb-2">
        <div>
          <h1 className="text-base font-bold">Demandes</h1>
          {org.direction && <p className="text-xs text-gray-500">{org.direction} — {org.role}</p>}
        </div>
        <span className="text-xs text-gray-400">{displayRows.length} / {allRows.length}</span>
      </div>

      <div className="flex flex-wrap items-center gap-1 mb-2 p-1.5 bg-gray-50 rounded border">
        <span className="text-[10px] font-medium text-gray-500">Filtres</span>
        <select value={filterService} onChange={(e) => setFilterService(e.target.value)}
          className="text-xs border rounded px-1.5 py-0.5 bg-white max-w-32">
          <option value="">Tous services</option>
          {services.map((svc) => <option key={svc} value={svc}>{svc}</option>)}
        </select>
        <select value={filterStatut} onChange={(e) => setFilterStatut(e.target.value)}
          className="text-xs border rounded px-1.5 py-0.5 bg-white max-w-28">
          <option value="">Tous statuts</option>
          <option value="en_attente">En attente</option>
          <option value="valide">Validé</option>
          <option value="refuse">Refusé</option>
        </select>
        <div className="flex items-center gap-0.5">
          <Search className="w-2.5 h-2.5 text-gray-400" />
          <input type="text" placeholder="Agent..."
            value={filterSearch} onChange={(e) => setFilterSearch(e.target.value)}
            className="text-xs border rounded px-1.5 py-0.5 bg-white w-24" />
        </div>
      </div>

      {canValidate && selected.size > 0 && (
        <div className="bg-ivry-navy/5 border border-ivry-navy/20 rounded p-1.5 mb-2 flex items-center gap-1.5 text-xs">
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
                <th className="px-1.5 py-1.5 w-7">
                  <input type="checkbox"
                    checked={displayRows.length > 0 && displayRows.every((r) => selected.has(r.key))}
                    onChange={() => toggleAll(displayRows.map((r) => r.key))}
                    className="accent-[#29345C]" />
                </th>
              )}
              <th className="px-1.5 py-1.5 cursor-pointer select-none hover:text-ivry-navy" onClick={() => handleSort('agent_name')}>
                Demandeur {sortIcon('agent_name')}
              </th>
              <th className="px-1.5 py-1.5 cursor-pointer select-none hover:text-ivry-navy" onClick={() => handleSort('created_at')}>
                Date {sortIcon('created_at')}
              </th>
              <th className="px-1.5 py-1.5">Formation</th>
              <th className="px-1.5 py-1.5">Domaine</th>
              <th className="px-1.5 py-1.5">Axe</th>
              <th className="px-1.5 py-1.5">Motivation</th>
              <th className="px-1.5 py-1.5">Agents</th>
              <th className="px-1.5 py-1.5 cursor-pointer select-none hover:text-ivry-navy" onClick={() => handleSort('service')}>
                Service {sortIcon('service')}
              </th>
              <th className="px-1.5 py-1.5 cursor-pointer select-none hover:text-ivry-navy" onClick={() => handleSort('statut')}>
                Statut {sortIcon('statut')}
              </th>
              {canView && <th className="px-1.5 py-1.5">Actions</th>}
              {canValidate && <th className="px-1.5 py-1.5">Commentaire</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {displayRows.map((r) => (
              <tr key={r.key} className={`hover:bg-gray-50 ${r.statut !== 'en_attente' ? 'text-gray-400' : ''}`}>
                {canValidate && (
                  <td className="px-1.5 py-1">
                    {(r.statut === 'en_attente' || isAdmin) && (
                      <input type="checkbox" checked={selected.has(r.key)} onChange={() => toggle(r.key)} className="accent-[#29345C]" />
                    )}
                  </td>
                )}
                <td className="px-1.5 py-1 font-medium text-xs">{r.agent_name}</td>
                <td className="px-1.5 py-1 whitespace-nowrap text-xs">{new Date(r.created_at).toLocaleDateString('fr-FR')}</td>
                <td className="px-1.5 py-1 text-xs">{r.formation_libelle || '—'}</td>
                <td className="px-1.5 py-1 text-xs">{r.domaine_libelle || '—'}</td>
                <td className="px-1.5 py-1 text-gray-500 text-xs" title={r.axe_description || undefined}>
                  {r.axe_libelle || '—'}
                </td>
                <td className="px-1.5 py-1 text-xs text-gray-500 max-w-[140px] truncate" title={(r.motivation || r.objectif) || undefined}>
                  {(() => {
                    const txt = r.motivation || r.objectif;
                    if (!txt) return '—';
                    return txt.length > 40 ? `${txt.slice(0, 40)}…` : txt;
                  })()}
                </td>
                <td className="px-1.5 py-1 text-xs">{r.nb_agents}</td>
                <td className="px-1.5 py-1 text-xs">{r.service || '—'}</td>
                <td className="px-1.5 py-1">
                  {badge(r.statut)}
                  {r.motif_refus && <p className="text-xs text-red-500 mt-0.5 max-w-32">{r.motif_refus}</p>}
                </td>
                {canView && (
                  <td className="px-1.5 py-1">
                    <div className="flex items-center gap-0.5">
                      {canValidate && (r.statut === 'en_attente' || isAdmin) && (
                        <>
                          <button onClick={() => validerLigne(r)}
                            className="flex items-center gap-0.5 bg-green-600 text-white px-1.5 py-0.5 rounded text-[10px] hover:bg-green-700">
                            <CheckCircle className="w-2.5 h-2.5" /> V
                          </button>
                          <button onClick={() => refuserLigne(r)}
                            className="flex items-center gap-0.5 bg-red-600 text-white px-1.5 py-0.5 rounded text-[10px] hover:bg-red-700">
                            <XCircle className="w-2.5 h-2.5" /> R
                          </button>
                        </>
                      )}
                      {r.detailId > 0 && (
                        <button onClick={() => openEdit(r)} title="Modifier la demande"
                          className="flex items-center gap-0.5 bg-ivry-navy text-white px-1.5 py-0.5 rounded text-[10px] hover:bg-ivry-navy-dark">
                          <Pencil className="w-2.5 h-2.5" />
                        </button>
                      )}
                      {isAdmin && (
                        <button onClick={() => supprimerDemande(r.soumissionId)} title="Supprimer la demande"
                          className="flex items-center gap-0.5 bg-gray-500 text-white px-1.5 py-0.5 rounded text-[10px] hover:bg-gray-600">
                          <Trash2 className="w-2.5 h-2.5" />
                        </button>
                      )}
                    </div>
                  </td>
                )}
                {canValidate && (
                  <td className="px-1.5 py-1">
                    <div className="flex items-center gap-0.5">
                      <MessageSquare className="w-2.5 h-2.5 text-gray-300 shrink-0" />
                      <input
                        type="text"
                        placeholder="..."
                        value={comments[r.soumissionId] ?? r.commentaire ?? ''}
                        onChange={(e) => setComments({ ...comments, [r.soumissionId]: e.target.value })}
                        onBlur={(e) => {
                          if (isAdmin && e.target.value !== (r.commentaire ?? '')) saveCommentaire(r.soumissionId, e.target.value);
                        }}
                        title={isAdmin ? "Annotation de validation — modifiable à tout moment" : undefined}
                        className={`${isAdmin ? 'w-24' : 'w-12'} border-b border-gray-200 text-[10px] py-0.5 focus:outline-none focus:border-ivry-navy bg-transparent`}
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

      {editingRow && editForm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded shadow-xl p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-lg">Modifier la demande</h3>
              <button onClick={closeEdit} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
            </div>

            <div className="space-y-3 text-sm">
              <div className="flex items-center gap-1">
                <button type="button" onClick={() => updateEditField('type', 'reglementaire')}
                  className={`px-3 py-1.5 rounded text-xs font-semibold ${editForm.type === 'reglementaire' ? 'bg-ivry-navy/10 text-ivry-navy' : 'text-gray-500 hover:bg-gray-100'}`}>
                  Réglementaire
                </button>
                <button type="button" onClick={() => updateEditField('type', 'autre')}
                  className={`px-3 py-1.5 rounded text-xs font-semibold ${editForm.type === 'autre' ? 'bg-ivry-red/10 text-ivry-red' : 'text-gray-500 hover:bg-gray-100'}`}>
                  Autre formation
                </button>
              </div>

              {editForm.type === 'reglementaire' ? (
                <>
                  <div>
                    <label className="form-label">Formation réglementaire</label>
                    <select value={editForm.formation_id} onChange={(e) => updateEditField('formation_id', Number(e.target.value))} className="form-input">
                      <option value={0}>Sélectionner...</option>
                      {formations.map((f) => <option key={f.id} value={f.id}>{f.libelle}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="form-label">Motivation</label>
                    <textarea value={editForm.motivation} onChange={(e) => updateEditField('motivation', e.target.value)} className="form-input" rows={2} />
                  </div>
                </>
              ) : (
                <>
                  <div>
                    <label className="form-label">Intitulé de la formation</label>
                    <input type="text" value={editForm.intitule} onChange={(e) => updateEditField('intitule', e.target.value)} className="form-input" />
                  </div>
                  <div>
                    <label className="form-label">Objectif</label>
                    <textarea value={editForm.objectif} onChange={(e) => updateEditField('objectif', e.target.value)} className="form-input" rows={2} />
                  </div>
                </>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="form-label">Domaine d'activité</label>
                  <select value={editForm.domaine_id} onChange={(e) => updateEditField('domaine_id', Number(e.target.value))} className="form-input">
                    <option value={0}>Sélectionner...</option>
                    {domainesRef.map((d) => <option key={d.id} value={d.id}>{d.libelle}</option>)}
                  </select>
                </div>
                <div>
                  <label className="form-label">Axe</label>
                  <select value={editForm.axe_id} onChange={(e) => updateEditField('axe_id', Number(e.target.value))} className="form-input">
                    <option value={0}>Sélectionner...</option>
                    {axesRef.map((a) => <option key={a.id} value={a.id}>{axeLabel(a)}</option>)}
                  </select>
                </div>
              </div>

              <div>
                <label className="form-label">Date de mise en œuvre souhaitée</label>
                <div className="flex gap-3">
                  {EDIT_YEARS.map((y) => (
                    <label key={y} className="flex items-center gap-1.5 cursor-pointer">
                      <input type="checkbox" checked={editForm.date_souhaitee.includes(y)} onChange={() => toggleEditYear(y)} className="accent-[#EC4B52]" />
                      {y}
                    </label>
                  ))}
                </div>
              </div>

              {editForm.type === 'autre' && (
                <>
                  <div>
                    <label className="form-label">Organisme pressenti</label>
                    <div className="flex gap-4">
                      <label className="flex items-center gap-1.5 cursor-pointer">
                        <input type="radio" name="edit-orga" checked={editForm.organisme === 'CNFPT'} onChange={() => updateEditField('organisme', 'CNFPT')} className="accent-[#29345C]" />
                        CNFPT
                      </label>
                      <label className="flex items-center gap-1.5 cursor-pointer">
                        <input type="radio" name="edit-orga" checked={editForm.organisme === 'autre'} onChange={() => updateEditField('organisme', 'autre')} className="accent-[#29345C]" />
                        Autre
                      </label>
                    </div>
                  </div>
                  {editForm.organisme === 'autre' && (
                    <>
                      <div>
                        <label className="form-label">Nom de l'organisme</label>
                        <input type="text" value={editForm.organisme_nom} onChange={(e) => updateEditField('organisme_nom', e.target.value)} className="form-input" />
                      </div>
                      <div>
                        <label className="form-label">Justification</label>
                        <textarea value={editForm.justification} onChange={(e) => updateEditField('justification', e.target.value)} className="form-input" rows={2} />
                      </div>
                    </>
                  )}
                  <div>
                    <label className="form-label">Estimation budgétaire</label>
                    <input type="text" value={editForm.estimation_budget} onChange={(e) => updateEditField('estimation_budget', e.target.value)} className="form-input" />
                  </div>
                </>
              )}

              <div className="w-24">
                <label className="form-label">Nombre d'agents</label>
                <input type="number" min={1} value={editForm.nb_agents} onChange={(e) => updateEditField('nb_agents', Number(e.target.value))} className="form-input" />
              </div>
            </div>

            <div className="flex justify-end gap-2 mt-5">
              <button onClick={closeEdit} className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded">Annuler</button>
              <button onClick={saveEdit} disabled={savingEdit} className="px-4 py-2 text-sm bg-ivry-navy text-white rounded hover:bg-ivry-navy-dark disabled:opacity-50">
                {savingEdit ? 'Enregistrement...' : 'Enregistrer'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
