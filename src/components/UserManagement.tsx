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
  MoreVertical,
  AlertCircle
} from 'lucide-react';
import { collection, onSnapshot, query, orderBy, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { db, auth } from '../firebase';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { motion } from 'motion/react';

interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  birthDate?: string;
  createdAt?: string;
  lastLogin?: string;
  role: string;
  status?: 'pending' | 'approved' | 'rejected' | 'blocked';
}

export const UserManagement = () => {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [error, setError] = useState<string | null>(null);

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
    }, (err) => {
      console.error('Error fetching users:', err);
      setError(err.message);
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const filteredUsers = users.filter(user => 
    user.displayName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleStatusUpdate = async (uid: string, newStatus: 'approved' | 'rejected' | 'blocked') => {
    try {
      await updateDoc(doc(db, 'users', uid), { status: newStatus });
    } catch (error) {
      console.error('Error updating status:', error);
    }
  };

  const handleRemoveUser = async (uid: string) => {
    if (!window.confirm('Tem certeza que deseja remover este usuário? Esta ação não pode ser desfeita.')) return;
    try {
      await deleteDoc(doc(db, 'users', uid));
    } catch (error) {
      console.error('Error removing user:', error);
    }
  };

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
                <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Cadastro</th>
                <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Último Login</th>
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
                      <div className="flex items-center gap-2 text-slate-600">
                        <Clock size={14} className="text-slate-400" />
                        <span className="text-sm font-medium">{formatDate(user.createdAt)}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2 text-slate-600">
                        <Clock size={14} className="text-slate-400" />
                        <span className="text-sm font-medium">{formatDate(user.lastLogin)}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border ${
                        user.status === 'approved' 
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-100' 
                          : user.status === 'rejected'
                          ? 'bg-red-50 text-red-700 border-red-100'
                          : user.status === 'blocked'
                          ? 'bg-slate-100 text-slate-600 border-slate-200'
                          : 'bg-orange-50 text-orange-700 border-orange-100'
                      }`}>
                        {user.status === 'approved' ? 'Aprovado' : user.status === 'rejected' ? 'Reprovado' : user.status === 'blocked' ? 'Bloqueado' : 'Pendente'}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-1">
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
                        {user.role !== 'admin' && (
                          <button
                            onClick={() => handleRemoveUser(user.uid)}
                            className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                            title="Remover"
                          >
                            <Trash2 size={18} />
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
    </div>
  );
};
