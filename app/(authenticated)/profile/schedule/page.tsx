'use client';

import React from 'react';
import { Calendar, dateFnsLocalizer, Event as BigCalendarEvent } from 'react-big-calendar';
import { format } from 'date-fns/format';
import { parse } from 'date-fns/parse';
import { startOfWeek } from 'date-fns/startOfWeek';
import { getDay } from 'date-fns/getDay';
import { enUS } from 'date-fns/locale/en-US';
// CSS import is now in profile layout

// Define our custom event type extending the base Event type
interface MyCalendarEvent extends BigCalendarEvent {
  resourceId?: any; // Or a more specific type like string | number
  isUserBooking?: boolean;
  // Add any other custom properties you might need
}

// Setup the localizer by providing the moment (or globalize) Object
// to the correct localizer.
const locales = {
  'en-US': enUS,
};

const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek,
  getDay,
  locales,
});

// Sample events data (replace with actual data from Firestore later)
const sampleEvents: MyCalendarEvent[] = [
  {
    title: 'My Project Deadline',
    start: new Date(2024, 5, 29, 10, 0, 0),
    end: new Date(2024, 5, 29, 14, 0, 0),
    resourceId: 'project1',
  },
  {
    title: 'Team Meeting',
    start: new Date(2024, 6, 1, 18, 0, 0),
    end: new Date(2024, 6, 1, 19, 0, 0),
    isUserBooking: true, // Example property
  },
];

const MySchedulePage = () => {
  // TODO: Fetch actual bookings and studio availability from Firestore
  const [events, setEvents] = React.useState<MyCalendarEvent[]>(sampleEvents);

  // TODO: Handle selecting a date/time slot
  const handleSelectSlot = (slotInfo: { start: Date; end: Date; slots: Date[] | string[]; action: 'select' | 'click' | 'doubleClick' }) => {
    console.log('Selected slot for personal schedule:', slotInfo);
    alert(`Personal schedule slot: ${slotInfo.start} to ${slotInfo.end}`);
  };

  // TODO: Handle clicking on an existing event (booking)
  const handleSelectEvent = (event: MyCalendarEvent) => {
    console.log('Selected personal event:', event);
    alert(`Personal Event: ${event.title}`);
  };

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-logo text-accent-pink text-center md:text-left">My Schedule</h1>
      
      {/* We can add filters here later (e.g., by studio, by engineer) */}
      
      <div className="bg-slate-50 p-2 md:p-4 rounded-lg shadow-lg h-[calc(100vh-12rem)] md:h-[calc(100vh-10rem)]">
        <Calendar
          localizer={localizer}
          events={events}
          startAccessor="start"
          endAccessor="end"
          style={{ height: '100%' }} // Make calendar fill its container
          selectable // Allows clicking and dragging to create new events
          onSelectSlot={handleSelectSlot}
          onSelectEvent={handleSelectEvent}
          // More props can be added for views, default date, etc.
          defaultView="month"
          views={['month', 'week', 'day', 'agenda']}
          step={60} // Time slot interval in minutes (for week/day views)
          showMultiDayTimes // Show times for multi-day events in month view
          // Consider adding eventPropGetter for custom styling of events
          // eventPropGetter={(event, start, end, isSelected) => {
          //   let newStyle: React.CSSProperties = {};
          //   if (event.isUserBooking) {
          //     newStyle.backgroundColor = "your_accent_yellow_hex"; // Example
          //     newStyle.borderColor = "darker_yellow_hex";
          //   }
          //   // Add more custom styles based on event properties
          //   return { style: newStyle };
          // }}
        />
      </div>
      <p className="text-xs text-foreground/60 text-center">
        Your personal events and booked sessions will appear here.
      </p>
    </div>
  );
};

export default MySchedulePage; 