'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Calendar, dateFnsLocalizer, Event as BigCalendarEvent, SlotInfo, Views, ToolbarProps } from 'react-big-calendar';
import { 
    format, parse, startOfWeek, getDay, addHours, setHours, setMinutes, setSeconds, 
    isBefore, isEqual, addMinutes, differenceInMinutes, isAfter, toDate, addDays
} from 'date-fns';
import { enUS } from 'date-fns/locale/en-US';
import { db as firestore } from '@/lib/firebase';
import { collection, addDoc, query, where, onSnapshot, Timestamp, getDocs, doc as firestoreDoc, updateDoc, doc } from 'firebase/firestore';
import { useAuth } from '@/context/AuthContext';
import { httpsCallable } from 'firebase/functions';
import { functions as firebaseFunctions, auth as firebaseAuth } from '@/lib/firebase';
import { User } from 'firebase/auth';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, CardElement, useStripe, useElements } from '@stripe/react-stripe-js';
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

// Initialize Stripe
const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);

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

// Helper to get array of 7-day periods starting from today
const getFutureWeekStarts = (from: Date, count: number) => {
  const weeks = [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  // Always start from today
  let current = new Date(today);
  for (let i = 0; i < count; i++) {
    weeks.push(new Date(current));
    current = addDays(current, 7);
  }
  return weeks;
};

// Custom Toolbar component
const CustomToolbar: React.FC<ToolbarProps & { onWeekChange?: (date: Date) => void }> = ({ label, view, views, onNavigate, onView, date, onWeekChange }) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
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
          onClick={() => onWeekChange?.(today)}
          className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50"
        >
          Today
        </button>
        <button
          type="button"
          onClick={() => {
            const nextWeek = addDays(today, 7);
            onWeekChange?.(nextWeek);
          }}
          className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50"
        >
          Next Week
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

// Custom week range function - always show today + 6 future days
const getCustomWeekRange = (date: Date) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0); // Start of today
  
  // Always start from today, not from a week boundary
  const start = today;
  const end = addDays(start, 6); // Today + 6 days = 7 days total
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
  today.setHours(0, 0, 0, 0);
  return today;
};

type BookingPaymentFormProps = {
  selectedSlot: { start: Date; end: Date } | null;
  services: { [key: string]: boolean };
  notes: string;
  producer: string;
  clearSelectionStates: () => void;
  setShowConfirm: (show: boolean) => void;
  setProducer: (producer: string) => void;
  setServices: (services: { [key: string]: boolean }) => void;
  setNotes: (notes: string) => void;
  user: User | null;
  selectedService: string | null;
  selectedServiceData: any;
  selectedDuration: number;
  songCount: number;
  selectedBeatLicense: string | null;
  isNewCustomer: boolean;
};

function BookingPaymentForm({ 
  selectedSlot, 
  services, 
  notes, 
  producer,
  clearSelectionStates, 
  setShowConfirm, 
  setProducer, 
  setServices, 
  setNotes, 
  user,
  selectedService,
  selectedServiceData,
  selectedDuration,
  songCount,
  selectedBeatLicense,
  isNewCustomer
}: BookingPaymentFormProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [bookingId, setBookingId] = useState<string | null>(null);
  const [showPaymentAuth, setShowPaymentAuth] = useState(false);
  const stripe = useStripe();
  const elements = useElements();

  const calculateTotalPrice = () => {
    if (!selectedServiceData) return 0;

    let total = 0;

    // Free services
    if (selectedServiceData.isFree) {
      return 0;
    }

    // Hourly pricing (like recording sessions)
    if (selectedServiceData.hourlyPricing) {
      const hours = selectedDuration / 60;
      const pricePoint = selectedServiceData.hourlyPricing.find((p: any) => p.hours === hours);
      total = pricePoint ? pricePoint.price : 0;
    }
    // Per-song pricing (like mixing/mastering)
    else if (selectedServiceData.pricePerSong) {
      total = selectedServiceData.pricePerSong * songCount;
    }
    // Per-hour pricing (like production)
    else if (selectedServiceData.pricePerHour) {
      total = selectedServiceData.pricePerHour * (selectedDuration / 60);
      
      // Add beat license cost if selected
      if (selectedBeatLicense && selectedServiceData.beatLicenseOptions) {
        const license = Object.values(selectedServiceData.beatLicenseOptions).find((l: any) => l.id === selectedBeatLicense);
        if (license) {
          total += (license as any).price;
        }
      }
    }
    // Fixed price services
    else if (selectedServiceData.price) {
      total = selectedServiceData.price;
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
      const totalPrice = calculateTotalPrice();
      
      // Create the booking object with enhanced payment tracking
      const newBookingData = {
        userId: user.uid,
        customerEmail: user.email,
        customerName: user.displayName || user.email,
        startTime: selectedSlot!.start,
        endTime: selectedSlot!.end,
        status: totalPrice === 0 ? 'pending_approval' : 'pending_payment',
        serviceType: selectedService,
        serviceName: selectedServiceData?.name || 'Unknown Service',
        serviceCategory: selectedServiceData?.category || 'audio',
        totalPrice,
        depositAmount: totalPrice === 0 ? 0 : Math.max(totalPrice * 0.5, 25), // 50% deposit or $25 minimum
        depositPaid: totalPrice === 0,
        finalAmount: 0, // Will be set by admin later
        finalPaid: totalPrice === 0,
        notes,
        createdAt: new Date(),
        updatedAt: new Date(),
        paymentHistory: totalPrice === 0 ? [{ 
          type: 'free', 
          amount: 0, 
          timestamp: new Date(), 
          description: 'Free service - no payment required' 
        }] : [],
        ...(songCount && { songCount }),
        ...(selectedBeatLicense && { beatLicense: selectedBeatLicense }),
        ...(selectedDuration && { duration: selectedDuration }),
        ...(isNewCustomer && { isNewCustomer: true })
      };

      // If the service is free, create booking request directly
      if (totalPrice === 0) {
        try {
          // Test authentication first
          const testAuthFunction = httpsCallable(firebaseFunctions, 'testAuth');
          console.log('Testing authentication...');
          const authTest = await testAuthFunction({});
          console.log('Authentication test result:', authTest);
          
          console.log('User info:', {
            uid: user?.uid,
            email: user?.email,
            displayName: user?.displayName
          });
          
          console.log('Selected service data:', selectedServiceData);
          
          const submitBookingFunction = httpsCallable(firebaseFunctions, 'submitBookingRequestWithPaymentAuth');
          const result = await submitBookingFunction({
            resourceId: 'studio-1',
            requestedStartTime: selectedSlot!.start.toISOString(),
            requestedEndTime: selectedSlot!.end.toISOString(),
            durationHours: (selectedSlot!.end.getTime() - selectedSlot!.start.getTime()) / (1000 * 60 * 60),
            serviceType: selectedServiceData.serviceType || selectedServiceData.id || selectedServiceData.name,
            serviceDetailsInput: {
              producer: producer,
              ...services,
              notes: notes,
              songCount: songCount,
              selectedBeatLicense: selectedBeatLicense,
              isNewCustomer: isNewCustomer
            },
            clientNotes: notes,
            clientName: user?.displayName || user?.email || 'Unknown',
            clientEmail: user?.email || '',
            clientPhone: '',
            paymentMethodId: null // No payment needed for free services
          });

          if ((result.data as any).success) {
            clearSelectionStates();
            setShowConfirm(true);
          }
        } catch (error: any) {
          console.error('Error submitting free booking:', error);
          setError(`Failed to submit booking: ${error.message}`);
        }
        return;
      }

      // For paid services, show payment authorization form
      setShowPaymentAuth(true);
    } catch (err) {
      console.error('Error creating booking:', err);
      setError('Failed to create booking. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Use selectedServiceData for display
  const totalPrice = calculateTotalPrice();

  const handlePaymentAuth = async () => {
    if (!stripe || !elements || !user) {
      setError('Payment system not ready. Please try again.');
      return;
    }

    const cardElement = elements.getElement(CardElement);
    if (!cardElement) {
      setError('Payment form not ready. Please try again.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Create payment method
      const { error: pmError, paymentMethod } = await stripe.createPaymentMethod({
        type: 'card',
        card: cardElement,
        billing_details: {
          name: user.displayName || user.email || 'Unknown',
          email: user.email || '',
        },
      });

      if (pmError) {
        setError(pmError.message || 'Payment method creation failed');
        return;
      }

      // Test authentication first
      const testAuthFunction = httpsCallable(firebaseFunctions, 'testAuth');
      console.log('Testing authentication for paid service...');
      const authTest = await testAuthFunction({});
      console.log('Authentication test result:', authTest);
      
      console.log('User info:', {
        uid: user?.uid,
        email: user?.email,
        displayName: user?.displayName
      });
      
      console.log('Selected service data:', selectedServiceData);
      
      // Submit booking request with payment authorization
      const submitBookingFunction = httpsCallable(firebaseFunctions, 'submitBookingRequestWithPaymentAuth');
      const result = await submitBookingFunction({
        resourceId: 'studio-1',
        requestedStartTime: selectedSlot!.start.toISOString(),
        requestedEndTime: selectedSlot!.end.toISOString(),
        durationHours: (selectedSlot!.end.getTime() - selectedSlot!.start.getTime()) / (1000 * 60 * 60),
        serviceType: selectedServiceData.serviceType || selectedServiceData.id || selectedServiceData.name,
        serviceDetailsInput: {
          producer: producer,
          ...services,
          notes: notes,
          songCount: songCount,
          selectedBeatLicense: selectedBeatLicense,
          isNewCustomer: isNewCustomer
        },
        clientNotes: notes,
        clientName: user?.displayName || user?.email || 'Unknown',
        clientEmail: user?.email || '',
        clientPhone: '',
        paymentMethodId: paymentMethod.id
      });

      if ((result.data as any).success) {
        if ((result.data as any).requiresAction && (result.data as any).clientSecret) {
          // Handle 3D Secure authentication
          const { error: confirmError } = await stripe.confirmCardPayment((result.data as any).clientSecret);
          if (confirmError) {
            setError(confirmError.message || '3D Secure authentication failed');
            return;
          }
        }

        // Success - payment authorized and booking request submitted
        clearSelectionStates();
        setShowConfirm(true);
        setShowPaymentAuth(false);
      } else {
        throw new Error('Failed to submit booking request');
      }
    } catch (error: any) {
      console.error('Error with payment authorization:', error);
      setError(`Payment authorization failed: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  if (showPaymentAuth) {
    return (
      <div className="space-y-6">
        <div className="bg-white p-4 rounded-lg border">
          <h3 className="font-semibold text-lg mb-3">Payment Authorization</h3>
          <p className="text-sm text-gray-600 mb-4">
            We'll authorize your card for the deposit amount. You won't be charged until an admin approves your booking.
          </p>
          <div className="mb-4 p-3 border rounded">
            <CardElement 
              options={{
                style: {
                  base: {
                    fontSize: '16px',
                    color: '#424770',
                    '::placeholder': {
                      color: '#aab7c4',
                    },
                  },
                },
              }}
            />
          </div>
          <div className="flex space-x-3">
            <button
              type="button"
              onClick={() => setShowPaymentAuth(false)}
              className="flex-1 py-2 px-4 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
            >
              Back
            </button>
            <button
              type="button"
              onClick={handlePaymentAuth}
              disabled={loading || !stripe || !elements}
              className="flex-1 py-2 px-4 bg-accent-blue text-white rounded-md hover:bg-accent-blue/90 disabled:opacity-50"
            >
              {loading ? 'Authorizing...' : `Authorize $${Math.max(calculateTotalPrice() * 0.5, 25)}`}
            </button>
          </div>
        </div>
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
      </div>
    );
  }

  return (
    <form onSubmit={handleCreateBooking} className="space-y-6">
      {/* Booking Summary */}
      {selectedServiceData && (
        <div className="bg-white p-4 rounded-lg border">
          <h3 className="font-semibold text-lg mb-3">Booking Summary</h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span>Service:</span>
              <span>{selectedServiceData.name}</span>
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
            <div className="flex justify-between border-t pt-2">
              <span>Total Service Cost:</span>
              <span>${totalPrice}</span>
            </div>
            {totalPrice > 0 && (
              <>
                <div className="flex justify-between font-semibold text-accent-blue">
                  <span>Deposit Required:</span>
                  <span>${Math.max(totalPrice * 0.5, 25)}</span>
                </div>
                <div className="flex justify-between text-xs text-slate-500">
                  <span>Balance due after session:</span>
                  <span>${totalPrice - Math.max(totalPrice * 0.5, 25)}</span>
                </div>
              </>
            )}
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

      {/* Notes Section */}
      <div className="bg-white p-4 rounded-lg border">
        <label className="block text-sm font-medium text-slate-700 mb-2">
          Additional Notes (Optional)
        </label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Any special requests or notes for your session..."
          rows={3}
          className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-accent-blue focus:border-transparent resize-none"
        />
      </div>

      {/* Submit Section */}
      <div className="bg-gradient-to-r from-accent-blue to-accent-green p-6 rounded-lg text-white">
        <div className="flex flex-col space-y-4">
          <div className="flex justify-between items-center">
            <div className="text-xl font-bold">
              {totalPrice === 0 ? 'Free Session' : `Deposit: $${Math.max(totalPrice * 0.5, 25)}`}
            </div>
            {selectedServiceData?.isFree && (
              <span className="bg-white/20 px-3 py-1 rounded-full text-sm font-medium">
                Free Session
              </span>
            )}
          </div>
          <button
            type="submit"
            disabled={loading || !selectedService}
            className={`w-full py-4 px-6 rounded-lg font-semibold text-lg transition-all duration-200 ${
              loading || !selectedService
                ? 'bg-white/20 cursor-not-allowed text-white/70'
                : 'bg-white text-accent-blue hover:bg-white/90 hover:shadow-lg transform hover:-translate-y-0.5'
            }`}
          >
            {loading ? (
              <div className="flex items-center justify-center">
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-accent-blue" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Processing...
              </div>
            ) : (
              totalPrice === 0 ? '🎉 Book Free Session' : '💳 Authorize Payment'
            )}
          </button>
        </div>
      </div>
    </form>
  );
}

// Removed PaymentForm component - using hybrid approach with booking requests instead

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
  const [date, setDate] = useState(() => {
    // Always start with today - show today + 6 future days
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return today;
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showConfirm, setShowConfirm] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState<MyCalendarEvent | null>(null);
  const [selectedService, setSelectedService] = useState<string | null>(null);
  const [selectedServiceData, setSelectedServiceData] = useState<any>(null);
  const [selectedDuration, setSelectedDuration] = useState<number>(60);
  const [songCount, setSongCount] = useState<number>(1);
  const [selectedBeatLicense, setSelectedBeatLicense] = useState<string | null>(null);
  const [isNewCustomer, setIsNewCustomer] = useState<boolean>(false);
  // Removed payment-related state - using hybrid approach

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
          const eventStart = (data.startTime as Timestamp).toDate().getTime();
          const eventEnd = (data.endTime as Timestamp).toDate().getTime();
          isSelection = eventStart === slotStart && eventEnd === slotEnd;
          isPendingStart = !!pendingStartTime && eventStart === pendingStartTime.getTime();
        }
        return {
          title: isOwnBooking && isConfirmed ? 'Your Confirmed Booking' : !isOwnBooking ? 'Booked Slot' : '',
          start: (data.startTime as Timestamp).toDate(),
          end: (data.endTime as Timestamp).toDate(),
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
            // Handle both Timestamp and regular date objects
            let startDate, endDate;
            
            if (data.startTime?.toDate) {
              startDate = data.startTime.toDate();
            } else {
              startDate = new Date(data.startTime);
            }
            
            if (data.endTime?.toDate) {
              endDate = data.endTime.toDate();
            } else {
              endDate = new Date(data.endTime);
            }

            return {
                title: 'Confirmed Session',
                start: startDate,
                end: endDate,
                isMyBooking: true,
            };
        });
        setMyConfirmedBookings(fetchedBookings);
    }, (error) => {
        console.error('Error fetching user bookings:', error);
        // Set empty array on error to prevent app crashes
        setMyConfirmedBookings([]);
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
    const { start: clickedCellStartTime } = slotInfo;
    
    if (!selectedService) {
      setError('Please select a service first.');
      return;
    }

    if (!selectedServiceData) {
      setError('Service data not loaded. Please refresh the page.');
      return;
    }

    if (isPast(clickedCellStartTime)) {
      setError('Cannot book a slot in the past.');
      clearSelectionStates();
      return;
    }

    // Determine duration based on service type
    let duration = selectedDuration;
    
    // For fixed duration services, use the service duration
    if (!selectedServiceData.hourlyPricing && !selectedServiceData.pricePerHour && !selectedServiceData.pricePerSong) {
      duration = selectedServiceData.duration || 15;
    }
    
    // For per-song services, use consultation duration
    if (selectedServiceData.pricePerSong) {
      duration = selectedServiceData.duration || 15;
    }

    // For hourly services, use the selected duration from the service selector
    if (selectedServiceData.hourlyPricing && selectedDuration > 0) {
      duration = selectedDuration;
    }

    // For production services, use the selected duration
    if (selectedServiceData.pricePerHour && selectedDuration > 0) {
      duration = selectedDuration;
    }

    const end = addMinutes(clickedCellStartTime, duration);
    
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
  };

  const handleNavigate = (newDate: Date, view: string) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Start of today
    
    // Always start from today - don't allow navigation to past dates
    if (isBefore(newDate, today)) {
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
              onServiceDataSelect={setSelectedServiceData}
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
          <div className="mb-4">
            <p className="text-sm text-foreground/70 mb-2">
              {selectedServiceData ? (
                selectedServiceData.hourlyPricing ? 
                  `Click any available time slot to book your ${selectedDuration / 60} hour ${selectedServiceData.name.toLowerCase()}.` :
                selectedServiceData.pricePerSong ?
                  `Click any available time slot for your ${selectedServiceData.duration || 15}-minute consultation.` :
                selectedServiceData.pricePerHour ?
                  `Click any available time slot to start your ${selectedDuration / 60} hour production session.` :
                  `Click any available time slot to book your ${selectedServiceData.duration || 15}-minute ${selectedServiceData.name.toLowerCase()}.`
              ) : 'Select a service first to see booking options.'
              }
            </p>
            <div className="flex flex-wrap gap-4 text-xs">
              <div className="flex items-center space-x-1">
                <div className="w-3 h-3 bg-green-500 rounded"></div>
                <span>Your confirmed bookings</span>
              </div>
              <div className="flex items-center space-x-1">
                <div className="w-3 h-3 bg-gray-400 rounded"></div>
                <span>Unavailable</span>
              </div>
              <div className="flex items-center space-x-1">
                <div className="w-3 h-3 bg-orange-500 rounded"></div>
                <span>Your selection</span>
              </div>
              <div className="flex items-center space-x-1">
                <div className="w-3 h-3 bg-blue-500 rounded"></div>
                <span>Pending start time</span>
              </div>
            </div>
          </div>
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
                step={30}
                timeslots={2}
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
              <Elements stripe={stripePromise}>
                <BookingPaymentForm
                  selectedSlot={selectedSlot}
                  services={services}
                  notes={notes}
                  producer={producer}
                  clearSelectionStates={clearSelectionStates}
                  setShowConfirm={setShowConfirm}
                  setProducer={setProducer}
                  setServices={setServices}
                  setNotes={setNotes}
                  user={user}
                  selectedService={selectedService}
                  selectedServiceData={selectedServiceData}
                  selectedDuration={selectedDuration}
                  songCount={songCount}
                  selectedBeatLicense={selectedBeatLicense}
                  isNewCustomer={isNewCustomer}
                />
              </Elements>
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
            <h2 className="text-xl font-bold mb-4">Booking Request Submitted!</h2>
            <p className="text-blue-600 mb-4">
              Your booking request has been submitted successfully. 
              {selectedServiceData?.isFree 
                ? ' Since this is a free consultation, it will be reviewed and confirmed by our team.'
                : ' Your payment has been authorized and will only be charged once an admin approves your booking.'
              }
            </p>
            <p className="text-gray-600 text-sm mb-4">
              You'll receive an email confirmation once your booking is approved.
            </p>
            <button 
              onClick={() => {
                setShowConfirm(false);
                clearSelectionStates();
              }} 
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