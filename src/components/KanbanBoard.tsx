import React from 'react';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import { Task, TaskStatus } from '../types';
import { CheckCircle2, Circle, Trash2, GripVertical, Tag } from 'lucide-react';
import { cn } from '../utils';
import { CATEGORIES } from '../constants';

interface KanbanBoardProps {
  tasks: Task[];
  onUpdateTaskStatus: (taskId: string, status: TaskStatus) => void;
  onDeleteTask: (taskId: string) => void;
  onToggleTask: (taskId: string) => void;
  onTaskDoubleClick: (task: Task) => void;
}

const COLUMNS: { id: TaskStatus; title: string; color: string }[] = [
  { id: 'todo', title: 'A Fazer', color: 'bg-slate-100 text-slate-700' },
  { id: 'in-progress', title: 'Em Andamento', color: 'bg-orange-100 text-orange-700' },
  { id: 'done', title: 'Concluído', color: 'bg-emerald-100 text-emerald-700' },
];

export const KanbanBoard: React.FC<KanbanBoardProps> = ({
  tasks,
  onUpdateTaskStatus,
  onDeleteTask,
  onToggleTask,
  onTaskDoubleClick
}) => {
  const handleDragEnd = (result: DropResult) => {
    const { destination, source, draggableId } = result;

    if (!destination) return;

    if (
      destination.droppableId === source.droppableId &&
      destination.index === source.index
    ) {
      return;
    }

    onUpdateTaskStatus(draggableId, destination.droppableId as TaskStatus);
  };

  return (
    <DragDropContext onDragEnd={handleDragEnd}>
      <div className="flex flex-col md:flex-row gap-6 items-start w-full">
        {COLUMNS.map((column) => {
          const columnTasks = tasks.filter((t) => t.status === column.id);

          return (
            <div key={column.id} className="flex-1 w-full min-w-[280px]">
              <div className="flex items-center justify-between mb-4">
                <h4 className={cn("font-semibold px-3 py-1 rounded-full text-sm", column.color)}>
                  {column.title}
                </h4>
                <span className="text-sm font-medium text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">
                  {columnTasks.length}
                </span>
              </div>

              <Droppable droppableId={column.id}>
                {(provided, snapshot) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    className={cn(
                      "bg-slate-50/50 rounded-2xl p-3 min-h-[200px] border-2 transition-colors",
                      snapshot.isDraggingOver ? "border-orange-200 bg-orange-50/30" : "border-transparent"
                    )}
                  >
                    <div className="space-y-3">
                      {columnTasks.map((task, index) => (
                        // @ts-expect-error - React 19 types issue with Draggable key
                        <Draggable key={task.id} draggableId={task.id} index={index}>
                          {(provided, snapshot) => (
                            <div
                              ref={provided.innerRef}
                              {...provided.draggableProps}
                              onDoubleClick={() => onTaskDoubleClick(task)}
                              className={cn(
                                "group bg-white p-4 rounded-xl border shadow-sm transition-all cursor-pointer",
                                snapshot.isDragging ? "shadow-lg border-orange-300 rotate-2 scale-105" : "border-slate-200 hover:border-orange-200 hover:shadow-md",
                                task.completed && column.id === 'done' ? "opacity-70" : ""
                              )}
                            >
                              <div className="flex items-start gap-3">
                                <div
                                  {...provided.dragHandleProps}
                                  className="mt-1 text-slate-300 hover:text-slate-500 cursor-grab active:cursor-grabbing"
                                >
                                  <GripVertical size={16} />
                                </div>
                                
                                <button 
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    onToggleTask(task.id);
                                  }}
                                  className={cn(
                                    "mt-0.5 transition-colors shrink-0",
                                    task.completed ? "text-emerald-500" : "text-slate-300 hover:text-orange-400"
                                  )}
                                >
                                  {task.completed ? <CheckCircle2 size={20} /> : <Circle size={20} />}
                                </button>

                                <div className="flex-1 min-w-0">
                                  <p className={cn(
                                    "font-medium text-sm transition-all break-words",
                                    task.completed ? "line-through text-slate-400" : "text-slate-700"
                                  )}>
                                    {task.title}
                                  </p>
                                  {task.category && (() => {
                                    const cat = CATEGORIES.find(c => c.value === task.category);
                                    const Icon = cat?.icon || Tag;
                                    return (
                                      <div className="mt-2 flex items-center">
                                        <span className={cn(
                                          "text-[10px] px-2 py-0.5 rounded-full border font-medium flex items-center gap-1 w-fit",
                                          cat?.color || "bg-orange-50 text-orange-700 border-orange-100"
                                        )}>
                                          <Icon size={10} />
                                          {cat?.label || task.category}
                                        </span>
                                      </div>
                                    );
                                  })()}
                                  {(task.dueDate || task.dueTime || (task.checklist && task.checklist.length > 0)) && (
                                    <div className="mt-2 flex items-center gap-2">
                                      {(task.dueDate || task.dueTime) && (
                                        <div className="flex items-center gap-1 text-[10px] font-medium text-slate-400">
                                          {task.dueDate && task.dueDate.split('-').reverse().join('/')}
                                          {task.dueTime && ` às ${task.dueTime}`}
                                        </div>
                                      )}
                                      {task.checklist && task.checklist.length > 0 && (
                                        <div className="flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 bg-slate-50 text-slate-500 rounded border border-slate-100">
                                          <CheckCircle2 size={10} />
                                          {task.checklist.length}/{task.checklist.filter(i => i.completed).length}
                                        </div>
                                      )}
                                    </div>
                                  )}
                                </div>

                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    onDeleteTask(task.id);
                                  }}
                                  className="opacity-0 group-hover:opacity-100 p-1.5 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all shrink-0"
                                >
                                  <Trash2 size={16} />
                                </button>
                              </div>
                            </div>
                          )}
                        </Draggable>
                      ))}
                      {provided.placeholder}
                    </div>
                  </div>
                )}
              </Droppable>
            </div>
          );
        })}
      </div>
    </DragDropContext>
  );
};
