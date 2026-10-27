import React from 'react';
import { Activity, Radio, Shield, LogOut, FileText, Database, LayoutDashboard } from 'lucide-react';
import { UserSession } from '../types';

interface NavbarProps {
  session: UserSession;
  activeTab: 'dashboard' | 'reports' | 'pipeline';
  setActiveTab: (tab: 'dashboard' | 'reports' | 'pipeline') => void;
  isLiveConnected: boolean;
  lastLiveUpdate: string | null;
  onLogout: () => void;
  onOpenChat: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  session,
  activeTab,
  setActiveTab,
  isLiveConnected,
  lastLiveUpdate,
  onLogout,
  onOpenChat
}) => {
  return (
    <header className="sticky top-0 z-40 bg-slate-900/90 backdrop-blur-md border-b border-slate-800 px-4 lg:px-8 py-3">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
        {/* Brand */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-400 flex items-center justify-center shadow-lg shadow-emerald-500/20">
            <Activity className="w-6 h-6 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-lg text-white tracking-wide">SismoWatch</span>
              <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">Medallón</span>
            </div>
            <p className="text-xs text-slate-400 hidden sm:block">Centro Global de Operaciones y Riesgo</p>
          </div>
        </div>

        {/* Navigation Tabs */}
        <nav className="flex items-center gap-1 bg-slate-950/60 p-1 rounded-xl border border-slate-800/80">
          <button
            onClick={() => setActiveTab('dashboard')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              activeTab === 'dashboard'
                ? 'bg-slate-800 text-emerald-400 shadow-sm border border-slate-700/60'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
            }`}
          >
            <LayoutDashboard className="w-3.5 h-3.5" />
            <span className="hidden md:inline">Dashboard</span>
          </button>
          <button
            onClick={() => setActiveTab('reports')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              activeTab === 'reports'
                ? 'bg-slate-800 text-emerald-400 shadow-sm border border-slate-700/60'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span className="hidden md:inline">Reportes IA</span>
          </button>
          <button
            onClick={() => setActiveTab('pipeline')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              activeTab === 'pipeline'
                ? 'bg-slate-800 text-emerald-400 shadow-sm border border-slate-700/60'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
            }`}
          >
            <Database className="w-3.5 h-3.5" />
            <span className="hidden md:inline">Pipeline & Calidad</span>
          </button>
        </nav>

        {/* Status Live & User Profile */}
        <div className="flex items-center gap-3">
          {/* Live SSE Indicator */}
          <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-slate-950/80 border border-slate-800 text-xs font-mono">
            <span className="relative flex h-2.5 w-2.5">
              {isLiveConnected && (
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              )}
              <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${isLiveConnected ? 'bg-emerald-500' : 'bg-rose-500'}`}></span>
            </span>
            <span className="text-slate-300 hidden xl:inline">{isLiveConnected ? 'EN VIVO' : 'RECONECTANDO'}</span>
            {lastLiveUpdate && (
              <span className="text-[11px] text-slate-500 hidden sm:inline">
                {new Date(lastLiveUpdate).toLocaleTimeString()}
              </span>
            )}
          </div>

          {/* User Profile */}
          <div className="flex items-center gap-2 pl-2 border-l border-slate-800">
            <div className="hidden lg:block text-right">
              <div className="text-xs font-semibold text-slate-200 truncate max-w-[140px]">{session.full_name}</div>
              <div className="flex items-center justify-end gap-1 text-[10px] uppercase font-mono">
                <Shield className="w-2.5 h-2.5 text-emerald-400" />
                <span className={session.role === 'admin' ? 'text-amber-400 font-bold' : 'text-slate-400'}>
                  {session.role}
                </span>
              </div>
            </div>
            <button
              onClick={onLogout}
              title="Cerrar Sesión"
              className="p-2 rounded-lg bg-slate-800/80 hover:bg-rose-500/20 text-slate-400 hover:text-rose-400 border border-slate-700/60 transition-colors"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};
