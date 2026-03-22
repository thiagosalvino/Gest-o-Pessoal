import React, { useState, useMemo } from 'react';
import { 
  format, 
  startOfMonth, 
  endOfMonth, 
  startOfWeek, 
  endOfWeek, 
  eachDayOfInterval, 
  isSameMonth, 
  isSameDay, 
  addMonths, 
  subMonths, 
  addWeeks, 
  subWeeks, 
  addDays, 
  subDays,
  startOfDay,
  parseISO,
  getDay,
  isBefore,
  addYears
} from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { 
  ChevronLeft, 
  ChevronRight, 
  Plus, 
  Clock, 
  AlignLeft, 
  X, 
  Calendar as CalendarIcon,
  Trash2,
  Tag,
  Coffee,
  Briefcase,
  FolderPlus,
  CheckSquare,
  BookOpen,
  Edit2,
  CheckCircle2,
  Circle,
  Repeat,
  Utensils,
  Dumbbell
} from 'lucide-react';
import { Appointment, AppointmentCategory, RecurrenceType } from '../types';
import { generateId, cn } from '../utils';
import { motion, AnimatePresence } from 'motion/react';

interface CalendarProps {
  appointments: Appointment[];
  onAddAppointments: (appointments: Appointment[]) => void;
  onUpdateAppointment: (appointment: Appointment) => void;
  onToggleAppointment: (id: string) => void;
  onDeleteAppointment: (id: string, deleteAllRecurring?: boolean) => void;
  onShowToast?: (message: string, type?: 'success' | 'error') => void;
}

type ViewType = 'month' | 'week' | 'day';

const CATEGORIES: { value: AppointmentCategory; label: string; icon: any; color: string }[] = [
  { value: 'routine', label: 'Rotina', icon: Coffee, color: 'text-orange-500 bg-orange-50' },
  { value: 'appointment', label: 'Compromissos', icon: Briefcase, color: 'text-orange-500 bg-orange-50' },
  { value: 'task', label: 'Tarefas', icon: CheckSquare, color: 'text-emerald-500 bg-emerald-50' },
  { value: 'project', label: 'Projeto', icon: FolderPlus, color: 'text-blue-500 bg-blue-50' },
  { value: 'diet', label: 'Alimentação', icon: Utensils, color: 'text-rose-500 bg-rose-50' },
  { value: 'training', label: 'Treino', icon: Dumbbell, color: 'text-indigo-500 bg-indigo-50' },
  { value: 'study', label: 'Estudo', icon: BookOpen, color: 'text-amber-500 bg-amber-50' },
];

const RECURRENCE_OPTIONS: { value: RecurrenceType; label: string }[] = [
  { value: 'none', label: 'Não se repete' },
  { value: 'daily', label: 'Todos os dias' },
  { value: 'weekly', label: 'Semanalmente' },
  { value: 'custom', label: 'Personalizado' },
];

const WEEK_DAYS = [
  { value: 0, label: 'D' },
  { value: 1, label: 'S' },
  { value: 2, label: 'T' },
  { value: 3, label: 'Q' },
  { value: 4, label: 'Q' },
  { value: 5, label: 'S' },
  { value: 6, label: 'S' },
];

export const Calendar: React.FC<CalendarProps> = ({ 
  appointments, 
  onAddAppointments, 
  onUpdateAppointment,
  onToggleAppointment,
  onDeleteAppointment,
  onShowToast
}) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewType, setViewType] = useState<ViewType>('month');
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [editingAppointment, setEditingAppointment] = useState<Appointment | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<{ id: string, recurrenceId?: string } | null>(null);

  // Form State
  const [newTitle, setNewTitle] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newTime, setNewTime] = useState('12:00');
  const [newCategory, setNewCategory] = useState<AppointmentCategory>('appointment');
  const [recurrenceType, setRecurrenceType] = useState<RecurrenceType>('none');
  const [customDays, setCustomDays] = useState<number[]>([]);

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(monthStart);
  const startDate = startOfWeek(monthStart);
  const endDate = endOfWeek(monthEnd);

  const calendarDays = useMemo(() => {
    return eachDayOfInterval({ start: startDate, end: endDate });
  }, [startDate, endDate]);

  const weekDays = useMemo(() => {
    const start = startOfWeek(currentDate);
    const end = endOfWeek(currentDate);
    return eachDayOfInterval({ start, end });
  }, [currentDate]);

  const handlePrev = () => {
    if (viewType === 'month') setCurrentDate(subMonths(currentDate, 1));
    else if (viewType === 'week') setCurrentDate(subWeeks(currentDate, 1));
    else setCurrentDate(subDays(currentDate, 1));
  };

  const handleNext = () => {
    if (viewType === 'month') setCurrentDate(addMonths(currentDate, 1));
    else if (viewType === 'week') setCurrentDate(addWeeks(currentDate, 1));
    else setCurrentDate(addDays(currentDate, 1));
  };

  const handleAddClick = (date: Date, category?: AppointmentCategory) => {
    setSelectedDate(date);
    setEditingAppointment(null);
    setNewTitle('');
    setNewDesc('');
    setNewTime('12:00');
    setRecurrenceType('none');
    setCustomDays([]);
    if (category) setNewCategory(category);
    else setNewCategory('appointment');
    setShowAddModal(true);
  };

  const handleEditClick = (appointment: Appointment) => {
    setEditingAppointment(appointment);
    setSelectedDate(parseISO(appointment.date));
    setNewTitle(appointment.title);
    setNewDesc(appointment.description);
    setNewTime(appointment.time);
    setNewCategory(appointment.category);
    setRecurrenceType(appointment.recurrence?.type || 'none');
    setCustomDays(appointment.recurrence?.daysOfWeek || []);
    setShowAddModal(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) {
      onShowToast?.('Por favor, insira um título', 'error');
      return;
    }
    if (!selectedDate) return;

    console.log('Submitting appointment for date:', selectedDate);

    if (editingAppointment) {
      const updatedApp: Appointment = {
        ...editingAppointment,
        title: newTitle,
        description: newDesc || '',
        time: newTime,
        category: newCategory,
        date: format(selectedDate, 'yyyy-MM-dd'),
        completed: editingAppointment.completed || false,
      };

      if (recurrenceType !== 'none') {
        updatedApp.recurrence = { type: recurrenceType };
        if (recurrenceType === 'custom') {
          updatedApp.recurrence.daysOfWeek = customDays;
        } else if (recurrenceType === 'weekly') {
          updatedApp.recurrence.daysOfWeek = [getDay(selectedDate)];
        }
      } else {
        delete updatedApp.recurrence;
      }

      onUpdateAppointment(updatedApp);
    } else {
      // Create instances based on recurrence
      const instances: Appointment[] = [];
      const baseId = generateId();
      
      const createInstance = (date: Date) => {
        const app: any = {
          id: generateId(),
          title: newTitle,
          description: newDesc || '',
          date: format(date, 'yyyy-MM-dd'),
          time: newTime,
          category: newCategory,
          completed: false,
          createdAt: Date.now()
        };
        
        if (recurrenceType !== 'none') {
          app.recurrence = { type: recurrenceType };
          if (recurrenceType === 'custom') {
            app.recurrence.daysOfWeek = customDays;
          } else if (recurrenceType === 'weekly') {
            app.recurrence.daysOfWeek = [getDay(selectedDate)];
          }
        }
        
        return app as Appointment;
      };

      if (recurrenceType === 'none') {
        onAddAppointments([createInstance(selectedDate)]);
      } else {
        // Generate for 3 months
        const endDate = addMonths(selectedDate, 3);
        let current = selectedDate;
        const recurrenceId = generateId();

        while (isBefore(current, endDate) || isSameDay(current, endDate)) {
          let shouldAdd = false;
          if (recurrenceType === 'daily') shouldAdd = true;
          else if (recurrenceType === 'weekly') {
            if (getDay(current) === getDay(selectedDate)) shouldAdd = true;
          } else if (recurrenceType === 'custom') {
            if (customDays.includes(getDay(current))) shouldAdd = true;
          }

          if (shouldAdd) {
            instances.push({
              ...createInstance(current),
              recurrenceId
            });
          }
          current = addDays(current, 1);
        }
        onAddAppointments(instances);
      }
    }

    setNewTitle('');
    setNewDesc('');
    setNewTime('12:00');
    setNewCategory('appointment');
    setRecurrenceType('none');
    setCustomDays([]);
    setEditingAppointment(null);
    setShowAddModal(false);
  };

  const getAppointmentsForDay = (date: Date) => {
    return appointments.filter(app => isSameDay(parseISO(app.date), date));
  };

  const handleDeleteClick = (app: Appointment) => {
    if (app.recurrenceId) {
      setShowDeleteConfirm({ id: app.id, recurrenceId: app.recurrenceId });
    } else {
      onDeleteAppointment(app.id);
    }
  };

  const confirmDelete = (deleteAll: boolean) => {
    if (showDeleteConfirm) {
      onDeleteAppointment(showDeleteConfirm.id, deleteAll);
      setShowDeleteConfirm(null);
    }
  };

  const getCategoryIcon = (category: AppointmentCategory) => {
    const cat = CATEGORIES.find(c => c.value === category);
    return cat ? cat.icon : Tag;
  };

  const handleDaySelect = (date: Date) => {
    setCurrentDate(date);
    setViewType('day');
    handleAddClick(date);
  };

  const toggleCustomDay = (day: number) => {
    setCustomDays(prev => 
      prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day]
    );
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden flex flex-col h-[calc(100vh-200px)]">
      {/* Header */}
      <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
        <div className="flex items-center gap-4">
          <h3 className="text-lg font-bold text-slate-800 capitalize">
            {format(currentDate, 'MMMM yyyy', { locale: ptBR })}
          </h3>
          <div className="flex items-center bg-white border border-slate-200 rounded-lg p-1">
            <button 
              onClick={handlePrev}
              className="p-1.5 hover:bg-slate-50 rounded-md text-slate-600 transition-colors"
            >
              <ChevronLeft size={18} />
            </button>
            <button 
              onClick={() => setCurrentDate(new Date())}
              className="px-3 py-1 text-xs font-bold text-slate-500 hover:text-orange-600 transition-colors"
            >
              Hoje
            </button>
            <button 
              onClick={handleNext}
              className="p-1.5 hover:bg-slate-50 rounded-md text-slate-600 transition-colors"
            >
              <ChevronRight size={18} />
            </button>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex bg-slate-100 p-1 rounded-xl">
            {(['month', 'week', 'day'] as ViewType[]).map((type) => (
              <button
                key={type}
                onClick={() => setViewType(type)}
                className={cn(
                  "px-4 py-1.5 text-xs font-bold rounded-lg transition-all",
                  viewType === type 
                    ? "bg-white text-orange-600 shadow-sm" 
                    : "text-slate-500 hover:text-slate-700"
                )}
              >
                {type === 'month' ? 'Mês' : type === 'week' ? 'Semana' : 'Dia'}
              </button>
            ))}
          </div>
          <button 
            onClick={() => handleAddClick(new Date())}
            className="flex items-center gap-2 bg-orange-600 text-white px-4 py-2 rounded-xl text-sm font-bold hover:bg-orange-700 transition-all shadow-sm"
          >
            <Plus size={18} />
            Novo
          </button>
        </div>
      </div>

      {/* Calendar Content */}
      <div className="flex-1 overflow-y-auto">
        {viewType === 'month' && (
          <div className="grid grid-cols-7 h-full min-h-[600px]">
            {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map(day => (
              <div key={day} className="p-3 text-center text-xs font-bold text-slate-400 uppercase border-b border-slate-100">
                {day}
              </div>
            ))}
            {calendarDays.map((day, idx) => {
              const dayAppointments = getAppointmentsForDay(day);
              return (
                <div 
                  key={idx} 
                  onClick={() => handleDaySelect(day)}
                  className={cn(
                    "min-h-[120px] p-2 border-r border-b border-slate-100 transition-colors cursor-pointer hover:bg-slate-50/50",
                    !isSameMonth(day, monthStart) && "bg-slate-50/30 text-slate-300",
                    isSameDay(day, new Date()) && "bg-orange-50/20"
                  )}
                >
                  <div className="flex justify-between items-start mb-1">
                    <span className={cn(
                      "text-sm font-bold w-7 h-7 flex items-center justify-center rounded-full",
                      isSameDay(day, new Date()) ? "bg-orange-600 text-white" : "text-slate-600"
                    )}>
                      {format(day, 'd')}
                    </span>
                  </div>
                  <div className="space-y-1">
                    {dayAppointments.slice(0, 3).map(app => {
                      const Icon = getCategoryIcon(app.category);
                      return (
                        <div 
                          key={app.id}
                          className={cn(
                            "text-[10px] p-1 bg-orange-50 text-orange-700 rounded border border-orange-100 truncate font-medium flex items-center gap-1",
                            app.completed && "line-through opacity-50"
                          )}
                        >
                          <Icon size={10} />
                          {app.time} {app.title}
                        </div>
                      );
                    })}
                    {dayAppointments.length > 3 && (
                      <div className="text-[10px] text-slate-400 text-center font-bold">
                        + {dayAppointments.length - 3} mais
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {viewType === 'week' && (
          <div className="grid grid-cols-7 h-full">
            {weekDays.map((day, idx) => {
              const dayAppointments = getAppointmentsForDay(day);
              return (
                <div key={idx} className="border-r border-slate-100 flex flex-col">
                  <div className={cn(
                    "p-4 text-center border-b border-slate-100",
                    isSameDay(day, new Date()) ? "bg-orange-50/30" : "bg-slate-50/30"
                  )}>
                    <p className="text-xs font-bold text-slate-400 uppercase mb-1">
                      {format(day, 'EEE', { locale: ptBR })}
                    </p>
                    <p className={cn(
                      "text-xl font-bold",
                      isSameDay(day, new Date()) ? "text-orange-600" : "text-slate-700"
                    )}>
                      {format(day, 'd')}
                    </p>
                  </div>
                  <div className="flex-1 p-2 space-y-3 overflow-y-auto">
                    {CATEGORIES.map(cat => {
                      const catApps = dayAppointments.filter(a => a.category === cat.value);
                      if (catApps.length === 0) return null;
                      const Icon = cat.icon;
                      
                      return (
                        <div key={cat.value} className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
                          <div className={cn("px-2 py-1 flex items-center gap-1 border-b border-slate-100", cat.color)}>
                            <Icon size={10} />
                            <span className="text-[10px] font-bold uppercase tracking-wider">{cat.label}</span>
                          </div>
                          <div className="p-1.5 space-y-1">
                            {catApps.sort((a, b) => a.time.localeCompare(b.time)).map(app => (
                              <div key={app.id} className="group flex items-center justify-between gap-1 p-1 hover:bg-slate-50 rounded transition-colors">
                                <div className="flex items-center gap-1 min-w-0">
                                  <button 
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      onToggleAppointment(app.id);
                                    }}
                                    className={cn(
                                      "shrink-0 transition-colors",
                                      app.completed ? "text-emerald-500" : "text-slate-300 hover:text-orange-400"
                                    )}
                                  >
                                    {app.completed ? <CheckCircle2 size={12} /> : <Circle size={12} />}
                                  </button>
                                  <span className={cn(
                                    "text-[10px] font-medium truncate",
                                    app.completed ? "line-through text-slate-400" : "text-slate-700"
                                  )}>
                                    <span className="text-orange-600 font-bold mr-1">{app.time}</span>
                                    {app.title}
                                    {app.recurrence && app.recurrence.type !== 'none' && (
                                      <Repeat size={8} className="inline ml-1 text-slate-400" />
                                    )}
                                  </span>
                                </div>
                                {app.category !== 'project' && app.category !== 'diet' && app.category !== 'training' && (
                                  <div className="flex items-center opacity-0 group-hover:opacity-100 transition-all shrink-0">
                                    <button 
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleEditClick(app);
                                      }}
                                      className="p-0.5 text-slate-300 hover:text-orange-500"
                                    >
                                      <Edit2 size={10} />
                                    </button>
                                    <button 
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleDeleteClick(app);
                                      }}
                                      className="p-0.5 text-slate-300 hover:text-red-500"
                                    >
                                      <Trash2 size={10} />
                                    </button>
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                    <button 
                      onClick={() => handleAddClick(day)}
                      className="w-full py-2 border border-dashed border-slate-200 rounded-lg text-slate-400 hover:text-orange-500 hover:border-orange-200 transition-all flex items-center justify-center"
                    >
                      <Plus size={14} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {viewType === 'day' && (
          <div className="p-4 md:p-8 max-w-4xl mx-auto">
            <div className="flex items-center gap-4 mb-8">
              <div className="w-16 h-16 bg-orange-600 rounded-2xl flex flex-col items-center justify-center text-white shadow-lg shadow-orange-200">
                <span className="text-xs font-bold uppercase">{format(currentDate, 'MMM', { locale: ptBR })}</span>
                <span className="text-2xl font-bold">{format(currentDate, 'd')}</span>
              </div>
              <div>
                <h4 className="text-2xl font-bold text-slate-800 capitalize">
                  {format(currentDate, 'EEEE', { locale: ptBR })}
                </h4>
                <p className="text-slate-500 font-medium">Você tem {getAppointmentsForDay(currentDate).length} registros hoje</p>
              </div>
            </div>

            <div className="space-y-4">
              {getAppointmentsForDay(currentDate).length > 0 ? (
                getAppointmentsForDay(currentDate)
                  .sort((a, b) => a.time.localeCompare(b.time))
                  .map(app => {
                    const cat = CATEGORIES.find(c => c.value === app.category);
                    const Icon = cat?.icon || Tag;
                    return (
                      <div 
                        key={app.id} 
                        className={cn(
                          "bg-white p-4 md:p-6 rounded-2xl border border-slate-200 shadow-sm transition-all group relative flex items-start gap-4",
                          app.completed ? "bg-slate-50 border-slate-100 opacity-60" : "hover:border-orange-200 hover:shadow-md"
                        )}
                      >
                        <button 
                          onClick={() => onToggleAppointment(app.id)}
                          className={cn(
                            "mt-1 transition-colors shrink-0",
                            app.completed ? "text-emerald-500" : "text-slate-300 hover:text-orange-400"
                          )}
                        >
                          {app.completed ? <CheckCircle2 size={24} /> : <Circle size={24} />}
                        </button>

                        <div className="flex-1 min-w-0">
                          <div className="flex flex-wrap items-center gap-2 mb-2">
                            <span className="text-sm font-bold text-orange-600 bg-orange-50 px-2 py-0.5 rounded flex items-center gap-1.5">
                              <Clock size={14} />
                              {app.time}
                            </span>
                            {cat && (
                              <span className={cn(
                                "text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full flex items-center gap-1",
                                cat.color
                              )}>
                                <Icon size={12} />
                                {cat.label}
                              </span>
                            )}
                            {app.recurrence && app.recurrence.type !== 'none' && (
                              <span className="text-[10px] font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full flex items-center gap-1">
                                <Repeat size={10} />
                                {RECURRENCE_OPTIONS.find(o => o.value === app.recurrence?.type)?.label}
                              </span>
                            )}
                          </div>
                          <h6 className={cn(
                            "text-lg font-bold text-slate-800 mb-1",
                            app.completed && "line-through text-slate-400"
                          )}>
                            {app.title}
                          </h6>
                          {app.description && (
                            <p className="text-sm text-slate-500">{app.description}</p>
                          )}
                        </div>

                        {app.category !== 'project' && app.category !== 'diet' && app.category !== 'training' && (
                          <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-all shrink-0">
                            <button 
                              onClick={() => handleEditClick(app)}
                              className="p-2 text-slate-400 hover:text-orange-600 hover:bg-orange-50 rounded-xl transition-all"
                            >
                              <Edit2 size={18} />
                            </button>
                            <button 
                              onClick={() => handleDeleteClick(app)}
                              className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
                            >
                              <Trash2 size={18} />
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })
              ) : (
                <div className="py-20 border-2 border-dashed border-slate-100 rounded-3xl flex flex-col items-center justify-center text-slate-300">
                  <CalendarIcon size={48} className="mb-4 opacity-20" />
                  <span className="text-lg font-bold">Nenhum registro para hoje</span>
                  <button 
                    onClick={() => handleAddClick(currentDate)}
                    className="mt-4 text-orange-600 font-bold hover:underline"
                  >
                    Adicionar agora
                  </button>
                </div>
              )}
              
              <button 
                onClick={() => handleAddClick(currentDate)}
                className="w-full py-6 border-2 border-dashed border-slate-200 rounded-2xl text-slate-400 hover:text-orange-500 hover:border-orange-200 transition-all flex items-center justify-center gap-2 mt-4"
              >
                <Plus size={24} />
                <span className="font-bold">Novo Registro</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Modal */}
      <AnimatePresence>
        {showAddModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden"
            >
              <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                <h4 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                  <CalendarIcon size={20} className="text-orange-600" />
                  {editingAppointment ? 'Editar Registro' : 'Novo Registro'}
                </h4>
                <button onClick={() => setShowAddModal(false)} className="p-2 hover:bg-slate-200 rounded-full transition-colors">
                  <X size={20} />
                </button>
              </div>
              <form onSubmit={handleSubmit} className="p-6 space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase mb-2 ml-1">Classificação</label>
                  <div className="grid grid-cols-3 gap-2">
                    {CATEGORIES.filter(cat => cat.value !== 'project' && cat.value !== 'diet' && cat.value !== 'training').map(cat => {
                      const Icon = cat.icon;
                      return (
                        <button
                          key={cat.value}
                          type="button"
                          onClick={() => setNewCategory(cat.value)}
                          className={cn(
                            "flex flex-col items-center gap-2 p-3 rounded-xl border transition-all",
                            newCategory === cat.value 
                              ? "border-orange-500 bg-orange-50 text-orange-700" 
                              : "border-slate-200 text-slate-400 hover:border-slate-300"
                          )}
                        >
                          <Icon size={18} />
                          <span className="text-[10px] font-bold uppercase">{cat.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase mb-1 ml-1">Título</label>
                  <input 
                    autoFocus
                    type="text"
                    required
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    placeholder="Ex: Reunião de Planejamento"
                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500 transition-all font-medium"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase mb-1 ml-1">Data</label>
                    <div className="w-full p-3 bg-slate-100 border border-slate-200 rounded-xl text-slate-500 font-medium flex items-center gap-2">
                      <CalendarIcon size={16} />
                      {selectedDate && format(selectedDate, 'dd/MM/yyyy')}
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase mb-1 ml-1">Hora</label>
                    <div className="relative">
                      <input 
                        type="time"
                        required
                        value={newTime}
                        onChange={(e) => setNewTime(e.target.value)}
                        className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500 transition-all font-medium pl-10"
                      />
                      <Clock size={16} className="absolute left-3.5 top-3.5 text-slate-400" />
                    </div>
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase mb-1 ml-1">Descrição</label>
                  <div className="relative">
                    <textarea 
                      value={newDesc}
                      onChange={(e) => setNewDesc(e.target.value)}
                      placeholder="Detalhes..."
                      rows={3}
                      className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500 transition-all font-medium pl-10"
                    />
                    <AlignLeft size={16} className="absolute left-3.5 top-3.5 text-slate-400" />
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-100">
                  <label className="block text-xs font-bold text-slate-400 uppercase mb-2 ml-1 flex items-center gap-2">
                    <Repeat size={14} />
                    Repetição
                  </label>
                  <div className="grid grid-cols-2 gap-2 mb-3">
                    {RECURRENCE_OPTIONS.map(opt => (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => setRecurrenceType(opt.value)}
                        className={cn(
                          "px-3 py-2 text-xs font-bold rounded-lg border transition-all",
                          recurrenceType === opt.value 
                            ? "border-orange-500 bg-orange-50 text-orange-700" 
                            : "border-slate-200 text-slate-500 hover:border-slate-300"
                        )}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>

                  <AnimatePresence>
                    {recurrenceType === 'custom' && (
                      <motion.div 
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="overflow-hidden"
                      >
                        <p className="text-[10px] font-bold text-slate-400 uppercase mb-2 ml-1">Repetir nos dias:</p>
                        <div className="flex justify-between gap-1">
                          {WEEK_DAYS.map(day => (
                            <button
                              key={day.value}
                              type="button"
                              onClick={() => toggleCustomDay(day.value)}
                              className={cn(
                                "w-8 h-8 rounded-full text-xs font-bold transition-all border",
                                customDays.includes(day.value)
                                  ? "bg-orange-600 border-orange-600 text-white"
                                  : "border-slate-200 text-slate-400 hover:border-slate-300"
                              )}
                            >
                              {day.label}
                            </button>
                          ))}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                  
                  {recurrenceType !== 'none' && !editingAppointment && (
                    <p className="text-[10px] text-amber-600 font-medium mt-3 bg-amber-50 p-2 rounded-lg">
                      * Serão criadas cópias deste registro para os próximos 3 meses.
                    </p>
                  )}
                </div>

                <button 
                  type="submit"
                  className="w-full bg-orange-600 text-white py-4 rounded-2xl font-bold hover:bg-orange-700 transition-all shadow-lg shadow-orange-200 mt-2"
                >
                  {editingAppointment ? 'Salvar Alterações' : 'Salvar Registro'}
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {showDeleteConfirm && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden p-6"
            >
              <div className="flex flex-col items-center text-center">
                <div className="w-16 h-16 bg-red-50 text-red-500 rounded-full flex items-center justify-center mb-4">
                  <Trash2 size={32} />
                </div>
                <h4 className="text-xl font-bold text-slate-800 mb-2">Excluir Registro</h4>
                <p className="text-slate-500 mb-6">
                  Este é um registro recorrente. Deseja excluir apenas este ou todos os registros futuros desta série?
                </p>
                <div className="grid grid-cols-1 gap-3 w-full">
                  <button 
                    onClick={() => confirmDelete(true)}
                    className="w-full bg-red-600 text-white py-3 rounded-xl font-bold hover:bg-red-700 transition-all"
                  >
                    Excluir todos os recorrentes
                  </button>
                  <button 
                    onClick={() => confirmDelete(false)}
                    className="w-full bg-slate-100 text-slate-700 py-3 rounded-xl font-bold hover:bg-slate-200 transition-all"
                  >
                    Excluir apenas este
                  </button>
                  <button 
                    onClick={() => setShowDeleteConfirm(null)}
                    className="w-full bg-white text-slate-400 py-3 rounded-xl font-bold hover:text-slate-600 transition-all"
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
