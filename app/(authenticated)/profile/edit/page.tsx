'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { firestore, storage } from '../../../../firebase/config'; // Using direct relative path
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { ref, uploadBytesResumable, getDownloadURL } from "firebase/storage";

const ProfileSetupPage = () => {
  const { user, loading } = useAuth();
  const router = useRouter();

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [artistName, setArtistName] = useState('');
  const [hometown, setHometown] = useState('');
  const [socialLinks, setSocialLinks] = useState({ instagram: '', twitter: '', spotify: '' });
  const [profileImage, setProfileImage] = useState<File | null>(null);
  const [profileImageUrl, setProfileImageUrl] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login'); // Redirect if not logged in
    }
    if (user) {
      // Fetch existing profile data if any
      const userDocRef = doc(firestore, `users/${user.uid}`);
      getDoc(userDocRef).then(docSnap => {
        if (docSnap.exists()) {
          const data = docSnap.data();
          setFirstName(data.firstName || '');
          setLastName(data.lastName || '');
          setArtistName(data.artistName || data.displayName || user.email || ''); // Updated fallback order
          setHometown(data.hometown || '');
          setSocialLinks(data.socialLinks || { instagram: '', twitter: '', spotify: '' });
          setProfileImageUrl(data.photoURL || user.photoURL || null); // Prioritize Firestore photoURL
        } else {
           // Pre-fill with auth data if no Firestore doc (e.g. display name from Google)
          setArtistName(user.displayName || user.email || ''); // Updated fallback order
          setProfileImageUrl(user.photoURL || null);
        }
      }).catch(err => {
        console.error("Error fetching user profile data:", err);
        setFormError("Could not load profile data.");
      });
    }
  }, [user, loading, router]);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setProfileImage(e.target.files[0]);
      setProfileImageUrl(URL.createObjectURL(e.target.files[0])); // Temporary preview
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
    setIsSubmitting(true);
    setFormError(null);

    let newProfileImageUrl = profileImageUrl; // Keep existing or preview URL if no new image

    if (profileImage) {
      const storageRef = ref(storage, `profileImages/${user.uid}/${profileImage.name}`);
      const uploadTask = uploadBytesResumable(storageRef, profileImage);

      try {
        await new Promise<void>((resolve, reject) => {
          uploadTask.on('state_changed',
            (snapshot) => {
              const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
              setUploadProgress(progress);
            },
            (error) => {
              console.error("Image upload error:", error);
              setFormError("Failed to upload image: " + error.message);
              reject(error);
            },
            async () => {
              newProfileImageUrl = await getDownloadURL(uploadTask.snapshot.ref);
              setProfileImageUrl(newProfileImageUrl); // Update state with final URL
              console.log('File available at', newProfileImageUrl);
              resolve();
            }
          );
        });
      } catch (error) {
        setIsSubmitting(false);
        // Error is already set by the uploadTask error handler
        return;
      }
    }

    const userDocRef = doc(firestore, `users/${user.uid}`);
    const profileData = {
      firstName,
      lastName,
      artistName,
      displayName: artistName,
      hometown,
      socialLinks,
      photoURL: newProfileImageUrl || user.photoURL || '', // Use uploaded, then existing, then auth, then empty
      updatedAt: serverTimestamp()
    };

    try {
      await setDoc(userDocRef, profileData, { merge: true }); // Merge to update existing fields or add new ones
      console.log("Profile updated successfully!");
      // router.push('/'); // Redirect to home page or a dashboard after setup
    } catch (err: any) {
      console.error("Error updating profile:", err);
      setFormError("Failed to save profile: " + err.message);
    }
    setIsSubmitting(false);
  };

  if (loading || !user) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-background text-foreground">
        Loading profile setup...
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="bg-slate-50 p-8 md:p-10 rounded-xl shadow-2xl w-full max-w-2xl mx-auto space-y-6 border border-slate-200"
    >
      <h2 className="text-3xl md:text-4xl font-logo text-accent-blue text-center mb-8">
        Setup Your Artist Profile
      </h2>

      {formError && (
        <p className="text-red-100 text-center p-3 bg-accent-red rounded-md">
          {formError}
        </p>
      )}

      <div className="space-y-4 text-center">
        {profileImageUrl && (
          <img
            src={profileImageUrl}
            alt="Profile Preview"
            className="w-32 h-32 md:w-40 md:h-40 rounded-full object-cover mx-auto mb-4 border-4 border-accent-blue shadow-lg"
          />
        )}
        <div>
          <label
            htmlFor="profileImage"
            className="block text-sm font-medium text-foreground/80 mb-2"
          >
            Profile Image
          </label>
          <input
            type="file"
            id="profileImage"
            onChange={handleImageChange}
            accept="image/*"
            className="block w-full text-sm text-foreground/70 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-accent-green file:text-white hover:file:bg-accent-green/80 cursor-pointer"
          />
        </div>
        {uploadProgress > 0 && uploadProgress < 100 && (
          <div className="w-full bg-slate-200 rounded-full h-2.5 mt-2">
            <div
              className="bg-accent-green h-2.5 rounded-full transition-all duration-300 ease-out"
              style={{ width: `${Math.round(uploadProgress)}%` }}
            ></div>
            <p className="text-xs text-foreground/70 mt-1">
              Uploading: {Math.round(uploadProgress)}%
            </p>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-2">
          <label
            htmlFor="firstName"
            className="block text-sm font-medium text-foreground/80"
          >
            First Name
          </label>
          <input
            type="text"
            id="firstName"
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            className="block w-full bg-white border-slate-300 text-foreground rounded-md shadow-sm p-3 hover:border-slate-400 focus:ring-accent-pink focus:border-accent-pink placeholder-slate-400 transition-colors duration-150"
          />
        </div>
        <div className="space-y-2">
          <label
            htmlFor="lastName"
            className="block text-sm font-medium text-foreground/80"
          >
            Last Name
          </label>
          <input
            type="text"
            id="lastName"
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
            className="block w-full bg-white border-slate-300 text-foreground rounded-md shadow-sm p-3 hover:border-slate-400 focus:ring-accent-pink focus:border-accent-pink placeholder-slate-400 transition-colors duration-150"
          />
        </div>
      </div>

      <div className="space-y-2">
        <label
          htmlFor="artistName"
          className="block text-sm font-medium text-foreground/80"
        >
          Artist Name*
        </label>
        <input
          type="text"
          id="artistName"
          value={artistName}
          onChange={(e) => setArtistName(e.target.value)}
          required
          className="block w-full bg-white border-slate-300 text-foreground rounded-md shadow-sm p-3 hover:border-slate-400 focus:ring-accent-pink focus:border-accent-pink placeholder-slate-400 transition-colors duration-150"
        />
      </div>

      <div className="space-y-2">
        <label
          htmlFor="hometown"
          className="block text-sm font-medium text-foreground/80"
        >
          Hometown
        </label>
        <input
          type="text"
          id="hometown"
          value={hometown}
          onChange={(e) => setHometown(e.target.value)}
          className="block w-full bg-white border-slate-300 text-foreground rounded-md shadow-sm p-3 hover:border-slate-400 focus:ring-accent-pink focus:border-accent-pink placeholder-slate-400 transition-colors duration-150"
        />
      </div>

      <div>
        <h3 className="text-xl font-logo text-accent-pink mt-8 mb-4 text-center md:text-left">
          Social Media Links
        </h3>
        <div className="space-y-6">
          <div className="space-y-2">
            <label
              htmlFor="instagram"
              className="block text-sm font-medium text-foreground/80"
            >
              Instagram URL
            </label>
            <input
              type="url"
              name="instagram"
              id="instagram"
              value={socialLinks.instagram}
              onChange={handleSocialChange}
              placeholder="https://instagram.com/yourprofile"
              className="block w-full bg-white border-slate-300 text-foreground rounded-md shadow-sm p-3 hover:border-slate-400 focus:ring-accent-pink focus:border-accent-pink placeholder-slate-400 transition-colors duration-150"
            />
          </div>
          <div className="space-y-2">
            <label
              htmlFor="twitter"
              className="block text-sm font-medium text-foreground/80"
            >
              X (Twitter) URL
            </label>
            <input
              type="url"
              name="twitter"
              id="twitter"
              value={socialLinks.twitter}
              onChange={handleSocialChange}
              placeholder="https://x.com/yourprofile"
              className="block w-full bg-white border-slate-300 text-foreground rounded-md shadow-sm p-3 hover:border-slate-400 focus:ring-accent-pink focus:border-accent-pink placeholder-slate-400 transition-colors duration-150"
            />
          </div>
          <div className="space-y-2">
            <label
              htmlFor="spotify"
              className="block text-sm font-medium text-foreground/80"
            >
              Spotify Artist URL
            </label>
            <input
              type="url"
              name="spotify"
              id="spotify"
              value={socialLinks.spotify}
              onChange={handleSocialChange}
              placeholder="https://open.spotify.com/artist/yourid"
              className="block w-full bg-white border-slate-300 text-foreground rounded-md shadow-sm p-3 hover:border-slate-400 focus:ring-accent-pink focus:border-accent-pink placeholder-slate-400 transition-colors duration-150"
            />
          </div>
        </div>
      </div>

      <button
        type="submit"
        disabled={isSubmitting}
        className="w-full mt-8 py-3 px-4 border border-transparent rounded-lg shadow-md text-lg font-logo 
                   bg-accent-yellow text-foreground hover:bg-accent-yellow/80 focus:outline-none focus:ring-2 
                   focus:ring-offset-2 focus:ring-offset-slate-50 focus:ring-accent-yellow
                   disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
      >
        {isSubmitting ? 'Saving Profile...' : 'Save Profile'}
      </button>
    </form>
  );
};

export default ProfileSetupPage; 