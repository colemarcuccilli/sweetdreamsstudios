'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { onAuthStateChanged, User as FirebaseUser, signOut as firebaseSignOut } from 'firebase/auth';
import { auth, firestore } from '../../firebase/config'; // Adjust path based on your file structure
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { useRouter } from 'next/navigation';

interface AuthContextType {
  user: FirebaseUser | null;
  isAdmin: boolean;
  loading: boolean;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser); // This ensures the user state is updated on login/logout.

      if (currentUser) {
        setLoading(true); // We are loading while we check the user's admin status.
        const checkAdminAndSync = async () => {
          try {
            const adminDocRef = doc(firestore, 'admins', currentUser.uid);
            const adminDoc = await getDoc(adminDocRef);
            
            const isAdminStatus = adminDoc.exists();
            setIsAdmin(isAdminStatus);

            // Sync the admin status to the user's public document for consistency.
            if (isAdminStatus) {
              const userDocRef = doc(firestore, 'users', currentUser.uid);
              await setDoc(userDocRef, { isAdmin: true }, { merge: true });
            }
          } catch (error) {
            console.error("Error checking admin status:", error);
            setIsAdmin(false);
          } finally {
            setLoading(false); // Finished checking admin status.
          }
        };
        checkAdminAndSync();
      } else {
        // No user is logged in, so they are not an admin and we are not loading.
        setIsAdmin(false);
        setLoading(false);
      }
    });
    return () => unsubscribe();
  }, []);

  const logout = async () => {
    try {
      await firebaseSignOut(auth);
      setUser(null);
      setIsAdmin(false);
      // The redirect will be handled by the component calling logout
      // For example, router.push('/'); or router.push('/login');
    } catch (error) {
      console.error("Error signing out: ", error);
      // Optionally, show an error message to the user
    }
  };

  return (
    <AuthContext.Provider value={{ user, isAdmin, loading, logout }}>
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