'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import { firestore } from '../../../../firebase/config';
import { collection, onSnapshot, query, where, Timestamp } from 'firebase/firestore';
import { Calendar, dateFnsLocalizer, Event as BigCalendarEvent } from 'react-big-calendar';
import { format, parse, startOfWeek, getDay, setHours, setMinutes } from 'date-fns';
import { enUS } from 'date-fns/locale/en-US';
import "react-big-calendar/lib/css/react-big-calendar.css";

const locales = { 'en-US': enUS };
const localizer = dateFnsLocalizer({ format, parse, startOfWeek, getDay, locales });

const AdminSchedulePage = () => {
  const { user, isAdmin, loading } = useAuth();
  const router = useRouter();
  const [myEvents, setMyEvents] = useState<BigCalendarEvent[]>([]);
  const [isLoadingSchedule, setIsLoadingSchedule] = useState(true);

  useEffect(() => {
    if (!loading && !isAdmin) {
      router.push('/'); // Redirect if not an admin
    }
  }, [user, isAdmin, loading, router]);

  useEffect(() => {
    if (!isAdmin || !user) return;

    const bookingsCol = collection(firestore, 'bookings');
    // Query for bookings assigned to the current admin/engineer
    const q = query(bookingsCol, where('engineerId', '==', user.uid));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetchedEvents = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          title: `Booking with User: ${data.userId.substring(0, 6)}...`, // Example title
          start: (data.start as Timestamp).toDate(),
          end: (data.end as Timestamp).toDate(),
        };
      });
      setMyEvents(fetchedEvents);
      setIsLoadingSchedule(false);
    });

    return () => unsubscribe();
  }, [isAdmin, user]);

  if (loading || isLoadingSchedule) {
    return (
      <div className="flex justify-center items-center h-screen">
        <p className="text-xl font-logo">Loading Your Schedule...</p>
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

  const minCalendarTime = setMinutes(setHours(new Date(0), 9), 0); // 9 AM
  const maxCalendarTime = setMinutes(setHours(new Date(0), 21), 0); // 9 PM

  return (
    <div className="space-y-6">
      <h1 className="text-3xl md:text-4xl font-logo text-accent-green">My Schedule</h1>
      <div className="bg-white/80 backdrop-blur-sm p-4 md:p-6 rounded-xl shadow-xl h-[75vh]">
        <Calendar
          localizer={localizer}
          events={myEvents}
          startAccessor="start"
          endAccessor="end"
          style={{ height: '100%' }}
          views={['week', 'day']}
          defaultView="week"
          min={minCalendarTime}
          max={maxCalendarTime}
          eventPropGetter={() => ({
            style: {
              backgroundColor: '#3b82f6', // A nice blue for admin's schedule
              borderColor: '#2563eb',
              color: 'white',
            },
          })}
        />
      </div>
    </div>
  );
};

export default AdminSchedulePage; 