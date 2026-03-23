import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import { db } from '../firebase';
import { collection, addDoc, updateDoc, doc, deleteDoc, onSnapshot, query, where, orderBy, deleteField } from 'firebase/firestore';
import { useAuth } from './AuthContext';
import { PomodoroSession, PomodoroClassification, PomodoroNote } from '../types';
import { handleFirestoreError, OperationType } from '../utils/firestoreErrorHandler';
import { sanitizeFirestoreData } from '../utils';

interface PomodoroContextType {
  timeLeft: number;
  isActive: boolean;
  isBreak: boolean;
  currentCycle: number;
  completedCycles: number;
  studyTime: number;
  breakTime: number;
  totalCycles: number;
  classification: PomodoroClassification;
  description: string;
  sessions: PomodoroSession[];
  
  setStudyTime: (time: number) => void;
  setBreakTime: (time: number) => void;
  setTotalCycles: (cycles: number) => void;
  setClassification: (cls: PomodoroClassification) => void;
  setDescription: (desc: string) => void;
  
  toggleTimer: () => void;
  resetTimer: () => void;
  deleteSession: (id: string) => Promise<void>;
  updateSessionNote: (sessionId: string, note: PomodoroNote | undefined) => Promise<void>;
}

const PomodoroContext = createContext<PomodoroContextType | undefined>(undefined);

export const PomodoroProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  
  // Config
  const [studyTime, setStudyTime] = useState(50);
  const [breakTime, setBreakTime] = useState(5);
  const [totalCycles, setTotalCycles] = useState(4);
  const [classification, setClassification] = useState<PomodoroClassification>('Estudo');
  const [description, setDescription] = useState('');

  // Timer State
  const [timeLeft, setTimeLeft] = useState(50 * 60);
  const [isActive, setIsActive] = useState(false);
  const [isBreak, setIsBreak] = useState(false);
  const [currentCycle, setCurrentCycle] = useState(1);
  const [completedCycles, setCompletedCycles] = useState(0);
  
  // Tracking
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [focusedSeconds, setFocusedSeconds] = useState(0);
  const [sessions, setSessions] = useState<PomodoroSession[]>([]);

  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  
  // Refs for values needed in handleTimerEnd to avoid dependency changes
  const stateRef = useRef({
    isBreak,
    completedCycles,
    totalCycles,
    breakTime,
    studyTime,
    elapsedSeconds,
    focusedSeconds,
    activeSessionId,
    classification,
    description
  });

  useEffect(() => {
    stateRef.current = {
      isBreak,
      completedCycles,
      totalCycles,
      breakTime,
      studyTime,
      elapsedSeconds,
      focusedSeconds,
      activeSessionId,
      classification,
      description
    };
  }, [isBreak, completedCycles, totalCycles, breakTime, studyTime, elapsedSeconds, focusedSeconds, activeSessionId, classification, description]);

  // Sync timeLeft with studyTime when idle
  useEffect(() => {
    if (!isActive && !isBreak && currentCycle === 1 && completedCycles === 0) {
      setTimeLeft(studyTime * 60);
    }
  }, [studyTime, isActive, isBreak, currentCycle, completedCycles]);

  // Fetch sessions
  useEffect(() => {
    if (!user) {
      setSessions([]);
      return;
    }

    const q = query(
      collection(db, 'pomodoroSessions'),
      where('userId', '==', user.uid),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const docs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as PomodoroSession));
      setSessions(docs);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'pomodoroSessions');
    });

    return () => unsubscribe();
  }, [user]);

  const playSound = useCallback((type: 'study' | 'break') => {
    try {
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
      const ctx = audioContextRef.current;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.connect(gain);
      gain.connect(ctx.destination);

      if (type === 'study') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(880, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(440, ctx.currentTime + 0.5);
        gain.gain.setValueAtTime(0.3, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.5);
        osc.start();
        osc.stop(ctx.currentTime + 0.5);
      } else {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(440, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(220, ctx.currentTime + 0.8);
        gain.gain.setValueAtTime(0.15, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.8);
        osc.start();
        osc.stop(ctx.currentTime + 0.8);
      }
    } catch (e) {
      console.error('Audio error:', e);
    }
  }, []);

  const createOrUpdateSession = useCallback(async (
    status: 'Concluído' | 'Não Concluído' | 'Andamento', 
    finalCompletedCycles: number, 
    finalElapsedSeconds: number,
    finalFocusedSeconds: number,
    currentActiveSessionId: string | null = stateRef.current.activeSessionId
  ) => {
    if (!user) return;

    // Use values from stateRef to ensure we have the latest config even if called from a closure
    const { classification: cls, description: desc, studyTime: sT, breakTime: bT, totalCycles: tC } = stateRef.current;

    const sessionData = {
      userId: user.uid,
      classification: cls,
      description: desc,
      studyTime: sT,
      breakTime: bT,
      totalCycles: tC,
      completedCycles: finalCompletedCycles,
      totalElapsedSeconds: finalElapsedSeconds,
      focusedSeconds: finalFocusedSeconds,
      status,
      createdAt: currentActiveSessionId ? sessions.find(s => s.id === currentActiveSessionId)?.createdAt || new Date().toISOString() : new Date().toISOString()
    };

    try {
      if (currentActiveSessionId) {
        await updateDoc(doc(db, 'pomodoroSessions', currentActiveSessionId), sanitizeFirestoreData(sessionData));
      } else {
        const docRef = await addDoc(collection(db, 'pomodoroSessions'), sanitizeFirestoreData(sessionData));
        setActiveSessionId(docRef.id);
      }
    } catch (error: any) {
      if (error.code === 'not-found' || error.message?.includes('No document to update')) {
        try {
          const docRef = await addDoc(collection(db, 'pomodoroSessions'), sanitizeFirestoreData(sessionData));
          setActiveSessionId(docRef.id);
        } catch (addError) {
          handleFirestoreError(addError, OperationType.CREATE, 'pomodoroSessions');
        }
      } else {
        handleFirestoreError(error, currentActiveSessionId ? OperationType.UPDATE : OperationType.CREATE, currentActiveSessionId ? `pomodoroSessions/${currentActiveSessionId}` : 'pomodoroSessions');
      }
    }
  }, [user, sessions]);

  const handleTimerEnd = useCallback(async (finalElapsed: number, finalFocused: number) => {
    const { 
      isBreak: wasBreak, 
      completedCycles: wasCompleted, 
      totalCycles: maxCycles, 
      breakTime: bTime, 
      studyTime: sTime, 
      activeSessionId: sId 
    } = stateRef.current;

    if (!wasBreak) {
      // Study period ended
      const nextCompleted = wasCompleted + 1;
      setCompletedCycles(nextCompleted);
      
      if (nextCompleted < maxCycles) {
        // Start break
        setIsBreak(true);
        setTimeLeft(bTime * 60);
        playSound('break');
        await createOrUpdateSession('Andamento', nextCompleted, finalElapsed, finalFocused, sId);
      } else {
        // Finished all cycles
        setIsActive(false);
        playSound('study');
        await createOrUpdateSession('Concluído', nextCompleted, finalElapsed, finalFocused, sId);
        setActiveSessionId(null);
      }
    } else {
      // Break period ended
      setIsBreak(false);
      setCurrentCycle(prev => Math.min(prev + 1, maxCycles));
      setTimeLeft(sTime * 60);
      playSound('study');
      await createOrUpdateSession('Andamento', wasCompleted, finalElapsed, finalFocused, sId);
    }
  }, [playSound, createOrUpdateSession]);

  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    
    if (isActive) {
      interval = setInterval(() => {
        const { isBreak: currentlyBreak, elapsedSeconds: e, focusedSeconds: f } = stateRef.current;
        
        // Increment tracking values
        setElapsedSeconds(prev => prev + 1);
        if (!currentlyBreak) {
          setFocusedSeconds(prev => prev + 1);
        }

        setTimeLeft(prev => {
          if (prev <= 1) {
            // Timer reached zero
            // We pass the incremented values to ensure the last second is recorded
            handleTimerEnd(e + 1, currentlyBreak ? f : f + 1);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isActive, handleTimerEnd]);

  const toggleTimer = async () => {
    const newActive = !isActive;
    
    if (newActive) {
      // Starting a new session always
      setIsActive(true);
      setCurrentCycle(1);
      setCompletedCycles(0);
      setElapsedSeconds(0);
      setFocusedSeconds(0);
      setTimeLeft(studyTime * 60);
      setIsBreak(false);
      
      // We need to clear activeSessionId to force a new one
      setActiveSessionId(null);
      await createOrUpdateSession('Andamento', 0, 0, 0, null);
    } else {
      // This is now "Stop" behavior
      await resetTimer();
    }
  };

  const resetTimer = async () => {
    if (activeSessionId) {
      await createOrUpdateSession('Não Concluído', completedCycles, elapsedSeconds, focusedSeconds);
    }
    setIsActive(false);
    setIsBreak(false);
    setCurrentCycle(1);
    setCompletedCycles(0);
    setTimeLeft(studyTime * 60);
    setActiveSessionId(null);
    setElapsedSeconds(0);
    setFocusedSeconds(0);
  };

  const deleteSession = async (id: string) => {
    try {
      if (id === activeSessionId) {
        setActiveSessionId(null);
      }
      await deleteDoc(doc(db, 'pomodoroSessions', id));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `pomodoroSessions/${id}`);
    }
  };

  const updateSessionNote = async (sessionId: string, note: PomodoroNote | undefined) => {
    try {
      await updateDoc(doc(db, 'pomodoroSessions', sessionId), { 
        note: note === undefined ? deleteField() : note 
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `pomodoroSessions/${sessionId}`);
    }
  };

  return (
    <PomodoroContext.Provider value={{
      timeLeft, isActive, isBreak, currentCycle, completedCycles,
      studyTime, breakTime, totalCycles, classification, description,
      sessions,
      setStudyTime, setBreakTime, setTotalCycles, setClassification, setDescription,
      toggleTimer, resetTimer, deleteSession, updateSessionNote
    }}>
      {children}
    </PomodoroContext.Provider>
  );
};

export const usePomodoro = () => {
  const context = useContext(PomodoroContext);
  if (context === undefined) {
    throw new Error('usePomodoro must be used within a PomodoroProvider');
  }
  return context;
};
