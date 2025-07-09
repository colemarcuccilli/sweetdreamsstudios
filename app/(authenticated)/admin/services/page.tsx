'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import { db as firestore } from '@/lib/firebase';
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc } from 'firebase/firestore';

const SERVICE_CATEGORIES = ['audio', 'video', 'branding'];

interface Service {
  id?: string;
  name: string;
  category: string;
  duration: number;
  price: number;
  isFree: boolean;
  active: boolean;
  description: string;
  serviceType?: string;
  icon?: string;
  // Fixed service fields
  isDeposit?: boolean;
  // Hourly session fields
  isHourly?: boolean;
  minDuration?: number;
  maxDuration?: number;
  hourlyPricing?: { hours: number; price: number }[];
  // Per-song fields
  pricePerSong?: number;
  // Production fields
  pricePerHour?: number;
  beatLicenseOptions?: any;
}

export default function AdminServicesPage() {
  const { user, isAdmin, loading } = useAuth();
  const router = useRouter();
  const [services, setServices] = useState<Service[]>([]);
  const [loadingServices, setLoadingServices] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingService, setEditingService] = useState<Service | null>(null);
  const [filter, setFilter] = useState<string>('all');

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
      return;
    }
    if (!loading && !isAdmin) {
      router.push('/profile/edit');
      return;
    }
  }, [user, isAdmin, loading, router]);

  useEffect(() => {
    if (isAdmin) {
      fetchServices();
    }
  }, [isAdmin]);

  const fetchServices = async () => {
    setLoadingServices(true);
    try {
      const snap = await getDocs(collection(firestore, 'services'));
      setServices(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Service)));
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoadingServices(false);
    }
  };

  const handleAddOrEdit = async (service: Service) => {
    setError(null);
    try {
      // Clean the service data - remove undefined values and id
      const { id, ...rawServiceData } = service;
      
      // Create clean service data with only valid fields
      const serviceData = {
        name: rawServiceData.name || '',
        category: rawServiceData.category || '',
        duration: rawServiceData.duration || 15,
        price: rawServiceData.price || 0,
        isFree: rawServiceData.isFree || false,
        active: rawServiceData.active || true,
        description: rawServiceData.description || '',
        // Only add optional fields if they exist
        ...(rawServiceData.serviceType && { serviceType: rawServiceData.serviceType }),
        ...(rawServiceData.icon && { icon: rawServiceData.icon }),
        ...(rawServiceData.isHourly && { isHourly: rawServiceData.isHourly }),
        ...(rawServiceData.minDuration && { minDuration: rawServiceData.minDuration }),
        ...(rawServiceData.maxDuration && { maxDuration: rawServiceData.maxDuration }),
        ...(rawServiceData.hourlyPricing && { hourlyPricing: rawServiceData.hourlyPricing }),
        ...(rawServiceData.pricePerSong && { pricePerSong: rawServiceData.pricePerSong }),
        ...(rawServiceData.pricePerHour && { pricePerHour: rawServiceData.pricePerHour }),
        ...(rawServiceData.beatLicenseOptions && { beatLicenseOptions: rawServiceData.beatLicenseOptions }),
      };

      console.log('Saving service data:', serviceData);
      
      if (id) {
        // Update existing service
        await updateDoc(doc(firestore, 'services', id), serviceData);
      } else {
        // Create new service
        await addDoc(collection(firestore, 'services'), serviceData);
      }
      setEditingService(null);
      await fetchServices(); // Refresh the list
    } catch (e: any) {
      console.error('Error saving service:', e);
      setError(`Failed to save service: ${e.message}`);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this service?')) return;
    
    setError(null);
    try {
      await deleteDoc(doc(firestore, 'services', id));
      setServices(services.filter(s => s.id !== id));
    } catch (e: any) {
      setError(e.message);
    }
  };

  const filteredServices = filter === 'all' ? services : services.filter(s => s.category === filter);

  if (loading || !user) {
    return (
      <div className="flex justify-center items-center h-screen">
        <p className="text-xl font-logo text-foreground">Loading...</p>
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

  return (
    <div className="p-4 md:p-8 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl md:text-4xl font-logo text-accent-green">Service Management</h1>
        <button 
          onClick={() => setEditingService({ name: '', category: '', duration: 15, price: 0, isFree: false, active: true, description: '' })} 
          className="px-4 py-2 bg-accent-blue text-white rounded-lg hover:bg-accent-blue/90 font-medium"
        >
          Add New Service
        </button>
      </div>

      <div className="bg-white/80 backdrop-blur-sm p-6 rounded-lg shadow-md">
        {/* Category Filter */}
        <div className="flex flex-wrap gap-2 mb-6">
          <button 
            onClick={() => setFilter('all')} 
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              filter === 'all' ? 'bg-accent-green text-white' : 'bg-slate-200 text-slate-700 hover:bg-slate-300'
            }`}
          >
            All Services
          </button>
          {SERVICE_CATEGORIES.map(cat => (
            <button 
              key={cat} 
              onClick={() => setFilter(cat)} 
              className={`px-4 py-2 rounded-lg font-medium transition-colors capitalize ${
                filter === cat ? 'bg-accent-green text-white' : 'bg-slate-200 text-slate-700 hover:bg-slate-300'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Error Display */}
        {error && (
          <div className="mb-4 p-4 bg-red-100 border border-red-400 text-red-700 rounded-lg">
            {error}
          </div>
        )}

        {/* Services Table */}
        {loadingServices ? (
          <div className="text-center py-10">
            <p className="text-slate-500">Loading services...</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Name</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Category</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Duration</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Price</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-slate-200">
                {filteredServices.map(service => (
                  <tr key={service.id} className="hover:bg-slate-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-slate-900">{service.name}</div>
                      <div className="text-sm text-slate-500">{service.description}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800 capitalize">
                        {service.category}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900">
                      {service.duration} min
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900">
                      {service.isFree ? (
                        <span className="text-green-600 font-medium">Free</span>
                      ) : (
                        <span className="font-medium">${service.price}</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        service.active 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        {service.active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                      <button 
                        onClick={() => setEditingService(service)} 
                        className="text-accent-blue hover:text-accent-blue/80"
                      >
                        Edit
                      </button>
                      <button 
                        onClick={() => service.id && handleDelete(service.id)} 
                        className="text-red-600 hover:text-red-800"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
                {filteredServices.length === 0 && (
                  <tr>
                    <td colSpan={6} className="text-center py-10 text-slate-500">
                      No services found for the selected category.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Service Edit Modal */}
      {editingService && (
        <ServiceEditModal 
          service={editingService} 
          onSave={handleAddOrEdit} 
          onClose={() => setEditingService(null)} 
        />
      )}
    </div>
  );
}

function ServiceEditModal({ service, onSave, onClose }: { 
  service: Service, 
  onSave: (s: Service) => void, 
  onClose: () => void 
}) {
  const [form, setForm] = useState<Service>({ ...service });
  const [serviceType, setServiceType] = useState<string>('fixed'); // fixed, hourly, per-song, production

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.category) {
      alert('Please fill in all required fields');
      return;
    }
    onSave(form);
  };

  const updateServiceType = (type: string) => {
    setServiceType(type);
    // Reset relevant fields when changing service type
    setForm(f => ({
      ...f,
      isHourly: type === 'hourly',
      pricePerSong: type === 'per-song' ? (f.pricePerSong || 100) : undefined,
      pricePerHour: type === 'production' ? (f.pricePerHour || 45) : undefined,
      hourlyPricing: type === 'hourly' ? (f.hourlyPricing || [
        { hours: 1, price: 50 },
        { hours: 2, price: 100 },
        { hours: 3, price: 125 },
        { hours: 4, price: 170 },
        { hours: 5, price: 215 },
        { hours: 6, price: 255 }
      ]) : undefined,
      beatLicenseOptions: type === 'production' ? (f.beatLicenseOptions || {
        BASIC_LEASE: { id: 'basic-lease', label: 'Basic Lease', price: 35 },
        FULL_BUY: { id: 'full-buy', label: 'Full Buy', price: 150 },
        EXCLUSIVE: { id: 'exclusive', label: 'Exclusive Rights', price: 150, includesRevisions: true }
      }) : undefined
    }));
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <form onSubmit={handleSubmit} className="p-6">
          <h3 className="text-lg font-logo font-bold mb-4 text-accent-blue">
            {form.id ? 'Edit Service' : 'Add New Service'}
          </h3>
          
          <div className="space-y-6">
            {/* Basic Info */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Service Name *</label>
                <input 
                  type="text"
                  className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-accent-blue focus:border-transparent" 
                  placeholder="e.g., Video Consultation" 
                  value={form.name} 
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))} 
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Category *</label>
                <select 
                  className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-accent-blue focus:border-transparent" 
                  value={form.category} 
                  onChange={e => setForm(f => ({ ...f, category: e.target.value }))} 
                  required
                >
                  <option value="">Select Category</option>
                  {SERVICE_CATEGORIES.map(cat => (
                    <option key={cat} value={cat} className="capitalize">{cat}</option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Icon (Emoji)</label>
              <input 
                type="text"
                className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-accent-blue focus:border-transparent" 
                placeholder="🎵" 
                value={form.icon || ''} 
                onChange={e => setForm(f => ({ ...f, icon: e.target.value }))} 
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
              <textarea 
                className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-accent-blue focus:border-transparent" 
                placeholder="Brief description of the service..." 
                value={form.description} 
                onChange={e => setForm(f => ({ ...f, description: e.target.value }))} 
                rows={3}
              />
            </div>

            {/* Service Type Selection */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Service Type *</label>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                {[
                  { value: 'fixed', label: 'Fixed Duration & Price' },
                  { value: 'hourly', label: 'Hourly Tiers' },
                  { value: 'per-song', label: 'Per Song' },
                  { value: 'production', label: 'Production (hourly + licensing)' }
                ].map(type => (
                  <button
                    key={type.value}
                    type="button"
                    onClick={() => updateServiceType(type.value)}
                    className={`p-2 text-sm rounded border ${
                      serviceType === type.value 
                        ? 'bg-accent-blue text-white border-accent-blue' 
                        : 'bg-white text-slate-700 border-slate-300 hover:border-slate-400'
                    }`}
                  >
                    {type.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Fixed Duration & Price */}
            {serviceType === 'fixed' && (
              <div className="bg-slate-50 p-4 rounded-lg">
                <h4 className="font-medium mb-3">Fixed Service Settings</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Duration (minutes)</label>
                    <input 
                      type="number"
                      className="w-full p-2 border border-slate-300 rounded focus:ring-2 focus:ring-accent-blue focus:border-transparent" 
                      placeholder="15" 
                      value={form.duration} 
                      onChange={e => setForm(f => ({ ...f, duration: Number(e.target.value) }))} 
                      min="1"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Price ($)</label>
                    <input 
                      type="number"
                      className="w-full p-2 border border-slate-300 rounded focus:ring-2 focus:ring-accent-blue focus:border-transparent" 
                      placeholder="0" 
                      value={form.price} 
                      onChange={e => setForm(f => ({ ...f, price: Number(e.target.value) }))} 
                      disabled={form.isFree}
                      min="0"
                      step="0.01"
                    />
                  </div>

                  <div className="flex flex-col justify-end">
                    <label className="flex items-center space-x-2">
                      <input 
                        type="checkbox" 
                        checked={form.isFree || false} 
                        onChange={e => setForm(f => ({ ...f, isFree: e.target.checked, price: e.target.checked ? 0 : f.price }))}
                        className="h-4 w-4 text-accent-blue focus:ring-accent-blue border-slate-300 rounded"
                      />
                      <span className="text-sm font-medium text-slate-700">Free Service</span>
                    </label>
                  </div>
                </div>

                <div className="mt-3">
                  <label className="flex items-center space-x-2">
                    <input 
                      type="checkbox" 
                      checked={form.isDeposit || false} 
                      onChange={e => setForm(f => ({ ...f, isDeposit: e.target.checked }))}
                      className="h-4 w-4 text-accent-blue focus:ring-accent-blue border-slate-300 rounded"
                    />
                    <span className="text-sm font-medium text-slate-700">Price is a deposit (remainder charged later)</span>
                  </label>
                </div>
              </div>
            )}

            {/* Hourly Tiers */}
            {serviceType === 'hourly' && (
              <div className="bg-slate-50 p-4 rounded-lg">
                <h4 className="font-medium mb-3">Hourly Pricing Tiers</h4>
                <div className="space-y-2">
                  {(form.hourlyPricing || []).map((tier, index) => (
                    <div key={index} className="flex items-center space-x-2">
                      <input 
                        type="number"
                        placeholder="Hours"
                        value={tier.hours}
                        onChange={e => {
                          const newTiers = [...(form.hourlyPricing || [])];
                          newTiers[index] = { ...tier, hours: Number(e.target.value) };
                          setForm(f => ({ ...f, hourlyPricing: newTiers }));
                        }}
                        className="w-20 p-2 border border-slate-300 rounded"
                        min="1"
                      />
                      <span>hour(s) = $</span>
                      <input 
                        type="number"
                        placeholder="Price"
                        value={tier.price}
                        onChange={e => {
                          const newTiers = [...(form.hourlyPricing || [])];
                          newTiers[index] = { ...tier, price: Number(e.target.value) };
                          setForm(f => ({ ...f, hourlyPricing: newTiers }));
                        }}
                        className="w-24 p-2 border border-slate-300 rounded"
                        min="0"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          const newTiers = (form.hourlyPricing || []).filter((_, i) => i !== index);
                          setForm(f => ({ ...f, hourlyPricing: newTiers }));
                        }}
                        className="text-red-600 hover:text-red-800"
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={() => {
                      const newTiers = [...(form.hourlyPricing || []), { hours: 1, price: 50 }];
                      setForm(f => ({ ...f, hourlyPricing: newTiers }));
                    }}
                    className="text-accent-blue hover:text-accent-blue/80"
                  >
                    + Add Tier
                  </button>
                </div>
              </div>
            )}

            {/* Per Song */}
            {serviceType === 'per-song' && (
              <div className="bg-slate-50 p-4 rounded-lg">
                <h4 className="font-medium mb-3">Per Song Pricing</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Price per Song ($)</label>
                    <input 
                      type="number"
                      className="w-full p-2 border border-slate-300 rounded focus:ring-2 focus:ring-accent-blue focus:border-transparent" 
                      placeholder="130" 
                      value={form.pricePerSong || 0} 
                      onChange={e => setForm(f => ({ ...f, pricePerSong: Number(e.target.value) }))} 
                      min="0"
                      step="0.01"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Consultation Duration (minutes)</label>
                    <input 
                      type="number"
                      className="w-full p-2 border border-slate-300 rounded focus:ring-2 focus:ring-accent-blue focus:border-transparent" 
                      placeholder="15" 
                      value={form.duration || 15} 
                      onChange={e => setForm(f => ({ ...f, duration: Number(e.target.value) }))} 
                      min="1"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Production */}
            {serviceType === 'production' && (
              <div className="bg-slate-50 p-4 rounded-lg">
                <h4 className="font-medium mb-3">Production Service Settings</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Price per Hour ($)</label>
                    <input 
                      type="number"
                      className="w-full p-2 border border-slate-300 rounded focus:ring-2 focus:ring-accent-blue focus:border-transparent" 
                      placeholder="45" 
                      value={form.pricePerHour || 0} 
                      onChange={e => setForm(f => ({ ...f, pricePerHour: Number(e.target.value) }))} 
                      min="0"
                      step="0.01"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Minimum Duration (minutes)</label>
                    <input 
                      type="number"
                      className="w-full p-2 border border-slate-300 rounded focus:ring-2 focus:ring-accent-blue focus:border-transparent" 
                      placeholder="60" 
                      value={form.minDuration || 60} 
                      onChange={e => setForm(f => ({ ...f, minDuration: Number(e.target.value) }))} 
                      min="1"
                    />
                  </div>
                </div>

                <div>
                  <label className="flex items-center space-x-2 mb-2">
                    <input 
                      type="checkbox" 
                      checked={!!form.beatLicenseOptions} 
                      onChange={e => setForm(f => ({ ...f, beatLicenseOptions: e.target.checked ? {
                        BASIC_LEASE: { id: 'basic-lease', label: 'Basic Lease', price: 35 },
                        FULL_BUY: { id: 'full-buy', label: 'Full Buy', price: 150 },
                        EXCLUSIVE: { id: 'exclusive', label: 'Exclusive Rights', price: 150, includesRevisions: true }
                      } : undefined }))}
                      className="h-4 w-4 text-accent-blue focus:ring-accent-blue border-slate-300 rounded"
                    />
                    <span className="text-sm font-medium text-slate-700">Include Beat Licensing Options</span>
                  </label>
                </div>
              </div>
            )}

            <div className="space-y-3">
              <label className="flex items-center space-x-2">
                <input 
                  type="checkbox" 
                  checked={form.active !== false} 
                  onChange={e => setForm(f => ({ ...f, active: e.target.checked }))}
                  className="h-4 w-4 text-accent-blue focus:ring-accent-blue border-slate-300 rounded"
                />
                <span className="text-sm font-medium text-slate-700">Active (Available for booking)</span>
              </label>
            </div>
          </div>

          <div className="flex justify-end space-x-3 mt-6 pt-4 border-t border-slate-200">
            <button 
              type="button"
              onClick={onClose} 
              className="px-4 py-2 text-slate-600 bg-slate-200 rounded-lg hover:bg-slate-300 font-medium"
            >
              Cancel
            </button>
            <button 
              type="submit"
              className="px-4 py-2 bg-accent-green text-white rounded-lg hover:bg-accent-green/90 font-medium"
            >
              {form.id ? 'Update Service' : 'Create Service'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}