'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Calendar, dateFnsLocalizer, Event as BigCalendarEvent, SlotInfo, Views, ToolbarProps } from 'react-big-calendar';
import { 
    format, parse, startOfWeek, getDay, addHours, setHours, setMinutes, setSeconds, 
    isBefore, isEqual, addMinutes, differenceInMinutes, isAfter, toDate, addDays
} from 'date-fns';
import { enUS } from 'date-fns/locale/en-US';
import { db as firestore } from '@/lib/firebase';
import { collection, addDoc, query, where, onSnapshot, Timestamp, getDocs } from 'firebase/firestore';
import { useAuth } from '@/context/AuthContext';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { httpsCallable } from 'firebase/functions';
import { functions as firebaseFunctions } from '@/lib/firebase';
import { User } from 'firebase/auth';
import { XCircleIcon } from '@heroicons/react/20/solid';
import ServiceSelector from '@/components/ServiceSelector';

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

// Service Types and Pricing
interface BaseServiceConfig {
  label: string;
  description: string;
  icon: string;
}

interface ConsultationServiceConfig extends BaseServiceConfig {
  duration: number;
  price: number;
}

interface HourlyServiceConfig extends BaseServiceConfig {
  minDuration: number;
  maxDuration: number;
  pricing: Array<{ hours: number; price: number }>;
}

interface PerSongServiceConfig extends BaseServiceConfig {
  pricePerSong: number;
  duration: number; // Duration for the consultation
}

interface ProductionServiceConfig extends BaseServiceConfig {
  pricePerHour: number;
  minDuration: number;
  beatLicenseOptions: typeof BEAT_LICENSE_OPTIONS;
}

type ServiceConfig = {
  [SERVICE_TYPES.VIDEO_CONSULT]: ConsultationServiceConfig;
  [SERVICE_TYPES.BRAND_CONSULT]: ConsultationServiceConfig;
  [SERVICE_TYPES.HOURLY_SESSION]: HourlyServiceConfig;
  [SERVICE_TYPES.MIXING_MASTERING]: PerSongServiceConfig;
  [SERVICE_TYPES.FULL_PRODUCTION]: ProductionServiceConfig;
};

const SERVICE_TYPES = {
  VIDEO_CONSULT: 'video-consult',
  BRAND_CONSULT: 'brand-consult',
  HOURLY_SESSION: 'hourly-session',
  MIXING_MASTERING: 'mixing-mastering',
  FULL_PRODUCTION: 'full-production'
} as const;

const HOURLY_PRICING = [
  { hours: 1, price: 50 },
  { hours: 2, price: 100 },
  { hours: 3, price: 125 },
  { hours: 4, price: 170 },
  { hours: 5, price: 215 },
  { hours: 6, price: 255 },
];

const BEAT_LICENSE_OPTIONS = {
  BASIC_LEASE: { id: 'basic-lease', label: 'Basic Lease', price: 35 },
  FULL_BUY: { id: 'full-buy', label: 'Full Buy', price: 150 },
  EXCLUSIVE: { id: 'exclusive', label: 'Exclusive Rights', price: 150, includesRevisions: true }
} as const;

const SERVICE_CONFIG: ServiceConfig = {
  [SERVICE_TYPES.VIDEO_CONSULT]: {
    label: '15-Min Free Video Consultation',
    duration: 15,
    price: 0,
    description: 'Free video consultation to discuss your project and goals.',
    icon: '🎥'
  },
  [SERVICE_TYPES.BRAND_CONSULT]: {
    label: '15-Min Free Brand Consultation',
    duration: 15,
    price: 0,
    description: 'Free consultation to discuss your brand and marketing strategy.',
    icon: '💡'
  },
  [SERVICE_TYPES.HOURLY_SESSION]: {
    label: 'Hourly Studio Session',
    minDuration: 60,
    maxDuration: 360,
    pricing: HOURLY_PRICING,
    description: 'Book studio time for recording, production, or any other needs.',
    icon: '🎵'
  },
  [SERVICE_TYPES.MIXING_MASTERING]: {
    label: 'Mixing & Mastering',
    duration: 15, // 15-min consultation
    pricePerSong: 130,
    description: 'Professional mixing and mastering services. Includes a 15-minute consultation to discuss your goals. Work is completed independently by the engineer after consultation.',
    icon: '🎚️'
  },
  [SERVICE_TYPES.FULL_PRODUCTION]: {
    label: 'Full Production Session',
    pricePerHour: 45,
    minDuration: 60,
    description: 'Complete production service with optional beat licensing.',
    icon: '🎹',
    beatLicenseOptions: BEAT_LICENSE_OPTIONS
  }
} as const;

// Helper to get week label
const getWeekLabel = (start: Date) => {
  const end = addDays(start, 6);
  const startLabel = format(start, 'MMM dd');
  const endLabel = format(end, 'MMM dd');
  return `${startLabel} - ${endLabel}`;
};

// Helper to get array of week starts for dropdown
const getFutureWeekStarts = (from: Date, count: number) => {
  const weeks = [];
  let current = new Date(from.getFullYear(), from.getMonth(), from.getDate());
  for (let i = 0; i < count; i++) {
    weeks.push(new Date(current));
    current = addDays(current, 7);
  }
  return weeks;
};

// Custom Toolbar component
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
          onClick={() => setDropdownOpen(!dropdownOpen)}
          className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 flex items-center space-x-2"
        >
          <span>{getWeekLabel(date)}</span>
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>
        {dropdownOpen && (
          <div className="absolute right-0 mt-1 w-48 bg-white border border-gray-300 rounded-md shadow-lg z-10">
            {weekStarts.map((weekStart, index) => (
              <button
                key={index}
                type="button"
                onClick={() => {
                  onWeekChange?.(weekStart);
                  setDropdownOpen(false);
                }}
                className={`block w-full text-left px-4 py-2 text-sm hover:bg-gray-100 ${
                  index === currentWeekIndex ? 'bg-blue-50 text-blue-700' : 'text-gray-700'
                }`}
              >
                {getWeekLabel(weekStart)}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

// Custom week range function
const getCustomWeekRange = (date: Date) => {
  const start = startOfWeek(date, { weekStartsOn: 1 }); // Monday
  const end = addDays(start, 6); // Sunday
  return { start, end };
};

const customWeekRange = (date: Date) => {
  const { start, end } = getCustomWeekRange(date);
  return {
    start: setHours(setMinutes(setSeconds(start, 0), 0), studioOpenTime),
    end: setHours(setMinutes(setSeconds(end, 59), 59), 23)
  };
};

const customStartOfWeek = () => {
  const today = new Date();
  const { start } = getCustomWeekRange(today);
  return start;
};

type BookingPaymentFormProps = {
  selectedSlot: { start: Date; end: Date } | null;
  services: { [key: string]: boolean };
  notes: string;
  clearSelectionStates: () => void;
  setShowConfirm: (show: boolean) => void;
  setProducer: (producer: string) => void;
  setServices: (services: { [key: string]: boolean }) => void;
  setNotes: (notes: string) => void;
  user: User | null;
  selectedService: string | null;
  selectedDuration: number;
  songCount: number;
  selectedBeatLicense: string | null;
  isNewCustomer: boolean;
};

function BookingPaymentForm({ 
  selectedSlot, 
  services, 
  notes, 
  clearSelectionStates, 
  setShowConfirm, 
  setProducer, 
  setServices, 
  setNotes, 
  user,
  selectedService,
  selectedDuration,
  songCount,
  selectedBeatLicense,
  isNewCustomer
}: BookingPaymentFormProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [bookingId, setBookingId] = useState<string | null>(null);
  const [showPaymentForm, setShowPaymentForm] = useState(false);

  const calculateTotalPrice = () => {
    if (!selectedService) return 0;
    
    const config = SERVICE_CONFIG[selectedService as keyof typeof SERVICE_CONFIG];
    let total = 0;

    if ('price' in config) {
      total = config.price;
    } else if ('pricePerSong' in config) {
      total = config.pricePerSong * songCount;
    } else if ('pricePerHour' in config) {
      total = config.pricePerHour * (selectedDuration / 60);
      if (selectedBeatLicense) {
        const licenseOption = Object.values(BEAT_LICENSE_OPTIONS).find(l => l.id === selectedBeatLicense);
        if (licenseOption) {
          total += licenseOption.price;
        }
      }
    } else if ('pricing' in config) {
      const hours = selectedDuration / 60;
      const pricingOption = config.pricing.find(p => p.hours >= hours) || config.pricing[config.pricing.length - 1];
      total = pricingOption.price;
    }

    return total;
  };

  const handleCreateBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSlot || !user) {
      setError('Please select a time slot and ensure you are logged in.');
      return;
    }

    if (!selectedService) {
      setError('Please select a service.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const config = SERVICE_CONFIG[selectedService as keyof typeof SERVICE_CONFIG];
      const totalPrice = calculateTotalPrice();
      
      // Create the booking object
      const bookingData = {
        userId: user.uid,
        customerEmail: user.email,
        startTime: selectedSlot.start,
        endTime: selectedSlot.end,
        status: 'pending',
        serviceType: selectedService,
        serviceName: config.label,
        totalPrice,
        notes,
        createdAt: new Date(),
        ...(songCount && { songCount }),
        ...(selectedBeatLicense && { beatLicense: selectedBeatLicense }),
        ...(isNewCustomer && { isNewCustomer: true })
      };

      // Add to Firestore
      const bookingRef = await addDoc(collection(firestore, 'bookings'), bookingData);
      const newBookingId = bookingRef.id;
      setBookingId(newBookingId);

      // If the service is free, complete the booking immediately
      if (totalPrice === 0) {
        clearSelectionStates();
        setShowConfirm(true);
        return;
      }

      // Create PaymentIntent via Cloud Function
      const createPaymentIntent = httpsCallable(firebaseFunctions, 'createPaymentIntent');
      const result: any = await createPaymentIntent({
        amount: totalPrice,
        bookingId: newBookingId,
        currency: 'usd'
      });

      if (result.data.clientSecret) {
        setClientSecret(result.data.clientSecret);
        setShowPaymentForm(true);
      } else {
        throw new Error('Failed to create payment intent');
      }
    } catch (err) {
      console.error('Error creating booking:', err);
      setError('Failed to create booking. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Get service config for display
  const getServiceConfig = () => {
    if (!selectedService) return null;
    return SERVICE_CONFIG[selectedService as keyof typeof SERVICE_CONFIG];
  };

  const serviceConfig = getServiceConfig();
  const totalPrice = calculateTotalPrice();

  // If we have a client secret, show the Stripe payment form
  if (showPaymentForm && clientSecret) {
    const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);
    
    return (
      <div className="space-y-6">
        <div className="bg-white p-4 rounded-lg border">
          <h3 className="font-semibold text-lg mb-3">Payment Information</h3>
          <div className="space-y-2 text-sm mb-4">
            <div className="flex justify-between">
              <span>Service:</span>
              <span>{serviceConfig?.label}</span>
            </div>
            <div className="flex justify-between font-semibold text-base pt-2 border-t">
              <span>Total:</span>
              <span>${totalPrice}</span>
            </div>
          </div>
          
          <Elements stripe={stripePromise} options={{ clientSecret }}>
            <PaymentForm 
              onSuccess={() => {
                clearSelectionStates();
                setShowConfirm(true);
              }}
              onError={(error) => setError(error)}
            />
          </Elements>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleCreateBooking} className="space-y-6">
      {/* Booking Summary */}
      {serviceConfig && (
        <div className="bg-white p-4 rounded-lg border">
          <h3 className="font-semibold text-lg mb-3">Booking Summary</h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span>Service:</span>
              <span>{serviceConfig.label}</span>
            </div>
            {selectedDuration > 0 && (
              <div className="flex justify-between">
                <span>Duration:</span>
                <span>{selectedDuration / 60} hour{selectedDuration / 60 > 1 ? 's' : ''}</span>
              </div>
            )}
            {songCount > 0 && (
              <div className="flex justify-between">
                <span>Songs:</span>
                <span>{songCount}</span>
              </div>
            )}
            {selectedBeatLicense && (
              <div className="flex justify-between">
                <span>Beat License:</span>
                <span>{Object.values(BEAT_LICENSE_OPTIONS).find(l => l.id === selectedBeatLicense)?.label}</span>
              </div>
            )}
            <div className="flex justify-between font-semibold text-base pt-2 border-t">
              <span>Total:</span>
              <span>${totalPrice}</span>
            </div>
          </div>
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <div className="flex">
            <XCircleIcon className="h-5 w-5 text-red-400" />
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">Error</h3>
              <div className="mt-2 text-sm text-red-700">{error}</div>
            </div>
          </div>
        </div>
      )}

      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <div className="text-lg font-semibold">
            Total: ${totalPrice}
          </div>
          <button
            type="submit"
            disabled={loading || !selectedService}
            className={`inline-flex justify-center rounded-md border border-transparent px-4 py-2 text-sm font-medium text-white shadow-sm ${
              loading || !selectedService
                ? 'bg-gray-400 cursor-not-allowed'
                : 'bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2'
            }`}
          >
            {loading ? (
              <>
                <span className="mr-2">Processing...</span>
                <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              </>
            ) : (
              totalPrice === 0 ? 'Book Free Session' : 'Proceed to Payment'
            )}
          </button>
        </div>
      </div>
    </form>
  );
}

// Stripe Payment Form Component
function PaymentForm({ onSuccess, onError }: { onSuccess: () => void; onError: (error: string) => void }) {
  const stripe = useStripe();
  const elements = useElements();
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!stripe || !elements) {
      return;
    }

    setLoading(true);

    const { error } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: `${window.location.origin}/profile/bookings`,
      },
    });

    if (error) {
      onError(error.message || 'Payment failed');
    } else {
      onSuccess();
    }

    setLoading(false);
  };

  return (
    <form onSubmit={handleSubmit}>
      <PaymentElement />
      <button
        type="submit"
        disabled={!stripe || loading}
        className="mt-4 w-full inline-flex justify-center rounded-md border border-transparent px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:bg-gray-400 disabled:cursor-not-allowed"
      >
        {loading ? 'Processing...' : 'Pay Now'}
      </button>
    </form>
  );
}

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
  const [selectedService, setSelectedService] = useState<string | null>(null);
  const [selectedDuration, setSelectedDuration] = useState<number>(60);
  const [songCount, setSongCount] = useState<number>(1);
  const [selectedBeatLicense, setSelectedBeatLicense] = useState<string | null>(null);
  const [isNewCustomer, setIsNewCustomer] = useState<boolean>(false);

  const DEFAULT_STUDIO_ID = 'YOUR_SWEET_DREAMS_PARNELL_STUDIO_ID';
  const DEFAULT_ENGINEER_UID = 'PpzY2fWOt4V4qwHYClGVomHInb82';
  const DEFAULT_PRODUCER_NAME = 'Jay Valleo';

  const clearSelectionStates = useCallback(() => {
    setPendingStartTime(null);
    setSelectedSlot(null);
    setProducer('');
    setServices({});
    setNotes('');
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

  // Check if user is a new customer
  useEffect(() => {
    const checkNewCustomer = async () => {
      if (!user?.uid) return;
      
      try {
        const bookingsRef = collection(firestore, 'bookings');
        const q = query(bookingsRef, where('userId', '==', user.uid));
        const querySnapshot = await getDocs(q);
        setIsNewCustomer(querySnapshot.empty);
      } catch (err) {
        console.error('Error checking new customer status:', err);
        // Default to false if there's an error
        setIsNewCustomer(false);
      }
    };

    checkNewCustomer();
  }, [user?.uid]);

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
    
    if (!selectedService) {
      setError('Please select a service first.');
      return;
    }

    // For 15-min services (consultations and mixing/mastering), auto-select 15-min range
    if (
      selectedService === SERVICE_TYPES.VIDEO_CONSULT ||
      selectedService === SERVICE_TYPES.BRAND_CONSULT ||
      selectedService === SERVICE_TYPES.MIXING_MASTERING
    ) {
      const end = addMinutes(clickedCellStartTime, 15);
      setSelectedSlot({ start: clickedCellStartTime, end });
      setPendingStartTime(null);
      setProducer('');
      setServices({});
      setNotes('');
      return;
    }

    // For hourly services, enforce the selected duration
    if (selectedService === SERVICE_TYPES.HOURLY_SESSION || selectedService === SERVICE_TYPES.FULL_PRODUCTION) {
      if (isPast(clickedCellStartTime)) {
        setError('Cannot book a slot in the past.');
        clearSelectionStates();
        return;
      }
      
      const end = addMinutes(clickedCellStartTime, selectedDuration);
      
      // Check if the calculated end time is within studio hours
      if (!isWithinStudioHours(clickedCellStartTime, end)) {
        setError('Selected duration would extend beyond studio hours.');
        return;
      }
      
      // Check for conflicts
      const conflict = existingBookings.find((booking: MyCalendarEvent) => {
        const bookingStart = booking.start as Date;
        const bookingEnd = booking.end as Date;
        return isBefore(clickedCellStartTime, bookingEnd) && isAfter(end, bookingStart);
      });
      
      if (conflict) {
        setError('This time slot conflicts with an existing booking.');
        return;
      }
      
      setSelectedSlot({ start: clickedCellStartTime, end });
      setPendingStartTime(null);
      setProducer('');
      setServices({});
      setNotes('');
      return;
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

  const handleWeekChange = (weekStart: Date) => {
    setDate(weekStart);
  };

  const minCalendarTime = setMinutes(setHours(new Date(1970, 0, 1), 9), 0); // 9:00 AM
  const maxCalendarTime = setMinutes(setHours(new Date(1970, 0, 1), 23), 59); // 11:59 PM

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
        {/* Service Selection Panel - Always Visible */}
        <div className="lg:col-span-1">
          <div className="bg-slate-50/80 backdrop-blur-sm p-4 md:p-6 rounded-xl shadow-xl">
            <h2 className="text-2xl font-logo text-accent-blue mb-4">1. Select Your Service</h2>
            <ServiceSelector
              selectedService={selectedService}
              onServiceSelect={setSelectedService}
              isNewCustomer={isNewCustomer}
              selectedDuration={selectedDuration}
              onDurationChange={setSelectedDuration}
              songCount={songCount}
              onSongCountChange={setSongCount}
              selectedBeatLicense={selectedBeatLicense}
              onBeatLicenseSelect={setSelectedBeatLicense}
            />
          </div>
        </div>

        {/* Calendar Panel - Only Visible After Service Selection */}
        {selectedService && (
        <div className="lg:col-span-2 bg-slate-50/80 backdrop-blur-sm p-4 md:p-6 rounded-xl shadow-xl">
            <h2 className="text-2xl font-logo text-accent-blue mb-1">2. Select Date & Time Slot</h2>
          <p className="text-sm text-foreground/70 mb-4">
              {selectedService === SERVICE_TYPES.VIDEO_CONSULT || 
               selectedService === SERVICE_TYPES.BRAND_CONSULT || 
               selectedService === SERVICE_TYPES.MIXING_MASTERING
                ? 'Tap any available slot to book your consultation.'
                : selectedService === SERVICE_TYPES.HOURLY_SESSION || selectedService === SERVICE_TYPES.FULL_PRODUCTION
                ? `Tap any available slot to book your ${selectedDuration / 60} hour session.`
                : 'Tap an available slot for start time, then tap another slot for end time.'
            }
          </p>
            <div className="w-full max-w-[1400px] h-[1500px] mx-auto">
            <Calendar
                localizer={localizer}
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
                    style.backgroundColor = '#22c55e';
                    style.borderColor = '#16a34a';
                    style.color = 'white';
                  } else if (event.isUnavailable && !event.isMyConfirmed) {
                    style.backgroundColor = '#a0aec0';
                    style.borderColor = '#718096';
                  style.color = 'white';
                  style.cursor = 'not-allowed';
                } else if (event.isSelection) {
                  style.backgroundColor = '#f59e0b';
                  style.borderColor = '#d97706'; 
                  style.color = 'black';
                  } else if (event.isPendingStart) {
                    style.backgroundColor = '#2563eb';
                    style.borderColor = '#1d4ed8';
                    style.color = 'white';
                }
                return { style };
              }}
                popup
            />
          </div>
        </div>
        )}

        {/* Booking Form - Only Visible After Time Selection */}
        {selectedSlot && (
          <div className="lg:col-span-1">
          <div className="bg-slate-50/80 backdrop-blur-sm p-4 md:p-6 rounded-xl shadow-xl">
              <h2 className="text-2xl font-logo text-accent-blue mb-4">3. Confirm Booking</h2>
              <BookingPaymentForm
                selectedSlot={selectedSlot}
                services={services}
                notes={notes}
                clearSelectionStates={clearSelectionStates}
                setShowConfirm={setShowConfirm}
                setProducer={setProducer}
                setServices={setServices}
                setNotes={setNotes}
                user={user}
                selectedService={selectedService}
                selectedDuration={selectedDuration}
                songCount={songCount}
                selectedBeatLicense={selectedBeatLicense}
                isNewCustomer={isNewCustomer}
              />
            </div>
          </div>
              )}
            </div>
            
      {error && (
        <div className="text-red-600 font-semibold text-center my-2">{error}</div>
      )}
      {loading && (
        <div className="text-blue-600 font-semibold text-center my-2">Submitting booking...</div>
      )}

      {/* Confirmation Modal */}
      {showConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-8 max-w-md w-full">
            <h2 className="text-xl font-bold mb-4">Booking Confirmed!</h2>
            <p className="text-green-600 mb-4">Your booking request has been submitted successfully.</p>
            <button 
              onClick={() => setShowConfirm(false)} 
              className="w-full px-4 py-2 rounded bg-accent-green text-white hover:bg-accent-green/90"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* Booking Details Modal */}
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