import React, { useState } from 'react';
import { 
  Plus, 
  Trash2, 
  Clock, 
  Utensils, 
  Dumbbell, 
  ChevronDown, 
  ChevronUp,
  Save,
  X,
  Copy,
  Minimize2,
  Maximize2,
  Pencil
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  MealEntry, 
  TrainingEntry, 
  MealType, 
  TrainingType, 
  MealUnit, 
  TrainingUnit,
  MealItem,
  TrainingItem
} from '../types';
import { generateId, cn } from '../utils';

interface DietTrainingProps {
  diet: MealEntry[];
  training: TrainingEntry[];
  onUpdateDiet: (diet: MealEntry[]) => void;
  onUpdateTraining: (training: TrainingEntry[]) => void;
}

const DAYS_OF_WEEK = [
  'Domingo',
  'Segunda-feira',
  'Terça-feira',
  'Quarta-feira',
  'Quinta-feira',
  'Sexta-feira',
  'Sábado'
];

const MEAL_TYPES: MealType[] = ['Café da manhã', 'Almoço', 'Lanche', 'Janta'];
const TRAINING_TYPES: TrainingType[] = ['Corrida', 'Caminhada', 'Funcional', 'Academia', 'Futebol', 'Cárdio', 'Artes marciais'];
const MEAL_UNITS: MealUnit[] = ['-', 'g', 'kg', 'mg', 'ml', 'L'];
const TRAINING_UNITS: TrainingUnit[] = ['-', 'repetição', 'km', 'm', 'seg', 'min', 'hora'];

export const DietTraining: React.FC<DietTrainingProps> = ({ 
  diet, 
  training, 
  onUpdateDiet, 
  onUpdateTraining 
}) => {
  const [expandedDays, setExpandedDays] = useState<number[]>([new Date().getDay()]);
  const [minimizedSections, setMinimizedSections] = useState<Record<string, boolean>>({});
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [localItemData, setLocalItemData] = useState<{ description: string, quantity: number, unit: any } | null>(null);
  const [showMealModal, setShowMealModal] = useState<{ day: number, editingEntry?: MealEntry } | null>(null);
  const [showTrainingModal, setShowTrainingModal] = useState<{ day: number, editingEntry?: TrainingEntry } | null>(null);
  const [replicateModal, setReplicateModal] = useState<{ type: 'meal' | 'training', entry: any } | null>(null);
  const [selectedDaysToReplicate, setSelectedDaysToReplicate] = useState<number[]>([]);

  const toggleSection = (day: number, type: 'diet' | 'training') => {
    const key = `${day}-${type}`;
    setMinimizedSections(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const toggleDay = (day: number) => {
    setExpandedDays(prev => 
      prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day]
    );
  };

  const handleSaveMeal = (day: number, type: MealType, time: string) => {
    if (showMealModal?.editingEntry) {
      onUpdateDiet(diet.map(m => m.id === showMealModal.editingEntry?.id ? { ...m, type, time } : m));
    } else {
      const newMeal: MealEntry = {
        id: generateId(),
        dayOfWeek: day,
        type,
        time,
        items: [],
        completedDates: []
      };
      onUpdateDiet([...diet, newMeal]);
    }
    setShowMealModal(null);
  };

  const handleSaveTraining = (day: number, type: TrainingType, time: string) => {
    if (showTrainingModal?.editingEntry) {
      onUpdateTraining(training.map(t => t.id === showTrainingModal.editingEntry?.id ? { ...t, type, time } : t));
    } else {
      const newTraining: TrainingEntry = {
        id: generateId(),
        dayOfWeek: day,
        type,
        time,
        items: [],
        completedDates: []
      };
      onUpdateTraining([...training, newTraining]);
    }
    setShowTrainingModal(null);
  };

  const handleDeleteMeal = (id: string) => {
    onUpdateDiet(diet.filter(m => m.id !== id));
  };

  const handleDeleteTraining = (id: string) => {
    onUpdateTraining(training.filter(t => t.id !== id));
  };

  const handleAddItemToMeal = (mealId: string) => {
    const newItemId = generateId();
    const newItem = { id: newItemId, description: '', quantity: 0, unit: '-' as MealUnit };
    onUpdateDiet(diet.map(m => {
      if (m.id === mealId) {
        return {
          ...m,
          items: [...m.items, newItem]
        };
      }
      return m;
    }));
    setEditingItemId(newItemId);
    setLocalItemData({ description: newItem.description, quantity: newItem.quantity, unit: newItem.unit });
  };

  const handleUpdateMealItem = (mealId: string, itemId: string, updates: Partial<MealItem>) => {
    if (localItemData) {
      setLocalItemData(prev => prev ? { ...prev, ...updates } : null);
    }
  };

  const handleBlurMealItem = (mealId: string, itemId: string) => {
    if (localItemData) {
      if (localItemData.description.trim() === '') {
        onUpdateDiet(diet.map(m => {
          if (m.id === mealId) {
            return {
              ...m,
              items: m.items.filter(i => i.id !== itemId)
            };
          }
          return m;
        }));
      } else {
        onUpdateDiet(diet.map(m => {
          if (m.id === mealId) {
            return {
              ...m,
              items: m.items.map(item => item.id === itemId ? { ...item, ...localItemData } : item)
            };
          }
          return m;
        }));
      }
    }
    setEditingItemId(null);
    setLocalItemData(null);
  };

  const handleDeleteMealItem = (mealId: string, itemId: string) => {
    onUpdateDiet(diet.map(m => {
      if (m.id === mealId) {
        return {
          ...m,
          items: m.items.filter(item => item.id !== itemId)
        };
      }
      return m;
    }));
  };

  const handleAddItemToTraining = (trainingId: string) => {
    const newItemId = generateId();
    const newItem = { id: newItemId, description: '', quantity: 0, unit: '-' as TrainingUnit };
    onUpdateTraining(training.map(t => {
      if (t.id === trainingId) {
        return {
          ...t,
          items: [...t.items, newItem]
        };
      }
      return t;
    }));
    setEditingItemId(newItemId);
    setLocalItemData({ description: newItem.description, quantity: newItem.quantity, unit: newItem.unit });
  };

  const handleUpdateTrainingItem = (trainingId: string, itemId: string, updates: Partial<TrainingItem>) => {
    if (localItemData) {
      setLocalItemData(prev => prev ? { ...prev, ...updates } : null);
    }
  };

  const handleBlurTrainingItem = (trainingId: string, itemId: string) => {
    if (localItemData) {
      if (localItemData.description.trim() === '') {
        onUpdateTraining(training.map(t => {
          if (t.id === trainingId) {
            return {
              ...t,
              items: t.items.filter(i => i.id !== itemId)
            };
          }
          return t;
        }));
      } else {
        onUpdateTraining(training.map(t => {
          if (t.id === trainingId) {
            return {
              ...t,
              items: t.items.map(item => item.id === itemId ? { ...item, ...localItemData } : item)
            };
          }
          return t;
        }));
      }
    }
    setEditingItemId(null);
    setLocalItemData(null);
  };

  const handleReplicate = () => {
    if (!replicateModal) return;

    if (replicateModal.type === 'meal') {
      const newMeals: MealEntry[] = selectedDaysToReplicate.map(day => ({
        ...replicateModal.entry,
        id: generateId(),
        dayOfWeek: day,
        items: replicateModal.entry.items.map((item: any) => ({ ...item, id: generateId() })),
        completedDates: []
      }));
      onUpdateDiet([...diet, ...newMeals]);
    } else {
      const newTrainings: TrainingEntry[] = selectedDaysToReplicate.map(day => ({
        ...replicateModal.entry,
        id: generateId(),
        dayOfWeek: day,
        items: replicateModal.entry.items.map((item: any) => ({ ...item, id: generateId() })),
        completedDates: []
      }));
      onUpdateTraining([...training, ...newTrainings]);
    }

    setReplicateModal(null);
    setSelectedDaysToReplicate([]);
  };

  const handleDeleteTrainingItem = (trainingId: string, itemId: string) => {
    onUpdateTraining(training.map(t => {
      if (t.id === trainingId) {
        return {
          ...t,
          items: t.items.filter(item => item.id !== itemId)
        };
      }
      return t;
    }));
  };

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between mb-8">
        <div>
          <h2 className="text-3xl font-bold text-slate-900">Dieta & Treino</h2>
          <p className="text-slate-500">Gerencie sua rotina semanal de saúde</p>
        </div>
      </header>

      <div className="space-y-4">
        {DAYS_OF_WEEK.map((dayName, index) => {
          const dayMeals = diet
            .filter(m => m.dayOfWeek === index)
            .sort((a, b) => a.time.localeCompare(b.time));
          const dayTrainings = training
            .filter(t => t.dayOfWeek === index)
            .sort((a, b) => a.time.localeCompare(b.time));
          const isExpanded = expandedDays.includes(index);

          return (
            <div key={dayName} className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
              <button 
                onClick={() => toggleDay(index)}
                className="w-full px-6 py-4 flex items-center justify-between bg-slate-50/50 hover:bg-slate-50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <span className={cn(
                    "w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm",
                    isExpanded ? "bg-orange-500 text-white" : "bg-slate-200 text-slate-600"
                  )}>
                    {dayName.substring(0, 3)}
                  </span>
                  <h3 className="font-bold text-slate-800">{dayName}</h3>
                </div>
                {isExpanded ? <ChevronUp size={20} className="text-slate-400" /> : <ChevronDown size={20} className="text-slate-400" />}
              </button>

              <AnimatePresence>
                {isExpanded && (
                  <motion.div 
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="p-6 flex flex-col gap-8 border-t border-slate-100">
                      {/* Alimentação */}
                      <div className="space-y-4">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-4">
                            <h4 className="font-bold text-slate-800 flex items-center gap-2 text-lg">
                              <Utensils size={20} className="text-orange-500" />
                              Alimentação
                            </h4>
                            <button 
                              onClick={() => toggleSection(index, 'diet')}
                              className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-md transition-all"
                              title={minimizedSections[`${index}-diet`] ? "Maximizar" : "Minimizar"}
                            >
                              {minimizedSections[`${index}-diet`] ? <Maximize2 size={16} /> : <Minimize2 size={16} />}
                            </button>
                          </div>
                          <button 
                            onClick={() => setShowMealModal({ day: index })}
                            className="p-2 bg-orange-500 text-white rounded-xl hover:bg-orange-600 transition-all flex items-center gap-1.5 text-xs font-bold shadow-sm shadow-orange-100"
                          >
                            <Plus size={14} />
                            Refeição
                          </button>
                        </div>

                        <AnimatePresence>
                          {!minimizedSections[`${index}-diet`] && (
                            <motion.div 
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: 'auto', opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              className="space-y-4 overflow-hidden"
                            >
                              {dayMeals.length > 0 ? dayMeals.map(meal => (
                                <div key={meal.id} className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm hover:shadow-md transition-all space-y-4">
                                  <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-4">
                                      <span className="px-3 py-1.5 bg-orange-50 text-orange-700 rounded-lg text-xs font-black uppercase tracking-wider border border-orange-100">
                                        {meal.type}
                                      </span>
                                      <div className="flex items-center gap-1.5 text-slate-900 font-bold bg-slate-100 px-3 py-1.5 rounded-lg">
                                        <Clock size={16} className="text-slate-500" />
                                        <span className="text-sm">{meal.time}</span>
                                      </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                      <button 
                                        onClick={() => setShowMealModal({ day: index, editingEntry: meal })}
                                        className="p-2 text-slate-400 hover:text-orange-500 hover:bg-orange-50 rounded-lg transition-all"
                                        title="Editar horário/tipo"
                                      >
                                        <Pencil size={18} />
                                      </button>
                                      <button 
                                        onClick={() => setReplicateModal({ type: 'meal', entry: meal })}
                                        className="p-2 text-slate-400 hover:text-blue-500 hover:bg-blue-50 rounded-lg transition-all"
                                        title="Replicar para outros dias"
                                      >
                                        <Copy size={18} />
                                      </button>
                                      <button 
                                        onClick={() => handleDeleteMeal(meal.id)}
                                        className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                                      >
                                        <Trash2 size={18} />
                                      </button>
                                    </div>
                                  </div>

                                  <div className="space-y-3">
                                    {meal.items.length > 0 && (
                                      <div className="hidden md:grid grid-cols-[1fr_80px_100px_64px] gap-3 px-1">
                                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Descrição</span>
                                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Quantidade</span>
                                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Un. Medida</span>
                                        <span></span>
                                      </div>
                                    )}
                                    {meal.items.map(item => (
                                      <div key={item.id}>
                                        {editingItemId === item.id ? (
                                          <div className="grid grid-cols-1 md:grid-cols-[1fr_80px_100px_64px] gap-3 items-center bg-slate-50 p-3 rounded-xl border border-orange-100">
                                            <div className="space-y-1">
                                              <label className="text-[10px] font-bold text-slate-400 uppercase md:hidden">Descrição</label>
                                              <input 
                                                autoFocus
                                                type="text"
                                                value={localItemData?.description || ''}
                                                onChange={(e) => handleUpdateMealItem(meal.id, item.id, { description: e.target.value })}
                                                onKeyDown={(e) => e.key === 'Enter' && handleBlurMealItem(meal.id, item.id)}
                                                placeholder="Ex: Arroz integral"
                                                className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 transition-all font-medium"
                                              />
                                            </div>
                                            <div className="grid grid-cols-2 gap-3">
                                              <div className="space-y-1">
                                                <label className="text-[10px] font-bold text-slate-400 uppercase md:hidden">Qtd</label>
                                                <input 
                                                  type="number"
                                                  value={localItemData?.quantity || ''}
                                                  onChange={(e) => handleUpdateMealItem(meal.id, item.id, { quantity: Number(e.target.value) })}
                                                  placeholder="0"
                                                  className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 transition-all font-medium text-center"
                                                />
                                              </div>
                                              <div className="space-y-1">
                                                <label className="text-[10px] font-bold text-slate-400 uppercase md:hidden">Unidade</label>
                                                <select 
                                                  value={localItemData?.unit || '-'}
                                                  onChange={(e) => handleUpdateMealItem(meal.id, item.id, { unit: e.target.value as MealUnit })}
                                                  className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 transition-all font-medium appearance-none cursor-pointer"
                                                >
                                                  {MEAL_UNITS.map(u => <option key={u} value={u}>{u}</option>)}
                                                </select>
                                              </div>
                                            </div>
                                            <div className="flex items-center justify-end gap-2 mt-2 md:mt-0">
                                              <button 
                                                onClick={() => handleBlurMealItem(meal.id, item.id)}
                                                className="flex-1 md:flex-none flex items-center justify-center gap-2 py-2.5 px-4 bg-emerald-500 text-white rounded-xl text-sm font-bold md:bg-transparent md:text-emerald-500 md:p-1.5 md:hover:bg-emerald-50 transition-all"
                                              >
                                                <Save size={16} />
                                                <span className="md:hidden">Salvar</span>
                                              </button>
                                              <button 
                                                onClick={() => {
                                                  setEditingItemId(null);
                                                  setLocalItemData(null);
                                                }}
                                                className="flex-1 md:flex-none flex items-center justify-center gap-2 py-2.5 px-4 bg-slate-200 text-slate-600 rounded-xl text-sm font-bold md:bg-transparent md:text-slate-300 md:p-1.5 md:hover:text-red-500 transition-all"
                                              >
                                                <X size={16} />
                                                <span className="md:hidden">Cancelar</span>
                                              </button>
                                            </div>
                                          </div>
                                        ) : (
                                          <div 
                                            onClick={() => {
                                              setEditingItemId(item.id);
                                              setLocalItemData({ description: item.description, quantity: item.quantity, unit: item.unit });
                                            }}
                                            className="group grid grid-cols-[1fr_auto_auto] md:grid-cols-[1fr_80px_100px_64px] gap-3 items-center p-3 bg-white border border-slate-200 rounded-xl hover:border-orange-200 hover:shadow-sm transition-all cursor-pointer"
                                          >
                                            <span className="text-sm font-semibold text-slate-700 truncate">{item.description}</span>
                                            <span className="text-sm font-bold text-orange-600 bg-orange-50 px-2 py-1 rounded-lg">{item.quantity} {item.unit}</span>
                                            <div className="flex justify-end gap-2">
                                              <button 
                                                onClick={(e) => {
                                                  e.stopPropagation();
                                                  setEditingItemId(item.id);
                                                  setLocalItemData({ description: item.description, quantity: item.quantity, unit: item.unit });
                                                }}
                                                className="p-1.5 text-slate-300 hover:text-orange-500 transition-all"
                                              >
                                                <Pencil size={14} />
                                              </button>
                                              <button 
                                                onClick={(e) => {
                                                  e.stopPropagation();
                                                  handleDeleteMealItem(meal.id, item.id);
                                                }}
                                                className="p-1.5 text-slate-300 hover:text-red-500 transition-all"
                                              >
                                                <Trash2 size={14} />
                                              </button>
                                            </div>
                                          </div>
                                        )}
                                      </div>
                                    ))}
                                    <button 
                                      onClick={() => handleAddItemToMeal(meal.id)}
                                      className="w-full py-3 border-2 border-dashed border-slate-100 rounded-2xl text-slate-400 hover:text-orange-500 hover:border-orange-200 hover:bg-orange-50/30 transition-all flex items-center justify-center gap-2 text-xs font-bold"
                                    >
                                      <Plus size={16} />
                                      Adicionar item
                                    </button>
                                  </div>
                                </div>
                              )) : (
                                <div className="py-10 text-center text-slate-400 text-sm border-2 border-dashed border-slate-100 rounded-3xl bg-slate-50/50">
                                  Nenhuma refeição planejada para este dia
                                </div>
                              )}
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>

                      {/* Treino */}
                      <div className="space-y-4">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-4">
                            <h4 className="font-bold text-slate-800 flex items-center gap-2 text-lg">
                              <Dumbbell size={20} className="text-emerald-500" />
                              Treino
                            </h4>
                            <button 
                              onClick={() => toggleSection(index, 'training')}
                              className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-md transition-all"
                              title={minimizedSections[`${index}-training`] ? "Maximizar" : "Minimizar"}
                            >
                              {minimizedSections[`${index}-training`] ? <Maximize2 size={16} /> : <Minimize2 size={16} />}
                            </button>
                          </div>
                          <button 
                            onClick={() => setShowTrainingModal({ day: index })}
                            className="p-2 bg-emerald-500 text-white rounded-xl hover:bg-emerald-600 transition-all flex items-center gap-1.5 text-xs font-bold shadow-sm shadow-emerald-100"
                          >
                            <Plus size={14} />
                            Treino
                          </button>
                        </div>

                        <AnimatePresence>
                          {!minimizedSections[`${index}-training`] && (
                            <motion.div 
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: 'auto', opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              className="space-y-4 overflow-hidden"
                            >
                              {dayTrainings.length > 0 ? dayTrainings.map(t => (
                                <div key={t.id} className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm hover:shadow-md transition-all space-y-4">
                                  <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-4">
                                      <span className="px-3 py-1.5 bg-emerald-50 text-emerald-700 rounded-lg text-xs font-black uppercase tracking-wider border border-emerald-100">
                                        {t.type}
                                      </span>
                                      <div className="flex items-center gap-1.5 text-slate-900 font-bold bg-slate-100 px-3 py-1.5 rounded-lg">
                                        <Clock size={16} className="text-slate-500" />
                                        <span className="text-sm">{t.time}</span>
                                      </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                      <button 
                                        onClick={() => setShowTrainingModal({ day: index, editingEntry: t })}
                                        className="p-2 text-slate-400 hover:text-emerald-500 hover:bg-emerald-50 rounded-lg transition-all"
                                        title="Editar horário/tipo"
                                      >
                                        <Pencil size={18} />
                                      </button>
                                      <button 
                                        onClick={() => setReplicateModal({ type: 'training', entry: t })}
                                        className="p-2 text-slate-400 hover:text-emerald-500 hover:bg-emerald-50 rounded-lg transition-all"
                                        title="Replicar para outros dias"
                                      >
                                        <Copy size={18} />
                                      </button>
                                      <button 
                                        onClick={() => handleDeleteTraining(t.id)}
                                        className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                                      >
                                        <Trash2 size={18} />
                                      </button>
                                    </div>
                                  </div>

                                  <div className="space-y-3">
                                    {t.items.length > 0 && (
                                      <div className="hidden md:grid grid-cols-[1fr_80px_100px_64px] gap-3 px-1">
                                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Descrição</span>
                                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Quantidade</span>
                                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Un. Medida</span>
                                        <span></span>
                                      </div>
                                    )}
                                    {t.items.map(item => (
                                      <div key={item.id}>
                                        {editingItemId === item.id ? (
                                          <div className="grid grid-cols-1 md:grid-cols-[1fr_80px_100px_64px] gap-3 items-center bg-slate-50 p-3 rounded-xl border border-emerald-100">
                                            <div className="space-y-1">
                                              <label className="text-[10px] font-bold text-slate-400 uppercase md:hidden">Descrição</label>
                                              <input 
                                                autoFocus
                                                type="text"
                                                value={localItemData?.description || ''}
                                                onChange={(e) => handleUpdateTrainingItem(t.id, item.id, { description: e.target.value })}
                                                onKeyDown={(e) => e.key === 'Enter' && handleBlurTrainingItem(t.id, item.id)}
                                                placeholder="Ex: Agachamento"
                                                className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all font-medium"
                                              />
                                            </div>
                                            <div className="grid grid-cols-2 gap-3">
                                              <div className="space-y-1">
                                                <label className="text-[10px] font-bold text-slate-400 uppercase md:hidden">Qtd</label>
                                                <input 
                                                  type="number"
                                                  value={localItemData?.quantity || ''}
                                                  onChange={(e) => handleUpdateTrainingItem(t.id, item.id, { quantity: Number(e.target.value) })}
                                                  placeholder="0"
                                                  className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all font-medium text-center"
                                                />
                                              </div>
                                              <div className="space-y-1">
                                                <label className="text-[10px] font-bold text-slate-400 uppercase md:hidden">Unidade</label>
                                                <select 
                                                  value={localItemData?.unit || '-'}
                                                  onChange={(e) => handleUpdateTrainingItem(t.id, item.id, { unit: e.target.value as TrainingUnit })}
                                                  className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all font-medium appearance-none cursor-pointer"
                                                >
                                                  {TRAINING_UNITS.map(u => <option key={u} value={u}>{u}</option>)}
                                                </select>
                                              </div>
                                            </div>
                                            <div className="flex items-center justify-end gap-2 mt-2 md:mt-0">
                                              <button 
                                                onClick={() => handleBlurTrainingItem(t.id, item.id)}
                                                className="flex-1 md:flex-none flex items-center justify-center gap-2 py-2.5 px-4 bg-emerald-500 text-white rounded-xl text-sm font-bold md:bg-transparent md:text-emerald-500 md:p-1.5 md:hover:bg-emerald-50 transition-all"
                                              >
                                                <Save size={16} />
                                                <span className="md:hidden">Salvar</span>
                                              </button>
                                              <button 
                                                onClick={() => {
                                                  setEditingItemId(null);
                                                  setLocalItemData(null);
                                                }}
                                                className="flex-1 md:flex-none flex items-center justify-center gap-2 py-2.5 px-4 bg-slate-200 text-slate-600 rounded-xl text-sm font-bold md:bg-transparent md:text-slate-300 md:p-1.5 md:hover:text-red-500 transition-all"
                                              >
                                                <X size={16} />
                                                <span className="md:hidden">Cancelar</span>
                                              </button>
                                            </div>
                                          </div>
                                        ) : (
                                          <div 
                                            onClick={() => {
                                              setEditingItemId(item.id);
                                              setLocalItemData({ description: item.description, quantity: item.quantity, unit: item.unit });
                                            }}
                                            className="group grid grid-cols-[1fr_auto_auto] md:grid-cols-[1fr_80px_100px_64px] gap-3 items-center p-3 bg-white border border-slate-200 rounded-xl hover:border-emerald-200 hover:shadow-sm transition-all cursor-pointer"
                                          >
                                            <span className="text-sm font-semibold text-slate-700 truncate">{item.description}</span>
                                            <span className="text-sm font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-lg">{item.quantity} {item.unit}</span>
                                            <div className="flex justify-end gap-2">
                                              <button 
                                                onClick={(e) => {
                                                  e.stopPropagation();
                                                  setEditingItemId(item.id);
                                                  setLocalItemData({ description: item.description, quantity: item.quantity, unit: item.unit });
                                                }}
                                                className="p-1.5 text-slate-300 hover:text-emerald-500 transition-all"
                                              >
                                                <Pencil size={14} />
                                              </button>
                                              <button 
                                                onClick={(e) => {
                                                  e.stopPropagation();
                                                  handleDeleteTrainingItem(t.id, item.id);
                                                }}
                                                className="p-1.5 text-slate-300 hover:text-red-500 transition-all"
                                              >
                                                <Trash2 size={14} />
                                              </button>
                                            </div>
                                          </div>
                                        )}
                                      </div>
                                    ))}
                                    <button 
                                      onClick={() => handleAddItemToTraining(t.id)}
                                      className="w-full py-3 border-2 border-dashed border-slate-100 rounded-2xl text-slate-400 hover:text-emerald-500 hover:border-emerald-200 hover:bg-emerald-50/30 transition-all flex items-center justify-center gap-2 text-xs font-bold"
                                    >
                                      <Plus size={16} />
                                      Adicionar item
                                    </button>
                                  </div>
                                </div>
                              )) : (
                                <div className="py-10 text-center text-slate-400 text-sm border-2 border-dashed border-slate-100 rounded-3xl bg-slate-50/50">
                                  Nenhum treino planejado para este dia
                                </div>
                              )}
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}
      </div>

      {/* Modals */}
      <AnimatePresence>
        {showMealModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-3xl shadow-xl w-full max-w-md overflow-hidden"
            >
              <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                  <Utensils size={20} className="text-orange-500" />
                  {showMealModal.editingEntry ? 'Editar Refeição' : 'Nova Refeição'} - {DAYS_OF_WEEK[showMealModal.day]}
                </h3>
                <button onClick={() => setShowMealModal(null)} className="p-2 hover:bg-slate-200 rounded-full transition-colors">
                  <X size={20} />
                </button>
              </div>
              <form 
                onSubmit={(e) => {
                  e.preventDefault();
                  const formData = new FormData(e.currentTarget);
                  handleSaveMeal(
                    showMealModal.day, 
                    formData.get('type') as MealType, 
                    formData.get('time') as string
                  );
                }}
                className="p-6 space-y-4"
              >
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase mb-2 ml-1">Tipo de Refeição</label>
                  <select 
                    name="type"
                    defaultValue={showMealModal.editingEntry?.type}
                    className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500 transition-all font-medium"
                    required
                  >
                    {MEAL_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase mb-2 ml-1">Horário</label>
                  <input 
                    type="time"
                    name="time"
                    defaultValue={showMealModal.editingEntry?.time}
                    className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500 transition-all font-medium"
                    required
                  />
                </div>
                <button 
                  type="submit"
                  className="w-full py-4 bg-orange-500 hover:bg-orange-600 text-white rounded-xl font-bold shadow-lg shadow-orange-200 transition-all flex items-center justify-center gap-2"
                >
                  <Save size={20} />
                  Salvar Refeição
                </button>
              </form>
            </motion.div>
          </div>
        )}

        {showTrainingModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-3xl shadow-xl w-full max-w-md overflow-hidden"
            >
              <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                  <Dumbbell size={20} className="text-emerald-500" />
                  {showTrainingModal.editingEntry ? 'Editar Treino' : 'Novo Treino'} - {DAYS_OF_WEEK[showTrainingModal.day]}
                </h3>
                <button onClick={() => setShowTrainingModal(null)} className="p-2 hover:bg-slate-200 rounded-full transition-colors">
                  <X size={20} />
                </button>
              </div>
              <form 
                onSubmit={(e) => {
                  e.preventDefault();
                  const formData = new FormData(e.currentTarget);
                  handleSaveTraining(
                    showTrainingModal.day, 
                    formData.get('type') as TrainingType, 
                    formData.get('time') as string
                  );
                }}
                className="p-6 space-y-4"
              >
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase mb-2 ml-1">Tipo de Treino</label>
                  <select 
                    name="type"
                    defaultValue={showTrainingModal.editingEntry?.type}
                    className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all font-medium"
                    required
                  >
                    {TRAINING_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase mb-2 ml-1">Horário</label>
                  <input 
                    type="time"
                    name="time"
                    defaultValue={showTrainingModal.editingEntry?.time}
                    className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all font-medium"
                    required
                  />
                </div>
                <button 
                  type="submit"
                  className="w-full py-4 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl font-bold shadow-lg shadow-emerald-200 transition-all flex items-center justify-center gap-2"
                >
                  <Save size={20} />
                  Salvar Treino
                </button>
              </form>
            </motion.div>
          </div>
        )}

        {replicateModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-3xl shadow-xl w-full max-w-md overflow-hidden"
            >
              <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                  <Copy size={20} className="text-blue-500" />
                  Replicar {replicateModal.type === 'meal' ? 'Refeição' : 'Treino'}
                </h3>
                <button onClick={() => setReplicateModal(null)} className="p-2 hover:bg-slate-200 rounded-full transition-colors">
                  <X size={20} />
                </button>
              </div>
              <div className="p-6 space-y-6">
                <p className="text-sm text-slate-500">Selecione os dias para os quais deseja copiar este registro:</p>
                <div className="grid grid-cols-2 gap-2">
                  {DAYS_OF_WEEK.map((day, idx) => (
                    <button
                      key={day}
                      onClick={() => {
                        setSelectedDaysToReplicate(prev => 
                          prev.includes(idx) ? prev.filter(d => d !== idx) : [...prev, idx]
                        );
                      }}
                      className={cn(
                        "p-3 rounded-xl text-sm font-bold border transition-all text-left",
                        selectedDaysToReplicate.includes(idx)
                          ? "bg-blue-50 border-blue-200 text-blue-700"
                          : "bg-slate-50 border-slate-200 text-slate-600 hover:border-blue-200"
                      )}
                    >
                      {day}
                    </button>
                  ))}
                </div>
                <button 
                  onClick={handleReplicate}
                  disabled={selectedDaysToReplicate.length === 0}
                  className="w-full py-4 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl font-bold shadow-lg shadow-blue-100 transition-all flex items-center justify-center gap-2"
                >
                  <Copy size={20} />
                  Replicar Selecionados
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
