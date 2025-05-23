'use client'
// import { User, onAuthStateChanged } from 'firebase/auth'
// import { auth } from './firebase'
import { createContext, useContext } from 'react'

interface AuthContextType {
  user: null
  loading: boolean
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: false,
})

export function AuthProvider({ children }: { children: React.ReactNode }) {
  return (
    <AuthContext.Provider value={{ user: null, loading: false }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
} 