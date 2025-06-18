'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { db as firestore, storage } from '@/lib/firebase';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { ref, uploadBytesResumable, getDownloadURL } from "firebase/storage";

const ProfileEditPage = () => {
  const { user, loading } = useAuth();
  const router = useRouter();

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [hometown, setHometown] = useState('');
  const [socialLinks, setSocialLinks] = useState({ instagram: '', twitter: '', spotify: '' });
  const [profileImage, setProfileImage] = useState<File | null>(null);
  const [profileImageUrl, setProfileImageUrl] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.push('/login');
      return;
    }
    
      const userDocRef = doc(firestore, `users/${user.uid}`);
      getDoc(userDocRef).then(docSnap => {
        if (docSnap.exists()) {
          const data = docSnap.data();
          setFirstName(data.firstName || '');
          setLastName(data.lastName || '');
          setHometown(data.hometown || '');
          setSocialLinks(data.socialLinks || { instagram: '', twitter: '', spotify: '' });
        setProfileImageUrl(data.photoURL || user.photoURL || null);
        } else {
        const nameParts = user.displayName?.split(' ') || [];
        setFirstName(nameParts[0] || '');
        setLastName(nameParts.slice(1).join(' ') || '');
          setProfileImageUrl(user.photoURL || null);
        }
      }).catch(err => {
        console.error("Error fetching user profile data:", err);
      setFormError("Could not load your profile data.");
      });
  }, [user, loading, router]);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setProfileImage(e.target.files[0]);
      setProfileImageUrl(URL.createObjectURL(e.target.files[0]));
    }
  };

  const handleSocialChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setSocialLinks(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      setFormError("You must be logged in to save your profile.");
      return;
    }
    if (!firstName || !lastName) {
        setFormError("First and Last name are required.");
        return;
    }

    setIsSubmitting(true);
    setFormError(null);

    let finalProfileImageUrl = profileImageUrl;

    if (profileImage) {
      const storageRef = ref(storage, `profileImages/${user.uid}/${profileImage.name}`);
      const uploadTask = uploadBytesResumable(storageRef, profileImage);

      try {
        await new Promise<void>((resolve, reject) => {
          uploadTask.on('state_changed',
            (snapshot) => setUploadProgress((snapshot.bytesTransferred / snapshot.totalBytes) * 100),
            (error) => {
              console.error("Image upload error:", error);
              setFormError("Failed to upload image. Please try again.");
              reject(error);
            },
            async () => {
              finalProfileImageUrl = await getDownloadURL(uploadTask.snapshot.ref);
              resolve();
            }
          );
        });
      } catch (error) {
        setIsSubmitting(false);
        return;
      }
    }

    const userDocRef = doc(firestore, `users/${user.uid}`);
    const profileData = {
      firstName,
      lastName,
      displayName: `${firstName} ${lastName}`.trim(),
      hometown,
      socialLinks,
      photoURL: finalProfileImageUrl || '',
      updatedAt: serverTimestamp()
    };

    try {
      await setDoc(userDocRef, profileData, { merge: true });
      alert("Profile updated successfully!");
      router.push('/');
    } catch (err: any) {
      console.error("Error updating profile:", err);
      setFormError("Failed to save profile: " + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading || !user) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-background text-foreground">
        Loading...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
    <form
      onSubmit={handleSubmit}
        className="bg-white p-8 rounded-lg shadow-lg w-full max-w-2xl space-y-6"
    >
        <h2 className="text-3xl font-bold text-gray-800 text-center">
          Edit Your Profile
      </h2>

      {formError && (
          <p className="text-red-500 text-center p-3 bg-red-100 rounded-md">
          {formError}
        </p>
      )}

        <div className="flex flex-col items-center space-y-4">
          <img
            src={profileImageUrl || '/default-avatar.png'}
            alt="Profile"
            className="w-32 h-32 rounded-full object-cover border-4 border-slate-200"
          />
          <input
            type="file"
            id="profileImage"
            onChange={handleImageChange}
            accept="image/*"
            className="text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
          />
        {uploadProgress > 0 && uploadProgress < 100 && (
            <div className="w-full bg-gray-200 rounded-full h-2.5">
            <div
                className="bg-blue-600 h-2.5 rounded-full"
              style={{ width: `${Math.round(uploadProgress)}%` }}
            ></div>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label htmlFor="firstName" className="block text-sm font-medium text-gray-700">First Name*</label>
          <input
            type="text"
            id="firstName"
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
              required
              className="mt-1 block w-full px-3 py-2 bg-white border border-slate-300 rounded-md shadow-sm placeholder-slate-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
          />
        </div>
          <div>
            <label htmlFor="lastName" className="block text-sm font-medium text-gray-700">Last Name*</label>
          <input
            type="text"
            id="lastName"
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
              required
              className="mt-1 block w-full px-3 py-2 bg-white border border-slate-300 rounded-md shadow-sm placeholder-slate-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
          />
        </div>
      </div>

        <div>
          <label htmlFor="hometown" className="block text-sm font-medium text-gray-700">Hometown</label>
        <input
          type="text"
          id="hometown"
          value={hometown}
          onChange={(e) => setHometown(e.target.value)}
            className="mt-1 block w-full px-3 py-2 bg-white border border-slate-300 rounded-md shadow-sm placeholder-slate-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
        />
      </div>

        <div className="space-y-4">
          <h3 className="text-lg font-medium text-gray-800">Social Links</h3>
      <div>
            <label htmlFor="instagram" className="block text-sm font-medium text-gray-700">Instagram</label>
            <input
              type="url"
              name="instagram"
              id="instagram"
              value={socialLinks.instagram}
              onChange={handleSocialChange}
              placeholder="https://instagram.com/yourhandle"
              className="mt-1 block w-full px-3 py-2 bg-white border border-slate-300 rounded-md shadow-sm placeholder-slate-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
            />
          </div>
          <div>
            <label htmlFor="twitter" className="block text-sm font-medium text-gray-700">Twitter</label>
            <input
              type="url"
              name="twitter"
              id="twitter"
              value={socialLinks.twitter}
              onChange={handleSocialChange}
              placeholder="https://twitter.com/yourhandle"
              className="mt-1 block w-full px-3 py-2 bg-white border border-slate-300 rounded-md shadow-sm placeholder-slate-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
            />
          </div>
          <div>
            <label htmlFor="spotify" className="block text-sm font-medium text-gray-700">Spotify</label>
            <input
              type="url"
              name="spotify"
              id="spotify"
              value={socialLinks.spotify}
              onChange={handleSocialChange}
              placeholder="https://open.spotify.com/artist/yourid"
              className="mt-1 block w-full px-3 py-2 bg-white border border-slate-300 rounded-md shadow-sm placeholder-slate-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
            />
        </div>
      </div>

      <button
        type="submit"
        disabled={isSubmitting}
          className="w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:bg-slate-400"
      >
          {isSubmitting ? 'Saving...' : 'Save Profile'}
      </button>
    </form>
    </div>
  );
};

export default ProfileEditPage; 