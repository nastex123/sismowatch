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
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-6 lg:p-8 shadow-2xl relative">
        <div className="flex flex-col items-center text-center mb-6">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-400 flex items-center justify-center shadow-lg shadow-emerald-500/20 mb-3">
            <Activity className="w-7 h-7 text-white" />
          </div>
          <h2 className="text-xl font-bold text-white tracking-tight">Acceso a SismoWatch</h2>
          <p className="text-xs text-slate-400 mt-1">
            Plataforma protegida con autenticación JWT y control de roles RBAC
          </p>
        </div>

        {/* Acceso Rápido para Evaluadores */}
        <div className="mb-6 p-3 bg-slate-950 rounded-xl border border-slate-800 text-xs">
          <span className="text-[11px] font-mono uppercase text-slate-400 block mb-2 font-bold text-center">
            Perfiles de Prueba Rápidos:
          </span>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => handleQuickFill('admin')}
              className="py-1.5 px-2 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center gap-1.5 font-medium transition-colors"
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Rol Admin</span>
            </button>
            <button
              type="button"
              onClick={() => handleQuickFill('viewer')}
              className="py-1.5 px-2 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center gap-1.5 font-medium transition-colors"
            >
              <UserCheck className="w-3.5 h-3.5" />
              <span>Rol Viewer</span>
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          <div>
            <label className="block text-slate-400 mb-1 font-medium">Correo Electrónico:</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="usuario@sismowatch.internal"
              required
              className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500 font-mono"
            />
          </div>

          <div>
            <label className="block text-slate-400 mb-1 font-medium">Contraseña:</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••••••"
              required
              className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500 font-mono"
            />
          </div>

          {error && (
            <div className="p-2.5 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold transition-colors flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/20"
          >
            <Lock className="w-3.5 h-3.5" />
            <span>{loading ? 'Validando...' : 'Iniciar Sesión'}</span>
          </button>
        </form>
      </div>
    </div>
  );
};
