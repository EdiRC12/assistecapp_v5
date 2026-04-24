import React from 'react';
import { logRuntimeError } from '../../services/diagnosticService';
import { AlertTriangle, RefreshCw, ChevronDown, ChevronUp } from 'lucide-react';

/**
 * Error Boundary Component (Shielding)
 * Isolates component failures to prevent the entire app from crashing.
 * Automatically logs technical errors to the diagnostic history.
 */
class ErrorBoundaryClass extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null, showDetails: false };
  }

  static getDerivedStateFromError(error) {
    // Update state so the next render will show the fallback UI.
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    this.setState({ errorInfo });
    
    // Silent logging to Supabase
    const { currentUser } = this.props;
    logRuntimeError({
      name: error.name,
      message: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
      userId: currentUser?.id,
      userEmail: currentUser?.email,
      metadata: {
        component: this.props.componentName || 'Unknown Component',
        url: window.location.href,
        timestamp: new Date().toISOString()
      }
    }).catch(e => console.error("Falha ao enviar log de erro:", e));

    // Optional: Notify via UI hook if provided
    if (this.props.notifyError) {
      this.props.notifyError(
        'Falha no Componente',
        `Ocorreu um erro inesperado em ${this.props.componentName || 'uma parte do sistema'}. O log técnico foi salvo.`
      );
    }

    console.error(`[ErrorBoundary] Erro capturado em ${this.props.componentName}:`, error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="p-8 m-4 bg-white border-2 border-red-100 rounded-2xl shadow-sm animate-fade flex flex-col items-center justify-center min-h-[300px]">
          <div className="flex flex-col items-center text-center gap-4">
            <div className="p-4 bg-red-50 text-red-600 rounded-full animate-pulse">
              <AlertTriangle size={40} />
            </div>
            
            <h2 className="text-xl font-bold text-slate-800">Ops! Algo deu errado aqui.</h2>
            <p className="text-slate-500 max-w-md text-sm">
                Este módulo encontrou um erro inesperado. O restante do aplicativo continua funcionando normalmente e nossa equipe técnica já foi notificada.
            </p>

            <div className="flex gap-3 mt-2">
              <button
                onClick={() => window.location.reload()}
                className="flex items-center gap-2 px-6 py-2.5 bg-slate-800 text-white text-sm font-semibold rounded-xl hover:bg-slate-700 transition-all shadow-lg active:scale-95"
              >
                <RefreshCw size={16} />
                Recarregar App
              </button>
              
              <button
                onClick={() => this.setState({ hasError: false, error: null, errorInfo: null })}
                className="px-6 py-2.5 bg-white border border-slate-200 text-slate-600 text-sm font-semibold rounded-xl hover:bg-slate-50 transition-all active:scale-95"
              >
                Tentar Recuperar
              </button>
            </div>

            <button 
                onClick={() => this.setState(prev => ({ showDetails: !prev.showDetails }))}
                className="mt-6 flex items-center gap-2 text-[10px] uppercase tracking-wider font-bold text-slate-400 hover:text-slate-600 transition-colors"
            >
                {this.state.showDetails ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                {this.state.showDetails ? 'Ocultar Detalhes Técnicos' : 'Ver Detalhes Técnicos'}
            </button>

            {this.state.showDetails && (
                <div className="mt-4 p-4 bg-slate-50 rounded-lg text-left w-full overflow-hidden border border-slate-200 animate-slide">
                    <p className="text-xs font-mono text-red-600 mb-2 font-bold break-all">
                        {this.state.error?.name}: {this.state.error?.message}
                    </p>
                    <div className="max-h-48 overflow-y-auto custom-scrollbar">
                        <pre className="text-[10px] font-mono text-slate-500 leading-relaxed whitespace-pre-wrap">
                            {this.state.errorInfo?.componentStack}
                        </pre>
                    </div>
                </div>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

/**
 * Functional Wrapper for ErrorBoundaryClass
 * Injects global state and notifications if needed.
 */
export const ErrorBoundary = (props) => {
    return (
        <ErrorBoundaryClass {...props}>
            {props.children}
        </ErrorBoundaryClass>
    );
};

export default ErrorBoundary;
