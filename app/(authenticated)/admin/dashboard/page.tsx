'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import { db as firestore } from '@/lib/firebase';
import { collection, onSnapshot, query, orderBy, doc, updateDoc, Timestamp, getDoc, getDocs, addDoc, deleteDoc } from 'firebase/firestore';
import { format } from 'date-fns';
import { httpsCallable } from 'firebase/functions';
import { functions as firebaseFunctions } from '@/lib/firebase';

interface BookingRequest {
  id: string;
  clientId: string;
  clientName: string;
  clientEmail: string;
  clientPhone: string;
  resourceId: string;
  requestedStartTime: Date;
  requestedEndTime: Date;
  durationHours: number;
  serviceType: string;
  serviceDetailsInput: any;
  clientNotes: string;
  status: 'pending_payment_auth' | 'pending_admin_review' | 'confirmed' | 'declined' | 'payment_failed';
  totalCost: number;
  depositAmount: number;
  remainingBalance: number;
  stripeDepositPaymentIntentId?: string;
  stripePaymentMethodId?: string;
  paymentAuthorized?: boolean;
  paymentAuthorizedAt?: Date;
  depositCaptured?: boolean;
  depositCapturedAt?: Date;
  acceptedByAdminId?: string;
  assignedEngineerId?: string;
  confirmedAt?: Date;
  declinedByAdminId?: string;
  declineReason?: string;
  declinedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

interface Booking {
  id: string;
  bookingRequestId: string;
  resourceId: string;
  clientId: string;
  engineerId?: string;
  clientName: string;
  clientEmail: string;
  clientPhone: string;
  startTime: Date;
  endTime: Date;
  durationHours: number;
  totalCost: number;
  depositAmountPaid: number;
  remainingBalance: number;
  stripeDepositPaymentIntentId: string;
  stripePaymentMethodId: string;
  bookingStatus: 'confirmed_deposit_paid' | 'completed_fully_paid';
  serviceType: string;
  serviceDetailsInput: any;
  stripeFinalChargeId?: string;
  additionalServiceDetails?: any;
  finalChargeProcessedAt?: Date;
  finalChargeProcessedBy?: string;
  createdAt: Date;
  updatedAt: Date;
}

const AdminDashboard = () => {
  const { user, isAdmin, loading } = useAuth();
  const router = useRouter();
  const [bookingRequests, setBookingRequests] = useState<BookingRequest[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [isUpdating, setIsUpdating] = useState<string | null>(null);
  const [selectedDetails, setSelectedDetails] = useState<BookingRequest | Booking | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && !isAdmin) {
      router.push('/');
    }
  }, [user, isAdmin, loading, router]);

  // Fetch booking requests
  useEffect(() => {
    if (!isAdmin) return;

    const bookingRequestsCol = collection(firestore, 'booking_requests');
    const q = query(bookingRequestsCol, orderBy('createdAt', 'desc'));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetchedRequests = snapshot.docs.map((doc) => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          requestedStartTime: (data.requestedStartTime as Timestamp).toDate(),
          requestedEndTime: (data.requestedEndTime as Timestamp).toDate(),
          createdAt: (data.createdAt as Timestamp).toDate(),
          updatedAt: (data.updatedAt as Timestamp).toDate(),
          paymentAuthorizedAt: data.paymentAuthorizedAt ? (data.paymentAuthorizedAt as Timestamp).toDate() : undefined,
          depositCapturedAt: data.depositCapturedAt ? (data.depositCapturedAt as Timestamp).toDate() : undefined,
          confirmedAt: data.confirmedAt ? (data.confirmedAt as Timestamp).toDate() : undefined,
          declinedAt: data.declinedAt ? (data.declinedAt as Timestamp).toDate() : undefined,
        } as BookingRequest;
      });
      setBookingRequests(fetchedRequests);
    });

    return () => unsubscribe();
  }, [isAdmin]);

  // Fetch confirmed bookings
  useEffect(() => {
    if (!isAdmin) return;

    const bookingsCol = collection(firestore, 'bookings');
    const q = query(bookingsCol, orderBy('createdAt', 'desc'));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetchedBookings = snapshot.docs.map((doc) => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          startTime: (data.startTime as Timestamp).toDate(),
          endTime: (data.endTime as Timestamp).toDate(),
          createdAt: (data.createdAt as Timestamp).toDate(),
          updatedAt: (data.updatedAt as Timestamp).toDate(),
          finalChargeProcessedAt: data.finalChargeProcessedAt ? (data.finalChargeProcessedAt as Timestamp).toDate() : undefined,
        } as Booking;
      });
      setBookings(fetchedBookings);
      setIsLoadingData(false);
    });

    return () => unsubscribe();
  }, [isAdmin]);

  const handleAcceptBookingRequest = async (requestId: string, assignedEngineerId?: string) => {
    if (isUpdating) return;
    setIsUpdating(requestId);
    setActionError(null);
    setActionSuccess(null);

    try {
      const acceptFunction = httpsCallable(firebaseFunctions, 'acceptBookingRequestAndCaptureDeposit');
      const result = await acceptFunction({ 
        bookingRequestId: requestId,
        assignedEngineerId: assignedEngineerId || null
      });

      if ((result.data as any).success) {
        setActionSuccess('Booking request accepted and deposit captured!');
      } else {
        throw new Error('Failed to accept booking request');
      }
    } catch (error: any) {
      console.error('Error accepting booking request:', error);
      setActionError(`Failed to accept booking: ${error.message}`);
    } finally {
      setIsUpdating(null);
    }
  };

  const handleDeclineBookingRequest = async (requestId: string) => {
    const reason = prompt('Reason for declining (optional):');
    
    if (isUpdating) return;
    setIsUpdating(requestId);
    setActionError(null);
    setActionSuccess(null);

    try {
      const declineFunction = httpsCallable(firebaseFunctions, 'declineBookingRequest');
      const result = await declineFunction({ 
        bookingRequestId: requestId,
        reason: reason || 'No reason provided'
      });

      if ((result.data as any).success) {
        setActionSuccess('Booking request declined and payment authorization canceled.');
      } else {
        throw new Error('Failed to decline booking request');
      }
    } catch (error: any) {
      console.error('Error declining booking request:', error);
      setActionError(`Failed to decline booking: ${error.message}`);
    } finally {
      setIsUpdating(null);
    }
  };

  const handleChargeFinalPayment = async (booking: Booking) => {
    const finalAmount = prompt(`Enter final amount for this session (original: $${booking.totalCost}):`, booking.totalCost?.toString() || '0');
    if (!finalAmount) return;
    
    const finalAmountNum = parseFloat(finalAmount);
    if (isNaN(finalAmountNum) || finalAmountNum < 0) {
      alert('Please enter a valid amount');
      return;
    }

    const additionalServices = prompt('Any additional services or notes (optional):');
    const depositPaid = booking.depositAmountPaid || 0;
    const remainingBalance = Math.max(finalAmountNum - depositPaid, 0);
    
    if (!window.confirm(`Final amount: $${finalAmountNum}\nDeposit paid: $${depositPaid}\nRemaining balance: $${remainingBalance}\n\nProceed with charging final payment?`)) return;
    
    setActionLoading(true);
    setActionError(null);
    setActionSuccess(null);
    
    try {
      const chargeFinalFunction = httpsCallable(firebaseFunctions, 'chargeFinalSessionPayment');
      const result = await chargeFinalFunction({
        bookingId: booking.id,
        finalAmountToCharge: finalAmountNum,
        additionalServiceDetails: additionalServices ? { notes: additionalServices } : {}
      });

      if ((result.data as any).success) {
        if (remainingBalance > 0) {
          setActionSuccess(`Final payment of $${remainingBalance} charged successfully!`);
        } else {
          setActionSuccess('Session completed! No additional payment required.');
        }
      } else {
        throw new Error('Failed to charge final payment');
      }
    } catch (error: any) {
      console.error('Error charging final payment:', error);
      setActionError(`Failed to charge final payment: ${error.message}`);
    } finally {
      setActionLoading(false);
    }
  };

  if (loading || isLoadingData) {
    return (
      <div className="flex justify-center items-center h-screen">
        <p className="text-xl font-logo">Loading Dashboard...</p>
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

  // Sort by priority: pending admin review first, then confirmed bookings, then declined/completed
  const pendingRequests = bookingRequests.filter(r => r.status === 'pending_admin_review');
  const otherRequests = bookingRequests.filter(r => r.status !== 'pending_admin_review');
  const confirmedBookings = bookings.filter(b => b.bookingStatus === 'confirmed_deposit_paid');
  const completedBookings = bookings.filter(b => b.bookingStatus === 'completed_fully_paid');

  return (
    <div className="p-4 md:p-8 space-y-6">
      <h1 className="text-3xl md:text-4xl font-logo text-accent-green">Admin Dashboard</h1>
      
      {/* Pending Admin Review Section */}
      {pendingRequests.length > 0 && (
        <div className="bg-red-50 border border-red-200 p-4 rounded-lg shadow-md">
          <h2 className="text-2xl font-logo text-red-700 mb-4">Pending Admin Review ({pendingRequests.length})</h2>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-red-200">
              <thead className="bg-red-100">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-red-700 uppercase tracking-wider">Date & Time</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-red-700 uppercase tracking-wider">Client</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-red-700 uppercase tracking-wider">Service</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-red-700 uppercase tracking-wider">Payment</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-red-700 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-red-200">
                {pendingRequests.map((request) => (
                  <tr key={request.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-800">
                      <div>{format(request.requestedStartTime, 'PPP')}</div>
                      <div className="text-slate-500">{format(request.requestedStartTime, 'p')} - {format(request.requestedEndTime, 'p')}</div>
                      <div className="text-xs text-slate-400">{request.durationHours}h session</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-800">
                      <div className="font-medium">{request.clientName}</div>
                      <div className="text-xs text-slate-500">{request.clientEmail}</div>
                      {request.clientPhone && <div className="text-xs text-slate-500">{request.clientPhone}</div>}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">
                      <div className="font-medium">{request.serviceType}</div>
                      {request.clientNotes && <div className="text-xs text-slate-500">{request.clientNotes}</div>}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">
                      <div>Total: ${request.totalCost}</div>
                      <div>Deposit: ${request.depositAmount}</div>
                      <div className={`text-xs ${request.paymentAuthorized ? 'text-green-600' : 'text-orange-600'}`}>
                        {request.paymentAuthorized ? '✓ Payment Authorized' : '⚠ Payment Pending'}
                      </div>
                      {request.stripeDepositPaymentIntentId && (
                        <div className="text-xs text-blue-600">
                          <a href={`https://dashboard.stripe.com/test/payments/${request.stripeDepositPaymentIntentId}`} target="_blank" rel="noopener noreferrer" className="underline">
                            View in Stripe
                          </a>
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex flex-col gap-2">
                        <button 
                          onClick={() => setSelectedDetails(request)} 
                          className="text-blue-600 hover:text-blue-800 underline text-left"
                        >
                          View Details
                        </button>
                        
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleAcceptBookingRequest(request.id)}
                            disabled={isUpdating === request.id || !request.paymentAuthorized}
                            className="px-3 py-1 text-xs font-medium rounded bg-green-600 text-white hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed min-w-[60px]">
                            {isUpdating === request.id ? '...' : 'Accept & Capture'}
                          </button>
                          <button
                            onClick={() => handleDeclineBookingRequest(request.id)}
                            disabled={isUpdating === request.id}
                            className="px-3 py-1 text-xs font-medium rounded bg-red-600 text-white hover:bg-red-700 disabled:bg-gray-300 disabled:cursor-not-allowed min-w-[60px]">
                            {isUpdating === request.id ? '...' : 'Decline'}
                          </button>
                        </div>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Confirmed Bookings Section */}
      {confirmedBookings.length > 0 && (
        <div className="bg-green-50 border border-green-200 p-4 rounded-lg shadow-md">
          <h2 className="text-2xl font-logo text-green-700 mb-4">Confirmed Bookings ({confirmedBookings.length})</h2>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-green-200">
              <thead className="bg-green-100">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-green-700 uppercase tracking-wider">Date & Time</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-green-700 uppercase tracking-wider">Client</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-green-700 uppercase tracking-wider">Service</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-green-700 uppercase tracking-wider">Payment</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-green-700 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-green-200">
                {confirmedBookings.map((booking) => (
                  <tr key={booking.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-800">
                      <div>{format(booking.startTime, 'PPP')}</div>
                      <div className="text-slate-500">{format(booking.startTime, 'p')} - {format(booking.endTime, 'p')}</div>
                      <div className="text-xs text-slate-400">{booking.durationHours}h session</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-800">
                      <div className="font-medium">{booking.clientName}</div>
                      <div className="text-xs text-slate-500">{booking.clientEmail}</div>
                      {booking.clientPhone && <div className="text-xs text-slate-500">{booking.clientPhone}</div>}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">
                      <div className="font-medium">{booking.serviceType}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">
                      <div>Total: ${booking.totalCost}</div>
                      <div className="text-green-600">✓ Deposit Paid: ${booking.depositAmountPaid}</div>
                      <div>Remaining: ${booking.remainingBalance}</div>
                      {booking.stripeDepositPaymentIntentId && (
                        <div className="text-xs text-blue-600">
                          <a href={`https://dashboard.stripe.com/test/payments/${booking.stripeDepositPaymentIntentId}`} target="_blank" rel="noopener noreferrer" className="underline">
                            View in Stripe
                          </a>
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex flex-col gap-2">
                        <button 
                          onClick={() => setSelectedDetails(booking)} 
                          className="text-blue-600 hover:text-blue-800 underline text-left"
                        >
                          View Details
                        </button>
                        
                        <button
                          onClick={() => handleChargeFinalPayment(booking)}
                          disabled={actionLoading}
                          className="px-3 py-1 text-xs font-medium rounded bg-blue-600 text-white hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed min-w-[80px]">
                          Complete Session
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* All Other Data Section */}
      <div className="bg-white/80 backdrop-blur-sm p-4 rounded-lg shadow-md">
        <h2 className="text-2xl font-logo text-accent-blue mb-4">All Booking History</h2>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Date & Time</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Client</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Service</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Status</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-slate-200">
              {/* Other Booking Requests */}
              {otherRequests.map((request) => (
                <tr key={`request-${request.id}`}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-800">
                    <div>{format(request.requestedStartTime, 'PPP')}</div>
                    <div className="text-slate-500">{format(request.requestedStartTime, 'p')} - {format(request.requestedEndTime, 'p')}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-800">
                    <div>{request.clientName}</div>
                    <div className="text-xs text-slate-500">{request.clientEmail}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">{request.serviceType}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                      request.status === 'confirmed' ? 'bg-green-100 text-green-800' :
                      request.status === 'declined' ? 'bg-red-100 text-red-800' :
                      request.status === 'payment_failed' ? 'bg-red-100 text-red-800' :
                      'bg-yellow-100 text-yellow-800'
                    }`}>
                      {request.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <button 
                      onClick={() => setSelectedDetails(request)} 
                      className="text-blue-600 hover:text-blue-800 underline"
                    >
                      View Details
                    </button>
                  </td>
                </tr>
              ))}
              
              {/* Completed Bookings */}
              {completedBookings.map((booking) => (
                <tr key={`booking-${booking.id}`}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-800">
                    <div>{format(booking.startTime, 'PPP')}</div>
                    <div className="text-slate-500">{format(booking.startTime, 'p')} - {format(booking.endTime, 'p')}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-800">
                    <div>{booking.clientName}</div>
                    <div className="text-xs text-slate-500">{booking.clientEmail}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">{booking.serviceType}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-purple-100 text-purple-800">
                      Completed
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <button 
                      onClick={() => setSelectedDetails(booking)} 
                      className="text-blue-600 hover:text-blue-800 underline"
                    >
                      View Details
                    </button>
                  </td>
                </tr>
              ))}
              
              {bookingRequests.length === 0 && bookings.length === 0 && (
                <tr>
                  <td colSpan={5} className="text-center py-10 text-slate-500">No booking data found.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Details Modal */}
      {selectedDetails && <DetailsModal data={selectedDetails} onClose={() => setSelectedDetails(null)} />}
      
      {/* Action Messages */}
      {actionError && <div className="fixed top-4 right-4 bg-red-500 text-white px-4 py-2 rounded shadow z-50">{actionError}</div>}
      {actionSuccess && <div className="fixed top-4 right-4 bg-green-500 text-white px-4 py-2 rounded shadow z-50">{actionSuccess}</div>}
    </div>
  );
};

function DetailsModal({ data, onClose }: { data: BookingRequest | Booking, onClose: () => void }) {
  const isBookingRequest = 'requestedStartTime' in data;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50">
      <div className="bg-white p-6 rounded shadow-xl w-full max-w-2xl max-h-[80vh] overflow-y-auto">
        <h3 className="text-lg font-bold mb-4">{isBookingRequest ? 'Booking Request Details' : 'Booking Details'}</h3>
        <div className="space-y-3 text-sm">
          {isBookingRequest ? (
            <>
              <div><b>Client:</b> {data.clientName} ({data.clientEmail})</div>
              {data.clientPhone && <div><b>Phone:</b> {data.clientPhone}</div>}
              <div><b>Start:</b> {format((data as BookingRequest).requestedStartTime, 'PPP p')}</div>
              <div><b>End:</b> {format((data as BookingRequest).requestedEndTime, 'PPP p')}</div>
              <div><b>Duration:</b> {(data as BookingRequest).durationHours} hours</div>
              <div><b>Service Type:</b> {data.serviceType}</div>
              <div><b>Status:</b> {(data as BookingRequest).status}</div>
              <div><b>Total Cost:</b> ${(data as BookingRequest).totalCost}</div>
              <div><b>Deposit Amount:</b> ${(data as BookingRequest).depositAmount}</div>
              <div><b>Remaining Balance:</b> ${(data as BookingRequest).remainingBalance}</div>
              <div><b>Payment Authorized:</b> {(data as BookingRequest).paymentAuthorized ? 'Yes' : 'No'}</div>
              {(data as BookingRequest).stripeDepositPaymentIntentId && (
                <div><b>Stripe Payment Intent:</b> 
                  <a href={`https://dashboard.stripe.com/test/payments/${(data as BookingRequest).stripeDepositPaymentIntentId}`} 
                     target="_blank" rel="noopener noreferrer" className="underline ml-1">
                    {(data as BookingRequest).stripeDepositPaymentIntentId}
                  </a>
                </div>
              )}
              {(data as BookingRequest).clientNotes && <div><b>Client Notes:</b> {(data as BookingRequest).clientNotes}</div>}
              <div><b>Service Details:</b> 
                <pre className="bg-slate-100 p-2 rounded mt-1 overflow-x-auto text-xs">
                  {JSON.stringify((data as BookingRequest).serviceDetailsInput, null, 2)}
                </pre>
              </div>
            </>
          ) : (
            <>
              <div><b>Client:</b> {data.clientName} ({data.clientEmail})</div>
              {data.clientPhone && <div><b>Phone:</b> {data.clientPhone}</div>}
              <div><b>Start:</b> {format((data as Booking).startTime, 'PPP p')}</div>
              <div><b>End:</b> {format((data as Booking).endTime, 'PPP p')}</div>
              <div><b>Duration:</b> {(data as Booking).durationHours} hours</div>
              <div><b>Service Type:</b> {data.serviceType}</div>
              <div><b>Status:</b> {(data as Booking).bookingStatus}</div>
              <div><b>Total Cost:</b> ${(data as Booking).totalCost}</div>
              <div><b>Deposit Paid:</b> ${(data as Booking).depositAmountPaid}</div>
              <div><b>Remaining Balance:</b> ${(data as Booking).remainingBalance}</div>
              {(data as Booking).stripeDepositPaymentIntentId && (
                <div><b>Deposit Payment Intent:</b> 
                  <a href={`https://dashboard.stripe.com/test/payments/${(data as Booking).stripeDepositPaymentIntentId}`} 
                     target="_blank" rel="noopener noreferrer" className="underline ml-1">
                    {(data as Booking).stripeDepositPaymentIntentId}
                  </a>
                </div>
              )}
              {(data as Booking).stripeFinalChargeId && (
                <div><b>Final Payment Intent:</b> 
                  <a href={`https://dashboard.stripe.com/test/payments/${(data as Booking).stripeFinalChargeId}`} 
                     target="_blank" rel="noopener noreferrer" className="underline ml-1">
                    {(data as Booking).stripeFinalChargeId}
                  </a>
                </div>
              )}
              <div><b>Service Details:</b> 
                <pre className="bg-slate-100 p-2 rounded mt-1 overflow-x-auto text-xs">
                  {JSON.stringify((data as Booking).serviceDetailsInput, null, 2)}
                </pre>
              </div>
              {(data as Booking).additionalServiceDetails && (
                <div><b>Additional Services:</b> 
                  <pre className="bg-slate-100 p-2 rounded mt-1 overflow-x-auto text-xs">
                    {JSON.stringify((data as Booking).additionalServiceDetails, null, 2)}
                  </pre>
                </div>
              )}
            </>
          )}
          <div><b>Created:</b> {format(data.createdAt, 'PPP p')}</div>
          <div><b>Updated:</b> {format(data.updatedAt, 'PPP p')}</div>
        </div>
        <div className="flex justify-end space-x-2 mt-6">
          <button onClick={onClose} className="px-4 py-2 rounded bg-gray-200 hover:bg-gray-300">Close</button>
        </div>
      </div>
    </div>
  );
}

export default AdminDashboard;