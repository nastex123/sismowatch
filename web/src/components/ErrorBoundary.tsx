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
        <div className="min-h-screen bg-black flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-zinc-950 border border-zinc-900 rounded p-6 text-center shadow-2xl">
            <div className="w-10 h-10 rounded border border-rose-500/40 bg-black flex items-center justify-center mx-auto mb-4">
              <AlertOctagon className="w-5 h-5 text-rose-500" />
            </div>
            <h2 className="text-base font-mono font-bold text-white mb-1 uppercase tracking-wide">Recuperación de Plataforma</h2>
            <p className="text-[11px] text-zinc-500 mb-4 font-mono">
              Se detectó una discrepancia en el estado de la interfaz:
            </p>
            <div className="bg-black border border-zinc-900 rounded p-3 text-[11px] font-mono text-rose-400 text-left mb-6 overflow-auto max-h-32 border-l-2 border-rose-500">
              {this.state.error?.message || 'Error de renderizado desconocido'}
            </div>
            <button
              onClick={this.handleReset}
              className="w-full py-2.5 px-4 rounded bg-rose-600 hover:bg-rose-500 text-white font-mono font-bold text-xs flex items-center justify-center gap-2 transition-all press-action"
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
