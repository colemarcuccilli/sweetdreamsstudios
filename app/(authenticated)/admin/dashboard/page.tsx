'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import { firestore } from '../../../../firebase/config';
import { collection, onSnapshot, query, orderBy, doc, updateDoc, Timestamp, getDoc } from 'firebase/firestore';
import { format } from 'date-fns';

interface Booking {
  id: string;
  userId: string;
  studioId: string;
  engineerId: string;
  producerName: string;
  start: Date;
  end: Date;
  selectedServices: string[];
  notes: string;
  status: 'pending' | 'confirmed' | 'rejected' | 'completed';
  createdAt: Date;
  // User details are now explicitly part of the interface
  userName: string;
  userEmail: string;
}

const AdminDashboard = () => {
  const { user, isAdmin, loading } = useAuth();
  const router = useRouter();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [isLoadingBookings, setIsLoadingBookings] = useState(true);
  const [isUpdating, setIsUpdating] = useState<string | null>(null); // To track which booking is being updated

  useEffect(() => {
    if (!loading && !isAdmin) {
      router.push('/');
    }
  }, [user, isAdmin, loading, router]);

  useEffect(() => {
    if (!isAdmin) return;

    const bookingsCol = collection(firestore, 'bookings');
    const q = query(bookingsCol, orderBy('start', 'desc'));

    const unsubscribe = onSnapshot(q, async (snapshot) => {
      const bookingsPromises = snapshot.docs.map(async (bookingDoc) => {
        const data = bookingDoc.data();
        
        let userName = 'Unknown User';
        let userEmail = 'N/A';

        // Fetch user data for each booking
        if (data.userId) {
          const userRef = doc(firestore, 'users', data.userId);
          const userSnap = await getDoc(userRef);
          if (userSnap.exists()) {
            userName = userSnap.data().displayName || 'No Display Name';
            userEmail = userSnap.data().email || 'No Email';
          }
        }
        
        return {
          id: bookingDoc.id,
          ...data,
          start: (data.start as Timestamp).toDate(),
          end: (data.end as Timestamp).toDate(),
          createdAt: (data.createdAt as Timestamp).toDate(),
          userName,
          userEmail,
        } as Booking;
      });

      const fetchedBookings = await Promise.all(bookingsPromises);
      setBookings(fetchedBookings);
      setIsLoadingBookings(false);
    });

    return () => unsubscribe();
  }, [isAdmin]);

  const handleUpdateStatus = async (bookingId: string, status: Booking['status']) => {
    console.log('--- handleUpdateStatus Initiated ---');
    console.log('Auth loading state:', loading);
    console.log('Is user admin on client?', isAdmin);
    console.log('User UID on client:', user?.uid);

    if (!isAdmin) {
      alert('Client-side check failed: You are not recognized as an admin.');
      console.log('Update blocked by client-side !isAdmin check.');
      return;
    }
    if (isUpdating) {
      console.log('Update blocked: another update is already in progress.');
      return;
    }
    
    setIsUpdating(bookingId);

    const bookingRef = doc(firestore, 'bookings', bookingId);
    try {
      console.log(`Attempting to update booking ${bookingId} to status: ${status}`);
      await updateDoc(bookingRef, { status });
      console.log('Booking status updated successfully in Firestore.');
    } catch (error) {
      console.error("Firestore Error: ", error);
      alert('Failed to update booking status. See console for details.');
    } finally {
      setIsUpdating(null);
    }
  };

  if (loading || isLoadingBookings) {
    return (
      <div className="flex justify-center items-center h-screen">
        <p className="text-xl font-logo">Loading Dashboard...</p>
      </div>
    );
  }

  if (!isAdmin) {
    return (
        <div className="flex justify-center items-center h-screen">
            <p className="text-xl font-logo text-accent-red">Access Denied</p>
        </div>
    );
  }

  return (
    <div className="p-4 md:p-8 space-y-6">
      <h1 className="text-3xl md:text-4xl font-logo text-accent-green">Admin Dashboard</h1>
      <div className="bg-white/80 backdrop-blur-sm p-4 rounded-lg shadow-md">
        <h2 className="text-2xl font-logo text-accent-blue mb-4">All Bookings</h2>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Date & Time</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Client</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Producer</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Status</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-slate-200">
              {bookings.length > 0 ? bookings.map((booking) => (
                <tr key={booking.id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-800">
                    <div>{format(booking.start, 'PPP')}</div>
                    <div className="text-slate-500">{format(booking.start, 'p')} - {format(booking.end, 'p')}</div>
                  </td>
                   <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-800">
                    <div>{booking.userName}</div>
                    <div className="text-xs text-slate-500">{booking.userEmail}</div>
                   </td>
                   <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">{booking.producerName}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        booking.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                        booking.status === 'confirmed' ? 'bg-green-100 text-green-800' :
                        booking.status === 'rejected' ? 'bg-red-100 text-red-800' : 'bg-slate-100 text-slate-800'
                    }`}>
                      {booking.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex items-center justify-start space-x-2">
                    {booking.status === 'pending' && (
                        <>
                          <button 
                            onClick={() => handleUpdateStatus(booking.id, 'confirmed')} 
                            disabled={isUpdating === booking.id}
                            className="inline-flex items-center justify-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-md shadow-sm text-white bg-accent-green hover:bg-accent-green/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-accent-green disabled:bg-slate-300 disabled:cursor-not-allowed">
                            {isUpdating === booking.id ? '...' : 'Confirm'}
                          </button>
                          <button 
                            onClick={() => handleUpdateStatus(booking.id, 'rejected')} 
                            disabled={isUpdating === booking.id}
                            className="inline-flex items-center justify-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-md shadow-sm text-white bg-accent-red hover:bg-accent-red/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-accent-red disabled:bg-slate-300 disabled:cursor-not-allowed">
                            {isUpdating === booking.id ? '...' : 'Reject'}
                          </button>
                        </>
                    )}
                     {booking.status === 'confirmed' && (
                        <button 
                          onClick={() => handleUpdateStatus(booking.id, 'completed')} 
                          disabled={isUpdating === booking.id}
                          className="inline-flex items-center justify-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-md shadow-sm text-white bg-accent-blue hover:bg-accent-blue/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-accent-blue disabled:bg-slate-300 disabled:cursor-not-allowed">
                          {isUpdating === booking.id ? '...' : 'Complete'}
                        </button>
                    )}
                    </div>
                  </td>
                </tr>
              )) : (
                <tr>
                    <td colSpan={5} className="text-center py-10 text-slate-500">No bookings found.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard; 