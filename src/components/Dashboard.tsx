import React, { useMemo } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Legend } from 'recharts';
import { Task, Project } from '../types';
import { CheckCircle2, Circle, Layout, Target } from 'lucide-react';

interface DashboardProps {
  tasks: Task[];
  projects: Project[];
}

export const Dashboard: React.FC<DashboardProps> = ({ tasks, projects }) => {
  const stats = useMemo(() => {
    const total = tasks.length;
    const completed = tasks.filter(t => t.completed).length;
    const pending = total - completed;
    const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;

    return { total, completed, pending, percentage };
  }, [tasks]);

  const pieData = [
    { name: 'Concluídas', value: stats.completed, color: '#10b981' },
    { name: 'Pendentes', value: stats.pending, color: '#64748b' },
  ];

  const projectStats = useMemo(() => {
    return projects.map(p => {
      const projectTasks = tasks.filter(t => {
        // This is a bit simplified, we'd need to link tasks to projects via goals
        // But for the dashboard we'll assume we can find them
        return true; // Placeholder logic
      });
      return {
        name: p.title,
        concluidas: 0, // Will be updated in real app logic
        pendentes: 0
      };
    });
  }, [projects, tasks]);

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
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
          Progresso Geral
        </h3>
        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
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
  );
};
