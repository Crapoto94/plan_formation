import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Send, Plus, Trash2, LogOut, ClipboardList, BookOpen, GraduationCap } from 'lucide-react';
import api from '../api/axios';
import type { Formation, Axe } from '../types';

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
  typeof s === 'string' ? s : (s.code ?? s.label ?? JSON.stringify(s));

interface DetailRowReg {
  type: 'reglementaire';
  formation_id: number;
  axe_id: number;
  motivation: string;
  nb_agents: number;
}

interface DetailRowAutre {
  type: 'autre';
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
  return { type: 'reglementaire', formation_id: 0, axe_id: 0, motivation: '', nb_agents: 1 };
}

function emptyAutre(): DetailRowAutre {
  return { type: 'autre', axe_id: 0, nb_agents: 1, intitule: '', objectif: '', date_souhaitee: [], organisme: 'CNFPT', organisme_nom: '', justification: '', estimation_budget: '' };
}

export default function Collecte() {
  const navigate = useNavigate();
  const [formations, setFormations] = useState<Formation[]>([]);
  const [axes, setAxes] = useState<Axe[]>([]);
  const [service, setService] = useState('');
  const [direction, setDirection] = useState('');
  const [details, setDetails] = useState<DetailRow[]>([emptyReg()]);
  const [success, setSuccess] = useState('');
  const [directionsServices, setDirectionsServices] = useState<DirectionService[]>([]);
  const [loadingOrg, setLoadingOrg] = useState(true);

  const dsName = (ds: DirectionService) => ds.direction ?? ds.name ?? ds.label ?? '';
  const dsServices = (ds: DirectionService) => ds.services ?? ds.children ?? ds.services_list ?? [];
  const filteredServices = dsServices(directionsServices.find(ds => dsName(ds) === direction) || {});

  useEffect(() => {
    api.get('/api/v1/admin/formations').then(({ data }) => setFormations(data.filter((f: Formation) => f.active)));
    api.get('/api/v1/admin/axes').then(({ data }) => setAxes(data.filter((a: Axe) => a.active)));
    api.get('/api/v1/referentiel/directions-services').then(({ data }) => {
      const list = Array.isArray(data) ? data
        : data.directions ?? data.data ?? data.items ?? data.results ?? data.organisations ?? [];
      setDirectionsServices(Array.isArray(list) ? list : []);
    }).catch(() => setDirectionsServices([])).finally(() => setLoadingOrg(false));
  }, []);

  function addRow(type: 'reglementaire' | 'autre') {
    setDetails([...details, type === 'reglementaire' ? emptyReg() : emptyAutre()]);
  }

  function removeRow(i: number) {
    if (details.length > 1) setDetails(details.filter((_, idx) => idx !== i));
  }

  function updateRow(i: number, field: string, value: any) {
    const copy = [...details] as any[];
    copy[i][field] = value;
    setDetails(copy);
  }

  function toggleYear(i: number, year: number) {
    const d = details[i];
    if (d.type !== 'autre') return;
    const current = d.date_souhaitee;
    const next = current.includes(year) ? current.filter((y) => y !== year) : [...current, year];
    updateRow(i, 'date_souhaitee', next);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    try {
      await api.post('/api/v1/collecte/soumettre', { service, direction, details });
      setSuccess('Demande envoyée avec succès !');
      setDetails([emptyReg()]);
      setService('');
      setDirection('');
    } catch {
      setSuccess('');
    }
  }

  function handleLogout() {
    localStorage.removeItem('token');
    localStorage.removeItem('role');
    navigate('/login');
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <ClipboardList className="w-6 h-6 text-blue-700" />
          <h1 className="text-2xl font-bold">Formulaire de demande de formation</h1>
        </div>
        <button onClick={handleLogout} className="flex items-center gap-1 text-gray-500 hover:text-red-600">
          <LogOut className="w-4 h-4" /> Déconnexion
        </button>
      </div>

      {success && <p className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-4">{success}</p>}

      <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-md p-6 space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Direction</label>
            <select value={direction} onChange={(e) => { setDirection(e.target.value); setService(''); }} className="w-full border rounded-lg px-3 py-2" required disabled={loadingOrg}>
              <option value="">Sélectionner...</option>
              {directionsServices.map((ds, i) => <option key={dsName(ds) || i} value={dsName(ds)}>{dsName(ds)}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Service</label>
            <select value={service} onChange={(e) => setService(e.target.value)} className="w-full border rounded-lg px-3 py-2" required disabled={loadingOrg || !direction}>
              <option value="">Sélectionner...</option>
              {filteredServices.map((s, i) => <option key={i} value={svcValue(s)}>{svcLabel(s)}</option>)}
            </select>
          </div>
        </div>

        <h2 className="font-semibold text-lg mt-6">Besoins en formation</h2>
        {details.map((row, i) => (
          <div key={i} className="border rounded-lg p-4 space-y-3 relative">
            <div className="flex items-center gap-1 mb-2">
              <button type="button" onClick={() => { const copy = [...details]; copy[i] = emptyReg() as any; setDetails(copy); }}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition ${row.type === 'reglementaire' ? 'bg-blue-100 text-blue-700' : 'text-gray-500 hover:bg-gray-100'}`}>
                <BookOpen className="w-4 h-4" /> Réglementaire
              </button>
              <button type="button" onClick={() => { const copy = [...details]; copy[i] = emptyAutre() as any; setDetails(copy); }}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition ${row.type === 'autre' ? 'bg-indigo-100 text-indigo-700' : 'text-gray-500 hover:bg-gray-100'}`}>
                <GraduationCap className="w-4 h-4" /> Autre formation
              </button>
              {details.length > 1 && (
                <button type="button" onClick={() => removeRow(i)} className="ml-auto text-red-500 hover:text-red-700 p-1">
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>

            {row.type === 'reglementaire' ? (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium mb-1">Formation réglementaire</label>
                    <select value={row.formation_id} onChange={(e) => updateRow(i, 'formation_id', Number(e.target.value))} className="w-full border rounded px-2 py-1.5 text-sm" required>
                      <option value={0}>Sélectionner...</option>
                      {formations.map((f) => <option key={f.id} value={f.id}>{f.libelle}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium mb-1">Axe</label>
                    <select value={row.axe_id} onChange={(e) => updateRow(i, 'axe_id', Number(e.target.value))} className="w-full border rounded px-2 py-1.5 text-sm">
                      <option value={0}>Sélectionner...</option>
                      {axes.map((a) => <option key={a.id} value={a.id}>{a.libelle}</option>)}
                    </select>
                    {(() => { const a = axes.find(x => x.id === row.axe_id); return a ? <p className="text-xs text-gray-500 mt-1 italic">{a.libelle}{a.description ? ` — ${a.description}` : ''}</p> : null; })()}
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1">Motivation</label>
                  <textarea value={row.motivation} onChange={(e) => updateRow(i, 'motivation', e.target.value)} className="w-full border rounded px-2 py-1.5 text-sm" rows={2} />
                </div>
                <div className="w-24">
                  <label className="block text-xs font-medium mb-1">Nombre d'agents</label>
                  <input type="number" min={1} value={row.nb_agents} onChange={(e) => updateRow(i, 'nb_agents', Number(e.target.value))} className="w-full border rounded px-2 py-1.5 text-sm" required />
                </div>
              </>
            ) : (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <label className="block text-xs font-medium mb-1">Intitulé de la formation</label>
                    <input type="text" value={row.intitule} onChange={(e) => updateRow(i, 'intitule', e.target.value)} className="w-full border rounded px-2 py-1.5 text-sm" required placeholder="Ex: Gestion du stress, Excel avancé..." />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1">Objectif</label>
                  <textarea value={row.objectif} onChange={(e) => updateRow(i, 'objectif', e.target.value)} className="w-full border rounded px-2 py-1.5 text-sm" rows={2} required placeholder="Décrivez l'objectif de cette formation..." />
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1">Rapprochement au projet d'administration (Axe)</label>
                  <select value={row.axe_id} onChange={(e) => updateRow(i, 'axe_id', Number(e.target.value))} className="w-full border rounded px-2 py-1.5 text-sm">
                    <option value={0}>Sélectionner...</option>
                    {axes.map((a) => <option key={a.id} value={a.id}>{a.libelle}</option>)}
                  </select>
                  {(() => { const a = axes.find(x => x.id === Number(row.axe_id)); return a ? <p className="text-xs text-gray-500 mt-1 italic">{a.libelle}{a.description ? ` — ${a.description}` : ''}</p> : null; })()}
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1">Date de mise en œuvre souhaitée</label>
                  <div className="flex gap-3">
                    {YEARS.map((y) => (
                      <label key={y} className="flex items-center gap-1.5 text-sm cursor-pointer">
                        <input type="checkbox" checked={row.date_souhaitee.includes(y)} onChange={() => toggleYear(i, y)} className="accent-indigo-600" />
                        {y}
                      </label>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1">Organisme pressenti</label>
                  <div className="flex gap-4">
                    <label className="flex items-center gap-1.5 text-sm cursor-pointer">
                      <input type="radio" name={`orga-${i}`} checked={row.organisme === 'CNFPT'} onChange={() => updateRow(i, 'organisme', 'CNFPT')} className="accent-indigo-600" />
                      CNFPT
                    </label>
                    <label className="flex items-center gap-1.5 text-sm cursor-pointer">
                      <input type="radio" name={`orga-${i}`} checked={row.organisme === 'autre'} onChange={() => updateRow(i, 'organisme', 'autre')} className="accent-indigo-600" />
                      Autre
                    </label>
                  </div>
                </div>
                {row.organisme === 'autre' && (
                  <>
                    <div>
                      <label className="block text-xs font-medium mb-1">Nom de l'organisme</label>
                      <input type="text" value={row.organisme_nom} onChange={(e) => updateRow(i, 'organisme_nom', e.target.value)} className="w-full border rounded px-2 py-1.5 text-sm" required placeholder="Nom de l'organisme externe" />
                    </div>
                    <div>
                      <label className="block text-xs font-medium mb-1">Justification du recours à un organisme externe</label>
                      <textarea value={row.justification} onChange={(e) => updateRow(i, 'justification', e.target.value)} className="w-full border rounded px-2 py-1.5 text-sm" rows={2} required placeholder="Pourquoi le CNFPT n'a pas été retenu pour ce besoin spécifique ?" />
                    </div>
                    <div>
                      <label className="block text-xs font-medium mb-1">Estimation budgétaire</label>
                      <input type="text" value={row.estimation_budget} onChange={(e) => updateRow(i, 'estimation_budget', e.target.value)} className="w-full border rounded px-2 py-1.5 text-sm" required placeholder="Ex: 5 000 €" />
                    </div>
                  </>
                )}
                <div className="w-24">
                  <label className="block text-xs font-medium mb-1">Nombre d'agents</label>
                  <input type="number" min={1} value={row.nb_agents} onChange={(e) => updateRow(i, 'nb_agents', Number(e.target.value))} className="w-full border rounded px-2 py-1.5 text-sm" required />
                </div>
              </>
            )}
          </div>
        ))}

        <div className="flex gap-2">
          <button type="button" onClick={() => addRow('reglementaire')} className="flex items-center gap-1 text-blue-700 hover:text-blue-900 text-sm">
            <Plus className="w-4 h-4" /> Ajouter formation réglementaire
          </button>
          <button type="button" onClick={() => addRow('autre')} className="flex items-center gap-1 text-indigo-700 hover:text-indigo-900 text-sm">
            <Plus className="w-4 h-4" /> Ajouter autre formation
          </button>
        </div>

        <div className="flex justify-end pt-4">
          <button type="submit" className="flex items-center gap-2 bg-blue-700 text-white px-6 py-2 rounded-lg hover:bg-blue-800 transition">
            <Send className="w-4 h-4" /> Soumettre la demande
          </button>
        </div>
      </form>
    </div>
  );
}
