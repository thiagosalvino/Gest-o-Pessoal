import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Lock, User, LogIn, AlertCircle, Loader2, UserPlus, Calendar, Phone, CreditCard, Mail, ArrowLeft } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { validateCPF } from '../utils';

export const Login: React.FC = () => {
  const [isSignUp, setIsSignUp] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  // Sign up fields
  const [email, setEmail] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [cpf, setCpf] = useState('');
  const [phone, setPhone] = useState('');
  
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { login, signUp, loginWithGoogle } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      if (isSignUp) {
        // Validation
        if (!displayName || !email || !password || !confirmPassword || !birthDate || !cpf || !phone) {
          setError('Todos os campos são obrigatórios.');
          setIsSubmitting(false);
          return;
        }

        if (password !== confirmPassword) {
          setError('As senhas não coincidem.');
          setIsSubmitting(false);
          return;
        }

        // Password strength validation
        const hasUpper = /[A-Z]/.test(password);
        const hasLower = /[a-z]/.test(password);
        const hasNumber = /\d/.test(password);
        const hasSpecial = /[@$!%*?&]/.test(password);
        const isLongEnough = password.length >= 12;

        if (!isLongEnough || !hasUpper || !hasLower || !hasNumber || !hasSpecial) {
          setError('A senha deve ter no mínimo 12 caracteres, letras maiúsculas e minúsculas, números e caracteres especiais.');
          setIsSubmitting(false);
          return;
        }

        if (!validateCPF(cpf)) {
          setError('CPF inválido.');
          setIsSubmitting(false);
          return;
        }
        const cleanPhone = phone.replace(/[^\d]+/g, '');
        if (cleanPhone.length < 11) {
          setError('Celular inválido. Use o formato 64999994444.');
          setIsSubmitting(false);
          return;
        }
        
        await signUp({
          email,
          password,
          displayName,
          birthDate,
          cpf: cpf.replace(/[^\d]+/g, ''),
          phone: cleanPhone
        });
      } else {
        await login(username, password);
      }
    } catch (err: any) {
      const knownErrors = [
        'auth/user-not-found', 
        'auth/wrong-password', 
        'auth/invalid-credential', 
        'auth/email-already-in-use', 
        'auth/cpf-already-in-use', 
        'auth/weak-password'
      ];
      if (!knownErrors.includes(err.code)) {
        console.error(err);
      }
      
      if (err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential') {
        setError('Usuário ou senha incorretos.');
      } else if (err.code === 'auth/email-already-in-use') {
        setError('Este email já está em uso. Se você deletou sua conta anteriormente, tente fazer login para reativá-la ou entre em contato com o suporte.');
      } else if (err.code === 'auth/cpf-already-in-use') {
        setError('Este CPF já está cadastrado.');
      } else if (err.code === 'auth/weak-password') {
        setError('A senha deve ter pelo menos 6 caracteres.');
      } else {
        if (err.message?.startsWith('FIRESTORE_ERROR:')) {
          try {
            const errorData = JSON.parse(err.message.replace('FIRESTORE_ERROR:', ''));
            setError(`Erro no Firestore: ${errorData.error} (Operação: ${errorData.operationType}, Caminho: ${errorData.path})`);
          } catch (e) {
            setError('Ocorreu um erro no Firestore. Tente novamente.');
          }
        } else {
          setError('Ocorreu um erro. Tente novamente.');
        }
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGoogleLogin = async () => {
    setError(null);
    setIsSubmitting(true);
    try {
      await loginWithGoogle();
    } catch (err: any) {
      console.error(err);
      setError('Erro ao entrar com Google.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md"
      >
        <div className="bg-white rounded-3xl shadow-xl border border-slate-200 overflow-hidden">
          <div className="p-8 pb-6 text-center">
            <div className="flex items-center justify-center gap-4 mb-6">
              <div className="w-16 h-16 bg-orange-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-orange-200 shrink-0">
                {isSignUp ? <UserPlus size={32} /> : <Lock size={32} />}
              </div>
              <h1 className="text-3xl font-black tracking-tight flex items-center">
                <span className="text-slate-900">Organize</span>
                <span className="text-orange-600">App</span>
              </h1>
            </div>
            <p className="text-slate-500">
              {isSignUp ? 'Crie sua conta para começar' : 'Acesse sua conta para continuar'}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="p-8 pt-0 space-y-4">
            {error && (
              <motion.div 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="p-4 bg-red-50 border border-red-100 rounded-2xl flex items-center gap-3 text-red-600 text-sm"
              >
                <AlertCircle size={18} />
                {error}
              </motion.div>
            )}

            <AnimatePresence mode="wait">
              {!isSignUp ? (
                <motion.div
                  key="login-fields"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  className="space-y-4"
                >
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-400 uppercase ml-1">Usuário / Email</label>
                    <div className="relative">
                      <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
                        <User size={20} />
                      </div>
                      <input 
                        type="text"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        placeholder="Seu usuário ou email"
                        className="w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-orange-500 focus:bg-white transition-all font-medium"
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-400 uppercase ml-1">Senha</label>
                    <div className="relative">
                      <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
                        <Lock size={20} />
                      </div>
                      <input 
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Sua senha"
                        className="w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-orange-500 focus:bg-white transition-all font-medium"
                        required
                      />
                    </div>
                  </div>
                </motion.div>
              ) : (
                <motion.div
                  key="signup-fields"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="space-y-4"
                >
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-400 uppercase ml-1">Nome Completo</label>
                    <div className="relative">
                      <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
                        <User size={20} />
                      </div>
                      <input 
                        type="text"
                        value={displayName}
                        onChange={(e) => setDisplayName(e.target.value)}
                        placeholder="Seu nome completo"
                        className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-orange-500 focus:bg-white transition-all font-medium text-sm"
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-400 uppercase ml-1">Email</label>
                    <div className="relative">
                      <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
                        <Mail size={20} />
                      </div>
                      <input 
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="seu@email.com"
                        className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-orange-500 focus:bg-white transition-all font-medium text-sm"
                        required
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-slate-400 uppercase ml-1">Senha</label>
                      <div className="relative">
                        <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
                          <Lock size={18} />
                        </div>
                        <input 
                          type="password"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          placeholder="******"
                          className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-orange-500 focus:bg-white transition-all font-medium text-sm"
                          required
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-slate-400 uppercase ml-1">Confirmar Senha</label>
                      <div className="relative">
                        <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
                          <Lock size={18} />
                        </div>
                        <input 
                          type="password"
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          placeholder="******"
                          className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-orange-500 focus:bg-white transition-all font-medium text-sm"
                          required
                        />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-400 uppercase ml-1">Nascimento</label>
                    <div className="relative">
                      <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
                        <Calendar size={18} />
                      </div>
                      <input 
                        type="date"
                        value={birthDate}
                        onChange={(e) => setBirthDate(e.target.value)}
                        className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-orange-500 focus:bg-white transition-all font-medium text-sm"
                        required
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-slate-400 uppercase ml-1">CPF</label>
                      <div className="relative">
                        <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
                          <CreditCard size={18} />
                        </div>
                        <input 
                          type="text"
                          maxLength={11}
                          value={cpf}
                          onChange={(e) => setCpf(e.target.value.replace(/[^\d]+/g, ''))}
                          placeholder="000.000.000-00"
                          className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-orange-500 focus:bg-white transition-all font-medium text-sm"
                          required
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-slate-400 uppercase ml-1">Celular</label>
                      <div className="relative">
                        <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
                          <Phone size={18} />
                        </div>
                        <input 
                          type="text"
                          maxLength={11}
                          value={phone}
                          onChange={(e) => setPhone(e.target.value.replace(/[^\d]+/g, '').slice(0, 11))}
                          placeholder="64999994444"
                          className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-orange-500 focus:bg-white transition-all font-medium text-sm"
                          required
                        />
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <button 
              type="submit"
              disabled={isSubmitting}
              className="w-full py-4 bg-orange-600 hover:bg-orange-700 text-white rounded-2xl font-bold shadow-lg shadow-orange-200 transition-all flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed mt-4"
            >
              {isSubmitting ? (
                <Loader2 size={20} className="animate-spin" />
              ) : (
                <>
                   {isSignUp ? <UserPlus size={20} /> : <LogIn size={20} />}
                   {isSignUp ? 'Criar Minha Conta' : 'Entrar no Sistema'}
                </>
              )}
            </button>

            {!isSignUp && (
              <>
                <div className="relative my-6">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-slate-200"></div>
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-white px-2 text-slate-400 font-bold">Ou continue com</span>
                  </div>
                </div>

                <button 
                  type="button"
                  onClick={handleGoogleLogin}
                  disabled={isSubmitting}
                  className="w-full py-4 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-2xl font-bold transition-all flex items-center justify-center gap-3 disabled:opacity-70 disabled:cursor-not-allowed"
                >
                  <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google" className="w-5 h-5" />
                  Entrar com Google
                </button>
              </>
            )}

            <div className="text-center mt-6">
              <button
                type="button"
                onClick={() => {
                  setIsSignUp(!isSignUp);
                  setError(null);
                }}
                className="text-sm font-bold text-orange-600 hover:text-orange-700 transition-colors flex items-center justify-center gap-2 mx-auto"
              >
                {isSignUp ? (
                  <>
                    <ArrowLeft size={16} />
                    Já tenho uma conta. Fazer Login
                  </>
                ) : (
                  <>
                    Não tem uma conta? <span className="underline">Cadastre-se</span>
                  </>
                )}
              </button>
            </div>
          </form>

          <div className="p-6 bg-slate-50 border-t border-slate-100 text-center">
            <p className="text-xs text-slate-400">
              © 2026 OrganizeApp - Gerenciamento Pessoal
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
};
