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
  Utensils
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
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
import { Project, Goal, Task, AppData, Appointment, MealEntry, TrainingEntry } from './types';
import { generateId, cn } from './utils';
import { Dashboard } from './components/Dashboard';
import { Calendar } from './components/Calendar';
import { KanbanBoard } from './components/KanbanBoard';
import { DietTraining } from './components/DietTraining';

const STORAGE_KEY = 'organizer_app_data';

export default function App() {
  const [data, setData] = useState<AppData>(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    const defaultData: AppData = {
      projects: [{ id: 'default', title: 'Meu Primeiro Projeto', color: '#f97316', createdAt: Date.now() }],
      goals: [],
      tasks: [],
      appointments: [],
      diet: [],
      training: []
    };

    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        return {
          ...defaultData,
          ...parsed,
          // Ensure arrays exist even if missing in parsed data
          projects: parsed.projects || defaultData.projects,
          goals: parsed.goals || defaultData.goals,
          tasks: (parsed.tasks || defaultData.tasks).map((t: any) => ({
            ...t,
            status: t.status || (t.completed ? 'done' : 'todo')
          })),
          appointments: (parsed.appointments || defaultData.appointments).map((a: any) => ({
            ...a,
            completed: a.completed ?? false
          })),
          diet: (parsed.diet || defaultData.diet).map((m: any) => ({
            ...m,
            completedDates: m.completedDates || []
          })),
          training: (parsed.training || defaultData.training).map((t: any) => ({
            ...t,
            completedDates: t.completedDates || []
          }))
        };
      } catch (e) {
        console.error("Error parsing saved data", e);
        return defaultData;
      }
    }
    return defaultData;
  });

  const [activeView, setActiveView] = useState<'dashboard' | 'calendar' | 'finance' | 'diet' | 'studies' | 'vision'>('dashboard');
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

  useEffect(() => {
    const checkMobile = () => {
      const mobile = window.innerWidth < 1024;
      setIsMobile(mobile);
      if (mobile) setIsSidebarOpen(false);
      else setIsSidebarOpen(true);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  }, [data]);

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

  const addProject = () => {
    if (!newProjectTitle.trim()) return;
    const newProject: Project = {
      id: generateId(),
      title: newProjectTitle,
      color: '#' + Math.floor(Math.random()*16777215).toString(16),
      createdAt: Date.now()
    };
    setData(prev => ({ ...prev, projects: [...prev.projects, newProject] }));
    setNewProjectTitle('');
    setShowAddProject(false);
    setActiveProjectId(newProject.id);
    setActiveView('dashboard');
    if (isMobile) setIsSidebarOpen(false);
  };

  const addGoal = () => {
    if (!newGoalTitle.trim() || !activeProjectId) return;
    const newGoal: Goal = {
      id: generateId(),
      title: newGoalTitle,
      projectId: activeProjectId,
      createdAt: Date.now()
    };
    setData(prev => ({ ...prev, goals: [...prev.goals, newGoal] }));
    setNewGoalTitle('');
    setShowAddGoal(false);
    setActiveGoalId(newGoal.id);
  };

  const addTask = () => {
    if (!newTaskTitle.trim() || !activeGoalId) return;
    const newTask: Task = {
      id: generateId(),
      title: newTaskTitle,
      completed: false,
      status: 'todo',
      goalId: activeGoalId,
      createdAt: Date.now(),
      dueDate: newTaskDate || undefined
    };
    setData(prev => ({ ...prev, tasks: [...prev.tasks, newTask] }));
    setNewTaskTitle('');
    setNewTaskDate('');
  };

  const saveEditTask = () => {
    if (!editingTaskId || !editTaskTitle.trim()) return;
    setData(prev => ({
      ...prev,
      tasks: prev.tasks.map(t => 
        t.id === editingTaskId 
          ? { ...t, title: editTaskTitle, dueDate: editTaskDate || undefined } 
          : t
      )
    }));
    setEditingTaskId(null);
  };

  const toggleTask = (taskId: string) => {
    setData(prev => ({
      ...prev,
      tasks: prev.tasks.map(t => {
        if (t.id === taskId) {
          const completed = !t.completed;
          return { ...t, completed, status: completed ? 'done' : 'todo' };
        }
        return t;
      })
    }));
  };

  const updateTaskStatus = (taskId: string, status: 'todo' | 'in-progress' | 'done') => {
    setData(prev => ({
      ...prev,
      tasks: prev.tasks.map(t => t.id === taskId ? { ...t, status, completed: status === 'done' } : t)
    }));
  };

  const deleteTask = (taskId: string) => {
    setData(prev => ({ ...prev, tasks: prev.tasks.filter(t => t.id !== taskId) }));
  };

  const deleteGoal = (goalId: string) => {
    setData(prev => ({
      ...prev,
      goals: prev.goals.filter(g => g.id !== goalId),
      tasks: prev.tasks.filter(t => t.goalId !== goalId)
    }));
    if (activeGoalId === goalId) setActiveGoalId(null);
  };

  const deleteProject = (projectId: string) => {
    if (data.projects.length <= 1) return;
    setData(prev => {
      const goalIds = prev.goals.filter(g => g.projectId === projectId).map(g => g.id);
      return {
        ...prev,
        projects: prev.projects.filter(p => p.id !== projectId),
        goals: prev.goals.filter(g => g.projectId !== projectId),
        tasks: prev.tasks.filter(t => !goalIds.includes(t.goalId))
      };
    });
    if (activeProjectId === projectId) setActiveProjectId(data.projects.find(p => p.id !== projectId)?.id || '');
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

  const addAppointments = (appointments: Appointment[]) => {
    setData(prev => ({ ...prev, appointments: [...prev.appointments, ...appointments] }));
  };

  const updateAppointment = (appointment: Appointment) => {
    setData(prev => ({
      ...prev,
      appointments: prev.appointments.map(a => a.id === appointment.id ? appointment : a)
    }));
  };

  const toggleAppointment = (id: string) => {
    setData(prev => {
      // Handle diet virtual appointments
      if (id.startsWith('diet_')) {
        const [, mealId, dateStr] = id.split('_');
        return {
          ...prev,
          diet: prev.diet.map(m => {
            if (m.id === mealId) {
              const completedDates = m.completedDates || [];
              const isCompleted = completedDates.includes(dateStr);
              return {
                ...m,
                completedDates: isCompleted 
                  ? completedDates.filter(d => d !== dateStr)
                  : [...completedDates, dateStr]
              };
            }
            return m;
          })
        };
      }

      // Handle training virtual appointments
      if (id.startsWith('training_')) {
        const [, trainId, dateStr] = id.split('_');
        return {
          ...prev,
          training: prev.training.map(t => {
            if (t.id === trainId) {
              const completedDates = t.completedDates || [];
              const isCompleted = completedDates.includes(dateStr);
              return {
                ...t,
                completedDates: isCompleted 
                  ? completedDates.filter(d => d !== dateStr)
                  : [...completedDates, dateStr]
              };
            }
            return t;
          })
        };
      }

      const isTask = prev.tasks.some(t => t.id === id);
      if (isTask) {
        return {
          ...prev,
          tasks: prev.tasks.map(t => t.id === id ? { ...t, completed: !t.completed } : t)
        };
      }
      return {
        ...prev,
        appointments: prev.appointments.map(a => a.id === id ? { ...a, completed: !a.completed } : a)
      };
    });
  };

  const deleteAppointment = (id: string, deleteAllRecurring?: boolean) => {
    setData(prev => {
      if (deleteAllRecurring) {
        const target = prev.appointments.find(a => a.id === id);
        if (target?.recurrenceId) {
          return {
            ...prev,
            appointments: prev.appointments.filter(a => {
              if (a.recurrenceId === target.recurrenceId) {
                return a.date < target.date; // Keep past ones
              }
              return a.id !== id;
            })
          };
        }
      }
      return { ...prev, appointments: prev.appointments.filter(a => a.id !== id) };
    });
  };

  const updateDiet = (diet: MealEntry[]) => {
    setData(prev => ({ ...prev, diet }));
  };

  const updateTraining = (training: TrainingEntry[]) => {
    setData(prev => ({ ...prev, training }));
  };

  return (
    <div className="min-h-screen bg-slate-50 flex overflow-hidden">
      {/* Mobile Overlay */}
      <AnimatePresence>
        {isMobile && isSidebarOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsSidebarOpen(false)}
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-40 lg:hidden"
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
        className={cn(
          "bg-white border-r border-slate-200 flex flex-col h-screen sticky top-0 z-50 overflow-hidden shrink-0",
          isMobile && "fixed left-0 shadow-2xl"
        )}
      >
        <div className="p-6 border-b border-slate-100 flex items-center justify-between min-w-[288px]">
          <h1 className="text-xl font-bold flex items-center gap-2 text-slate-800">
            <div className="w-8 h-8 bg-orange-600 rounded-lg flex items-center justify-center text-white">
              <Settings2 size={18} />
            </div>
            Organize.me
          </h1>
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
                      className="w-full text-sm p-2 border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                      onKeyDown={(e) => e.key === 'Enter' && addProject()}
                    />
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
                        className="w-full text-sm p-2 border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                        onKeyDown={(e) => e.key === 'Enter' && addGoal()}
                        autoFocus
                      />
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
          <div className="ml-4">
            <h1 className="text-lg font-bold text-slate-800">Organize.me</h1>
          </div>
        </div>

        {/* Desktop Retract Toggle */}
        <div 
          className={cn(
            "hidden lg:flex fixed bottom-8 z-50 transition-all duration-300",
            isSidebarOpen ? "left-[320px]" : "left-8"
          )}
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
        </div>

        <div className="max-w-5xl mx-auto p-4 md:p-8">
          {activeView === 'vision' ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <div className="w-24 h-24 bg-orange-100 rounded-full flex items-center justify-center mb-6 text-orange-500">
                <Eye size={48} />
              </div>
              <h2 className="text-3xl font-bold text-slate-900 mb-4">Visão</h2>
              <p className="text-slate-500 max-w-md mx-auto">
                Esta funcionalidade está em desenvolvimento. Em breve você poderá gerenciar sua visão e objetivos de longo prazo diretamente por aqui.
              </p>
              <div className="mt-8 px-4 py-2 bg-orange-50 text-orange-700 rounded-full text-sm font-medium border border-orange-200">
                Em breve
              </div>
            </div>
          ) : activeView === 'studies' ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <div className="w-24 h-24 bg-orange-100 rounded-full flex items-center justify-center mb-6 text-orange-500">
                <BookOpen size={48} />
              </div>
              <h2 className="text-3xl font-bold text-slate-900 mb-4">Estudos</h2>
              <p className="text-slate-500 max-w-md mx-auto">
                Esta funcionalidade está em desenvolvimento. Em breve você poderá gerenciar seus estudos, cursos e anotações diretamente por aqui.
              </p>
              <div className="mt-8 px-4 py-2 bg-orange-50 text-orange-700 rounded-full text-sm font-medium border border-orange-200">
                Em breve
              </div>
            </div>
          ) : activeView === 'diet' ? (
            <DietTraining 
              diet={data.diet || []} 
              training={data.training || []} 
              onUpdateDiet={updateDiet} 
              onUpdateTraining={updateTraining} 
            />
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
                  tasks={data.tasks.filter(t => projectGoals.map(g => g.id).includes(t.goalId))} 
                  projects={data.projects} 
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
    </div>
  );
}
