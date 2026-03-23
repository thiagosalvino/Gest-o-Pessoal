import { Coffee, Briefcase, CheckSquare, FolderPlus, Utensils, Dumbbell, BookOpen } from 'lucide-react';
import { AppointmentCategory } from './types';

export const CATEGORIES: { value: AppointmentCategory; label: string; icon: any; color: string }[] = [
  { value: 'routine', label: 'Rotina', icon: Coffee, color: 'text-orange-500 bg-orange-50' },
  { value: 'appointment', label: 'Compromissos', icon: Briefcase, color: 'text-orange-500 bg-orange-50' },
  { value: 'task', label: 'Tarefas', icon: CheckSquare, color: 'text-emerald-500 bg-emerald-50' },
  { value: 'project', label: 'Projeto', icon: FolderPlus, color: 'text-blue-500 bg-blue-50' },
  { value: 'diet', label: 'Alimentação', icon: Utensils, color: 'text-rose-500 bg-rose-50' },
  { value: 'training', label: 'Treino', icon: Dumbbell, color: 'text-indigo-500 bg-indigo-50' },
  { value: 'study', label: 'Estudo', icon: BookOpen, color: 'text-amber-500 bg-amber-50' },
];
