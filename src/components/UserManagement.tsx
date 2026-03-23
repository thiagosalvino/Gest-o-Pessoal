import React, { useState, useEffect } from 'react';
import { 
  Users, 
  Mail, 
  Calendar, 
  Clock, 
  User as UserIcon,
  Search,
  ChevronRight,
  Shield,
  Check,
  X,
  Trash2,
  Ban,
  UserMinus,
  MoreVertical,
  AlertCircle,
  RefreshCw,
  Key,
  Lock
} from 'lucide-react';
import { collection, onSnapshot, query, orderBy, doc, updateDoc, deleteDoc, setDoc, getDoc, getDocs, where, writeBatch } from 'firebase/firestore';
import { sendPasswordResetEmail } from 'firebase/auth';
import { db, auth } from '../firebase';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { motion } from 'motion/react';
import { handleFirestoreError, OperationType } from '../utils/firestoreErrorHandler';
import { sanitizeFirestoreData } from '../utils';

interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  birthDate?: string;
  cpf?: string;
  phone?: string;
  createdAt?: string;
  lastLogin?: string;
  role: string;
  status?: 'pending' | 'approved' | 'rejected' | 'blocked' | 'inactive';
  authProvider?: 'password' | 'google';
}

interface UserManagementProps {
  showToast: (message: string, type?: 'success' | 'error') => void;
}

export const UserManagement = ({ showToast }: UserManagementProps) => {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [confirmResetId, setConfirmResetId] = useState<string | null>(null);
  const [resettingId, setResettingId] = useState<string | null>(null);

  useEffect(() => {
    const q = query(collection(db, 'users'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const usersData = snapshot.docs.map(doc => ({
        uid: doc.id,
        ...doc.data()
      })) as UserProfile[];
      setUsers(usersData);
      setLoading(false);
      setError(null);

      // Automatic CPF synchronization in background
      usersData.forEach(async (user) => {
        if (user.cpf) {
          const cleanCpf = user.cpf.replace(/[^\d]+/g, '');
          if (cleanCpf) {
            try {
              const cpfDoc = await getDoc(doc(db, 'cpfs', cleanCpf));
              if (!cpfDoc.exists() || cpfDoc.data()?.uid !== user.uid) {
                await setDoc(doc(db, 'cpfs', cleanCpf), { uid: user.uid });
              }
            } catch (e) {
              console.error('Error auto-syncing CPF:', e);
            }
          }
        }
      });
    }, (err) => {
      handleFirestoreError(err, OperationType.LIST, 'users');
    });

    return unsubscribe;
  }, []);

  const filteredUsers = users.filter(user => 
    user.displayName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.cpf?.includes(searchTerm.replace(/[^\d]+/g, ''))
  );

  const handleStatusUpdate = async (uid: string, newStatus: 'approved' | 'rejected' | 'blocked' | 'inactive') => {
    try {
      await updateDoc(doc(db, 'users', uid), { status: newStatus });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${uid}`);
    }
  };

  const handleRemoveUser = async (uid: string) => {
    setDeletingId(uid);
    try {
      const userToRemove = users.find(u => u.uid === uid);
      
      // 1. Delete CPF record
      if (userToRemove?.cpf) {
        const cleanCpf = userToRemove.cpf.replace(/[^\d]+/g, '');
        if (cleanCpf) {
          await deleteDoc(doc(db, 'cpfs', cleanCpf));
        }
      }

      // 2. Delete all user data from other collections (where userId is a field)
      const collectionsToClean = [
        'pomodoroSessions',
        'projects',
        'goals',
        'tasks',
        'diet',
        'training',
        'standardAlerts',
        'appointments'
      ];

      for (const colName of collectionsToClean) {
        const q = query(collection(db, colName), where('userId', '==', uid));
        const snapshot = await getDocs(q);
        const batch = writeBatch(db);
        snapshot.docs.forEach((doc) => {
          batch.delete(doc.ref);
        });
        await batch.commit();
      }

      // 3. Delete user profile and settings (where doc ID is uid)
      await deleteDoc(doc(db, 'settings', uid));
      await deleteDoc(doc(db, 'users', uid));
      
      showToast('Usuário e todos os seus dados foram excluídos com sucesso.');
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `users/${uid}`);
      showToast('Erro ao excluir usuário e seus dados. Verifique o console.', 'error');
    } finally {
      setDeletingId(null);
    }
  };

  const handleResetPassword = async (uid: string) => {
    const userToReset = users.find(u => u.uid === uid);
    if (!userToReset?.email) return;

    setResettingId(uid);
    try {
      await sendPasswordResetEmail(auth, userToReset.email);
      showToast(`Um e-mail de redefinição de senha foi enviado para ${userToReset.email}.`);
    } catch (error) {
      console.error('Erro ao resetar senha:', error);
      showToast('Erro ao enviar e-mail de redefinição. Verifique o console.', 'error');
    } finally {
      setResettingId(null);
    }
  };

  // Remove handleSyncCpfs as it's now automatic

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return 'N/A';
    try {
      return format(parseISO(dateStr), "dd/MM/yyyy HH:mm", { locale: ptBR });
    } catch (e) {
      return dateStr;
    }
  };

  const formatBirthDate = (dateStr?: string) => {
    if (!dateStr) return 'Não informada';
    try {
      return format(parseISO(dateStr), "dd/MM/yyyy", { locale: ptBR });
    } catch (e) {
      return dateStr;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-slate-800 flex items-center gap-3">
            <div className="p-2 bg-indigo-500 text-white rounded-xl shadow-lg shadow-indigo-100">
              <Users size={24} />
            </div>
            Gestão de Usuários
          </h2>
          <p className="text-slate-500 mt-1 font-medium">Visualize e gerencie todos os membros do sistema</p>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input
              type="text"
              placeholder="Buscar por nome ou email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl w-full md:w-80 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all font-medium text-sm"
            />
          </div>
        </div>
      </div>

      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
        {error && (
          <div className="p-4 bg-red-50 border-b border-red-100 text-red-600 text-sm font-medium flex items-center gap-2">
            <AlertCircle size={16} />
            Erro ao carregar usuários: {error}
          </div>
        )}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Usuário</th>
                <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Nascimento</th>
                <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">CPF</th>
                <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Celular</th>
                <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Cadastro</th>
                <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Status</th>
                <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center">
                    <div className="flex flex-col items-center gap-3">
                      <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
                      <span className="text-sm font-bold text-slate-400">Carregando usuários...</span>
                    </div>
                  </td>
                </tr>
              ) : filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-slate-400 font-medium">
                    Nenhum usuário encontrado
                  </td>
                </tr>
              ) : (
                filteredUsers.map((user) => (
                  <motion.tr 
                    key={user.uid}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="hover:bg-slate-50/50 transition-colors group"
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 font-bold border-2 border-white shadow-sm overflow-hidden">
                          <UserIcon size={20} />
                        </div>
                        <div className="flex flex-col min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-bold text-slate-800 truncate">{user.displayName}</span>
                            {user.role === 'admin' && (
                              <span className="p-0.5 bg-indigo-100 text-indigo-600 rounded" title="Administrador">
                                <Shield size={10} />
                              </span>
                            )}
                          </div>
                          <span className="text-xs text-slate-500 flex items-center gap-1">
                            <Mail size={12} />
                            {user.email}
                          </span>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2 text-slate-600">
                        <Calendar size={14} className="text-slate-400" />
                        <span className="text-sm font-medium">{formatBirthDate(user.birthDate)}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm font-medium text-slate-600">{user.cpf || 'N/A'}</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm font-medium text-slate-600">{user.phone || 'N/A'}</span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2 text-slate-600">
                        <Clock size={14} className="text-slate-400" />
                        <span className="text-sm font-medium">{formatDate(user.createdAt)}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border ${
                        user.role === 'admin' || user.status === 'approved' 
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-100' 
                          : user.status === 'rejected'
                          ? 'bg-red-50 text-red-700 border-red-100'
                          : user.status === 'blocked'
                          ? 'bg-slate-100 text-slate-600 border-slate-200'
                          : user.status === 'inactive'
                          ? 'bg-gray-100 text-gray-500 border-gray-200'
                          : 'bg-orange-50 text-orange-700 border-orange-100'
                      }`}>
                        {user.role === 'admin' || user.status === 'approved' ? 'Aprovado' : user.status === 'rejected' ? 'Reprovado' : user.status === 'blocked' ? 'Bloqueado' : user.status === 'inactive' ? 'Inativo' : 'Pendente'}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        {user.authProvider === 'password' && user.role !== 'admin' && (
                          <button
                            onClick={() => setConfirmResetId(user.uid)}
                            disabled={resettingId === user.uid}
                            className="p-2 text-amber-500 hover:bg-amber-50 rounded-lg transition-all disabled:opacity-50"
                            title="Resetar Senha"
                          >
                            {resettingId === user.uid ? (
                              <div className="w-4 h-4 border-2 border-amber-500 border-t-transparent rounded-full animate-spin"></div>
                            ) : (
                              <Key size={18} />
                            )}
                          </button>
                        )}
                        {user.status !== 'approved' && user.role !== 'admin' && (
                          <button
                            onClick={() => handleStatusUpdate(user.uid, 'approved')}
                            className="p-2 text-emerald-500 hover:bg-emerald-50 rounded-lg transition-all"
                            title="Aprovar"
                          >
                            <Check size={18} />
                          </button>
                        )}
                        {user.status === 'pending' && user.role !== 'admin' && (
                          <button
                            onClick={() => handleStatusUpdate(user.uid, 'rejected')}
                            className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-all"
                            title="Reprovar"
                          >
                            <X size={18} />
                          </button>
                        )}
                        {user.status !== 'blocked' && user.role !== 'admin' && (
                          <button
                            onClick={() => handleStatusUpdate(user.uid, 'blocked')}
                            className="p-2 text-slate-400 hover:bg-slate-100 rounded-lg transition-all"
                            title="Bloquear"
                          >
                            <Ban size={18} />
                          </button>
                        )}
                        {user.status !== 'inactive' && user.role !== 'admin' && (
                          <button
                            onClick={() => handleStatusUpdate(user.uid, 'inactive')}
                            className="p-2 text-gray-400 hover:bg-gray-100 rounded-lg transition-all"
                            title="Inativar"
                          >
                            <UserMinus size={18} />
                          </button>
                        )}
                        {user.role !== 'admin' && (
                          <button
                            onClick={() => setConfirmDeleteId(user.uid)}
                            disabled={deletingId === user.uid}
                            className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all disabled:opacity-50"
                            title="Remover"
                          >
                            {deletingId === user.uid ? (
                              <div className="w-4 h-4 border-2 border-red-500 border-t-transparent rounded-full animate-spin"></div>
                            ) : (
                              <Trash2 size={18} />
                            )}
                          </button>
                        )}
                      </div>
                    </td>
                  </motion.tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Confirmation Modal */}
      {confirmDeleteId && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <motion.div 
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl border border-slate-100"
          >
            <div className="w-16 h-16 bg-red-50 text-red-500 rounded-2xl flex items-center justify-center mb-6">
              <Trash2 size={32} />
            </div>
            <h3 className="text-xl font-black text-slate-800 mb-2">Confirmar Exclusão</h3>
            <p className="text-slate-500 mb-8 font-medium leading-relaxed">
              Tem certeza que deseja remover este usuário? Esta ação não pode ser desfeita e removerá todos os dados associados.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setConfirmDeleteId(null)}
                className="flex-1 px-6 py-3 bg-slate-100 text-slate-600 rounded-xl font-bold hover:bg-slate-200 transition-all"
              >
                Cancelar
              </button>
              <button
                onClick={() => {
                  handleRemoveUser(confirmDeleteId);
                  setConfirmDeleteId(null);
                }}
                className="flex-1 px-6 py-3 bg-red-500 text-white rounded-xl font-bold hover:bg-red-600 transition-all shadow-lg shadow-red-100"
              >
                Excluir
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* Password Reset Confirmation Modal */}
      {confirmResetId && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <motion.div 
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl border border-slate-100"
          >
            <div className="w-16 h-16 bg-amber-50 text-amber-500 rounded-2xl flex items-center justify-center mb-6">
              <Lock size={32} />
            </div>
            <h3 className="text-xl font-black text-slate-800 mb-2">Resetar Senha</h3>
            <p className="text-slate-500 mb-8 font-medium leading-relaxed">
              Deseja enviar um e-mail de redefinição de senha para este usuário? Um link seguro será enviado para o e-mail cadastrado.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setConfirmResetId(null)}
                className="flex-1 px-6 py-3 bg-slate-100 text-slate-600 rounded-xl font-bold hover:bg-slate-200 transition-all"
              >
                Cancelar
              </button>
              <button
                onClick={() => {
                  handleResetPassword(confirmResetId);
                  setConfirmResetId(null);
                }}
                className="flex-1 px-6 py-3 bg-amber-500 text-white rounded-xl font-bold hover:bg-amber-600 transition-all shadow-lg shadow-amber-100"
              >
                Enviar Link
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
};
