'use client';

import React, { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { db as firestore } from '@/lib/firebase';
import { collection, query, where, onSnapshot, Timestamp, doc, updateDoc } from 'firebase/firestore';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';

interface ServiceQuestion {
  key: string;
  label: string;
  type: string;
  dependsOn?: string;
  dependsValue?: any;
  options?: string[];
}

const serviceQuestions: { [key: string]: ServiceQuestion[] } = {
  'Vocal Recording': [
    { key: 'hasBeat', label: 'Do you have an instrumental/beat to record over?', type: 'boolean' },
    { key: 'beatLink', label: 'Instrumental Link (optional)', type: 'text', dependsOn: 'hasBeat', dependsValue: true },
    { key: 'beatFile', label: 'Upload Instrumental File (optional)', type: 'file', dependsOn: 'hasBeat', dependsValue: true },
    { key: 'numSongs', label: 'How many songs do you plan to record?', type: 'number' },
    { key: 'numTakes', label: 'How many vocal takes/layers per song?', type: 'text' },
    { key: 'liveInstruments', label: 'Will you record live instruments? If so, which?', type: 'checkbox-group', options: ['Guitar', 'Bass', 'Keys', 'Drums', 'Percussion', 'Other'] },
    { key: 'engineerType', label: 'Will you use a Sweet Dreams engineer or your own?', type: 'select', options: ['Sweet Dreams Engineer', 'My Engineer'] },
    { key: 'firstTime', label: 'First time recording in a professional studio?', type: 'boolean' },
  ],
  'Instrument Tracking': [
    { key: 'instruments', label: 'Which instruments will you record?', type: 'checkbox-group', options: ['Guitar', 'Bass', 'Keys', 'Drums', 'Percussion', 'Other'] },
    { key: 'engineerType', label: 'Will you use a Sweet Dreams engineer or your own?', type: 'select', options: ['Sweet Dreams Engineer', 'My Engineer'] },
  ],
  'Mixing': [
    { key: 'numStems', label: 'How many tracks/stems in your session?', type: 'text' },
    { key: 'genre', label: 'What genre is the song?', type: 'text' },
    { key: 'hasReference', label: 'Do you have a rough mix or reference track?', type: 'boolean' },
    { key: 'referenceLink', label: 'Reference Link (optional)', type: 'text', dependsOn: 'hasReference', dependsValue: true },
    { key: 'referenceFile', label: 'Upload Reference File (optional)', type: 'file', dependsOn: 'hasReference', dependsValue: true },
    { key: 'mixNotes', label: 'Mixing notes or creative directions?', type: 'text' },
    { key: 'mixSessionType', label: 'Will you attend the mixing session?', type: 'select', options: ['In-Person', 'Remote'] },
  ],
  'Mastering': [
    { key: 'numSongs', label: 'How many songs to master?', type: 'number' },
    { key: 'platforms', label: 'Platforms for masters?', type: 'checkbox-group', options: ['Spotify', 'Apple Music', 'CD', 'Vinyl', 'YouTube', 'Other'] },
    { key: 'loudness', label: 'Loudness targets or sonic characteristics?', type: 'text' },
    { key: 'masterFile', label: 'Upload unmastered WAV files (optional)', type: 'file' },
  ],
  'Full Production': [
    { key: 'vision', label: 'What is your vision for the song(s)?', type: 'text' },
    { key: 'demoIdeas', label: 'Demo ideas or lyrical concepts?', type: 'text' },
    { key: 'style', label: 'Musical style/genre?', type: 'text' },
    { key: 'referenceArtists', label: 'Reference artists or songs?', type: 'text' },
  ],
  'Sound Design': [
    { key: 'description', label: 'Describe the sound design you need', type: 'text' },
  ],
  'Video Production / Videography': [
    { key: 'videoType', label: 'Type of video?', type: 'text' },
    { key: 'concept', label: 'Do you have a concept or storyboard?', type: 'text' },
    { key: 'videoLength', label: 'Desired video length?', type: 'text' },
    { key: 'location', label: 'On-location or studio?', type: 'select', options: ['Studio Only', 'On-Location', 'Both'] },
  ],
  'Podcast Editing': [
    { key: 'podcastDetails', label: 'Podcast details or notes', type: 'text' },
  ],
  'Consultation / Strategy Session': [
    { key: 'consultationNotes', label: 'What would you like to discuss?', type: 'text' },
  ],
};

const generalQuestions = [
  { key: 'projectTitle', label: 'Project Title / Song Name', type: 'text' },
  { key: 'otherNotes', label: 'Anything else we should know?', type: 'text' },
  { key: 'contactMethod', label: 'Best way to contact you?', type: 'select', options: ['Text', 'Email', 'Phone Call'] },
];

// Add a mapping from selectedServices keys to serviceQuestions keys
const serviceKeyMap: { [key: string]: string } = {
  'vocal-recording': 'Vocal Recording',
  'instrument-tracking': 'Instrument Tracking',
  'mixing': 'Mixing',
  'mastering': 'Mastering',
  'full-production': 'Full Production',
  'sound-design': 'Sound Design',
  'video-production': 'Video Production / Videography',
  'videography': 'Video Production / Videography',
  'podcast-editing': 'Podcast Editing',
  'consultation': 'Consultation / Strategy Session',
  'consultation-strategy-session': 'Consultation / Strategy Session',
};

const MyBookingsPage = () => {
  const { user } = useAuth();
  const [bookings, setBookings] = useState<any[]>([]);
  const [selectedBooking, setSelectedBooking] = useState<any | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [formState, setFormState] = useState<any>({});
  const [uploading, setUploading] = useState(false);
  const [success, setSuccess] = useState(false);
  const storage = getStorage();

  useEffect(() => {
    if (!user) return;
    const bookingsCol = collection(firestore, 'bookings');
    const q = query(bookingsCol, where('userId', '==', user.uid), where('status', '==', 'confirmed'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetched = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        start: (doc.data().start as Timestamp).toDate(),
        end: (doc.data().end as Timestamp).toDate(),
      }));
      setBookings(fetched);
    });
    return () => unsubscribe();
  }, [user]);

  const handleInputChange = (key: string, value: any) => {
    setFormState((prev: any) => ({ ...prev, [key]: value }));
  };

  const handleFileUpload = async (key: string, file: File) => {
    setUploading(true);
    const fileRef = ref(storage, `booking_uploads/${selectedBooking.id}/${key}_${file.name}`);
    await uploadBytes(fileRef, file);
    const url = await getDownloadURL(fileRef);
    setFormState((prev: any) => ({ ...prev, [key]: url }));
    setUploading(false);
  };

  const handleSaveDetails = async () => {
    if (!selectedBooking) return;
    const bookingRef = doc(firestore, 'bookings', selectedBooking.id);
    await updateDoc(bookingRef, { sessionDetails: formState });
    setSuccess(true);
    setTimeout(() => { setShowModal(false); setSuccess(false); }, 1500);
  };

  return (
    <div>
      <h1 className="text-2xl font-logo text-accent-blue mb-6">My Bookings</h1>
      <div className="bg-slate-50 p-6 rounded-lg shadow">
        {bookings.length === 0 ? (
          <p className="text-foreground/80">
            You have no confirmed bookings yet.
          </p>
        ) : (
          <ul className="space-y-4">
            {bookings.map(booking => (
              <li key={booking.id} className="border-b pb-4">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between">
                  <div>
                    <div className="font-semibold">{booking.producerName || 'Session'}</div>
                    <div className="text-sm text-slate-600">{booking.start.toLocaleString()} - {booking.end.toLocaleString()}</div>
                  </div>
                  <button
                    className="mt-2 md:mt-0 px-4 py-2 bg-accent-green text-white rounded shadow hover:bg-accent-green/90"
                    onClick={() => { setSelectedBooking(booking); setShowModal(true); }}
                  >
                    Add Session Details / Upload Files
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
      {showModal && selectedBooking && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-8 max-w-lg w-full">
            <h2 className="text-xl font-bold mb-4">Session Details & File Upload</h2>
            <div className="mb-4 space-y-4">
              {selectedBooking.selectedServices && selectedBooking.selectedServices.map((service: string) => {
                const mappedKey = serviceKeyMap[service] || service;
                return (
                  <div key={service} className="mb-2">
                    <div className="font-semibold text-accent-blue mb-1">{mappedKey}</div>
                    {serviceQuestions[mappedKey]?.map((q: ServiceQuestion) => {
                      if (q.dependsOn && formState[q.dependsOn] !== q.dependsValue) return null;
                      if (q.type === 'boolean') {
                        return (
                          <div key={q.key} className="mb-1 flex items-center space-x-2">
                            <label className="text-sm">{q.label}</label>
                            <input type="checkbox" checked={!!formState[q.key]} onChange={e => handleInputChange(q.key, e.target.checked)} />
                          </div>
                        );
                      }
                      if (q.type === 'select') {
                        return (
                          <div key={q.key} className="mb-1">
                            <label className="text-sm">{q.label}</label>
                            <select className="ml-2 border rounded" value={formState[q.key] || ''} onChange={e => handleInputChange(q.key, e.target.value)}>
                              <option value="">Select...</option>
                              {q.options && q.options.map((opt: string) => <option key={opt} value={opt}>{opt}</option>)}
                            </select>
                          </div>
                        );
                      }
                      if (q.type === 'file') {
                        return (
                          <div key={q.key} className="mb-1">
                            <label className="text-sm">{q.label}</label>
                            <input type="file" className="ml-2" onChange={e => e.target.files && handleFileUpload(q.key, e.target.files[0])} />
                            {uploading && <span className="ml-2 text-xs text-blue-600">Uploading...</span>}
                            {formState[q.key] && <a href={formState[q.key]} target="_blank" rel="noopener noreferrer" className="ml-2 text-xs text-green-600 underline">View File</a>}
                          </div>
                        );
                      }
                      if (q.type === 'checkbox-group') {
                        return (
                          <div key={q.key} className="mb-1">
                            <label className="text-sm block mb-1">{q.label}</label>
                            <div className="flex flex-wrap gap-2">
                              {q.options && q.options.map((opt: string) => (
                                <label key={opt} className="flex items-center space-x-1">
                                  <input
                                    type="checkbox"
                                    checked={Array.isArray(formState[q.key]) && formState[q.key].includes(opt)}
                                    onChange={e => {
                                      const prev = Array.isArray(formState[q.key]) ? formState[q.key] : [];
                                      if (e.target.checked) {
                                        handleInputChange(q.key, [...prev, opt]);
                                      } else {
                                        handleInputChange(q.key, prev.filter((v: string) => v !== opt));
                                      }
                                    }}
                                  />
                                  <span>{opt}</span>
                                </label>
                              ))}
                            </div>
                          </div>
                        );
                      }
                      return (
                        <div key={q.key} className="mb-1">
                          <label className="text-sm">{q.label}</label>
                          <input type={q.type} className="ml-2 border rounded" value={formState[q.key] || ''} onChange={e => handleInputChange(q.key, e.target.value)} />
                        </div>
                      );
                    })}
                  </div>
                );
              })}
              {/* General questions */}
              <div className="mt-4">
                <div className="font-semibold text-accent-blue mb-1">General</div>
                {generalQuestions.map((q: ServiceQuestion) => (
                  <div key={q.key} className="mb-1">
                    <label className="text-sm">{q.label}</label>
                    {q.type === 'select' ? (
                      <select className="ml-2 border rounded" value={formState[q.key] || ''} onChange={e => handleInputChange(q.key, e.target.value)}>
                        <option value="">Select...</option>
                        {q.options && q.options.map((opt: string) => <option key={opt} value={opt}>{opt}</option>)}
                      </select>
                    ) : (
                      <input type={q.type} className="ml-2 border rounded" value={formState[q.key] || ''} onChange={e => handleInputChange(q.key, e.target.value)} />
                    )}
                  </div>
                ))}
              </div>
            </div>
            {success && <div className="text-green-600 font-semibold">Session details saved!</div>}
            <button onClick={handleSaveDetails} className="mt-4 px-4 py-2 rounded bg-accent-green text-white" disabled={uploading}>Save Details</button>
            <button onClick={() => setShowModal(false)} className="mt-4 px-4 py-2 rounded bg-accent-green text-white">Close</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default MyBookingsPage; 