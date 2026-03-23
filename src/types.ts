export type Status = 'pending' | 'completed';

export type TaskStatus = 'todo' | 'in-progress' | 'done';

export interface ChecklistItem {
  id: string;
  description: string;
  date?: string | null;
  completed: boolean;
}

export interface Task {
  id: string;
  title: string;
  completed: boolean;
  status?: TaskStatus;
  goalId: string;
  createdAt: number;
  dueDate?: string;
  dueTime?: string;
  category?: AppointmentCategory | string;
  details?: string;
  checklist?: ChecklistItem[];
}

export interface Goal {
  id: string;
  title: string;
  projectId: string;
  createdAt: number;
  order?: number;
}

export interface Project {
  id: string;
  title: string;
  color: string;
  createdAt: number;
}

export type AppointmentCategory = 'routine' | 'appointment' | 'task' | 'project' | 'diet' | 'training' | 'study';

export type RecurrenceType = 'none' | 'daily' | 'weekly' | 'custom';

export type MealType = 'Café da manhã' | 'Almoço' | 'Lanche' | 'Janta';
export type TrainingType = 'Corrida' | 'Caminhada' | 'Funcional' | 'Academia' | 'Futebol' | 'Cárdio' | 'Artes marciais';
export type MealUnit = 'kg' | 'g' | 'mg' | 'ml' | 'L' | '-';
export type TrainingUnit = 'km' | 'm' | 'repetição' | 'seg' | 'min' | 'hora' | '-';

export interface MealItem {
  id: string;
  description: string;
  quantity: number;
  unit: MealUnit;
}

export interface MealEntry {
  id: string;
  dayOfWeek: number; // 0 (Sunday) to 6 (Saturday)
  type: MealType;
  time: string;
  items: MealItem[];
  completedDates?: string[]; // Array of ISO date strings (YYYY-MM-DD)
}

export interface TrainingItem {
  id: string;
  description: string;
  quantity: number;
  unit: TrainingUnit;
}

export interface TrainingEntry {
  id: string;
  dayOfWeek: number;
  type: TrainingType;
  time: string;
  items: TrainingItem[];
  completedDates?: string[]; // Array of ISO date strings (YYYY-MM-DD)
}

export interface Appointment {
  id: string;
  recurrenceId?: string; // Links recurring instances
  title: string;
  description: string;
  date: string; // ISO string for date
  time: string; // HH:mm
  category: AppointmentCategory;
  completed: boolean;
  recurrence?: {
    type: RecurrenceType;
    daysOfWeek?: number[]; // 0-6 for custom/weekly
    endDate?: string; // Optional end date for recurrence
  };
  createdAt: number;
}

export interface NotificationSettings {
  browserNotificationsEnabled: boolean;
  userId: string;
}

export interface StandardAlert {
  id?: string;
  description: string;
  cycleMinutes: number; // e.g., 120 for 2h
  duration: 'every_day' | 'only_today';
  startDateTime: string;
  endDateTime: string;
  lastTriggeredAt?: string;
  userId: string;
}

export interface AppData {
  projects: Project[];
  goals: Goal[];
  tasks: Task[];
  appointments: Appointment[];
  diet?: MealEntry[];
  training?: TrainingEntry[];
  pomodoroSessions?: PomodoroSession[];
  standardAlerts?: StandardAlert[];
  notificationSettings?: NotificationSettings;
}

export type PomodoroClassification = 'Estudo' | 'Trabalho' | 'Projetos/Objetivos' | 'Outros';

export interface PomodoroNote {
  id: string;
  title: string;
  text: string;
  createdAt: string;
}

export interface PomodoroSession {
  id: string;
  userId: string;
  classification: PomodoroClassification;
  description: string;
  studyTime: number; // minutes
  breakTime: number; // minutes
  totalCycles: number;
  completedCycles: number;
  totalElapsedSeconds: number; // total actual time spent
  focusedSeconds: number; // only study time
  status: 'Concluído' | 'Não Concluído' | 'Andamento';
  createdAt: string;
  note?: PomodoroNote;
}
