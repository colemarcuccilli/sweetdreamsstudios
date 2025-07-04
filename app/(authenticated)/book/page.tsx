'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Calendar, dateFnsLocalizer, Event as BigCalendarEvent, SlotInfo, Views, ToolbarProps } from 'react-big-calendar';
import { 
    format, parse, startOfWeek, getDay, addHours, setHours, setMinutes, setSeconds, 
    isBefore, isEqual, addMinutes, differenceInMinutes, isAfter, toDate, addDays
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
  isMyConfirmed?: boolean;
}

const locales = { 'en-US': enUS };
const localizer = dateFnsLocalizer({ format, parse, startOfWeek, getDay, locales });

const studioOpenTime = 9; // 9 AM
const studioCloseTime = 2; // 2 AM (next day)
const calendarStep = 30;

// --- Helper to get week label ---
const getWeekLabel = (start: Date) => {
  const end = addDays(start, 6);
  const startLabel = format(start, 'MMM dd');
  const endLabel = format(end, 'MMM dd');
  return `${startLabel} - ${endLabel}`;
};

// --- Helper to get array of week starts for dropdown ---
const getFutureWeekStarts = (from: Date, count: number) => {
  const weeks = [];
  let current = new Date(from.getFullYear(), from.getMonth(), from.getDate());
  for (let i = 0; i < count; i++) {
    weeks.push(new Date(current));
    current = addDays(current, 7);
  }
  return weeks;
};

// --- Update CustomToolbar to use dropdown for week selection ---
const CustomToolbar: React.FC<ToolbarProps & { onWeekChange?: (date: Date) => void }> = ({ label, view, views, onNavigate, onView, date, onWeekChange }) => {
  const today = new Date();
  const isNotToday = format(date, 'yyyy-MM-dd') !== format(today, 'yyyy-MM-dd');
  const weekStarts = getFutureWeekStarts(today, 12);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [dropdownOpen, setDropdownOpen] = useState(false);

  // Find the current week index
  const currentWeekIndex = weekStarts.findIndex(weekStart => format(weekStart, 'yyyy-MM-dd') === format(date, 'yyyy-MM-dd'));

  // Handle click outside to close dropdown
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
    }
    if (dropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    } else {
      document.removeEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [dropdownOpen]);

  return (
    <div className="flex items-center justify-between p-2 mb-4 bg-slate-100 rounded-lg">
      <div className="flex items-center space-x-2">
        <button
          type="button"
          onClick={() => onNavigate('TODAY')}
          className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50"
        >
          Today
        </button>
        <button
          type="button"
          onClick={() => onNavigate('NEXT')}
          className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50"
        >
          Next
        </button>
      </div>
      {/* Week Dropdown */}
      <div className="relative" ref={dropdownRef}>
        <button
          type="button"
          className="text-lg font-bold text-gray-800 px-4 py-2 bg-white border border-gray-300 rounded-md shadow-sm flex items-center"
          onClick={() => setDropdownOpen(v => !v)}
        >
          {getWeekLabel(date)}
          <svg className="ml-2 w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" /></svg>
        </button>
        {dropdownOpen && (
          <div className="absolute left-0 mt-2 w-56 bg-white border border-gray-300 rounded-md shadow-lg z-10 max-h-80 overflow-y-auto">
            {weekStarts.map((weekStart, idx) => (
              <button
                key={weekStart.toISOString()}
                className={`block w-full text-left px-4 py-2 hover:bg-accent-blue/10 ${idx === currentWeekIndex ? 'bg-accent-blue/20 font-bold' : ''}`}
                onClick={() => {
                  setDropdownOpen(false);
                  if (onWeekChange) onWeekChange(weekStart);
                }}
              >
                {getWeekLabel(weekStart)}
              </button>
            ))}
          </div>
        )}
      </div>
      <div className="flex items-center space-x-2">
        {(views as string[]).map(viewName => (
          <button
            type="button"
            key={viewName}
            onClick={() => onView(viewName as any)}
            className={`px-4 py-2 text-sm font-medium border border-gray-300 rounded-md shadow-sm ${view === viewName ? 'bg-accent-blue text-white' : 'bg-white text-gray-700 hover:bg-gray-50'}`}
          >
            {viewName.charAt(0).toUpperCase() + viewName.slice(1)}
          </button>
        ))}
      </div>
    </div>
  );
};

// --- Custom week range for calendar ---
const getCustomWeekRange = (date: Date) => {
  const start = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const end = addDays(start, 6);
  return { start, end };
};

// --- Custom week view range for react-big-calendar ---
const customWeekRange = (date: Date) => {
  const { start, end } = getCustomWeekRange(date);
  const range = [];
  let current = start;
  while (current <= end) {
    range.push(new Date(current));
    current = addDays(current, 1);
  }
  return range;
};

// --- Add custom week view config for react-big-calendar ---
const customWeekView = {
  range: customWeekRange,
  title: (date: Date) => {
    const { start, end } = getCustomWeekRange(date);
    return `${format(start, 'MMM dd')} - ${format(end, 'MMM dd')}`;
  },
};

// --- Patch localizer to force week view to start on today ---
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
  const [date, setDate] = useState(new Date()); // State for controlled calendar date
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showConfirm, setShowConfirm] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState<MyCalendarEvent | null>(null);

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
        const isConfirmed = data.status === 'confirmed';
        // Highlight selection
        let isSelection = false;
        let isPendingStart = false;
        if (selectedSlot) {
          const slotStart = selectedSlot.start.getTime();
          const slotEnd = selectedSlot.end.getTime();
          const eventStart = (data.start as Timestamp).toDate().getTime();
          const eventEnd = (data.end as Timestamp).toDate().getTime();
          isSelection = eventStart === slotStart && eventEnd === slotEnd;
          isPendingStart = !!pendingStartTime && eventStart === pendingStartTime.getTime();
        }
        return {
          title: isOwnBooking && isConfirmed ? 'Your Confirmed Booking' : !isOwnBooking ? 'Booked Slot' : '',
          start: (data.start as Timestamp).toDate(),
          end: (data.end as Timestamp).toDate(),
          isUnavailable: !isOwnBooking,
          isMyConfirmed: isOwnBooking && isConfirmed,
          isSelection,
          isPendingStart,
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

  const isPast = (date: Date) => isBefore(date, new Date());

  const isWithinStudioHours = (start: Date, end: Date) => {
    const startHour = start.getHours();
    const endHour = end.getHours();
    // Allow 9:00 AM to 12:00 AM (midnight)
    return startHour >= 9 && (endHour <= 23 || (endHour === 0 && end.getDate() > start.getDate()));
  };

  const handleSelectSlot = (slotInfo: SlotInfo) => {
    setError(null);
    const { start: clickedCellStartTime, end: clickedCellEndTime } = slotInfo;
    if (isPast(clickedCellStartTime)) {
      setError('Cannot book a slot in the past.');
      clearSelectionStates();
      return;
    }
    if (!isWithinStudioHours(clickedCellStartTime, clickedCellEndTime)) {
      setError('Selected slot is outside studio hours.');
      clearSelectionStates();
      return;
    }
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
      if (isPast(finalStartTime) || isPast(finalEndTime)) {
        setError('Cannot book a slot in the past.');
        clearSelectionStates();
        return;
      }
      if (!isWithinStudioHours(finalStartTime, finalEndTime)) {
        setError('Selected slot is outside studio hours.');
        clearSelectionStates();
        return;
      }
      const conflict = existingBookings.find((booking: MyCalendarEvent) => {
        const bookingStart = booking.start as Date;
        const bookingEnd = booking.end as Date;
        return isBefore(finalStartTime, bookingEnd) && isAfter(finalEndTime, bookingStart);
      });
      if (conflict) {
        setError('This time slot is unavailable or conflicts with an existing booking.');
        clearSelectionStates();
        return;
      }
      const minDurationMinutes = 60;
      if (differenceInMinutes(finalEndTime, finalStartTime) < minDurationMinutes) {
        setError(`Minimum booking duration is ${minDurationMinutes / 60} hour(s). Please select a valid end time.`);
        return;
      }
      setSelectedSlot({ start: finalStartTime, end: finalEndTime });
      setPendingStartTime(null);
      setProducer('');
      setServices({});
      setNotes('');
    }
  };

  const handleNavigate = (newDate: Date, view: string) => {
    const today = new Date();
    if (isBefore(newDate, startOfWeek(today))) {
      setDate(today);
    } else {
      setDate(newDate);
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
      setError('Please select a time slot and ensure you are logged in.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
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
      await addDoc(collection(firestore, 'bookings'), bookingData);
      setShowConfirm(false);
      alert('Booking request submitted! Your booking is pending confirmation.');
      clearSelectionStates();
      setProducer('');
      setServices({});
      setNotes('');
    } catch (error) {
      setError('Failed to submit booking. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const minCalendarTime = setMinutes(setHours(new Date(1970, 0, 1), 9), 0); // 9:00 AM
  const maxCalendarTime = setMinutes(setHours(new Date(1970, 0, 1), 23), 59); // 11:59 PM

  const handleEventSelection = (event: MyCalendarEvent) => {
    if (event.isSelection || event.isPendingStart) {
      clearSelectionStates();
    }
  };

  const handleWeekChange = (weekStart: Date) => {
    setDate(weekStart);
  };

  const adjustSelectedTime = (which: 'start' | 'end', minutes: number) => {
    if (!selectedSlot) return;
    let newStart = selectedSlot.start;
    let newEnd = selectedSlot.end;
    if (which === 'start') {
      newStart = new Date(selectedSlot.start.getTime() + minutes * 60000);
      // Prevent start from going after end or before 9am
      if (newStart >= newEnd || newStart.getHours() < 9) return;
    } else {
      newEnd = new Date(selectedSlot.end.getTime() + minutes * 60000);
      // Prevent end from going before start or after midnight
      if (newEnd <= newStart || newEnd.getHours() > 23 || (newEnd.getHours() === 0 && newEnd.getMinutes() > 0)) return;
    }
    setSelectedSlot({ start: newStart, end: newEnd });
  };

  // Build the events array for the calendar, including selection highlights
  let calendarEvents = [...existingBookings];
  if (pendingStartTime && !selectedSlot) {
    calendarEvents.push({
      title: 'Selected Start',
      start: pendingStartTime,
      end: new Date(pendingStartTime.getTime() + 60 * 60000), // 1 hour block
      isPendingStart: true,
    });
  }
  if (selectedSlot) {
    calendarEvents.push({
      title: 'Selected Range',
      start: selectedSlot.start,
      end: selectedSlot.end,
      isSelection: true,
    });
  }

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
          <div className="w-full max-w-[1400px] h-[1500px] mx-auto">
            <Calendar
              localizer={customLocalizer}
              events={calendarEvents}
              startAccessor="start"
              endAccessor="end"
              style={{ height: '100%', width: '100%' }}
              selectable={true}
              onSelectSlot={handleSelectSlot}
              onSelectEvent={(event) => setSelectedBooking(event)}
              defaultView={Views.WEEK}
              views={[Views.WEEK]}
              step={60}
              timeslots={1}
              min={minCalendarTime}
              max={maxCalendarTime}
              date={date}
              onNavigate={handleNavigate}
              components={{
                toolbar: (props) => <CustomToolbar {...props} onWeekChange={handleWeekChange} />,
              }}
              eventPropGetter={(event) => {
                let style: React.CSSProperties = {
                  backgroundColor: '#fff',
                  borderColor: '#718096',
                  color: '#222',
                };
                if (event.isMyConfirmed) {
                  style.backgroundColor = '#22c55e'; // Green for your confirmed
                  style.borderColor = '#16a34a';
                  style.color = 'white';
                } else if (event.isUnavailable && !event.isMyConfirmed) {
                  style.backgroundColor = '#a0aec0'; // Gray for others' bookings
                  style.borderColor = '#718096';
                  style.color = 'white';
                  style.cursor = 'not-allowed';
                } else if (event.isSelection) {
                  style.backgroundColor = '#f59e0b'; // Yellow for selected range
                  style.borderColor = '#d97706';
                  style.color = 'black';
                } else if (event.isPendingStart) {
                  style.backgroundColor = '#2563eb'; // Blue for pending start
                  style.borderColor = '#1d4ed8';
                  style.color = 'white';
                }
                return { style };
              }}
              popup
            />
          </div>
        </div>

        <div className="lg:col-span-1 space-y-6">
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
            
            {selectedSlot && (
              <div className="space-y-4">
                <div>
                  <h3 className="text-lg font-semibold text-accent-pink">
                    Selected Slot:
                  </h3>
                  <div className="flex flex-col items-center space-y-2">
                    <div className="flex items-center space-x-2">
                      <span className="font-semibold">Start:</span>
                      <button onClick={() => adjustSelectedTime('start', -15)} className="px-2 py-1 bg-gray-200 rounded">▲</button>
                      <span>{format(selectedSlot.start, 'p')}</span>
                      <button onClick={() => adjustSelectedTime('start', 15)} className="px-2 py-1 bg-gray-200 rounded">▼</button>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className="font-semibold">End:</span>
                      <button onClick={() => adjustSelectedTime('end', -15)} className="px-2 py-1 bg-gray-200 rounded">▲</button>
                      <span>{format(selectedSlot.end, 'p')}</span>
                      <button onClick={() => adjustSelectedTime('end', 15)} className="px-2 py-1 bg-gray-200 rounded">▼</button>
                    </div>
                  </div>
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

                <button
                  onClick={() => setShowConfirm(true)}
                  className="w-full mt-6 py-3 px-4 bg-accent-green text-white font-logo rounded-lg shadow-md hover:bg-accent-green/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-accent-green transition-colors"
                  disabled={loading}
                >
                  Request Booking
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
      {error && (
        <div className="text-red-600 font-semibold text-center my-2">{error}</div>
      )}
      {loading && (
        <div className="text-blue-600 font-semibold text-center my-2">Submitting booking...</div>
      )}
      {showConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-8 max-w-md w-full">
            <h2 className="text-xl font-bold mb-4">Confirm Your Booking</h2>
            <div className="mb-2">Date: {selectedSlot && format(selectedSlot.start, 'PPP')}</div>
            <div className="mb-2">Time: {selectedSlot && `${format(selectedSlot.start, 'p')} - ${format(selectedSlot.end, 'p')}`}</div>
            <div className="mb-2">Duration: {selectedSlot && differenceInMinutes(selectedSlot.end, selectedSlot.start) / 60} hours</div>
            <div className="mb-2">Services: {Object.entries(services).filter(([, v]) => v).map(([k]) => k).join(', ') || 'None'}</div>
            <div className="mb-2">Notes: {notes || 'None'}</div>
            <div className="flex justify-end space-x-2 mt-4">
              <button onClick={() => setShowConfirm(false)} className="px-4 py-2 rounded bg-gray-200 hover:bg-gray-300">Cancel</button>
              <button onClick={handleSubmitBooking} className="px-4 py-2 rounded bg-accent-green text-white hover:bg-accent-green/90" disabled={loading}>Confirm</button>
            </div>
          </div>
        </div>
      )}
      {selectedBooking && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-8 max-w-md w-full">
            <h2 className="text-xl font-bold mb-4">Booking Details</h2>
            <div className="mb-2">{selectedBooking.title}</div>
            <div className="mb-2">Date: {selectedBooking.start ? format(selectedBooking.start, 'PPP') : 'N/A'}</div>
            <div className="mb-2">Time: {selectedBooking.start && selectedBooking.end ? `${format(selectedBooking.start, 'p')} - ${format(selectedBooking.end, 'p')}` : 'N/A'}</div>
            <button onClick={() => setSelectedBooking(null)} className="mt-4 px-4 py-2 rounded bg-accent-green text-white">Close</button>
          </div>
        </div>
      )}
    </div>
  );
} 