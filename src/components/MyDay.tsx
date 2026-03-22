import React from 'react';
import { 
  format, 
  isSameDay, 
  parseISO 
} from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { 
  Clock, 
  Tag,
  CheckCircle2,
  Circle,
  Repeat,
  Calendar as CalendarIcon,
  Plus,
  Edit2,
  Trash2,
  Coffee,
  Briefcase,
  CheckSquare,
  FolderPlus,
  Utensils,
  Dumbbell,
  BookOpen
} from 'lucide-react';
import { Appointment, AppointmentCategory } from '../types';
import { cn } from '../utils';

interface MyDayProps {
  appointments: Appointment[];
  onToggleAppointment: (id: string) => void;
  onAddClick: (date: Date) => void;
  onEditClick: (appointment: Appointment) => void;
  onDeleteClick: (appointment: Appointment) => void;
}

const CATEGORIES: { value: AppointmentCategory; label: string; icon: any; color: string }[] = [
  { value: 'routine', label: 'Rotina', icon: Coffee, color: 'text-orange-500 bg-orange-50' },
  { value: 'appointment', label: 'Compromissos', icon: Briefcase, color: 'text-orange-500 bg-orange-50' },
  { value: 'task', label: 'Tarefas', icon: CheckSquare, color: 'text-emerald-500 bg-emerald-50' },
  { value: 'project', label: 'Projeto', icon: FolderPlus, color: 'text-blue-500 bg-blue-50' },
  { value: 'diet', label: 'Alimentação', icon: Utensils, color: 'text-rose-500 bg-rose-50' },
  { value: 'training', label: 'Treino', icon: Dumbbell, color: 'text-indigo-500 bg-indigo-50' },
  { value: 'study', label: 'Estudo', icon: BookOpen, color: 'text-amber-500 bg-amber-50' },
];

export const MyDay: React.FC<MyDayProps> = ({ 
  appointments, 
  onToggleAppointment,
  onAddClick,
  onEditClick,
  onDeleteClick
}) => {
  const today = new Date();
  const todayAppointments = appointments
    .filter(app => isSameDay(parseISO(app.date), today))
    .sort((a, b) => a.time.localeCompare(b.time));

  return (
    <div className="flex flex-col h-full bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-sm">
      <div className="p-6 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-orange-600 rounded-2xl flex flex-col items-center justify-center text-white shadow-lg shadow-orange-200">
            <span className="text-[10px] font-bold uppercase">{format(today, 'MMM', { locale: ptBR })}</span>
            <span className="text-xl font-bold">{format(today, 'd')}</span>
          </div>
          <div>
            <h4 className="text-xl font-bold text-slate-800 capitalize">
              Meu Dia
            </h4>
            <p className="text-xs text-slate-500 font-medium">{todayAppointments.length} registros para hoje</p>
          </div>
        </div>
        <button 
          onClick={() => onAddClick(today)}
          className="p-2 bg-orange-600 text-white rounded-xl hover:bg-orange-700 transition-all shadow-sm"
        >
          <Plus size={20} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-4">
        {todayAppointments.length > 0 ? (
          todayAppointments.map(app => {
            const cat = CATEGORIES.find(c => c.value === app.category);
            const Icon = cat?.icon || Tag;
            return (
              <div 
                key={app.id} 
                className={cn(
                  "bg-white p-4 rounded-2xl border border-slate-200 shadow-sm transition-all group relative flex items-start gap-3",
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
                  {app.completed ? <CheckCircle2 size={20} /> : <Circle size={20} />}
                </button>

                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2 mb-1">
                    <span className="text-[10px] font-bold text-orange-600 bg-orange-50 px-1.5 py-0.5 rounded flex items-center gap-1">
                      <Clock size={12} />
                      {app.time}
                    </span>
                    {cat && (
                      <span className={cn(
                        "text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full flex items-center gap-1",
                        cat.color
                      )}>
                        <Icon size={10} />
                        {cat.label}
                      </span>
                    )}
                  </div>
                  <h6 className={cn(
                    "text-sm font-bold text-slate-800",
                    app.completed && "line-through text-slate-400"
                  )}>
                    {app.title}
                  </h6>
                </div>

                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all shrink-0">
                  <button 
                    onClick={() => onEditClick(app)}
                    className="p-1.5 text-slate-400 hover:text-orange-600 hover:bg-orange-50 rounded-lg transition-all"
                  >
                    <Edit2 size={14} />
                  </button>
                  <button 
                    onClick={() => onDeleteClick(app)}
                    className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            );
          })
        ) : (
          <div className="py-12 border-2 border-dashed border-slate-100 rounded-3xl flex flex-col items-center justify-center text-slate-300">
            <CalendarIcon size={40} className="mb-3 opacity-20" />
            <span className="text-sm font-bold">Nada previsto para hoje</span>
            <button 
              onClick={() => onAddClick(today)}
              className="mt-2 text-xs text-orange-600 font-bold hover:underline"
            >
              Adicionar agora
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
