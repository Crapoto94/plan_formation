import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCircle } from 'lucide-react';
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
      <div className="flex items-center justify-center min-h-screen bg-ivry-navy">
        <div className="bg-white p-10 shadow-2xl text-center max-w-sm w-full mx-4 rounded">
          <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold mb-2">Bienvenue, {welcome.displayName} !</h2>
          <p className="text-gray-500 text-sm">
            {welcome.role === 'admin' ? 'Redirection vers le tableau de bord...' : 'Redirection vers le formulaire...'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-ivry-navy">
      <div className="bg-white shadow-2xl w-full max-w-sm mx-4 overflow-hidden rounded">
        <div className="bg-ivry-navy px-8 py-8 text-center">
          <img
            src="https://ivryetmoi.ivry94.fr/Theme/Img/logo.svg"
            alt="Ivry-sur-Seine"
            className="h-12 mx-auto mb-4 brightness-0 invert"
            onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
          />
          <h1 className="text-white font-bold text-lg leading-tight tracking-wide">
            Plan de formation 2027-2029
          </h1>
          <p className="text-white/50 text-xs mt-1">Ville d'Ivry-sur-Seine</p>
        </div>

        <form onSubmit={handleSubmit} className="px-8 py-6">
          {error && <p className="text-ivry-red text-sm mb-4 text-center">{error}</p>}
          <div className="space-y-3 mb-6">
            <input
              type="text"
              placeholder="Identifiant AD"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full border border-gray-200 px-4 py-2.5 text-sm focus:outline-none focus:border-ivry-navy focus:ring-1 focus:ring-ivry-navy rounded-sm"
              required
            />
            <input
              type="password"
              placeholder="Mot de passe"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full border border-gray-200 px-4 py-2.5 text-sm focus:outline-none focus:border-ivry-navy focus:ring-1 focus:ring-ivry-navy rounded-sm"
              required
            />
          </div>
          <button
            type="submit"
            className="w-full bg-ivry-navy text-white py-2.5 text-sm font-medium hover:bg-ivry-navy-dark transition-colors uppercase tracking-wider rounded-sm"
          >
            Se connecter
          </button>
        </form>
      </div>
    </div>
  );
}
