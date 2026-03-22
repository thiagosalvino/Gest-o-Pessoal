import React, { useState } from 'react';
import { 
  Play, 
  Square, 
  Coffee, 
  Brain, 
  Settings2, 
  CheckCircle2, 
  History, 
  Trash2, 
  FileText, 
  X, 
  Save,
  ChevronLeft,
  ChevronRight,
  AlertCircle
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../utils';
import { usePomodoro } from '../contexts/PomodoroContext';
import { PomodoroClassification, PomodoroNote } from '../types';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export const PomodoroTimer: React.FC = () => {
  const {
    timeLeft, isActive, isBreak, currentCycle, completedCycles,
    studyTime, breakTime, totalCycles, classification, description,
    sessions,
    setStudyTime, setBreakTime, setTotalCycles, setClassification, setDescription,
    toggleTimer, resetTimer, deleteSession, updateSessionNote
  } = usePomodoro();

  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
  const [isNoteModalOpen, setIsNoteModalOpen] = useState(false);
  const [isEditingNote, setIsEditingNote] = useState(false);
  const [noteTitle, setNoteTitle] = useState('');
  const [noteText, setNoteText] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {}
  });
  const itemsPerPage = 10;

  const totalPages = Math.ceil(sessions.length / itemsPerPage);
  const paginatedSessions = sessions.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const progress = isBreak 
    ? (1 - timeLeft / (breakTime * 60)) * 100 
    : (1 - timeLeft / (studyTime * 60)) * 100;

  const formatElapsed = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    if (mins === 0) return `${secs}s`;
    return `${mins}m ${secs}s`;
  };

  const handleRowDoubleClick = (session: any) => {
    setSelectedSessionId(session.id);
    setNoteTitle(session.note?.title || '');
    setNoteText(session.note?.text || '');
    setIsEditingNote(!session.note); // If no note, start in edit mode
    setIsNoteModalOpen(true);
  };

  const handleSaveNote = async () => {
    if (!selectedSessionId) return;
    
    const note: PomodoroNote = {
      id: Math.random().toString(36).substr(2, 9),
      title: noteTitle,
      text: noteText,
      createdAt: new Date().toISOString()
    };
    
    await updateSessionNote(selectedSessionId, note);
    setIsEditingNote(false);
    setIsNoteModalOpen(false);
  };

  const handleDeleteNote = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!selectedSessionId) return;
    
    setConfirmModal({
      isOpen: true,
      title: 'Excluir Anotação',
      message: 'Tem certeza que deseja excluir esta anotação? Esta ação não pode ser desfeita.',
      onConfirm: async () => {
        await updateSessionNote(selectedSessionId, undefined);
        setIsNoteModalOpen(false);
        setConfirmModal(prev => ({ ...prev, isOpen: false }));
      }
    });
  };

  return (
    <div className="w-full max-w-5xl mx-auto space-y-6 animate-in fade-in duration-700 pb-20">
      {/* Timer Display Card */}
      <div className="relative bg-slate-900 rounded-[40px] p-8 md:p-12 shadow-2xl border border-slate-800 overflow-hidden group">
        <div className={cn(
          "absolute inset-0 opacity-20 transition-colors duration-1000",
          isBreak ? "bg-emerald-500/20" : "bg-orange-500/20"
        )} />
        
        <div className="relative z-10 flex flex-col lg:flex-row items-center justify-between gap-12">
          <div className="flex-1 flex flex-col items-center">
            <div className="flex items-center gap-3 mb-6">
              {isBreak ? (
                <div className="flex items-center gap-2 px-4 py-1.5 bg-emerald-500/10 border border-emerald-500/20 rounded-full text-emerald-400 text-xs font-bold uppercase tracking-widest">
                  <Coffee size={14} />
                  Intervalo
                </div>
              ) : (
                <div className="flex items-center gap-2 px-4 py-1.5 bg-orange-500/10 border border-orange-500/20 rounded-full text-orange-400 text-xs font-bold uppercase tracking-widest">
                  <Brain size={14} />
                  Foco Total
                </div>
              )}
            </div>

            <div className={cn(
              "font-digital text-[100px] md:text-[140px] lg:text-[160px] leading-none tracking-tighter tabular-nums transition-colors duration-500",
              isBreak 
                ? "text-emerald-500 drop-shadow-[0_0_30px_rgba(16,185,129,0.4)]" 
                : "text-orange-500 drop-shadow-[0_0_30px_rgba(249,115,22,0.4)]"
            )}>
              {formatTime(timeLeft)}
            </div>

            <div className="mt-8 flex items-center gap-6">
            <button
                onClick={toggleTimer}
                disabled={!description.trim() && !isActive}
                className={cn(
                  "w-16 h-16 md:w-20 md:h-20 rounded-full flex items-center justify-center transition-all duration-300 shadow-lg",
                  isActive 
                    ? "bg-red-500 text-white hover:bg-red-600 shadow-red-500/20" 
                    : isBreak
                      ? "bg-emerald-500 text-white hover:bg-emerald-600 shadow-emerald-500/20"
                      : "bg-orange-500 text-white hover:bg-orange-600 shadow-orange-500/20",
                  !description.trim() && !isActive && "opacity-50 cursor-not-allowed grayscale"
                )}
              >
                {isActive ? <Square className="w-7 h-7 md:w-8 md:h-8" fill="currentColor" /> : <Play className="w-7 h-7 md:w-8 md:h-8 ml-1" fill="currentColor" />}
              </button>
            </div>
          </div>

          <div className="w-full lg:w-64 bg-white/5 backdrop-blur-md rounded-3xl p-6 border border-white/10">
            <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-6">Status da Sessão</h3>
            <div className="space-y-5">
              <div className="flex items-center justify-between">
                <span className="text-slate-400 text-xs font-medium">Ciclo Atual</span>
                <span className="text-lg font-bold text-white">
                  {isActive ? currentCycle : Math.min(completedCycles + 1, totalCycles)} / {totalCycles}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400 text-xs font-medium">Concluídos</span>
                <div className="flex items-center gap-2">
                  <span className="text-lg font-bold text-emerald-400">{completedCycles}</span>
                  <CheckCircle2 size={16} className="text-emerald-500" />
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400 text-xs font-medium">Restantes</span>
                <span className={cn(
                  "text-lg font-bold",
                  isBreak ? "text-emerald-400" : "text-orange-400"
                )}>
                  {totalCycles - completedCycles}
                </span>
              </div>
              
              <div className="pt-4 border-t border-white/5">
                <div className="flex gap-1.5">
                  {Array.from({ length: totalCycles }).map((_, i) => (
                    <div 
                      key={i} 
                      className={cn(
                        "h-1.5 flex-1 rounded-full transition-all duration-500",
                        i < completedCycles 
                          ? "bg-emerald-500" 
                          : i === currentCycle - 1 && isActive 
                            ? isBreak ? "bg-emerald-500 animate-pulse" : "bg-orange-500 animate-pulse" 
                            : "bg-white/10"
                      )}
                    />
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="absolute bottom-0 left-0 w-full h-1.5 bg-slate-800">
          <motion.div 
            className={cn("h-full", isBreak ? "bg-emerald-500" : "bg-orange-500")}
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 1, ease: "linear" }}
          />
        </div>
      </div>

      {/* Configuration Card */}
      <div className="bg-white rounded-[32px] p-6 md:p-8 border border-slate-200 shadow-sm">
        <div className="flex items-center gap-2 mb-6">
          <Settings2 size={18} className="text-orange-500" />
          <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest">Configurações do Ciclo</h3>
        </div>
        
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider ml-1">Classificação</label>
              <select
                value={classification}
                onChange={(e) => setClassification(e.target.value as PomodoroClassification)}
                disabled={isActive}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-orange-500 disabled:opacity-50 transition-all"
              >
                <option value="Estudo">Estudo</option>
                <option value="Trabalho">Trabalho</option>
                <option value="Projetos/Objetivos">Projetos/Objetivos</option>
                <option value="Outros">Outros</option>
              </select>
            </div>
            <div className="space-y-2">
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider ml-1">
                Descrição <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <input 
                  type="text"
                  placeholder="O que você vai focar agora?"
                  value={description}
                  onChange={(e) => setDescription(e.target.value.slice(0, 20))}
                  disabled={isActive}
                  maxLength={20}
                  required
                  className={cn(
                    "w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-orange-500 disabled:opacity-50 transition-all",
                    !description && !isActive && "border-red-200 focus:ring-red-500"
                  )}
                />
                <div className="absolute right-4 top-1/2 -translate-y-1/2 text-[10px] font-bold text-slate-400">
                  {description.length}/20
                </div>
              </div>
              {!description && !isActive && (
                <p className="text-[10px] text-red-500 font-medium ml-1">Campo obrigatório</p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
            <div className="space-y-2">
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider ml-1">Tempo de Estudo (min)</label>
              <input 
                type="number" 
                value={studyTime}
                onChange={(e) => setStudyTime(parseInt(e.target.value) || 1)}
                disabled={isActive}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-orange-500 disabled:opacity-50 transition-all"
              />
            </div>
            <div className="space-y-2">
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider ml-1">Tempo de Intervalo (min)</label>
              <input 
                type="number" 
                value={breakTime}
                onChange={(e) => setBreakTime(parseInt(e.target.value) || 1)}
                disabled={isActive}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-orange-500 disabled:opacity-50 transition-all"
              />
            </div>
            <div className="space-y-2">
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider ml-1">Quantidade de Ciclos</label>
              <input 
                type="number" 
                value={totalCycles}
                onChange={(e) => setTotalCycles(parseInt(e.target.value) || 1)}
                disabled={isActive}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-orange-500 disabled:opacity-50 transition-all"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Activity Log Card */}
      <div className="bg-white rounded-[32px] p-6 md:p-8 border border-slate-200 shadow-sm overflow-hidden">
        <div className="flex items-center gap-2 mb-6">
          <History size={18} className="text-slate-400" />
          <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest">Registro de Atividades</h3>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-100">
                <th className="py-4 px-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Data</th>
                <th className="py-4 px-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Classificação</th>
                <th className="py-4 px-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Configurado</th>
                <th className="py-4 px-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Ciclos</th>
                <th className="py-4 px-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Tempo Focado</th>
                <th className="py-4 px-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Tempo Real</th>
                <th className="py-4 px-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Descrição</th>
                <th className="py-4 px-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Status</th>
                <th className="py-4 px-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Ações</th>
              </tr>
            </thead>
            <tbody>
              {paginatedSessions.length > 0 ? (
                paginatedSessions.map((session) => (
                  <tr 
                    key={session.id} 
                    onDoubleClick={() => handleRowDoubleClick(session)}
                    className="group border-b border-slate-50 hover:bg-slate-50/50 transition-colors cursor-pointer select-none"
                    title="Clique duplo para ver anotações"
                  >
                    <td className="py-4 px-4">
                      <div className="text-xs font-medium text-slate-600">
                        {format(new Date(session.createdAt), "dd/MM/yyyy", { locale: ptBR })}
                      </div>
                      <div className="text-[10px] text-slate-400">
                        {format(new Date(session.createdAt), "HH:mm", { locale: ptBR })}
                      </div>
                    </td>
                    <td className="py-4 px-4">
                      <span className="px-3 py-1 bg-slate-100 text-slate-600 rounded-full text-[10px] font-bold uppercase tracking-wider">
                        {session.classification}
                      </span>
                    </td>
                    <td className="py-4 px-4">
                      <div className="text-xs font-bold text-slate-700">{session.studyTime}m / {session.breakTime}m</div>
                    </td>
                    <td className="py-4 px-4">
                      <div className="text-xs font-bold text-slate-700">{session.completedCycles} / {session.totalCycles}</div>
                    </td>
                    <td className="py-4 px-4 text-xs font-bold text-slate-700">
                      {formatElapsed(session.focusedSeconds || 0)}
                    </td>
                    <td className="py-4 px-4 text-xs font-bold text-slate-700">
                      {formatElapsed(session.totalElapsedSeconds)}
                    </td>
                    <td className="py-4 px-4 text-xs text-slate-500 italic max-w-[150px] truncate">
                      {session.description || '-'}
                    </td>
                    <td className="py-4 px-4">
                      {session.status === 'Concluído' ? (
                        <div className="flex items-center gap-1.5 text-emerald-600">
                          <CheckCircle2 size={14} />
                          <span className="text-[10px] font-black uppercase tracking-widest">Concluído</span>
                        </div>
                      ) : session.status === 'Andamento' ? (
                        <div className="flex items-center gap-1.5 text-orange-500">
                          <AlertCircle size={14} className="animate-pulse" />
                          <span className="text-[10px] font-black uppercase tracking-widest">Andamento</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1.5 text-red-500">
                          <X size={14} />
                          <span className="text-[10px] font-black uppercase tracking-widest">Não Concluído</span>
                        </div>
                      )}
                    </td>
                    <td className="py-4 px-4 text-right">
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          setConfirmModal({
                            isOpen: true,
                            title: 'Excluir Registro',
                            message: 'Deseja realmente excluir este registro de atividade?',
                            onConfirm: () => {
                              deleteSession(session.id);
                              setConfirmModal(prev => ({ ...prev, isOpen: false }));
                            }
                          });
                        }}
                        disabled={session.status === 'Andamento'}
                        className={cn(
                          "p-2 rounded-lg transition-all",
                          session.status === 'Andamento' 
                            ? "text-slate-200 cursor-not-allowed" 
                            : "text-slate-300 hover:text-red-500 hover:bg-red-50"
                        )}
                      >
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400 text-sm italic">
                    Nenhuma atividade registrada ainda.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div className="mt-6 flex items-center justify-between pt-6 border-t border-slate-100">
            <p className="text-xs text-slate-400 font-medium">
              Mostrando <span className="text-slate-900 font-bold">{(currentPage - 1) * itemsPerPage + 1}</span> a <span className="text-slate-900 font-bold">{Math.min(currentPage * itemsPerPage, sessions.length)}</span> de <span className="text-slate-900 font-bold">{sessions.length}</span> registros
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
                className="p-2 text-slate-400 hover:bg-slate-50 disabled:opacity-30 disabled:hover:bg-transparent rounded-xl transition-all"
              >
                <ChevronLeft size={20} />
              </button>
              <div className="flex items-center gap-1">
                {Array.from({ length: totalPages }).map((_, i) => {
                  const page = i + 1;
                  // Show only first, last, and pages around current
                  if (
                    page === 1 || 
                    page === totalPages || 
                    (page >= currentPage - 1 && page <= currentPage + 1)
                  ) {
                    return (
                      <button
                        key={page}
                        onClick={() => setCurrentPage(page)}
                        className={cn(
                          "w-8 h-8 rounded-lg text-xs font-black transition-all",
                          currentPage === page 
                            ? "bg-slate-900 text-white" 
                            : "text-slate-400 hover:bg-slate-50"
                        )}
                      >
                        {page}
                      </button>
                    );
                  }
                  if (page === currentPage - 2 || page === currentPage + 2) {
                    return <span key={page} className="text-slate-300 text-xs">...</span>;
                  }
                  return null;
                })}
              </div>
              <button
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                disabled={currentPage === totalPages}
                className="p-2 text-slate-400 hover:bg-slate-50 disabled:opacity-30 disabled:hover:bg-transparent rounded-xl transition-all"
              >
                <ChevronRight size={20} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Notes Modal */}
      <AnimatePresence>
        {isNoteModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsNoteModalOpen(false)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative bg-white w-full max-w-lg rounded-[32px] shadow-2xl border border-slate-100 overflow-hidden"
            >
              <div className="p-8">
                <div className="flex items-center justify-between mb-8">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-orange-50 rounded-xl flex items-center justify-center text-orange-500">
                      <FileText size={20} />
                    </div>
                    <div>
                      <h3 className="text-lg font-black text-slate-900">Anotações do Ciclo</h3>
                      <p className="text-xs text-slate-400 font-medium">Registre insights e observações</p>
                    </div>
                  </div>
                  <button 
                    onClick={() => setIsNoteModalOpen(false)}
                    className="p-2 text-slate-400 hover:bg-slate-50 rounded-xl transition-all"
                  >
                    <X size={20} />
                  </button>
                </div>

                <div className="space-y-6">
                  <div className="space-y-2">
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider ml-1">Título</label>
                    <input 
                      type="text"
                      placeholder="Título da anotação"
                      value={noteTitle}
                      onChange={(e) => setNoteTitle(e.target.value)}
                      readOnly={!isEditingNote}
                      className={cn(
                        "w-full px-4 py-3 border rounded-2xl font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-orange-500 transition-all",
                        isEditingNote ? "bg-slate-50 border-slate-200" : "bg-white border-transparent shadow-none cursor-default"
                      )}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider ml-1">Texto</label>
                    <textarea 
                      rows={6}
                      placeholder="Escreva suas anotações aqui..."
                      value={noteText}
                      onChange={(e) => setNoteText(e.target.value)}
                      readOnly={!isEditingNote}
                      className={cn(
                        "w-full px-4 py-3 border rounded-2xl font-medium text-slate-600 focus:outline-none focus:ring-2 focus:ring-orange-500 transition-all resize-none",
                        isEditingNote ? "bg-slate-50 border-slate-200" : "bg-white border-transparent shadow-none cursor-default"
                      )}
                    />
                  </div>
                </div>

                <div className="mt-8 flex gap-3">
                  {isEditingNote ? (
                    <>
                      <button
                        onClick={handleSaveNote}
                        className="flex-1 bg-orange-500 text-white py-4 rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-orange-600 transition-all shadow-lg shadow-orange-500/20 flex items-center justify-center gap-2"
                      >
                        <Save size={18} />
                        Salvar Anotação
                      </button>
                      {selectedSessionId && sessions.find(s => s.id === selectedSessionId)?.note && (
                        <button
                          onClick={() => setIsEditingNote(false)}
                          className="px-6 bg-slate-100 text-slate-600 py-4 rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-slate-200 transition-all"
                        >
                          Cancelar
                        </button>
                      )}
                    </>
                  ) : (
                    <>
                      <button
                        onClick={() => setIsEditingNote(true)}
                        className="flex-1 bg-slate-900 text-white py-4 rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-slate-800 transition-all flex items-center justify-center gap-2"
                      >
                        <Settings2 size={18} />
                        Editar Anotação
                      </button>
                      <button
                        onClick={handleDeleteNote}
                        className="px-6 bg-red-50 text-red-500 py-4 rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-red-100 transition-all flex items-center justify-center gap-2"
                        title="Excluir Anotação"
                      >
                        <Trash2 size={18} />
                      </button>
                    </>
                  )}
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Confirmation Modal */}
      <AnimatePresence>
        {confirmModal.isOpen && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative bg-white w-full max-w-sm rounded-[32px] shadow-2xl border border-slate-100 overflow-hidden"
            >
              <div className="p-8 text-center">
                <div className="w-16 h-16 bg-red-50 rounded-2xl flex items-center justify-center text-red-500 mx-auto mb-6">
                  <AlertCircle size={32} />
                </div>
                <h3 className="text-xl font-black text-slate-900 mb-2">{confirmModal.title}</h3>
                <p className="text-sm text-slate-500 font-medium leading-relaxed mb-8">
                  {confirmModal.message}
                </p>
                <div className="flex flex-col gap-3">
                  <button
                    onClick={confirmModal.onConfirm}
                    className="w-full bg-red-500 text-white py-4 rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-red-600 transition-all shadow-lg shadow-red-500/20"
                  >
                    Confirmar Exclusão
                  </button>
                  <button
                    onClick={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
                    className="w-full bg-slate-100 text-slate-600 py-4 rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-slate-200 transition-all"
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
