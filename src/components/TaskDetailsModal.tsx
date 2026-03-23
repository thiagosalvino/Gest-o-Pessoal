import React, { useState, useEffect, useRef } from 'react';
import { Task, ChecklistItem, Project, Goal, AppointmentCategory } from '../types';
import { X, Plus, Trash2, CheckCircle2, Circle, Calendar as CalendarIcon, Clock, Tag } from 'lucide-react';
import { cn, generateId } from '../utils';
import { CATEGORIES } from '../constants';

interface TaskDetailsModalProps {
  task: Task;
  projects: Project[];
  goals: Goal[];
  onClose: () => void;
  onSave: (taskId: string, updates: Partial<Task>) => void;
}

export const TaskDetailsModal: React.FC<TaskDetailsModalProps> = ({ task, projects, goals, onClose, onSave }) => {
  const [title, setTitle] = useState(task.title);
  const [dueDate, setDueDate] = useState(task.dueDate || '');
  const [dueTime, setDueTime] = useState(task.dueTime || '');
  const [category, setCategory] = useState<AppointmentCategory | string>(task.category || 'task');
  const [details, setDetails] = useState(task.details || '');
  const [checklist, setChecklist] = useState<ChecklistItem[]>(task.checklist || []);
  const [newChecklistDesc, setNewChecklistDesc] = useState('');
  const [newChecklistDate, setNewChecklistDate] = useState('');

  const titleRef = useRef(title);
  const dueDateRef = useRef(dueDate);
  const dueTimeRef = useRef(dueTime);
  const categoryRef = useRef(category);
  const detailsRef = useRef(details);
  const checklistRef = useRef(checklist);

  useEffect(() => {
    titleRef.current = title;
    dueDateRef.current = dueDate;
    dueTimeRef.current = dueTime;
    categoryRef.current = category;
    detailsRef.current = details;
    checklistRef.current = checklist;
  }, [title, dueDate, dueTime, category, details, checklist]);

  // Determine if it's a project task and what its category should be
  const goal = goals.find(g => g.id === task.goalId);
  const project = goal ? projects.find(p => p.id === goal.projectId) : null;
  const isProjectTask = !!project;
  const autoCategory = project ? `PROJETO - ${project.title}` : category;

  // Save changes when unmounting
  useEffect(() => {
    return () => {
      onSave(task.id, { 
        title: titleRef.current,
        dueDate: dueDateRef.current || null,
        dueTime: dueTimeRef.current || null,
        category: isProjectTask ? `PROJETO - ${project.title}` : categoryRef.current,
        details: detailsRef.current, 
        checklist: checklistRef.current 
      });
    };
  }, [onSave, task.id, isProjectTask, project]);

  const addChecklistItem = () => {
    if (!newChecklistDesc.trim()) return;
    const newItem: ChecklistItem = {
      id: generateId(),
      description: newChecklistDesc,
      date: newChecklistDate || null,
      completed: false
    };
    setChecklist([...checklist, newItem]);
    setNewChecklistDesc('');
    setNewChecklistDate('');
  };

  const toggleChecklistItem = (id: string) => {
    setChecklist(checklist.map(item => 
      item.id === id ? { ...item, completed: !item.completed } : item
    ));
  };

  const deleteChecklistItem = (id: string) => {
    setChecklist(checklist.filter(item => item.id !== id));
  };

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-xl overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div className="flex-1 mr-4">
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="text-xl font-bold text-slate-800 bg-transparent border-none focus:outline-none focus:ring-0 w-full"
              placeholder="Título da tarefa"
            />
          </div>
          <button 
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-all"
          >
            <X size={20} />
          </button>
        </div>

        <div className="p-6 overflow-y-auto flex-1 space-y-8">
          {/* Informações Básicas */}
          <section className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 block">Data de Entrega</label>
              <div className="relative">
                <input
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500 transition-all text-sm text-slate-600 pl-10"
                />
                <CalendarIcon size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              </div>
            </div>
            <div>
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 block">Hora de Entrega</label>
              <div className="relative">
                <input
                  type="time"
                  value={dueTime}
                  onChange={(e) => setDueTime(e.target.value)}
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500 transition-all text-sm text-slate-600 pl-10"
                />
                <Clock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              </div>
            </div>
            {!isProjectTask && (
              <div className="sm:col-span-2">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 block">Classificação</label>
                <div className="relative">
                  <select
                    value={category as string}
                    onChange={(e) => setCategory(e.target.value as AppointmentCategory)}
                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500 transition-all text-sm text-slate-600 pl-10 appearance-none"
                  >
                    {CATEGORIES.map(cat => (
                      <option key={cat.value} value={cat.value}>{cat.label}</option>
                    ))}
                  </select>
                  <Tag size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                </div>
              </div>
            )}
            {isProjectTask && (
              <div className="sm:col-span-2">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 block">Classificação</label>
                <div className="p-3 bg-orange-50 border border-orange-100 rounded-xl text-orange-700 text-sm font-bold flex items-center gap-2">
                  <Tag size={16} />
                  {autoCategory}
                </div>
              </div>
            )}
          </section>

          {/* Detalhes */}
          <section>
            <h3 className="text-sm font-semibold text-slate-700 mb-3 uppercase tracking-wider">Detalhes da Tarefa</h3>
            <textarea
              value={details}
              onChange={(e) => setDetails(e.target.value)}
              placeholder="Adicione uma descrição mais detalhada..."
              className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500 transition-all min-h-[120px] resize-y"
            />
          </section>

          {/* Checklist */}
          <section>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-slate-700 uppercase tracking-wider">Checklist</h3>
              {checklist.length > 0 && (
                <span className="text-[10px] font-bold px-2 py-1 bg-orange-100 text-orange-700 rounded-full flex items-center gap-1">
                  <CheckCircle2 size={12} />
                  {checklist.length}/{checklist.filter(i => i.completed).length}
                </span>
              )}
            </div>
            
            <div className="flex flex-col sm:flex-row gap-3 mb-4">
              <input
                type="text"
                value={newChecklistDesc}
                onChange={(e) => setNewChecklistDesc(e.target.value)}
                placeholder="Novo item do checklist..."
                className="flex-1 p-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500 transition-all text-sm"
                onKeyDown={(e) => e.key === 'Enter' && addChecklistItem()}
              />
              <input
                type="date"
                value={newChecklistDate}
                onChange={(e) => setNewChecklistDate(e.target.value)}
                className="p-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500 transition-all text-sm text-slate-600 w-full sm:w-auto"
                onKeyDown={(e) => e.key === 'Enter' && addChecklistItem()}
              />
              <button 
                onClick={addChecklistItem}
                className="p-3 bg-slate-800 text-white rounded-xl hover:bg-slate-700 transition-all flex items-center justify-center shrink-0"
              >
                <Plus size={20} />
              </button>
            </div>

            <div className="space-y-2">
              {checklist.map(item => (
                <div 
                  key={item.id} 
                  className={cn(
                    "flex items-center gap-3 p-3 rounded-xl border transition-all group",
                    item.completed ? "bg-slate-50 border-slate-100" : "bg-white border-slate-200 hover:border-orange-200"
                  )}
                >
                  <button 
                    onClick={() => toggleChecklistItem(item.id)}
                    className={cn(
                      "shrink-0 transition-colors",
                      item.completed ? "text-emerald-500" : "text-slate-300 hover:text-orange-400"
                    )}
                  >
                    {item.completed ? <CheckCircle2 size={20} /> : <Circle size={20} />}
                  </button>
                  
                  <div className="flex-1 min-w-0 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <span className={cn(
                      "text-sm font-medium truncate",
                      item.completed ? "line-through text-slate-400" : "text-slate-700"
                    )}>
                      {item.description}
                    </span>
                    {item.date && (
                      <span className="text-xs font-medium px-2 py-1 bg-slate-100 text-slate-500 rounded-md shrink-0 w-fit">
                        {item.date.split('-').reverse().join('/')}
                      </span>
                    )}
                  </div>

                  <button 
                    onClick={() => deleteChecklistItem(item.id)}
                    className="opacity-0 group-hover:opacity-100 p-1.5 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all shrink-0"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
              {checklist.length === 0 && (
                <div className="text-center py-6 text-slate-400 text-sm">
                  Nenhum item no checklist ainda.
                </div>
              )}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
};
