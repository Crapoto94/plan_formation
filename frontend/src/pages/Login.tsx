import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { LogIn, CheckCircle } from 'lucide-react';
import api from '../api/axios';

export default function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [welcome, setWelcome] = useState<{ displayName: string; role: string } | null>(null);
  const navigate = useNavigate();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    try {
      const { data } = await api.post('/api/v1/auth/login', { username, password });
      const { token, user } = data;
      localStorage.setItem('token', token);
      localStorage.setItem('role', user.role);
      localStorage.setItem('displayName', user.displayName || user.username);
      setWelcome({ displayName: user.displayName || user.username, role: user.role });
      setTimeout(() => {
        navigate(user.role === 'admin' ? '/traitement' : '/collecte');
      }, 2000);
    } catch {
      setError('Identifiants invalides');
    }
  }

  if (welcome) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-blue-700 to-indigo-900">
        <div className="bg-white p-10 rounded-2xl shadow-2xl text-center">
          <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold mb-2">Bienvenue, {welcome.displayName} !</h2>
          <p className="text-gray-500">
            {welcome.role === 'admin' ? 'Redirection vers le tableau de bord...' : 'Redirection vers le formulaire...'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-blue-700 to-indigo-900">
      <form onSubmit={handleSubmit} className="bg-white p-8 rounded-2xl shadow-2xl w-96">
        <div className="flex justify-center mb-6">
          <LogIn className="w-12 h-12 text-blue-700" />
        </div>
        <h1 className="text-2xl font-bold text-center mb-2">Plan de Formation</h1>
        <p className="text-sm text-gray-500 text-center mb-6">Ville d'Ivry-sur-Seine</p>
        {error && <p className="text-red-600 text-sm mb-4 text-center">{error}</p>}
        <input
          type="text"
          placeholder="Identifiant AD"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          className="w-full border rounded-lg px-4 py-2 mb-4 focus:outline-none focus:ring-2 focus:ring-blue-500"
          required
        />
        <input
          type="password"
          placeholder="Mot de passe"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full border rounded-lg px-4 py-2 mb-6 focus:outline-none focus:ring-2 focus:ring-blue-500"
          required
        />
        <button type="submit" className="w-full bg-blue-700 text-white py-2 rounded-lg hover:bg-blue-800 transition">
          Se connecter
        </button>
      </form>
    </div>
  );
}
