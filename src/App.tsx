/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from 'react';
import { 
  Plus, 
  Trash2, 
  CheckCircle2, 
  Circle, 
  ChevronRight, 
  Layout, 
  Target, 
  ListTodo, 
  FolderPlus, 
  Target as GoalIcon, 
  Settings2,
  Calendar as CalendarIcon,
  Menu,
  X,
  Wallet,
  Pin,
  Dumbbell,
  BookOpen,
  Eye,
  Pencil,
  Utensils,
  LogOut,
  User as UserIcon,
  Loader2,
  Users,
  Shield,
  Check,
  Bell,
  Monitor,
  Repeat,
  CalendarRange,
  Clock,
  Clock as ClockIcon,
  AlertCircle,
  Ban,
  XCircle
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { handleFirestoreError, OperationType } from './utils/firestoreErrorHandler';
import { 
  format, 
  startOfMonth, 
  endOfMonth, 
  startOfWeek, 
  endOfWeek, 
  eachDayOfInterval, 
  getDay, 
  parseISO,
  addMonths,
  subMonths
} from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Project, Goal, Task, AppData, Appointment, MealEntry, TrainingEntry, NotificationSettings, StandardAlert } from './types';
import { generateId, cn, validateCPF } from './utils';
import { Dashboard } from './components/Dashboard';
import { Calendar } from './components/Calendar';
import { KanbanBoard } from './components/KanbanBoard';
import { DietTraining } from './components/DietTraining';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { PomodoroProvider } from './contexts/PomodoroContext';
import { Login } from './components/Login';
import { UserManagement } from './components/UserManagement';
import { PomodoroTimer } from './components/PomodoroTimer';
import { ErrorBoundary } from './components/ErrorBoundary';

const PendingApproval = ({ status, onLogout }: { status: string; onLogout: () => void }) => {
  const getStatusConfig = () => {
    switch (status) {
      case 'rejected':
        return {
          icon: <XCircle size={48} className="text-red-500" />,
          title: 'Acesso Negado',
          message: 'Infelizmente seu cadastro não foi aprovado pelos administradores.',
          color: 'bg-red-50 text-red-700 border-red-200'
        };
      case 'blocked':
        return {
          icon: <Ban size={48} className="text-slate-500" />,
          title: 'Conta Bloqueada',
          message: 'Sua conta foi bloqueada. Entre em contato com o suporte para mais informações.',
          color: 'bg-slate-50 text-slate-700 border-slate-200'
        };
      case 'inactive':
        return {
          icon: <UserIcon size={48} className="text-gray-400" />,
          title: 'Conta Inativa',
          message: 'Sua conta está inativa no momento. Entre em contato com o administrador.',
          color: 'bg-gray-50 text-gray-700 border-gray-200'
        };
      default:
        return {
          icon: <ClockIcon size={48} className="text-orange-500" />,
          title: 'Aguardando Aprovação',
          message: 'Seu cadastro foi recebido e está aguardando a análise de um administrador.',
          color: 'bg-orange-50 text-orange-700 border-orange-200'
        };
    }
  };

  const config = getStatusConfig();

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white p-8 rounded-3xl shadow-xl max-w-md w-full text-center border border-slate-100"
      >
        <div className="flex justify-center mb-6">
          <div className="p-4 bg-slate-50 rounded-2xl">
            {config.icon}
          </div>
        </div>
        <h2 className="text-2xl font-black text-slate-800 mb-3">{config.title}</h2>
        <p className="text-slate-500 font-medium mb-8 leading-relaxed">
          {config.message}
        </p>
        
        <div className={cn("p-4 rounded-2xl border mb-8 text-sm font-bold", config.color)}>
          Status: {status === 'pending' ? 'Pendente' : status === 'rejected' ? 'Reprovado' : status === 'blocked' ? 'Bloqueado' : status === 'inactive' ? 'Inativo' : 'Aguardando'}
        </div>

        <button
          onClick={onLogout}
          className="w-full flex items-center justify-center gap-2 px-6 py-3.5 bg-slate-800 hover:bg-slate-900 text-white rounded-2xl font-bold transition-all shadow-lg hover:shadow-xl"
        >
          <LogOut size={20} />
          Sair da Conta
        </button>
      </motion.div>
    </div>
  );
};

import { 
  collection, 
  query, 
  where, 
  onSnapshot, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  setDoc,
  getDocs,
  writeBatch
} from 'firebase/firestore';
import { db } from './firebase';

const STORAGE_KEY = 'organizer_app_data';

const ProfileModal = ({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) => {
  const { userProfile, updateProfile } = useAuth();
  const [name, setName] = useState(userProfile?.displayName || '');
  const [birthDate, setBirthDate] = useState(userProfile?.birthDate || '');
  const [cpf, setCpf] = useState(userProfile?.cpf || '');
  const [phone, setPhone] = useState(userProfile?.phone || '');
  const [photoURL, setPhotoURL] = useState(userProfile?.photoURL || '');
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (userProfile) {
      setName(userProfile.displayName || '');
      setBirthDate(userProfile.birthDate || '');
      setCpf(userProfile.cpf || '');
      setPhone(userProfile.phone || '');
      setPhotoURL(userProfile.photoURL || '');
    }
  }, [userProfile]);

  const handleSave = async () => {
    if (!name || !birthDate || !cpf || !phone) {
      setError('Todos os campos são obrigatórios.');
      return;
    }

    if (!validateCPF(cpf)) {
      setError('CPF inválido. Insira 11 números válidos.');
      return;
    }

    const cleanPhone = phone.replace(/[^\d]+/g, '');
    if (cleanPhone.length < 11) {
      setError('Celular/WhatsApp inválido. Use o formato 64999994444.');
      return;
    }

    setIsSaving(true);
    setError(null);
    try {
      await updateProfile({ 
        displayName: name, 
        birthDate, 
        photoURL, 
        cpf: cpf.replace(/[^\d]+/g, ''), 
        phone: cleanPhone 
      });
      onClose();
    } catch (err: any) {
      console.error(err);
      if (err.code === 'auth/cpf-already-in-use') {
        setError('Este CPF já está cadastrado.');
      } else if (err.message?.startsWith('FIRESTORE_ERROR:')) {
        try {
          const errorData = JSON.parse(err.message.replace('FIRESTORE_ERROR:', ''));
          setError(`Erro no Firestore: ${errorData.error}`);
        } catch (e) {
          setError('Erro ao salvar perfil no Firestore.');
        }
      } else {
        setError('Erro ao salvar perfil.');
      }
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden"
      >
        <div className="p-6 border-b border-slate-100 flex items-center justify-between">
          <h2 className="text-xl font-bold text-slate-800">Meu Perfil</h2>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-xl transition-colors">
            <X size={20} className="text-slate-400" />
          </button>
        </div>
        <div className="p-6 space-y-4">
          <div className="flex justify-center mb-6">
            <div className="relative group">
              <div className="w-24 h-24 bg-orange-100 rounded-3xl flex items-center justify-center text-orange-600 overflow-hidden border-4 border-white shadow-lg">
                {photoURL ? (
                  <img src={photoURL} alt="Profile" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                ) : (
                  <UserIcon size={40} />
                )}
              </div>
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-400 uppercase ml-1">Nome Completo</label>
            <input 
              type="text" 
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-orange-500 transition-all"
              placeholder="Seu nome"
            />
          </div>
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-400 uppercase ml-1">Email</label>
            <input 
              type="email" 
              value={userProfile?.email || ''}
              disabled
              className="w-full px-4 py-3 bg-slate-100 border border-slate-200 rounded-2xl text-slate-500 cursor-not-allowed"
            />
          </div>
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-400 uppercase ml-1">Data de Nascimento</label>
            <input 
              type="date" 
              value={birthDate}
              onChange={(e) => setBirthDate(e.target.value)}
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-orange-500 transition-all"
            />
          </div>
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-400 uppercase ml-1">CPF</label>
            <input 
              type="text" 
              maxLength={11}
              value={cpf}
              onChange={(e) => setCpf(e.target.value.replace(/[^\d]+/g, ''))}
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-orange-500 transition-all"
              placeholder="00000000000"
            />
          </div>
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-400 uppercase ml-1">Celular/WhatsApp (+55)</label>
            <input 
              type="text" 
              value={phone}
              onChange={(e) => setPhone(e.target.value.replace(/[^\d]+/g, ''))}
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-orange-500 transition-all"
              placeholder="64999994444"
            />
          </div>
          {error && (
            <p className="text-xs font-bold text-red-500 ml-1">{error}</p>
          )}
        </div>
        <div className="p-6 bg-slate-50 flex gap-3">
          <button 
            onClick={onClose}
            className="flex-1 py-3 px-4 bg-white border border-slate-200 text-slate-600 font-bold rounded-2xl hover:bg-slate-100 transition-all"
          >
            Cancelar
          </button>
          <button 
            onClick={handleSave}
            disabled={isSaving}
            className="flex-1 py-3 px-4 bg-orange-600 text-white font-bold rounded-2xl hover:bg-orange-700 shadow-lg shadow-orange-200 transition-all flex items-center justify-center gap-2"
          >
            {isSaving ? <Loader2 size={20} className="animate-spin" /> : 'Salvar Alterações'}
          </button>
        </div>
      </motion.div>
    </div>
  );
};

// handleFirestoreError and OperationType are now imported from utils
function MainApp() {
  const { user, userProfile, loading, logout, isAdmin, isApproved } = useAuth();
  const [data, setData] = useState<AppData>({
    projects: [],
    goals: [],
    tasks: [],
    appointments: [],
    diet: [],
    training: [],
    standardAlerts: [],
    notificationSettings: {
      browserNotificationsEnabled: false,
      userId: ''
    }
  });

  // Firestore Sync
  useEffect(() => {
    if (!user) return;

    const collections = ['projects', 'goals', 'tasks', 'appointments', 'diet', 'training', 'standardAlerts'];
    const unsubscribes: (() => void)[] = [];

    // Sync settings
    const settingsUnsub = onSnapshot(doc(db, 'settings', user.uid), (snapshot) => {
      if (snapshot.exists()) {
        setData(prev => ({ ...prev, notificationSettings: snapshot.data() as NotificationSettings }));
      }
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, `settings/${user.uid}`);
    });
    unsubscribes.push(settingsUnsub);

    collections.forEach(colName => {
      const q = query(collection(db, colName), where('userId', '==', user.uid));

      const unsub = onSnapshot(q, (snapshot) => {
        const items = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id })) as any[];
        setData(prev => ({ ...prev, [colName]: items }));
      }, (error) => {
        handleFirestoreError(error, OperationType.GET, colName);
      });
      unsubscribes.push(unsub);
    });

    return () => unsubscribes.forEach(unsub => unsub());
  }, [user, isAdmin]);

  const [activeView, setActiveView] = useState<'dashboard' | 'calendar' | 'finance' | 'diet' | 'studies' | 'vision' | 'users' | 'notifications'>('vision');
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };
  useEffect(() => {
    if (activeView === 'users' && !isAdmin && !loading) {
      setActiveView('dashboard');
    }
  }, [activeView, isAdmin, loading]);

  useEffect(() => {
    const interval = setInterval(() => {
      setNotificationPermissionStatus(typeof Notification !== 'undefined' ? Notification.permission : 'default');
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  // Standard Alerts Logic
  useEffect(() => {
    if (!user || !data.notificationSettings?.browserNotificationsEnabled || Notification.permission !== 'granted') return;

    const interval = setInterval(() => {
      const now = new Date();
      const nowStr = now.toISOString();

      data.standardAlerts?.forEach(async (alert) => {
        const start = new Date(alert.startDateTime);
        const end = new Date(alert.endDateTime);

        // Check if within period
        if (now < start || now > end) return;

        // Check if only today
        if (alert.duration === 'only_today') {
          const todayStr = now.toISOString().split('T')[0];
          const startStr = start.toISOString().split('T')[0];
          if (todayStr !== startStr) return;
        }

        // Check cycle
        const lastTriggered = alert.lastTriggeredAt ? new Date(alert.lastTriggeredAt) : null;
        const diffMinutes = lastTriggered ? (now.getTime() - lastTriggered.getTime()) / (1000 * 60) : alert.cycleMinutes + 1;

        if (diffMinutes >= alert.cycleMinutes) {
          // Trigger notification
          new Notification("Lembrete Programado", {
            body: alert.description,
            icon: "/favicon.ico"
          });

          // Update lastTriggeredAt
          try {
            await updateDoc(doc(db, 'standardAlerts', alert.id!), {
              lastTriggeredAt: nowStr
            });
          } catch (error) {
            console.error('Error updating alert:', error);
          }
        }
      });
    }, 60000); // Check every minute

    return () => clearInterval(interval);
  }, [user, data.standardAlerts, data.notificationSettings]);

  const [taskViewMode, setTaskViewMode] = useState<'list' | 'kanban'>('list');
  const [activeProjectId, setActiveProjectId] = useState<string>(data.projects[0]?.id || '');
  const [activeGoalId, setActiveGoalId] = useState<string | null>(null);
  const [newProjectTitle, setNewProjectTitle] = useState('');
  const [newGoalTitle, setNewGoalTitle] = useState('');
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskDate, setNewTaskDate] = useState('');
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [editTaskTitle, setEditTaskTitle] = useState('');
  const [editTaskDate, setEditTaskDate] = useState('');
  const [showAddProject, setShowAddProject] = useState(false);
  const [showAddGoal, setShowAddGoal] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isSidebarPinned, setIsSidebarPinned] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [notifications, setNotifications] = useState<{ id: string; title: string; message: string; time: number; read: boolean }[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showAddAlertModal, setShowAddAlertModal] = useState(false);
  const [newAlert, setNewAlert] = useState<Partial<StandardAlert>>({
    description: '',
    cycleMinutes: 120,
    duration: 'every_day',
    startDateTime: format(new Date(), "yyyy-MM-dd'T'HH:mm"),
    endDateTime: format(new Date(), "yyyy-MM-dd'T'HH:mm")
  });
  const [notificationPermissionStatus, setNotificationPermissionStatus] = useState<NotificationPermission>(
    typeof Notification !== 'undefined' ? Notification.permission : 'default'
  );
  const notifiedRef = React.useRef<Set<string>>(new Set());
  const whatsappNotifiedRef = React.useRef<Set<string>>(new Set());
  const desktopNotificationRef = React.useRef<HTMLDivElement>(null);
  const mobileNotificationRef = React.useRef<HTMLDivElement>(null);

  // Close notifications when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const isDesktopClick = desktopNotificationRef.current && desktopNotificationRef.current.contains(event.target as Node);
      const isMobileClick = mobileNotificationRef.current && mobileNotificationRef.current.contains(event.target as Node);
      
      if (!isDesktopClick && !isMobileClick) {
        setShowNotifications(false);
      }
    };

    if (showNotifications) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showNotifications]);

  useEffect(() => {
    const checkMobile = () => {
      const mobile = window.innerWidth < 1024;
      setIsMobile(prevMobile => {
        // Only auto-toggle sidebar if the mobile status actually changed
        if (prevMobile !== mobile) {
          setIsSidebarOpen(!mobile);
        }
        return mobile;
      });
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  useEffect(() => {
    if (!activeProjectId && data.projects.length > 0) {
      setActiveProjectId(data.projects[0].id);
    }
  }, [data.projects, activeProjectId]);

  const activeProject = useMemo(() => 
    data.projects.find(p => p.id === activeProjectId), 
  [data.projects, activeProjectId]);

  const projectGoals = useMemo(() => 
    data.goals.filter(g => g.projectId === activeProjectId),
  [data.goals, activeProjectId]);

  const filteredTasks = useMemo(() => {
    if (activeGoalId) {
      return data.tasks.filter(t => t.goalId === activeGoalId);
    }
    const goalIds = projectGoals.map(g => g.id);
    return data.tasks.filter(t => goalIds.includes(t.goalId));
  }, [data.tasks, activeGoalId, projectGoals]);

  const addProject = async () => {
    if (!newProjectTitle.trim() || !user) return;
    try {
      const newProject = {
        title: newProjectTitle,
        color: '#' + Math.floor(Math.random()*16777215).toString(16),
        createdAt: Date.now(),
        userId: user.uid
      };
      await addDoc(collection(db, 'projects'), newProject);
      setNewProjectTitle('');
      setShowAddProject(false);
      setActiveView('dashboard');
      if (isMobile) setIsSidebarOpen(false);
      showToast('Projeto criado com sucesso!');
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'projects');
      showToast('Erro ao criar projeto', 'error');
    }
  };

  const addGoal = async () => {
    if (!newGoalTitle.trim() || !activeProjectId || !user) return;
    try {
      const newGoal = {
        title: newGoalTitle,
        projectId: activeProjectId,
        createdAt: Date.now(),
        userId: user.uid
      };
      await addDoc(collection(db, 'goals'), newGoal);
      setNewGoalTitle('');
      setShowAddGoal(false);
      showToast('Meta criada com sucesso!');
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'goals');
      showToast('Erro ao criar meta', 'error');
    }
  };

  const addTask = async () => {
    if (!newTaskTitle.trim() || !activeGoalId || !user) return;
    try {
      const newTask = {
        title: newTaskTitle,
        completed: false,
        status: 'todo',
        goalId: activeGoalId,
        createdAt: Date.now(),
        dueDate: newTaskDate || null,
        userId: user.uid
      };
      await addDoc(collection(db, 'tasks'), newTask);
      setNewTaskTitle('');
      setNewTaskDate('');
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'tasks');
    }
  };

  const saveEditTask = async () => {
    if (!editingTaskId || !editTaskTitle.trim()) return;
    try {
      await updateDoc(doc(db, 'tasks', editingTaskId), {
        title: editTaskTitle,
        dueDate: editTaskDate || null
      });
      setEditingTaskId(null);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `tasks/${editingTaskId}`);
    }
  };

  const toggleTask = async (taskId: string) => {
    const task = data.tasks.find(t => t.id === taskId);
    if (!task) return;
    const completed = !task.completed;
    try {
      await updateDoc(doc(db, 'tasks', taskId), {
        completed,
        status: completed ? 'done' : 'todo'
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `tasks/${taskId}`);
    }
  };

  const updateTaskStatus = async (taskId: string, status: 'todo' | 'in-progress' | 'done') => {
    try {
      await updateDoc(doc(db, 'tasks', taskId), {
        status,
        completed: status === 'done'
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `tasks/${taskId}`);
    }
  };

  const deleteTask = async (taskId: string) => {
    try {
      await deleteDoc(doc(db, 'tasks', taskId));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `tasks/${taskId}`);
    }
  };

  const deleteGoal = async (goalId: string) => {
    try {
      await deleteDoc(doc(db, 'goals', goalId));
      // Also delete tasks associated with this goal
      const tasksToDelete = data.tasks.filter(t => t.goalId === goalId);
      for (const task of tasksToDelete) {
        await deleteDoc(doc(db, 'tasks', task.id));
      }
      if (activeGoalId === goalId) setActiveGoalId(null);
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `goals/${goalId}`);
    }
  };

  const deleteProject = async (projectId: string) => {
    try {
      await deleteDoc(doc(db, 'projects', projectId));
      // Associated goals and tasks should be deleted too for consistency
      const goalsToDelete = data.goals.filter(g => g.projectId === projectId);
      for (const goal of goalsToDelete) {
        await deleteGoal(goal.id);
      }
      if (activeProjectId === projectId) setActiveProjectId(data.projects.find(p => p.id !== projectId)?.id || '');
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `projects/${projectId}`);
    }
  };

  const calendarAppointments = useMemo(() => {
    const projectTasksAsAppointments: Appointment[] = data.tasks
      .filter(t => t.dueDate)
      .map(t => {
        const goal = data.goals.find(g => g.id === t.goalId);
        const project = data.projects.find(p => p.id === goal?.projectId);
        return {
          id: t.id,
          title: t.title,
          description: `${project?.title || 'Projeto'} | ${goal?.title || 'Meta'}`,
          date: t.dueDate!,
          time: t.time || '12:00',
          category: 'project',
          completed: t.completed,
          createdAt: t.createdAt
        };
      });

    // Generate virtual appointments for diet and training
    // We'll generate for current month +/- 2 months to be safe
    const today = new Date();
    const start = startOfWeek(subMonths(today, 2));
    const end = endOfWeek(addMonths(today, 2));
    const days = eachDayOfInterval({ start, end });

    const dietAppointments: Appointment[] = [];
    const trainingAppointments: Appointment[] = [];

    days.forEach(day => {
      const dayOfWeek = getDay(day);
      const dateStr = format(day, 'yyyy-MM-dd');

      // Diet
      data.diet.filter(m => m.dayOfWeek === dayOfWeek).forEach(meal => {
        dietAppointments.push({
          id: `diet_${meal.id}_${dateStr}`,
          title: meal.type,
          description: meal.items.map(i => `${i.description} (${i.quantity}${i.unit})`).join(', '),
          date: dateStr,
          time: meal.time,
          category: 'diet',
          completed: meal.completedDates?.includes(dateStr) || false,
          createdAt: 0
        });
      });

      // Training
      data.training.filter(t => t.dayOfWeek === dayOfWeek).forEach(train => {
        trainingAppointments.push({
          id: `training_${train.id}_${dateStr}`,
          title: train.type,
          description: train.items.map(i => `${i.description} (${i.quantity}${i.unit})`).join(', '),
          date: dateStr,
          time: train.time,
          category: 'training',
          completed: train.completedDates?.includes(dateStr) || false,
          createdAt: 0
        });
      });
    });

    return [...data.appointments, ...projectTasksAsAppointments, ...dietAppointments, ...trainingAppointments];
  }, [data.appointments, data.tasks, data.goals, data.projects, data.diet, data.training]);

  // Notification Logic
  useEffect(() => {
    const checkNotifications = () => {
      const now = new Date();
      const newNotifications: typeof notifications = [];

      calendarAppointments.forEach(app => {
        if (app.completed) return;

        const [year, month, day] = app.date.split('-').map(Number);
        const [hours, minutes] = app.time.split(':').map(Number);
        const eventTime = new Date(year, month - 1, day, hours, minutes);
        
        const diffInMinutes = Math.floor((eventTime.getTime() - now.getTime()) / (1000 * 60));
        const intervals = [30, 15, 5, 0];

        intervals.forEach(interval => {
          const notificationKey = `${app.id}_${interval}`;
          if (diffInMinutes === interval && !notifiedRef.current.has(notificationKey)) {
            const categoryLabels: Record<string, string> = {
              routine: 'Rotina',
              appointment: 'Compromisso',
              task: 'Tarefa',
              project: 'Projeto',
              diet: 'Alimentação',
              training: 'Treino',
              study: 'Estudo'
            };
            const categoryLabel = categoryLabels[app.category] || 'Agenda';
            
            const message = interval === 0 
              ? `Está na hora: ${app.title}` 
              : `Faltam ${interval} minutos para: ${app.title}`;
            
            const newNotif = {
              id: generateId(),
              title: `Lembrete: ${categoryLabel}`,
              message,
              time: Date.now(),
              read: false
            };

            newNotifications.push(newNotif);
            notifiedRef.current.add(notificationKey);
            showToast(`${categoryLabel}: ${message}`);

          // Browser Native Notification
          if (data.notificationSettings?.browserNotificationsEnabled && Notification.permission === 'granted') {
            new Notification(`OrganizeApp - ${categoryLabel}`, {
              body: `${app.time}: ${app.title}\n${message}`,
              icon: '/favicon.ico' // Or any app icon
            });
          }
          }
        });
      });

      if (newNotifications.length > 0) {
        setNotifications(prev => [...newNotifications, ...prev].slice(0, 20));
      }
    };

    const interval = setInterval(checkNotifications, 30000); // Check every 30 seconds
    checkNotifications(); // Initial check

    return () => clearInterval(interval);
  }, [calendarAppointments]);

  const addAppointments = async (appointments: Appointment[]) => {
    if (!user) return;
    try {
      const batch = writeBatch(db);
      appointments.forEach(app => {
        // Use the app.id as the document ID for consistency
        const newDoc = doc(db, 'appointments', app.id);
        
        // Clean up undefined values for Firestore
        const cleanApp = JSON.parse(JSON.stringify({ ...app, userId: user.uid }));
        
        batch.set(newDoc, cleanApp);
      });
      await batch.commit();
      showToast('Agenda atualizada!');
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'appointments/batch');
      showToast('Erro ao salvar agenda', 'error');
    }
  };

  const updateAppointment = async (appointment: Appointment) => {
    if (!user) return;
    try {
      const { id, ...rest } = appointment;
      const cleanData = JSON.parse(JSON.stringify(rest));
      await updateDoc(doc(db, 'appointments', id), cleanData);
      showToast('Compromisso atualizado!');
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `appointments/${appointment.id}`);
      showToast('Erro ao atualizar compromisso', 'error');
    }
  };

  const toggleAppointment = async (id: string) => {
    try {
      // Handle diet virtual appointments
      if (id.startsWith('diet_')) {
        const [, mealId, dateStr] = id.split('_');
        const meal = data.diet.find(m => m.id === mealId);
        if (meal) {
          const completedDates = meal.completedDates || [];
          const isCompleted = completedDates.includes(dateStr);
          const newDates = isCompleted 
            ? completedDates.filter(d => d !== dateStr)
            : [...completedDates, dateStr];
          await updateDoc(doc(db, 'diet', mealId), { completedDates: newDates });
        }
        return;
      }

      // Handle training virtual appointments
      if (id.startsWith('training_')) {
        const [, trainId, dateStr] = id.split('_');
        const train = data.training.find(t => t.id === trainId);
        if (train) {
          const completedDates = train.completedDates || [];
          const isCompleted = completedDates.includes(dateStr);
          const newDates = isCompleted 
            ? completedDates.filter(d => d !== dateStr)
            : [...completedDates, dateStr];
          await updateDoc(doc(db, 'training', trainId), { completedDates: newDates });
        }
        return;
      }

      const task = data.tasks.find(t => t.id === id);
      if (task) {
        await updateDoc(doc(db, 'tasks', id), { completed: !task.completed });
        return;
      }

      const app = data.appointments.find(a => a.id === id);
      if (app) {
        await updateDoc(doc(db, 'appointments', id), { completed: !app.completed });
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `appointments/${id}`);
    }
  };

  const deleteAppointment = async (id: string, deleteAllRecurring?: boolean) => {
    try {
      if (deleteAllRecurring) {
        const target = data.appointments.find(a => a.id === id);
        if (target?.recurrenceId) {
          const appsToDelete = data.appointments.filter(a => a.recurrenceId === target.recurrenceId && a.date >= target.date);
          for (const app of appsToDelete) {
            await deleteDoc(doc(db, 'appointments', app.id));
          }
          return;
        }
      }
      await deleteDoc(doc(db, 'appointments', id));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `appointments/${id}`);
    }
  };

  const updateDiet = async (dietList: MealEntry[]) => {
    if (!user) return;
    try {
      const currentIds = data.diet.map(m => m.id);
      const newIds = dietList.map(m => m.id);

      // Delete removed meals
      for (const id of currentIds) {
        if (!newIds.includes(id)) {
          await deleteDoc(doc(db, 'diet', id));
        }
      }

      // Add or update meals
      for (const meal of dietList) {
        if (currentIds.includes(meal.id)) {
          const { id, ...rest } = meal;
          await updateDoc(doc(db, 'diet', id), rest);
        } else {
          await addDoc(collection(db, 'diet'), { ...meal, userId: user.uid });
        }
      }
      showToast('Dieta salva com sucesso!');
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'diet');
      showToast('Erro ao salvar dieta', 'error');
    }
  };

  const updateTraining = async (trainingList: TrainingEntry[]) => {
    if (!user) return;
    try {
      const currentIds = data.training.map(t => t.id);
      const newIds = trainingList.map(t => t.id);

      // Delete removed trainings
      for (const id of currentIds) {
        if (!newIds.includes(id)) {
          await deleteDoc(doc(db, 'training', id));
        }
      }

      // Add or update trainings
      for (const train of trainingList) {
        if (currentIds.includes(train.id)) {
          const { id, ...rest } = train;
          await updateDoc(doc(db, 'training', id), rest);
        } else {
          await addDoc(collection(db, 'training'), { ...train, userId: user.uid });
        }
      }
      showToast('Treino salvo com sucesso!');
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'training');
      showToast('Erro ao salvar treino', 'error');
    }
  };

  const updateNotificationSettings = async (settings: NotificationSettings) => {
    if (!user) return;
    try {
      await setDoc(doc(db, 'settings', user.uid), settings);
      setData(prev => ({ ...prev, notificationSettings: settings }));
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `settings/${user.uid}`);
    }
  };

  const requestNotificationPermission = async () => {
    if (!('Notification' in window)) {
      showToast('Este navegador não suporta notificações desktop', 'error');
      return;
    }

    const permission = await Notification.requestPermission();
    if (permission === 'granted') {
      updateNotificationSettings({
        ...data.notificationSettings!,
        browserNotificationsEnabled: true,
        userId: user!.uid
      });
      showToast('Notificações ativadas com sucesso!');
    } else {
      showToast('Permissão de notificação negada', 'error');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <Loader2 className="w-10 h-10 text-orange-600 animate-spin" />
      </div>
    );
  }

  if (!user) {
    return <Login />;
  }

  if (!isApproved) {
    return <PendingApproval status={userProfile?.status || 'pending'} onLogout={logout} />;
  }

  return (
    <div className="h-screen bg-slate-50 flex overflow-hidden relative">
      <ProfileModal isOpen={showProfileModal} onClose={() => setShowProfileModal(false)} />
      
      {/* Mobile Overlay */}
      <AnimatePresence>
        {isMobile && isSidebarOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={() => setIsSidebarOpen(false)}
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-40"
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <motion.aside 
        initial={false}
        animate={{ 
          width: isSidebarOpen ? 288 : 0,
          x: isSidebarOpen ? 0 : (isMobile ? -288 : 0),
          opacity: isSidebarOpen ? 1 : (isMobile ? 0 : 0)
        }}
        transition={{ 
          type: "spring", 
          stiffness: 400, 
          damping: 35,
          opacity: { duration: 0.2 }
        }}
        className={cn(
          "bg-white border-r border-slate-200 flex flex-col h-full z-50 shrink-0",
          isMobile ? "fixed left-0 top-0 shadow-2xl overflow-visible" : "overflow-visible"
        )}
      >
        <div className="p-6 border-b border-slate-100 flex items-center justify-between min-w-[288px]">
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold flex items-center gap-2">
              <div className="w-8 h-8 bg-orange-600 rounded-lg flex items-center justify-center text-white">
                <Settings2 size={18} />
              </div>
              <span className="text-black">Organize</span><span className="text-orange-600">App</span>
            </h1>
            <div className="relative" ref={desktopNotificationRef}>
              <button 
                onClick={() => setShowNotifications(!showNotifications)}
                className={cn(
                  "p-2 rounded-lg transition-all relative",
                  notifications.some(n => !n.read) ? "text-orange-600 bg-orange-50" : "text-slate-400 hover:bg-slate-100"
                )}
              >
                <Bell size={20} />
                {notifications.some(n => !n.read) && (
                  <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full border-2 border-white" />
                )}
              </button>
              
              <AnimatePresence>
                {showNotifications && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 10 }}
                    className="absolute left-0 mt-2 w-72 bg-white rounded-2xl shadow-2xl border border-slate-100 z-[60] overflow-hidden"
                  >
                    <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                      <span className="text-sm font-bold text-slate-800">Notificações</span>
                      <button 
                        onClick={() => {
                          setNotifications([]);
                          setShowNotifications(false);
                        }}
                        className="text-[10px] font-bold text-orange-600 uppercase tracking-wider hover:underline"
                      >
                        Limpar tudo
                      </button>
                    </div>
                    <div className="max-h-80 overflow-y-auto">
                      {notifications.length > 0 ? (
                        notifications.map(notif => (
                          <div key={notif.id} className={cn("p-4 border-b border-slate-50 last:border-0", !notif.read && "bg-orange-50/30")}>
                            <p className="text-xs font-bold text-slate-800">{notif.title}</p>
                            <p className="text-xs text-slate-500 mt-1">{notif.message}</p>
                            <p className="text-[10px] text-slate-400 mt-2">{format(notif.time, 'HH:mm')}</p>
                          </div>
                        ))
                      ) : (
                        <div className="p-8 text-center">
                          <Bell size={24} className="mx-auto text-slate-200 mb-2" />
                          <p className="text-xs text-slate-400 font-medium">Nenhuma notificação</p>
                        </div>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
          {!isMobile && (
            <button
              onClick={() => setIsSidebarPinned(!isSidebarPinned)}
              className={cn(
                "p-2 rounded-lg transition-colors",
                isSidebarPinned ? "text-orange-600 bg-orange-50" : "text-slate-400 hover:bg-slate-100"
              )}
              title={isSidebarPinned ? "Desafixar menu" : "Fixar menu"}
            >
              <Pin size={20} className={cn("transition-transform", !isSidebarPinned && "rotate-45")} />
            </button>
          )}
          {isMobile && (
            <button 
              onClick={() => setIsSidebarOpen(false)}
              className="p-2 hover:bg-slate-100 rounded-lg text-slate-400"
            >
              <X size={20} />
            </button>
          )}
        </div>

        <nav className="flex-1 overflow-y-auto p-4 space-y-6 min-w-[288px]">
          {/* Calendar Section */}
          <div>
            <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 px-2">Gestão Pessoal</h2>
            <button
              onClick={() => {
                setActiveView('vision');
                if (isMobile) setIsSidebarOpen(false);
              }}
              className={cn(
                "w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all",
                activeView === 'vision' 
                  ? "bg-orange-50 text-orange-700" 
                  : "text-slate-600 hover:bg-slate-50"
              )}
            >
              <Eye size={18} />
              Visão
            </button>
            <button
              onClick={() => {
                setActiveView('calendar');
                if (isMobile) setIsSidebarOpen(false);
              }}
              className={cn(
                "w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all mt-1",
                activeView === 'calendar' 
                  ? "bg-orange-50 text-orange-700" 
                  : "text-slate-600 hover:bg-slate-50"
              )}
            >
              <CalendarIcon size={18} />
              Agenda
            </button>
            <button
              onClick={() => {
                setActiveView('studies');
                if (isMobile) setIsSidebarOpen(false);
              }}
              className={cn(
                "w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all mt-1",
                activeView === 'studies' 
                  ? "bg-orange-50 text-orange-700" 
                  : "text-slate-600 hover:bg-slate-50"
              )}
            >
              <BookOpen size={18} />
              Estudos
            </button>
            <button
              onClick={() => {
                setActiveView('finance');
                if (isMobile) setIsSidebarOpen(false);
              }}
              className={cn(
                "w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all mt-1",
                activeView === 'finance' 
                  ? "bg-orange-50 text-orange-700" 
                  : "text-slate-600 hover:bg-slate-50"
              )}
            >
              <Wallet size={18} />
              Financeiro
            </button>
            <button
              onClick={() => {
                setActiveView('diet');
                if (isMobile) setIsSidebarOpen(false);
              }}
              className={cn(
                "w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all mt-1",
                activeView === 'diet' 
                  ? "bg-orange-50 text-orange-700" 
                  : "text-slate-600 hover:bg-slate-50"
              )}
            >
              <Dumbbell size={18} />
              Dieta & Treino
            </button>
            <button
              onClick={() => {
                setActiveView('notifications');
                if (isMobile) setIsSidebarOpen(false);
              }}
              className={cn(
                "w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all mt-1",
                activeView === 'notifications' 
                  ? "bg-orange-50 text-orange-700" 
                  : "text-slate-600 hover:bg-slate-50"
              )}
            >
              <Bell size={18} />
              Gestor de Notificação
            </button>
            {isAdmin && (
              <button
                onClick={() => {
                  setActiveView('users');
                  if (isMobile) setIsSidebarOpen(false);
                }}
                className={cn(
                  "w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all mt-1",
                  activeView === 'users' 
                    ? "bg-indigo-50 text-indigo-700" 
                    : "text-slate-600 hover:bg-slate-50"
                )}
              >
                <Users size={18} />
                Usuários
              </button>
            )}
          </div>

          <div>
            <div className="flex items-center justify-between mb-2 px-2">
              <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Projetos</h2>
              <button 
                onClick={() => setShowAddProject(!showAddProject)}
                className="p-1 hover:bg-slate-100 rounded-md text-slate-400 transition-colors"
              >
                <Plus size={16} />
              </button>
            </div>
            
            <AnimatePresence>
              {showAddProject && (
                <motion.div 
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="mb-2 px-2"
                >
                  <div className="flex gap-1">
                    <input 
                      type="text"
                      value={newProjectTitle}
                      onChange={(e) => setNewProjectTitle(e.target.value)}
                      placeholder="Nome do projeto..."
                      className="flex-1 text-sm p-2 border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                      onKeyDown={(e) => e.key === 'Enter' && addProject()}
                      autoFocus
                    />
                    <button 
                      onClick={addProject}
                      className="p-2 bg-orange-500 text-white rounded-md hover:bg-orange-600 transition-colors"
                    >
                      <Check size={16} />
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <div className="space-y-1">
              {data.projects.map(project => (
                <div key={project.id} className="group flex items-center">
                  <button
                    onClick={() => {
                      setActiveProjectId(project.id);
                      setActiveGoalId(null);
                      setActiveView('dashboard');
                      if (isMobile) setIsSidebarOpen(false);
                    }}
                    className={cn(
                      "flex-1 flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all",
                      (activeProjectId === project.id && activeView === 'dashboard')
                        ? "bg-orange-50 text-orange-700" 
                        : "text-slate-600 hover:bg-slate-50"
                    )}
                  >
                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: project.color }} />
                    <span className="truncate">{project.title}</span>
                  </button>
                  <button 
                    onClick={() => deleteProject(project.id)}
                    className="opacity-0 group-hover:opacity-100 p-1.5 text-slate-300 hover:text-red-500 transition-all"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {activeProject && activeView === 'dashboard' && (
            <div>
              <div className="flex items-center justify-between mb-2 px-2">
                <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Metas</h2>
                <button 
                  onClick={() => setShowAddGoal(!showAddGoal)}
                  className="p-1 hover:bg-slate-100 rounded-md text-slate-400 transition-colors"
                >
                  <Plus size={14} />
                </button>
              </div>

              <AnimatePresence>
                {showAddGoal && (
                  <motion.div 
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="mb-2 px-2"
                  >
                    <div className="flex gap-1">
                      <input 
                        type="text"
                        value={newGoalTitle}
                        onChange={(e) => setNewGoalTitle(e.target.value)}
                        placeholder="Nova meta..."
                        className="flex-1 text-sm p-2 border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                        onKeyDown={(e) => e.key === 'Enter' && addGoal()}
                        autoFocus
                      />
                      <button 
                        onClick={addGoal}
                        className="p-2 bg-orange-500 text-white rounded-md hover:bg-orange-600 transition-colors"
                      >
                        <Check size={16} />
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              <div className="space-y-1">
                <button
                  onClick={() => setActiveGoalId(null)}
                  className={cn(
                    "w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all",
                    activeGoalId === null 
                      ? "bg-slate-100 text-slate-900" 
                      : "text-slate-600 hover:bg-slate-50"
                  )}
                >
                  <Layout size={16} />
                  Visão Geral
                </button>
                {projectGoals.map(goal => (
                  <div key={goal.id} className="group flex items-center">
                    <button
                      onClick={() => setActiveGoalId(goal.id)}
                      className={cn(
                        "flex-1 flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all",
                        activeGoalId === goal.id 
                          ? "bg-orange-50 text-orange-700" 
                          : "text-slate-600 hover:bg-slate-50"
                      )}
                    >
                      <GoalIcon size={16} />
                      <span className="truncate">{goal.title}</span>
                    </button>
                    <button 
                      onClick={() => deleteGoal(goal.id)}
                      className="opacity-0 group-hover:opacity-100 p-1.5 text-slate-300 hover:text-red-500 transition-all"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </nav>

        {/* User Profile at Bottom */}
        <div className="p-4 border-t border-slate-100 w-[288px]">
          <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-2xl border border-slate-100">
            <button 
              onClick={() => setShowProfileModal(true)}
              className="w-10 h-10 bg-orange-100 rounded-xl flex items-center justify-center text-orange-600 overflow-hidden hover:ring-2 hover:ring-orange-500 transition-all"
            >
              {userProfile?.photoURL ? (
                <img src={userProfile.photoURL} alt="Avatar" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
              ) : (
                <UserIcon size={20} />
              )}
            </button>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-slate-800 truncate">{userProfile?.displayName || 'Usuário'}</p>
              <p className="text-[10px] font-medium text-slate-400 uppercase tracking-wider truncate">
                {isAdmin ? 'Administrador' : 'Membro'}
              </p>
            </div>
            <button 
              onClick={() => logout()}
              className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
              title="Sair"
            >
              <LogOut size={18} />
            </button>
          </div>
        </div>
      </motion.aside>

      {/* Main Content */}
      <main 
        className="flex-1 overflow-y-auto relative"
        onClick={() => {
          if (isSidebarOpen && !isMobile && !isSidebarPinned) {
            setIsSidebarOpen(false);
          }
        }}
      >
        {/* Top Bar for Mobile/Retracted */}
        <div className="sticky top-0 z-30 bg-slate-50/80 backdrop-blur-md border-b border-slate-200 p-4 flex items-center lg:hidden">
          <button 
            onClick={() => setIsSidebarOpen(true)}
            className="p-2 hover:bg-slate-200 rounded-lg text-slate-600 transition-colors"
          >
            <Menu size={24} />
          </button>
          <div className="ml-4 flex items-center gap-3">
            <h1 className="text-lg font-bold flex items-center gap-2">
              <div className="w-7 h-7 bg-orange-600 rounded-lg flex items-center justify-center text-white">
                <Settings2 size={16} />
              </div>
              <span className="text-black">Organize</span><span className="text-orange-600">App</span>
            </h1>
            <div className="relative" ref={mobileNotificationRef}>
              <button 
                onClick={() => {
                  setActiveView('dashboard');
                  setShowNotifications(!showNotifications);
                }}
                className={cn(
                  "p-2 rounded-lg relative",
                  notifications.some(n => !n.read) ? "text-orange-600 bg-orange-50" : "text-slate-400"
                )}
              >
                <Bell size={20} />
                {notifications.some(n => !n.read) && (
                  <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full border-2 border-white" />
                )}
              </button>

              <AnimatePresence>
                {showNotifications && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 10 }}
                    className="absolute right-0 mt-2 w-72 bg-white rounded-2xl shadow-2xl border border-slate-100 z-[60] overflow-hidden"
                  >
                    <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                      <span className="text-sm font-bold text-slate-800">Notificações</span>
                      <button 
                        onClick={() => {
                          setNotifications([]);
                          setShowNotifications(false);
                        }}
                        className="text-[10px] font-bold text-orange-600 uppercase tracking-wider hover:underline"
                      >
                        Limpar tudo
                      </button>
                    </div>
                    <div className="max-h-80 overflow-y-auto">
                      {notifications.length > 0 ? (
                        notifications.map(notif => (
                          <div key={notif.id} className={cn("p-4 border-b border-slate-50 last:border-0", !notif.read && "bg-orange-50/30")}>
                            <p className="text-xs font-bold text-slate-800">{notif.title}</p>
                            <p className="text-xs text-slate-500 mt-1">{notif.message}</p>
                            <p className="text-[10px] text-slate-400 mt-2">{format(notif.time, 'HH:mm')}</p>
                          </div>
                        ))
                      ) : (
                        <div className="p-8 text-center">
                          <Bell size={24} className="mx-auto text-slate-200 mb-2" />
                          <p className="text-xs text-slate-400 font-medium">Nenhuma notificação</p>
                        </div>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>

        {/* Desktop/Mobile Retract Toggle */}
        <motion.div 
          initial={false}
          animate={{ 
            left: isSidebarOpen ? 320 : 32
          }}
          transition={{ 
            type: "spring", 
            stiffness: 400, 
            damping: 35 
          }}
          className="fixed bottom-8 z-50 hidden lg:flex"
        >
          <button 
            onClick={(e) => {
              e.stopPropagation();
              setIsSidebarOpen(!isSidebarOpen);
            }}
            className="w-14 h-14 bg-orange-500 hover:bg-orange-600 text-white rounded-full flex items-center justify-center shadow-lg hover:shadow-xl transition-all hover:scale-105"
          >
            {isSidebarOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </motion.div>

        <div className="max-w-5xl mx-auto p-4 md:p-8">
          {activeView === 'notifications' ? (
            <div className="max-w-4xl mx-auto">
              <div className="mb-8">
                <h1 className="text-3xl font-bold text-slate-800">Gestor de Notificação</h1>
                <p className="text-slate-500 mt-2">Configure como você deseja receber seus lembretes e alertas.</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm">
                  <div className="flex items-center gap-4 mb-6">
                    <div className="w-12 h-12 rounded-2xl bg-indigo-50 flex items-center justify-center text-indigo-600">
                      <Bell size={24} />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-slate-800">Notificações do Sistema</h3>
                      <p className="text-sm text-slate-500">Receba alertas nativos no seu dispositivo.</p>
                    </div>
                  </div>

                  <div className="space-y-6">
                    <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100">
                      <div className="flex items-center gap-3">
                        <div className={cn(
                          "w-10 h-10 rounded-xl flex items-center justify-center",
                          data.notificationSettings?.browserNotificationsEnabled ? "bg-indigo-100 text-indigo-600" : "bg-slate-200 text-slate-400"
                        )}>
                          <Monitor size={20} />
                        </div>
                        <div>
                          <p className="text-sm font-bold text-slate-700">Notificações no Navegador</p>
                          <p className="text-[10px] text-slate-500">Alertas nativos do Windows, macOS, Android ou iOS.</p>
                        </div>
                      </div>
                      <button
                        disabled={notificationPermissionStatus === 'denied'}
                        onClick={() => {
                          if (data.notificationSettings?.browserNotificationsEnabled) {
                            updateNotificationSettings({
                              ...data.notificationSettings!,
                              browserNotificationsEnabled: false,
                              userId: user.uid
                            });
                            showToast('Notificações desativadas');
                          } else {
                            requestNotificationPermission();
                          }
                        }}
                        className={cn(
                          "w-12 h-6 rounded-full transition-colors relative",
                          data.notificationSettings?.browserNotificationsEnabled ? "bg-indigo-500" : "bg-slate-300",
                          notificationPermissionStatus === 'denied' && "opacity-50 cursor-not-allowed"
                        )}
                      >
                        <div className={cn(
                          "absolute top-1 w-4 h-4 bg-white rounded-full transition-all",
                          data.notificationSettings?.browserNotificationsEnabled ? "right-1" : "left-1"
                        )} />
                      </button>
                    </div>

                    {notificationPermissionStatus === 'denied' && (
                      <div className="bg-red-50 p-4 rounded-xl border border-red-100 flex items-start gap-3">
                        <AlertCircle className="text-red-600 shrink-0" size={18} />
                        <div>
                          <p className="text-xs font-bold text-red-800">Permissão Negada pelo Navegador</p>
                          <p className="text-[10px] text-red-700 mt-1">
                            Você bloqueou as notificações para este site. Para ativar, clique no ícone de cadeado na barra de endereços e mude "Notificações" para "Permitir".
                          </p>
                        </div>
                      </div>
                    )}

                    <div className="bg-amber-50 p-4 rounded-xl border border-amber-100">
                      <p className="text-[10px] text-amber-800 font-medium">
                        ⚠️ <strong>Importante:</strong><br/>
                        Para que as notificações funcionem, você deve permitir que o navegador envie notificações quando solicitado. Se você já negou anteriormente, precisará reativar nas configurações do cadeado na barra de endereços.
                      </p>
                    </div>

                    <button
                      onClick={() => {
                        if (Notification.permission === 'granted') {
                          new Notification("Teste de Notificação", {
                            body: "Se você está vendo isso, as notificações estão funcionando corretamente! 🚀",
                            icon: "/favicon.ico"
                          });
                          showToast('Notificação de teste enviada!');
                        } else {
                          showToast('Ative as notificações primeiro', 'error');
                        }
                      }}
                      className="w-full flex items-center justify-center gap-2 py-3 border-2 border-indigo-500 text-indigo-600 rounded-xl text-sm font-bold hover:bg-indigo-50 transition-all"
                    >
                      Testar Notificação Nativa
                    </button>
                  </div>
                </div>

                <div className="bg-orange-50 p-8 rounded-3xl border border-orange-100">
                  <div className="flex items-center gap-4 mb-6">
                    <div className="w-12 h-12 rounded-2xl bg-orange-100 flex items-center justify-center text-orange-600">
                      <ClockIcon size={24} />
                    </div>
                    <h3 className="text-lg font-bold text-orange-900">Regras de Tempo</h3>
                  </div>
                  
                  <p className="text-sm text-orange-800 mb-6">
                    O sistema dispara alertas automáticos nos seguintes intervalos:
                  </p>

                  <ul className="space-y-3">
                    {['30 minutos antes', '15 minutos antes', '5 minutos antes', 'No horário exato'].map((item, idx) => (
                      <li key={idx} className="flex items-center gap-3 text-sm text-orange-700">
                        <div className="w-1.5 h-1.5 rounded-full bg-orange-400" />
                        {item}
                      </li>
                    ))}
                  </ul>

                  <div className="mt-8 pt-6 border-t border-orange-200">
                    <p className="text-[11px] text-orange-600 italic">
                      Nota: As notificações nativas funcionam mesmo se a aba do sistema não estiver em foco, desde que o navegador esteja aberto.
                    </p>
                  </div>
                </div>
              </div>

              {/* Standard Alerts Section */}
              <div className="mt-12">
                <div className="flex items-center justify-between mb-8">
                  <div>
                    <h2 className="text-2xl font-bold text-slate-800">Alertas Recorrentes</h2>
                    <p className="text-slate-500">Cadastre alertas automáticos (ex: beber água, alongar, remédios).</p>
                  </div>
                  <button
                    onClick={() => setShowAddAlertModal(true)}
                    className="flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-2xl font-bold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200"
                  >
                    <Plus size={20} />
                    Novo Alerta
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {data.standardAlerts?.map((alert) => (
                    <div key={alert.id} className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm hover:shadow-md transition-all group">
                      <div className="flex items-start justify-between mb-4">
                        <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600">
                          <Repeat size={20} />
                        </div>
                        <button
                          onClick={async () => {
                            try {
                              await deleteDoc(doc(db, 'standardAlerts', alert.id!));
                              showToast('Alerta removido');
                            } catch (error) {
                              showToast('Erro ao remover alerta', 'error');
                            }
                          }}
                          className="p-2 text-slate-300 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                      <h3 className="font-bold text-slate-800 mb-2">{alert.description}</h3>
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 text-xs text-slate-500">
                          <Clock size={14} />
                          <span>Ciclo: A cada {alert.cycleMinutes / 60}h</span>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-slate-500">
                          <CalendarRange size={14} />
                          <span>Duração: {alert.duration === 'every_day' ? 'Todos os dias' : 'Apenas hoje'}</span>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-slate-500">
                          <CalendarIcon size={14} />
                          <span>Período: {format(new Date(alert.startDateTime), 'dd/MM HH:mm')} até {format(new Date(alert.endDateTime), 'dd/MM HH:mm')}</span>
                        </div>
                      </div>
                    </div>
                  ))}

                  {data.standardAlerts?.length === 0 && (
                    <div className="col-span-full py-12 text-center bg-slate-50 rounded-3xl border-2 border-dashed border-slate-200">
                      <p className="text-slate-400 font-medium">Nenhum alerta recorrente cadastrado.</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Add Alert Modal */}
              <AnimatePresence>
                {showAddAlertModal && (
                  <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
                    <motion.div
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      className="bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden"
                    >
                      <div className="p-6 border-b border-slate-100 flex items-center justify-between">
                        <h3 className="text-xl font-bold text-slate-800">Novo Alerta Recorrente</h3>
                        <button onClick={() => setShowAddAlertModal(false)} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
                          <X size={20} />
                        </button>
                      </div>
                      <div className="p-6 space-y-4">
                        <div className="space-y-2">
                          <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Descrição do Alerta</label>
                          <input
                            type="text"
                            placeholder="Ex: Hora de beber água"
                            value={newAlert.description}
                            onChange={(e) => setNewAlert(prev => ({ ...prev, description: e.target.value }))}
                            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Ciclo (Horas)</label>
                            <select
                              value={newAlert.cycleMinutes! / 60}
                              onChange={(e) => setNewAlert(prev => ({ ...prev, cycleMinutes: parseInt(e.target.value) * 60 }))}
                              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                            >
                              {[1, 2, 3, 4, 6, 8, 12].map(h => (
                                <option key={h} value={h}>{h}h</option>
                              ))}
                            </select>
                          </div>
                          <div className="space-y-2">
                            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Duração</label>
                            <select
                              value={newAlert.duration}
                              onChange={(e) => setNewAlert(prev => ({ ...prev, duration: e.target.value as any }))}
                              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                            >
                              <option value="every_day">Todos os dias</option>
                              <option value="only_today">Apenas hoje</option>
                            </select>
                          </div>
                        </div>
                        <div className="space-y-2">
                          <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Início</label>
                          <input
                            type="datetime-local"
                            value={newAlert.startDateTime}
                            onChange={(e) => setNewAlert(prev => ({ ...prev, startDateTime: e.target.value }))}
                            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Término</label>
                          <input
                            type="datetime-local"
                            value={newAlert.endDateTime}
                            onChange={(e) => setNewAlert(prev => ({ ...prev, endDateTime: e.target.value }))}
                            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                          />
                        </div>
                      </div>
                      <div className="p-6 bg-slate-50 border-t border-slate-100 flex gap-3">
                        <button
                          onClick={() => setShowAddAlertModal(false)}
                          className="flex-1 py-3 border-2 border-slate-200 text-slate-600 rounded-xl text-sm font-bold hover:bg-white transition-all"
                        >
                          Cancelar
                        </button>
                        <button
                          onClick={async () => {
                            if (!newAlert.description) {
                              showToast('Preencha a descrição', 'error');
                              return;
                            }
                            try {
                              await addDoc(collection(db, 'standardAlerts'), {
                                ...newAlert,
                                userId: user!.uid
                              });
                              setShowAddAlertModal(false);
                              setNewAlert({
                                description: '',
                                cycleMinutes: 120,
                                duration: 'every_day',
                                startDateTime: format(new Date(), "yyyy-MM-dd'T'HH:mm"),
                                endDateTime: format(new Date(), "yyyy-MM-dd'T'HH:mm")
                              });
                              showToast('Alerta cadastrado!');
                            } catch (error) {
                              showToast('Erro ao cadastrar alerta', 'error');
                            }
                          }}
                          className="flex-1 py-3 bg-indigo-600 text-white rounded-xl text-sm font-bold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200"
                        >
                          Cadastrar
                        </button>
                      </div>
                    </motion.div>
                  </div>
                )}
              </AnimatePresence>
            </div>
          ) : activeView === 'vision' ? (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 h-full">
              {/* Primeira Metade: Meu Dia */}
              <div className="flex flex-col h-full overflow-hidden">
                <div className="mb-4 flex items-center justify-between shrink-0">
                  <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                    <div className="w-8 h-8 bg-orange-100 rounded-lg flex items-center justify-center text-orange-600">
                      <CalendarIcon size={18} />
                    </div>
                    Meu Dia
                  </h2>
                  <div className="px-3 py-1 bg-orange-50 text-orange-700 rounded-full text-xs font-bold border border-orange-100">
                    {format(new Date(), "EEEE, d 'de' MMMM", { locale: ptBR })}
                  </div>
                </div>
                <div className="flex-1 overflow-hidden rounded-3xl border border-slate-200 shadow-sm bg-white">
                  <Calendar 
                    appointments={data.appointments}
                    onAddAppointments={addAppointments}
                    onUpdateAppointment={updateAppointment}
                    onToggleAppointment={toggleAppointment}
                    onDeleteAppointment={deleteAppointment}
                    onShowToast={showToast}
                    initialViewType="day"
                    initialDate={new Date()}
                    hideHeader={true}
                  />
                </div>
              </div>

              {/* Segunda Metade: Visão e Objetivos (Placeholder) */}
              <div className="flex flex-col h-full overflow-hidden">
                <div className="mb-4 flex items-center justify-between shrink-0">
                  <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                    <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center text-blue-600">
                      <Eye size={18} />
                    </div>
                    Visão & Objetivos
                  </h2>
                </div>
                <div className="flex-1 bg-white rounded-3xl border border-slate-200 shadow-sm flex flex-col items-center justify-center p-8 text-center">
                  <div className="w-20 h-20 bg-blue-50 rounded-full flex items-center justify-center mb-6 text-blue-500">
                    <Eye size={40} />
                  </div>
                  <h3 className="text-xl font-bold text-slate-900 mb-2">Planejamento de Longo Prazo</h3>
                  <p className="text-slate-500 max-w-sm mx-auto text-sm">
                    Esta área será dedicada ao seu quadro de visão, metas anuais e objetivos de vida. 
                    Em breve você poderá conectar suas tarefas diárias com seu propósito maior.
                  </p>
                  <div className="mt-8 px-4 py-2 bg-blue-50 text-blue-700 rounded-full text-xs font-bold border border-blue-100">
                    Funcionalidade em desenvolvimento
                  </div>
                </div>
              </div>
            </div>
          ) : activeView === 'studies' ? (
            <>
              <header className="mb-8">
                <div className="flex items-center gap-2 text-slate-400 text-sm mb-2">
                  <span>Gestão Pessoal</span>
                  <ChevronRight size={14} />
                  <span className="text-orange-600 font-semibold">Estudos (Pomodoro)</span>
                </div>
                <h2 className="text-3xl font-bold text-slate-900">Foco & Produtividade</h2>
              </header>
              <PomodoroTimer />
            </>
          ) : activeView === 'diet' ? (
            <DietTraining 
              diet={data.diet || []} 
              training={data.training || []} 
              onUpdateDiet={updateDiet} 
              onUpdateTraining={updateTraining} 
            />
          ) : (activeView === 'users' && isAdmin) ? (
            <UserManagement showToast={showToast} />
          ) : activeView === 'finance' ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <div className="w-24 h-24 bg-orange-100 rounded-full flex items-center justify-center mb-6 text-orange-500">
                <Wallet size={48} />
              </div>
              <h2 className="text-3xl font-bold text-slate-900 mb-4">Módulo Financeiro</h2>
              <p className="text-slate-500 max-w-md mx-auto">
                Esta funcionalidade está em desenvolvimento. Em breve você poderá gerenciar suas finanças, receitas e despesas diretamente por aqui.
              </p>
              <div className="mt-8 px-4 py-2 bg-orange-50 text-orange-700 rounded-full text-sm font-medium border border-orange-200">
                Em breve
              </div>
            </div>
          ) : activeView === 'calendar' ? (
            <>
              <header className="mb-8">
                <div className="flex items-center gap-2 text-slate-400 text-sm mb-2">
                  <span>Gestão Pessoal</span>
                  <ChevronRight size={14} />
                  <span className="text-orange-600 font-semibold">Agenda</span>
                </div>
                <h2 className="text-3xl font-bold text-slate-900">Minha Agenda</h2>
              </header>
              <Calendar 
                appointments={calendarAppointments} 
                onAddAppointments={addAppointments}
                onUpdateAppointment={updateAppointment}
                onToggleAppointment={toggleAppointment}
                onDeleteAppointment={deleteAppointment}
                onShowToast={showToast}
              />
            </>
          ) : (
            <>
              {/* Header */}
              <header className="mb-8">
                <div className="flex items-center gap-2 text-slate-400 text-sm mb-2">
                  <span>Projetos</span>
                  <ChevronRight size={14} />
                  <span className="text-slate-600 font-medium">{activeProject?.title}</span>
                  {activeGoalId && (
                    <>
                      <ChevronRight size={14} />
                      <span className="text-orange-600 font-semibold">
                        {data.goals.find(g => g.id === activeGoalId)?.title}
                      </span>
                    </>
                  )}
                </div>
                <h2 className="text-3xl font-bold text-slate-900">
                  {activeGoalId 
                    ? data.goals.find(g => g.id === activeGoalId)?.title 
                    : "Dashboard do Projeto"}
                </h2>
              </header>

              {/* Dashboard Section */}
              {!activeGoalId && (
                <Dashboard 
                  tasks={data.tasks} 
                  projects={data.projects} 
                  goals={data.goals}
                />
              )}

              {/* Tasks Section */}
              <section className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                  <div className="flex items-center gap-4">
                    <h3 className="font-semibold flex items-center gap-2">
                      <ListTodo size={18} className="text-orange-500" />
                      Checklist de Tarefas
                    </h3>
                    <span className="text-xs font-bold px-2 py-1 bg-orange-100 text-orange-700 rounded-full">
                      {filteredTasks.length} {filteredTasks.length === 1 ? 'Tarefa' : 'Tarefas'}
                    </span>
                  </div>
                  <div className="flex items-center bg-slate-200/50 p-1 rounded-lg">
                    <button
                      onClick={() => setTaskViewMode('list')}
                      className={cn(
                        "px-3 py-1.5 text-xs font-medium rounded-md transition-all",
                        taskViewMode === 'list' ? "bg-white text-orange-600 shadow-sm" : "text-slate-500 hover:text-slate-700"
                      )}
                    >
                      Lista
                    </button>
                    <button
                      onClick={() => setTaskViewMode('kanban')}
                      className={cn(
                        "px-3 py-1.5 text-xs font-medium rounded-md transition-all",
                        taskViewMode === 'kanban' ? "bg-white text-orange-600 shadow-sm" : "text-slate-500 hover:text-slate-700"
                      )}
                    >
                      Kanban
                    </button>
                  </div>
                </div>

                <div className="p-6">
                  {activeGoalId ? (
                    <div className="mb-6">
                      <div className="relative flex items-center gap-2">
                        <div className="relative flex-1">
                          <input 
                            type="text"
                            value={newTaskTitle}
                            onChange={(e) => setNewTaskTitle(e.target.value)}
                            placeholder="Adicionar nova tarefa ao checklist..."
                            className="w-full p-4 pl-12 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500 transition-all font-medium"
                            onKeyDown={(e) => e.key === 'Enter' && addTask()}
                          />
                          <Plus size={20} className="absolute left-4 top-1/2 -translate-y-1/2 text-orange-500" />
                        </div>
                        <input
                          type="date"
                          value={newTaskDate}
                          onChange={(e) => setNewTaskDate(e.target.value)}
                          className="p-4 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500 transition-all text-slate-600"
                          onKeyDown={(e) => e.key === 'Enter' && addTask()}
                        />
                        <button 
                          onClick={addTask}
                          className="p-4 bg-orange-500 text-white rounded-xl hover:bg-orange-600 transition-all flex items-center justify-center shadow-lg shadow-orange-100"
                          title="Salvar Tarefa"
                        >
                          <Check size={24} />
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="mb-6 p-4 bg-amber-50 border border-amber-100 rounded-xl text-amber-800 text-sm flex items-center gap-3">
                      <Target size={18} />
                      Selecione uma meta específica na barra lateral para adicionar novas tarefas.
                    </div>
                  )}

                  {taskViewMode === 'kanban' ? (
                    <KanbanBoard 
                      tasks={filteredTasks}
                      onUpdateTaskStatus={updateTaskStatus}
                      onDeleteTask={deleteTask}
                      onToggleTask={toggleTask}
                    />
                  ) : (
                    <div className="space-y-2">
                      <AnimatePresence initial={false}>
                        {filteredTasks.length > 0 ? (
                          filteredTasks
                            .sort((a, b) => (a.completed === b.completed ? b.createdAt - a.createdAt : a.completed ? 1 : -1))
                            .map(task => (
                            <motion.div
                              key={task.id}
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className={cn(
                              "group flex items-center gap-4 p-4 rounded-xl border transition-all cursor-pointer",
                              task.completed 
                                ? "bg-slate-50 border-slate-100 opacity-60" 
                                : "bg-white border-slate-200 hover:border-orange-300 hover:shadow-md"
                            )}
                            onClick={() => toggleTask(task.id)}
                          >
                            <button className={cn(
                              "transition-colors",
                              task.completed ? "text-emerald-500" : "text-slate-300 group-hover:text-orange-400"
                            )}>
                              {task.completed ? <CheckCircle2 size={24} /> : <Circle size={24} />}
                            </button>
                            
                            <div className="flex-1">
                              {editingTaskId === task.id ? (
                                <div className="flex items-center gap-2" onClick={e => e.stopPropagation()}>
                                  <input
                                    type="text"
                                    value={editTaskTitle}
                                    onChange={e => setEditTaskTitle(e.target.value)}
                                    className="flex-1 p-2 border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 text-sm"
                                    autoFocus
                                    onKeyDown={e => e.key === 'Enter' && saveEditTask()}
                                  />
                                  <input
                                    type="date"
                                    value={editTaskDate}
                                    onChange={e => setEditTaskDate(e.target.value)}
                                    className="p-2 border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 text-sm text-slate-600"
                                    onKeyDown={e => e.key === 'Enter' && saveEditTask()}
                                  />
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      saveEditTask();
                                    }}
                                    className="p-2 bg-orange-500 text-white rounded-md hover:bg-orange-600"
                                  >
                                    <CheckCircle2 size={16} />
                                  </button>
                                </div>
                              ) : (
                                <>
                                  <p className={cn(
                                    "font-medium transition-all",
                                    task.completed ? "line-through text-slate-400" : "text-slate-700"
                                  )}>
                                    {task.title}
                                  </p>
                                  <div className="flex items-center gap-2 mt-1">
                                    {!activeGoalId && (
                                      <span className="text-[10px] font-bold text-orange-400 uppercase tracking-wider">
                                        {data.goals.find(g => g.id === task.goalId)?.title}
                                      </span>
                                    )}
                                    {task.dueDate && (
                                      <span className="text-[10px] font-medium text-slate-500 flex items-center gap-1">
                                        <CalendarIcon size={10} />
                                        {new Date(task.dueDate + 'T12:00:00').toLocaleDateString('pt-BR')}
                                      </span>
                                    )}
                                  </div>
                                </>
                              )}
                            </div>

                            {editingTaskId !== task.id && (
                              <div className="flex items-center opacity-0 group-hover:opacity-100 transition-all">
                                <button 
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setEditingTaskId(task.id);
                                    setEditTaskTitle(task.title);
                                    setEditTaskDate(task.dueDate || '');
                                  }}
                                  className="p-2 text-slate-300 hover:text-orange-500 hover:bg-orange-50 rounded-lg transition-all"
                                >
                                  <Pencil size={18} />
                                </button>
                                <button 
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    deleteTask(task.id);
                                  }}
                                  className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                                >
                                  <Trash2 size={18} />
                                </button>
                              </div>
                            )}
                          </motion.div>
                        ))
                      ) : (
                        <div className="text-center py-12">
                          <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-400">
                            <ListTodo size={32} />
                          </div>
                          <p className="text-slate-500 font-medium">Nenhuma tarefa encontrada.</p>
                          <p className="text-slate-400 text-sm">Comece adicionando uma meta e depois suas tarefas.</p>
                        </div>
                      )}
                    </AnimatePresence>
                  </div>
                  )}
                </div>
              </section>
            </>
          )}
        </div>
      </main>
      {/* Toast Notification */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            className={cn(
              "fixed bottom-8 left-1/2 -translate-x-1/2 z-[100] px-6 py-3 rounded-2xl shadow-2xl font-bold text-white flex items-center gap-2",
              toast.type === 'success' ? "bg-emerald-500" : "bg-red-500"
            )}
          >
            {toast.type === 'success' ? <CheckCircle2 size={20} /> : <AlertCircle size={20} />}
            {toast.message}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <PomodoroProvider>
        <ErrorBoundary>
          <MainApp />
        </ErrorBoundary>
      </PomodoroProvider>
    </AuthProvider>
  );
}
