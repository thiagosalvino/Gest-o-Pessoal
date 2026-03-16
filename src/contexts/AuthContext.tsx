import React, { createContext, useContext, useEffect, useState } from 'react';
import { 
  onAuthStateChanged, 
  User as FirebaseUser, 
  signOut,
  signInWithEmailAndPassword,
  GoogleAuthProvider,
  signInWithPopup
} from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, db } from '../firebase';

interface AuthContextType {
  user: FirebaseUser | null;
  userProfile: any | null;
  loading: boolean;
  login: (username: string, password: string) => Promise<void>;
  loginWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
  updateProfile: (data: { displayName?: string; birthDate?: string; photoURL?: string }) => Promise<void>;
  isAdmin: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const SESSION_TIMEOUT = 30 * 60 * 1000; // 30 minutes

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [userProfile, setUserProfile] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastActivity, setLastActivity] = useState<number>(Date.now());

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);
      if (firebaseUser) {
        const profileDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
        if (profileDoc.exists()) {
          setUserProfile(profileDoc.data());
        } else {
          // Create profile if it doesn't exist (e.g. first login)
          const role = firebaseUser.email === 'administrador@app.com' || firebaseUser.email === 'thiagosalvinots2020@gmail.com' ? 'admin' : 'user';
          const newProfile = {
            uid: firebaseUser.uid,
            email: firebaseUser.email,
            role,
            displayName: firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'Usuário'
          };
          await setDoc(doc(db, 'users', firebaseUser.uid), newProfile);
          setUserProfile(newProfile);
        }
        setLastActivity(Date.now());
      } else {
        setUserProfile(null);
      }
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  // Session timeout check
  useEffect(() => {
    if (!user) return;

    const interval = setInterval(() => {
      if (Date.now() - lastActivity > SESSION_TIMEOUT) {
        logout();
      }
    }, 60000); // Check every minute

    const updateActivity = () => setLastActivity(Date.now());
    window.addEventListener('mousemove', updateActivity);
    window.addEventListener('keydown', updateActivity);

    return () => {
      clearInterval(interval);
      window.removeEventListener('mousemove', updateActivity);
      window.removeEventListener('keydown', updateActivity);
    };
  }, [user, lastActivity]);

  const login = async (username: string, password: string) => {
    // Map "administrador" to "administrador@app.com"
    const isMaster = username === 'administrador' && password === '135792468app';
    const email = username === 'administrador' ? 'administrador@app.com' : username;
    
    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch (err: any) {
      // If master user doesn't exist, create it
      if (isMaster && err.code === 'auth/user-not-found') {
        const { createUserWithEmailAndPassword } = await import('firebase/auth');
        await createUserWithEmailAndPassword(auth, email, password);
      } else {
        throw err;
      }
    }
  };

  const loginWithGoogle = async () => {
    const provider = new GoogleAuthProvider();
    const result = await signInWithPopup(auth, provider);
    const firebaseUser = result.user;
    
    // Check if profile exists, if not create it
    const profileDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
    if (!profileDoc.exists()) {
      const role = firebaseUser.email === 'thiagosalvinots2020@gmail.com' ? 'admin' : 'user';
      const newProfile = {
        uid: firebaseUser.uid,
        email: firebaseUser.email,
        role,
        displayName: firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'Usuário',
        photoURL: firebaseUser.photoURL || ''
      };
      await setDoc(doc(db, 'users', firebaseUser.uid), newProfile);
      setUserProfile(newProfile);
    }
  };

  const updateProfile = async (data: { displayName?: string; birthDate?: string; photoURL?: string }) => {
    if (!user) return;
    const userRef = doc(db, 'users', user.uid);
    await setDoc(userRef, data, { merge: true });
    setUserProfile((prev: any) => ({ ...prev, ...data }));
  };

  const logout = async () => {
    await signOut(auth);
  };

  const isAdmin = userProfile?.role === 'admin';

  return (
    <AuthContext.Provider value={{ user, userProfile, loading, login, loginWithGoogle, logout, updateProfile, isAdmin }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
