import { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Send, LogOut, ClipboardList, BookOpen, GraduationCap, List, FileEdit, AlertTriangle } from 'lucide-react';
import api from '../api/axios';
import type { Formation, Axe, Domaine, Soumission } from '../types';

interface DirectionService {
  direction?: string;
  name?: string;
  label?: string;
  services?: (string | { code?: string; label?: string; [k: string]: any })[];
  children?: (string | { code?: string; label?: string; [k: string]: any })[];
  services_list?: (string | { code?: string; label?: string; [k: string]: any })[];
}

const svcLabel = (s: string | { code?: string; label?: string; [k: string]: any }) =>
  typeof s === 'string' ? s : (s.label ?? s.code ?? JSON.stringify(s));

const svcValue = (s: string | { code?: string; label?: string; [k: string]: any }) =>
  typeof s === 'string' ? s : (s.code && s.label ? `${s.code} - ${s.label}` : (s.code ?? s.label ?? JSON.stringify(s)));

interface DetailRowReg {
  type: 'reglementaire';
  formation_id: number;
  domaine_id: number;
  axe_id: number;
  motivation: string;
  nb_agents: number;
  date_souhaitee: number[];
}

interface DetailRowAutre {
  type: 'autre';
  domaine_id: number;
  axe_id: number;
  nb_agents: number;
  intitule: string;
  objectif: string;
  date_souhaitee: number[];
  organisme: string;
  organisme_nom: string;
  justification: string;
  estimation_budget: string;
}

type DetailRow = DetailRowReg | DetailRowAutre;

const YEARS = [2027, 2028, 2029];

function emptyReg(): DetailRowReg {
  return { type: 'reglementaire', formation_id: 0, domaine_id: 0, axe_id: 0, motivation: '', nb_agents: 1, date_souhaitee: [] };
}

function emptyAutre(): DetailRowAutre {
  return { type: 'autre', domaine_id: 0, axe_id: 0, nb_agents: 1, intitule: '', objectif: '', date_souhaitee: [], organisme: 'CNFPT', organisme_nom: '', justification: '', estimation_budget: '' };
}

function badge(s: string) {
  const c = s === 'en_attente' ? 'bg-yellow-100 text-yellow-800'
    : s === 'valide' ? 'bg-green-100 text-green-800'
    : 'bg-red-100 text-red-800';
  return <span className={`text-xs px-2 py-0.5 rounded ${c}`}>{s === 'en_attente' ? 'En attente' : s === 'valide' ? 'Validé' : 'Refusé'}</span>;
}

export default function Collecte() {
  const navigate = useNavigate();
  const [formations, setFormations] = useState<Formation[]>([]);
  const [axes, setAxes] = useState<Axe[]>([]);
  const [domaines, setDomaines] = useState<Domaine[]>([]);
  const [service, setService] = useState('');
  const [direction, setDirection] = useState('');
  const [detail, setDetail] = useState<DetailRow>(emptyReg());
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');
  const [directionsServices, setDirectionsServices] = useState<DirectionService[]>([]);
  const [loadingOrg, setLoadingOrg] = useState(true);
  const [view, setView] = useState<'form' | 'list'>('list');
  const [mesSoumissions, setMesSoumissions] = useState<Soumission[]>([]);
  const [messageGeneral, setMessageGeneral] = useState('');
  const [showAgentModal, setShowAgentModal] = useState(false);
  const [pendingSubmit, setPendingSubmit] = useState(false);

  const dsName = (ds: DirectionService) => ds.direction ?? ds.name ?? ds.label ?? '';
  const dsServices = (ds: DirectionService) => ds.services ?? ds.children ?? ds.services_list ?? [];
  const filteredServices = dsServices(directionsServices.find(ds => dsName(ds) === direction) || {});

  useEffect(() => {
    api.get('/api/v1/admin/formations').then(({ data }) => setFormations(data.filter((f: Formation) => f.active)));
    api.get('/api/v1/admin/axes').then(({ data }) => setAxes(data.filter((a: Axe) => a.active)));
    api.get('/api/v1/admin/domaines').then(({ data }) => setDomaines(data.filter((d: Domaine) => d.active)));
    api.get('/api/v1/referentiel/directions-services').then(({ data }) => {
      const list = Array.isArray(data) ? data
        : data.directions ?? data.data ?? data.items ?? data.results ?? data.organisations ?? [];
      setDirectionsServices(Array.isArray(list) ? list : []);
    }).catch(() => setDirectionsServices([])).finally(() => setLoadingOrg(false));
    api.get('/api/v1/collecte/mes-soumissions').then(({ data }) => setMesSoumissions(data || [])).catch(() => {});
    api.get('/api/v1/admin/page-config').then(({ data }) => {
      if (data?.message_general) setMessageGeneral(data.message_general);
    }).catch(() => {});
  }, []);

  function axeLabel(a: Axe) {
    return a.description ? `${a.libelle} — ${a.description}` : a.libelle;
  }

  function updateDetail(field: string, value: any) {
    setDetail((prev) => ({ ...prev, [field]: value } as DetailRow));
  }

  function toggleYear(year: number) {
    const current = detail.date_souhaitee;
    const next = current.includes(year) ? current.filter((y) => y !== year) : [...current, year];
    updateDetail('date_souhaitee', next);
  }

  async function doSubmit() {
    setError('');
    setPendingSubmit(false);
    try {
      await api.post('/api/v1/collecte/soumettre', { service, direction, details: [detail] });
      setSuccess('Demande envoyée avec succès !');
      setDetail(emptyReg());
      setService('');
      setDirection('');
      const { data } = await api.get('/api/v1/collecte/mes-soumissions');
      setMesSoumissions(data || []);
      setView('list');
    } catch (err) {
      setSuccess('');
      const e = err as any;
      setError(e?.response?.data?.error || e?.message || 'Erreur lors de l\'envoi');
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    if (detail.nb_agents <= 1) {
      setShowAgentModal(true);
    } else {
      doSubmit();
    }
  }

  function handleNewDemande() {
    setSuccess('');
    setError('');
    setView('form');
  }

  function handleLogout() {
    localStorage.removeItem('token');
    localStorage.removeItem('role');
    navigate('/login');
  }

  const allRows = useMemo(() => {
    return mesSoumissions.flatMap((s) => {
      const details = s.details?.length ? s.details : [];
      if (!details.length) {
          return [{
            key: `${s.id}-0`,
            created_at: s.created_at,
            formation_libelle: '',
            domaine_libelle: null as string | null,
            axe_libelle: null as string | null,
            axe_description: null as string | null,
            nb_agents: 0,
            statut: s.statut,
            motif_refus: s.motif_refus,
            type: '' as string | undefined,
            organisme: '' as string | undefined,
            organisme_nom: '' as string | undefined,
            date_souhaitee: '' as string | undefined,
            estimation_budget: '' as string | undefined,
          }];
      }
      return details.map((d) => ({
        key: `${s.id}-${d.id}`,
        created_at: s.created_at,
        formation_libelle: d.type === 'autre' ? (d.intitule || 'Formation autre') : (d.formation_libelle || ''),
        domaine_libelle: d.domaine_libelle || null,
        axe_libelle: d.axe_libelle || null,
        axe_description: d.axe_description || null,
        nb_agents: d.nb_agents,
        statut: (d.statut as 'en_attente' | 'valide' | 'refuse') ?? s.statut,
        motif_refus: d.motif_refus ?? s.motif_refus,
        type: d.type,
        organisme: d.organisme,
        organisme_nom: d.organisme_nom,
        date_souhaitee: d.date_souhaitee,
        estimation_budget: d.estimation_budget,
      }));
    });
  }, [mesSoumissions]);

  const groupedRows = useMemo(() => {
    const reg = allRows.filter((r) => r.type === 'reglementaire');
    const cnfpt = allRows.filter((r) => r.type === 'autre' && r.organisme === 'CNFPT');
    const horsCnfpt = allRows.filter((r) => r.type === 'autre' && r.organisme === 'autre');
    const totalHorsCnfpt = horsCnfpt.reduce((sum, r) => {
      const val = parseFloat(String(r.estimation_budget || '0').replace(/[^0-9,.-]/g, '').replace(',', '.'));
      return sum + (isNaN(val) ? 0 : val);
    }, 0);
    return { reg, cnfpt, horsCnfpt, totalHorsCnfpt };
  }, [allRows]);

  function section(title: string, rows: typeof allRows, total?: number) {
    if (!rows.length) return null;
    return (
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-3">
          <h2 className="text-lg font-bold text-ivry-navy border-l-4 border-ivry-red pl-3">{title}</h2>
          <span className="text-xs text-gray-400">({rows.length})</span>
          {total !== undefined && (
            <span className="text-xs font-medium text-ivry-red ml-auto">{total.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 })}</span>
          )}
        </div>
        <div className="overflow-x-auto rounded border shadow-sm">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                <th className="px-3 py-3">Date</th>
                <th className="px-3 py-3">Formation</th>
                <th className="px-3 py-3">Domaine</th>
                <th className="px-3 py-3">Axe</th>
                <th className="px-3 py-3">Agents</th>
                <th className="px-3 py-3">Date souhaitée</th>
                {title !== 'Réglementaires' && title !== 'CNFPT' && <th className="px-3 py-3">Organisme</th>}
                <th className="px-3 py-3">Prix estimé</th>
                <th className="px-3 py-3">Statut</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {rows.map((r) => (
                <tr key={r.key} className={`hover:bg-gray-50 ${r.statut !== 'en_attente' ? 'text-gray-400' : ''}`}>
                  <td className="px-3 py-2 whitespace-nowrap">{new Date(r.created_at).toLocaleDateString('fr-FR')}</td>
                  <td className="px-3 py-2">{r.formation_libelle || '—'}</td>
                  <td className="px-3 py-2">{r.domaine_libelle || '—'}</td>
                  <td className="px-3 py-2 text-gray-500">
                    {r.axe_libelle
                      ? r.axe_description
                        ? `${r.axe_libelle} — ${r.axe_description}`
                        : r.axe_libelle
                      : '—'}
                  </td>
                  <td className="px-3 py-2">{r.nb_agents}</td>
                  <td className="px-3 py-2 whitespace-nowrap">{
                    r.date_souhaitee
                      ? (() => {
                          let raw = r.date_souhaitee!;
                          try { const parsed = JSON.parse(raw); if (Array.isArray(parsed)) return parsed.join(', '); } catch {}
                          return raw;
                        })()
                      : '—'
                  }</td>
                  {title !== 'Réglementaires' && title !== 'CNFPT' && <td className="px-3 py-2">{r.organisme_nom || '—'}</td>}
                  <td className="px-3 py-2 whitespace-nowrap">{
                    r.estimation_budget
                      ? (() => {
                          const val = parseFloat(String(r.estimation_budget!).replace(/[^0-9,.-]/g, '').replace(',', '.'));
                          return isNaN(val) ? r.estimation_budget : val.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 });
                        })()
                      : '—'
                  }</td>
                  <td className="px-3 py-2">
                    {badge(r.statut)}
                    {r.motif_refus && <p className="text-xs text-red-500 mt-1 max-w-40">{r.motif_refus}</p>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  if (view === 'list') {
    return (
      <div className="max-w-5xl mx-auto p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <List className="w-6 h-6 text-green-600" />
            <h1 className="text-2xl font-bold">Demandes soumises</h1>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={handleNewDemande} className="flex items-center gap-1.5 bg-ivry-navy text-white px-4 py-2 rounded text-sm hover:bg-ivry-navy-dark transition">
              <FileEdit className="w-4 h-4" /> Soumettre une autre demande
            </button>
            <button onClick={handleLogout} className="flex items-center gap-1 text-gray-500 hover:text-ivry-red">
              <LogOut className="w-4 h-4" /> Déconnexion
            </button>
          </div>
        </div>

        {success && <p className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-4">{success}</p>}
        {error && <p className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">{error}</p>}

        {section('Réglementaires', groupedRows.reg)}
        {section('CNFPT', groupedRows.cnfpt)}
        {section('Hors CNFPT', groupedRows.horsCnfpt, groupedRows.totalHorsCnfpt)}

        {!allRows.length && (
          <div className="text-center py-16">
            <p className="text-gray-400">Aucune demande trouvée.</p>
            {messageGeneral && (
              <p className="text-gray-500 text-sm mt-3 max-w-lg mx-auto italic">{messageGeneral}</p>
            )}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <ClipboardList className="w-6 h-6 text-ivry-navy" />
          <h1 className="text-2xl font-bold">Formulaire de demande de formation</h1>
        </div>
        <button onClick={handleLogout} className="flex items-center gap-1 text-gray-500 hover:text-ivry-red">
          <LogOut className="w-4 h-4" /> Déconnexion
        </button>
      </div>

      {success && <p className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-4">{success}</p>}
      {error && <p className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">{error}</p>}

      {showAgentModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full mx-4 p-6">
            <div className="flex items-center gap-3 mb-4">
              <AlertTriangle className="w-6 h-6 text-amber-500 shrink-0" />
              <h3 className="text-lg font-bold text-gray-900">Attention</h3>
            </div>
            <p className="text-sm text-gray-700 mb-6">
              Le plan de formation a pour objet le recensement des besoins collectifs. Le nombre d'agents doit être supérieur à 1.
            </p>
            <div className="flex justify-end">
              <button
                onClick={() => setShowAgentModal(false)}
                className="px-4 py-2 text-sm font-medium text-white bg-ivry-navy rounded hover:bg-ivry-navy-dark transition"
              >
                OK
              </button>
            </div>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="bg-white rounded shadow-sm p-5 space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="form-label">Direction <span className="text-red-500">*</span></label>
            <select value={direction} onChange={(e) => { setDirection(e.target.value); setService(''); }} className="form-input" required disabled={loadingOrg}>
              <option value="">Sélectionner...</option>
              {directionsServices.map((ds, i) => <option key={dsName(ds) || i} value={dsName(ds)}>{dsName(ds)}</option>)}
            </select>
          </div>
          <div>
            <label className="form-label">Service <span className="text-red-500">*</span></label>
            <select value={service} onChange={(e) => setService(e.target.value)} className="form-input" required disabled={loadingOrg || !direction}>
              <option value="">Sélectionner...</option>
              {filteredServices.map((s, i) => <option key={i} value={svcValue(s)}>{svcLabel(s)}</option>)}
            </select>
          </div>
        </div>

        <h2 className="form-section-title">Besoin en formation</h2>
        <div className="border rounded p-4 space-y-4">
          <div className="flex items-center gap-1 mb-2">
            <button type="button" onClick={() => setDetail(emptyReg())}
              className={`flex items-center gap-2 px-4 py-2.5 rounded text-sm font-semibold transition ${detail.type === 'reglementaire' ? 'bg-ivry-navy/10 text-ivry-navy' : 'text-gray-500 hover:bg-gray-100'}`}>
              <BookOpen className="w-4 h-4" /> Réglementaire
            </button>
            <button type="button" onClick={() => setDetail(emptyAutre())}
              className={`flex items-center gap-2 px-4 py-2.5 rounded text-sm font-semibold transition ${detail.type === 'autre' ? 'bg-ivry-red/10 text-ivry-red' : 'text-gray-500 hover:bg-gray-100'}`}>
              <GraduationCap className="w-4 h-4" /> Autre formation
            </button>
          </div>

          {detail.type === 'reglementaire' ? (
            <>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="form-label">Formation réglementaire <span className="text-red-500">*</span></label>
                  <select value={detail.formation_id} onChange={(e) => updateDetail('formation_id', Number(e.target.value))} className="form-input" required>
                    <option value={0}>Sélectionner...</option>
                    {formations.map((f) => <option key={f.id} value={f.id}>{f.libelle}</option>)}
                  </select>
                </div>
                <div>
                  <label className="form-label">Axe <span className="text-red-500">*</span></label>
                  <select value={detail.axe_id} onChange={(e) => updateDetail('axe_id', Number(e.target.value))} className="form-input" required>
                    <option value={0}>Sélectionner...</option>
                    {axes.map((a) => <option key={a.id} value={a.id}>{axeLabel(a)}</option>)}
                  </select>
                  {(() => { const a = axes.find(x => x.id === detail.axe_id); return a ? <p className="text-xs text-gray-500 mt-1 italic">{a.libelle}{a.description ? ` — ${a.description}` : ''}</p> : null; })()}
                </div>
              </div>
              <div>
                <label className="form-label">Domaine d'activité</label>
                <select value={detail.domaine_id} onChange={(e) => updateDetail('domaine_id', Number(e.target.value))} className="form-input">
                  <option value={0}>Sélectionner...</option>
                  {domaines.map((d) => <option key={d.id} value={d.id}>{d.libelle}</option>)}
                </select>
              </div>
              <div>
                <label className="form-label">Motivation <span className="text-red-500">*</span></label>
                <textarea value={detail.motivation} onChange={(e) => updateDetail('motivation', e.target.value)} className="form-input" rows={2} required />
              </div>
              <div>
                <label className="form-label">Date de mise en œuvre souhaitée</label>
                <div className="flex gap-3">
                  {YEARS.map((y) => (
                    <label key={y} className="flex items-center gap-2 text-base cursor-pointer">
                      <input type="checkbox" checked={(detail as DetailRowReg).date_souhaitee.includes(y)} onChange={() => toggleYear(y)} className="accent-[#EC4B52]" />
                      {y}
                    </label>
                  ))}
                </div>
              </div>
              <div className="w-24">
                <label className="form-label">Nombre d'agents</label>
                <input type="number" min={1} value={detail.nb_agents} onChange={(e) => updateDetail('nb_agents', Number(e.target.value))} className="form-input" required />
              </div>
            </>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="form-label">Intitulé de la formation <span className="text-red-500">*</span></label>
                  <input type="text" value={detail.intitule} onChange={(e) => updateDetail('intitule', e.target.value)} className="form-input" required placeholder="Ex: Gestion du stress, Excel avancé..." />
                </div>
              </div>
              <div>
                <label className="form-label">Objectif <span className="text-red-500">*</span></label>
                <textarea value={detail.objectif} onChange={(e) => updateDetail('objectif', e.target.value)} className="form-input" rows={2} required placeholder="Décrivez l'objectif de cette formation..." />
              </div>
              <div>
                <label className="form-label">Rapprochement au projet d'administration (Axe) <span className="text-red-500">*</span></label>
                <select value={detail.axe_id} onChange={(e) => updateDetail('axe_id', Number(e.target.value))} className="form-input" required>
                  <option value={0}>Sélectionner...</option>
                  {axes.map((a) => <option key={a.id} value={a.id}>{axeLabel(a)}</option>)}
                </select>
                {(() => { const a = axes.find(x => x.id === Number(detail.axe_id)); return a ? <p className="text-xs text-gray-500 mt-1 italic">{a.libelle}{a.description ? ` — ${a.description}` : ''}</p> : null; })()}
              </div>
              <div>
                <label className="form-label">Domaine d'activité</label>
                <select value={detail.domaine_id} onChange={(e) => updateDetail('domaine_id', Number(e.target.value))} className="form-input">
                  <option value={0}>Sélectionner...</option>
                  {domaines.map((d) => <option key={d.id} value={d.id}>{d.libelle}</option>)}
                </select>
              </div>
              <div>
                <label className="form-label">Date de mise en œuvre souhaitée</label>
                <div className="flex gap-3">
                  {YEARS.map((y) => (
                    <label key={y} className="flex items-center gap-2 text-base cursor-pointer">
                      <input type="checkbox" checked={detail.date_souhaitee.includes(y)} onChange={() => toggleYear(y)} className="accent-[#EC4B52]" />
                      {y}
                    </label>
                  ))}
                </div>
              </div>
              <div>
                <label className="form-label">Organisme pressenti</label>
                <div className="flex gap-4">
                  <label className="flex items-center gap-2 text-base cursor-pointer">
                    <input type="radio" name="orga" checked={detail.organisme === 'CNFPT'} onChange={() => updateDetail('organisme', 'CNFPT')} className="accent-[#29345C]" />
                    CNFPT
                  </label>
                  <label className="flex items-center gap-2 text-base cursor-pointer">
                    <input type="radio" name="orga" checked={detail.organisme === 'autre'} onChange={() => updateDetail('organisme', 'autre')} className="accent-[#29345C]" />
                    Autre
                  </label>
                </div>
              </div>
              {detail.organisme === 'autre' && (
                <>
                  <div>
                    <label className="form-label">Nom de l'organisme</label>
                    <input type="text" value={detail.organisme_nom} onChange={(e) => updateDetail('organisme_nom', e.target.value)} className="form-input" required placeholder="Nom de l'organisme externe" />
                  </div>
                  <div>
                    <label className="form-label">Justification du recours à un organisme externe</label>
                    <textarea value={detail.justification} onChange={(e) => updateDetail('justification', e.target.value)} className="form-input" rows={2} required placeholder="Pourquoi le CNFPT n'a pas été retenu pour ce besoin spécifique ?" />
                  </div>
                  <div>
                    <label className="form-label">Estimation budgétaire</label>
                    <input type="text" value={detail.estimation_budget} onChange={(e) => updateDetail('estimation_budget', e.target.value)} className="form-input" required placeholder="Ex: 5 000 €" />
                  </div>
                </>
              )}
              <div className="w-24">
                <label className="form-label">Nombre d'agents</label>
                <input type="number" min={1} value={detail.nb_agents} onChange={(e) => updateDetail('nb_agents', Number(e.target.value))} className="form-input" required />
              </div>
            </>
          )}
        </div>

        <div className="flex justify-end pt-2">
          <button type="submit" className="flex items-center gap-2 bg-ivry-navy text-white px-8 py-3.5 rounded hover:bg-ivry-navy-dark transition text-base font-semibold">
            <Send className="w-4 h-4" /> Soumettre la demande
          </button>
        </div>
      </form>
    </div>
  );
}
