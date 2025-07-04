'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import { db as firestore } from '@/lib/firebase';
import { collection, onSnapshot, query, where, Timestamp } from 'firebase/firestore';
import { Calendar, dateFnsLocalizer, Event as BigCalendarEvent } from 'react-big-calendar';
import { format, parse, startOfWeek, getDay, setHours, setMinutes, addDays } from 'date-fns';
import { enUS } from 'date-fns/locale/en-US';
import "react-big-calendar/lib/css/react-big-calendar.css";

const locales = { 'en-US': enUS };

// Custom startOfWeek: always today
const customStartOfWeek = () => {
  const today = new Date();
  return new Date(today.getFullYear(), today.getMonth(), today.getDate());
};
const customLocalizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek: customStartOfWeek,
  getDay,
  locales,
});

interface ScheduleEvent extends BigCalendarEvent {
  id: string;
  isConfirmed?: boolean;
  isRejected?: boolean;
  status?: string;
  userId?: string;
  producerName?: string;
}

// Custom week range for calendar: always today + next 6 days
const getCustomWeekRange = (date: Date) => {
  const start = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const end = addDays(start, 6);
  const range = [];
  let current = start;
  while (current <= end) {
    range.push(new Date(current));
    current = addDays(current, 1);
  }
  return range;
};
const customWeekView = {
  range: getCustomWeekRange,
  title: (date: Date) => {
    const start = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    const end = addDays(start, 6);
    return `${format(start, 'MMM dd')} - ${format(end, 'MMM dd')}`;
  },
};

const AdminSchedulePage = () => {
  const { user, isAdmin, loading } = useAuth();
  const router = useRouter();
  const [myEvents, setMyEvents] = useState<ScheduleEvent[]>([]);
  const [isLoadingSchedule, setIsLoadingSchedule] = useState(true);
  const [selectedBooking, setSelectedBooking] = useState<any | null>(null);
  const [calendarDate, setCalendarDate] = useState(new Date());

  useEffect(() => {
    if (!loading && !isAdmin) {
      router.push('/'); // Redirect if not an admin
    }
  }, [user, isAdmin, loading, router]);

  useEffect(() => {
    if (!isAdmin || !user) return;

    const bookingsCol = collection(firestore, 'bookings');
    const q = query(bookingsCol);
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetchedEvents = snapshot.docs
        .map(doc => {
          const data = doc.data();
          if (data.status !== 'confirmed') return null;
          return {
            ...data,
            id: doc.id,
            title: 'Confirmed Booking',
            start: (data.start as Timestamp).toDate(),
            end: (data.end as Timestamp).toDate(),
            isConfirmed: true,
          } as ScheduleEvent;
        })
        .filter((e): e is ScheduleEvent => !!e);
      setMyEvents(fetchedEvents);
      setIsLoadingSchedule(false);
    });
    return () => unsubscribe();
  }, [isAdmin]);

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

  const minCalendarTime = setMinutes(setHours(new Date(1970, 0, 1), 9), 0); // 9:00 AM
  const maxCalendarTime = setMinutes(setHours(new Date(1970, 0, 1), 23), 59); // 11:59 PM

  return (
    <div className="space-y-6">
      <h1 className="text-3xl md:text-4xl font-logo text-accent-green">Studio Schedule</h1>
      <div className="bg-white/80 backdrop-blur-sm p-4 md:p-6 rounded-xl shadow-xl w-full max-w-[1400px] h-[1500px] mx-auto">
        <Calendar
          localizer={customLocalizer}
          events={myEvents}
          startAccessor="start"
          endAccessor="end"
          style={{ height: '100%', width: '100%' }}
          views={['week', 'month']}
          defaultView="week"
          date={calendarDate}
          onNavigate={setCalendarDate}
          min={minCalendarTime}
          max={maxCalendarTime}
          step={60}
          timeslots={1}
          popup
          toolbar={true}
          onSelectEvent={setSelectedBooking}
          eventPropGetter={(event) => {
            let style: React.CSSProperties = {
              backgroundColor: '#22c55e', // Green for confirmed
              borderColor: '#16a34a',
              color: 'white',
            };
            return { style };
          }}
        />
        {selectedBooking && (
          <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-xl p-8 max-w-md w-full">
              <h2 className="text-xl font-bold mb-4">Booking Details</h2>
              <div className="mb-2">Status: {selectedBooking.status}</div>
              <div className="mb-2">Date: {format(selectedBooking.start, 'PPP')}</div>
              <div className="mb-2">Time: {format(selectedBooking.start, 'p')} - {format(selectedBooking.end, 'p')}</div>
              <div className="mb-2">User ID: {selectedBooking.userId}</div>
              <div className="mb-2">Producer: {selectedBooking.producerName}</div>
              <button onClick={() => setSelectedBooking(null)} className="mt-4 px-4 py-2 rounded bg-accent-green text-white">Close</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminSchedulePage; 