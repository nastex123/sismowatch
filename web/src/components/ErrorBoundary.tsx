import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertOctagon, RotateCcw } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error caught by ErrorBoundary:', error, errorInfo);
  }

  private handleReset = () => {
    localStorage.removeItem('sismowatch_session');
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-2xl p-6 text-center shadow-2xl">
            <div className="w-12 h-12 rounded-xl bg-rose-500/20 text-rose-400 border border-rose-500/30 flex items-center justify-center mx-auto mb-4">
              <AlertOctagon className="w-6 h-6" />
            </div>
            <h2 className="text-lg font-bold text-white mb-1">Recuperación de Plataforma</h2>
            <p className="text-xs text-slate-400 mb-4">
              Se detectó una discrepancia en el estado de la interfaz:
            </p>
            <div className="bg-slate-950 border border-slate-800 rounded-lg p-3 text-[11px] font-mono text-rose-300 text-left mb-6 overflow-auto max-h-32">
              {this.state.error?.message || 'Error de renderizado desconocido'}
            </div>
            <button
              onClick={this.handleReset}
              className="w-full py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center justify-center gap-2 transition-colors shadow-lg shadow-emerald-600/20"
            >
              <RotateCcw className="w-4 h-4" />
              <span>Restablecer Sesión y Recargar</span>
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
