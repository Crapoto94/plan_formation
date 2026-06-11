import { useEffect, useState } from 'react';
import { Plus, Pencil, Trash2, Check, X, BookOpen, Target, Settings, Wifi, WifiOff, Loader, Save, Users, Search, Mail, UserPlus, UserMinus } from 'lucide-react';
import api from '../api/axios';
import type { Formation, Axe } from '../types';

function FormationsSection() {
  const [formations, setFormations] = useState<Formation[]>([]);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState({ libelle: '', description: '' });

  useEffect(() => { load(); }, []);

  async function load() {
    const { data } = await api.get('/api/v1/admin/formations');
    setFormations(data);
  }

  async function create() {
    if (!form.libelle) return;
    await api.post('/api/v1/admin/formations', form);
    setForm({ libelle: '', description: '' });
    load();
  }

  async function update(id: number) {
    await api.put(`/api/v1/admin/formations/${id}`, form);
    setEditingId(null);
    setForm({ libelle: '', description: '' });
    load();
  }

  async function remove(id: number) {
    await api.delete(`/api/v1/admin/formations/${id}`);
    load();
  }

  function startEdit(f: Formation) {
    setEditingId(f.id);
    setForm({ libelle: f.libelle, description: f.description || '' });
  }

  function cancelEdit() {
    setEditingId(null);
    setForm({ libelle: '', description: '' });
  }

  return (
    <div className="bg-white rounded-xl shadow-md p-6">
      <div className="flex items-center gap-2 mb-4">
        <BookOpen className="w-5 h-5 text-blue-700" />
        <h2 className="text-lg font-bold">Formations réglementaires</h2>
      </div>

      <div className="flex gap-2 mb-4">
        <input type="text" placeholder="Libellé" value={form.libelle} onChange={(e) => setForm({ ...form, libelle: e.target.value })} className="flex-1 border rounded-lg px-3 py-2 text-sm" />
        <input type="text" placeholder="Description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="flex-1 border rounded-lg px-3 py-2 text-sm" />
        {editingId ? (
          <>
            <button onClick={() => update(editingId)} className="bg-green-600 text-white px-3 py-2 rounded-lg hover:bg-green-700"><Check className="w-4 h-4" /></button>
            <button onClick={cancelEdit} className="bg-gray-400 text-white px-3 py-2 rounded-lg hover:bg-gray-500"><X className="w-4 h-4" /></button>
          </>
        ) : (
          <button onClick={create} className="bg-blue-700 text-white px-3 py-2 rounded-lg hover:bg-blue-800"><Plus className="w-4 h-4" /></button>
        )}
      </div>

      <div className="space-y-1.5 max-h-64 overflow-y-auto">
        {formations.map((f) => (
          <div key={f.id} className="border rounded-lg p-3 flex items-center justify-between">
            <div className="flex-1 min-w-0">
              <p className="font-medium text-sm truncate">{f.libelle}</p>
              {f.description && <p className="text-xs text-gray-500 truncate">{f.description}</p>}
            </div>
            <div className="flex gap-1.5 ml-2 shrink-0">
              <button onClick={() => startEdit(f)} className="text-blue-600 hover:text-blue-800"><Pencil className="w-3.5 h-3.5" /></button>
              <button onClick={() => remove(f.id)} className="text-red-600 hover:text-red-800"><Trash2 className="w-3.5 h-3.5" /></button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function AxesSection() {
  const [axes, setAxes] = useState<Axe[]>([]);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState({ libelle: '', description: '' });

  useEffect(() => { load(); }, []);

  async function load() {
    const { data } = await api.get('/api/v1/admin/axes');
    setAxes(data);
  }

  async function create() {
    if (!form.libelle) return;
    await api.post('/api/v1/admin/axes', form);
    setForm({ libelle: '', description: '' });
    load();
  }

  async function update(id: number) {
    await api.put(`/api/v1/admin/axes/${id}`, form);
    setEditingId(null);
    setForm({ libelle: '', description: '' });
    load();
  }

  async function remove(id: number) {
    await api.delete(`/api/v1/admin/axes/${id}`);
    load();
  }

  function startEdit(a: Axe) {
    setEditingId(a.id);
    setForm({ libelle: a.libelle, description: a.description || '' });
  }

  function cancelEdit() {
    setEditingId(null);
    setForm({ libelle: '', description: '' });
  }

  return (
    <div className="bg-white rounded-xl shadow-md p-6">
      <div className="flex items-center gap-2 mb-4">
        <Target className="w-5 h-5 text-blue-700" />
        <h2 className="text-lg font-bold">Axes de formation</h2>
      </div>

      <div className="flex gap-2 mb-4">
        <input type="text" placeholder="Libellé" value={form.libelle} onChange={(e) => setForm({ ...form, libelle: e.target.value })} className="flex-1 border rounded-lg px-3 py-2 text-sm" />
        <input type="text" placeholder="Description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="flex-1 border rounded-lg px-3 py-2 text-sm" />
        {editingId ? (
          <>
            <button onClick={() => update(editingId)} className="bg-green-600 text-white px-3 py-2 rounded-lg hover:bg-green-700"><Check className="w-4 h-4" /></button>
            <button onClick={cancelEdit} className="bg-gray-400 text-white px-3 py-2 rounded-lg hover:bg-gray-500"><X className="w-4 h-4" /></button>
          </>
        ) : (
          <button onClick={create} className="bg-blue-700 text-white px-3 py-2 rounded-lg hover:bg-blue-800"><Plus className="w-4 h-4" /></button>
        )}
      </div>

      <div className="space-y-1.5 max-h-64 overflow-y-auto">
        {axes.map((a) => (
          <div key={a.id} className="border rounded-lg p-3 flex items-center justify-between">
            <div className="flex-1 min-w-0">
              <p className="font-medium text-sm truncate">{a.libelle}</p>
              {a.description && <p className="text-xs text-gray-500 truncate">{a.description}</p>}
            </div>
            <div className="flex gap-1.5 ml-2 shrink-0">
              <button onClick={() => startEdit(a)} className="text-blue-600 hover:text-blue-800"><Pencil className="w-3.5 h-3.5" /></button>
              <button onClick={() => remove(a.id)} className="text-red-600 hover:text-red-800"><Trash2 className="w-3.5 h-3.5" /></button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function ApiConfigSection() {
  const [form, setForm] = useState({ apmUrl: '', apmKey: '', hubdsiUrl: '', hubdsiKey: '', hubdsiPath: '/api/admin/rh/organisation-chart', testUsername: '' });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [testing, setTesting] = useState<'apm' | 'hubdsi' | null>(null);
  const [result, setResult] = useState<{ apm?: any; hubdsi?: any }>({});

  useEffect(() => {
    api.get('/api/v1/admin/config').then(({ data }) => {
      setForm((f) => ({ ...f, apmUrl: data.apm.url, apmKey: data.apm.key, hubdsiUrl: data.hubdsi.url, hubdsiKey: data.hubdsi.key, hubdsiPath: data.hubdsi.path }));
    });
  }, []);

  async function handleSave() {
    setSaving(true);
    try {
      await api.put('/api/v1/admin/config', {
        apm: { url: form.apmUrl, key: form.apmKey },
        hubdsi: { url: form.hubdsiUrl, key: form.hubdsiKey, path: form.hubdsiPath },
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch {
      setSaved(false);
    } finally {
      setSaving(false);
    }
  }

  async function testApm() {
    if (!form.testUsername) return;
    setTesting('apm');
    setResult((r) => ({ ...r, apm: undefined }));
    try {
      const { data } = await api.post('/api/v1/admin/test-apm', { username: form.testUsername });
      setResult((r) => ({ ...r, apm: data }));
    } catch {
      setResult((r) => ({ ...r, apm: { success: false, error: 'Erreur réseau' } }));
    } finally {
      setTesting(null);
    }
  }

  async function testHubdsi() {
    setTesting('hubdsi');
    setResult((r) => ({ ...r, hubdsi: undefined }));
    try {
      const { data } = await api.post('/api/v1/admin/test-hubdsi');
      setResult((r) => ({ ...r, hubdsi: data }));
    } catch {
      setResult((r) => ({ ...r, hubdsi: { success: false, error: 'Erreur réseau' } }));
    } finally {
      setTesting(null);
    }
  }

  return (
    <div className="bg-white rounded-xl shadow-md p-6">
      <div className="flex items-center gap-2 mb-4">
        <Settings className="w-5 h-5 text-blue-700" />
        <h2 className="text-lg font-bold">API Villes</h2>
      </div>

      <div className="space-y-4 mb-4">
        <div className="border rounded-lg p-4">
          <p className="text-sm font-medium mb-2">API APM (Authentification AD, Mail)</p>
          <div className="space-y-2">
            <input type="text" placeholder="URL" value={form.apmUrl} onChange={(e) => setForm({ ...form, apmUrl: e.target.value })} className="w-full border rounded px-3 py-2 text-sm font-mono" />
            <input type="text" placeholder="Clé API" value={form.apmKey} onChange={(e) => setForm({ ...form, apmKey: e.target.value })} className="w-full border rounded px-3 py-2 text-sm font-mono" />
          </div>
        </div>
        <div className="border rounded-lg p-4">
          <p className="text-sm font-medium mb-2">API Hub DSI (Organisation)</p>
          <div className="space-y-2">
            <input type="text" placeholder="URL de base" value={form.hubdsiUrl} onChange={(e) => setForm({ ...form, hubdsiUrl: e.target.value })} className="w-full border rounded px-3 py-2 text-sm font-mono" />
            <input type="text" placeholder="Clé API" value={form.hubdsiKey} onChange={(e) => setForm({ ...form, hubdsiKey: e.target.value })} className="w-full border rounded px-3 py-2 text-sm font-mono" />
            <input type="text" placeholder="Chemin de l'endpoint (ex: /api/directions-services)" value={form.hubdsiPath} onChange={(e) => setForm({ ...form, hubdsiPath: e.target.value })} className="w-full border rounded px-3 py-2 text-sm font-mono" />
            {form.hubdsiUrl && form.hubdsiPath && <code className="block bg-gray-100 rounded px-2 py-1 text-xs mt-1">{form.hubdsiUrl}{form.hubdsiPath}</code>}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-3 mb-4">
        <button onClick={handleSave} disabled={saving} className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 disabled:opacity-50 text-sm">
          <Save className="w-4 h-4" /> {saving ? 'Enregistrement...' : 'Enregistrer'}
        </button>
        {saved && <span className="text-green-600 text-sm">✓ Configuration sauvegardée</span>}
      </div>

      <div className="border-t pt-4 space-y-4">
        <div>
          <p className="text-sm font-medium mb-2">Rechercher un agent dans l'AD</p>
          <div className="flex gap-2">
            <input type="text" placeholder="Nom d'utilisateur (ex: machevalier)" value={form.testUsername} onChange={(e) => setForm({ ...form, testUsername: e.target.value })} className="flex-1 border rounded px-3 py-2 text-sm" />
            <button onClick={testApm} disabled={testing !== null || !form.testUsername} className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 disabled:opacity-50 text-sm">
              {testing === 'apm' ? <Loader className="w-4 h-4 animate-spin" /> : <Wifi className="w-4 h-4" />}
              Chercher
            </button>
          </div>
          {result.apm && (
            <div className="mt-2 space-y-1">
              <div className={`text-xs rounded px-2 py-1 ${result.apm.success ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                {result.apm.success ? `${result.apm.count} résultat(s) trouvé(s)` : `Échec : ${result.apm.error}`}
              </div>
              {result.apm.data && (
                <pre className="bg-gray-100 rounded px-2 py-1 text-xs overflow-x-auto max-h-40 overflow-y-auto">
                  {JSON.stringify(result.apm.data, null, 2).slice(0, 2000)}
                </pre>
              )}
            </div>
          )}
        </div>

        <div>
          <p className="text-sm font-medium mb-2">Tester l'API Hub DSI</p>
          <div className="flex gap-2">
            <code className="flex-1 bg-gray-100 rounded px-3 py-2 text-xs font-mono truncate">{form.hubdsiUrl || 'URL non configurée'}{form.hubdsiPath}</code>
            <button onClick={testHubdsi} disabled={testing !== null} className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 disabled:opacity-50 text-sm">
              {testing === 'hubdsi' ? <Loader className="w-4 h-4 animate-spin" /> : <Wifi className="w-4 h-4" />}
              Tester
            </button>
          </div>
          {result.hubdsi && (
            <div className="mt-2 space-y-1">
              <div className={`text-xs rounded px-2 py-1 ${result.hubdsi.success ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                {result.hubdsi.success ? `Connecté — ${result.hubdsi.count} résultat(s), type: ${result.hubdsi.structure}` : `Échec : ${result.hubdsi.error}`}
              </div>
              {result.hubdsi.data && (
                <pre className="bg-gray-100 rounded px-2 py-1 text-xs overflow-x-auto max-h-40 overflow-y-auto">
                  {JSON.stringify(result.hubdsi.data, null, 2).slice(0, 2000)}
                </pre>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function ServiceFormationSection() {
  const [emails, setEmails] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => { load(); }, []);

  async function load() {
    try {
      const { data } = await api.get('/api/v1/admin/service-formation');
      setEmails(data.emails || []);
    } catch {}
  }

  async function handleSearch() {
    if (!searchQuery.trim()) return;
    setSearching(true);
    try {
      const { data } = await api.get('/api/v1/admin/ad/search', { params: { q: searchQuery } });
      setSearchResults(Array.isArray(data) ? data : data.data ?? []);
    } catch {
      setSearchResults([]);
    } finally {
      setSearching(false);
    }
  }

  async function add(email: string) {
    if (emails.includes(email)) return;
    const next = [...emails, email];
    setEmails(next);
    await save(next);
  }

  async function remove(email: string) {
    const next = emails.filter((e) => e !== email);
    setEmails(next);
    await save(next);
  }

  async function save(list: string[]) {
    setSaving(true);
    try {
      await api.put('/api/v1/admin/service-formation', { emails: list });
    } catch {}
    setSaving(false);
  }

  return (
    <div className="bg-white rounded-xl shadow-md p-6">
      <div className="flex items-center gap-2 mb-4">
        <Users className="w-5 h-5 text-blue-700" />
        <h2 className="text-lg font-bold">Service Formation</h2>
        {saving && <Loader className="w-4 h-4 animate-spin text-gray-400" />}
      </div>

      <div className="flex gap-2 mb-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Rechercher un agent dans l'AD (nom, email...)"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            className="w-full border rounded-lg pl-9 pr-3 py-2 text-sm"
          />
        </div>
        <button onClick={handleSearch} disabled={searching || !searchQuery.trim()} className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 disabled:opacity-50 text-sm whitespace-nowrap">
          {searching ? <Loader className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
          Chercher
        </button>
      </div>

      {searchResults.length > 0 && (
        <div className="mb-4 border rounded-lg divide-y max-h-48 overflow-y-auto">
          {searchResults.filter((r) => r.mail || r.email).map((r, i) => {
            const mail = r.mail || r.email || '';
            return (
              <div key={i} className="flex items-center justify-between px-3 py-2 hover:bg-gray-50">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium truncate">{r.displayName || r.cn || r.name || mail}</p>
                  <p className="text-xs text-gray-400 truncate">{mail}</p>
                </div>
                <button
                  onClick={() => add(mail)}
                  disabled={emails.includes(mail)}
                  className={`ml-2 shrink-0 p-1.5 rounded ${emails.includes(mail) ? 'text-gray-300 cursor-not-allowed' : 'text-blue-600 hover:bg-blue-50'}`}
                  title={emails.includes(mail) ? 'Déjà ajouté' : 'Ajouter'}
                >
                  <UserPlus className="w-4 h-4" />
                </button>
              </div>
            );
          })}
        </div>
      )}

      <div className="space-y-1.5 max-h-48 overflow-y-auto">
        {emails.length === 0 && <p className="text-sm text-gray-400 italic">Aucun agent ajouté</p>}
        {emails.map((mail) => (
          <div key={mail} className="border rounded-lg px-3 py-2 flex items-center justify-between">
            <div className="flex items-center gap-2 min-w-0">
              <Mail className="w-3.5 h-3.5 text-gray-400 shrink-0" />
              <span className="text-sm truncate">{mail}</span>
            </div>
            <button onClick={() => remove(mail)} className="text-red-500 hover:text-red-700 ml-2 shrink-0">
              <UserMinus className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function Parametrage() {
  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="flex items-center gap-2 mb-6">
        <Settings className="w-6 h-6 text-blue-700" />
        <h1 className="text-2xl font-bold">Paramétrage</h1>
      </div>

      <div className="grid grid-cols-2 gap-6 mb-6">
        <FormationsSection />
        <AxesSection />
      </div>

      <div className="mb-6">
        <ServiceFormationSection />
      </div>

      <ApiConfigSection />
    </div>
  );
}
