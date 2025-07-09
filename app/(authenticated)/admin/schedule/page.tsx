'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import { db as firestore } from '@/lib/firebase';
import { collection, onSnapshot, query, where, Timestamp, updateDoc, doc, addDoc } from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { functions as firebaseFunctions } from '@/lib/firebase';
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
  customerName?: string;
  customerEmail?: string;
  serviceName?: string;
  totalPrice?: number;
  depositAmount?: number;
  depositPaid?: boolean;
  finalAmount?: number;
  finalPaid?: boolean;
  notes?: string;
  paymentHistory?: any[];
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
          const status = data.status || 'pending';
          let title = '';
          
          switch (status) {
            case 'confirmed':
              title = `${data.serviceName || 'Session'}`;
              break;
            case 'pending_payment':
              title = `${data.serviceName || 'Session'} (Payment Pending)`;
              break;
            case 'pending_approval':
              title = `${data.serviceName || 'Session'} (Needs Approval)`;
              break;
            case 'pending_confirmation':
              title = `${data.serviceName || 'Session'} (Deposit Paid)`;
              break;
            case 'completed':
              title = `${data.serviceName || 'Session'} (Completed)`;
              break;
            default:
              title = `${data.serviceName || 'Session'} (${status})`;
          }
          
          return {
            ...data,
            id: doc.id,
            title,
            start: (data.startTime || data.start)?.toDate ? (data.startTime || data.start).toDate() : new Date(data.startTime || data.start),
            end: (data.endTime || data.end)?.toDate ? (data.endTime || data.end).toDate() : new Date(data.endTime || data.end),
            status,
            isConfirmed: status === 'confirmed',
          } as ScheduleEvent;
        });
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
              color: 'white',
              fontWeight: 'bold',
            };
            
            switch (event.status) {
              case 'confirmed':
                style.backgroundColor = '#22c55e'; // Green
                style.borderColor = '#16a34a';
                break;
              case 'pending_payment':
                style.backgroundColor = '#f59e0b'; // Amber
                style.borderColor = '#d97706';
                break;
              case 'pending_approval':
                style.backgroundColor = '#ef4444'; // Red - needs immediate attention
                style.borderColor = '#dc2626';
                break;
              case 'pending_confirmation':
                style.backgroundColor = '#3b82f6'; // Blue - deposit paid, ready to confirm
                style.borderColor = '#2563eb';
                break;
              case 'completed':
                style.backgroundColor = '#8b5cf6'; // Purple
                style.borderColor = '#7c3aed';
                break;
              default:
                style.backgroundColor = '#6b7280'; // Gray
                style.borderColor = '#4b5563';
            }
            
            return { style };
          }}
        />
        {selectedBooking && (
          <BookingDetailsModal 
            booking={selectedBooking} 
            onClose={() => setSelectedBooking(null)}
            onUpdate={(updatedBooking) => {
              setMyEvents(prev => prev.map(event => 
                event.id === updatedBooking.id ? { ...event, ...updatedBooking } : event
              ));
            }}
          />
        )}
      </div>
    </div>
  );
};

// Booking Details Modal Component
function BookingDetailsModal({ 
  booking, 
  onClose, 
  onUpdate 
}: { 
  booking: ScheduleEvent; 
  onClose: () => void; 
  onUpdate: (booking: any) => void;
}) {
  const [loading, setLoading] = useState(false);
  const [finalAmount, setFinalAmount] = useState(booking.finalAmount || booking.totalPrice || 0);
  const [additionalNotes, setAdditionalNotes] = useState('');
  const [sessionFiles, setSessionFiles] = useState<File[]>([]);
  const [uploadedFiles, setUploadedFiles] = useState<string[]>(booking.sessionFiles || []);

  const handleConfirmBooking = async () => {
    if (booking.status === 'confirmed') return;
    
    setLoading(true);
    try {
      await updateDoc(doc(firestore, 'bookings', booking.id), {
        status: 'confirmed',
        confirmedAt: new Date(),
        updatedAt: new Date()
      });
      
      onUpdate({ ...booking, status: 'confirmed' });
      onClose();
    } catch (error) {
      console.error('Error confirming booking:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCompleteSession = async () => {
    setLoading(true);
    try {
      const remainingBalance = getRemainingBalance();
      
      const updates: any = {
        status: 'completed',
        completedAt: new Date(),
        updatedAt: new Date(),
        finalAmount: finalAmount
      };

      if (additionalNotes) {
        updates.adminNotes = additionalNotes;
      }

      // Handle file uploads (for now, just store file names - you can implement actual file upload later)
      if (sessionFiles.length > 0) {
        const fileNames = sessionFiles.map(file => file.name);
        updates.sessionFiles = [...uploadedFiles, ...fileNames];
        // TODO: Implement actual file upload to Firebase Storage or another service
        console.log('Files to upload:', sessionFiles);
      }

      // If there's a remaining balance, create a checkout session for final payment
      if (remainingBalance > 0) {
        try {
          // Create checkout session for remaining balance using Stripe extension
          const checkoutSessionRef = await addDoc(
            collection(firestore, 'customers', booking.userId, 'checkout_sessions'),
            {
              mode: 'payment',
              amount: remainingBalance * 100, // Convert to cents
              currency: 'usd',
              success_url: `${window.location.origin}/profile/bookings?success=true`,
              cancel_url: `${window.location.origin}/profile/bookings`,
              metadata: {
                bookingId: booking.id,
                paymentType: 'final',
                description: `Final payment for ${booking.serviceName} session`
              }
            }
          );

          updates.finalPaymentSessionId = checkoutSessionRef.id;
          updates.finalPaymentStatus = 'pending';
          
          // Add to payment history
          const paymentHistory = booking.paymentHistory || [];
          paymentHistory.push({
            type: 'final_payment_created',
            amount: remainingBalance,
            timestamp: new Date(),
            description: `Final payment session created for $${remainingBalance}`
          });
          updates.paymentHistory = paymentHistory;
        } catch (paymentError) {
          console.error('Error creating final payment session:', paymentError);
          // Continue with completion even if payment setup fails
        }
      } else {
        updates.finalPaid = true;
      }

      await updateDoc(doc(firestore, 'bookings', booking.id), updates);
      
      onUpdate({ ...booking, status: 'completed', finalAmount });
      onClose();
    } catch (error) {
      console.error('Error completing session:', error);
    } finally {
      setLoading(false);
    }
  };

  const getRemainingBalance = () => {
    const depositPaid = booking.depositPaid ? (booking.depositAmount || 0) : 0;
    return Math.max(finalAmount - depositPaid, 0);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex justify-between items-start mb-6">
            <h2 className="text-2xl font-bold text-accent-blue">Booking Details</h2>
            <button 
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 text-2xl"
            >
              ×
            </button>
          </div>

          {/* Basic Information */}
          <div className="grid md:grid-cols-2 gap-6 mb-6">
            <div className="space-y-3">
              <h3 className="font-semibold text-lg border-b pb-2">Session Information</h3>
              <div><strong>Service:</strong> {booking.serviceName}</div>
              <div><strong>Date:</strong> {format(booking.start!, 'PPP')}</div>
              <div><strong>Time:</strong> {format(booking.start!, 'p')} - {format(booking.end!, 'p')}</div>
              <div><strong>Status:</strong> 
                <span className={`ml-2 px-2 py-1 rounded text-sm font-medium ${
                  booking.status === 'confirmed' ? 'bg-green-100 text-green-800' :
                  booking.status === 'pending_payment' ? 'bg-amber-100 text-amber-800' :
                  booking.status === 'completed' ? 'bg-purple-100 text-purple-800' :
                  'bg-gray-100 text-gray-800'
                }`}>
                  {booking.status}
                </span>
              </div>
            </div>

            <div className="space-y-3">
              <h3 className="font-semibold text-lg border-b pb-2">Customer Information</h3>
              <div><strong>Name:</strong> {booking.customerName}</div>
              <div><strong>Email:</strong> {booking.customerEmail}</div>
              {booking.notes && (
                <div><strong>Customer Notes:</strong> 
                  <p className="mt-1 text-sm bg-gray-50 p-2 rounded">{booking.notes}</p>
                </div>
              )}
            </div>
          </div>

          {/* Payment Information */}
          <div className="mb-6">
            <h3 className="font-semibold text-lg border-b pb-2 mb-3">Payment Information</h3>
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <div><strong>Total Service Cost:</strong> ${booking.totalPrice}</div>
                <div><strong>Deposit Required:</strong> ${booking.depositAmount}</div>
                <div><strong>Deposit Status:</strong> 
                  <span className={`ml-2 px-2 py-1 rounded text-sm ${
                    booking.depositPaid ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                  }`}>
                    {booking.depositPaid ? 'Paid' : 'Pending'}
                  </span>
                </div>
              </div>
              
              {booking.status === 'completed' && (
                <div className="space-y-2">
                  <div><strong>Final Amount:</strong> ${booking.finalAmount || booking.totalPrice}</div>
                  <div><strong>Remaining Balance:</strong> ${getRemainingBalance()}</div>
                  {getRemainingBalance() > 0 && (
                    <div className="space-y-1">
                      <div className="text-amber-600 font-medium">Final payment pending</div>
                      {(booking as any).finalPaymentStatus === 'pending' && (
                        <div className="text-sm text-blue-600">Invoice sent to customer</div>
                      )}
                    </div>
                  )}
                  {getRemainingBalance() === 0 && (
                    <div className="text-green-600 font-medium">Fully paid</div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Session Management */}
          {booking.status !== 'completed' && (
            <div className="mb-6">
              <h3 className="font-semibold text-lg border-b pb-2 mb-3">Session Management</h3>
              
              {(booking.status === 'pending_approval' || (booking.status === 'pending_payment' && booking.depositPaid) || booking.status === 'pending_confirmation') && (
                <div className="mb-4">
                  <button
                    onClick={handleConfirmBooking}
                    disabled={loading}
                    className="w-full md:w-auto px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 font-medium border-0"
                  >
                    {loading ? 'Confirming...' : 'Confirm Session'}
                  </button>
                  <p className="text-sm text-gray-600 mt-2">
                    {booking.status === 'pending_approval' && 'Free booking awaiting approval. Click to confirm the session.'}
                    {booking.status === 'pending_confirmation' && 'Deposit has been paid. Click to confirm the session.'}
                    {booking.status === 'pending_payment' && booking.depositPaid && 'Deposit has been paid. Click to confirm the session.'}
                  </p>
                </div>
              )}

              {booking.status === 'confirmed' && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Final Amount (adjust if needed)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={finalAmount}
                      onChange={(e) => setFinalAmount(Number(e.target.value))}
                      className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-accent-blue focus:border-transparent"
                    />
                    <p className="text-sm text-gray-600 mt-1">
                      Original: ${booking.totalPrice} | Customer paid: ${booking.depositPaid ? booking.depositAmount : 0}
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Session Notes (optional)
                    </label>
                    <textarea
                      value={additionalNotes}
                      onChange={(e) => setAdditionalNotes(e.target.value)}
                      placeholder="Add any notes about the session, additional services, etc."
                      rows={3}
                      className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-accent-blue focus:border-transparent resize-none"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Session Files (Audio, Documents, etc.)
                    </label>
                    <input
                      type="file"
                      multiple
                      accept="audio/*,video/*,.pdf,.doc,.docx,.txt,.zip,.rar"
                      onChange={(e) => {
                        if (e.target.files) {
                          setSessionFiles(Array.from(e.target.files));
                        }
                      }}
                      className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-accent-blue focus:border-transparent"
                    />
                    {sessionFiles.length > 0 && (
                      <div className="mt-2">
                        <p className="text-sm text-gray-600">Selected files:</p>
                        <ul className="text-sm text-gray-800">
                          {sessionFiles.map((file, index) => (
                            <li key={index}>• {file.name} ({(file.size / 1024 / 1024).toFixed(2)} MB)</li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {uploadedFiles.length > 0 && (
                      <div className="mt-2">
                        <p className="text-sm text-gray-600">Previously uploaded:</p>
                        <ul className="text-sm text-blue-600">
                          {uploadedFiles.map((file, index) => (
                            <li key={index}>• {file}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>

                  <button
                    onClick={handleCompleteSession}
                    disabled={loading}
                    className="w-full md:w-auto px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 font-medium border-0"
                  >
                    {loading ? 'Processing...' : 'Complete Session'}
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Payment History */}
          {booking.paymentHistory && booking.paymentHistory.length > 0 && (
            <div className="mb-6">
              <h3 className="font-semibold text-lg border-b pb-2 mb-3">Payment History</h3>
              <div className="space-y-2">
                {booking.paymentHistory.map((payment: any, index: number) => (
                  <div key={index} className="flex justify-between items-center p-2 bg-gray-50 rounded">
                    <span>{payment.description || payment.type}</span>
                    <span className="font-medium">${payment.amount}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Close Button */}
          <div className="flex justify-end">
            <button
              onClick={onClose}
              className="px-6 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default AdminSchedulePage; 