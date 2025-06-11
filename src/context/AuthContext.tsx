'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { onAuthStateChanged, User as FirebaseUser, signOut as firebaseSignOut } from 'firebase/auth';
import { auth, firestore } from '../../firebase/config'; // Adjust path based on your file structure
import { doc, getDoc } from 'firebase/firestore';
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
      setUser(currentUser);
      setLoading(false); // Set loading to false immediately
      
      // Admin check is now separate and does not block rendering
      if (currentUser) {
        // TEMPORARY OVERRIDE: Hardcode the primary admin's email for immediate access.
        // The permanent solution will be to manage admins via the dashboard.
        if (currentUser.email === 'jayvalleo@sweetdreamsmusic.com') {
          setIsAdmin(true);
        } else {
          // Original check for other potential admins
          const checkAdminStatus = async () => {
            const adminDocRef = doc(firestore, 'admins', currentUser.uid);
            const adminDoc = await getDoc(adminDocRef);
            setIsAdmin(adminDoc.exists() && adminDoc.data()?.isAdmin === true);
          };
          checkAdminStatus();
        }
      } else {
        setIsAdmin(false); // Not logged in, not an admin
      }
    });
    return () => unsubscribe();
  }, []); // No dependencies needed

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