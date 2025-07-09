'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import { db as firestore } from '@/lib/firebase';
import { collection, onSnapshot, query, orderBy, doc, updateDoc, Timestamp, getDoc, getDocs, addDoc, deleteDoc } from 'firebase/firestore';
import { format } from 'date-fns';
import { httpsCallable } from 'firebase/functions';
import { functions as firebaseFunctions } from '@/lib/firebase';

interface Booking {
  id: string;
  userId: string;
  studioId: string;
  engineerId: string;
  producerName: string;
  start: Date;
  end: Date;
  selectedServices: string[];
  notes: string;
  status: 'pending_approval' | 'pending_payment' | 'pending_confirmation' | 'confirmed' | 'rejected' | 'completed' | 'refunded';
  createdAt: Date;
  // User details are now explicitly part of the interface
  userName: string;
  userEmail: string;
  serviceName?: string;
  totalPrice?: number;
  depositAmount?: number;
  depositPaid?: boolean;
  paymentIntentId?: string;
  depositCaptured?: boolean;
  depositCapturedAt?: Date;
  finalPaymentIntentId?: string;
  finalPaymentCaptured?: boolean;
  finalPaymentCapturedAt?: Date;
  refundId?: string;
  refundStatus?: string;
  paymentHistory?: any[];
}



const AdminDashboard = () => {
  const { user, isAdmin, loading } = useAuth();
  const router = useRouter();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [isLoadingBookings, setIsLoadingBookings] = useState(true);
  const [isUpdating, setIsUpdating] = useState<string | null>(null); // To track which booking is being updated
  const [selectedBookingDetails, setSelectedBookingDetails] = useState<Booking | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && !isAdmin) {
      router.push('/');
    }
  }, [user, isAdmin, loading, router]);

  useEffect(() => {
    if (!isAdmin) return;

    const bookingsCol = collection(firestore, 'bookings');
    const q = query(bookingsCol, orderBy('startTime', 'desc'));

    const unsubscribe = onSnapshot(q, async (snapshot) => {
      const bookingsPromises = snapshot.docs.map(async (bookingDoc) => {
        const data = bookingDoc.data();
        
        let userName = 'Unknown User';
        let userEmail = 'N/A';

        // Use customer data from booking document directly
        if (data.customerName) {
          userName = data.customerName;
        }
        if (data.customerEmail) {
          userEmail = data.customerEmail;
        }
        
        return {
          id: bookingDoc.id,
          ...data,
          start: (data.startTime as Timestamp).toDate(),
          end: (data.endTime as Timestamp).toDate(),
          createdAt: (data.createdAt as Timestamp).toDate(),
          userName,
          userEmail,
        } as Booking;
      });

      const fetchedBookings = await Promise.all(bookingsPromises);
      setBookings(fetchedBookings);
      setIsLoadingBookings(false);
    });

    return () => unsubscribe();
  }, [isAdmin]);

  const handleUpdateStatus = async (bookingId: string, status: Booking['status']) => {
    console.log('--- handleUpdateStatus Initiated ---');
    console.log('Auth loading state:', loading);
    console.log('Is user admin on client?', isAdmin);
    console.log('User UID on client:', user?.uid);

    if (!isAdmin) {
      alert('Client-side check failed: You are not recognized as an admin.');
      console.log('Update blocked by client-side !isAdmin check.');
      return;
    }
    if (isUpdating) {
      console.log('Update blocked: another update is already in progress.');
      return;
    }
    
    setIsUpdating(bookingId);

    const bookingRef = doc(firestore, 'bookings', bookingId);
    try {
      // Get the booking to check if it has a payment requirement
      const bookingSnap = await getDoc(bookingRef);
      const bookingData = bookingSnap.data();

      // Update Firestore status
      const updates: any = { 
        status,
        updatedAt: new Date()
      };
      
      if (status === 'confirmed') {
        updates.confirmedAt = new Date();
        
        // If this is a paid booking, mark deposit as captured
        if (bookingData?.totalPrice > 0) {
          updates.depositCaptured = true;
          updates.depositCapturedAt = new Date();
          console.log('Marking deposit as captured for confirmed booking');
        }
      } else if (status === 'rejected') {
        updates.rejectedAt = new Date();
      }
      
      await updateDoc(bookingRef, updates);
      console.log('Booking status updated successfully in Firestore.');
    } catch (error) {
      console.error('Firestore Error: ', error);
      alert('Failed to update booking status. See console for details.');
    } finally {
      setIsUpdating(null);
    }
  };

  const handleRefund = async (booking: Booking) => {
    if (!window.confirm('Are you sure you want to refund this deposit?')) return;
    setActionLoading(true);
    setActionError(null);
    setActionSuccess(null);
    try {
      const refundDeposit = httpsCallable(firebaseFunctions, 'refundDeposit');
      const result: any = await refundDeposit({ bookingId: booking.id });
      if (!result.data.success) throw new Error('Refund failed');
      setActionSuccess('Refund successful!');
    } catch (e: any) {
      setActionError(e.message || 'Refund failed');
    } finally {
      setActionLoading(false);
    }
  };

  const handleFinalPayment = async (booking: Booking) => {
    const finalAmount = prompt(`Enter final amount for this session (original: $${booking.totalPrice}):`, booking.totalPrice?.toString() || '0');
    if (!finalAmount) return;
    
    const finalAmountNum = parseFloat(finalAmount);
    if (isNaN(finalAmountNum) || finalAmountNum < 0) {
      alert('Please enter a valid amount');
      return;
    }

    const depositPaid = booking.depositAmount || 0;
    const remainingBalance = Math.max(finalAmountNum - depositPaid, 0);
    
    if (!window.confirm(`Final amount: $${finalAmountNum}\nDeposit paid: $${depositPaid}\nRemaining balance: $${remainingBalance}\n\nProceed with session completion?`)) return;
    
    setActionLoading(true);
    setActionError(null);
    setActionSuccess(null);
    
    try {
      const bookingRef = doc(firestore, 'bookings', booking.id);
      const updates: any = {
        status: 'completed',
        completedAt: new Date(),
        finalAmount: finalAmountNum,
        updatedAt: new Date()
      };

      // If there's a remaining balance, create a checkout session for final payment
      if (remainingBalance > 0) {
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
              description: `Final payment for session - remaining balance`
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
        
        setActionSuccess(`Session completed! Final payment of $${remainingBalance} will be charged to customer.`);
      } else {
        updates.finalPaid = true;
        setActionSuccess('Session completed successfully! No additional payment required.');
      }

      await updateDoc(bookingRef, updates);
    } catch (e: any) {
      console.error('Final payment error:', e);
      setActionError(e.message || 'Failed to complete session');
    } finally {
      setActionLoading(false);
    }
  };

  if (loading || isLoadingBookings) {
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

  // Sort bookings by priority: pending items first, then confirmed/completed, then rejected
  const sortedBookings = [
    ...bookings.filter(b => b.status === 'pending_approval'),
    ...bookings.filter(b => b.status === 'pending_payment'),
    ...bookings.filter(b => b.status === 'pending_confirmation'),
    ...bookings.filter(b => b.status === 'confirmed'),
    ...bookings.filter(b => b.status === 'completed'),
    ...bookings.filter(b => b.status === 'rejected'),
    ...bookings.filter(b => b.status === 'refunded'),
  ];

  return (
    <div className="p-4 md:p-8 space-y-6">
      <h1 className="text-3xl md:text-4xl font-logo text-accent-green">Admin Dashboard</h1>
      <div className="bg-white/80 backdrop-blur-sm p-4 rounded-lg shadow-md">
        <h2 className="text-2xl font-logo text-accent-blue mb-4">All Bookings</h2>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Date & Time</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Client</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Producer</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Status</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-slate-200">
              {/* Grouped by status with headers */}
              {['pending_approval', 'pending_payment', 'pending_confirmation', 'confirmed', 'completed', 'rejected', 'refunded'].map(status => (
                <React.Fragment key={status}>
                  {sortedBookings.filter(b => b.status === status).length > 0 && (
                    <tr>
                      <td colSpan={5} className={`py-2 px-6 text-left font-bold text-lg ${
                        status === 'pending_approval' ? 'text-red-700' : 
                        status === 'pending_payment' ? 'text-orange-700' : 
                        status === 'pending_confirmation' ? 'text-blue-700' : 
                        status === 'confirmed' ? 'text-green-700' : 
                        status === 'completed' ? 'text-purple-700' : 
                        status === 'rejected' ? 'text-red-700' : 'text-gray-700'
                      } bg-slate-50`}>
                        {status === 'pending_approval' ? 'Pending Approval' :
                         status === 'pending_payment' ? 'Pending Payment' :
                         status === 'pending_confirmation' ? 'Pending Confirmation' :
                         status.charAt(0).toUpperCase() + status.slice(1)} Bookings
                      </td>
                    </tr>
                  )}
                  {sortedBookings.filter(b => b.status === status).map((booking) => (
                    <tr key={booking.id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-800">
                        <div>{format(booking.start, 'PPP')}</div>
                        <div className="text-slate-500">{format(booking.start, 'p')} - {format(booking.end, 'p')}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-800">
                        <div>{booking.userName}</div>
                        <div className="text-xs text-slate-500">{booking.userEmail}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">{booking.producerName || 'Jay Valleo'}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          booking.status === 'pending_approval' ? 'bg-red-100 text-red-800' :
                          booking.status === 'pending_payment' ? 'bg-orange-100 text-orange-800' :
                          booking.status === 'pending_confirmation' ? 'bg-blue-100 text-blue-800' :
                          booking.status === 'confirmed' ? 'bg-green-100 text-green-800' :
                          booking.status === 'rejected' ? 'bg-red-100 text-red-800' :
                          booking.status === 'completed' ? 'bg-purple-100 text-purple-800' :
                          booking.status === 'refunded' ? 'bg-gray-100 text-gray-800' :
                          'bg-slate-100 text-slate-800'
                        }`}>
                          {booking.status === 'pending_approval' ? 'Needs Approval' :
                           booking.status === 'pending_payment' ? 'Payment Pending' :
                           booking.status === 'pending_confirmation' ? 'Needs Confirmation' :
                           booking.status}
                        </span>
                        {booking.paymentIntentId && (
                          <div className="text-xs text-slate-500 mt-1">PI: <a href={`https://dashboard.stripe.com/test/payments/${booking.paymentIntentId}`} target="_blank" rel="noopener noreferrer" className="underline">{booking.paymentIntentId}</a></div>
                        )}
                        {booking.depositCaptured && <div className="text-xs text-green-700">Deposit Captured</div>}
                        {booking.refundStatus && <div className="text-xs text-gray-700">Refund: {booking.refundStatus}</div>}
                        {booking.finalPaymentCaptured && <div className="text-xs text-blue-700">Final Paid</div>}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex flex-col gap-2">
                          <button 
                            onClick={() => setSelectedBookingDetails(booking)} 
                            className="text-blue-600 hover:text-blue-800 underline text-left"
                          >
                            View Details
                          </button>
                          
                          {booking.status === 'pending_approval' && (
                            <div className="flex gap-2">
                              <button
                                onClick={() => handleUpdateStatus(booking.id, 'confirmed')}
                                disabled={isUpdating === booking.id}
                                className="px-3 py-1 text-xs font-medium rounded bg-green-600 text-white hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed min-w-[60px]">
                                {isUpdating === booking.id ? '...' : 'Approve'}
                              </button>
                              <button
                                onClick={() => handleUpdateStatus(booking.id, 'rejected')}
                                disabled={isUpdating === booking.id}
                                className="px-3 py-1 text-xs font-medium rounded bg-red-600 text-white hover:bg-red-700 disabled:bg-gray-300 disabled:cursor-not-allowed min-w-[60px]">
                                {isUpdating === booking.id ? '...' : 'Reject'}
                              </button>
                            </div>
                          )}
                          
                          {(booking.status === 'pending_confirmation' || booking.status === 'pending_payment') && (
                            <div className="flex gap-2">
                              <button
                                onClick={() => handleUpdateStatus(booking.id, 'confirmed')}
                                disabled={isUpdating === booking.id}
                                className="px-3 py-1 text-xs font-medium rounded bg-green-600 text-white hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed min-w-[60px]">
                                {isUpdating === booking.id ? '...' : (booking.status === 'pending_payment' ? 'Mark Paid & Confirm' : 'Confirm')}
                              </button>
                              <button
                                onClick={() => handleUpdateStatus(booking.id, 'rejected')}
                                disabled={isUpdating === booking.id}
                                className="px-3 py-1 text-xs font-medium rounded bg-red-600 text-white hover:bg-red-700 disabled:bg-gray-300 disabled:cursor-not-allowed min-w-[60px]">
                                {isUpdating === booking.id ? '...' : 'Reject'}
                              </button>
                            </div>
                          )}
                          
                          {booking.status === 'confirmed' && (
                            <div className="flex gap-2">
                              <button
                                onClick={() => handleFinalPayment(booking)}
                                disabled={actionLoading}
                                className="px-3 py-1 text-xs font-medium rounded bg-blue-600 text-white hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed min-w-[80px]">
                                Complete
                              </button>
                              <button
                                onClick={() => handleRefund(booking)}
                                disabled={actionLoading}
                                className="px-3 py-1 text-xs font-medium rounded bg-gray-600 text-white hover:bg-gray-700 disabled:bg-gray-300 disabled:cursor-not-allowed min-w-[60px]">
                                Refund
                              </button>
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </React.Fragment>
              ))}
              {bookings.length === 0 && (
                <tr>
                  <td colSpan={5} className="text-center py-10 text-slate-500">No bookings found.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
      {selectedBookingDetails && <BookingDetailsModal booking={selectedBookingDetails} onClose={() => setSelectedBookingDetails(null)} />}
      {actionError && <div className="fixed top-4 right-4 bg-red-500 text-white px-4 py-2 rounded shadow z-50">{actionError}</div>}
      {actionSuccess && <div className="fixed top-4 right-4 bg-green-500 text-white px-4 py-2 rounded shadow z-50">{actionSuccess}</div>}
    </div>
  );
};

function BookingDetailsModal({ booking, onClose }: { booking: Booking, onClose: () => void }) {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50">
      <div className="bg-white p-6 rounded shadow-xl w-full max-w-lg">
        <h3 className="text-lg font-bold mb-2">Booking Details</h3>
        <div className="space-y-2 text-sm">
          <div><b>Client:</b> {booking.userName} ({booking.userEmail})</div>
          <div><b>Producer:</b> {booking.producerName}</div>
          <div><b>Start:</b> {format(booking.start, 'PPP p')}</div>
          <div><b>End:</b> {format(booking.end, 'PPP p')}</div>
          <div><b>Status:</b> {booking.status}</div>
          <div><b>Stripe PaymentIntent:</b> {booking.paymentIntentId ? <a href={`https://dashboard.stripe.com/test/payments/${booking.paymentIntentId}`} target="_blank" rel="noopener noreferrer" className="underline">{booking.paymentIntentId}</a> : 'N/A'}</div>
          <div><b>Deposit Captured:</b> {booking.depositCaptured ? 'Yes' : 'No'}</div>
          <div><b>Final Payment Captured:</b> {booking.finalPaymentCaptured ? 'Yes' : 'No'}</div>
          <div><b>Refund Status:</b> {booking.refundStatus || 'N/A'}</div>
          <div><b>Notes:</b> {booking.notes}</div>
          <div><b>Payment History:</b> <pre className="bg-slate-100 p-2 rounded overflow-x-auto">{JSON.stringify(booking.paymentHistory, null, 2)}</pre></div>
        </div>
        <div className="flex justify-end space-x-2 mt-4">
          <button onClick={onClose} className="px-4 py-2 rounded bg-gray-200">Close</button>
        </div>
      </div>
    </div>
  );
}

export default AdminDashboard; 