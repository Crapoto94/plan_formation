import { useEffect, useState } from 'react';
import { Plus, Pencil, Trash2, Check, X, BookOpen } from 'lucide-react';
import api from '../api/axios';
import type { Formation } from '../types';

export default function AdminFormations() {
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
    <div className="max-w-3xl mx-auto p-6">
      <div className="flex items-center gap-2 mb-6">
        <BookOpen className="w-6 h-6 text-blue-700" />
        <h1 className="text-2xl font-bold">Gestion des formations réglementaires</h1>
      </div>

      <div className="bg-white rounded-xl shadow-md p-6 mb-6">
        <h2 className="font-semibold mb-3">{editingId ? 'Modifier' : 'Ajouter'} une formation</h2>
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
        {formations.map((f) => (
          <div key={f.id} className="bg-white rounded-lg shadow-sm border p-4 flex items-center justify-between">
            <div>
              <p className="font-medium">{f.libelle}</p>
              {f.description && <p className="text-sm text-gray-500">{f.description}</p>}
              <span className={`text-xs px-2 py-0.5 rounded ${f.active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                {f.active ? 'Actif' : 'Inactif'}
              </span>
            </div>
            <div className="flex gap-2">
              <button onClick={() => startEdit(f)} className="text-blue-600 hover:text-blue-800"><Pencil className="w-4 h-4" /></button>
              <button onClick={() => remove(f.id)} className="text-red-600 hover:text-red-800"><Trash2 className="w-4 h-4" /></button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
