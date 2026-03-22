import React from 'react';
import { AlertCircle, RefreshCw, Home } from 'lucide-react';
import { motion } from 'motion/react';

interface Props {
  children: React.ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends (React.Component as any) {
  constructor(props: any) {
    super(props);
    this.state = {
      hasError: false,
      error: null
    };
  }

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      let errorMessage = 'Ocorreu um erro inesperado no aplicativo.';
      let isFirestoreError = false;

      if (this.state.error?.message.startsWith('FIRESTORE_ERROR:')) {
        isFirestoreError = true;
        try {
          const errorData = JSON.parse(this.state.error.message.replace('FIRESTORE_ERROR:', ''));
          if (errorData.error.includes('Missing or insufficient permissions')) {
            errorMessage = 'Você não tem permissão para realizar esta ação ou acessar estes dados.';
          } else {
            errorMessage = `Erro no banco de dados: ${errorData.error}`;
          }
        } catch (e) {
          errorMessage = 'Erro de comunicação com o banco de dados.';
        }
      }

      return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white p-8 rounded-3xl shadow-xl max-w-md w-full text-center border border-slate-100"
          >
            <div className="flex justify-center mb-6">
              <div className="p-4 bg-red-50 rounded-2xl text-red-500">
                <AlertCircle size={48} />
              </div>
            </div>
            <h2 className="text-2xl font-black text-slate-800 mb-3">Ops! Algo deu errado</h2>
            <p className="text-slate-500 font-medium mb-8 leading-relaxed">
              {errorMessage}
            </p>
            
            <div className="flex flex-col gap-3">
              <button
                onClick={this.handleReset}
                className="w-full flex items-center justify-center gap-2 px-6 py-3.5 bg-orange-600 hover:bg-orange-700 text-white rounded-2xl font-bold transition-all shadow-lg hover:shadow-xl"
              >
                <RefreshCw size={20} />
                Tentar Novamente
              </button>
              
              <button
                onClick={() => window.location.href = '/'}
                className="w-full flex items-center justify-center gap-2 px-6 py-3.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-2xl font-bold transition-all"
              >
                <Home size={20} />
                Voltar ao Início
              </button>
            </div>

            {isFirestoreError && (
              <p className="mt-6 text-[10px] text-slate-400 font-mono uppercase tracking-widest">
                Erro de Permissão Detectado
              </p>
            )}
          </motion.div>
        </div>
      );
    }

    return this.props.children;
  }
}
