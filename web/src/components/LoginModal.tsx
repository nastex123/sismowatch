import React, { useState } from 'react';
import { Activity, ShieldCheck, UserCheck, AlertCircle, Lock } from 'lucide-react';
import { apiService } from '../services/api';
import { UserSession } from '../types';

interface LoginModalProps {
  onLoginSuccess: (session: UserSession) => void;
}

export const LoginModal: React.FC<LoginModalProps> = ({ onLoginSuccess }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const session = await apiService.login(email, password);
      onLoginSuccess(session);
    } catch (err: any) {
      setError(err.message || 'Error de autenticación');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickFill = (role: 'admin' | 'viewer') => {
    if (role === 'admin') {
      setEmail('admin@sismowatch.internal');
      setPassword('SismoAdmin2026!');
    } else {
      setEmail('viewer@sismowatch.internal');
      setPassword('SismoViewer2026!');
    }
    setError(null);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-zinc-950 border border-zinc-900 rounded p-6 lg:p-8 shadow-2xl relative">
        <div className="flex flex-col items-center text-center mb-6">
          <div className="w-10 h-10 rounded border border-rose-500/40 bg-black flex items-center justify-center mb-3">
            <Activity className="w-5 h-5 text-rose-400" />
          </div>
          <h2 className="text-lg font-mono font-bold text-white tracking-wide uppercase">Acceso a SismoWatch</h2>
          <p className="text-[11px] text-zinc-500 font-mono mt-1">
            Plataforma protegida con autenticación JWT y control de roles RBAC
          </p>
        </div>

        {/* Acceso Rápido para Evaluadores */}
        <div className="mb-6 p-3 bg-black rounded border border-zinc-900 text-xs font-mono">
          <span className="text-[10px] uppercase text-zinc-500 block mb-2 font-bold text-center">
            Perfiles de Prueba Rápidos:
          </span>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => handleQuickFill('admin')}
              className="py-1.5 px-2 rounded bg-zinc-900/60 hover:bg-zinc-900 text-zinc-300 hover:text-white border border-zinc-850 hover:border-zinc-700 flex items-center justify-center gap-1.5 font-medium transition-all press-action"
            >
              <ShieldCheck className="w-3.5 h-3.5 text-rose-400" />
              <span>Rol Admin</span>
            </button>
            <button
              type="button"
              onClick={() => handleQuickFill('viewer')}
              className="py-1.5 px-2 rounded bg-zinc-900/60 hover:bg-zinc-900 text-zinc-300 hover:text-white border border-zinc-850 hover:border-zinc-700 flex items-center justify-center gap-1.5 font-medium transition-all press-action"
            >
              <UserCheck className="w-3.5 h-3.5 text-zinc-400" />
              <span>Rol Viewer</span>
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 text-xs font-mono">
          <div>
            <label className="block text-zinc-400 mb-1">Correo Electrónico:</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="usuario@sismowatch.internal"
              required
              className="w-full bg-black border border-zinc-850 rounded p-2.5 text-white placeholder-zinc-700 focus:outline-none focus:border-rose-500/80 font-mono"
            />
          </div>

          <div>
            <label className="block text-zinc-400 mb-1">Contraseña:</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••••••"
              required
              className="w-full bg-black border border-zinc-850 rounded p-2.5 text-white placeholder-zinc-700 focus:outline-none focus:border-rose-500/80 font-mono"
            />
          </div>

          {error && (
            <div className="p-2.5 border-b border-rose-500 text-rose-400 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 px-4 rounded bg-rose-600 hover:bg-rose-500 disabled:opacity-50 text-white font-mono font-bold transition-all press-action flex items-center justify-center gap-2"
          >
            <Lock className="w-3.5 h-3.5" />
            <span>{loading ? 'Validando...' : 'Iniciar Sesión'}</span>
          </button>
        </form>
      </div>
    </div>
  );
};
