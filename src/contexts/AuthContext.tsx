import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { 
  onAuthStateChanged, 
  User as FirebaseUser, 
  signOut,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  GoogleAuthProvider,
  signInWithPopup
} from 'firebase/auth';
import { doc, getDoc, setDoc, collection, query, where, getDocs, deleteDoc } from 'firebase/firestore';
import { auth, db } from '../firebase';
import { handleFirestoreError, OperationType } from '../utils/firestoreErrorHandler';

interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  birthDate?: string;
  cpf?: string;
  phone?: string;
  createdAt?: string;
  lastLogin?: string;
  role: string;
  status?: 'pending' | 'approved' | 'rejected' | 'blocked' | 'inactive';
  authProvider?: 'password' | 'google';
}

interface AuthContextType {
  user: FirebaseUser | null;
  userProfile: UserProfile | null;
  loading: boolean;
  login: (username: string, password: string) => Promise<void>;
  signUp: (data: { email: string; password: string; displayName: string; birthDate: string; cpf: string; phone: string }) => Promise<void>;
  loginWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
  updateProfile: (data: { displayName?: string; birthDate?: string; photoURL?: string; cpf?: string; phone?: string }) => Promise<void>;
  isAdmin: boolean;
  isApproved: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const SESSION_TIMEOUT = 30 * 60 * 1000; // 30 minutes

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastActivity, setLastActivity] = useState<number>(Date.now());

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);
      if (firebaseUser) {
        try {
          const profileDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
          if (profileDoc.exists()) {
            const profileData = profileDoc.data() as UserProfile;
            // Ensure admin role and status are correct
            const isAdminEmail = firebaseUser.email === 'administrador@app.com' || firebaseUser.email === 'thiagosalvinots2020@gmail.com';
            const role = isAdminEmail ? 'admin' : profileData.role;
            const status = isAdminEmail ? 'approved' : profileData.status;
            
            // Update last login
            const lastLogin = new Date().toISOString();
            const authProvider = firebaseUser.providerData[0]?.providerId === 'google.com' ? 'google' : 'password';
            await setDoc(doc(db, 'users', firebaseUser.uid), { lastLogin, role, status, authProvider }, { merge: true });
            const updatedProfile: UserProfile = { ...profileData, lastLogin, role, status, authProvider };
            setUserProfile(updatedProfile);

            // Repair CPF record if missing
            if (updatedProfile.cpf) {
              const cleanCpf = updatedProfile.cpf.replace(/[^\d]+/g, '');
              if (cleanCpf) {
                const cpfDoc = await getDoc(doc(db, 'cpfs', cleanCpf));
                if (!cpfDoc.exists() || cpfDoc.data()?.uid !== firebaseUser.uid) {
                  await setDoc(doc(db, 'cpfs', cleanCpf), { uid: firebaseUser.uid });
                }
              }
            }
          } else {
            // Create profile if it doesn't exist (e.g. first login)
            const role = firebaseUser.email === 'administrador@app.com' || firebaseUser.email === 'thiagosalvinots2020@gmail.com' ? 'admin' : 'user';
            const status = role === 'admin' ? 'approved' : 'pending';
            const authProvider = firebaseUser.providerData[0]?.providerId === 'google.com' ? 'google' : 'password';
            const newProfile: UserProfile = {
              uid: firebaseUser.uid,
              email: firebaseUser.email || '',
              role,
              status,
              authProvider,
              displayName: firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'Usuário',
              createdAt: new Date().toISOString(),
              lastLogin: new Date().toISOString()
            };
            await setDoc(doc(db, 'users', firebaseUser.uid), newProfile);
            setUserProfile(newProfile);
          }
        } catch (error) {
          handleFirestoreError(error, OperationType.WRITE, `users/${firebaseUser.uid}`);
        }
        setLastActivity(Date.now());
      } else {
        setUserProfile(null);
      }
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const logout = useCallback(async () => {
    await signOut(auth);
  }, []);

  // Session timeout check
  useEffect(() => {
    if (!user) return;

    const interval = setInterval(() => {
      if (Date.now() - lastActivity > SESSION_TIMEOUT) {
        logout();
      }
    }, 60000);

    return () => clearInterval(interval);
  }, [user, lastActivity, logout]);

  useEffect(() => {
    if (!user) return;

    const updateActivity = () => setLastActivity(Date.now());
    window.addEventListener('mousemove', updateActivity);
    window.addEventListener('keydown', updateActivity);

    return () => {
      window.removeEventListener('mousemove', updateActivity);
      window.removeEventListener('keydown', updateActivity);
    };
  }, [user]);

  const login = async (username: string, password: string) => {
    // Map "administrador" to "administrador@app.com"
    const isMaster = username === 'administrador' && password === '135792468app';
    const email = username === 'administrador' ? 'administrador@app.com' : username;
    
    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch (err: any) {
      // If master user doesn't exist, create it
      if (isMaster && err.code === 'auth/user-not-found') {
        await createUserWithEmailAndPassword(auth, email, password);
      } else {
        throw err;
      }
    }
  };

  const signUp = async (data: { email: string; password: string; displayName: string; birthDate: string; cpf: string; phone: string }) => {
    const { email, password, ...profileData } = data;
    
    const cleanCpf = profileData.cpf.replace(/[^\d]+/g, '');
    const cleanEmail = email.toLowerCase().trim();
    
    try {
      // 1. Check for duplicate CPF using the dedicated collection
      const cpfDoc = await getDoc(doc(db, 'cpfs', cleanCpf));
      if (cpfDoc.exists()) {
        const err = new Error('Este CPF já está cadastrado.');
        (err as any).code = 'auth/cpf-already-in-use';
        throw err;
      }

      // 2. Create Auth user
      const result = await createUserWithEmailAndPassword(auth, cleanEmail, password);
      const firebaseUser = result.user;

      const isAdminEmail = firebaseUser.email === 'administrador@app.com' || firebaseUser.email === 'thiagosalvinots2020@gmail.com';
      const role = isAdminEmail ? 'admin' : 'user';
      const status = isAdminEmail ? 'approved' : 'pending';

      const newProfile = {
        uid: firebaseUser.uid,
        email: firebaseUser.email,
        role,
        status,
        authProvider: 'password' as const,
        ...profileData,
        cpf: cleanCpf,
        createdAt: new Date().toISOString(),
        lastLogin: new Date().toISOString()
      };

      try {
        // 3. Create CPF uniqueness record FIRST
        // This acts as a lock. If it fails, someone else just took it.
        await setDoc(doc(db, 'cpfs', cleanCpf), { uid: firebaseUser.uid });
      } catch (firestoreError) {
        // Cleanup Auth user if CPF record creation fails
        try {
          await firebaseUser.delete();
        } catch (deleteError) {
          console.error('Failed to clean up Auth user after CPF record failure', deleteError);
        }
        handleFirestoreError(firestoreError, OperationType.WRITE, `cpfs/${cleanCpf}`);
        return;
      }

      try {
        // 4. Create user profile
        await setDoc(doc(db, 'users', firebaseUser.uid), newProfile);
        setUserProfile(newProfile);
      } catch (firestoreError) {
        // If profile creation fails, we still have the CPF record.
        // We should probably delete the CPF record too if we are cleaning up.
        try {
          await deleteDoc(doc(db, 'cpfs', cleanCpf));
          await firebaseUser.delete();
        } catch (cleanupError) {
          console.error('Failed to clean up after profile creation failure', cleanupError);
        }
        handleFirestoreError(firestoreError, OperationType.WRITE, `users/${firebaseUser.uid}`);
      }
    } catch (error: any) {
      const errorCode = error.code;
      if (errorCode === 'auth/cpf-already-in-use' || errorCode === 'auth/email-already-in-use' || errorCode === 'auth/weak-password') {
        throw error;
      }
      if (error instanceof Error && error.message.startsWith('FIRESTORE_ERROR:')) throw error;
      console.error('Sign up error:', error);
      throw error;
    }
  };

  const loginWithGoogle = async () => {
    const provider = new GoogleAuthProvider();
    const result = await signInWithPopup(auth, provider);
    const firebaseUser = result.user;
    
    try {
      // Check if profile exists, if not create it
      const profileDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
      if (!profileDoc.exists()) {
        const isAdminEmail = firebaseUser.email === 'administrador@app.com' || firebaseUser.email === 'thiagosalvinots2020@gmail.com';
        const role = isAdminEmail ? 'admin' : 'user';
        const status = isAdminEmail ? 'approved' : 'pending';
        const newProfile = {
          uid: firebaseUser.uid,
          email: firebaseUser.email,
          role,
          status,
          authProvider: 'google' as const,
          displayName: firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'Usuário',
          photoURL: firebaseUser.photoURL || '',
          createdAt: new Date().toISOString(),
          lastLogin: new Date().toISOString()
        };
        await setDoc(doc(db, 'users', firebaseUser.uid), newProfile);
        setUserProfile(newProfile);
      } else {
        const profileData = profileDoc.data();
        // Ensure admin role and status are correct
        const isAdminEmail = firebaseUser.email === 'administrador@app.com' || firebaseUser.email === 'thiagosalvinots2020@gmail.com';
        const role = isAdminEmail ? 'admin' : profileData.role;
        const status = isAdminEmail ? 'approved' : profileData.status;
        
        // Update last login
        const lastLogin = new Date().toISOString();
        await setDoc(doc(db, 'users', firebaseUser.uid), { lastLogin, role, status }, { merge: true });
        setUserProfile((prev: any) => ({ ...prev, lastLogin, role, status }));
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `users/${firebaseUser.uid}`);
    }
  };

  const updateProfile = async (data: { displayName?: string; birthDate?: string; photoURL?: string; cpf?: string; phone?: string }) => {
    if (!user) return;
    
    try {
      const updateData: any = { ...data };
      
      if (data.cpf) {
        const cleanCpf = data.cpf.replace(/[^\d]+/g, '');
        
        // If CPF is changing, check uniqueness
        if (cleanCpf && cleanCpf !== userProfile?.cpf) {
          const cpfDoc = await getDoc(doc(db, 'cpfs', cleanCpf));
          if (cpfDoc.exists()) {
            const err = new Error('Este CPF já está cadastrado.');
            (err as any).code = 'auth/cpf-already-in-use';
            throw err;
          }
          
          // Remove old CPF record if it exists
          if (userProfile?.cpf) {
            try {
              await deleteDoc(doc(db, 'cpfs', userProfile.cpf));
            } catch (e) {
              console.error('Failed to delete old CPF record', e);
            }
          }
          
          // Create new CPF record
          await setDoc(doc(db, 'cpfs', cleanCpf), { uid: user.uid });
        }
        updateData.cpf = cleanCpf;
      }

      const userRef = doc(db, 'users', user.uid);
      await setDoc(userRef, updateData, { merge: true });
      setUserProfile((prev: any) => ({ ...prev, ...updateData }));
    } catch (error) {
      if ((error as any).code === 'auth/cpf-already-in-use') throw error;
      handleFirestoreError(error, OperationType.WRITE, `users/${user.uid}`);
    }
  };

  const isAdmin = userProfile?.role === 'admin';
  const isApproved = userProfile?.status === 'approved' || isAdmin;

  return (
    <AuthContext.Provider value={{ user, userProfile, loading, login, signUp, loginWithGoogle, logout, updateProfile, isAdmin, isApproved }}>
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
