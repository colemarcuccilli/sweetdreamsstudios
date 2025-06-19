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

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);

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

  // Calculate total price based on selected service and options
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
    } else if ('pricing' in config) {
      const hours = selectedDuration / 60;
      const pricing = config.pricing.find(p => p.hours === hours);
      if (pricing) {
        total = pricing.price;
      }
    }

    // Add beat license cost if selected
    if (selectedBeatLicense && selectedService === SERVICE_TYPES.FULL_PRODUCTION) {
      const license = Object.values(BEAT_LICENSE_OPTIONS).find(l => l.id === selectedBeatLicense);
      if (license) {
        total += license.price;
      }
    }

    return total;
  };

  const handleSubmitBooking = async (e: React.FormEvent) => {
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
        email: user.email,
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

      // Clear form and show confirmation
      clearSelectionStates();
      setShowConfirm(true);
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

  return (
    <form onSubmit={handleSubmitBooking} className="space-y-6">
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
              <span>${calculateTotalPrice()}</span>
            </div>
          </div>
        </div>
      )}

      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <div className="text-lg font-semibold">
            Total: ${calculateTotalPrice()}
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
              'Book Now'
            )}
          </button>
        </div>
      </div>
    </form>
  );
}

// Separate component to use Stripe hooks
function PaymentFormWithStripe() {
  const stripe = useStripe();
  const elements = useElements();
  
  return <PaymentElement />;
}

const minCalendarTime = setMinutes(setHours(new Date(1970, 0, 1), 9), 0); // 9:00 AM
const maxCalendarTime = setMinutes(setHours(new Date(1970, 0, 1), 23), 59); // 11:59 PM

interface ServiceSelectorProps {
  selectedService: string | null;
  onServiceSelect: (serviceType: string) => void;
  isNewCustomer: boolean;
  selectedDuration?: number;
  onDurationChange?: (duration: number) => void;
  songCount?: number;
  onSongCountChange?: (count: number) => void;
  selectedBeatLicense?: string | null;
  onBeatLicenseSelect?: (licenseType: string | null) => void;
}

function ServiceSelector({
  selectedService,
  onServiceSelect,
  isNewCustomer,
  selectedDuration,
  onDurationChange,
  songCount,
  onSongCountChange,
  selectedBeatLicense,
  onBeatLicenseSelect
}: ServiceSelectorProps) {
  const getServiceConfig = (type: string): ConsultationServiceConfig | HourlyServiceConfig | PerSongServiceConfig | ProductionServiceConfig => {
    return SERVICE_CONFIG[type as keyof typeof SERVICE_CONFIG];
  };

  const renderPricing = (config: ConsultationServiceConfig | HourlyServiceConfig | PerSongServiceConfig | ProductionServiceConfig) => {
    if ('price' in config) {
      return config.price === 0 ? (
        <div className="text-green-600 font-medium mt-1">Free</div>
      ) : null;
    }
    if ('pricePerSong' in config) {
      return <div className="text-gray-700 font-medium mt-1">${config.pricePerSong}/song</div>;
    }
    if ('pricePerHour' in config) {
      return <div className="text-gray-700 font-medium mt-1">${config.pricePerHour}/hour</div>;
    }
    if ('pricing' in config) {
      return <div className="text-gray-700 font-medium mt-1">From ${config.pricing[0].price}</div>;
    }
    return null;
  };

  return (
    <div className="w-full space-y-4">
      <div className="flex flex-col space-y-2">
        <h3 className="text-lg font-semibold">Select Service</h3>
        {isNewCustomer && (
          <div className="bg-green-50 p-3 rounded-md text-sm text-green-700 mb-4">
            🎉 New Customer Bonus: Free 15-minute add-on available!
          </div>
        )}
        
        <div className="grid grid-cols-1 gap-3">
          {Object.entries(SERVICE_CONFIG).map(([type, config]) => (
            <button
              key={type}
              onClick={() => onServiceSelect(type)}
              className={`flex items-center p-4 rounded-lg border ${
                selectedService === type
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <span className="text-2xl mr-3">{config.icon}</span>
              <div className="flex-1 text-left">
                <div className="font-medium">{config.label}</div>
                <div className="text-sm text-gray-500">{config.description}</div>
                {renderPricing(config)}
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Duration Selector for Hourly Services */}
      {selectedService && (() => {
        const config = getServiceConfig(selectedService);
        return ('pricing' in config || 'pricePerHour' in config) && (
          <div className="mt-4">
            <h4 className="text-md font-medium mb-2">Select Duration</h4>
            <select
              value={selectedDuration}
              onChange={(e) => onDurationChange?.(Number(e.target.value))}
              className="w-full p-2 border rounded-md"
            >
              {selectedService === SERVICE_TYPES.FULL_PRODUCTION ? (
                // Full Production hours (1-8 hours)
                Array.from({ length: 8 }, (_, i) => (
                  <option key={i + 1} value={(i + 1) * 60}>
                    {i + 1} hour{i > 0 ? 's' : ''} (${(i + 1) * 545})
                  </option>
                ))
              ) : (
                // Regular studio hours with custom pricing
                SERVICE_CONFIG[SERVICE_TYPES.HOURLY_SESSION].pricing.map(({ hours, price }) => (
                  <option key={hours} value={hours * 60}>
                    {hours} hour{hours > 1 ? 's' : ''} (${price})
                  </option>
                ))
              )}
            </select>
          </div>
        );
      })()}

      {/* Song Count Selector for Mixing/Mastering */}
      {selectedService && (() => {
        const config = getServiceConfig(selectedService);
        return 'pricePerSong' in config && (
          <div className="mt-4">
            <h4 className="text-md font-medium mb-2">Number of Songs</h4>
            <select
              value={songCount}
              onChange={(e) => onSongCountChange?.(Number(e.target.value))}
              className="w-full p-2 border rounded-md"
            >
              {Array.from({ length: 20 }, (_, i) => (
                <option key={i + 1} value={i + 1}>
                  {i + 1} song{i > 0 ? 's' : ''} (${(i + 1) * config.pricePerSong})
                </option>
              ))}
            </select>
          </div>
        );
      })()}

      {/* Beat License Options for Full Production */}
      {selectedService === SERVICE_TYPES.FULL_PRODUCTION && (
        <div className="mt-4">
          <h4 className="text-md font-medium mb-2">Beat License Options (Optional)</h4>
          <div className="space-y-2">
            {Object.values(BEAT_LICENSE_OPTIONS).map((option) => (
              <button
                key={option.id}
                onClick={() => onBeatLicenseSelect?.(
                  selectedBeatLicense === option.id ? null : option.id
                )}
                className={`w-full p-3 text-left rounded-md border ${
                  selectedBeatLicense === option.id
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="font-medium">{option.label}</div>
                <div className="text-sm text-gray-500">
                  ${option.price}
                  {'includesRevisions' in option && option.includesRevisions && ' + Production Revisions'}
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
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

    // Legacy range selection logic (should not be reached with current services)
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
            <h2 className="text-xl font-bold mb-4">Confirm Your Booking</h2>
            <div className="mb-2">Date: {selectedSlot && format(selectedSlot.start, 'PPP')}</div>
            <div className="mb-2">Time: {selectedSlot && `${format(selectedSlot.start, 'p')} - ${format(selectedSlot.end, 'p')}`}</div>
            <div className="mb-2">Duration: {selectedSlot && differenceInMinutes(selectedSlot.end, selectedSlot.start) / 60} hours</div>
            <div className="mb-2">Services: {Object.entries(services).filter(([, v]) => v).map(([k]) => k).join(', ') || 'None'}</div>
            <div className="mb-2">Notes: {notes || 'None'}</div>
            <div className="flex justify-end space-x-2 mt-4">
              <button onClick={() => setShowConfirm(false)} className="px-4 py-2 rounded bg-gray-200 hover:bg-gray-300">Cancel</button>
            </div>
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