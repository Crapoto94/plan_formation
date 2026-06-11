import { useEffect, useState } from 'react';
import { Plus, Pencil, Trash2, Check, X, Target } from 'lucide-react';
import api from '../api/axios';
import type { Axe } from '../types';

export default function AdminAxes() {
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
    <div className="max-w-3xl mx-auto p-6">
      <div className="flex items-center gap-2 mb-6">
        <Target className="w-6 h-6 text-blue-700" />
        <h1 className="text-2xl font-bold">Gestion des axes de formation</h1>
      </div>

      <div className="bg-white rounded-xl shadow-md p-6 mb-6">
        <h2 className="font-semibold mb-3">{editingId ? 'Modifier' : 'Ajouter'} un axe</h2>
        <div className="flex gap-3">
          <input
            type="text"
            placeholder="Libellé"
            value={form.libelle}
            onChange={(e) => setForm({ ...form, libelle: e.target.value })}
            className="flex-1 border rounded-lg px-3 py-2"
          />
          <input
            type="text"
            placeholder="Description (optionnelle)"
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            className="flex-1 border rounded-lg px-3 py-2"
          />
          {editingId ? (
            <>
              <button onClick={() => update(editingId)} className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700">
                <Check className="w-4 h-4" />
              </button>
              <button onClick={cancelEdit} className="bg-gray-400 text-white px-4 py-2 rounded-lg hover:bg-gray-500">
                <X className="w-4 h-4" />
              </button>
            </>
          ) : (
            <button onClick={create} className="bg-blue-700 text-white px-4 py-2 rounded-lg hover:bg-blue-800">
              <Plus className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      <div className="space-y-2">
        {axes.map((a) => (
          <div key={a.id} className="bg-white rounded-lg shadow-sm border p-4 flex items-center justify-between">
            <div>
              <p className="font-medium">{a.libelle}</p>
              {a.description && <p className="text-sm text-gray-500">{a.description}</p>}
              <span className={`text-xs px-2 py-0.5 rounded ${a.active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                {a.active ? 'Actif' : 'Inactif'}
              </span>
            </div>
            <div className="flex gap-2">
              <button onClick={() => startEdit(a)} className="text-blue-600 hover:text-blue-800"><Pencil className="w-4 h-4" /></button>
              <button onClick={() => remove(a.id)} className="text-red-600 hover:text-red-800"><Trash2 className="w-4 h-4" /></button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
