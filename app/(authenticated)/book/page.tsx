'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Calendar, dateFnsLocalizer, Event as BigCalendarEvent, SlotInfo, Views } from 'react-big-calendar';
import { 
    format, parse, startOfWeek, getDay, addHours, setHours, setMinutes, setSeconds, 
    isBefore, isEqual, addMinutes, differenceInMinutes, isWithinInterval, isAfter, toDate
} from 'date-fns';
import { enUS } from 'date-fns/locale/en-US';
import { firestore } from '../../../firebase/config'; // Corrected Firebase Firestore instance path
import { collection, addDoc, query, where, onSnapshot, Timestamp } from 'firebase/firestore'; // Firestore functions
import { useAuth } from '@/context/AuthContext'; // Corrected Auth context path using alias

// Define our custom event type
interface MyCalendarEvent extends BigCalendarEvent {
  // We can add custom properties later if needed, e.g., bookingType: 'unavailable' | 'user_selection'
  isUnavailable?: boolean;
  isSelection?: boolean;
  isPendingStart?: boolean;
}

const locales = { 'en-US': enUS };
const localizer = dateFnsLocalizer({ format, parse, startOfWeek, getDay, locales });

// Define typical studio operating hours
const studioOpenTime = 9; // 9 AM
const studioCloseTime = 21; // 9 PM
const calendarStep = 30; // Granularity of calendar slots in minutes

// Helper function moved before its first use
const createDateFromTimeString = (timeString: string, baseDate: Date): Date => {
  const [hours, minutes] = timeString.split(':').map(Number);
  return setSeconds(setMinutes(setHours(new Date(baseDate), hours), minutes), 0);
};

// Define initial sample bookings directly for clarity - THIS WILL BE REPLACED BY FIRESTORE DATA
// const initialSampleBookings: MyCalendarEvent[] = [
//     { title: 'Booked Slot', start: createDateFromTimeString('10:00', new Date()), end: createDateFromTimeString('12:00', new Date()), isUnavailable: true },
//     { title: 'Booked Slot', start: createDateFromTimeString('14:30', new Date()), end: createDateFromTimeString('16:00', new Date()), isUnavailable: true },
//     // You can add more for testing across different days/times
//     { title: 'Next Day Booking', start: createDateFromTimeString('11:00', addMinutes(new Date(), 24*60)), end: createDateFromTimeString('13:30', addMinutes(new Date(), 24*60)), isUnavailable: true },
// ];

export default function BookPage() {
  const { user } = useAuth(); // Get current user
  // State for existing bookings (would be fetched from Firestore in a real app)
  const [existingBookings, setExistingBookings] = useState<MyCalendarEvent[]>([]);
  
  // State for all events to display on the calendar (existing bookings + user's current selection)
  const [eventsForCalendar, setEventsForCalendar] = useState<MyCalendarEvent[]>([]);
  
  const [pendingStartTime, setPendingStartTime] = useState<Date | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<{ start: Date; end: Date } | null>(null);
  
  const [producer, setProducer] = useState<string>('');
  const [services, setServices] = useState<{[key: string]: boolean}>({});
  const [notes, setNotes] = useState('');

  const clearSelectionStates = useCallback(() => {
    setPendingStartTime(null);
    setSelectedSlot(null);
  }, []);

  // Effect to fetch bookings from Firestore
  useEffect(() => {
    if (!user) return; // Don't fetch if user is not logged in

    const bookingsCol = collection(firestore, 'bookings');
    // Example: Query for bookings in the current month or a relevant range
    // For now, fetching all bookings for simplicity, but you'll want to optimize this
    const q = query(bookingsCol); 

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetchedBookings: MyCalendarEvent[] = snapshot.docs.map(doc => {
        const data = doc.data();
        // Convert Firestore Timestamps to Date objects
        const start = (data.start as Timestamp).toDate();
        const end = (data.end as Timestamp).toDate();
        return {
          title: doc.id === user.uid ? 'Your Booking' : 'Booked Slot', // Customize title
          start,
          end,
          isUnavailable: doc.id !== user.uid, // Mark as unavailable if not the current user's booking
          // Potentially add other data like bookingId: doc.id
        };
      });
      setExistingBookings(fetchedBookings);
    });

    return () => unsubscribe(); // Cleanup listener on component unmount
  }, [user]);

  // Effect to update the events shown on the calendar when existingBookings or selectedSlot changes
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
    const { start: clickedCellStartTime, end: clickedCellEndTime, action } = slotInfo;

    if (action === 'doubleClick') return; 

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

  // TODO: Service options
  const serviceOptions = [
    { id: 'mixing', label: 'Mixing' },
    { id: 'mastering', label: 'Mastering' },
    { id: 'vocal-recording', label: 'Vocal Recording' },
    { id: 'instrument-tracking', label: 'Instrument Tracking' },
    { id: 'production', label: 'Full Production' },
  ];

  // TODO: Producer options (fetch from Firestore or hardcode)
  const producerOptions = ['Jay Anomaly', 'Donte', 'No Preference'];

  const handleServiceChange = (serviceId: string) => {
    setServices(prev => ({ ...prev, [serviceId]: !prev[serviceId] }));
  };

  const handleSubmitBooking = async () => {
    if (!selectedSlot) {
      alert('Please select a time slot on the calendar.');
      return;
    }
    if (!user) {
      alert('You must be logged in to book a session.');
      return;
    }

    const bookingData = {
      userId: user.uid, // Store the user's ID with the booking
      start: Timestamp.fromDate(selectedSlot.start), // Convert Date to Firestore Timestamp
      end: Timestamp.fromDate(selectedSlot.end),   // Convert Date to Firestore Timestamp
      producer,
      selectedServices: Object.entries(services).filter(([, val]) => val).map(([key]) => key),
      notes,
      status: 'pending', // Default status
      createdAt: Timestamp.now(),
    };

    try {
      const docRef = await addDoc(collection(firestore, 'bookings'), bookingData);
      console.log('Booking Submitted with ID: ', docRef.id, bookingData);
      alert('Booking request submitted! Your booking is pending confirmation.');
      clearSelectionStates();
      setProducer('');
      setServices({});
      setNotes('');
      // No need to manually add to existingBookings, Firestore listener will update it
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
          <div className="h-[600px] md:h-[700px]">
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
              views={[Views.WEEK, Views.DAY, Views.MONTH]}
              step={calendarStep}
              timeslots={60 / calendarStep}
              min={minCalendarTime} 
              max={maxCalendarTime}
              eventPropGetter={(event) => {
                let style: React.CSSProperties = {};
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
                } else {
                  style.backgroundColor = '#a0aec0'; 
                  style.borderColor = '#718096';
                }
                return { style };
              }}
            />
          </div>
        </div>

        <div className="lg:col-span-1 space-y-6 bg-slate-50/80 backdrop-blur-sm p-4 md:p-6 rounded-xl shadow-xl">
          <div className="flex justify-between items-center">
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
                <p className="text-foreground/90">
                  Date: {format(selectedSlot.start, 'PPP')}
                </p>
                <p className="text-foreground/90">
                  Time: {format(selectedSlot.start, 'p')} - {format(selectedSlot.end, 'p')}
                </p>
                <p className="text-foreground/90">
                  Duration: {differenceInMinutes(selectedSlot.end, selectedSlot.start) / 60} hours
                </p>
              </div>

              <div className="space-y-2">
                <label htmlFor="producer" className="block text-sm font-medium text-foreground/80">Producer/Engineer:</label>
                <select 
                    id="producer" 
                    value={producer} 
                    onChange={(e) => setProducer(e.target.value)}
                    className="w-full p-2 border border-slate-300 rounded-md shadow-sm focus:ring-accent-pink focus:border-accent-pink"
                >
                    <option value="" disabled>Select a producer</option>
                    {producerOptions.map(p => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-medium text-foreground/80">Services Needed:</label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {serviceOptions.map(service => (
                    <div key={service.id} className="flex items-center">
                      <input 
                        type="checkbox" 
                        id={service.id} 
                        checked={services[service.id] || false} 
                        onChange={() => handleServiceChange(service.id)}
                        className="h-4 w-4 text-accent-pink border-slate-300 rounded focus:ring-accent-pink mr-2"
                      />
                      <label htmlFor={service.id} className="text-sm text-foreground/90">{service.label}</label>
                    </div>
                  ))}
                </div>
              </div>
              
              <div className="space-y-2">
                <label htmlFor="notes" className="block text-sm font-medium text-foreground/80">Additional Notes/Requests:</label>
                <textarea 
                    id="notes" 
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    rows={3} 
                    className="w-full p-2 border border-slate-300 rounded-md shadow-sm focus:ring-accent-pink focus:border-accent-pink"
                    placeholder="e.g., specific microphone, setup requirements"
                />
              </div>

              <button 
                onClick={handleSubmitBooking}
                className="w-full mt-6 py-3 px-4 bg-accent-green text-white font-logo rounded-lg shadow-md hover:bg-accent-green/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-accent-green transition-colors"
              >
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
  );
} 