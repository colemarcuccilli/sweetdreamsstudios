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
  status: 'pending' | 'confirmed' | 'rejected' | 'completed' | 'refunded';
  createdAt: Date;
  // User details are now explicitly part of the interface
  userName: string;
  userEmail: string;
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

const SERVICE_CATEGORIES = ['audio', 'video', 'branding'];

function ServicesSection() {
  const [services, setServices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingService, setEditingService] = useState<any | null>(null);
  const [filter, setFilter] = useState<string>('all');

  useEffect(() => {
    const fetchServices = async () => {
      setLoading(true);
      try {
        const snap = await getDocs(collection(firestore, 'services'));
        setServices(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      } catch (e: any) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    };
    fetchServices();
  }, []);

  const handleAddOrEdit = async (service: any) => {
    setError(null);
    try {
      if (service.id) {
        await updateDoc(doc(firestore, 'services', service.id), service);
      } else {
        await addDoc(collection(firestore, 'services'), service);
      }
      setEditingService(null);
      // Refresh
      const snap = await getDocs(collection(firestore, 'services'));
      setServices(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    } catch (e: any) {
      setError(e.message);
    }
  };

  const handleDelete = async (id: string) => {
    setError(null);
    try {
      await deleteDoc(doc(firestore, 'services', id));
      setServices(services.filter(s => s.id !== id));
    } catch (e: any) {
      setError(e.message);
    }
  };

  const filteredServices = filter === 'all' ? services : services.filter(s => s.category === filter);

  return (
    <div className="mt-10">
      <h2 className="text-2xl font-logo text-accent-blue mb-4">Services</h2>
      <div className="flex space-x-2 mb-2">
        <button onClick={() => setFilter('all')} className={`px-3 py-1 rounded ${filter==='all'?'bg-accent-green text-white':'bg-slate-200'}`}>All</button>
        {SERVICE_CATEGORIES.map(cat => (
          <button key={cat} onClick={() => setFilter(cat)} className={`px-3 py-1 rounded ${filter===cat?'bg-accent-green text-white':'bg-slate-200'}`}>{cat.charAt(0).toUpperCase()+cat.slice(1)}</button>
        ))}
        <button onClick={() => setEditingService({})} className="ml-auto px-3 py-1 bg-accent-blue text-white rounded">Add Service</button>
      </div>
      {loading ? <div>Loading...</div> : error ? <div className="text-red-500">{error}</div> : (
        <table className="min-w-full divide-y divide-slate-200">
          <thead className="bg-slate-50">
            <tr>
              <th>Name</th><th>Category</th><th>Duration</th><th>Price</th><th>Free?</th><th>Active</th><th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredServices.map(service => (
              <tr key={service.id}>
                <td>{service.name}</td>
                <td>{service.category}</td>
                <td>{service.duration}</td>
                <td>{service.isFree ? 'Free' : `$${service.price}`}</td>
                <td>{service.isFree ? 'Yes' : 'No'}</td>
                <td>{service.active ? 'Yes' : 'No'}</td>
                <td>
                  <button onClick={() => setEditingService(service)} className="text-blue-600">Edit</button>
                  <button onClick={() => handleDelete(service.id)} className="text-red-600 ml-2">Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      {editingService && (
        <ServiceEditModal service={editingService} onSave={handleAddOrEdit} onClose={() => setEditingService(null)} />
      )}
    </div>
  );
}

function ServiceEditModal({ service, onSave, onClose }: { service: any, onSave: (s: any) => void, onClose: () => void }) {
  const [form, setForm] = useState<any>({ ...service });
  return (
    <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50">
      <div className="bg-white p-6 rounded shadow-xl w-full max-w-md">
        <h3 className="text-lg font-bold mb-2">{form.id ? 'Edit' : 'Add'} Service</h3>
        <div className="space-y-2">
          <input className="w-full p-2 border rounded" placeholder="Name" value={form.name||''} onChange={e => setForm((f: any) => ({ ...f, name: e.target.value }))} />
          <select className="w-full p-2 border rounded" value={form.category||''} onChange={e => setForm((f: any) => ({ ...f, category: e.target.value }))} >
            <option value="">Select Category</option>
            {SERVICE_CATEGORIES.map(cat=>(<option key={cat} value={cat}>{cat.charAt(0).toUpperCase()+cat.slice(1)}</option>))}
          </select>
          <input className="w-full p-2 border rounded" placeholder="Duration (min)" type="number" value={form.duration||''} onChange={e => setForm((f: any) => ({ ...f, duration: Number(e.target.value) }))} />
          <input className="w-full p-2 border rounded" placeholder="Price" type="number" value={form.price||''} onChange={e => setForm((f: any) => ({ ...f, price: Number(e.target.value) }))} disabled={form.isFree} />
          <label className="flex items-center space-x-2"><input type="checkbox" checked={form.isFree||false} onChange={e => setForm((f: any) => ({ ...f, isFree: e.target.checked }))}/> <span>Free</span></label>
          <label className="flex items-center space-x-2"><input type="checkbox" checked={form.active||false} onChange={e => setForm((f: any) => ({ ...f, active: e.target.checked }))}/> <span>Active</span></label>
          <textarea className="w-full p-2 border rounded" placeholder="Description" value={form.description||''} onChange={e => setForm((f: any) => ({ ...f, description: e.target.value }))} />
        </div>
        <div className="flex justify-end space-x-2 mt-4">
          <button onClick={onClose} className="px-4 py-2 rounded bg-gray-200">Cancel</button>
          <button onClick={()=>onSave(form)} className="px-4 py-2 rounded bg-accent-green text-white">Save</button>
        </div>
      </div>
    </div>
  );
}

function SessionPricingSection() {
  const [rules, setRules] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingRule, setEditingRule] = useState<any | null>(null);

  useEffect(() => {
    const fetchRules = async () => {
      setLoading(true);
      try {
        const snap = await getDocs(collection(firestore, 'pricingRules'));
        setRules(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      } catch (e: any) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    };
    fetchRules();
  }, []);

  const handleAddOrEdit = async (rule: any) => {
    setError(null);
    try {
      if (rule.id) {
        await updateDoc(doc(firestore, 'pricingRules', rule.id), rule);
      } else {
        await addDoc(collection(firestore, 'pricingRules'), rule);
      }
      setEditingRule(null);
      // Refresh
      const snap = await getDocs(collection(firestore, 'pricingRules'));
      setRules(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    } catch (e: any) {
      setError(e.message);
    }
  };

  const handleDelete = async (id: string) => {
    setError(null);
    try {
      await deleteDoc(doc(firestore, 'pricingRules', id));
      setRules(rules.filter(r => r.id !== id));
    } catch (e: any) {
      setError(e.message);
    }
  };

  return (
    <div className="mt-10">
      <h2 className="text-2xl font-logo text-accent-blue mb-4">Session Pricing</h2>
      <button onClick={() => setEditingRule({})} className="mb-2 px-3 py-1 bg-accent-blue text-white rounded">Add Pricing Rule</button>
      {loading ? <div>Loading...</div> : error ? <div className="text-red-500">{error}</div> : (
        <table className="min-w-full divide-y divide-slate-200">
          <thead className="bg-slate-50">
            <tr>
              <th>Hours</th><th>Price</th><th>Deposit Required</th><th>Active</th><th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {rules.map(rule => (
              <tr key={rule.id}>
                <td>{rule.hours}</td>
                <td>${rule.price}</td>
                <td>{rule.depositRequired ? 'Yes' : 'No'}</td>
                <td>{rule.active ? 'Yes' : 'No'}</td>
                <td>
                  <button onClick={() => setEditingRule(rule)} className="text-blue-600">Edit</button>
                  <button onClick={() => handleDelete(rule.id)} className="text-red-600 ml-2">Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      {editingRule && (
        <SessionPricingEditModal rule={editingRule} onSave={handleAddOrEdit} onClose={() => setEditingRule(null)} />
      )}
    </div>
  );
}

function SessionPricingEditModal({ rule, onSave, onClose }: { rule: any, onSave: (r: any) => void, onClose: () => void }) {
  const [form, setForm] = useState<any>({ ...rule });
  return (
    <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50">
      <div className="bg-white p-6 rounded shadow-xl w-full max-w-md">
        <h3 className="text-lg font-bold mb-2">{form.id ? 'Edit' : 'Add'} Pricing Rule</h3>
        <div className="space-y-2">
          <input className="w-full p-2 border rounded" placeholder="Hours" type="number" value={form.hours||''} onChange={e => setForm((f: any) => ({ ...f, hours: Number(e.target.value) }))} />
          <input className="w-full p-2 border rounded" placeholder="Price" type="number" value={form.price||''} onChange={e => setForm((f: any) => ({ ...f, price: Number(e.target.value) }))} />
          <label className="flex items-center space-x-2"><input type="checkbox" checked={form.depositRequired||false} onChange={e => setForm((f: any) => ({ ...f, depositRequired: e.target.checked }))}/> <span>Deposit Required</span></label>
          <label className="flex items-center space-x-2"><input type="checkbox" checked={form.active||false} onChange={e => setForm((f: any) => ({ ...f, active: e.target.checked }))}/> <span>Active</span></label>
        </div>
        <div className="flex justify-end space-x-2 mt-4">
          <button onClick={onClose} className="px-4 py-2 rounded bg-gray-200">Cancel</button>
          <button onClick={()=>onSave(form)} className="px-4 py-2 rounded bg-accent-green text-white">Save</button>
        </div>
      </div>
    </div>
  );
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
    const q = query(bookingsCol, orderBy('start', 'desc'));

    const unsubscribe = onSnapshot(q, async (snapshot) => {
      const bookingsPromises = snapshot.docs.map(async (bookingDoc) => {
        const data = bookingDoc.data();
        
        let userName = 'Unknown User';
        let userEmail = 'N/A';

        // Fetch user data for each booking
        if (data.userId) {
          const userRef = doc(firestore, 'users', data.userId);
          const userSnap = await getDoc(userRef);
          if (userSnap.exists()) {
            userName = userSnap.data().displayName || 'No Display Name';
            userEmail = userSnap.data().email || 'No Email';
          }
        }
        
        return {
          id: bookingDoc.id,
          ...data,
          start: (data.start as Timestamp).toDate(),
          end: (data.end as Timestamp).toDate(),
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
      if (status === 'confirmed') {
        // Call captureDeposit Cloud Function
        const captureDeposit = httpsCallable(firebaseFunctions, 'captureDeposit');
        try {
          const result: any = await captureDeposit({ bookingId });
          if (!result.data.success) {
            throw new Error('Stripe capture failed');
          }
        } catch (stripeError: any) {
          alert('Failed to capture deposit: ' + (stripeError.message || 'Unknown error'));
          setIsUpdating(null);
          return;
        }
      }
      // Update Firestore status
      await updateDoc(bookingRef, { status });
      console.log('Booking status updated successfully in Firestore.');
    } catch (error) {
      console.error('Firestore or Stripe Error: ', error);
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
    if (!window.confirm('Mark as completed and charge final payment?')) return;
    setActionLoading(true);
    setActionError(null);
    setActionSuccess(null);
    try {
      const chargeFinalPayment = httpsCallable(firebaseFunctions, 'chargeFinalPayment');
      const result: any = await chargeFinalPayment({ bookingId: booking.id });
      if (!result.data.success) throw new Error('Final payment failed');
      setActionSuccess('Final payment successful!');
    } catch (e: any) {
      setActionError(e.message || 'Final payment failed');
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

  // Sort bookings by status: confirmed, rejected, pending
  const sortedBookings = [
    ...bookings.filter(b => b.status === 'confirmed'),
    ...bookings.filter(b => b.status === 'rejected'),
    ...bookings.filter(b => b.status === 'pending'),
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
              {['confirmed', 'rejected', 'pending'].map(status => (
                <React.Fragment key={status}>
                  {sortedBookings.filter(b => b.status === status).length > 0 && (
                    <tr>
                      <td colSpan={5} className={`py-2 px-6 text-left font-bold text-lg ${
                        status === 'confirmed' ? 'text-green-700' : status === 'rejected' ? 'text-red-700' : 'text-yellow-700'
                      } bg-slate-50`}>{status.charAt(0).toUpperCase() + status.slice(1)} Bookings</td>
                    </tr>
                  )}
                  {sortedBookings.filter(b => b.status === status).map((booking) => (
<<<<<<< HEAD
                    <tr key={booking.id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-800">
                        <div>{format(booking.start, 'PPP')}</div>
                        <div className="text-slate-500">{format(booking.start, 'p')} - {format(booking.end, 'p')}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-800">
                        <div>{booking.userName}</div>
                        <div className="text-xs text-slate-500">{booking.userEmail}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">{booking.producerName}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          booking.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                          booking.status === 'confirmed' ? 'bg-green-100 text-green-800' :
                          booking.status === 'rejected' ? 'bg-red-100 text-red-800' : 'bg-slate-100 text-slate-800'
                        }`}>
                          {booking.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex items-center justify-start space-x-2">
                          {booking.status === 'pending' && (
                            <>
=======
                <tr key={booking.id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-800">
                    <div>{format(booking.start, 'PPP')}</div>
                    <div className="text-slate-500">{format(booking.start, 'p')} - {format(booking.end, 'p')}</div>
                  </td>
                   <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-800">
                    <div>{booking.userName}</div>
                    <div className="text-xs text-slate-500">{booking.userEmail}</div>
                   </td>
                   <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">{booking.producerName}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        booking.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                        booking.status === 'confirmed' ? 'bg-green-100 text-green-800' :
                          booking.status === 'rejected' ? 'bg-red-100 text-red-800' :
                          booking.status === 'completed' ? 'bg-blue-100 text-blue-800' :
                          booking.status === 'refunded' ? 'bg-gray-100 text-gray-800' :
                          'bg-slate-100 text-slate-800'
                    }`}>
                      {booking.status}
                    </span>
                        {booking.paymentIntentId && (
                          <div className="text-xs text-slate-500 mt-1">PI: <a href={`https://dashboard.stripe.com/test/payments/${booking.paymentIntentId}`} target="_blank" rel="noopener noreferrer" className="underline">{booking.paymentIntentId}</a></div>
                        )}
                        {booking.depositCaptured && <div className="text-xs text-green-700">Deposit Captured</div>}
                        {booking.refundStatus && <div className="text-xs text-gray-700">Refund: {booking.refundStatus}</div>}
                        {booking.finalPaymentCaptured && <div className="text-xs text-blue-700">Final Paid</div>}
                  </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex items-center justify-start space-x-2">
                          <button onClick={() => setSelectedBookingDetails(booking)} className="text-accent-blue underline">Details</button>
                    {booking.status === 'pending' && (
                        <>
>>>>>>> a6a06095f2bc8a4ea34b4a29508a24eebb866704
                              <button
                                onClick={() => handleUpdateStatus(booking.id, 'confirmed')}
                                disabled={isUpdating === booking.id}
                                className="inline-flex items-center justify-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-md shadow-sm text-white bg-accent-green hover:bg-accent-green/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-accent-green disabled:bg-slate-300 disabled:cursor-not-allowed">
                                {isUpdating === booking.id ? '...' : 'Confirm'}
                              </button>
                              <button
                                onClick={() => handleUpdateStatus(booking.id, 'rejected')}
                                disabled={isUpdating === booking.id}
                                className="inline-flex items-center justify-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-md shadow-sm text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-600 disabled:bg-slate-300 disabled:cursor-not-allowed">
                                {isUpdating === booking.id ? '...' : 'Reject'}
                              </button>
<<<<<<< HEAD
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
=======
                        </>
                    )}
                          {booking.status === 'confirmed' && booking.depositCaptured && !booking.refundStatus && (
                            <>
                              <button
                                onClick={() => handleFinalPayment(booking)}
                                disabled={actionLoading}
                                className="inline-flex items-center justify-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-600 disabled:bg-slate-300 disabled:cursor-not-allowed">
                                Charge Final Payment
                              </button>
                              <button
                                onClick={() => handleRefund(booking)}
                                disabled={actionLoading}
                                className="inline-flex items-center justify-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-md shadow-sm text-white bg-gray-600 hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-600 disabled:bg-slate-300 disabled:cursor-not-allowed">
                                Refund
                              </button>
                            </>
                          )}
                        </div>
                  </td>
                </tr>
>>>>>>> a6a06095f2bc8a4ea34b4a29508a24eebb866704
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
      <ServicesSection />
      <SessionPricingSection />
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