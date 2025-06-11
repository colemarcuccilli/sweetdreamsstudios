'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Calendar, dateFnsLocalizer, Event as BigCalendarEvent, SlotInfo, Views } from 'react-big-calendar';
import { 
    format, parse, startOfWeek, getDay, addHours, setHours, setMinutes, setSeconds, 
    isBefore, isEqual, addMinutes, differenceInMinutes, isAfter, toDate
} from 'date-fns';
import { enUS } from 'date-fns/locale/en-US';
import { firestore } from '../../../firebase/config';
import { collection, addDoc, query, where, onSnapshot, Timestamp } from 'firebase/firestore';
import { useAuth } from '@/context/AuthContext';

// Define our custom event type
interface MyCalendarEvent extends BigCalendarEvent {
  isUnavailable?: boolean;
  isSelection?: boolean;
  isPendingStart?: boolean;
  isMyBooking?: boolean;
}

const locales = { 'en-US': enUS };
const localizer = dateFnsLocalizer({ format, parse, startOfWeek, getDay, locales });

const studioOpenTime = 9; // 9 AM
const studioCloseTime = 21; // 9 PM
const calendarStep = 30;

export default function BookPage() {
  const { user } = useAuth();
  const [existingBookings, setExistingBookings] = useState<MyCalendarEvent[]>([]);
  const [myConfirmedBookings, setMyConfirmedBookings] = useState<MyCalendarEvent[]>([]);
  const [eventsForCalendar, setEventsForCalendar] = useState<MyCalendarEvent[]>([]);
  const [pendingStartTime, setPendingStartTime] = useState<Date | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<{ start: Date; end: Date } | null>(null);
  const [producer, setProducer] = useState<string>('');
  const [services, setServices] = useState<{[key: string]: boolean}>({});
  const [notes, setNotes] = useState('');

  const DEFAULT_STUDIO_ID = 'YOUR_SWEET_DREAMS_PARNELL_STUDIO_ID';
  const DEFAULT_ENGINEER_UID = 'PpzY2fWOt4V4qwHYClGVomHInb82';
  const DEFAULT_PRODUCER_NAME = 'Jay Valleo';

  const clearSelectionStates = useCallback(() => {
    setPendingStartTime(null);
    setSelectedSlot(null);
  }, []);

  // Effect to fetch ALL bookings for the main calendar (to show unavailable slots)
  useEffect(() => {
    if (!user) return;
    const bookingsCol = collection(firestore, 'bookings');
    const q = query(bookingsCol); 

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetchedBookings: MyCalendarEvent[] = snapshot.docs.map(doc => {
        const data = doc.data();
        const isOwnBooking = data.userId === user.uid;
        return {
          title: isOwnBooking ? 'Your Booking' : 'Booked Slot',
          start: (data.start as Timestamp).toDate(),
          end: (data.end as Timestamp).toDate(),
          isUnavailable: !isOwnBooking,
        };
      });
      setExistingBookings(fetchedBookings);
    });
    return () => unsubscribe();
  }, [user]);
  
  // Effect to fetch ONLY the current user's confirmed bookings for their personal schedule
  useEffect(() => {
    if(!user) return;
    const bookingsCol = collection(firestore, 'bookings');
    const q = query(bookingsCol, where('userId', '==', user.uid), where('status', '==', 'confirmed'));

    const unsubscribe = onSnapshot(q, (snapshot) => {
        const fetchedBookings = snapshot.docs.map(doc => {
            const data = doc.data();
            return {
                title: 'Confirmed Session',
                start: (data.start as Timestamp).toDate(),
                end: (data.end as Timestamp).toDate(),
                isMyBooking: true,
            };
        });
        setMyConfirmedBookings(fetchedBookings);
    });

    return () => unsubscribe();
  }, [user]);

  // Combined effect to update the main calendar
  useEffect(() => {
    let currentEvents: MyCalendarEvent[] = [...existingBookings];
    if (selectedSlot) {
      currentEvents.push({ 
        title: 'Your Selection', 
        start: selectedSlot.start, 
        end: selectedSlot.end, 
        isSelection: true 
      });
    } else if (pendingStartTime) {
      currentEvents.push({ 
        title: 'Start Time?', 
        start: pendingStartTime, 
        end: addMinutes(pendingStartTime, calendarStep), 
        isPendingStart: true 
      });
    }
    setEventsForCalendar(currentEvents);
  }, [selectedSlot, pendingStartTime, existingBookings]);

  const handleSelectSlot = (slotInfo: SlotInfo) => {
    const { start: clickedCellStartTime, end: clickedCellEndTime } = slotInfo;

    if (!pendingStartTime) {
      setSelectedSlot(null);
      setPendingStartTime(clickedCellStartTime);
    } else {
      let finalStartTime: Date;
      let finalEndTime: Date;

      if (isBefore(clickedCellStartTime, pendingStartTime)) {
        setPendingStartTime(clickedCellStartTime);
        setSelectedSlot(null);
        return;
      } else if (isEqual(clickedCellStartTime, pendingStartTime)) {
        setPendingStartTime(null);
        return;
      } else {
        finalStartTime = pendingStartTime;
        finalEndTime = clickedCellEndTime;
      }

      const conflict = existingBookings.find((booking: MyCalendarEvent) => {
        const bookingStart = booking.start as Date;
        const bookingEnd = booking.end as Date;
        return isBefore(finalStartTime, bookingEnd) && isAfter(finalEndTime, bookingStart);
      });

      if (conflict) {
        alert('This time slot is unavailable or conflicts with an existing booking.');
        clearSelectionStates();
        return;
      }

      const minDurationMinutes = 60;
      if (differenceInMinutes(finalEndTime, finalStartTime) < minDurationMinutes) {
        alert(`Minimum booking duration is ${minDurationMinutes / 60} hour(s). Please select a valid end time.`);
        return;
      }
      
      setSelectedSlot({ start: finalStartTime, end: finalEndTime });
      setPendingStartTime(null);
      setProducer('');
      setServices({});
      setNotes('');
    }
  };

  const serviceOptions = [
    { id: 'mixing', label: 'Mixing' },
    { id: 'mastering', label: 'Mastering' },
    { id: 'vocal-recording', label: 'Vocal Recording' },
    { id: 'instrument-tracking', label: 'Instrument Tracking' },
    { id: 'production', label: 'Full Production' },
  ];

  const handleServiceChange = (serviceId: string) => {
    setServices(prev => ({ ...prev, [serviceId]: !prev[serviceId] }));
  };

  const handleSubmitBooking = async () => {
    if (!selectedSlot || !user) {
      alert('Please select a time slot and ensure you are logged in.');
      return;
    }

    const bookingData = {
      userId: user.uid,
      studioId: DEFAULT_STUDIO_ID,
      engineerId: DEFAULT_ENGINEER_UID,
      producerName: DEFAULT_PRODUCER_NAME,
      start: Timestamp.fromDate(selectedSlot.start),
      end: Timestamp.fromDate(selectedSlot.end),
      selectedServices: Object.entries(services).filter(([, val]) => val).map(([key]) => key),
      notes,
      status: 'pending',
      createdAt: Timestamp.now(),
    };

    try {
      await addDoc(collection(firestore, 'bookings'), bookingData);
      alert('Booking request submitted! Your booking is pending confirmation.');
      clearSelectionStates();
      setProducer('');
      setServices({});
      setNotes('');
    } catch (error) {
      console.error('Error adding document: ', error);
      alert('Failed to submit booking. Please try again.');
    }
  };

  const minCalendarTime = setMinutes(setHours(new Date(0), studioOpenTime), 0);
  const maxCalendarTime = setMinutes(setHours(new Date(0), studioCloseTime),0);

  const handleEventSelection = (event: MyCalendarEvent) => {
    if (event.isSelection || event.isPendingStart) {
      clearSelectionStates();
    }
  };

  return (
    <div className="space-y-8 p-4 md:p-6">
      <h1 className="text-3xl md:text-4xl font-logo text-accent-green text-center">Book Your Studio Time</h1>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        <div className="lg:col-span-2 bg-slate-50/80 backdrop-blur-sm p-4 md:p-6 rounded-xl shadow-xl">
          <h2 className="text-2xl font-logo text-accent-blue mb-1">1. Select Date & Time Slot</h2>
          <p className="text-sm text-foreground/70 mb-4">
            {pendingStartTime 
              ? `Start time ${format(pendingStartTime, 'p')} selected. Tap a second slot for end time.` 
              : 'Tap an available slot for start time, then tap another slot for end time. Min 1 hour.'
            }
          </p>
          <div className="h-[700px]">
            <Calendar
              localizer={localizer}
              events={eventsForCalendar}
              startAccessor="start"
              endAccessor="end"
              style={{ height: '100%' }}
              selectable={true}
              onSelectSlot={handleSelectSlot}
              onSelectEvent={handleEventSelection}
              defaultView={Views.WEEK}
              views={[Views.WEEK, Views.DAY]}
              step={calendarStep}
              timeslots={60 / calendarStep}
              min={minCalendarTime} 
              max={maxCalendarTime}
              eventPropGetter={(event) => {
                let style: React.CSSProperties = {
                  backgroundColor: '#a0aec0', 
                  borderColor: '#718096',
                };
                if (event.isUnavailable) {
                  style.backgroundColor = '#ef4444';
                  style.borderColor = '#dc2626'; 
                  style.color = 'white';
                  style.cursor = 'not-allowed';
                } else if (event.isSelection) {
                  style.backgroundColor = '#22c55e';
                  style.borderColor = '#16a34a'; 
                  style.color = 'white';
                } else if (event.isPendingStart) {
                  style.backgroundColor = '#f59e0b';
                  style.borderColor = '#d97706'; 
                  style.color = 'black';
                }
                return { style };
              }}
            />
          </div>
        </div>

        <div className="lg:col-span-1 space-y-6">
          {/* User's Personal Schedule */}
          <div className="bg-slate-50/80 backdrop-blur-sm p-4 md:p-6 rounded-xl shadow-xl">
            <h2 className="text-2xl font-logo text-accent-blue mb-4">My Confirmed Sessions</h2>
            <div className="h-[300px]">
              <Calendar
                  localizer={localizer}
                  events={myConfirmedBookings}
                  startAccessor="start"
                  endAccessor="end"
                  style={{ height: '100%' }}
                  views={['month', 'agenda']}
                  defaultView='month'
                  toolbar={true} // Show toolbar for month/list navigation
                  eventPropGetter={() => ({
                    style: {
                      backgroundColor: '#22c55e', // Green for confirmed bookings
                      borderColor: '#16a34a',
                      color: 'white',
                      cursor: 'default',
                    },
                  })}
              />
            </div>
          </div>

          {/* Booking Form */}
          <div className="bg-slate-50/80 backdrop-blur-sm p-4 md:p-6 rounded-xl shadow-xl">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-2xl font-logo text-accent-blue">2. Session Details</h2>
              {(pendingStartTime || selectedSlot) && (
                  <button onClick={clearSelectionStates} className="text-xs text-accent-red hover:underline font-medium">
                      Clear Selection
                  </button>
              )}
            </div>
            
            {selectedSlot ? (
              <div className="space-y-4">
                <div>
                  <h3 className="text-lg font-semibold text-accent-pink">
                    Selected Slot:
                  </h3>
                  <p className="text-foreground/90">Date: {format(selectedSlot.start, 'PPP')}</p>
                  <p className="text-foreground/90">Time: {format(selectedSlot.start, 'p')} - {format(selectedSlot.end, 'p')}</p>
                  <p className="text-foreground/90">Duration: {differenceInMinutes(selectedSlot.end, selectedSlot.start) / 60} hours</p>
                </div>
                
                <div className="space-y-2">
                  <label htmlFor="producer" className="block text-sm font-medium text-foreground/80">Producer/Engineer:</label>
                  <p className="w-full p-2 border border-slate-300 rounded-md shadow-sm bg-slate-100 text-foreground/90">
                    {DEFAULT_PRODUCER_NAME}
                  </p>
                </div>

                <div className="space-y-2">
                  <label className="block text-sm font-medium text-foreground/80">Services Needed:</label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {serviceOptions.map(service => (
                      <div key={service.id} className="flex items-center">
                        <input type="checkbox" id={service.id} checked={services[service.id] || false} onChange={() => handleServiceChange(service.id)}
                          className="h-4 w-4 text-accent-pink border-slate-300 rounded focus:ring-accent-pink mr-2" />
                        <label htmlFor={service.id} className="text-sm text-foreground/90">{service.label}</label>
                      </div>
                    ))}
                  </div>
                </div>
                
                <div>
                  <label htmlFor="notes" className="block text-lg font-semibold text-foreground/90 mb-1">Additional Notes:</label>
                  <textarea id="notes" value={notes} onChange={(e) => setNotes(e.target.value)} rows={3}
                    placeholder='Any specific requests or details for your session?'
                    className="w-full p-2 border border-foreground/20 rounded-md shadow-sm focus:ring-2 focus:ring-accent-pink/50 focus:border-accent-pink bg-white/80 placeholder:text-foreground/40 text-sm" />
                </div>

                <button onClick={handleSubmitBooking}
                  className="w-full mt-6 py-3 px-4 bg-accent-green text-white font-logo rounded-lg shadow-md hover:bg-accent-green/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-accent-green transition-colors">
                  Request Booking
                </button>
              </div>
            ) : (
              <p className="text-foreground/70 text-center py-10">
                  {pendingStartTime 
                      ? `Start time ${format(pendingStartTime, 'p')} selected. Tap another slot to select end time.` 
                      : 'Please select a start and end time slot on the calendar.'}
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
} 