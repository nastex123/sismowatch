import React from 'react';
import { Activity, Shield, LogOut, FileText, Database, LayoutDashboard } from 'lucide-react';
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
}) => {
  return (
    <header className="sticky top-0 z-50 bg-black/95 backdrop-blur-md border-b border-zinc-900 px-4 lg:px-8 py-3">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
        {/* Brand */}
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded border border-rose-500/40 bg-zinc-950 flex items-center justify-center press-action">
            <Activity className="w-4 h-4 text-rose-400" />
          </div>
          <div>
            <div className="flex items-baseline">
              <span className="font-bold text-base text-zinc-100 tracking-tight">SismoWatch</span>
              <span className="text-[10px] uppercase font-mono text-rose-400 border-b border-rose-500/60 pb-0.5 ml-2.5 tracking-wider">
                Medallón S3
              </span>
            </div>
            <p className="text-[11px] text-zinc-500 hidden sm:block font-mono">Centro de Monitoreo Sísmico Global</p>
          </div>
        </div>

        {/* Navigation Tabs - Estilo Terminal Minimalista (Sin cajas redondeadas) */}
        <nav className="flex items-center gap-6">
          <button
            onClick={() => setActiveTab('dashboard')}
            className={`flex items-center gap-2 py-2 text-xs font-mono transition-all press-action border-b-2 ${
              activeTab === 'dashboard'
                ? 'border-rose-500 text-white font-bold'
                : 'border-transparent text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <LayoutDashboard className="w-3.5 h-3.5" />
            <span>Dashboard</span>
          </button>
          <button
            onClick={() => setActiveTab('reports')}
            className={`flex items-center gap-2 py-2 text-xs font-mono transition-all press-action border-b-2 ${
              activeTab === 'reports'
                ? 'border-rose-500 text-white font-bold'
                : 'border-transparent text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Reportes IA</span>
          </button>
          <button
            onClick={() => setActiveTab('pipeline')}
            className={`flex items-center gap-2 py-2 text-xs font-mono transition-all press-action border-b-2 ${
              activeTab === 'pipeline'
                ? 'border-rose-500 text-white font-bold'
                : 'border-transparent text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Database className="w-3.5 h-3.5" />
            <span>Pipeline & Calidad</span>
          </button>
        </nav>

        {/* Status Live & User Profile */}
        <div className="flex items-center gap-4">
          {/* Live SSE Telemetría Directa */}
          <div className="flex items-center gap-2 text-xs font-mono">
            <span className="relative flex h-2 w-2">
              {isLiveConnected && (
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
              )}
              <span className={`relative inline-flex rounded-full h-2 w-2 ${isLiveConnected ? 'bg-rose-500' : 'bg-zinc-600'}`}></span>
            </span>
            <span className={`text-[11px] font-mono ${isLiveConnected ? 'text-zinc-200' : 'text-zinc-500'} hidden xl:inline`}>
              {isLiveConnected ? 'EN VIVO' : 'RECONECTANDO'}
            </span>
            {lastLiveUpdate && (
              <span className="text-[10px] text-zinc-500 hidden sm:inline">
                {new Date(lastLiveUpdate).toLocaleTimeString()}
              </span>
            )}
          </div>

          {/* User Profile */}
          <div className="flex items-center gap-3 pl-3 border-l border-zinc-850">
            <div className="hidden lg:block text-right">
              <div className="text-xs font-medium text-zinc-200 truncate max-w-[140px]">{session.full_name}</div>
              <div className="flex items-center justify-end gap-1 text-[10px] uppercase font-mono">
                <Shield className="w-2.5 h-2.5 text-rose-400" />
                <span className="border-b border-zinc-700 text-zinc-400 pb-0.5">
                  {session.role}
                </span>
              </div>
            </div>
            <button
              onClick={onLogout}
              title="Cerrar Sesión"
              className="p-1.5 rounded text-zinc-400 hover:text-rose-400 border border-zinc-850 hover:border-rose-500/40 transition-all press-action"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};
