import React, { useMemo, useState } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { Task, Project, Goal } from '../types';
import { CheckCircle2, Circle, Layout, Target, Filter, ChevronDown, X } from 'lucide-react';
import { cn } from '../utils';

interface DashboardProps {
  tasks: Task[];
  projects: Project[];
  goals: Goal[];
}

export const Dashboard: React.FC<DashboardProps> = ({ tasks, projects, goals }) => {
  const [selectedProjectId, setSelectedProjectId] = useState<string>('all');
  const [selectedGoalId, setSelectedGoalId] = useState<string>('all');

  const filteredGoals = useMemo(() => {
    if (selectedProjectId === 'all') return [];
    return goals.filter(g => g.projectId === selectedProjectId);
  }, [goals, selectedProjectId]);

  const filteredTasks = useMemo(() => {
    let result = tasks;
    if (selectedProjectId !== 'all') {
      const projectGoalIds = goals.filter(g => g.projectId === selectedProjectId).map(g => g.id);
      result = result.filter(t => projectGoalIds.includes(t.goalId));
    }
    if (selectedGoalId !== 'all') {
      result = result.filter(t => t.goalId === selectedGoalId);
    }
    return result;
  }, [tasks, goals, selectedProjectId, selectedGoalId]);

  const stats = useMemo(() => {
    const total = filteredTasks.length;
    const completed = filteredTasks.filter(t => t.completed).length;
    const pending = total - completed;
    const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;

    return { total, completed, pending, percentage };
  }, [filteredTasks]);

  const pieData = [
    { name: 'Concluídas', value: stats.completed, color: '#10b981' },
    { name: 'Pendentes', value: stats.pending, color: '#64748b' },
  ];

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200 space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-slate-800 font-black text-sm uppercase tracking-wider">
            <Filter size={18} className="text-orange-500" />
            Filtrar Dashboard
          </div>
          {(selectedProjectId !== 'all' || selectedGoalId !== 'all') && (
            <button 
              onClick={() => {
                setSelectedProjectId('all');
                setSelectedGoalId('all');
              }}
              className="text-xs font-bold text-orange-600 hover:text-orange-700 transition-colors flex items-center gap-1"
            >
              <X size={14} />
              Limpar Filtros
            </button>
          )}
        </div>
        
        <div className="space-y-4">
          {/* Project Selector */}
          <div className="flex flex-col gap-2">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Projeto</label>
            <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-hide">
              <button
                onClick={() => {
                  setSelectedProjectId('all');
                  setSelectedGoalId('all');
                }}
                className={cn(
                  "px-4 py-2 rounded-xl text-sm font-bold transition-all whitespace-nowrap border",
                  selectedProjectId === 'all'
                    ? "bg-orange-500 text-white border-orange-500 shadow-md shadow-orange-100"
                    : "bg-white text-slate-600 border-slate-200 hover:border-orange-200 hover:bg-orange-50/50"
                )}
              >
                Todos os Projetos
              </button>
              {projects.map(p => (
                <button
                  key={p.id}
                  onClick={() => {
                    setSelectedProjectId(p.id);
                    setSelectedGoalId('all');
                  }}
                  className={cn(
                    "px-4 py-2 rounded-xl text-sm font-bold transition-all whitespace-nowrap border",
                    selectedProjectId === p.id
                      ? "bg-orange-500 text-white border-orange-500 shadow-md shadow-orange-100"
                      : "bg-white text-slate-600 border-slate-200 hover:border-orange-200 hover:bg-orange-50/50"
                  )}
                >
                  {p.title}
                </button>
              ))}
            </div>
          </div>

          {/* Goal Selector */}
          {selectedProjectId !== 'all' && (
            <div className="flex flex-col gap-2 animate-in fade-in slide-in-from-top-2 duration-300">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Meta</label>
              <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-hide">
                <button
                  onClick={() => setSelectedGoalId('all')}
                  className={cn(
                    "px-4 py-2 rounded-xl text-sm font-bold transition-all whitespace-nowrap border",
                    selectedGoalId === 'all'
                      ? "bg-slate-800 text-white border-slate-800 shadow-md shadow-slate-100"
                      : "bg-white text-slate-600 border-slate-200 hover:border-slate-300 hover:bg-slate-50/50"
                  )}
                >
                  Visão Geral do Projeto
                </button>
                {filteredGoals.map(g => (
                  <button
                    key={g.id}
                    onClick={() => setSelectedGoalId(g.id)}
                    className={cn(
                      "px-4 py-2 rounded-xl text-sm font-bold transition-all whitespace-nowrap border",
                      selectedGoalId === g.id
                        ? "bg-slate-800 text-white border-slate-800 shadow-md shadow-slate-100"
                        : "bg-white text-slate-600 border-slate-200 hover:border-slate-300 hover:bg-slate-50/50"
                    )}
                  >
                    {g.title}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Summary Cards */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 flex items-center gap-4">
          <div className="p-3 bg-orange-50 rounded-xl text-orange-600">
            <Layout size={24} />
          </div>
          <div>
            <p className="text-sm text-slate-500 font-medium">Total de Tarefas</p>
            <p className="text-2xl font-bold">{stats.total}</p>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 flex items-center gap-4">
          <div className="p-3 bg-emerald-50 rounded-xl text-emerald-600">
            <CheckCircle2 size={24} />
          </div>
          <div>
            <p className="text-sm text-slate-500 font-medium">Concluídas</p>
            <p className="text-2xl font-bold">{stats.completed}</p>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 flex items-center gap-4">
          <div className="p-3 bg-amber-50 rounded-xl text-amber-600">
            <Circle size={24} />
          </div>
          <div>
            <p className="text-sm text-slate-500 font-medium">Pendentes</p>
            <p className="text-2xl font-bold">{stats.pending}</p>
          </div>
        </div>

        {/* Charts */}
        <div className="md:col-span-2 bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Target size={20} className="text-slate-400" />
            Progresso {selectedGoalId !== 'all' ? 'da Meta' : selectedProjectId !== 'all' ? 'do Projeto' : 'Geral'}
          </h3>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 flex flex-col justify-center items-center text-center">
          <div className="relative w-32 h-32 flex items-center justify-center mb-4">
            <svg className="w-full h-full transform -rotate-90">
              <circle
                cx="64"
                cy="64"
                r="58"
                stroke="currentColor"
                strokeWidth="8"
                fill="transparent"
                className="text-slate-100"
              />
              <circle
                cx="64"
                cy="64"
                r="58"
                stroke="currentColor"
                strokeWidth="8"
                fill="transparent"
                strokeDasharray={364.4}
                strokeDashoffset={364.4 - (364.4 * stats.percentage) / 100}
                className="text-emerald-500 transition-all duration-1000 ease-out"
              />
            </svg>
            <span className="absolute text-3xl font-bold">{stats.percentage}%</span>
          </div>
          <p className="text-slate-500 font-medium">Taxa de Conclusão</p>
        </div>
      </div>
    </div>
  );
};
