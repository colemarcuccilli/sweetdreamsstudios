'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  createUserWithEmailAndPassword,
  GoogleAuthProvider,
  signInWithPopup,
  User
} from 'firebase/auth';
import { auth, db as firestore } from '@/lib/firebase';
import { doc, setDoc, serverTimestamp } from "firebase/firestore";
import Link from 'next/link';

const SignupPage = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const createUserDocument = async (user: User, additionalData: { phoneNumber?: string } = {}) => {
    if (!user) return;
    const userRef = doc(firestore, `users/${user.uid}`);
    
    const userData = {
      uid: user.uid,
      email: user.email,
      displayName: user.displayName || user.email?.split('@')[0] || 'New User',
      photoURL: user.photoURL || '',
      firstName: '',
      lastName: '',
      artistName: '',
      hometown: '',
      phoneNumber: additionalData.phoneNumber || '',
      socialLinks: { instagram: '', twitter: '', spotify: '' },
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      isAdmin: false,
    };

    try {
      await setDoc(userRef, userData, { merge: true });
      console.log('Standardized user document created in Firestore');
    } catch (firestoreError: any) {
      console.error("Error creating user document in Firestore:", firestoreError);
      setError("Error saving user data: " + firestoreError.message);
      throw firestoreError;
    }
  };

  const handlePrimaryFormSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }
    if (!email || !phoneNumber) {
        setError("Email and Phone Number are required.");
        return;
    }
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      console.log('Signed up successfully with primary form!', userCredential.user);
      await createUserDocument(userCredential.user, { phoneNumber });
      router.push('/profile/edit');
    } catch (err: any) {
      if (err.code && err.code.startsWith('auth/')) {
        setError(err.message);
      } else if (!error) {
        setError("An unexpected error occurred during sign up.");
      }
      console.error('Primary form signup error:', err);
    }
  };

  const handleGoogleSignup = async () => {
    setError(null);
    const provider = new GoogleAuthProvider();
    try {
      const userCredential = await signInWithPopup(auth, provider);
      console.log('Signed up successfully with Google!', userCredential.user);
      await createUserDocument(userCredential.user, { phoneNumber: '' });
      router.push('/profile/edit');
    } catch (err: any) {
      if (err.code && err.code.startsWith('auth/')) {
        setError(err.message);
      } else if (!error) {
        setError("An unexpected error occurred during Google sign up.");
      }
      console.error('Google signup error:', err);
    }
  };

  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', background: '#f0f2f5' }}>
      <div style={{ padding: '40px', background: 'white', borderRadius: '8px', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', width: '100%', maxWidth: '450px' }}>
        <h2 style={{ textAlign: 'center', marginBottom: '24px', color: '#333' }}>Sign Up</h2>
        {error && <p style={{ color: 'red', textAlign: 'center', marginBottom: '16px' }}>{error}</p>}

        <form onSubmit={handlePrimaryFormSignup} style={{ marginBottom: '20px' }}>
          <div style={{ marginBottom: '16px' }}>
            <label htmlFor="email" style={{ display: 'block', marginBottom: '8px', color: '#555' }}>Email*</label>
            <input type="email" id="email" value={email} onChange={(e) => setEmail(e.target.value)} required style={{ width: '100%', padding: '10px', borderRadius: '4px', border: '1px solid #ccc' }} />
          </div>
          <div style={{ marginBottom: '16px' }}>
            <label htmlFor="phoneNumber" style={{ display: 'block', marginBottom: '8px', color: '#555' }}>Phone Number*</label>
            <input type="tel" id="phoneNumber" value={phoneNumber} onChange={(e) => setPhoneNumber(e.target.value)} required placeholder="e.g., +16505551234" style={{ width: '100%', padding: '10px', borderRadius: '4px', border: '1px solid #ccc' }} />
          </div>
          <div style={{ marginBottom: '16px' }}>
            <label htmlFor="password" style={{ display: 'block', marginBottom: '8px', color: '#555' }}>Password*</label>
            <input type="password" id="password" value={password} onChange={(e) => setPassword(e.target.value)} required style={{ width: '100%', padding: '10px', borderRadius: '4px', border: '1px solid #ccc' }} />
          </div>
          <div style={{ marginBottom: '24px' }}>
            <label htmlFor="confirmPassword" style={{ display: 'block', marginBottom: '8px', color: '#555' }}>Confirm Password*</label>
            <input type="password" id="confirmPassword" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required style={{ width: '100%', padding: '10px', borderRadius: '4px', border: '1px solid #ccc' }} />
          </div>
          <button type="submit" style={{ width: '100%', padding: '12px', background: '#28a745', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '16px', marginBottom: '10px' }}>Sign Up & Edit Profile</button>
        </form>

        <div style={{ display: 'flex', alignItems: 'center', textAlign: 'center', margin: '20px 0' }}>
            <hr style={{ flexGrow: 1, borderColor: '#ccc' }} />
            <span style={{ padding: '0 10px', color: '#777' }}>OR</span>
            <hr style={{ flexGrow: 1, borderColor: '#ccc' }} />
        </div>

        <button onClick={handleGoogleSignup} style={{ width: '100%', padding: '12px', background: '#DB4437', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '16px', marginBottom: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px' }}>
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="currentColor" viewBox="0 0 16 16">
              <path d="M15.545 6.558a9.42 9.42 0 0 1 .139 1.626c0 2.434-.87 4.492-2.384 5.885h.002C11.978 15.292 10.158 16 8 16A8 8 0 1 1 8 0a7.689 7.689 0 0 1 5.352 2.082l-2.284 2.284A4.347 4.347 0 0 0 8 3.166c-2.087 0-3.86 1.408-4.492 3.304a4.792 4.792 0 0 0 0 3.063h.003c.635 1.893 2.405 3.301 4.492 3.301 1.078 0 2.004-.276 2.722-.764h-.003a3.702 3.702 0 0 0 1.599-2.431H8v-3.08h7.545z"/>
          </svg>
          Sign Up with Google
        </button>
        
        <p style={{ textAlign: 'center', marginTop: '24px' }}>
          Already have an account? <Link href="/login" style={{ color: '#007bff', textDecoration: 'none' }}>Login</Link>
        </p>
      </div>
    </div>
  );
};

export default SignupPage; 